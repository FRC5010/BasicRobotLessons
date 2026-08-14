# Lesson 24 — Superstructure: one thing that says yes or no

**Goal:** Replace three lessons' worth of buttons that each independently
move a mechanism with one state machine — an enum that says what's
*allowed*, and a class that says what's *happening now* — so the robot's
elevator and arm can only ever be doing one recognizable thing at a time.

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
  the robot is in. This lesson gives that idea a real type.

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
robot's elevator-and-arm combo can be doing: not homed yet, sitting idle,
reaching for a game piece, or scoring one. Four states.

**Create `subsystems/SuperstructureState.java`:**

```java
package first.robot.subsystems;

import org.wpilib.hardware.led.LEDPattern;

import first.robot.Constants.LedConstants;

public enum SuperstructureState {
  UNHOMED(LedConstants.kUnhomed),
  IDLE(LedConstants.kIdle),
  INTAKING(LedConstants.kIntaking),
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

**Add the four patterns it needs, replacing the single `kNotHomed` line
in `Constants.java`'s `LedConstants`:**

```java
    // One pattern per SuperstructureState, built once, here, next to the
    // color it uses — SuperstructureState's constructor just picks one up.
    public static final LEDPattern kUnhomed = LEDPattern.solid(Color.RED).blink(Seconds.of(0.15));
    public static final Dimensionless kIdleBrightness = Percent.of(25);
    public static final LEDPattern kIdle = LEDPattern.solid(Color.BLUE).atBrightness(kIdleBrightness);
    public static final LEDPattern kIntaking = LEDPattern.solid(Color.YELLOW);
    public static final LEDPattern kScoring = LEDPattern.solid(Color.LIME_GREEN).blink(Seconds.of(0.1));
```

`kIdle` is a fixed blue, not the alliance color `Leds` used to compute at
runtime — a `static final` field is built once, when the class first
loads, long before any driver station has told the robot which alliance
it's on. That's a real limitation, not an oversight, and it's this
lesson's Try It rather than something to work around here.

---

## 3. Legality: a rulebook, not a sensor reading

Now the part that makes the enum worth building: `canGoTo`. Given the
state the robot is in, is a particular *next* state a legal thing to ask
for?

**Add to `SuperstructureState`, below `pattern()`:**

```java
  /**
   * Is 'next' a legal move from this state? An exhaustive switch expression:
   * add a state and this stops compiling until you say what it can do.
   */
  public boolean canGoTo(SuperstructureState next) {
    return switch (this) {
      // No request of any kind gets the robot out of UNHOMED. The only exit
      // is Superstructure.periodic() noticing the elevator homed itself.
      case UNHOMED -> false;
      // You have to go get a piece before you can claim to be ready to
      // score one — IDLE can only ask to go collect.
      case IDLE -> next == INTAKING;
      case INTAKING -> next == IDLE || next == SCORING;
      case SCORING -> next == IDLE;
    };
  }
```

Read `UNHOMED -> false` first, because it's the one rule the rest of this
lesson depends on. **No matter what `next` is, `UNHOMED.canGoTo(next)` is
false.** Not "false unless you're careful" — false, unconditionally,
forever, for every possible argument. There is exactly one way out of
`UNHOMED`, and it isn't a request at all — you'll write it in the next
section, and it's the only transition in this whole file that doesn't go
through `canGoTo`.

Notice this is a **switch expression**, not a switch statement — every
arm produces a value with `->`, and there's no `default`. That's not a
style choice. Try commenting out the `SCORING` case and compiling: the
compiler refuses, because a `switch` expression over an enum has to
cover every constant. Add a fifth state later — say, for climbing — and
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
is about permission, not action.

**Create `subsystems/Superstructure.java`, starting with the fields and
constructor:**

```java
package first.robot.subsystems;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.Trigger;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants.ArmConstants;
import first.robot.Constants.ElevatorConstants;

public class Superstructure {
  private final Elevator m_elevator;
  private final Arm m_arm;
  private SuperstructureState m_state = SuperstructureState.UNHOMED;

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

**Add `periodic()`, the one automatic transition in the whole machine:**

```java
  /**
   * The only automatic transition in the whole machine, because it is the
   * only one backed by a sensor that still exists: the bottom limit switch
   * from Lesson 21. Every other move in this lesson has to be asked for.
   */
  private void periodic() {
    if (m_state == SuperstructureState.UNHOMED && m_elevator.isHomed()) {
      m_state = SuperstructureState.IDLE;
    }
    SmartDashboard.putString("Superstructure/State", m_state.name());
  }
```

This is the entire "readiness" side of the machine, and it's short on
purpose: there is exactly one fact this robot can check for itself
without being told, which is whether the elevator has ever touched its
bottom limit switch. Everything else — whether to go get a piece, whether
to score one — depends on something no sensor on this robot can see: is
there actually a piece in the mechanism right now? Nothing here reads
that, because nothing here *can*. Later hardware on a real robot might
add a sensor for exactly that question. Until then, the honest design is
to say so out loud rather than pretend: **the operator is the sensor**,
and every state past `UNHOMED` is something a human has to ask for.

That split is why `periodic()` never calls `canGoTo`. `canGoTo` is a
rulebook for *requests* — things a button asks for. The one transition
here isn't a request; it's Superstructure noticing a fact about the
world and updating its own belief to match. Mixing those two together —
letting `periodic()` consult the same legality table a button uses —
would make the automatic case just another kind of request, and it isn't
one. Nobody asked to leave `UNHOMED`. The elevator simply stopped being
un-homed.

**Finish the read-side with two small accessors:**

```java
  public SuperstructureState getState() {
    return m_state;
  }

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

A request is a button asking to change `m_state`. It needs to check
`canGoTo` before it's allowed to, and — this is the part worth sitting
with — **it should not require anything.**

Think about what "requires the elevator" would mean here. If pressing the
score button scheduled a command that required `Elevator`, and the
elevator happened to be mid-motion on some other command, scheduling the
request would cancel that motion just to ask a question. A request isn't
motion. It's a decision. Decisions shouldn't be able to interrupt
anything, and in this framework, a command that requires nothing *can't*
— there's nothing for it to preempt.

**Add to `Superstructure`, below the constructor:**

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
      SmartDashboard.putString("Superstructure/Rejected", m_state + " -> " + next);
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

**Add three motion commands, below `allow`:**

```java
  // --- Motion: inState-bound, unguarded, because arriving already means yes. ---

  /** Arm and elevator require different Mechanisms, so this may run in parallel. */
  public Command idleMotion() {
    return Command.parallel(
            m_elevator.goToHeight(ElevatorConstants.kStowed),
            m_arm.goToAngle(ArmConstants.kStowed))
        .named("Idle Motion");
  }

  /** Both steps require Arm — the same Mechanism — so this has to be a sequence, not a parallel. */
  public Command intakeMotion() {
    return Command.sequence(
            m_arm.goToAngle(ArmConstants.kIntake),
            m_arm.runRoller(ArmConstants.kIntakeSpeed))
        .named("Intake Motion");
  }

  /** Elevator and Arm require different Mechanisms, so this may run in parallel too. */
  public Command scoreMotion() {
    return Command.parallel(
            m_elevator.goToHeight(ElevatorConstants.kScoreHigh),
            m_arm.runRoller(ArmConstants.kEjectSpeed))
        .named("Score Motion");
  }
```

Two different shapes here, and the reason is worth catching. `idleMotion`
and `scoreMotion` use `Command.parallel(...)` — the elevator move and the
arm move require different `Mechanism`s, so nothing conflicts. But
`intakeMotion` swings the arm to `kIntake` *and* runs the arm's roller,
and Lesson 20 made `Arm` one `Mechanism` for both motors — the pivot and
the roller are the same physical thing, so both commands require the same
`Arm`. `Command.parallel` won't let two of its commands require the same
Mechanism; it has no way to decide which one actually owns the motor.
`Command.sequence` sidesteps the question by never running them at the
same time — the arm swings down, and only once `goToAngle` finishes does
`runRoller` start, which is a perfectly sensible way to intake anyway:
get into position, then spin.

`scoreMotion` reaches for `ArmConstants.kEjectSpeed` — a constant that's
been sitting in `Constants.java` since Lesson 20 with nothing calling it.
It's the roller running backward, and scoring is exactly the moment for
it.

---

## 7. Wiring: requests to buttons, motion to state

Two different kinds of binding, matching the two kinds of command.

**In `RobotTeleop.java`'s constructor, add the requests — bound to
buttons, guarded:**

```java
    // West face requests INTAKING, north face requests IDLE, right trigger
    // requests SCORING. Each request only flips Superstructure's state if
    // canGoTo allows it — the actual arm/elevator motion is bound below,
    // to the state itself, not to these buttons.
    robot.driverController.westFace().onTrue(robot.superstructure.requestIntake());
    robot.driverController.northFace().onTrue(robot.superstructure.requestIdle());
    robot.driverController.rightTrigger().onTrue(robot.superstructure.requestScore());
```

**Then the motion — bound to the state itself, unguarded:**

```java
    // Arriving in a state already answered the "is this allowed" question,
    // so these run unguarded — the moment m_state matches, the matching
    // motion command is scheduled, and it is canceled the moment it doesn't.
    robot.superstructure.inState(SuperstructureState.IDLE).whileTrue(robot.superstructure.idleMotion());
    robot.superstructure.inState(SuperstructureState.INTAKING).whileTrue(robot.superstructure.intakeMotion());
    robot.superstructure.inState(SuperstructureState.SCORING).whileTrue(robot.superstructure.scoreMotion());
```

`whileTrue` schedules its command the moment the `Trigger` turns true and
cancels it the moment the `Trigger` turns false. Press the intake button
from `IDLE`: `requestIntake()` flips `m_state` to `INTAKING`, and on the
very next scheduler pass `inState(INTAKING)` goes true and
`intakeMotion()` starts. Request `SCORING` next: `m_state` changes again,
`inState(INTAKING)` goes false, `intakeMotion()` is canceled — which
means `runRoller`'s `.whenCanceled(...)` fires and the roller actually
stops — and `inState(SCORING)` picks up `scoreMotion()` in the same tick.
You never touch a motor directly. You only ever say what state you want,
and the wiring in this section is what turns that into motion.

You still have `Elevator`, `Arm`, and now `Superstructure` all declared
as fields in `Robot.java`. `Superstructure` is a plain class, the same
shape as `Localizer` from Lesson 14 — it needs the scheduler, for
`periodic()`, but nothing ever requires *it*, so it never needed to be a
`Mechanism`. Needing the scheduler and being requirable turn out to be
two separate questions, and `Superstructure` is the clearest example yet
of a class that needs the first without the second.

**In `Robot.java`, declare it after `arm` and before `leds`:**

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

That last line is the whole reason Lesson 23 built `Leds` around a
`Supplier<SuperstructureState>` instead of reading `Elevator` directly —
`new Leds(superstructure::getState)` needed no changes to `Leds` itself
at all. `Leds` doesn't know a state machine exists underneath it; it just
asks for the current state and reads `.pattern()` off whatever it gets
back. Go check: `Leds.java` from last lesson is untouched.

---

## 8. Run it

`./gradlew simulateJava`. The strip boots red and blinking, same as
before — `UNHOMED` still carries `kUnhomed`, and nothing about that
changed.

1. **Press West without homing first.** Nothing happens — not to the arm,
   not to `m_state`. Check `Superstructure/Rejected` on the dashboard:
   `UNHOMED -> INTAKING`. The button worked exactly as designed; the
   answer was no.
2. **Enable and press Back.** The elevator homes. The instant
   `elevator.isHomed()` goes true, `periodic()` moves `m_state` to
   `IDLE` on its own — nobody pressed anything for that part — and the
   strip settles to a dim blue.
3. **Press West.** `Superstructure/State` reads `INTAKING`, the arm
   swings down to `kIntake`, and once it arrives the roller starts. The
   strip goes yellow.
4. **Press right trigger.** State becomes `SCORING`, the roller reverses,
   and the elevator drives to `kScoreHigh`. Try pressing West again from
   here — refused, logged, nothing moves. You have to come back through
   `IDLE` first.
5. **Press North.** Back to `IDLE`, everything stows.

Every one of those transitions is visible in exactly two dashboard keys:
`Superstructure/State` for what's happening, `Superstructure/Rejected`
for what almost happened and didn't.

---

## Try it

1. **Add `CLIMBING`.** A fifth state, reachable only from `IDLE`, and
   once there the only legal move is staying — nothing, not even `IDLE`,
   can be requested from it (an emergency override is a different
   problem than this lesson solves). Add the constant to
   `SuperstructureState`, and watch `canGoTo` stop compiling until you
   add a `case CLIMBING`. That failure is the point: you cannot add a
   state to this machine without being forced to say what it does.
2. **Make alliance color real.** `kIdle` is a fixed blue because a
   `static final` field is built before any driver station has connected.
   Find a way to make the strip alliance-aware anyway — you'll need to
   stop treating the pattern as something baked into the enum constant
   and compute it somewhere that runs after the alliance is known.
3. **Show a refusal on the strip, not just the dashboard.** Right now
   `Superstructure/Rejected` is the only sign a request failed, and it's
   easy to miss unless you're staring at the dashboard. Make `Leds`
   flash white, briefly, on a rejection — you'll need `Superstructure` to
   expose something `Leds` can watch that a plain state comparison can't
   give you.
4. **Take a side on the D-pad.** Section 1 showed you a real bug: the
   D-pad still drives `Elevator.goToHeight` directly, completely outside
   `canGoTo`. Now that `Superstructure` exists, is that still acceptable
   as a manual override, or should the D-pad route through a request
   too? Either answer is defensible — argue for one, and change the code
   to match.

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
