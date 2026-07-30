package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Kilograms;
import static edu.wpi.first.units.Units.Meters;

import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.ElevatorSim;
import frc.robot.Constants.ElevatorConstants;

/**
 * The sim implementation: the real TalonFX class (Phoenix simulates its own
 * firmware, so Motion Magic still runs), plus a physics model that knows the
 * carriage has mass and gravity is pulling on it.
 */
public class ElevatorIOSim extends ElevatorIOTalonFX {
    private final TalonFXSimState m_motorSim;
    private final ElevatorSim m_model = new ElevatorSim(
            DCMotor.getKrakenX60(1),
            ElevatorConstants.kGearRatio,
            ElevatorConstants.kCarriageMass.in(Kilograms),
            ElevatorConstants.kDrumRadius.in(Meters),
            ElevatorConstants.kMinHeight.in(Meters),
            ElevatorConstants.kMaxHeight.in(Meters),
            true, // simulate gravity — the whole point
            ElevatorConstants.kMinHeight.in(Meters));

    public ElevatorIOSim(int motorId) {
        super(motorId); // build the motor and apply the configs
        m_motorSim = m_motor.getSimState();
    }

    @Override
    public void updateInputs(ElevatorIOInputs inputs) {
        stepSim(); // advance the physics one tick...
        super.updateInputs(inputs); // ...then read the sensors like the real class
    }

    /** One tick of pretend reality: our voltage in, its motion back out. */
    private void stepSim() {
        m_motorSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_model.setInputVoltage(m_motorSim.getMotorVoltage());
        m_model.update(0.020);

        // The model speaks meters; the motor's sim state speaks rotor rotations.
        m_motorSim.setRawRotorPosition(
                metersToRotations(m_model.getPositionMeters()) * ElevatorConstants.kGearRatio);
        m_motorSim.setRotorVelocity(
                metersToRotations(m_model.getVelocityMetersPerSecond())
                        * ElevatorConstants.kGearRatio);
    }
}
