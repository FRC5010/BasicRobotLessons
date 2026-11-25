# Plan: WPILib Tunables in the OpMode track

Status: **plan only, awaiting the user's decisions** (section 6). Nothing in the lessons, the
snapshots or the study guide has changed yet.

This is a contributor document, kept off the website by `_config.yml`'s `lesson-plan-*.md`
exclude. Nothing in it should be pasted into a lesson as it stands.

## 1. What Tunables are

WPILib 2027 alpha-8 ships a **tunables** library: values in the robot program that a dashboard
can change while the program runs. It's the reverse of `Telemetry`. Telemetry sends values out
under `/Telemetry`; tunables are published under `/Tunables`, and a dashboard can write them
back.

Read from source, `tunables-java-2027.0.0-alpha-8-sources.jar` and
`wpilibj-java-2027.0.0-alpha-8-sources.jar`, both from `frcmaven.wpi.edu/artifactory/release`:

- **Package and entry point.** The package is `org.wpilib.tunable`, a separate artifact,
  `org.wpilib.tunables:tunables-java`, already on the course's classpath through GradleRIO. The
  entry point is `Tunables`, with `addDouble`, `addInt`, `addLong`, `addFloat`, `addBoolean`,
  `addValue(name, T)`, `publish(name, tunable)`, `publishDouble(name, getter, setter)` and the
  like, and `getTable(name)` for a folder.
- **Typed classes.** `TunableDouble` and its siblings implement `DoubleSupplier` and
  `DoubleConsumer` (checked with `javap`), so a tunable can be handed straight to anything that
  takes a supplier.
- **Options.** `TunableConfig` and `TunableOption` set:
  - `IMMUTABLE`: the dashboard can't write it.
  - `ROBUST`: separate `/value` and `/tune` topics, with the value echoed back.
  - `onTune(Runnable)`: a callback when a dashboard write is applied.
  - `ALWAYS_GET` or `GET_ON_CHANGE`: how often the backend polls the value.
  - Free-form JSON properties.
- **The robot sets it up.** `RobotBase`'s constructor does three things:
  - registers a `NetworkTablesTunableBackend` at `/Tunables`;
  - registers a type handler so a `Measure` can be a tunable;
  - routes tunable warnings to an `Alert` group named `Tunables`.
- **Applied once a tick.** Both loops call `TunableRegistry.update()` once a tick, immediately
  after `robotPeriodic()` and before `simulationPeriodic()`. That's WPILib's `OpModeRobot` and
  AdvantageKit's `LoggedOpModeRobot` (alpha-7 jar), read with `javap -c`. So tunables work in
  the course's `Robot` from Lesson 13 on with no extra call.
- **Thread safety.** Tunables aren't thread-safe; `TunableRegistry.withUpdateMutex` is the
  documented way to touch one from another thread. The course never needs it.

**Measured** with a JUnit probe on the Lesson 33 state, alpha-8. It built a bare `RobotBase`
after `HAL.initialize()`, and used a second NetworkTables publisher on the same instance to
stand in for a dashboard. The probe is not kept.

| What | Result |
|---|---|
| `Tunables.addDouble("Probe/kP", 20.0)` | topic `/Tunables/Probe/kP`, type `double`, properties `{"mutable":true}`, value 20.0 |
| A dashboard write of 25.0 | `get()` still 20.0 until `TunableRegistry.update()`, then 25.0 |
| `onTune` callback | not called on publish; called once per applied write; not called on a tick with no write, or for a write of the same value |
| Code calls `set(30.0)` | the topic reads 30.0 after the next update |
| `TunableOption.IMMUTABLE` | a dashboard write of 99.0 is ignored; properties `{"mutable":false}` |
| `Tunables.addValue("Probe/Tolerance", Centimeters.of(2))` | published as **0.02**, in base units (metres), with properties `{"mutable":true,"unit":"m"}`; a write of 0.05 reads back as 5 cm |
| A second `addDouble` with a name already in use | doesn't throw. A `Tunables` alert goes up ("NetworkTables tunable '/Tunables/Probe/kP' already exists"), dashboard writes keep going to the **first** object, and the second never hears one. |

**Not yet checked** (phase 1 below):
- **SimGUI:** whether it can *edit* a `/Tunables` value, in its NetworkTables View, and how.
- **AdvantageScope:** whether 27.0.0-alpha-6 can edit one.
- **Replay:** what a replay does with a value that was tuned during the recording.
- **Real robot:** how long re-applying `Slot0Configs` blocks on a real TalonFX. Phoenix's
  `apply(Slot0Configs)` and `apply(Slot0Configs, timeout)` exist (`javap`).

## 2. What it means for this course

Four things shape where and how tunables fit.

1. **Create a tunable in something built once.** An opmode is rebuilt after every Disable. A
   tunable made in its constructor would be refused on the second build, with an alert, and the
   new opmode's copy would never hear a dashboard write. That's the duplicate-name result above.
   `Robot` and the mechanism classes are built once, so that's where tunables belong. It's a
   direct use of the Opmodes page's "what lives in `Robot`" rule.
2. **A tunable is an input, and AdvantageKit doesn't record it.** The value comes in through
   NetworkTables, not through `processInputs`. AdvantageKit's own `LoggedNetworkNumber` and
   friends do record dashboard values as inputs, but they know nothing about WPILib's tunables.
   What that means depends on where the value is used. This is reasoned from the source and not
   yet measured; phase 1 checks it.
   - **A value used in the motor's firmware** (an elevator's `Slot0` gains) doesn't affect a
     replay. In replay the IO is empty, so the gains go nowhere. What the gains changed, the
     height, is a recorded input.
   - **A value used in the robot's own code** (`HeadingConstants.kP` in `turnToHeading`, a
     tolerance in `atGoal()`) would make a replay diverge from the recording. The replay starts
     from the initial value, and never sees the dashboard writes.
   - **The course's existing fix applies.** Read the tunable into an `@AutoLog` bundle and pass
     it through `processInputs`, like the battery voltage (Lesson 29) and the starting placement
     (Lesson 16).
3. **A tuned value isn't saved.** It's back to its initial value after a restart, so the habit
   to teach is "copy what you found back into `Constants.java`". That keeps `Constants.java` the
   source of truth, which the update script's `merge_constants.py` relies on. So no tool change
   is needed if each tunable's initial value comes from a constant.
4. **Firmware gains need re-applying.** Changing a number in a `TunableDouble` doesn't change
   the TalonFX. The `onTune` callback has to apply a new `Slot0Configs`. That makes Lesson 12's
   "the motor runs its own loop" visible: the gain lives in the motor, so the code has to send it
   there.

## 3. Where to introduce them: options

| Option | Where | For it | Against it |
|---|---|---|---|
| **A (recommended)** | Lesson 18 §10, "Reading the gains off a graph" | The whole section is a tuning procedure (`kG`, then `kV`, `kA`, `kP`) read off a live graph, and it's where restarting to try each value hurts most. Firmware gains make the `onTune` re-apply step meaningful. Replay isn't affected (point 2, firmware case). | After Lesson 13, so the lesson must say why a firmware gain is replay-safe and a software value isn't. Ripples `Elevator`/`ElevatorIO*` through snapshots 18–33. |
| B | Lesson 5 §5, "Bind it and tune `kP`" | The first tuning the student does; a software `kP` read each tick needs only `.get()`; before replay, so no caveat. | Lesson 5 already carries P control, clamp, CANcoder and priming. The software P loop retires in Lesson 12, so the tunable goes with it. Ripples through `DriveModule`/`SwerveModule` 5–12. |
| C | A new aside, `aside-tunables.md`, readable after Lesson 18 | No snapshot ripple and no change to the numbered sequence; can cover software and firmware values and the replay rule in one place. | Optional, so many students won't meet it; an aside can't change later lessons' code. |

**Recommendation: A, plus a short mention in Lesson 5's Try It.** Lesson 18 is where the tool
pays for itself, and its firmware gains make the replay story simple. A Try It in Lesson 5
("make `kP` a tunable and tune it without restarting") lets a curious student meet it early. It
adds no new concept to the walkthrough and no change to the snapshots, since Try Its aren't
checked against snapshots.

### Option A, sketched

**Lesson 18 §10** gains a subsection, "Tune it live". All of this is planned, not checked yet:

1. **`ElevatorIO` gets one more command**, `setGains(double kG, double kV, double kA, double
   kP)`, a `default` that does nothing. That way the replay IO and any test double are still
   empty.
2. **`ElevatorIOTalonFX` implements it** by building a `Slot0Configs`, with `GravityType` kept
   as `Elevator_Static`, and calling `m_motor.getConfigurator().apply(slot0)`. Applying just the
   slot leaves the soft limits and current limits alone. That fits CLAUDE.md's "applying a
   configuration sets every setting it holds" note: a `Slot0Configs` holds only the slot. This
   still needs a check, in phase 1.
3. **`Elevator` builds four `TunableDouble`s** in a field initializer, named
   `Elevator/Gains/kG` and so on, each starting from its `ElevatorConstants` value. All four use
   `TunableConfig.withOnTune(this::applyGains)`, and `applyGains()` calls `m_io.setGains(...)`
   with all four `get()`s.
4. **The text teaches three habits:**
   - change one gain at a time, in the section's order;
   - watch Figure 18.2's lower panel;
   - copy the final numbers back into `Constants.java`.
5. **A callout explains replay:** "a gain that lives in the motor doesn't change a replay; a
   number your own code uses would". It points forward to the study guide entry.
6. **A Try It:** make `kTolerance` tunable, and decide whether it needs recording as an input
   (it does: `atGoal()` is code). That sets up Lesson 32 nicely, since Lesson 32's bug is that
   same tolerance.

**What it touches:**
- **Snapshots:** `code/v3/lesson-18/subsystems/{Elevator,ElevatorIO,ElevatorIOTalonFX}.java`,
  and every later whole-file copy of them (19–33). Lesson 17's snapshot gets NEXT LESSON markers
  if any of those files exist there. They don't (the elevator arrives in 18), so none needed.
- **Lesson text:** every "type this" block in Lessons 18–33 that shows those files gains or
  keeps the new lines. The lesson-code checker will list each one.
- **Not touched:** `Constants.java`, so `merge_constants.py` needs nothing.
- **Lesson 33:** its SysId flow uses `Flywheel`, not the elevator, so it's unaffected. Its §6–§7
  "check the result" could later use a tunable to try a fitted gain live; that's not part of
  this plan.

## 4. The study guide entry

A third page in **FRC: logging and replay**, `frc-logging/03-tunables.md`, "Tunables: changing
values while the robot runs". It's the mirror of the logging page, and its replay rule belongs
next to the replay page. The group's README line becomes "What the robot records, where each
kind of record lands, how a recorded match is replayed, and how a dashboard changes a value
back."

Sections (two quizzes each, the usual template):

1. **A value a dashboard can change:** `Tunables.addDouble`, `/Tunables/<name>`, `get()`, and
   that a write is applied once a tick, after `robotPeriodic()`.
2. **Where to make one:** in something built once, and what a duplicate does.
3. **Reacting to a change:** `onTune`, and why firmware gains must be sent to the motor.
4. **Measures:** `addValue` with a `Distance`, published in base units with a `unit` property.
5. **Locking one down:** `IMMUTABLE`, and when a value shouldn't be dashboard-writable.
6. **Tuning and replay:** firmware values against code values, and recording a code value as an
   input.
7. **Write it back:** a tuned value is gone on restart; `Constants.java` stays the truth.

Examples would come from the Lesson 18 snapshot once option A lands (source-tagged as usual).
Until then the page can't be written, because the checker needs real code to tag.

## 5. Claims and tests

New claims, in `tools/claims/registry/wpilib.toml`:

- **Behaviour, each with a JUnit test** in `tools/claims/java/claims/WpilibApiTest.java` (the
  probe above, kept this time):
  - `wpilib.tunables-publish-under-tunables`
  - `wpilib.tunables-applied-on-update`
  - `wpilib.tunables-ontune-once-per-change`
  - `wpilib.tunables-immutable`
  - `wpilib.tunables-measure-base-units`
  - `wpilib.tunables-duplicate-name-alert`
- **Read with `javap`, method BYTECODE:** `wpilib.tunables-update-after-robot-periodic`, which
  covers both `OpModeRobot` and `LoggedOpModeRobot`.
- **Number claims** if Lesson 18's live-tuning run quotes any figures.

Each test gets broken once on purpose to see it fail by its claim id, as usual.

## 6. Decisions for the user

1. **Placement:**
   - A (Lesson 18 §10, plus a Lesson 5 Try It), recommended;
   - B (Lesson 5);
   - C (an aside only).
2. **Which values become tunable in Lesson 18:** all four gains (recommended), or `kP` and `kG`
   only.
3. **Competition safety:** on a real robot any dashboard can write a mutable tunable during a
   match.
   - Option (a): leave them mutable, and say so.
   - Option (b): make them `IMMUTABLE` unless a constant such as `kTuningMode` is true.
   - Option (c): only create them in simulation.
   - Recommended: (b). It's one line, and it teaches the option.
4. **The guide page:** in the logging group, as above (recommended), or in Tools.

## 7. Phases, once decided

1. **Verify:**
   - SimGUI editing a `/Tunables` value, under Xvfb, with a screenshot for a figure.
   - The replay behaviour for a firmware gain and a code value, measured with a recording and
     a replay.
   - That applying `Slot0Configs` keeps the soft and current limits.
   - Keep the claim tests.
2. **Lesson 18:**
   - Snapshot changes, then the ripple through 19–33.
   - The lesson's §10 text, figure, callout and Try It.
   - Markers checked, lesson code checked, `verify-lessons-v3.sh` 18 and 33.
   - Lesson 5's Try It.
3. **The guide page,** its claims and quizzes.
4. **CLAUDE.md:** a Tunables block with the measured facts.
