package first.robot.subsystems;

import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.geometry.Translation2d;
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

    // Same CANcoder priming as Lesson 5, now paid off for the real 25:1 ratio:
    // seed the motor's rotor-side counter, not the wheel-side reading.
    CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
    cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
    m_steerEncoder.getConfigurator().apply(cancoderConfig);
    m_steerMotor.setPosition(
        m_steerEncoder.getAbsolutePosition().getValue().in(Rotations) * SteerConstants.kSteerGearRatio);
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
    double steerOutput = clamp(SteerConstants.kP * error, -1.0, 1.0);
    m_steerMotor.setThrottle(steerOutput);

    // Drive only as much as the wheel is pointed the right way:
    // cos(0°) = 1 → full speed; cos(90°) = 0 → don't drive while sideways.
    double alignment = Math.cos(Math.toRadians(error));
    m_driveMotor.setThrottle(speedFraction * alignment);
  }

  /** Zero the drive encoder — start measuring distance from *here*. */
  public void resetDrivePosition() {
    m_driveMotor.setPosition(0);
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

  /** Current steering angle in degrees (through the real 25:1 reduction). */
  public double getSteerAngleDegrees() {
    double steerRotations =
        m_steerMotor.getPosition().getValue().in(Rotations) / SteerConstants.kSteerGearRatio;
    return steerRotations * 360.0;
  }

  /** How far this module's wheel has driven, in meters, since the last reset. */
  public double getDistanceMeters() {
    double rotorRotations = m_driveMotor.getPosition().getValue().in(Rotations);
    double wheelRotations = rotorRotations / DriveConstants.kDriveGearRatio;
    return wheelRotations * DriveConstants.kWheelCircumferenceMeters;
  }

  /** Current wheel speed in meters per second. */
  public double getDriveVelocityMetersPerSec() {
    double wheelRps =
        m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) / DriveConstants.kDriveGearRatio;
    return wheelRps * DriveConstants.kWheelCircumferenceMeters;
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
  }
}
