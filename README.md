# leshenzhang.github.io

Academic homepage of Leshen Zhang — https://leshenzhang.github.io/

## 怎么改主页（不用装任何东西）

主页内容来自两个地方，改哪里取决于你要改什么：

| 想改的内容 | 在哪里改 | 多久生效 |
|---|---|---|
| 论文列表、研究经历、奖项、报告、CV PDF | **Overleaf 上的 CV**（`main.tex`） | 本机每小时 :52 自动同步，约 1 小时内 |
| 简介、教育经历、研究岗位、Software、研究方向、导航栏 | 本仓库的 **`template.html`** | 保存后约 2 分钟 |
| 照片 | 本仓库的 **`assets/photo.jpg`** | 上传后约 2 分钟 |

### 改 `template.html`（在 GitHub 网页上）
1. 打开 https://github.com/leshenzhang/leshenzhang.github.io/blob/main/template.html
2. 点右上角铅笔 ✏️（Edit this file）。
3. 按 `Ctrl+F` 搜要改的文字（例如 `Education`、`I am an undergraduate`），直接改英文内容，**不要动 `<...>` 尖括号里的标签**。
   - 换行用 `<br>`；加粗用 `<b>文字</b>`；链接写成 `<a href="网址">文字</a>`。
   - `{{PUBLICATIONS}}` 这类双花括号是占位符，会被 CV 内容自动替换，不要删。
4. 点 **Commit changes…** → 再点 **Commit changes**。GitHub 会自动重新生成 `index.html` 并发布（仓库的 **Actions** 页能看到进度，绿色 ✓ 表示成功）。

### 换照片
仓库首页 → **Add file → Upload files** → 上传一张**正方形**照片，文件名必须是 `photo.jpg`，放在 `assets/` 目录里（会覆盖旧照片）→ Commit。

### 改 CV 里的内容
直接在 Overleaf 改 CV。本机每小时检查一次 Overleaf：编译成功就同步到主页；**LaTeX 编译失败（比如混进了中文）时主页不更新**，记录在本机 `application/cv/auto_sync_site.log`。

### 注意
- **不要直接改 `index.html`**：它是自动生成的，下次更新会被覆盖。
- `cv/main.tex` 是 CV 的自动副本，也不要手改（改 Overleaf）。
- 改坏了可以回退：仓库的 **History**（右上角时钟图标）里找到上一个版本，或者直接让 Claude 帮你恢复。

## Files
- `template.html` — hand-written page (bio, education, positions, software, styles); placeholders `{{...}}` are filled from the CV
- `build.py` — builds `index.html` from `template.html` + CV `main.tex` (local Overleaf-synced copy, else `cv/main.tex`)
- `update.sh` — local: pull, rebuild, commit, push
- `.github/workflows/rebuild.yml` — rebuilds and republishes when `template.html`, `assets/` or `cv/` change on GitHub
- Visit statistics: GoatCounter (`leshenzhang.goatcounter.com`); per-recipient links `?ref=<name>`
