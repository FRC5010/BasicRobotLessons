# Lesson 5 — Steering to an angle with P control

**Goal:** Add the module's **steering** motor and make it turn to a target angle on
its own, using the simplest possible feedback control: *error × a gain*.

**New Java concepts**
- **`if` / `else`** and comparisons in depth
- Arithmetic that means something (computing an **error**)
- A tiny bit of state: remembering a **target**

**New robot concepts**
- **Setpoint**, **measurement**, **error** — the vocabulary of control
- **Proportional (P) control** — the single most important idea in robotics
- Why you can't just "set the angle" directly

---

## 1. The problem with "just go to the angle"

A swerve module's steering motor has to *point the wheel* at a commanded angle. You
might think: "if I want 90°, just set the motor to 90°." But a motor takes a
**speed/voltage**, not a destination. You have to *drive it there yourself*: look at
where it is, compare to where you want it, and move in the right direction until
they match. That's **feedback control**, and the simplest useful form is **P
control**.

Three words to learn — they'll follow you your whole robotics career:

- **Setpoint** — where you *want* to be (target = 90°).
- **Measurement** — where you *are* (sensor says 20°).
- **Error** — setpoint minus measurement (90 − 20 = 70°).

The bigger the error, the harder you push. When error hits zero, you stop. That's
the whole idea.

---

## 2. Add the steering motor (and its sim)

In `DriveModule`, add a second TalonFX and, so it works in simulation, a second
model just like Lesson 4:

```java
private final TalonFX m_steerMotor = new TalonFX(2); // CAN ID 2 — change to yours

// Sim plumbing for the steering motor (same pattern as the drive motor).
private final TalonFXSimState m_steerSim = m_steerMotor.getSimState();
private final DCMotorSim m_steerModel =
    new DCMotorSim(
        LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.004, 1.0),
        DCMotor.getKrakenX60(1));
```

And in `simulationPeriodic()`, step it too (copy the four steps, using the steer
objects):

```java
m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
m_steerModel.update(0.020);
m_steerSim.setRawRotorPosition(m_steerModel.getAngularPositionRotations());
m_steerSim.setRotorVelocity(m_steerModel.getAngularVelocityRPM() / 60.0);
```

We'll read the steering **angle in degrees**. A real steering module has a big
reduction between the motor and the wheel (an SDS MK4, for example, uses about
`12.8 : 1`); to keep this lesson focused on P control rather than unit conversion,
we'll pretend the sensor turns **1:1** with the wheel. In Lesson 6 you'll see the
gear-ratio pattern applied to the drive motor — the same shape applies here if
you want to make it realistic later.

```java
/** Current steering angle in degrees. */
public double getSteerAngleDegrees() {
  return m_steerMotor.getPosition().getValueAsDouble() * 360.0; // rotations → degrees
}
```

---

## 3. Write proportional control

Here's the heart of the lesson. Add this command factory to `DriveModule`:

```java
import frc.robot.Constants.SteerConstants; // we'll create this constant below
```

```java
/** Turns the steering motor toward 'targetDegrees' and holds it there. */
public Command steerToAngle(double targetDegrees) {
  return run(() -> {
        double measurement = getSteerAngleDegrees();      // where we are
        double error = targetDegrees - measurement;       // how far off (degrees)

        double output = SteerConstants.kP * error;        // push proportional to error
        output = clamp(output, -1.0, 1.0);                // never exceed full power

        m_steerMotor.set(output);
      })
      // Same lesson as Lesson 1: motors HOLD the last value you set. When this
      // command is interrupted, its per-tick math stops running — so unless we
      // command 0 in cleanup, the motor keeps applying whatever fraction it was
      // last given and the wheel drifts.
      .finallyDo(() -> m_steerMotor.set(0));
}

/** Keeps 'value' between 'min' and 'max'. */
private double clamp(double value, double min, double max) {
  if (value > max) {
    return max;
  } else if (value < min) {
    return min;
  } else {
    return value;
  }
}
```

**Walk through one tick, say target = 90°, currently at 20°:**
1. `measurement = 20`, `error = 90 − 20 = 70`.
2. `output = kP × 70`. If `kP = 0.01`, output = `0.7` → 70% power toward the target.
3. As the motor turns and `measurement` rises, `error` shrinks, so `output` shrinks.
4. Near 90°, error ≈ 0, output ≈ 0 — it eases in and holds. That gentle slow-down is
   what "proportional" buys you: no slamming into the target.

**The `clamp` method** shows off `if / else if / else` — a decision with three
branches. Without it, a huge error could compute an output like `5.0`, which the
motor can't do; clamping keeps commands sane.

Add the gain to `Constants.java`:

```java
public static class SteerConstants {
  public static final double kP = 0.01; // output per degree of error — tune this
}
```

---

## 4. Bind it and tune `kP`

In `RobotContainer.configureBindings()`:

```java
m_driverController.x().onTrue(m_module.steerToAngle(90));
m_driverController.y().onTrue(m_module.steerToAngle(0));
```

Run in sim, plot `getSteerAngleDegrees()` (publish it in `periodic()`), and press X:

- **`kP` too small:** it crawls to 90° and takes forever (or never gets there).
- **`kP` too big:** it overshoots and oscillates back and forth around 90°.
- **`kP` just right:** quick, smooth, settles near 90° and stays.

Tuning `kP` by watching the plot *is* the job. Start at `0.01`, double it until it
oscillates, then back off. This intuition transfers to every controller you'll ever
write.

---

## 5. A wrinkle: the long way around

Ask for `0°` while sitting at `350°`. Error = `0 − 350 = −350`, so it spins almost
all the way around backwards — when it *could* have nudged +10° forward. Real
steering code "wraps" the error to the range −180°…+180° so it always takes the
short path. Try writing that in the challenge; it's a great `if` exercise.

---

## Try it

1. **Shortest path:** after computing `error`, add:
   ```java
   while (error > 180)  { error -= 360; }
   while (error < -180) { error += 360; }
   ```
   Test the 350°→0° case again. It should now move +10°. (This is your first
   `while` loop — it repeats until the condition is false.)
2. Publish `error` to the dashboard and plot it. Watch it decay toward zero — that
   curve is the signature of P control working.
3. What happens with `kP = 0`? With a *negative* `kP`? Predict first, then try it,
   and explain what you saw.

---

## What you learned

- Motors take **effort**, not destinations, so you reach a target with **feedback
  control**.
- **Setpoint − measurement = error**; **P control** sets output = `kP × error`,
  easing in as error shrinks.
- **`if / else if / else`** expresses multi-way decisions (you used it to `clamp`).
- **Tuning `kP`** against a live plot is a core robotics skill, and the same pattern
  works for *any* quantity you want to control — including heading (Lesson 8).

Next: [Lesson 6 — Distance & commands](06-distance-and-commands.md).
