package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.TalonFX;

import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.SteerConstants;

/** Real hardware behind the ModuleIO contract: TalonFXs, configs, and control. */
public class ModuleIOTalonFX implements ModuleIO {
    // protected, not private: ModuleIOSim extends this class and needs the motors.
    protected final TalonFX m_driveMotor;
    protected final TalonFX m_steerMotor;
    private final PositionVoltage m_steerRequest = new PositionVoltage(0);
    private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

    public ModuleIOTalonFX(int driveId, int steerId) {
        m_driveMotor = new TalonFX(driveId);
        m_steerMotor = new TalonFX(steerId);

        // Steering: firmware knows the gearbox, wraps like a circle, holds a P gain.
        TalonFXConfiguration steerConfig = new TalonFXConfiguration();
        steerConfig.Feedback.SensorToMechanismRatio = SteerConstants.kSteerGearRatio;
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

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        inputs.steerAngleDegrees =
                m_steerMotor.getPosition().getValueAsDouble() * 360.0;
        inputs.drivePositionMeters =
                m_driveMotor.getPosition().getValueAsDouble() * DriveConstants.kWheelCircumferenceMeters;
        inputs.driveVelocityMetersPerSec =
                m_driveMotor.getVelocity().getValueAsDouble() * DriveConstants.kWheelCircumferenceMeters;
    }

    @Override
    public void setSteerAngleDegrees(double angleDegrees) {
        // Phoenix speaks Units — hand it the angle as a measure.
        m_steerMotor.setControl(m_steerRequest.withPosition(Degrees.of(angleDegrees)));
    }

    @Override
    public void setDriveVelocityMetersPerSec(double mps) {
        double wheelRps = mps / DriveConstants.kWheelCircumferenceMeters;
        m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));
    }

    @Override
    public void resetDrivePosition() {
        m_driveMotor.setPosition(0);
    }
}
