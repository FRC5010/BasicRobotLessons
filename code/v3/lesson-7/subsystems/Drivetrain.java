package first.robot.subsystems;

import java.util.function.DoubleSupplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.DriveConstants;

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
   * Add the Pigeon 2 gyro here — heading is a fact about the whole chassis, so it
   * belongs on the drivetrain, not on a module. Add two plain, non-final doubles for
   * the sim to remember from tick to tick: the rotation rate just commanded, and the
   * running fake heading.
   */

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

      /**
       * ====== NEXT LESSON: ADD CODE HERE ======
       * Pure translation commands no rotation: record a commanded rotation rate of 0,
       * so the sim isn't left spinning on a stale value.
       */

      for (SwerveModule module : m_modules) {
        module.setDesiredState(angleDeg, speed);
      }
    }).named("Translate");
  }

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Move this loop into a private helper, commandRotation, that also records the
   * rotation rate it was asked for — the sim needs it — and make rotate a one-liner
   * that calls the helper every tick.
   */

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

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add turnToHeading: the same P control you used for steering, pointed at the whole
   * robot. While the heading error is 2° or more, rotate at the heading gain times the
   * error, clamped to half power; then stop, and stop if canceled too. Give it a
   * question-method that returns the error wrapped into ±180°, so it always turns the
   * short way, a clamp helper, and a getter for the gyro's heading in degrees, CCW
   * positive.
   */

  private void logTelemetry() {
    // Always-on watching; the acting lives in translate()/rotate() above.
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

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Log the heading too — once as a number, and once as a Rotation2d so
     * AdvantageScope can draw it.
     */
  }

  /** Advances every module's physics model. Only ever called in simulation. */
  public void simulatePeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulatePeriodic();
    }

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Fake the gyro: every tick, add the commanded rotation rate times the tick's
     * length to a running heading — treating full power as 360° per second — and push
     * that heading into the gyro's sim state.
     */
  }
}
