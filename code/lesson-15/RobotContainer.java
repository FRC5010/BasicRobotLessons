// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import java.util.function.Supplier;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.OperatorConstants;
import frc.robot.Constants.VisionConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;
import frc.robot.subsystems.PhotonVisionPoseProvider;
import frc.robot.subsystems.VisionIO;
import frc.robot.subsystems.VisionIOPhotonVision;
import frc.robot.subsystems.VisionIOPhotonVisionSim;

public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  // Declaration order matters: the scheduler ticks subsystems in construction
  // order, and the localizer reads inputs the drivetrain refreshes.
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final PhotonVisionPoseProvider m_frontCamera = makeCamera(
      VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, () -> m_localizer.getPose());
  private final PhotonVisionPoseProvider m_backCamera = makeCamera(
      VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, () -> m_localizer.getPose());
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain

  // Publishes a drop-down AND logs the selection (AdvantageKit).
  private final LoggedDashboardChooser<Command> m_autoChooser =
      new LoggedDashboardChooser<>("Auto Choice");

  public RobotContainer() {
    m_localizer.addProvider(m_frontCamera);
    m_localizer.addProvider(m_backCamera);

    configureBindings();

    m_autoChooser.addDefaultOption("Drive-Turn-Drive", Autos.driveTurnDrive(m_drivetrain));
    m_autoChooser.addOption("Do Nothing", Commands.none());
  }

  private void configureBindings() {
    // Full swerve, field-relative: left stick translates, right stick rotates.
    // Each stick fraction (-1..1) scales a max-speed measure into a velocity —
    // no unit unpacking, because drive() takes the measures directly.
    m_drivetrain.setDefaultCommand(
        m_drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftY()), // forward = +X
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftX()), // left = +Y
            () -> DriveConstants.kMaxAngularSpeed.times(-m_driverController.getRightX())));

    // Tap A to turn to 90°, B to return to 0°. These commands finish on their own.
    m_driverController.a().onTrue(m_drivetrain.turnToHeading(90));
    m_driverController.b().onTrue(m_drivetrain.turnToHeading(0));
  }

  /**
   * Picks each camera's real/sim/replay IO the same way Drivetrain picks
   * each module's. poseSupplier is only used in sim, to tell the fake
   * field where the robot currently is.
   */
  private static PhotonVisionPoseProvider makeCamera(
      String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    VisionIO io = switch (Constants.kCurrentMode) {
      case REAL -> new VisionIOPhotonVision(name, robotToCamera);
      case SIM -> new VisionIOPhotonVisionSim(name, robotToCamera, poseSupplier);
      case REPLAY -> new VisionIO() {}; // inputs come from the log
    };
    return new PhotonVisionPoseProvider(io, "Localizer/" + name);
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.get();
  }
}
