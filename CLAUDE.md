# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A teaching repo whose product is the ordered markdown lessons under [docs/lessons/](docs/lessons/). Students apply the lessons to a WPILib Command Robot project of their own, so the `./gradlew` commands in [README.md](README.md) describe *the student's* project — they are not the way to build this repo.

There is Java here, though, in two forms under `code/`:

- **`code/lesson-N/`** — a per-lesson reference snapshot holding *only the files that lesson changes*, mirroring the `frc/robot` package layout (root classes at `code/lesson-N/`, subsystems at `code/lesson-N/subsystems/`, commands at `code/lesson-N/commands/`, deploy assets at `code/lesson-N/deploy/`). These are reference copies, not a buildable project.
- **`code/ActualLessons/`** — a real, buildable GradleRIO project: **the students' starting point**, held at pristine WPILib Command Robot template state (byte-identical to the upstream template, only `WPILibNewCommands` in `vendordeps/`, since Phoenix 6 is installed by Lesson 1 and everything else later). Students clone it and work forward from Lesson 0. **Keep it at baseline** — do not roll lesson work into it, and do not add vendordeps a lesson hasn't reached yet.

## Verifying lesson code

**`./tools/verify-lessons.sh [N] [test]`** compile-checks the lessons for real. It copies `ActualLessons` to a scratch sandbox (never touching the repo copy), fetches pinned vendordeps, rolls `code/lesson-0` … `code/lesson-N` forward in order, replays the deletions the lessons instruct, appends Lesson 13's AdvantageKit `build.gradle` blocks, and runs Gradle. First run takes a few minutes to fill the Gradle cache; later runs are seconds.

**Use it instead of reasoning about whether a snippet compiles.** Current state: lessons 0–17 all compile, at every intermediate stopping point, with zero warnings. A regression is therefore a real result, not noise. Run the specific lesson you touched plus the highest one.

For anything with runtime behavior — a JSON schema, a replacement for a deprecated API, a config with validation — drop a throwaway JUnit test into the sandbox's `src/test/java/` and re-run with `test`. That has caught things compiling never would.

Hard-won details worth not rediscovering:

- **Pin vendordeps to WPILib's marketplace**, `.../vendor-json-repo/main/<YEAR>/<name>-<version>.json` — one immutable file per version, with `<YEAR>_metadata.json` as the index. Do **not** cite a vendor's own "latest" link in a lesson. Two of the three third-party libraries here were actively broken through theirs at the same time: PhotonVision's served a next-season alpha whose manifest GradleRIO rejects outright, and maple-sim's advertised a version that was never uploaded to their Maven repo.
- A vendordep must be saved under the `fileName` declared **inside** the JSON, not the URL's basename — Lesson 13's `build.gradle` block reads `vendordeps/AdvantageKit.json` by that exact name.
- `code/lesson-N/deploy/**` maps to `src/main/deploy/**`, not into the Java tree.
- Snapshots can only add or replace files, so **deletions live in the script**: `DriveModule` (L7), `ExampleCommand`/`ExampleSubsystem` (L9 §3), `VisionPoseProvider` (L15).
- maple-sim's jars exist **only** on `shenzhen-robotics-alliance.github.io` — not Maven Central despite being a listed fallback, not on `frcmaven.wpi.edu`, and not buildable via JitPack. That host must be reachable or Lesson 16 can't be verified. BLine's jars and sources come from `jitpack.io`.
- Reading a library's **sources jar** beats reading its docs. BLine's docs described an `EventTrigger` class you construct; it's actually a `FollowPath` static. Its sources/javadoc jars are on JitPack next to the main jar.

Target platform (assumed by every lesson): **WPILib 2026**, **Phoenix 6**, **TalonFX** drive/steer motors, **Pigeon 2** gyro, Xbox controller, **AdvantageKit** logging (from Lesson 3 on).

## Lessons are strictly sequential

Lessons 0–17 form a single build. Each one:
- Introduces the **smallest possible** set of new Java and robot concepts.
- Ends with a runnable result the student can see (sim, plots, or hardware).
- Assumes every earlier lesson has already been done.
- Ends with `Next: [Lesson N+1 — Title](0N+1-slug.md)`.

Consequences when editing:
- Changing a class name, field name, method signature, CAN ID convention, or constant introduced early ripples through every later lesson. Search the whole [docs/lessons/](docs/lessons/) tree before renaming anything.
- Do not forward-reference a concept that hasn't been introduced yet. If a lesson needs `MathUtil.clamp`, `Translation2d`, kinematics, etc., check the lesson where it's first taught (see the table in [README.md](README.md)) and stay within what the student has seen.
- The `SwerveModule` / `Drivetrain` refactor happens in [Lesson 7](docs/lessons/07-four-modules.md) — before that the single-module class is called `DriveModule` and is itself a subsystem. Match whichever name the current lesson is at.
- Simulation is introduced in [Lesson 4](docs/lessons/04-simulation.md); lessons 1–3 must not depend on sim plumbing.
- Telemetry is AdvantageKit-style logging, introduced in [Lesson 3](docs/lessons/03-telemetry.md): every value goes through `Logger.recordOutput("SubsystemName/ValueName", value)` from the subsystem's `periodic()` — never bare `SmartDashboard.putNumber`. All numbered lessons now follow this style; the auto chooser in [Lesson 9](docs/lessons/09-autonomous.md) uses AdvantageKit's `LoggedDashboardChooser`, and [Lesson 11](docs/lessons/11-odometry-field.md) draws the robot by logging a `Pose2d` to AdvantageScope's Odometry tab, plus a `Field2d` widget for viewing inside SimGUI (`SmartDashboard.putData` for a widget is the one sanctioned SmartDashboard use; per-value `putNumber` is not).
- Steering gets a CANcoder from [Lesson 5](docs/lessons/05-steering-p-control.md) on — much earlier than the rest of the advanced arc — because a real (non-simulated) chassis needs it to boot with correct wheel angles, and Lesson 7's 4-module chassis is the first lesson where that matters. `DriveModule`'s (later `SwerveModule`'s) constructor creates the `CANcoder`, applies a `CANcoderConfiguration.MagnetSensor.MagnetOffset`, then **primes**: `m_steerMotor.setPosition(m_steerEncoder.getAbsolutePosition().getValueAsDouble())`, seeding the motor's own relative counter once at construction (a one-time read — the sensor still isn't used for feedback beyond that). Lesson 5 uses a pretend 1:1 ratio (no gear multiply on the primed value); Lesson 7 pays that off alongside the real `25:1` gear ratio (multiply the CANcoder's wheel-side reading by `kSteerGearRatio` before seeding the rotor-side counter) and parameterizes it per corner — `cancoderId` and `magnetOffsetRotations` join `driveId`/`steerId`/`location` as constructor params, so every module-array call site from Lesson 7 on passes five args, not three; `DriveConstants` carries the per-corner CANcoder CAN IDs and magnet-offset constants alongside the drive/steer ports.
- The advanced arc changes earlier conventions in ways later edits must respect: from [Lesson 12](docs/lessons/12-model-based-control.md) on, modules use Phoenix onboard closed loop (`PositionVoltage`/`VelocityVoltage`, `ContinuousWrap` replaces the wrap loops, and the old software `SteerConstants.kP` is retired). Lesson 12 also **replaces** Lesson 5's one-time priming with continuous remote-sensor feedback — it does not introduce the CANcoder (that's already in the file since Lesson 5/7) — so the constructor signature does *not* change again here; only its body does: the priming `setPosition(...)` call is deleted, and the steer `TalonFXConfiguration.Feedback` block sets `FeedbackRemoteSensorID`/`FeedbackSensorSource = RemoteCANcoder`/`RotorToSensorRatio` (the old `SensorToMechanismRatio` role, renamed because the ratio is now rotor:CANcoder) instead of `SensorToMechanismRatio` directly; the drive motor's config is untouched. In sim, the CANcoder needs its own `CANcoderSimState` fed every tick (mechanism-side, no gear multiply) alongside the existing rotor feed from this lesson on — priming never needed this (a fresh sim CANcoder defaults to `0`, which happened to match the physics model's own zero), but continuous reading does, or the simulated closed loop chases a signal that never moves. From [Lesson 13](docs/lessons/13-io-replay.md) on, hardware lives behind `ModuleIO`/`GyroIO` (sensor values are *inputs* via `Logger.processInputs`; computed values remain *outputs* via `recordOutput`), and a `Constants.Mode` enum (`REAL`/`SIM`/`REPLAY`) picks one implementation per mode via a `switch` expression: `ModuleIOTalonFX`/`GyroIOPigeon2` (pure hardware, no sim code — `ModuleIOTalonFX` owns the CANcoder too, `protected` like the motors), `ModuleIOSim` (extends `ModuleIOTalonFX` adding the physics models, including the CANcoder sim feed, so Phoenix's simulated firmware keeps running the loops) / `GyroIOSim` (standalone, integrates the commanded rate, no hardware), and `new ModuleIO() {}` / `new GyroIO() {}` for replay. All sim plumbing lives inside the sim IO classes — `simulationPeriodic` is gone. [Lesson 14](docs/lessons/14-pose-estimator.md) moves pose tracking out of `Drivetrain` into a separate `Localizer` subsystem that owns a `SwerveDrivePoseEstimator` and fuses a registry of `PoseProvider` implementations — `Drivetrain` (odometry, registered first, so it `implements PoseProvider` and exposes `getKinematics`/`getRotation`/`getModulePositions`) and a `VisionPoseProvider` second; `getPose`, `resetPose`, the `Field2d` widget, and the pose log all live on `Localizer` now (`Localizer/Pose`), and `RobotContainer` must declare `m_drivetrain` before `m_localizer` so odometry ticks first. [Lesson 15](docs/lessons/15-photonvision.md) deletes `VisionPoseProvider` and gives vision the same IO-layer treatment `ModuleIO`/`GyroIO` got in Lesson 13, so it replays too. A new `VisionIO` interface (`updateInputs`, an `@AutoLog` inputs class holding a `PoseObservation[]` — `PoseObservation` is a `record` of timestamp/`Pose3d`/tag count) has two implementations: `VisionIOPhotonVision` (real `PhotonCamera` + `PhotonPoseEstimator`, multi-tag-first with single-tag fallback, `protected PhotonCamera m_camera` foreshadowing the subclass) and `VisionIOPhotonVisionSim extends VisionIOPhotonVision` (adds `PhotonCameraSim`, `extends`-onto-real the same way `ModuleIOSim` does). `PhotonVisionPoseProvider implements PoseProvider` owns a `VisionIO` + its `VisionIOInputsAutoLogged` and loops `estimator.addVisionMeasurement` over the logged observations — same `PoseProvider` contract, so `Localizer` itself doesn't change. Multi-camera sim needs no helper class or varargs: `VisionIOPhotonVisionSim` keeps a `private static VisionSystemSim visionSim`, lazily built by whichever camera constructs first, and every camera after that just calls `addCamera` on the shared field — the first teaching use of a `static` field in the course. `PhotonVisionPoseProvider` also carries a `public static makeCamera(name, robotToCamera, Supplier<Pose2d> poseSupplier)` factory that switches on `Constants.kCurrentMode` to build the right `VisionIO` — the same pattern as `Drivetrain`'s `private static makeModule`, just `public` because `RobotContainer` calls it from outside; `RobotContainer` itself only calls `PhotonVisionPoseProvider.makeCamera(...)` per camera, keeping IO selection out of the wiring class. `RobotContainer` declares `m_localizer` right after `m_drivetrain` — before the two camera fields, which are blank `final`s (`private final PhotonVisionPoseProvider m_frontCamera;`, no initializer) — and builds both cameras in the constructor body with `m_localizer::getPose` as the `poseSupplier` argument, once `m_localizer`'s own field initializer has already run; this avoids relying on lambda-capture-before-assignment tricks. Vision flows through `VisionIO`/`@AutoLog` like every other sensor, so it replays exactly. [Lesson 16](docs/lessons/16-maple-sim-field.md) swaps the per-module `DCMotorSim` physics for maple-sim's rigid-body chassis, entirely inside `ModuleIOSim`/`GyroIOSim`: `Drivetrain` gains a `private static final SwerveDriveSimulation m_driveSim = createDriveSim()` that is **null outside `SIM`** (`SimulatedArena.getInstance()` throws on a real robot, so the null guard is load-bearing), only the `SIM` arms of the two mode switches read it, `GyroIO.setSimRotationRate` is deleted along with both call sites, and the arena is stepped once in `Robot.simulationPeriodic()` — the one sanctioned exception to "sim code lives inside IO implementations," because the arena is shared world state. It also introduces **ground truth** (`Drivetrain/SimulatedPose`), so estimated pose can be plotted against truth instead of faking slip with a `1.1` multiplier. [Lesson 17](docs/lessons/17-bline-autos.md) replaces hand-composed autos with BLine path following: `Drivetrain` gains exactly two public doors — `getChassisSpeeds()` (kinematics run backward via `m_kinematics.toChassisSpeeds(states)`) and `driveRobotRelative(ChassisSpeeds)` (a deliberately narrow wrapper around the still-`private` `applyChassisSpeeds`, *not* a visibility change) — and `Autos.followPath(drivetrain, localizer, pathName)` assembles a `FollowPath.Builder` with three `PIDController`s whose gains live in a new `Constants.PathConstants` (`kTranslationP`/`kRotationP`/`kCrossTrackP`, all `1/s`, staying bare `double`s like every other gain). `PIDController` is first taught here, after five lessons of hand-rolled P control. Paths are JSON under `src/main/deploy/autos/paths/`, with a **mandatory** `src/main/deploy/autos/config.json` for global constraints; angles in those files are radians. Event markers are registered statically once (`FollowPath.registerEventTrigger("shoot", command)` in `RobotContainer`) and referenced from a path element by `lib_key`. BLine ships in package `frc.robot.lib.BLine` — under the robot's own package root, not a vendor namespace. Lesson 17 also moves auto *selection* into `Autos`: `Autos.buildChooser(drivetrain, localizer)` assigns **one** `private static FollowPath.Builder s_pathBuilder` (per-auto builders are the anti-pattern, and sharing the `PIDController`s is safe because every `FollowPath` requires the drivetrain), which a `private static followPath(String pathName)` wraps so a path auto is one line and `new Path(...)` appears exactly once; and returns a `LoggedDashboardChooser<Supplier<Command>>` whose options are lambdas, so no auto is constructed at startup. `chooser.onChange(recipe -> s_selected = recipe.get())` pre-builds the selection — it fires while **disabled** (AdvantageKit polls dashboard inputs every loop with no enable gate) and fires for the **default** option on the first loop, so no monitor command is needed; `RobotContainer` keeps only the chooser field and `getAutonomousCommand()` returns `Autos.selected()`, which defaults to `Commands.none()` rather than null. The word "recipe" is reserved for `Supplier<Command>` in this lesson — describe drive-turn-drive as a *script*, not a recipe.

## Asides (out-of-sequence lessons)

Alongside the numbered sequence, `docs/lessons/aside-*.md` files hold
supplementary lessons that aren't part of the linear build (e.g.
[aside-debugger.md](docs/lessons/aside-debugger.md)). They follow the same
voice and template as numbered lessons but:

- Do **not** have a `Next:` link at the bottom (they're not in a chain).
- **May reference numbered lessons for examples** — treat those as "you can
  read this any time after Lesson N," not "this must come before Lesson N+1."
- Are linked from the **Asides** section in [README.md](README.md), not the
  main lessons table.

When adding a new aside, use the `aside-<slug>.md` prefix and add it to the
README's Asides list.

## Voice, structure, and style

Every lesson follows the same shape — keep it when editing or adding one:

1. `# Lesson N — Title`
2. `**Goal:**` one sentence.
3. `**New Java concepts**` and `**New robot concepts**` bullet lists — keep these short; a lesson that adds too many new ideas is a smell.
4. Numbered `## 1. …`, `## 2. …` walkthrough sections with fenced code blocks (`` ```java ``, `` ```powershell ``).
5. `## Try it` challenge — the point of the challenge is that the student writes code the walkthrough didn't hand them.
6. `## What you learned` recap bullets.
7. `Next: [Lesson N+1 …](…)` link.

Prose conventions used consistently across lessons:
- Second person ("you'll add…", "type it yourself"), conversational, unafraid of humor.
- **Bold** on first introduction of a term.
- Code style in examples: private fields prefixed `m_` (e.g. `m_driveMotor`), constants under nested `public static class XxxConstants` inside [Constants.java](../src/main/java/frc/robot/Constants.java) (student's file), CAN IDs as placeholder integers with an inline `// change to yours` comment.
- Commands (WPILib `Command`) are produced by factory methods on the subsystem (e.g. `run(() -> …).finallyDo(…)`), not by subclassing `CommandBase`.
- PowerShell is the assumed shell (`./gradlew simulateJava`), matching a Windows dev environment.
- When a walkthrough adds code to an **existing** file, never hand the student a bare snippet. Show it inside its surroundings (the enclosing method or class line, with `// ...` anchor comments standing in for neighboring code) and say in prose where it goes **and why it belongs there** — students don't yet know Java file anatomy, and placement reasoning ("fields hold data the object keeps for life, so they go at the top of the class") is part of the lesson. When a lesson introduces a whole new file with several new concepts, build it in labeled pieces top-to-bottom rather than presenting one large block, then show the assembled file for checking.
- Every code snippet that instructs a change gets a **bold action lead-in** naming the file and where the code goes, on its own line right before the fenced block — e.g. **Edit `Drivetrain.java`:**, **Add to `SwerveModule`, below the fields:**, **Replace `setDesiredState` with:**, **Delete from `Drivetrain`:**. This is the scannable "what to type" header; the surrounding prose still carries the "why".
- **The real hazard is an instruction buried in a paragraph.** Any *actionable* code step hiding in a wall of explanation — a deletion, a rename, an added import, a re-binding ("bind this instead of that"), a "update every caller" — must be lifted onto its own bold line (or short blockquote), never left mid-sentence where a skimming student sails past it. The test: someone who reads **only** the bold lines and the code blocks, skipping every explanatory paragraph, should still perform every required edit and end up with compiling code. If skipping the prose would make them miss a step, that step is in the wrong place.
- Blockquote callouts and code comments render gray, but they are still teaching text: write them **to the student**, never about the lesson from the outside. "Watch out: motors don't stop on their own" — not "this is the misconception of the lesson" or other narration about the material.
- **WPILib Units** (`edu.wpi.first.units`) get peppered in from [Lesson 10](docs/lessons/10-kinematics.md) on — *after* the by-hand math has been taught, never before (Lessons 1–9 keep bare `double`s with unit-suffixed names like `kMaxSpeedMps`, which is the teaching version). Scope is **constants + signatures**: named physical constants (`Distance kWheelDiameter = Inches.of(4)`, `LinearVelocity kMaxSpeed = MetersPerSecond.of(...)`, chassis `Distance`s) and human-authored command parameters (`driveDistance(Distance distance)`, `turnToHeading(Angle target)`). **WPILib's own APIs speak Units — prefer passing measures directly over unpacking.** `ChassisSpeeds(LinearVelocity, LinearVelocity, AngularVelocity)`, `SwerveModuleState(LinearVelocity, Rotation2d)`, `SwerveDriveKinematics.desaturateWheelSpeeds(states, LinearVelocity)`, the geometry/kinematics/estimator classes, and `Rotation2d`/`Angle` interop all take measures, so let a `LinearVelocity`/`Angle` flow straight through them; scale with measure arithmetic (`kMaxSpeed.times(fraction)`, `.plus`, `.div`) rather than converting to a double and back. Only unpack with `.in(Meters)` / `.in(Degrees)` / `.in(MetersPerSecond)` at a *genuine* double-only boundary — chiefly Phoenix `motor.set`/`setControl` (which want a −1..1 fraction or a plain number) and any hand-rolled arithmetic that must stay double for readability. Dimensionless values (gear ratios, `kP`/`kV` gains) stay `double`. **Unpack only when necessary, and convert once:** if you *do* need a bare `double` more than once in a scope (or inside a per-tick lambda), pull it into a local once and reuse it rather than calling `.in(...)` repeatedly in a hot path. But first prefer not unpacking at all — scaling the measure with `.times(fraction)` (as the joystick suppliers do) keeps the unit and sidesteps the conversion entirely. Migrate the unitless constants gradually: a `double` from an earlier lesson becomes typed only when a lesson has reason to touch it, not in a sweep. Imports: `import static edu.wpi.first.units.Units.*;` for the unit singletons, plus the measure types from `edu.wpi.first.units.measure` (`Distance`, `Angle`, `LinearVelocity`, …). Introduce the library with a teaching beat that builds on the unit-in-the-name habit ("you've been writing `Mps` in the name; the type can carry the unit for you").
- From [Lesson 10](docs/lessons/10-kinematics.md) on, the hand-written angle-wrap `while` loops (`while (error > 180) { error -= 360; } …`) become one call: `MathUtil.inputModulus(error, -180, 180)`. Lessons 5–9 keep the explicit loop as the teaching version, then Lesson 10 swaps to the library call the same way `clamp` became `MathUtil.clamp` in Lesson 7 ("now that you know what it does by hand, here's the one-liner"). By [Lesson 12](docs/lessons/12-model-based-control.md) the steering wrap moves into firmware (`ContinuousWrap`) and the software wrap retires entirely.

## Rewriting lessons in a teacher's voice

The lessons started in a slightly "AI voice" — clinical, evenly-weighted, with
lots of "X is Y — Z" glossary definitions. There's an in-progress pass to
rewrite them so they read more like a teacher talking to a student.
**[Lesson 0](docs/lessons/00-orientation.md) is the calibration reference —
read it before rewriting any other lesson to lock in the target level.**
Every other numbered lesson and the two asides are still in the original
voice as of this note.

Do lessons **one at a time** when the user explicitly asks. Do not bulk-rewrite
and do not preemptively touch a lesson the user hasn't picked. The user
reviews each pass and steers the intensity.

### What to preserve exactly

- Every technical claim: code snippets, WPILib method names, numbers,
  constant values, CAN ID conventions.
- The structural template: `Goal` / `New concepts` / numbered walkthrough
  sections / `Try it` / `What you learned` / `Next:` link (or `Ready to
  start?` for asides).
- Section headers.
- The imperative voice in *instructions* — "Open `Robot.java`", "Run
  `./gradlew build`". Teachers give clear directions. Don't soften commands
  into suggestions.
- Length follows clarity, not a quota. A section may grow substantially when
  it is genuinely unpacking a new concept — placement reasoning, a short
  worked example, a wrong-model-vs-right-model contrast all earn their space.
  What to cut is fluff: cheerleading, repeated teacher beats, and prose that
  restates what the code already says.

### The moves that make it work

These are the specific things the Lesson 0 rewrite does. Reach for them —
but don't force every one into every lesson.

1. **Anticipate student anxiety.** "That's totally normal." "You don't need
   to memorize anything yet." "If half of this still feels fuzzy, that's
   fine — it'll click in Lesson N."
2. **Name what matters.** "If you take one thing from this lesson, take
   that picture." "That last idea is worth stopping to internalize." Every
   lesson has priorities; make them visible.
3. **Pair the right mental model with the wrong one the student is
   bringing in.** For the biggest conceptual shifts, don't just state the
   correct picture — call out the wrong one too. Example from Lesson 0:
   "You're not writing a program that runs top-to-bottom. You're filling in
   blanks that the framework will visit on its own schedule."
4. **Point to rhythms the student will notice.** "That's the pattern for
   basically every file you'll open in this course." Connect the current
   lesson to the shape of what's coming.
5. **Swap abstract examples for vivid concrete ones.** "If two vendors both
   shipped a `Timer` class…" beats "if two libraries had a class with the
   same name…".
6. **Small honest asides.** "Well, not move, but boot." "Grab a drink."
   Only observations that are actually true; never forced humor.
7. **State concrete rules-of-thumb boldly.** "**The package at the top of
   a file has to match its folder path.**" Students remember bolded rules.
8. **Softer transitions.** "Alright —", "Which brings us to…", "Peek at
   any…". Beats "In this section we will…" or "Every .java file…".
9. **State a pedagogical belief plainly when it's earned.** From Lesson 0's
   Try it: "Most of the actual learning happens when you have to think,
   not when you're copying code out of the walkthrough."
10. **Dissolve glossary bullet lists into prose** when the bullets are just
    definitions strung together. Bullets belong on parallel action steps or
    reference material, not on teaching-by-defining.
11. **Rewrite `What you learned` as a warm sign-off**, not a clinical
    bullet recap. Acknowledge pace ("If X still feels fuzzy…"), name what
    mattered most, close with a beat ("That's plenty for one sitting.").

### What to avoid

- **No "I".** Stay in "you" and "we". A first-person narrator changes the
  voice more than the improvement is worth.
- **No forced humor and no cheerleading.** "You've got this!" is worse
  than saying nothing. If a joke isn't actually funny, cut it.
- **No apologizing** for the pace or content ("Sorry this is dry, but…").
  Just teach it.
- **No repetitive teacher-tics.** Don't reach for the same move ("worth
  naming X", "worth pausing on Y") more than a couple of times per lesson.
- **Don't over-caveat.** "You might want to consider…" is bad; "Do this"
  is good. Warmth doesn't mean hedging.
- **Don't invent new metaphors** where the original already has a good one
  — the goal is to warm up the delivery, not to redesign the pedagogy.

### Calibration

The rhythm in the current [Lesson 0](docs/lessons/00-orientation.md) is
roughly one moment of teacher voice every 10–15 lines — noticeable, not
overwhelming. If you count more than one warm beat per short paragraph,
dial back. If a whole section reads as pure imperative, dial up.

## The plan for upcoming lessons

[docs/lesson-plan-16-22.md](docs/lesson-plan-16-22.md) is the working plan for
Lessons 16–22 — per-lesson outlines, open decisions that are still the user's
call, discovered repo conventions, and a verified API appendix for the
third-party libraries involved. **Read it before drafting any lesson in that
range**, and update its status table and housekeeping checklist as lessons land.
It is a contributor document: it lives beside `docs/lessons/`, never inside it.

## When adding or editing a lesson

- Update the lessons table in [README.md](README.md) if the number, title, or "You'll build" summary changes.
- Fix the `Next:` link on the previous lesson and the intro back-reference on the next lesson.
- If you rename a symbol, `grep` the whole [docs/lessons/](docs/lessons/) tree for the old name — later lessons often reuse it verbatim.
- Prefer editing an existing lesson over inserting a new one; inserting shifts every downstream lesson number and every cross-link.

## MCP: FRC docs lookup

[.mcp.json](.mcp.json) wires in the `frc-docs` MCP server (`first-agentic-csa` via `uvx`). When a lesson touches a WPILib or Phoenix 6 API you're not sure is current for 2026, use the `mcp__frc-docs__*` tools (search / list sections / fetch page) rather than guessing — the README explicitly warns that vendordep method names drift.
