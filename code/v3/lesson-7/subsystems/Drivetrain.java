package first.robot.subsystems;

import java.util.function.DoubleSupplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants.DriveConstants;

public class Drivetrain extends Mechanism {
  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
  private final SwerveModule[] m_modules = new SwerveModule[] {
      new SwerveModule(DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
          DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
          DriveConstants.kFrontLeft),
      new SwerveModule(DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
          DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,
          DriveConstants.kFrontRight),
      new SwerveModule(DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
          DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,
          DriveConstants.kBackLeft),
      new SwerveModule(DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
          DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,
          DriveConstants.kBackRight)
  };

  // A structured topic: publishes a whole SwerveModuleVelocity[] at once, so
  // AdvantageScope's Swerve tab can draw it, not just plot four numbers.
  private final StructArrayPublisher<SwerveModuleVelocity> m_moduleStatesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("Drivetrain/ModuleStates", SwerveModuleVelocity.struct)
          .publish();

  public Drivetrain() {
    Scheduler.getDefault().addPeriodic(this::logTelemetry);
  }

  /** Drive the whole chassis at fractional velocity (vx, vy). */
  public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
    return runRepeatedly(() -> {
      double vx = vxSupplier.getAsDouble();
      double vy = vySupplier.getAsDouble();
      double speed = Math.hypot(vx, vy);                        // vector length
      double angleDeg = Math.toDegrees(Math.atan2(vy, vx));     // vector angle
      for (SwerveModule module : m_modules) {
        module.setDesiredState(angleDeg, speed);
      }
    }).named("Translate");
  }

  /** Spin in place at fractional angular rate 'omega' (positive = CCW). */
  public Command rotate(double omega) {
    return runRepeatedly(() -> {
      for (SwerveModule module : m_modules) {
        double x = module.location.getX();
        double y = module.location.getY();
        double angleDeg = Math.toDegrees(Math.atan2(x, -y));
        module.setDesiredState(angleDeg, omega);
      }
    }).named("Rotate");
  }

  private void logTelemetry() {
    // Always-on watching; the acting lives in translate()/rotate() above.
    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      SmartDashboard.putNumber("Drivetrain/Module" + index + "/SteerAngleDegrees",
          module.getSteerAngleDegrees());
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    m_moduleStatesPublisher.set(states);
  }

  /** Advances every module's physics model. Only ever called in simulation. */
  public void simulatePeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulatePeriodic();
    }
  }
}
