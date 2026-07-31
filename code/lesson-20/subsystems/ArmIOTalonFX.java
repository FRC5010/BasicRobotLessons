package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.DegreesPerSecond;
import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecondPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import frc.robot.Constants.ArmConstants;

/** Real hardware behind the ArmIO contract: a profiled pivot and a dumb roller. */
public class ArmIOTalonFX implements ArmIO {
    // protected, not private: ArmIOSim extends this class and needs both motors.
    protected final TalonFX m_pivot;
    protected final TalonFX m_roller;
    private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

    public ArmIOTalonFX(int pivotId, int rollerId) {
        m_pivot = new TalonFX(pivotId);
        m_roller = new TalonFX(rollerId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        // One "mechanism rotation" is now one full swing of the arm.
        config.Feedback.SensorToMechanismRatio = ArmConstants.kGearRatio;

        config.Slot0.kP = ArmConstants.kArmKP;
        config.Slot0.kG = ArmConstants.kArmKG;
        // Gravity's pull on the arm depends on where the arm is: full effort
        // held out horizontal, none at all balanced over the pivot.
        config.Slot0.GravityType = GravityTypeValue.Arm_Cosine;

        config.MotionMagic.MotionMagicCruiseVelocity =
                ArmConstants.kMaxVelocity.in(RotationsPerSecond);
        config.MotionMagic.MotionMagicAcceleration =
                ArmConstants.kMaxAcceleration.in(RotationsPerSecondPerSecond);

        // The firmware's own end stops. It refuses output past these no matter
        // what the rest of the code asks for.
        config.SoftwareLimitSwitch.ForwardSoftLimitEnable = true;
        config.SoftwareLimitSwitch.ForwardSoftLimitThreshold =
                ArmConstants.kMaxAngle.in(Rotations);
        config.SoftwareLimitSwitch.ReverseSoftLimitEnable = true;
        config.SoftwareLimitSwitch.ReverseSoftLimitThreshold =
                ArmConstants.kMinAngle.in(Rotations);

        m_pivot.getConfigurator().apply(config);
        m_roller.getConfigurator().apply(new TalonFXConfiguration());
    }

    @Override
    public void updateInputs(ArmIOInputs inputs) {
        inputs.angleDegrees = m_pivot.getPosition().getValue().in(Degrees);
        inputs.velocityDegPerSec = m_pivot.getVelocity().getValue().in(DegreesPerSecond);
        inputs.appliedVolts = m_pivot.getMotorVoltage().getValueAsDouble();
        inputs.rollerVelocityRotPerSec = m_roller.getVelocity().getValueAsDouble();
    }

    @Override
    public void setGoalAngleDegrees(double angleDegrees) {
        m_pivot.setControl(m_request.withPosition(Degrees.of(angleDegrees)));
    }

    @Override
    public void setRollerOutput(double output) {
        m_roller.set(output);
    }
}
