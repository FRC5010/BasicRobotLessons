"""Lesson 18, Figure 18.3: section 10's graph set up in AdvantageScope.

SetpointMeters and HeightMeters from AdvantageKit > Elevator (1) and GoalMeters from AdvantageKit >
RealOutputs > Elevator (2) on the Left Axis (3), VelocityMetersPerSec on the right, after a few
D-pad presses. A screenshot the user took on 2026-11-21 in their own AdvantageScope on Windows
(version not recorded), connected to the simulation of the Lesson 18 state with Default:
NetworkTables: data/18-advantagescope-elevator-graph.png. Nothing is measured here.

    /usr/bin/python3.12 tools/figures/18-advantagescope-elevator-graph.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "18-advantagescope-elevator-graph.png")
CROP = (0, 6, 1427, 786)  # slivers of another window at the top and bottom
SHOT = dict(
    shot=os.path.join(HERE, "data", "18-advantagescope-elevator-graph.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    circles=[
        (1, 150, 149),  # AdvantageKit > Elevator: the readings
        (2, 155, 539),  # AdvantageKit > RealOutputs > Elevator: the outputs
        (3, 590, 609),  # the Left Axis list
    ],
)

if __name__ == "__main__":
    compose([SHOT], OUT, REPO)
