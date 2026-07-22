package frc.robot.subsystems;

import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;
import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

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
 * One swerve corner. Control now runs on the TalonFX itself: firmware position
 * control for steering (reading a CANcoder, not its own rotor, so the angle is
 * right the instant the robot boots), firmware velocity control (with a kV
 * model) for drive. setDesiredState just states the targets.
 */
public class SwerveModule {
    /** Position of this module relative to robot center, in meters. */
    public final Translation2d location;

    private final TalonFX m_driveMotor;
    private final TalonFX m_steerMotor;
    private final CANcoder m_steerEncoder;
    private final TalonFXSimState m_driveSim;
    private final TalonFXSimState m_steerSim;
    private final CANcoderSimState m_steerEncoderSim;

    // Reused every tick — created once as fields, as Phoenix asks.
    private final PositionVoltage m_steerRequest = new PositionVoltage(0);
    private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

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
        m_steerEncoderSim = m_steerEncoder.getSimState();

        // The CANcoder's raw zero is wherever its magnet sits — MagnetOffset
        // shifts that to "wheel pointing forward."
        CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
        cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
        m_steerEncoder.getConfigurator().apply(cancoderConfig);

        // Steering: read angle from the CANcoder, wrap like a circle, hold a P gain.
        TalonFXConfiguration steerConfig = new TalonFXConfiguration();
        steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;
        steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;
        steerConfig.Feedback.RotorToSensorRatio = Constants.SteerConstants.kSteerGearRatio;
        steerConfig.Feedback.SensorToMechanismRatio = 1.0;
        steerConfig.ClosedLoopGeneral.ContinuousWrap = true;
        steerConfig.Slot0.kP = Constants.SteerConstants.kSteerKP;
        m_steerMotor.getConfigurator().apply(steerConfig);

        // Drive: firmware knows the gearbox and runs a kV model + kP trim.
        TalonFXConfiguration driveConfig = new TalonFXConfiguration();
        driveConfig.Feedback.SensorToMechanismRatio = Constants.DriveConstants.kDriveGearRatio;
        driveConfig.Slot0.kV = Constants.DriveConstants.kDriveKV;
        driveConfig.Slot0.kP = Constants.DriveConstants.kDriveKP;
        m_driveMotor.getConfigurator().apply(driveConfig);
    }

    /** One tick of control: hand the firmware its targets. */
    public void setDesiredState(SwerveModuleState state) {
        // Steering: firmware position control. state.angle is a Rotation2d — hand
        // its Angle measure straight to withPosition (Phoenix speaks Units too).
        m_steerMotor.setControl(m_steerRequest.withPosition(state.angle.getMeasure()));

        // Drive: cosine compensation (Lesson 9), then firmware velocity control.
        double error = state.angle.getDegrees() - getSteerAngleDegrees();
        double alignment = Math.cos(Math.toRadians(error));
        double wheelRps = state.speedMetersPerSecond * alignment / Constants.DriveConstants.kWheelCircumferenceMeters;
        m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));
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

    /** Current steering angle in degrees (the CANcoder, via RemoteCANcoder feedback). */
    public double getSteerAngleDegrees() {
        return m_steerMotor.getPosition().getValueAsDouble() * 360.0; // mechanism rotations → degrees
    }

    /** How far this module's wheel has driven, in meters, since the last reset. */
    public double getDistanceMeters() {
        return m_driveMotor.getPosition().getValueAsDouble() * Constants.DriveConstants.kWheelCircumferenceMeters;
    }

    /** Current wheel speed in meters per second. */
    public double getDriveVelocityMetersPerSec() {
        return m_driveMotor.getVelocity().getValueAsDouble() * Constants.DriveConstants.kWheelCircumferenceMeters;
    }

    /** Steps the drive and steer physics one tick. Called by the Drivetrain in sim. */
    public void simulationPeriodic() {
        // The sim state is always rotor-side (upstream of any ratio math),
        // so we still multiply the model's mechanism motion back to the rotor.
        m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_driveModel.setInputVoltage(m_driveSim.getMotorVoltage());
        m_driveModel.update(0.020);
        m_driveSim.setRawRotorPosition(
                m_driveModel.getAngularPositionRotations() * Constants.DriveConstants.kDriveGearRatio);
        m_driveSim.setRotorVelocity(
                m_driveModel.getAngularVelocityRPM() * Constants.DriveConstants.kDriveGearRatio / 60.0);

        m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
        m_steerModel.update(0.020);
        m_steerSim.setRawRotorPosition(
                m_steerModel.getAngularPositionRotations() * Constants.SteerConstants.kSteerGearRatio);
        m_steerSim.setRotorVelocity(
                m_steerModel.getAngularVelocityRPM() * Constants.SteerConstants.kSteerGearRatio / 60.0);

        // The steer closed loop reads the CANcoder now, not the rotor — keep its
        // sim state honest too. No gear multiply: it sits 1:1 on the wheel.
        m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPositionRotations());
        m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocityRPM() / 60.0);
    }
}
