"""Lesson 16 diagram, drawn as SVG from the lesson's own class and method names.

  python3 tools/figures/16-diagrams.py

writes, to docs/lessons/v3/images/:
  16-truth-vs-estimate-wiring.svg   Lesson 15's closed camera loop beside Lesson 16's two loops

No data and no measurements. The names are Lesson 16's: ChassisSimulation.update,
Drivetrain.simulateChassis (measured module states through toChassisVelocities), the grip
limit DriveConstants.kMaxAccelMps2 = kWheelCoF * 9.81, GyroIOSim, getSimulatedPose and
Localizer.addVisionMeasurement.
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(HERE, "diagrams-10-16.py"))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
Svg, BLUE, ORANGE, GREEN, GREY, BLACK = d.Svg, d.BLUE, d.ORANGE, d.GREEN, d.GREY, d.BLACK


def fig_16_2():
    s = Svg(800, 1240)

    # ------------------------------------------------ Lesson 15
    s.text(400, 34, "Lesson 15: the camera looks out from the estimate", 18, weight="bold")
    s.box(30, 80, 190, 80, ["wheel encoders", "and gyro"], GREY, title="Drivetrain")
    s.box(290, 70, 240, 100, ["getPose()", "the estimate"], ORANGE, title="Localizer")
    s.box(290, 235, 240, 80, ["VisionIOLimelightSim"], GREY, title="Simulated camera")
    s.line(220, 120, 290, 120, BLACK, 2)
    s.line(410, 170, 410, 235, ORANGE, 4)
    s.text(402, 208, "looks out from here", 14, ORANGE, "end")
    s.path("M530,275 L600,275 L600,120 L530,120", ORANGE, 4)
    s.text(612, 190, ["addVisionMeasurement", "corrects the estimate"], 14, ORANGE, "start")
    s.text(400, 352, "A closed loop: the estimate is corrected toward a picture it drew itself.", 15, ORANGE, weight="bold")
    s.add('<line x1="20" y1="385" x2="780" y2="385" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="7 5"/>')

    # ------------------------------------------------ Lesson 16
    o = 410
    s.text(400, o + 24, "Lesson 16: two loops, meeting only at the camera", 18, weight="bold")
    s.box(200, o + 50, 400, 74, ["measured wheel speed and angle"], GREY, title="the four SwerveModules")
    # truth column
    s.box(20, o + 190, 350, 84, ["toChassisVelocities(measured states)", "once a tick, sim only"], BLUE, title="simulateChassis()")
    s.box(20, o + 330, 350, 110, ["update(wheels, 0.020)", "grip limit: kMaxAccelMps2", "= kWheelCoF × 9.81 = 11.77 m/s²"], BLUE,
          title="ChassisSimulation: the truth")
    s.box(20, o + 500, 350, 66, ["the truth, for the cameras and for you"], BLUE, title="getSimulatedPose()")
    # estimate column
    s.box(420, o + 190, 360, 100, ["odometry from the encoders", "and the gyro's heading", "reads only what sensors report"], ORANGE,
          title="Localizer: the estimate")
    s.box(420, o + 350, 360, 66, ["reports the chassis' heading"], GREY, title="GyroIOSim")
    # arrows
    s.line(300, o + 124, 195, o + 190, BLACK, 2)
    s.line(500, o + 124, 600, o + 190, BLACK, 2)
    s.text(100, o + 140, "follows the wheels,", 14, BLUE, "middle")
    s.text(100, o + 158, "not the command", 14, BLUE, "middle")
    s.line(195, o + 274, 195, o + 330, BLUE, 3)
    s.line(195, o + 440, 195, o + 500, BLUE, 3)
    s.line(370, o + 385, 420, o + 385, BLUE, 3)       # truth heading into the sim gyro
    s.line(600, o + 350, 600, o + 290, BLACK, 2)      # gyro into the estimate
    s.add(f'<line x1="395" y1="{o + 175}" x2="395" y2="{o + 600}" stroke="#bbbbbb" stroke-width="2" stroke-dasharray="7 5"/>')
    # camera
    s.box(240, o + 650, 320, 84, ["renders from the truth,", "reports a pose"], GREY, title="Simulated camera")
    s.path(f"M195,{o + 566} L195,{o + 692} L240,{o + 692}", BLUE, 3)
    s.path(f"M560,{o + 692} L760,{o + 692} L760,{o + 240} L780,{o + 240}", GREEN, 4)
    s.text(660, o + 678, "addVisionMeasurement", 14, GREEN, "middle")
    s.text(400, o + 772, "The estimate never reads the truth, only sensors do (the gyro too).", 15, GREEN, weight="bold")
    s.text(400, o + 794, "Only the camera lets the truth correct the estimate.", 15, GREEN, weight="bold")
    s.save("16-truth-vs-estimate-wiring.svg")


if __name__ == "__main__":
    fig_16_2()
