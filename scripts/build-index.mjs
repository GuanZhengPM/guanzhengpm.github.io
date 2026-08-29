import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SPEED = { zh: 340, en: 220 };
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsPath = join(rootDir, "posts.json");
const posts = JSON.parse(await readFile(postsPath, "utf8"));

function collectSections(markdown) {
  const sections = [];
  let count = 0, inCode = false;
  for (const rawLine of markdown.replaceAll("\r", "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) { inCode = !inCode; continue; }
    if (inCode) continue;
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!heading) continue;
    const id = `section-${++count}`;
    if (heading[1].length === 2) sections.push({ id, label: heading[2] });
  }
  return sections;
}

function prose(markdown) {
  const chunks = [];
  let inCode = false;
  for (const rawLine of markdown.replaceAll("\r", "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) { inCode = !inCode; continue; }
    if (!line || line === "---" || /^#{1,6}\s+/.test(line)) continue;
    chunks.push(line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").replace(/^>\s?/, ""));
  }
  return chunks.join(" ").replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1").replace(/[`*]/g, "");
}

function countWords(markdown, language) {
  const text = prose(markdown);
  if (language === "en") return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  return text.replace(/\s/g, "").length;
}

const built = [];
for (const post of posts) {
  const languages = {};
  for (const language of Object.keys(SPEED)) {
    const entry = post.languages?.[language];
    if (!entry) throw new Error(`${post.id} 缺少 ${language} 版本`);
    const markdown = await readFile(join(rootDir, entry.file), "utf8");
    const words = countWords(markdown, language);
    languages[language] = { ...entry, words, minutes: Math.max(1, Math.ceil(words / SPEED[language])), sections: collectSections(markdown) };
    console.log(`${post.id} ${language}：${words}，${languages[language].sections.length} 节`);
  }
  built.push({ id: post.id, date: post.date, languages });
}

await writeFile(postsPath, `${JSON.stringify(built, null, 2)}\n`, "utf8");
console.log(`已写入 posts.json：${built.length} 篇双语文章。`);
