"""Lesson 13, Figures 13.3 and 13.5: a replay's output file in AdvantageScope, and the replay started
from VS Code instead of the terminal.

Figure 13.3: the _sim.wpilog a replay writes, open on a 2D Field tab. The recorded inputs sit at the
top level (1), RealOutputs (2) and ReplayOutputs (3) below, and the Poses list (4) holds both
Drivetrain/Pose outputs, drawn on top of each other.
Figure 13.5: the recording picked in AdvantageScope's File > Open Log(s) (1), kSimMode set to
Mode.REPLAY (2), and VS Code's Simulate Robot Code asking which extensions to load, Sim GUI to be
unticked (3).

Screenshots the user took on 2026-11-21 on Windows, on their own Lesson 13 project (AdvantageScope
version not recorded): data/13-advantagescope-replay-file.png (sent as WebP, converted unchanged),
data/13-advantagescope-open-log.png, data/13-vscode-replay-mode.png, data/13-vscode-extensions.png.
Nothing is measured here.

    /usr/bin/python3.12 tools/figures/13-replay-screenshots.py   (needs Pillow)
"""

import os

from screenshots import compose, full_width_scale

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
IMAGES = os.path.join(REPO, "docs", "lessons", "v3", "images")


def data(name):
    return os.path.join(HERE, "data", name)


FILE_CROP = (0, 0, 1837, 1077)
REPLAY_FILE = dict(
    shot=data("13-advantagescope-replay-file.png"),
    crop=FILE_CROP,
    scale=full_width_scale(FILE_CROP),
    boxes=[(350, 943, 720, 1037)],  # the Ghost and Robot entries from the file
    circles=[
        (1, 130, 122),   # the inputs, at the top level (Drivetrain, DriverStation, ...)
        (2, 148, 213),   # RealOutputs
        (3, 160, 573),   # ReplayOutputs
        (4, 745, 990),   # the two poses, recorded and replayed
    ],
)

OPEN_LOG = dict(
    shot=data("13-advantagescope-open-log.png"),
    crop=(266, 46, 1246, 386),  # the Open Log(s) dialog
    scale=1.25,
    boxes=[(441, 194, 1193, 220)],  # the akit_ recording
    circles=[(1, 1222, 207)],
    heading="1. Open the recording in AdvantageScope (File > Open Log(s))",
)
REPLAY_MODE = dict(
    shot=data("13-vscode-replay-mode.png"),
    crop=(365, 398, 1131, 600),  # the editor, lines 16 to 24 of Constants.java
    scale=1.25,
    boxes=[(430, 470, 1000, 493)],  # public static final Mode kSimMode = Mode.REPLAY;
    circles=[(2, 1030, 481)],
    heading="2. Set kSimMode to Mode.REPLAY",
)
EXTENSIONS = dict(
    shot=data("13-vscode-extensions.png"),
    crop=(380, 0, 1176, 106),  # the Simulate Robot Code prompt
    scale=1.6,
    boxes=[(565, 44, 1160, 72)],  # Sim GUI
    circles=[(3, 546, 58)],
    heading="3. Simulate Robot Code, with Sim GUI unticked",
)

if __name__ == "__main__":
    compose([REPLAY_FILE], os.path.join(IMAGES, "13-advantagescope-replay-file.png"), REPO)
    compose([OPEN_LOG, REPLAY_MODE, EXTENSIONS], os.path.join(IMAGES, "13-replay-from-vscode.png"), REPO)
