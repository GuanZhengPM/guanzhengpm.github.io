import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const posts = JSON.parse(await readFile(join(rootDir, "posts.json"), "utf8"));
const ids = new Set();
let valid = true;

for (const post of posts) {
  const missing = ["id", "file", "title", "date"].filter((key) => !post[key]);
  if (missing.length) {
    console.error(`${post.id || "未知文章"} 缺少：${missing.join(", ")}`);
    valid = false;
  }
  if (ids.has(post.id)) {
    console.error(`文章 id 重复：${post.id}`);
    valid = false;
  }
  ids.add(post.id);
  if (!existsSync(join(rootDir, post.file))) {
    console.error(`找不到文章文件：${post.file}`);
    valid = false;
  }
}

if (!valid) process.exit(1);
console.log(`检查通过：${posts.length} 篇文章。`);
