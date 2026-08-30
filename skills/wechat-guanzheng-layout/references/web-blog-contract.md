# Guanzheng GitHub Blog contract

Read this reference only when preparing the web Blog channel.

## Repository identity

- Git remote: `GuanZhengPM/guanzhengpm.github.io`
- Static entry points: `index.html`, `post.html`, `app.js`, `posts.json`
- Article directory: `posts/`
- Required scripts: `scripts/build-index.mjs`, `scripts/check-posts.mjs`

Do not stage content in an unrelated empty Git repository. Prefer a clean, current clone of the exact remote.

## Bilingual post model

Each article has one list entry and one ID. Chinese and English are separate Markdown files under `languages.zh` and `languages.en`:

```json
{
  "id": "2026-08-bonus",
  "date": "2026-08-30",
  "languages": {
    "zh": {
      "file": "posts/2026-08-bonus-long-context-reasoning.md",
      "title": "中文标题"
    },
    "en": {
      "file": "posts/2026-08-bonus-long-context-reasoning.en.md",
      "title": "English title"
    }
  }
}
```

The build script adds `words`, `minutes`, and H2 `sections`. Do not hand-maintain those generated values.

## Markdown rules

- The title lives in `posts.json`; post Markdown must not contain a top-level H1 or the page will duplicate its title.
- Preserve H2/H3 structure and paragraph boundaries between languages.
- Both languages must contain the same number and ordering of H2 sections unless the user explicitly chooses a localized structure.
- Use separate `.md` and `.en.md` files; do not combine languages in one file.

## URLs and ordering

- Chinese: `https://guanzhengpm.github.io/post.html?id=<ID>`
- English: `https://guanzhengpm.github.io/post.html?id=<ID>&lang=en`
- The list is sorted by `date` newest-first. Preserve one card per ID.
- The WeChat source line uses the canonical Chinese URL without `#section-*`.

## Validation and publication

Run:

```bash
npm run build
npm run check
git diff --check
```

Then preview the list, Chinese page, and English page locally. Staging is complete when all checks pass and only intended files are changed.

Commit/push and WeChat paste/publish are separate external mutations. Never infer them from a request to “排版” or “准备”.
