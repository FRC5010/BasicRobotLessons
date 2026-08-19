package first.robot.subsystems;

import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.FlywheelSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.FlywheelConstants;

/**
 * The sim implementation: the real TalonFX class again, so Phoenix keeps
 * running the velocity loop in its simulated firmware, plus a physics model
 * that knows the wheel has inertia.
 *
 * <p>FlywheelSim wants a LinearSystem rather than a list of dimensions,
 * because a spinning wheel is the simplest mechanism in this course: one
 * state, one input.
 */
public class FlywheelIOSim extends FlywheelIOTalonFX {
  private final TalonFXSimState m_motorSim;
  private final FlywheelSim m_model = new FlywheelSim(
      Models.flywheelFromPhysicalConstants(
          DCMotor.getKrakenX60(1), FlywheelConstants.kMomentOfInertia, FlywheelConstants.kGearRatio),
      DCMotor.getKrakenX60(1));

  public FlywheelIOSim() {
    super(); // build the motor and apply the real configs
    m_motorSim = m_motor.getSimState();
  }

  @Override
  public void updateInputs(FlywheelIOInputs inputs) {
    stepSim();
    super.updateInputs(inputs);
  }

  /** One tick of pretend reality: our voltage in, its motion back out. */
  private void stepSim() {
    m_motorSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_model.setInputVoltage(m_motorSim.getMotorVoltage());
    m_model.update(0.020);

    // The model speaks radians; the motor's sim state speaks rotor rotations.
    // A flywheel has no position worth tracking, only a speed — so unlike
    // the elevator and the arm, only the velocity gets fed back.
    m_motorSim.setRotorVelocity(
        m_model.getAngularVelocity() / (2 * Math.PI) * FlywheelConstants.kGearRatio);
  }
}
