# Lesson 30 — One battery, everything on it

**Goal:** Stop the robot browning out — and cause one on purpose first, so
you know what it looks like from the inside.

**New Java concepts**
- None.

**New robot concepts**
- **`CurrentLimitsConfigs`** — supply vs. stator limits, and why they
  answer different questions
- **The battery as a shared, finite resource** — the first time in this
  course that one subsystem's choices hurt another
- **Simulating the battery**, so a brownout is something you can watch
  instead of something you read about
- What a brownout actually does, and why it's so hard to diagnose

---

## 1. Everything at once

Every lesson so far has looked at one mechanism at a time. The elevator
lifts, the arm swings, the flywheel spins, the drivetrain drives — each of
them tuned, measured, and reasoned about on its own.

Now hold the left trigger while driving hard across the field. Lesson 28
bound it to the drivetrain, keeping the nose pointed at a tag. Lesson 29
bound the *same trigger* to the flywheel, spinning it to shooting speed.
Add the D-pad raising the elevator and the right bumper chasing a game
piece, and that's four mechanisms — twelve motors — all asking for
everything they can get, at the same instant.

There is one battery.

This is the first genuinely *systemic* thing in the course. Up to now, a
bug in the arm was a bug in the arm. From here, the elevator can make the
drivetrain misbehave — not by sharing any code with it, but by getting to
the electricity first.

And the symptom is horrible. A robot short of voltage doesn't fail
cleanly: the motors get weak, the roboRIO starts shedding load, the CAN
bus gets flaky, the camera drops out, and every subsystem misbehaves at
once. There is nothing in the log that says "brownout" unless you put it
there. It just looks like everything broke simultaneously, which is
exactly what makes people spend an evening suspecting their code.

---

## 2. Supply and stator are different questions

A motor controller sits between the battery and the motor, and there is a
different current on each side of it.

**Stator current** is what flows through the windings. It's what makes
torque and what makes heat, and it's the motor's problem.

**Supply current** is what the controller pulls off the battery. It's
what makes the voltage sag, and it's the *robot's* problem.

They are not the same number, and the gap between them is enormous at low
speed. Here's a Kraken given a full 12 V from a standstill, spinning up a
flywheel:

| Time | Speed | Stator | Supply | Applied |
|---|---|---|---|---|
| 0.00 s | 0.6 rot/s | 120.6 A | 30.3 A | 3.04 V |
| 0.60 s | 17.3 rot/s | 119.3 A | 50.2 A | 5.04 V |
| 0.90 s | 25.9 rot/s | 119.2 A | 60.7 A | 6.10 V |
| 1.20 s | 34.5 rot/s | 116.7 A | 69.2 A | 7.11 V |

Stator current sits pinned near 120 A the whole time. Supply current
starts at a quarter of that and climbs steadily as the motor speeds up.

The reason is in the last column. A controller that only wants to apply
3 V out of 12 does it by being switched on a quarter of the time, so it
only draws off the battery a quarter of the time.

*Nothing to add — the arithmetic, not code:*

```
supply current  ≈  stator current × (applied volts / battery volts)

at 3.04 V:  120.6 × 3.04/12 = 30.6 A     ✓ (measured 30.3)
at 7.11 V:  116.7 × 7.11/12 = 69.1 A     ✓ (measured 69.2)
```

**So a stalled motor is terrifying for the windings and cheap for the
battery, and a motor at speed is the other way round.** Limiting one does
not limit the other, which is why there are two settings.

---

## 3. The defaults protect the motor, not the robot

Here's the part that surprises people: **Phoenix is already limiting
current, and has been since Lesson 1.** Print a fresh config and you get
this.

*Nothing to add — sample output, not code:*

```
StatorCurrentLimit      = 120 A   enabled = true
SupplyCurrentLimit      =  70 A   enabled = true
SupplyCurrentLowerLimit =  40 A   after 1.0 s
```

That last pair is a nice touch — a motor may pull 70 A briefly, but if
it's still pulling after a second, it gets cut to 40 A. Brief surges are
normal; sustained ones mean something is stuck.

So why does anything ever brown out? Because **those limits are per
motor, and the battery is per robot.** Nothing in that config has any
idea how many other motors are on the same battery. Twelve motors each
entitled to 70 A is 840 A of entitlement, and a battery cannot do that.

Watch it break as the robot gets bigger. Same defaults, same jammed
mechanism, just more motors sharing the one battery:

| Motors, all on defaults | Total draw | Battery sagged to | |
|---|---|---|---|
| 3 | 107 A | 9.86 V | fine |
| 6 | 328 A | 5.44 V | **brownout** |
| 9 | 335 A | 5.30 V | **brownout** |
| 12 | 339 A | 5.23 V | **brownout** |

Six motors is not an exotic scenario. Six motors is a swerve drivetrain
plus two mechanisms — an ordinary second of an ordinary match.

Notice the total barely grows past six — it isn't that the extra motors
want less, it's that there's less battery left to give them. That's the
death spiral in miniature: once the rail sags, every motor's own duty
cycle throttles back with it, so the number stops climbing at exactly the
point where the robot is already in trouble.

**The defaults are a floor, not a plan.** They keep any one motor from
cooking itself, which is worth having, and they will not save a robot
that asks for more than it has.

---

## 4. A budget you can read in one place

So the limits have to come from you, and they have to be chosen as a set.
That makes a strong argument about where they live: **together**, not
each next to the mechanism it belongs to. A number that only makes sense
next to five other numbers should be next to those five numbers.

**Add to `Constants.java`, as a new nested class above `PathConstants`:**

```java
  public static final class PowerConstants {
    // Every mechanism motor shares this cap — the windings don't care
    // which subsystem they're bolted to.
    public static final Current kStatorLimit = Amps.of(80);

    // The supply budget, one line per motor, chosen so the three
    // mechanisms together leave headroom for the drivetrain (not budgeted
    // here — see the lesson's Try It).
    public static final Current kElevatorSupplyLimit = Amps.of(40);
    public static final Current kArmPivotSupplyLimit = Amps.of(30);
    public static final Current kArmRollerSupplyLimit = Amps.of(20);
    public static final Current kFlywheelSupplyLimit = Amps.of(40);

    /** Below this, call it a brownout — well above where the RIO itself gives up. */
    public static final Voltage kBrownoutVoltage = Volts.of(6.3);
  }
```

**Add the imports:**

```java
import static org.wpilib.units.Units.Amps;
import org.wpilib.units.measure.Current;
```

Every number there is a decision with a reason:

- **The elevator gets 40 A** because it lifts against gravity and has to
  be able to make its cruise. Starve it and Lesson 18's profile stops
  being achievable — you'd see it on the setpoint trace as the position
  falling behind the setpoint.
- **The arm pivot gets 30 A.** It's lighter than the elevator and it's
  allowed to be slower.
- **The roller gets 20 A** because it's a roller. It spins a rubber
  wheel. It has never needed more, and if it's pulling more, something is
  jammed.
- **The flywheel gets 40 A.** It draws hard during spin-up and almost
  nothing holding speed, which is exactly the "brief surge" case the
  supply limit's lower tier is built for.
- **The stator limit is 80 A for everything**, well under the 120 A
  default, because none of these mechanisms should ever need to push that
  hard, and if one is, it's stuck against something.

That's 130 A of supply if every mechanism goes flat out simultaneously, a
number you can hold in your head and check against a battery.

**Now apply them. Add to `ElevatorIOTalonFX`'s constructor, above the `apply` call:**

```java
    config.MotionMagic.MotionMagicCruiseVelocity =
        metersToRotations(ElevatorConstants.kMaxVelocity.in(MetersPerSecond));
    config.MotionMagic.MotionMagicAcceleration =
        metersToRotations(ElevatorConstants.kMaxAcceleration.in(MetersPerSecondPerSecond));

    // The budget: this motor's slice of the battery, plus the shared winding cap.
    config.CurrentLimits.StatorCurrentLimitEnable = true;
    config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    config.CurrentLimits.SupplyCurrentLimitEnable = true;
    config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kElevatorSupplyLimit.in(Amps);

    m_motor.getConfigurator().apply(config);
```

**Add the same block to `FlywheelIOTalonFX`, with its own supply limit:**

```java
    config.Slot0.kP = FlywheelConstants.kFlywheelKP;

    // The budget: this motor's slice of the battery, plus the shared winding cap.
    config.CurrentLimits.StatorCurrentLimitEnable = true;
    config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    config.CurrentLimits.SupplyCurrentLimitEnable = true;
    config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kFlywheelSupplyLimit.in(Amps);

    m_motor.getConfigurator().apply(config);
```

The arm has two motors, and the second one has been getting a bare
default config since Lesson 20.

**Replace the end of `ArmIOTalonFX`'s constructor:**

```java
    config.SoftwareLimitSwitch.ReverseSoftLimitEnable = true;
    config.SoftwareLimitSwitch.ReverseSoftLimitThreshold = ArmConstants.kMinAngle.in(Rotations);

    // The budget: this motor's slice of the battery, plus the shared winding cap.
    config.CurrentLimits.StatorCurrentLimitEnable = true;
    config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    config.CurrentLimits.SupplyCurrentLimitEnable = true;
    config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmPivotSupplyLimit.in(Amps);

    m_pivot.getConfigurator().apply(config);

    // The roller had been getting a bare default config since it was
    // built — it draws current too, and now it budgets like everything else.
    TalonFXConfiguration rollerConfig = new TalonFXConfiguration();
    rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
    rollerConfig.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;
    rollerConfig.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmRollerSupplyLimit.in(Amps);
    m_roller.getConfigurator().apply(rollerConfig);
```

**Add the imports each of those three files needs:**

```java
import static org.wpilib.units.Units.Amps;

import first.robot.Constants.PowerConstants;
```

---

## 5. You can't manage what you can't see

The whole point of a budget is that somebody adds it up. Right now
nothing on this robot knows its own total draw, so start by measuring.

**Add to `ElevatorIO.ElevatorIOInputs` and `FlywheelIO.FlywheelIOInputs`, below `statorCurrentAmps`:**

```java
    public double supplyCurrentAmps = 0.0;
```

**Add to `ArmIO.ArmIOInputs`, below `rollerVelocityRotPerSec` — two motors, two readings:**

```java
    public double pivotSupplyCurrentAmps = 0.0;
    public double rollerSupplyCurrentAmps = 0.0;
```

**Read them in `ElevatorIOTalonFX` and `FlywheelIOTalonFX`, below the stator line:**

```java
    inputs.statorCurrentAmps = m_motor.getStatorCurrent().getValue().in(Amps);
    inputs.supplyCurrentAmps = m_motor.getSupplyCurrent().getValue().in(Amps);
```

**And in `ArmIOTalonFX.updateInputs`:**

```java
    inputs.rollerVelocityRotPerSec = m_roller.getVelocity().getValue().in(RotationsPerSecond);
    inputs.pivotSupplyCurrentAmps = m_pivot.getSupplyCurrent().getValue().in(Amps);
    inputs.rollerSupplyCurrentAmps = m_roller.getSupplyCurrent().getValue().in(Amps);
```

Then each subsystem answers for itself.

**Add to `Elevator` and `Flywheel`, near their other getters:**

```java
  /** No subsystem knows the robot's total draw — this is this motor's slice of it. */
  public double getSupplyCurrentAmps() {
    return m_inputs.supplyCurrentAmps;
  }
```

**Add to `Arm`:**

```java
  /** Two motors, one mechanism — its slice of the battery is both of them together. */
  public double getSupplyCurrentAmps() {
    return m_inputs.pivotSupplyCurrentAmps + m_inputs.rollerSupplyCurrentAmps;
  }
```

**And add the total to `Robot`, above `logCommandStart`:**

```java
  /**
   * No single mechanism knows what the others are drawing — this is the one
   * place that can add all three up.
   */
  private double getTotalCurrentAmps() {
    return elevator.getSupplyCurrentAmps() + arm.getSupplyCurrentAmps() + flywheel.getSupplyCurrentAmps();
  }
```

Notice where that had to go. No subsystem could compute it, because no
subsystem knows the others exist — and that's not an accident of this
design, it's the point of it. `Robot` is the only thing that knows the
whole robot, so the whole-robot number is assembled there.

---

## 6. Simulating the battery

The logging belongs on a real robot too — a real brownout is exactly the
thing you'd want in the log — so it goes in `robotPeriodic()`, which runs
every tick whether the code is real or simulated.

**Add to `Robot.robotPeriodic()`, below `Scheduler.getDefault().run()`:**

```java
  @Override
  public void robotPeriodic() {
    Scheduler.getDefault().run();

    double batteryVolts = RobotController.getBatteryVoltage();
    SmartDashboard.putNumber("Power/TotalCurrentAmps", getTotalCurrentAmps());
    SmartDashboard.putNumber("Power/BatteryVolts", batteryVolts);
    SmartDashboard.putBoolean("Power/BrownedOut", batteryVolts < PowerConstants.kBrownoutVoltage.in(Volts));
  }
```

> Worth trying, and worth not being surprised by: `RobotController.isBrownedOut()`
> looks like the obvious call for that boolean, and it exists. It just
> doesn't work here — it reads false no matter how low the simulated
> rail is driven, even held there for seconds. That's an alpha gap in
> this simulator, not something you did wrong, and it's exactly why the
> line above compares the voltage against `kBrownoutVoltage` itself
> instead of trusting a flag that never flips.

Making the sag itself real, though — the *cause*, not just the reading —
only means anything in sim: nothing simulated is driving the real
roboRIO's input rail. `Robot.simulationPeriodic()` has been empty since
Lesson 13, when every mechanism's physics moved inside its own IO
implementation — there's been nothing left for it to do. **A battery
breaks that pattern.** No single mechanism owns it, and every one of them
changes it, which makes it the first thing since Lesson 13 with a real
reason to live in that method instead.

**Add to `Robot.simulationPeriodic()`:**

```java
  @Override
  public void simulationPeriodic() {
    RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(getTotalCurrentAmps()));
  }
```

**Add the imports:**

```java
import static org.wpilib.units.Units.Volts;

import org.wpilib.simulation.BatterySim;
import org.wpilib.simulation.RoboRioSim;
import org.wpilib.system.RobotController;

import first.robot.Constants.PowerConstants;
```

**Trace the loop once, because it's worth seeing.** Every sim IO layer in
this project starts its `stepSim` with
`m_motorSim.setSupplyVoltage(RobotController.getBatteryVoltage())` —
you wrote that back in Lesson 4 and haven't thought about it since,
because until now that value was always 12. Set it lower and every
simulated motor gets weaker, immediately, everywhere.

That's a feedback loop with no code holding it together: draw current →
voltage sags → motors get weak → they draw differently. It works because
each piece was already asking the right question.

`calculateDefaultBatteryLoadedVoltage` models a nominal 12 V battery with
20 milliohms of internal resistance, the standard FRC approximation.
100 A costs you 2 V. 300 A costs you 6, and 6 V is close to where a real
roboRIO gives up.

---

## 7. Watch one happen

**Run it:**

```powershell
./gradlew simulateJava
```

Graph `Power/TotalCurrentAmps` and `Power/BatteryVolts` together on
SmartDashboard. Drive around normally and you'll see the voltage twitch
and recover — that's the sag every robot has all the time.

Now cause one deliberately. Turn every limit off:

*Nothing to add — an experiment to run and undo, in all three IO classes:*

```java
    config.CurrentLimits.SupplyCurrentLimitEnable = false;
    config.CurrentLimits.StatorCurrentLimitEnable = false;
```

Run the elevator to its top height, hold the left trigger, and hold the
intake button, all together. With three unlimited motors the draw peaks
near **366 A** and the battery sags to about **4.7 V**. Everything goes
wrong at once: the elevator stalls partway, the flywheel never reaches
speed, and `Power/BrownedOut` goes true.

Put the limits back and repeat exactly the same thing. Peak draw around
**42 A**, battery holds above **11 V**, everything works.

| Configuration | Peak draw | Battery low point | |
|---|---|---|---|
| No limits at all | 366 A | 4.69 V | brownout |
| Phoenix defaults | 107 A | 9.86 V | survives, on three motors |
| The budget above | 42 A | 11.17 V | comfortable |

Worth staring at the middle row. Phoenix's defaults *did* save this
robot — because this robot only has three mechanism motors in the sum.
Add the drivetrain's eight and you're at the six-motor row of section
3's table, which browns out.

> **The one thing to carry away from watching this:** nothing in the log
> said "brownout" until you added that line. Everything else just looked
> broken. When a robot misbehaves in ways that don't make sense, the
> battery trace is the first thing to look at, and it's only there if you
> put it there.

---

## Try it

1. **Add the drivetrain to the total.** Eight more motors, and the
   biggest consumer on the robot by far. `ModuleIO` needs supply-current
   inputs the same way the mechanisms did, and `Drivetrain` needs to sum
   its four modules. Then re-run the brownout experiment and see how much
   less provocation it takes.
2. **Find the elevator's real floor.** Lower `kElevatorSupplyLimit` until
   the elevator can no longer make its Motion Magic cruise, and watch
   what that looks like on the setpoint trace from Lesson 18 §10 —
   position falling behind setpoint, a *different* signature from a badly
   tuned gain. Then back off to the lowest number that still works.
3. **Make the roller tell you it's jammed.** It's limited to 20 A. If
   it's pulling that for more than a second, something is stuck in the
   intake. Detect it and light the LEDs from Lesson 23.
4. **Budget for a sag.** The numbers above assume a fresh battery. Re-run
   with `BatterySim.calculateLoadedBatteryVoltage` and a lower nominal
   voltage — say 11.5 V, a realistic third-match battery — and see which
   of your choices stop being comfortable.
5. **Prioritise.** Right now every mechanism gets its budget regardless
   of what else is happening. Make the flywheel's limit drop while the
   elevator is moving. Then decide whether you actually want that,
   because a shooter that quietly gets slower is worse than one that's
   honestly unavailable.

---

## What you learned

The robot is now a system that shares something, which is a different
kind of problem from anything earlier in this course.

**Supply and stator answer different questions.** Stator current is heat
in the windings; supply current is voltage off the battery. They diverge
wildly at low speed — over 100 A through the motor while a fraction of
that leaves the battery — because a controller applying a quarter of the
voltage only draws for a quarter of the time. Two problems, two limits,
and limiting one does nothing for the other.

**Defaults protect the component, not the system.** Phoenix has been
limiting every motor since Lesson 1, and it still isn't enough, because a
per-motor limit multiplied by twelve motors is a number no battery can
supply. That generalizes well beyond current: a library's defaults
protect the thing the library knows about, and it doesn't know what else
you've built.

**A shared resource needs a number somebody owns.** No subsystem could
compute the robot's total draw, because no subsystem knows the others
exist. That's the design working as intended, and it's why the total gets
assembled in `Robot` — the one place that knows the whole robot.

And the practical one: **a brownout doesn't announce itself.** It looks
like every subsystem breaking at once for unrelated reasons, which is the
single most misleading symptom a robot can produce. Three keys — total
current, battery voltage, and the brownout flag — turn an evening of
suspicion into a ten-second diagnosis. Put them in before you need them.

That's the robot protected from itself. Go and brown it out a few times
on purpose — it's the cheapest way to learn what the trace looks like,
and the only time you'll ever get to do it without a crowd watching.

Notice, though, that finding it took a laptop, a graph, and someone who
knew which three keys to plot. In a queue line you have none of those.

Next: [Lesson 31 — The robot tells you what's wrong](31-alerts.md).
