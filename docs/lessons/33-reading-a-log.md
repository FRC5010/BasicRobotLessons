# Lesson 33 — Reading a match log

**Goal:** Diagnose a failure that already happened, using nothing but the
log — find the moment it went wrong, read the traces together instead of one
at a time, and test a fix by replaying the exact match through corrected code.

**New Java concepts**
- None. This lesson is a technique, and it should be honest about that.

**New robot concepts**
- Reading logged traces *together* — the diagnosis usually lives in how two
  of them disagree, not in either one alone.
- **Replay as a debugging tool**, not a party trick: fix the code, replay the
  old inputs, and watch a decision the original run got wrong come out right.
- Logging **decisions**, not just the measurements behind them — the same
  numbers can pass or fail depending on a constant a plot won't show you.

---

## 1. What a log can and can't tell you

Every lesson since Lesson 3 has been building toward this one without saying
so. You've logged positions, setpoints, applied volts, current draw, alerts,
rejected state transitions — and mostly you've *looked* at them the moment
they happened, on your laptop, with the bug fresh in your head. That's not
how it works on a real field. A match lasts 150 seconds, you get one shot at
it, and whatever went wrong is gone by the time you're back at the pit —
except for the log. The log is the only witness that was there for the whole
thing and didn't blink.

This lesson is about reading that witness. There's no new syntax in it —
`Logger.recordOutput` and `Logger.processInputs` are the only two calls doing
any work, and you've known both since Lesson 3 and Lesson 13. What's new is
the *method*: how to go from "the robot did something wrong" to "here is
exactly why," using only what the log already recorded.

---

## 2. Build the failure you're about to hunt

A worked example needs a real failure to work from, so you're going to make
one — on purpose, in your own project, so the log you investigate is your
own and the numbers are whatever your machine actually produces.

Here's the story to tell yourself while you do it. Your team wants tighter
scoring precision for this year's game piece, so someone goes into
`Constants.java` to tighten `ElevatorConstants.kTolerance`. They mean to type
`Centimeters.of(0.2)` — two millimetres, still comfortably achievable. An
extra zero creeps in.

This is temporary — section 6 fixes it back.

**Edit `kTolerance` in `ElevatorConstants`:**

```java
public static final Distance kTolerance = Centimeters.of(0.002); // was Centimeters.of(2)
```

Rebuild. Nothing complains — `kTolerance` is still a perfectly legal
`Distance`, just a much smaller one. That's the first thing worth sitting
with: **the Units library stops you from adding a distance to a voltage. It
does nothing at all to stop you from meaning millimetres and writing
micrometres.** The type carries the unit; it was never going to carry the
magnitude, too.

Run `./gradlew simulateJava`, go **Teleoperated**, and press whatever button
sends the elevator to `kScoreMid` (D-pad right, if you followed the bindings
from Lesson 18 on). Watch it. The carriage rises, slows, settles at the
scoring height, and holds there — exactly like it always has. Nothing about
this looks broken. That's the second thing worth sitting with, and it's the
whole reason this bug survives a bench test: **`goToHeight` finishes when
`atGoal()` says so, and nothing in a teleop button binding is watching for
that.** A driver mashing buttons can't tell a command that finished from one
that's still quietly running forever underneath a perfectly still elevator.
It only matters to something that's waiting on it — which, on a real robot,
is an autonomous sequence chaining a next step onto this one with
`.andThen(...)`, the way you've built routines since Lesson 9. In auto,
nothing after this step ever runs. In teleop, you'd never know.

Drive around for ten or fifteen seconds — hit the scoring binding a couple of
times — then close the sim. You now have a `.wpilog` in your project's
`logs/` folder that looks, at a glance, like a robot working perfectly.

---

## 3. Finding the moment

Open the log in AdvantageScope. Expand `AdvantageKit → RealOutputs →
Elevator` and drop `GoalMeters` on a **Line Graph**. Scrub across the whole
session and find the step — the instant `GoalMeters` jumps from whatever it
was sitting at (probably `kStowed`, 0.02 m) to `0.75` (`kScoreMid`). That
jump is **the moment**: everything you need to explain happened after it,
and nothing before it matters.

This is the field-log version of a skill you already have from
Lesson 18 §9 — finding the tick where a goal changed so you're reading the
*response* to it, not just wandering the timeline hoping to notice
something. A 150-second match has a lot of timeline and very little of it is
interesting. Finding the moment first is what makes the rest of this fast.

---

## 4. Reading the traces together

Zoom the graph to a few seconds either side of that jump. Add
`Elevator/HeightMeters` to the same graph, right beside `GoalMeters`. Watch
them converge — the height climbs, slows, and settles in against the goal
inside about a second and a half, a clean Motion Magic profile arriving
exactly where you'd expect from Lesson 18.

Now add one more trace to the same graph: `Elevator/AtGoal`. This is where
reading one trace at a time would have sent you the wrong way. Looked at
alone, `HeightMeters` says the elevator arrived. Looked at alone, `AtGoal`
says it never did. **Neither trace is lying — they disagree, and the
disagreement is the entire diagnosis.** A height trace that never approaches
its goal would point at a control problem: a bad gain, a stuck motor,
something actually wrong with the mechanism. A height trace that arrives
cleanly while the decision built on top of it says otherwise points
somewhere completely different — not at the elevator, but at whatever is
*asking the question*.

That's the move this lesson is teaching: **put the measurement and the
decision built from it on the same graph, and read where they stop
agreeing.** One trace tells you something happened. Two traces, read
together, tell you which layer it happened in.

---

## 5. Forming a hypothesis

`AtGoal` comes from one line in `Elevator.java`:

*Nothing to add — this is code you already have:*

```java
public boolean atGoal() {
    return Math.abs(m_inputs.heightMeters - m_goal.in(Meters))
            < ElevatorConstants.kTolerance.in(Meters);
}
```

You don't need to open the source to get most of the way there, either — you
can do the arithmetic straight off the graph. Hover the plateaued
`HeightMeters` trace and read its settled value; hover `GoalMeters` for the
target. Subtract them. On a real run of this bug you'll get something on the
order of a **tenth of a millimetre** — the elevator is not missing by much,
it's missing by an amount too small to see on a graph zoomed out far enough
to show the whole climb.

That number is the hypothesis, stated without even reading `atGoal()`'s
source: *whatever the elevator is being asked to get within, it's smaller
than the elevator can actually achieve.* Reading the actual line confirms
it — `kTolerance` compared against a gap of a tenth of a millimetre is
comparing a real mechanism's precision against a number nobody's mechanism
hits. The fix isn't a gain, a motor, or a sensor. It's the one constant this
whole investigation has been circling.

---

## 6. Testing it with replay

Here's where Lesson 13 stops being background and starts being the tool.

**Fix `kTolerance` back to something a real mechanism can actually hit:**

```java
public static final Distance kTolerance = Centimeters.of(0.1); // 1 mm — comfortably above what it settles to
```

Now, instead of trusting that this fixes it, *prove* it against the exact
match you already have. Switch modes and replay it, the same four steps from
Lesson 13 §10:

1. In `Constants.java`, change `kSimMode` to `Mode.REPLAY`.
2. `./gradlew simulateJava` again. When the terminal asks for a log path,
   paste the path to the log you recorded in section 2.
3. It chews through the session in a couple of seconds and exits. A new file
   sits next to the original, ending in `_sim.wpilog`.
4. Open the `_sim` log. Find `AdvantageKit → ReplayOutputs → Elevator` this
   time, not `RealOutputs`, and drop `AtGoal` on the same graph as before.

**This is the payoff.** In `RealOutputs`, `AtGoal` sat false for the entire
recorded session — that's what actually happened, on the day, with the buggy
code. In `ReplayOutputs`, computed just now, for that exact same session,
through the fixed code — `AtGoal` flips true right around the same tick the
height trace settled. Nothing about the match changed. The joystick presses,
the timing, the physics that produced `HeightMeters` — all of that is
locked in, replayed verbatim. The only thing different between the two
outputs is which line of code decided what to do with the same evidence.
That's the whole idea Lesson 13 introduced with "recompute the whole match,
even after you've changed the code" — and here it's not a demonstration,
it's the proof that your fix actually works, checked against a session that
already happened instead of a fresh guess.

Switch `kSimMode` back to `Mode.SIM` before you move on — replay is for
investigating, not for driving.

---

## 7. What was missing from the log

Notice what you had to do to get the number in section 5: hover two separate
traces and subtract them by hand. The log recorded the two raw measurements
(`HeightMeters`, `GoalMeters`) and the decision built from them (`AtGoal`) —
but not the one number that actually explains the decision, which is the gap
itself. A boolean tells you *that* something failed. It doesn't tell you *by
how much*, or whether the gap is closing, holding steady, or getting worse —
and those are three very different bugs wearing the same `false`.

**Add to `Elevator.periodic()`, next to the other recordOutput calls:**

```java
Logger.recordOutput("Elevator/HeightErrorMeters", m_inputs.heightMeters - m_goal.in(Meters));
```

Signed, not absolute — the sign tells you which direction the miss is in,
for free. Next time something built on `atGoal()` misbehaves, this is one
trace instead of two traces and mental arithmetic. That's the standing rule
worth taking from this lesson: **when you catch yourself computing a number
by eye off two plots, that number belongs in the log, not in your head.**

---

## 8. A second example, faster

The exact same two moves — find the moment, read the traces together —
generalize to failures that don't look anything like a tuning constant. Here
is one, worked quickly.

Say a mentor re-drew part of an autonomous path in the path editor the week
before a competition, and while re-adding the `"intake"` event marker,
retyped it by hand as `"Intake"` — capital I. Nobody touched a line of Java.
The path file just says a slightly different string now:

*Nothing to add — this is the kind of edit that causes it, not something to type:*

```json
{
  "type": "event_trigger",
  "t_ratio": 0.2,
  "lib_key": "Intake"
}
```

Recall Lesson 17's callout: **a misspelled `lib_key` doesn't crash.** BLine
looks the key up while the path is running, finds nothing registered under
`"Intake"`, logs a warning, and keeps driving. The auto runs start to
finish, looking completely normal from the driver station.

Open that match's log and find the moment the same way you did in section 3
— this time by dropping `Localizer/Pose` on the **Odometry** tab. The robot
traces the whole path, correct shape, correct ending pose. The drivetrain
did exactly its job. Now read a second trace *together* with it: put
`Arm/GoalDegrees` and `Arm/HasGamePiece` on a Line Graph over that same
window. Both sit flat the entire run — the arm never got a command, because
the command that would have sent it was never triggered. That's the whole
diagnosis, found in two overlaid traces and no guessing about drivetrain
tuning: the path executed perfectly, and the *event* riding on top of it
never fired. The fix isn't a gain or a gearbox — it's one string in a JSON
file a Java-only code review would never open.

If your team was also capturing console output from that match, it would
have said `Unregistered event trigger key` in plain text the moment it
happened — Lesson 17 told you to watch for exactly that line. The point of
this lesson is that even without it, the two traces tell you the same
story. A log is worth reading whether or not you remembered to keep every
witness.

---

## Try it

1. **Break something you haven't been told about.** Pick a different
   constant or a different line somewhere in your project, change it to
   something plausible-looking that still compiles, and record a match
   without telling yourself (or a teammate) what you changed. Diagnose it
   cold using sections 3–5's method. Notice how much faster the second one
   goes than the first.
2. **Find a "what was missing" of your own.** Pick any command or subsystem
   you've built and ask: if this misbehaved on the field, what number would
   you end up computing by hand off two traces? Log that number now, before
   you need it.
3. **Run the replay yourself.** Don't just read section 6 — actually switch
   modes, replay your own recorded session, and watch `Elevator/AtGoal`
   disagree between `RealOutputs` and `ReplayOutputs`. Reading about it and
   watching it happen are not the same lesson.
4. **Try the toy sequence.** Bind a spare button to
   `Commands.sequence(m_elevator.goToHeight(ElevatorConstants.kScoreMid), Commands.print("scored"))`.
   By now `kTolerance` is already fixed, so pressing it should print
   `"scored"` within a couple of seconds. Temporarily re-break `kTolerance`
   the way section 2 did, press it again, and confirm `"scored"` never
   comes — the exact failure an autonomous routine would have hit, made
   visible in teleop on purpose. Fix it back before you move on.

---

## What you learned

Nothing here was new syntax — `recordOutput` and `processInputs` again, the
same two calls from Lessons 3 and 13 — which is itself the point: by this
lesson, the tools were never the hard part. The skill is the sequence: find
the moment a value changed, put the measurement and the decision built from
it on the *same* graph, and read where they stop agreeing — because a
measurement that arrived and a decision that says it didn't are never both
wrong for the same reason. Once you have a hypothesis, **replay proves it**:
fix the code, re-run the exact recorded session, and compare `RealOutputs`
against `ReplayOutputs` for the same match — not a fresh guess, a checked
fix. And the standing habit to keep is the one from section 7: the moment
you catch yourself subtracting two traces by hand to understand what
happened, that subtraction belongs in the log, so next time it's one glance
instead of a hypothesis.

None of this required the bug to be dramatic. A tenth of a millimetre and a
capital letter both cost a team an entire autonomous run, and both were
sitting in a log the whole time, waiting to be read.

Every gain this reading skill has ever pointed at came from a spec sheet, not
a real motor. Lesson 34 is where that finally changes.

Next: [Lesson 34 — Tuning your robot when build team hands it over](34-tuning-with-sysid.md).
