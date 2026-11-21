"""Lesson 3, Figure 3.1: AdvantageScope's steps 1-4 from section 5, numbered, in two panels.

Top: the File menu open at Connect to Simulator, whose submenu starts with Default: NetworkTables
(step 1). Bottom: AdvantageScope connected to the simulator, with the Telemetry tree open and
VelocityRotPerSec and PositionRotations on one Line Graph (steps 2-4).

Both panels are screenshots the user took on 2026-11-21 in their own AdvantageScope (version not
recorded), on Windows: data/03-advantagescope-file-menu.png (not connected yet) and
data/03-advantagescope-screenshot.png (connected to the simulation of the Lesson 4 state, after a
few full-stick drives). Nothing is measured here; screenshots.py crops, numbers and stacks them.

    /usr/bin/python3.12 tools/figures/03-advantagescope-tree-graph.py   (needs Pillow)

Writes docs/lessons/v3/images/03-advantagescope-tree-graph.png.
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "03-advantagescope-tree-graph.png")

MENU = dict(
    shot=os.path.join(HERE, "data", "03-advantagescope-file-menu.png"),
    crop=(86, 0, 740, 364),  # the File menu, through Publish NT Data, and its submenu
    scale=1.25,  # the menu's text is smaller than the connected window's, and it has room
    boxes=[(418, 131, 684, 158)],  # Default: NetworkTables
    circles=[(1, 714, 144)],
    heading="Step 1: connect",
)
CONNECTED_CROP = (0, 0, 1917, 878)  # below the axis lists' entries the panes are empty
CONNECTED = dict(
    shot=os.path.join(HERE, "data", "03-advantagescope-screenshot.png"),
    crop=CONNECTED_CROP,
    scale=full_width_scale(CONNECTED_CROP),
    circles=[
        (2, 232, 300),   # Telemetry > DriveModule, in the sidebar
        (3, 757, 787),   # the Left Axis list, holding VelocityRotPerSec
        (4, 1752, 787),  # the Right Axis list, holding PositionRotations
    ],
    heading="Steps 2 to 4: find the values and graph them",
)

if __name__ == "__main__":
    compose([MENU, CONNECTED], OUT, REPO)
