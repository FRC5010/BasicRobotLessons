# Lesson 13 — IO layers & replay: logs that drive the robot

**Goal:** Restructure the drivetrain so every sensor value enters through a
replaceable **IO layer** — then use that structure to do something that
sounds impossible: re-run a real log file *through your code* and watch it
recompute the whole match, even after you've changed the code.

**New Java concepts**
- **Interfaces** and **default methods** — a contract with optional homework
- **Anonymous classes** — `new ModuleIO() {}`, a nameless do-nothing implementation
- **Enums** — a type with a fixed menu of values (`REAL`, `SIM`, `REPLAY`)
- **Annotations that generate code** — `@AutoLog` and the class it writes for you
- **Subclassing your own class** — `extends`, `protected`, and `super`
- **`switch` expressions** — one arm per enum value, checked by the compiler

**New robot concepts**
- **Inputs vs. outputs** — sensor readings come *in*, computed values go *out*
- The **IO layer** — hardware behind an interface, swappable per mode
- **`Logger.processInputs`** — log the inputs, or *replay* them
- **Deterministic replay** — same inputs, same code, same (or newly improved) outputs

---

## 1. The idea: logs that can drive the robot

Since Lesson 3, every interesting value has gone into the log. Here's the
question that unlocks this lesson: *what if the log isn't just a record of
what the robot did — what if it's enough information to do it again?*

Think about what your code actually is. Each tick, it reads sensors (stick
positions, encoder counts, gyro yaw), does math, and commands outputs. The
math is deterministic — same inputs, same answers, every time. So if you
recorded **every input** the code ever saw, you could feed that recording
back through the *same code* on your laptop and get the *same tick-by-tick
results*. No robot, no simulator physics — the log drives the code.

Why would you want to? Because the code doesn't have to stay the same. Add a
new logged calculation and replay last week's log: the new value appears,
computed for a match that already happened. Suspect the odometry math was
wrong at 1:32 of a real match? Fix it, replay, and see where the robot
*actually* was. This is AdvantageKit's signature trick, and it's why the
library has been so picky about logging all along.

The catch: it only works if **every** input funnels through a door the
logger controls. Right now `SwerveModule` reads its TalonFXs directly —
hardware and logic tangled together. Untangling them is this lesson, and the
untangled shape is called an **IO layer**.

---

## 2. Pay off the build.gradle debt

Back in Lesson 3, AdvantageKit's install docs mention two `build.gradle`
additions we skipped, because plain `recordOutput` logging didn't need them.
This lesson does — one block powers the `@AutoLog` code generator you're
about to meet, the other adds a replay helper task.

**Add to the bottom of `build.gradle` (project root):**

```groovy
task(replayWatch, type: JavaExec) {
    mainClass = "org.littletonrobotics.junction.ReplayWatch"
    classpath = sourceSets.main.runtimeClasspath
}

dependencies {
    def akitJson = new groovy.json.JsonSlurper().parseText(new File(projectDir.getAbsolutePath() + "/vendordeps/AdvantageKit.json").text)
    annotationProcessor "org.littletonrobotics.akit:akit-autolog:$akitJson.version"
}
```

You don't need to understand Gradle syntax — this is a paste-once chore,
same spirit as the vendordep install. Run `./gradlew build` afterward to
confirm nothing complains.

---

## 3. The contract: `ModuleIO`

An **interface** is a contract: a list of methods with no bodies, saying
"anything that claims to be a ModuleIO can do these things." Ours describes
everything the rest of the code needs from a module's hardware — which turns
out to be one read and three writes.

**Create `src/main/java/frc/robot/subsystems/ModuleIO.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface ModuleIO {
  @AutoLog
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

Two new pieces of Java in one small file. The **`default`** keyword gives
each method a body right in the interface — here, a body that does
*nothing*. That's deliberate: an implementation only overrides what it needs
to, and "hardware that does nothing" will turn out to be exactly what replay
wants.

And **`@AutoLog`** is an **annotation** — a note attached to the inputs
class that the AdvantageKit code generator (the `annotationProcessor` you
just wired up) reads at build time. It writes a companion class,
`ModuleIOInputsAutoLogged`, that knows how to serialize those three fields
into the log and read them back out. You never see the generated file in
your `src` folder — the build conjures it — but you'll use its name in a
moment. Notice what the inputs class is: *every sensor fact the module
knows*, in one bundle. That's the "every input funnels through one door"
requirement, made into a type.

---

## 4. The hardware implementation: `ModuleIOTalonFX`

Now the hardware moves house. The motors, the CANcoder, the Lesson 12
configs, and the control requests relocate from `SwerveModule` into a class
that **implements** the contract — and *only* those. The sim plumbing from
Lessons 4–7 does **not** come along; it gets its own implementation in the
next section, so this class stays a clean picture of the real robot.
Create `src/main/java/frc/robot/subsystems/ModuleIOTalonFX.java` and build
it in three pieces.

**Piece 1 — fields and constructor.** These migrate from `SwerveModule`
almost verbatim; the class line now says `implements ModuleIO`, and the
motors and CANcoder are `protected` instead of `private` (more on that word
in the next section).

**Create `ModuleIOTalonFX.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;

import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.SteerConstants;

public class ModuleIOTalonFX implements ModuleIO {
  protected final TalonFX m_driveMotor;
  protected final TalonFX m_steerMotor;
  protected final CANcoder m_steerEncoder;
  private final PositionVoltage m_steerRequest = new PositionVoltage(0);
  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);

  public ModuleIOTalonFX(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {
    m_driveMotor = new TalonFX(driveId);
    m_steerMotor = new TalonFX(steerId);
    m_steerEncoder = new CANcoder(cancoderId);

    // ...the CANcoderConfiguration block and the two TalonFXConfiguration
    // blocks from Lesson 12, unchanged...
  }
```

**Piece 2 — the read.** `updateInputs` fills the inputs bundle from the
sensors — nothing else. No sim checks, no physics: on the real robot the
sensors just *have* values, and this class is the real robot.

**Add to `ModuleIOTalonFX`:**

```java
  @Override
  public void updateInputs(ModuleIOInputs inputs) {
    inputs.steerAngleDegrees =
        m_steerMotor.getPosition().getValueAsDouble() * 360.0;
    inputs.drivePositionMeters =
        m_driveMotor.getPosition().getValueAsDouble() * DriveConstants.kWheelCircumferenceMeters;
    inputs.driveVelocityMetersPerSec =
        m_driveMotor.getVelocity().getValueAsDouble() * DriveConstants.kWheelCircumferenceMeters;
  }
```

**Piece 3 — the writes.** Each one is a Lesson 12 line wearing an
`@Override`. Now that the target arrives as a plain `double` (the IO
contract speaks degrees and meters-per-second), wrap it in the matching
unit measure on the way into Phoenix — `Degrees.of(...)` and
`RotationsPerSecond.of(...)`, exactly as Lesson 12 did.

**Add to `ModuleIOTalonFX`:**

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

Nothing in this file is *new* — it's Lesson 12, re-shelved. The work of
this lesson isn't inventing behavior; it's drawing a boundary.

---

## 5. The sim implementation: `ModuleIOSim`

So where did the sim plumbing go? Into its own IO implementation — that's
the whole point of the boundary you just drew: **each world the code can
wake up in gets its own hardware class.** The real robot gets
`ModuleIOTalonFX`; the simulator gets `ModuleIOSim`.

Here's the design question, though. In sim you still want Phoenix's
simulated firmware running the closed loops (that was Lesson 12's payoff —
the same configs and gains work on the desktop), so `ModuleIOSim` isn't
*instead of* the TalonFX class — it's the TalonFX class *plus* the physics
models. Java has a word for "that class, plus": **`extends`**. You've been
writing `extends SubsystemBase` since Lesson 1; this is the first time you
extend a class *you* wrote. The subclass inherits every field and method of
its parent and only writes down what's different.

**Create `src/main/java/frc/robot/subsystems/ModuleIOSim.java`:**

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.SteerConstants;

public class ModuleIOSim extends ModuleIOTalonFX {
  // Sim plumbing — the same objects you've carried since Lessons 4-7,
  // plus the CANcoder sim state Lesson 12 added.
  private final TalonFXSimState m_driveSim;
  private final TalonFXSimState m_steerSim;
  private final CANcoderSimState m_steerEncoderSim;
  private final DCMotorSim m_driveModel = /* same as Lesson 6 */;
  private final DCMotorSim m_steerModel = /* same as Lesson 7 */;

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
    // ...the drive and steer four-step blocks from Lessons 4-7, plus the
    // CANcoder feed from Lesson 12, verbatim...
  }
}
```

Three pieces of new Java, all pulling in the same direction. **`super(driveId,
steerId, cancoderId, magnetOffsetRotations)`** in the constructor runs the
*parent's* constructor first — so the motors and CANcoder exist and the
configs are applied before the sim states hook onto them. **`super.updateInputs(inputs)`**
calls the parent's version of the method this class overrides: step the
physics, then read the sensors exactly the way the real robot would. And
that **`protected`** from Piece 1 is the reason this compiles — `private`
means "mine alone," `protected` means "mine and my subclasses'," and
`ModuleIOSim` needs the motors *and* the CANcoder to reach their sim states.

Step back and look at what the shape buys you: the real class has *zero* sim
code, the sim class has *zero* new behavior — same firmware loops, same
gains, same reads — and the physics runs right before the read, so the
bundle always holds one fresh tick of pretend reality.

---

## 6. `SwerveModule` goes hardware-free

With the hardware gone, `SwerveModule` becomes short and pure: it owns an
IO (whichever kind), a bundle of inputs, its targets, and the cosine
decision.

**Rewrite `SwerveModule.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;

public class SwerveModule {
  /** Position of this module relative to robot center, in meters. */
  public final Translation2d location;

  private final ModuleIO m_io;
  private final ModuleIOInputsAutoLogged m_inputs = new ModuleIOInputsAutoLogged();
  private final String m_logKey; // e.g. "Drivetrain/Module0"

  public SwerveModule(ModuleIO io, String logKey, Translation2d location) {
    m_io = io;
    m_logKey = logKey;
    this.location = location;
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  public void periodic() {
    m_io.updateInputs(m_inputs);
    Logger.processInputs(m_logKey, m_inputs);
  }

  /** One tick of control: hand the IO its targets. Called by a command each tick. */
  public void setDesiredState(SwerveModuleState state) {
    double targetDegrees = state.angle.getDegrees();
    m_io.setSteerAngleDegrees(targetDegrees);

    // Cosine compensation (Lesson 9) — a decision, so it stays in our code.
    double error = targetDegrees - m_inputs.steerAngleDegrees;
    double alignment = Math.cos(Math.toRadians(error));
    m_io.setDriveVelocityMetersPerSec(state.speedMetersPerSecond * alignment);
  }

  public double getSteerAngleDegrees()        { return m_inputs.steerAngleDegrees; }
  public double getDistanceMeters()           { return m_inputs.drivePositionMeters; }
  public double getDriveVelocityMetersPerSec() { return m_inputs.driveVelocityMetersPerSec; }

  public SwerveModulePosition getPosition() {
    return new SwerveModulePosition(
        m_inputs.drivePositionMeters,
        Rotation2d.fromDegrees(m_inputs.steerAngleDegrees));
  }

  public void resetDrivePosition() {
    m_io.resetDrivePosition();
  }
}
```

Three things to sit with. First, the split between the two methods is a
rule, not a style choice: **sense in `periodic()`, act in a command.**
`periodic()` runs every tick no matter what (that's why it holds only the
harmless read-and-log), and the writes live in `setDesiredState`, which a
command calls — so motors are commanded only while the robot is enabled. And
because the scheduler runs `periodic()` before any command each tick, the
bundle is always fresh by the time `setDesiredState` reads it for the cosine
error: **inputs first, then logic**, which is exactly what makes a tick
reproducible. Second, **`Logger.processInputs`** is the two-faced door at the
heart of replay: live, it *writes* the inputs to the log; in replay, the same
call *reads* them back out of the log and overwrites the bundle — your logic
can't tell the difference, which is the entire point. (It also logs each
field under the key you gave it — `Drivetrain/Module0/SteerAngleDegrees` and
friends now come from here, so the manual per-module `recordOutput` in
`Drivetrain.periodic()` can be deleted.) Third, look at the question-methods:
they read the *bundle*, not the hardware. Every sensor fact now takes exactly
one path into the program.

One wiring consequence: `Drivetrain.periodic()`'s module loop must now call
`module.periodic()` on each module so the bundles refresh — that's the read
that used to happen implicitly. The loop still builds the `ModuleStates`
array for the Swerve tab afterward; it just calls the read first.

**Edit the module loop in `Drivetrain.periodic()`:**

```java
    for (int i = 0; i < m_modules.length; i++) {
      m_modules[i].periodic();  // refresh + log this module's inputs
      states[i] = new SwerveModuleState(
          m_modules[i].getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
    }
    Logger.recordOutput("Drivetrain/ModuleStates", states);
```

Delete the module's old `simulationPeriodic()` — the physics lives inside
`ModuleIOSim` now — and remove the module loop from
`Drivetrain.simulationPeriodic()`.

---

## 7. Three modes, one switch

Which IO does a module get? That depends on where the code is running, and
"where am I running" deserves a proper type. A Java **enum** is a type whose
values are a fixed menu — you can't typo a mode that doesn't exist.

**Add to the top of `Constants.java`:**

```java
public final class Constants {
  public enum Mode { REAL, SIM, REPLAY }

  /** Change SIM → REPLAY to re-run a log file instead of simulating fresh. */
  public static final Mode kSimMode = Mode.SIM;
  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;

  // ...the nested constants classes stay...
}
```

(`RobotBase.isReal()` needs `import edu.wpi.first.wpilibj.RobotBase;` — a
question-method deciding a constant.) Then teach `Drivetrain` to build
modules for the current mode, with a small static helper.

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

  private static SwerveModule makeModule(
      int index, int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      Translation2d location) {
    ModuleIO io = switch (Constants.kCurrentMode) {
      case REAL -> new ModuleIOTalonFX(driveId, steerId, cancoderId, magnetOffsetRotations);
      case SIM -> new ModuleIOSim(driveId, steerId, cancoderId, magnetOffsetRotations);
      case REPLAY -> new ModuleIO() {}; // inputs come from the log
    };
    return new SwerveModule(io, "Drivetrain/Module" + index, location);
  }
```

Enums and **`switch` expressions** are made for each other: one arrow arm
per mode, and the whole thing *is* a value you can assign. Better, the
compiler counts the arms against the menu — add a fourth mode next season
and this line refuses to build until you say what it means. Three worlds,
three implementations, chosen in one place.

That `new ModuleIO() {}` in the replay arm is an **anonymous class** — "a
nameless class implementing `ModuleIO`, overriding nothing." Every method
keeps its `default` do-nothing body: reads leave the inputs untouched
(replay overwrites them from the log anyway), writes go nowhere (there are
no motors). Ten characters of syntax for "hardware that doesn't exist" —
this is why the interface's methods got default bodies.

---

## 8. The gyro gets the same treatment

Same pattern, smaller scale — read it as a rerun.

**Create `GyroIO.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface GyroIO {
  @AutoLog
  public static class GyroIOInputs {
    public double yawDegrees = 0.0;
  }

  public default void updateInputs(GyroIOInputs inputs) {}

  /** Sim bookkeeping: the commanded rotation rate, in revolutions per second. */
  public default void setSimRotationRate(double omegaRevPerSec) {}
}
```

The real implementation is the shortest class in the course — a Pigeon and
one read.

**Create `GyroIOPigeon2.java`:**

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.Pigeon2;

public class GyroIOPigeon2 implements GyroIO {
  private final Pigeon2 m_gyro = new Pigeon2(0); // CAN ID 0 — change to yours

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_gyro.getYaw().getValueAsDouble();
  }
}
```

Notice it doesn't override `setSimRotationRate` at all — the real robot has
no use for it, so the `default` no-op body is exactly right. That's the
interface earning its keep from the other direction.

The sim implementation absorbs Lesson 8's fake-gyro integration (the
`m_lastCommandedOmega` and `m_simHeadingDegrees` fields move here from
`Drivetrain`) — and look: no Pigeon, no Phoenix, no hardware at all. A
heading you integrate yourself needs nothing but arithmetic, so unlike the
module, this sim class doesn't extend the real one — it stands alone.
**Create `GyroIOSim.java`:**

```java
package frc.robot.subsystems;

public class GyroIOSim implements GyroIO {
  private double m_lastCommandedOmega = 0.0;
  private double m_simHeadingDegrees  = 0.0;

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    // Lesson 8's integration: add rate × time, every tick.
    m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;
    inputs.yawDegrees = m_simHeadingDegrees;
  }

  @Override
  public void setSimRotationRate(double omegaRevPerSec) {
    m_lastCommandedOmega = omegaRevPerSec;
  }
}
```

Replace the `m_gyro`, `m_lastCommandedOmega`, and `m_simHeadingDegrees`
fields with an IO pair, picked by the same three-arm switch as the modules.

**Edit `Drivetrain`'s gyro fields:**

```java
  private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
    case REAL -> new GyroIOPigeon2();
    case SIM -> new GyroIOSim();
    case REPLAY -> new GyroIO() {}; // inputs come from the log
  };
  private final GyroIOInputsAutoLogged m_gyroInputs = new GyroIOInputsAutoLogged();

  /** Robot heading in degrees (CCW positive). */
  public double getHeadingDegrees() {
    return m_gyroInputs.yawDegrees;
  }
```

Update the two places that fed the old bookkeeping (`applyChassisSpeeds`
sets `m_gyroIO.setSimRotationRate(...)` instead of `m_lastCommandedOmega`,
and `driveDistance`'s zero line does the same).

**Add the gyro read to the very top of `Drivetrain.periodic()`:**

```java
  @Override
  public void periodic() {
    m_gyroIO.updateInputs(m_gyroInputs);
    Logger.processInputs("Drivetrain/Gyro", m_gyroInputs);

    // ...module loop, ModuleStates/Heading/Pose logging, odometry update, Field2d...
  }
```

— and delete `Drivetrain.simulationPeriodic()` entirely. Every scrap of
sim-only code now lives inside an IO implementation, which is exactly where
"pretend hardware" belongs.

---

## 9. Teach `Robot.java` about replay

Last plumbing: the logger itself has to know it's replaying.

**Add to `Robot.java`'s imports:**

```java
import org.littletonrobotics.junction.LogFileUtil;
import org.littletonrobotics.junction.wpilog.WPILOGReader;
```

**Update the constructor from Lesson 3 to branch on the mode:**

```java
  public Robot() {
    if (Constants.kCurrentMode == Constants.Mode.REPLAY) {
      setUseTiming(false); // run as fast as the computer can, not at 50 Hz
      String logPath = LogFileUtil.findReplayLog();
      Logger.setReplaySource(new WPILOGReader(logPath));
      Logger.addDataReceiver(new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_sim")));
    } else {
      Logger.addDataReceiver(new NT4Publisher());
      Logger.addDataReceiver(new WPILOGWriter());
    }
    Logger.start();

    // ...the constructor's existing code stays below...
  }
```

Read the replay branch as a pipeline: `setReplaySource` points the logger at
an old log to *read inputs from*; the `WPILOGWriter` writes the recomputed
results to a new file next to it, suffixed `_sim`; and `setUseTiming(false)`
lets the whole thing sprint — a 3-minute match replays in seconds, because
nothing is waiting for real time to pass.

---

## 10. Run a replay

The moment of truth, in four steps:

1. **Record something.** `kSimMode = Mode.SIM`, `./gradlew simulateJava`,
   drive around for fifteen seconds or so — teleop, an auto, whatever. Close
   the sim. There's a fresh `.wpilog` in your project's `logs/` folder.
2. **Switch modes.** In `Constants.java`, change `kSimMode` to
   `Mode.REPLAY`.
3. **Replay it.** `./gradlew simulateJava` again. The terminal asks for a
   log path — paste the path to the file from step 1. It chews through the
   whole log almost instantly and exits. A new file sits next to the
   original, ending in `_sim.wpilog`.
4. **Look at it.** Open the `_sim` log in AdvantageScope. Your inputs are
   there, identical — and the computed values now live under
   **`ReplayOutputs`** instead of `RealOutputs`. Drop the replayed
   `Drivetrain/Pose` on the Odometry tab and watch your drive session play
   back, recomputed from scratch on your laptop.

Right now `ReplayOutputs` should *match* the original `RealOutputs` — same
inputs, same code, same answers, which is itself worth checking (that's
determinism, verified). The magic arrives when the code *changes*.

**Add a brand-new logged value to `Drivetrain.periodic()`:**

```java
    Logger.recordOutput("Drivetrain/SpeedMps",
        Math.hypot(m_modules[0].getDriveVelocityMetersPerSec(), 0.0));
```

— replay the *same old log*, and the new value appears in `ReplayOutputs`,
computed for a session that happened before the code existed. You changed
the code, and the past updated. That's the trick the whole lesson was
building toward, and on a real team it's how you debug a match that already
happened. (The `replayWatch` Gradle task automates the loop — it re-runs the
replay every time you save a code change — worth trying once you're doing
this in anger.)

Flip `kSimMode` back to `Mode.SIM` when you're done.

---

## Try it

1. **Verify determinism.** Replay a log with *unchanged* code, then overlay
   `RealOutputs/Drivetrain/Pose` and `ReplayOutputs/Drivetrain/Pose` in
   AdvantageScope. They should sit exactly on top of each other. If they
   don't, some input isn't going through `processInputs` — go find it.
2. **Change the past.** Break your odometry on purpose (multiply
   `drivePositionMeters` by `1.1` in `ModuleIOTalonFX.updateInputs` — a fake
   "wheel slip"), record a session, restore the code, and replay the bad
   log. The replayed pose now shows where the robot *would* have thought it
   was with honest wheels. This exact move — fix code, replay a match — is
   how top teams debug odometry.
3. **Cut the cord.** `ModuleIOSim` leans on Phoenix's simulated firmware by
   extending the TalonFX class. Rebuild it standalone: `implements ModuleIO`
   directly, with a `DCMotorSim` and a WPILib `PIDController` doing the
   closed loops — no Phoenix at all (the way `GyroIOSim` already works). The
   CANcoder disappears entirely in this version — there's no remote sensor
   to wire up when the "firmware" is a `PIDController` you wrote yourself.
   Building it will test whether the interface boundary is really as clean
   as it looks — nothing outside the class should need to change.

---

## What you learned

This was the biggest idea in the course, so here it is small: **a robot
program is a pure function from inputs to outputs, and if you log the
inputs, you can run the function again.** Making that true took an
**interface** with `default` do-nothing methods, an `@AutoLog`-generated
inputs bundle, and one implementation per world: real hardware
(`ModuleIOTalonFX`, `GyroIOPigeon2`), sim (`ModuleIOSim` **extending** the
real class to borrow its firmware, `GyroIOSim` standing alone with no
hardware at all), and an **anonymous class** as the no-hardware
implementation replay needs — with an **enum** and a **`switch`
expression** picking between the three worlds in one place.
`Logger.processInputs` is the hinge: writer when live, reader when
replaying, invisible to everything downstream. Your
logic classes — `SwerveModule`, `Drivetrain` — never touch hardware anymore,
and in exchange they gained a superpower: they can be run against the past.
One last upgrade remains, and it's about trusting that past less — the pose
that odometry dead-reckons drifts, and Lesson 14 teaches the robot to accept
corrections.

Next: [Lesson 14 — The pose estimator](14-pose-estimator.md).
