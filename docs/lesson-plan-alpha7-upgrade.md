# Upgrade plan: WPILib 2027 alpha-7

**This is a contributor document, not lesson content** — it lives beside
`docs/lessons/`, never inside it, and nothing here should be pasted into a
lesson as-is.

[WPILib 2027.0.0 alpha-7](https://github.com/wpilibsuite/allwpilib/releases/tag/v2027.0.0-alpha-7)
shipped with a large set of breaking changes. This doc is the impact
assessment, the phased plan for adopting it, and the record of the
vendor blocker that gates actually starting — plus the automated check that
watches for that blocker to clear (see [Monitoring](#monitoring) at the
bottom). **Nothing in the v3 track gets edited off this doc alone** — per
this repo's standing rule, lessons get verified against the real compiled
jars via `tools/verify-lessons-v3.sh`, not rewritten from guesses about what
an API now looks like. This doc identifies *where* to look once that's
possible; it doesn't pre-guess the fixes.

## Scope: the v3 (OpMode) track only

The classic numbered track (`docs/lessons/00-*.md` … `34-*.md`) targets
**WPILib 2026**, the stable release. Alpha-7 is a 2027 alpha and has zero
effect on it. Everything below is about `docs/lessons/v3/` and
`code/OpModeV3Robot` / `code/v3/lesson-N/` only.

**Update, 2026-09-18: Phase 1a has landed.** Phoenix 6 published an
alpha-7-compatible, marketplace-pinned release (`26.70.0-alpha-2`, in the
`vendor-json-repo`'s `2027_alpha7` bucket), clearing Track A's gate — see the
[vendor tracking table](#vendor-tracking) below for how this was verified.
`code/OpModeV3Robot/build.gradle` now pins
`org.wpilib.GradleRIO version "2027.0.0-alpha-7"`, `vendordeps/CommandsV3.json`
is re-synced to the real alpha-7 file (`wpilibYear` and the `commandsv3-java`
artifact ID both moved), `settings.gradle` and `.wpilib/wpilib_preferences.json`
follow the same year, and `tools/verify-lessons-v3.sh`'s `MARKETPLACE` /
Phoenix6 entry point at the alpha-7 bucket (`photonlib` deliberately still
points at the alpha-5 bucket — Track B's job, see
[Splitting the gate](#splitting-the-gate-lessons-114-dont-need-photonvision)).
Lessons 0 through 14 — every intermediate stopping point, not just the
rollup — compile clean with zero warnings via
`./tools/verify-lessons-v3.sh N` for each `N` in that range. Track B
(Lessons 15–34, PhotonVision) is still blocked; nothing there was touched.
See [Phase 1a](#phased-plan) below for the full list of what actually broke
and how each was fixed — it is the real, unguessed inventory this doc's
earlier sections predicted, superseding the "likely affected" language in
[What alpha-7 actually changed](#what-alpha-7-actually-changed) for anything
in Lessons 1–14.

**Update, 2026-09-24: Track B's vendor blocker is gone — the v3 track
switched vision from PhotonVision to LimelightLib 2.** User decision, after a
verified exploration: LimelightLib 2 (`com.limelightvision`, pure Java)
publishes an alpha-7 build (`2.0.0-beta9-alpha7`, `wpilibYear: 2027_alpha7`),
and Systemcore runs Limelight's vision on up to four plain USB cameras
(`Limelight.SYSTEMCORE_USB0`–`3`, NetworkTables names `limelightsc0`–`3`).
It is **not** in WPILib's marketplace, and Limelight's own
`LimelightLib-alpha7.json` URL is a moving link — the same file name was
overwritten five times, beta5 → beta9, between 2026-09-04 and 2026-09-11 —
so `tools/verify-lessons-v3.sh` pins it by **commit** instead:
`raw.githubusercontent.com/LimelightVision/limelightlib-public/717a921719f5dbaf4ce940819e2d84bdab8738b9/LimelightLib-alpha7.json`.
Limelight's Maven repo keeps every published version (beta2 through beta9
are all still there), so an old pin stays buildable. **Lesson 15 is migrated
and verified**: `./tools/verify-lessons-v3.sh 15` compiles 0–15 with zero
warnings, and the vision chain was exercised end to end in desktop sim (see
the restructure plan's R2 section for the measurements). Track B is now
blocked on **nothing vendor-side** — Lessons 16–34 are simply pre-alpha-7
code awaiting Phase 1b (`verify-lessons-v3.sh 16` now fails on
`extends Mechanism`/`SmartDashboard`, not on a vendordep). Two alpha-7 facts
Phase 1b will need that only surfaced here: **`AprilTagFieldLayout` and
`AprilTagFields` are gone** — the field is now
`org.wpilib.fields.Field.loadField(Fields.DEFAULT_FIELD)`, tags are
`FieldTag` (`getID()`, `getPose()`), and `Field.getTagPose(int)` still
returns `Optional<Pose3d>` (Lesson 28's `tagPosition` keeps its shape); and
**`Rotation2d.kZero` doesn't exist** in alpha-7 (`k180deg` does).

## What alpha-7 actually changed

Read straight off the [release notes](https://github.com/wpilibsuite/allwpilib/releases/tag/v2027.0.0-alpha-7).
Grouped by relevance to this course, most disruptive first.

### High impact — touches most or all lessons

- **`SmartDashboard`, `SendableChooser`, and `Sendable` replaced with
  Telemetry and Tunables APIs.** This is the single biggest risk to the v3
  track's pedagogy. Lesson 3 (`docs/lessons/v3/03-telemetry.md`) teaches
  `SmartDashboard.putNumber("Mechanism/Name", value)` as *the* telemetry
  idiom specifically because AdvantageKit doesn't support `OpModeRobot` yet
  (see `docs/lesson-plan-opmode-restructure.md`) — that design decision is
  recorded in `docs/lesson-plan-v3-0-3.md`. Every lesson from 3 onward reuses
  it. 25 files under `docs/lessons/v3/` reference `SmartDashboard`. **If the
  old API is gone rather than deprecated-but-present, Lesson 3's entire
  approach needs to be reconsidered** — not just search-and-replaced —
  before any downstream lesson can be touched. Flagged as an open decision
  below, not something to resolve on a guess.
- **Main class architecture reverted to a factory loader.** `Main.java`
  currently does `RobotBase.startRobot(first.robot.Robot.class);`
  (`code/OpModeV3Robot/src/main/java/first/Main.java`). The release notes
  say this needs a manual fix (`Robot.class` → `Robot::new`, or a new
  project template). This is the base template every lesson snapshot rolls
  onto, plus it's Lesson 0's own subject matter — the boot sequence
  (`docs/lessons/v3/00-orientation.md`) explains this exact line.
- **All CAN device classes now take a `CANPort` enum** instead of a bare
  int ID. Every module lesson constructs hardware this way — 9 hits across
  `docs/lessons/v3/` for `CANBus.systemcore(...)` / `new TalonFX(...)` /
  `new CANcoder(...)` / `new Pigeon2(...)`, starting at Lesson 1. Whether
  this is a WPILib-HAL-only change or also reaches CTRE's `TalonFX`/
  `CANcoder` constructors (vendor classes, not WPILib's) is exactly the kind
  of thing that has to be checked against the real jar, not assumed — Phoenix
  6 has its own CAN ID conventions independent of WPILib's HAL devices.

### Medium impact — concentrated in a few lessons, but changes what's taught

- **`Mechanism` is now an interface (was a class).** 10 files `extends
  Mechanism` today (`SwerveModule`, `Elevator`, `Arm`, `Flywheel`, and
  others across Lessons 1–29). At minimum every one becomes `implements
  Mechanism`; whether the interface still ships default methods for
  `run(...)`/`runRepeatedly(...)`/etc. the way the class did needs checking
  against the real Commands V3 jar (the way Lesson 34 read `SysIdRoutine`
  out of bytecode with `javap` rather than guessing).
- **Gamepad face-button trigger APIs renamed to directional names**
  (`faceUp`/`faceDown`/`faceLeft`/`faceRight`, replacing
  `southFace`/`northFace`/`eastFace`/`westFace`). 8 hits across
  `docs/lessons/v3/`, concentrated in Lessons 1, 5, 6, 8. **This also
  touches the presentation decks** under
  `docs/presentations/v3/template/build/` — several code cards show
  `.southFace()`/`.northFace()`/`.eastFace()` verbatim and will need the
  same rename once the mapping is confirmed.
- **A default deadband is now applied to all gamepads.** This is a
  pedagogy problem, not a mechanical one: Lesson 2
  (`docs/lessons/v3/02-joystick-control.md`) exists specifically to teach
  students to write `applyDeadband` themselves, from `if`/`Math.abs`/
  `return`. If the raw axis getter now comes pre-deadbanded, the lesson's
  worked example may no longer demonstrate the problem it's meant to
  demonstrate. Needs a decision, not a patch — see
  [Open decisions](#open-decisions-for-the-team).
- **"Multiple periodic callbacks in the same scope" now supported**, and
  **fork/await failures can be handled by user code**. Both are additive —
  nothing breaks — but the second one is worth a look for Lesson 9
  (`coroutine.await(...)`) once the real API is in hand: it may be worth a
  Try It or a callout rather than a rewrite.

### Low impact — narrow surface, or affects lessons not yet reached by this track

- **`ALL_CAPS` constants for WPILib's own enumerated values.** Affects any
  place the course references a WPILib-owned enum constant by its old
  mixed-case name. Narrow surface in the v3 track today (most
  student-facing enums referenced so far — `SensorDirectionValue`,
  `GravityTypeValue` — are CTRE Phoenix types, not WPILib's own, so likely
  unaffected; needs a targeted grep once the alpha-7 jars are available
  rather than a guess here).
- **`AprilTagFields` folded into an integrated `Fields` class; AprilTag
  library moved to vendordeps.** Not yet relevant — the v3 track's vision
  content (Lesson 15 `photonvision.md`, Lesson 28 `aim-at-tag.md`) is
  already written and would need this checked when touched, but nothing
  upstream of it changes today.
- **`Alert` moved from HAL/wpilib to wpiutil.** Affects Lesson 30, was 31
  (`docs/lessons/v3/30-alerts.md`). Likely just an import path change; worth
  confirming rather than assuming.
- **Timestamps now nanoseconds instead of microseconds; `Preferences`
  moved to its own package; `usage reporting` API added.** No known
  course-facing surface today — nothing in the v3 lessons manually handles
  raw timestamps or reads `Preferences`.
- **C++ toolchain requirements (C++23, MSVC 2026, G++ 14).** This course is
  Java-only end to end; not applicable.

## The vendor blocker

This is the reason the plan below has a Phase 0 and nothing else yet, and
the reason for the monitoring process at the bottom. Checked directly
against the real sources on 2026-09-01:

- **WPILib's own vendordep marketplace** — `wpilibsuite/vendor-json-repo`,
  the repo this course's `tools/verify-lessons-v3.sh` pins every vendordep
  URL against (`CLAUDE.md`'s rule: *pin to the marketplace, never a
  vendor's own "latest" link*) — has folders for `2027_alpha1` and
  `2027_alpha5` only. **No `2027_alpha6` folder exists yet, let alone
  `2027_alpha7`.** This is true even though the course's own `build.gradle`
  already points GradleRIO at alpha-6 — the vendordeps just haven't
  followed.
- **CTRE Phoenix 6** — the course's Lesson-1 vendordep
  (`Phoenix6-26.50.0-alpha-1.json`, currently pinned from the marketplace's
  `2027_alpha5` bucket) — has no published release tagged for alpha-6 or
  alpha-7 compatibility yet, per
  [CTRE's own compatibility notes](https://raw.githubusercontent.com/wpilibsuite/SystemCoreTesting/main/CTR-Phoenix.md).
- **PhotonVision** — the course's Lesson-15 vendordep
  (`photonlib-v2027.0.0-alpha-2.json`) — is a step closer: its changelog
  notes an internal "upgrade to wpilib alpha-6," but that release hasn't
  been re-pinned into the marketplace's vendordep JSON format under an
  `alpha6`/`alpha7` bucket, so under this course's own rule (marketplace
  pins only) it isn't adoptable yet either.
- **`CommandsV3` — correction: this one isn't vendor-blocked at all.** It
  ships baked into `code/OpModeV3Robot/vendordeps/CommandsV3.json` rather
  than fetched from the marketplace (`tools/verify-lessons-v3.sh` says so
  directly: "copied from wpilib source directly"), and that copy is just
  stale — still declaring `wpilibYear: "2027_alpha5"`. Checked directly
  against `wpilibsuite/allwpilib` at the actual `v2027.0.0-alpha-7` git tag:
  [`commandsv3/CommandsV3.json`](https://raw.githubusercontent.com/wpilibsuite/allwpilib/v2027.0.0-alpha-7/commandsv3/CommandsV3.json)
  already declares `"wpilibYear": "2027_alpha7"` there. **Nobody is waiting
  on this one** — it's a same-repo re-sync away, whenever the rest of Phase
  1a (below) is ready to move.

**Bottom line, corrected — this isn't one blocker, it's two independent
ones gating two different parts of the track**, and they don't have to
clear together. See [Splitting the gate](#splitting-the-gate-lessons-114-dont-need-photonvision)
just below for why, and the [Phased plan](#phased-plan) for how that
changes the order of work.

### Verified directly: how far the lessons actually get today

The question "how far ahead could we go" deserves a real answer, not a
guess extrapolated from the bullets above — so this was tested directly
(2026-09-02) rather than reasoned about. GradleRIO 2027.0.0-alpha-7's own
plugin *is* published (Gradle Plugin Portal), so a real build was attempted:
`code/OpModeV3Robot`, copied to scratch and pointed at
`org.wpilib.GradleRIO version "2027.0.0-alpha-7"`, rolled forward through
Lessons 0–14 with `tools/verify-lessons-v3.sh` (unmodified — same
`Phoenix6-26.50.0-alpha-1.json` pin it always fetches).

**The answer is sharper than "blocked": it's a hard gate, not a graduated
one.** GradleRIO refuses to configure the build at all — before touching a
single line of lesson Java — the moment it sees a vendordep whose
`wpilibYear` doesn't match its own version:

```
Vendor Dependency Commands v3 has invalid year 2027_alpha5. Expected to be
2027_alpha7. Reach out to the vendor to get a new version of the
dependency. Attempting to modify an existing dependency will break at
runtime, and will result in loss of support from the WPILib team.
```

That's not a hint that *some* code might not work — it's the build tool
itself declining to build anything, for **every** lesson, including
Lesson 0. Whether a given lesson's actual Java would have compiled clean
against the real alpha-7 classes is a question the build never gets far
enough to ask.

Out of curiosity — and only as an unsupported, sandbox-only diagnostic,
never something to actually ship — the `wpilibYear` fields in
`CommandsV3.json` and the fetched `Phoenix6-*.json` were hand-patched to
`2027_alpha7` locally, exactly the move GradleRIO's own error message warns
against, purely to see what's underneath the gate. It surfaced a second,
independent finding: **`code/OpModeV3Robot`'s `build.gradle` itself won't
configure against the real alpha-7 GradleRIO plugin either**, gate aside.
Three build-tooling DSL breaks turned up in the first minute of poking, each
one a *different* removed property/method on WPILib's own Gradle extension
classes, not a vendor or lesson-code issue:

- `wpi.java.debugJni = false` — `debugJni` no longer exists on
  `WPIJavaExtension`.
- `deployArtifact.jarTask = shadowJar` — `jarTask` no longer exists on
  `WPILibJavaArtifact`.
- `wpi.java.configureExecutableTasks(shadowJar)` — the method itself is
  gone from `WPIJavaExtension`.

Deleting each in turn just exposed the next one — this is the deploy/jar
wiring the alpha-7 release notes' "main class architecture reverted to a
factory loader... requires a manual fix... new project template" line was
warning about, and it goes deeper than the one line the release notes
called out by name. Guessing the replacement shape property-by-property
from here on would be exactly the kind of unverified API-shape guessing
`CLAUDE.md` rules out — a search for a real WPILib-published alpha-7
`OpModeRobot` template turned up nothing yet (checked 2026-09-02), so this
line of investigation stopped rather than fabricate one.

**So: zero lessons verify against alpha-7 today** — not "Lessons 1–14 work
and 15+ doesn't," the honest answer given what's actually checkable right
now. Clearing the vendor-year gate is necessary but might not be sufficient
on its own; `code/OpModeV3Robot`'s `build.gradle` likely needs its own real
update against the new deploy-artifact API before *anything* rebuilds,
template in hand rather than guessed. Worth re-running this same experiment
once the gate clears for real, since a genuine vendor-published alpha-7 pin
will very likely arrive bundled with guidance (or a new template) for
exactly this wiring.

### Splitting the gate: Lessons 1–14 don't need PhotonVision

Team decision (2026-09-02): **don't wait for both vendors together.** Fire
on Phoenix 6 alone, and take the track as far as it goes — which is
Lesson 14, the last one before PhotonVision enters at Lesson 15. This is a
real split, not a shortcut: `tools/verify-lessons-v3.sh`'s own
`VENDORDEPS` table only fetches `photonlib-*.json` from Lesson 15 onward,
so a `verify-lessons-v3.sh 14` run never touches it — PhotonVision
genuinely isn't in the dependency graph for the first 15 lessons.

That gives two independent tracks instead of one combined wait:

- **Track A — Lessons 1–14.** Gated on **Phoenix 6 alone** getting a
  marketplace-pinned release with a matching `wpilibYear` — *plus* the two
  same-repo prerequisites that have nothing to do with any vendor and can
  be worked in parallel while Track A is still waiting: refreshing the
  stale local `CommandsV3.json` (see the correction above — already
  possible the moment it's worth trying, just not worth doing alone, since
  pairing a `wpilibYear` bump with an unbumped `GradleRIO` plugin version
  trips the exact same hard gate in the other direction), and finding or
  reconstructing the fixed `build.gradle` deploy-artifact wiring
  ([Verified directly](#verified-directly-how-far-the-lessons-actually-get-today)
  above). **"Phoenix ready" starts the attempt, it doesn't guarantee the
  attempt succeeds** — those other two pieces are real, open unknowns
  independent of Phoenix's status, and Phase 1a below still ends at
  `verify-lessons-v3.sh 14`, not a guess that it'll pass first try.
- **Track B — Lessons 15–34.** Everything Track A needs, *plus* PhotonVision
  with its own marketplace-pinned, matching-year release. Stays fully
  blocked until both vendors are ready, same as the original combined plan.

The [monitoring](#monitoring) and [vendor tracking](#vendor-tracking)
sections below are updated to watch and report the two tracks separately,
so Track A going green doesn't sit hidden behind Track B still being red.

## Phased plan

**Phase 0 — now, no vendor dependency (this doc + monitoring).** Done by
this commit: the impact assessment above, and the recurring check described
in [Monitoring](#monitoring). No lesson file, snapshot, or deck changes yet.

**Phase 1a — Lessons 1–14, fires on Track A alone
([split above](#splitting-the-gate-lessons-114-dont-need-photonvision)) —
does not wait for PhotonVision.**
1. Refresh `code/OpModeV3Robot/vendordeps/CommandsV3.json` from
   `wpilibsuite/allwpilib`'s `commandsv3/CommandsV3.json` at whatever tag
   matches the target alpha (already confirmed current at the alpha-7 tag —
   re-check if the target has moved past alpha-7 by the time this runs).
2. Bump `code/OpModeV3Robot/build.gradle`'s GradleRIO version to match —
   and expect this step to be more than a version-string edit. The
   [direct test above](#verified-directly-how-far-the-lessons-actually-get-today)
   found the deploy-artifact wiring (`debugJni`, `jarTask`,
   `configureExecutableTasks`) already broken against alpha-7's real
   plugin; look for whatever WPILib publishes as the new template's
   `build.gradle` and diff against it rather than reconstructing the new
   shape property-by-property.
3. Bump `MARKETPLACE` and just the `Phoenix6` entry in the `VENDORDEPS`
   table in `tools/verify-lessons-v3.sh` to the new marketplace bucket and
   file name. Leave the `photonlib` entry alone — Track B's job.
4. Run `./tools/verify-lessons-v3.sh 14` and read the compiler's error
   list — that list *is* the real, unguessed inventory of what broke in
   Lessons 1–14, superseding every "likely affected" note in this doc.
5. Fix lesson snapshots (`code/v3/lesson-N/`) in lesson order for N = 1
   through 14, verifying with `./tools/verify-lessons-v3.sh N` after each
   one, the same lesson-by-lesson discipline `CLAUDE.md` already prescribes
   for normal lesson edits.

**Done, 2026-09-18.** Steps 1–3 above, plus `settings.gradle` and
`.wpilib/wpilib_preferences.json`'s `wpilibYear`/`projectYear` (not called
out by name above, but the same kind of version pin). Step 4's real,
unguessed error list from `./tools/verify-lessons-v3.sh 14` was 25 compiler
errors, all falling into six categories — verified against the real alpha-7
jars with `javap` (`commandsv3-java`, `wpilibj-java`, `telemetry-java`,
`wpiapi-java` in the local Gradle cache), never guessed from the release
notes alone:

- `Mechanism` is an interface now, and — checked directly — it still ships
  every default method Lessons 1–14 call (`run`, `runRepeatedly`,
  `setDefaultCommand`, `idle`, `getName`, …) with identical signatures. Every
  `class X extends Mechanism` became `implements Mechanism` (or
  `implements Mechanism, PoseProvider` where a second interface was already
  there); nothing else about those classes needed to change.
- `SmartDashboard` is genuinely gone, replaced by `org.wpilib.telemetry.Telemetry`.
  `Telemetry.log(path, value)` covers every primitive overload
  `putNumber`/`putString`/`putBoolean` had, and — confirmed by disassembling
  `Telemetry.log(String, Object)` — a `TelemetryLoggable`-implementing widget
  (checked: `Field2d` implements it) dispatches through `logTo(...)` the same
  way `SmartDashboard.putData` used to, so `putData("Field", m_field)` became
  `Telemetry.log("Field", m_field)` directly. **This is a mechanical,
  code-only substitution to get Lessons 1–14 compiling — it is not the
  pedagogical decision [Open decisions #1](#open-decisions-for-the-team)
  asks for**, and that decision (rewrite Lesson 3 around `Telemetry` natively,
  or revisit AdvantageKit) is still open, still Phase 2's job, and still
  unresolved by this pass.
- CAN device construction: `CANBus.systemcore(int)` is gone from CTRE's own
  `CANBus` (checked directly against `wpiapi-java-26.70.0-alpha-2.jar` — this
  turned out to be a Phoenix 6 class, not a WPILib HAL one). It gained a
  `CANBus(org.wpilib.hardware.bus.CANPort)` constructor instead; the old
  `.systemcore(0)` becomes `new CANBus(CANPort.CAN_S0)`. `TalonFX`/`CANcoder`/
  `Pigeon2`'s own `(int, CANBus)` constructors are unchanged.
- Gamepad face buttons: `southFace()`/`eastFace()`/`northFace()`/`westFace()`
  renamed to `faceDown()`/`faceRight()`/`faceUp()`/`faceLeft()` on
  `CommandGamepad` — confirmed the direction mapping directly via `javap`
  rather than assuming the obvious compass-to-clock-position guess.
- `RobotBase.startRobot` now takes a `Supplier<T>`, not a `Class<T>` — the
  factory-loader revert the release notes named. `Main.java`'s
  `RobotBase.startRobot(first.robot.Robot.class)` became
  `RobotBase.startRobot(first.robot.Robot::new)`. This lives in
  `code/OpModeV3Robot` itself, not a lesson snapshot — no lesson ever ships
  its own `Main.java`.
- `build.gradle`'s deploy-artifact wiring: confirmed against GradleRIO's own
  `testing/java/build.gradle` fixture at the real `v2027.0.0-alpha-7` tag
  (cloned locally rather than guessed) — `debugJni` moved onto the
  `WPILibJavaArtifact` block itself, a new `wpi.java.runSimWithDebugJni`
  covers what the old blanket `wpi.java.debugJni` did for simulation, the
  `application` plugin replaces `com.gradleup.shadow` (deploy is a
  multi-jar classpath now, not a fat jar), and
  `deployArtifact.configureApplication(application)` /
  `wpi.java.configureApplication(application)` replace
  `deployArtifact.jarTask = shadowJar` / `wpi.java.configureExecutableTasks(shadowJar)`.
  The project's own backup-copy-into-the-jar behavior moved from the deleted
  `shadowJar {}` block onto a plain `jar {}` block, same contents.

Every one of these was checked against the real alpha-7 artifacts (a shallow
clone of `wpilibsuite/allwpilib` and `wpilibsuite/GradleRIO` at the
`v2027.0.0-alpha-7` tag, plus `javap` on the jars Gradle itself downloaded
into `~/.gradle/caches`) rather than inferred from the release notes or a
team's already-migrated `build.gradle` found by search — two of those
(`Drew-Robotics/2027beta`, `Hemlock5712/2027-Template`) were read for
corroboration only, and the actual edits are sourced from GradleRIO's own
`testing/java/build.gradle`, which is guaranteed in sync with the plugin
version because GradleRIO's own test suite builds against it.

`./tools/verify-lessons-v3.sh N` was then run for **every** `N` from 0
through 14 individually (not just the Lesson-14 rollup), confirming every
intermediate stopping point compiles — zero errors, zero warnings.

**Phase 1b — Lessons 15–34. No longer gated on a vendor (2026-09-24).**
Track B was waiting on PhotonVision; the v3 track switched vision to
LimelightLib 2 instead (see the 2026-09-24 update at the top), and Lesson 15
landed on it first. What remains is the same lesson-by-lesson fix as 1a,
starting at Lesson 16: run `./tools/verify-lessons-v3.sh N` for each `N`
and fix whatever the real compiler reports. Two lessons need more than a
port, because their PhotonVision-specific designs don't carry over to
Limelight on their own — **Lesson 34, was 27** (object detection: `PhotonCamera`
detections and a `VisionTargetSim` scene) and **Lesson 30, was 31** (camera
disconnect alert: its sim demo relied on `PhotonCamera.isConnected()`; the
Limelight equivalent, `Limelight.isConnected()`, is honest in sim, but
renaming a camera renames both the simulated publisher and the reader, so
the demo needs a different setup). Both are design calls for the user, not
mechanical ports. Re-run
`./tools/verify-lessons-v3.sh 34 test` once everything compiles, to catch
anything only a test surfaces.

> **The OpMode track was renumbered on 2026-10-20 (user decision).** Object
> detection moved from Lesson 27 to the end, Lesson 34, so it no longer holds
> up the lessons after it while it waits for PhotonLib. The lessons that
> followed it each moved down one:
>
> | Old | New | Lesson |
> |---|---|---|
> | 27 | 34 | Object detection |
> | 28 | 27 | Aim at tag |
> | 29 | 28 | Flywheel |
> | 30 | 29 | Current limits |
> | 31 | 30 | Alerts |
> | 32 | 31 | Testing |
> | 33 | 32 | Reading a log |
> | 34 | 33 | SysId |
>
> Records dated before 2026-10-20 in this doc, in
> `lesson-plan-opmode-restructure.md`, and in older commits use the **old**
> numbers. Outstanding work below uses the new ones. The classic track keeps
> its order, and the lesson text doesn't mention the difference.

**Lesson 16 migrated, 2026-09-27.** Compiles 0–16 with zero warnings; the
real `Robot` boots and drives in a JUnit probe (`HAL.initialize()` now takes
no arguments). The port was the usual two categories (`implements
Mechanism`, `Telemetry.log(..., Pose2d.struct)` in place of a raw
NetworkTables `StructPublisher`), built on the already-migrated Lesson 14/15
files rather than by patching the old snapshot, so only Lesson 16's own
changes differ. Two real changes came out of verifying it:

- **`ChassisSimulation` follows the wheels.** Measured in sim, following the
  command (the original design) let the "truth" outrun its own wheels.
  Gentle driving drifted 13 cm in 3 s, and a hard start left the estimate
  *behind*, contradicting the lesson's prose. A `simulateChassis` periodic
  now feeds it the wheels' measured velocity, grip-limited: 1.7 cm gentle,
  27 cm *ahead* on a hard start and held. User decision; the prose and deck
  follow.
- **`Drivetrain.logTelemetry()` is `periodic()` from Lesson 13 on**, where it
  starts reading every sensor. User's call, prompted by the same question of
  where a once-a-tick update belongs. Lessons 13, 14, 16 and 26's prose,
  Lesson 13's deck, and the 13+ snapshots follow.

The marker checker also got stricter here: a line edited above a marker
partway down a folded diff hunk now needs its own marker (see CLAUDE.md).

**Lessons 18 and 19 migrated, 2026-09-27.** Both compile 0–18 and 0–19
with zero warnings. The port was the known four categories: `implements
Mechanism`, `Telemetry.log`, `faceDown`/`faceRight`, and `new
CANBus(CANPort.CAN_S0)`. Verified at runtime:

- **The elevator (Lesson 18).** The real `Robot` runs `goToHeight` through
  the scheduler, finishes in 0.98 s and holds afterwards. The lesson's
  `kG`-zeroed sag (1.56 mm) and settled gap (0.12 mm) reproduce. Its
  full-travel lag numbers didn't: ≈145/≈34 mm is really about 9 cm vs.
  1.5–2 cm with `kV` zeroed vs. restored, matching the classic track and the
  lesson's own arithmetic. The prose now says so and shows the arithmetic.
  (Remeasured 2026-10-16 with repeated moves on a fixed-rate schedule: the
  peak lag varies from run to run, so the lesson gives ranges. Details are
  in `CLAUDE.md`.)
- **The drawing (Lesson 19).** Its carriage length tracks the height, its
  colour goes orange → green on arrival, and the effector rides along.

The big finding: **`Telemetry.log(widget)` is a snapshot on alpha-7, not a
live registration** (measured). So Lesson 19's "publish once, mutate
forever" is replaced by "a drawing is logged like a number", and the frozen
field view that Phase 1a's one-time `Telemetry.log("Field", ...)` had caused
in Lessons 11–16 is fixed. Lesson 17 was a gap at the time, so Lesson 18's
markers lived in the Lesson 16 snapshot, and the checker and
`update-lesson-v3.sh` learned to understand gaps. (Lesson 17 has since been
written; see below.)

**Lesson 17 written, 2026-09-27 — on BLine `v2027.0.0-beta.1`.** Compiles
0–17, and 0–19 on top of it, with zero warnings; `check-lesson-markers-v3.py`
is clean for 1–19. BLine isn't in the marketplace, and its own vendordep URL
follows the `wpilib-2027` branch, so `V3_VENDORDEPS` pins it the way
Limelight is pinned: by the commit its release tag names (`d996781`), whose
JSON points at the tagged jar on JitPack. The API was read from BLine's
source at that tag, then checked at runtime in sim with the real `Robot` and
the lesson's own opmode:

- **Two Corners** finishes in ≈3.9–4.0 s, within the path's 5 cm / 2°
  tolerance, swinging 5–12 cm past the first corner (run to run, vision
  varies it). The `"shoot"` event fires 80% up the second leg. Estimate and
  ground truth stay within 2 cm. **Far Side** finishes in 4.6 s.
- **The shipped constraints are 2 m/s and 6 m/s², not the classic track's
  3 and 3.** BLine plans nothing ahead: the translation loop asks for
  `kTranslationP` × distance left and the acceleration limit does the rest,
  so at 3/3 the robot overshot the first corner by 1.5 m and the end by
  0.7 m. The rule the lesson teaches is that the robot stops in time when
  `max speed² ÷ (2 × max accel)` fits inside `max speed ÷ kTranslationP`.
- **A rotation target without `"profiled_rotation": true` is aimed at
  immediately**, not spread along the path — the same default in v0.9.1, so
  the classic lesson's "come around to 90° partway up the second leg" is
  inaccurate for its own JSON. The v3 paths set it.
- **Auto selection is one `@Autonomous` opmode per path** (OD3). An
  opmode's constructor runs when it's *selected* (read from
  `OpModeRobot`'s source), so `Autos.followPath(...)` there reads the file
  while disabled — the classic lesson's `LoggedDashboardChooser` +
  `onChange` pre-build, for free. The `FollowPath.Builder` is a `Robot`
  field, and `Autos.registerEventTriggers()` runs in `Robot`'s constructor.
- **Revised 2026-10-11, after the user's report** that the first auto in
  SimGUI started where the robot was placed and drove in odd directions,
  while later ones looked fine. Reproduced by driving the real `OpModeRobot`
  loop with `DriverStationSim` the way SimGUI does. **SimGUI starts every
  launch on Red 1** (alpha-7's `DriverStationGui.cpp`: `DSSimModel`'s
  constructor, pushed to the HAL on the first mode click), so the path
  flipped while the robot sat at the blue start. The cameras pulled the
  estimate's position back within about a second, but not its heading. The
  later runs only looked right, because by then the truth was off the field
  where no tag is visible. Re-running on blue went wrong the same way, because
  nothing put the robot back at the start. **User decision: the simulator
  plays the field crew.** Each auto opmode's constructor (run on selection,
  and again on the re-create after each disable) calls
  `drivetrain.placeSimulatedRobot(Autos.startPose(path))`. That is a no-op on
  a real robot; `startPose` flips for red the way BLine does. Verified: three
  consecutive runs on Red 1 and on Blue 1 each start at the correct corner,
  with truth and estimate within 1 cm, and finish at (10.57, 2.06, −1°) and
  (5.97, 6.01, 179°) respectively. The lesson gained a §8 for this.
  Separately measured: re-created opmodes leave their old trigger bindings
  active (scope is the opmode ID), so run N schedules N `FollowPath`s and the
  newest cancels the others in the same tick. That's harmless here, but worth
  knowing for every auto opmode in the track.

`tools/lib/v3-lessons.sh` now maps `code/v3/lesson-N/deploy/**` to
`src/main/deploy/**` (lists it, and removes it on a rollback along with the
emptied folders). Lesson 18's markers moved into the new Lesson 17 snapshot,
and Lessons 18–19's `Robot`/`Constants` snapshots now carry Lesson 17's
additions. **Later lessons, when Phase 1b reaches them:** 26's and 27's
(aim at tag, was 28) whole-file `Autos`/`Drivetrain`/`Constants`/`Robot`
snapshots predate Lesson 17 and must carry its additions; Lesson 26's prose
introduces `PIDController` as new, which it no longer is; and Lesson 27 adds
`getChassisVelocities()` itself, which Lesson 17 now provides. Lesson 25
(BLine events and `overrideRotation`) was writable from here, and was written
on 2026-10-19 (below).

**Lesson 20 migrated, 2026-10-16.** Compiles 0–19 and 0–20 with zero
warnings. `check-lesson-markers-v3.py` is clean for 1–20, and
`update-lesson-v3.sh 20` builds a student project with all five markers in
place. The new snapshot was built on the migrated Lesson 19 files. The port
was the usual categories: `implements Mechanism`, `Telemetry.log`,
`new CANBus(CANPort.CAN_S0)`, and `faceLeft()`/`faceUp()`.

The old prose also claimed `Elevator.getCarriage()` "already added in
Lesson 19". The alpha-7 Lesson 19 doesn't add it, so Lesson 20 now adds it
and deletes Lesson 19's placeholder effector stub, with bold lead-ins for
each edit. The Lesson 19 snapshot carries copies of `Robot` and
`RobotTeleop` to hold the new markers.

Measured with the real `Elevator`/`Arm` through the scheduler, and the real
`Robot` loop for the drawing; the numbers are in CLAUDE.md. The cosine
holding table reproduces exactly. Two findings changed the lesson:

- The soft limit can't be demonstrated by the arm's angle, because the
  physics model's own stops sit at the same angles. Try It #3 now watches
  the setpoint and the volts instead.
- The drawing lags one tick for the arm, now explained in a callout.

`getValueAsDouble()` turned out to exist on alpha-7's Phoenix, so the
"no shortcut" claims in Lessons 18 and 20 are gone.

**Lesson 21 migrated, 2026-10-17.** Compiles 0–20 and 0–21 with zero
warnings. `check-lesson-markers-v3.py` is clean for 1–21. The snapshot was
rebuilt on the migrated Lesson 20 files. The only port was the elevator
motor's `new CANBus(CANPort.CAN_S0)`; `ElevatorIO` and `ElevatorIOSim` came
out byte-identical to the old snapshot. The Lesson 20 snapshot now carries
copies of the three elevator IO files, to hold the markers.

Measured with the real `Elevator` through the scheduler, and with the real
`Robot` loop launched the way SimGUI launches it. The numbers are in
CLAUDE.md. Three findings changed the lesson:

- **An un-homed carriage doesn't stay put.** Nothing in the sim holds an
  unpowered carriage, so it sinks at 2 cm/s while the robot sits disabled.
  It lands on the switch about 18 s after launch, and the `Trigger`
  re-zeroes it before most students have touched anything. **User
  decision: teach the sink.** Section 8 now starts by watching the encoder
  count below zero, then the switch fix itself, then restarts to show
  `home()` and the pre-homing stall.
- **D-pad up before homing doesn't reach "really 1.80 m".** `ElevatorSim`'s
  own travel limit stops the carriage at the 1.5 m frame top, with the
  encoder reading 1.15 m and the motor stalled at 3 V and 119 A.
- **Stowing doesn't trip the switch.** Stowed is 2 cm and the switch is at
  1 cm, so `AtBottomLimit` stays false there.

The text also never told the student to log `AtBottomLimit` and
`StatorCurrentAmps`, though section 8 and section 9 graph them. It does
now. Section 2's homing-speed arithmetic was corrected: gravity adds to the
−0.7 V rather than subtracting from it. The ending now hands off to
Lesson 22.

**Lesson 22 written, 2026-10-17 — no longer a gap.** Compiles 0–22 with
zero warnings, `check-lesson-markers-v3.py` is clean for 1–22, and
`update-lesson-v3.sh 22` hands a student project all 14 markers, and the
project builds. Like Lesson 16, it's hand-built rather than a port: maple-sim
isn't coming to this alpha, so the simulated intake the classic lesson got
from `IntakeSimulation` is written out in `ArmIOSim`:

- **The field and the catch.** The game pieces sit at
  `ArmConstants.kSimGamePiecePositions`, the same three spots Lesson 27's
  detection scene uses. A piece is caught only when three things are true:
  the roller is told to pull in, the arm is below horizontal, and a piece is
  inside a box just past the front bumper (`kIntakeReach` deep,
  `kIntakeWidth` wide). The box is checked against the simulated chassis's
  true pose, not the estimate. Running the roller outward drops the piece
  0.8 m ahead of the robot.
- **`Arm` takes the true pose.** It's now `Arm(Elevator, Supplier<Pose2d>)`,
  given `drivetrain::getSimulatedPose`, like the cameras. A field
  initializer can't see a constructor parameter, so the mode `switch` moved
  from the `m_io` field into the constructor.
- **The rest is the classic lesson.** The DIO beam break is read as
  `!get()`, so an unplugged sensor says "no piece". A debounced `Trigger`
  starts `Command.parallel(arm stow, elevator to kScoreMid).named("Capture")`.
  The right trigger scores, guarded with `.and(hasGamePiece).and(atGoal)`.

The alpha-7 `Trigger.debounce(Time)` takes the measure directly. Read from
the bytecode, it debounces `RISING` only, so the classic lesson's "slow to
believe yes, quick to believe no" holds.

Verified with the real `Robot` loop and the real bindings, driven by
`GamepadSim`:

- With the arm down and the roller in, open field reads `false` at
  60.3 rot/s.
- Driving at the first piece, it's caught when the piece is 0.59 m ahead of
  the robot's center.
- About 0.1 s later, capture stows the arm (89.9°) and raises the elevator
  (0.750 m). The roller stops while the bumper is still held.
- The right trigger ejects the piece (back to 3 on the field) and the
  roller stops. With an empty intake, it does nothing.
- With the arm up over a piece: no catch. Arm down, then the bumper: caught.
- Try It #2 was measured too. With a sensor flickering every other tick,
  the debounced capture never fires; without the debounce, it fires on the
  first flicker.

What it changed elsewhere:

- Lesson 21's ending now hands off to Lesson 22.
- Lesson 23's "since last lesson" now says "since Lesson 21".
- Lesson 34 no longer calls `Trigger.and` new.
- The v3 README lists Lesson 22 and calls 22 a hand-built lesson like 16.

**Lesson 23 migrated, 2026-10-19.** Compiles 0–22 and 0–23 with zero
warnings; `check-lesson-markers-v3.py` is clean for 1–23; the 50 tool tests
pass. The old snapshot predated Lessons 21 and 22, so it was rebuilt: the
Lesson 22 `Constants`/`Robot` plus Lesson 21's `Elevator`, with
`m_homed`/`isHomed()`, and a `Leds` that reads the elevator and the arm. The
port itself was `Telemetry.log` for `SmartDashboard.put*`, `implements
Mechanism` (already in place), `Color.LIME_GREEN` for `kLimeGreen`, and
`Arm(Elevator, Supplier<Pose2d>)`. The user's decision to restore "has a game
piece" is carried out: four indications, with "not homed" outranking
"has a piece" (the lesson's queue-line Tuesday is back). Measured with the
real subsystems through the scheduler and the strip's pixel data: blinking red
wins over a held piece; once homed, a held piece is solid (50, 205, 50) enabled
or disabled; empty is a dim blue byte of 63; disabled breathes. Homing from the
start height takes 148 ticks. The lesson's Run It section gained the pick-up,
disable and eject steps, and Try It #3 now reorders the piece check above the
home check. Lesson 23 still teaches no new Java beyond combinators, and
`kPwmPort = 5` stays clear of DIO channels 0 and 1. The `new Arm(elevator)`
lines in snapshots 24–31 were updated to match Lesson 22's constructor.

**Lesson 24 migrated, 2026-10-19.** Compiles 0–23 and 0–24 with zero
warnings; `check-lesson-markers-v3.py` is clean for 1–24; the 50 tool tests
pass. The old snapshot was a four-state design on pre-Lesson-17/21/22 files,
so it was rebuilt on Lesson 23: `Constants` and `Robot` from 23 with the
`LedConstants` and `leds` changes, and a `RobotTeleop` from 22 (face-button
names, capture and score bindings) with those bindings deleted and the state
bindings added. The port itself was small: `Telemetry.log` for
`SmartDashboard.putString`, `org.wpilib.math.filter.Debouncer`,
`Color.RED`/`BLUE`/`YELLOW`/`LIME_GREEN`, `RobotState.isDisabled()`.
`Command.onlyIf` doesn't exist, so the request guard is the
`Command.noRequirements` coroutine that returns early, as before. The user's
decision is carried out: six states, `HANDOFF` and `HOLDING` entered by
`periodic()` from the debounced beam break and `atGoal`, requests still
guarded by `canGoTo`, "the operator is the sensor" gone. Measured with the
real `Robot`/`RobotTeleop` loop and `GamepadSim`: all three requests are
refused while `UNHOMED` and logged; homing reaches `IDLE` in ~170 ticks;
intaking trips `HANDOFF` and then `HOLDING` 55 ticks later with the elevator
at 0.75 m and no premature `HOLDING`; the right trigger scores and `SCORING`
lasts one or two ticks (the piece leaves instantly), then `IDLE` stows;
intake while `HOLDING` and score while `IDLE` are refused. The lesson was
rewritten around the six states (new `HANDOFF` explanation, `periodic()`
transitions, the deletions in `RobotTeleop`, a run section with these
numbers); Lesson 32's test and text follow the six states.

**Lesson 24 revised, 2026-10-19: state motion is bound in `Robot`.** The
user decided the four `inState(...).whileTrue(...)` bindings move out of
`RobotTeleop` into `Robot`'s constructor, so the motion a state means holds
in every opmode, autonomous included (Lesson 25 relies on it). Bindings made
there are `Global`: the opmode ID reads 0 until the program starts. §8 now
teaches the placement against Lesson 9's opmode scoping. Re-measured through
the real loop: `Intake Motion` survives selecting another opmode; the cycle
numbers hold (homing 151 ticks after Back, `HANDOFF` 35 ticks after the
drive starts, `HOLDING` 56 ticks later at 0.7345 m, score refused/accepted
as before).

**Lesson 25 written, 2026-10-19 — no longer a gap.** (The design in this
paragraph and the list below it was replaced the same day; see "Lesson 25
redesigned" further down. The measurements of BLine still hold.) Compiles 0–24 and 0–25
with zero warnings; `check-lesson-markers-v3.py` is clean for 1–25;
`update-lesson-v3.sh 25` hands a student project all 7 markers, and the project
builds; the 50 tool tests pass. Like Lesson 22 it was written on alpha-7 rather
than ported: the classic Lesson 25 is the design, and the new snapshot sits on
the migrated Lesson 24 (`Autos` from Lesson 17, `Constants`/`Robot` from 24).
The Lesson 24 snapshot now carries copies of `Autos` and `RobotAutoFarSide`, to
hold the markers.

The design is the classic lesson's, in this track's idioms:

- An `intake` marker on Two Corners' first leg runs
  `Command.sequence(arm.goToAngle(kIntake), arm.runRoller(...).until(arm::hasGamePiece))`,
  registered with BLine's `Command` overload.
- Far Side stows the arm when less than `kStowDistance` (2 m) is left, read from
  the raw `FollowPath` inside a coroutine with `coroutine.waitUntil`.
- An `aim`/`release` pair of `Runnable` markers switches
  `FollowPath.overrideRotation(..., RotationOverrideBehavior.RESPECT_CONSTRAINTS)`
  on and off for a new **Aim While Driving** auto.
- There's no `finallyDo` in Commands V3, so `handingRotationBack` wraps every path
  auto: one line after `await` for finishing, `whenCanceled` for a cancel.

The autos drive the arm directly, not through the superstructure. Requests are
refused while `UNHOMED`, and the state motions are bound in `RobotTeleop`, so
they don't exist in autonomous. The lesson says so in a callout.

Read from source or measured with the real `Robot` loop driven through
`DriverStationSim`; the numbers are in CLAUDE.md. What changed the lesson:

- **The distance sentinel bites inside the parallel group.** The classic
  lesson measured the group starting the path first. Here the scheduler runs
  commands in reverse order of starting (`Scheduler.runCommands`, which carries
  a TODO about it), so the stow's first check saw `0.0` and stowed on the first
  tick. The stow now waits for a distance above zero before comparing it with
  2 m, and the lesson shows the rejected version.
- **Where a marker goes is arithmetic.** From the simulator's boot pose (arm
  resting at −20°), a marker at `t_ratio` 0.2 catches the piece at (4.5, 3.2)
  mid-drive; at 0.4 it's too late. From stowed, the arm needs about 1.0 s before
  the roller runs, and no marker on this path can make it. That's Try It #2, not
  the main demo, and the lesson says the boot pose is what makes the main demo
  work.
- **The one-argument `overrideRotation` bypasses the rotation limits.** With
  the target behind the robot it spun at 11.65 rad/s against `config.json`'s
  6.28. So the lesson uses `RESPECT_CONSTRAINTS`.
- **`Translation2d.getAngle()` returns `Optional<Rotation2d>` in alpha-7**,
  empty for a zero-length vector. `aimOmega` handles that with Lesson 15's
  `Optional`. This is a port category for the snapshots that call it: 27
  (`Autos`) and 28 (`Autos`, `Aim`).

What it changed elsewhere:

- Lesson 24's ending now hands off to 25, and the v3 README lists it and no
  longer calls it a gap.
- The website's status summary counts 26 of 35 lessons as up to date.

**Lesson 25 redesigned, 2026-10-19 (user decisions, same day).** The user asked
for autos that home before they start, so they can use the superstructure, and
for `addOpMode` instead of one near-identical class per auto. Answers to three
questions: `addOpMode` arrives in Lesson 25 (Lesson 17 keeps its two annotated
classes); Lesson 24 is rewritten so the state-motion bindings live in `Robot`
(recorded above); and a new pickup path replaces Two Corners as the intake demo.
What shipped:

- **`opmode/PathAuto`**, unannotated, takes `(Robot, String pathName,
  Function<Path, Command> recipe)`. `Robot` registers each auto with
  `addOpMode(RobotMode.AUTONOMOUS, name, "Paths", () -> new PathAuto(...))` and
  then calls `publishOpModes()`. `RobotAutoTwoCorners`/`RobotAutoFarSide` are
  deleted in `V3_DELETIONS`; Aim While Driving and Pick Up never get classes.
- **`Autos.getReadyThen(elevator, superstructure, auto)`**: a no-requirements
  coroutine that awaits `home()`, waits for the new
  `Superstructure.isSettled()` (`IDLE` and both mechanisms `atGoal`), then
  awaits the auto. `PathAuto` wraps every path auto in it.
- The `intake` marker is `superstructure.requestIntake()`;
  `registerEventTriggers(Superstructure, Localizer)`. `shoot` is retired and
  removed from `TwoCorners.json`.
- **`PickUp.json`**: (6.0, 7.4) → (6.0, 1.0), heading −90°, `intake` at
  `t_ratio` 0.1. It comes down the field because a straight run at the piece
  at (6.0, 3.8) along y = 3.8 crosses the blue hub (x 4.02–5.23, y 3.43–4.64,
  from the alpha-7 2026 field's tag poses).
- **`followPathAndScore`** replaces `followPathAndStow`: wait for distance
  above 0, then below `kScoreDistance` (0.5 m, replacing `kStowDistance`),
  then `requestScore()`.

Measured with the real `Robot` loop (probe recipe in CLAUDE.md):

- **`Command.sequence(home(), waitUntil(isSettled), auto)` never drives.** A
  `SequentialGroup`'s requirements are the union of its steps' (read in
  source), so it holds the elevator; the `IDLE` motion scheduled on the tick
  the state turns `IDLE` evicts the whole auto. The coroutine holds nothing.
- **Without the settle wait, a fresh launch misses.** The sim arm boots at its
  −20° stop; the `IDLE` stow was still rising (≈41°) when the intake request
  came, reversing took 1.3 s, and the roller started after the piece had
  passed. With the wait: homing 3.3 s, stow ≈1.0 s, drive starts ≈4.4 s
  after enable.
- **Pick Up timeline (from drive start):** marker 0.6 s at y ≈ 6.7; arm below
  horizontal 1.4 s; roller 1.7 s at y ≈ 4.6; caught 1.8 s at y ≈ 4.37
  (0.57 m); `HANDOFF` +0.1 s; `HOLDING` 3.0 s with 1.0 m left, elevator
  0.73 m; `SCORING` at 0.48 m left, `IDLE` next tick; path done 3.5 s at
  (6, 1). Marker 0.15 still catches (0.50 m); 0.2 misses (roller at y ≈ 3.9).
- Unguarded score trigger: `IDLE -> SCORING` refused on the drive's first
  tick; the robot ends `HOLDING`. `kScoreDistance` 2 m: `HANDOFF -> SCORING`
  refused while the elevator rises (0.38 m). At 1 m/s the score lands at
  y ≈ 1.48 vs 1.44, 6.1 s into the drive vs 3.2 s.
- A second Pick Up in one session: score refused `INTAKING -> SCORING`, then
  the running intake catches the piece the first run dropped 0.8 m ahead.
  The robot stays `INTAKING` into teleop (Try It #5).
- Without `publishOpModes()` none of the path autos appear; leaving the old
  annotated Two Corners in throws `IllegalArgumentException: OpMode Two
  Corners already exists for mode AUTONOMOUS` at boot.
- Unchanged: Two Corners 4.1 s, Far Side 4.7 s, Aim While Driving finishes at
  (8.01, 7.02, −1.6°) 5.4 s into the drive with 5.71° mean / 7.71° worst aim
  error; a drivetrain-requiring event cancels the path the next loop
  (Pick Up: stops ≈(6.0, 6.5), `Turn To Heading`).

**What Lessons 26 and 27 now owe Lesson 25, when Phase 1b reaches them**
(27 is aim at tag, renumbered from 28 on 2026-10-20; 26 is done):

- **Autos are registered with `addOpMode`, not annotated classes.** 26's
  `RobotAutoDriveToPose` and any later auto become an `addOpMode` line in
  `Robot` (a `PathAuto` if it follows a drawn path, its own unannotated opmode
  otherwise), before the `publishOpModes()` call. Every auto that uses the
  superstructure goes through `Autos.getReadyThen`.
- 26's whole-file `Autos`, `Constants`, `Robot` and `RobotTeleop` must carry
  Lesson 25's state: `followPathAndScore`, `getReadyThen`,
  `handingRotationBack`, `aimOmega`, `registerEventTriggers(Superstructure,
  Localizer)`, `kScoreDistance`/`kAimP`/`kAimTarget`, `isSettled()`, the
  `addOpMode` block, and Lesson 24's state-motion bindings in `Robot` (the
  unmigrated snapshots 27, 28 and 34 still bind them in `RobotTeleop`; those
  lines move to `Robot`).
- **Lesson 27 (aim at tag) collides with 25.** Its snapshot adds an annotated
  `RobotAutoAimWhileDriving` named "Aim While Driving", which would now throw
  at boot (duplicate name). Follow the classic Lesson 28 instead: point 25's
  `aim` marker at `Aim.omegaTowardTag`, delete `kAimTarget` and `aimOmega`,
  and give `registerEventTriggers` the drivetrain.

**Three user decisions, 2026-10-17, for the lessons Phase 1b has left:**

- **Lesson 23: restore the "has a game piece" LED indication** the classic
  lesson has, now that the beam break exists. The priority example goes
  back to "not homed outranks has a piece".
- **Lesson 24: restore the classic six-state superstructure**, with
  `HANDOFF` and `HOLDING` entered automatically by `periodic()` from the beam
  break. The four-state "the operator is the sensor" design was a
  workaround for the missing sensor. Lesson 31's (was 32's) `SuperstructureStateTest`,
  and any later snapshot that names the states, follow it.
- **Object detection (Lesson 34 since 2026-10-20, was 27): stay on PhotonVision**, alongside
  Lesson 15's Limelight, and **wait for an alpha-7 PhotonLib** rather than
  redesign around Limelight. Measured on 2026-10-17: the only 2027
  PhotonLib, `v2027.0.0-alpha-2`, declares `wpilibYear: 2027_alpha5`.
  GradleRIO alpha-7 refuses it before compiling anything: "Vendor Dependency
  photonlib has invalid year 2027_alpha5. Expected to be 2027_alpha7". The
  marketplace's `2027_alpha7` bucket has no PhotonLib. The lessons that
  followed it used to carry its detector, so everything after it waited too;
  moving it to the end on 2026-10-20 fixed that. When PhotonLib lands,
  Lesson 34 needs an install step and a pin from 34 on. It also needs to
  teach `PhotonCamera` and the simulated camera itself, because its text
  leans on a PhotonVision Lesson 15 that no longer exists.

Snapshots 24–31 had their `new Arm(elevator)` line changed to Lesson 22's
constructor on 2026-10-19 (Lesson 23's own text and snapshot are migrated);
the rest of each is still to be migrated.
Object detection's (Lesson 34's) `VisionConstants.kSimGamePiecePositions`
duplicates the arm's constant with the same values; unify them, or let its
scene read the live pieces, when it is migrated.

**Lesson 26 migrated, 2026-10-20.** Compiles 0–25 and 0–26 with zero
warnings; `check-lesson-markers-v3.py` is clean for 1–26; the 50 tool tests
pass. The old snapshot predated Lessons 17, 21 and 25, so it was rebuilt from
the Lesson 25 files (`Drivetrain`, `Constants`, `Autos`, `Robot`, `RobotTeleop`)
with only Lesson 26's additions on top: `alignToPose`/`atPose` and the three
`PIDController` fields in `Drivetrain`, `kAlignP`/`kAlignThetaP`/the two
tolerances/`kScoringPose` in `PathConstants`, `Autos.driveToScoringPose`, the
left-bumper binding, and `RobotAutoDriveToPose`. The port itself was nothing:
no alpha-7 API change touches this lesson (`PIDController` and `ChassisVelocities`
compile as they were). The design carry-over from Lesson 25:
`RobotAutoDriveToPose` lost its `@Autonomous` annotation and is registered in
`Robot` with `addOpMode(RobotMode.AUTONOMOUS, "Drive To Pose", "Poses", ...)`
before `publishOpModes()`, and it does not go through `getReadyThen` because it
never touches the superstructure. Measured with the real `Robot` loop through
the scheduler on a 20 ms schedule (scratch probe, not committed), from
(1, 1, 0°) to (5, 4, 90°), error against the simulated chassis's truth:

- `driveToPose` alone: 3.18–3.20 s, 45–47 mm out (the old 3.02 s / 49 mm).
- Two stages: 3.48–3.50 s, 15–17 mm, under 0.01° (the old 3.30 s / 20 mm /
  0.003°). The lesson now says "a third of a second" and "nearly triple".
- On the target facing backwards, `driveToPose` finishes in 1 tick while 180°
  out; `alignToPose` alone fixes it in 0.72 s; the two stages in 0.74 s.
- 179° to −179° takes 0.30 s and turns 2° the short way.
- The real "Drive To Pose" opmode finishes at 3.4 s at (4.987, 3.995, 90.0°);
  holding the left bumper in teleop for 5 s ends at (4.987, 3.995, 90.0°).
- A second run in one session takes the same 175 ticks as the first: the
  controllers' `atSetpoint()` is stale-true after a run, but `runRepeatedly`
  runs its body before `until` is checked, so no reset is needed.

Two caveats. The opmode does not place the simulated robot (unlike
`PathAuto`), so a second run starts on the pose; the lesson says to drive away
first. And the probe's own gotcha: calling `placeSimulatedRobot` and
`localizer.resetPose` in the same tick offsets the estimate by the old gyro
reading (truth ended 10 m away, estimate on target); put them a few ticks
apart. In the lesson text: `PIDController` is no longer "new" (Lesson 17
introduced it; the concept bullet and the README row now say tolerances and
fields), `PathConstants` gains lines instead of being created, the `Autos`
imports are noted as already there, Try It #4 uses `Telemetry.log`, and the
wiring section is rewritten for `addOpMode`.

**Lesson 27 migrated, 2026-10-21.** Compiles 0–26 and 0–27 with zero
warnings; `check-lesson-markers-v3.py` is clean for 1–27; the 50 tool tests
pass. The old snapshot was an annotated-opmode design on pre-Lesson-17 files, so
it was rebuilt on Lesson 26: `Aim` (ported), `Constants` (`kAimTarget` replaced
by `kAimTagId`/`kAimTolerance`), `Autos` (`aimOmega` deleted, the `aim` marker
points at `Aim.omegaTowardTag`, `registerEventTriggers` takes the drivetrain),
`Robot` (the call) and `RobotTeleop` (left trigger plus `aimOmega()`). The old
`Drivetrain`, `RobotAutoAimWhileDriving` and `driveWhileAiming` are gone: Lesson
17 provides `getChassisVelocities()`, and the lesson follows the classic one,
pointing Lesson 25's marker at the tag instead of adding an opmode (the
duplicate-name problem the Lesson 25 note warned about). The port was
`Telemetry.log` for `SmartDashboard.put*`, and `Translation2d.getAngle()` as an
`Optional`; `Field.getTagPose(int)` still exists. Measured with the real `Robot`
loop and `GamepadSim` (numbers in CLAUDE.md): the orbit's P-only lag
reproduces the prediction (14.8° vs 14.32°), but the lesson's old 13.2°/1.1°
at 50 Hz did not, so the table now has measured 2 m/s and 3 m/s columns and the
feedforward gives 0.3–0.4°. Lesson 25's markers for 27 were added to the
Lesson 26 snapshot (`Constants`, `Autos`, `Robot`, `RobotTeleop`).

**Lesson 28 migrated, 2026-10-21.** Compiles 0–27 and 0–28 with zero
warnings; `check-lesson-markers-v3.py` is clean for 1–28; the 50 tool tests
pass. The old snapshot carried object detection's pieces and `RobotTeleop`
bindings from before Lessons 17–27, so it was rebuilt on Lesson 27: its
`Constants`, `Robot` and `RobotTeleop` plus the flywheel's four files, with
only `FlywheelConstants`, the `flywheel` field and the left-trigger
`spinUp` binding added. The detector, `VisionConstants` pieces, `fetchPiece`
and the old state bindings are gone. Port: `implements Mechanism`,
`Telemetry.log` (the dial is now logged every tick instead of one
`putData`), `new CANBus(CANPort.CAN_S0)`. **One real change:** `Mechanism`
is an interface now, so the "constructor auto-installs your `idle()`
override" feature is gone; `Flywheel` calls `setDefaultCommand(idle())`
itself and the lesson's explanation (section 5, "what you learned") says so.
Measurements and the one claim that did not reproduce (≈12 V during the climb;
it is 7–9 V from idle) are in CLAUDE.md. Lesson 27's snapshot got Lesson 28's
markers (`Constants`, `Robot`, `RobotTeleop`).

**Lesson 29 migrated, 2026-10-22.** Compiles 0–28 and 0–29 with zero
warnings; `check-lesson-markers-v3.py` is clean for 1–29; the 50 tool tests
pass. The old snapshot predated Lessons 17–28, so it was rebuilt from the
rolled-forward Lesson 28 files: `Constants` (`PowerConstants` added), `Robot`
(battery logging, `getTotalCurrentAmps`, `simulationPeriodic`), and the
elevator, arm and flywheel `IO`/`IOTalonFX`/subsystem files. The detector,
`VisionConstants` pieces and old bindings are gone. Port: `Telemetry.log`,
`CANPort.CAN_S0`, `implements Mechanism`. Lesson 28's snapshot got Lesson 29's
markers (and unchanged copies of the elevator and arm files to hold them).
Measurements are in CLAUDE.md. **One claim did not reproduce:** the lesson's
"no limits browns out the three mechanisms" (old 366 A / 4.7 V). On alpha-7
with the real loop it peaks at 201 A and sags to 7.97 V, no brownout. Rather
than change what the lesson teaches, section 7 now keeps the same three
configurations and shows both a fresh battery (honest: sags, survives) and a
tired one (11 V, 40 mΩ), where no limits browns out, defaults barely survive
and the budget has margin; Try It #4 was reworded since the tired battery is now
in the text. The section 2 and 3 tables were re-measured with bare rigs.

**What Lessons 27–34 now owe Lesson 26, when Phase 1b reaches them:** any
whole-file snapshot of `Autos`, `Drivetrain`, `Constants`, `Robot` or
`RobotTeleop` must carry `driveToScoringPose`, `alignToPose`/`atPose` and the
controller fields, the `PathConstants` align constants and `kScoringPose`, the
left-bumper binding, and the `Drive To Pose` `addOpMode` line.
`RobotAutoDriveToPose` must stay unannotated.

**OpMode track renumbered, 2026-10-20 (user decision).** Object detection
waits on an alpha-7 PhotonLib, and before this, every later lesson waited with
it: snapshots 28–33 carried its detector (the `VisionConstants` detector
constants, a `pieceDetector` field in `Robot`, `fetchPiece` and its
right-bumper binding), and four lessons mentioned it in passing. None of those
lessons used it for its own teaching, so the user moved it to the end (Lesson
34) and the rest moved down one; the mapping is in the note at the top of
Phase 1b. Only the OpMode track moved, and the lessons say nothing about the
classic track's order. What changed:

- `code/v3/lesson-N/` folders and `docs/lessons/v3/NN-*.md` files renamed;
  every "Lesson N" and link for 27–34 in the track's lessons and snapshot
  comments remapped in one pass; the README table reordered.
- Lesson 26 now hands off to aim at tag. SysId (33) hands off to object
  detection, and object detection (34) carries the track's closing paragraph.
- The four passing mentions: aim at tag's contrast sentence no longer names a
  lesson; flywheel Try It #4 drops `fetchPiece`; alerts Try It #5 swaps the
  class-ID example for a misspelled `lib_key` (Lesson 17); testing Try It #1
  now tests `Aim.tagPosition`'s empty answer, and the detector test it had
  became object detection's Try It #6. Two spelled-out lesson counts moved
  down by one.
- `docs/_data/lesson_status.yml`: 30 waits on a decision, 34 on a library.

What later migrations owe this: the unmigrated snapshots 30–33 still carry
object detection's pieces listed above; drop them when migrating each, since
those lessons now come first. When object detection is migrated as Lesson 34
it builds on the full Lesson 33 state, re-adds what it needs to `Robot`,
`Constants`, `Autos` and `RobotTeleop`, and should give its camera a
connection alert in the pattern Lesson 30 sets (after Lesson 30's own design
decision). Lesson 30 (alerts) is now the next blocked lesson, after 27–29 (all three done).

**Each lesson Phase 1b migrates also gets its NEXT LESSON markers
(added 2026-09-26).** Lessons 1–15 now ship them: the code at the end of
Lesson N-1 carries a javadoc-style comment at every spot where Lesson N has
the student add or change code in an existing file, and
`./tools/update-lesson-v3.sh N DIR` hands a student exactly that code. So
migrating Lesson N is not finished until: `V3_ALPHA7_THROUGH` in
`tools/lib/v3-lessons.sh` is raised to N (that also raises
`update-lesson-v3.sh`'s ceiling); Lesson N's markers are added to the
`code/v3/lesson-(N-1)/` files it edits, copying a file forward unchanged
from an earlier snapshot if lesson-(N-1) doesn't ship it; and
`./tools/check-lesson-markers-v3.py N` reports 0 problems.
Conventions are in CLAUDE.md.

**Robot-specific values stay in `Constants.java`** (added 2026-09-26), because
`update-lesson-v3.sh` now merges that file — keeping the student's values —
instead of overwriting it, and any hardware value that lives in another file
is silently reset on update. Two moved in: `DriveConstants.kGyroPort`
(Lesson 8 on) and `SteerConstants.kSteerInverted` (Lesson 7 on, applied by
the steering `TalonFXConfiguration`, which Lesson 12 extends). Snapshots
16–32's and 34's `Constants.java` files already carry both — mechanically added, not
compiled, since those lessons don't build on alpha-7 yet — so migrating a
lesson that touches the steering motor's configuration must keep the
`Inverted` line, and a new mechanism's CAN IDs and hardware facts belong in
`Constants.java` from the start.

**Phase 2 — content updates, driven by what Phase 1a/1b actually found.**
Only after a given lesson's code compiles: update its prose to match the
real new API (not the guessed shape in this doc), following the same
walkthrough conventions every other lesson uses — Phase 2 can start on
Lessons 1–14 as soon as Phase 1a finishes, without waiting for Phase 1b.
Update `docs/presentations/v3/template/build/*.js` code cards for anything
renamed (the gamepad face-button rename is the known one; there may be
others). Re-run `audit-overflow.js` and `validate.py` per the deck
template's own house rules if any deck text changes length.

## Open decisions for the team

Two items above aren't mechanical renames and need an actual decision once
the real API is in hand — flagging now so Phase 2 doesn't stall on them
later:

1. **`SmartDashboard` → Telemetry/Tunables — resolved, 2026-09-18.**
   `SmartDashboard` is gone; `org.wpilib.telemetry.Telemetry` is its
   replacement and Phase 1a already ported every lesson's `putNumber`/
   `putString`/`putData` call to `Telemetry.log(...)` as a mechanical,
   code-only substitution (see [Phase 1a](#phased-plan)). The team decision
   this item asked for is: **`Telemetry` is the v3 track's lasting idiom for
   Lessons 3–12, not a stopgap** — Lesson 3's prose should be written around
   it natively, the same way classic Lesson 3 is written around
   AdvantageKit natively, not as "SmartDashboard, but renamed."

   **AdvantageKit does not replace it at Lesson 3, and can't yet at any
   lesson.** Checked directly against AdvantageKit's own compatibility doc
   (`wpilibsuite/SystemCoreTesting/AdvantageKit.md`, current release
   `v27.0.0-alpha-5`, itself alpha-7-compatible): its Known Issues section
   states plainly, "**OpModeRobot is not supported** ... An equivalent for
   WPILib's `OpModeRobot` will be available in a future release." This is
   an architectural gap, not a missing flag — AdvantageKit's replay hook is
   `LoggedRobot extends TimedRobot`, overriding the main loop itself so
   replay mode can drive ticks from a recorded log instead of a real clock.
   Every v3 lesson from Lesson 0 has `Robot extends OpModeRobot`. The two
   are mutually exclusive today; there is no partial "logging-only" path
   confirmed against AdvantageKit's own docs (a secondhand mention of one
   turned up in search but could not be verified against a primary source,
   so it isn't being relied on here).

   **Lesson 13 is the right target for a future switch, and not just
   because that's where the classic course does it.** Lessons 1–12 have
   subsystems talking to hardware directly — there's no `ModuleIO`/`GyroIO`
   seam yet for anything to be replayed *through*. AdvantageKit's actual
   value over `Telemetry` is that `Logger.processInputs` is bidirectional
   (write live, read back in replay); introducing it before that IO
   boundary exists would only buy the output-logging half, which
   `Telemetry` already does natively (`RobotBase`'s own constructor
   registers a `NetworkTablesTelemetryBackend` automatically — confirmed by
   disassembling it — so there's no setup lesson needed either). So Lesson
   13 (introducing `ModuleIO`/`GyroIO` and a `Constants.Mode` switch, same
   as the classic track) is where a future AdvantageKit conversion belongs
   *if and when* `OpModeRobot` support ships — tracked as future work, not
   scheduled.

   **Lesson 7's AdvantageScope-compatible swerve-state publisher is
   unaffected either way** — checked directly, it's a raw
   `NetworkTableInstance.getStructArrayTopic(...)` / `StructArrayPublisher`,
   going through neither `Telemetry` nor AdvantageKit. AdvantageScope reads
   NT struct topics by shape, not by which logging framework published
   them, so nothing about it needs to change now or at a future Lesson 13
   conversion.

   Worth re-checking AdvantageKit's `OpModeRobot` status again whenever a
   future alpha-7 (or later) vendor-tracking check runs — the original
   blocker may move the same way Phoenix 6's did.
2. **Default gamepad deadband.** Does Lesson 2 keep teaching a hand-rolled
   `applyDeadband` as foundational technique (framed as "here's what the
   default now does for you, and here's how it works"), or does the lesson
   restructure around a different `if`/`Math.abs`/`return` example since the
   original motivating problem — a motor creeping at rest — may no longer
   be reproducible with the default in place?

## Vendor tracking

Living table, updated only when something actually changes (see
[Monitoring](#monitoring) — a "still blocked" check does **not** touch this
table, to keep its history meaningful). Manual checks and automated ones
both write here. Two verdict columns now, one per
[track](#splitting-the-gate-lessons-114-dont-need-photonvision) — Track A
can go green while Track B is still red.

| Checked | allwpilib latest | `vendor-json-repo` alpha6/7 bucket | Phoenix 6 latest alpha pin | PhotonVision latest alpha pin | Track A (Lessons 1–14) | Track B (Lessons 15–34) |
|---|---|---|---|---|---|---|
| 2026-09-01 (manual, this doc) | `v2027.0.0-alpha-7` | Not present (`2027_alpha1`, `2027_alpha5` only) | `26.50.0-alpha-1` (alpha5) | `v2027.0.0-alpha-2` (built against alpha-6 internally, not yet marketplace-pinned) | **Blocked** — needs Phoenix 6; `CommandsV3.json` local copy also stale, but that fix is already available (confirmed 2026-09-02) whenever Track A moves; `build.gradle` deploy-wiring fix still an open unknown either way | **Blocked** — same, plus PhotonVision |
| 2026-09-05 (automated, `NerdSwerveYAGSL2026/tools/check-alpha7-readiness.sh`) | `v2027.0.0-alpha-7` (unchanged, no alpha-8) | **`2027_alpha7` bucket now exists** — but it holds only `AdvantageKit-27.0.0-alpha-5.json`; no Phoenix 6 or `photonlib` entry has landed there yet | `26.50.0-alpha-1` (unchanged) — still 2 classes missing vs. alpha-7: `epilogue/logging/EpilogueBackend`, `epilogue/logging/NestedBackend` | `v2027.0.0-alpha-2` (unchanged) — still 7 classes missing vs. alpha-7: `driverstation/Alert`, `math/util/Pair`, `smartdashboard/SmartDashboard`, `util/sendable/Sendable`, `vision/apriltag/AprilTag`, `vision/apriltag/AprilTagFieldLayout`, `vision/apriltag/AprilTagFields` | **Blocked** — unchanged, still needs Phoenix 6 | **Blocked** — unchanged, still needs Phoenix 6 and PhotonVision |
| 2026-09-12 (automated, `NerdSwerveYAGSL2026/tools/check-alpha7-readiness.sh`) | `v2027.0.0-alpha-7` (unchanged, no alpha-8) | `2027_alpha7` bucket gained an entry — **`REVLib-2027.0.0-alpha-7.json` now published there** (REVLib's native `libREVLibWpi.so` also resolves cleanly against alpha-7 now, clearing NerdSwerve's blocker — not this repo's gate, but the same bucket this row tracks). Still no Phoenix 6 or `photonlib` entry in `2027_alpha7` | `26.50.0-alpha-1` (unchanged) — still 2 classes missing vs. alpha-7: `epilogue/logging/EpilogueBackend`, `epilogue/logging/NestedBackend` | `v2027.0.0-alpha-2` (unchanged) — still 7 classes missing vs. alpha-7: `driverstation/Alert`, `math/util/Pair`, `smartdashboard/SmartDashboard`, `util/sendable/Sendable`, `vision/apriltag/AprilTag`, `vision/apriltag/AprilTagFieldLayout`, `vision/apriltag/AprilTagFields` | **Blocked** — unchanged, still needs Phoenix 6 | **Blocked** — unchanged, still needs Phoenix 6 and PhotonVision |
| 2026-09-14 (automated, `NerdSwerveYAGSL2026/tools/check-alpha7-readiness.sh`) | `v2027.0.0-alpha-7` (unchanged, no alpha-8) | `2027_alpha7` bucket gained one more entry since the last check — **`ChoreoLib-2027.0.0-alpha-3.json`** — alongside the `AdvantageKit`/`REVLib` entries already there. REVLib's alpha-7 build is now confirmed clean on *both* the class-reference and native-ABI checks (this fully clears NerdSwerve's gate, not this repo's). Still no Phoenix 6 or `photonlib` entry in `2027_alpha7` | `26.50.0-alpha-1` (unchanged) — still 2 classes missing vs. alpha-7: `epilogue/logging/EpilogueBackend`, `epilogue/logging/NestedBackend` | `v2027.0.0-alpha-2` (unchanged) — still 7 classes missing vs. alpha-7: `driverstation/Alert`, `math/util/Pair`, `smartdashboard/SmartDashboard`, `util/sendable/Sendable`, `vision/apriltag/AprilTag`, `vision/apriltag/AprilTagFieldLayout`, `vision/apriltag/AprilTagFields` | **Blocked** — unchanged, still needs Phoenix 6 | **Blocked** — unchanged, still needs Phoenix 6 and PhotonVision |
| 2026-09-18 (manual, this session — directly checked `vendor-json-repo`'s live directory listing and CTRE's own `SystemCoreTesting/main/CTR-Phoenix.md` compatibility doc, not just the automated script's cached view) | `v2027.0.0-alpha-7` (confirmed via the GitHub releases page — still nothing newer) | **`2027_alpha7` bucket now holds `Phoenix6-26.70.0-alpha-2.json` and `Phoenix6-replay-26.70.0-alpha-2.json`**, alongside `AdvantageKit`/`ChoreoLib`/`REVLib`. Still no `photonlib` entry | **`26.70.0-alpha-2`, and it's in the `2027_alpha7` bucket** — CTRE's own compatibility doc states this release is `2027_alpha7`-compatible | `v2027.0.0-alpha-2` (unchanged) — still not marketplace-pinned for alpha6/7 | **Ready → Phase 1a executed this session.** `code/OpModeV3Robot` and `tools/verify-lessons-v3.sh` now pin the alpha-7 bucket for Phoenix 6; Lessons 0–14 verified compiling with zero warnings at every intermediate stopping point. See [Phase 1a](#phased-plan) above for what broke and how it was fixed | **Still blocked** — unchanged, needs PhotonVision's own alpha6/7-pinned release |
| 2026-09-22 (manual, this session — investigated PhotonVision's own `Dev` CI channel directly as a possible shortcut, not just the marketplace) | `v2027.0.0-alpha-7` (unchanged) | Unchanged — still no `photonlib` entry in `2027_alpha7` | Unchanged | **Still no tagged/numbered release beyond `v2027.0.0-alpha-2` (targets alpha-6).** But PhotonVision's `Dev` branch (a continuously-recreated pre-release, not a version tag) does genuinely target alpha-7 in source, confirmed by cloning it directly: `build.gradle` sets `wpilibVersion = "2027.0.0-alpha-7"`. Its real published snapshot (`org.photonvision:photonlib-java:dev-v2027.0.0-alpha-2-66-g18e9cb30` on `maven.photonvision.org`) was hand-assembled into a vendordep JSON via PhotonVision's own documented "install a specific version" workflow and compiled clean against this project in a real sandbox. **Deliberately not adopted as a stand-in** — PhotonVision labels this channel "use at your own risk," and `javap` shows `PhotonPoseEstimator`'s API has been redesigned (no more generic `update()`, replaced by eight separate named strategy methods), the signature of unfinished work rather than a completed migration. Full reasoning in `docs/lesson-plan-opmode-restructure.md`'s R2 section. **User decision: keep waiting for an actual tagged release.** | N/A (this session's Track A already executed; unaffected) | **Still blocked** — the dev-channel shortcut was investigated and rejected; still needs a real, numbered, alpha6/7-targeted PhotonVision release |
| 2026-09-24 (manual, this session — direct `vendor-json-repo` checkout of `2027_alpha7`, plus LimelightLib 2's own repo history) | `v2027.0.0-alpha-7` (unchanged) | Unchanged: `AdvantageKit-27.0.0-alpha-5`, `ChoreoLib-2027.0.0-alpha-3`, `Phoenix6-26.70.0-alpha-2` (+ replay), `REVLib-2027.0.0-alpha-7`, `ReduxLib-2027.0.0-alpha-7`. No `photonlib`, and no LimelightLib entry either | Unchanged | **No longer needed.** The v3 track switched vision to **LimelightLib 2** (`2.0.0-beta9-alpha7`, `wpilibYear: 2027_alpha7`), pinned by commit `717a921` of `LimelightVision/limelightlib-public` because the vendor's own URL is overwritten on every release (beta5→beta9 in one week). PhotonVision is now informational only for this repo | N/A (unaffected) | **Unblocked vendor-side.** Lesson 15 migrated to Limelight and verified (0–15 compile, zero warnings; runtime-checked in sim). Lessons 16–34 remain pre-alpha-7 code — that's Phase 1b's migration work, gated on nothing external |
| 2026-09-27 (manual, this session — sparse checkout of `vendor-json-repo`'s `2027_alpha7` folder) | `v2027.0.0-alpha-7` (unchanged) | One new file, `DogLog-2027.2.0.json`; otherwise unchanged. `2027_alpha7_metadata.json` now also names `maplesim`, `photonlib`, `PathplannerLib`, YAGSL and others, but those are metadata entries only — none has a vendordep JSON in the folder, so none is installable | Unchanged | Unchanged (informational only) | N/A (unaffected) | **BLine `2027.0.0-beta.1` pinned by commit `d996781`** (not in the marketplace; its own URL follows a branch). Lesson 17 written and verified; Lessons 20–34 remain pre-alpha-7 code |

## Monitoring

A Routine checks the three sources below every 6 hours
(`0 */6 * * *`) and compares against the last row of the table above,
**tracking Track A and Track B separately** — Phoenix 6 alone going ready
is real, reportable news even while PhotonVision stays blocked, per the
[split above](#splitting-the-gate-lessons-114-dont-need-photonvision):

- **`https://github.com/wpilibsuite/vendor-json-repo`** — does a
  `2027_alpha6` or `2027_alpha7` folder exist yet, and if so, does it
  contain a Phoenix 6 and/or `photonlib` JSON? These are independent
  questions — one can appear without the other.
- **CTRE Phoenix 6** — any release/changelog entry naming alpha-6 or
  alpha-7 compatibility. This alone is Track A's gate.
- **PhotonVision** — same, via its GitHub releases. **No longer gates
  anything since 2026-09-24** (the v3 track uses LimelightLib — see the
  update at the top), **but still watched on purpose**: the user wants to
  know when an alpha-7 PhotonLib lands, because a PhotonVision flavor of
  Lesson 15 is a possible future option (see the restructure plan's
  housekeeping checklist). A release gets a tracking-table row, reported as
  "an option is now possible," never as "Track B unblocked."
- **`https://github.com/wpilibsuite/allwpilib/releases`** — informational
  only: whether a newer alpha (alpha-8+) has shipped before the vendors
  caught up to alpha-7, since that would change the actual upgrade target.

**On no change to either track:** the check ends silently — no commit, no
push, no notification. This is a long-running wait with an unpredictable
clear date; a ping every 6 hours saying "still blocked" would train the
notification to be ignored right when it matters.

**On a real change to either track** (a new marketplace bucket appears, or
a vendor ships an alpha-6/7-tagged release): the routine appends a row to
the [Vendor tracking](#vendor-tracking) table above with the finding,
source link, and timestamp, commits, pushes, and the firing ends with a
summary — which is what triggers the push/email notification. **If Track A
alone clears, say so plainly and distinctly from Track B** — that's the cue
to come back to this doc and start **Phase 1a** on Lessons 1–14 without
waiting for PhotonVision.
