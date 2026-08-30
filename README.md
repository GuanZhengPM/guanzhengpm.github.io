# Guanzheng Blog ✍️

## Skill

- [Guanzheng双端排版](skills/wechat-guanzheng-layout/SKILL.md)：输入一篇完成的 Markdown，同时准备中英双语 GitHub Blog 与微信公众号富文本版本，并做确定性校验。

该 Skill 的工作流设计参考了 [isjiamu/gzh-design-skill](https://github.com/isjiamu/gzh-design-skill) 对主题规则、公众号粘贴约束、HTML 校验和复制预览的拆分方式；Guanzheng Blog 主题与 Python 实现为独立编写，没有复制其 AGPL 主题 HTML、组件库或脚本。

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
