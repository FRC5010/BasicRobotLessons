# Lesson 20 — Intake arm: a mechanism that swings

**Goal:** Build an intake arm on the exact spine Lesson 18 built the elevator
on — `ArmIO` → `ArmIOTalonFX`/`ArmIOSim` → `Arm` — hang it off the elevator's
carriage so it rides up and down, and meet the one thing that genuinely changes
when a mechanism rotates instead of sliding: gravity that depends on where it is.

**New Java concepts**
- **Two motors in one subsystem, on purpose** — the opposite of Lesson 7's
  decision that `SwerveModule` should stop being a subsystem
- A subsystem constructor that takes **another subsystem** as an argument

**New robot concepts**
- **`GravityTypeValue.Arm_Cosine`** — the gravity term scaled by `cos θ`, so it
  is full effort held out sideways and *nothing* balanced over the pivot
- **Zero must be horizontal** — a physical constraint the firmware imposes on you
- **Soft limits** (`SoftwareLimitSwitchConfigs`) — travel limits enforced below
  your code, not by it
- **`SingleJointedArmSim`** — a rotating physics model, in `ElevatorSim`'s slot
- A **second, unprofiled motor**: the roller runs on plain percent output,
  because "spin while held" has no position goal to profile

---

## 1. You already know how to do most of this

Here is the plan for the lesson, and you can probably write most of it yourself:

> An `ArmIO` interface with `@AutoLog` inputs. An `ArmIOTalonFX` that talks to
> real hardware. An `ArmIOSim extends ArmIOTalonFX` that adds physics. An `Arm`
> subsystem that owns one of them, picked by `Constants.kCurrentMode`, and logs
> its inputs every tick.

That is Lesson 18 with the nouns swapped, which was Lesson 13 with the nouns
swapped. Lesson 18 already made the point that the second mechanism is cheap.
This is the third, and it's cheaper still — so this lesson spends its attention
on the two places the arm is not just an elevator that turned sideways.

The first is gravity. An elevator's fight with gravity is the same at every
height: 5 kg is 5 kg, whether the carriage is at the floor or the top. An arm's
is not. Hold your own arm straight out to the side and it gets heavy fast; hold
it straight up and it costs you almost nothing. Same arm, same gravity, totally
different effort — because what matters is the **lever arm**, and that changes
as you rotate.

The second is that this mechanism sits on top of another one. The arm bolts to
the elevator carriage, so its height is the elevator's business and only its
angle is its own. Lesson 19 built exactly that relationship in the drawing and
left a placeholder stub for it. This is where the stub becomes real.

---

## 2. Gravity that depends on where you are

Take the arm seriously for a moment, because the number you're about to write
into `Constants` comes straight out of this.

Gravity pulls straight down on the arm's center of mass with a force of `m × g`,
always, no matter what angle the arm is at. But a motor at the pivot doesn't
fight forces — it fights **torque**, and torque is force times the *horizontal*
distance out to where the force acts. Rotate the arm up and the center of mass
swings inward toward the pivot, so that distance shrinks. Rotate it all the way
up and the center of mass is directly over the pivot: horizontal distance zero,
torque zero, no effort at all to hold it.

That "horizontal distance out from the pivot" is `r × cos θ`, where `θ` is the
angle up from horizontal. So the torque gravity applies is:

```
torque = m × g × r × cos(θ)
```

`cos(0°) = 1` — the arm out sideways, maximum effort. `cos(90°) = 0` — the arm
straight up, no effort. And `cos(180°) = −1` — the arm out sideways *the other
way*, maximum effort again, but now the motor has to push the **other
direction** to hold it up.

Phoenix has that model built in. Where the elevator used
`GravityTypeValue.Elevator_Static` — a constant push, same at every height —
the arm uses `GravityTypeValue.Arm_Cosine`, and the firmware multiplies your
`kG` by `cos θ` every time it runs the loop.

> **This is the part that will bite you.** For the firmware to compute `cos θ`,
> it has to know what `θ` is — and it assumes the sensor reads **zero when the
> arm is horizontal**. That's not a convention you get to pick. Get the zero
> wrong by 90° and `kG` fights the arm instead of helping it, hardest exactly
> when the arm most needs the help. On a real robot this means calibrating the
> encoder against a horizontal arm, and it is worth doing carefully.

The good news: WPILib's arm simulator measures angles the same way — zero at
horizontal, positive counter-clockwise, the same convention as `Rotation2d` and
Lesson 19's ligaments. Everything in this lesson agrees on where zero is.

---

## 3. Describe the arm

**Add to `Constants.java`, as a new nested class:**

```java
  public static class ArmConstants {
    public static final int kPivotMotorPort = 21; // CAN ID — change to yours
    public static final int kRollerMotorPort = 22; // CAN ID — change to yours

    // Mechanism geometry. estimateMOI treats the arm as a uniform rod, so its
    // length and mass are all the physics model needs.
    public static final double kGearRatio = 50.0; // rotor : arm
    public static final Distance kArmLength = Inches.of(20);
    public static final Mass kArmMass = Kilograms.of(3.0);

    // How far it can swing. Zero is horizontal, and that is not a free choice.
    public static final Angle kMinAngle = Degrees.of(-20);
    public static final Angle kMaxAngle = Degrees.of(180);

    public static final AngularVelocity kMaxVelocity = DegreesPerSecond.of(180);
    public static final AngularAcceleration kMaxAcceleration =
        DegreesPerSecondPerSecond.of(360);

    public static final double kArmKP = 60.0; // volts per rotation of error
    public static final double kArmKG = 0.25; // volts to hold it out horizontal

    // Where the operator actually wants it.
    public static final Angle kIntake = Degrees.of(-20);
    public static final Angle kStowed = Degrees.of(90);

    public static final Angle kTolerance = Degrees.of(2);

    // The roller has no goal to profile — just a direction and a speed.
    public static final double kIntakeSpeed = 0.6; // fraction of full output
    public static final double kEjectSpeed = -0.6;
  }
```

**Add the two measure types this needs, next to the other `units.measure` imports:**

```java
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularAcceleration;
```

The travel range is **asymmetric**, and that's the normal case for an arm rather
than a quirk of this one: `−20°` reaches a little below horizontal so the intake
can get under a game piece on the floor, and `180°` folds it all the way back
over the robot. There's no reason for the two ends to be mirror images — they're
wherever the hardware stops.

`kArmKG = 0.25` is the voltage it takes to hold this arm out horizontal, and like
Lesson 18's `kG` it is a number you can *compute*, not guess: mass × g × half the
arm's length gives the torque at the pivot, divide by the gear ratio to get what
the motor sees, and convert through the motor's torque constant and winding
resistance to get volts. For a 3 kg, 20-inch arm through a 50:1 gearbox that
works out to about a quarter of a volt. Section 8 checks it against the plot.

---

## 4. `ArmIO`: two motors, one contract

The arm has a second motor the elevator didn't: a roller on the end that grabs
game pieces. It goes behind the same interface, because it is the same
mechanism — you would never want the pivot and the roller controlled by two
different pieces of code that don't know about each other.

**Create `src/main/java/frc/robot/subsystems/ArmIO.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between the arm's logic and its hardware. Two motors behind one
 * interface: a pivot that goes to angles, and a roller that just spins. Default
 * bodies do nothing, so the replay implementation is just `new ArmIO() {}`.
 */
public interface ArmIO {
    @AutoLog
    public static class ArmIOInputs {
        public double angleDegrees = 0.0;
        public double velocityDegPerSec = 0.0;
        public double appliedVolts = 0.0;
        public double rollerVelocityRotPerSec = 0.0;
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(ArmIOInputs inputs) {}

    /** Hand the firmware an angle to profile toward and then hold. */
    public default void setGoalAngleDegrees(double angleDegrees) {}

    /** Spin the roller at a fraction of full output. No goal, no profile. */
    public default void setRollerOutput(double output) {}
}
```

Nothing here should be a surprise — it's `ElevatorIO` with an angle instead of a
height, plus one extra read and one extra write for the roller.

The roller's write is the interesting one. `setRollerOutput(double output)` takes
a fraction from −1 to 1 and that's the whole story: no goal, no profile, no
feedforward. **Not every motor needs closed-loop control.** A roller has no
position it's trying to reach; it spins while you're holding the button and stops
when you let go, which is exactly what `m_driveMotor.set(0.5)` did back in
Lesson 1. Five lessons of increasingly sophisticated control, and sometimes the
right answer is still the first thing you learned.

---

## 5. `ArmIOTalonFX`: cosine gravity and firmware end stops

**Create `src/main/java/frc/robot/subsystems/ArmIOTalonFX.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;
import static edu.wpi.first.units.Units.DegreesPerSecond;
import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecondPerSecond;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.MotionMagicVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.GravityTypeValue;

import frc.robot.Constants.ArmConstants;

/** Real hardware behind the ArmIO contract: a profiled pivot and a dumb roller. */
public class ArmIOTalonFX implements ArmIO {
    // protected, not private: ArmIOSim extends this class and needs both motors.
    protected final TalonFX m_pivot;
    protected final TalonFX m_roller;
    private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);

    public ArmIOTalonFX(int pivotId, int rollerId) {
        m_pivot = new TalonFX(pivotId);
        m_roller = new TalonFX(rollerId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        // One "mechanism rotation" is now one full swing of the arm.
        config.Feedback.SensorToMechanismRatio = ArmConstants.kGearRatio;

        config.Slot0.kP = ArmConstants.kArmKP;
        config.Slot0.kG = ArmConstants.kArmKG;
        // Gravity's pull on the arm depends on where the arm is: full effort
        // held out horizontal, none at all balanced over the pivot.
        config.Slot0.GravityType = GravityTypeValue.Arm_Cosine;

        config.MotionMagic.MotionMagicCruiseVelocity =
                ArmConstants.kMaxVelocity.in(RotationsPerSecond);
        config.MotionMagic.MotionMagicAcceleration =
                ArmConstants.kMaxAcceleration.in(RotationsPerSecondPerSecond);

        // The firmware's own end stops. It refuses output past these no matter
        // what the rest of the code asks for.
        config.SoftwareLimitSwitch.ForwardSoftLimitEnable = true;
        config.SoftwareLimitSwitch.ForwardSoftLimitThreshold =
                ArmConstants.kMaxAngle.in(Rotations);
        config.SoftwareLimitSwitch.ReverseSoftLimitEnable = true;
        config.SoftwareLimitSwitch.ReverseSoftLimitThreshold =
                ArmConstants.kMinAngle.in(Rotations);

        m_pivot.getConfigurator().apply(config);
        m_roller.getConfigurator().apply(new TalonFXConfiguration());
    }

    @Override
    public void updateInputs(ArmIOInputs inputs) {
        inputs.angleDegrees = m_pivot.getPosition().getValue().in(Degrees);
        inputs.velocityDegPerSec = m_pivot.getVelocity().getValue().in(DegreesPerSecond);
        inputs.appliedVolts = m_pivot.getMotorVoltage().getValueAsDouble();
        inputs.rollerVelocityRotPerSec = m_roller.getVelocity().getValueAsDouble();
    }

    @Override
    public void setGoalAngleDegrees(double angleDegrees) {
        m_pivot.setControl(m_request.withPosition(Degrees.of(angleDegrees)));
    }

    @Override
    public void setRollerOutput(double output) {
        m_roller.set(output);
    }
}
```

Notice what **isn't** here: a pair of conversion helpers. The elevator needed
`metersToRotations` because a drum turns rotations into meters, and somebody has
to do that multiply. An arm's mechanism unit already *is* rotation, so once
`SensorToMechanismRatio` has made positions arm-side, going from degrees to
rotations is a unit conversion and nothing else —
`ArmConstants.kMaxVelocity.in(RotationsPerSecond)` and
`m_request.withPosition(Degrees.of(angleDegrees))` hand the whole job to the
Units library. The same is true reading back: `getPosition()` gives a Phoenix
`Angle`, and `.getValue().in(Degrees)` is the entire conversion.

**The soft limits are new, and they're a different kind of protection from the
clamp Lesson 18 wrote.** `clampToTravel` is *your code's* opinion about what
counts as a valid request, and it only helps if every request goes through it.
A soft limit lives underneath your code entirely: the motor controller compares
its own encoder against the threshold, and if a command would push past it, the
output goes to neutral — no matter which line of your program asked, or whether
you remembered to clamp. Both belong. The clamp keeps bad numbers out of your
logic; the soft limit keeps the mechanism off its hard stops when your logic is
wrong.

> Soft limits trust the encoder completely. If the arm's zero is wrong, the limits
> are wrong by exactly the same amount and they'll happily drive it into a stop.
> That's Lesson 21's problem.

---

## 6. `ArmIOSim`: an arm that swings

Same trick as always: extend the real class so Phoenix's simulated firmware keeps
running Motion Magic, and put physics underneath. The pivot gets
`SingleJointedArmSim`, in the slot `ElevatorSim` filled last lesson. The roller
gets a plain `DCMotorSim` — the model from Lesson 4, which is all a spinning
thing with some inertia needs.

**Create `src/main/java/frc/robot/subsystems/ArmIOSim.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Kilograms;
import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.Radians;
import static edu.wpi.first.units.Units.RadiansPerSecond;
import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import edu.wpi.first.wpilibj.simulation.SingleJointedArmSim;
import frc.robot.Constants.ArmConstants;

/**
 * The sim implementation: the real TalonFX class (Phoenix simulates its own
 * firmware, so Motion Magic still runs), plus physics for both motors — an arm
 * that gravity pulls on, and a roller that just has some inertia.
 */
public class ArmIOSim extends ArmIOTalonFX {
    private final TalonFXSimState m_pivotSim;
    private final TalonFXSimState m_rollerSim;

    private final SingleJointedArmSim m_model = new SingleJointedArmSim(
            DCMotor.getKrakenX60(1),
            ArmConstants.kGearRatio,
            SingleJointedArmSim.estimateMOI(
                    ArmConstants.kArmLength.in(Meters), ArmConstants.kArmMass.in(Kilograms)),
            ArmConstants.kArmLength.in(Meters),
            ArmConstants.kMinAngle.in(Radians),
            ArmConstants.kMaxAngle.in(Radians),
            true, // simulate gravity — the whole point
            ArmConstants.kMinAngle.in(Radians));

    private final DCMotorSim m_rollerModel = new DCMotorSim(
            LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.001, 1.0),
            DCMotor.getKrakenX60(1));

    public ArmIOSim(int pivotId, int rollerId) {
        super(pivotId, rollerId); // build both motors and apply the configs
        m_pivotSim = m_pivot.getSimState();
        m_rollerSim = m_roller.getSimState();
    }

    @Override
    public void updateInputs(ArmIOInputs inputs) {
        stepSim(); // advance the physics one tick...
        super.updateInputs(inputs); // ...then read the sensors like the real class
    }

    /** One tick of pretend reality: our voltage in, its motion back out. */
    private void stepSim() {
        m_pivotSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_model.setInputVoltage(m_pivotSim.getMotorVoltage());
        m_model.update(0.020);

        // The model speaks radians; the motor's sim state speaks rotor rotations.
        m_pivotSim.setRawRotorPosition(
                Radians.of(m_model.getAngleRads()).in(Rotations) * ArmConstants.kGearRatio);
        m_pivotSim.setRotorVelocity(
                RadiansPerSecond.of(m_model.getVelocityRadPerSec()).in(RotationsPerSecond)
                        * ArmConstants.kGearRatio);

        m_rollerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_rollerModel.setInputVoltage(m_rollerSim.getMotorVoltage());
        m_rollerModel.update(0.020);
        m_rollerSim.setRawRotorPosition(m_rollerModel.getAngularPositionRotations());
        m_rollerSim.setRotorVelocity(m_rollerModel.getAngularVelocityRPM() / 60.0);
    }
}
```

`estimateMOI(length, mass)` is WPILib doing you a favor. **Moment of inertia** is
rotation's version of mass — how hard a thing is to get spinning — and it depends
on how the mass is spread out, which normally means asking CAD. `estimateMOI`
assumes a uniform rod pivoting about one end, which is close enough for an arm
made of tube, and saves you from inventing a number you can't check.

The arm starts at `kMinAngle`, resting on its lower stop. That's what a real one
does: switch the robot off and the arm falls until something catches it.

---

## 7. The `Arm` subsystem

Two new things live here. The first is the same clamp-the-goal idea from
Lesson 18, in degrees. The second is the drawing — and this is where Lesson 19
gets paid back.

The arm's ligament doesn't belong to `Arm`'s own canvas, because the arm doesn't
have one. It belongs on **the elevator's carriage**, so that raising the elevator
carries the arm up with it for free. To append to the carriage, `Arm` needs a
reference to it.

**Add to `Elevator`, next to its other public methods:**

```java
    /** The mount point on top of the carriage. Anything appended here rides along. */
    public LoggedMechanismLigament2d getCarriage() {
        return m_carriage;
    }
```

**Delete the placeholder from `Elevator` — the arm takes its place:**

```java
    /** Rides on top of the carriage. Lesson 20 puts a real arm here. */
    private final LoggedMechanismLigament2d m_effector = m_carriage.append(
            new LoggedMechanismLigament2d(
                    "Effector", ElevatorConstants.kEffectorLength, Degrees.of(-90)));
```

**And delete its now-unused constant from `ElevatorConstants`:**

```java
    public static final Distance kEffectorLength = Centimeters.of(25);
```

One more small thing. `Arm` needs to know which way the carriage points to draw
itself correctly, so give that angle a name instead of leaving a bare `90` in
two files.

**Add to `ElevatorConstants`:**

```java
    public static final Angle kCarriageAngle = Degrees.of(90); // straight up
```

**And use it in `Elevator`'s carriage ligament, replacing the literal `Degrees.of(90)`:**

```java
    private final LoggedMechanismLigament2d m_carriage = m_base.append(
            new LoggedMechanismLigament2d(
                    "Carriage", Meters.of(0), ElevatorConstants.kCarriageAngle));
```

Now the subsystem itself.

**Create `src/main/java/frc/robot/subsystems/Arm.java`:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Degrees;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.ElevatorConstants;

/**
 * An intake arm on the same spine as the elevator: an ArmIO chosen by the
 * current mode, a logged inputs bundle, and the decision about where it is
 * allowed to swing. Two motors, one subsystem — they are one mechanism.
 */
public class Arm extends SubsystemBase {
    private final ArmIO m_io = switch (Constants.kCurrentMode) {
        case REAL -> new ArmIOTalonFX(ArmConstants.kPivotMotorPort, ArmConstants.kRollerMotorPort);
        case SIM -> new ArmIOSim(ArmConstants.kPivotMotorPort, ArmConstants.kRollerMotorPort);
        case REPLAY -> new ArmIO() {}; // inputs come from the log
    };
    private final ArmIOInputsAutoLogged m_inputs = new ArmIOInputsAutoLogged();

    private Angle m_goal = ArmConstants.kStowed;

    /** The arm's segment in the elevator's drawing — it hangs off the carriage. */
    private final LoggedMechanismLigament2d m_ligament;

    public Arm(Elevator elevator) {
        m_ligament = elevator.getCarriage().append(new LoggedMechanismLigament2d(
                "Arm", ArmConstants.kArmLength, toDrawingAngle(ArmConstants.kMinAngle)));
    }

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Arm", m_inputs);
        Logger.recordOutput("Arm/GoalDegrees", m_goal.in(Degrees));
        Logger.recordOutput("Arm/AtGoal", atGoal());

        m_ligament.setAngle(toDrawingAngle(Degrees.of(m_inputs.angleDegrees)));
        m_ligament.setColor(
                atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
    }

    /** Swing the arm to an angle. Finishes on arrival; the firmware holds it there. */
    public Command goToAngle(Angle angle) {
        return run(() -> {
            m_goal = clampToTravel(angle);
            m_io.setGoalAngleDegrees(m_goal.in(Degrees));
        }).until(this::atGoal);
    }

    /** Spin the roller while this command runs, and stop it when the command ends. */
    public Command runRoller(double output) {
        return run(() -> m_io.setRollerOutput(output))
                .finallyDo(() -> m_io.setRollerOutput(0.0));
    }

    public boolean atGoal() {
        return Math.abs(m_inputs.angleDegrees - m_goal.in(Degrees))
                < ArmConstants.kTolerance.in(Degrees);
    }

    /** An angle outside the arm's swing is a bug, not a request. Pin it to the ends. */
    private static Angle clampToTravel(Angle angle) {
        return Degrees.of(MathUtil.clamp(
                angle.in(Degrees),
                ArmConstants.kMinAngle.in(Degrees),
                ArmConstants.kMaxAngle.in(Degrees)));
    }

    /**
     * A ligament's angle is measured from its parent, and the carriage points
     * straight up — so a world angle becomes a drawing angle by subtracting it.
     */
    private static Angle toDrawingAngle(Angle armAngle) {
        return armAngle.minus(ElevatorConstants.kCarriageAngle);
    }
}
```

`toDrawingAngle` is Lesson 19's rule applied rather than explained: a child's
angle is measured from its parent, the carriage points straight up at 90°, so an
arm that is horizontal in the world is at −90° in the drawing. Get that
subtraction backwards and the picture will tell you immediately.

Notice how little `Arm` says about the elevator otherwise. It asks for the mount
point once, in the constructor, and then never mentions the elevator again — no
height, no "if the elevator is up," nothing. The arm's drawing tracks the
elevator because of one `append` call in one line.

**`runRoller` is the first command in this course that doesn't drive toward a
goal.** It has no `.until(...)`, because there is nothing to arrive at. Bound
with `whileTrue`, it runs while the button is held; `finallyDo` stops the motor
when it ends, however it ends — button released, command interrupted, or the
robot disabled. That last part matters: unlike the pivot, whose Phoenix control
request holds position on its own, a roller left spinning stays spinning until
someone tells it not to.

---

## 8. Wire it up

**In `RobotContainer`, add the arm below the elevator:**

```java
  private final Arm m_arm = new Arm(m_elevator); // hangs its drawing off the carriage
```

That line has to come *after* `m_elevator`, and now there's a hard reason rather
than a scheduling one: `new Arm(m_elevator)` reads the field, so the elevator
must already be built. Java runs field initializers top to bottom, so the order
you write them in is the order they happen — the same rule Lesson 14 relied on to
get `m_drivetrain` ticking before `m_localizer`.

**Add the bindings to `configureBindings`:**

```java
    // X drops the arm to the floor, Y tucks it back up. Hold a bumper to run
    // the roller — it stops on its own when you let go.
    m_driverController.x().onTrue(m_arm.goToAngle(ArmConstants.kIntake));
    m_driverController.y().onTrue(m_arm.goToAngle(ArmConstants.kStowed));
    m_driverController.rightBumper().whileTrue(m_arm.runRoller(ArmConstants.kIntakeSpeed));
    m_driverController.leftBumper().whileTrue(m_arm.runRoller(ArmConstants.kEjectSpeed));
```

**Add both imports:**

```java
import frc.robot.Constants.ArmConstants;
import frc.robot.subsystems.Arm;
```

---

## 9. Run it

`./gradlew simulateJava`, **Teleoperated**. Open AdvantageScope, put the
**Mechanism** tab on `/RealOutputs/Elevator/Mechanism`, and press **Y**.

The arm swings up to vertical. Now press **D-pad up** and watch the whole
assembly rise — arm still at its angle, riding the carriage, from code that
never once mentions the elevator's height. Press **X** and it drops back down to
the floor while staying up high. That is the scene graph from Lesson 19 doing
exactly what it promised.

Then go find the physics. Put `Arm/AngleDegrees` and `Arm/AppliedVolts` on one
graph, and hold each preset in turn. Here is what those two traces settle at,
measured in this simulation:

| Arm angle | Applied volts | `kG × cos θ` |
|---|---|---|
| 0° (horizontal) | +0.25 | +0.25 |
| 45° | +0.18 | +0.18 |
| 90° (vertical) | 0.00 | 0.00 |
| 135° | −0.18 | −0.18 |
| 180° (horizontal, other side) | −0.25 | −0.25 |

**Read that table twice.** The holding voltage isn't a constant like the
elevator's was — it's a cosine, exactly the curve section 2 derived. At vertical
it is *zero*: the arm is balanced over its own pivot and the motor is doing
nothing at all. And past vertical the sign **flips**, because holding the arm up
from the far side means pushing the other way. One constant and one enum bought
all of that.

It also tells you `kArmKG` is right. If the applied voltage matches `kG × cos θ`
at every angle, the feedforward is carrying the whole load and `kP` has nothing
left to correct — which is precisely what a good feedforward looks like.

Finally, hold **right bumper** and watch `Arm/RollerVelocityRotPerSec` climb to
around 60 rotations per second, then let go and watch it coast down to zero. No
profile, no goal, no gains — a motor and a number.

---

## Try it

1. **Add a third position.** A `kScore` angle around 35° on another button. One
   constant, one binding, same as the elevator.
2. **Ask for the impossible.** Bind `goToAngle(Degrees.of(270))` to a button and
   confirm on the plot that `Arm/GoalDegrees` reads `180`, not `270` — the clamp
   caught it before the firmware ever saw it.
3. **Then get past the clamp.** Call `m_io.setGoalAngleDegrees(270)` directly
   from inside `Arm`, skipping `clampToTravel` entirely, and watch the arm stop
   at 180° anyway. Two layers of protection, and you just proved the lower one
   works on its own.
4. **Break the zero.** Change `kArmKG` to a negative number and run it again.
   That's what a 180°-wrong encoder calibration does: the feedforward pulls the
   arm down exactly when it should be holding it up. Watch how much harder `kP`
   has to work, and put it back.
5. **Both at once.** Hold a bumper while the arm is still swinging. The roller
   command takes the subsystem and interrupts the pivot command — but the arm
   keeps going anyway, because the pivot command's last act was to hand Motion
   Magic a goal, and the firmware doesn't need a command alive to finish the job.
   Lesson 18's "a control request persists until replaced," now something you can
   see.
6. **Replay it.** Record a run, switch `kSimMode` to `Mode.REPLAY`, and confirm
   the arm's angle and the drawing both come back identical. Third mechanism,
   still free.

---

## What you learned

The arm cost four files and no new architecture, which by now should feel
routine rather than impressive. `ArmIO` is `ElevatorIO` is `ModuleIO`. The mode
switch, the `@AutoLog` inputs, the sim subclass extending the real class, the
goal clamped once instead of defended against forever — all of it reused without
a word of justification, because the justification was Lesson 13's and it's still
good. This is the third mechanism on that spine, and the sound you're listening
for is how quiet it was.

What was actually new was small and worth keeping. **Gravity on a rotating thing
depends on the angle**, and `Arm_Cosine` encodes that in one enum value — with a
string attached, since the firmware can only compute `cos θ` if you have promised
it that zero means horizontal. **Soft limits** sit below your code rather than
inside it, so they hold even when your logic doesn't. And **not every motor
wants a control loop**: the roller runs on the same plain `set(fraction)` call as
Lesson 1's very first motor, because "spin while I hold this" has no setpoint to
aim at.

The nicest part didn't need any code at all. Raising the elevator carries the arm
up with it, and nothing in `Arm` or `Elevator` computes that — the arm's ligament
is appended to the carriage, and attachment does the rest. Lesson 19 built that
relationship with a placeholder stub and claimed it would pay off here. That's
what a good abstraction feels like when it lands: the interesting behavior shows
up and there's nowhere to point at where it was written.

One thing both mechanisms are still missing, though: they only know where they
are because they assume they started at zero. Power the robot on with the arm
halfway up and every number in this lesson — the angle, the cosine, the soft
limits — is wrong by the same amount, confidently.

Next: [Lesson 21 — Limit sensors: knowing when you've arrived](21-limit-sensors.md).
