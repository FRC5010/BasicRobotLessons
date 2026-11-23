# Joystick controls

The driver's controller is a handful of numbers and buttons that the robot reads every tick:
sticks that report how far they're pushed, and buttons that are either pressed or not.

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise, and each
one links to the lesson section where you write it. Binding a command to a button is on the
[Commands and triggers](../frc-framework/03-commands-triggers.md#6-triggers-when-a-command-starts-and-stops)
page; this page is about what the controller reports.

## 1. The controller in code

The controller is one object, built once in `Robot` so every opmode can use it:

<!-- source: lesson-33 Robot.java -->
*Example, from `Robot.java` ([Lesson 1, section 4](../../lessons/v3/01-first-motor.md#4-give-the-robot-its-hardware)):*
```java
public final CommandGamepad driverController = new CommandGamepad(0);
```

The `0` is the controller's **slot** on the Driver Station. In SimGUI, nothing is in a slot until
you drag a controller there: drag **Keyboard 0** (or a real gamepad) from System Joysticks onto
the **Joystick[0]** heading, and that's what `CommandGamepad(0)` reads. <!-- claim: wpilib-tools.simgui-joystick-slots -->
Figure 1.1 shows the drag.

![SimGUI's System Joysticks panel with Keyboard 0 marked 1, an arrow from it to the Joystick[0] heading in the Joysticks panel marked 2, the same panel afterwards with slot 0 reading 16: Keyboard 0 and its axes, and the Other Devices panel marked 3 with the Talon FX's dutyCycle reading 0.25](../../lessons/v3/images/01-simgui-joystick-slot.png)

*Figure 1.1, from [Lesson 1](../../lessons/v3/01-first-motor.md#figure-1-1) — Drag Keyboard 0 (1) onto the Joystick[0] heading (2); the TalonFX's numbers show up in Other Devices (3).* <!-- claim: wpilib-tools.simgui-joystick-slots -->

One more thing SimGUI asks of you: the robot reads nothing from the keyboard while **Robot
State** says **Disconnected**, even though SimGUI's own button squares light up. Pick a mode,
such as **Teleoperated**, first. <!-- claim: wpilib-tools.simgui-keyboard-keys -->

<details class="quiz" id="q-joystick-1" markdown="1">
<summary>Check yourself: you launch the simulation and press keys, but the robot ignores them all. Joystick[0] is empty. What's missing?</summary>

- [ ] A second `CommandGamepad`. *One is enough; it just has nothing to read.*
- [x] A controller in slot 0: drag Keyboard 0 onto the Joystick[0] heading. *`CommandGamepad(0)` reads whatever is in slot 0.*
- [ ] A call that starts the controller. *There's no such call; the slot is the missing piece.*

</details>

<details class="quiz" id="q-joystick-2" markdown="1">
<summary>Check yourself: Keyboard 0 is in slot 0 and SimGUI's button squares light when you press keys, but the robot still reads nothing. Robot State says Disconnected. What do you do?</summary>

- [x] Pick a mode, such as Teleoperated. *The robot reads nothing from the keyboard while it's Disconnected.*
- [ ] Drag the keyboard into slot 1 instead. *The slot isn't the problem.*
- [ ] Restart the simulation. *Picking a mode is enough.*

</details>

## 2. Sticks are numbers, and the signs are backwards

A stick axis is a `double` from −1 to 1, with 0 in the middle. <!-- claim: commandsv3.command-gamepad-api -->
The surprise is the sign: **on most sticks, pushing forward reads negative.** So every forward
command in the course negates the stick, which turns "push forward" into "positive speed" into
"drive forward". <!-- claim: commandsv3.command-gamepad-api -->

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java`'s constructor ([Lesson 10, section 6](../../lessons/v3/10-kinematics.md#6-wire-up-the-joysticks); the fourth argument arrives in [Lesson 17, section 11](../../lessons/v3/17-bline-autos.md#11-drive-from-either-end)):*
```java
robot.drivetrain.setDefaultCommand(
    robot.drivetrain.driveFieldRelative(
        () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),  // forward = away from you
        () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),  // left    = your left
        () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX()),
        this::headingFromDriver));
```

Each argument is a lambda, so the stick is read fresh on every tick rather than once. The
[Suppliers](../java/05-suppliers-consumers-functions.md#2-suppliers-a-value-fresh-each-time) page
explains why. `kMaxSpeed.times(...)` scales the robot's top speed by the stick's fraction, so a
half push asks for half speed, and the unit comes along. <!-- claim: wpilib.units-measure-arithmetic -->

The left-right stick and the turning stick are negated too, so that pushing left asks for the
field's +Y, which is to the left, and a counterclockwise turn, which is positive. When you're not
sure of a sign, push the stick and watch the number.

<details class="quiz" id="q-joystick-3" markdown="1">
<summary>Check yourself: someone deletes the minus sign from `-robot.driverController.getLeftY()`. What happens when the driver pushes the stick forward?</summary>

- [ ] The robot drives forward, the same as before. *Pushing forward reads negative.*
- [x] The robot drives backward. *The minus sign is what turns "push forward" into a positive speed.*
- [ ] Nothing: negative speeds are ignored. *A negative speed drives backward.*

</details>

<details class="quiz" id="q-joystick-4" markdown="1">
<summary>Check yourself: why is each stick passed as a lambda, `() -> ...`, rather than as `getLeftY()`'s value?</summary>

- [ ] The drive command only accepts lambdas for style. *It's about when the stick is read.*
- [x] So the stick is read fresh every tick; a value read once would be frozen where the stick was then. *A supplier is asked again each time.*
- [ ] Because `getLeftY()` can only be called inside a command. *It can be called anywhere; the point is when.*

</details>

## 3. Deadband: the stick that never quite centres

A real stick doesn't rest at exactly 0; a centred one might read 0.03. Left alone, that drives
the motor a little, forever. A **deadband** treats anything close to the centre as 0. Lesson 2
writes one to see what's inside it:

<!-- source: lesson-2 subsystems/DriveModule.java -->
*Example, from Lesson 2's `DriveModule.java` ([Lesson 2, section 3](../../lessons/v3/02-joystick-control.md#3-deadband-cleaning-up-messy-input)):*
```java
private double applyDeadband(double value, double band) {
  if (Math.abs(value) < band) {
    return 0.0;
  }
  return value;
}
```

WPILib's `MathUtil.applyDeadband(value, band)` does the same and also rescales what's left, so
the output starts from 0 at the edge of the band rather than jumping straight to it. <!-- claim: wpilib.mathutil-apply-deadband -->
Lesson 7 deletes this helper along with the rest of the old module's methods, and the swerve
drive after it passes the sticks straight through. If your sticks creep when centred, a
`MathUtil.applyDeadband` inside each stick's lambda is the fix.

<details class="quiz" id="q-joystick-5" markdown="1">
<summary>Check yourself: with Lesson 2's `applyDeadband(value, 0.1)`, what comes out for 0.03 and for 0.8?</summary>

- [x] 0 and 0.8. *Inside the band is zeroed; outside it passes straight through.*
- [ ] 0.03 and 0.8. *0.03 is inside the band, so it becomes 0.*
- [ ] 0 and 0.7, because the band is taken off. *Lesson 2's version passes the value through unchanged; `MathUtil`'s rescales it.*

</details>

<details class="quiz" id="q-joystick-6" markdown="1">
<summary>Check yourself: what does `MathUtil.applyDeadband` do that Lesson 2's helper doesn't?</summary>

- [ ] It works on negative values. *Both use `Math.abs`, so both handle negatives.*
- [x] It rescales the values outside the band, so the output rises smoothly from 0 at the band's edge. *Lesson 2's jumps from 0 straight to the band's value.*
- [ ] It filters out quick flickers. *That's a debounce, not a deadband.*

</details>

## 4. Buttons, the D-pad and the triggers

Every button has a method on `CommandGamepad`, named for where it sits rather than a letter:
`faceDown()` is the bottom face button (the one an Xbox pad labels A), and there's `faceLeft()`,
`faceRight()`, `faceUp()`, the bumpers, `back()` and `start()`. Each hands back a `Trigger`. <!-- claim: commandsv3.command-gamepad-api -->
The **D-pad** reports its four directions as separate buttons, `dpadUp()` and so on. <!-- claim: commandsv3.command-gamepad-api -->

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java`'s constructor ([Lesson 18, section 9](../../lessons/v3/18-elevator.md#9-wire-it-in-robotjava-and-the-d-pad)):*
```java
// D-pad: send the elevator to one of its three preset heights.
robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));
```

The **triggers** aren't buttons: each is an axis that reads from 0 to 1 as you squeeze it.
`leftTrigger()` and `rightTrigger()` still give you a `Trigger`, which counts as pressed once
the axis passes halfway. <!-- claim: wpilib-tools.simgui-keyboard-trigger-axis -->

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java`'s constructor ([Lesson 28, section 4](../../lessons/v3/28-flywheel.md#4-the-subsystem)):*
```java
robot.driverController.leftTrigger().whileTrue(
    robot.flywheel.spinUp(FlywheelConstants.kShootSpeed));
```

<details class="quiz" id="q-joystick-7" markdown="1">
<summary>Check yourself: the driver squeezes the left trigger a quarter of the way. Does `leftTrigger().whileTrue(...)` start its command?</summary>

- [ ] Yes: any squeeze counts. *It counts once the axis passes halfway.*
- [x] Not yet: the trigger counts as pressed only past halfway. *It's an axis from 0 to 1, read as a button at 0.5.*
- [ ] Only with a deadband. *The halfway threshold is built in.*

</details>

<details class="quiz" id="q-joystick-8" markdown="1">
<summary>Check yourself: which method gives you the button an Xbox controller labels A?</summary>

- [x] `faceDown()` *The methods are named by position: A is the bottom face button.*
- [ ] `a()` *The course's gamepad names buttons by where they sit, not by letter.*
- [ ] `dpadDown()` *That's the D-pad's down direction.*

</details>

## 5. Robot-relative and field-relative

There are two ways to read "forward" on the stick, and Figure 10.3 shows the same push both
ways, on a robot turned to face its driver.

![Two top-down fields with the driver station at the bottom and the robot turned so its nose points toward the driver. On the left, robot-relative: the stick pushed forward moves the robot toward its nose, back toward the driver. On the right, field-relative: the same stick push moves the robot away from the driver station, in +X, with the nose still pointing the other way.](../../lessons/v3/images/10-robot-vs-field-relative.svg)

*Figure 10.3, from [Lesson 10](../../lessons/v3/10-kinematics.md#figure-10-3) — The same stick push on a robot turned 180°. +X is away from the driver station, the convention Lesson 11 uses for the field. (That's the blue driver station; Lesson 17 turns it round for red.)*

On the left, **robot-relative**: forward means toward the robot's nose, so a robot facing the
driver comes straight back at them. On the right, **field-relative**: forward means away from the
driver, whichever way the robot faces. Most drivers prefer the second. It takes one step: rotate
the stick's field direction into the robot's own frame by the robot's heading, which is what
`toRobotRelative` does. <!-- claim: wpilib.swerve-velocity-methods-return-new -->

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 10, section 7](../../lessons/v3/10-kinematics.md#7-field-relative-driving-the-swerve-superpower); the `heading` supplier arrives in Lesson 17):*
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

<details class="quiz" id="q-joystick-9" markdown="1">
<summary>Check yourself: the robot faces its driver, and the driver pushes forward. Robot-relative, which way does it go?</summary>

- [x] Toward its nose, so back at the driver. *Robot-relative forward is the robot's own forward.*
- [ ] Away from the driver. *That's field-relative.*
- [ ] It doesn't move until it turns round. *It moves straight away, the way its nose points.*

</details>

<details class="quiz" id="q-joystick-10" markdown="1">
<summary>Check yourself: what does field-relative driving need to know, every tick, that robot-relative driving doesn't?</summary>

- [ ] The robot's speed. *Both just pass the requested speed on.*
- [x] Which way the robot is facing. *The stick's field direction is rotated by the heading into the robot's frame.*
- [ ] Where the robot is on the field. *Only its heading matters for this step.*

</details>

## 6. Driving from either end

Field-relative "forward" means away from *the* driver, and on the red alliance the driver stands
at the other end of the field. So "away from you" is the field's 0° on blue and 180° on red.
`RobotTeleop` hands the drive a heading measured from the driver's own "away":

<!-- source: lesson-33 opmode/RobotTeleop.java -->
*Example, from `RobotTeleop.java` ([Lesson 17, section 11](../../lessons/v3/17-bline-autos.md#11-drive-from-either-end)):*
```java
private Rotation2d headingFromDriver() {
  Rotation2d heading = robot.localizer.getPose().getRotation();
  return Autos.onRedAlliance() ? heading.minus(Rotation2d.fromDegrees(180)) : heading;
}
```

Two choices are in those lines. The heading comes from the **fused pose estimate**, not the gyro,
because the estimate knows which way the field is and the gyro only knows how far the robot has
turned since it zeroed. And which end the driver stands at is a fact about the driver, so it lives
in the driver's opmode, not in `Drivetrain`. With both, half a stick forward for a second drives
1.87 m away from whichever end the driver is at. <!-- claim: l17.red-teleop-forward -->

<details class="quiz" id="q-joystick-11" markdown="1">
<summary>Check yourself: on red, without `headingFromDriver`'s 180° turn, what happens when the driver pushes forward?</summary>

- [ ] The robot drives away from them, as it should. *Away from the blue end is toward the red driver.*
- [x] The robot drives straight at them, because "forward" is still the field's +X, away from the blue end. *Red's "away" is the field's 180°.*
- [ ] The robot refuses to move on red. *It moves; just the wrong way.*

</details>

<details class="quiz" id="q-joystick-12" markdown="1">
<summary>Check yourself: why does `headingFromDriver` read the pose estimate rather than the gyro?</summary>

- [ ] The gyro is too slow for teleop. *It updates every tick too.*
- [x] The estimate's heading is on the field's terms; the gyro only counts from where it zeroed. *Field-relative driving needs the field's directions.*
- [ ] The gyro can't be read from an opmode. *It could be; it's just the wrong reference.*

</details>

## 7. Driving the simulation from the keyboard

Keyboard 0 drives the sticks with W and S (left stick forward and back), A and D (left and
right) and E and R (turning). W reads −1, the same as a real stick pushed forward. <!-- claim: wpilib-tools.simgui-keyboard-stick-keys -->
Out of the box it has only four buttons, Z, X, C and V, so Lesson 6 gives the rest of the
controller keys, in one visit to **DS → Keyboard 0 Settings**. SimGUI's keyboard button N is the
gamepad's button N, and its axes 4 and 5 are the two triggers. <!-- claim: wpilib-tools.simgui-keyboard-keys -->

| Control | Gamepad number | Key |
|---|---|---|
| Bottom, right, left, top face buttons | Buttons 0, 1, 2, 3 | **Z**, **X**, **C**, **V** |
| Back | Button 4 | **B** |
| Start | Button 6 | **N** |
| Left bumper | Button 9 | **M** |
| Right bumper | Button 10 | **,** (comma) |
| D-pad up, down, left, right | Buttons 11, 12, 13, 14 | **I**, **K**, **J**, **L** |
| Left trigger | Axis 4 | **.** (period) |
| Right trigger | Axis 5 | **/** (slash) |

A trigger key ramps its axis up while held and lets it fall back when released, much like
squeezing a real trigger, so a held key counts as pulled within a fraction of a
second. <!-- claim: wpilib-tools.simgui-keyboard-trigger-axis --> SimGUI saves the settings in the
project's `simgui-ds.json`, so they're still there next time. <!-- claim: wpilib-tools.simgui-keyboard-keys -->

<details class="quiz" id="q-joystick-13" markdown="1">
<summary>Check yourself: with Lesson 6's keys set up, which key sends the elevator to its top preset (D-pad up)?</summary>

- [ ] W *W is the left stick, forward.*
- [x] I *The D-pad sits on I, K, J and L, laid out like arrow keys.*
- [ ] V *V is the top face button.*

</details>

<details class="quiz" id="q-joystick-14" markdown="1">
<summary>Check yourself: you tap the period key for an instant. Does the left trigger count as pulled?</summary>

- [ ] Never: the keyboard can't press a trigger. *Lesson 6 maps the trigger to the period key.*
- [x] It can: the axis ramps up while the key is held, and the trigger counts once it passes halfway, a fraction of a second in. *Hold the key a moment to be sure.*
- [ ] Only if you hold Shift too. *The key alone drives the axis.*

</details>

## Common mistakes

- **Forgetting to negate the stick.** Pushing forward reads negative, so the robot drives
  backward ([section 2](#2-sticks-are-numbers-and-the-signs-are-backwards)).
- **Reading a stick once instead of passing a lambda.** The command keeps the value from the
  moment it was built.
- **Treating a trigger as a plain button.** It's an axis; it counts as pressed past halfway.
- **No controller in slot 0**, or Robot State left on Disconnected, in SimGUI.
- **Field-relative driving from the gyro on red.** Use the estimate's heading, turned round for
  red.
- **Putting the alliance flip in `Drivetrain`.** Which end the driver stands at belongs to the
  driver's opmode.

## Where this comes from

- **[Lesson 1](../../lessons/v3/01-first-motor.md):** the controller, slot 0 and the first
  button.
- **[Lesson 2](../../lessons/v3/02-joystick-control.md):** stick axes, their sign, and the
  deadband.
- **[Lesson 6](../../lessons/v3/06-distance-and-commands.md):** the D-pad, and the rest of the
  keyboard's keys.
- **[Lesson 10](../../lessons/v3/10-kinematics.md):** three sticks at once, and field-relative
  driving.
- **[Lesson 17](../../lessons/v3/17-bline-autos.md):** driving from either end.
- **[Lesson 28](../../lessons/v3/28-flywheel.md):** a trigger as an axis.

## Quick reference

| You write | What it does |
|---|---|
| `new CommandGamepad(0)` | the controller in slot 0 |
| `getLeftY()`, `getLeftX()`, `getRightX()` | a stick axis, −1 to 1; forward reads negative |
| `() -> -controller.getLeftY()` | forward as a positive number, read every tick |
| `MathUtil.applyDeadband(value, band)` | zero out a stick that doesn't quite centre |
| `faceDown()`, `faceLeft()`, `faceRight()`, `faceUp()` | the face buttons, by position |
| `back()`, `start()`, `leftBumper()`, `rightBumper()` | the other buttons |
| `dpadUp()`, `dpadDown()`, `dpadLeft()`, `dpadRight()` | the D-pad, as four buttons |
| `leftTrigger()`, `rightTrigger()` | a trigger axis, pressed past halfway |
| `chassisVelocities.toRobotRelative(heading)` | turn a field-relative request into the robot's frame |
