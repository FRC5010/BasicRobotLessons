# Lesson 8 — Autonomous: combine everything

**Goal:** Snap all your building blocks together into an autonomous routine that
runs by itself: drive forward, turn 90°, drive again — then explore running steps in
parallel.

**New Java concepts**
- **Command composition** into named routines
- **Sequential** vs. **parallel** execution
- Passing subsystems into a **factory method** that builds a command

**New robot concepts**
- `getAutonomousCommand()` and how auto starts
- **`Commands.sequence`**, **`Commands.parallel`**, **`Commands.deadline`**
- Designing an auto as a *sentence* of small commands

---

## 1. What autonomous actually is

For the first 15 seconds of an FRC match the robot runs with no driver. WPILib asks
`RobotContainer.getAutonomousCommand()` for **one command**, schedules it when auto
starts, and cancels it when auto ends. That's the whole mechanism.

The trick: that "one command" can be many commands glued together. Everything you
built — `driveDistance`, `turnToHeading` — finishes on its own (Lessons 6 & 7), which
is *exactly* what makes them composable. A command that never ends can't be step 1 of
3. Now you see why "commands that finish" mattered.

---

## 2. Build the routine

The `commands/Autos.java` file is the home for auto factories. Replace the example
with a real one that takes your two subsystems and returns a sequence:

```java
package frc.robot.commands;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.DriveModule;

public final class Autos {
  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(DriveModule module, Drivetrain drivetrain) {
    return Commands.sequence(
        module.driveDistance(1.0, 0.4),      // step 1: forward 1 meter
        drivetrain.turnToHeading(90),        // step 2: face 90°
        module.driveDistance(1.0, 0.4));     // step 3: forward 1 meter
  }
}
```

**The new idea: `Commands.sequence(...)`** runs the commands you give it **one at a
time, in order**. Step 2 doesn't start until step 1 reports finished; step 3 waits
for step 2. Because each block finishes itself, the sequence flows step to step and
then ends — at which point auto is over.

Read that method like a sentence: *drive a meter, turn to ninety, drive a meter.*
Good auto code reads like the plan you'd say out loud.

> `andThen` from Lesson 6 does the same thing for two commands
> (`a.andThen(b)`); `Commands.sequence(a, b, c, ...)` is the clean way to chain
> *many*. Use whichever reads better.

---

## 3. Hand it to the robot

In `RobotContainer.getAutonomousCommand()`:

```java
public Command getAutonomousCommand() {
  return Autos.driveTurnDrive(m_module, m_drivetrain);
}
```

Note we **pass the subsystems in** rather than letting `Autos` create its own. There
is only *one* real drive module and *one* gyro; every command must share the same
objects, or the scheduler can't keep them from conflicting. Passing shared objects
into a factory is called **dependency injection** — a fancy name for "hand it what it
needs instead of letting it make its own."

Run it: `./gradlew simulateJava`, set state to **Autonomous**, and watch your plots.
Distance climbs to 1.0 and stops, heading sweeps to 90° and settles, distance climbs
again. The robot ran your plan untouched.

---

## 4. Doing things at once: parallel

Sequences do one thing at a time. Sometimes you want *simultaneous* actions — e.g.
start turning while you finish coasting. Two tools:

- **`Commands.parallel(a, b)`** runs both and finishes when **all** are done.
- **`Commands.deadline(deadline, a, b)`** runs all, but finishes when the **first
  (deadline)** command finishes, cancelling the rest.

```java
// Turn to 90° while continuously reporting — finishes when the turn is done.
Commands.deadline(
    drivetrain.turnToHeading(90),
    Commands.run(() -> System.out.println("turning...")));
```

**One hard rule:** two commands in a parallel group must not use the **same
subsystem** — they'd fight over the same motor, and the scheduler forbids it. Turning
(`Drivetrain`) alongside something on a *different* subsystem is fine; two things
driving the same `DriveModule` at once is not.

---

## 5. Bonus: an auto chooser

Real robots pick from several autos on the dashboard. WPILib's `SendableChooser`
makes that a few lines — a great next step once you have two or three routines:

```java
// import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;
// import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;

private final SendableChooser<Command> m_autoChooser = new SendableChooser<>();

// in the constructor:
m_autoChooser.setDefaultOption("Drive-Turn-Drive",
    Autos.driveTurnDrive(m_module, m_drivetrain));
m_autoChooser.addOption("Do Nothing", Commands.none());
SmartDashboard.putData("Auto Choice", m_autoChooser);

// getAutonomousCommand():
return m_autoChooser.getSelected();
```

---

## Try it

1. **Design your own auto:** a box pattern — drive 1 m, turn 90°, four times, ending
   where it started facing the start heading. Predict the final heading before you
   run it.
2. Give `driveTurnDrive` a `double distance` parameter so the same factory makes
   short and long autos. Add both to the chooser.
3. Add a `Commands.waitSeconds(1.0)` between steps and watch the pause on your plots.
   When might a deliberate wait help a real auto? (Hint: letting a mechanism settle.)

---

## What you learned — and where to go next

- Autonomous is just **one command**, and that command can be **many small commands
  composed** together.
- **`Commands.sequence`** runs steps in order; **`Commands.parallel`** /
  **`Commands.deadline`** run them at once (never sharing a subsystem).
- Passing shared subsystems into an auto **factory** keeps everyone using the same
  hardware — the scheduler depends on it.
- Because every block you built **finishes itself**, they snap together like Lego.

**Where to go from here:**
- **Scale to four modules:** make a `SwerveModule` class, create an *array* of four,
  and drive them with a `for` loop — a perfect lesson on arrays and loops.
- **Swerve kinematics:** WPILib's `SwerveDriveKinematics` turns a
  desired robot motion into per-module angle+speed, replacing the fake rotation in
  Lesson 7 with the real thing.
- **Odometry & field plots:** `SwerveDriveOdometry` + `Field2d` draw the robot
  moving on a virtual field — the payoff of all the telemetry you've been plotting.
- **Better control:** replace hand-written P control with WPILib's `PIDController`
  and Phoenix's on-motor closed loop (`PositionVoltage`, `MotionMagicVoltage`).

You now understand the whole spine of a command-based robot: subsystems own
hardware, commands describe work, the scheduler runs it, and simulation lets you
prove it all before the robot is even built. That's the foundation every advanced
topic builds on.
