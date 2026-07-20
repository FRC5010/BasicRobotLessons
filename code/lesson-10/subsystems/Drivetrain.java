package frc.robot.subsystems;

import java.util.function.Supplier;

import com.ctre.phoenix6.hardware.Pigeon2;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.LinearVelocity;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.HeadingConstants;

public class Drivetrain extends SubsystemBase {
    // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
    private final SwerveModule[] m_modules = new SwerveModule[] {
            new SwerveModule(DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
                    DriveConstants.kFrontLeft),
            new SwerveModule(DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
                    DriveConstants.kFrontRight),
            new SwerveModule(DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
                    DriveConstants.kBackLeft),
            new SwerveModule(DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
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

    /** One tick of chassis motion: convert, desaturate, optimize, command. */
    private void applyChassisSpeeds(ChassisSpeeds speeds) {
        SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);

        // If the request would drive some wheel past the max, scale ALL wheels
        // down proportionally so the *shape* of the motion is preserved.
        // desaturateWheelSpeeds accepts a LinearVelocity directly — no unpacking.
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
        // ChassisSpeeds takes the unit measures directly — no conversion here.
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
                        // times(0.4) scales the max-speed measure — stays a LinearVelocity.
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

    /** Robot heading in degrees (CCW positive). */
    public double getHeadingDegrees() {
        return m_gyro.getYaw().getValueAsDouble();
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
