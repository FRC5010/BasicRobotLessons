package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.units.measure.Angle;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;

import first.robot.Constants;
import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;

/**
 * An intake arm on the same spine as the elevator: an ArmIO chosen by the
 * current mode, an inputs bundle, and the decision about where it is allowed
 * to swing. Two motors, one mechanism — they are one physical thing.
 */
public class Arm implements Mechanism {
  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Leave this field unassigned and choose the IO in the constructor instead:
   * the simulated intake needs to know where the robot really is, and only the
   * constructor is told.
   */
  private final ArmIO m_io = switch (Constants.kCurrentMode) {
    case REAL -> new ArmIOTalonFX();
    case SIM -> new ArmIOSim();
    case REPLAY -> new ArmIO() {}; // inputs come from the log
  };
  private final ArmIOInputsAutoLogged m_inputs = new ArmIOInputsAutoLogged();
  private Angle m_goal = ArmConstants.kStowed;

  /** The arm's segment in the elevator's drawing — it hangs off the carriage. */
  private final LoggedMechanismLigament2d m_ligament;

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Take a way to ask where the robot really is, and choose the IO here.
   */
  public Arm(Elevator elevator) {
    m_ligament = elevator.getCarriage().append(new LoggedMechanismLigament2d(
        "Arm", ArmConstants.kArmLength, toDrawingAngle(ArmConstants.kMinAngle)));
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** One tick of sensing: read the hardware into the bundle, log it, and move the drawing. */
  private void periodic() {
    m_io.updateInputs(m_inputs);
    Logger.processInputs("Arm", m_inputs); // every reading, under Arm/
    Logger.recordOutput("Arm/GoalDegrees", m_goal.in(Degrees));
    Logger.recordOutput("Arm/AtGoal", atGoal());

    m_ligament.setAngle(toDrawingAngle(Degrees.of(m_inputs.angleDegrees)));
    m_ligament.setColor(
        atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
  }

  /** Swing the arm to an angle, clamped to safe travel. Keeps holding once it arrives. */
  public Command goToAngle(Angle angle) {
    return runRepeatedly(() -> {
          m_goal = clampToTravel(angle);
          m_io.setGoalAngleDegrees(m_goal.in(Degrees));
        })
        .until(this::atGoal)
        .named("Go To Angle");
  }

  /** Spin the roller while this command runs. Stops it however the command ends. */
  public Command runRoller(double output) {
    return runRepeatedly(() -> m_io.setRollerOutput(output))
        .whenCanceled(() -> m_io.setRollerOutput(0.0))
        .named("Run Roller");
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add a way to ask whether a game piece is actually in the intake.
   */

  public boolean atGoal() {
    return Math.abs(m_inputs.angleDegrees - m_goal.in(Degrees)) < ArmConstants.kTolerance.in(Degrees);
  }

  /** Keeps 'angle' inside [kMinAngle, kMaxAngle] — there's no MathUtil.clamp to reach for here. */
  private static Angle clampToTravel(Angle angle) {
    if (angle.gt(ArmConstants.kMaxAngle)) {
      return ArmConstants.kMaxAngle;
    } else if (angle.lt(ArmConstants.kMinAngle)) {
      return ArmConstants.kMinAngle;
    } else {
      return angle;
    }
  }

  /**
   * A ligament's angle is measured from its parent, and the carriage points
   * straight up — so a world angle becomes a drawing angle by subtracting it.
   */
  private static Angle toDrawingAngle(Angle armAngle) {
    return armAngle.minus(ElevatorConstants.kCarriageAngle);
  }
}
