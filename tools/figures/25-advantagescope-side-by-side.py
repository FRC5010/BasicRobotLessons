"""Lesson 25, Figure 25.5: one Pick Up run with the Line Graph popped out beside the 2D Field.

Left, the Line Graph in a window of its own (title "Line Graph - AdvantageScope", 1): elevator
height, path left and Superstructure/State, as in Figure 25.4. Right, the main window's 2D Field
(2): the robot at (6.000, 0.957), -90.00 deg, and the three pieces, one of them the scored piece
at (5.999, 0.643). One run, unlike Figure 25.4's two.

A screenshot the user took on 2026-11-21 in AdvantageScope 27.0.0-alpha-6 on Windows, live on the
Lesson 25 state, Blue 1: data/25-advantagescope-side-by-side.png (sent as WebP, converted
unchanged). How the tab was popped out isn't recorded. Nothing is measured here.

    /usr/bin/python3.12 tools/figures/25-advantagescope-side-by-side.py   (needs Pillow)
"""

import os

from PIL import Image

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "25-advantagescope-side-by-side.png")
CROP = (0, 0, 2000, 838)
SHOT = dict(
    shot=os.path.join(HERE, "data", "25-advantagescope-side-by-side.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    circles=[
        (1, 200, 12),    # the popped-out Line Graph window's title
        (2, 1640, 186),  # the robot on the main window's 2D Field
    ],
)

if __name__ == "__main__":
    compose([SHOT], OUT, REPO, method=Image.Quantize.FASTOCTREE)
