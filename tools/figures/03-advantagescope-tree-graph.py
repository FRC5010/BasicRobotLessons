"""Lesson 3, Figure 3.1: AdvantageScope's steps 1-4 from section 5, numbered, in two panels.

Top: the File menu open at Connect to Simulator, whose submenu starts with Default: NetworkTables
(step 1). Bottom: AdvantageScope connected to the simulator, with the Telemetry tree open and
VelocityRotPerSec and PositionRotations on one Line Graph (steps 2-4).

Both panels are screenshots the user took on 2026-11-21 in their own AdvantageScope (version not
recorded), on Windows: data/03-advantagescope-file-menu.png (not connected yet) and
data/03-advantagescope-screenshot.png (connected to the simulation of the Lesson 4 state, after a
few full-stick drives). Nothing is measured here. This script crops them, numbers the steps the way
Figure 17.3 numbers SimGUI's (Okabe-Ito orange circles, black outline and digit, headings over
each panel on 17.3's background), and compresses the result.

    /usr/bin/python3.12 tools/figures/03-advantagescope-tree-graph.py   (needs Pillow)

Writes docs/lessons/v3/images/03-advantagescope-tree-graph.png.
"""

import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
MENU_SHOT = os.path.join(HERE, "data", "03-advantagescope-file-menu.png")
CONNECTED_SHOT = os.path.join(HERE, "data", "03-advantagescope-screenshot.png")
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "03-advantagescope-tree-graph.png")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

BACKGROUND = (20, 23, 28)  # Figure 17.3's
HEADING = (204, 204, 204)  # Figure 17.3's
ORANGE = (230, 159, 0)  # Okabe-Ito orange, as in Figure 17.3
BLACK = (0, 0, 0)

WIDTH = 1600
MARGIN = 20
GAP = 26  # between the top panel and the second heading
HEADING_SIZE = 26
RADIUS = 16  # callout circles, in the final image's pixels
SS = 2  # build at twice the size, then scale down, so circles and text come out smooth

# Each panel: the crop of its screenshot (source pixels), how much to scale it, orange boxes and
# numbered circles (both in source pixels), and its heading.
MENU = dict(
    shot=MENU_SHOT,
    crop=(86, 0, 740, 364),  # the File menu, through Publish NT Data, and its submenu
    scale=1.25,  # the menu's text is smaller than the connected window's, and it has room
    boxes=[(418, 131, 684, 158)],  # Default: NetworkTables
    circles=[(1, 714, 144)],
    heading="Step 1: connect",
)
CONNECTED = dict(
    shot=CONNECTED_SHOT,
    crop=(0, 0, 1917, 878),  # below the axis lists' entries the panes are empty
    scale=(WIDTH - 2 * MARGIN) / 1917,
    boxes=[],
    circles=[
        (2, 232, 300),   # Telemetry > DriveModule, in the sidebar
        (3, 757, 787),   # the Left Axis list, holding VelocityRotPerSec
        (4, 1752, 787),  # the Right Axis list, holding PositionRotations
    ],
    heading="Steps 2 to 4: find the values and graph them",
)


def panel_image(p):
    """The panel's crop with its boxes drawn, scaled to its size in the (supersampled) figure."""
    shot = Image.open(p["shot"]).convert("RGB")
    x0, y0, x1, y1 = p["crop"]
    crop = shot.crop(p["crop"])
    draw = ImageDraw.Draw(crop)
    for bx0, by0, bx1, by1 in p["boxes"]:
        draw.rounded_rectangle([bx0 - x0, by0 - y0, bx1 - x0, by1 - y0], radius=5, outline=ORANGE, width=3)
    k = p["scale"] * SS
    return crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)


def main():
    heading_font = ImageFont.truetype(FONT, HEADING_SIZE * SS)
    digit_font = ImageFont.truetype(FONT, round(RADIUS * 1.35 * SS))
    images = [panel_image(MENU), panel_image(CONNECTED)]

    # Lay out top to bottom: heading, panel, gap, heading, panel.
    placed, y = [], MARGIN * SS // 2
    for p, im in zip((MENU, CONNECTED), images):
        heading_y = y
        y += round(HEADING_SIZE * 1.6) * SS
        placed.append((p, im, MARGIN * SS, y, heading_y))
        y += im.height + GAP * SS
    height = y - GAP * SS + MARGIN * SS

    canvas = Image.new("RGB", (WIDTH * SS, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    for p, im, x, y, heading_y in placed:
        draw.text((x, heading_y), p["heading"], fill=HEADING, font=heading_font)
        canvas.paste(im, (x, y))
        k = p["scale"] * SS
        for number, sx, sy in p["circles"]:
            cx, cy = x + (sx - p["crop"][0]) * k, y + (sy - p["crop"][1]) * k
            r = RADIUS * SS
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ORANGE, outline=BLACK, width=2 * SS)
            draw.text((cx, cy), str(number), fill=BLACK, font=digit_font, anchor="mm")

    out = canvas.resize((WIDTH, round(height / SS)), Image.Resampling.LANCZOS)
    # Screenshots have few colours, so a 256-colour palette keeps them sharp and small.
    out = out.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out.save(OUT, optimize=True)
    print(f"wrote {os.path.relpath(OUT, REPO)}: {out.width} x {out.height}, {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
