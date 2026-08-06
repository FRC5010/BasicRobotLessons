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
| 24 | A superstructure: state you can name | L23, L22, L9 | none | **Done** — [lesson](lessons/24-superstructure.md), [code](../code/lesson-24/) |
| 25 | Doing two things at once (path events) | L17, L24 | `BLine-Lib` | **Done** — [lesson](lessons/25-path-events.md), [code](../code/lesson-25/) |
| 26 | Getting there exactly (two-step drive to pose) | L17, L14 | `BLine-Lib` | **Done** — [lesson](lessons/26-drive-to-pose.md), [code](../code/lesson-26/) |
| 27 | Going to get something you just saw | L15, L26, L20/22 | `photonlib`, `maple-sim` | **Done** — [lesson](lessons/27-object-detection.md), [code](../code/lesson-27/) |
| 28 | Keeping the nose on the target | L15, L25 | `photonlib` | **Done** — [lesson](lessons/28-aim-at-tag.md), [code](../code/lesson-28/) |
| 29 | A wheel that holds a speed | L13 spine, L18 model | none | **Done** — [lesson](lessons/29-flywheel.md), [code](../code/lesson-29/) |
| 30 | One battery, everything on it | L21 (current sensing) | none | **Done** — [lesson](lessons/30-current-limits.md), [code](../code/lesson-30/) |
| 31 | The robot tells you what's wrong | L13, L15 | none | **Done** — [lesson](lessons/31-alerts.md), [code](../code/lesson-31/) |
| 32 | Tests that catch what a plot won't | all mechanisms | none | **Done** — [lesson](lessons/32-testing.md), [code](../code/lesson-32/) |
| 33 | Reading a match log | L3, L13 | none | **Done** — [lesson](lessons/33-reading-a-log.md), [code](../code/lesson-33/) |
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

### 3. Object detection class-ID convention — RESOLVED (two constants, no enum)

`VisionConstants.kGamePieceType = "Fuel"` (maple-sim's name) and
`kGamePieceClassId = 0` (the model's number). One game piece type means an enum
would be ceremony; the lesson instead makes the point that **there is no standard
class ID** — it is the class index in the model you trained, so the only
requirement is that the constant and the model agree. Getting it wrong yields no
error and no detections, which is called out explicitly.

### 4. Lesson 33 needed a broken log to investigate — RESOLVED

Went with a third option, splitting the difference: a **contrived scenario the
student generates themselves**. Rather than a fixture (binary blob, goes stale)
or an open-ended "break something" (no numbers to write against), the lesson
specifies one exact, deliberate bug — `ElevatorConstants.kTolerance` tightened
by a decimal-place typo from `Centimeters.of(2)` to `Centimeters.of(0.002)` —
that the student introduces in their own project and records themselves. That
gets the lesson a specific, quotable failure signature (verified in the sandbox:
the elevator's real Motion Magic settle error is a stable ~0.12 mm floor, so a
0.02 mm tolerance never trips `atGoal()`, comfortably and repeatably) while
keeping every number the student's own machine actually produces, not a
committed fixture. A second, faster example (a BLine `lib_key` case mismatch —
`"intake"` vs `"Intake"`) is narrated rather than hands-on, reusing L17's
already-established "logs a warning, keeps driving" behavior instead of
re-deriving it.

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

**What shipped** (differs from the outline in places — these are the decisions
later lessons have to respect):

- **Six states**, not four: `UNHOMED`, `IDLE`, `INTAKING`, `HANDOFF`, `HOLDING`,
  `SCORING`. `HANDOFF` is the one L23's ending promised.
- **Named `SuperstructureState`, not `RobotState`** — `edu.wpi.first.wpilibj.RobotState`
  is a real class and the collision is a nasty first compile error. It lives in
  `frc/robot/subsystems/` next to `Superstructure`.
- **Legality and readiness are deliberately separated.** `canGoTo` is an
  exhaustive switch expression on the enum: no sensors, never changes, governs
  what a *request* may ask for. `Superstructure.periodic()` owns the automatic,
  sensor-driven transitions and does **not** consult `canGoTo` — the state
  machine doesn't ask itself permission. Keep that split.
- **`UNHOMED.canGoTo(anything)` is `false`.** The only exit is `periodic()`
  seeing `m_elevator.isHomed()`. This makes L23's LED priority structural rather
  than cosmetic, and it closes the hole where a button could declare the robot
  homed without homing it.
- **The guard rule:** a command bound to a *button* guards itself with
  `.onlyIf(() -> allow(...))`; a command bound to a *state* (via `inState(...)`)
  does not, because arriving in the state already means the machine said yes.
- `Command.onlyIf(BooleanSupplier)` is the one new decorator (verified present in
  2026, returns `ConditionalCommand`, condition evaluated once at schedule time).
- **`Commands.parallel` cannot hold two commands requiring the same subsystem** —
  it throws at construction. `requestIntake` is therefore a *sequence* of
  `goToAngle` then `runRoller`. L22's parallel was legal only because it combined
  an arm command with an elevator command.
- The L22 `.debounce(...)` moved off the `Trigger` and into a plain
  `edu.wpi.first.math.filter.Debouncer` field, since the beam break is now read
  in `periodic()` rather than in a binding.
- **`Leds(Supplier<SuperstructureState>)`** — the user asked for the LED subsystem
  to stop taking subsystems. It no longer imports `Elevator` or `Arm` at all, and
  `Leds/Showing` was deleted in favour of `Superstructure/State`. The alliance
  colour is a real casualty (an enum constant is `static final` and can't know the
  runtime alliance) and became Try It #1.
- **Scope held:** the drivetrain, autos, vision, homing, and the D-pad elevator
  overrides were left alone. The D-pad staying outside the state machine is
  called out honestly in the text and is Try It #4.
- **Testing note:** a scheduler test is *vacuous* unless you enable the robot —
  `CommandScheduler.run()` cancels everything while disabled, so both halves of
  an `onlyIf` test "pass" for the same wrong reason. Use `DriverStationSim.setEnabled(true)`
  + `notifyNewData()` + `DriverStation.refreshData()`, and assert
  `!DriverStation.isDisabled()` before trusting the result.
- **L24 is currently the last lesson, so it ends with a send-off and no `Next:`
  link** — exactly the trap L22 had. Adding Lesson 25 means rewriting that
  ending, not appending to it.

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

**Research flags — RESOLVED** (all read out of the v0.9.1 sources jar and then
confirmed with a runtime test; do not re-derive these from the docs):

- **`overrideRotation` wins everywhere, unconditionally.** `execute()` computes the
  path's own rotation PID output and then overwrites it whenever an override is
  active. The path's rotation targets are still evaluated and logged
  (`FollowPath/targetRotationDeg`) — they are simply discarded. Measured: the path
  wanted 4.712 rad/s, the override forced 1.234.
- **The supplier is an angular velocity in rad/s, NOT a target heading.** Anyone
  arriving from PathPlanner will assume otherwise. The lesson says so in bold.
- The 1-arg overload defaults to `BYPASS_CONSTRAINTS`; `RESPECT_CONSTRAINTS` sends
  the override through `ChassisRateLimiter` instead.
- **`isFinished()` requires rotation within `endRotationToleranceDeg`**, so an
  override left active stalls the path *forever*. Measured: 303 ticks to finish
  normally, never within 2000 ticks with an override held on. Hence both the
  `release` marker and the `finallyDo` handback.
- `registerEventTrigger(String, Command)` is implemented as
  `CommandScheduler.getInstance().schedule(command)` — the event command runs
  independently, so **an event command requiring the drivetrain cancels the path**.
  Verified with the scheduler.
- **`t_ratio` on an `event_trigger` is a fraction of its owning segment** (between
  the surrounding translation targets), not of the whole path.
- **`getRemainingPathDistanceMeters()` returns `0.0` before `initialize()`** — a
  sentinel indistinguishable from "arrived". Safe inside `Commands.parallel` with
  the path (the group initializes the path first, verified), dangerous if hoisted
  into a standalone `Trigger`.

**Testing trap worth not rediscovering:** BLine derives `dt` from
`Timer::getTimestamp`, so a JUnit loop that calls `execute()` 2000 times in a few
milliseconds sees ~0 elapsed time, the rate limiter clamps everything, and the
robot never moves. There is a package-private `FollowPath.setTimestampSupplier` —
put the test in package `frc.robot.lib.BLine` and feed it a clock that advances
0.020 per tick. This is the mirror image of the Lesson 20-22 sleep trap.

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

**Research flags — RESOLVED**

- **Stage two is the drivetrain's own method**, three `PIDController`s on
  field-relative error, gains in `PathConstants`. Renamed `driveToPose` →
  `alignToPose`, because `Autos.driveToPose` is now the two-stage composition.
- The lesson pays off **Lesson 11's unused `driveToPose` sketch** — written,
  called "minimal", and never invoked in fifteen lessons. That sketch's finish
  condition ignores rotation, and the lesson uses it as the cautionary tale.
- **A generated path is a single `Waypoint`** — it names only the destination,
  because it starts wherever the robot is. Verified: valid, and it drives there
  from the current pose.
- **`withPoseReset` must NOT be used on generated paths.** `getStartPose()` on a
  one-waypoint path returns *that waypoint*, so a reset teleports the estimate to
  the destination. Hence a second builder, `s_generatedBuilder`.
- `Path.isValid()` needs no defensive call: `FollowPath.isFinished()` already
  checks it, logs a warning, and finishes early. Saying that is better teaching
  than adding a check that never fires.
- `PIDController.atSetpoint()` is `false` before the first `calculate()`, so
  `.until(this::atPose)` needs no reset beforehand. Verified.

**Measured numbers the lesson quotes** (from (1,1) to (5,4) facing 90°, sim):

| | Time | Actual error |
|---|---|---|
| L11 sketch at its own finish line | 3.02 s | 49.9 mm |
| L11 sketch pushed to 2 cm / 1° | 3.64 s | 20 mm / 1° |
| Two stages | 2.58 s | 17.9 mm / 0.01° |

Two stages is both faster *and* more accurate. Also measured: started on the
target but facing backwards, the L11 sketch declares arrival on tick zero while
**176° out** — the sharpest demonstration that "arrived" is a decision.

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

**Research flags — RESOLVED** (measured, not inferred)

- **Simulation works.** `classId` and `conf` come through the fake camera exactly
  as set. Confirmed end to end.
- **`new VisionTargetSim(pose, model, int, float)` sets `objDetClassId`/`objDetConf`
  and leaves `fiducialID = -1`. The 3-arg `(pose, model, int)` sets `fiducialID`
  instead** and leaves the detection fields at `-1`. Both compile; the 3-arg one
  produces detections your class filter silently rejects forever.
- **Positive pitch in a `robotToCamera` `Transform3d` points the camera DOWN**,
  while `PhotonUtils.calculateDistanceToTargetMeters` wants camera pitch measured
  UP from horizontal — hence the minus sign in `toFieldPosition`. Verified by
  reproducing measured distances to the millimetre.
- **maple-sim's Fuel is a 15 cm ball** (`REBUILT_FUEL_INFO`: radius 0.075 m,
  height 15 cm) whose centre sits ~8 cm off the floor. `kGamePieceHeight` is that
  8 cm, and the height assumption is what makes one camera sufficient.
- `SimulatedArena.getInstance().getGamePiecesPosesByType("Fuel")` is the glue;
  the sim IO rebuilds its target set from it every tick because pieces move.
- The detection camera needs its **own `VisionSystemSim`**, separate from Lesson
  15's tag layout — a camera belongs to exactly one, and this one's targets are
  rebuilt every tick.

**Measured detection error vs. distance** (ball straight ahead, sim camera noise
on). This table is quoted in the lesson and is the justification for treating
target-loss as a design decision rather than a footnote:

| Distance | Mean position error |
|---|---|
| 1.0 m | ~10 mm |
| 2.0 m | ~65 mm |
| 3.0 m | ~130 mm |
| 5.0 m | ~150 mm |

Also verified: straight-ahead detection at 2.5 m lands within **21 mm**; a robot
rotated 90° with the piece off-axis lands within **113 mm**; nearest-piece
selection picks correctly with two balls on the field; an empty field yields no
target.

**What shipped, and the one honest compromise:** `fetchPiece` uses
`Commands.defer(..., Set.of(drivetrain))` to build the approach at schedule time,
which **commits to a snapshot**. The error table says re-looking on the way in
would be better, and the lesson says so plainly rather than pretending the simple
version is optimal — building it is Try It #3.

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

**Research flags — RESOLVED**

- **Aim is plain static methods, not a command** (`frc/robot/commands/Aim.java`,
  a utility class like `Autos`). That is exactly why the driver binding *and* the
  BLine rotation override can both use it — a command would have served one.
- **No new drivetrain code was needed.** `driveFieldRelative` has taken three
  suppliers since L10; aim assist swaps the third. Worth remembering as the payoff
  for having written it that way.
- **`Aim` contains no camera.** Aiming reads the tag layout (a file) and the fused
  pose, so it keeps working with nothing visible; it degrades with odometry drift
  rather than failing. This is the answer to walkthrough item 5 and it is
  structural — visible in the signatures.
- Tag **20** at (5.23, 4.03) is the aiming target on the 2026 field (32 tags).
  `getTagPose` returns `Optional`, so a typo'd ID is an empty, not a crash.

**The lesson's centre changed from the outline, and for the better.** The plan
expected camera *latency* to be the honest treatment. The dominant error is
actually **P-control tracking lag against a moving bearing**, which is bigger,
measurable, and already compensated for on the latency side by L14's timestamped
`addVisionMeasurement`. Measured, orbiting the tag at 3 m/s on a 3 m radius:

| | Worst heading error |
|---|---|
| P only | **14.32°** |
| P + bearing-rate feedforward | **0.20°** |

The prediction matches exactly: the bearing moves at 1.0 rad/s, and `error × kAimP`
can only make that from `1.0/4.0 = 0.25 rad = 14.32°`. **This is the third
instance of the course's feedforward rule** (`kG` in L18, `kV` in L18/L12, bearing
rate here), and the lesson says so explicitly. The feedforward is
`(vx·dy − vy·dx) / d²` — the cross product of field velocity with the offset to
the target, over distance squared.

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

**Research flags — RESOLVED**

- `FlywheelSim(LinearSystem<N1,N1,N1>, DCMotor, double... stdDevs)`, built with
  `LinearSystemId.createFlywheelSystem(DCMotor, jKgMetersSquared, gearing)`.
  Confirmed against the 2026 jars.
- **Gear ratio 1.0 (direct drive), J = 0.01 kg·m², shoot 60 rot/s, idle 30.** The
  L18 arithmetic reproduces the shipped constants exactly:
  `kV = 12/100 = 0.12` V per rot/s, and `kA = J × 2π × (12/7.09) = 0.106` V per
  rot/s². Direct drive was chosen so the "÷ gear ratio" step is trivially visible
  rather than doing hidden work.
- **No `kG`.** The lesson makes this the centrepiece: a model has a term for each
  thing the physics does, not a fixed set of four.

**Measured numbers the lesson quotes:**

| | |
|---|---|
| Spin-up, rest → 60 rot/s | 2.32 s |
| Spin-up, idle 30 → 60 rot/s | 1.24 s |
| Holding 60 rot/s | 60.44 rot/s (0.44 error), ~7.2 V |
| **kP alone (kV = kA = 0)** | settles at **42.90 rot/s, forever** |
| Predicted kP-only settle | `goal·kP/(kP+kV)` = **42.86** |

Recovery vs. idle speed — the lesson's figure-of-merit table: 0 → 2.32 s,
15 → 1.76 s, 30 → 1.24 s, 45 → 0.70 s.

**`kS` is discussed but provably does nothing in this sim** — `FlywheelSim` has no
friction term, and 0.05 V spins the simulated wheel to 0.37 rot/s. The lesson says
so outright rather than faking it (same discipline as L22's debounce). `kS = 0.15`
ships as the honest hardware value.

**Added after review (user request):** a `Mechanism2d` **speedometer**, since the
flywheel is the one mechanism with nothing physical to draw and the one whose
behaviour you most want to watch. `Flywheel` owns a square `LoggedMechanism2d`
with a centre hub and **two** needles — actual speed and goal speed — so the gap
between them is the error drawn to scale. One expression does the geometry:
`angle = kZeroAngle − kFullSweep × (speed / kFreeSpeed)`, i.e.
`−90° − 180° × fraction`, giving straight down at rest, straight up at full scale,
positive sweeping through the left half and negative through the right (verified
at 0/±50/100%). Full scale is the motor's **free speed**, and the fraction is
**clamped** — an unclamped needle would wrap past vertical and sit looking like a
modest negative speed, and a gauge that wraps is worse than no gauge because it
doesn't look broken. Shooting speed lands at 60% of full scale. The dial updates
live in `updateDial()` rather than inline in `periodic()`, purely so the lesson can
present the control and the picture as separate pieces that are each contiguous
substrings of the final file.

**Deliberately left out:** the shot-dip-and-recover demo. Simulating a shot would
need a sim-only hook on `FlywheelIO`, which is exactly the `GyroIO.setSimRotationRate`
shape L16 deleted. Recovery is taught instead as *idle → shoot speed*, which is
real practice, fully observable, and needs no fake disturbance. The auto spin-up
tie-in is Try It #4 for the same scope reason — the interesting part is working out
what makes a hold-a-speed command end.

**Testing trap:** Phoenix's simulated motors output **nothing while the robot is
disabled**, so a bare motor+model rig reads 0.00 rot/s forever unless the test
calls `DriverStationSim.setEnabled(true)`. Same trap as L24's scheduler test,
different symptom.

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

**Research flag — RESOLVED: Phoenix's simulated firmware DOES enforce current
limits.** Measured: a Kraken given 12 V from rest peaked at 200 A stator
unlimited, and 21 A with a 20 A stator limit — and only reached 5.5 rot/s instead
of 54.8, with the motor voltage cut to 1.20 V. Every step of this lesson is real,
nothing is narrated.

**Phoenix's defaults are ENABLED, which reframes the lesson.** Read off a fresh
`TalonFXConfiguration`: stator 120 A enabled, supply 70 A enabled,
`SupplyCurrentLowerLimit` 40 A after 1.0 s. So the lesson is not "add limits where
there were none" — it is **"the defaults are per motor and the battery is per
robot."** Measured with identical loads on untouched defaults:

| Motors | Peak draw | Battery low | |
|---|---|---|---|
| 3 | 108 A | 9.84 V | fine |
| 6 | 332 A | 5.37 V | **brownout** |
| 9 | 552 A | 0.96 V | **brownout** |
| 12 | 751 A | 0.00 V | **brownout** |

**Supply vs. stator, measured** (Kraken at 12 V spinning up a heavy wheel): stator
pinned at 120 A throughout while supply climbed 30 → 58 A as speed rose, with
applied volts 3.00 → 5.79. The relationship `supply ≈ stator × (applied/battery)`
reproduces both endpoints exactly, and that one line explains why the two limits
answer different questions.

**The brownout demo, measured** (three heavy mechanism motors, all flat out):

| | Peak draw | Battery low | |
|---|---|---|---|
| No limits at all | 490 A | 2.09 V | brownout |
| Phoenix defaults | 108 A | 9.84 V | survives (only 3 motors) |
| The lesson's budget | 42 A | 11.16 V | comfortable |

**Design decisions:** every limit lives in one new `PowerConstants` class rather
than beside each mechanism, because a budget only means anything read as a set.
The battery model goes in `Robot.simulationPeriodic()` — the same "shared world
state" argument L16 used for the maple-sim arena, and the lesson says so. The loop
closes for free because every sim IO layer already feeds
`RobotController.getBatteryVoltage()` to its motors.

**Scope:** the total sums the three *mechanisms* only. Adding the drivetrain's
eight motors is Try It #1 — it is the biggest consumer and the same edit repeated,
so it earns more as an exercise than as eight more near-identical blocks.

**Testing traps:** CAN IDs must be **≤ 62** — a rig on ID 70 silently failed the
whole test with no output. And **`RoboRioSim` voltage is global state that survives
across tests in the same JVM**: the brownout tests leave the rail sagged, which
silently corrupted the supply-vs-stator measurement (23 A instead of 120 A) until
it reset the rail explicitly. Any test that reads
`RobotController.getBatteryVoltage()` must set it first.

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

**Research flags — RESOLVED**

- **Alerts publish to `/SmartDashboard/Alerts/`** as three `string[]` topics —
  `errors`, `warnings`, `infos` — with `.type = "Alerts"`. AdvantageScope, Elastic
  and Shuffleboard all render that with no wiring. The 2-arg constructor uses the
  default `Alerts` group; the lesson uses only that, so there is one place to look.
- **`ParentDevice.isConnected()` exists** (so `TalonFX.isConnected()` works), plus
  an `isConnected(double maxLatencySeconds)` overload. `PhotonCamera.isConnected()`
  exists too.

**What is and isn't demonstrable in sim** — this shaped the lesson:

- **`TalonFX.isConnected()` reads false for roughly the first 240 ms after
  construction, then true forever.** So the motor-disconnect alert cannot be made
  to fire at a laptop — but the boot flicker is a *great* demonstration that an
  alert is a statement about now rather than an event, and the lesson uses it that
  way.
- **`PhotonCamera.isConnected()` is honest in sim**: a camera nothing publishes
  reads false. So renaming a camera in `VisionConstants` makes a real error alert
  appear, which is the lesson's hands-on demo.
- The battery alert is fully demonstrable, because L30 already simulates the rail.

**Testing trap:** `Alert` rides on SmartDashboard's sendable mechanism, which
`IterativeRobotBase` pumps every tick. A bare JUnit test sees **empty** alert
arrays unless it calls `SmartDashboard.updateValues()` itself.

**Design:** `connected` goes in the `@AutoLog` inputs (not read ad-hoc in the
subsystem) because it is a hardware reading and a replay is far more useful when
the log knows the device was missing. Each subsystem owns the alerts about itself;
the battery alert lives in `Robot.robotPeriodic()` on the same "nothing smaller
knows about it" argument L30 used for the current total. The camera alert puts the
camera's name in the message, because there are two of them.

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

**Research flags — RESOLVED**

- **The template already ships everything.** `build.gradle` has
  `testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'`, a `test { useJUnitPlatform() }`
  block, and — crucially — `wpi.java.configureTestTasks(test)`, which is what puts
  the HAL and sim libraries on the test classpath. **No build change is needed**;
  the only missing piece is the `src/test/java/frc/robot/` directory, which the
  student creates. That is a nice surprise and the lesson says so.
- Tests are kept small on purpose: three trivial pure-logic ones and a single
  physics scenario.

**`tools/verify-lessons.sh` gained a `tests/` mapping** for this lesson:
`code/lesson-N/tests/**` now lands in `src/test/java/frc/robot/`, and the
main-source pass excludes `./tests/*` so those files don't also get copied into
`src/main`. That means `./tools/verify-lessons.sh 32 test` runs the lesson's own
tests, which is the right payoff.

**`Elevator` gained `getHeightMeters()`** so the homing test has something to
assert on. The lesson makes the point explicitly: you cannot assert on what you
cannot observe, and being unable to write a test is usually the design telling you
something.

**Both traps measured, with their symptoms:**

- **Real-time trap.** With 4 ms sleeps instead of 20, the homing test still
  *passes* its liveness checks but the final height reads **−0.34 m** — a third of
  a metre below the floor, physically impossible, and indistinguishable from a
  broken homing routine.
- **Devices outlive the test.** A second `Elevator` in a second test method throws
  **`AllocationException: Code: -1029`** — the first elevator's `DigitalInput`
  still holds DIO 0, and `HAL.shutdown()` does not release it. Hence one
  sequential scenario per subsystem, or per-test CAN IDs (≤ 62).

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

**Research flags — RESOLVED**
- Open decision 4 resolved as a contrived, student-generated scenario — see
  decision 4 above. `Line Graph` and `Odometry` are the tab names actually used
  (matching what Lessons 3, 7, and 11 already established); no new AdvantageScope
  vocabulary was needed.

**Shipped**
- The main worked example is `ElevatorConstants.kTolerance` tightened by a
  decimal-place typo (`Centimeters.of(2)` → `Centimeters.of(0.002)`), verified in
  the sandbox with a throwaway JUnit scenario: commanding `goToHeight(kScoreMid)`
  settles to a stable **~0.12 mm** residual (measured `1.1594621136490346E-4` m,
  flat across five additional seconds — a real floor, not still converging), so a
  0.02 mm tolerance never trips `atGoal()`. The fix, `Centimeters.of(0.1)` (1 mm),
  passes with a comfortable ~8.6× margin — also verified. Full timeline captured:
  a clean Motion Magic climb finishing around t=1.5s, holding flat at the error
  floor from there on.
- The bug is invisible in teleop specifically because `goToHeight` already ends
  in `.until(this::atGoal)` — a button binding just re-triggers a fresh command on
  every press, so a command that never finishes never gets noticed. It only bites
  an auto's `.andThen(...)` sequencing, which is the "worked on the bench, failed
  on the field" story the lesson is built on.
- `Elevator/HeightErrorMeters` (signed) is the one permanent code change kept
  from the lesson — added to `code/lesson-33/subsystems/Elevator.java` — closing
  the gap where the log had the decision (`AtGoal`) and the raw measurements
  (`HeightMeters`, `GoalMeters`) but not the number that explains the decision.
- The second, faster example (a BLine `lib_key` case mismatch, `"intake"` vs.
  `"Intake"`) is narrated rather than hands-on and reuses L17's own
  already-verified "logs a warning, keeps driving" behavior rather than
  re-deriving it — deliberately a different *kind* of bug (a GUI-authored path
  file, not a Java constant) so the lesson's method reads as general-purpose
  rather than tolerance-specific.
- `code/lesson-33/` ships `Constants.java` (full file, per the "last writer wins"
  snapshot convention — only `kTolerance`'s value and comment changed) and
  `subsystems/Elevator.java` (the new log line). Verified with
  `./tools/verify-lessons.sh 33`.

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
