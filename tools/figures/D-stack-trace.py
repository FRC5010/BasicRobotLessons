"""Debugger aside, Figure D.1: the stack trace from section 4 marked up for its two passes.
Drawn from the trace the aside prints (its top three frames as printed, the bottom two as the
aside relabels them); no measurement, so no data file.

    python3 tools/figures/D-stack-trace.py

Writes docs/lessons/v3/images/aside-debugger-stack-trace.svg.
"""

import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
IMAGES = os.path.join(REPO, "docs", "lessons", "v3", "images")

BLUE, ORANGE, GREEN, BLACK, GREY = "#0072B2", "#D55E00", "#009E73", "#000000", "#777777"
TINT = {BLUE: "#dcebf5", ORANGE: "#fbe5d6", GREEN: "#d6f0e7", GREY: "#efefef", BLACK: "#e4e4e4"}
MONO = 'font-family="DejaVu Sans Mono, Menlo, Consolas, monospace"'
SANS = 'font-family="sans-serif"'
W = 800
LH = 22  # line height of the trace


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main():
    parts = []

    def label(y, text, colour):
        parts.append(f'<text x="14" y="{y}" {SANS} font-size="16" font-weight="bold" fill="{colour}">{esc(text)}</text>')

    def band(y, lines, colour, text_colour=BLACK, bold_from=None, bar=True):
        h = len(lines) * LH + 12
        parts.append(f'<rect x="10" y="{y}" width="{W - 20}" height="{h}" rx="6" fill="{TINT[colour]}"/>')
        if bar:
            parts.append(f'<rect x="10" y="{y}" width="7" height="{h}" rx="3" fill="{colour}"/>')
        for i, line in enumerate(lines):
            ty = y + 8 + (i + 1) * LH - 5
            parts.append(f'<text x="28" y="{ty}" {MONO} font-size="14" fill="{text_colour}" xml:space="preserve">{esc(line)}</text>')
        return y + h

    y = 28
    label(y, "Pass one: read the first line. It says what went wrong.", BLUE)
    y = band(y + 10, [
        'Exception in thread "main" java.lang.NullPointerException: Cannot invoke',
        '"com.ctre.phoenix6.hardware.TalonFX.setThrottle(double)"',
        'because "this.m_driveMotor" is null',
    ], BLUE)
    y += 32
    label(y, "Pass two: the first frame that's yours (first.robot.*). Look there.", ORANGE)
    y = band(y + 10, [
        'at first.robot.subsystems.DriveModule.lambda$driveForward$0(DriveModule.java:13)',
    ], ORANGE)
    y += 32
    label(y, "Library frames and how a tick got here: skim.", GREY)
    y = band(y + 10, [
        'at org.wpilib.command3.Mechanism.lambda$runRepeatedly$0(Mechanism.java:118)',
        'at first.robot.Robot.robotPeriodic(Robot.java:53)',
    ], GREY, text_colour="#555555")
    y += 18
    # The divider frame, with what each side means.
    h = 2 * LH + 8
    parts.append(f'<rect x="10" y="{y}" width="{W - 20}" height="{h}" rx="6" fill="{TINT[BLACK]}" stroke="{BLACK}" stroke-width="2"/>')
    parts.append(f'<text x="28" y="{y + 30}" {MONO} font-size="14" font-weight="bold" fill="{BLACK}" xml:space="preserve">'
                 f'{esc("at === Command Binding Trace ===.()")}</text>')
    parts.append(f'<text x="400" y="{y + 20}" {SANS} font-size="15" fill="{BLACK}">&#8593; above: where it broke</text>')
    parts.append(f'<text x="400" y="{y + 40}" {SANS} font-size="15" fill="{BLACK}">&#8595; below: which binding scheduled it</text>')
    y += h + 18
    y = band(y, [
        'at first.robot.opmode.RobotTeleop.<init>(RobotTeleop.java:41)',
    ], GREEN)
    y += 24
    parts.append(f'<text x="14" y="{y}" {SANS} font-size="16" font-weight="bold" fill="{GREEN}">'
                 f'The button binding that scheduled driveForward().</text>')
    y += 24
    parts.append(f'<text x="14" y="{y}" {SANS} font-size="14" fill="{GREY}">'
                 f'The last two frames are relabeled, as in the aside, to read like a deployed robot.</text>')
    h = y + 16
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}">'
           f'<rect x="0" y="0" width="{W}" height="{h}" fill="#ffffff"/>' + "".join(parts) + "</svg>\n")
    path = os.path.join(IMAGES, "aside-debugger-stack-trace.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(path)


if __name__ == "__main__":
    main()
