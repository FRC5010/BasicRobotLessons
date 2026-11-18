package first.robot.figures;

import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.RadiansPerSecond;

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
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Constants.PathConstants;
import first.robot.Robot;
import first.robot.commands.Aim;

/**
 * Data for Lesson 27's orbit figure: the real {@code Robot} loop, Blue 1, Teleop enabled,
 * and a drive command the probe schedules itself: circle tag 20 at 3 m, counter-clockwise, at
 * {@code SPEED} m/s (default 3), with a radial P (2.0) on the estimate holding the radius, and the
 * spin from {@code MODE}: "P" (error times kAimP only) or "FF" ({@code Aim.omegaTowardTag}, the
 * bearing rate plus P). On the Lesson 27 state.
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe and the Lessons 24-27 notes: the Robot is built on
 * its own thread after {@code HAL.initialize()}, a sampler is registered with
 * {@code Scheduler.addPeriodic} after every robot periodic, and every change is made from that
 * sampler, between cycles. The simulated chassis is set down 3 m west of the tag, facing it, at
 * tick 40; the estimate is reset to match at tick 55 (a few ticks apart, as the notes say);
 * Teleop is selected at tick 75 and enabled at tick 105; the orbit starts at tick 140 (time zero).
 * One row per tick for 9 s: the aim error in degrees read from the estimate and from the simulated
 * truth, the radius from the tag by each, and the truth position.
 *
 * <p>Run the sandbox's test again for another run (fresh JVM each time); see the generator's
 * docstring for the commands.
 */
public class Fig27Orbit {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int START_TICK = 140;
  private static final int RECORD_TICKS = 450; // 9 s
  private static final double RADIUS = 3.0;
  private static final double RADIAL_P = 2.0;

  private static final double SPEED = Double.parseDouble(System.getenv().getOrDefault("SPEED", "3"));
  private static final boolean FEEDFORWARD = System.getenv().getOrDefault("MODE", "FF").equals("FF");

  private static volatile Robot robot;
  private static Translation2d tag;
  private static Pose2d start;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,est_error_deg,truth_error_deg,est_radius_m,truth_radius_m,x_m,y_m\n");
  private static int tick = 0;

  @Test
  void orbitTheTag() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();

    tag = Aim.tagPosition(PathConstants.kAimTagId).orElseThrow();
    start = new Pose2d(tag.getX() - RADIUS, tag.getY(), new Rotation2d());

    Thread t = new Thread(() -> {
      Robot r = new Robot();
      robot = r;
      Scheduler.getDefault().addPeriodic(Fig27Orbit::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig27.csv"));
    Files.writeString(out, csv);
  }

  /** Field-relative velocity that circles the tag counter-clockwise and holds the radius. */
  private static Translation2d velocity() {
    Translation2d offset = robot.localizer.getPose().getTranslation().minus(tag); // tag to robot
    double r = offset.getNorm();
    Translation2d radial = offset.div(r);
    Translation2d tangent = new Translation2d(-radial.getY(), radial.getX());
    return tangent.times(SPEED).plus(radial.times(RADIAL_P * (RADIUS - r)));
  }

  private static double omega() {
    Pose2d est = robot.localizer.getPose();
    if (FEEDFORWARD) {
      return Aim.omegaTowardTag(robot.drivetrain, robot.localizer, PathConstants.kAimTagId);
    }
    return Aim.error(est, tag).getRadians() * PathConstants.kAimP;
  }

  private static void sample() {
    tick++;
    if (tick == 40) {
      robot.drivetrain.placeSimulatedRobot(start);
    }
    if (tick == 55) {
      robot.localizer.resetPose(start);
    }
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
    if (tick == START_TICK) {
      Scheduler.getDefault().schedule(robot.drivetrain.driveFieldRelative(
          () -> MetersPerSecond.of(velocity().getX()),
          () -> MetersPerSecond.of(velocity().getY()),
          () -> RadiansPerSecond.of(omega())));
    }
    if (tick > START_TICK && tick <= START_TICK + RECORD_TICKS) {
      Pose2d est = robot.localizer.getPose();
      Pose2d truth = robot.drivetrain.getSimulatedPose();
      csv.append(String.format("%.2f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f%n", (tick - START_TICK) * 0.02,
          Aim.error(est, tag).getDegrees(), Aim.error(truth, tag).getDegrees(),
          est.getTranslation().minus(tag).getNorm(), truth.getTranslation().minus(tag).getNorm(),
          truth.getX(), truth.getY()));
    }
    if (tick == START_TICK + RECORD_TICKS) {
      done.countDown();
    }
  }
}
