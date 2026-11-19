"""Lesson 31 diagram, drawn as SVG.

  python3 tools/figures/31-diagrams.py

writes, to docs/lessons/v3/images/:
  31-two-clocks.svg   the physics model's clock against Phoenix firmware's wall clock

No new measurement. Labels are Lesson 31's table (eight runs each, Lessons 28-32 block of CLAUDE.md):
Thread.sleep(20) 0.0090 m; 0 ms -0.34 m in seven runs of eight.
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK


def lane(s, y, label, colour, ticks, x0=170):
    s.text(20, y + 5, label, 15, colour, "start", "bold")
    s.line(x0, y, 780, y, colour, 3, arrow=False)
    for x in ticks:
        s.line(x, y - 11, x, y + 11, colour, 3, arrow=False)


def panel(s, top, title, sleep_wall, steps, result, rcol):
    s.text(400, top, title, 17, weight="bold")
    wy, my = top + 60, top + 130
    s.text(20, wy - 26, "Phoenix firmware: the wall clock", 14, ORANGE, "start")
    s.text(20, my - 26, "physics model: 20 ms per step() call", 14, BLUE, "start")
    lane(s, wy, "", ORANGE, sleep_wall, 20)
    lane(s, my, "", BLUE, steps, 20)
    return wy, my


def fig_31_1():
    s = Svg(800, 600)
    s.rect(0, 0, 800, 600, fill="#ffffff", colour="#ffffff", sw=0, rx=0)
    # panel 1: Thread.sleep(20)
    wall = [40, 190, 340, 490, 640]
    wy, my = panel(s, 30, "Thread.sleep(20): the clocks keep step", wall, wall, "", GREEN)
    for x in wall:
        s.add(f'<line x1="{x}" y1="{wy}" x2="{x}" y2="{my}" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="5 4"/>')
    s.text(400, my + 44, "Each model step lands where the firmware has really run 20 ms.", 15, GREEN, weight="bold")
    s.text(400, my + 66, "Final height 0.0090 m, inside the 0.01 m tolerance.", 15, GREEN)
    s.add('<line x1="20" y1="270" x2="780" y2="270" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="7 5"/>')
    # panel 2: Thread.sleep(0)
    wall2 = [40, 80]
    steps2 = [40 + i * 60 for i in range(13)]
    wy, my = panel(s, 310, "Thread.sleep(0): the model runs ahead", wall2, steps2, "", ORANGE)
    s.text(780, wy - 26, "barely any wall time passes", 14, ORANGE, "end")
    s.add(f'<line x1="{wall2[1]}" y1="{wy}" x2="{wall2[1]}" y2="{my}" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="5 4"/>')
    s.add(f'<line x1="40" y1="{wy}" x2="40" y2="{my}" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="5 4"/>')
    s.path(f"M40,{my + 22} L40,{my + 32} L760,{my + 32} L760,{my + 22}", BLUE, 2, arrow=False)
    s.text(400, my + 54, "the model advances many 20 ms steps before the firmware has moved", 14, BLUE)
    s.text(400, my + 106, "Final height −0.34 m in seven runs of eight: a broken-looking homing routine.", 15, ORANGE, weight="bold")
    s.text(400, my + 128, "The other run read 0.0094 m, so the trap is intermittent.", 15, ORANGE)
    s.save("31-two-clocks.svg")


if __name__ == "__main__":
    fig_31_1()
