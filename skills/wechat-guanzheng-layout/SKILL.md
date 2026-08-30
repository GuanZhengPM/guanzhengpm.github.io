---
name: wechat-guanzheng-layout
description: "Prepare a finished Markdown article for both the bilingual Guanzheng GitHub Blog and WeChat Official Account: resolve or create the paired translation, stage web posts and index metadata, generate Guanzheng-styled paste-safe HTML and preview, and run deterministic QA. Use for Blog与公众号双端排版、公众号排版、GitHub Blog发文 or preparing an existing article for both channels. Do not use to write the original article or publish/push without explicit authorization."
---

# Guanzheng Blog 双端排版

Turn one finished Markdown article into two locally validated deliverable sets: a bilingual post staged in the Guanzheng GitHub Blog repository and a Chinese WeChat-ready HTML preview in the same restrained visual language.

## Boundaries

- Do not rewrite, summarize, add claims, or invent highlights. Format the supplied article.
- Preserve every paragraph, heading, quote, list, image, and code block unless the user explicitly asks for content edits.
- Preparing HTML and preview files does not authorize pasting into the WeChat editor. Confirm immediately before any browser paste or draft mutation. Publishing always requires a separate explicit confirmation.
- Updating a local Blog checkout does not authorize Git commit, push, or GitHub Pages publication. Require explicit authorization for those external actions.
- Do not copy third-party theme HTML or scripts. The bundled renderer and styles are original and specific to Guanzheng Blog.

## Design reference

The workflow design was informed by [isjiamu/gzh-design-skill](https://github.com/isjiamu/gzh-design-skill), especially its separation of theme rules, WeChat paste constraints, deterministic HTML validation, and copy-preview handoff. This skill does not copy that project's AGPL theme HTML, component library, or scripts; its Guanzheng Blog theme and Python implementation are independently written for this repository.

## Input and language pair

1. Resolve the finished Markdown source. If it is not Markdown, normalize it without changing meaning and show the inferred structure first.
2. Identify source language from the article, not only the filename. Locate the sibling translation (`name.en.md` or `name.zh.md`). If missing, translate faithfully while preserving H1/H2/H3 structure, paragraph boundaries, examples, tone, and all claims; save the paired Markdown. The user should only need to supply the original Markdown.
3. Extract or confirm article ID, publication date, Chinese title, English title, and a short ASCII slug. Do not infer a publication date that would change list ordering without telling the user.

## Web Blog workflow

Read [references/web-blog-contract.md](references/web-blog-contract.md), locate the clean `GuanZhengPM/guanzhengpm.github.io` checkout, then stage the bilingual post:

```bash
python3 <SKILL_ROOT>/scripts/stage_web_blog.py article.zh.md \
  --en-source article.en.md \
  --repo /path/to/guanzheng-blog \
  --id 2026-08-bonus \
  --date 2026-08-30 \
  --slug long-context-reasoning
```

The script strips duplicate H1s from post bodies, updates `posts.json`, keeps posts sorted newest-first, and runs the repository's build and check scripts. It never commits or pushes. Use `--update` only when intentionally replacing an existing entry.

## WeChat workflow

1. Read [references/brand-style.md](references/brand-style.md) for visual decisions and [references/wechat-html-contract.md](references/wechat-html-contract.md) for HTML constraints.
2. Use the Chinese Markdown. Keep the H1 as title metadata and outside the copied body.
3. Generate clean HTML and a preview. The canonical source URL uses the same web post ID:

   ```bash
   python3 <SKILL_ROOT>/scripts/render_wechat.py article.md \
     --output article.wechat.html \
     --preview article.wechat.preview.html \
     --source-url "https://guanzhengpm.github.io/post.html?id=..."
   ```

   The default has no generated ending block. Add `--signature "..."` only when the user explicitly asks for a signature and the source does not already contain one.
4. Validate the clean HTML. Errors must be zero before handoff:

   ```bash
   python3 <SKILL_ROOT>/scripts/validate_wechat_html.py article.wechat.html
   ```

5. Open the preview and visually inspect at a phone-like width. Check the beginning, at least one middle section, and the ending. Require readable density, intact headings, no clipped code/images, no duplicate title/signature, and no excessive boxes or highlights.

## Handoff

Report both channel states separately:

- Web: staged file paths, ID/date, Chinese and English URLs, word counts, section counts, repository checks, and whether the checkout is dirty or ready to commit.
- WeChat: clean HTML, preview, source URL, validator result, and visual QA result.

The normal manual WeChat workflow is: open preview, click “复制正文”, paste into WeChat, then review in WeChat's mobile preview.

## Formatting decisions

- Use one fixed brand theme, not a theme picker. The article's argument should dominate the decoration.
- Preserve numbered H2 headings. The renderer converts them into a small section label plus a strong title; it does not renumber the source.
- Only explicit Markdown emphasis becomes emphasis. `**bold**`, `==highlight==`, quotes, code, and images are styled; ordinary prose is left quiet.
- Convert ordinary external Markdown links into numbered references at the bottom. WeChat body links are unreliable outside its ecosystem.
- When a published Guanzheng Blog URL is known, pass it with `--source-url`. Render `Blog: <URL>` as the first body block, before contents and section 1. Use the canonical article URL without a `#section-*` fragment unless the user explicitly requests a deep link.
- Use a compact derived contents card only when the article has at least four H2 sections. This is navigation metadata, not new prose.
- Keep strongest accent treatments scarce: section numbers, explicit highlights, and an explicitly requested signature block at most.

## Publishing boundaries

If the user asks to place the result into an already-open WeChat editor:

1. Inspect the clean HTML and preview first.
2. Ask for confirmation immediately before copying/pasting because article content is being transmitted to WeChat.
3. Paste the rich content into the body only; fill title, author, summary, cover, original-link field, comments, and publish settings separately.
4. Save as draft unless the user explicitly requests a later publishing step. Never click preview/send/publish without action-time confirmation.

If the user asks to publish the web Blog, inspect the exact diff, run repository checks, commit only the intended post/index files, refresh remote state, and use a normal non-force push. Verify the live Chinese page, English `?lang=en` page, and newest-first list after deployment.
