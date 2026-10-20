package first.robot.commands;

import java.util.Optional;

import org.wpilib.command3.Command;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Translation2d;

import first.robot.Constants.PathConstants;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.GamePieceDetector;
import first.robot.subsystems.Localizer;
import first.robot.subsystems.Superstructure;

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
   * Get somewhere exactly, in two stages: cross the field with the coarse,
   * five-centimeter sketch from Lesson 11, then close the last stretch with
   * the align controllers, which check rotation too.
   */
  public static Command driveToScoringPose(Drivetrain drivetrain, Localizer localizer) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(drivetrain.driveToPose(PathConstants.kScoringPose, localizer::getPose));
          coroutine.await(drivetrain.alignToPose(PathConstants.kScoringPose, localizer::getPose));
        })
        .named("Drive To Scoring Pose");
  }

  /**
   * Where to stand to collect a piece: at the piece, facing the way we came, so
   * the intake gets there first.
   */
  private static Pose2d collectPose(Pose2d robot, Translation2d piece) {
    return new Pose2d(piece, piece.minus(robot.getTranslation()).getAngle());
  }

  /**
   * Go and get whatever the camera can see right now, running the intake on
   * the way.
   *
   * <p>The approach pose can't be picked at startup, because at startup
   * nobody has seen anything — {@code requiring(...).executing(...)} builds
   * the actual drive command from inside its own body, the moment it starts,
   * which is the first time a detection exists to build it from. Declaring
   * the requirement up front is the price: the command doesn't exist yet, so
   * the scheduler can't work it out on its own.
   */
  public static Command fetchPiece(
      Drivetrain drivetrain, Localizer localizer, GamePieceDetector detector,
      Superstructure superstructure) {
    return Command.requiring(drivetrain)
        .executing(coroutine -> {
          Optional<Translation2d> piece = detector.bestPiece();
          if (piece.isEmpty()) {
            return; // saw nothing — undramatic: the intake still deploys, the robot doesn't move
          }
          // Legality is Superstructure's call, not this method's — if a
          // request to intake isn't allowed right now, it's silently
          // refused exactly like any other button-bound request would be.
          coroutine.await(superstructure.requestIntake());
          coroutine.await(drivetrain.driveToPose(
              collectPose(localizer.getPose(), piece.get()), localizer::getPose));
        })
        .named("Fetch Piece");
  }
}
