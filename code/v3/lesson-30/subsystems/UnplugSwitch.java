package first.robot.subsystems;

import org.wpilib.hardware.hal.SimBoolean;
import org.wpilib.hardware.hal.SimDevice;
import org.wpilib.hardware.hal.SimDevice.Direction;

/**
 * Sim only: a pretend cable, and a switch for pulling it. It shows up in
 * SimGUI's Other Devices window as "Unplug" plus the name you give it.
 * Pulling it changes exactly one thing: a sim IO that checks it reports its
 * device as not connected. Nothing else in the simulation notices.
 */
public class UnplugSwitch {
  private final SimBoolean m_unplugged;

  public UnplugSwitch(String deviceName) {
    // Null if a switch with this name already exists.
    SimDevice device = SimDevice.create("Unplug " + deviceName);
    // INPUT means the value comes from outside the robot code: from you, in
    // SimGUI, or from a test.
    m_unplugged = device != null
        ? device.createBoolean("Unplugged", Direction.INPUT, false)
        : null;
  }

  /** Has someone pulled this cable? */
  public boolean isUnplugged() {
    return m_unplugged != null && m_unplugged.get();
  }
}
