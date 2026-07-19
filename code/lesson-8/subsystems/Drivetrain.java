package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.hardware.Pigeon2;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModuleState;
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

    private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort); // CAN ID 0 — change to yours

    // Remembered for the sim: what rotation rate did we just command?
    private double m_lastCommandedOmega = 0.0;
    private double m_simHeadingDegrees = 0.0;

    /** Drive the whole chassis at fractional velocity (vx, vy). */
    public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
        return run(() -> {
            double vx = vxSupplier.getAsDouble();
            double vy = vySupplier.getAsDouble();
            double speed = Math.hypot(vx, vy);
            double angleDeg = Math.toDegrees(Math.atan2(vy, vx));
            m_lastCommandedOmega = 0.0; // pure translation leaves no rotation rate for the sim
            for (SwerveModule module : m_modules) {
                module.setDesiredState(angleDeg, speed);
            }
        });
    }

    /** Shared by rotate and turnToHeading: steer every wheel tangent and drive at 'omega'. */
    private void commandRotation(double omega) {
        m_lastCommandedOmega = omega;
        for (SwerveModule module : m_modules) {
            double x = module.location.getX();
            double y = module.location.getY();
            double angleDeg = Math.toDegrees(Math.atan2(x, -y));
            module.setDesiredState(angleDeg, omega);
        }
    }

    /** Spin in place at fractional angular rate 'omega' (positive = CCW). */
    public Command rotate(double omega) {
        return run(() -> commandRotation(omega));
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
                .finallyDo(() -> commandRotation(0.0)); // full stop when done or interrupted
    }

    /** Robot heading in degrees (CCW positive). */
    public double getHeadingDegrees() {
        return m_gyro.getYaw().getValueAsDouble();
    }

    /** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
    private double headingError(double targetDegrees) {
        double error = targetDegrees - getHeadingDegrees();
        while (error > 180) {
            error -= 360;
        }
        while (error < -180) {
            error += 360;
        }
        return error;
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
        // Treat 'omega' as fraction of "360°/sec" — max power spins us 360°/s.
        m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020; // one 20 ms tick
        m_gyro.getSimState().setRawYaw(m_simHeadingDegrees);
    }
}
