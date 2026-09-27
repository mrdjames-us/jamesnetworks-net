#!/usr/bin/env python3
"""Shrink the HCC homepage images (reproducible; Pillow 12.3.0).

- assets/hcc-mark.png (1536x1024, ~1.2 MB) -> 180x180 square crop of the mark,
  64-colour palette PNG. It is shown at 44px and used as favicon/apple-touch.
- assets/hcc-hero-atmosphere.png, assets/hcc-desk-still.png (1536x1024,
  1.7-1.9 MB) -> 1536px WebP q50 next to them. index.html serves the WebP via
  <picture>; the PNG stays as the <img> fallback for non-WebP browsers.

Run from the repo root: python3 tools/optimize-hcc-images.py
"""
from pathlib import Path

from PIL import Image

ASSETS = Path("assets")


def mark() -> None:
    src = Image.open(ASSETS / "hcc-mark.png").convert("RGB")
    if src.size == (180, 180):
        print("hcc-mark.png already 180x180, skipping")
        return
    # The mark sits around (769, 528) in the 1536x1024 canvas; crop a square.
    square = src.crop((389, 148, 1149, 908)).resize((180, 180), Image.LANCZOS)
    square.quantize(colors=64, method=Image.Quantize.MEDIANCUT).save(
        ASSETS / "hcc-mark.png", optimize=True
    )


def webp(name: str) -> None:
    src = Image.open(ASSETS / f"{name}.png").convert("RGB")
    if src.width != 1536:
        src = src.resize((1536, round(src.height * 1536 / src.width)), Image.LANCZOS)
    src.save(ASSETS / f"{name}.webp", quality=50, method=6)


if __name__ == "__main__":
    mark()
    webp("hcc-hero-atmosphere")
    webp("hcc-desk-still")
    for f in ("hcc-mark.png", "hcc-hero-atmosphere.webp", "hcc-desk-still.webp"):
        print(f, (ASSETS / f).stat().st_size, "bytes")
