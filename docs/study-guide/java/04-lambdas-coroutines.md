# Lambdas and coroutines

A lambda is a piece of code you can hand around like a number, and a coroutine is a lambda
the robot can pause and pick up again on the next tick.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. Each one
links to the lesson section where you write it. You don't need to have got that far: each
example says what it leans on.

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
*Example, from `RobotTeleop.java` ([Lesson 17, section 11](../../lessons/v3/17-bline-autos.md#11-drive-from-either-end)):*
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
*Example, from `Drivetrain.java` ([Lesson 10, section 7](../../lessons/v3/10-kinematics.md#7-field-relative-driving-the-swerve-superpower); the `heading` argument arrives in [Lesson 17, section 11](../../lessons/v3/17-bline-autos.md#11-drive-from-either-end)):*
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
[Lesson 2](../../lessons/v3/02-joystick-control.md#2-lambdas-and-suppliers) met the same
idea as `DoubleSupplier`, whose `.getAsDouble()` hands back a plain `double`.

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

<details class="quiz" id="q-lambdas-2" markdown="1">
<summary>Check yourself: `vx` is a `Supplier` of a speed. How does `driveFieldRelative` get a speed out of it?</summary>

- [ ] It reads `vx` like a number, because it already holds one. *`vx` holds code, not a speed. Nothing has been worked out until something runs it.*
- [x] It calls `vx.get()`, which runs the lambda and hands back its answer. *`.get()` is how you run a `Supplier`, and it runs again on every call.*
- [ ] It calls `vx.run()`. *`run()` belongs to `Runnable`, the type for code that hands back nothing.*

</details>

## 2. Method references: a lambda that just calls a method

Very often all a lambda does is call one method. Java has a shorter way to write that:
`object::method`, a **method reference**. It's the method itself, handed over to be called
later, with nothing extra around it. `this::headingFromDriver` in the first example is
one: it stands for `() -> headingFromDriver()`.

A method reference can stand for a value to fetch, as there, or for an action to run.
This one hands the scheduler a method to *call*, once every tick:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java`'s constructor ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
Scheduler.getDefault().addPeriodic(this::periodic);
```

And these hand a path follower everything it needs to know about the robot, one ability at
a time:

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java` ([Lesson 17, section 6](../../lessons/v3/17-bline-autos.md#6-meet-followpathbuilder)):*
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
over.

<details class="quiz" id="q-lambdas-3" markdown="1">
<summary>Check yourself: which lambda means the same as `localizer::getPose`?</summary>

- [ ] `localizer.getPose()` *That's a call: it runs now and gives back one `Pose2d`, not code to run later.*
- [x] `() -> localizer.getPose()` *A method reference to a method with no parameters is exactly this lambda, written shorter.*
- [ ] `pose -> localizer.getPose()` *That lambda takes a parameter it never uses; `getPose` takes none.*

</details>

<details class="quiz" id="q-lambdas-4" markdown="1">
<summary>Check yourself: what does `addPeriodic(this::periodic)` hand the scheduler?</summary>

- [ ] The result of running `periodic()` once. *Nothing runs on that line; there are no parentheses after `periodic`.*
- [x] The `periodic` method itself, which the scheduler then calls once every tick. *A method reference hands the method over to be called later, as often as the scheduler likes.*
- [ ] A copy of the elevator. *`this` names the elevator, but `::periodic` picks out just its method.*

</details>

## 3. Lambdas with parameters

So far every lambda has had empty parentheses: it takes nothing. A lambda can take
parameters too, written before the arrow. Whoever calls it passes them in, the same way
you pass arguments to a method.

The course's path autos use one. Each auto is built from a *recipe*: give it a path, and
it hands back the command that drives it:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java`'s constructor ([Lesson 25, section 2](../../lessons/v3/25-path-events.md#2-one-class-every-path-auto)):*
```java
addOpMode(RobotMode.AUTONOMOUS, "Two Corners", "Paths",
    () -> new PathAuto(this, "TwoCorners", path -> Autos.followPath(pathBuilder, path)));
```

Two lambdas sit in that line. The outer one, `() -> new PathAuto(...)`, takes nothing: it's
how the opmode gets built when you pick it. The inner one, `path -> ...`, takes one
parameter. The lambda doesn't choose its `path`; `PathAuto` does, when it calls the recipe
with the path it just read from the file:

<!-- source: lesson-33 opmode/PathAuto.java -->
*Example, from `PathAuto.java` ([Lesson 25, section 2](../../lessons/v3/25-path-events.md#2-one-class-every-path-auto)):*
```java
public PathAuto(Robot robot, String pathName, Function<Path, Command> recipe) {
  // Read the path file now, while the robot is still disabled.
  Path path = new Path(pathName);
  // ...
  RobotModeTriggers.autonomous().onTrue(
      Autos.getReadyThen(robot.elevator, robot.superstructure, recipe.apply(path)));
}
```

`Function<Path, Command>` is the type for "code that takes a `Path` and hands back a
`Command`", and `.apply(path)` runs it. A lambda that takes something and hands nothing
back is a `Consumer`. The flywheel's characterization routine is handed two: one for
*how to drive the motor at a given voltage*, one for *how to write down a reading*:

<!-- source: lesson-33 subsystems/Flywheel.java -->
*Example, from `Flywheel.java` ([Lesson 33, section 5](../../lessons/v3/33-tuning-with-sysid.md#5-wire-the-flywheel-up-to-it)):*
```java
private final SysIdRoutine m_sysId = new SysIdRoutine(
    SysIdRoutine.Config.defaults(),
    new SysIdRoutine.SysIdMechanism(
        volts -> m_io.setVoltage(volts.in(Volts)),
        log -> log.motor("flywheel")
            .voltage(Volts.of(m_inputs.appliedVolts))
            .angularVelocity(RotationsPerSecond.of(m_inputs.velocityRps)),
        this, "flywheel"));
```

**A coroutine is one of these.** Every command body you write with `run(coroutine -> ...)`
is a lambda with one parameter. `run` takes a `Consumer<Coroutine>`: code that's handed a
`Coroutine` object and gives nothing back. <!-- claim: commandsv3.coroutine-body-is-a-consumer -->
The scheduler is what calls it, and the `Coroutine` it passes in is the body's handle on
the scheduler: the thing you ask to pause, to wait, or to start another command. The name
`coroutine` is just the parameter's name, like `path` and `volts` above. `runRepeatedly`,
by contrast, takes a plain `Runnable`, a lambda with no parameter at all, so there's
nothing to pause with. <!-- claim: commandsv3.coroutine-body-is-a-consumer -->

<details class="quiz" id="q-lambdas-5" markdown="1">
<summary>Check yourself: in `path -> Autos.followPath(pathBuilder, path)`, where does `path` come from?</summary>

- [ ] The lambda finds the path file itself. *A lambda only gets what it's handed; it doesn't go looking.*
- [x] Whoever calls the lambda passes it in; here `PathAuto` calls `recipe.apply(path)`. *A parameter is filled in by the caller, the same as a method's.*
- [ ] It's a field of `Robot`. *It's the lambda's own parameter, named before the arrow.*

</details>

<details class="quiz" id="q-lambdas-6" markdown="1">
<summary>Check yourself: in `run(coroutine -> { ... })`, what is `coroutine`?</summary>

- [ ] A keyword Java reserves for commands. *It's an ordinary parameter name; you could call it anything.*
- [x] The lambda's parameter: a `Coroutine` object the scheduler passes in when it runs the body. *`run` takes a `Consumer<Coroutine>`, so the body is a lambda with one parameter.*
- [ ] The command being built. *The command is what `run(...)` returns. `coroutine` is what the body gets handed while it runs.*

</details>

## 4. Pausing until the next tick

Here's what the `Coroutine` parameter is for. Through it, the code can **pause itself until
the next tick** and carry on from that exact spot. That's what makes the lambda a
**coroutine**.

Here's the thing to unlearn. A `while` loop normally means "go round as fast as you can
until you're done". Inside a coroutine, with a `coroutine.yield()` at the bottom, it
means "do one pass per tick until you're done":

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 8, section 3](../../lessons/v3/08-gyro-heading.md#3-turn-to-a-heading--the-same-p-control-again)):*
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
a bit, then wait a tick." Figure 8.1 shows one run of it: each step in the lower graph is
one pass of the loop, one tick apart.

![Two stacked graphs of turnToHeading(90). Top: the heading rises in a straight line, then curves in and levels off at 88.2 degrees, inside the grey 2 degree band around the 90 degree target; the loop exits at 0.70 seconds. Bottom: the commanded omega is flat at the 0.5 limit until about 0.38 seconds, then falls in steps towards zero and drops to zero when the loop exits](../../lessons/v3/images/08-turn-to-heading.png)

*Figure 8.1, from [Lesson 8](../../lessons/v3/08-gyro-heading.md#figure-8-1) — `turnToHeading(90)`: the heading, the `omega` the command sends, and where the loop stops.* <!-- claim: l08.turn-exit-time, l08.turn-exit-heading, l08.clamp-release-time -->

**Leave the `yield` out and the loop doesn't wait at all.** A coroutine keeps the robot's
attention until it pauses, so a loop with no `yield` runs all its passes inside one tick,
and nothing else (not even the code that reads the sensors) gets a turn in between. <!-- claim: commandsv3.loop-without-yield-one-tick -->
A loop waiting on a sensor would then wait on a reading that can't change.

<details class="quiz" id="q-lambdas-7" markdown="1">
<summary>Check yourself: what does `coroutine.yield()` do?</summary>

- [ ] Ends the command. *The command carries on; it just pauses first.*
- [x] Pauses the command until the next tick, then carries on from the same line. *The loop goes round once per tick, and the rest of the robot runs in between.*
- [ ] Gives the mechanism to another command. *Nothing else takes the mechanism; this command still owns it while it's paused.*

</details>

<details class="quiz" id="q-lambdas-8" markdown="1">
<summary>Check yourself: a coroutine's `while` loop waits for the heading to reach 90°, but someone left out `coroutine.yield()`. What happens?</summary>

- [ ] The loop runs once per tick anyway; `yield` only makes it tidier. *Without `yield` the coroutine never pauses, so it never waits for a tick.*
- [x] Every pass runs inside one tick, and the heading it checks never changes, because the code that reads the gyro doesn't get a turn. *A coroutine keeps the scheduler until it pauses.*
- [ ] Java refuses to compile it. *It compiles fine; it just doesn't do what you meant.*

</details>

## 5. Waiting for something

Writing the loop yourself is right when every pass has work to do. When there's nothing
to do but wait, the `Coroutine` has calls for that:

- **`coroutine.waitUntil(condition)`** checks the condition every tick and carries on once
  it's true. The condition is itself a lambda that answers true or false. <!-- claim: commandsv3.coroutine-await-yield-wait -->
- **`coroutine.await(command)`** starts another command and waits until it finishes, then
  carries on. <!-- claim: commandsv3.coroutine-await-yield-wait -->

Put together, a plan reads like a script:

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java` ([Lesson 25, section 3](../../lessons/v3/25-path-events.md#3-get-ready-before-you-move)):*
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

Why not just list the three steps in a `Command.sequence`? Because a sequence holds every
step's mechanisms until its last step ends, and a coroutine that awaits each step holds
only what the current step needs. <!-- claim: commandsv3.sequence-requires-union -->
Figure 25.1 shows what that cost Lesson 25: the sequence kept the elevator, the
superstructure took it back, and the whole auto was cancelled before it moved.

![Two timelines. With Command.sequence, one block holds the elevator from the start, so when home() finishes and the state turns IDLE the IDLE motion cancels the whole sequence and the auto never runs. With the coroutine, home() holds the elevator only while it runs, the IDLE motion then takes it, and the wait and the auto carry on](../../lessons/v3/images/25-sequence-vs-coroutine.svg)

*Figure 25.1, from [Lesson 25](../../lessons/v3/25-path-events.md#figure-25-1) — Who holds the elevator, and what happens when the state turns `IDLE`. Block widths are not to scale.* <!-- claim: commandsv3.sequence-requires-union -->

Two waits in a row are fine too, and sometimes they're needed. This one waits for the path
to report a real distance before trusting it, because the distance reads 0.0 until the path
has run once: <!-- claim: bline.remaining-distance-zero-before-run -->

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java` ([Lesson 25, section 6](../../lessons/v3/25-path-events.md#6-a-trigger-that-reads-the-path-not-the-clock)):*
```java
coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters() > 0);
// ...then for the answer you actually want.
coroutine.waitUntil(() -> follow.getRemainingPathDistanceMeters()
    < PathConstants.kScoreDistance.in(Meters));
coroutine.await(superstructure.requestScore());
```

<details class="quiz" id="q-lambdas-9" markdown="1">
<summary>Check yourself: what does `coroutine.await(elevator.home())` do?</summary>

- [ ] Starts homing and carries straight on to the next line. *That would start everything at once. `await` waits.*
- [x] Starts homing, and the next line runs only once homing has finished. *It starts the command and suspends the coroutine until that command is done.*
- [ ] Checks whether the elevator is homed, every tick, without starting anything. *That's `waitUntil` with a condition, which starts nothing.*

</details>

<details class="quiz" id="q-lambdas-10" markdown="1">
<summary>Check yourself: why does the scoring coroutine first wait for the distance left to be more than 0?</summary>

- [ ] To give the robot time to speed up. *The wait isn't about speed; it ends on the first real reading.*
- [x] Because the path reports 0.0 until it has run once, which looks exactly like "arrived". *Without the first wait, the second would pass at once and the score would be asked for on the first tick.*
- [ ] Because `waitUntil` needs two conditions to work. *One condition is enough; this one just guards against a misleading reading.*

</details>

## 6. How a coroutine ends

A coroutine body is ordinary code, so it ends the ordinary way: **when it runs out of
code, the command is finished.** <!-- claim: commandsv3.coroutine-command-api --> In
`turnToHeading` that's when the loop exits. In `getReadyThen` it's after the last
`await`. A `return` ends it early, as in the superstructure's requests, which simply stop
when the move isn't allowed:

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java` ([Lesson 24, section 5](../../lessons/v3/24-superstructure.md#5-requests-guarded-and-empty-handed-on-purpose)):*
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

A body with no pause in it at all, like that one, runs once and finishes on the same
tick. <!-- claim: commandsv3.noyield-command-finishes-same-tick -->

Some commands should never end by themselves, though: "spin while I hold the button".
Two ways to write that:

- **`coroutine.park()`** suspends the body for good, until something cancels the
  command. <!-- claim: commandsv3.coroutine-command-api --> That's how Lesson 1's first
  command stays on:

  <!-- source: lesson-1 subsystems/DriveModule.java -->
  *Example, from Lesson 1's `DriveModule.java` ([Lesson 1, section 3](../../lessons/v3/01-first-motor.md#3-build-the-drivemodule-mechanism)):*
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

- **`runRepeatedly(() -> ...)`** runs a plain lambda once every tick, forever, until the
  command is cancelled. `driveFieldRelative` in section 1 is built this way. <!-- claim: commandsv3.coroutine-command-api -->

What happens *after* a command ends, the cleanup with `whenExited` and `whenCanceled`, is
on the [Commands and triggers](../frc-framework/03-commands-triggers.md#3-how-a-command-ends-and-cleaning-up)
page.

<details class="quiz" id="q-lambdas-11" markdown="1">
<summary>Check yourself: which of these commands finishes by itself?</summary>

- [ ] `runRepeatedly(() -> m_io.setVoltage(raw))`. *`runRepeatedly` runs its lambda every tick until something cancels the command.*
- [ ] A coroutine that sets the throttle, then calls `coroutine.park()`. *`park()` suspends it until something cancels it.*
- [x] A coroutine whose `while` loop exits once the heading is within 2°. *When the loop exits the body has run out of code, and that finishes the command.*

</details>

<details class="quiz" id="q-lambdas-12" markdown="1">
<summary>Check yourself: a request's body reaches `return;` because the move isn't allowed. What happens to the command?</summary>

- [x] It finishes right there, without changing the state. *`return` ends the body, and a body that has ended is a finished command.*
- [ ] It waits a tick and tries again. *Nothing in the body loops or waits, so there's no second try.*
- [ ] It's cancelled, and its `whenCanceled` hook runs. *Ending by itself is finishing, not being cancelled.*

</details>

## 7. What a lambda remembers

A lambda can use the variables around it: fields, the method's parameters, and its local
variables. Using a local this way is called **capturing** it. Java only lets a lambda
capture a local that never changes after it's set (an *effectively final* one), so what
the lambda sees is always the value the variable had when the lambda was made.

The course uses that on purpose to do work once instead of every tick:

<!-- source: lesson-33 subsystems/Flywheel.java -->
*Example, from `Flywheel.java` ([Lesson 33, section 7](../../lessons/v3/33-tuning-with-sysid.md#7-is-it-real-one-quick-check-per-number)):*
```java
public Command holdVoltage(Voltage volts) {
  double raw = volts.in(Volts);
  return runRepeatedly(() -> m_io.setVoltage(raw)).named("Hold Voltage");
}
```

The unit conversion happens once, when the command is built. The lambda captures `raw`
and sends it every tick without converting it again.

Fields are different: a lambda reads a field fresh each time it runs, because it captures
the object (`this`), not the field's value. That's how `turnToHeading` sees a new heading
error on every pass, and how the SysId logger in section 3 writes down the newest reading
each time it's called.

<details class="quiz" id="q-lambdas-13" markdown="1">
<summary>Check yourself: in `holdVoltage`, when is `volts.in(Volts)` worked out?</summary>

- [x] Once, when `holdVoltage` builds the command. *The lambda captures the finished `raw` and only sends it.*
- [ ] Every tick, inside the lambda. *The conversion is on the line above the lambda, so it runs before the lambda exists.*
- [ ] Never; the motor converts it. *The motor is sent a plain `double`; the conversion happens in the code.*

</details>

<details class="quiz" id="q-lambdas-14" markdown="1">
<summary>Check yourself: after building the command, the code sets `raw = 0;`. What happens?</summary>

- [ ] The command starts sending 0 V. *A lambda can't see a later change to a local; Java doesn't allow one.*
- [x] It doesn't compile, because a lambda can only capture a local that never changes. *Java requires captured locals to be effectively final.*
- [ ] Nothing; the change is ignored. *Java won't build the file in the first place.*

</details>

## Common mistakes

- **Expecting a lambda to have run already.** Writing one runs nothing. If a value is
  wrong, ask *when* the lambda is called, not when it was written.
- **A call before `::`.** In `robot.localizer.getPose()::getRotation`, Java runs
  `getPose()` once, when the reference is made, and keeps that one pose. The reference
  then hands back the same heading forever. Write `() -> robot.localizer.getPose().getRotation()`
  when you want it fresh.
- **A loop in a coroutine without `coroutine.yield()`.** All its passes run in one tick,
  and nothing it waits on can change ([section 4](#4-pausing-until-the-next-tick)).
- **Changing a local after a lambda captures it.** Java refuses to compile it.
- **Reaching for `Command.sequence` to run steps in order.** It holds every step's
  mechanisms until the last step ends. A coroutine that awaits each step holds only what
  the current step needs ([section 5](#5-waiting-for-something)).

## Where this comes from

- **[Lesson 1](../../lessons/v3/01-first-motor.md):** your first lambda, in
  `.whenCanceled(...)`, and your first coroutine, with `park()`.
- **[Lesson 2](../../lessons/v3/02-joystick-control.md):** lambdas named, as code stored as
  data, and `DoubleSupplier`.
- **[Lesson 6](../../lessons/v3/06-distance-and-commands.md):** coroutines that finish by
  themselves, and `waitUntil`.
- **[Lesson 8](../../lessons/v3/08-gyro-heading.md):** a loop that runs once per tick, with
  `yield`.
- **[Lesson 9](../../lessons/v3/09-autonomous.md):** `await`, and plans written as coroutines.
- **[Lesson 17](../../lessons/v3/17-bline-autos.md):** method references as a path follower's
  abilities.
- **[Lesson 25](../../lessons/v3/25-path-events.md):** a lambda with a parameter (the path
  recipe), and why a coroutine beats `Command.sequence`.

## Quick reference

| You write | It means |
|---|---|
| `() -> expression` | code that takes nothing and returns the expression's value when called |
| `() -> { statements; }` | the same, with several statements |
| `x -> ...` | code that's handed one value, `x`, by whoever calls it |
| `object::method` | the method, handed over to be called later |
| `supplier.get()` | run a `Supplier`'s code now and take its answer |
| `function.apply(x)` | run a `Function`'s code on `x` and take its answer |
| `run(coroutine -> { ... })` | a command whose body is handed a `Coroutine`; it requires this mechanism |
| `Command.noRequirements(coroutine -> { ... })` | the same, requiring no mechanism |
| `coroutine.yield()` | pause until the next tick |
| `coroutine.waitUntil(condition)` | pause, checking `condition` every tick, until it's true |
| `coroutine.await(command)` | start `command` and pause until it finishes |
| `coroutine.park()` | pause until something cancels this command |
| `runRepeatedly(() -> ...)` | run a plain lambda every tick until cancelled |
