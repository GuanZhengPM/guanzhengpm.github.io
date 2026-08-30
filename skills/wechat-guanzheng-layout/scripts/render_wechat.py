#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import re
from pathlib import Path
from urllib.parse import urldefrag


FONT = "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif"
INK, BODY, MUTED, FAINT, LINE, ACCENT = "#191917", "#24231F", "#4F4C46", "#A8A59C", "#DDD8CA", "#B4531F"
WARM, SURFACE = "#F9F5ED", "#FDFAF3"


def leaf(text: str, style: str = "") -> str:
    attr = f' style="{style}"' if style else ""
    return f'<span leaf=""{attr}>{html.escape(text, quote=False)}</span>'


class Inline:
    def __init__(self):
        self.references: list[str] = []

    def render(self, text: str) -> str:
        tokens: list[str] = []

        def stash(fragment: str) -> str:
            tokens.append(fragment)
            return f"\x00{len(tokens)-1}\x00"

        def image_repl(match):
            alt, src = match.group(1), match.group(2)
            image = f'<img src="{html.escape(src, quote=True)}" alt="{html.escape(alt, quote=True)}" style="max-width:100%;height:auto;display:block;margin:22px auto 8px;"/>'
            if alt:
                image += f'<p style="margin:0 0 20px;text-align:center;color:{MUTED};font-size:13px;line-height:1.6;">{leaf(alt)}</p>'
            return stash(image)

        text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", image_repl, text)

        def link_repl(match):
            label, url = match.group(1), match.group(2)
            if url not in self.references:
                self.references.append(url)
            n = self.references.index(url) + 1
            return stash(leaf(label) + leaf(f"[{n}]", f"color:{ACCENT};font-size:12px;vertical-align:super;"))

        text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", link_repl, text)
        text = re.sub(r"`([^`]+)`", lambda m: stash(f'<code style="padding:2px 5px;border-radius:4px;background:{WARM};color:{INK};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;">{leaf(m.group(1))}</code>'), text)
        text = re.sub(r"\*\*([^*]+)\*\*", lambda m: stash(f'<strong style="color:{INK};font-weight:700;">{leaf(m.group(1))}</strong>'), text)
        text = re.sub(r"==([^=]+)==", lambda m: stash(leaf(m.group(1), f"color:{INK};background:linear-gradient(transparent 62%,#F1D2BF 62%);")), text)
        escaped = leaf(text)
        escaped = re.sub(r"\x00(\d+)\x00", lambda m: tokens[int(m.group(1))], escaped)
        return escaped


def parse(path: Path):
    lines = path.read_text(encoding="utf-8").replace("\r", "").splitlines()
    title = ""
    blocks: list[tuple[str, str | list[str]]] = []
    paragraph: list[str] = []
    code: list[str] | None = None
    list_kind: str | None = None
    list_items: list[str] = []

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            blocks.append(("p", " ".join(x.strip() for x in paragraph)))
            paragraph = []

    def flush_list():
        nonlocal list_kind, list_items
        if list_items:
            blocks.append((list_kind or "ul", list_items[:]))
            list_items = []
            list_kind = None

    for raw in lines:
        line = raw.strip()
        if line.startswith("```"):
            flush_paragraph(); flush_list()
            if code is None:
                code = []
            else:
                blocks.append(("code", code)); code = None
            continue
        if code is not None:
            code.append(raw)
            continue
        if not line:
            flush_paragraph(); flush_list(); continue
        if line.startswith("# "):
            title = line[2:].strip(); continue
        if line.startswith("## "):
            flush_paragraph(); flush_list(); blocks.append(("h2", line[3:].strip())); continue
        if line.startswith("### "):
            flush_paragraph(); flush_list(); blocks.append(("h3", line[4:].strip())); continue
        if line in {"---", "***"}:
            flush_paragraph(); flush_list(); blocks.append(("hr", "")); continue
        if line.startswith(">"):
            flush_paragraph(); flush_list(); blocks.append(("quote", line.lstrip("> "))); continue
        ordered = re.match(r"^\d+[.)、]\s*(.+)$", line)
        unordered = re.match(r"^[-*+]\s+(.+)$", line)
        if ordered or unordered:
            flush_paragraph()
            next_kind = "ol" if ordered else "ul"
            if list_kind and list_kind != next_kind: flush_list()
            list_kind = next_kind; list_items.append((ordered or unordered).group(1)); continue
        paragraph.append(line)
    flush_paragraph(); flush_list()
    if code is not None: blocks.append(("code", code))
    return title, blocks


def render(source: Path, signature: str | None, source_url: str | None) -> tuple[str, str]:
    title, blocks = parse(source)
    inline = Inline()
    headings = [text for kind, text in blocks if kind == "h2"]
    out = [f'<section style="max-width:677px;margin:0 auto;padding:12px 8px 28px;color:{BODY};font-family:{FONT};font-size:16px;line-height:1.9;">']
    if source_url:
        canonical_url, _ = urldefrag(source_url.strip())
        if not re.match(r"^https?://", canonical_url, re.I):
            raise ValueError("--source-url must start with http:// or https://")
        escaped_url = html.escape(canonical_url, quote=True)
        out.append(f'<p style="margin:4px 0 30px;color:{MUTED};font-size:14px;line-height:1.7;word-break:break-all;">{leaf("Blog: ")}<a href="{escaped_url}" style="color:{ACCENT};text-decoration:underline;text-decoration-color:{LINE};">{leaf(canonical_url)}</a></p>')
    if len(headings) >= 4:
        out.append(f'<section style="margin:8px 0 34px;padding:18px 20px;border:1px solid {LINE};border-radius:8px;background:{WARM};">')
        out.append(f'<p style="margin:0 0 10px;color:{ACCENT};font-size:12px;font-weight:700;letter-spacing:1px;">{leaf("CONTENTS")}</p>')
        for i, heading in enumerate(headings, 1):
            label = re.sub(r"^\d+\s*[.、]\s*", "", str(heading))
            out.append(f'<p style="margin:5px 0;color:{MUTED};font-size:14px;line-height:1.65;">{leaf(f"{i:02d}", f"display:inline-block;width:34px;color:{FAINT};font-variant-numeric:tabular-nums;")}{inline.render(label)}</p>')
        out.append('</section>')
    section_number = 0
    for kind, value in blocks:
        if kind == "h2":
            section_number += 1
            text = str(value)
            match = re.match(r"^\d+\s*[.、]\s*[【[]([^】\]]+)[】\]]\s*(.*)$", text)
            label, heading = (match.group(1), match.group(2)) if match else ("SECTION", re.sub(r"^\d+\s*[.、]\s*", "", text))
            out.append(f'<section style="margin:42px 0 18px;padding-top:2px;border-top:1px solid {LINE};">')
            out.append(f'<p style="margin:12px 0 7px;color:{ACCENT};font-size:12px;font-weight:700;letter-spacing:.8px;">{leaf(f"SECTION {section_number:02d} · {label}")}</p>')
            out.append(f'<p style="margin:0;color:{INK};font-size:21px;font-weight:700;line-height:1.5;">{inline.render(heading or text)}</p></section>')
        elif kind == "h3":
            out.append(f'<p style="margin:28px 0 12px;padding-left:12px;border-left:3px solid {ACCENT};color:{INK};font-size:17px;font-weight:700;line-height:1.6;">{inline.render(str(value))}</p>')
        elif kind == "p":
            out.append(f'<p style="margin:0 0 1.25em;color:{BODY};font-size:16px;line-height:1.9;text-align:justify;letter-spacing:.01em;">{inline.render(str(value))}</p>')
        elif kind == "quote":
            out.append(f'<section style="margin:22px 0;padding:16px 18px;border-left:3px solid {ACCENT};background:{WARM};"><p style="margin:0;color:{MUTED};font-size:15px;line-height:1.8;">{inline.render(str(value))}</p></section>')
        elif kind in {"ul", "ol"}:
            tag = kind
            out.append(f'<{tag} style="margin:0 0 1.25em;padding-left:1.4em;color:{BODY};font-size:16px;line-height:1.85;">')
            for item in value:
                out.append(f'<li style="margin:7px 0;padding-left:3px;">{inline.render(item)}</li>')
            out.append(f'</{tag}>')
        elif kind == "code":
            out.append(f'<section style="margin:22px 0;padding:16px 18px;border-radius:8px;background:{INK};overflow-wrap:anywhere;">')
            for line in value:
                out.append(f'<p style="margin:0;color:#F9F5ED;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.65;">{leaf(line or " ")}</p>')
            out.append('</section>')
        elif kind == "hr":
            out.append(f'<section style="height:1px;margin:30px 0;background:{LINE};"><span leaf=""> </span></section>')
    if inline.references:
        out.append(f'<section style="margin:38px 0 0;padding-top:16px;border-top:1px solid {LINE};">')
        out.append(f'<p style="margin:0 0 10px;color:{ACCENT};font-size:12px;font-weight:700;letter-spacing:.8px;">{leaf("REFERENCES")}</p>')
        for i, url in enumerate(inline.references, 1):
            out.append(f'<p style="margin:6px 0;color:{MUTED};font-size:12px;line-height:1.65;word-break:break-all;">{leaf(f"[{i}] {url}")}</p>')
        out.append('</section>')
    if signature:
        out.append(f'<section style="margin:42px 0 0;padding:18px 20px;border-top:1px solid {LINE};background:{SURFACE};">')
        out.append(f'<p style="margin:0;color:{ACCENT};font-size:12px;font-weight:700;letter-spacing:1px;">{leaf("GUANZHENG BLOG")}</p>')
        out.append(f'<p style="margin:6px 0 0;color:{MUTED};font-size:14px;line-height:1.6;">{leaf(signature)}</p></section>')
    out.append('</section>')
    return title, "\n".join(out)


def preview(title: str, clean_html: str) -> str:
    escaped_title = html.escape(title or "WeChat Preview")
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escaped_title} - 公众号预览</title><style>body{{margin:0;background:#ece9e2;font-family:{FONT}}}.bar{{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#191917;color:#fff}}button{{border:0;border-radius:999px;padding:8px 16px;background:#b4531f;color:#fff;font:inherit;cursor:pointer}}main{{width:min(100% - 24px,677px);margin:18px auto;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.08)}}small{{color:#c9c5bd}}</style></head><body><div class="bar"><small>{escaped_title}</small><button id="copy">复制正文</button></div><main id="copy-root">{clean_html}</main><script>document.getElementById('copy').onclick=async()=>{{const root=document.getElementById('copy-root');const html=root.innerHTML;const text=root.innerText;await navigator.clipboard.write([new ClipboardItem({{'text/html':new Blob([html],{{type:'text/html'}}),'text/plain':new Blob([text],{{type:'text/plain'}})}})]);document.getElementById('copy').textContent='已复制';}};</script></body></html>'''


def main():
    parser = argparse.ArgumentParser(description="Render Markdown in Guanzheng Blog WeChat style")
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--source-url")
    parser.add_argument("--signature")
    args = parser.parse_args()
    title, clean_html = render(args.source, args.signature, args.source_url)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(clean_html, encoding="utf-8")
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        args.preview.write_text(preview(title, clean_html), encoding="utf-8")
    print(f"title={title}")
    print(f"html={args.output}")
    if args.preview: print(f"preview={args.preview}")


if __name__ == "__main__":
    main()
