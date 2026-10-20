package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.wpilib.units.Units.Meters;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.RobotState;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Constants.ElevatorConstants;
import first.robot.subsystems.Elevator;

public class ElevatorHomingTest {

  private static void tick() {
    Scheduler.getDefault().run();
    try {
      Thread.sleep(20);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  @Test
  void homingReplacesTheEncodersGuessWithTheSwitchesFact() {
    // --- arrange ---
    HAL.initialize(500, 0);
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();
    assertFalse(RobotState.isDisabled(), "enable, or the scheduler cancels everything");

    Elevator elevator = new Elevator();
    for (int i = 0; i < 3; i++) {
      tick();
    }

    // --- assert the lie ---
    assertFalse(elevator.isHomed(), "nothing has homed it yet");
    assertEquals(0.0, elevator.getHeightMeters(), 0.01,
        "a relative encoder reads zero at power-on, wherever the carriage is");
    assertFalse(elevator.atBottomLimit(),
        "and the switch knows better -- the carriage is not at the bottom");

    // --- act ---
    Scheduler.getDefault().schedule(elevator.home());
    for (int i = 0; i < 300 && !elevator.isHomed(); i++) {
      tick();
    }

    // --- assert the fix ---
    assertTrue(elevator.isHomed(), "homing should have finished within 6 seconds");
    assertTrue(elevator.atBottomLimit(), "it stopped because the switch tripped");
    for (int i = 0; i < 3; i++) {
      tick();
    }
    assertEquals(ElevatorConstants.kBottomLimitHeight.in(Meters),
        elevator.getHeightMeters(), 0.02,
        "the encoder now agrees with the switch");

    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }
}
