# Lesson 12 — Model-based control: let the motor do the math

**Goal:** Move the module's control loops off your 50 Hz code and onto the
TalonFX itself — position control with wrap-around for steering, velocity
control with a **feedforward model** for drive — and retire the one-time
CANcoder priming from Lesson 5 in favor of a firmware fix that keeps
watching all match long. Watch the modules track their targets tighter than
software P ever did.

**New Java concepts**
- **Configuration objects** — you've built one already, for the CANcoder;
  now a bigger one for the motors themselves
- **Control request objects** — created once as fields, reused every tick
- Deleting code as progress (priming, the wrap trick, and gear math all move
  into firmware)

**New robot concepts**
- The TalonFX is a **computer**, running its own control loop at 1 kHz
- **`TalonFXConfiguration`**: `SensorToMechanismRatio`, `ContinuousWrap`,
  `Slot0` gains
- **Remote sensor fusion** — the firmware reads the CANcoder continuously,
  closing the gap a one-time prime leaves open
- **`PositionVoltage`** and **`VelocityVoltage`** control requests
- **Feedforward (`kV`)** — a *model* predicts the voltage; feedback (`kP`)
  only trims the leftover error

---

## 1. Two computers

Here's a fact hiding in plain sight since Lesson 1: every TalonFX *is a
computer*. Not a metaphor — there's a processor inside each motor
controller, running its own control code about **1000 times per second**.
The mental model to correct is "my code is the robot's only brain." Your
code is the *coach*: it decides what each motor should be doing. The motor
controller is the *player*: it can chase that goal twenty times faster than
your 50 Hz loop can even look.

Think about what your steering P control has been doing: once every 20 ms
it checks the angle, computes an output, and commands it — then goes blind
until the next tick. The TalonFX can run the *same* P loop at 1 kHz, right
next to the sensor, with no CAN-bus delay in the middle. Tighter control,
and your code gets simpler at the same time: instead of computing *efforts*
every tick, it states *targets* and lets the firmware close the loop.

That's the whole lesson: teach the firmware about your mechanism (gearing,
wrap-around, gains), then change `setDesiredState` — the method every
command calls each tick — from "do the math" to "state the goal."

---

## 2. Priming isn't enough

Since Lesson 5, every module has primed its steering sensor from the
CANcoder once, at startup: read the absolute angle, seed the motor's own
relative counter, done. That fixes the boot-alignment problem completely —
for the first tick. From then on, the *rotor* sensor is back in charge, and
a relative sensor drifts from anything that turns the wheel without turning
the motor's report of it: a hard collision, gearbox backlash exploited by a
hit, a slow accumulation of small slips over a long match. None of that
ever happens on the bench, which is exactly why it's easy to trust priming
forever and get burned in a real one.

The fix sounds almost too simple: stop trusting the rotor at all. Point the
firmware's closed loop directly at the CANcoder, *continuously*, so "where
the wheel is" and "what the sensor reports" can never quietly drift apart.
The CANcoder itself, its config, and the magnet offset are already sitting
in your code from Lesson 7 — this lesson doesn't add hardware. It changes
who's allowed to read it.

---

## 3. Configure the motors

Phoenix 6 configuration works in two steps: build a **configuration
object** that describes everything about the mechanism, then `apply` it to
the motor once. You've done this already, back in Lesson 5, for the
CANcoder itself — now the same pattern, applied to the motors.

**Add to `SwerveModule`'s imports:**

```java
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;
```

**Delete the priming line from the constructor.** It was the last line —
`m_steerMotor.setPosition(...)`, seeding the rotor's counter from the
CANcoder's absolute reading. The firmware is about to take over reading the
CANcoder permanently, so seeding the rotor's own count is solving a problem
that's about to stop existing.

**Delete from `SwerveModule`'s constructor:**

```java
    // DELETE — the config below reads the CANcoder continuously; seeding
    // the rotor's own counter no longer does anything useful.
    m_steerMotor.setPosition(
        m_steerEncoder.getAbsolutePosition().getValue().in(Rotations) * SteerConstants.kSteerGearRatio);
```

The CANcoder object, its CAN ID, and its magnet offset are all still right
there as constructor parameters from Lesson 7; nothing about the
constructor's *signature* changes today, only what happens inside it.

**Add to `SwerveModule`'s constructor, in priming's place:**

```java
    // Steering: read angle from the CANcoder, wrap like a circle, hold a P gain.
    TalonFXConfiguration steerConfig = new TalonFXConfiguration();
    steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;
    steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;
    steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;
    steerConfig.Feedback.SensorToMechanismRatio = 1.0;
    steerConfig.ClosedLoopGeneral.ContinuousWrap = true;
    steerConfig.Slot0.kP = SteerConstants.kSteerKP;
    m_steerMotor.getConfigurator().apply(steerConfig);

    // Drive: firmware knows the gearbox and runs a kV model + kP trim.
    TalonFXConfiguration driveConfig = new TalonFXConfiguration();
    driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;
    driveConfig.Slot0.kV = DriveConstants.kDriveKV;
    driveConfig.Slot0.kP = DriveConstants.kDriveKP;
    m_driveMotor.getConfigurator().apply(driveConfig);
```

Four settings carry the lesson.

**`FeedbackRemoteSensorID`** and **`FeedbackSensorSource`** are the actual
handoff: together they tell the steering TalonFX "don't trust your own
rotor for position and velocity — read this CANcoder instead, every tick,
not just once at boot." Once that's set, every `getPosition()`/`getVelocity()`
call on the steer motor — and the closed loop itself — transparently
reflects the CANcoder, continuously, not the rotor.

**`RotorToSensorRatio`** replaces `SensorToMechanismRatio` for the *steer*
motor specifically, because the ratio it describes moved: it's no longer
"rotor turns per mechanism turn" (the rotor isn't the sensor anymore), it's
"rotor turns per *CANcoder* turn" — the same `25 : 1` number, new meaning.
`SensorToMechanismRatio` still exists underneath it, now describing
"CANcoder turns per mechanism turn," which is `1 : 1` because the CANcoder
sits directly on the wheel — worth setting explicitly even though `1.0` is
already the default, so the ratio chain is visible in the code instead of
implied. The drive motor never picked up a remote sensor, so its
`SensorToMechanismRatio` keeps doing exactly what it always did: "rotor
turns per wheel turn," `6.75 : 1`, converting `getPosition()`/`getVelocity()`
from rotor units to wheel units directly.

**`ContinuousWrap`** tells the steering closed loop that its mechanism is a
circle: position `0.9` rotations and position `-0.1` are one small step
apart, not most of a revolution. That's the Lesson 5 wrap trick — the two
`while` loops, then `MathUtil.inputModulus` from Lesson 10 — implemented in
silicon. (This part doesn't care which sensor feeds the loop — wrap-around
is about the *mechanism*, not the sensor.)

**`Slot0`** holds the gains the onboard loop will use, same as before. The
old software-P `kP` in `SteerConstants` is retiring this lesson — different
loop, different units, different name.

**Replace `Constants.java`'s `SteerConstants`, and add to `DriveConstants`:**

```java
public static final class SteerConstants {
  public static final double kSteerGearRatio = 25.0;  // rotor : CANcoder
  public static final double kSteerKP = 40.0;         // volts per rotation of error — tune
}

public static final class DriveConstants {
  // ...existing constants stay...
  public static final double kDriveKV = 0.8;          // volts per wheel rotation/sec — the model
  public static final double kDriveKP = 0.1;          // volts per rps of error — the trim
}
```

Note the units: these gains produce **volts**, not fractions of full power,
because the control requests we're about to use speak voltage. `kSteerKP =
40` means "40 volts per full rotation of error" — a wheel 90° off (0.25
rotations) gets 10 volts of push, easing off as it closes. Same P control
you've tuned twice already, wearing engineering units.

Nothing about `Drivetrain`'s module array changes today — the constructor
still takes the same five parameters it's taken since Lesson 7, and every
`new SwerveModule(...)` call already passes them.

---

## 4. The question-methods go on a diet

With the firmware doing mechanism math, three methods in `SwerveModule`
simplify. This is the rare edit where *deleting* is the progress.

**Update these three methods in `SwerveModule`, dropping the gear-ratio
division:**

```java
/** Current steering angle in degrees (the CANcoder's own reading — no gear math left here). */
public double getSteerAngleDegrees() {
  return m_steerMotor.getPosition().getValue().in(Rotations) * 360.0;
}

/** How far this module's wheel has driven, in meters, since the last reset. */
public double getDistanceMeters() {
  return m_driveMotor.getPosition().getValue().in(Rotations) * DriveConstants.kWheelCircumferenceMeters;
}

/** Current wheel speed in meters per second. */
public double getDriveVelocityMetersPerSec() {
  return m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) * DriveConstants.kWheelCircumferenceMeters;
}
```

The `/ kSteerGearRatio` and `/ kDriveGearRatio` steps didn't disappear —
they moved into the firmware, steering's via `RotorToSensorRatio` and
drive's via `SensorToMechanismRatio`. One source of truth for the ratio
beats two, because two can disagree. Notice `getSteerAngleDegrees()`
didn't need a single line changed to start reading the CANcoder instead of
the rotor, either — that's the section 3 config swap paying for itself.
The method only ever asked the steer motor for its position; what answers
that question moved, and the method never noticed.

---

## 5. Command targets, not efforts

Now the heart of it. A control request is a little message object — "run
position control toward X" — and Phoenix asks you to create it *once* and
reuse it every tick rather than making a new one 50 times a second.

**Add two control request fields to `SwerveModule`, up with the others:**

```java
  private final PositionVoltage m_steerRequest = new PositionVoltage(0);
  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);
```

`setDesiredState` — the method a command calls each tick — gets rewritten.
Out: the error math, the wrap loop, the clamp, the `setThrottle(...)`
calls. In: two `setControl` calls that state goals. Since the firmware now
speaks real velocity, the drive target stays in meters per second, exactly
as `SwerveModuleVelocity` already hands it in.

**Replace `setDesiredState` in `SwerveModule` with:**

```java
/** One tick of control: hand the firmware its targets. */
public void setDesiredState(SwerveModuleVelocity state) {
  // Steering: firmware position control. state.angle is a Rotation2d — hand its
  // Angle measure straight to withPosition (Phoenix speaks Units too, so there's
  // no degrees-to-rotations conversion to write).
  m_steerMotor.setControl(m_steerRequest.withPosition(state.angle.getMeasure()));

  // Drive: cosine compensation (Lesson 9), then firmware velocity control.
  double error = state.angle.getDegrees() - getSteerAngleDegrees();
  double alignment = Math.cos(Math.toRadians(error));
  double wheelRps = state.velocity * alignment / DriveConstants.kWheelCircumferenceMeters;
  m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));
}
```

Look at what `withPosition(state.angle.getMeasure())` replaced: measure,
subtract, wrap, multiply, clamp, command — the whole Lesson 5 ritual — now
happens inside the motor at 1 kHz, and you didn't even convert the angle,
because Phoenix's control requests take `Angle`/`AngularVelocity` measures
the same way WPILib does. (The drive side still divides by circumference
to get wheel rev/s, then wraps that in `RotationsPerSecond.of(...)` for
`withVelocity` — you already have that import, from
`getDriveVelocityMetersPerSec()`'s own unpack a few lines up.) The cosine
trick stays in your code because it isn't a control loop; it's a
*decision* about how hard to drive, and decisions are the coach's job.

**Delete `SwerveModule`'s private `clamp` method and its now-unused
`MathUtil` import.** Nothing calls `clamp` anymore — the steering
`setDesiredState` was its only caller, and that math just moved into
`steerConfig.ClosedLoopGeneral`/`Slot0` above. (`Drivetrain` keeps its own
separate `clamp` — a different copy, still doing real work for
`turnToHeading` and `driveToPose`. This deletion is `SwerveModule`'s alone.)

Now the drive gains, because they're where "model-based" earns its name.
**`kV` is a model of the motor**: it answers "how many volts does one
wheel rotation per second cost?" Ours is about `0.8` — at 12 volts that
predicts ~15 wheel rps, which is the free-speed math from Lesson 10 read
backwards. When you request 10 rps, the firmware *immediately* applies `10
× 0.8 = 8` volts because the model says that's what 10 rps costs — no
waiting for error to build up. Then `kP` handles only the leftover:
friction, battery sag, carpet. The model does most of the work by
prediction; feedback trims the rest by reaction. That division of labor —
predict with a model, correct with feedback — is what *model-based
control* means, and it's how every high-level controller you'll ever meet
is built.

One thing that *doesn't* change: `Drivetrain`. It talks to modules through
`setDesiredState` and the question-methods, and those signatures held
steady while everything behind them was replaced. That's the encapsulation
payoff, one more time, at refactor scale.

---

## 6. Is the sim still honest?

The drive and steer gear ratios haven't moved — so do the sim conversions
from Lessons 4–5 need to change?

Mostly no, for the same reason as before: **the sim state is always
rotor-side.** `setRawRotorPosition` feeds the raw rotor sensor, *upstream*
of any ratio math, exactly like the physical rotor sensor on a real
module. Your drive-side `simulatePeriodic()` multiply-back is untouched,
and so is the steer-side rotor feed — the physical motor still turns the
same way it always did.

The CANcoder's sim state, though, has gone this whole time without ever
being fed — and it's gotten away with it. Priming only ever read it
*once*, at construction, before `simulatePeriodic()` had run even a single
tick; a freshly-built sim CANcoder defaults to `0`, which happened to
match the physics model's own starting zero, so the prime was accidentally
correct every time. That free ride ends here. The steering closed loop now
reads the CANcoder *continuously*, so it needs its own honest sim feed
every tick, or the simulated firmware spends the whole match chasing a
signal that never moves.

**Add to `SwerveModule`'s imports:**

```java
import com.ctre.phoenix6.sim.CANcoderSimState;
```

**Add its sim-state field next to the motors':**

```java
  private final CANcoderSimState m_steerEncoderSim;
```

**Grab it in the constructor, alongside the other sim states:**

```java
  m_steerEncoderSim = m_steerEncoder.getSimState();
```

Unlike the rotor feed, there's no gear multiply here: the CANcoder sits
directly on the wheel, so it reads mechanism rotations straight from the
model.

**Add to `simulatePeriodic()`, right after the steer motor's own rotor
feed:**

```java
    m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));
    m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));
```

That `/ (2 * Math.PI)` is the same radians-to-rotations conversion the
rotor feed already uses two lines up — `DCMotorSim` speaks radians, Phoenix
sim states speak rotations, and this alpha has no shortcut method for that
one division, so it's spelled out here exactly like everywhere else in
this file.

The physics itself doesn't change — the same voltage still turns the same
motor through the same gearbox. What changed is *which sensor's sim state
the closed loop trusts*, so that's the sim state that has to stay honest.
One small bonus: sim has no real magnet to calibrate, so the model's own
zero already stands in for "aligned to true forward" — the sim path never
needs the magnet-offset ritual real hardware does.

---

## 7. Run it and feel the difference

`./gradlew simulateJava` → **RobotTeleop**, Swerve tab open with both
`Drivetrain/ModuleStates` and `Drivetrain/DesiredModuleStates` showing.
Drive hard, reverse abruptly, spin while translating. The measured arrows
should hug the desired arrows noticeably tighter than last lesson —
steering snaps to new angles without the soft lag of 50 Hz P control, and
wheel speeds land on their targets instead of drifting near them.

Tuning still works the way Lesson 5 taught you, just with new knobs:
`kSteerKP` too low and steering lags; too high and it buzzes around the
target. `kDriveKV` is the interesting one — get it right and `kDriveKP`
barely has anything to do. Which suggests a way to tune: set `kDriveKP =
0`, adjust `kV` until measured speed roughly matches requested speed,
*then* bring in a little `kP` for the residue. Model first, feedback
second.

---

## Try it

1. **Watch the model work.** Log the drive motor's applied voltage
   (`m_driveMotor.getMotorVoltage().getValue().in(Volts)`) next to
   requested and measured wheel speed. Command a step — the voltage jumps
   *instantly* to `kV × requested` before any error exists. That instant
   jump is feedforward; the small corrections after it are feedback.
2. **Break the model on purpose.** Set `kDriveKV = 0.4` (half right) and
   watch `kP` struggle to make up the difference — speed settles low or
   oscillates. Restore `0.8`. A good model makes feedback's job easy; a
   bad one makes it impossible.
3. **Turn off `ContinuousWrap`** (set it `false`), ask for a steer target
   across the ±180° boundary, and watch the wheel take the long way
   around — Lesson 5's bug, resurrected in firmware. Turn it back on and
   watch it vanish.
4. **Prove priming is really dead.** Add the deleted
   `m_steerMotor.setPosition(...)` line back into the constructor, right
   where it used to live. The constructor now sets it and then
   immediately hands control to `FeedbackSensorSource`, which means
   `getPosition()` never consults the rotor's own counter again. Run it
   and confirm nothing changes — same behavior with or without that line.
   Delete it again once you've watched it do nothing; code you've
   *proven* is dead is satisfying to remove.

---

## What you learned

The robot grew a second brain — or rather, you finally started using the
eight it already had. A **configuration object** teaches each TalonFX
about its mechanism once (`SensorToMechanismRatio` retiring your
gear-ratio divisions, `ContinuousWrap` retiring the wrap trick,
`Slot0` holding gains in engineering units), and reusable **control
requests** turn `setDesiredState` from computing efforts into stating
targets — `PositionVoltage` for steering, `VelocityVoltage` for drive —
closed at 1 kHz next to the sensor. And the CANcoder you've been priming
from since Lesson 5 finally got read the way it deserved all along: not a
one-time correction at boot, but a live source the firmware trusts every
tick, so "where the wheel is" and "what the sensor says" can't quietly
drift apart mid-match.

Two ideas are worth keeping from this lesson. First, the division of
labor in the drive gains: **`kV` is a model** that predicts the voltage a
speed costs, and `kP` only corrects what the model missed. Predict, then
trim — that's model-based control, and you'll meet it again in every
serious controller from here to graduate school. Second, a pattern worth
recognizing whenever you meet it again: **a quick fix that solves the
common case buys you time to build the fix that solves all of them.**
Priming wasn't wrong — it was exactly the right amount of engineering for
Lesson 5, and it kept the robot honest for seven lessons. Today's firmware
fix didn't replace a mistake; it replaced a *placeholder*, and the
difference between those two things is worth being able to tell apart.

Your code got shorter, your control got tighter, and `Drivetrain` never
noticed a thing. Next, the biggest architectural idea of the course:
restructuring the code so that a log file can *drive* it.

Next: Lesson 13 — IO layers & replay.
