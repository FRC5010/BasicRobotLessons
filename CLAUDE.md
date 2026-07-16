# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **documentation-only** teaching repo. There is no Java source, no `build.gradle`, no test suite — the entire product is the ordered markdown lessons under [docs/lessons/](docs/lessons/). Students apply the lessons to a separate WPILib Command Robot project of their own. The `./gradlew` commands in [README.md](README.md) run in the student's project, not here — do not try to run them from this repo.

Target platform (assumed by every lesson): **WPILib 2026**, **Phoenix 6**, **TalonFX** drive/steer motors, **Pigeon 2** gyro, Xbox controller.

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

## When adding or editing a lesson

- Update the lessons table in [README.md](README.md) if the number, title, or "You'll build" summary changes.
- Fix the `Next:` link on the previous lesson and the intro back-reference on the next lesson.
- If you rename a symbol, `grep` the whole [docs/lessons/](docs/lessons/) tree for the old name — later lessons often reuse it verbatim.
- Prefer editing an existing lesson over inserting a new one; inserting shifts every downstream lesson number and every cross-link.

## MCP: FRC docs lookup

[.mcp.json](.mcp.json) wires in the `frc-docs` MCP server (`first-agentic-csa` via `uvx`). When a lesson touches a WPILib or Phoenix 6 API you're not sure is current for 2026, use the `mcp__frc-docs__*` tools (search / list sections / fetch page) rather than guessing — the README explicitly warns that vendordep method names drift.
