package first.robot.subsystems;

/** Reports the heading of the real simulated chassis — no integration of its own. */
public class GyroIOSim implements GyroIO {
  private final ChassisSimulation m_chassisSim;
  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add the gyro's unplug switch, a pretend cable you can pull from SimGUI.
   */

  public GyroIOSim(ChassisSimulation chassisSim) {
    m_chassisSim = chassisSim;
  }

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_chassisSim.getPose().getRotation().getDegrees();
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * There's no gyro here to ask, so report it connected unless the switch is pulled.
     */
  }
}
