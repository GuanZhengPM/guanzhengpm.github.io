const POSTS_URL = "./posts.json";

const $ = (selector, parent = document) => parent.querySelector(selector);

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

function errorMarkup(message) {
  return `<p class="load-error">${escapeHtml(message)} 请刷新页面后重试。</p>`;
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
          <div>
            <h3><a href="${postHref(post)}">${escapeHtml(post.title)}</a></h3>
          </div>
        </article>
      `,
    )
    .join("");
}

function tocLabel(text) {
  const match = /^(\d+)\.【([^】]+)】/.exec(text);
  return match ? `${match[1]}. ${match[2]}` : text;
}

function renderInline(text) {
  let rendered = escapeHtml(text.trim());
  rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  rendered = rendered.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1 ↗</a>',
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
  return [
    `# ${post.title}`,
    "",
    markdown.trim(),
    "",
  ].join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("复制失败");
}

function setupMarkdownActions(post, markdown) {
  const actionsRoot = $("#article-actions");
  const copyButton = $("#copy-markdown");
  const downloadLink = $("#download-markdown");
  const statusRoot = $("#markdown-status");
  if (!actionsRoot || !copyButton || !downloadLink || !statusRoot) return;

  const fullMarkdown = markdownExport(post, markdown);
  const downloadUrl = URL.createObjectURL(new Blob([fullMarkdown], { type: "text/markdown;charset=utf-8" }));
  downloadLink.href = downloadUrl;
  downloadLink.download = `${post.id}.md`;
  copyButton.addEventListener("click", async () => {
    try {
      await copyText(fullMarkdown);
      statusRoot.textContent = "已复制";
    } catch {
      statusRoot.textContent = "复制失败";
    }
    window.setTimeout(() => {
      statusRoot.textContent = "";
    }, 1800);
  });
  actionsRoot.hidden = false;
}

function showArticleWordCount(contentRoot) {
  const wordCountRoot = $("#article-word-count");
  if (!wordCountRoot || !contentRoot) return;

  const characters = [...contentRoot.children]
    .filter((node) => !/^H[1-6]$/.test(node.tagName))
    .map((node) => node.textContent)
    .join("")
    .replace(/\s/g, "").length;

  const wordCount = `${new Intl.NumberFormat("zh-CN").format(characters)} 字`;
  wordCountRoot.textContent = wordCount;
  wordCountRoot.setAttribute("aria-label", `文章字数 ${wordCount}`);
}

function scrollToHash({ instant = false } = {}) {
  const id = window.location.hash.slice(1);
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
  target.scrollIntoView({ block: "start" });
  root.style.scrollBehavior = previousScrollBehavior;
}

function setupArticleToc(hasItems) {
  const tocSection = $(".article-toc");
  const tocRoot = $("#article-toc");
  const toggle = $("#toc-toggle");
  const toggleLabel = $("#toc-toggle-label");
  if (!tocSection || !tocRoot || !toggle || !toggleLabel) return;

  if (!hasItems) {
    tocSection.hidden = true;
    return;
  }

  const setTocExpanded = (expanded) => {
    tocRoot.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "收起目录" : "展开目录");
    toggleLabel.textContent = expanded ? "收起" : "展开";
  };

  const links = [...tocRoot.querySelectorAll("a")];
  const setCurrentLink = () => {
    const hash = window.location.hash;
    links.forEach((link) => {
      if (link.getAttribute("href") === hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  toggle.onclick = () => setTocExpanded(toggle.getAttribute("aria-expanded") !== "true");
  tocRoot.addEventListener("click", (event) => {
    if (!event.target.closest?.("a")) return;
    window.requestAnimationFrame(() => {
      setCurrentLink();
      if (window.matchMedia("(max-width: 1359px)").matches) setTocExpanded(false);
    });
  });
  window.addEventListener("hashchange", setCurrentLink);
  setTocExpanded(false);
  setCurrentLink();
}

async function renderPost(posts) {
  const articleRoot = $("#article");
  if (!articleRoot) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const post = posts.find((item) => item.id === id) || posts[0];
  if (!post) {
    articleRoot.innerHTML = errorMarkup("找不到这篇文章。");
    articleRoot.setAttribute("aria-busy", "false");
    return;
  }

  const titleRoot = $("#article-title");
  const contentRoot = $("#post-content");
  const tocRoot = $("#article-toc");

  titleRoot.textContent = post.title;
  document.title = `${post.title} · Guanzheng's Blog`;

  try {
    const response = await fetch(`./${post.file}`, { cache: "no-store" });
    if (!response.ok) throw new Error("文章正文不存在");
    const rawMarkdown = await response.text();
    const { html, headings } = markdownToHtml(rawMarkdown);
    contentRoot.innerHTML = html;
    showArticleWordCount(contentRoot);
    tocRoot.innerHTML = headings
      .filter((heading) => heading.level === 2)
      .map((heading) => {
        const fullLabel = escapeHtml(heading.text);
        return `<a href="#${heading.id}" aria-label="${fullLabel}" title="${fullLabel}">${escapeHtml(tocLabel(heading.text))}</a>`;
      })
      .join("");
    setupArticleToc(Boolean(tocRoot.innerHTML));
    setupMarkdownActions(post, rawMarkdown);
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#181918" : "#f7f6f1");
    if (!themeToggle) return;
    const isDark = theme === "dark";
    themeToggle.textContent = isDark ? "☀" : "◐";
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
  }
}

boot();
