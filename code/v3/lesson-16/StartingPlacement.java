package first.robot;

import org.wpilib.math.geometry.Pose2d;

import org.littletonrobotics.junction.AutoLog;

/**
 * Where the robot was set down when it powered on, if anyone knows. The
 * simulator does, because it put the robot there; a real robot doesn't. It's
 * recorded like any other reading, so a replay knows exactly what the run knew.
 */
@AutoLog
public class StartingPlacement {
  public boolean known = false;
  public Pose2d pose = new Pose2d();
}
