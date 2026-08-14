package first.robot.subsystems;

import static org.wpilib.units.Units.Kilograms;
import static org.wpilib.units.Units.Meters;

import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.system.DCMotor;
import org.wpilib.simulation.ElevatorSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.ElevatorConstants;

/** Sim: the real TalonFX class, plus WPILib's ElevatorSim physics model underneath it. */
public class ElevatorIOSim extends ElevatorIOTalonFX {
  private final TalonFXSimState m_sim;
  private final ElevatorSim m_elevatorModel = new ElevatorSim(
      DCMotor.getKrakenX60(1),
      ElevatorConstants.kGearRatio,
      ElevatorConstants.kCarriageMass.in(Kilograms),
      ElevatorConstants.kDrumRadius.in(Meters),
      ElevatorConstants.kMinHeight.in(Meters),
      ElevatorConstants.kMaxHeight.in(Meters),
      true, // simulateGravity — an unpowered carriage falls
      ElevatorConstants.kSimStartHeight.in(Meters));

  public ElevatorIOSim() {
    super(); // build the motor and apply the real configs
    m_sim = m_motor.getSimState();
  }

  @Override
  public void updateInputs(ElevatorIOInputs inputs) {
    stepSim(); // advance the physics one tick...
    super.updateInputs(inputs); // ...then read the sensor like the real class

    // The switch is bolted to the frame. It trips on where the carriage
    // actually is — not on where the encoder thinks it is.
    inputs.atBottomLimit = m_elevatorModel.getPosition() <= ElevatorConstants.kBottomLimitHeight.in(Meters);
  }

  /** One tick of pretend reality. */
  private void stepSim() {
    m_sim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_elevatorModel.setInputVoltage(m_sim.getMotorVoltage());
    m_elevatorModel.update(0.020);

    // The model speaks meters; the motor's sim state speaks rotor rotations.
    // Note what gets fed: height *minus where the carriage started*. A
    // relative encoder can only report how far it has moved since power-on,
    // so a real one reads zero at boot no matter where the carriage is
    // sitting. That is the whole problem homing exists to solve, and this
    // is it, faithfully: the model's own position, not what the encoder
    // would need to already know.
    m_sim.setRawRotorPosition(
        metersToRotations(m_elevatorModel.getPosition() - ElevatorConstants.kSimStartHeight.in(Meters))
            * ElevatorConstants.kGearRatio);
    m_sim.setRotorVelocity(
        metersToRotations(m_elevatorModel.getVelocity()) * ElevatorConstants.kGearRatio);
  }
}
