package frc.robot.subsystems;

import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.MetersPerSecondPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import frc.robot.Constants.ElevatorConstants;

/** Real hardware behind the ElevatorIO contract: one TalonFX running Motion Magic. */
public class ElevatorIOTalonFX implements ElevatorIO {
    // protected, not private: ElevatorIOSim extends this class and needs the motor.
    protected final TalonFX m_motor;
    private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

    public ElevatorIOTalonFX(int motorId) {
        m_motor = new TalonFX(motorId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        // One "mechanism rotation" is now one drum rotation.
        config.Feedback.SensorToMechanismRatio = ElevatorConstants.kGearRatio;

        // The model first: hold, move, accelerate. Then the trim.
        config.Slot0.kG = ElevatorConstants.kElevatorKG;
        config.Slot0.GravityType = GravityTypeValue.Elevator_Static;
        config.Slot0.kV = ElevatorConstants.kElevatorKV;
        config.Slot0.kA = ElevatorConstants.kElevatorKA;
        config.Slot0.kP = ElevatorConstants.kElevatorKP;

        // The speed limit for the profile the firmware will generate.
        config.MotionMagic.MotionMagicCruiseVelocity =
                metersToRotations(ElevatorConstants.kMaxVelocity.in(MetersPerSecond));
        config.MotionMagic.MotionMagicAcceleration =
                metersToRotations(ElevatorConstants.kMaxAcceleration.in(MetersPerSecondPerSecond));

        m_motor.getConfigurator().apply(config);
    }

    /** Drum rotations for a height in meters — the elevator's version of wheel circumference. */
    protected static double metersToRotations(double meters) {
        return meters / ElevatorConstants.kDrumCircumferenceMeters;
    }

    protected static double rotationsToMeters(double rotations) {
        return rotations * ElevatorConstants.kDrumCircumferenceMeters;
    }

    @Override
    public void updateInputs(ElevatorIOInputs inputs) {
        inputs.heightMeters = rotationsToMeters(m_motor.getPosition().getValueAsDouble());
        inputs.velocityMetersPerSec = rotationsToMeters(m_motor.getVelocity().getValueAsDouble());
        inputs.appliedVolts = m_motor.getMotorVoltage().getValueAsDouble();
    }

    @Override
    public void setGoalHeightMeters(double heightMeters) {
        m_motor.setControl(m_request.withPosition(metersToRotations(heightMeters)));
    }
}
