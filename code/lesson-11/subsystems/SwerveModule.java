package frc.robot.subsystems;

import static edu.wpi.first.units.Units.MetersPerSecond;

import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import frc.robot.Constants;

/**
 * One swerve corner. The Drivetrain owns four and commands them via
 * setDesiredState, which takes a full SwerveModuleState.
 */
public class SwerveModule {
    /** Position of this module relative to robot center, in meters. */
    public final Translation2d location;

    private final TalonFX m_driveMotor;
    private final TalonFX m_steerMotor;
    private final TalonFXSimState m_driveSim;
    private final TalonFXSimState m_steerSim;

    private final DCMotorSim m_driveModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(
                            DCMotor.getKrakenX60(1), 0.025, Constants.DriveConstants.kDriveGearRatio),
                    DCMotor.getKrakenX60(1));
    private final DCMotorSim m_steerModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(
                            DCMotor.getKrakenX60(1), 0.004, Constants.SteerConstants.kSteerGearRatio),
                    DCMotor.getKrakenX60(1));

    public SwerveModule(int driveId, int steerId, Translation2d location) {
        this.location = location;
        m_driveMotor = new TalonFX(driveId);
        m_steerMotor = new TalonFX(steerId);
        m_driveSim = m_driveMotor.getSimState();
        m_steerSim = m_steerMotor.getSimState();
    }

    /** One tick of control: chase the given state. */
    public void setDesiredState(SwerveModuleState state) {
        // Steering: the same P control, error wrapped to ±180° in one call.
        double error = MathUtil.inputModulus(
                state.angle.getDegrees() - getSteerAngleDegrees(), -180, 180);
        m_steerMotor.set(MathUtil.clamp(Constants.SteerConstants.kP * error, -1.0, 1.0));

        // Drive: meters per second → fraction of max, with the cosine scale.
        double alignment = Math.cos(Math.toRadians(error));
        double fraction = state.speedMetersPerSecond / Constants.DriveConstants.kMaxSpeed.in(MetersPerSecond);
        m_driveMotor.set(fraction * alignment);
    }

    /** Zero the drive encoder — start measuring distance from *here*. */
    public void resetDrivePosition() {
        m_driveMotor.setPosition(0);
    }

    /** How far this wheel has rolled and where it's pointing — for odometry. */
    public SwerveModulePosition getPosition() {
        return new SwerveModulePosition(
                getDistanceMeters(),
                Rotation2d.fromDegrees(getSteerAngleDegrees()));
    }

    /** Current steering angle in degrees (through the real 25:1 reduction). */
    public double getSteerAngleDegrees() {
        double steerRotations =
                m_steerMotor.getPosition().getValueAsDouble() / Constants.SteerConstants.kSteerGearRatio;
        return steerRotations * 360.0;
    }

    /** How far this module's wheel has driven, in meters, since the last reset. */
    public double getDistanceMeters() {
        double wheelRotations =
                m_driveMotor.getPosition().getValueAsDouble() / Constants.DriveConstants.kDriveGearRatio;
        return wheelRotations * Constants.DriveConstants.kWheelCircumferenceMeters;
    }

    /** Current wheel speed in meters per second. */
    public double getDriveVelocityMetersPerSec() {
        double wheelRps =
                m_driveMotor.getVelocity().getValueAsDouble() / Constants.DriveConstants.kDriveGearRatio;
        return wheelRps * Constants.DriveConstants.kWheelCircumferenceMeters;
    }

    /** Steps the drive and steer physics one tick. Called by the Drivetrain in sim. */
    public void simulationPeriodic() {
        // Drive motor: model reports wheel motion, convert back to rotor-side.
        m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_driveModel.setInputVoltage(m_driveSim.getMotorVoltage());
        m_driveModel.update(0.020);
        m_driveSim.setRawRotorPosition(
                m_driveModel.getAngularPositionRotations() * Constants.DriveConstants.kDriveGearRatio);
        m_driveSim.setRotorVelocity(
                m_driveModel.getAngularVelocityRPM() * Constants.DriveConstants.kDriveGearRatio / 60.0);

        // Steer motor: same, through the 25:1 reduction.
        m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
        m_steerModel.update(0.020);
        m_steerSim.setRawRotorPosition(
                m_steerModel.getAngularPositionRotations() * Constants.SteerConstants.kSteerGearRatio);
        m_steerSim.setRotorVelocity(
                m_steerModel.getAngularVelocityRPM() * Constants.SteerConstants.kSteerGearRatio / 60.0);
    }
}
