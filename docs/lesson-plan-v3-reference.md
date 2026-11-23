# Plan: the Concepts Study Guide

A set of website pages that summarise the course's important ideas by topic,
not by lesson, for studying and quick lookup. The reader writes no code; the
pages use code in examples. Pop-up quizzes run through every page.

This is a contributor document, kept off the website by the
`lesson-plan-*.md` exclude. Nothing here is pasted into a page as is.
Status: **infrastructure started 2026-11-22** (section 10).

## 1. Decisions so far (user, 2026-11-22)

- **Where:** a new section named **Concepts Study Guide**, in
  `docs/study-guide/`, with its own sidebar entry next to the OpMode track,
  grouped into Java, FRC and Tools pages (user, second round).
- **Quizzes:** pop-ups on the website, which **remember scores** in the
  reader's browser. On GitHub's own view they fall back to click-to-reveal
  blocks (section 5). The guide's home page also shows a total across all
  pages (second round: "Sure").
- **Which code:** concepts are taught **in their final form**, as the course
  ends up writing them. The pages **don't assume the reader has done every
  lesson**: each page stands on its own, explains in a sentence or two any
  idea it leans on, and links to the lesson that teaches it in depth. A
  student at Lesson 8 can read the Commands page and follow it. A note marks
  anything that only appears later in the course ("from Lesson 24 on, ...").

**Second round (user, 2026-11-22):** add a **Tools** group (SimGUI and
AdvantageScope); fold **Units and measures** into *Methods, variables and
types* and **Alerts** into *Logging*; testing with JUnit stays out for now;
page length is "hard to judge", so the pilot pages set it; links from lesson
recaps come "eventually", not in the first pass.

## 2. The pages

Topics are the user's list. The grouping and the slugs are proposals (section 9
lists the open questions). "First met" is the lesson that introduces the idea;
"also" lists the lessons that extend it, and so the ones each page should link.

### Java

| Page | Slug | Covers | First met / also |
|---|---|---|---|
| Classes, enums and objects | `java-classes-enums-objects` | class vs object, `new`, fields, constructors, `this`, `private`/`public`, packages and `import`, `static`, `final` and blank `final`, enums (simple, then with fields, constructors and methods), `switch` expressions over enums, the one record the course writes (`VisionIO.PoseObservation`, Lesson 15) | 0, 1 / 13, 15, 24 |
| Methods, variables and types | `java-methods-variables-types` | primitives (`double`, `int`, `boolean`) vs objects, locals vs fields, parameters and return values, overloading as the course meets it, `if`/`else`, loops (`for`, enhanced `for`, `do`/`while`), arrays and `List`, `Optional`, WPILib Units types (`Distance`, `Angle`, `.in(...)`, `.times(...)`), `instanceof` pattern matching | 0–3 / 5, 7, 10, 15, 18, 26 |
| Inheritance and interfaces | `java-inheritance-interfaces` | `extends`, `super`, `protected`, overriding; interfaces and `default` methods; anonymous classes (`new GyroIO() {}`); composition vs inheritance (the course leans on composition); `Mechanism` as an interface | 0, 13 / 14, 19, 20 |
| Lambdas and coroutines | `java-lambdas-coroutines` | lambdas, method references (as values and as actions), capturing variables, the Commands V3 coroutine body (`coroutine -> { ... }`), `yield`, `await`, `waitUntil`, bodies that run out vs forever | 2 / 6, 9, 17, 25 |
| Suppliers, consumers and functions | `java-suppliers-consumers` | `Supplier<T>`, `BooleanSupplier`, `Consumer<T>`, `Function<A, B>`; "a value fetched fresh each tick"; why a method reference that calls a method *before* `::` captures one value (the Lesson 17 Try It #8 trap) | 2 / 14, 17, 21, 25, 33 |
| Annotations | `java-annotations` | what an annotation is; `@Override`; the opmode annotations (`@Teleop`, `@Autonomous`, `@Utility`); AdvantageKit's `@AutoLog` writing code at compile time; JUnit's `@Test` | 0 / 13, 31 |

### FRC: hardware and sensors

| Page | Slug | Covers | First met / also |
|---|---|---|---|
| TalonFX motor control and configuration | `frc-talonfx` | `TalonFX` and `CANBus`; control requests as reusable objects (`DutyCycleOut`, `VoltageOut`, `PositionVoltage`, `VelocityVoltage`, `MotionMagicVoltage`); `TalonFXConfiguration` and applying it once; slot gains; `SensorToMechanismRatio`; soft limits; current limits (supply vs stator); the simulated device and `ctre_sim` | 1 / 4, 12, 18, 20, 28, 29 |
| Sensors: gyro, encoders, limits | `frc-sensors` | built-in rotor encoder vs CANcoder (absolute) and magnet offsets; Pigeon 2 yaw; limit switches and homing; beam breaks; "safe stuck reading" wiring; debouncing; status signals and their freshness | 4, 5 / 8, 12, 21, 22 |
| Joystick controls | `frc-joystick` | `CommandGamepad`, axes and their signs, buttons and the D-pad as buttons, triggers as axes, deadband ideas, field-relative vs robot-relative, alliance-relative driving (Lesson 17 §11), SimGUI's keyboard mapping (Lesson 6) | 2 / 6, 10, 17 |

### FRC: control

| Page | Slug | Covers | First met / also |
|---|---|---|---|
| Control math: gears, models and P control | `frc-control-math` | gear ratios and unit walks (rotor → mechanism → metres); setpoint, measurement, error; P control and what too much gain does (Lesson 5's ringing); feedforward `kS`/`kV`/`kA`/`kG` and the motor-model arithmetic (0.1187 V per rotor rot/s, 1.677 V per N·m); onboard vs software loops; motion profiles (Motion Magic, `TrapezoidProfile`); `PIDController`; characterising with SysId | 5 / 6, 8, 12, 17, 18, 20, 26, 28, 33 |
| Position and vector math, coordinate frames | `frc-geometry` | `Translation2d`, `Rotation2d`, `Pose2d`; the field frame (origin, +X, +Y, CCW-positive angles) vs the robot frame; angle wrapping (`MathUtil.inputModulus`, `Rotation2d.minus`); kinematics and `ChassisVelocities`; `toRobotRelative`/`toFieldRelative`; odometry vs the fused estimate; alliance flipping and `FlippingUtil` | 7 / 10, 11, 14, 16, 17, 26, 27 |

### FRC: the framework

| Page | Slug | Covers | First met / also |
|---|---|---|---|
| Opmodes and their life cycle | `frc-opmodes` | `OpModeRobot`, `PeriodicOpMode`; annotation vs `addOpMode`; constructed on selection, `start()` on Enable, `end()` and `close()` on Disable, rebuilt after every Disable (Figure 0.1); what belongs in `Robot` vs an opmode; binding scope | 0 / 1, 17, 25 |
| How periodic functions run | `frc-periodic` | the 20 ms loop; `robotPeriodic`, `simulationPeriodic`, opmode `periodic`; `Scheduler.run()` order (every `addPeriodic` callback in registration order, then commands, newest-first); why a drawing can be a tick behind (Lesson 20); what happens when a loop overruns | 0 / 4, 13, 20, 24 |
| Commands and triggers | `frc-commands-triggers` | `Mechanism` and requirements; factories (`run`, `runRepeatedly`, `Command.noRequirements`); naming; finish vs cancel, `whenExited` vs `whenCanceled`; default commands; composition (`await`, `Command.parallel`, sequences and their requirements); `Trigger` bindings (`onTrue`, `whileTrue`, `ifTrue`, `retryWhileTrue`), combinators (`.and`, `.debounce`), triggers from any `BooleanSupplier`; what disable does to commands (alpha-8) | 1 / 2, 6, 9, 21, 22, 24, 25 |

### FRC: logging and replay

| Page | Slug | Covers | First met / also |
|---|---|---|---|
| Logging options and where they land | `frc-logging` | `Telemetry.log` (WPILib) under `/Telemetry/...`; AdvantageKit inputs (`processInputs`) under `/AdvantageKit/<key>` and outputs (`recordOutput`) under `/AdvantageKit/RealOutputs/<key>`; the two log files (`WPILIB_` and `akit_`) and what's in each; widgets as snapshots; alerts (`Alert` levels, where they show, gated and sticky alerts), folded in | 3 / 13, 19, 30, 32, 33 |
| IO architecture for logging and replay | `frc-io-replay` | the IO interface, `...Inputs` bundles, real/sim/replay implementations; why replay re-runs your logic on recorded inputs; what counts as an input (the battery voltage, `StartingPlacement`); how replay is started; what replay can't reproduce | 13 / 14–16, 18, 29, 32 |
### Tools

| Page | Slug | Covers | First met / also |
|---|---|---|---|
| SimGUI | `tools-simgui` | Robot State (mode, opmode, Enable); the DS window and alliance station (starts on Red 1); keyboard joysticks and mapping; NetworkTables menu vs NetworkTables View; Field and Mechanism windows; Other Devices and unplug switches; Addressable LEDs; Alerts | 0 / 2, 6, 11, 17, 19, 23, 30 |
| AdvantageScope | `tools-advantagescope` | connecting to the simulator; the sidebar tree; Line Graph and discrete fields; 2D/3D Field (the field drawn with +X left in today's version); Swerve tab; opening a log file and a replay; Mechanism tab (known not to draw 2027 mechanisms in 27.0.0-alpha-6) | 3 / 7, 8, 11, 13, 16, 17, 25 |

**Units and measures** are part of *Methods, variables and types* (`Distance`,
`Angle`, `LinearVelocity`, `.in(...)`, `.times(...)`, comparing measures).
**Testing with JUnit** is left out for now.

**Overlaps to keep in one place:** method references (Lambdas page; Suppliers
links there); `Optional` (Methods page); alliance flipping (Geometry page;
Joystick links there); the 20 ms loop (Periodic page; Opmodes links there).

## 3. What a page looks like

Each page follows one shape, so a reader always knows where to look:

1. **Title** (`# Classes, enums and objects`) and a one-sentence **summary**.
2. **A line saying where the examples come from** (the final code, unless an example
   says otherwise). The list of lessons that teach the topic goes near the end, as
   "Where this comes from", just before the quick reference (user, first review).
3. **Sections**, one idea each, each with:
   - a short explanation in the lessons' voice (CLAUDE.md's teacher's-voice
     rules apply; Lesson 0 is the calibration);
   - **an example from the course's code**, in its final form, with an italic
     lead-in that links to the lesson section where it's written
     (*Example, from `Elevator.java` ([Lesson 18, section 8](...)):*);
   - **the lesson's figure, shown on the page**, when one draws the idea: the image from
     `../../lessons/v3/images/`, captioned "Figure N.k, from [Lesson N](...#figure-N-k)",
     with the lesson's alt text and claim markers (user, first review); No bold "type this" lead-ins:
     nothing on these pages is an instruction;
   - when the idea is easy to get wrong, the wrong picture next to the right one
     (the lessons' move 3).
4. **Quizzes**, two per section (user, first review), each on a different point.
5. **Common mistakes**: the traps the lessons and their measurements found
   (the boot crash on an empty command list, the `getPose()::getRotation`
   capture, `Command.sequence` holding every requirement, ...), each linked to
   where it's explained.
6. **Quick reference**: a compact table or list for lookup ("Control requests
   at a glance", "Where each log call lands").

**Code in examples is never invented.** Every example is copied from a
snapshot (or is a deliberately-wrong version a lesson already shows) and
carries a source tag the checker reads (section 6). A shortened example uses
`// ...` for the parts it drops, as the lessons do.

## 4. Site plumbing (built 2026-11-22)

- **Folder:** `docs/study-guide/README.md` is the section's home ("Concepts
  Study Guide", `nav_order` 3, with the page list and the quiz total). Each
  group is a folder with its own `README.md`: `java/`, `frc-hardware/`,
  `frc-control/`, `frc-framework/`, `frc-logging/`, `tools/`. Topic pages go in
  their group's folder as `NN-slug.md`; the number sets the order.
- **Sidebar:** `docs/_plugins/lesson_nav.rb` places the pages, like the
  lessons, with no front matter: `GUIDE` and `GUIDE_GROUPS` name the section
  and its groups, and `guide_settings` gives a group `parent` the guide and a
  topic `parent` its group plus `grand_parent` the guide. Just the Docs 0.12
  draws the third level correctly (checked in a local build). "How the lessons
  are checked" moved to `nav_order: 4`.
- **Kept off the site until approved:** `docs/_plugins/study_guide.rb` drops
  every guide page from the build while `StudyGuide::PUBLISHED` is false,
  unless the build runs with `STUDY_GUIDE_PREVIEW=1` (a local preview, or the
  quiz tests). Set `PUBLISHED = true` when the pilot pages are approved.
- **Layout and Liquid:** a `defaults` entry for `path: study-guide` gives
  `layout: default` and `render_with_liquid: false`.
- **Cross-links from lessons:** later (user, second round), as a "See also"
  line at the end of a lesson's recap, never mid-walkthrough.

## 5. Quizzes (built 2026-11-22)

### Markup (works on GitHub and on the site)

Each quiz is a `<details>` block, so on GitHub, or with scripts off, it shows
as a collapsed "Check yourself" with the answer hidden until opened:

*Nothing to add — this is the markup:*

```markdown
<details class="quiz" id="q-commands-1" markdown="1">
<summary>Check yourself: a command's body has run out. Which hook runs?</summary>

- [ ] `whenCanceled` only. *Nothing cancelled it.*
- [x] `whenExited` only. *It finished, so only the exit hook runs.*
- [ ] Both, `whenExited` first. *That's what a cancel does.*

</details>
```

- One right answer (`[x]`) among two to five, each ending in an *italic*
  explanation. The pop-up adds "Right." or "Not quite." itself, so the
  explanation doesn't start with either.
- The blank lines after `<summary>` and before `</details>` are needed: without
  them kramdown leaves the list as text.
- kramdown's GFM parser does turn `- [ ]` into checkboxes inside
  `markdown="1"`, the right one `checked` (checked in a build), which is what
  the script reads.
- A claim marker can sit in an explanation when the answer depends on library
  behaviour.

### On the website

`docs/assets/js/quiz.js`, loaded on guide pages only by `head_custom.html`:

- Turns each quiz into a **"Check yourself"** button opening a `<dialog>`: the
  question, the answers as buttons, then the explanation. "Try again" after a
  wrong answer; Close, Escape and a click outside close it, and focus returns
  to the button.
- **Remembers** in `localStorage`, key `BasicRobotLessons.quiz.<id>` (ids are
  unique across the guide, so no page part). A quiz once answered right stays
  right. Each page shows "N of M quizzes on this page answered right" and
  "Forget this page's answers"; the home page shows the total across pages
  ("You've answered X of Y quizzes right, on P of N pages") from the list
  `study_guide.rb` builds, with "Forget every answer".
- A malformed quiz stays a plain block, and isn't counted.
- **Fails safe:** storage calls are wrapped; with scripts off the `<details>`
  blocks work.
- **Tests:** `tools/site-tests/run-quiz-tests.sh` builds a preview with two
  fixture pages and runs `quiz.test.js` (Playwright, Chromium): 33 checks,
  covering answering, reload, the total, the base path, keyboard only, storage
  blocked, scripts off, dark scheme and 390 px. Run it with
  `NODE_PATH=$(npm root -g) ./tools/site-tests/run-quiz-tests.sh`.

### The checker

`tools/check-study-guide.py` checks every quiz: a unique `q-` id, `markdown="1"`,
a "Check yourself:" summary, two to five answers with exactly one right, every
answer explained, no "Right"/"Not quite" opener, the blank lines, no `<` in the question (kramdown reads `Supplier<Pose2d>` there as a tag, and it swallowed the rest of a pilot page), and closed.
Tests: `tools/tests/test_check_study_guide.py`.

## 6. Tying the pages to the checks (built 2026-11-22)

The rule from "How the lessons are checked" applies here too: nothing goes in
because it sounds right.

- **Claim markers:** every sentence (or quiz explanation) that relies on library
  behaviour or a measured number carries `<!-- claim: id -->`, using the
  existing registry. A guide page should almost never need a *new* claim: it
  summarises what the lessons already claim.
- **`check_claims.py` reads `docs/study-guide/` too**, recursively, so a guide
  marker counts as a use and a removed claim breaks the guide page as well as
  the lesson (tests: `StudyGuide` in `test_check_claims.py`).
- **Code examples are checked against the code.** Among the two non-blank
  lines above each ```` ```java ```` fence (so above the italic lead-in is
  fine), a source tag: `<!-- source: lesson-33 subsystems/Elevator.java -->`,
  the path relative to `src/main/java/first/robot/` (`test/...` for Lesson 31's
  tests), or `<!-- source: lesson-33 -->` to search every file.
  `check-study-guide.py` rebuilds that lesson's state through the shared lib and
  matches the example with the lesson-code checker's token rules (comments,
  whitespace and `// ...` anchors don't matter; members may come in any order).
  A deliberately wrong example is tagged `<!-- source: wrong -->` and skipped;
  the prose says it's wrong. The lesson must be at or below the cut-off.
- **The pre-commit hook** checks out `docs/study-guide` with the lessons, and
  runs the guide checker when a guide page, the checker, `code/v3`, the
  template or the roll-forward rules change.
- **UI descriptions** (SimGUI, AdvantageScope) reuse the `wpilib-tools.*`
  claims the lessons already mark, including the AdvantageScope version caveat.
- **Counts on the checks page:** add the guide to "How the lessons are
  checked" when it's published, and update its numbers.

## 7. How it gets built

1. **Infrastructure** (one commit each, checked in a local build):
   section, plugin and layout default; quiz markup, script, styles and
   Playwright checks; quiz checker; `check_claims.py` scope; source-tag
   checker. Settle the nesting question here.
2. **Pilot, for the user's review:** two pages, one Java and one FRC, chosen to
   exercise everything (proposed: *Lambdas and coroutines* and *Commands and
   triggers*, which share examples, claims and a tricky quiz or two). Adjust the
   template from the review before going on.
3. **Batches:** the rest in three or four batches, Java first, then hardware and
   control, framework, logging and tools. Sonnet agents two or three at a time
   (CLAUDE.md's usage note), each given this plan, the page template, the
   relevant lessons and the claims registry, and told to copy examples from the
   snapshots, never write them.
4. **Each page's checklist:**
   - [ ] every example has a source tag and passes the source check;
   - [ ] every library or number statement has a claim marker; the strict
     claims check passes;
   - [ ] the quiz checker passes; each quiz answered once in the built site;
   - [ ] links to lessons resolve (site build), and anything after the reader's
     likely lesson is marked "from Lesson N";
   - [ ] read once in both colour schemes and at 390 px.

## 8. Accuracy risks to watch

- **Summaries drift.** A page that paraphrases a lesson can quietly disagree
  with it later. The markers and source tags catch code and numbers; prose
  needs the lesson link so a reader can check, and a re-read when the lesson
  changes much.
- **Final-form code shows things a student hasn't met.** Each example says
  where it comes from, and the explanation covers what it leans on.
- **Quizzes can be wrong too.** A quiz answer is a claim; mark it, and make the
  explanation say why, so a wrong answer is visible to a reviewer.
- **Unverified UI.** AdvantageScope can't run in this container. UI facts come
  only from the user's screenshots (already claims) or are left out.

## 9. Questions answered (user, 2026-11-22)

1. **Groups:** the four FRC groups plus a **Tools** group (SimGUI, AdvantageScope).
2. **Additions:** Units and measures folded into *Methods, variables and types*;
   Alerts into *Logging*; testing with JUnit left out for now.
3. **Length:** "hard to judge"; the pilot pages set it.
4. **Links from lessons:** eventually, not in the first pass.
5. **Name:** Concepts Study Guide.
6. **Score memory:** per page, and a total on the guide's home page.

## 10. Status

| Step | State |
|---|---|
| Plan | done 2026-11-22 (section 9 answered) |
| Infrastructure | done 2026-11-22: section, sidebar, preview gate, quizzes and their browser tests, quiz and source-tag checker, claims scope, pre-commit hook |
| Pilot pages | written 2026-11-22; revised the same day after the user's first review (lesson list moved to just before the quick reference, figures shown on the page, two quizzes per section, each example linked to the lesson section that writes it, a section on lambdas with parameters that ends at coroutines, the `::` trap moved to Common mistakes). `java/04-lambdas-coroutines.md` (12 examples, 14 quizzes, Figures 8.1 and 25.1) and `frc-framework/03-commands-triggers.md` (11 examples, 14 quizzes, Figures 0.1, 6.1, 9.2 and 25.1). Four new claims (`commandsv3.loop-without-yield-one-tick`, `builders-need-a-name`, `ontrue-starts-not-stops`, `coroutine-body-is-a-consumer`) and one that was unverified (`noyield-command-finishes-same-tick`), each with a JUnit test |
| Remaining pages | Java 01–03 written 2026-11-22 (Classes, enums and objects: 12 examples, 14 quizzes, Figure 24.1; Methods, variables and types: 11 examples, 16 quizzes, with Units as its section 8; Inheritance and interfaces: 11 examples, 14 quizzes, Figure 13.1), on the revised pilots' template. Java 05–06 written 2026-11-23 (Suppliers, consumers and functions: 11 examples, 14 quizzes; Annotations: 7 examples, 10 quizzes, with a new claim `wpilib.opmode-scan-constructor` read from `OpModeRobot`'s bytecode). **The Java group is complete.** Still to write: the FRC and Tools groups |
