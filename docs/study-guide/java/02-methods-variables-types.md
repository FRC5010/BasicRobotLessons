# Methods, variables and types

Every value in Java has a type, every variable lives somewhere for a while, and methods are
named pieces of work that take values in and hand one back.

The examples on this page come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise. Each one
links to the lesson section where you write it. You don't need to have got that far: each
example says what it leans on.

## 1. Types: plain numbers and objects

Java wants to know what kind of value every variable holds, and it checks every use against
that. A few types are built into the language and hold a plain value: **`int`** for whole
numbers, **`double`** for numbers with a fractional part, **`boolean`** for `true` or
`false`. These are the **primitive** types, and they're written in lower case. Everything
else is an **object** type, named after its class and written with a capital: `TalonFX`,
`Pose2d`, `Distance`.

The elevator's constants use both kinds:

<!-- source: lesson-33 Constants.java -->
*Example, from `Constants.java` ([Lesson 18, section 3](../../lessons/v3/18-elevator.md#3-the-feedforward-model-computed-from-the-motors-numbers)):*
```java
public static final class ElevatorConstants {
  public static final int kMotorPort = 20; // CAN ID — change to yours
  public static final double kGearRatio = 12.0; // motor rotations per drum rotation
  public static final Distance kDrumRadius = Inches.of(1.0);
  public static final Mass kCarriageMass = Kilograms.of(5.0); // carriage + anything riding on it
  // ...
  public static final double kElevatorKG = 0.17; // volts to hold position against gravity
```

A CAN ID is a whole number, so `int`. A gear ratio is a plain number with no unit, so
`double`. A radius is a length, so it's a `Distance` object that knows its unit
([section 8](#8-measures-numbers-that-know-their-unit) is about those). The gains stay
`double`, with the unit in the comment.

<details class="quiz" id="q-types-1" markdown="1">
<summary>Check yourself: which of these is a primitive type?</summary>

- [ ] `Distance` *It starts with a capital: it's a class, so a `Distance` is an object.*
- [x] `double` *A primitive holds a plain value, and its name is lower case.*
- [ ] `Pose2d` *A pose is an object, built from a class.*

</details>

<details class="quiz" id="q-types-2" markdown="1">
<summary>Check yourself: why is `kGearRatio` a `double` and not a `Distance`?</summary>

- [ ] Gear ratios are always whole numbers. *Then it would be an `int`; 12.0 just happens to be whole.*
- [x] A gear ratio has no unit: it's motor rotations per drum rotation, a plain number. *Measures are for values with a unit, like a length.*
- [ ] Constants can't be objects. *`kDrumRadius` is a constant and an object.*

</details>

## 2. Methods: values in, a value out

A **method** is a named piece of work. Its header says what it needs and what it hands
back: the return type, then the name, then the **parameters** in brackets. The body
works the answer out, and **`return`** hands it back.

<!-- source: lesson-33 commands/Aim.java -->
*Example, from `Aim.java` ([Lesson 27, section 2](../../lessons/v3/27-aim-at-tag.md#2-a-heading-you-can-compute)):*
```java
/** How far off that heading the robot currently is, wrapped to ±180°. */
public static Rotation2d error(Pose2d robot, Translation2d target) {
  return headingToward(robot, target).minus(robot.getRotation());
}
```

`error` takes a `Pose2d` and a `Translation2d`, and hands back a `Rotation2d`. A caller
writes `Aim.error(pose, target)` and gets the answer in its place. Notice it calls another
method, `headingToward`, and uses *its* answer: methods are built out of other methods.

A method that only *does* something and hands nothing back has the return type **`void`**,
like every mechanism's `periodic()`. A method with no parameters still needs its empty
brackets, both where it's written and where it's called:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 10](../../lessons/v3/18-elevator.md#10-tune-it-while-it-runs)):*
```java
public boolean atGoal() {
  return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < m_tolerance.get().in(Meters);
}
```

Two methods can share a name if they take different parameters: that's **overloading**,
and Java picks the one whose parameters match what you pass. You'll meet it in libraries
more than you write it. B-Line's `FollowPath.registerEventTrigger` takes either a
`Runnable` or a `Command` as its second argument. <!-- claim: bline.register-event-trigger -->

<details class="quiz" id="q-types-3" markdown="1">
<summary>Check yourself: what does `atGoal()` hand back?</summary>

- [ ] Nothing: it's `void`. *Its header says `boolean`, and its body returns one.*
- [x] A `boolean`: `true` when the elevator is within its tolerance of the goal. *The comparison with `<` works out to `true` or `false`, and `return` hands it back.*
- [ ] The elevator's height. *That's `getHeightMeters()`; `atGoal` answers a yes/no question.*

</details>

<details class="quiz" id="q-types-4" markdown="1">
<summary>Check yourself: what does `void` in front of a method's name mean?</summary>

- [ ] The method does nothing. *A `void` method can do plenty; it just hands nothing back.*
- [x] It hands no value back to whoever called it. *You call it for what it does, not for an answer.*
- [ ] It takes no parameters. *Parameters go in the brackets after the name; `void` is about the return.*

</details>

## 3. Locals, fields and where a variable lives

A **local variable** is declared inside a method, and exists only while that method runs.
A **field** is declared in the class, outside any method, and lasts as long as the object.
Here are three locals, each holding a step of the working:

<!-- source: lesson-33 commands/Aim.java -->
*Example, from `Aim.java` ([Lesson 27, section 5](../../lessons/v3/27-aim-at-tag.md#5-tell-it-whats-coming)):*
```java
public static double bearingRate(
    Pose2d robot, ChassisVelocities fieldSpeeds, Translation2d target) {
  Translation2d offset = target.minus(robot.getTranslation());
  double distanceSquared = offset.getX() * offset.getX() + offset.getY() * offset.getY();
  if (distanceSquared < 1e-6) {
    return 0.0; // standing on the target: the bearing is meaningless, not fast
  }
  return (fieldSpeeds.vx * offset.getY() - fieldSpeeds.vy * offset.getX()) / distanceSquared;
}
```

`offset` and `distanceSquared` are born on their lines and gone when the method returns;
the next call starts fresh. The parameters `robot`, `fieldSpeeds` and `target` are locals
too, filled in by the caller. Something the elevator has to remember from one tick to the
next, like its goal, can't be a local: it has to be a field, such as `m_goal`.

Notice the `return 0.0` inside the `if`. A `return` ends the method right there, so the
last line never runs when the robot is standing on the target, and so it never divides
by (nearly) zero. Returning early like that is how the course handles a special case
before the general one.

<details class="quiz" id="q-types-5" markdown="1">
<summary>Check yourself: how long does `distanceSquared` exist?</summary>

- [x] Only while that one call to `bearingRate` runs. *It's a local: it's made on its line and gone when the method returns.*
- [ ] As long as the `Aim` class is loaded. *That's how long a static field lasts, not a local.*
- [ ] Until the next tick. *Nothing carries it over; the next call makes a new one.*

</details>

<details class="quiz" id="q-types-6" markdown="1">
<summary>Check yourself: the robot is standing on the target, so `distanceSquared` is tiny. What does `bearingRate` do?</summary>

- [ ] Divides by it anyway and returns a huge number. *The `if` catches this case first.*
- [x] Returns 0.0 from inside the `if`, and never reaches the last line. *A `return` ends the method on the spot.*
- [ ] Runs both returns and adds them. *A method returns once; the first `return` it reaches ends it.*

</details>

## 4. Deciding: `if`, `else` and `?:`

**`if`** runs its block only when its condition is `true`; **`else`** gives the other case
something to do; **`else if`** chains more cases between them. Exactly one block runs:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 18, section 8](../../lessons/v3/18-elevator.md#8-the-elevator-mechanism)):*
```java
/** Keeps 'target' inside [kMinHeight, kMaxHeight] — there's no MathUtil.clamp to reach for here. */
private static Distance clampToTravel(Distance target) {
  if (target.gt(ElevatorConstants.kMaxHeight)) {
    return ElevatorConstants.kMaxHeight;
  } else if (target.lt(ElevatorConstants.kMinHeight)) {
    return ElevatorConstants.kMinHeight;
  } else {
    return target;
  }
}
```

(The comment is right: this WPILib has no `MathUtil.clamp`, so the course writes its own
clamps. <!-- claim: wpilib.no-mathutil-clamp -->)

When all you need is to pick one of two *values*, the **`?:`** operator does it in one
expression: `condition ? valueIfTrue : valueIfFalse`. The elevator's drawing turns green
on arrival this way:

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java`'s `periodic()` ([Lesson 19, section 5](../../lessons/v3/19-mechanism2d.md#5-move-it-then-log-it)):*
```java
m_carriage.setColor(
    atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
```

Conditions combine with **`&&`** (and), **`||`** (or) and **`!`** (not). `&&` stops as soon
as it meets a `false`, and `||` as soon as it meets a `true`, so the right-hand side may
never be looked at.

<details class="quiz" id="q-types-7" markdown="1">
<summary>Check yourself: `clampToTravel` is asked for 2 m, and the top of travel is 1.5 m. Which line runs?</summary>

- [x] `return ElevatorConstants.kMaxHeight;` *2 m is greater than the maximum, so the first condition is true and that block runs.*
- [ ] `return target;` *The `else` block only runs when neither condition above it is true.*
- [ ] Both the first and the last return. *Exactly one block of an `if`/`else if`/`else` chain runs.*

</details>

<details class="quiz" id="q-types-8" markdown="1">
<summary>Check yourself: what does `atGoal() ? kAtGoalColor : kMovingColor` give when the elevator is still moving?</summary>

- [ ] `kAtGoalColor` *That's the value for when the condition is true.*
- [x] `kMovingColor` *`atGoal()` is false, so `?:` gives the value after the colon.*
- [ ] `false` *`?:` gives one of the two values, not the condition.*

</details>

## 5. Repeating: loops, arrays and lists

An **array** holds a fixed number of values of one type, numbered from 0. The drivetrain's
four modules are one:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 7, section 3](../../lessons/v3/07-four-modules.md#3-build-the-drivetrain-with-an-array) for the array, [Lesson 9, section 2](../../lessons/v3/09-autonomous.md#2-add-drivedistance-to-the-drivetrain) for `driveDistance`):*
```java
private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
    m_modules[0].location,
    m_modules[1].location,
    m_modules[2].location,
    m_modules[3].location);
// ...
public Command driveDistance(double meters) {
  return run(coroutine -> {
        m_modules[0].resetDrivePosition(); // zero one wheel's odometer
        while (Math.abs(m_modules[0].getDistanceMeters()) < Math.abs(meters)) {
          for (SwerveModule module : m_modules) {
            module.setDesiredState(
                new SwerveModuleVelocity(DriveConstants.kMaxSpeed.times(0.4), Rotation2d.fromDegrees(0)));
          }
          coroutine.yield();
        }
      })
```

`m_modules[0]` is the first module, `m_modules[3]` the fourth. Two loops sit in that
command:

- **`while (condition) { ... }`** checks the condition first, and goes round for as long
  as it's true. It might not go round at all.
- **`for (SwerveModule module : m_modules) { ... }`**, the enhanced `for`, goes round once
  per item, with `module` holding each one in turn. No counting needed.

A third loop checks at the *end*. **`do { ... } while (condition);`** always goes round at
least once, which suits a command that has to send at least one instruction before it can
ask whether it has arrived:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java`'s `approach` ([Lesson 26, section 8](../../lessons/v3/26-drive-to-pose.md#8-stage-two-arriving)):*
```java
do {
  followLine(start, direction, target, current);
  coroutine.yield();
  current = pose.get();
} while (!arrived(start, direction, current));
```

A **`List`** is like an array that can be any length, and grow or shrink. The scheduler
hands you one when you ask what's running on a mechanism, and it can be empty:

<!-- source: lesson-1 Robot.java -->
*Example, from Lesson 1's `Robot.java` ([Lesson 1, section 8](../../lessons/v3/01-first-motor.md#8-see-whats-running)):*
```java
List<Command> running = Scheduler.getDefault().getRunningCommandsFor(module);
if (running.isEmpty()) {
  Telemetry.log("DriveModule/CurrentCommand", "none");
} else {
  Command current = running.get(0);
  Telemetry.log("DriveModule/CurrentCommand", current.name());
}
```

`running.get(0)` is the first item, like `m_modules[0]`. The `isEmpty()` check is not
optional: while nothing runs, the list is empty, and asking an empty list for item 0
crashes the program. <!-- claim: commandsv3.running-commands-for -->

<details class="quiz" id="q-types-9" markdown="1">
<summary>Check yourself: how many times does a `do { ... } while (...)` loop go round if its condition is false from the start?</summary>

- [ ] Zero. *That's a `while` loop, which checks first.*
- [x] Once: it runs the block, then checks. *A `do`/`while` checks at the end, so the block always runs at least once.*
- [ ] Forever. *A false condition ends the loop the first time it's checked.*

</details>

<details class="quiz" id="q-types-10" markdown="1">
<summary>Check yourself: nothing is running on the drive module, and the code calls `running.get(0)` without checking. What happens?</summary>

- [ ] It returns `null`. *A `List` doesn't hand back `null` for a missing item; it refuses.*
- [x] The program crashes: there's no item 0 in an empty list. *That's why the code checks `isEmpty()` first.*
- [ ] It waits until a command starts. *Nothing waits; the call fails at once.*

</details>

## 6. Maybe nothing: `Optional`

Some questions don't always have an answer. Which way is it from here to a point, if
you're standing *on* it? Where is tag 220, on a field with 32 tags? A method can hand back
an **`Optional`**: a box that either holds a value or is empty, and makes you say what to do
when it's empty.

<!-- source: lesson-33 commands/Aim.java -->
*Example, from `Aim.java` ([Lesson 27, section 2](../../lessons/v3/27-aim-at-tag.md#2-a-heading-you-can-compute)):*
```java
/**
 * Where a tag sits on the field, from the layout that was loaded in Lesson 15.
 * Empty when that ID is not on this field, which is what a typo looks like.
 */
public static Optional<Translation2d> tagPosition(int tagId) {
  return VisionConstants.kTagLayout.getTagPose(tagId)
      .map(pose -> pose.getTranslation().toTranslation2d());
}

/** Which way the robot would have to face to look straight at the target. */
public static Rotation2d headingToward(Pose2d robot, Translation2d target) {
  // The arrow from the robot to the target. It's empty when the arrow has no
  // length: standing on the target, no way is "toward" it. Keep facing as you are.
  return target.minus(robot.getTranslation()).getAngle().orElse(robot.getRotation());
}
```

`getTagPose(id)` hands back an empty `Optional` for an ID that isn't on the field, <!-- claim: wpilib.field-tag-20-position -->
and `getAngle()` an empty one for an arrow with no length. <!-- claim: wpilib.translation-angle-optional -->
Two calls do the work:

- **`.map(...)`** changes what's inside, if anything is: a tag's 3D pose becomes a 2D
  position. An empty box stays empty.
- **`.orElse(value)`** opens the box, using `value` if it's empty.

<details class="quiz" id="q-types-11" markdown="1">
<summary>Check yourself: `tagPosition(220)` is asked about a tag that isn't on the field. What comes back?</summary>

- [ ] `null`. *The method hands back an `Optional`, which is never `null` here.*
- [x] An empty `Optional`. *`getTagPose` is empty for that ID, and `.map` leaves an empty box empty.*
- [ ] A crash. *Nothing fails: an empty `Optional` is how "no such tag" is said.*

</details>

<details class="quiz" id="q-types-12" markdown="1">
<summary>Check yourself: in `headingToward`, what does `.orElse(robot.getRotation())` do?</summary>

- [x] Uses the robot's own heading when there's no direction toward the target. *Standing on the target, the arrow has no length, so `getAngle()` is empty.*
- [ ] Always replaces the answer with the robot's heading. *It's used only when the `Optional` is empty.*
- [ ] Turns the robot to face its own heading. *It works out a value; nothing moves.*

</details>

## 7. Asking what something is: `instanceof`

Sometimes a value could be one of several types, and you need to know which. The scheduler
reports every event to a listener as a `SchedulerEvent`, and only some of those events are
a command being scheduled. **`instanceof`** asks; written with a name after it, it also
hands you the value as that type:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 3, section 6](../../lessons/v3/03-telemetry.md#6-listening-instead-of-asking)):*
```java
private void logCommandStart(SchedulerEvent event) {
  if (event instanceof SchedulerEvent.Scheduled scheduled) {
    for (Mechanism mechanism : scheduled.command().requirements()) {
      Logger.recordOutput(mechanism.getName() + "/CurrentCommand", scheduled.command().name());
    }
  }
}
```

Inside the `if`, `scheduled` is the same event, typed as a `SchedulerEvent.Scheduled`, so
`scheduled.command()` is allowed. <!-- claim: commandsv3.scheduler-events --> Other kinds of
event skip the block.

<details class="quiz" id="q-types-13" markdown="1">
<summary>Check yourself: what does `event instanceof SchedulerEvent.Scheduled scheduled` do?</summary>

- [ ] Turns any event into a `Scheduled` one. *It only asks; an event of another kind stays what it is, and the check is false.*
- [x] Checks whether the event is a `Scheduled` one, and if so, names it `scheduled` with that type. *So the block can call `scheduled.command()`.*
- [ ] Builds a new `Scheduled` event. *Nothing is built; it's a question about an existing value.*

</details>

<details class="quiz" id="q-types-14" markdown="1">
<summary>Check yourself: why can't the code just call `event.command()`?</summary>

- [ ] It could; `instanceof` is only there for speed. *Not every kind of event has a command, so Java won't allow it on a plain `SchedulerEvent`.*
- [x] Only a `Scheduled` event is known to have `command()`, so the code has to ask which kind it has first. *The checked name, `scheduled`, has the right type.*
- [ ] `command()` only works on the robot thread. *The issue is the type, not the thread.*

</details>

## 8. Measures: numbers that know their unit

A `double` called `height` doesn't say whether it's in metres or inches, and a mistake
there doesn't fail to compile: the robot just drives the wrong distance. The course's
early lessons put the unit in the name (`kWheelDiameterMeters`). WPILib's **units library**
puts it in the type instead: a `Distance` is a length, whatever unit you wrote it in. You
first meet it in [Lesson 3](../../lessons/v3/03-telemetry.md#1-motors-that-know-where-they-are),
unpacking a motor's readings with `.in(Rotations)`; from
[Lesson 10](../../lessons/v3/10-kinematics.md#2-build-the-kinematics-object) on, the course
keeps its own constants as measures too. <!-- claim: wpilib.units-package-and-rotations -->

- **Build one** from a unit: `Meters.of(0.75)`, `Inches.of(1.0)`, `MetersPerSecond.of(1.0)`.
- **Scale one** and it stays a measure: `kMaxSpeed.times(0.4)` is still a `LinearVelocity`.
- **Unpack one** to a plain `double` in the unit you ask for: `m_goal.in(Meters)`. <!-- claim: wpilib.units-measure-arithmetic -->

The elevator's `atGoal()` (section 2) unpacks twice, because it's doing arithmetic with a
reading that's already a plain `double` in metres. `clampToTravel` (section 4) never
unpacks: it compares measures with **`.gt(...)`** and **`.lt(...)`**, greater and less
than, because `>` and `<` only work on primitives.

The rule the course follows: keep a value as a measure for as long as you can, pass it
straight to WPILib methods that take measures, and unpack it with `.in(...)` only where
something needs a plain number, such as a motor controller call. Gains and gear ratios
have no single unit, so they stay `double`.

<details class="quiz" id="q-types-15" markdown="1">
<summary>Check yourself: `m_goal` is `Meters.of(0.75)`. What is `m_goal.in(Meters)`?</summary>

- [x] The plain `double` 0.75. *`.in(unit)` unpacks a measure into a number in that unit.*
- [ ] A new `Distance` in metres. *`.in(...)` gives a `double`, not a measure.*
- [ ] 75, because it's converted to centimetres. *You asked for metres, so it's 0.75.*

</details>

<details class="quiz" id="q-types-16" markdown="1">
<summary>Check yourself: why does `clampToTravel` write `target.gt(kMaxHeight)` instead of `target > kMaxHeight`?</summary>

- [ ] `gt` is faster. *Speed isn't the reason.*
- [x] `target` and `kMaxHeight` are `Distance` objects, and `>` only works on primitive numbers. *A measure compares with its own methods, whatever units the two sides were written in.*
- [ ] `>` would compare them in inches. *`>` doesn't compile on measures at all.*

</details>

## Common mistakes

- **Forgetting the brackets on a call.** `atGoal` names the method; `atGoal()` calls it.
- **Keeping something in a local that has to outlive the call.** A local is gone when the
  method returns; anything the object must remember belongs in a field.
- **Asking an empty list for item 0.** Check `isEmpty()` first ([section 5](#5-repeating-loops-arrays-and-lists)).
- **`.get()` on an `Optional` without asking.** An empty one fails. Say what to do when it's
  empty with `.orElse(...)`, or change what's inside with `.map(...)`.
- **Unpacking a measure too early,** then passing the number around. The unit is gone, and
  so is the compiler's help. Keep the measure and unpack it at the last moment.
- **`>` or `==` between measures.** Use `.gt(...)`, `.lt(...)` and their friends.

## Where this comes from

- **[Lesson 0](../../lessons/v3/00-orientation.md):** methods, and `void` methods the
  framework calls.
- **[Lesson 1](../../lessons/v3/01-first-motor.md):** variables, types, `if`/`else`, and a
  `List` from the scheduler.
- **[Lesson 3](../../lessons/v3/03-telemetry.md):** `instanceof`, in the scheduler's event
  listener, and the first measures, unpacked with `.in(...)`.
- **[Lesson 5](../../lessons/v3/05-steering-p-control.md):** a method you write to work an
  answer out, and the first `clamp`.
- **[Lesson 7](../../lessons/v3/07-four-modules.md):** arrays and the enhanced `for`.
- **[Lesson 10](../../lessons/v3/10-kinematics.md):** constants and parameters kept as
  measures.
- **[Lesson 26](../../lessons/v3/26-drive-to-pose.md):** the course's first `do`/`while`.
- **[Lesson 27](../../lessons/v3/27-aim-at-tag.md):** `Optional`, from the tag layout.

## Quick reference

| You write | It means |
|---|---|
| `int`, `double`, `boolean` | the primitive types: a whole number, a number, true or false |
| `double x = 2.0;` | a local variable, gone when the method returns |
| `public double f(Pose2d p) { return ...; }` | a method taking a `Pose2d` and handing back a `double` |
| `void` | a method that hands nothing back |
| `if (a) { ... } else if (b) { ... } else { ... }` | exactly one block runs |
| `a ? x : y` | `x` if `a` is true, otherwise `y` |
| `while (a) { ... }` | check, then go round while `a` is true |
| `do { ... } while (a);` | go round once, then while `a` is true |
| `for (SwerveModule m : modules) { ... }` | once per item |
| `modules[0]`, `list.get(0)` | the first item |
| `list.isEmpty()` | true when the list has no items |
| `optional.map(...)`, `.orElse(x)` | change what's inside; use `x` when it's empty |
| `x instanceof Kind k` | is `x` a `Kind`? If so, call it `k` |
| `Meters.of(0.75)`, `.times(0.4)`, `.in(Meters)` | build a measure, scale it, unpack it |
| `a.gt(b)`, `a.lt(b)` | compare two measures |
