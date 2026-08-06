// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.*;

import edu.wpi.first.apriltag.AprilTagFieldLayout;
import edu.wpi.first.apriltag.AprilTagFields;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularAcceleration;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Current;
import edu.wpi.first.units.measure.LinearAcceleration;
import edu.wpi.first.units.measure.Dimensionless;
import edu.wpi.first.units.measure.Distance;
import edu.wpi.first.units.measure.LinearVelocity;
import edu.wpi.first.units.measure.Mass;
import edu.wpi.first.units.measure.Time;
import edu.wpi.first.units.measure.Voltage;
import edu.wpi.first.wpilibj.LEDPattern;
import edu.wpi.first.wpilibj.RobotBase;
import edu.wpi.first.wpilibj.util.Color;
import edu.wpi.first.wpilibj.util.Color8Bit;

public final class Constants {
  /** How the robot is running this session — picks which IO implementations get built. */
  public enum Mode {
    REAL, // on the robot, talking to real motors and a real gyro
    SIM, // desktop simulation, physics models standing in for hardware
    REPLAY // re-running a saved log through the same code, no hardware at all
  }

  /** When not on real hardware, this is the mode to run — flip to REPLAY to replay a log. */
  public static final Mode kSimMode = Mode.SIM;

  /** The mode in effect right now: REAL on the robot, kSimMode otherwise. */
  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;

  public static class OperatorConstants {
    public static final int kDriverControllerPort = 0;
  }

  public static class DriveConstants {
    // CAN IDs, one drive + one steer + one CANcoder per corner — change to yours.
    public static final int kFrontLeftDrivePort = 1;
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
    public static final int kGyroPort = 0; // Pigeon 2 CAN ID — change to yours

    // Magnet offsets (rotations): negative of each CANcoder's raw reading with
    // its wheel pointed forward. Measure with Phoenix Tuner X — change to yours.
    public static final double kFrontLeftMagnetOffset = 0.0;
    public static final double kFrontRightMagnetOffset = 0.0;
    public static final double kBackLeftMagnetOffset = 0.0;
    public static final double kBackRightMagnetOffset = 0.0;

    public static final double kDriveGearRatio = 6.75; // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016; // 4 inch wheel
    public static final double kWheelCircumferenceMeters = Math.PI * kWheelDiameterMeters; // ≈ 0.319 m

    public static final double kHalfLength = 0.3; // meters, wheelbase / 2
    public static final double kHalfWidth = 0.3; // meters, track width / 2

    // +X is forward, +Y is left, yaw is CCW-positive.
    public static final Translation2d kFrontLeft = new Translation2d(kHalfLength, kHalfWidth);
    public static final Translation2d kFrontRight = new Translation2d(kHalfLength, -kHalfWidth);
    public static final Translation2d kBackLeft = new Translation2d(-kHalfLength, kHalfWidth);
    public static final Translation2d kBackRight = new Translation2d(-kHalfLength, -kHalfWidth);

    public static final LinearVelocity kMaxSpeed =
        MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters);
    public static final AngularVelocity kMaxAngularSpeed = RotationsPerSecond.of(1.0);

    // Onboard velocity-loop gains (Lesson 12). kV is the model, kP the trim.
    public static final double kDriveKV = 0.8; // volts per wheel rotation/sec — the model
    public static final double kDriveKP = 0.1; // volts per rps of error — the trim

    // Physical facts a physics engine needs that pure motor math never did (Lesson 16).
    public static final Mass kRobotMass = Kilograms.of(45); // with battery and bumpers
    public static final Distance kBumperLength = Inches.of(30); // front-to-back, over bumpers
    public static final Distance kBumperWidth = Inches.of(30); // side-to-side, over bumpers
    public static final Distance kWheelRadius = Meters.of(kWheelDiameterMeters / 2);

    /** Where the simulated robot is placed on the field at startup. */
    public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
  }

  public static class SteerConstants {
    public static final double kSteerGearRatio = 25.0; // rotor : CANcoder
    // Onboard position-loop gain (Lesson 12). Retires the old software kP.
    public static final double kSteerKP = 40.0; // volts per rotation of error — tune
  }

  public static class HeadingConstants {
    public static final double kP = 0.02; // turn power per degree of heading error
  }

  public static class VisionConstants {
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
    // A detection model reports what it saw as a number. maple-sim types its
    // pieces by name. This pair is the entire mapping between the two, and it
    // only has to agree with itself: on a real robot the ID is whatever your
    // model was trained to emit, which you read off the model.
    public static final String kGamePieceType = "Fuel";
    public static final int kGamePieceClassId = 0;

    /** A Fuel is a 15 cm ball, so its middle sits 8 cm off the floor. */
    public static final Distance kGamePieceDiameter = Meters.of(0.15);
    public static final Distance kGamePieceHeight = Meters.of(0.08);

    public static final String kObjectCameraName = "Objects";
    /**
     * The detection camera, tilted down so it can see the floor in front of the
     * robot. Positive pitch here points the camera DOWN.
     */
    public static final Transform3d kRobotToObjectCamera = new Transform3d(
        new Translation3d(0.3, 0.0, 0.5),           // 30 cm forward, 50 cm up
        new Rotation3d(0, Math.toRadians(20), 0));  // 20° down

    /** Below this, the model is guessing and we'd rather not drive at it. */
    public static final double kMinConfidence = 0.5;
  }
  public static class PathConstants {
    // BLine runs three P loops at once. Every gain here is "output per unit of
    // error", and since error is meters (or radians) and output is per-second,
    // the units all come out to 1/s.
    public static final double kTranslationP = 5.0; // m/s per meter of path left
    public static final double kRotationP = 3.0;    // rad/s per radian of heading error
    public static final double kCrossTrackP = 2.0;  // m/s per meter off the line

    // Overlapping work: how much path has to be left when the arm starts stowing.
    // A distance, not a time — a slow path still stows in the same place.
    public static final Distance kStowDistance = Meters.of(2.0);

    // Aiming. The rotation override wants an angular velocity, not a heading, so
    // this gain turns heading error into a rate.
    public static final double kAimP = 4.0; // rad/s per radian of heading error
    /** The tag to point at. Change it to the one your alliance actually scores on. */
    public static final int kAimTagId = 20;
    /** Close enough to call it aimed. */
    public static final Angle kAimTolerance = Degrees.of(2);

    // Getting somewhere exactly, in two stages. Stage one is a generated path
    // to a pose short of the target; stage two closes the gap.
    public static final Distance kStagingDistance = Meters.of(0.4);
    public static final Distance kGeneratedHandoffRadius = Meters.of(0.3);

    // Stage two's gains. Higher than the path's, because its errors are tiny —
    // and safe to be higher, because it only ever starts kStagingDistance away.
    public static final double kAlignP = 3.0;      // m/s per meter of error
    public static final double kAlignThetaP = 4.0; // rad/s per radian of error

    // "Arrived" is a decision, and this is where it gets made.
    public static final Distance kPositionTolerance = Centimeters.of(2);
    public static final Angle kAngleTolerance = Degrees.of(1);

    /** Where the left bumper lines the robot up. */
    public static final Pose2d kScoringPose = new Pose2d(3.0, 4.0, Rotation2d.fromDegrees(0));
  }
  public static class ElevatorConstants {
    public static final int kMotorPort = 20; // CAN ID — change to yours

    // Mechanism geometry. The drum is what the belt wraps around, so one drum
    // rotation raises the carriage by its circumference.
    public static final double kGearRatio = 12.0; // rotor : drum
    public static final Distance kDrumRadius = Inches.of(1.0);
    public static final double kDrumCircumferenceMeters =
        2 * Math.PI * kDrumRadius.in(Meters);
    public static final Mass kCarriageMass = Kilograms.of(5.0);

    // How far it can physically travel. Ask for more and the goal gets clamped.
    public static final Distance kMinHeight = Meters.of(0.0);
    public static final Distance kMaxHeight = Meters.of(1.5);

    // Motion Magic: not where to go, but how fast it may get there.
    public static final LinearVelocity kMaxVelocity = MetersPerSecond.of(1.0);
    public static final LinearAcceleration kMaxAcceleration =
        MetersPerSecondPerSecond.of(2.0);

    // The model: what this mechanism costs to hold, to move, and to speed up.
    public static final double kElevatorKG = 0.18; // volts just to hold station
    public static final double kElevatorKV = 1.44; // volts per drum rotation/sec
    public static final double kElevatorKA = 0.003; // volts per drum rotation/sec²
    // The trim: whatever the model got wrong.
    public static final double kElevatorKP = 20.0; // volts per rotation of error

    // Where the driver actually wants it.
    public static final Distance kStowed = Meters.of(0.02);
    public static final Distance kScoreMid = Meters.of(0.75);
    public static final Distance kScoreHigh = Meters.of(1.45);

    public static final Distance kTolerance = Centimeters.of(0.1); // 1 mm — comfortably above what it settles to

    // Homing. The switch sits at the bottom of the frame; when it trips, the
    // carriage is at kBottomLimitHeight whatever the encoder currently believes.
    public static final int kBottomLimitChannel = 0; // roboRIO DIO — change to yours
    public static final Distance kBottomLimitHeight = Centimeters.of(1);
    public static final Voltage kHomingVolts = Volts.of(-0.7);
    /** Sim only: where the carriage physically sits at power-on. */
    public static final Distance kSimStartHeight = Centimeters.of(35);

    // The stick-figure view. The canvas is measured in meters, like the field.
    public static final Distance kDisplayWidth = Meters.of(1.0);
    public static final Distance kDisplayHeight = Meters.of(2.0);
    public static final Color8Bit kMovingColor = new Color8Bit(Color.kOrange);
    public static final Color8Bit kAtGoalColor = new Color8Bit(Color.kLimeGreen);
    public static final Angle kCarriageAngle = Degrees.of(90); // straight up
  }

  public static class LedConstants {
    public static final int kPwmPort = 0; // roboRIO PWM — change to yours
    public static final int kLength = 40; // LEDs on the strip — change to yours

    // A pattern is a value, not a loop. Build them once, here, next to the
    // colours they use, and hand the finished description to the strip.
    // One per state now, and named after it — the strip's vocabulary and the
    // robot's are the same vocabulary.
    public static final Dimensionless kIdleBrightness = Percent.of(25);
    public static final Time kBlinkPeriod = Seconds.of(0.15);

    public static final LEDPattern kUnhomed =
        LEDPattern.solid(Color.kRed).blink(kBlinkPeriod);
    public static final LEDPattern kIdle =
        LEDPattern.solid(Color.kBlue).atBrightness(kIdleBrightness);
    public static final LEDPattern kIntaking = LEDPattern.solid(Color.kYellow);
    public static final LEDPattern kHandoff = kIntaking.blink(kBlinkPeriod);
    public static final LEDPattern kHolding = LEDPattern.solid(Color.kLimeGreen);
    public static final LEDPattern kScoring = kHolding.blink(kBlinkPeriod);

    public static final Time kBreathePeriod = Seconds.of(2);
  }

  public static class PowerConstants {
    // A battery is one resource that everything shares, so these numbers only
    // mean anything read together. That is why they live in one place instead of
    // each sitting next to the mechanism it limits.
    public static final Current kElevatorSupplyLimit = Amps.of(40);
    public static final Current kArmPivotSupplyLimit = Amps.of(30);
    public static final Current kArmRollerSupplyLimit = Amps.of(20);
    public static final Current kFlywheelSupplyLimit = Amps.of(40);

    /** What the windings may take, whatever the battery happens to be doing. */
    public static final Current kStatorLimit = Amps.of(80);

    /** Below this the roboRIO starts switching things off to save itself. */
    public static final Voltage kBrownoutVoltage = Volts.of(6.3);

    /**
     * Worth complaining about before a match. Well above the brownout threshold —
     * the point of an alert is to be early, not accurate.
     */
    public static final Voltage kLowBatteryVoltage = Volts.of(11.5);
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
    public static final double kArmKA = 0.055; // volts per arm rotation/sec²
    // The trim: whatever the model got wrong.
    public static final double kArmKP = 60.0; // volts per rotation of error

    // Where the operator actually wants it.
    public static final Angle kIntake = Degrees.of(-20);
    public static final Angle kStowed = Degrees.of(90);

    public static final Angle kTolerance = Degrees.of(2);

    // The roller has no goal to profile — just a direction and a speed.
    public static final double kIntakeSpeed = 0.6; // fraction of full output
    public static final double kEjectSpeed = -0.6;

    // The beam break: an infrared beam across the throat of the intake, broken
    // when a game piece is actually sitting where it belongs.
    public static final int kBeamBreakChannel = 1; // roboRIO DIO — change to yours
    public static final Time kBeamDebounce = Seconds.of(0.1);

    // Sim only: the box maple-sim uses to decide what the roller can reach.
    public static final Distance kIntakeWidth = Inches.of(24);
    public static final Distance kIntakeExtension = Inches.of(12);
  }
}
