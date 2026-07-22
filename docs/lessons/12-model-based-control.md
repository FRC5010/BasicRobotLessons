# Lesson 12 — Model-based control: let the motor do the math

**Goal:** Move the module's control loops off your 50 Hz code and onto the
TalonFX itself — position control with wrap-around for steering, velocity
control with a **feedforward model** for drive — and give steering an
absolute encoder so it knows the wheel's true angle the instant the robot
powers on. Watch the modules track their targets tighter than software P
ever did.

**New Java concepts**
- **Configuration objects** — build a description, then `apply` it once
- **Control request objects** — created once as fields, reused every tick
- Deleting code as progress (the wrap trick and gear math both move into firmware)

**New robot concepts**
- The TalonFX is a **computer**, running its own control loop at 1 kHz
- **`TalonFXConfiguration`**: `SensorToMechanismRatio`, `ContinuousWrap`,
  `Slot0` gains
- A **CANcoder** wired in as a remote sensor — absolute steering position
  that survives a power cycle
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
wrap-around, gains), then change `setDesiredState` — the method your commands
call each tick — from "do the math" to "state the goal."

---

## 2. Steering needs to remember where it's pointing

Here's a question worth sitting with: when the robot powers on, does your
code know which way the wheels are pointing?

Right now, no. The TalonFX's built-in position sensor is **relative** — it
counts rotations from wherever it happened to be at boot, not from any fixed
reference. That's fine for the drive motor: you never ask it "what's your
absolute rotation," only "how far since I last reset," and
`resetDrivePosition()` sets that reference right when you need it, at auto
init. But steering's sensor gets used for *angle* — compared against a
target — from the very first tick after power-on, in `optimize()` and in
odometry alike. If the sensor's zero is wherever the wheel happened to be
sitting when you flipped the breaker, "point this wheel at 47°" is 47° from
the wrong place, and nothing in your code can tell.

The fix is a second sensor built for exactly this: the **CANcoder**, CTRE's
magnetic absolute encoder. Mount it directly on the steering axis — not
through the gearbox, so one CANcoder rotation is exactly one wheel rotation
— and it reads the wheel's true angle from a magnet, the instant power comes
on. No history required, no boot-time ritual.

One calibration step remains. The CANcoder's own zero is wherever its magnet
happens to be glued on — probably not "wheel pointing forward." You measure
that gap once, with a number called the **magnet offset**: point the wheel
straight forward by hand, read the CANcoder's raw position in Phoenix Tuner
X, and store the *negative* of that reading as the offset. Configured with
that number, the CANcoder reports exactly `0` when the wheel is at true
forward, and everything downstream — `optimize()`, odometry,
`driveFieldRelative` — inherits a correct zero for free.

**Add to `DriveConstants`, next to the drive and steer ports:**

```java
public static class DriveConstants {
  // CAN IDs, one drive + one steer + one CANcoder per corner — change to yours.
  public static final int kFrontLeftDrivePort = 1;
  public static final int kFrontLeftSteerPort = 2;
  public static final int kFrontLeftCancoderPort = 9;
  public static final int kFrontRightDrivePort = 3;
  public static final int kFrontRightSteerPort = 4;
  public static final int kFrontRightCancoderPort = 10;
  public static final int kBackLeftDrivePort = 5;
  public static final int kBackLeftSteerPort = 6;
  public static final int kBackLeftCancoderPort = 11;
  public static final int kBackRightDrivePort = 7;
  public static final int kBackRightSteerPort = 8;
  public static final int kBackRightCancoderPort = 12;
  public static final int kGyroPort = 0; // Pigeon 2 CAN ID — change to yours

  // Magnet offsets (rotations): negative of each CANcoder's raw reading with
  // its wheel pointed forward. Measure with Phoenix Tuner X — change to yours.
  public static final double kFrontLeftMagnetOffset = 0.0;
  public static final double kFrontRightMagnetOffset = 0.0;
  public static final double kBackLeftMagnetOffset = 0.0;
  public static final double kBackRightMagnetOffset = 0.0;

  // ...existing gear ratio, wheel size, and geometry constants stay...
}
```

> **Mounting matters.** A CANcoder reads counterclockwise-positive by
> default, matching this course's convention. If yours ever reads backwards
> — the wheel turns one way and the angle counts the other — set
> `MagnetSensor.SensorDirection = SensorDirectionValue.Clockwise_Positive`
> in its config. One flipped sign, easy to fix, easy to miss.

---

## 3. Configure the motors

Phoenix 6 configuration works in two steps: build a **configuration object**
that describes everything about the mechanism, then `apply` it to the motor
once, in the constructor. Add to `SwerveModule`'s imports:

```java
import com.ctre.phoenix6.configs.CANcoderConfiguration;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.CANcoder;
import com.ctre.phoenix6.signals.FeedbackSensorSourceValue;
```

**Add the CANcoder field up with the motors**, since the constructor is
about to assign it:

```java
  private final CANcoder m_steerEncoder;
```

The constructor grows two parameters — the CANcoder's CAN ID and its magnet
offset — right alongside the drive and steer IDs it already takes, and
builds the CANcoder's own config before the steer motor's:

```java
  public SwerveModule(
      int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      Translation2d location) {
    // ...existing motor and sim-state assignments stay...
    m_steerEncoder = new CANcoder(cancoderId);

    // The CANcoder's raw zero is wherever its magnet sits — MagnetOffset
    // shifts that to "wheel pointing forward."
    CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
    cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
    m_steerEncoder.getConfigurator().apply(cancoderConfig);

    // Steering: read angle from the CANcoder, wrap like a circle, hold a P gain.
    TalonFXConfiguration steerConfig = new TalonFXConfiguration();
    steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;
    steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;
    steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;
    steerConfig.Feedback.SensorToMechanismRatio = 1.0;
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

Four settings carry the lesson now, not three.

**`FeedbackRemoteSensorID`** and **`FeedbackSensorSource`** are the actual
handoff: together they tell the steering TalonFX "don't trust your own rotor
for position and velocity — read this CANcoder instead." Once that's set,
every `getPosition()`/`getVelocity()` call on the steer motor — and the
closed loop itself — transparently reflects the CANcoder, not the rotor.

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
`while` loops — implemented in silicon. (This part doesn't care which sensor
feeds the loop — wrap-around is about the *mechanism*, not the sensor.)

**`Slot0`** holds the gains the onboard loop will use, same as before. New
constants in `Constants.java` (the old software-P `kP` in `SteerConstants` is
retiring this lesson — different loop, different units, different name):

```java
public static class SteerConstants {
  public static final double kSteerGearRatio = 25.0;  // rotor : CANcoder
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

**Update the four `SwerveModule` calls in `Drivetrain`** to pass the new CAN
ID and offset:

```java
  private final SwerveModule[] m_modules = new SwerveModule[] {
      new SwerveModule(DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
          DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
          DriveConstants.kFrontLeft),
      new SwerveModule(DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
          DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,
          DriveConstants.kFrontRight),
      new SwerveModule(DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
          DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,
          DriveConstants.kBackLeft),
      new SwerveModule(DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
          DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,
          DriveConstants.kBackRight)
  };
```

---

## 4. The question-methods go on a diet

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
they moved into the firmware, steering's via `RotorToSensorRatio` and
drive's via `SensorToMechanismRatio`. One source of truth for the ratio
beats two, because two can disagree. Notice `getSteerAngleDegrees()` didn't
need a single line changed to start reading the CANcoder instead of the
rotor, either — that's the Section 3 config swap paying for itself. The
method only ever asked the steer motor for its position; what answers that
question moved, and the method never noticed.

---

## 5. Command targets, not efforts

Now the heart of it. First, two **control request** fields, up with the
other fields. A control request is a little message object — "run position
control toward X" — and Phoenix asks you to create it *once* and reuse it
every tick rather than making a new one 50 times a second:

```java
  private final PositionVoltage m_steerRequest = new PositionVoltage(0);
  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);
```

Then rewrite `setDesiredState` — the method a command calls each tick. Out:
the error math, the wrap loops, the clamp, the `set(...)` calls. In: two
`setControl` calls that state goals. Since the firmware now speaks real
velocity, the drive target also stops being a fraction and stays in meters
per second:

```java
/** One tick of control: hand the firmware its targets. */
public void setDesiredState(SwerveModuleState state) {
  // Steering: firmware position control. state.angle is a Rotation2d — hand its
  // Angle measure straight to withPosition (Phoenix speaks Units too, so there's
  // no degrees-to-rotations conversion to write).
  m_steerMotor.setControl(m_steerRequest.withPosition(state.angle.getMeasure()));

  // Drive: cosine compensation (Lesson 9), then firmware velocity control.
  double error = state.angle.getDegrees() - getSteerAngleDegrees();
  double alignment = Math.cos(Math.toRadians(error));
  double wheelRps = state.speedMetersPerSecond * alignment / DriveConstants.kWheelCircumferenceMeters;
  m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));
}
```

Look at what `withPosition(state.angle.getMeasure())` replaced: measure,
subtract, wrap, multiply, clamp, command — the whole Lesson 5 ritual — now
happens inside the motor at 1 kHz, and you didn't even convert the angle,
because Phoenix's control requests take `Angle`/`AngularVelocity` measures the
same way WPILib does. (The drive side still divides by circumference to get
wheel rev/s, then wraps that in `RotationsPerSecond.of(...)` for
`withVelocity` — needs `import static edu.wpi.first.units.Units.RotationsPerSecond;`.)
The cosine trick stays in your code because it isn't a control loop; it's a
*decision* about how hard to drive, and decisions are the coach's job. (Once
the wrap and clamp code is gone, VS Code will gray out the now-unused
`MathUtil` import — let `Ctrl+.` clean it up.)

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

## 6. Is the sim still honest?

You just told the firmware the sensor spins 25× (or 6.75×) per mechanism
rotation — so do the sim conversions from Lessons 6–7 need to change?

Mostly no, for the same reason as before: **the sim state is always
rotor-side.** `setRawRotorPosition` feeds the raw rotor sensor, *upstream*
of any ratio math, exactly like the physical rotor sensor on a real module.
Your drive-side `simulationPeriodic()` multiply-back is untouched.

Steering picks up one addition, though, and skipping it leaves the sim
silently broken. The steering closed loop now reads the **CANcoder**, not
the rotor — so the CANcoder needs its own honest sim feed, or the simulated
firmware spends the whole match chasing a signal that never moves.

**Add its sim-state field next to the motors' — grab it in the constructor:**

```java
import com.ctre.phoenix6.sim.CANcoderSimState;
```

```java
  private final CANcoderSimState m_steerEncoderSim;
```

```java
  m_steerEncoderSim = m_steerEncoder.getSimState();
```

**Then feed it inside `simulationPeriodic()`**, right after the steer
motor's own rotor feed. Unlike that feed, there's no gear multiply here: the
CANcoder sits directly on the wheel, so it reads mechanism rotations
straight from the model:

```java
    m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPositionRotations());
    m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocityRPM() / 60.0);
```

The physics itself doesn't change — the same voltage still turns the same
motor through the same gearbox. What changed is *which sensor's sim state
the closed loop trusts*, so that's the sim state that has to stay honest.
One small bonus: sim has no real magnet to calibrate, so the model's own
zero already stands in for "aligned to true forward" — the sim path never
needs the magnet-offset ritual real hardware does.

---

## 7. Run it and feel the difference

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
4. **Break the calibration on purpose.** Change one module's magnet offset
   by `0.1` (about 36°) and run it. That wheel now points the wrong way by a
   fixed amount, every time, while the other three are fine — the exact
   symptom of a bad calibration on a real robot. Put the offset back.

---

## What you learned

The robot grew a second brain — or rather, you finally started using the
eight it already had. A **configuration object** teaches each TalonFX about
its mechanism once (`SensorToMechanismRatio` retiring your gear-ratio
divisions, `ContinuousWrap` retiring the wrap loops, `Slot0` holding gains
in engineering units), and reusable **control requests** turn
`setDesiredState` from computing efforts into stating targets —
`PositionVoltage` for steering, `VelocityVoltage` for drive — closed at 1 kHz
next to the sensor. Steering also picked up a second sensor: a **CANcoder**,
wired in as a remote feedback source so the wheel's angle is right from the
very first tick after power-on, not just after it happens to wander past a
known reference.

Two ideas are worth keeping from this lesson. First, the division of labor
in the drive gains: **`kV` is a model** that predicts the voltage a speed
costs, and `kP` only corrects what the model missed. Predict, then trim —
that's model-based control, and you'll meet it again in every serious
controller from here to graduate school. Second, the difference between a
relative sensor and an absolute one: relative sensors are cheaper and fine
for anything you zero right before you use it, like drive distance; absolute
sensors cost more but know the truth without being told, which is exactly
what a mechanism needs when its position matters from the instant the robot
turns on.

Your code got shorter, your control got tighter, and `Drivetrain` never
noticed a thing. Next, the biggest architectural idea of the course:
restructuring the code so that a log file can *drive* it.

Next: [Lesson 13 — IO layers & replay](13-io-replay.md).
