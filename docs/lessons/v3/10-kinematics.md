# Lesson 10 — Full swerve with kinematics

**Goal:** Replace the hand-rolled `translate` and `rotate` from Lessons 7–8 with
`SwerveDriveKinematics`, so the chassis can **translate and rotate at the same
time** — the "full swerve" behavior — plus always steer the shortest path.

**New Java concepts**
- Small immutable **data-carrier objects** (`ChassisVelocities`,
  `SwerveModuleVelocity`) — public fields, and methods that hand back a new
  value instead of changing the object you called them on
- **Indexed `for` loops** — for when you need to pair items from two arrays
- **`MathUtil.inputModulus`** — the wrap loop as a one-liner
- Scaling a typed measure by a plain fraction (`.times(...)`)

**New robot concepts**
- **`SwerveDriveKinematics`** — the math that turns whole-chassis motion into
  four per-wheel motions
- **`ChassisVelocities`** — the "what I want" of chassis motion: `vx`, `vy`, `ω`
- **`SwerveModuleVelocity`** — the "what each wheel does" answer: angle + speed
- **Speed desaturation** — capping wheel speeds when the request exceeds physics
- **State optimization** — always steering the *short* way to a target
- **Field-relative** driving using the gyro

---

## 1. Why kinematics?

Lesson 7's `translate` handles "drive in a direction." Lesson 8's `rotate`
handles "spin in place." What neither one does is *both at once*: each calls
`setDesiredState` on every module, and since `translate` and `rotate` both
require the Drivetrain, scheduling one cancels the other. Real swerve robots
drive and spin constantly — imagine sweeping around a defender while keeping
a shooter pointed at the goal — so you need per-wheel math that mixes the
two.

That math is simple once it's spelled out: at each corner, add the
**translation velocity vector** to the **rotation velocity vector** (which
points tangent to the circle around the center, with magnitude `ω × r`).
WPILib packages it as **`SwerveDriveKinematics`** so you never have to
re-derive it. Give it a `ChassisVelocities`; it hands back four
`SwerveModuleVelocity`s — the same type you've been logging to the Swerve tab
since Lesson 7. Today it stops being just telemetry and becomes the language
the whole drivetrain speaks.

---

## 2. Build the kinematics object

`Rotation2d` is already imported in `Drivetrain.java`. Kinematics needs three
more types.

**Add to `Drivetrain.java`'s imports:**

```java
import java.util.function.Supplier;

import org.wpilib.math.kinematics.ChassisVelocities;
import org.wpilib.math.kinematics.SwerveDriveKinematics;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.LinearVelocity;
```

It's built from the modules' locations, and you know the rule by now: when
one field is built from another, the one it depends on goes first.

**Add to `Drivetrain`, directly below the `m_modules` field:**

```java
private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
    m_modules[0].location,
    m_modules[1].location,
    m_modules[2].location,
    m_modules[3].location);
```

The order matters — whatever order you list the corners here is the order
`toSwerveModuleVelocities` returns states in. Match the array you built in
Lesson 7 (FL, FR, BL, BR) exactly. A swapped pair here produces a robot that
*almost* drives right, which is the most confusing kind of wrong.

Now a max wheel speed, since kinematics speaks meters per second and
`m_driveMotor.setThrottle` wants a fraction of full power. You've had the
Units library since Lesson 3 — a `LinearVelocity` value knows it's a speed
and converts itself to whatever unit you ask for. What's new today is that
**WPILib's own kinematics types speak Units too**: `ChassisVelocities`,
`SwerveModuleVelocity`, and `SwerveDriveKinematics` all take measures
directly, so a `LinearVelocity` flows straight through them — you don't
unpack it to a `double` until you hit something that genuinely only speaks
numbers, like Phoenix's `setThrottle`.

**Add to the top of `Constants.java`:**

```java
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.RotationsPerSecond;

import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.LinearVelocity;
```

**Add to `DriveConstants`:**

```java
public static final class DriveConstants {
  // ...existing constants stay as doubles for now...

  // Kraken X60 free speed ≈ 6000 RPM = 100 rotations/sec. Divide by the gear
  // ratio, multiply by circumference → meters/sec. About 4.7 m/s for our numbers.
  public static final LinearVelocity kMaxSpeed =
      MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters);

  // How fast the chassis may spin at full stick — one full rotation per second.
  public static final AngularVelocity kMaxAngularSpeed = RotationsPerSecond.of(1.0);
}
```

`MetersPerSecond.of(...)` builds a `LinearVelocity` from a plain number — the
arithmetic stays in doubles (readable), and the *result* becomes unit-aware.
That's the pattern for making one: **compute in doubles, wrap the answer.**
(This is close to the `5` you eyeballed for the Swerve tab's Max Speed back
in Lesson 7 — now it's a computed, typed constant instead of a guess.)

---

## 3. Teach the module to speak meters per second

`SwerveModule.setDesiredState` currently takes a `speedFraction` (`-1..1`).
Kinematics speaks meters per second. Update the module to accept a full
`SwerveModuleVelocity` and do the conversion in one place.

**Add to `SwerveModule.java`'s imports:**

```java
import static org.wpilib.units.Units.MetersPerSecond;

import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.math.util.MathUtil;
```

**Replace the two-argument `setDesiredState` with:**

```java
/** One tick of control: chase the given state. */
public void setDesiredState(SwerveModuleVelocity state) {
  // Steering: the same P control, error wrapped to ±180° in one call now.
  double error = MathUtil.inputModulus(
      state.angle.getDegrees() - getSteerAngleDegrees(), -180, 180);
  double steerOutput = clamp(SteerConstants.kP * error, -1.0, 1.0);
  m_steerMotor.setThrottle(steerOutput);

  // Drive: meters per second → fraction of max, with the cosine scale.
  double alignment = Math.cos(Math.toRadians(error));
  double fraction = state.velocity / DriveConstants.kMaxSpeed.in(MetersPerSecond);
  m_driveMotor.setThrottle(fraction * alignment);
}
```

**Delete the old two-argument `setDesiredState`** — its callers switch over in
the next section.

Two of this lesson's tools show up in that little method. The two `while`
loops you wrote in Lesson 5 to wrap the error into ±180° collapse into
**`MathUtil.inputModulus(value, -180, 180)`** — it does exactly what the
loops did, and you get the one-liner now that you've built the hand-rolled
version and know what it's doing. (Your `clamp` two lines down doesn't get
the same treatment — this alpha's `MathUtil` has no `clamp` to graduate to,
so the private helper from Lesson 5 stays, permanently, same as it did in
Lesson 7.) And **`kMaxSpeed.in(MetersPerSecond)`** is the Units boundary in
action: the constant is a typed `LinearVelocity`, but the division needs a
plain number, so `.in(...)` hands one back.

Notice `state.velocity` is read as a plain `double`, not unpacked with
`.in(...)`. `SwerveModuleVelocity`'s constructor accepts a `LinearVelocity`
if you want to build one that way, but the value it actually stores is a
bare `double` in meters per second — Units at the boundary where you build
the value, plain numbers once it's inside a kinematics type built for speed.
You'll see the same thing on `ChassisVelocities` in a moment.

Otherwise the control body carried over intact — the target arrives as a
`SwerveModuleVelocity`, which bundles the angle and speed together and lets
`optimize` do useful work on the pair (section 5). One method, one type;
less to hold in your head.

> **Worth knowing:** this alpha ships `SwerveModuleVelocity.cosineScale(Rotation2d)`
> — a method that does exactly the alignment trick above, built in. It's not
> used here, because the hand-rolled version already lives inside
> `setDesiredState` right next to the P control it depends on, and moving it
> wouldn't simplify anything. If you ever see it in someone else's code, now
> you know what it's for.

> **Update `Drivetrain.driveDistance` from Lesson 9** — it called
> `setDesiredState(0.0, 0.4)`, which no longer compiles. Build a state
> instead: `new SwerveModuleVelocity(DriveConstants.kMaxSpeed.times(0.4),
> Rotation2d.fromDegrees(0))` to drive (`.times(0.4)` scales the max-speed
> measure and stays a `LinearVelocity`), and `new SwerveModuleVelocity()` —
> zero speed — everywhere it used to stop. Same fix anywhere else you called
> the two-argument `setDesiredState` — let the compiler's red list walk you
> to each one, Lesson 7 style.

---

## 4. Replace `translate` and `rotate` with one `drive`

Now the payoff. **Delete the `translate` and `rotate` command factories**
from `Drivetrain` — kinematics subsumes both. But *don't* delete
`commandRotation`: Lesson 8's `turnToHeading` still calls it, and breaking a
working command isn't part of the plan. Instead, rebuild the machinery
underneath it.

Here's the move, and it's Lesson 8's own trick again: every path into the
drivetrain — stick driving, heading turns, and a future lesson's pose
chasing — ends with the same four steps (convert, desaturate, optimize,
command). So those four steps become one private helper, and everything else
becomes a thin caller.

The helper is about to publish the chassis's *desired* states, right next to
Lesson 7's *measured* ones, so it needs a second publisher first.

**Add to `Drivetrain`, alongside `m_moduleStatesPublisher`:**

```java
private final StructArrayPublisher<SwerveModuleVelocity> m_desiredModuleStatesPublisher =
    NetworkTableInstance.getDefault()
        .getStructArrayTopic("Drivetrain/DesiredModuleStates", SwerveModuleVelocity.struct)
        .publish();
```

**Add to `Drivetrain`:**

```java
/** One tick of chassis motion: convert, desaturate, optimize, command. */
private void applyChassisSpeeds(ChassisVelocities speeds) {
  SwerveModuleVelocity[] states = m_kinematics.toSwerveModuleVelocities(speeds);

  // If the request would drive some wheel past the max, scale ALL wheels
  // down proportionally so the *shape* of the motion is preserved.
  // desaturateWheelVelocities takes a LinearVelocity directly — pass kMaxSpeed as-is.
  states = SwerveDriveKinematics.desaturateWheelVelocities(states, DriveConstants.kMaxSpeed);

  m_lastCommandedOmega = speeds.omega / (2 * Math.PI); // rev/s for sim

  for (int i = 0; i < m_modules.length; i++) {
    states[i] = states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
    m_modules[i].setDesiredState(states[i]);
  }

  m_desiredModuleStatesPublisher.set(states);
}

/** Drive with full swerve freedom: translate and rotate at once. */
public Command drive(
    Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
  return runRepeatedly(
          () -> applyChassisSpeeds(new ChassisVelocities(vx.get(), vy.get(), omega.get())))
      .named("Drive");
}
```

`runRepeatedly` is the same helper `driveWithJoystick` used back in Lesson
2 — a plain block of code, run once per tick until something cancels the
command.

Its one-line translator means `turnToHeading` keeps working without a single
edit.

**Replace `commandRotation` in `Drivetrain`:**

```java
/** 'omegaRevPerSec' is revolutions per second (0.5 = half a turn per second). */
private void commandRotation(double omegaRevPerSec) {
  applyChassisSpeeds(new ChassisVelocities(0, 0, omegaRevPerSec * 2 * Math.PI));
}
```

While you're in the file, give `headingError` the same one-liner treatment
the module just got — its two `while` loops are the last hand-rolled wrap
left.

**Replace `headingError`'s body with:**

```java
private double headingError(double targetDegrees) {
  return MathUtil.inputModulus(targetDegrees - getHeadingDegrees(), -180, 180);
}
```

**Delete `Drivetrain`'s `import java.util.function.DoubleSupplier;`** — it
was only there for `translate`, which is gone.

Walk through `applyChassisSpeeds`, because it's the engine of everything
now. **`new ChassisVelocities(vx, vy, ω)`** packs "what I want the whole
robot to do" into a single value — two linear velocities and an angular one,
taken as the Units measures straight from `drive`'s suppliers. Peek at its
fields sometime and you'll find `vx`, `vy`, and `omega` are plain `double`s,
same story as `SwerveModuleVelocity.velocity` a section ago: the constructor
speaks Units, the value inside doesn't. **`toSwerveModuleVelocities`** is the
library math this lesson exists for: one chassis motion in, one
`SwerveModuleVelocity[]` out — one entry per corner, in the order you gave
the constructor. **`desaturateWheelVelocities`** matters at the edge of the
envelope: if translation-plus-rotation asks one wheel for 6 m/s but the max
is 4.7, it scales *all four* down so the motion keeps its shape, just
slower — without it, the overasked wheel silently caps and the robot curves
off course.

Now look closely at the loop, because it hides a real trap. `optimize`
doesn't change `states[i]` in place — it's a pure function, same as
`Rotation2d.rotateBy` or `Translation2d.plus`: it *returns* a new
`SwerveModuleVelocity`, and the original is untouched. Call
`states[i].optimize(...)` and throw away the result, and nothing happens —
the module gets commanded with the un-optimized state, silently. That's why
the loop reads `states[i] = states[i].optimize(...)` — assign it back before
it's used. The **indexed `for` loop** is the new loop shape from the
concepts list, and it's why: an enhanced `for` walks *one* array, but here
`states[i]` has to be paired with `m_modules[i]`, and pairing two arrays
takes an index. The **`m_lastCommandedOmega`** line keeps Lesson 8's fake
gyro fed — the units quietly upgraded from "fraction of full turn power" to
"revolutions per second," same idea, cleaner physics. And the final
`m_desiredModuleStatesPublisher.set(states)` publishes the *desired* states
right next to Lesson 7's measured ones — section 6 shows why that pair is
gold.

---

## 5. Optimize — steer the short way

Look at the `states[i] = states[i].optimize(...)` line above. It's cheap and
it matters: if the wheel is at `10°` and kinematics says "steer to `190°`
and drive at `+2 m/s`," it's much faster to steer to `10°` and drive at
**`-2 m/s`** (spin the drive motor backward) than to physically turn 180°.
`optimize` picks whichever of those two equivalent options is the shorter
*steering* move, flipping the drive speed's sign if needed, and hands back a
fresh `SwerveModuleVelocity` with the answer.

Without it, wheels routinely make 180° pirouettes for no reason, which looks
awful and burns time. With it, they nudge a few degrees and reverse — as
swerve robots should. Note what it needs to decide: the wheel's *current*
angle. That's why the measurement gets passed in.

It's also best friends with Lesson 9's cosine trick: `optimize` keeps every
steering move under 90°, which means the cosine scale in `setDesiredState`
never goes negative — the two together give you wheels that take the short
path *and* hold their push until they're pointed right.

---

## 6. Wire up the joysticks

Two edits to `RobotTeleop`'s constructor — a deletion and a replacement —
and the deletion is the kind of thing that's easy to skim past, so it gets
its own line:

**Delete from `RobotTeleop`'s constructor:** the Lesson 7 default
`translate` binding and both bumper `rotate` bindings. Those factories no
longer exist, and the right stick is taking over rotation. (The
`turnToHeading` bindings from Lesson 8 stay — they never stopped working.)

This is the classic swerve default: left stick translates, right stick
rotates.

**Add to `RobotTeleop`'s constructor:**

```java
robot.drivetrain.setDefaultCommand(
    robot.drivetrain.drive(
        () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),  // forward = +X
        () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),  // left    = +Y
        () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX())));

// ...turnToHeading bindings from Lesson 8 stay...
```

**Add to `RobotTeleop`'s imports:**

```java
import first.robot.Constants.DriveConstants;
```

Look at each supplier: the stick reads a fraction from −1 to 1, and
`kMaxSpeed.times(fraction)` scales the max-speed *measure* down to that
fraction — the result is still a `LinearVelocity`, exactly what `drive` now
asks for. No `maxMps` local, no `.in(...)` — the unit rides all the way from
the constant into `ChassisVelocities`. Same story for the rotation supplier
with `kMaxAngularSpeed`. This is the Units payoff: because every hop speaks
the type, there's simply no boundary to convert at until Phoenix's
`setThrottle`, deep inside `setDesiredState`.

Now, for the first time, a driver can drive forward *and* strafe *and*
rotate, all in the same tick. Run sim, open the **Swerve** tab, and push
both sticks: with `Drivetrain/ModuleStates` *and*
`Drivetrain/DesiredModuleStates` both dropped into the States slots, you see
two sets of arrows — where the wheels are told to be, and where they
actually are — mixing translation and spin per corner. When the two sets
track each other closely, your steering control is keeping up; when they
lag apart, you're watching exactly what to tune.

---

## 7. Field-relative driving (the swerve superpower)

Right now the sticks are **robot-relative**: pushing forward always drives
the robot in *its* forward direction, wherever it happens to be
pointing — which means after a 180° turn, forward is backward and half your
drivers' brains melt. Most drivers prefer **field-relative**: pushing
forward always drives *away from the driver's station*, regardless of robot
orientation. Thanks to the helper, this is now a genuinely small method —
one new line of math and a delegation.

**Add to `Drivetrain`:**

```java
public Command driveFieldRelative(
    Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
  return runRepeatedly(() -> {
    ChassisVelocities fieldSpeeds = new ChassisVelocities(vx.get(), vy.get(), omega.get());
    applyChassisSpeeds(fieldSpeeds.toRobotRelative(Rotation2d.fromDegrees(getHeadingDegrees())));
  }).named("Drive Field Relative");
}
```

The one new line is `fieldSpeeds.toRobotRelative(...)`: it rotates the
field-frame velocity into the robot's frame using the current heading — the
gyro from Lesson 8 quietly becoming load-bearing. `toRobotRelative` reads
the same way `optimize` and `cosineScale` do: it doesn't change
`fieldSpeeds`, it *returns* the converted value. Everything downstream still
speaks robot frame, and `applyChassisSpeeds` neither knows nor cares where
the speeds came from. That's the extraction paying rent already.

**Swap `drive` for `driveFieldRelative` in `setDefaultCommand`** — same
three suppliers, new method name. Then drive around and rotate the robot
with the right stick: "forward" on the left stick still moves the robot
toward the far end of the field. Once you feel it, you won't want to give it
up.

---

## Try it

1. **Watch a wheel optimize.** Set up: `drivetrain.drive(() ->
   MetersPerSecond.of(0.5), () -> MetersPerSecond.of(0), () ->
   RadiansPerSecond.of(0))` (a slow forward). Watch a module's steer angle in
   the Swerve tab. Then abruptly reverse to `MetersPerSecond.of(-0.5)`. The
   wheel should mostly not spin around — it should flip the drive sign
   instead. (`Drivetrain/DesiredModuleStates`'s arrows flip
   length-direction instead of swinging 180°.)
2. **Try a spin-while-driving auto:** in `Autos`, build `drivetrain.drive(()
   -> MetersPerSecond.of(1.0), () -> MetersPerSecond.of(0), () ->
   RadiansPerSecond.of(Math.PI / 2)).withTimeout(Seconds.of(2))` — drive
   forward at 1 m/s while spinning half a turn per second, for 2 seconds.
   Watch the plots (and the gyro).
3. **Slow-mode multiplier:** while a bumper is held, multiply the three
   suppliers' outputs by `0.25` for fine control. Compose it as a new
   command that wraps `drive(...)`.

---

## What you learned

Full swerve turned out to be a translation exercise: **`ChassisVelocities`**
says what you want the whole robot to do, **`SwerveDriveKinematics`**
translates that into per-wheel **`SwerveModuleVelocity`**s, and the two
hand-rolled commands from Lessons 7–8 collapsed into one `drive` that mixes
translation and rotation freely. Around the core came the guardrails —
**`desaturateWheelVelocities`** preserving the motion's shape when you
overask, **`optimize`** trading a 180° pirouette for a sign flip — plus the
**indexed `for` loop** for pairing two arrays, and one more win for Lesson
8's extraction habit: because every path funnels through
`applyChassisSpeeds`, field-relative driving cost one line and
`turnToHeading` survived untouched. One library tool also graduated:
**`MathUtil.inputModulus`** retired the wrap loop, the same trade your
hand-rolled `clamp` *didn't* get to make, because this alpha never shipped
one to graduate to. The quieter thread running through the whole lesson:
`optimize`, `cosineScale`, and `toRobotRelative` all share a shape — call
them, get a new value back, original untouched — the same immutable style
`Rotation2d` and `Translation2d` have had all along, now showing up in the
kinematics types too. **Field-relative** is the version your drivers will
never let you take away. One thing is still missing: the robot can move any
way you ask, but it has no idea *where it is*. A future lesson gives it a
map.

Next: Lesson 11 — Odometry & field view.
