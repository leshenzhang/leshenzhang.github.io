# 个人主页：域名 + 域名邮箱 + 访问统计 配置指南（2026-09-30）

现状：网站已上线 https://leshenzhang.github.io/homepage/ （仓库 `leshenzhang/homepage`，GitHub Pages）。
内容由 `build.py` 从 `../cv/CV-PhD/main.tex` 生成；改完 CV 后跑 `./update.sh`，约 1 分钟生效。

下面三件事要你本人操作（付款 / 注册账号）。每步做完告诉我，我接着做代码侧。

---

## 1. 买域名（推荐 Cloudflare，约 $10.44/年，成本价、免费隐私保护）

已查：`leshenzhang.com` 可注册（.org/.net/.me/.io 也空着）。推荐 `.com`。

1. 注册 / 登录 https://dash.cloudflare.com
2. 左栏 **Domain Registration → Register Domains**，搜 `leshenzhang.com`，付款（信用卡或 PayPal）。
3. 打开 **Auto-renew**，避免过期被抢注。

> 备选：Porkbun（约 $11/年）。但后面第 3 步的免费邮件转发用 Cloudflare 最省事，所以建议直接在 Cloudflare 买。

## 2. 把域名指向网站（Cloudflare → DNS → Records）

添加下面几条记录，**代理状态一律选 "DNS only"（灰色云朵）**，否则 GitHub 无法签发 HTTPS 证书：

| 类型 | 名称 | 内容 |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `leshenzhang.github.io` |

做完告诉我，我来：在仓库加 `CNAME` 文件、在 GitHub 设置自定义域名、开启 "Enforce HTTPS"。
（建议同时在 GitHub → Settings → Pages → **Verified domains** 验证域名，防止别人盗用；它会让你加一条 TXT 记录。）

## 3. 域名邮箱（免费：收信用 Cloudflare 转发，发信用 Gmail）

**收信**
1. Cloudflare → 你的域名 → **Email → Email Routing → Get started**，它会自动加好 MX/TXT 记录。
2. **Routing rules → Create address**：例如 `me@leshenzhang.com`，转发到 `leshen.zhang.cn@gmail.com`（Gmail 会收到一封验证邮件，点确认）。

**发信（在 Gmail 里以 me@leshenzhang.com 发）**
1. Google 账号开启两步验证，然后在 https://myaccount.google.com/apppasswords 生成一个"应用专用密码"。
2. Gmail → 设置 → **账号和导入 → 用这个地址发送邮件 → 添加其他地址**：
   - 名称 `Leshen Zhang`，地址 `me@leshenzhang.com`；
   - SMTP 服务器 `smtp.gmail.com`，端口 `587`，用户名填你的 Gmail 地址，密码填上一步的应用专用密码，选 TLS；
   - 输入 Gmail 收到的验证码。
3. 回 Cloudflare DNS，把 SPF 那条 TXT 记录（`@`）改成：
   `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`
   这样从 Gmail 代发的信不容易进垃圾箱。

> 建议：套磁和正式申请仍用学校邮箱（复旦 / UCLA）当主邮箱，学校域名更有信用；域名邮箱写在网站和 CV 上当长期联系方式（毕业后也不会失效）。

## 4. 访问统计（GoatCounter，免费、无 cookie）

1. 打开 https://www.goatcounter.com/signup ，**Code 填 `leshenzhang`**（网站里已经埋好统计代码，指向 `leshenzhang.goatcounter.com`，注册即生效）。
2. 看数据：https://leshenzhang.goatcounter.com （访问量、来源、国家/地区、设备）。
3. **给每位老师一个专属链接**：在邮件里放 `https://leshenzhang.com/?ref=kulik` 这样的链接，后台 "Referrers" 里会单独显示 `kulik` 的访问，就能知道这封邮件的链接有没有被点开。

⚠ 注意：很多学校的邮件安全系统（如 Microsoft Safe Links、Proofpoint）会**自动预先打开邮件里的链接**做安全扫描，所以"有访问"不一定是老师本人。判断时看访问时间（收信后几秒内的访问多半是扫描器）和是否浏览了多页、下载了 CV。

## 5. 你原来的日记站

`leshenzhang.github.io`（仓库 `leshenzhang/leshenzhang.github.io`）现在是公开的个人日记博客，老师很容易搜到。三个选项，告诉我选哪个：
- 保留原样；
- 仓库改为私有（日记下线）；
- 让 `leshenzhang.github.io` 自动跳转到学术主页，日记挪到别的地址。
