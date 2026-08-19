# Learn Java + Robot Programming

This is a hands-on course that teaches Java **while** building working swerve-drive robot
code. You start from the WPILib Command Robot template and, lesson by
lesson, grow it into a robot you can drive with a joystick, watch on live plots,
run in simulation, steer to angles, drive exact distances, turn to a compass
heading, and finally string it all together into an autonomous routine.

Each lesson introduces **as few new ideas as possible** and ends with a real,
runnable result. Do them in order — every lesson builds on the previous one.
Read the lessons carefully, not all code changes are in code sections and try out
your own ideas within the lessons as well as the exercises. Take time in between
each lesson to get to understand the code you've added.
**The concepts introduced are not explored at the same level as a real programming course.**
**It would be to your benefit to pair this with an actual course in Java before or during.**

## Hardware assumed

- **TalonFX** motors (CTRE Phoenix 6) — drive and steering.
- **Pigeon 2** gyro (CTRE Phoenix 6).
- An Xbox controller on the driver station.
- A **PhotonVision** coprocessor and camera (Lesson 15 only) — entirely optional;
  Lesson 15's own simulated cameras cover the whole lesson without one.

You do **not** need a real robot for most of this course — the simulation lessons
let you see everything working on your laptop. Device IDs in the examples
(`0`, `1`, …) are placeholders; change them to match your robot.

> **API note:** Code targets **WPILib 2026** and **Phoenix 6**. If a method name
> has drifted in a newer vendordep, use the editor's autocomplete (Ctrl+Space) and
> the [Phoenix 6 docs](https://v6.docs.ctr-electronics.com/) to find the current one.

## How to use these lessons

1. Read the **Goal** and **New concepts** at the top so you know what you're learning.
2. Work through the **Walkthrough**, typing the code yourself (don't copy-paste —
   typing is how the syntax sticks).
3. Run it (`./gradlew simulateJava` for sim, or deploy to the robot).
4. Do the **Try it** challenge before moving on. That's where the real learning is.

## Running your code

| What | Command (PowerShell) |
|------|----------------------|
| Build / check it compiles | `./gradlew build` |
| Desktop simulation (SimGUI) | `./gradlew simulateJava` |
| Deploy to the roboRIO | `./gradlew deploy` |
| Live console from the robot | `./gradlew riolog` |

## How the lessons are verified

This course is written with AI assistance, so it's fair to ask: does the code
actually work, or does it just read like it does? Here's exactly what backs
that up.

- **Every lesson compiles for real, not "should compile."**
  [`tools/verify-lessons.sh`](tools/verify-lessons.sh) (classic track) and
  [`tools/verify-lessons-v3.sh`](tools/verify-lessons-v3.sh) (OpMode track)
  roll each lesson's reference code — the same code shown in the lesson
  text — forward through a real GradleRIO project and run `./gradlew build`
  against it: lesson 0, then lessons 0–1, then 0–2, and so on through the
  newest lesson. From the point each track introduces JUnit, the actual
  tests run too, not just a compile check. Every lesson, at every
  intermediate stopping point, builds clean — this is checked after every
  change, and a regression is treated as a real bug, not noise.
- **You can run the exact same check yourself:**
  ```bash
  git clone https://github.com/FRC5010/BasicRobotLessons.git
  cd BasicRobotLessons
  ./tools/verify-lessons.sh      # classic track, every lesson
  ./tools/verify-lessons-v3.sh   # OpMode track, every lesson
  ```
  There's no separate "for real" version of this check — it's the one this
  repo runs on itself.
- **Numbers in the text are measured, not guessed.** A stated settle time,
  tolerance, or gain came from a real test harness run in a throwaway
  sandbox, not from memory or from copying the other track's figure. Where
  the two tracks' own measurements genuinely disagreed, the lesson says so
  rather than picking whichever number sounded better.
- **API claims are checked against the real library, not assumed.** This
  matters most on the OpMode track, which targets a WPILib alpha with no
  stable documentation yet — method names and class shapes are confirmed
  with `javap` against the actual downloaded jars, or read directly from
  [`wpilibsuite/allwpilib`](https://github.com/wpilibsuite/allwpilib)'s
  source at the exact pinned version, before they're written into a lesson.
- **Gaps are labeled, not hidden.** A few OpMode-track lessons depend on
  third-party libraries that haven't caught up to this WPILib alpha yet;
  those are marked openly as skipped, or as hand-built stand-ins with the
  reason stated, rather than quietly faked to look complete. See
  [the OpMode track's page](docs/lessons/v3/README.md) and
  [the restructure plan](docs/lesson-plan-opmode-restructure.md) for the
  full, itemized list of what's verified, what's a stand-in, and why.

If you ever find a lesson that doesn't build as written, that's a real bug —
please [open an issue](https://github.com/FRC5010/BasicRobotLessons/issues).

## The lessons

This course has two tracks. They teach the same Java and the same robot,
lesson for lesson, but they're built on different WPILib generations and
live in different files — **pick one and stay on it**; don't mix code from
the two.

- **[Classic track](docs/lessons/README.md)** — the roboRIO, WPILib 2026,
  and Commands V2, the version this course has always taught. **Start here
  unless you specifically want the track below.** Includes the asides
  (setup, branching, the debugger, the odometry thread).
- **[OpMode track](docs/lessons/v3/README.md)** — SystemCore and the 2027
  alpha's OpMode framework with coroutine-style Commands V3, a newer and
  still-settling target. Three lessons (17, 22, 25) are gaps for now, and
  one (16) is a hand-built stand-in rather than a straight port — the
  track's own page explains why, and
  [the restructure plan](docs/lesson-plan-opmode-restructure.md) has the
  full per-lesson status.

## Skipping ahead to a lesson in the middle

The lessons are cumulative — [Lesson 18](docs/lessons/18-elevator.md) assumes the
`Drivetrain`, `ModuleIO`, `Localizer` and everything else that lessons 0–17
built is already sitting in your project. So you can't just open Lesson 18 and
start typing.

You can, though, have this repo **build that starting point for you**. The
`tools/verify-lessons.sh` script exists to compile-check the course's reference
code, and it does that by rolling the pristine WPILib template forward through
one lesson snapshot at a time. Point its output at a folder you want to keep and
what falls out is a complete, buildable project in exactly the state the course
would have left it in.

**Roll forward to the lesson *before* the one you want to start on.** To begin at
Lesson 18, build the state as of the end of Lesson 17:

```bash
git clone https://github.com/FRC5010/BasicRobotLessons.git
cd BasicRobotLessons
./tools/verify-lessons.sh 17 --sandbox ~/dev/MyRobot
```

On Windows, run that in **Git Bash** (the WPILib/Git installers from
[the setup aside](docs/lessons/aside-setup.md) give you one), not PowerShell, and
use a forward-slash path like `~/dev/MyRobot`. The script needs `bash`, `curl`,
`python3`, and network access — it downloads the vendordeps each lesson requires
as it goes.

The result is a real GradleRIO project. Vendordeps are fetched and pinned, the
AdvantageKit `build.gradle` blocks are in place, and the files the lessons
deleted along the way are gone. Verify it before you start:

```powershell
cd ~/dev/MyRobot
./gradlew build
./gradlew simulateJava
```

Then make it yours: `git init` it and push it somewhere (see
[the setup aside](docs/lessons/aside-setup.md)), and set your team number in
`.wpilib/wpilib_preferences.json` — the template ships 5010.

Three things to know before you do this:

- **Pick a folder outside this repo, and don't re-run the script against it.**
  That folder is deleted at the start of every run. Once you've generated it,
  treat it as your project and leave the script alone. (The script refuses a path
  inside this repo for the same reason.)
- **The device IDs are placeholders.** The reference code uses `0`, `1`, … for
  CAN IDs and camera names; change them to match your robot.
- **You're skipping the explanations, not just the typing.** The snapshots are
  reference code, and the reasoning behind them lives in the lesson text. If you
  jump to Lesson 18, at least skim the lessons that introduced the patterns
  you're about to build on — [the classic track's table](docs/lessons/README.md)
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
- **`RobotContainer`** is the wiring diagram: it creates subsystems and says which
  button or joystick triggers which command.

Keep that picture in mind and every lesson will fit into it.
