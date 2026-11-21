"""Lesson 17, Figure 17.6: Two Corners on the red alliance (Try It #6) on an AdvantageScope 2D Field tab.

The trail of the run along the first leg, past the corner and up the second (1); the Poses list,
truth (Drivetrain/SimulatedPose) and estimate (Localizer/Pose) at (10.622, 2.434) and
(10.613, 2.396), both -57.86 degrees (2); Drivetrain/CurrentCommand still FollowPath (3); the
Console output's last line, Event: shoot! (4). The field is drawn rotated half a turn from Figure
17.4: x grows to the left and y downwards (read from where the poses sit, not from a setting).

A screenshot the user took on 2026-11-21 in their own AdvantageScope on Windows (version not
recorded), live on the Lesson 17 state, red alliance:
data/17-advantagescope-two-corners-red.png (sent as WebP, converted unchanged). Nothing is
measured here.

    /usr/bin/python3.12 tools/figures/17-advantagescope-two-corners-red.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "17-advantagescope-two-corners-red.png")
CROP = (0, 0, 1837, 1050)
SHOT = dict(
    shot=os.path.join(HERE, "data", "17-advantagescope-two-corners-red.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    boxes=[
        (348, 910, 800, 1007),  # the two Poses entries
        (236, 647, 335, 673),   # CurrentCommand: FollowPath
        (236, 587, 335, 613),   # Console: Event: sh...
    ],
    circles=[
        (1, 965, 600),   # the trail, at the corner
        (2, 830, 960),   # the poses' numbers
        (3, 48, 660),    # CurrentCommand
        (4, 48, 600),    # Console
    ],
)

if __name__ == "__main__":
    compose([SHOT], OUT, REPO)
