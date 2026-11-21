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
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.GamepadSim;

import first.robot.Robot;
import first.robot.subsystems.FlywheelIO.FlywheelIOInputs;

/**
 * Data for Lesson 33's kS-hold figure (right bumper = holdVoltage(0.05 V)); the four-tests probe trimmed: the real {@code Robot} loop, Blue 1, {@code RobotUtility}
 * selected and enabled from the robot's own thread, on the Lesson 33 state at its shipped
 * {@code Config.defaults()} (1 V/s ramp, 7 V step, 10 s timeout).
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe and the Lesson 33 notes: the Robot is built on its
 * own thread after {@code HAL.initialize()}, a sampler registered with {@code Scheduler.addPeriodic}
 * after every robot periodic makes every driver-station and gamepad change between cycles.
 * RobotUtility is selected at tick 75 and enabled at tick 105 (time zero). Each test is started
 * 3.5 s after the wheel has been left alone (the idle spin-up has settled) and held for 10.4 s
 * (the routine ends itself at 10 s); there is an 8 s rest after each. Order: forward quasistatic
 * (Back + top face button), forward dynamic (Start + top face button), reverse quasistatic
 * (Back + bottom face button), reverse dynamic (Start + bottom face button).
 *
 * <p>One row per tick, from the tick before the first press until the end: seconds since the
 * first press, which test is held (0 none, 1 to 4 in the order above), the voltage the motor
 * applied (what the routine logs as {@code voltage-flywheel-flywheel}) and the wheel's speed
 * (what it logs as {@code velocity-flywheel-flywheel}).
 */
public class Fig33HoldVoltage {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int HOLD_TICKS = 600; // 12 s
  private static final int REST_TICKS = 100; // 2 s
  private static final int FIRST_PRESS = ENABLE_TICK + 175; // 3.5 s after enable

  private static volatile Robot robot;
  private static FlywheelIOInputs inputs;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder("t_s,test,applied_v,speed_rps\n");
  private static int tick = 0;

  @Test
  void recordHold() throws Exception {
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
        Field f = r.flywheel.getClass().getDeclaredField("m_inputs");
        f.setAccessible(true);
        inputs = (FlywheelIOInputs) f.get(r.flywheel);
      } catch (ReflectiveOperationException e) {
        throw new RuntimeException(e);
      }
      Scheduler.getDefault().addPeriodic(Fig33HoldVoltage::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(240, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig33.csv"));
    Files.writeString(out, csv);
  }

  private static void sample() {
    tick++;
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("RobotUtility")) {
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
    int test = (tick >= FIRST_PRESS && tick < FIRST_PRESS + HOLD_TICKS) ? 1 : 0;
    if (tick == FIRST_PRESS || tick == FIRST_PRESS + HOLD_TICKS) {
      pad.setRightBumperButton(test == 1);
      pad.notifyNewData();
    }
    if (tick >= FIRST_PRESS - 25) {
      csv.append(String.format("%.2f,%d,%.4f,%.4f%n", (tick - FIRST_PRESS) * 0.02, test,
          inputs.appliedVolts, inputs.velocityRps));
    }
    if (tick == FIRST_PRESS + HOLD_TICKS + REST_TICKS) {
      done.countDown();
    }
  }
}
