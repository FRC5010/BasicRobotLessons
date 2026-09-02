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

As of this writing, `code/OpModeV3Robot/build.gradle` pins
`org.wpilib.GradleRIO version "2027.0.0-alpha-6"` — one alpha behind the new
release already, for the reason in [The vendor blocker](#the-vendor-blocker)
below: nothing has forced a jump to alpha-6→7 yet because the vendor pins
this course depends on haven't caught up to alpha-6 either.

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
- **`Alert` moved from HAL/wpilib to wpiutil.** Affects Lesson 31
  (`docs/lessons/v3/31-alerts.md`). Likely just an import path change; worth
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

**Phase 1b — Lessons 15–34, fires once Track B also clears (PhotonVision
catches up too).** Same steps as 1a, extended: bump the `photonlib` entry
in `VENDORDEPS` too, then run `./tools/verify-lessons-v3.sh` with no lesson
limit (rolls through the highest lesson present, currently 34) and continue
the lesson-by-lesson fix from wherever Phase 1a left off. Re-run
`./tools/verify-lessons-v3.sh 34 test` once everything compiles, to catch
anything only a test surfaces.

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

1. **`SmartDashboard` → Telemetry/Tunables.** If the old API is truly gone,
   does Lesson 3 get rewritten around the new API (and every downstream
   lesson's `putNumber` calls with it), or does the course pull in
   AdvantageKit at that point instead (revisiting the 2026-08-10 decision
   recorded in `docs/lesson-plan-v3-0-3.md`, conditional on AdvantageKit
   having picked up `OpModeRobot` support by then)? Worth checking
   AdvantageKit's status again when this comes up — the original blocker
   may have moved.
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
- **PhotonVision** — same, via its GitHub releases. Needed only for
  Track B, on top of everything Track A needs.
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
