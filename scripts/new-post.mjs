import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const [period, title, rawSlug = "monthly-note"] = process.argv.slice(2);

if (!/^\d{4}-\d{2}$/.test(period || "") || !title) {
  console.error('用法：npm run new -- 2026-09 "九月：AI 产品的新观察" ai-product-notes');
  process.exit(1);
}

const slug = rawSlug
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "") || "monthly-note";
const id = period;
const filename = `${period}-${slug}.md`;
const relativeFile = `posts/${filename}`;
const postPath = join(rootDir, relativeFile);
const indexPath = join(rootDir, "posts.json");
const posts = JSON.parse(await readFile(indexPath, "utf8"));

if (posts.some((post) => post.id === id)) {
  console.error(`文章 ${id} 已存在。每月一篇时请使用新的 YYYY-MM。`);
  process.exit(1);
}

if (existsSync(postPath)) {
  console.error(`${relativeFile} 已存在。`);
  process.exit(1);
}

const markdown = `## 这期想聊什么\n\n用两三句话写清楚这篇文章要解决的问题。\n\n## 正文\n\n从这里开始写。\n\n## 留给下个月的问题\n\n- 要继续验证什么？\n- 哪个判断需要更新？\n`;

await mkdir(dirname(postPath), { recursive: true });
await writeFile(postPath, markdown, "utf8");
posts.unshift({
  id,
  file: relativeFile,
  title,
  date: `${period}-01`,
});
await writeFile(indexPath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");

console.log(`已创建 ${relativeFile}，并更新 posts.json。`);
