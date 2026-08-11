package first.robot.subsystems;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.TalonFX;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;

import first.robot.Constants;

public class DriveModule extends Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, CANBus.systemcore(0)); // CAN ID 1 — change to yours

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
}
