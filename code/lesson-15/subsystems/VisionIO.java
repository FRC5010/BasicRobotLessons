package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

import edu.wpi.first.math.geometry.Pose3d;

public interface VisionIO {
    @AutoLog
    public static class VisionIOInputs {
        public PoseObservation[] poseObservations = new PoseObservation[0];
    }

    /** One camera frame's worth of evidence: a candidate pose and how many tags built it. */
    public static record PoseObservation(double timestampSeconds, Pose3d pose, int tagCount) {}

    public default void updateInputs(VisionIOInputs inputs) {}
}
