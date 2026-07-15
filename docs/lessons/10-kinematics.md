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
constantly (imagine turning the corner around an obstacle) — you need per-wheel
math that mixes the two.

That math turns out to be simple: at each corner, add the **translation
velocity vector** to the **rotation velocity vector** (which is `ω × r` tangent
to the center). WPILib packages it as **`SwerveDriveKinematics`** so you never
have to re-derive it. Give it a `ChassisSpeeds`; it hands back four
`SwerveModuleState`s.

---

## 2. Build the kinematics object

Kinematics needs the four module locations you set up in Lesson 7. Add to
`Drivetrain`:

```java
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModuleState;
```

```java
private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
    m_modules[0].location,
    m_modules[1].location,
    m_modules[2].location,
    m_modules[3].location);
```

The order matters — whatever order you list the corners here is the order
`toSwerveModuleStates` will return states in. Match the array you built in
Lesson 7 (FL, FR, BL, BR) exactly.

Also introduce a max wheel speed in `Constants.java` — we'll need it to convert
between "meters per second" (what kinematics speaks) and "fraction of max motor
output" (what `m_driveMotor.set(...)` wants):

```java
public static class DriveConstants {
  // ... existing constants ...

  // Kraken X60 free speed ≈ 6000 RPM. Divide by 60 for RPS, then by gear
  // ratio, then multiply by circumference. About 4.7 m/s for our numbers.
  public static final double kMaxSpeedMps = 100.0 / kDriveGearRatio * kWheelCircumferenceMeters;
}
```

---

## 3. Teach the module to speak meters per second

`SwerveModule.setDesiredState` currently takes a `speedFraction` (`-1..1`).
Kinematics speaks meters per second. Update the module to accept a full
`SwerveModuleState` and do the conversion in one place:

```java
import edu.wpi.first.math.kinematics.SwerveModuleState;
import frc.robot.Constants.DriveConstants;
```

```java
public void setDesiredState(SwerveModuleState state) {
  m_targetSteerDegrees = state.angle.getDegrees();
  m_targetDriveSpeed   = state.speedMetersPerSecond / DriveConstants.kMaxSpeedMps;
}
```

Delete the old two-argument overload — callers switch over in the next section.
`SwerveModuleState` bundles the two numbers together with clear units and lets
`optimize` do useful work on the pair (§5). One method, one type; less to hold
in your head.

> The one place that still needs a plain-doubles setter is
> `Drivetrain.driveDistance` from Lesson 9 (it commands `angleDegrees=0`,
> `speedFraction=0.4`). Update it to build a `SwerveModuleState`:
> `new SwerveModuleState(0.4 * DriveConstants.kMaxSpeedMps, Rotation2d.fromDegrees(0))`.
> Same pattern anywhere else you called `setDesiredState(angle, speed)`.

---

## 4. Replace `translate` and `rotate` with one `drive`

Now the payoff. **Delete** the `translate` and `rotate` command factories (and
the private `commandRotation` from Lesson 8) — kinematics subsumes both.
Replace them with a single `drive`:

```java
public Command drive(DoubleSupplier vxMps, DoubleSupplier vyMps, DoubleSupplier omegaRadPerSec) {
  return run(() -> {
    ChassisSpeeds speeds = new ChassisSpeeds(
        vxMps.getAsDouble(),
        vyMps.getAsDouble(),
        omegaRadPerSec.getAsDouble());

    SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);

    // If the request would drive some wheel past kMaxSpeedMps, scale ALL
    // wheels down proportionally so the *shape* of the motion is preserved.
    SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeedMps);

    m_lastCommandedOmega = speeds.omegaRadiansPerSecond / (2 * Math.PI); // rev/s for sim

    for (int i = 0; i < m_modules.length; i++) {
      SwerveModuleState desired = states[i];
      desired.optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
      m_modules[i].setDesiredState(desired);
    }
  });
}
```

**What each line is doing:**

- **`new ChassisSpeeds(vx, vy, ω)`** packs "what I want the whole robot to do"
  into a single value. Units are meters/sec and radians/sec.
- **`m_kinematics.toSwerveModuleStates(speeds)`** returns a `SwerveModuleState[]`
  — one entry per corner, in the same order you passed to the
  `SwerveDriveKinematics` constructor. Each state has an `angle` and a
  `speedMetersPerSecond`. That's the whole math the library exists for.
- **`desaturateWheelSpeeds`** matters at the edge of the envelope: if the sum
  of translation and rotation asks one wheel to go 6 m/s but the max is 4.7,
  it scales *all four* wheels down so the motion still points the right way,
  just slower.
- The **`for (int i = 0; ...)`** loop uses an index because we need to pair
  `states[i]` with `m_modules[i]` — an enhanced for-loop can't do two arrays
  at once.
- **`m_lastCommandedOmega`** bookkeeping for the sim gyro from Lesson 8. Units
  changed from "fraction of 360°/sec" to "revolutions/sec" here — same
  concept, cleaner physics.

---

## 5. Optimize — steer the short way

Look at `desired.optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()))`
above. It's cheap and it matters: if the wheel is at `10°` and kinematics says
"steer to `190°` and drive at `+2 m/s`," it's much faster to steer to `10°` and
drive at **`-2 m/s`** (i.e. spin the drive motor backward). `optimize` picks
whichever of those two equivalent options is a shorter *steering* move, and
flips the drive speed's sign if needed.

Without it, wheels routinely make 180° pirouettes for no reason, which looks
awful and burns time. With it, they nudge a few degrees and reverse — as swerve
robots should.

---

## 6. Wire up the joysticks

Left stick translates, right stick rotates — the classic swerve layout:

```java
m_drivetrain.setDefaultCommand(
    m_drivetrain.drive(
        () -> -m_driverController.getLeftY()  * DriveConstants.kMaxSpeedMps,
        () -> -m_driverController.getLeftX()  * DriveConstants.kMaxSpeedMps,
        () -> -m_driverController.getRightX() * Math.PI * 2)); // ±2π rad/s = ±1 rev/s
```

Now, for the first time, a driver can drive forward *and* strafe *and* rotate,
all in the same tick. Push both sticks — the wheels distribute the two motions
per corner and the chassis both translates and spins.

---

## 7. Field-relative driving (the swerve superpower)

Right now the sticks are **robot-relative**: pushing forward always drives the
robot in *its* forward direction, wherever it happens to be pointing. Most
drivers prefer **field-relative**: pushing forward always drives *away from
the driver's station*, regardless of how the robot is oriented. Kinematics makes
this a one-line change with the gyro from Lesson 8:

```java
public Command driveFieldRelative(
    DoubleSupplier vxMps, DoubleSupplier vyMps, DoubleSupplier omegaRadPerSec) {
  return run(() -> {
    ChassisSpeeds fieldSpeeds = new ChassisSpeeds(
        vxMps.getAsDouble(), vyMps.getAsDouble(), omegaRadPerSec.getAsDouble());
    ChassisSpeeds robotSpeeds = ChassisSpeeds.fromFieldRelativeSpeeds(
        fieldSpeeds, Rotation2d.fromDegrees(getHeadingDegrees()));

    SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(robotSpeeds);
    SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeedMps);
    m_lastCommandedOmega = robotSpeeds.omegaRadiansPerSecond / (2 * Math.PI);
    for (int i = 0; i < m_modules.length; i++) {
      states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
      m_modules[i].setDesiredState(states[i]);
    }
  });
}
```

Only one line is new: `ChassisSpeeds.fromFieldRelativeSpeeds(...)` rotates the
field-frame velocity into the robot's frame using the current heading. The rest
is identical — everything downstream still speaks robot frame.

Bind this instead of `drive` in `setDefaultCommand`, drive around, and rotate
the robot with the right stick — "forward" on the left stick still moves the
robot toward the far end of the field. Once you feel it, you won't want to give
it up.

---

## Try it

1. **Watch a wheel optimize.** Set up: `drivetrain.drive(() -> 0.5, () -> 0,
   () -> 0)` (a slow forward). Print each module's *desired angle* and *actual
   speed sign*. Then abruptly reverse to `-0.5`. The wheel should mostly not
   spin around — it should flip the drive sign.
2. **Try a spin-while-driving auto:** in `Autos`, build
   `drivetrain.drive(() -> 1.0, () -> 0, () -> Math.PI/2).withTimeout(2.0)` —
   drive forward at 1 m/s while spinning half a turn per second, for 2 seconds.
   Watch the plots (and the gyro).
3. **Slow-mode multiplier:** while a bumper is held, multiply the three
   suppliers' outputs by `0.25` for fine control. Compose it as a new command
   that wraps `drive(...)`.

---

## What you learned

- `ChassisSpeeds` describes what you want the *whole robot* to do; kinematics
  turns it into per-wheel `SwerveModuleState`s.
- **`desaturateWheelSpeeds`** keeps the motion shape correct when you overask;
  **`optimize`** keeps the steering moves small.
- The **same `drive` command** covers translation, rotation, and mixed motion —
  the two hand-rolled commands from Lessons 7–8 collapse into one.
- **Field-relative** driving is a `ChassisSpeeds.fromFieldRelativeSpeeds` call
  with the gyro's heading — no additional math on your end.

Next: [Lesson 11 — Odometry & the Field2d view](11-odometry-field.md).
