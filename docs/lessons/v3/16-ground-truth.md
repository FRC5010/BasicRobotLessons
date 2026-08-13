# Lesson 16 — Ground truth: give the simulation a body

**Goal:** Replace four drive motors that don't know about each other with one
shared chassis body, moving under a grip-limited acceleration instead of
teleporting to whatever speed was commanded — and use it to check odometry
against something other than itself for the first time.

**New robot concepts**
- **Ground truth** — a second, independent notion of "where the robot is,"
  separate from odometry's estimate
- **Friction-limited acceleration** — `a = μg`, independent of the robot's
  mass
- **`MathUtil.slewRateLimit`** — bounding how fast a value may change,
  applied to a 2D velocity so it limits acceleration *magnitude*, not each
  axis separately
- **`Twist2d.exp()`** — exact pose integration, curved turns included, the
  same math `SwerveDriveOdometry` runs internally

No new Java syntax this lesson — every tool below (private helper methods,
a shared `static` field, `if`/`else if`/`else`) is one you've already used.
The new ideas are all about the robot, not the language.

---

## 1. Four motors in an empty universe

Here's the picture worth correcting before anything else, because it's been
quietly wrong since Lesson 4: *your simulation does not model your robot.*
It models four drive motors and four steering motors, each spinning a small
flywheel, each in its own private universe where nothing else exists.
Module 0 has never once been aware that module 1 is bolted to the same
frame. The chassis has no mass. The tires have no grip.

You've been getting away with it because everything downstream of the
encoder can't tell the difference — that was Lesson 4's whole promise, and
it held. But look at what the course has had to fake as a result. Lesson
15's Try It asked you to multiply `robotToCamera`'s offset on purpose and
notice the sim couldn't show you the consequence, because there was no
independent truth to check against. There's a deeper version of the same
gap: every wheel spins exactly as fast as it's told, so odometry has never
once been *wrong* in simulation — it's just been a very precise record of
what the motors did, with nothing to compare it to.

Today that changes. One shared chassis gets a body — mass-equivalent grip,
a real acceleration limit, a heading that's tracked once instead of trusted
from four separate encoders — and for the first time, the number your
odometry reports is no longer the only version of events.

The best part is what *doesn't* change. `SwerveModule`, `ModuleIOTalonFX`,
`ModuleIOSim`, `Localizer`, every command, every log key from Lessons 13–15:
untouched. Everything today happens in exactly two places — a new class,
and the two spots in `Drivetrain` and `GyroIOSim` that plug into it — and
that's not a happy accident. It's the IO layer from Lesson 13 doing exactly
the job it was built for.

---

## 2. How hard can the chassis actually accelerate?

A real chassis doesn't jump to a commanded speed — its tires can only push
so hard before they skid, and how hard they can push is a fact about
*friction*, not about the robot's weight.

Here's the physics in one line, and it's worth sitting with because the
answer is smaller than it looks. The force a tire can supply before
skidding is `F = μmg` — grip coefficient times mass times gravity. The
acceleration that force produces is `a = F / m`. Substitute one into the
other and the mass **cancels**: `a = μg`. A heavier robot isn't slower to
accelerate, provided it has proportionally more grip to move that weight —
which is exactly why real FRC robots don't scale wheel count or tire
pressure down just because they're light. Grip alone decides how hard you
can accelerate.

**Add to `DriveConstants` in `Constants.java`:**

```java
// How hard the tires can grip, in sim — a Colson-wheel-on-carpet guess.
public static final double kWheelCoF = 1.2;

// a = μg — how hard the chassis can actually accelerate, independent of
// mass, because a heavier robot needs proportionally more force to move
// and proportionally more grip to supply it.
public static final double kMaxAccelMps2 = kWheelCoF * 9.81;

// The same grip limit, applied at each wheel's distance from center — a
// wheel spinning the chassis in place still can't push harder than the
// tire allows.
public static final double kMaxAngularAccelRadPerSec2 =
    kMaxAccelMps2 / Math.hypot(kHalfLength, kHalfWidth);

/** Where the simulated robot is placed on the field at startup. */
public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
```

`kMaxAngularAccelRadPerSec2` reuses the same idea sideways: a wheel turning
the chassis in place traces a circle of radius `Math.hypot(kHalfLength,
kHalfWidth)` — the corner-to-center distance you've had since Lesson 7 —
and that wheel is bound by the exact same `μg` limit. Divide the linear
limit by that radius and you have the angular one, with no new formula to
learn. **Add `import org.wpilib.math.geometry.Pose2d;` and `import
org.wpilib.math.geometry.Rotation2d;`** to `Constants.java` — the first
time this file has needed either.

---

## 3. One shared chassis body

Now the class that holds all of this: a chassis that chases a commanded
velocity as hard as grip allows, and integrates its own pose from whatever
velocity it actually reaches.

**Create `src/main/java/first/robot/subsystems/ChassisSimulation.java`, in three pieces.**

**Piece 1 — state and construction:**

```java
package first.robot.subsystems;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.kinematics.ChassisVelocities;
import org.wpilib.math.util.MathUtil;

import first.robot.Constants.DriveConstants;

/**
 * One shared chassis body, moving under a grip-limited acceleration instead
 * of teleporting to whatever speed was commanded. Ground truth — the
 * Drivetrain's own estimate is still built from wheel encoders alone, and
 * the two can disagree exactly the way they would on a real robot.
 */
public class ChassisSimulation {
  private Pose2d m_pose;
  private ChassisVelocities m_velocity = new ChassisVelocities();

  public ChassisSimulation(Pose2d startingPose) {
    m_pose = startingPose;
  }
```

Two fields, and notice what's *not* here: no per-wheel state at all. This
class doesn't know or care how the chassis is being driven — only what
velocity it's chasing and where that velocity has carried it.

**Piece 2 — one tick.**

```java
  /** Advance the chassis by one tick, chasing 'commanded' as hard as grip allows. */
  public void update(ChassisVelocities commanded, double dtSeconds) {
    Translation2d nextVelocityXY = MathUtil.slewRateLimit(
        new Translation2d(m_velocity.vx, m_velocity.vy),
        new Translation2d(commanded.vx, commanded.vy),
        DriveConstants.kMaxAccelMps2,
        dtSeconds);
    double omega = chaseOmega(m_velocity.omega, commanded.omega, dtSeconds);
    m_velocity = new ChassisVelocities(nextVelocityXY.getX(), nextVelocityXY.getY(), omega);

    // Exact integration: how far a constant twist carries the chassis,
    // curved turns included, not just a straight-line approximation.
    m_pose = m_pose.plus(m_velocity.toTwist2d(dtSeconds).exp());
  }
```

**`MathUtil.slewRateLimit(current, target, maxRate, dt)`** moves `current`
toward `target`, never faster than `maxRate` per second — and handing it a
**`Translation2d`** instead of a bare number is the whole trick. `vx` and
`vy` don't get clamped separately; they're bundled into one 2D vector and
rate-limited as a *magnitude*, so a diagonal acceleration is limited by the
same grip a straight-line one is, not double-counted on each axis. Nothing
stops you from repurposing a geometry type to hold a velocity instead of a
position — `Translation2d` is just an (x, y) pair, and this is a legitimate
use of one.

`omega` has no vector to join, so it gets a small helper of its own —
**piece 3:**

```java
  /** Move 'current' toward 'target', never faster than the grip-limited angular rate. */
  private double chaseOmega(double current, double target, double dtSeconds) {
    double maxStep = DriveConstants.kMaxAngularAccelRadPerSec2 * dtSeconds;
    double error = target - current;
    if (error > maxStep) {
      return current + maxStep;
    } else if (error < -maxStep) {
      return current - maxStep;
    } else {
      return target;
    }
  }

  public Pose2d getPose() {
    return m_pose;
  }
}
```

Read that as the scalar sibling of `slewRateLimit` — same idea, one number
instead of two, written by hand because the library only ships the vector
version.

The pose update deserves a slow read too. `m_velocity.toTwist2d(dtSeconds)`
turns "this velocity, held for this long" into a **`Twist2d`** — how far the
chassis moved in that instant, exactly the small nudge `SwerveDriveOdometry`
computes every tick from your wheel encoders. **`Twist2d.exp()`** turns that
nudge into a `Transform2d` the *exact* way, accounting for the curve a
turning chassis actually traces rather than pretending it moved in a
straight line for the tick — and `Pose2d.plus(Transform2d)` — the same call
`Drivetrain` doesn't use directly but that odometry does — composes it onto
where the chassis already was. You're not approximating anything here; this
is precisely what `SwerveDriveOdometry.update(...)` does under the hood,
written out instead of hidden behind a library call.

---

## 4. Wire it into the chassis

`ChassisSimulation` needs exactly one home: shared by every module (because
they're all bolted to the same frame), null on a real robot (which already
has a world) and in replay (which needs none) — the same shape Lesson 13's
`ModuleIO`/`GyroIO` `switch` expressions already taught you to reach for.

**Add to `Drivetrain`, above the `m_gyroIO` field:**

```java
  // The chassis's ground truth in the physics world — one, shared, null on
  // a real robot (which already has a world) and in replay (which needs none).
  private static final ChassisSimulation m_chassisSim = createChassisSim();
```

**Add the builder, next to `makeModule`:**

```java
  /** Builds the shared chassis ground truth. Sim only — null everywhere else. */
  private static ChassisSimulation createChassisSim() {
    if (Constants.kCurrentMode != Constants.Mode.SIM) {
      return null; // a real robot already has a world; replay doesn't need one
    }
    return new ChassisSimulation(DriveConstants.kSimStartingPose);
  }
```

Now feed it. `applyChassisSpeeds` already computes the one number that
matters — the `ChassisVelocities` every drive command is asking for — so
that's exactly where the chassis sim's own tick belongs.

**Add to the end of `applyChassisSpeeds`:**

```java
    if (m_chassisSim != null) {
      m_chassisSim.update(speeds, 0.020);
    }
  }
```

**Delete the line that fed the old fake gyro from inside `applyChassisSpeeds`:**

```java
    // DELETE — nothing integrates a commanded rate by hand anymore; the
    // shared chassis tracks heading itself now.
    m_gyroIO.setSimRotationRate(speeds.omega / (2 * Math.PI));
```

**And its twin inside `driveDistance`, where it zeroed the rate:**

```java
    // DELETE from driveDistance:
    m_gyroIO.setSimRotationRate(0.0);
```

Finally, expose the truth so the rest of the file — and Lesson 15's cameras
— can reach it.

**Add next to `getHeadingDegrees()`:**

```java
  /** Where the chassis really is, ground truth — null outside sim. */
  public Pose2d getSimulatedPose() {
    return m_chassisSim != null ? m_chassisSim.getPose() : null;
  }
```

---

## 5. The gyro stops pretending

Lesson 8 gave you a fake gyro that integrated the rotation rate you
*commanded*: add `omega × dt` every tick and call it a heading. It was a
reasonable lie, and it had a tell — a robot commanded to spin always spun,
exactly as much as asked, with no acceleration limit slowing it down. The
chassis sim you just built already tracks heading properly, grip limit and
all. The gyro should just read it.

**Replace the whole contents of `GyroIOSim.java` with:**

```java
package first.robot.subsystems;

/** Reports the heading of the real simulated chassis — no integration of its own. */
public class GyroIOSim implements GyroIO {
  private final ChassisSimulation m_chassisSim;

  public GyroIOSim(ChassisSimulation chassisSim) {
    m_chassisSim = chassisSim;
  }

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_chassisSim.getPose().getRotation().getDegrees();
  }
}
```

That deletion has a tail, and it's the good kind: nothing anywhere calls
`setSimRotationRate` anymore, so the method itself is dead.

**Delete `setSimRotationRate` from the `GyroIO` interface:**

```java
  // DELETE — nothing integrates a commanded rate anymore; the shared
  // chassis tracks rotation and the gyro just reports it.
  public default void setSimRotationRate(double omegaRevPerSec) {}
```

**Then hand the sim gyro its chassis. Edit the gyro switch in `Drivetrain`:**

```java
  private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
    case REAL -> new GyroIOPigeon2();
    case SIM -> new GyroIOSim(m_chassisSim);
    case REPLAY -> new GyroIO() {}; // inputs come from the log
  };
```

This is exactly why `m_chassisSim` had to be declared above `m_gyroIO` in
section 4 — field initializers run top to bottom, and `GyroIOSim`'s
constructor needs a chassis that already exists.

---

## 6. Ground truth, and drift you didn't have to fake

Every pose this course has drawn has been an *estimate* — odometry's best
guess, later fused with vision. There was never anything to check it
against, because the "real" position was itself computed from the same
encoders the estimate uses. That's no longer true. The chassis sim tracks
where the chassis actually is, independent of what any wheel reports, and
it's been running since section 4.

**Add a publisher next to `m_headingPublisher`:**

```java
  private final StructPublisher<Pose2d> m_simulatedPosePublisher =
      NetworkTableInstance.getDefault()
          .getStructTopic("Drivetrain/SimulatedPose", Pose2d.struct)
          .publish();
```

**Log it at the end of `logTelemetry()`:**

```java
    if (m_chassisSim != null) {
      m_simulatedPosePublisher.set(m_chassisSim.getPose());
    }
  }
```

Open AdvantageScope's **Odometry** tab and put both `Localizer/Pose` and
`Drivetrain/SimulatedPose` on the field at once. Drive gently and they sit
on top of each other. Then drive like you mean it — full stick from a
stop, a hard reversal, a fast spin — and watch them separate. The wheel
motors respond to a velocity command quickly (that's Lesson 12's firmware
loop doing its job); the chassis is limited by the same grip you just gave
it a number for. When you ask for more than the tires could really
deliver, the wheels report motion that never fully became chassis motion,
odometry counts every rotation as if it had, and the estimate creeps ahead
of the truth — and stays there. Nothing resets it. Errors accumulate,
addition never forgets, which is precisely the argument Lesson 14 opened
with, except this time you're watching it happen instead of taking its
word.

---

## 7. Closing the loop: vision checks itself against truth

Lesson 15 admitted a compromise. `VisionIOPhotonVisionSim` rendered what
the simulated camera saw from `Localizer::getPose()` — the very estimate
vision was supposed to correct — because no independent truth existed yet.
One does now, and the fix is a one-line swap.

**Change both camera suppliers in `Robot`'s constructor:**

```java
    frontCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, drivetrain::getSimulatedPose);
    backCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, drivetrain::getSimulatedPose);
```

That's the whole fix — `drivetrain::getSimulatedPose` in place of
`localizer::getPose`. The simulated camera now renders from where the
chassis *actually* is, so a correction it computes pulls the estimate
toward something real, not toward itself.

One loose end. The chassis sim starts at `kSimStartingPose`, but
`Localizer` still starts at `(0, 0, 0°)`, because odometry has no idea
where it was switched on. Left alone, you'd watch two robots in different
places and doubt your own code.

**Add to `Robot`'s constructor, after the cameras are registered:**

```java
    // The simulated chassis starts at kSimStartingPose; tell the estimate
    // where that is instead of guessing from (0, 0, 0°).
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      localizer.resetPose(DriveConstants.kSimStartingPose);
    }
```

Now run it. `./gradlew simulateJava` → **RobotTeleop**. The first thing
you'll feel is the grip limit: push the stick to full and the robot doesn't
reach speed instantly — it ramps, the way a real chassis with real tires
does, and letting go coasts it back down instead of stopping dead. Drive
hard enough to make `Localizer/Pose` and `Drivetrain/SimulatedPose`
separate, the way section 6 showed you, then park somewhere a tag is
visible. Watch `Localizer/Pose` get pulled back toward
`Drivetrain/SimulatedPose` — odometry for smoothness, vision for truth,
with, for the first time, a truth to compare against instead of a guess
checking itself.

---

## Try it

1. **Make the tires slicker.** Drop `kWheelCoF` to `0.4` and repeat hard
   driving. The estimate should peel away from ground truth far faster than
   it did with real grip. Put it back — and if Lesson 13's Try It left a
   fake `1.1` wheel-slip multiplier lurking in `ModuleIOTalonFX`, delete it
   now. You have the real thing.
2. **Feel the limit in a spin, not just a line.** Command a fast
   `turnToHeading` from a standing start and compare `Drivetrain/Gyro/YawDegrees`
   against how quickly the *raw* commanded rate would have turned the robot
   if nothing limited it. The gyro should visibly lag the instant command —
   Lesson 8's fake gyro could never have shown you that, because it had no
   concept of "too fast to actually achieve."
3. **Push the estimate somewhere wrong on purpose.** Call
   `m_localizer.resetPose(...)` from a temporary button binding with a pose
   half a meter off from where the chassis sim actually is, then park where
   a tag is visible. Watch the estimate get pulled back — not toward the
   wrong guess this time, toward the truth.

---

## What you learned

The simulation finally has a body. One shared chassis, moving under a
`μg` acceleration limit instead of teleporting to whatever speed was
commanded, replaced four drive motors that never knew about each other —
and because that limit comes from grip alone, mass canceled right out of
the formula, which is itself worth remembering the next time "heavier
must mean slower to accelerate" sounds obviously true. Drift stopped
being something you faked with a multiplier and became something real
physics does to you when you ask for more than the tires can give.

**`MathUtil.slewRateLimit`** on a `Translation2d` limited acceleration as a
true 2D magnitude instead of two independent numbers, and **`Twist2d.exp()`**
gave you exact pose integration — the same math `SwerveDriveOdometry` has
been running for you since Lesson 11, written out by hand this time. But
the thing actually worth stopping on is what *didn't* change: an entire
ground-truth chassis went into the project, and `SwerveModule` never heard
about it. Neither did `ModuleIOTalonFX`, `ModuleIOSim`, or a single log key
from Lesson 13. The changes fit inside one new class and two small edits —
because Lesson 13 drew the IO-layer boundary in the right place, and ground
truth is exactly the kind of thing that boundary was built to make cheap.

And Lesson 15's admitted compromise is gone. Vision checks its simulated
eyesight against where the chassis actually is now, not against its own
guess — the same one-line supplier swap you'd make to point a real camera
at a real robot's real position, because that's what a real camera was
doing all along.

Next: [Lesson 18 — Scoring elevator: the first mechanism whose whole job is holding a position against gravity](18-elevator.md).
