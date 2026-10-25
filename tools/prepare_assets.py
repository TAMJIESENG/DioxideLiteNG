# -*- coding: utf-8 -*-
"""Derive web-ready imagery from the project's own asset pack.

Every output file is a downscaled/re-encoded derivative of an existing file under
assets/dioxideliteng/ — no stock photos, no generated imagery.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, ".."))
ROOT = os.path.abspath(os.path.join(SITE, ".."))
SRC = os.path.join(ROOT, "assets", "dioxideliteng")
OUT = os.path.join(SITE, "assets", "img")
os.makedirs(OUT, exist_ok=True)

JOBS = [
    # (source, target, max width, quality) —— 只保留品牌图标，界面主图由 make_mockups.py 生成
    ("icon.png", "brand-icon.webp", 512, 92),
    ("textures/launch/corridor.png", "bg-corridor.webp", 1600, 80),
]


def trim_white(img, tol=246, pad=0.03):
    """Crop the flat white margin around the liquid-glass blob."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    step = max(1, min(w, h) // 400)
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            if not (r > tol and g > tol and b > tol):
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    if maxx < 0:
        return img
    padx = int((maxx - minx) * pad)
    pady = int((maxy - miny) * pad)
    box = (max(0, minx - padx), max(0, miny - pady), min(w, maxx + padx), min(h, maxy + pady))
    return img.crop(box)


for rel, name, width, quality in JOBS:
    src = os.path.join(SRC, rel)
    img = Image.open(src)
    if name == "hero-liquid.webp":
        img = trim_white(img)
    img = img.convert("RGBA") if img.mode in ("P", "LA", "RGBA") else img.convert("RGB")
    if img.width > width:
        height = round(img.height * width / img.width)
        img = img.resize((width, height), Image.LANCZOS)
    dst = os.path.join(OUT, name)
    img.save(dst, "WEBP", quality=quality, method=6)
    print("%-22s %4dx%-4d %7.1f KB  <- %s" % (name, img.width, img.height, os.path.getsize(dst) / 1024.0, rel))

# favicon (small PNG keeps file:// favicons simple)
icon = Image.open(os.path.join(SRC, "icon.png"))
icon.resize((64, 64), Image.LANCZOS).save(os.path.join(OUT, "favicon.png"), "PNG", optimize=True)
print("favicon.png 64x64 %.1f KB" % (os.path.getsize(os.path.join(OUT, "favicon.png")) / 1024.0))

# fonts used by the page, copied verbatim from the project
FONTS = [
    ("fonts/rockstar-bold.ttf", "display-bold.ttf", None),
    ("fonts/productsans-medium.ttf", "productsans-medium.ttf", None),
]
FDIR = os.path.join(SITE, "assets", "fonts")
os.makedirs(FDIR, exist_ok=True)
for rel, name, _ in FONTS:
    src = os.path.join(SRC, rel)
    dst = os.path.join(FDIR, name.replace(".woff2", ".ttf"))
    with open(src, "rb") as fi, open(dst, "wb") as fo:
        fo.write(fi.read())
    print("%-28s %7.1f KB  <- %s" % (os.path.basename(dst), os.path.getsize(dst) / 1024.0, rel))
