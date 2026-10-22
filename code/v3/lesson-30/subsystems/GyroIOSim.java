package first.robot.subsystems;

/** Reports the heading of the real simulated chassis — no integration of its own. */
public class GyroIOSim implements GyroIO {
  private final ChassisSimulation m_chassisSim;
  private final UnplugSwitch m_unplug = new UnplugSwitch("Gyro");

  public GyroIOSim(ChassisSimulation chassisSim) {
    m_chassisSim = chassisSim;
  }

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_chassisSim.getPose().getRotation().getDegrees();
    // There's no gyro here to ask, so the switch is the whole answer.
    inputs.connected = !m_unplug.isUnplugged();
  }
}
