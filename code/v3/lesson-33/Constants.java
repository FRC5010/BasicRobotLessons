// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot;

import static org.wpilib.units.Units.Amps;
import static org.wpilib.units.Units.Centimeters;
import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.DegreesPerSecond;
import static org.wpilib.units.Units.DegreesPerSecondPerSecond;
import static org.wpilib.units.Units.Inches;
import static org.wpilib.units.Units.Kilograms;
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.MetersPerSecondPerSecond;
import static org.wpilib.units.Units.Percent;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.Seconds;
import static org.wpilib.units.Units.Volts;

import org.wpilib.framework.RobotBase;
import org.wpilib.hardware.led.LEDPattern;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Rotation3d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.geometry.Translation3d;
import org.wpilib.units.measure.Angle;
import org.wpilib.units.measure.AngularAcceleration;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.Current;
import org.wpilib.units.measure.Dimensionless;
import org.wpilib.units.measure.Distance;
import org.wpilib.units.measure.LinearAcceleration;
import org.wpilib.units.measure.LinearVelocity;
import org.wpilib.units.measure.Mass;
import org.wpilib.units.measure.Time;
import org.wpilib.units.measure.Voltage;
import org.wpilib.util.Color;
import org.wpilib.util.Color8Bit;
import org.wpilib.vision.apriltag.AprilTagFieldLayout;
import org.wpilib.vision.apriltag.AprilTagFields;

public final class Constants {
  public enum Mode { REAL, SIM, REPLAY }

  /** Change kSimMode to Mode.REPLAY to re-run a log file instead of simulating fresh. */
  public static final Mode kSimMode = Mode.SIM;
  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;

  // One CAN ID + one magnet offset per corner, all named, instead of
  // literals baked into the array in Drivetrain.
  public static final class DriveConstants {
    public static final int kFrontLeftDrivePort = 1;     // CAN IDs — change to yours
    public static final int kFrontLeftSteerPort = 2;
    public static final int kFrontLeftCancoderPort = 9;
    public static final int kFrontRightDrivePort = 3;
    public static final int kFrontRightSteerPort = 4;
    public static final int kFrontRightCancoderPort = 10;
    public static final int kBackLeftDrivePort = 5;
    public static final int kBackLeftSteerPort = 6;
    public static final int kBackLeftCancoderPort = 11;
    public static final int kBackRightDrivePort = 7;
    public static final int kBackRightSteerPort = 8;
    public static final int kBackRightCancoderPort = 12;

    // Magnet offsets (rotations) — measure with Phoenix Tuner X, change to yours.
    public static final double kFrontLeftMagnetOffset = 0.0;
    public static final double kFrontRightMagnetOffset = 0.0;
    public static final double kBackLeftMagnetOffset = 0.0;
    public static final double kBackRightMagnetOffset = 0.0;

    public static final double kDriveGearRatio = 6.75;                 // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016;          // 4 inch wheel
    public static final double kWheelCircumferenceMeters =
        Math.PI * kWheelDiameterMeters;                                // ≈ 0.319 m

    public static final double kHalfLength = 0.3;  // meters, wheelbase / 2
    public static final double kHalfWidth  = 0.3;  // meters, track width / 2

    // +X is forward, +Y is left, yaw is CCW-positive.
    public static final Translation2d kFrontLeft  = new Translation2d( kHalfLength,  kHalfWidth);
    public static final Translation2d kFrontRight = new Translation2d( kHalfLength, -kHalfWidth);
    public static final Translation2d kBackLeft   = new Translation2d(-kHalfLength,  kHalfWidth);
    public static final Translation2d kBackRight  = new Translation2d(-kHalfLength, -kHalfWidth);

    // Kraken X60 free speed ≈ 6000 RPM = 100 rotations/sec. Divide by the gear
    // ratio, multiply by circumference → meters/sec. About 4.7 m/s for our numbers.
    public static final LinearVelocity kMaxSpeed =
        MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters);

    // How fast the chassis may spin at full stick — one full rotation per second.
    public static final AngularVelocity kMaxAngularSpeed = RotationsPerSecond.of(1.0);

    public static final double kDriveKV = 0.8;          // volts per wheel rotation/sec — the model
    public static final double kDriveKP = 0.1;          // volts per rps of error — the trim

    // How hard the tires can grip, in sim — a Colson-wheel-on-carpet guess.
    public static final double kWheelCoF = 1.2;

    // a = μg — how hard the chassis can actually accelerate, independent of
    // mass, because a heavier robot needs proportionally more force to move
    // and proportionally more grip to supply it.
    public static final double kMaxAccelMps2 = kWheelCoF * 9.81;

    // The same grip limit, applied at each wheel's distance from center —
    // a wheel spinning the chassis in place still can't push harder than
    // the tire allows.
    public static final double kMaxAngularAccelRadPerSec2 =
        kMaxAccelMps2 / Math.hypot(kHalfLength, kHalfWidth);

    /** Where the simulated robot is placed on the field at startup. */
    public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
  }

  public static final class SteerConstants {
    public static final double kSteerGearRatio = 25.0;  // rotor : CANcoder
    public static final double kSteerKP = 40.0;         // volts per rotation of error — tune
  }

  public static final class HeadingConstants {
    public static final double kP = 0.02; // turn power per degree of heading error
  }

  public static final class VisionConstants {
    public static final AprilTagFieldLayout kTagLayout =
        AprilTagFieldLayout.loadField(AprilTagFields.kDefaultField);

    // Camera mount positions: robot center → camera lens.
    public static final String kFrontCameraName = "Front"; // must match the name in the PhotonVision UI
    public static final Transform3d kFrontRobotToCamera = new Transform3d(
        new Translation3d(0.3, 0.0, 0.2), // 30 cm forward, centered, 20 cm up
        new Rotation3d(0, 0, 0));         // facing straight forward

    public static final String kBackCameraName = "Back";
    public static final Transform3d kBackRobotToCamera = new Transform3d(
        new Translation3d(-0.3, 0.0, 0.2), // 30 cm back, 20 cm up
        new Rotation3d(0, 0, Math.PI));    // facing straight backward

    // --- Object detection ---------------------------------------------------
    // A detection model reports what it saw as a number, and this pair is the
    // entire mapping between that number and what it means. There is no
    // standard class ID — it's the index of a class in the model YOU trained,
    // so on a real robot this constant is whatever your model emits.
    public static final String kGamePieceType = "Fuel";
    public static final int kGamePieceClassId = 0;

    /** A Fuel is a 15 cm ball, so its middle sits 8 cm off the floor. */
    public static final Distance kGamePieceDiameter = Meters.of(0.15);
    public static final Distance kGamePieceHeight = Meters.of(0.08);

    public static final String kObjectCameraName = "Objects";
    /**
     * The detection camera, tilted down so it can see the floor in front of
     * the robot. Positive pitch here points the camera DOWN.
     */
    public static final Transform3d kRobotToObjectCamera = new Transform3d(
        new Translation3d(0.3, 0.0, 0.5),           // 30 cm forward, 50 cm up
        new Rotation3d(0, Math.toRadians(20), 0));  // 20° down

    /** Below this, the model is guessing and we'd rather not drive at it. */
    public static final double kMinConfidence = 0.5;

    /** Sim only: fixed field positions for the fake camera to see. No physics — just a layout. */
    public static final Translation2d[] kSimGamePiecePositions = {
        new Translation2d(4.5, 3.2),
        new Translation2d(2.0, 1.5),
        new Translation2d(6.0, 3.8),
    };
  }

  public static final class ElevatorConstants {
    public static final int kMotorPort = 20; // CAN ID — change to yours
    public static final double kGearRatio = 12.0; // motor rotations per drum rotation
    public static final Distance kDrumRadius = Inches.of(1.0);
    public static final Mass kCarriageMass = Kilograms.of(5.0); // carriage + anything riding on it

    public static final Distance kMinHeight = Meters.of(0.0);
    public static final Distance kMaxHeight = Meters.of(1.5);

    public static final LinearVelocity kMaxVelocity = MetersPerSecond.of(1.0);
    public static final LinearAcceleration kMaxAcceleration = MetersPerSecondPerSecond.of(2.0);

    // Feedforward + trim gains, computed from the Kraken X60 spec sheet — see the lesson's §3.
    // SensorToMechanismRatio makes the closed loop run in drum rotations, so
    // every gain below is drum-side (mechanism-side), not rotor-side.
    public static final double kElevatorKG = 0.18; // volts to hold position against gravity
    public static final double kElevatorKV = 1.44; // volts per drum rotation/sec
    public static final double kElevatorKA = 0.003; // volts per drum rotation/sec^2
    public static final double kElevatorKP = 20.0; // volts per drum rotation of error — the trim

    public static final Distance kStowed = Meters.of(0.02);
    public static final Distance kScoreMid = Meters.of(0.75);
    public static final Distance kScoreHigh = Meters.of(1.45);

    public static final Distance kTolerance = Centimeters.of(0.1); // 1 mm — comfortably above what it settles to

    // Homing. The switch sits at the bottom of the frame; when it trips, the
    // carriage is at kBottomLimitHeight whatever the encoder currently believes.
    public static final int kBottomLimitChannel = 0; // DIO — change to yours
    public static final Distance kBottomLimitHeight = Centimeters.of(1);
    public static final Voltage kHomingVolts = Volts.of(-0.7);
    /** Sim only: where the carriage physically sits at power-on. */
    public static final Distance kSimStartHeight = Centimeters.of(35);

    // The stick-figure view. The canvas is measured in meters, like the field.
    public static final Distance kDisplayWidth = Meters.of(1.0);
    public static final Distance kDisplayHeight = Meters.of(2.0);
    public static final Color8Bit kMovingColor = new Color8Bit(Color.ORANGE);
    public static final Color8Bit kAtGoalColor = new Color8Bit(Color.LIME_GREEN);

    // The carriage ligament points straight up — named so Arm's drawing math
    // doesn't carry a bare 90 of its own.
    public static final Angle kCarriageAngle = Degrees.of(90);
  }

  public static class LedConstants {
    public static final int kPwmPort = 5; // PWM — change to yours
    public static final int kLength = 40; // LEDs on the strip — change to yours

    // One pattern per SuperstructureState, built once, here, next to the
    // color it uses — SuperstructureState's constructor just picks one up.
    public static final LEDPattern kUnhomed = LEDPattern.solid(Color.RED).blink(Seconds.of(0.15));
    public static final Dimensionless kIdleBrightness = Percent.of(25);
    public static final LEDPattern kIdle = LEDPattern.solid(Color.BLUE).atBrightness(kIdleBrightness);
    public static final LEDPattern kIntaking = LEDPattern.solid(Color.YELLOW);
    public static final LEDPattern kScoring = LEDPattern.solid(Color.LIME_GREEN).blink(Seconds.of(0.1));

    public static final Time kBreathePeriod = Seconds.of(2);
  }

  public static class ArmConstants {
    public static final int kPivotMotorPort = 21; // CAN ID — change to yours
    public static final int kRollerMotorPort = 22; // CAN ID — change to yours

    // Mechanism geometry. estimateMOI treats the arm as a uniform rod, so its
    // length and mass are all the physics model needs.
    public static final double kGearRatio = 50.0; // rotor : arm
    public static final Distance kArmLength = Inches.of(20);
    public static final Mass kArmMass = Kilograms.of(3.0);

    // How far it can swing. Zero is horizontal, and that is not a free choice.
    public static final Angle kMinAngle = Degrees.of(-20);
    public static final Angle kMaxAngle = Degrees.of(180);

    public static final AngularVelocity kMaxVelocity = DegreesPerSecond.of(180);
    public static final AngularAcceleration kMaxAcceleration =
        DegreesPerSecondPerSecond.of(360);

    // The model: what this arm costs to hold, to move, and to speed up.
    public static final double kArmKG = 0.25; // volts to hold it out horizontal
    public static final double kArmKV = 6.0; // volts per arm rotation/sec
    public static final double kArmKA = 0.055; // volts per arm rotation/sec^2
    // The trim: whatever the model got wrong.
    public static final double kArmKP = 60.0; // volts per rotation of error

    // Where the operator actually wants it.
    public static final Angle kIntake = Degrees.of(-20);
    public static final Angle kStowed = Degrees.of(90);

    public static final Angle kTolerance = Degrees.of(2);

    // The roller has no goal to profile — just a direction and a speed.
    public static final double kIntakeSpeed = 0.6; // fraction of full output
    public static final double kEjectSpeed = -0.6;
  }

  public static class FlywheelConstants {
    public static final int kMotorPort = 23; // CAN ID — change to yours

    // Direct drive: the wheel is on the motor shaft. The first mechanism in this
    // course with no gearbox at all, which makes the arithmetic short.
    public static final double kGearRatio = 1.0;
    /** Wheel, hub and shaft together, from CAD. This is the number that matters. */
    public static final double kMomentOfInertia = 0.01; // kg m^2

    // Speeds, not places. Idling between shots is not laziness — it is what makes
    // the wheel ready again quickly, and this lesson measures exactly how much.
    public static final AngularVelocity kShootSpeed = RotationsPerSecond.of(60);
    public static final AngularVelocity kIdleSpeed = RotationsPerSecond.of(30);
    public static final AngularVelocity kTolerance = RotationsPerSecond.of(1.5);

    // The speedometer. Full scale is the motor's free speed, so the needle can
    // never run off the end of the dial.
    public static final AngularVelocity kFreeSpeed = RotationsPerSecond.of(100);
    public static final Distance kDialSize = Meters.of(2.0);
    public static final Distance kNeedleLength = Meters.of(0.8);
    /** Where the needle sits at rest: straight down. */
    public static final Angle kZeroAngle = Degrees.of(-90);
    /** How far it swings from rest to full scale: down, round, and up. */
    public static final Angle kFullSweep = Degrees.of(180);

    // The model: what this wheel costs to break free, to spin, and to speed up.
    // No kG — nothing here is being held up against gravity.
    public static final double kFlywheelKS = 0.15; // volts to overcome friction
    public static final double kFlywheelKV = 0.12; // volts per rotation/sec
    public static final double kFlywheelKA = 0.106; // volts per rotation/sec^2
    // The trim: whatever the model got wrong.
    public static final double kFlywheelKP = 0.3; // volts per rotation/sec of error
  }

  public static final class PowerConstants {
    // Every mechanism motor shares this cap — the windings don't care which
    // subsystem they're bolted to.
    public static final Current kStatorLimit = Amps.of(80);

    // The supply budget, one line per motor, chosen so the three mechanisms
    // together leave headroom for the drivetrain (not budgeted here — see the
    // lesson's Try It).
    public static final Current kElevatorSupplyLimit = Amps.of(40);
    public static final Current kArmPivotSupplyLimit = Amps.of(30);
    public static final Current kArmRollerSupplyLimit = Amps.of(20);
    public static final Current kFlywheelSupplyLimit = Amps.of(40);

    /** Below this, call it a brownout — well above where the RIO itself gives up. */
    public static final Voltage kBrownoutVoltage = Volts.of(6.3);

    /**
     * Worth complaining about before a match. Well above the brownout threshold —
     * the point of an alert is to be early, not accurate.
     */
    public static final Voltage kLowBatteryVoltage = Volts.of(11.5);
  }

  public static class PathConstants {
    // Stage two's gains. Higher than stage one's, because its errors are tiny
    // by the time it takes over — it only ever starts a short distance away.
    public static final double kAlignP = 3.0;      // m/s per meter of error
    public static final double kAlignThetaP = 4.0; // rad/s per radian of error

    // "Arrived" is a decision, and this is where it gets made.
    public static final Distance kPositionTolerance = Centimeters.of(2);
    public static final Angle kAngleTolerance = Degrees.of(1);

    /** Where the left bumper lines the robot up. */
    public static final Pose2d kScoringPose = new Pose2d(5.0, 4.0, Rotation2d.fromDegrees(90));

    // Aiming. The rotation override wants an angular velocity, not a heading, so
    // this gain turns heading error into a rate.
    public static final double kAimP = 4.0; // rad/s per radian of heading error
    /** The tag to point at. Change it to the one your alliance actually scores on. */
    public static final int kAimTagId = 20;
    /** Close enough to call it aimed. */
    public static final Angle kAimTolerance = Degrees.of(2);
  }
}
