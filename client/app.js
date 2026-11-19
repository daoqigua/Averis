/* SPDX-License-Identifier: AGPL-3.0-only */
// Copyright (C) 2026 Averis authors — 开源范围与商业授权见 NOTICE / LICENSING.md

/* Averis 前端交互 —— 零依赖，直接运行。桥接逻辑全部在 bridge.js。
   v2.0：SVG 图标体系 · 实时会话搜索 · 删除可撤销 · 主题持久化 ·
         发送态联动 · 图表提示 · 拖入附件 · Ctrl+K · 修复欢迎态克隆 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var bridge = window.AverisBridge;

  if (window.electronAPI || navigator.userAgent.indexOf('Electron') >= 0) {
    document.documentElement.classList.add('is-electron');
  }

  // ---------- SVG 图标库（替代 emoji，统一 1.7 线宽） ----------
  var P = {
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.5 15h9" stroke="currentColor" stroke-width="1.7"/>',
    bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    clip: '<path d="M21 11.5l-8.8 8.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.4 3.4 0 1 1 4.8 4.8l-9.2 9.2a1.8 1.8 0 0 1-2.5-2.5l8.5-8.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    file: '<path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M14 3v5h4" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    code: '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 10h18M9 10v10" stroke="currentColor" stroke-width="1.7"/>',
    check: '<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    sun: '<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    target: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    coin: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    users: '<circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16 8.5a2.6 2.6 0 1 1 1.8 4.5M17.5 14.4c2 .6 3.2 2.2 3.2 4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9s-1.4 6.4-4.2 9c-2.8-2.6-4.2-5.6-4.2-9s1.4-6.4 4.2-9z" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    hash: '<path d="M9 3L7 21M17 3l-2 18M4 8h17M3 16h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 10h4v4h-4z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    folder: '<path d="M3 7h6l2 2h10v9H3z" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    undo: '<path d="M8 5L3 10l5 5M3 10h11a6 6 0 0 1 6 6v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    redo: '<path d="M16 5l5 5-5 5M21 10H10a6 6 0 0 0-6 6v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    alignL: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    alignC: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    quote: '<path d="M10 8c-3 0-5 2-5 5v3h5v-5H7c0-2 1-3 3-3zM20 8c-3 0-5 2-5 5v3h5v-5h-3c0-2 1-3 3-3z" fill="currentColor" stroke="none"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="10" r="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 17l5-5 3 3 4-4 2 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    save: '<path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>',
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    terminal: '<path d="M4 17l6-5-6-5M12 19h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    chev: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function svg(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 16) + '" height="' + (size || 16) + '" aria-hidden="true">' + (P[name] || P.file) + '</svg>';
  }
  // select 赋值前先确保 option 存在：持久化的自定义模型/模板不在预设列表时，
  //   直接 .value= 会静默落空（selectedIndex=-1），导致配置显示与实际不一致。
  function ensureOption(sel, val) {
    if (!sel || val == null || val === '') return;
    // 只对真正的 <select> 补 option；#setApiModel 是 input+datalist，直接赋值即可（此处曾误判导致启动抛错）
    if (String(sel.tagName).toUpperCase() !== 'SELECT' || !sel.options) return;
    var v = String(val);
    var has = Array.prototype.some.call(sel.options, function (o) { return o.value === v; });
    if (!has) { var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); }
  }
  var FILE_ICON = { tex: 'file', py: 'code', xlsx: 'table', pdf: 'file', word: 'file', code: 'code', data: 'table', img: 'file' };

  // ---------- 轻提示（支持图标与撤销动作） ----------
  var toastTimer;
  function toast(msg, opts) {
    opts = opts || {};
    var el = $('#toast');
    el.innerHTML = svg(opts.icon || 'info', 16) + '<span>' + esc(msg) + '</span>' +
      (opts.action ? '<button class="toast-action" type="button">' + esc(opts.action) + '</button>' : '');
    el.classList.add('show');
    if (opts.action && opts.onAction) {
      $('.toast-action', el).addEventListener('click', function () {
        opts.onAction(); el.classList.remove('show'); clearTimeout(toastTimer);
      });
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, opts.action ? 5000 : 2200);
  }

  // ---------- 导航 ----------
  function switchView(v) {
    $$('.rail-item[data-view]').forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
    $$('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'view-' + v); });
    if (v === 'me') renderMeReal();   // 每次进入「我的」刷新真实用量
    if (v === 'editor') edInit();     // 编辑器懒初始化（首次进入才连内核写作项目）
  }
  $$('.rail-item[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () { switchView(btn.dataset.view); });
  });
  $('#btnAvatar').addEventListener('click', function () { switchView('me'); });
  $('#btnGoWorkbench').addEventListener('click', function () { switchView('workbench'); $('#chatInput').focus(); });
  $('#btnHelp').addEventListener('click', function () { toast('Averis：粘贴赛题 → 自动求解 → 论文/代码/支撑材料，一屏完成。', { icon: 'spark' }); });

  // ---------- 主题（持久化 + 图标切换） ----------
  var THEME_KEY = 'averis.theme';
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    $('#btnTheme').innerHTML = svg(mode === 'dark' ? 'sun' : 'moon', 17);
    $('#btnTheme').setAttribute('aria-label', mode === 'dark' ? '切换到浅色' : '切换到深色');
    $('#setTheme').value = mode === 'dark' ? '深色' : '浅色';
    // Electron 壳内：同步原生窗口按钮底色，避免深色下右上角出现白块
    if (window.electronAPI && typeof window.electronAPI.setTitleBarTheme === 'function') {
      window.electronAPI.setTitleBarTheme(mode);
    }
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    toast(next === 'dark' ? '已切换深色' : '已切换浅色', { icon: next === 'dark' ? 'moon' : 'sun' });
  }
  var savedTheme = 'light';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
  applyTheme(savedTheme);
  $('#btnTheme').addEventListener('click', toggleTheme);
  $('#setTheme').addEventListener('change', function () {
    var want = this.value === '深色' ? 'dark' : 'light';
    if (document.documentElement.getAttribute('data-theme') !== want) toggleTheme();
  });

  // ---------- 会话列表（实时搜索 + 删除可撤销） ----------
  var sessions = [
    { id: 's1', title: '城市共享单车夜间调度', badge: '已完成', time: '15 分钟前', icon: 'chart', demo: true },
    { id: 's2', title: '多孔膜光反射性能优化', badge: '已完成', time: '昨天', icon: 'flask', demo: true },
    { id: 's3', title: '微电网电力协调调度', badge: '求解中', time: '2 天前', icon: 'bolt', run: true, demo: true }
  ];
  var activeSessionId = 's1';
  var sessionQuery = '';

  function renderSessions() {
    var q = sessionQuery.trim().toLowerCase();
    var list = sessions.filter(function (s) { return !q || s.title.toLowerCase().indexOf(q) >= 0; });
    var box = $('#sessionList');
    if (!list.length) {
      box.innerHTML = '<div class="session-empty">' + (q ? '没有匹配「' + esc(sessionQuery.trim()) + '」的会话' : '还没有会话<br>点上方「新任务」开始') + '</div>';
      return;
    }
    // 桌面端（live）里这三条是内置样例：徽标统一标「演示」，不挂假的「求解中」动画
    var isLiveNow = bridge.isLive();
    box.innerHTML = list.map(function (s) {
      var asDemo = !!(s.demo && isLiveNow);
      return '<div class="session-item' + (s.id === activeSessionId ? ' active' : '') + '" data-id="' + esc(s.id) + '" role="button" tabindex="0">' +
        '<span class="si-ico">' + svg(s.icon, 16) + '</span><div class="si-body">' +
        '<div class="si-title">' + esc(s.title) + '</div>' +
        '<div class="si-meta"><span class="si-badge' + (s.run && !asDemo ? ' run' : '') + '">' + esc(asDemo ? '演示' : s.badge) + '</span>' + esc(s.time) + '</div>' +
        '</div><button class="si-del" data-del="' + esc(s.id) + '" title="删除会话" aria-label="删除会话">' + svg('trash', 14) + '</button></div>';
    }).join('');

    $$('.session-item', box).forEach(function (el) {
      function activate() {
        activeSessionId = el.dataset.id;
        $$('.session-item', box).forEach(function (x) { x.classList.toggle('active', x === el); });
        var s = sessions.find(function (x) { return x.id === el.dataset.id; });
        $('#chatTitle').textContent = s.title;
        $('#topProjectChip').textContent = s.title;
        toast('已切换到：' + s.title, { icon: 'check' });
      }
      el.addEventListener('click', function (e) { if (!e.target.closest('.si-del')) activate(); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    });
    $$('.si-del', box).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.dataset.del;
        var idx = sessions.findIndex(function (s) { return s.id === id; });
        var removed = sessions.splice(idx, 1)[0];
        var wasActive = activeSessionId === id;
        if (wasActive) activeSessionId = sessions.length ? sessions[0].id : null;
        if (wasActive) {
          // 删掉当前会话后标题/项目 chip 必须跟着复位，不能停留在已删除的任务上
          var nxt = sessions.filter(function (x) { return x.id === activeSessionId; })[0];
          $('#chatTitle').textContent = nxt ? nxt.title : '开始一个新的建模任务';
          $('#topProjectChip').textContent = nxt ? nxt.title : '未选择项目';
        }
        renderSessions(); renderRecent();
        toast('已删除「' + removed.title + '」', {
          icon: 'trash', action: '撤销',
          onAction: function () { sessions.splice(Math.min(idx, sessions.length), 0, removed); renderSessions(); renderRecent(); }
        });
      });
    });
  }
  $('#sessionSearch').addEventListener('input', function () { sessionQuery = this.value; renderSessions(); });
  renderSessions();

  // Ctrl+K 聚焦搜索
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); switchView('workbench'); $('#sessionSearch').focus(); $('#sessionSearch').select();
    }
  });

  // ---------- 题目 / 附件资料（分开两个入口 + 拖入） ----------
  var uploads = { problem: [], data: [] };
  var DATA_EXT = /\.(csv|xlsx|xls|json|zip|rar|7z|tsv|parquet|mat|dat)$/i;
  function slotMeta(kind) {
    return kind === 'problem'
      ? { row: '#attachRowProblem', label: '题目' }
      : { row: '#attachRowData', label: '附件资料' };
  }
  function renderAttachments() {
    ['problem', 'data'].forEach(function (kind) {
      var meta = slotMeta(kind), row = $(meta.row), list = uploads[kind];
      row.hidden = list.length === 0;
      row.innerHTML = '<span class="attach-label">' + meta.label + '</span>' + list.map(function (f, i) {
        return '<span class="attach-tag">' + svg('clip', 13) + ' ' + esc(f.name) + '<button data-kind="' + kind + '" data-i="' + i + '" aria-label="移除 ' + esc(f.name) + '">×</button></span>';
      }).join('');
      $$(meta.row + ' button').forEach(function (b) {
        b.addEventListener('click', function () { uploads[b.dataset.kind].splice(+b.dataset.i, 1); renderAttachments(); });
      });
    });
  }
  function addFiles(fileList, kind) {
    var list = uploads[kind], n = 0;
    Array.prototype.forEach.call(fileList, function (f) {
      if (list.some(function (x) { return x.name === f.name; })) return;
      var p = '';
      try { p = (window.electronAPI && window.electronAPI.getFilePath) ? (window.electronAPI.getFilePath(f) || '') : ''; } catch (e) {}
      list.push({ name: f.name, path: p }); n++;
    });
    if (n) {
      renderAttachments();
      var where = kind === 'problem' ? '题目/' : '数据/';
      toast(bridge.isLive()
        ? '已添加 ' + n + ' 个' + (kind === 'problem' ? '题目文件' : '附件资料') + '，将复制进 ' + where
        : '已添加 ' + n + ' 个' + (kind === 'problem' ? '题目文件' : '附件资料') + '（演示模式，仅记录文件名）', { icon: 'clip' });
    } else if (Array.prototype.some.call(fileList, function () { return true; })) {
      toast('这些文件已在列表中', { icon: 'info' });
    }
  }
  function bindPicker(btn, input, kind) {
    $(btn).addEventListener('click', function () { $(input).click(); });
    $(input).addEventListener('change', function () { addFiles(this.files, kind); this.value = ''; });
  }
  bindPicker('#btnAttachProblem', '#problemInput', 'problem');
  bindPicker('#btnAttachData', '#dataInput', 'data');

  var composer = $('#composer');
  ['dragenter', 'dragover'].forEach(function (ev) {
    composer.addEventListener(ev, function (e) { e.preventDefault(); composer.style.borderColor = 'var(--brand-600)'; composer.style.boxShadow = '0 0 0 3px var(--brand-100)'; });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    composer.addEventListener(ev, function (e) { e.preventDefault(); composer.style.borderColor = ''; composer.style.boxShadow = ''; });
  });
  composer.addEventListener('drop', function (e) {
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    var docs = [], data = [];
    Array.prototype.forEach.call(e.dataTransfer.files, function (f) { (DATA_EXT.test(f.name) ? data : docs).push(f); });
    if (docs.length) addFiles(docs, 'problem');
    if (data.length) addFiles(data, 'data');
    if (!docs.length && !data.length) toast('未识别拖入的文件', { icon: 'info' });
  });

  // ---------- 模式切换 ----------
  var modes = ['完整求解', '只改论文', '重做某问']; var modeIdx = 0;
  $('#btnMode').addEventListener('click', function () {
    modeIdx = (modeIdx + 1) % modes.length;
    $('#modeLabel').textContent = modes[modeIdx];
    toast('任务模式：' + modes[modeIdx], { icon: 'spark' });
  });

  // ---------- 输出面板 ----------
  function renderOutputs(list, demo) {
    outputsDemo = !!demo;
    var demoBadge = $('#outputDemoBadge');
    if (demoBadge) demoBadge.hidden = !outputsDemo;
    $('#outputEmpty').hidden = list.length > 0;
    $('#outputGroups').hidden = list.length === 0;
    $('#outputCount').textContent = list.length;
    var badge = $('#outputBadge');
    if (badge) { badge.textContent = list.length; badge.hidden = !list.length || panelState.output; }
    var groups = {};
    list.forEach(function (f) { (groups[f.group] = groups[f.group] || []).push(f); });
    $('#outputGroups').innerHTML = Object.keys(groups).map(function (g) {
      return '<div class="out-group"><div class="out-group-title">' + esc(g) + '</div>' +
        groups[g].map(function (f) {
          return '<div class="out-file" data-name="' + esc(f.name) + '"' + (f.path ? ' data-path="' + esc(f.path) + '"' : '') + ' role="button" tabindex="0">' +
            '<span class="of-ico ' + esc(f.type) + '">' + svg(FILE_ICON[f.type] || 'file', 16) + '</span>' +
            '<div class="of-body"><div class="of-name">' + esc(f.name) + '</div><div class="of-meta">' + esc(f.size) + (outputsDemo ? ' · 演示样例' : '') + '</div></div>' +
            '<span class="of-dl">打开' + svg('open', 12) + '</span></div>';
        }).join('') + '</div>';
    }).join('');
    $$('.out-file').forEach(function (el) {
      function open() {
        if (outputsDemo) { toast('演示产出为样例清单，未生成真实文件', { icon: 'info' }); return; }
        var p = el.dataset.path;
        if (p && window.electronAPI && typeof window.electronAPI.openInFinder === 'function') {
          // 真实产出：交给系统默认程序打开（shell.openPath）
          Promise.resolve(window.electronAPI.openInFinder(p)).then(function (r) {
            if (r && r.success === false) toast('打开失败：' + (r.error || p), { icon: 'info' });
          }).catch(function (e) { toast('打开失败：' + e.message, { icon: 'info' }); });
          return;
        }
        toast('打开：' + el.dataset.name + '（未拿到文件路径，请到工作目录中查看）', { icon: 'open' });
      }
      el.addEventListener('click', open);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  // ---------- 阶段进度条 ----------
  function showStageBar(activeIndex) {
    var bar = $('#stageBar'); bar.hidden = false;
    $('#stageTrack').innerHTML = bridge.STAGES.map(function (s, i) {
      var cls = i < activeIndex ? 'done' : (i === activeIndex ? 'active' : 'wait');
      return '<div class="stage-node ' + cls + '"><span class="dot"></span>' + s.label + '</div>';
    }).join('');
  }

  // ---------- 对话流 ----------
  function addMsg(who, html) {
    var ws = $('#welcomeState'); if (ws) ws.style.display = 'none';
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + who;
    wrap.innerHTML = '<span class="msg-avatar">' + (who === 'user' ? '我' : 'A') + '</span>' +
      '<div class="msg-body">' + (who === 'ai' ? '<div class="msg-label">Averis</div>' : '') +
      '<div class="msg-text">' + html + '</div></div>';
    $('#chatFlow').appendChild(wrap);
    $('#chatFlow').scrollTop = $('#chatFlow').scrollHeight;
    return wrap;
  }

  var running = false;
  var pending = false;       // preflight 异步间隙同步上锁，防并发提交/演示标志污染
  var stopping = false;      // abort 收尾期间拒绝新提交
  var currentTaskId = null;
  var demoTask = false;      // 本次提交是否为例题演示（不接模型）
  var outputsDemo = false;   // 当前产出清单是否为演示样例
  function busy() { return running || pending || stopping; }
  function syncSend() { $('#btnSend').disabled = busy() || !$('#chatInput').value.trim(); }

  function send(text, internal) {
    text = (text || '').trim();
    if (!text || busy()) return;
    if (!internal && live && !demoTask) {
      var _hasProblem = uploads.problem.length > 0;
      if (!_hasProblem && text.replace(/\s/g, '').length < 30) {
        toast('请先点「题目」添加赛题文件；或粘贴至少 30 字的完整题面。「附件资料」是可选的数据文件。', { icon: 'info' });
        return;
      }
    }
    pending = true; syncSend();
    preflight().then(function (ok) { pending = false; if (ok) startSend(text); else syncSend(); })
      .catch(function () { pending = false; syncSend(); });
  }

  function startSend(text) {
    $('#chatInput').value = ''; syncSend();
    var isDemo = demoTask || !live;

    // 快照：下面会清空上传列表
    var problemNames = uploads.problem.map(function (a) { return a.name; });
    var dataNames = uploads.data.map(function (a) { return a.name; });
    var attNames = problemNames.concat(dataNames);
    var attPaths = uploads.problem.concat(uploads.data).map(function (a) { return a.path; }).filter(Boolean);
    var attachmentKinds = {};
    uploads.problem.forEach(function (a) { if (a.path) attachmentKinds[a.path] = 'problem'; });
    uploads.data.forEach(function (a) { if (a.path) attachmentKinds[a.path] = 'data'; });
    var att = '';
    if (problemNames.length) att += '<div><span class="attach-chip">' + svg('file', 12) + ' 题目：' + esc(problemNames.join('、')) + '</span></div>';
    if (dataNames.length) att += '<div><span class="attach-chip">' + svg('clip', 12) + ' 附件资料：' + esc(dataNames.join('、')) + '</span></div>';
    var cfgChip = '<div><span class="attach-chip">' + svg('sliders', 12) + ' ' + esc(cfg.template + ' · ' + cfg.group + ' · ' + cfg.lang + (cfg.team ? ' · 队伍 ' + cfg.team : '')) + '</span></div>';
    if (isDemo) cfgChip += '<div><span class="attach-chip demo">' + svg('flask', 12) + ' 例题演示 · 不接模型</span></div>';
    else if (attNames.length) cfgChip += '<div><span class="attach-chip demo">' + svg('info', 12) + ' 文件将按「题目 / 附件资料」复制进 题目/ 与 数据/ 参与求解</span></div>';
    addMsg('user', esc(text) + att + cfgChip);
    uploads = { problem: [], data: [] }; renderAttachments();

    running = true;
    $('#btnSend').hidden = true; $('#btnStop').hidden = false;
    $('#chatStatus').textContent = '求解中'; $('#chatStatus').classList.add('running');
    $('#chatFlow').setAttribute('aria-busy', 'true');
    $('#topProjectChip').textContent = text.slice(0, 14) + (text.length > 14 ? '…' : '');
    $('#chatTitle').textContent = text.slice(0, 24) + (text.length > 24 ? '…' : '');

    var aiMsg = addMsg('ai', '<span class="typing"><span></span><span></span><span></span></span>');
    var textEl = aiMsg.querySelector('.msg-text');
    var started = false;

    var cfgBlock = '[求解配置] 赛题模板：' + cfg.template + '；参赛组别：' + cfg.group + '；论文语言：' + cfg.lang +
      (cfg.team ? '；队伍号：' + cfg.team : '') + '；求解模型：' + cfg.model +
      (cfg.outDir ? '；论文生成路径：' + cfg.outDir : '') +
      '。请严格按以上配置执行本次求解与论文写作。';
    // 演示流程不写真实目录：阶段解说里去掉 outDir，避免误导为已落盘
    var reqCfg = isDemo ? Object.assign({}, cfg, { outDir: '' }) : cfg;
    currentTaskId = (isDemo ? bridge.submitDemo : bridge.submit)({ prompt: text + '\n\n' + cfgBlock, mode: modes[modeIdx], attachments: attNames, attachmentPaths: attPaths, attachmentKinds: attachmentKinds, config: reqCfg }, function (ev) {
      if (ev.type === 'stage') {
        started = true;
        showStageBar(ev.index);
        var step = '<div class="stage-step active"><span class="step-ico">' + (ev.index + 1) + '</span>' +
          '<div><strong>' + esc(ev.label) + '</strong></div>' +
          '<span class="step-desc">' + esc(bridge.STAGES[ev.index].desc) + '</span></div>';
        textEl.innerHTML = step + (ev.text ? '<p>' + esc(ev.text) + '</p>' : '');
      } else if (ev.type === 'text') {
        // 流式追加用 Text 节点：天然免转义，且不再每帧重建整段 innerHTML
        if (!started) { textEl.innerHTML = '<div class="agent-stream"></div>'; started = true; }
        var streamEl = textEl.querySelector('.agent-stream');
        if (streamEl) streamEl.appendChild(document.createTextNode(ev.text));
        $('#chatFlow').scrollTop = $('#chatFlow').scrollHeight;
      } else if (ev.type === 'error') {
        textEl.innerHTML += '<p style="color:var(--err)"><strong>出错：</strong>' + esc(String(ev.text)) + '</p>';
        finish();
      } else if (ev.type === 'done') {
        var demo = isDemo || ev.demo;
        var arts = (ev.artifacts && ev.artifacts.length) ? ev.artifacts : [];
        textEl.innerHTML += demo
          ? '<p><strong style="color:var(--ok);display:inline-flex;align-items:center;gap:5px;vertical-align:middle">' + svg('check', 14) + ' 演示完成</strong>　以上为样例求解流程，右侧「产出文件」为演示清单：未生成真实文件，也未调用任何模型。</p>'
          : '<p><strong style="color:var(--ok);display:inline-flex;align-items:center;gap:5px;vertical-align:middle">' + svg('check', 14) + ' 已完成</strong>　' + (arts.length ? '产出文件已按实际生成列于右侧「产出文件」（点击可打开）。' : '未扫描到产出文件，请点「打开工作目录」核实。') + '</p>';
        renderOutputs(arts, demo);
        finish(true);
        if (cfg.autoOpen) {
          if (!demo && live && cfg.outDir) {
            try { window.electronAPI.openInFinder(cfg.outDir); } catch (e) {}
          } else {
            toast(demo ? '演示模式：无真实产出目录' : '求解完成，产出目录：' + (cfg.outDir || '默认工作区'), { icon: 'folder' });
          }
        }
      }
    });
  }

  function finish(completed) {
    running = false;
    demoTask = false;
    $('#btnSend').hidden = false; $('#btnStop').hidden = true;
    $('#chatStatus').textContent = '就绪'; $('#chatStatus').classList.remove('running');
    $('#chatFlow').removeAttribute('aria-busy');
    if (completed) showStageBar(bridge.STAGES.length);
    currentTaskId = null;
    syncSend();
  }

  $('#btnSend').addEventListener('click', function () { send($('#chatInput').value); });

  $('#btnStop').addEventListener('click', function () {
    if (stopping) return;
    var id = currentTaskId;
    stopping = true; syncSend();
    $('#chatStatus').textContent = '停止中';
    Promise.resolve(id ? bridge.abort(id) : null).then(function () {
      stopping = false; currentTaskId = null;
      toast('已停止当前任务', { icon: 'info' }); finish();
    }).catch(function () { stopping = false; currentTaskId = null; finish(); });
  });
  $('#chatInput').addEventListener('input', syncSend);
  $('#chatInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(this.value); }
  });
  syncSend();

  // 新任务：用模板克隆，重置 display，避免旧节点 display:none 被复制
  var welcomeTemplate = $('#welcomeState').cloneNode(true);
  $('#btnNewTask').addEventListener('click', function () {
    var flow = $('#chatFlow');
    flow.innerHTML = '';
    var fresh = welcomeTemplate.cloneNode(true);
    fresh.style.display = '';
    flow.appendChild(fresh);
    $('#stageBar').hidden = true; renderOutputs([]);
    $('#chatTitle').textContent = '开始一个新的建模任务';
    $('#topProjectChip').textContent = '未选择项目';
    bindQuickCards(); $('#chatInput').focus();
  });
  $('#btnOpenFolder').addEventListener('click', function () {
    if (live && cfg.outDir) {
      try { window.electronAPI.openInFinder(cfg.outDir); return; } catch (e) {}
    }
    toast('论文生成目录：' + (cfg.outDir || '默认工作区（可在「求解配置」中修改）'), { icon: 'folder' });
  });

  function bindQuickCards() {
    $$('.quick-card').forEach(function (c) {
      c.addEventListener('click', function () { send(c.dataset.prompt); });
    });
  }
  bindQuickCards();

  // ---------- 编辑器：LaTeX 工作台 ----------
  // exe：内核写作项目（真实磁盘文件 + TinyTeX 编译 + pandoc 导出 Word）；浏览器：内存演示样例，诚实标注。
  var edInited = false, edLive = false, edProject = null, edNodes = [], edActive = null;
  var edDirty = false, edUndoStack = [], edRedoStack = [], edLastVal = '', edPdf = '', edCompiling = false, edWordBusy = false;
  var edLastPushTs = 0, edEditTimer = null, edLineH = 0;
  var edDemo = {
    '论文/摘要.tex': '\\begin{abstract}\n% 演示样例（数值仅示意，不代表真实计算结果）\n某酯化反应在 343–403 K、0.4–1.6 MPa 区间的 27 组饱和蒸气压实测值与 Antoine 方程的最大相对偏差为 3.1%，误差集中在高压段。本文先按温度分段标定参数，再用差分进化处理分段边界的连续性，27 组数据的最大相对偏差降至 1.4%。边界温度 ±5 K 扰动下，偏差变化不超过 0.3 个百分点。\n\n\\textbf{针对问题二：}……\n\\keywords{饱和蒸气压；Antoine 方程；分段标定；差分进化；灵敏度分析}\n\\end{abstract}',
    '论文/模型的建立与求解.tex': '\\section{模型的建立与求解}\n\\subsection{问题一}\n\\subsubsection{数据预处理}\n附件 27 组记录中，343 K 以下 4 组压力单位缺失，按量级判定为 kPa 并统一换算；403 K 处 1 组读数与相邻点偏离 18%，按三倍标准差准则剔除。处理后 23 组用于标定。\n\\subsubsection{模型建立}\n……\n\\subsection{问题二}\n……\n\\subsubsection{灵敏度分析}\n……',
    '求解/问题一_求解.py': 'import numpy as np\n\n# 读取结果文件并复算关键数值\ndata = np.loadtxt("结果/问题一.csv", delimiter=",")\nprint("R2 =", 1 - np.sum((data[:,1]-data[:,2])**2) / np.sum((data[:,1]-data[:,1].mean())**2))',
    '求解/问题二_求解.py': 'from scipy.optimize import differential_evolution\n\nres = differential_evolution(objective, bounds=[(0, 100), (0, 50)], seed=42)\nprint(res.x, res.fun)',
    '结果/结果汇总.xlsx': '（表格文件：演示样例，exe 中由求解管线真实生成）'
  };
  function edType(name) {
    var e = (name.split('.').pop() || '').toLowerCase();
    return e === 'tex' ? 'tex' : e === 'py' ? 'py' : e === 'xlsx' || e === 'csv' ? 'xlsx' : e === 'pdf' ? 'pdf' : 'file';
  }
  function edSetStatus(cls, text) { var p = $('#edStatus'); p.className = 'ed-pill ' + cls; p.textContent = text; }
  function edLog(msg, cls) {
    var box = $('#edLog');
    var t = new Date(); var hh = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + ':' + ('0' + t.getSeconds()).slice(-2);
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.innerHTML = '<span class="lg-t">[' + hh + ']</span> ' + esc(msg);
    box.appendChild(line);
    while (box.children.length > 400) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }
  function edLogOpen(open) { $('#edLog').hidden = !open; $('#edConsoleToggle').style.transform = open ? 'rotate(180deg)' : ''; }
  function edPathLabel() {
    $('#editorPath').innerHTML = edActive ? esc(edActive.rel) + (edDirty ? ' <span class="dirty-dot">●</span>' : '') : '—';
  }
  function edGutter() {
    var n = $('#editorText').value.split('\n').length;
    var s = ''; for (var i = 1; i <= n; i++) s += i + '\n';
    $('#edGutter').textContent = s;
    $('#edGutter').scrollTop = $('#editorText').scrollTop;
  }
  var edOlSeq = 0;
  function edJumpLine(line) {
    var ta = $('#editorText'); var ls = ta.value.split('\n'); var idx = 0;
    for (var i = 0; i < line; i++) idx += ls[i].length + 1;
    ta.focus(); ta.setSelectionRange(idx, idx);
    ta.scrollTop = Math.max(0, line * edLineHeight() - 80);
    edGutter();
  }
  function edOutline() {
    var box = $('#edOutline');
    if (!edActive || edActive.type !== 'tex') { box.innerHTML = '<div class="ol-empty">打开 .tex 文件后，这里按 \\section / \\subsection 解析大纲。</div>'; return; }
    var seq = ++edOlSeq;
    var items = []; var fileOrder = 0;
    function scan(ls, rel, path, fo) {
      ls.forEach(function (ln, i) {
        var m = ln.match(/^\s*\\(section|subsection|subsubsection)\*?\{([^}]*)\}/);
        if (m) { items.push({ lv: m[1] === 'section' ? 1 : m[1] === 'subsection' ? 2 : 3, t: m[2], line: i, rel: rel, path: path, ord: fo * 1e6 + i }); return; }
        var inc = ln.match(/^\s*\\(?:input|include)\{([^}]+)\}/);
        if (inc && edLive && window.electronAPI && window.electronAPI.readFileContent) {
          var name = inc[1].trim(); if (!/\.[a-z0-9]+$/i.test(name)) name += '.tex';
          var pdir = (path || '').split(/[\\/]/).slice(0, -1).join('/');
          var rdir = (rel || '').split('/').slice(0, -1).join('/');
          var cp = pdir ? pdir + '/' + name : name;
          var cr = rdir ? rdir + '/' + name : name;
          var cfo = ++fileOrder;
          window.electronAPI.readFileContent(cp).then(function (r) {
            if (seq !== edOlSeq || !r || !r.success) return;
            scan(String(r.text != null ? r.text : (r.content || '')).split('\n'), cr, cp, cfo);
            render();
          }).catch(function () {});
        }
      });
    }
    function render() {
      if (seq !== edOlSeq) return;
      if (!items.length) { box.innerHTML = '<div class="ol-empty">当前文件没有 \\section 等章节命令。</div>'; return; }
      items.sort(function (a, b) { return a.ord - b.ord; });
      var html = '';
      items.forEach(function (it, k) {
        html += '<button class="ol-item lv' + it.lv + '" type="button" data-k="' + k + '" title="' + esc(it.rel) + ' 第 ' + (it.line + 1) + ' 行">' + esc(it.t) + '</button>';
      });
      box.innerHTML = html;
      $$('.ol-item', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var it = items[+b.dataset.k]; if (!it) return;
          if (edActive && it.path === edActive.path) { edJumpLine(it.line); return; }
          var n = edNodes.filter(function (x) { return x.path === it.path; })[0] ||
            { rel: it.rel, path: it.path, name: it.path.split(/[\\/]/).pop(), type: 'tex', dir: it.rel.split('/').slice(0, -1).join('/') };
          edOpen(n, it.line);
        });
      });
    }
    scan($('#editorText').value.split('\n'), edActive.rel, edActive.path, 0);
    render();
  }
  function edRenderTree() {
    var groups = {}; var order = [];
    edNodes.forEach(function (n) { var g = n.dir || '项目根'; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(n); });
    var html = '';
    order.forEach(function (g) {
      html += '<div class="tree-folder">' + esc(g) + '</div>';
      groups[g].forEach(function (n) {
        html += '<div class="tree-file' + (edActive && edActive.rel === n.rel ? ' active' : '') + '" data-rel="' + esc(n.rel) + '" role="button" tabindex="0">' + svg(FILE_ICON[n.type] || 'file', 15) + '<span class="tf-name">' + esc(n.name) + '</span></div>';
      });
    });
    if (!edNodes.length) html = '<div class="ol-empty">空项目：点「＋ 新建」创建第一个 .tex 文件。</div>';
    $('#fileTree').innerHTML = html;
    $$('.tree-file', $('#fileTree')).forEach(function (el) {
      function go() { var n = edNodes.filter(function (x) { return x.rel === el.dataset.rel; })[0]; if (n) edOpen(n); }
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  function edFlatten(node, dir, out) {
    (node.children || []).forEach(function (c) {
      if (c.type === 'directory') edFlatten(c, dir ? dir + '/' + c.name : c.name, out);
      else out.push({ rel: (dir ? dir + '/' : '') + c.name, path: c.path, name: c.name, type: edType(c.name), dir: dir });
    });
  }
  function edLineHeight() {
    if (!edLineH) { edLineH = parseFloat(getComputedStyle($('#editorText')).lineHeight) || 21.875; }
    return edLineH;
  }
  function edRefreshTree() {
    if (!edLive) { edRenderTree(); return Promise.resolve(); }
    return window.electronAPI.writeGetFileTree(edProject.path).then(function (r) {
      if (!r || !r.success || !r.tree) { edLog('文件树读取失败：' + ((r && r.error) || '未知错误'), 'lg-err'); return; }
      edNodes = []; edFlatten(r.tree, '', edNodes);
      edRenderTree();
    }).catch(function (e) { edLog('文件树读取异常：' + e.message, 'lg-err'); toast('文件树刷新失败', { icon: 'info' }); });
  }
  function edPushUndo(prev) { edUndoStack.push(prev); if (edUndoStack.length > 200) edUndoStack.shift(); edRedoStack = []; }
  function edSyncDirty() { if (edLive && window.electronAPI && typeof window.electronAPI.setPaperDirty === 'function') { try { window.electronAPI.setPaperDirty(edDirty); } catch (e) {} } }
  function edAfterEdit() {
    edDirty = true; edPathLabel(); edSyncDirty();
    // gutter/outline 防抖：避免每键入全量重建（大文件 O(n) 卡顿）
    clearTimeout(edEditTimer);
    edEditTimer = setTimeout(function () { edGutter(); edOutline(); }, 120);
  }
  var edOpenSeq = 0;
  function edOpen(n, jumpLine) {
    if (edLive && /\.(docx|xlsx|xls|pdf|png|jpe?g|gif|zip|exe)$/i.test(n.name)) { toast('二进制文件不在代码编辑器中打开：' + n.rel, { icon: 'info' }); return; }
    if (edDirty && edActive) edSave(true);
    var seq = ++edOpenSeq;
    edActive = n; edDirty = false; edUndoStack = []; edRedoStack = []; edLastPushTs = 0; edSyncDirty();
    function fill(content) {
      if (seq !== edOpenSeq) return;   // 丢弃慢响应：避免 A 的内容覆盖已切换到的 B
      edLastVal = content; $('#editorText').value = content; $('#editorText').scrollTop = 0;
      $('#edEmpty').hidden = true; $('#edCode').hidden = false;
      edPathLabel(); edGutter(); edOutline(); edRenderTree();
      if (jumpLine != null) edJumpLine(jumpLine);
    }
    if (edLive) {
      window.electronAPI.readFileContent(n.path).then(function (r) {
        if (seq !== edOpenSeq) return;
        if (!r || !r.success) { toast('读取失败：' + ((r && r.error) || '未知错误'), { icon: 'info' }); fill(''); return; }
        fill(r.text != null ? r.text : (r.content || ''));
      }).catch(function (e) { if (seq === edOpenSeq) { toast('读取异常：' + e.message, { icon: 'info' }); fill(''); } });
    } else {
      var draft = null; try { draft = localStorage.getItem('averis.ed.draft.' + n.rel); } catch (e) {}
      fill(draft != null ? draft : (edDemo[n.rel] || ''));
    }
  }
  function edSave(silent) {
    var node = edActive;   // 快照：回调只操作发起时的文件，保存途中切文件不串写/不清新文件 dirty
    if (!node) { if (!silent) toast('先打开一个文件再保存', { icon: 'info' }); return Promise.resolve(false); }
    var val = $('#editorText').value;
    edLastPushTs = 0;      // 保存强制结束 undo 合批
    if (edLive) {
      return window.electronAPI.writeFileContent(node.path, val).then(function (r) {
        if (!r || !r.success) { toast('保存失败：' + ((r && r.error) || '未知错误'), { icon: 'info' }); edLog('保存失败：' + ((r && r.error) || ''), 'lg-err'); return false; }
        if (edActive === node) { edDirty = false; edPathLabel(); edSyncDirty(); }
        edLog('已保存 ' + node.rel);
        if (!silent) toast('已保存到磁盘：' + node.rel, { icon: 'check' });
        return true;
      }).catch(function (e) { toast('保存异常：' + e.message, { icon: 'info' }); edLog('保存异常：' + e.message, 'lg-err'); return false; });
    }
    edDemo[node.rel] = val;
    try { localStorage.setItem('averis.ed.draft.' + node.rel, val); } catch (e) {}
    if (edActive === node) { edDirty = false; edPathLabel(); }
    if (!silent) toast('演示保存：已写入浏览器本地（exe 中为真实磁盘保存）', { icon: 'check' });
    return Promise.resolve(true);
  }
  function edInsert(before, after, ph) {
    var ta = $('#editorText'); if (!edActive) { toast('先打开一个文件', { icon: 'info' }); return; }
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = ta.value.slice(s, e) || ph;
    edPushUndo(ta.value);
    ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    edLastVal = ta.value; edAfterEdit();
  }
  function edEnv(env, ph) { edInsert('\\begin{' + env + '}\n', '\n\\end{' + env + '}\n', ph || '内容'); }
  function edUndo() {
    var ta = $('#editorText'); if (!edUndoStack.length) return;
    edRedoStack.push(ta.value); ta.value = edUndoStack.pop(); edLastVal = ta.value; edAfterEdit();
  }
  function edRedo() {
    var ta = $('#editorText'); if (!edRedoStack.length) return;
    edUndoStack.push(ta.value); ta.value = edRedoStack.pop(); edLastVal = ta.value; edAfterEdit();
  }
  function edPdfFrame(src) { return '<iframe src="' + src + '" title="PDF 预览"></iframe>'; }
  function edPdfSrc() {
    // encodeURI 不转义 # 与 ?：路径含它们会截断 file URL，先手动百分号编码
    var p = edPdf.replace(/\\/g, '/').replace(/#/g, '%23').replace(/\?/g, '%3F');
    return encodeURI('file:///' + p) + '#toolbar=0&navpanes=0&view=FitH&t=' + Date.now();
  }
  // 全屏预览：焦点存还 + Esc 关闭（统一 Esc 栈在下方注册）
  var edFullReturnFocus = null;
  function edOpenFull() {
    $('#edFullTitle').textContent = 'PDF 预览 · ' + edPdf.split(/[\\/]/).pop();
    $('#edFullPane').innerHTML = edPdfFrame(edPdfSrc());
    edFullReturnFocus = document.activeElement;
    $('#edFull').hidden = false;
    var c = $('#edFullClose'); if (c) c.focus();
  }
  function edCloseFull() {
    $('#edFull').hidden = true; $('#edFullPane').innerHTML = '';
    if (edFullReturnFocus && document.contains(edFullReturnFocus)) { try { edFullReturnFocus.focus(); } catch (e) {} }
    edFullReturnFocus = null;
  }
  function edRenderPdf() {
    var pane = $('#editorPreview');
    if (!edLive) { pane.innerHTML = '<div class="preview-empty"><span>' + svg('file', 30) + '</span>浏览器演示模式：编译与 PDF 预览<br>请在 Averis.exe 编辑器中体验</div>'; return; }
    if (!edPdf) { pane.innerHTML = '<div class="preview-empty"><span>' + svg('file', 30) + '</span>编译后 PDF 将在此显示</div>'; return; }
    window.electronAPI.checkPdfValid(edPdf).then(function (ok) {
      if (!ok) { pane.innerHTML = '<div class="preview-empty"><span>' + svg('info', 30) + '</span>PDF 不完整（可能编译中断）<br>请重新编译后再预览</div>'; return; }
      pane.innerHTML = edPdfFrame(edPdfSrc());
      if (!$('#edFull').hidden) $('#edFullPane').innerHTML = edPdfFrame(edPdfSrc());
    }).catch(function () { pane.innerHTML = edPdfFrame(edPdfSrc()); });
  }
  function edCompile() {
    if (edCompiling) return;
    if (!edLive) {
      edLogOpen(true); edLog('浏览器演示模式无法调用本机 TinyTeX：请打开 Averis.exe，在编辑器中编译真实项目。', 'lg-err');
      edSetStatus('na', '不可用'); toast('浏览器演示模式不支持编译，请使用 Averis.exe', { icon: 'info' }); return;
    }
    if (!edActive || edActive.type !== 'tex') { toast('请先打开一个 .tex 文件再编译', { icon: 'info' }); return; }
    edCompiling = true; $('#edCompile').classList.add('busy');
    edSetStatus('run', '编译中'); edLogOpen(true);
    var engine = $('#edEngine').value, single = $('#edSinglePass').checked;
    var t0 = Date.now();
    edLog('开始编译 · 引擎 ' + engine + (single ? ' · 单轮' : ' · 双轮') + ' · ' + edActive.rel);
    var go = function () {
      window.electronAPI.directCompile(edActive.path, edProject.path, single, engine).then(function (r) {
        var sec = ((Date.now() - t0) / 1000).toFixed(1);
        if (r && r.success) {
          edPdf = r.pdfPath;
          edLog('编译成功 · 耗时 ' + sec + 's · 生成 ' + r.pdfPath.split(/[\\/]/).pop(), 'lg-ok');
          edSetStatus('ok', '成功'); edRenderPdf(); toast('编译成功，PDF 已更新到右侧预览', { icon: 'check' });
        } else {
          var err = (r && r.error) || '未知错误';
          err.split('\n').slice(-40).forEach(function (ln) { edLog(ln, 'lg-err'); });
          edLog('编译失败 · 耗时 ' + sec + 's', 'lg-err');
          edSetStatus('err', '失败'); toast('编译失败：详见编译输出', { icon: 'info' });
        }
      }).catch(function (e) {
        edLog('编译异常：' + e.message, 'lg-err'); edSetStatus('err', '失败');
      }).then(function () { edCompiling = false; $('#edCompile').classList.remove('busy'); });
    };
    if (edDirty) edSave(true).then(function (ok) { if (ok === false) { edCompiling = false; $('#edCompile').classList.remove('busy'); edSetStatus('err', '失败'); toast('保存失败，已中止编译', { icon: 'info' }); return; } go(); }); else go();
  }
  function edExportWord() {
    if (edWordBusy) return;
    if (!edLive) {
      edLogOpen(true); edLog('浏览器演示模式无法调用 pandoc：Word 导出请在 Averis.exe 中使用。', 'lg-err');
      edSetStatus('na', '不可用'); toast('浏览器演示模式不支持 Word 导出，请使用 Averis.exe', { icon: 'info' }); return;
    }
    if (!edProject) { toast('写作项目未就绪', { icon: 'info' }); return; }
    edWordBusy = true; edSetStatus('run', '导出中'); edLogOpen(true);
    edLog('开始导出 Word · 项目 ' + edProject.name + '（免对话框，输出到 导出/论文.docx）');
    var go = function () {
      window.electronAPI.averisExportWord(edProject.path).then(function (r) {
        if (r && r.success) { edLog('Word 导出完成：' + (r.path || ''), 'lg-ok'); edSetStatus('ok', '成功'); toast('Word 已导出：' + (r.path || '导出/论文.docx'), { icon: 'check' }); }
        else { edLog('Word 导出失败：' + ((r && r.error) || '未知错误'), 'lg-err'); edSetStatus('err', '失败'); toast('Word 导出失败：详见编译输出', { icon: 'info' }); }
      }).catch(function (e) { edLog('Word 导出异常：' + e.message, 'lg-err'); edSetStatus('err', '失败'); })
        .then(function () { edWordBusy = false; });
    };
    if (edDirty) edSave(true).then(function (ok) { if (ok === false) { edWordBusy = false; edSetStatus('err', '失败'); toast('保存失败，已中止导出', { icon: 'info' }); return; } go(); }); else go();
  }
  function edNewFile() {
    var name = ($('#edNewName').value || '').trim().replace(/[<>:"/\\|?*]/g, '_');
    if (!name) { toast('请输入文件名', { icon: 'info' }); return; }
    if (name.indexOf('.') < 0) name += '.tex';
    var rel = '论文/' + name;
    if (edNodes.some(function (n) { return n.rel === rel; })) { toast('已存在同名文件：' + rel + '（未覆盖）', { icon: 'info' }); return; }
    var skeleton = '\\section{' + name.replace(/\.[^.]+$/, '') + '}\n\n';
    $('#edNewPop').hidden = true; $('#edNewName').value = '';
    if (edLive) {
      var dir = edProject.path + '\\论文';
      var target = dir + '\\' + name;
      window.electronAPI.pathExists(target).then(function (exists) {
        if (exists) { toast('已存在同名文件：' + rel + '（未覆盖）', { icon: 'info' }); return null; }
        return window.electronAPI.createFolder(dir).then(function () {
          return window.electronAPI.writeFileContent(target, skeleton);
        }).then(function (r) {
          if (!r || !r.success) { toast('新建失败：' + ((r && r.error) || ''), { icon: 'info' }); return; }
          edLog('新建文件 ' + rel, 'lg-ok'); edRefreshTree();
          edOpen({ rel: rel, path: target, name: name, type: edType(name), dir: '论文' });
          toast('已创建 ' + rel, { icon: 'check' });
        });
      }).catch(function (e) { toast('新建失败：' + e.message, { icon: 'info' }); edLog('新建异常：' + e.message, 'lg-err'); });
    } else {
      edDemo[rel] = skeleton;
      edNodes.push({ rel: rel, path: 'demo:' + rel, name: name, type: edType(name), dir: '论文' });
      edRenderTree(); edOpen(edNodes[edNodes.length - 1]);
      toast('演示新建：' + rel + '（内存样例）', { icon: 'check' });
    }
  }
  function edInit() {
    if (edInited) return; edInited = true;
    edLive = bridge.isLive();
    $$('[data-ico]').forEach(function (el) { el.innerHTML = svg(el.dataset.ico, +(el.dataset.icoSize || 15)); });
    $('#edDemoBadge').hidden = edLive;
    var ta = $('#editorText');
    ta.addEventListener('input', function () {
      // undo 合批：500ms 内的连续键入算一步，避免每字符一条占满 200 上限
      if (Date.now() - edLastPushTs > 500) edPushUndo(edLastVal);
      edLastPushTs = Date.now();
      edLastVal = ta.value; edAfterEdit();
    });
    ta.addEventListener('blur', function () { edLastPushTs = 0; });
    ta.addEventListener('scroll', function () { $('#edGutter').scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); edSave(); }
      else if (k === 'b') { e.preventDefault(); edCompile(); }
      else if (k === 'z' && !e.shiftKey) { e.preventDefault(); edUndo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); edRedo(); }
    });
    $('#edUndo').addEventListener('click', edUndo);
    $('#edRedo').addEventListener('click', edRedo);
    $('#edBold').addEventListener('click', function () { edInsert('\\textbf{', '}', '加粗文字'); });
    $('#edAlignL').addEventListener('click', function () { edEnv('flushleft'); });
    $('#edAlignC').addEventListener('click', function () { edEnv('center'); });
    $('#edQuote').addEventListener('click', function () { edEnv('quote'); });
    $('#edTable').addEventListener('click', function () { edInsert('\\begin{table}[htbp]\n\\centering\n\\caption{表标题}\n\\begin{tabular}{ccc}\n\\toprule\n列一 & 列二 & 列三 \\\\\n\\midrule\n1 & 2 & 3 \\\\\n\\bottomrule\n\\end{tabular}\n\\end{table}\n', '', ''); });
    $('#edImage').addEventListener('click', function () { edInsert('\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{figures/example.png}\n\\caption{图标题}\n\\end{figure}\n', '', ''); });
    $('#edFormat').addEventListener('change', function () {
      var v = this.value; this.value = '';
      if (!v) return;
      if (v === 'section' || v === 'subsection' || v === 'subsubsection') edInsert('\\' + v + '{', '}', '标题');
      else if (v === 'itemize' || v === 'enumerate') edInsert('\\begin{' + v + '}\n\\item ', '\n\\end{' + v + '}\n', '第一条');
      else if (v === 'equation') edEnv('equation', 'E = mc^2');
      else if (v === 'abstract') edEnv('abstract', '摘要内容');
    });
    $('#btnEditorSave').addEventListener('click', function () { edSave(); });
    $('#edCompile').addEventListener('click', edCompile);
    $('#btnEditorExport').addEventListener('click', edExportWord);
    $('#edModeCollab').addEventListener('click', function () { toast('局域网协作：内核 collab 能力已具备，Averis 本期未开放；单人模式不受影响', { icon: 'users' }); });
    $('#edModeSolo').addEventListener('click', function () { $('#edModeSolo').classList.add('active'); $('#edModeCollab').classList.remove('active'); });
    $('#edConsoleToggle').addEventListener('click', function () { edLogOpen($('#edLog').hidden); });
    $('#edSettingsBtn').addEventListener('click', function (e) { e.stopPropagation(); $('#edSettings').hidden = !$('#edSettings').hidden; $('#edNewPop').hidden = true; });
    $('#btnEdNew').addEventListener('click', function (e) { e.stopPropagation(); $('#edNewPop').hidden = !$('#edNewPop').hidden; $('#edSettings').hidden = true; if (!$('#edNewPop').hidden) $('#edNewName').focus(); });
    $('#edNewOk').addEventListener('click', edNewFile);
    $('#edNewName').addEventListener('keydown', function (e) { if (e.key === 'Enter') edNewFile(); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#edSettings') && !e.target.closest('#edSettingsBtn')) $('#edSettings').hidden = true;
      if (!e.target.closest('#edNewPop') && !e.target.closest('#btnEdNew')) $('#edNewPop').hidden = true;
    });
    $('#edTabFiles').addEventListener('click', function () {
      this.classList.add('active'); this.setAttribute('aria-selected', 'true');
      $('#edTabOutline').classList.remove('active'); $('#edTabOutline').setAttribute('aria-selected', 'false');
      $('#fileTree').hidden = false; $('#edOutline').hidden = true; $('#edSideTitle').textContent = '文件';
    });
    $('#edTabOutline').addEventListener('click', function () {
      this.classList.add('active'); this.setAttribute('aria-selected', 'true');
      $('#edTabFiles').classList.remove('active'); $('#edTabFiles').setAttribute('aria-selected', 'false');
      $('#fileTree').hidden = true; $('#edOutline').hidden = false; $('#edSideTitle').textContent = '大纲';
      edOutline();
    });
    $('#edPdfRefresh').addEventListener('click', function () {
      if (!edPdf) { toast(edLive ? '先编译生成 PDF，再刷新预览' : '浏览器演示模式无 PDF 可刷新', { icon: 'info' }); return; }
      edRenderPdf(); edLog('预览已刷新');
    });
    $('#edPdfFull').addEventListener('click', function () {
      if (!edPdf) { toast(edLive ? '先编译生成 PDF，再全屏预览' : '浏览器演示模式无 PDF 可全屏', { icon: 'info' }); return; }
      edOpenFull();
    });
    $('#edFullClose').addEventListener('click', edCloseFull);
    $('#edPdfDownload').addEventListener('click', function () {
      if (!edLive || !edPdf) { toast(edLive ? '先编译生成 PDF，再下载' : '浏览器演示模式无 PDF 可下载', { icon: 'info' }); return; }
      window.electronAPI.averisDownloadPdf(edPdf).then(function (r) {
        if (r && r.success) { toast('已下载到：' + r.path, { icon: 'check' }); edLog('PDF 已复制到下载目录：' + r.path, 'lg-ok'); }
        else toast('下载失败：' + ((r && r.error) || ''), { icon: 'info' });
      });
    });
    if (edLive) {
      window.electronAPI.onWordExportLog(function (m) { edLog('[word] ' + m); });
      edSetStatus('ready', '就绪');
      edLog('Averis 编辑器就绪 · 本机写作项目模式（真实磁盘文件）', 'lg-ok');
      window.electronAPI.latexDetectSystem().then(function (d) {
        edLog('系统 LaTeX：' + (d && d.success ? d.path : '未检测到') + ' · 编译使用内置 TinyTeX（编译时按需校验引擎）');
      }).catch(function () { edLog('系统 LaTeX 检测跳过 · 编译使用内置 TinyTeX（编译时按需校验引擎）'); });
      window.electronAPI.writeListProjects().then(function (r) {
        var ps = (r && r.projects) || [];
        var ready = function (p) {
          edProject = p; edLog('打开写作项目：' + p.name, 'lg-ok');
          edRefreshTree().then(function () {
            var node = null;
            if (p.texFile) {
              var rel = p.texFile.replace(/\\/g, '/');
              node = { rel: rel, path: p.path + '\\' + p.texFile, name: rel.split('/').pop(), type: 'tex', dir: rel.indexOf('/') >= 0 ? rel.slice(0, rel.lastIndexOf('/')) : '' };
            } else {
              // 同步来的项目可能只有 论文/ 章节而无根主文件：按优先级挑一个 .tex 打开
              var pref = ['论文.tex', 'main.tex', '论文/论文.tex', '论文/main.tex'];
              for (var i = 0; i < pref.length && !node; i++) node = edNodes.filter(function (x) { return x.rel === pref[i]; })[0] || null;
              if (!node) node = edNodes.filter(function (x) { return x.type === 'tex'; })[0] || null;
              if (node) edLog('项目根目录无主 .tex，已打开 ' + node.rel + '（章节文件单独编译可能缺少导言区）');
              else edLog('项目内没有 .tex 文件：点「＋ 新建」创建第一个文件');
            }
            if (node) edOpen(node);
            if (p.pdfFile) { edPdf = p.path + '\\' + p.pdfFile; edRenderPdf(); }
          });
        };
        if (ps.length) { ready(ps[0]); return; }
        window.electronAPI.writeCreateProject('Averis 示例论文').then(function (c) {
          if (!c || !c.success) { edLog('创建示例项目失败：' + ((c && c.error) || ''), 'lg-err'); edSetStatus('err', '失败'); return; }
          window.electronAPI.writeListProjects().then(function (r2) {
            var ps2 = (r2 && r2.projects) || [];
            if (ps2.length) ready(ps2[0]); else edLog('写作项目列表为空', 'lg-err');
          });
        });
      });
    } else {
      edSetStatus('na', '演示');
      edLogOpen(true);
      edLog('浏览器演示模式：左侧为内存演示样例，保存写入浏览器本地；编译 / Word / PDF 预览需在 Averis.exe 中调用本机 TinyTeX 与 pandoc。');
      edNodes = Object.keys(edDemo).map(function (rel) {
        var name = rel.split('/').pop();
        return { rel: rel, path: 'demo:' + rel, name: name, type: edType(name), dir: rel.slice(0, rel.lastIndexOf('/')) };
      });
      edRenderTree(); edOpen(edNodes[0]);
      edRenderPdf();
    }
    // 关窗守卫：live 走内核 paperDirty 链（自动保存成功才放行），浏览器 demo 用 beforeunload
    if (edLive) {
      try { window.electronAPI.setPaperDirty(false); } catch (e) {}   // 复位崩溃重载后的残留 dirty
      if (typeof window.electronAPI.onAppCloseRequest === 'function') {
        window.electronAPI.onAppCloseRequest(function () {
          edSave(true).then(function (ok) {
            if (ok !== false) { try { window.electronAPI.setPaperDirty(false); window.electronAPI.forceCloseApp(); } catch (e) {} }
            else toast('自动保存失败：请手动保存后再关闭', { icon: 'info' });
          });
        });
      }
    } else {
      window.addEventListener('beforeunload', function (e) { if (edDirty) { e.preventDefault(); e.returnValue = ''; } });
    }
    // 窄屏（≤820px）预览列变浮层：工具栏常驻入口，保证 Word/下载任何宽度可达
    var pvT = $('#edPreviewToggle');
    if (pvT) pvT.addEventListener('click', function () { $('#view-editor').classList.toggle('preview-open'); });
    $$('.ed-tb-btn[title]').forEach(function (b) { b.setAttribute('aria-label', b.title); });
  }

  // ---------- 我的 ----------
  function fmtTok(n) { n = Number(n) || 0; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e4) return (n / 1e4).toFixed(1) + '万'; return String(n); }
  function paintMe(stats, bars, foot, demo) {
    $('#meStats').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="stat-ico">' + svg(s.icon, 17) + '</div><div class="stat-num">' + s.num + '</div><div class="stat-label">' + s.label + '</div><div class="stat-sub">' + svg('check', 11) + ' ' + s.sub + '</div></div>';
    }).join('');
    $('#usageChart').innerHTML = bars.map(function (b) {
      return '<div class="bar-col"><span class="bar-tip">' + b.tip + '</span><div class="bar" style="height:' + b.v + '%" role="img" aria-label="' + b.label + ' ' + b.tip + '"></div><span>' + b.label + '</span></div>';
    }).join('');
    $('#usageFoot').innerHTML = foot;
    $('#meDemoNote').hidden = !demo;
  }
  // 浏览器直开（无后端）：保留样例数字，但明确标注演示
  function renderMeDemo() {
    var stats = [
      { num: '12', label: '累计任务', sub: '演示数据', icon: 'spark' },
      { num: '94%', label: '求解完成率', sub: '演示数据', icon: 'target' },
      { num: '8.6M', label: '累计 Token', sub: '演示数据', icon: 'coin' },
      { num: '7', label: '活跃天数', sub: '演示数据', icon: 'cal' }
    ];
    var bars = [32, 58, 41, 76, 55, 88, 64].map(function (v, i) {
      return { label: (i + 10) + '日', v: v, tip: (v / 10).toFixed(1) + '万 token' };
    });
    paintMe(stats, bars, '<span>近 7 天合计 <strong>3.2M token</strong>（演示）</span><span>估算费用 <strong>¥ 12.40</strong>（演示）</span>', true);
  }
  // 桌面端：读取内核真实用量统计（get-usage-stats）
  function renderMeReal() {
    if (!(bridge.isLive() && window.electronAPI && typeof window.electronAPI.getUsageStats === 'function')) { renderMeDemo(); return; }
    Promise.resolve(window.electronAPI.getUsageStats()).then(function (r) {
      if (!r || !r.success) { renderMeDemo(); return; }
      var totals = r.totals || {}, trend = r.trend || [], daily = r.daily || {}, tasks = r.tasks || [];
      var terminal = tasks.filter(function (t) { return t.status === 'completed' || t.status === 'failed' || t.status === 'interrupted' || t.status === 'cancelled'; });
      var okN = tasks.filter(function (t) { return t.status === 'completed'; }).length;
      var rate = terminal.length ? Math.round(okN / terminal.length * 100) + '%' : '—';
      var weekTasks = trend.reduce(function (a, d) { return a + ((daily[d.date] || {}).tasks || 0); }, 0);
      var stats = [
        { num: String(totals.tasks || 0), label: '累计任务', sub: '近 7 天 +' + weekTasks, icon: 'spark' },
        { num: rate, label: '求解完成率', sub: '最近 ' + terminal.length + ' 条记录', icon: 'target' },
        { num: fmtTok((totals.input || 0) + (totals.output || 0)), label: '累计 Token', sub: '本地统计', icon: 'coin' },
        { num: String(Object.keys(daily).length), label: '活跃天数', sub: '有用量记录的天数', icon: 'cal' }
      ];
      var max = Math.max.apply(null, trend.map(function (d) { return (d.input || 0) + (d.output || 0); }).concat([1]));
      var bars = trend.map(function (d) {
        var tok = (d.input || 0) + (d.output || 0);
        return { label: d.date.slice(5).replace('-', '/'), v: Math.round(tok / max * 100), tip: fmtTok(tok) + ' token' };
      });
      var weekTok = trend.reduce(function (a, d) { return a + (d.input || 0) + (d.output || 0); }, 0);
      paintMe(stats, bars, '<span>近 7 天合计 <strong>' + fmtTok(weekTok) + ' token</strong></span><span>本地真实统计</span>', false);
    }).catch(function () { renderMeDemo(); });
  }

  function renderRecent() {
    $('#recentProjects').innerHTML = sessions.length ? sessions.map(function (s) {
      return '<div class="recent-item" data-id="' + esc(s.id) + '" role="button" tabindex="0"><span class="ri-ico">' + svg(s.icon, 15) + '</span><span class="ri-name">' + esc(s.title) + '</span><span class="ri-meta">' + esc(s.time) + '</span></div>';
    }).join('') : '<div class="session-empty">暂无项目，去工作台新建一个任务</div>';
    $$('#recentProjects .recent-item').forEach(function (el) {
      function go() { activeSessionId = el.dataset.id; switchView('workbench'); renderSessions(); var s = sessions.find(function (x) { return x.id === el.dataset.id; }); if (s) { $('#chatTitle').textContent = s.title; $('#topProjectChip').textContent = s.title; } }
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  renderRecent();

  renderMeReal();

  $('#btnEditProfile').addEventListener('click', function () { switchView('me'); $('#setName').focus(); toast('在下方「偏好设置」编辑资料', { icon: 'info' }); });
  // 显示名称与本地头像持久化（默认不填任何个人信息）
  var NAME_KEY = 'averis.profile.name';
  var AVATAR_KEY = 'averis.profile.avatar';
  function avatarFallbackSvg() {
    return '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="8.2" r="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }
  function renderAvatar() {
    var name = '', img = '';
    try { name = localStorage.getItem(NAME_KEY) || ''; img = localStorage.getItem(AVATAR_KEY) || ''; } catch (e) {}
    var fallback = name.trim() ? esc(name.trim().slice(0, 1)) : avatarFallbackSvg();
    ['btnAvatar', 'meAvatar'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      if (img) {
        el.classList.add('has-img'); el.style.backgroundImage = 'url("' + img + '")'; el.innerHTML = '';
      } else {
        el.classList.remove('has-img'); el.style.backgroundImage = ''; el.innerHTML = fallback;
      }
    });
    var clear = document.getElementById('btnAvatarClear');
    if (clear) clear.hidden = !img;
  }
  function applyName(name) {
    var v = String(name == null ? '' : name).trim();
    var input = document.getElementById('setName');
    if (input) input.value = v;
    var h = document.getElementById('meName');
    if (h) h.textContent = v || '未设置';
    try {
      if (v) localStorage.setItem(NAME_KEY, v); else localStorage.removeItem(NAME_KEY);
    } catch (e) {}
    renderAvatar();
  }
  try {
    var savedName = localStorage.getItem(NAME_KEY) || '';
    applyName(savedName);
  } catch (e) { renderAvatar(); }
  $('#setName').addEventListener('change', function () {
    applyName(this.value);
    toast(this.value.trim() ? '显示名称已更新' : '显示名称已清空', { icon: 'check' });
  });
  // 本地图片头像：选图 → 缩放到 256px → 存 localStorage
  function pickAvatar() { var f = document.getElementById('avatarInput'); if (f) f.click(); }
  $('#btnAvatarPick').addEventListener('click', pickAvatar);
  $('#meAvatar').addEventListener('click', pickAvatar);
  $('#btnAvatarClear').addEventListener('click', function () {
    try { localStorage.removeItem(AVATAR_KEY); } catch (e) {}
    renderAvatar();
    toast('已恢复默认头像', { icon: 'info' });
  });
  $('#avatarInput').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(f.type)) { toast('头像仅支持 PNG / JPEG / WebP 图片', { icon: 'info' }); return; }
    if (f.size > 5 * 1024 * 1024) { toast('头像图片过大（上限 5MB）', { icon: 'info' }); return; }
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function () {
      try {
        var scale = Math.min(1, 256 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var data = c.toDataURL('image/jpeg', 0.85);
        try { localStorage.setItem(AVATAR_KEY, data); } catch (e) { toast('头像保存失败：本机存储不可用或已满', { icon: 'info' }); return; }
        renderAvatar();
        toast('头像已更新（仅保存在本机）', { icon: 'check' });
      } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('图片读取失败，请换一张', { icon: 'info' }); };
    img.src = url;
  });
  $('#setModel').addEventListener('change', function () { $('#topModelChip').textContent = this.value; ensureOption($('#setApiModel'), this.value); $('#setApiModel').value = this.value; syncApiConfig(); cfg.model = this.value; saveCfg(); renderCfgStrip(); toast('默认模型：' + this.value, { icon: 'spark' }); });
  $('#setTemplate').addEventListener('change', function () { cfg.template = this.value; saveCfg(); renderCfgStrip(); fillCfgControls(); applyTemplateLive(this.value); toast('论文模板：' + this.value, { icon: 'file' }); });

  // ---------- API 配置 ----------
  var API_KEY = 'averis.api.config';
  // 主流厂商预设：选厂商 → 自动填 Base/格式/推荐模型，用户只需粘贴 Key
  // models 为各厂商官方在售/仍可调用目录快照（CATALOG_DATE），含简短说明；已下线旧名见 RETIRED_MODELS 迁移表
  var CATALOG_DATE = '2026-11-18';
  var PROVIDERS = [
    { id: 'custom', name: '自定义（中转 / 本地网关）', base: '', format: 'auto', models: [], def: '' },
    { id: 'deepseek', name: 'DeepSeek 深度求索', base: 'https://api.deepseek.com/anthropic', format: 'anthropic', def: 'deepseek-flash', models: [
      { id: 'deepseek-flash', d: 'V4.1-Flash · 1M 上下文 · 视觉/思考可切换（推荐）' },
      { id: 'deepseek-v4-pro', d: 'V4-Pro · 1M 上下文 · 旗舰推理' },
      { id: 'deepseek-v4-flash', d: '兼容别名 · 路由到 V4.1-Flash' },
      { id: 'deepseek-v4-flash-vision-exp', d: '兼容别名 · 视觉实验版' }
    ] },
    { id: 'moonshot', name: 'Moonshot Kimi', base: 'https://api.moonshot.cn/anthropic', format: 'anthropic', def: 'kimi-k3', models: [
      { id: 'kimi-k3.1-pro', d: '旗舰 · 1M 上下文 · 常开思考' },
      { id: 'kimi-k3.1-pro-highspeed', d: 'K3.1 Pro 高速版 · 约 2~3 倍速度' },
      { id: 'kimi-k3', d: '上代旗舰 · 1M 上下文 · 原生视觉（推荐）' },
      { id: 'kimi-k2.7-code', d: '遗留 · 编程特化 · 2026-12 底全面下线' },
      { id: 'kimi-k2.7-code-highspeed', d: '遗留 · 高速版 · 2026-12 底全面下线' },
      { id: 'kimi-k2.6', d: '遗留 · 多模态 · 2026-12 底全面下线' }
    ] },
    { id: 'zhipu', name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/anthropic', format: 'anthropic', def: 'glm-4.7-flash', models: [
      { id: 'glm-5.3', d: '旗舰 · 1M 上下文 / 128K 输出' },
      { id: 'glm-5.3-flash', d: '轻量 · 1M 上下文 · 多模态' },
      { id: 'glm-5.3-flashx', d: 'Flash 高速版' },
      { id: 'glm-5.2', d: '1M 上下文 · 长程 agent 工程' },
      { id: 'glm-5.1', d: '200K 上下文' },
      { id: 'glm-5-turbo', d: 'GLM-5 系列高速档' },
      { id: 'glm-5', d: '200K 上下文' },
      { id: 'glm-4.7', d: '上代旗舰 · 200K' },
      { id: 'glm-4.7-flashx', d: '4.7 高速轻量' },
      { id: 'glm-4.7-flash', d: '免费 · 轻量（推荐）' },
      { id: 'glm-4.6', d: '200K 上下文' },
      { id: 'glm-4.5', d: '混合推理' },
      { id: 'glm-4.5-air', d: '轻量混合推理' },
      { id: 'glm-4.5-airx', d: 'Air 高速版' },
      { id: 'glm-4.5-flash', d: '免费 · 轻量' },
      { id: 'glm-4-long', d: '1M 上下文 · 长文本' },
      { id: 'glm-4-plus', d: 'GLM-4 旗舰' },
      { id: 'glm-4-air-250414', d: 'GLM-4 轻量快照' },
      { id: 'glm-4-airx', d: 'GLM-4 极速轻量' },
      { id: 'glm-4-flashx-250414', d: 'GLM-4 极速快照' },
      { id: 'glm-4-flash-250414', d: '免费 · GLM-4 轻量快照' },
      { id: 'glm-z1-air', d: 'Z1 推理系列 · 轻量' },
      { id: 'glm-z1-airx', d: 'Z1 推理 · 高速' },
      { id: 'glm-z1-flashx', d: 'Z1 推理 · 极速' },
      { id: 'glm-z1-flash', d: 'Z1 推理 · 免费档' },
      { id: 'glm-5v-turbo', d: '视觉旗舰 · 200K 多模态' },
      { id: 'glm-4.6v', d: '视觉 · 200K' },
      { id: 'glm-4.6v-flash', d: '视觉轻量' },
      { id: 'glm-4.6v-flashx', d: '视觉极速' },
      { id: 'glm-4.5v', d: '视觉混合推理' },
      { id: 'glm-4.1v-thinking-flash', d: '视觉思考 · 轻量' },
      { id: 'glm-4.1v-thinking-flashx', d: '视觉思考 · 极速' },
      { id: 'glm-4v-plus-0111', d: '视觉旗舰快照' },
      { id: 'glm-4v-flash', d: '免费 · 视觉轻量' }
    ] },
    { id: 'dashscope', name: '阿里百炼 Qwen', base: 'https://dashscope.aliyuncs.com/apps/anthropic', format: 'anthropic', def: 'qwen-plus', models: [
      { id: 'qwen4-max', d: '旗舰 · 最强推理' },
      { id: 'qwen3.8-max', d: '3.8 代旗舰' },
      { id: 'qwen3.7-max', d: '3.7 代旗舰' },
      { id: 'qwen3.7-plus', d: '3.7 代均衡档' },
      { id: 'qwen3.8-flash', d: '1M 上下文 · 轻量高速' },
      { id: 'qwen3.7-flash', d: '3.7 代轻量' },
      { id: 'qwen3.6-plus', d: '3.6 代均衡档' },
      { id: 'qwen3.6-flash', d: '3.6 代轻量' },
      { id: 'qwen3.6-35b-a3b', d: '开源 MoE · 35B' },
      { id: 'qwen3.5-plus', d: '3.5 代均衡档' },
      { id: 'qwen3.5-flash', d: '3.5 代轻量' },
      { id: 'qwen3.5-397b-a17b', d: '开源旗舰 MoE' },
      { id: 'qwen3.5-122b-a10b', d: '开源 MoE · 122B' },
      { id: 'qwen3.5-27b', d: '开源稠密 · 27B' },
      { id: 'qwen3.5-35b-a3b', d: '开源 MoE · 35B' },
      { id: 'qwen3-coder-flash', d: '编程特化 · 轻量' },
      { id: 'qwen3-vl-plus', d: '视觉理解' },
      { id: 'qwen-max', d: '稳定别名 · 32K' },
      { id: 'qwen-plus', d: '稳定别名 · 1M（推荐）' },
      { id: 'qwen-flash', d: '稳定别名 · 1M 轻量' },
      { id: 'qwen-long', d: '10M 上下文 · 超长文档' },
      { id: 'qwen-mt-plus', d: '翻译特化' },
      { id: 'qwen-mt-flash', d: '翻译 · 轻量' },
      { id: 'qwen-mt-lite', d: '翻译 · 极速' },
      { id: 'deepseek-v4.1-flash-1017', d: '百炼托管 DeepSeek' },
      { id: 'deepseek-v4-pro-0813', d: '百炼托管 DeepSeek 旗舰' },
      { id: 'glm-5.3', d: '百炼托管智谱旗舰' },
      { id: 'kimi-k3.1-pro', d: '百炼托管 Kimi 旗舰' },
      { id: 'kimi-k3', d: '百炼托管 Kimi' },
      { id: 'MiniMax-M3.1-Flash', d: '百炼托管 MiniMax' },
      { id: 'mimo-v2.6-pro-ultraspeed', d: '百炼托管小米 MiMo' },
      { id: 'step-5-preview', d: '百炼托管阶跃星辰' }
    ] },
    { id: 'siliconflow', name: '硅基流动 SiliconFlow', base: 'https://api.siliconflow.cn/v1', format: 'openai', bridge: true, def: 'deepseek-ai/DeepSeek-V4.1-Flash', models: [
      { id: 'deepseek-ai/DeepSeek-V4.1-Flash', d: '1M · 多模态 · 高性价比（推荐）' },
      { id: 'deepseek-ai/DeepSeek-V4-Pro', d: '旗舰 MoE · 1M' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash', d: '高速 MoE · 1M' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash-Vision-Exp', d: '视觉实验版' },
      { id: 'deepseek-ai/DeepSeek-V4-Pro-0813', d: 'V4-Pro 正式快照' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash-0731', d: 'V4-Flash 正式快照' },
      { id: 'deepseek-ai/DeepSeek-V3.2', d: 'DSA 稀疏注意力 · 164K' },
      { id: 'Pro/deepseek-ai/DeepSeek-V3.2', d: 'Pro 付费通道 · V3.2' },
      { id: 'deepseek-ai/DeepSeek-V3.2-Exp', d: 'V3.2 实验版' },
      { id: 'deepseek-ai/DeepSeek-V3.1-Terminus', d: 'V3.1 修订版' },
      { id: 'deepseek-ai/DeepSeek-V3.1', d: '混合思考模式' },
      { id: 'deepseek-ai/DeepSeek-V3', d: 'V3-0324' },
      { id: 'deepseek-ai/DeepSeek-R1', d: 'R1-0528 推理' },
      { id: 'Qwen/Qwen3.8-2.4T-A95B', d: 'Qwen3.8 开源旗舰 MoE' },
      { id: 'Qwen/Qwen3.6-27B', d: '稠密 27B · 视觉' },
      { id: 'Qwen/Qwen3.6-35B-A3B', d: 'MoE · 思考可切换' },
      { id: 'Qwen/Qwen3.5-9B', d: '轻量多模态' },
      { id: 'Qwen/Qwen3.5-27B', d: '稠密 27B 多模态' },
      { id: 'Qwen/Qwen3.5-35B-A3B', d: 'MoE 多模态' },
      { id: 'Qwen/Qwen3-VL-32B-Thinking', d: '视觉推理' },
      { id: 'Qwen/Qwen3-VL-32B-Instruct', d: '视觉指令' },
      { id: 'Qwen/Qwen3-VL-8B-Instruct', d: '视觉轻量' },
      { id: 'Qwen/Qwen3-Coder-480B-A35B', d: '编程旗舰 MoE' },
      { id: 'Qwen/Qwen3-32B', d: '思考可切换' },
      { id: 'Qwen/Qwen3-14B', d: '轻量' },
      { id: 'Qwen/Qwen3-8B', d: '极速轻量' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', d: '上代 72B' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', d: '上代 7B' },
      { id: 'zai-org/GLM-5.3', d: '智谱旗舰 · 1M' },
      { id: 'zai-org/GLM-5.3-Flash', d: '智谱轻量 · 1M 多模态' },
      { id: 'zai-org/GLM-5.2', d: '长程 agent · 1M' },
      { id: 'zai-org/GLM-5.1', d: '200K' },
      { id: 'zai-org/GLM-5', d: '200K' },
      { id: 'zai-org/GLM-4.7', d: '上代旗舰' },
      { id: 'zai-org/GLM-4.5-Air', d: '轻量混合推理' },
      { id: 'zai-org/GLM-5V-Turbo', d: '视觉旗舰' },
      { id: 'moonshotai/Kimi-K3', d: 'Kimi 旗舰 · 1M 视觉' },
      { id: 'moonshotai/Kimi-K2.7-Code', d: 'Kimi 编程特化' },
      { id: 'moonshotai/Kimi-K2.6', d: 'Kimi 多模态 agent' },
      { id: 'Pro/moonshotai/Kimi-K2.6', d: 'Pro 付费通道 · K2.6' },
      { id: 'MiniMaxAI/MiniMax-M3', d: 'MiniMax 旗舰 · 1M 多模态' },
      { id: 'meituan-longcat/LongCat-2.0', d: '美团 LongCat · agent' },
      { id: 'tencent/Hy4-preview', d: '腾讯 Hy4 预览 · 1M' },
      { id: 'tencent/Hy3', d: '腾讯 Hy3 · 256K' },
      { id: 'google/gemma-4-31B-it', d: 'Gemma 4 稠密 31B' },
      { id: 'google/gemma-4-26B-A4B-it', d: 'Gemma 4 MoE' },
      { id: 'openai/gpt-oss-120b', d: 'OpenAI 开源 120B' },
      { id: 'openai/gpt-oss-20b', d: 'OpenAI 开源 20B' },
      { id: 'ByteDance-Seed/Seed-OSS-36B-Instruct', d: '字节 Seed 开源 36B' },
      { id: 'inclusionAI/Ling-flash-2.0', d: '蚂蚁 Ling 轻量 MoE' }
    ] },
    { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', format: 'openai', bridge: true, def: 'gpt-6-luna', models: [
      { id: 'gpt-6-astra', d: '旗舰 · 1M 上下文' },
      { id: 'gpt-6.1-sol', d: '智能/成本均衡档' },
      { id: 'gpt-6.1-terra', d: '6.1 代中档 · 视觉推理/写作' },
      { id: 'gpt-6-luna', d: '高吞吐低成本档（推荐）' },
      { id: 'gpt-6-sol', d: 'GPT-6 均衡档' },
      { id: 'gpt-5.6-sol', d: '5.6 代旗舰' },
      { id: 'gpt-5.6-terra', d: '5.6 代中档' },
      { id: 'gpt-5.6-luna', d: '5.6 代轻量' },
      { id: 'gpt-5.5', d: '5.5 代旗舰' },
      { id: 'gpt-5.4', d: '5.4 代均衡' },
      { id: 'gpt-5.4-mini', d: '5.4 代轻量' },
      { id: 'gpt-5.4-nano', d: '5.4 代极速' },
      { id: 'gpt-5.2', d: '5.2 代均衡' },
      { id: 'gpt-5.2-codex', d: '5.2 编程特化' },
      { id: 'gpt-5.1', d: '5.1 代均衡' },
      { id: 'gpt-5.1-codex', d: '5.1 编程特化' },
      { id: 'gpt-5.1-codex-max', d: '5.1 编程长程档' },
      { id: 'gpt-5', d: 'GPT-5 基线' },
      { id: 'gpt-5-mini', d: 'GPT-5 轻量' },
      { id: 'gpt-5-nano', d: 'GPT-5 极速' },
      { id: 'gpt-5-pro', d: 'GPT-5 高算力档' },
      { id: 'gpt-4.1', d: '1M 上下文 · 长文本' },
      { id: 'gpt-4.1-mini', d: '4.1 轻量' },
      { id: 'gpt-4.1-nano', d: '4.1 极速' },
      { id: 'gpt-4o', d: '多模态经典' },
      { id: 'gpt-4o-mini', d: '多模态轻量经典' },
      { id: 'o3', d: '推理系列' },
      { id: 'o3-pro', d: '推理高算力档' },
      { id: 'o4-mini', d: '推理轻量' },
      { id: 'o1', d: '上代推理' },
      { id: 'gpt-oss-120b', d: '开源 120B' },
      { id: 'gpt-oss-20b', d: '开源 20B' }
    ] },
    { id: 'anthropic', name: 'Anthropic Claude', base: 'https://api.anthropic.com', format: 'anthropic', def: 'claude-sonnet-5-5', models: [
      { id: 'claude-fable-5-1', d: '最强公开档 · 1M · 长程 agent' },
      { id: 'claude-opus-5-5', d: 'Opus 旗舰 · 1M · 常开思考' },
      { id: 'claude-sonnet-5-5', d: '均衡档 · 1M（推荐）' },
      { id: 'claude-haiku-5-5', d: '高速低成本 · 1M' },
      { id: 'claude-fable-5', d: '上代 Fable · 1M' },
      { id: 'claude-opus-5', d: '上代 Opus · 1M' },
      { id: 'claude-opus-4-8', d: 'Opus 4.8 · 1M' },
      { id: 'claude-opus-4-7', d: 'Opus 4.7 · 1M' },
      { id: 'claude-opus-4-6', d: 'Opus 4.6 · 1M' },
      { id: 'claude-sonnet-5', d: '上代 Sonnet · 1M' },
      { id: 'claude-sonnet-4-6', d: 'Sonnet 4.6 · 1M' },
      { id: 'claude-haiku-4-5', d: 'Haiku 4.5 · 200K' },
      { id: 'claude-opus-4-5', d: '遗留 Opus 4.5' },
      { id: 'claude-sonnet-4-5', d: '遗留 Sonnet 4.5' }
    ] },
    { id: 'gemini', name: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', format: 'openai', bridge: true, def: 'gemini-3.8-flash', models: [
      { id: 'gemini-3.8-flash', d: '当前稳定主力 · 1M（推荐）' },
      { id: 'gemini-3.7-flash', d: '3.7 代 Flash · 1M' },
      { id: 'gemini-3.5-flash', d: '3.5 代 Flash · 1M' },
      { id: 'gemini-3.5-flash-lite', d: '3.5 代极速轻量' },
      { id: 'gemini-3.1-pro-preview', d: '3.1 Pro 预览 · 1M' },
      { id: 'gemini-3-pro-preview', d: '3 Pro 预览 · 2M' },
      { id: 'gemini-3-flash-preview', d: '3 Flash 预览' },
      { id: 'gemini-3.1-flash-lite', d: '3.1 代极速轻量' },
      { id: 'gemini-2.5-pro', d: '遗留 · 2026-12-01 起自动路由到 3.8-flash' },
      { id: 'gemini-2.5-flash', d: '遗留 Flash · 1M' },
      { id: 'gemini-2.5-flash-lite', d: '遗留极速轻量' },
      { id: 'gemini-4-carbon', d: 'Gemini 4 预览 · 旗舰' },
      { id: 'gemini-4-argon', d: 'Gemini 4 预览 · 均衡' },
      { id: 'gemini-4-hydrogen', d: 'Gemini 4 预览 · 轻量' }
    ] }
  ];
  // 已下线（或即将下线）旧模型名 → 迁移目标；加载旧配置时自动替换并提示
  var RETIRED_MODELS = {
    'deepseek-chat': 'deepseek-flash',
    'deepseek-reasoner': 'deepseek-flash',
    'kimi-latest': 'kimi-k3',
    'moonshot-v1-8k': 'kimi-k3',
    'moonshot-v1-32k': 'kimi-k3',
    'moonshot-v1-128k': 'kimi-k3',
    'moonshot-v1-auto': 'kimi-k3',
    'claude-opus-4-1': 'claude-opus-5-5',
    'gemini-3.6-flash': 'gemini-3.8-flash'
  };
  function providerById(id) { for (var i = 0; i < PROVIDERS.length; i++) if (PROVIDERS[i].id === id) return PROVIDERS[i]; return PROVIDERS[0]; }
  function guessProvider(base) {
    for (var i = 1; i < PROVIDERS.length; i++) if (PROVIDERS[i].base && base && base.indexOf(PROVIDERS[i].base.replace(/\/v1$/, '')) === 0) return PROVIDERS[i].id;
    return 'custom';
  }
  function fillModelSuggestions(p) {
    $('#modelSuggestions').innerHTML = p.models.map(function (m) { return '<option value="' + esc(m.id) + '"></option>'; }).join('');
  }
  function modelIds(p) { return p.models.map(function (m) { return m.id; }); }
  // 「默认模型」下拉与抽屉模型下拉共用 #setModel 选项：随厂商目录刷新，保留当前值
  function syncModelSelect(p, current) {
    var sel = $('#setModel'); var ids = modelIds(p);
    sel.innerHTML = ids.map(function (id) { return '<option value="' + esc(id) + '">' + esc(id) + '</option>'; }).join('');
    if (current && ids.indexOf(current) < 0) sel.innerHTML += '<option value="' + esc(current) + '">' + esc(current) + '</option>';
    sel.value = current || p.def || ids[0] || '';
  }
  // ---------- 厂商全量模型清单弹层 ----------
  function renderModelPicker() {
    var p = providerById($('#setApiProvider').value);
    var q = ($('#modelPickerFilter').value || '').trim().toLowerCase();
    $('#modelPickerTitle').textContent = p.name + ' · ' + p.models.length + ' 个模型';
    var list = $('#modelPickerList');
    if (!p.models.length) {
      list.innerHTML = '<div class="model-picker-empty">自定义端点：模型 ID 由你的网关决定，请直接在上方输入框填写。</div>';
    } else {
      var rows = p.models.filter(function (m) { return !q || m.id.toLowerCase().indexOf(q) >= 0 || (m.d || '').toLowerCase().indexOf(q) >= 0; });
      list.innerHTML = rows.length
        ? rows.map(function (m) { return '<button type="button" class="model-picker-row" data-id="' + esc(m.id) + '"><span class="mp-id">' + esc(m.id) + '</span><span class="mp-d">' + esc(m.d || '') + '</span></button>'; }).join('')
        : '<div class="model-picker-empty">没有匹配「' + esc(q) + '」的模型，可清空筛选或直接输入模型 ID。</div>';
    }
    $('#modelPickerFoot').textContent = '目录快照 ' + CATALOG_DATE + ' · 以厂商控制台为准 · 也可在上方输入框手动填写任意模型 ID';
  }
  function openModelPicker() {
    $('#modelPickerFilter').value = '';
    renderModelPicker();
    var pop = $('#modelPicker');
    pop.hidden = false;
    // 下方空间不足时向上翻转，避免清单被视口底边裁切
    var r = pop.parentNode.getBoundingClientRect();
    var h = pop.offsetHeight;
    var below = window.innerHeight - r.bottom;
    pop.classList.toggle('up', below < h + 10 && r.top > below);
    $('#btnModelPick').setAttribute('aria-expanded', 'true');
    setTimeout(function () { $('#modelPickerFilter').focus(); }, 60);
  }
  function closeModelPicker() {
    $('#modelPicker').hidden = true;
    $('#btnModelPick').setAttribute('aria-expanded', 'false');
  }
  $('#btnModelPick').addEventListener('click', function () { if ($('#modelPicker').hidden) openModelPicker(); else closeModelPicker(); });
  $('#modelPickerClose').addEventListener('click', closeModelPicker);
  $('#modelPickerFilter').addEventListener('input', renderModelPicker);
  $('#modelPickerList').addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.model-picker-row') : null;
    if (!b) return;
    var id = b.getAttribute('data-id');
    $('#setApiModel').value = id;
    syncApiConfig();
    closeModelPicker();
    toast('已选模型：' + id, { icon: 'check' });
  });
  document.addEventListener('click', function (e) {
    if ($('#modelPicker').hidden) return;
    if (e.target && e.target.closest && (e.target.closest('#modelPicker') || e.target.closest('#btnModelPick'))) return;
    closeModelPicker();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modelPicker').hidden) closeModelPicker(); });
  function loadApiConfig() {
    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(API_KEY) || '{}') || {}; } catch (e) {}
    var savedModel = cfg.apiModel || 'deepseek-flash';
    var migratedFrom = '';
    if (RETIRED_MODELS[savedModel]) { migratedFrom = savedModel; savedModel = RETIRED_MODELS[savedModel]; cfg.apiModel = savedModel; }
    $('#setApiBase').value = cfg.apiBase || '';
    $('#setApiKey').value = cfg.apiKey || '';
    $('#setApiModel').value = savedModel;
    $('#setApiFormat').value = cfg.apiFormat || 'auto';
    ensureOption($('#setTemplate'), cfg.paperFormat || '高教社杯');
    $('#setTemplate').value = cfg.paperFormat || '高教社杯';
    $('#setApiProvider').innerHTML = PROVIDERS.map(function (p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('');
    var pid = cfg.apiProvider || guessProvider(cfg.apiBase || '');
    $('#setApiProvider').value = pid;
    fillModelSuggestions(providerById(pid));
    syncModelSelect(providerById(pid), savedModel);
    $('#topModelChip').textContent = savedModel;
    window.AVERIS_API_CONFIG = cfg;
    if (migratedFrom) {
      try { localStorage.setItem(API_KEY, JSON.stringify(cfg)); } catch (e) {}
      toast('配置中的模型「' + migratedFrom + '」已下线或即将下线，已迁移为「' + savedModel + '」', { icon: 'info' });
    }
  }
  function syncApiConfig() {
    var out = {
      apiProvider: $('#setApiProvider').value,
      apiBase: $('#setApiBase').value.trim(),
      apiKey: $('#setApiKey').value.trim(),
      apiModel: $('#setApiModel').value.trim() || 'deepseek-flash',
      apiFormat: $('#setApiFormat').value,
      paperFormat: $('#setTemplate').value
    };
    try { localStorage.setItem(API_KEY, JSON.stringify(out)); }
    catch (e) { toast('API 配置保存失败：本机存储不可用或已满（' + e.message + '）', { icon: 'info' }); }
    window.AVERIS_API_CONFIG = out;
    $('#topModelChip').textContent = out.apiModel;
    // 求解配置抽屉的模型与 API 模型保持同一概念：API 侧改模型时同步抽屉（启动时亦对齐）
    if (typeof cfg !== 'undefined' && cfg && cfg.model !== out.apiModel) { cfg.model = out.apiModel; saveCfg(); renderCfgStrip(); }
  }
  $('#setApiProvider').addEventListener('change', function () {
    var p = providerById(this.value);
    if (p.id !== 'custom') {
      $('#setApiBase').value = p.base;
      $('#setApiFormat').value = p.format;
      $('#setApiModel').value = p.def;
      fillModelSuggestions(p);
      syncModelSelect(p, p.def);
      toast('已填入「' + p.name + '」预设：' + p.models.length + ' 个模型可选（点「全部模型」查看），只需粘贴 API Key 即可求解' + (p.bridge ? '。注意：该厂商无原生 Anthropic 端点，工具调用经 OpenAI 转换，可能不稳定；建议优先 Kimi / GLM / DeepSeek / Claude' : ''), { icon: 'check' });
    } else {
      fillModelSuggestions(p);
      syncModelSelect(p, $('#setApiModel').value.trim());
      toast('自定义端点：手动填写 Base URL / 格式 / 模型', { icon: 'info' });
    }
    if (!$('#modelPicker').hidden) renderModelPicker();
    syncApiConfig();
  });
  ['#setApiBase', '#setApiKey', '#setApiModel', '#setApiFormat', '#setTemplate'].forEach(function (sel) {
    $(sel).addEventListener('change', function () { syncApiConfig(); toast('API 配置已保存', { icon: 'check' }); });
  });
  loadApiConfig();

  // ---------- 端点探测：测延迟 / 测缓存命中（主进程发请求，避开浏览器 CORS） ----------
  function probeCfg() {
    return {
      base: $('#setApiBase').value.trim(),
      key: $('#setApiKey').value.trim(),
      model: $('#setApiModel').value.trim(),
      format: $('#setApiFormat').value
    };
  }
  function runProbe(mode) {
    var out = $('#apiProbeResult');
    var b1 = $('#btnProbeLatency'), b2 = $('#btnProbeCache');
    if (!live || typeof window.electronAPI.averisApiProbe !== 'function') {
      out.textContent = '浏览器演示模式无法实测网络：请在 Averis 桌面端使用探测。';
      out.className = 'api-probe-result err'; return;
    }
    var c = probeCfg();
    if (!c.base || !c.key || !c.model) {
      out.textContent = '请先填写 Base URL、API Key 与模型，再探测。';
      out.className = 'api-probe-result err'; return;
    }
    b1.disabled = b2.disabled = true;
    out.className = 'api-probe-result';
    out.textContent = mode === 'latency' ? '正在测延迟（最小请求，max_tokens=1）…' : '正在测缓存命中（连发两次相同长提示，读第二次 usage）…';
    Promise.resolve(window.electronAPI.averisApiProbe(Object.assign({ mode: mode }, c))).then(function (r) {
      r = r || {};
      if (mode === 'latency') {
        out.textContent = r.success
          ? '延迟 ' + r.ms + ' ms · HTTP ' + r.status + ' · 模型 ' + c.model
          : '失败：' + (r.error || '未知错误') + (r.ms ? '（' + r.ms + ' ms）' : '');
      } else if (r.success) {
        if (r.hit == null) {
          out.textContent = '两次请求 ' + r.ms1 + ' / ' + r.ms2 + ' ms；该厂商未返回缓存字段（不支持或未启用上下文缓存）。';
        } else {
          var tot = (r.hit || 0) + (r.miss || 0);
          var pct = tot ? Math.round(r.hit / tot * 1000) / 10 : 0;
          out.textContent = '缓存命中 ' + r.hit + ' tokens / 未命中 ' + (r.miss == null ? '—' : r.miss) + '（命中率 ' + pct + '%）· 两次 ' + r.ms1 + ' / ' + r.ms2 + ' ms';
        }
      } else {
        out.textContent = '失败：' + (r.error || '未知错误');
      }
      out.className = 'api-probe-result ' + (r.success ? 'ok' : 'err');
    }).catch(function (e) {
      out.textContent = '探测异常：' + ((e && e.message) || e);
      out.className = 'api-probe-result err';
    }).then(function () { b1.disabled = b2.disabled = false; });
  }
  $('#btnProbeLatency').addEventListener('click', function () { runProbe('latency'); });
  $('#btnProbeCache').addEventListener('click', function () { runProbe('cache'); });

  // ---------- 面板收缩（会话栏 / 产出栏） ----------
  var live = !!(window.electronAPI && typeof window.electronAPI.launchTask === 'function');
  $('#topDemoBadge').hidden = live;   // 浏览器直开 = 演示模式；exe 内真实求解不挂演示牌
  var PANEL_KEY = 'averis.panels.v2';   // v2：旧键里混入过窄屏自动收起的状态，弃用一次
  var panelState = { sessions: true, output: true };
  try {
    var ps = JSON.parse(localStorage.getItem(PANEL_KEY) || '{}');
    if (typeof ps.sessions === 'boolean') panelState.sessions = ps.sessions;
    if (typeof ps.output === 'boolean') panelState.output = ps.output;
  } catch (e) {}

  function applyPanels(persist) {
    var wb = $('#view-workbench');
    wb.classList.toggle('sessions-collapsed', !panelState.sessions);
    wb.classList.toggle('output-collapsed', !panelState.output);
    var sp = $('#sessionPanel'), op = $('#outputPanel');
    sp.toggleAttribute('inert', !panelState.sessions);
    op.toggleAttribute('inert', !panelState.output);
    $('#btnToggleSessions').setAttribute('aria-pressed', String(panelState.sessions));
    $('#btnToggleOutput').setAttribute('aria-pressed', String(panelState.output));
    $('#btnToggleSessions').title = panelState.sessions ? '收起会话栏（Ctrl+B）' : '展开会话栏（Ctrl+B）';
    $('#btnToggleOutput').title = panelState.output ? '收起产出栏（Ctrl+J）' : '展开产出栏（Ctrl+J）';
    var badge = $('#outputBadge');
    badge.hidden = panelState.output || !Number($('#outputCount').textContent);
    if (persist !== false) { try { localStorage.setItem(PANEL_KEY, JSON.stringify(panelState)); } catch (e) {} }
  }
  function togglePanel(which) {
    panelState[which] = !panelState[which];
    applyPanels();
    toast(which === 'sessions'
      ? (panelState.sessions ? '会话栏已展开' : '会话栏已收起（Ctrl+B 恢复）')
      : (panelState.output ? '产出栏已展开' : '产出栏已收起（Ctrl+J 恢复）'), { icon: 'info' });
  }
  $('#btnToggleSessions').addEventListener('click', function () { togglePanel('sessions'); });
  $('#btnCollapseSessions').addEventListener('click', function () { togglePanel('sessions'); });
  $('#btnToggleOutput').addEventListener('click', function () { togglePanel('output'); });
  $('#btnCollapseOutput').addEventListener('click', function () { togglePanel('output'); });
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    if (!$('#view-workbench').classList.contains('active')) return;
    var k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); togglePanel('sessions'); }
    else if (k === 'j') { e.preventDefault(); togglePanel('output'); }
  });
  applyPanels();

  // 窄屏（≤1180px）：产出栏变为右侧浮层，进入窄屏自动收起、回到宽屏自动恢复，
  // 顶栏「产出」开关始终可见，保证任何宽度下产出文件都可达。
  var narrowMq = window.matchMedia('(max-width:1180px)');
  var autoCollapsedOutput = false;
  function syncNarrow(mq) {
    if (mq.matches) {
      if (panelState.output) { panelState.output = false; autoCollapsedOutput = true; applyPanels(false); }
    } else if (autoCollapsedOutput) {
      autoCollapsedOutput = false; panelState.output = true; applyPanels(false);
    }
  }
  if (typeof narrowMq.addEventListener === 'function') narrowMq.addEventListener('change', syncNarrow);
  else narrowMq.addListener(syncNarrow);
  syncNarrow(narrowMq);

  // ---------- 求解配置 ----------
  var CFG_KEY = 'averis.solve.config';
  var CFG_DEFAULT = { template: '自动识别', group: '本科组', lang: '中文', team: '', model: '', outDir: '', envCheck: true, autoOpen: false };
  var cfg = Object.assign({}, CFG_DEFAULT);
  try {
    var saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    Object.keys(CFG_DEFAULT).forEach(function (k) { if (saved[k] !== undefined && saved[k] !== null) cfg[k] = saved[k]; });
  } catch (e) {}
  if (!cfg.model) cfg.model = (window.AVERIS_API_CONFIG && window.AVERIS_API_CONFIG.apiModel) || $('#setModel').value || 'deepseek-flash';
  var templateNames = ['自动识别'];
  try {
    templateNames = templateNames.concat(Array.prototype.slice.call($('#setTemplate').options).map(function (o) { return o.value; }).filter(function (v) { return v && v !== '自动识别'; }));
  } catch (e) {}

  function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }

  function baseName(p) { return String(p || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p; }

  function renderCfgStrip() {
    var items = [
      { icon: 'file', label: '模板', value: cfg.template },
      { icon: 'users', label: '组别', value: cfg.group },
      { icon: 'globe', label: '语言', value: cfg.lang },
      { icon: 'hash', label: '队伍号', value: cfg.team || '未填写', missing: !cfg.team },
      { icon: 'cpu', label: '模型', value: cfg.model, cls: 'hide-sm' },
      { icon: 'folder', label: '输出', value: cfg.outDir ? baseName(cfg.outDir) : '默认目录', cls: 'hide-sm' }
    ];
    $('#configStrip').innerHTML = '<span class="strip-lead">' + svg('sliders', 13) + ' 求解配置</span>' +
      items.map(function (it) {
        return '<button type="button" class="cfg-chip' + (it.missing ? ' missing' : '') + (it.cls ? ' ' + it.cls : '') + '" title="' + esc(it.label + '：' + it.value + '（点击修改）') + '">' +
          svg(it.icon, 12) + '<span>' + esc(it.label) + '</span><b>' + esc(it.value) + '</b></button>';
      }).join('');
    $$('#configStrip .cfg-chip').forEach(function (chip) { chip.addEventListener('click', openCfg); });
  }

  function collectModels() {
    var set = [];
    Array.prototype.slice.call($('#setModel').options).forEach(function (o) { if (o.value && set.indexOf(o.value) < 0) set.push(o.value); });
    var cur = (window.AVERIS_API_CONFIG && window.AVERIS_API_CONFIG.apiModel) || '';
    if (cur && set.indexOf(cur) < 0) set.unshift(cur);
    if (cfg.model && set.indexOf(cfg.model) < 0) set.unshift(cfg.model);
    return set;
  }

  function segSet(sel, val) {
    $$(sel + ' button').forEach(function (b) {
      var on = b.dataset.val === val;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  }

  function fillCfgControls() {
    var tsel = $('#cfgTemplate');
    tsel.innerHTML = templateNames.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
    if (templateNames.indexOf(cfg.template) < 0) { templateNames.push(cfg.template); tsel.innerHTML += '<option value="' + esc(cfg.template) + '">' + esc(cfg.template) + '</option>'; }
    tsel.value = cfg.template;
    segSet('#cfgGroup', cfg.group);
    segSet('#cfgLang', cfg.lang);
    $('#cfgTeam').value = cfg.team;
    var msel = $('#cfgModel');
    msel.innerHTML = collectModels().map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
    msel.value = cfg.model;
    $('#cfgOutDir').value = cfg.outDir;
    $('#cfgEnvCheck').setAttribute('aria-checked', String(cfg.envCheck));
    $('#cfgAutoOpen').setAttribute('aria-checked', String(cfg.autoOpen));
    $('#cfgLiveBadge').hidden = !live;
  }

  function openCfg() {
    fillCfgControls();
    $('#cfgDrawer').classList.add('open');
    $('#cfgDrawer').removeAttribute('inert');
    $('#cfgDrawer').setAttribute('aria-hidden', 'false');
    $('#cfgScrim').classList.add('open');
    $('#btnSolveConfig').setAttribute('aria-expanded', 'true');
    setTimeout(function () { $('#cfgTemplate').focus(); }, 120);
  }
  function closeCfg() {
    $('#cfgDrawer').classList.remove('open');
    $('#cfgDrawer').setAttribute('inert', '');
    $('#cfgDrawer').setAttribute('aria-hidden', 'true');
    $('#cfgScrim').classList.remove('open');
    $('#btnSolveConfig').setAttribute('aria-expanded', 'false');
    $('#btnSolveConfig').focus();
  }
  $('#btnSolveConfig').addEventListener('click', function () {
    if ($('#cfgDrawer').classList.contains('open')) closeCfg(); else openCfg();
  });
  $('#btnCfgClose').addEventListener('click', closeCfg);
  $('#btnCfgDone').addEventListener('click', function () { closeCfg(); toast('求解配置已保存，将随下一次求解生效', { icon: 'check' }); });
  $('#cfgScrim').addEventListener('click', closeCfg);
  // 统一 Esc 栈：全屏预览 → 窄屏预览浮层 → 求解配置抽屉（逐层关闭，不互相穿透）
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#edFull').hidden) { e.preventDefault(); edCloseFull(); return; }
    if ($('#view-editor').classList.contains('preview-open')) { e.preventDefault(); $('#view-editor').classList.remove('preview-open'); return; }
    if ($('#cfgDrawer').classList.contains('open')) closeCfg();
  });
  $('#cfgDrawer').setAttribute('inert', '');

  function applyTemplateLive(name) {
    if (!live || name === '自动识别') return;
    try {
      Promise.resolve(window.electronAPI.switchProject(name)).catch(function () {});
    } catch (e) {}
  }

  $('#cfgTemplate').addEventListener('change', function () {
    cfg.template = this.value; saveCfg(); renderCfgStrip();
    ensureOption($('#setTemplate'), this.value);
    $('#setTemplate').value = this.value; syncApiConfig();
    applyTemplateLive(this.value);
    toast('赛题模板：' + this.value, { icon: 'file' });
  });
  $$('#cfgGroup button').forEach(function (b) {
    b.addEventListener('click', function () { cfg.group = b.dataset.val; saveCfg(); segSet('#cfgGroup', cfg.group); renderCfgStrip(); });
  });
  $$('#cfgLang button').forEach(function (b) {
    b.addEventListener('click', function () { cfg.lang = b.dataset.val; saveCfg(); segSet('#cfgLang', cfg.lang); renderCfgStrip(); });
  });
  $('#cfgTeam').addEventListener('input', function () {
    cfg.team = this.value.trim(); saveCfg(); renderCfgStrip();
  });
  $('#cfgModel').addEventListener('change', function () {
    cfg.model = this.value; saveCfg(); renderCfgStrip();
    ensureOption($('#setApiModel'), this.value); ensureOption($('#setModel'), this.value);
    $('#setApiModel').value = this.value; $('#setModel').value = this.value; syncApiConfig();
    toast('求解模型：' + this.value, { icon: 'cpu' });
  });

  function showOutDir(r) {
    if (r && r.defaultRoot) {
      $('#cfgOutDir').placeholder = r.defaultRoot;
      $('#cfgDirHelp').textContent = '默认：' + r.defaultRoot + '（求解产出的保存位置，任务运行中不可切换）';
    }
    if (r && r.activeRoot && !cfg.outDir) { cfg.outDir = r.activeRoot; saveCfg(); }
    $('#cfgOutDir').value = cfg.outDir;
    renderCfgStrip();
  }
  function applyOutDir(p) {
    if (!live) { cfg.outDir = p; saveCfg(); $('#cfgOutDir').value = p; renderCfgStrip(); toast('论文生成路径：' + (p || '默认目录'), { icon: 'folder' }); return; }
    Promise.resolve(window.electronAPI.setSolveOutputRoot(p)).then(function (r) {
      if (r && r.success) {
        cfg.outDir = r.activeRoot || p; saveCfg();
        $('#cfgOutDir').value = cfg.outDir; showOutDir(r);
        toast('论文生成路径：' + cfg.outDir, { icon: 'folder' });
      } else {
        toast((r && r.error) || '设置保存位置失败', { icon: 'info' });
        $('#cfgOutDir').value = cfg.outDir;
      }
    }).catch(function (e) { toast('设置保存位置失败：' + e.message, { icon: 'info' }); });
  }
  $('#btnPickDir').addEventListener('click', function () {
    if (!live) { toast('浏览器演示模式：在桌面端可直接选择目录', { icon: 'info' }); return; }
    Promise.resolve(window.electronAPI.openFolderDialog({ title: '选择论文生成目录' })).then(function (paths) {
      if (paths && paths.length) applyOutDir(paths[0]);
    }).catch(function () {});
  });
  $('#btnResetDir').addEventListener('click', function () {
    if (!live) { cfg.outDir = ''; saveCfg(); $('#cfgOutDir').value = ''; renderCfgStrip(); toast('已恢复默认输出目录', { icon: 'check' }); return; }
    Promise.resolve(window.electronAPI.resetSolveOutputRoot()).then(function (r) {
      if (r && r.success) {
        cfg.outDir = r.activeRoot || r.defaultRoot || ''; saveCfg();
        $('#cfgOutDir').value = cfg.outDir; showOutDir(r);
        toast('已恢复默认输出目录', { icon: 'check' });
      } else toast((r && r.error) || '恢复默认失败', { icon: 'info' });
    }).catch(function (e) { toast('恢复默认失败：' + e.message, { icon: 'info' }); });
  });
  $('#cfgOutDir').addEventListener('change', function () {
    var v = this.value.trim();
    if (v) applyOutDir(v);
  });
  $('#cfgEnvCheck').addEventListener('click', function () {
    cfg.envCheck = !cfg.envCheck; saveCfg();
    this.setAttribute('aria-checked', String(cfg.envCheck));
  });
  $('#cfgAutoOpen').addEventListener('click', function () {
    cfg.autoOpen = !cfg.autoOpen; saveCfg();
    this.setAttribute('aria-checked', String(cfg.autoOpen));
  });
  $('#btnCfgReset').addEventListener('click', function () {
    cfg = Object.assign({}, CFG_DEFAULT, { model: (window.AVERIS_API_CONFIG && window.AVERIS_API_CONFIG.apiModel) || 'deepseek-flash' });
    saveCfg(); fillCfgControls(); renderCfgStrip();
    // 恢复默认后同步「偏好设置」两个 select + API 配置，避免抽屉与设置页显示不一致
    ensureOption($('#setTemplate'), cfg.template); $('#setTemplate').value = cfg.template;
    ensureOption($('#setModel'), cfg.model); $('#setModel').value = cfg.model;
    ensureOption($('#setApiModel'), cfg.model); $('#setApiModel').value = cfg.model;
    $('#topModelChip').textContent = cfg.model;
    syncApiConfig();
    if (live) { try { Promise.resolve(window.electronAPI.resetSolveOutputRoot()).then(showOutDir).catch(function () {}); } catch (e) {} }
    toast('求解配置已恢复默认', { icon: 'check' });
  });

  // 启动时与内核对齐：论文模板全量列表 / 模板列表 / 输出目录 / 持久化模型与模板
  function syncPaperFormatOptions(list) {
    var sel = $('#setTemplate'); if (!sel) return;
    var cur = sel.value || cfg.paperFormat || '高教社杯';
    var names = ['自动识别'];
    list.forEach(function (f) {
      var v = f && (f.value || f.name); if (typeof v !== 'string' || !v || v === '自动识别') return;
      if (names.indexOf(v) < 0) names.push(v);
    });
    if (cur && cur !== '自动识别' && names.indexOf(cur) < 0) names.push(cur);
    sel.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
    sel.value = cur;
  }
  if (live) {
    try {
      Promise.resolve(window.electronAPI.listPaperFormats()).then(function (r) {
        var fmts = (r && r.formats) || [];
        if (Array.isArray(fmts) && fmts.length) syncPaperFormatOptions(fmts);
      }).catch(function () {});
    } catch (e) {}
    try {
      Promise.resolve(window.electronAPI.listTemplates()).then(function (r) {
        var list = (r && r.templates) || r || [];
        if (Array.isArray(list) && list.length) {
          templateNames = ['自动识别'].concat(list.map(function (t) { return (t && t.name) || t; }).filter(function (v) { return typeof v === 'string' && v && v !== '自动识别'; }));
          if (cfg.template !== '自动识别' && templateNames.indexOf(cfg.template) >= 0) applyTemplateLive(cfg.template);
          fillCfgControls(); renderCfgStrip();
        }
      }).catch(function () {});
      Promise.resolve(window.electronAPI.getSolveOutputConfig()).then(function (r) {
        if (r && r.success) showOutDir(r);
      }).catch(function () {});
    } catch (e) {}
    // 单一事实源 = API 配置（launchTask 实际用的就是它）。抽屉模型只向 API 配置对齐，
    //   绝不反向覆盖：否则用户在 API 面板选好的自定义模型会被抽屉里的旧值悄悄改掉。
    var apiModel = window.AVERIS_API_CONFIG && window.AVERIS_API_CONFIG.apiModel;
    if (apiModel && cfg.model !== apiModel) {
      cfg.model = apiModel;
      ensureOption($('#setModel'), apiModel);
      saveCfg(); fillCfgControls(); renderCfgStrip();
    }
  }
  renderCfgStrip();

  // 求解前环境自检（可在配置中关闭）
  function preflight() {
    if (!cfg.envCheck || !live || typeof window.electronAPI.checkEnvironment !== 'function') return Promise.resolve(true);
    return Promise.resolve(window.electronAPI.checkEnvironment()).then(function (r) {
      var res = (r && r.results) || {};
      var bad = ['python', 'latex', 'pandoc'].filter(function (k) { return res[k] && res[k].ok === false; });
      if (bad.length) {
        toast('环境自检未通过：' + bad.join(' / ') + '，请先修复环境或在求解配置中关闭自检', { icon: 'info' });
        return false;
      }
      return true;
    }).catch(function () { return true; });
  }

  // ---------- 环境自检 ----------
  var env = bridge.environment();
  if (env && typeof env.then === 'function') {
    env.then(function (r) {
      var res = (r && r.results) || {};
      console.info('[Averis] 环境：', (res.python || {}).version || '', '|', (res.latex || {}).version || '', '|', (res.pandoc || {}).version || '');
    }).catch(function () {});
  } else if (env) {
    console.info('[Averis] 内置环境：', env.python, '|', env.latex, '|', env.pandoc);
  }

  // 只读调试口：供 CDP 自动化断言内部状态（无行为副作用）
  window.__averisDebug = {
    get edActive() { return edActive; }, get edDirty() { return edDirty; },
    get edOpenSeq() { return edOpenSeq; }, get edProject() { return edProject; },
    get edNodes() { return edNodes; }, get running() { return running; },
    get pending() { return pending; }, get stopping() { return stopping; },
    edOpen: edOpen, edSave: edSave, edRefreshTree: edRefreshTree, send: function (t) { return send(t, true); }, toast: toast
  };
})();