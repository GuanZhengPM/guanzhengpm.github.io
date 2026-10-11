# 个人博客 (guanzhengpm.github.io)

> Monthly notes on recruiting, LLMs, agents, and product judgment.  
> 关于招聘、模型、Agent、产品的月更博客：部署于 GitHub Pages 的零依赖中英双语静态站点，配套微信公众号自动化排版 Skill。

在线访问：[guanzhengpm.github.io](https://guanzhengpm.github.io/)

---

## 博客简介

关于招聘、模型、Agent、产品的月更博客，主要记录相关的行业思考、工程落地与产品判断。

### 核心特性

- **零外部框架依赖**：纯 HTML/CSS/原生 JavaScript 实现，页面秒开，直接部署于 GitHub Pages；
- **原生双语支持**：每篇文章均配备中文与英文版本，自动解析字数、预估阅读时长并生成统一目录索引；
- **全自动排版工作流**：内置双端发布 Skill，一份 Markdown 输入即可同时生成 Web 静态博文与符合微信公众号规范的富文本格式。

---

## 本地开发与预览

```bash
# 构建文章索引与元数据
npm run build

# 语法与链接检查
npm run check

# 启动本地预览服务器
npm run preview
```

启动后访问 `http://localhost:4173/` 查看本地效果。

---

## 新增双语文章

运行内置脚手架脚本：

```bash
npm run new -- 2026-10 "2026M10——文章中文标题" "2026M10 — English Article Title" article-slug
```

**工作流**：
1. 脚本会在 `posts/` 目录下同时生成 `article-slug.md`（中文）与 `article-slug.en.md`（英文）；
2. 撰写完成后执行 `npm run build`，系统自动计算中文字数、英文词数并更新 `posts.json` 索引；
3. 文章页面提供双语一键合并下载功能。

---

## 配套 Skill

* **[Guanzheng 双端排版 Skill](skills/wechat-guanzheng-layout/SKILL.md)**：支持在 Agent 中直接调用，自动完成微信公众号样式的富文本渲染、段落间距约束与确定性排版校验。

---

## License

博客正文内容保留作者版权。页面构建脚本与样式代码遵循 [MIT License](LICENSE)。

---

<a id="english"></a>

# Personal Blog (guanzhengpm.github.io)

> Monthly notes on recruiting, LLMs, agents, and product judgment.  
> A zero-dependency, bilingual static blog deployed on GitHub Pages, featuring an automated WeChat publishing skill.

Live site: [guanzhengpm.github.io](https://guanzhengpm.github.io/)

---

## Overview

Monthly engineering notes and product judgments on recruiting systems, frontier LLMs, coding agent architectures, and AI product design.

### Key Features

* **Zero Framework Overhead**: Built with vanilla HTML, modern CSS, and plain JavaScript for instant page loads; hosted directly on GitHub Pages.
* **Native Bilingual Architecture**: Every post includes synchronized Chinese and English versions, automatically computing word counts, estimated reading time, and table-of-contents trees.
* **Automated Publishing Workflow**: Integrated formatting skill to simultaneously generate clean web articles and WeChat official account rich-text layouts from a single Markdown source.

---

## Local Development & Preview

```bash
# Build post index and metadata
npm run build

# Syntax and link checking
npm run check

# Start local preview server
npm run preview
```

Visit `http://localhost:4173/` to view local changes.

---

## Authoring Bilingual Posts

Run the built-in scaffolding script:

```bash
npm run new -- 2026-10 "2026M10 — Chinese Title" "2026M10 — English Title" article-slug
```

**Workflow**:
1. Generates both `article-slug.md` (Chinese) and `article-slug.en.md` (English) under `posts/`.
2. After writing both versions, run `npm run build` to update reading metrics and the `posts.json` catalog.
3. The reader interface provides one-click combined bilingual Markdown export.

---

## Companion Skill

* **[Dual-Target Layout Skill](skills/wechat-guanzheng-layout/SKILL.md)**: Agent-callable skill providing deterministic WeChat official account rich-text rendering, paragraph margin normalization, and visual previews.

---

## License

Post contents retain author copyright. Build scripts and stylesheet templates are licensed under the [MIT License](LICENSE).
