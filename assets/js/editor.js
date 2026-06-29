// 网页日记编辑器：写完点“发布”，通过 GitHub API 直接提交到仓库，
// GitHub Pages 会自动更新公开网站。无需任何后端服务器。
(function () {
  var CFG_KEY = 'diary-config';
  var DRAFT_KEY = 'diary-draft';
  var $ = function (s) { return document.querySelector(s); };

  var repoEl = $('#cfg-repo'), branchEl = $('#cfg-branch'), tokenEl = $('#cfg-token');
  var saveCfgBtn = $('#save-cfg'), cfgStatus = $('#cfg-status'), cfgBadge = $('#cfg-badge');
  var titleEl = $('#f-title'), dateEl = $('#f-date'), bodyEl = $('#f-body');
  var previewEl = $('#preview'), publishBtn = $('#publish'), draftBtn = $('#save-draft');
  var statusEl = $('#status'), yearEl = $('#year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.marked && marked.setOptions) marked.setOptions({ breaks: true, gfm: true });

  // 载入已保存的设置
  var cfg = load(CFG_KEY) || {};
  repoEl.value = cfg.repo || '';
  branchEl.value = cfg.branch || 'main';
  tokenEl.value = cfg.token || '';
  reflectBadge();

  // 默认日期 = 今天
  dateEl.value = todayStr();

  // 恢复草稿
  var draft = load(DRAFT_KEY);
  if (draft) {
    titleEl.value = draft.title || '';
    if (draft.date) dateEl.value = draft.date;
    bodyEl.value = draft.body || '';
  }
  renderPreview();

  // 事件
  bodyEl.addEventListener('input', function () { renderPreview(); saveDraft(); });
  titleEl.addEventListener('input', saveDraft);
  dateEl.addEventListener('input', saveDraft);
  draftBtn.addEventListener('click', function () { saveDraft(); setStatus('草稿已保存到本机浏览器。', 'ok'); });
  saveCfgBtn.addEventListener('click', saveConfig);
  publishBtn.addEventListener('click', publish);

  // ---- 设置 ----
  async function saveConfig() {
    var c = { repo: repoEl.value.trim(), branch: (branchEl.value.trim() || 'main'), token: tokenEl.value.trim() };
    save(CFG_KEY, c);
    reflectBadge();
    if (!c.repo || !c.token) { cfgStatus.textContent = '已保存，但仓库或令牌为空'; return; }
    cfgStatus.textContent = '正在验证…';
    try {
      var parts = c.repo.split('/');
      var r = await fetch(api('/repos/' + parts[0] + '/' + parts[1]), { headers: headers(c.token) });
      if (!r.ok) throw new Error(await msg(r));
      cfgStatus.textContent = '验证成功 ✓ 可以开始写了';
    } catch (e) {
      cfgStatus.textContent = '验证失败：' + e.message;
    }
  }

  function reflectBadge() {
    var c = load(CFG_KEY) || {};
    cfgBadge.textContent = (c.repo && c.token) ? '已配置 ✓' : '未配置';
  }

  // ---- 预览 / 草稿 ----
  function renderPreview() {
    previewEl.innerHTML = window.marked ? marked.parse(bodyEl.value || '') : '';
  }
  function saveDraft() {
    save(DRAFT_KEY, { title: titleEl.value, date: dateEl.value, body: bodyEl.value });
  }

  // ---- 发布 ----
  async function publish() {
    var c = load(CFG_KEY) || {};
    if (!c.repo || !c.token) { setStatus('请先在上方“设置”里填写仓库和令牌。', 'err'); openConfig(); return; }
    if (!/^[^/\s]+\/[^/\s]+$/.test(c.repo)) { setStatus('仓库格式应为 用户名/仓库名，例如 alice/alice.github.io', 'err'); return; }

    var title = titleEl.value.trim();
    var body = bodyEl.value.trim();
    var date = dateEl.value || todayStr();
    if (!title) { setStatus('请填写标题。', 'err'); return; }
    if (!body) { setStatus('正文是空的哦。', 'err'); return; }

    var parts = c.repo.split('/'), owner = parts[0], repo = parts[1], branch = c.branch || 'main';
    publishBtn.disabled = true;
    try {
      setStatus('正在确定文件名…', '');
      var path = await uniquePath(owner, repo, branch, c.token, date, slugify(title));
      var md = '---\ntitle: ' + title + '\ndate: ' + date + '\n---\n\n' + body + '\n';

      setStatus('正在保存日记…', '');
      await putFile(owner, repo, branch, c.token, path, md, '写日记: ' + title);

      setStatus('正在更新列表…', '');
      var file = path.split('/').pop();
      await updateManifest(owner, repo, branch, c.token, { file: file, title: title, date: date, summary: summarize(body) });

      // 成功，清空草稿与输入框
      localStorage.removeItem(DRAFT_KEY);
      titleEl.value = ''; bodyEl.value = ''; dateEl.value = todayStr();
      renderPreview();

      var site = siteUrl(owner, repo);
      var link = site + 'post.html?p=' + encodeURIComponent(file);
      setStatus('发布成功 🎉 GitHub Pages 约 1 分钟后更新。<br>' +
        '<a href="' + link + '" target="_blank" rel="noopener">查看这篇日记</a> · ' +
        '<a href="' + site + '" target="_blank" rel="noopener">打开网站首页</a>', 'ok', true);
    } catch (e) {
      setStatus('发布失败：' + (e && e.message ? e.message : e), 'err');
    } finally {
      publishBtn.disabled = false;
    }
  }

  // ---- GitHub API ----
  function api(p) { return 'https://api.github.com' + p; }
  function headers(token) {
    return { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  async function getFile(owner, repo, branch, token, path) {
    var url = api('/repos/' + owner + '/' + repo + '/contents/' + encPath(path) + '?ref=' + encodeURIComponent(branch));
    var r = await fetch(url, { headers: headers(token), cache: 'no-cache' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(await msg(r));
    return r.json();
  }

  async function putFile(owner, repo, branch, token, path, content, message, sha) {
    var body = { message: message, content: b64encode(content), branch: branch };
    if (sha) body.sha = sha;
    var url = api('/repos/' + owner + '/' + repo + '/contents/' + encPath(path));
    var r = await fetch(url, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(token)),
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await msg(r));
    return r.json();
  }

  async function uniquePath(owner, repo, branch, token, date, slug) {
    var base = 'posts/' + date + '-' + slug, path = base + '.md', i = 2;
    while (await getFile(owner, repo, branch, token, path)) { path = base + '-' + i + '.md'; i++; }
    return path;
  }

  async function updateManifest(owner, repo, branch, token, entry) {
    var existing = await getFile(owner, repo, branch, token, 'posts/posts.json');
    var data = { posts: [] }, sha;
    if (existing) {
      sha = existing.sha;
      try { data = JSON.parse(b64decode(existing.content)); } catch (e) {}
      if (!data.posts) data.posts = [];
    }
    data.posts = data.posts.filter(function (p) { return p.file !== entry.file; });
    data.posts.unshift(entry);
    data.posts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    await putFile(owner, repo, branch, token, 'posts/posts.json',
      JSON.stringify(data, null, 2) + '\n', '更新日记列表: ' + entry.title, sha);
  }

  async function msg(r) {
    var extra = r.status === 401 ? '（令牌无效或已过期）'
      : r.status === 403 ? '（无权限，请确认令牌对该仓库有 Contents 读写权限）'
      : r.status === 404 ? '（仓库或分支不存在，请检查仓库名/分支）' : '';
    try { var j = await r.json(); return (j.message || (r.status + ' ' + r.statusText)) + extra; }
    catch (e) { return r.status + ' ' + r.statusText + extra; }
  }

  // ---- 工具 ----
  function siteUrl(owner, repo) {
    if (/\.github\.io$/i.test(repo)) return 'https://' + repo.toLowerCase() + '/';
    return 'https://' + owner.toLowerCase() + '.github.io/' + repo + '/';
  }
  function slugify(t) {
    var s = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'post';
  }
  function summarize(body, limit) {
    limit = limit || 70;
    var paras = body.trim().split(/\n\s*\n/);
    for (var i = 0; i < paras.length; i++) {
      var t = paras[i].replace(/[#>*`_\[\]()!~-]/g, '').replace(/\s+/g, ' ').trim();
      if (t) return t.slice(0, limit) + (t.length > limit ? '…' : '');
    }
    return '';
  }
  function todayStr() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function openConfig() { var c = document.getElementById('config'); if (c) c.open = true; }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function setStatus(text, type, isHtml) {
    statusEl.className = 'status ' + (type || '');
    if (isHtml) statusEl.innerHTML = text; else statusEl.textContent = text;
  }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob((b64 || '').replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
})();
