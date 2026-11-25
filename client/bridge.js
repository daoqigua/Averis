/* SPDX-License-Identifier: AGPL-3.0-only */
// Copyright (C) 2026 Averis authors — 开源范围与商业授权见 NOTICE / LICENSING.md

/* ============================================================
   Averis ↔ 内置求解内核桥接层
   职责单一：让 Averis 的 UI 能提交建模任务、查询进度、拿到产出文件。
   真实后端 = 内置内核的求解能力（runner + 内置 Python 引擎）。
   双模式：检测到 window.electronAPI 走真实求解；浏览器直开走 mock 演示。
   无需改动即可在 Averis 壳（真实）或浏览器（演示）两种环境下运行。
   ============================================================ */
(function (global) {
  'use strict';

  // 内核能力清单：Averis 只用到求解、产出、环境三项，其余（账号/协作/扩展/激活）一律不接
  var CAPABILITIES = {
    solve: 'task/runner 单代理求解链',
    artifacts: '求解/问题X 的论文、代码、图表、结果文件',
    envCheck: '内置 Python/TinyTeX/Pandoc 自检'
  };

  // 阶段定义：与内核求解链对应，但对用户只呈现 5 个可读阶段
  var STAGES = [
    { id: 'read',  label: '读题',   desc: '解析赛题与数据' },
    { id: 'model', label: '建模',   desc: '识别问题并规划模型' },
    { id: 'solve', label: '求解',   desc: '运行代码得出结果' },
    { id: 'paper', label: '写作',   desc: '生成论文与图表' },
    { id: 'export',label: '导出',   desc: '输出 PDF / Word / 支撑材料' }
  ];

  var state = { tasks: {}, seq: 0, liveArmed: false, liveGen: 0 };

  // 产出文件样例：结构与内核建模产物清单一一对应
  function sampleArtifacts(seed) {
    return [
      { group: '论文', name: 'Averis_建模论文.pdf', type: 'pdf', size: '1.8 MB' },
      { group: '论文', name: 'Averis_建模论文.docx', type: 'word', size: '1.2 MB' },
      { group: '代码', name: '问题一_求解.py', type: 'code', size: '6.4 KB' },
      { group: '代码', name: '问题二_求解.py', type: 'code', size: '9.1 KB' },
      { group: '支撑材料', name: '结果汇总.xlsx', type: 'data', size: '84 KB' },
      { group: '支撑材料', name: '模型图_敏感性分析.png', type: 'img', size: '312 KB' }
    ].map(function (f) { f.demo = true; return f; });
  }

  // 把用户输入匹配成一条可读的阶段说明（mock 用，真实后端由 runner 的 agent-block 事件驱动）
  function narration(text, stage, config) {
    var c = config || {};
    var tpl = c.template && c.template !== '自动识别' ? '「' + c.template + '」模板' : '所选模板';
    var lang = c.lang === 'English' ? '英文' : '中文';
    var grp = c.group || '本科组';
    var map = {
      read:   '已读取题目与附件，识别出 ' + guessCount(text) + ' 个待求解问题，正在梳理数据字段。',
      model:  '按题目特征规划模型：先做数据预处理与描述统计，再针对各问选择可解释的经典方法。',
      solve:  '正在运行内置 Python 求解器，逐问计算并校验数值，结果将回链到产出文件。',
      paper:  '按' + tpl + '以' + lang + '撰写' + grp + '论文' + (c.team ? '（队伍号 ' + c.team + '）' : '') + '，生成 300 DPI 图表，并把关键数值写入正文对应位置。',
      export: '已完成 PDF 与 Word 排版' + (c.outDir ? '，产出写入 ' + c.outDir : '') + '，代码、图表与结果表已整理进支撑材料。'
    };
    return map[stage] || '处理中…';
  }

  function guessCount(text) {
    if (/问题[一二三四五1-5]|问[1-5]/.test(text)) {
      var m = text.match(/问题?[一二三四五1-5]/g) || [];
      return new Set(m).size;
    }
    return 4;
  }

  // 是否运行在 Averis Electron 壳里（有 electronAPI = 能用真实求解链）
  function isLive() {
    return !!(global.electronAPI && typeof global.electronAPI.launchTask === 'function');
  }

  // ---- 演示模式（浏览器直接打开 index.html 时）----
  function submitMock(req, onProgress) {
    var id = 'task-' + (++state.seq);
    state.tasks[id] = { req: req, status: 'running', artifacts: sampleArtifacts(id) };
    var step = 0;
    var timer = setInterval(function () {
      if (state.tasks[id].status !== 'running') { clearInterval(timer); return; }
      if (step >= STAGES.length) {
        clearInterval(timer);
        state.tasks[id].status = 'done';
        onProgress({ type: 'done', demo: true, artifacts: state.tasks[id].artifacts });
        return;
      }
      var s = STAGES[step];
      onProgress({ type: 'stage', stage: s.id, label: s.label, text: narration(req.prompt, s.id, req.config), index: step });
      step++;
    }, 900);
    return id;
  }

  // ---- 真实模式（复用内置求解链）----
  // 链路：prepareWorkspace → launchTask(projectPath, apiConfig, prompt, modifyMode)
  //       阶段由 onAgentEvent 的 agent-block / text / state 事件驱动
  var liveListenerBound = false;
  var liveTaskId = null;
  var liveBoundGen = 0;   // 监听器绑定的世代：每次 submit 都同步，否则第二次起的任务事件会被全量丢弃

  // 真实任务收尾：门闩 + 状态双重 guard，丢弃 abort/旧任务的幽灵 done/idle
  function finishLive(result, failed) {
    var t = state.tasks[liveTaskId];
    if (!t || t.status !== 'running') return;
    // 错误优先；idle 不覆盖权威 done，也不凭空证明完成。
    if (failed || (!t.terminalFailed && result)) t.terminal = Object.assign({}, t.terminal || {}, result);
    if (failed) t.terminalFailed = true;
    if (t.finishing) return;
    t.finishing = true;
    var cb = state.liveProgress, gen = state.liveGen, since = Date.now();
    function active() { return gen === state.liveGen && t.status === 'running'; }
    function waitSettled() {
      if (!active()) return;
      if (typeof global.electronAPI.getTaskState !== 'function') throw new Error('无法确认任务收尾，请先停止任务');
      return Promise.resolve(global.electronAPI.getTaskState()).then(function (s) {
        if (!active()) return;
        if (!s || typeof s !== 'object') throw new Error('无法读取任务收尾状态');
        if (s.isRunning || s.settling || s.status === 'running') {
          if (Date.now() - since > 8000) throw new Error('任务仍在收尾，请等待或点击停止，不要重复运行');
          return new Promise(function (resolve) { setTimeout(resolve, 100); }).then(waitSettled);
        }
      });
    }
    Promise.resolve(t.launchPromise).then(waitSettled).then(function () {
      if (!active()) return;
      return collectArtifacts(t).then(function (a) {
        return checkPaperLanguage(a, t.req && t.req.config && t.req.config.lang).then(function (message) { t.languageCheck = message; return a; });
      }).then(function (a) {
        if (!active()) return;
        var r = t.terminal || {};
        var error = t.terminalFailed || !t.terminal || r.completionStatus === 'INCOMPLETE' || r.completionEligible === false;
        t.status = error ? 'failed' : 'done';
        if (cb) cb({ type: error ? 'error' : 'done', result: r, artifacts: a, artifactWarning: t.artifactWarning || '', languageCheck: t.languageCheck || '',
          text: error ? (r.message || r.error || '任务已结束，但未收到完成确认；已保留项目文件，请核对后继续。') : '' });
      });
    }).catch(function (e) {
      if (!active()) return;
      t.finishing = false;
      if (cb) cb({ type: 'settling', text: (e && e.message) || '任务收尾未确认' });
    });
  }

  // 真实产出列举：扫项目目录（listDirFiles 已带内核白名单），按首层目录分组
  function collectArtifacts(task) {
    var root = task.projectPath || (task.req && task.req.config && task.req.config.outDir) || '';
    if (!root || !isLive() || typeof global.electronAPI.listDirFiles !== 'function') return Promise.resolve([]);
    task.artifactWarning = '';
    return Promise.resolve().then(function () { return global.electronAPI.listDirFiles(root); }).then(function (r) {
      if (!r || r.error || r.success === false) throw new Error((r && r.error) || '未收到文件列表');
      var files = (r.files || r.items) || (Array.isArray(r) ? r : null);
      if (!Array.isArray(files)) throw new Error('文件列表格式无效');
      var norm = root.replace(/\\/g, '/').replace(/\/+$/, '');
      var out = [];
      files.forEach(function (f) {
        if (!f || !f.path) return;
        var normalized = String(f.path).replace(/\\/g, '/');
        if (normalized.toLowerCase().indexOf(norm.toLowerCase() + '/') !== 0) return;
        var rel = normalized.slice(norm.length + 1);
        var seg = rel.split(/[\\/]/);
        var top = seg.length > 1 ? seg[0] : '项目根';
        var name = f.name || seg[seg.length - 1];
        if (top === '题目' || /^(\.claude|\.git|node_modules)$/.test(top)) return;
        if (top === '数据' && !/^result[^/]*\.(xlsx|xls|csv)$/i.test(name)) return;
        if (/^(规范|规则|CLAUDE|\.)/.test(name)) return;
        var e = (name.split('.').pop() || '').toLowerCase();
        var type = e === 'pdf' ? 'pdf' : (e === 'docx' || e === 'doc') ? 'word'
          : (e === 'py' || e === 'tex' || e === 'json' || e === 'cls') ? 'code'
          : (e === 'xlsx' || e === 'csv' || e === 'xls') ? 'data'
          : (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'svg') ? 'img' : 'file';
        var sz = Number(f.size) || 0;
        out.push({ group: top, name: name, relativePath: rel, type: type, path: f.path, bytes: sz,
          size: sz >= 1048576 ? (sz / 1048576).toFixed(1) + ' MB' : sz >= 1024 ? (sz / 1024).toFixed(1) + ' KB' : sz + ' B' });
      });
      if (out.length > 200 || r.truncated || files.length >= 1000) task.artifactWarning = '文件清单可能不完整（最多显示200项，内核扫描上限1000项），请打开工作目录核对全部文件。';
      out = out.slice(0, 200);
      task.artifacts = out;
      return out;
    }).catch(function (e) { task.artifactWarning = '产物扫描失败：' + e.message + '；请打开工作目录核对。'; return []; });
  }
  function checkPaperLanguage(artifacts, language) {
    var api = global.electronAPI || {};
    var tex = artifacts.filter(function (f) { return /\.tex$/i.test(f.path || '') && (f.bytes || 0) <= 1048576; }).slice(0, 12);
    var unknown = '论文语言无法自动核验：未取得足够可读的 TeX 正文，请人工检查最终 PDF/Word。';
    if (!tex.length || !api.readFileContent) return Promise.resolve(unknown);
    var chinese = 0, latin = 0, failures = 0;
    return Promise.all(tex.map(function (f) {
      return Promise.resolve().then(function () { return api.readFileContent(f.path); }).then(function (r) {
        if (!r || !r.success || typeof r.text !== 'string') { failures++; return; }
        var text = r.text.slice(0, 100000).replace(/(^|[^\\])%[^\n]*/g, '$1');
        var body = text.indexOf('\\begin{document}');
        if (body >= 0) text = text.slice(body + 16);
        text = text.replace(/\\(?:input|include|includegraphics|label|ref|cite|bibliography|bibliographystyle)(?:\[[^\]]*\])?\{[^}]*\}/g, '').replace(/\\[a-zA-Z@]+\*?/g, '');
        chinese += (text.match(/[\u4e00-\u9fff]/g) || []).length;
        latin += (text.match(/[a-zA-Z]/g) || []).length;
      }).catch(function () { failures++; });
    })).then(function () {
      if (chinese + latin < 100) return unknown;
      var english = language === 'English' || language === 'en';
      var mismatch = english ? chinese >= 80 && chinese / (chinese + latin) > 0.12 : latin >= 500 && chinese < 20;
      if (mismatch) return '论文语言初检：疑似存在较多' + (english ? '中文' : '英文') + '正文，与所选语言不一致；请核对全文后按要求修改。此为字符抽样，不是语言合格证明。';
      return '论文语言初检：抽样未发现明显偏离' + (failures ? '，部分源文件读取失败' : '') + '；仍需人工检查最终 PDF/Word 全文。';
    });
  }
  function scanProject(projectPath) {
    var task = { projectPath: projectPath };
    return collectArtifacts(task).then(function (artifacts) { return { artifacts: artifacts, warning: task.artifactWarning || '' }; });
  }

  function bindLiveEvents(onProgress) {
    // 跨任务隔离靠「abort 串行收尾 + 门闩 + status guard」，世代号只作绑定一致性哨兵：
    //   每次提交都必须同步，否则监听器停留在旧世代，会把新任务的全部事件误丢。
    liveBoundGen = state.liveGen;
    if (liveListenerBound) { state.liveProgress = onProgress; return; }
    liveListenerBound = true;
    state.liveProgress = onProgress;
    global.electronAPI.onAgentEvent(function (ev) {
      if (liveBoundGen !== state.liveGen) return;   // 绑定世代与当前世代不符 = 异常残留，丢弃
      var cb = state.liveProgress;
      if (!cb) return;
      var task = state.tasks[liveTaskId];
      if (!task || task.status !== 'running') return;
      var t = ev && ev.type, p = (ev && ev.payload) || {};
      // 文本输出 → 直接作为求解过程文字
      if (t === 'agent-block' && p.block_type === 'text' && p.op === 'delta' && p.content) {
        cb({ type: 'text', text: p.content }); return;
      }
      // 工具调用 → 依据文件路径映射到 5 个阶段（复用内核阶段识别）
      if (t === 'agent-block' && p.block_type === 'tool_use' && p.op === 'end') {
        var stage = inferStage(p.meta && p.meta.input);
        if (stage >= 0 && (task.stageIndex == null || stage >= task.stageIndex)) {
          task.stageIndex = stage;
          cb({ type: 'stage', index: stage, stage: STAGES[stage].id, label: STAGES[stage].label });
        }
        return;
      }
      // 新任务真正启动（内核 state running）才开门闩：此前到达的收尾事件一律视为幽灵
      if (t === 'state' && p.status === 'running') {
        state.liveArmed = true;
        if (p.workDir) task.projectPath = p.workDir;
        cb({ type: 'started', projectPath: task.projectPath });
        return;
      }
      // 只接收 runner 的权威 done；system end 仅代表一个展示块结束。
      if (t === 'done' && state.liveArmed) { finishLive(p, false); return; }
      if (t === 'state' && p.status === 'idle' && state.liveArmed) { finishLive(); return; }
      if (t === 'error' && p.message) { finishLive(p, true); return; }
      if (t === 'state' && p.status === 'error') { finishLive(p, true); return; }
    });
  }

  // 从工具入参里嗅探文件路径，判断当前处于哪个阶段
  function inferStage(meta) {
    var s = JSON.stringify(meta || '');
    if (/xelatex|pandoc|word-export|编译/i.test(s) || /论文[\\/].*\.(pdf|docx)/i.test(s)) return 4;
    if (/题目[\\/]|数据[\\/]|\.pdf|\.docx|\.xlsx/i.test(s)) return 0;   // 读题
    if (/problem-spec|model-plan|模型|建模/i.test(s)) return 1;          // 建模
    if (/求解[\\/]|\.py|Bash|python/i.test(s)) return 2;                 // 求解
    if (/论文[\\/]|\.tex/i.test(s)) return 3;                            // 写作
    if (/xelatex|pandoc|\.pdf|word-export|编译/i.test(s)) return 4;      // 导出
    return -1;
  }

  function submitLive(req, onProgress) {
    var id = 'task-live-' + (++state.seq);
    liveTaskId = id;
    state.liveGen++; state.liveArmed = false;   // 新任务先关门闩，等 state running 再开
    state.tasks[id] = { req: req, status: 'running', artifacts: [], projectPath: '' };
    bindLiveEvents(onProgress);

    var api = global.electronAPI;
    var apiConfig = Object.assign({}, global.AVERIS_API_CONFIG || {});
    var modifyMode = req.modifyMode === true;
    var resumeExisting = req.resumeExisting === true && !modifyMode;
    var reusePrepared = req.reusePrepared === true && !modifyMode && !resumeExisting;
    var projectPath = (modifyMode || resumeExisting || reusePrepared) ? String(req.projectPath || '') : '';
    var task = state.tasks[id];
    function active() { return liveTaskId === id && task.status === 'running'; }
    if ((modifyMode || resumeExisting || reusePrepared) && !projectPath) {
      task.status = 'failed';
      onProgress({ type: 'error', text: '未取得可复用的任务工作目录，未创建新工作区。' });
      return id;
    }

    // 新题装配新工作区；续改必须复用选中的原任务，不重新装配模板。
    var ready = Promise.resolve();
    if (!projectPath && typeof api.prepareWorkspace === 'function') {
      ready = Promise.resolve(api.prepareWorkspace()).then(function (r) {
        if (!active()) return;
        if (r && r.assemblyError) throw new Error('工作区装配失败：' + r.assemblyError);
        if (!r || !r.workDir) throw new Error('未取得新任务工作目录');
        projectPath = r.workDir;
      });
    }

    task.launchPromise = ready.then(function () {
      if (!active()) return;
      if (!projectPath) throw new Error('未取得任务工作目录');
      task.projectPath = projectPath;
      onProgress({ type: 'prepared', projectPath: projectPath });
      return api.launchTask(projectPath, {
        apiBase: apiConfig.apiBase || '',
        apiKey: apiConfig.apiKey || '',
        apiModel: apiConfig.apiModel || '',
        apiFormat: apiConfig.apiFormat || 'auto',
        projectName: req.prompt.slice(0, 24),
        _taskType: modifyMode ? 'modify' : 'solve',
        resumeExisting: resumeExisting,
        writingLang: req.config && (req.config.lang === 'English' || req.config.lang === 'en') ? 'en' : 'zh',
        effort: apiConfig.effort || 'high',
        attachments: Array.isArray(req.attachmentPaths) ? req.attachmentPaths : [],
        attachmentKinds: (req.attachmentKinds && typeof req.attachmentKinds === 'object') ? req.attachmentKinds : {},
        _recentChat: modifyMode && Array.isArray(req.recentChat)
          ? req.recentChat.filter(function (m) { return m && (m.role === 'user' || m.role === 'ai' || m.role === 'assistant') && typeof m.text === 'string'; })
            .slice(-20).map(function (m) { return { role: m.role === 'assistant' ? 'ai' : m.role, text: m.text.slice(0, 600) }; })
          : []
      }, req.prompt, modifyMode);
    }).then(function (r) {
      if (!active()) return;
      if (!r || !r.success) {
        onProgress({ type: 'error', text: (r && r.error) || '求解启动失败' });
        state.tasks[id].status = 'failed';
      } else {
        if (r.revision) { task.revision = r.revision; onProgress({ type: 'protected', revision: r.revision }); }
        onProgress({ type: 'stage', index: 0, stage: STAGES[0].id, label: STAGES[0].label });
      }
    }).catch(function (e) {
      if (!active()) return;
      onProgress({ type: 'error', text: '求解异常：' + ((e && e.message) || e) });
      state.tasks[id].status = 'failed';
    });
    return id;
  }

  // 唯一提交入口：有 electronAPI 走真实求解，否则演示
  function submit(req, onProgress) {
    return isLive() ? submitLive(req, onProgress) : submitMock(req, onProgress);
  }

  // 例题演示：强制走演示流程（exe 内也可用，不接模型、不产生真实文件）
  function submitDemo(req, onProgress) {
    return submitMock(req, onProgress);
  }

  function abort(id) {
    if (state.tasks[id]) state.tasks[id].status = 'aborted';
    state.liveArmed = false;   // 关门闩：abort 后残余 done/idle 一律丢弃
    if (!isLive() || typeof global.electronAPI.abortTask !== 'function') return Promise.resolve();
    // 串行化：等内核真正收尾（state 非 running）再 resolve，避免旧任务事件投给新任务
    var task = state.tasks[id];
    return Promise.resolve(global.electronAPI.abortTask()).then(function () {
      return task && task.launchPromise;
    }).then(function () {
      // A launch already inside IPC can finish after the first abort; stop that late startup too.
      return global.electronAPI.abortTask();
    }).then(function () {
      return new Promise(function (resolve, reject) {
        var t0 = Date.now();
        (function poll() {
          if (Date.now() - t0 > 8000) { reject(new Error('任务仍在收尾，请再次停止或关闭客户端后重试')); return; }
          Promise.resolve(global.electronAPI.getTaskState()).then(function (s) {
            var running = !!(s && (s.isRunning || s.settling || s.status === 'running' || (s.state && s.state.status === 'running')));
            if (!running) resolve(); else setTimeout(poll, 100);
          }).catch(reject);
        })();
      });
    });
  }

  function artifacts(id) {
    if (state.tasks[id] && state.tasks[id].artifacts.length) return state.tasks[id].artifacts;
    return isLive() ? [] : sampleArtifacts(id);
  }

  // 环境自检：真实壳里走内核的 checkEnvironment，否则静态契约
  function environment() {
    if (isLive() && typeof global.electronAPI.checkEnvironment === 'function') {
      try {
        var r = global.electronAPI.checkEnvironment();
        if (r && typeof r.then === 'function') return r;
      } catch (e) {}
    }
    return {
      python: '内置 Python 运行时',
      latex: '内置 TinyTeX（XeLaTeX）',
      pandoc: '内置 Pandoc',
      online: false
    };
  }

  global.AverisBridge = {
    CAPABILITIES: CAPABILITIES,
    STAGES: STAGES,
    isLive: isLive,
    submit: submit,
    submitDemo: submitDemo,
    abort: abort,
    artifacts: artifacts,
    scanProject: scanProject,
    checkPaperLanguage: checkPaperLanguage,
    environment: environment,
    // 只读调试口：供 CDP 自动化断言门闩/任务状态（无行为副作用）
    _debug: {
      get state() { return state; },
      get liveTaskId() { return liveTaskId; },
      collectArtifacts: collectArtifacts
    }
  };
})(window);
