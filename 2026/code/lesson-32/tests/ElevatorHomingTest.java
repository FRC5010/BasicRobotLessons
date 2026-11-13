package frc.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import frc.robot.Constants.ElevatorConstants;
import frc.robot.subsystems.Elevator;

import static edu.wpi.first.units.Units.Meters;

/**
 * Lesson 21's claim, checked: a relative encoder reads zero at power-on wherever
 * the carriage actually is, and homing is what replaces that guess with a fact.
 *
 * <p>One test method, on purpose. A DigitalInput holds its DIO channel for the
 * life of the JVM, so a second Elevator in a second test would fail to allocate.
 */
public class ElevatorHomingTest {

    /** One robot tick: run the scheduler, then wait as long as a real tick takes. */
    private static void tick() {
        CommandScheduler.getInstance().run();
        try {
            Thread.sleep(20); // the full 20 ms — see the lesson on why
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Test
    void homingReplacesTheEncodersGuessWithTheSwitchesFact() {
        // --- arrange ---------------------------------------------------------
        HAL.initialize(500, 0);
        DriverStationSim.setDsAttached(true);
        DriverStationSim.setEnabled(true);
        DriverStationSim.notifyNewData();
        DriverStation.refreshData();
        assertFalse(DriverStation.isDisabled(), "enable, or the scheduler cancels everything");

        Elevator elevator = new Elevator();
        for (int i = 0; i < 3; i++) {
            tick();
        }

        // --- assert the lie --------------------------------------------------
        // The simulated carriage is sitting at kSimStartHeight, well up the rails.
        assertFalse(elevator.isHomed(), "nothing has homed it yet");
        assertEquals(0.0, elevator.getHeightMeters(), 0.01,
                "a relative encoder reads zero at power-on, wherever the carriage is");
        assertFalse(elevator.atBottomLimit(),
                "and the switch knows better — the carriage is not at the bottom");

        // --- act -------------------------------------------------------------
        CommandScheduler.getInstance().schedule(elevator.home());
        for (int i = 0; i < 300 && !elevator.isHomed(); i++) {
            tick();
        }

        // --- assert the fix --------------------------------------------------
        assertTrue(elevator.isHomed(), "homing should have finished within 6 seconds");
        assertTrue(elevator.atBottomLimit(), "it stopped because the switch tripped");
        for (int i = 0; i < 3; i++) {
            tick(); // setPositionMeters needs a couple of ticks to read back
        }
        assertEquals(ElevatorConstants.kBottomLimitHeight.in(Meters),
                elevator.getHeightMeters(), 0.02,
                "the encoder now agrees with the switch");

        CommandScheduler.getInstance().cancelAll();
        HAL.shutdown();
    }
}
