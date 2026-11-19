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
 * Data for Lesson 15's Try It #3 figure ("a parked robot still drifts"), on the Lesson 15
 * state with the Try It's scattered camera applied to VisionIOLimelightSim.
 *
 * <p>The real {@code Robot} loop on its own thread, Blue 1, RobotTeleop selected at tick 75
 * and enabled at tick 105 from a periodic registered after every robot periodic. The left
 * stick is pushed forward (a quarter of full) for 15 ticks from tick 110, the "nudge off
 * (0, 0)" the Try It asks for, then released; the robot is parked from there. One row per
 * tick for 60 s from the release: the estimate's pose ({@code robot.localizer.getPose()}).
 * Each JVM is one run (the camera's Random is unseeded); see the generator's docstring.
 */
public class Fig15ParkedDrift {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int NUDGE_START = 110;
  private static final int NUDGE_END = 125;
  private static final int RECORD_TICKS = 3000; // 60 s

  private static volatile Robot robot;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder("t_s,est_x,est_y\n");
  private static int tick = 0;

  @Test
  void parkedRun() throws Exception {
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
      Scheduler.getDefault().addPeriodic(Fig15ParkedDrift::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(150, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig15.csv"));
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
    if (tick == NUDGE_START) {
      pad.setLeftY(-0.25); // forward is -Y on the stick
      pad.notifyNewData();
    }
    if (tick == NUDGE_END) {
      pad.setLeftY(0.0);
      pad.notifyNewData();
    }
    if (tick > NUDGE_END && tick <= NUDGE_END + RECORD_TICKS) {
      Pose2d est = robot.localizer.getPose();
      csv.append(String.format("%.2f,%.5f,%.5f%n", (tick - NUDGE_END) * 0.02, est.getX(), est.getY()));
    }
    if (tick == NUDGE_END + RECORD_TICKS) {
      done.countDown();
    }
  }
}
