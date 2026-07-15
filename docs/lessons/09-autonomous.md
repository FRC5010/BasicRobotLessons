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
- Designing an auto as a *sentence* of small commands

---

## 1. What autonomous actually is

For the first 15 seconds of an FRC match, the robot runs with no driver. WPILib
asks `RobotContainer.getAutonomousCommand()` for **one command**, schedules it
when auto starts, and cancels it when auto ends. That's the whole mechanism.

The trick: that "one command" can be many commands glued together. `turnToHeading`
from Lesson 8 already finishes on its own — that's *exactly* what makes it
composable. A command that never ends can't be step 1 of 3. Now you see why
"commands that finish" mattered.

For distance we need to introduce one more finish-on-its-own command — this
time at the *chassis* level, since we work with a whole robot now, not a
single-module `driveDistance` from Lesson 6.

---

## 2. Add `driveDistance` to the Drivetrain

Lesson 6 had a per-module `driveDistance`. The same shape works for the chassis
— reset one wheel's odometer, drive all four forward at a fixed speed, stop when
the wheel has covered the distance. Add to `Drivetrain`:

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

And expose a tiny reset on the module (Lesson 6 called `setPosition(0)` directly
on the TalonFX; now we wrap it in a named method):

```java
/** Zero the drive encoder — start measuring distance from *here*. */
public void resetDrivePosition() {
  m_driveMotor.setPosition(0);
}
```

**Same four Lego bricks as Lesson 6** (`runOnce`, `andThen`, `until`,
`finallyDo`), just applied one level up: we ask *every module* to point forward
and roll, and we watch *one wheel* to know when we've gone far enough. It works
for straight-forward driving because — with all four wheels aimed the same
direction and at the same speed — they all cover the same distance.

---

## 3. Build the routine

`commands/Autos.java` is the home for auto factories. Replace the example with
one that takes your subsystem and returns a sequence:

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

Read the method like a sentence: *drive a meter, turn to ninety, drive a meter.*
Good auto code reads like the plan you'd say out loud.

> `andThen` from Lesson 6 does the same thing for two commands (`a.andThen(b)`);
> `Commands.sequence(a, b, c, ...)` is the clean way to chain *many*. Use
> whichever reads better.

---

## 4. Hand it to the robot

In `RobotContainer.getAutonomousCommand()`:

```java
public Command getAutonomousCommand() {
  return Autos.driveTurnDrive(m_drivetrain);
}
```

Note we **pass the subsystem in** rather than letting `Autos` create its own.
There is only *one* real drivetrain; every command must share the same object,
or the scheduler can't keep them from conflicting. Passing shared objects into a
factory is called **dependency injection** — a fancy name for "hand it what it
needs instead of letting it make its own."

Run it: `./gradlew simulateJava`, set state to **Autonomous**, and watch your
plots. `getDistanceMeters()` from module 0 climbs to 1.0 and stops, heading
sweeps to 90° and settles, distance climbs again from a new zero. The robot ran
your plan untouched.

---

## 5. Doing things at once: parallel

Sequences do one thing at a time. Sometimes you want *simultaneous* actions —
say, running a mechanism (once you have one) alongside a drive step. Two tools:

- **`Commands.parallel(a, b)`** runs both and finishes when **all** are done.
- **`Commands.deadline(deadline, a, b)`** runs all, but finishes when the
  **first (deadline)** command finishes, cancelling the rest.

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

## 6. Bonus: an auto chooser

Real robots pick from several autos on the dashboard. WPILib's `SendableChooser`
makes that a few lines — a great next step once you have two or three routines:

```java
// import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;
// import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

private final SendableChooser<Command> m_autoChooser = new SendableChooser<>();

// in the constructor:
m_autoChooser.setDefaultOption("Drive-Turn-Drive", Autos.driveTurnDrive(m_drivetrain));
m_autoChooser.addOption("Do Nothing", Commands.none());
SmartDashboard.putData("Auto Choice", m_autoChooser);

// getAutonomousCommand():
return m_autoChooser.getSelected();
```

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

- Autonomous is just **one command**, and that command can be **many small
  commands composed** together.
- **`Commands.sequence`** runs steps in order; **`Commands.parallel`** /
  **`Commands.deadline`** run them at once (never sharing a subsystem).
- Passing shared subsystems into an auto **factory** keeps everyone using the
  same hardware — the scheduler depends on it.
- Because every block you built **finishes itself**, they snap together like
  Lego.

You now understand the whole spine of a command-based robot: subsystems own
hardware, commands describe work, the scheduler runs it, and simulation lets
you prove it all before the robot is even built.

Next: [Lesson 10 — Full swerve with kinematics](10-kinematics.md).
