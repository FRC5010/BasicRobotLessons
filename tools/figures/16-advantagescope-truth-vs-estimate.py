"""Lesson 16, Figure 16.2: the estimate and the simulated truth on one AdvantageScope 2D Field tab.

Drivetrain/SimulatedPose (1) and Localizer/Pose (2), both under AdvantageKit > RealOutputs, drawn
as two robots (3) about 15 cm apart after some hard driving; the Poses list (4) gives their
numbers. The user coloured the estimate blue and left the truth in the default red. A screenshot
the user took on 2026-11-21 in their own AdvantageScope on Windows (version not recorded), live on
the Lesson 16 state: data/16-advantagescope-truth-vs-estimate.png (sent as WebP, converted
unchanged). Nothing is measured here.

    /usr/bin/python3.12 tools/figures/16-advantagescope-truth-vs-estimate.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "16-advantagescope-truth-vs-estimate.png")
CROP = (0, 0, 1837, 1077)
SHOT = dict(
    shot=os.path.join(HERE, "data", "16-advantagescope-truth-vs-estimate.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    boxes=[(350, 912, 790, 1008)],  # the two Poses entries
    circles=[
        (1, 280, 781),   # SimulatedPose, under RealOutputs > Drivetrain
        (2, 215, 841),   # Pose, under RealOutputs > Localizer
        (3, 915, 350),   # the two robots on the field
        (4, 812, 960),   # their numbers
    ],
)

if __name__ == "__main__":
    compose([SHOT], OUT, REPO)
