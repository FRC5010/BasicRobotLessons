# Annotations

An annotation is a label that starts with `@`. It runs no code itself: something else reads
it and acts on it, whether that's the compiler, the robot framework, a tool that writes code
for you, or the test runner.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. Each one
links to the lesson section where you write it.

## 1. A label that something else reads

You've typed one in almost every file: **`@Override`**, above a method that replaces one the
class already has. The annotation doesn't change what the method does. It's a note to the
**compiler**, which checks it: if no parent class or interface has a method by that name to
replace, the build fails, instead of quietly adding a method nothing calls.

<!-- source: lesson-33 subsystems/Flywheel.java -->
*Example, from `Flywheel.java` ([Lesson 28, section 5](../../lessons/v3/28-flywheel.md#5-a-picture-of-a-number)):*
```java
@Override
public Command idle() {
  return spinUp(m_idleSpeed); // the idle speed's tunable
}
```

That's the pattern for every annotation in the course: **an annotation is information, and
the question is always who reads it.** For `@Override` it's the compiler. The rest of this
page is three more readers. ([Inheritance and interfaces](03-inheritance-interfaces.md#1-extending-a-class)
has more on overriding itself.)

<details class="quiz" id="q-annotations-1" markdown="1">
<summary>Check yourself: what does `@Override` above `idle()` do to the method?</summary>

- [ ] Makes it run every tick. *An annotation runs no code; when `idle()` runs is up to whoever calls it.*
- [x] Nothing to the method itself; it asks the compiler to check that it really replaces an existing `idle()`. *If there were nothing to replace, the build would fail.*
- [ ] Hides the interface's version for good, everywhere. *Overriding happens because the method has the same name and parameters; the annotation only checks it.*

</details>

<details class="quiz" id="q-annotations-2" markdown="1">
<summary>Check yourself: which of these is true of every annotation in the course?</summary>

- [ ] Each one runs a little code when the line is reached. *None runs code itself.*
- [x] Each one is read by something else (the compiler, the framework, a code generator or the test runner), which then acts on it. *The annotation is the information; the reader does the work.*
- [ ] They're comments, and are thrown away when the code compiles. *A comment is ignored; an annotation is read, and some are kept for the running program to find.*

</details>

## 2. Opmode annotations: the framework reads them

**`@Teleop`**, **`@Autonomous`** and **`@Utility`** sit above a whole class. The robot framework
looks for classes carrying them when the program starts, and offers each one on the Driver
Station's (or SimGUI's) opmode list, under its mode. <!-- claim: wpilib.opmode-annotation-class-name -->

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java` (the template's shape, met in [Lesson 0, section 1](../../lessons/v3/00-orientation.md#1-what-am-i-even-looking-at)):*
```java
@Teleop
public class RobotTeleop extends PeriodicOpMode {
```

With nothing in brackets, the opmode is listed by its class name, `RobotTeleop`. <!-- claim: wpilib.opmode-annotation-class-name -->
An annotation can also carry **values**, written `name = value` inside brackets. These give
the opmode a friendlier name and a group to sit in:

<!-- source: lesson-33 opmode/RobotAutoBox.java -->
*Example, from `RobotAutoBox.java` ([Lesson 9, section 7](../../lessons/v3/09-autonomous.md#7-bonus-a-second-autonomous-routine)):*
```java
@Autonomous(name = "Do Nothing", group = "Group 1")
public class RobotAutoBox extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoBox(Robot robot) {
    this.robot = robot;
    // An empty auto — nothing scheduled at all.
  }
```

That's how Lesson 9 adds a second autonomous routine with no chooser code at all: one more
small class, one more line on the list.

<details class="quiz" id="q-annotations-3" markdown="1">
<summary>Check yourself: how does `RobotTeleop` end up on SimGUI's list of teleoperated opmodes?</summary>

- [ ] `Robot` builds it and adds it in its constructor. *Nothing in `Robot` mentions it; the framework finds it.*
- [x] The framework looks for classes marked `@Teleop` and lists each one. *The annotation is what it looks for.*
- [ ] Its name ends in "Teleop". *The name is only what's shown; the annotation is what gets it found.*

</details>

<details class="quiz" id="q-annotations-4" markdown="1">
<summary>Check yourself: what name does SimGUI show for the opmode marked `@Autonomous(name = "Do Nothing", group = "Group 1")`?</summary>

- [ ] `RobotAutoBox` *That's what it would show with no `name` given.*
- [x] Do Nothing *The `name` value replaces the class name on the list.*
- [ ] Group 1 *That's the group it's listed in, not its name.*

</details>

## 3. When an annotation isn't enough

The framework builds an annotated opmode itself, through a public constructor that takes
either nothing or the `Robot`, and it has no way to hand the constructor anything
else. <!-- claim: wpilib.opmode-scan-constructor --> That's fine for a class that knows what it
does. The path autos are one class,
`PathAuto`, that needs to be told *which path* to drive, and the scan has no way to know
that. So `PathAuto` has no annotation at all, and `Robot` registers each auto by hand,
saying in code what the annotation's values would have said: <!-- claim: wpilib.add-opmode-needs-second-publish -->

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java`'s constructor ([Lesson 25, section 2](../../lessons/v3/25-path-events.md#2-one-class-every-path-auto)):*
```java
addOpMode(RobotMode.AUTONOMOUS, "Two Corners", "Paths",
    () -> new PathAuto(this, "TwoCorners", path -> Autos.followPath(pathBuilder, path)));
```

`RobotMode.AUTONOMOUS`, `"Two Corners"` and `"Paths"` are the mode, the name and the group:
exactly what `@Autonomous(name = "Two Corners", group = "Paths")` would have said. The last
argument is the part an annotation can't give: how to build this opmode. The same
`PathAuto` class serves every path, each time with a different path name.

<details class="quiz" id="q-annotations-5" markdown="1">
<summary>Check yourself: why doesn't `PathAuto` carry an `@Autonomous` annotation?</summary>

- [ ] Annotations only work on teleoperated opmodes. *`@Autonomous` is an annotation too.*
- [x] Each path auto needs a different path, and the framework's scan can't hand a constructor a path. *So `Robot` registers each one with `addOpMode`, saying which path.*
- [ ] It forgot one, and it still works by accident. *It's left off on purpose; with one, the scan would try to build it and couldn't.*

</details>

<details class="quiz" id="q-annotations-6" markdown="1">
<summary>Check yourself: in that `addOpMode(...)` call, which part does an annotation have no way to say?</summary>

- [ ] The mode, `RobotMode.AUTONOMOUS`. *The annotation's own name says that: `@Autonomous`.*
- [ ] The name and the group. *Those are an annotation's `name` and `group` values.*
- [x] The lambda that builds the opmode with a particular path. *An annotation holds fixed values, not code.*

</details>

## 4. `@AutoLog`: a tool writes code for you

Some annotations are read by tools that run while your project compiles. **`@AutoLog`** is
AdvantageKit's. Put it on an inputs class, and its annotation processor writes a whole new
class next to it, `…InputsAutoLogged`: a subclass that knows how to write every field to the
log and read it back in a replay. <!-- claim: advantagekit.autolog-generates-class -->

<!-- source: lesson-33 subsystems/ElevatorIO.java -->
*Example, from `ElevatorIO.java` ([Lesson 18, section 5](../../lessons/v3/18-elevator.md#5-the-contract-elevatorio); first in [Lesson 13, section 3](../../lessons/v3/13-io-replay.md#3-the-contract-moduleio)):*
```java
public interface ElevatorIO {
  @AutoLog
  public static class ElevatorIOInputs {
    public double heightMeters = 0.0;
    public double velocityMetersPerSec = 0.0;
    public double appliedVolts = 0.0;
    // ...
    public boolean atBottomLimit = false;
    public boolean motorConnected = false;
  }
```

You never see the generated class's source (it's written under `build/`), but you use it by
name. The elevator builds one, and hands it to the logger:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
private final ElevatorIOInputsAutoLogged m_inputs = new ElevatorIOInputsAutoLogged();
// ...
private void periodic() {
  m_io.updateInputs(m_inputs);
  Logger.processInputs("Elevator", m_inputs); // every reading, under Elevator/
```

Each field is logged under the key, named after the field with its first letter
capitalised: `heightMeters` becomes `Elevator/HeightMeters`. <!-- claim: advantagekit.autolog-key-names -->
Add a field to `ElevatorIOInputs` and the next build regenerates the class to match, so
there's nothing to keep in step by hand. <!-- claim: advantagekit.autolog-generates-class -->

<details class="quiz" id="q-annotations-7" markdown="1">
<summary>Check yourself: where does `ElevatorIOInputsAutoLogged` come from?</summary>

- [ ] You write it, next to `ElevatorIO`. *Nobody writes it by hand.*
- [x] AdvantageKit's annotation processor writes it while the project compiles, because of `@AutoLog`. *It's generated code, kept under `build/`.*
- [ ] It's part of WPILib. *It's made for your own inputs class; WPILib couldn't know its fields.*

</details>

<details class="quiz" id="q-annotations-8" markdown="1">
<summary>Check yourself: you add `public double supplyCurrentAmps` to `ElevatorIOInputs`. What do you have to change in `ElevatorIOInputsAutoLogged`?</summary>

- [x] Nothing: the next build regenerates it with the new field, logged as `Elevator/SupplyCurrentAmps`. *That's the point of letting a tool write it.*
- [ ] Add a line to log the new field. *The generated class is rewritten for you on every build.*
- [ ] Delete it so it's rebuilt. *Building again is enough.*

</details>

## 5. `@Test`: the test runner reads it

**`@Test`**, from JUnit, marks a method as a test. When you run the project's tests, JUnit
finds every method carrying it and runs each one, reporting which passed and which
failed. <!-- claim: gradlerio.test-task-config -->

<!-- source: lesson-33 test/first/robot/SuperstructureStateTest.java -->
*Example, from `SuperstructureStateTest.java` ([Lesson 31, section 3](../../lessons/v3/31-testing.md#3-a-first-test-with-no-robot-in-it)):*
```java
public class SuperstructureStateTest {

  @Test
  void scoringRequiresSomethingToScore() {
    assertFalse(IDLE.canGoTo(SCORING), "cannot score with nothing on board");
    assertFalse(INTAKING.canGoTo(SCORING), "cannot score mid-intake");
    assertTrue(HOLDING.canGoTo(SCORING), "holding a piece is exactly when you can");
  }
```

Nothing in the robot program ever calls `scoringRequiresSomethingToScore()`. The annotation is
the only reason it runs at all. A test method takes no arguments and returns nothing, and its
name is written as the claim it checks, because when it fails the name is the first thing
you'll see.

<details class="quiz" id="q-annotations-9" markdown="1">
<summary>Check yourself: nothing in the robot code calls `scoringRequiresSomethingToScore()`. How does it ever run?</summary>

- [ ] The robot runs it at startup. *The robot program never runs tests.*
- [x] When you run the tests, JUnit finds every method marked `@Test` and runs each one. *The annotation is how JUnit knows it's a test.*
- [ ] It doesn't; it's an example. *It runs every time the tests run.*

</details>

<details class="quiz" id="q-annotations-10" markdown="1">
<summary>Check yourself: you delete `@Test` from that method but leave the method. What happens?</summary>

- [ ] The test still runs, because it's in the test folder. *JUnit runs only methods marked as tests.*
- [x] It never runs, and nothing reports it missing. *The method still compiles; JUnit just doesn't know it's a test.*
- [ ] The project stops compiling. *Removing an annotation from an ordinary method is fine to the compiler.*

</details>

## Common mistakes

- **Expecting an annotation to run code.** It's a label. If nothing reads it, it does nothing.
- **Leaving `@Override` off.** A misspelt method then compiles as a new method nothing calls.
- **Annotating a class the framework can't build.** An opmode the scan finds needs a public
  constructor that takes nothing or the `Robot`; one that needs more is registered with
  `addOpMode` instead.
- **Editing or looking for the `…AutoLogged` class.** It's rewritten on every build. Change the
  inputs class it's made from.
- **A test without `@Test`.** It compiles and silently never runs.

## Where this comes from

- **[Lesson 0](../../lessons/v3/00-orientation.md):** `@Teleop` and `@Override`, in the
  template.
- **[Lesson 9](../../lessons/v3/09-autonomous.md):** `@Autonomous` with a name and a group.
- **[Lesson 13](../../lessons/v3/13-io-replay.md):** `@AutoLog`, a tool that writes code.
- **[Lesson 25](../../lessons/v3/25-path-events.md):** registering opmodes with `addOpMode`
  instead of an annotation.
- **[Lesson 31](../../lessons/v3/31-testing.md):** `@Test`, and running the tests.
- **[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md):** `@Utility`, for an opmode that
  isn't for a match.

## Quick reference

| You write | Who reads it | What happens |
|---|---|---|
| `@Override` | the compiler | the build fails if there's nothing to replace |
| `@Teleop`, `@Autonomous`, `@Utility` | the robot framework | the class is listed as an opmode of that mode |
| `@Autonomous(name = "Do Nothing", group = "Group 1")` | the robot framework | listed under that name, in that group |
| `@AutoLog` | AdvantageKit's annotation processor | writes `…InputsAutoLogged` as the project compiles |
| `@Test` | JUnit | the method runs as a test |
