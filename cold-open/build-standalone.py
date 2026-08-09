#!/usr/bin/env python3
"""
Bundle Cold Open into a single self-contained HTML file.

Inlines the stylesheet, all four scripts, and both fonts (as data URIs), so
the result has zero external requests: it can be emailed, dropped on a USB
stick, opened offline, or pasted into a host that only accepts one file.

    python3 build-standalone.py [output.html]

Defaults to writing cold-open-standalone.html next to this script.

Note: the microphone needs a secure context. The bundle works from a
file:// path in Chrome and Firefox, and from any https:// host. Recording
is skipped gracefully wherever the mic is unavailable.
"""
import base64
import pathlib
import re
import sys

SRC = pathlib.Path(__file__).resolve().parent
DEFAULT_OUT = SRC / "cold-open-standalone.html"
FONTS = ["fonts/bebas-neue-400.woff2", "fonts/manrope-var.woff2"]


def build() -> str:
    html = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "styles.css").read_text(encoding="utf-8")

    for rel in FONTS:
        b64 = base64.b64encode((SRC / rel).read_bytes()).decode("ascii")
        before = css
        css = css.replace(f"url('{rel}')", f"url(data:font/woff2;base64,{b64})")
        if css == before:
            raise SystemExit(f"error: no reference to {rel} found in styles.css")

    if "fonts/" in css:
        raise SystemExit("error: a font reference survived inlining")

    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    script_srcs = re.findall(r'<script src="([^"]+)"></script>', body)
    body = re.sub(r'<script src="[^"]+"></script>\s*', "", body)
    scripts = "\n".join(
        f"<script>\n{(SRC / name).read_text(encoding='utf-8')}\n</script>"
        for name in script_srcs
    )

    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    head = re.sub(r'\s*<link rel="stylesheet"[^>]*>', "", head)

    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n"
        f"{head.strip()}\n<style>\n{css}\n</style>\n</head>\n<body>\n"
        f"{body.strip()}\n\n{scripts}\n</body>\n</html>\n"
    )


if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    content = build()
    out.write_text(content, encoding="utf-8")
    print(f"wrote {out} ({len(content.encode('utf-8')) / 1024:.0f} KB, no external requests)")
