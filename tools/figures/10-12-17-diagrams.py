"""Batch 3 diagrams for Lessons 10, 12 and 17, drawn as SVG from the lessons' own wording.

  python3 tools/figures/10-12-17-diagrams.py

writes, to docs/lessons/v3/images/:
  10-optimize-short-way.svg   Lesson 10 section 5: wheel at 10 deg, kinematics says 190 deg at +2 m/s
  12-coach-and-player.svg     Lesson 12 section 1: 50 Hz code (every 20 ms) over the TalonFX's ~1 kHz loop
  17-three-loops.svg          Lesson 17 section 4: PathConstants.kTranslationP / kRotationP / kCrossTrackP

No data and no measurements. The numbers are the lessons' own (10 deg, 190 deg, +/-2 m/s;
20 ms, 50 Hz, about 1000 times per second; kTranslationP 5.0, kRotationP 3.0, kCrossTrackP 2.0).
"""
import importlib.util
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK


def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy - r * math.sin(a)


def fig_10_optimize():
    s = Svg(800, 490)
    r = 95
    for cx, title, col in ((200, "Without optimize", ORANGE), (600, "With optimize", GREEN)):
        s.text(cx, 34, title, 18, weight="bold")
        cy = 200
        s.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff" stroke="{GREY}" stroke-width="2"/>')
        # target 190 deg (dashed), wheel now 10 deg (solid)
        tx, ty = pt(cx, cy, r - 4, 190)
        s.line(cx, cy, tx, ty, GREY, 3, arrow=True, dash=True)
        wx, wy = pt(cx, cy, r - 4, 10)
        s.line(cx, cy, wx, wy, BLACK, 4)
        s.text(wx - 4, wy + 26, "now 10°", 15, BLACK, "start", "bold")
        s.text(tx - 12, ty + 26, "target 190°", 15, GREY, "end")
    # left: long way round
    cx, cy = 200, 200
    ax, ay = pt(cx, cy, 128, 10)
    bx, by = pt(cx, cy, 128, 190)
    s.path(f"M{ax:.1f},{ay:.1f} A128,128 0 0 0 {bx:.1f},{by:.1f}", ORANGE, 4)
    s.text(cx, cy - 138, "steer 180°", 17, ORANGE, weight="bold")
    s.text(cx, 400, ["steer to 190°,", "drive at +2 m/s"], 16, BLACK, weight="bold")
    # right: no turn, drive reversed
    cx = 600
    s.text(cx, cy - 138, "steer 0°: it's already at 10°", 15, GREEN, weight="bold")
    gx1, gy1 = pt(cx - 10, cy + 125, 70, 10)
    gx2, gy2 = pt(cx - 10, cy + 125, 70, 190)
    s.line(gx1, gy1, gx2, gy2, GREEN, 4)
    s.text(cx, cy + 158, "drive runs backward", 15, GREEN, weight="bold")
    s.text(cx, 400, ["stay at 10°,", "drive at −2 m/s"], 16, BLACK, weight="bold")
    s.add('<line x1="400" y1="60" x2="400" y2="420" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="7 5"/>')
    s.text(400, 466, "Same wheel motion on the floor. optimize keeps every steering move under 90°.", 15, GREEN, weight="bold")
    s.save("10-optimize-short-way.svg")


def fig_12_coach():
    s = Svg(800, 470)
    x0, x1 = 60, 740
    span = 60.0  # ms shown
    px = (x1 - x0) / span
    s.text(400, 30, "The same 60 milliseconds, seen by each computer", 18, weight="bold")
    # top lane: your code
    ty = 150
    s.text(x0, 70, "Your code: 50 Hz, one tick every 20 ms", 17, BLUE, "start", "bold")
    s.text(x0, 92, "state a target, then go quiet until the next tick", 15, BLUE, "start")
    s.line(x0, ty, x1, ty, BLUE, 3, arrow=False)
    for k in range(4):
        x = x0 + k * 20 * px
        s.line(x, ty - 22, x, ty + 22, BLUE, 4, arrow=False)
        s.text(x, ty - 30, f"{k * 20} ms" if k else "0", 14, BLUE)
    # bottom lane: TalonFX
    by = 290
    s.text(x0, 378, "The TalonFX: about 1000 times per second", 17, ORANGE, "start", "bold")
    s.text(x0, 400, "closes the loop itself, right next to the sensor", 15, ORANGE, "start")
    s.line(x0, by, x1, by, ORANGE, 3, arrow=False)
    for k in range(61):
        x = x0 + k * px
        h = 18 if k % 20 == 0 else 9
        s.line(x, by - h, x, by + h, ORANGE, 2, arrow=False)
    s.text(x0, by + 42, "small ticks: 1 ms apart", 15, ORANGE, "start")
    # targets flowing down
    for k in range(3):
        x = x0 + k * 20 * px
        s.line(x, ty + 28, x, by - 26, GREEN, 3)
    s.text(x0 + 20 * px + 12, 222, "a new target", 15, GREEN, "start", "bold")
    s.text(400, 452, "Twenty times faster than your 50 Hz loop can even look.", 16, BLACK, weight="bold")
    s.save("12-coach-and-player.svg")


def fig_17_three_loops():
    s = Svg(800, 600)
    s.text(400, 30, "One tick of the follower: three loops, one command", 18, weight="bold")
    ly = 330
    # the path and its end
    s.line(60, ly, 735, ly, GREY, 4, arrow=False, dash=True)
    s.add(f'<circle cx="740" cy="{ly}" r="9" fill="{GREY}"/>')
    s.text(740, ly + 32, "end", 15, GREY)
    s.text(70, ly + 28, "path", 15, GREY, "start")
    # robot, off the line and heading wrong
    rx, ry = 300, 220
    s.add(f'<g transform="rotate(-28 {rx} {ry})"><rect x="{rx - 30}" y="{ry - 30}" width="60" height="60" rx="6" '
          f'fill="#ffffff" stroke="{BLACK}" stroke-width="3"/>'
          f'<line x1="{rx}" y1="{ry}" x2="{rx + 48}" y2="{ry}" stroke="{BLACK}" stroke-width="4"/></g>')
    # target heading, dashed along the path
    nx, ny = pt(rx, ry, 95, 28)
    s.path(f"M{nx:.1f},{ny:.1f} A95,95 0 0 1 {rx + 95},{ry}", GREEN, 4)
    s.text(rx + 104, ry - 52, "rotation", 16, GREEN, "start", "bold")
    # translation: along the line
    s.line(rx, ry, rx + 200, ry, BLUE, 5)
    s.text(rx + 200, ry - 14, "translation", 16, BLUE, "end", "bold")
    # cross-track: perpendicular to the line
    s.line(rx, ry, rx, ly - 8, ORANGE, 5)
    s.text(rx - 14, ly - 40, "cross-track", 16, ORANGE, "end", "bold")
    # sum
    s.line(rx, ry, rx + 200, ly - 8, BLACK, 4, dash=True)
    s.text(rx + 214, ly - 12, "sum → driveRobotRelative", 15, BLACK, "start", "bold")
    # three explanation boxes
    y = 410
    s.box(20, y, 245, 150, ["error: meters of path left", "output: m/s", "kTranslationP = 5.0", "slows you as you arrive"], BLUE, title="Translation")
    s.box(277, y, 245, 150, ["error: radians of heading", "output: rad/s", "kRotationP = 3.0", "spins toward the path's heading"], GREEN, title="Rotation")
    s.box(534, y, 246, 150, ["error: meters off the line", "output: m/s", "kCrossTrackP = 2.0", "pushes you sideways onto it"], ORANGE, title="Cross-track")
    s.save("17-three-loops.svg")


if __name__ == "__main__":
    fig_10_optimize()
    fig_12_coach()
    fig_17_three_loops()
