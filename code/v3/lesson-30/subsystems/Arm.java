package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.RotationsPerSecondPerSecond;

import java.util.function.Supplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.tunable.Tunable;
import org.wpilib.tunable.TunableDouble;
import org.wpilib.units.measure.Angle;
import org.wpilib.units.measure.AngularAcceleration;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.util.Alert;
import org.wpilib.util.Alert.Level;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;

import first.robot.Constants;
import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;
import first.robot.Tuning;

/**
 * An intake arm on the same spine as the elevator: an ArmIO chosen by the
 * current mode, an inputs bundle, and the decision about where it is allowed
 * to swing. Two motors, one mechanism — they are one physical thing.
 */
public class Arm implements Mechanism {
  private final ArmIO m_io;
  private final ArmIOInputsAutoLogged m_inputs = new ArmIOInputsAutoLogged();
  // The pivot's gains and limits, as tunables (see Tuning): SimGUI can change them while
  // the robot runs, and the gains and limits go straight to the pivot motor when it does.
  private final TunableDouble m_kG =
      Tuning.number("Arm/KG", ArmConstants.kArmKG, this::sendGains);
  private final TunableDouble m_kV =
      Tuning.number("Arm/KV", ArmConstants.kArmKV, this::sendGains);
  private final TunableDouble m_kA =
      Tuning.number("Arm/KA", ArmConstants.kArmKA, this::sendGains);
  private final TunableDouble m_kP =
      Tuning.number("Arm/KP", ArmConstants.kArmKP, this::sendGains);
  private final Tunable<AngularVelocity> m_maxVelocity =
      Tuning.value("Arm/MaxVelocity", ArmConstants.kMaxVelocity, this::sendMotionLimits);
  private final Tunable<AngularAcceleration> m_maxAcceleration =
      Tuning.value("Arm/MaxAcceleration", ArmConstants.kMaxAcceleration, this::sendMotionLimits);
  private final Tunable<Angle> m_tolerance =
      Tuning.value("Arm/Tolerance", ArmConstants.kTolerance);

  private Angle m_goal = ArmConstants.kStowed;

  private final Alert m_disconnected =
      new Alert("Arm/Disconnected", "Arm motor is not on the CAN bus", Level.HIGH);

  /** The arm's segment in the elevator's drawing — it hangs off the carriage. */
  private final LoggedMechanismLigament2d m_ligament;

  public Arm(Elevator elevator, Supplier<Pose2d> simulatedRobotPose) {
    // Chosen here rather than up with the fields: the simulated intake needs
    // to know where the robot really is, and only the constructor is told.
    m_io = switch (Constants.kCurrentMode) {
      case REAL -> new ArmIOTalonFX();
      case SIM -> new ArmIOSim(simulatedRobotPose);
      case REPLAY -> new ArmIO() {}; // inputs come from the log
    };
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

    // Either motor missing is the same problem from the pit's point of view.
    m_disconnected.set(!m_inputs.pivotConnected || !m_inputs.rollerConnected);

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

  /** Is a game piece actually sitting in the intake? The roller can't tell you. */
  public boolean hasGamePiece() {
    return m_inputs.hasGamePiece;
  }

  /** Two motors, one mechanism — its slice of the battery is both of them together. */
  public double getSupplyCurrentAmps() {
    return m_inputs.pivotSupplyCurrentAmps + m_inputs.rollerSupplyCurrentAmps;
  }

  public boolean atGoal() {
    return Math.abs(m_inputs.angleDegrees - m_goal.in(Degrees)) < m_tolerance.get().in(Degrees);
  }

  /** Send all four pivot gains to the motor; runs whenever SimGUI changes one of them. */
  private void sendGains() {
    m_io.setGains(m_kG.get(), m_kV.get(), m_kA.get(), m_kP.get());
  }

  /** Send the profile's speed and acceleration limits to the pivot, in arm rotations. */
  private void sendMotionLimits() {
    m_io.setMotionLimits(
        m_maxVelocity.get().in(RotationsPerSecond),
        m_maxAcceleration.get().in(RotationsPerSecondPerSecond));
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
