# Lesson 12 — Model-based control: let the motor do the math

**Goal:** Move the module's control loops off your 50 Hz code and onto the
TalonFX itself — position control with wrap-around for steering, velocity
control with a **feedforward model** for drive — and watch the modules track
their targets tighter than software P ever did.

**New Java concepts**
- **Configuration objects** — build a description, then `apply` it once
- **Control request objects** — created once as fields, reused every tick
- Deleting code as progress (the wrap trick and gear math both move into firmware)

**New robot concepts**
- The TalonFX is a **computer**, running its own control loop at 1 kHz
- **`TalonFXConfiguration`**: `SensorToMechanismRatio`, `ContinuousWrap`,
  `Slot0` gains
- **`PositionVoltage`** and **`VelocityVoltage`** control requests
- **Feedforward (`kV`)** — a *model* predicts the voltage; feedback (`kP`)
  only trims the leftover error

---

## 1. Two computers

Here's a fact hiding in plain sight since Lesson 1: every TalonFX *is a
computer*. Not a metaphor — there's a processor inside each motor controller,
running its own control code about **1000 times per second**. The mental
model to correct is "my code is the robot's only brain." Your code is the
*coach*: it decides what each motor should be doing. The motor controller is
the *player*: it can chase that goal twenty times faster than your 50 Hz
loop can even look.

Think about what your steering P control has been doing: once every 20 ms it
checks the angle, computes an output, and commands it — then goes blind
until the next tick. The TalonFX can run the *same* P loop at 1 kHz, right
next to the sensor, with no CAN-bus delay in the middle. Tighter control,
and your code gets simpler at the same time: instead of computing *efforts*
every tick, it states *targets* and lets the firmware close the loop.

That's the whole lesson: teach the firmware about your mechanism (gearing,
wrap-around, gains), then change `periodic()` from "do the math" to "state
the goal."

---

## 2. Configure the motors

Phoenix 6 configuration works in two steps: build a **configuration object**
that describes everything about the mechanism, then `apply` it to the motor
once, in the constructor. Add to `SwerveModule`'s imports:

```java
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
```

And at the end of the constructor, after the motors exist:

```java
  public SwerveModule(int driveId, int steerId, Translation2d location) {
    // ...existing motor and sim-state assignments stay...

    TalonFXConfiguration steerConfig = new TalonFXConfiguration();
    steerConfig.Feedback.SensorToMechanismRatio = SteerConstants.kSteerGearRatio;
    steerConfig.ClosedLoopGeneral.ContinuousWrap = true;
    steerConfig.Slot0.kP = SteerConstants.kSteerKP;
    m_steerMotor.getConfigurator().apply(steerConfig);

    TalonFXConfiguration driveConfig = new TalonFXConfiguration();
    driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;
    driveConfig.Slot0.kV = DriveConstants.kDriveKV;
    driveConfig.Slot0.kP = DriveConstants.kDriveKP;
    m_driveMotor.getConfigurator().apply(driveConfig);
  }
```

Three settings carry the lesson.

**`SensorToMechanismRatio`** tells the firmware about the gearbox — the same
`25 : 1` and `6.75 : 1` your question-methods have been dividing by since
Lessons 6 and 7. Once the firmware knows the ratio, `getPosition()` and
`getVelocity()` report **mechanism** units — steering rotations, wheel
rotations — instead of rotor units. Your division code is about to become
redundant, which is the good kind of redundant.

**`ContinuousWrap`** tells the steering closed loop that its mechanism is a
circle: position `0.9` rotations and position `-0.1` are one small step
apart, not most of a revolution. That's the Lesson 5 wrap trick — the two
`while` loops — implemented in silicon.

**`Slot0`** holds the gains the onboard loop will use. New constants in
`Constants.java` (the old software-P `kP` in `SteerConstants` is retiring
this lesson — different loop, different units, different name):

```java
public static class SteerConstants {
  public static final double kSteerGearRatio = 25.0;  // rotor : steering
  public static final double kSteerKP = 40.0;         // volts per rotation of error — tune
}

public static class DriveConstants {
  // ...existing constants stay...
  public static final double kDriveKV = 0.8;          // volts per wheel rotation/sec — the model
  public static final double kDriveKP = 0.1;          // volts per rps of error — the trim
}
```

Note the units: these gains produce **volts**, not fractions of full power,
because the control requests we're about to use speak voltage. `kSteerKP = 40`
means "40 volts per full rotation of error" — a wheel 90° off (0.25
rotations) gets 10 volts of push, easing off as it closes. Same P control
you've tuned twice already, wearing engineering units.

---

## 3. The question-methods go on a diet

With the firmware doing mechanism math, three methods in `SwerveModule`
simplify. This is the rare edit where *deleting* is the progress — update
each to drop its gear-ratio division:

```java
/** Current steering angle in degrees. */
public double getSteerAngleDegrees() {
  return m_steerMotor.getPosition().getValueAsDouble() * 360.0; // mechanism rotations → degrees
}

/** How far this module's wheel has driven, in meters, since the last reset. */
public double getDistanceMeters() {
  return m_driveMotor.getPosition().getValueAsDouble()
      * DriveConstants.kWheelCircumferenceMeters; // wheel rotations → meters
}

/** Current wheel speed in meters per second. */
public double getDriveVelocityMetersPerSec() {
  return m_driveMotor.getVelocity().getValueAsDouble()
      * DriveConstants.kWheelCircumferenceMeters; // wheel rps → m/s
}
```

The `/ kSteerGearRatio` and `/ kDriveGearRatio` steps didn't disappear —
they moved into the firmware via `SensorToMechanismRatio`. One source of
truth for the ratio beats two, because two can disagree.

---

## 4. Command targets, not efforts

Now the heart of it. First, two **control request** fields, up with the
other fields. A control request is a little message object — "run position
control toward X" — and Phoenix asks you to create it *once* and reuse it
every tick rather than making a new one 50 times a second:

```java
  private final PositionVoltage m_steerRequest = new PositionVoltage(0);
  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);
```

Then rewrite `periodic()`. Out: the error math, the wrap loops, the clamp,
the `set(...)` calls. In: two `setControl` calls that state goals:

```java
public void periodic() {
  // Steering: firmware position control, wrap and gearing included.
  m_steerMotor.setControl(m_steerRequest.withPosition(m_targetSteerDegrees / 360.0));

  // Drive: cosine compensation (Lesson 9), then firmware velocity control.
  double error = m_targetSteerDegrees - getSteerAngleDegrees();
  double alignment = Math.cos(Math.toRadians(error));
  double wheelRps = (m_targetSpeedMps * alignment) / DriveConstants.kWheelCircumferenceMeters;
  m_driveMotor.setControl(m_driveRequest.withVelocity(wheelRps));
}
```

And since the drive loop now takes real velocity, the module stores its
target in real units — rename `m_targetDriveSpeed` to `m_targetSpeedMps` and
delete the fraction conversion in `setDesiredState`:

```java
private double m_targetSteerDegrees = 0.0;
private double m_targetSpeedMps     = 0.0;

public void setDesiredState(SwerveModuleState state) {
  m_targetSteerDegrees = state.angle.getDegrees();
  m_targetSpeedMps     = state.speedMetersPerSecond;
}
```

Look at what `withPosition(m_targetSteerDegrees / 360.0)` replaced: measure,
subtract, wrap, multiply, clamp, command — the whole Lesson 5 ritual — now
happens inside the motor at 1 kHz. The cosine trick stays in your code
because it isn't a control loop; it's a *decision* about how hard to drive,
and decisions are the coach's job. (Once the wrap and clamp code is gone,
VS Code will gray out the now-unused `MathUtil` import — let `Ctrl+.` clean
it up.)

Now the drive gains, because they're where "model-based" earns its name.
**`kV` is a model of the motor**: it answers "how many volts does one wheel
rotation per second cost?" Ours is about `0.8` — at 12 volts that predicts
~15 wheel rps, which is the free-speed math from Lesson 10 read backwards.
When you request 10 rps, the firmware *immediately* applies `10 × 0.8 = 8`
volts because the model says that's what 10 rps costs — no waiting for error
to build up. Then `kP` handles only the leftover: friction, battery sag,
carpet. The model does 95% of the work by prediction; feedback trims the
rest by reaction. That division of labor — predict with a model, correct
with feedback — is what *model-based control* means, and it's how every
high-level controller you'll ever meet is built.

One thing that *doesn't* change: `Drivetrain`. It talks to modules through
`setDesiredState` and the question-methods, and those signatures held steady
while everything behind them was replaced. That's the encapsulation payoff,
one more time, at refactor scale.

---

## 5. Is the sim still honest?

You just told the firmware the sensor spins 25× (or 6.75×) per mechanism
rotation — so do the sim conversions from Lessons 6–7 need to change?

No, and the reason is worth understanding: **the sim state is always
rotor-side.** `setRawRotorPosition` says so right in the name — it feeds the
raw rotor sensor, *upstream* of the `SensorToMechanismRatio` math, exactly
like the physical rotor sensor on a real module. Your `simulationPeriodic()`
multiply-backs stay exactly as they are, and the firmware (which Phoenix
also simulates, closed loops included) does the mechanism conversion on top.
Chain unchanged, honesty preserved.

---

## 6. Run it and feel the difference

`./gradlew simulateJava` → **Teleoperated**, Swerve tab open with both
`Drivetrain/ModuleStates` and `Drivetrain/DesiredModuleStates` showing.
Drive hard, reverse abruptly, spin while translating. The measured arrows
should hug the desired arrows noticeably tighter than last lesson — steering
snaps to new angles without the soft lag of 50 Hz P control, and wheel
speeds land on their targets instead of drifting near them.

Tuning still works the way Lesson 5 taught you, just with new knobs:
`kSteerKP` too low and steering lags; too high and it buzzes around the
target. `kDriveKV` is the interesting one — get it right and `kDriveKP`
barely has anything to do. Which suggests a way to tune: set `kDriveKP = 0`,
adjust `kV` until measured speed roughly matches requested speed, *then*
bring in a little `kP` for the residue. Model first, feedback second.

---

## Try it

1. **Watch the model work.** Log the drive motor's applied voltage
   (`m_driveMotor.getMotorVoltage().getValueAsDouble()`) next to requested
   and measured wheel speed. Command a step — the voltage jumps *instantly*
   to `kV × requested` before any error exists. That instant jump is
   feedforward; the small corrections after it are feedback.
2. **Break the model on purpose.** Set `kDriveKV = 0.4` (half right) and
   watch `kP` struggle to make up the difference — speed settles low or
   oscillates. Restore `0.8`. A good model makes feedback's job easy; a bad
   one makes it impossible.
3. **Turn off `ContinuousWrap`** (set it `false`), ask for a steer target
   across the ±180° boundary, and watch the wheel take the long way around —
   Lesson 5's bug, resurrected in firmware. Turn it back on and watch it
   vanish.

---

## What you learned

The robot grew a second brain — or rather, you finally started using the
eight it already had. A **configuration object** teaches each TalonFX about
its mechanism once (`SensorToMechanismRatio` retiring your gear-ratio
divisions, `ContinuousWrap` retiring the wrap loops, `Slot0` holding gains
in engineering units), and reusable **control requests** turn `periodic()`
from computing efforts into stating targets — `PositionVoltage` for
steering, `VelocityVoltage` for drive — closed at 1 kHz next to the sensor.
The idea to keep is the division of labor in the drive gains: **`kV` is a
model** that predicts the voltage a speed costs, and `kP` only corrects
what the model missed. Predict, then trim — that's model-based control, and
you'll meet it again in every serious controller from here to graduate
school. Your code got shorter, your control got tighter, and `Drivetrain`
never noticed a thing. Next, the biggest architectural idea of the course:
restructuring the code so that a log file can *drive* it.

Next: [Lesson 13 — IO layers & replay](13-io-replay.md).
