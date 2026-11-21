package first.robot.figures;

import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.Volts;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import com.ctre.phoenix6.hardware.TalonFX;
import org.junit.jupiter.api.Test;

import org.wpilib.hardware.hal.HAL;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Constants.DriveConstants;
import first.robot.subsystems.SwerveModule;

/**
 * Data for Lesson 12's feedforward-step figure: one real SwerveModule, wheel pointing
 * straight ahead, asked for a step from rest to 2 m/s, on the Lesson 12 state.
 *
 * <p>RIG method: HAL initialized, DriverStationSim enabled, a fixed 20 ms schedule, two
 * seconds of warm-up asking for 0 m/s, then the step. Each tick calls setDesiredState
 * (what a command does), then simulatePeriodic (what Robot does). Run it once as
 * shipped and once per changed setting (measure.sh --replace on kDriveKV / kDriveKP).
 * One row per tick from the tick of the request: the request, the measured wheel speed
 * and the voltage the motor is applying.
 */
public class Fig12FeedforwardStep {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100;
  private static final int RECORD_TICKS = 100; // 2 s
  private static final double STEP_MPS = 2.0;

  @Test
  void recordStep() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    SwerveModule module = new SwerveModule(
        DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
        DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
        new Translation2d(0.3, 0.3));
    TalonFX drive = (TalonFX) field(module, "m_driveMotor");

    long next = System.nanoTime();
    for (int i = 0; i < WARMUP_TICKS; i++) {
      next = tick(module, 0.0, next);
    }

    StringBuilder csv = new StringBuilder("t_s,requested_mps,measured_mps,applied_v\n");
    for (int i = 0; i < RECORD_TICKS; i++) {
      next = tick(module, STEP_MPS, next);
      csv.append(String.format("%.2f,%.4f,%.6f,%.4f%n", i * 0.02, STEP_MPS,
          module.getDriveVelocityMetersPerSec(),
          drive.getMotorVoltage().getValue().in(Volts)));
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig12-ff.csv"));
    Files.writeString(out, csv);
    HAL.shutdown();
  }

  private static long tick(SwerveModule module, double mps, long next) throws InterruptedException {
    module.setDesiredState(new SwerveModuleVelocity(MetersPerSecond.of(mps), Rotation2d.fromDegrees(0)));
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
