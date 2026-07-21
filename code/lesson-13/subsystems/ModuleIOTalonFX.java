package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotBase;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.SteerConstants;

/** Real hardware behind the ModuleIO contract: TalonFXs, configs, control, and sim. */
public class ModuleIOTalonFX implements ModuleIO {
    private final TalonFX m_driveMotor;
    private final TalonFX m_steerMotor;
    private final PositionVoltage m_steerRequest = new PositionVoltage(0);
    private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

    // Sim plumbing — the same objects carried since Lessons 4-7.
    private final TalonFXSimState m_driveSim;
    private final TalonFXSimState m_steerSim;
    private final DCMotorSim m_driveModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(
                            DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),
                    DCMotor.getKrakenX60(1));
    private final DCMotorSim m_steerModel =
            new DCMotorSim(
                    LinearSystemId.createDCMotorSystem(
                            DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),
                    DCMotor.getKrakenX60(1));

    public ModuleIOTalonFX(int driveId, int steerId) {
        m_driveMotor = new TalonFX(driveId);
        m_steerMotor = new TalonFX(steerId);
        m_driveSim = m_driveMotor.getSimState();
        m_steerSim = m_steerMotor.getSimState();

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
        if (RobotBase.isSimulation()) {
            stepSim();
        }
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

    /** The four-step drive + steer physics, moved here from simulationPeriodic. */
    private void stepSim() {
        m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_driveModel.setInputVoltage(m_driveSim.getMotorVoltage());
        m_driveModel.update(0.020);
        m_driveSim.setRawRotorPosition(
                m_driveModel.getAngularPositionRotations() * DriveConstants.kDriveGearRatio);
        m_driveSim.setRotorVelocity(
                m_driveModel.getAngularVelocityRPM() * DriveConstants.kDriveGearRatio / 60.0);

        m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
        m_steerModel.update(0.020);
        m_steerSim.setRawRotorPosition(
                m_steerModel.getAngularPositionRotations() * SteerConstants.kSteerGearRatio);
        m_steerSim.setRotorVelocity(
                m_steerModel.getAngularVelocityRPM() * SteerConstants.kSteerGearRatio / 60.0);
    }
}
