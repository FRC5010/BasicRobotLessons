package frc.robot.subsystems;

/**
 * No hardware at all: the fake gyro from Lesson 8, behind the GyroIO
 * contract. It integrates the commanded rotation rate into a heading.
 */
public class GyroIOSim implements GyroIO {
    private double m_lastCommandedOmega = 0.0;
    private double m_simHeadingDegrees = 0.0;

    @Override
    public void updateInputs(GyroIOInputs inputs) {
        // Lesson 8's integration: add rate × time, every tick.
        m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;
        inputs.yawDegrees = m_simHeadingDegrees;
    }

    @Override
    public void setSimRotationRate(double omegaRevPerSec) {
        m_lastCommandedOmega = omegaRevPerSec;
    }
}
