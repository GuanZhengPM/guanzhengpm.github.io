// 把每篇文章的字数、阅读时长和章节写回 posts.json，
// 首页就不用为了显示这些去抓每一篇正文。
// 新增或改动文章后跑一次：npm run build
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CHARS_PER_MINUTE = 340;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const postsPath = join(rootDir, "posts.json");
const posts = JSON.parse(await readFile(postsPath, "utf8"));

/** 标题 id 必须和 app.js 里 markdownToHtml 生成的一致：h2 和 h3 共用一个计数器。 */
function collectSections(markdown) {
  const sections = [];
  let count = 0;
  let inCode = false;

  for (const rawLine of markdown.replaceAll("\r", "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!heading) continue;

    const id = `section-${++count}`;
    if (heading[1].length === 2) sections.push({ id, label: heading[2] });
  }

  return sections;
}

/** 正文字数：去掉标题行和 markdown 记号后的非空白字符数。 */
function countWords(markdown) {
  const chunks = [];
  let inCode = false;

  for (const rawLine of markdown.replaceAll("\r", "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      chunks.push(rawLine);
      continue;
    }
    if (!line || line === "---" || /^#{1,6}\s+/.test(line)) continue;

    chunks.push(line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").replace(/^>\s?/, ""));
  }

  return chunks
    .join("")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1")
    .replace(/[`*]/g, "")
    .replace(/\s/g, "").length;
}

const built = [];
for (const post of posts) {
  const markdown = await readFile(join(rootDir, post.file), "utf8");
  const words = countWords(markdown);
  built.push({
    ...post,
    words,
    minutes: Math.max(1, Math.ceil(words / CHARS_PER_MINUTE)),
    sections: collectSections(markdown),
  });
  console.log(`${post.id}：${words} 字，${built.at(-1).sections.length} 节`);
}

await writeFile(postsPath, `${JSON.stringify(built, null, 2)}\n`, "utf8");
console.log(`已写入 posts.json：${built.length} 篇文章。`);
