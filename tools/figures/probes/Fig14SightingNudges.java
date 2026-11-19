package first.robot.figures;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.AllianceStationID;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.OpModeOption;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.GamepadSim;

import first.robot.Robot;

/**
 * Data for Lesson 14's Figure 14.2: a parked robot and five presses of Start, a second apart.
 *
 * <p>LOOP: the real {@code Robot} (so the real {@code RobotTeleop} Start binding fires the real
 * fake sighting at (2, 5, 90 degrees)) on its own thread after {@code HAL.initialize()}; a
 * sampler registered after every robot periodic makes every driver-station and gamepad change
 * between cycles and reads {@code robot.localizer.getPose()}. RobotTeleop is selected at tick
 * 75 and enabled at tick 105; time zero is the enable. Start is pressed (held 5 ticks) at
 * 1, 2, 3, 4 and 5 s, and sampling ends at 8 s. One CSV row per tick: seconds since enable,
 * x, y, heading in degrees, distance to (2, 5), and 1 on the tick the button went down.
 * Set STD_DEVS_NOTE to label a run that has the lesson's trust knob in Localizer.
 */
public class Fig14SightingNudges {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int END_TICK = ENABLE_TICK + 400; // 8 s

  private static volatile Robot robot;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder("t_s,x_m,y_m,heading_deg,dist_m,press\n");
  private static int tick = 0;

  @Test
  void parkedAndPress() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();
    pad = new GamepadSim(0);
    pad.setButtonsAvailable(-1L);
    pad.setAxesAvailable(0x3F);
    pad.notifyNewData();

    Thread t = new Thread(() -> {
      Robot r = new Robot();
      robot = r;
      Scheduler.getDefault().addPeriodic(Fig14SightingNudges::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig14.csv"));
    Files.writeString(out, csv);
  }

  private static void sample() {
    tick++;
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("RobotTeleop")) {
          DriverStationSim.setRobotMode(o.getMode());
          DriverStationSim.setOpMode(o.id);
        }
      }
      DriverStationSim.notifyNewData();
    }
    if (tick == ENABLE_TICK) {
      DriverStationSim.setEnabled(true);
      DriverStationSim.notifyNewData();
    }
    int s = tick - ENABLE_TICK;
    int press = 0;
    for (int k = 1; k <= 5; k++) {
      if (s == k * 50) { pad.setStartButton(true); pad.notifyNewData(); press = 1; }
      if (s == k * 50 + 5) { pad.setStartButton(false); pad.notifyNewData(); }
    }
    if (s >= 0 && tick <= END_TICK) {
      Pose2d p = robot.localizer.getPose();
      csv.append(String.format("%.2f,%.5f,%.5f,%.3f,%.5f,%d%n", s * 0.02, p.getX(), p.getY(),
          p.getRotation().getDegrees(), Math.hypot(p.getX() - 2.0, p.getY() - 5.0), press));
    }
    if (tick == END_TICK) {
      done.countDown();
    }
  }
}
