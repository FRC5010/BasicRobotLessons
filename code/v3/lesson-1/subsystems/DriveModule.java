package first.robot.subsystems;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.TalonFX;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.hardware.bus.CANPort;

import first.robot.Constants;

public class DriveModule implements Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, new CANBus(CANPort.CAN_S0)); // CAN ID 1 — change to yours

  public DriveModule() {
    // Setup that should happen when the module is created goes here.
  }

  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    return run(coroutine -> {
      m_driveMotor.setThrottle(fraction);
      coroutine.park();
    })
        .whenCanceled(() -> m_driveMotor.setThrottle(0))
        .named("Drive At Speed");
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add driveWithJoystick: a second command factory that takes a live speed source — a
   * DoubleSupplier — and asks it for a fresh value every tick, so the motor follows the
   * stick instead of one fixed number. Clean each reading with a small private deadband
   * helper, so a centered stick that reads 0.03 doesn't leave the motor creeping.
   */
}
