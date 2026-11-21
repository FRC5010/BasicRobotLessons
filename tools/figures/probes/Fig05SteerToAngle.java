package first.robot.figures;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import com.ctre.phoenix6.sim.TalonFXSimState;

import first.robot.Constants.SteerConstants;
import first.robot.subsystems.DriveModule;

/**
 * Data for Lesson 5's P-control figures: one tap of the left button, {@code
 * steerToAngle(90)} from a module sitting at 0, on the Lesson 5 state (steering
 * motor on a 1:1 DCMotorSim, J = 0.004, CANcoder primed at 0).
 *
 * <p>Runs the real {@code DriveModule} through the scheduler with the robot
 * enabled, on a fixed 20 ms schedule (each tick waits for the next deadline), the
 * way {@code Robot} does it: {@code Scheduler.run()}, then
 * {@code module.simulatePeriodic()}. The module holds 0 for two seconds first.
 * One row per tick, read right after the scheduler ran and before the physics
 * step, which is the value {@code logTelemetry()} logs and {@code steerToAngle}
 * just acted on: seconds since the tap; the setpoint and the measured angle in
 * degrees; the error; the output {@code kP * error} clamped to +-1 (what the
 * lambda passed to {@code setThrottle}); and the volts the steering motor
 * applied that tick (read back from its sim state).
 *
 * <p>kP is {@code SteerConstants.kP}: re-run with measure.sh --replace to change
 * it. FIGURE_SECONDS (default 6) sets how long to record.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see tools/figures/README.md.
 */
public class Fig05SteerToAngle {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100; // 2 s holding 0
  private static final double TARGET = 90.0;

  @Test
  void recordOneTap() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    DriveModule module = new DriveModule();
    TalonFXSimState steerSim = (TalonFXSimState) field(module, "m_steerSim");

    long next = System.nanoTime();
    Scheduler.getDefault().schedule(module.steerToAngle(0));
    for (int i = 0; i < WARMUP_TICKS; i++) {
      next = tick(module, next, null);
    }

    int ticks = (int) Math.round(Double.parseDouble(System.getenv().getOrDefault("FIGURE_SECONDS", "6")) / 0.02);
    StringBuilder csv = new StringBuilder("t_s,setpoint_deg,angle_deg,error_deg,output,applied_v\n");
    Scheduler.getDefault().schedule(module.steerToAngle(TARGET));
    for (int i = 0; i < ticks; i++) {
      final double t = i * 0.02;
      next = tick(module, next, () -> {
        double angle = module.getSteerAngleDegrees();
        double error = TARGET - angle;
        double output = Math.max(-1.0, Math.min(1.0, SteerConstants.kP * error));
        csv.append(String.format("%.2f,%.1f,%.5f,%.5f,%.6f,%.5f%n",
            t, TARGET, angle, error, output, steerSim.getMotorVoltage()));
      });
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig05.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  /** One robot tick on a fixed schedule: scheduler, then (optionally) a reading, then the physics, then sleep. */
  private static long tick(DriveModule module, long next, Runnable read) throws InterruptedException {
    Scheduler.getDefault().run();
    if (read != null) {
      read.run();
    }
    module.simulatePeriodic();
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
