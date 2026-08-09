# Guanzheng's Blog

一个零依赖的静态博客，适合部署到 GitHub Pages。首页只展示文章标题，文章页只展示标题、目录和正文。

## 本地预览

```bash
cd guanzheng-blog
npm run check
npm run preview
```

然后打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)。不需要 `npm install`。

## 每月发一篇

```bash
npm run new -- 2026-09 "九月：AI 产品的新观察" ai-product-notes
```

这个命令会：

1. 新建 `posts/2026-09-ai-product-notes.md`；
2. 自动更新 `posts.json`；
3. 填写 Markdown 正文即可。

如不想用命令，也可以在 GitHub 网页端手动新增 Markdown 文件，并在 `posts.json` 复制一条文章元数据。

## 发布到 GitHub Pages

1. 在 GitHub 新建**公开**仓库，名称为 `GuanZhengPM.github.io`。
2. 将本目录里的全部文件上传到仓库根目录，分支为 `main`。
3. 仓库进入 **Settings → Pages**，选择 **Deploy from a branch**，分支选 `main`，目录选 `/(root)`，保存。
4. 等待 Pages 发布完成，访问 `https://guanzhengpm.github.io/`。

这个项目是纯静态 HTML、CSS 和 JavaScript；不依赖 Jekyll、Node 构建或 GitHub Actions。每次提交 `main` 后，GitHub Pages 会发布最新版本。

## 浏览量与阅读时长

`analytics-worker/` 是可选的 Cloudflare Worker + D1 统计端点。它记录每篇文章的会话浏览量和前台有效阅读时长；文章页会显示浏览量和平均有效阅读时间。

```bash
cd analytics-worker
cp wrangler.jsonc.example wrangler.jsonc
npx wrangler d1 create guanzheng-blog-analytics
# 将返回的 database_id 填入 wrangler.jsonc
npx wrangler d1 execute guanzheng-blog-analytics --remote --file=./schema.sql
npx wrangler deploy
```

将部署后得到的 Worker 地址填到 [analytics.config.js](./analytics.config.js) 的 `endpoint`。如果使用自定义域名，也把它补到 `wrangler.jsonc` 的 `ALLOWED_ORIGIN`。

查看数据：

```bash
npx wrangler d1 execute guanzheng-blog-analytics --remote --command "SELECT path, views, active_seconds, ROUND(active_seconds * 1.0 / NULLIF(reading_sessions, 0)) AS avg_read_seconds FROM page_stats ORDER BY views DESC;"
```

未配置 `endpoint` 时，博客不发送任何统计请求。统计只写文章标识和汇总数字，不写正文、Cookie、账号或访客身份。

## 文件结构

```text
guanzheng-blog/
├── index.html              # 首页
├── post.html               # 通用文章页
├── about.html              # 关于页
├── styles.css              # 全站样式
├── app.js                  # 加载文章、Markdown 渲染、目录与主题切换
├── analytics.js            # 可选统计客户端
├── analytics-worker/       # Cloudflare Worker + D1 统计端点
├── posts.json              # 文章索引
├── posts/                  # 每篇 Markdown 正文
└── scripts/new-post.mjs    # 新建月报
```
