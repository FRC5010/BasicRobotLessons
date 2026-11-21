"""Lesson 11, Figures 11.1 and 11.2: the robot's pose on AdvantageScope's field tabs.

Figure 11.1: Tabs > New Tab > 2D Field (1), then that tab with Pose dragged from Telemetry >
Drivetrain (2) into its Poses list, where it reads Robot (3), and the Field drop-down (4).
Figure 11.2: the same pose on a 3D Field tab, where it reads 2026 KitBot (1), with the Field
drop-down open on its list of fields (2).

Screenshots the user took on 2026-11-21 in their own AdvantageScope on Windows (version not
recorded), connected to the simulation of the Lesson 11 state: data/11-advantagescope-new-tab.png,
data/11-advantagescope-2d-field.png (sent as WebP, converted to PNG unchanged) and
data/11-advantagescope-3d-field.png. Nothing is measured here.

    /usr/bin/python3.12 tools/figures/11-advantagescope-field-tabs.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
IMAGES = os.path.join(REPO, "docs", "lessons", "v3", "images")

MENU = dict(
    shot=os.path.join(HERE, "data", "11-advantagescope-new-tab.png"),
    crop=(158, 38, 578, 398),  # the Tabs menu and its New Tab submenu
    scale=1.25,
    boxes=[(372, 77, 532, 104)],  # 2D Field  Alt+2
    circles=[(1, 556, 90)],
    heading="Step 2: open a 2D Field tab",
)
FIELD_CROP = (0, 0, 1837, 1077)
FIELD = dict(
    shot=os.path.join(HERE, "data", "11-advantagescope-2d-field.png"),
    crop=FIELD_CROP,
    scale=full_width_scale(FIELD_CROP),
    boxes=[(1600, 911, 1772, 937)],  # the Field drop-down
    circles=[
        (2, 192, 511),   # Pose - Pose2d, under Telemetry > Drivetrain
        (3, 632, 924),   # Robot: NT:/Telemetry/Drivetrain/Pose, in Poses
        (4, 1640, 894),  # the Field drop-down
    ],
    heading="Then drag Pose into Poses, pick a field, and drive",
)
THREE_D_CROP = (341, 118, 1835, 1072)  # the 3D view and its controls, without the sidebar
THREE_D = dict(
    shot=os.path.join(HERE, "data", "11-advantagescope-3d-field.png"),
    crop=THREE_D_CROP,
    scale=full_width_scale(THREE_D_CROP),
    boxes=[(1650, 555, 1822, 908)],  # the open field list
    circles=[
        (1, 668, 922),   # 2026 KitBot: NT:/Telemetry/Drivetrain/Pose, in Poses
        (2, 1626, 575),  # the Field drop-down's list
    ],
)

if __name__ == "__main__":
    compose([MENU, FIELD], os.path.join(IMAGES, "11-advantagescope-2d-field.png"), REPO)
    compose([THREE_D], os.path.join(IMAGES, "11-advantagescope-3d-field.png"), REPO)
