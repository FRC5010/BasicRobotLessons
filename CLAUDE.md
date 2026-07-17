# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **documentation-only** teaching repo. There is no Java source, no `build.gradle`, no test suite — the entire product is the ordered markdown lessons under [docs/lessons/](docs/lessons/). Students apply the lessons to a separate WPILib Command Robot project of their own. The `./gradlew` commands in [README.md](README.md) run in the student's project, not here — do not try to run them from this repo.

Target platform (assumed by every lesson): **WPILib 2026**, **Phoenix 6**, **TalonFX** drive/steer motors, **Pigeon 2** gyro, Xbox controller, **AdvantageKit** logging (from Lesson 3 on).

## Lessons are strictly sequential

Lessons 0–11 form a single build. Each one:
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
- Blockquote callouts and code comments render gray, but they are still teaching text: write them **to the student**, never about the lesson from the outside. "Watch out: motors don't stop on their own" — not "this is the misconception of the lesson" or other narration about the material.

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

## When adding or editing a lesson

- Update the lessons table in [README.md](README.md) if the number, title, or "You'll build" summary changes.
- Fix the `Next:` link on the previous lesson and the intro back-reference on the next lesson.
- If you rename a symbol, `grep` the whole [docs/lessons/](docs/lessons/) tree for the old name — later lessons often reuse it verbatim.
- Prefer editing an existing lesson over inserting a new one; inserting shifts every downstream lesson number and every cross-link.

## MCP: FRC docs lookup

[.mcp.json](.mcp.json) wires in the `frc-docs` MCP server (`first-agentic-csa` via `uvx`). When a lesson touches a WPILib or Phoenix 6 API you're not sure is current for 2026, use the `mcp__frc-docs__*` tools (search / list sections / fetch page) rather than guessing — the README explicitly warns that vendordep method names drift.
