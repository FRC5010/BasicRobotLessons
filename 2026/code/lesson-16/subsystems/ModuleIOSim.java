package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;
import static edu.wpi.first.units.Units.Volts;

import org.ironmaple.simulation.drivesims.SwerveModuleSimulation;
import org.ironmaple.simulation.motorsims.SimulatedMotorController;

import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Voltage;
import edu.wpi.first.wpilibj.RobotController;

/**
 * Lesson 16: still the real TalonFX class (Phoenix simulates its own firmware),
 * but the physics now comes from maple-sim instead of a pair of private
 * DCMotorSims. The engine calls the two controllers below — that's the callback
 * — asking what voltage we're applying and handing back the motion it produced.
 *
 * <p>There is no updateInputs override anymore: ModuleIOTalonFX's version reads
 * the TalonFXs, and the sim states those reads consult are fed right here.
 */
public class ModuleIOSim extends ModuleIOTalonFX {
    private final TalonFXSimState m_driveSim;
    private final TalonFXSimState m_steerSim;
    private final CANcoderSimState m_steerEncoderSim;

    public ModuleIOSim(
            int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
            SwerveModuleSimulation moduleSim) {
        super(driveId, steerId, cancoderId, magnetOffsetRotations); // motors, CANcoder, configs
        m_driveSim = m_driveMotor.getSimState();
        m_steerSim = m_steerMotor.getSimState();
        m_steerEncoderSim = m_steerEncoder.getSimState();

        // Drive: the engine asks what we're applying; we answer, and take its motion.
        // encoderAngle is rotor-side (wheel x kDriveGearRatio) — exactly what the
        // TalonFX's raw rotor sensor reports on a real robot.
        moduleSim.useDriveMotorController(new SimulatedMotorController() {
            @Override
            public Voltage updateControlSignal(
                    Angle mechanismAngle, AngularVelocity mechanismVelocity,
                    Angle encoderAngle, AngularVelocity encoderVelocity) {
                m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
                m_driveSim.setRawRotorPosition(encoderAngle.in(Rotations));
                m_driveSim.setRotorVelocity(encoderVelocity.in(RotationsPerSecond));
                return Volts.of(m_driveSim.getMotorVoltage());
            }
        });

        // Steer: the same trade, plus the CANcoder — which sits 1:1 on the wheel,
        // so it gets the mechanism-side values with no gear multiply.
        moduleSim.useSteerMotorController(new SimulatedMotorController() {
            @Override
            public Voltage updateControlSignal(
                    Angle mechanismAngle, AngularVelocity mechanismVelocity,
                    Angle encoderAngle, AngularVelocity encoderVelocity) {
                m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
                m_steerSim.setRawRotorPosition(encoderAngle.in(Rotations));
                m_steerSim.setRotorVelocity(encoderVelocity.in(RotationsPerSecond));
                m_steerEncoderSim.setRawPosition(mechanismAngle.in(Rotations));
                m_steerEncoderSim.setVelocity(mechanismVelocity.in(RotationsPerSecond));
                return Volts.of(m_steerSim.getMotorVoltage());
            }
        });
    }
}
