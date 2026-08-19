package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.MetersPerSecondPerSecond;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.Volts;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import first.robot.Constants.ElevatorConstants;

/** Real hardware: Motion Magic profiles the move, Slot0's full feedforward set holds it. */
public class ElevatorIOTalonFX implements ElevatorIO {
  protected final TalonFX m_motor;
  private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

  public ElevatorIOTalonFX() {
    m_motor = new TalonFX(ElevatorConstants.kMotorPort, CANBus.systemcore(0));

    TalonFXConfiguration config = new TalonFXConfiguration();
    config.Feedback.SensorToMechanismRatio = ElevatorConstants.kGearRatio;

    // Full feedforward set — kP is the trim, not the whole story.
    config.Slot0.kG = ElevatorConstants.kElevatorKG;
    config.Slot0.GravityType = GravityTypeValue.Elevator_Static;
    config.Slot0.kV = ElevatorConstants.kElevatorKV;
    config.Slot0.kA = ElevatorConstants.kElevatorKA;
    config.Slot0.kP = ElevatorConstants.kElevatorKP;

    config.MotionMagic.MotionMagicCruiseVelocity =
        metersToRotations(ElevatorConstants.kMaxVelocity.in(MetersPerSecond));
    config.MotionMagic.MotionMagicAcceleration =
        metersToRotations(ElevatorConstants.kMaxAcceleration.in(MetersPerSecondPerSecond));

    m_motor.getConfigurator().apply(config);
  }

  @Override
  public void updateInputs(ElevatorIOInputs inputs) {
    inputs.heightMeters = rotationsToMeters(m_motor.getPosition().getValue().in(Rotations));
    inputs.velocityMetersPerSec =
        rotationsToMeters(m_motor.getVelocity().getValue().in(RotationsPerSecond));
    inputs.appliedVolts = m_motor.getMotorVoltage().getValue().in(Volts);
    inputs.setpointMeters = rotationsToMeters(m_motor.getClosedLoopReference().getValue());
  }

  @Override
  public void setGoalHeightMeters(double meters) {
    // Phoenix speaks Units — hand it the position as a measure.
    m_motor.setControl(m_request.withPosition(Rotations.of(metersToRotations(meters))));
  }

  /** Drum rotations for a given carriage height — the drum's circumference does the conversion. */
  protected static double metersToRotations(double meters) {
    return meters / (2 * Math.PI * ElevatorConstants.kDrumRadius.in(Meters));
  }

  protected static double rotationsToMeters(double rotations) {
    return rotations * 2 * Math.PI * ElevatorConstants.kDrumRadius.in(Meters);
  }
}
