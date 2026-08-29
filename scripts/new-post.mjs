import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const [period, zhTitle, enTitle, rawSlug = "monthly-note"] = process.argv.slice(2);
if (!/^\d{4}-\d{2}$/.test(period || "") || !zhTitle || !enTitle) {
  console.error('用法：npm run new -- 2026-09 "中文标题" "English title" ai-product-notes');
  process.exit(1);
}

const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "monthly-note";
const zhFile = `posts/${period}-${slug}.md`, enFile = `posts/${period}-${slug}.en.md`;
const indexPath = join(rootDir, "posts.json"), posts = JSON.parse(await readFile(indexPath, "utf8"));
if (posts.some((post) => post.id === period) || [zhFile, enFile].some((file) => existsSync(join(rootDir, file)))) {
  console.error(`${period} 或对应文章文件已存在。`); process.exit(1);
}

const zhMarkdown = `## 1.【本期主题】这一期想聊什么\n\n用两三句话写清楚这篇文章要解决的问题。\n\n## 2.【正文】从这里开始\n\n写下你的判断与依据。\n`;
const enMarkdown = `## 1. [This Month] What this issue is about\n\nExplain the question this post addresses in two or three sentences.\n\n## 2. [Main Essay] Start here\n\nWrite your judgment and the evidence behind it.\n`;
await mkdir(join(rootDir, "posts"), { recursive: true });
await writeFile(join(rootDir, zhFile), zhMarkdown, "utf8");
await writeFile(join(rootDir, enFile), enMarkdown, "utf8");
posts.unshift({ id: period, date: `${period}-01`, languages: { zh: { file: zhFile, title: zhTitle }, en: { file: enFile, title: enTitle } } });
await writeFile(indexPath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
console.log(`已创建 ${zhFile} 与 ${enFile}。完成内容后运行 npm run build。`);
