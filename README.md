# 我的日记博客

一个干净、极简的个人日记博客。纯静态（HTML + CSS + 少量 JS），无需构建工具，
日记用 Markdown 书写，可直接发布到 GitHub Pages。

## 目录结构

```
website/
├── index.html          首页（个人简介 + 日记列表）
├── post.html           单篇日记的展示页
├── posts/
│   ├── posts.json      日记列表（由 build.py 自动生成，不用手改）
│   └── *.md            每篇日记一个 Markdown 文件
├── assets/
│   ├── css/style.css   样式（含自动深色模式）
│   └── js/site.js      列表与正文渲染
├── new_post.py         一键新建日记
├── build.py            扫描 posts/ 自动生成列表
└── .nojekyll           告诉 GitHub Pages 按原样发布
```

## 方式一：在网页里写并发布（推荐）

部署到 GitHub Pages 后，访问 `https://你的用户名.github.io/editor.html`：

1. 第一次使用，展开「设置」填写：
   - **GitHub 仓库**：`你的用户名/你的用户名.github.io`
   - **访问令牌**：到 [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
     新建一个，Repository access 选只授权这个仓库，
     Permissions → Repository permissions → **Contents** 设为 **Read and write**，
     复制 `github_pat_…` 粘进去，点「保存设置」（会自动验证）。
2. 写标题、正文（支持 Markdown，右侧实时预览），点 **发布**。
3. 约 1 分钟后，公开网站自动更新。手机、任何设备都能写。

> 令牌只存在你这台设备的浏览器本地（localStorage），不会上传到别处。
> 别在公用电脑上保存令牌。

## 方式二：本地命令行写

```bash
python3 new_post.py "今天的标题"
```

会在 `posts/` 里生成一篇带日期的 `.md` 文件并自动更新列表。
用任意编辑器打开这个文件，在 `---` 下面写正文即可（支持 Markdown）。

修改已有日记后，运行一次刷新列表（标题 / 日期 / 摘要会自动更新）：

```bash
python3 build.py
```

> 每篇 `.md` 顶部的 `title` 和 `date` 就是这篇日记的标题和日期，可随时手改。

## 本地预览

因为用到 `fetch` 读取文件，**不能直接双击打开 html**，要起一个本地服务器：

```bash
cd website
python3 -m http.server 8000
```

然后浏览器打开 http://localhost:8000

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库，名字填 `你的用户名.github.io`
2. 把本目录所有文件推上去：
   ```bash
   cd website
   git init
   git add .
   git commit -m "我的日记博客"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的用户名.github.io.git
   git push -u origin main
   ```
3. 仓库 Settings → Pages → Source 选 `main` 分支 `/ (root)`，保存
4. 等一两分钟，访问 `https://你的用户名.github.io`

## 个性化

- **名字 / 简介 / 链接**：直接编辑 `index.html` 和 `post.html` 顶部带 `TODO` 注释的地方
- **配色 / 字体**：改 `assets/css/style.css` 顶部的 `:root` 变量
