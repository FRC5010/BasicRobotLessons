package first.robot.figures;

import java.lang.reflect.Field;
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
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.GamepadSim;

import first.robot.Robot;
import first.robot.subsystems.ArmIO.ArmIOInputs;
import first.robot.subsystems.SuperstructureState;

/**
 * Data for Lesson 24's "one capture cycle" figure: the real {@code Robot} loop on the Lesson 24
 * state, Blue 1, {@code RobotTeleop} driven through {@code GamepadSim} on its own thread, every
 * stick and button change made from a sampler that runs after every robot periodic.
 *
 * <p>The script: enable, press Back (home), wait for IDLE and for the elevator and arm to settle,
 * set the robot down at (3.5, 3.2, 0 deg) (the game piece at (4.5, 3.2) is 1 m ahead), press the
 * left face button (intake), wait until the arm is below horizontal and the roller is running,
 * push the left stick a quarter forward (the drive starts: time zero), let go when the state
 * reaches HOLDING, wait 1 s, pull the right trigger for 5 ticks (score), and record until the
 * state has been IDLE for 1 s. One row per tick from the intake press on; the {@code ev} column
 * names the tick a script step was taken.
 */
public class Fig24CaptureCycle {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;

  private static volatile Robot robot;
  private static ArmIOInputs armInputs;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "tick,state,arm_deg,roller_rps,beam_break,elevator_m,elevator_at_goal,arm_at_goal,x_m,ev\n");
  private static int tick = 0;
  private static int step = 0;       // 0 home, 1 settle, 2 place, 3 reset, 4 intake, 5 wait roller, 6 drive, 7 hold, 8 score, 9 after
  private static int stepTick = 0;   // tick the current step began
  private static boolean recording = false;
  private static int idleSince = -1;

  @Test
  void captureCycle() throws Exception {
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
      try {
        Field f = r.arm.getClass().getDeclaredField("m_inputs");
        f.setAccessible(true);
        armInputs = (ArmIOInputs) f.get(r.arm);
      } catch (ReflectiveOperationException e) {
        throw new IllegalStateException(e);
      }
      Scheduler.getDefault().addPeriodic(Fig24CaptureCycle::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out at step " + step);
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig24.csv"));
    Files.writeString(out, csv);
  }

  private static void next() {
    step++;
    stepTick = tick;
  }

  private static void sample() {
    tick++;
    String ev = "";
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
      stepTick = tick;
    }
    if (tick > ENABLE_TICK) {
      SuperstructureState s = robot.superstructure.getState();
      int since = tick - stepTick;
      switch (step) {
        case 0 -> { // press Back 5 ticks after enable, hold 3 ticks; then wait for IDLE
          if (since == 5) { pad.setBackButton(true); pad.notifyNewData(); }
          if (since == 8) { pad.setBackButton(false); pad.notifyNewData(); }
          if (s == SuperstructureState.IDLE) { next(); }
        }
        case 1 -> { // let the stow finish
          if (since > 20 && robot.elevator.atGoal() && robot.arm.atGoal()) { next(); }
        }
        case 2 -> {
          robot.drivetrain.placeSimulatedRobot(new Pose2d(3.5, 3.2, new Rotation2d()));
          next();
        }
        case 3 -> {
          if (since == 5) {
            robot.localizer.resetPose(new Pose2d(3.5, 3.2, new Rotation2d()));
          }
          if (since == 15) { next(); }
        }
        case 4 -> {
          recording = true;
          pad.setFaceLeftButton(true); pad.notifyNewData();
          ev = "intake_press";
          next();
        }
        case 5 -> {
          if (since == 3) { pad.setFaceLeftButton(false); pad.notifyNewData(); }
          if (armInputs.angleDegrees < 0 && Math.abs(armInputs.rollerVelocityRotPerSec) > 0.5) {
            pad.setLeftY(-0.25); pad.notifyNewData();
            ev = "drive_start";
            next();
          }
        }
        case 6 -> {
          if (s == SuperstructureState.HOLDING) {
            pad.setLeftY(0.0); pad.notifyNewData();
            ev = "stick_released";
            next();
          }
        }
        case 7 -> {
          if (since == 50) {
            pad.setRightTriggerAxis(1.0); pad.notifyNewData();
            ev = "score_press";
          }
          if (since == 55) { pad.setRightTriggerAxis(0.0); pad.notifyNewData(); }
          if (since > 55 && s == SuperstructureState.IDLE) { next(); idleSince = tick; }
        }
        default -> {
          if (tick - idleSince >= 60) { done.countDown(); }
        }
      }
      if (recording) {
        csv.append(String.format("%d,%s,%.3f,%.3f,%d,%.5f,%d,%d,%.4f,%s%n", tick, s.name(),
            armInputs.angleDegrees, armInputs.rollerVelocityRotPerSec,
            robot.arm.hasGamePiece() ? 1 : 0, robot.elevator.getHeightMeters(),
            robot.elevator.atGoal() ? 1 : 0, robot.arm.atGoal() ? 1 : 0,
            robot.drivetrain.getSimulatedPose().getX(), ev));
      }
    }
  }
}
