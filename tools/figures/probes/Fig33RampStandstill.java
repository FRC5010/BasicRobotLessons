package first.robot.figures;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.sysid.SysIdRoutine;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.Flywheel;
import first.robot.subsystems.FlywheelIO.FlywheelIOInputs;

import static org.wpilib.units.Units.Volts;

/**
 * Data for Lesson 33's ramp-versus-steady-state figure: the real {@code Flywheel} and its real
 * {@code SysIdRoutine} quasistatic forward test, started from a true standstill, on the Lesson 33
 * state. The ramp rate is whatever the sandbox's {@code Flywheel.m_sysId} {@code Config} says
 * (the generator's docstring gives the {@code --replace} that makes it 0.25 V/s with a 30 s
 * timeout); the default is 1 V/s.
 *
 * <p>RIG method (CLAUDE.md's Lesson 18 notes): the Flywheel is built after
 * {@code HAL.initialize()}, the robot is enabled, and {@code Scheduler.run()} is called on a
 * fixed 20 ms deadline schedule. A hold-0-volts command is scheduled before the first tick so the
 * idle default command never starts and the wheel begins at rest. Each rep: let the wheel rest 1 s,
 * start the quasistatic test, record {@code SECONDS} seconds, cancel it, then brake the wheel
 * to under 0.02 rot/s by rescheduling a small opposing hold voltage each tick. Three reps.
 *
 * <p>One row per tick: rep, seconds since the test started (wall clock, which is what the
 * routine's own ramp timer uses), the voltage the motor applied and the wheel's speed.
 */
public class Fig33RampStandstill {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int REPS = 3;
  private static final double SECONDS = Double.parseDouble(System.getenv().getOrDefault("RAMP_SECONDS", "6"));

  @Test
  void recordRamps() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Flywheel flywheel = new Flywheel();
    Field f = flywheel.getClass().getDeclaredField("m_inputs");
    f.setAccessible(true);
    FlywheelIOInputs inputs = (FlywheelIOInputs) f.get(flywheel);

    StringBuilder csv = new StringBuilder("rep,t_s,applied_v,speed_rps\n");
    long next = System.nanoTime();
    Scheduler.getDefault().schedule(flywheel.holdVoltage(Volts.of(0)));
    for (int i = 0; i < 100; i++) {
      next = tick(next);
    }
    for (int rep = 0; rep < REPS; rep++) {
      Command test = flywheel.sysIdQuasistatic(SysIdRoutine.Direction.FORWARD);
      Scheduler.getDefault().schedule(test);
      long start = System.nanoTime();
      while ((System.nanoTime() - start) / 1e9 < SECONDS) {
        next = tick(next);
        csv.append(String.format("%d,%.3f,%.4f,%.4f%n", rep, (System.nanoTime() - start) / 1e9,
            inputs.appliedVolts, inputs.velocityRps));
      }
      Scheduler.getDefault().cancel(test);
      int quiet = 0;
      for (int i = 0; i < 1500 && quiet < 25; i++) {
        double volts = Math.max(-3.0, Math.min(3.0, -0.15 * inputs.velocityRps));
        Scheduler.getDefault().schedule(flywheel.holdVoltage(Volts.of(volts)));
        next = tick(next);
        quiet = Math.abs(inputs.velocityRps) < 0.02 ? quiet + 1 : 0;
      }
      Scheduler.getDefault().schedule(flywheel.holdVoltage(Volts.of(0)));
      for (int i = 0; i < 50; i++) {
        next = tick(next);
      }
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig33-ramp.csv"));
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
