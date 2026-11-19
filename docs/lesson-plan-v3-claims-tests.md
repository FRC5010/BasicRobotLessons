# Plan: test the lessons' claims about the libraries

**Goal.** Every claim a lesson makes about how WPILib or a vendor library behaves is backed by a test.
When a library ships a new release (alpha, beta, the final 2027 release, patches), the tests show
which claims changed and which lessons rely on them. Agent sessions use the same tests to update the
lessons.

**Status:** plan only (2026-11-19). Nothing in it is built yet. The open decisions in section 8 are
the user's.

## 1. What a "claim" is

A claim is any sentence, number, figure or code block in a lesson that is true only because of how
a library behaves. Three kinds:

| Kind | Example | What breaks if the library changes |
|---|---|---|
| **API shape** | `Config.defaults()` exists; there is no `MathUtil.clamp`; BLine's builder takes nine arguments | Student code stops compiling, or a "type this" block no longer matches |
| **Behaviour** | Every Disable rebuilds the opmode; `whenExited` runs on finish *and* cancel; `profiled_rotation` defaults to false | The code compiles, but the robot does something other than what the lesson says |
| **Measured number** | "about 7 cm" of lag with `kV` zeroed; the wheel settles at 0.41 rot/s on 0.05 V; Figure 18.2's curves | The student sees a different number from the one the lesson tells them to look for |

**Criticality.** The plan tests these first:

- **C1:** a wrong claim makes student code fail, crash, or behave in a way the lesson misdescribes
  (most behaviour claims, all API shape).
- **C2:** a number or figure the student is told to look for and compare against.
- **C3:** a side remark (a simulator quirk, a "measured once" aside).
  These get a registry entry but no test until the C1 and C2 claims have one.

## 2. What exists today

| Check | What it catches | What it misses |
|---|---|---|
| `tools/verify-lessons-v3.sh` (Lessons 0–33, every stopping point) | Any API removal, rename or signature change that breaks a snapshot's compile; Lesson 31's two tests with `test` | Behaviour; numbers; lesson code blocks that differ from the snapshot |
| `code/v3/lesson-31/tests` (`ElevatorHomingTest`, `SuperstructureStateTest`) | Homing reaching its tolerance; the state machine's rules | Only those two subjects |
| `tools/check-lesson-markers-v3.py` | NEXT LESSON markers | Nothing about libraries |
| `tools/tests` (Python unit tests) | The update tooling (`merge_constants`, `patch_build_gradle`, the app) | Nothing about libraries |
| `tools/figures/probes` (31 JUnit probes) + 59 generators | Re-measure the data behind the 81 figures; each generator prints its key numbers | Nothing asserts anything. A changed number passes silently unless someone reads the output |
| The vendor-watch Routine (`docs/lesson-plan-alpha7-upgrade.md`, Monitoring) | New marketplace folders and vendor releases, as the alpha-7 migration defined them | Scoped to the alpha-7 gate. It doesn't run any test after a release |
| CI | Only `pages.yml` (the website) | No code check runs on a push |

**The biggest gaps:**

1. **Behaviour claims are tested by nobody.** CLAUDE.md records about 60 of them, with the method
   that measured each. Most of those probes were throwaway scratch files and are gone. CLAUDE.md
   says "not kept in the repo" for whole re-measure batches.
2. **Numbers are measured but not asserted.** The 119 lesson lines that say "measured", plus the
   tables and figures, were each checked once, on one library version.
3. **Lesson code blocks are not checked against the snapshots.** An API change fixed in a
   snapshot can leave the lesson's "type this" block stale. This was checked by hand, lesson by
   lesson (e.g. Lesson 33, 2026-10-31).
4. **No link from a claim to where it's used.** When the alpha-8 Kraken change landed, finding
   every affected sentence took a manual inventory (`kraken-remeasure-inventory.md`).
5. **Nothing runs the checks when a library changes.**

Found while writing this plan: CLAUDE.md's Units/`inputModulus` note says `clamp` "became
`MathUtil.clamp` in Lesson 7", but Lesson 7 says this alpha has no `MathUtil.clamp`, and so do
five later lessons and the snapshots' comments. The note was carried over from the classic track.
This is a small example of gap 4: nothing ties the notes to the lessons either.

## 3. Design

### 3.1 A claims registry

`tools/claims/claims.yml`, one entry per claim:

```yaml
- id: commands.when-exited-on-cancel
  library: commandsv3            # wpilib | commandsv3 | phoenix6 | advantagekit | limelightlib | bline | gradlerio
  kind: behaviour                # api | behaviour | number
  criticality: C1
  statement: whenExited runs when a command finishes and when it is cancelled; whenCanceled only on cancel.
  used_in:                       # every lesson sentence that relies on it, as an exact quote
    - lesson: 06-distance-and-commands.md
      quote: "`.whenCanceled(...)` runs only on the second one."
    - lesson: 09-autonomous.md
      quote: "Two endings, same as every finishing command since Lesson"
  test: tools/claims/java/framework/CommandHooksTest.java#whenExitedRunsOnCancel
  verified_on: {wpilib: 2027.0.0-alpha-8}
  evidence: CLAUDE.md, "New Commands V3 API" bullet (hook probe, 2026-11-12)
```

For numbers, the entry carries the expected value and the tolerance the text's wording allows:

```yaml
- id: l18.kv-zeroed-lag
  kind: number
  criticality: C2
  expect: {value_mm: 91, range_mm: [85, 97], runs: 3}   # "about 9 cm"
  used_in:
    - lesson: 18-elevator.md
      quote: "about 9 cm"
    - figure: 18-height-setpoint-goal.png
  test: tools/figures/probes/Fig18HeightSetpointGoal.java + tools/claims/checks/l18.py
```

**A quote linter** (`tools/claims/check_quotes.py`, run with the existing `python3 -m unittest`)
fails if any `used_in` quote no longer appears in its lesson. So editing a sentence forces the
registry to be updated too. It needs no build and runs in under a second.

### 3.2 Four tiers of tests

| Tier | What | Runs on | Cost |
|---|---|---|---|
| **A: API shape** | (1) `verify-lessons-v3.sh` compiles 0–33, as today. (2) **New:** `tools/check-lesson-code-v3.py` extracts every bold-lead-in Java block from each lesson and checks that it appears in that lesson's rolled-forward snapshot. The match is whitespace-normalized, and `// ...` anchor lines split a block into fragments that must appear in order. Known staged blocks are listed as exceptions. (3) **New:** reflection tests for "absence" claims (no `MathUtil.clamp`, no `onlyIf`, `simulateJava` removed). | Every change to `code/`, a lesson, or a pin | Minutes (the compile); not yet timed end to end |
| **B: Behaviour** | **New:** JUnit tests under `tools/claims/java/`, one assertion per behaviour claim. Most run in one sandbox at the Lesson 33 state, which has every vendordep. A few need an earlier state, e.g. the opmode lifecycle at Lesson 1, and run there. | Every pin bump; every change to a lesson's code | Estimate 10–20 min (LOOP tests run in real time) |
| **C: Numbers** | **New:** each C2 number gets a check. The 31 figure probes already produce the data, so their generators gain a `--check` mode that compares their printed summary with the registry's ranges. Numbers with no kept probe get one rebuilt from the method CLAUDE.md records. | Every pin bump (for the lessons whose claims depend on the changed library); weekly otherwise | Estimate 1–2 h for all; per lesson, minutes |
| **S: Screens** | **New:** re-shoot the SimGUI screenshots with the existing Xvfb scripts and diff them against the committed images. A real difference is flagged for a person to look at, not failed: menus and window layouts change in ways a pixel diff can't judge. | WPILib version bumps only | Estimate 30 min |

**Flakiness.** LOOP tests run the real robot loop on wall-clock 20 ms ticks, and some results are
bimodal (Lesson 18's 11 or 20 mm lag, Lesson 31's intermittent trap). So:
- every Tier B/C check asserts a range, never one value;
- a check can require "k of n runs";
- every run holds the shared `flock`;
- a check that fails once is re-run once, and only a repeat failure counts. The report says when a
  re-run was needed.

### 3.3 One command, one report

`tools/check-claims-v3.sh [--tier A,B,C,S] [--library NAME] [--lessons 12-18]` builds the
sandboxes through `verify-lessons-v3.sh`, drops the tests in, runs them, and writes
`claims-report.md` (kept out of the repo). Each failure appears as:

```
FAIL commands.when-exited-on-cancel  (C1, commandsv3)
  expected: whenExited ran on cancel; got: not run
  lessons:  06-distance-and-commands.md:212  "`.whenCanceled(...)` runs only on the second one."
            09-autonomous.md:99             "Two endings, same as every finishing command since Lesson"
  last verified: wpilib 2027.0.0-alpha-8 (2026-11-19)
```

`--library` runs only the claims tied to a library, which is what a vendor bump needs.

### 3.4 The upgrade loop

1. A watcher notices a new release: WPILib or GradleRIO; a Phoenix 6 or AdvantageKit JSON in the
   marketplace; a LimelightLib or BLine tag; PhotonLib for Lesson 34. It replaces the alpha-7 Routine
   and keeps that Routine's rule: silent when nothing changed.
2. An agent session bumps the pin on a new branch, runs Tiers A and B, then C for the affected
   libraries, and S if WPILib changed.
3. The report goes to the user, with a proposed fix for each failure:
   - **The library changed:** update the lesson text, the snapshot, the figure (regenerate it), and
     the registry's `verified_on` and expected range.
   - **The test was wrong:** fix the test.
   - **A decision is needed** (the lesson's teaching changes, as with alpha-8's disable behaviour
     and Lesson 24): ask the user. Never rewrite the teaching silently.
4. Nothing merges until the user agrees. CLAUDE.md gets an "upgrade procedure" section that says so.

## 4. The initial claim inventory (Tier B)

Drawn from CLAUDE.md's measured notes. The lessons in brackets come from a keyword search of the
lesson files on 2026-11-19, so they are a first pass. Phase 0 pins each claim to exact quotes.

**WPILib (OpModeRobot, telemetry, math, sim):**
- Opmode lifecycle: built on selection; `start()` on Enable; `end()` then `close()` on Disable; a
  fresh opmode built after every Disable; `close()` on de-selection. (L0, L1, L9, L17, L27)
- `addOpMode` after the constructor needs a second `publishOpModes()`; a duplicate name throws. (L25, L26)
- `RobotState.getOpModeId()` is 0 until the program starts, so bindings in `Robot` are global. (L24)
- `Telemetry.log(widget)` writes a snapshot, not a live registration. (L11, L19)
- In sim, `isBrownedOut()` is always false. (L29)
- `SimDevice.create` returns null for a duplicate name. (L30)
- `Alert` with the same id and level throws; another level is allowed. (L30)
- `Field.getTagPose(20)` is (5.229, 4.035). (L27, L32)
- `Translation2d.getAngle()` is an `Optional`, empty for a zero vector; `Rotation2d.minus` wraps. (L25, L27)
- `MathUtil.inputModulus` exists (L10, L12, L25, L26), and so does `Units.radiansToRotations` (L12).
- **There is no `MathUtil.clamp`.** (L7, L8, L11, L18, L20, L28, and a comment in the snapshots' `Elevator`, `Arm` and `Flywheel`.) A later release is likely to break this kind of claim: if a beta adds the method, six lessons tell students something false, and nothing fails to compile.
- `DCMotor.getKrakenX60`: 7.157 N·m, 374.4 A, 6065 RPM, 2 A free. Every constant derived from it is in Lessons 10, 12, 18, 20, 28 and 33, so this one claim reaches the most lessons.
- `Debouncer` takes seconds as a `double` and reads the replayable clock. (L24, L28, L30)
- `SysIdRoutine`: `Config.defaults()` is 1 V/s, 7 V, 10 s; the command names; the log keys go only to the `WPILIB_` log. (L33)
- `BatterySim.calculateLoadedBatteryVoltage` gives 11 V − 40 mΩ × current. (L29, L30)
- `./gradlew run` starts the robot with SimGUI. (L0) This is a build claim; Tier A checks it.

**Commands V3:**
- `Scheduler.run()` runs `addPeriodic` callbacks in registration order, before any command. (L14, L24)
- It runs the running commands in reverse insertion order. (L25's path-distance guard)
- On disable, commands that need a mechanism are cancelled, and no default commands are queued while disabled; defaults return on enable. (L1, L24)
- `whileTrue` fires only on a rising edge, a schedule while disabled is refused, and `.and(RobotState::isEnabled)` restarts a motion after re-enable. (L24)
- `whenExited` runs on finish and on cancel, and `whenCanceled` only on cancel; on a cancel they run exit first, then cancel; `.until(...)` cancels the inner command. (L6, L8, L9, L25, L26)
- A `SequentialGroup` requires the union of its steps' mechanisms. (L25)
- `Trigger.debounce(Time)` defaults to `RISING`. (L22)
- Opmode-scoped bindings are dropped when another opmode is selected. (L9, L24)
- Plain triggers in a second opmode fire after the first opmode used the same buttons (the fixed Trigger-cache bug). (L33)
- `Command.noRequirements` exists. (L9, L14, L17, L21, L24–L26, L32)
- A finished command can be scheduled again. (L25)
- `Mechanism` is an interface, and no default command is installed for you. (L28)

**Phoenix 6:**
- A fresh `TalonFXConfiguration` has a 120 A stator limit and a 70 A supply limit, both enabled, with a 40 A lower limit after 1 s. (L29)
- From a standstill the stator limit holds a 12 V request to about 3 V for the first ticks. (L1, L6, L12)
- In sim a TalonFX resumes its last request on enable. (No lesson states it; it explains a Lesson 24 result.)
- With soft limits on, Motion Magic's setpoint stops at the limit. (L20 Try It #3)
- `ContinuousWrap` and `SensorToMechanismRatio` behave as Lesson 12 describes.

**AdvantageKit:**
- `Logger.start()` works from an instance initializer in a `LoggedOpModeRobot`. (L13)
- `processInputs` and `recordOutput` do nothing unless logging was started. (L31)
- A `Vector<N3>` record field can't be logged. (L15)
- Replay refuses a HAL sim extension; `AKIT_LOG_PATH` and `replayWatch` work. (L13)
- WPILib alerts are recorded as `RealOutputs/Alerts`. (L30)
- Opmode IDs are stable across runs, and a clean replay matches its recording sample for sample. (L13, L25, L32)
- The battery voltage isn't replayed, which is why it's a recorded reading. (L29)

**LimelightLib:** the simulated camera's frames, published on the real topic, are parsed by the
unmodified library. (L15)

**BLine:**
- The builder takes nine arguments, and passing the same `PIDController` twice throws. (L17)
- `profiled_rotation` defaults to false. (L17)
- Events fire on the next event-loop poll, not inside the follower. (L25)
- `getRemainingPathDistanceMeters()` is 0.0 before the path's first run. (L25)
- `withPoseReset()` resets only the estimate. (L17)
- One-argument `overrideRotation` bypasses the constraints, and the override is static, so it leaks unless cleared. (L25)
- A misspelled path name throws at construction. (L17)

That is 47 Tier B entries, some of which bundle several related claims. Tier C starts from the C2 numbers: every figure's printed summary,
and the lesson tables in Lessons 5, 18, 20, 28, 29, 31 and 33.

## 5. Phases

| Phase | Work | Done when |
|---|---|---|
| **0. Inventory** | Fill `claims.yml` from section 4 and from a pass over every lesson's "measured" lines and tables, with exact quotes. Mark each claim C1/C2/C3 and record its evidence. | Every C1 and C2 claim has an entry, and the quote linter passes |
| **1. Cheap guards** | The quote linter; `check-lesson-code-v3.py`; the absence tests | All three run green on today's lessons, and a deliberately stale block or quote makes them fail |
| **2. Tier B** | Port the C1 behaviour claims into JUnit, starting with the ones that reach the most lessons (Kraken constants, opmode lifecycle, command hooks, disable behaviour, scheduler order) | Each C1 behaviour claim has a passing test, and breaking it (a mutated expectation) fails that test by name |
| **3. Tier C** | `--check` mode for the 59 generators; new probes for the C2 numbers whose probes weren't kept | Every C2 number has a check with a range, and the generator summaries agree with the lesson text |
| **4. Orchestration** | `check-claims-v3.sh`, the report format, and an "upgrade procedure" section in CLAUDE.md | One command runs any tier and lists failures with lesson lines |
| **5. Watching** | Replace the alpha-7 vendor Routine with one that covers every pinned library and starts the upgrade loop (section 3.4) | A simulated "new release" (a pin changed by hand on a branch) produces a report |
| **6. Screens** | Tier S re-shoot and diff | Each SimGUI figure re-shoots, and a changed menu is flagged |

## 6. What this doesn't cover

- **Real hardware.** Every test runs in the simulator. Claims about a real robot (the stator limit
  protecting a real mechanism, a Limelight's real latency) stay as the lessons word them, with no
  test.
- **AdvantageScope and the VS Code extension.** They can't run in this container, so their claims
  stay manual.
- **The SysId analysis tool itself.** It has never been run here. Lesson 33's claims about what it
  reports rest on its source code, and the registry will say so.
- **Lesson 34.** It isn't migrated yet; it joins when it is.

## 7. Risks

- **Real-time tests are slow and sometimes noisy.** Ranges, k-of-n runs and one re-run (section
  3.2) keep false failures rare. The report says when a pass needed a re-run, so a flaky check
  shows up instead of hiding.
- **The registry can go stale.** The quote linter keeps quotes honest. A claim whose lesson text
  changes meaning but keeps its wording can still slip through, so the "verified on" field is
  re-stamped only by a passing test.
- **Cost.** Tier C is the expensive part. Running it only for the libraries a bump touches keeps a
  routine upgrade to minutes. These estimates are guesses until Phase 4 times them.

## 8. Open decisions (the user's)

1. **Where the tests run.** In agent sessions only, as the course has been built so far? Or also as
   a GitHub Actions workflow? CI could run Tiers A and B on every push to a branch and Tier C weekly.
   It needs JDK 25 and network access on GitHub's Linux runners, which the sim natives support, but
   it hasn't been tried.
2. **How a claim points at a lesson.** The plan uses exact quotes in the registry, checked by the
   linter, and leaves the lessons untouched. The alternative is invisible HTML comments in the
   lessons (`<!-- claim: l18.kv-zeroed-lag -->`): sturdier links, but noise in every lesson file.
3. **How far Tier C goes.** Every number the lessons quote, or only C2 (what the student is told to
   look for, plus every figure)?
4. **What the upgrade agent may do on its own.** Report only, or also open a branch with proposed
   lesson edits for the user to review?
