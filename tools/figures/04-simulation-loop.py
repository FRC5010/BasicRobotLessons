"""Lesson 4: the simulation loop (Figure 4.1), drawn from the four steps of
DriveModule.simulatePeriodic(). A diagram, so it has no data file.

Output: docs/lessons/v3/images/04-simulation-loop.svg
"""

import os

import figstyle

BLUE = figstyle.SETPOINT
ORANGE = figstyle.MEASURED
GREY = figstyle.NEUTRAL
INK = "#222222"


def box(x, y, w, h, title, sub, fill, stroke):
    cx = x + w / 2
    lines = title if isinstance(title, list) else [title]
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="2.5"/>']
    ty = y + (28 if len(lines) == 1 else 24)
    for line in lines:
        out.append(f'<text x="{cx}" y="{ty}" text-anchor="middle" font-size="16" font-weight="bold" fill="{INK}">{line}</text>')
        ty += 20
    out.append(f'<text x="{cx}" y="{y + h - 12}" text-anchor="middle" font-size="14" fill="{INK}">{sub}</text>')
    return "\n".join(out)


def arrow(d, color=INK):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3" marker-end="url(#head)"/>'


def build():
    p = []
    p.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 570" font-family="sans-serif">')
    p.append('<defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
             '<path d="M0,0 L10,5 L0,10 z" fill="#222222"/></marker></defs>')
    p.append('<rect x="0" y="0" width="800" height="570" fill="#ffffff"/>')

    # The simulation region, behind the three boxes it holds.
    p.append(f'<rect x="30" y="215" width="745" height="185" rx="14" fill="#fdf1e7" stroke="{ORANGE}" stroke-width="2.5" stroke-dasharray="9 6"/>')
    p.append(f'<text x="46" y="376" font-size="14" fill="{GREY}">(step 1, setSupplyVoltage(), tells the model the battery voltage before step 2)</text>')
    p.append(f'<text x="46" y="240" font-size="15" font-weight="bold" fill="{INK}">simulatePeriodic(): once per 20 ms tick, simulation only</text>')

    # Row 1: your command, then the TalonFX turning it into volts.
    p.append(box(45, 60, 235, 85, "setThrottle(0.3)", "your command: 30% power", "#e6f0f9", BLUE))
    p.append(box(505, 60, 250, 85, "TalonFX applies volts", "0.3 of the battery: 3.6 V", "#ffffff", GREY))
    p.append(arrow("M280,102 L503,102"))

    # Row 2: the three steps that read the volts, run the physics and push the result back.
    p.append(box(555, 262, 200, 100, ["getMotorVoltage()"], "step 2: read the volts", "#ffffff", ORANGE))
    p.append(box(300, 262, 200, 100, ["DCMotorSim", "update(0.020)"], "step 3: volts → motion", "#ffffff", ORANGE))
    p.append(box(50, 262, 205, 100, ["setRawRotorPosition()", "setRotorVelocity()"], "step 4: ÷ 2π, rad → rot", "#ffffff", ORANGE))
    p.append(arrow("M655,145 L655,260"))
    p.append(arrow("M553,312 L502,312"))
    p.append(arrow("M298,312 L257,312"))

    # Row 3: your reads, which close the loop.
    p.append(box(45, 455, 230, 85, ["getPosition()", "getVelocity()"], "your logs, your controllers", "#e6f0f9", BLUE))
    p.append(arrow("M152,400 L152,453"))
    p.append(f'<text x="166" y="425" font-size="14" fill="{INK}">the fake encoder</text>')
    # Back up the left margin to the command.
    p.append(arrow("M45,497 L14,497 L14,102 L43,102", BLUE))

    p.append(f'<text x="300" y="486" font-size="15" fill="{INK}">The reads feed your code, which decides</text>')
    p.append(f'<text x="300" y="508" font-size="15" fill="{INK}">what to command next tick. That is the loop.</text>')
    p.append('</svg>')
    return "\n".join(p) + "\n"


def main():
    path = os.path.join(figstyle.IMAGES, "04-simulation-loop.svg")
    os.makedirs(figstyle.IMAGES, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(build())
    print(path)


if __name__ == "__main__":
    main()
