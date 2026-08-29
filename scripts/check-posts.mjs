import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const posts = JSON.parse(await readFile(join(rootDir, "posts.json"), "utf8"));
const ids = new Set();
let valid = true;

for (const post of posts) {
  if (!post.id || !post.date) { console.error("文章缺少 id 或 date"); valid = false; }
  if (ids.has(post.id)) { console.error(`文章 id 重复：${post.id}`); valid = false; }
  ids.add(post.id);
  for (const language of ["zh", "en"]) {
    const entry = post.languages?.[language];
    if (!entry?.file || !entry?.title) { console.error(`${post.id} 缺少 ${language} 的 file 或 title`); valid = false; continue; }
    if (!existsSync(join(rootDir, entry.file))) { console.error(`找不到文章文件：${entry.file}`); valid = false; }
    if (!Array.isArray(entry.sections) || !Number.isFinite(entry.words) || !Number.isFinite(entry.minutes)) { console.error(`${post.id} ${language} 尚未构建，请运行 npm run build`); valid = false; }
  }
}

if (!valid) process.exit(1);
console.log(`检查通过：${posts.length} 篇双语文章。`);
