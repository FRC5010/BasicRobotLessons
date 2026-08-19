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
- A **CANcoder** and **priming** — an absolute sensor and a one-time startup
  read that keeps the wheel's zero honest across power cycles

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

**Add to `DriveModule`, below the drive motor's fields:**

```java
public class DriveModule extends Mechanism {
  // ...the drive motor and its sim fields from Lessons 1 and 4 stay put...

  private final TalonFX m_steerMotor =
      new TalonFX(Constants.DriveConstants.kSteerMotorPort, CANBus.systemcore(0)); // CAN ID 2

  // Sim plumbing for the steering motor (same pattern as the drive motor).
  private final TalonFXSimState m_steerSim = m_steerMotor.getSimState();
  private final DCMotorSim m_steerModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.004, 1.0),
          DCMotor.getKrakenX60(1));

  // ...constructor and methods below...
```

Then step the steer physics in `simulatePeriodic()`, right after the drive
motor's four steps — same loop, second motor.

**Edit `DriveModule`'s `simulatePeriodic()`:**

```java
public void simulatePeriodic() {
  // ...the drive motor's four steps stay here, unchanged...

  m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
  m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());
  m_steerModel.update(0.020);
  m_steerSim.setRawRotorPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));
  m_steerSim.setRotorVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));
}
```

Notice what you *didn't* have to touch: `Robot.simulationPeriodic()` still
just calls `module.simulatePeriodic()`, one line, from Lesson 4. Everything
this module needs in sim lives inside the module — `Robot` doesn't need to
know a second motor showed up.

We'll read the steering **angle in degrees**. A real steering module has a big
reduction between the motor and the wheel — ours steers through `25 : 1` — but
to keep this lesson focused on P control rather than unit conversion, we'll
pretend the sensor turns **1:1** with the wheel for now. In Lesson 6 you'll
see the gear-ratio pattern applied to the drive motor, and in Lesson 7 the
steering gets its real `25 : 1` as part of growing up.

It's a question-method, Lesson 3 style: ask the motor for its position, hand
back degrees. `Degrees` is just another unit constant, the same family as
`Rotations` from Lesson 3 — `.in(...)` doesn't care which one you ask for.

**Add to `DriveModule`, with your other public methods:**

```java
/** Current steering angle in degrees. */
public double getSteerAngleDegrees() {
  return m_steerMotor.getPosition().getValue().in(Degrees);
}
```

**Add to `DriveModule`'s imports:**

```java
import static org.wpilib.units.Units.Degrees;
```

---

## 3. Give it a memory: priming from an absolute encoder

`getSteerAngleDegrees()` trusts the steering motor's own sensor completely —
and that sensor has a blind spot. It's **relative**: it counts rotations
from wherever it happened to be when the robot powered on, not from any
fixed reference. On the bench that's invisible, because you built the robot
with the wheel already close enough to "forward." On a real match day, after
the robot's been unplugged, carried around, and replugged a dozen times,
there's no guarantee the wheel is anywhere near where it was last time — and
the sensor has no way to know.

The fix is a second sensor built for exactly this: a **CANcoder**, CTRE's
magnetic absolute encoder. Mount it on the steering axis and it reads the
wheel's true angle from a magnet — the same answer every time, power cycle
or not. We won't make the steering motor read it continuously yet — that's a
firmware trick for Lesson 12. For now we'll do something simpler and still
genuinely useful: read the CANcoder **once**, right when the robot boots,
and tell the steering motor's own sensor to start counting from there. Call
it **priming** — one honest reading, right at the start, so the motor's own
count is trustworthy from tick one.

One calibration step first. The CANcoder's own zero is wherever its magnet
happens to be glued on — probably not "wheel pointing forward." You measure
that gap once, with a number called the **magnet offset**: point the wheel
straight forward by hand, read the CANcoder's raw position in Phoenix Tuner
X, and store the *negative* of that reading as the offset. Configured with
that number, the CANcoder reports exactly `0` when the wheel is at true
forward.

**Add to `Constants.java`:**

```java
public static final class DriveConstants {
  public static final int kDriveMotorPort = 1; // CAN ID — change to yours
  public static final int kSteerMotorPort = 2; // CAN ID — change to yours
  public static final int kCancoderPort = 3;   // CAN ID — change to yours
}

public static final class SteerConstants {
  public static final double kMagnetOffset = 0.0; // rotations — measure with Tuner X, change to yours
}
```

(`SteerConstants` gains a second constant, `kP`, in the next section — this
is the class's first job, not its last.)

**Add to `DriveModule`'s imports:**

```java
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.hardware.CANcoder;
```

**Add the CANcoder field to `DriveModule`, next to the steering motor:**

```java
private final CANcoder m_steerEncoder =
    new CANcoder(Constants.DriveConstants.kCancoderPort, CANBus.systemcore(0)); // CAN ID 3
```

Same shape as the motors: a `CANcoder` needs a CAN ID *and* a bus, just like
`TalonFX` has since Lesson 1.

This is the first time this lesson has had anything to put in the
constructor.

**Fill in `DriveModule`'s constructor, above the existing `Scheduler.getDefault().addPeriodic(...)` line:**

```java
public DriveModule() {
  // Calibrate the CANcoder's zero to "wheel pointing forward"...
  CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
  cancoderConfig.MagnetSensor.MagnetOffset = SteerConstants.kMagnetOffset;
  m_steerEncoder.getConfigurator().apply(cancoderConfig);

  // ...then prime the steering motor's own sensor to match it, once.
  m_steerMotor.setPosition(m_steerEncoder.getAbsolutePosition().getValue().in(Rotations));

  Scheduler.getDefault().addPeriodic(this::logTelemetry);
}
```

Two calls do all the work. **`getConfigurator().apply(...)`** is a pattern
you'll see constantly from here on: build a small object describing what you
want, hand it to the device once, done. And **`setPosition(...)`** is new —
every Phoenix device lets you *tell* it what its own sensor should currently
read, which is exactly what priming means: not moving the wheel, just
correcting what the motor believes about where it already is.
`getAbsolutePosition()` hands back the same kind of chained value
`getPosition()` always has — a `StatusSignal` wrapping a measurement — so it
gets the same `.getValue().in(Rotations)` treatment before `setPosition`
can use it as a plain number.

**Add to `DriveModule`'s imports:**

```java
import first.robot.Constants.SteerConstants;
```

`SteerConstants` lives inside `Constants`, so a plain `import first.robot.Constants;`
(already there) only gets you `Constants.SteerConstants.kMagnetOffset` — this
second import lets you drop the `Constants.` prefix and write `SteerConstants`
directly, the way the code above does.

> **Watch out:** a CAN device needs a moment to start reporting real values
> after power-on. Reading one in the very first line of the constructor is
> usually fine — Phoenix's default read waits briefly for a value to arrive —
> but if a prime ever looks like it read `0` instead of the real angle,
> that's the usual suspect.

> **Mounting matters.** A CANcoder reads counterclockwise-positive by
> default, matching this course's convention for the rest of the robot. If
> yours ever reads backwards — the wheel turns one way and the angle counts
> the other — set `MagnetSensor.SensorDirection =
> SensorDirectionValue.Clockwise_Positive` in its config. Get this wrong and
> priming will confidently seed the *wrong* zero, every single boot — one
> flipped sign, easy to fix once you know to look for it.

This isn't the last word on the subject — a wheel can still slip against the
gearbox mid-match, and a one-time prime won't notice. Lesson 12 replaces
this reading with something that watches continuously. For now, priming
solves the problem that actually bites you every single boot: an
unpredictable zero.

---

## 4. Write proportional control

Here's the heart of the lesson — read it slowly, because this little method
is the seed of every controller you'll ever write.

**Add to `DriveModule`, below your other command factories:**

```java
/** Turns the steering motor toward 'targetDegrees' and holds it there. */
public Command steerToAngle(double targetDegrees) {
  return runRepeatedly(() -> {
        double measurement = getSteerAngleDegrees();   // where we are
        double error = targetDegrees - measurement;    // how far off (degrees)

        double output = SteerConstants.kP * error;     // push proportional to error
        output = clamp(output, -1.0, 1.0);              // never exceed full power

        m_steerMotor.setThrottle(output);
      })
      // Same lesson as Lesson 1: motors HOLD the last value you set. When this
      // command is interrupted, its per-tick math stops running — so unless we
      // command 0 in cleanup, the motor keeps applying whatever fraction it was
      // last given and the wheel drifts.
      .whenCanceled(() -> m_steerMotor.setThrottle(0))
      .named("Steer To Angle");
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
2. `output = kP × 70`. With `kP = 0.0005`, output = `0.035` → about 3.5% power
   toward the target — a Kraken X60 spinning something this light doesn't
   need much to get moving.
3. As the motor turns and `measurement` rises, `error` shrinks, so `output` shrinks.
4. Near 90°, error ≈ 0, output ≈ 0 — it eases in and holds. That gentle slow-down is
   what "proportional" buys you: no slamming into the target.

And notice the math handles direction for free: overshoot past 90° and
`error` goes negative, so `output` goes negative and the motor pushes back.
The *sign* of the error carries which way to go; the *size* carries how hard.

Three smaller things in that code deserve a look.

**`runRepeatedly(...).whenCanceled(...).named(...)`** — that's the same
chain you've built twice already. `runRepeatedly(...)` is Lesson 2's shape:
the lambda runs fresh every tick, which is exactly what a controller needs —
it has to keep re-measuring. `.whenCanceled(...)` is Lesson 1's shape:
cleanup that fires once, when something takes the module away from this
command. `steerToAngle` is just the first method that needed both at once.

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
class named for the subsystem area they belong to. `SteerConstants` already
exists (you made it two sections ago, for the magnet offset).

**Add `kP` to `SteerConstants` in `Constants.java`:**

```java
public static final class SteerConstants {
  public static final double kMagnetOffset = 0.0; // from the previous section
  public static final double kP = 0.0005;          // output per degree of error — tune this
}
```

`public static final` reads as: anyone can see it, there's exactly one of it
(no object needed — you write `SteerConstants.kP`, just like `Math.abs`), and
it can never be reassigned. One named number, one home, every place that
needs it points here. That's the whole philosophy of `Constants.java`.

---

## 5. Bind it and tune `kP`

**Add to `MyTeleop`'s constructor, with the rest of the wiring:**

```java
public MyTeleop(Robot robot) {
  this.robot = robot;

  // ...the drive bindings from earlier lessons stay...

  // Tap the left face button to steer to 90° and hold it there.
  robot.driverController.westFace().onTrue(robot.module.steerToAngle(90));
  // Tap the top face button to steer back to 0° and hold it there.
  robot.driverController.northFace().onTrue(robot.module.steerToAngle(0));
}
```

New word: **`onTrue`**, where Lesson 1 used `whileTrue`. `whileTrue` runs a
command while you hold the button; `onTrue` schedules it once when the button
is *pressed* and then walks away. Since `steerToAngle` is built on
`runRepeatedly(...)`, it never finishes on its own — so a single tap of the
west button sends the module to 90° *and holds it there*, no need to keep the
button down. Tap the north button and the scheduler swaps commands: one
command per mechanism, so scheduling the go-to-0 command cancels the
go-to-90 one (firing its `whenCanceled` cleanup on the way out).

> **Watch out:** while a steering command owns the module, your joystick stops
> driving the wheel — the default command from Lesson 2 only runs when *no
> other command* is using the mechanism, and `steerToAngle` never lets go.
> That's the one-command-per-mechanism rule doing exactly what it promised.
> It's fine for this lesson — we're steering, not driving — and the module
> learns to do both at once when it grows up in Lesson 7.

To watch the controller work, log the steering angle from the same place the
drive readings have been logging since Lesson 3.

**Add to `DriveModule`'s `logTelemetry()`:**

```java
private void logTelemetry() {
  // ...the drive position and velocity logs from Lesson 3 stay...

  SmartDashboard.putNumber("DriveModule/SteerAngleDegrees", getSteerAngleDegrees());
}
```

Run in sim, plot `DriveModule/SteerAngleDegrees` in AdvantageScope, and tap
the west button:

- **`kP` too small:** it crawls to 90° and takes forever (or never gets there).
- **`kP` too big:** it overshoots and oscillates back and forth around 90°.
- **`kP` just right:** quick, smooth, settles near 90° and stays.

Tuning `kP` by watching the plot *is* the job. Start at `0.0005`, double it
until it oscillates, then back off. This intuition transfers to every
controller you'll ever write.

---

## 6. A wrinkle: the long way around

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
   `SmartDashboard.putNumber("DriveModule/SteerErrorDegrees", error);` right
   after `error` is computed — a value that only exists inside a command gets
   logged where it's computed, Lesson 3's refinement. Plot it and watch it
   decay toward zero. That curve is the signature of P control working.
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
up `if / else if / else` for multi-way decisions, `runRepeatedly(...)`
paired with `.whenCanceled(...)` for a controller that recomputes every tick
and still cleans up after itself, a lambda quietly remembering its target,
and a new nested-class home for tuning constants in `Constants.java`. Hold
onto the shape of `steerToAngle`: measure, subtract, multiply, clamp,
command. The same five moves point a whole chassis at a compass heading in
Lesson 8 — only the sensor changes. That's a sign you've learned something
real.

One more habit started here, smaller but just as real: **priming**. The
steering motor's own sensor only knows *change*, not *place*, so you gave it
a memory — read the CANcoder once at startup, tell the motor's sensor to
match. It isn't the whole fix (Lesson 12 finishes that job), but it's the
part that matters on the very first boot, which is most of them.

Next: Lesson 6 — Distance & commands.
