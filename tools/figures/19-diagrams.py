"""Lesson 19 diagram, drawn as SVG from the lesson's own constants and names.

  python3 tools/figures/19-diagrams.py

writes, to docs/lessons/v3/images/:
  19-mechanism-chain.svg   the LoggedMechanism2d canvas, the "Base" root and the chain of
                           ligaments, at two carriage lengths (Lesson 19 section 4)

No data and no measurements. Numbers: ElevatorConstants.kDisplayWidth 1.0 m,
kDisplayHeight 2.0 m, kEffectorLength 25 cm; root "Base" at (kDisplayWidth / 2, 0);
"Carriage" at 90 degrees, length = height; "Effector" at -90 degrees relative to its parent.
Drawn to scale (200 px per meter). The two carriage lengths (0.4 m, 0.75 m) are examples.
"""
import importlib.util
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK

W_M, H_M, EFF_M = 1.0, 2.0, 0.25
PX = 200.0


def fig_19_1():
    s = Svg(800, 630)
    top = 90
    panels = [(70, 0.40, "Carriage 0.4 m tall"), (470, 0.75, "Carriage 0.75 m tall")]
    for x0, h, title in panels:
        s.text(x0 + 100, 34, title, 18, BLACK, weight="bold")
        s.text(x0 + 100, 58, "setLength(%.2f m)" % h, 15, GREY)
        w, hh = W_M * PX, H_M * PX
        s.rect(x0, top, w, hh, GREY, "#FAFAFA", sw=2, rx=2)
        rx_, ry_ = x0 + w / 2, top + hh          # root (Base): (kDisplayWidth / 2, 0)
        tipy = ry_ - h * PX
        # canvas size labels
        s.text(x0 - 10, top + hh / 2, "2 m", 15, GREY, anchor="end")
        s.text(x0 + w / 2, top + hh + 22, "1 m wide", 15, GREY)
        # carriage + effector
        s.line(rx_, ry_, rx_, tipy, ORANGE, 8, arrow=False)
        s.line(rx_, tipy, rx_ + EFF_M * PX, tipy, BLUE, 8, arrow=False)
        # root dot
        s.add(f'<circle cx="{rx_}" cy="{ry_}" r="7" fill="{BLACK}"/>')
        # world angle arc: +x axis to the carriage (90 deg)
        r = 42
        s.line(rx_, ry_, rx_ + 80, ry_, GREY, 2, arrow=False, dash=True)
        s.path(f"M{rx_ + r},{ry_} A{r},{r} 0 0 0 {rx_},{ry_ - r}", BLACK, 2, arrow=False)
        s.text(rx_ + 52, ry_ - 38, "90°", 15, BLACK, anchor="start")
        # relative angle arc at the carriage tip: carriage direction (up) to effector (right)
        s.line(rx_, tipy, rx_, tipy - 55, GREY, 2, arrow=False, dash=True)
        r2 = 34
        s.path(f"M{rx_},{tipy - r2} A{r2},{r2} 0 0 1 {rx_ + r2},{tipy}", BLACK, 2, arrow=False)
        s.text(rx_ + 26, tipy - 30, "−90°", 15, BLACK, anchor="start")
        s.add(f'<circle cx="{rx_}" cy="{tipy}" r="5" fill="{BLACK}"/>')
    # annotations (first panel, right of the canvas), level with what they name
    s.text(285, 392, "Effector, 0.25 m", 15, BLUE, anchor="start", weight="bold")
    s.text(285, 410, "−90° from its parent,", 14, BLACK, anchor="start")
    s.text(285, 428, "the carriage", 14, BLACK, anchor="start")
    s.text(285, 462, "Carriage", 15, ORANGE, anchor="start", weight="bold")
    s.text(285, 480, "90° from the world's +x", 14, BLACK, anchor="start")
    s.text(285, 520, "Base", 15, BLACK, anchor="start", weight="bold")
    s.text(285, 538, "(0.5 m, 0): the middle of the floor", 14, BLACK, anchor="start")
    s.text(400, 582, "The effector's angle is measured from the direction the carriage points,", 15, BLACK)
    s.text(400, 604, "so when the carriage grows, the effector rides up with it, still pointing right.", 15, BLACK)
    s.save("19-mechanism-chain.svg")


if __name__ == "__main__":
    fig_19_1()
