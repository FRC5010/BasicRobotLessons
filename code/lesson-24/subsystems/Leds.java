package frc.robot.subsystems;

import java.util.function.Supplier;

import edu.wpi.first.wpilibj.AddressableLED;
import edu.wpi.first.wpilibj.AddressableLEDBuffer;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.LEDPattern;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.LedConstants;

/**
 * The strip. It knows one thing — what the robot is doing — and nothing at all
 * about how the robot worked that out. No Elevator, no Arm, no sensors.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO pattern
 * exists to make sensor *inputs* replayable. There are none to replay.
 */
public class Leds extends SubsystemBase {
    private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
    private final AddressableLEDBuffer m_buffer =
            new AddressableLEDBuffer(LedConstants.kLength);

    private final Supplier<SuperstructureState> m_state;

    public Leds(Supplier<SuperstructureState> state) {
        m_state = state;

        m_strip.setLength(m_buffer.getLength());
        m_strip.start();
    }

    @Override
    public void periodic() {
        // The state says what the robot is doing. Being disabled says whether
        // anyone can act on it. Two questions, so two lines.
        LEDPattern pattern = m_state.get().pattern();
        if (DriverStation.isDisabled()) {
            pattern = pattern.breathe(LedConstants.kBreathePeriod);
        }

        pattern.applyTo(m_buffer);
        m_strip.setData(m_buffer);
    }
}
