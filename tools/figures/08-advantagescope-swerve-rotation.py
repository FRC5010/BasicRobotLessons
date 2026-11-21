"""Lesson 8, Figure 8.2: the Swerve tab from Figure 7.2 with the heading added.

Heading, under Telemetry > Drivetrain in the sidebar (1), dragged into the Sources list beside
ModuleStates, where it reads Rotation (2); the chassis is drawn turned to it. A screenshot the user
took on 2026-11-21 in their own AdvantageScope on Windows (version not recorded), connected to the
simulation of the Lesson 8 state: data/08-advantagescope-swerve-rotation.png. Nothing is measured.

    /usr/bin/python3.12 tools/figures/08-advantagescope-swerve-rotation.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "08-advantagescope-swerve-rotation.png")
CROP = (6, 0, 1427, 782)  # slivers of another window at the left edge and the bottom
SHOT = dict(
    shot=os.path.join(HERE, "data", "08-advantagescope-swerve-rotation.png"),
    crop=CROP,
    scale=full_width_scale(CROP),
    circles=[
        (1, 262, 241),  # Heading - Rotation2d, under Telemetry > Drivetrain
        (2, 676, 697),  # Rotation: NT:/Telemetry/Drivetrain/Heading, in Sources
    ],
)

if __name__ == "__main__":
    compose([SHOT], OUT, REPO)
