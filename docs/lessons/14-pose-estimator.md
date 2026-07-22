# Lesson 14 — The pose estimator: a localizer fed by many sources

**Goal:** Move pose tracking out of the drivetrain into its own **localization
subsystem** that fuses a **pose estimator** with any number of registered
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
- Localization as **its own subsystem**, fed by interchangeable sources
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

## 2. Give localization its own subsystem

Meet the **`Localizer`**: a subsystem whose entire job is to hold the pose
estimator and keep it fed. First it needs a way to *be* fed by different
kinds of sources, and that's a job for an **interface** — the same tool that
gave you swappable IO in Lesson 13, pointed at a new problem.

A **`PoseProvider`** is anything that can fold its own evidence into the
shared estimate. Create `src/main/java/frc/robot/subsystems/PoseProvider.java`:

```java
package frc.robot.subsystems;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;

public interface PoseProvider {
  /** Called every tick: fold whatever you know into the shared estimate. */
  void updatePoseEstimate(SwerveDrivePoseEstimator estimator);
}
```

One method, and it hands the provider the estimator to contribute to. Why
this shape? Because the two sources contribute in genuinely different ways —
wheel odometry calls the estimator's `update(...)`, a camera calls its
`addVisionMeasurement(...)` — and an interface is exactly how you let two
unlike classes answer the same call in their own way. Handing each provider
the whole estimator is a small liberty (a camera *could* call `update`); the
tradeoff buys a dead-simple contract, and we take it.

Now the subsystem itself. It owns the estimator, keeps a **list** of
providers, ticks every one of them each cycle, and exposes the fused pose.
Create `src/main/java/frc/robot/subsystems/Localizer.java`:

```java
package frc.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class Localizer extends SubsystemBase {
  private final Drivetrain m_drivetrain;
  private final SwerveDrivePoseEstimator m_estimator;
  private final List<PoseProvider> m_providers = new ArrayList<>();
  private final Field2d m_field = new Field2d();

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
  }

  /** Register a source of pose information. */
  public void addProvider(PoseProvider provider) {
    m_providers.add(provider);
  }

  @Override
  public void periodic() {
    for (PoseProvider provider : m_providers) {
      provider.updatePoseEstimate(m_estimator);
    }
    Logger.recordOutput("Localizer/Pose", getPose());
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

The drivetrain plays two roles here, and it's worth seeing both. It's the
**odometry backbone** the estimator is literally built around — a swerve pose
estimator can't exist without swerve kinematics — which is why the `Localizer`
holds onto it for construction and for `resetPose` (re-anchoring needs the
live gyro and wheel positions). And it's the **first registered provider**, so
its wheel-and-gyro update runs each tick through the very same loop every
future camera will. Backbone and provider #0 at once.

The `periodic()` is the whole engine: walk the providers in registration
order — odometry first, corrections after — letting each fold its evidence in,
then log and draw the result. Nothing here drives a motor, so running it every
tick (even while disabled) is exactly right: you *want* the pose to keep
tracking if someone shoves the robot on the field.

---

## 3. Teach the drivetrain to be a provider

The drivetrain already knows everything odometry needs; now it just has to
expose it and answer the `PoseProvider` call. In `Drivetrain`, add the one new
import and let the class line grow a promise (`SwerveDriveKinematics`,
`Rotation2d`, and `SwerveModulePosition` are all already imported from earlier
lessons; `PoseProvider` is in the same package, so it needs no import):

```java
import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;

public class Drivetrain extends SubsystemBase implements PoseProvider {
```

Then **delete** the pose machinery that used to live here — the
`m_odometry` field, `getPose()`, `resetPose(...)`, the `m_field`/`Field2d`,
the `SmartDashboard.putData` in the constructor, and the odometry `update` and
pose log from `periodic()`. All of it moved to the `Localizer`. In its place,
three small getters and the provider method:

```java
  public SwerveDriveKinematics getKinematics() {
    return m_kinematics;
  }

  /** Heading as a Rotation2d — what the estimator speaks. */
  public Rotation2d getRotation() {
    return Rotation2d.fromDegrees(getHeadingDegrees());
  }

  /** Snapshot the four modules' positions. (Was the private modulePositions() in Lesson 11.) */
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

There's a subtle ordering requirement worth naming. `updatePoseEstimate`
reads the gyro and module *input bundles*, which the drivetrain's own
`periodic()` refreshes each tick (Lesson 13). For the odometry update to use
fresh numbers, the drivetrain's `periodic()` must run before the localizer's —
and it does, because the scheduler ticks subsystems in construction order, and
you'll build `m_drivetrain` before `m_localizer`. Declare them in that order
and the dependency takes care of itself.

One method used to ask the drivetrain for its own pose — Lesson 11's
`driveToPose` sketch. The pose lives somewhere new now, so the command asks
for it instead of owning it.

**Change `driveToPose`'s signature to take the pose as a supplier:**

```java
  /** Drive toward a field-coordinate pose. The pose now comes from the Localizer. */
  public Command driveToPose(Pose2d target, Supplier<Pose2d> pose) {
    // ...same body as Lesson 11, with every getPose() swapped for pose.get()...
  }
```

A caller hands it the localizer's getter — `driveToPose(target,
() -> m_localizer.getPose())` — the same supplier-lambda move the joystick
bindings have used all along.

---

## 4. The door: a vision provider

Now the *second* kind of provider — the one this whole lesson was for. A
camera contributes through the estimator's other input:

```java
estimator.addVisionMeasurement(visionPose, timestampSeconds);
```

Read the two arguments carefully, because the second carries a big idea.
`visionPose` is an absolute claim: "a camera computed that the robot is at
this field position." And `timestampSeconds` says **when that claim was
true** — because by the time a camera has captured a frame, found an AprilTag,
and done the geometry, tens of milliseconds have passed, and the robot has
moved. The estimator handles this with quiet brilliance: it keeps a short
history, rewinds to the timestamp, blends the correction in *where it
belongs*, and replays its own updates forward. Data that knows its own age is
what makes fusing a slow sensor with a fast one possible — remember that;
it's everywhere in robotics.

We have no camera on the bench, so we'll write a stand-in that holds a pending
sighting until the next tick folds it in. It's a `PoseProvider` of a different
type — same contract, different contribution. Create
`src/main/java/frc/robot/subsystems/VisionPoseProvider.java`:

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.wpilibj.Timer;

public class VisionPoseProvider implements PoseProvider {
  private Pose2d m_pending = null;

  /** Pretend a camera just saw the robot here. A real camera calls this on each frame. */
  public void reportSighting(Pose2d pose) {
    m_pending = pose;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    if (m_pending != null) {
      estimator.addVisionMeasurement(m_pending, Timer.getFPGATimestamp());
      Logger.recordOutput("Localizer/VisionPose", m_pending);
      m_pending = null;
    }
  }
}
```

(`Timer.getFPGATimestamp()` is the robot's clock, in seconds. "Now" is the
honest timestamp for a zero-latency fake; a real vision system hands you the
capture time instead.) Look at what the `Localizer` never had to learn: it
loops `PoseProvider`s and calls `updatePoseEstimate`. It has no idea one of
them is a camera. Add a real PhotonVision provider next season and the
localizer doesn't change by a line — that's the interface earning its keep,
exactly like the IO layer did.

---

## 5. Wire it up and watch it correct

In `RobotContainer`, three fields — drivetrain, camera, localizer, *in that
order* so the drivetrain ticks first — and the camera registered as a second
provider:

```java
public class RobotContainer {
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final VisionPoseProvider m_camera = new VisionPoseProvider();
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain
```

```java
  // in the constructor:
  m_localizer.addProvider(m_camera); // the second provider — vision
```

Then a button that fires a fake sighting. In `configureBindings()`:

```java
    // Pretend a camera just saw us at (2, 5) facing 90°.
    m_driverController.start().onTrue(Commands.runOnce(() ->
        m_camera.reportSighting(new Pose2d(2.0, 5.0, Rotation2d.fromDegrees(90)))));
```

The Start button is the little one near the Xbox logo — face buttons are
precious, fake cameras are not — and `Commands.runOnce` (Lesson 9's `Commands`
toolbox) is right because reporting a sighting isn't *driving*: it claims no
subsystem and interrupts nothing. Let `Ctrl+.` add the `Pose2d` and
`Rotation2d` imports.

Now run it. Sim up, Odometry tab open with `Localizer/Pose` on the field (drop
`Localizer/VisionPose` there too, as a second object) — or just watch the
**Field** widget in SimGUI. Drive somewhere, then press Start. The robot on
the field *slides decisively toward (2, 5)*. Not a teleport: a strong pull,
blended over a few ticks, weighted by how much the estimator trusts vision
versus its own wheels. Keep driving and press it again. Every press is one
"camera frame"; a real robot gets dozens per second, each nudging the estimate
toward truth while odometry fills in the fast motion between frames. That
division of labor — **odometry for smoothness, vision for truth** — is modern
FRC localization in one sentence.

> **The trust knob.** How hard a measurement pulls is set by its **standard
> deviations** — smaller numbers mean "trust this more." The defaults are
> reasonable, and one line in the `Localizer` adjusts them:
> `m_estimator.setVisionMeasurementStdDevs(VecBuilder.fill(0.5, 0.5, 999999));`
> reads as "trust vision's x and y to about half a meter, and ignore its
> heading entirely" — a common real-robot choice, since the gyro's heading is
> usually better than a camera's. Tuning trust is a deep art; knowing the knob
> exists is enough for today.

---

## Try it

1. **Drift, then correct.** Resurrect Lesson 13's fake wheel slip (multiply
   `drivePositionMeters` by `1.1` in `ModuleIOTalonFX`), drive a lap, and
   watch the pose wander somewhere false. Now press Start. The lie gets
   pulled back toward the "camera's" truth — the exact drama that plays out on
   a real field, in slow motion. Remove the slip after.
2. **A second camera.** Register a *second* `VisionPoseProvider` and bind it
   to another button reporting a different spot. Nothing in `Localizer`
   changes — you just `addProvider` again. That's the whole point of the
   registry: sources are pluggable. (On a real robot, that's a front camera
   and a back camera, both feeding the same estimate.)
3. **Feed it garbage.** Report an absurd sighting — `(15, 1, 0°)` while you sit
   at the origin — and press once mid-drive. The estimate lurches toward a
   place the robot never was. Moral: the estimator believes what you feed it,
   weighted by the trust knob. Real vision code *filters* before it feeds,
   rejecting sightings too far from the current estimate to be plausible.

---

## What you learned — and where the road goes

Localization became its own subsystem, and that reframing is the lesson.
Dead reckoning **drifts** because addition never forgets, no inside math
fixes it, and the cure is an outside reference — so tracking position stopped
being the drivetrain's private business and became a **`Localizer`** that
fuses a **`SwerveDrivePoseEstimator`** with a list of **`PoseProvider`s**.
That interface is the star: odometry and vision are wildly different sources,
but behind one contract they're interchangeable — the drivetrain registered
first as the backbone, a camera second through the same loop, a *third* one
someday with no change to the localizer at all. Corrections arrive through
`addVisionMeasurement` carrying a **timestamp**, so the estimator can rewind,
blend where it belongs, and roll forward.

Fourteen lessons ago, printing a line of text was an achievement. Now you
have a field-relative swerve robot with firmware closed-loop control,
organized telemetry, deterministic replay, and a self-correcting pose fused
from pluggable sources — and every piece of it is something you typed and
can explain.

One provider in that fusion is still pretend, though — `VisionPoseProvider`
only reports what a button tells it to. Lesson 15 replaces it with the real
thing: an actual PhotonVision camera reading actual AprilTags, plus the
ability to simulate more of them than you own. Watch how much of
`Localizer` has to change to accept it. (Spoiler: none.)

Beyond that, two more directions worth knowing about, whenever you're ready
for them:

- **Trajectory following:** `PathPlanner` or `Choreo` turn a drawn path into a
  timed trajectory, chased with the `driveToPose` pattern from Lesson 11 —
  now running on a pose you can finally trust.
- **A second mechanism:** an elevator, a shooter, an intake. Subsystem,
  commands, IO layer, logged inputs — the same spine, one more time, and the
  second time it takes a tenth as long.

Wherever those take you, you're not starting over. You're reusing the
spine — and now you know how it holds up.

Next: [Lesson 15 — Real vision: PhotonVision and multi-camera simulation](15-photonvision.md).
