package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.hardware.TalonFX;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;

public class DriveModule extends SubsystemBase {
    private final TalonFX m_driveMotor = new TalonFX(Constants.DriveConstants.kDriveMotorPort); // CAN ID 1 — change to
                                                                                                // yours

    public DriveModule() {
        // Setup that should happen when the module is created goes here.
    }

    /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
    public Command driveAtSpeed(double fraction) {
        // Motors hold whatever value you last set — command 0 yourself when done.
        return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
    }

    /** Drives continuously using a live speed source (e.g. a joystick axis). */
    public Command driveWithJoystick(DoubleSupplier speedSupplier) {
        return run(() -> {
            double raw = speedSupplier.getAsDouble(); // fetch fresh value this tick
            double speed = applyDeadband(raw, 0.1); // clean it up (next section)
            m_driveMotor.set(speed);
        });
    }

    /** Drives continuously using a live speed source (e.g. a joystick axis) and a scale*/
    public Command driveWithJoystick(DoubleSupplier speedSupplier, double scale) {
        return run(() -> {
            double raw = speedSupplier.getAsDouble(); // fetch fresh value this tick
            System.out.println("Raw joystick value: " + raw); // Debugging output
            double speed = applyDeadband(raw, 0.1) * scale; // clean it up (next section)
            System.out.println("Scaled joystick value: " + speed); // Debugging output
            m_driveMotor.set(speed * Math.abs(speed));
        });
    }

    /**
     * Returns 0 when |value| is within 'band', otherwise passes the value through.
     */
    private double applyDeadband(double value, double band) {
        if (Math.abs(value) < band) {
            return 0.0;
        }
        return value;
    }

    @Override
    public void periodic() {
        // The scheduler calls this ~50 times a second. Nothing to do here yet.
    }
}