"""Lesson 5, Figure 5.3: the steering gain as a tunable in SimGUI's NetworkTables window.

One panel: the NetworkTables window with Transitory Values open, the Tunables folder beside
DriverStation, Robot and Telemetry, opened to DriveModule, where SteerKP reads 0.000250 in an
editable box marked double (the folder outlined, the box outlined).

Screenshot taken here on 2026-11-25 under Xvfb (the Lesson 30 recipe) on the Lesson 5 state,
alpha-8 SimGUI, robot disabled: data/05-simgui-tunable.png. The value was typed into the box
(double-click, 0.00025, Enter) after the robot published it at 0.000500; a probe on the same
setup on the same day saw the robot read a value typed this way on the next tick (claim
wpilib-tools.simgui-edits-tunables). Nothing is measured here.

    /usr/bin/python3.12 tools/figures/05-simgui-tunable.py   (needs Pillow)
"""

import os

from PIL import Image

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "05-simgui-tunable.png")

CROP = (410, 420, 1185, 700)  # the NetworkTables window down to the SteerKP row
PANEL = dict(
    shot=os.path.join(HERE, "data", "05-simgui-tunable.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    boxes=[(418, 609, 686, 628), (692, 653, 810, 674)],  # the Tunables row, the SteerKP box
    circles=[(1, 702, 618), (2, 870, 663)],
)

if __name__ == "__main__":
    compose([PANEL], OUT, REPO, method=Image.Quantize.FASTOCTREE)
