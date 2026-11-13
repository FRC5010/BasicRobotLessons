package frc.robot.subsystems;

import java.util.Queue;

import com.ctre.phoenix6.hardware.Pigeon2;

import frc.robot.Constants.DriveConstants;

/** Real hardware behind the GyroIO contract: a Pigeon 2, nothing else. */
public class GyroIOPigeon2 implements GyroIO {
    private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort); // CAN ID 0 — change to yours
    private final Queue<Double> m_yawQueue =
            OdometryThread.getInstance().register(m_gyro.getYaw());

    @Override
    public void updateInputs(GyroIOInputs inputs) {
        inputs.yawDegrees = m_gyro.getYaw().getValueAsDouble();
        inputs.odometryYawDegrees =
                m_yawQueue.stream().mapToDouble(Double::doubleValue).toArray();
        m_yawQueue.clear();
    }
}
