# Lesson 33 — Reading a match log

**Goal:** Diagnose a failure that already happened, using nothing but the
log — find the moment it went wrong, and read the traces together
instead of one at a time.

**New Java concepts**
- None. This lesson is a technique, and it should be honest about that.

**New robot concepts**
- Reading logged traces *together* — the diagnosis usually lives in how
  two of them disagree, not in either one alone.
- Logging **decisions**, not just the measurements behind them — the
  same numbers can pass or fail depending on a constant a plot won't
  show you.
- **What replay would buy you, and why this track can't hand it to you
  yet** — an honest look at a doorway that's still empty.

---

## 1. What a log can and can't tell you

Every lesson since Lesson 3 has been building toward this one without
saying so. You've logged positions, setpoints, applied volts, current
draw, alerts, rejected state transitions — and mostly you've *looked* at
them the moment they happened, on your laptop, with the bug fresh in
your head. That's not how it works on a real field. A match lasts 150
seconds, you get one shot at it, and whatever went wrong is gone by the
time you're back at the pit — except for the log. The log is the only
witness that was there for the whole thing and didn't blink.

This lesson is about reading that witness. There's no new syntax in it —
`SmartDashboard.putNumber` and `SmartDashboard.putBoolean` are the only
two calls doing any work, and you've known both since Lesson 3. What's
new is the *method*: how to go from "the robot did something wrong" to
"here is exactly why," using only what the log already recorded.

One honest note before you start, so it doesn't ambush you later:
Lesson 13 called `Mode.REPLAY` "open, and empty" — this track doesn't
have AdvantageKit's real replay engine yet, because AdvantageKit doesn't
support `OpModeRobot` on this alpha. Everything in sections 1 through 5
works exactly the same without it. Section 6 is honest about what that
gap costs you, and what to do about it in the meantime.

---

## 2. Log the decision before you need it

Before building the failure, there's a gap in this port worth closing
first, because the whole technique this lesson teaches depends on it: a
*decision*, not just the measurements behind it, has to be in the log.

`Elevator.atGoal()` has existed since Lesson 18. Nothing has ever
published its answer.

**Add to `Elevator.periodic()`, below the `AtBottomLimit` line:**

```java
    SmartDashboard.putBoolean("Elevator/AtGoal", atGoal());
```

Hold that thought — you'll want it, and the reason you needed it, in
about three sections.

---

## 3. Build the failure you're about to hunt

A worked example needs a real failure to work from, so you're going to
make one — on purpose, in your own project, so the log you investigate
is your own and the numbers are whatever your machine actually produces.

Here's the story to tell yourself while you do it. Your team wants
tighter scoring precision for this year's game piece, so someone goes
into `Constants.java` to tighten `ElevatorConstants.kTolerance`. They
mean to type `Centimeters.of(0.2)` — two millimetres, still comfortably
achievable. An extra zero creeps in.

This is temporary — section 6 fixes it back.

**Edit `kTolerance` in `ElevatorConstants`:**

```java
public static final Distance kTolerance = Centimeters.of(0.002); // was Centimeters.of(2)
```

Rebuild. Nothing complains — `kTolerance` is still a perfectly legal
`Distance`, just a much smaller one. That's the first thing worth
sitting with: **the Units library stops you from adding a distance to a
voltage. It does nothing at all to stop you from meaning millimetres and
writing micrometres.** The type carries the unit; it was never going to
carry the magnitude, too.

Run `./gradlew simulateJava`, go **Teleoperated**, and press D-pad right
(`kScoreMid`). Watch it. The carriage rises, slows, settles at the
scoring height, and holds there — exactly like it always has. Nothing
about this looks broken. That's the second thing worth sitting with, and
it's the whole reason this bug survives a bench test: **`goToHeight`
finishes when `atGoal()` says so, and nothing in a teleop button binding
is watching for that.** A driver mashing buttons can't tell a command
that finished from one that's still quietly running forever underneath a
perfectly still elevator. It only matters to something that's waiting on
it — which, on a real robot, is an autonomous sequence chaining a next
step onto this one with `Command.sequence(...)`, the way you've built
routines since Lesson 24. In auto, nothing after this step ever runs. In
teleop, you'd never know.

Drive around for ten or fifteen seconds — hit the scoring binding a
couple of times — then close the sim. You now have a `.wpilog` in your
project's `logs/` folder that looks, at a glance, like a robot working
perfectly.

---

## 4. Finding the moment

Open the log in AdvantageScope. Expand `NetworkTables → SmartDashboard →
Elevator` and drop `GoalMeters` on a **Line Graph**. Scrub across the
whole session and find the step — the instant `GoalMeters` jumps from
whatever it was sitting at (probably `kStowed`, 0.02 m) to `0.75`
(`kScoreMid`). That jump is **the moment**: everything you need to
explain happened after it, and nothing before it matters.

This is the field-log version of a skill you already have from Lesson 18
§10 — finding the tick where a goal changed so you're reading the
*response* to it, not just wandering the timeline hoping to notice
something. A 150-second match has a lot of timeline and very little of
it is interesting. Finding the moment first is what makes the rest of
this fast.

---

## 5. Reading the traces together

Zoom the graph to a few seconds either side of that jump. Add
`Elevator/HeightMeters` to the same graph, right beside `GoalMeters`.
Watch them converge — the height climbs, slows, and settles in against
the goal inside about a second and a half, a clean Motion Magic profile
arriving exactly where you'd expect from Lesson 18.

Now add one more trace to the same graph: `Elevator/AtGoal` — the one
you added in section 2. This is where reading one trace at a time would
have sent you the wrong way. Looked at alone, `HeightMeters` says the
elevator arrived. Looked at alone, `AtGoal` says it never did. **Neither
trace is lying — they disagree, and the disagreement is the entire
diagnosis.** A height trace that never approaches its goal would point
at a control problem: a bad gain, a stuck motor, something actually
wrong with the mechanism. A height trace that arrives cleanly while the
decision built on top of it says otherwise points somewhere completely
different — not at the elevator, but at whatever is *asking the
question*.

That's the move this lesson is teaching: **put the measurement and the
decision built from it on the same graph, and read where they stop
agreeing.** One trace tells you something happened. Two traces, read
together, tell you which layer it happened in.

---

## 6. Forming a hypothesis, and proving it without real replay

`AtGoal` comes from one line in `Elevator.java`:

*Nothing to add — this is code you already have:*

```java
public boolean atGoal() {
  return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < ElevatorConstants.kTolerance.in(Meters);
}
```

You don't need to open the source to get most of the way there, either
— you can do the arithmetic straight off the graph. Hover the plateaued
`HeightMeters` trace and read its settled value; hover `GoalMeters` for
the target. Subtract them. On a real run of this bug you'll get
something on the order of a **tenth of a millimetre** — the elevator is
not missing by much, it's missing by an amount too small to see on a
graph zoomed out far enough to show the whole climb. Measured directly
in this port's own sandbox, holding at `kScoreMid`: the settled error is
a stable **0.116 mm**, flat for as long as you let it sit — a real
floor, not something still converging.

That number is the hypothesis, stated without even reading `atGoal()`'s
source: *whatever the elevator is being asked to get within, it's
smaller than the elevator can actually achieve.* Reading the actual line
confirms it — `kTolerance` compared against a gap of a tenth of a
millimetre is comparing a real mechanism's precision against a number
nobody's mechanism hits. The fix isn't a gain, a motor, or a sensor.
It's the one constant this whole investigation has been circling.

**Fix `kTolerance` to something a real mechanism can actually hit:**

```java
public static final Distance kTolerance = Centimeters.of(0.1); // 1 mm — comfortably above what it settles to
```

Not the `0.2` the story's mentor meant to type — a value re-derived from
what you just measured, with margin: 1 mm is roughly 8.6 times the
0.116 mm floor, so it trips reliably without also being a number nobody
checked.

**Here's where the old form of this lesson would have you replay the
exact recorded match and watch the fixed code get it right — and this
port genuinely can't do that yet.** `Mode.REPLAY` builds and runs
without an error, the way Lesson 13 showed you, but every input stays
frozen at zero: there's no engine reading your `.wpilog` back through
the code, because that engine is part of AdvantageKit, and AdvantageKit
doesn't support `OpModeRobot` on this alpha. That's not a workaround
away — it's tracked as follow-up work for when it ships.

What you can do today, and what's honest to call it: **re-run the same
script, not the same match.** Go back to teleop, press D-pad right the
same way you did in section 3, and watch `Elevator/AtGoal` flip `true`
around a second and a half in — this time for real. That's weaker proof
than true replay would give you (different joystick noise, different
random jitter in exactly when you pressed the button, not the frame-for-
frame identical session), and it's worth being clear-eyed about that gap
rather than pretending a fresh run is the same evidence. But it's
real evidence, gathered against your actual fixed code, not a fresh
guess dressed up as a test — and it's what "recompute the whole match"
from Lesson 13 turns into on a platform that hasn't caught up to it yet.
When AdvantageKit's `OpModeRobot` support lands, this section is where
this track comes back and does it properly: same log, same fix, same
comparison the old course made.

Switch `kSimMode` back to `Mode.SIM` if you changed it exploring
Lesson 13's empty doorway again — replay is for investigating, not for
driving, even in its current unfinished state.

---

## 7. What was missing from the log

Notice what you had to do to get the number in section 6: hover two
separate traces and subtract them by hand. The log recorded the two raw
measurements (`HeightMeters`, `GoalMeters`) and the decision built from
them (`AtGoal`) — but not the one number that actually explains the
decision, which is the gap itself. A boolean tells you *that* something
failed. It doesn't tell you *by how much*, or whether the gap is
closing, holding steady, or getting worse — and those are three very
different bugs wearing the same `false`.

**Add to `Elevator.periodic()`, below the `GoalMeters` line:**

```java
    SmartDashboard.putNumber("Elevator/HeightErrorMeters", m_inputs.heightMeters - m_goal.in(Meters));
```

Signed, not absolute — the sign tells you which direction the miss is
in, for free. Next time something built on `atGoal()` misbehaves, this
is one trace instead of two traces and mental arithmetic. That's the
standing rule worth taking from this lesson: **when you catch yourself
computing a number by eye off two plots, that number belongs in the log,
not in your head.**

---

## 8. A second example, faster

The exact same two moves — find the moment, read the traces together —
generalize to failures that don't look anything like a tuning constant.
Here is one, worked quickly, and entirely narrated: nothing below needs
you to actually go break it.

Say a mentor updates `PathConstants.kAimTagId` for a new field
calibration — Lesson 28's aim-assist target — and fat-fingers it: the 2
key sticks, and `20` becomes `220`. Nobody touched a line of drivetrain
code, and the field only has 32 tags, so `220` is silently, harmlessly
invalid.

*Nothing to add — this is the kind of edit that causes it, not something to type:*

```java
public static final int kAimTagId = 220; // meant to type 20
```

Recall `Aim.tagPosition`'s own javadoc: *"Empty when that ID is not on
this field, which is what a typo looks like."* `Aim.omegaTowardTag`
reads that: *"Zero when the tag isn't on this field — a robot that can't
find its target should sit still rather than pick a direction."* No
exception, no console warning either — unlike BLine's `lib_key` lookup
in the old course, `Aim` doesn't log anything when it comes up empty.
The `RobotAutoAimWhileDriving` opmode from Lesson 28 runs
`driveWhileAiming` — drive forward at 30% speed for three seconds while
the omega term tries to hold the nose on the tag. With the typo, that
omega term is always `0.0`. The robot just drives straight for three
seconds. From the driver station, that's what an ordinary autonomous run
looks like.

Open that match's log and find the moment the same way you did in
section 4 — this time by dropping `Localizer/Pose` on the **Odometry**
tab. The robot drives the expected line, correct heading, correct
distance. The drivetrain did exactly its job. Now read a second trace
*together* with it: look for `Aim/ErrorDegrees` over that same window.
It isn't there. Not zero, not flat — **absent**, because
`Aim.omegaToward` is the only place that key gets published, and with an
invalid tag ID it's never called at all. That's the whole diagnosis,
found in one trace that never showed up when you went looking for it:
the path executed perfectly, and the aim assist riding on top of it
never ran a single tick. The fix isn't a gain or a gearbox — it's one
`int` a Java review would absolutely have caught, if anyone had thought
to look at it that day.

The lack of a console warning here is worth sitting with, not glossing
past. The old course's equivalent bug at least printed something. This
one doesn't — which makes the log genuinely the *only* witness, not just
the more convenient one. A trace that's silently absent is easy to miss
if you don't know to go looking for it, which is exactly why "find the
moment, then check what's supposed to be happening around it" is a
method and not a lucky guess.

---

## Try it

1. **Break something you haven't been told about.** Pick a different
   constant or a different line somewhere in your project, change it to
   something plausible-looking that still compiles, and record a match
   without telling yourself (or a teammate) what you changed. Diagnose
   it cold using sections 4–6's method. Notice how much faster the
   second one goes than the first.
2. **Find a "what was missing" of your own.** Pick any command or
   subsystem you've built and ask: if this misbehaved on the field, what
   number would you end up computing by hand off two traces? Log that
   number now, before you need it.
3. **Prove the fix the honest way this track currently allows.** Write
   down the exact sequence you used in section 3 — which button, how
   long you waited, how many times you pressed it — and re-run it fresh
   with the fix in place. Then go reread Lesson 13's "empty doorway" Try
   It and think concretely about what changes here once `Mode.REPLAY`
   has a real engine behind it: which parts of this lesson would you
   redo, and which would stay exactly as written?
4. **Try the toy sequence.** Bind a spare button to
   `Command.sequence(robot.elevator.goToHeight(ElevatorConstants.kScoreMid),
   Command.noRequirements(coroutine -> System.out.println("scored")).named("Print Scored")).named("Score And Print")`.
   By now `kTolerance` is already fixed, so pressing it should print
   `"scored"` within a couple of seconds. Temporarily re-break
   `kTolerance` the way section 3 did, press it again, and confirm
   `"scored"` never comes — the exact failure an autonomous routine
   would have hit, made visible in teleop on purpose. Fix it back before
   you move on.

---

## What you learned

Nothing here was new syntax — `SmartDashboard.putNumber` and
`SmartDashboard.putBoolean` again, calls you've had since Lesson 3 —
which is itself the point: by this lesson, the tools were never the hard
part. The skill is the sequence: find the moment a value changed, put
the measurement and the decision built from it on the *same* graph, and
read where they stop agreeing — because a measurement that arrived and a
decision that says it didn't are never both wrong for the same reason.

And the standing habit to keep is the one from section 7: the moment you
catch yourself subtracting two traces by hand to understand what
happened, that subtraction belongs in the log, so next time it's one
glance instead of a hypothesis.

**One thing here was genuinely different from the course this was ported
from, and it's worth naming rather than smoothing over.** Real replay —
fix the code, recompute the exact match, compare the before and after —
is a better proof than anything section 6 could offer this port today.
This track's `Mode.REPLAY` doorway is still open and empty, because the
logging library it needs doesn't support this framework yet. That's not
a reason to skip the technique; the technique never depended on replay
in the first place, only its *strongest form* of proof did. Knowing the
difference between "I re-ran a similar scenario" and "I recomputed the
exact match" is itself worth carrying forward — it's the same honesty
this lesson has been asking of every trace you read.

None of this required the bug to be dramatic. A tenth of a millimetre
and a fat-fingered tag ID both cost a team an entire autonomous run, and
both were sitting in a log the whole time, waiting to be read.

Every gain this reading skill has ever pointed at came from a spec
sheet, not a real motor. The next lesson is where that finally changes.

Next: [Lesson 34 — Tuning your robot when build team hands it over](34-tuning-with-sysid.md)
