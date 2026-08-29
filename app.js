const POSTS_URL = "./posts.json";
const LOCALES = ["zh", "en"];
const CHARS_PER_MINUTE = { zh: 340, en: 220 };
const $ = (selector, parent = document) => parent.querySelector(selector);
const SUN_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"></circle><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"></path></svg>`;
const MOON_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
const UI = {
  zh: { lang: "zh-CN", wordmark: "Guanzheng 写字的地方", back: "返回 Blog 列表", nav: "主导航", skip: "跳到正文", posts: "文章", sections: "章节", toc: "目录", download: "下载双语 .md", reading: (n) => `${new Intl.NumberFormat("zh-CN").format(n)} 字`, minutes: (n) => `约 ${n} 分钟`, themeLight: "切换至浅色模式", themeDark: "切换至深色模式", language: "Switch to English", loading: "正在读取文章…", failed: "加载失败", retry: "请刷新页面后重试。", empty: "还没有文章。", indexError: "文章索引加载失败。", postError: "文章正文加载失败。", missing: "找不到这篇文章。", description: "Guanzheng 的月度笔记：关于 AI、产品、职业与学习中的判断。" },
  en: { lang: "en", wordmark: "Guanzheng's Notes", back: "Back to all posts", nav: "Main navigation", skip: "Skip to content", posts: "Posts", sections: "Sections", toc: "Contents", download: "Download bilingual .md", reading: (n) => `${new Intl.NumberFormat("en-US").format(n)} words`, minutes: (n) => `${n} min read`, themeLight: "Switch to light mode", themeDark: "Switch to dark mode", language: "切换至中文", loading: "Loading article…", failed: "Failed to load", retry: "Please refresh and try again.", empty: "No posts yet.", indexError: "Could not load the post index.", postError: "Could not load the article.", missing: "This article could not be found.", description: "Guanzheng's monthly notes on AI, products, careers, learning, and judgment." },
};

function getLocale() {
  const query = new URLSearchParams(location.search).get("lang");
  if (LOCALES.includes(query)) return query;
  try { const saved = localStorage.getItem("guanzheng-language"); if (LOCALES.includes(saved)) return saved; } catch {}
  return "zh";
}
let locale = getLocale();
const t = () => UI[locale];
function translation(post, language = locale) { return post.languages?.[language] ?? { title: post.title, file: post.file, words: post.words, minutes: post.minutes, sections: post.sections }; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function postHref(post, language = locale) { const params = new URLSearchParams({ id: post.id }); if (language === "en") params.set("lang", "en"); return `./post.html?${params}`; }
function postTitleMarkup(title) { const match = /^(\d{4}M\d{1,2}——)(.+)$/.exec(title); return match ? `<span class="article-title__date post-title__date">${escapeHtml(match[1])}</span><span class="article-title__subject">${escapeHtml(match[2])}</span>` : escapeHtml(title); }
function errorMarkup(message) { return `<p class="load-error">${escapeHtml(message)} ${escapeHtml(t().retry)}</p>`; }
function formatDate(value) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "")); if (!match) return String(value ?? ""); return locale === "zh" ? `${match[1]} · ${match[2]} · ${match[3]}` : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function readingMinutes(entry) { if (Number.isFinite(entry.minutes)) return entry.minutes; return Number.isFinite(entry.words) ? Math.max(1, Math.ceil(entry.words / CHARS_PER_MINUTE[locale])) : null; }
function metaMarkup(post) { const entry = translation(post), parts = [formatDate(post.date)]; if (Number.isFinite(entry.words)) parts.push(t().reading(entry.words)); const minutes = readingMinutes(entry); if (minutes) parts.push(t().minutes(minutes)); return parts.map(escapeHtml).join('<span aria-hidden="true"></span>'); }
function sectionLabel(text) { const bracketed = /^(\d+)\s*[.、]\s*[【[]([^】\]]+)[】\]]/.exec(text); if (bracketed) return { num: bracketed[1], label: bracketed[2] }; const numbered = /^(\d+)\s*[.、]\s*(.+)$/.exec(text); return numbered ? { num: numbered[1], label: numbered[2] } : { num: null, label: text }; }
function sectionListMarkup(post) { const sections = translation(post).sections ?? []; if (!sections.length) return ""; const items = sections.map((section, i) => { const { num, label } = sectionLabel(section.label ?? ""); return `<a href="${postHref(post)}#${encodeURIComponent(section.id)}"><b class="num">${String(num ?? i + 1).padStart(2, "0")}</b>${escapeHtml(label)}</a>`; }).join(""); return `<nav class="post-sections" aria-label="${escapeHtml(t().sections)}">${items}</nav>`; }
async function loadPosts() { const response = await fetch(POSTS_URL, { cache: "no-store" }); if (!response.ok) throw new Error(); const posts = await response.json(); if (!Array.isArray(posts)) throw new Error(); return posts.sort((a, b) => new Date(b.date) - new Date(a.date)); }
function renderHome(posts) { const root = $("#post-list"); if (!root) return; if (!posts.length) { root.innerHTML = errorMarkup(t().empty); return; } root.innerHTML = posts.map((post) => { const entry = translation(post); return `<article class="post-row"><p class="post-meta num">${metaMarkup(post)}</p><h2><a href="${postHref(post)}">${postTitleMarkup(entry.title)}</a></h2>${sectionListMarkup(post)}</article>`; }).join(""); }

function renderInline(text) { let rendered = escapeHtml(text.trim()).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>"); return rendered.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>'); }
function markdownToHtml(markdown) {
  const lines = markdown.replaceAll("\r", "").split("\n"), html = [], headings = [];
  let paragraph = [], listItems = [], listType = null, quote = [], inCode = false, codeLines = [], headingCount = 0;
  const flushParagraph = () => { if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(" "))}</p>`); paragraph = []; };
  const flushList = () => { if (listItems.length && listType) { const tag = listType === "ordered" ? "ol" : "ul"; html.push(`<${tag}>${listItems.map((x) => `<li>${renderInline(x)}</li>`).join("")}</${tag}>`); } listItems = []; listType = null; };
  const flushQuote = () => { if (quote.length) html.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`); quote = []; };
  const flush = () => { flushParagraph(); flushList(); flushQuote(); };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("```")) { if (inCode) { html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`); codeLines = []; inCode = false; } else { flush(); inCode = true; } continue; }
    if (inCode) { codeLines.push(rawLine); continue; }
    if (!line) { flush(); continue; }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) { flush(); const level = heading[1].length, text = heading[2], id = `section-${++headingCount}`; headings.push({ id, text, level }); html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`); continue; }
    if (line === "---") { flush(); html.push("<hr>"); continue; }
    const ordered = /^\d+\.\s+(.+)$/.exec(line), unordered = /^[-*]\s+(.+)$/.exec(line);
    if (ordered || unordered) { flushParagraph(); flushQuote(); const next = ordered ? "ordered" : "unordered"; if (listType && listType !== next) flushList(); listType = next; listItems.push((ordered || unordered)[1]); continue; }
    const quoted = /^>\s?(.+)$/.exec(line); if (quoted) { flushParagraph(); flushList(); quote.push(quoted[1]); continue; }
    flushList(); flushQuote(); paragraph.push(line);
  }
  flush(); if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  return { html: html.join("\n"), headings };
}

function markdownExport(post, markdown) { const zh = translation(post, "zh"), en = translation(post, "en"); return [`# ${zh.title}`, "", markdown.zh.trim(), "", "---", "", `# ${en.title}`, "", markdown.en.trim(), ""].join("\n"); }
function setupMarkdownDownload(post, markdown) { const root = $("#article-actions"), link = $("#download-markdown"); if (!root || !link || !markdown.zh || !markdown.en) return; const url = URL.createObjectURL(new Blob([markdownExport(post, markdown)], { type: "text/markdown;charset=utf-8" })); link.href = url; link.download = `${post.id}-zh-en.md`; root.hidden = false; addEventListener("pagehide", () => URL.revokeObjectURL(url), { once: true }); }
function scrollToHash({ instant = false } = {}) { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (!target) return; if (!instant) { target.scrollIntoView({ block: "start" }); return; } const root = document.documentElement, previous = root.style.scrollBehavior; root.style.scrollBehavior = "auto"; void root.offsetHeight; target.scrollIntoView({ block: "start", behavior: "auto" }); requestAnimationFrame(() => { root.style.scrollBehavior = previous; }); }
function setupTocScrollSpy(links) { const targets = links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean); if (!targets.length) return null; let currentId = null; return () => { const root = document.documentElement, line = root.clientHeight * .25; let id = targets[0].id; for (const target of targets) { if (target.getBoundingClientRect().top > line) break; id = target.id; } if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) id = targets.at(-1).id; if (id === currentId) return; currentId = id; links.forEach((link) => { if (decodeURIComponent(link.hash.slice(1)) === id) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); }); }; }
function setupArticleToc(headings) { const wrap = $("#article-toc-wrap"), root = $("#article-toc"); if (!wrap || !root) return null; const items = headings.filter((h) => h.level === 2); if (!items.length) { wrap.hidden = true; return null; } root.innerHTML = items.map((heading, i) => { const { num, label } = sectionLabel(heading.text); return `<a href="#${encodeURIComponent(heading.id)}" title="${escapeHtml(heading.text)}"><b class="num">${String(num ?? i + 1).padStart(2, "0")}</b>${escapeHtml(label)}</a>`; }).join(""); const links = [...root.querySelectorAll("a")], wide = matchMedia("(min-width: 1080px)"), sync = () => { wrap.open = wide.matches; }; sync(); wide.addEventListener("change", sync); return setupTocScrollSpy(links); }
function setupScrollEffects(updateToc) { const bar = $("[data-reading-progress]"); if (!bar && !updateToc) return; const update = () => { const root = document.documentElement, max = root.scrollHeight - root.clientHeight; if (bar) bar.style.transform = `scaleX(${(max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0).toFixed(4)})`; updateToc?.(); }; addEventListener("scroll", update, { passive: true }); addEventListener("resize", update); update(); }

async function renderPost(posts) {
  const article = $("#article"); if (!article) return;
  const id = new URLSearchParams(location.search).get("id"), post = id ? posts.find((item) => item.id === id) : posts[0];
  if (!post) { article.innerHTML = errorMarkup(t().missing); article.setAttribute("aria-busy", "false"); return; }
  const entry = translation(post), title = $("#article-title"), meta = $("#article-meta"), content = $("#post-content");
  title.innerHTML = postTitleMarkup(entry.title); document.title = `${entry.title} · Guanzheng's Blog`; meta.innerHTML = metaMarkup(post); meta.hidden = false;
  try {
    const pairs = await Promise.all(LOCALES.map(async (language) => { const response = await fetch(`./${translation(post, language).file}`, { cache: "no-store" }); if (!response.ok) throw new Error(); return [language, await response.text()]; }));
    const markdown = Object.fromEntries(pairs), rendered = markdownToHtml(markdown[locale]); content.innerHTML = rendered.html;
    setupScrollEffects(setupArticleToc(rendered.headings)); setupMarkdownDownload(post, markdown); article.setAttribute("aria-busy", "false"); requestAnimationFrame(() => scrollToHash({ instant: true }));
  } catch { content.innerHTML = errorMarkup(t().postError); article.setAttribute("aria-busy", "false"); }
}

function applyLocale() { const copy = t(); document.documentElement.lang = copy.lang; document.documentElement.dataset.lang = locale; $("meta[name=description]")?.setAttribute("content", copy.description); document.querySelectorAll("[data-i18n]").forEach((node) => { if (typeof copy[node.dataset.i18n] === "string") node.textContent = copy[node.dataset.i18n]; }); document.querySelectorAll("[data-i18n-aria]").forEach((node) => { if (typeof copy[node.dataset.i18nAria] === "string") node.setAttribute("aria-label", copy[node.dataset.i18nAria]); }); const back = $(".wordmark--back"); if (back && locale === "en") back.href = "./index.html?lang=en"; const toggle = $("[data-language-toggle]"); if (toggle) { toggle.textContent = locale === "zh" ? "EN" : "中"; toggle.setAttribute("aria-label", copy.language); toggle.lang = locale === "zh" ? "en" : "zh-CN"; } }
function setupLanguage() { applyLocale(); $("[data-language-toggle]")?.addEventListener("click", () => { const next = locale === "zh" ? "en" : "zh", url = new URL(location.href); if (next === "en") url.searchParams.set("lang", "en"); else url.searchParams.delete("lang"); try { localStorage.setItem("guanzheng-language", next); } catch {} location.href = url.href; }); }
function setupTheme() { const toggle = $("[data-theme-toggle]"); const apply = (theme) => { document.documentElement.dataset.theme = theme; $("meta[name=theme-color]")?.setAttribute("content", theme === "dark" ? "#161814" : "#f9f5ed"); if (!toggle) return; const dark = theme === "dark"; toggle.innerHTML = dark ? MOON_ICON : SUN_ICON; toggle.setAttribute("aria-pressed", String(dark)); toggle.setAttribute("aria-label", dark ? t().themeLight : t().themeDark); }; apply(document.documentElement.dataset.theme === "dark" ? "dark" : "light"); toggle?.addEventListener("click", () => { const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; apply(next); try { localStorage.setItem("guanzheng-theme", next); } catch {} }); }
async function boot() { setupLanguage(); setupTheme(); addEventListener("hashchange", scrollToHash); document.querySelectorAll("[data-current-year]").forEach((node) => { node.textContent = new Date().getFullYear(); }); try { const posts = await loadPosts(); renderHome(posts); await renderPost(posts); } catch { if ($("#post-list")) $("#post-list").innerHTML = errorMarkup(t().indexError); if ($("#post-content")) $("#post-content").innerHTML = errorMarkup(t().indexError); if ($("#article-title")) $("#article-title").textContent = t().failed; $("#article-toc-wrap")?.setAttribute("hidden", ""); $("#article-actions")?.setAttribute("hidden", ""); $("#article")?.setAttribute("aria-busy", "false"); } }
boot();
