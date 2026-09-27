package first.robot.commands;

import org.wpilib.command3.Command;
import org.wpilib.math.controller.PIDController;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.PathConstants;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.Localizer;
import frc.robot.lib.BLine.commands.FollowPath;
import frc.robot.lib.BLine.following.DriveType;
import frc.robot.lib.BLine.path.Path;

public final class Autos {
  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(drivetrain.driveDistance(1.0));  // step 1: forward 1 meter
          coroutine.await(drivetrain.turnToHeading(90));   // step 2: face 90°
          coroutine.await(drivetrain.driveDistance(1.0));  // step 3: forward 1 meter
        })
        .named("Drive Turn Drive");
  }

  /** Everything about following a path that doesn't depend on which path it is. */
  public static FollowPath.Builder makePathBuilder(Drivetrain drivetrain, Localizer localizer) {
    return new FollowPath.Builder(
        DriveType.SWERVE,                  // what kind of drivetrain this is
        drivetrain,                        // the mechanism the command will require
        localizer::getPose,                // where we are (fused, Lesson 14)
        localizer::resetPose,              // how to tell the estimate where we are
        drivetrain::getChassisVelocities,  // how fast we're going, robot-relative
        drivetrain::driveRobotRelative,    // how to make the robot move
        new PIDController(PathConstants.kTranslationP, 0, 0),
        new PIDController(PathConstants.kRotationP, 0, 0),
        new PIDController(PathConstants.kCrossTrackP, 0, 0))
        .withDefaultShouldFlip()           // mirror the path for the red alliance
        .withTelemetry(Telemetry.getTable()); // log what the follower is doing
  }

  /** One drawn path, as a command. The file is deploy/autos/paths/<pathName>.json. */
  public static Command followPath(FollowPath.Builder pathBuilder, String pathName) {
    return pathBuilder.build(new Path(pathName))
        .withPoseReset(); // start by telling the estimate we're at the path's start
  }

  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers() {
    // Nothing on this robot can shoot yet, so it just says so in the console.
    FollowPath.registerEventTrigger("shoot", () -> System.out.println("Event: shoot!"));
  }
}
