# Lesson 10 — Full swerve: `SwerveDriveKinematics`

**Goal:** Replace the hand-rolled `translate` and `rotate` from Lessons 7–8 with
WPILib's `SwerveDriveKinematics`, so the chassis can **translate and rotate at
the same time** — the "full swerve" behavior — plus pick the shortest steering
path per wheel.

**New Java concepts**
- **Static factories** and small **data-carrier objects** (`ChassisSpeeds`,
  `SwerveModuleState`)
- **Indexed `for` loops** when you need to pair items from two arrays
- Library types with meaningful units (`Rotation2d`, `SwerveModuleState.optimize`)

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

---

## 2. Build the kinematics object

Kinematics needs the four module locations you set up in Lesson 7. Add to
`Drivetrain` — the imports are mostly familiar; only the two `kinematics` ones
are new:

```java
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
```

The field has to sit **below** `m_modules` — it's built by reading the
modules' locations, and you know the rule by now: when one field is built from
another, the one it depends on goes first.

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

Also introduce a max wheel speed in `Constants.java` — we'll need it to convert
between "meters per second" (what kinematics speaks) and "fraction of max motor
output" (what `m_driveMotor.set(...)` wants):

```java
public static class DriveConstants {
  // ...existing constants stay...

  // Kraken X60 free speed ≈ 6000 RPM = 100 rotations/sec. Divide by the gear
  // ratio, multiply by circumference. About 4.7 m/s for our numbers.
  public static final double kMaxSpeedMps = 100.0 / kDriveGearRatio * kWheelCircumferenceMeters;
}
```

(That's the same ~5 m/s you eyeballed for the Swerve tab's Max Speed setting
in Lesson 7 — now it's a named constant instead of a guess.)

---

## 3. Teach the module to speak meters per second

`SwerveModule.setDesiredState` currently takes a `speedFraction` (`-1..1`).
Kinematics speaks meters per second. Update the module to accept a full
`SwerveModuleState` and do the conversion in one place. In `SwerveModule`,
two imports (`Rotation2d` is already there):

```java
import edu.wpi.first.math.kinematics.SwerveModuleState;
import frc.robot.Constants.DriveConstants;
```

And replace the two-argument `setDesiredState` with:

```java
public void setDesiredState(SwerveModuleState state) {
  m_targetSteerDegrees = state.angle.getDegrees();
  m_targetDriveSpeed   = state.speedMetersPerSecond / DriveConstants.kMaxSpeedMps;
}
```

Delete the old two-argument version — callers switch over in the next section.
`SwerveModuleState` bundles the two numbers together with clear units and lets
`optimize` do useful work on the pair (section 5). One method, one type; less
to hold in your head.

> The one place that still needs updating by hand is `Drivetrain.driveDistance`
> from Lesson 9 (it commands `angleDegrees=0`, `speedFraction=0.4`). Update its
> two `setDesiredState` calls to build states:
> `new SwerveModuleState(0.4 * DriveConstants.kMaxSpeedMps, Rotation2d.fromDegrees(0))`
> to drive, and speed `0` in `finallyDo` to stop. Same pattern anywhere else
> you called `setDesiredState(angle, speed)` — let the compiler's red list
> walk you to each one, Lesson 7 style.

---

## 4. Replace `translate` and `rotate` with one `drive`

Now the payoff. **Delete** the `translate` and `rotate` command factories —
kinematics subsumes both. But *don't* delete `commandRotation`: Lesson 8's
`turnToHeading` still calls it, and breaking a working command is not part of
the plan. Instead, we'll rebuild the machinery underneath it.

Here's the move, and it's Lesson 8's own trick again: every path into the
drivetrain — stick driving, heading turns, and next lesson's pose chasing —
ends with the same four steps (convert, desaturate, optimize, command). So
those four steps become one private helper, and everything else becomes a thin
caller:

```java
/** One tick of chassis motion: convert, desaturate, optimize, command. */
private void applyChassisSpeeds(ChassisSpeeds speeds) {
  SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);

  // If the request would drive some wheel past kMaxSpeedMps, scale ALL
  // wheels down proportionally so the *shape* of the motion is preserved.
  SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeedMps);

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

And `commandRotation` shrinks to a one-line translator, so `turnToHeading`
keeps working without a single edit:

```java
/** 'omega' is now revolutions per second (0.5 = half a turn per second). */
private void commandRotation(double omegaRevPerSec) {
  applyChassisSpeeds(new ChassisSpeeds(0, 0, omegaRevPerSec * 2 * Math.PI));
}
```

Walk through `applyChassisSpeeds`, because it's the engine of everything now.
**`new ChassisSpeeds(vx, vy, ω)`** packs "what I want the whole robot to do"
into a single value — meters per second twice, then radians per second.
**`toSwerveModuleStates(speeds)`** is the library math this lesson exists for:
in comes one chassis motion, out comes a `SwerveModuleState[]` — one entry per
corner, in the order you gave the constructor. **`desaturateWheelSpeeds`**
matters at the edge of the envelope: if translation-plus-rotation asks one
wheel for 6 m/s but the max is 4.7, it scales *all four* down so the motion
keeps its shape, just slower — without it, the overasked wheel silently caps
and the robot curves off course. The **indexed `for` loop** is the new loop
shape from the concepts list: an enhanced `for` walks *one* array, but here
`states[i]` must be paired with `m_modules[i]`, and pairing two arrays takes
an index. The **`m_lastCommandedOmega`** line keeps Lesson 8's fake gyro fed —
note the units quietly upgraded from "fraction of full turn power" to
"revolutions per second"; same concept, cleaner physics. And the final
**`Logger.recordOutput`** logs the *desired* states right next to Lesson 7's
measured ones — section 6 shows why that pair is gold.

---

## 5. Optimize — steer the short way

Look at the `states[i].optimize(...)` line
above. It's cheap and it matters: if the wheel is at `10°` and kinematics says
"steer to `190°` and drive at `+2 m/s`," it's much faster to steer to `10°` and
drive at **`-2 m/s`** (i.e. spin the drive motor backward). `optimize` picks
whichever of those two equivalent options is a shorter *steering* move, and
flips the drive speed's sign if needed.

Without it, wheels routinely make 180° pirouettes for no reason, which looks
awful and burns time. With it, they nudge a few degrees and reverse — as swerve
robots should. Note what it needs to decide: the wheel's *current* angle.
That's why the measurement gets passed in.

---

## 6. Wire up the joysticks

In `configureBindings()`, out with the old, in with the one: delete the
Lesson 7 default `translate` command and both bumper `rotate` bindings —
those factories no longer exist, and the right stick is taking over rotation.
(The A/B `turnToHeading` bindings from Lesson 8 stay; they never stopped
working.) The new default is the classic swerve layout — left stick
translates, right stick rotates:

```java
  private void configureBindings() {
    m_drivetrain.setDefaultCommand(
        m_drivetrain.drive(
            () -> -m_driverController.getLeftY()  * DriveConstants.kMaxSpeedMps,
            () -> -m_driverController.getLeftX()  * DriveConstants.kMaxSpeedMps,
            () -> -m_driverController.getRightX() * Math.PI * 2)); // ±2π rad/s = ±1 rev/s

    // ...turnToHeading bindings from Lesson 8 stay...
  }
```

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
delegation:

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
field-relative driving cost one line, `turnToHeading` survived untouched, and
the desired-vs-measured states now sit side by side in the Swerve tab.
**Field-relative** is the version your drivers will never let you take away.
One thing is still missing: the robot can move any way you ask, but it has no
idea *where it is*. Lesson 11 gives it a map.

Next: [Lesson 11 — Odometry & the field view](11-odometry-field.md).
