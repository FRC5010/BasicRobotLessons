# Lesson 9 — Autonomous: combine everything

**Goal:** Snap all your building blocks together into an autonomous routine that
runs by itself: drive forward, turn 90°, drive again — then explore running
steps in parallel.

**New Java concepts**
- **Command composition** into named routines
- **Sequential** vs. **parallel** execution
- Passing subsystems into a **factory method** that builds a command

**New robot concepts**
- `getAutonomousCommand()` and how auto starts
- **`Commands.sequence`**, **`Commands.parallel`**, **`Commands.deadline`**
- A whole-chassis **`driveDistance`** built from the Drivetrain primitives
- **Cosine compensation** — don't drive hard until the wheel points the right way
- Designing an auto as a *sentence* of small commands

---

## 1. What autonomous actually is

For the first 15 seconds of an FRC match, the robot runs with no driver. The
mechanism behind it is smaller than you'd guess: WPILib asks
`RobotContainer.getAutonomousCommand()` for **one command**, schedules it when
auto starts, and cancels it when auto ends. That's it. No special auto mode
API, no separate programming model — one command.

The trick, of course, is that "one command" can be many commands glued
together. And here's where a promise gets kept: `turnToHeading` from Lesson 8
finishes on its own, and that's *exactly* what makes it composable. A command
that never ends can't be step 1 of 3 — nothing after it would ever run. When
Lesson 6 made a fuss about commands that finish, this lesson was the reason.

For distance we need one more finish-on-its-own command — this time at the
*chassis* level, since we work with a whole robot now, not the single-module
`driveDistance` from Lesson 6.

---

## 2. Add `driveDistance` to the Drivetrain

Lesson 6 had a per-module `driveDistance`. The same shape works for the chassis
— reset one wheel's odometer, drive all four forward at a fixed speed, stop when
the wheel has covered the distance.

**Add to `Drivetrain`, with the other command factories:**

```java
/** Drive straight forward 'meters' at 40% power. Finishes on its own. */
public Command driveDistance(double meters) {
  return runOnce(() -> m_modules[0].resetDrivePosition())
      .andThen(run(() -> {
        for (SwerveModule module : m_modules) {
          module.setDesiredState(0.0, 0.4);   // point forward, 40% throttle
        }
        m_lastCommandedOmega = 0.0;
      }))
      .until(() -> Math.abs(m_modules[0].getDistanceMeters()) >= Math.abs(meters))
      .finallyDo(() -> {
        for (SwerveModule module : m_modules) {
          module.setDesiredState(0.0, 0.0);   // stop
        }
      });
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

Now read `driveDistance` top to bottom: it's the **same four Lego bricks as
Lesson 6** — `runOnce`, `andThen`, `until`, `finallyDo` — applied one level
up. We ask *every module* to point forward and roll, and we watch *one wheel*
to know when we've gone far enough. Watching one wheel works for
straight-ahead driving because, with all four wheels aimed the same direction
at the same speed, they all cover the same distance. If that composition
pattern is starting to feel routine, good — routine is the point.

---

## 3. Build the routine

Now the fun part: writing the plan. `commands/Autos.java` is the home for auto
factories — the template shipped one with an example in it.

This routine takes your subsystem and returns a sequence.

**Replace the contents of `commands/Autos.java`:**

```java
package frc.robot.commands;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.subsystems.Drivetrain;

public final class Autos {
  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Commands.sequence(
        drivetrain.driveDistance(1.0),     // step 1: forward 1 meter
        drivetrain.turnToHeading(90),      // step 2: face 90°
        drivetrain.driveDistance(1.0));    // step 3: forward 1 meter
  }
}
```

**The new idea: `Commands.sequence(...)`** runs the commands you give it **one
at a time, in order**. Step 2 doesn't start until step 1 reports finished; step
3 waits for step 2. Because each block finishes itself, the sequence flows step
to step and then ends — at which point auto is over.

Two smaller things about this file's shape. `driveTurnDrive` is **`static`** —
called on the class itself (`Autos.driveTurnDrive(...)`), no object needed,
the same way you call `Math.abs(...)`. That fits, because `Autos` has no data
of its own; it's a cookbook, not a machine. And `private Autos() {}` is a
constructor nobody can call — the idiom for "don't bother making instances of
this class; just use its static methods."

Read the method like a sentence: *drive a meter, turn to ninety, drive a meter.*
Good auto code reads like the plan you'd say out loud.

That rewrite orphaned the last of the template's example code — the `Autos`
you just replaced was the only thing still using it.

**Delete `commands/ExampleCommand.java` and `subsystems/ExampleSubsystem.java`.**
They came with the template as a demo; nothing references them anymore, and a
dead file is one more thing to confuse you later. (`RobotContainer` still
constructs an `ExampleSubsystem` — you'll clear that line out in section 4 when
you rewire autonomous.)

> `andThen` from Lesson 6 does the same thing for two commands (`a.andThen(b)`);
> `Commands.sequence(a, b, c, ...)` is the clean way to chain *many*. Use
> whichever reads better.

---

## 4. Hand it to the robot

`RobotContainer` already has a `getAutonomousCommand()` method — it's been
sitting in the template since Lesson 0, waiting.

**Delete the `m_exampleSubsystem` field and its `import`** from
`RobotContainer` — with the example auto gone, nothing uses it.

**Replace `getAutonomousCommand()`'s body:**

```java
  public Command getAutonomousCommand() {
    return Autos.driveTurnDrive(m_drivetrain);
  }
```

Note we **pass the subsystem in** rather than letting `Autos` create its own.
There is only *one* real drivetrain; every command must share the same object,
or the scheduler can't keep them from conflicting. (Imagine `Autos` calling
`new Drivetrain()` — eight brand-new motor objects fighting the real ones over
the same CAN IDs.) Passing shared objects into a factory is called
**dependency injection** — a fancy name for "hand it what it needs instead of
letting it make its own."

Run it: `./gradlew simulateJava`, set state to **Autonomous**, and watch your
plots and the Swerve tab. `Drivetrain/Module0/SteerAngleDegrees` holds 0 while
distance climbs to 1.0, the heading sweeps to 90° and settles, distance climbs
again from a new zero. The robot ran your plan untouched — nobody's hands on
the controller. That one is worth savoring for a second.

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
  double steerOutput = MathUtil.clamp(SteerConstants.kP * error, -1.0, 1.0);
  m_steerMotor.set(steerOutput);

  // Drive only as much as the wheel is pointed the right way:
  // cos(0°) = 1 → full speed; cos(90°) = 0 → don't drive while sideways.
  double alignment = Math.cos(Math.toRadians(error));
  m_driveMotor.set(speedFraction * alignment);
}
```

(`Math.cos` works in radians, hence the `Math.toRadians` — same family as the
`Math.toDegrees` you used in Lesson 7, opposite direction.) One subtlety: past
90° of error, cosine goes *negative*, so the wheel briefly drives backward.
That's not a bug — it's the honest answer to "how much of my rolling points
the right way": at 180° off, rolling backward *is* rolling the right way.
WPILib ships this exact idea as `SwerveModuleState.cosineScale`, which you'll
be able to swap in once Lesson 10 has the module speaking in states.

Re-run the auto and watch the transitions again: the wheels now settle onto
their new angles *before* the drive effort ramps in, the scrub is gone, and
the distance the odometer counts is distance the robot actually traveled in
the right direction. One line, visibly better auto.

---

## 6. Doing things at once: parallel

Sequences do one thing at a time. Sometimes you want *simultaneous* actions —
say, running a mechanism (once you have one) alongside a drive step. Two tools:

- **`Commands.parallel(a, b)`** runs both and finishes when **all** are done.
- **`Commands.deadline(deadline, a, b)`** runs all, but finishes when the
  **first (deadline)** command finishes, cancelling the rest.

*Nothing to add — this is just an example, not code for any file:*

```java
// Turn to 90° while continuously reporting — finishes when the turn is done.
Commands.deadline(
    drivetrain.turnToHeading(90),
    Commands.run(() -> System.out.println("turning...")));
```

**One hard rule:** two commands in a parallel group must not use the **same
subsystem** — they'd fight over the same actuator, and the scheduler forbids
it. So you can't `parallel(drivetrain.driveDistance(1.0),
drivetrain.turnToHeading(90))` today — both require the Drivetrain, and the
scheduler will complain. The way to *combine* translation and rotation on one
subsystem is Lesson 10's `SwerveDriveKinematics`.

---

## 7. Bonus: an auto chooser

Real robots pick from several autos on the dashboard before a match. Which
auto got picked is an *input* to the robot — and inputs are exactly the kind
of thing you've been logging since Lesson 3. AdvantageKit's
**`LoggedDashboardChooser`** does both jobs at once: it publishes a drop-down
the dashboard can set, and it records the selection in the log, so you can
always tell from a log file which auto ran.

**Add to `RobotContainer`'s imports:**

```java
import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;
```

**Add to `RobotContainer`, with the other fields:**

```java
  private final LoggedDashboardChooser<Command> m_autoChooser =
      new LoggedDashboardChooser<>("Auto Choice");
```

The options are what the drop-down offers.

**Add to the `RobotContainer` constructor:**

```java
  m_autoChooser.addDefaultOption("Drive-Turn-Drive", Autos.driveTurnDrive(m_drivetrain));
  m_autoChooser.addOption("Do Nothing", Commands.none());
```

Hand back whatever the chooser has selected instead of the hard-coded routine.

**Replace `getAutonomousCommand()`'s body again:**

```java
  public Command getAutonomousCommand() {
    return m_autoChooser.get();
  }
```

The `<Command>` in angle brackets says what *kind* of thing the chooser holds
— its options are commands, and `get()` hands back whichever one is currently
selected. To actually pick: in SimGUI, open **NetworkTables → SmartDashboard**
and "Auto Choice" appears as a drop-down. Choose "Do Nothing," start
Autonomous, and enjoy the robot pointedly ignoring you. Then pick your routine
back.

---

## Try it

1. **Design your own auto:** a box pattern — drive 1 m, turn 90°, four times,
   ending where it started facing the start heading. Predict the final heading
   before you run it.
2. Give `driveTurnDrive` a `double distance` parameter so the same factory
   makes short and long autos. Add both to the chooser.
3. Add a `Commands.waitSeconds(1.0)` between steps and watch the pause on your
   plots. When might a deliberate wait help a real auto? (Hint: letting a
   mechanism settle.)

---

## What you learned — and where to go next

Autonomous turned out to be the least mysterious thing in robot programming:
**one command**, built by composing the small finishing commands you already
had. **`Commands.sequence`** runs steps in order; **`parallel`** and
**`deadline`** run them at once, as long as no two share a subsystem; and an
auto factory that takes the drivetrain as a parameter — **dependency
injection** — keeps every command pointed at the one real robot. Running a
plan with nobody's hands on the sticks also exposed a flaw teleop had been
hiding, and **cosine compensation** fixed it with one line: scale the drive
by `cos(steer error)`, so a wheel doesn't push hard until it's pointing the
right way. The
`LoggedDashboardChooser` closes the loop the AdvantageKit way: the pre-match
choice is itself an input, published and logged. Step back and look at the
whole spine you've built: subsystems own hardware, commands describe work, the
scheduler runs it, telemetry records it, and simulation proves it before the
robot exists. Everything from here on is refinement — starting with Lesson 10,
where the chassis finally learns to drive and spin at the same time.

Next: [Lesson 10 — Full swerve with kinematics](10-kinematics.md).
