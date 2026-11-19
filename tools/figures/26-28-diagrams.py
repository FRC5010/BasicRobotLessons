"""Batch 2 diagrams for Lessons 26, 27 and 28, drawn as SVG from the lessons' own constants.

  python3 tools/figures/26-28-diagrams.py

writes, to docs/lessons/v3/images/:
  26-line-frame-stages.svg   the line from (1, 1) to (5, 4), x' along it and y' off it to the left,
                             the handoff point kHandoffDistance = 1.0 m short of the target
  27-bearing-rate.svg        why only the sideways part of the velocity turns the bearing:
                             omega = v_perp / r at 3 m and at 6 m from tag 20
  28-dial-needle.svg         the speedometer needle at 0, 30 (idle), 60 and 101.08 rot/s and at -50%,
                             from angle = kZeroAngle - kFullSweep * (speed / kFreeSpeed)

No data and no measurements: the numbers are the lessons' own (Lesson 26's example drive, tag 20's
position from Lesson 27, Lesson 28's Constants.java). The robot's spot in Figure 26.1 and the
velocity split in Figure 27.1 are illustrations, not data.
"""
import importlib.util
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, PURPLE, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.PURPLE, d.BLACK


def rtext(s, x, y, text, size=15, colour=BLACK, angle=0, anchor="middle", weight="normal"):
    s.add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{colour}" text-anchor="{anchor}" '
          f'font-weight="{weight}" transform="rotate({angle:.2f} {x:.1f} {y:.1f})">{d.esc(text)}</text>')


# ---------------------------------------------------------------- Figure 26.1
def fig_26():
    s = Svg(800, 700)
    K = 120.0                          # px per meter
    S0 = (110.0, 600.0)                 # start (1, 1)
    start, target, L = (1.0, 1.0), (5.0, 4.0), 5.0
    ux, uy = (target[0] - start[0]) / L, (target[1] - start[1]) / L   # along the line: (0.8, 0.6)
    nx, ny = -uy, ux                                                  # to its left: (-0.6, 0.8)
    deg = -math.degrees(math.atan2(uy, ux))                           # the line's tilt on screen

    def P(a, b):                      # a along the line, b to its left -> screen
        fx, fy = a * ux + b * nx, a * uy + b * ny
        return S0[0] + fx * K, S0[1] - fy * K

    # field axes, for orientation
    s.line(700, 690, 765, 690, GREY, 2)
    s.line(700, 690, 700, 625, GREY, 2)
    s.text(706, 618, "field y", 14, GREY, "start")
    s.text(765, 674, "field x", 14, GREY, "end")

    # the two stages along the line
    H = L - 1.0                       # the handoff point: kHandoffDistance short of the target
    sx, sy = P(0, 0)
    hx, hy = P(H, 0)
    tx, ty = P(L, 0)
    s.line(sx, sy, hx, hy, BLUE, 5, arrow=False)
    s.line(hx, hy, tx, ty, ORANGE, 5, arrow=False)
    # the frame's axes, drawn from the start
    s.line(sx, sy, *P(0.9, 0), BLACK, 3)
    s.line(sx, sy, *P(0, 0.9), BLACK, 3)
    ax, ay = P(0.9, 0)
    s.text(ax + 8, ay + 26, "x′", 18, BLACK, "start", "bold")
    bx, by = P(0, 0.9)
    s.text(bx - 8, by - 4, "y′", 18, BLACK, "end", "bold")

    # start and target
    s.add(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="7" fill="{BLACK}"/>')
    s.add(f'<circle cx="{tx:.1f}" cy="{ty:.1f}" r="7" fill="{BLACK}"/>')
    s.text(sx - 14, sy + 24, "S (1, 1)", 15, BLACK, "end", "bold")
    s.text(tx + 12, ty - 14, ["T (5, 4),", "facing 90°"], 15, BLACK, "start", "bold")
    # handoff point
    s.add(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="9" fill="#ffffff" stroke="{BLACK}" stroke-width="3"/>')
    s.text(hx - 16, hy - 40, ["handoff point:", "stage one's goal"], 15, BLACK, "end", "bold")
    # 1.0 m bracket, on the right-hand side of the line
    b0, b1 = P(H, -0.3), P(L, -0.3)
    s.line(hx, hy, b0[0], b0[1], GREY, 1.5, arrow=False)
    s.line(tx, ty, b1[0], b1[1], GREY, 1.5, arrow=False)
    s.line(b0[0], b0[1], b1[0], b1[1], GREY, 2, arrow=False)
    s.text((b0[0] + b1[0]) / 2 + 22, (b0[1] + b1[1]) / 2 + 30, ["kHandoffDistance", "= 1.0 m"], 15, GREY, "start", "bold")

    # the robot: 2.0 m along, 0.8 m off the line to the left
    ra, rb = 2.0, 0.8
    rx, ry = P(ra, rb)
    px, py = P(ra, 0)
    s.line(px, py, rx, ry, GREY, 2, arrow=False, dash=True)
    s.add(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="4" fill="{GREY}"/>')
    # x' as a dimension line under the line
    d0, d1 = P(0, -0.35), P(ra, -0.35)
    s.line(sx, sy, d0[0], d0[1], GREY, 1.5, arrow=False)
    s.line(px, py, d1[0], d1[1], GREY, 1.5, arrow=False)
    s.line(d0[0], d0[1], d1[0], d1[1], GREY, 2, arrow=False)
    mx, my = (d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2
    rtext(s, mx + 30, my + 20, "x′ = 2.0 m along", 15, GREY, deg, "middle", "bold")
    ox, oy = P(ra, rb / 2)
    s.text(ox - 14, oy + 4, ["y′ = +0.8 m,", "off to the left"], 15, GREY, "end", "bold")
    # the robot: a square turned to face along the line, with a nose
    s.add(f'<g transform="translate({rx:.1f} {ry:.1f}) rotate({deg:.2f})"><rect x="-22" y="-22" width="44" height="44" rx="4" '
          f'fill="#F7F7F7" stroke="{BLACK}" stroke-width="3"/><path d="M10,-12 L22,0 L10,12" fill="none" stroke="{BLACK}" stroke-width="3"/></g>')
    # velocity components, added tip to tail: the plan's speed along the line, then the P push back toward it
    ex, ey = P(ra + 1.0, rb)
    s.line(rx + 26 * ux, ry - 26 * uy, ex, ey, BLUE, 4)
    qx, qy = P(ra + 1.0, rb - 0.55)
    s.line(ex, ey, qx, qy, ORANGE, 4)
    s.line(rx + 26 * ux, ry - 26 * uy, qx, qy, BLACK, 2, dash=True)
    # key
    kx, ky = 420, 440
    s.line(kx, ky, kx + 44, ky, BLUE, 4)
    s.text(kx + 56, ky + 5, "the plan's speed, along the line", 15, BLUE, "start", "bold")
    s.line(kx, ky + 34, kx + 44, ky + 34, ORANGE, 4)
    s.text(kx + 56, ky + 39, "the P push, along −y′: kCrossTrackP × y′", 15, ORANGE, "start", "bold")
    s.line(kx, ky + 68, kx + 44, ky + 68, BLACK, 2, dash=True)
    s.text(kx + 56, ky + 73, ["the sum: what the drivetrain is asked for,", "rotated back into field speeds"], 15, BLACK, "start", "bold")

    # the two stages' boxes
    s.rect(20, 20, 340, 96, BLUE)
    s.text(190, 46, "Stage one: travelToward", 16, BLUE, "middle", "bold")
    s.text(190, 70, ["S to the handoff point", "goal: that point, still moving", "(kHandoffSpeed), then done"], 15, BLACK)
    s.rect(20, 128, 340, 74, ORANGE)
    s.text(190, 154, "Stage two: approach", 16, ORANGE, "middle", "bold")
    s.text(190, 178, ["handoff point to T", "goal: T, stopped, facing 90°"], 15, BLACK)

    s.text(400, 650, "x′ is how far along the line, y′ is how far off to the left,", 15, BLACK, "middle")
    s.text(400, 670, "both measured from S. The line stays put while a stage runs.", 15, BLACK, "middle")
    s.save("26-line-frame-stages.svg")


# ---------------------------------------------------------------- Figure 27.1
def fig_27():
    s = Svg(800, 700)
    K = 60.0                  # px per meter between the robot and the tag
    KV = 40.0                 # px per (m/s) for the velocity arrows
    vpar, vperp = 2.0, 3.0    # an illustration: 2 m/s toward the tag, 3 m/s across the line

    def panel(y0, r, title, omega):
        tagx, ty = 740.0, y0 + 190
        rx = tagx - r * K
        s.text(400, y0 + 22, title, 18, BLACK, "middle", "bold")
        # the robot's velocity, split into the two parts that matter (the same in both panels)
        ox, oy = 50.0, ty - 6
        s.line(ox, oy, ox, oy - vperp * KV, ORANGE, 4)
        s.line(ox, oy, ox + vpar * KV, oy, BLUE, 4)
        s.text(ox + 12, oy - vperp * KV + 16, ["v⊥ = 3 m/s", "across the line"], 15, ORANGE, "start", "bold")
        s.text(ox, oy + 24, "v∥ = 2 m/s, along the line: no swing", 15, BLUE, "start", "bold")
        # sight line robot -> tag
        s.line(rx, ty, tagx - 14, ty, GREY, 3, arrow=False, dash=True)
        s.text((rx + tagx) / 2, ty + 28, f"r = {r:g} m", 16, GREY, "middle", "bold")
        s.add(f'<rect x="{tagx - 12:.1f}" y="{ty - 12:.1f}" width="24" height="24" fill="{BLACK}"/>')
        s.text(tagx, ty + 36, ["tag 20", "(5.229, 4.035)"], 14, BLACK, "middle")
        s.add(f'<rect x="{rx - 20:.1f}" y="{ty - 20:.1f}" width="40" height="40" rx="4" fill="#F7F7F7" stroke="{BLACK}" stroke-width="3"/>')
        s.text(rx, ty + 44, "robot", 14, BLACK)
        # the sideways step alone, 0.15 s of v-perp, and the new sight line
        step = vperp * 0.3 * K
        gy = ty - step
        s.add(f'<rect x="{rx - 20:.1f}" y="{gy - 20:.1f}" width="40" height="40" rx="4" fill="none" stroke="{GREY}" stroke-width="2" stroke-dasharray="4 3"/>')
        s.line(rx + 20, gy, tagx - 10, ty - 4, GREY, 2, arrow=False)
        a1 = math.atan2(ty - gy, tagx - (rx + 20))
        rad = 100
        s.path(f"M{tagx - rad:.1f},{ty:.1f} A{rad},{rad} 0 0 1 {tagx - rad * math.cos(a1):.1f},{ty - rad * math.sin(a1):.1f}", PURPLE, 3, arrow=False)
        s.text(tagx - 60, ty - 84, "the bearing swings", 14, PURPLE, "end", "bold")
        s.text(tagx, y0 + 70, f"ω = v⊥ ÷ r = 3 ÷ {r:g} = {omega:g} rad/s", 17, PURPLE, "end", "bold")

    panel(20, 3, "3 m from the tag", 1.0)
    panel(310, 6, "6 m from the tag, the same velocity", 0.5)
    s.text(400, 670, "bearingRate = (vx · offsetY − vy · offsetX) ÷ distance², and only v⊥ gets through", 15, BLACK, "middle", "bold")
    s.text(400, 646, "dashed square: the robot after a sideways step of 0.3 s", 14, GREY, "middle")
    s.save("27-bearing-rate.svg")


# ---------------------------------------------------------------- Figure 28.1
def fig_28():
    FREE, ZERO, SWEEP = 101.08, -90.0, 180.0
    W, H = 800, 800
    s = Svg(W, H)
    cx, cy, R = 400.0, 390.0, 215.0          # the dial is 2 m across, so 107.5 px per m
    NEEDLE = R * 0.8                         # kNeedleLength 0.8 m against a 1 m radius
    s.add(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#FAFAFA" stroke="{GREY}" stroke-width="3"/>')

    def angle(rps, clamp=True):
        f = rps / FREE
        if clamp:
            f = max(-1.0, min(1.0, f))
        return ZERO - SWEEP * f

    def tip(a, r):
        return cx + r * math.cos(math.radians(a)), cy - r * math.sin(math.radians(a))

    # the unclamped 150% needle: it wraps all the way round to 0 degrees, on top of the -50% one
    wa = angle(1.5 * FREE, clamp=False)
    x0, y0 = tip(wa, NEEDLE)
    x1, y1 = tip(wa, R - 2)
    s.line(x0, y0, x1, y1, GREY, 4, arrow=False, dash=True)
    # the clamp mark at the top
    s.line(*tip(90, R - 12), *tip(90, R + 12), BLACK, 5, arrow=False)
    needles = [
        (0.0, BLACK, "0 rot/s", "at rest"),
        (30.0, BLUE, "30 rot/s", "idle"),
        (60.0, GREEN, "60 rot/s", "ready to shoot"),
        (FREE, ORANGE, "101.08 rot/s", "full scale"),
        (-FREE / 2, PURPLE, "−50.54 rot/s", "−50%"),
    ]
    for rps, col, l1, l2 in needles:
        a = angle(rps)
        x, y = tip(a, NEEDLE)
        s.line(cx, cy, x, y, col if col != BLACK else GREY, 6)
        lx, ly = tip(a, R + 18)
        deg = f"{a:.0f}°".replace("-", "−")
        side = lx - cx
        anchor = "start" if side > 5 else ("end" if side < -5 else "middle")
        yy = ly + (-4 if abs(side) > 5 else (-30 if ly < cy else 24))
        s.text(lx + (6 if side > 5 else -6 if side < -5 else 0), yy, [l1, f"{l2}, {deg}"], 15, col, anchor, "bold")
    s.add(f'<circle cx="{cx}" cy="{cy}" r="10" fill="{BLACK}"/>')
    # the two notes
    s.text(cx + R + 24, cy + 52, ["150% with no clamp", "wraps round to here,", "same as −50%"], 14, GREY, "start", "bold")
    s.text(cx + 14, cy - R + 34, "the clamp stops it here", 14, BLACK, "start", "bold")
    s.text(400, 40, "kDialSize = 2 m across, kNeedleLength = 0.8 m", 15, GREY, "middle")
    s.text(400, 718, "angle = −90° − 180° × (speed ÷ kFreeSpeed)", 18, BLACK, "middle", "bold")
    s.text(400, 746, "kZeroAngle = −90°, kFullSweep = 180°, kFreeSpeed = 101.08 rot/s", 15, GREY, "middle")
    s.text(400, 770, "60 rot/s is 59.4% of full scale", 15, GREY, "middle")
    s.save("28-dial-needle.svg")


if __name__ == "__main__":
    fig_26()
    fig_27()
    fig_28()
