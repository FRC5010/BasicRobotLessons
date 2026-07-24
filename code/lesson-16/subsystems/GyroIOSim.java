package frc.robot.subsystems;

import org.ironmaple.simulation.drivesims.GyroSimulation;

/**
 * Lesson 16: the fake gyro is gone. This reads maple-sim's simulated Pigeon,
 * which reports the heading of the chassis the physics engine is actually
 * rotating — with drift and measurement error, and with heading genuinely lost
 * when the robot takes a hit. Lesson 8's integrate-the-commanded-rate version
 * could never do that: a robot pinned against a wall kept "turning" forever.
 */
public class GyroIOSim implements GyroIO {
    private final GyroSimulation m_gyroSim;

    public GyroIOSim(GyroSimulation gyroSim) {
        m_gyroSim = gyroSim;
    }

    @Override
    public void updateInputs(GyroIOInputs inputs) {
        inputs.yawDegrees = m_gyroSim.getGyroReading().getDegrees();
    }
}
