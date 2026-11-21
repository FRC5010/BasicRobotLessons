"""Lessons 6 and 9 diagrams, drawn as SVG from the lessons' own names.

  python tools/figures/diagrams-6-9.py   (in the figures venv: needs figstyle, so matplotlib)

writes, to docs/lessons/v3/images/:
  06-two-ways-to-end.svg           driveDistance's two endings and which hook runs
                                   (alpha-8 hook order, CLAUDE.md "New Commands V3 API": a natural
                                   finish runs EXIT only; a cancel runs EXIT, then CANCEL)
  09-sequence-parallel-race.svg    Command.sequence / parallel / race and .optional, plus the
                                   shared-requirement error (Lesson 9 section 6)

No data files and no measurements.
"""

import importlib.util
import os

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d1016", os.path.join(here, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK


def fig_6_1():
    s = Svg(800, 560)
    for top, title, ended in ((10, "Finished: the robot got to 1.0 m", True),
                              (290, "Canceled: another command takes the module mid-drive", False)):
        s.text(25, top + 22, title, 17, BLACK, anchor="start", weight="bold")
        y = top + 40
        s.box(25, y, 230, 76, ["setPosition(0)", "setThrottle(0.4)"], BLUE, title="1. start")
        s.line(255, y + 38, 285, y + 38)
        if ended:
            s.box(285, y, 230, 76, ["the distance reached", "1.0, so it returns"], BLUE, title="2. waitUntil(...)")
            s.line(515, y + 38, 545, y + 38)
            s.box(545, y, 230, 76, ["last line runs,", "the command is done"], BLUE, title="3. body ends")
        else:
            s.box(285, y, 230, 76, ["still waiting.", "It never returns"], ORANGE, dash=True, title="2. waitUntil(...)")
            s.line(515, y + 38, 545, y + 38)
            s.box(545, y, 230, 76, ["the scheduler cancels", "this command"], ORANGE, title="3. interrupted")
        y2 = y + 126
        s.line(660, y + 76, 660, y2)
        s.box(545, y2, 230, 76, ["setThrottle(0)"], GREEN, title=".whenExited(...)  RUNS" + ("" if ended else " 1st"))
        if ended:
            s.box(285, y2, 230, 76, ["silent: nothing", "was interrupted"], GREY, dash=True, title=".whenCanceled(...)")
            s.text(400, y2 + 96, "does not run", 14, GREY)
        else:
            s.line(545, y2 + 38, 515, y2 + 38, BLACK, 2)
            s.box(285, y2, 230, 76, ["anything you put", "there"], ORANGE, title=".whenCanceled(...)  RUNS 2nd")
    s.save("06-two-ways-to-end.svg")


def fig_9_2():
    s = Svg(800, 712)
    X0, LA, LB = 40, 400, 240  # A is the longer command

    def bars(top, label, rows, end_x, end_label, same_row=False):
        s.text(25, top + 18, label, 16, BLACK, anchor="start", weight="bold")
        y = top + 32
        for name, x, w, colour, cut in rows:
            s.box(x, y, w, 30, [name], colour, size=14)
            if cut:
                s.rect(x + w, y, cut, 30, colour, fill="#ffffff", dash=True)
                s.text(x + w + cut / 2, y + 21, "cut off", 14, ORANGE)
                s.line(x + w, y + 3, x + w, y + 27, ORANGE, 3, arrow=False)
            if not same_row:
                y += 38
        if same_row:
            y += 38
        s.line(end_x, top + 26, end_x, y, BLACK, 2, arrow=False, dash=True)
        s.text(end_x + 8 if end_x < 600 else end_x, y + 16, end_label, 14, BLACK,
               anchor="start" if end_x < 600 else "end")

    bars(5, "Command.sequence(A, B): one after the other",
         [("A", X0, LA, BLUE, 0), ("B", X0 + LA, LB, GREEN, 0)], X0 + LA + LB, "group ends: B done", same_row=True)
    bars(155, "Command.parallel(A, B): all required",
         [("A (slower)", X0, LA, BLUE, 0), ("B", X0, LB, GREEN, 0)], X0 + LA, "group ends: the slower one")
    bars(305, "Command.race(A, B): first one wins",
         [("A (slower)", X0, LB, BLUE, LA - LB), ("B (faster)", X0, LB, GREEN, 0)], X0 + LB, "group ends: first to finish")
    bars(455, "Command.parallel(A).optional(B)",
         [("A (required)", X0, LB, BLUE, 0), ("B (optional, slower)", X0, LB, GREEN, LA - LB)], X0 + LB,
         "group ends: A done")
    s.text(25, 618, "Two required commands on one mechanism:", 16, BLACK, anchor="start", weight="bold")
    s.box(25, 632, 250, 40, ["driveDistance(1.0)"], ORANGE, size=14)
    s.text(305, 662, "✕", 30, ORANGE, weight="bold")
    s.box(335, 632, 250, 40, ["turnToHeading(90)"], ORANGE, size=14)
    s.text(25, 696, "Both need the Drivetrain: building the group throws an error", 14, ORANGE, anchor="start")
    s.save("09-sequence-parallel-race.svg")


if __name__ == "__main__":
    fig_6_1()
    fig_9_2()
