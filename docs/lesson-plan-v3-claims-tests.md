# Plan: test the lessons' claims about the libraries

**Goal.** Every claim a lesson makes about how WPILib or a vendor library behaves is backed by a test.
When a library ships a new release (alpha, beta, the final 2027 release, patches), the tests show
which claims changed and which lessons rely on them. Agent sessions use the same tests to update the
lessons.

**Status (2026-11-19):** the user decided the open questions (section 8). **Phase 0 is finished.**
604 claims are registered (73 API, 151 behaviour, 380 numbers). 995 hidden markers tie them to
every lesson from 0 to 33 and to the setup and debugger asides. The pre-commit check is strict, so
a claim no lesson marks is an error. Lesson 34 joins when it's migrated. The findings for the user
are in section 5a. Phase 1 is next.

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

### 3.1 A claims registry, and markers in the lessons

**The registry** is `tools/claims/registry/*.toml`, one `[[claim]]` table per claim. TOML because
Python reads it with no extra package (`tomllib`, 3.11+), so the check can run anywhere before a
commit. Claims about a library's API or behaviour, which many lessons share, live in
`<library>.toml` (`wpilib`, `commandsv3`, `gradlerio`, `wpilib-tools`, `phoenix6`, `advantagekit`,
`limelightlib`, `bline`). A lesson's own numbers live in `lesson-NN.toml`, so agents working on
different lessons don't edit the same file. The format, with an example of each kind, is in
[tools/claims/README.md](https://github.com/FRC5010/BasicRobotLessons/blob/main/tools/claims/README.md).
Each entry holds an id, kind (`api`, `behaviour`, `number`), the libraries it depends on,
criticality, a statement, where the evidence is (usually a CLAUDE.md block), the versions it was
measured on, and for a number its unit, the lesson's wording and the range that wording allows
(section 3.6). An optional `test` names a kept probe or test that measures it.

**A lesson points at a claim with a hidden comment** (user decision), inline at the end of the
sentence that relies on it:

```markdown
With `kElevatorKV` zeroed it trails by about 9 cm. <!-- claim: l18.kv-zeroed-lag -->
```

It renders as nothing on GitHub and on the website. Rendered with the site's kramdown on
2026-11-19: inline comments are safe in a paragraph, a list item, a callout, a table cell and a
caption, and an own-line comment is safe with a blank line after it. Directly above a table
without that blank line, it turns the table into a paragraph.

**The checker** (`tools/claims/check_claims.py`, built) fails on: a registry file that doesn't
parse; a missing, unknown or malformed field; a duplicate id; an id prefix that doesn't match its
file; a `test` path that doesn't exist; a marker naming an unknown claim; a malformed marker; a
marker inside a code block (it would show as text); an own-line marker with no blank line after it.
A claim no lesson marks is a warning, and an error with `--strict`, which the hook will use once
Phase 0 is finished. 29 unit tests, each rule checked by removing it and watching its test fail.

### 3.2 Four tiers of tests

| Tier | What | Runs on | Cost |
|---|---|---|---|
| **A: API shape** | (1) `verify-lessons-v3.sh` compiles 0–33, as today. (2) **New:** `tools/check-lesson-code-v3.py` extracts every bold-lead-in Java block from each lesson and checks that it appears in that lesson's rolled-forward snapshot. The match is whitespace-normalized, and `// ...` anchor lines split a block into fragments that must appear in order. Known staged blocks are listed as exceptions. (3) **New:** reflection tests for "absence" claims (no `MathUtil.clamp`, no `onlyIf`, `simulateJava` removed). | Before an agent commit that touches a lesson, `code/` or a pin (section 3.5) | Seconds for the code-block check; minutes for the compile |
| **B: Behaviour** | **New:** JUnit tests under `tools/claims/java/`, one assertion per behaviour claim. Most run in one sandbox at the Lesson 33 state, which has every vendordep. A few need an earlier state, e.g. the opmode lifecycle at Lesson 1, and run there. | Before an agent commit that touches `code/` or a pin (section 3.5) | Estimate 10–20 min (LOOP tests run in real time) |
| **C: Numbers** | **New:** each C2 number gets a check. The 31 figure probes already produce the data, so their generators gain a `--check` mode that compares their printed summary with the registry's ranges. Numbers with no kept probe get one rebuilt from the method CLAUDE.md records. | Before an agent commit that touches that lesson's code, or a pin its numbers depend on (section 3.5) | Estimate 1–2 h for all; per lesson, minutes |
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
  marked in: 06-distance-and-commands.md:222, 09-autonomous.md:99
  measured on: alpha-8
```

`--library` runs only the claims tied to a library, which is what a vendor bump needs.

### 3.4 The upgrade loop

1. A watcher notices a new release: WPILib or GradleRIO; a Phoenix 6 or AdvantageKit JSON in the
   marketplace; a LimelightLib or BLine tag; PhotonLib for Lesson 34. It replaces the alpha-7 Routine
   and keeps that Routine's rule: silent when nothing changed.
2. An agent session bumps the pin on a new branch, runs Tiers A and B, then C for the affected
   libraries, and S if WPILib changed.
3. **The agent proposes the fixes on that branch** (user decision): for each failure it commits
   what it would change and pushes the branch.
   - **The library changed:** update the lesson text, the snapshot, the figure (regenerate it), and
     the claim's `measured_on`, `measured` and range.
   - **The test was wrong:** fix the test.
   - **A decision is needed** (the lesson's teaching changes, as with alpha-8's disable behaviour
     and Lesson 24): leave that lesson alone and put the question in the report. Never rewrite the
     teaching silently.
4. The report goes to the user with the branch name. Nothing is merged into the working branch
   until the user agrees. CLAUDE.md gets an "upgrade procedure" section that says so.

### 3.5 When the checks run

**Before every commit an agent makes, and not on the website build** (user decision). There's no
GitHub Actions workflow, and `pages.yml` stays as it is.

- **The mechanism (built):** a git hook, `tools/githooks/pre-commit`, turned on by a Claude Code
  `SessionStart` hook in `.claude/settings.json` that runs
  `git config core.hooksPath tools/githooks`. So every agent session in a fresh container has it,
  and people committing by hand don't unless they set the same config.
- **It checks what is being committed.** It checks out the staged lessons and `tools/` into a
  temporary folder and runs the checks there. Another agent's unstaged work in the same checkout
  can't block a commit, and `git commit -a` is checked as committed. Tested in a scratch clone: a
  staged bad marker is refused, an unstaged one doesn't block an unrelated commit, `commit -a` that
  picks it up is refused, and a sabotaged checker is refused by its own tests.
- **What it runs now:** the claims checker, and its unit tests when the commit changes them.
- **What later phases add,** chosen by what the commit stages:

  | The commit stages | The hook adds | Time (estimate) |
  |---|---|---|
  | a lesson's `.md` | the code-block check for that lesson (Phase 1) | seconds |
  | `code/v3/lesson-N/` | compile Lesson N and 33; Tier B at those states; Tier C for Lesson N | minutes to tens of minutes |
  | a pin (`V3_VENDORDEPS`, GradleRIO) | everything that depends on that library | the upgrade loop |
  | `tools/` | the changed tool's unit tests | seconds |

- **Slow checks can't run inside the hook.** A tool call that runs `git commit` times out after 10
  minutes at most. So in Phase 4 the slow tiers run first, through `tools/check-claims-v3.sh
  --staged`, which records a hash of the staged `code/`, `tools/lib` and `tools/claims` files in
  `.git/`. The hook refuses a commit whose stamp is missing or out of date, and says what to run.
- **`git commit --no-verify` skips the hook.** CLAUDE.md will tell agents never to use it.

### 3.6 How much a number may move

The user asked for checks that catch real changes but allow for some fluctuation. The rule
(`tools/claims/README.md`): a number's range is the set of values for which the lesson's sentence
is still true as written. A bare X gets its rounding interval at the precision written ("60.47
rot/s" is 60.465–60.475). "About X" allows one unit either way in the last digit ("about 9 cm" is
8–10 cm, "about 1.5 mm" is 1.4–1.6). A stated range widens each end by half a unit ("1–2 cm" is
0.5–2.5 cm). "Under X" is one-sided. A count of random outcomes ("4 of 30 runs") gets the band in
which the lesson's conclusion still holds.

The first rule tried gave "about X" only its rounding interval. The Lesson 18 pilot showed that
was too strict: Lesson 18 says the `kG`-zeroed sag is "about 1.5 mm", and it measures 1.5576 mm.
The text was rounded on purpose to cover the `kP`-alone hold too, which reads 1.52 or 1.56 mm
(mean 1.54).

The run-to-run fluctuation is handled by the check, not by the range: a check can take k of n runs
and re-runs a failure once (section 3.2). If the repeated runs CLAUDE.md records already spread
wider than the wording's range, the wording is too precise for the number. The inventory reports
those cases for the user instead of widening the range.


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
| **0. Inventory** | The checker, its tests, the pre-commit hook, and the library claims from section 4 (built 2026-11-19). Then a pass over every lesson: markers for the library claims it relies on, and `lesson-NN.toml` entries for its numbers, from its "measured" lines, tables and figures, with ranges per section 3.6 | `check_claims.py --strict` passes; the hook then uses `--strict`. **Done 2026-11-19**: seven agent shares plus the Lesson 18 pilot, each reviewed (markers only, checked by stripping them; ranges against the README rules) |
| **1. Cheap guards** | `check-lesson-code-v3.py` (in the hook for staged lessons); the absence tests | Both run green on today's lessons, and a deliberately stale block or absence makes them fail |
| **2. Tier B** | Port the C1 behaviour claims into JUnit, starting with the ones that reach the most lessons (Kraken constants, opmode lifecycle, command hooks, disable behaviour, scheduler order) | Each C1 behaviour claim has a passing test, and breaking it (a mutated expectation) fails that test by name |
| **3. Tier C** | `--check` mode for the 59 generators; new probes for the C2 numbers whose probes weren't kept | Every C2 number has a check with a range, and the generator summaries agree with the lesson text |
| **4. Orchestration** | `check-claims-v3.sh`, the report format, and an "upgrade procedure" section in CLAUDE.md | One command runs any tier and lists failures with lesson lines |
| **5. Watching** | Replace the alpha-7 vendor Routine with one that covers every pinned library and starts the upgrade loop (section 3.4) | A simulated "new release" (a pin changed by hand on a branch) produces a report |
| **6. Screens** | Tier S re-shoot and diff | Each SimGUI figure re-shoots, and a changed menu is flagged |

## 5a. Phase 0 findings (for the user)

The inventory reads every lesson against CLAUDE.md's measurements, so it turns up places where the
text and the libraries disagree.

**Fixed 2026-11-19 (user: "Fix the contradictions"):** items 1–7, 14, 19, 20, 22, 23, 28 and 29,
plus the same `extends Mechanism` slip in Lesson 7. Item 6's fix says `Mechanism` is implemented and
gives a default command only once you install one. Item 4's fix teaches SimGUI's **DS → Keyboard 0
Settings**: raise the button count to 15 and give buttons 11–14 the keys I, K, J and L. That was
checked in SimGUI on alpha-8, against WPILib's own button numbers (D-pad up 11, down 12, left 13,
right 14). Item 23: WPILib 2027 still names the simulator class `RoboRioSim`, so only the sentences
about real hardware changed. **Withdrawn:** item 21. Lesson 30 builds twelve alerts (one in `Robot`,
two cameras, the arm, two for the elevator, the gyro, four steering encoders, the flywheel), so the
lesson is right. The wording items (8–13, 15–18, 24–27, 30–32) are unchanged.

**Follow-up found while fixing item 4:** Keyboard 0 also can't press the other controls the course
binds. Those are the bumpers (from Lesson 7), Start (14), Back (21) and the triggers (22 and 27,
which are axes, beyond the keyboard's three). Each of those lessons needs a line giving that button
or axis a key, the way Lesson 6 now does for the D-pad. The gamepad's axis numbers for the
triggers haven't been checked.

**Wave 1 (the asides and Lessons 0–16, 2026-11-19): 360 markers, about 100 new library claims.**

The lesson says something the libraries or the code contradict:

1. **Lesson 1 §5's watch-out** says the scheduler doesn't check whether the robot is enabled and
   only the motor hardware keeps a disabled robot still. On alpha-8 the scheduler cancels every
   command that needs a mechanism when the robot disables, and refuses to schedule one while
   disabled.
2. **Lesson 1, line 228** says `` `set(fraction)` ``; the lesson's code calls `setThrottle`.
3. **Lesson 3 §6** says Lesson 1 reads the running command off entry zero of a list that is
   "guaranteed non-empty". Since the batch 1 fix, Lesson 1 checks `isEmpty()` and logs "none",
   because the list is empty on every disabled tick. §6's motivation needs rewording; its point
   (a command that starts and finishes within one tick is invisible to a poll) still stands.
4. **Lesson 6 §5** says to tap D-pad up in SimGUI. Keyboard 0 can't press the gamepad's D-pad
   (CLAUDE.md, SimGUI tips: buttons 11–14 need a keyboard with 15 buttons).
5. **Lesson 10 Try It #2** says `RadiansPerSecond.of(Math.PI / 2)` is "half a turn per second";
   it's a quarter.
6. **Lesson 14 §2** says every subsystem class "extended `Mechanism`" and that `Mechanism` gives
   "an automatic `idle()` default command". `Mechanism` is an interface, and nothing installs a
   default command on alpha-7 or alpha-8 (Lesson 28 has to call `setDefaultCommand(idle())`).
7. **The debugger aside §3** says the button is bound to `westFace()`; Lesson 5 binds
   `faceLeft()`.

The wording stretches the measurement:

8. **Lesson 12 Try It #1:** "within about a tenth of a second the voltage is at `kV ×
   requested`". At 0.08–0.12 s it reads 4.54–4.96 V against 5.01 V, and is within 0.01 V only from
   about 0.26 s.
9. **Lesson 4, Figure 4.2:** "within half a second" for a wheel at 99% of steady speed at 0.48 s.
10. **Lesson 6:** "just over half a second" for 0.62 s.
11. **Lesson 15 Try It #3:** "15 to 50 cm in 60 seconds". The three runs ended 16.5–38.9 cm out,
    but one got as far as 52.3 cm on the way.
12. **Lesson 13:** "37 ticks" differ when `kP` is quartered. That's 37 on alpha-8, but alpha-7 gave
    38, so the exact count is fragile.
13. **Lesson 18, Figure 18.1's alt text:** "0.19 mm". Every Lesson 18 run reads 0.194 mm, but at
    the Lesson 32 state the same hold can sit at 0.155 mm.

**28 claims have no recorded evidence** (`measured_on = "unverified"`), and Phase 2 or 3 should
test them first: the VS Code simulate prompt; `Command.parallel`'s optional race and its
shared-requirements exception; `Mechanism` having no periodic; a no-yield command finishing in
its tick, and a short command being invisible to a poll; the `andThen` builder; the command
trace helper; `ORG_GRADLE_JAVA_HOME`; two Lesson 15 numbers (the two-tag trust 0.47 m, the
starting tags 4–6 m away); LimelightLib screening single-tag MegaTag1 harder; Phoenix's 1 kHz
onboard loop, remote CANcoder feedback, `RotorToSensorRatio`, the CANcoder offset and direction,
and the first signal read waiting; five `wpilib-tools` claims (mapping a gamepad in SimGUI, VS
Code's simulate and vendordep commands, connecting AdvantageScope, the installer's contents, the
VS Code debugger); and six WPILib ones (swerve velocity methods returning new objects, the cosine
scale, pose estimator latency compensation, `DataLogManager`'s location on a real robot,
`MathUtil.applyDeadband`, odometry using `Twist2d.exp`).

**Wave 2, part 1 (Lessons 17 and 19–26, 2026-11-19): 325 markers, about 50 new library claims.**

The lesson says something the libraries contradict:

14. **Lesson 21 §6** says this framework's `Scheduler` "doesn't do that gating at all" on disable.
    On alpha-8 it cancels every command that needs a mechanism. The lesson's re-zero command needs
    none, so the sentence is true of that command, not of the scheduler. It's the same family as
    item 1.

The wording stretches the measurement (the number in brackets is what was measured):

15. **Lesson 17:**
    - "178.8°" at the end of Two Corners [178.7–178.9 across runs].
    - "about 6 cm" past the end at 2 m/s [6–7 cm].
    - "roughly 35 cm" and "about 36 cm" past the end at 3 m/s [36–37 cm in five of six runs].
    - "half a second longer" with a 5 cm handoff radius [+0.4–0.5 s].
    - Figure 17.5's "0.47 m at 1.44 s" and "x = 5.58" [0.464–0.474 m, 1.44–1.46 s, 5.568–5.577 m
      over three runs], which are precise only for the one run drawn.
    - "about 82%" of the leg for the `shoot` event [the figure data's handler runs at 83.0–83.3%;
      the marker itself fires at 82%].
16. **Lesson 24:** "125 to 155 ticks" to home [a press 300 ticks after launch takes 95]. The lesson
    already says a later press is quicker; the range is just for presses soon after enabling.
17. **Lesson 25:**
    - "a tenth of a second" from beam break to `HANDOFF` [4–5 ticks, 0.08–0.10 s].
    - `HOLDING` at "2.9 s" [2.92–2.96 s].
    - The slow run scoring at "y 1.48" [1.479 and 1.461].
18. **Lesson 26** (most already known in CLAUDE.md's Lesson 26 notes):
    - The two-stage final error "7–8 mm" [7.9–9.2 mm on arrival, 6.6–8.2 mm half a second later].
    - The old design's "14 mm" [15.7–16.5, then 12.3–12.8].
    - Braking "about 7 m/s²" [6.5–8.6].
    - Handing over at "about 1.45 m/s" [1.43–1.47].
    - Slowing "about 1.4 m/s² on average" [1.17–1.32 by every definition tried; the original
      definition is lost].
    - Rolling "37 mm" past [37–38].
    - The bow "about 26 cm" [262–269 mm in 7 of 9 runs, 284 and 292 in two].
    - The no-turn trip "within 5 mm" (§10 and Figure 26.3's alt text) [5.3–5.6 mm, 5.27 in the
      figure's data]; the callout says "within about 5 mm", which fits.
    - Facing backwards, "0.3°" [0.43–0.45° on arrival, 0.23–0.26° later].
    - The sketch finishing on the "first tick" when facing backwards [the alpha-8 re-measure says
      the second, 0.04 s].

Checked and not a problem: Figure 26.2's text says the robot trails the plan by about 0.3 m/s in
the first tenth of a second. CLAUDE.md records 0.05–0.09 m/s, but the figure's own data, from
position differences, gives 0.28 m/s at 0.08 s, so the lesson matches its figure. Which quantity
CLAUDE.md's figure measured isn't recorded.

**Wave 2, part 2 (Lessons 27–30, 2026-11-19): 150 markers, 11 new library claims.**

The lesson contradicts the libraries or itself:

19. **Lesson 29** says "Six motors is a swerve drivetrain plus two mechanisms". A swerve
    drivetrain has eight motors, as the lesson says later.
20. **Lesson 30 §3** says SimGUI "has no way in" to alerts. That was alpha-7; alpha-8 added
    SimGUI's DS → Alerts window, which §4 describes.
21. **Lesson 30 Try It #7** says the robot now has twelve alerts; share F counted thirteen built
    by the lesson (not re-counted).
22. **Lesson 28's recap** says spinning up takes "two and a half seconds"; its table says 2.3 s.
23. **Lesson 29** mentions the roboRIO in places (lines 41, 426, 475) in a SystemCore course;
    whether the sim class or the hardware is meant wasn't checked.

The wording stretches the measurement [measured]:

24. **Lesson 27:** "9.7°" at 2 m/s [9.66–9.85]; "as much as a degree" for a camera correction
    [spikes up to 1.19°]; "0.8° on average" [0.76–0.90]; Aim While Driving ends "facing 0°"
    [−1.6°]; Figure 27.2's "first 0.7 seconds" [0.76 s at 3 m/s, 0.62 s at 2 m/s].
25. **Lesson 28:** "0.70 s" from a 45 rot/s idle [Figure 28.3's data enters the band at 0.68 s;
    CLAUDE.md's five runs read 0.70]; the "about 6.7 V" jump [6.69 in the rig, 6.79–6.81 in the
    real loop].
26. **Lesson 29:** nine motors "384 A" [one run 383.4]; Figure 29.2's text has the budget's rail
    dipping to about 9 V during the moves [the data reads 7.90 V]; the fresh-battery table says
    "Ten runs of each" [the no-limits row is from thirty]; the fresh defaults' 84–126 A [batch 1's
    four runs included 141 A].
27. **Lesson 30:** the bare 11.27 V, 1.56 s and 11.19 V [some runs read 11.26 V, 1.54 s, 11.18 V].

**Wave 3 (Lessons 31–33, 2026-11-19): 137 markers, 13 new library claims.**

The lesson contradicts the libraries or itself:

28. **Lesson 33 §4** calls `Mechanism` "the base class"; it's an interface (the same slip as
    item 6).
29. **Lesson 33** says the slow-ramp two-term fit lands "near 0.2 V" in one sentence and 0.23 V
    elsewhere.

The wording stretches the measurement [measured]:

30. **Lesson 31:** the whole test takes "0.23 s" without the sleep and "4.1 s" with it
    [0.223–0.325 s; 4.037–4.100 s]; the figure's 20 ms run snaps on tick 181 [one run took 183].
31. **Lesson 32:** the hold "a fifth of a millimetre" and "about minus 0.2 mm" low [0.155 mm in some
    runs; −0.173 to −0.176 mm in the replay]; "the one tick" of dropout, also in Figure 32.2's alt
    text [one of the figure's two steps has two false ticks]; "about 1.2 mm" of overshoot [one run
    read 0.90 mm].
32. **Lesson 33:** `kA` "0.106" [the tool-form hand fits give 0.1063–0.1073]; the reverse plateau
    "−59.2" [−59.12 to −59.26] and "8.47 rot/s per volt" [8.459 in reverse]; the ramp distances
    quoted to four digits, 1.885 / 3.794 / 7.605 m [1.884–1.888 / 3.787–3.797 / 7.597–7.608 across
    the probes, as CLAUDE.md already notes]; "1.04 m" at 4.5 V [1.033 m in the figure run]; the
    1 V/s table's 38% and 77% sit exactly on the rounding edges of 38.5 and 77.5.

**Totals after Phase 0:** 32 items above (14 contradictions, the rest wordings tighter than the
runs), and 46 claims nothing has measured (`measured_on = "unverified"`), the first candidates
for the Phase 2 and 3 tests. A rule learned on the way: let a lesson word a run-to-run number as a
range or with "about", and keep bare digits for numbers that repeat exactly.

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
- **A marker can outlive its sentence.** If someone rewrites a marked sentence and keeps the
  marker, the checker can't tell that the claim changed. Whoever edits a marked sentence re-reads
  the claim's statement, and `measured_on` is updated only by a passing test or a new measurement.
- **Cost.** Tier C is the expensive part. Running it only for the libraries a bump touches keeps a
  routine upgrade to minutes. These estimates are guesses until Phase 4 times them.

## 8. Decisions (the user's, 2026-11-19)

1. **Where the tests run:** before every commit an agent makes; not on the website build, and no
   GitHub Actions workflow. Section 3.5.
2. **How a claim points at a lesson:** hidden HTML comments in the lessons. Section 3.1.
3. **How far Tier C goes:** numbers that a library change could move, checked with room for
   fluctuation. Section 3.6 gives the range rule; after Phase 0 the user confirmed the capped
   "about X" (one unit in the last digit or 10%, whichever is smaller): "seems about right".
4. **What the upgrade agent may do:** propose changes on a branch. Section 3.4.

Chosen while building, open to change: TOML for the registry (no extra Python package), the range
rule in section 3.6, and the git hook switched on by a `SessionStart` hook (section 3.5).
