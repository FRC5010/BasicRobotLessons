# Lesson 33 — Tuning your robot when build team hands it over

**Goal:** Meet the real machine your computed gains have been standing in
for, put a number on how close they were, and pick up the tool teams use to
measure what a spec sheet can't tell you, along with the habit of checking
every number it hands back.

**New Java concepts**
- `Trigger.and(...)`, from Lesson 22, on two buttons this time — so a
  characterization run needs both held at once.

**New robot concepts**
- **`SysIdRoutine`** — WPILib's own tool for Commands V3. It drives a
  mechanism open loop in two deliberate patterns and logs exactly what it
  needs to fit `kS`/`kV`/`kA` from the result, instead of you computing them.
- **`@Utility`** — a third opmode category, alongside `@Teleop` and
  `@Autonomous`, for things a robot does that aren't driving or an
  autonomous plan. Characterization lives here, in its own opmode, not
  bolted onto teleop.
- **A safe first power-on**, as a procedure, not a piece of code.
- **A characterization result is a claim, not a fact** — each gain gets one
  quick check against something you already know (the motor's free speed,
  the wheel's inertia, a voltage too small to matter) before it goes into
  `Constants`.
- **Characterizing something with finite travel**, where the run you'd like
  to make and the room the mechanism has pull against each other.

---

## 1. None of your numbers are about this robot yet

Every gain in this course so far came from the motor's published numbers.
`kV = 0.119` isn't a measurement of your flywheel — it's `12 V ÷ 101.08
rot/s`, the Kraken X60's 6065 RPM free speed from CTRE's dynamometer data, a
fact about a Kraken X60 in general, computed the same way for a flywheel, an
elevator, and an arm since Lesson 18. It has been right *enough* to build this
entire course in simulation, because the simulated motors are built from the
same numbers. A real Kraken doesn't know what its own published numbers say.
It has bearing friction, wiring resistance, a wheel that weighs slightly more
than CAD said, and none of that shows up until voltage actually moves through
actual copper.

That's what today closes the gap on. **`SysIdRoutine`** drives a mechanism
with two carefully-shaped voltage patterns, logs what happened, and fits the
same three terms you've been computing by hand since Lesson 18 — except this
time they come from the machine instead of the datasheet. Where the two
agree, the spec-sheet math was a good stand-in. Where they don't, the
difference has a name: friction, efficiency, or a mass that isn't what you
thought.

Here's the good news: **you don't have to build the tool.** Commands V3 ships
its own `SysIdRoutine`, in `org.wpilib.command3.sysid`, written for
`Mechanism`s and coroutines. It does the part that's easy to get subtly
wrong (the ramp, the step, the cleanup when a run ends) and writes its
measurements to the log the SysId analysis tool reads. What it can't know is
how *your* motor takes a voltage and how *your* sensors report back, so the
work in this lesson is wiring those two things up, and then deciding whether
to believe what comes out.

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
part of why this lesson picked it. **Section 8 is what changes when you point
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
- **Confirm the current limits from Lesson 29 are actually in the config that
  ships to this motor.** They already are, if you've followed the course —
  this is the moment to double-check, not assume.
- **Clear the area.** Nothing above, below, or beside the wheel that a hand,
  a wire, or a shoe could reach.
- **Start disabled, and only enable right before you run one test.** Not
  "enable and then get ready" — get ready, *then* enable.
- **Watch current, not just speed, the first time.** A locked rotor draws
  huge current and barely spins — Lesson 29 measured this directly. If the
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

## 4. Meet `SysIdRoutine`

Nothing to type in this section: it's the tour of a class WPILib already wrote,
so the next section's code makes sense. `SysIdRoutine` lives in
`org.wpilib.command3.sysid`, and you build one out of two things.

**A `Config`** says how fast to ramp, how big a step to take, and how long to
run before the routine stops itself. `SysIdRoutine.Config.defaults()` is 1 volt
per second, 7 volts and 10 seconds. `SysIdRoutine.Config.useDataLog(rampRate,
stepVoltage, timeout)` is the same thing with your own three numbers, and
Try It #2 uses it. (There's also a four-argument constructor whose
last argument sends the test state somewhere other than WPILib's own log. This
course keeps the log.)

**A `SysIdRoutine.SysIdMechanism`** says how to reach one particular
mechanism. The name is the awkward bit: `org.wpilib.command3.Mechanism` is
already the base class of every subsystem in this course, so WPILib called
this one `SysIdMechanism`. It takes four things, in this order:

- `drive` — a lambda that receives a `Voltage` and sends it to the motor.
- `log` — a lambda that receives a `SysIdRoutineLog` and reports what the
  mechanism is doing right now, voltage and velocity.
- the `Mechanism` being characterized. The routine's commands require it, so
  the scheduler still allows one command at a time on it, same as every
  command you've built since Lesson 1.
- a name, which ends up in the log keys.

From a routine you get commands, two tests in each of two directions:
`quasistatic(direction)` and `dynamic(direction)`, where `direction` is
`SysIdRoutine.Direction.FORWARD` or `SysIdRoutine.Direction.REVERSE`.

**`quasistatic`** ramps voltage up slowly — 1 V per second by default — so
the mechanism is never far from equilibrium; the relationship between volts
and speed at any instant is close to what it would be if you'd just set that
voltage and waited. **`dynamic`** does the opposite on purpose: it snaps to a
fixed voltage — 7 V by default — and watches the mechanism accelerate hard.
The ramp is where `kS` and `kV` are easiest to see; the step is where `kA`
shows. The analysis tool fits all four runs together, and section 7 comes
back to why it wants both shapes.

Both commands call your `drive` and `log` lambdas once per tick for as long as
they run. A test ends when its timeout runs out, or when something cancels
it (letting go of a button will, in the next section). **Either way the
routine drives zero volts and records that the test has ended**, so there's
no cleanup for you to remember. Measured: with two tests run to their timeout and two cancelled by letting
go, each of the four left a `none` in the log to mark its end.

---

## 5. Wire the flywheel up to it

**Add to `Flywheel.java`'s imports:**

```java
import static org.wpilib.units.Units.Volts;

import org.wpilib.command3.sysid.SysIdRoutine;
```

**Add to `Flywheel`, next to `m_disconnected`:**

```java
private final SysIdRoutine m_sysId = new SysIdRoutine(
    SysIdRoutine.Config.defaults(),
    new SysIdRoutine.SysIdMechanism(
        volts -> m_io.setVoltage(volts.in(Volts)),
        log -> log.motor("flywheel")
            .voltage(Volts.of(m_inputs.appliedVolts))
            .angularVelocity(RotationsPerSecond.of(m_inputs.velocityRps)),
        this, "flywheel"));
```

Read it as the two things from section 4. `Config.defaults()` is the 1 V/s,
7 V, 10 s routine, and it's what you'll run first (Try It #2 changes it).
Then the `SysIdMechanism`'s four arguments: the drive lambda sends the `Voltage` it's given straight through
the door section 3 opened, unpacking it with `.in(Volts)` because
`setVoltage` takes a plain number; the log lambda names a motor with
`log.motor("flywheel")` and chains `.voltage(...)` and `.angularVelocity(...)`
onto it, one call per value the fit needs, from the readings `Flywheel`
already keeps; `this` is the mechanism being characterized; and `"flywheel"`
is its name in the log.

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

Two commands, but four ways to run them: `SysIdRoutine.Direction.FORWARD`
and `REVERSE`, on each.

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
and `RobotAutoBox` back in Lesson 9 was — and Lesson 9's finding carries
over: bindings belong to the opmode that made them, and selecting a
different opmode switches them off. Put characterization in its own opmode
and there is no button combination on `RobotTeleop`, however unlikely, that
can reach it. You'd have to select "characterize" on purpose first.

**Create `src/main/java/first/robot/opmode/RobotUtility.java`:**

```java
package first.robot.opmode;

import org.wpilib.command3.sysid.SysIdRoutine;
import org.wpilib.opmode.PeriodicOpMode;
import org.wpilib.opmode.Utility;

import first.robot.Robot;

/**
 * A separate opmode for characterization, deliberately reachable only from
 * here — see Lesson 33.
 */
@Utility
public class RobotUtility extends PeriodicOpMode {
  /** The Robot instance is passed into the opmode via the constructor. */
  public RobotUtility(Robot robot) {
    // Four two-button combinations, so nobody trips a characterization run
    // reaching for a single button by accident — the same "hard to do by
    // accident" reasoning that put homing on its own button back in
    // Lesson 21, one guard further out than that.
    robot.driverController.back().and(robot.driverController.faceUp())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.FORWARD));
    robot.driverController.back().and(robot.driverController.faceDown())
        .whileTrue(robot.flywheel.sysIdQuasistatic(SysIdRoutine.Direction.REVERSE));
    robot.driverController.start().and(robot.driverController.faceUp())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.FORWARD));
    robot.driverController.start().and(robot.driverController.faceDown())
        .whileTrue(robot.flywheel.sysIdDynamic(SysIdRoutine.Direction.REVERSE));
  }

  @Override
  public void periodic() {
    /* Nothing to do each tick: the bindings above do all the work. */
  }
}
```

It's built the same way `RobotTeleop` and `RobotAuto` are — extend
`PeriodicOpMode`, take the shared `Robot` in your constructor, wire bindings
there — and, like them, it has to override `periodic()` even when it has
nothing to say. `@Utility` is annotated bare, no `name`/`group`, because
there's only one of them, same as `@Teleop` — you'd only need to name it if
this project grew a second characterization opmode the way Lesson 9 grew a
second autonomous.

The opmode is also what makes the guard real. Its bindings exist only while
it's the selected opmode, so there is nothing for Teleop to trip, however the
buttons are held. Measured: with Back + the top face button still held down,
switching from `RobotUtility` to `RobotTeleop` leaves the flywheel at its
idle speed (3.59 V) and the `sysid-quasistatic-forward-flywheel` command gone.

**`Trigger.and(...)`** is doing real work here too, not just saving buttons.
In Lesson 22 it stacked a sensor reading onto a button; here it combines two
buttons into a `Trigger` that's only true while *both* are held. Four two-button combinations, inside an opmode you already
can't reach by accident, means nobody trips a characterization run without
clearing two separate hurdles on purpose.

---

## 6. Run it, and read what happened

Run the robot in simulation. In SimGUI, pick **RobotUtility** from the opmode
selector — same move as picking **My Teleop** back in Lesson 1, just a
different opmode — then set Robot State to enabled. Hold **Back + the top
face button** for a few seconds — the applied voltage climbs steadily, and the
wheel, after a dip (see the note below), spins up slowly and smoothly.
Let go, let it coast, then hold **Start + the top face button** for the whole
ten seconds — this time it should snap forward hard and then level off. Both
directions work the same in reverse with the bottom face button instead. A
test ends by itself when its timeout runs out (10 seconds at the defaults)
even if you're still holding the buttons. Section 7 reads the level-off, so
let each dynamic test have its full ten seconds.

Notice what *isn't* happening: nothing about `RobotTeleop` changed, and
nothing in it needed to know characterization exists. Reselect **My
Teleop** afterward and drive normally — the flywheel's `idle()` default
command is still there, untouched, because `RobotUtility` never touched it
either.

Every run lands in a log file, but not AdvantageKit's, and that's easy to
trip over. `SysIdRoutine` writes through `SysIdRoutineLog`, which uses WPILib's own
`DataLogManager` (it calls `DataLogManager.getLog()` directly), not
AdvantageKit's `Logger`. That's the log `DataLogManager.start()` opens in
`startLogging()`, the line Lesson 13 kept so that everything published
outside AdvantageKit still gets saved. So every run leaves **two** files in
`logs/`: AdvantageKit's `akit_….wpilog`, with every input and output, and
WPILib's `WPILIB_….wpilog`, which is where the characterization data is.
It has its own keys there: `sysid-test-state-flywheel` for which test is
running, and `voltage-flywheel-flywheel` / `velocity-flywheel-flywheel` for
the readings `log.motor("flywheel")` published (the motor name and the
mechanism's name both happen to be `"flywheel"` here, which is why it
repeats). All three were read out of the `WPILIB_` file of a real run, and
none of them is in the `akit_` file beside it. **For the analysis, open the
`WPILIB_` file.**

> **The wheel doesn't start from rest.** The `idle()` default command from
> Lesson 28 is still what the flywheel is doing when you press the buttons,
> so every run begins with the wheel at the 30 rot/s idle speed, and the
> routine's first act is to cut its voltage to zero. Measured on a forward
> quasistatic run at the defaults: the wheel coasts down from 30 rot/s to
> 13 rot/s over the first 1.6 seconds — by which point the ramp is at 1.5 V —
> and only then starts to climb. Everything in that stretch describes a wheel
> spinning down, not a wheel being ramped up. Look at the velocity plot
> before you trust a fit, and ignore the part before speed turns upward.
> Try It #7 asks what it would take to start from rest.

**Analyze it:** open the SysId tool from the WPILib extension's tool
launcher, point it at the `WPILIB_….wpilog` you just recorded (log-file
mode, not live), select the `flywheel` mechanism, and let it fit `kS`/`kV`/`kA` to the
four runs. (Menus drift between seasons more than APIs do — if what you see
doesn't match what's described here, the tool's own help is the current
source of truth, not this paragraph.)

Compare what it hands back to `FlywheelConstants`.

*Nothing to add — this is code you already have:*

```
kFlywheelKS = 0.15   // volts to overcome friction
kFlywheelKV = 0.119  // volts per rotation/sec
kFlywheelKA = 0.105  // volts per rotation/sec²
```

For a rough idea of what to expect, this course's own simulated run (the
four tests at the defaults) can be fit by hand with the model the tool's
source uses: one fit over all four tests together, with a term for
acceleration, `V = kS·sign(v) + kV·v + kA·a`. That gives `kV` 0.118, `kA`
0.106 and `kS` under 0.01 V. Those numbers come from a hand fit, not from the
tool: this repo's checks can't run the SysId tool, and the tool filters and
trims the data its own way, so expect its numbers to land near these, not on
them. If your `kS` comes back nowhere near the 0.15 the course has carried
since Lesson 28, that's the number to look at hardest.

**Don't paste any of them into `Constants` yet.** The tool will hand you a
`kS`, a `kV` and a `kA` whether or not the runs behind them were any good, and
a number you paste in unchecked is a guess with a decimal point on it.
Section 7 is how you check each one.

---

## 7. Is it real? One quick check per number

A characterization result is a claim. The tool is a least-squares fit, and a
fit always has an answer: a bad ramp, a wheel that slipped, a log from the
wrong motor, and it still hands back three tidy numbers. What catches that
isn't a better tool. It's you holding each number up against something you
already know. Every gain gets one check (`kV` gets two), and none takes more
than a few minutes. Every figure below is from this course's own simulation,
so you have something concrete to compare your run against. The gains in them
are the hand fit from section 6, not the tool's.

### `kV`: two checks

**Free speed.** `kV` is volts per rotation per second, so 12 V ÷ `kV` is the
speed at which the wheel runs out of voltage. That should land near the
motor's free speed, the 101.08 rot/s (6065 RPM) that `kFreeSpeed` and Lesson
28's arithmetic already use: 12 ÷ 0.118 = 101.7. A real wheel comes in a
little under its datasheet, from friction and belts, but a factor of two
means the fit or the log is wrong, not the motor. (If a gearbox sits between
the motor and whatever the log measures, divide the free speed by the gear
ratio first.)

**The plateau.** In the dynamic test the voltage steps to 7 V and stays
there, and the wheel levels off. At the plateau nothing is accelerating, so
all 7 V is going into speed, and speed ÷ 7 V is 1 ÷ `kV`. (A wheel with
friction levels off a little lower, by a fraction `kS` ÷ 7.) Open the
`WPILIB_` log, find the end of a forward dynamic run — the last
`velocity-flywheel-flywheel` values before `sysid-test-state-flywheel` goes
back to `none` — and divide. This course's wheel levels off at 59.3 rot/s;
59.3 ÷ 7 = 8.47 rot/s per volt, and 1 ÷ 0.118 = 8.47. The reverse run levels
off at −59.2. Forward, the wheel is within 1% of that after about 3.6 seconds;
in reverse it takes about 6.8, because it has to turn around first. Hold the
buttons for the whole ten seconds.

### `kA`: it has to match the wheel's inertia

`kA` is the voltage it takes to speed the wheel up: volts per rotation per
second squared. You computed it in Lesson 28 from the wheel's inertia, so that
arithmetic is your check. `J × 2π × 1.677` with `J` = 0.01 kg·m² is 0.105, and
the hand fit says 0.106. On a real robot `J` comes from CAD, which is a guess of
its own, so expect rough agreement rather than three digits. A factor of two
between the tool's `kA` and the CAD number means one of them is wrong, and
that's worth finding out before you size a shooter around it.

### `kS`: a voltage that small has to leave the wheel still

`kS` is the voltage it takes to get the wheel moving at all. Of the three it's
the one you can't compute (Lesson 28 said so), and the easiest to check with
your own hands: apply a voltage far below the `kS` you were handed and see
whether the wheel turns. If the tool says 0.9 V, then 0.05 V has to leave a
resting wheel resting.

Section 3 opened the door for this, `setVoltage`. What's missing is a command
that holds one.

**Add to `Flywheel`'s imports, with the other `units.measure` ones:**

```java
import org.wpilib.units.measure.Voltage;
```

**Add to `Flywheel`, below `sysIdDynamic`:**

```java
/** Hold one small, fixed voltage, to see what the wheel does on a voltage you pick. */
public Command holdVoltage(Voltage volts) {
  double raw = volts.in(Volts);
  return runRepeatedly(() -> m_io.setVoltage(raw)).named("Hold Voltage");
}
```

**Add to `RobotUtility`'s imports, above the others (static imports go first):**

```java
import static org.wpilib.units.Units.Volts;
```

**Add to `RobotUtility`'s constructor, below the four bindings:**

```java
// 0.05 V can't hurt anything, so this one is a single button: hold it to
// see whether the wheel turns on a voltage far below any friction.
robot.driverController.rightBumper()
    .whileTrue(robot.flywheel.holdVoltage(Volts.of(0.05)));
```

The four tests have two buttons each because they drive the wheel up to 7 V or
more. 0.05 V can't spin anything up, so one button is enough.

Run the robot in simulation, select **RobotUtility**, enable it, and hold the
**right bumper** for ten seconds while you watch `Flywheel/VelocityRps`. The
wheel starts at its idle speed, so it coasts down first: about 13 rot/s after
one second, under 2 after three, 0.56 at five. Then it settles at
**0.41 rot/s** by about nine seconds, and stays there. It's still turning.
0.05 V × 8.47 rot/s per volt = 0.42.

A wheel that turns on 0.05 V doesn't have 0.9 V of friction in it. For this
simulation that's also the right answer, not a warning: `FlywheelSim` has no
friction (Lesson 28 said so), so a fit that finds `kS` near zero is agreeing
with the wheel, and the 0.15 in `FlywheelConstants` is a hardware value the
simulation never uses. On a real wheel the same check runs the other way:
creep the voltage up from zero until the wheel *just* starts to turn, and that
voltage should be close to the `kS` the tool gave you. (A quasistatic ramp
from a standstill, Try It #7, is that creep.)

### The runs themselves: did the ramp stay near steady state?

The last check is on the test, not the numbers. A quasistatic ramp is meant to
keep the mechanism near equilibrium all the way up, so at every instant its
speed is close to what that voltage would hold if you simply set it and
waited. There's a yardstick for that, and it needs no fitting: the percent of
steady-state speed the wheel has reached when the ramp passes a given voltage.
Steady state is the plateau from the `kV` check, about 8.5 rot/s per volt
(measured at 1–5 V). A truly quasistatic ramp would read close to 100% at
every voltage.

Starting from a standstill, the default 1 V/s ramp reaches only **38%–82%** of
steady-state speed across 1–5 V (38, 59, 71, 77 and 82% at 1, 2, 3, 4 and 5 V).
By the yardstick, that ramp was never quasistatic for this wheel. It's light
and direct-drive, it responds in about a second (`kA` ÷ `kV` = 0.106 ÷ 0.118 =
0.9 s), and a ramp that climbs a volt every second is always running ahead of
it.

That's a failed check, and it's fine, because the tool doesn't treat the ramp
as though it were steady. It fits all four tests together in one model that
has a term for acceleration, `V = kS·sign(v) + kV·v + kA·a`. (The tool's source
writes it the other way round, as acceleration against speed, voltage and the
sign of speed, then divides the coefficients to get the gains. It's the same
model rearranged.) The ramp's own acceleration goes into the `kA` term, and the
dynamic test, which accelerates as hard as the routine can make it, is what pins
`kA` down. Nothing is left over to land in `kS`.

**The 0.90 V is what you get without that term.** Fit just the two ramps,
voltage against speed with nothing else (with the coast-down at the start
trimmed away), and this course's run gives `kS` = 0.90 V with `kV` still 0.118.
That's a hand fit again, not the tool's. It looks like friction. It isn't, and
the arithmetic shows where it comes from: a 1 V/s ramp makes the wheel gain
1 ÷ 0.118 = 8.5 rot/s every second just to keep pace, and `kA` charges 0.106 V
for each rot/s² of that. 0.106 × 8.5 ≈ 0.90 V. A fit with no acceleration term
has nowhere to put that voltage except the constant, so it reports it as `kS`. In general the leftover is `kA × ramp rate ÷ kV`, which
shrinks in proportion to the ramp rate: about 0.23 V at 0.25 V/s.

That 0.90 is exactly the kind of number the checks are for. It looks like a
reasonable friction value, and it fails the one-button test: 0.9 V of friction
would mean 0.05 V can't turn the wheel, and it does. It's also why the tool
asks for both test shapes and fits them together. Its own data check, in its
source, lists "at least 1 acceleration event to find Ka" among what the data
has to hold.

Here are the checks in one place, with this course's run beside each:

| Gain | Check | This course's run |
|---|---|---|
| `kV` | 12 V ÷ `kV` near the free speed | 12 ÷ 0.118 = 101.7, against 101.08 rot/s |
| `kV` | 1 ÷ `kV` against the dynamic plateau ÷ 7 V | 8.47 and 8.47 rot/s per volt |
| `kA` | `J × 2π × 1.677`, from Lesson 28 | 0.106 against 0.105 |
| `kS` | does a voltage far below it turn the wheel? | 0.05 V turns it at 0.41 rot/s |
| the ramp | percent of steady state at 1–5 V | 38–82% at 1 V/s, which the fit's acceleration term absorbs |

When a check fails, don't paste the number. Look at the velocity plot of the
run behind it, and check the units your `log` lambda reports and the CAN ID
before you doubt the model. **A characterization result is a claim.** Check
every number against something you already know before it goes into
`Constants`. Try It #2 slows the ramp and asks whether that changes what the
tool reports.

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
asked. Driving the real `ElevatorIOTalonFX` open loop at 6 V for four seconds, over
a physics model widened to ±20 m so nothing but the limit can stop it, first
with the forward soft limit off and then on:

*Nothing to add — measured, not asserted:*

```
no soft limit   : ended at 2.599 m  (well past the top)
with soft limit : ended at 1.503 m, applied volts 0.000
```

That is exactly the distinction Lesson 20 drew when it added soft limits to
the arm — *the clamp is your code's opinion, the soft limit sits below your
code and holds when the logic is wrong* — and a SysId run is the case where
your code's opinion is never consulted at all.

> **Your simulator will not show you this, and that's worth knowing before
> you trust a clean sim run.** `ElevatorIOSim` builds its `ElevatorSim` with
> `kMinHeight` and `kMaxHeight`, which makes the *physics model itself* a
> wall at 1.5 m. Running the real sim elevator open loop into the top, the
> carriage stops at exactly the physics wall — and because the encoder
> started at the carriage's 0.35 m boot height, it only reads 1.15 m there,
> short of the soft limit's 1.5 m threshold, so the limit never gets a reason
> to fire. Add the soft limit and sim behaves
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
above. It broke Lesson 31's already-passing `ElevatorHomingTest` — homing,
which finishes in about 3.5 seconds, took 17.3, the carriage creeping
down at about 2 cm/s instead of its usual 9.7. Not
refused outright — just slower, in a way that looked exactly like a weak
motor rather than a limit doing its job. **That's the actual danger of a
misconfigured limit: it doesn't fail loud, it fails by making the mechanism
seem broken**, the same shape of trap Lesson 21's fail-safe wiring and
Lesson 29's brownout were both about.

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

### Now the awkward part: a ramp costs room

A quasistatic ramp is an expensive test for a mechanism that can run out of
room, and it's worth seeing the size of it. Same widened rig, measuring how far
the carriage travels before the ramp reaches 6 V:

*Nothing to add — measured, not asserted:*

```
ramp 1.00 V/s  ->  6 V after 6.0 s,   travelled 1.885 m
ramp 0.50 V/s  ->  6 V after 12.0 s,  travelled 3.794 m
ramp 0.25 V/s  ->  6 V after 24.0 s,  travelled 7.605 m
```

The default ramp, 1 V/s, already needs more than the elevator's whole 1.5 m to
reach 6 V. **Halve the ramp rate and you double the distance.** The mechanism
spends twice as long at every voltage on the way up, so it covers twice the
ground getting there. A slower ramp is what you'd reach for to make a run
more quasistatic (Try It #2), and on this elevator a 0.25 V/s ramp would need
over **7 metres** to reach 6 V. You have 1.5 m.

So a slower ramp is the wrong direction here, and even the default one has to
be cut short. What you give up is voltage range. A ramp's voltage is its rate
times how long it has run, so you stop it at a lower voltage. Same rig at the
default 1 V/s: the carriage has covered 0.44 m by the time the ramp reaches
3 V, and 1.04 m by 4.5 V. Let go of the buttons at the voltage that fits
(letting go ends the test cleanly, as section 4 said), and fit the gains over
the span of voltage you actually covered. A short honest run beats a long one
that spent its last second driving into a hard stop.

### And lower the step voltage

The dynamic test has the same problem in a more concentrated form, since it
jumps straight to full step voltage and stays there. Same widened rig, 1.5 seconds:

*Nothing to add — measured, not asserted:*

```
step 7.0 V  ->  travelled 1.08 to 1.10 m
step 4.0 V  ->  travelled 0.62 to 0.63 m
step 2.0 V  ->  travelled 0.30 m
```

The default 7 V step eats **nearly three-quarters of the elevator's entire
travel in a second and a half** — and `Config`'s default timeout is ten seconds. Drop the
step voltage until the run fits: 2–4 V is a reasonable starting point for this
elevator, and you can raise it once you've watched one run finish safely.

You lose nothing important by doing this. `kA` is a slope — volts per unit of
acceleration — and a smaller step measures the same slope over a smaller
range. (A short step on a short mechanism may never level off, so section 7's
plateau check may not be available here. The free-speed check still is.) What you must not do is keep 7 V and shorten the timeout instead,
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
friction, and Lesson 28 told you so. Section 7's `kS` check already showed it:
0.05 V, far below what would break any real wheel free, leaves the simulated
wheel turning at 0.41 rot/s, where a real one wouldn't have twitched. So the
right `kS` for this simulation is zero, and a fit that finds it (under 0.01 V
here) isn't measuring hardware friction. It's agreeing with a wheel that never
had any.

That's not a failure of the exercise. It's the same thing Lesson 28 told you
about `kS`, confirmed a second way: **a simulation can only teach you what it
models.** `kV` and `kA` came back honest (0.118 and 0.106 against the 0.119 and 0.105
the course computed) because `FlywheelSim`'s physics genuinely has a back-EMF
term and genuinely has inertia — those measurements mean something. `kS`
came back near zero because there was never a real friction number underneath
it to find. The checks are what let you tell those two kinds of answer apart:
`kV` and `kA` agreed with arithmetic you trust, and `kS` agreed with a wheel
you could watch turn on 0.05 V.

On your actual robot, this section reads differently, and better. The
friction in a real Kraken's bearings is real. The efficiency loss in a real
gearbox is real. A real wheel's moment of inertia is whatever the CAD model
didn't quite capture. When you run this same characterization on real
hardware, `kS` will land on a real number — not zero — and the `kS` check
becomes the creep-up version from section 7, where the wheel *does* stay put
until the voltage gets high enough. That number will very likely disagree
with 0.15 by more than measurement noise explains. That disagreement isn't a bug in the lesson. It's the entire
reason `SysIdRoutine` exists: to measure the thing a spec sheet was always
just guessing at.

---

## Try it

1. **Characterize the elevator, and budget the run before you build it.**
   Section 8 gives you the two numbers that matter: how far the carriage
   travels before a ramp reaches a given voltage, and how far a step voltage
   carries it in a second and a half. Work out a `Config` that fits inside 1.5 m *before*
   writing any code, then add the soft limit, home it, and find out whether
   your budget was right. Predict `kS`/`kV`/`kA` first, too — you already
   know what `ElevatorIOSim` does and doesn't model.
2. **Slow the ramp, and predict first.** Section 7 showed that the default
   ramp isn't near steady state, and that the fit with an acceleration term
   doesn't mind. Before you run anything, write down whether you expect a
   slower ramp to change the `kS` the tool reports, and what the yardstick
   should read. Then change `m_sysId`'s config to
   `SysIdRoutine.Config.useDataLog(...)` with a ramp rate of
   `Volts.of(0.25).per(Second)`, the same 7 V step, and a timeout of
   `Seconds.of(30)` (a 10 s timeout would end a 0.25 V/s ramp at 2.5 V, and
   the yardstick goes up to 5 V). It needs the `Second` and `Seconds` static
   imports from `org.wpilib.units.Units`. Re-run all four tests, check the
   percent of steady state, and compare the tool's three numbers with the
   ones from the default ramp. This course's own run reads **77%–95%** at
   0.25 V/s, up from 38%–82%, and the hand fit of all four tests still gives
   `kS` near zero. (A hand fit of the ramps alone gives about 0.23 V instead
   of 0.90 V, which is `kA × ramp rate ÷ kV` again.) This course's checks
   can't run the SysId tool, so what it prints is better evidence than the
   hand fit. Then try 0.5 V/s and 0.1 V/s: is the gap between the yardstick
   and 100% proportional to the ramp rate? At what point does going slower
   stop changing anything? (Do this on the flywheel, not the elevator — section 8
   explains why that's not an accident.)
3. **Write your team's power-on checklist.** Section 2 is a starting point,
   not a finished one — it doesn't know your robot's specific pinch points,
   your specific current limits, or which mechanism your team is most
   nervous about. Write the version that's actually about your robot.
4. **Read the dynamic test's own log by hand.** Before trusting the analysis
   tool, open the `WPILIB_` log from a `sysIdDynamic` run and look at how fast
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
   Confirm the wheel drops back to its idle speed once you re-enable in
   Teleop — there's no `sysIdQuasistatic` command left running to fight your
   normal driving. That's the same opmode-scoping Lesson 9 found protecting
   `RobotAuto`'s plan, doing the identical job here.
7. **Start from rest.** The callout in section 6 says every run begins with
   the wheel at its idle speed. Work out how you'd make a run start from a
   standstill, and what it would cost: where is the idle default installed,
   and does that place know which opmode is selected? A ramp that starts at a
   standstill is also the creep-up `kS` check from section 7: the voltage at
   which the speed first leaves zero.

---

## What you learned

The gains this course taught you to compute were never a finish line — they
were a stand-in good enough to build thirty-two lessons of simulation on
top of, and today you met the tool that replaces "stand-in" with "measured."
Commands V3 ships it ready-made: a `SysIdRoutine` that needs only two things
from you, how to drive your motor and how to read it back, and gives you
the two test shapes — a slow ramp and a fast step — in a log the SysId
analysis tool can read and fits together.

Section 5 added a structural habit worth keeping past this lesson:
**`@Utility`** gave characterization its own opmode instead of a corner of
`RobotTeleop`, which turns "don't press these buttons during a match" from
something you have to remember into something that's true by construction —
you'd have to select the wrong opmode on purpose.

The harder lesson sat in section 7: **a characterization result is a
claim**, and a claim has to pass a check before it earns a place in
`Constants`. `kV` had two (the motor's free speed, and the dynamic test's
plateau), `kA` had the inertia arithmetic from Lesson 28, `kS` had a voltage
too small to matter, and the test itself had the percent-of-steady-state
yardstick. The default ramp failed that last one, and it didn't matter,
because the tool fits the ramp and the step together with a term for
acceleration. The 0.90 V you get from fitting the ramps alone is the
cautionary tale: a number that looks like friction and fails the one-button
test. Check the number against something you already know before you doubt
the model, and before you trust it.

Section 8 then took that away again, at least partly, and added a second
lesson you didn't expect: a soft limit protects you only once the encoder
it's measured against actually means something, and on a mechanism that
needs homing, that isn't true until homing has run. Get the reference frame
wrong and a guard doesn't fail loud — it fails by making the mechanism look
weak, the same shape of trap this course keeps returning to. Past that, even
the default ramp needs more room than the elevator has, and a slower one needs
more still — **halve the rate, double the distance** — so you trade voltage
range for safety and fit the gains over whatever span you actually survived. **The guard that survives your logic
being absent is the only one that was ever really a guard**, worth
remembering as a general shape, not just a SysId detail. And the most honest
lesson sat in section 9: simulation measured `kV` and `kA` faithfully because
it actually models the physics behind them, and `kS` came back near zero,
because there was never real friction in it to measure.
Your real robot doesn't have that excuse, which is exactly why this tool is
worth having learned before build team hands you one.

None of this replaces understanding the model — it confirms it, or it tells
you honestly where the model and the machine parted ways. Either answer is
worth having.

One lesson left, and it goes back out onto the field: a camera that finds a
game piece on its own, and a robot that goes and gets it.

Next: [Lesson 34 — Going to get something you just saw](34-object-detection.md).
