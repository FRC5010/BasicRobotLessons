package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.Pigeon2;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.bus.CANPort;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.HeadingConstants;

public class Drivetrain implements Mechanism {
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

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Build a SwerveDriveKinematics from the four modules' locations, in the same corner
   * order as the array. It does the math that turns one motion of the whole chassis
   * into four wheel states.
   */

  private final Pigeon2 m_gyro = new Pigeon2(0, new CANBus(CANPort.CAN_S0)); // CAN ID 0 — change to yours

  // Remembered for the sim: what rotation rate did we just command?
  private double m_lastCommandedOmega = 0.0;
  private double m_simHeadingDegrees = 0.0;

  public Drivetrain() {
    Scheduler.getDefault().addPeriodic(this::logTelemetry);
  }

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Kinematics replaces both translate and rotate. Put the four steps every way of
   * driving shares into one private helper: convert a chassis velocity into module
   * states, desaturate them so no wheel is asked past max speed, optimize each against
   * its current angle, and command it — recording the rotation rate for the sim and
   * logging the desired states. Then add drive, which calls the helper every tick from
   * three Units suppliers, and driveFieldRelative, which first rotates field-relative
   * speeds into the robot's frame using the gyro heading.
   */

  /** Drive the whole chassis at fractional velocity (vx, vy). */
  public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
    return runRepeatedly(() -> {
      double vx = vxSupplier.getAsDouble();
      double vy = vySupplier.getAsDouble();
      double speed = Math.hypot(vx, vy);                        // vector length
      double angleDeg = Math.toDegrees(Math.atan2(vy, vx));     // vector angle
      m_lastCommandedOmega = 0.0;                                // pure translation: no rotation
      for (SwerveModule module : m_modules) {
        module.setDesiredState(angleDeg, speed);
      }
    }).named("Translate");
  }

  /** Spin in place at fractional angular rate 'omega' (positive = CCW). */
  public Command rotate(double omega) {
    return runRepeatedly(() -> commandRotation(omega)).named("Rotate");
  }

  /** Turn to face 'targetDegrees'. Finishes when within 2°. */
  public Command turnToHeading(double targetDegrees) {
    return run(coroutine -> {
          while (Math.abs(headingError(targetDegrees)) >= 2.0) {
            double omega = clamp(
                HeadingConstants.kP * headingError(targetDegrees),
                -0.5, 0.5); // clamp to ±50% turn power
            commandRotation(omega);
            coroutine.yield();
          }
          commandRotation(0.0); // reached it — stop
        })
        .whenCanceled(() -> commandRotation(0.0)) // interrupted — stop
        .named("Turn To Heading");
  }

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * setDesiredState now takes a module state instead of two numbers: drive with a state
   * at 40% of max speed pointed at 0°, and stop with an empty, zero-speed state.
   */

  /** Drive straight forward 'meters' at 40% power. Finishes on its own. */
  public Command driveDistance(double meters) {
    return run(coroutine -> {
          m_modules[0].resetDrivePosition(); // zero one wheel's odometer
          while (Math.abs(m_modules[0].getDistanceMeters()) < Math.abs(meters)) {
            for (SwerveModule module : m_modules) {
              module.setDesiredState(0.0, 0.4); // point forward, 40% throttle
            }
            m_lastCommandedOmega = 0.0;
            coroutine.yield();
          }
          for (SwerveModule module : m_modules) {
            module.setDesiredState(0.0, 0.0); // reached it — stop
          }
        })
        .whenCanceled(() -> {
          for (SwerveModule module : m_modules) {
            module.setDesiredState(0.0, 0.0); // interrupted — stop
          }
        })
        .named("Drive Distance");
  }

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Rebuild this on the new helper: turn the rotation rate, in revolutions per second,
   * into a chassis velocity with no translation, and let the helper do the rest.
   */

  /** One tick of pure rotation: steer every wheel tangent to the circle. */
  private void commandRotation(double omega) {
    m_lastCommandedOmega = omega;
    for (SwerveModule module : m_modules) {
      double x = module.location.getX();
      double y = module.location.getY();
      double angleDeg = Math.toDegrees(Math.atan2(x, -y));
      module.setDesiredState(angleDeg, omega);
    }
  }

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Replace the two wrap loops with MathUtil.inputModulus, which wraps the error into
   * ±180° in one call.
   */

  /** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
  private double headingError(double targetDegrees) {
    double error = targetDegrees - getHeadingDegrees();
    while (error > 180) {
      error -= 360;
    }
    while (error < -180) {
      error += 360;
    }
    return error;
  }

  /** Keeps 'value' between 'min' and 'max'. */
  private double clamp(double value, double min, double max) {
    if (value > max) {
      return max;
    } else if (value < min) {
      return min;
    } else {
      return value;
    }
  }

  /** Robot heading in degrees (CCW positive). */
  public double getHeadingDegrees() {
    return m_gyro.getYaw().getValue().in(Degrees);
  }

  private void logTelemetry() {
    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      Telemetry.log("Drivetrain/Module" + index + "/SteerAngleDegrees",
          module.getSteerAngleDegrees());
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    Telemetry.log("Drivetrain/ModuleStates", states, SwerveModuleVelocity.struct);

    Telemetry.log("Drivetrain/HeadingDegrees", getHeadingDegrees());
    Telemetry.log("Drivetrain/Heading", Rotation2d.fromDegrees(getHeadingDegrees()), Rotation2d.struct);
  }

  /** Advances every module's physics model, then the fake gyro. Only ever called in simulation. */
  public void simulatePeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulatePeriodic();
    }

    // Integrate the commanded angular rate into a fake heading. Treat 'omega'
    // as a fraction of "360°/sec" — max power spins us 360°/s.
    m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020; // one 20 ms tick
    m_gyro.getSimState().setRawYaw(m_simHeadingDegrees);
  }
}
