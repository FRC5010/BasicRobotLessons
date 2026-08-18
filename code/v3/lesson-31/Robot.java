// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

import static org.wpilib.units.Units.Volts;

import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.SchedulerEvent;
import org.wpilib.command3.button.CommandGamepad;
import org.wpilib.driverstation.Alert;
import org.wpilib.driverstation.Alert.Level;
import org.wpilib.framework.OpModeRobot;
import org.wpilib.simulation.BatterySim;
import org.wpilib.simulation.RoboRioSim;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.system.DataLogManager;
import org.wpilib.system.RobotController;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.PowerConstants;
import first.robot.Constants.VisionConstants;
import first.robot.subsystems.Arm;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.Elevator;
import first.robot.subsystems.Flywheel;
import first.robot.subsystems.GamePieceDetector;
import first.robot.subsystems.Leds;
import first.robot.subsystems.Localizer;
import first.robot.subsystems.PhotonVisionPoseProvider;
import first.robot.subsystems.Superstructure;

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
  // Same trick as the cameras below: it needs localizer, which is already a
  // finished object by the time this line runs.
  public final GamePieceDetector pieceDetector = new GamePieceDetector(localizer::getPose);
  // Blank finals: building a camera needs localizer (for its pose supplier),
  // so localizer has to be a finished object first. Assigned in the
  // constructor body, below, which runs after every field initializer above.
  public final PhotonVisionPoseProvider frontCamera;
  public final PhotonVisionPoseProvider backCamera;
  public final Elevator elevator = new Elevator();
  // Arm reads elevator.getCarriage() in its constructor, so elevator must be
  // a finished object first — it already is, above.
  public final Arm arm = new Arm(elevator);
  // Superstructure reads both, so elevator and arm must be finished objects
  // first — they already are, above.
  public final Superstructure superstructure = new Superstructure(elevator, arm);
  public final Leds leds = new Leds(superstructure::getState); // reads it; drives nothing
  public final Flywheel flywheel = new Flywheel();

  /** Not an error — the robot works fine on a low battery, right up until it doesn't. */
  private final Alert m_lowBattery =
      new Alert("Battery is low — swap it before the next match", Level.MEDIUM);

  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  public Robot() {
    DataLogManager.start(); // saves every published value to a .wpilog file
    Scheduler.getDefault().addEventListener(this::logCommandStart);

    // Vision now checks its simulated eyesight against ground truth, not
    // against its own guess — the fix Lesson 15 admitted it was missing.
    frontCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, drivetrain::getSimulatedPose);
    backCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, drivetrain::getSimulatedPose);
    localizer.addProvider(frontCamera);
    localizer.addProvider(backCamera);

    // The simulated chassis starts at kSimStartingPose; tell the estimate
    // where that is instead of guessing from (0, 0, 0°).
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      localizer.resetPose(DriveConstants.kSimStartingPose);
    }
  }

  /** This function is called exactly once when the DS first connects. */
  @Override
  public void driverStationConnected() {}

  /** Runs every tick, no matter which opmode is selected or whether the robot is enabled. */
  @Override
  public void robotPeriodic() {
    Scheduler.getDefault().run();

    double batteryVolts = RobotController.getBatteryVoltage();
    SmartDashboard.putNumber("Power/TotalCurrentAmps", getTotalCurrentAmps());
    SmartDashboard.putNumber("Power/BatteryVolts", batteryVolts);
    // RobotController.isBrownedOut() never reports true in this alpha's sim,
    // however low the simulated battery goes — measured, not assumed, so
    // this compares against the threshold ourselves instead of trusting it.
    SmartDashboard.putBoolean("Power/BrownedOut", batteryVolts < PowerConstants.kBrownoutVoltage.in(Volts));

    // This one belongs to the robot rather than to any subsystem, for the
    // same reason Lesson 30's current total did: nothing smaller knows
    // about it.
    m_lowBattery.set(batteryVolts < PowerConstants.kLowBatteryVoltage.in(Volts));
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
        SmartDashboard.putString(mechanism.getName() + "/CurrentCommand", scheduled.command().name());
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
