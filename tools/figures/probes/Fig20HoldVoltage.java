package first.robot.figures;

import static org.wpilib.units.Units.Degrees;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.Arm;
import first.robot.subsystems.ArmIO.ArmIOInputs;
import first.robot.subsystems.Elevator;

/**
 * Data for Lesson 20's "holding voltage is a cosine" figure, on the Lesson 20 state.
 *
 * <p>Runs the real {@code Arm} and {@code ArmIOSim} through the scheduler with the robot
 * enabled, on a fixed 20 ms schedule. It sweeps the goal through every 10 degrees from
 * -20 to 180 (plus 45 and 135, which the lesson's table uses), holding each for 5 s, and
 * writes one row per angle: the goal, the mean measured angle and the mean applied volts
 * over the last 0.5 s, and the spread (max - min) of the volts over that window.
 * Then it does the same sweep back down, so the figure can show the approach direction
 * doesn't matter.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see the generator's docstring.
 */
public class Fig20HoldVoltage {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int HOLD_TICKS = 250; // 5 s
  private static final int WINDOW = 25; // last 0.5 s

  @Test
  void sweep() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Elevator elevator = new Elevator();
    Arm arm = new Arm(elevator);
    ArmIOInputs inputs = (ArmIOInputs) field(arm, "m_inputs");

    double[] up = {-20, -10, 0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180};
    StringBuilder csv = new StringBuilder("direction,goal_deg,angle_deg,volts,volts_spread\n");
    long[] next = {System.nanoTime()};
    // warm-up: sit at the first angle
    Scheduler.getDefault().schedule(arm.goToAngle(Degrees.of(up[0])));
    for (int i = 0; i < 150; i++) tick(next);
    for (int pass = 0; pass < 2; pass++) {
      for (int k = 0; k < up.length; k++) {
        double g = pass == 0 ? up[k] : up[up.length - 1 - k];
        Scheduler.getDefault().schedule(arm.goToAngle(Degrees.of(g)));
        double sa = 0, sv = 0, lo = 1e9, hi = -1e9;
        for (int i = 0; i < HOLD_TICKS; i++) {
          tick(next);
          if (i >= HOLD_TICKS - WINDOW) {
            sa += inputs.angleDegrees;
            sv += inputs.appliedVolts;
            lo = Math.min(lo, inputs.appliedVolts);
            hi = Math.max(hi, inputs.appliedVolts);
          }
        }
        csv.append(String.format("%s,%.1f,%.4f,%.5f,%.5f%n", pass == 0 ? "up" : "down", g,
            sa / WINDOW, sv / WINDOW, hi - lo));
      }
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig20.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  private static void tick(long[] next) throws InterruptedException {
    Scheduler.getDefault().run();
    next[0] += PERIOD_NANOS;
    long wait = next[0] - System.nanoTime();
    if (wait > 0) Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
  }

  private static Object field(Object owner, String name) throws ReflectiveOperationException {
    Field f = owner.getClass().getDeclaredField(name);
    f.setAccessible(true);
    return f.get(owner);
  }
}
