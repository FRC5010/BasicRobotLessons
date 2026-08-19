# Lesson 21 — Homing: finding out where you actually are

**Goal:** Give the elevator a limit switch, use it to establish where zero
really is when the robot powers on, and meet `Trigger` as something you
can build out of any true-or-false question — not just a controller
button.

**New Java concepts**
- Building a **`Trigger` from a `BooleanSupplier`** — the type you've been
  binding buttons with since Lesson 1 was never really about buttons
- A command with **no requirements**, so it can run alongside another one
  instead of interrupting it

**New robot concepts**
- **`DigitalInput`** — a digital channel, and how to wire a switch so that
  a broken wire fails in the safe direction
- **Relative vs. absolute** position sensing — why every mechanism in the
  last three lessons has been quietly guessing
- **Homing** — creep toward a known stop, then declare the encoder's zero
- **Stator current** as a switchless way to notice you've hit something

---

## 1. What the encoder doesn't know

Time for an uncomfortable question about the last three lessons.

When the robot powers on and `Elevator/HeightMeters` reads `0.00`, what is
that actually telling you?

Not that the carriage is at the bottom. It's telling you that the
TalonFX's built-in encoder started counting a moment ago and hasn't
counted anything yet. That encoder is **relative**: all it can ever
report is how far the motor has turned *since power-on*. Where the
carriage was sitting when the power came up is information it simply does
not have — and cannot get.

So if somebody left the elevator halfway up at the end of the last match,
your robot boots believing the carriage is on the floor when it's
actually 35 cm in the air. And then everything downstream inherits the
lie:

- `goToHeight(kScoreHigh)` drives to 1.45 m *above where it happened to
  be* — into the top of the frame.
- Lesson 18's `clampToTravel` faithfully clamps to a range that's shifted
  by 35 cm.
- On the arm, Lesson 20's soft limits protect the wrong angles, and
  `cos θ` gets computed from a `θ` that isn't the real one — so `kG`
  pushes the wrong way by exactly the amount you were wrong about.

**Nothing about this shows up as an error.** Every number is
self-consistent. The mechanism is confidently, precisely wrong.

You've seen this problem solved once already. Lesson 5 gave the swerve
modules a CANcoder, and Lesson 5's whole reason for existing early was
that a real chassis has to boot with correct wheel angles. A CANcoder is
an **absolute** sensor: it reports a real angle the instant it's switched
on, because it's reading a magnet's orientation rather than counting.

An elevator can't do that trick. Absolute encoders read a position within
one rotation, and this drum turns many times from bottom to top — so "one
third of a turn" doesn't say which turn. Instead you do what the
mechanism *can* do: drive it somewhere you know, and take the reading
there.

That's **homing**, and this lesson builds it.

---

## 2. A switch, and which way to wire it

The known place is the bottom of the travel, and the thing that tells you
you've reached it is a limit switch: a small mechanical button that the
carriage presses when it gets there.

It plugs into one of the robot's **DIO** (digital input/output) channels,
and in code that's a `DigitalInput`. Read it with `get()` and you get a
`boolean`: is this channel's voltage high or low?

Which is where a real decision hides. A switch has two terminals; you can
wire it so that pressing it *closes* the circuit or so that pressing it
*opens* the circuit. Both work. Only one is safe.

Start from a fact about the hardware: **every DIO channel pulls up to
high on its own.** A channel with nothing connected reads `true`. So does
a channel whose wire has fallen off, or been cut by a moving mechanism, or
shaken out of its connector — which, in a robot, are the interesting
cases.

Now ask the fail-safe question. If that wire breaks mid-match, which
answer do you want the switch to be stuck giving?

You want it stuck on **"you're at the limit, stop."** Stuck on "you're
not at the limit" means the elevator happily drives into its own frame,
and you find out by the sound. So the *safe* reading — the one that means
"keep going" — has to be the one that requires a working wire.

That gives you the wiring: use a **normally-closed** switch, connected
between the channel and ground. While the carriage is clear of it, the
switch is closed and holds the line low. Press it and the circuit opens,
so the line floats high. Cut the wire and the line also floats high.

**Which means `get() == true` is "at the limit," and a broken wire looks
exactly like a pressed switch.** That's not a coincidence you're
tolerating; it's the reason for the choice.

**Add to `ElevatorConstants` in `Constants.java`, below `kTolerance`:**

```java
    // Homing. The switch sits at the bottom of the frame; when it trips, the
    // carriage is at kBottomLimitHeight whatever the encoder currently believes.
    public static final int kBottomLimitChannel = 0; // DIO — change to yours
    public static final Distance kBottomLimitHeight = Centimeters.of(1);
    public static final Voltage kHomingVolts = Volts.of(-0.7);
    /** Sim only: where the carriage physically sits at power-on. */
    public static final Distance kSimStartHeight = Centimeters.of(35);
```

**Add the `Voltage` measure type and the `Volts` static import, next to
the others already in `Constants.java`:**

```java
import static org.wpilib.units.Units.Volts;

import org.wpilib.units.measure.Voltage;
```

`kBottomLimitHeight` is the honest bit of bookkeeping here. The switch
isn't mounted at exactly zero — it sticks up a little, and it trips
slightly before the carriage reaches the hard stop. So "the switch is
pressed" means "the carriage is at 1 cm," and that's the number homing
will write down.

`kHomingVolts` is negative and small. Homing runs **open loop**, driving
the motor at a fixed voltage rather than toward a position, because the
position is precisely the thing you don't trust yet. −0.7 V gets a gentle
descent: `kV` says a volt and a half per drum rotation per second, and
after `kG`'s 0.18 V of support that leaves enough to sink at about
9 cm/s. Slow is correct — you are deliberately driving a mechanism into a
hard stop.

---

## 3. Teach `ElevatorIO` to read it

The switch is a sensor, so it's an **input** — same as every other sensor
since Lesson 13, and it will replay for the same reason once this track's
replay tooling exists.

**Add to `ElevatorIOInputs` in `ElevatorIO.java`:**

```java
    public double statorCurrentAmps = 0.0;
    public boolean atBottomLimit = false;
```

**And add two new writes to the `ElevatorIO` interface, below
`setGoalHeightMeters`:**

```java
  /** Open-loop drive, for homing: no goal, no profile, just a voltage. */
  public default void setVoltage(double volts) {}

  /** Declare the carriage to be at this height right now, whatever it read before. */
  public default void setPositionMeters(double heightMeters) {}
```

`setPositionMeters` is the one that matters. It doesn't move anything —
it changes the encoder's *opinion*, resetting its count so the current
position reads as the height you name. That single call is what homing
exists to make.

**Add to `ElevatorIOTalonFX`'s imports:**

```java
import static org.wpilib.units.Units.Amps;

import com.ctre.phoenix6.controls.VoltageOut;

import org.wpilib.hardware.discrete.DigitalInput;
```

**Add to `ElevatorIOTalonFX`, with the other fields:**

```java
  private final VoltageOut m_openLoop = new VoltageOut(0);
  private final DigitalInput m_bottomLimit = new DigitalInput(ElevatorConstants.kBottomLimitChannel);
```

**Add to `updateInputs`, after the setpoint read:**

```java
    inputs.statorCurrentAmps = m_motor.getStatorCurrent().getValue().in(Amps);
    // Normally closed to ground: the switch holds this line low while the
    // carriage is clear of it, so "high" means tripped — or a broken wire.
    inputs.atBottomLimit = m_bottomLimit.get();
```

**Add both new methods to `ElevatorIOTalonFX`, below `setGoalHeightMeters`:**

```java
  @Override
  public void setVoltage(double volts) {
    m_motor.setControl(m_openLoop.withOutput(volts));
  }

  @Override
  public void setPositionMeters(double heightMeters) {
    m_motor.setPosition(metersToRotations(heightMeters));
  }
```

`VoltageOut` is the plainest control request Phoenix has: no profile, no
gains, no target — here are some volts. It's the firmware version of the
open-loop `setThrottle` call the arm's roller already uses, and it's the
right tool exactly once, here, when you have no trustworthy position to
aim at.

`statorCurrentAmps` comes along for the ride. You'll use it in section 9,
and it's worth logging regardless — a motor pulling current with nothing
to show for it is how a jam looks in a log.

---

## 4. Make the simulator lie the same way

Here's the part that makes this testable, and it's a nice piece of
honesty.

Up to now `ElevatorIOSim` has fed the encoder the physics model's height
directly, which quietly made the simulated encoder *better than a real
one* — it always knew the truth. To practise homing you need a simulator
with the same blind spot the hardware has.

**In `ElevatorIOSim`, start the model where the carriage really is:**

```java
      true, // simulateGravity — an unpowered carriage falls
      ElevatorConstants.kSimStartHeight.in(Meters));
```

**And feed the encoder the distance travelled since then, not the height:**

```java
    // The model speaks meters; the motor's sim state speaks rotor rotations.
    // Note what gets fed: height *minus where the carriage started*. A
    // relative encoder can only report how far it has moved since power-on,
    // so a real one reads zero at boot no matter where the carriage is
    // sitting. That is the whole problem homing exists to solve, and this
    // is it, faithfully: the model's own position, not what the encoder
    // would need to already know.
    m_sim.setRawRotorPosition(
        metersToRotations(m_elevatorModel.getPosition() - ElevatorConstants.kSimStartHeight.in(Meters))
            * ElevatorConstants.kGearRatio);
```

**Then add the switch to `updateInputs`, after the `super` call:**

```java
    // The switch is bolted to the frame. It trips on where the carriage
    // actually is — not on where the encoder thinks it is.
    inputs.atBottomLimit = m_elevatorModel.getPosition() <= ElevatorConstants.kBottomLimitHeight.in(Meters);
```

Read those two together, because the contrast is the entire lesson in
four lines. The encoder gets `truth − startHeight`: a *belief*, and a
wrong one. The switch gets plain `truth`: it's a physical object bolted
to the frame, and it doesn't care what anybody believes. Homing is the
moment the belief is replaced by the fact.

Measured proof the lie is real: at boot, `Elevator/HeightMeters` reads
**≈0.00 m** in this simulation, while the carriage is genuinely sitting at
`kSimStartHeight` (0.35 m). Nothing complains.

---

## 5. The homing routine

Three steps: drive down slowly, stop when the switch says so, write down
where you are.

**Add to `Elevator`, above `atGoal`:**

```java
  /**
   * Drive gently downward until the switch trips, then believe it. Open loop
   * on purpose: the encoder is exactly the thing we don't trust yet.
   */
  public Command home() {
    return runRepeatedly(() -> m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts)))
        .whenCanceled(() -> {
          m_io.setVoltage(0);
          acceptBottomLimit();
          m_goal = ElevatorConstants.kBottomLimitHeight;
        })
        .until(this::atBottomLimit)
        .named("Home");
  }

  /** The switch knows where the carriage is. The encoder only had an opinion. */
  private void acceptBottomLimit() {
    m_io.setPositionMeters(ElevatorConstants.kBottomLimitHeight.in(Meters));
  }

  public boolean atBottomLimit() {
    return m_inputs.atBottomLimit;
  }
```

The shape is Lesson 18's `goToHeight` with a different ending — and the
same `runRepeatedly(...).whenCanceled(...).until(...)` chain
`Drivetrain.driveToPose` already uses, right down to why. `whenCanceled`
runs whether the command was **interrupted** or **finished on its own**
via `.until(...)` — confirmed by testing rather than assumed, since it's
easy to guess wrong about a detail like this. That single guarantee is
what lets one cleanup block cover both "the switch tripped" and "the
driver let go of the button mid-descent."

The order inside that block matters: kill the voltage first so the motor
isn't still pushing, then reset the encoder, then set `m_goal` to match
so `atGoal()` doesn't immediately claim the elevator is somewhere else.
Leaving the voltage at zero is fine — the carriage is resting on its hard
stop, which is the one place in its travel it can sit without help.

---

## 6. A `Trigger` is not a button

Homing on command is good. Homing *automatically, every time the switch
says so* is better, and getting there means noticing something about a
type you've been using since Lesson 1.

Every binding you've written looks like this:

*Nothing to add — this is code you already have:*

```java
robot.driverController.southFace().onTrue(robot.drivetrain.turnToHeading(90));
```

It's easy to read `southFace()` as "the bottom face button" and stop
there. But look at what it actually returns: a **`Trigger`**. And a
`Trigger` is not a button — it's a boolean that the scheduler checks
every tick, plus a set of rules about what to run when that boolean
changes. `southFace()` is just a convenient way to make one whose boolean
happens to be "is the bottom face button pressed."

You can make one out of anything.

*Nothing to add — this is the constructor that makes the point:*

```java
new Trigger(someBooleanSupplier)
```

Any method reference that returns `boolean` works: a sensor, a
comparison, whether a game piece is loaded, whether the battery is low.
`onTrue`, `whileTrue`, `onFalse` and the rest behave exactly as they do
for buttons, because they never cared where the boolean came from.
**That's the whole idea, and it's worth carrying: bindings aren't a
controller feature, they're a scheduler feature.**

So the elevator can re-zero itself whenever the switch trips.

**Add to `Elevator`, below `home`:**

```java
  /**
   * Re-zero from the switch without requiring the mechanism, so this is safe
   * to fire in the middle of some other command's motion.
   */
  public Command rezeroAtBottom() {
    return Command.noRequirements(coroutine -> acceptBottomLimit()).named("Rezero At Bottom");
  }
```

**It has no requirements.** Every command you've written so far came from
a `Mechanism`'s own `run(...)` or `runRepeatedly(...)`, which quietly
attaches that mechanism as a requirement — which is how the scheduler
stops two commands fighting over a motor. This one is built from
`Command.noRequirements(...)` instead — the same free-standing factory
Lesson 14's fake-camera-sighting binding already used — so it requires
nothing and interrupts nothing. It has to be: it can fire at any moment,
including in the middle of a `goToHeight`, and canceling the driver's
motion because a switch brushed would be a bug rather than a feature.

> Watch what happens if this fires while the elevator is moving: the
> encoder jumps, so the measured position jumps, so the closed loop
> suddenly sees a different error. That looks alarming and is completely
> correct. The mechanism was in a different place than it thought, and it
> has just found out.

**One thing this lesson does *not* need that the classic WPILib Command
scheduler does: an `ignoringDisable` opt-in.** That scheduler cancels
every running command the instant the robot goes disabled, so a command
that must keep working — like this one — has to explicitly ask to be
spared. This framework's `Scheduler` doesn't do that gating at all;
confirmed by a real test, a `Trigger`-bound command fires and runs
whether the robot is enabled or not, with nothing extra required. That
matters here specifically, because the moment somebody pushes the
carriage down by hand between matches is exactly when the robot is
disabled, and the switch is still telling the truth.

---

## 7. Wire it up

**Add the import to `RobotTeleop.java`:**

```java
import org.wpilib.command3.Trigger;
```

**And add both bindings to `RobotTeleop`'s constructor:**

```java
    // Back homes the elevator: the encoder can't know where the carriage is
    // at power-on, so drive down to the switch and let it say.
    robot.driverController.back().onTrue(robot.elevator.home());

    // A Trigger is any boolean the scheduler polls — it does not have to be
    // a button. Whenever the switch trips, take its word for the height.
    new Trigger(robot.elevator::atBottomLimit).onTrue(robot.elevator.rezeroAtBottom());
```

Homing goes on `back()` because it's a setup action, not a game action —
the sort of thing you do once on the field before the match starts.
Plenty of teams run it automatically at the start of autonomous instead.
Either way, it should happen before anybody asks the elevator to go
anywhere.

---

## 8. Run it

`./gradlew simulateJava`, **Teleoperated**. Before you touch anything,
put `Elevator/HeightMeters` on a graph and look at it.

It says **0.00** — and the simulated carriage is 35 cm in the air. That's
the bug this whole lesson is about, and now you can see it: press D-pad
up and the elevator climbs to what it *calls* 1.45 m, which is really
1.80 m, well past the top of a 1.5 m frame. Nothing complains.

Now press **Back**. Three things happen in order, and all three are
visible:

1. `Elevator/AppliedVolts` drops to −0.7 and stays there. The carriage
   sinks steadily at about 9 cm/s.
2. `Elevator/HeightMeters` counts *downward past zero* — −0.10, −0.20,
   −0.30. This is the encoder faithfully reporting how far it has moved
   from a starting point that was never right.
3. At about **3.9 seconds** `Elevator/AtBottomLimit` flips true, the
   voltage goes to zero, and the height snaps from about **−0.34 m to
   0.01 m**. That jump is 35 centimeters of accumulated wrongness being
   deleted in one tick. Measured in this simulation: 3.88 s to trip the
   switch, landing at 0.009 m.

From then on the elevator is honest. Press D-pad right and it goes to
0.75 m and *is* at 0.75 m. Press D-pad down and watch `AtBottomLimit` go
true on arrival — the `Trigger` fires, re-zeroing costs nothing because
the encoder was already right, and it'll keep being right for the rest of
the match.

---

## 9. When there's no switch to fit

Two other answers are worth knowing, because a limit switch is not always
an option.

**Current.** A motor pressed against a hard stop is drawing current and
going nowhere, and both halves of that are measurable. Drive down slowly
and watch `Elevator/StatorCurrentAmps`: while the carriage is descending
it sits low, and the instant it lands the current climbs sharply while
`VelocityMetersPerSec` sits at zero. In this simulation, held against the
bottom stop at −3 V, the motor draws **≈120.7 amps** and moves at
**0.000 m/s**. That pair — current up, speed zero — is a hard stop, and
you can home against it with no sensor at all.

*Nothing to add — this is the shape of the idea, and Try It #3 is where
you build it:*

```java
boolean againstHardStop = inputs.statorCurrentAmps > someThreshold
    && Math.abs(inputs.velocityMetersPerSec) < someSmallSpeed;
```

It's a genuinely useful trick and it costs no hardware. It's also less
crisp than a switch: you have to pick a threshold, hold it for long
enough to rule out the normal current spike at the start of a move, and
accept that you are ending the routine by *stalling a motor into a stop*
rather than by touching a button.

**An absolute sensor, when the geometry allows it.** The reason the
elevator can't use one is the drum turning many times over the travel. An
**arm** usually doesn't have that problem — it sweeps less than a full
rotation, so one magnet orientation maps to exactly one angle. Which
means an arm can carry a CANcoder and read its true angle the moment it
powers on, precisely the way the swerve modules have since Lesson 5.

That's the better answer where it fits, and Lesson 20 left a debt it pays
off. The arm's `kG` is scaled by `cos θ`, and Lesson 20 warned that a
wrong zero makes the feedforward fight the mechanism instead of helping
it. An absolute encoder means there is no wrong zero to have.

> **Rule of thumb worth keeping.** If the mechanism moves less than one
> turn of something you can put a magnet on, measure it absolutely.
> Otherwise, home it.

---

## Try it

> **Do these in simulation** (`kSimMode = Mode.SIM`). Two of them break
> homing on purpose, and a homing routine that doesn't stop is a
> mechanism driving itself into its own frame at full commitment. That's
> cheap to watch here and expensive to watch anywhere else.

1. **Change where it wakes up.** Set `kSimStartHeight` to something else
   — 1.2 m, or 0 m — and re-run. Homing should take a different amount
   of time and land in the same place. If it works from every starting
   height, it works.
2. **Add a top limit.** A second `DigitalInput`, a second input field, a
   second `Trigger`. The top switch shouldn't re-zero anything, though:
   think about what it *should* do when it trips, and whether that
   belongs on `Elevator` or in `RobotTeleop`.
3. **Home on current instead.** Delete the switch from the equation:
   change `home()`'s `.until(...)` to use the stator-current test from
   section 9 rather than `atBottomLimit`. You'll need a threshold
   constant and a speed constant; log `StatorCurrentAmps` during a normal
   move first so you pick a threshold the startup spike won't trip.
4. **Break the switch and read the log.** Invert the sim's limit
   condition (`>=` instead of `<=`), run homing, and work out what's
   wrong *from the log alone* — `AtBottomLimit`, `AppliedVolts`,
   `HeightMeters` — before you look back at the code.
5. **Trigger something else entirely.** Build a `Trigger` that has
   nothing to do with a sensor — say,
   `new Trigger(() -> robot.elevator.atGoal())` — and have it print. The
   point isn't the printing; it's noticing how many things in your robot
   are now bindable.

---

## What you learned

The gap this lesson closed had been open since Lesson 18, and it was the
kind worth being uncomfortable about: the elevator and the arm always
reported a position, the position was always self-consistent, and it was
**only ever a count of movement since power-on**. No error, no warning,
no symptom — just a mechanism confidently operating in a coordinate
system that had nothing to do with the robot.

The fix has a shape you'll reuse. Go somewhere you can recognise without
trusting the thing you're trying to fix, recognise it with a sensor that
reads the world rather than a belief about the world, and then overwrite
the belief. Homing is that pattern with a limit switch in it; there are
others.

Two smaller ideas came along, and both are bigger than this lesson.

**Wire sensors so that broken reads as bad.** A normally-closed switch
means a cut wire says "you're at the limit" rather than "carry on," so
the failure stops the mechanism instead of feeding it. That's a habit,
not a trick — every sensor you add from here has a safe direction to fail
in, and it's worth two seconds of thought at wiring time.

**A `Trigger` is any boolean, polled.** You'd been writing
`robot.driverController.southFace().onTrue(...)` since Lesson 1 without
necessarily noticing that the button part is incidental.
`new Trigger(robot.elevator::atBottomLimit)` binds a command to a limit
switch with the same three words, and there's nothing special about
limit switches either. Sensor readings, computed conditions, whether the
arm is stowed, whether you have a game piece — the scheduler will watch
any of them for you.

That last one is going to be useful immediately. The robot can now sense
its own state with real confidence — a height it trusts, an angle it
trusts, a switch it can build behavior around. Time to start showing some
of that state to the humans standing around it.
