# Lesson 32 — Reading a match log

**Goal:** Diagnose a failure that already happened, using nothing but the
log — find the moment it went wrong, read the traces together instead of
one at a time, and test a fix by replaying the exact match through
corrected code.

**New Java concepts**
- None. This lesson is a technique, and it should be honest about that.

**New robot concepts**
- Reading logged traces *together* — the diagnosis usually lives in how
  two of them disagree, not in either one alone.
- **Replay as a debugging tool**, not a party trick: fix the code, replay
  the old inputs, and watch a decision the original run got wrong come
  out right.
- Logging **decisions**, not just the measurements behind them — the
  same numbers can pass or fail depending on a constant a plot won't
  show you.

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
`Logger.recordOutput` and `Logger.processInputs` are the only two calls
doing any work, and you've known both since Lesson 13. What's new is the
*method*: how to go from "the robot did something wrong" to "here is
exactly why," using only what the log already recorded.

---

## 2. Log the decision before you need it

Before building the failure, there's a gap in this port worth closing
first, because the whole technique this lesson teaches depends on it: a
*decision*, not just the measurements behind it, has to be in the log.

`Elevator.atGoal()` has existed since Lesson 18. Nothing has ever
recorded its answer.

**Add to `Elevator.periodic()`, below the `GoalMeters` line:**

```java
    Logger.recordOutput("Elevator/AtGoal", atGoal());
```

It's a decision your code makes, so it's an output — which, in section 6,
is exactly what lets a replay make it again.

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
achievable. A key sticks, and four extra zeros creep in.

This is temporary — section 6 fixes it back.

**Edit `kTolerance` in `ElevatorConstants`:**

```java
public static final Distance kTolerance = Centimeters.of(0.00002); // was Centimeters.of(2)
```

Rebuild. Nothing complains — `kTolerance` is still a perfectly legal
`Distance`, just a much smaller one. That's the first thing worth
sitting with: **the Units library stops you from adding a distance to a
voltage. It does nothing at all to stop you from meaning millimetres and
writing micrometres.** The type carries the unit; it was never going to
carry the magnitude, too.

Run the robot in simulation, go **Teleoperated**, press Back to home the
elevator (Lesson 21), and then press D-pad right (`kScoreMid`). Watch it. The carriage rises, slows, settles at the
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

> **Why four zeros and not two.** A tolerance that's *slightly* too tight
> doesn't fail every time, and that's worse. Measured with `Centimeters.of(0.002)`
> (0.02 mm): the carriage overshoots the goal by about 1.3 mm on the way in,
> then creeps back down across it. One 20 ms tick landed within 0.001 mm of
> the goal, so `atGoal()` read `true` for that single tick and the command
> ended at 1.46 s. Ten times tighter again, 2 micrometres, the same tick
> still passed. A too-tight tolerance can pass by luck of where the ticks
> fall. At 0.2 micrometres the luck runs out: the command was still running
> after fifteen seconds.

Drive around for ten or fifteen seconds — hit the scoring binding a
couple of times — then close the sim. You now have an `akit_….wpilog` in
your project's `logs/` folder that looks, at a glance, like a robot
working perfectly.

---

## 4. Finding the moment

Open that `akit_….wpilog` in AdvantageScope. Expand `RealOutputs →
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
`Elevator/HeightMeters` to the same graph, right beside `GoalMeters` —
it's a reading, so it's with the inputs at the top level, not under
`RealOutputs`.
Watch them converge — the height climbs, slows, and settles in against
the goal inside about a second and a half, a clean Motion Magic profile
arriving exactly where you'd expect from Lesson 18.

Now add one more trace to the same graph: `RealOutputs/Elevator/AtGoal` —
the one you added in section 2. This is where reading one trace at a time would
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

## 6. Forming a hypothesis, and proving it with replay

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
graph zoomed out far enough to show the whole climb. Measured in this
course's simulator, holding at `kScoreMid`: the carriage settles a stable
**0.116 mm** short of the goal, flat for as long as you let it sit — a
real floor, not something still converging.

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

Now, instead of trusting that this fixes it, *prove* it against the exact
match you already have. This is what Lesson 13 built replay for.

**Replay the recording through the fixed code.** Set `kSimMode` in
`Constants.java` to `Mode.REPLAY`, then name your recording and run:

```powershell
$env:AKIT_LOG_PATH = "logs\akit_26-10-29_01-12-37.wpilog"   # your file's name
./gradlew run
```

It works through the session in a few seconds and exits, leaving a new
file next to the recording, ending in `_sim.wpilog`.

**Then put both switches back:**

```powershell
Remove-Item Env:AKIT_LOG_PATH
```

and set `kSimMode` back to `Mode.SIM` — replay is for investigating, not
for driving.

Open the `_sim` file and put `RealOutputs/Elevator/AtGoal` and
`ReplayOutputs/Elevator/AtGoal` on the same graph as `GoalMeters`.

**This is the payoff.** In `RealOutputs`, `AtGoal` sat false for the
entire recorded session — that's what actually happened, on the day, with
the buggy code. In `ReplayOutputs`, computed just now for that exact same
session through the fixed code, it flips true 1.2 s after `GoalMeters`
steps to 0.75, as the climbing carriage comes within a millimetre of the
goal. It drops back for a tick or two while the carriage overshoots by
about 1.3 mm, and it's true for good from 1.26 s (measured, on a
recording made the way section 3 describes). Nothing about the match
changed. The button presses, the timing, the heights the carriage reached:
all of that is the recording, replayed verbatim. The only difference
between the two outputs is which line of code decided what to do with the
same evidence. That's the idea Lesson 13 introduced — "a replay is your
code, today's version, fed the readings of a run that already happened" —
and here it's not a demonstration. It's the proof that your fix works,
checked against a session that already happened instead of a fresh guess.

> **Trying more than one fix?** `./gradlew replayWatch` (Lesson 13)
> replays the log AdvantageScope has open every time you save a change,
> so you can try one tolerance after another against the same match.

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
    Logger.recordOutput("Elevator/HeightErrorMeters", m_inputs.heightMeters - m_goal.in(Meters));
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
calibration — Lesson 27's aim-assist target — and fat-fingers it: the 2
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
exception, no console warning either — unlike BLine's `lib_key` lookup,
`Aim` doesn't log anything when it comes up empty. The **Aim While
Driving** auto from Lesson 25 hands the spin to `Aim.omegaTowardTag` at
its `aim` marker. With the typo, that spin rate is always `0.0`. The
robot drives the path with its nose pointing wherever it was. From the
driver station, that looks like an ordinary autonomous run.

This one needs the other file each run leaves in `logs/`. B-Line's
`FollowPath/` values aren't in AdvantageKit's log — Lesson 17 left them on
**Telemetry** — so open the `WPILIB_….wpilog` from the same run instead.
It saves everything that went out over NetworkTables: B-Line's values
under `Telemetry/FollowPath`, and AdvantageKit's outputs under
`AdvantageKit/RealOutputs`, so `Localizer/Pose` and the `Aim/` keys are in
it too.

Find the moment the same way you did in section 4 — this time the moment
is `FollowPath/rotationOverrideActive` going `true`, about 0.6 s into the
drive. Put it on the same graph as `Localizer/Pose`'s heading. Measured in
the simulator, the two runs look like this:

| | override active | heading while it is |
|---|---|---|
| `kAimTagId = 20` | `true`, about 3.7 s | follows the bearing to the tag, round to about −124° by `release` |
| `kAimTagId = 220` | `true`, about 3.7 s | stays at **0.0°** the whole time |

Read them *together*, as in section 5: the override says the aiming code
has the wheel, and the heading says nobody is turning it. Neither trace
is wrong. Now look for the third trace, `Aim/ErrorDegrees`, over that same
window. It isn't there. Not zero, not flat — **absent**: in the fixed
run the log has `Aim/ErrorDegrees`, `Aim/FeedforwardRadPerSec` and
`Aim/IsAimed`, and in the typo run it has none of the three, in either
file, because `Aim.omegaToward` is the only place those keys get
recorded, and with an invalid tag ID it's never called at all. That's the whole diagnosis,
found in a trace that never showed up when you went looking for it: the
path executed perfectly, and the aim assist riding on top of it never ran
a single tick. The fix isn't a gain or a gearbox — it's one `int` a Java
review would absolutely have caught, if anyone had thought to look at it
that day.

The lack of a console warning here is worth sitting with, not glossing
past. It makes the log genuinely the *only* witness, not just the more
convenient one. A trace that's silently absent is easy to miss if you
don't know to go looking for it, which is exactly why "find the moment,
then check what's supposed to be happening around it" is a method and
not a lucky guess.

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
3. **Run the replay yourself.** Don't just read section 6 — actually
   switch modes, replay your own recorded session, and watch
   `Elevator/AtGoal` disagree between `RealOutputs` and `ReplayOutputs`.
   Then put the typo back and replay the same recording once more: this
   time the two agree, false the whole way, because the replay reproduces
   the bug as faithfully as it proved the fix. Reading about it and doing
   it are different things.
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

Nothing here was new syntax — `recordOutput` and `processInputs` again,
the same two calls from Lesson 13 — which is itself the point: by this
lesson, the tools were never the hard part. The skill is the sequence:
find the moment a value changed, put the measurement and the decision
built from it on the *same* graph, and read where they stop agreeing —
because a measurement that arrived and a decision that says it didn't are
never both wrong for the same reason. Once you have a hypothesis, **replay
proves it**: fix the code, re-run the exact recorded session, and compare
`RealOutputs` against `ReplayOutputs` for the same match — not a fresh
guess, a checked fix.

And the standing habit to keep is the one from section 7: the moment you
catch yourself subtracting two traces by hand to understand what
happened, that subtraction belongs in the log, so next time it's one
glance instead of a hypothesis.

None of this required the bug to be dramatic. A tenth of a millimetre
and a fat-fingered tag ID both cost a team an entire autonomous run, and
both were sitting in a log the whole time, waiting to be read.

Every gain this reading skill has ever pointed at came from a spec
sheet, not a real motor. The next lesson is where that finally changes.

Next: [Lesson 33 — Tuning your robot when build team hands it over](33-tuning-with-sysid.md)
