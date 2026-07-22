package frc.robot.subsystems;

import static edu.wpi.first.units.Units.MetersPerSecond;

import java.util.function.Supplier;

import com.ctre.phoenix6.hardware.Pigeon2;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
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
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.HeadingConstants;

public class Drivetrain extends SubsystemBase {
    // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
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

    // Built from the module locations — must sit below m_modules.
    private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
            m_modules[0].location,
            m_modules[1].location,
            m_modules[2].location,
            m_modules[3].location);

    private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort); // CAN ID 0 — change to yours

    // Remembered for the sim: what rotation rate did we just command?
    private double m_lastCommandedOmega = 0.0;
    private double m_simHeadingDegrees = 0.0;

    // Reads kinematics + gyro + module positions, so it sits below all three.
    private final SwerveDriveOdometry m_odometry = new SwerveDriveOdometry(
            m_kinematics,
            Rotation2d.fromDegrees(getHeadingDegrees()),
            modulePositions());

    private final Field2d m_field = new Field2d();

    public Drivetrain() {
        SmartDashboard.putData("Field", m_field); // top-down field view inside SimGUI
    }

    /** One tick of chassis motion: convert, desaturate, optimize, command. */
    private void applyChassisSpeeds(ChassisSpeeds speeds) {
        SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);

        // desaturateWheelSpeeds takes a LinearVelocity directly — pass kMaxSpeed as-is.
        SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeed);

        m_lastCommandedOmega = speeds.omegaRadiansPerSecond / (2 * Math.PI); // rev/s for sim

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
                    -0.5, 0.5); // clamp to ±50% turn power
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
                    m_lastCommandedOmega = 0.0;
                }))
                .until(() -> Math.abs(m_modules[0].getDistanceMeters()) >= Math.abs(meters))
                .finallyDo(() -> {
                    for (SwerveModule module : m_modules) {
                        module.setDesiredState(new SwerveModuleState()); // zero speed, stop
                    }
                });
    }

    /** Drive toward a field-coordinate pose with three stacked P controllers. */
    public Command driveToPose(Pose2d target) {
        double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond); // hand-rolled P math needs a double
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

    /** Robot heading in degrees (CCW positive). */
    public double getHeadingDegrees() {
        return m_gyro.getYaw().getValueAsDouble();
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
        // periodic() watches (reads + logs); commands do the acting.
        SwerveModuleState[] states = new SwerveModuleState[4];
        int index = 0;
        for (SwerveModule module : m_modules) {
            Logger.recordOutput("Drivetrain/Module" + index + "/SteerAngleDegrees",
                    module.getSteerAngleDegrees());
            states[index] = new SwerveModuleState(
                    module.getDriveVelocityMetersPerSec(),
                    Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
            index++;
        }
        Logger.recordOutput("Drivetrain/ModuleStates", states);

        Logger.recordOutput("Drivetrain/HeadingDegrees", getHeadingDegrees());
        Logger.recordOutput("Drivetrain/Heading", Rotation2d.fromDegrees(getHeadingDegrees()));

        // Fold this tick's motion into the running pose, then log and draw it.
        m_odometry.update(Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());
        Logger.recordOutput("Drivetrain/Pose", getPose());
        m_field.setRobotPose(getPose());
    }

    @Override
    public void simulationPeriodic() {
        for (SwerveModule module : m_modules) {
            module.simulationPeriodic();
        }

        // Integrate the commanded angular rate into a fake heading.
        m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020; // one 20 ms tick
        m_gyro.getSimState().setRawYaw(m_simHeadingDegrees);
    }
}
