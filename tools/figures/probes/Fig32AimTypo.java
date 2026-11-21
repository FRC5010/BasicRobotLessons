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
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Robot;

/**
 * Data for Lesson 32's Figure 32.3: the "Aim While Driving" auto on the Lesson 32 state (Blue 1),
 * run once with {@code kAimTagId = 20} and once with the typo 220 (the generator's docstring gives
 * the {@code --replace}). LOOP method: the real Robot on its own thread, a sampler registered
 * after every robot periodic, the auto selected at tick 75 and enabled at tick 105.
 *
 * <p>One row per tick: seconds since enable, the estimate's heading (Localizer pose), the truth
 * heading, the path's remaining distance (NaN before the first follow), whether
 * FollowPath/rotationOverrideActive is true, and whether the topic Aim/ErrorDegrees exists
 * (and its value, NaN if not).
 */
public class Fig32AimTypo {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int RECORD_TICKS = 500; // 10 s

  private static volatile Robot robot;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,est_heading_deg,truth_heading_deg,remaining_m,override_active,aim_error_exists,aim_error_deg\n");
  private static int tick = 0;

  @Test
  void run() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();
    Thread t = new Thread(() -> {
      Robot r = new Robot();
      robot = r;
      Scheduler.getDefault().addPeriodic(Fig32AimTypo::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();
    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig32aim.csv"));
    Files.writeString(out, csv);
  }

  private static void sample() {
    tick++;
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("Aim While Driving")) {
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
    if (tick > ENABLE_TICK && tick <= ENABLE_TICK + RECORD_TICKS) {
      NetworkTableInstance nt = NetworkTableInstance.getDefault();
      Pose2d est = robot.localizer.getPose();
      Pose2d truth = robot.drivetrain.getSimulatedPose();
      double remaining = nt.getEntry("/Telemetry/FollowPath/remainingPathDistanceMeters")
          .getDouble(Double.NaN);
      boolean active = nt.getEntry("/Telemetry/FollowPath/rotationOverrideActive").getBoolean(false);
      var aim = nt.getEntry("/AdvantageKit/RealOutputs/Aim/ErrorDegrees");
      csv.append(String.format("%.2f,%.3f,%.3f,%.4f,%d,%d,%.3f%n", (tick - ENABLE_TICK) * 0.02,
          est.getRotation().getDegrees(), truth.getRotation().getDegrees(), remaining,
          active ? 1 : 0, aim.exists() ? 1 : 0, aim.getDouble(Double.NaN)));
    }
    if (tick == ENABLE_TICK + RECORD_TICKS) {
      done.countDown();
    }
  }
}
