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
- Real steering gearing (`25 : 1`) — Lesson 5's IOU paid off
- Logging **module states** so AdvantageScope's Swerve tab can draw the chassis
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

Fair warning: this is the biggest refactor of the course. Nothing in it is
*hard*, but you'll touch three files and the project will spend a while
mid-surgery, full of red squiggles. That's what refactoring feels like —
keep going and it all compiles again by section 6.

---

## 2. Rename and parameterize the module

`DriveModule` hard-codes CAN IDs `1` and `2` and knows nothing about where it
sits on the robot. Four modules need four unique ID pairs, and the rotation math
needs each module's position.

**Rename `DriveModule` to `SwerveModule`** — in VS Code, right-click the class
name → **Refactor → Rename**, which updates the filename and every reference in
the project for you. Then change two things about it:

1. **Drop `extends SubsystemBase`.** A single wheel isn't what the scheduler
   needs to lock — the *whole chassis* is. From now on, the only subsystem for
   driving is `Drivetrain`; each `SwerveModule` is a plain helper it owns.
2. **Parameterize the constructor** so the corner and its CAN IDs come in from
   outside.

**Replace the top of the class with:**

```java
public class SwerveModule {
  /** Position of this module relative to robot center, in meters. */
  public final Translation2d location;

  private final TalonFX m_driveMotor;
  private final TalonFX m_steerMotor;
  private final TalonFXSimState m_driveSim;
  private final TalonFXSimState m_steerSim;
  // (m_driveModel: same as Lesson 6. m_steerModel: updated below — real gearing at last.)

  public SwerveModule(int driveId, int steerId, Translation2d location) {
    this.location = location;
    m_driveMotor  = new TalonFX(driveId);
    m_steerMotor  = new TalonFX(steerId);
    m_driveSim    = m_driveMotor.getSimState();
    m_steerSim    = m_steerMotor.getSimState();
  }
```

This is a new *shape* of field, so look closely: the fields have **no
initializers** — no `= new TalonFX(1)` on the declaration line. They can't be
initialized up top anymore, because the CAN IDs aren't known until someone
calls the constructor with real values. So the declaration says "this field
will exist," and the constructor fills it in. `final` still holds — a `final`
field must be assigned exactly once, and an assignment in the constructor
counts. (The Lesson 4 ordering rule follows the assignments into the
constructor, too: `m_driveSim` is created by asking `m_driveMotor`, so the
motor lines come first.)

**Constructor parameters** are what make one class serve four corners: each
`new SwerveModule(...)` call hands in different IDs and a different position.
And in `this.location = location`, the parameter and the field share a name —
`this.` means "the field on this object," which is how Java tells them apart.

One more thing that should bother you: `location` is a **`public` field**,
after all that encapsulation talk in Lesson 1. It's a deliberate exception:
the field is `final`, and a **`Translation2d`** — WPILib's `(x, y)` pair — is
a value that never changes once built. Sharing a read-only fact is safe;
hiding it behind a getter would add ceremony without adding protection.
Hardware like `m_driveMotor` stays `private`, same as always.

Now the methods. Because the module no longer extends `SubsystemBase`, the
command factories are literally gone — `run`, `startEnd`, and friends were
*inherited* from `SubsystemBase`, so `driveAtSpeed`, `steerToAngle`, and
`driveDistance` don't compile anymore. That's fine: commands belong to
subsystems, and this class isn't one.

**Delete the command factories and the module's old `periodic()`** (its
logging moves up to the `Drivetrain` in the next section), **and add one plain
method** that does a single tick of control, on demand:

```java
/** One tick of control: steer toward 'angleDegrees', drive at 'speedFraction'. */
public void setDesiredState(double angleDegrees, double speedFraction) {
  // Steering P control (same math as Lesson 5, with the wrap trick).
  double error = angleDegrees - getSteerAngleDegrees();
  while (error > 180)  { error -= 360; }
  while (error < -180) { error += 360; }
  double steerOutput = MathUtil.clamp(SteerConstants.kP * error, -1.0, 1.0);
  m_steerMotor.set(steerOutput);

  // Drive: pass the commanded speed straight through.
  m_driveMotor.set(speedFraction);
}
```

It's Lesson 5's `steerToAngle` math wearing a new home: one call means one
tick of control toward the given goal. Who calls it, and how often? The
Drivetrain's *commands* will, every tick they run — the same per-tick rhythm
`run(...)` has had since Lesson 2. That keeps a tidy rule intact: motors
move only when a command asks, and commands only run while the robot is
enabled. The module doesn't keep a `periodic()` at all — there's nothing it
needs to do on its own schedule.

> **`MathUtil.clamp(value, min, max)`** is WPILib's one-liner for the `if/else`
> clamp you wrote in Lesson 5. Delete yours; use the library. Learning to
> recognize when you're rewriting a standard helper is its own skill. (Let
> `Ctrl+.` add the import — it's `edu.wpi.first.math.MathUtil`. Same for
> `Translation2d`: `edu.wpi.first.math.geometry.Translation2d`.)

### Pay off Lesson 5's IOU: real steering gearing

Lesson 5 pretended the steering sensor turned 1:1 with the wheel and promised
the real gearing later. The module is growing up today, so the debt comes due:
our steering turns through a **`25 : 1`** reduction — the rotor spins 25 times
per steering rotation. The fix is the same two moves you made for the drive
motor in Lesson 6: *divide* on the way in (sensor → angle), *multiply* on the
way back (sim model → fake rotor).

**Add `kSteerGearRatio` to `SteerConstants`, next to the gain:**

```java
public static class SteerConstants {
  public static final double kP = 0.01;               // from Lesson 5
  public static final double kSteerGearRatio = 25.0;  // rotor : steering
}
```

**Edit `getSteerAngleDegrees()`** to divide by the ratio:

```java
/** Current steering angle in degrees. */
public double getSteerAngleDegrees() {
  double steerRotations =
      m_steerMotor.getPosition().getValueAsDouble() / SteerConstants.kSteerGearRatio;
  return steerRotations * 360.0;
}
```

**Edit the `m_steerModel` field** (from the top of the class) to model the
gearbox:

```java
private final DCMotorSim m_steerModel =
    new DCMotorSim(
        LinearSystemId.createDCMotorSystem(
            DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),
        DCMotor.getKrakenX60(1));
```

**Edit the steer half of `simulationPeriodic()`** to multiply back to
rotor-side, exactly like the drive motor in Lesson 6:

```java
m_steerSim.setRawRotorPosition(
    m_steerModel.getAngularPositionRotations() * SteerConstants.kSteerGearRatio);
m_steerSim.setRotorVelocity(
    m_steerModel.getAngularVelocityRPM() * SteerConstants.kSteerGearRatio / 60.0);
```

Heads up: the steering now turns at a believable speed instead of a bare
rotor's instant snap, so your Lesson 5 `kP` is now tuned for the wrong plant —
it may feel sluggish or jumpy. That's not a bug; the thing being controlled
changed. You can't retune yet (nothing runs until the wiring in section 6), so
sit tight — section 7 comes back to this the moment the robot moves.

One more small question-method while we're in here — the visualization in
section 3 needs wheel *speed*, and it's `getDistanceMeters()`'s pipeline from
Lesson 6 applied to velocity instead of position.

**Add to `SwerveModule`:**

```java
/** Current wheel speed in meters per second. */
public double getDriveVelocityMetersPerSec() {
  double wheelRps =
      m_driveMotor.getVelocity().getValueAsDouble() / DriveConstants.kDriveGearRatio;
  return wheelRps * DriveConstants.kWheelCircumferenceMeters;
}
```

`getDistanceMeters()` itself stays unchanged from Lesson 6. And expect
`RobotContainer` to be lit up red right now: it still binds buttons to command
factories that no longer exist. Leave it red — section 6 rebuilds that wiring
around the Drivetrain. A refactor isn't done until every file that *touched*
the old shape learns the new one, and the compiler's job is to keep that list
for you.

**Add the four corners to `DriveConstants`** (the class you started in
Lesson 6):

```java
public static class DriveConstants {
  // ...the gear ratio and wheel constants from Lesson 6 stay...

  public static final double kHalfLength = 0.3;  // meters, wheelbase / 2
  public static final double kHalfWidth  = 0.3;  // meters, track width / 2

  public static final Translation2d kFrontLeft  = new Translation2d( kHalfLength,  kHalfWidth);
  public static final Translation2d kFrontRight = new Translation2d( kHalfLength, -kHalfWidth);
  public static final Translation2d kBackLeft   = new Translation2d(-kHalfLength,  kHalfWidth);
  public static final Translation2d kBackRight  = new Translation2d(-kHalfLength, -kHalfWidth);
}
```

Those signs follow WPILib's convention, and it's one to memorize now because
every WPILib class assumes it: **+X is forward, +Y is left, yaw is
CCW-positive.** Front-left is "forward and left," so both coordinates are
positive; back-right flips both signs.

---

## 3. Build the Drivetrain with an array

The `Drivetrain` owns four `SwerveModule`s in an **array**, logs them from its
own `periodic()`, and commands them from its command factories.

**Create `src/main/java/frc/robot/subsystems/Drivetrain.java`:**

```java
package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.DriveConstants;

public class Drivetrain extends SubsystemBase {
  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
  private final SwerveModule[] m_modules = new SwerveModule[] {
      new SwerveModule(1, 2, DriveConstants.kFrontLeft),   // CAN IDs — change to yours
      new SwerveModule(3, 4, DriveConstants.kFrontRight),
      new SwerveModule(5, 6, DriveConstants.kBackLeft),
      new SwerveModule(7, 8, DriveConstants.kBackRight)
  };

  @Override
  public void periodic() {
    SwerveModuleState[] states = new SwerveModuleState[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      Logger.recordOutput("Drivetrain/Module" + index + "/SteerAngleDegrees",
          module.getSteerAngleDegrees());
      states[index] = new SwerveModuleState(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    Logger.recordOutput("Drivetrain/ModuleStates", states);
  }

  @Override
  public void simulationPeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulationPeriodic();
    }
  }
}
```

Two new pieces of Java carry this file. **`SwerveModule[]`** is an **array**:
a fixed-size, ordered container where every slot holds the same type.
`new SwerveModule[] { a, b, c, d }` builds one with four elements — and here
each element is itself a `new SwerveModule(...)` call with its own IDs and
corner, which is constructor parameters doing exactly the job section 2
promised.

Then **`for (SwerveModule module : m_modules)`** — the **enhanced `for`
loop**. Read it as "for each module in m_modules": the body runs once per
element with `module` standing for each in turn, which is how a few lines
report on all four corners. One wrinkle: a for-each loop doesn't
number its elements, and the log keys need numbers — so a plain `int index`
counter rides along, and `"Drivetrain/Module" + index + "/..."` glues the
number into the key (`+` between a String and a number pulls the number into
the text). Keys `Module0`–`Module3` follow the FL, FR, BL, BR order of the
array.

The `states` business is the second use of that counter, and it's there for a
payoff you'll see in section 7. **`SwerveModuleState`** is a WPILib
data-carrier: one wheel's speed (in m/s — which is why you wrote
`getDriveVelocityMetersPerSec`) bundled with its angle as a **`Rotation2d`**,
WPILib's angle type (`Rotation2d.fromDegrees(...)` builds one). The line
`new SwerveModuleState[4]` makes an array with four *empty* slots, and
`states[index] = ...` fills slot number `index` — arrays are numbered from
zero, so the slots are 0 through 3. Logging the whole array in one call is an
AdvantageKit trick worth knowing: structured values like these aren't just
numbers on a plot; tools can *draw* them. (These two types become the language
of real swerve math in Lesson 10 — consider this a first handshake.)

Step back and look at the division of labor, because this is the lesson's
real idea. `periodic()` runs rain or shine — every tick, even while the
robot is disabled — so it holds the *watching*: reading and logging what the
four corners are doing. The *acting* lives in commands, which the next two
sections build: each one calls `setDesiredState` on every module, every tick
it runs, and commands only run while the robot is enabled. The modules
themselves never talk to the scheduler at all. That's the whole point of
dropping `SubsystemBase` from `SwerveModule` — one subsystem, one lock, four
workers commanded together.

---

## 4. Translate the chassis

To drive in a direction, aim every wheel the same way and drive at the same
speed. The direction is the angle of the `(vx, vy)` vector; the speed is its
length.

**Add to `Drivetrain`:**

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

The shape should feel familiar — it's Lesson 2's `driveWithJoystick` grown up:
a command factory (they're back, because `Drivetrain` *is* a subsystem) taking
suppliers so the sticks get re-read every tick. The two `Math` calls are the
new part. `Math.hypot(vx, vy)` returns `sqrt(vx² + vy²)` — the length of the
vector, cleaner and numerically safer than writing the formula by hand.
`Math.atan2(vy, vx)` is the vector's angle, in **radians** — it's the
four-quadrant version of `atan`, meaning it gets the direction right even
when `vx` or `vy` goes negative — and `Math.toDegrees` converts to what our
steering code expects. Then every module gets the *same* target, and the
chassis slides as one.

---

## 5. Rotate the chassis in place

To spin without moving, each wheel steers **tangent to a circle** around the
center — the direction it would travel if the whole robot rotated CCW.

For a module at position `(x, y)` from center, the CCW-tangent direction is
`(-y, x)` (rotate the outward radial 90° CCW). In degrees:

**Add to `Drivetrain`:**

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

This is where each module's `location` earns its keep: unlike `translate`,
every corner gets a *different* angle, computed from where that corner sits.
(And notice `rotate` takes a plain `double`, not a supplier — the bumper spin
rate is a fixed number, so there's nothing to re-read each tick.)

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

Time to fix the red.

**Delete from `RobotContainer` the old wiring:** the `m_module` field and every
binding that used it — the A/B buttons from Lesson 1, X/Y steering from
Lesson 5, and the D-pad `driveDistance` from Lesson 6. Those commands lived on a
class that's now a helper; the Drivetrain replaces them all.

**Add to `RobotContainer`, with the other fields** (`m_driverController` stays):

```java
  private final Drivetrain m_drivetrain = new Drivetrain();
```

**Add to `configureBindings()`** — left stick translates by default, bumpers spin:

```java
  private void configureBindings() {
    m_drivetrain.setDefaultCommand(
        m_drivetrain.translate(
            () -> -m_driverController.getLeftY(),   // forward = +X
            () -> -m_driverController.getLeftX())); // left    = +Y

    m_driverController.leftBumper().whileTrue(m_drivetrain.rotate( 0.3));
    m_driverController.rightBumper().whileTrue(m_drivetrain.rotate(-0.3));
  }
```

The minus signs are Lesson 2's stick-inversion lesson meeting section 2's
coordinate convention: pushing the stick forward reads negative but means +X;
pushing it left reads negative but means +Y. And because both bumper commands
and the default translate require the Drivetrain, holding a bumper cancels
the default (as expected); releasing it hands control back automatically —
the same pattern from Lesson 2, now moving eight motors' worth of robot. The
project should compile clean again.

---

## 7. Run it

`./gradlew simulateJava` → **Teleoperated**. In AdvantageScope, connect to
the sim and plot all four `Drivetrain/Module0..3/SteerAngleDegrees` values on
one graph. Push the stick — all four traces should snap to the same value.
Hold the left bumper — they should split into the four rotate-in-place angles
from the table above.

Now the payoff for logging `ModuleStates`: open AdvantageScope's **Swerve**
tab and drag `Drivetrain/ModuleStates` into its **States** slot (set the
tab's *Max Speed* to about `5` — that's roughly what a Kraken-driven wheel
tops out at in m/s). You get a live diagram of the chassis: one arrow per
module, direction showing steer angle, length showing wheel speed. Push the
stick and all four arrows swing together and grow with speed; hold the left
bumper and they snap into the pinwheel — the table above, drawn for you,
sixty times a second. This diagram is about to become your main debugging
view for everything swerve.

Now that the robot actually runs, cash in the promise from section 2: the
steering carries a real `25 : 1` reduction, so it turns at a believable speed
instead of a bare rotor's instant snap. Watch a wheel chase its target on the
Swerve tab — if the steering lags in lazily or buzzes around the angle, your
Lesson 5 `SteerConstants.kP` is tuned for the *old* plant. **Retune it the
Lesson 5 way** now that you can see it move: nudge `kP` up until it oscillates,
then back off. This is the first moment you could actually do it.

The **gyro** still reports zero — the chassis isn't yet closing the loop from
"commanded rotation" to "reported heading." That's exactly what Lesson 8 wires
up.

---

## Try it

1. Hold the left bumper and check the four plotted angles against the table in
   section 5, corner by corner. If one module disagrees, its position in
   `Constants.java` or its slot in the array is wrong — and the plot just told
   you which one.
2. Change `kHalfLength` to `0.4` and `kHalfWidth` to `0.2`. What do the four
   rotate angles become? (You now understand why chassis geometry matters.)
3. Add a `driveForwardMeters(double meters)` method to `Drivetrain` — read
   `getDistanceMeters()` from `m_modules[0]` after resetting, sequence steps like
   Lesson 6's `driveDistance`. This is the whole-chassis version we'll formalize
   in Lesson 9.
4. **Move the eight CAN IDs into `Constants.java`.** The array above bakes them
   in as literals (`new SwerveModule(1, 2, ...)`) — fine to learn with, but a
   real robot keeps its numbers in one place, the way you did for the single
   module back in Lesson 1. Add eight named constants to `DriveConstants` —
   `kFrontLeftDrivePort`, `kFrontLeftSteerPort`, and so on through
   `kBackRightSteerPort` — and rebuild the array to reference them:
   `new SwerveModule(DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort, DriveConstants.kFrontLeft)`.
   Verbose? A little. But now every ID your robot depends on lives in the same
   file as the gear ratios and chassis dimensions — one place to check when the
   wiring changes.

---

## What you learned

The Java half of this lesson was about *many of the same thing*: an **array**
holds four same-typed modules, the **enhanced `for` loop** does the same work
to each, and **constructor parameters** let one class describe four corners
that differ only in their numbers. The robot half was an architecture
decision worth remembering the reasoning for: not every class should be a
subsystem. `SwerveModule` became a plain **helper class** — the Drivetrain
owns the array and holds the scheduler's one lock — and the module's job
shrank to one method: a single tick of control toward whatever it's told,
whenever a command asks. With that structure, whole-chassis behavior got almost easy:
**translate** is one angle for everyone; **rotate** is one angle *per
corner*, courtesy of each module knowing its `location` — and with module
states logged, AdvantageScope draws it all live, which will catch a miswired
corner faster than any plot. If the refactor felt
long, that's because it was the real thing — a rename, deletions, red files,
and the compiler walking you through every place the old design used to
live. Combining translate and rotate into one motion is the last missing
piece of real swerve, and that's Lesson 10's `SwerveDriveKinematics`. First,
though, the robot needs to know which way it's facing — Lesson 8 gives it a
gyro.

Next: [Lesson 8 — Gyro & heading](08-gyro-heading.md).
