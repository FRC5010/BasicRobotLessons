# Lesson 29 — One battery, everything on it

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

Now hold the left trigger while driving hard across the field. Lesson 27
bound it to the drivetrain, keeping the nose pointed at a tag. Lesson 28
bound the *same trigger* to the flywheel, spinning it to shooting speed.
Add the D-pad raising the elevator and the intake button sending the arm
down with its roller running, and that's four mechanisms — twelve motors — all asking for
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
| 0.00 s | 0.0 rot/s | 119.0 A | 29.8 A | 3.00 V |
| 0.60 s | 17.2 rot/s | 119.4 A | 51.3 A | 5.15 V |
| 0.90 s | 26.1 rot/s | 119.6 A | 62.4 A | 6.26 V |
| 1.20 s | 35.0 rot/s | 114.7 A | 69.3 A | 7.25 V |

Stator current sits pinned near 120 A the whole time. Supply current
starts at a quarter of that and climbs steadily as the motor speeds up.

The reason is in the last column. A controller that only wants to apply
3 V out of 12 does it by being switched on a quarter of the time, so it
only draws off the battery a quarter of the time.

*Nothing to add — the arithmetic, not code:*

```
supply current  ≈  stator current × (applied volts / battery volts)

at 3.00 V:  119.0 × 3.00/12 = 29.8 A     ✓ (measured 29.8)
at 7.25 V:  114.7 × 7.25/12 = 69.3 A     ✓ (measured 69.3)
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

Watch it break as the robot gets bigger. Same defaults, every motor
stalled against a jammed mechanism and commanded at full output, just more
motors sharing the one battery. The draw and the voltage settle after the
first second, so these are the averages over the second after that:

| Motors, all on defaults | Total draw | Battery sagged to | |
|---|---|---|---|
| 3 | 109 A | 9.82 V | fine |
| 6 | 326 A | 5.48 V | **brownout** |
| 9 | 346 A | 5.08 V | **brownout** |
| 12 | 336 A | 5.32 V | **brownout** |

Six motors is not an exotic scenario. Six motors is a swerve drivetrain
plus two mechanisms — an ordinary second of an ordinary match.

Notice the total stops growing past six — it isn't that the extra motors
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

**Add the imports to `Constants.java`:**

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

    // The roller had been getting a bare default config since it was built —
    // it draws current too, and now it budgets like everything else.
    TalonFXConfiguration rollerConfig = new TalonFXConfiguration();
    rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
    rollerConfig.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
    rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;
    rollerConfig.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmRollerSupplyLimit.in(Amps);
    m_roller.getConfigurator().apply(rollerConfig);
```

**Add the import all three of those files need:**

```java
import first.robot.Constants.PowerConstants;
```

**And add this one to `ArmIOTalonFX`, which has never read a current before:**

```java
import static org.wpilib.units.Units.Amps;
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

There's no log line to add. Each bundle is `@AutoLog`'d, so
`processInputs` records the new fields along with the old ones the moment
they exist: `Elevator/SupplyCurrentAmps`, `Flywheel/SupplyCurrentAmps`,
`Arm/PivotSupplyCurrentAmps` and `Arm/RollerSupplyCurrentAmps`. All that's
left is for each subsystem to answer for itself.

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

Three numbers go in, and one of them is different. The total current and
the brownout flag are things your code works out, so they're outputs. The
battery voltage is a **reading**: on a real robot it's measured, the same
as an encoder's position. So it's recorded as one, through
`processInputs`, in a bundle of its own. You've done this once before —
Lesson 16's `StartingPlacement` was a reading that belonged to no
subsystem either.

**Create `PowerReadings.java`, next to `Robot.java`:**

```java
package first.robot;

import org.littletonrobotics.junction.AutoLog;

/**
 * The battery, the one reading on the robot that belongs to no subsystem.
 * Recorded like a sensor's, so a replay uses the voltage the robot really
 * had instead of working one out again.
 */
@AutoLog
public class PowerReadings {
  public double batteryVolts = 0.0;
}
```

**Add to `Robot.robotPeriodic()`, below `Scheduler.getDefault().run()`:**

```java
  @Override
  public void robotPeriodic() {
    Scheduler.getDefault().run();

    // The battery's voltage is a reading, like a sensor's, so it's recorded as
    // one: a replay gets the voltage the robot really had, not a fresh guess.
    PowerReadingsAutoLogged power = new PowerReadingsAutoLogged();
    power.batteryVolts = RobotController.getBatteryVoltage();
    Logger.processInputs("Power", power);
    Logger.recordOutput("Power/TotalCurrentAmps", getTotalCurrentAmps());
    // Compared against the threshold here rather than read from a flag, so the
    // answer is the same on a robot and in simulation, and you choose the line.
    Logger.recordOutput(
        "Power/BrownedOut", power.batteryVolts < PowerConstants.kBrownoutVoltage.in(Volts));
  }
```

`processInputs("Power", power)` records the voltage as `Power/BatteryVolts`.
In a replay it does the opposite, the same as every bundle since Lesson 13:
it overwrites `power.batteryVolts` with the voltage from the log. That's
why everything after it reads `power.batteryVolts` and never asks
`RobotController` again — the brownout flag in a replay is worked out from
the voltage the robot really had.

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

> A replay runs on your laptop, so it's a simulation too, and
> `simulationPeriodic()` runs in one as well. It works out a battery of its
> own from the replayed currents — and nothing reads it, because the
> voltage your code uses came out of the log. Replay a run from a real
> robot, or one recorded on a different simulated battery, and
> `Power/BatteryVolts` is still the voltage that run really had.

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

**Run the robot in simulation.** Graph `Power/TotalCurrentAmps` and
`Power/BatteryVolts` together in AdvantageScope. The voltage is a reading, so it's at `/AdvantageKit/Power`;
the total is an output, at `/AdvantageKit/RealOutputs/Power`. Drive around normally and
you'll see the voltage twitch and recover — that's the sag every robot has
all the time.

Now ask for everything at once. Enable Teleoperated, press **Back** and wait
for the elevator to home, then press **D-pad up**, hold the **left trigger**,
and press the **intake button** (the left face button), all together. The
elevator climbs, the flywheel spins up, and the arm swings down with the
roller running.

With the budget from section 4, the total draw peaks at **61–110 A** and the
battery bottoms out around **9.8–10.8 V**. Everything works, and
`Power/BrownedOut` stays false.

Now see what the budget bought. Turn every limit off:

*Nothing to add — an experiment to run and undo, in all three IO classes:*

```java
    config.CurrentLimits.SupplyCurrentLimitEnable = false;
    config.CurrentLimits.StatorCurrentLimitEnable = false;
```

*(In `ArmIOTalonFX`, that's `rollerConfig` too.)* Repeat exactly the same
thing. The draw peaks near **200 A**, with spikes up to 275 A in the worst
runs, and the battery sags to **8.0 V**, or 6.5 V in the worst of them:
worse, and still not a brownout. Delete those limit lines entirely and you're
on Phoenix's defaults, which peak around **84–126 A** and sag to
**9.5–10.3 V**.

| Configuration | Peak draw | Battery low point | |
|---|---|---|---|
| No limits at all | 197–275 A | 6.50–8.05 V | sags, survives |
| Phoenix defaults | 84–126 A | 9.48–10.33 V | fine |
| The budget above | 61–110 A | 9.80–10.77 V | comfortable |

*(Ten runs of each, the same moves every time. The peaks are spikes a few
ticks long, and a 20 ms sample catches some of them and misses others, so
the same moves read differently from run to run. That's why most of these
are ranges.)*

Three mechanism motors, even unlimited, can't pull a fresh battery under
6.3 V. That's honest, and it's the same thing section 3 said: this robot has
only three mechanism motors in the sum. The drivetrain's eight are what
turn "sags" into "browns out" — Try It #1 adds them.

You don't have to build that to see a brownout, though. A fresh battery is the
best day your robot will have. **Make it a tired one.** An old battery at the
end of an event is closer to 11 V with twice the internal resistance.

**Replace the line in `Robot.simulationPeriodic()` while you experiment — and put it back after:**

```java
    RoboRioSim.setVInVoltage(BatterySim.calculateLoadedBatteryVoltage(11.0, 0.04, getTotalCurrentAmps()));
```

Run the same three configurations again, ten times each:

| Configuration, 11 V battery, 40 mΩ | Peak draw | Battery low point | Browned out |
|---|---|---|---|
| No limits at all | 204–619 A | 0.00–2.86 V | **10 of 10** |
| Phoenix defaults | 84–153 A | 4.87–7.65 V | **2 of 10** |
| The budget above | 67–88 A | 7.50–8.31 V | 0 of 10 |

With no limits the robot browns out the moment you enable it, before you've
pressed a thing: the flywheel's idle spin-up alone drags the rail under
6.3 V and `Power/BrownedOut` goes true. Then ask for everything at once. In
seven of the ten runs the battery collapsed all the way to 0 V. The elevator
got only 0.13–0.52 m on its way to 1.45 m and stalled, and the flywheel
reached 39–51 rot/s and then fell to nothing. In the other three the rail
dipped to 1.0–2.9 V and the robot carried on: the elevator reached the top
every time, and the flywheel made its 60 rot/s in two of them.

Phoenix's defaults are a gamble on this battery. Eight runs got through with
0.3–1.4 V to spare. The other two browned out partway through the moves,
dipping to 4.87 V for a few ticks, and still finished. Those two were the
runs whose peak reached 153 A; none of the other eight passed 111 A. Same
code, same moves, so you can't know beforehand which kind of run you'll get.

Only the budget was safe every time. Its worst run stayed 1.2 V above the
line.

*(The peaks vary for the same reason as on the fresh battery, and the
no-limits ones vary the most: the seven runs that collapsed peaked at
368–619 A, the three that didn't at 204–249 A.)*

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
4. **Budget for a sag.** Section 7's tired battery was 11 V and 40 mΩ. Try
   11.5 V and 30 mΩ, a realistic third-match battery, and then find the
   internal resistance at which even the budget browns out. Run each
   setting a few times, because one run can get lucky. That's the
   battery you should replace before a match.
5. **Prioritise.** Right now every mechanism gets its budget regardless
   of what else is happening. Make the flywheel's limit drop while the
   elevator is moving. Then decide whether you actually want that,
   because a shooter that quietly gets slower is worse than one that's
   honestly unavailable.
6. **Replay a tired battery.** Record the everything-at-once run on
   section 7's tired battery, put the fresh battery's line back, and
   replay the log the way Lesson 13 did. `Power/BatteryVolts` in the
   replay is still the tired battery's, even though the code you replayed
   simulates a fresh one. Then swap `Logger.processInputs("Power", power)`
   for `Logger.recordOutput("Power/BatteryVolts", power.batteryVolts)`,
   do the same again, and compare `RealOutputs/Power/BatteryVolts` with
   `ReplayOutputs/Power/BatteryVolts`. Explain the gap before you put
   `processInputs` back.

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
suspicion into a ten-second diagnosis. Put them in before you need them,
and record the voltage as the reading it is, so a replay looks at the
battery the robot really had.

That's the robot protected from itself. Go and brown it out a few times
on purpose — it's the cheapest way to learn what the trace looks like,
and the only time you'll ever get to do it without a crowd watching.

Notice, though, that finding it took a laptop, a graph, and someone who
knew which three keys to plot. In a queue line you have none of those.

Next: [Lesson 30 — The robot tells you what's wrong](30-alerts.md).
