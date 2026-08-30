# Guanzheng Blog visual language

Use this reference only for visual decisions.

## Design intent

The WeChat version should feel like the same publication as Guanzheng Blog, adapted to a white mobile reading surface. It is an editorial essay layout, not a poster, dashboard, slide, or card collection.

## Palette

| Role | Color | Use |
|---|---|---|
| Warm background | `#F9F5ED` | Contents, quote, and signature surfaces |
| Light surface | `#FDFAF3` | Secondary subtle blocks |
| Ink | `#191917` | Titles and strongest emphasis |
| Body | `#24231F` | Main prose |
| Muted | `#4F4C46` | Captions and secondary labels |
| Faint | `#A8A59C` | Numbers and metadata |
| Rule | `#DDD8CA` | Thin separators and borders |
| Accent | `#B4531F` | Section labels, explicit highlights, small anchors |

The main WeChat canvas remains white. Warm surfaces should occupy a minority of the page. Do not flood the article with accent color.

## Typography and rhythm

- Use the native Chinese UI font stack: `-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif`.
- Body: about `16px`, `1.9` line height, `#24231F`, justified only when the editor preserves it cleanly.
- Section heading: about `21px`, `1.5` line height, semibold/bold, dark ink.
- H3: about `17px`, left accent rule, modest spacing.
- Paragraph gap: about `1.25em`; section gap: about `2.5em`.
- Thin rules, modest 6-10px radii, and no heavy shadow. Avoid gradients except a very subtle explicit Markdown highlight.

## Components

- Header title is entered in WeChat's title field, not duplicated inside the body.
- Source line: the first body block, `Blog: <canonical URL>`, 14px muted text with a selectable warm-accent link. It sits below WeChat's author metadata and above the contents card.
- Optional contents card: warm background, one line per H2, small accent number, no fake links.
- H2: small `SECTION 01` label plus the original heading text.
- H3: left terracotta rule.
- Quote: warm surface and left accent rule; no quotation-mark illustration.
- Code: dark ink surface, compact lines, horizontally scrollable only in preview; do not add fake window chrome.
- Image: natural size, centered, `max-width:100%`, never upscale small images.
- Signature: absent by default. Add one subtle terminal block only when explicitly requested and not already present.

## Anti-patterns

- No colorful theme mixing, decorative icons on every section, ticket metaphors, large numbered badges, dashed boxes, fake data cards, or repeated CTA blocks.
- Do not automatically underline keywords in every paragraph. Explicit author emphasis only.
- Do not insert a fabricated abstract, quote, author biography, QR placeholder, cover placeholder, or “点赞在看” copy.
