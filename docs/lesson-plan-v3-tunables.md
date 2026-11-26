# Plan: WPILib Tunables in the OpMode track

Status: **decided 2026-11-25** (section 6a); two questions left on scope and replay
(section 6b). Nothing in the lessons, the snapshots or the study guide has changed yet.

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

**SimGUI can edit one (checked 2026-11-25, alpha-8, under Xvfb).** A Lesson 5 sandbox published
`Probe/kP` at 0.0005 and printed its `get()` whenever it changed. In the **NetworkTables**
window, under **Transitory Values**, a **Tunables** folder sits beside **Telemetry**. Each
double is an editable box with its type, here `0.000500 double`. Double-click, type `0.00003`,
press Enter: the robot printed `kP now 3.0E-5`, and the box kept the new value. Read from
glass's `NetworkTables.cpp` at `v2027.0.0-alpha-8`: a double is drawn with an input box that
publishes the typed value, unless the view is flagged read-only. Screenshots are kept in the
working files.

**Not yet checked** (phase 1 below):
- **AdvantageScope:** whether 27.0.0-alpha-6 can edit one. The user has AdvantageScope; this
  container can't run it.
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

## 6a. Decided (user, 2026-11-25)

1. **Placement:**
   - **Lesson 18** is the main introduction for firmware gains.
   - **Lesson 5** gets a **full usage introduction** in its walkthrough, not just a Try It. It's
     the first time the student tunes, and its `kP` is read by the code each tick.
2. **Tunables are the course's main way of tuning:** *any value that can be tuned* becomes a
   tunable, in the lesson that introduces it. This supersedes option A's "four elevator gains".
   The inventory below lists the candidates; where the line falls is question 6b.1.
3. **Competition safety:** tunables are `IMMUTABLE` unless a `kTuningMode` constant is true,
   **introduced in Lesson 18**. Lessons 5–17 run only in simulation, so they need no mode.
4. **The guide page goes in the logging group**, as section 4 describes.

### Inventory: values the lessons tune, by the lesson that introduces them

"Firmware" means the value is applied to a motor's configuration. A replay never runs the
motors, so tuning it doesn't change a replay. "Code" means the robot's own code reads it, so a
tuned value changes what a replay works out (point 2 in section 2).

| Lesson | Values | Where used |
|---|---|---|
| 5 | `SteerConstants.kP` | code (retires in 12) |
| 8 | `HeadingConstants.kP` | code (`turnToHeading`, every lesson after) |
| 12 | `kSteerKP`, `kDriveKV`, `kDriveKP` | firmware |
| 17 | `kTranslationP`, `kRotationP`, `kCrossTrackP` | code (B-Line's `PIDController`s) |
| 18 | `kElevatorKG`, `KV`, `KA`, `KP`; Motion Magic cruise and acceleration | firmware |
| 18 | elevator `kTolerance` | code (`atGoal()`) |
| 20 | `kArmKG`, `KV`, `KA`, `KP`; arm Motion Magic limits | firmware |
| 20 | arm `kTolerance` | code |
| 26 | `kAlignP`, `kAlignThetaP`, the three tolerances, `kTravelLimits`, `kApproachLimits`, `kTurnLimits`, `kHandoffDistance`, `kHandoffSpeed` | code |
| 27 | `kAimP`, `kAimTolerance` | code |
| 28 | `kFlywheelKS`, `KV`, `KA`, `KP` | firmware |
| 28 | flywheel `kTolerance`, `kIdleSpeed` | code |
| 29 | supply and stator current limits | firmware |
| 30 | `kLowBatteryVoltage`, `kBrownoutVoltage` | code |

Not tunable, because they describe the robot rather than how it should behave:
- CAN IDs, gear ratios, wheel and drum sizes, masses, magnet offsets;
- field positions and tag IDs;
- B-Line's path constraints, which live in the path JSON files, not in Java.

**Answered 2026-11-25:** 6b.1 is **(c), the whole inventory**; 6b.2 is **(i), don't record,
and explain**.

## 6c. Design rules for every lesson

1. **The constant stays the truth.** Each tunable starts from its `Constants.java` value. Once
   the student finds a better number, they copy it back there. So `Constants.java` and
   `merge_constants.py` are unchanged in kind: no constant is removed or retyped.
2. **Make a tunable in something built once:** a mechanism, `Drivetrain`, `Robot`, or a
   `static` field. Never in an opmode (the duplicate-name result).
3. **One knob per value.** When several objects share a value, they share one tunable. The four
   `SwerveModule`s' steering `kP` becomes a `static` field from Lesson 7, which is the moment the
   one module becomes four.
4. **Names are log-key shaped**, `<Owner>/<What>`: `DriveModule/SteerKP`, `Drivetrain/HeadingKP`,
   `Elevator/KG`, `Elevator/Tolerance`.
5. **Code values are read where they're used**, with `get()`, every time, never copied into a
   field at construction.
6. **Firmware values need re-applying.** `onTune` builds just the affected config group
   (`Slot0Configs`, `MotionMagicConfigs`, `CurrentLimitsConfigs`) and applies it.
7. **Measures stay measures.** A tolerance is `Tunables.addValue(name, kTolerance)`. It shows in
   SimGUI in base units (metres, radians, metres per second), and the lesson says so.
8. **A profile's limits** are two tunables, speed and acceleration. `onTune` rebuilds the
   `TrapezoidProfile.Constraints` and hands them to the controller.
9. **Lesson 18 introduces `kTuningMode`** and a small `Tuning` helper class whose methods make
   every tunable `IMMUTABLE` unless the mode is on. Lesson 18 then switches the earlier tunables
   still in use to the helper: heading `kP`, the Lesson 12 drive and steer gains, and B-Line's
   three gains.
10. **Replay (6b.2 (i)).** Lesson 18's callout explains it:
    - a firmware value never changes a replay;
    - a code value changes it only if it was tuned during the recording;
    - with `kTuningMode` off in a match, nothing can be tuned, so match logs replay exactly.

## 6d. Phases

1. **Claims:** `wpilib.tunables-*` with JUnit tests, kept from the probe.
2. **Lesson 5:** the full introduction.
   - `DriveModule` reads `kP` from a tunable.
   - §5 becomes "tune it live in SimGUI, then copy the number back", with a new figure: the
     Tunables folder in SimGUI's NetworkTables window.
   - New robot concept: tunables.
   - Snapshot 4 gets markers; snapshot 6 carries the change.
3. **Lessons 7 (static shared steering `kP`), 8, 12 and 17**, one at a time.
4. **Lesson 18:** `kTuningMode`, the `Tuning` helper, firmware gains with `onTune`, Motion Magic
   limits, the tolerance, and the replay callout. Lesson 17's snapshot gets markers.
5. **Lessons 20, 26, 27, 28, 29 and 30**, one at a time, each rippling forward.
6. **The study guide page** in the logging group, then a CLAUDE.md block.

### Progress

- **2026-11-25, phases 1–2 and Lesson 7 done.**
  - **Claims:** four new wpilib claims and one wpilib-tools claim. `TunablesApiTest` holds the
    three behaviour tests, each broken once on purpose to see it fail by its claim id.
  - **Lesson 5:** §5's "Tune it while it runs", with Figure 5.3 (a SimGUI screenshot,
    `tools/figures/05-simgui-tunable.py`); the wrap figure is now 5.4.
  - **Lesson 7:** the steering gain becomes a `static` field, `SwerveModule/SteerKP`, shared by
    the four modules (snapshots 7–11). Retuning happens in SimGUI.
  - **Lesson 12:** deletes the field along with `clamp`.
  - **Debugger aside:** its watch expressions use `m_steerKP.get() * error`. Figure D.1 (the
    user's screenshot) still shows the older `SteerConstants.kP * error` line.
- **2026-11-26, Lessons 8, 12, 13, 17 and 18 done.**
  - **Lesson 8:** `Drivetrain/HeadingKP`, read in `turnToHeading`.
  - **Lesson 12:** the `Tuning` helper; `Drivetrain/SteerKP`, `DriveKV`, `DriveKP`, sent to all
    four modules with a `Slot0Configs` through `onTune`. Lesson 13 moves the sending into
    `ModuleIO` (probe: a `DriveKV` write reached the front-left drive motor).
  - **Lesson 17:** `Tuning.property` over the three B-Line `PIDController`s (`Paths/...`).
  - **Lesson 18:** `kTuningMode` in `Constants` (through `Tuning.config()`'s `withMutable`), the
    generic `Tuning.value` for measures, and seven elevator tunables: `Elevator/KG`, `KV`, `KA`,
    `KP` (one `Slot0Configs`, `GravityType` included), `MaxVelocity` and `MaxAcceleration` (a
    `MotionMagicConfigs`), and `Tolerance` (read in `atGoal()`). The text builds the elevator
    first (sections 5 to 9 unchanged) and makes it tunable in a new section 10, "Tune it while it
    runs", with the replay callout; the graph section is now 11. Probes: a `KG` write reached the
    motor with `kV`, the gravity type and the gear ratio kept, and `MaxVelocity` 0.5 set the
    cruise to 3.13 rot/s; zeroing `KG` live sagged the hold to 1.52–1.56 mm within a second
    (claim `l18.live-kg-zero-sag`). New claims `wpilib.tunables-immutable`,
    `-measure-base-units` (tests) and `-no-backend-in-tests` (Lesson 31's note: a test prints a
    warning per tunable). Lesson 32's `atGoal` illustration reads `m_tolerance.get()`.
- **Lesson 20 (2026-11-26):** the arm is built with its seven tunables from the start (`Arm/KG`,
  `KV`, `KA`, `KP` with `Arm_Cosine`, `MaxVelocity`, `MaxAcceleration`, `Tolerance`), in the
  `Create` blocks of sections 4, 5 and 7; Try Its 4 and 5 use SimGUI. Probe: angle measures show
  in radians (0.0349 for 2°, 3.14 for 180°/s), and a write reached the pivot with `Arm_Cosine`,
  the soft limits and the gear ratio kept.
- **Lesson 26 (2026-11-26):** twelve tunables under `Drivetrain/ToPose/`. `AlignP` and
  `AlignThetaP` are `Tuning.property` over the controllers' `getP`/`setP`; the three tolerances
  are `Tuning.value`s whose `onTune` calls `setTolerance`; the six speed and acceleration limits
  and `HandoffDistance`/`HandoffSpeed` are read as each stage starts, through two overloaded
  `limits(speed, accel)` helpers (the heading controller now gets `setConstraints` in
  `startStage` too). The three `TrapezoidProfile.Constraints` constants are gone from
  `PathConstants` (26–32), since nothing would read them. `kCrossTrackP` stays a constant here
  (its tunable is B-Line's controller), and the lesson says so. Try Its 1, 3 and 4 use SimGUI.
  Check: `Fig26TwoStage` on the new code and on the old (a worktree of HEAD) both hand over at
  1.80 s, first read `atGoal` at 3.32–3.34 s and end at (5.006, 4.004, 90.0°), so nothing
  changed. (The kept `26-two-stage-speed.csv` reads 3.36 s; it predates other changes.)
- **Lesson 27 (2026-11-26):** `Aim/P` and `Aim/Tolerance`, `static` fields in the static `Aim`
  class. Probe: they're published only on the first call into `Aim`, not when `Robot` is built
  (claim `l27.aim-tunables-on-first-use`); the lesson says so. Try It 3 uses SimGUI.
- **Lesson 28 (2026-11-26):** `Flywheel/KS`, `KV`, `KA`, `KP` (a `Slot0Configs` through a new
  `FlywheelIO.setGains`), `Tolerance` and `IdleSpeed`, from the `Create` blocks. `spinUp` gained
  a `Supplier<AngularVelocity>` overload and `idle()` passes the tunable itself (a `Tunable` is
  a `Supplier`, claim `wpilib.tunable-is-supplier`), because the default command is built once.
  Probe: writing `IdleSpeed` moved the idling wheel from 30.4 to 20.4 rot/s. **Speeds show in
  rad/s** (idle 188.5, tolerance 9.42); the lesson says to multiply by 2π. Flagged for the user:
  a rot/s number tunable would read better but breaks rule 7.
- **Lessons 29 and 30 (2026-11-26):** the power budget lives in `Robot`, under `Power/`:
  `StatorLimit` (shared by every mechanism motor), `ElevatorSupplyLimit`, `ArmPivotSupplyLimit`,
  `ArmRollerSupplyLimit`, `FlywheelSupplyLimit` (one `onTune`, `sendCurrentLimits`, calls each
  mechanism's new `setCurrentLimits`, which sends a `CurrentLimitsConfigs` through new IO
  defaults), and `BrownoutVoltage`; Lesson 30 adds `LowBatteryVoltage`. Why `Robot`: Phoenix
  takes a motor's stator and supply limits as one group, and the stator cap is shared. Lesson
  29's text adds section 8, "Tune the budget while it runs", after the experiments; Lesson 28's
  snapshots carry the markers. Probe: a `StatorLimit` write of 60 A and an
  `ElevatorSupplyLimit` write of 25 A reached IDs 20-23 with everything else kept (claim
  `l29.budget-tunables-reach-motors`); amps and volts are base units, so they read as typed.
- **Study guide and CLAUDE.md (2026-11-26):** `frc-logging/03-tunables.md` (six sections, twelve quizzes, source-tagged examples) and a CLAUDE.md block. The rollout is done.

## 6b. Questions left for the user (answered above)

1. **Where the line falls:**
   - (a) gains only (every `kP`/`kG`/`kV`/`kA`/`kS`);
   - (b) gains, tolerances and motion limits: everything a lesson asks the student to adjust;
   - (c) the whole inventory, current limits and battery thresholds included.
2. **Replay of code values (Lessons 13 onward):**
   - (i) **Don't record them.** With `kTuningMode` off, nothing can change them, so a match log
     replays exactly; only a tuning session's replay would differ, and the lessons say so.
     Simplest, and no new machinery.
   - (ii) **Record them as inputs.** One small helper class, written once in Lesson 18, puts
     each code-side tunable's value through `processInputs` every tick, so every replay is
     exact. More to teach and to type.

## 6. Decisions for the user (the original questions, answered in 6a)

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
