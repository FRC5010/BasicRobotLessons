"""Lesson 25: why getReadyThen is a coroutine and not a Command.sequence.

A diagram, not a measurement. It draws the mechanism Lesson 25 section 3 explains and CLAUDE.md's
Lesson 25 notes record (a SequentialGroup's requirements are the union of its steps', so the
IDLE motion Lesson 24 binds in Robot evicts the whole auto; measured with the real Robot loop:
with Command.sequence the robot never drives). The widths of the blocks are not to scale.

    python3 tools/figures/25-sequence-vs-coroutine.py

Output: docs/lessons/v3/images/25-sequence-vs-coroutine.svg
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, PURPLE, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.PURPLE, d.BLACK
RED = PURPLE

X0, XE = 30, 770          # time axis
X_HOME = 230              # home() ends; the state turns IDLE
X_WAIT = 480              # settled; the auto would start
H = 44


def panel(s, y, title, sub, sequence):
    s.text(X0, y, title, 20, BLACK, "start", "bold")
    s.text(X0, y + 24, sub, 15, GREY, "start")
    y += 46
    # the lane that shows who holds the elevator
    s.text(X0, y + 14, "Who holds the Elevator", 15, GREY, "start", "bold")
    y += 24
    if sequence:
        s.box(X0, y, X_HOME - X0 + 6, H, ["the sequence", "holds it, all of it"], ORANGE, 15)
        s.box(X_HOME + 6, y, XE - X_HOME - 6, H, ["the IDLE motion wants it: the newer", "command wins, the sequence is canceled"], RED, 15)
    else:
        s.box(X0, y, X_HOME - X0, H, "home()", BLUE, 15)
        s.box(X_HOME, y, XE - X_HOME, H, ["the IDLE motion holds it while it stows", "(the auto never asked for the elevator)"], GREEN, 15)
    y += H + 16
    # the lane that shows the get-ready command
    s.text(X0, y + 14, "Get Ready, Then ... runs", 15, GREY, "start", "bold")
    y += 24
    s.box(X0, y, X_HOME - X0, H, "home()", BLUE, 15)
    if sequence:
        s.box(X_HOME, y, X_WAIT - X_HOME, H, "Wait Until Settled", GREY, 14, dash=True)
        s.box(X_WAIT, y, XE - X_WAIT, H, "auto: never runs", GREY, 14, dash=True)
        s.text((X_HOME + XE) / 2, y + H + 22, "canceled on the tick the state turns IDLE: the robot never drives", 15, RED, "middle", "bold")
    else:
        s.box(X_HOME, y, X_WAIT - X_HOME, H, "Wait Until Settled", GREEN, 14)
        s.box(X_WAIT, y, XE - X_WAIT, H, "await(auto): the robot drives", GREEN, 14)
        s.text((X_HOME + XE) / 2, y + H + 22, "holds no mechanism itself, so nothing evicts it", 15, GREEN, "middle", "bold")
    s.text(X_HOME + 10, y - 10, "home() finishes: the state turns IDLE", 14, BLACK, "start", "bold")
    # the event line, drawn through both lanes
    s.line(X_HOME, y - 80, X_HOME, y + H + 4, BLACK, 2, arrow=False, dash=True)
    return y + H + 40


def main():
    s = Svg(800, 580)
    y = panel(s, 36, "Command.sequence(home(), wait, auto)",
              "A sequence holds every step's mechanisms for as long as it runs.", True)
    s.line(X0, y - 4, XE, y - 4, GREY, 1, arrow=False)
    y = panel(s, y + 36, "Command.noRequirements(...) with await, as getReadyThen is",
              "Each awaited command holds its own mechanisms only while it runs.", False)
    s.save("25-sequence-vs-coroutine.svg")


if __name__ == "__main__":
    main()
