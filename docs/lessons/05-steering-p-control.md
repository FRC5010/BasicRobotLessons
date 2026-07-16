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

A swerve module's steering motor has to *point the wheel* at a commanded
angle. The model you're probably bringing in: "if I want 90°, I'll set the
motor to 90°." Reasonable — and not how motors work. A motor takes an
**effort** — a speed, a voltage — not a destination. There is no "go to 90°"
knob. You have to *drive it there yourself*: look at where it is, compare to
where you want it, push in the right direction, and keep re-checking until
they match. That's **feedback control**, and the simplest useful form is
**P control**.

Three words to learn — they'll follow you your whole robotics career:

- **Setpoint** — where you *want* to be (target = 90°).
- **Measurement** — where you *are* (sensor says 20°).
- **Error** — setpoint minus measurement (90 − 20 = 70°).

The bigger the error, the harder you push. When error hits zero, you stop.
That's the whole idea, and everything else in this lesson is just writing it
down in Java.

---

## 2. Add the steering motor (and its sim)

The steering motor is a second TalonFX, and it needs the same sim plumbing
the drive motor got in Lesson 4. All of it goes in `DriveModule`'s fields,
right below the drive motor's block — and the ordering rule from Lesson 4
applies again: `m_steerSim` is built by asking `m_steerMotor` for its sim
state, so the motor comes first. No new imports needed; everything here
arrived in Lesson 4.

```java
public class DriveModule extends SubsystemBase {
  // ...the drive motor and its sim fields from Lessons 1 and 4 stay put...

  private final TalonFX m_steerMotor = new TalonFX(2); // CAN ID 2 — change to yours

  // Sim plumbing for the steering motor (same pattern as the drive motor).
  private final TalonFXSimState m_steerSim = m_steerMotor.getSimState();
  private final DCMotorSim m_steerModel =
      new DCMotorSim(
          LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.004, 1.0),
          DCMotor.getKrakenX60(1));

  // ...constructor and methods below...
```

Then step the steer physics in `simulationPeriodic()`, right after the drive
motor's four steps — same loop, second motor:

```java
  @Override
  public void simulationPeriodic() {
    // ...the drive motor's four steps stay here...

    m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
    m_steerModel.update(0.020);
    m_steerSim.setRawRotorPosition(m_steerModel.getAngularPositionRotations());
    m_steerSim.setRotorVelocity(m_steerModel.getAngularVelocityRPM() / 60.0);
  }
```

We'll read the steering **angle in degrees**. A real steering module has a big
reduction between the motor and the wheel (an SDS MK4, for example, uses about
`12.8 : 1`); to keep this lesson focused on P control rather than unit conversion,
we'll pretend the sensor turns **1:1** with the wheel. In Lesson 6 you'll see the
gear-ratio pattern applied to the drive motor — the same shape applies here if
you want to make it realistic later.

Add the reading method with your other public methods — it's a
question-method, Lesson 3 style: ask the motor for rotations, hand back
degrees:

```java
/** Current steering angle in degrees. */
public double getSteerAngleDegrees() {
  return m_steerMotor.getPosition().getValueAsDouble() * 360.0; // rotations → degrees
}
```

---

## 3. Write proportional control

Here's the heart of the lesson — read it slowly, because this little method
is the seed of every controller you'll ever write. Add the import up top,
then the command factory below your other ones:

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

And notice the math handles direction for free: overshoot past 90° and
`error` goes negative, so `output` goes negative and the motor pushes back.
The *sign* of the error carries which way to go; the *size* carries how hard.

Three smaller things in that code deserve a look.

**`run(...).finallyDo(...)`** — that's chaining again, Lesson 3 style, but on
a *command*: `run(...)` builds a command, and `.finallyDo(...)` is called on
that result, handing back an upgraded command with a cleanup step bolted on.
It's `startEnd`'s flexible cousin: where `startEnd` takes exactly one start
action and one end action, `finallyDo` lets you attach cleanup to any command
— here, one that does per-tick work.

**The lambda remembers `targetDegrees`.** Look closely: `targetDegrees` is a
parameter of `steerToAngle`, but the lambda uses it tick after tick, long
after the method returned. Lambdas hold onto the variables around them when
they were created — that's the "tiny bit of state" this lesson promised, and
it's why one factory method can produce a go-to-90 command *and* a go-to-0
command that each remember their own target.

**The `clamp` helper** shows off `if / else if / else` — one decision, three
branches, exactly one of which runs. Without it, a large error could compute
an output like `5.0`, which the motor can't do; clamping keeps commands sane.
It's `private`, like `applyDeadband` was: internal plumbing, placed right
below the method that uses it.

Last piece: `kP` itself. It's a **tuning constant** — a number you'll adjust
over and over — and numbers like that live in `Constants.java`, in a nested
class named for the subsystem area they belong to. Open `Constants.java` and
add the class inside it:

```java
public final class Constants {
  // ...anything already in here stays...

  public static class SteerConstants {
    public static final double kP = 0.01; // output per degree of error — tune this
  }
}
```

`public static final` reads as: anyone can see it, there's exactly one of it
(no object needed — you write `SteerConstants.kP`, just like `Math.abs`), and
it can never be reassigned. One named number, one home, every place that
needs it points here. That's the whole philosophy of `Constants.java`.

---

## 4. Bind it and tune `kP`

In `RobotContainer.configureBindings()`, with the rest of the wiring:

```java
  private void configureBindings() {
    // ...bindings from earlier lessons stay...

    m_driverController.x().onTrue(m_module.steerToAngle(90));
    m_driverController.y().onTrue(m_module.steerToAngle(0));
  }
```

New word: **`onTrue`**, where Lesson 1 used `whileTrue`. `whileTrue` runs a
command while you hold the button; `onTrue` schedules it once when the button
is *pressed* and then walks away. Since `steerToAngle` is built on `run(...)`,
it never finishes on its own — so a single tap of X sends the module to 90°
*and holds it there*, no need to keep the button down. Tap Y and the
scheduler swaps commands: one command per subsystem, so scheduling the go-to-0
command cancels the go-to-90 one (firing its `finallyDo` on the way out).

> **Watch out:** while a steering command owns the module, your joystick stops
> driving the wheel — the default command from Lesson 2 only runs when *no
> other command* is using the subsystem, and `steerToAngle` never lets go.
> That's the one-command-per-subsystem rule doing exactly what it promised.
> It's fine for this lesson — we're steering, not driving — and the module
> learns to do both at once when it grows up in Lesson 7.

To watch the controller work, log the steering angle from `periodic()`, next
to the two values from Lesson 3:

```java
  @Override
  public void periodic() {
    // ...the drive position and velocity logs from Lesson 3 stay...

    Logger.recordOutput("DriveModule/SteerAngleDegrees", getSteerAngleDegrees());
  }
```

Run in sim, plot `DriveModule/SteerAngleDegrees` in AdvantageScope, and press X:

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
2. Log the error: add
   `Logger.recordOutput("DriveModule/SteerErrorDegrees", error);` right after
   `error` is computed — a value that only exists inside a command gets logged
   where it's computed, Lesson 3's refinement. Plot it and watch it decay
   toward zero. That curve is the signature of P control working.
3. What happens with `kP = 0`? With a *negative* `kP`? Predict first, then try it,
   and explain what you saw.

---

## What you learned

P control earns its billing as the most important idea in robotics, so here
it is one more time: motors take **effort**, not destinations, so you close
the gap yourself — **setpoint − measurement = error**, output = `kP × error`,
and the shrinking error eases you into the target while its sign steers the
direction. Tuning `kP` against a live plot — double it until it oscillates,
back off — is a ritual you'll repeat for years. Around that core you picked
up `if / else if / else` for multi-way decisions, `finallyDo` for chaining
cleanup onto a command, a lambda quietly remembering its target, and a new
nested-class home for tuning constants in `Constants.java`. Hold onto the
shape of `steerToAngle`: measure, subtract, multiply, clamp, command. The
same five moves point a whole chassis at a compass heading in Lesson 8 — only
the sensor changes. That's a sign you've learned something real.

Next: [Lesson 6 — Distance & commands](06-distance-and-commands.md).
