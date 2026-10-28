package first.robot.subsystems;

import java.util.function.Supplier;

import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.RobotState;
import org.wpilib.hardware.led.AddressableLED;
import org.wpilib.hardware.led.AddressableLEDBuffer;
import org.wpilib.hardware.led.LEDPattern;

import first.robot.Constants.LedConstants;

/**
 * The strip. It knows one thing — what the robot is doing — and nothing at
 * all about how the robot worked that out. No Elevator, no Arm, no sensors.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO
 * pattern exists to make sensor *inputs* replayable. There are none to
 * replay. Not a Mechanism either, for the same reason Superstructure isn't
 * one — it drives nothing and no command ever needs to require it, so a
 * plain {@code Scheduler.addPeriodic} heartbeat is all it needs.
 */
public class Leds {
  private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
  private final AddressableLEDBuffer m_buffer = new AddressableLEDBuffer(LedConstants.kLength);

  private final Supplier<SuperstructureState> m_state;

  public Leds(Supplier<SuperstructureState> state) {
    m_state = state;

    m_strip.setLength(m_buffer.getLength());
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    // The state says what the robot is doing. Being disabled says whether
    // anyone can act on it. Two questions, so two lines.
    LEDPattern pattern = m_state.get().pattern();
    if (RobotState.isDisabled()) {
      pattern = pattern.breathe(LedConstants.kBreathePeriod);
    }

    pattern.applyTo(m_buffer);
    m_strip.setData(m_buffer);
  }
}
