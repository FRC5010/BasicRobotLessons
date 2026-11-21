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
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Robot;
import first.robot.subsystems.ArmIO.ArmIOInputs;

/**
 * Data for Lesson 25's Pick Up timeline: the real {@code Robot} loop, Blue 1, the "Pick Up"
 * autonomous opmode selected and enabled from the robot's own thread, on a fresh launch
 * (the piece is on the field), on the Lesson 25 state.
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe and the Lessons 24-27 notes: the Robot is
 * built on its own thread after {@code HAL.initialize()}, a sampler is registered with
 * {@code Scheduler.addPeriodic} after every robot periodic, and every driver-station change
 * is made from that sampler, between cycles. The opmode is selected at tick 75 and enabled
 * at tick 105 (time zero). One row per tick until 9 s after that: the simulated truth pose,
 * the superstructure state, the arm angle, the roller speed, the raw beam break, the
 * elevator height and B-Line's {@code FollowPath/remainingPathDistanceMeters} (0 until the
 * path's first run; the analysis takes the first tick it is above 0 as the start of the drive).
 *
 * <p>Run the sandbox's test again for another run (fresh JVM each time); see the generator's
 * docstring for the commands.
 */
public class Fig25PickUp {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int RECORD_TICKS = 450; // 9 s

  private static volatile Robot robot;
  private static ArmIOInputs armInputs;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,x_m,y_m,state,arm_deg,roller_rps,beam_break,elevator_m,remaining_m\n");
  private static int tick = 0;

  @Test
  void driveToThePiece() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();

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
      Scheduler.getDefault().addPeriodic(Fig25PickUp::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig25.csv"));
    Files.writeString(out, csv);
  }

  private static void sample() {
    tick++;
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("Pick Up")) {
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
      double remaining = NetworkTableInstance.getDefault()
          .getEntry("/Telemetry/FollowPath/remainingPathDistanceMeters").getDouble(Double.NaN);
      csv.append(String.format("%.2f,%.5f,%.5f,%s,%.3f,%.3f,%d,%.5f,%.5f%n",
          (tick - ENABLE_TICK) * 0.02, truth.getX(), truth.getY(),
          robot.superstructure.getState().name(), armInputs.angleDegrees,
          armInputs.rollerVelocityRotPerSec, robot.arm.hasGamePiece() ? 1 : 0,
          robot.elevator.getHeightMeters(), remaining));
    }
    if (tick == ENABLE_TICK + RECORD_TICKS) {
      done.countDown();
    }
  }
}
