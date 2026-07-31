# Lesson plan: 16–22

A working plan for the next stretch of the course. **This is a contributor
document, not lesson content** — it lives beside `docs/lessons/`, never inside
it, and nothing here should be pasted into a lesson as-is.

Written one lesson at a time, reviewed between each, same as the voice-rewrite
pass. Lessons 16–21 are done; 22 is an outline waiting to be drafted.

---

## Status

| # | Working title | Builds on | 3rd-party library | Status |
|---|---|---|---|---|
| 16 | maple-sim — a world to drive in | L13 (IO layers), L11 (field views) | `maple-sim` | **Done** — [lesson](lessons/16-maple-sim-field.md), [code](../code/lesson-16/) |
| 17 | B-Line autos: waypoints and trajectories | L9 (autos), L10 (kinematics), L14 (Localizer) | `BLine-Lib` | **Done** — [lesson](lessons/17-bline-autos.md), [code](../code/lesson-17/) |
| 18 | Scoring elevator | L13 (IO spine), L12 (configs/control requests) | none | **Done** — [lesson](lessons/18-elevator.md), [code](../code/lesson-18/) |
| 19 | A picture of the elevator | L18, L11 (field-view precedent) | none | **Done** — [lesson](lessons/19-mechanism2d.md), [code](../code/lesson-19/) |
| 20 | Intake arm (−20°…180°) + roller | L18/L19, L12 | none | **Done** — [lesson](lessons/20-intake-arm.md), [code](../code/lesson-20/) |
| 21 | Homing & limit sensors | L18, L20 | none | **Done** — [lesson](lessons/21-limit-sensors.md), [code](../code/lesson-21/) |
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

**Corollary, and it is not optional: every profiled mechanism gets the full
feedforward set — `kG`, `kV`, `kA` — with `kP` as the trim.** Motion Magic
publishes a velocity and an acceleration at every instant precisely so a model can
convert them to voltage before any error exists. Configuring `kP` + `kG` alone
technically converges, which is exactly what makes it a trap: the mechanism still
arrives, so nothing looks broken, while the student is quietly taught that
position control means "react to error." It also *is* broken in a way that matters,
because a pure feedback loop can only manufacture voltage by first allowing error:

- Elevator, 1.0 m/s cruise ⇒ 9 V of back-EMF. With `kP = 20` V/drum-rot that is
  0.45 rot = **7.2 cm of deliberate lag**.
- Arm, 180°/s cruise ⇒ 3 V. With `kP = 60` V/arm-rot that is **18° of lag**.

Measured peak |setpoint − position| (the metric students can actually plot; real
time, 20 ms sleep):

| | `kV` on | `kV` off |
|---|---|---|
| elevator | 44–49 mm | 107 mm |
| arm | 8–9° | 20.3° |

Peak lag lands on the *acceleration ramp*, not the cruise — worth knowing, since
Lesson 18 §9 teaches that as `kA`'s tuning signature. Quote ranges, not single
figures: run-to-run spread is real (the sim feeds the rotor position at 50 Hz while
Phoenix's firmware loops at 1 kHz).

Derivation and measurement agree closely enough that both lessons state the
arithmetic and then have the student switch `kV` off and watch it happen.

**A logged profile setpoint is what makes any of this visible**, so both IO layers
carry one: `ElevatorIOInputs.setpointMeters` / `ArmIOInputs.setpointDegrees`, read
from `getClosedLoopReference()`. Without it a student can only plot position against
the *goal*, which is a step — so profile lag and tracking error are indistinguishable
and there is nothing to tune against. Lesson 18 §3 introduces the three-way
distinction explicitly (goal = destination, setpoint = where the plan says you should
be this tick, position = where you are; error = setpoint − position).

Lesson 18 §9 is the tuning procedure, in model order, each gain with its own graph
signature: `kG` from steady-state `AppliedVolts` while holding; `kV` from
`AppliedVolts ≈ kG + kV·v` on the flat cruise; `kA` from gaps that open on the ramps
and close on the cruise; `kP` last and small, backed off at the first oscillation.
Lesson 20 §9 points back at it and adds the arm's bonus — `cos θ` means `kG` can be
verified at five angles instead of one.

**Computing the gains — use the student-facing form, it is exact.** Two facts off
the Kraken X60 spec sheet (`DCMotor.getKrakenX60`: 12 V, 7.09 N·m stall, 366 A
stall, 6000 RPM free) collapse the whole thing to two constants:

- 6000 RPM on 12 V = 100 rot/s ⇒ **0.12 V per rotor rotation/sec** (speed)
- 7.09 N·m on 12 V ⇒ 12/7.09 = **1.69 V per N·m at the rotor** (torque)

Then, every time: *what does the mechanism need → divide by the gear ratio for what
the rotor needs → × 0.12 for a speed, × 1.69 for a torque.* Avoid the
kT/R/Kv_rad-per-volt formulation in lesson text; it gives the same answers with
more machinery, and the free-current term makes `Kv` 52.65 rather than 52.36, which
then *doesn't* reproduce the constants in the file.

| | derivation | = | in file |
|---|---|---|---|
| elevator `kV` | 12 × 0.12 | 1.440 | 1.44 |
| elevator `kG` | 5·9.81·0.0254 ÷ 12 × 1.69 | 0.176 | 0.18 |
| elevator `kA` | 5·(2π·0.0254)·0.0254 ÷ 12 × 1.69 | 0.0029 | 0.003 |
| arm `kV` | 50 × 0.12 | 6.000 | 6.0 |
| arm `kG` | 3·9.81·0.254 ÷ 50 × 1.69 | 0.253 | 0.25 |
| arm `kA` | (⅓·3·0.508²)·2π ÷ 50 × 1.69 | 0.0549 | 0.055 |
| drivetrain check | 6.75 × 0.12 | 0.810 | `kDriveKV` = 0.8 |

`GainsTest.publishedArithmeticProducesTheConstantsInTheFile` asserts this table, so
changing a mass, length, or gear ratio without redoing the gain fails a test.

`kS` is **0 in this course** — a frictionless sim can't show it — but Lesson 18
names it in a callout as the first gain to add on real hardware.

Lowering `kP` after adding the model was tried and rejected: sweeping the elevator
over 20/10/5/2 and the arm over 60/30/15 made tracking monotonically *worse* every
time. Keep `kElevatorKP = 20` and `kArmKP = 60`.

### Try-It safety

Both mechanism lessons carry a **"do these in simulation"** callout at the top of
their Try It sections, and the two most destructive items say so again inline. This
is not boilerplate — the experiments deliberately zero `kG`, invert `kG`, or bypass
`clampToTravel`, and on real hardware those mean a carriage that drops on enable or
an arm driven into its hard stop under power. Lesson 20's callout also notes that an
arm is the first mechanism in this course that can reach the student. Lesson 18 §9
carries a separate callout for tuning on real hardware (start mid-travel, keep
`kMaxVelocity`/`kMaxAcceleration` low until tracking looks right, stand clear, hand
on disable). Keep all of this when editing, and add it to any future lesson whose
Try It breaks a safety layer on purpose.

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
- [x] **Lesson 18's link to `19-mechanism2d.md`** — resolved; Lesson 19 landed
      under exactly that filename.
- [x] **Lesson 19's link to `20-intake-arm.md`** — resolved; Lesson 20 landed
      under exactly that filename.
- [x] **Lesson 20's link to `21-limit-sensors.md`** — resolved; Lesson 21 landed
      under exactly that filename.
- [ ] **Lesson 21 ends with a link to `22-light-sensors.md`, which does not exist
      yet.** Dead until 22 lands; keep the filename.
- [x] README row for 18.
- [x] README rows for 19, 20 and 21.
- [ ] Add a README row for 22 when it lands.
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

# Lesson 19 — A picture of the elevator — DONE

Shipped as [lessons/19-mechanism2d.md](lessons/19-mechanism2d.md), code in
[code/lesson-19/](../code/lesson-19/) (`Constants.java`, `subsystems/Elevator.java`
— nothing else changes).

**Goal as built:** Draw the elevator as a live stick figure, and hang a second,
smaller ligament off the top of it — the exact attachment point Lesson 20's arm
takes over.

**New Java concept (as built):** composition as attachment. `append(...)` is a
scene graph: attach a child and moving the parent moves it for free, every tick,
with no extra code. Section 5 is built entirely around "count the ligaments you
just updated: one. There are two in the picture."

**One deviation from this outline, and it matters:** the plan said publish it the
`Field2d` way — build in the constructor, `SmartDashboard.putData` once. Don't.
**AdvantageKit ships `LoggedMechanism2d` / `LoggedMechanismRoot2d` /
`LoggedMechanismLigament2d`** (package `org.littletonrobotics.junction.mechanism`)
with an API identical to WPILib's, plus a
`Logger.recordOutput(String, LoggedMechanism2d)` overload. That makes the drawing
a logged *output* rather than a dashboard widget, so it replays like everything
else since Lesson 13 — which is the whole reason this course has an IO layer.
Using WPILib's `Mechanism2d` here would have shipped the one thing on the robot
that a replay can't show you. Consequences:

- No constructor on `Elevator`; the drawing is fields plus one `recordOutput` in
  `periodic()`. Simpler than the `Field2d` version, not more complex.
- `recordOutput` must be called **every tick** — it serializes current state.
  (Try-it #4 has the student break exactly this on purpose.)
- CLAUDE.md's "`putData` for a widget is the one sanctioned SmartDashboard use"
  still stands for `Field2d` in Lesson 11; it just doesn't apply here.
- `LoggedMechanism2d.logOutput` writes `.type = "Mechanism2d"`, the same sendable
  marker WPILib's does, so SimGUI renders it too — under **NetworkTables →
  AdvantageKit → RealOutputs → Elevator → Mechanism**. Both viewers work, same
  as Lesson 11.

**Verified API** (from the akit-java 26.0.2 jar and a JUnit test in the sandbox):

- `new LoggedMechanism2d(double, double)` and `(Distance, Distance)`; optional
  trailing `Color8Bit` background on both.
- `mech.getRoot(String, double, double)` → `LoggedMechanismRoot2d`. **Doubles
  only** — no measure overload, so `kDisplayWidth.in(Meters) / 2` is a genuine
  unpack boundary.
- `new LoggedMechanismLigament2d(String, double length, double angleDeg)` and
  `(String, Distance, Angle)`; both have a 5-arg form adding
  `double lineWeight, Color8Bit`.
- `append(T)` returns `T` (declared on `LoggedMechanismObject2d` and repeated on
  the root), which is what lets `m_carriage = m_base.append(new ...)` be one
  statement. **This is the lesson's payoff — verified by test:** setting the
  parent's length leaves the child's own length and angle untouched.
- `setLength(double|Distance)`, `setAngle(double|Rotation2d|Angle)`,
  `setColor(Color8Bit)`, `setLineWeight(double)`, plus getters.
- `Color`/`Color8Bit` are in `edu.wpi.first.wpilibj.util`. `Color.kOrange` and
  `Color.kLimeGreen` both exist; `new Color8Bit(Color)` is the conversion.

**Try it (as shipped):** color by height band; a fixed third ligament on the root
as a travel reference; wiggle the effector with
`Math.sin(Timer.getFPGATimestamp())` to show a child's angle is its own while its
position is the parent's; move `setLength` out of `periodic()` to see the drawing
freeze; replay the picture.

---

# Lesson 20 — Intake arm: a mechanism that swings — DONE

Shipped as [lessons/20-intake-arm.md](lessons/20-intake-arm.md), code in
[code/lesson-20/](../code/lesson-20/) (`Constants.java`, `RobotContainer.java`,
`subsystems/Arm*.java`, and a small edit to `subsystems/Elevator.java`).

**Goal as built:** a third mechanism on Lesson 13's spine, mounted into Lesson
19's picture in place of the placeholder, with gravity that varies by angle.

**Resolved research flags**

- **The angle convention agrees end to end — verified in source, not docs.**
  Phoenix's `GravityTypeValue.Arm_Cosine` javadoc: "the sensor reports a position
  of 0 when the mechanism is horizontal (parallel to the ground), and the
  reported sensor position is 1:1 with the mechanism." WPILib's
  `SingleJointedArmSim.updateX` applies `alphaGrav = 3/2 · (−9.8) · cos(θ) / L`,
  i.e. **θ measured from horizontal, positive CCW** — the same sense as
  `Rotation2d` and Lesson 19's ligaments. Nothing needs a sign flip anywhere.
  The lesson turns that shared requirement into a teaching beat rather than a
  footnote: zero-is-horizontal is imposed on you, and a bad zero makes `kG`
  fight the arm.
- **`SingleJointedArmSim(DCMotor gearbox, double gearing, double jKgMetersSquared,
  double armLengthMeters, double minAngleRads, double maxAngleRads, boolean
  simulateGravity, double startingAngleRads, double... measurementStdDevs)`**,
  plus `static estimateMOI(lengthMeters, massKg)` = `1/3·m·L²` (uniform rod about
  its end). `getAngleRads()` / `getVelocityRadPerSec()`, and it pins hard at both
  limits.
- **`SoftwareLimitSwitchConfigs`**: `Forward/ReverseSoftLimitEnable` +
  `Forward/ReverseSoftLimitThreshold`, thresholds in **rotations** (mechanism
  rotations, given `SensorToMechanismRatio`). Output goes neutral in the blocked
  direction only.
- **maple-sim's `IntakeSimulation` was deliberately left out.** The lesson was
  already carrying Arm_Cosine, soft limits, a second unprofiled motor, and the
  ligament swap. Game pieces belong to Lesson 22, which is where the appendix's
  `gamePiecesInIntakeCount` beam-break signal earns its place.

**Design decisions worth not re-litigating**

- **`Arm`'s constructor takes `Elevator`** and calls
  `elevator.getCarriage().append(...)` — a new one-line public accessor on
  `Elevator` returning the carriage ligament. This is the payoff Lesson 19 set
  up: the arm rides the elevator with no code computing that, because the
  ligament is attached. `RobotContainer` declares `m_arm` after `m_elevator`, and
  now for a hard reason (the field is read), not just tick order.
- **`ElevatorConstants.kCarriageAngle = Degrees.of(90)`** was added so the 90° the
  carriage points at exists in one place; `Arm.toDrawingAngle` subtracts it to go
  from a world angle to a parent-relative ligament angle. Lesson 19's
  `m_effector` and `kEffectorLength` are deleted here.
- **Lesson 19's closing line was amended.** It had promised the elevator's code
  would not change at all in Lesson 20, which is false — it gains `getCarriage()`
  and loses the placeholder. It now promises what is true: the two lines that
  move the carriage don't change.
- **The roller shares the subsystem** and runs on plain `m_roller.set(fraction)`,
  the Lesson 1 control style. `runRoller` has no `.until(...)` — nothing to
  arrive at — and uses `finallyDo` to stop, because unlike the pivot (whose
  Phoenix request holds position by itself) a roller left spinning stays spinning.
  Try-it #5 has the student collide the roller and pivot commands on purpose and
  observe that the arm keeps swinging anyway.
- **Full feedforward set**, per the corollary under decision 2: `kArmKG = 0.25`,
  `kArmKV = 6.0`, `kArmKA = 0.055`, `kArmKP = 60`. `kS` stays 0 (frictionless sim).

**Verified numbers (real-time sim, `ArmTest`)**

`kArmKG = 0.25 V` is computed, not guessed: `m·g·(L/2)` = 3 kg · 9.81 · 0.254 m
= 7.48 N·m at the arm, /50 = 0.150 N·m at the rotor, /kT (7.09/366 = 0.0194
N·m/A) = 7.7 A, × R (12/366 = 0.0328 Ω) = **0.253 V**. Measured holding voltage
vs. `kG·cos θ`:

| angle | applied V | `kG·cos θ` |
|---|---|---|
| 0° | +0.25 | +0.25 |
| 45° | +0.18 | +0.18 |
| 90° | 0.00 | 0.00 |
| 135° | −0.18 | −0.18 |
| 180° | −0.25 | −0.25 |

Also verified: uncommanded the arm falls to −20° at 0 V; both soft limits hold
(commanded −90° → stops at −20.0°, commanded 270° → stops at 179.8°); the roller
reaches 60.3 rot/s at 0.6 output and coasts to 0.

**⚠ Timing trap in Phoenix sim tests — this cost real time, don't repeat it.**
A JUnit loop that calls `m_model.update(0.020)` but sleeps only 4 ms of wall
clock advances the *physics* 5× faster than the *firmware* clock, because
Phoenix's simulated firmware runs against real time. Everything then looks like a
starved control loop: the elevator appeared to peak at 0.365 m/s against a 1.0
m/s cruise, and the arm crawled at 40°/s against 180°/s. That reads exactly like
a missing velocity feedforward, and it is not — adding `kV` changed the peak by
nothing once the timing was fixed. **Sleep the full 20 ms** (or otherwise keep
wall time and physics time in step) in any test that judges profile tracking.
With that corrected, Lesson 18's elevator does trace the trapezoid its §8
describes (peak 1.32 m/s, settles at 1.450 m, holds at 0.17–0.18 V = `kG`), and
the arm swings −20°→180° in about 1.5 s. **Lesson 18 needed no change.**

Second, smaller trap: **Phoenix's simulated devices are keyed by CAN ID and
outlive a single JUnit test.** Reusing an ID across tests leaks the previous
test's control request into the next one, which produced a genuinely baffling
"uncommanded arm holds itself horizontal at 0.25 V." Give every test its own IDs.
(TalonFX IDs must also be ≤ 62; `new TalonFX(70)` throws `IllegalArgumentException`.)

---

# Lesson 21 — Homing: finding out where you actually are — DONE

Shipped as [lessons/21-limit-sensors.md](lessons/21-limit-sensors.md), code in
[code/lesson-21/](../code/lesson-21/) (`Constants.java`, `RobotContainer.java`,
`subsystems/Elevator*.java` — the arm is untouched).

**Goal as built:** a limit switch that establishes the elevator's zero at
power-on, plus `Trigger` generalized off the controller.

**The framing that makes it work.** Do *not* open with "here is a DigitalInput."
Open with the uncomfortable fact: a TalonFX's built-in encoder is **relative**, so
`HeightMeters == 0.00` at boot means "counting started here," not "the carriage is
down." Everything since Lesson 18 has been silently building on that — `clampToTravel`
clamps a shifted range, and the arm's `cos θ` is computed from a `θ` that isn't the
real one, so `kG` pushes the wrong way. Nothing errors; the mechanism is
confidently, precisely wrong. That pays off Lesson 20's closing line and Lesson 5's
CANcoder in one move.

**Fail-safe wiring is derived, not asserted.** The roboRIO pulls DIO high, so a
cut wire reads `true`. Therefore the reading that means "keep going" must be the one
requiring a working wire ⇒ **normally-closed to ground**, ⇒ `get() == true` is "at
the limit," ⇒ a broken wire looks exactly like a pressed switch, which is the safe
failure. Note this is the *opposite* of the `!get()` convention the earlier outline
assumed — derive it, don't repeat folklore.

**The sim change is the pedagogical centre.** `ElevatorIOSim` had been feeding the
encoder the model's absolute height, which made the simulated encoder *better than
real hardware*. Now it feeds `truth − kSimStartHeight` (a relative encoder can only
report movement since power-on) while the switch reads plain `truth`. Encoder =
belief, switch = fact, homing = the moment one replaces the other.

- **Do this by subtracting the start height, not by calling `m_motor.setPosition(0)`
  in the sim constructor.** The constructor version worked intermittently — the
  offset needs a tick to propagate, so whether the first `updateInputs` saw 0.00 or
  0.35 depended on timing. The subtraction is deterministic. (`setPosition` *does*
  hold as a persistent offset once applied — verified over hundreds of ticks of
  continued raw feeding — it just isn't instant.)

**Verified numbers** (`HomingTest`, real time, one IO instance):

| | |
|---|---|
| boot | encoder `+0.000 m`, truth `0.35 m`, switch false |
| homing descent | ~9 cm/s at `kHomingVolts = −0.7 V` |
| switch trips | 3.9 s in, encoder reading `−0.339 m` |
| after `setPositionMeters` | `0.0083 m` — 0.349 m of error deleted |
| then commanded 0.75 m | encoder `0.750 m` |
| held against the stop at −3 V | **120.7 A** stator, 0.0000 m/s |

**Design notes**

- `home()` is `run(...).until(this::atBottomLimit).finallyDo(...)` — Lesson 18's
  `goToHeight` shape with a *sensor* as the stop condition. `finallyDo` order
  matters: kill voltage, then reset the encoder, then set `m_goal` so `atGoal()`
  doesn't immediately disagree. Ending at 0 V is correct — the carriage rests on
  its hard stop.
- Homing is **open loop** (`VoltageOut`), because the position is the thing being
  established. First and only use of `VoltageOut` in the course.
- `rezeroAtBottom()` is `Commands.runOnce(...).ignoringDisable(true)` — **no
  subsystem requirement**, deliberately, so a switch brush can't cancel the
  driver's motion; and it fires while disabled because that's when someone pushes
  the carriage by hand. Both choices are taught explicitly.
- File order in `Elevator.java` is `home` → `acceptBottomLimit` → `atBottomLimit`
  → `rezeroAtBottom`, matching the order §5 and §6 add them. (§6's lead-in says
  "below `atBottomLimit`" for exactly this reason — the block-verbatim audit
  catches it if that drifts.)
- Current sensing is *taught* in §9 with the measured 120 A figure and an
  illustration snippet, but **not shipped** — Try It #3 is the student building it.
  `statorCurrentAmps` is logged regardless, since a motor drawing current with
  nothing to show for it is what a jam looks like in a log.
- §9 also closes the absolute-vs-relative loop: an arm sweeps under one rotation,
  so it can carry a CANcoder and never have a wrong zero — which is the better
  answer to Lesson 20's `Arm_Cosine` warning where the geometry allows it. Rule of
  thumb stated: under one turn ⇒ measure absolutely, otherwise ⇒ home.

**Test-harness gotchas** (on top of the ones under Lesson 20)

- `DigitalInput` holds its DIO channel for the life of the JVM and `HAL.shutdown()`
  does not reliably free it, so a second `ElevatorIOSim` in the same test class
  throws `AllocationException`. Write this as **one sequential scenario** with a
  single IO instance.
- `setPositionMeters` needs **two** ticks before the new value reads back.

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
