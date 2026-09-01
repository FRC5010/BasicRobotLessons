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

**Bottom line: two independent gates have to clear before any lesson code
gets touched** — (1) WPILib's marketplace needs an `alpha6` or `alpha7`
bucket, and (2) both CTRE Phoenix 6 and PhotonVision need a release pinned
into it. Until then, editing lesson prose or snapshots would be guessing at
APIs nobody can compile against — exactly what `CLAUDE.md` says not to do.

## Phased plan

**Phase 0 — now, no vendor dependency (this doc + monitoring).** Done by
this commit: the impact assessment above, and the recurring check described
in [Monitoring](#monitoring). No lesson file, snapshot, or deck changes yet.

**Phase 1 — mechanical upgrade, once both gates in
[The vendor blocker](#the-vendor-blocker) clear.**
1. Bump `code/OpModeV3Robot/build.gradle`'s GradleRIO version to the new
   alpha.
2. Bump `MARKETPLACE` and the `VENDORDEPS` URLs in
   `tools/verify-lessons-v3.sh` to the new marketplace bucket and the new
   Phoenix 6 / photonlib file names.
3. Run `./tools/verify-lessons-v3.sh` with no lesson limit (rolls through
   the highest lesson present, currently 34) and read the compiler's error
   list — that list *is* the real, unguessed inventory of what broke,
   superseding every "likely affected" note in this doc.
4. Fix lesson snapshots (`code/v3/lesson-N/`) in lesson order, verifying
   with `./tools/verify-lessons-v3.sh N` after each one, the same
   lesson-by-lesson discipline `CLAUDE.md` already prescribes for normal
   lesson edits.
5. Re-run `./tools/verify-lessons-v3.sh 34 test` once everything compiles,
   to catch anything only a test surfaces.

**Phase 2 — content updates, driven by what Phase 1 actually found.** Only
after the code compiles: update each affected lesson's prose to match the
real new API (not the guessed shape in this doc), following the same
walkthrough conventions every other lesson uses. Update
`docs/presentations/v3/template/build/*.js` code cards for anything renamed
(the gamepad face-button rename is the known one; there may be others).
Re-run `audit-overflow.js` and `validate.py` per the deck template's own
house rules if any deck text changes length.

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
both write here.

| Checked | allwpilib latest | `vendor-json-repo` alpha6/7 bucket | Phoenix 6 latest alpha pin | PhotonVision latest alpha pin | Verdict |
|---|---|---|---|---|---|
| 2026-09-01 (manual, this doc) | `v2027.0.0-alpha-7` | Not present (`2027_alpha1`, `2027_alpha5` only) | `26.50.0-alpha-1` (alpha5) | `v2027.0.0-alpha-2` (built against alpha-6 internally, not yet marketplace-pinned) | **Blocked** — see [The vendor blocker](#the-vendor-blocker) |

## Monitoring

A Routine checks the three sources above every 6 hours
(`0 */6 * * *`) and compares against the last row of the table above:

- **`https://github.com/wpilibsuite/vendor-json-repo`** — does a
  `2027_alpha6` or `2027_alpha7` folder exist yet, and if so, does it
  contain a Phoenix 6 and/or `photonlib` JSON?
- **CTRE Phoenix 6** — any release/changelog entry naming alpha-6 or
  alpha-7 compatibility.
- **PhotonVision** — same, via its GitHub releases.
- **`https://github.com/wpilibsuite/allwpilib/releases`** — informational
  only: whether a newer alpha (alpha-8+) has shipped before the vendors
  caught up to alpha-7, since that would change the actual upgrade target.

**On no change:** the check ends silently — no commit, no push, no
notification. This is a long-running wait with an unpredictable clear date;
a ping every 6 hours saying "still blocked" would train the notification to
be ignored right when it matters.

**On a real change** (a new marketplace bucket appears, or a vendor ships
an alpha-6/7-tagged release): the routine appends a row to the
[Vendor tracking](#vendor-tracking) table above with the finding, source
link, and timestamp, commits, pushes, and the firing ends with a summary —
which is what triggers the push/email notification. That's the cue to come
back to this doc and start **Phase 1**.
