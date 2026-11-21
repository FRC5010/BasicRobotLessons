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
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.GamepadSim;
import org.wpilib.system.RobotController;

import first.robot.Robot;

/**
 * Data for Lesson 29's tired-battery figure: the real {@code Robot} loop, Blue 1, Teleop
 * selected and enabled from the robot's own thread, on the Lesson 29 state (with whatever
 * limits and battery model the sandbox has been edited to).
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe and the Lesson 29 notes: the Robot is built
 * on its own thread after {@code HAL.initialize()}, a sampler is registered with
 * {@code Scheduler.addPeriodic} after every robot periodic, and every driver-station and
 * gamepad change is made from that sampler, between cycles. Teleop is selected at tick 75
 * and enabled at tick 105 (time zero). Back is pressed 0.5 s later to home the elevator;
 * at 6 s D-pad up, the left trigger and the left face button are pressed together and held
 * for 3 s. One row per tick until 10.4 s: the total supply current the robot adds up (what
 * {@code Power/TotalCurrentAmps} logs), the battery voltage the robot read that tick (what
 * {@code Power/BatteryVolts} logs), the flywheel's speed and the elevator's height.
 *
 * <p>Run the sandbox's test again for another run (fresh JVM each time); see the generator's
 * docstring for the commands.
 */
public class Fig29TiredBattery {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int BACK_TICK = ENABLE_TICK + 25;
  private static final int MOVES_TICK = ENABLE_TICK + 300;
  private static final int RELEASE_TICK = MOVES_TICK + 150;
  private static final int END_TICK = ENABLE_TICK + 520;

  private static volatile Robot robot;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,total_amps,battery_volts,flywheel_rps,elevator_m\n");
  private static int tick = 0;

  @Test
  void recordMoves() throws Exception {
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
      Scheduler.getDefault().addPeriodic(Fig29TiredBattery::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig29.csv"));
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
    if (tick == BACK_TICK) {
      pad.setBackButton(true);
      pad.notifyNewData();
    }
    if (tick == BACK_TICK + 5) {
      pad.setBackButton(false);
      pad.notifyNewData();
    }
    if (tick == MOVES_TICK) {
      pad.setDpadUpButton(true);
      pad.setLeftTriggerAxis(1.0);
      pad.setFaceLeftButton(true);
      pad.notifyNewData();
    }
    if (tick == RELEASE_TICK) {
      pad.setDpadUpButton(false);
      pad.setLeftTriggerAxis(0.0);
      pad.setFaceLeftButton(false);
      pad.notifyNewData();
    }
    if (tick > ENABLE_TICK && tick <= END_TICK) {
      double total = robot.elevator.getSupplyCurrentAmps() + robot.arm.getSupplyCurrentAmps()
          + robot.flywheel.getSupplyCurrentAmps();
      csv.append(String.format("%.2f,%.3f,%.4f,%.4f,%.5f%n", (tick - ENABLE_TICK) * 0.02, total,
          RobotController.getBatteryVoltage(), robot.flywheel.getSpeed().in(org.wpilib.units.Units.RotationsPerSecond),
          robot.elevator.getHeightMeters()));
    }
    if (tick == END_TICK) {
      done.countDown();
    }
  }
}
