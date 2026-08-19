package first.robot.subsystems;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.ChassisVelocities;
import org.wpilib.math.util.MathUtil;

import first.robot.Constants.DriveConstants;

/**
 * One shared chassis body, moving under a grip-limited acceleration instead
 * of teleporting to whatever speed was commanded. Ground truth — the
 * Drivetrain's own estimate is still built from wheel encoders alone, and
 * the two can disagree exactly the way they would on a real robot.
 */
public class ChassisSimulation {
  private Pose2d m_pose;
  private ChassisVelocities m_velocity = new ChassisVelocities();

  public ChassisSimulation(Pose2d startingPose) {
    m_pose = startingPose;
  }

  /** Advance the chassis by one tick, chasing 'commanded' as hard as grip allows. */
  public void update(ChassisVelocities commanded, double dtSeconds) {
    Translation2d nextVelocityXY = MathUtil.slewRateLimit(
        new Translation2d(m_velocity.vx, m_velocity.vy),
        new Translation2d(commanded.vx, commanded.vy),
        DriveConstants.kMaxAccelMps2,
        dtSeconds);
    double omega = chaseOmega(m_velocity.omega, commanded.omega, dtSeconds);
    m_velocity = new ChassisVelocities(nextVelocityXY.getX(), nextVelocityXY.getY(), omega);

    // Exact integration: how far a constant twist carries the chassis,
    // curved turns included, not just a straight-line approximation.
    m_pose = m_pose.plus(m_velocity.toTwist2d(dtSeconds).exp());
  }

  /** Move 'current' toward 'target', never faster than the grip-limited angular rate. */
  private double chaseOmega(double current, double target, double dtSeconds) {
    double maxStep = DriveConstants.kMaxAngularAccelRadPerSec2 * dtSeconds;
    double error = target - current;
    if (error > maxStep) {
      return current + maxStep;
    } else if (error < -maxStep) {
      return current - maxStep;
    } else {
      return target;
    }
  }

  public Pose2d getPose() {
    return m_pose;
  }
}
