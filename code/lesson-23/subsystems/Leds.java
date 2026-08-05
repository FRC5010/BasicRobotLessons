package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.wpilibj.AddressableLED;
import edu.wpi.first.wpilibj.AddressableLEDBuffer;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.LEDPattern;
import edu.wpi.first.wpilibj.util.Color;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.LedConstants;

/**
 * The strip. It owns no motors and makes no decisions about what the robot does —
 * it only decides what a human standing next to the robot gets to know.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO pattern
 * exists to make sensor *inputs* replayable. There are none to replay.
 */
public class Leds extends SubsystemBase {
    private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
    private final AddressableLEDBuffer m_buffer =
            new AddressableLEDBuffer(LedConstants.kLength);

    private final Elevator m_elevator;
    private final Arm m_arm;

    public Leds(Elevator elevator, Arm arm) {
        m_elevator = elevator;
        m_arm = arm;

        m_strip.setLength(m_buffer.getLength());
        m_strip.start();
    }

    @Override
    public void periodic() {
        // Ordered on purpose: the first condition that is true wins the strip.
        // Read it top to bottom as "what matters most, if it's happening."
        String showing;
        LEDPattern pattern;

        if (!m_elevator.isHomed()) {
            showing = "NotHomed";
            pattern = LedConstants.kNotHomed;
        } else if (m_arm.hasGamePiece()) {
            showing = "HasGamePiece";
            pattern = LedConstants.kHasGamePiece;
        } else if (DriverStation.isDisabled()) {
            showing = "Disabled";
            pattern = LEDPattern.solid(allianceColor()).breathe(LedConstants.kBreathePeriod);
        } else {
            showing = "Idle";
            pattern = LEDPattern.solid(allianceColor())
                    .atBrightness(LedConstants.kIdleBrightness);
        }

        pattern.applyTo(m_buffer);
        m_strip.setData(m_buffer);
        Logger.recordOutput("Leds/Showing", showing);
    }

    /** Blue until the field tells us otherwise — getAlliance() is empty before connection. */
    private static Color allianceColor() {
        return DriverStation.getAlliance()
                .map(alliance -> alliance == DriverStation.Alliance.Red ? Color.kRed : Color.kBlue)
                .orElse(Color.kBlue);
    }
}
