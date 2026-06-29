// 站点脚本：首页列表 + 搜索 + 单篇日记（阅读时长 / 上一篇下一篇）
(function () {
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (window.marked && marked.setOptions) marked.setOptions({ breaks: true, gfm: true });

  var listEl = document.getElementById('post-list');
  if (listEl) initList(listEl);

  var contentEl = document.getElementById('post-content');
  if (contentEl) renderPost(contentEl);

  // ===== 首页：列表 + 搜索 =====
  var allPosts = [];

  function initList(el) {
    fetch('posts/posts.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allPosts = (data.posts || []).slice().sort(function (a, b) {
          return (b.date || '').localeCompare(a.date || '');
        });
        var countEl = document.getElementById('post-count');
        if (countEl) countEl.textContent = allPosts.length ? '· ' + allPosts.length + ' 篇' : '';
        renderItems(el, allPosts);

        var search = document.getElementById('post-search');
        if (search) {
          search.addEventListener('input', function () {
            var q = search.value.trim().toLowerCase();
            var filtered = !q ? allPosts : allPosts.filter(function (p) {
              return ((p.title || '') + ' ' + (p.summary || '') + ' ' + (p.date || ''))
                .toLowerCase().indexOf(q) > -1;
            });
            renderItems(el, filtered, q);
          });
        }
      })
      .catch(function () {
        el.innerHTML = '<li class="loading">无法加载日记列表。请通过本地服务器或 GitHub Pages 访问。</li>';
      });
  }

  function renderItems(el, posts, q) {
    if (!posts.length) {
      el.innerHTML = '<li class="loading">' +
        (q ? '没有匹配「' + escapeHtml(q) + '」的日记。' : '还没有日记，写下第一篇吧！') + '</li>';
      return;
    }
    el.innerHTML = '';
    posts.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'post-item';
      var href = 'post.html?p=' + encodeURIComponent(p.file);
      li.innerHTML =
        '<a class="post-link" href="' + href + '">' +
          '<span class="post-item-date">' + escapeHtml(p.date || '') + '</span>' +
          '<span class="post-item-title">' + escapeHtml(p.title || '(无标题)') + '</span>' +
          (p.summary ? '<span class="post-item-summary">' + escapeHtml(p.summary) + '</span>' : '') +
        '</a>';
      el.appendChild(li);
    });
  }

  // ===== 单篇日记 =====
  function renderPost(contentEl) {
    var file = getParam('p');
    var titleEl = document.getElementById('post-title');
    var dateEl = document.getElementById('post-date');
    if (!file) { titleEl.textContent = '未找到日记'; return; }

    var listPromise = fetch('posts/posts.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .catch(function () { return { posts: [] }; });

    fetch('posts/' + file, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then(function (text) {
        var parsed = parseFrontMatter(text);
        var title = parsed.meta.title || '(无标题)';
        document.title = title + ' · 小白的日记';
        titleEl.textContent = title;
        var rt = readingTime(parsed.body);
        dateEl.textContent = (parsed.meta.date || '') + (rt ? '  ·  ' + rt : '');
        contentEl.innerHTML = window.marked ? marked.parse(parsed.body) : escapeHtml(parsed.body);
        return listPromise;
      })
      .then(function (data) { buildPager(file, (data && data.posts) || []); })
      .catch(function () {
        titleEl.textContent = '加载失败';
        contentEl.innerHTML = '<p>无法加载这篇日记。</p>';
      });
  }

  function buildPager(file, posts) {
    var pager = document.getElementById('post-pager');
    if (!pager) return;
    var sorted = posts.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var idx = -1;
    for (var i = 0; i < sorted.length; i++) { if (sorted[i].file === file) { idx = i; break; } }
    if (idx === -1) return;
    var newer = idx > 0 ? sorted[idx - 1] : null;
    var older = idx < sorted.length - 1 ? sorted[idx + 1] : null;
    pager.innerHTML =
      (newer
        ? '<a class="pager-link pager-newer" href="post.html?p=' + encodeURIComponent(newer.file) + '">' +
            '<span class="pager-label">← 更新的一篇</span>' +
            '<span class="pager-title">' + escapeHtml(newer.title || '') + '</span></a>'
        : '<span class="pager-link pager-empty"></span>') +
      (older
        ? '<a class="pager-link pager-older" href="post.html?p=' + encodeURIComponent(older.file) + '">' +
            '<span class="pager-label">更早的一篇 →</span>' +
            '<span class="pager-title">' + escapeHtml(older.title || '') + '</span></a>'
        : '<span class="pager-link pager-empty"></span>');
  }

  function readingTime(body) {
    var n = (body || '').replace(/\s+/g, '').length;
    if (!n) return '';
    return '约 ' + Math.max(1, Math.round(n / 350)) + ' 分钟';
  }

  // ===== 工具 =====
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

  function getParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
