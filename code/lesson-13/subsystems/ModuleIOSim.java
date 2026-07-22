package frc.robot.subsystems;

import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.SteerConstants;

/**
 * The sim implementation: the real TalonFX class (Phoenix simulates its own
 * firmware — Lesson 12), plus the Lessons 4-7 physics models feeding its
 * sim state one tick of pretend reality before each read.
 */
public class ModuleIOSim extends ModuleIOTalonFX {
    private final TalonFXSimState m_driveSim;
    private final TalonFXSimState m_steerSim;
    private final CANcoderSimState m_steerEncoderSim;
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

    public ModuleIOSim(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {
        super(driveId, steerId, cancoderId, magnetOffsetRotations); // build motors, CANcoder, and configs
        m_driveSim = m_driveMotor.getSimState();
        m_steerSim = m_steerMotor.getSimState();
        m_steerEncoderSim = m_steerEncoder.getSimState();
    }

    @Override
    public void updateInputs(ModuleIOInputs inputs) {
        stepSim(); // advance the physics one tick...
        super.updateInputs(inputs); // ...then read the sensors like the real class
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

        // The steer closed loop reads the CANcoder now, not the rotor — keep its
        // sim state honest too. No gear multiply: it sits 1:1 on the wheel.
        m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPositionRotations());
        m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocityRPM() / 60.0);
    }
}
