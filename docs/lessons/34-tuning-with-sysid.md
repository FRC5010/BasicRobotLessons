# Lesson 34 — Tuning your robot when build team hands it over

**Goal:** Meet the real machine your computed gains have been standing in for,
put a number on how close they were, and pick up the tool teams use to measure
what a spec sheet can't tell you.

**New Java concepts**
- None.

**New robot concepts**
- **`SysIdRoutine`** — a WPILib tool that drives a mechanism open loop in two
  deliberate patterns and logs exactly what it needs to fit `kS`/`kV`/`kA`
  from the result, instead of you computing them.
- **A safe first power-on**, as a procedure, not a piece of code.
- **A test can lie about the mechanism if the test is wrong for it** — the
  same ramp rate that's fine for one mechanism can quietly corrupt another.

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

That's what today closes the gap on. `SysIdRoutine` drives a mechanism with
two carefully-shaped voltage patterns, logs what happened, and fits the same
three terms you've been computing by hand since Lesson 18 — except this time
they come from the machine instead of the datasheet. Where the two agree, the
spec-sheet math was a good stand-in. Where they don't, the difference has a
name: friction, efficiency, or a mass that isn't what you thought.

This course can't put a real Kraken in front of you — it's a docs-only repo
running in simulation. What it *can* do is teach you the tool for real, verify
every line of code compiles and runs, and be honest about the one thing
simulation can never show you. Hold that thought; section 7 comes back to it.

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
part of why this lesson picked it.

What's still real: a spinning flywheel is genuinely dangerous to fingers,
hair, and shoelaces, current limits protect windings but not people, and
"it worked in sim" has never once meant "it's safe to stand next to." Before
you send voltage into a real motor for the first time:

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
it. `FlywheelIO` doesn't have that door yet; only `ElevatorIO` does.

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

**Add to `Flywheel.java`'s imports:**

```java
import edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine;
```

**Add to `Flywheel`, next to `m_disconnected`:**

```java
private final SysIdRoutine m_sysId = new SysIdRoutine(
        new SysIdRoutine.Config(),
        new SysIdRoutine.Mechanism(
                volts -> m_io.setVoltage(volts.in(Volts)),
                log -> log.motor("flywheel")
                        .voltage(Volts.of(m_inputs.appliedVolts))
                        .angularVelocity(RotationsPerSecond.of(m_inputs.velocityRps)),
                this));
```

Three pieces. **`Config`** is left at its defaults for now — you'll have a
reason to change one of them in a minute, and it'll make more sense having
seen why. **`Mechanism`** is the actual contract: the first lambda is "drive
with this voltage" (straight through the door you just built), the second is
"log what happened right now" — `log.motor("flywheel")` names the motor, and
`.voltage(...)`/`.angularVelocity(...)` chain onto it, one call per value the
fit needs. `this` is the subsystem, so the scheduler still enforces one
command at a time on the flywheel, same as every command you've built since
Lesson 1.

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
and `kReverse`, on each. **`quasistatic`** ramps voltage up slowly — 1 V per
second by default — so the mechanism is never far from equilibrium; the
relationship between volts and speed at any instant is close to what it
would be if you'd just set that voltage and waited. **`dynamic`** does the
opposite on purpose: it snaps to a fixed voltage — 7 V by default — and
watches the mechanism accelerate hard. One test holds still long enough to
read `kS` and `kV` off it; the other moves fast enough to read `kA` off it.
Neither alone gives you all three.

**Add to `RobotContainer`'s imports:**

```java
import edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine;
```

**Add to `configureBindings()`, below the superstructure bindings:**

```java
m_driverController.back().and(m_driverController.y())
    .whileTrue(m_flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kForward));
m_driverController.back().and(m_driverController.a())
    .whileTrue(m_flywheel.sysIdQuasistatic(SysIdRoutine.Direction.kReverse));
m_driverController.start().and(m_driverController.y())
    .whileTrue(m_flywheel.sysIdDynamic(SysIdRoutine.Direction.kForward));
m_driverController.start().and(m_driverController.a())
    .whileTrue(m_flywheel.sysIdDynamic(SysIdRoutine.Direction.kReverse));
```

**`Trigger.and(...)`** from Lesson 22 is doing real work here, not just
saving buttons. Four two-button combinations means nobody trips a
characterization run reaching for a single button mid-match — the same
"hard to do by accident" reasoning that put homing on its own button back in
Lesson 21, one step further.

---

## 5. Run it, and read what happened

`./gradlew simulateJava`, **Teleoperated**. Hold **Back + Y** for a few
seconds — the wheel should spin up slowly and smoothly. Let go, let it coast,
then hold **Start + Y** — this time it should snap forward hard. Both
directions work the same in reverse with **A** instead of **Y**.

Every run writes to a **second `.wpilog` file** in the same `logs/` folder
AdvantageKit has been using since Lesson 3 — a separate file, because
`SysIdRoutine` writes through WPILib's own `DataLogManager`, not through
`Logger`. Nothing needs to be started for this; the first `SysIdRoutine` run
creates it automatically. Two log files, same folder, different tools — worth
knowing before you go looking for one and find the other.

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
the test was wrong for this mechanism, and section 6 is how you tell the
difference.

---

## 6. Is it real, or is it the test?

Here's the number, measured in this course's own simulation so you have
something concrete to check your own run against: characterizing the
flywheel with `SysIdRoutine.Config()` left at its defaults gives **`kS`
around 0.89 V** — nearly six times the 0.15 V this course has shipped since
Lesson 29. `kV` comes back fine (≈0.12). Something is wrong, and it isn't
the wheel.

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
private final SysIdRoutine m_sysId = new SysIdRoutine(
        new SysIdRoutine.Config(Volts.of(0.25).per(Second), Volts.of(7), Seconds.of(30)),
        new SysIdRoutine.Mechanism(
```

**Add both measure types to `Flywheel.java`'s imports:**

```java
import static edu.wpi.first.units.Units.Second;
import static edu.wpi.first.units.Units.Seconds;
```

A quarter of the ramp rate, and the timeout stretched to 30 seconds so the
slower climb still has room to reach a useful voltage before the routine
gives up and stops on its own. Re-run and re-analyze: in this course's own
measured run, `kS` drops from 0.89 V to **about 0.23 V** — not a perfect
match to 0.15, but a real one, and the direction of the fix (slower ramp,
smaller apparent `kS`) is the part that generalizes. `kV` barely moves
(≈0.12 either way — the back-EMF term was never the problem). `kA`, which
had been quietly corrupted right along with `kS`, improves the same way.

**The lesson isn't "trust the slower number more."** It's that a
characterization result is only as good as the test that produced it, and a
suspiciously large `kS` is the tell — check the ramp rate against how fast
the mechanism actually responds before you believe the number it hands back.

---

## 7. Computed vs. measured — and the one thing sim can't show you

Here's the honest part, and it's worth sitting with rather than skating past.

`FlywheelSim`, underneath everything in this course, has never modeled
friction — Lesson 29 already proved this by hand, watching a wheel with
`kS = 0.05` reach 0.37 rot/s from a standing start instead of staying put.
So when you characterize the flywheel *in this simulation*, section 6's
0.23 V isn't measuring hardware friction. It's measuring what's left of a
ramp-rate artifact once you've mostly, but not perfectly, slowed it down
enough to stop mattering. Slow the ramp further and it keeps shrinking
toward zero, because zero is the actual answer this simulated wheel has
always had — there was never any friction in it to find.

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

1. **Characterize a second mechanism, and predict first.** Pick the elevator
   or the arm. Before running anything, write down what you expect `kS`,
   `kV`, and `kA` to come back as, given what you already know about
   `ElevatorSim`/`SingleJointedArmSim`'s modeling from Lessons 18 and 20.
   Then build the routine (same shape as sections 3–4, driven by
   `setVoltage`) and see how close your prediction was.
2. **Find the ramp rate that's "slow enough."** Section 6 used 0.25 V/s.
   Try 0.5 V/s and 0.1 V/s on the flywheel and watch how `kS` moves between
   them. Is the relationship linear? At what point does going slower stop
   changing the answer?
3. **Write your team's power-on checklist.** Section 2 is a starting point,
   not a finished one — it doesn't know your robot's specific pinch points,
   your specific current limits, or which mechanism your team is most
   nervous about. Write the version that's actually about your robot.
4. **Read the dynamic test's own log by hand.** Before trusting the analysis
   tool, open the `.wpilog` from a `sysIdDynamic` run and look at how fast
   velocity climbs right after the voltage step. That climb rate *is* what
   `kA` measures — seeing it once by eye is worth more than reading the
   definition twice.

---

## What you learned

The gains this course taught you to compute were never a finish line — they
were a stand-in good enough to build twenty lessons of simulation on top of,
and today you met the tool that replaces "stand-in" with "measured."
**`SysIdRoutine`** drives a mechanism open loop in two shapes — a slow ramp
for `kS`/`kV`, a fast step for `kA` — and logs exactly what a fit needs,
which is less code than computing the gains by hand ever was. The harder
lesson sat in section 6: **a characterization is only as trustworthy as the
test that produced it**, and a `kS` that comes back looking absurd is more
often a ramp rate that's wrong for the mechanism than a spec sheet that's
wrong for the robot — check the test before you doubt the model. And the
most honest lesson sat in section 7: simulation measured `kV` and `kA`
faithfully because it actually models the physics behind them, and it could
only approximate `kS` toward zero, because there was never real friction in
it to measure. Your real robot doesn't have that excuse, which is exactly
why this tool is worth having learned before build team hands you one.

None of this replaces understanding the model — it confirms it, or it tells
you honestly where the model and the machine parted ways. Either answer is
worth having.
