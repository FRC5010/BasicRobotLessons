# Lesson 28 — Keeping the nose on the target

**Goal:** Let the driver keep both translation sticks while the robot takes care
of pointing itself at a target — and make that hold up while the robot is moving.

**New Java concepts**
- None, and that's worth saying out loud. Every tool in this lesson is one you
  already have. What's new is a piece of physics you haven't accounted for yet,
  and the fix is a shape you met back with the elevator.

**New robot concepts**
- **Tag position → desired heading**, computed from the fused pose rather than
  from a sighting
- **Splitting the sticks** — the driver keeps translation, the robot takes rotation
- **Tracking lag** — why a P controller falls behind a target that's moving across
  your view, and the feedforward that fixes it
- What actually happens when the tag isn't visible

---

## 1. The thing drivers are worst at

Watch any team's driver at a competition and count what they're doing at once:
translating with one stick, rotating with the other, judging distance through a
field wall from forty feet away at an angle, and trying to keep a shooter pointed
at something.

The rotation is the part that goes wrong. Translation is intuitive — push the
stick the way you want to go. Rotation isn't: the amount you need depends on
where you are, it changes constantly while you drive, and you're judging it from
a viewpoint that isn't the robot's.

So take it off them. The driver keeps translation, which they're good at, and the
robot keeps the nose pointed where it needs to go, which is arithmetic.

The pieces are all built. Lesson 14 gave you a fused pose. Lesson 15 loaded the
AprilTag layout. Lesson 25 gave autos a way to hand rotation to something else.
This lesson connects them and then fixes the problem that shows up when you
actually drive.

---

## 2. A heading you can compute

Start with the arithmetic, in its own small file.

**Create `Aim.java` in `frc/robot/commands/`, next to `Autos.java`:**

```java
// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot.commands;

import static edu.wpi.first.units.Units.Radians;

import java.util.Optional;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import frc.robot.Constants.PathConstants;
import frc.robot.Constants.VisionConstants;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;
```

**Then the class and the three questions it can answer about geometry:**

```java
/**
 * Pointing the robot at a place on the field.
 *
 * <p>Not a command and not a subsystem — just the arithmetic, so that a driver
 * command, an auto marker and a readiness check can all ask the same question and
 * get the same answer.
 *
 * <p>Notice what is missing from every signature below: a camera. Aiming is done
 * against the fused pose and the tag layout, both of which exist whether or not
 * anything can currently see a tag.
 */
public final class Aim {
  private Aim() {} // utility class — never instantiated

  /**
   * Where a tag sits on the field, from the layout that was loaded in Lesson 15.
   * Empty when that ID is not on this field, which is what a typo looks like.
   */
  public static Optional<Translation2d> tagPosition(int tagId) {
    return VisionConstants.kTagLayout.getTagPose(tagId)
        .map(pose -> pose.getTranslation().toTranslation2d());
  }

  /** Which way the robot would have to face to look straight at the target. */
  public static Rotation2d headingToward(Pose2d robot, Translation2d target) {
    return target.minus(robot.getTranslation()).getAngle();
  }

  /** How far off that heading the robot currently is, wrapped to ±180°. */
  public static Rotation2d error(Pose2d robot, Translation2d target) {
    return headingToward(robot, target).minus(robot.getRotation());
  }
```

Leave the class open — the rest arrives in section 5.

**This is the design decision of the lesson, and it's in the signatures.** There
is no camera in any of those methods. Aiming does not use a sighting; it uses the
tag layout — which is a *file*, known before the match — and the fused pose, which
Lesson 14 built precisely so that it exists whether or not a camera can currently
see anything.

That's the difference between aiming and Lesson 27's game-piece hunting. A game
piece is somewhere you don't know, so you have to see it. **A tag is bolted to a
field element and is not going anywhere.** You never needed to see it to know
where it is; you needed to see it to know where *you* are, and the pose estimator
already did that for you, whenever it last got a look.

**Replace the aiming constants in `PathConstants`:**

```java
    // Aiming. The rotation override wants an angular velocity, not a heading, so
    // this gain turns heading error into a rate.
    public static final double kAimP = 4.0; // rad/s per radian of heading error
    /** The tag to point at. Change it to the one your alliance actually scores on. */
    public static final int kAimTagId = 20;
    /** Close enough to call it aimed. */
    public static final Angle kAimTolerance = Degrees.of(2);
```

`kAimTarget` from Lesson 25 is gone — that was a made-up point on the field, and
the whole idea now is that the target is a real thing at a known place.

> **A tag ID is not a guess.** `getTagPose` returns an `Optional` because tag 47
> is not on the field, and the day you mistype one you want an empty `Optional`
> rather than a robot spinning towards the origin.

---

## 3. The driver keeps two axes

Here's the part where all that groundwork pays off in one line.

`Drivetrain.driveFieldRelative` has taken three suppliers since Lesson 10 — an X
velocity, a Y velocity, and a rotation rate. Up to now, all three came from
sticks. Nothing says they have to.

*Nothing to add — this is code you already have:*

```java
    public Command driveFieldRelative(
            Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
```

So aim assist needs no new drivetrain code at all. Keep the first two suppliers
reading the sticks, and hand it a third that computes.

**Add to `RobotContainer`, above `getAutonomousCommand`:**

```java
  /**
   * How fast to spin to keep pointing at the aiming tag, as the drive command
   * wants it. No camera in sight: this works from the fused pose and the tag
   * layout, so it keeps working when nothing can see the tag.
   */
  private AngularVelocity aimOmega() {
    return RadiansPerSecond.of(
        Aim.omegaTowardTag(m_drivetrain, m_localizer, PathConstants.kAimTagId));
  }
```

**Add the binding in `configureBindings`, above the left-bumper alignment:**

```java
    // Hold the left trigger and the robot takes the rotation stick off you: you
    // keep both translation axes, it keeps the nose on the tag.
    m_driverController.leftTrigger().whileTrue(
        m_drivetrain.driveFieldRelative(
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftY()),
            () -> DriveConstants.kMaxSpeed.times(-m_driverController.getLeftX()),
            this::aimOmega));
```

**Add the imports:**

```java
import static edu.wpi.first.units.Units.RadiansPerSecond;
import edu.wpi.first.units.measure.AngularVelocity;
import frc.robot.commands.Aim;
```

Because it's a `whileTrue` on a command that requires the drivetrain, holding the
trigger interrupts the default drive command and releasing it hands control back.
The driver feels one thing: the rotation stick stops doing anything and the robot
starts pointing itself.

---

## 4. Then you drive sideways, and it lags

Try it standing still and it's perfect — the robot swings round, settles, holds.

Now drive. Not at the tag, *past* it: strafe sideways while the aim assist is on,
and watch the nose trail behind where it should be. The faster you go, the further
behind it gets, and it never catches up while you're moving.

Here's the measurement, orbiting the tag at 3 m/s on a 3-metre radius:

| | Worst heading error |
|---|---|
| P control only | **14.32°** |

That is not a small number. Fourteen degrees is a comfortable miss.

And it isn't noise, or a bad gain, or something you can tune away. Work out what
the controller is being asked for. Circling a target three metres away at three
metres per second means the direction to that target is rotating at
`3 ÷ 3 = 1.0 rad/s`. To hold aim, the robot must spin at 1.0 rad/s, continuously,
forever.

The controller's only output is `error × kAimP`. So the *only* way it can produce
1.0 rad/s is to be sitting on an error of `1.0 ÷ 4.0 = 0.25 rad`, which is
**14.32°**.

That is exactly the number measured. Not approximately — exactly, because it is
the same arithmetic.

**If this feels familiar, it should.** Lesson 18 said it about the elevator: *a
pure feedback loop can only make output by first allowing error.* The elevator
needed 9 V to hold its cruise speed, and `kP = 20` could only produce that from 7
centimetres of deliberate lag. Same sentence, different mechanism. A P controller
does not track a moving target; it *chases* one, and it chases from a fixed
distance behind.

---

## 5. Tell it what's coming

The fix is the same shape as the elevator's `kV`: work out what output the job
needs, supply that directly, and let the P term handle only what's left over.

So: how fast *is* the direction to the target rotating? That depends on how fast
the robot is sliding across the target's field of view — not how fast it's moving
overall. Drive straight at a tag and the bearing doesn't change at all. Drive
sideways past it and it swings quickly. Do it twice as far away and it swings half
as fast.

That's the cross product of the robot's velocity with the direction to the target,
divided by the distance squared.

**Add to `Aim`, below `error`:**

```java
  /**
   * How fast the bearing to the target is changing because the robot is moving.
   *
   * <p>Slide sideways past something and it swings across your view even though
   * you never turned. A P loop cannot know that is coming — it only ever reacts
   * to error that has already happened — so hand it the answer directly.
   */
  public static double bearingRate(
      Pose2d robot, ChassisSpeeds fieldSpeeds, Translation2d target) {
    Translation2d offset = target.minus(robot.getTranslation());
    double distanceSquared = offset.getX() * offset.getX() + offset.getY() * offset.getY();
    if (distanceSquared < 1e-6) {
      return 0.0; // standing on the target: the bearing is meaningless, not fast
    }
    return (fieldSpeeds.vxMetersPerSecond * offset.getY()
        - fieldSpeeds.vyMetersPerSecond * offset.getX()) / distanceSquared;
  }
```

**Then the controller that uses it, and the two convenience methods on top:**

```java
  /**
   * How fast to spin, in radians per second, to point at the target: the rate the
   * bearing is already moving, plus a P term to clean up whatever is left.
   */
  public static double omegaToward(
      Pose2d robot, ChassisSpeeds fieldSpeeds, Translation2d target) {
    Rotation2d error = error(robot, target);
    double feedforward = bearingRate(robot, fieldSpeeds, target);

    Logger.recordOutput("Aim/ErrorDegrees", error.getDegrees());
    Logger.recordOutput("Aim/FeedforwardRadPerSec", feedforward);
    Logger.recordOutput("Aim/IsAimed", isAimedAt(robot, target));

    return feedforward + error.getRadians() * PathConstants.kAimP;
  }

  /**
   * The whole job in one call, for the two places that want it: read where we are
   * and how fast we're going, find the tag, and produce a spin rate. Zero when the
   * tag isn't on this field — a robot that can't find its target should sit still
   * rather than pick a direction.
   */
  public static double omegaTowardTag(Drivetrain drivetrain, Localizer localizer, int tagId) {
    Pose2d robot = localizer.getPose();
    ChassisSpeeds fieldSpeeds = ChassisSpeeds.fromRobotRelativeSpeeds(
        drivetrain.getChassisSpeeds(), robot.getRotation());
    return tagPosition(tagId)
        .map(target -> omegaToward(robot, fieldSpeeds, target))
        .orElse(0.0);
  }

  /** Pointing at it closely enough to act on. */
  public static boolean isAimedAt(Pose2d robot, Translation2d target) {
    return Math.abs(error(robot, target).getRadians())
        < PathConstants.kAimTolerance.in(Radians);
  }
}
```

`getChassisSpeeds()` is the door Lesson 17 opened on `Drivetrain` so BLine could
read the robot's velocity. It gives robot-relative speeds, and the bearing rate
needs field-relative ones, so `fromRobotRelativeSpeeds` converts — the same
transform `driveFieldRelative` does, run the other way.

The same orbit, measured again:

| | Worst heading error |
|---|---|
| P control only | 14.32° |
| **P + feedforward** | **0.20°** |

Seventy times better, from one added term, with the gain untouched.

> **The general rule, stated for the third time in this course.** If a controller
> has to keep producing output just to stay where it is, work out what that output
> is and supply it directly. `kG` held the elevator against gravity, `kV` held it
> at speed, and this holds aim against a target that keeps moving across your view.
> A P term is for *correcting*, not for *sustaining* — and the moment you notice
> yourself raising a gain to reduce a steady error, you're solving the wrong
> problem.

---

## 6. Aiming during an auto

Lesson 25 built the rotation override and pointed it at a made-up spot on the
field, with a promise that a later lesson would make it a real target. This is
that lesson, and the change is one expression.

**Change the `"aim"` event trigger in `Autos.registerEventTriggers`:**

```java
    FollowPath.registerEventTrigger("aim",
        Commands.runOnce(() -> FollowPath.overrideRotation(
            () -> Aim.omegaTowardTag(drivetrain, localizer, PathConstants.kAimTagId))));
```

**Delete the whole `aimOmega` helper from `Autos` — `Aim` does that job now:**

```java
  private static double aimOmega(Localizer localizer) {
    Pose2d pose = localizer.getPose();
    Rotation2d desired = PathConstants.kAimTarget.minus(pose.getTranslation()).getAngle();
    return desired.minus(pose.getRotation()).getRadians() * PathConstants.kAimP;
  }
```

**That was the last thing in `Autos` using `Rotation2d`, so delete its import too:**

```java
import edu.wpi.first.math.geometry.Rotation2d;
```

The marker now needs the drivetrain, to read how fast the robot is going.

**Change `registerEventTriggers`'s signature:**

```java
  private static void registerEventTriggers(Arm arm, Drivetrain drivetrain, Localizer localizer) {
```

**And its call in `buildChooser`:**

```java
    registerEventTriggers(arm, drivetrain, localizer);
```

Worth noticing what just happened: the auto path and the driver's left trigger now
run **the same aiming code**, computing the same number from the same inputs. If
you retune the gain, both improve. If you fix a bug, you fix it once. That's the
payoff for `Aim` being plain static methods rather than a command — a command
would have been usable by exactly one of those two callers.

---

## 7. When you can't see the tag

Every previous vision lesson has had a "what if it disappears" problem, and this
one doesn't. Look at `omegaTowardTag` again and there is no camera in it.

So the honest answer is: **nothing happens.** The tag layout is a file. The fused
pose keeps running on odometry whether a camera contributes or not. Turn away from
the tag entirely, back into a corner, and the robot still points itself correctly
at a thing it cannot see.

That is the whole reason Lesson 14 built a pose estimator instead of just using
sightings directly, and it's the first time the benefit has been this visible.

It is not free, though, and the limit is worth being precise about. Without
sightings, the estimate is running on odometry alone, and odometry drifts — wheels
slip, and the errors accumulate. Aim doesn't *fail*, it **degrades**, slowly, in
proportion to how long it's been since the estimator last saw a tag. A few seconds
is nothing. Most of a match with no sightings at all would be a real problem.

That's a much better failure mode than the alternative. Aiming off raw sightings
would be jittery at camera frame rate, would lag by the camera's latency, and
would stop dead the instant the tag left the frame. Aiming off the fused pose is
smooth, current, and degrades gently.

---

## 8. Run it

```powershell
./gradlew simulateJava
```

Drive out to the middle of the field and hold the left trigger. The robot swings
round to face tag 20 and holds. Let go and the rotation stick works again.

Now the interesting part. Keep the trigger held and **strafe sideways** as fast as
you can, and watch `Aim/ErrorDegrees`. It should stay near zero. Then, to see what
you were saved from, comment out the feedforward:

*Nothing to add — an experiment, to run and then undo:*

```java
    return error.getRadians() * PathConstants.kAimP;
```

Strafe again. `Aim/ErrorDegrees` will sit at a steady offset the whole time you're
moving, snap back to zero when you stop, and grow with your speed. Put the
feedforward back.

Three signals tell the whole story:

| Log key | What to look for |
|---|---|
| `Aim/ErrorDegrees` | near zero moving *or* stopped, once feedforward is in |
| `Aim/FeedforwardRadPerSec` | zero when driving at the tag, large when strafing past it |
| `Aim/IsAimed` | the boolean a shooter would actually gate on |

Then run the **Aim While Driving** auto from Lesson 25. It now points at a real
tag instead of a made-up coordinate, and the robot noses round to track it while
the path keeps driving the route.

---

## Try it

1. **Aim at something that isn't a tag.** `Aim.omegaToward` takes a
   `Translation2d`, so it will happily point at any spot on the field. Aim at a
   corner, or at a point computed from the alliance colour, and notice that
   nothing in the aiming code had to change.
2. **Build "ready to score".** `isAimedAt` is one of three conditions; the others
   are being in range and having stopped turning. Combine them into a single
   boolean, log it, and light the LEDs from Lesson 23 when it's true. Then argue
   with yourself about whether "settled" should mean a low rotation rate or a
   stable error.
3. **Find the gain's limit.** Raise `kAimP` until the robot oscillates, and note
   the number. Then put the feedforward back in and see whether the oscillation
   point moved. Whether it did tells you something about which term was doing the
   work.
4. **Break the pose on purpose.** In sim, call `m_localizer.resetPose` with
   something a metre wrong and watch aim confidently point at nowhere. This is the
   failure mode of trusting the estimate, and it's worth having seen it once.
5. **Aim the whole robot vs aim a turret.** This lesson turns the entire chassis.
   Sketch what would change if the shooter were on a rotating turret instead —
   which parts of `Aim` would you keep, and which would move?

---

## What you learned

The robot can point itself at something now, and the driver got a stick back.

**A known target doesn't need to be visible.** The tag layout is a file and the
fused pose is always there, so aiming works from behind, in a corner, or with the
camera covered. That's not a trick — it's the entire reason Lesson 14 built a pose
estimator rather than reacting to sightings directly, and this is the first lesson
where you can feel the difference.

**P control chases; it doesn't track.** Fourteen degrees of steady lag wasn't a
tuning failure, it was arithmetic: the controller needed 1.0 rad/s of output, and
`error × kP` can only make that from 0.25 rad of error. The prediction and the
measurement agreed to two decimal places, which is what it looks like when you
understand a system instead of tuning it. Adding the rate the target was already
moving at cut the error by seventy times without touching the gain.

**That's the third time this course has told you the same thing.** `kG` for
gravity, `kV` for speed, and now a bearing rate for a target sliding across your
view. Whenever a controller must produce output continuously just to hold station,
that output is something you can calculate — and calculating it is always better
than letting error accumulate until feedback notices.

And the small structural one: **plain functions compose better than commands.**
`Aim` is five static methods with no state, and that's exactly why a driver
binding and an autonomous path marker can both use it. A command would have served
one caller and forced the other to duplicate the maths.

Hold that left trigger and drive a few loops around the tag. Watching the nose
stay locked on while the chassis slides around underneath it is the most satisfying
thing on this robot.
