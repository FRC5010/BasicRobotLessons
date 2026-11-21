"""Lesson 20: the arm's angle convention, its stops, the cos(theta) lever arm, and the drawing angle.

A diagram, not a measurement: it is drawn from the lesson's own constants
(ArmConstants.kArmLength = 20 in = 0.508 m, the centre of mass at half the length,
kMinAngle = -20 deg, kMaxAngle = 180 deg, kStowed = 90 deg, and
ElevatorConstants.kCarriageAngle = 90 deg, which toDrawingAngle subtracts).
No data file, no probe.

    python3 tools/figures/20-arm-angle-convention.py

Output: docs/lessons/v3/images/20-arm-angle-convention.svg
"""

import math
import os

import figstyle

ARM_LENGTH_M = 20 * 0.0254   # Inches.of(20)
COM_M = ARM_LENGTH_M / 2     # uniform rod
MIN_DEG = -20.0
MAX_DEG = 180.0
STOWED_DEG = 90.0
CARRIAGE_DEG = 90.0

W, H = 800, 1040
ARM = figstyle.MEASURED
GUIDE = figstyle.NEUTRAL
INK = "#000000"
ALLOWED = "#e3eef8"
FORBIDDEN = "#ececec"

out = []


def add(s):
    out.append(s)


def pt(cx, cy, r, deg):
    """Screen point r px from (cx, cy) at a world angle (up is positive)."""
    a = math.radians(deg)
    return cx + r * math.cos(a), cy - r * math.sin(a)


def line(p, q, color=INK, width=2.5, dash=None, marker=""):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    add(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" '
        f'stroke="{color}" stroke-width="{width}"{d} stroke-linecap="round"{marker}/>')


def text(x, y, s, size=16, color=INK, anchor="start", weight="normal"):
    add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" '
        f'text-anchor="{anchor}" font-weight="{weight}">{s}</text>')


def sector(cx, cy, r, a0, a1, fill):
    """A filled pie slice from world angle a0 counter-clockwise to a1."""
    p0, p1 = pt(cx, cy, r, a0), pt(cx, cy, r, a1)
    large = 1 if (a1 - a0) % 360 > 180 else 0
    add(f'<path d="M {cx} {cy} L {p0[0]:.1f} {p0[1]:.1f} A {r} {r} 0 {large} 0 '
        f'{p1[0]:.1f} {p1[1]:.1f} Z" fill="{fill}" stroke="none"/>')


def dot(p, r=6, color=INK):
    add(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{color}"/>')


def arc(cx, cy, r, a0, a1, color=GUIDE, width=2):
    """A stroked arc between two world angles, counter-clockwise from a0 to a1."""
    p0, p1 = pt(cx, cy, r, a0), pt(cx, cy, r, a1)
    large = 1 if (a1 - a0) % 360 > 180 else 0
    add(f'<path d="M {p0[0]:.1f} {p0[1]:.1f} A {r} {r} 0 {large} 0 {p1[0]:.1f} {p1[1]:.1f}" '
        f'fill="none" stroke="{color}" stroke-width="{width}"/>')


def panel_a():
    cx, cy, scale = 330, 300, 200  # pivot, and px per ARM_LENGTH_M
    text(24, 40, "Side view, from the pivot: the angle is measured up from horizontal", 18,
         weight="bold")
    r = scale + 20
    sector(cx, cy, r, MIN_DEG, MAX_DEG, ALLOWED)
    sector(cx, cy, r, MAX_DEG, 360 + MIN_DEG, FORBIDDEN)
    text(cx, cy + 140, "no travel here", 16, GUIDE, "middle")
    text(cx, cy + 162, "(the stops are at −20° and 180°)", 16, GUIDE, "middle")

    # Zero line: horizontal, drawn across the whole width of the pivot.
    line((cx - r, cy), (cx + r + 20, cy), GUIDE, 1.5, "6 5")
    # Vertical through the pivot: where the lever arm is measured from.
    line((cx, cy - r), (cx, cy + 10), GUIDE, 1.5, "6 5")

    # The stops.
    for deg, label, dx, dy, anchor in ((MIN_DEG, "kMinAngle = −20°", 12, 28, "start"),
                                       (MAX_DEG, "kMaxAngle = 180°", 0, -14, "start")):
        end = pt(cx, cy, scale + 20, deg)
        line((cx, cy), end, INK, 4)
        text(end[0] + dx, end[1] + dy, label, 16, INK, anchor, "bold")

    # Three arm positions, each with its centre of mass and the horizontal lever arm.
    for deg, color_label in ((0, "0°"), (45, "45°"), (90, "90°")):
        tip = pt(cx, cy, scale, deg)
        line((cx, cy), tip, ARM, 6)
        com = pt(cx, cy, scale / 2, deg)
        dot(com, 7, INK)
        lever = COM_M * math.cos(math.radians(deg))
        if deg == 0:
            y = cy + 34
            line((cx, y), (com[0], y), INK, 2, "7 5")
            line((cx, y - 7), (cx, y + 7), INK, 2)
            line((com[0], y - 7), (com[0], y + 7), INK, 2)
            text(com[0] + 14, y + 6, f"{lever:.3f} m", 16)
        elif deg == 45:
            line((cx, com[1]), (com[0], com[1]), INK, 2, "7 5")
            text(cx + 6, com[1] - 8, f"{lever:.3f} m", 16)
        else:
            text(cx + 12, com[1] + 5, "0 m", 16)
    text(cx + scale + 26, cy - 8, "0°", 16, INK, "start", "bold")
    tip45 = pt(cx, cy, scale, 45)
    text(tip45[0] + 8, tip45[1] - 4, "45°", 16, INK, "start", "bold")
    text(cx + 10, cy - scale - 24, "90° (kStowed)", 16, INK, "start", "bold")

    dot((cx, cy), 9, INK)
    text(cx - 14, cy + 28, "pivot", 16, INK, "end")

    # Callouts on the right.
    x = 592
    text(x, 90, "Dots: the centre of mass,", 16, INK)
    text(x, 112, "at half the 0.508 m arm", 16, INK)
    text(x, 150, "Dashed lines: the horizontal", 16, GUIDE)
    text(x, 172, "distance gravity pulls over,", 16, GUIDE)
    text(x, 194, "0.254 m × cos θ", 16, GUIDE)
    text(x, 250, "The firmware assumes", 16, INK, "start", "bold")
    text(x, 272, "the sensor reads 0 when", 16, INK, "start", "bold")
    text(x, 294, "the arm is on the 0° line.", 16, INK, "start", "bold")


def panel_b():
    top = 590
    text(24, top, "In the drawing, an angle is measured from the part it is attached to", 18,
         weight="bold")
    # Two mini-drawings: the arm horizontal, and the arm stowed.
    for base_x, arm_world, caption in ((180, 0.0, "arm horizontal"), (560, STOWED_DEG, "arm stowed")):
        base_y = top + 300
        carriage_top = (base_x, base_y - 150)
        line((base_x - 28, base_y), (base_x + 28, base_y), GUIDE, 3)
        line((base_x, base_y), carriage_top, "#555555", 8)
        text(base_x - 14, base_y - 80, "carriage", 16, "#555555", "end")
        text(base_x - 14, base_y - 60, f"{CARRIAGE_DEG:.0f}°", 16, "#555555", "end")
        # The reference line the arm's angle is measured from: the carriage, extended.
        line(carriage_top, (carriage_top[0], carriage_top[1] - 110), GUIDE, 1.5, "6 5")
        tip = pt(carriage_top[0], carriage_top[1], 130, arm_world)
        line(carriage_top, tip, ARM, 8)
        drawing = arm_world - CARRIAGE_DEG
        # The angle between the carriage's direction and the arm, from the carriage's direction.
        a0, a1 = sorted((CARRIAGE_DEG, arm_world))
        if a1 - a0 > 1:
            arc(carriage_top[0], carriage_top[1], 52, a0, a1, INK, 2.5)
        text(base_x, base_y + 36, caption, 16, INK, "middle", "bold")
        text(base_x, base_y + 60, f"world angle {arm_world:.0f}°", 16, INK, "middle")
        text(base_x, base_y + 84, f"drawing angle {drawing:.0f}°".replace("-", "−"), 16, ARM, "middle", "bold")
        if arm_world == 0:
            text(carriage_top[0] + 66, carriage_top[1] - 28, "−90°", 18, INK, "start", "bold")
            text(tip[0] + 12, tip[1] + 6, "arm", 16, ARM, "start")
        else:
            text(carriage_top[0] + 14, carriage_top[1] - 60, "arm", 16, ARM, "start")
    text(24, top + 420, "toDrawingAngle(armAngle) = armAngle − kCarriageAngle", 16, INK,
         "start", "bold")


def main():
    add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="sans-serif">')
    add(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>')
    panel_a()
    panel_b()
    add("</svg>")
    path = os.path.join(figstyle.IMAGES, "20-arm-angle-convention.svg")
    os.makedirs(figstyle.IMAGES, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(path)


if __name__ == "__main__":
    main()
