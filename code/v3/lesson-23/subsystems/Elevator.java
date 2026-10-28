package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.Volts;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.smartdashboard.Mechanism2d;
import org.wpilib.smartdashboard.MechanismLigament2d;
import org.wpilib.smartdashboard.MechanismRoot2d;
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
  private boolean m_homed = false;

  // The picture: a canvas, one point anchored to it, and a chain of segments.
  private final Mechanism2d m_mechanism = new Mechanism2d(
      ElevatorConstants.kDisplayWidth.in(Meters), ElevatorConstants.kDisplayHeight.in(Meters));
  private final MechanismRoot2d m_base = m_mechanism.getRoot(
      "Base", ElevatorConstants.kDisplayWidth.in(Meters) / 2, 0);
  /** Straight up from the base. Its length is the carriage height. */
  private final MechanismLigament2d m_carriage = m_base.append(
      new MechanismLigament2d("Carriage", 0, ElevatorConstants.kCarriageAngle.in(Degrees)));

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
    Telemetry.log("Elevator/StatorCurrentAmps", m_inputs.statorCurrentAmps);
    Telemetry.log("Elevator/AtBottomLimit", m_inputs.atBottomLimit);
    Telemetry.log("Elevator/Homed", m_homed);

    // The picture is built once and changed every tick; only the carriage
    // changes here, and anything appended to it (see getCarriage()) rides
    // along for free. Then log it, like every number above: the log is a
    // snapshot of the drawing right now.
    m_carriage.setLength(m_inputs.heightMeters);
    m_carriage.setColor(
        atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
    Telemetry.log("Elevator/Mechanism", m_mechanism);
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

  /**
   * Drive gently downward until the switch trips, then believe it. Open loop
   * on purpose: the encoder is exactly the thing we don't trust yet.
   */
  public Command home() {
    return runRepeatedly(() -> m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts)))
        .whenCanceled(() -> {
          m_io.setVoltage(0);
          acceptBottomLimit();
          m_goal = ElevatorConstants.kBottomLimitHeight;
          m_homed = true;
        })
        .until(this::atBottomLimit)
        .named("Home");
  }

  /**
   * Re-zero from the switch without requiring the mechanism, so this is safe
   * to fire in the middle of some other command's motion.
   */
  public Command rezeroAtBottom() {
    return Command.noRequirements(coroutine -> acceptBottomLimit()).named("Rezero At Bottom");
  }

  /** The switch knows where the carriage is. The encoder only had an opinion. */
  private void acceptBottomLimit() {
    m_io.setPositionMeters(ElevatorConstants.kBottomLimitHeight.in(Meters));
  }

  public boolean atBottomLimit() {
    return m_inputs.atBottomLimit;
  }

  /** Has homing ever run? Until it has, every height on this elevator is a guess. */
  public boolean isHomed() {
    return m_homed;
  }

  public boolean atGoal() {
    return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < ElevatorConstants.kTolerance.in(Meters);
  }

  public double getHeightMeters() {
    return m_inputs.heightMeters;
  }

  /** The mount point on top of the carriage. Anything appended here rides along. */
  public MechanismLigament2d getCarriage() {
    return m_carriage;
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
