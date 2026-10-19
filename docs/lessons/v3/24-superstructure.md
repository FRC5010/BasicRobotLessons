# Lesson 24 — Superstructure: one thing that says yes or no

**Goal:** Replace three lessons' worth of buttons and triggers that each
independently move a mechanism with one state machine — an enum that says
what's *allowed*, and a class that says what's *happening now* — so the
robot's elevator and arm can only ever be doing one recognizable thing at a
time, and the beam break from Lesson 22 moves the robot through its own
cycle.

**New Java concepts**
- An **enum with a constructor, a field, and a method.** Every value of
  `SuperstructureState` carries its own `LEDPattern` and answers its own
  legality question — an enum constant can be more than a name.
- An **exhaustive switch expression** over that enum. Add a state and the
  compiler stops compiling until you say what it's allowed to do.
- A **hand-built guard.** This framework's `Command` doesn't ship a "run
  this only if" method, so you'll build the check yourself, once, and
  reuse the shape for every request.

**New robot concepts**
- **Legality vs. readiness.** One rule decides what a request is *allowed*
  to ask for. A completely separate rule decides what starts
  *automatically*. They are not the same question, and mixing them up is
  the whole failure mode this lesson exists to prevent.
- **A state, not a condition.** Lesson 23 ended on this: some things
  about a robot aren't true-or-false checks on a sensor, they're a mode
  the robot is in — "mid-handoff" is the one that needed a name. This
  lesson gives that idea a real type.

---

## 1. The bug that's already sitting in your code

Open `RobotTeleop.java` and look at the D-pad bindings from Lesson 18:

*Nothing to add — this is code you already have:*

```java
    robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));
    robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));
    robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));
```

Power the robot on right now, before touching Back, before homing
anything, and press D-pad up. The carriage drives itself toward full
height on an encoder that — per Lesson 21 — hasn't been zeroed against
anything real yet. Nothing in `goToHeight` checks whether homing ever
happened. It can't; that isn't `Elevator`'s job, and bolting a homed-check
onto every mechanism's every command is exactly the kind of thing that
gets forgotten on the one button that matters.

That's not a hypothetical. It's the actual behavior of the actual code in
this project, right now, and it's been true since Lesson 18. The reason
it hasn't bitten you yet is that you've been the one testing it, in
order, remembering to press Back first.

The D-pad isn't the only thing that's accumulated. Lessons 20 through 22
left `RobotTeleop` with a button that drops the arm, another that stows
it, a bumper that spins the roller in and another that spins it out, a
`Trigger` on the beam break that raises the elevator and stows the arm
together, and a score binding that's three conditions stapled together —
a trigger pull, *and* a game piece, *and* the elevator having arrived.
Every one of them works. Ask a harder question, though: **what is the
robot doing right now?** You can read a few booleans and infer something,
but "in the middle of handing a piece off" isn't a reading anything on the
robot reports.

What you want is a single place that can say **no** — not "the elevator
declines to move," but "that's not a legal thing to ask for right now" —
and a way to ask it before the request ever reaches a motor.

---

## 2. An enum that knows more than its name

Every `enum` you've written so far has been a bare list of names —
`Mode.REAL`, `Mode.SIM`, `Mode.REPLAY`. An enum constant can carry more
than that. It can have a constructor, fields, and methods, exactly like
any other object — there are just a fixed number of instances, one per
name you write.

`SuperstructureState` is going to be the whole vocabulary of what this
robot's elevator-and-arm combo can be doing. Six names cover the whole
game cycle:

| State | The robot is… |
|---|---|
| `UNHOMED` | freshly booted, and doesn't yet know where its own carriage is |
| `IDLE` | homed, empty, everything stowed, waiting to be asked |
| `INTAKING` | arm down, roller spinning, looking for a piece |
| `HANDOFF` | holding a piece, moving the arm and elevator to carry it |
| `HOLDING` | piece secured, mechanisms in place, ready to score |
| `SCORING` | pushing the piece out |

`HANDOFF` is the one worth stopping on. It's tempting to leave it out — a
piece is either in the intake or it isn't, and the mechanisms are either at
their goals or they aren't, so isn't "handoff" just those two facts? No.
Both of those facts are also true a moment after you've *finished* handing
off, and again if the driver moves things by hand. `HANDOFF` isn't a
reading. It's a stretch of time the robot is passing through, with a
beginning, an end, and a specific piece of motion that belongs to it.
**A state machine is for the situations that have duration.**

**Create `subsystems/SuperstructureState.java`:**

```java
package first.robot.subsystems;

import org.wpilib.hardware.led.LEDPattern;

import first.robot.Constants.LedConstants;

public enum SuperstructureState {
  UNHOMED(LedConstants.kUnhomed),
  IDLE(LedConstants.kIdle),
  INTAKING(LedConstants.kIntaking),
  HANDOFF(LedConstants.kHandoff),
  HOLDING(LedConstants.kHolding),
  SCORING(LedConstants.kScoring);

  private final LEDPattern m_pattern;

  SuperstructureState(LEDPattern pattern) {
    m_pattern = pattern;
  }

  public LEDPattern pattern() {
    return m_pattern;
  }
}
```

Each constant calls the constructor with a different `LEDPattern`, the
same way you'd call any other constructor — `UNHOMED(LedConstants.kUnhomed)`
is a constructor call that happens to be the way you *declare* the
constant. `pattern()` is a completely ordinary accessor. Nothing about
this half is new except where it's written.

It's called `SuperstructureState` and not `RobotState` because WPILib
already ships a class called `RobotState` (Lesson 23's `Leds` imports it),
and having two of those in one file is a first compile error nobody enjoys.

**In `Constants.java`'s `LedConstants`, replace `kNotHomed`,
`kHasGamePiece`, and `kBreathePeriod` with one pattern per state. Keep
`kPwmPort`, `kLength`, and `kIdleBrightness`, with `kIdleBrightness` above
the lines that use it:**

```java
    // One pattern per SuperstructureState, built once, here, next to the
    // color it uses — SuperstructureState's constructor just picks one up.
    public static final Dimensionless kIdleBrightness = Percent.of(25);
    public static final Time kBlinkPeriod = Seconds.of(0.15);

    public static final LEDPattern kUnhomed = LEDPattern.solid(Color.RED).blink(kBlinkPeriod);
    public static final LEDPattern kIdle = LEDPattern.solid(Color.BLUE).atBrightness(kIdleBrightness);
    public static final LEDPattern kIntaking = LEDPattern.solid(Color.YELLOW);
    public static final LEDPattern kHandoff = kIntaking.blink(kBlinkPeriod);
    public static final LEDPattern kHolding = LEDPattern.solid(Color.LIME_GREEN);
    public static final LEDPattern kScoring = kHolding.blink(kBlinkPeriod);

    public static final Time kBreathePeriod = Seconds.of(2);
```

Two of those are built out of the two above them — `kHandoff` is
`kIntaking` blinking, `kScoring` is `kHolding` blinking. That's Lesson 23's
combinator idea doing real work: a pattern is a value, so of course you can
build a value out of another one. Lesson 23's "has a game piece" green
lives on as `kHolding`.

> **Declaration order matters here.** `kIdleBrightness` and `kBlinkPeriod`
> are used by the constants below them, and a static field can't be read
> before it's declared.

`kIdle` is a fixed blue, not the alliance color `Leds` used to compute at
runtime — a `static final` field is built once, when the class first
loads, long before any driver station has told the robot which alliance
it's on. That's a real limitation, not an oversight, and it's a Try It
rather than something to work around here.

---

## 3. Legality: a rulebook, not a sensor reading

Now the part that makes the enum worth building: `canGoTo`. Given the
state the robot is in, is a particular *next* state a legal thing to ask
for?

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
```

Read it as a table and it's the whole robot in a few lines. From `IDLE`
the only thing you can ask for is intaking. From `HOLDING` you can score,
or give up and go back to neutral. Everything not listed is refused —
including scoring from `INTAKING` or `IDLE`, because nothing is on board
to score.

Read `UNHOMED -> false` first, because it's the one rule the rest of this
lesson depends on. **No matter what `next` is, `UNHOMED.canGoTo(next)` is
false.** Not "false unless you're careful" — false, unconditionally,
forever, for every possible argument. There is exactly one way out of
`UNHOMED`, and it isn't a request at all — you'll write it in the next
section, and it's one of the transitions in this whole file that doesn't
go through `canGoTo`.

Notice this is a **switch expression**, not a switch statement — every
arm produces a value with `->`, and there's no `default`. That's not a
style choice. Try commenting out the `SCORING` case and compiling: the
compiler refuses, because a `switch` expression over an enum has to
cover every constant. Add a seventh state later — say, for climbing — and
the same thing happens: the build breaks at `canGoTo` until you type out
what the new state is allowed to do. You cannot forget a case. The
compiler is doing code review on your state machine every time you touch
it.

And notice what `canGoTo` does *not* do: it reads nothing off the robot.
No sensor, no elevator height, no arm angle — just `this` and `next`.
That's deliberate, and it's the whole idea of the next section.

---

## 4. Superstructure: legality and readiness are different jobs

`canGoTo` answers "is this allowed." Something else has to answer "what's
actually happening," and the two are not the same question. A request can
be perfectly legal and still be something nobody asked for yet — legality
is about permission, not action. And `HANDOFF → HOLDING` is legal at all
times, but it should only actually *happen* once the elevator and arm have
finished moving, which depends on where the hardware is this instant.
Cramming that into `canGoTo` would ruin it: the enum would start reading
sensors, and you could no longer look at it and see the robot's design.

So they live apart:

- **Legality** is a rule about the robot. It lives in the enum, it reads
  nothing, and it never changes. It governs what somebody is allowed to
  *ask for*.
- **Readiness** is a fact about this instant. It lives in `periodic()`, it
  reads the mechanisms, and it governs what the robot does *on its own*.

**Create `subsystems/Superstructure.java`, starting with the fields and
constructor:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Seconds;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.Trigger;
import org.wpilib.math.filter.Debouncer;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;

public class Superstructure {
  private final Elevator m_elevator;
  private final Arm m_arm;
  private SuperstructureState m_state = SuperstructureState.UNHOMED;

  /** The filter Lesson 22 hung on a Trigger, here in its plain form. */
  private final Debouncer m_pieceFilter = new Debouncer(ArmConstants.kBeamDebounce.in(Seconds));

  public Superstructure(Elevator elevator, Arm arm) {
    m_elevator = elevator;
    m_arm = arm;
    Scheduler.getDefault().addPeriodic(this::periodic);
  }
}
```

The robot boots into `UNHOMED`. Every robot does, every match, because
the encoder genuinely doesn't know where the carriage is until homing
says so — this is the same fact Lesson 21 built `home()` around.

That `Debouncer` is a familiar idea wearing different clothes. In Lesson 22
you wrote `.debounce(ArmConstants.kBeamDebounce)` on a `Trigger`, and that
decorator was wrapping this class the whole time. Now that the beam break
is read here instead of in a binding, you use the filter directly: same
behavior, same constant, one layer less.

**Add `periodic()` below the constructor — everything the robot decides for
itself:**

```java
  private void periodic() {
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

    Telemetry.log("Superstructure/State", m_state.name());
  }
```

Walk the cycle once and it reads like a description of a match. Boot into
`UNHOMED` and sit there until somebody homes — that's the only exit, and
now it's the only exit in code too. From `INTAKING`, a debounced beam
break means a piece arrived, so start the handoff. From `HANDOFF`, wait
until *both* mechanisms report `atGoal` before calling the piece secured.
And losing the piece drops you back to `IDLE` from anywhere it can happen,
which is also how `SCORING` ends — the piece leaving is what finishes
scoring, not a timer.

That's why `periodic()` never calls `canGoTo`. `canGoTo` is a rulebook for
*requests* — things a button asks for. These transitions aren't requests;
they're `Superstructure` noticing a fact about the world and updating its
own belief to match. Nobody asked to leave `UNHOMED`. The elevator simply
stopped being un-homed. Nobody asked for `HOLDING`, either; the arm and
elevator arrived.

`Superstructure` is a plain class, the same shape as `Localizer` from
Lesson 14 — it needs the scheduler, for `periodic()`, but nothing ever
requires *it*, so it never needed to be a `Mechanism`. **What makes
something worth a heartbeat isn't owning hardware — it's needing the
scheduler.** (Lesson 7 made the opposite call for `SwerveModule`, which
stopped being a subsystem because it never decided anything on its own;
this is the mirror image.)

The last line logs the state by name, so `Superstructure/State` shows up
as one readable line of text rather than a wall of booleans. It replaces
Lesson 23's `Leds/Showing`: that one recorded what the strip decided; this
one records what the robot *was*, which is the thing you want when you're
reading a log a week later.

**Finish the read-side with two small accessors, below `periodic()`:**

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

`inState` is nothing you haven't built before — it's the same shape as
Lesson 21's `new Trigger(m_elevator::atBottomLimit)`, just wrapping a
comparison instead of a sensor read. A `Trigger` doesn't care where its
boolean comes from.

---

## 5. Requests: guarded, and empty-handed on purpose

A request is a button asking to change `m_state`. Buttons get pressed at
the wrong time — that's not a character flaw, it's what happens when
you're looking at a field instead of a controller — so a request has to
check `canGoTo` before it's allowed to. And — this is the part worth
sitting with — **it should not require anything.**

Think about what "requires the elevator" would mean here. If pressing the
score button scheduled a command that required `Elevator`, and the
elevator happened to be mid-motion on some other command, scheduling the
request would cancel that motion just to ask a question. A request isn't
motion. It's a decision. Decisions shouldn't be able to interrupt
anything, and in this framework, a command that requires nothing *can't*
— there's nothing for it to preempt.

**Add to `Superstructure`, below the accessors:**

```java
  // --- Requests: button-bound, guarded, and nothing but a mode switch. ---

  public Command requestIntake() {
    return request(SuperstructureState.INTAKING);
  }

  public Command requestIdle() {
    return request(SuperstructureState.IDLE);
  }

  public Command requestScore() {
    return request(SuperstructureState.SCORING);
  }

  private Command request(SuperstructureState next) {
    return Command.noRequirements(coroutine -> {
          if (!allow(next)) {
            return;
          }
          m_state = next;
        })
        .named("Request " + next.name());
  }

  /** Legality check, logged on refusal — a refused request looks identical to a broken button otherwise. */
  private boolean allow(SuperstructureState next) {
    boolean ok = m_state.canGoTo(next);
    if (!ok) {
      Telemetry.log("Superstructure/Rejected", m_state + " -> " + next);
    }
    return ok;
  }
```

`Command.noRequirements(...)` — you've used this exact call before, on
`Elevator.rezeroAtBottom()` in Lesson 21. Its body is a `Coroutine`
lambda that runs once, from the top, when the command starts. That's the
whole trick behind the guard: `if (!allow(next)) { return; }` is checked
exactly once, at the moment the button is pressed, and if it fails the
command's body simply ends there. Nothing gets scheduled, nothing moves,
and `m_state` never changes. There's no built-in "run this only if"
method to reach for here — you don't need one. A coroutine that checks a
condition and returns early *is* the guard, in one line, with nothing
hidden behind it.

`allow` logs every refusal to `Superstructure/Rejected`. From the
driver's seat, a request that got refused looks *exactly* like a request
that never registered — same nothing happens. Without that log line,
you'd have no way to tell "the button didn't work" from "the button
worked and the state machine said no," and those are very different bugs
to be debugging at 2 AM before a competition.

---

## 6. Motion: unguarded, because arriving already said yes

Requests only ever touch `m_state`. Something else has to actually move
the elevator and arm once a state is reached — and that something doesn't
need to ask permission, because by the time you're *in* a state, the
legality question is already answered. Asking again would be redundant at
best and would give a second, inconsistent opinion at worst.

**The rule that keeps this straight: a command bound to a button guards
itself; a command bound to a state doesn't.**

**Add four motion commands, below `allow`:**

```java
  // --- Motion: inState-bound, unguarded, because arriving already means yes. ---

  /** Both steps require Arm — the same Mechanism — so this has to be a sequence, not a parallel. */
  public Command intakeMotion() {
    return Command.sequence(
            m_arm.goToAngle(ArmConstants.kIntake),
            m_arm.runRoller(ArmConstants.kIntakeSpeed))
        .named("Intake Motion");
  }

  /**
   * The handoff — the thing Lesson 22 did without being able to name it. Arm
   * and elevator require different Mechanisms, so this may run in parallel.
   */
  public Command handoffMotion() {
    return Command.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kScoreMid))
        .named("Handoff Motion");
  }

  /** Roller out. The piece leaving is what ends the state, not a timer. */
  public Command scoreMotion() {
    return m_arm.runRoller(ArmConstants.kEjectSpeed);
  }

  /** Back to neutral: arm stowed, elevator down. */
  public Command idleMotion() {
    return Command.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kStowed))
        .named("Idle Motion");
  }
```

Two different shapes here, and the reason is worth catching. `handoffMotion`
and `idleMotion` use `Command.parallel(...)` — the arm move and the
elevator move require different `Mechanism`s, so nothing conflicts. But
`intakeMotion` swings the arm to `kIntake` *and* runs the arm's roller,
and Lesson 20 made `Arm` one `Mechanism` for both motors — the pivot and
the roller are the same physical thing, so both commands require the same
`Arm`. `Command.parallel` won't let two of its commands require the same
Mechanism; it has no way to decide which one actually owns the motor.
`Command.sequence` sidesteps the question by never running them at the
same time — the arm swings down, and only once `goToAngle` finishes does
`runRoller` start, which is a perfectly sensible way to intake anyway: get
into position, then spin.

`HOLDING` has no motion at all. By the time the robot gets there the arm
is stowed and the elevator is at `kScoreMid`, and Phoenix keeps holding
both — there's nothing left to command.

`scoreMotion` reaches for `ArmConstants.kEjectSpeed` — the roller running
backward, which has been sitting in `Constants.java` since Lesson 20.

---

## 7. The strip forgets everything

Now the payoff Lesson 23 was set up for.

`Leds` currently takes an `Elevator` and an `Arm`, reads two booleans off
them, and runs an ordered chain to decide which one wins. Every one of
those things is now somebody else's job. The robot is in exactly one state,
that state carries its own pattern, and there is nothing left to
prioritize. (Lesson 23's "not homed outranks has a piece" didn't go away —
it became structural. `UNHOMED` can't turn into anything but `IDLE`, so a
piece loaded before homing can never make the strip say `HOLDING`.)

**Replace `Leds.java` entirely with:**

```java
package first.robot.subsystems;

import java.util.function.Supplier;

import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.RobotState;
import org.wpilib.hardware.led.AddressableLED;
import org.wpilib.hardware.led.AddressableLEDBuffer;
import org.wpilib.hardware.led.LEDPattern;

import first.robot.Constants.LedConstants;

public class Leds {
  private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
  private final AddressableLEDBuffer m_buffer = new AddressableLEDBuffer(LedConstants.kLength);

  private final Supplier<SuperstructureState> m_state;

  public Leds(Supplier<SuperstructureState> state) {
    m_state = state;

    m_strip.setLength(m_buffer.getLength());
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    // The state says what the robot is doing. Being disabled says whether
    // anyone can act on it. Two questions, so two lines.
    LEDPattern pattern = m_state.get().pattern();
    if (RobotState.isDisabled()) {
      pattern = pattern.breathe(LedConstants.kBreathePeriod);
    }

    pattern.applyTo(m_buffer);
    m_strip.setData(m_buffer);
  }
}
```

Look at what's gone: the `Elevator` field, the `Arm` field, the `Telemetry`
and alliance-color imports, the whole `if`/`else` chain, and the
`Leds/Showing` log key. `Leds.java` no longer imports a single subsystem.

The constructor is the interesting part. It takes a
`Supplier<SuperstructureState>` — "something I can ask for the current
state" — rather than the object that happens to know it. You've seen this
before: Lesson 16 handed each camera `drivetrain::getSimulatedPose` instead
of the `Drivetrain`, for the same reason. **Ask for the narrowest thing
that does the job.** A class that takes two subsystems can reach into
either of them and do anything at all; a class that takes a supplier can do
precisely one thing, and you can tell that from the constructor line
without reading the body.

Disabled stays a separate question on purpose. The robot is in a state
whether or not the field has enabled it — being disabled doesn't mean it
forgot it's holding a game piece. So the state picks the pattern, and
being disabled layers a slow breathe on top of whatever that pattern
already was.

---

## 8. Wiring: requests to buttons, motion to state

Two different kinds of binding, matching the two kinds of command. Most of
this section is deletions: the bindings from Lessons 20 and 22 that moved
mechanisms directly are exactly what the state machine replaces.

**In `RobotTeleop.java`'s constructor, delete the arm buttons and the
roller bumpers, comment and all:**

```java
    // The left face button drops the arm to the floor; the top one tucks it
    // back up. Hold a bumper to run the roller — it stops when you let go.
    robot.driverController.faceLeft().onTrue(robot.arm.goToAngle(ArmConstants.kIntake));
    robot.driverController.faceUp().onTrue(robot.arm.goToAngle(ArmConstants.kStowed));
    robot.driverController.rightBumper().whileTrue(robot.arm.runRoller(ArmConstants.kIntakeSpeed));
    robot.driverController.leftBumper().whileTrue(robot.arm.runRoller(ArmConstants.kEjectSpeed));
```

**Delete the capture binding and the score binding, comments and all:**

```java
    // Capture. The beam break says a piece is really in there, not that the
    // roller is spinning. Debounced, so a piece tumbling past can't trigger it.
    new Trigger(robot.arm::hasGamePiece)
        .debounce(ArmConstants.kBeamDebounce)
        .onTrue(Command.parallel(
                robot.arm.goToAngle(ArmConstants.kStowed),
                robot.elevator.goToHeight(ElevatorConstants.kScoreMid))
            .named("Capture"));

    // Score, but only when it makes sense: a piece on board, and the elevator
    // actually arrived where it was sent.
    robot.driverController.rightTrigger()
        .and(robot.arm::hasGamePiece)
        .and(robot.elevator::atGoal)
        .whileTrue(robot.arm.runRoller(ArmConstants.kEjectSpeed));
```

**Add the requests in their place, bound to buttons and guarded:**

```java
    // Face buttons ask the superstructure for a state: left to intake, top to
    // give up and go back to neutral, right trigger to score. They don't check
    // whether it makes sense — that's the state machine's job, and it refuses
    // out loud.
    robot.driverController.faceLeft().onTrue(robot.superstructure.requestIntake());
    robot.driverController.faceUp().onTrue(robot.superstructure.requestIdle());
    robot.driverController.rightTrigger().onTrue(robot.superstructure.requestScore());
```

**Then the motion — bound to the state itself, unguarded:**

```java
    // Motion that belongs to a state, bound to being in it. No guard here:
    // being in the state at all means the state machine already said yes. The
    // moment the state changes, whileTrue cancels the old motion. HOLDING has
    // none — the elevator and arm are already where they need to be.
    robot.superstructure.inState(SuperstructureState.INTAKING).whileTrue(robot.superstructure.intakeMotion());
    robot.superstructure.inState(SuperstructureState.HANDOFF).whileTrue(robot.superstructure.handoffMotion());
    robot.superstructure.inState(SuperstructureState.SCORING).whileTrue(robot.superstructure.scoreMotion());
    robot.superstructure.inState(SuperstructureState.IDLE).whileTrue(robot.superstructure.idleMotion());
```

**Add the import, and delete the two that nothing uses any more —
`org.wpilib.command3.Command` and `first.robot.Constants.ArmConstants`:**

```java
import first.robot.subsystems.SuperstructureState;
```

`whileTrue` schedules its command the moment the `Trigger` turns true and
cancels it the moment the `Trigger` turns false. Press the intake button
from `IDLE`: `requestIntake()` flips `m_state` to `INTAKING`, and on the
very next scheduler pass `inState(INTAKING)` goes true and `intakeMotion()`
starts. When the beam break fires, `periodic()` moves the state to
`HANDOFF`, `inState(INTAKING)` goes false, and `intakeMotion()` is canceled
— which means `runRoller`'s `.whenCanceled(...)` fires and the roller
actually stops — while `inState(HANDOFF)` picks up `handoffMotion()` in
the same tick. You never touch a motor directly. You say what state you
want, or the robot notices what state it's in, and the wiring turns that
into motion.

Read the new bindings and notice what's missing: no `hasGamePiece`, no
`atGoal`, no debounce, no `and(...)` chain. **Not one binding mentions a
sensor.** The three buttons name states, and the four state bindings name
motion. Everything about *when* now lives in `Superstructure`, in one
method you can read top to bottom.

The homing binding, the re-zero `Trigger`, the D-pad heights, and
everything to do with driving stay exactly as they are. The D-pad still
moves the elevator without telling the superstructure — the hole from
section 1. Try It #4 asks what to do about it.

**In `Robot.java`, declare the superstructure after `arm` and change
`leds` to read it:**

```java
  // Superstructure reads both, so elevator and arm must be finished objects
  // first — they already are, above.
  public final Superstructure superstructure = new Superstructure(elevator, arm);
  public final Leds leds = new Leds(superstructure::getState); // reads it; drives nothing
```

**Add the import:**

```java
import first.robot.subsystems.Superstructure;
```

Declaration order still matters: `superstructure` reads the elevator and
arm, so it comes after both, and `leds` reads the superstructure, so it
comes last. It also fixes tick order — the scheduler runs periodic
callbacks in registration order, so the elevator and arm have refreshed
their inputs by the time `Superstructure` reads them.

---

## 9. Run it

`./gradlew simulateJava`. The strip boots red and blinking, same as
before — `UNHOMED` still carries a blinking red.

1. **Press the left face button without homing first.** Nothing happens —
   not to the arm, not to `m_state`. Check `Superstructure/Rejected`:
   `UNHOMED -> INTAKING`. Try the right trigger and the top face button
   too; each is refused and logged the same way.
2. **Enable and press Back.** The elevator homes. The instant
   `elevator.isHomed()` goes true, `periodic()` moves `m_state` to `IDLE`
   on its own — nobody pressed anything for that part — the strip settles
   to a dim blue, and the idle motion stows everything.
3. **Press the left face button.** `Superstructure/State` reads
   `INTAKING`, the arm swings down to `kIntake`, and once it arrives the
   roller starts. The strip goes solid yellow. Drive over a game piece.
4. **Watch the handoff.** The instant the beam break debounces true, the
   state becomes `HANDOFF` and the strip blinks yellow while the arm
   stows and the elevator rises to `kScoreMid`. When both arrive it
   settles to `HOLDING` and solid green.
5. **Try to break it.** Press the left face button while `HOLDING` —
   refused, logged as `HOLDING -> INTAKING`. Pull the right trigger while
   `IDLE` — refused too.
6. **Pull the right trigger while `HOLDING`.** State becomes `SCORING`
   and the roller reverses. The piece leaves almost at once, so the state
   drops to `IDLE` on its own and everything stows — `SCORING` is a
   one-or-two-tick flicker in the log, which is fine. It's the *piece
   leaving*, not a timer, that ends it.

Every one of those transitions is visible in exactly two dashboard keys:
`Superstructure/State` for what's happening, `Superstructure/Rejected` for
what almost happened and didn't.

Measured in the simulator, with the real `Robot` and the real bindings,
driven through `GamepadSim` on a fixed 20 ms loop: homing from the start
height takes about 170 ticks (3.4 s) to reach `IDLE`. With the arm down
and the robot driving at a piece at a quarter stick, the beam break trips
the handoff about 35 ticks after the drive starts, and the machine reaches
`HOLDING` 55 ticks (1.1 s) after that, with the elevator at 0.75 m and the
arm at its goal. The strip reads solid yellow in `INTAKING`, solid green
in `HOLDING`, and dim blue in `IDLE` (breathing while disabled).

---

## Try it

1. **Add `CLIMBING`.** A seventh state, reachable only from `IDLE`, and
   once there the only legal move is staying — nothing, not even `IDLE`,
   can be requested from it (an emergency override is a different
   problem than this lesson solves). Add the constant to
   `SuperstructureState`, and watch `canGoTo` stop compiling until you
   add a `case CLIMBING`. That failure is the point: you cannot add a
   state to this machine without being forced to say what it does.
2. **Make alliance color real.** `kIdle` is a fixed blue because a
   `static final` field is built before any driver station has connected.
   Find a way to make the strip alliance-aware anyway — either have the
   constant carry something that *produces* a pattern rather than a
   finished one, or special-case `IDLE` back in `Leds`. Pick one,
   implement it, and be ready to say why the other is worse.
3. **Show a refusal on the strip, not just the dashboard.** Right now
   `Superstructure/Rejected` is the only sign a request failed, and it's
   easy to miss unless you're staring at the dashboard. Make `Leds`
   flash white, briefly, on a rejection — you'll need `Superstructure` to
   expose something `Leds` can watch that a plain state comparison can't
   give you.
4. **Take a side on the D-pad.** Section 1 showed you a real bug: the
   D-pad still drives `Elevator.goToHeight` directly, completely outside
   `canGoTo`. Work out exactly what happens if the driver taps D-pad up
   in the middle of a handoff — and note that it also cancels
   `idleMotion` while the state still says `IDLE`. Then decide whether to
   leave it as a manual override, refuse it while a cycle is running, or
   give manual control its own state. Any of the three is defensible;
   write a comment saying which you chose and why.

---

## What you learned

Three lessons built buttons that each moved one mechanism, one at a time,
trusting the driver to press them in the right order. This lesson didn't
add a new mechanism — it added the thing that had been missing the whole
time: a single place that knows what's legal and a single place that
knows what's true.

**Legality and readiness are different questions, and keeping them
separate is the design.** `canGoTo` never reads a sensor. `periodic()`
never asks permission. The moment those two responsibilities blur
together — a sensor reading treated as permission, or a request that
skips the rulebook because "it's probably fine" — you've rebuilt the bug
from section 1 with extra steps.

**A state is for the situations that have duration.** Nothing on the robot
reports "mid-handoff," so no stack of conditions could say it. Naming it
gave the beam break something to *drive*, and gave the strip something to
show.

**An enum can hold behavior, not just names.** `SuperstructureState`
carries a pattern and answers its own legality question, and the
compiler enforces that every state answers it — a switch expression with
no `default` is a promise that nothing gets forgotten.

**A command that requires nothing can't preempt anything.** That's not a
limitation you worked around; it's why requests are safe to fire at any
moment, from any button, without a second thought about what else is
running.

If the guard in section 5 felt like more machinery than you'd expect for
"only do this if," that's fair — you built it from a coroutine and an
early `return`, because this framework doesn't hand you a shortcut for
it. Now that you've built it once, you'll recognize the shape instantly
next time you need it.

Next: [Lesson 25 — Doing two things at once](25-path-events.md).
