package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.system.RobotController;

import first.robot.Constants;
import first.robot.Constants.DriveConstants;
import first.robot.Constants.SteerConstants;

public class DriveModule extends Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, CANBus.systemcore(0)); // CAN ID 1 — change to yours

  // The bridge: lets us push fake sensor values into the TalonFX during sim.
  private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();

  // The physics: one Kraken X60 motor, geared down 6.75:1, spinning a wheel-side inertia.
  private final DCMotorSim m_driveModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(
              DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),
          DCMotor.getKrakenX60(1));

  private final TalonFX m_steerMotor =
      new TalonFX(Constants.DriveConstants.kSteerMotorPort, CANBus.systemcore(0)); // CAN ID 2 — change to yours

  // Sim plumbing for the steering motor (same pattern as the drive motor).
  private final TalonFXSimState m_steerSim = m_steerMotor.getSimState();
  private final DCMotorSim m_steerModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.004, 1.0),
          DCMotor.getKrakenX60(1));

  private final CANcoder m_steerEncoder =
      new CANcoder(Constants.DriveConstants.kCancoderPort, CANBus.systemcore(0)); // CAN ID 3 — change to yours

  public DriveModule() {
    // Calibrate the CANcoder's zero to "wheel pointing forward"...
    CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
    cancoderConfig.MagnetSensor.MagnetOffset = SteerConstants.kMagnetOffset;
    m_steerEncoder.getConfigurator().apply(cancoderConfig);

    // ...then prime the steering motor's own sensor to match it, once.
    m_steerMotor.setPosition(m_steerEncoder.getAbsolutePosition().getValue().in(Rotations));

    Scheduler.getDefault().addPeriodic(this::logTelemetry);
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

  /** Drives continuously using a live speed source (e.g. a joystick axis). */
  public Command driveWithJoystick(DoubleSupplier speedSupplier) {
    return runRepeatedly(() -> {
      double raw = speedSupplier.getAsDouble();   // fetch fresh value this tick
      double speed = applyDeadband(raw, 0.1);     // clean it up
      m_driveMotor.setThrottle(speed);
      // Try It #1 (Lesson 3): log the commanded speed too.
      SmartDashboard.putNumber("DriveModule/CommandedOutput", speed);
    }).named("Drive With Joystick");
  }

  /** Drives continuously at a fraction of the live speed source, for fine control. */
  public Command driveWithJoystick(DoubleSupplier speedSupplier, double scale) {
    return runRepeatedly(() -> {
      double raw = speedSupplier.getAsDouble();
      double speed = applyDeadband(raw, 0.1) * scale;
      m_driveMotor.setThrottle(speed);
      SmartDashboard.putNumber("DriveModule/CommandedOutput", speed);
    }).named("Drive With Joystick (Slow Mode)");
  }

  /** Turns the steering motor toward 'targetDegrees' and holds it there. */
  public Command steerToAngle(double targetDegrees) {
    return runRepeatedly(() -> {
          double measurement = getSteerAngleDegrees();  // where we are
          double error = targetDegrees - measurement;   // how far off (degrees)

          // Try It #1 (Lesson 5): take the short way around instead of the long way.
          while (error > 180) {
            error -= 360;
          }
          while (error < -180) {
            error += 360;
          }

          double output = SteerConstants.kP * error;    // push proportional to error
          output = clamp(output, -1.0, 1.0);             // never exceed full power

          m_steerMotor.setThrottle(output);
        })
        // Same lesson as Lesson 1: motors HOLD the last value you set. When this
        // command is interrupted, its per-tick math stops running — so unless we
        // command 0 in cleanup, the motor keeps applying whatever fraction it was
        // last given and the wheel drifts.
        .whenCanceled(() -> m_steerMotor.setThrottle(0))
        .named("Steer To Angle");
  }

  /** Drives forward 'meters' at 'speed', then stops. Finishes on its own. */
  public Command driveDistance(double meters, double speed) {
    return run(coroutine -> {
          m_driveMotor.setPosition(0);                            // 1. zero the encoder
          m_driveMotor.setThrottle(speed);                        // 2. drive...
          coroutine.waitUntil(() -> getDistanceMeters() >= meters); // 3. ...until far enough
          m_driveMotor.setThrottle(0);                            // 4. reached it — stop
        })
        // The coroutine body only covers the "finished on its own" ending.
        // If something else takes the module away first, the body's next line
        // never runs — so the "interrupted" ending needs its own cleanup here.
        .whenCanceled(() -> m_driveMotor.setThrottle(0))
        .named("Drive Distance");
  }

  /** Returns 0 when |value| is within 'band', otherwise passes the value through. */
  private double applyDeadband(double value, double band) {
    if (Math.abs(value) < band) {
      return 0.0;
    }
    return value;
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

  // Try It #2 (Lesson 3): expose position as a reading, alongside the command factories.
  /** Returns the drive motor's position, in rotations since boot. */
  public double getPositionRotations() {
    return m_driveMotor.getPosition().getValue().in(Rotations);
  }

  /** Current steering angle in degrees. */
  public double getSteerAngleDegrees() {
    return m_steerMotor.getPosition().getValue().in(Degrees);
  }

  /** How far this module's wheel has driven, in meters, since the last reset. */
  public double getDistanceMeters() {
    double rotorRotations = m_driveMotor.getPosition().getValue().in(Rotations);
    double wheelRotations = rotorRotations / DriveConstants.kDriveGearRatio;
    return wheelRotations * DriveConstants.kWheelCircumferenceMeters;
  }

  /** Advances the physics model by one tick. Only ever called in simulation. */
  public void simulatePeriodic() {
    // 1. Tell the sim the battery voltage available to each motor.
    m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());

    // 2. Read the voltage each TalonFX is applying (result of your setThrottle() command).
    double driveVolts = m_driveSim.getMotorVoltage();
    double steerVolts = m_steerSim.getMotorVoltage();

    // 3. Feed that into each physics model and advance time by one tick (20 ms).
    m_driveModel.setInputVoltage(driveVolts);
    m_driveModel.update(0.020);
    m_steerModel.setInputVoltage(steerVolts);
    m_steerModel.update(0.020);

    // 4. Push each model's resulting motion BACK into its TalonFX's fake encoder.
    // The drive model now reports WHEEL motion (it knows about the gearbox), but the
    // TalonFX's fake encoder lives on the ROTOR — so multiply back up by the gear ratio.
    m_driveSim.setRawRotorPosition(
        m_driveModel.getAngularPosition() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);
    m_driveSim.setRotorVelocity(
        m_driveModel.getAngularVelocity() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);
    m_steerSim.setRawRotorPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));
    m_steerSim.setRotorVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));
  }

  private void logTelemetry() {
    double rotations = m_driveMotor.getPosition().getValue().in(Rotations);
    double rps = m_driveMotor.getVelocity().getValue().in(RotationsPerSecond);

    SmartDashboard.putNumber("DriveModule/PositionRotations", rotations);
    SmartDashboard.putNumber("DriveModule/VelocityRotPerSec", rps);
    SmartDashboard.putNumber("DriveModule/SteerAngleDegrees", getSteerAngleDegrees());
    SmartDashboard.putNumber("DriveModule/DistanceMeters", getDistanceMeters());
  }
}
