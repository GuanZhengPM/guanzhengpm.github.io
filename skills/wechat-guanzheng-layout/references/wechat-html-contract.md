# WeChat paste-safe HTML contract

Use this reference when generating or diagnosing HTML.

## Clean output

- Output one root `<section>` fragment only. Do not include doctype, html, head, body, style, or script tags.
- Put all CSS inline. Do not use class, id, external stylesheets, CSS variables, media queries, animations, or positioned elements.
- Safe tags for this renderer: `section`, `p`, `span`, `strong`, `em`, `a`, `ul`, `ol`, `li`, `code`, `img`, `br`.
- Every visible text node must be inside `<span leaf="">` or another inline element containing such spans. This reduces rich-text style loss when pasted.
- Do not use `div`, table, iframe, form controls, SVG, canvas, video, or audio.

## Styles

- Avoid `position`, `float`, `display:grid`, and fixed widths wider than the article body.
- Images use `max-width:100%;height:auto;display:block;margin-left:auto;margin-right:auto`.
- Use only normal web-safe font stacks. WeChat does not preserve external fonts.
- Keep body and heading text selectable; do not turn text into images.

## Links and references

- Convert ordinary external Markdown links into plain numbered references at the end by default.
- Preserve the visible link label in the paragraph and append `[n]`.
- The reference list shows full URLs as selectable text; do not rely on external links remaining clickable after paste.

## Preview versus copied body

The preview file may contain a document shell, copy button, and script. The clean output copied into WeChat must remain the root section fragment and contain none of the preview controls.

## QA

Require zero validator errors. Then visually inspect mobile width for:

- title not duplicated;
- section numbers and labels aligned;
- no orphaned headings;
- no tiny type or dense walls of text;
- no stretched images;
- code and long URLs not clipping;
- one signature at most;
- no placeholders or invented content.
