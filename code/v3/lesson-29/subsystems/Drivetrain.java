package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.Radians;

import java.util.function.Supplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.controller.ProfiledPIDController;
import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.ChassisVelocities;
import org.wpilib.math.kinematics.SwerveDriveKinematics;
import org.wpilib.math.kinematics.SwerveModulePosition;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.math.trajectory.TrapezoidProfile;
import org.wpilib.math.util.MathUtil;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.LinearVelocity;

import first.robot.Constants;
import first.robot.Constants.DriveConstants;
import first.robot.Constants.HeadingConstants;
import first.robot.Constants.PathConstants;

public class Drivetrain implements Mechanism, PoseProvider {
  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
  private final SwerveModule[] m_modules = new SwerveModule[] {
      makeModule(0, DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
          DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
          DriveConstants.kFrontLeft),
      makeModule(1, DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
          DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,
          DriveConstants.kFrontRight),
      makeModule(2, DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
          DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,
          DriveConstants.kBackLeft),
      makeModule(3, DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
          DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,
          DriveConstants.kBackRight)
  };

  private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
      m_modules[0].location,
      m_modules[1].location,
      m_modules[2].location,
      m_modules[3].location);

  // The chassis's ground truth in the physics world — one, shared, null on
  // a real robot (which already has a world) and in replay (which needs none).
  private static final ChassisSimulation m_chassisSim = createChassisSim();

  private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
    case REAL -> new GyroIOPigeon2();
    case SIM -> new GyroIOSim(m_chassisSim);
    case REPLAY -> new GyroIO() {}; // inputs come from the log
  };
  private final GyroIO.GyroIOInputs m_gyroInputs = new GyroIO.GyroIOInputs();
  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add an alert for a gyro that isn't on the CAN bus.
   */

  // Getting somewhere on a plan. One profile says how far along a straight line
  // the robot should be by now, and how fast it should be going; the other does
  // the same for which way it faces. Fields, not locals, because arrived() has
  // to read what the last tick worked out.
  private final ProfiledPIDController m_alongController = makeAlongController();
  private final ProfiledPIDController m_headingController = makeHeadingController();

  public Drivetrain() {
    Scheduler.getDefault().addPeriodic(this::periodic);
    Scheduler.getDefault().addPeriodic(this::simulateChassis);
  }

  /** Builds the shared chassis ground truth. Sim only — null everywhere else. */
  private static ChassisSimulation createChassisSim() {
    if (Constants.kCurrentMode != Constants.Mode.SIM) {
      return null; // a real robot already has a world; replay doesn't need one
    }
    return new ChassisSimulation(DriveConstants.kSimStartingPose);
  }

  /** Builds the right ModuleIO for the current mode, then wraps it in a SwerveModule. */
  private static SwerveModule makeModule(
      int index, int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      Translation2d location) {
    ModuleIO io = switch (Constants.kCurrentMode) {
      case REAL -> new ModuleIOTalonFX(driveId, steerId, cancoderId, magnetOffsetRotations);
      case SIM -> new ModuleIOSim(driveId, steerId, cancoderId, magnetOffsetRotations);
      case REPLAY -> new ModuleIO() {}; // inputs come from the log
    };
    return new SwerveModule(io, "Drivetrain/Module" + index, location);
  }

  /** One tick of chassis motion: convert, desaturate, optimize, command. */
  private void applyChassisSpeeds(ChassisVelocities speeds) {
    SwerveModuleVelocity[] states = m_kinematics.toSwerveModuleVelocities(speeds);

    // If the request would drive some wheel past the max, scale ALL wheels
    // down proportionally so the *shape* of the motion is preserved.
    // desaturateWheelVelocities takes a LinearVelocity directly — pass kMaxSpeed as-is.
    states = SwerveDriveKinematics.desaturateWheelVelocities(states, DriveConstants.kMaxSpeed);

    for (int i = 0; i < m_modules.length; i++) {
      states[i] = states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
      m_modules[i].setDesiredState(states[i]);
    }

    Telemetry.log("Drivetrain/DesiredModuleStates", states, SwerveModuleVelocity.struct);
  }

  /** Drive with full swerve freedom: translate and rotate at once. */
  public Command drive(
      Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
    return runRepeatedly(
            () -> applyChassisSpeeds(new ChassisVelocities(vx.get(), vy.get(), omega.get())))
        .named("Drive");
  }

  /** Same as drive(), but 'forward' always means away from the driver station. */
  public Command driveFieldRelative(
      Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
    return runRepeatedly(() -> {
      ChassisVelocities fieldSpeeds = new ChassisVelocities(vx.get(), vy.get(), omega.get());
      applyChassisSpeeds(fieldSpeeds.toRobotRelative(Rotation2d.fromDegrees(getHeadingDegrees())));
    }).named("Drive Field Relative");
  }

  /** Turn to face 'targetDegrees'. Finishes when within 2°. */
  public Command turnToHeading(double targetDegrees) {
    return run(coroutine -> {
          while (Math.abs(headingError(targetDegrees)) >= 2.0) {
            double omega = clamp(
                HeadingConstants.kP * headingError(targetDegrees),
                -0.5, 0.5); // clamp to ±50% turn power
            commandRotation(omega);
            coroutine.yield();
          }
          commandRotation(0.0); // reached it — stop
        })
        .whenCanceled(() -> commandRotation(0.0)) // interrupted — stop
        .named("Turn To Heading");
  }

  /** Drive straight forward 'meters' at 40% power. Finishes on its own. */
  public Command driveDistance(double meters) {
    return run(coroutine -> {
          m_modules[0].resetDrivePosition(); // zero one wheel's odometer
          while (Math.abs(m_modules[0].getDistanceMeters()) < Math.abs(meters)) {
            for (SwerveModule module : m_modules) {
              module.setDesiredState(
                  new SwerveModuleVelocity(DriveConstants.kMaxSpeed.times(0.4), Rotation2d.fromDegrees(0)));
            }
            coroutine.yield();
          }
          for (SwerveModule module : m_modules) {
            module.setDesiredState(new SwerveModuleVelocity()); // reached it — stop
          }
        })
        .whenCanceled(() -> {
          for (SwerveModule module : m_modules) {
            module.setDesiredState(new SwerveModuleVelocity()); // interrupted — stop
          }
        })
        .named("Drive Distance");
  }

  /** Along the line: P to trim the plan, and what counts as arrived — there, and stopped. */
  private static ProfiledPIDController makeAlongController() {
    ProfiledPIDController controller =
        new ProfiledPIDController(PathConstants.kAlignP, 0, 0, PathConstants.kTravelLimits);
    controller.setTolerance(
        PathConstants.kPositionTolerance.in(Meters), PathConstants.kSpeedTolerance.in(MetersPerSecond));
    return controller;
  }

  /** The heading: profiled too, and told that -180 and +180 are the same place. */
  private static ProfiledPIDController makeHeadingController() {
    ProfiledPIDController controller =
        new ProfiledPIDController(PathConstants.kAlignThetaP, 0, 0, PathConstants.kTurnLimits);
    controller.enableContinuousInput(-Math.PI, Math.PI);
    controller.setTolerance(PathConstants.kAngleTolerance.in(Radians));
    return controller;
  }

  /** Where 'current' sits relative to a line: x is how far along it, y how far off to the left. */
  private static Translation2d inLineFrame(Translation2d start, Rotation2d direction, Pose2d current) {
    return current.getTranslation().minus(start).rotateBy(direction.unaryMinus());
  }

  /**
   * Start a stage's plan from how the robot is really moving right now, under
   * this stage's limits. A plan that assumed the robot was standing still
   * would ask a moving robot to stop dead on its first tick.
   */
  private void startStage(Pose2d current, Rotation2d direction, TrapezoidProfile.Constraints limits) {
    ChassisVelocities moving = getChassisVelocities().toFieldRelative(current.getRotation());
    Translation2d velocity = new Translation2d(moving.vx, moving.vy);
    m_alongController.setConstraints(limits);
    m_alongController.reset(0.0, velocity.rotateBy(direction.unaryMinus()).getX());
    m_headingController.reset(current.getRotation().getRadians(), moving.omega);
  }

  /**
   * One tick of a stage: keep to the plan along the line, steer back onto the
   * line, and turn toward the target's heading. Each speed is the plan's own
   * speed, plus P on how far the robot has drifted from the plan.
   */
  private void followLine(Translation2d start, Rotation2d direction, Pose2d target, Pose2d current) {
    Translation2d where = inLineFrame(start, direction, current);
    double alongCorrection = m_alongController.calculate(where.getX()); // also moves the plan on a tick
    double alongSpeed = m_alongController.getSetpoint().velocity + alongCorrection;
    double acrossSpeed = -PathConstants.kCrossTrackP * where.getY();
    Translation2d velocity = new Translation2d(alongSpeed, acrossSpeed).rotateBy(direction);

    double turnCorrection = m_headingController.calculate(
        current.getRotation().getRadians(), target.getRotation().getRadians());
    double omega = m_headingController.getSetpoint().velocity + turnCorrection;

    ChassisVelocities fieldSpeeds = new ChassisVelocities(velocity.getX(), velocity.getY(), omega);
    applyChassisSpeeds(fieldSpeeds.toRobotRelative(current.getRotation()));
  }

  /**
   * Stage one: cover ground. Firm limits, and it finishes a short way out while
   * still moving, so stage two takes over from a robot in motion.
   */
  public Command travelToward(Pose2d target, Supplier<Pose2d> pose) {
    return run(coroutine -> {
          Pose2d current = pose.get();
          Translation2d start = current.getTranslation();
          Translation2d toTarget = target.getTranslation().minus(start);
          Rotation2d direction = toTarget.getAngle().orElse(current.getRotation()); // already there: any way will do
          double handoff = toTarget.getNorm() - PathConstants.kHandoffDistance.in(Meters);

          startStage(current, direction, PathConstants.kTravelLimits);
          m_alongController.setGoal(
              new TrapezoidProfile.State(handoff, PathConstants.kHandoffSpeed.in(MetersPerSecond)));
          while (inLineFrame(start, direction, current).getX() < handoff) {
            followLine(start, direction, target, current);
            coroutine.yield();
            current = pose.get();
          }
          // No stop here: stage two takes over from a robot that's still moving.
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // interrupted — stop
        .named("Travel Toward");
  }

  /**
   * Stage two: arrive. Gentler limits, a plan that starts from however the robot
   * is really moving, and a finish that waits until it's there, on the line,
   * facing the right way, and stopped.
   */
  public Command approach(Pose2d target, Supplier<Pose2d> pose) {
    return run(coroutine -> {
          Pose2d current = pose.get();
          Translation2d start = current.getTranslation();
          Translation2d toTarget = target.getTranslation().minus(start);
          Rotation2d direction = toTarget.getAngle().orElse(current.getRotation());

          startStage(current, direction, PathConstants.kApproachLimits);
          m_alongController.setGoal(toTarget.getNorm()); // the end of the line, stopped
          do {
            followLine(start, direction, target, current);
            coroutine.yield();
            current = pose.get();
          } while (!arrived(start, direction, current));
          applyChassisSpeeds(new ChassisVelocities()); // arrived — stop
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // interrupted — stop
        .named("Approach");
  }

  /** Arrived: at the end of the line and stopped, on the line, and facing the right way. */
  private boolean arrived(Translation2d start, Rotation2d direction, Pose2d current) {
    double offLine = Math.abs(inLineFrame(start, direction, current).getY());
    return m_alongController.atGoal()
        && offLine < PathConstants.kPositionTolerance.in(Meters)
        && m_headingController.atGoal();
  }

  /** One tick of pure rotation: steer every wheel tangent to the circle. */
  private void commandRotation(double omegaRevPerSec) {
    applyChassisSpeeds(new ChassisVelocities(0, 0, omegaRevPerSec * 2 * Math.PI));
  }

  /** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
  private double headingError(double targetDegrees) {
    return MathUtil.inputModulus(targetDegrees - getHeadingDegrees(), -180, 180);
  }

  /** Keeps 'value' between 'min' and 'max'. */
  private double clamp(double value, double min, double max) {
    if (value > max) {
      return max;
    } else if (value < min) {
      return min;
    } else {
      return value;
    }
  }

  public SwerveDriveKinematics getKinematics() {
    return m_kinematics;
  }

  /** Robot heading in degrees (CCW positive). */
  public double getHeadingDegrees() {
    return m_gyroInputs.yawDegrees;
  }

  /** Heading as a Rotation2d — what the estimator speaks. */
  public Rotation2d getRotation() {
    return Rotation2d.fromDegrees(getHeadingDegrees());
  }

  /** Snapshot the four modules' positions into one array — for odometry. */
  public SwerveModulePosition[] getModulePositions() {
    SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];
    for (int i = 0; i < m_modules.length; i++) {
      positions[i] = m_modules[i].getPosition();
    }
    return positions;
  }

  /**
   * How the chassis is moving right now, robot-relative — kinematics run
   * backward: four measured wheel velocities in, one chassis motion out.
   */
  public ChassisVelocities getChassisVelocities() {
    SwerveModuleVelocity[] wheels = new SwerveModuleVelocity[m_modules.length];
    for (int i = 0; i < m_modules.length; i++) {
      wheels[i] = new SwerveModuleVelocity(
          m_modules[i].getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
    }
    return m_kinematics.toChassisVelocities(wheels);
  }

  /** Drive one tick from a robot-relative chassis motion. The door BLine drives through. */
  public void driveRobotRelative(ChassisVelocities speeds) {
    applyChassisSpeeds(speeds);
  }

  /** As a PoseProvider, the drivetrain contributes wheel-and-gyro odometry. */
  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    estimator.update(getRotation(), getModulePositions());
  }

  /** Moves the simulated chassis the way its wheels actually turned this tick. Sim only. */
  private void simulateChassis() {
    if (m_chassisSim == null) {
      return; // a real robot moves itself
    }
    m_chassisSim.update(getChassisVelocities(), 0.020);
  }

  /** Where the chassis really is, ground truth — null outside sim. */
  public Pose2d getSimulatedPose() {
    return m_chassisSim != null ? m_chassisSim.getPose() : null;
  }

  /**
   * Sim only: set the simulated chassis down at 'pose', the job a person does
   * before a real match. Does nothing on a real robot.
   */
  public void placeSimulatedRobot(Pose2d pose) {
    if (m_chassisSim != null) {
      m_chassisSim.placeAt(pose);
    }
  }

  private void periodic() {
    m_gyroIO.updateInputs(m_gyroInputs);
    Telemetry.log("Drivetrain/Gyro/YawDegrees", m_gyroInputs.yawDegrees);
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Log whether the gyro is connected, and set the alert every tick.
     */

    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      module.periodic(); // refresh + log this module's inputs
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    Telemetry.log("Drivetrain/ModuleStates", states, SwerveModuleVelocity.struct);

    Telemetry.log("Drivetrain/HeadingDegrees", getHeadingDegrees());
    Telemetry.log("Drivetrain/Heading", Rotation2d.fromDegrees(getHeadingDegrees()), Rotation2d.struct);

    if (m_chassisSim != null) {
      Telemetry.log("Drivetrain/SimulatedPose", m_chassisSim.getPose(), Pose2d.struct);
    }
  }
}
