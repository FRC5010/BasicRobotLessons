package first.robot.subsystems;

import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.Alliance;
import org.wpilib.driverstation.MatchState;
import org.wpilib.driverstation.RobotState;
import org.wpilib.hardware.led.AddressableLED;
import org.wpilib.hardware.led.AddressableLEDBuffer;
import org.wpilib.hardware.led.LEDPattern;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.util.Color;

import first.robot.Constants.LedConstants;

/**
 * The strip. It owns no motors and makes no decisions about what the robot
 * does — it only decides what a human standing next to the robot gets to
 * know.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO
 * pattern exists to make sensor *inputs* replayable. There are none to
 * replay. Not a Mechanism either, for the same reason Lesson 14's
 * Localizer isn't one — it drives nothing and no command ever needs to
 * require it, so a plain {@code Scheduler.addPeriodic} heartbeat is all it
 * needs.
 */
public class Leds {
  private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
  private final AddressableLEDBuffer m_buffer = new AddressableLEDBuffer(LedConstants.kLength);

  private final Elevator m_elevator;

  public Leds(Elevator elevator) {
    m_elevator = elevator;

    m_strip.setLength(m_buffer.getLength());
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    // Ordered on purpose: the first condition that is true wins the strip.
    // Read it top to bottom as "what matters most, if it's happening."
    String showing;
    LEDPattern pattern;

    if (!m_elevator.isHomed()) {
      showing = "NotHomed";
      pattern = LedConstants.kNotHomed;
    } else if (RobotState.isDisabled()) {
      showing = "Disabled";
      pattern = LEDPattern.solid(allianceColor()).breathe(LedConstants.kBreathePeriod);
    } else {
      showing = "Idle";
      pattern = LEDPattern.solid(allianceColor()).atBrightness(LedConstants.kIdleBrightness);
    }

    pattern.applyTo(m_buffer);
    m_strip.setData(m_buffer);
    SmartDashboard.putString("Leds/Showing", showing);
  }

  /** Blue until the field tells us otherwise — getAlliance() is empty before connection. */
  private static Color allianceColor() {
    return MatchState.getAlliance()
        .map(alliance -> alliance == Alliance.RED ? Color.RED : Color.BLUE)
        .orElse(Color.BLUE);
  }
}
