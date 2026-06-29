// 站点脚本：渲染首页日记列表 + 单篇日记
(function () {
  // 页脚年份
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Markdown 渲染选项：单个换行也生效，方便写日记
  if (window.marked && marked.setOptions) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  var listEl = document.getElementById('post-list');
  if (listEl) renderList(listEl);

  var contentEl = document.getElementById('post-content');
  if (contentEl) renderPost();

  // ---- 首页：日记列表 ----
  function renderList(el) {
    fetch('posts/posts.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var posts = (data.posts || []).slice().sort(function (a, b) {
          return (b.date || '').localeCompare(a.date || '');
        });
        if (!posts.length) {
          el.innerHTML = '<li class="loading">还没有日记，写下第一篇吧！</li>';
          return;
        }
        el.innerHTML = '';
        posts.forEach(function (p) {
          var li = document.createElement('li');
          li.className = 'post-item';
          var href = 'post.html?p=' + encodeURIComponent(p.file);
          li.innerHTML =
            '<a class="post-link" href="' + href + '">' +
              '<time class="post-item-date">' + escapeHtml(p.date || '') + '</time>' +
              '<span class="post-item-title">' + escapeHtml(p.title || '(无标题)') + '</span>' +
            '</a>' +
            (p.summary ? '<p class="post-item-summary">' + escapeHtml(p.summary) + '</p>' : '');
          el.appendChild(li);
        });
      })
      .catch(function () {
        el.innerHTML =
          '<li class="loading">无法加载日记列表。请通过本地服务器或 GitHub Pages 访问' +
          '（不要直接双击打开 html 文件）。</li>';
      });
  }

  // ---- 文章页：渲染单篇日记 ----
  function renderPost() {
    var file = getParam('p');
    var titleEl = document.getElementById('post-title');
    var dateEl = document.getElementById('post-date');
    if (!file) { titleEl.textContent = '未找到日记'; return; }

    fetch('posts/' + file, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.text();
      })
      .then(function (text) {
        var parsed = parseFrontMatter(text);
        var title = parsed.meta.title || '(无标题)';
        document.title = title;
        titleEl.textContent = title;
        dateEl.textContent = parsed.meta.date || '';
        contentEl.innerHTML = window.marked
          ? marked.parse(parsed.body)
          : escapeHtml(parsed.body);
      })
      .catch(function () {
        titleEl.textContent = '加载失败';
        contentEl.innerHTML = '<p>无法加载这篇日记。</p>';
      });
  }

  // 解析 Markdown 顶部的 front matter（--- title / date ---）
  function parseFrontMatter(text) {
    var meta = {};
    var body = text;
    var m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text);
    if (m) {
      body = text.slice(m[0].length);
      m[1].split('\n').forEach(function (line) {
        var idx = line.indexOf(':');
        if (idx > -1) {
          meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
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
