"""Lesson 7, Figure 7.2: AdvantageScope's Swerve tab showing ModuleStates, in three panels.

Top: Tabs > New Tab > Swerve (step 1). Bottom: the Swerve tab with ModuleStates dragged from
Telemetry > Drivetrain in the sidebar (2) into the Sources list, where it reads Module Velocities
(3), Max Speed 5 m/s (4), and the four arrows pointing the same way while the stick is pushed.
Third: the diagram alone while the left bumper is held, the four arrows in the pinwheel.

Both are screenshots the user took on 2026-11-21 in their own AdvantageScope on Windows (version
not recorded), connected to the simulation of the Lesson 7 state: data/07-advantagescope-new-tab.png
data/07-advantagescope-swerve-tab.png and data/07-advantagescope-pinwheel.png. Nothing is measured here; screenshots.py crops,
numbers and stacks them.

    /usr/bin/python3.12 tools/figures/07-advantagescope-swerve-tab.py   (needs Pillow)

Writes docs/lessons/v3/images/07-advantagescope-swerve-tab.png.
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "07-advantagescope-swerve-tab.png")

MENU = dict(
    shot=os.path.join(HERE, "data", "07-advantagescope-new-tab.png"),
    crop=(158, 0, 585, 392),  # the Tabs menu and its New Tab submenu
    scale=1.25,
    boxes=[(372, 268, 533, 296)],  # Swerve  Alt+D
    circles=[(1, 560, 282)],
    heading="Step 1: open a Swerve tab",
)
TAB_CROP = (4, 0, 1427, 780)  # a sliver of another window at the left edge and the bottom
TAB = dict(
    shot=os.path.join(HERE, "data", "07-advantagescope-swerve-tab.png"),
    crop=TAB_CROP,
    scale=full_width_scale(TAB_CROP),
    circles=[
        (2, 36, 361),     # ModuleStates, under Telemetry > Drivetrain
        (3, 768, 666),    # the Sources list: Module Velocities: NT:/Telemetry/Drivetrain/ModuleStates
        (4, 1243, 606),   # Max Speed (m/s)
    ],
    heading="Steps 2 to 4: drag ModuleStates into Sources, then drive",
)

PINWHEEL = dict(
    shot=os.path.join(HERE, "data", "07-advantagescope-pinwheel.png"),
    crop=(648, 118, 1118, 584),  # the Swerve tab's diagram, between its two guide lines
    scale=1.0,
    heading="Hold the left bumper: the pinwheel",
)

if __name__ == "__main__":
    compose([MENU, TAB, PINWHEEL], OUT, REPO)
