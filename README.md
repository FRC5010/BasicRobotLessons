# Learn Java + Robot Programming

This is a hands-on course that teaches Java **while** building working swerve-drive robot
code. You start from a WPILib OpMode Command Robot project (SystemCore, the
WPILib 2027 alpha, coroutine-style Commands V3) and, lesson by lesson, grow it
into a robot you can drive with a joystick, watch on live plots, run in
simulation, steer to angles, drive exact distances, localize on the field with
vision, follow autonomous paths, and run mechanisms, a superstructure, and tests.

Each lesson introduces **as few new ideas as possible** and ends with a real,
runnable result. Do them in order — every lesson builds on the previous one.
Read the lessons carefully, not all code changes are in code sections and try out
your own ideas within the lessons as well as the exercises. Take time in between
each lesson to get to understand the code you've added.
**The concepts introduced are not explored at the same level as a real programming course.**
**It would be to your benefit to pair this with an actual course in Java before or during.**

**Read the lessons as a website:** <https://frc5010.github.io/BasicRobotLessons/> —
the same lessons as the files in this repo, with a sidebar and a search box.

**The earlier course is parked.** The roboRIO / WPILib 2026 version of this
course (Commands V2) lives in [`2026/`](2026/README.md). It is no longer
maintained.

## Hardware assumed

- **TalonFX** motors (CTRE Phoenix 6) — drive and steering.
- **Pigeon 2** gyro (CTRE Phoenix 6).
- An Xbox controller on the driver station.
- A **Limelight** camera (Lesson 15 only) — entirely optional; Lesson 15's own
  simulated camera covers the whole lesson without one.

You do **not** need a real robot for most of this course — the simulation lessons
let you see everything working on your laptop. Device IDs in the examples
(`0`, `1`, …) are placeholders; change them to match your robot.

> **API note:** Code targets the **WPILib 2027 alpha** and **Phoenix 6**. Alpha APIs
> move; if a method name has drifted in a newer build, use the editor's
> autocomplete (Ctrl+Space) and the
> [Phoenix 6 docs](https://v6.docs.ctr-electronics.com/) to find the current one.

## How to use these lessons

1. Read the **Goal** and **New concepts** at the top so you know what you're learning.
2. Work through the **Walkthrough**, typing the code yourself (don't copy-paste —
   typing is how the syntax sticks).
3. Run it in simulation (or deploy it to the robot).
4. Do the **Try it** challenge before moving on. That's where the real learning is.

## Running your code

| What | Command (PowerShell) |
|------|----------------------|
| Build / check it compiles | `./gradlew build` |
| Desktop simulation (SimGUI) | `./gradlew run` (or VS Code's **WPILib: Simulate Robot Code**) |

[Lesson 0](docs/lessons/v3/00-orientation.md) covers both ways to run the simulation.

## How the lessons are verified

This course is written with AI assistance, so it's fair to ask: does the code
actually work, or does it just read like it does? Here's exactly what backs
that up.

- **Every lesson compiles for real, not "should compile."**
  [`tools/verify-lessons-v3.sh`](tools/verify-lessons-v3.sh)
  rolls each lesson's reference code — the same code shown in the lesson
  text — forward through a real GradleRIO project and runs `./gradlew build`
  against it: lesson 0, then lessons 0–1, then 0–2, and so on through the
  newest lesson. From the point the course introduces JUnit, the actual
  tests run too, not just a compile check. Every lesson, at every
  intermediate stopping point, builds clean — this is checked after every
  change, and a regression is treated as a real bug, not noise.
- **You can run the exact same check yourself:**
  ```bash
  git clone https://github.com/FRC5010/BasicRobotLessons.git
  cd BasicRobotLessons
  ./tools/verify-lessons-v3.sh   # every lesson
  ```
  There's no separate "for real" version of this check — it's the one this
  repo runs on itself.
- **Numbers in the text are measured, not guessed.** A stated settle time,
  tolerance, or gain came from a real test harness run in a throwaway
  sandbox, not from memory or from an earlier season's figure. Where
  a new measurement disagreed with an old one, the lesson says so rather than
  picking whichever number sounded better.
- **API claims are checked against the real library, not assumed.** This
  matters most because the course targets a WPILib alpha with no
  stable documentation yet — method names and class shapes are confirmed
  with `javap` against the actual downloaded jars, or read directly from
  [`wpilibsuite/allwpilib`](https://github.com/wpilibsuite/allwpilib)'s
  source at the exact pinned version, before they're written into a lesson.
- **Gaps are labeled, not hidden.** A few lessons depend on
  third-party libraries that haven't caught up to this WPILib alpha yet;
  those are marked openly as skipped, or as hand-built stand-ins with the
  reason stated, rather than quietly faked to look complete. See
  [the lesson list](docs/lessons/v3/README.md) and
  [the restructure plan](docs/lesson-plan-opmode-restructure.md) for the
  full, itemized list of what's verified, what's a stand-in, and why.

If you ever find a lesson that doesn't build as written, that's a real bug —
please [open an issue](https://github.com/FRC5010/BasicRobotLessons/issues).

## The lessons

The course is the **[OpMode track](docs/lessons/v3/README.md)**: SystemCore, the
2027 alpha's OpMode framework, and coroutine-style Commands V3. Its page has
the full lesson table and the asides (setup, branching, the debugger). Start
with [the setup aside](docs/lessons/v3/aside-setup.md), then Lesson 0. Your
starting project is [`code/OpModeV3Robot`](code/OpModeV3Robot); the setup aside
shows how to pull it out. Some lessons are hand-built stand-ins rather than
straight ports of the earlier course, and the lesson list says which, and why;
[the restructure plan](docs/lesson-plan-opmode-restructure.md) has the
full per-lesson status.

**The 2026 classic track** (roboRIO, WPILib 2026, Commands V2) is parked in
[`2026/`](2026/README.md), with its own lessons, code, and verify script. It is
archived, so expect no fixes there.

## Skipping ahead to a lesson in the middle

The lessons are cumulative — [Lesson 18](docs/lessons/v3/18-elevator.md) assumes the
`Drivetrain`, `ModuleIO`, `Localizer` and everything else that lessons 0–17
built is already sitting in your project. So you can't just open Lesson 18 and
start typing.

You can, though, have this repo **put your project in that state for you**.
`tools/update-lesson-v3.sh` takes the lesson you're about to do and your own
project folder:

```bash
git clone https://github.com/FRC5010/BasicRobotLessons.git
cd BasicRobotLessons
./tools/update-lesson-v3.sh 18 ~/dev/MyOpModeRobot
```

It updates your project in place, protected by git rather than by a
throwaway folder, and marks every spot where that lesson has you add or
change code. It also has a small app wrapping that script: double-click
`Update Lesson.cmd` (Windows) or `Update Lesson.command` (macOS) at the root
of this repo, pick a lesson and a folder, and press Update. See
[the lesson list's section on this](docs/lessons/v3/README.md#starting-a-lesson-from-the-reference-code)
for what it overwrites, how `Constants.java` is merged, and going backwards.

On Windows, run the script in **Git Bash** (the WPILib/Git installers from
[the setup aside](docs/lessons/v3/aside-setup.md) give you one), not PowerShell.
It needs `bash`, `curl`, `python3`, and network access, because it downloads the
vendordeps each lesson requires.

If you'd rather not touch your own project, `./tools/verify-lessons-v3.sh 17 --sandbox ~/dev/MyRobot`
builds a fresh project in the state as of the end of Lesson 17 instead
(that folder is deleted at the start of every run, and the script refuses a path
inside this repo).

Two things to know either way:

- **The device IDs are placeholders.** The reference code uses `0`, `1`, … for
  CAN IDs and camera names; change them to match your robot.
- **You're skipping the explanations, not just the typing.** The snapshots are
  reference code, and the reasoning behind them lives in the lesson text. If you
  jump to Lesson 18, at least skim the lessons that introduced the patterns
  you're about to build on — [the lesson list](docs/lessons/v3/README.md)
  says what each one added.

The same trick works when you're stuck rather than ahead: generate a known-good
state as of the last lesson you finished and diff it against your own project to
find what drifted.

## A mental model to carry through the whole course

- **`Robot`** is a metronome. ~50 times a second it ticks the scheduler. You almost
  never edit it.
- **Subsystems** own hardware (a motor, the gyro) and expose *commands* — little
  descriptions of work to do.
- **Commands** say *what* to do. The **scheduler** decides *when*, and makes sure
  two commands never fight over the same motor.
- **Your `Robot` class** (plus an opmode class per driver-selectable mode) is the wiring
  diagram: it creates subsystems and says which button or joystick triggers which
  command.

Keep that picture in mind and every lesson will fit into it.
