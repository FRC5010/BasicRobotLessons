package frc.robot.subsystems;

import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import frc.robot.Constants;

/**
 * One swerve corner. No longer a subsystem — the Drivetrain owns four of these
 * and commands them. A single tick of control happens on demand in
 * setDesiredState(); there is no periodic().
 */
public class SwerveModule {
    /** Position of this module relative to robot center, in meters. */
    public final Translation2d location;

    private final TalonFX m_driveMotor;
    private final TalonFX m_steerMotor;
    private final CANcoder m_steerEncoder;
    private final TalonFXSimState m_driveSim;
    private final TalonFXSimState m_steerSim;

    // Physics models depend only on constants, so they initialize inline.
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

    public SwerveModule(
            int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
            Translation2d location) {
        this.location = location;
        m_driveMotor = new TalonFX(driveId);
        m_steerMotor = new TalonFX(steerId);
        m_steerEncoder = new CANcoder(cancoderId);
        m_driveSim = m_driveMotor.getSimState();
        m_steerSim = m_steerMotor.getSimState();

        // Same CANcoder priming as Lesson 5, now paid off for the real 25:1 ratio:
        // seed the motor's rotor-side counter, not the wheel-side reading.
        CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
        cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
        m_steerEncoder.getConfigurator().apply(cancoderConfig);
        m_steerMotor.setPosition(
                m_steerEncoder.getAbsolutePosition().getValueAsDouble() * Constants.SteerConstants.kSteerGearRatio);
    }

    /** One tick of control: steer toward 'angleDegrees', drive at 'speedFraction'. */
    public void setDesiredState(double angleDegrees, double speedFraction) {
        // Steering P control (same math as Lesson 5, with the wrap trick).
        double error = angleDegrees - getSteerAngleDegrees();
        while (error > 180) {
            error -= 360;
        }
        while (error < -180) {
            error += 360;
        }
        double steerOutput = MathUtil.clamp(Constants.SteerConstants.kP * error, -1.0, 1.0);
        m_steerMotor.set(steerOutput);

        // Drive: pass the commanded speed straight through.
        m_driveMotor.set(speedFraction);
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
