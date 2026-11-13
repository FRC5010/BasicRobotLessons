package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.Pigeon2;

import frc.robot.Constants.DriveConstants;

/** Real hardware behind the GyroIO contract: a Pigeon 2, nothing else. */
public class GyroIOPigeon2 implements GyroIO {
    private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort); // CAN ID 0 — change to yours

    @Override
    public void updateInputs(GyroIOInputs inputs) {
        inputs.yawDegrees = m_gyro.getYaw().getValueAsDouble();
    }
}
