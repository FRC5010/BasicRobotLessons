package first.robot.subsystems;

import static org.wpilib.units.Units.Centimeters;
import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.MetersPerSecondPerSecond;

import java.util.function.Supplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.tunable.TunableDouble;
import org.wpilib.units.measure.Distance;
import org.wpilib.units.measure.LinearAcceleration;
import org.wpilib.units.measure.LinearVelocity;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;

import first.robot.Constants;
import first.robot.Constants.ElevatorConstants;
import first.robot.Tuning;

/** Scoring elevator: Motion Magic profiles the move, Slot0's feedforward model holds it there. */
public class Elevator implements Mechanism {
  private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
    case REAL -> new ElevatorIOTalonFX();
    case SIM -> new ElevatorIOSim();
    case REPLAY -> new ElevatorIO() {}; // inputs come from the log
  };
  private final ElevatorIOInputsAutoLogged m_inputs = new ElevatorIOInputsAutoLogged();
  // Every gain and limit below is a tunable (see Tuning): SimGUI can change it while the
  // robot runs, and the gains and limits go straight to the motor when it does.
  private final TunableDouble m_kG =
      Tuning.number("Elevator/KG", ElevatorConstants.kElevatorKG, this::sendGains);
  private final TunableDouble m_kV =
      Tuning.number("Elevator/KV", ElevatorConstants.kElevatorKV, this::sendGains);
  private final TunableDouble m_kA =
      Tuning.number("Elevator/KA", ElevatorConstants.kElevatorKA, this::sendGains);
  private final TunableDouble m_kP =
      Tuning.number("Elevator/KP", ElevatorConstants.kElevatorKP, this::sendGains);
  private final Supplier<LinearVelocity> m_maxVelocity = Tuning.value(
      "Elevator/MaxVelocity", ElevatorConstants.kMaxVelocity,
      MetersPerSecond, this::sendMotionLimits);
  private final Supplier<LinearAcceleration> m_maxAcceleration = Tuning.value(
      "Elevator/MaxAcceleration", ElevatorConstants.kMaxAcceleration,
      MetersPerSecondPerSecond, this::sendMotionLimits);
  private final Supplier<Distance> m_tolerance =
      Tuning.value("Elevator/Tolerance", ElevatorConstants.kTolerance, Centimeters);

  private Distance m_goal = ElevatorConstants.kStowed;

  // The picture: a canvas, one point anchored to it, and a chain of segments.
  private final LoggedMechanism2d m_mechanism = new LoggedMechanism2d(
      ElevatorConstants.kDisplayWidth, ElevatorConstants.kDisplayHeight);
  private final LoggedMechanismRoot2d m_base = m_mechanism.getRoot(
      "Base", ElevatorConstants.kDisplayWidth.div(2), Meters.of(0));
  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Point the carriage straight up with a named angle instead of a spelled-out 90°, and
   * delete the effector stub below it: the real arm attaches here instead.
   */
  /** Straight up from the base. Its length is the carriage height. */
  private final LoggedMechanismLigament2d m_carriage =
      m_base.append(new LoggedMechanismLigament2d("Carriage", Meters.of(0), Degrees.of(90)));
  /** Rides on top of the carriage. Lesson 20 puts a real arm here. */
  private final LoggedMechanismLigament2d m_effector = m_carriage.append(
      new LoggedMechanismLigament2d("Effector", ElevatorConstants.kEffectorLength, Degrees.of(-90)));

  public Elevator() {
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  private void periodic() {
    m_io.updateInputs(m_inputs);
    Logger.processInputs("Elevator", m_inputs); // every reading, under Elevator/
    Logger.recordOutput("Elevator/GoalMeters", m_goal.in(Meters));

    // The picture is built once and changed every tick; only the carriage
    // changes, and the effector rides along with it for free. Then log it,
    // like every number above: the log is a snapshot of the drawing right now.
    m_carriage.setLength(m_inputs.heightMeters);
    m_carriage.setColor(
        atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
    Logger.recordOutput("Elevator/Mechanism", m_mechanism);
  }

  /** Send the carriage to 'target', clamped to safe travel. Keeps holding once it arrives. */
  public Command goToHeight(Distance target) {
    return runRepeatedly(() -> {
          m_goal = clampToTravel(target);
          m_io.setGoalHeightMeters(m_goal.in(Meters));
        })
        .until(this::atGoal)
        .named("Go To Height");
  }

  public boolean atGoal() {
    return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < m_tolerance.get().in(Meters);
  }

  public double getHeightMeters() {
    return m_inputs.heightMeters;
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Hand out the carriage's segment, so the arm can attach its own drawing to it.
   */

  /** Send all four gains to the motor; runs whenever SimGUI changes one of them. */
  private void sendGains() {
    m_io.setGains(m_kG.get(), m_kV.get(), m_kA.get(), m_kP.get());
  }

  /** Send the profile's speed and acceleration limits to the motor, in meters. */
  private void sendMotionLimits() {
    m_io.setMotionLimits(
        m_maxVelocity.get().in(MetersPerSecond),
        m_maxAcceleration.get().in(MetersPerSecondPerSecond));
  }

  /** Keeps 'target' inside [kMinHeight, kMaxHeight] — there's no MathUtil.clamp to reach for here. */
  private static Distance clampToTravel(Distance target) {
    if (target.gt(ElevatorConstants.kMaxHeight)) {
      return ElevatorConstants.kMaxHeight;
    } else if (target.lt(ElevatorConstants.kMinHeight)) {
      return ElevatorConstants.kMinHeight;
    } else {
      return target;
    }
  }
}
