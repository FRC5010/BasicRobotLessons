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
  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Start the simulated carriage where it really sits at power-on, not at the
   * stowed height.
   */
  private final ElevatorSim m_elevatorModel = new ElevatorSim(
      DCMotor.getKrakenX60(1),
      ElevatorConstants.kGearRatio,
      ElevatorConstants.kCarriageMass.in(Kilograms),
      ElevatorConstants.kDrumRadius.in(Meters),
      ElevatorConstants.kMinHeight.in(Meters),
      ElevatorConstants.kMaxHeight.in(Meters),
      true, // simulateGravity — an unpowered carriage falls
      ElevatorConstants.kStowed.in(Meters));

  public ElevatorIOSim() {
    super(); // build the motor and apply the real configs
    m_sim = m_motor.getSimState();
  }

  @Override
  public void updateInputs(ElevatorIOInputs inputs) {
    stepSim(); // advance the physics one tick...
    super.updateInputs(inputs); // ...then read the sensor like the real class
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Read the bottom limit switch from where the carriage really is, not from the
     * encoder.
     */
  }

  /** One tick of pretend reality. */
  private void stepSim() {
    m_sim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_elevatorModel.setInputVoltage(m_sim.getMotorVoltage());
    m_elevatorModel.update(0.020);

    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Feed the encoder how far the carriage has moved since power-on, not its
     * height: that's all a real relative encoder can know.
     */
    // The model reports carriage motion in meters; convert back to rotor-side
    // rotations through the drum and the gearbox, same as every module motor.
    m_sim.setRawRotorPosition(
        metersToRotations(m_elevatorModel.getPosition()) * ElevatorConstants.kGearRatio);
    m_sim.setRotorVelocity(
        metersToRotations(m_elevatorModel.getVelocity()) * ElevatorConstants.kGearRatio);
  }
}
