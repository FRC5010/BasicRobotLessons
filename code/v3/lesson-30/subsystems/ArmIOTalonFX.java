package first.robot.subsystems;

import static org.wpilib.units.Units.Amps;
import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.DegreesPerSecond;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.RotationsPerSecondPerSecond;
import static org.wpilib.units.Units.Volts;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.PowerConstants;

/** Real hardware behind the ArmIO contract: a profiled pivot and a dumb roller. */
public class ArmIOTalonFX implements ArmIO {
  // protected, not private: ArmIOSim extends this class and needs both motors.
  protected final TalonFX m_pivot;
  protected final TalonFX m_roller;
  private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

  public ArmIOTalonFX() {
    m_pivot = new TalonFX(ArmConstants.kPivotMotorPort, CANBus.systemcore(0));
    m_roller = new TalonFX(ArmConstants.kRollerMotorPort, CANBus.systemcore(0));

    TalonFXConfiguration config = new TalonFXConfiguration();
    // One "mechanism rotation" is now one full swing of the arm.
    config.Feedback.SensorToMechanismRatio = ArmConstants.kGearRatio;

    // The model first: hold, move, accelerate. Then the trim.
    config.Slot0.kG = ArmConstants.kArmKG;
    // Gravity's pull on the arm depends on where the arm is: full effort held
    // out horizontal, none at all balanced over the pivot.
    config.Slot0.GravityType = GravityTypeValue.Arm_Cosine;
    config.Slot0.kV = ArmConstants.kArmKV;
    config.Slot0.kA = ArmConstants.kArmKA;
    config.Slot0.kP = ArmConstants.kArmKP;

    config.MotionMagic.MotionMagicCruiseVelocity = ArmConstants.kMaxVelocity.in(RotationsPerSecond);
    config.MotionMagic.MotionMagicAcceleration =
        ArmConstants.kMaxAcceleration.in(RotationsPerSecondPerSecond);

    // The firmware's own end stops. It refuses output past these no matter
    // what the rest of the code asks for.
    config.SoftwareLimitSwitch.ForwardSoftLimitEnable = true;
    config.SoftwareLimitSwitch.ForwardSoftLimitThreshold = ArmConstants.kMaxAngle.in(Rotations);
    config.SoftwareLimitSwitch.ReverseSoftLimitEnable = true;
    config.SoftwareLimitSwitch.ReverseSoftLimitThreshold = ArmConstants.kMinAngle.in(Rotations);

    // The budget: this motor's slice of the battery, plus the shared winding cap.
    config.CurrentLimits.StatorCurrentLimitEnable = true;
    config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    config.CurrentLimits.SupplyCurrentLimitEnable = true;
    config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmPivotSupplyLimit.in(Amps);

    m_pivot.getConfigurator().apply(config);

    // The roller had been getting a bare default config since it was built —
    // it draws current too, and now it budgets like everything else.
    TalonFXConfiguration rollerConfig = new TalonFXConfiguration();
    rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
    rollerConfig.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;
    rollerConfig.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmRollerSupplyLimit.in(Amps);
    m_roller.getConfigurator().apply(rollerConfig);
  }

  @Override
  public void updateInputs(ArmIOInputs inputs) {
    inputs.angleDegrees = m_pivot.getPosition().getValue().in(Degrees);
    inputs.velocityDegPerSec = m_pivot.getVelocity().getValue().in(DegreesPerSecond);
    inputs.appliedVolts = m_pivot.getMotorVoltage().getValue().in(Volts);
    // Where the profile says we should be *right now* — not the final goal.
    inputs.setpointDegrees = Rotations.of(m_pivot.getClosedLoopReference().getValue()).in(Degrees);
    inputs.rollerVelocityRotPerSec = m_roller.getVelocity().getValue().in(RotationsPerSecond);
    inputs.pivotSupplyCurrentAmps = m_pivot.getSupplyCurrent().getValue().in(Amps);
    inputs.rollerSupplyCurrentAmps = m_roller.getSupplyCurrent().getValue().in(Amps);
  }

  @Override
  public void setGoalAngleDegrees(double angleDegrees) {
    m_pivot.setControl(m_request.withPosition(Degrees.of(angleDegrees)));
  }

  @Override
  public void setRollerOutput(double output) {
    m_roller.setThrottle(output);
  }
}
