"""Build a single self-contained HTML of site/ for the private claude.ai preview link.

The artifact viewer allows scripts only from a few CDNs and fonts only as data URIs,
so this inlines the CSS, JS, images and fonts, and loads GSAP/Three.js from jsDelivr
(same versions as site/vendor/). Output: build/preview/index.html (gitignored).

    python3 tools/build_preview.py
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "build" / "preview" / "index.html"

CDN = {
    "vendor/gsap.min.js": "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js",
    "vendor/ScrollTrigger.min.js": "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js",
    "../vendor/three.module.min.js": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js",
}
MIME = {".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}


def data_uri(path: Path) -> str:
    if not path.exists():
        sys.exit(f"חסר קובץ: {path.relative_to(ROOT)}")
    return f"data:{MIME[path.suffix]};base64,{base64.b64encode(path.read_bytes()).decode()}"


def inline_urls(css: str, base: Path) -> str:
    return re.sub(r'url\("(?!data:)([^"]+)"\)', lambda m: f'url("{data_uri((base / m.group(1)).resolve())}")', css)


def build_css() -> str:
    css_path = SITE / "css" / "site.css"
    css = css_path.read_text(encoding="utf-8")

    def expand_import(m):
        imported = (css_path.parent / m.group(1)).resolve()
        return inline_urls(imported.read_text(encoding="utf-8"), imported.parent)

    css = re.sub(r'@import "([^"]+)";', expand_import, css)
    return inline_urls(css, css_path.parent)


def main():
    html = (SITE / "index.html").read_text(encoding="utf-8")
    title = re.search(r"<title>.*?</title>", html, re.S).group(0)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    html_attrs = dict(re.findall(r'(\w[\w-]*)="([^"]*)"', re.search(r"<html([^>]*)>", html).group(1)))

    body = re.sub(r'src="(img/[^"]+)"', lambda m: f'src="{data_uri(SITE / m.group(1))}"', body)

    main_js = (SITE / "js" / "main.js").read_text(encoding="utf-8")
    cloth_js = (SITE / "js" / "cloth.js").read_text(encoding="utf-8")
    cloth_js = cloth_js.replace('"../vendor/three.module.min.js"', f'"{CDN["../vendor/three.module.min.js"]}"')

    boot = (
        "<script>(()=>{const d=document.documentElement;"
        f"d.lang={html_attrs['lang']!r};d.dir={html_attrs['dir']!r};"
        f"d.dataset.display={html_attrs['data-display']!r};d.classList.add('js')}})()</script>"
    )
    out = "\n".join([
        title,
        '<meta name="robots" content="noindex">',
        f"<style>\n{build_css()}\n</style>",
        boot,
        f'<script src="{CDN["vendor/gsap.min.js"]}"></script>',
        f'<script src="{CDN["vendor/ScrollTrigger.min.js"]}"></script>',
        body.strip(),
        f"<script>\n{main_js}\n</script>",
        f'<script type="module">\n{cloth_js}\n</script>',
        "",
    ])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(out, encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} · {len(out.encode()) // 1024} KB")


if __name__ == "__main__":
    main()
