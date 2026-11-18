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
import frc.robot.lib.BLine.commands.FollowPath;

/**
 * Data for Lesson 17's Two Corners figures (the drawn-and-driven track and the cross-track
 * error): the real {@code Robot} loop, Blue 1, the "Two Corners" autonomous opmode selected and
 * enabled from the robot's own thread, on the Lesson 17 state.
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe: the Robot is built on its own thread after
 * {@code HAL.initialize()}, a sampler is registered with {@code Scheduler.addPeriodic} after
 * every robot periodic, and every driver-station change is made from that sampler, between
 * cycles. The opmode is selected at tick 75 and enabled at tick 105 (the Lessons 24-27 notes).
 * Time zero is the tick the robot is enabled. One row per tick until 6 s after that: the
 * simulated truth pose, the localizer's estimate, B-Line's {@code FollowPath/crossTrackError}
 * and {@code FollowPath/remainingPathDistanceMeters} as read from NetworkTables,, a counter
 * that goes up on the tick the {@code shoot} event handler runs, and B-Line's own
 * {@code eventTriggersFiredCount}.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see the generator's docstring.
 */
public class Fig17TwoCorners {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int RECORD_TICKS = 300; // 6 s

  private static volatile Robot robot;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,x_m,y_m,theta_deg,est_x_m,est_y_m,est_theta_deg,cross_track_m,remaining_m,shoot_count,fired_count\n");
  private static final int[] shoot = {0};
  private static int tick = 0;

  @Test
  void driveTwoCorners() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();

    Thread t = new Thread(() -> {
      Robot r = new Robot();
      FollowPath.registerEventTrigger("shoot", () -> shoot[0]++);
      robot = r;
      Scheduler.getDefault().addPeriodic(Fig17TwoCorners::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig17.csv"));
    Files.writeString(out, csv);
    Files.writeString(Path.of(out + ".topics"), String.join("\n", topicNames()) + "\n");
  }

  private static String[] topicNames() {
    return java.util.Arrays.stream(NetworkTableInstance.getDefault().getTopicInfo())
        .map(i -> i.name).filter(n -> n.contains("FollowPath")).sorted().toArray(String[]::new);
  }

  private static void sample() {
    tick++;
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("Two Corners")) {
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
      Pose2d truth = robot.drivetrain.getSimulatedPose();
      Pose2d est = robot.localizer.getPose();
      double cross = nt.getEntry("/Telemetry/FollowPath/crossTrackError").getDouble(Double.NaN);
      double remaining =
          nt.getEntry("/Telemetry/FollowPath/remainingPathDistanceMeters").getDouble(Double.NaN);
      csv.append(String.format("%.2f,%.5f,%.5f,%.3f,%.5f,%.5f,%.3f,%.5f,%.5f,%d,%.0f%n",
          (tick - ENABLE_TICK) * 0.02, truth.getX(), truth.getY(), truth.getRotation().getDegrees(),
          est.getX(), est.getY(), est.getRotation().getDegrees(), cross, remaining, shoot[0],
          nt.getEntry("/Telemetry/FollowPath/eventTriggersFiredCount").getDouble(Double.NaN)));
    }
    if (tick == ENABLE_TICK + RECORD_TICKS) {
      done.countDown();
    }
  }
}
