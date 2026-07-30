# Lesson plan: 16–22

A working plan for the next stretch of the course. **This is a contributor
document, not lesson content** — it lives beside `docs/lessons/`, never inside
it, and nothing here should be pasted into a lesson as-is.

Written one lesson at a time, reviewed between each, same as the voice-rewrite
pass. Lessons 16–18 are done; 19–22 are outlines waiting to be drafted.

---

## Status

| # | Working title | Builds on | 3rd-party library | Status |
|---|---|---|---|---|
| 16 | maple-sim — a world to drive in | L13 (IO layers), L11 (field views) | `maple-sim` | **Done** — [lesson](lessons/16-maple-sim-field.md), [code](../code/lesson-16/) |
| 17 | B-Line autos: waypoints and trajectories | L9 (autos), L10 (kinematics), L14 (Localizer) | `BLine-Lib` | **Done** — [lesson](lessons/17-bline-autos.md), [code](../code/lesson-17/) |
| 18 | Scoring elevator | L13 (IO spine), L12 (configs/control requests) | none | **Done** — [lesson](lessons/18-elevator.md), [code](../code/lesson-18/) |
| 19 | Mechanism2d for the elevator | L18, L11 (`putData` precedent) | none | Outline |
| 20 | Intake arm (−20°…180°) + roller | L18/L19, L12 | none | Outline |
| 21 | Limit sensors / current sensing | L18, L20 | none | Outline |
| 22 | Light sensors for game-piece handoff | L20, L21 | none | Outline |

16–17 finish the drivetrain half of the course (simulation realism, then real
path following). 18–22 open the mechanisms half — the "second mechanism" Lesson
14's epilogue promised — ending with two mechanisms coordinating through
sensors. That's a real FRC build order: chassis first, scoring second.

---

## Open decisions

### 1. maple-sim integration depth — RESOLVED (deep)

Chose the physics-owning integration over a visualization bolt-on, and built it
that way in Lesson 16. A shallow version (feed maple-sim your own odometry pose
just to draw obstacles) would have been a one-way puppet: nothing would actually
*stop* the chassis at a wall, because maple-sim wouldn't be authoritative over
position. "Field and obstacles" needs obstacles that push back.

**What that means architecturally, for anyone editing 17+:**

- `SwerveDriveSimulation` is a `private static final` field on `Drivetrain`,
  built by `createDriveSim()`, **null outside `SIM` mode**. Only the `SIM` arms
  of the two mode switches read it. `SimulatedArena.getInstance()` *throws* on a
  real robot, so the null guard is load-bearing, not defensive habit.
- `ModuleIOSim` still `extends ModuleIOTalonFX`. Phoenix's simulated firmware
  still runs Lesson 12's closed loops. maple-sim drives it through a
  `SimulatedMotorController` callback that trades our applied voltage for its
  motion — see the appendix for the exact contract.
- `GyroIOSim` now wraps maple-sim's `GyroSimulation`; `GyroIO.setSimRotationRate`
  is deleted, along with both `Drivetrain` call sites.
- The arena is stepped **once**, in `Robot.simulationPeriodic()` — the one
  deliberate exception to Lesson 13's "sim code lives inside IO
  implementations," because the arena is shared world state, not one device's
  pretend hardware.
- Nothing above the IO boundary changed: `SwerveModule`, `Drivetrain`'s
  commands, `Localizer`, kinematics, autos, and every log key are untouched.

### 2. Elevator/arm control style — RESOLVED (Motion Magic)

**Decided: onboard Phoenix 6 `MotionMagicVoltage` + `Slot0.kG`**, not WPILib's
`TrapezoidProfile` / `ProfiledPIDController` / `ElevatorFeedforward` /
`ArmFeedforward`.

Lesson 12 already spent a whole lesson moving control *onto* the TalonFX and
teaching the `TalonFXConfiguration` / `Slot0` / control-request vocabulary.
Motion Magic and gravity-type gains are the next control request in that family
(`Slot0.kG` with `GravityTypeValue.Elevator_Static` / `Arm_Cosine`), so 18 and
20 read as "one more `Slot0` gain" rather than a second, competing control
framework.

The tradeoff, named once here so lessons don't have to re-litigate it: this ties
the mechanisms lessons to CTRE hardware the same way the drivetrain already is,
instead of teaching the vendor-agnostic WPILib profiling classes. Given the
course is TalonFX-first throughout, that's the consistent choice. Lessons 18–22
may now all assume it.

### Conventions applied without asking

- **Season-generic where possible.** Lesson 15 aliased
  `AprilTagFields.kDefaultField` rather than naming a season; Lesson 16 leans on
  maple-sim's own current-season default arena. Keep that habit — but note
  maple-sim's game-piece *class names* are season-specific by nature
  (`RebuiltFuelOnField`, type string `"Fuel"`), so those will need a pass each
  new game.
- **New mechanisms get their own IO layer** — `ElevatorIO` / `ElevatorIOTalonFX`
  / `ElevatorIOSim`, `ArmIO` / … — matching `ModuleIO` exactly. Lesson 13 made
  that the house style; nothing else fits.
- **Treat both new libraries as young.** maple-sim's docs carry a beta notice and
  its published examples have already drifted from its source (see appendix);
  BLine's announcement thread is mid-season with active iteration. Verify every
  class and method name against current source/Javadoc when drafting — sharper
  than the standing CTRE caveat in the README. This is not hypothetical: the
  BLine docs' `EventTrigger` shape was wrong (it's a `FollowPath` static), and
  both PhotonVision's and maple-sim's advertised install URLs were broken in
  different ways at the same time.
- **Pin vendordeps to WPILib's marketplace, not the vendor's own link.**
  `https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/<YEAR>/<name>-<version>.json`
  is one immutable file per version; `<YEAR>_metadata.json` lists what exists.
  Vendors' "latest" links drift, and two of the three third-party libraries in
  this course were actively broken through theirs.

---

## Repo conventions (discovered while building 16)

- **`code/lesson-N/`** holds *only the files that lesson changes*, mirroring the
  `frc/robot` package layout: root classes at `code/lesson-N/`, subsystems at
  `code/lesson-N/subsystems/`, commands at `code/lesson-N/commands/`, and — from
  Lesson 17 — deploy assets at `code/lesson-N/deploy/`, which maps to
  `src/main/deploy/`, *not* into the Java tree.
- **Style splits by directory.** Root files (`Constants`, `Robot`,
  `RobotContainer`) carry the WPILib copyright header and 2-space indent.
  `subsystems/` files have no header, use 4-space indent, and open with a class
  Javadoc. Lesson *markdown* snippets use 2-space throughout regardless — that
  mismatch is pre-existing and consistent.
- **`code/ActualLessons/`** is **the students' starting point**, held at pristine
  WPILib Command Robot template state — byte-identical to the upstream template
  (verified against `allwpilib` `v2026.2.1`
  `wpilibjExamples/.../templates/commandbased/`, whose only difference is the
  package name the project generator rewrites), with only `WPILibNewCommands` in
  `vendordeps/`. Phoenix 6 is installed by Lesson 1 and everything else later, so
  none of it belongs here. **Keep it at baseline**: don't roll lesson work in, and
  don't pre-install a vendordep a lesson hasn't reached.

## Compile-verifying lesson code

**`./tools/verify-lessons.sh [N] [test]`** does the whole thing: copies
`ActualLessons` to a scratch sandbox (never touching the repo copy), fetches
pinned vendordeps, rolls `code/lesson-0` … `code/lesson-N` forward in order,
replays the deletions the lessons instruct, appends Lesson 13's AdvantageKit
`build.gradle` blocks, and runs Gradle. First run fills the Gradle cache (a few
minutes); later runs are seconds.

This is the expected practice when drafting or editing a lesson — run the lesson
you touched and the highest one. Because the baseline is clean and *every*
intermediate stopping point currently compiles, a failure is a real result rather
than pre-existing noise.

For anything with runtime behavior — a JSON schema, a deprecated-API replacement,
a config with validation — drop a throwaway JUnit test into the sandbox's
`src/test/java/` and re-run with `test`. That has caught things a compile never
would: BLine's docs described an `EventTrigger` class you construct, when it's
actually a `FollowPath` static, and reading its **sources jar** off JitPack was
what settled it. Prefer a library's sources jar over its docs generally.

Verified state as of Lesson 17: **the whole course, lessons 0–17, compiles with
zero warnings** — against PhotonLib `v2026.3.4`, maple-sim `0.4.0-beta`,
AdvantageKit `26.0.2`, BLine-Lib `v0.9.1`, Phoenix 6 `26.3.0`.

Beyond compiling, two runtime checks worth keeping:

- Lesson 16's `SwerveModuleSimulationConfig` / `DriveTrainSimulationConfig` are
  built in a JUnit test, which exercises maple-sim's **runtime bounds checks** —
  they *throw* on an out-of-range constant. The course's numbers pass (45 kg
  robot, 2″ wheel radius, COLSONS cof 0.899). No HAL or `SimulatedArena` needed,
  so it's cheap to re-run.
- Lesson 17's path JSON and `config.json` load through BLine's real parser, and
  `AprilTagFieldLayout.loadField` returns 32 tags on the 2026 Rebuilt field.
- Lesson 18's elevator closed loop is exercised end to end in sim (HAL up,
  `Unmanaged.feedEnable` each tick, ~400 ticks): it converges on the commanded
  height and its steady-state voltage equals `kG`. That test is what caught a
  guessed `kElevatorKG = 0.3` — the elevator still *converged*, because `kP`
  silently made up the difference, which is precisely the failure the lesson warns
  about. The physically correct value is `mass × g × drumRadius / gearRatio`
  through the motor's torque constant ≈ **0.18 V**, and with it `kP` has nothing
  left to do. **When a lesson introduces a feedforward gain, verify the gain, not
  just that the mechanism arrives.**

**Pin vendordeps to a season-specific URL.** WPILib's own vendordep marketplace
keeps one immutable file per library *per version*, which is the right thing to
cite in a lesson:

```
https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/<YEAR>/<name>-<version>.json
```

The index of what's available for a year is `<YEAR>_metadata.json` in the same
repo. Prefer these over a vendor's own "latest" link — see the PhotonLib finding
for what a floating link does to an offseason build.

## Findings from the first verification pass

Real defects surfaced by actually compiling. Fixed:

- **`code/lesson-16/RobotContainer.java` had regressed Lesson 15's
  construction-order fix** — it rebuilt the two cameras as field initializers
  capturing `() -> m_localizer.getPose()` *above* `m_localizer`'s own
  declaration. Lesson 16's markdown was fine (it only adds the `resetPose`
  block); the snapshot had been copied from a pre-fix Lesson 15. Rebuilt on the
  corrected version.
- **`AprilTagFields.loadAprilTagLayoutField()` is deprecated for removal** in
  WPILib 2026 — was the only compile warning in the whole tree. Replaced
  everywhere with `AprilTagFieldLayout.loadField(AprilTagFields.kDefaultField)`
  (`lesson-15`/`16`/`17` `Constants.java` plus Lesson 15's section 3), confirmed
  working at runtime: loads 32 tags on the 2026 Rebuilt field.
- **Lesson 15's PhotonLib install URL was season-wrong.** The
  `photonlib-json/1.0/photonlib-json-1.0.json` artifact PhotonVision's docs hand
  out is a *floating* pointer — it now serves `v2027.0.0-alpha-2`, which carries a
  `wpilibYear` key instead of `frcYear`, so GradleRIO 2026 refuses to configure at
  all: *"Vendor Dependency photonlib has invalid year null."* Repointed at
  WPILib's pinned marketplace copy of **v2026.3.4**
  (`.../vendor-json-repo/main/2026/photonlib-v2026.3.4.json`), which is immutable,
  and added a callout explaining the moving-link hazard generally.

Still open:

- Nothing blocking. Every lesson 0–17 compiles at every intermediate stopping
  point. The remaining checklist items are content polish, not defects.

- **`code/ActualLessons` was frozen mid-Lesson-2 and did not compile.** Its
  `DriveModule.java` read `Constants.DriveConstants.kDriveMotorPort` while its
  `Constants.java` was the untouched template. Rolled all the way back to pristine
  template state instead, so it now serves as the students' actual starting point.
  The underlying snapshot gap — `lesson-1`…`lesson-4` shipping the *post-Try-It*
  `DriveModule` with no matching `Constants.java`, since `DriveConstants` is
  introduced by Lesson 1's **Try It #3** — is fixed by a new
  `code/lesson-1/Constants.java`. Lessons 1–4 are verifiable as a result.
- **maple-sim's own vendordep URL advertises a version that was never
  published.** Lesson 16 pointed at
  `shenzhen-robotics-alliance.github.io/maple-sim/vendordep/maple-sim.json`, which
  names `0.4.0-beta-obstacles-fix`. That version is absent from their Maven repo
  (its `.pom` 404s), so the install *succeeds* and the next build dies with
  `Could not find org.ironmaple:maplesim-java`. Newest actually-published version
  is `0.4.0-beta`, which is exactly what WPILib's pinned marketplace copy names —
  repointed Lesson 16 at that, with a callout tying it back to Lesson 15's
  moving-link warning. Two vendors, same failure mode, one lesson apart: **cite
  WPILib's pinned marketplace URL, never a vendor's "latest" link.**

  With the host allowed and the version pinned, Lesson 16's code compiles and its
  constants pass maple-sim's runtime bounds checks — so the API usage the lesson
  teaches is confirmed against the real `0.4.0-beta`, not just against the docs
  (which the appendix notes had already drifted).

  For the record, in case this environment is rebuilt: the two hosts that need to
  be reachable are **`shenzhen-robotics-alliance.github.io`** (maple-sim's
  vendordep JSON *and* its Maven repo — the artifacts are nowhere else; not on
  Maven Central despite being listed as a fallback, not mirrored on
  `frcmaven.wpi.edu`, and not buildable via JitPack since the repo has no
  `jitpack.yml` and its Gradle project sits in a `project/` subdirectory) and
  **`bline-metrics.edan-liahovetsky.workers.dev`** (the URL BLine's docs
  advertise; `raw.githubusercontent.com` serves the identical JSON as a fallback).
  `jitpack.io` is what serves BLine's own jars and sources.

---

## Housekeeping

- [x] README lessons table row for 16.
- [x] `Next:` link added to the end of Lesson 15.
- [x] **Lesson 16's link to `17-bline-autos.md`** — resolved; Lesson 17 landed
      under exactly that filename.
- [x] README lessons table row for 17.
- [x] Corrected `CLAUDE.md`'s "documentation-only / no Java source" claim.
- [x] **Lesson 17's link to `18-elevator.md`** — resolved; Lesson 18 landed under
      exactly that filename.
- [ ] **Lesson 18 ends with a link to `19-mechanism2d.md`, which does not exist
      yet.** Dead until 19 lands; keep the filename.
- [x] README row for 18.
- [ ] Add README rows for 19–22 as each lands.
- [x] Fixed Lesson 15's PhotonLib install to a pinned `v2026.3.4` URL, and
      replaced the deprecated `loadAprilTagLayoutField()` everywhere.
- [x] Fixed Lesson 16's maple-sim install to the pinned `0.4.0-beta` URL.
- [x] Added `code/lesson-1/Constants.java` (Lesson 1 Try It #3's `DriveConstants`),
      so lessons 1–4 compile.
- [x] Rolled `code/ActualLessons` back to pristine template state — it is the
      students' starting point now, not a half-finished Lesson 2.
- [x] Lesson 14's epilogue now points at Lessons 17 and 18 by name.
- [x] Added `tools/verify-lessons.sh`; CLAUDE.md and this doc point at it.
- [x] Environment network policy now allows `shenzhen-robotics-alliance.github.io`
      and `bline-metrics.edan-liahovetsky.workers.dev`, so Lesson 16 is
      compile-verified too. Whole course builds.

---

# Lesson 17 — B-Line autos: waypoints and trajectories

**Builds on:** L9 (`Commands.sequence`, auto chooser), L10 (`ChassisSpeeds`,
kinematics, `drive`), L14 (`Localizer.getPose`/`resetPose`). Independent of L16,
though running a drawn path against real obstacles is a good combined payoff.

**Goal (draft):** Replace hand-composed drive-turn-drive autos with a real path
— drawn as waypoints, followed continuously against Lesson 14's fused pose —
using B-Line, a polyline path-following library built for holonomic chassis.

**New Java concepts**
- **`PIDController`** — the library object behind the P control hand-rolled
  since Lesson 5, met as an actual class for the first time (three of them:
  translation, rotation, cross-track)
- **Method references as plug-in behavior** — extending "supplier for a value"
  (every lambda since L2) to "reference for an *action*"
- The **`deploy` folder** — first non-code asset shipped with the robot program

**New robot concepts**
- B-Line's path model: `Waypoint` (position + heading), `TranslationTarget`
  (position only), `RotationTarget` (heading only) — straight segments, not curves
- `EventTrigger` — firing a command partway along a path
- `FollowPath.Builder` — assembling a path-following `Command`
- Kinematics run **backward**: `toChassisSpeeds` as the mirror of L10's
  `toSwerveModuleStates`
- BLine-Web, the hosted path editor, as this lesson's outside tool (same role
  AdvantageScope had in L3, the PhotonVision UI in L15)

**Walkthrough outline**
1. What drive-turn-drive can't do — a fixed sentence of steps vs. a plan in
   field coordinates, chased continuously.
2. Install BLine. Vendor URL
   `https://bline-metrics.edan-liahovetsky.workers.dev/vendor/BLine-Lib.json`
   (fallback: the raw GitHub JSON).
3. Two new doors on `Drivetrain`: a public `getChassisSpeeds()` (kinematics
   backward over current module states) and a public
   `driveRobotRelative(ChassisSpeeds)` wrapping the existing private
   `applyChassisSpeeds`, so BLine binds without reaching past encapsulation.
4. Meet `PIDController` — "the object version of math you've written by hand
   five times." Gains into `Constants.java` with the others.
5. Draw a path in BLine-Web (or hand-write the JSON) into
   `src/main/deploy/autos/paths/`. When to reach for each of the three element
   types.
6. Build the follow command with `FollowPath.Builder`, wired to
   `Localizer::getPose`, `Drivetrain::getChassisSpeeds`,
   `Drivetrain::driveRobotRelative`, three `PIDController`s, and
   `Localizer::resetPose`.
7. Add it to Lesson 9's `LoggedDashboardChooser` — no new plumbing.
8. Meet `EventTrigger`; bind it to something harmless (a print) since no
   mechanism exists yet. Explicit forward pointer to 18+.
9. Run it: commanded path vs. fused pose on the Odometry/Swerve tabs — the same
   desired-vs-measured habit as every closed-loop lesson.

**Try it (draft)**
- A 4-waypoint path to two field corners and back.
- Mistune the cross-track PID and watch the chassis wobble off the line.
- Chain a BLine path and a Lesson 9 `Commands.sequence` step, proving they compose.
- (With L16) run the path with obstacles active and see what happens when the
  drawn line clips one.

**As built — verified BLine API notes**

All of the below was read from the real `v0.9.1` artifact (sources + javadoc jars
pulled from JitPack at
`https://jitpack.io/com/github/edanliahovetsky/BLine-Lib/v0.9.1/`) and, where it
had runtime behavior, confirmed by a JUnit test. The GitHub API and the docs site
403 in this environment; `raw.githubusercontent.com` and JitPack both work.

- Vendordep: `BLine-Lib` v0.9.1, `frcYear` 2026, from `jitpack.io`, coordinates
  `com.github.edanliahovetsky:BLine-Lib`. The worker URL in the install docs
  (`bline-metrics.edan-liahovetsky.workers.dev`) is 403 from this environment;
  `https://raw.githubusercontent.com/EdanLiahovetsky/BLine-Lib/main/BLine-Lib.json`
  serves the same JSON.
- **Package is `frc.robot.lib.BLine`** — the library ships under the robot's own
  package root, not a vendor namespace. Surprising, worth calling out to students.
- `new FollowPath.Builder(Subsystem, Supplier<Pose2d>, Supplier<ChassisSpeeds>,
  Consumer<ChassisSpeeds>, PIDController translation, PIDController rotation,
  PIDController crossTrack)`, then `.withDefaultShouldFlip()`,
  `.withPoseReset(Consumer<Pose2d>)`, `.build(Path)`. Also available:
  `withShouldFlip`, `withShouldMirror`, `withTRatioBasedTranslationHandoffs`.
- Controller units, from the call sites: translation and cross-track both take
  **meters** of error and output m/s; rotation takes **radians** (with
  `enableContinuousInput(-π, π)` applied internally) and outputs rad/s. So all
  three gains are `1/s`. README's suggested gains — 5.0 / 3.0 / 2.0 — are what
  the lesson uses.
- **Event triggers are static, not a constructed object**:
  `FollowPath.registerEventTrigger(String libKey, Command)` (also a `Runnable`
  overload). The path-file side is a `PathElement` of `"type": "event_trigger"`
  carrying `lib_key` + `t_ratio`. The plan's earlier guess at an `EventTrigger`
  class you instantiate was wrong.
- `new Path(name)` loads `deploy/autos/paths/<name>.json`;
  `new Path(File autosDir, name)` takes an explicit directory. `Filesystem.getDeployDirectory()`
  resolves to `src/main/deploy` off-robot, so paths work in sim with no extra
  wiring (verified).
- **`config.json` is mandatory**, not a default-if-absent: `loadPath` eagerly
  calls `loadGlobalConstraints(autosDir)`, which throws if
  `deploy/autos/config.json` is missing. Keys are
  `kinematic_constraints.default_*` (`max_velocity_meters_per_sec`,
  `max_acceleration_meters_per_sec2`, `max_velocity_deg_per_sec`,
  `max_acceleration_deg_per_sec2`, `end_translation_tolerance_meters`,
  `end_rotation_tolerance_deg`, `intermediate_handoff_radius_meters`), each also
  accepted without the `default_` prefix.
- Path-file element schema, all angles in **radians**: `waypoint` (nested
  `translation_target` `{x_meters, y_meters, intermediate_handoff_radius_meters?}`
  + `rotation_target` `{rotation_radians, t_ratio?, profiled_rotation?}`),
  `translation` (`x_meters`, `y_meters`, optional handoff),
  `rotation` (`rotation_radians`, `t_ratio` default 0.5, `profiled_rotation`),
  `event_trigger` (`t_ratio`, `lib_key`).
- **Validation rule:** first and last elements must each be a `waypoint` or
  `translation` — anything else and `isValid()` goes false with a logged warning
  (it does not throw).
- **One `FollowPath.Builder`, reused.** The builder holds everything that is the
  same for every path (subsystem, pose/speed suppliers, drive consumer, the three
  controllers); only the `Path` differs, so `build(path)` is called per auto on a
  single builder — held as `private static FollowPath.Builder s_pathBuilder` and
  wrapped by `private static Command followPath(String pathName)`, so `new Path(...)`
  is written once and each auto is one line. Sharing the `PIDController`s is safe because every `FollowPath`
  requires the drivetrain — the scheduler runs one at a time — and `initialize()`
  resets the controllers and re-reads the path's tolerances. BLine's own README
  calls this "a reusable path builder"; per-auto builders are the anti-pattern.

### Lazy autos (Lesson 17, §7) — and why there is no monitor command

The chooser holds `Supplier<Command>`, not `Command`, so no auto is constructed at
startup; `Autos.buildChooser` owns the options and `Autos.selected()` returns the
pre-built pick. The pre-building is done by **`LoggedDashboardChooser.onChange`**,
not by a command that runs while disabled. That was considered and is unnecessary:

- `onChange` fires from `LoggedDashboardChooser.periodic()`, which
  `Logger.periodicBeforeUser()` calls for every registered dashboard input **every
  loop with no enable gate** (verified in AdvantageKit `26.0.2` source), so it
  already runs during disabled — which is the whole point of the monitor command.
- It fires for the **default** option, not just on a driver-initiated change:
  `previousValue` starts `null` while the constructor's first `periodic()` sees a
  null selection, so the first real cycle after options are added is a transition.
  Verified with a JUnit test — this is the load-bearing bit, since a driver who
  never opens the chooser must still get their auto built.
- It does not re-fire on unchanged selections (also tested), so nothing rebuilds
  every loop.
- It reads the selection from the log under replay, so the behavior replays.

`Command.ignoringDisable(true)` does exist if a future lesson wants to teach
disabled-running commands for their own sake, but using it here would add a
concept and a schedule-from-constructor wrinkle to buy nothing.

This stayed out of Lesson 9 deliberately. At Lesson 9 both autos are instant to
construct, so the optimization would have no observable effect and would be a
forward reference to a problem the student cannot see — against the course's own
"smallest set of new ideas" rule. Lesson 17 is where building an auto first means
reading and parsing files, so the motivation is real and the refactor is one of
this course's signature motivated revisits.

- Useful extras not used by the lesson: `FollowPath.overrideRotation(DoubleSupplier)`
  / `clearRotationOverride()` for vision-aiming while driving a path, and four
  `setXxxLoggingConsumer` statics for piping BLine's internals into AdvantageKit.

---

# Lesson 18 — Scoring elevator: a second mechanism

**Builds on:** L13 (the IO spine), L12 (configs, control requests). The "second
mechanism" Lesson 14 promised — first full repetition of the pattern on new
hardware. **Blocked on open decision #2.**

**Goal (draft):** Build a scoring elevator on the exact `ModuleIO` spine —
`ElevatorIO` → `ElevatorIOTalonFX`/`ElevatorIOSim` → `Elevator` — driven by
onboard Motion Magic and gravity feedforward.

**New Java concepts**
- Mostly a **reuse** lesson; the payoff is speed, not syntax. Possibly:
  clamping a *goal* rather than a per-tick output.

**New robot concepts**
- A **linear mechanism with a hard range** vs. the wheel's wraparound circle —
  no `ContinuousWrap`, but real min/max limits
- **`MotionMagicVoltage`** — a third control request alongside L12's
  `PositionVoltage`/`VelocityVoltage`: onboard profiling, not just a setpoint
- **`MotionMagicConfigs`** (cruise velocity, acceleration) — how fast it may get
  there, not just where
- **`Slot0.kG` + `GravityTypeValue.Elevator_Static`** — first mechanism with a
  persistent load fighting it
- **Soft limits** — clamp the goal before it's sent, ahead of L21's real sensors

**Walkthrough outline**
1. Same spine, new mechanism — say the plan up front so the lesson can move fast.
2. `ElevatorIO`: `@AutoLog` inputs (height, velocity), `default setHeight(...)`.
3. `ElevatorIOTalonFX`: `SensorToMechanismRatio` from drum circumference;
   `MotionMagicConfigs`; `Slot0.kP`/`kG`; a `MotionMagicVoltage` request field.
4. `ElevatorIOSim extends ElevatorIOTalonFX`, mirroring `ModuleIOSim` — WPILib
   `ElevatorSim` feeding the sim state.
5. `Elevator` subsystem: `setGoalHeight(Distance)` clamped to travel limits,
   `atGoal()`.
6. Height presets in a new `ElevatorConstants`, bound to buttons/POV.
7. Run it: commanded vs. measured height, watching the profile ramp.

**Try it (draft)**
- A third preset and a cycle-presets binding.
- Zero `kG` and compare lag up vs. down — a gravity asymmetry the drivetrain's
  `kV` never showed.
- Log applied voltage next to height and spot the feedforward jump (L12's Try It,
  new mechanism).

**Research flags**
- `MotionMagicVoltage` / `MotionMagicConfigs` field names and
  `GravityTypeValue.Elevator_Static` need a fresh Phoenix 6 doc check.
- `ElevatorSim`'s constructor overload (motor, gearing, carriage mass, drum
  radius, min/max height, gravity flag, starting height, noise) is from general
  knowledge, **not** a verified fetch — confirm against current WPILib docs.
- Note: `docs.wpilib.org` and `v6.docs.ctr-electronics.com` both 403 automated
  fetches from this environment; the `frc-docs` MCP search works but its page
  fetch failed on both. Budget for that.

---

# Lesson 19 — Mechanism2d: watching the elevator move

**Builds on:** L18, L11 (`Field2d` / `SmartDashboard.putData` — "the one
sanctioned SmartDashboard use").

**Goal (draft):** Draw the elevator as a live stick figure, and mount a second,
smaller ligament on it — the exact attachment point Lesson 20's arm takes over.

**New Java concepts**
- **Composition as attachment.** Every earlier composition example built one
  object out of others, once. `append(...)` is a scene graph: attach a child and
  moving the parent moves it for free, every tick, with no extra code.

**New robot concepts**
- `Mechanism2d`, `MechanismRoot2d`, `MechanismLigament2d`
- Publishing it the `Field2d` way: build once in the constructor, `putData`
  once, mutate every `periodic()`
- Driving `setLength`/`setAngle` from logged inputs — the mechanism equivalent
  of `Field2d.setRobotPose`

**Walkthrough outline**
1. A picture instead of a number plot.
2. Build the frame: `Mechanism2d`, a `MechanismRoot2d` at the elevator's base,
   `putData` once in the constructor.
3. Append the elevator ligament; length tracks `m_inputs.heightMeters`. Contrast
   `append` (attach to parent) with the root (anchored to the world).
4. Append a second, smaller ligament **onto the first** — the "simple motor on
   carriage." This is the lesson's real payoff and Lesson 20's mount point.
5. `setColor(...)` as a status signal; updates live in `Elevator.periodic()`.
6. View it in SimGUI — same discovery motion as L11's `Field2d`.

**Try it (draft)**
- Color the ligament by height band.
- A third fixed ligament for visual context.
- Drive the child ligament's angle with `Math.sin(Timer.getFPGATimestamp())` to
  prove a child's angle is independent of its parent's length.

**Research flags**
- Stable WPILib API for many seasons — low drift risk. Confirm exact setter
  overloads and the `Color8Bit` import path when drafting.

---

# Lesson 20 — Intake arm: a mechanism that swings

**Builds on:** L18/L19 (spine + picture), L12. Swings −20°…180° with a roller on
the end.

**Goal (draft):** A second real mechanism, reusing Lesson 18's spine end-to-end,
mounted into Lesson 19's picture in place of the placeholder.

**New Java concepts**
- Likely none major — explicitly a **repeat-the-spine, faster** lesson, the beat
  Lesson 14 promised ("the second time it takes a tenth as long"). Possibly: two
  motors in *one* subsystem on purpose, contrasted with L7's "why `SwerveModule`
  stopped being a subsystem."

**New robot concepts**
- **`GravityTypeValue.Arm_Cosine`** vs. L18's `Elevator_Static` — gravity torque
  that varies with angle (`kG × cos θ`: maximum horizontal, zero vertical). A
  genuine physics beat, not just a different enum value.
- **Asymmetric soft limits** (−20°/180°) instead of a centered range
- Mounting a real mechanism onto L19's picture — the arm's ligament replaces the
  placeholder at the same attachment point, so both mechanisms move together
- A **second, unprofiled motor** in the same subsystem: the roller runs on plain
  percent output (Lesson 1's very first control style), because "spin while
  held" has no position goal to profile

**Walkthrough outline**
1. The second mechanism, the fast way — state the repeat up front.
2. What's actually different: gravity that depends on angle. Its own short section.
3. `ArmIO`/`ArmIOTalonFX`: gearing, `Slot0.kG` + `Arm_Cosine`,
   `MotionMagicConfigs`, soft limits.
4. The end-effector roller: a second `TalonFX`, plain duty cycle, no profiling.
5. `ArmIOSim` with `SingleJointedArmSim`, in `ElevatorSim`'s slot from L18.
6. `Arm` subsystem: `setGoalAngle(Angle)` clamped, `runIntake()`/`stopIntake()`,
   `atGoal()`.
7. Swap L19's placeholder ligament for the arm's real one.
8. Wire up presets + roller; watch the arm swing while riding the elevator.

**Try it (draft)**
- Command outside [−20°, 180°] and confirm the clamp holds.
- Log applied voltage vs. angle; watch `kG`'s contribution change sign across
  vertical.
- Run roller and pivot at once — they don't fight over the subsystem. Callback to
  L7's subsystem-boundary reasoning from the opposite direction.

**Research flags**
- Confirm `GravityTypeValue.Arm_Cosine` and `SingleJointedArmSim`'s constructor.
- **Nail the angle convention first.** Does Phoenix's cosine gravity model expect
  angle-from-horizontal in the same sense WPILib's `Rotation2d`/`Mechanism2d`
  measure angles (CCW from +X)? Backwards means `kG` fights the arm. Confirm
  against docs before writing any code.
- If L16 is in play, maple-sim's `IntakeSimulation` can back this with real game
  pieces — see appendix.

---

# Lesson 21 — Limit sensors: knowing when you've arrived

**Builds on:** L18 and L20 as the mechanisms needing sensing; the button-binding
habit from L1 onward.

**Goal (draft):** Give the elevator a way to know where its hard stops actually
are — a limit switch or a current spike — and use it to home at startup: the
linear-mechanism answer to Lesson 5's CANcoder priming.

**New Java concepts**
- **Building a `Trigger` from any `BooleanSupplier`**, not just a controller
  button — generalizing a type used since L1 without being named as reusable

**New robot concepts**
- **`DigitalInput`** — a roboRIO DIO channel; normally-closed vs. normally-open,
  and why `!get()` is usually "pressed" (a cut wire should read as pressed, not
  silently never-pressed — a fail-safe habit worth naming)
- **Current-based detection** — Phoenix 6 stator/supply current as a software
  alternative: a mechanism jammed against a stop draws current with no motion
- **Homing** — drive slowly to a known stop, then zero the encoder there
- A **hardware cutout** — stop travel the instant a limit trips, independent of
  whatever command is running

**Walkthrough outline**
1. Two mechanisms, one blind spot: a relative encoder has no idea where zero is
   after a power cycle. Frame it exactly as L5 framed boot alignment.
2. A physical switch: `DigitalInput`, normally-closed convention.
3. Turn a sensor into a `Trigger` — `new Trigger(() -> !m_bottomLimit.get())`,
   bound with `.onTrue(...)` like a controller button. The generalization moment.
4. Home the elevator: drive down slowly until the trigger fires, zero the
   encoder (L9's `resetDrivePosition` idiom, now sensor-gated); run at init.
5. A software alternative: stator current threshold.
6. Belt and suspenders: a cutout independent of the active command.
7. Simulate the sensor — compute `atBottomLimit`/`atTopLimit` in the sim IO from
   position crossing travel bounds, so homing is testable with no hardware.

**Try it (draft)**
- Add a top limit and matching `Trigger`.
- Tune a stator-current threshold by logging current into a hard stop.
- Invert a switch's polarity and diagnose why homing never finishes, from the
  log — L13's replay-debugging habit on a new bug.

**Research flags**
- `DigitalInput`/`Trigger` are stable core WPILib — low risk.
- Confirm Phoenix 6 current accessor names (`getStatorCurrent()`/
  `getSupplyCurrent()`) and whether per-tick polling has a CAN-utilization
  caveat worth a callout.

---

# Lesson 22 — Light sensors: catching the handoff

**Builds on:** L20 (arm + roller), L21 (`DigitalInput`/`Trigger`). Capstone-ish:
the two mechanisms finally coordinate.

**Goal (draft):** Give the arm a way to know it's actually holding a game piece
— a beam break — and use it to coordinate an automatic handoff instead of
trusting "the roller is spinning" as a proxy for "something is captured."

**New Java concepts**
- **`Trigger` combinators** — `.and(...)`, `.debounce(...)` — composing sensor
  logic declaratively instead of nested `if`s

**New robot concepts**
- Beam-break / photoelectric sensors — electrically just another `DigitalInput`,
  doing a different job
- **Debouncing** a signal that flickers exactly at the moment of capture — a
  small honest echo of L14's "sensors lie a little"
- **Coordinating two subsystems from one sensor event** — no new class, just
  `Trigger.onTrue(Commands.sequence(...))` spanning arm and elevator. The direct
  payoff of L9's command composition, thirteen lessons later.

**Walkthrough outline**
1. Knowing you're holding something — the roller spins whether or not it caught
   anything.
2. Wire the beam-break where a captured piece sits.
3. Debounce it; short honest note on why.
4. On beam-broken: stop the roller, drive the arm to a "handoff" preset —
   composed with L9's `Commands.sequence`/`parallel`.
5. On beam-clear: return to stowed/intake-ready, closing the cycle.
6. Log it — `Logger.recordOutput("Arm/HasGamePiece", ...)` so a replay (L13!)
   shows exactly when the robot believed it held something.

**Try it (draft)**
- A second beam-break at the scoring end; require piece-present **and** arm-at-goal
  before a score trigger fires (`Trigger.and(...)`).
- A fake beam-break button for sim testing — the trick L14 used for a fake camera
  sighting.
- Replay a cycle and confirm `HasGamePiece` reconstructs identically.

**Research flags**
- Stable core WPILib. Confirm `Trigger.debounce`'s default debounce *type*
  (rising-edge only vs. both edges) — it changes which parameter value reads
  correctly in prose.
- With L16 in place, maple-sim's `IntakeSimulation` gives this a real backing
  signal instead of a fake button — see appendix.

---

# Appendix: verified maple-sim API notes

Read from maple-sim source and docs while building Lesson 16, so 17–22 don't
have to re-derive it. **The published docs have already drifted from the
source** — `swerve-sim-hardware-abstraction.md` still shows
`moduleSimulation.STEER_GEAR_RATIO`, which now lives on `.config`. Prefer source.

Raw source paths (the docs site and GitHub HTML both 403 automated fetches;
`raw.githubusercontent.com` works):
`https://raw.githubusercontent.com/Shenzhen-Robotics-Alliance/maple-sim/main/project/src/main/java/org/ironmaple/simulation/…`

### The motor-controller bridge (the heart of Lesson 16)

```java
public interface SimulatedMotorController {
    Voltage updateControlSignal(
            Angle mechanismAngle, AngularVelocity mechanismVelocity,
            Angle encoderAngle, AngularVelocity encoderVelocity);
}
```

Registered with `SwerveModuleSimulation.useDriveMotorController(T)` /
`useSteerMotorController(T)`. **Pass an anonymous class, not a lambda** — both
methods are generic (`<T extends SimulatedMotorController> T`), and a type
variable is not a reliable lambda target type.

Argument semantics, confirmed by reading the call sites:

- **Drive** (`SwerveModuleSimulation.getDriveWheelTorque`): mechanism = wheel
  (post-gearbox), encoder = rotor (wheel × `DRIVE_GEAR_RATIO`).
- **Steer** (`MapleMotorSim.update`): mechanism = steer mechanism, encoder =
  mechanism × `STEER_GEAR_RATIO`.

So rotor sim states get `encoderAngle`/`encoderVelocity`; the CANcoder — 1:1 on
the wheel — gets `mechanismAngle`/`mechanismVelocity` with no gear multiply.
That lines up exactly with Lesson 12's `RemoteCANcoder` +
`RotorToSensorRatio = 25` + `SensorToMechanismRatio = 1` config.

**Gotcha:** `getSteerRelativeEncoderPosition()` deliberately includes a random
per-boot offset (`(Math.random() - 0.5) * 30` radians) to model an uncalibrated
relative encoder. Harmless here because Lesson 12's loop reads the CANcoder, not
the rotor — but it would wreck any code that trusted the rotor's absolute zero.

### Config, with this course's numbers

`DriveTrainSimulationConfig.Default()` then `.withRobotMass(Mass)`,
`.withBumperSize(Distance, Distance)`,
`.withTrackLengthTrackWidth(Distance, Distance)`,
`.withGyro(Supplier<GyroSimulation>)`,
`.withSwerveModule(Supplier<SwerveModuleSimulation>)` —
`SwerveModuleSimulationConfig` implements that supplier, so it can be passed
directly. `COTS.ofPigeon2()`, `COTS.ofMark4(...)`, `COTS.WHEELS.COLSONS.cof`
(= 0.899) are the shortcuts.

`SwerveModuleSimulationConfig` runs **runtime bounds checks** that throw. This
course's constants all pass, verified: drive gear 6.75 ∈ [4, 24]; steer gear 25.0
∈ [6, 50]; wheel radius 2 in ∈ [1, 3.2]; COF 0.899 ∈ [0.6, 2.5]; drive friction
0.1 V ∈ [0.01, 0.35]; steer friction 0.2 V ∈ [0.01, 0.6]; steer MOI 0.03 ∈
[0.005, 0.06].

### Arena

- `SimulatedArena.getInstance()` — **throws `IllegalStateException` on a real
  robot** unless `ALLOW_CREATION_ON_REAL_ROBOT` is set. Defaults to
  `Arena2026Rebuilt`.
- `.simulationPeriodic()` — call once per tick; runs 5 physics sub-ticks per
  robot period (so 250 Hz odometry on a 50 Hz robot). Don't override the timing
  while using AdvantageKit — it only supports 50 Hz.
- `.addDriveTrainSimulation(...)`, `.addGamePiece(...)`, `.clearGamePieces()`,
  `.resetFieldForAuto()`, `.getGamePiecesArrayByType(String) → Pose3d[]`.
- Drivetrain pose: `getSimulatedDriveTrainPose()`,
  `getDriveTrainSimulatedChassisSpeedsFieldRelative()`,
  `setSimulationWorldPose(Pose2d)` (on `AbstractDriveTrainSimulation`).
- Current season: `org.ironmaple.simulation.seasonspecific.rebuilt2026.RebuiltFuelOnField`,
  game-piece type string `"Fuel"`.

### For Lessons 20 and 22 — `IntakeSimulation`

Directly useful, and it removes the need for a fake beam-break button:

```java
IntakeSimulation.OverTheBumperIntake(
        "Fuel", driveTrainSimulation,
        Meters.of(0.4),   // intake width
        Meters.of(0.2),   // extension beyond the frame when active
        IntakeSimulation.IntakeSide.BACK,
        20);              // capacity
```

Also `InTheFrameIntake(...)` and a custom-shape constructor.
`startIntake()`/`stopIntake()` extend and retract the collision rectangle;
**`gamePiecesInIntakeCount` is the natural simulated beam-break signal** for
Lesson 22. Models an idealized "touch it, get it" intake, so it's for testing
code, not for validating a real intake's geometry.

Projectiles (`RebuiltFuelOnFly`, `addGamePieceProjectile`, hit-target callbacks)
exist too, if the course ever grows a shooter.
