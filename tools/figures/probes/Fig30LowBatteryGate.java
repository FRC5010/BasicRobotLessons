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
 * Data for Lesson 30's low-battery-gate figure: the real {@code Robot} loop on the Lesson 30
 * state with the fresh battery (the default model, resting at 12.0 V), Blue 1. Teleop is
 * selected at tick 75, the robot is enabled at tick 105 (time zero, so the disabled stretch
 * before it is negative time) and the left trigger (spin the flywheel up to shooting speed) is
 * held from 4 s to 7 s. One row per tick from 1 s before enable to 9 s after: the battery
 * voltage the robot reads ({@code Power/BatteryVolts}) and whether the robot is enabled.
 * The alert's own test, applied without the disabled gate, is read off the voltage in the
 * generator. Fixed 20 ms schedule is the real robot's.
 */
public class Fig30LowBatteryGate {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int SHOT_TICK = ENABLE_TICK + 200;
  private static final int RELEASE_TICK = SHOT_TICK + 150;
  private static final int END_TICK = ENABLE_TICK + 450;

  private static volatile Robot robot;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder(
      "t_s,battery_volts,enabled,flywheel_rps\n");
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
      Scheduler.getDefault().addPeriodic(Fig30LowBatteryGate::sample);
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
    if (tick == SHOT_TICK) {
      pad.setLeftTriggerAxis(1.0);
      pad.notifyNewData();
    }
    if (tick == RELEASE_TICK) {
      pad.setLeftTriggerAxis(0.0);
      pad.notifyNewData();
    }
    if (tick > ENABLE_TICK - 50 && tick <= END_TICK) {
      csv.append(String.format("%.2f,%.4f,%d,%.3f%n", (tick - ENABLE_TICK) * 0.02,
          RobotController.getBatteryVoltage(), DriverStationSim.getEnabled() ? 1 : 0,
          robot.flywheel.getSpeed().in(org.wpilib.units.Units.RotationsPerSecond)));
    }
    if (tick == END_TICK) {
      done.countDown();
    }
  }
}
