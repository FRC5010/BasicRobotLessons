# Lesson 25 — Doing two things at once

**Goal:** Make autonomous use the whole robot: get the mechanisms ready
before it drives, ask the superstructure for work from path markers, act on how
much path is left, and steer the robot's rotation while the path keeps driving
it. Along the way, every path auto becomes one line instead of one class.

**New Java concepts**
- **Registering an opmode in code** with `addOpMode`, handing it a lambda that
  builds the opmode. That lets one class be many autos.
- **`Function<Path, Command>`**, a lambda that takes something and hands
  something back. You've passed suppliers around since Lesson 2; this is the
  same idea with an argument.
- Everything else is command composition you already know — coroutines and
  `waitUntil` from Lesson 6, `Command.parallel` from Lesson 24, `Optional` from
  Lesson 15 — pointed at a problem you haven't solved yet. The hard part of this
  lesson is the design, not the syntax.

**New robot concepts**
- **Getting ready before moving.** An auto homes the elevator and lets the
  superstructure settle before it drives, instead of assuming where everything is.
- **Event markers that ask for work**, and where on the path a marker has to go
- **What an event command may and may not require**, and what happens when it
  gets that wrong
- **`getRemainingPathDistanceMeters()`** — triggering on distance left instead
  of a place on the path, and what that number says before the path has started
- **Rotation override** — the path drives, something else steers

---

## 1. The dead time, and the guess

Pull up Lesson 17's **Two Corners** auto and run it again, with Lesson 22's game
pieces on the field and the LED strip open in SimGUI.

Two things are wrong, and neither one looks like a bug.

The strip blinks red the whole way. That's Lesson 24's `UNHOMED`: the elevator was
never homed, so the superstructure doesn't know where the carriage is and refuses
every request. Lesson 17's autos were written when the robot had nothing but
wheels, and they still behave that way. They never home, never ask the
superstructure for anything, and simply assume every mechanism is wherever it
needs to be.

And the robot drives along the first leg straight over the piece sitting at
(4.5, 3.2), twenty centimeters off its line, without so much as a twitch. If you
wanted that piece, you'd have to drive there, stop, run the intake, wait, and
then carry on.

Every one of those "then"s is a moment where most of the robot is doing nothing —
the arm is idle while the drivetrain works, and the drivetrain is idle while the
arm works. Fifteen seconds of autonomous is not a lot. If your intake takes a
second to get down and running, and you spend that second parked in front of a
game piece, you've thrown away a fifteenth of your auto doing something the robot
could have done while it was already moving.

Watch a good team's auto sometime. The intake is already running before the robot
reaches the piece. The elevator is already rising while the robot drives to the
goal. Nothing waits for anything else unless it genuinely has to.

Here's the thing worth naming, because it's the whole lesson: **you already know
how to run two commands at once.** Lesson 24's `handoffMotion` runs the arm and
the elevator together with `Command.parallel(...)`. What you don't have yet is a
way to say *when* — a way to start the second thing partway through the first.
That, and a robot that checks before it moves, is all this lesson adds.

First, though, a cleanup that makes every auto after it a single line.

---

## 2. One class, every path auto

Open `RobotAutoTwoCorners.java` and `RobotAutoFarSide.java` side by side. Lesson
17 had you make the second by changing three words in the first, and this lesson
would have you do it twice more. When two classes differ only in a few values,
those values want to be parameters, and the class wants to exist once.

What differs between the autos is the path, and what to do along it. Lesson 17's
autos only follow their path; this lesson's will follow one *and* ask for a score
near the end. So the new opmode takes both: the path's name, and a **recipe** that
turns the path into the command to run.

**Create `opmode/PathAuto.java`:**

```java
// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import java.util.function.Function;

import org.wpilib.command3.Command;
import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;
import frc.robot.lib.BLine.path.Path;

/**
 * One autonomous opmode for every drawn path. It has no annotation, so the
 * opmode scan skips it; Robot registers it once per auto instead, each time
 * with a different path and a different recipe for what to do along it.
 */
public class PathAuto extends PeriodicOpMode {
  public PathAuto(Robot robot, String pathName, Function<Path, Command> recipe) {
    // Read the path file now, while the robot is still disabled.
    Path path = new Path(pathName);

    // In the simulator, set the robot down at the path's start — the job a
    // person does on a real field. On a real robot this does nothing.
    robot.drivetrain.placeSimulatedRobot(Autos.startPose(path));

    // Runs on enable.
    RobotModeTriggers.autonomous().onTrue(recipe.apply(path));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
```

The body is Lesson 17's opmode, line for line, with the two things that varied
pulled out into parameters. It doesn't keep `robot` in a field the way the old
classes did, because nothing here uses it after the constructor.

The new type is **`Function<Path, Command>`**. Lesson 2's `DoubleSupplier` was
"something I can ask for a number": it takes nothing and gives back a value. A
`Function<Path, Command>` is "something I can hand a `Path` and get a `Command`
back", and `recipe.apply(path)` is how you hand it one. It has to be a function,
not a finished command, because the path doesn't exist until this constructor
reads the file — at selection time, as Lesson 17 showed. The recipe says what to
build; the opmode decides when.

There's no `@Autonomous` on this class, on purpose. The framework's scan only
offers annotated classes, and it couldn't build this one anyway: it has no way to
know which path name to pass. So you register each auto yourself.

**In `Robot`'s constructor, add at the very end, after the simulator's `resetPose`
block:**

```java
  public Robot() {
    // ...
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      localizer.resetPose(DriveConstants.kSimStartingPose);
    }

    // The path autos. Every one is the same opmode with a different path and
    // a different idea of what to do along it, so each is one line here
    // instead of a class of its own. The lambda builds the opmode when the
    // Driver Station selects it, just as an annotated class would be built.
    addOpMode(RobotMode.AUTONOMOUS, "Two Corners", "Paths",
        () -> new PathAuto(this, "TwoCorners", path -> Autos.followPath(pathBuilder, path)));
    addOpMode(RobotMode.AUTONOMOUS, "Far Side", "Paths",
        () -> new PathAuto(this, "FarSide", path -> Autos.followPath(pathBuilder, path)));
    // The list went to the Driver Station before this constructor ran, with
    // only the annotated classes on it. Send it again with these added.
    publishOpModes();
  }
```

**Add the imports to `Robot.java`:**

```java
import org.wpilib.hardware.hal.RobotMode;

import first.robot.opmode.PathAuto;
```

**Delete `opmode/RobotAutoTwoCorners.java` and `opmode/RobotAutoFarSide.java`.**

Read one registration from the outside in. `RobotMode.AUTONOMOUS`, the name and
the group are what the `@Autonomous(name = ..., group = ...)` annotation used to
say. The last argument is two lambdas, one inside the other. The outer one,
`() -> new PathAuto(...)`, takes nothing and builds an opmode; the framework calls
it when the auto is selected, the same moment it would have built an annotated
class. The inner one, `path -> Autos.followPath(pathBuilder, path)`, is the recipe.

Then `publishOpModes()`, which is easy to forget. `OpModeRobot`'s own constructor
runs before yours — it's the parent class — and it finds every annotated class and
sends the list to the Driver Station right then. Anything you add afterwards isn't
on the list until you send it again. Measured in this course's sim: without that
line, the selector offers **Drive Turn Drive**, **Do Nothing** and the teleop
opmode, and none of the path autos. That's also why the registrations go at the end
of the constructor. The one rule is that `publishOpModes()` comes after the last
`addOpMode`, and finishing boot by announcing the autos keeps that easy to see.

If you skip the deletion, the robot won't start at all. The scan registers the old
class as **Two Corners**, and then your `addOpMode` asks for a second one with
the same name, which stops the program with
`IllegalArgumentException: OpMode Two Corners already exists for mode AUTONOMOUS`.

Run it. The opmode selector looks exactly as it did before, and both autos drive
exactly as they did before. That's the point: nothing changed but where the
autos are written down. Lesson 17's callout still holds — the Driver Station is
the menu — but an entry on it now costs a line instead of a file.

---

## 3. Get ready before you move

Now the red strip.

The superstructure won't take a request until the elevator is homed, and it's
right not to: Lesson 21 showed that until homing, the encoder's idea of the
carriage's height is a guess. So an auto that wants the superstructure has to home
first. And once it's homed, the superstructure turns `IDLE`, and Lesson 24's
binding for `IDLE` stows the arm and settles the elevator. Because that binding is
made in `Robot`, not in an opmode, it runs in autonomous too.

That stow matters more in the simulator than you'd expect. The simulated arm
boots resting on its lower stop, at −20°, which is where gravity leaves an arm
with no power. A real robot starts every match with its arm tucked inside the
frame. Either way, the honest move is the same: **check, don't assume.** Home, let
`IDLE` put everything where it belongs, and only then drive.

"Where it belongs" needs to be something you can ask. The superstructure already
checks it once — `HANDOFF` waits for both mechanisms to arrive before it turns
`HOLDING` — so give it a public question for `IDLE`.

**Add to `Superstructure.java`, below `getState`:**

```java
  /**
   * In IDLE, with the elevator and arm both where they were last sent: the
   * robot is ready to start something new, with nothing still on its way.
   */
  public boolean isSettled() {
    return m_state == SuperstructureState.IDLE && m_elevator.atGoal() && m_arm.atGoal();
  }
```

Then the getting ready itself: home, wait until settled, then run the auto. That
reads like a sequence, so here's the sequence.

*Nothing to add — this is the version we're about to reject:*

```java
    return Command.sequence(
            elevator.home(),
            Command.waitUntil(superstructure::isSettled).named("Wait Until Settled"),
            auto)
        .named("Get Ready, Then " + auto.name());
```

In this course's sim, that version homes the elevator, the strip turns blue, the
arm swings up — and the robot never moves. The whole auto is gone, canceled on
the very tick the superstructure turned `IDLE`.

Here's why. **A sequence requires every mechanism that any of its steps requires,
for as long as it runs.** It has to: it will need those mechanisms later, and it
can't risk losing them between steps. So this one holds the elevator from start to
finish — through the wait, through the drive. When the state turns `IDLE`, Lesson
24's binding schedules the `IDLE` motion, which needs the elevator too. Two
commands want one mechanism, the newer one wins, and what loses is the entire
auto.

A coroutine with no requirements doesn't have that problem. It holds nothing
itself; each command it `await`s holds its own mechanisms only while it runs. Once
`home()` finishes, the elevator is free again, and the superstructure can have it.

**Add to `Autos.java`, below `followPath`:**

```java
  /**
   * Gets the mechanisms where an auto expects them, then runs it: home the
   * elevator, wait for the superstructure to settle in IDLE, and only then
   * start. A coroutine awaiting each step, not Command.sequence: a sequence
   * holds every step's mechanisms until its last step ends, so it would keep
   * the elevator from the superstructure for the whole auto.
   */
  public static Command getReadyThen(Elevator elevator, Superstructure superstructure, Command auto) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(elevator.home()); // done at once if it's already on the switch
          coroutine.waitUntil(superstructure::isSettled); // IDLE stows everything first
          coroutine.await(auto);
        })
        .named("Get Ready, Then " + auto.name());
  }
```

**Add the imports to `Autos.java`:**

```java
import first.robot.subsystems.Elevator;
import first.robot.subsystems.Superstructure;
```

> **A sequence holds everything its steps will ever need. A coroutine that awaits
> them holds only what's running right now.** Most of the time that difference
> doesn't show. It shows the moment something else needs one of those mechanisms
> partway through.

Every path auto should get ready, so the place to say it is the one class they all
share.

**In `PathAuto`'s constructor, replace the line that binds the auto with:**

```java
    // Runs on enable. Get ready first: the encoder can't know where the
    // carriage is until it's homed, and the superstructure won't take a
    // request until it knows. Then IDLE stows the arm before the drive starts.
    RobotModeTriggers.autonomous().onTrue(
        Autos.getReadyThen(robot.elevator, robot.superstructure, recipe.apply(path)));
```

Run Two Corners on a fresh launch. In this course's sim the strip blinks red for
about 3.3 s while the carriage drives down to its switch, then turns blue as the
state becomes `IDLE`. The arm swings up from its stop, which takes about another
second, and the robot sets off about 4.4 s after you enabled. Disable, select it
again, and run it a second time: now it sets off at once. The carriage is already
on the switch, so `home()` is done the moment it starts, and everything is
already where `IDLE` wants it.

That second run is what a real robot looks like at the start of a match. The
carriage rests on its switch and the arm starts tucked in, so both checks pass
straight away. **Checking costs almost nothing when the guess would have been right,
and it saves the auto when the guess is wrong.**

---

## 4. A marker that asks for something

Lesson 17 left you a placeholder. Go look at it:

*Nothing to add — this is the code you already have:*

```java
  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers() {
    // Nothing on this robot can shoot yet, so it just says so in the console.
    FollowPath.registerEventTrigger("shoot", () -> System.out.println("Event: shoot!"));
  }
```

That was honest at the time — the robot had no mechanisms at all. Now it has a
superstructure that knows how to run a whole intake cycle, and it'll take requests
in autonomous, because the auto homes first. So the marker doesn't need to move a
single motor. It just asks.

**Replace `registerEventTriggers` in `Autos.java` with:**

```java
  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers(Superstructure superstructure, Localizer localizer) {
    // Ask for the intake before the robot gets there, so it arrives already
    // collecting. The superstructure does the rest: it drops the arm, runs the
    // roller, and hands the piece off once the beam break sees it.
    FollowPath.registerEventTrigger("intake", superstructure.requestIntake());
  }
```

Lesson 17 mentioned that `registerEventTrigger` also takes a `Command`, and
`requestIntake()` is one. Everything after the request is Lesson 24's machinery,
running unchanged: `INTAKING` drops the arm and starts the roller; the beam break
moves the state to `HANDOFF`, which tucks the arm and raises the elevator; and once
both arrive, it's `HOLDING`. The auto never mentions the arm, the roller or the
beam break. It's the same split as the teleop buttons: you say what you want, and
the state machine decides whether and how.

The `localizer` parameter isn't used yet. Section 7 needs it, and adding it now
saves changing the signature twice.

The registration call in `Robot` has to hand them over.

**Replace the `Autos.registerEventTriggers();` line in `Robot`'s constructor with:**

```java
    // Once, for the whole program. The markers now ask the superstructure for
    // things and read the pose, so they need both — already built, above.
    Autos.registerEventTriggers(superstructure, localizer);
```

It can use them right there because of the order Java builds an object in: every
field initializer runs before the constructor's body does. By the time this line
runs, `superstructure` and `localizer` are finished objects, the same reason the
cameras further down can be handed `drivetrain::getSimulatedPose`.

**Edit `TwoCorners.json`: delete the `event_trigger` element with
`"lib_key": "shoot"`.** Nothing registers that key any more, and Lesson 17's
callout told you what an unregistered key does — logs a warning every run and
keeps driving.

The intake needs a path that goes somewhere useful: straight at a game piece, with
some room to get going first. The piece at (6.0, 3.8) is the one to aim for. A
straight run at it along the field would cross the hub — on the 2026 field it fills
x 4.0 to 5.2 and y 3.4 to 4.6 — so this path comes down the field from above
instead, facing the way it drives.

**Create `src/main/deploy/autos/paths/PickUp.json`:**

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 6.0, "y_meters": 7.4 },
      "rotation_target": { "rotation_radians": -1.5707963 }
    },
    {
      "type": "event_trigger",
      "t_ratio": 0.1,
      "lib_key": "intake"
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 6.0, "y_meters": 1.0 },
      "rotation_target": { "rotation_radians": -1.5707963 }
    }
  ]
}
```

**Register it in `Robot`'s constructor, below the Far Side line:**

```java
    addOpMode(RobotMode.AUTONOMOUS, "Pick Up", "Paths",
        () -> new PathAuto(this, "PickUp", path -> Autos.followPath(pathBuilder, path)));
```

That's a whole new auto: one JSON file and two lines of Java. Section 2 paying off
already.

Where the marker sits in the list decides which leg it belongs to. It's between
the two waypoints, so it's on the only leg, and `t_ratio` is a fraction of that leg:
0.1 of the 6.4 m from y = 7.4 to y = 1.0 puts it at y ≈ 6.8.

**Placing a marker is arithmetic, not taste.** The piece goes into the intake when
it's about 0.6 m ahead of the robot's center: the bumper is 0.3 m out, and the
intake reaches another 30 cm past it. So the roller has to be running by the time
the robot's center reaches y ≈ 4.4. And the arm starts tucked in — the get-ready
step made sure of that — so the request isn't instant. In this course's sim the arm
takes about 0.8 s to swing below horizontal, and the roller starts about 1.0 s after
the request, because `intakeMotion` swings first and spins second. At 2 m/s, a
second is two meters of path. Measured, the marker fires 0.6 s into the drive at
y ≈ 6.7, the roller is running by y ≈ 4.6, and the piece goes in at y ≈ 4.37. Move
the marker to 0.2 and the roller doesn't start until y ≈ 3.9 — by which point the
piece is already under the bumper, and the robot drives straight over it.

---

## 5. What an event command may and may not require

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

In this course's sim, on Pick Up, that marker fires at y ≈ 6.7, and on the very
next loop the path is gone: the robot rolls to a stop, turns around to face 90°,
and sits at about (6.0, 6.5) for the rest of autonomous. It isn't a crash, there's
no stack trace, and the log just shows `Drivetrain/CurrentCommand` changing from
`FollowPath` to `Turn To Heading`.

So: **an event command may require any mechanism except the one the path is
driving.** The arm, the elevator, all fine. The drivetrain, never.

That's not a limitation to work around — it's the same rule that makes the
scheduler worth having. Two things wanting the drivetrain at once is a genuine
conflict, and something has to lose. The fix is to not create the conflict.

Your intake marker is the easy case: a superstructure request requires nothing at
all, so there's nothing for it to conflict with. The motion it causes is scheduled
by Lesson 24's bindings, and that motion needs only the arm and the elevator.

> **A request ends at once; the state it sets doesn't.** If the robot misses its
> piece, it's still `INTAKING` when the path ends, and since the motion is bound in
> `Robot`, it stays that way into teleop, roller and all, until someone asks for
> something else. In this course's sim, a second run of Pick Up with the piece
> already gone ended exactly like that. It's the state machine being honest — the
> robot really is still trying to intake — but it's a decision worth making on
> purpose. Try It #5 has you make it.

---

## 6. A trigger that reads the path, not the clock

Markers are great when the action belongs to a *place* on a path. Some actions
belong to a *phase* instead — "score as we come in" is a rule about the end of any
path, not a spot on one particular one. Draw the path differently and the marker's
`t_ratio` now means somewhere else; the rule doesn't change.

BLine will tell you how much path is left. Here's the obvious way to use it.

*Nothing to add — this is the version we're about to reject:*

```java
    Command scoreNearTheEnd = Command.noRequirements(coroutine -> {
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
              < PathConstants.kScoreDistance.in(Meters));
          coroutine.await(superstructure.requestScore());
        })
        .named("Score Near The End");
```

Wait until there's less than half a meter left, then ask to score. Run Pick Up with
that and look at `Superstructure/Rejected`: `IDLE -> SCORING`, logged on the
drive's very first loop. The pickup still happens, the elevator still rises, and
the robot arrives at the end holding its piece — and never scores, because the
one request it was going to make was spent and refused before the robot had moved.

Here's why. **Before a path has run once, `getRemainingPathDistanceMeters()`
returns `0.0`** — not "unknown", not an error, just zero. BLine's own
documentation says so: "or zero before initialization." Read that literally and
"less than half a meter left" is *true* before the robot has moved a centimeter.
And a parallel group doesn't promise which of its commands gets to run first. In
this framework, the score request happens to get its first look before the path
has started.

So the trigger has to wait for a real answer before it asks the real question.

**Add to `Autos.java`, below `followPath`:**

```java
  /**
   * The same path, asking to score over the last stretch of it. Whether the
   * robot really has something to score is the superstructure's call, not
   * this command's: if it doesn't, the request is refused and logged.
   */
  public static Command followPathAndScore(
      FollowPath.Builder pathBuilder, Path path, Superstructure superstructure) {
    // Keep the FollowPath itself, not just a Command: only it can say how much
    // path is left, and wrapping it would hide that.
    FollowPath follow = pathBuilder.build(path).withPoseReset();
    Command scoreNearTheEnd = Command.noRequirements(coroutine -> {
          // Until the path has run once, "distance left" reads 0.0, which looks
          // exactly like "arrived". So first wait for a real answer...
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters() > 0);
          // ...then for the answer you actually want.
          coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
              < PathConstants.kScoreDistance.in(Meters));
          coroutine.await(superstructure.requestScore());
        })
        .named("Score Near The End");
    return Command.parallel(follow, scoreNearTheEnd).named("Follow And Score");
  }
```

**Add the constants to `PathConstants` in `Constants.java`, below `kCrossTrackP`:**

```java
    // Overlapping work: how much path has to be left when the robot asks to
    // score. A distance, not a time — a slow path still scores in the same place.
    public static final Distance kScoreDistance = Meters.of(0.5);

    // Aiming while the path drives. The rotation override wants an angular
    // velocity, not a heading, so this gain turns heading error into a rate.
    public static final double kAimP = 4.0; // rad/s per radian of heading error
    /** The point on the field to point at while the "aim" marker is in force. */
    public static final Translation2d kAimTarget = new Translation2d(8.0, 4.0);
```

The last two are for section 7; they live with the other path gains.

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

**The score doesn't check whether there's anything to score.** It doesn't need to.
The superstructure already refuses a score unless it's `HOLDING`, and logs the
refusal. That's the same rulebook the driver's trigger goes through, and it's
better than a second check written here, which could disagree with it.

Now give Pick Up the new recipe.

**In `Robot`'s constructor, replace the Pick Up registration with:**

```java
    addOpMode(RobotMode.AUTONOMOUS, "Pick Up", "Paths",
        () -> new PathAuto(this, "PickUp",
            path -> Autos.followPathAndScore(pathBuilder, path, superstructure)));
```

Changing what an auto *does* was one lambda. That's what the recipe parameter is
for.

> **When a library hands you a number, find out what it says when it has nothing
> to say.** `0.0` before the start is indistinguishable from "you've arrived"
> unless you go looking. It didn't take an exotic setup to hit it, either — just
> the first thing you'd write.

---

## 7. The path drives, you steer

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

**Register it in `Robot`'s constructor, below the Far Side line:**

```java
    addOpMode(RobotMode.AUTONOMOUS, "Aim While Driving", "Paths",
        () -> new PathAuto(this, "AimWhileDriving", path -> Autos.followPath(pathBuilder, path)));
```

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

**Add to `Autos.java`, below `getReadyThen`:**

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

**And replace the last line of `followPathAndScore` with:**

```java
    return handingRotationBack(Command.parallel(follow, scoreNearTheEnd).named("Follow And Score"));
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

## 8. Run it

**Run it:**

```powershell
./gradlew simulateJava
```

Set the DS window's **Alliance Station** to **Blue 1** first, the way you did in
Lesson 17 — the numbers below are for blue.

**Run Pick Up first, on a fresh launch,** while the piece at (6.0, 3.8) is still
on the field. Put `Sim/GamePieces` and `Drivetrain/SimulatedPose` on
AdvantageScope's field, and graph `Superstructure/State`, `Elevator/HeightMeters`
and `FollowPath/remainingPathDistanceMeters`. Keep an eye on the LED strip, because
it tells the whole story.

Here's what happens in this course's sim, timed from when the drive starts, about
4.4 s after you enable (homing, then the stow):

| When | What |
|---|---|
| 0.6 s, y ≈ 6.7 | The `intake` marker fires; next loop the state is `INTAKING` and the strip goes yellow |
| 1.4 s | The arm swings below horizontal |
| 1.7 s, y ≈ 4.6 | The roller starts |
| 1.8 s, y ≈ 4.37 | The piece goes in; a tenth of a second later the debounced beam break makes it `HANDOFF` |
| 3.0 s, 1.0 m left | Arm tucked and elevator at 0.73 m: `HOLDING`, solid green |
| 3.2 s, 0.48 m left | The score request: `SCORING`, the piece leaves, and the next loop is `IDLE` |
| 3.5 s | The path finishes at (6, 1), with the elevator already on its way down |

The robot never slowed down. The intake ran, the arm tucked and the elevator rose
while it drove, and the score happened on the way in. Nothing waited for anything
that didn't need it — which was the whole point.

The field doesn't put itself back. Run Pick Up again and the getting ready takes
no time at all, but the piece is gone. When the score request comes, half a meter
from the end, the robot is still `INTAKING`, so it's refused: `INTAKING -> SCORING`
in `Superstructure/Rejected`. Then, in the last quarter meter, the intake that's
still running picks up the piece you scored last time, which is lying on the floor
ahead of the robot. To put the field back, restart the simulator.

Now slow everything down. Change `default_max_velocity_meters_per_sec` in
`config.json` to `1.0` and run Pick Up on a fresh launch. The pickup still works
— the marker fires at the same place, and the slower robot gives the arm more
time. The score happens in the same *place*, at y ≈ 1.48 instead of 1.44, but 6.1 s
into the drive instead of 3.2 s. That's the difference between triggering on
distance and triggering on a clock. Put it back to `2.0`.

Finally **Aim While Driving**. Put the robot's pose on the field view and watch it
crab sideways down the path while its nose stays pointed at (8, 4). Three signals
tell the story:

| Log key | What it shows |
|---|---|
| `FollowPath/rotationOverrideActive` | goes true at the `aim` marker (about 0.6 s into the drive), false at `release` (about 4.3 s) |
| `FollowPath/targetRotationDeg` | what the path *wanted* — still computed, and ignored |
| `FollowPath/outputOmegaRadPerSec` | what actually got sent |

That middle row is worth a moment. The path never stops having an opinion about
rotation; the override just wins. Once `release` fires, the path's opinion takes
effect again and the robot swings back to the heading its final waypoint asked for
— which is exactly why it can finish, at (8, 7) facing within a couple of degrees
of 0°, about 5.4 s into the drive.

Look closely and the nose isn't *exactly* on the target: it trails by about 6°,
and a little more at worst. A P loop can only make a turning rate out of an error,
and the target's direction keeps moving as the robot drives past it. Lesson 27 is
about that lag.

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
2. **Find the edge.** Move Pick Up's `intake` marker to `0.2` and watch the robot
   drive over the piece. Then use section 4's numbers to predict the latest
   `t_ratio` that still catches it, and check your prediction. How much margin
   does the shipped `0.1` leave?
3. **Require the wrong thing.** Register an event command that takes the
   drivetrain. The quickest way is one line in `Robot`'s constructor, after the
   `registerEventTriggers` call — registering the same key again replaces it:
   `FollowPath.registerEventTrigger("intake", drivetrain.turnToHeading(90));`.
   Watch the auto die mid-path. Then work out, from the log alone, how you'd have
   diagnosed it without knowing in advance. This is a five-minute experiment that
   will save you an evening later. Delete the line when you're done.
4. **Ask too early.** Change `kScoreDistance` to 2 meters and predict what happens
   before you run it. (In this course's sim, the request arrives while the elevator
   is still rising, is refused as `HANDOFF -> SCORING`, and the robot finishes
   holding its piece.) A request is checked when it's made, not saved for later.
   Then try `0.0`, and explain why the auto never ends. (Hint: graph
   `FollowPath/remainingPathDistanceMeters` right at the end, and look up
   `default_end_translation_tolerance_meters`.)
5. **Decide what a miss means.** Section 5's callout: a missed pickup leaves the
   robot `INTAKING` into teleop. Make Pick Up ask for `IDLE` at the end of its
   path if it's still `INTAKING`, and only then. Then argue the other side: when
   would a driver *want* the intake still running at the start of teleop?
6. **Aim at something that moves.** `kAimTarget` is a fixed point. Feed `aimOmega`
   a different target — the other alliance's corner, or a pose you compute — and
   notice that nothing about the override changes. That's the seam Lesson 27 walks
   through when the target becomes an AprilTag the robot knows the position of.

---

## What you learned

Your autonomous now uses the whole robot, does more than one thing at a time, and
checks before it moves.

**When classes differ only in their data, the data wants to be a parameter.** Two
copies of an opmode with three words changed became one class and a line per
auto, and the part that varies most — what to do along the path — became a
`Function` you hand in. `addOpMode` is the same Driver Station menu the
annotations fed. You just write the entries yourself, and then `publishOpModes()`
to send them.

**Check, don't assume.** Homing first and waiting for `IDLE` to settle costs
nothing when the robot is already where you'd have guessed, and saves the auto
when it isn't. It's also what let the auto use the superstructure at all: a robot
that doesn't know where its elevator is shouldn't take requests, and now it
doesn't have to.

**Requirements are how the scheduler keeps you honest.** An event command that
takes the drivetrain kills the path that fired it, and a sequence that holds the
elevator gets killed by the state machine it was waiting for. Neither one warns
you. When work overlaps, the first question is always *what does each half need,
and for how long* — and a coroutine that awaits its steps holds far less, for far
less time, than a sequence does.

**Read what a library says when it has nothing to say.**
`getRemainingPathDistanceMeters()` returns `0.0` before the path starts, which is
indistinguishable from "you've arrived" — and it bit the very first version you'd
write, inside a perfectly ordinary parallel. `getAngle()` went the other way: it
returns an empty `Optional` rather than invent a direction for an arrow with no
length. The habit worth building is testing the edges of an API rather than the
middle.

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
