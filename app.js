const POSTS_URL = "./posts.json";
const CHARS_PER_MINUTE = 340;

const $ = (selector, parent = document) => parent.querySelector(selector);

const SUN_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"></circle><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"></path></svg>`;
const MOON_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function postHref(post) {
  return `./post.html?id=${encodeURIComponent(post.id)}`;
}

function postTitleMarkup(title) {
  const match = /^(\d{4}M\d{1,2}——)(.+)$/.exec(title);
  if (!match) return escapeHtml(title);

  return `<span class="article-title__date post-title__date">${escapeHtml(match[1])}</span><span class="article-title__subject">${escapeHtml(match[2])}</span>`;
}

function errorMarkup(message) {
  return `<p class="load-error">${escapeHtml(message)} 请刷新页面后重试。</p>`;
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  return match ? `${match[1]} · ${match[2]} · ${match[3]}` : String(value ?? "");
}

function readingMinutes(post) {
  if (Number.isFinite(post.minutes)) return post.minutes;
  if (Number.isFinite(post.words)) return Math.max(1, Math.ceil(post.words / CHARS_PER_MINUTE));
  return null;
}

/** 日期 · 字数 · 阅读时长，中间用小圆点隔开。 */
function metaMarkup(post) {
  const parts = [formatDate(post.date)];
  if (Number.isFinite(post.words)) parts.push(`${new Intl.NumberFormat("zh-CN").format(post.words)} 字`);
  const minutes = readingMinutes(post);
  if (minutes) parts.push(`约 ${minutes} 分钟`);

  return parts
    .map((part) => escapeHtml(part))
    .join('<span aria-hidden="true"></span>');
}

/** 「1.【保持主见】在职业生涯的早期……」→ 序号 1、短名「保持主见」。 */
function sectionLabel(text) {
  const bracketed = /^(\d+)\s*[.、]\s*【([^】]+)】/.exec(text);
  if (bracketed) return { num: bracketed[1], label: bracketed[2] };

  const numbered = /^(\d+)\s*[.、]\s*(.+)$/.exec(text);
  if (numbered) return { num: numbered[1], label: numbered[2] };

  return { num: null, label: text };
}

function sectionListMarkup(post) {
  const sections = Array.isArray(post.sections) ? post.sections : [];
  if (!sections.length) return "";

  const items = sections
    .map((section, index) => {
      const { num, label } = sectionLabel(section.label ?? "");
      const order = String(num ?? index + 1).padStart(2, "0");
      return `<a href="${postHref(post)}#${encodeURIComponent(section.id)}"><b class="num">${escapeHtml(order)}</b>${escapeHtml(label)}</a>`;
    })
    .join("");

  return `<nav class="post-sections" aria-label="章节">${items}</nav>`;
}

async function loadPosts() {
  const response = await fetch(POSTS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("无法读取文章索引");

  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error("文章索引格式不正确");

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderHome(posts) {
  const listRoot = $("#post-list");
  if (!listRoot) return;
  if (!posts.length) {
    listRoot.innerHTML = errorMarkup("还没有文章。");
    return;
  }

  listRoot.innerHTML = posts
    .map(
      (post) => `
        <article class="post-row">
          <p class="post-meta num">${metaMarkup(post)}</p>
          <h2><a href="${postHref(post)}">${postTitleMarkup(post.title)}</a></h2>
          ${sectionListMarkup(post)}
        </article>
      `,
    )
    .join("");
}

function renderInline(text) {
  let rendered = escapeHtml(text.trim());
  rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  rendered = rendered.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return rendered;
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll("\r", "").split("\n");
  const html = [];
  const headings = [];
  let paragraph = [];
  let listItems = [];
  let listType = null;
  let quote = [];
  let inCodeBlock = false;
  let codeLines = [];
  let headingCount = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const tag = listType === "ordered" ? "ol" : "ul";
    html.push(`<${tag}>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
    listItems = [];
    listType = null;
  };

  const flushQuote = () => {
    if (!quote.length) return;
    html.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };

  const flushCode = () => {
    if (!inCodeBlock) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    inCodeBlock = false;
  };

  const flushBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) flushCode();
      else {
        flushBlocks();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      flushBlocks();
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushBlocks();
      const level = heading[1].length;
      const text = heading[2];
      const id = `section-${++headingCount}`;
      headings.push({ id, text, level });
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      continue;
    }

    if (line === "---") {
      flushBlocks();
      continue;
    }

    const orderedItem = /^\d+\.\s+(.+)$/.exec(line);
    const unorderedItem = /^[-*]\s+(.+)$/.exec(line);
    if (orderedItem || unorderedItem) {
      flushParagraph();
      flushQuote();
      const nextType = orderedItem ? "ordered" : "unordered";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((orderedItem || unorderedItem)[1]);
      continue;
    }

    const quoteLine = /^>\s?(.+)$/.exec(line);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushBlocks();
  flushCode();
  return { html: html.join("\n"), headings };
}

function markdownExport(post, markdown) {
  return [`# ${post.title}`, "", markdown.trim(), ""].join("\n");
}

function setupMarkdownDownload(post, markdown) {
  const actionsRoot = $("#article-actions");
  const downloadLink = $("#download-markdown");
  if (!actionsRoot || !downloadLink) return;

  const fullMarkdown = markdownExport(post, markdown);
  const downloadUrl = URL.createObjectURL(new Blob([fullMarkdown], { type: "text/markdown;charset=utf-8" }));
  downloadLink.href = downloadUrl;
  downloadLink.download = `${post.id}.md`;
  actionsRoot.hidden = false;
}

function scrollToHash({ instant = false } = {}) {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  if (!instant) {
    target.scrollIntoView({ block: "start" });
    return;
  }

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  void root.offsetHeight;
  target.scrollIntoView({ block: "start", behavior: "auto" });
  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousScrollBehavior;
  });
}

/** 目录跟着滚动走，高亮当前所在章节。 */
function setupTocScrollSpy(links) {
  const targets = links
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter(Boolean);
  if (!targets.length) return;

  const setCurrent = (id) => {
    links.forEach((link) => {
      if (decodeURIComponent(link.hash.slice(1)) === id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      const first = targets.find((target) => visible.has(target.id));
      if (first) {
        setCurrent(first.id);
        return;
      }

      // 章节标题都滚出视口时，落在最后一个已经越过顶部的标题上。
      const passed = targets.filter((target) => target.getBoundingClientRect().top < 0);
      if (passed.length) setCurrent(passed[passed.length - 1].id);
    },
    { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
  );

  targets.forEach((target) => observer.observe(target));
  setCurrent(targets[0].id);
}

function setupArticleToc(headings) {
  const tocWrap = $("#article-toc-wrap");
  const tocRoot = $("#article-toc");
  if (!tocWrap || !tocRoot) return;

  const items = headings.filter((heading) => heading.level === 2);
  if (!items.length) {
    tocWrap.hidden = true;
    return;
  }

  tocRoot.innerHTML = items
    .map((heading, index) => {
      const { num, label } = sectionLabel(heading.text);
      const order = String(num ?? index + 1).padStart(2, "0");
      const full = escapeHtml(heading.text);
      return `<a href="#${encodeURIComponent(heading.id)}" title="${full}"><b class="num">${escapeHtml(order)}</b>${escapeHtml(label)}</a>`;
    })
    .join("");

  const links = [...tocRoot.querySelectorAll("a")];
  setupTocScrollSpy(links);

  // 宽到能放下侧栏时摊开，窄了收起；转屏或折叠屏展开时跟着变。
  const wideEnough = window.matchMedia("(min-width: 1080px)");
  const syncOpen = () => {
    tocWrap.open = wideEnough.matches;
  };
  syncOpen();
  wideEnough.addEventListener("change", syncOpen);
}

function setupReadingProgress() {
  const bar = $("[data-reading-progress]");
  if (!bar) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const root = document.documentElement;
    const scrollable = root.scrollHeight - root.clientHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, root.scrollTop / scrollable)) : 0;
    bar.style.width = `${(ratio * 100).toFixed(2)}%`;
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
}

async function renderPost(posts) {
  const articleRoot = $("#article");
  if (!articleRoot) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const post = id ? posts.find((item) => item.id === id) : posts[0];
  if (!post) {
    articleRoot.innerHTML = errorMarkup("找不到这篇文章。");
    articleRoot.setAttribute("aria-busy", "false");
    return;
  }

  const titleRoot = $("#article-title");
  const metaRoot = $("#article-meta");
  const contentRoot = $("#post-content");

  titleRoot.innerHTML = postTitleMarkup(post.title);
  document.title = `${post.title}·Guanzheng's Blog`;

  if (metaRoot) {
    metaRoot.innerHTML = metaMarkup(post);
    metaRoot.hidden = false;
  }

  try {
    const response = await fetch(`./${post.file}`, { cache: "no-store" });
    if (!response.ok) throw new Error("文章正文不存在");
    const rawMarkdown = await response.text();
    const { html, headings } = markdownToHtml(rawMarkdown);
    contentRoot.innerHTML = html;
    setupArticleToc(headings);
    setupMarkdownDownload(post, rawMarkdown);
    setupReadingProgress();
    articleRoot.setAttribute("aria-busy", "false");
    window.requestAnimationFrame(() => scrollToHash({ instant: true }));
  } catch (error) {
    contentRoot.innerHTML = errorMarkup("文章正文加载失败。");
    articleRoot.setAttribute("aria-busy", "false");
  }
}

function setupTheme() {
  const themeToggle = $("[data-theme-toggle]");
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#161814" : "#f9f5ed");
    if (!themeToggle) return;
    const isDark = theme === "dark";
    themeToggle.innerHTML = isDark ? MOON_ICON : SUN_ICON;
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "切换至浅色模式" : "切换至深色模式");
  };

  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(currentTheme);
  themeToggle?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      localStorage.setItem("guanzheng-theme", nextTheme);
    } catch {
      // 存储不可用时仍可正常切换。
    }
  });
}

async function boot() {
  setupTheme();
  window.addEventListener("hashchange", scrollToHash);
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  try {
    const posts = await loadPosts();
    renderHome(posts);
    await renderPost(posts);
  } catch (error) {
    $("#post-list") && ($("#post-list").innerHTML = errorMarkup("文章索引加载失败。"));
    $("#post-content") && ($("#post-content").innerHTML = errorMarkup("文章索引加载失败。"));
    $("#article-title") && ($("#article-title").textContent = "加载失败");
    $("#article-toc-wrap") && ($("#article-toc-wrap").hidden = true);
    $("#article-actions") && ($("#article-actions").hidden = true);
    $("#article")?.setAttribute("aria-busy", "false");
  }
}

boot();
