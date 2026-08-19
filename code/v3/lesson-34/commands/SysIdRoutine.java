package first.robot.commands;

import static org.wpilib.units.Units.Second;
import static org.wpilib.units.Units.Seconds;
import static org.wpilib.units.Units.Volts;

import java.util.function.Consumer;
import java.util.function.DoubleConsumer;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.sysid.SysIdRoutineLog;
import org.wpilib.system.Timer;
import org.wpilib.units.VoltageUnit;
import org.wpilib.units.measure.Time;
import org.wpilib.units.measure.Velocity;
import org.wpilib.units.measure.Voltage;

/**
 * A SysId characterization routine for a single mechanism, hand-built for Commands V3.
 *
 * <p>WPILib's own {@code SysIdRoutine} hasn't been ported to this framework yet on this alpha —
 * it still only exists for Commands V2's {@code Subsystem}/{@code Command} types. {@code
 * SysIdRoutineLog}, the actual logging primitive it writes through, has been ported, so this
 * class reproduces the real routine's two test shapes against that same log — the recorded
 * {@code .wpilog} is genuinely readable by the same SysId analysis tool, even though the class
 * driving it is this course's own rather than WPILib's.
 */
public final class SysIdRoutine {
  /** Hardware-independent configuration for a SysId test routine. */
  public record Config(Velocity<VoltageUnit> rampRate, Voltage stepVoltage, Time timeout) {
    /** 1 V/s ramp, 7 V step, 10 s timeout — the same defaults the real tool ships. */
    public Config() {
      this(Volts.of(1).per(Second), Volts.of(7), Seconds.of(10));
    }
  }

  /** Motor direction for a SysId test. */
  public enum Direction { kForward, kReverse }

  private final Config m_config;
  private final DoubleConsumer m_drive;
  private final Consumer<SysIdRoutineLog> m_log;
  private final Mechanism m_mechanism;
  private final SysIdRoutineLog m_routineLog;

  /**
   * @param config Hardware-independent parameters for the routine.
   * @param mechanism The mechanism being characterized — declared as this routine's requirement.
   * @param name The mechanism's name, as it will appear in the analysis tool.
   * @param drive Sends a raw voltage to the mechanism's motor.
   * @param log Reports the mechanism's current measurements onto the supplied log — call {@code
   *     log.motor(name).voltage(...).angularVelocity(...)} (or the linear equivalents) inside it.
   */
  public SysIdRoutine(
      Config config, Mechanism mechanism, String name, DoubleConsumer drive,
      Consumer<SysIdRoutineLog> log) {
    m_config = config;
    m_mechanism = mechanism;
    m_drive = drive;
    m_log = log;
    m_routineLog = new SysIdRoutineLog(name);
  }

  /** A slow voltage ramp, so the mechanism is never far from equilibrium: reads kS and kV. */
  public Command quasistatic(Direction direction) {
    double sign = direction == Direction.kForward ? 1.0 : -1.0;
    SysIdRoutineLog.State state = direction == Direction.kForward
        ? SysIdRoutineLog.State.QUASISTATIC_FORWARD
        : SysIdRoutineLog.State.QUASISTATIC_REVERSE;
    double rampVoltsPerSec = m_config.rampRate().in(Volts.per(Second));

    return m_mechanism.run(coroutine -> {
          Timer timer = new Timer();
          timer.start();
          while (!timer.hasElapsed(m_config.timeout().in(Seconds))) {
            m_drive.accept(sign * timer.get() * rampVoltsPerSec);
            m_log.accept(m_routineLog);
            m_routineLog.recordState(state);
            coroutine.yield();
          }
          stop();
        })
        .whenCanceled(this::stop)
        .named("SysId Quasistatic " + direction);
  }

  /** A fixed voltage step, so the mechanism accelerates hard: reads kA. */
  public Command dynamic(Direction direction) {
    double sign = direction == Direction.kForward ? 1.0 : -1.0;
    SysIdRoutineLog.State state = direction == Direction.kForward
        ? SysIdRoutineLog.State.DYNAMIC_FORWARD
        : SysIdRoutineLog.State.DYNAMIC_REVERSE;
    double stepVolts = m_config.stepVoltage().in(Volts) * sign;

    return m_mechanism.run(coroutine -> {
          Timer timer = new Timer();
          timer.start();
          while (!timer.hasElapsed(m_config.timeout().in(Seconds))) {
            m_drive.accept(stepVolts);
            m_log.accept(m_routineLog);
            m_routineLog.recordState(state);
            coroutine.yield();
          }
          stop();
        })
        .whenCanceled(this::stop)
        .named("SysId Dynamic " + direction);
  }

  /**
   * Zero volts and NONE, whether the run finished on its own or got interrupted — a coroutine
   * abandons everything after its last yield when canceled, so both endings have to say this.
   */
  private void stop() {
    m_drive.accept(0.0);
    m_routineLog.recordState(SysIdRoutineLog.State.NONE);
  }
}
