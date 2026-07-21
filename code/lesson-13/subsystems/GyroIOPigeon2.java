package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.Pigeon2;

import edu.wpi.first.wpilibj.RobotBase;
import frc.robot.Constants.DriveConstants;

/** Real hardware behind the GyroIO contract: a Pigeon 2, plus the fake-gyro sim. */
public class GyroIOPigeon2 implements GyroIO {
    private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort); // CAN ID 0 — change to yours
    private double m_lastCommandedOmega = 0.0;
    private double m_simHeadingDegrees = 0.0;

    @Override
    public void updateInputs(GyroIOInputs inputs) {
        if (RobotBase.isSimulation()) {
            // Lesson 8's integration, relocated: add rate × time, every tick.
            m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;
            m_gyro.getSimState().setRawYaw(m_simHeadingDegrees);
        }
        inputs.yawDegrees = m_gyro.getYaw().getValueAsDouble();
    }

    @Override
    public void setSimRotationRate(double omegaRevPerSec) {
        m_lastCommandedOmega = omegaRevPerSec;
    }
}
