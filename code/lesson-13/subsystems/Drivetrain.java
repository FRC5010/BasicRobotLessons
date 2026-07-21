package frc.robot.subsystems;

import static edu.wpi.first.units.Units.MetersPerSecond;

import java.util.function.Supplier;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveDriveOdometry;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.LinearVelocity;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.HeadingConstants;

public class Drivetrain extends SubsystemBase {
    // Corner order: FL, FR, BL, BR. Each module gets an IO chosen by the mode.
    private final SwerveModule[] m_modules = new SwerveModule[] {
            makeModule(0, DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
                    DriveConstants.kFrontLeft),
            makeModule(1, DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
                    DriveConstants.kFrontRight),
            makeModule(2, DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
                    DriveConstants.kBackLeft),
            makeModule(3, DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
                    DriveConstants.kBackRight)
    };

    private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
            m_modules[0].location,
            m_modules[1].location,
            m_modules[2].location,
            m_modules[3].location);

    private final GyroIO m_gyroIO = Constants.kCurrentMode == Constants.Mode.REPLAY
            ? new GyroIO() {}
            : new GyroIOPigeon2();
    private final GyroIOInputsAutoLogged m_gyroInputs = new GyroIOInputsAutoLogged();

    private final SwerveDriveOdometry m_odometry = new SwerveDriveOdometry(
            m_kinematics,
            Rotation2d.fromDegrees(getHeadingDegrees()),
            modulePositions());

    private final Field2d m_field = new Field2d();

    public Drivetrain() {
        SmartDashboard.putData("Field", m_field);
    }

    /** Pick a module's IO from the current mode: real/sim hardware, or a no-op for replay. */
    private static SwerveModule makeModule(
            int index, int driveId, int steerId, Translation2d location) {
        ModuleIO io = Constants.kCurrentMode == Constants.Mode.REPLAY
                ? new ModuleIO() {} // replay: inputs come from the log
                : new ModuleIOTalonFX(driveId, steerId); // real & sim: actual hardware
        return new SwerveModule(io, "Drivetrain/Module" + index, location);
    }

    /** One tick of chassis motion: convert, desaturate, optimize, command. */
    private void applyChassisSpeeds(ChassisSpeeds speeds) {
        SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);
        SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeed);

        m_gyroIO.setSimRotationRate(speeds.omegaRadiansPerSecond / (2 * Math.PI)); // rev/s for sim

        for (int i = 0; i < m_modules.length; i++) {
            states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
            m_modules[i].setDesiredState(states[i]);
        }

        Logger.recordOutput("Drivetrain/DesiredModuleStates", states);
    }

    /** Drive with full swerve freedom: translate and rotate at once (robot frame). */
    public Command drive(
            Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
        return run(() -> applyChassisSpeeds(new ChassisSpeeds(vx.get(), vy.get(), omega.get())));
    }

    /** Drive in the field frame: "forward" is away from the driver, whatever way we face. */
    public Command driveFieldRelative(
            Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
        return run(() -> {
            ChassisSpeeds fieldSpeeds = new ChassisSpeeds(vx.get(), vy.get(), omega.get());
            applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
                    fieldSpeeds, Rotation2d.fromDegrees(getHeadingDegrees())));
        });
    }

    /** 'omega' is revolutions per second (0.5 = half a turn per second). */
    private void commandRotation(double omegaRevPerSec) {
        applyChassisSpeeds(new ChassisSpeeds(0, 0, omegaRevPerSec * 2 * Math.PI));
    }

    /** Turn to face 'targetDegrees'. Finishes when within 2°. */
    public Command turnToHeading(double targetDegrees) {
        return run(() -> {
            double omega = MathUtil.clamp(
                    HeadingConstants.kP * headingError(targetDegrees),
                    -0.5, 0.5);
            commandRotation(omega);
        })
                .until(() -> Math.abs(headingError(targetDegrees)) < 2.0)
                .finallyDo(() -> commandRotation(0.0));
    }

    /** Drive straight forward 'meters' at 40% of max speed. Finishes on its own. */
    public Command driveDistance(double meters) {
        return runOnce(() -> m_modules[0].resetDrivePosition())
                .andThen(run(() -> {
                    for (SwerveModule module : m_modules) {
                        module.setDesiredState(new SwerveModuleState(
                                DriveConstants.kMaxSpeed.times(0.4), Rotation2d.fromDegrees(0)));
                    }
                    m_gyroIO.setSimRotationRate(0.0);
                }))
                .until(() -> Math.abs(m_modules[0].getDistanceMeters()) >= Math.abs(meters))
                .finallyDo(() -> {
                    for (SwerveModule module : m_modules) {
                        module.setDesiredState(new SwerveModuleState());
                    }
                });
    }

    /** Drive toward a field-coordinate pose with three stacked P controllers. */
    public Command driveToPose(Pose2d target) {
        double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond);
        return run(() -> {
            Pose2d current = getPose();
            double dx = target.getX() - current.getX();
            double dy = target.getY() - current.getY();
            double vx = MathUtil.clamp(1.5 * dx, -maxMps, maxMps);
            double vy = MathUtil.clamp(1.5 * dy, -maxMps, maxMps);
            double omega = MathUtil.clamp(
                    3.0 * target.getRotation().minus(current.getRotation()).getRadians(),
                    -Math.PI, Math.PI);
            applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
                    vx, vy, omega, current.getRotation()));
        }).until(() -> getPose().minus(target).getTranslation().getNorm() < 0.05);
    }

    public Pose2d getPose() {
        return m_odometry.getPoseMeters();
    }

    public void resetPose(Pose2d pose) {
        m_odometry.resetPosition(
                Rotation2d.fromDegrees(getHeadingDegrees()),
                modulePositions(),
                pose);
    }

    /** Robot heading in degrees (CCW positive) — read from the gyro's logged inputs. */
    public double getHeadingDegrees() {
        return m_gyroInputs.yawDegrees;
    }

    /** Snapshot the four modules' positions into one array — used by odometry. */
    private SwerveModulePosition[] modulePositions() {
        SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];
        for (int i = 0; i < m_modules.length; i++) {
            positions[i] = m_modules[i].getPosition();
        }
        return positions;
    }

    /** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
    private double headingError(double targetDegrees) {
        return MathUtil.inputModulus(targetDegrees - getHeadingDegrees(), -180, 180);
    }

    @Override
    public void periodic() {
        // Inputs first: refresh + log the gyro, then each module.
        m_gyroIO.updateInputs(m_gyroInputs);
        Logger.processInputs("Drivetrain/Gyro", m_gyroInputs);

        SwerveModuleState[] states = new SwerveModuleState[4];
        for (int i = 0; i < m_modules.length; i++) {
            m_modules[i].periodic(); // refresh + log this module's inputs
            states[i] = new SwerveModuleState(
                    m_modules[i].getDriveVelocityMetersPerSec(),
                    Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
        }
        Logger.recordOutput("Drivetrain/ModuleStates", states);
        Logger.recordOutput("Drivetrain/Heading", Rotation2d.fromDegrees(getHeadingDegrees()));

        // Fold this tick's motion into the running pose, then log and draw it.
        m_odometry.update(Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());
        Logger.recordOutput("Drivetrain/Pose", getPose());
        m_field.setRobotPose(getPose());
    }
}
