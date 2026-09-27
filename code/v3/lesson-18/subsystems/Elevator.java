package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.units.measure.Distance;

import first.robot.Constants;
import first.robot.Constants.ElevatorConstants;

/** Scoring elevator: Motion Magic profiles the move, Slot0's feedforward model holds it there. */
public class Elevator implements Mechanism {
  private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
    case REAL -> new ElevatorIOTalonFX();
    case SIM -> new ElevatorIOSim();
    case REPLAY -> new ElevatorIO() {}; // inputs come from the log
  };
  private final ElevatorIO.ElevatorIOInputs m_inputs = new ElevatorIO.ElevatorIOInputs();
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
    Telemetry.log("Elevator/HeightMeters", m_inputs.heightMeters);
    Telemetry.log("Elevator/VelocityMetersPerSec", m_inputs.velocityMetersPerSec);
    Telemetry.log("Elevator/AppliedVolts", m_inputs.appliedVolts);
    Telemetry.log("Elevator/SetpointMeters", m_inputs.setpointMeters);
    Telemetry.log("Elevator/GoalMeters", m_goal.in(Meters));

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Set the carriage segment's length from the height, color it by whether it's at
     * the goal, then log the whole drawing — every tick, like every number above.
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
    return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < ElevatorConstants.kTolerance.in(Meters);
  }

  public double getHeightMeters() {
    return m_inputs.heightMeters;
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
