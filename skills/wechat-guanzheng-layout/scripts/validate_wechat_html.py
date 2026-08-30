#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ALLOWED_TAGS = {"section", "p", "span", "strong", "em", "a", "ul", "ol", "li", "code", "img", "br"}
FORBIDDEN_STYLE = re.compile(r"(?:position\s*:|float\s*:|display\s*:\s*grid|@media|@keyframes|var\s*\()", re.I)


class Validator(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.errors: list[str] = []
        self.stack: list[tuple[str, dict[str, str | None]]] = []
        self.root_tags: list[str] = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if not self.stack:
            self.root_tags.append(tag)
        if tag not in ALLOWED_TAGS:
            self.errors.append(f"forbidden tag <{tag}>")
        for attr in ("class", "id"):
            if attr in values:
                self.errors.append(f"forbidden attribute {attr} on <{tag}>")
        style = values.get("style") or ""
        if FORBIDDEN_STYLE.search(style):
            self.errors.append(f"forbidden style on <{tag}>: {style}")
        if tag == "img" and not values.get("src"):
            self.errors.append("image without src")
        self.stack.append((tag, values))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append(f"unexpected closing tag </{tag}>")
            return
        opened, _ = self.stack.pop()
        if opened != tag:
            self.errors.append(f"tag mismatch: <{opened}> closed by </{tag}>")

    def handle_data(self, data):
        if not data.strip() or not self.stack:
            return
        tag, attrs = self.stack[-1]
        if tag == "span" and "leaf" in attrs:
            return
        self.errors.append(f"text outside <span leaf>: {data.strip()[:60]!r}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Guanzheng WeChat HTML")
    parser.add_argument("html", type=Path)
    args = parser.parse_args()
    text = args.html.read_text(encoding="utf-8")
    validator = Validator()
    validator.feed(text)
    if validator.stack:
        validator.errors.append("unclosed tags remain")
    if validator.root_tags != ["section"]:
        validator.errors.append(f"expected one root section, found {validator.root_tags}")
    if re.search(r"<!doctype|<html|<head|<body|<style|<script", text, re.I):
        validator.errors.append("document shell or executable style/script found")
    if "{{" in text or "TODO" in text or "待补" in text:
        validator.errors.append("unresolved placeholder found")
    if validator.errors:
        for error in sorted(set(validator.errors)):
            print(f"ERROR: {error}")
        return 1
    print(f"OK: {args.html} is paste-safe ({len(text.encode('utf-8'))} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
