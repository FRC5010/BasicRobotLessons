# Lesson 25 — Doing two things at once

**Goal:** Stop your autonomous doing one thing at a time — fire real commands from
path markers, start work based on how much path is left, and steer the robot's
rotation while the path keeps driving it.

**New Java concepts**
- Nothing new. This whole lesson is command composition you already know —
  coroutines and `waitUntil` from Lesson 6, `Command.sequence` and
  `Command.parallel` from Lesson 24, `Optional` from Lesson 15 — pointed at a
  problem you haven't solved yet. That's worth saying out loud, because it means
  the hard part is the design, not the syntax.

**New robot concepts**
- **Event markers that run commands**, not just print — and where on the path a
  marker has to go
- **What an event command may and may not require** — and what happens when it
  gets that wrong
- **`getRemainingPathDistanceMeters()`** — triggering on distance left instead of
  a place on the path, and what that number says before the path has started
- **Rotation override** — the path drives, something else steers

---

## 1. The dead time

Pull up Lesson 17's **Two Corners** auto and run it again, with Lesson 22's game
pieces on the field.

The robot leaves (3, 3) and drives along the first leg — straight over the piece
sitting at (4.5, 3.2), twenty centimeters off its line. It doesn't so much as
twitch. The arm is right there, the roller is right there, and the auto has no
idea either exists. If you wanted that piece, you'd have to drive there, stop, run
the intake, wait, and then carry on.

Every one of those "then"s is a moment where most of the robot is doing nothing —
the arm is idle while the drivetrain works, and the drivetrain is idle while the
arm works. Fifteen seconds of autonomous is not a lot. If your intake takes a
second to get down and running, and you spend that second parked in front of a
game piece, you've thrown away a fifteenth of your auto doing something the robot
could have done while it was already moving.

Watch a good team's auto sometime. The intake is already running before the robot
reaches the piece. The arm is already tucking in while the robot drives to the
goal. Nothing waits for anything else unless it genuinely has to.

Here's the thing worth naming, because it's the whole lesson: **you already know
how to run two commands at once.** Lesson 24's `handoffMotion` runs the arm and the
elevator together with `Command.parallel(...)`. What you don't have yet is a way to
say *when* — a way to start the second thing partway through the first. That's all
this lesson adds.

---

## 2. A marker that does something real

Lesson 17 left you a placeholder. Go look at it:

*Nothing to add — this is the code you already have:*

```java
  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers() {
    // Nothing on this robot can shoot yet, so it just says so in the console.
    FollowPath.registerEventTrigger("shoot", () -> System.out.println("Event: shoot!"));
  }
```

That was honest at the time — the robot had no mechanisms at all. It has an
elevator and an arm with an intake now, so the placeholder can become the real
thing.

The natural first job is the intake. Dropping the arm and spinning the roller takes
time the robot can spend while it's still driving, and the payoff is immediate: the
robot reaches the game piece already collecting.

Lesson 17 mentioned that `registerEventTrigger` also takes a `Command`, "for an
event that needs to keep running for a while." An intake is exactly that: it runs
until there's something in it.

**Replace `registerEventTriggers` in `Autos.java` with:**

```java
  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers(Arm arm, Localizer localizer) {
    // Drop the intake and start the roller before the robot gets there, so it
    // arrives already collecting. The roller stops once there's a piece in it.
    FollowPath.registerEventTrigger("intake", Command.sequence(
            arm.goToAngle(ArmConstants.kIntake),
            arm.runRoller(ArmConstants.kIntakeSpeed).until(arm::hasGamePiece).named("Roll Until Caught"))
        .named("Auto Intake"));
  }
```

**Add the imports to `Autos.java`:**

```java
import first.robot.Constants.ArmConstants;
import first.robot.subsystems.Arm;
```

It's a sequence rather than a parallel for the reason Lesson 24 gave: the swing and
the roller both belong to the arm, and two commands can't both hold the same
mechanism at once.

That `.until(arm::hasGamePiece)` matters more than it looks. `runRoller` never
finishes on its own — it spins until something cancels it — so without the
`.until`, the roller would keep spinning, holding the arm, for the rest of
autonomous. The beam break from Lesson 22 is what gives it an ending: spin until
there's actually something in there. When the `.until` ends it, `runRoller`'s
`whenCanceled` from Lesson 20 stops the motor, the same as when you let go of a
bumper.

The `localizer` parameter isn't used yet. Section 5 needs it, and adding it now
saves changing the signature twice.

> **Why not ask the superstructure?** Lesson 24 gave the robot a
> `requestIntake()`, so it's fair to wonder why this marker goes around it. Two
> reasons, both about autonomous. A request is refused while the robot is
> `UNHOMED`, which it still is when an auto starts. And the motion that a state
> starts is bound in `RobotTeleop` — so it only exists while the teleop opmode
> does. An auto opmode has none of those bindings. These autos drive the arm
> directly.

The registration call in `Robot` has to hand over the arm and the localizer now.

**Replace the `Autos.registerEventTriggers();` line in `Robot`'s constructor with:**

```java
    // Once, for the whole program. The markers now move the arm and read the
    // pose, so they need both — and both are already built, above.
    Autos.registerEventTriggers(arm, localizer);
```

It can use them right there because of the order Java builds an object in: every
field initializer runs before the constructor's body does. By the time this line
runs, `arm` and `localizer` are finished objects, the same reason the cameras
further down can be handed `drivetrain::getSimulatedPose`.

Then point the path file at the new key.

**Edit `TwoCorners.json`: delete the `event_trigger` element with `"lib_key": "shoot"`,
and add this one right after the first waypoint, before the `(6, 3)` translation:**

```json
    {
      "type": "event_trigger",
      "t_ratio": 0.2,
      "lib_key": "intake"
    },
```

*Nothing to add — this is the whole file, so you can check yours:*

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 3.0, "y_meters": 3.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    },
    {
      "type": "event_trigger",
      "t_ratio": 0.2,
      "lib_key": "intake"
    },
    {
      "type": "translation",
      "x_meters": 6.0,
      "y_meters": 3.0
    },
    {
      "type": "rotation",
      "rotation_radians": 1.5707963,
      "t_ratio": 0.5,
      "profiled_rotation": true
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 6.0, "y_meters": 6.0 },
      "rotation_target": { "rotation_radians": 3.1415927, "profiled_rotation": true }
    }
  ]
}
```

The `shoot` marker had to go: nothing registers that key any more, and Lesson 17's
callout told you what an unregistered key does — logs a warning every run and keeps
driving.

Where the new marker sits in the list is what decides which leg it belongs to. It's
between the first waypoint and the `(6, 3)` translation, so it's on the first leg,
and `t_ratio` is a fraction of *that* leg: 0.2 of the way from (3, 3) to (6, 3) is
x = 3.6.

**Placing a marker is arithmetic, not taste.** The piece goes into the intake when
it's about 0.6 m ahead of the robot's center — the bumper is 0.3 m out, and the
intake reaches another 30 cm past it. So the roller has to be running by the time
the robot's center reaches x ≈ 3.9. A marker at 0.2 fires at x ≈ 3.65, and in this
course's sim the piece goes in a tenth of a second later, at x ≈ 3.93. Move the
marker to 0.4 and it fires at x ≈ 4.3 — by which point the piece is already under
the bumper, and the robot drives straight past it.

> **The simulator boots the arm resting on its lower stop**, at −20° — which
> happens to be exactly where the intake works. On a fresh launch, then,
> `goToAngle(kIntake)` has nothing to do and the roller starts the moment the
> marker fires. A real robot starts every match with its arm tucked in, and the
> swing down costs time the marker has to account for. Try It #2 has you measure
> how much.

---

## 3. What an event command may and may not require

Now the part that will bite you if nobody says it first.

When BLine fires a marker, it hands your command to the scheduler on its own — on
the loop after the robot passes the marker, the same as if you'd pressed a button.
It does not run "inside" the path. The two run side by side.

Which means the rule about requirements applies with full force, and the
consequences here are worse. **A `FollowPath` requires the drivetrain** — that's
the second argument to the `FollowPath.Builder` from Lesson 17. So if your event
command also requires the drivetrain, the scheduler resolves the conflict the only
way it can: the newer command gets the drivetrain, and **your path is canceled
mid-auto.**

*Nothing to add — this is the version we're about to reject:*

```java
    FollowPath.registerEventTrigger("intake",
        drivetrain.turnToHeading(90));   // cancels the path that fired it
```

In this course's sim, that marker fires at x ≈ 3.65, and on the very next loop the
path is gone: the robot rolls to a stop around (3.9, 3.0), turns to roughly 90°,
and sits there for the rest of autonomous. It isn't a crash, there's no stack trace,
and the log just shows `Drivetrain/CurrentCommand` changing from `FollowPath` to
`Turn To Heading`.

So: **an event command may require any mechanism except the one the path is
driving.** The arm, the elevator, all fine. The drivetrain, never.

That's not a limitation to work around — it's the same rule that makes the
scheduler worth having. Two things wanting the drivetrain at once is a genuine
conflict, and something has to lose. The fix is to not create the conflict.

> **An event command also has to know how to end.** Nothing cancels it when the
> path finishes: BLine schedules it on its own, and it belongs to the autonomous
> opmode. It runs until it ends itself or a different opmode is selected. In this
> course's sim, an intake that missed its piece was still running after the auto
> was disabled, and stopped only when a different opmode was picked. That's harmless
> here — the motors do nothing while disabled — but it's one more job for that
> `.until(...)`.

---

## 4. A trigger that reads the path, not the clock

Markers are great when the action belongs to a *place* on a path. Some actions
belong to a *phase* instead — "start tucking the arm in as we come in" is a rule
about the end of any path, not a spot on one particular one. Draw the path
differently and the marker's `t_ratio` now means somewhere else; the rule doesn't
change.

BLine will tell you how much path is left. Here's the obvious way to use it.

*Nothing to add — this is the version we're about to reject:*

```java
    Command stowNearTheEnd = Command.noRequirements(coroutine -> {
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
              < PathConstants.kStowDistance.in(Meters));
          coroutine.await(arm.goToAngle(ArmConstants.kStowed));
        })
        .named("Stow Near The End");
```

Wait until there's less than 2 m left, then stow. Run **Far Side** with that and
the arm swings up *the moment you enable* — tucked in about a second into the run,
with 6.5 m of path still to go.

Here's why. **Before a path has run once, `getRemainingPathDistanceMeters()`
returns `0.0`** — not "unknown", not an error, just zero. BLine's own
documentation says so: "or zero before initialization." Read that literally and
"less than 2 m left" is *true* before the robot has moved a centimeter. And a
parallel group doesn't promise which of its commands gets to run first. In this
framework, the stow happens to get its first look before the path has started.

So the stow has to wait for a real answer before it asks the real question.

**Add to `Autos.java`, below `followPath`:**

```java
  /**
   * The same path, with the arm stowing itself over the last stretch of it. The
   * path needs the drivetrain and the stow needs the arm, so they can run at
   * the same time.
   */
  public static Command followPathAndStow(FollowPath.Builder pathBuilder, Path path, Arm arm) {
    // Keep the FollowPath itself, not just a Command: only it can say how much
    // path is left, and wrapping it would hide that.
    FollowPath follow = pathBuilder.build(path).withPoseReset();
    Command stowNearTheEnd = Command.noRequirements(coroutine -> {
          // Until the path has run once, "distance left" reads 0.0, which looks
          // exactly like "arrived". So first wait for a real answer...
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters() > 0);
          // ...then for the answer you actually want.
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
              < PathConstants.kStowDistance.in(Meters));
          coroutine.await(arm.goToAngle(ArmConstants.kStowed));
        })
        .named("Stow Near The End");
    return Command.parallel(follow, stowNearTheEnd).named("Follow And Stow");
  }
```

**Add the constants to `PathConstants` in `Constants.java`, below `kCrossTrackP`:**

```java
    // Overlapping work: how much path has to be left when the arm starts stowing.
    // A distance, not a time — a slow path still stows in the same place.
    public static final Distance kStowDistance = Meters.of(2.0);

    // Aiming while the path drives. The rotation override wants an angular
    // velocity, not a heading, so this gain turns heading error into a rate.
    public static final double kAimP = 4.0; // rad/s per radian of heading error
    /** The point on the field to point at while the "aim" marker is in force. */
    public static final Translation2d kAimTarget = new Translation2d(8.0, 4.0);
```

The last two are for section 5; they live with the other path gains.

**Add the static import at the top of `Autos.java`:**

```java
import static org.wpilib.units.Units.Meters;
```

Three things in that recipe are worth slowing down for.

**The local variable is load-bearing.** `pathBuilder.build(...)` gives you a
`FollowPath`, and `getRemainingPathDistanceMeters()` lives on `FollowPath` — not on
`Command`. The moment you hand it to something that only knows it's a `Command`,
that method is gone. So you hold the `FollowPath` in a variable, use it in the
condition, and put *it* into the parallel.

**`coroutine.waitUntil` is the "when" you were missing.** You met it in Lesson 6,
waiting for a distance. Two of them in a row read exactly like what they are: wait
for this, then wait for that, then do the work. Sitting in a parallel next to the
path, that turns "partway through the drive" into something you can write down.

**The two halves need different mechanisms, and that's not an accident.** The path
holds the drivetrain; the stow holds the arm. That's the same rule as section 3,
applied from the other side.

**Edit `RobotAutoFarSide.java` — replace the line that binds the auto:**

```java
    // Runs on enable. The arm stows itself over the last stretch of the drive.
    RobotModeTriggers.autonomous().onTrue(Autos.followPathAndStow(robot.pathBuilder, path, robot.arm));
```

> **When a library hands you a number, find out what it says when it has nothing
> to say.** `0.0` before the start is indistinguishable from "you've arrived"
> unless you go looking. It didn't take an exotic setup to hit it, either — just
> the first thing you'd write.

---

## 5. The path drives, you steer

Here's the one that changes what autos can do.

Following a path is really two jobs: get the robot to the right *place*, and point
it in the right *direction*. BLine does both from the path file. But those two jobs
are independent, and there are plenty of times you want the robot to drive a route
while facing something that has nothing to do with the route — a goal you're about
to score in, a target you're tracking.

`FollowPath.overrideRotation(...)` hands you the second job and keeps the first.

**Add to `Autos.java`, above `registerEventTriggers`:**

```java
  /**
   * How fast to spin, in radians per second, to point at the target. The
   * override asks for a rate rather than a heading, so the aiming loop is
   * yours — the same P control you wrote by hand back in Lesson 8.
   */
  private static double aimOmega(Localizer localizer) {
    Pose2d pose = localizer.getPose();
    // The direction of the arrow from the robot to the target. It's empty when
    // the arrow has no length: standing on the target, no way is "toward" it.
    Optional<Rotation2d> desired = PathConstants.kAimTarget.minus(pose.getTranslation()).getAngle();
    if (desired.isEmpty()) {
      return 0.0;
    }
    return desired.get().minus(pose.getRotation()).getRadians() * PathConstants.kAimP;
  }
```

**Read the method's comment carefully: it returns a rate, not a heading.** That is
the single most important sentence in this section. Most path libraries take a
target angle and run their own controller to reach it; BLine takes an angular
velocity and uses it directly. Hand it a heading in radians and the robot will spin
at a speed that happens to equal your target angle, which is a genuinely baffling
thing to watch.

So the loop is yours — and you've written it before. Work out where you want to
face, subtract where you're facing, multiply by a gain. That's Lesson 8's
`turnToHeading` with a different consumer on the end.

Two details in there. `getAngle()` hands back an `Optional`, the same box Lesson 15
used for a tag that might not be in view: an arrow with no length has no direction,
so when the robot is standing exactly on the target there is no answer to give, and
the method says so instead of making one up. And `Rotation2d.minus` wraps the
result to ±180° for you, so there's no `MathUtil.inputModulus` here.

**Add the other two triggers to `registerEventTriggers`, after the `intake` one:**

```java
    // Hand rotation to the aiming loop, and later give it back. Translation
    // keeps following the path the whole time — only the spin changes hands.
    FollowPath.registerEventTrigger("aim", () -> FollowPath.overrideRotation(
        () -> aimOmega(localizer), RotationOverrideBehavior.RESPECT_CONSTRAINTS));
    FollowPath.registerEventTrigger("release", FollowPath::clearRotationOverride);
```

**Add the imports:**

```java
import java.util.Optional;

import org.wpilib.math.geometry.Rotation2d;

import frc.robot.lib.BLine.commands.FollowPath.RotationOverrideBehavior;
```

These two are Lesson 17's quick actions again, not commands: switching the
override on or off is instant, so there's nothing to keep running. And there's
something satisfying about that: the override is switched on and off by the same
marker system this lesson started with. The path file reads like a script — drive,
start aiming here, stop aiming there, arrive.

**`RESPECT_CONSTRAINTS` keeps your loop inside the path's speed limits.** The
one-argument `overrideRotation(supplier)` exists too, and it hands your number
straight to the wheels, past the rotation limits in `config.json`. Measured in this
course's sim with the target placed behind the robot, the one-argument form spun it
at 11.7 rad/s — nearly twice the 360°/s (6.28 rad/s) every path is supposed to
obey. With `RESPECT_CONSTRAINTS` it topped out at exactly 6.28. Lesson 17 said
speed limits are physics; that's just as true of spinning.

**Create `src/main/deploy/autos/paths/AimWhileDriving.json`:**

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 2.0, "y_meters": 2.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    },
    {
      "type": "event_trigger",
      "t_ratio": 0.1,
      "lib_key": "aim"
    },
    {
      "type": "translation",
      "x_meters": 5.0,
      "y_meters": 7.0
    },
    {
      "type": "event_trigger",
      "t_ratio": 0.7,
      "lib_key": "release"
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 8.0, "y_meters": 7.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    }
  ]
}
```

**Create `opmode/RobotAutoAimWhileDriving.java`** — Two Corners' opmode with three
words changed, the same way you made Far Side in Lesson 17: the class name
`RobotAutoAimWhileDriving` (in both places), the annotation's
`name = "Aim While Driving"`, and the path file's name, `"AimWhileDriving"`.

Now the part that will cost you an afternoon if you skip it.

**An override that is still active when the path reaches the end will stop the
path from ever finishing.** A `FollowPath` isn't done until it's both in the right
place *and* pointing the right way. Leave something else in charge of pointing and
that second condition is never met, so the command runs forever, the auto never
advances, and the robot sits on the last waypoint looking like it's working.

That's why there's a `release` marker. But markers only fire if the robot actually
gets that far, and an auto that's interrupted — disabled, or cut off at the end of
autonomous — never reaches its last marker. The override is a **static** setting:
it outlives the command that set it. Without something that always hands rotation
back, one interrupted auto leaves the *next* one unable to finish. Measured in this
course's sim, before adding the code below: with the `release` marker removed, an
interrupted **Aim While Driving** left the override on, and the next **Two
Corners** parked at the end of its path with its nose still pointed at (8, 4),
unable to finish.

Lesson 20's `runRoller` already showed you the shape of "however it ends":
`whenCanceled`. Here it needs a partner, because this command can also end by
finishing. A canceled coroutine is simply never resumed — none of the code after
the line it was waiting on ever runs, not even a `finally` block — and
`whenCanceled` runs *only* on a cancel. So "however it ends" takes both: one line
after the `await`, for finishing, and `whenCanceled`, for everything else.

**Add to `Autos.java`, below `followPathAndStow`:**

```java
  /**
   * Runs a path auto, then gives rotation back to the path follower however it
   * ended. The override is a static setting that outlives whatever set it,
   * and a path can't finish while something else is steering it.
   */
  private static Command handingRotationBack(Command auto) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(auto);
          FollowPath.clearRotationOverride(); // it finished
        })
        .whenCanceled(FollowPath::clearRotationOverride) // it was canceled, or autonomous ended
        .named(auto.name());
  }
```

Then put every path auto through it.

**Replace `followPath`'s `return` statement with:**

```java
    return handingRotationBack(pathBuilder.build(path)
        .withPoseReset()); // start by telling the estimate we're at the path's start
```

**And replace the last line of `followPathAndStow` with:**

```java
    return handingRotationBack(Command.parallel(follow, stowNearTheEnd).named("Follow And Stow"));
```

Cancel the wrapper and the path it's awaiting is canceled with it, so the robot
still stops when autonomous ends; the wrapper just makes sure rotation is given
back on the way out.

The `release` marker is the plan; `handingRotationBack` is the guarantee.

> **When something is switched on globally, switch it off somewhere that always
> runs.** This is the same instinct as Lesson 20's `runRoller` using
> `whenCanceled` to stop the motor: if turning it on is a side effect, turning it
> off can't be left to luck.

---

## 6. Run it

**Run it:**

```powershell
./gradlew simulateJava
```

Set the DS window's **Alliance Station** to **Blue 1** first, the way you did in
Lesson 17 — the numbers below are for blue.

**Run Two Corners first, on a fresh launch.** That matters for two reasons: the
arm is still resting where the simulator put it, ready to intake, and the piece at
(4.5, 3.2) is still on the field. Put `Sim/GamePieces` and `Drivetrain/SimulatedPose`
on AdvantageScope's field, and graph `Arm/HasGamePiece` and
`FollowPath/eventTriggersFiredCount`.

In this course's sim the marker fires about half a second into the run, at
x ≈ 3.65; the roller is spinning on the next loop, and about a tenth of a second
later `Arm/HasGamePiece` goes true and one piece vanishes from the field. The
roller stops. The robot never so much as slowed down: it finishes at (6, 6) in
about 4 seconds, the same as it did in Lesson 17.
That's the whole point — the pickup cost the auto nothing.

The field doesn't put itself back. Run Two Corners again and the marker still
fires, but the intake already holds a piece, so the `.until` is satisfied at once
and the command ends on the spot. To put the piece back, restart the simulator.

Now **Far Side**. Graph `FollowPath/remainingPathDistanceMeters` against
`Arm/GoalDegrees` and `Arm/AngleDegrees`. The goal flips to 90° at 1.99 m left,
about 3.1 s in, just before the corner; the arm is tucked in with 0.4 m still to
go, and the path finishes at about 4.8 s. Two things at once, again.

Then change `default_max_velocity_meters_per_sec` in `config.json` to `1.0` and run
Far Side again. The stow starts in the same *place* — at (8.67, 2.95) instead of
(8.76, 2.97) — but about 5.8 s in instead of 3.1 s. That's the difference between
triggering on distance and triggering on a clock. Put it back to `2.0`.

Finally **Aim While Driving**. Put the robot's pose on the field view and watch it
crab sideways down the path while its nose stays pointed at (8, 4). Three signals
tell the story:

| Log key | What it shows |
|---|---|
| `FollowPath/rotationOverrideActive` | goes true at the `aim` marker (about 0.6 s), false at `release` (about 4.3 s) |
| `FollowPath/targetRotationDeg` | what the path *wanted* — still computed, and ignored |
| `FollowPath/outputOmegaRadPerSec` | what actually got sent |

That middle row is worth a moment. The path never stops having an opinion about
rotation; the override just wins. Once `release` fires, the path's opinion takes
effect again and the robot swings back to the heading its final waypoint asked for
— which is exactly why it can finish, at (8, 7) facing within a couple of degrees
of 0°, about 5.4 s in.

Look closely and the nose isn't *exactly* on the target: it trails by about 6°,
and a little more at worst. A P loop can only make a turning rate out of an error,
and the target's direction keeps moving as the robot drives past it. Lesson 28 is
about that lag.

While you're watching, glance at the LED strip in SimGUI: it blinks red through all
three autos. The superstructure is still `UNHOMED`, and nothing in these autos asks
it for anything — section 2's callout, in action.

---

## Try it

1. **Break it on purpose.** Delete the `release` marker from `AimWhileDriving.json`
   and run the auto. It drives the whole path and then sits there — in this
   course's sim it was still running twelve seconds later, against a normal 5.4.
   Before you put the marker back, find the log keys that would have told you
   why; `FollowPath/rotationOverrideActive` and
   `FollowPath/finishedRotationAtSetpoint` say it plainly. Then disable, pick Two
   Corners, and confirm it finishes normally — that's `handingRotationBack`
   earning its keep.
2. **Start the way a real robot does.** Run Far Side first, so the arm ends up
   tucked in, then run Two Corners. The robot drives straight past the piece.
   From `Arm/AngleDegrees`, measure how long the arm takes after the marker to
   get below horizontal, and how long before the roller starts (in this course's
   sim, about 0.8 s and 1.0 s — the roller waits for the swing to finish). At
   2 m/s, how much path is that? Now compare it with the distance from the start
   of the path to where the piece goes in. Explain why no `t_ratio` can fix this,
   then find a fix that can.
3. **Require the wrong thing.** Register an event command that takes the
   drivetrain. The quickest way is one line in `Robot`'s constructor, after the
   `registerEventTriggers` call — registering the same key again replaces it:
   `FollowPath.registerEventTrigger("intake", drivetrain.turnToHeading(90));`.
   Watch the auto die mid-path. Then work out, from the log alone, how you'd have
   diagnosed it without knowing in advance. This is a five-minute experiment that
   will save you an evening later. Delete the line when you're done.
4. **Move the stow rule.** Change `kStowDistance` to 4 meters and predict where the
   arm will start moving before you run it. Then try `0.0`, and explain what you
   see — and why the auto never ends. (Hint: graph
   `FollowPath/remainingPathDistanceMeters` right at the end, and look up
   `default_end_translation_tolerance_meters`.)
5. **Aim at something that moves.** `kAimTarget` is a fixed point. Feed `aimOmega`
   a different target — the other alliance's corner, or a pose you compute — and
   notice that nothing about the override changes. That's the seam Lesson 28 walks
   through when the target becomes an AprilTag the robot knows the position of.

---

## What you learned

Your autonomous can now do more than one thing at a time, and none of it needed a
new Java concept — which was the point.

**The scheduler was already the answer.** `Command.sequence`, `Command.parallel`,
`await` and `waitUntil` are all things you'd met before this lesson. What was
missing was a source of "when": a marker in a path file, or a number the path
itself reports. Once you have a way to say when, overlapping work is just
composition, and you already knew composition. Where the "when" goes is a
calculation, not a guess — how long the mechanism takes, times how fast the robot
is going.

**Requirements are how the scheduler keeps you honest.** An event command that
takes the drivetrain kills the path that fired it, and nothing warns you. That's
not a rough edge — it's the same rule that stops two commands fighting over a
motor, applied somewhere the consequence is quiet. When work overlaps, the first
question is always *what does each half need*, and the answer had better be
"different things".

**Read what a library says when it has nothing to say.**
`getRemainingPathDistanceMeters()` returns `0.0` before the path starts, which is
indistinguishable from "you've arrived" — and it bit the very first version you'd
write, inside a perfectly ordinary parallel. `getAngle()` went the other way: it
returns an empty `Optional` rather than invent a direction for an arrow with no
length. Sentinel values are everywhere, and the habit worth building is testing
the edges of an API rather than the middle.

And the one to carry furthest: **a global switch needs an unconditional off.** The
rotation override is static, so it survives the command that set it and the auto
that contained it. The `release` marker is the plan and `handingRotationBack` is
the guarantee, and you want both — plans only cover the runs that go the way you
expected. "However it ends" is two exits in this framework, not one: the line after
`await` for finishing, and `whenCanceled` for everything else.

Go time a few autos against their Lesson 17 versions. Seconds you get back here
are seconds the robot spends scoring, and this is the cheapest place on the whole
robot to find them.

While you're timing them, watch where each path actually stops. BLine calls it
arrived when it's within five centimeters and a couple of degrees, which is
plenty for driving across a field and nowhere near enough to place a game piece
on something. The next lesson is about that last five centimeters.

Next: [Lesson 26 — Getting there exactly](26-drive-to-pose.md).
