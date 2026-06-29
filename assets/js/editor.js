// 网页日记编辑器：新建 / 编辑 / 删除 / 插入图片，
// 全部通过 GitHub API 直接提交到仓库，GitHub Pages 自动更新。无需后端。
(function () {
  var CFG_KEY = 'diary-config';
  var DRAFT_KEY = 'diary-draft';
  var $ = function (s) { return document.querySelector(s); };

  var repoEl = $('#cfg-repo'), branchEl = $('#cfg-branch'), tokenEl = $('#cfg-token');
  var saveCfgBtn = $('#save-cfg'), cfgStatus = $('#cfg-status'), cfgBadge = $('#cfg-badge');
  var titleEl = $('#f-title'), dateEl = $('#f-date'), bodyEl = $('#f-body');
  var previewEl = $('#preview'), publishBtn = $('#publish'), draftBtn = $('#save-draft'), statusEl = $('#status');
  var pickerEl = $('#entry-picker'), deleteBtn = $('#delete-entry');
  var imgBtn = $('#insert-image'), imgInput = $('#image-file');
  var yearEl = $('#year');

  var editingFile = null; // null = 新建；否则 = 正在编辑的文件名

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.marked && marked.setOptions) marked.setOptions({ breaks: true, gfm: true });

  var cfg = load(CFG_KEY) || {};
  repoEl.value = cfg.repo || '';
  branchEl.value = cfg.branch || 'main';
  tokenEl.value = cfg.token || '';
  reflectBadge();

  dateEl.value = todayStr();
  var draft = load(DRAFT_KEY);
  if (draft) { titleEl.value = draft.title || ''; if (draft.date) dateEl.value = draft.date; bodyEl.value = draft.body || ''; }
  renderPreview();
  populatePicker();

  bodyEl.addEventListener('input', function () { renderPreview(); if (!editingFile) saveDraft(); });
  titleEl.addEventListener('input', function () { if (!editingFile) saveDraft(); });
  dateEl.addEventListener('input', function () { if (!editingFile) saveDraft(); });
  draftBtn.addEventListener('click', function () { saveDraft(); setStatus('草稿已保存到本机浏览器。', 'ok'); });
  saveCfgBtn.addEventListener('click', saveConfig);
  publishBtn.addEventListener('click', publish);
  if (deleteBtn) deleteBtn.addEventListener('click', deleteEntry);
  if (pickerEl) pickerEl.addEventListener('change', onPick);
  if (imgBtn && imgInput) {
    imgBtn.addEventListener('click', function () { imgInput.click(); });
    imgInput.addEventListener('change', function () { if (imgInput.files[0]) handleImage(imgInput.files[0]); imgInput.value = ''; });
  }
  bodyEl.addEventListener('dragover', function (e) { e.preventDefault(); });
  bodyEl.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) { e.preventDefault(); handleImage(f); }
  });

  // ===== 设置 =====
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
      cfgStatus.textContent = '验证成功 ✓';
      populatePicker();
    } catch (e) {
      cfgStatus.textContent = '验证失败：' + e.message;
    }
  }

  function reflectBadge() {
    var c = load(CFG_KEY) || {};
    cfgBadge.textContent = (c.repo && c.token) ? '已配置 ✓' : '未配置';
  }

  // ===== 选择 / 载入已有日记 =====
  function populatePicker() {
    if (!pickerEl) return;
    fetch('posts/posts.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { posts: [] }; })
      .then(function (data) {
        var posts = (data.posts || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
        var cur = pickerEl.value;
        pickerEl.innerHTML = '<option value="">✏️ 写新日记</option>' + posts.map(function (p) {
          return '<option value="' + escapeHtml(p.file) + '">' + escapeHtml((p.date || '') + '  ' + (p.title || p.file)) + '</option>';
        }).join('');
        if (cur) pickerEl.value = cur;
      })
      .catch(function () {});
  }

  function onPick() {
    var file = pickerEl.value;
    if (!file) { newEntry(); return; }
    setStatus('正在载入…', '');
    fetch('posts/' + file, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('打不开'); return r.text(); })
      .then(function (text) {
        var p = parseFrontMatter(text);
        titleEl.value = p.meta.title || '';
        dateEl.value = p.meta.date || todayStr();
        bodyEl.value = p.body.replace(/^\n+/, '');
        editingFile = file;
        setEditMode(true);
        renderPreview();
        setStatus('正在编辑：' + file + '（改完点“更新”保存）', 'ok');
      })
      .catch(function () { setStatus('载入失败，可能这篇还没同步到线上。', 'err'); });
  }

  function newEntry() {
    editingFile = null;
    setEditMode(false);
    titleEl.value = ''; bodyEl.value = ''; dateEl.value = todayStr();
    if (pickerEl) pickerEl.value = '';
    var d = load(DRAFT_KEY);
    if (d) { titleEl.value = d.title || ''; if (d.date) dateEl.value = d.date; bodyEl.value = d.body || ''; }
    renderPreview();
    setStatus('', '');
  }

  function setEditMode(on) {
    publishBtn.textContent = on ? '更新' : '发布';
    if (deleteBtn) deleteBtn.hidden = !on;
  }

  // ===== 预览 / 草稿 =====
  function renderPreview() { previewEl.innerHTML = window.marked ? marked.parse(bodyEl.value || '') : ''; }
  function saveDraft() { save(DRAFT_KEY, { title: titleEl.value, date: dateEl.value, body: bodyEl.value }); }

  // ===== 发布（新建 or 更新）=====
  async function publish() {
    var c = load(CFG_KEY) || {};
    if (!c.repo || !c.token) { setStatus('请先在“设置”里填写仓库和令牌。', 'err'); openConfig(); return; }
    if (!/^[^/\s]+\/[^/\s]+$/.test(c.repo)) { setStatus('仓库格式应为 用户名/仓库名。', 'err'); return; }
    var title = titleEl.value.trim(), body = bodyEl.value.trim(), date = dateEl.value || todayStr();
    if (!title) { setStatus('请填写标题。', 'err'); return; }
    if (!body) { setStatus('正文是空的哦。', 'err'); return; }

    var parts = c.repo.split('/'), owner = parts[0], repo = parts[1], branch = c.branch || 'main';
    var updating = !!editingFile;
    publishBtn.disabled = true;
    try {
      var md = '---\ntitle: ' + title + '\ndate: ' + date + '\n---\n\n' + body + '\n';
      var path, file;
      if (updating) {
        path = 'posts/' + editingFile; file = editingFile;
        setStatus('正在更新…', '');
        var ex = await getFile(owner, repo, branch, c.token, path);
        await putFile(owner, repo, branch, c.token, path, md, '更新日记: ' + title, ex && ex.sha);
      } else {
        setStatus('正在保存…', '');
        path = await uniquePath(owner, repo, branch, c.token, date, slugify(title));
        file = path.split('/').pop();
        await putFile(owner, repo, branch, c.token, path, md, '写日记: ' + title);
      }
      setStatus('正在更新列表…', '');
      await updateManifest(owner, repo, branch, c.token, { file: file, title: title, date: date, summary: summarize(body) });

      if (!updating) localStorage.removeItem(DRAFT_KEY);
      editingFile = file; setEditMode(true); populatePicker();
      if (pickerEl) pickerEl.value = file;

      var site = siteUrl(owner, repo), link = site + 'post.html?p=' + encodeURIComponent(file);
      setStatus((updating ? '更新' : '发布') + '成功 🎉 约 1 分钟后线上更新。<br>' +
        '<a href="' + link + '" target="_blank" rel="noopener">查看这篇</a> · ' +
        '<a href="' + site + '" target="_blank" rel="noopener">网站首页</a>', 'ok', true);
    } catch (e) {
      setStatus((updating ? '更新' : '发布') + '失败：' + (e && e.message ? e.message : e), 'err');
    } finally {
      publishBtn.disabled = false;
    }
  }

  // ===== 删除 =====
  async function deleteEntry() {
    if (!editingFile) return;
    if (!confirm('确定删除这篇日记吗？删除后不可恢复。')) return;
    var c = load(CFG_KEY) || {};
    var parts = c.repo.split('/'), owner = parts[0], repo = parts[1], branch = c.branch || 'main';
    deleteBtn.disabled = true;
    try {
      setStatus('正在删除…', '');
      var path = 'posts/' + editingFile;
      var ex = await getFile(owner, repo, branch, c.token, path);
      if (ex && ex.sha) await delFile(owner, repo, branch, c.token, path, '删除日记: ' + editingFile, ex.sha);
      await removeFromManifest(owner, repo, branch, c.token, editingFile);
      setStatus('已删除。约 1 分钟后线上生效。', 'ok');
      newEntry();
      populatePicker();
    } catch (e) {
      setStatus('删除失败：' + (e && e.message ? e.message : e), 'err');
    } finally {
      deleteBtn.disabled = false;
    }
  }

  // ===== 插入图片（上传到 assets/uploads/）=====
  async function handleImage(fileObj) {
    var c = load(CFG_KEY) || {};
    if (!c.repo || !c.token) { setStatus('上传图片需要先在“设置”里填好仓库和令牌。', 'err'); openConfig(); return; }
    var parts = c.repo.split('/'), owner = parts[0], repo = parts[1], branch = c.branch || 'main';
    try {
      setStatus('正在上传图片…', '');
      var b64 = await readAsBase64(fileObj);
      var ext = (fileObj.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      var name = 'img-' + Date.now() + '-' + Math.floor(Math.random() * 1e4) + '.' + ext;
      var path = 'assets/uploads/' + name;
      await putRaw(owner, repo, branch, c.token, path, b64, '上传图片: ' + name);
      insertAtCursor(bodyEl, '\n![](' + path + ')\n');
      renderPreview();
      if (!editingFile) saveDraft();
      setStatus('图片已上传并插入正文。约 1 分钟后线上可见。', 'ok');
    } catch (e) {
      setStatus('图片上传失败：' + (e && e.message ? e.message : e), 'err');
    }
  }

  // ===== GitHub API =====
  function api(p) { return 'https://api.github.com' + p; }
  function headers(t) { return { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  async function getFile(o, r, b, t, path) {
    var res = await fetch(api('/repos/' + o + '/' + r + '/contents/' + encPath(path) + '?ref=' + encodeURIComponent(b)), { headers: headers(t), cache: 'no-cache' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await msg(res));
    return res.json();
  }
  async function putFile(o, r, b, t, path, content, message, sha) { return putRaw(o, r, b, t, path, b64encode(content), message, sha); }
  async function putRaw(o, r, b, t, path, b64content, message, sha) {
    var body = { message: message, content: b64content, branch: b };
    if (sha) body.sha = sha;
    var res = await fetch(api('/repos/' + o + '/' + r + '/contents/' + encPath(path)), {
      method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers(t)), body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await msg(res));
    return res.json();
  }
  async function delFile(o, r, b, t, path, message, sha) {
    var res = await fetch(api('/repos/' + o + '/' + r + '/contents/' + encPath(path)), {
      method: 'DELETE', headers: Object.assign({ 'Content-Type': 'application/json' }, headers(t)), body: JSON.stringify({ message: message, branch: b, sha: sha })
    });
    if (!res.ok) throw new Error(await msg(res));
    return res.json();
  }
  async function uniquePath(o, r, b, t, date, slug) {
    var base = 'posts/' + date + '-' + slug, p = base + '.md', i = 2;
    while (await getFile(o, r, b, t, p)) { p = base + '-' + i + '.md'; i++; }
    return p;
  }
  async function updateManifest(o, r, b, t, entry) {
    var ex = await getFile(o, r, b, t, 'posts/posts.json');
    var data = { posts: [] }, sha;
    if (ex) { sha = ex.sha; try { data = JSON.parse(b64decode(ex.content)); } catch (e) {} if (!data.posts) data.posts = []; }
    data.posts = data.posts.filter(function (p) { return p.file !== entry.file; });
    data.posts.unshift(entry);
    data.posts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    await putFile(o, r, b, t, 'posts/posts.json', JSON.stringify(data, null, 2) + '\n', '更新日记列表: ' + entry.title, sha);
  }
  async function removeFromManifest(o, r, b, t, file) {
    var ex = await getFile(o, r, b, t, 'posts/posts.json');
    if (!ex) return;
    var data = { posts: [] };
    try { data = JSON.parse(b64decode(ex.content)); } catch (e) {}
    if (!data.posts) data.posts = [];
    data.posts = data.posts.filter(function (p) { return p.file !== file; });
    await putFile(o, r, b, t, 'posts/posts.json', JSON.stringify(data, null, 2) + '\n', '从列表移除: ' + file, ex.sha);
  }
  async function msg(res) {
    var extra = res.status === 401 ? '（令牌无效或过期）'
      : res.status === 403 ? '（无权限，确认令牌对该仓库有 Contents 读写）'
      : res.status === 404 ? '（路径 / 仓库 / 分支不存在）'
      : res.status === 409 ? '（版本冲突，请重新载入后再试）' : '';
    try { var j = await res.json(); return (j.message || (res.status + ' ' + res.statusText)) + extra; }
    catch (e) { return res.status + ' ' + res.statusText + extra; }
  }

  // ===== 工具 =====
  function siteUrl(o, r) {
    if (/\.github\.io$/i.test(r)) return 'https://' + r.toLowerCase() + '/';
    return 'https://' + o.toLowerCase() + '.github.io/' + r + '/';
  }
  function slugify(t) {
    var s = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'post';
  }
  function summarize(body, limit) {
    limit = limit || 70;
    var ps = body.trim().split(/\n\s*\n/);
    for (var i = 0; i < ps.length; i++) {
      var x = ps[i].replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#>*`_\[\]()!~-]/g, '').replace(/\s+/g, ' ').trim();
      if (x) return x.slice(0, limit) + (x.length > limit ? '…' : '');
    }
    return '';
  }
  function todayStr() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function insertAtCursor(ta, text) {
    var s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    var pos = s + text.length;
    ta.selectionStart = ta.selectionEnd = pos;
    ta.focus();
  }
  function readAsBase64(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { var s = String(fr.result); var i = s.indexOf(','); res(i > -1 ? s.slice(i + 1) : s); };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }
  function parseFrontMatter(text) {
    var meta = {}, body = text;
    var m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text);
    if (m) {
      body = text.slice(m[0].length);
      m[1].split('\n').forEach(function (line) {
        var idx = line.indexOf(':');
        if (idx > -1) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });
    }
    return { meta: meta, body: body };
  }
  function openConfig() { var c = document.getElementById('config'); if (c) c.open = true; }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function setStatus(text, type, isHtml) {
    statusEl.className = 'status ' + (type || '');
    if (isHtml) statusEl.innerHTML = text; else statusEl.textContent = text;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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
