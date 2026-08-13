# Lesson 13 — IO layers: hardware behind an interface

**Goal:** Restructure the drivetrain so every sensor reading enters through
one clearly-named door — a **ModuleIO** and a **GyroIO** — with a separate
class behind that door for real hardware and for simulation, chosen
automatically by a `Constants.Mode` switch. `SwerveModule` and `Drivetrain`
stop touching hardware entirely. This is also the exact shape a future
lesson needs to record a whole match and play it back through your code —
that trick needs tooling this framework doesn't have yet, but you'll build
the doors it will walk through, including a third mode, `REPLAY`, that
exists in the code today with nothing behind it.

**New Java concepts**
- **Interfaces** and **default methods** — a contract with optional homework
- **Anonymous classes** — `new ModuleIO() {}`, a nameless do-nothing implementation
- **Enums** — a type with a fixed menu of values (`REAL`, `SIM`, `REPLAY`)
- **Subclassing your own class** — `extends`, `protected`, and `super`
- **`switch` expressions** — one arm per enum value, checked by the compiler

**New robot concepts**
- **Inputs vs. outputs** — sensor readings come *in*, computed values go *out*
- The **IO layer** — hardware behind an interface, swappable per mode
- A dormant third mode, waiting for a future lesson to give it something to do

---

## 1. The idea: hardware behind a door

Since Lesson 4, `SwerveModule` has done two jobs at once. It *is* the
hardware — it owns the TalonFXs and the CANcoder — and it's also the logic
that decides what to command them to do. You've been keeping those jobs
straight by hand: `simulatePeriodic()` sits right next to the real control
code, and you trust yourself to only call it when simulating. That's worked
for twelve lessons. It also means every sensor reading could, in principle,
come from three different places — a real motor, a physics model, or (an
idea worth planting now) a recorded log — and nothing in the code says so.

This lesson draws a hard line instead. One **interface** describes every
sensor reading and every command a module's hardware can perform. One
**implementation class per world** sits behind it — real hardware for the
real robot, a physics model for the simulator. `SwerveModule` stops owning
a single motor. It owns an interface reference, and it has no idea — and no
need to know — which world is on the other end.

Here's why that's worth the ceremony, beyond tidiness. If hardware only
ever enters your code through one door per sensor, that door is the *only*
place anything would ever need to intercept a reading — to log it, to fake
it for a test, or, down the road, to hand it a value read back out of a
recorded match instead of a live sensor. That last one is the biggest idea
in the professional version of this course, and building the doors now
means a future lesson can walk through them the moment the right tooling
exists. You'll see the empty doorway by the end of this lesson: a mode
called `REPLAY`, sitting in your code, with nothing behind it yet.

---

## 2. The contract: `ModuleIO`

An **interface** is a contract: a list of methods with no bodies, saying
"anything that claims to be a `ModuleIO` can do these things." Ours
describes everything the rest of the code needs from a module's hardware —
one read, and three writes.

**Create `src/main/java/first/robot/subsystems/ModuleIO.java`:**

```java
package first.robot.subsystems;

public interface ModuleIO {
  public static class ModuleIOInputs {
    public double steerAngleDegrees = 0.0;
    public double drivePositionMeters = 0.0;
    public double driveVelocityMetersPerSec = 0.0;
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ModuleIOInputs inputs) {}

  /** Firmware position control for steering. */
  public default void setSteerAngleDegrees(double angleDegrees) {}

  /** Firmware velocity control for drive (wheel meters per second). */
  public default void setDriveVelocityMetersPerSec(double mps) {}

  /** Zero the drive encoder. */
  public default void resetDrivePosition() {}
}
```

Two new pieces of Java in one small file. `ModuleIOInputs` is a plain
nested class holding *every sensor fact the module knows*, in one bundle —
three public fields, no getters, because this class exists purely to be
filled in and read, not to protect itself from its own owner.

The **`default`** keyword gives each method a body right in the interface
— here, a body that does *nothing*. That's deliberate: an implementation
only overrides what it actually needs to, and "hardware that does nothing"
is about to be exactly what one of your three worlds wants.

---

## 3. The hardware implementation: `ModuleIOTalonFX`

Now the hardware moves house. The motors, the CANcoder, and every config
and control request from Lesson 12 relocate from `SwerveModule` into a
class that **implements** the contract — and *only* that. The sim plumbing
does **not** come along; it gets its own implementation in the next
section, so this class stays a clean picture of the real robot. Build
`ModuleIOTalonFX.java` in three pieces.

**Piece 1 — fields and constructor.** These migrate from `SwerveModule`
almost unchanged; the class line now says `implements ModuleIO`, and the
motors and CANcoder are `protected` instead of `private` — more on that
word in the next section.

**Create `ModuleIOTalonFX.java`:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.SteerConstants;

public class ModuleIOTalonFX implements ModuleIO {
  protected final TalonFX m_driveMotor;
  protected final TalonFX m_steerMotor;
  protected final CANcoder m_steerEncoder;
  private final PositionVoltage m_steerRequest = new PositionVoltage(0);
  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

  public ModuleIOTalonFX(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {
    m_driveMotor = new TalonFX(driveId, CANBus.systemcore(0));
    m_steerMotor = new TalonFX(steerId, CANBus.systemcore(0));
    m_steerEncoder = new CANcoder(cancoderId, CANBus.systemcore(0));

    CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
    cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
    m_steerEncoder.getConfigurator().apply(cancoderConfig);

    // Steering: read angle from the CANcoder, wrap like a circle, hold a P gain.
    TalonFXConfiguration steerConfig = new TalonFXConfiguration();
    steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;
    steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;
    steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;
    steerConfig.Feedback.SensorToMechanismRatio = 1.0;
    steerConfig.ClosedLoopGeneral.ContinuousWrap = true;
    steerConfig.Slot0.kP = SteerConstants.kSteerKP;
    m_steerMotor.getConfigurator().apply(steerConfig);

    // Drive: firmware knows the gearbox and runs a kV model + kP trim.
    TalonFXConfiguration driveConfig = new TalonFXConfiguration();
    driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;
    driveConfig.Slot0.kV = DriveConstants.kDriveKV;
    driveConfig.Slot0.kP = DriveConstants.kDriveKP;
    m_driveMotor.getConfigurator().apply(driveConfig);
  }
```

**Piece 2 — the read.** `updateInputs` fills the inputs bundle from the
sensors — nothing else. No sim checks, no physics: on the real robot the
sensors just *have* values, and this class is the real robot.

**Add to `ModuleIOTalonFX`:**

```java
  @Override
  public void updateInputs(ModuleIOInputs inputs) {
    inputs.steerAngleDegrees = m_steerMotor.getPosition().getValue().in(Rotations) * 360.0;
    inputs.drivePositionMeters =
        m_driveMotor.getPosition().getValue().in(Rotations) * DriveConstants.kWheelCircumferenceMeters;
    inputs.driveVelocityMetersPerSec =
        m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) * DriveConstants.kWheelCircumferenceMeters;
  }
```

**Piece 3 — the writes.** Each one is a Lesson 12 line wearing an
`@Override`. Now that the target arrives as a plain `double` (the contract
speaks degrees and meters-per-second), wrap it in the matching unit measure
on the way into Phoenix, exactly as Lesson 12 did.

**Add to `ModuleIOTalonFX`, closing out the class:**

```java
  @Override
  public void setSteerAngleDegrees(double angleDegrees) {
    // Phoenix speaks Units — hand it the angle as a measure.
    m_steerMotor.setControl(m_steerRequest.withPosition(Degrees.of(angleDegrees)));
  }

  @Override
  public void setDriveVelocityMetersPerSec(double mps) {
    double wheelRps = mps / DriveConstants.kWheelCircumferenceMeters;
    m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));
  }

  @Override
  public void resetDrivePosition() {
    m_driveMotor.setPosition(0);
  }
}
```

Nothing in this file is *new* behavior — it's Lesson 12, re-shelved. The
work of this lesson isn't inventing what the module does; it's drawing a
boundary around it.

---

## 4. The sim implementation: `ModuleIOSim`

So where did the sim plumbing go? Into its own IO implementation — that's
the whole point of the boundary you just drew: **each world the code can
wake up in gets its own hardware class.** The real robot gets
`ModuleIOTalonFX`; the simulator gets `ModuleIOSim`.

Here's the design question, though. In sim you still want Phoenix's
simulated firmware running the closed loops — that was Lesson 12's payoff,
the same configs and gains work on the desktop — so `ModuleIOSim` isn't
*instead of* the TalonFX class, it's the TalonFX class *plus* the physics
models. Java has a word for "that class, plus": **`extends`**. You've been
writing `extends SubsystemBase`-style clauses since Lesson 1 (`Mechanism`
in this course); this is the first time you extend a class *you* wrote.
The subclass inherits every field and method of its parent and only writes
down what's different.

**Create `src/main/java/first/robot/subsystems/ModuleIOSim.java`:**

```java
package first.robot.subsystems;

import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.DriveConstants;
import first.robot.Constants.SteerConstants;

/** Sim: the real TalonFX class, plus the physics models from Lessons 4-5/12. */
public class ModuleIOSim extends ModuleIOTalonFX {
  private final TalonFXSimState m_driveSim;
  private final TalonFXSimState m_steerSim;
  private final CANcoderSimState m_steerEncoderSim;

  private final DCMotorSim m_driveModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(
              DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),
          DCMotor.getKrakenX60(1));
  private final DCMotorSim m_steerModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(
              DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),
          DCMotor.getKrakenX60(1));

  public ModuleIOSim(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {
    super(driveId, steerId, cancoderId, magnetOffsetRotations); // build motors, CANcoder, and configs
    m_driveSim = m_driveMotor.getSimState();
    m_steerSim = m_steerMotor.getSimState();
    m_steerEncoderSim = m_steerEncoder.getSimState();
  }

  @Override
  public void updateInputs(ModuleIOInputs inputs) {
    stepSim(); // advance the physics one tick...
    super.updateInputs(inputs); // ...then read the sensors like the real class
  }

  /** One tick of pretend reality. */
  private void stepSim() {
    // Drive motor: model reports wheel motion, convert back to rotor-side.
    m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_driveModel.setInputVoltage(m_driveSim.getMotorVoltage());
    m_driveModel.update(0.020);
    m_driveSim.setRawRotorPosition(
        m_driveModel.getAngularPosition() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);
    m_driveSim.setRotorVelocity(
        m_driveModel.getAngularVelocity() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);

    // Steer motor: same, through the 25:1 reduction.
    m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
    m_steerModel.update(0.020);
    m_steerSim.setRawRotorPosition(
        m_steerModel.getAngularPosition() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);
    m_steerSim.setRotorVelocity(
        m_steerModel.getAngularVelocity() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);

    // CANcoder: the closed loop reads this continuously, so it needs its own
    // honest feed too — mechanism-side, no gear multiply.
    m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));
    m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));
  }
}
```

Three pieces of new Java, all pulling in the same direction. **`super(driveId,
steerId, cancoderId, magnetOffsetRotations)`** in the constructor runs the
*parent's* constructor first — so the motors and CANcoder exist and the
configs are applied before the sim states hook onto them.
**`super.updateInputs(inputs)`** calls the parent's version of the method
this class overrides: step the physics, then read the sensors exactly the
way the real robot would. And that **`protected`** from section 3 is the
reason this compiles — `private` means "mine alone," `protected` means
"mine and my subclasses'," and `ModuleIOSim` needs the motors *and* the
CANcoder to reach their sim states.

Step back and look at what the shape buys you: the real class has *zero*
sim code, the sim class has *zero* new control behavior — same firmware
loops, same gains, same reads — and the physics runs right before the
read, so the bundle always holds one fresh tick of pretend reality.

---

## 5. `SwerveModule` goes hardware-free

With the hardware gone, `SwerveModule` becomes short and pure: it owns an
IO (whichever kind), a bundle of inputs, its targets, and the cosine
decision.

**Rewrite `SwerveModule.java`:**

```java
package first.robot.subsystems;

import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.SwerveModulePosition;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.smartdashboard.SmartDashboard;

/**
 * One swerve corner. No hardware of its own anymore — it owns an IO (whichever
 * kind), the inputs that IO reports, its targets, and the cosine decision.
 */
public class SwerveModule {
  /** Position of this module relative to robot center, in meters. */
  public final Translation2d location;

  private final ModuleIO m_io;
  private final ModuleIO.ModuleIOInputs m_inputs = new ModuleIO.ModuleIOInputs();
  private final String m_logKey; // e.g. "Drivetrain/Module0"

  public SwerveModule(ModuleIO io, String logKey, Translation2d location) {
    m_io = io;
    m_logKey = logKey;
    this.location = location;
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  public void periodic() {
    m_io.updateInputs(m_inputs);
    SmartDashboard.putNumber(m_logKey + "/SteerAngleDegrees", m_inputs.steerAngleDegrees);
    SmartDashboard.putNumber(m_logKey + "/DrivePositionMeters", m_inputs.drivePositionMeters);
    SmartDashboard.putNumber(m_logKey + "/DriveVelocityMetersPerSec", m_inputs.driveVelocityMetersPerSec);
  }

  /** One tick of control: hand the IO its targets. Called by a command each tick. */
  public void setDesiredState(SwerveModuleVelocity state) {
    double targetDegrees = state.angle.getDegrees();
    m_io.setSteerAngleDegrees(targetDegrees);

    // Cosine compensation (Lesson 9) — a decision, so it stays in our code.
    double error = targetDegrees - m_inputs.steerAngleDegrees;
    double alignment = Math.cos(Math.toRadians(error));
    m_io.setDriveVelocityMetersPerSec(state.velocity * alignment);
  }

  public double getSteerAngleDegrees() { return m_inputs.steerAngleDegrees; }
  public double getDistanceMeters() { return m_inputs.drivePositionMeters; }
  public double getDriveVelocityMetersPerSec() { return m_inputs.driveVelocityMetersPerSec; }

  public SwerveModulePosition getPosition() {
    return new SwerveModulePosition(
        m_inputs.drivePositionMeters, Rotation2d.fromDegrees(m_inputs.steerAngleDegrees));
  }

  public void resetDrivePosition() {
    m_io.resetDrivePosition();
  }
}
```

Two things to sit with. First, the split between the two methods is a
rule, not a style choice: **sense in `periodic()`, act in a command.**
`periodic()` runs every tick no matter what — that's why it holds only the
harmless read-and-log — and the writes live in `setDesiredState`, which a
command calls. Because the scheduler runs `periodic()` before any command
each tick, the bundle is always fresh by the time `setDesiredState` reads
it for the cosine error: **inputs first, then logic**, which is exactly
what makes a tick reproducible. Second, look at the question-methods: they
read the *bundle*, not the hardware. Every sensor fact now takes exactly
one path into the program — which is why logging it is one line per field,
sitting right where the bundle gets filled, instead of scattered wherever
someone happened to need the number.

---

## 6. Three modes, one switch

Which IO does a module get? That depends on where the code is running, and
"where am I running" deserves a proper type. A Java **enum** is a type
whose values are a fixed menu — you can't typo a mode that doesn't exist.

**Add to the top of `Constants.java`:**

```java
public final class Constants {
  public enum Mode { REAL, SIM, REPLAY }

  /** Change kSimMode to Mode.REPLAY to re-run a log file instead of simulating fresh. */
  public static final Mode kSimMode = Mode.SIM;
  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;

  // ...the nested constants classes stay...
}
```

(`RobotBase.isReal()` needs `import org.wpilib.framework.RobotBase;` — a
question-method deciding a constant.) That comment on `kSimMode` is
honest about where this is going, even though flipping it to `REPLAY`
today buys you nothing yet but a dormant, empty implementation — you'll
see exactly what that looks like by the end of this section.

Now teach `Drivetrain` to build modules for the current mode, with a small
static helper. This is also the moment to finally use the per-corner
constants `DriveConstants` has carried since Lesson 7 — Try It 4 back then
asked you to wire them in yourself, and rebuilding this array is the
natural place to make it required.

**Edit the `m_modules` field in `Drivetrain`:**

```java
  private final SwerveModule[] m_modules = new SwerveModule[] {
      makeModule(0, DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
          DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
          DriveConstants.kFrontLeft),
      makeModule(1, DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
          DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,
          DriveConstants.kFrontRight),
      makeModule(2, DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
          DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,
          DriveConstants.kBackLeft),
      makeModule(3, DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
          DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,
          DriveConstants.kBackRight)
  };

  /** Builds the right ModuleIO for the current mode, then wraps it in a SwerveModule. */
  private static SwerveModule makeModule(
      int index, int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      Translation2d location) {
    ModuleIO io = switch (Constants.kCurrentMode) {
      case REAL -> new ModuleIOTalonFX(driveId, steerId, cancoderId, magnetOffsetRotations);
      case SIM -> new ModuleIOSim(driveId, steerId, cancoderId, magnetOffsetRotations);
      case REPLAY -> new ModuleIO() {}; // nothing feeds this yet
    };
    return new SwerveModule(io, "Drivetrain/Module" + index, location);
  }
```

**`Drivetrain` needs `import first.robot.Constants;`** alongside its
existing `Constants.DriveConstants`/`Constants.HeadingConstants` imports —
importing a nested class doesn't let you refer to the outer one by its bare
name, and `makeModule` needs `Constants.kCurrentMode` directly.

Enums and **`switch` expressions** are made for each other: one arrow arm
per mode, and the whole thing *is* a value you can assign. Better, the
compiler counts the arms against the menu — add a fourth mode next season
and this line refuses to build until you say what it means. Three worlds,
three implementations, chosen in one place, once, at construction — not
re-checked every tick the way `if (RobotBase.isSimulation())` scattered
through your code would be.

That `new ModuleIO() {}` in the replay arm is an **anonymous class** — "a
nameless class implementing `ModuleIO`, overriding nothing." Every method
keeps its `default` do-nothing body: reads leave the inputs sitting at
whatever they were (`0.0`, since nothing has ever touched them), writes go
nowhere — there are no motors. Ten characters of syntax for "hardware that
doesn't exist," and this is exactly why the interface's methods got
default bodies in section 2: without them, `new ModuleIO() {}` wouldn't
compile, because you'd owe the compiler four method bodies for a class
that's supposed to do nothing at all.

---

## 7. The gyro gets the same treatment

Same pattern, smaller scale — read it as a rerun.

**Create `GyroIO.java`:**

```java
package first.robot.subsystems;

public interface GyroIO {
  public static class GyroIOInputs {
    public double yawDegrees = 0.0;
  }

  public default void updateInputs(GyroIOInputs inputs) {}

  /** Sim bookkeeping: the commanded rotation rate, in revolutions per second. */
  public default void setSimRotationRate(double omegaRevPerSec) {}
}
```

The real implementation is the shortest class in the course — a Pigeon
and one read.

**Create `GyroIOPigeon2.java`:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Degrees;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.Pigeon2;

public class GyroIOPigeon2 implements GyroIO {
  private final Pigeon2 m_gyro = new Pigeon2(0, CANBus.systemcore(0)); // CAN ID 0 — change to yours

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_gyro.getYaw().getValue().in(Degrees);
  }
}
```

Notice it doesn't override `setSimRotationRate` at all — the real robot
has no use for it, so the `default` no-op body is exactly right. That's
the interface earning its keep from the other direction.

The sim implementation absorbs Lesson 8's fake-gyro integration — the
`m_lastCommandedOmega` and `m_simHeadingDegrees` fields move here from
`Drivetrain` — and look: no Pigeon, no Phoenix, no hardware at all. A
heading you integrate yourself needs nothing but arithmetic, so unlike the
module, this sim class doesn't extend the real one — it stands alone.

**Create `GyroIOSim.java`:**

```java
package first.robot.subsystems;

public class GyroIOSim implements GyroIO {
  private double m_lastCommandedOmega = 0.0;
  private double m_simHeadingDegrees = 0.0;

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    // Lesson 8's integration: add rate x time, every tick.
    m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;
    inputs.yawDegrees = m_simHeadingDegrees;
  }

  @Override
  public void setSimRotationRate(double omegaRevPerSec) {
    m_lastCommandedOmega = omegaRevPerSec;
  }
}
```

---

## 8. Wire the gyro into `Drivetrain`, and retire `simulatePeriodic`

Replace the `m_gyro`, `m_lastCommandedOmega`, and `m_simHeadingDegrees`
fields with an IO pair, picked by the same three-arm switch as the
modules.

**Replace `Drivetrain`'s gyro field with:**

```java
  private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
    case REAL -> new GyroIOPigeon2();
    case SIM -> new GyroIOSim();
    case REPLAY -> new GyroIO() {}; // nothing feeds this yet
  };
  private final GyroIO.GyroIOInputs m_gyroInputs = new GyroIO.GyroIOInputs();
```

**Replace `getHeadingDegrees()` — it now reads the bundle, not a Pigeon2 directly:**

```java
  /** Robot heading in degrees (CCW positive). */
  public double getHeadingDegrees() {
    return m_gyroInputs.yawDegrees;
  }
```

The two places that fed the old bookkeeping now call the IO instead:
**`applyChassisSpeeds` sets `m_gyroIO.setSimRotationRate(speeds.omega / (2 * Math.PI))`
in place of assigning `m_lastCommandedOmega`, and `driveDistance`'s zero
line does the same** with `0.0`.

**Add the gyro read to the top of `logTelemetry()`, and give each module its
own read a line above:**

```java
  private void logTelemetry() {
    m_gyroIO.updateInputs(m_gyroInputs);
    SmartDashboard.putNumber("Drivetrain/Gyro/YawDegrees", m_gyroInputs.yawDegrees);

    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      module.periodic(); // refresh + log this module's inputs
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    m_moduleStatesPublisher.set(states);

    // ...Heading/Pose publishing, odometry update, Field2d — unchanged...
  }
```

That `module.periodic()` call is new — it's the read that used to happen
implicitly every time `SwerveModule` reached straight into its own motors.
Now the bundle only refreshes when something asks it to, so something has
to ask.

Last piece, and it's a real behavior change, not a formality: **delete
`Drivetrain.simulatePeriodic()` entirely.** Every scrap of sim-only code —
the module physics, the fake-gyro integration — now lives inside an IO
implementation, chosen once at construction instead of re-run from a
method every tick. There's nothing left for `Drivetrain` to do when
`Robot.simulationPeriodic()` fires.

Which means `Robot.java` needs to stop calling a method that no longer
exists.

**Empty out `simulationPeriodic()` in `Robot.java`:**

```java
  /** Runs every tick, but only while the code is running in simulation. */
  @Override
  public void simulationPeriodic() {}
```

That's a genuinely different shape than every earlier lesson used: instead
of one `simulatePeriodic()` you remember to call from `Robot`, physics now
happens as a side effect of *which class got constructed*. Pick
`ModuleIOSim` at startup, and every future `updateInputs()` call steps the
physics on its own — nothing to opt into each tick, nothing to forget.

---

## Try it

1. **Watch the empty doorway.** Flip `kSimMode` to `Mode.REPLAY` in
   `Constants.java` and run `./gradlew simulateJava`. The robot builds and
   runs without a single error — the `new ModuleIO() {}` and
   `new GyroIO() {}` arms compile and construct fine — but every value on
   the Swerve tab and every field under `Drivetrain/` sits frozen at `0.0`
   forever, no matter what you command. That's the honest state of the
   `REPLAY` doorway today: open, and empty. Flip it back to `Mode.SIM` when
   you're done.
2. **Corrupt a sensor on purpose.** In `ModuleIOTalonFX.updateInputs`,
   multiply `drivePositionMeters` by `1.1` — a fake "wheel slip" baked
   straight into the hardware layer. Drive a known distance and watch
   odometry disagree with where you actually went, by a consistent 10%.
   This is the shape of a real hardware bug: it happened behind the one
   door everything else trusts, so *everything downstream* — distance,
   pose, the Field2d dot — inherited it without any of that code being
   wrong itself. Put the `1.1` back to `1.0`.
3. **Cut the cord.** `ModuleIOSim` leans on Phoenix's simulated firmware by
   extending the TalonFX class. Rebuild it standalone: `implements ModuleIO`
   directly, with a `DCMotorSim` and a WPILib `PIDController` doing the
   closed loops yourself — no Phoenix at all, the way `GyroIOSim` already
   works. The CANcoder disappears entirely in this version — there's no
   remote sensor to wire up when the "firmware" is a `PIDController` you
   wrote yourself. Building it will test whether the interface boundary is
   really as clean as it looks: nothing outside the class should need to
   change.

---

## What you learned

A robot program that reads sensors and drives motors doesn't have to touch
either one directly — it can talk to an **interface** instead, and let a
separate implementation own the hardware. Making that split real took
`default` do-nothing methods (so "hardware that doesn't exist" is ten
characters of **anonymous class**, not four method bodies you owe the
compiler), one implementation per world — real hardware
(`ModuleIOTalonFX`, `GyroIOPigeon2`) and sim (`ModuleIOSim` **extending**
the real class to borrow its firmware, `GyroIOSim` standing alone with no
hardware at all) — and an **enum** with a **`switch` expression** picking
between them in one place, once, at construction. `SwerveModule` and
`Drivetrain` never touch a motor or a gyro anymore; they touch the bundle
an IO filled in, which is why logging every field of it turned into one
line apiece instead of a hunt through the file for wherever a value used
to get read.

You also met a mode with nothing behind it. `REPLAY` compiles, constructs,
and does exactly nothing — which is the honest state of a doorway with no
tooling on the other side yet. That's not wasted work: every future lesson
that needs a reading from "somewhere other than live hardware" walks
through the exact door you built today, no matter what eventually feeds
it. One upgrade remains before you'd want to trust that heading and pose
any further: the pose odometry dead-reckons still drifts, uncorrected, and
Lesson 14 teaches the robot to fix it.

Next: [Lesson 14 — The pose estimator](14-pose-estimator.md).
