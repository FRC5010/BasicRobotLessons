# Lesson 29 — A wheel that holds a speed

**Goal:** Build the fourth mechanism on the same spine — and the first whose goal
is a *speed* instead of a place, which changes more than it sounds like it should.

**New Java concepts**
- None. You have written this spine three times; this one should feel fast, and
  if it does, that's the point of having a spine.

**New robot concepts**
- **`VelocityVoltage`** — a goal that is a rate
- **A model with the terms the physics has**, not a fixed set. No `kG` here.
- **`kS`**, finally discussed honestly
- **Recovery time, not error**, as the number that matters
- Why a shooter idles between shots
- **A gauge for a mechanism with nothing to draw** — a `Mechanism2d` speedometer

---

## 1. A goal that is a speed

Every mechanism so far has been asked to *go somewhere*. The elevator goes to a
height, the arm to an angle, the drivetrain to a pose. They all finish, they all
have a notion of "arrived", and Lesson 26 spent a whole lesson on what that word
should mean.

A shooter wheel has none of that. You don't want it anywhere; you want it spinning
at 3600 rpm and *staying there*. There's no destination, no profile to follow, no
tolerance on position because there is no position.

That difference shows up immediately in the code. Watch what happens to the shape
of a command:

*Nothing to add — this is the elevator command you already have:*

```java
    public Command goToHeight(Distance height) {
        return run(() -> {
            m_goal = clampToTravel(height);
            m_io.setGoalHeightMeters(m_goal.in(Meters));
        }).until(this::atGoal);
    }
```

That `.until(this::atGoal)` works because a Phoenix control request persists after
the command ends — the elevator keeps holding its height with nobody asking. A
flywheel command that ended on reaching speed would be a disaster: the request
would persist, sure, but the *command* ending means the subsystem falls back to
its default command, and in the half-second while you're deciding to shoot, the
wheel is doing whatever that says.

So a flywheel command doesn't finish. It holds, until something else takes over.

---

## 2. The spine, for the fourth time

You know this part. Interface, `@AutoLog` inputs, a real implementation, a sim
implementation that extends it, a subsystem with a mode switch. Fourth time.

**Create `FlywheelIO.java` in `frc/robot/subsystems/`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

/**
 * The contract between the flywheel's logic and its hardware. Same shape as the
 * elevator's and the arm's — the only difference is that every value here is a
 * speed rather than a place.
 */
public interface FlywheelIO {
    @AutoLog
    public static class FlywheelIOInputs {
        public double velocityRps = 0.0;
        public double appliedVolts = 0.0;
        public double setpointRps = 0.0;
        public double statorCurrentAmps = 0.0;
    }

    /** Read every sensor into 'inputs'. Called once per tick, before anything else. */
    public default void updateInputs(FlywheelIOInputs inputs) {}

    /** Hand the firmware a speed to reach and then hold. */
    public default void setGoalRps(double rps) {}

    /** Let it coast. Not a goal of zero — a goal of nothing. */
    public default void stop() {}
}
```

Four inputs and no position among them. `setpointRps` is the same idea as the
elevator's `setpointMeters` — where the firmware currently thinks it should be, so
you can plot the thing the controller is actually chasing.

`stop()` earns its place. A goal of zero rot/s means "actively brake to a stop",
which wastes energy and heat; a neutral output means "stop trying". Those are
different requests and a shooter wants the second one.

**Create `FlywheelIOTalonFX.java`:**

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.NeutralOut;
import com.ctre.phoenix6.controls.VelocityVoltage;
import com.ctre.phoenix6.hardware.TalonFX;

import frc.robot.Constants.FlywheelConstants;

/** Real hardware behind the FlywheelIO contract: one TalonFX holding a speed. */
public class FlywheelIOTalonFX implements FlywheelIO {
    // protected, not private: FlywheelIOSim extends this class and needs the motor.
    protected final TalonFX m_motor;
    private final VelocityVoltage m_request = new VelocityVoltage(0);
    private final NeutralOut m_neutral = new NeutralOut();

    public FlywheelIOTalonFX(int motorId) {
        m_motor = new TalonFX(motorId);

        TalonFXConfiguration config = new TalonFXConfiguration();
        config.Feedback.SensorToMechanismRatio = FlywheelConstants.kGearRatio;

        // The model: friction, speed, acceleration. No kG — a wheel spinning on
        // its axis is not being held up against anything.
        config.Slot0.kS = FlywheelConstants.kFlywheelKS;
        config.Slot0.kV = FlywheelConstants.kFlywheelKV;
        config.Slot0.kA = FlywheelConstants.kFlywheelKA;
        config.Slot0.kP = FlywheelConstants.kFlywheelKP;

        m_motor.getConfigurator().apply(config);
    }

    @Override
    public void updateInputs(FlywheelIOInputs inputs) {
        inputs.velocityRps = m_motor.getVelocity().getValueAsDouble();
        inputs.appliedVolts = m_motor.getMotorVoltage().getValueAsDouble();
        inputs.setpointRps = m_motor.getClosedLoopReference().getValueAsDouble();
        inputs.statorCurrentAmps = m_motor.getStatorCurrent().getValueAsDouble();
    }

    @Override
    public void setGoalRps(double rps) {
        m_motor.setControl(m_request.withVelocity(rps));
    }

    @Override
    public void stop() {
        m_motor.setControl(m_neutral);
    }
}
```

**`VelocityVoltage` replaces `MotionMagicVoltage`, and notice what's missing: any
Motion Magic configuration at all.** The elevator needed a cruise velocity and an
acceleration because it had to plan a trip. A flywheel is already being told a
velocity — there's nothing left to profile. The firmware just drives at it.

**Create `FlywheelIOSim.java`:**

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.FlywheelSim;
import frc.robot.Constants.FlywheelConstants;

/**
 * The sim implementation: the real TalonFX class again, so Phoenix keeps running
 * the velocity loop in its simulated firmware, plus a physics model that knows
 * the wheel has inertia.
 *
 * <p>FlywheelSim wants a LinearSystem rather than a list of dimensions, because a
 * spinning wheel is the simplest mechanism in this course: one state, one input.
 */
public class FlywheelIOSim extends FlywheelIOTalonFX {
    private final TalonFXSimState m_motorSim;
    private final FlywheelSim m_model = new FlywheelSim(
            LinearSystemId.createFlywheelSystem(
                    DCMotor.getKrakenX60(1),
                    FlywheelConstants.kMomentOfInertia,
                    FlywheelConstants.kGearRatio),
            DCMotor.getKrakenX60(1));

    public FlywheelIOSim(int motorId) {
        super(motorId); // build the motor and apply the configs
        m_motorSim = m_motor.getSimState();
    }

    @Override
    public void updateInputs(FlywheelIOInputs inputs) {
        stepSim();
        super.updateInputs(inputs);
    }

    /** One tick of pretend reality: our voltage in, its motion back out. */
    private void stepSim() {
        m_motorSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_model.setInputVoltage(m_motorSim.getMotorVoltage());
        m_model.update(0.020);

        // A flywheel has no position worth tracking, only a speed — so unlike the
        // elevator and the arm, only the velocity gets fed back.
        m_motorSim.setRotorVelocity(
                m_model.getAngularVelocityRPM() / 60.0 * FlywheelConstants.kGearRatio);
    }
}
```

`ElevatorSim` and `SingleJointedArmSim` took a list of physical dimensions and
built their own model. `FlywheelSim` asks you for the model directly, via
`LinearSystemId.createFlywheelSystem` — not because it's harder, but because it's
so simple there's nothing to infer. One number describes the whole mechanism: how
hard it is to spin up.

---

## 3. The model has the terms the physics has

Now the constants, and the reason this lesson exists in an arc about control.

**Add to `Constants.java`, as a new nested class above `ArmConstants`:**

```java
  public static class FlywheelConstants {
    public static final int kMotorPort = 23; // CAN ID — change to yours

    // Direct drive: the wheel is on the motor shaft. The first mechanism in this
    // course with no gearbox at all, which makes the arithmetic short.
    public static final double kGearRatio = 1.0;
    /** Wheel, hub and shaft together, from CAD. This is the number that matters. */
    public static final double kMomentOfInertia = 0.01; // kg m^2

    // Speeds, not places. Idling between shots is not laziness — it is what makes
    // the wheel ready again quickly, and this lesson measures exactly how much.
    public static final AngularVelocity kShootSpeed = RotationsPerSecond.of(60);
    public static final AngularVelocity kIdleSpeed = RotationsPerSecond.of(30);
    public static final AngularVelocity kTolerance = RotationsPerSecond.of(1.5);

    // The speedometer. Full scale is the motor's free speed, so the needle can
    // never run off the end of the dial.
    public static final AngularVelocity kFreeSpeed = RotationsPerSecond.of(100);
    public static final Distance kDialSize = Meters.of(2.0);
    public static final Distance kNeedleLength = Meters.of(0.8);
    /** Where the needle sits at rest: straight down. */
    public static final Angle kZeroAngle = Degrees.of(-90);
    /** How far it swings from rest to full scale: down, round, and up. */
    public static final Angle kFullSweep = Degrees.of(180);

    // The model: what this wheel costs to break free, to spin, and to speed up.
    // No kG — nothing here is being held up against gravity.
    public static final double kFlywheelKS = 0.15; // volts to overcome friction
    public static final double kFlywheelKV = 0.12; // volts per rotation/sec
    public static final double kFlywheelKA = 0.106; // volts per rotation/sec^2
    // The trim: whatever the model got wrong.
    public static final double kFlywheelKP = 0.3; // volts per rotation/sec of error
  }
```

**The missing `kG` is the point.** Lesson 18 gave the elevator `kG`, `kV`, `kA` and
`kP`, and Lesson 20 gave the arm the same four with `kG` reshaped by a cosine. It
would be easy to read that as "mechanisms get four gains". They don't. **A model
has a term for each thing the physics does**, and a wheel spinning on its own axis
is not fighting gravity in any orientation. Writing `kG = 0.05` here because the
other two had one would be inventing a force.

The two that remain come out of Lesson 18's arithmetic unchanged. A Kraken X60
free-spins at 6000 rpm on 12 V — that's 100 rotations per second, so **0.12 V per
rotation per second**, and with no gearbox the wheel *is* the rotor:

```
kV = 0.12 V per rot/s        →  holding 60 rot/s costs 0.12 × 60 = 7.2 V
```

Seven and a bit volts out of twelve, just to stay spinning. That leaves about 4.8 V
of headroom for accelerating, which is why the wheel takes a moment to come up.

`kA` is the torque side of the same recipe. Speeding a wheel up by 1 rot/s² needs
`J × 2π` newton-metres, and the Kraken stalls at 7.09 N·m on 12 V, so **1.69 V per
N·m**:

```
kA = 0.01 × 2π × 1.69 = 0.106 V per rot/s²
```

Both numbers came from the motor's spec sheet and one number off the CAD. Neither
was guessed, and section 6 checks them against what the wheel actually does.

---

## 4. The subsystem

**Create `Flywheel.java` in `frc/robot/subsystems/`, starting with:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.ElevatorConstants;
import frc.robot.Constants.FlywheelConstants;
```

Three of those imports are for the picture in section 5 — the compiler won't mind
them sitting unused until then.

**Then the class, its IO and its goal:**

```java
/**
 * A shooter wheel: the fourth mechanism on the same spine, and the first whose
 * goal is a speed rather than a place.
 */
public class Flywheel extends SubsystemBase {
    private final FlywheelIO m_io = switch (Constants.kCurrentMode) {
        case REAL -> new FlywheelIOTalonFX(FlywheelConstants.kMotorPort);
        case SIM -> new FlywheelIOSim(FlywheelConstants.kMotorPort);
        case REPLAY -> new FlywheelIO() {}; // inputs come from the log
    };
    private final FlywheelIOInputsAutoLogged m_inputs = new FlywheelIOInputsAutoLogged();

    private AngularVelocity m_goal = RotationsPerSecond.of(0);
```

**Then `periodic`, and the commands:**

```java
    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("Flywheel", m_inputs);
        Logger.recordOutput("Flywheel/GoalRps", m_goal.in(RotationsPerSecond));
        Logger.recordOutput("Flywheel/AtSpeed", atSpeed());
        updateDial();
    }


```

`updateDial()` doesn't exist yet — that's section 5. Everything else here is the
same shape as the elevator's subsystem, with speeds where the heights were.

**Wire it up. Add the field to `RobotContainer`, above `m_superstructure`:**

```java
  private final Flywheel m_flywheel = new Flywheel();
```

**Add the default command in `configureBindings`, above the left-trigger aim:**

```java
    // The wheel idles whenever nothing else asks for it, so a shot never starts
    // from a dead stop.
    m_flywheel.setDefaultCommand(m_flywheel.idle());
```

**And add spin-up to the aiming trigger, right below the aim binding:**

```java
    // Same trigger, different subsystem: lining up and spinning up are the same
    // decision, so they happen together.
    m_driverController.leftTrigger().whileTrue(
        m_flywheel.spinUp(FlywheelConstants.kShootSpeed));
```

**Add the imports:**

```java
import frc.robot.Constants.FlywheelConstants;
import frc.robot.subsystems.Flywheel;
```

Two commands on one trigger is legal and deliberate — they need different
subsystems, which is Lesson 24's rule pointing the other way for once. Aiming and
spinning up are the same decision from the driver's side, so they share a button.

---

## 5. A picture of a number

Lesson 19 drew the elevator, and Lesson 20 hung the arm off it, because both of
those move through space and a stick figure shows you where they are. A flywheel
defeats that entirely: it looks exactly the same at 0 rot/s and at 60. There is
nothing to draw.

Which is a shame, because the flywheel is the mechanism whose behaviour you most
want to *watch*. Spin-up, overshoot, the dip after a shot — those are all shapes
in time, and a graph shows them beautifully but tells you nothing at a glance
while you're driving.

So draw the number instead: a speedometer. A needle that hangs straight down at
rest and swings all the way round to straight up at full speed — positive speeds
sweeping through the left half of the dial, negative through the right.

**Add to `Flywheel`, below `m_goal`:**

```java
    // A speedometer: one hub, two needles. There is nothing physical to draw
    // here — a spinning wheel looks the same at every speed — so the picture is
    // of the number instead.
    private final LoggedMechanism2d m_dial = new LoggedMechanism2d(
            FlywheelConstants.kDialSize.in(Meters), FlywheelConstants.kDialSize.in(Meters));
    private final LoggedMechanismRoot2d m_hub = m_dial.getRoot(
            "Hub",
            FlywheelConstants.kDialSize.in(Meters) / 2,
            FlywheelConstants.kDialSize.in(Meters) / 2);
    /** Where the wheel is asked to be. The gap to the other needle is the error. */
    private final LoggedMechanismLigament2d m_goalNeedle = m_hub.append(
            new LoggedMechanismLigament2d(
                    "Goal", FlywheelConstants.kNeedleLength, FlywheelConstants.kZeroAngle));
    /** Where the wheel actually is. */
    private final LoggedMechanismLigament2d m_needle = m_hub.append(
            new LoggedMechanismLigament2d(
                    "Speed", FlywheelConstants.kNeedleLength, FlywheelConstants.kZeroAngle));
```

Two needles from one hub, and the second one is the useful bit. `m_needle` shows
where the wheel *is*; `m_goalNeedle` shows where it was *asked* to be. **The gap
between them is the error, drawn to scale.** Watch them converge during spin-up
and you are watching the controller work.

The canvas is square and the hub sits in the middle of it — unlike the elevator's
canvas, this one isn't a picture of the robot, so its "metres" are just units on a
dial. `getRoot` takes plain doubles (the same unpack Lesson 19 called out), while
the ligament constructors take measures.

**Add the method `periodic` is already calling, below it:**

```java
    /** Point both needles and publish the dial. Runs every tick, like any drawing. */
    private void updateDial() {
        m_goalNeedle.setAngle(toDialAngle(m_goal.in(RotationsPerSecond)));
        m_needle.setAngle(toDialAngle(m_inputs.velocityRps));
        m_needle.setColor(
                atSpeed() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
        Logger.recordOutput("Flywheel/Dial", m_dial);
    }

    /**
     * Where a needle points for a given speed: straight down at rest, straight up
     * at full scale, sweeping round the left half for positive speeds and the
     * right half for negative ones.
     *
     * <p>Clamped, so a wheel driven past its own free speed pins the needle at the
     * top instead of wrapping back round and lying about it.
     */
    private static Angle toDialAngle(double rps) {
        double fraction = MathUtil.clamp(
                rps / FlywheelConstants.kFreeSpeed.in(RotationsPerSecond), -1.0, 1.0);
        return FlywheelConstants.kZeroAngle.minus(FlywheelConstants.kFullSweep.times(fraction));
    }
```

`recordOutput` runs every tick because it serialises the drawing's current state —
exactly as Lesson 19 established. The colour is the same trick the elevator and arm
use, reusing their constants: orange while it's working, green once `atSpeed()`.

**And the arithmetic, at the bottom of the class:**

```java
    /**
     * Where a needle points for a given speed: straight down at rest, straight up
     * at full scale, sweeping round the left half for positive speeds and the
     * right half for negative ones.
     *
     * <p>Clamped, so a wheel driven past its own free speed pins the needle at the
     * top instead of wrapping back round and lying about it.
     */
    private static Angle toDialAngle(double rps) {
        double fraction = MathUtil.clamp(
                rps / FlywheelConstants.kFreeSpeed.in(RotationsPerSecond), -1.0, 1.0);
        return FlywheelConstants.kZeroAngle.minus(FlywheelConstants.kFullSweep.times(fraction));
    }

    /**
     * Hold a speed. Unlike the elevator's goToHeight this does not finish on
     * arrival — a flywheel that reached its speed and stopped trying would
     * immediately slow down again.
     */
    public Command spinUp(AngularVelocity speed) {
        return run(() -> {
            m_goal = speed;
            m_io.setGoalRps(speed.in(RotationsPerSecond));
        });
    }

    /** Sit at the idle speed, so the next shot doesn't start from nothing. */
    public Command idle() {
        return spinUp(FlywheelConstants.kIdleSpeed);
    }

    /** Let it coast down. */
    public Command stop() {
        return runOnce(() -> {
            m_goal = RotationsPerSecond.of(0);
            m_io.stop();
        });
    }

    /**
     * Fast enough to shoot. Note what this does NOT ask: whether the wheel has
     * settled, or which way the error is going — just whether it is close.
     */
    public boolean atSpeed() {
        return Math.abs(m_inputs.velocityRps - m_goal.in(RotationsPerSecond))
                < FlywheelConstants.kTolerance.in(RotationsPerSecond);
    }

    public AngularVelocity getSpeed() {
        return RotationsPerSecond.of(m_inputs.velocityRps);
    }
}
```

That one expression is the whole dial:

```
angle = -90°  -  180° x (speed / free speed)
```

At zero the needle sits at −90°, straight down. Feed in full speed and it reaches
−270°, which is the same direction as +90° — straight up. Halfway there it passes
−180°, straight left. Negative speeds run the subtraction the other way, so −50%
lands on 0° and points straight right. Positive on the left, negative on the
right, exactly as intended, out of one minus sign.

The clamp matters more than it looks. Without it, a wheel commanded past its free
speed would carry the needle round past vertical and back down the right-hand
side, where it would sit looking like a modest negative speed. **A gauge that
wraps is worse than no gauge**, because it doesn't look broken.

Shooting speed lands at 60% of full scale, so the needle sits in the upper-left
when the wheel is ready — a glance-able position you'll come to recognise.

---

## 6. What `kV` is actually worth

Here's the experiment Lesson 18 ran on the elevator, on a mechanism where the
answer is much starker.

Set `kFlywheelKV` and `kFlywheelKA` to zero, leaving only `kP`, and ask for 60
rot/s. Wait five seconds — as long as you like, really. It settles at **42.9
rot/s** and stays there. Twenty-nine percent low, forever.

And you can predict that number before running it. With only a P term, the wheel
stops gaining speed when the correction exactly equals the voltage needed to
sustain the speed it's at:

```
kP × (goal − ω)  =  kV × ω
0.3 × (60 − ω)   =  0.12 × ω
18               =  0.42 × ω
ω                =  42.86 rot/s
```

Measured: 42.90. That is not "close" — it is the same arithmetic, run twice.

Notice this is a *fixed point*, not a lag. The elevator's missing `kV` produced a
gap that trailed the setpoint while moving and closed when it stopped. Here there
is no stopping: the error is where the wheel lives, permanently, and no amount of
patience recovers it.

With the model in place, the same request settles at **60.44 rot/s** — comfortably
inside the 1.5 rot/s tolerance.

> **The third time this course has said it, and the clearest.** A P term corrects;
> it does not sustain. If holding station requires continuous output, calculate
> that output and hand it over. `kG` for gravity in Lesson 18, a bearing rate in
> Lesson 28, `kV` for speed here.

---

## 7. Recovery is the number that matters

Now the thing that separates a shooter that works from one that scores.

Nobody cares whether the wheel is at 60.4 rot/s or 59.8. Balls tolerate that.
What ruins a cycle is the *time between shots* — every shot drags the wheel down,
and until it's back you can't fire again. **The figure of merit is recovery time,
not error.**

You have one big lever on it, and it isn't a gain. It's where the wheel sits while
it's waiting.

| Idle speed | Time to reach shooting speed |
|---|---|
| 0 rot/s (stopped) | 2.32 s |
| 15 rot/s | 1.76 s |
| 30 rot/s | 1.24 s |
| 45 rot/s | 0.70 s |

Idling at half the shooting speed cuts the wait roughly in half, and that's why
`idle()` is the flywheel's default command rather than `stop()`. In a two-minute
match with a dozen shots, the difference between idling and not is more than ten
seconds of standing around.

It isn't free — the wheel draws current the whole match and gets warm, and Lesson
30 is about what happens when everything on the robot wants current at once. But
this is the trade real teams make, and now you can see both sides of it.

---

## 8. `kS`, honestly

`kS` is the volts needed to get a mechanism moving at all: bearing stiction, belt
drag, the shaft seal. Every previous lesson in this course set it to zero and moved
on. This is the lesson where it's worth explaining why.

It's still zero, in effect. **The simulation has no friction.** Apply 0.05 V — far
below what would break any real wheel free — and the simulated flywheel obediently
creeps up to 0.37 rot/s. A real one wouldn't have twitched.

So `kFlywheelKS = 0.15` is in the constants because it's the honest value for
hardware, and it will do exactly nothing while you're running in sim. That's worth
knowing before you spend an evening tuning a gain that cannot possibly matter yet.

The way you find it on a real robot is direct: command a slowly rising voltage and
note where the wheel first moves. That number is `kS`. It's the one gain in this
course that you genuinely cannot compute from a spec sheet, because it's a property
of your particular assembly — how tight the bearings were pressed, how much the
belt is tensioned.

> Every model in this course is a claim about the physics. `kS` is a claim about
> *your* robot, which is why it's measured rather than derived — and why it changes
> when the mechanism is rebuilt.

---

## 9. Run it

```powershell
./gradlew simulateJava
```

Enable teleop and watch `Flywheel/GoalRps` and `Flywheel/velocityRps` on the same
graph. The wheel should come up to 30 rot/s on its own and sit there — that's the
default command, running because nothing else asked.

Hold the left trigger. The goal jumps to 60, the wheel climbs, and
`Flywheel/AtSpeed` goes true about a second later. Let go and it drops back to
idle. Add `Flywheel/appliedVolts` to the graph and you'll see it pin near 12 V
during the climb and settle around 7.2 — which is `kV × 60`, exactly as computed
in section 3.

Worth doing deliberately:

- **Time it yourself.** Note how long `AtSpeed` takes to go true from idle, then
  change `kIdleSpeed` to `RotationsPerSecond.of(0)` and time it again. The table
  in section 6 should reproduce.
- **Zero out `kFlywheelKV`** and watch the wheel settle at 42.9 and refuse to
  climb further, no matter how long you wait. Put it back.
- **Watch `Flywheel/setpointRps`.** Unlike the elevator's, it snaps straight to the
  goal instead of ramping — there's no profile, because there's nothing to profile.
- **Open `Flywheel/Dial` in AdvantageScope's Mechanism tab** and hold the trigger.
  The goal needle jumps to the shooting mark and the speed needle chases it round
  the left of the dial, turning green as it arrives. Do it once with the graph and
  once with the dial, and notice they tell you different things: the graph shows
  you the shape over time, the dial shows you the state right now.

---

## Try it

1. **Halve the inertia.** Set `kMomentOfInertia` to 0.005 and recompute `kA` by
   hand before you run it. Predict the new spin-up time, then measure. Getting the
   prediction right is the exercise; the code change is trivial.
2. **Gate scoring on `atSpeed`.** Lesson 24's `requestScore` fires whenever the
   state machine allows it, regardless of whether the wheel is ready. Add the
   condition and decide where it belongs — in `canGoTo`, in `periodic`, or in the
   binding. Lesson 24 gave you a rule for choosing.
3. **Make `atSpeed` stricter.** It currently says yes the instant the wheel is
   within tolerance, including while it's still climbing fast through it. Require
   it to have been in tolerance for a few ticks — you have a `Debouncer` from
   Lesson 24 already.
4. **Spin up on the way in.** Lesson 25's `followPathAndStow` starts the arm
   stowing when the path has two metres left. Add the flywheel to that. The
   interesting part isn't the composition, it's deciding what makes a command that
   holds a speed ever *end* — think about it before you write it.
5. **Put a mark on the dial.** The gauge has two needles and no scale. Add a
   third, fixed ligament at the shooting-speed angle in a dim colour, so there's a
   permanent mark to aim at — and think about why that one gets set once in the
   field initialiser rather than every tick, when the other two don't.
6. **Find `kS` the real way.** On hardware, ramp the voltage up slowly and note
   where the wheel first turns. In sim, do the same thing and explain why the
   number you get is meaningless.

---

## What you learned

The fourth mechanism took a fraction of the effort of the first, which is the best
evidence the spine was worth building.

**A model has the terms the physics has.** `kG` was not omitted here to keep things
simple — it was omitted because nothing is holding a wheel up. Three mechanisms in,
the temptation is to treat four gains as a checklist; the habit worth keeping is
asking what each term is *paying for*, and only writing the ones that buy
something.

**A speed goal never finishes.** Position commands end because arriving is a real
event. Nothing analogous happens to a flywheel: reaching speed is not an
achievement it can keep without continuing to work for it. That one difference
changed the shape of every command in the subsystem.

**Recovery time, not error.** Being 0.4 rot/s off doesn't cost a match; taking two
and a half seconds to be ready for the next shot does. And the lever on it turned
out not to be a gain at all — it was deciding what the wheel does while it's
waiting, which is a design decision rather than a tuning one.

And the one that has now come up three times: **calculate what you must sustain,
and feed it forward.** Without `kV` the wheel parks at 42.9 rot/s and stays there
forever, because a P term can only produce output by keeping error alive. The
arithmetic predicted 42.86 before the test ran. When a model and a measurement
agree to two decimal places, you understand the mechanism — and that's a much
better position to be in than having found some gains that seemed to work.

That's the whole robot built: a drivetrain that knows where it is, mechanisms that
know where they are, cameras that find things, and now something to shoot with. Go
run a full cycle and enjoy it.

Then try running all of it at once — drive hard, raise the elevator, drop the
intake and spin the flywheel up together. Every one of those mechanisms was tuned
on its own, and every one of them draws from the same battery. The next lesson is
about what happens when they all ask at the same moment.

Next: [Lesson 30 — One battery, everything on it](30-current-limits.md).
