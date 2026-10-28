package first.robot.subsystems;

import static org.wpilib.units.Units.Kilograms;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.Radians;

import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.simulation.SingleJointedArmSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.ArmConstants;

/**
 * The sim implementation: the real TalonFX class (Phoenix simulates its own
 * firmware, so Motion Magic still runs), plus physics for both motors — an
 * arm that gravity pulls on, and a roller that just has some inertia.
 */
public class ArmIOSim extends ArmIOTalonFX {
  private final TalonFXSimState m_pivotSim;
  private final TalonFXSimState m_rollerSim;

  private final SingleJointedArmSim m_model = new SingleJointedArmSim(
      DCMotor.getKrakenX60(1),
      ArmConstants.kGearRatio,
      SingleJointedArmSim.estimateMOI(
          ArmConstants.kArmLength.in(Meters), ArmConstants.kArmMass.in(Kilograms)),
      ArmConstants.kArmLength.in(Meters),
      ArmConstants.kMinAngle.in(Radians),
      ArmConstants.kMaxAngle.in(Radians),
      true, // simulate gravity — the whole point
      ArmConstants.kMinAngle.in(Radians));

  // The roller has no gravity — just a motor and some spinning inertia, the
  // same generic 2-state system every module motor already uses.
  private final DCMotorSim m_rollerModel = new DCMotorSim(
      Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.001, 1.0),
      DCMotor.getKrakenX60(1));

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add the simulated field: the game pieces lying on it, whether the intake is
   * holding one, what the roller was last told, and where the robot really is.
   */

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Take where the robot really is, and keep it.
   */
  public ArmIOSim() {
    super(); // build both motors and apply the real configs
    m_pivotSim = m_pivot.getSimState();
    m_rollerSim = m_roller.getSimState();
  }

  @Override
  public void updateInputs(ArmIOInputs inputs) {
    stepSim(); // advance the physics one tick...
    super.updateInputs(inputs); // ...then read the sensors like the real class
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Catch a piece if the roller is pulling in, the arm is down, and a piece is
     * really in reach. Report what the intake holds as the beam break's reading,
     * and record where the pieces on the field are with AdvantageKit's Logger.
     */
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Remember what the roller is told, and spit a held piece back onto the field
   * when it runs outward. Then a test for whether a piece is inside the box the
   * roller can reach.
   */

  /** One tick of pretend reality: our voltage in, its motion back out. */
  private void stepSim() {
    m_pivotSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_model.setInputVoltage(m_pivotSim.getMotorVoltage());
    m_model.update(0.020);

    // The model speaks radians; the motor's sim state speaks rotor rotations.
    m_pivotSim.setRawRotorPosition(m_model.getAngle() / (2 * Math.PI) * ArmConstants.kGearRatio);
    m_pivotSim.setRotorVelocity(m_model.getVelocity() / (2 * Math.PI) * ArmConstants.kGearRatio);

    m_rollerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_rollerModel.setInputVoltage(m_rollerSim.getMotorVoltage());
    m_rollerModel.update(0.020);
    m_rollerSim.setRawRotorPosition(m_rollerModel.getAngularPosition() / (2 * Math.PI));
    m_rollerSim.setRotorVelocity(m_rollerModel.getAngularVelocity() / (2 * Math.PI));
  }
}
