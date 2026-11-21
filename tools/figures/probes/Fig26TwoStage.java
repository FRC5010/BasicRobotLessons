package first.robot.figures;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.AllianceStationID;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.OpModeOption;
import org.wpilib.math.controller.ProfiledPIDController;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Robot;

/**
 * Data for Lesson 26's speed figure: the real {@code Robot} loop, Blue 1, the "Drive To Pose"
 * autonomous opmode, from (1, 1, 0 deg) to the scoring pose (5, 4, 90 deg), on the Lesson 26 state
 * (or, with the sandbox's drivetrain swapped for the old sketch-then-P code, the old design).
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe and the Lessons 24-27 notes: the Robot is built on
 * its own thread after {@code HAL.initialize()}, a sampler is registered with
 * {@code Scheduler.addPeriodic} after every robot periodic, and every change is made from that
 * sampler, between cycles. The simulated chassis is set down at (1, 1, 0) at tick 40 and the estimate
 * reset to match at tick 55 (a few ticks apart); the opmode is selected at tick 75 and enabled at
 * tick 105 (time zero). One row per tick for 6 s: the simulated truth pose, the profile's plan speed
 * along the line ({@code m_alongController.getSetpoint().velocity}, read by reflection; NaN when
 * the drivetrain has no such controller), the progress goal, and the drivetrain's current command
 * name as AdvantageKit publishes it, and whether the drivetrain's own arrival test (the profiles'
 * {@code atGoal()}, or the old design's {@code atPose()}) says arrived. The analysis takes speeds from the truth pose at dt = 0.02.
 *
 * <p>Run the sandbox's test again for another run (fresh JVM each time); see the generator's
 * docstring for the commands.
 */
public class Fig26TwoStage {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int RECORD_TICKS = 300; // 6 s

  private static volatile Robot robot;
  private static ProfiledPIDController along;
  private static ProfiledPIDController heading;
  private static Method atPose; // the old design's arrival test
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,x_m,y_m,theta_deg,plan_speed_mps,command,at_goal\n");
  private static int tick = 0;

  @Test
  void driveToPose() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();

    Thread t = new Thread(() -> {
      Robot r = new Robot();
      robot = r;
      try {
        Field f = r.drivetrain.getClass().getDeclaredField("m_alongController");
        f.setAccessible(true);
        along = (ProfiledPIDController) f.get(r.drivetrain);
        Field h = r.drivetrain.getClass().getDeclaredField("m_headingController");
        h.setAccessible(true);
        heading = (ProfiledPIDController) h.get(r.drivetrain);
      } catch (NoSuchFieldException e) {
        along = null; // the old design has no profiled controller
        try {
          atPose = r.drivetrain.getClass().getMethod("atPose");
        } catch (NoSuchMethodException e2) {
          atPose = null;
        }
      } catch (IllegalAccessException e) {
        throw new IllegalStateException(e);
      }
      Scheduler.getDefault().addPeriodic(Fig26TwoStage::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig26.csv"));
    Files.writeString(out, csv);
  }

  private static void sample() {
    tick++;
    Pose2d start = new Pose2d(1, 1, new Rotation2d());
    if (tick == 40) {
      robot.drivetrain.placeSimulatedRobot(start);
    }
    if (tick == 55) {
      robot.localizer.resetPose(start);
    }
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("Drive To Pose")) {
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
      Pose2d truth = robot.drivetrain.getSimulatedPose();
      double plan = along == null ? Double.NaN : along.getSetpoint().velocity;
      String command = NetworkTableInstance.getDefault()
          .getEntry("/AdvantageKit/RealOutputs/Drivetrain/CurrentCommand").getString("");
      int atGoal = -1; // -1: not known
      try {
        if (along != null) {
          atGoal = along.atGoal() && heading.atGoal() ? 1 : 0; // arrived() also wants the line check
        } else if (atPose != null) {
          atGoal = (Boolean) atPose.invoke(robot.drivetrain) ? 1 : 0;
        }
      } catch (ReflectiveOperationException e) {
        throw new IllegalStateException(e);
      }
      csv.append(String.format("%.2f,%.5f,%.5f,%.3f,%.5f,%s,%d%n", (tick - ENABLE_TICK) * 0.02,
          truth.getX(), truth.getY(), truth.getRotation().getDegrees(), plan, command, atGoal));
    }
    if (tick == ENABLE_TICK + RECORD_TICKS) {
      done.countDown();
    }
  }
}
