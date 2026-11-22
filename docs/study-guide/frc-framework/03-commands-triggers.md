# Commands and triggers

A command is one job for the robot, such as "go to this height" or "drive with the sticks",
and a trigger is a condition that starts or stops one.

**Where this comes from:** the first command and button are in
[Lesson 1](../../lessons/v3/01-first-motor.md), default commands in
[Lesson 2](../../lessons/v3/02-joystick-control.md), commands that finish (and
`whenExited`) in [Lesson 6](../../lessons/v3/06-distance-and-commands.md), and
sequences and parallel groups in [Lesson 9](../../lessons/v3/09-autonomous.md). Triggers
that aren't buttons arrive in [Lesson 21](../../lessons/v3/21-limit-sensors.md), combining and
debouncing them in [Lesson 22](../../lessons/v3/22-light-sensors.md), and binding motion to
a state in [Lesson 24](../../lessons/v3/24-superstructure.md).

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. How a
command's *body* is written (lambdas, `yield`, `await`) is on the
[Lambdas and coroutines](../java/04-lambdas-coroutines.md) page; this page is about what
the scheduler does with the command once it exists.

## 1. Mechanisms, and one job at a time

A **mechanism** is a part of the robot that can only do one thing at a time: the
elevator, the arm, the drivetrain. In code it's a class that says `implements Mechanism`:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java`:*
```java
public class Elevator implements Mechanism {
  // ...
}
```

That one line is enough for the scheduler to know about it, from the moment it's
built. <!-- claim: commandsv3.mechanism-registers-with-scheduler -->

A command made by one of the mechanism's own factories, like `run(...)` or
`runRepeatedly(...)`, **requires** that mechanism. The scheduler's rule is simple: one
command per mechanism. If you start a second command that needs the same mechanism, the
one already running is cancelled. <!-- claim: commandsv3.conflicting-command-interrupts -->
That's why pressing the arm button while the roller spins stops the roller: both are the
arm's.

Here's the wrong picture to drop: the robot doesn't run every command you've started, side
by side, each pulling the motors its own way. A mechanism has exactly one owner at any
moment, and the newest request wins.

<details class="quiz" id="q-commands-1" markdown="1">
<summary>Check yourself: the elevator is running `goToHeight(...)` when the driver presses Back, which starts `home()`. Both require the elevator. What happens?</summary>

- [ ] Both run, and the motor gets the average of what they ask for. *A mechanism has one owner at a time; nothing averages.*
- [ ] `home()` waits until `goToHeight` is done. *The scheduler doesn't queue it. The newer command takes over.*
- [x] `goToHeight` is cancelled and `home()` takes over. *Scheduling a command on a mechanism cancels whatever was running on it.*

</details>

## 2. Making a command

Commands come from **factory methods**: a method on the mechanism that builds and returns
a new `Command`. Each one ends with `.named(...)`:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java`:*
```java
public Command goToHeight(Distance target) {
  return runRepeatedly(() -> {
        m_goal = clampToTravel(target);
        m_io.setGoalHeightMeters(m_goal.in(Meters));
      })
      .until(this::atGoal)
      .named("Go To Height");
}
```

The name isn't decoration. `runRepeatedly(...)`, `run(...)`, `Command.noRequirements(...)`,
`Command.sequence(...)` and `Command.parallel(...)` all return a *builder*, not a command.
You can add things to it, like `.until(...)` or `.whenExited(...)`, and `.named(...)` is the
step that turns it into a `Command`. <!-- claim: commandsv3.builders-need-a-name --> The
name is also what shows up in the logs as `Elevator/CurrentCommand`, so pick one you'd
recognise in a graph.

`.until(condition)` ends the command once the condition is true, checked every tick. This
one runs forever on its own, so `until(this::atGoal)` is what makes it finish on
arrival.

A command that should belong to no mechanism at all, like a plan that only starts other
commands, or a quick request that flips a flag, is built with
`Command.noRequirements(...)`. No rival can take it over, because it claims
nothing. <!-- claim: commandsv3.no-requirements-exists -->

## 3. How a command ends, and cleaning up

A command can end two ways:

- **It finishes**: its body runs out of code, or its `until(...)` condition comes true.
- **It's cancelled**: a button is let go, another command takes its mechanism, or the robot
  is disabled.

Motors keep doing the last thing they were told, so a command that moves something has to
put it right when it ends. Two hooks do that:

- **`.whenExited(...)`** runs however the command ends, finished or cancelled.
- **`.whenCanceled(...)`** runs only when it didn't finish by itself. On a cancel, both run,
  `whenExited` first. <!-- claim: commandsv3.when-exited-on-cancel -->

[Figure 6.1](../../lessons/v3/06-distance-and-commands.md#figure-6-1) draws the two
endings side by side. When the cleanup should happen no matter what, which is most of the
time, use `whenExited`:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java`:*
```java
public Command turnToHeading(double targetDegrees) {
  return run(coroutine -> {
        // ...
      })
      .whenExited(() -> commandRotation(0.0)) // however it ends — stop
      .named("Turn To Heading");
}
```

**The surprise: `.until(...)` ends a command by cancelling it.** So a `whenCanceled` hook
on a command with `until` runs when the condition comes true, too. <!-- claim: commandsv3.when-exited-on-cancel -->
The elevator's homing command relies on exactly that. It pushes down until the switch
trips, and its "cancelled" hook is where it believes the switch:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java`:*
```java
public Command home() {
  return runRepeatedly(() -> m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts)))
      .whenCanceled(() -> {
        m_io.setVoltage(0);
        acceptBottomLimit();
        m_goal = ElevatorConstants.kBottomLimitHeight;
        m_homed = true;
      })
      .until(this::atBottomLimit)
      .named("Home");
}
```

<details class="quiz" id="q-commands-2" markdown="1">
<summary>Check yourself: `driveDistance` reaches its distance and its body runs out of code. Which hooks run?</summary>

- [x] `whenExited` only. *It finished by itself, so the cancel hook stays silent.*
- [ ] `whenCanceled` only. *Nothing cancelled it. A command that stopped its motors only in `whenCanceled` would keep driving here.*
- [ ] Both, `whenExited` first. *That's what a cancel does.*

</details>

## 4. Default commands

A mechanism can have a **default command**: what it does whenever nothing else wants it.
It starts by itself when the mechanism is free and comes back by itself when the command
that took over ends. <!-- claim: commandsv3.default-command-runs-when-idle --> The drive
sticks work this way: hold a button that turns the robot, and when the turn ends the sticks
are back in charge, with no code to hand them back. <!-- claim: commandsv3.default-command-resumes -->

Nothing installs a default command for you. <!-- claim: commandsv3.mechanism-no-default-command -->
The flywheel sets one in its constructor, so it idles in every opmode:

<!-- source: lesson-33 subsystems/Flywheel.java -->
*Example, from `Flywheel.java`:*
```java
public Flywheel() {
  Scheduler.getDefault().addPeriodic(this::periodic);
  // ...
  setDefaultCommand(idle());
}
```

`idle()` is a built-in, do-nothing command that every mechanism has; the flywheel
overrides it to spin at its idle speed instead. <!-- claim: commandsv3.mechanism-idle-overridable -->

## 5. Putting commands together

Several commands can make one bigger one:

- **`Command.sequence(a, b, c)`** runs them one after another.
- **`Command.parallel(a, b)`** runs them at the same time and finishes when all of them
  have. <!-- claim: commandsv3.parallel-race-optional -->
- **`Command.race(a, b)`** runs them at the same time and finishes when any one does,
  cancelling the rest. <!-- claim: commandsv3.parallel-race-optional -->

[Figure 9.2](../../lessons/v3/09-autonomous.md#figure-9-2) draws when each kind ends.

Two rules come with them. **Commands running in parallel can't share a mechanism**: the
group refuses to be built, with an `IllegalArgumentException`, the moment you try. <!-- claim: commandsv3.parallel-shared-requirements-throws -->
So the arm and the elevator can move together, but two arm commands have to take turns:

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java`:*
```java
/** Both steps require Arm — the same Mechanism — so this has to be a sequence, not a parallel. */
public Command intakeMotion() {
  return Command.sequence(
          m_arm.goToAngle(ArmConstants.kIntake),
          m_arm.runRoller(ArmConstants.kIntakeSpeed))
      .named("Intake Motion");
}

public Command handoffMotion() {
  return Command.parallel(
          m_arm.goToAngle(ArmConstants.kStowed),
          m_elevator.goToHeight(ElevatorConstants.kScoreMid))
      .named("Handoff Motion");
}
```

And **a group holds every mechanism any of its commands needs, for as long as the group
runs.** A sequence that starts by homing the elevator keeps the elevator until its last
step ends, so anything else that wants the elevator in the meantime cancels the whole
group. <!-- claim: commandsv3.sequence-requires-union --> When the steps use different
mechanisms, a coroutine that awaits each step in turn holds only what the current step
needs ([Figure 25.1](../../lessons/v3/25-path-events.md#figure-25-1)). The
[Lambdas and coroutines](../java/04-lambdas-coroutines.md#5-waiting-for-something) page
shows that version.

<details class="quiz" id="q-commands-3" markdown="1">
<summary>Check yourself: why is `intakeMotion` a sequence and not a parallel group?</summary>

- [ ] A parallel group would be too fast for the arm. *Speed has nothing to do with it.*
- [x] Both steps require the arm, and commands in parallel can't share a mechanism. *Building that parallel group throws an exception straight away.*
- [ ] Parallel groups can only hold two commands. *They can hold as many as you like, as long as no two share a mechanism.*

</details>

## 6. Triggers: when a command starts and stops

A **trigger** is a condition the scheduler checks every tick, with commands bound to it.
A controller button is one, but so is any `true`/`false` you can write as a lambda. The two
bindings the course leans on:

- **`onTrue(command)`** starts the command once, on the tick the trigger becomes true. Letting
  go doesn't stop it: the command runs until it finishes or something else cancels
  it. <!-- claim: commandsv3.ontrue-starts-not-stops -->
- **`whileTrue(command)`** starts it when the trigger becomes true and cancels it when the
  trigger becomes false. <!-- claim: commandsv3.whiletrue-schedules-and-cancels -->

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java`:*
```java
// Back homes the elevator: the encoder can't know where the carriage is
// at power-on, so drive down to the switch and let it say.
robot.driverController.back().onTrue(robot.elevator.home());

// A Trigger is any boolean the scheduler polls — it does not have to be
// a button. Whenever the switch trips, take its word for the height.
new Trigger(robot.elevator::atBottomLimit).onTrue(robot.elevator.rezeroAtBottom());
```

Back is a tap: homing carries on after you let go, so it's `onTrue`. Aiming is a hold, so
the left trigger uses `whileTrue`, and the robot gives rotation back the moment you
release it. The second binding is a trigger built from a method reference, so it fires
when a limit switch closes, with no button involved. <!-- claim: commandsv3.trigger-from-supplier-runs-disabled -->

Triggers combine. `.and(...)` makes a trigger that's true only while both parts are, and
`.debounce(time)` makes one that only turns true once its condition has held for that
long. <!-- claim: commandsv3.trigger-combinators --> Lesson 22 debounces the beam break, so a
game piece tumbling past the sensor can't set off a capture:

<!-- source: lesson-22 opmode/RobotTeleop.java -->
*Example, from Lesson 22's `RobotTeleop.java`:*
```java
new Trigger(robot.arm::hasGamePiece)
    .debounce(ArmConstants.kBeamDebounce)
    .onTrue(Command.parallel(
            robot.arm.goToAngle(ArmConstants.kStowed),
            robot.elevator.goToHeight(ElevatorConstants.kScoreMid))
        .named("Capture"));
```

<details class="quiz" id="q-commands-4" markdown="1">
<summary>Check yourself: a command is bound with `onTrue` to a button. The driver taps the button and lets go at once. What happens to the command?</summary>

- [ ] It's cancelled when the button is released. *That's `whileTrue`.*
- [x] It keeps running until it finishes or something cancels it. *`onTrue` only starts the command; releasing the button doesn't touch it.*
- [ ] It runs only for the ticks the button was held. *`onTrue` doesn't watch for the release at all.*

</details>

## 7. Where bindings live, and what disabling does

**A binding made while an opmode is being built belongs to that opmode**, and goes away
when another opmode is picked. <!-- claim: commandsv3.opmode-bindings-dropped --> That's
right for the driver's buttons, which mean different things in different opmodes. A
binding made in `Robot`'s constructor belongs to the whole program and keeps working in
every opmode. <!-- claim: wpilib.opmode-id-zero-in-robot-constructor --> The rule the course
follows: bind a driver's control in its opmode, and what the robot itself means in `Robot`.

**Disabling cancels every command that moves a mechanism**, and no default command
starts while disabled; default commands come back on enable. <!-- claim: commandsv3.disable-cancels-mechanism-commands -->
That has a catch for `whileTrue`. It only starts its command when its trigger *becomes*
true, so a trigger that stayed true through a disable never starts it again. <!-- claim: commandsv3.whiletrue-edge-and-enable -->
The superstructure's motion is bound in `Robot`, with "and enabled" added, so that enabling
the robot is itself the moment the trigger becomes true:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java`'s constructor:*
```java
superstructure.inState(SuperstructureState.INTAKING)
    .and(RobotState::isEnabled)
    .whileTrue(superstructure.intakeMotion());
```

## Common mistakes

- **Cleaning up only in `whenCanceled`** on a command that can finish by itself: when it
  finishes, the motor keeps going. Use `whenExited` unless the cleanup only makes sense
  after an interruption ([section 3](#3-how-a-command-ends-and-cleaning-up)).
- **Forgetting that `until(...)` cancels.** A `whenCanceled` hook runs when the `until`
  condition comes true, which is useful (as in `home()`) once you expect it.
- **Two commands for one mechanism in a parallel group.** It throws as soon as it's
  built. Use a sequence, or one command that does both.
- **A `Command.sequence` that holds a mechanism something else needs.** The group holds
  every step's mechanisms until the end, and can be cancelled by its own robot. Await the
  steps from a coroutine instead.
- **`onTrue` where you meant `whileTrue`**, or the other way round. Ask what should happen
  when the driver lets go.
- **A plain `whileTrue` on a state that can last through a disable.** Add
  `.and(RobotState::isEnabled)` so enabling restarts it.

## Quick reference

| You write | What it does |
|---|---|
| `implements Mechanism` | makes the class a mechanism the scheduler knows about |
| `run(...)`, `runRepeatedly(...)` | build a command that requires this mechanism |
| `Command.noRequirements(...)` | build a command that requires nothing |
| `.until(condition)` | end the command (by cancelling it) once `condition` is true |
| `.whenExited(...)` | clean up however the command ends |
| `.whenCanceled(...)` | clean up only if it didn't finish by itself |
| `.named("...")` | turn the builder into a `Command`, with the name the logs show |
| `setDefaultCommand(command)` | what the mechanism does whenever it's free |
| `Command.sequence(...)` | one after another, holding every step's mechanisms throughout |
| `Command.parallel(...)` | all at once, done when all are done; no shared mechanisms |
| `Command.race(...)` | all at once, done when the first is done |
| `trigger.onTrue(command)` | start on the press; letting go does nothing |
| `trigger.whileTrue(command)` | run while it's true; cancel when it turns false |
| `new Trigger(supplier)` | a trigger from any `true`/`false` |
| `.and(...)`, `.debounce(time)` | combine conditions; wait for one to hold |
