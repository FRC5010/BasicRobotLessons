# How periodic functions run

The robot program is a loop that runs every 20 ms, and a periodic function is a piece of
your code that the loop calls on every pass.

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise, and each
one links to the lesson section where you write it. When each *opmode* method runs is on the
[Opmodes and their life cycle](01-opmodes-life-cycle.md) page; this page is about what runs
on every tick, and in what order.

## 1. The tick

The framework calls your periodic methods about 50 times a second, once every 20 ms. Each
pass is a **tick**. <!-- claim: wpilib.opmode-periodic-20ms --> You never write the loop
yourself: the framework is the loop, and every periodic method is a blank it fills in on each
pass.

**`robotPeriodic()`** runs on every tick, whichever opmode is picked and whether the robot is
enabled or not. <!-- claim: wpilib.robot-periodic-always --> That makes it the one place for
something that must never stop, and the one thing that must never stop is the scheduler:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 1, section 5](../../lessons/v3/01-first-motor.md#5-keep-the-scheduler-running); Lesson 29 adds the battery readings below it):*
```java
/** Runs every tick, no matter which opmode is selected or whether the robot is enabled. */
@Override
public void robotPeriodic() {
  Scheduler.getDefault().run();
  // ...
}
```

`Scheduler.getDefault().run()` is one tick of the command world: it checks every trigger, then
moves every running command along a step. Leave it out and nothing happens. Every button stays
wired, every command can be built, and none of them ever runs.

<details class="quiz" id="q-periodic-1" markdown="1">
<summary>Check yourself: the robot is disabled, with no opmode picked. Does `robotPeriodic()` run?</summary>

- [ ] No: it only runs while an opmode is enabled. *That's the opmode's own `periodic()`.*
- [x] Yes: it runs every tick, enabled or disabled, whatever's picked. *That's why the scheduler's tick lives there.*
- [ ] Only in simulation. *That's `simulationPeriodic()`.*

</details>

<details class="quiz" id="q-periodic-2" markdown="1">
<summary>Check yourself: someone deletes `Scheduler.getDefault().run()` from `robotPeriodic()`. The code still compiles. What does the robot do when a button is pressed?</summary>

- [x] Nothing: no trigger is checked and no command runs. *The scheduler only does its work when something calls `run()`, once a tick.*
- [ ] The bound command runs once and stops. *Without the tick, it never starts.*
- [ ] The opmode's `periodic()` runs the scheduler instead. *Nothing runs it for you.*

</details>

## 2. Periodic methods the framework calls

Besides `robotPeriodic()`, the framework calls these:

- **`simulationPeriodic()`** on `Robot`, every tick, but only when the code runs in simulation.
  On a real robot it never runs, so nothing in it can reach the field. <!-- claim: wpilib.simulation-periodic-sim-only -->
- **`periodic()`** on the picked opmode, every tick while the robot is enabled. <!-- claim: wpilib.opmode-periodic-20ms -->
- **`disabledPeriodic()`** on the picked opmode, while the robot is disabled (the template's
  comment says on every Driver Station packet).

The course leaves the opmodes' `periodic()` methods empty. A job that lasts a while is a
command, and a job that has to happen every tick belongs to the class that owns it, through
`addPeriodic` ([section 3](#3-a-class-that-needs-every-tick-addperiodic)).

In the final code `simulationPeriodic()` does one thing, the battery: no single mechanism owns
it and every one of them changes it.

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 29, section 3](../../lessons/v3/29-current-limits.md#6-simulating-the-battery)):*
```java
/** Runs every tick, but only while the code is running in simulation. */
@Override
public void simulationPeriodic() {
  // ...
  RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(getTotalCurrentAmps()));
}
```

It held more once. From Lesson 4 to Lesson 12, `Robot` called each mechanism's own
`simulatePeriodic()` from here, and Lesson 13 moved those steps into each mechanism's
simulated hardware class. Figure 4.1 draws one tick of that simulation: your command goes out
as volts, the model works out the motion, and the motion comes back as fake sensor readings
for the next tick.

![The simulation loop as a ring: your setThrottle command, the TalonFX turning it into volts, then three steps inside simulatePeriodic (read the volts, step the DCMotorSim, push the motion into the fake encoder), then your getPosition and getVelocity reads, which lead back to your next command](../../lessons/v3/images/04-simulation-loop.svg)

*Figure 4.1, from [Lesson 4](../../lessons/v3/04-simulation.md#figure-4-1) — The simulation loop. Blue boxes are your code; the orange box is `simulatePeriodic()`.*

<details class="quiz" id="q-periodic-3" markdown="1">
<summary>Check yourself: you put a line in `simulationPeriodic()` that sets a fake sensor reading. What does it do on the real robot?</summary>

- [ ] It sets the real sensor's reading too. *The framework never calls `simulationPeriodic()` on a real robot.*
- [x] Nothing: `simulationPeriodic()` only runs in simulation. *That's what makes it safe for sim-only code.*
- [ ] It throws an exception, because there's no simulator. *It isn't called at all, so nothing can throw.*

</details>

<details class="quiz" id="q-periodic-4" markdown="1">
<summary>Check yourself: which periodic method runs on every tick while the robot is disabled with `RobotTeleop` picked?</summary>

- [ ] `RobotTeleop.periodic()` *That runs only while enabled.*
- [x] `robotPeriodic()` and `RobotTeleop.disabledPeriodic()` *`robotPeriodic()` runs on every tick; the opmode's `disabledPeriodic()` covers the disabled stretch.*
- [ ] None: nothing runs while disabled. *Disabled doesn't stop the loop; the scheduler keeps ticking too.*

</details>

## 3. A class that needs every tick: `addPeriodic`

A mechanism has no `periodic()` method of its own to fill in. A class that has to do
something every tick, such as reading its sensors and logging them, asks the scheduler for a
callback once, in its constructor. <!-- claim: commandsv3.mechanism-no-periodic -->

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
public Elevator() {
  Scheduler.getDefault().addPeriodic(this::periodic);
}

/** One tick of sensing: read the hardware into the bundle and log it. */
private void periodic() {
  m_io.updateInputs(m_inputs);
  Logger.processInputs("Elevator", m_inputs); // every reading, under Elevator/
  // ...
}
```

The callback runs every tick for as long as the program runs, with no command needed, so the
readings stay fresh whatever the elevator is doing. <!-- claim: commandsv3.periodic-before-commands -->
`this::periodic` is a method reference: the
[Lambdas and coroutines](../java/04-lambdas-coroutines.md#2-method-references-a-lambda-that-just-calls-a-method)
page explains them. The method is `private` because only the scheduler should call it.

It isn't only for mechanisms. The `Localizer` is never a command's requirement, and all it
needs from the scheduler is that heartbeat, so it registers one the same
way. <!-- claim: commandsv3.periodic-before-commands --> A class can register more than one,
too: the `Drivetrain` registers its sensing and, separately, its chassis simulation.

<details class="quiz" id="q-periodic-5" markdown="1">
<summary>Check yourself: you write a new class that must log a sensor every tick. Where does the `addPeriodic` call go?</summary>

- [x] In the class's constructor, once. *One registration lasts for the whole program.*
- [ ] In `robotPeriodic()`, so it happens every tick. *That would register a new callback on every tick, and they'd pile up.*
- [ ] In a command, so it runs while the command does. *A command only runs while it's scheduled; this has to run always.*

</details>

<details class="quiz" id="q-periodic-6" markdown="1">
<summary>Check yourself: why does the `Localizer` use `addPeriodic` rather than `implements Mechanism`?</summary>

- [ ] A `Mechanism` can't read sensors. *It can; the elevator does.*
- [x] Nothing ever runs a command on it; all it needs is to be called every tick. *Being a mechanism is for things commands take turns with.*
- [ ] `addPeriodic` only works on classes that aren't mechanisms. *Every mechanism in the course uses it too.*

</details>

## 4. The order inside one tick

**`Scheduler.run()` first runs every `addPeriodic` callback, in the order they were
registered, and then the commands.** <!-- claim: commandsv3.periodic-before-commands --> So
every sensor reading is fresh by the time a command looks at it.

Each class registers in its own constructor, so the order is the order the objects are built,
which is the order `Robot` declares them:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 24, section 8](../../lessons/v3/24-superstructure.md#8-wiring-requests-to-buttons-motion-to-state)):*
```java
public final Drivetrain drivetrain = new Drivetrain();
// Localizer reads the drivetrain's kinematics/rotation/module positions at
// construction, so drivetrain must be built first — it already is, above.
public final Localizer localizer = new Localizer(drivetrain);
// ...
public final Elevator elevator = new Elevator();
// ...
public final Arm arm = new Arm(elevator, drivetrain::getSimulatedPose);
// Superstructure reads both, so elevator and arm must be finished objects
// first — they already are, above.
public final Superstructure superstructure = new Superstructure(elevator, arm);
public final Leds leds = new Leds(superstructure::getState); // reads it; drives nothing
```

The order that lets each object be built also gets the ticks right. The `Drivetrain` refreshes
its wheel and gyro readings before the `Localizer` uses them, and the elevator and arm refresh
theirs before the `Superstructure` reads them. <!-- claim: commandsv3.periodic-before-commands -->

Order has a cost when something reads a value *before* the class that owns it has updated
it. The elevator records the whole drawing in its periodic, arm included, and the arm's
periodic runs after it. So the arm in the drawing is a tick behind: 20 ms, about 3.5° at full
swing speed. <!-- claim: l20.drawing-lag --> That's too small to see, and it's what
"registration order" means in practice.

<details class="quiz" id="q-periodic-7" markdown="1">
<summary>Check yourself: suppose the `Localizer` were built, and so registered its callback, before the `Drivetrain`. What would go wrong?</summary>

- [ ] Nothing: the scheduler sorts callbacks by what they read. *It runs them in the order they were registered.*
- [x] The localizer's callback would run first, so each tick it would use the drivetrain's readings from the tick before. *Build what's read before what reads it.*
- [ ] The commands would run before the periodic callbacks. *Callbacks always come first, whatever order they're in.*

</details>

<details class="quiz" id="q-periodic-8" markdown="1">
<summary>Check yourself: why is the arm in the drawing a tick behind, and the elevator isn't?</summary>

- [ ] The arm's motor is slower to report. *It's about code order, not the motor.*
- [x] The elevator records the drawing in its periodic, which runs before the arm's periodic moves the arm's part of it. *So the arm's part is from the tick before.*
- [ ] The drawing is only sent every other tick. *It's recorded every tick.*

</details>

## 5. What the tick doesn't promise

The loop is a rhythm, not a clock that splits the work up for you. Three things follow from
that:

- **Code runs until it returns or pauses.** A command whose loop never calls
  `coroutine.yield()` runs every pass of that loop inside one tick, holding up everything else
  until it's done. <!-- claim: commandsv3.loop-without-yield-one-tick --> The
  [Lambdas and coroutines](../java/04-lambdas-coroutines.md#4-pausing-until-the-next-tick)
  page shows how a command waits for the next tick.
- **The order of commands isn't something to lean on.** The scheduler happens to step running
  commands in reverse of the order they started, so in a parallel group the later command can
  get its first look before the earlier one has run at all. <!-- claim: commandsv3.commands-run-in-reverse-order -->
  Lesson 25 ran into exactly that: a check that read the path's remaining distance ran before
  the path had started, when it still read zero. Write each command so it doesn't care which
  goes first.
- **The motor controllers keep their own time.** A TalonFX runs its own closed loop about
  1000 times a second, whatever your code is doing. <!-- claim: phoenix6.onboard-loop-1khz -->
  Your tick sets the goal; the motor chases it between ticks.

<details class="quiz" id="q-periodic-9" markdown="1">
<summary>Check yourself: a command's body has a `while` loop that waits for a sensor, with no `coroutine.yield()` inside. What happens while it waits?</summary>

- [ ] It checks the sensor once a tick, like any other command. *That needs a `yield` in the loop.*
- [x] It spins inside one tick: the sensor's periodic never gets to run, so the reading never changes and the loop never ends. *Pause with `yield` (or `waitUntil`) so the rest of the tick can run.*
- [ ] The scheduler stops it after 20 ms. *Nothing cuts it off; it has the scheduler until it pauses.*

</details>

<details class="quiz" id="q-periodic-10" markdown="1">
<summary>Check yourself: the elevator's goal is set once a tick. How often does the TalonFX's own position loop run?</summary>

- [ ] Once a tick, when your code sets the goal. *The motor controller doesn't wait for your code.*
- [x] About 1000 times a second, on its own. *Your code gives it a goal; it does the chasing.*
- [ ] Only while a command is running on the elevator. *It keeps holding the last goal it was given.*

</details>

## Common mistakes

- **No `Scheduler.getDefault().run()` in `robotPeriodic()`.** Everything is wired and nothing
  ever runs ([section 1](#1-the-tick)).
- **Registering a callback somewhere that runs repeatedly**, like a periodic method or a
  command. Register once, in the constructor.
- **Building an object before the one it reads.** Its callback then runs first and reads last
  tick's values ([section 4](#4-the-order-inside-one-tick)).
- **A loop in a command with no `yield`.** It holds up the whole tick, sensor readings
  included.
- **Relying on which command in a group runs first.** Make each one check for the state it
  needs instead.
- **Putting real-robot code in `simulationPeriodic()`.** It never runs on the robot.

## Where this comes from

- **[Lesson 0](../../lessons/v3/00-orientation.md):** the heartbeat.
- **[Lesson 1](../../lessons/v3/01-first-motor.md):** `robotPeriodic()` and the scheduler's
  tick.
- **[Lesson 3](../../lessons/v3/03-telemetry.md):** `addPeriodic`, for logging every tick.
- **[Lesson 4](../../lessons/v3/04-simulation.md):** `simulationPeriodic()`.
- **[Lesson 14](../../lessons/v3/14-pose-estimator.md):** registration order, and a class
  that isn't a mechanism.
- **[Lesson 20](../../lessons/v3/20-intake-arm.md):** the drawing that's a tick behind.
- **[Lesson 24](../../lessons/v3/24-superstructure.md):** declaration order deciding tick
  order.
- **[Lesson 25](../../lessons/v3/25-path-events.md):** the order of commands in a group.

## Quick reference

| Method | When it runs |
|---|---|
| `Robot.robotPeriodic()` | every tick, always |
| `Robot.simulationPeriodic()` | every tick, in simulation only |
| opmode `periodic()` | every tick while enabled |
| opmode `disabledPeriodic()` | while disabled |
| an `addPeriodic` callback | every tick, from registration on |

| Inside `Scheduler.run()` | Order |
|---|---|
| `addPeriodic` callbacks | first, in the order they were registered |
| running commands | after the callbacks; don't rely on their order |
