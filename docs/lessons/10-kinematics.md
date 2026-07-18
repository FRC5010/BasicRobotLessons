# Lesson 10 — Full swerve: `SwerveDriveKinematics`

**Goal:** Replace the hand-rolled `translate` and `rotate` from Lessons 7–8 with
WPILib's `SwerveDriveKinematics`, so the chassis can **translate and rotate at
the same time** — the "full swerve" behavior — plus pick the shortest steering
path per wheel.

**New Java concepts**
- **Static factories** and small **data-carrier objects** (`ChassisSpeeds`,
  `SwerveModuleState`)
- **Indexed `for` loops** when you need to pair items from two arrays
- The **WPILib Units library** — the unit lives in the *type*, not the name
- **`MathUtil.inputModulus`** — the wrap loop as a one-liner

**New robot concepts**
- **`SwerveDriveKinematics`** — the math that turns a whole-chassis motion into
  four per-wheel motions
- **`ChassisSpeeds`** — the "what I want" of chassis motion: `vx`, `vy`, `ω`
- **`SwerveModuleState`** — the "what each wheel does" answer: angle + speed
- **Speed desaturation** — capping wheel speeds when the request exceeds physics
- **State optimization** — always steering the *short* way to a target
- **Field-relative** driving using the gyro

---

## 1. Why kinematics?

Lesson 7's `translate` handles "drive in a direction." Lesson 8's `rotate`
handles "spin in place." What both refuse to do is *both at once*: they each
call `setDesiredState` on every module, and calling `rotate` cancels `translate`
because they require the same subsystem. Real swerve robots drive-and-spin
constantly (imagine sweeping around a defender while keeping your shooter
pointed at the goal) — you need per-wheel math that mixes the two.

That math turns out to be simple: at each corner, add the **translation
velocity vector** to the **rotation velocity vector** (which is `ω × r` tangent
to the center). WPILib packages it as **`SwerveDriveKinematics`** so you never
have to re-derive it. Give it a `ChassisSpeeds`; it hands back four
`SwerveModuleState`s. You shook hands with `SwerveModuleState` back in
Lesson 7, logging it for the Swerve tab. Today it stops being just telemetry
and becomes the language the whole drivetrain speaks.

This is also where the course starts using two tools it has been carefully
*not* using — WPILib's Units library and its wrap helper — because you've now
done both by hand and know what they do. That's the deal from here on: learn
it the hard way once, then let the library carry it.

---

## 2. Build the kinematics object

**Add to `Drivetrain.java`'s imports** (only these two are new — `Rotation2d`
and `SwerveModuleState` came in with Lesson 7's logging):

```java
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
```

**Add to `Drivetrain`, directly below the `m_modules` field** — it's built by
reading the modules' locations, and you know the rule by now: when one field is
built from another, the one it depends on goes first.

```java
private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
    m_modules[0].location,
    m_modules[1].location,
    m_modules[2].location,
    m_modules[3].location);
```

The order matters — whatever order you list the corners here is the order
`toSwerveModuleStates` will return states in. Match the array you built in
Lesson 7 (FL, FR, BL, BR) exactly. A swapped pair here produces a robot that
*almost* drives right, which is the most confusing kind of wrong.

Now a max wheel speed, because we need to convert between "meters per second"
(what kinematics speaks) and "fraction of full power" (what `m_driveMotor.set`
wants) — and this is the moment to meet **WPILib Units**.

You've been encoding units in *names* this whole course: `kWheelDiameterMeters`,
`kMaxSpeedMps`. It works right until the day someone reads the wheel diameter as
meters when you meant inches, and the compiler — seeing only a `double` — says
nothing. WPILib ships a types library that puts the unit in the *type* instead:
a **`LinearVelocity`** value *knows* it's a speed, converts itself to whatever
unit you ask for, and can't be silently mistaken for an `Angle`. From here on
we pepper Units into new constants and signatures. The fast per-tick math still
runs in plain `double`s, so you convert at the edges with `.in(...)` — the
`Mps` suffix moves out of the name and into a method call.

**Add to `DriveConstants` in `Constants.java`** (with the static Units import at
the top of the file):

```java
import static edu.wpi.first.units.Units.*;
import edu.wpi.first.units.measure.LinearVelocity;
```

```java
public static class DriveConstants {
  // ...existing constants stay as doubles for now...

  // Kraken X60 free speed ≈ 6000 RPM = 100 rotations/sec. Divide by the gear
  // ratio, multiply by circumference → meters/sec. About 4.7 m/s for our numbers.
  public static final LinearVelocity kMaxSpeed =
      MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters);
}
```

`MetersPerSecond.of(...)` builds a `LinearVelocity` from a plain number — the
arithmetic stays in doubles (readable), and the *result* becomes unit-aware.
That's the pattern: **compute in doubles, wrap the answer.** (This is the same
~5 m/s you eyeballed for the Swerve tab's Max Speed in Lesson 7 — now it's a
typed constant instead of a guess. The older `kWheel...` doubles can migrate to
`Distance` the same way whenever you next touch them; no rush.)

---

## 3. Teach the module to speak meters per second

`SwerveModule.setDesiredState` currently takes a `speedFraction` (`-1..1`).
Kinematics speaks meters per second. Update the module to accept a full
`SwerveModuleState` and do the conversion in one place.

**Add to `SwerveModule.java`'s imports** (`MathUtil` is already imported from
Lesson 7's `clamp`):

```java
import static edu.wpi.first.units.Units.MetersPerSecond;

import edu.wpi.first.math.kinematics.SwerveModuleState;
import frc.robot.Constants.DriveConstants;
```

**Replace the two-argument `setDesiredState` with:**

```java
/** One tick of control: chase the given state. */
public void setDesiredState(SwerveModuleState state) {
  // Steering: the same P control, error wrapped to ±180° in one call now.
  double error = MathUtil.inputModulus(
      state.angle.getDegrees() - getSteerAngleDegrees(), -180, 180);
  m_steerMotor.set(MathUtil.clamp(SteerConstants.kP * error, -1.0, 1.0));

  // Drive: meters per second → fraction of max, with the cosine scale.
  double alignment = Math.cos(Math.toRadians(error));
  double fraction = state.speedMetersPerSecond / DriveConstants.kMaxSpeed.in(MetersPerSecond);
  m_driveMotor.set(fraction * alignment);
}
```

Delete the old two-argument version — callers switch over in the next section.
Two of this lesson's tools show up in that little method. The two `while` loops
you wrote in Lesson 5 to wrap the error into ±180° collapse into
**`MathUtil.inputModulus(value, -180, 180)`** — it does exactly what the loops
did, and it's the same trade you made in Lesson 7 when your hand-rolled clamp
became `MathUtil.clamp`. You wrote the loop by hand so you'd understand it; now
you get the one-liner. And **`kMaxSpeed.in(MetersPerSecond)`** is the Units
boundary in action: the constant is a typed `LinearVelocity`, but the division
needs a plain number, so `.in(...)` hands one back. Unit-safe where it's
stored, plain double where the math runs.

Otherwise the control body carried over intact — the target arrives as a
`SwerveModuleState`, which bundles the angle and speed with clear units and lets
`optimize` do useful work on the pair (section 5). One method, one type; less to
hold in your head.

> **Update `Drivetrain.driveDistance` from Lesson 9** — it commanded
> `setDesiredState(0.0, 0.4)`, which no longer compiles. Build a state instead:
> `new SwerveModuleState(0.4 * DriveConstants.kMaxSpeed.in(MetersPerSecond), Rotation2d.fromDegrees(0))`
> to drive, and speed `0` in `finallyDo` to stop. Same fix anywhere else you
> called `setDesiredState(angle, speed)` — let the compiler's red list walk you
> to each one, Lesson 7 style.

---

## 4. Replace `translate` and `rotate` with one `drive`

Now the payoff. **Delete the `translate` and `rotate` command factories** from
`Drivetrain` — kinematics subsumes both. But *don't* delete `commandRotation`:
Lesson 8's `turnToHeading` still calls it, and breaking a working command is not
part of the plan. Instead, we'll rebuild the machinery underneath it.

Here's the move, and it's Lesson 8's own trick again: every path into the
drivetrain — stick driving, heading turns, and next lesson's pose chasing —
ends with the same four steps (convert, desaturate, optimize, command). So
those four steps become one private helper, and everything else becomes a thin
caller.

**Add to `Drivetrain`:**

```java
/** One tick of chassis motion: convert, desaturate, optimize, command. */
private void applyChassisSpeeds(ChassisSpeeds speeds) {
  SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);

  // If the request would drive some wheel past the max, scale ALL wheels
  // down proportionally so the *shape* of the motion is preserved.
  SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeed.in(MetersPerSecond));

  m_lastCommandedOmega = speeds.omegaRadiansPerSecond / (2 * Math.PI); // rev/s for sim

  for (int i = 0; i < m_modules.length; i++) {
    states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
    m_modules[i].setDesiredState(states[i]);
  }

  Logger.recordOutput("Drivetrain/DesiredModuleStates", states);
}

/** Drive with full swerve freedom: translate and rotate at once. */
public Command drive(DoubleSupplier vxMps, DoubleSupplier vyMps, DoubleSupplier omegaRadPerSec) {
  return run(() -> applyChassisSpeeds(new ChassisSpeeds(
      vxMps.getAsDouble(), vyMps.getAsDouble(), omegaRadPerSec.getAsDouble())));
}
```

**Replace `commandRotation` in `Drivetrain` with** its one-line translator, so
`turnToHeading` keeps working without a single edit:

```java
/** 'omega' is now revolutions per second (0.5 = half a turn per second). */
private void commandRotation(double omegaRevPerSec) {
  applyChassisSpeeds(new ChassisSpeeds(0, 0, omegaRevPerSec * 2 * Math.PI));
}
```

Walk through `applyChassisSpeeds`, because it's the engine of everything now.
**`new ChassisSpeeds(vx, vy, ω)`** packs "what I want the whole robot to do"
into a single value — meters per second twice, then radians per second. (These
WPILib data-carriers take plain doubles, which is exactly why `kMaxSpeed` gets
unwrapped with `.in(MetersPerSecond)` right above: the Units live in your
constants, the doubles live at the library's door.) **`toSwerveModuleStates`**
is the library math this lesson exists for: in comes one chassis motion, out
comes a `SwerveModuleState[]` — one entry per corner, in the order you gave the
constructor. **`desaturateWheelSpeeds`** matters at the edge of the envelope: if
translation-plus-rotation asks one wheel for 6 m/s but the max is 4.7, it scales
*all four* down so the motion keeps its shape, just slower — without it, the
overasked wheel silently caps and the robot curves off course. The **indexed
`for` loop** is the new loop shape from the concepts list: an enhanced `for`
walks *one* array, but here `states[i]` must be paired with `m_modules[i]`, and
pairing two arrays takes an index. The **`m_lastCommandedOmega`** line keeps
Lesson 8's fake gyro fed — note the units quietly upgraded from "fraction of
full turn power" to "revolutions per second"; same concept, cleaner physics.
And the final **`Logger.recordOutput`** logs the *desired* states right next to
Lesson 7's measured ones — section 6 shows why that pair is gold.

---

## 5. Optimize — steer the short way

Look at the `states[i].optimize(...)` line above. It's cheap and it matters: if
the wheel is at `10°` and kinematics says "steer to `190°` and drive at
`+2 m/s`," it's much faster to steer to `10°` and drive at **`-2 m/s`** (i.e.
spin the drive motor backward). `optimize` picks whichever of those two
equivalent options is a shorter *steering* move, and flips the drive speed's
sign if needed.

Without it, wheels routinely make 180° pirouettes for no reason, which looks
awful and burns time. With it, they nudge a few degrees and reverse — as swerve
robots should. Note what it needs to decide: the wheel's *current* angle.
That's why the measurement gets passed in.

It's also best friends with Lesson 9's cosine trick: `optimize` keeps every
steering move under 90°, which means the cosine scale in `setDesiredState`
never goes negative — the two together give you wheels that take the short path
*and* hold their push until they're pointed right.

---

## 6. Wire up the joysticks

**Edit `configureBindings()`** — out with the old, in with the one: delete the
Lesson 7 default `translate` command and both bumper `rotate` bindings (those
factories no longer exist, and the right stick is taking over rotation). The A/B
`turnToHeading` bindings from Lesson 8 stay; they never stopped working. The new
default is the classic swerve layout — left stick translates, right stick
rotates:

```java
  private void configureBindings() {
    m_drivetrain.setDefaultCommand(
        m_drivetrain.drive(
            () -> -m_driverController.getLeftY()  * DriveConstants.kMaxSpeed.in(MetersPerSecond),
            () -> -m_driverController.getLeftX()  * DriveConstants.kMaxSpeed.in(MetersPerSecond),
            () -> -m_driverController.getRightX() * Math.PI * 2)); // ±2π rad/s = ±1 rev/s

    // ...turnToHeading bindings from Lesson 8 stay...
  }
```

(That `.in(MetersPerSecond)` needs `import static edu.wpi.first.units.Units.MetersPerSecond;`
at the top of `RobotContainer` — `Ctrl+.` adds it.) The stick reads a fraction
from −1 to 1; multiplying by the max speed turns it into real m/s, which is what
`drive` expects.

Now, for the first time, a driver can drive forward *and* strafe *and* rotate,
all in the same tick. Run sim, open the **Swerve** tab, and push both sticks:
with `Drivetrain/ModuleStates` *and* `Drivetrain/DesiredModuleStates` both
dropped into the States slots, you see two sets of arrows — where the wheels
are told to be, and where they actually are — mixing translation and spin per
corner. When the two sets track each other closely, your steering control is
keeping up; when they lag apart, you're watching exactly what to tune.

---

## 7. Field-relative driving (the swerve superpower)

Right now the sticks are **robot-relative**: pushing forward always drives the
robot in *its* forward direction, wherever it happens to be pointing — which
means after a 180° turn, forward is backward and half your drivers' brains
melt. Most drivers prefer **field-relative**: pushing forward always drives
*away from the driver's station*, regardless of robot orientation. Thanks to
the helper, this is now a genuinely small method — one new line of math and a
delegation.

**Add to `Drivetrain`:**

```java
public Command driveFieldRelative(
    DoubleSupplier vxMps, DoubleSupplier vyMps, DoubleSupplier omegaRadPerSec) {
  return run(() -> {
    ChassisSpeeds fieldSpeeds = new ChassisSpeeds(
        vxMps.getAsDouble(), vyMps.getAsDouble(), omegaRadPerSec.getAsDouble());
    applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
        fieldSpeeds, Rotation2d.fromDegrees(getHeadingDegrees())));
  });
}
```

The one new line is `ChassisSpeeds.fromFieldRelativeSpeeds(...)`: it rotates
the field-frame velocity into the robot's frame using the current heading —
the gyro from Lesson 8 quietly becoming load-bearing. Everything downstream
still speaks robot frame, and `applyChassisSpeeds` neither knows nor cares
where the speeds came from. That's the extraction paying rent already.

Bind this instead of `drive` in `setDefaultCommand`, drive around, and rotate
the robot with the right stick — "forward" on the left stick still moves the
robot toward the far end of the field. Once you feel it, you won't want to give
it up.

---

## Try it

1. **Watch a wheel optimize.** Set up: `drivetrain.drive(() -> 0.5, () -> 0,
   () -> 0)` (a slow forward). Print each module's *desired angle* and *actual
   speed sign*. Then abruptly reverse to `-0.5`. The wheel should mostly not
   spin around — it should flip the drive sign. (The Swerve tab shows this
   beautifully: desired arrows flip length-direction instead of swinging 180°.)
2. **Try a spin-while-driving auto:** in `Autos`, build
   `drivetrain.drive(() -> 1.0, () -> 0, () -> Math.PI/2).withTimeout(2.0)` —
   drive forward at 1 m/s while spinning half a turn per second, for 2 seconds.
   Watch the plots (and the gyro).
3. **Slow-mode multiplier:** while a bumper is held, multiply the three
   suppliers' outputs by `0.25` for fine control. Compose it as a new command
   that wraps `drive(...)`.

---

## What you learned

Full swerve turned out to be a translation exercise: **`ChassisSpeeds`** says
what you want the whole robot to do, **`SwerveDriveKinematics`** translates
that into per-wheel **`SwerveModuleState`**s, and the two hand-rolled commands
from Lessons 7–8 collapsed into one `drive` that mixes translation and
rotation freely. Around the core came the guardrails —
**`desaturateWheelSpeeds`** preserving the motion's shape when you overask,
**`optimize`** trading a 180° pirouette for a sign flip — plus the **indexed
`for` loop** for pairing two arrays, and one more win for Lesson 8's
extraction habit: because every path funnels through `applyChassisSpeeds`,
field-relative driving cost one line and `turnToHeading` survived untouched.
Two library tools also arrived, both earned by having done the work by hand:
**`MathUtil.inputModulus`** retired the wrap loop, and the **Units library**
started carrying your physical constants — unit-safe where they live, plain
`double` at the math with `.in(...)`. **Field-relative** is the version your
drivers will never let you take away. One thing is still missing: the robot can
move any way you ask, but it has no idea *where it is*. Lesson 11 gives it a map.

Next: [Lesson 11 — Odometry & the field view](11-odometry-field.md).
