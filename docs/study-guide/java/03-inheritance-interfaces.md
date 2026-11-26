# Inheritance and interfaces

A class can build on another class (`extends`), and it can promise to do a set of jobs that
other code relies on (`implements` an interface). Both let one piece of code work with
classes it has never heard of.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. Each one
links to the lesson section where you write it. You don't need to have got that far: each
example says what it leans on.

## 1. Extending a class

A class can start from another class instead of from nothing. **`extends`** says "everything
that class has, plus what I add". The class you start from is the **parent** (or
superclass); yours is the **subclass**. Every opmode is one:

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java` (the template's shape, met in [Lesson 0, section 1](../../lessons/v3/00-orientation.md#1-what-am-i-even-looking-at)):*
```java
@Teleop
public class RobotTeleop extends PeriodicOpMode {
  // ...
  @Override
  public void start() {
    System.out.println("Hello from Team 5010! Teleop started.");
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
```

`PeriodicOpMode` already knows how to be an opmode: the framework knows how to build it,
start it, and call its `periodic()` every tick. `RobotTeleop` gets all of that for free, and
only says what's different about it.

A subclass can replace one of its parent's methods with its own version, which is called
**overriding**. **`@Override`** above a method says "this replaces a method my parent
already has". It's optional, but it's a check: if you misspell `periodc()`, the
compiler tells you there's no such method to override, instead of quietly adding a new one
the framework never calls.

<details class="quiz" id="q-inherit-1" markdown="1">
<summary>Check yourself: what does `RobotTeleop extends PeriodicOpMode` give `RobotTeleop`?</summary>

- [ ] Nothing until it copies the parent's code in. *`extends` brings the parent's methods and fields along; nothing is copied by hand.*
- [x] Everything `PeriodicOpMode` already has, so it only writes what's different. *That's why an opmode is a few small methods, not a whole framework.*
- [ ] A second, separate `PeriodicOpMode` object to call. *There's one object, a `RobotTeleop`, which is also a `PeriodicOpMode`.*

</details>

<details class="quiz" id="q-inherit-2" markdown="1">
<summary>Check yourself: you write `@Override public void periodc()`, misspelt. What happens?</summary>

- [ ] It runs every tick anyway. *The framework calls `periodic()`, and this method has a different name.*
- [x] It doesn't compile: the parent has no `periodc()` to override. *That check is what `@Override` is for.*
- [ ] Java fixes the spelling. *The compiler reports the mistake; it doesn't guess what you meant.*

</details>

## 2. Interfaces: a contract

An **interface** lists jobs without saying how they're done. A class that **`implements`**
it promises to do every one. Anything that holds a value of the interface's type can call
those jobs, without knowing which class it's talking to.

The localizer blends several sources of position into one estimate, and the only thing it
needs from each source is one job:

<!-- source: lesson-33 subsystems/PoseProvider.java -->
*Example, from `PoseProvider.java` ([Lesson 14, section 2](../../lessons/v3/14-pose-estimator.md#2-give-localization-its-own-home)):*
```java
public interface PoseProvider {
  /** Called every tick: fold whatever you know into the shared estimate. */
  void updatePoseEstimate(SwerveDrivePoseEstimator estimator);
}
```

The drivetrain keeps that promise with its wheel odometry, and each camera keeps it with
what it sees. A class can implement more than one interface:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 14, section 3](../../lessons/v3/14-pose-estimator.md#3-teach-the-drivetrain-to-be-a-provider)):*
```java
public class Drivetrain implements Mechanism, PoseProvider {
  // ...
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    estimator.update(getRotation(), getModulePositions());
  }
```

<details class="quiz" id="q-inherit-3" markdown="1">
<summary>Check yourself: what does `implements PoseProvider` commit the drivetrain to?</summary>

- [ ] Nothing: it's a label. *It's a promise the compiler holds you to.*
- [x] Writing `updatePoseEstimate(...)`, the one job the interface lists. *A class that leaves out a job the interface requires doesn't compile.*
- [ ] Being the only pose provider. *Any number of classes can implement it; the cameras do too.*

</details>

<details class="quiz" id="q-inherit-4" markdown="1">
<summary>Check yourself: how many interfaces can one class implement?</summary>

- [ ] Only one. *That's the limit for `extends`: a class has one parent.*
- [x] As many as it likes; `Drivetrain` implements `Mechanism` and `PoseProvider`. *Each is a separate promise.*
- [ ] None, if it also `extends` a class. *A class can extend one class and implement interfaces as well.*

</details>

## 3. One type, many classes

That's what makes an interface worth having. The localizer keeps a list of
`PoseProvider`s, and every tick it asks each one in turn, with no idea which are cameras and
which is the drivetrain:

<!-- source: lesson-33 subsystems/Localizer.java -->
*Example, from `Localizer.java` ([Lesson 14, section 2](../../lessons/v3/14-pose-estimator.md#2-give-localization-its-own-home)):*
```java
private final List<PoseProvider> m_providers = new ArrayList<>();
// ...
/** Register a source of pose information. */
public void addProvider(PoseProvider provider) {
  m_providers.add(provider);
}

private void periodic() {
  for (PoseProvider provider : m_providers) {
    provider.updatePoseEstimate(m_estimator);
  }
```

Adding a third camera means building it and one more `addProvider(...)` line; the
localizer itself doesn't change.

The course's IO layers are the same idea, used for hardware. Each mechanism holds its
hardware through an interface, and picks which class stands behind it once, when it's
built:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
  case REAL -> new ElevatorIOTalonFX();
  case SIM -> new ElevatorIOSim();
  case REPLAY -> new ElevatorIO() {}; // inputs come from the log
};
```

From then on, `m_io.updateInputs(m_inputs)` reads a real motor, a simulated one, or nothing
at all, and the elevator's own code is the same in all three. Figure 13.1 draws the same
shape for a swerve module: the mechanism on the left, the interface in the middle, and
three classes that can stand behind it on the right.

![A map of the IO layer. On the left, SwerveModule holds a ModuleIO and its inputs bundle and owns no motors. In the middle, the ModuleIO interface has two lists: inputs, the readings steerAngleDegrees, drivePositionMeters and driveVelocityMetersPerSec filled by updateInputs, and commands, setSteerAngleDegrees and setDriveVelocityMetersPerSec. On the right, ModuleIOTalonFX for the real robot, ModuleIOSim for simulation and an empty ModuleIO for replay, one of which Drivetrain's makeModule switch picks. Below, a smaller copy of the same shape for the gyro: GyroIO with GyroIOPigeon2, GyroIOSim and an empty GyroIO.](../../lessons/v3/images/13-io-door.svg)

*Figure 13.1, from [Lesson 13](../../lessons/v3/13-io-replay.md#figure-13-1) — One door per sensor: the logic on one side, three things that can stand on the other.*

<details class="quiz" id="q-inherit-5" markdown="1">
<summary>Check yourself: the localizer's loop calls `provider.updatePoseEstimate(...)`. Whose code runs?</summary>

- [ ] The interface's, for every provider. *`PoseProvider` doesn't say how; it has no code for that job.*
- [x] Each provider's own: the drivetrain's odometry for the drivetrain, the camera's for a camera. *The call goes to whichever class that object really is.*
- [ ] Only the first provider's. *The loop goes round once per provider.*

</details>

<details class="quiz" id="q-inherit-6" markdown="1">
<summary>Check yourself: in simulation, `m_io` holds an `ElevatorIOSim`. What does the rest of `Elevator` need to know about that?</summary>

- [x] Nothing: it calls the `ElevatorIO` jobs, and the simulated class answers them. *That's why the elevator's logic is identical on the robot and in sim.*
- [ ] It must check the mode before every call. *The mode is checked once, in the `switch`, when the elevator is built.*
- [ ] It must cast `m_io` to `ElevatorIOSim` first. *Nothing outside the `switch` mentions the simulated class.*

</details>

## 4. Default methods, and a class with no name

An interface can give a job a body of its own, with **`default`**. A class that implements it
then only has to write the jobs it wants to do differently. The course's IO interfaces give
*every* job a body that does nothing:

<!-- source: lesson-33 subsystems/ElevatorIO.java -->
*Example, from `ElevatorIO.java` ([Lesson 18, section 5](../../lessons/v3/18-elevator.md#5-the-contract-elevatorio); the pattern is from [Lesson 13, section 3](../../lessons/v3/13-io-replay.md#3-the-contract-moduleio)):*
```java
public interface ElevatorIO {
  // ...
  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ElevatorIOInputs inputs) {}

  /** Firmware Motion Magic position control, in meters of carriage height. */
  public default void setGoalHeightMeters(double meters) {}

  /** Open-loop drive, for homing: no goal, no profile, just a voltage. */
  public default void setVoltage(double volts) {}
```

That pays off in the `REPLAY` arm of the switch above: **`new ElevatorIO() {}`**. It's an
**anonymous class**: a class with no name, implementing `ElevatorIO` and overriding nothing,
built on the spot. Every job keeps its do-nothing body, which is exactly right for a replay:
the readings come from the log, and there are no motors to drive. Without the `default`
bodies it wouldn't compile, because you'd owe the compiler a body for every job.

The same trick lets a class supply its own version of a default job. Every `Mechanism` has a
built-in `idle()` that does nothing, and the flywheel overrides it: <!-- claim: commandsv3.mechanism-idle-overridable -->

<!-- source: lesson-33 subsystems/Flywheel.java -->
*Example, from `Flywheel.java` ([Lesson 28, section 5](../../lessons/v3/28-flywheel.md#5-a-picture-of-a-number)):*
```java
@Override
public Command idle() {
  return spinUp(m_idleSpeed); // the idle speed's tunable
}
```

<details class="quiz" id="q-inherit-7" markdown="1">
<summary>Check yourself: what does `new ElevatorIO() {}` do when the elevator calls `setVoltage(3.0)` on it?</summary>

- [ ] Drives the motor at 3 V. *There's no motor behind it; it's the replay's stand-in.*
- [x] Nothing: the anonymous class overrides nothing, so the interface's do-nothing default runs. *In a replay, nothing should drive a motor that isn't there.*
- [ ] Throws an error, because the class has no methods. *It has every method, each with the interface's default body.*

</details>

<details class="quiz" id="q-inherit-8" markdown="1">
<summary>Check yourself: why does `new ElevatorIO() {}` need every method of `ElevatorIO` to be `default`?</summary>

- [ ] It doesn't; anonymous classes never need method bodies. *An anonymous class must still have a body for every job it implements.*
- [x] It overrides nothing, so every job needs a body from the interface itself, or the class is incomplete. *The `default` bodies are what make the empty braces enough.*
- [ ] So it can be used in simulation too. *The simulation uses `ElevatorIOSim`; the empty class is for replay.*

</details>

## 5. Building on your own class: `super` and `protected`

You can extend your own classes too. The simulated elevator *is* the real one, with physics
bolted on: same motor, same configuration, same way of reading sensors, plus a model of a
carriage to feed them:

<!-- source: lesson-33 subsystems/ElevatorIOSim.java -->
*Example, from `ElevatorIOSim.java` ([Lesson 18, section 7](../../lessons/v3/18-elevator.md#7-the-sim-implementation-elevatoriosim); the pattern is from [Lesson 13, section 5](../../lessons/v3/13-io-replay.md#5-the-sim-implementation-moduleiosim)):*
```java
public class ElevatorIOSim extends ElevatorIOTalonFX {
  private final TalonFXSimState m_sim;
  // ...
  public ElevatorIOSim() {
    super(); // build the motor and apply the real configs
    m_sim = m_motor.getSimState();
  }

  @Override
  public void updateInputs(ElevatorIOInputs inputs) {
    stepSim(); // advance the physics one tick...
    super.updateInputs(inputs); // ...then read the sensor like the real class
```

Two uses of **`super`**, which means "my parent":

- **`super()`** in the constructor runs the parent's constructor first, so the motor exists
  and is configured before the simulation hooks onto it.
- **`super.updateInputs(inputs)`** calls the parent's version of the method this class is
  overriding. The sim steps its physics, then reads the sensors exactly as the real robot
  would.

For `m_sim = m_motor.getSimState()` to compile, the subclass has to reach its parent's motor.
That's what **`protected`** is for. `private` means "this class alone"; `protected` means
"this class and its subclasses":

<!-- source: lesson-33 subsystems/ElevatorIOTalonFX.java -->
*Example, from `ElevatorIOTalonFX.java` ([Lesson 18, section 6](../../lessons/v3/18-elevator.md#6-the-hardware-implementation-elevatoriotalonfx)):*
```java
public class ElevatorIOTalonFX implements ElevatorIO {
  protected final TalonFX m_motor;
  private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);
```

<details class="quiz" id="q-inherit-9" markdown="1">
<summary>Check yourself: what does `super();` do in `ElevatorIOSim`'s constructor?</summary>

- [ ] Builds a second, separate `ElevatorIOTalonFX`. *There's one object; `super()` runs the parent's part of building it.*
- [x] Runs the parent's constructor first, building and configuring the motor this object will use. *Then the sim can hook onto a motor that already exists.*
- [ ] Calls the parent's `updateInputs`. *That's `super.updateInputs(...)`, in the method below.*

</details>

<details class="quiz" id="q-inherit-10" markdown="1">
<summary>Check yourself: `m_motor` is `protected` in `ElevatorIOTalonFX`. Which classes can use it?</summary>

- [ ] Any class at all. *That would be `public`.*
- [x] `ElevatorIOTalonFX` itself and its subclasses, such as `ElevatorIOSim`. *`protected` lets a subclass reach in, where `private` wouldn't.*
- [ ] Only `ElevatorIOTalonFX`. *That would be `private`, and `ElevatorIOSim` wouldn't compile.*

</details>

## 6. `Mechanism` is an interface

Every mechanism in the course says `implements Mechanism`. In this version of Commands V3,
`Mechanism` is an interface, not a class to extend. <!-- claim: commandsv3.mechanism-no-default-command -->
Most of what it gives you comes as default methods: `run(...)`, `runRepeatedly(...)`,
`setDefaultCommand(...)` and the do-nothing `idle()` are all written in the interface, so
`implements Mechanism` is enough to have them. <!-- claim: commandsv3.coroutine-command-api, commandsv3.mechanism-idle-overridable -->
What it doesn't give you is a `periodic()` method to override; a mechanism that needs one
every tick registers its own with `Scheduler.getDefault().addPeriodic(this::periodic)`. <!-- claim: commandsv3.mechanism-no-periodic -->

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
public class Elevator implements Mechanism {
  // ...
  public Elevator() {
    Scheduler.getDefault().addPeriodic(this::periodic);
  }
```

Because it's an interface, a mechanism is still free to extend a class of its own, and to
implement other interfaces, as `Drivetrain` does with `PoseProvider`.

<details class="quiz" id="q-inherit-11" markdown="1">
<summary>Check yourself: `Elevator` never writes a `run(...)` method, yet `goToHeight` calls `runRepeatedly(...)`. Where does it come from?</summary>

- [x] `Mechanism`'s default methods: implementing the interface brings them along. *An interface can carry ready-written methods.*
- [ ] `Elevator` inherits them from a parent class it extends. *`Elevator` extends nothing; they come from the interface.*
- [ ] The scheduler adds them while the robot runs. *They're there when the code compiles.*

</details>

<details class="quiz" id="q-inherit-12" markdown="1">
<summary>Check yourself: you want the elevator to do something every tick. Where does that code go?</summary>

- [ ] In an `@Override public void periodic()` from `Mechanism`. *`Mechanism` has no `periodic()` to override.*
- [x] In a method of the elevator's own, registered with `Scheduler.getDefault().addPeriodic(this::periodic)`. *That's what the constructor does.*
- [ ] In `Robot`'s constructor. *That runs once; it's where the elevator is built, not where its ticks happen.*

</details>

## 7. Has-a or is-a: composition and inheritance

Inheritance says one class *is a* kind of another: `ElevatorIOSim` is an `ElevatorIOTalonFX`
with physics added. **Composition** says one class *has* others, and uses them: the
superstructure has an elevator and an arm, and the drivetrain has four modules.

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java` ([Lesson 24, section 4](../../lessons/v3/24-superstructure.md#4-superstructure-legality-and-readiness-are-different-jobs)):*
```java
public class Superstructure {
  private final Elevator m_elevator;
  private final Arm m_arm;
  // ...
  public Superstructure(Elevator elevator, Arm arm) {
    m_elevator = elevator;
    m_arm = arm;
```

The course leans on composition almost everywhere, and keeps inheritance for the two
places where a subclass really is the parent with a little more: the framework's opmodes,
and a sim IO built on the real one. A superstructure isn't a kind of elevator, so it
doesn't extend one; it holds one and asks it things. That also means one elevator can be
shared: the superstructure and the arm both work from the same elevator object.

<details class="quiz" id="q-inherit-13" markdown="1">
<summary>Check yourself: why doesn't `Superstructure` extend `Elevator`?</summary>

- [ ] Java doesn't allow it. *It would compile; it would just say something untrue.*
- [x] A superstructure isn't a kind of elevator. It uses an elevator and an arm, so it holds them. *"Has a" is composition; "is a" is inheritance.*
- [ ] Because `Elevator` is an interface. *`Elevator` is a class; `Mechanism` is the interface it implements.*

</details>

<details class="quiz" id="q-inherit-14" markdown="1">
<summary>Check yourself: which of these is the course's use of inheritance, rather than composition?</summary>

- [ ] The drivetrain holding four swerve modules. *It has them; that's composition.*
- [x] `ElevatorIOSim extends ElevatorIOTalonFX`. *The sim really is the real IO with physics added.*
- [ ] The superstructure holding the elevator and the arm. *Holding objects and calling them is composition.*

</details>

## Common mistakes

- **Leaving out `@Override`.** A misspelt method then compiles as a new method nobody
  calls. Put `@Override` on every method you mean to replace.
- **Forgetting a job an interface requires.** The class won't compile until it has a body
  for every method that isn't `default`.
- **`private` where a subclass needs access.** A sim class that can't reach its parent's
  motor won't compile; make that field `protected`.
- **Using the parent's fields before `super()`.** They don't exist until the parent's
  constructor has run, so anything that needs them, like `m_motor.getSimState()`, goes
  after the `super()` line.
- **Extending a class just to reuse its code.** If the new class isn't really a kind of the
  old one, hold the old one in a field instead.

## Where this comes from

- **[Lesson 0](../../lessons/v3/00-orientation.md):** `extends PeriodicOpMode` and
  `@Override`, in the template.
- **[Lesson 1](../../lessons/v3/01-first-motor.md):** `implements Mechanism`.
- **[Lesson 13](../../lessons/v3/13-io-replay.md):** interfaces with default methods, the
  anonymous class, and extending your own class with `super` and `protected`.
- **[Lesson 14](../../lessons/v3/14-pose-estimator.md):** `PoseProvider`, one interface with
  several classes behind it.
- **[Lesson 18](../../lessons/v3/18-elevator.md):** the same IO pattern for the elevator.
- **[Lesson 24](../../lessons/v3/24-superstructure.md):** composition: the superstructure
  holding the elevator and the arm.
- **[Lesson 28](../../lessons/v3/28-flywheel.md):** overriding an interface's default
  method, `idle()`.

## Quick reference

| You write | It means |
|---|---|
| `class A extends B` | `A` is a `B`, with more; one parent only |
| `@Override` | this method replaces one the parent or interface already has |
| `interface I { void job(); }` | a list of jobs, with no say in how |
| `class A implements I, J` | `A` promises every job in `I` and `J` |
| `default void job() {}` | a job with a ready-made body, which implementers may replace |
| `new I() {}` | a nameless class implementing `I`, overriding nothing |
| `super();` | run the parent's constructor first |
| `super.job(x);` | call the parent's version of the method being overridden |
| `protected` | visible to this class and its subclasses |
| `List<I> items` | a list that can hold any class implementing `I` |
