package first.robot.subsystems;

public class GyroIOSim implements GyroIO {
  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Replace these two bookkeeping fields with the shared simulated chassis, handed in
   * through a new constructor. setSimRotationRate at the bottom goes away entirely.
   */
  private double m_lastCommandedOmega = 0.0;
  private double m_simHeadingDegrees = 0.0;

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Report the simulated chassis's heading instead of integrating a commanded rate.
     */
    // Lesson 8's integration: add rate x time, every tick.
    m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;
    inputs.yawDegrees = m_simHeadingDegrees;
  }

  @Override
  public void setSimRotationRate(double omegaRevPerSec) {
    m_lastCommandedOmega = omegaRevPerSec;
  }
}
