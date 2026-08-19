package first.robot.subsystems;

/** Reports the heading of the real simulated chassis — no integration of its own. */
public class GyroIOSim implements GyroIO {
  private final ChassisSimulation m_chassisSim;

  public GyroIOSim(ChassisSimulation chassisSim) {
    m_chassisSim = chassisSim;
  }

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_chassisSim.getPose().getRotation().getDegrees();
  }
}
