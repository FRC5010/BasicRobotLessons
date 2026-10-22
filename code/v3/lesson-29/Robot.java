// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

import static org.wpilib.units.Units.Volts;

import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.SchedulerEvent;
import org.wpilib.command3.button.CommandGamepad;
import org.wpilib.framework.OpModeRobot;
import org.wpilib.hardware.hal.RobotMode;
import org.wpilib.simulation.BatterySim;
import org.wpilib.simulation.RoboRioSim;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.system.DataLogManager;
import org.wpilib.system.RobotController;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.PowerConstants;
import first.robot.Constants.VisionConstants;
import first.robot.commands.Autos;
import first.robot.opmode.PathAuto;
import first.robot.opmode.RobotAutoDriveToPose;
import first.robot.subsystems.Arm;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.Elevator;
import first.robot.subsystems.Flywheel;
import first.robot.subsystems.Leds;
import first.robot.subsystems.LimelightPoseProvider;
import first.robot.subsystems.Localizer;
import first.robot.subsystems.Superstructure;
import first.robot.subsystems.SuperstructureState;
import frc.robot.lib.BLine.commands.FollowPath;

/**
 * The methods in this class are called automatically as described in the OpModeRobot documentation.
 * OpMode classes anywhere in the package (or sub-packages) where this class is located are
 * automatically registered to display in the Driver Station. If you change the name of this class
 * or the package after creating this project, you must also update the Main.java file in the
 * project.
 */
public class Robot extends OpModeRobot {
  // The robot's hardware lives here — built once, when the robot boots, and
  // alive for as long as the robot runs. Opmodes are rebuilt fresh every time
  // they're selected, so they reach in and use these instead of owning them.
  public final CommandGamepad driverController = new CommandGamepad(0);
  public final Drivetrain drivetrain = new Drivetrain();
  // Localizer reads the drivetrain's kinematics/rotation/module positions at
  // construction, so drivetrain must be built first — it already is, above.
  public final Localizer localizer = new Localizer(drivetrain);
  // Blank finals: each camera is built and registered with localizer in the
  // constructor body, below, which runs after every field initializer above.
  public final LimelightPoseProvider frontCamera;
  public final LimelightPoseProvider backCamera;

  // How this robot follows a path. It's the same for every path, so it's
  // built once, here, and every autonomous opmode reaches in and uses it.
  public final FollowPath.Builder pathBuilder = Autos.makePathBuilder(drivetrain, localizer);

  public final Elevator elevator = new Elevator();
  // Arm reads elevator.getCarriage() in its constructor, so elevator must be
  // a finished object first — it already is, above. In simulation its intake
  // also needs to know where the robot really is, which only drivetrain knows.
  public final Arm arm = new Arm(elevator, drivetrain::getSimulatedPose);
  // Superstructure reads both, so elevator and arm must be finished objects
  // first — they already are, above.
  public final Superstructure superstructure = new Superstructure(elevator, arm);
  public final Leds leds = new Leds(superstructure::getState); // reads it; drives nothing
  public final Flywheel flywheel = new Flywheel();

  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  public Robot() {
    DataLogManager.start(); // saves every published value to a .wpilog file
    Scheduler.getDefault().addEventListener(this::logCommandStart);
    // Once, for the whole program. The markers now ask the superstructure for
    // things, read the pose and the wheels' speed, so they need all three —
    // already built, above.
    Autos.registerEventTriggers(superstructure, drivetrain, localizer);

    // Motion that belongs to a state, bound to being in it. No guard here:
    // being in the state at all means the state machine already said yes. The
    // moment the state changes, whileTrue cancels the old motion. HOLDING has
    // none — the elevator and arm are already where they need to be. These are
    // made here, not in an opmode, so they hold in every opmode there is.
    superstructure.inState(SuperstructureState.INTAKING).whileTrue(superstructure.intakeMotion());
    superstructure.inState(SuperstructureState.HANDOFF).whileTrue(superstructure.handoffMotion());
    superstructure.inState(SuperstructureState.SCORING).whileTrue(superstructure.scoreMotion());
    superstructure.inState(SuperstructureState.IDLE).whileTrue(superstructure.idleMotion());

    // Vision now checks its simulated eyesight against ground truth, not
    // against its own guess — the fix Lesson 15 admitted it was missing.
    frontCamera = LimelightPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, drivetrain::getSimulatedPose);
    backCamera = LimelightPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, drivetrain::getSimulatedPose);
    localizer.addProvider(frontCamera);
    localizer.addProvider(backCamera);

    // The simulated chassis starts at kSimStartingPose; tell the estimate
    // where that is instead of guessing from (0, 0, 0°).
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      localizer.resetPose(DriveConstants.kSimStartingPose);
    }

    // The path autos. Every one is the same opmode with a different path and
    // a different idea of what to do along it, so each is one line here
    // instead of a class of its own. The lambda builds the opmode when the
    // Driver Station selects it, just as an annotated class would be built.
    addOpMode(RobotMode.AUTONOMOUS, "Two Corners", "Paths",
        () -> new PathAuto(this, "TwoCorners", path -> Autos.followPath(pathBuilder, path)));
    addOpMode(RobotMode.AUTONOMOUS, "Far Side", "Paths",
        () -> new PathAuto(this, "FarSide", path -> Autos.followPath(pathBuilder, path)));
    addOpMode(RobotMode.AUTONOMOUS, "Aim While Driving", "Paths",
        () -> new PathAuto(this, "AimWhileDriving", path -> Autos.followPath(pathBuilder, path)));
    addOpMode(RobotMode.AUTONOMOUS, "Pick Up", "Paths",
        () -> new PathAuto(this, "PickUp",
            path -> Autos.followPathAndScore(pathBuilder, path, superstructure)));
    // Not a drawn path, so it has its own opmode class, but registered the same
    // way: an annotated class would be found by the scan, and this one isn't.
    addOpMode(RobotMode.AUTONOMOUS, "Drive To Pose", "Poses", () -> new RobotAutoDriveToPose(this));
    // The list went to the Driver Station before this constructor ran, with
    // only the annotated classes on it. Send it again with these added.
    publishOpModes();
  }

  /** This function is called exactly once when the DS first connects. */
  @Override
  public void driverStationConnected() {}

  /** Runs every tick, no matter which opmode is selected or whether the robot is enabled. */
  @Override
  public void robotPeriodic() {
    Scheduler.getDefault().run();

    double batteryVolts = RobotController.getBatteryVoltage();
    Telemetry.log("Power/TotalCurrentAmps", getTotalCurrentAmps());
    Telemetry.log("Power/BatteryVolts", batteryVolts);
    // Compared against the threshold here rather than read from a flag, so the
    // answer is the same on a robot and in simulation, and you choose the line.
    Telemetry.log("Power/BrownedOut", batteryVolts < PowerConstants.kBrownoutVoltage.in(Volts));
  }

  /**
   * No single mechanism knows what the others are drawing — this is the one
   * place that can add all three up.
   */
  private double getTotalCurrentAmps() {
    return elevator.getSupplyCurrentAmps() + arm.getSupplyCurrentAmps() + flywheel.getSupplyCurrentAmps();
  }

  private void logCommandStart(SchedulerEvent event) {
    if (event instanceof SchedulerEvent.Scheduled scheduled) {
      for (Mechanism mechanism : scheduled.command().requirements()) {
        Telemetry.log(mechanism.getName() + "/CurrentCommand", scheduled.command().name());
      }
    }
  }

  /** Runs every tick, but only while the code is running in simulation. */
  @Override
  public void simulationPeriodic() {
    // Empty since Lesson 13 moved every mechanism's physics inside its own IO
    // implementation. The battery doesn't fit that pattern — no single
    // mechanism owns it, and every one of them changes it — so it's the
    // first thing since then with a real reason to live here.
    RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(getTotalCurrentAmps()));
  }

  /**
   * This function is called periodically anytime when no opmode is selected, including when the
   * Driver Station is disconnected.
   */
  @Override
  public void nonePeriodic() {}
}
