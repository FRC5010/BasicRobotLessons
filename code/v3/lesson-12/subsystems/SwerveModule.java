package first.robot.subsystems;

import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;
import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.SwerveModulePosition;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.SteerConstants;

/**
 * One swerve corner. No longer a mechanism — the Drivetrain owns four of these
 * and commands them. A single tick of control happens on demand in
 * setDesiredState(); there is no scheduler tick of its own.
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

  private final PositionVoltage m_steerRequest = new PositionVoltage(0);
  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

  // Physics models depend only on constants, so they still initialize inline.
  private final DCMotorSim m_driveModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(
              DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),
          DCMotor.getKrakenX60(1));
  private final DCMotorSim m_steerModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(
              DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),
          DCMotor.getKrakenX60(1));

  public SwerveModule(
      int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      Translation2d location) {
    this.location = location;
    m_driveMotor = new TalonFX(driveId, CANBus.systemcore(0));
    m_steerMotor = new TalonFX(steerId, CANBus.systemcore(0));
    m_steerEncoder = new CANcoder(cancoderId, CANBus.systemcore(0));
    m_driveSim = m_driveMotor.getSimState();
    m_steerSim = m_steerMotor.getSimState();
    m_steerEncoderSim = m_steerEncoder.getSimState();

    CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
    cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
    m_steerEncoder.getConfigurator().apply(cancoderConfig);

    // Steering: read angle from the CANcoder, wrap like a circle, hold a P gain.
    TalonFXConfiguration steerConfig = new TalonFXConfiguration();
    steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;
    steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;
    steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;
    steerConfig.Feedback.SensorToMechanismRatio = 1.0;
    steerConfig.ClosedLoopGeneral.ContinuousWrap = true;
    steerConfig.Slot0.kP = SteerConstants.kSteerKP;
    m_steerMotor.getConfigurator().apply(steerConfig);

    // Drive: firmware knows the gearbox and runs a kV model + kP trim.
    TalonFXConfiguration driveConfig = new TalonFXConfiguration();
    driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;
    driveConfig.Slot0.kV = DriveConstants.kDriveKV;
    driveConfig.Slot0.kP = DriveConstants.kDriveKP;
    m_driveMotor.getConfigurator().apply(driveConfig);
  }

  /** One tick of control: hand the firmware its targets. */
  public void setDesiredState(SwerveModuleVelocity state) {
    // Steering: firmware position control. state.angle is a Rotation2d — hand its
    // Angle measure straight to withPosition (Phoenix speaks Units too, so there's
    // no degrees-to-rotations conversion to write).
    m_steerMotor.setControl(m_steerRequest.withPosition(state.angle.getMeasure()));

    // Drive: cosine compensation (Lesson 9), then firmware velocity control.
    double error = state.angle.getDegrees() - getSteerAngleDegrees();
    double alignment = Math.cos(Math.toRadians(error));
    double wheelRps = state.velocity * alignment / DriveConstants.kWheelCircumferenceMeters;
    m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));
  }

  /** Zero the drive encoder — start measuring distance from *here*. */
  public void resetDrivePosition() {
    m_driveMotor.setPosition(0);
  }

  /** Current steering angle in degrees (the CANcoder's own reading — no gear math left here). */
  public double getSteerAngleDegrees() {
    return m_steerMotor.getPosition().getValue().in(Rotations) * 360.0;
  }

  /** How far this module's wheel has driven, in meters, since the last reset. */
  public double getDistanceMeters() {
    return m_driveMotor.getPosition().getValue().in(Rotations) * DriveConstants.kWheelCircumferenceMeters;
  }

  /** Current wheel speed in meters per second. */
  public double getDriveVelocityMetersPerSec() {
    return m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) * DriveConstants.kWheelCircumferenceMeters;
  }

  /** How far this wheel has rolled and where it's pointing — for odometry. */
  public SwerveModulePosition getPosition() {
    return new SwerveModulePosition(
        getDistanceMeters(), Rotation2d.fromDegrees(getSteerAngleDegrees()));
  }

  /** Advances the physics model by one tick. Only ever called in simulation. */
  public void simulatePeriodic() {
    // Drive motor: model reports wheel motion, convert back to rotor-side.
    m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_driveModel.setInputVoltage(m_driveSim.getMotorVoltage());
    m_driveModel.update(0.020);
    m_driveSim.setRawRotorPosition(
        m_driveModel.getAngularPosition() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);
    m_driveSim.setRotorVelocity(
        m_driveModel.getAngularVelocity() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);

    // Steer motor: same, through the 25:1 reduction.
    m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
    m_steerModel.update(0.020);
    m_steerSim.setRawRotorPosition(
        m_steerModel.getAngularPosition() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);
    m_steerSim.setRotorVelocity(
        m_steerModel.getAngularVelocity() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);

    // CANcoder: the closed loop now reads this continuously, so it needs its own
    // honest feed too — mechanism-side, no gear multiply, straight from the model.
    m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));
    m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));
  }
}
