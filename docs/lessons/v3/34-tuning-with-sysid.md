# Lesson 34 — Tuning your robot when build team hands it over

**Goal:** Meet the real machine your computed gains have been standing in
for, put a number on how close they were, and pick up the tool teams use to
measure what a spec sheet can't tell you.

**New Java concepts**
- `Trigger.and(BooleanSupplier)` — combining two buttons into one condition,
  so a characterization run needs both held at once.

**New robot concepts**
- **`SysIdRoutine`** — a tool that drives a mechanism open loop in two
  deliberate patterns and logs exactly what it needs to fit `kS`/`kV`/`kA`
  from the result, instead of you computing them.
- **`@Utility`** — a third opmode category, alongside `@Teleop` and
  `@Autonomous`, for things a robot does that aren't driving or an
  autonomous plan. Characterization lives here, in its own opmode, not
  bolted onto teleop.
- **A safe first power-on**, as a procedure, not a piece of code.
- **A test can lie about the mechanism if the test is wrong for it** — the
  same ramp rate that's fine for one mechanism can quietly corrupt another.
- **Characterizing something with finite travel**, where the settings that
  make the measurement good and the settings that keep the mechanism intact
  pull against each other.

---

## 1. None of your numbers are about this robot yet

Every gain in this course so far came from a spec sheet. `kV = 0.12` isn't a
measurement — it's `6000 RPM ÷ 12 V`, a fact about a Kraken X60 in general,
computed the same way for a flywheel, an elevator, and an arm since Lesson 18.
It has been right *enough* to build this entire course in simulation, because
the simulated motors are built from the same spec-sheet numbers. A real
Kraken doesn't know what its own spec sheet says. It has bearing friction,
wiring resistance, a wheel that weighs slightly more than CAD said, and none
of that shows up until voltage actually moves through actual copper.

That's what today closes the gap on. **`SysIdRoutine`** drives a mechanism
with two carefully-shaped voltage patterns, logs what happened, and fits the
same three terms you've been computing by hand since Lesson 18 — except this
time they come from the machine instead of the datasheet. Where the two
agree, the spec-sheet math was a good stand-in. Where they don't, the
difference has a name: friction, efficiency, or a mass that isn't what you
thought.

Here's something worth knowing before you write a line of code: **the real
`SysIdRoutine` doesn't exist yet on this framework.** It was built for
Commands V2's `Subsystem`/`Command` types, and this alpha hasn't ported it to
`Mechanism`/coroutines. That's the same kind of gap Lesson 16 ran into with
maple-sim — a real tool this course wants that the framework hasn't caught up
to — and the answer is the same one Lesson 16 gave: build it yourself,
against the one piece that *did* get ported. `SysIdRoutineLog` — the class
that actually writes the measurements to disk — exists and works exactly like
it always has. This lesson builds a small class around it that reproduces the
real routine's two test shapes, and the `.wpilog` it records is genuinely
readable by the same analysis tool a WPILib `SysIdRoutine` would have
produced. You're not missing out on the real thing here — you're building the
part of it the framework hasn't shipped yet, on top of the part that already
works.

This course can't put a real Kraken in front of you — it's a docs-only repo
running in simulation. What it *can* do is teach you the tool for real, verify
every line of code compiles and runs, and be honest about the one thing
simulation can never show you. Hold that thought; section 8 comes back to it.

---

## 2. First power-on, safely

This section has no code in it. That's deliberate — a checklist doesn't
compile, and pretending it does would be dishonest about what actually keeps
a mechanism from hurting someone.

Today's mechanism is the flywheel, and that's not an arbitrary choice. Look
back at what the elevator and arm need before they can move safely: the
elevator needs homing (Lesson 21) or it doesn't know where the floor is; the
arm needs its soft limits (Lesson 20) or it can drive into its own hard stop.
A flywheel spinning open loop has neither problem — it has no position to get
wrong, no floor to fall through, nothing to crash into except itself. That
makes it the safer mechanism to hand raw, uncontrolled voltage to, and it's
part of why this lesson picked it. **Section 7 is what changes when you point
this same tool at a mechanism that can run out of room** — read it before you
characterize the elevator, not after.

What's still real: a spinning flywheel is genuinely dangerous to fingers,
hair, and shoelaces, current limits protect windings but not people, and
"it worked in sim" has never once meant "it's safe to stand next to." Before
you send voltage into a real motor for the first time:

- **Know which opmode you're in.** Section 5 puts every characterization
  binding in its own opmode, selected separately from Teleop on the driver
  station. That's the first guard, not a formality — nobody drives a match
  with the characterization opmode selected, so nobody can reach these
  buttons by accident while actually playing.
- **Confirm the CAN ID matches `Constants.java`.** Characterizing the wrong
  motor because two devices share an ID is a Week 1 story every team has.
- **Confirm the current limits from Lesson 30 are actually in the config that
  ships to this motor.** They already are, if you've followed the course —
  this is the moment to double-check, not assume.
- **Clear the area.** Nothing above, below, or beside the wheel that a hand,
  a wire, or a shoe could reach.
- **Start disabled, and only enable right before you run one test.** Not
  "enable and then get ready" — get ready, *then* enable.
- **Watch current, not just speed, the first time.** A locked rotor draws
  huge current and barely spins — Lesson 30 measured this directly. If the
  wheel isn't turning and the current reading is climbing, that's your
  answer, and it isn't "give it more voltage."
- **Know where disable is before you need it.** Not as a formality — as the
  plan for the thing this whole checklist is trying to prevent.

None of that is Java. All of it is the actual first thing that happens when
build team hands you a robot, and it happens before a single characterization
run.

---

## 3. Give the flywheel an open door

`SysIdRoutine` needs to drive the motor with a raw voltage, no closed loop in
the way — the same reasoning Lesson 21 used for homing the elevator: you
can't measure the plant honestly while a controller is busy correcting for
it. `ElevatorIO` already has that door (Lesson 21 added it for homing);
`FlywheelIO` doesn't have one yet.

**Add to `FlywheelIO`, below `stop()`:**

```java
/** Open-loop drive, for characterization: no goal, no profile, just a voltage. */
public default void setVoltage(double volts) {}
```

**Add to `FlywheelIOTalonFX`'s imports:**

```java
import com.ctre.phoenix6.controls.VoltageOut;
```

**Add a field to `FlywheelIOTalonFX`, next to the other control requests:**

```java
private final VoltageOut m_openLoop = new VoltageOut(0);
```

**Implement it in `FlywheelIOTalonFX`, below `stop()`:**

```java
@Override
public void setVoltage(double volts) {
  m_motor.setControl(m_openLoop.withOutput(volts));
}
```

`FlywheelIOSim` needs nothing — it extends `FlywheelIOTalonFX` and inherits
this exactly like it inherits `setGoalRps`, which is the whole reason that
inheritance shape has been paying for itself since Lesson 18.

---

## 4. Build a `SysIdRoutine`

The real WPILib class has two collaborating pieces: a `Config` (how fast to
ramp, how big a step, how long to run) and a `Mechanism` (how to drive it and
how to log it). That second name is a problem here — `org.wpilib.command3.
Mechanism` is already this course's base class for every subsystem, and a
nested type with the same name would shadow it. So this version folds that
piece's two callbacks straight into the constructor instead of wrapping them
in their own type. Same information, one name conflict avoided.

**Create `src/main/java/first/robot/commands/SysIdRoutine.java`, in three pieces.**

**Piece 1 — the two records that hold configuration, and the fields:**

```java
package first.robot.commands;

import static org.wpilib.units.Units.Second;
import static org.wpilib.units.Units.Seconds;
import static org.wpilib.units.Units.Volts;

import java.util.function.Consumer;
import java.util.function.DoubleConsumer;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.sysid.SysIdRoutineLog;
import org.wpilib.system.Timer;
import org.wpilib.units.VoltageUnit;
import org.wpilib.units.measure.Time;
import org.wpilib.units.measure.Velocity;
import org.wpilib.units.measure.Voltage;

/** A SysId characterization routine for a single mechanism. */
public final class SysIdRoutine {
  /** Hardware-independent configuration for a SysId test routine. */
  public record Config(Velocity<VoltageUnit> rampRate, Voltage stepVoltage, Time timeout) {
    /** 1 V/s ramp, 7 V step, 10 s timeout — the same defaults the real tool ships. */
    public Config() {
      this(Volts.of(1).per(Second), Volts.of(7), Seconds.of(10));
    }
  }

  /** Motor direction for a SysId test. */
  public enum Direction { kForward, kReverse }

  private final Config m_config;
  private final DoubleConsumer m_drive;
  private final Consumer<SysIdRoutineLog> m_log;
  private final Mechanism m_mechanism;
  private final SysIdRoutineLog m_routineLog;

  /**
   * @param config Hardware-independent parameters for the routine.
   * @param mechanism The mechanism being characterized — this routine's requirement.
   * @param name The mechanism's name, as it will appear in the analysis tool.
   * @param drive Sends a raw voltage to the mechanism's motor.
   * @param log Reports the mechanism's current measurements onto the supplied log.
   */
  public SysIdRoutine(
      Config config, Mechanism mechanism, String name, DoubleConsumer drive,
      Consumer<SysIdRoutineLog> log) {
    m_config = config;
    m_mechanism = mechanism;
    m_drive = drive;
    m_log = log;
    m_routineLog = new SysIdRoutineLog(name);
  }
```

`Config` is a `record` holding the three numbers a run needs, defaulted the
same way the real tool defaults them. `Direction` picks which way to drive.
The constructor's last two parameters — `drive` and `log` — are exactly the
real class's `Mechanism` piece, just passed straight through instead of
boxed up: `drive` is "send this voltage," `log` is "report what happened,"
and `mechanism` is the actual `Mechanism` this routine requires, so the
scheduler still enforces one command at a time on it, same as every command
you've built since Lesson 1.

**Piece 2 — the two test shapes:**

```java
  /** A slow voltage ramp, so the mechanism is never far from equilibrium: reads kS and kV. */
  public Command quasistatic(Direction direction) {
    double sign = direction == Direction.kForward ? 1.0 : -1.0;
    SysIdRoutineLog.State state = direction == Direction.kForward
        ? SysIdRoutineLog.State.QUASISTATIC_FORWARD
        : SysIdRoutineLog.State.QUASISTATIC_REVERSE;
    double rampVoltsPerSec = m_config.rampRate().in(Volts.per(Second));

    return m_mechanism.run(coroutine -> {
          Timer timer = new Timer();
          timer.start();
          while (!timer.hasElapsed(m_config.timeout().in(Seconds))) {
            m_drive.accept(sign * timer.get() * rampVoltsPerSec);
            m_log.accept(m_routineLog);
            m_routineLog.recordState(state);
            coroutine.yield();
          }
          stop();
        })
        .whenCanceled(this::stop)
        .named("SysId Quasistatic " + direction);
  }

  /** A fixed voltage step, so the mechanism accelerates hard: reads kA. */
  public Command dynamic(Direction direction) {
    double sign = direction == Direction.kForward ? 1.0 : -1.0;
    SysIdRoutineLog.State state = direction == Direction.kForward
        ? SysIdRoutineLog.State.DYNAMIC_FORWARD
        : SysIdRoutineLog.State.DYNAMIC_REVERSE;
    double stepVolts = m_config.stepVoltage().in(Volts) * sign;

    return m_mechanism.run(coroutine -> {
          Timer timer = new Timer();
          timer.start();
          while (!timer.hasElapsed(m_config.timeout().in(Seconds))) {
            m_drive.accept(stepVolts);
            m_log.accept(m_routineLog);
            m_routineLog.recordState(state);
            coroutine.yield();
          }
          stop();
        })
        .whenCanceled(this::stop)
        .named("SysId Dynamic " + direction);
  }
```

**`quasistatic`** ramps voltage up slowly — 1 V per second by default — so
the mechanism is never far from equilibrium; the relationship between volts
and speed at any instant is close to what it would be if you'd just set that
voltage and waited. **`dynamic`** does the opposite on purpose: it snaps to a
fixed voltage — 7 V by default — and watches the mechanism accelerate hard.
One test holds still long enough to read `kS` and `kV` off it; the other
moves fast enough to read `kA` off it. Neither alone gives you all three.

Both are a `while` loop wrapped in `m_mechanism.run(coroutine -> ...)` — the
same shape every timed command in this course has used since Lesson 6's
`driveDistance`. Every tick it drives a voltage, tells the log what happened,
and calls `coroutine.yield()` to hand control back until the timeout runs
out. Then it stops.

**Piece 3 — cleanup, on every exit path:**

```java
  /**
   * Zero volts and NONE, whether the run finished on its own or got interrupted — a coroutine
   * abandons everything after its last yield when canceled, so both endings have to say this.
   */
  private void stop() {
    m_drive.accept(0.0);
    m_routineLog.recordState(SysIdRoutineLog.State.NONE);
  }
}
```

That comment is doing real work, and it's worth spelling out. `.whenCanceled(
this::stop)` looks like it should be the only place `stop()` needs calling —
but Lesson 6 already taught you that a coroutine's own `.whenCanceled(...)`
only fires when something **cancels** the command from outside. Letting the
`while` loop simply run out — the timeout elapsing on its own — is a
*different* ending, and `.whenCanceled(...)` never sees it. That's why `stop()`
is called explicitly at the bottom of both loops in piece 2, *and* wired to
`.whenCanceled(...)` here. Two call sites, because there is still no single
"this runs no matter how the command ends" hook in this framework — you write
the cleanup once and wire it to both endings, the same way `driveDistance` did.

---

## 5. Wire the flywheel up to it

**Add to `Flywheel.java`'s imports:**

```java
import static org.wpilib.units.Units.Second;
import static org.wpilib.units.Units.Seconds;
import static org.wpilib.units.Units.Volts;

import first.robot.commands.SysIdRoutine;
```

**Add to `Flywheel`, next to `m_disconnected`:**

```java
private final SysIdRoutine m_sysId = new SysIdRoutine(
    new SysIdRoutine.Config(), this, "flywheel",
    volts -> m_io.setVoltage(volts),
    log -> log.motor("flywheel")
        .voltage(Volts.of(m_inputs.appliedVolts))
        .angularVelocity(RotationsPerSecond.of(m_inputs.velocityRps)));
```

Read the four arguments as the four things the real routine needs: `Config`
left at its defaults for now (you'll have a reason to change it in a
minute), `this` as the mechanism being characterized, `"flywheel"` as its
name in the log, `volts -> m_io.setVoltage(volts)` as the drive callback —
straight through the door section 3 opened — and the log callback:
`log.motor("flywheel")` names the motor, and `.voltage(...)`/
`.angularVelocity(...)` chain onto it, one call per value the fit needs.

**Add two command factories to `Flywheel`, below `getSpeed()`:**

```java
/** Slow ramp: find where it starts moving and how volts trade for speed. */
public Command sysIdQuasistatic(SysIdRoutine.Direction direction) {
  return m_sysId.quasistatic(direction);
}

/** A voltage step: find how volts trade for acceleration. */
public Command sysIdDynamic(SysIdRoutine.Direction direction) {
  return m_sysId.dynamic(direction);
}
```

Two commands, but four ways to run them: `SysIdRoutine.Direction.kForward`
and `kReverse`, on each.

Now the button bindings — and here's a real choice worth making deliberately.
Every opmode you've built so far has been Teleop or Autonomous, and it would
be easy to just add these bindings to `RobotTeleop` alongside everything
else. Don't. Section 2 already named the reason: characterization is
something you do deliberately, at the bench, never in the middle of a match.
Putting it in `RobotTeleop` means the only thing standing between "driving"
and "sending a ramping voltage into a motor" is remembering not to press two
particular buttons — a *behavioral* guard. This framework hands you a
*structural* one instead.

**`@Utility`** is a third opmode category, alongside `@Teleop` and
`@Autonomous` — for exactly this: something the robot does that isn't
driving and isn't an autonomous plan. A `@Utility` opmode is selected
separately on the driver station, the same way switching between `RobotAuto`
and `RobotAutoBox` back in Lesson 9 was — which means Lesson 9's own finding
applies here for free: selecting a different opmode cancels whatever the
previous one bound, automatically. Put characterization in its own opmode
and there is no button combination on `RobotTeleop`, however unlikely, that
can reach it. You'd have to select "characterize" on purpose first.

**Create `src/main/java/first/robot/opmode/RobotUtility.java`:**

```java
package first.robot.opmode;

import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Utility;

import first.robot.Robot;
import first.robot.commands.SysIdRoutine;

/**
 * A separate opmode for characterization, deliberately reachable only from
 * here — see Lesson 34.
 */
@Utility
public class RobotUtility extends PeriodicOpMode {
  private final Robot robot;

  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotUtility(Robot robot) {
    this.robot = robot;

    // Four two-button combinations, so nobody trips a characterization run
    // reaching for a single button by accident — the same "hard to do by
    // accident" reasoning that put homing on its own button back in
    // Lesson 21, one guard further out than that.
    robot.driverController.back().and(robot.driverController.northFace())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kForward));
    robot.driverController.back().and(robot.driverController.southFace())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kReverse));
    robot.driverController.start().and(robot.driverController.northFace())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.kForward));
    robot.driverController.start().and(robot.driverController.southFace())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.kReverse));
  }

  @Override
  public void periodic() {}
}
```

Nothing here is new syntax — it's built the exact same way `RobotTeleop` and
`RobotAuto` are: extend `PeriodicOpMode`, take the shared `Robot` in your
constructor, wire bindings there. `@Utility` is annotated bare, no
`name`/`group`, because there's only one of them, same as `@Teleop` — you'd
only need to name it if this project grew a second characterization opmode
the way Lesson 9 grew a second autonomous.

**`Trigger.and(...)`** is doing real work here too, not just saving buttons.
Every `Trigger` you've built since Lesson 21 has answered one boolean
question; `.and(...)` combines two of them into a `Trigger` that's only true
while *both* are. Four two-button combinations, inside an opmode you already
can't reach by accident, means nobody trips a characterization run without
clearing two separate hurdles on purpose.

---

## 6. Run it, and read what happened

`./gradlew simulateJava`. In SimGUI, pick **RobotUtility** from the opmode
selector — same move as picking **My Teleop** back in Lesson 1, just a
different opmode — then set Robot State to enabled. Hold **Back + North
face** for a few seconds — the wheel should spin up slowly and smoothly.
Let go, let it coast, then hold **Start + North face** — this time it should
snap forward hard. Both directions work the same in reverse with the
**south face** button instead.

Notice what *isn't* happening: nothing about `RobotTeleop` changed, and
nothing in it needed to know characterization exists. Reselect **My
Teleop** afterward and drive normally — the flywheel's `idle()` default
command is still there, untouched, because `RobotUtility` never touched it
either.

Every run writes to the same `.wpilog` file `DataLogManager.start()` already
opens in `Robot()`'s constructor — the one this whole track's `SmartDashboard.
put*` calls have been landing in since Lesson 3. That's worth stating plainly,
because it's a genuine difference from the course this lesson was ported
from: on a track with a separate AdvantageKit `Logger`, `SysIdRoutineLog`
writes through WPILib's own `DataLogManager` instead, landing in a *second*
file. This track never installed that separate `Logger` — every value has
always gone through `DataLogManager` — so there was only ever one file to
begin with, and SysId data joins it, distinguished by its own keys:
`sysid-test-state-flywheel` for which test is running, and
`voltage-flywheel-flywheel` / `velocity-flywheel-flywheel` for the readings
`log.motor("flywheel")` published (the motor name and the routine's own name
both happen to be `"flywheel"` here, which is why it repeats). One log, not
two.

**Analyze it:** open the SysId tool from the WPILib extension's tool
launcher, point it at the `.wpilog` you just recorded (log-file mode, not
live), select the `flywheel` mechanism, and let it fit `kS`/`kV`/`kA` to the
four runs. (Menus drift between seasons more than APIs do — if what you see
doesn't match what's described here, the tool's own help is the current
source of truth, not this paragraph.)

Compare what it hands back to `FlywheelConstants`.

*Nothing to add — this is code you already have:*

```
kFlywheelKS = 0.15   // volts to overcome friction
kFlywheelKV = 0.12   // volts per rotation/sec
kFlywheelKA = 0.106  // volts per rotation/sec²
```

`kV` should land close — within a few percent, verified in this course's own
simulated run. `kA` should be in the right neighborhood. And `kS` — the
number this course has never once been able to compute, only assert — will
probably come back *nowhere near* 0.15. Possibly several times too big.

Before you conclude the model was wrong: it might be. It also might be that
the test was wrong for this mechanism, and section 7 is how you tell the
difference.

---

## 7. Is it real, or is it the test?

Here's the number, measured in this course's own simulation so you have
something concrete to check your own run against: characterizing the
flywheel with `SysIdRoutine.Config()` left at its defaults, using the
percent of steady-state speed reached at a given voltage as the yardstick
(the tool's own curve fit isn't available inside this port's sandbox, but
the shape of the effect is the same thing it would show): the default 1 V/s
ramp reaches only **42.5%–80.6%** of steady-state speed across 1.0–5.0 V —
consistently short of where a truly quasistatic run should sit. `kV` comes
back fine either way. Something is wrong, and it isn't the wheel.

**Quasistatic only means something if the mechanism is actually close to
equilibrium the whole time it runs.** The default ramp — 1 V per second —
is a reasonable choice for a typical drivetrain or arm. This flywheel is
neither: it's direct drive, it's light, and it responds fast. Ramped at
1 V/s, it never stops accelerating long enough to be "quasi" anything — the
test is quietly measuring some of its own ramp rate and reporting it back
to you labeled `kS`.

The fix is one number.

**Replace the `SysIdRoutine.Config()` in `Flywheel`:**

```java
// A quarter of the default ramp rate: this wheel is light and direct-drive,
// so 1 V/s never lets it sit still long enough to be "quasi" anything — see
// Lesson 34 section 7. The longer timeout gives the slower climb room to
// reach a useful voltage before the routine gives up on its own.
private final SysIdRoutine m_sysId = new SysIdRoutine(
    new SysIdRoutine.Config(Volts.of(0.25).per(Second), Volts.of(7), Seconds.of(30)),
    this, "flywheel",
```

A quarter of the ramp rate, and the timeout stretched to 30 seconds so the
slower climb still has room to reach a useful voltage before the routine
gives up and stops on its own. Re-run and re-analyze: at that slower ramp,
this course's own measured run reaches **75.4%–95.6%** of steady-state speed
across the same voltage range — closer to equilibrium at every point, which
is exactly the direction a smaller apparent `kS` would move in. `kV` barely
moves — the back-EMF term was never the problem. `kA`, which had been
quietly corrupted right along with `kS`, improves the same way.

**The lesson isn't "trust the slower number more."** It's that a
characterization result is only as good as the test that produced it, and a
mechanism that never gets close to steady state is the tell — check the ramp
rate against how fast the mechanism actually responds before you believe the
number it hands back.

---

## 8. A mechanism that can run out of room

Everything so far worked partly because a flywheel can spin forever. Section
2 said that was why it went first; here is the other half of that sentence.

Your elevator has **1.5 m** of travel. A characterization run drives it open
loop, at a voltage that only goes up, for as long as the routine says — and
the elevator has nowhere to put the extra.

### What still protects you, and what doesn't

You built two position protections into this robot, and open loop treats them
completely differently.

**Lesson 18's `clampToTravel` does nothing here.** It clamps the *goal*,
inside `Elevator.goToHeight`. SysId never calls `goToHeight` — it calls
`setVoltage` on the IO layer directly, which is the entire point of an
open-loop test. The clamp isn't overridden or ignored; it simply is not on
the path.

**A firmware soft limit, on the other hand, holds.** It's a
`SoftwareLimitSwitchConfigs` value set once at construction, enforced where
output leaves the motor controller, so it doesn't care which control mode
asked. Driving an elevator-shaped rig open loop at 6 V for four seconds,
against a 1.5 m travel limit, with a forward soft limit in place:

*Nothing to add — measured, not asserted:*

```
no soft limit   : ended at 2.355 m  (well past the top)
with soft limit : ended at 1.501 m, applied volts 0.000
```

That is exactly the distinction Lesson 20 drew when it added soft limits to
the arm — *the clamp is your code's opinion, the soft limit sits below your
code and holds when the logic is wrong* — and a SysId run is the case where
your code's opinion is never consulted at all.

> **Your simulator will not show you this, and that's worth knowing before
> you trust a clean sim run.** `ElevatorIOSim` builds its `ElevatorSim` with
> `kMinHeight` and `kMaxHeight`, which makes the *physics model itself* a
> wall at 1.5 m. Running the real sim elevator open loop into the top, the
> carriage stops at exactly the physics wall — before the soft limit's own
> threshold has any reason to fire. Add the soft limit and sim behaves
> identically, because it was already refusing to go past travel. A real
> elevator has no such courtesy; it has a hard stop and a gearbox. This is
> the same lesson section 9 is about, arriving early: **the simulation is
> not where you find out whether your guards work.**

**Add to `ElevatorIOTalonFX`'s config, before `apply`:**

```java
// The firmware's own top stop. Open loop bypasses the goal clamp in
// Elevator.goToHeight; it does not bypass this. There's deliberately no
// reverse limit here: it would be measured from the same relative zero
// home() has to drive past to find the real floor, so it would fight
// the very routine that gives that zero meaning. The bottom limit switch
// is what actually stops home() — see Elevator.home().
config.SoftwareLimitSwitch.ForwardSoftLimitEnable = true;
config.SoftwareLimitSwitch.ForwardSoftLimitThreshold =
    metersToRotations(ElevatorConstants.kMaxHeight.in(Meters));
```

Thresholds are in *mechanism* rotations, and `SensorToMechanismRatio =
kGearRatio` already made those drum rotations — so `metersToRotations` is the
same conversion Motion Magic's own limits use, which is why it was
`protected` rather than `private` all along.

That comment is worth reading twice, because the missing half of this guard
isn't an oversight — it's a measured trap this lesson walked into and is
handing you the way out of. A first pass at this section added a matching
*reverse* soft limit, at `kMinHeight`, the mirror image of the forward one
above. It broke Lesson 32's already-passing `ElevatorHomingTest` — homing,
which used to finish in about 4.6 seconds, was still crawling downward at
20 seconds and counting, at roughly a quarter of its normal rate. Not
refused outright — just slower, in a way that looked exactly like a weak
motor rather than a limit doing its job. **That's the actual danger of a
misconfigured limit: it doesn't fail loud, it fails by making the mechanism
seem broken**, the same shape of trap Lesson 21's fail-safe wiring and
Lesson 30's brownout were both about.

Here's why it happened. A relative encoder reads zero wherever the carriage
happens to be sitting the moment power comes on (Lesson 21) — that's not
"the floor," it's "wherever it was." `home()`'s entire job is to drive
*past* that arbitrary zero, down to the real floor the bottom limit switch
finds. A reverse soft limit registered at `kMinHeight = 0` is measured from
that same untrusted boot-time zero — and because `kMinHeight` happens to
*be* zero, the threshold and the boot-time reading start out equal. The
limit engages immediately, and fights the one routine whose whole purpose is
to drive through it. **A soft limit only protects you once the encoder it's
measured against means something real — and on this elevator, that doesn't
happen until `home()` has already run.** The forward limit above has no such
problem: nothing this elevator ever does drives it upward before it's
homed, so a boot-time zero it might be measured against never comes into
play. Home the elevator first, every time, before any open-loop run near the
bottom — the bottom limit switch is still there to catch you if you don't,
but a soft limit that fights your own homing routine is worse than no soft
limit at all, because it looks like protection.

### Now the awkward part: section 7 and your travel budget disagree

Section 7 told you to slow the ramp down, and it was right — that's what
made the quasistatic run land closer to equilibrium. It's also the single
most expensive thing you can do to a mechanism that can run out of room, and
it's worth seeing the size of it. Same rig, measuring how far the carriage
travels before the ramp reaches 6 V:

*Nothing to add — measured, not asserted:*

```
ramp 1.00 V/s  ->  6 V after 6.0 s,   travelled 1.517 m
ramp 0.50 V/s  ->  6 V after 12.0 s,  travelled 3.041 m
ramp 0.25 V/s  ->  6 V after 24.0 s,  travelled 6.284 m
```

**Halve the ramp rate and you double the distance.** The mechanism spends
twice as long at every voltage on the way up, so it covers twice the ground
getting there. Section 7's recommended 0.25 V/s would need over **6 metres**
of elevator to reach 6 V. You have 1.5 m.

So the thing that made the flywheel's quasistatic run trustworthy is the
thing you cannot afford here, and there's no clever way out of it — the two
goals genuinely pull opposite directions. What you do instead is give up
voltage range rather than give up ramp rate: keep the ramp slow, accept that
the run ends early against the soft limit, and fit the gains over the
smaller span of voltage you actually got. A short honest run beats a long one
that spent its last second driving into a hard stop.

### And lower the step voltage

The dynamic test has the same problem in a more concentrated form, since it
jumps straight to full step voltage and stays there. Same rig, 1.5 seconds:

*Nothing to add — measured, not asserted:*

```
step 7.0 V  ->  travelled 1.010 m
step 4.0 V  ->  travelled 0.578 m
step 2.0 V  ->  travelled 0.268 m
```

The default 7 V step eats **two-thirds of the elevator's entire travel in a
second and a half** — and `Config`'s default timeout is ten seconds. Drop the
step voltage until the run fits: 2–4 V is a reasonable starting point for this
elevator, and you can raise it once you've watched one run finish safely.

You lose nothing important by doing this. `kA` is a slope — volts per unit of
acceleration — and a smaller step measures the same slope over a smaller
range. What you must not do is keep 7 V and shorten the timeout instead,
hoping it stops in time. The timeout is a backstop, not a plan.

### Two more things gravity changes

Unlike the flywheel, the elevator is pulled on constantly, and that makes
forward and reverse genuinely different tests rather than mirror images.

- **Start at the end you're driving away from.** Forward on the elevator means
  up, so start at the bottom; reverse means down, so start near the top.
  Getting this backwards wastes the run and finds the hard stop in about a
  second.
- **Reverse runs are the dangerous ones.** Driving down, gravity is helping,
  so the mechanism reaches a given speed at a *lower* voltage than the model
  suggests and keeps accelerating past where your intuition says it should.
  When a run ends — finished, cancelled, or stopped by a soft limit — the
  motor is handed zero volts, and what that means on a gravity-loaded
  mechanism is worth establishing deliberately near the bottom of travel,
  not at full extension.

---

## 9. Computed vs. measured — and the one thing sim can't show you

Here's the honest part, and it's worth sitting with rather than skating past.

`FlywheelSim`, underneath everything in this course, has never modeled
friction — Lesson 29 already proved this by hand, watching a wheel with
`kS = 0.05` reach 0.37 rot/s from a standing start instead of staying put.
So when you characterize the flywheel *in this simulation*, section 7's
slower-ramp result isn't measuring hardware friction. It's measuring what's
left of a ramp-rate artifact once you've mostly, but not perfectly, slowed
it down enough to stop mattering. Slow the ramp further and it keeps
shrinking toward zero, because zero is the actual answer this simulated
wheel has always had — there was never any friction in it to find.

That's not a failure of the exercise. It's the same thing Lesson 29 told you
about `kS`, confirmed a second way: **a simulation can only teach you what it
models.** `kV` and `kA` came back honest because `FlywheelSim`'s physics
genuinely has a back-EMF term and genuinely has inertia — those measurements
mean something. `kS` came back as "however close to zero I managed to get
the test," because there was never a real friction number underneath it to
converge on.

On your actual robot, this section reads differently, and better. The
friction in a real Kraken's bearings is real. The efficiency loss in a real
gearbox is real. A real wheel's moment of inertia is whatever the CAD model
didn't quite capture. When you run this same characterization on real
hardware, `kS` will land on a real number — not zero, not an artifact — and
it will very likely disagree with 0.15 by more than measurement noise
explains. That disagreement isn't a bug in the lesson. It's the entire
reason `SysIdRoutine` exists: to measure the thing a spec sheet was always
just guessing at.

---

## Try it

1. **Characterize the elevator, and budget the run before you build it.**
   Section 8 gives you the two numbers that matter: how far the carriage
   travels per volt of ramp, and how far a step voltage carries it in a
   second and a half. Work out a `Config` that fits inside 1.5 m *before*
   writing any code, then add the soft limit, home it, and find out whether
   your budget was right. Predict `kS`/`kV`/`kA` first, too — you already
   know what `ElevatorIOSim` does and doesn't model.
2. **Find the ramp rate that's "slow enough."** Section 7 used 0.25 V/s.
   Try 0.5 V/s and 0.1 V/s on the flywheel and watch how close to
   steady-state each one gets. Is the relationship linear? At what point
   does going slower stop changing the answer? (Do this on the flywheel, not
   the elevator — section 8 explains why that's not an accident.)
3. **Write your team's power-on checklist.** Section 2 is a starting point,
   not a finished one — it doesn't know your robot's specific pinch points,
   your specific current limits, or which mechanism your team is most
   nervous about. Write the version that's actually about your robot.
4. **Read the dynamic test's own log by hand.** Before trusting the analysis
   tool, open the `.wpilog` from a `sysIdDynamic` run and look at how fast
   velocity climbs right after the voltage step. That climb rate *is* what
   `kA` measures — seeing it once by eye is worth more than reading the
   definition twice.
5. **Find the reverse soft limit's real fix.** Section 8 shipped the
   elevator with a forward limit only, because a reverse one at `kMinHeight`
   fights homing. Real teams still often want *some* protection on the
   bottom for a post-homing SysId run. What would it take to enable a
   reverse limit only after `isHomed()` returns true? (`TalonFXConfigurator.
   apply(...)` can be called more than once — it isn't limited to
   construction time.)
6. **Watch the opmode guard actually work.** Start a `sysIdQuasistatic` run
   in `RobotUtility`, then switch back to **My Teleop** (disabling first, if
   your driver station's UI insists on that before it lets you switch).
   Confirm the wheel stops and stays stopped once you re-enable in Teleop —
   there's no `sysIdQuasistatic` command left running to fight your normal
   driving. That's the same opmode-scoping Lesson 9 found protecting
   `RobotAuto`'s plan, doing the identical job here.

---

## What you learned

The gains this course taught you to compute were never a finish line — they
were a stand-in good enough to build thirty-three lessons of simulation on
top of, and today you met the tool that replaces "stand-in" with "measured."
Since the framework hadn't shipped that tool yet, you built it — a small
`SysIdRoutine` around the one piece that *had* been ported,
`SysIdRoutineLog`, reproducing the real routine's two shapes: a slow ramp for
`kS`/`kV`, a fast step for `kA`, both landing in the same log this whole
track has been writing to since Lesson 3.

Section 5 added a structural habit worth keeping past this lesson:
**`@Utility`** gave characterization its own opmode instead of a corner of
`RobotTeleop`, which turns "don't press these buttons during a match" from
something you have to remember into something that's true by construction —
you'd have to select the wrong opmode on purpose. The same opmode-scoping
Lesson 9 found protecting `RobotAuto`'s plan turned out to protect this too,
for free.

The harder lesson sat in section 7: **a characterization is only as
trustworthy as the test that produced it**, and a mechanism that never gets
close to steady state is more often a ramp rate that's wrong for the
mechanism than a spec sheet that's wrong for the robot — check the test
before you doubt the model.

Section 8 then took that away again, at least partly, and added a second
lesson you didn't expect: a soft limit protects you only once the encoder
it's measured against actually means something, and on a mechanism that
needs homing, that isn't true until homing has run. Get the reference frame
wrong and a guard doesn't fail loud — it fails by making the mechanism look
weak, the same shape of trap this course keeps returning to. Past that, the
slow ramp that fixes a quasistatic run on open ground is the same slow ramp
that runs a bounded mechanism out of room — **halve the rate, double the
distance** — so you trade voltage range for safety and fit the gains over
whatever span you actually survived. **The guard that survives your logic
being absent is the only one that was ever really a guard**, worth
remembering as a general shape, not just a SysId detail. And the most honest
lesson sat in section 9: simulation measured `kV` and `kA` faithfully because
it actually models the physics behind them, and it could only approximate
`kS` toward zero, because there was never real friction in it to measure.
Your real robot doesn't have that excuse, which is exactly why this tool is
worth having learned before build team hands you one.

None of this replaces understanding the model — it confirms it, or it tells
you honestly where the model and the machine parted ways. Either answer is
worth having.
