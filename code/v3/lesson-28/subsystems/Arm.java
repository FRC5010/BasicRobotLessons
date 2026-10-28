package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Meters;

import java.util.function.Supplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.smartdashboard.MechanismLigament2d;
import org.wpilib.units.measure.Angle;

import org.littletonrobotics.junction.Logger;

import first.robot.Constants;
import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;

/**
 * An intake arm on the same spine as the elevator: an ArmIO chosen by the
 * current mode, an inputs bundle, and the decision about where it is allowed
 * to swing. Two motors, one mechanism — they are one physical thing.
 */
public class Arm implements Mechanism {
  private final ArmIO m_io;
  private final ArmIOInputsAutoLogged m_inputs = new ArmIOInputsAutoLogged();
  private Angle m_goal = ArmConstants.kStowed;

  /** The arm's segment in the elevator's drawing — it hangs off the carriage. */
  private final MechanismLigament2d m_ligament;

  public Arm(Elevator elevator, Supplier<Pose2d> simulatedRobotPose) {
    // Chosen here rather than up with the fields: the simulated intake needs
    // to know where the robot really is, and only the constructor is told.
    m_io = switch (Constants.kCurrentMode) {
      case REAL -> new ArmIOTalonFX();
      case SIM -> new ArmIOSim(simulatedRobotPose);
      case REPLAY -> new ArmIO() {}; // inputs come from the log
    };
    m_ligament = elevator.getCarriage().append(new MechanismLigament2d(
        "Arm", ArmConstants.kArmLength.in(Meters), toDrawingAngle(ArmConstants.kMinAngle).in(Degrees)));
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** One tick of sensing: read the hardware into the bundle, log it, and move the drawing. */
  private void periodic() {
    m_io.updateInputs(m_inputs);
    Logger.processInputs("Arm", m_inputs); // every reading, under Arm/
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Log each motor's battery-side current.
     */
    Logger.recordOutput("Arm/GoalDegrees", m_goal.in(Degrees));
    Logger.recordOutput("Arm/AtGoal", atGoal());

    m_ligament.setAngle(toDrawingAngle(Degrees.of(m_inputs.angleDegrees)).in(Degrees));
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

  /** Is a game piece actually sitting in the intake? The roller can't tell you. */
  public boolean hasGamePiece() {
    return m_inputs.hasGamePiece;
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * A getter for the arm's battery-side current, the pivot and the roller together, so something that sees the whole robot can add the mechanisms up.
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
