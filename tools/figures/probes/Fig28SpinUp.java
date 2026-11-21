package first.robot.figures;

import static org.wpilib.units.Units.RotationsPerSecond;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.Flywheel;
import first.robot.subsystems.FlywheelIO.FlywheelIOInputs;

/**
 * Data for Lesson 28's two flywheel figures, on the Lesson 28 state: the speed and the
 * applied volts of the real {@code Flywheel} and {@code FlywheelIOSim} after a request
 * for the shooting speed (60 rot/s).
 *
 * <p>Runs the flywheel through the scheduler with the robot enabled, on a fixed 20 ms
 * schedule (each tick waits for the next deadline). For each starting speed in
 * {@code START_LIST} (comma separated, rot/s, default "0,15,30,45") it asks the wheel
 * for that speed, lets it settle for 5 s, then asks for 60 rot/s and records
 * {@code RECORD_S} seconds (default 3) of ticks: seconds since the request, the goal,
 * the measured speed in rot/s and the volts the motor applied. The first row, 0.02 s, is the
 * tick on which the request first runs.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see the generators' docstrings.
 */
public class Fig28SpinUp {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100; // 2 s
  private static final int SETTLE_TICKS = 250; // 5 s

  @Test
  void recordSpinUps() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    String[] starts = System.getenv().getOrDefault("START_LIST", "0,15,30,45").split(",");
    int recordTicks = (int) Math.round(Double.parseDouble(System.getenv().getOrDefault("RECORD_S", "3")) / 0.02);

    Flywheel flywheel = new Flywheel();
    FlywheelIOInputs inputs = (FlywheelIOInputs) field(flywheel, "m_inputs");

    long next = System.nanoTime();
    Scheduler.getDefault().schedule(flywheel.spinUp(RotationsPerSecond.of(0)));
    for (int i = 0; i < WARMUP_TICKS; i++) {
      next = tick(next);
    }

    StringBuilder csv = new StringBuilder("start_rps,t_s,goal_rps,velocity_rps,applied_v\n");
    for (String start : starts) {
      double startRps = Double.parseDouble(start.trim());
      Scheduler.getDefault().schedule(flywheel.spinUp(RotationsPerSecond.of(startRps)));
      for (int i = 0; i < SETTLE_TICKS; i++) {
        next = tick(next);
      }
      Scheduler.getDefault().schedule(flywheel.spinUp(RotationsPerSecond.of(60)));
      for (int i = 0; i < recordTicks; i++) {
        next = tick(next);
        csv.append(String.format("%s,%.2f,60,%.5f,%.5f%n", start.trim(), (i + 1) * 0.02,
            inputs.velocityRps, inputs.appliedVolts));
      }
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig28.csv"));
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

  private static Object field(Object owner, String name) throws ReflectiveOperationException {
    Field f = owner.getClass().getDeclaredField(name);
    f.setAccessible(true);
    return f.get(owner);
  }
}
