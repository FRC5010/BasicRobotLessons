# Lesson 8 — Gyro & heading: turn the robot to a compass direction

**Goal:** Add a Pigeon 2 to the `Drivetrain` from Lesson 7, then use the same P
control from Lesson 5 to make the chassis **turn to a target heading and stop**
— on its own, using real chassis rotation (not a made-up sensor value).

**New Java concepts**
- Adding a **field** to an existing subsystem
- **Reusing a pattern** (P control) on a whole-robot quantity
- Extracting a private helper method to avoid duplicating logic

**New robot concepts**
- The **gyroscope** and **yaw** (heading)
- Closing a control loop on **heading**, using the `rotate()` command as the
  actuator
- Faking a gyro in sim by integrating the *commanded* chassis rotation rate

---

## 1. The gyro belongs on the Drivetrain

An encoder tells you how far a *motor* turned. A **gyro** tells you how far the
*whole robot* has rotated. The Pigeon 2 reports **yaw** — rotation about the
vertical axis, i.e. heading — in degrees. `0°` is wherever the robot was pointing
when the gyro zeroed, and positive is CCW (the convention from Lesson 7, holding
as promised).

Where should it live? Heading is a *chassis* fact — no single module knows it,
and no single module needs it alone — so the gyro goes on `Drivetrain`, not in
`SwerveModule` and not in some new subsystem. Open `Drivetrain.java`.

`Logger` is already imported from Lesson 7.

**Add to `Drivetrain.java`'s imports:**

```java
import com.ctre.phoenix6.hardware.Pigeon2;
import frc.robot.Constants.HeadingConstants;
```

The gyro is hardware; the two doubles are sim bookkeeping whose job becomes
clear in section 5.

**Add to `Drivetrain`, below the modules array:**

```java
private final Pigeon2 m_gyro = new Pigeon2(0); // CAN ID 0 — change to yours

// Remembered for the sim: what rotation rate did we just command?
private double m_lastCommandedOmega = 0.0;
private double m_simHeadingDegrees  = 0.0;
```

Notice those two aren't `final` — they're *memory*, a running total the sim
rewrites every tick, which is why they're plain mutable `double`s and not
`final` like the hardware fields around them.

**Add to `Drivetrain`, with the other public methods:**

```java
/** Robot heading in degrees (CCW positive). */
public double getHeadingDegrees() {
  return m_gyro.getYaw().getValueAsDouble();
}
```

Reading yaw has the same shape as reading motor position: `getYaw()` returns a
signal, `.getValueAsDouble()` pulls the number out. Sensors all feel alike once
you've read one.

Finally, log it. Two lines, two audiences.

**Add to `Drivetrain.periodic()`, alongside the module telemetry:**

```java
  @Override
  public void periodic() {
    // ...the module loop from Lesson 7 stays...

    Logger.recordOutput("Drivetrain/HeadingDegrees", getHeadingDegrees());
    Logger.recordOutput("Drivetrain/Heading",
        Rotation2d.fromDegrees(getHeadingDegrees()));
  }
```

The plain number is for line graphs. The `Rotation2d` version is the
structured type AdvantageScope's Swerve tab wants in its **Rotation** slot —
same fact, packaged for a tool that draws instead of plots. (`Rotation2d` is
already imported from Lesson 7's module-states logging.)

---

## 2. Extract a `commandRotation` helper

The `rotate(omega)` command from Lesson 7 does the actual module-steering math
for pure rotation. `turnToHeading` is about to need the *same* math with a
different `omega` each tick — and the sim needs to know what `omega` was just
asked for. You could copy the tangent-angle loop into the new command. Don't.
Copied code is a bug with a delay on it: fix the original and the copy stays
wrong. Instead, pull the body into a private helper so both callers share it.

**Add a helper to `Drivetrain`, and replace `rotate` with the one-liner:**

```java
private void commandRotation(double omega) {
  m_lastCommandedOmega = omega;
  for (SwerveModule module : m_modules) {
    double x = module.location.getX();
    double y = module.location.getY();
    double angleDeg = Math.toDegrees(Math.atan2(x, -y));
    module.setDesiredState(angleDeg, omega);
  }
}

public Command rotate(double omega) {
  return run(() -> commandRotation(omega));
}
```

Look at what happened to `rotate`: its whole body became one line that says
*what* it wants, and the helper holds the *how*. That's the move — when two
commands need the same math, promote it to a helper, and every caller gets the
`m_lastCommandedOmega` bookkeeping for free.

One loose end: `translate(...)` from Lesson 7 needs a single new line — pure
translation shouldn't leave a stale rotation rate lying around for the sim to
integrate.

The added line is marked below.

**Edit `translate` in `Drivetrain`, adding one line:**

```java
public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {
  return run(() -> {
    double vx = vxSupplier.getAsDouble();
    double vy = vySupplier.getAsDouble();
    double speed = Math.hypot(vx, vy);
    double angleDeg = Math.toDegrees(Math.atan2(vy, vx));
    m_lastCommandedOmega = 0.0;                            // ← added
    for (SwerveModule module : m_modules) {
      module.setDesiredState(angleDeg, speed);
    }
  });
}
```

---

## 3. Turn to a heading — the same P control, again

Lesson 5 promised its five moves would come back — measure, subtract, multiply,
clamp, command — and here they are, pointed at the whole robot. Two things
differ from `steerToAngle`: which sensor gets measured, and that headings
**wrap** around a circle, so the subtract step needs the wrap trick baked in
(`-170°` to `170°` should turn `20°`, not `340°`).

The wrap logic goes in its own little question-method, because the finish
condition is about to need it too.

**Add to `Drivetrain`:**

```java
/** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
private double headingError(double targetDegrees) {
  double error = targetDegrees - getHeadingDegrees();
  while (error > 180)  { error -= 360; }
  while (error < -180) { error += 360; }
  return error;
}

/** Turn to face 'targetDegrees'. Finishes when within 2°. */
public Command turnToHeading(double targetDegrees) {
  return run(() -> {
        double omega = MathUtil.clamp(
            HeadingConstants.kP * headingError(targetDegrees),
            -0.5, 0.5); // clamp to ±50% turn power
        commandRotation(omega);
      })
      .until(() -> Math.abs(headingError(targetDegrees)) < 2.0)
      .finallyDo(() -> commandRotation(0.0)); // full stop when done or interrupted
}
```

The bricks are all ones you own: `run` does the per-tick P control, `until`
adds the finish condition (Lesson 6's move — this command *ends* when the job
is done), and `finallyDo` guarantees the wheels get a stop order no matter how
the command exits. The clamp is tighter than Lesson 5's `±1.0` on purpose:
full-power spins are violent, and a heading turn never needs more than half
throttle. And because the finish condition calls the *same* `headingError`,
"done" means "within 2° by the shortest path" — the wrap logic can't disagree
with itself.

**Add a nested `HeadingConstants` class to `Constants.java` for the gain:**

```java
public final class Constants {
  // ...SteerConstants and DriveConstants stay...

  public static class HeadingConstants {
    public static final double kP = 0.02; // turn power per degree of heading error
  }
}
```

---

## 4. Wire it up

The A and B buttons are free again since Lesson 7's cleanup.

**Add two taps to `configureBindings()`:**

```java
  private void configureBindings() {
    // ...the default translate and bumper bindings from Lesson 7 stay...

    m_driverController.a().onTrue(m_drivetrain.turnToHeading(90));
    m_driverController.b().onTrue(m_drivetrain.turnToHeading(0));
  }
```

Because `turnToHeading` requires the Drivetrain, pressing A cancels the default
translate command; when it finishes (or is interrupted by B), the default
resumes automatically. Unlike Lesson 5's `steerToAngle`, this command
*finishes* — so the stick comes back to life on its own the moment the robot
faces 90°.

---

## 5. Fake the gyro in sim

On a real robot, `commandRotation(omega)` spins the four wheels tangent to the
circle, the chassis rotates, and the gyro reads the result. In sim, our modules
don't actually push the chassis around — we haven't built that physics. So we
close the loop **ourselves**: pretend the robot rotates at the rate we just
commanded, and inject that back into the fake gyro.

Add the integration below the existing module loop.

**Edit `Drivetrain`'s `simulationPeriodic()`:**

```java
@Override
public void simulationPeriodic() {
  // Existing lines from Lesson 7:
  for (SwerveModule module : m_modules) {
    module.simulationPeriodic();
  }

  // New: integrate the commanded angular rate into a fake heading.
  // Treat 'omega' as fraction of "360°/sec" — max power spins us 360°/s.
  m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;  // one 20 ms tick
  m_gyro.getSimState().setRawYaw(m_simHeadingDegrees);
}
```

That `+=` line is doing something with a fancy name — **integrating** — and a
plain meaning: every tick, add "rate × time" to a running total. Rotating at
180°/s for one 20 ms tick adds 3.6°; do that fifty times a second and the
total *is* the heading. This is the same **command → model → fake sensor →
your reads** loop as Lesson 4, with a one-line model. It's an honest stand-in
that lets you develop `turnToHeading` on your laptop today; when Lesson 10
adds `SwerveDriveKinematics`, we can replace it with a physics-driven
simulation of the *actual* modules pushing the chassis around.

---

## 6. Run it

`./gradlew simulateJava` → **Teleoperated**. In AdvantageScope, plot
`Drivetrain/HeadingDegrees`. Press A — heading sweeps toward `90°`, slows as it
approaches, settles inside the ±2° band, and the command ends. Press B — it
comes back to `0°`. That's P control on a whole-robot quantity, closing the
loop through a real chassis rotation command.

Then watch the same thing as a picture: open the **Swerve** tab from Lesson 7
(with `Drivetrain/ModuleStates` in its **States** slot) and drop
`Drivetrain/Heading` into the **Rotation** slot. Press A again — the four
wheels snap into the pinwheel, and the whole chassis diagram rotates to 90°
as the fake gyro integrates, easing in exactly like the plot does. One
glance now tells you what the wheels are doing *and* which way the robot
thinks it's facing.

Tune `kP` the same way as Lesson 5 — the symptoms haven't changed, only the
thing that's oscillating:

- **too small:** it crawls in and takes forever;
- **too big:** it overshoots and oscillates;
- **just right:** quick, smooth, settles inside the band.

---

## Try it

1. **Prove the wrap works:** press A to reach `90°`, then bind a button to
   `turnToHeading(-170)` and press it. The heading should sweep +100° through
   180° (the short way), *not* −260°. Watch the plot to confirm.
2. **Snap to nearest 90°:** add a command that reads the current heading and
   turns to the closest multiple of 90 (0, 90, 180, 270). Hint:
   `Math.round(heading / 90.0) * 90.0`.
3. **Zero the gyro at teleop start:** call `m_gyro.setYaw(0)` inside a
   `runOnce(...)` bound to a button, so "forward" is always relative to where
   you're pointed *now*.
4. **Keep the CAN-ID habit going:** the gyro went in as a literal,
   `new Pigeon2(0)`. Move that `0` into `DriveConstants` as `kGyroPort` — right
   alongside the eight motor ports from Lesson 7 — and use
   `new Pigeon2(DriveConstants.kGyroPort)`. Every CAN ID your robot owns now
   lives in one place.

---

## What you learned

The most important thing in this lesson is what *didn't* change: turning a
five-hundred-newton robot to face 90° is the same five moves as pointing one
wheel — measure, subtract, multiply, clamp, command — with a **gyro** as the
sensor and the wrap trick promoted into a `headingError` helper that the
finish condition shares, so "done" and "which way" can never disagree. Around
that came two habits worth keeping: when a second caller needs the same math,
extract a **helper method** (`commandRotation`) instead of copying — copied
code is a bug with a delay on it — and when the physics doesn't exist yet,
**fake the sensor** by integrating the commanded rate, which is just "add
rate × time every tick." A robot that knows its heading and can command its
own motion is most of what an autonomous routine needs. Lesson 9 takes the
driver out of the loop entirely.

Next: [Lesson 9 — Autonomous](09-autonomous.md).
