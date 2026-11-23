"""Lesson 11, Figure 11.4: picking a field image for SimGUI's Field window, in two panels.

Top: the Field window's settings popup, opened from the menu button in its title bar (the user
opens the same settings with a right-click on the field), with Field expanded (1) and its Image
drop-down open (2): Custom, 2026 FRC Rebuilt Welded and AndyMark, FTC and earlier fields.
Bottom: the same window after picking 2026 FRC Rebuilt Welded (3), the robot at its start.

Screenshots taken here on 2026-11-21 under Xvfb (the Lesson 30 recipe) on the Lesson 11 state,
alpha-8 SimGUI, robot disabled: data/11-simgui-field-image-menu.png and
data/11-simgui-field-image.png. The image read Custom on this fresh launch, so the window showed
only the outline (Figure 11.3); the user says the latest field is usually there by default.
Nothing is measured here.

    /usr/bin/python3.12 tools/figures/11-simgui-field-image.py   (needs Pillow)
"""

import os

from PIL import Image

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "11-simgui-field-image.png")

MENU = dict(
    shot=os.path.join(HERE, "data", "11-simgui-field-image-menu.png"),
    crop=(1180, 120, 1600, 416),  # the window's right edge and the settings popup
    scale=2.0,
    boxes=[(1390, 228, 1596, 248), (1390, 254, 1520, 274)],  # Field, and the Image drop-down
    circles=[(1, 1365, 238), (2, 1365, 264)],
    heading="Open the window's settings, then Field, then Image",
)
FIELD_CROP = (560, 120, 1600, 680)
FIELD = dict(
    shot=os.path.join(HERE, "data", "11-simgui-field-image.png"),
    crop=FIELD_CROP,
    scale=full_width_scale(FIELD_CROP),
    boxes=[(1390, 254, 1520, 274)],  # 2026 FRC Rebuilt Welded
    circles=[(3, 1365, 264)],
    heading="With 2026 FRC Rebuilt Welded picked",
)

if __name__ == "__main__":
    compose([MENU, FIELD], OUT, REPO, method=Image.Quantize.FASTOCTREE)
