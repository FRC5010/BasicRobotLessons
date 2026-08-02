# Lesson 24 — A superstructure: state you can name

**Goal:** Give the robot one value that says what it's doing, make the illegal
moves impossible instead of merely unlikely, and let everything downstream —
including the LED strip — read that one value instead of guessing from sensors.

**New Java concepts**
- **An enum with a constructor, fields, and methods** — `Constants.Mode` was six
  bare names; this one carries data and answers questions about itself.
- **Exhaustive `switch` expressions as a safety net** — the compiler refusing to
  build until you've said what a new case does.

**New robot concepts**
- **State machines** — one named situation instead of a pile of booleans
- **Legality vs. readiness** — two different questions that live in two different
  places on purpose
- **`Command.onlyIf(...)`** — a request that can be refused
- **Reading state instead of sensors** — bindings that don't know what a beam
  break is

---

## 1. Five booleans and no name for the situation

Open `RobotContainer.java` and look at what the last two lessons left you with.

There's a button that drops the arm. Another that stows it. A bumper that spins
the roller in, another that spins it out. A `Trigger` on the beam break that
raises the elevator and stows the arm together. And a score binding that's really
three conditions stapled together — a trigger pull, *and* a game piece, *and* the
elevator having arrived.

Every one of those works. Ask a harder question, though: **what is the robot
doing right now?**

You can't answer it. You can read five booleans and infer something. Is the robot
intaking? Well, `hasGamePiece` is false and the roller is spinning, so probably —
unless someone's just ejecting into a corner. Is it mid-handoff? There's no
reading for that at all. The elevator is moving and the arm is moving, and the
same pair of facts is also true when the driver taps two buttons in quick
succession for no particular reason.

That's the thing Lesson 23 ran into and named. "Mid-handoff" isn't true or false
about a sensor. It's a thing the robot *is*, and a pile of conditions can't
express it no matter how many you stack up.

There's a second, worse problem hiding underneath. Nothing stops the driver
pulling the score trigger while the arm is still swinging down to the floor. The
`and(...)` chain makes it *unlikely* — a piece and an arrived elevator are decent
proxies — but proxies are what you use when you can't ask the real question. The
real question is "is the robot in a situation where scoring makes sense," and
right now nothing on the robot knows.

So: give it one value that says what it's doing. Everything in this lesson falls
out of that.

---

## 2. Name what the robot is doing

Six names cover the whole game cycle:

| State | The robot is… |
|---|---|
| `UNHOMED` | freshly booted, and doesn't yet know where its own carriage is |
| `IDLE` | homed, empty, everything stowed, waiting to be asked |
| `INTAKING` | arm down, roller spinning, looking for a piece |
| `HANDOFF` | holding a piece, moving the arm and elevator to carry it |
| `HOLDING` | piece secured, mechanisms in place, ready to score |
| `SCORING` | pushing the piece out |

`HANDOFF` is the one worth stopping on. It's tempting to leave it out — a piece is
either in the intake or it isn't, and the mechanisms are either at their goals or
they aren't, so isn't "handoff" just those two facts? No, and the difference is
the whole point of the lesson. Both of those facts are also true a moment after
you've *finished* handing off, and again if the driver happens to move things
manually. `HANDOFF` isn't a reading. It's a stretch of time the robot is passing
through, with a beginning, an end, and a specific piece of motion that belongs to
it.

**A state machine is for the situations that have duration.** If every question
you want to ask can be answered by reading a sensor right now, you don't need one.
The moment you catch yourself wanting to say "the robot is in the middle of…",
you do.

---

## 3. An enum that carries something

You've written one enum already — `Constants.Mode`, back in Lesson 13. It was
three bare names, and that's the version most people meet first.

Java enums do considerably more than that. An enum constant is an *object*, and
like any object it can hold fields and answer questions. Since the whole reason
Lesson 23 wanted this was to stop the LED strip guessing, the natural thing for
each state to carry is the pattern that shows it.

**Create `SuperstructureState.java` in `frc/robot/subsystems/`, starting with:**

```java
package frc.robot.subsystems;

import edu.wpi.first.wpilibj.LEDPattern;
import frc.robot.Constants.LedConstants;
```

**Then the enum itself, with each constant handed the pattern that represents it:**

```java
public enum SuperstructureState {
    UNHOMED(LedConstants.kUnhomed),
    IDLE(LedConstants.kIdle),
    INTAKING(LedConstants.kIntaking),
    HANDOFF(LedConstants.kHandoff),
    HOLDING(LedConstants.kHolding),
    SCORING(LedConstants.kScoring);
```

Those parentheses are the new part. `UNHOMED(LedConstants.kUnhomed)` is a
constructor call — the same thing `new Elevator()` is, just written in the one
place Java lets you build enum constants. Note the semicolon after the last one:
it's what separates the list of constants from the rest of the class body, and
leaving it out produces a compiler error that doesn't obviously point at it.

**Add the field, constructor, and accessor below the constants:**

```java
    private final LEDPattern m_pattern;

    SuperstructureState(LEDPattern pattern) {
        m_pattern = pattern;
    }

    /** What the strip shows while the robot is in this state. */
    public LEDPattern pattern() {
        return m_pattern;
    }
```

An enum constructor is always private — you can't write `new
SuperstructureState(...)` anywhere, which is exactly the guarantee that makes the
six constants *all* the values that exist. That's worth more than it sounds: a
`String` state has infinitely many possible values and you'll typo one eventually.
This has six, and the compiler knows all of them.

Now update the constants those arguments refer to.

**Replace `LedConstants` in `Constants.java` with:**

```java
  public static class LedConstants {
    public static final int kPwmPort = 0; // roboRIO PWM — change to yours
    public static final int kLength = 40; // LEDs on the strip — change to yours

    // A pattern is a value, not a loop. Build them once, here, next to the
    // colours they use, and hand the finished description to the strip.
    // One per state now, and named after it — the strip's vocabulary and the
    // robot's are the same vocabulary.
    public static final Dimensionless kIdleBrightness = Percent.of(25);
    public static final Time kBlinkPeriod = Seconds.of(0.15);

    public static final LEDPattern kUnhomed =
        LEDPattern.solid(Color.kRed).blink(kBlinkPeriod);
    public static final LEDPattern kIdle =
        LEDPattern.solid(Color.kBlue).atBrightness(kIdleBrightness);
    public static final LEDPattern kIntaking = LEDPattern.solid(Color.kYellow);
    public static final LEDPattern kHandoff = kIntaking.blink(kBlinkPeriod);
    public static final LEDPattern kHolding = LEDPattern.solid(Color.kLimeGreen);
    public static final LEDPattern kScoring = kHolding.blink(kBlinkPeriod);

    public static final Time kBreathePeriod = Seconds.of(2);
  }
```

Two of those are built out of the two above them — `kHandoff` is `kIntaking`
blinking, `kScoring` is `kHolding` blinking. That's Lesson 23's combinator idea
doing something useful rather than being demonstrated: a pattern is a value, so
of course you can build a value out of another one.

> **Declaration order matters here.** `kIdleBrightness` and `kBlinkPeriod` are
> used by the constants below them, and a static field can't be read before it's
> declared. Move them to the bottom and the file stops compiling.

---

## 4. "You can't get there from here"

Here's where the state machine earns its keep.

A robot in `IDLE` has nothing on board. Scoring from there is not "unlikely" or
"probably a mistake" — it's meaningless, and no sensor reading will ever make it
sensible. Same for `INTAKING`: the arm is on the floor and there's nothing in the
intake, so a score request is a mis-press, every time.

Those rules aren't facts about this instant. They're facts about how the robot is
*built*, and you can write them down once and be done.

**Add to `SuperstructureState`, below `pattern()`:**

```java
    /**
     * Can a request move the robot from here to there? This is a rule about how
     * the robot is built, not about this instant — no sensor is read to answer
     * it, and the answer never changes.
     *
     * <p>UNHOMED answers no to everything on purpose. The only way out is to
     * actually home the elevator; no button gets to simply declare it done.
     */
    public boolean canGoTo(SuperstructureState next) {
        return switch (this) {
            case UNHOMED -> false;
            case IDLE -> next == INTAKING;
            case INTAKING -> next == HANDOFF || next == IDLE;
            case HANDOFF -> next == HOLDING || next == IDLE;
            case HOLDING -> next == SCORING || next == IDLE;
            case SCORING -> next == IDLE;
        };
    }
}
```

Read it as a table and it's the whole robot in seven lines. From `IDLE` the only
thing you can ask for is intaking. From `HOLDING` you can score, or you can give
up and go back to neutral. Everything not listed is refused.

`UNHOMED` returning `false` for everything is deliberate, and it's the rule that
would have taken a whole extra `if` to enforce the old way. Lesson 23 made
"not homed" the top LED priority because a robot that doesn't know where its
carriage is shouldn't be trusted. This makes that structural: **no request of any
kind can get the robot out of `UNHOMED`.** The only way out is to actually home
the elevator, which section 6 handles. A button can't declare the job done.

Now the part that makes this different from a pile of `if` statements. That
`switch` is a **switch expression** — it produces a value, which is why it has an
`=` in front of it and a semicolon after it. Java requires switch expressions over
an enum to be **exhaustive**: every constant handled, or it doesn't compile.

Try it, seriously, right now. Add a seventh constant:

*Nothing to add permanently — this is a two-minute experiment to run and undo:*

```java
    CLIMBING(LedConstants.kIdle),
```

The file stops compiling, and the error points at `canGoTo`. That's the compiler
telling you there's a question about your robot that you haven't answered yet:
what can `CLIMBING` do? You cannot forget. Compare that to the old bindings, where
adding a climber means quietly hoping you remembered to update every `and(...)`
chain that should now exclude it — and finding out you didn't at an event.

**Delete that `CLIMBING` line again before moving on.**

---

## 5. A subsystem that owns no motors

The state has to live somewhere, and something has to update it every tick.
Something that runs every tick and can be depended on by other things is a
subsystem, so that's what this is — even though it will never touch a motor.

That's worth a second, because Lesson 7 made the opposite call. `SwerveModule`
stopped being a subsystem there, precisely because it never decided anything on
its own; it was always driven by `Drivetrain`. This one is the mirror image: no
hardware at all, but it has genuine per-tick work and genuine opinions. **What
makes something a subsystem isn't owning hardware — it's needing the scheduler.**

**Create `Superstructure.java` in `frc/robot/subsystems/`, starting with:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Seconds;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.filter.Debouncer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.ElevatorConstants;
```

**Then the class, its fields, and the constructor:**

```java
/**
 * What the robot is doing, in one place. It owns no motors — it owns the single
 * fact every other decision hangs off, and the rules about how that fact is
 * allowed to change.
 *
 * <p>It requires nothing, so a state request can never cancel a mechanism that
 * is already moving.
 */
public class Superstructure extends SubsystemBase {
    private final Elevator m_elevator;
    private final Arm m_arm;

    private SuperstructureState m_state = SuperstructureState.UNHOMED;

    /** The filter Lesson 22 hung on a Trigger, here in its plain form. */
    private final Debouncer m_pieceFilter =
            new Debouncer(ArmConstants.kBeamDebounce.in(Seconds));

    public Superstructure(Elevator elevator, Arm arm) {
        m_elevator = elevator;
        m_arm = arm;
    }
```

Fields hold what the object keeps for its whole life, so they go at the top: the
two mechanisms it reads, the one fact it owns, and the filter.

That `Debouncer` is a familiar idea wearing different clothes. In Lesson 22 you
wrote `.debounce(ArmConstants.kBeamDebounce.in(Seconds))` on a `Trigger`, and that
decorator was wrapping exactly this class the whole time. Now that the beam break
is read here instead of in a binding, you use the filter directly. Same behaviour,
same constant, one layer less.

**Add the two accessors, below the constructor:**

```java
    /** What the robot is doing. Everything downstream reads this instead of sensors. */
    public SuperstructureState getState() {
        return m_state;
    }

    /** True exactly while the robot is in this state, as a Trigger you can bind to. */
    public Trigger inState(SuperstructureState state) {
        return new Trigger(() -> m_state == state);
    }
```

`inState` is Lesson 21's idea taken one step further. There you learned a
`Trigger` can be built from any boolean, not just a button. Here it's built from a
*comparison* — and because it's a `Trigger`, it gets `onTrue`, `whileTrue`, `and`,
and everything else for free. That one method is what lets section 8's bindings
talk about states instead of sensors.

---

## 6. What the robot decides for itself

`canGoTo` answers "could the robot ever go from here to there." There's a
completely different question underneath it: "should it go there *now*."

`HANDOFF → HOLDING` is legal at all times. But it should only actually happen once
the elevator and arm have finished moving, and that depends entirely on where the
hardware is this instant. Cramming that into `canGoTo` would ruin it — the enum
would start reading sensors, its answers would change tick to tick, and you could
no longer look at it and see the robot's design.

So they live apart, and it's worth being able to say why:

- **Legality** is a rule about the robot. It lives in the enum, it reads nothing,
  and it never changes. It governs what somebody is allowed to *ask for*.
- **Readiness** is a fact about this instant. It lives in `periodic()`, it reads
  the mechanisms, and it governs what the robot does *on its own*.

**Add `periodic()` to `Superstructure`, between the constructor and the accessors:**

```java
    @Override
    public void periodic() {
        boolean hasPiece = m_pieceFilter.calculate(m_arm.hasGamePiece());

        // The transitions the robot makes for itself, once the hardware has
        // actually caught up. These don't consult canGoTo: that rule is about
        // requests, and this is the state machine deciding, not asking.
        switch (m_state) {
            case UNHOMED -> {
                if (m_elevator.isHomed()) {
                    m_state = SuperstructureState.IDLE;
                }
            }
            case INTAKING -> {
                if (hasPiece) {
                    m_state = SuperstructureState.HANDOFF;
                }
            }
            case HANDOFF -> {
                if (!hasPiece) {
                    m_state = SuperstructureState.IDLE;
                } else if (m_elevator.atGoal() && m_arm.atGoal()) {
                    m_state = SuperstructureState.HOLDING;
                }
            }
            case HOLDING, SCORING -> {
                if (!hasPiece) {
                    m_state = SuperstructureState.IDLE;
                }
            }
            case IDLE -> {
                // Nothing happens here on its own. Somebody has to ask.
            }
        }

        Logger.recordOutput("Superstructure/State", m_state);
    }
```

Walk the cycle once and it reads like a description of a match. Boot into
`UNHOMED` and sit there until somebody homes — that's the only exit, and now it's
the only exit in code too. From `INTAKING`, a debounced beam break means a piece
arrived, so start the handoff. From `HANDOFF`, wait until *both* mechanisms report
`atGoal` before calling the piece secured. And losing the piece drops you back to
`IDLE` from anywhere it can happen, which is also how `SCORING` ends — the piece
leaving is what finishes scoring, not a timer.

`Logger.recordOutput` has an overload for enums, so `Superstructure/State` shows
up in AdvantageScope as a readable name and replays like every other output. This
is the line that replaces Lesson 23's `Leds/Showing` string. That one recorded
what the strip decided; this one records what the robot *was*, which is the thing
you actually want when you're reading a log a week later.

> One log key now answers a question that used to take five plots and a guess.
> When something goes wrong in a match, "what was it doing" is almost always the
> first thing you need, and almost never the thing you recorded.

---

## 7. Requests, and refusing one out loud

Buttons are how a human asks for a state. Humans press buttons at the wrong time —
that's not a character flaw, it's what happens when you're driving a robot and
looking at a field instead of a controller. So a request has to be something that
can be *refused*.

**Add to `Superstructure`, below `inState`:**

```java
    /** Ask to start intaking: drop the arm, then spin the roller. */
    public Command requestIntake() {
        return Commands.sequence(
                        Commands.runOnce(() -> m_state = SuperstructureState.INTAKING),
                        m_arm.goToAngle(ArmConstants.kIntake),
                        m_arm.runRoller(ArmConstants.kIntakeSpeed))
                .onlyIf(() -> allow(SuperstructureState.INTAKING));
    }

    /** Ask to score: spin the roller out. The piece leaving is what ends the state. */
    public Command requestScore() {
        return Commands.sequence(
                        Commands.runOnce(() -> m_state = SuperstructureState.SCORING),
                        m_arm.runRoller(ArmConstants.kEjectSpeed))
                .onlyIf(() -> allow(SuperstructureState.SCORING));
    }

    /** Ask to give up and go back to neutral. */
    public Command requestIdle() {
        return Commands.runOnce(() -> m_state = SuperstructureState.IDLE)
                .onlyIf(() -> allow(SuperstructureState.IDLE));
    }
```

**`onlyIf` is the new decorator**, and it's the shape you already know: it takes a
command and returns a new command that runs the original only when the condition
holds. The condition is checked once, when the command is scheduled — so pressing
X in `HOLDING` doesn't queue anything up for later, it just does nothing.

Notice what that buys. `requestIntake` sets the state *and* runs the motion, and
the guard wraps both together. There is no path where the robot ends up in
`INTAKING` without the arm going down, and none where the arm goes down without
the robot being in `INTAKING`.

> **Why a sequence and not a parallel?** `goToAngle` and `runRoller` both require
> `m_arm`, and a parallel composition containing two commands that need the same
> subsystem throws the moment you build it. Lesson 22's `Commands.parallel` was
> fine because it combined an arm command with an *elevator* command. Here the
> sequence is also just better: drop the arm first, then spin.

Two more commands belong to states rather than to buttons.

**Add to `Superstructure`, below the request methods:**

```java
    /**
     * The handoff — the thing Lesson 22 did without being able to name it. Bound
     * to arriving in HANDOFF, so there is no guard here: getting to this state at
     * all means the state machine already said yes.
     */
    public Command handoff() {
        return Commands.parallel(
                m_arm.goToAngle(ArmConstants.kStowed),
                m_elevator.goToHeight(ElevatorConstants.kScoreMid));
    }

    /** Back to neutral: arm stowed, elevator down. Bound to arriving in IDLE. */
    public Command stow() {
        return Commands.parallel(
                m_arm.goToAngle(ArmConstants.kStowed),
                m_elevator.goToHeight(ElevatorConstants.kStowed));
    }
```

**The rule that keeps this straight: a command bound to a button guards itself; a
command bound to a state doesn't.** A button can be pressed at any moment, so it
has to ask permission. A state-driven command only ever runs because the state
machine put the robot in that state, and it isn't going to argue with itself.

Finally, the refusal.

**Add to `Superstructure`, at the bottom of the class:**

```java
    /**
     * True when a request is legal. A refusal gets written to the log, because a
     * refusal nobody can see is a bug report nobody ever files.
     */
    private boolean allow(SuperstructureState next) {
        boolean ok = m_state.canGoTo(next);
        if (!ok) {
            Logger.recordOutput("Superstructure/Rejected", m_state + " -> " + next);
        }
        return ok;
    }
}
```

That logging line is the difference between a robot that's easy to debug and one
that isn't. A refused request feels *exactly* like a broken button from the
driver's seat, and "the X button doesn't work" is a genuinely awful bug report to
receive. `Superstructure/Rejected` turns it into "it was in HOLDING and you asked
for INTAKING," which takes ten seconds instead of an evening.

That's `Superstructure` complete. It came together in six pieces across three
sections, so here's the whole file, to check yours against:

*Nothing to add — this is everything you just wrote, in order:*

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Seconds;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.filter.Debouncer;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.ArmConstants;
import frc.robot.Constants.ElevatorConstants;

/**
 * What the robot is doing, in one place. It owns no motors — it owns the single
 * fact every other decision hangs off, and the rules about how that fact is
 * allowed to change.
 *
 * <p>It requires nothing, so a state request can never cancel a mechanism that
 * is already moving.
 */
public class Superstructure extends SubsystemBase {
    private final Elevator m_elevator;
    private final Arm m_arm;

    private SuperstructureState m_state = SuperstructureState.UNHOMED;

    /** The filter Lesson 22 hung on a Trigger, here in its plain form. */
    private final Debouncer m_pieceFilter =
            new Debouncer(ArmConstants.kBeamDebounce.in(Seconds));

    public Superstructure(Elevator elevator, Arm arm) {
        m_elevator = elevator;
        m_arm = arm;
    }

    @Override
    public void periodic() {
        boolean hasPiece = m_pieceFilter.calculate(m_arm.hasGamePiece());

        // The transitions the robot makes for itself, once the hardware has
        // actually caught up. These don't consult canGoTo: that rule is about
        // requests, and this is the state machine deciding, not asking.
        switch (m_state) {
            case UNHOMED -> {
                if (m_elevator.isHomed()) {
                    m_state = SuperstructureState.IDLE;
                }
            }
            case INTAKING -> {
                if (hasPiece) {
                    m_state = SuperstructureState.HANDOFF;
                }
            }
            case HANDOFF -> {
                if (!hasPiece) {
                    m_state = SuperstructureState.IDLE;
                } else if (m_elevator.atGoal() && m_arm.atGoal()) {
                    m_state = SuperstructureState.HOLDING;
                }
            }
            case HOLDING, SCORING -> {
                if (!hasPiece) {
                    m_state = SuperstructureState.IDLE;
                }
            }
            case IDLE -> {
                // Nothing happens here on its own. Somebody has to ask.
            }
        }

        Logger.recordOutput("Superstructure/State", m_state);
    }

    /** What the robot is doing. Everything downstream reads this instead of sensors. */
    public SuperstructureState getState() {
        return m_state;
    }

    /** True exactly while the robot is in this state, as a Trigger you can bind to. */
    public Trigger inState(SuperstructureState state) {
        return new Trigger(() -> m_state == state);
    }

    /** Ask to start intaking: drop the arm, then spin the roller. */
    public Command requestIntake() {
        return Commands.sequence(
                        Commands.runOnce(() -> m_state = SuperstructureState.INTAKING),
                        m_arm.goToAngle(ArmConstants.kIntake),
                        m_arm.runRoller(ArmConstants.kIntakeSpeed))
                .onlyIf(() -> allow(SuperstructureState.INTAKING));
    }

    /** Ask to score: spin the roller out. The piece leaving is what ends the state. */
    public Command requestScore() {
        return Commands.sequence(
                        Commands.runOnce(() -> m_state = SuperstructureState.SCORING),
                        m_arm.runRoller(ArmConstants.kEjectSpeed))
                .onlyIf(() -> allow(SuperstructureState.SCORING));
    }

    /** Ask to give up and go back to neutral. */
    public Command requestIdle() {
        return Commands.runOnce(() -> m_state = SuperstructureState.IDLE)
                .onlyIf(() -> allow(SuperstructureState.IDLE));
    }

    /**
     * The handoff — the thing Lesson 22 did without being able to name it. Bound
     * to arriving in HANDOFF, so there is no guard here: getting to this state at
     * all means the state machine already said yes.
     */
    public Command handoff() {
        return Commands.parallel(
                m_arm.goToAngle(ArmConstants.kStowed),
                m_elevator.goToHeight(ElevatorConstants.kScoreMid));
    }

    /** Back to neutral: arm stowed, elevator down. Bound to arriving in IDLE. */
    public Command stow() {
        return Commands.parallel(
                m_arm.goToAngle(ArmConstants.kStowed),
                m_elevator.goToHeight(ElevatorConstants.kStowed));
    }

    /**
     * True when a request is legal. A refusal gets written to the log, because a
     * refusal nobody can see is a bug report nobody ever files.
     */
    private boolean allow(SuperstructureState next) {
        boolean ok = m_state.canGoTo(next);
        if (!ok) {
            Logger.recordOutput("Superstructure/Rejected", m_state + " -> " + next);
        }
        return ok;
    }
}
```

---

## 8. The strip forgets everything

Now the payoff Lesson 23 was set up for.

`Leds` currently takes an `Elevator` and an `Arm`, reads four booleans off them,
and runs an ordered chain to decide which one wins. Every one of those things is
now somebody else's job. The robot is in exactly one state, that state carries its
own pattern, and there is nothing left to prioritise.

**Replace `Leds.java` entirely with:**

```java
package frc.robot.subsystems;

import java.util.function.Supplier;

import edu.wpi.first.wpilibj.AddressableLED;
import edu.wpi.first.wpilibj.AddressableLEDBuffer;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.LEDPattern;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.LedConstants;

/**
 * The strip. It knows one thing — what the robot is doing — and nothing at all
 * about how the robot worked that out. No Elevator, no Arm, no sensors.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO pattern
 * exists to make sensor *inputs* replayable. There are none to replay.
 */
public class Leds extends SubsystemBase {
    private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
    private final AddressableLEDBuffer m_buffer =
            new AddressableLEDBuffer(LedConstants.kLength);

    private final Supplier<SuperstructureState> m_state;

    public Leds(Supplier<SuperstructureState> state) {
        m_state = state;

        m_strip.setLength(m_buffer.getLength());
        m_strip.start();
    }

    @Override
    public void periodic() {
        // The state says what the robot is doing. Being disabled says whether
        // anyone can act on it. Two questions, so two lines.
        LEDPattern pattern = m_state.get().pattern();
        if (DriverStation.isDisabled()) {
            pattern = pattern.breathe(LedConstants.kBreathePeriod);
        }

        pattern.applyTo(m_buffer);
        m_strip.setData(m_buffer);
    }
}
```

Look at what's gone: the `Elevator` field, the `Arm` field, the `Logger` import,
the `allianceColor` helper, the whole `if`/`else` chain, and the `Leds/Showing`
log key. `Leds.java` no longer imports a single subsystem.

The constructor is the interesting part. It takes a `Supplier<SuperstructureState>`
— "something I can ask for the current state" — rather than the object that
happens to know it. You've seen this before: Lesson 15 handed each camera
`m_localizer::getPose` instead of the `Localizer`, for the same reason. **Ask for
the narrowest thing that does the job.** A class that takes two subsystems can
reach into either of them and do anything at all; a class that takes a supplier
can do precisely one thing, and you can tell that from the constructor line
without reading the body.

Disabled stays a separate question on purpose. The robot is in a state whether or
not the field has enabled it — being disabled doesn't mean it forgot it's holding
a game piece. So the state picks the pattern, and being disabled layers a slow
breathe on top of whatever that pattern already was.

---

## 9. Wire it up and run it

`RobotContainer` is where the change becomes visible, because most of it turns
into deletions.

**Replace the `m_leds` field line in `RobotContainer` with these three lines:**

```java
  private final Superstructure m_superstructure = new Superstructure(m_elevator, m_arm);
  // Not the subsystems — just a way to ask what the robot is doing.
  private final Leds m_leds = new Leds(m_superstructure::getState);
```

Declaration order still matters: `m_superstructure` reads the elevator and arm, so
it's declared after both, and `m_leds` reads the superstructure, so it comes last.

**Add both imports to the `frc.robot.subsystems` group:**

```java
import frc.robot.subsystems.Superstructure;
import frc.robot.subsystems.SuperstructureState;
```

**Delete the arm buttons from `configureBindings()`, comment and all:**

```java
    // X drops the arm to the floor, Y tucks it back up. Hold a bumper to run
    // the roller — it stops on its own when you let go.
    m_driverController.x().onTrue(m_arm.goToAngle(ArmConstants.kIntake));
    m_driverController.y().onTrue(m_arm.goToAngle(ArmConstants.kStowed));
```

**Delete both bumper bindings:**

```java
    m_driverController.rightBumper().whileTrue(m_arm.runRoller(ArmConstants.kIntakeSpeed));
    m_driverController.leftBumper().whileTrue(m_arm.runRoller(ArmConstants.kEjectSpeed));
```

**Delete the capture binding and the score binding, comments and all:**

```java
    // Capture. The beam break says a piece is really in there — not that the
    // roller is spinning. Debounced, so a piece tumbling past can't trigger it.
    new Trigger(m_arm::hasGamePiece)
        .debounce(ArmConstants.kBeamDebounce.in(Seconds))
        .onTrue(Commands.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kScoreMid)));

    // Score, but only when it makes sense: a piece on board, and the elevator
    // actually arrived where it was sent.
    m_driverController.rightTrigger()
        .and(m_arm::hasGamePiece)
        .and(m_elevator::atGoal)
        .whileTrue(m_arm.runRoller(ArmConstants.kEjectSpeed));
```

**Add this in their place, at the end of `configureBindings()`:**

```java
    // Buttons ask the superstructure for a state. They don't check whether it
    // makes sense — that's the state machine's job, and it refuses out loud.
    m_driverController.x().onTrue(m_superstructure.requestIntake());
    m_driverController.y().onTrue(m_superstructure.requestIdle());
    m_driverController.rightTrigger().onTrue(m_superstructure.requestScore());

    // Motion that belongs to a state, bound to arriving in it. No guard here:
    // being in the state at all means the state machine already said yes.
    m_superstructure.inState(SuperstructureState.HANDOFF)
        .onTrue(m_superstructure.handoff());
    m_superstructure.inState(SuperstructureState.IDLE)
        .onTrue(m_superstructure.stow());
```

**Delete three imports that nothing uses any more:**

```java
import static edu.wpi.first.units.Units.Seconds;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.Constants.ArmConstants;
```

Read the new bindings and notice what's missing: no `hasGamePiece`, no `atGoal`,
no debounce, no `and(...)` chain. **Not one binding mentions a sensor.** The three
buttons name states, and the two state bindings name motion. Everything about
*when* now lives in `Superstructure`, in one method you can read top to bottom.

The homing binding, the re-zero `Trigger`, the D-pad heights, and everything to do
with driving stay exactly as they are.

> The D-pad still moves the elevator without telling the superstructure. That's
> deliberate — a manual override is a genuinely useful thing to have, and it isn't
> lying about the state because it never claimed to be part of the cycle. Whether
> that's a wart or a feature is a real design argument, and Try It #4 asks you to
> take a side.

**Run it:**

```powershell
./gradlew simulateJava
```

Open AdvantageScope and put `Superstructure/State` on a graph. You'll get one
line of readable names rather than a wall of booleans.

Now drive the cycle and watch both the graph and the SimGUI LED strip:

1. **On boot** the state is `UNHOMED` and the strip blinks red. Press X. Nothing
   happens — check `Superstructure/Rejected` and you'll see `UNHOMED -> INTAKING`.
2. **Press Back** to home. The moment the switch trips, the state flips to `IDLE`,
   the strip goes dim blue, and the arm and elevator stow themselves.
3. **Press X.** State goes `INTAKING`, strip goes solid yellow, arm drops, roller
   spins. Drive over a game piece.
4. **Watch the handoff.** The instant the beam break debounces true, the state
   becomes `HANDOFF` and the strip blinks yellow while both mechanisms move. When
   they both arrive, it settles to `HOLDING` and solid green.
5. **Pull the right trigger.** `SCORING`, blinking green, roller reversing. The
   moment the piece is gone the state drops to `IDLE` on its own and everything
   stows.

Then try to break it. Pull the trigger in `IDLE`. Press X while `HOLDING`. Every
one gets refused, and every refusal shows up in the log with both states named.

---

## Try it

1. **Bring back the alliance colour.** Lesson 23's strip glowed red or blue to
   match the alliance, and it doesn't any more — an enum constant is `static
   final` and gets built before the robot has ever spoken to a field, so it can't
   possibly know. There are two decent fixes: have the constant carry something
   that *produces* a pattern rather than a finished one, or special-case `IDLE`
   back in `Leds`. Pick one, implement it, and be ready to say why the other is
   worse.
2. **Add a `CLIMBING` state** that can only be entered from `IDLE` and can't be
   left at all. Add the constant first and see which files stop compiling before
   you fix anything — that list *is* the answer to "what did I forget."
3. **Make a refusal visible to the driver.** `Superstructure/Rejected` helps you
   afterwards; it does nothing for the person holding the controller. Flash the
   strip on a rejected request. The tricky part isn't the flash — it's that
   `allow` runs inside a `BooleanSupplier` and the strip is updated in a
   different subsystem's `periodic()`, so you'll need somewhere to put the fact
   in between.
4. **Take a side on the D-pad.** Work out exactly what happens if the driver taps
   D-pad up in the middle of a handoff, then decide whether to leave it, refuse it
   while a cycle is running, or give manual control its own state. Any of the
   three is defensible; write a comment saying which you chose and why.
5. **Replay a log** from before this lesson with `Mode.REPLAY`. `Superstructure/State`
   will be reconstructed from inputs the old code never recorded — think about why
   that works, and what it says about where the state actually comes from.

---

## What you learned

The robot has a name for what it's doing now, and that turned out to change more
than it sounds like it should.

**A pile of booleans isn't a state.** Five sensors can be read at any instant and
still leave "what is this thing doing" unanswerable, because some situations have
duration and no reading has duration. Once you catch yourself wanting to say "it's
in the middle of…", stop stacking conditions — you want a state.

**The two questions are different questions.** *Can the robot get there from here*
is a fact about the design: it never changes, it reads nothing, and it belongs
somewhere you can look at it and see the whole robot at once. *Should it go there
now* is a fact about this instant, and it belongs where the sensors are. Keeping
them apart is what stopped `canGoTo` from turning into another `and(...)` chain,
and it's the idea from this lesson that transfers furthest.

**Let the compiler hold the invariants it can.** The exhaustive `switch` is a small
thing that does real work: add a state and the build breaks until you've said what
it can do. That's a class of bug — the one where you updated four of the five
places — deleted rather than defended against. When you get the chance to make a
mistake impossible instead of unlikely, take it.

And the smaller one worth carrying: **ask for the narrowest thing that does the
job.** `Leds` used to take two subsystems and could have done anything with them.
Now it takes a supplier, does one thing, and you can tell that from the
constructor without reading a line of the body. That's the same instinct behind
the IO layers, and behind Lesson 15 passing `m_localizer::getPose` — narrow
dependencies are easier to test, easier to replace, and much harder to misuse.

That's the mechanisms half done. You have four subsystems, sensors that fail safe,
a picture you can watch, a strip that says what's happening, and one value that
ties it all together. Go run a full cycle in sim a few times and enjoy watching it
work — you built every piece of it.
