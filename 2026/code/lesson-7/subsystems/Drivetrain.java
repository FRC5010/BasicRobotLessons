package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.DriveConstants;

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

    /** Drive the whole chassis at fractional velocity (vx, vy). */
    public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
        return run(() -> {
            double vx = vxSupplier.getAsDouble();
            double vy = vySupplier.getAsDouble();
            double speed = Math.hypot(vx, vy); // vector length
            double angleDeg = Math.toDegrees(Math.atan2(vy, vx)); // vector angle
            for (SwerveModule module : m_modules) {
                module.setDesiredState(angleDeg, speed);
            }
        });
    }

    /** Spin in place at fractional angular rate 'omega' (positive = CCW). */
    public Command rotate(double omega) {
        return run(() -> {
            for (SwerveModule module : m_modules) {
                double x = module.location.getX();
                double y = module.location.getY();
                double angleDeg = Math.toDegrees(Math.atan2(x, -y));
                module.setDesiredState(angleDeg, omega);
            }
        });
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
    }

    @Override
    public void simulationPeriodic() {
        for (SwerveModule module : m_modules) {
            module.simulationPeriodic();
        }
    }
}
