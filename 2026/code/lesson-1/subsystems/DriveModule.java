package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.TalonFX;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;

public class DriveModule extends SubsystemBase {
    private final TalonFX m_driveMotor = new TalonFX(Constants.DriveConstants.kDriveMotorPort); // CAN ID 1 — change to yours

    public DriveModule() {
        // Setup that should happen when the module is created goes here.
    }

    /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
    public Command driveAtSpeed(double fraction) {
        // Motors hold whatever value you last set — command 0 yourself when done.
        return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
    }

    @Override
    public void periodic() {
        // The scheduler calls this ~50 times a second. Nothing to do here yet.
    }
}