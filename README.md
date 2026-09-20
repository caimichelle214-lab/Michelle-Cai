# 个人主页 · 蔡敏依 / Cai Minyi — Personal Website

一个纯静态、零依赖的多页面个人主页，支持**中英文一键切换**，可以直接托管在 **GitHub Pages** 上免费在线访问。

A dependency-free, multi-page static personal website with a **Chinese / English switch**, ready to host for free on **GitHub Pages**.

---

## 一、网站结构 / Site structure

```
个人主页 作业/
├── index.html          首页：个人信息（证件照、姓名、学校、专业、年级、联系方式、关于我）
├── education.html      教育经历（部分内容待填写）
├── hobbies.html        个人爱好（部分内容待填写）
├── volunteer.html      志愿经历（语言能力 / 过往经验 / 自我陈述 / 简历下载）
├── gallery.html        图片展示（点图可放大，键盘 ← → 可翻页）
├── 404.html            访问不存在的页面时显示
├── .nojekyll           告诉 GitHub Pages 不要用 Jekyll 处理，避免文件被忽略
├── assets/
│   ├── css/style.css   全站样式（配色、排版、响应式、手机端菜单）
│   ├── js/i18n.js      ⭐ 所有中英文文字都在这里
│   ├── js/main.js      语言切换、手机端菜单、图片灯箱
│   ├── img/
│   │   ├── profile.jpg      证件照（已压缩，网页用）
│   │   ├── profile-sm.jpg   证件照小图（手机端用）
│   │   ├── favicon.svg      浏览器标签页小图标
│   │   └── gallery/         图库照片（目前是 6 张版式占位图）
│   └── files/
│       └── volunteer-cv.docx  志愿者简历（供访客下载）
├── 证件照2.jpeg         原始证件照（备份，未上传也没关系）
└── 志愿者简历.docx      原始简历（备份）
```

---

## 二、部署到 GitHub Pages（推荐用 GitHub Desktop，不用敲命令）

> 你的电脑目前**没有安装 git 命令行工具**（终端里运行 `git` 会提示需要安装 Xcode 开发者工具），
> 所以推荐用图形界面的 **GitHub Desktop**，或者直接在网页上拖拽上传。

### 方法 A：GitHub Desktop（推荐）

1. 打开 <https://desktop.github.com> 下载并安装 **GitHub Desktop**，用你的 GitHub 账号登录。
2. 菜单 **File → Add local repository…**，选择这个文件夹（`个人主页 作业`）。
   如果提示 "not a Git repository"，点 **create a repository**：
   - Name 填 `personal-website`（或你喜欢的名字，**建议用英文，不要有空格**）
   - Local path 选到 `个人主页 作业` 的**上一级**目录
   - 点 **Create repository**。
3. 左下角 Summary 填一句说明，例如 `first commit`，点 **Commit to main**。
4. 点右上角 **Publish repository**：
   - 取消勾选 "Keep this code private"（GitHub Pages 免费版**需要仓库是公开的**）
   - 点 **Publish repository**。
5. 打开 <https://github.com> → 进入这个仓库 → **Settings → Pages**：
   - **Source** 选 `Deploy from a branch`
   - **Branch** 选 `main`，文件夹选 `/ (root)`，点 **Save**。
6. 等 1–2 分钟，刷新这个页面，顶部会出现网址：

   ```
   https://你的用户名.github.io/personal-website/
   ```

   这就是你的在线个人主页，手机和电脑都能打开。以后每次改完文件，在 GitHub Desktop 里
   **Commit → Push** 一次，网站 1 分钟左右自动更新。

### 方法 B：在网页上直接上传（完全不用装软件）

1. 登录 GitHub，点右上角 **+ → New repository**，名字填 `personal-website`，选 **Public**，Create。
2. 进入仓库，点 **uploading an existing file**。
3. 把这个文件夹里的**所有文件和文件夹**拖进去（注意 `assets` 文件夹要一起拖，保持目录结构）。
4. 下方点 **Commit changes**。
5. 然后按上面第 5、6 步开启 Pages 即可。

> ⚠️ 注意：`index.html` 必须放在仓库的**最外层**，不能套一层文件夹，否则 Pages 打开会是 404。

### 网页地址 / URLs

| 页面 | 中文 | 英文 |
| --- | --- | --- |
| 首页 | `.../personal-website/` | `.../personal-website/?lang=en` |
| 教育经历 | `education.html` | `education.html?lang=en` |
| 个人爱好 | `hobbies.html` | `hobbies.html?lang=en` |
| 志愿经历 | `volunteer.html` | `volunteer.html?lang=en` |
| 图片展示 | `gallery.html` | `gallery.html?lang=en` |

访问者点右上角的 **中 / EN** 按钮即可切换，选择会被记住（存在浏览器本地）。

---

## 三、怎么改内容 / How to edit

### 1. 改文字（姓名、专业、经历说明……）

所有文字都在 **`assets/js/i18n.js`** 里，格式是 `'键名': '文字'`：

```js
zh: {
  'info.majorVal': '英语-法学双学位',   // 中文
  ...
},
en: {
  'info.majorVal': 'Double Degree in English & Law',   // 英文
  ...
}
```

- **改中文** → 改上面 `zh:` 那一段；**改英文** → 改下面 `en:` 那一段。
- 两边**键名要一致**，只改冒号后面的引号内容。
- 括号里的单引号 `'` 不要删掉；文字里如果要用英文撇号，写成 `’`（弯撇号）或改用双引号包住。

### 2. 标记为「待填写」的内容

以下位置目前是占位文字，等你补充：

| 页面 | 位置 | 对应的键名 |
| --- | --- | --- |
| 教育经历 | 时间"待填写"、中学阶段、交流与海外学习 | `edu.tl2*`、`edu.tl3*`，以及 `edu.tl1When`、`edu.tl1Desc` |
| 教育经历 | 专业方向三张卡片的具体课程 | `edu.c1D`、`edu.c2D`、`edu.c3D` |
| 个人爱好 | 六张卡片的"详情待填写" | `hob.c1D` ~ `hob.c6D` |
| 个人爱好 | 不想要的爱好，直接删掉 `hobbies.html` 里对应的整段 `<article class="card">` | — |

补完以后，可以把 `education.html` / `hobbies.html` 顶部的"本页正在补充中"提示条
（`<div class="tbd-block">…</div>`）整段删掉，页面会更干净。

### 3. 换照片

**证件照**：把你的新照片覆盖 `assets/img/profile.jpg`（建议宽度 800px 左右，竖版）；
小图 `assets/img/profile-sm.jpg` 建议宽度 400px。
在 Mac 上可以用「预览」导出，或终端里：

```bash
sips -s format jpeg -s formatOptions 82 -Z 1100 新照片.jpg --out assets/img/profile.jpg
sips -s format jpeg -s formatOptions 78 -Z 560  新照片.jpg --out assets/img/profile-sm.jpg
```

**图库照片**：把照片放进 `assets/img/gallery/`，然后编辑 `gallery.html`，
把 `<img src="assets/img/gallery/gallery-1.jpg" …>` 里的文件名换成你的。
图库是「复制一整段 `<figure>…</figure>` 就多一张图」，说明文字改 `data-cap-zh` / `data-cap-en` 对应的键名即可。

### 4. 换简历

用新的 Word 文件覆盖 `assets/files/volunteer-cv.docx`（文件名保持不变最省事）。

---

## 四、本地预览 / Preview locally

直接双击 `index.html` 就能看，但**用本地服务器**更接近线上效果（也方便以后加功能）。
在本文件夹里执行任意一条：

```bash
python3 -m http.server 8000      # 需要 Python 3
npx serve .                      # 需要 Node.js
```

然后浏览器打开 <http://localhost:8000>。

---

## 五、隐私提醒 / Privacy

这个网站是**完全公开**的，任何人都能搜索和复制上面的内容。目前页面上有：

- 邮箱 `michellecai@sjtu.edu.cn`
- 手机号 `15121187038`（首页「个人信息」和每页页脚各出现一次）

公开手机号可能会被爬虫收集、收到推销电话或短信。如果之后想撤掉，只要：

1. 用编辑器全局搜索 `15121187038`；
2. 把 `index.html` 里 `<dt>` 手机 `</dt>` 后面的整个 `<dd>…</dd>` 删掉；
3. 把其余文件页脚里的 `<li><a href="tel:+8615121187038">…</a></li>` 删掉。

微信没有放在页面上（按你的要求只放了邮箱和手机号）。

---

## 六、常见问题 / FAQ

**Q：打开是 404？**
确认 `index.html` 在仓库根目录，且 Settings → Pages 的分支选的是 `main` + `/ (root)`，首次部署要等 1–2 分钟。

**Q：样式没生效、没有颜色？**
`assets` 文件夹没有上传成功。检查仓库里是否存在 `assets/css/style.css`。

**Q：切成英文后刷新会变回中文？**
不会——语言选择存在浏览器里。但如果用「无痕模式」或清了缓存，会重新按浏览器语言判断。也可以直接用带参数的链接分享，例如 `...?lang=en` 强制英文。

**Q：想绑自己的域名？**
Settings → Pages → Custom domain 里填，然后在你的域名服务商加一条 CNAME 记录指向 `你的用户名.github.io`。

---

## 七、技术说明 / Technical notes

- 纯 HTML + CSS + 原生 JavaScript，**没有构建步骤、没有外部依赖**（不加载任何 CDN 字体或脚本），
  所以断网、内网、被墙的环境也能正常打开，加载快、维护简单。
- 双语实现方式：HTML 里写 `data-i18n="键名"`，`main.js` 在页面加载时用 `i18n.js` 里的字典替换文字；
  选择存在 `localStorage` 的 `cm-lang` 键里。
- 响应式：≥ 900px 双栏（照片 + 信息），≤ 820px 顶部导航折叠成汉堡菜单，≤ 560px 单栏紧凑排版。
- 无障碍：语义化标签、`aria-label`、键盘可操作（灯箱支持 `←` `→` `Esc`）、`prefers-reduced-motion` 尊重系统设置。
- 图片均已压缩（证件照 4.5 MB → 160 KB），并使用了 `srcset` 让手机加载小图。

---

© 2025 蔡敏依 · 保留所有权利
