# Guanzheng Blog ✍️

一个零依赖、部署在 GitHub Pages 的中英双语静态博客。

## 本地预览

```bash
npm run build
npm run check
npm run preview
```

然后访问 `http://localhost:4173/`。

## 新增双语文章

```bash
npm run new -- 2026-09 "2026M9——中文标题" "2026M9 — English Title" article-slug
```

命令会同时创建中文 `.md` 与英文 `.en.md`。写完两份正文后运行 `npm run build`，脚本会分别计算中文字数、英文词数、阅读时长和章节目录，并写回 `posts.json`。

文章页的下载按钮会生成一个 Markdown 文件，内容顺序固定为：中文标题与正文、分隔线、英文标题与正文。
