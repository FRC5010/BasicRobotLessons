# Lesson 25 — Doing two things at once

**Goal:** Stop your autonomous doing one thing at a time — fire real commands from
path markers, start work based on how much path is left, and steer the robot's
rotation while the path keeps driving it.

**New Java concepts**
- Nothing new. This whole lesson is command composition you already know, pointed
  at a problem you haven't solved yet — which is worth saying out loud, because it
  means the hard part is the design, not the syntax.

**New robot concepts**
- **Event markers that run commands**, not just print
- **What an event command may and may not require** — and what happens when it
  gets that wrong
- **`getRemainingPathDistanceMeters()`** — triggering on distance left instead of
  a place on the path
- **Rotation override** — the path drives, something else steers

---

## 1. The dead time

Pull up Lesson 17's `TwoCorners` auto and time it in your head.

The robot drives from the first waypoint to the second. It arrives. *Then* it does
whatever the auto says to do. Then it drives somewhere else. Every one of those
"then"s is a moment where most of the robot is doing nothing — the arm is idle
while the drivetrain works, and the drivetrain is idle while the arm works.

Fifteen seconds of autonomous is not a lot. If your intake takes a second and a
half to swing down, and you spend that second and a half parked in front of a game
piece, you've thrown away ten percent of your auto doing something the robot could
have done while it was already moving.

Watch a good team's auto sometime. The intake is already down before the robot
reaches the piece. The elevator is already rising while the robot drives to the
goal. Nothing waits for anything else unless it genuinely has to.

Here's the thing worth naming, because it's the whole lesson: **you already know
how to run two commands at once.** `Commands.parallel` has been in your toolbox
since Lesson 9, and Lesson 22 used it to move the arm and elevator together. What
you don't have yet is a way to say *when* — a way to start the second thing partway
through the first. That's all this lesson adds.

---

## 2. A marker that does something real

Lesson 17 left you a placeholder. Go look at it:

*Nothing to add — this is the code you already have:*

```java
    FollowPath.registerEventTrigger("shoot", Commands.print("Event: shoot!"));
```

That was honest at the time — the robot had no mechanisms at all. It has four
subsystems now, so the placeholder can become the real thing.

The natural first job is the intake. Dropping the arm and spinning the roller
takes time the robot can spend while it's still driving, and the payoff is
immediate: the robot arrives at the game piece already collecting.

**Replace `registerEventTriggers` in `Autos.java` with:**

```java
  /** Names a path file can fire with lib_key. BLine keeps the registry statically. */
  private static void registerEventTriggers(Arm arm, Localizer localizer) {
    // Drop the intake and start spinning before the robot gets there, so it
    // arrives already collecting instead of stopping to think about it.
    FollowPath.registerEventTrigger("intake",
        Commands.sequence(
            arm.goToAngle(ArmConstants.kIntake),
            arm.runRoller(ArmConstants.kIntakeSpeed).until(arm::hasGamePiece)));
```

Leave the method open — two more triggers go in it in section 5.

That `.until(arm::hasGamePiece)` matters more than it looks. `runRoller` never
finishes on its own, so without it the roller would keep spinning for the rest of
the match, holding the arm the whole time. The beam break from Lesson 22 is what
gives it an ending: spin until there's actually something in there.

`registerEventTriggers` now needs the arm, and section 5 will want the localizer,
so both come in as parameters.

**Change the `buildChooser` signature and its first line:**

```java
  public static LoggedDashboardChooser<Supplier<Command>> buildChooser(
      Drivetrain drivetrain, Localizer localizer, Arm arm) {
    registerEventTriggers(arm, localizer);
```

**Update the call in `RobotContainer`'s constructor:**

```java
    // The arm goes in because autos now run mechanisms, not just the drivetrain.
    m_autoChooser = Autos.buildChooser(m_drivetrain, m_localizer, m_arm);
```

Then point the path file at the new key.

**Replace the `event_trigger` element in `TwoCorners.json` with:**

```json
    {
      "type": "event_trigger",
      "t_ratio": 0.2,
      "lib_key": "intake"
    }
```

Two changes there. The key is now `"intake"`, matching what you registered — and
`t_ratio` dropped from `0.8` to `0.2`, so it fires near the *start* of that leg
rather than the end. That's the entire point: fire it early, and the swing happens
during the drive.

> `t_ratio` is a fraction of the segment the marker sits in — the stretch between
> the translation targets on either side of it — not of the whole path. Worth
> knowing before you wonder why `0.5` didn't land in the middle of your route.

---

## 3. What an event command may and may not require

Now the part that will bite you if nobody says it first.

When BLine fires a marker, it hands your command to the scheduler as an ordinary,
independent command — the same as if you'd pressed a button. It does not run
"inside" the path. The two run side by side.

Which means Lesson 24's rule about requirements applies with full force, and the
consequences here are worse. **A `FollowPath` requires the drivetrain.** So if your
event command also requires the drivetrain, the scheduler resolves the conflict the
only way it can: the newer command wins, and **your path is cancelled mid-auto.**

The robot stops in the middle of the field and you spend an evening working out
why. It isn't a crash, there's no stack trace, and the log just shows the path
ending early.

*Nothing to add — this is the version we're about to reject:*

```java
    FollowPath.registerEventTrigger("intake",
        drivetrain.turnToHeading(90));   // cancels the path that fired it
```

So: **an event command may require any subsystem except the one the path is
driving.** Arm, elevator, LEDs, all fine. Drivetrain, never.

That's not a limitation to work around — it's the same rule that makes the
scheduler worth having. Two things wanting the drivetrain at once is a genuine
conflict, and something has to lose. The fix is to not create the conflict.

---

## 4. A trigger that reads the path, not the clock

Markers are great when the action belongs to a *place* on a path. Some actions
belong to a *phase* instead — "start stowing as we come in" is a rule about the
end of any path, not a spot on one particular one. Draw the path differently and
the marker's `t_ratio` now means somewhere else; the rule doesn't change.

BLine will tell you how much path is left.

**Add to `Autos.java`, below `followPath`:**

```java
  /**
   * The same path, with the arm stowing itself over the last stretch of it. The
   * two commands need different subsystems, so they can run at the same time.
   */
  private static Supplier<Command> followPathAndStow(String pathName, Arm arm) {
    return () -> {
      // Keep the FollowPath itself, not just a Command: only it can say how much
      // path is left, and wrapping it would hide that.
      FollowPath path = s_pathBuilder.build(new Path(pathName));
      return Commands.parallel(
              path,
              Commands.waitUntil(() -> path.getRemainingPathDistanceMeters()
                      < PathConstants.kStowDistance.in(Meters))
                  .andThen(arm.goToAngle(ArmConstants.kStowed)))
          .finallyDo(FollowPath::clearRotationOverride);
    };
  }
```

**Add the constants to `PathConstants` in `Constants.java`:**

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

**Add the static import at the top of `Autos.java`:**

```java
import static edu.wpi.first.units.Units.Meters;
```

Three things in that recipe are worth slowing down for.

**The local variable is load-bearing.** `s_pathBuilder.build(...)` gives you a
`FollowPath`, and `getRemainingPathDistanceMeters()` lives on `FollowPath` — not on
`Command`. The moment you wrap it in anything, you have a `Command` and that method
is gone. So you hold the `FollowPath` in a variable, use it for the trigger, and
put *it* into the parallel.

**`Commands.waitUntil` is the "when" you were missing.** It's a command that does
nothing and finishes when a condition goes true, which makes
`waitUntil(...).andThen(work)` read exactly like what it is: wait for this, then do
that. Sitting inside a `parallel` next to the path, it turns "partway through the
drive" into something you can write down.

Type the `finallyDo` line and leave it alone for now — section 5 is where it
earns its place.

**The two branches need different subsystems, and that's not an accident.** The
path holds the drivetrain; the stow holds the arm. Lesson 24 taught you that
`Commands.parallel` throws when two of its commands want the same subsystem — here
that rule is doing real work, because it's the compiler-adjacent version of the
warning in section 3.

**Point the chooser at the new recipe:**

```java
    chooser.addOption("Far Side", followPathAndStow("FarSide", arm));
```

> **A trap you'd otherwise find the hard way.** Before a path starts,
> `getRemainingPathDistanceMeters()` returns `0.0` — not "unknown", not an error,
> just zero. Read that literally and "less than 2 metres left" is *true* before the
> robot has moved a centimetre. Inside a `parallel` you're safe, because the group
> starts the path before anything gets polled. Hoist that same condition into a
> `Trigger` in `RobotContainer` and it will fire the instant you power on. When a
> library hands you a number, find out what it says when it has nothing to say.

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
   * How fast to spin, in radians per second, to point at the target. The override
   * asks for a rate rather than a heading, which means the aiming loop is yours —
   * this is the same P control you wrote by hand back in Lesson 8.
   */
  private static double aimOmega(Localizer localizer) {
    Pose2d pose = localizer.getPose();
    Rotation2d desired = PathConstants.kAimTarget.minus(pose.getTranslation()).getAngle();
    return desired.minus(pose.getRotation()).getRadians() * PathConstants.kAimP;
  }
```

**Read the signature carefully: it returns a rate, not a heading.** That is the
single most important sentence in this section. Most path libraries take a target
angle and run their own controller to reach it; BLine takes an angular velocity
and uses it directly. Hand it a heading in radians and the robot will spin at a
speed that happens to equal your target angle, which is a genuinely baffling thing
to watch.

So the loop is yours — and you've written it before. Work out where you want to
face, subtract where you're facing, multiply by a gain. That's Lesson 8's
`turnToHeading` with a different consumer on the end.

`Rotation2d.minus` wraps the result to ±180° for you, so there's no
`MathUtil.inputModulus` here. Lesson 10 taught you the wrap; the geometry types
have been doing it quietly ever since.

**Add the other two triggers, finishing `registerEventTriggers`:**

```java
    // Hand rotation to the aiming loop, and later give it back. Translation
    // keeps following the path the whole time — only the spin changes hands.
    FollowPath.registerEventTrigger("aim",
        Commands.runOnce(() -> FollowPath.overrideRotation(() -> aimOmega(localizer))));
    FollowPath.registerEventTrigger("release",
        Commands.runOnce(FollowPath::clearRotationOverride));
  }
```

There's something satisfying about that: the override is switched on and off by
the same marker system this lesson started with. The path file reads like a script
— drive, start aiming here, stop aiming there, arrive.

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

**Add it to the chooser:**

```java
    chooser.addOption("Aim While Driving", followPath("AimWhileDriving"));
```

Now the part that will cost you an afternoon if you skip it.

**An override that is still active when the path reaches the end will stop the
path from ever finishing.** A `FollowPath` isn't done until it's both in the right
place *and* pointing the right way. Leave something else in charge of pointing and
that second condition is never met, so the command runs forever, the auto never
advances, and the robot sits on the last waypoint looking like it's working.

That's why there's a `release` marker. It's also why one more line matters.

**Update `followPath` in `Autos.java`:**

```java
  /**
   * A recipe for one path auto. The file is deploy/autos/paths/&lt;pathName&gt;.json.
   *
   * <p>The handback is not optional: a path cannot finish while something else is
   * steering it, so rotation goes back however this ends — arrived, interrupted,
   * or the match stopped.
   */
  private static Supplier<Command> followPath(String pathName) {
    return () -> s_pathBuilder.build(new Path(pathName))
        .finallyDo(FollowPath::clearRotationOverride);
  }
```

That same line is already sitting at the end of `followPathAndStow`, which is
what it was there for.

The `release` marker is the plan; the `finallyDo` is the safety net. Markers only
fire if the robot actually gets that far, and an auto that's cancelled at the
buzzer never reaches its last marker. The override is a **static** setting — it
outlives the command that set it — so without the handback, one interrupted auto
leaves the next one unable to finish. `finallyDo` runs whether the command
finished, was interrupted, or the match ended.

> **When something is switched on globally, switch it off somewhere that always
> runs.** This is the same instinct as Lesson 20's `runRoller` using `finallyDo`
> to stop the motor: if turning it on is a side effect, turning it off can't be
> left to luck.

---

## 6. Run it

```powershell
./gradlew simulateJava
```

Pick **Two Corners** from the chooser, enable autonomous, and watch the field view
and the Mechanism tab side by side. The arm should start swinging down while the
robot is still driving the second leg — the two are moving at once, which is the
thing that wasn't happening in Lesson 17.

Then check the numbers rather than trusting your eyes. Graph
`FollowPath/eventTriggersFiredCount` against `Arm/GoalDegrees` and you should see
the goal change on exactly the tick the marker fires.

Now **Far Side**, which has no markers at all. Graph
`FollowPath/remainingPathDistanceMeters` and watch it count down; the arm's goal
should change as it crosses 2.0. Then go and change the path's velocity in
`config.json`, run it again, and confirm the stow still happens in the same
*place* even though it happens at a different *time*. That's the difference
between triggering on distance and triggering on a clock.

Finally **Aim While Driving**. Put the robot's pose on the field view and watch it
crab sideways down the path while its nose stays pointed at (8, 4). Three signals
tell the story:

| Log key | What it shows |
|---|---|
| `FollowPath/rotationOverrideActive` | goes true at the `aim` marker, false at `release` |
| `FollowPath/targetRotationDeg` | what the path *wanted* — still computed, and ignored |
| `FollowPath/outputOmegaRadPerSec` | what actually got sent |

That middle row is worth a moment. The path never stops having an opinion about
rotation; the override just wins. Once `release` fires, the path's opinion takes
effect again and the robot swings back to the heading its final waypoint asked for
— which is exactly why it can finish.

---

## Try it

1. **Break it on purpose.** Delete the `release` marker from `AimWhileDriving.json`
   and run the auto. It will drive the whole path and then sit there. Before you
   put the marker back, find the log keys that would have told you why — there are
   at least two that say it plainly.
2. **Overlap the other end.** `TwoCorners` still drives to its last waypoint before
   doing anything with what it picked up. Add a second marker that starts raising
   the elevator on the final leg, and time the auto before and after.
3. **Require the wrong thing.** Register an event command that takes the drivetrain
   — `drivetrain.turnToHeading(90)` will do — and watch the auto die mid-path. Then
   work out, from the log alone, how you'd have diagnosed it without knowing in
   advance. This is a five-minute experiment that will save you an evening later.
4. **Move the stow rule.** Change `kStowDistance` to 4 metres and predict where the
   arm will start moving before you run it. Then try `0.0` and explain what you see.
5. **Aim at something that moves.** `kAimTarget` is a fixed point. Feed `aimOmega`
   a different target — the other alliance's corner, or a pose you compute — and
   notice that nothing about the override changes. That's the seam Lesson 28 walks
   through when the target becomes an AprilTag the camera can actually see.

---

## What you learned

Your autonomous can now do more than one thing at a time, and none of it needed a
new Java concept — which was the point.

**The scheduler was already the answer.** `Commands.parallel`, `waitUntil`, and
`andThen` are all things you'd met before this lesson. What was missing was a
source of "when": a marker in a path file, or a number the path itself reports.
Once you have a way to say when, overlapping work is just composition, and you
already knew composition.

**Requirements are how the scheduler keeps you honest.** An event command that
takes the drivetrain kills the path that fired it, and nothing warns you. That's
not a rough edge — it's the same rule that stops two commands fighting over a
motor, applied somewhere the consequence is quiet. When work overlaps, the first
question is always *what does each half need*, and the answer had better be
"different things".

**Read what a library says when it has nothing to say.** `getRemainingPathDistanceMeters()`
returns `0.0` before the path starts, which is indistinguishable from "you've
arrived" unless you go looking. That's not a BLine quirk; sentinel values are
everywhere, and the habit worth building is testing the edges of an API rather
than the middle.

And the one to carry furthest: **a global switch needs an unconditional off.** The
rotation override is static, so it survives the command that set it, the auto that
contained it, and the match it happened in. The `release` marker is the plan and
`finallyDo` is the guarantee, and you want both — plans only cover the runs that
go the way you expected.

Go time a few autos against their Lesson 17 versions. Seconds you get back here
are seconds the robot spends scoring, and this is the cheapest place on the whole
robot to find them.

While you're timing them, watch where each path actually stops. BLine calls it
arrived when it's within five centimetres and a couple of degrees, which is
plenty for driving across a field and nowhere near enough to place a game piece
on something. The next lesson is about that last five centimetres.

Next: [Lesson 26 — Getting there exactly](26-drive-to-pose.md).
