"""Batch 2 diagrams (Figures S.1, 0.1, 5.3), drawn as SVG.

Figure 0.1 draws a measurement: data/00-opmode-lifecycle-counts.csv counts MyTeleop's
constructor, start(), end() and close() calls over three enable cycles on the Lesson 1
robot (Disable runs end() and close(), then a fresh opmode is constructed). Re-measure:

    export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
    b() { echo "System.setProperty(\"lc.$1\", String.valueOf(Integer.getInteger(\"lc.$1\", 0) + 1));"; }
    tools/figures/measure.sh 1 tools/figures/probes/Check00OpModeLifecycle.java \
      tools/figures/data/00-opmode-lifecycle-counts.csv \
      --replace opmode/MyTeleop.java "this.robot = robot;" "this.robot = robot; $(b ctor)" \
      --replace opmode/MyTeleop.java 'System.out.println("Hello from Team 5010! Teleop started.");' "$(b start)" \
      --replace opmode/MyTeleop.java "/* Called when the robot is disabled (after previously being enabled). */" "$(b end)" \
      --replace opmode/MyTeleop.java "/* Called when the opmode is de-selected / no additional methods will be called. */" "$(b close)" \
      --replace subsystems/DriveModule.java "m_driveMotor.setThrottle(fraction);" "$(b drive) m_driveMotor.setThrottle(fraction);"

S.1 and 5.3 use no data.

  python3 tools/figures/b2-diagrams.py

writes, to docs/lessons/v3/images/:
  aside-setup-two-folders.svg     the three places in aside-setup sections 4-7
  00-opmode-lifecycle.svg         the five opmode methods in Lesson 0's MyTeleop listing
  05-error-wrap.svg               350 -> 0 and -170 -> 170
"""
import importlib.util
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK
RED = ORANGE  # the crossed-out arrow and the long-way arc


def fig_s1():
    s = Svg(800, 580)
    X, W, H = 40, 520, 100
    ys = [30, 220, 410]
    s.box(X, ys[0], W, H, ["the course repo, with its own .git", "you clone it; you never commit your work here"], GREY, title="BasicRobotLessons", size=15)
    s.box(X, ys[1], W, H, ["your project: starts as a plain folder", "git init and git commit make it a repo (section 5)"], BLUE, title="~/dev/MyOpModeRobot", size=15)
    s.box(X, ys[2], W, H, ["your private remote repo", "created and pushed to in section 7"], GREEN, title="GitHub: MyOpModeRobot", size=15)
    s.line(90, ys[0] + H, 90, ys[1], BLACK)
    s.text(110, 168, ["verify-lessons-v3.sh -1 --sandbox", "(strips .git, build, .gradle)"], 15, anchor="start")
    s.line(90, ys[1] + H, 90, ys[2], BLACK)
    s.text(110, 358, ["gh repo create ... --push", "(section 7, run from this folder)"], 15, anchor="start")
    # crossed-out arrow, project back to course repo
    s.line(500, ys[1], 500, ys[0] + H, RED, 3)
    s.add(f'<path d="M482,164 L518,186 M518,164 L482,186" stroke="{RED}" stroke-width="5" fill="none"/>')
    s.text(580, 158, ["never push or", "commit work", "into the course", "repo"], 15, colour=RED, anchor="start", weight="bold")
    s.save("aside-setup-two-folders.svg")


def fig_0_1():
    # Measured on the Lesson 1 robot (alpha-8): Disable runs end() and close() on the same
    # tick, and the framework constructs a fresh opmode on the next one.
    s = Svg(800, 430)
    y, h = 220, 70
    segs = [(30, 230, "disabled", GREY), (230, 540, "enabled", GREEN), (560, 770, "disabled (new one)", GREY)]
    for x1, x2, lab, c in segs:
        s.rect(x1, y, x2 - x1, h, c, sw=2, rx=0)
        s.text((x1 + x2) / 2, y + 26, lab, 16, weight="bold")
    for x1, x2, lab, c in segs:
        step = 14 if lab == "enabled" else 28
        x = x1 + 14
        while x < x2 - 6:
            s.add(f'<line x1="{x}" y1="{y+40}" x2="{x}" y2="{y+60}" stroke="{c}" stroke-width="3"/>')
            x += step
    s.text(130, y + h + 26, ["disabledPeriodic()", "keeps ticking"], 15)
    s.text(385, y + h + 26, ["periodic() ticks", "about every 20 ms"], 15)
    s.text(665, y + h + 26, ["the new one ticks", "disabledPeriodic()"], 15)
    ev = [(30, 30, "start", ["constructor:", "MyTeleop(robot),", "when you pick it"], BLUE),
          (230, 238, "start", ["start()", "on Enable"], GREEN),
          (540, 532, "end", ["end(), then close()", "on Disable"], GREEN),
          (560, 568, "start", ["constructor again:", "a fresh MyTeleop(robot)"], BLUE)]
    for x, tx, anc, lines, c in ev:
        s.line(x, 150, x, y, c, 3, arrow=False)
        s.text(tx, 80, lines, 15, colour=c, anchor=anc, weight="bold")
    s.text(30, 372, "Picking a different opmode also runs close() on the one you leave.", 15,
           colour=GREY, anchor="start")
    s.text(30, 412, "time, left to right", 15, colour=GREY, anchor="start")
    s.line(190, 407, 770, 407, GREY, 2)
    s.save("00-opmode-lifecycle.svg")


def pt(cx, cy, r, a):
    return cx + r * math.cos(math.radians(a)), cy - r * math.sin(math.radians(a))


def circle(s, cx, cy, start, target, long_label, short_label, r=110):
    s.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{GREY}" stroke-width="1.5"/>')
    for a, lab in [(0, "0°"), (90, "90°"), (180, "180°"), (270, "-90°")]:
        x, y = pt(cx, cy, r, a)
        x2, y2 = pt(cx, cy, r + 10, a)
        s.add(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GREY}" stroke-width="2"/>')
        x3, y3 = pt(cx, cy, r + 50, a)
        s.text(x3, y3 + 5, lab, 14, colour=GREY)
    return


def fig_5_3():
    s = Svg(800, 545)
    for cx, start, target, err, wrapped, title in [(210, 350, 0, -350, 10, "at 350°, asked for 0°"),
                                                    (590, -170, 170, 340, -20, "at -170°, asked for 170°")]:
        cy = 215
        s.text(cx, 38, title, 16, weight="bold")
        circle(s, cx, cy, start, target, "", "")
        r_long, r_short = 85, 110
        ps, pt_ = pt(cx, cy, r_long, start), pt(cx, cy, r_long, target)
        # long way: the unwrapped error's direction (positive error = counter-clockwise on screen)
        sweep = 0 if err > 0 else 1
        s.path(f"M{ps[0]:.1f},{ps[1]:.1f} A{r_long},{r_long} 0 1 {sweep} {pt_[0]:.1f},{pt_[1]:.1f}", RED, 4, arrow=True)
        qs, qt = pt(cx, cy, r_short + 16, start), pt(cx, cy, r_short + 16, target)
        sw2 = 0 if wrapped > 0 else 1
        rs = r_short + 16
        s.path(f"M{qs[0]:.1f},{qs[1]:.1f} A{rs},{rs} 0 0 {sw2} {qt[0]:.1f},{qt[1]:.1f}", GREEN, 6, arrow=True)
        # robot and target markers
        for a, c, lab in [(start, BLACK, "robot"), (target, BLUE, "target")]:
            x, y = pt(cx, cy, r_short, a)
            s.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{c}"/>')
        s.text(cx, cy + 212, [f"error {err:+d}°: the long way (orange)"], 15, colour=RED, weight="bold")
        s.text(cx, cy + 237, [f"wrapped to {wrapped:+d}°: the short way (green)"], 15, colour=GREEN, weight="bold")
    s.text(210, 400, ["black dot: where the steering is", "blue dot: where you asked it to go"], 15, colour=BLACK) if False else None
    s.add(f'<circle cx="150" cy="515" r="8" fill="{BLACK}"/>')
    s.text(165, 521, "where the wheel points", 15, anchor="start")
    s.add(f'<circle cx="400" cy="515" r="8" fill="{BLUE}"/>')
    s.text(415, 521, "where you asked it to point", 15, anchor="start")
    s.save("05-error-wrap.svg")


if __name__ == "__main__":
    fig_s1()
    fig_0_1()
    fig_5_3()
