package first.robot.subsystems;

import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.TalonFX;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants;

public class DriveModule extends Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, CANBus.systemcore(0)); // CAN ID 1 — change to yours

  public DriveModule() {
    Scheduler.getDefault().addPeriodic(this::logTelemetry);
  }

  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    return run(coroutine -> {
      m_driveMotor.setThrottle(fraction);
      coroutine.park();
    })
        .whenCanceled(() -> m_driveMotor.setThrottle(0))
        .named("Drive At Speed");
  }

  /** Drives continuously using a live speed source (e.g. a joystick axis). */
  public Command driveWithJoystick(DoubleSupplier speedSupplier) {
    return runRepeatedly(() -> {
      double raw = speedSupplier.getAsDouble();   // fetch fresh value this tick
      double speed = applyDeadband(raw, 0.1);     // clean it up
      m_driveMotor.setThrottle(speed);
      // Try It #1: log the commanded speed too.
      SmartDashboard.putNumber("DriveModule/CommandedOutput", speed);
    }).named("Drive With Joystick");
  }

  /** Drives continuously at a fraction of the live speed source, for fine control. */
  public Command driveWithJoystick(DoubleSupplier speedSupplier, double scale) {
    return runRepeatedly(() -> {
      double raw = speedSupplier.getAsDouble();
      double speed = applyDeadband(raw, 0.1) * scale;
      m_driveMotor.setThrottle(speed);
      SmartDashboard.putNumber("DriveModule/CommandedOutput", speed);
    }).named("Drive With Joystick (Slow Mode)");
  }

  /** Returns 0 when |value| is within 'band', otherwise passes the value through. */
  private double applyDeadband(double value, double band) {
    if (Math.abs(value) < band) {
      return 0.0;
    }
    return value;
  }

  // Try It #2: expose position as a reading, alongside the command factories.
  /** Returns the drive motor's position, in rotations since boot. */
  public double getPositionRotations() {
    return m_driveMotor.getPosition().getValue().in(Rotations);
  }

  private void logTelemetry() {
    double rotations = m_driveMotor.getPosition().getValue().in(Rotations);
    double rps = m_driveMotor.getVelocity().getValue().in(RotationsPerSecond);

    SmartDashboard.putNumber("DriveModule/PositionRotations", rotations);
    SmartDashboard.putNumber("DriveModule/VelocityRotPerSec", rps);
  }
}
