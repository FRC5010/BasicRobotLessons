package first.robot.figures;

import static org.wpilib.units.Units.RotationsPerSecond;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import com.ctre.phoenix6.hardware.TalonFX;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.DriveModule;

/**
 * Data for Lesson 4's "velocity response, two inertias" figure, on the Lesson 4 state.
 *
 * <p>The real {@code DriveModule} (its TalonFX and its {@code DCMotorSim}) through the
 * scheduler, enabled, on a fixed 20 ms schedule. {@code driveAtSpeed(0.3)} is
 * scheduled after 10 idle ticks and cancelled HOLD_TICKS later (env, default 50 = 1 s);
 * the run lasts TOTAL_TICKS (env, default 150). Each tick runs the scheduler, then the
 * lesson's {@code simulatePeriodic()}, then reads the velocity the way the lesson's
 * logTelemetry does ({@code getVelocity().getValue()}) and the model's own velocity.
 * The inertia is changed with measure.sh --replace (0.001 -> 0.05).
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see 04-velocity-two-inertias.py.
 */
public class Fig04VelocityTwoInertias {
  private static final long PERIOD_NANOS = 20_000_000L;

  @Test
  void record() throws Exception {
    int hold = Integer.parseInt(System.getenv().getOrDefault("HOLD_TICKS", "50"));
    int total = Integer.parseInt(System.getenv().getOrDefault("TOTAL_TICKS", "150"));
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    DriveModule module = new DriveModule();
    TalonFX motor = (TalonFX) field(module, "m_driveMotor");
    DCMotorSim model = (DCMotorSim) field(module, "m_driveModel");

    StringBuilder csv = new StringBuilder("t_s,velocity_rps,model_rps,position_rot,applied_v\n");
    long next = System.nanoTime();
    int start = 10;
    var command = module.driveAtSpeed(0.3);
    for (int i = 0; i < start + total; i++) {
      if (i == start) {
        Scheduler.getDefault().schedule(command);
      }
      if (i == start + hold) {
        Scheduler.getDefault().cancel(command);
      }
      Scheduler.getDefault().run();
      module.simulatePeriodic();
      next += PERIOD_NANOS;
      long wait = next - System.nanoTime();
      if (wait > 0) {
        Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
      }
      if (i >= start) {
        csv.append(String.format("%.2f,%.5f,%.5f,%.5f,%.4f%n", (i - start + 1) * 0.02,
            motor.getVelocity().getValue().in(RotationsPerSecond),
            model.getAngularVelocity() / (2 * Math.PI),
            model.getAngularPosition() / (2 * Math.PI),
            motor.getSimState().getMotorVoltage()));
      }
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig04.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  private static Object field(Object target, String name) throws Exception {
    Field f = target.getClass().getDeclaredField(name);
    f.setAccessible(true);
    return f.get(target);
  }
}
