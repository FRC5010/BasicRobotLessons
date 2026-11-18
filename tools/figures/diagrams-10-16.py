"""Lessons 10-16 diagrams, drawn as SVG from the lessons' own names and constants.

  python3 tools/figures/diagrams-10-16.py

writes, to docs/lessons/v3/images/:
  10-translation-plus-rotation.svg   corners from DriveConstants (kHalfLength = kHalfWidth = 0.3)
  10-robot-vs-field-relative.svg
  12-sensor-gear-chain.svg           kSteerGearRatio = 25, kDriveGearRatio = 6.75
  13-io-door.svg
  13-record-replay.svg
  14-localizer-providers.svg
  15-camera-mounts.svg               kFrontRobotToCamera, kBackRobotToCamera, kSim*Degrees/Meters
  15-real-vs-sim-camera.svg

No data files and no measurements: the numbers are the constants in code/v3/lesson-N/Constants.java.
"""

import math
import os

import figstyle

BLUE, ORANGE, GREEN, GREY, PURPLE, BLACK = "#0072B2", "#D55E00", "#009E73", "#777777", "#CC79A7", "#000000"
TINT = {BLUE: "#E3F0FA", ORANGE: "#FBE9DF", GREEN: "#DDF3EB", GREY: "#EEEEEE", PURPLE: "#F6E6EF", BLACK: "#FFFFFF"}


class Svg:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.parts = []
        self.markers = set()

    def marker(self, colour):
        self.markers.add(colour)
        return f"url(#a{colour[1:]})"

    def add(self, s):
        self.parts.append(s)

    def rect(self, x, y, w, h, colour=GREY, fill=None, dash=False, sw=2, rx=8):
        d = ' stroke-dasharray="7 5"' if dash else ""
        f = fill or TINT[colour]
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{f}" stroke="{colour}" stroke-width="{sw}"{d}/>')

    def text(self, x, y, lines, size=15, colour=BLACK, anchor="middle", weight="normal", gap=1.25):
        if isinstance(lines, str):
            lines = [lines]
        for i, line in enumerate(lines):
            self.add(f'<text x="{x:.1f}" y="{y + i * size * gap:.1f}" font-size="{size}" fill="{colour}" '
                     f'text-anchor="{anchor}" font-weight="{weight}">{esc(line)}</text>')

    def box(self, x, y, w, h, lines, colour=GREY, size=15, dash=False, title=None, fill=None, tcolour=BLACK):
        self.rect(x, y, w, h, colour, fill, dash)
        lines = [lines] if isinstance(lines, str) else lines
        n = len(lines) + (1 if title else 0)
        top = y + (h - n * size * 1.25) / 2 + size * 0.95
        if title:
            self.text(x + w / 2, top, title, size, tcolour, weight="bold")
            top += size * 1.25
        self.text(x + w / 2, top, lines, size, tcolour)

    def line(self, x1, y1, x2, y2, colour=BLACK, sw=2, arrow=True, dash=False, both=False):
        d = ' stroke-dasharray="7 5"' if dash else ""
        m = f' marker-end="{self.marker(colour)}"' if arrow else ""
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{colour}" stroke-width="{sw}"{m}{d}/>')

    def path(self, d, colour=BLACK, sw=2, arrow=True, dash=False, fill="none"):
        da = ' stroke-dasharray="7 5"' if dash else ""
        m = f' marker-end="{self.marker(colour)}"' if arrow else ""
        self.add(f'<path d="{d}" fill="{fill}" stroke="{colour}" stroke-width="{sw}"{m}{da}/>')

    def save(self, name):
        defs = "".join(
            f'<marker id="a{c[1:]}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="17" markerHeight="17" orient="auto">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>' for c in sorted(self.markers))
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
               f'font-family="sans-serif">\n<defs>{defs}</defs>\n<rect x="0" y="0" width="{self.w}" height="{self.h}" fill="#ffffff"/>\n'
               + "\n".join(self.parts) + "\n</svg>\n")
        path = os.path.join(figstyle.IMAGES, name)
        open(path, "w", encoding="utf-8").write(svg)
        print(path)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------- Figure 10.1
def fig_10_1():
    s = Svg(800, 520)
    S = 300.0           # px per meter for the robot
    K = 70.0            # px per (m/s) for the velocity arrows
    half = 0.3          # kHalfLength = kHalfWidth
    corners = [("FL", half, half), ("FR", half, -half), ("BL", -half, half), ("BR", -half, -half)]
    vx, omega = 1.0, 2.0

    def screen(cx, cy, fx, fy):
        return cx - fy * S, cy - fx * S

    for panel, (cx, title, spin) in enumerate([(200, "Pure translation", 0.0), (600, "Translation plus spin", omega)]):
        cy = 285
        s.text(cx, 36, title, 18, weight="bold")
        s.text(cx, 58, "vx = 1 m/s" if not spin else "vx = 1 m/s, ω = 2 rad/s", 15, GREY)
        s.rect(cx - half * S, cy - half * S, 2 * half * S, 2 * half * S, GREY, "#F7F7F7")
        # nose
        s.path(f"M{cx - 30},{cy - half * S + 2} L{cx},{cy - half * S + 28} L{cx + 30},{cy - half * S + 2}", GREY, 2, arrow=False)
        s.text(cx, cy + 6, "robot", 15, GREY)
        for idx, (name, rx, ry) in enumerate(corners):
            px, py = screen(cx, cy, rx, ry)
            tvx, tvy = vx, 0.0
            rvx, rvy = -spin * ry, spin * rx           # omega x r
            sx, sy = tvx + rvx, tvy + rvy
            # sum (thick), then components on top
            s.line(px, py, px - sy * K, py - sx * K, ORANGE, 5)
            s.line(px, py, px - tvy * K, py - tvx * K, BLUE, 2)
            if spin:
                s.line(px, py, px - rvy * K, py - rvx * K, PURPLE, 2)
            lx = px + (-34 if rx > 0 and ry > 0 or rx < 0 and ry > 0 else 34)
            ly = py + (-8 if rx > 0 else 20)
            if rx < 0:
                ly = py + 26
            s.add(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="5" fill="#fff" stroke="{BLACK}" stroke-width="2"/>')
            s.text(lx + (-8 if ry > 0 else 8), ly, f"{idx} {name}", 15, BLACK, "end" if ry > 0 else "start", "bold")
    # axes
    s.line(60, 130, 60, 80, BLACK, 2)
    s.text(60, 72, "+X", 15, anchor="middle")
    s.line(60, 130, 22, 130, BLACK, 2)
    s.text(22, 152, "+Y", 15, anchor="middle")
    # legend
    items = [(BLUE, "translation: the same at every corner", 2), (PURPLE, "spin: ω × r, tangent to the circle", 2), (ORANGE, "what that corner's wheel does (the sum)", 5)]
    y = 440
    for colour, label, sw in items:
        s.line(180, y, 216, y, colour, sw)
        s.text(226, y + 5, label, 15, anchor="start")
        y += 26
    s.save("10-translation-plus-rotation.svg")


# ---------------------------------------------------------------- Figure 10.3
def fig_10_3():
    s = Svg(800, 520)
    for cx, title, sub, field in [(200, "Robot-relative", "stick forward drives toward the nose", False),
                                  (600, "Field-relative", "stick forward drives away from the driver", True)]:
        s.rect(cx - 185, 20, 370, 480, GREY, "#FAFAFA", rx=6)
        s.text(cx, 52, title, 19, weight="bold")
        s.text(cx, 76, sub, 15, GREY)
        # driver station
        s.rect(cx - 185, 462, 370, 38, GREY, "#DDDDDD", rx=2)
        s.text(cx, 487, "driver station", 15, GREY)
        # robot turned 180 degrees: nose points down
        rx_, ry_ = cx, 280
        s.rect(rx_ - 45, ry_ - 45, 90, 90, BLACK, "#FFFFFF")
        s.path(f"M{rx_ - 45},{ry_ + 45} L{rx_},{ry_ + 78} L{rx_ + 45},{ry_ + 45} z", BLACK, 2, arrow=False, fill="#DDDDDD")
        s.text(rx_, ry_ + 6, "robot", 15, GREY)
        s.text(rx_ + 58, ry_ + 64, "nose", 14, GREY, "start")
        if field:
            s.line(rx_, ry_ - 50, rx_, 120, ORANGE, 6)
            s.text(rx_ + 14, 150, ["moves +X,", "nose still down"], 15, ORANGE, "start", "bold")
        else:
            s.line(rx_, ry_ + 86, rx_, 446, ORANGE, 6)
            s.text(rx_ + 16, 400, ["moves toward", "the driver"], 15, ORANGE, "start", "bold")
        # stick
        s.add(f'<circle cx="{cx - 130}" cy="130" r="30" fill="#fff" stroke="{BLUE}" stroke-width="2"/>')
        s.line(cx - 130, 140, cx - 130, 112, BLUE, 4)
        s.text(cx - 130, 182, ["same stick", "push: forward"], 14, BLUE)
    # +X axis on the field-relative panel
    s.line(445, 330, 445, 250, BLACK, 2)
    s.text(445, 240, "+X", 15)
    s.text(445, 350, "away from the driver", 14, GREY, "start")
    s.text(432, 400, ["toRobotRelative(heading = 180°)", "turns field forward into", "robot backward"], 14, PURPLE, "start")
    s.save("10-robot-vs-field-relative.svg")


# ---------------------------------------------------------------- Figure 12.1
def fig_12_1():
    s = Svg(800, 500)
    s.text(400, 28, "Steer: the loop reads the CANcoder", 18, weight="bold")
    y = 100
    s.box(20, y, 150, 70, ["steer motor", "rotor"], BLUE)
    s.box(325, y, 150, 70, ["CANcoder", "on the wheel"], GREEN)
    s.box(630, y, 150, 70, ["wheel angle", "(the mechanism)"], GREY)
    s.line(170, y + 35, 325, y + 35, BLACK, 3)
    s.line(475, y + 35, 630, y + 35, BLACK, 3)
    s.text(247, y + 26, "25 : 1", 17, weight="bold")
    s.text(247, y + 96, "RotorToSensorRatio", 14)
    s.text(552, y + 26, "1 : 1", 17, weight="bold")
    s.text(552, y + 96, "SensorToMechanismRatio", 14)
    s.path("M400,98 C400,48 95,48 95,98", ORANGE, 3)
    s.text(420, 78, "the TalonFX's 1 kHz loop reads this sensor", 15, ORANGE, "start", "bold")
    s.text(400, 222, "kSteerGearRatio = 25.0 (rotor : CANcoder)", 14, GREY)

    s.text(400, 275, "Drive: the loop reads its own rotor", 18, weight="bold")
    y = 305
    s.box(20, y, 150, 70, ["drive motor", "rotor (the sensor)"], BLUE)
    s.box(630, y, 150, 70, ["wheel", "(the mechanism)"], GREY)
    s.line(170, y + 35, 630, y + 35, BLACK, 3)
    s.text(400, y + 26, "6.75 : 1", 17, weight="bold")
    s.text(400, y + 62, "SensorToMechanismRatio", 14)
    s.text(400, y + 100, "kDriveGearRatio = 6.75 (rotor : wheel)", 14, GREY)

    s.rect(20, 430, 760, 62, ORANGE, "#FFF8F3")
    s.text(400, 455, "The ratio before the sensor is RotorToSensorRatio.", 16, weight="bold")
    s.text(400, 479, "The ratio after the sensor is SensorToMechanismRatio.", 16, weight="bold")
    s.save("12-sensor-gear-chain.svg")


# ---------------------------------------------------------------- Figure 13.1
def fig_13_1():
    s = Svg(800, 600)
    # Module stack
    s.box(10, 60, 200, 110, ["holds a ModuleIO", "and its inputs bundle", "no motors of its own"], BLUE, title="SwerveModule")
    s.text(110, 195, "(the logic)", 14, GREY)
    s.box(240, 20, 290, 310, [], GREY)
    s.text(385, 48, "ModuleIO (interface)", 17, weight="bold")
    s.rect(252, 62, 266, 128, GREEN, "#EEF9F4")
    s.text(385, 84, "inputs: the readings", 15, GREEN, weight="bold")
    s.text(385, 106, ["steerAngleDegrees", "drivePositionMeters", "driveVelocityMetersPerSec"], 14, gap=1.3)
    s.text(385, 168, "updateInputs(inputs)", 14, GREEN, weight="bold")
    s.rect(252, 200, 266, 118, ORANGE, "#FFF8F3")
    s.text(385, 222, "commands: what to do", 15, ORANGE, weight="bold")
    s.text(385, 246, ["setSteerAngleDegrees(deg)", "setDriveVelocityMetersPerSec(mps)"], 14, gap=1.35)
    s.text(385, 298, "every method has a do-nothing default", 14, GREY)
    s.line(210, 115, 240, 115, BLACK, 3)
    # Drivetrain switch and implementations
    s.box(560, 10, 230, 62, ["Drivetrain.makeModule", "switch (kCurrentMode)"], PURPLE)
    impl = [("ModuleIOTalonFX", "REAL: real motors", BLUE), ("ModuleIOSim", "SIM: physics model", GREEN),
            ("new ModuleIO() {}", "REPLAY: does nothing", GREY)]
    for i, (name, sub, col) in enumerate(impl):
        y = 102 + i * 74
        s.box(560, y, 230, 62, [sub], col, title=name, dash=(col == GREY))
        s.line(560, y + 31, 530, min(max(y + 31, 120), 290), BLACK, 2)
        s.line(760, 72 if i == 0 else y - 12, 760, y, PURPLE, 2)
    s.text(385, 345, "one door; three things can stand behind it, picked once at construction", 15, GREY)
    # Gyro stack
    s.line(20, 372, 780, 372, GREY, 1, arrow=False, dash=True)
    s.box(10, 420, 200, 80, ["holds a GyroIO"], BLUE, title="Drivetrain")
    s.box(240, 385, 290, 150, [], GREY)
    s.text(385, 410, "GyroIO (interface)", 17, weight="bold")
    s.text(385, 440, ["input: yawDegrees", "updateInputs(inputs)"], 14, GREEN, weight="bold", gap=1.4)
    s.text(385, 500, "do-nothing default", 14, GREY)
    s.line(210, 460, 240, 460, BLACK, 3)
    for i, (name, sub, col) in enumerate([("GyroIOPigeon2", "REAL", BLUE), ("GyroIOSim", "SIM", GREEN), ("new GyroIO() {}", "REPLAY", GREY)]):
        y = 385 + i * 52
        s.box(560, y, 230, 44, [name + "  (" + sub + ")"], col, dash=(col == GREY))
        s.line(560, y + 22, 530, 430 + i * 30, BLACK, 2)
    s.text(385, 572, "Later lessons repeat this shape: VisionIO, ElevatorIO, and more.", 15, GREY)
    s.save("13-io-door.svg")


# ---------------------------------------------------------------- Figure 13.2
def fig_13_2():
    s = Svg(800, 650)
    s.text(200, 28, "Record (a live or simulated run)", 18, weight="bold")
    s.text(600, 28, "Replay (no robot, no simulator)", 18, weight="bold")
    X, W, H = 40, 320, 64
    rows = [52, 146, 240, 334, 428]
    # Record column
    s.box(X, rows[0], W, H, ["real motors and sensors,", "or the simulator"], GREY)
    s.box(X, rows[1], W, H, ["updateInputs fills the bundle; logged"], BLUE, title="inputs")
    s.box(X, rows[2], W, H, ["SwerveModule, Drivetrain, Localizer,", "your commands"], PURPLE, title="your logic")
    s.box(X, rows[3], W, H, ["recordOutput: RealOutputs/Drivetrain/Pose, ..."], ORANGE, title="outputs", size=14)
    s.box(X, rows[4], W, H, ["setDriveVelocityMetersPerSec, ..."], GREY, title="commands to the IO")
    for a, b in zip(rows, rows[1:]):
        s.line(X + W / 2, a + H, X + W / 2, b, BLACK, 2)
    # Replay column
    X2 = 440
    s.box(X2, rows[0], W, H, ["not running: nothing reads hardware"], GREY, dash=True, title="motors, sensors, simulator", tcolour=GREY)
    s.box(X2, rows[1], W, H, ["Logger.processInputs fills the bundle", "from the file"], BLUE, title="inputs")
    s.box(X2, rows[2], W, H, ["whatever the code is today,", "edited or not"], PURPLE, title="your logic, run again")
    s.box(X2, rows[3], W, H, ["ReplayOutputs/Drivetrain/Pose, ..."], ORANGE, title="outputs, worked out again")
    s.box(X2, rows[4], W, H, ["go nowhere: the IO does nothing"], GREY, dash=True, title="commands", tcolour=GREY)
    for a, b in zip(rows[1:], rows[2:]):
        s.line(X2 + W / 2, a + H, X2 + W / 2, b, BLACK, 2)
    s.line(X2 + W / 2, rows[0] + H, X2 + W / 2, rows[1], GREY, 2, dash=True)
    s.line(X2 + W / 2, rows[3] + H, X2 + W / 2, rows[4], GREY, 2, dash=True)
    # The log file between the two
    s.box(340, 255 - 4 + 150, 120, 0, [], GREY)
    s.path(f"M{X + W},{rows[1] + H / 2} L{X2},{rows[1] + H / 2}", BLUE, 4)
    s.text(400, rows[1] + H / 2 - 10, "the .wpilog", 14, BLUE, weight="bold")
    s.path(f"M{X + W},{rows[3] + H / 2} L{X2 - 0},{rows[3] + H / 2}", ORANGE, 3, dash=True)
    s.text(400, rows[3] + H / 2 - 10, "compare", 14, ORANGE, weight="bold")
    s.rect(20, 512, 760, 120, GREY, "#FAFAFA")
    s.text(40, 540, "Inputs come out of the file, unchanged. Outputs are worked out again.", 16, weight="bold", anchor="start")
    s.text(40, 566, "A bug inside ModuleIOTalonFX is in the recorded readings: replaying does not move the pose.", 15, anchor="start")
    s.text(40, 590, "A bug in SwerveModule.getPosition is in your logic: replaying moves the pose.", 15, anchor="start")
    s.text(40, 614, "That is why you can change the code and replay an old run.", 15, GREY, anchor="start")
    s.save("13-record-replay.svg")


# ---------------------------------------------------------------- Figure 14.1
def fig_14_1():
    s = Svg(800, 500)
    s.rect(260, 70, 280, 290, BLUE)
    s.text(400, 98, "Localizer", 15, weight="bold")
    s.text(400, 124, ["periodic() loops over its", "providers and calls", "updatePoseEstimate(estimator)"], 15)
    s.text(400, 214, "getPose()   resetPose(pose)", 15)
    s.box(290, 260, 220, 56, ["SwerveDrivePoseEstimator"], GREY, fill="#FFFFFF", size=14)
    s.text(100, 34, "PoseProvider", 16, weight="bold")
    s.text(100, 54, "registered with addProvider", 14, GREY)
    s.box(10, 80, 180, 110, ["wheel odometry + gyro", "estimator.update(...)", "every tick: smooth"], GREEN, title="Drivetrain", size=14)
    s.box(10, 208, 180, 124, ["a camera sighting", "addVisionMeasurement(", "pose, timestamp)", "now and then: absolute"], GREEN, title="VisionPoseProvider", size=14)
    s.box(10, 350, 180, 60, ["next season's provider"], GREY, dash=True, tcolour=GREY, size=14)
    s.line(190, 135, 260, 170, GREEN, 3)
    s.line(190, 270, 260, 270, ORANGE, 3)
    s.line(190, 380, 260, 320, GREY, 2, dash=True)
    s.text(670, 34, "whatever asks getPose()", 16, weight="bold")
    s.box(610, 80, 180, 70, ["Localizer/Pose (the log)"], ORANGE, title="output", size=14)
    s.box(610, 170, 180, 70, ["Field2d in SimGUI"], ORANGE, title="field view", size=14)
    s.box(610, 260, 180, 70, ["autos and aiming, later"], GREY, dash=True, tcolour=GREY, size=14)
    for y in (115, 205, 295):
        s.line(540, 215, 610, y, BLACK, 2)
    s.text(400, 446, "Add another provider and Localizer does not change by a line.", 16, weight="bold")
    s.text(400, 474, "Odometry for smoothness, vision for truth.", 15, GREY)
    s.save("14-localizer-providers.svg")


# ---------------------------------------------------------------- Figure 15.1
def fig_15_1():
    s = Svg(800, 720)
    S = 50.0                      # px per meter in the main view
    cx, cy = 270.0, 360.0
    half_fov, rng = 40.0, 6.0     # kSimHorizontalFovDegrees / 2, kSimMaxRangeMeters

    def pt(x, y, scale=S, ox=cx, oy=cy):
        return ox - y * scale, oy - x * scale

    s.text(270, 28, "Top view, drawn to scale", 17, weight="bold")
    for (cam_x, yaw, colour) in [(0.3, 0.0, GREEN), (-0.3, 180.0, ORANGE)]:
        ax, ay = pt(cam_x, 0)
        a1, a2 = math.radians(yaw - half_fov), math.radians(yaw + half_fov)
        p1 = pt(cam_x + rng * math.cos(a1), rng * math.sin(a1))
        p2 = pt(cam_x + rng * math.cos(a2), rng * math.sin(a2))
        # going from angle a1 to a2 (counter-clockwise in field axes) is counter-clockwise on screen with +Y left
        s.add(f'<path d="M{ax:.1f},{ay:.1f} L{p1[0]:.1f},{p1[1]:.1f} A{rng * S},{rng * S} 0 0 0 {p2[0]:.1f},{p2[1]:.1f} Z" '
              f'fill="{colour}" fill-opacity="0.16" stroke="{colour}" stroke-width="2"/>')
    # robot
    s.rect(cx - 15, cy - 15, 30, 30, BLACK, "#FFFFFF", rx=2)
    for cam_x, colour in [(0.3, GREEN), (-0.3, ORANGE)]:
        px, py = pt(cam_x, 0)
        s.add(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="5" fill="{colour}" stroke="#000" stroke-width="1.5"/>')
    s.text(cx, 290 - 2, "front camera: sees 80° wide, out to 6 m", 14, GREEN, weight="bold")
    s.text(cx, 440, "back camera: facing straight backward", 14, ORANGE, weight="bold")
    # blind spots
    for sign, label in [(1, "blind"), (-1, "blind")]:
        s.text(cx + sign * -165, 358, ["blind", "spot"], 15, GREY, weight="bold")
    s.text(cx, 700, "range 6 m = 300 px here; the robot is 0.6 m square", 14, GREY)
    # axes
    s.line(30, 110, 30, 60, BLACK, 2)
    s.text(30, 52, "+X", 15)
    s.line(30, 110, 0 + 2, 110, BLACK, 2)
    s.text(18, 132, "+Y", 15)
    # Zoomed robot
    zx, zy, zs = 655.0, 215.0, 200.0
    s.text(655, 28, "The robot, zoomed", 17, weight="bold")
    s.rect(zx - 60, zy - 60, 120, 120, BLACK, "#FFFFFF", rx=4)
    s.text(zx, zy + 6, "robot", 15, GREY)
    for cam_x, yaw, colour in [(0.3, 0, GREEN), (-0.3, 180, ORANGE)]:
        px, py = zx, zy - cam_x * zs
        s.add(f'<circle cx="{px}" cy="{py}" r="8" fill="{colour}" stroke="#000" stroke-width="1.5"/>')
        dy = -34 if yaw == 0 else 34
        s.line(px, py + (-10 if yaw == 0 else 10), px, py + dy, colour, 4)
    s.text(655, 70, ["front: (0.3, 0, 0.2) m", "yaw 0"], 14, GREEN, weight="bold")
    s.text(655, 330, ["back: (−0.3, 0, 0.2) m", "yaw π: Rotation3d(0, 0, Math.PI)"], 14, ORANGE, weight="bold")
    s.text(655, 100 - 0, "", 14)
    # Side view
    s.text(655, 410, "Side view: +Z is up", 17, weight="bold")
    gy = 600.0
    sx0, ss = 645.0, 300.0
    s.line(520, gy, 790, gy, BLACK, 2, arrow=False)
    s.rect(sx0 - 0.3 * ss, gy - 10, 0.6 * ss, 10, BLACK, "#DDDDDD", rx=1)  # a footprint strip, 0.6 m
    for cam_x, colour in [(0.3, GREEN), (-0.3, ORANGE)]:
        px = sx0 - cam_x * ss  # looking from the robot's left, front to the left
        py = gy - 0.2 * ss
        s.line(px, gy - 10, px, py + 7, colour, 2, arrow=False, dash=True)
        s.add(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="7" fill="{colour}" stroke="#000" stroke-width="1.5"/>')
    s.line(sx0, gy, sx0, gy - 0.2 * ss, BLACK, 2)
    s.text(sx0 + 8, gy - 0.1 * ss + 5, "0.2 m", 14, anchor="start")
    s.text(sx0 - 0.3 * ss, gy - 90, "front", 14, GREEN, weight="bold")
    s.text(sx0 + 0.3 * ss, gy - 90, "back", 14, ORANGE, weight="bold")
    s.text(655, 624, ["seen from the robot's left;", "both cameras are 0.2 m up"], 14, GREY)
    s.text(655, 676, "(vertical field of view: 56°)", 14, GREY)
    s.save("15-camera-mounts.svg")


# ---------------------------------------------------------------- Figure 15.2
def fig_15_2():
    s = Svg(800, 640)
    s.text(200, 28, "Real robot", 18, weight="bold")
    s.text(600, 28, "Simulation", 18, weight="bold")
    s.box(30, 44, 340, 62, ["a Limelight sees AprilTags", "and builds a results frame"], BLUE, title="the camera")
    s.box(430, 44, 340, 62, ["from the truth pose: which tags a camera", "here could see, packed as a frame"], GREEN, title="VisionIOLimelightSim")
    s.line(200, 106, 200, 150, BLACK, 3)
    s.line(600, 106, 600, 150, BLACK, 3)
    s.box(100, 150, 600, 56, ["limelight-front/results_msgpack"], ORANGE, title="the same NetworkTables topic")
    s.line(400, 206, 400, 240, BLACK, 3)
    s.rect(20, 232, 760, 386, GREY, "#FAFAFA", dash=True)
    s.text(400, 258, "identical in both worlds, unmodified", 16, GREY, weight="bold")
    chain = [("LimelightLib", "filter frames, trust numbers, latency-corrected timestamps"),
             ("VisionIOLimelight.updateInputs", "reads the library, fills VisionIOInputs"),
             ("Logger.processInputs", "records the frames (in a replay, supplies them)"),
             ("LimelightPoseProvider", "decides what to hand the estimator"),
             ("Localizer", "addVisionMeasurement(pose, timestamp, stdDevs)")]
    for i, (name, sub) in enumerate(chain):
        y = 274 + i * 70
        s.box(120, y, 560, 48, [sub], BLUE if i != 2 else GREEN, title=name, size=14)
        if i:
            s.line(400, y - 22, 400, y, BLACK, 2)
    s.save("15-real-vs-sim-camera.svg")


if __name__ == "__main__":
    fig_10_1()
    fig_10_3()
    fig_12_1()
    fig_13_1()
    fig_13_2()
    fig_14_1()
    fig_15_1()
    fig_15_2()
