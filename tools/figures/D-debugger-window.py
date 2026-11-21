"""Debugger aside, Figure D.1: VS Code paused in Lesson 5's steerToAngle, its parts numbered.

The breakpoint in the gutter (1), the line execution is paused on (2), the Variables (3), Watch (4)
and Call Stack (5) panels, and the debug toolbar (6). A screenshot the user took on 2026-11-21 on
Windows, debugging their own Lesson 5 project with the WPILib Desktop Debug launch, after section 3's
steps 1 to 6: data/aside-debugger-window.png. The bottom is cropped off: the terminal and the status
bar show the user's account and folder names, which don't belong on the website.

    /usr/bin/python3.12 tools/figures/D-debugger-window.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "aside-debugger-window.png")
CROP = (0, 0, 1726, 758)  # above the terminal panel
SHOT = dict(
    shot=os.path.join(HERE, "data", "aside-debugger-window.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    boxes=[(1189, 37, 1394, 63)],  # the debug toolbar
    circles=[
        (1, 351, 265),   # the breakpoint's red dot, line 144
        (2, 830, 322),   # the paused line, 147
        (3, 160, 81),    # Variables
        (4, 140, 381),   # Watch
        (5, 170, 529),   # Call Stack
        (6, 1418, 50),   # the debug toolbar
    ],
)

if __name__ == "__main__":
    compose([SHOT], OUT, REPO)
