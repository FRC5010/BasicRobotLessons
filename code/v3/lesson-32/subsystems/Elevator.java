package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.Volts;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.units.measure.Distance;
import org.wpilib.util.Alert;
import org.wpilib.util.Alert.Level;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;

import first.robot.Constants;
import first.robot.Constants.ElevatorConstants;

/** Scoring elevator: Motion Magic profiles the move, Slot0's feedforward model holds it there. */
public class Elevator implements Mechanism {
  private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
    case REAL -> new ElevatorIOTalonFX();
    case SIM -> new ElevatorIOSim();
    case REPLAY -> new ElevatorIO() {}; // inputs come from the log
  };
  private final ElevatorIOInputsAutoLogged m_inputs = new ElevatorIOInputsAutoLogged();
  private Distance m_goal = ElevatorConstants.kStowed;
  private boolean m_homed = false;

  // Two things worth saying out loud in the pit, and they are different
  // kinds of bad: a missing motor means the robot cannot work, an unhomed
  // elevator means it will work wrongly. Each id only has to be unique, and
  // a log key is already unique, so they borrow its shape.
  private final Alert m_disconnected =
      new Alert("Elevator/Disconnected", "Elevator motor is not on the CAN bus", Level.HIGH);
  private final Alert m_notHomed =
      new Alert("Elevator/NotHomed", "Elevator has never been homed", Level.MEDIUM);

  // The picture: a canvas, one point anchored to it, and a chain of segments.
  private final LoggedMechanism2d m_mechanism = new LoggedMechanism2d(
      ElevatorConstants.kDisplayWidth, ElevatorConstants.kDisplayHeight);
  private final LoggedMechanismRoot2d m_base = m_mechanism.getRoot(
      "Base", ElevatorConstants.kDisplayWidth.div(2), Meters.of(0));
  /** Straight up from the base. Its length is the carriage height. */
  private final LoggedMechanismLigament2d m_carriage = m_base.append(
      new LoggedMechanismLigament2d("Carriage", Meters.of(0), ElevatorConstants.kCarriageAngle));

  public Elevator() {
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  private void periodic() {
    m_io.updateInputs(m_inputs);
    Logger.processInputs("Elevator", m_inputs); // every reading, under Elevator/
    Logger.recordOutput("Elevator/GoalMeters", m_goal.in(Meters));
    Telemetry.log("Elevator/HeightErrorMeters", m_inputs.heightMeters - m_goal.in(Meters));
    Telemetry.log("Elevator/SupplyCurrentAmps", m_inputs.supplyCurrentAmps);
    Telemetry.log("Elevator/AtGoal", atGoal());
    Logger.recordOutput("Elevator/Homed", m_homed);
    Telemetry.log("Elevator/MotorConnected", m_inputs.motorConnected);

    // Set every tick, not raised once: an alert is a statement about how
    // things are now, so it has to be able to go away again.
    m_disconnected.set(!m_inputs.motorConnected);
    m_notHomed.set(!m_homed);

    // The picture is built once and changed every tick; only the carriage
    // changes here, and anything appended to it (see getCarriage()) rides
    // along for free. Then log it, like every number above: the log is a
    // snapshot of the drawing right now.
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

  /** No subsystem knows the robot's total draw — this is this motor's slice of it. */
  public double getSupplyCurrentAmps() {
    return m_inputs.supplyCurrentAmps;
  }

  /** The mount point on top of the carriage. Anything appended here rides along. */
  public LoggedMechanismLigament2d getCarriage() {
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
