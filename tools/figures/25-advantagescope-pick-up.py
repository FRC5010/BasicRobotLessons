"""Lesson 25, Figure 25.4: a Pick Up run in AdvantageScope, field and graph, in two panels.

Top, a 2D Field tab at the end of the run: the simulated robot (1) at (6.000, 0.956), -90.05 deg,
its trail coming down from the start, with the piece it scored just ahead (the ghost box over
it); Sim/GamePieces drawn as yellow Ghosts (2), the two pieces Pick Up never goes near; the Poses
list (3). Bottom, a Line Graph: Elevator/HeightMeters on the left axis (4), remaining path
distance on the right axis (5), Superstructure/State in Discrete Fields (6).

Two runs on Blue 1, one per panel, each a fresh launch. Screenshots the user took on 2026-11-21
in AdvantageScope 27.0.0-alpha-6 (WPILib distribution, win32-x64) live on the Lesson 25 state:
data/25-advantagescope-pick-up-field.png (sent as WebP, converted unchanged) and
data/25-advantagescope-pick-up-graph.png. The crops leave out the sidebar. Nothing is measured
here; the times quoted in the lesson are read off the graph's axis (about 59.4 px per second).

    /usr/bin/python3.12 tools/figures/25-advantagescope-pick-up.py   (needs Pillow)
"""

import os

from PIL import Image

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "25-advantagescope-pick-up.png")

FIELD_CROP = (388, 40, 1837, 1012)
FIELD = dict(
    shot=os.path.join(HERE, "data", "25-advantagescope-pick-up-field.png"),
    crop=FIELD_CROP,
    scale=full_width_scale(FIELD_CROP),
    boxes=[(392, 912, 1100, 1008)],  # the two Poses entries
    circles=[
        (1, 1232, 245),  # the robot at the end, the scored piece just ahead of it
        (2, 1480, 405),  # a piece Pick Up never touches
        (2, 1685, 270),  # and the other
        (3, 1130, 960),  # the Poses list
    ],
    heading="2D Field: the robot at the end of the path, and the pieces",
)
GRAPH_CROP = (388, 40, 1832, 960)
GRAPH = dict(
    shot=os.path.join(HERE, "data", "25-advantagescope-pick-up-graph.png"),
    crop=GRAPH_CROP,
    scale=full_width_scale(GRAPH_CROP),
    circles=[
        (4, 800, 605),   # HeightMeters sinking before enable
        (4, 1600, 128),  # and rising to 0.75 m during the drive
        (5, 1395, 330),  # remaining path distance falling to 0
        (6, 1440, 806),  # Superstructure/State in the discrete strip
    ],
    heading="Line Graph: elevator height, path left, and the state",
)

if __name__ == "__main__":
    compose([FIELD, GRAPH], OUT, REPO, method=Image.Quantize.FASTOCTREE)
