package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import java.util.Queue;

import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;

import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.SteerConstants;

/** Real hardware behind the ModuleIO contract: TalonFXs, a CANcoder, configs, and control. */
public class ModuleIOTalonFX implements ModuleIO {
    // protected, not private: ModuleIOSim extends this class and needs the motors.
    protected final TalonFX m_driveMotor;
    protected final TalonFX m_steerMotor;
    protected final CANcoder m_steerEncoder;
    private final PositionVoltage m_steerRequest = new PositionVoltage(0);
    private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

    // Filled by the odometry thread, drained by us. Never touched without the lock.
    private final Queue<Double> m_timestampQueue;
    private final Queue<Double> m_drivePositionQueue;
    private final Queue<Double> m_steerPositionQueue;

    public ModuleIOTalonFX(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {
        m_driveMotor = new TalonFX(driveId);
        m_steerMotor = new TalonFX(steerId);
        m_steerEncoder = new CANcoder(cancoderId);

        // The CANcoder's raw zero is wherever its magnet sits — MagnetOffset
        // shifts that to "wheel pointing forward."
        CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
        cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
        m_steerEncoder.getConfigurator().apply(cancoderConfig);

        // Steering: read angle from the CANcoder (RemoteCANcoder), wrap like a
        // circle, hold a P gain.
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

        // Hand the two position signals to the odometry thread. It sets their
        // publish rate and samples them; we just keep the queues it hands back.
        OdometryThread thread = OdometryThread.getInstance();
        m_timestampQueue = thread.timestamps();
        m_drivePositionQueue = thread.register(m_driveMotor.getPosition());
        m_steerPositionQueue = thread.register(m_steerEncoder.getAbsolutePosition());
    }

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        inputs.steerAngleDegrees =
                m_steerMotor.getPosition().getValueAsDouble() * 360.0;
        inputs.drivePositionMeters =
                m_driveMotor.getPosition().getValueAsDouble() * DriveConstants.kWheelCircumferenceMeters;
        inputs.driveVelocityMetersPerSec =
                m_driveMotor.getVelocity().getValueAsDouble() * DriveConstants.kWheelCircumferenceMeters;

        // Drain whatever the thread collected since last tick. The caller holds
        // the lock around this — see Drivetrain.periodic.
        inputs.odometryTimestamps =
                m_timestampQueue.stream().mapToDouble(Double::doubleValue).toArray();
        inputs.odometryDrivePositionsMeters = m_drivePositionQueue.stream()
                .mapToDouble(v -> v * DriveConstants.kWheelCircumferenceMeters)
                .toArray();
        inputs.odometrySteerAngleDegrees = m_steerPositionQueue.stream()
                .mapToDouble(v -> v * 360.0)
                .toArray();
        m_drivePositionQueue.clear();
        m_steerPositionQueue.clear();
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
