# -*- coding: utf-8 -*-
"""Render the UI mockup templates to web images with headless Edge.

The mockups are drawn from the project's own palette values
(OpaiStyle.LAVENDER / OpaiStyle.LIGHT_PINK / ClientColors themes) and reuse the
project's Product Sans font file. They are illustrative renderings, not real
in-game screenshots.
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, ".."))
IMG = os.path.join(SITE, "assets", "img")
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

JOBS = [
    ("hero.html", "hero-ui.webp", 1400, 875, 86),
    ("clickgui.html", "ui-clickgui.webp", 1000, 640, 88),
    ("hud.html", "ui-hud.webp", 1060, 460, 88),
]

os.makedirs(IMG, exist_ok=True)
tmp = tempfile.mkdtemp(prefix="dlx-mock-")

for name, out, w, h, q in JOBS:
    src = os.path.join(HERE, "mockups", name)
    png = os.path.join(tmp, out.replace(".webp", ".png"))
    url = "file:///" + src.replace("\\", "/")
    profile = os.path.join(tmp, "profile-" + name)
    cmd = [
        EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2", "--user-data-dir=" + profile,
        "--virtual-time-budget=4000",
        "--window-size=%d,%d" % (w, h),
        "--screenshot=" + png, url,
    ]
    subprocess.run(cmd, capture_output=True, timeout=180)
    if not os.path.exists(png):
        print("FAILED:", name)
        sys.exit(1)
    im = Image.open(png).convert("RGB")
    if im.width != w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(IMG, out), "WEBP", quality=q, method=6)
    print("%-18s %4dx%-4d %6.1f KB" % (out, im.width, im.height,
                                        os.path.getsize(os.path.join(IMG, out)) / 1024.0))

print("done")
