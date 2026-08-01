# Lesson plan: 23–34

A working plan for the stretch after [lesson-plan-16-22.md](lesson-plan-16-22.md).
**This is a contributor document, not lesson content** — it lives beside
`docs/lessons/`, never inside it, and nothing here should be pasted into a lesson
as-is.

Same working method as 16–22: one lesson at a time, reviewed between each,
compile-verified with `tools/verify-lessons.sh` before it lands. Every lesson
below is an **outline** — nothing here is written yet.

This plan inherits 16–22's conventions without restating them. Read that document
first; in particular the corollary under its decision 2 (**every profiled
mechanism gets the full `kG`/`kV`/`kA` feedforward set with `kP` as the trim**),
its rule that sensors are `@AutoLog` inputs, its rule that a **simulated sensor
must be able to disagree with the code**, and its Try-It safety convention.

---

## Status

| # | Working title | Builds on | 3rd-party library | Status |
|---|---|---|---|---|
| 23 | LEDs: showing what the robot is thinking | L22 (state to show) | none | **Done** — [lesson](lessons/23-leds.md), [code](../code/lesson-23/) |
| 24 | A superstructure: state you can name | L23, L22, L9 | none | Outline |
| 25 | BLine events: doing things while driving | L17, L24 | `BLine-Lib` | Outline |
| 26 | Two-step drive to pose | L17, L14 | `BLine-Lib` | Outline |
| 27 | Object detection: find the piece and go get it | L15, L26, L20/22 | `photonlib`, `maple-sim` | Outline |
| 28 | Aiming at an AprilTag | L15, L25 | `photonlib` | Outline |
| 29 | A flywheel: velocity control, and why it's different | L13 spine, L18 model | none | Outline |
| 30 | Current limits and brownouts | L21 (current sensing) | none | Outline |
| 31 | Alerts: knowing something is wrong before the match | L13, L15 | none | Outline |
| 32 | Testing your own robot code | all mechanisms | none | Outline |
| 33 | Reading a match log | L3, L13 | none | Outline |
| 34 | Tuning your robot when build team hands it over | L18, L20, L29 | none | Outline |
| — | `aside-commands-v3.md` | not in the linear build | none | Outline |

The arc runs in four groups: **23–24** make the robot's state visible and then
explicit; **25–28** make autonomous react to what it sees, in game-cycle order
(act while driving → arrive precisely → find the piece → aim at the target);
**29** adds the mechanism that makes aiming worth doing; **30–34** are the
transition from "works in sim" to "survives a match."

---

## Open decisions

### 1. Commands V3 — RESOLVED (aside, not a lesson)

**Commands V3 cannot be taught on this course's target.** It relies on Java 21
continuations, which the roboRIO does not have until 2027, and there is no V3
artifact in the 2026 vendordep at all — WPILib's maven carries only
`wpilibNewCommands` and `wpilibOldCommands`, and `wpilibNewCommands-java-2026.2.1`
contains nothing but `edu.wpi.first.wpilibj2.command`. The README pins the whole
course to **WPILib 2026**.

So V3 becomes **`aside-commands-v3.md`**: "here's what changes when you move to
2027." Asides are already the established home for out-of-sequence material — no
`Next:` link, listed in the README's Asides section, may reference numbered
lessons freely. This keeps the linear build compile-verifiable today.

When 2027 lands and the course migrates, revisit: the aside may become a lesson,
and if it does, everything from Lesson 1 on needs a migration pass. That is a
separate project, not a lesson.

### 2. Does the course grow a shooter? — recommend yes

Lesson 29 adds a fifth subsystem to an already-large robot. The alternative is
folding velocity control into an existing mechanism (the L20 roller is the
obvious candidate — it already spins).

**Recommend the separate flywheel.** Velocity control is different enough from
position control to deserve its own mechanism, the roller's "no setpoint" framing
in L20 is good and shouldn't be undone, and a flywheel gives Lessons 25 and 28 a
payload — spin-up-while-driving and aim-then-shoot both need something to shoot.

### 3. Object detection needs a class-ID convention — UNRESOLVED

maple-sim's game pieces are typed by string (`"Fuel"`); PhotonVision's detections
are typed by `int objDetClassId`. Lesson 27's sim glue has to map one to the
other, and the mapping is arbitrary. Decide the convention (a constant in
`VisionConstants`? a small enum?) **before drafting 27**, because it shows up in
both the sim IO and the target-filtering logic.

### 4. Lesson 33 needs a broken log to investigate — UNRESOLVED

The lesson is a worked forensic investigation, which needs a failure to
investigate. Two options:

- **Commit a `.wpilog` fixture** to the repo. Repeatable, everyone sees the same
  data, and the lesson can quote exact timestamps — but it's a binary blob in a
  teaching repo and it goes stale when log keys change.
- **Have the student produce one** by breaking a gain and recording a run. More
  in keeping with the course's "go see it happen" habit, and self-updating — but
  the lesson can't reference specific numbers.

Leaning toward the second, with the lesson written so the *method* is the content
and the numbers are whatever the student got.

### 5. Lesson 34 can't be verified the usual way — UNRESOLVED

Its subject is real hardware. `SysIdRoutine` does run in simulation, so the
*mechanics* (building a routine, binding the four test commands, producing a log)
are verifiable; the *procedure* (what order to check things, when to stop, how to
know a number is wrong) is not. Decide how much of the lesson is code and how much
is checklist, and be honest in the text about which is which.

### 6. Arc D ordering — soft

30–33 have no dependencies on each other; 34 wants 29 to exist so there's a
flywheel to characterise. The order given is a judgement call about motivation
(limits and alerts protect a robot; testing and log-reading protect a season),
not a constraint.

---

# Lesson 23 — LEDs: showing what the robot is thinking

**Builds on:** L22 (the robot now knows things worth showing), L19 (something
built once and mutated every tick).

**Goal (draft):** Drive an addressable LED strip from state the robot already
computes, so a human can read the robot's mind from across the field.

**New Java concepts**
- **Combinator methods that return a new value** — `LEDPattern.blink(...)`,
  `.overlayOn(...)`, `.atBrightness(...)`. This is the same shape as `Command`
  decorators (L9) and `Trigger.and(...)` (L22), now on a third unrelated type.
  Third time is when a student can see it as a *pattern* rather than an API quirk;
  say so explicitly.

**New robot concepts**
- `AddressableLED` + `AddressableLEDBuffer`, and why LEDs are written once per
  tick rather than "set and forget"
- **`LEDPattern` is a description, not a loop.** You don't write the animation;
  you name it and apply it.
- **Priority.** An LED subsystem has no safety story, but it has a real design
  problem the course hasn't hit yet: two conditions are true at once, and the
  strip can only show one. Deciding the order *is* the lesson's design content.

**Walkthrough outline**
1. What a driver can't see — the robot knows it has a piece; nobody else does.
2. The hardware: `AddressableLED`, a buffer, the once-per-tick write.
3. `LEDPattern.solid(...)` applied in `periodic()`.
4. Patterns that compose: `blink(Time)`, `breathe(Time)`, `progressMaskLayer`.
5. Wiring it to real state — `hasGamePiece`, `atGoal`, homed.
6. Priority: an ordered `if`/`else` chain, and why ordering it is a decision.

**Try it (draft)**
- A pattern for "disabled but not homed," the most useful one in a real pit.
- `progressMaskLayer` showing elevator height as a bar.
- `synchronizedBlink` so two strips blink together.

**Resolved when it was written**
- **SimGUI renders addressable strips** (user-confirmed), so the lesson is
  watchable in sim like every other one. No colour-logging fallback needed.
- `LEDPattern` is Units-native and the lesson uses the measure overloads
  throughout, per the L10 convention.
- **No IO layer**, and §4 argues the case: the IO pattern exists to make sensor
  *inputs* replayable, and a strip is write-only. L19's mechanism drawing is the
  precedent. Stated as a rule — *if you're writing an empty inputs class, stop.*
- **`Elevator.isHomed()` was added here**, not in L21. Homing established the zero
  and recorded nothing; the flag is 3 lines and gives the strip its
  highest-priority indication.
- **Priority is the lesson's design content.** Four indications, ordered so that
  *not homed* outranks *has a game piece* — a collision that really happens
  (a piece loaded in the queue line before anyone homed). Try-It #3 has the
  student reorder it and find the damage.
- **No enum**, deliberately: `Leds/Showing` is a `String`, and L24 replaces both
  the string and the `if`/`else` chain with the superstructure state. The lesson
  ends by naming that limit — "mid-handoff isn't a condition, it's a state."
- **Verified numbers:** `Color.kLimeGreen` is (50, 205, 50) — *not* pure green, a
  wrong assumption that failed a test on the first run. `atBrightness(Percent.of(25))`
  takes green 205 → 51, exactly a quarter.

---

# Lesson 24 — A superstructure: state you can name

**Builds on:** L22 (coordination via `Trigger`s), L9 (composition), L23 (something
to display the state on).

**Goal (draft):** Replace the growing web of sensor `Trigger`s with one explicit
robot state, and let the LEDs show it.

**New Java concepts**
- An **`enum` with behaviour** — constants carrying fields and methods, not just
  names. First real use in the course beyond `Constants.Mode`.
- A subsystem that owns **a state variable rather than hardware**.

**New robot concepts**
- Why a state machine beats a pile of `Trigger`s once the count grows: the
  `Trigger` version has no way to express "not from here."
- **Legal and illegal transitions** — the arm can't hand off while the elevator is
  moving, and saying so in one place beats guarding it in five.
- Intaking / holding / handoff / scoring as *named* states rather than emergent
  behaviour.
- A deliberate callback to L7's "`SwerveModule` stopped being a subsystem." The
  superstructure is the opposite decision — a subsystem that owns no motors — and
  the lesson should explain why both are right.

**Walkthrough outline**
1. Count the `Trigger`s from L22 and imagine three more mechanisms.
2. Name the states.
3. The `enum`, with the LED colour on each constant.
4. A `Superstructure` subsystem: current state, requested state, legality check.
5. Commands that request a transition rather than driving motors directly.
6. The LEDs read the state, and suddenly the strip means something.

**Try it (draft)**
- Add a `CLIMBING` state that refuses every other transition.
- Log the state as an enum output and find an illegal request in the log.
- Make an illegal transition *fail loudly* rather than silently — and decide
  whether that's right.

**Research flags**
- `Logger.recordOutput(String, E extends Enum)` exists — verified in 16–22's
  work. States log as strings, which is exactly what a replay wants.
- Watch scope. This lesson can swallow the whole robot if it tries to convert
  everything at once; convert the handoff only, and leave the rest as an exercise.

---

# Lesson 25 — BLine events: doing things while driving

**Builds on:** L17 (`registerEventTrigger`, which so far only prints), L24.

**Goal (draft):** Turn path events into real overlapping work — pre-position, spin
up, hand off — so the robot stops doing one thing at a time.

**New Java concepts**
- None major. This is composition practice, and the lesson should say so.

**New robot concepts**
- **`FollowPath.overrideRotation(DoubleSupplier)`** with
  `RotationOverrideBehavior.RESPECT_CONSTRAINTS` / `BYPASS_CONSTRAINTS`, and
  `clearRotationOverride()`. Translation keeps following the path while rotation
  comes from somewhere else — this is the primitive that makes "aim while driving"
  possible, and it's a library feature rather than something to hand-roll.
- **`getRemainingPathDistanceMeters()`** for distance-triggered actions. "Start
  the handoff two metres out" is a far better teaching beat than a time delay,
  because it survives a path that runs slow.
- Why a command that runs *during* a path must not require the drivetrain.

**Walkthrough outline**
1. The dead time in a L17 auto — the robot drives, then acts, then drives.
2. An event marker that runs a real command.
3. Requirements: what the event command may and may not take.
4. Distance-triggered actions instead of markers.
5. Rotation override: face the target while the path drives the translation.
6. Watch the two overlap on the field view and the Mechanism tab.

**Try it (draft)**
- Convert a L17 auto to overlap its scoring action; compare the times.
- Trigger on remaining distance rather than a marker, and change the path's speed
  to prove the trigger still fires in the right place.
- Deliberately require the drivetrain in an event command and diagnose the result.

**Research flags**
- Verify what `overrideRotation` does when the path itself specifies rotation
  waypoints — does the override win everywhere, or only where unspecified?
- `registerEventTrigger` has both `Runnable` and `Command` overloads; the course
  used the `Command` one in L17. Keep that.

---

# Lesson 26 — Two-step drive to pose

**Builds on:** L17 (path following), L14 (fused pose), L11 (odometry).

**Goal (draft):** Get somewhere exactly, by admitting that "fast across the field"
and "precise at the end" are different problems.

**New Java concepts**
- Building a **`Path` in code** rather than loading JSON — `new Path(PathElement...)`.
  Paths become data your program makes, which is the door Lesson 27 walks through.

**New robot concepts**
- Why one controller can't do both jobs: gains that cross the field quickly
  overshoot the last 20 cm, and gains that settle nicely take forever to travel.
- The handoff between coarse and fine, and how to decide when to switch.
- Tolerance and settling — "arrived" is a decision, not a fact.

**Walkthrough outline**
1. Try it with one controller and watch it either creep or oscillate.
2. Stage one: a generated path to a staging pose near the target.
3. Stage two: a short, tightly-tuned alignment.
4. The switch condition, and what happens if you get it wrong.
5. Sequencing the two into one command.
6. Plot pose vs. target through both stages.

**Try it (draft)**
- Tune stage two until it settles in under half a second.
- Make the staging pose a function of approach direction.
- Handle "already close enough" — skip stage one entirely.

**Research flags**
- Decide whether stage two is BLine, a `ProfiledPIDController` pair, or the
  drivetrain's own method. Prefer whatever reuses L17's `PathConstants` idiom.
- `Path.isValid()` exists — worth using on generated paths, since a path built
  from a bad pose is a runtime problem, not a compile one.

---

# Lesson 27 — Object detection: find the piece and go get it

**Builds on:** L15 (PhotonVision + the IO/replay treatment), L26 (generated paths),
L20/L22 (the intake that catches it).

**Goal (draft):** The robot sees a game piece, decides which one, drives to it, and
picks it up — with no path drawn in advance.

**New Java concepts**
- Filtering and sorting a list of detections to choose a target (streams, or an
  explicit loop — pick whichever the course has room for).

**New robot concepts**
- `PhotonTrackedTarget.getDetectedObjectClassID()` / `getDetectedObjectConfidence()`.
- **Camera bearing → field pose**, using L14's estimate. This is the real content:
  a detection is an angle, and turning it into a place requires knowing where you
  are.
- **What to do when the target disappears mid-approach.** This is the hard part and
  should be the centre of the lesson, not a footnote. Options — keep the last
  estimate, abort, search — are a design discussion with no single right answer.

**Walkthrough outline**
1. A path you can't draw in advance.
2. Reading detections; class ID and confidence.
3. Picking one: nearest, most confident, or most centred.
4. Bearing to field pose.
5. Generating the approach path (L26) and running the intake (L20).
6. Losing sight of it — and what the robot should do about that.

**Try it (draft)**
- Change the selection rule and watch the robot pick differently.
- Add a confidence floor; find the value where it starts missing real pieces.
- Make the approach abort and re-search instead of trusting a stale estimate.

**Research flags**
- **Simulation works** — `VisionTargetSim` carries `objDetClassId`/`objDetConf`
  and `PhotonCameraSim.process` reads both into the emitted target. This lesson is
  verifiable in the usual way.
- Open decision 3 (class-ID convention) blocks drafting.
- The sim needs vision targets placed where maple-sim's `Fuel` actually is, or the
  robot will drive to a piece that isn't there. That glue is the lesson's real
  sim work.

---

# Lesson 28 — Aiming at an AprilTag

**Builds on:** L15 (tags), L25 (rotation override), L14 (pose).

**Goal (draft):** Hold the robot pointed at a target while the driver — or a path —
moves it around.

**New Java concepts**
- Likely none. A good lesson to be explicit that not every lesson adds Java.

**New robot concepts**
- Tag pose → desired heading, and why you compute it from the *fused* pose rather
  than the raw sighting.
- Blending driver translation with software rotation — the driver keeps two axes,
  the robot takes the third.
- Aiming during an auto path via L25's rotation override.
- **Latency and staleness.** A sighting is always a little old; at speed that
  matters. First honest treatment of it in the course.

**Walkthrough outline**
1. Aiming by hand, and why it's hard from behind a wall.
2. Heading to the tag.
3. A rotation controller that runs under driver translation.
4. Holding aim while the path drives (rotation override).
5. What happens when the tag isn't visible.
6. Plot heading error while driving a circle around the target.

**Try it (draft)**
- Aim at a *point on the field* rather than a tag, so it works when the tag is
  hidden.
- Add a "ready to score" boolean: aimed, in range, and settled.
- Drive fast sideways and watch the error; then reason about latency.

**Research flags**
- Decide whether aim is a drivetrain command or a rotation `DoubleSupplier` that
  several things can use. The latter composes better with L25.
- `PhotonPipelineResult` carries a timestamp — the course already uses it in L15's
  `PoseObservation`. Reuse rather than re-derive.

---

# Lesson 29 — A flywheel: velocity control, and why it's different

**Builds on:** L13 (the IO spine), L18 (the model), L25 (spin up while driving).

**Goal (draft):** The fourth mechanism on the same spine, and the first whose goal
is a *speed* rather than a place.

**New Java concepts**
- None major — this is the "repeat the spine" beat, now on its fourth mechanism,
  and the lesson should be short because of it.

**New robot concepts**
- `FlywheelSim` in `ElevatorSim`/`SingleJointedArmSim`'s slot.
- `VelocityVoltage` with `kV`, `kA`, `kS` and **no `kG`** — nothing to hold up.
  A clean payoff of L18's framing: the model has the terms the *physics* has, not
  a fixed set you always write.
- **`kS` finally matters.** The course has kept it at zero because the sim is
  frictionless; a flywheel is the place to discuss it honestly.
- **Recovery time, not error**, as the figure of merit. A flywheel that's 50 rpm
  low between shots is fine; one that takes three seconds to come back is not.
- Why you spin up early — ties directly to L25's distance trigger.

**Walkthrough outline**
1. A goal that is a speed.
2. `FlywheelIO` / `FlywheelIOTalonFX` / `FlywheelIOSim` / `Flywheel` (fast).
3. The model without `kG`, and computing `kV`/`kA` the L18 way.
4. `VelocityVoltage` and what "at speed" means.
5. Recovery: shoot, watch it dip, watch it come back.
6. Spin-up on the L25 distance trigger.

**Try it (draft)**
- Measure recovery time; halve the moment of inertia and measure again.
- Gate scoring on `atSpeed` and feel the difference.
- Set `kV` to zero and watch how long it takes to reach speed on `kP` alone —
  the same experiment as L18's, on a mechanism where it's even starker.

**Research flags**
- Confirm `FlywheelSim`'s 2026 constructor (it takes a `LinearSystem`, unlike
  `ElevatorSim`'s convenience form).
- Decide the gear ratio and MOI so the numbers are computable by the L18 method —
  the arithmetic must reproduce whatever constants ship.

---

# Lesson 30 — Current limits and brownouts

**Builds on:** L21 (reading stator current — this is the other half).

**Goal (draft):** Stop the robot browning out, and see one happen on purpose.

**New Java concepts**
- None.

**New robot concepts**
- **`CurrentLimitsConfigs`**: `SupplyCurrentLimit` vs. `StatorCurrentLimit`, and
  why they're different questions (what the battery gives vs. what the windings
  take). Verified defaults: supply 70 A, stator 120 A, with
  `SupplyCurrentLowerLimit` 40 A after `SupplyCurrentLowerTime` 1.0 s.
- The battery as a **shared, finite resource** — the first time in the course that
  one subsystem's choices hurt another.
- What a brownout actually does, and why the symptom (everything gets weird at
  once) is so hard to diagnose without the log.

**Walkthrough outline**
1. Four mechanisms all asking for everything at the same time.
2. Supply vs. stator, with the L21 current trace as the starting point.
3. Setting limits on each mechanism, with a reason for each number.
4. Simulating the battery: `BatterySim.calculateLoadedBatteryVoltage(...)` +
   `RoboRioSim.setVInVoltage(...)`.
5. Cause a brownout deliberately and watch every mechanism misbehave at once.
6. Re-run with limits and watch it not happen.

**Try it (draft)**
- Find the limit where the elevator still makes its cruise but the robot stops
  browning out.
- Log total current draw as one number and correlate it with battery voltage.
- Lower the limit until Motion Magic can't hit its profile, and see what that
  looks like on the setpoint trace (callback to L18 §9).

**Research flags**
- Confirm whether Phoenix's *simulated* firmware enforces current limits, or
  whether the lesson has to demonstrate them on the battery model alone. **This
  decides whether step 6 is real or narrated** — settle it before drafting.

---

# Lesson 31 — Alerts: knowing something is wrong before the match

**Builds on:** L13 (IO layers, so "is this device alive?" is answerable), L15.

**Goal (draft):** The robot runs its own pre-match checklist and says what's wrong.

**New Java concepts**
- None major.

**New robot concepts**
- WPILib's **`Alert`** and `AlertType`, and how alerts surface on a dashboard.
- **Logging a problem and reporting one are different jobs.** The course has
  logged everything since L3; nobody reads a log in the queue line.
- What's worth alerting on: a device that never came up, a camera with no frames,
  a mechanism that has never been homed, a battery below threshold.

**Walkthrough outline**
1. The five minutes before a match, and what you wish the robot would tell you.
2. `Alert` and its types.
3. A connection check in an IO layer.
4. An "unhomed" alert wired to L21's state.
5. A stale-camera alert wired to L15's observations.
6. Look at it on the dashboard.

**Try it (draft)**
- Unplug a simulated camera and watch the alert appear.
- Add a "battery low" alert and pick the threshold from L30's data.
- Decide which alerts are errors and which are warnings, and defend the split.

**Research flags**
- Confirm how `Alert` renders in the dashboards the course already uses.
- Check whether Phoenix exposes a device-connected signal the IO layers can read
  directly (`isConnected()` or a status-signal age check).

---

# Lesson 32 — Testing your own robot code

**Builds on:** every mechanism; L13's IO layers are what make this possible.

**Goal (draft):** Students write JUnit tests against their own subsystems, using
exactly the technique that verified every lesson in this course.

**New Java concepts**
- **JUnit**: `@Test`, `@BeforeEach`, `assertEquals` with a tolerance, the
  arrange/act/assert shape.

**New robot concepts**
- `HAL.initialize`, `DriverStationSim`, and stepping the simulation inside a test.
- **The real-time trap**: sleep the full 20 ms per tick, or the physics outruns
  Phoenix's simulated firmware and every tracking number becomes fiction. This
  cost real time during 16–22 and belongs in front of students.
- **Simulated devices outlive a test** — Phoenix devices are keyed by CAN ID, and
  a `DigitalInput` holds its DIO channel for the life of the JVM. Give each test
  its own IDs, or write one sequential scenario.
- Which claims are worth a test: the ones a compiler can't check and a plot won't
  show you twice.

**Walkthrough outline**
1. "It worked when I tried it" is not a record.
2. A first test: does the elevator clamp an impossible goal?
3. The sim-in-a-test harness.
4. A test with physics: does homing fix a lying encoder? (L21's scenario.)
5. The two traps, with the symptom each produces.
6. Running them, and what a red test tells you.

**Try it (draft)**
- Test that the arm's soft limits hold when the clamp is bypassed.
- Test the L22 claim that a spinning roller doesn't mean a held piece.
- Break a gain on purpose and watch the right test fail.

**Research flags**
- The student project's `build.gradle` needs a test source set — check whether the
  WPILib template ships one, or whether the lesson has to add it.
- Keep the tests students write *small*. The goal is the habit, not coverage.

---

# Lesson 33 — Reading a match log

**Builds on:** L3 (logging), L13 (replay), L18 §9 (reading gains off a graph).

**Goal (draft):** Diagnose a failure that already happened, from the log alone.

**New Java concepts**
- None. This is a skills lesson, and it should be honest about that.

**New robot concepts**
- AdvantageScope forensics: line up setpoint, position and applied voltage; find
  the moment it went wrong; work backwards.
- **Replay as a debugging tool** rather than a party trick — change the code, run
  the old inputs through it, see if the bug survives.
- What to log so that future-you can answer a question present-you hasn't thought
  of yet. The answer is "decisions, not just measurements," and L22's Try It #5
  already gestured at it.

**Walkthrough outline**
1. A robot that did something wrong on the field, and a log.
2. Finding the moment.
3. Reading the traces together rather than one at a time.
4. Forming a hypothesis, then testing it with replay.
5. What was missing from the log, and adding it.
6. A worked second example, faster.

**Try it (draft)**
- Break something different, record, hand the log to a teammate and see if they
  find it.
- Add one output that would have made the investigation trivial.
- Replay a log through fixed code and confirm the fix.

**Research flags**
- Open decision 4: fixture log vs. student-generated. Settle before drafting.
- Check what AdvantageScope 2026 calls the relevant tabs so the instructions are
  accurate.

---

# Lesson 34 — Tuning your robot when build team hands it over

**Builds on:** L18 and L20 (computed models), L29, L30, L32, L33.

**Goal (draft):** The course's computed models meet a real machine, and the student
finds out how close they were.

**New Java concepts**
- None.

**New robot concepts**
- **`SysIdRoutine`** — `quasistatic(Direction)`, `dynamic(Direction)`, and a
  `Mechanism(Consumer<Voltage>, Consumer<SysIdRoutineLog>, Subsystem[, String])`.
  Measure `kS`/`kV`/`kA` instead of computing them.
- **The honest comparison.** This course *derives* its gains from the spec sheet
  (0.12 V per rotor rot/s, 1.69 V per N·m). SysId measures them on the real
  machine. Where they disagree, the difference is friction, efficiency and a
  mass that isn't what CAD said — and naming that is the lesson's best moment.
- A safe first-power-on procedure, and what to check in what order.

**Walkthrough outline**
1. The robot arrives, and none of your numbers are about *this* robot.
2. First power-on, safely.
3. A SysId routine on one mechanism.
4. Running the four tests and reading the results.
5. Computed vs. measured, side by side.
6. What to do when they disagree a lot.

**Try it (draft)**
- Run SysId in simulation, where you know the true answer, and check that it
  recovers it.
- Characterise a second mechanism and predict the result first.
- Write the team's power-on checklist.

**Research flags**
- Open decision 5: how much is code and how much is procedure.
- SysId's analysis step is a separate desktop tool — confirm the 2026 workflow
  before writing instructions.
- The lesson must not imply SysId replaces understanding the model. It measures
  the same terms the course already taught; the point is agreement, not
  substitution.

---

# Aside — `aside-commands-v3.md`

**Goal (draft):** For a team moving to WPILib 2027 — what Commands V3 changes, and
how the code in this course would translate.

**Contents (draft)**
- Why it exists: `Command`'s four-method shape is awkward for anything sequential,
  and V3's continuations let a command read like the procedure it describes.
- What the course's own commands would look like — `Elevator.goToHeight`,
  `home()`, and L22's capture sequence are good before/after material.
- What *doesn't* change: subsystems, requirements, the scheduler's job.
- The hard constraint: Java 21 continuations, so 2027 and later only.

**Conventions**
- No `Next:` link (asides aren't in a chain).
- Listed in the README's **Asides** section.
- May reference numbered lessons freely.

**Research flags**
- Written against the 2027 API, which is still settling. **Date it and say so** —
  this is the one piece of the course that is deliberately ahead of the target
  version, and it should be re-checked whenever 2027 stabilises.
- The `design-docs/commands-v3.md` in `wpilibsuite/allwpilib` is the primary
  source; `docs.wpilib.org/en/2027/` has the user-facing version.

---

# Appendix: verified API notes

Checked directly against the jars in the Gradle cache and WPILib's maven, not from
memory. Same rule as 16–22's appendix: **verify before drafting, and record what
you verified.**

| Fact | Status |
|---|---|
| Commands V3 in 2026 | **Absent.** `wpilibNewCommands-java-2026.2.1` contains only `edu.wpi.first.wpilibj2.command`; WPILib's maven release repo has just `wpilibNewCommands` and `wpilibOldCommands`. Needs Java 21 continuations → 2027. |
| `LEDPattern` | Present in `wpilibj`. Statics: `solid(Color)`, `gradient(GradientType, Color...)`, `rainbow(int, int)`, `steps(Map)`, `progressMaskLayer(DoubleSupplier)`, `kOff`. Instance: `blink(Time)`, `blink(Time, Time)`, `breathe(Time)`, `synchronizedBlink(BooleanSupplier)`, `scrollAtRelativeSpeed(Frequency)`, `scrollAtAbsoluteSpeed(LinearVelocity, Distance)`, `overlayOn`, `blend`, `mask`, `atBrightness(Dimensionless)`, `reversed`, `offsetBy(int)`, `mapIndex`. |
| `AddressableLED` | Present, with `ColorOrder`. |
| `Alert` | Present in `wpilibj`, with `AlertType`. |
| `SysIdRoutine` | Present at `edu.wpi.first.wpilibj2.command.sysid`. `quasistatic(Direction)` / `dynamic(Direction)` return `Command`; `Mechanism(Consumer<Voltage>, Consumer<SysIdRoutineLog>, Subsystem)` with a 4-arg name overload. |
| PhotonVision object detection | `PhotonTrackedTarget.getDetectedObjectClassID()` and `getDetectedObjectConfidence()` in `photontargeting-java-v2026.3.4` (note: the targeting classes are in `photontargeting`, not `photonlib`). |
| Object detection **in simulation** | **Works.** `VisionTargetSim` has `objDetClassId` / `objDetConf` fields and constructors `(Pose3d, TargetModel, int)` and `(Pose3d, TargetModel, int, float)`. `PhotonCameraSim.process` reads both and passes them into the emitted `PhotonTrackedTarget`. Lesson 27 is verifiable in the usual way. |
| BLine rotation override | `FollowPath.overrideRotation(DoubleSupplier)` and `(DoubleSupplier, RotationOverrideBehavior)`, plus `clearRotationOverride()`. Enum values: `RESPECT_CONSTRAINTS`, `BYPASS_CONSTRAINTS`. |
| BLine progress readouts | `getRemainingPathDistanceMeters()`, `getCurrentTranslationElementIndex()`, `getCurrentRotationElementIndex()`. |
| BLine programmatic paths | `new Path(PathElement...)`, `new Path(PathConstraints, PathElement...)`, `new Path(List<PathElement>[, PathConstraints[, DefaultGlobalConstraints]])`, plus `new Path(String)` (the JSON form L17 uses) and `new Path(File, String)`. `isValid()` is available. |
| BLine command factories | `BLineCommands` mirrors WPILib's `Commands`: `either`, `select`, `defer`, `deferredProxy`, `sequence`, `repeatingSequence`, `parallel`, `race`, `deadline`. |
| `CurrentLimitsConfigs` | `SupplyCurrentLimit` (default 70), `StatorCurrentLimit` (default 120), `SupplyCurrentLowerLimit` (40), `SupplyCurrentLowerTime` (1.0), and the two enables (both default `true`). |
| Brownout simulation | `BatterySim.calculateLoadedBatteryVoltage(nominalVoltage, resistance, currents...)` and `calculateDefaultBatteryLoadedVoltage(currents...)`, fed to `RoboRioSim.setVInVoltage(...)`. |
| `Trigger` combinators | `and`/`or`/`negate`/`debounce` verified during L22. `debounce(double)` defaults to `DebounceType.kRising`. |
