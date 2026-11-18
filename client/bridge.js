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
  function finishLive() {
    if (!state.liveArmed) return;
    var t = state.tasks[liveTaskId];
    if (!t || t.status !== 'running') return;
    t.status = 'done';
    var cb = state.liveProgress;
    collectArtifacts(t).then(function (a) { if (cb) cb({ type: 'done', artifacts: a }); });
  }

  // 真实产出列举：扫项目目录（listDirFiles 已带内核白名单），按首层目录分组
  function collectArtifacts(task) {
    var root = task.projectPath || (task.req && task.req.config && task.req.config.outDir) || '';
    if (!root || !isLive() || typeof global.electronAPI.listDirFiles !== 'function') return Promise.resolve([]);
    return Promise.resolve(global.electronAPI.listDirFiles(root)).then(function (r) {
      var files = (r && (r.files || r.items)) || (Array.isArray(r) ? r : []);
      var norm = root.replace(/[\\/]+$/, '');
      var out = [];
      files.forEach(function (f) {
        if (!f || !f.path) return;
        var rel = String(f.path).indexOf(norm) === 0 ? String(f.path).slice(norm.length) : String(f.path);
        rel = rel.replace(/^[\\/]+/, '');
        var seg = rel.split(/[\\/]/);
        var top = seg.length > 1 ? seg[0] : '项目根';
        var name = f.name || seg[seg.length - 1];
        if (/^(题目|数据|\.claude|\.git|node_modules)$/.test(top)) return;
        if (/^(规范|规则|CLAUDE|\.)/.test(name)) return;
        var e = (name.split('.').pop() || '').toLowerCase();
        var type = e === 'pdf' ? 'pdf' : (e === 'docx' || e === 'doc') ? 'word'
          : (e === 'py' || e === 'tex' || e === 'json' || e === 'cls') ? 'code'
          : (e === 'xlsx' || e === 'csv' || e === 'xls') ? 'data'
          : (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'svg') ? 'img' : 'file';
        var sz = Number(f.size) || 0;
        out.push({ group: top, name: name, type: type, path: f.path,
          size: sz >= 1048576 ? (sz / 1048576).toFixed(1) + ' MB' : sz >= 1024 ? (sz / 1024).toFixed(1) + ' KB' : sz + ' B' });
      });
      out = out.slice(0, 200);
      task.artifacts = out;
      return out;
    }).catch(function () { return []; });
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
      var t = ev && ev.type, p = (ev && ev.payload) || {};
      // 文本输出 → 直接作为求解过程文字
      if (t === 'agent-block' && p.block_type === 'text' && p.op === 'delta' && p.content) {
        cb({ type: 'text', text: p.content }); return;
      }
      // 工具调用 → 依据文件路径映射到 5 个阶段（复用内核阶段识别）
      if (t === 'agent-block' && p.block_type === 'tool_use' && p.op === 'end') {
        var stage = inferStage(p.meta && p.meta.input);
        if (stage >= 0) cb({ type: 'stage', index: stage, stage: STAGES[stage].id, label: STAGES[stage].label });
        return;
      }
      // 新任务真正启动（内核 state running）才开门闩：此前到达的收尾事件一律视为幽灵
      if (t === 'state' && p.status === 'running') { state.liveArmed = true; return; }
      // 系统结束块 / 主进程 idle → 统一走 finishLive 的双重 guard
      if (t === 'agent-block' && p.block_type === 'system' && p.op === 'end' && p.meta && p.meta.kind === 'done') {
        finishLive(); return;
      }
      if (t === 'state' && p.status === 'idle') { finishLive(); return; }
      if (t === 'error' && p.message) {
        cb({ type: 'error', text: p.message }); return;
      }
    });
  }

  // 从工具入参里嗅探文件路径，判断当前处于哪个阶段
  function inferStage(meta) {
    var s = JSON.stringify(meta || '');
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
    var apiConfig = (global.AVERIS_API_CONFIG || {});
    var projectPath = apiConfig.projectPath || '';

    // 第一步：准备工作区（装配规则库与论文模板）
    var ready = Promise.resolve();
    if (!projectPath && typeof api.prepareWorkspace === 'function') {
      ready = Promise.resolve(api.prepareWorkspace()).then(function (r) {
        if (r && r.workDir) projectPath = r.workDir;
        if (r && r.assemblyError) onProgress({ type: 'text', text: '工作区装配提示：' + r.assemblyError });
      });
    }

    ready.then(function () {
      state.tasks[id].projectPath = projectPath || '';
      return api.launchTask(projectPath, {
        apiBase: apiConfig.apiBase || '',
        apiKey: apiConfig.apiKey || '',
        apiModel: apiConfig.apiModel || '',
        apiFormat: apiConfig.apiFormat || 'auto',
        projectName: req.prompt.slice(0, 24),
        _taskType: 'solve',
        effort: apiConfig.effort || 'high',
        attachments: Array.isArray(req.attachmentPaths) ? req.attachmentPaths : [],
        attachmentKinds: (req.attachmentKinds && typeof req.attachmentKinds === 'object') ? req.attachmentKinds : {}
      }, req.prompt, false);
    }).then(function (r) {
      if (!r || !r.success) {
        onProgress({ type: 'error', text: (r && r.error) || '求解启动失败' });
        state.tasks[id].status = 'failed';
      } else {
        onProgress({ type: 'stage', index: 0, stage: STAGES[0].id, label: STAGES[0].label });
      }
    }).catch(function (e) {
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
    return Promise.resolve(global.electronAPI.abortTask()).then(function () {
      return new Promise(function (resolve) {
        var t0 = Date.now();
        (function poll() {
          if (Date.now() - t0 > 8000) { resolve(); return; }
          Promise.resolve(global.electronAPI.getTaskState()).then(function (s) {
            var running = !!(s && (s.isRunning || s.status === 'running' || (s.state && s.state.status === 'running')));
            if (!running) resolve(); else setTimeout(poll, 100);
          }).catch(function () { resolve(); });
        })();
      });
    }).catch(function () {});
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
    environment: environment,
    // 只读调试口：供 CDP 自动化断言门闩/任务状态（无行为副作用）
    _debug: {
      get state() { return state; },
      get liveTaskId() { return liveTaskId; },
      collectArtifacts: collectArtifacts
    }
  };
})(window);
