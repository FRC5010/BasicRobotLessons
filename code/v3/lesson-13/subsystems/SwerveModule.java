package first.robot.subsystems;

import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.SwerveModulePosition;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.smartdashboard.SmartDashboard;

/**
 * One swerve corner. No hardware of its own anymore — it owns an IO (whichever
 * kind), the inputs that IO reports, its targets, and the cosine decision.
 */
public class SwerveModule {
  /** Position of this module relative to robot center, in meters. */
  public final Translation2d location;

  private final ModuleIO m_io;
  private final ModuleIO.ModuleIOInputs m_inputs = new ModuleIO.ModuleIOInputs();
  private final String m_logKey; // e.g. "Drivetrain/Module0"

  public SwerveModule(ModuleIO io, String logKey, Translation2d location) {
    m_io = io;
    m_logKey = logKey;
    this.location = location;
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  public void periodic() {
    m_io.updateInputs(m_inputs);
    SmartDashboard.putNumber(m_logKey + "/SteerAngleDegrees", m_inputs.steerAngleDegrees);
    SmartDashboard.putNumber(m_logKey + "/DrivePositionMeters", m_inputs.drivePositionMeters);
    SmartDashboard.putNumber(m_logKey + "/DriveVelocityMetersPerSec", m_inputs.driveVelocityMetersPerSec);
  }

  /** One tick of control: hand the IO its targets. Called by a command each tick. */
  public void setDesiredState(SwerveModuleVelocity state) {
    double targetDegrees = state.angle.getDegrees();
    m_io.setSteerAngleDegrees(targetDegrees);

    // Cosine compensation (Lesson 9) — a decision, so it stays in our code.
    double error = targetDegrees - m_inputs.steerAngleDegrees;
    double alignment = Math.cos(Math.toRadians(error));
    m_io.setDriveVelocityMetersPerSec(state.velocity * alignment);
  }

  public double getSteerAngleDegrees() { return m_inputs.steerAngleDegrees; }
  public double getDistanceMeters() { return m_inputs.drivePositionMeters; }
  public double getDriveVelocityMetersPerSec() { return m_inputs.driveVelocityMetersPerSec; }

  public SwerveModulePosition getPosition() {
    return new SwerveModulePosition(
        m_inputs.drivePositionMeters, Rotation2d.fromDegrees(m_inputs.steerAngleDegrees));
  }

  public void resetDrivePosition() {
    m_io.resetDrivePosition();
  }
}
