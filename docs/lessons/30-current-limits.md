# Lesson 30 — One battery, everything on it

**Goal:** Stop the robot browning out — and cause one on purpose first, so you know
what it looks like from the inside.

**New Java concepts**
- None.

**New robot concepts**
- **`CurrentLimitsConfigs`** — supply vs. stator limits, and why they answer
  different questions
- **The battery as a shared, finite resource** — the first time in this course
  that one subsystem's choices hurt another
- **Simulating the battery**, so a brownout is something you can watch instead of
  something you read about
- What a brownout actually does, and why it's so hard to diagnose

---

## 1. Everything at once

Every lesson so far has looked at one mechanism at a time. The elevator lifts, the
arm swings, the flywheel spins, the drivetrain drives — and each of them was tuned,
measured and reasoned about on its own.

Now hold the left trigger while the elevator is going up and the intake is running,
during a full-speed drive across the field. Four subsystems, twelve motors, all
asking for everything they can get, at the same instant.

There is one battery.

This is the first genuinely *systemic* thing in the course. Up to now, a bug in the
arm was a bug in the arm. From here, the elevator can make the drivetrain
misbehave — not by sharing any code with it, but by getting to the electricity
first.

And the symptom is horrible. A robot short of voltage doesn't fail cleanly: the
motors get weak, the roboRIO starts shedding load, the CAN bus gets flaky, the
camera drops out, and every subsystem misbehaves at once. There is nothing in the
logs that says "brownout" unless you put it there. It just looks like everything
broke simultaneously, which is exactly what makes people spend an evening
suspecting their code.

---

## 2. Supply and stator are different questions

A motor controller sits between the battery and the motor, and there is a
different current on each side of it.

**Stator current** is what flows through the windings. It's what makes torque and
what makes heat, and it's the motor's problem.

**Supply current** is what the controller pulls off the battery. It's what makes
the voltage sag and what trips the breaker, and it's the *robot's* problem.

They are not the same number, and the gap between them is enormous at low speed.
Here's a Kraken given a full 12 V from a standstill, spinning up a heavy wheel:

| Time | Speed | Stator | Supply | Applied |
|---|---|---|---|---|
| 0.02 s | 0.1 rot/s | 120 A | 30 A | 3.00 V |
| 0.80 s | 4.5 rot/s | 120 A | 36 A | 3.54 V |
| 2.00 s | 11.3 rot/s | 121 A | 44 A | 4.40 V |
| 3.98 s | 22.6 rot/s | 120 A | 58 A | 5.79 V |

Stator current sits pinned at 120 A the whole time. Supply current starts at a
quarter of that and climbs steadily as the motor speeds up.

The reason is in the last column. A controller that only wants to apply 3 V out of
12 does it by being switched on a quarter of the time, so it only draws off the
battery a quarter of the time:

```
supply current  ≈  stator current × (applied volts / battery volts)

at 3.00 V:  120 × 3.00/12 = 30 A     ✓
at 5.79 V:  120 × 5.79/12 = 58 A     ✓
```

**So a stalled motor is terrifying for the windings and cheap for the battery,
and a motor at full speed is the other way round.** Limiting one does not limit
the other, which is why there are two settings.

---

## 3. The defaults protect the motor, not the robot

Here's the part that surprises people: **Phoenix is already limiting current, and
has been since Lesson 1.** Print a fresh config and you get:

```
StatorCurrentLimit      = 120 A   enabled = true
SupplyCurrentLimit      =  70 A   enabled = true
SupplyCurrentLowerLimit =  40 A   after 1.0 s
```

That last pair is a nice touch — a motor may pull 70 A briefly, but if it's still
pulling after a second, it gets cut to 40 A. Brief surges are normal; sustained
ones mean something is stuck.

So why does anything ever brown out? Because **those limits are per motor, and the
battery is per robot.** Nothing in that config has any idea how many other motors
are on the same battery. Twelve motors each entitled to 70 A is 840 A of
entitlement, and a battery cannot do that.

Watch it break as the robot gets bigger. Same defaults, same load, just more
motors:

| Motors, all on defaults | Peak draw | Battery sagged to | |
|---|---|---|---|
| 3 | 108 A | 9.84 V | fine |
| 6 | 332 A | 5.37 V | **brownout** |
| 9 | 552 A | 0.96 V | **brownout** |
| 12 | 751 A | 0.00 V | **brownout** |

Six motors is not an exotic scenario. Six motors is a swerve drivetrain plus two
mechanisms — an ordinary second of an ordinary match.

**The defaults are a floor, not a plan.** They keep any one motor from cooking
itself, which is worth having, and they will not save a robot that asks for more
than it has.

---

## 4. A budget you can read in one place

So the limits have to come from you, and they have to be chosen as a set. That
makes a strong argument about where they live: **together**, not each next to the
mechanism it belongs to. A number that only makes sense next to five other numbers
should be next to those five numbers.

**Add to `Constants.java`, as a new nested class above `FlywheelConstants`:**

```java
  public static class PowerConstants {
    // A battery is one resource that everything shares, so these numbers only
    // mean anything read together. That is why they live in one place instead of
    // each sitting next to the mechanism it limits.
    public static final Current kElevatorSupplyLimit = Amps.of(40);
    public static final Current kArmPivotSupplyLimit = Amps.of(30);
    public static final Current kArmRollerSupplyLimit = Amps.of(20);
    public static final Current kFlywheelSupplyLimit = Amps.of(40);

    /** What the windings may take, whatever the battery happens to be doing. */
    public static final Current kStatorLimit = Amps.of(80);

    /** Below this the roboRIO starts switching things off to save itself. */
    public static final Voltage kBrownoutVoltage = Volts.of(6.3);
  }
```

**Add the import:**

```java
import edu.wpi.first.units.measure.Current;
```

Every number there is a decision with a reason:

- **The elevator gets 40 A** because it lifts against gravity and has to be able to
  make its cruise. Starve it and Lesson 18's profile stops being achievable —
  you'd see it on the setpoint trace as the position falling behind the setpoint.
- **The arm pivot gets 30 A.** It's lighter than the elevator and it's allowed to
  be slower.
- **The roller gets 20 A** because it's a roller. It spins a rubber wheel. It has
  never needed more and, if it's pulling more, something is jammed.
- **The flywheel gets 40 A.** It draws hard during spin-up and almost nothing
  holding speed, which is exactly the "brief surge" case the supply limit's lower
  tier is built for.
- **The stator limit is 80 A for everything**, well under the 120 A default,
  because none of these mechanisms should ever need to push that hard and if one
  is, it's stuck against something.

That's 130 A of supply if every mechanism goes flat out simultaneously, which is a
number you can hold in your head and check against a battery.

**Now apply them. Add to `ElevatorIOTalonFX`'s constructor, above the `apply` call:**

```java
        // Two different questions, so two different limits: what the battery is
        // asked for, and what the windings are allowed to take.
        config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kElevatorSupplyLimit.in(Amps);
        config.CurrentLimits.SupplyCurrentLimitEnable = true;
        config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        config.CurrentLimits.StatorCurrentLimitEnable = true;
```

**Add the same block to `FlywheelIOTalonFX`, with its own supply limit:**

```java
        // Two different questions, so two different limits: what the battery is
        // asked for, and what the windings are allowed to take.
        config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kFlywheelSupplyLimit.in(Amps);
        config.CurrentLimits.SupplyCurrentLimitEnable = true;
        config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        config.CurrentLimits.StatorCurrentLimitEnable = true;
```

The arm has two motors, and the second one has been getting a bare default config
since Lesson 20.

**Replace the end of `ArmIOTalonFX`'s constructor:**

```java
        // Two different questions, so two different limits: what the battery is
        // asked for, and what the windings are allowed to take.
        config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kArmPivotSupplyLimit.in(Amps);
        config.CurrentLimits.SupplyCurrentLimitEnable = true;
        config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        config.CurrentLimits.StatorCurrentLimitEnable = true;

        m_pivot.getConfigurator().apply(config);

        // The roller used to get a bare default config. It is a motor on the same
        // battery as everything else, so it gets a budget too.
        TalonFXConfiguration rollerConfig = new TalonFXConfiguration();
        rollerConfig.CurrentLimits.SupplyCurrentLimit =
                PowerConstants.kArmRollerSupplyLimit.in(Amps);
        rollerConfig.CurrentLimits.SupplyCurrentLimitEnable = true;
        rollerConfig.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
        rollerConfig.CurrentLimits.StatorCurrentLimitEnable = true;
        m_roller.getConfigurator().apply(rollerConfig);
```

**Add the imports each of those three files needs:**

```java
import static edu.wpi.first.units.Units.Amps;
import frc.robot.Constants.PowerConstants;
```

---

## 5. You can't manage what you can't see

The whole point of a budget is that somebody adds it up. Right now nothing on this
robot knows its own total draw, so start by measuring.

**Add to `ElevatorIO.ElevatorIOInputs` and `FlywheelIO.FlywheelIOInputs`:**

```java
        public double supplyCurrentAmps = 0.0;
```

**Add to `ArmIO.ArmIOInputs`, above `hasGamePiece` — two motors, two readings:**

```java
        public double pivotSupplyCurrentAmps = 0.0;
        public double rollerSupplyCurrentAmps = 0.0;
```

**Read them in `ElevatorIOTalonFX` and `FlywheelIOTalonFX`, below the stator line:**

```java
        inputs.supplyCurrentAmps = m_motor.getSupplyCurrent().getValueAsDouble();
```

**And in `ArmIOTalonFX.updateInputs`:**

```java
        inputs.pivotSupplyCurrentAmps = m_pivot.getSupplyCurrent().getValueAsDouble();
        inputs.rollerSupplyCurrentAmps = m_roller.getSupplyCurrent().getValueAsDouble();
```

Then each subsystem answers for itself.

**Add to `Elevator` and `Flywheel`:**

```java
    /** What this mechanism is asking the battery for, right now. */
    public double getSupplyCurrentAmps() {
        return m_inputs.supplyCurrentAmps;
    }
```

**Add to `Arm`:**

```java
    /** Both motors together — the battery doesn't care which one wanted it. */
    public double getSupplyCurrentAmps() {
        return m_inputs.pivotSupplyCurrentAmps + m_inputs.rollerSupplyCurrentAmps;
    }
```

**And add the total to `RobotContainer`, above `getAutonomousCommand`:**

```java
  /**
   * Everything the mechanisms are drawing, as the one number the battery cares
   * about. Nothing on the robot can see this except by being told — which is why
   * it has to be assembled somewhere that knows about all of them.
   */
  public double getTotalCurrentAmps() {
    return m_elevator.getSupplyCurrentAmps()
        + m_arm.getSupplyCurrentAmps()
        + m_flywheel.getSupplyCurrentAmps();
  }
```

Notice where that had to go. No subsystem could compute it, because no subsystem
knows the others exist — and that's not an accident of this design, it's the point
of the design. `RobotContainer` is the only thing that knows the whole robot, so
the whole-robot number is assembled there.

---

## 6. Simulating the battery

Now make the sag real, so a brownout is something you can watch.

There's a precedent for where this goes. Lesson 16 put the physics arena in
`Robot.simulationPeriodic()` rather than inside an IO layer, because the arena is
shared world state that no subsystem owns. **A battery is exactly the same shape**,
and it belongs in exactly the same place.

**Add to `Robot.simulationPeriodic()`, below the game-piece logging:**

```java
    // The battery is the other piece of shared world state, for exactly the same
    // reason the arena is: no single subsystem owns it, and every one of them
    // changes it. Add up what they're drawing, work out what that does to the
    // voltage, and hand it back — which is what closes the loop, because the sim
    // IO layers feed RobotController.getBatteryVoltage() to their motors.
    double totalAmps = m_robotContainer.getTotalCurrentAmps();
    RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(totalAmps));

    Logger.recordOutput("Power/TotalCurrentAmps", totalAmps);
    Logger.recordOutput("Power/BatteryVolts", RobotController.getBatteryVoltage());
    Logger.recordOutput("Power/BrownedOut", RobotController.isBrownedOut());
```

**Add the imports:**

```java
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.BatterySim;
import edu.wpi.first.wpilibj.simulation.RoboRioSim;
```

**That comment about closing the loop is the important bit**, and it's worth
tracing once. Every sim IO layer in this project starts its `stepSim` with
`m_motorSim.setSupplyVoltage(RobotController.getBatteryVoltage())` — which you
wrote back in Lesson 4 and haven't thought about since, because until now that
value was always 12. Set it lower and every simulated motor gets weaker,
immediately, everywhere.

That's a feedback loop with no code holding it together: draw current → voltage
sags → motors get weak → they draw differently. It works because each piece was
already asking the right question.

`calculateDefaultBatteryLoadedVoltage` models a nominal 12 V battery with 20
milliohms of internal resistance, which is the standard FRC approximation. 100 A
costs you 2 V. 300 A costs you 6, and 6 V is where the roboRIO gives up.

---

## 7. Watch one happen

```powershell
./gradlew simulateJava
```

Graph `Power/TotalCurrentAmps` and `Power/BatteryVolts` together. Drive around
normally and you'll see the voltage twitch and recover — that's the sag every
robot has all the time.

Now cause one deliberately. Turn every limit off:

*Nothing to add — an experiment to run and undo, in all three IO classes:*

```java
        config.CurrentLimits.SupplyCurrentLimitEnable = false;
        config.CurrentLimits.StatorCurrentLimitEnable = false;
```

Run the elevator to its top height, hold the left trigger, and hold the intake
button, all together. With three unlimited motors the draw peaks near **490 A**
and the battery collapses to about **2 V**. Everything goes wrong at once: the
elevator stalls partway, the flywheel never reaches speed, and `Power/BrownedOut`
goes true.

Put the limits back and repeat exactly the same thing. Peak draw around **42 A**,
battery holds above **11 V**, everything works.

| Configuration | Peak draw | Battery low point | |
|---|---|---|---|
| No limits at all | 490 A | 2.09 V | brownout |
| Phoenix defaults | 108 A | 9.84 V | survives, on three motors |
| The budget above | 42 A | 11.16 V | comfortable |

Worth staring at the middle row. Phoenix's defaults *did* save this robot — because
this robot only has three mechanism motors in the sum. Add the drivetrain's eight
and you're at the six-motor row of section 3's table, which browns out.

> **The one thing to carry away from watching this:** nothing in the log said
> "brownout" until you added that line. Everything else just looked broken. When a
> robot misbehaves in ways that don't make sense, the battery trace is the first
> thing to look at, and it's only there if you put it there.

---

## Try it

1. **Add the drivetrain to the total.** Eight more motors, and the biggest
   consumer on the robot by far. `ModuleIO` needs supply-current inputs the same
   way the mechanisms did, and `Drivetrain` needs to sum its four modules. Then
   re-run the brownout experiment and see how much less provocation it takes.
2. **Find the elevator's real floor.** Lower `kElevatorSupplyLimit` until the
   elevator can no longer make its Motion Magic cruise, and watch what that looks
   like on the setpoint trace from Lesson 18 §9 — position falling behind
   setpoint, which is a *different* signature from a badly tuned gain. Then back
   off to the lowest number that still works.
3. **Make the roller tell you it's jammed.** It's limited to 20 A. If it's pulling
   that for more than a second, something is stuck in the intake. Detect it and
   light the LEDs from Lesson 23.
4. **Budget for a sag.** The numbers above assume a fresh battery. Re-run with
   `BatterySim.calculateLoadedBatteryVoltage` and a lower nominal voltage — say
   11.5 V, which is a realistic third-match battery — and see which of your
   choices stop being comfortable.
5. **Prioritise.** Right now every mechanism gets its budget regardless of what
   else is happening. Make the flywheel's limit drop while the elevator is
   moving. Then decide whether you actually want that, because a shooter that
   quietly gets slower is worse than one that's honestly unavailable.

---

## What you learned

The robot is now a system that shares something, which is a different kind of
problem from anything earlier in this course.

**Supply and stator answer different questions.** Stator current is heat in the
windings; supply current is voltage off the battery. They diverge wildly at low
speed — 120 A through the motor while only 30 A leaves the battery — because a
controller applying a quarter of the voltage only draws for a quarter of the time.
Two problems, two limits, and limiting one does nothing for the other.

**Defaults protect the component, not the system.** Phoenix has been limiting every
motor since Lesson 1, and it still isn't enough, because a per-motor limit
multiplied by twelve motors is a number no battery can supply. That generalises
well beyond current: a library's defaults protect the thing the library knows
about, and it doesn't know what else you've built.

**A shared resource needs a number somebody owns.** No subsystem could compute the
robot's total draw, because no subsystem knows the others exist. That's the design
working as intended, and it's why the total gets assembled in `RobotContainer` —
the one place that knows the whole robot.

And the practical one: **a brownout doesn't announce itself.** It looks like every
subsystem breaking at once for unrelated reasons, which is the single most
misleading symptom a robot can produce. Three log keys — total current, battery
voltage, and the brownout flag — turn an evening of suspicion into a ten-second
diagnosis. Put them in before you need them.

That's the robot protected from itself. Go and brown it out a few times on
purpose — it's the cheapest way to learn what the trace looks like, and the only
time you'll ever get to do it without a crowd watching.

Notice, though, that finding it took a laptop, a log, and someone who knew which
three keys to plot. In a queue line you have none of those. The next lesson gives
the robot a way to tell you what's wrong out loud.

Next: [Lesson 31 — The robot tells you what's wrong](31-alerts.md).
