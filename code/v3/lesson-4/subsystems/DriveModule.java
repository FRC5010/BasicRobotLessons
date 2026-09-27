package first.robot.subsystems;

import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;

import java.util.function.DoubleSupplier;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.bus.CANPort;
import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.telemetry.Telemetry;
import org.wpilib.system.RobotController;

import first.robot.Constants;

public class DriveModule implements Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, new CANBus(CANPort.CAN_S0)); // CAN ID 1 — change to yours

  // The bridge: lets us push fake sensor values into the TalonFX during sim.
  private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();

  // The physics: one Kraken X60 motor spinning a small inertia.
  // 0.001 = moment of inertia (kg*m^2), 1.0 = gear ratio (real gearing arrives in Lesson 7).
  private final DCMotorSim m_driveModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.001, 1.0),
          DCMotor.getKrakenX60(1));

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add the steering motor — a second TalonFX, with the same sim plumbing the drive
   * motor has — and a CANcoder: an absolute encoder on the steering axis that reads the
   * wheel's true angle from a magnet, giving the same answer every time the robot
   * powers on.
   */

  public DriveModule() {
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Configure the CANcoder with the magnet offset, so it reads 0 when the wheel
     * points forward. Then prime the steering motor's own relative sensor from one
     * CANcoder reading, so the motor's count is right from the first tick.
     */

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
      // Try It #1: log the commanded speed too.
      Telemetry.log("DriveModule/CommandedOutput", speed);
    }).named("Drive With Joystick");
  }

  /** Drives continuously at a fraction of the live speed source, for fine control. */
  public Command driveWithJoystick(DoubleSupplier speedSupplier, double scale) {
    return runRepeatedly(() -> {
      double raw = speedSupplier.getAsDouble();
      double speed = applyDeadband(raw, 0.1) * scale;
      m_driveMotor.setThrottle(speed);
      Telemetry.log("DriveModule/CommandedOutput", speed);
    }).named("Drive With Joystick (Slow Mode)");
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add steerToAngle: a command that turns the wheel to a target angle and holds it
   * there with proportional control — every tick, push with an output proportional to
   * the error between the target and the measured angle, clamped to full power. Stop
   * the steering motor when the command is canceled; a motor holds the last value you
   * gave it.
   */

  /** Returns 0 when |value| is within 'band', otherwise passes the value through. */
  private double applyDeadband(double value, double band) {
    if (Math.abs(value) < band) {
      return 0.0;
    }
    return value;
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add a small clamp helper that keeps a value between a minimum and a maximum, so the
   * controller never asks for more than full power.
   */

  // Try It #2: expose position as a reading, alongside the command factories.
  /** Returns the drive motor's position, in rotations since boot. */
  public double getPositionRotations() {
    return m_driveMotor.getPosition().getValue().in(Rotations);
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Add a reading that returns the steering angle in degrees, from the steering motor's
   * own sensor.
   */

  /** Advances the physics model by one tick. Only ever called in simulation. */
  public void simulatePeriodic() {
    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Step the steering motor's physics here too, alongside the drive motor's: the same
     * four steps — supply voltage in, applied voltage out, advance the model, push the
     * motion back into the fake encoder — for the second motor.
     */

    // 1. Tell the sim the battery voltage available to the motor.
    m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());

    // 2. Read the voltage the TalonFX is applying (result of your setThrottle() command).
    double appliedVolts = m_driveSim.getMotorVoltage();

    // 3. Feed that into the physics model and advance time by one tick (20 ms).
    m_driveModel.setInputVoltage(appliedVolts);
    m_driveModel.update(0.020);

    // 4. Push the model's resulting motion BACK into the TalonFX's fake encoder.
    m_driveSim.setRawRotorPosition(m_driveModel.getAngularPosition() / (2 * Math.PI));
    m_driveSim.setRotorVelocity(m_driveModel.getAngularVelocity() / (2 * Math.PI));
  }

  private void logTelemetry() {
    double rotations = m_driveMotor.getPosition().getValue().in(Rotations);
    double rps = m_driveMotor.getVelocity().getValue().in(RotationsPerSecond);

    Telemetry.log("DriveModule/PositionRotations", rotations);
    Telemetry.log("DriveModule/VelocityRotPerSec", rps);

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * Log the steering angle too, so you can plot it and watch the controller work.
     */
  }
}
