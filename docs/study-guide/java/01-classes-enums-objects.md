# Classes, enums and objects

A class is a blueprint, an object is one thing built from it, and an enum is a class with
a fixed list of objects you name yourself.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. Each one
links to the lesson section where you write it. You don't need to have got that far: each
example says what it leans on.

## 1. Classes and objects

A **class** describes a kind of thing: what it knows and what it can do. `Elevator`
describes any elevator. An **object** is one actual thing built from that description:
*this* robot's elevator, with its own motor and its own height. One class, as many objects
as you need.

You build an object with **`new`**. The robot builds its mechanisms that way, one field
each:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 18, section 9](../../lessons/v3/18-elevator.md#9-wire-it-in-robotjava-and-the-d-pad) for the elevator):*
```java
public final Elevator elevator = new Elevator();
// ...
public final Arm arm = new Arm(elevator, drivetrain::getSimulatedPose);
// ...
public final Superstructure superstructure = new Superstructure(elevator, arm);
```

Read each line right to left. `new Elevator()` builds an elevator object, and
`Elevator elevator` declares a field of type `Elevator` to hold it. From then on,
`robot.elevator` is your handle on that one elevator: when you want *it* to do something,
you talk to this object.

Notice what the arm and the superstructure are handed: the elevator object itself. The
arm hangs its part of the robot's drawing off the elevator's carriage, and the
superstructure asks both mechanisms whether they've arrived, so each one is given the
*same* elevator to work with. That
is how objects work together: one holds a handle on another and calls its methods.

<details class="quiz" id="q-classes-1" markdown="1">
<summary>Check yourself: which is the class, and which is the object?</summary>

- [x] `Elevator` is the class; the thing `new Elevator()` builds is an object. *The class is the description, and `new` builds one actual elevator from it.*
- [ ] `elevator` is the class; `Elevator` is the object. *It's the other way round: the capitalised name is the class, and the field holds an object.*
- [ ] They're two names for the same thing. *A class can have many objects; this robot happens to build one elevator.*

</details>

<details class="quiz" id="q-classes-2" markdown="1">
<summary>Check yourself: the superstructure is built with `new Superstructure(elevator, arm)`. What does it get?</summary>

- [ ] Copies of the elevator and the arm, to work with on its own. *It gets the same objects `Robot` holds, not copies.*
- [x] Handles on the same elevator and arm objects that `Robot` holds. *So when it asks `m_elevator.atGoal()`, it's asking the one real elevator.*
- [ ] Nothing until the robot is enabled. *The arguments are passed when the object is built, at startup.*

</details>

## 2. Fields, constructors and `this`

Inside a class, **fields** are what each object remembers for as long as it exists, and a
**constructor** is the code that runs once, when `new` builds the object. A constructor has
the class's name and no return type:

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java` ([Lesson 24, section 4](../../lessons/v3/24-superstructure.md#4-superstructure-legality-and-readiness-are-different-jobs)):*
```java
public class Superstructure {
  private final Elevator m_elevator;
  private final Arm m_arm;

  private SuperstructureState m_state = SuperstructureState.UNHOMED;
  // ...

  public Superstructure(Elevator elevator, Arm arm) {
    m_elevator = elevator;
    m_arm = arm;
    Scheduler.getDefault().addPeriodic(this::periodic);
  }
```

The constructor's parameters, `elevator` and `arm`, only exist while the constructor runs.
Storing them in the fields is what lets every later method use them. The fields start with
`m_` (for "member"), the course's way of telling a field from a local at a glance.

The template's opmodes do the same job without the prefix, so the field and the
parameter share a name. **`this`** settles which one you mean: `this.robot` is the field,
plain `robot` the parameter.

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java` (the template's shape, met in [Lesson 0, section 1](../../lessons/v3/00-orientation.md#1-what-am-i-even-looking-at)):*
```java
private final Robot robot;

/** The Robot instance is passed into the opmode via the constructor. */
public RobotTeleop(Robot robot) {
  this.robot = robot;
  // ...
}
```

`this` on its own means "this object". `this::periodic` in the first example hands the
scheduler *this* superstructure's `periodic` method.

<details class="quiz" id="q-classes-3" markdown="1">
<summary>Check yourself: in `RobotTeleop`'s constructor, what does `this.robot = robot;` do?</summary>

- [ ] Nothing: it sets a variable to itself. *There are two `robot`s here, the field and the parameter.*
- [x] Copies the parameter `robot` into the field `this.robot`, so the opmode keeps it. *`this.` picks out the field when a parameter has the same name.*
- [ ] Builds a new `Robot`. *Nothing is built; there's no `new` on that line.*

</details>

<details class="quiz" id="q-classes-4" markdown="1">
<summary>Check yourself: when does `Superstructure`'s constructor run?</summary>

- [ ] Every tick. *That's the periodic method it registers.*
- [x] Once, when `new Superstructure(elevator, arm)` builds the object. *A constructor runs exactly once for each object.*
- [ ] Each time a method on it is called. *Methods use the object the constructor already built.*

</details>

## 3. `private`, `public` and `final`

Two small words go in front of almost every field.

**`private`** means only this class's own code can touch it; **`public`** means any class
can. The superstructure's `m_state` is private: nothing outside can set it to something
illegal, and other classes have to *ask*, through `requestIntake()` and friends, which
check first. `Robot`'s mechanisms are public, so the opmodes can reach
`robot.elevator`.

**`final`** means the field is set once and never pointed at anything else. `m_elevator`
is final: the superstructure gets its elevator in the constructor and keeps that one for
life. A final field must be set by the time the constructor ends, either where it's
declared or, as here, in the constructor.

The thing to get right is what `final` *doesn't* mean. It fixes which object the field
holds, not what's inside that object:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
private final ElevatorIOInputsAutoLogged m_inputs = new ElevatorIOInputsAutoLogged();
private Distance m_goal = ElevatorConstants.kStowed;
private boolean m_homed = false;
// ...
private void periodic() {
  m_io.updateInputs(m_inputs);
```

`m_inputs` is final, and every tick `updateInputs` fills it with fresh readings: same
object, new contents. `m_goal` and `m_homed` aren't final, because the elevator changes
what they hold.

<details class="quiz" id="q-classes-5" markdown="1">
<summary>Check yourself: `m_inputs` is `final`, yet `updateInputs` changes its readings every tick. How?</summary>

- [ ] It can't; that line wouldn't compile. *It compiles: nothing is reassigning `m_inputs`.*
- [x] `final` only stops the field being pointed at a different object; the object's own fields can still change. *Same bundle every tick, new numbers inside it.*
- [ ] `final` stops changes only after the robot is enabled. *`final` is about the field, and it never depends on the robot's state.*

</details>

<details class="quiz" id="q-classes-6" markdown="1">
<summary>Check yourself: why is the superstructure's `m_state` `private`?</summary>

- [ ] So it runs faster. *`private` has nothing to do with speed.*
- [x] So no other class can set it directly; they have to make a request, which checks the move is legal first. *Keeping it private is what makes the rules impossible to skip.*
- [ ] So it can't change at all. *The superstructure itself changes it; that's what `final` would forbid, not `private`.*

</details>

## 4. Packages, imports and `static`

Every file starts by saying where it lives. **The package at the top of a file has to
match its folder path**: `package first.robot.subsystems;` is the folder
`first/robot/subsystems`. Packages are what let two libraries each have a class with the
same name. To use a class from another package, you **import** it:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from the top of `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.Volts;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
// ...
import first.robot.Constants;
import first.robot.Constants.ElevatorConstants;
```

Most of those lines import a class. The two **`import static`** lines import something
smaller: a single `static` member of a class, here the unit constants `Meters` and
`Volts`, so the code can write `Meters.of(0.02)` instead of `Units.Meters.of(0.02)`.

That brings up **`static`**. A static field or method belongs to the class itself, not to
any one object, so you use it without building anything. The course's helper classes are
nothing *but* static methods, and they make sure nobody builds one by giving the class a
constructor no one can call:

<!-- source: lesson-33 commands/Aim.java -->
*Example, from `Aim.java` ([Lesson 27, section 2](../../lessons/v3/27-aim-at-tag.md#2-a-heading-you-can-compute)):*
```java
public final class Aim {
  private Aim() {} // utility class — never instantiated

  /** How far off that heading the robot currently is, wrapped to ±180°. */
  public static Rotation2d error(Pose2d robot, Translation2d target) {
    return headingToward(robot, target).minus(robot.getRotation());
  }
```

You call it on the class, `Aim.error(pose, target)`, the way you call `Math.abs(x)`.
`Constants` works the same way: its groups are `static` nested classes, so
`ElevatorConstants.kStowed` needs no object either.

<details class="quiz" id="q-classes-7" markdown="1">
<summary>Check yourself: `Elevator.java` sits in the folder `first/robot/subsystems`. What must its first line say?</summary>

- [ ] `package first.robot;` *That's the folder above it; the package has to match the file's own folder.*
- [x] `package first.robot.subsystems;` *The package mirrors the folder path, dots for slashes.*
- [ ] `import first.robot.subsystems;` *An import brings in another class; the package line says where this one lives.*

</details>

<details class="quiz" id="q-classes-8" markdown="1">
<summary>Check yourself: how do you use `Aim.error(...)`?</summary>

- [ ] Build one first: `new Aim().error(...)`. *`Aim`'s constructor is private, so that doesn't compile, and a static method doesn't need an object anyway.*
- [x] Call it on the class: `Aim.error(pose, target)`. *A static method belongs to the class itself.*
- [ ] Import it, then call `error(...)` from anywhere without the class name. *That works only with an `import static` line for it, which the course doesn't use for `Aim`.*

</details>

## 5. Enums: a fixed list of named objects

Some values can only ever be one of a handful of things: the robot is running for real, in
simulation, or replaying a log. An **enum** says exactly that:

<!-- source: lesson-33 Constants.java -->
*Example, from `Constants.java` ([Lesson 13, section 7](../../lessons/v3/13-io-replay.md#7-three-modes-one-switch)):*
```java
public enum Mode { REAL, SIM, REPLAY }
```

`Mode.REAL`, `Mode.SIM` and `Mode.REPLAY` are the only `Mode`s there will ever be. No one
can write `new Mode()` or misspell one into existence: a typo is a compile error, where a
`String` like `"SIM"` would just quietly fail to match.

Each of those names is an object, and an enum is a class, so its constants can carry
fields and methods too. There's just a fixed number of them, one per name you write.
The superstructure's states each know which LED pattern to show:

<!-- source: lesson-33 subsystems/SuperstructureState.java -->
*Example, from `SuperstructureState.java` ([Lesson 24, section 2](../../lessons/v3/24-superstructure.md#2-an-enum-that-knows-more-than-its-name)):*
```java
public enum SuperstructureState {
  UNHOMED(LedConstants.kUnhomed),
  IDLE(LedConstants.kIdle),
  INTAKING(LedConstants.kIntaking),
  HANDOFF(LedConstants.kHandoff),
  HOLDING(LedConstants.kHolding),
  SCORING(LedConstants.kScoring);

  private final LEDPattern m_pattern;

  SuperstructureState(LEDPattern pattern) {
    m_pattern = pattern;
  }

  /** What the strip shows while the robot is in this state. */
  public LEDPattern pattern() {
    return m_pattern;
  }
```

`UNHOMED(LedConstants.kUnhomed)` builds the `UNHOMED` object, passing its pattern to the
constructor. That happens once, when the program starts; after that, `m_state.pattern()`
asks whichever state the robot is in for its colour. Figure 24.1 draws the six states, each
box in the colour its constant was built with.

![A column of six boxes, top to bottom: UNHOMED (red), IDLE (dark blue), INTAKING (yellow), HANDOFF (yellow), HOLDING (green), SCORING (green). Solid black arrows go down the column from IDLE to INTAKING, INTAKING to HANDOFF, HANDOFF to HOLDING and HOLDING to SCORING, and a solid rail on the right brings INTAKING, HANDOFF, HOLDING and SCORING back to IDLE. Dashed blue arrows go from UNHOMED to IDLE, INTAKING to HANDOFF and HANDOFF to HOLDING, and a dashed rail brings HANDOFF, HOLDING and SCORING back to IDLE.](../../lessons/v3/images/24-state-machine.svg)

*Figure 24.1, from [Lesson 24](../../lessons/v3/24-superstructure.md#figure-24-1) — The robot's six states. Solid arrows are the moves `canGoTo` allows a request to make; dashed arrows are the moves `periodic()` makes by itself. Each box is the color its state shows on the LED strip.*

<details class="quiz" id="q-classes-9" markdown="1">
<summary>Check yourself: how many `SuperstructureState` objects exist while the robot runs?</summary>

- [ ] One, the robot's current state. *The current state is a field that holds one of them; all six exist.*
- [x] Exactly six, one per name, built once when the program starts. *An enum has a fixed set of objects, and no one can make more.*
- [ ] One more each time the state changes. *Changing state points `m_state` at a different existing constant; nothing new is built.*

</details>

<details class="quiz" id="q-classes-10" markdown="1">
<summary>Check yourself: why is `Mode` an enum rather than a `String` such as `"SIM"`?</summary>

- [ ] Strings can't be stored in `Constants`. *They can; the course just doesn't want one here.*
- [x] Only the three listed values can exist, so a typo is a compile error instead of a quiet mismatch. *`Mode.SMI` won't build; `"SMI"` would build and never match.*
- [ ] Enums take less memory. *That's not the reason; the point is that the compiler checks every use.*

</details>

## 6. Choosing by enum: `switch`

An enum value almost begs to be asked "which one are you?", and **`switch`** asks it. The
course uses the arrow form, which comes in two flavours.

A **`switch` expression** works out a value. Every elevator picks its hardware this way,
once, when it's built:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism); the pattern is from [Lesson 13, section 7](../../lessons/v3/13-io-replay.md#7-three-modes-one-switch)):*
```java
private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
  case REAL -> new ElevatorIOTalonFX();
  case SIM -> new ElevatorIOSim();
  case REPLAY -> new ElevatorIO() {}; // inputs come from the log
};
```

A switch expression over an enum must cover every constant, or it won't compile. Add a
fourth `Mode` one day and every one of these lines stops building until you've said what
the new mode means, which is exactly what you want.

The same shape answers a yes/no question about each state, using `this`, the state being
asked:

<!-- source: lesson-33 subsystems/SuperstructureState.java -->
*Example, from `SuperstructureState.java` ([Lesson 24, section 3](../../lessons/v3/24-superstructure.md#3-legality-a-rulebook-not-a-sensor-reading)):*
```java
public boolean canGoTo(SuperstructureState next) {
  return switch (this) {
    case UNHOMED -> false;
    case IDLE -> next == INTAKING;
    case INTAKING -> next == HANDOFF || next == IDLE;
    case HANDOFF -> next == HOLDING || next == IDLE;
    case HOLDING -> next == SCORING || next == IDLE;
    case SCORING -> next == IDLE;
  };
}
```

A **`switch` statement** does something instead of working out a value, with a block of
code per case. `case HOLDING, SCORING ->` shares one block between two states:

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java`'s `periodic()` ([Lesson 24, section 4](../../lessons/v3/24-superstructure.md#4-superstructure-legality-and-readiness-are-different-jobs)):*
```java
switch (m_state) {
  case UNHOMED -> {
    if (m_elevator.isHomed()) {
      m_state = SuperstructureState.IDLE;
    }
  }
  // ...
  case HOLDING, SCORING -> {
    if (!hasPiece) {
      m_state = SuperstructureState.IDLE;
    }
  }
  case IDLE -> {
    // Nothing happens here on its own. Somebody has to ask.
  }
}
```

<details class="quiz" id="q-classes-11" markdown="1">
<summary>Check yourself: someone adds a fourth constant, `TEST`, to `Mode`. What happens to `Elevator`'s `m_io` line?</summary>

- [ ] It quietly picks the `REPLAY` arm. *There's no fall-through in an arrow switch.*
- [x] It stops compiling until it has a `case TEST ->` arm. *A switch expression over an enum has to cover every constant.*
- [ ] It compiles, and `m_io` is `null` in test mode. *The compiler refuses the switch before it ever runs.*

</details>

<details class="quiz" id="q-classes-12" markdown="1">
<summary>Check yourself: what does `IDLE.canGoTo(SCORING)` return?</summary>

- [ ] `true`: scoring is always allowed. *From `IDLE` the only legal request is to start intaking.*
- [x] `false`: the `IDLE` arm is `next == INTAKING`, and `SCORING` isn't `INTAKING`. *There's nothing to score from `IDLE`.*
- [ ] It depends on the beam break. *`canGoTo` reads no sensor; it's a rule about the robot, not a reading.*

</details>

## 7. Records: a bundle of values

When all you need is a few values that belong together, a **record** writes most of the
class for you. One camera frame's evidence about where the robot is, is one:

<!-- source: lesson-33 subsystems/VisionIO.java -->
*Example, from `VisionIO.java` ([Lesson 15, section 6](../../lessons/v3/15-limelight.md#6-one-more-io-layer-visionio)):*
```java
public static record PoseObservation(
    double timestampSeconds, Pose2d pose, int tagCount,
    double xStdDevMeters, double yStdDevMeters, double headingStdDevRadians) {
  /** The three trust numbers as one column, the shape addVisionMeasurement takes. */
  public Vector<N3> stdDevs() {
    return VecBuilder.fill(xStdDevMeters, yStdDevMeters, headingStdDevRadians);
  }
}
```

From that one header, Java writes a constructor that takes the six values in order, a
final field for each, and a method to read each one back, named after it:
`observation.pose()`, `observation.tagCount()`. A record's values can't be changed after
it's built, which suits a frame of evidence: what the camera saw doesn't change later. A
record can still have methods of its own, like `stdDevs()`.

<details class="quiz" id="q-classes-13" markdown="1">
<summary>Check yourself: how do you read the pose out of a `PoseObservation` called `observation`?</summary>

- [ ] `observation.getPose()` *A record's readers are named after the value itself, with no `get`.*
- [x] `observation.pose()` *Java writes a method named after each value in the record's header.*
- [ ] `observation.m_pose` *A record's fields are private; you read them through the methods Java writes.*

</details>

<details class="quiz" id="q-classes-14" markdown="1">
<summary>Check yourself: which of these does Java write for you from a record's header?</summary>

- [x] A constructor taking the values in order, a field for each, and a reader method for each. *That's the whole point of a record: the header is the class.*
- [ ] Only the constructor; you write the readers. *Java writes the readers too.*
- [ ] Setter methods to change each value later. *A record's values can't be changed once it's built.*

</details>

## Common mistakes

- **Calling a method on a class when it needs an object**, or building an object to call
  a static method. Ask whether the method is about *one* elevator (call it on
  `robot.elevator`) or about no object at all (call it on the class).
- **Reading `final` as "frozen".** A final field always holds the same object, but that
  object's own contents can change.
- **A field and a parameter with the same name, and no `this`.** `robot = robot;` assigns
  the parameter to itself. With a `final` field Java then refuses to compile, because the
  field was never set; with a non-final one the field is quietly left `null`. Write
  `this.robot = robot;`.
- **A `String` where an enum belongs.** A misspelt string compiles and quietly never
  matches; a misspelt enum constant doesn't compile.
- **A package line that doesn't match the folder.** The file won't compile; move the file
  or fix the line.

## Where this comes from

- **[Lesson 0](../../lessons/v3/00-orientation.md):** packages, classes, methods, and the
  template's `this.robot = robot`.
- **[Lesson 1](../../lessons/v3/01-first-motor.md):** objects and `new`, fields, and
  `Constants`.
- **[Lesson 9](../../lessons/v3/09-autonomous.md):** `static` helper classes, with `Autos`.
- **[Lesson 13](../../lessons/v3/13-io-replay.md):** an enum (`Mode`) and the switch that
  picks hardware.
- **[Lesson 15](../../lessons/v3/15-limelight.md):** a record, `PoseObservation`.
- **[Lesson 24](../../lessons/v3/24-superstructure.md):** an enum with fields, a
  constructor and methods, and switching over it.

## Quick reference

| You write | It means |
|---|---|
| `new Elevator()` | build one object from the class |
| `private final Arm m_arm;` | a field only this class can touch, set once |
| `public Superstructure(Elevator elevator, Arm arm) { ... }` | a constructor: runs once, when `new` builds the object |
| `this.robot = robot;` | store the parameter in the field of the same name |
| `package first.robot.subsystems;` | where this file lives; matches its folder |
| `import org.wpilib.command3.Command;` | use a class from another package |
| `import static org.wpilib.units.Units.Meters;` | use one static member without its class name |
| `static` | belongs to the class, not to any one object |
| `enum Mode { REAL, SIM, REPLAY }` | a type with exactly these values |
| `switch (x) { case A -> ...; }` | do something, or work out a value, depending on which constant `x` is |
| `record PoseObservation(double t, Pose2d pose) {}` | a bundle of values, with its constructor and readers written for you |
