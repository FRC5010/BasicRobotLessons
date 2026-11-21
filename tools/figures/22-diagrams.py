"""Lesson 22 diagram, drawn as SVG from the lesson's own constants and ArmIOSim.inReach.

  python3 tools/figures/22-diagrams.py   (in the figures venv: diagrams-10-16.py imports figstyle)

writes, to docs/lessons/v3/images/:
  22-intake-box-frames.svg   the same piece and intake box in the field's frame and in the robot's

No data and no measurements. Numbers: DriveConstants.kHalfLength 0.3 m (kHalfWidth 0.3 m),
ArmConstants.kIntakeReach 12 in = 0.3048 m, kIntakeWidth 24 in = 0.6096 m,
kSimGamePiecePositions[0] = (4.5, 3.2). The robot pose (4.05, 2.85) at 30 degrees is an example
chosen so the piece is inside the box; the robot-frame position is computed here with the same
arithmetic as ArmIOSim.inReach (subtract the robot's translation, rotate by the opposite heading).
"""
import importlib.util
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK

HALF = 0.3
REACH = 12 * 0.0254
WIDTH = 24 * 0.0254
PIECE = (4.5, 3.2)
ROBOT = (4.05, 2.85)
HEAD = math.radians(30)


def poly(pts):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"


def fig_22_1():
    s = Svg(800, 850)
    # robot-frame position of the piece, as inReach computes it
    dx, dy = PIECE[0] - ROBOT[0], PIECE[1] - ROBOT[1]
    fx = dx * math.cos(-HEAD) - dy * math.sin(-HEAD)
    fy = dx * math.sin(-HEAD) + dy * math.cos(-HEAD)
    assert HALF < fx < HALF + REACH and abs(fy) < WIDTH / 2

    # ------------------------------------------------ field frame (top)
    S1, ox, oy = 160.0, 60, 335   # px per m; screen position of field (3.5, 2.2)
    fxm0, fym0 = 3.5, 2.2

    def F(x, y):
        return ox + (x - fxm0) * S1, oy - (y - fym0) * S1

    s.text(400, 30, "The field's frame: x along the field, y across", 18, BLACK, weight="bold")
    s.rect(20, 50, 760, 300, GREY, "#FAFAFA", sw=2, rx=2)

    def robot_pt(u, v):  # robot-frame point -> field -> screen
        wx = ROBOT[0] + u * math.cos(HEAD) - v * math.sin(HEAD)
        wy = ROBOT[1] + u * math.sin(HEAD) + v * math.cos(HEAD)
        return F(wx, wy)

    s.add(f'<path d="{poly([robot_pt(-HALF, -HALF), robot_pt(HALF, -HALF), robot_pt(HALF, HALF), robot_pt(-HALF, HALF)])}" '
          f'fill="#EEEEEE" stroke="{GREY}" stroke-width="2"/>')
    s.add(f'<path d="{poly([robot_pt(HALF, -WIDTH/2), robot_pt(HALF + REACH, -WIDTH/2), robot_pt(HALF + REACH, WIDTH/2), robot_pt(HALF, WIDTH/2)])}" '
          f'fill="#E8F3FA" stroke="{BLUE}" stroke-width="2" stroke-dasharray="7 5"/>')
    rx, ry = F(*ROBOT)
    nx, ny = robot_pt(HALF + 0.12, 0)
    s.line(rx, ry, nx, ny, BLACK, 2)
    s.add(f'<circle cx="{rx:.1f}" cy="{ry:.1f}" r="5" fill="{BLACK}"/>')
    px, py = F(*PIECE)
    s.add(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="9" fill="{ORANGE}" stroke="{BLACK}" stroke-width="2"/>')
    s.text(430, 120, "piece at (4.5, 3.2)", 15, BLACK, anchor="start", weight="bold")
    s.text(430, 160, ["robot at (4.05, 2.85),", "heading 30° (an example)"], 15, BLACK, anchor="start", weight="bold")
    s.text(430, 230, ["The box tilts with the robot,", "so \"is the piece in it?\"", "is awkward to ask here."], 15, GREY, anchor="start")

    # ------------------------------------------------ arrows between
    s.line(150, 362, 150, 398, BLACK, 3)
    s.text(172, 386, "1. subtract the robot's position", 15, BLACK, anchor="start")
    s.line(150, 402, 150, 438, BLACK, 3)
    s.text(172, 426, "2. rotateBy the robot's opposite heading", 15, BLACK, anchor="start")

    # ------------------------------------------------ robot frame (bottom)
    S2, cx, cy = 300.0, 215, 600

    def R(u, v):
        return cx + u * S2, cy - v * S2

    s.text(400, 466, "The robot's frame: x straight ahead, y to the left", 18, BLACK, weight="bold")
    s.rect(20, 486, 760, 290, GREY, "#FAFAFA", sw=2, rx=2)
    x0, y0 = R(-HALF, HALF)
    s.rect(x0, y0, 2 * HALF * S2, 2 * HALF * S2, GREY, "#EEEEEE", sw=2, rx=2)
    s.text(cx - 40, cy + 5, "robot", 15, GREY)
    bx0, by0 = R(HALF, WIDTH / 2)
    s.rect(bx0, by0, REACH * S2, WIDTH * S2, BLUE, "#E8F3FA", dash=True, sw=2, rx=2)
    s.add(f'<circle cx="{cx}" cy="{cy}" r="5" fill="{BLACK}"/>')
    s.line(cx, cy, cx + 55, cy, BLACK, 2)
    s.text(cx + 32, cy - 10, "+x", 14, BLACK)
    pxr, pyr = R(fx, fy)
    s.add(f'<circle cx="{pxr:.1f}" cy="{pyr:.1f}" r="9" fill="{ORANGE}" stroke="{BLACK}" stroke-width="2"/>')
    s.text(470, 545, ["The box: past the front bumper,", "12 in deep (kIntakeReach),", "24 in wide (kIntakeWidth)."], 15, BLUE, anchor="start", weight="bold")
    s.text(470, 625, "The piece lands at (%.2f, %.2f):" % (fx, fy), 15, BLACK, anchor="start", weight="bold")
    s.text(470, 645, "past the bumper, inside the width.", 15, BLACK, anchor="start")
    s.text(470, 665, "Three plain comparisons say yes.", 15, BLACK, anchor="start")
    # depth dimension: 0.3 bumper + 0.305 reach, below the robot
    ay_ = R(0, -0.44)[1]
    xe = R(HALF + REACH, 0)[0]
    s.line(cx, ay_, xe, ay_, BLACK, 2, arrow=False)
    s.line(cx, ay_ - 7, cx, ay_ + 7, BLACK, 2, arrow=False)
    s.line(xe, ay_ - 7, xe, ay_ + 7, BLACK, 2, arrow=False)
    s.text(cx + (HALF + REACH) * S2 / 2, ay_ + 22, "0.3 m + 0.3 m", 14, BLACK)
    s.text(400, 812, "A piece is caught once its center is inside the box:", 15, BLACK)
    s.text(400, 834, "about 0.6 m ahead of the robot's center.", 15, BLACK)
    s.save("22-intake-box-frames.svg")


if __name__ == "__main__":
    fig_22_1()
