# Lesson 18 — Scoring elevator: holding a position, not just reaching one

**Goal:** Build a scoring elevator on the IO-layer spine from Lesson 13 —
`ElevatorIO`, `ElevatorIOTalonFX`, `ElevatorIOSim`, and an `Elevator`
mechanism — driven by Phoenix's **Motion Magic** profile generator and a
**full feedforward model**, and bind it to three preset heights on the
D-pad.

**New Java concepts**
- **Comparing measures directly** — `Distance.gt(...)` / `.lt(...)`, used to
  hand-roll a clamp now that there's no `MathUtil.clamp` to reach for

**New robot concepts**
- **Motion Magic** — firmware-generated trapezoidal motion profiles (a
  cruise velocity and an acceleration, not just a target)
- **The full feedforward model** — `kG` (gravity) + `kV` (speed) + `kA`
  (acceleration), with `kP` as a small trim, not the whole controller
- **`GravityTypeValue.Elevator_Static`** — telling the closed loop gravity's
  pull doesn't change with position, unlike an arm's
- Gains **computed from the motor's spec sheet**, not guessed
- Three numbers worth telling apart on any profiled mechanism: **goal**,
  **setpoint**, and **position**

---

## 1. A mechanism that has to stay somewhere

Every motor you've commanded so far has had one job at a time: spin at a
speed (the drive motors), or hold an angle just long enough to steer
through it (the steer motors). Nothing so far has had to *stay* anywhere
once you stopped paying attention to it.

An elevator does. Ask it for the mid-score height and walk away, and it
has to still be there a minute later — fighting gravity the entire time,
with nothing but a motor and a closed loop to lean on. That's a
qualitatively different job from steering, and it's worth understanding
*why* the steering gains you already have (`SteerConstants.kP = 40.0`,
back in Lesson 5) won't do it alone.

---

## 2. Why `kP` alone sags

Picture a pure proportional controller — `voltage = kP × error` — holding
the elevator up against gravity. Gravity constantly pulls the carriage
down, so the motor constantly needs *some* voltage just to stand still.
But look at the formula: the *only* way a P controller produces voltage is
by first tolerating error. Ask it to hold a position with zero error, and
it commands zero volts, and the carriage starts falling — which creates
error — which makes it command voltage again. The system doesn't fail
loudly. It finds a quiet compromise: a small, permanent gap between where
you asked it to be and where it actually settles, just large enough that
`kP × gap` happens to equal the holding voltage gravity demands.

That gap is easy to miss on a graph, because nothing looks *broken* — the
carriage gets close, stops moving, and sits there. It's just sitting a
little lower than you asked. Measured on this course's own gains: zeroing
`kElevatorKG` and asking the elevator to hold `kScoreMid` settles it about
**1.6 mm low**, permanently, for as long as the request stands. A small
number, but it's not noise — it's `kG`'s whole job, missing.

Deliberate, not accidental voltage is the fix: instead of asking `kP` to
back into the right voltage through tolerated error, you compute the
voltage the mechanism actually needs and hand it over directly. `kP`'s job
shrinks to *correcting whatever the model got wrong* — a trim, not the
whole controller. **Every profiled mechanism in this course gets that
treatment: a term for each physical effect, with `kP` cleaning up after
all of them.**

---

## 3. The feedforward model, computed from the spec sheet

Two facts from the Kraken X60's spec sheet do almost all of the work.

- **Free speed:** 6000 RPM at 12 V, which is 100 rotations/sec. That's
  **0.12 V per rotor rotation/sec** (`12 / 100`).
- **Stall torque:** 7.09 N·m at 12 V. That's **1.69 V per N·m** at the
  rotor (`12 / 7.09`).

Every gain below comes from one of those two numbers, walked through the
gearbox. The walk is always the same shape: figure out what the
*mechanism* (the drum) needs, convert it to what the *rotor* needs, then
multiply by whichever spec-sheet factor applies.

**`kV` — voltage to sustain a speed.** The elevator's gear ratio is
`12.0` — twelve rotor rotations per drum rotation — so sustaining *one*
drum rotation/sec means sustaining *twelve* rotor rotations/sec. Multiply
by the speed factor: `12 × 0.12 = 1.44`. That's `kElevatorKV`. (The
closed loop runs in drum rotations, not rotor rotations — Phoenix's
`SensorToMechanismRatio` handles that conversion, the same way
`DriveConstants.kDriveKV = 0.8` is volts per *wheel* rotation/sec, not
per rotor rotation/sec. `kV`, `kA`, and `kP` all live on the mechanism
side of that ratio.)

**`kG` — voltage to hold position.** The carriage weighs `kCarriageMass`
= 5 kg, so gravity pulls with `5 × 9.81 ≈ 49.05` N. That force acts at
the drum's radius (`kDrumRadius` = 1 inch = 0.0254 m), so the *drum*
needs `49.05 × 0.0254 ≈ 1.246` N·m of torque just to stand still.
Reflect that back through the gearbox to the rotor — dividing by the
gear ratio this time, since the gearbox multiplies torque going the other
way — and the rotor needs `1.246 / 12 ≈ 0.104` N·m. Multiply by the
torque factor: `0.104 × 1.69 ≈ 0.18` V. That's `kElevatorKG`.

**`kA` — voltage to accelerate.** This one scales with the mechanism's
effective inertia, which is a smaller and harder-to-eyeball number than
mass or drum radius. It's the smallest of the three terms here —
`kElevatorKA = 0.003` — correcting only for how sharply the profile
speeds up and slows down. You won't derive it by hand the way `kG` and
`kV` were derived above; §10 shows you how to confirm it's in the right
neighborhood from a graph instead.

**Add to `Constants.java`:**

```java
public static final class ElevatorConstants {
  public static final int kMotorPort = 20; // CAN ID — change to yours
  public static final double kGearRatio = 12.0; // motor rotations per drum rotation
  public static final Distance kDrumRadius = Inches.of(1.0);
  public static final Mass kCarriageMass = Kilograms.of(5.0); // carriage + anything riding on it

  public static final Distance kMinHeight = Meters.of(0.0);
  public static final Distance kMaxHeight = Meters.of(1.5);

  public static final LinearVelocity kMaxVelocity = MetersPerSecond.of(1.0);
  public static final LinearAcceleration kMaxAcceleration = MetersPerSecondPerSecond.of(2.0);

  // Feedforward + trim gains, computed from the Kraken X60 spec sheet — see the lesson's §3.
  // SensorToMechanismRatio makes the closed loop run in drum rotations, so
  // every gain below is drum-side (mechanism-side), not rotor-side.
  public static final double kElevatorKG = 0.18; // volts to hold position against gravity
  public static final double kElevatorKV = 1.44; // volts per drum rotation/sec
  public static final double kElevatorKA = 0.003; // volts per drum rotation/sec^2
  public static final double kElevatorKP = 20.0; // volts per drum rotation of error — the trim

  public static final Distance kStowed = Meters.of(0.02);
  public static final Distance kScoreMid = Meters.of(0.75);
  public static final Distance kScoreHigh = Meters.of(1.45);

  public static final Distance kTolerance = Centimeters.of(2);
}
```

That goes inside `Constants`, alongside `DriveConstants`, `SteerConstants`,
and the rest. **You'll need four new static imports at the top of
`Constants.java`** — `Centimeters`, `Inches`, `Kilograms`, and
`MetersPerSecondPerSecond` — plus the measure types `Distance`, `Mass`,
and `LinearAcceleration` from `org.wpilib.units.measure`, next to the
`AngularVelocity` and `LinearVelocity` imports already there.

> `kMotorPort = 20` steers clear of the drive and steer ports you've
> already claimed (1 through 12) and the CANcoder ports (9 through 12).
> Change it to whatever's free on your own robot.

---

## 4. Motion Magic: profiling the move

`PositionVoltage`, back in Lesson 5, snaps straight to a target angle —
fine for steering, where the whole trip takes a fraction of a second. Ask
an elevator to jump straight from stowed to full height the same way and
you'd get a violent, all-or-nothing lurch: full voltage until it's almost
there, then a hard stop.

**Motion Magic** is Phoenix's answer: instead of a raw target, you hand
the firmware a **cruise velocity** and an **acceleration**, and it
generates a smooth trapezoidal profile on its own — ramp up, cruise, ramp
down — recalculating it continuously as you change the goal. You still
supply the same `kG`/`kV`/`kA`/`kP` gains; Motion Magic just feeds the
profile's own velocity and position into that model instead of asking for
an instant jump.

`kMaxVelocity` and `kMaxAcceleration` above are already the *mechanism's*
numbers — meters/sec and meters/sec² of carriage travel. Converting them
into what `MotionMagicConfigs` wants (drum rotations/sec and
rotations/sec², the same mechanism-side units `kV`/`kA`/`kP` already use)
is exactly the meters-to-rotations conversion you'll write in §6.

---

## 5. The contract: `ElevatorIO`

Same shape as `ModuleIO` and `GyroIO` from Lesson 13 — a bundle of sensor
readings, and `default` do-nothing methods so a `REPLAY` implementation
needs zero code of its own.

**Create `subsystems/ElevatorIO.java`:**

```java
package first.robot.subsystems;

public interface ElevatorIO {
  public static class ElevatorIOInputs {
    public double heightMeters = 0.0;
    public double velocityMetersPerSec = 0.0;
    public double appliedVolts = 0.0;
    public double setpointMeters = 0.0; // the profile's instantaneous target, not the final goal
  }

  /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
  public default void updateInputs(ElevatorIOInputs inputs) {}

  /** Firmware Motion Magic position control, in meters of carriage height. */
  public default void setGoalHeightMeters(double meters) {}
}
```

That `setpointMeters` field is worth a second look before you move on.
It's tempting to think a mechanism only has two numbers worth tracking —
where you asked it to go, and where it actually is. There's a third:
where the *profile* currently says it should be, mid-ramp. Without it,
plotting position against the goal shows a step function next to a smooth
curve, and you can't tell whether a gap is the profile still ramping up
or the motor failing to keep up with a profile that's already there. §10
puts that number to work.

---

## 6. The hardware implementation: `ElevatorIOTalonFX`

**Create `subsystems/ElevatorIOTalonFX.java`:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.MetersPerSecond;
import static org.wpilib.units.Units.MetersPerSecondPerSecond;
import static org.wpilib.units.Units.Rotations;
import static org.wpilib.units.Units.RotationsPerSecond;
import static org.wpilib.units.Units.Volts;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import first.robot.Constants.ElevatorConstants;

/** Real hardware: Motion Magic profiles the move, Slot0's full feedforward set holds it. */
public class ElevatorIOTalonFX implements ElevatorIO {
  protected final TalonFX m_motor;
  private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

  public ElevatorIOTalonFX() {
    m_motor = new TalonFX(ElevatorConstants.kMotorPort, CANBus.systemcore(0));

    TalonFXConfiguration config = new TalonFXConfiguration();
    config.Feedback.SensorToMechanismRatio = ElevatorConstants.kGearRatio;

    // Full feedforward set — kP is the trim, not the whole story.
    config.Slot0.kG = ElevatorConstants.kElevatorKG;
    config.Slot0.GravityType = GravityTypeValue.Elevator_Static;
    config.Slot0.kV = ElevatorConstants.kElevatorKV;
    config.Slot0.kA = ElevatorConstants.kElevatorKA;
    config.Slot0.kP = ElevatorConstants.kElevatorKP;

    config.MotionMagic.MotionMagicCruiseVelocity =
        metersToRotations(ElevatorConstants.kMaxVelocity.in(MetersPerSecond));
    config.MotionMagic.MotionMagicAcceleration =
        metersToRotations(ElevatorConstants.kMaxAcceleration.in(MetersPerSecondPerSecond));

    m_motor.getConfigurator().apply(config);
  }

  @Override
  public void updateInputs(ElevatorIOInputs inputs) {
    inputs.heightMeters = rotationsToMeters(m_motor.getPosition().getValue().in(Rotations));
    inputs.velocityMetersPerSec =
        rotationsToMeters(m_motor.getVelocity().getValue().in(RotationsPerSecond));
    inputs.appliedVolts = m_motor.getMotorVoltage().getValue().in(Volts);
    inputs.setpointMeters = rotationsToMeters(m_motor.getClosedLoopReference().getValue());
  }

  @Override
  public void setGoalHeightMeters(double meters) {
    // Phoenix speaks Units — hand it the position as a measure.
    m_motor.setControl(m_request.withPosition(Rotations.of(metersToRotations(meters))));
  }

  /** Drum rotations for a given carriage height — the drum's circumference does the conversion. */
  protected static double metersToRotations(double meters) {
    return meters / (2 * Math.PI * ElevatorConstants.kDrumRadius.in(Meters));
  }

  protected static double rotationsToMeters(double rotations) {
    return rotations * 2 * Math.PI * ElevatorConstants.kDrumRadius.in(Meters);
  }
}
```

A few things worth pointing at directly:

- **`GravityTypeValue.Elevator_Static`** tells the closed loop that `kG`'s
  contribution doesn't depend on where the carriage is — full weight,
  full holding voltage, whether it's at the bottom or the top. (An arm's
  gravity load *does* change with angle, which is a different
  `GravityTypeValue` a later lesson introduces.)
- **`SensorToMechanismRatio = kGearRatio`** is what makes every gain
  above, and every position the motor reports, live in *drum* rotations
  instead of rotor rotations — the same trick `ModuleIOTalonFX` already
  uses for the drive and steer motors.
- **`getClosedLoopReference()`** is new: it's the profile's own live
  setpoint, straight from the firmware — exactly the third number §5
  flagged.
- Notice there's no `getValueAsDouble()` anywhere here, even though
  `getClosedLoopReference()` returns a plain number. Every `StatusSignal`
  in this API gives you `.getValue()` and nothing shorter — for a
  `Voltage` or an `Angle` that means unpacking with `.in(...)`, and for a
  bare `Double` like this one it just auto-unboxes.

---

## 7. The sim implementation: `ElevatorIOSim`

Same pattern as `ModuleIOSim` from Lesson 13: extend the real class to
inherit its motor and its configs, then feed a physics model into the
motor's sim state every tick. The physics model this time is WPILib's
`ElevatorSim` — it already knows how to turn a voltage into a height, a
velocity, and (with `simulateGravity` on) a carriage that falls when
nothing's holding it up.

**Create `subsystems/ElevatorIOSim.java`:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Kilograms;
import static org.wpilib.units.Units.Meters;

import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.system.DCMotor;
import org.wpilib.simulation.ElevatorSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.ElevatorConstants;

/** Sim: the real TalonFX class, plus WPILib's ElevatorSim physics model underneath it. */
public class ElevatorIOSim extends ElevatorIOTalonFX {
  private final TalonFXSimState m_sim;
  private final ElevatorSim m_elevatorModel = new ElevatorSim(
      DCMotor.getKrakenX60(1),
      ElevatorConstants.kGearRatio,
      ElevatorConstants.kCarriageMass.in(Kilograms),
      ElevatorConstants.kDrumRadius.in(Meters),
      ElevatorConstants.kMinHeight.in(Meters),
      ElevatorConstants.kMaxHeight.in(Meters),
      true, // simulateGravity — an unpowered carriage falls
      ElevatorConstants.kStowed.in(Meters));

  public ElevatorIOSim() {
    super(); // build the motor and apply the real configs
    m_sim = m_motor.getSimState();
  }

  @Override
  public void updateInputs(ElevatorIOInputs inputs) {
    stepSim(); // advance the physics one tick...
    super.updateInputs(inputs); // ...then read the sensor like the real class
  }

  /** One tick of pretend reality. */
  private void stepSim() {
    m_sim.setSupplyVoltage(RobotController.getBatteryVoltage());
    m_elevatorModel.setInputVoltage(m_sim.getMotorVoltage());
    m_elevatorModel.update(0.020);

    // The model reports carriage motion in meters; convert back to rotor-side
    // rotations through the drum and the gearbox, same as every module motor.
    m_sim.setRawRotorPosition(
        metersToRotations(m_elevatorModel.getPosition()) * ElevatorConstants.kGearRatio);
    m_sim.setRotorVelocity(
        metersToRotations(m_elevatorModel.getVelocity()) * ElevatorConstants.kGearRatio);
  }
}
```

`metersToRotations` and `rotationsToMeters` are `protected` on
`ElevatorIOTalonFX` for exactly this reason — the sim class reaches
straight in and reuses them instead of redefining the same conversion
twice.

---

## 8. The `Elevator` mechanism

Same shape as `Drivetrain`: a mode switch picks the IO implementation
once, at construction, and a hand-registered periodic callback does the
sensing and logging — `Mechanism` doesn't hand you a `periodic()` hook of
its own, so you ask the scheduler for one the same way `Drivetrain`
already does.

**Create `subsystems/Elevator.java`:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.units.measure.Distance;

import first.robot.Constants;
import first.robot.Constants.ElevatorConstants;

/** Scoring elevator: Motion Magic profiles the move, Slot0's feedforward model holds it there. */
public class Elevator extends Mechanism {
  private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
    case REAL -> new ElevatorIOTalonFX();
    case SIM -> new ElevatorIOSim();
    case REPLAY -> new ElevatorIO() {}; // inputs come from the log
  };
  private final ElevatorIO.ElevatorIOInputs m_inputs = new ElevatorIO.ElevatorIOInputs();
  private Distance m_goal = ElevatorConstants.kStowed;

  public Elevator() {
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  /** One tick of sensing: read the hardware into the bundle and log it. */
  private void periodic() {
    m_io.updateInputs(m_inputs);
    SmartDashboard.putNumber("Elevator/HeightMeters", m_inputs.heightMeters);
    SmartDashboard.putNumber("Elevator/VelocityMetersPerSec", m_inputs.velocityMetersPerSec);
    SmartDashboard.putNumber("Elevator/AppliedVolts", m_inputs.appliedVolts);
    SmartDashboard.putNumber("Elevator/SetpointMeters", m_inputs.setpointMeters);
    SmartDashboard.putNumber("Elevator/GoalMeters", m_goal.in(Meters));
  }

  /** Send the carriage to 'target', clamped to safe travel. Keeps holding once it arrives. */
  public Command goToHeight(Distance target) {
    return runRepeatedly(() -> {
          m_goal = clampToTravel(target);
          m_io.setGoalHeightMeters(m_goal.in(Meters));
        })
        .until(this::atGoal)
        .named("Go To Height");
  }

  public boolean atGoal() {
    return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < ElevatorConstants.kTolerance.in(Meters);
  }

  public double getHeightMeters() {
    return m_inputs.heightMeters;
  }

  /** Keeps 'target' inside [kMinHeight, kMaxHeight] — there's no MathUtil.clamp to reach for here. */
  private static Distance clampToTravel(Distance target) {
    if (target.gt(ElevatorConstants.kMaxHeight)) {
      return ElevatorConstants.kMaxHeight;
    } else if (target.lt(ElevatorConstants.kMinHeight)) {
      return ElevatorConstants.kMinHeight;
    } else {
      return target;
    }
  }
}
```

Two design choices worth calling out:

**`clampToTravel` compares `Distance` values with `.gt(...)` and
`.lt(...)` instead of unpacking to `double` first.** WPILib's units
library gives every measure type ordering for free through the `Measure`
interface — `.gt`, `.lt`, `.gte`, `.lte` — so a typed clamp reads almost
exactly like the `double`-based one `Drivetrain` already has, just
comparing `Distance`s instead of raw numbers. There's no `MathUtil.clamp`
here to shortcut it, so this is the natural thing to reach for instead.

**`goToHeight` never calls `.whenCanceled(...)`.** Every drive command
you've written so far stops the robot on cancellation, because leaving a
swerve module spinning is dangerous. An elevator command is the opposite
case: a Motion Magic request is a standing order to the firmware —
"go here and stay" — that keeps running on its own until something
replaces it. If `goToHeight` gets interrupted by a fresh call to itself
(pressing a different D-pad direction, say), the *new* command's
`runRepeatedly` immediately issues a new goal, and the old one's absence
changes nothing. There's no gap where the carriage is uncommanded.

---

## 9. Wire it in: `Robot.java` and the D-pad

**Add to `Robot.java`, alongside the other fields:**

```java
public final PhotonVisionPoseProvider frontCamera;
public final PhotonVisionPoseProvider backCamera;
public final Elevator elevator = new Elevator();
```

**Add to `RobotTeleop.java`'s constructor, after the heading bindings:**

```java
// D-pad: send the elevator to one of its three preset heights.
robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));
```

That needs `import first.robot.Constants.ElevatorConstants;` up top,
alongside the `DriveConstants` import already there.

Run `./gradlew simulateJava`, open **SmartDashboard** or **Elastic**,
tap the D-pad, and watch `Elevator/HeightMeters` climb toward whichever
preset you asked for and stay there.

---

## 10. Reading the gains off a graph

Every gain here was computed, not guessed — but "computed" still means
"worth checking against what the robot actually does." Open
AdvantageScope (Lesson 3), connect to the simulator, and drag
`SmartDashboard/Elevator/GoalMeters`, `.../SetpointMeters`, and
`.../HeightMeters` onto the same **Line Graph** tab. Three curves, and
each one answers a different question: the goal is a step (what you
asked for), the setpoint is the smooth ramp Motion Magic generated (what
the profile is asking for *right now*), and the height is what the
carriage is actually doing. Tune against the middle curve, not the
first one — a gap between setpoint and height is the controller failing
to keep up; a gap between goal and setpoint is just the profile still
ramping, which is supposed to happen.

The order that makes sense to tune in is the order the model was built:
`kG` first, then `kV`, then `kA`, then `kP` last, as the smallest
possible trim.

- **`kG` wrong** shows up as a *steady offset even at rest* — the
  carriage settles a fixed distance from the setpoint and stays there no
  matter how long you wait. Measured on this course's own numbers:
  zeroing `kElevatorKG` sags the hold by about **1.6 mm**. Small, because
  0.18 V is small, but it never goes away on its own.
- **`kV` wrong** shows up *only while cruising* — position lagging
  setpoint by a growing gap during the flat part of the profile, closing
  again as the profile decelerates. Measured moving the full travel
  range with `kElevatorKV` zeroed: **≈145 mm** of peak lag. With the
  model in place, the same move: **≈34 mm**. `kP = 20` is doing real
  work either way — the difference is how much work it's *forced* to do
  versus how much the model already handled for it.
- **`kA` wrong** is the subtlest: a brief spike in the setpoint-vs-height
  gap right at the start and end of the move, where the profile is
  accelerating or decelerating hardest, vanishing once it reaches
  constant speed. It's a small effect here (`kElevatorKA = 0.003`) and
  easy to miss unless you're specifically looking at the ramp edges.
- **`kP`** should be the last thing you touch, and only a little. With
  the model correct, the fully-settled gap between setpoint and height
  on this course's own gains lands under a quarter of a millimeter — if
  you find yourself raising `kP` to chase a bigger gap than that, the
  actual bug is almost always upstream, in `kG`, `kV`, or `kA`.

> **On real hardware:** don't skip straight to full-height moves while
> tuning. Start with `kScoreMid` from a stop, watch it settle, then try a
> full-travel move. A wrong `kG` on a real elevator means the carriage
> either creeps down under its own weight or overshoots the second you
> let go of manual control — both are things you want to catch at a slow,
> short move before trying the full range.

---

## Try it

1. **Add a fourth preset.** Give `ElevatorConstants` a `kScoreLow`
   between `kStowed` and `kScoreMid`, and bind it to a face button.
2. **Watch the sag.** Temporarily set `kElevatorKG` to `0.0`, command
   `kScoreMid`, and let it settle. Compare the steady-state
   `HeightMeters` against `GoalMeters` on the graph — you should see
   almost exactly the gap §10 measured. Put `0.18` back when you're done.
3. **Ask for somewhere the elevator can't go.** Bind a spare button to
   `elevator.goToHeight(Meters.of(3.0))` — well past `kMaxHeight`. Watch
   `GoalMeters` on the graph clamp to `1.5` instead of jumping to `3.0`,
   confirming `clampToTravel` is doing its job before the request ever
   reaches the motor.
4. **Halve the motion limits.** Try `kMaxVelocity = MetersPerSecond.of(0.5)`
   and `kMaxAcceleration = MetersPerSecondPerSecond.of(1.0)`. The setpoint
   curve should stretch out — same shape, twice the time to get there —
   while the *steady-state* tracking (setpoint versus height, once
   moving) should barely change, since that's governed by `kV`/`kA`/`kP`,
   not by how fast you told the profile to go.

---

## What you learned

An elevator's whole job is different from anything you've automated so
far — it has to *stay*, not just *arrive* — and a plain `kP` controller
can only do that by tolerating a permanent, silent error. The fix wasn't
a bigger `kP`. It was **a term for each physical effect**: `kG` for the
constant pull of gravity, `kV` for the voltage a steady speed costs,
`kA` for the extra push a changing speed costs, and `kP` shrunk down to
what's left over once the model has done its job. All three feedforward
gains came straight off the Kraken X60's spec sheet, walked through the
gearbox by hand — nothing here was guessed.

**Motion Magic** turned "go here" into a real trapezoidal profile
generated in firmware, and that profile handed you a third number worth
tracking alongside goal and position: the **setpoint**, read live off
`getClosedLoopReference()`. Without it, a lagging elevator and a still-
ramping one look identical on a graph.

And once again, the IO layer from Lesson 13 paid for itself. `ElevatorIO`,
`ElevatorIOTalonFX`, and `ElevatorIOSim` are new files, but nothing about
how `Elevator` is *used* — the mode switch, the periodic sensing, the
command-returning method — differs from `Drivetrain`'s shape. That
repetition isn't an accident; it's the pattern this course keeps handing
you because it keeps being the right one.

Next: watching the elevator move as more than three numbers on a graph —
drawing it.
