package first.robot.figures;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import com.ctre.phoenix6.sim.TalonFXSimState;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.SteerConstants;
import first.robot.subsystems.SwerveModule;

/**
 * Data for Lesson 7's geared-steering figure: one {@code SwerveModule} (the
 * front-left corner, real 25:1 steering reduction, J = 0.004 on the wheel side)
 * told to steer from 0 to 90 degrees, on the Lesson 7 state.
 *
 * <p>Runs the real {@code SwerveModule} with the robot enabled, on a fixed 20 ms
 * schedule, the way {@code Drivetrain} drives it: each tick it asks the module
 * for {@code setDesiredState(90, 0)}, then steps the physics with
 * {@code simulatePeriodic()}. The module holds 0 for two seconds first. One row
 * per tick, read before the physics step: seconds since the request; the setpoint
 * and measured angle in degrees; the error; {@code kP * error} clamped to +-1;
 * and the volts the steering motor applied that tick.
 *
 * <p>kP is {@code SteerConstants.kP}: re-run with measure.sh --replace to change
 * it. FIGURE_SECONDS (default 12) sets how long to record.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see tools/figures/README.md.
 */
public class Fig07SteerGeared {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100; // 2 s holding 0
  private static final double TARGET = 90.0;

  @Test
  void recordOneTurn() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    SwerveModule module = new SwerveModule(
        DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
        DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
        DriveConstants.kFrontLeft);
    TalonFXSimState steerSim = (TalonFXSimState) field(module, "m_steerSim");

    long next = System.nanoTime();
    for (int i = 0; i < WARMUP_TICKS; i++) {
      module.setDesiredState(0.0, 0.0);
      module.simulatePeriodic();
      next = sleepUntilNext(next);
    }

    int ticks = (int) Math.round(Double.parseDouble(System.getenv().getOrDefault("FIGURE_SECONDS", "12")) / 0.02);
    StringBuilder csv = new StringBuilder("t_s,setpoint_deg,angle_deg,error_deg,output,applied_v\n");
    for (int i = 0; i < ticks; i++) {
      double angle = module.getSteerAngleDegrees();
      double error = TARGET - angle;
      double output = Math.max(-1.0, Math.min(1.0, SteerConstants.kP * error));
      module.setDesiredState(TARGET, 0.0);
      csv.append(String.format("%.2f,%.1f,%.5f,%.5f,%.6f,%.5f%n",
          i * 0.02, TARGET, angle, error, output, steerSim.getMotorVoltage()));
      module.simulatePeriodic();
      next = sleepUntilNext(next);
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig07.csv"));
    Files.writeString(out, csv);
    HAL.shutdown();
  }

  private static long sleepUntilNext(long next) throws InterruptedException {
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
