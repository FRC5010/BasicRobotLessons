# Aside — Commands V3: what changes when a command becomes a normal method

**Goal:** Understand the command framework WPILib is designing to replace the one
this course teaches — what problem it actually solves, what your own code would
look like written against it, and what stays exactly the same.

**New concepts**
- **Coroutines** — code that can pause in the middle and be resumed later,
  which is what lets a command be written as one straight-line method.
- **`Coroutine.yield()` and `Coroutine.await(...)`** — giving control back to
  the scheduler, and waiting on another command, from inside a method body.
- **Command scopes** — trigger bindings that clean themselves up when the
  command that made them ends.

**When you can use this**
- Read it any time after Lesson 9, once command composition has stopped feeling
  like syntax and started feeling like a tool.
- **Nothing in here is code you can run.** Read on.

---

## 1. Read this part before anything else

Everything else in this course is verified. Every snippet was compiled, and
most of the numbers were measured. This page is the exception, deliberately,
and you should know exactly how far the exception goes.

**As of August 2026, Commands V3 is a design document, not a library.** The
`wpilibsuite/allwpilib` repository has a
[`design-docs/commands-v3.md`](https://github.com/wpilibsuite/allwpilib/blob/main/design-docs/commands-v3.md)
laying out the whole framework, and that document is the source for this page.
What it does not have — checked, not assumed — is an implementation you can
import. The 2026 vendordep you installed back in Lesson 1 contains exactly
three packages, `command`, `command.button`, and `command.sysid`, and none of
what follows is in any of them.

The design document is also still visibly in motion. It's written throughout
in "the v3 framework *will*" rather than "does," and in two places it calls the
same object `Scheduler.getInstance()` and in a third `Scheduler.getDefault()` —
which is not a criticism, it's just what an unfinished design looks like from
the outside.

So: **every code block on this page is an illustration**, and every one of them
is marked as such in italics rather than the bold "type this" you've seen for
thirty-four lessons. Read them the way you'd read a diagram. If you type one
into your project it will not compile, and that isn't a mistake in the page.

What this page *is* for: the ideas are settled enough to be worth understanding
now, several of them explain frustrations you have already personally hit in
this course, and when V3 does land you'll want to have thought about it before
your team is mid-season and deciding whether to migrate.

There's also a hard floor on when any of this can arrive. Coroutines here are
built on `Continuation`, a JDK-internal class that first exists in **Java 21**.
WPILib 2026 does not ship Java 21. That alone puts V3 in 2027 at the earliest,
independent of how fast the design settles.

---

## 2. The problem it's actually solving

Go back to Lesson 0 for a second. You were told, firmly:

> You never write `while (true)` yourself — the scheduler is the loop, and you
> plug things into it.

That rule is real, and in V2 it is not negotiable. A command's `execute()` runs
once per tick and must return; a `while` loop inside it that waits for anything
freezes the entire robot, because the scheduler never gets control back to run
anything else. Every student who writes one learns this the hard way, and the
whole init/execute/isFinished/end shape exists to make writing one unnecessary.

But look at what that costs. Here is `Elevator.home()` from Lesson 21, which you
have actually written:

*Nothing to add — this is code you already have:*

```java
public Command home() {
    return run(() -> m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts)))
            .until(this::atBottomLimit)
            .finallyDo(() -> {
                m_io.setVoltage(0);
                acceptBottomLimit();
                m_goal = ElevatorConstants.kBottomLimitHeight;
                m_homed = true;
            });
}
```

Now say out loud what homing actually does: *drive down gently, keep going until
the switch trips, then stop and believe the switch.* Three steps, in order.

The code says the same thing, but not in that order and not in that shape. The
driving is inside a lambda, the stopping condition is a decorator hanging off
it, and the "then" — the part that's the entire point of homing — is in a
*third* lambda attached below, which runs at the end. You learned to read this,
and by Lesson 21 it probably didn't even look strange. It's still a procedure
turned inside out to fit a framework that can't pause.

**Commands V3's whole thesis is that the framework should be able to pause.**
Java 21's continuations can freeze a running method — its stack, its local
variables, where it was — set it aside, and resume it later exactly where it
stopped. If the scheduler can do that to a command, the command can be an
ordinary method with an ordinary loop in it. The design doc puts the idea in
five lines:

*Nothing to add — this is the design doc's own sketch of the idea:*

```java
void commandBody(Coroutine coroutine) {
  initialize();
  while (!isFinished()) {
    execute();
    coroutine.yield();
  }
  end();
}
```

Every piece of the V2 shape is still there — it's just back inside one function,
in the order it happens, with `coroutine.yield()` marking the moment control
goes back to the scheduler. That `yield()` is what makes the loop legal: the
command isn't hogging the robot, it's explicitly handing control back once per
tick and being handed it again next tick.

---

## 3. Your own homing command, rewritten

Here's `home()` again, in the V3 shape, using only constructs the design doc
actually shows:

*Nothing to add — this is what your Lesson 21 code would become, not code to type:*

```java
public Command home() {
  return run(coroutine -> {
    m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts));

    while (!atBottomLimit()) {
      coroutine.yield();
    }

    m_io.setVoltage(0);
    acceptBottomLimit();
    m_goal = ElevatorConstants.kBottomLimitHeight;
    m_homed = true;
  }).named("Home");
}
```

Read it against the sentence: drive down, keep going until the switch trips,
stop and believe the switch. It's the same three steps, in the same order, at
the same indentation level. Nothing is a decorator; nothing runs "later."

Two things in there are worth naming.

**`.named("Home")` isn't optional.** V3's builders won't hand you a `Command`
until you've given it a name — leaving it off is a compile error, not a
telemetry gap you notice in week six. If you've ever looked at a log and seen
`SequentialCommandGroup` where you wanted to see what actually ran, you already
know why they made that a requirement.

**The cleanup moved, and this one is a real trap.** In the V2 version,
`finallyDo` ran whether the command finished *or was interrupted* — that
guarantee is why the motor was certain to stop. In the straight-line V3 version
above, everything after the `while` loop runs only on the *normal* path. If
something cancels this command mid-descent, the body is never resumed and the
motor is never told to stop. V3's answer is a separate builder step,
`whenCancelled(Runnable)`, which exists precisely because the body can't be
counted on to reach its own end. Straight-line code is easier to read; it does
not make the interrupted path go away, and forgetting that would leave an
elevator driving into its own hard stop.

---

## 4. The one that would have saved you real trouble

Section 3 is a readability win. This one is a correctness win, and you hit the
underlying problem for real in Lesson 24.

Here's `Superstructure.handoff()`:

*Nothing to add — this is code you already have:*

```java
public Command handoff() {
    return Commands.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kScoreMid));
}
```

A parallel group requires everything its children require, for as long as the
group runs. So from the moment this starts until *both* halves finish, this
command owns the arm and the elevator. If the arm gets there first, the group
keeps owning the arm — doing nothing with it — until the elevator catches up.
The arm's default command can't run. Nothing else can claim it. The design doc
has a name for that: the mechanism is in an **uncommanded state**, held by a
command that isn't commanding it.

V2's workaround was proxy commands, and the doc is blunt about how badly that
scaled: proxying one command meant proxying *every* command that touched the
same subsystem, or the group would keep its grip and interrupt the proxy anyway.

Lesson 24 hit the same ownership rule from the other side. `requestIntake` had
to be written as a **sequence** — swing the arm down, *then* spin the roller —
not because the motion demands it, but because `Commands.parallel` throws
outright when two of its children require the same subsystem. The arm can't be
in a parallel group with itself.

In V3, a command that isn't a built-in group only owns an inner command's
mechanism *while that inner command is actually running*:

*Nothing to add — this is the design doc's own example, adapted:*

```java
public Command outerCommand() {
  return run(coroutine -> {
    coroutine.await(innerMechanism.innerCommand());
    coroutine.await(otherMechanism.otherCommand());
  }).named("Outer");
}
```

`coroutine.await(...)` schedules a command and waits for it, and the parent
holds that child's mechanism only for the duration of the await. Between the two
lines, `innerMechanism` is genuinely free again.

Be careful about how far that goes, because the doc is careful about it: the
**built-in** `ParallelGroup` and `Sequence` compositions still take full
ownership of everything their children need, on purpose, so migrating existing
group code doesn't silently change its behavior. The escape hatch is opt-in —
you get the narrower ownership by writing the command body yourself, not for
free by upgrading.

---

## 5. Triggers that clean up after themselves

One more, and this one is the reason a line in your Lesson 25 code looks the way
it does.

Lesson 25 registered path event markers like this:

*Nothing to add — this is code you already have:*

```java
FollowPath.registerEventTrigger("aim",
    Commands.runOnce(() -> FollowPath.overrideRotation(() -> aimOmega(localizer))));
FollowPath.registerEventTrigger("release",
    Commands.runOnce(FollowPath::clearRotationOverride));
```

And then every path recipe in that lesson had to end with this:

*Nothing to add — this is code you already have:*

```java
.finallyDo(FollowPath::clearRotationOverride);
```

You know why: the rotation override is `static`, the `release` marker is what's
supposed to clear it, and **a cancelled auto never reaches its last marker.**
The `finallyDo` is a guarantee bolted on because the plan alone wasn't
trustworthy. Lesson 25 said so directly — the marker is the plan, `finallyDo` is
the guarantee.

That's a lifetime problem. Something was made to exist for the duration of one
auto, and nothing in the framework tied it to that duration, so you tied it by
hand.

V3 tracks scopes. A trigger binding created inside a running command belongs to
that command, and when the command ends — finished, cancelled, whatever — the
binding is removed and anything it started is cancelled:

*Nothing to add — this is the design doc's own example:*

```java
Command autonomous() {
  return Command.noRequirements(coroutine -> {
    // This binding only exists while the autonomous command is running
    atScoringPosition.onTrue(score());

    coroutine.await(driveToScoringPosition());
  }).named("Autonomous");
}
```

The same rule covers default commands: change a mechanism's default inside a
scope and it reverts when the scope exits, without you remembering to revert it.

Two honest caveats. First, this wouldn't retroactively fix BLine — BLine is a
third-party library holding its own statics, and V3 doesn't reach inside it. What
V3 changes is that a library like BLine *could be written* without needing a
global registry in the first place. Second, `finallyDo`-style handbacks don't
become pointless; they become the thing you reach for when something genuinely
does outlive the command, rather than the thing you reach for because the
framework had no concept of "while this is running."

---

## 6. What doesn't change

It's easy to read a "version 3" and assume the ground moves. Most of it doesn't,
and for this course specifically, almost none of it does.

**Subsystems still own hardware and hand out commands.** The whole shape from
Lesson 1 — private motor, public command factory, scheduler arbitrating who gets
the mechanism — is exactly what V3 is built around. It's still one command per
mechanism at a time.

**Requirements still mean what they meant.** Scheduling something that needs a
busy mechanism still interrupts whatever has it, subject to the new priority
levels. The mutual-exclusion guarantee you've relied on since Lesson 1 is the
guarantee V3 is preserving.

**Triggers still bind conditions to commands.** `controller.a().onTrue(...)`
appears in the design doc unchanged.

**And everything underneath commands is untouched.** The IO layers from
Lesson 13, AdvantageKit logging and replay, the `kG`/`kV`/`kA` models, kinematics,
odometry, the pose estimator, vision, current limits, alerts, SysId — none of
that is command-framework code. A V3 migration would rewrite the bodies of your
command factories and leave the rest of the robot alone. That's worth knowing
before someone tells you the next WPILib release invalidates what you learned.

What genuinely does change: command *bodies* get rewritten, `Commands.sequence`
and friends give way to `await`/`fork` where you want the narrower ownership,
every command needs a name, and `finallyDo` splits into "the end of the method"
and "`whenCancelled`."

---

## Try it

There's nothing to run here, so these are all reading and writing exercises.

1. **Rewrite one of your own commands on paper.** Pick
   `Arm.runRoller(...)` from Lesson 20 — it uses `finallyDo` rather than
   `.until(...)`, which makes it an interesting case. Sketch the V3 version, and
   pay attention to which of its two jobs belongs after the loop and which
   belongs in `whenCancelled`.
2. **Find the uncommanded state in your own code.** Section 4 used
   `handoff()`. Go find a second one — any parallel group where one branch
   predictably finishes well before the other. Then decide honestly whether it
   has ever actually caused you a problem. "This is theoretically wrong but has
   never bitten us" is a legitimate answer, and knowing which of your problems
   are real is most of what migration planning is.
3. **Read the primary source.** The
   [design doc](https://github.com/wpilibsuite/allwpilib/blob/main/design-docs/commands-v3.md)
   is about 500 lines and genuinely readable. Two sections this page skipped
   entirely are worth your time: **Priority Levels** (LEDs are the motivating
   example, which should ring a bell after Lesson 23's priority chain) and
   **Suspend/Resume**, which has no V2 equivalent at all.
4. **Check whether this page has gone stale.** It was written in August 2026
   against a design document with no implementation. Go look at the current
   state of `allwpilib` and find out what's changed. If a real
   `Coroutine` class exists by the time you read this, trust it over this page —
   and if you're feeling generous, fix this page.

---

## What you learned

The framework you spent thirty-four lessons learning has a successor being
designed, and its central idea is a single sentence: **if the scheduler can
pause a running method, a command can just be a method.** Continuations make
that possible in Java 21, which is also the reason none of it can ship before
2027.

The parts worth carrying away aren't the syntax — that will move before it
lands. They're the three problems V3 names, all of which you met for real in
this course without necessarily noticing they were the same *kind* of problem:
a procedure turned inside out into init/execute/end because the framework
couldn't wait (`home()`), a mechanism held by a command that isn't using it
(`handoff()`, and the parallel-group rule that forced `requestIntake` into a
sequence), and something whose lifetime nothing tracked so you tracked it by
hand (Lesson 25's `finallyDo` handback). Those are worth recognizing on sight
regardless of which framework you're writing in.

And the reassuring half: subsystems, requirements, triggers, and every layer
below commands survive intact. Your IO layers, your logs, your models, and your
tuning are not command-framework code, and they don't care which version wins.

Read the design doc when you have an hour. Then get back to the robot you can
actually build this season.
