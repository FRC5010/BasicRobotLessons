# Lesson 18 — Scoring elevator: a second mechanism

**Goal:** Build a scoring elevator on the exact spine the swerve modules already
use — `ElevatorIO` → `ElevatorIOTalonFX`/`ElevatorIOSim` → `Elevator` — and let the
TalonFX profile its own motion while a feedforward term holds the carriage up.

**New Java concepts**
- Clamping a **goal** rather than a per-tick output — validating a request once,
  instead of correcting the result forever

**New robot concepts**
- A **linear mechanism with hard ends**, where a wheel had an endless circle
- **`MotionMagicVoltage`** — a control request that profiles the trip instead of
  jumping at the setpoint
- **`MotionMagicConfigs`** — cruise velocity and acceleration: how fast it's
  *allowed* to get there
- **`Slot0.kG` and `GravityTypeValue.Elevator_Static`** — the first mechanism that
  falls when you stop pushing
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

    public static final double kElevatorKP = 20.0; // volts per rotation of error
    public static final double kElevatorKG = 0.18; // volts just to hold station

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

The gains stay `double`s too, same as `kDriveKV` and `kSteerKP` — a gain is a ratio,
not a length.

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
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(ElevatorIOInputs inputs) {}

    /** Hand the firmware a height to profile toward and then hold. */
    public default void setGoalHeightMeters(double heightMeters) {}
}
```

`appliedVolts` is new to this course's inputs, and it earns its place here: on a
mechanism fighting gravity, the voltage the motor is actually using is the most
direct evidence of what the feedforward is doing. You'll plot it in section 8.

---

## 4. Motion Magic, and holding a thing up

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

**The second: gravity never takes a tick off.** Every mechanism so far stayed put
when you stopped commanding it. This one doesn't. Holding a carriage still isn't
"zero output" — it's whatever voltage exactly cancels its weight, forever.

That's `kG`, and it sits alongside `kP` in the same `Slot0` you met in Lesson 12:

> `kP` is a *reaction* — it only produces output once there's error, so a purely
> reactive elevator has to sag before it pushes back. `kG` is a *prediction*: the
> voltage we know in advance the carriage needs, applied whether or not anything
> has gone wrong yet. Same relationship as `kV` and `kP` on the drive motors in
> Lesson 12, with gravity in the model's place.

`GravityTypeValue.Elevator_Static` tells the firmware which kind of gravity: a
constant pull, the same at every height. (There's an `Arm_Cosine` for things that
swing, where the pull depends on angle. That's Lesson 20's problem.)

Where does `0.18` come from? Torque to hold the carriage is mass × gravity × drum
radius — 5 kg × 9.81 m/s² × 0.0254 m ≈ 1.25 N·m at the drum, so ≈ 0.10 N·m at the
rotor through the 12:1 gearbox, which a Kraken X60 produces at roughly 0.18 volts.
You can also just find it: raise the elevator, nudge the voltage until it neither
climbs nor sinks, and write that number down.

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

        config.Slot0.kP = ElevatorConstants.kElevatorKP;
        config.Slot0.kG = ElevatorConstants.kElevatorKG;
        config.Slot0.GravityType = GravityTypeValue.Elevator_Static;

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

Open AdvantageScope and put `Elevator/HeightMeters` and `Elevator/GoalMeters` on the
same graph. The goal is a step — it jumps the instant you press the button. The
height is not: it eases away from the floor, runs up at a steady rate, and settles
onto the goal without overshooting. That gap between the two traces is the profile,
and it's the whole difference between `MotionMagicVoltage` and `PositionVoltage`.

Add `Elevator/VelocityMetersPerSec` underneath and you can see the profile directly:
a ramp up to 1.0 m/s, a flat cruise, a ramp back down to zero. That trapezoid is what
the firmware invented for you out of two constants.

Then add `Elevator/AppliedVolts`, and watch what happens *after* it arrives. The
voltage doesn't return to zero. It settles at about `0.18` — `kG`, still holding, for
as long as the robot is enabled. Press D-pad down and watch it dip *below* zero on
the way to the floor: going down, gravity is helping, so the motor has to resist.

---

## Try it

1. **Add a third preset.** A `kScoreLow` between stowed and mid, on `povLeft()`.
   One constant, one binding — that's the whole cost of a new position now.
2. **Turn off the feedforward.** Set `kElevatorKG` to `0.0` and run it again. The
   elevator still gets there, because `kP` eventually notices the error — but watch
   the height trace sag below the goal and sit there, and watch it behave differently
   going up than coming down. Gravity is asymmetric and a purely reactive controller
   can't be. Put it back.
3. **Ask for something impossible.** Call `goToHeight(Meters.of(3.0))` from a
   binding. Confirm on the plot that `Elevator/GoalMeters` reads `1.5`, not `3.0` —
   the clamp caught it, and nothing downstream ever saw the bad number.
4. **Make it slower.** Halve `kMaxVelocity` and double `kMaxAcceleration`, and
   predict the velocity trace before you look at it. Which part of the trapezoid
   changes shape, and which part just gets longer?
5. **Replay it.** Record a run with a few preset presses, switch `kSimMode` to
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
once, rather than defending against it every tick. Gravity turned into `kG`, and with
it a distinction worth carrying into every mechanism you build after this: `kP`
reacts to error that has already happened, while a feedforward predicts the effort
the job is known to require. A well-chosen `kG` means the carriage simply stays where
you put it, and `kP` has almost nothing left to do.

And `MotionMagicVoltage` changed what a "setpoint" means. You no longer hand the
motor a destination and brace for how violently it gets there; you hand it a
destination and a speed limit, and the firmware works out a sane trip. Two numbers,
and the leap-and-slam problem simply doesn't arise.

Next up, the same elevator gets something it's been missing: a picture. Numbers on a
graph tell you the height is 0.75 m, but they don't show you a robot.

Next: [Lesson 19 — Mechanism2d: watching the elevator move](19-mechanism2d.md).
