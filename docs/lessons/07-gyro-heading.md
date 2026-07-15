# Lesson 7 — The gyro: track heading and turn to a heading

**Goal:** Read the Pigeon 2 gyro to know which way the robot is *facing*, then turn
to a target compass heading — reusing the exact P-control pattern from Lesson 5, now
on a whole-robot quantity.

**New Java concepts**
- A **new subsystem** for a whole-robot concern (the chassis/gyro)
- **Reusing a pattern** deliberately (P control, again)
- A small helper method shared by two callers

**New robot concepts**
- The **gyroscope** and **yaw** (heading)
- **Closed-loop on heading** — turn until you face the right way
- Faking the gyro in sim so the loop closes on your laptop

---

## 1. What a gyro gives you

An encoder tells you how far a *motor* turned. A **gyro** tells you how far the
*robot* has rotated. The Pigeon 2 reports **yaw** — rotation about the vertical
axis, i.e. your heading — in degrees. `0°` is wherever the robot was when the gyro
zeroed; positive is counter-clockwise.

Heading is a *chassis* concern, not a single-module one, so it gets its own
subsystem. Create `src/main/java/frc/robot/subsystems/Drivetrain.java`:

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.Pigeon2;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.HeadingConstants;

public class Drivetrain extends SubsystemBase {
  private final Pigeon2 m_gyro = new Pigeon2(0); // CAN ID 0 — change to yours

  // Remembered so simulationPeriodic can fake rotation (see §4).
  private double m_lastTurnOutput = 0.0;
  private double m_simHeading = 0.0;

  /** The robot's heading in degrees (yaw). */
  public double getHeadingDegrees() {
    return m_gyro.getYaw().getValueAsDouble();
  }

  @Override
  public void periodic() {
    edu.wpi.first.wpilibj.smartdashboard.SmartDashboard
        .putNumber("Heading (deg)", getHeadingDegrees());
  }
}
```

Reading yaw is the same shape as reading motor position: `getYaw()` returns a
signal, `.getValueAsDouble()` pulls the number out. Sensors all feel alike once you
learn one.

---

## 2. Turn to a heading — the same P control, again

You already know this pattern. Setpoint − measurement = error, output = `kP ×
error`, clamp, and stop when the error is small. The only differences from Lesson 5
are *which sensor* you read and *that heading wraps around a circle*, so we reuse the
shortest-path trick from that lesson's challenge.

Add to `Drivetrain`:

```java
/** Error to 'target' in degrees, wrapped to the shortest direction (−180…180). */
private double headingError(double targetDegrees) {
  double error = targetDegrees - getHeadingDegrees();
  while (error > 180)  { error -= 360; }
  while (error < -180) { error += 360; }
  return error;
}

/** Turns the robot to face 'targetDegrees', then finishes. */
public Command turnToHeading(double targetDegrees) {
  return run(() -> {
        double output = HeadingConstants.kP * headingError(targetDegrees);
        output = Math.max(-0.5, Math.min(0.5, output)); // clamp to ±50% turn power
        m_lastTurnOutput = output;
        // On a real swerve robot: feed 'output' to the drive's rotation input.
        // (You'll wire that up when you scale to four modules.)
      })
      .until(() -> Math.abs(headingError(targetDegrees)) < 2.0) // within 2°: done
      .finallyDo(() -> m_lastTurnOutput = 0.0);
}
```

**What's new here and worth noticing:**
- **`headingError(...)`** is a private helper called by *two* places — the control
  math and the `until` condition. When two callers need the same calculation, give
  it a name once. That's the point of methods.
- **`Math.max(-0.5, Math.min(0.5, output))`** is a one-line clamp using WPILib-free
  `Math` methods — an alternative to the `if/else` clamp you wrote before. Same idea,
  fewer lines.
- The finish condition uses the *same* `headingError`, so "done" means "within 2° by
  the shortest path."

Add the gain to `Constants.java`:

```java
public static class HeadingConstants {
  public static final double kP = 0.01; // turn power per degree of heading error
}
```

---

## 3. Wire it up

In `RobotContainer`:

```java
private final Drivetrain m_drivetrain = new Drivetrain();
```
```java
m_driverController.leftBumper().onTrue(m_drivetrain.turnToHeading(90));
m_driverController.rightBumper().onTrue(m_drivetrain.turnToHeading(0));
```

---

## 4. Make it work in simulation

On a real robot, `output` spins the chassis and the gyro reads the result. In sim
there's no chassis yet, so we *close the loop ourselves*: pretend the robot rotates
at a rate proportional to the turn output, and feed that back into the gyro's fake
yaw. Add to `Drivetrain`:

```java
@Override
public void simulationPeriodic() {
  // Pretend full turn power spins the robot at 360°/sec.
  double degPerSecond = m_lastTurnOutput * 360.0;
  m_simHeading += degPerSecond * 0.020;             // integrate over one 20 ms tick
  m_gyro.getSimState().setRawYaw(m_simHeading);     // inject into the fake gyro
}
```

This is the same **command → model → fake sensor → your reads** loop from Lesson 4,
just for rotation instead of a motor. It's an honest stand-in: it lets you develop
and tune `turnToHeading` on your laptop today, and the *real* rotation replaces this
faked one once you have four modules.

Run in sim, plot "Heading (deg)", press the left bumper, and watch heading sweep to
90° and settle. Tune `kP` exactly like Lesson 5.

---

## Try it

1. **Snap to nearest 90°:** add a command that reads the current heading and turns
   to the closest multiple of 90 (0, 90, 180, 270). Hint: `Math.round(heading / 90)
   * 90`.
2. **Prove the wrap works:** start the sim, drive the fake heading to 170°, then
   `turnToHeading(-170)`. It should turn +20° through 180°, *not* −340°. Watch the
   plot to confirm it takes the short way.
3. Zero the gyro at teleop start: call `m_gyro.setYaw(0)` in a `runOnce` bound to a
   button, so "forward" is always relative to where you're pointed.

---

## What you learned

- A **gyro** measures the *robot's* rotation (**yaw** = heading); you read it just
  like any other sensor.
- Turning to a heading is **the same P control** as steering a wheel — the pattern
  transfers, only the sensor and the wrap-around change.
- A shared **helper method** (`headingError`) keeps the control math and the finish
  condition consistent.
- You can **fake a sensor in sim** to close a control loop before the hardware
  exists.

Next: [Lesson 8 — Autonomous](08-autonomous.md).
