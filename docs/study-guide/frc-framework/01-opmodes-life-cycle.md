# Opmodes and their life cycle

An opmode is one thing the robot can be told to do, such as "drive with the sticks" or "run
the Two Corners auto", and you pick it by name before anything in it runs.

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise, and each
one links to the lesson section where you write it.

## 1. `Robot` and its opmodes

A robot program in this course has two kinds of class. There's one **`Robot`**, which
extends the framework's robot class (`OpModeRobot`, or AdvantageKit's `LoggedOpModeRobot`
from Lesson 13 on), and there are several **opmodes**, each extending `PeriodicOpMode`. <!-- claim: wpilib.opmode-template-files, advantagekit.logged-opmode-robot-captures-ds -->
The Driver Station (or SimGUI) lists the opmodes under their mode, Teleoperated, Autonomous
or Utility, and a person picks one before enabling. <!-- claim: wpilib.opmode-annotation-class-name, wpilib.utility-opmode -->

The template's teleop opmode shows every method an opmode can fill in:

<!-- source: lesson-0 opmode/MyTeleop.java -->
*Example, from Lesson 0's `MyTeleop.java` ([Lesson 0, section 1](../../lessons/v3/00-orientation.md#1-what-am-i-even-looking-at); the course's own teleop is `RobotTeleop`):*
```java
@Teleop
public class MyTeleop extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public MyTeleop(Robot robot) {
    this.robot = robot;
    // ...
  }

  @Override
  public void disabledPeriodic() {
    /* Called periodically (on every DS packet) while the robot is disabled. */
  }

  @Override
  public void start() {
    System.out.println("Hello from Team 5010! Teleop started.");
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }

  @Override
  public void end() {
    /* Called when the robot is disabled (after previously being enabled). */
  }

  @Override
  public void close() {
    /* Called when the opmode is de-selected / no additional methods will be called. */
  }
}
```

Here's the wrong picture to drop: you don't call any of these methods, and there's no
`main` loop of yours that runs top to bottom. The framework calls each one at its own
moment, and your job is to fill in the ones you need.

<details class="quiz" id="q-opmodes-1" markdown="1">
<summary>Check yourself: who calls `MyTeleop`'s `start()` method?</summary>

- [ ] `Robot`'s constructor, once it has built the opmode. *Nothing in `Robot` calls it.*
- [x] The framework, at the moment the robot is enabled with this opmode picked. *You fill it in; the framework decides when it runs.*
- [ ] Your own `while (true)` loop. *There isn't one: the framework is the loop.*

</details>

<details class="quiz" id="q-opmodes-2" markdown="1">
<summary>Check yourself: on SimGUI, where would you find `MyTeleop`?</summary>

- [x] In the OpMode drop-down, after picking **Teleoperated**. *The drop-down only lists the opmodes of the mode you picked.*
- [ ] Under **Autonomous**, beside `MyAuto`. *`@Teleop` puts it under Teleoperated.*
- [ ] Nowhere: it runs whenever the robot is enabled. *An opmode only runs once it's been picked.*

</details>

## 2. The life cycle

Figure 0.1 shows when each method fires. Read it left to right, like a timeline:

![A timeline in three stretches: disabled, enabled, disabled. The constructor fires once at the left edge when the opmode is picked, start() once when the robot is enabled, end() and then close() when it is disabled, and a fresh MyTeleop is constructed right after, which ticks disabledPeriodic() in the last stretch. Ticks of disabledPeriodic() fill the disabled stretches and ticks of periodic(), about every 20 milliseconds, fill the enabled one](../../lessons/v3/images/00-opmode-lifecycle.svg)

*Figure 0.1, from [Lesson 0](../../lessons/v3/00-orientation.md#figure-0-1) — An opmode's life: constructor, `start()`, a row of `periodic()` ticks, then `end()` and `close()`, and a fresh opmode takes its place.* <!-- claim: wpilib.opmode-lifecycle -->

- **Picking** the opmode runs its constructor, while the robot is still disabled.
- **Enable** runs `start()` once, and then `periodic()` every 20 ms, about 50 times a
  second, for as long as the robot stays enabled. <!-- claim: wpilib.opmode-periodic-20ms -->
- **Disable** runs `end()` and then `close()` on the same tick, and that opmode is finished.
  The framework builds a fresh one on the next tick, and the new one sits ticking
  `disabledPeriodic()` until you enable again. <!-- claim: wpilib.opmode-lifecycle -->
- **Picking a different opmode** runs `close()` on the one you left. <!-- claim: wpilib.opmode-lifecycle -->

The surprise is the third point: **an opmode doesn't live forever; it's rebuilt after every
Disable.** The template's comment on `close()` only mentions de-selecting, but disabling counts
too. You can watch it happen in the console, which prints a
`********** Creating OpMode ... **********` line for each new one. <!-- claim: wpilib.opmode-creation-console-line -->

<details class="quiz" id="q-opmodes-3" markdown="1">
<summary>Check yourself: you enable `RobotTeleop`, drive for a while, then click Disable. What happens to that `RobotTeleop` object?</summary>

- [ ] It waits, paused, for the next Enable. *The framework doesn't keep it.*
- [x] `end()` and `close()` run, and a fresh `RobotTeleop` is built on the next tick. *Every Disable finishes the opmode and builds a new one.*
- [ ] Nothing until you pick another opmode. *Picking another runs `close()` too, but so does disabling.*

</details>

<details class="quiz" id="q-opmodes-4" markdown="1">
<summary>Check yourself: which of an opmode's methods run more than once in a single life of that object?</summary>

- [ ] The constructor and `start()`. *Each of those runs once per object; it's a new object that runs them again.*
- [x] `periodic()` and `disabledPeriodic()`. *Only the two `periodic` methods repeat; every other method fires at one moment.*
- [ ] `end()` and `close()`. *They run once, at the end of its life.*

</details>

## 3. The constructor says what the opmode is

The constructor runs when the opmode is picked, before anyone clicks Enable, so it's the
place to say what this opmode *is*: which button does what, and what to do when autonomous
starts. `start()` is for things that should happen at the moment of enabling, like the
template's hello message. <!-- claim: wpilib.opmode-lifecycle -->

The path autos show why that timing matters. Their constructor reads the path file and, in
the simulator, sets the robot down at the path's start, all while the robot sits disabled.
Then it binds the auto to the start of autonomous:

<!-- source: lesson-33 opmode/PathAuto.java -->
*Example, from `PathAuto.java` ([Lesson 25, section 2](../../lessons/v3/25-path-events.md#2-one-class-every-path-auto); the binding gains `getReadyThen` in [section 3](../../lessons/v3/25-path-events.md#3-get-ready-before-you-move)):*
```java
public PathAuto(Robot robot, String pathName, Function<Path, Command> recipe) {
  // Read the path file now, while the robot is still disabled.
  Path path = new Path(pathName);

  // In the simulator, set the robot down at the path's start — the job a
  // person does on a real field. On a real robot this does nothing.
  robot.drivetrain.placeSimulatedRobot(Autos.startPose(path));

  // Runs on enable.
  RobotModeTriggers.autonomous().onTrue(
      Autos.getReadyThen(robot.elevator, robot.superstructure, recipe.apply(path)));
}
```

Doing the work at selection has two payoffs. When autonomous starts, the command is already
built and only has to run. And a mistake shows up early: a misspelled path name throws an
`IllegalArgumentException` the moment you pick the auto, in the pits, not when the match
starts. <!-- claim: bline.bad-path-name-throws -->

`RobotModeTriggers.autonomous()` is a trigger that turns true when the robot is enabled in
autonomous, and `onTrue` starts the plan then, once per enable. <!-- claim: commandsv3.robot-mode-triggers-autonomous -->
Because it's made in the opmode's constructor, the binding belongs to this opmode and goes
away when another is picked. <!-- claim: commandsv3.opmode-bindings-dropped --> The
[Commands and triggers](03-commands-triggers.md#7-where-bindings-live-and-what-disabling-does)
page has more on where bindings live.

<details class="quiz" id="q-opmodes-5" markdown="1">
<summary>Check yourself: `PathAuto` is given the path name "TwoCorner", one letter short. When does the error show up?</summary>

- [x] The moment the auto is picked, because the constructor reads the path file then. *Selection runs the constructor, so the bad name throws before you ever enable.*
- [ ] When autonomous starts and the path is followed. *By then the path has long been read.*
- [ ] Never: the robot just sits still. *Loading a missing path throws an `IllegalArgumentException`.*

</details>

<details class="quiz" id="q-opmodes-6" markdown="1">
<summary>Check yourself: why are `RobotTeleop`'s button bindings in its constructor and not in `start()`?</summary>

- [ ] `start()` runs too often. *It runs once per Enable.*
- [x] The constructor runs while the robot is still disabled, so the wiring is ready before Enable, and an error in it shows up as soon as the opmode is picked. *`start()` is for the moment of enabling itself.*
- [ ] Bindings made in `start()` are ignored. *They'd still work; they'd just be made later than they need to be.*

</details>

## 4. `Robot` is built once

**`Robot` is built once, when the program starts, and keeps its fields for good.** An opmode
is built when it's picked and rebuilt after every Disable. <!-- claim: wpilib.robot-built-once -->
So the hardware, and anything else that has to outlive a Disable, lives in `Robot`'s
fields, and each opmode reaches in through the `robot` it's given:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 1, section 4](../../lessons/v3/01-first-motor.md#4-give-the-robot-its-hardware) started it; later lessons add a field each):*
```java
public class Robot extends LoggedOpModeRobot {
  // ...
  public final CommandGamepad driverController = new CommandGamepad(0);
  public final Drivetrain drivetrain = new Drivetrain();
  // ...
  public final Elevator elevator = new Elevator();
```

Anything kept in an opmode's own field is gone after a Disable, because the next opmode is a
new object. That's fine for something the opmode works out afresh each time, and wrong for a
motor, a sensor or a running total.

Bindings follow the same split. One made in `Robot`'s constructor belongs to the whole
program and keeps working in every opmode; one made in an opmode's constructor belongs to
that opmode. <!-- claim: wpilib.opmode-id-zero-in-robot-constructor, commandsv3.opmode-bindings-dropped -->
The course's rule: bind a driver's control in its opmode, and what the robot itself means
(the superstructure's motion for each state) in `Robot`.

<details class="quiz" id="q-opmodes-7" markdown="1">
<summary>Check yourself: you store a count of shots in a field of `RobotTeleop`. You disable and enable again. What does the count read?</summary>

- [ ] The same as before: fields last as long as the program. *That's true of `Robot`'s fields, not an opmode's.*
- [x] Whatever its starting value is: Disable built a new `RobotTeleop`, with fresh fields. *Keep anything that must survive a Disable in `Robot`.*
- [ ] It throws an exception, because the old object was closed. *Nothing throws; it's just a different object.*

</details>

<details class="quiz" id="q-opmodes-8" markdown="1">
<summary>Check yourself: why is the `Drivetrain` a field of `Robot` and not of `RobotTeleop`?</summary>

- [ ] Opmodes aren't allowed to build hardware objects. *The rule is about how long things live, not about permission.*
- [x] `Robot` is built once and lives for the whole program, while `RobotTeleop` is rebuilt after every Disable. *Hardware has to outlive every opmode, and autonomous needs it too.*
- [ ] `RobotTeleop` has no constructor to build it in. *It does; that's where its bindings go.*

</details>

## 5. How an opmode gets on the list

An opmode class marked **`@Teleop`**, **`@Autonomous`** or **`@Utility`** is found by the
framework when the program starts, built by it, and listed under its mode. To be built that
way it needs a public constructor that takes nothing or the `Robot`. <!-- claim: wpilib.opmode-annotation-class-name, wpilib.opmode-scan-constructor -->
The [Annotations](../java/06-annotations.md#2-opmode-annotations-the-framework-reads-them)
page covers the annotations and their `name` and `group` values.

An opmode that needs more than that, like `PathAuto` and its path name, gets no annotation.
`Robot` registers it with `addOpMode(...)` instead, giving the mode, name, group and a lambda
that builds it, which the framework calls at selection like any other constructor. <!-- claim: wpilib.add-opmode-needs-second-publish, wpilib.opmode-lifecycle -->
Then comes the line that's easy to forget:

<!-- source: lesson-33 Robot.java -->
*Example, from the end of `Robot.java`'s constructor ([Lesson 25, section 2](../../lessons/v3/25-path-events.md#2-one-class-every-path-auto)):*
```java
addOpMode(RobotMode.AUTONOMOUS, "Drive To Pose", "Poses", () -> new RobotAutoDriveToPose(this));
// The list went to the Driver Station before this constructor ran, with
// only the annotated classes on it. Send it again with these added.
publishOpModes();
```

The framework's own constructor runs before `Robot`'s body, and it sends the list of
annotated opmodes to the Driver Station right then. Without a second `publishOpModes()`,
none of the opmodes added afterwards appear. And an `addOpMode` that reuses a name an
annotated class already has stops the program at boot with an
`IllegalArgumentException`. <!-- claim: wpilib.add-opmode-needs-second-publish -->

<details class="quiz" id="q-opmodes-9" markdown="1">
<summary>Check yourself: you add a new `addOpMode(...)` line after `publishOpModes()` in `Robot`'s constructor. What do you see on the OpMode list?</summary>

- [ ] The new auto, like the others. *The list was sent before that line ran.*
- [x] Every auto except the new one. *`publishOpModes()` has to come after the last `addOpMode`.*
- [ ] Nothing at all, because the list is now wrong. *The list that was sent is still shown; it's only missing the late one.*

</details>

<details class="quiz" id="q-opmodes-10" markdown="1">
<summary>Check yourself: an annotated class `RobotAutoTwoCorners` is still in the project, and `Robot` also registers "Two Corners" with `addOpMode`. What happens?</summary>

- [ ] The list shows "Two Corners" twice. *The framework refuses a second opmode with the same name in the same mode.*
- [ ] The `addOpMode` one quietly replaces the annotated one. *Nothing is replaced quietly.*
- [x] The program stops at boot with an `IllegalArgumentException` saying "Two Corners" already exists. *Delete the old class when you replace it.*

</details>

## Common mistakes

- **Keeping state in an opmode that has to survive a Disable.** The opmode is rebuilt; put
  it in `Robot` ([section 4](#4-robot-is-built-once)).
- **Expecting an opmode's constructor to run only once per program.** It runs on every pick
  and after every Disable, so don't put anything in it that mustn't happen twice.
- **Doing slow setup in `start()`.** It runs at the moment of enabling, the one moment you
  can't afford to wait. Read files and build commands in the constructor.
- **Forgetting the second `publishOpModes()`**, or putting an `addOpMode` after it.
- **Replacing an annotated opmode with `addOpMode` and keeping the old class.** Two opmodes
  with one name stop the program at boot.

## Where this comes from

- **[Lesson 0](../../lessons/v3/00-orientation.md):** opmodes, the life cycle, and picking
  one in SimGUI.
- **[Lesson 1](../../lessons/v3/01-first-motor.md):** hardware in `Robot`, and bindings in
  the opmode's constructor.
- **[Lesson 9](../../lessons/v3/09-autonomous.md):** an autonomous opmode, and a second one
  with no chooser code.
- **[Lesson 17](../../lessons/v3/17-bline-autos.md):** reading a path at selection.
- **[Lesson 24](../../lessons/v3/24-superstructure.md):** bindings that belong in `Robot`.
- **[Lesson 25](../../lessons/v3/25-path-events.md):** one opmode class for every path, with
  `addOpMode`.

## Quick reference

| When | What runs |
|---|---|
| The program starts | `Robot`'s fields and constructor, once |
| An opmode is picked | its constructor |
| Enable | `start()`, then `periodic()` every 20 ms |
| While disabled | `disabledPeriodic()` |
| Disable | `end()`, `close()`, then a fresh opmode is built |
| Another opmode is picked | `close()` on the one left |

| You write | What it does |
|---|---|
| `@Teleop`, `@Autonomous`, `@Utility` | list the class under that mode, built by the framework |
| `addOpMode(mode, name, group, () -> ...)` | register an opmode `Robot` builds itself |
| `publishOpModes()` | send the list again, after the last `addOpMode` |
| `RobotModeTriggers.autonomous().onTrue(...)` | start a command when autonomous is enabled |
