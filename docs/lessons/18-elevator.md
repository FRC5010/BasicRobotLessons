# Lesson 18 — Scoring elevator: a second mechanism

**Goal:** Build a scoring elevator on the exact spine the swerve modules already
use — `ElevatorIO` → `ElevatorIOTalonFX`/`ElevatorIOSim` → `Elevator` — and let the
TalonFX plan its own trip, then follow that plan from a model of what the mechanism
costs to move, with feedback left to correct only what the model missed.

**New Java concepts**
- Clamping a **goal** rather than a per-tick output — validating a request once,
  instead of correcting the result forever

**New robot concepts**
- A **linear mechanism with hard ends**, where a wheel had an endless circle
- **`MotionMagicVoltage`** — a control request that profiles the trip instead of
  jumping at the setpoint
- **`MotionMagicConfigs`** — cruise velocity and acceleration: how fast it's
  *allowed* to get there
- **`Slot0.kG`, `kV`, and `kA`** — a model of the mechanism, paying for gravity,
  speed, and acceleration *before* any error exists, with `kP` left as the trim
- **Computing gains instead of guessing them**, then reading the real ones off an
  AdvantageScope graph one at a time
- **`GravityTypeValue.Elevator_Static`** — the first mechanism that falls when you
  stop pushing
- **`ElevatorSim`** — a physics model with mass and gravity, in `DCMotorSim`'s slot

---

## 1. The same spine, one more time

Here is the whole architecture of this lesson, and you already know it:

> An `ElevatorIO` interface with `@AutoLog` inputs. An `ElevatorIOTalonFX` that
> talks to real hardware. An `ElevatorIOSim extends ElevatorIOTalonFX` that adds
> physics. An `Elevator` subsystem that owns one of them, picked by
> `Constants.kCurrentMode`, and logs its inputs every tick.

That's `ModuleIO`, `ModuleIOTalonFX`, `ModuleIOSim`, and `SwerveModule` with the
nouns swapped. Lesson 13 spent a whole lesson justifying that shape. This lesson
spends none, because the justification hasn't changed — which is the actual point.
The second mechanism is fast, and it's fast *because* the first one was built
carefully.

So we can spend the whole lesson on what's genuinely different: this thing has a
top and a bottom it can crash into, and gravity is pulling on it every second of
the match, including the seconds when your code isn't looking.

A wheel never had either problem. A wheel spins forever in a circle — that's why
Lesson 12 turned on `ContinuousWrap`, so 350° and −10° meant the same place. An
elevator is the opposite: 1.6 meters is not a place, it's a broken robot. And a
wheel commanded to zero speed simply stops. A carriage commanded to zero *falls*.

---

## 2. Describe the elevator

An elevator turns rotations into height through a **drum** — the spool the cable
or belt wraps around. One drum rotation raises the carriage by exactly one drum
circumference, which makes the conversion the same shape as the wheel
circumference you've used since Lesson 6.

**Add to `Constants.java`, as a new nested class:**

```java
  public static class ElevatorConstants {
    public static final int kMotorPort = 20; // CAN ID — change to yours

    // Mechanism geometry. The drum is what the belt wraps around, so one drum
    // rotation raises the carriage by its circumference.
    public static final double kGearRatio = 12.0; // rotor : drum
    public static final Distance kDrumRadius = Inches.of(1.0);
    public static final double kDrumCircumferenceMeters =
        2 * Math.PI * kDrumRadius.in(Meters);
    public static final Mass kCarriageMass = Kilograms.of(5.0);

    // How far it can physically travel. Ask for more and the goal gets clamped.
    public static final Distance kMinHeight = Meters.of(0.0);
    public static final Distance kMaxHeight = Meters.of(1.5);

    // Motion Magic: not where to go, but how fast it may get there.
    public static final LinearVelocity kMaxVelocity = MetersPerSecond.of(1.0);
    public static final LinearAcceleration kMaxAcceleration =
        MetersPerSecondPerSecond.of(2.0);

    // The model: what this mechanism costs to hold, to move, and to speed up.
    public static final double kElevatorKG = 0.18; // volts just to hold station
    public static final double kElevatorKV = 1.44; // volts per drum rotation/sec
    public static final double kElevatorKA = 0.003; // volts per drum rotation/sec²
    // The trim: whatever the model got wrong.
    public static final double kElevatorKP = 20.0; // volts per rotation of error

    // Where the driver actually wants it.
    public static final Distance kStowed = Meters.of(0.02);
    public static final Distance kScoreMid = Meters.of(0.75);
    public static final Distance kScoreHigh = Meters.of(1.45);

    public static final Distance kTolerance = Centimeters.of(2);
  }
```

**Add the import** `LinearAcceleration` needs — `edu.wpi.first.units.measure.LinearAcceleration`,
next to the `Distance` and `Mass` imports Lesson 16 already added.

Heights, speeds, and the drum radius are **measures**, per the habit since
Lesson 10 — they're physical quantities, and `kScoreMid` reads better as a
`Distance` than as a bare number whose unit lives in a comment.
`kDrumCircumferenceMeters` is the exception that proves the rule: it exists only to
be divided into other numbers, so it converts once, here, and stays a `double`.

The four gains stay `double`s, same as `kDriveKV` and `kSteerKP` — a gain is a ratio,
not a length. Section 4 is about what each of them means.

---

## 3. `ElevatorIO`: the contract

An elevator asks less of its hardware than a swerve module did. One read, one write.

**Create `src/main/java/frc/robot/subsystems/ElevatorIO.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between the elevator's logic and its hardware. One read and one
 * write — an elevator is a simpler device than a swerve module. Default bodies
 * do nothing, so the replay implementation is just `new ElevatorIO() {}`.
 */
public interface ElevatorIO {
    @AutoLog
    public static class ElevatorIOInputs {
        public double heightMeters = 0.0;
        public double velocityMetersPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double setpointMeters = 0.0;
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(ElevatorIOInputs inputs) {}

    /** Hand the firmware a height to profile toward and then hold. */
    public default void setGoalHeightMeters(double heightMeters) {}
}
```

Two of those inputs are new to this course, and both are there because you cannot
tune a mechanism you cannot see.

`appliedVolts` is the voltage the motor is actually using. On a thing fighting
gravity that's the most direct evidence of what the model is doing — section 9
reads every gain off this one trace.

`setpointMeters` is subtler and more useful. There are **three** different heights
worth keeping straight:

| | what it is |
|---|---|
| goal | where the carriage will end up. Jumps the instant you press a button. |
| setpoint | where the plan says it should be *this tick*. Slides smoothly from here to the goal. |
| height | where it actually is. |

The goal is your program's intent. The setpoint is the firmware's plan. The
difference between the setpoint and the height is **tracking error** — the only
thing `kP` can see, and the thing the rest of this lesson is about shrinking.

---

## 4. A plan, and a model that follows it

Two new ideas go into the hardware class, and they're the reason this lesson exists.

**The first: profile the trip, don't just name the destination.** Lesson 12's
`PositionVoltage` takes a target and drives at it as hard as the gains allow — for a
steering module rotating a few degrees, fine. Tell a 5 kg carriage to go from the
floor to 1.45 m with `PositionVoltage` and the error starts enormous, so the output
starts pinned, and the thing leaps off the floor and slams into the top.

**`MotionMagicVoltage`** takes the same target and asks a different question: what's
a *reasonable trip* from here to there? The firmware builds a motion profile —
accelerate to a cruise speed, hold it, decelerate to arrive at rest — and follows
that, thousands of times a second. You supply the limits:

*Nothing to add — this is the shape of those two settings:*

```java
config.MotionMagic.MotionMagicCruiseVelocity = ...; // mechanism rotations per second
config.MotionMagic.MotionMagicAcceleration   = ...; // rotations per second squared
```

**The second: a plan is only worth having if something can follow it.** And this is
the idea to take out of the lesson, so it's worth going slowly.

The profile isn't only a sequence of positions. At every instant it also knows how
fast the carriage *should* be moving and how hard it *should* be accelerating —
because it invented those numbers itself. That turns out to be enough to work out
the required voltage in advance, before the carriage has done anything at all.

Four gains live in `Slot0`, and each one answers a physical question about this
specific mechanism:

| gain | the question it answers | what it's paid for |
|---|---|---|
| `kG` | what does it cost to hold the carriage still? | gravity |
| `kV` | what does it cost to keep it moving at a given speed? | back-EMF |
| `kA` | what does it cost to *change* that speed? | inertia |
| `kP` | and whatever those three got wrong? | error |

The first three are **feedforward**: the firmware reads them off the plan and applies
the result immediately, whether or not anything has gone wrong. `kP` is **feedback**:
it can only act on error that has already happened. Lesson 12 drew that line for the
drive motors — `kV` is the model, `kP` is the trim — and it's the same line here, with
gravity and inertia joining the model.

It is very tempting to skip the first three and let `kP` handle everything. Do the
arithmetic once and you won't want to.

At one meter per second, the drum turns about 6.3 times a second, which through the
12:1 gearbox is 75 rotor rotations a second — and a Kraken X60 needs roughly **9
volts** to spin that fast. Those 9 volts have to come from somewhere. With `kV` in the
config they come from the plan: the profile says "1.0 m/s", `kV` multiplies, and 9
volts appear the instant they're needed. Without it, the only thing producing output
is `kP × error`, and at 20 volts per drum rotation, 9 volts requires **0.45 of a
rotation of error — about 7 centimeters.**

> Read that one more time, because it's the whole argument. A purely reactive elevator
> doesn't fall behind by accident. It falls behind **on purpose**: error is the only
> raw material `kP` has, so it must let 7 cm of error pile up to buy the voltage it
> needs to keep up. The lag isn't a tuning failure you can fix with a bigger `kP` —
> it's how a pure feedback loop works.
>
> Hand the firmware the numbers it can compute in advance and `kP` goes back to its
> real job: correcting the small stuff the model didn't know about.

### Where those three numbers come from

You don't guess them. Two facts off a Kraken X60's spec sheet turn all three into
arithmetic:

- On 12 volts with nothing attached, it free-spins at **6000 RPM** — 100 rotations a
  second. So making the *rotor* spin costs `12 / 100 =` **0.12 volts per rotation
  per second**.
- Held still at 12 volts, it produces **7.09 N·m**. So making the *rotor* twist costs
  `12 / 7.09 =` **1.69 volts per newton-metre**.

Every gain in this course follows the same three steps from there:

> 1. Work out what the **mechanism** needs — a speed, or a torque.
> 2. Divide by the gear ratio to get what the **rotor** needs. (A gearbox trades
>    speed for torque, so the rotor spins 12× faster and twists 12× less.)
> 3. Multiply by **0.12** if it's a speed, or **1.69** if it's a torque.

**`kV = 1.44` — what one drum rotation per second costs.** The drum turns once, the
rotor turns 12 times, so this is a speed of 12 rotor rotations per second:

```
12 rot/s × 0.12 V = 1.44 V
```

**`kG = 0.18` — what holding the carriage costs.** This one's a torque, so it needs
all three steps:

```
weight       5 kg × 9.81 m/s²          = 49.1 N
torque       49.1 N × 0.0254 m (drum r) = 1.25 N·m at the drum
at the rotor 1.25 ÷ 12                  = 0.104 N·m
volts        0.104 N·m × 1.69           = 0.18 V
```

**`kA = 0.003` — what speeding the carriage up costs.** Also a torque, and the same
walk. One drum rotation per second squared works out to `2π × 0.0254 = 0.16 m/s²` of
carriage acceleration:

```
force        5 kg × 0.16 m/s²           = 0.80 N
torque       0.80 N × 0.0254 m          = 0.0203 N·m at the drum
at the rotor 0.0203 ÷ 12                = 0.0017 N·m
volts        0.0017 N·m × 1.69          = 0.003 V
```

Three thousandths of a volt, which tells you something real: a 1-inch drum behind a
12:1 gearbox makes 5 kg feel almost weightless to the motor. Being right about a small
number is free, so keep it.

Want a check that the method works? Run the `kV` step on the **drivetrain**: a 6.75:1
gear ratio gives `6.75 × 0.12 = 0.81`, and `kDriveKV` has been `0.8` since Lesson 12.
Same rule, same motor, a number you already trusted.

> These are honest starting values, not final ones. Real gearboxes lose some effort
> to friction, real cables stack up on the drum, and the mass in your CAD is always a
> little optimistic. Section 9 shows you how to read the true values off a graph.

You can also find `kG` without any arithmetic at all: raise the elevator, nudge the
voltage until it neither climbs nor sinks, and write that number down.

`GravityTypeValue.Elevator_Static` tells the firmware which *kind* of gravity `kG`
describes: a constant pull, the same at every height. (There's an `Arm_Cosine` for
things that swing, where the pull depends on angle. That's Lesson 20's problem.)

> **One more gain you'll meet on real hardware.** `kS` is the voltage it takes to
> break a mechanism loose from rest — friction that a simulation with frictionless
> bearings never shows you. It's zero here for exactly that reason, but on a real
> elevator it's the first thing to add when the carriage refuses to start moving on
> small commands.

**Create `src/main/java/frc/robot/subsystems/ElevatorIOTalonFX.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.MetersPerSecondPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import frc.robot.Constants.ElevatorConstants;

/** Real hardware behind the ElevatorIO contract: one TalonFX running Motion Magic. */
public class ElevatorIOTalonFX implements ElevatorIO {
    // protected, not private: ElevatorIOSim extends this class and needs the motor.
    protected final TalonFX m_motor;
    private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

    public ElevatorIOTalonFX(int motorId) {
        m_motor = new TalonFX(motorId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        // One "mechanism rotation" is now one drum rotation.
        config.Feedback.SensorToMechanismRatio = ElevatorConstants.kGearRatio;

        // The model first: hold, move, accelerate. Then the trim.
        config.Slot0.kG = ElevatorConstants.kElevatorKG;
        config.Slot0.GravityType = GravityTypeValue.Elevator_Static;
        config.Slot0.kV = ElevatorConstants.kElevatorKV;
        config.Slot0.kA = ElevatorConstants.kElevatorKA;
        config.Slot0.kP = ElevatorConstants.kElevatorKP;

        // The speed limit for the profile the firmware will generate.
        config.MotionMagic.MotionMagicCruiseVelocity =
                metersToRotations(ElevatorConstants.kMaxVelocity.in(MetersPerSecond));
        config.MotionMagic.MotionMagicAcceleration =
                metersToRotations(ElevatorConstants.kMaxAcceleration.in(MetersPerSecondPerSecond));

        m_motor.getConfigurator().apply(config);
    }

    /** Drum rotations for a height in meters — the elevator's version of wheel circumference. */
    protected static double metersToRotations(double meters) {
        return meters / ElevatorConstants.kDrumCircumferenceMeters;
    }

    protected static double rotationsToMeters(double rotations) {
        return rotations * ElevatorConstants.kDrumCircumferenceMeters;
    }

    @Override
    public void updateInputs(ElevatorIOInputs inputs) {
        inputs.heightMeters = rotationsToMeters(m_motor.getPosition().getValueAsDouble());
        inputs.velocityMetersPerSec = rotationsToMeters(m_motor.getVelocity().getValueAsDouble());
        inputs.appliedVolts = m_motor.getMotorVoltage().getValueAsDouble();
        // Where the profile says we should be *right now* — not the final goal.
        inputs.setpointMeters =
                rotationsToMeters(m_motor.getClosedLoopReference().getValueAsDouble());
    }

    @Override
    public void setGoalHeightMeters(double heightMeters) {
        m_motor.setControl(m_request.withPosition(metersToRotations(heightMeters)));
    }
}
```

`SensorToMechanismRatio = kGearRatio` is the same move Lesson 12 made for the drive
motors: tell the firmware the gearbox once, and every position it reports or accepts
is in *drum* rotations rather than rotor rotations. From there, drum rotations and
meters differ by one multiply, which is what the two conversion helpers do. They're
`protected` and `static` because `ElevatorIOSim` needs them in a moment.

Notice `metersToRotations` doing double duty in the config: a cruise velocity of one
meter per second is the same number as "one meter" once you divide by circumference,
because *per second* is on both sides. That's the kind of thing that's obvious after
you see it and easy to get backwards before.

---

## 5. `ElevatorIOSim`: a carriage that has weight

Same trick as Lesson 13: extend the real class so Phoenix's simulated firmware keeps
running the Motion Magic profile, and add a physics model underneath it. Only the
model changes — `DCMotorSim` knew about inertia, and `ElevatorSim` knows about mass
and gravity.

**Create `src/main/java/frc/robot/subsystems/ElevatorIOSim.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Kilograms;
import static edu.wpi.first.units.Units.Meters;

import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.ElevatorSim;
import frc.robot.Constants.ElevatorConstants;

/**
 * The sim implementation: the real TalonFX class (Phoenix simulates its own
 * firmware, so Motion Magic still runs), plus a physics model that knows the
 * carriage has mass and gravity is pulling on it.
 */
public class ElevatorIOSim extends ElevatorIOTalonFX {
    private final TalonFXSimState m_motorSim;
    private final ElevatorSim m_model = new ElevatorSim(
            DCMotor.getKrakenX60(1),
            ElevatorConstants.kGearRatio,
            ElevatorConstants.kCarriageMass.in(Kilograms),
            ElevatorConstants.kDrumRadius.in(Meters),
            ElevatorConstants.kMinHeight.in(Meters),
            ElevatorConstants.kMaxHeight.in(Meters),
            true, // simulate gravity — the whole point
            ElevatorConstants.kMinHeight.in(Meters));

    public ElevatorIOSim(int motorId) {
        super(motorId); // build the motor and apply the configs
        m_motorSim = m_motor.getSimState();
    }

    @Override
    public void updateInputs(ElevatorIOInputs inputs) {
        stepSim(); // advance the physics one tick...
        super.updateInputs(inputs); // ...then read the sensors like the real class
    }

    /** One tick of pretend reality: our voltage in, its motion back out. */
    private void stepSim() {
        m_motorSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_model.setInputVoltage(m_motorSim.getMotorVoltage());
        m_model.update(0.020);

        // The model speaks meters; the motor's sim state speaks rotor rotations.
        m_motorSim.setRawRotorPosition(
                metersToRotations(m_model.getPositionMeters()) * ElevatorConstants.kGearRatio);
        m_motorSim.setRotorVelocity(
                metersToRotations(m_model.getVelocityMetersPerSecond())
                        * ElevatorConstants.kGearRatio);
    }
}
```

That `true` is the argument worth pausing on. It's what makes the simulated carriage
sag when the voltage is wrong — which means if you mistype `kG`, sim will show you,
instead of everything looking fine until the first time you run it on a real robot
with a real 5 kg carriage over a real floor.

The two `* kGearRatio` multiplies are there because `setRawRotorPosition` means the
*rotor*, before the gearbox, while `SensorToMechanismRatio` made everything else
drum-side. Exactly the pattern `ModuleIOSim` used for the drive motors.

---

## 6. The `Elevator` subsystem

Now the part that decides what the elevator is allowed to do.

**Create `src/main/java/frc/robot/subsystems/Elevator.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.units.measure.Distance;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.ElevatorConstants;

/**
 * A scoring elevator on the same spine as the swerve modules: it owns an
 * ElevatorIO chosen by the current mode, a logged inputs bundle, and the
 * decision about where it is allowed to go.
 */
public class Elevator extends SubsystemBase {
    private final ElevatorIO m_io = switch (Constants.kCurrentMode) {
        case REAL -> new ElevatorIOTalonFX(ElevatorConstants.kMotorPort);
        case SIM -> new ElevatorIOSim(ElevatorConstants.kMotorPort);
        case REPLAY -> new ElevatorIO() {}; // inputs come from the log
    };
    private final ElevatorIOInputsAutoLogged m_inputs = new ElevatorIOInputsAutoLogged();

    private Distance m_goal = ElevatorConstants.kStowed;

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Elevator", m_inputs);
        Logger.recordOutput("Elevator/GoalMeters", m_goal.in(Meters));
        Logger.recordOutput("Elevator/AtGoal", atGoal());
    }

    /** Send the elevator to a height. Finishes on arrival; the firmware holds it there. */
    public Command goToHeight(Distance height) {
        return run(() -> {
            m_goal = clampToTravel(height);
            m_io.setGoalHeightMeters(m_goal.in(Meters));
        }).until(this::atGoal);
    }

    public boolean atGoal() {
        return Math.abs(m_inputs.heightMeters - m_goal.in(Meters))
                < ElevatorConstants.kTolerance.in(Meters);
    }

    /** A goal outside the elevator's travel is a bug, not a request. Pin it to the ends. */
    private static Distance clampToTravel(Distance height) {
        return Meters.of(MathUtil.clamp(
                height.in(Meters),
                ElevatorConstants.kMinHeight.in(Meters),
                ElevatorConstants.kMaxHeight.in(Meters)));
    }
}
```

Most of that you could have written from memory by now: the mode switch from
Lesson 13, the inputs bundle, `periodic()` sensing and logging while a command acts.
Two things are worth naming.

**`clampToTravel` clamps a goal, not an output.** Every clamp so far in this course
has been on a per-tick value — `MathUtil.clamp` on a turn speed in Lesson 8, on a
velocity in Lesson 11 — correcting the same thing fifty times a second. This one
runs on the *request*. Ask for 3 meters and you get 1.5, once, and everything
downstream is then working from a number that was never dangerous. Fixing a bad
input beats defending against it repeatedly.

**`goToHeight` finishes.** `.until(this::atGoal)` ends the command when the carriage
arrives, freeing the subsystem — and the elevator stays put anyway, because a Phoenix
control request persists until you send a different one. The firmware goes on holding
the profile's final position, `kG` and all, with your code no longer involved. That's
the same "let the firmware do it" bargain Lesson 12 made, now keeping a mechanism in
the air.

---

## 7. Wire it to the D-pad

**In `RobotContainer`, add the subsystem next to the others:**

```java
  private final Elevator m_elevator = new Elevator();
```

**And add the presets to `configureBindings`:**

```java
    // The D-pad drives the elevator: down stows it, right is the mid goal,
    // up is the high one. Each finishes on arrival and the firmware holds.
    m_driverController.povDown().onTrue(m_elevator.goToHeight(ElevatorConstants.kStowed));
    m_driverController.povRight().onTrue(m_elevator.goToHeight(ElevatorConstants.kScoreMid));
    m_driverController.povUp().onTrue(m_elevator.goToHeight(ElevatorConstants.kScoreHigh));
```

Each one slots into the group it belongs to — `ElevatorConstants` with the other
`Constants.` imports, `Elevator` with the other `subsystems.` ones.

**Add both imports:**

```java
import frc.robot.Constants.ElevatorConstants;
import frc.robot.subsystems.Elevator;
```

`povUp()` and friends are the D-pad's directions, and they're `Trigger`s exactly like
`a()` and `b()` have been since Lesson 1 — nothing new, just more buttons.

---

## 8. Run it

`./gradlew simulateJava`, **Teleoperated**, and press D-pad up.

Open AdvantageScope and put all three heights on one graph: `Elevator/GoalMeters`,
`Elevator/SetpointMeters`, and `Elevator/HeightMeters`.

The **goal** is a step — it jumps the instant you press the button. The **setpoint**
is not: it leaves the floor gently, slides upward at a steady rate, and eases onto the
goal. That's the profile, drawn. It's the whole difference between
`MotionMagicVoltage` and `PositionVoltage`, and it's the thing the elevator is
actually chasing — the goal is just where the plan is headed.

Add `Elevator/VelocityMetersPerSec` underneath and you can see the same plan from the
side: a ramp up to about a meter per second, a cruise, a ramp back down to zero. That
trapezoid is what the firmware invented for you out of two constants.

Now zoom in on the setpoint and the height together, because that pair is the score.
The height stays within about two or three centimeters of the setpoint through the
cruise, widens to four or five at the sharpest part of the acceleration ramp, and
converges to a fraction of a millimeter once the carriage settles. (That the gap is
worst while *speeding up* and best while *holding* is not a coincidence — section 9
turns it into a tuning signal.)

That gap is the *entire* job you left to `kP`, and it stays that small because `kV` is
already supplying the nine volts the cruise costs. Section 4's arithmetic said seven
centimeters of lag if that voltage had to be bought with error instead — Try It #2
lets you go watch it happen.

Then add `Elevator/AppliedVolts`, and watch what happens *after* it arrives. The
voltage doesn't return to zero. It settles at about `0.18` — `kG`, still holding, for
as long as the robot is enabled. Press D-pad down and watch it dip *below* zero on
the way to the floor: going down, gravity is helping, so the motor has to resist.

---

## 9. Reading the gains off a graph

The numbers section 4 computed are a good starting point. They are not your robot's
numbers, because your robot has friction, a cable that stacks unevenly on the drum,
and a carriage that weighs whatever it actually weighs rather than whatever CAD said.
So here's how to find the real ones — and the useful part is that **each gain has its
own signature on the plot**, so you can tune them one at a time instead of guessing at
four numbers at once.

Put `Elevator/SetpointMeters`, `Elevator/HeightMeters`, and `Elevator/AppliedVolts`
on one AdvantageScope graph and work down the list. Tune in model order: each gain
depends on the ones above it being right.

**`kG` first, because it's nearly free.** Send the elevator to a middle height and let
it sit there. Once it stops moving, read `AppliedVolts`. That number *is* your `kG` —
nothing is moving, so `kV` and `kA` are contributing zero and there's no error for
`kP` to act on. If the carriage slowly sinks, `kG` is too low; if it creeps upward,
too high.

**`kV` next, from the flat middle.** Command a long move and look at the cruise, where
the velocity trace is flat. There, `AppliedVolts ≈ kG + kV × velocity`. Read the volts,
read the velocity, subtract the `kG` you just found, divide by the velocity. On the
tracking traces: if `kV` is low, the height trace separates from the setpoint at the
start of the cruise and stays a constant distance behind it. If `kV` is high, the
height trace runs *ahead* of the setpoint.

**`kA` from the corners.** `kA` only does anything while the speed is *changing* — the
two ramps at either end of the trapezoid, not the flat part in between. So its
signature is a gap that opens during the ramps and closes once the cruise starts. On
this elevator `kA` is three thousandths of a volt and you will not see it; on a heavy
arm or a flywheel it matters much more.

**`kP` last, and keep it small.** With the model right, the height should already be
tracking the setpoint closely. Raise `kP` until the leftover gap closes, and back off
the moment the height trace starts oscillating around the setpoint instead of settling
onto it. If you find yourself reaching for a huge `kP`, that's the model asking for
attention — a big trim means something above it is wrong.

> **Tuning a real mechanism.** A wrong `kG` on a real elevator means the carriage
> drops the instant you enable, so set yourself up to be wrong safely: start the
> mechanism near the middle of its travel, keep `kMaxVelocity` and `kMaxAcceleration`
> well below their real values while you work on `kG` and `kV`, raise them only once
> tracking looks good, stand clear of everything the carriage can reach, and keep a
> hand on the disable button. Get it behaving in simulation first — that's most of
> what simulation is for.

---

## Try it

> **Do these in simulation** (`kSimMode = Mode.SIM`, which is where you already are).
> Several of them deliberately break the model to show you what a broken model looks
> like, and a real carriage answers a broken model by falling. In sim, being wrong is
> free — that's the point of having it.

1. **Add a third preset.** A `kScoreLow` between stowed and mid, on `povLeft()`.
   One constant, one binding — that's the whole cost of a new position now.
2. **Take the model away.** Set `kElevatorKV` to `0.0` and run it again, watching
   `Elevator/HeightMeters` against `Elevator/SetpointMeters`. The elevator still
   arrives — but the worst gap between the two traces roughly doubles, from four or
   five centimeters to about eleven. Section 4 predicted seven of those for the cruise
   voltage alone; the rest is the same trick paying for gravity and acceleration, since
   `kP` is now buying all of it with error. This is the difference between controlling
   a mechanism you understand and reacting to one you don't. Put it back.
3. **Take gravity out of the model.** Set `kElevatorKG` to `0.0` instead. The
   elevator still gets there, but watch the height trace sag below the goal and sit
   there, and watch it behave differently going up than coming down. Gravity is
   asymmetric and a purely reactive controller can't be. Put it back too.
4. **Ask for something impossible.** Call `goToHeight(Meters.of(3.0))` from a
   binding. Confirm on the plot that `Elevator/GoalMeters` reads `1.5`, not `3.0` —
   the clamp caught it, and nothing downstream ever saw the bad number.
5. **Make it slower.** Halve `kMaxVelocity` and double `kMaxAcceleration`, and
   predict the velocity trace before you look at it. Which part of the trapezoid
   changes shape, and which part just gets longer?
6. **Replay it.** Record a run with a few preset presses, switch `kSimMode` to
   `Mode.REPLAY`, and confirm `Elevator/HeightMeters` comes back identical. The
   elevator got replay for free by being built on the same spine as everything else —
   nobody wrote a line of code for that.

---

## What you learned

The headline is how little there was to say. A whole new mechanism — its own
hardware, its own physics, its own control mode — landed in four small files, and
none of them needed a new architecture, because Lesson 13's already fit. `ElevatorIO`
is `ModuleIO` with different nouns. `ElevatorIOSim extends ElevatorIOTalonFX` for the
same reason `ModuleIOSim` did. The mode switch, the `@AutoLog` inputs, `periodic()`
sensing while commands act — all reused without discussion. That's the return the
Lesson 13 investment was always going to pay, and this is the lesson where you
collect it.

What was genuinely new is what an elevator is: a thing with **ends**, and a thing
**gravity acts on**. The ends turned into a clamp on the goal — validate the request
once, rather than defending against it every tick.

Gravity turned into `kG`, and `kG` turned out to have company. If you keep one idea
from this lesson, keep this one: **`kV`, `kA`, and `kG` are a description of the
machine, and `kP` is an apology for the parts of that description you got wrong.**
The first three are computed from a plan the firmware already has, so they arrive
before anything has gone wrong. `kP` can only act on error that already exists, which
means a controller leaning on it has to *let the mechanism fail first* — the seven
centimeters of lag in section 4 weren't a bug, they were `kP` buying voltage the only
way it can. Model what you can. Trim the rest.

That's not a new idea, either. Lesson 12 put `kV` on the drive motors and called it
the model. What changed here is only that an elevator's model needs more terms in it,
because an elevator has a mass to accelerate and a weight that never lets go.

Every one of those gains was a number you *computed* — two facts off a motor's spec
sheet, a gear ratio, and the mechanism's own dimensions. Tuning didn't mean turning
knobs until it looked right; it meant working out what the machine should need and
then checking the graph to see where reality disagreed. That's a habit worth keeping
for every mechanism you build, and section 9's tuning order — `kG`, `kV`, `kA`, `kP`,
one at a time, each with its own signature on the plot — works on all of them.

And `MotionMagicVoltage` changed what a "setpoint" means. You no longer hand the
motor a destination and brace for how violently it gets there; you hand it a
destination and a speed limit, and the firmware works out a sane trip — then hands
that trip's velocity and acceleration to the model, tick by tick, so the whole thing
is one connected system rather than a target and a hope.

Next up, the same elevator gets something it's been missing: a picture. Numbers on a
graph tell you the height is 0.75 m, but they don't show you a robot.

Next: [Lesson 19 — Mechanism2d: watching the elevator move](19-mechanism2d.md).
