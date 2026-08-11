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
- Using a **library helper** (`Translation2d`) instead of hand-rolled coordinates

**New robot concepts**
- The four **corners** of a swerve chassis and their positions
- A **helper class** vs. a mechanism: `SwerveModule` stops being a mechanism;
  the whole `Drivetrain` becomes the mechanism
- **Translate** (all wheels same direction/speed) vs. **rotate in place** (all
  wheels tangent to a circle)
- Real steering gearing (`25 : 1`) — Lesson 5's IOU paid off
- Publishing **structured telemetry** so AdvantageScope's Swerve tab can draw the chassis
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
*hard*, but you'll touch four files and the project will spend a while
mid-surgery, full of red squiggles. That's what refactoring feels like —
keep going and it all compiles again by section 7.

---

## 2. Rename and parameterize the module

`DriveModule` hard-codes CAN IDs `1` and `2` and knows nothing about where it
sits on the robot. Four modules need four unique ID triples, and the rotation math
needs each module's position.

**Rename `DriveModule` to `SwerveModule`** — in VS Code, right-click the class
name → **Refactor → Rename**, which updates the filename and every reference in
the project for you. Then change two things about it:

1. **Drop `extends Mechanism`.** A single wheel isn't what the scheduler
   needs to lock — the *whole chassis* is. From now on, the only mechanism for
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
  private final CANcoder m_steerEncoder;
  private final TalonFXSimState m_driveSim;
  private final TalonFXSimState m_steerSim;
  // (m_driveModel/m_steerModel: no dependency on the constructor's arguments,
  // so they keep the plain field initializers from Lessons 4-6, unchanged.)

  public SwerveModule(
      int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      Translation2d location) {
    this.location  = location;
    m_driveMotor   = new TalonFX(driveId, CANBus.systemcore(0));
    m_steerMotor   = new TalonFX(steerId, CANBus.systemcore(0));
    m_steerEncoder = new CANcoder(cancoderId, CANBus.systemcore(0));
    m_driveSim     = m_driveMotor.getSimState();
    m_steerSim     = m_steerMotor.getSimState();

    // Same CANcoder priming as Lesson 5 — the gear-ratio fix comes below.
    CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
    cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
    m_steerEncoder.getConfigurator().apply(cancoderConfig);
    m_steerMotor.setPosition(m_steerEncoder.getAbsolutePosition().getValue().in(Rotations));
  }
```

This is a new *shape* of field, so look closely: the fields have **no
initializers** — no `= new TalonFX(...)` on the declaration line. They can't be
initialized up top anymore, because the CAN IDs aren't known until someone
calls the constructor with real values. So the declaration says "this field
will exist," and the constructor fills it in. `final` still holds — a `final`
field must be assigned exactly once, and an assignment in the constructor
counts. (The Lesson 4 ordering rule follows the assignments into the
constructor, too: `m_driveSim` is created by asking `m_driveMotor`, so the
motor lines come first.)

**Constructor parameters** are what make one class serve four corners: each
`new SwerveModule(...)` call hands in different IDs and a different position
— and now a different CANcoder and magnet offset too, the same priming
ritual from Lesson 5, just parameterized like everything else here. And in
`this.location = location`, the parameter and the field share a name —
`this.` means "the field on this object," which is how Java tells them apart.

One more thing that should bother you: `location` is a **`public` field**,
after all that encapsulation talk in Lesson 1. It's a deliberate exception:
the field is `final`, and a **`Translation2d`** — WPILib's `(x, y)` pair — is
a value that never changes once built. Sharing a read-only fact is safe;
hiding it behind a getter would add ceremony without adding protection.
Hardware like `m_driveMotor` stays `private`, same as always.

**Add to `SwerveModule`'s imports:**

```java
import org.wpilib.math.geometry.Translation2d;
```

Now the methods. Because the module no longer extends `Mechanism`, the
command factories are literally gone — `run`, `runRepeatedly`, and friends were
*inherited* from `Mechanism`, so `driveAtSpeed`, `driveWithJoystick`,
`steerToAngle`, and `driveDistance` don't compile anymore. That's fine: commands
belong to mechanisms, and this class isn't one.

**Delete `driveAtSpeed`, `driveWithJoystick` (both overloads), `steerToAngle`,
`driveDistance`, `applyDeadband`, the constructor's `Scheduler.getDefault().addPeriodic(...)`
call, and `logTelemetry()`** from `SwerveModule` (telemetry moves up to
`Drivetrain` in the next section — the module itself won't talk to the
scheduler at all anymore).

**Add to `SwerveModule`, one plain method that does a single tick of control:**

```java
/** One tick of control: steer toward 'angleDegrees', drive at 'speedFraction'. */
public void setDesiredState(double angleDegrees, double speedFraction) {
  // Steering P control (same math as Lesson 5, with the wrap trick).
  double error = angleDegrees - getSteerAngleDegrees();
  while (error > 180)  { error -= 360; }
  while (error < -180) { error += 360; }
  double steerOutput = clamp(SteerConstants.kP * error, -1.0, 1.0);
  m_steerMotor.setThrottle(steerOutput);

  // Drive: pass the commanded speed straight through.
  m_driveMotor.setThrottle(speedFraction);
}
```

It's Lesson 5's `steerToAngle` math wearing a new home: one call means one
tick of control toward the given goal. Who calls it, and how often? The
Drivetrain's *commands* will, every tick they run — the same per-tick rhythm
`runRepeatedly(...)` has had since Lesson 2. That keeps a tidy rule intact:
motors move only when a command asks, and commands only run while the robot
is enabled. The module doesn't register anything with the scheduler at all —
no `addPeriodic`, nothing — because there's nothing it needs to do on its own
schedule.

**Keep `SwerveModule`'s private `clamp` helper from Lesson 5, unchanged** —
this alpha's WPILib doesn't ship a `MathUtil.clamp` to replace it with, so the
one you wrote is still the tool for the job.

### Pay off Lesson 5's IOU: real steering gearing

Lesson 5 pretended the steering sensor turned 1:1 with the wheel and promised
the real gearing later. The module is growing up today, so the debt comes due:
our steering turns through a **`25 : 1`** reduction — the rotor spins 25 times
per steering rotation. The fix is the same two moves you made for the drive
motor in Lesson 6: *divide* on the way in (sensor → angle), *multiply* on the
way back (sim model → fake rotor).

**Add `kSteerGearRatio` to `SteerConstants`, next to the gain:**

```java
public static final class SteerConstants {
  public static final double kP = 0.0005;             // from Lesson 5
  public static final double kSteerGearRatio = 25.0;  // rotor : steering
}
```

**Edit `getSteerAngleDegrees()` in `SwerveModule` to divide by the ratio:**

```java
/** Current steering angle in degrees (through the real 25:1 reduction). */
public double getSteerAngleDegrees() {
  double steerRotations =
      m_steerMotor.getPosition().getValue().in(Rotations) / SteerConstants.kSteerGearRatio;
  return steerRotations * 360.0;
}
```

**One more line from Lesson 5 needs the same fix.** The constructor primes
the steering motor's sensor from the CANcoder — but that line was written for
the pretend 1:1 sensor. Now that 25 real rotor turns happen per wheel turn,
seeding the motor's *rotor*-side counter means multiplying the CANcoder's
wheel-side reading by the ratio, the same conversion `getSteerAngleDegrees()`
just learned to undo.

**Edit the priming line in `SwerveModule`'s constructor:**

```java
m_steerMotor.setPosition(
    m_steerEncoder.getAbsolutePosition().getValue().in(Rotations) * SteerConstants.kSteerGearRatio);
```

**Edit `SwerveModule`'s `m_steerModel` field to model the gearbox:**

```java
private final DCMotorSim m_steerModel =
    new DCMotorSim(
        Models.singleJointedArmFromPhysicalConstants(
            DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),
        DCMotor.getKrakenX60(1));
```

Multiply back to rotor-side, exactly like the drive motor in Lesson 6.

**Edit the steer half of `simulatePeriodic()` in `SwerveModule`:**

```java
m_steerSim.setRawRotorPosition(
    m_steerModel.getAngularPosition() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);
m_steerSim.setRotorVelocity(
    m_steerModel.getAngularVelocity() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);
```

Heads up: the steering now turns at a believable speed instead of a bare
rotor's instant snap, so your Lesson 5 `kP` is now tuned for the wrong plant.
Measured against this model: the same `kP = 0.0005` that converged cleanly in
Lesson 5 now crawls — it takes about 9 simulated seconds to close the last
degree of a 90° turn, decaying smoothly with no overshoot at all. That's not a
bug; the thing being controlled changed, and a 25:1 reduction resists motion
harder than a bare rotor did. You can't retune yet (nothing runs until the
wiring in section 6), so sit tight — section 7 comes back to this the moment
the robot moves.

One more small question-method while we're in here — the visualization in
section 4 needs wheel *speed*, and it's `getDistanceMeters()`'s pipeline from
Lesson 6 applied to velocity instead of position.

**Add to `SwerveModule`:**

```java
/** Current wheel speed in meters per second. */
public double getDriveVelocityMetersPerSec() {
  double wheelRps =
      m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) / DriveConstants.kDriveGearRatio;
  return wheelRps * DriveConstants.kWheelCircumferenceMeters;
}
```

`getDistanceMeters()` itself stays unchanged from Lesson 6. And expect
`MyTeleop` to be lit up red right now: it still binds buttons to command
factories that no longer exist. Leave it red — section 6 rebuilds that wiring
around the Drivetrain. A refactor isn't done until every file that *touched*
the old shape learns the new one, and the compiler's job is to keep that list
for you.

This is the `DriveConstants` class you started in Lesson 6.

**Add the four corners to `DriveConstants`:**

```java
public static final class DriveConstants {
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

**One field on `DriveConstants` no longer makes sense and has to go:**
`kDriveMotorPort`, `kSteerMotorPort`, and `kCancoderPort` described *one*
module's wiring. Four modules need four sets — **delete those three
constants**; the next section replaces them with per-corner IDs passed
straight into each `new SwerveModule(...)` call.

---

## 3. Build the Drivetrain with an array

The `Drivetrain` owns four `SwerveModule`s in an **array**, logs them from its
own always-on telemetry, and commands them from its command factories.

**Create `subsystems/Drivetrain.java`:**

```java
package first.robot.subsystems;

import java.util.function.DoubleSupplier;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants.DriveConstants;

public class Drivetrain extends Mechanism {
  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.
  private final SwerveModule[] m_modules = new SwerveModule[] {
      new SwerveModule(1, 2, 9, 0.0, DriveConstants.kFrontLeft),   // CAN IDs, offset — change to yours
      new SwerveModule(3, 4, 10, 0.0, DriveConstants.kFrontRight),
      new SwerveModule(5, 6, 11, 0.0, DriveConstants.kBackLeft),
      new SwerveModule(7, 8, 12, 0.0, DriveConstants.kBackRight)
  };

  // A structured topic: publishes a whole SwerveModuleVelocity[] at once, so
  // AdvantageScope's Swerve tab can draw it, not just plot four numbers.
  private final StructArrayPublisher<SwerveModuleVelocity> m_moduleStatesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("Drivetrain/ModuleStates", SwerveModuleVelocity.struct)
          .publish();

  public Drivetrain() {
    Scheduler.getDefault().addPeriodic(this::logTelemetry);
  }

  private void logTelemetry() {
    SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];
    int index = 0;
    for (SwerveModule module : m_modules) {
      SmartDashboard.putNumber("Drivetrain/Module" + index + "/SteerAngleDegrees",
          module.getSteerAngleDegrees());
      states[index] = new SwerveModuleVelocity(
          module.getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(module.getSteerAngleDegrees()));
      index++;
    }
    m_moduleStatesPublisher.set(states);
  }

  /** Advances every module's physics model. Only ever called in simulation. */
  public void simulatePeriodic() {
    for (SwerveModule module : m_modules) {
      module.simulatePeriodic();
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

Now the new machinery. Every value you've logged since Lesson 3 has been a
single number or string — `SmartDashboard.putNumber`/`putString`, one call,
one value. **`SwerveModuleVelocity`** is different: a WPILib data-carrier
bundling one wheel's speed (in m/s — which is why you wrote
`getDriveVelocityMetersPerSec`) with its angle as a **`Rotation2d`**,
WPILib's angle type (`Rotation2d.fromDegrees(...)` builds one). `SmartDashboard`
has no `putSwerveModuleVelocity` — it only knows numbers, strings, and a
couple of array flavors — so a whole *object*, and an array of four of them,
needs a different kind of bridge, the same idea as the `TalonFXSimState`
bridge from Lesson 4, just for network data instead of fake sensor readings.

**`NetworkTableInstance.getDefault().getStructArrayTopic(name, structType)`**
describes that bridge: "a topic at this name, carrying an array of this
struct-shaped type." `SwerveModuleVelocity.struct` is a value the class ships
for exactly this — it knows how to turn a `SwerveModuleVelocity` into bytes
and back. `.publish()` claims the topic for writing and hands back a
**`StructArrayPublisher`** — built once, as a field, the same "set it up
once, use it every tick" shape as the sim bridge. From there, `.set(states)`
pushes a fresh array every time `logTelemetry()` runs — one call publishes
all four modules' speed and angle together, instead of four separate numbers
that AdvantageScope would have no way to know belong to the same picture.

Step back and look at the division of labor, because this is the lesson's
real idea. The periodic callback registered in the constructor runs rain or
shine — every tick, even while the robot is disabled — so it holds the
*watching*: reading and logging what the four corners are doing. The *acting*
lives in commands, which the next two sections build: each one calls
`setDesiredState` on every module, every tick it runs, and commands only run
while the robot is enabled. The modules themselves never talk to the
scheduler at all. That's the whole point of dropping `Mechanism` from
`SwerveModule` — one mechanism, one lock, four workers commanded together.

---

## 4. Translate the chassis

To drive in a direction, aim every wheel the same way and drive at the same
speed. The direction is the angle of the `(vx, vy)` vector; the speed is its
length.

**Add to `Drivetrain`:**

```java
/** Drive the whole chassis at fractional velocity (vx, vy). */
public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
  return runRepeatedly(() -> {
    double vx = vxSupplier.getAsDouble();
    double vy = vySupplier.getAsDouble();
    double speed = Math.hypot(vx, vy);                        // vector length
    double angleDeg = Math.toDegrees(Math.atan2(vy, vx));     // vector angle
    for (SwerveModule module : m_modules) {
      module.setDesiredState(angleDeg, speed);
    }
  }).named("Translate");
}
```

The shape should feel familiar — it's Lesson 2's `driveWithJoystick` grown up:
a command factory (they're back, because `Drivetrain` *is* a mechanism) taking
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
  return runRepeatedly(() -> {
    for (SwerveModule module : m_modules) {
      double x = module.location.getX();
      double y = module.location.getY();
      double angleDeg = Math.toDegrees(Math.atan2(x, -y));
      module.setDesiredState(angleDeg, omega);
    }
  }).named("Rotate");
}
```

This is where each module's `location` earns its keep: unlike `translate`,
every corner gets a *different* angle, computed from where that corner sits.

For a square chassis (`kHalfLength == kHalfWidth`):

| Corner | Steers to | (the wheel points toward…) |
|---|---|---|
| Front-left  | `135°` | back-left  |
| Front-right | `45°`  | front-left |
| Back-left   | `-135°` (= `225°`) | back-right |
| Back-right  | `-45°`  (= `315°`) | front-right |

Sketch the four wheels pointing those ways and imagine them rolling — the whole
robot spins CCW. Neat, isn't it?

Notice neither `translate` nor `rotate` bothers with a `.whenCanceled(...)`
cleanup, unlike every command since Lesson 1. That's not an oversight — it's
because `Drivetrain` is never actually idle. `translate` is about to become
the *default* command in section 6, so the instant `rotate` is canceled (a
bumper released), the scheduler hands the mechanism straight back to
`translate`, which immediately commands fresh output. Nothing is ever left
dangling long enough to matter. Contrast that with `driveDistance` back in
Lesson 6, which really could end with nothing else queued up — that's the
difference that decides whether cleanup is required.

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

**Delete from `Robot.java` the old field:** `module` (the single `DriveModule`)
goes away entirely.

**Add to `Robot`, in its place:**

```java
public final Drivetrain drivetrain = new Drivetrain();
```

**Update `Robot`'s import** from `first.robot.subsystems.DriveModule` to:

```java
import first.robot.subsystems.Drivetrain;
```

**And update `Robot.simulationPeriodic()`** to call the new field's method:

```java
@Override
public void simulationPeriodic() {
  drivetrain.simulatePeriodic();
}
```

Nothing else about `Robot` changes — `robotPeriodic()` still just ticks the
scheduler, same as every lesson since Lesson 1.

**Delete from `MyTeleop`'s constructor the old wiring:** the A/B-face-button
drive binds from Lesson 1, the right-bumper slow mode from Lesson 2, the
west/north steering binds from Lesson 5, and the D-pad `driveDistance` bind
from Lesson 6. Those commands lived on a class that's now a helper; the
Drivetrain replaces them all.

Left stick translates by default, bumpers spin.

**Replace `MyTeleop`'s constructor with:**

```java
public MyTeleop(Robot robot) {
  this.robot = robot;

  // Left stick translates by default; bumpers spin in place.
  robot.drivetrain.setDefaultCommand(
      robot.drivetrain.translate(
          () -> -robot.driverController.getLeftY(),   // forward = +X
          () -> -robot.driverController.getLeftX())); // left    = +Y

  robot.driverController.leftBumper().whileTrue(robot.drivetrain.rotate(0.3));
  robot.driverController.rightBumper().whileTrue(robot.drivetrain.rotate(-0.3));
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

`./gradlew simulateJava` → **My Teleop** → **Enabled**. In AdvantageScope, connect to
the sim and plot all four `Drivetrain/Module0..3/SteerAngleDegrees` values on
one graph. Push the stick — all four traces should snap to the same value.
Hold the left bumper — they should split into the four rotate-in-place angles
from the table above.

Notice what you *didn't* have to do first: walk out to the robot and point
every wheel at some agreed "forward" before enabling. That's Lesson 5's
priming, paying off exactly where it matters — four independent modules that
all agree on zero the instant power comes on, with no ritual and no chance
to forget it before a match.

Now the payoff for publishing `ModuleStates`: open AdvantageScope's **Swerve**
tab and drag `NetworkTables/Drivetrain/ModuleStates` into its **States** slot
(set the tab's *Max Speed* to about `5` — that's roughly what a Kraken-driven
wheel tops out at in m/s). You get a live diagram of the chassis: one arrow
per module, direction showing steer angle, length showing wheel speed. Push
the stick and all four arrows swing together and grow with speed; hold the
left bumper and they snap into the pinwheel — the table above, drawn for you,
sixty times a second. This diagram is about to become your main debugging
view for everything swerve.

Now that the robot actually runs, cash in the promise from section 2: the
steering carries a real `25 : 1` reduction, so it turns at a believable speed
instead of a bare rotor's instant snap. Watch a wheel chase its target on the
Swerve tab — with `kP` still at Lesson 5's `0.0005`, expect a slow, smooth
crawl into position, no overshoot, just patient. **Retune it the Lesson 5
way** now that you can see it move: nudge `kP` up and watch the arrow snap
into place faster. Verified against this model, `kP = 0.005` — ten times
Lesson 5's value — settles within about a second with barely any overshoot.
The gearbox adds real damping, so a bigger gain is both safe and needed here,
the opposite of Lesson 5's ungeared case. This is the first moment you could
actually see it and tune it.

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
4. **Move the CAN IDs and offsets into `Constants.java`.** The array above
   bakes them in as literals (`new SwerveModule(1, 2, 9, 0.0, ...)`) — fine to
   learn with, but a real robot keeps its numbers in one place, the way you
   did for the single module back in Lesson 1. Add named constants to
   `DriveConstants`, right alongside each corner's drive and steer ports:
   twelve CAN IDs (`kFrontLeftDrivePort`, `kFrontLeftSteerPort`,
   `kFrontLeftCancoderPort`, and so on through `kBackRightCancoderPort`) and
   four magnet offsets (`kFrontLeftMagnetOffset`, and so on) — then rebuild
   the array to reference them:
   `new SwerveModule(DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort, DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset, DriveConstants.kFrontLeft)`.
   Verbose? A little. But now every ID and calibration number your robot
   depends on lives in the same file as the gear ratios and chassis
   dimensions — one place to check when the wiring changes.
5. **Break one module's calibration on purpose.** Change a single corner's
   magnet offset by `0.1` (about 36°) and run it. Watch the Swerve tab: three
   arrows agree, one doesn't — a fixed, consistent disagreement, not noise.
   That's exactly what a bad calibration looks like on a real robot, and
   with four modules on screen at once, it's obvious *which* corner needs
   remeasuring. Put the offset back.

---

## What you learned

The Java half of this lesson was about *many of the same thing*: an **array**
holds four same-typed modules, the **enhanced `for` loop** does the same work
to each, and **constructor parameters** let one class describe four corners
that differ only in their numbers. The robot half was an architecture
decision worth remembering the reasoning for: not every class should be a
mechanism. `SwerveModule` became a plain **helper class** — the Drivetrain
owns the array and holds the scheduler's one lock — and the module's job
shrank to one method: a single tick of control toward whatever it's told,
whenever a command asks. With that structure, whole-chassis behavior got almost easy:
**translate** is one angle for everyone; **rotate** is one angle *per
corner*, courtesy of each module knowing its `location`. You also picked up
**structured telemetry** — a `StructArrayPublisher` bridges a whole array of
labeled objects onto the network in one call, so AdvantageScope draws it
live, which will catch a miswired corner faster than any plot. If the
refactor felt long, that's because it was the real thing — a rename,
deletions, red files, and the compiler walking you through every place the
old design used to live. Combining translate and rotate into one motion is
the last missing piece of real swerve, and that's Lesson 10's
`SwerveDriveKinematics`. First, though, the robot needs to know which way
it's facing — Lesson 8 gives it a gyro.

Next: Lesson 8 — Gyro & heading.
