package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.RotationsPerSecond;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.smartdashboard.Mechanism2d;
import org.wpilib.smartdashboard.MechanismLigament2d;
import org.wpilib.smartdashboard.MechanismRoot2d;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.units.measure.Angle;
import org.wpilib.units.measure.AngularVelocity;

import first.robot.Constants;
import first.robot.Constants.ElevatorConstants;
import first.robot.Constants.FlywheelConstants;

/**
 * A shooter wheel: the fourth mechanism on the same spine, and the first
 * whose goal is a speed rather than a place.
 */
public class Flywheel extends Mechanism {
  private final FlywheelIO m_io = switch (Constants.kCurrentMode) {
    case REAL -> new FlywheelIOTalonFX();
    case SIM -> new FlywheelIOSim();
    case REPLAY -> new FlywheelIO() {}; // inputs come from the log
  };
  private final FlywheelIO.FlywheelIOInputs m_inputs = new FlywheelIO.FlywheelIOInputs();

  private AngularVelocity m_goal = RotationsPerSecond.of(0);

  // A speedometer: one hub, two needles. There is nothing physical to draw
  // here — a spinning wheel looks the same at every speed — so the picture
  // is of the number instead.
  private final Mechanism2d m_dial = new Mechanism2d(
      FlywheelConstants.kDialSize.in(Meters), FlywheelConstants.kDialSize.in(Meters));
  private final MechanismRoot2d m_hub = m_dial.getRoot(
      "Hub", FlywheelConstants.kDialSize.in(Meters) / 2, FlywheelConstants.kDialSize.in(Meters) / 2);
  /** Where the wheel is asked to be. The gap to the other needle is the error. */
  private final MechanismLigament2d m_goalNeedle = m_hub.append(
      new MechanismLigament2d("Goal", FlywheelConstants.kNeedleLength.in(Meters),
          FlywheelConstants.kZeroAngle.in(Degrees)));
  /** Where the wheel actually is. */
  private final MechanismLigament2d m_needle = m_hub.append(
      new MechanismLigament2d("Speed", FlywheelConstants.kNeedleLength.in(Meters),
          FlywheelConstants.kZeroAngle.in(Degrees)));

  public Flywheel() {
    SmartDashboard.putData("Flywheel/Dial", m_dial);
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    m_io.updateInputs(m_inputs);
    SmartDashboard.putNumber("Flywheel/VelocityRps", m_inputs.velocityRps);
    SmartDashboard.putNumber("Flywheel/AppliedVolts", m_inputs.appliedVolts);
    SmartDashboard.putNumber("Flywheel/SetpointRps", m_inputs.setpointRps);
    SmartDashboard.putNumber("Flywheel/StatorCurrentAmps", m_inputs.statorCurrentAmps);
    SmartDashboard.putNumber("Flywheel/GoalRps", m_goal.in(RotationsPerSecond));
    SmartDashboard.putBoolean("Flywheel/AtSpeed", atSpeed());
    updateDial();
  }

  /** Point both needles and publish the dial. Runs every tick, like any drawing. */
  private void updateDial() {
    m_goalNeedle.setAngle(toDialAngle(m_goal.in(RotationsPerSecond)).in(Degrees));
    m_needle.setAngle(toDialAngle(m_inputs.velocityRps).in(Degrees));
    m_needle.setColor(atSpeed() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
  }

  /**
   * Where a needle points for a given speed: straight down at rest, straight
   * up at full scale, sweeping round the left half for positive speeds and
   * the right half for negative ones.
   *
   * <p>Clamped, so a wheel driven past its own free speed pins the needle at
   * the top instead of wrapping back round and lying about it.
   */
  private static Angle toDialAngle(double rps) {
    double fraction = clamp(rps / FlywheelConstants.kFreeSpeed.in(RotationsPerSecond), -1.0, 1.0);
    return FlywheelConstants.kZeroAngle.minus(FlywheelConstants.kFullSweep.times(fraction));
  }

  /** Keeps 'value' between 'min' and 'max' — there's no MathUtil.clamp to reach for here. */
  private static double clamp(double value, double min, double max) {
    if (value > max) {
      return max;
    } else if (value < min) {
      return min;
    } else {
      return value;
    }
  }

  /**
   * Hold a speed. Unlike the elevator's goToHeight this does not finish on
   * arrival — a flywheel that reached its speed and stopped trying would
   * immediately slow down again.
   */
  public Command spinUp(AngularVelocity speed) {
    return runRepeatedly(() -> {
          m_goal = speed;
          m_io.setGoalRps(speed.in(RotationsPerSecond));
        })
        .named("Spin Up");
  }

  /**
   * Sit at the idle speed, so the next shot doesn't start from nothing.
   * Overriding this replaces Mechanism's own do-nothing default — the
   * constructor installs whatever this returns automatically, so nothing
   * else has to wire a default command for the wheel to idle on its own.
   */
  @Override
  public Command idle() {
    return spinUp(FlywheelConstants.kIdleSpeed);
  }

  /** Let it coast down. */
  public Command stop() {
    return run(coroutine -> {
          m_goal = RotationsPerSecond.of(0);
          m_io.stop();
        })
        .named("Stop");
  }

  /**
   * Fast enough to shoot. Note what this does NOT ask: whether the wheel has
   * settled, or which way the error is going — just whether it is close.
   */
  public boolean atSpeed() {
    return Math.abs(m_inputs.velocityRps - m_goal.in(RotationsPerSecond))
        < FlywheelConstants.kTolerance.in(RotationsPerSecond);
  }

  public AngularVelocity getSpeed() {
    return RotationsPerSecond.of(m_inputs.velocityRps);
  }
}
