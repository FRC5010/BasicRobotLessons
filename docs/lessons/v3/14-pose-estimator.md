# Lesson 14 — The pose estimator: a localizer fed by many sources

**Goal:** Move pose tracking out of the drivetrain into its own **localization
class** that fuses a **pose estimator** with any number of registered
**pose providers** — the drivetrain's wheel odometry first, a camera second —
and prove it works by injecting fake "camera sightings" and watching the pose
snap back to truth.

**New Java concepts**
- An **interface for extensibility** — many classes, one contract (`PoseProvider`)
- A **registry** — a `List` you add sources to, then loop over
- **Timestamps** — data that says *when* it was true, not just what

**New robot concepts**
- Why dead reckoning **drifts**, and why no amount of math fixes it
- **`SwerveDrivePoseEstimator`** — odometry plus correction inputs
- Localization pulled out into **its own class**, fed by interchangeable sources
- **`addVisionMeasurement`** and **measurement trust** (standard deviations)

---

## 1. Odometry lies, slowly

Lesson 11's Try it had you drive a square and watch the reported pose come
home slightly wrong. That error is **drift**, and it's worth understanding
why it's unfixable from the inside. Odometry adds up thousands of tiny
measured steps. Every step carries a tiny error — a wheel scrubbing in a
turn, a bump, carpet flex — and *addition never forgets*. The errors don't
average out; they accumulate. After a minute of hard driving, the pose can
be off by half a meter, and nothing in the math can tell, because every
individual step looked perfectly reasonable.

The wrong instinct is "better math will fix it." It won't — the information
is simply *gone*. What fixes drift is an **outside reference**: something
that occasionally says "actually, you are *here*," anchored to the world
instead of to your own history. On real robots that's a camera seeing an
AprilTag whose field position is known. Blending "my running total" with
"occasional absolute sightings" is a classic estimation problem, and WPILib
ships the solution: **`SwerveDrivePoseEstimator`**, odometry with a door for
corrections.

But notice what "corrections from cameras" implies about *where the pose
should live*. Tracking position is about to stop being a wheels-only job and
start being a fusion job — wheels, gyro, one camera, maybe three next season.
That's a distinct responsibility, and it doesn't belong to the class whose
job is spinning motors. So this lesson does two things at once: upgrades the
engine to the estimator, and gives it a home of its own.

---

## 2. Give localization its own home

Meet the **`Localizer`**: a class whose entire job is to hold the pose
estimator and keep it fed. First it needs a way to *be* fed by different
kinds of sources, and that's a job for an **interface** — the same tool that
gave you swappable IO in Lesson 13, pointed at a new problem.

A **`PoseProvider`** is anything that can fold its own evidence into the
shared estimate.

**Create `src/main/java/first/robot/subsystems/PoseProvider.java`:**

```java
package first.robot.subsystems;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;

public interface PoseProvider {
  /** Called every tick: fold whatever you know into the shared estimate. */
  void updatePoseEstimate(SwerveDrivePoseEstimator estimator);
}
```

One method, and it hands the provider the estimator to contribute to. Notice
what's missing compared to Lesson 13's `ModuleIO`/`GyroIO`: no `default`
body. Every provider genuinely has evidence to contribute — there's no
"hardware that doesn't exist yet" case here the way `REPLAY` needed one, so
there's nothing to leave undone.

Why this shape? Because the two sources contribute in genuinely different
ways — wheel odometry calls the estimator's `update(...)`, a camera calls
its `addVisionMeasurement(...)` — and an interface is exactly how you let
two unlike classes answer the same call in their own way. Handing each
provider the whole estimator is a small liberty (a camera *could* call
`update`); the tradeoff buys a dead-simple contract, and we take it.

Now the class itself. It owns the estimator, keeps a **list** of providers,
ticks every one of them each cycle, and exposes the fused pose.

**Create `src/main/java/first/robot/subsystems/Localizer.java`:**

```java
package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.wpilib.command3.Scheduler;
import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructPublisher;
import org.wpilib.smartdashboard.Field2d;
import org.wpilib.smartdashboard.SmartDashboard;

public class Localizer {
  private final Drivetrain m_drivetrain;
  private final SwerveDrivePoseEstimator m_estimator;
  private final List<PoseProvider> m_providers = new ArrayList<>();
  private final Field2d m_field = new Field2d();

  private final StructPublisher<Pose2d> m_posePublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Localizer/Pose", Pose2d.struct)
          .publish();

  public Localizer(Drivetrain drivetrain) {
    m_drivetrain = drivetrain;

    // The estimator is swerve-shaped at its core: it needs the drivetrain's
    // kinematics and a first sample to start blending from.
    m_estimator = new SwerveDrivePoseEstimator(
        drivetrain.getKinematics(),
        drivetrain.getRotation(),
        drivetrain.getModulePositions(),
        new Pose2d()); // start at (0, 0, 0°) until an auto resets it

    // The drivetrain is the odometry backbone — register it first.
    addProvider(drivetrain);

    SmartDashboard.putData("Field", m_field); // the SimGUI field view from Lesson 11
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** Register a source of pose information. */
  public void addProvider(PoseProvider provider) {
    m_providers.add(provider);
  }

  private void periodic() {
    for (PoseProvider provider : m_providers) {
      provider.updatePoseEstimate(m_estimator);
    }
    m_posePublisher.set(getPose());
    m_field.setRobotPose(getPose());
  }

  public Pose2d getPose() {
    return m_estimator.getEstimatedPosition();
  }

  /** Re-anchor the estimate — re-supplies the live gyro and wheel positions. */
  public void resetPose(Pose2d pose) {
    m_estimator.resetPosition(
        m_drivetrain.getRotation(), m_drivetrain.getModulePositions(), pose);
  }
}
```

Stop on one word in that code: `Localizer` isn't a `Mechanism`. Every
subsystem-shaped class you've written since Lesson 1 has extended
`Mechanism` — `Drivetrain` still does, two sections from now — so this is
worth asking about directly. What does `Mechanism` actually buy a class?
Command-builder methods (`run`, `runRepeatedly`) so it can be *required* by
a command, and an automatic `idle()` default command to fall back to when
nothing else is running it. `Localizer` needs neither: it drives no motors,
so no command will ever `.require()` it, and there's no "idle" behavior to
fall back to when nothing else is happening — it's *always* just reading
providers and publishing a pose. All it actually needs from the scheduler is
a heartbeat, and `Scheduler.getDefault().addPeriodic(Runnable)` — the exact
call `Drivetrain`'s own constructor has used since Lesson 11 — gives it
that with no extra machinery attached. **Being a `Mechanism` is for classes
the scheduler needs to run *commands* against; being ticked every frame is a
smaller ask, and `addPeriodic` is the tool sized for it.**

The drivetrain plays two roles here, and it's worth seeing both. It's the
**odometry backbone** the estimator is literally built around — a swerve
pose estimator can't exist without swerve kinematics — which is why the
`Localizer` holds onto it for construction and for `resetPose` (re-anchoring
needs the live gyro and wheel positions). And it's the **first registered
provider**, so its wheel-and-gyro update runs each tick through the very
same loop every future camera will. Backbone and provider #0 at once.

The `periodic()` method is the whole engine: walk the providers in
registration order — odometry first, corrections after — letting each fold
its evidence in, then publish the result. Nothing here drives a motor, so
running it every tick (even while disabled) is exactly right: you *want*
the pose to keep tracking if someone shoves the robot on the field.

---

## 3. Teach the drivetrain to be a provider

The drivetrain already knows everything odometry needs; now it just has to
expose it and answer the `PoseProvider` call. `SwerveDriveKinematics` and
`SwerveModulePosition` are already imported from earlier lessons;
`PoseProvider` is in the same package, so it needs no import.

**Add to `Drivetrain`'s imports, and let the class line grow a promise:**

```java
import org.wpilib.math.estimator.SwerveDrivePoseEstimator;

public class Drivetrain extends Mechanism implements PoseProvider {
```

**Delete** the pose machinery that used to live here — the `m_odometry`
field, the `Field2d`/`m_field`, and the `StructPublisher<Pose2d>` that
published `Drivetrain/Pose`. All of it moves to `Localizer`, which
publishes the fused result as `Localizer/Pose` instead.

**Delete from `logTelemetry()`, at the bottom:**

```java
    // DELETE — odometry lives on Localizer now.
    Pose2d pose = m_odometry.update(Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());
    m_posePublisher.set(pose);
    m_field.setRobotPose(pose);
```

**Add to `Drivetrain` in its place, three small getters and the provider method:**

```java
  public SwerveDriveKinematics getKinematics() {
    return m_kinematics;
  }

  /** Heading as a Rotation2d — what the estimator speaks. */
  public Rotation2d getRotation() {
    return Rotation2d.fromDegrees(getHeadingDegrees());
  }

  /** Snapshot the four modules' positions into one array — for odometry. */
  public SwerveModulePosition[] getModulePositions() {
    SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];
    for (int i = 0; i < m_modules.length; i++) {
      positions[i] = m_modules[i].getPosition();
    }
    return positions;
  }

  /** As a PoseProvider, the drivetrain contributes wheel-and-gyro odometry. */
  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    estimator.update(getRotation(), getModulePositions());
  }
```

`getModulePositions()` replaces the private `modulePositions()` you wrote in
Lesson 11 — same body, now `public`, because `Localizer` needs to call it
too (once to seed the estimator, once inside `resetPose`).

There's a subtle ordering requirement worth naming. `updatePoseEstimate`
reads the gyro and module *input bundles*, which `Drivetrain`'s own
`logTelemetry()` refreshes each tick (Lesson 13). For the odometry update to
use fresh numbers, `Drivetrain`'s periodic callback must run before
`Localizer`'s. It does, because `Scheduler.addPeriodic` runs its callbacks
in the order they were registered — and each class registers its own
callback in its own constructor, so as long as `drivetrain` is built (and
therefore registers) before `localizer` is, the dependency takes care of
itself. Declare the fields in that order in `Robot.java` and you never have
to think about it again.

One method used to ask the drivetrain for its own pose — Lesson 11's
`driveToPose` sketch. The pose lives somewhere new now, so the command asks
for it instead of owning it.

**Change `driveToPose`'s signature to take the pose as a supplier, and swap
every `getPose()` inside it for `pose.get()`:**

```java
  /** Drive straight toward 'target' using P control, field-relative. Finishes within 5 cm. */
  public Command driveToPose(Pose2d target, Supplier<Pose2d> pose) {
    double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond);
    return runRepeatedly(() -> {
          Pose2d current = pose.get();
          // ...same body as Lesson 11 otherwise...
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities()))
        .until(() -> pose.get().minus(target).getTranslation().getNorm() < 0.05)
        .named("Drive To Pose");
  }
```

No new import needed — `Drivetrain.java` already imports
`java.util.function.Supplier` for `drive`/`driveFieldRelative`. A future
caller hands it the localizer's getter — `driveToPose(target,
() -> robot.localizer.getPose())` — the same supplier-lambda move the
joystick bindings have used all along. `driveToPose` stays unbound to any
button for now, exactly as it was in Lesson 11 — this lesson only fixes
*where its pose comes from*.

---

## 4. The door: a vision provider

Now the *second* kind of provider — the one this whole lesson was for. A
camera contributes through the estimator's other input.

*Nothing to add — this is just how it's called, inside the provider you're about to write:*

```java
estimator.addVisionMeasurement(visionPose, timestampSeconds);
```

Read the two arguments carefully, because the second carries a big idea.
`visionPose` is an absolute claim: "a camera computed that the robot is at
this field position." And `timestampSeconds` says **when that claim was
true** — because by the time a camera has captured a frame, found an
AprilTag, and done the geometry, tens of milliseconds have passed, and the
robot has moved. The estimator handles this with quiet brilliance: it keeps
a short history, rewinds to the timestamp, blends the correction in *where
it belongs*, and replays its own updates forward. Data that knows its own
age is what makes fusing a slow sensor with a fast one possible — remember
that; it's everywhere in robotics.

We have no camera on the bench, so we'll write a stand-in that holds a
pending sighting until the next tick folds it in. It's a `PoseProvider` of a
different type — same contract, different contribution.

**Create `src/main/java/first/robot/subsystems/VisionPoseProvider.java`:**

```java
package first.robot.subsystems;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructPublisher;
import org.wpilib.system.Timer;

public class VisionPoseProvider implements PoseProvider {
  private Pose2d m_pending = null;

  private final StructPublisher<Pose2d> m_sightingPublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Localizer/VisionPose", Pose2d.struct)
          .publish();

  /** Pretend a camera just saw the robot here. A real camera calls this on each frame. */
  public void reportSighting(Pose2d pose) {
    m_pending = pose;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    if (m_pending != null) {
      estimator.addVisionMeasurement(m_pending, Timer.getTimestamp());
      m_sightingPublisher.set(m_pending);
      m_pending = null;
    }
  }
}
```

(`Timer.getTimestamp()` is the robot's clock, in seconds. "Now" is the
honest timestamp for a zero-latency fake; a real vision system hands you the
capture time instead.) Look at what `Localizer` never had to learn: it
loops `PoseProvider`s and calls `updatePoseEstimate`. It has no idea one of
them is a camera. Add a real vision provider next season and `Localizer`
doesn't change by a line — that's the interface earning its keep, exactly
like the IO layer did.

---

## 5. Wire it up and watch it correct

Three fields on `Robot` — drivetrain, localizer, camera, *in that order* so
the drivetrain ticks first — with the camera registered as a second
provider.

**Add to `Robot`, with the other fields:**

```java
  public final Drivetrain drivetrain = new Drivetrain();
  // Localizer reads the drivetrain's kinematics/rotation/module positions at
  // construction, so drivetrain must be built first — it already is, above.
  public final Localizer localizer = new Localizer(drivetrain);
  public final VisionPoseProvider camera = new VisionPoseProvider();
```

**Add to `Robot`'s constructor:**

```java
  public Robot() {
    DataLogManager.start();
    Scheduler.getDefault().addEventListener(this::logCommandStart);
    localizer.addProvider(camera); // the second provider — vision
  }
```

**Add a button that fires a fake sighting, to `RobotTeleop`'s constructor:**

```java
    // Pretend a camera just saw us at (2, 5) facing 90°.
    robot.driverController.start().onTrue(reportFakeSighting(robot));
  }

  private static Command reportFakeSighting(Robot robot) {
    return Command.noRequirements(coroutine ->
            robot.camera.reportSighting(new Pose2d(2.0, 5.0, Rotation2d.fromDegrees(90))))
        .named("Report Fake Sighting");
  }
```

The Start button is the little one near the middle of the gamepad — face
buttons are precious, fake cameras are not — and `Command.noRequirements`
is right because reporting a sighting isn't *driving*: it claims no
mechanism and interrupts nothing. The coroutine body here has no
`coroutine.yield()` in it at all, so it runs once and the command is done on
the very same tick — the same one-shot shape Lesson 9's `Autos` used, just
with nothing to sequence.

Now run it. Sim up, watch the **Field** widget in SimGUI. Drive somewhere,
then press Start. The robot on the field slides toward (2, 5) — not a
teleport, a real pull. Press it again and it slides a little further; the
first press doesn't finish the job on its own. That's the estimator's
default trust settings at work: each reported sighting nudges the estimate,
it doesn't overwrite it. A real camera reports dozens of times a second, so
in practice the pull looks instantaneous — press Start repeatedly here to
see the same thing happen in slow motion, one "camera frame" at a time.
That division of labor — **odometry for smoothness, vision for truth** — is
modern FRC localization in one sentence.

> **The trust knob.** How hard a measurement pulls is set by its **standard
> deviations** — smaller numbers mean "trust this more." The defaults are
> reasonable, and one line in `Localizer` adjusts them:
> `m_estimator.setVisionMeasurementStdDevs(VecBuilder.fill(0.5, 0.5, 999999));`
> reads as "trust vision's x and y to about half a meter, and ignore its
> heading entirely" — a common real-robot choice, since the gyro's heading is
> usually better than a camera's. Tuning trust is a deep art; knowing the knob
> exists is enough for today.

---

## Try it

1. **Drift, then correct.** Resurrect Lesson 13's Try It — multiply
   `drivePositionMeters` by `1.1` in `ModuleIOTalonFX.updateInputs` — drive
   a lap, and watch the pose wander somewhere false. Now press Start a few
   times. The lie gets pulled back toward the "camera's" truth — the exact
   drama that plays out on a real field, in slow motion. Remove the slip
   after.
2. **A second camera.** Register a *second* `VisionPoseProvider` and bind it
   to another button reporting a different spot. Nothing in `Localizer`
   changes — you just `addProvider` again. That's the whole point of the
   registry: sources are pluggable. (On a real robot, that's a front camera
   and a back camera, both feeding the same estimate.)
3. **Feed it garbage.** Report an absurd sighting — `(15, 1, 0°)` while you
   sit at the origin — and press Start several times in a row. The estimate
   lurches toward a place the robot never was. Moral: the estimator believes
   what you feed it, weighted by the trust knob. Real vision code *filters*
   before it feeds, rejecting sightings too far from the current estimate to
   be plausible.

---

## What you learned — and where the road goes

Localization got pulled out into its own class, and that reframing is the
lesson. Dead reckoning **drifts** because addition never forgets, no inside
math fixes it, and the cure is an outside reference — so tracking position
stopped being the drivetrain's private business and became a **`Localizer`**
that fuses a **`SwerveDrivePoseEstimator`** with a list of **`PoseProvider`s**.
That interface is the star: odometry and vision are wildly different sources,
but behind one contract they're interchangeable — the drivetrain registered
first as the backbone, a camera second through the same loop, a *third* one
someday with no change to `Localizer` at all. Corrections arrive through
`addVisionMeasurement` carrying a **timestamp**, so the estimator can rewind,
blend where it belongs, and roll forward.

You also made a real design call this lesson, not just a rename: `Localizer`
isn't a `Mechanism`, because nothing about what it does needs one. It needs
a heartbeat, and `addPeriodic` is the tool sized for exactly that — a
smaller commitment than the full command-and-requirement machinery
`Mechanism` brings. Worth remembering the next time you write a class that
needs to tick every frame but never needs to be `.require()`d by a command.

Fourteen lessons ago, printing a line of text was an achievement. Now you
have a field-relative swerve robot with firmware closed-loop control,
organized telemetry, and a self-correcting pose fused from pluggable
sources — and every piece of it is something you typed and can explain.

One provider in that fusion is still pretend, though — `VisionPoseProvider`
only reports what a button tells it to. A future lesson replaces it with the
real thing: an actual camera reading actual AprilTags. Watch how much of
`Localizer` would have to change to accept it. (Spoiler: none.)

Next: Lesson 15 — Real vision.
