"""Lesson 3, Figure 3.1: AdvantageScope connected to the simulator, with the Telemetry tree open and
VelocityRotPerSec and PositionRotations on one Line Graph. Steps 1-4 of section 5 are numbered.

Made from a screenshot the user took on 2026-11-21 in their own AdvantageScope (version not
recorded), connected to the simulation of the Lesson 4 state after a few full-stick drives:
data/03-advantagescope-screenshot.png. Nothing is measured here. This script crops the empty
bottom of the window, numbers the steps in the style of Figure 17.3's SimGUI callouts (Okabe-Ito
orange circles, black outline and digit), scales it to 1600 px and compresses it.

    /usr/bin/python3.12 tools/figures/03-advantagescope-tree-graph.py   (needs Pillow)

Writes docs/lessons/v3/images/03-advantagescope-tree-graph.png.
"""

import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SOURCE = os.path.join(HERE, "data", "03-advantagescope-screenshot.png")
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "03-advantagescope-tree-graph.png")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

ORANGE = (230, 159, 0)  # Okabe-Ito orange, as in Figure 17.3
BLACK = (0, 0, 0)
CROP_BOTTOM = 878  # below the axis lists' entries the panes are empty
WIDTH = 1600
SCALE = 2  # draw at twice the source size, then scale down, so the circles come out smooth

# In the source's pixels (1917 x 1021).
BOXES = [(106, 8, 145, 36)]  # the File menu, where step 1 starts
CIRCLES = [
    (1, 100, 56),    # under the File menu, clear of the "19 fields" line
    (2, 232, 300),   # Telemetry > DriveModule, in the sidebar
    (3, 757, 787),   # the Left Axis list, holding VelocityRotPerSec
    (4, 1752, 787),  # the Right Axis list, holding PositionRotations
]
RADIUS = 19


def main():
    shot = Image.open(SOURCE).convert("RGB")
    shot = shot.crop((0, 0, shot.width, CROP_BOTTOM))
    big = shot.resize((shot.width * SCALE, shot.height * SCALE), Image.Resampling.NEAREST)
    draw = ImageDraw.Draw(big)
    font = ImageFont.truetype(FONT, int(RADIUS * 1.35 * SCALE))

    for x0, y0, x1, y1 in BOXES:
        draw.rounded_rectangle([x0 * SCALE, y0 * SCALE, x1 * SCALE, y1 * SCALE], radius=6 * SCALE,
                               outline=ORANGE, width=3 * SCALE)
    for number, x, y in CIRCLES:
        r = RADIUS * SCALE
        cx, cy = x * SCALE, y * SCALE
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ORANGE, outline=BLACK, width=2 * SCALE)
        draw.text((cx, cy), str(number), fill=BLACK, font=font, anchor="mm")

    height = round(shot.height * WIDTH / shot.width)
    out = big.resize((WIDTH, height), Image.Resampling.LANCZOS)
    # A screenshot has few colours, so a 256-colour palette keeps it sharp and small.
    out = out.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out.save(OUT, optimize=True)
    print(f"wrote {os.path.relpath(OUT, REPO)}: {WIDTH} x {height}, {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
