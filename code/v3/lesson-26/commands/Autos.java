package first.robot.commands;

import static org.wpilib.units.Units.Meters;

import java.util.Optional;

import org.wpilib.command3.Command;
import org.wpilib.driverstation.Alliance;
import org.wpilib.driverstation.MatchState;
import org.wpilib.math.controller.PIDController;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.PathConstants;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.Elevator;
import first.robot.subsystems.Localizer;
import first.robot.subsystems.Superstructure;
import frc.robot.lib.BLine.commands.FollowPath;
import frc.robot.lib.BLine.commands.FollowPath.RotationOverrideBehavior;
import frc.robot.lib.BLine.field.FlippingUtil;
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

  /**
   * Get somewhere exactly, in two stages: cover ground on firm limits, then hand
   * over, still moving, to a gentler approach that picks up from however the
   * robot is really moving and finishes stopped on the spot.
   */
  public static Command driveToScoringPose(Drivetrain drivetrain, Localizer localizer) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(drivetrain.travelToward(PathConstants.kScoringPose, localizer::getPose));
          coroutine.await(drivetrain.approach(PathConstants.kScoringPose, localizer::getPose));
        })
        .named("Drive To Scoring Pose");
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

  /** One drawn path, as a command. */
  public static Command followPath(FollowPath.Builder pathBuilder, Path path) {
    return handingRotationBack(pathBuilder.build(path)
        .withPoseReset()); // start by telling the estimate we're at the path's start
  }

  /**
   * The same path, asking to score over the last stretch of it. Whether the
   * robot really has something to score is the superstructure's call, not
   * this command's: if it doesn't, the request is refused and logged.
   */
  public static Command followPathAndScore(
      FollowPath.Builder pathBuilder, Path path, Superstructure superstructure) {
    // Keep the FollowPath itself, not just a Command: only it can say how much
    // path is left, and wrapping it would hide that.
    FollowPath follow = pathBuilder.build(path).withPoseReset();
    Command scoreNearTheEnd = Command.noRequirements(coroutine -> {
          // Until the path has run once, "distance left" reads 0.0, which looks
          // exactly like "arrived". So first wait for a real answer...
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters() > 0);
          // ...then for the answer you actually want.
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
              < PathConstants.kScoreDistance.in(Meters));
          coroutine.await(superstructure.requestScore());
        })
        .named("Score Near The End");
    return handingRotationBack(Command.parallel(follow, scoreNearTheEnd).named("Follow And Score"));
  }

  /**
   * Gets the mechanisms where an auto expects them, then runs it: home the
   * elevator, wait for the superstructure to settle in IDLE, and only then
   * start. A coroutine awaiting each step, not Command.sequence: a sequence
   * holds every step's mechanisms until its last step ends, so it would keep
   * the elevator from the superstructure for the whole auto.
   */
  public static Command getReadyThen(Elevator elevator, Superstructure superstructure, Command auto) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(elevator.home()); // done at once if it's already on the switch
          coroutine.waitUntil(superstructure::isSettled); // IDLE stows everything first
          coroutine.await(auto);
        })
        .named("Get Ready, Then " + auto.name());
  }

  /**
   * Runs a path auto, then gives rotation back to the path follower however it
   * ended. The override is a static setting that outlives whatever set it,
   * and a path can't finish while something else is steering it.
   */
  private static Command handingRotationBack(Command auto) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(auto);
          FollowPath.clearRotationOverride(); // it finished
        })
        .whenCanceled(FollowPath::clearRotationOverride) // it was canceled, or autonomous ended
        .named(auto.name());
  }

  /** Where a path starts, on this alliance's side of the field — the same flip BLine makes. */
  public static Pose2d startPose(Path path) {
    Pose2d start = path.getAuthoredStartPose().get(); // every path here starts with a waypoint
    boolean red = MatchState.getAlliance().orElse(Alliance.BLUE) == Alliance.RED;
    return red ? FlippingUtil.flipFieldPose(start) : start;
  }

  /**
   * How fast to spin, in radians per second, to point at the target. The
   * override asks for a rate rather than a heading, so the aiming loop is
   * yours — the same P control you wrote by hand back in Lesson 8.
   */
  private static double aimOmega(Localizer localizer) {
    Pose2d pose = localizer.getPose();
    // The direction of the arrow from the robot to the target. It's empty when
    // the arrow has no length: standing on the target, no way is "toward" it.
    Optional<Rotation2d> desired = PathConstants.kAimTarget.minus(pose.getTranslation()).getAngle();
    if (desired.isEmpty()) {
      return 0.0;
    }
    return desired.get().minus(pose.getRotation()).getRadians() * PathConstants.kAimP;
  }

  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * The aim marker will need the drivetrain too, to know how fast the robot is
   * moving, so this takes it as a parameter.
   */
  public static void registerEventTriggers(Superstructure superstructure, Localizer localizer) {
    // Ask for the intake before the robot gets there, so it arrives already
    // collecting. The superstructure does the rest: it drops the arm, runs the
    // roller, and hands the piece off once the beam break sees it.
    FollowPath.registerEventTrigger("intake", superstructure.requestIntake());

    // Hand rotation to the aiming loop, and later give it back. Translation
    // keeps following the path the whole time — only the spin changes hands.
    // ====== NEXT LESSON: CHANGE THE CODE BELOW ======
    // Point the override at the new tag-aiming code instead of aimOmega, which
    // then has nothing left to do: delete it, and the imports only it used.
    FollowPath.registerEventTrigger("aim", () -> FollowPath.overrideRotation(
        () -> aimOmega(localizer), RotationOverrideBehavior.RESPECT_CONSTRAINTS));
    FollowPath.registerEventTrigger("release", FollowPath::clearRotationOverride);
  }
}
