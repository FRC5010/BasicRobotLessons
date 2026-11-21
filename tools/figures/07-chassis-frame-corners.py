"""Lesson 7: the chassis frame, the four corners and the two moves (Figure 7.1).

Drawn from DriveConstants (kHalfLength = kHalfWidth = 0.3 m, corners FL, FR, BL,
BR = array slots 0..3) and from the angle formulas the lesson uses: translate
steers every wheel to atan2(vy, vx), rotate steers each wheel to
atan2(x, -y) of its own corner. A diagram, so it has no data file.

Output: docs/lessons/v3/images/07-chassis-frame-corners.svg
"""

import math
import os

import figstyle

BLUE = figstyle.SETPOINT
ORANGE = figstyle.MEASURED
GREEN = figstyle.ALTERNATE
GREY = figstyle.NEUTRAL
INK = "#222222"

HALF = 0.3          # DriveConstants.kHalfLength and kHalfWidth, meters
SCALE = 170.0       # px per meter
CORNERS = [("FL", +HALF, +HALF), ("FR", +HALF, -HALF), ("BL", -HALF, +HALF), ("BR", -HALF, -HALF)]


def page(cx, cy, x, y):
    """Robot frame (+X forward, +Y left) to page coordinates (+X up, +Y left)."""
    return cx - y * SCALE, cy - x * SCALE


def arrow(x1, y1, x2, y2, color, width=3.5, marker="head"):
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" '
            f'stroke-width="{width}" marker-end="url(#{marker})"/>')


def text(x, y, s, size=14, anchor="middle", weight="normal", color=INK):
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="{size}" '
            f'font-weight="{weight}" fill="{color}">{s}</text>')


def chassis(cx, cy):
    half = HALF * SCALE
    return (f'<rect x="{cx - half:.1f}" y="{cy - half:.1f}" width="{2 * half:.1f}" height="{2 * half:.1f}" '
            f'rx="6" fill="#f1f1f1" stroke="{GREY}" stroke-width="2.5"/>'
            # The front, so "forward" is visible even with the axes hidden.
            f'<line x1="{cx - half:.1f}" y1="{cy - half:.1f}" x2="{cx + half:.1f}" y2="{cy - half:.1f}" '
            f'stroke="{INK}" stroke-width="6"/>')


def wheel(px, py, heading_deg, color, length=40):
    """A wheel drawn as a rounded bar along its steer angle (CCW from +X) with an arrow ahead of it."""
    # Page direction of a robot-frame angle: right = -sin, up = cos.
    dx, dy = -math.sin(math.radians(heading_deg)), -math.cos(math.radians(heading_deg))  # page y grows downward
    out = []
    w = 9
    ax, ay = px - dx * 17, py - dy * 17
    bx, by = px + dx * 17, py + dy * 17
    out.append(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{bx:.1f}" y2="{by:.1f}" stroke="{INK}" stroke-width="{w * 2}" stroke-linecap="round"/>')
    out.append(arrow(px, py, px + dx * (17 + length), py + dy * (17 + length), color, 4))
    return "\n".join(out), (px + dx * (17 + length), py + dy * (17 + length))


def build():
    p = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" font-family="sans-serif">']
    p.append('<defs>'
             f'<marker id="head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker>'
             '</defs>')
    p.append('<rect x="0" y="0" width="800" height="540" fill="#ffffff"/>')

    centers = [(140, 270), (405, 270), (660, 270)]
    titles = ["The frame", "translate: one angle", "rotate: one angle per corner"]
    for (cx, _), t in zip(centers, titles):
        p.append(text(cx, 30, t, 17, weight="bold"))
    for x in (275, 535):
        p.append(f'<line x1="{x}" y1="50" x2="{x}" y2="500" stroke="#dddddd" stroke-width="2"/>')

    # ---- Panel 1: axes, corners, yaw.
    cx, cy = centers[0]
    p.append(chassis(cx, cy))
    p.append(arrow(cx, cy, cx, cy - 135, BLUE, 4))
    p.append(text(cx + 8, cy - 140, "+X", 16, "start", "bold", BLUE))
    p.append(text(cx + 8, cy - 160, "forward", 14, "start", color=BLUE))
    p.append(arrow(cx, cy, cx - 105, cy, GREEN, 4))
    p.append(text(cx - 105, cy - 12, "+Y", 16, "middle", "bold", GREEN))
    p.append(text(cx - 105, cy + 22, "left", 14, "middle", color=GREEN))
    # Yaw: a CCW arc (seen from above) around the middle.
    r = 30
    p.append(f'<path d="M {cx + r:.1f} {cy:.1f} A {r} {r} 0 1 0 {cx:.1f} {cy + r:.1f}" fill="none" stroke="{ORANGE}" stroke-width="4" marker-end="url(#head)" transform="rotate(-0 {cx} {cy})"/>')
    p.append(text(cx, 440, "yaw + is counterclockwise", 15, "middle", "bold", ORANGE))
    for i, (name, x, y) in enumerate(CORNERS):
        px, py = page(cx, cy, x, y)
        p.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="7" fill="{INK}"/>')
        left = y > 0
        tx = px - 12 if left else px + 12
        ty = py - 12 if x > 0 else py + 26
        anchor = "end" if left else "start"
        p.append(text(tx, ty, f"{name} ({i})", 15, anchor, "bold"))
        p.append(text(tx, ty + 17, f"{x:+.1f}, {y:+.1f}", 14, anchor, color=GREY))
    p.append(text(cx, 460, "(seen from above)", 14, color=GREY))
    p.append(text(cx, 478, "the front is at the top", 14, color=GREY))

    # ---- Panel 2: translate, all four wheels at the same angle.
    cx, cy = centers[1]
    p.append(chassis(cx, cy))
    angle = 45.0
    for name, x, y in CORNERS:
        px, py = page(cx, cy, x, y)
        svg, _ = wheel(px, py, angle, BLUE, 44)
        p.append(svg)
    p.append(text(cx, 440, "every wheel steers to atan2(vy, vx)", 14))
    p.append(text(cx, 460, f"here {angle:.0f}°: forward and left", 14, color=GREY))
    p.append(text(cx, 478, "(0° is forward, counting CCW)", 14, color=GREY))

    # ---- Panel 3: rotate, the pinwheel.
    cx, cy = centers[2]
    p.append(chassis(cx, cy))
    for name, x, y in CORNERS:
        px, py = page(cx, cy, x, y)
        a = math.degrees(math.atan2(x, -y))
        if a > 180:
            a -= 360
        svg, tip = wheel(px, py, a, ORANGE, 44)
        p.append(svg)
        # label beside the wheel, on the outside of the chassis
        left = y > 0
        lx = px - 36 if left else px + 36
        ly = py - 26 if x > 0 else py + 36
        p.append(text(lx, ly, f"{a:.0f}°", 15, "end" if left else "start", "bold", ORANGE))
    p.append(text(cx, 440, "each wheel steers to atan2(x, -y)", 14))
    p.append(text(cx, 460, "of its own corner: a pinwheel", 14))
    p.append(text(cx, 478, "(the robot spins CCW)", 14, color=GREY))

    p.append('</svg>')
    return "\n".join(p) + "\n"


def main():
    path = os.path.join(figstyle.IMAGES, "07-chassis-frame-corners.svg")
    os.makedirs(figstyle.IMAGES, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(build())
    print(path)


if __name__ == "__main__":
    main()
