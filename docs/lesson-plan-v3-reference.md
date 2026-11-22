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
2. **"Where this comes from"**: the lessons that teach it, as links ("First in
   Lesson 1; enums arrive in Lesson 13; enums with fields in Lesson 24").
3. **Sections**, one idea each, each with:
   - a short explanation in the lessons' voice (CLAUDE.md's teacher's-voice
     rules apply; Lesson 0 is the calibration);
   - **an example from the course's code**, in its final form, with an italic
     lead-in (*Example, from `Elevator.java`:*). No bold "type this" lead-ins:
     nothing on these pages is an instruction;
   - when the idea is easy to get wrong, the wrong picture next to the right one
     (the lessons' move 3).
4. **Quizzes** where they reinforce a section (section 5); about one per
   section, usually three to six per page.
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

## 4. Site plumbing

- **Folder:** `docs/reference/README.md` is the section's own page ("Reference",
  with the page list and how to use the quizzes); topic pages beside it.
- **Sidebar:** add `"reference/README.md" => { "title" => "Reference",
  "nav_order" => 3 }` to `TRACKS` in `docs/_plugins/lesson_nav.rb`, and teach
  `settings_for` that a reference page's label is its `#` heading and its order
  comes from a front-matter-free rule (proposed: a number prefix in the file
  name, `01-java-classes-enums-objects.md`, so Java pages come first in a
  fixed order). "How the lessons are checked" moves to `nav_order: 4`.
- **Java and FRC groups in the sidebar:** Just the Docs can nest pages a level
  deeper with `grand_parent`. **Not checked yet**: build a two-group test first.
  If nesting misbehaves, fall back to one flat list with prefixed labels
  ("Java · Classes, enums and objects", "FRC · Commands and triggers").
- **Layout and Liquid:** add a `defaults` entry for `path: reference` with
  `layout: default` and `render_with_liquid: false` (the same rule as lessons;
  without a layout, the page renders unstyled, as the checks page did).
- **Cross-links from lessons:** optional, per section 9. If wanted, a short
  "See also: [Reference — Commands and triggers](...)" line at the end of a
  lesson's recap, never in the middle of a walkthrough.

## 5. Quizzes

### Markup (works on GitHub and on the site)

Each quiz is a `<details>` block, so on GitHub it shows as a collapsed
"Check yourself" with the answer hidden until opened:

*Nothing to add — this is the proposed markup:*

```markdown
<details class="quiz" id="q-commands-1" markdown="1">
<summary>Check yourself: a command's body has run out. Which hook runs?</summary>

- [ ] `whenCanceled` only. *Not quite: nothing cancelled it.*
- [x] `whenExited` only. *Right: it finished, so only the exit hook runs.*
- [ ] Both, `whenExited` first. *That's what a cancel does.*

</details>
```

- One correct answer (`[x]`), two to four wrong ones, each with a one-line
  explanation of why it's right or wrong.
- A claim marker can sit in an explanation when the answer depends on library
  behaviour (this example would carry the `whenExited` probe claim).
- **To check in a build:** whether kramdown's GFM parser turns `- [ ]` into
  checkboxes inside `markdown="1"`; if not, use a plain list with a
  `{: .correct}` marker or a `data-correct` attribute instead.

### On the website

A small script (`docs/assets/js/quiz.js`, loaded from `head_custom.html`):

- Turns each `details.quiz` into a **"Check yourself"** button in the text.
- Opens a **pop-up** (a native `<dialog>`): the question, the options as
  buttons, and after a choice, the explanation, with the right answer marked.
  "Try again" and "Close"; Escape and a click outside close it.
- **Remembers scores** in `localStorage`, key `BasicRobotLessons.quiz.<page>.<id>`
  (the site's existing `BasicRobotLessons.` prefix, because every
  `frc5010.github.io` site shares storage). It stores right, wrong or not
  answered. The button shows a tick once answered right, and a page header
  shows "4 of 6 answered". A "Reset this page's quizzes" link clears them.
- **Fails safe:** wrap every storage call in try/catch (private windows,
  blocked storage). With scripts off, the `<details>` fallback still works.
- **Both colour schemes:** styles in `custom.scss`, branching on
  `$color-scheme` like the existing status marks.
- **Accessibility:** the dialog takes focus and returns it; options are real
  buttons; right/wrong is said in text, not by colour alone.
- **Tests:** Playwright, Chromium (the container has nothing else), in the
  style of the dark-mode checks. Answer, reload and see the score kept; storage
  blocked; scripts off; dark mode; 390 px wide; keyboard only.

### A quiz checker

`tools/check-reference-quizzes.py`, run by the pre-commit hook on staged
reference pages: every quiz has a unique id, exactly one correct option, at
least two options, an explanation on every option, and parses. Unit tests in
`tools/tests/`, broken on purpose once.

## 6. Tying the pages to the checks

The rule from "How the lessons are checked" applies here too: nothing goes in
because it sounds right.

- **Claim markers:** every sentence (or quiz explanation) that relies on library
  behaviour or a measured number carries `<!-- claim: id -->`, using the
  existing registry. A reference page should almost never need a *new* claim:
  it summarises what the lessons already claim. If it does, the claim gets
  evidence like any other.
- **`check_claims.py` reads `docs/reference/` too.** Today it only globs
  `docs/lessons/v3/*.md` (`LESSONS_DIR`); extend it to both folders, so a
  reference marker counts as a use, and a removed claim breaks the reference
  page as well as the lesson. Add a test for the second folder.
- **Code examples are checked against the code.** Before each example, a
  source tag: `<!-- source: lesson-33 subsystems/Elevator.java -->` (the
  lesson whose state to read, and the file). A new mode of the lesson-code
  checker (or a small script reusing its token matcher, `fragments` and
  `match_in_order`) checks that the example's tokens appear in that file at
  that lesson's state. So when a snapshot changes, the reference example fails
  in the same pre-commit run as the lesson block. A deliberately-wrong example
  is tagged `<!-- source: wrong -->` and skipped, with the reason in prose.
- **UI descriptions** (SimGUI, AdvantageScope) reuse the `wpilib-tools.*`
  claims the lessons already mark, including the AdvantageScope version caveat.
- **Counts on the checks page:** add the reference pages to "How the lessons
  are checked" when they land, and update its numbers.

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

## 9. Open questions for the user

1. **Groups and order:** are the four FRC subgroups (hardware and sensors,
   control, framework, logging and tools) right? Should SimGUI and
   AdvantageScope be their own "Tools" group?
2. **Suggested additions:** Units and measures, Testing with JUnit, Alerts:
   separate pages, folded into others, or left out?
3. **Length:** proposed one screen to three screens per page (roughly 800–2,000
   words), three to six quizzes. Too much or too little?
4. **Links from lessons:** add a "See also" line to lesson recaps, or keep the
   reference section separate?
5. **Section name:** "Reference", "Study guide", or "Concepts"?
6. **Score memory:** per page only, or also a total on the Reference home page?

## 10. Status

| Step | State |
|---|---|
| Plan | drafted 2026-11-22, waiting on section 9 |
| Infrastructure | not started |
| Pilot pages | not started |
| Remaining pages | not started |
