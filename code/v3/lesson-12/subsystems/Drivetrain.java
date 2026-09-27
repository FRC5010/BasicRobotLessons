package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.MetersPerSecond;

import java.util.function.Supplier;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.Pigeon2;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.bus.CANPort;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.kinematics.ChassisVelocities;
import org.wpilib.math.kinematics.SwerveDriveKinematics;
import org.wpilib.math.kinematics.SwerveDriveOdometry;
import org.wpilib.math.kinematics.SwerveModulePosition;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.math.util.MathUtil;
import org.wpilib.smartdashboard.Field2d;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.LinearVelocity;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.HeadingConstants;

public class Drivetrain implements Mechanism {
  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Build each corner with makeModule instead of new SwerveModule, passing the corner's
   * index along with its CAN IDs, magnet offset and location from DriveConstants.
   */

  private final SwerveModule[] m_modules = new SwerveModule[] {
      new SwerveModule(DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
          DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
          DriveConstants.kFrontLeft),
      new SwerveModule(DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
          DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,
          DriveConstants.kFrontRight),
      new SwerveModule(DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
          DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,
          DriveConstants.kBackLeft),
      new SwerveModule(DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
          DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,
          DriveConstants.kBackRight)
  };

  private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
      m_modules[0].location,
      m_modules[1].location,
      m_modules[2].location,
      m_modules[3].location);

  /**
   * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
   * Replace the Pigeon 2 with a GyroIO picked by the same kind of three-arm switch as
   * the modules — the Pigeon 2 implementation, the sim implementation, or an empty one
   * for replay — plus the inputs bundle it fills. The two sim bookkeeping fields below
   * move into the sim gyro, so delete them.
   */

  private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort, new CANBus(CANPort.CAN_S0));

  // Odometry reads the kinematics, the gyro, and the modules' starting
  // positions — everything above this line has to exist first.
  private final SwerveDriveOdometry m_odometry = new SwerveDriveOdometry(
      m_kinematics,
      Rotation2d.fromDegrees(getHeadingDegrees()),
      modulePositions());

  private final Field2d m_field = new Field2d();

  // Remembered for the sim: what rotation rate did we just command?

  private double m_lastCommandedOmega = 0.0;
  private double m_simHeadingDegrees = 0.0;

  public Drivetrain() {
    Telemetry.log("Field", m_field);
    Scheduler.getDefault().addPeriodic(this::logTelemetry);
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add makeModule, a small static helper: a switch expression on the current mode
   * picks the module's IO — TalonFX hardware on a real robot, the sim IO in simulation,
   * an empty anonymous IO in replay — and it wraps that IO in a SwerveModule with a log
   * key and the module's location.
   */

  /** One tick of chassis motion: convert, desaturate, optimize, command. */
  private void applyChassisSpeeds(ChassisVelocities speeds) {
    SwerveModuleVelocity[] states = m_kinematics.toSwerveModuleVelocities(speeds);

    // If the request would drive some wheel past the max, scale ALL wheels
    // down proportionally so the *shape* of the motion is preserved.
    // desaturateWheelVelocities takes a LinearVelocity directly — pass kMaxSpeed as-is.
    states = SwerveDriveKinematics.desaturateWheelVelocities(states, DriveConstants.kMaxSpeed);

    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Hand the commanded rotation rate to the gyro IO instead of storing it here; only
     * the sim gyro does anything with it.
     */

    m_lastCommandedOmega = speeds.omega / (2 * Math.PI); // rev/s for sim

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

            /**
             * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
             * Hand the gyro IO a rotation rate of 0 instead.
             */

            m_lastCommandedOmega = 0.0;
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
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Read the heading from the gyro's inputs bundle instead of from the Pigeon 2
     * directly.
     */

    return m_gyro.getYaw().getValue().in(Degrees);
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
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Read the gyro into its inputs bundle first thing, and log the yaw. Then, inside
     * the module loop, have each module read and log its own inputs in place of this
     * steering-angle log.
     */

    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      Telemetry.log("Drivetrain/Module" + index + "/SteerAngleDegrees",
          module.getSteerAngleDegrees());
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    Telemetry.log("Drivetrain/ModuleStates", states, SwerveModuleVelocity.struct);

    Telemetry.log("Drivetrain/HeadingDegrees", getHeadingDegrees());
    Telemetry.log("Drivetrain/Heading", Rotation2d.fromDegrees(getHeadingDegrees()), Rotation2d.struct);

    Pose2d pose = m_odometry.update(Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());
    Telemetry.log("Drivetrain/Pose", pose, Pose2d.struct);
    m_field.setRobotPose(pose);
  }

  /** Advances every module's physics model, then the fake gyro. Only ever called in simulation. */
  public void simulatePeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulatePeriodic();
    }

    // Integrate the commanded angular rate into a fake heading. Treat 'omega'
    // as a fraction of "360°/sec" — max power spins us 360°/s.
    m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020; // one 20 ms tick
    m_gyro.getSimState().setRawYaw(m_simHeadingDegrees);
  }
}
