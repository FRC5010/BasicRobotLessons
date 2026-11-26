package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.MetersPerSecondPerSecond;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.tunable.Tunable;
import org.wpilib.tunable.TunableDouble;
import org.wpilib.units.measure.Distance;
import org.wpilib.units.measure.LinearAcceleration;
import org.wpilib.units.measure.LinearVelocity;

import org.littletonrobotics.junction.Logger;

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
  private final Tunable<LinearVelocity> m_maxVelocity = Tuning.value(
      "Elevator/MaxVelocity", ElevatorConstants.kMaxVelocity, this::sendMotionLimits);
  private final Tunable<LinearAcceleration> m_maxAcceleration = Tuning.value(
      "Elevator/MaxAcceleration", ElevatorConstants.kMaxAcceleration, this::sendMotionLimits);
  private final Tunable<Distance> m_tolerance =
      Tuning.value("Elevator/Tolerance", ElevatorConstants.kTolerance);

  private Distance m_goal = ElevatorConstants.kStowed;

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add the drawing as fields, so it lasts between ticks: a canvas, a base point
   * anchored to it, the carriage as a segment pointing straight up from the base, and
   * a short piece attached to the top of the carriage.
   */

  public Elevator() {
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  private void periodic() {
    m_io.updateInputs(m_inputs);
    Logger.processInputs("Elevator", m_inputs); // every reading, under Elevator/
    Logger.recordOutput("Elevator/GoalMeters", m_goal.in(Meters));

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Set the carriage segment's length from the height, color it by whether it's at
     * the goal, then record the whole drawing as an output — every tick, like every
     * number above.
     */
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
