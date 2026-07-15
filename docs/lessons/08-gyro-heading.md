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
when the gyro zeroed; positive is CCW.

Heading is a *chassis* concern, so it goes on `Drivetrain` — not a new
subsystem. Open `Drivetrain.java` and add:

```java
import com.ctre.phoenix6.hardware.Pigeon2;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants.HeadingConstants;
```

```java
private final Pigeon2 m_gyro = new Pigeon2(0); // CAN ID 0 — change to yours

// Remembered for the sim: what rotation rate did we just command?
private double m_lastCommandedOmega = 0.0;
private double m_simHeadingDegrees  = 0.0;

/** Robot heading in degrees (CCW positive). */
public double getHeadingDegrees() {
  return m_gyro.getYaw().getValueAsDouble();
}
```

And in `periodic()`, publish it:

```java
SmartDashboard.putNumber("Heading (deg)", getHeadingDegrees());
```

Reading yaw has the same shape as reading motor position: `getYaw()` returns a
signal, `.getValueAsDouble()` pulls the number out. Sensors all feel alike once
you've read one.

---

## 2. Extract a `commandRotation` helper

The `rotate(omega)` command from Lesson 7 does the actual module-steering math
for pure rotation. `turnToHeading` needs the *same* math with a different `omega`
each tick, and we'd like the sim to know what `omega` we just asked for. Pull the
body into a private helper so both callers share it:

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

Also update `translate(...)` from Lesson 7 to reset the commanded omega — pure
translation shouldn't leave a stale rotation rate lying around:

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

When two commands need the same math, promote it to a helper. That way each
caller stays focused on *what* it wants, not *how* to do it — and the sim gets
the same `omega` bookkeeping for free.

---

## 3. Turn to a heading — the same P control, again

Setpoint − measurement = error, output = `kP × error`, stop when the error is
small. Two things are different from Lesson 5's `steerToAngle`: which sensor we
read, and that headings **wrap** around a circle (so `-170°` to `170°` should
turn `20°`, not `340°`).

Add to `Drivetrain`:

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

Add the gain to `Constants.java`:

```java
public static class HeadingConstants {
  public static final double kP = 0.02; // turn power per degree of heading error
}
```

The finish condition uses the *same* `headingError`, so "done" means "within 2°
by the shortest path." And notice the pattern that keeps coming back: reuse
`commandRotation` — no new module math, no fresh chance to typo the tangent
formula.

---

## 4. Wire it up

In `RobotContainer.configureBindings()`:

```java
m_driverController.a().onTrue(m_drivetrain.turnToHeading(90));
m_driverController.b().onTrue(m_drivetrain.turnToHeading(0));
```

Because `turnToHeading` requires the Drivetrain, pressing A cancels the default
translate command; when it finishes (or is interrupted by B), the default
resumes automatically.

---

## 5. Fake the gyro in sim

On a real robot, `commandRotation(omega)` spins the four wheels tangent to the
circle, the chassis rotates, and the gyro reads the result. In sim, our modules
don't actually push the chassis around — we haven't built that physics. So we
close the loop **ourselves**: pretend the robot rotates at the rate we just
commanded, and inject that back into the fake gyro. Add to `Drivetrain`:

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

This is the same **command → model → fake sensor → your reads** loop as Lesson
4, just for chassis rotation. It's an honest stand-in that lets you develop
`turnToHeading` on your laptop today; when Lesson 10 adds `SwerveDriveKinematics`
we can replace it with a physics-driven simulation of the *actual* modules
pushing the chassis around.

---

## 6. Run it

`./gradlew simulateJava` → **Teleoperated**. In AdvantageScope, plot
`Heading (deg)`. Press A — heading sweeps toward `90°`, slows as it approaches,
settles inside the ±2° band, and the command ends. Press B — it comes back to
`0°`. That's P control on a whole-robot quantity, closing the loop through a
real chassis rotation command.

Tune `kP` the same way as Lesson 5:

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

---

## What you learned

- A **gyro** measures the *robot's* rotation (**yaw** = heading); reading it has
  the same shape as reading a motor's position signal.
- Turning to a heading is **the same P control** as steering a wheel — the
  pattern transfers cleanly; only the sensor and the wrap-around change.
- Extracting a shared **helper method** (`commandRotation`) keeps `rotate`,
  `turnToHeading`, and the sim bookkeeping consistent — one place to fix bugs.
- You can **fake a sensor in sim** by integrating the commanded rate, closing
  a control loop before the physics exists.

Next: [Lesson 9 — Autonomous](09-autonomous.md).
