package first.robot.figures;

import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.RadiansPerSecond;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.VisionConstants;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.LimelightPoseProvider;
import first.robot.subsystems.Localizer;

/**
 * Data for Lesson 16's "the estimate creeps ahead" figure, on the Lesson 16 state.
 *
 * <p>The real {@code Drivetrain} and {@code Localizer} (built the way {@code Robot}'s
 * constructor builds them, estimate reset to kSimStartingPose) through the scheduler on
 * a fixed 20 ms schedule, enabled, with a scripted field-relative drive command in place
 * of the sticks. Two seconds standing still first, then the scenario in env SCENARIO:
 * gentle (quarter of kMaxSpeed forward for 3 s), hardstart (full speed forward for
 * 1.5 s) or fwdrev (full forward 1.5 s, then full reverse 1.5 s). Every scenario ends
 * with the stick back at zero and runs on to 6 s so the coast-down shows. Env VISION=on
 * also registers the two cameras, as Lesson 16's Robot does; anything else leaves them
 * out. One row per tick, from the first scripted tick.
 */
public class Fig16EstimateCreeps {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100;
  private static final int RECORD_TICKS = 300; // 6 s

  private static double s_command = 0.0; // forward speed, as a fraction of kMaxSpeed

  @Test
  void recordDrive() throws Exception {
    String scenario = System.getenv().getOrDefault("SCENARIO", "hardstart");
    boolean vision = "on".equals(System.getenv("VISION"));

    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Drivetrain drivetrain = new Drivetrain();
    Localizer localizer = new Localizer(drivetrain);
    if (vision) {
      localizer.addProvider(LimelightPoseProvider.makeCamera(VisionConstants.kFrontCameraName,
          VisionConstants.kFrontRobotToCamera, drivetrain::getSimulatedPose));
      localizer.addProvider(LimelightPoseProvider.makeCamera(VisionConstants.kBackCameraName,
          VisionConstants.kBackRobotToCamera, drivetrain::getSimulatedPose));
    }
    localizer.resetPose(DriveConstants.kSimStartingPose);

    Scheduler.getDefault().schedule(drivetrain.driveFieldRelative(
        () -> DriveConstants.kMaxSpeed.times(s_command),
        () -> MetersPerSecond.of(0),
        () -> RadiansPerSecond.of(0)));

    long next = System.nanoTime();
    for (int i = 0; i < WARMUP_TICKS; i++) {
      next = tick(next);
    }

    StringBuilder csv = new StringBuilder("t_s,command,truth_x,truth_y,est_x,est_y\n");
    for (int i = 0; i < RECORD_TICKS; i++) {
      double t = i * 0.02;
      s_command = switch (scenario) {
        case "gentle" -> t < 3.0 ? 0.25 : 0.0;
        case "hardstart" -> t < 1.5 ? 1.0 : 0.0;
        case "fwdrev" -> t < 1.5 ? 1.0 : (t < 3.0 ? -1.0 : 0.0);
        default -> throw new IllegalArgumentException(scenario);
      };
      next = tick(next);
      Pose2d truth = drivetrain.getSimulatedPose();
      Pose2d est = localizer.getPose();
      csv.append(String.format("%.2f,%.2f,%.5f,%.5f,%.5f,%.5f%n", t, s_command,
          truth.getX(), truth.getY(), est.getX(), est.getY()));
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig16.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  private static long tick(long next) throws InterruptedException {
    Scheduler.getDefault().run();
    next += PERIOD_NANOS;
    long wait = next - System.nanoTime();
    if (wait > 0) {
      Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
    }
    return next;
  }
}
