"""Lessons README, Figure R.1: cleaning VS Code's Java workspace after a lesson update, in two panels.

Top: the Command Palette (Ctrl+Shift+P) with "Clean" typed and Java: Clean Java Language Server
Workspace at the top (1). Bottom: the confirmation that follows, with Reload and delete (2).
Screenshots the user took on 2026-11-21 in their own VS Code with WPILib on Windows (versions not
recorded): data/readme-vscode-clean-java-command.png and data/readme-vscode-clean-java-confirm.png.
The crops leave out the Explorer, which shows the workspace folder's name, and the status bar.
Nothing is measured here.

    /usr/bin/python3.12 tools/figures/readme-vscode-clean-java-workspace.py   (needs Pillow)

Writes docs/lessons/v3/images/readme-vscode-clean-java-workspace.png.
"""

import os

from screenshots import compose

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "docs", "lessons", "v3", "images", "readme-vscode-clean-java-workspace.png")

PALETTE = dict(
    shot=os.path.join(HERE, "data", "readme-vscode-clean-java-command.png"),
    crop=(563, 0, 1165, 268),  # the Command Palette only
    scale=1.6,
    boxes=[(572, 45, 1028, 67)],  # Java: Clean Java Language Server Workspace
    circles=[(1, 940, 56)],
    heading="Ctrl+Shift+P, type Clean, pick the Java language server's (1)",
)
CONFIRM = dict(
    shot=os.path.join(HERE, "data", "readme-vscode-clean-java-confirm.png"),
    crop=(98, 0, 561, 118),  # the dialog, above the status bar
    scale=1.6,
    boxes=[(430, 85, 559, 112)],  # Reload and delete
    circles=[(2, 495, 66)],
    heading="Then Reload and delete (2)",
)

if __name__ == "__main__":
    compose([PALETTE, CONFIRM], OUT, REPO)
