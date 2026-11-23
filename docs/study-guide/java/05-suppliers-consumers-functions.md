# Suppliers, consumers and functions

Java names a lambda by its shape: what it takes, and what it hands back. Learn five of those
names and you can read almost every method in the course that takes code as an argument.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. Each one
links to the lesson section where you write it. What a lambda *is*, and how method
references work, is on the [Lambdas and coroutines](04-lambdas-coroutines.md) page; this
page is about the types that hold them.

## 1. A lambda's type is its shape

A variable that holds a number has a type, `double`; a variable that holds a lambda has one
too. Java's types for lambdas are named after what the code takes in and hands back, and
the course uses five of them, all from `java.util.function` except `Runnable`, which is
older:

| Type | Takes | Hands back | You run it with |
|---|---|---|---|
| `Supplier<T>` | nothing | a `T` | `.get()` |
| `BooleanSupplier`, `DoubleSupplier` | nothing | a `boolean`, a `double` | `.getAsBoolean()`, `.getAsDouble()` |
| `Consumer<T>` | a `T` | nothing | `.accept(t)` |
| `Function<A, B>` | an `A` | a `B` | `.apply(a)` |
| `Runnable` | nothing | nothing | `.run()` |

The first one you met was a `DoubleSupplier`, the stick reader in Lesson 2. Its type says
everything the command needs to know: "here's code that gives you a number whenever you
ask":

<!-- source: lesson-2 subsystems/DriveModule.java -->
*Example, from Lesson 2's `DriveModule.java` ([Lesson 2, section 2](../../lessons/v3/02-joystick-control.md#2-lambdas-and-suppliers)):*
```java
public Command driveWithJoystick(DoubleSupplier speedSupplier) {
  return runRepeatedly(() -> {
    double raw = speedSupplier.getAsDouble();   // fetch fresh value this tick
    double speed = applyDeadband(raw, 0.1);     // clean it up (next section)
    m_driveMotor.setThrottle(speed);
  }).named("Drive With Joystick");
}
```

Any lambda or method reference whose shape fits can be passed where one of these is
wanted. That's why `() -> robot.driverController.getLeftY()` can be handed straight to
`driveWithJoystick`.

<details class="quiz" id="q-suppliers-1" markdown="1">
<summary>Check yourself: which type holds code that takes a `Path` and hands back a `Command`?</summary>

- [ ] `Supplier` *A supplier takes nothing.*
- [x] `Function` *A function takes one value and hands back another; here a `Path` in, a `Command` out.*
- [ ] `Consumer` *A consumer takes a value but hands nothing back.*

</details>

<details class="quiz" id="q-suppliers-2" markdown="1">
<summary>Check yourself: how does `driveWithJoystick` run the code it was handed?</summary>

- [ ] `speedSupplier.run()` *`run()` belongs to `Runnable`, which hands nothing back.*
- [ ] `speedSupplier.get()` *That's a `Supplier<T>`'s method; a `DoubleSupplier` uses its own name.*
- [x] `speedSupplier.getAsDouble()` *A `DoubleSupplier` hands back a plain `double`, through `getAsDouble()`.*

</details>

## 2. Suppliers: a value, fresh each time

A **supplier** is how a class asks for a value it will need over and over, and that will
keep changing. The LED strip shows the robot's state, so it needs the state every tick,
not once:

<!-- source: lesson-33 subsystems/Leds.java -->
*Example, from `Leds.java` ([Lesson 24, section 7](../../lessons/v3/24-superstructure.md#7-the-strip-forgets-everything)):*
```java
private final Supplier<SuperstructureState> m_state;

public Leds(Supplier<SuperstructureState> state) {
  m_state = state;
  // ...
}

private void periodic() {
  // The state says what the robot is doing. Being disabled says whether
  // anyone can act on it. Two questions, so two lines.
  LEDPattern pattern = m_state.get().pattern();
```

The constructor stores the supplier, not a state. Each `periodic()` calls `.get()` and
gets whatever the state is *now*. `Robot` hands it the superstructure's getter:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 24, section 8](../../lessons/v3/24-superstructure.md#8-wiring-requests-to-buttons-motion-to-state)):*
```java
public final Leds leds = new Leds(superstructure::getState); // reads it; drives nothing
```

Here's the wrong picture to drop. If `Leds` took a `SuperstructureState` instead, it would
get the state at the moment it was built, `UNHOMED`, and show it forever. **Take a value
when you need it once; take a supplier when you need it every time.**

<details class="quiz" id="q-suppliers-3" markdown="1">
<summary>Check yourself: when does the LED strip find out the robot's state?</summary>

- [ ] Once, when `new Leds(...)` builds it. *It stores the supplier then, not a state.*
- [x] Every tick, when `periodic()` calls `m_state.get()`. *Each call runs `superstructure::getState` and returns the state right now.*
- [ ] Whenever the superstructure tells it. *The superstructure never calls the LEDs; the LEDs ask.*

</details>

<details class="quiz" id="q-suppliers-4" markdown="1">
<summary>Check yourself: what would go wrong if `Leds` took a plain `SuperstructureState` instead of a supplier?</summary>

- [x] It would get the state at startup, `UNHOMED`, and never see it change. *A plain value is a copy of one moment; a supplier is a way to ask again.*
- [ ] Nothing; Java would update it automatically. *Nothing updates a value you've been handed.*
- [ ] It wouldn't compile. *It would compile fine, and be wrong.*

</details>

## 3. A supplier is a narrow door

A supplier also lets a class have exactly one ability and nothing more. The simulated arm
has to know where the robot really is on the field, to tell whether a game piece is in
front of its intake. It could be handed the whole drivetrain. It's handed one getter
instead:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 22, section 4](../../lessons/v3/22-light-sensors.md#4-a-simulator-that-can-actually-hold-something)):*
```java
public final Arm arm = new Arm(elevator, drivetrain::getSimulatedPose);
```

<!-- source: lesson-33 subsystems/Arm.java -->
*Example, from `Arm.java` ([Lesson 22, section 4](../../lessons/v3/22-light-sensors.md#4-a-simulator-that-can-actually-hold-something)):*
```java
public Arm(Elevator elevator, Supplier<Pose2d> simulatedRobotPose) {
  // ...
  m_io = switch (Constants.kCurrentMode) {
    case REAL -> new ArmIOTalonFX();
    case SIM -> new ArmIOSim(simulatedRobotPose);
    case REPLAY -> new ArmIO() {}; // inputs come from the log
  };
```

The arm can read the true pose and do nothing else: it can't drive the robot, and it
can't confuse the true pose with the estimate, because nobody gave it the estimate. The
LEDs above are the same: `superstructure::getState` lets them read the state, never change
it. **Hand a class the smallest thing that does its job.**

<details class="quiz" id="q-suppliers-5" markdown="1">
<summary>Check yourself: why is the arm handed `drivetrain::getSimulatedPose` rather than the whole drivetrain?</summary>

- [ ] A drivetrain can't be passed to a constructor. *It could; the course chooses not to.*
- [x] The arm needs one thing, the true pose, and the supplier gives it exactly that and nothing more. *It can't drive the robot or mix up the truth with the estimate.*
- [ ] So the arm can move the robot to a game piece. *A `Supplier<Pose2d>` can only be asked for a pose.*

</details>

<details class="quiz" id="q-suppliers-6" markdown="1">
<summary>Check yourself: the LEDs hold `superstructure::getState`. Can they change the robot's state?</summary>

- [ ] Yes: holding a method reference gives access to the whole object. *They hold one method, not the superstructure.*
- [x] No: a `Supplier` can only be asked for a value. *Reading the state is the one thing they can do with it.*
- [ ] Only while the robot is disabled. *Being disabled doesn't change what a supplier can do.*

</details>

## 4. `BooleanSupplier`: a condition

A **`BooleanSupplier`** is a yes/no question you can ask again and again. That's exactly
what a trigger is made of, and what `waitUntil` waits on: <!-- claim: commandsv3.trigger-from-supplier-runs-disabled, commandsv3.coroutine-command-api -->

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java` ([Lesson 21, section 7](../../lessons/v3/21-limit-sensors.md#7-wire-it-up)):*
```java
new Trigger(robot.elevator::atBottomLimit).onTrue(robot.elevator.rezeroAtBottom());
```

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java` ([Lesson 25, section 3](../../lessons/v3/25-path-events.md#3-get-ready-before-you-move)):*
```java
coroutine.waitUntil(superstructure::isSettled); // IDLE stows everything first
```

`atBottomLimit()` and `isSettled()` are ordinary methods that return a `boolean`, so a
method reference to either fits a `BooleanSupplier`. The trigger asks once per tick, and so
does `waitUntil`.

<details class="quiz" id="q-suppliers-7" markdown="1">
<summary>Check yourself: why can `robot.elevator::atBottomLimit` be passed to `new Trigger(...)`?</summary>

- [x] `atBottomLimit()` takes nothing and returns a `boolean`, which is the shape of a `BooleanSupplier`. *Any method with that shape fits.*
- [ ] Because the elevator is a `Mechanism`. *What fits is the method's shape, not the class it belongs to.*
- [ ] Because triggers only work with limit switches. *A trigger takes any `true`/`false` you can ask for.*

</details>

<details class="quiz" id="q-suppliers-8" markdown="1">
<summary>Check yourself: how often does `coroutine.waitUntil(superstructure::isSettled)` ask its question?</summary>

- [ ] Once; if it's false, the coroutine gives up. *It keeps asking until the answer is true.*
- [x] Once per tick, until the answer is true. *That's what makes it a wait rather than a check.*
- [ ] Only when the superstructure's state changes. *Nothing tells it about changes; it asks.*

</details>

## 5. Consumers: handing a value in

A **`Consumer<T>`** is the other way round: code that's *given* a value and does something
with it, handing nothing back. The scheduler reports every event to a consumer you give
it: <!-- claim: commandsv3.scheduler-events -->

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 3, section 6](../../lessons/v3/03-telemetry.md#6-listening-instead-of-asking)):*
```java
Scheduler.getDefault().addEventListener(this::logCommandStart);
// ...
private void logCommandStart(SchedulerEvent event) {
  if (event instanceof SchedulerEvent.Scheduled scheduled) {
```

`logCommandStart` takes a `SchedulerEvent` and returns nothing, so a method reference to it
is a `Consumer<SchedulerEvent>`. The scheduler calls it with each event as it happens.

Every coroutine body is a consumer too: `run(coroutine -> ...)` takes a
`Consumer<Coroutine>`, and the scheduler hands the body its `Coroutine` when it runs
it. <!-- claim: commandsv3.coroutine-body-is-a-consumer --> The flywheel's SysId routine is
handed two more, one that's given a voltage to drive the motor at, and one that's given a
log to write a reading into ([Lambdas and coroutines, section 3](04-lambdas-coroutines.md#3-lambdas-with-parameters)).

<details class="quiz" id="q-suppliers-9" markdown="1">
<summary>Check yourself: what's the difference between a supplier and a consumer?</summary>

- [x] A `Supplier<T>` hands a `T` back when asked; a `Consumer<T>` is handed a `T` and gives nothing back. *Values come out of a supplier and go into a consumer.*
- [ ] There's none; they're two names for the same thing. *They're opposite shapes.*
- [ ] A consumer runs once; a supplier runs every tick. *How often either runs is up to whoever holds it.*

</details>

<details class="quiz" id="q-suppliers-10" markdown="1">
<summary>Check yourself: the scheduler wants a consumer of events. Why does `this::logCommandStart` fit?</summary>

- [ ] Because its name starts with "log". *Names don't matter; shapes do.*
- [x] It takes one `SchedulerEvent` and returns nothing, which is a consumer's shape. *The scheduler calls it with each event.*
- [ ] Because `Robot` extends `Scheduler`. *`Robot` doesn't; the method reference is what's handed over.*

</details>

## 6. Functions: a value in, a value out

A **`Function<A, B>`** takes one value and hands back another. The path autos are built
from one: give it a path, and it hands back the command that drives it. `PathAuto` doesn't
know what the command does, only how to ask for it:

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

One class serves every path auto, because each auto passes in a different recipe. You've
also been using functions without naming them: `Optional`'s `.map(...)` takes one, the
code that turns what's inside into something else:

<!-- source: lesson-33 commands/Aim.java -->
*Example, from `Aim.java` ([Lesson 27, section 2](../../lessons/v3/27-aim-at-tag.md#2-a-heading-you-can-compute)):*
```java
return VisionConstants.kTagLayout.getTagPose(tagId)
    .map(pose -> pose.getTranslation().toTranslation2d());
```

<details class="quiz" id="q-suppliers-11" markdown="1">
<summary>Check yourself: what does `recipe.apply(path)` do?</summary>

- [ ] Loads the path file. *`new Path(pathName)` did that, on the line above.*
- [x] Runs the recipe on the path, and hands back the command that drives it. *`.apply` is how you run a `Function`.*
- [ ] Starts driving the path. *It builds a command; the command runs later, when autonomous starts.*

</details>

<details class="quiz" id="q-suppliers-12" markdown="1">
<summary>Check yourself: why does `PathAuto` take a `Function` instead of a finished `Command`?</summary>

- [ ] Commands can't be passed to constructors. *They can; this design just needs something else.*
- [x] The command depends on the path, and `PathAuto` only reads the path itself, so it needs a way to build the command from it. *The recipe says how; `PathAuto` supplies the path.*
- [ ] So the path can be changed while it's driving. *The path is read once, before the auto starts.*

</details>

## 7. `Runnable`: just do something

**`Runnable`** is the smallest shape: it takes nothing and hands back nothing. It's just "do
this". Command hooks like `.whenExited(...)` take one, and so do B-Line's path events,
which also have a version that takes a `Command`. That's overloading: one method name, two
parameter types, and Java picks by what you pass. <!-- claim: bline.register-event-trigger -->

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java` ([Lesson 25, section 4](../../lessons/v3/25-path-events.md#4-a-marker-that-asks-for-something) and [section 7](../../lessons/v3/25-path-events.md#7-the-path-drives-you-steer)):*
```java
FollowPath.registerEventTrigger("intake", superstructure.requestIntake());
// ...
FollowPath.registerEventTrigger("aim", () -> FollowPath.overrideRotation(
    () -> Aim.omegaTowardTag(drivetrain, localizer, PathConstants.kAimTagId),
    RotationOverrideBehavior.RESPECT_CONSTRAINTS));
FollowPath.registerEventTrigger("release", FollowPath::clearRotationOverride);
```

The first is handed a `Command`, which the scheduler runs. The other two are `Runnable`s:
plain code, run once, at the marker. Look inside `"aim"`: the `Runnable` hands B-Line
*another* lambda, `() -> Aim.omegaTowardTag(...)`, which hands back a number. That inner one
is a supplier, which B-Line asks for a spin rate every tick until `"release"`.

<details class="quiz" id="q-suppliers-13" markdown="1">
<summary>Check yourself: `FollowPath::clearRotationOverride` is passed as a `Runnable`. What does that tell you about the method?</summary>

- [x] It takes nothing and hands nothing back. *That's the shape of a `Runnable`.*
- [ ] It returns a `Command`. *A method that returned a `Command` wouldn't be a `Runnable`'s shape.*
- [ ] It runs every tick. *A `Runnable` runs whenever whoever holds it decides; this one runs once, at the marker.*

</details>

<details class="quiz" id="q-suppliers-14" markdown="1">
<summary>Check yourself: `registerEventTrigger("intake", superstructure.requestIntake())` and `registerEventTrigger("release", FollowPath::clearRotationOverride)` call methods with the same name. How does Java know which version to use?</summary>

- [ ] It always uses the first one written. *Java picks by the arguments, not by order.*
- [x] By the type of the second argument: a `Command` picks one version, a `Runnable` the other. *That's overloading.*
- [ ] It runs both versions. *Exactly one version runs for each call.*

</details>

## Common mistakes

- **Taking a value where you need a supplier.** A class that needs something every tick
  and takes it once in its constructor sees one moment, forever.
- **A call before `::`.** `robot.localizer.getPose()::getRotation` runs `getPose()` once,
  when the reference is made, so it's a supplier of one old heading. Write
  `() -> robot.localizer.getPose().getRotation()` for a fresh one each time.
- **Handing a class a whole object when it needs one ability.** Pass the getter instead,
  and the class can't do anything it shouldn't.
- **Mixing up the method names.** `.get()` for a `Supplier`, `.getAsBoolean()` and
  `.getAsDouble()` for the primitive suppliers, `.accept(...)` for a `Consumer`, `.apply(...)`
  for a `Function`, `.run()` for a `Runnable`.

## Where this comes from

- **[Lesson 2](../../lessons/v3/02-joystick-control.md):** `DoubleSupplier`, the stick reader.
- **[Lesson 3](../../lessons/v3/03-telemetry.md):** a consumer, the scheduler's event
  listener.
- **[Lesson 10](../../lessons/v3/10-kinematics.md):** `Supplier` of measures for the drive
  command.
- **[Lesson 21](../../lessons/v3/21-limit-sensors.md):** a trigger built from a
  `BooleanSupplier`.
- **[Lesson 22](../../lessons/v3/22-light-sensors.md):** a supplier as a narrow door, the
  true pose for the simulated arm.
- **[Lesson 24](../../lessons/v3/24-superstructure.md):** the LEDs reading the state through a
  supplier.
- **[Lesson 25](../../lessons/v3/25-path-events.md):** a `Function` recipe, and `Runnable`
  path events.

## Quick reference

| You write | It means |
|---|---|
| `Supplier<Pose2d> pose` | code that hands back a `Pose2d`; run with `pose.get()` |
| `BooleanSupplier ready` | a yes/no question; `ready.getAsBoolean()` |
| `DoubleSupplier speed` | a number on demand; `speed.getAsDouble()` |
| `Consumer<SchedulerEvent> listener` | code that's handed an event; `listener.accept(e)` |
| `Function<Path, Command> recipe` | a `Path` in, a `Command` out; `recipe.apply(path)` |
| `Runnable action` | just do something; `action.run()` |
| `object::getter` | fits a `Supplier` (or a primitive supplier) when the getter takes nothing |
| `object::method` taking one value, returning nothing | fits a `Consumer` |
