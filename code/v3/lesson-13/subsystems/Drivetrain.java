package first.robot.subsystems;

import static org.wpilib.units.Units.MetersPerSecond;

import java.util.function.Supplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.ChassisVelocities;
import org.wpilib.math.kinematics.SwerveDriveKinematics;
import org.wpilib.math.kinematics.SwerveDriveOdometry;
import org.wpilib.math.kinematics.SwerveModulePosition;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.math.util.MathUtil;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;
import org.wpilib.networktables.StructPublisher;
import org.wpilib.smartdashboard.Field2d;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.LinearVelocity;

import first.robot.Constants;
import first.robot.Constants.DriveConstants;
import first.robot.Constants.HeadingConstants;

public class Drivetrain extends Mechanism {
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

  private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
    case REAL -> new GyroIOPigeon2();
    case SIM -> new GyroIOSim();
    case REPLAY -> new GyroIO() {}; // inputs come from the log
  };
  private final GyroIO.GyroIOInputs m_gyroInputs = new GyroIO.GyroIOInputs();

  // Odometry reads the kinematics, the gyro, and the modules' starting
  // positions — everything above this line has to exist first.
  private final SwerveDriveOdometry m_odometry = new SwerveDriveOdometry(
      m_kinematics,
      Rotation2d.fromDegrees(getHeadingDegrees()),
      modulePositions());

  private final Field2d m_field = new Field2d();

  // Structured topics: publish a whole labeled value at once, so
  // AdvantageScope's Swerve tab can draw it, not just plot numbers.
  private final StructArrayPublisher<SwerveModuleVelocity> m_moduleStatesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("Drivetrain/ModuleStates", SwerveModuleVelocity.struct)
          .publish();
  private final StructArrayPublisher<SwerveModuleVelocity> m_desiredModuleStatesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("Drivetrain/DesiredModuleStates", SwerveModuleVelocity.struct)
          .publish();
  private final StructPublisher<Rotation2d> m_headingPublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Drivetrain/Heading", Rotation2d.struct)
          .publish();
  private final StructPublisher<Pose2d> m_posePublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Drivetrain/Pose", Pose2d.struct)
          .publish();

  public Drivetrain() {
    SmartDashboard.putData("Field", m_field);
    Scheduler.getDefault().addPeriodic(this::logTelemetry);
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

    m_gyroIO.setSimRotationRate(speeds.omega / (2 * Math.PI)); // rev/s for sim

    for (int i = 0; i < m_modules.length; i++) {
      states[i] = states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
      m_modules[i].setDesiredState(states[i]);
    }

    m_desiredModuleStatesPublisher.set(states);
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
            m_gyroIO.setSimRotationRate(0.0);
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

  /** Drive straight toward 'target' using P control, field-relative. Finishes within 5 cm. */
  public Command driveToPose(Pose2d target) {
    double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond); // convert once, reuse
    return runRepeatedly(() -> {
          Pose2d current = getPose();
          double dx = target.getX() - current.getX();
          double dy = target.getY() - current.getY();
          double vx = clamp(1.5 * dx, -maxMps, maxMps);
          double vy = clamp(1.5 * dy, -maxMps, maxMps);
          double omega = clamp(
              3.0 * target.getRotation().minus(current.getRotation()).getRadians(),
              -Math.PI, Math.PI);
          ChassisVelocities fieldSpeeds = new ChassisVelocities(vx, vy, omega);
          applyChassisSpeeds(fieldSpeeds.toRobotRelative(current.getRotation()));
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // reached it or interrupted — stop
        .until(() -> getPose().minus(target).getTranslation().getNorm() < 0.05)
        .named("Drive To Pose");
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

  /** Robot heading in degrees (CCW positive). */
  public double getHeadingDegrees() {
    return m_gyroInputs.yawDegrees;
  }

  /** Where odometry currently believes the robot is. */
  public Pose2d getPose() {
    return m_odometry.getPose();
  }

  /** Tell odometry the robot is actually at 'pose' right now. */
  public void resetPose(Pose2d pose) {
    m_odometry.resetPosition(
        Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions(), pose);
  }

  /** Snapshot the four modules' positions into one array — used by odometry. */
  private SwerveModulePosition[] modulePositions() {
    SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];
    for (int i = 0; i < m_modules.length; i++) {
      positions[i] = m_modules[i].getPosition();
    }
    return positions;
  }

  private void logTelemetry() {
    m_gyroIO.updateInputs(m_gyroInputs);
    SmartDashboard.putNumber("Drivetrain/Gyro/YawDegrees", m_gyroInputs.yawDegrees);

    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      module.periodic(); // refresh + log this module's inputs
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    m_moduleStatesPublisher.set(states);

    SmartDashboard.putNumber("Drivetrain/HeadingDegrees", getHeadingDegrees());
    m_headingPublisher.set(Rotation2d.fromDegrees(getHeadingDegrees()));

    Pose2d pose = m_odometry.update(Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());
    m_posePublisher.set(pose);
    m_field.setRobotPose(pose);
  }
}
