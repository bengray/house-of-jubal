#!/usr/bin/env python3
"""Make web-sized WebP images from source-images/ and write src/_data/images.json.

Run from the project root after adding or replacing a photo:
    python3 scripts/build-images.py
Needs Pillow (pip install Pillow). Each image is keyed by its path under
source-images/ without the extension, e.g. "guitars/petros".
"""
import json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "source-images"
OUT = ROOT / "src" / "assets" / "img"
WIDTHS = [480, 800, 1200, 1600, 2000]
MAX = {"swatches": 240, "logo": 900}  # cap small things

manifest = {}
for f in sorted(SRC.rglob("*")):
    if f.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        continue
    rel = f.relative_to(SRC).with_suffix("")
    key = rel.as_posix()
    im = Image.open(f)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    cap = MAX.get(rel.parts[0], im.width)
    widths = sorted({w for w in WIDTHS if w < min(im.width, cap)} | {min(im.width, cap)})
    (OUT / rel.parent).mkdir(parents=True, exist_ok=True)
    for w in widths:
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(OUT / f"{rel}-{w}.webp", "WEBP", quality=80, method=6)
    top = widths[-1]
    manifest[key] = {"widths": widths, "width": top, "height": round(im.height * top / im.width)}
    print(f"{key}: {widths}")

(ROOT / "src" / "_data" / "images.json").write_text(json.dumps(manifest, indent=2) + "\n")
