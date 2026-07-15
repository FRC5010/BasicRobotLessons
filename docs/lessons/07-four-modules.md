# Lesson 7 — Four modules: build the chassis

**Goal:** Turn the single `DriveModule` into a real 4-module chassis. Rename it
to `SwerveModule`, put four in an **array**, and command them together with two
simple whole-chassis moves — **translate** (roll in a direction) and **rotate**
(spin in place). By the end you'll have a chassis that actually turns — which is
what the gyro lesson needs to make sense.

**New Java concepts**
- **Arrays** — `SwerveModule[]` and `new SwerveModule[] {...}`
- The **enhanced `for` loop** — do the same thing to every element
- **Constructor parameters** that vary per instance (different CAN IDs, different corners)
- Using **library helpers** (`MathUtil.clamp`, `Translation2d`) instead of hand-rolled math

**New robot concepts**
- The four **corners** of a swerve chassis and their positions
- A **helper class** vs. a subsystem: `SwerveModule` stops being a subsystem;
  the whole `Drivetrain` becomes the subsystem
- **Translate** (all wheels same direction/speed) vs. **rotate in place** (all
  wheels tangent to a circle)
- Why the *combined* case needs `SwerveDriveKinematics` (preview of Lesson 10)

---

## 1. Why four?

A swerve robot has four modules, one at each corner. Two "shapes" of motion cover
almost everything:

- **Translate:** all four wheels point the same direction and drive at the same
  speed → the chassis slides that way.
- **Rotate in place:** each wheel steers *tangent to a circle* around the robot's
  center and drives at the same speed → the chassis spins.

Doing both at once (drive-while-rotating) requires per-wheel math — you add the
translation velocity and the rotation velocity vector at each corner. That's
what `SwerveDriveKinematics` handles, and it's the whole point of Lesson 10. For
now we build the two simple cases so Lesson 8's gyro has a robot that actually
turns.

---

## 2. Rename and parameterize the module

`DriveModule` hard-codes CAN IDs `1` and `2` and knows nothing about where it
sits on the robot. Four modules need four unique ID pairs, and the rotation math
needs each module's position. Rename the class to **`SwerveModule`** (in VS Code:
right-click the class name → **Refactor → Rename**), and change two things about
it:

1. **Drop `extends SubsystemBase`.** A single wheel isn't what the scheduler
   needs to lock — the *whole chassis* is. From now on, the only subsystem for
   driving is `Drivetrain`; each `SwerveModule` is a plain helper it owns.
2. **Parameterize the constructor** so the corner and its CAN IDs come in from
   outside.

```java
public class SwerveModule {
  /** Position of this module relative to robot center, in meters. */
  public final Translation2d location;

  private final TalonFX m_driveMotor;
  private final TalonFX m_steerMotor;
  private final TalonFXSimState m_driveSim;
  private final TalonFXSimState m_steerSim;
  // (m_driveModel / m_steerModel: same DCMotorSim setup as Lessons 4 & 5.)

  public SwerveModule(int driveId, int steerId, Translation2d location) {
    this.location = location;
    m_driveMotor  = new TalonFX(driveId);
    m_steerMotor  = new TalonFX(steerId);
    m_driveSim    = m_driveMotor.getSimState();
    m_steerSim    = m_steerMotor.getSimState();
  }
```

**What's new:**
- **`Translation2d`** is WPILib's `(x, y)` pair — perfect for a corner position.
- **Constructor parameters** let each of the four modules get different values.
  `this.location = location` copies the argument into the field of the same name
  (`this.` distinguishes the field from the parameter).

Because the module is no longer a subsystem, its **command factory methods**
(`driveAtSpeed`, `steerToAngle`, `driveDistance`) don't fit — commands are for
subsystems. Replace them with **direct methods** that just update a target, and
a `periodic()` that drives the motor toward that target every tick:

```java
private double m_targetSteerDegrees = 0.0;
private double m_targetDriveSpeed   = 0.0;

/** Set what this module should be doing. Called by Drivetrain each tick. */
public void setDesiredState(double angleDegrees, double speedFraction) {
  m_targetSteerDegrees = angleDegrees;
  m_targetDriveSpeed   = speedFraction;
}

/** One tick of control. NOT called by the scheduler — the Drivetrain calls this. */
public void periodic() {
  // Steering P control (same math as Lesson 5, with the wrap trick).
  double error = m_targetSteerDegrees - getSteerAngleDegrees();
  while (error > 180)  { error -= 360; }
  while (error < -180) { error += 360; }
  double steerOutput = MathUtil.clamp(SteerConstants.kP * error, -1.0, 1.0);
  m_steerMotor.set(steerOutput);

  // Drive: pass the target speed straight through.
  m_driveMotor.set(m_targetDriveSpeed);
}
```

> **`MathUtil.clamp(value, min, max)`** is WPILib's one-liner for the `if/else`
> clamp you wrote in Lesson 5. Delete yours; use the library. Learning to
> recognize when you're rewriting a standard helper is its own skill.

Keep `getSteerAngleDegrees()`, `getDistanceMeters()`, and `simulationPeriodic()`
unchanged from Lessons 4–6 — reading methods and sim setup stay the same shape.

Now add the four corners to `Constants.java`:

```java
public static class DriveConstants {
  // ... existing constants ...
  public static final double kHalfLength = 0.3;  // meters, wheelbase / 2
  public static final double kHalfWidth  = 0.3;  // meters, track width / 2

  public static final Translation2d kFrontLeft  = new Translation2d( kHalfLength,  kHalfWidth);
  public static final Translation2d kFrontRight = new Translation2d( kHalfLength, -kHalfWidth);
  public static final Translation2d kBackLeft   = new Translation2d(-kHalfLength,  kHalfWidth);
  public static final Translation2d kBackRight  = new Translation2d(-kHalfLength, -kHalfWidth);
}
```

WPILib's convention (memorize it): **+X is forward, +Y is left, yaw is CCW-positive.**

---

## 3. Build the Drivetrain with an array

The `Drivetrain` owns four `SwerveModule`s in an **array** and ticks them from
its own `periodic()`. Create `src/main/java/frc/robot/subsystems/Drivetrain.java`:

```java
package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.DriveConstants;

public class Drivetrain extends SubsystemBase {
  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
  private final SwerveModule[] m_modules = new SwerveModule[] {
      new SwerveModule(1, 2, DriveConstants.kFrontLeft),
      new SwerveModule(3, 4, DriveConstants.kFrontRight),
      new SwerveModule(5, 6, DriveConstants.kBackLeft),
      new SwerveModule(7, 8, DriveConstants.kBackRight)
  };

  @Override
  public void periodic() {
    for (SwerveModule module : m_modules) {
      module.periodic();
    }
  }

  @Override
  public void simulationPeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulationPeriodic();
    }
  }
}
```

**New Java pieces:**
- **`SwerveModule[]`** — an **array**, a fixed-size ordered container of
  `SwerveModule`s. `new SwerveModule[] { a, b, c, d }` builds one with four
  elements.
- **`for (SwerveModule module : m_modules)`** — the **enhanced `for` loop** (or
  "for-each"). Runs the body once per element, binding `module` to each in turn.
  That's how a single line inside ticks all four modules.

Notice how the Drivetrain's `periodic()` calls each module's `periodic()`
explicitly. The scheduler ticks the **Drivetrain**; the Drivetrain ticks the
modules. That's the whole point of dropping `SubsystemBase` from `SwerveModule`.

---

## 4. Translate the chassis

To drive in a direction, aim every wheel the same way and drive at the same
speed. The direction is the angle of the `(vx, vy)` vector; the speed is its
length:

```java
/** Drive the whole chassis at fractional velocity (vx, vy). */
public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
  return run(() -> {
    double vx = vxSupplier.getAsDouble();
    double vy = vySupplier.getAsDouble();
    double speed = Math.hypot(vx, vy);                        // vector length
    double angleDeg = Math.toDegrees(Math.atan2(vy, vx));     // vector angle
    for (SwerveModule module : m_modules) {
      module.setDesiredState(angleDeg, speed);
    }
  });
}
```

**The math one line at a time:**
- **`Math.hypot(vx, vy)`** returns `sqrt(vx² + vy²)` — the length of the vector.
  Cleaner (and numerically safer) than writing the formula by hand.
- **`Math.atan2(vy, vx)`** is the angle of the vector, in **radians**. It's the
  four-quadrant version of `atan`, so it correctly handles negative components.
  `Math.toDegrees` converts to what our steering code expects.
- Every module gets the *same* target → the chassis slides as one.

---

## 5. Rotate the chassis in place

To spin without moving, each wheel steers **tangent to a circle** around the
center — the direction it would travel if the whole robot rotated CCW.

For a module at position `(x, y)` from center, the CCW-tangent direction is
`(-y, x)` (rotate the outward radial 90° CCW). In degrees:

```java
/** Spin in place at fractional angular rate 'omega' (positive = CCW). */
public Command rotate(double omega) {
  return run(() -> {
    for (SwerveModule module : m_modules) {
      double x = module.location.getX();
      double y = module.location.getY();
      double angleDeg = Math.toDegrees(Math.atan2(x, -y));
      module.setDesiredState(angleDeg, omega);
    }
  });
}
```

For a square chassis (`kHalfLength == kHalfWidth`):

| Corner | Steers to | (the wheel points toward…) |
|---|---|---|
| Front-left  | `135°` | back-left  |
| Front-right | `45°`  | front-left |
| Back-left   | `-135°` (= `225°`) | back-right |
| Back-right  | `-45°`  (= `315°`) | front-right |

Sketch the four wheels pointing those ways and imagine them rolling — the whole
robot spins CCW. Neat, isn't it?

> **Two simplifications we'll fix in Lesson 10:**
> 1. Real rotation gives faster linear speed to wheels farther from center
>    (`v = ω × r`). We use the same speed for all four. On a square chassis
>    this is close enough for `omega` to feel like a rotation rate.
> 2. We can't translate *and* rotate at once — the two commands both require
>    the Drivetrain, so scheduling one cancels the other. `SwerveDriveKinematics`
>    combines them per-wheel.

---

## 6. Wire it up

In `RobotContainer` — left stick translates by default, bumpers spin:

```java
private final Drivetrain m_drivetrain = new Drivetrain();
```

```java
m_drivetrain.setDefaultCommand(
    m_drivetrain.translate(
        () -> -m_driverController.getLeftY(),   // forward = +X
        () -> -m_driverController.getLeftX())); // left    = +Y

m_driverController.leftBumper().whileTrue(m_drivetrain.rotate( 0.3));
m_driverController.rightBumper().whileTrue(m_drivetrain.rotate(-0.3));
```

Because both bumper commands and the default translate require the Drivetrain,
holding a bumper cancels the default (as expected); releasing it hands control
back automatically — the same pattern from Lesson 2.

---

## 7. Run it

`./gradlew simulateJava` → **Teleoperated**. In AdvantageScope, connect to the
sim and plot the four `getSteerAngleDegrees` values from
`SmartDashboard.putNumber(...)` in `Drivetrain.periodic()`. Push the stick — all
four angles should snap to the same value. Hold left bumper — they should split
into the four rotate-in-place angles above.

The **gyro** still reports zero — the chassis isn't yet closing the loop from
"commanded rotation" to "reported heading." That's exactly what Lesson 8 wires
up.

---

## Try it

1. Publish all four `getSteerAngleDegrees` on distinct dashboard keys and confirm
   the four angles match the table above when you press the left bumper.
2. Change `kHalfLength` to `0.4` and `kHalfWidth` to `0.2`. What do the four
   rotate angles become? (You now understand why chassis geometry matters.)
3. Add a `driveForwardMeters(double meters)` method to `Drivetrain` — read
   `getDistanceMeters()` from `m_modules[0]` after resetting, sequence steps like
   Lesson 6's `driveDistance`. This is the whole-chassis version we'll formalize
   in Lesson 9.

---

## What you learned

- **Arrays** hold a fixed number of same-typed things; the **enhanced `for`**
  runs code against each one.
- **Constructor parameters** let one class describe many objects that differ by
  a few values (CAN IDs, position).
- Not every class has to be a subsystem — a `SwerveModule` is a helper the
  `Drivetrain` owns, and only the Drivetrain talks to the scheduler.
- The two "shapes" of chassis motion — **translate** and **rotate in place** —
  are both just "point every wheel a certain way, drive at a certain speed."
  Combining them is the job of `SwerveDriveKinematics` (Lesson 10).

Next: [Lesson 8 — Gyro & heading](08-gyro-heading.md).
