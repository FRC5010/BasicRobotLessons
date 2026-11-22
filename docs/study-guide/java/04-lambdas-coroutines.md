# Lambdas and coroutines

A lambda is a piece of code you can hand around like a number, and a coroutine is a lambda
the robot can pause and pick up again on the next tick.

**Where this comes from:** you first wrote a lambda in
[Lesson 1](../../lessons/v3/01-first-motor.md) without it being named, and
[Lesson 2](../../lessons/v3/02-joystick-control.md) names it. Coroutines that finish by
themselves arrive in [Lesson 6](../../lessons/v3/06-distance-and-commands.md), loops with
`yield` in [Lesson 8](../../lessons/v3/08-gyro-heading.md), and `await` in
[Lesson 9](../../lessons/v3/09-autonomous.md). Method references show up all over from
Lesson 13 on.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. You don't need to have
got that far: each example says what it leans on.

## 1. Code as a value

Most values you pass around in Java are data: `0.4`, `true`, a `TalonFX` object. A
**lambda** is a value too, but what it holds is *code*. You write it with an arrow:
the parameters on the left, what to do on the right. `() -> doSomething()` reads as "a
method with no parameters that runs `doSomething()`, whenever someone calls it."

That last part is the whole point. **Writing a lambda doesn't run it.** It just packs
the code up so somebody else can run it later, once or every tick.

Here's the robot's default drive command. The drivetrain doesn't want *a* speed, because
a number would be frozen at whatever the stick read when the line ran. It wants *a way to
find out the speed*, so it can ask again every tick:

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java`:*
```java
robot.drivetrain.setDefaultCommand(
    robot.drivetrain.driveFieldRelative(
        () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),  // forward = away from you
        () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),  // left    = your left
        () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX()),
        this::headingFromDriver));
```

Each of the first three arguments is a lambda that reads one stick and scales it. On the
other side, `driveFieldRelative` calls them every time it runs:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java`:*
```java
public Command driveFieldRelative(
    Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega,
    Supplier<Rotation2d> heading) {
  return runRepeatedly(() -> {
    ChassisVelocities fieldSpeeds = new ChassisVelocities(vx.get(), vy.get(), omega.get());
    applyChassisSpeeds(fieldSpeeds.toRobotRelative(heading.get()));
  }).named("Drive Field Relative");
}
```

Every lambda has a type, like every value in Java. `Supplier<LinearVelocity>` is "code
that takes nothing and hands back a `LinearVelocity`", and `.get()` is how you run it.
Lesson 2 met the same idea as `DoubleSupplier` (its `.getAsDouble()` hands back a plain
`double`).

**Two shapes of lambda body.** When the body is one expression, you write just that
expression, and its value is what the lambda returns, as in the stick readers above. When
it needs several statements, wrap them in braces like a method body, as
`runRepeatedly(() -> { ... })` does here.

<details class="quiz" id="q-lambdas-1" markdown="1">
<summary>Check yourself: when does the code inside `() -> robot.driverController.getLeftY()` run?</summary>

- [ ] Once, on the line where the lambda is written. *Writing a lambda only packs the code up; nothing runs yet.*
- [x] Each time whoever holds it calls it, such as a drive command once every tick. *That's why the robot sees the stick's newest position, not the one from when the command was built.*
- [ ] Only when the stick moves. *Nothing watches the stick; the lambda is simply asked, and it reads whatever the stick says right then.*

</details>

## 2. Method references: a lambda that just calls a method

Very often all a lambda does is call one method. Java has a shorter way to write that:
`object::method`, a **method reference**. It's the method itself, handed over to be called
later, with nothing extra around it. `this::headingFromDriver` in the first example is
one: it stands for `() -> headingFromDriver()`.

A method reference can stand for a value to fetch, as there, or for an action to run.
These two hand the scheduler and a path follower a method to *call*:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java`, in its constructor:*
```java
Scheduler.getDefault().addPeriodic(this::periodic);
```

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java`:*
```java
return new FollowPath.Builder(
    DriveType.SWERVE,                  // what kind of drivetrain this is
    drivetrain,                        // the mechanism the command will require
    localizer::getPose,                // where we are (fused, Lesson 14)
    localizer::resetPose,              // how to tell the estimate where we are
    drivetrain::getChassisVelocities,  // how fast we're going, robot-relative
    drivetrain::driveRobotRelative,    // how to make the robot move
    // ...
```

`localizer::getPose` is "ask the localizer where we are, whenever you need to know", and
`localizer::resetPose` is "here's how to tell it". The path follower doesn't know or care
what a `Localizer` is. It only needs those abilities, and method references hand them
over one at a time.

**The trap: the part before `::` runs right away.** In `localizer::getPose`, `localizer` is
just a field, so nothing happens when the reference is made. But in
`robot.localizer.getPose()::getRotation`, the part before `::` is a *call*. Java works it out
once, when the reference is made, and keeps the `Pose2d` it got back. So that method
reference keeps returning the heading from the moment it was built, forever. When you
want something fresh every tick, write the lambda out in full,
`() -> robot.localizer.getPose().getRotation()`, or point at a method of your own that
does it, as `this::headingFromDriver` does. (Lesson 17's Try It #8 warns about exactly
this.)

<details class="quiz" id="q-lambdas-2" markdown="1">
<summary>Check yourself: a command is handed `robot.localizer.getPose()::getRotation` as its heading supplier. What does it get each tick?</summary>

- [ ] The robot's heading right now. *That's what `() -> robot.localizer.getPose().getRotation()` would give. Here `getPose()` already ran.*
- [x] The heading from the moment the reference was made, every time. *`getPose()` ran once, when the reference was built, and the reference keeps that one pose.*
- [ ] It doesn't compile. *It compiles: `getRotation` is a method of the `Pose2d` that `getPose()` returned.*

</details>

## 3. What a lambda remembers

A lambda can use the variables around it: fields, the method's parameters, and its local
variables. Using a local this way is called **capturing** it. Java only lets a lambda
capture a local that never changes after it's set (an *effectively final* one), so what
the lambda sees is always the value the variable had when the lambda was made.

The course uses that on purpose to do work once instead of every tick:

<!-- source: lesson-33 subsystems/Flywheel.java -->
*Example, from `Flywheel.java`:*
```java
public Command holdVoltage(Voltage volts) {
  double raw = volts.in(Volts);
  return runRepeatedly(() -> m_io.setVoltage(raw)).named("Hold Voltage");
}
```

The unit conversion happens once, when the command is built. The lambda captures `raw`
and sends it every tick without converting it again.

Fields are different: a lambda reads a field fresh each time it runs, because it captures
the object (`this`), not the field's value. That's how `turnToHeading` below sees a new
heading error on every pass.

## 4. Coroutines: a body you can pause

Commands V3 builds commands out of lambdas too, but with one extra ability. The lambda
gets a parameter, by convention called `coroutine`, and through it the code can **pause
itself until the next tick** and carry on from that exact spot. A lambda you can pause and
resume like that is a **coroutine**.

Here's the thing to unlearn. A `while` loop normally means "go round as fast as you can
until you're done". Inside a coroutine, with a `coroutine.yield()` at the bottom, it
means "do one pass per tick until you're done":

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java`:*
```java
public Command turnToHeading(double targetDegrees) {
  return run(coroutine -> {
        while (Math.abs(headingError(targetDegrees)) >= 2.0) {
          double omega = clamp(
              HeadingConstants.kP * headingError(targetDegrees),
              -0.5, 0.5); // clamp to ±50% turn power
          commandRotation(omega);
          coroutine.yield();
        }
      })
      .whenExited(() -> commandRotation(0.0)) // however it ends — stop
      .named("Turn To Heading");
}
```

`coroutine.yield()` suspends the command until the next tick. <!-- claim: commandsv3.coroutine-await-yield-wait -->
The rest of the robot gets its turn, and 20 ms later the loop checks the heading again. <!-- claim: wpilib.opmode-periodic-20ms -->
The whole job reads top to bottom the way you'd say it: "while I'm more than 2° off, steer
a bit, then wait a tick."

## 5. Waiting for something

Writing the loop yourself is right when every pass has work to do. When there's nothing
to do but wait, the coroutine has calls for that:

- **`coroutine.waitUntil(condition)`** checks the condition every tick and carries on once
  it's true. The condition is itself a lambda that answers true or false. <!-- claim: commandsv3.coroutine-await-yield-wait -->
- **`coroutine.await(command)`** starts another command and waits until it finishes, then
  carries on. <!-- claim: commandsv3.coroutine-await-yield-wait -->

Put together, a plan reads like a script:

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java`:*
```java
public static Command getReadyThen(Elevator elevator, Superstructure superstructure, Command auto) {
  return Command.noRequirements(coroutine -> {
        coroutine.await(elevator.home()); // done at once if it's already on the switch
        coroutine.waitUntil(superstructure::isSettled); // IDLE stows everything first
        coroutine.await(auto);
      })
      .named("Get Ready, Then " + auto.name());
}
```

Home the elevator and wait for that; wait until the superstructure has settled; then run
the auto and wait for it. Notice `superstructure::isSettled`: a method reference used as
a condition, asked once per tick.

Two waits in a row are fine too, and sometimes they're needed. This one waits for the path
to report a real distance before trusting it, because the distance reads 0.0 until the path
has run once: <!-- claim: bline.remaining-distance-zero-before-run -->

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java`:*
```java
coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters() > 0);
// ...then for the answer you actually want.
coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
    < PathConstants.kScoreDistance.in(Meters));
coroutine.await(superstructure.requestScore());
```

<details class="quiz" id="q-lambdas-3" markdown="1">
<summary>Check yourself: what does `coroutine.await(elevator.home())` do?</summary>

- [ ] Starts homing and carries straight on to the next line. *That would start everything at once. `await` waits.*
- [x] Starts homing, and the next line runs only once homing has finished. *It starts the command and suspends the coroutine until that command is done.*
- [ ] Checks whether the elevator is homed, every tick, without starting anything. *That's `waitUntil` with a condition, which starts nothing.*

</details>

## 6. How a coroutine ends

A coroutine body is ordinary code, so it ends the ordinary way: **when it runs out of
code, the command is finished.** <!-- claim: commandsv3.coroutine-command-api --> In
`turnToHeading` that's when the loop exits. In `getReadyThen` it's after the last
`await`. A `return` ends it early, as in the superstructure's requests, which simply stop
when the move isn't allowed:

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java`:*
```java
private Command request(SuperstructureState next) {
  return Command.noRequirements(coroutine -> {
        if (!allow(next)) {
          return;
        }
        m_state = next;
      })
      .named("Request " + next.name());
}
```

A body with no wait in it at all, like that one, runs once and finishes on the same
tick. <!-- claim: commandsv3.noyield-command-finishes-same-tick -->

Some commands should never end by themselves, though: "spin while I hold the button".
Two ways to write that:

- **`coroutine.park()`** suspends the body for good, until something cancels the
  command. <!-- claim: commandsv3.coroutine-command-api --> That's how Lesson 1's first
  command stays on:

  <!-- source: lesson-1 subsystems/DriveModule.java -->
  *Example, from Lesson 1's `DriveModule.java`:*
  ```java
  public Command driveAtSpeed(double fraction) {
    return run(coroutine -> {
      m_driveMotor.setThrottle(fraction);
      coroutine.park();
    })
        .whenCanceled(() -> m_driveMotor.setThrottle(0))
        .named("Drive At Speed");
  }
  ```

- **`runRepeatedly(() -> ...)`** takes a plain lambda, not a coroutine, and runs it once
  every tick, forever, until the command is cancelled. `driveFieldRelative` and
  `holdVoltage` above are built this way. <!-- claim: commandsv3.coroutine-command-api -->

What happens *after* a command ends, the cleanup with `whenExited` and `whenCanceled`, is
on the [Commands and triggers](../frc-framework/03-commands-triggers.md) page.

<details class="quiz" id="q-lambdas-4" markdown="1">
<summary>Check yourself: which of these commands finishes by itself?</summary>

- [ ] `runRepeatedly(() -> m_io.setVoltage(raw))`. *`runRepeatedly` runs its lambda every tick until something cancels the command.*
- [ ] A coroutine that sets the throttle, then calls `coroutine.park()`. *`park()` suspends it until something cancels it.*
- [x] A coroutine whose `while` loop exits once the heading is within 2°. *When the loop exits the body has run out of code, and that finishes the command.*

</details>

## Common mistakes

- **Expecting a lambda to have run already.** Writing one runs nothing. If a value is
  wrong, ask *when* the lambda is called, not when it was written.
- **A call before `::`.** `something.get()::method` runs `get()` once and keeps the
  answer ([section 2](#2-method-references-a-lambda-that-just-calls-a-method)). Write the
  lambda out when you want a fresh value.
- **A loop in a coroutine without `coroutine.yield()`.** A coroutine keeps the robot's
  attention until it pauses, so a loop with no `yield` runs all its passes inside one tick,
  and nothing else (not even the code that reads the sensors) gets a turn in between. <!-- claim: commandsv3.loop-without-yield-one-tick -->
  A loop waiting on a sensor would then wait on a reading that can't change. Every per-tick
  loop in the course ends with `coroutine.yield()`.
- **Changing a local after a lambda captures it.** Java refuses to compile it: a lambda
  can only capture a local that's effectively final.
- **Reaching for `Command.sequence` to run steps in order.** It works, but it holds every
  step's mechanisms until the last step ends. A coroutine that awaits each step holds only
  what the current step needs. <!-- claim: commandsv3.sequence-requires-union --> Lesson 25
  shows how that cost a whole auto ([Figure 25.1](../../lessons/v3/25-path-events.md#figure-25-1)).

## Quick reference

| You write | It means |
|---|---|
| `() -> expression` | code that takes nothing and returns the expression's value when called |
| `() -> { statements; }` | the same, with several statements |
| `object::method` | the method, handed over to be called later |
| `supplier.get()` | run a `Supplier`'s code now and take its answer |
| `run(coroutine -> { ... })` | a command whose body can pause; it requires this mechanism |
| `Command.noRequirements(coroutine -> { ... })` | the same, requiring no mechanism |
| `coroutine.yield()` | pause until the next tick |
| `coroutine.waitUntil(condition)` | pause, checking `condition` every tick, until it's true |
| `coroutine.await(command)` | start `command` and pause until it finishes |
| `coroutine.park()` | pause until something cancels this command |
| `runRepeatedly(() -> ...)` | run a plain lambda every tick until cancelled |
