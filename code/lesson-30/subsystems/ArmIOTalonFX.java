package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Amps;
import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.DegreesPerSecond;
import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecondPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import edu.wpi.first.wpilibj.DigitalInput;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.PowerConstants;

/** Real hardware behind the ArmIO contract: a profiled pivot and a dumb roller. */
public class ArmIOTalonFX implements ArmIO {
    // protected, not private: ArmIOSim extends this class and needs both motors.
    protected final TalonFX m_pivot;
    protected final TalonFX m_roller;
    private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);
    private final DigitalInput m_beamBreak =
            new DigitalInput(ArmConstants.kBeamBreakChannel);

    public ArmIOTalonFX(int pivotId, int rollerId) {
        m_pivot = new TalonFX(pivotId);
        m_roller = new TalonFX(rollerId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        // One "mechanism rotation" is now one full swing of the arm.
        config.Feedback.SensorToMechanismRatio = ArmConstants.kGearRatio;

        // The model first: hold, move, accelerate. Then the trim.
        config.Slot0.kG = ArmConstants.kArmKG;
        // Gravity's pull on the arm depends on where the arm is: full effort
        // held out horizontal, none at all balanced over the pivot.
        config.Slot0.GravityType = GravityTypeValue.Arm_Cosine;
        config.Slot0.kV = ArmConstants.kArmKV;
        config.Slot0.kA = ArmConstants.kArmKA;
        config.Slot0.kP = ArmConstants.kArmKP;

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

        // Two different questions, so two different limits: what the battery is
        // asked for, and what the windings are allowed to take.
        config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmPivotSupplyLimit.in(Amps);
        config.CurrentLimits.SupplyCurrentLimitEnable = true;
        config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        config.CurrentLimits.StatorCurrentLimitEnable = true;

        m_pivot.getConfigurator().apply(config);

        // The roller used to get a bare default config. It is a motor on the same
        // battery as everything else, so it gets a budget too.
        TalonFXConfiguration rollerConfig = new TalonFXConfiguration();
        rollerConfig.CurrentLimits.SupplyCurrentLimit =
                PowerConstants.kArmRollerSupplyLimit.in(Amps);
        rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;
        rollerConfig.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
        m_roller.getConfigurator().apply(rollerConfig);
    }

    @Override
    public void updateInputs(ArmIOInputs inputs) {
        inputs.angleDegrees = m_pivot.getPosition().getValue().in(Degrees);
        inputs.velocityDegPerSec = m_pivot.getVelocity().getValue().in(DegreesPerSecond);
        inputs.appliedVolts = m_pivot.getMotorVoltage().getValueAsDouble();
        // Where the profile says we should be *right now* — not the final goal.
        inputs.setpointDegrees =
                Rotations.of(m_pivot.getClosedLoopReference().getValueAsDouble()).in(Degrees);
        inputs.rollerVelocityRotPerSec = m_roller.getVelocity().getValueAsDouble();
        inputs.pivotSupplyCurrentAmps = m_pivot.getSupplyCurrent().getValueAsDouble();
        inputs.rollerSupplyCurrentAmps = m_roller.getSupplyCurrent().getValueAsDouble();
        // Wired so that a broken beam pulls the line low. An unplugged sensor
        // floats high, which reads as "no game piece" — the harmless answer.
        inputs.hasGamePiece = !m_beamBreak.get();
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
