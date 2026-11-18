"""Lesson 24: the six robot states, the moves canGoTo allows, and the moves periodic() makes.

A diagram, not a measurement. It is drawn from the Lesson 24 snapshot:
code/v3/lesson-24/subsystems/SuperstructureState.java (the enum and canGoTo, the solid
arrows), Superstructure.periodic() (the dashed arrows), and LedConstants (each node's
fill is the colour its state shows on the strip: red, blue at 25%, yellow, lime green;
the states that blink say so). The edge lists below are checked against those two
files, so a change to either one fails the generator instead of leaving a stale drawing.

    python3 tools/figures/24-state-machine.py

Output: docs/lessons/v3/images/24-state-machine.svg
"""

import os
import re

import figstyle

REPO = figstyle.REPO
SNAP = os.path.join(REPO, "code", "v3", "lesson-24", "subsystems")

# What canGoTo allows (solid arrows), as written in SuperstructureState.canGoTo.
CAN_GO_TO = {
    "UNHOMED": [],
    "IDLE": ["INTAKING"],
    "INTAKING": ["HANDOFF", "IDLE"],
    "HANDOFF": ["HOLDING", "IDLE"],
    "HOLDING": ["SCORING", "IDLE"],
    "SCORING": ["IDLE"],
}
# What Superstructure.periodic() does on its own (dashed arrows).
PERIODIC = [("UNHOMED", "IDLE"), ("INTAKING", "HANDOFF"), ("HANDOFF", "HOLDING"),
            ("HANDOFF", "IDLE"), ("HOLDING", "IDLE"), ("SCORING", "IDLE")]


def check_against_the_code():
    enum = open(os.path.join(SNAP, "SuperstructureState.java"), encoding="utf-8").read()
    for state, nexts in CAN_GO_TO.items():
        m = re.search(r"case %s -> ([^;]+);" % state, enum)
        written = re.findall(r"next == (\w+)", m.group(1)) if m else []
        assert sorted(written) == sorted(nexts), (state, written, nexts)
    periodic = open(os.path.join(SNAP, "Superstructure.java"), encoding="utf-8").read()
    body = periodic[periodic.index("private void periodic()"):periodic.index("Logger.recordOutput")]
    found = set()
    for block in re.finditer(r"case ([A-Z, ]+?) -> \{(.*?)\n      \}", body, re.S):
        for state in re.findall(r"[A-Z]+", block.group(1)):
            for target in re.findall(r"m_state = SuperstructureState\.(\w+)", block.group(2)):
                found.add((state, target))
    assert found == set(PERIODIC), (sorted(found), sorted(PERIODIC))


W, H = 800, 970
CX, NODE_W, NODE_H = 170, 210, 64
ROWS = {"UNHOMED": 80, "IDLE": 250, "INTAKING": 420, "HANDOFF": 590, "HOLDING": 760, "SCORING": 910}
FILL = {"UNHOMED": ("#FF0000", "#ffffff", "red, blinking"),
        "IDLE": ("#00003F", "#ffffff", "blue, 25%"),
        "INTAKING": ("#FFFF00", "#000000", "yellow"),
        "HANDOFF": ("#FFFF00", "#000000", "yellow, blinking"),
        "HOLDING": ("#32CD32", "#000000", "green"),
        "SCORING": ("#32CD32", "#000000", "green, blinking")}
REQUEST = "#000000"
SELF = figstyle.SETPOINT
GUIDE = figstyle.NEUTRAL
SOLID_RAIL, SELF_RAIL = 540, 640

out = []


def add(s):
    out.append(s)


def text(x, y, s, size=16, color="#000000", anchor="start", weight="normal"):
    add(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" '
        f'font-weight="{weight}">{s}</text>')


def seg(points, color, dashed, arrow=True):
    d = " ".join(f"{'M' if i == 0 else 'L'} {x} {y}" for i, (x, y) in enumerate(points))
    dash = ' stroke-dasharray="9 6"' if dashed else ""
    mark = f' marker-end="url(#head-{"self" if dashed else "req"})"' if arrow else ""
    add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3"{dash}{mark}/>')


def main():
    check_against_the_code()
    add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="sans-serif">')
    add(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>')
    add('<defs>')
    for name, color in (("req", REQUEST), ("self", SELF)):
        add(f'<marker id="head-{name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
            f'markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" '
            f'fill="{color}"/></marker>')
    add('</defs>')

    left, right = CX - NODE_W // 2, CX + NODE_W // 2

    # Forward arrows between neighbours in the column: solid at x=CX-30, dashed at x=CX+30.
    order = ["UNHOMED", "IDLE", "INTAKING", "HANDOFF", "HOLDING", "SCORING"]
    for upper, lower in zip(order, order[1:]):
        y0, y1 = ROWS[upper] + NODE_H // 2 + 4, ROWS[lower] - NODE_H // 2 - 4
        if lower in CAN_GO_TO[upper]:
            seg([(CX - 30, y0), (CX - 30, y1)], REQUEST, False)
        if (upper, lower) in PERIODIC:
            seg([(CX + 30, y0), (CX + 30, y1)], SELF, True)

    # What each forward arrow is, in a few words, between the column and the rails.
    mid = lambda a, b: (ROWS[a] + ROWS[b]) // 2 + 5
    text(right + 22, mid("UNHOMED", "IDLE"), "elevator.isHomed()", 16, SELF)
    text(right + 22, mid("IDLE", "INTAKING"), "requestIntake", 16, REQUEST)
    text(right + 22, mid("INTAKING", "HANDOFF") - 10, "debounced beam break", 16, SELF)
    text(right + 22, mid("HANDOFF", "HOLDING") - 10, "elevator and arm", 16, SELF)
    text(right + 22, mid("HANDOFF", "HOLDING") + 10, "both atGoal", 16, SELF)
    text(right + 22, mid("HOLDING", "SCORING"), "requestScore", 16, REQUEST)

    # The "back to IDLE" rails on the right.
    idle_y = ROWS["IDLE"]
    seg([(SOLID_RAIL, ROWS["SCORING"] - 8), (SOLID_RAIL, idle_y - 10), (right + 4, idle_y - 10)],
        REQUEST, False)
    seg([(SELF_RAIL, ROWS["SCORING"] + 10), (SELF_RAIL, idle_y + 10), (right + 4, idle_y + 10)],
        SELF, True)
    for state in ("INTAKING", "HANDOFF", "HOLDING", "SCORING"):
        y = ROWS[state] - 8
        seg([(right, y), (SOLID_RAIL, y)], REQUEST, False, arrow=False)
    for state in ("HANDOFF", "HOLDING", "SCORING"):
        y = ROWS[state] + 10
        seg([(right, y), (SELF_RAIL, y)], SELF, True, arrow=False)
    text(SOLID_RAIL, idle_y - 62, "requestIdle", 16, REQUEST, "middle", "bold")
    text(SOLID_RAIL, idle_y - 40, "from these four", 15, REQUEST, "middle")
    text(SELF_RAIL + 20, idle_y - 62, "piece gone", 16, SELF, "middle", "bold")
    text(SELF_RAIL + 20, idle_y - 40, "from these three", 15, SELF, "middle")

    # The nodes, on top of the arrows' ends.
    for state in order:
        fill, ink, sub = FILL[state]
        y = ROWS[state]
        add(f'<rect x="{left}" y="{y - NODE_H // 2}" width="{NODE_W}" height="{NODE_H}" rx="14" '
            f'fill="{fill}" stroke="#000000" stroke-width="2.5"/>')
        text(CX, y - 3, state, 22, ink, "middle", "bold")
        text(CX, y + 20, sub, 14, ink, "middle")

    # The legend, and the one rule UNHOMED carries.
    lx, ly = 330, 46
    seg([(lx, ly), (lx + 56, ly)], REQUEST, False)
    text(lx + 70, ly + 6, "a request canGoTo allows", 16)
    seg([(lx, ly + 36), (lx + 56, ly + 36)], SELF, True)
    text(lx + 70, ly + 42, "periodic() decides, nobody asked", 16)
    text(lx, ly + 76, "UNHOMED.canGoTo(anything) is false", 16, GUIDE)

    add("</svg>")
    path = os.path.join(figstyle.IMAGES, "24-state-machine.svg")
    os.makedirs(figstyle.IMAGES, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(path)


if __name__ == "__main__":
    main()
