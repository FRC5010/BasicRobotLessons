# Lesson 9 — Autonomous: combine everything

**Goal:** Snap all your building blocks together into an autonomous routine that
runs by itself: drive forward, turn 90°, drive again — then explore running
steps in parallel.

**New Java concepts**
- **Command composition** into named routines
- **Sequential** vs. **parallel** execution
- **`coroutine.await(...)`** — sequencing steps as ordinary straight-line code
- Passing subsystems into a **factory method** that builds a command

**New robot concepts**
- How `@Autonomous` opmodes actually run — no separate auto-mode API
- **`Command.sequence`**, **`Command.parallel`**, **`Command.race`**
- A whole-chassis **`driveDistance`** built from the Drivetrain primitives
- **Cosine compensation** — don't drive hard until the wheel points the right way
- Designing an auto as a *sentence* of small commands

---

## 1. What autonomous actually is, and a name change

For the first 15 seconds of an FRC match, the robot runs with no driver. In
this framework that's not a special mode with its own API — it's just
**another opmode**, annotated `@Autonomous` instead of `@Teleop`, selected on
the Driver Station exactly the way `MyTeleop` has been all along. Nothing new
to learn about *how it runs*; the only new part is *what it does once it's
running*.

`MyAuto` has been sitting there since Lesson 0, printing a message and doing
nothing else. Today it earns real work, and that's a good moment for the
rename this course has been quietly setting up since Lesson 1: `MyTeleop` and
`MyAuto` were fine names for template example code, but they're not example
code anymore — they're the permanent home for how this robot drives and how
it runs itself. Time they sounded like it.

**Rename `MyTeleop.java` to `RobotTeleop.java`** — right-click the class name
in VS Code → **Refactor → Rename**, same move as `DriveModule` →
`SwerveModule` back in Lesson 7. It keeps `@Teleop`, keeps the `Robot robot`
constructor parameter, and every binding inside it stays exactly as it was.
Only the file and class name change.

**Rename `MyAuto.java` to `RobotAuto.java`** the same way. This one's about
to look very different inside — the rest of this lesson is what goes in it.

---

## 2. Add `driveDistance` to the Drivetrain

Lesson 6 had a per-module `driveDistance`. The same shape works for the chassis
— reset one wheel's odometer, drive all four forward, stop when the wheel has
covered the distance.

**Add to `Drivetrain`, with the other command factories:**

```java
/** Drive straight forward 'meters' at 40% power. Finishes on its own. */
public Command driveDistance(double meters) {
  return run(coroutine -> {
        m_modules[0].resetDrivePosition(); // zero one wheel's odometer
        while (Math.abs(m_modules[0].getDistanceMeters()) < Math.abs(meters)) {
          for (SwerveModule module : m_modules) {
            module.setDesiredState(0.0, 0.4); // point forward, 40% throttle
          }
          m_lastCommandedOmega = 0.0;
          coroutine.yield();
        }
        for (SwerveModule module : m_modules) {
          module.setDesiredState(0.0, 0.0); // reached it — stop
        }
      })
      .whenCanceled(() -> {
        for (SwerveModule module : m_modules) {
          module.setDesiredState(0.0, 0.0); // interrupted — stop
        }
      })
      .named("Drive Distance");
}
```

One piece is missing: the reset. Lesson 6 called `setPosition(0)` directly on
the TalonFX — but that was *inside* `DriveModule`, where the motor is visible.
The Drivetrain can't do that: `m_driveMotor` is `private` to the module, and
that's encapsulation doing its job — outsiders don't get to poke a module's
hardware. What the module can do is offer a named, intention-revealing method.

**Add to `SwerveModule`, with its other public methods:**

```java
/** Zero the drive encoder — start measuring distance from *here*. */
public void resetDrivePosition() {
  m_driveMotor.setPosition(0);
}
```

Now read `driveDistance` top to bottom: it's **the same shape as Lesson 6's
`driveDistance`**, applied one level up. We ask *every module* to point
forward and roll, and we watch *one wheel* to know when we've gone far
enough. Watching one wheel works for straight-ahead driving because, with all
four wheels aimed the same direction at the same speed, they all cover the
same distance. Two endings, same as every finishing command since Lesson
6 — the loop's own stop-order for finishing on its own, `.whenCanceled(...)`
for being interrupted. If that split is starting to feel routine, good —
routine is the point.

---

## 3. Build the routine

Now the fun part: writing the plan. `commands/Autos.java` is a new file — the
home for auto factories, a *cookbook* for the robot rather than a subsystem.

**Create `commands/Autos.java`:**

```java
package first.robot.commands;

import org.wpilib.command3.Command;

import first.robot.subsystems.Drivetrain;

public final class Autos {
  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Command.sequence(
            drivetrain.driveDistance(1.0),   // step 1: forward 1 meter
            drivetrain.turnToHeading(90),    // step 2: face 90°
            drivetrain.driveDistance(1.0))   // step 3: forward 1 meter
        .named("Drive Turn Drive");
  }
}
```

**The new idea: `Command.sequence(...)`** runs the commands you give it **one
at a time, in order**. Step 2 doesn't start until step 1 reports finished; step
3 waits for step 2. Because each step finishes itself, the sequence flows step
to step and then ends — at which point auto is over. `Command.sequence(...)`
is a **static** method — called on `Command` itself, no object needed, same
family as `Command.noRequirements(...)` and `Command.requiring(...)` you've
already used — and, like every builder in this API, it needs `.named(...)`
before it's a real, runnable `Command`. (`Command.andThen(Command)` does the
same job for exactly two commands — Lesson 7's turn-in-place hint already
used it — `sequence` is the clean way to chain *many*.)

Two smaller things about this file's shape. `driveTurnDrive` is **`static`** —
called on the class itself (`Autos.driveTurnDrive(...)`), no object needed,
the same way you call `Math.abs(...)`. That fits, because `Autos` has no data
of its own; it's a cookbook, not a machine. And `private Autos() {}` is a
constructor nobody can call — the idiom for "don't bother making instances of
this class; just use its static methods."

### A better way to write the same plan

Here's something worth slowing down for, because it changes how you'll write
every routine from here on. Look again at what `Command.sequence(...)` really
does: it takes three *already-built* commands and glues them together from
the outside. There's another way — write the plan as a method whose body
just... runs the steps, one after another, like an ordinary script:

```java
public static Command driveTurnDrive(Drivetrain drivetrain) {
  return Command.noRequirements(coroutine -> {
        coroutine.await(drivetrain.driveDistance(1.0));  // step 1: forward 1 meter
        coroutine.await(drivetrain.turnToHeading(90));   // step 2: face 90°
        coroutine.await(drivetrain.driveDistance(1.0));  // step 3: forward 1 meter
      })
      .named("Drive Turn Drive");
}
```

**`coroutine.await(command)`** schedules `command` and suspends this
coroutine right there until it finishes — then the next line runs. Read the
method top to bottom and it *is* the plan you'd say out loud: drive a meter,
await it; turn to ninety, await it; drive a meter, await it. No decorators
gluing pieces together from outside — the sequencing *is* the code's own
control flow, the same "just write it as a loop" idea Lesson 8 used for
`turnToHeading`.

Here's the part that matters beyond just looking nicer. `Command.sequence(...)`
builds one command that requires the Drivetrain for the group's **entire**
duration, start to finish. The `await` version is different: `driveTurnDrive`
itself requires *nothing* — `Command.noRequirements(...)` says so — and each
step claims the Drivetrain only while *that step* is actually running, then
lets go the instant it finishes, a beat before the next `await` claims it
again. With only a Drivetrain in this robot, that distinction doesn't have
anywhere to show off yet — every step needs the same one mechanism regardless
of how you write the sequence. It matters the moment a routine mixes
mechanisms — drive somewhere, then run an arm, then drive again — where a
`sequence(...)` group would hold the *drivetrain* mechanism reserved even
during the arm step it doesn't need, while an awaited version only ever holds
exactly what the current step is using. Get comfortable with the shape now;
it pays off the moment this robot has more than one mechanism to coordinate.

Both versions produce a working `Autos.driveTurnDrive` — this course uses the
`await` version going forward.

That rewrite is the only new file this section needs — `code/OpModeV3Robot`
never shipped any leftover example subsystem or command to clean up, unlike
some templates.

---

## 4. Hand it to the robot

Autonomous doesn't need a `getAutonomousCommand()` hook to fill in — there's
no framework method waiting for a return value. `RobotAuto` just has to
*schedule its own plan* the moment auto actually starts, the same way every
other binding in this course has lived in a constructor since Lesson 1.

**Replace the contents of `RobotAuto`'s constructor:**

```java
public RobotAuto(Robot robot) {
  this.robot = robot;

  // Fires once, the moment this opmode goes from disabled to enabled.
  RobotModeTriggers.autonomous().onTrue(Autos.driveTurnDrive(robot.drivetrain));
}
```

**Add to `RobotAuto`'s imports:**

```java
import org.wpilib.command3.button.RobotModeTriggers;

import first.robot.commands.Autos;
```

**`RobotModeTriggers.autonomous()`** is a `Trigger` — the same kind of thing
`robot.driverController.southFace()` gives you — except its condition isn't a
button, it's "is the Driver Station currently in Autonomous, and enabled."
`.onTrue(...)` schedules `driveTurnDrive` the instant that becomes true,
exactly once per enable, the same `onTrue` you've used since Lesson 5.

Why does this belong in the constructor and not `start()`? The same reason
every other binding has, since Lesson 1: the constructor runs exactly once,
when `RobotAuto` is selected, and that's what makes this binding *scoped* to
`RobotAuto` specifically — it's automatically torn down the moment the Driver
Station selects a different opmode, the same scoping that already protects
every button binding you've written. Put this logic in `start()` instead and
you'd re-register a fresh trigger on every re-enable, stacking duplicates —
Lesson 1's exact warning, still true here.

Run it: `./gradlew simulateJava`, pick **Drive Turn Drive** on the opmode
selector, set state to **Enabled**, and watch your plots and the Swerve tab.
`Drivetrain/Module0/SteerAngleDegrees` holds 0 while distance climbs to 1.0,
the heading sweeps to 90° and settles, distance climbs again from a new zero.
The robot ran your plan untouched — nobody's hands on the controller. That
one is worth savoring for a second.

Then watch the Swerve tab closely at the *moment* each step changes — right
when the turn begins, and right when step 3 starts. There's a little ugliness
hiding in those transitions, and fixing it is next.

---

## 5. A polish: don't drive while pointed wrong

Here's the ugliness. When step 2 begins, every wheel's *steering target*
snaps from 0° to its pinwheel angle — but steering takes real time (that
25:1 gearbox from Lesson 7 doesn't teleport). For a fraction of a second the
drive motors are pushing at full command through wheels pointed somewhere
*between* the old direction and the new one. The chassis scrubs sideways,
the tires drag, and the odometer counts distance the robot didn't cleanly
travel. In teleop you'd never notice; in an auto that's supposed to end in a
precise spot, these little smears add up.

The fix is one line of trigonometry, and it's a trick every good swerve
robot uses. Ask: *how much of this wheel's rolling actually points where we
want to go?* That's exactly what cosine measures. Pointed perfectly
(`error = 0°`), `cos = 1` — drive full speed. Pointed 60° off, `cos = 0.5` —
half of the rolling would be useful, so drive at half. Pointed sideways
(`90°`), `cos = 0` — nothing you drive goes the right way, so don't drive at
all — scale the drive line by cosine.

**Edit `setDesiredState` in `SwerveModule`:**

```java
/** One tick of control: steer toward 'angleDegrees', drive at 'speedFraction'. */
public void setDesiredState(double angleDegrees, double speedFraction) {
  // Steering P control (same math as Lesson 5, with the wrap trick).
  double error = angleDegrees - getSteerAngleDegrees();
  while (error > 180)  { error -= 360; }
  while (error < -180) { error += 360; }
  double steerOutput = clamp(SteerConstants.kP * error, -1.0, 1.0);
  m_steerMotor.setThrottle(steerOutput);

  // Drive only as much as the wheel is pointed the right way:
  // cos(0°) = 1 → full speed; cos(90°) = 0 → don't drive while sideways.
  double alignment = Math.cos(Math.toRadians(error));
  m_driveMotor.setThrottle(speedFraction * alignment);
}
```

(`Math.cos` works in radians, hence the `Math.toRadians` — same family as the
`Math.toDegrees` you used in Lesson 7, opposite direction.) One subtlety: past
90° of error, cosine goes *negative*, so the wheel briefly drives backward.
That's not a bug — it's the honest answer to "how much of my rolling points
the right way": at 180° off, rolling backward *is* rolling the right way.
WPILib ships this exact idea as `SwerveModuleVelocity.cosineScale` (Lesson
7's renamed `SwerveModuleState`), which you'll be able to swap in once
Lesson 10 has the module speaking in states.

Re-run the auto and watch the transitions again: the wheels now settle onto
their new angles *before* the drive effort ramps in, the scrub is gone, and
the distance the odometer counts is distance the robot actually traveled in
the right direction. One line, visibly better auto.

---

## 6. Doing things at once: parallel

Sequences do one thing at a time. Sometimes you want *simultaneous* actions —
say, running a mechanism (once you have one) alongside a drive step. Two tools,
both static methods on `Command`, both returning a builder that needs
`.named(...)`:

- **`Command.parallel(a, b)`** runs both and finishes when **all** are done.
- **`Command.race(a, b)`** runs both, but finishes the instant **any one**
  of them finishes, canceling the rest.

*Nothing to add — this is just an example, not code for any file:*

```java
// Turn to 90° while continuously reporting — finishes when the turn is done.
Command.parallel(drivetrain.turnToHeading(90))
    .optional(reportCommand)
    .named("Turn And Report");
```

That third shape — `.optional(...)`, chained onto `Command.parallel(...)` —
is worth naming, because it's more flexible than the two static methods
alone. `Command.parallel(a, b)` treats every command you hand it as
*required*: the group waits for all of them. Chain `.optional(...)` instead
of listing a command as required, and it rides along without being able to
keep the group alive — the group finishes based on its required commands
alone, and optional ones just get cancelled when that happens. That's exactly
"run this, and something else alongside it for as long as it takes" — one
designated command sets the pace, everything else just comes along for the
ride.

**One hard rule, and this framework tells you about it immediately:** two
*required* commands in a parallel group must not use the same mechanism.
Try `Command.parallel(drivetrain.driveDistance(1.0), drivetrain.turnToHeading(90))`
and building it throws right away — `IllegalArgumentException: Commands
running in parallel cannot share requirements` — not a mysterious runtime
hang, a clear error the moment you build the group. Both of those require
the Drivetrain, so they'd fight over the same actuator. The way to *combine*
translation and rotation on one mechanism is Lesson 10's
`SwerveDriveKinematics`.

---

## 7. Bonus: a second autonomous routine

Real robots pick from several autos before a match. In this framework that's
not a dashboard widget you build — it's the Driver Station's own opmode
selector, the exact same list `RobotTeleop` and `RobotAuto` already show up
in. Every `@Autonomous` class is its own selectable entry.

**Create a second opmode, `opmode/RobotAutoBox.java`:**

```java
package first.robot.opmode;

import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;

@Autonomous(name = "Do Nothing", group = "Group 1")
public class RobotAutoBox extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoBox(Robot robot) {
    this.robot = robot;
    // An empty auto — nothing scheduled at all.
  }

  @Override
  public void periodic() {}
}
```

Rebuild, open the opmode selector in SimGUI, and **Do Nothing** sits right
next to **Drive Turn Drive** — two real, independent choices, zero chooser
code written. Pick **Do Nothing**, start Autonomous, and enjoy the robot
pointedly ignoring you. Then pick **Drive Turn Drive** back. This is the
pattern to reach for every time this robot needs another auto: one more
small `@Autonomous` class, not a dropdown living inside a bigger one.

---

## Try it

1. **Design your own auto:** a box pattern — drive 1 m, turn 90°, four times,
   ending where it started facing the start heading. Predict the final heading
   before you run it. (This is what `RobotAutoBox` from section 7 is named
   for — replace its empty body with the real thing.)
2. Give `driveTurnDrive` a `double distance` parameter so the same factory
   makes short and long autos, and add a third `@Autonomous` opmode that
   calls it with a different distance.
3. Add a `coroutine.wait(Seconds.of(1.0))` between two of the `await` calls
   and watch the pause on your plots. When might a deliberate wait help a
   real auto? (Hint: letting a mechanism settle.)

---

## What you learned — and where to go next

Autonomous turned out to be the least mysterious thing in robot programming:
just another opmode, whose whole job is scheduling one plan the moment
`RobotModeTriggers.autonomous()` fires — built by composing the small
finishing commands you already had. `Command.sequence(...)` runs steps in
order, `Command.parallel`/`.race`/`.optional` run them at once as long as no
two share a mechanism, and an auto factory that takes the drivetrain as a
parameter — **dependency injection** — keeps every command pointed at the
one real robot. The bigger idea underneath: **`coroutine.await(...)`** turns
a sequence from something you build by gluing commands together into
something you just *write*, one line per step, each mechanism held only as
long as its own step needs it — a shape that pays for itself the moment a
routine spans more than one mechanism. Running a plan with nobody's hands on
the sticks also exposed a flaw teleop had been hiding, and **cosine
compensation** fixed it with one line: scale the drive by `cos(steer error)`,
so a wheel doesn't push hard until it's pointing the right way. And the
`MyTeleop`/`MyAuto` names finally became `RobotTeleop`/`RobotAuto` — not
because anything technical demanded it today, but because template example
code doesn't drive a match, and now neither of these files is that anymore.
Step back and look at the whole spine you've built: mechanisms own hardware,
commands describe work, the scheduler runs it, telemetry records it, and
simulation proves it before the robot exists. Everything from here on is
refinement — starting with Lesson 10, where the chassis finally learns to
drive and spin at the same time.

Next: Lesson 10 — Full swerve with kinematics.
