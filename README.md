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

## The lessons

This course has two tracks. They teach the same Java and the same robot,
lesson for lesson, but they're built on different WPILib generations and
live in different files — **pick one and stay on it**; don't mix code from
the two.

- **Classic** (below) — the roboRIO, WPILib 2026, and Commands V2, the
  version this course has always taught. Lesson files live under
  [`docs/lessons/`](docs/lessons/), reference code under
  [`code/lesson-N/`](code/), and it rolls forward with
  `./tools/verify-lessons.sh`. **Start here unless you specifically want the
  track below.**
- **OpMode** (further down) — SystemCore and the 2027 alpha's OpMode
  framework with coroutine-style Commands V3, a newer and still-settling
  target. Lesson files live under [`docs/lessons/v3/`](docs/lessons/v3/),
  reference code under [`code/v3/lesson-N/`](code/v3/), and it rolls forward
  with `./tools/verify-lessons-v3.sh`. Three lessons (17, 22, 25) are gaps
  for now — their old-course content leans on third-party libraries
  (BLine, maple-sim) that don't yet run on this alpha — and one (16) is a
  genuinely different, hand-built lesson rather than a straight port. See
  [the restructure plan](docs/lesson-plan-opmode-restructure.md) for the
  full status of every lesson, including what changed and why.

### Classic track — roboRIO, WPILib 2026, Commands V2

| # | Lesson | You'll build | Key Java ideas |
|---|--------|--------------|----------------|
| 0 | [Orientation](docs/lessons/00-orientation.md) | Run the template, print a message | Classes, packages, methods, the loop |
| 1 | [Your first motor](docs/lessons/01-first-motor.md) | Spin a drive motor with a button | Objects, fields, constructors, `import` |
| 2 | [Joystick control](docs/lessons/02-joystick-control.md) | Drive the motor with a joystick | Methods, parameters, `double`, lambdas |
| 3 | [Telemetry & plots](docs/lessons/03-telemetry.md) | Plot position & velocity live | Return values, sensors, AdvantageKit logging |
| 4 | [Simulation](docs/lessons/04-simulation.md) | Make it move on your laptop | `simulationPeriodic`, physics models |
| 5 | [Steering with P control](docs/lessons/05-steering-p-control.md) | Point the module to an angle, primed from a CANcoder at boot | `if`, arithmetic, error, setpoints |
| 6 | [Distance & commands](docs/lessons/06-distance-and-commands.md) | Drive an exact distance | Unit conversion, commands that finish |
| 7 | [Four modules](docs/lessons/07-four-modules.md) | Assemble a 4-module chassis you can translate and rotate | Arrays, `for` loops, helper classes |
| 8 | [Gyro & heading](docs/lessons/08-gyro-heading.md) | Turn the chassis to a compass heading | Reusing patterns, extracting helpers |
| 9 | [Autonomous](docs/lessons/09-autonomous.md) | Compose a drive-turn-drive auto | Command composition, sequences & groups |
| 10 | [Full swerve — kinematics](docs/lessons/10-kinematics.md) | Drive-and-rotate at once with `SwerveDriveKinematics` | Data-carrier types, indexed loops |
| 11 | [Odometry & the field view](docs/lessons/11-odometry-field.md) | Track and draw the robot on a virtual field | Building arrays in loops, small bundle types |
| 12 | [Model-based control](docs/lessons/12-model-based-control.md) | Onboard 1 kHz closed loop with feedforward, replacing boot-time CANcoder priming with continuous remote-sensor feedback | Config objects, control requests |
| 13 | [IO layers & replay](docs/lessons/13-io-replay.md) | Re-run a logged session through changed code | Interfaces, enums, subclassing, annotations |
| 14 | [Pose estimator & localizer](docs/lessons/14-pose-estimator.md) | A localization subsystem fused from pluggable pose providers | Interfaces, registries, timestamps |
| 15 | [Real vision — PhotonVision](docs/lessons/15-photonvision.md) | A real, replay-capable PhotonVision pose provider, plus simulated multi-camera coverage | `Optional`, `static` fields, `record` |
| 16 | [maple-sim — a world to drive in](docs/lessons/16-maple-sim-field.md) | Physics-engine simulation with mass, tire grip, walls, and game pieces | Callbacks, anonymous class bodies |
| 17 | [B-Line autos](docs/lessons/17-bline-autos.md) | Follow a drawn path against the fused pose, with event markers | `PIDController`, method refs as actions |
| 18 | [Scoring elevator](docs/lessons/18-elevator.md) | A second mechanism on the same IO spine, profiled and gravity-compensated | Clamping a goal, reuse over novelty |
| 19 | [A picture of the elevator](docs/lessons/19-mechanism2d.md) | A live stick figure of the mechanism, with a second piece riding on it | Composition as attachment |
| 20 | [Intake arm](docs/lessons/20-intake-arm.md) | A swinging arm with a roller, mounted on the elevator, gravity-compensated by angle | Two motors in one subsystem |
| 21 | [Homing & limit sensors](docs/lessons/21-limit-sensors.md) | A limit switch that tells the elevator where zero actually is | `Trigger` from any boolean |
| 22 | [Beam breaks & the handoff](docs/lessons/22-light-sensors.md) | A sensor that knows you caught a game piece, driving both mechanisms at once | `Trigger` combinators |
| 23 | [LEDs](docs/lessons/23-leds.md) | A strip that shows what the robot knows, and a priority order you chose | Combinator methods |
| 24 | [A superstructure](docs/lessons/24-superstructure.md) | One named state the whole robot reads, with the illegal moves made impossible | Enums with fields and methods, exhaustive `switch` |
| 25 | [Doing two things at once](docs/lessons/25-path-events.md) | Autos that intake, stow and aim *while* they drive, instead of after | Composition applied, not new syntax |
| 26 | [Getting there exactly](docs/lessons/26-drive-to-pose.md) | A two-stage drive-to-pose: fast across the field, then precise onto the spot | Building a `Path` in code |
| 27 | [Going to get something you just saw](docs/lessons/27-object-detection.md) | A camera that finds a game piece, and an approach built while the robot runs | `Commands.defer` |
| 28 | [Keeping the nose on the target](docs/lessons/28-aim-at-tag.md) | Aim assist that holds while you drive, shared by the driver and by autos | None — the point is that it needs none |
| 29 | [A wheel that holds a speed](docs/lessons/29-flywheel.md) | A shooter flywheel with a speedometer, and the first mechanism with no destination | None — the spine repeats |
| 30 | [One battery, everything on it](docs/lessons/30-current-limits.md) | Current limits chosen as a budget, and a brownout you cause on purpose | None |
| 31 | [The robot tells you what's wrong](docs/lessons/31-alerts.md) | A pre-match checklist the robot runs on itself, surfaced where a human looks | None |
| 32 | [Tests that catch what a plot won't](docs/lessons/32-testing.md) | JUnit tests against your own subsystems, with the simulation running inside them | JUnit, arrange/act/assert |
| 33 | [Reading a match log](docs/lessons/33-reading-a-log.md) | Diagnose a failure that already happened, from the log alone, and prove the fix by replaying the match | None |
| 34 | [Tuning your robot when build team hands it over](docs/lessons/34-tuning-with-sysid.md) | Measure a real machine's gains with `SysIdRoutine`, and find out how close the computed ones were | None |

### OpMode track — SystemCore, WPILib 2027 alpha, Commands V3

| # | Lesson | You'll build | Key Java ideas |
|---|--------|--------------|----------------|
| 0 | [Orientation](docs/lessons/v3/00-orientation.md) | Run the template, print a message | Classes, packages, methods, annotations |
| 1 | [Your first motor](docs/lessons/v3/01-first-motor.md) | Spin a drive motor with a button | Objects, fields, constructors, `import` |
| 2 | [Joystick control](docs/lessons/v3/02-joystick-control.md) | Drive the motor with a joystick | Parameters, return values, lambdas, suppliers |
| 3 | [Telemetry](docs/lessons/v3/03-telemetry.md) | Plot position & velocity live | Return values, `instanceof` pattern matching, `SmartDashboard`/`DataLogManager` logging |
| 4 | [Simulation](docs/lessons/v3/04-simulation.md) | Make it move on your laptop | `simulationPeriodic()`, physics models, composition |
| 5 | [Steering with P control](docs/lessons/v3/05-steering-p-control.md) | Point the module to an angle, primed from a CANcoder at boot | `if`/`else`, arithmetic, error, setpoints |
| 6 | [Distance & commands](docs/lessons/v3/06-distance-and-commands.md) | Drive an exact distance | Unit conversion, coroutine bodies that run out, finished vs. canceled |
| 7 | [Four modules](docs/lessons/v3/07-four-modules.md) | Assemble a 4-module chassis you can translate and rotate | Arrays, `for` loops, per-module constructor args |
| 8 | [Gyro & heading](docs/lessons/v3/08-gyro-heading.md) | Turn the chassis to a compass heading | Reusing patterns, extracting helpers |
| 9 | [Autonomous](docs/lessons/v3/09-autonomous.md) | Compose a drive-turn-drive auto | `coroutine.await(...)`, sequential vs. parallel |
| 10 | [Full swerve — kinematics](docs/lessons/v3/10-kinematics.md) | Drive-and-rotate at once with `SwerveDriveKinematics` | Data-carrier types (`ChassisVelocities`), indexed loops |
| 11 | [Odometry & the field view](docs/lessons/v3/11-odometry-field.md) | Track and draw the robot on a virtual field | Building arrays in loops, small bundle types |
| 12 | [Model-based control](docs/lessons/v3/12-model-based-control.md) | Onboard closed loop with feedforward, replacing boot-time CANcoder priming with continuous remote-sensor feedback | Config objects, control requests |
| 13 | [IO layers](docs/lessons/v3/13-io-replay.md) | Every sensor behind a clean `ModuleIO`/`GyroIO` — the doors real replay will use once this framework's tooling catches up, not replay itself yet | Interfaces & default methods, anonymous classes, enums, `switch` expressions |
| 14 | [Pose estimator & localizer](docs/lessons/v3/14-pose-estimator.md) | A localization subsystem fused from pluggable pose providers | Interfaces, registries, timestamps |
| 15 | [Real vision — PhotonVision](docs/lessons/v3/15-photonvision.md) | A real PhotonVision pose provider, plus simulated multi-camera coverage | `Optional`, `static` fields, `record` |
| 16 | [Ground truth — a hand-built stand-in](docs/lessons/v3/16-ground-truth.md) | A hand-built chassis body with friction-limited acceleration, standing in for maple-sim until it supports this framework | Friction-limited acceleration, `MathUtil.slewRateLimit`, `Twist2d.exp()` |
| 17 | — | *Gap for now* — the old lesson's BLine path-following library doesn't run on Commands V3 yet. See the plan doc. | — |
| 18 | [Scoring elevator](docs/lessons/v3/18-elevator.md) | A second mechanism on the same IO spine, profiled and gravity-compensated | Comparing measures directly (`Distance.gt`/`.lt`) |
| 19 | [A picture of the elevator](docs/lessons/v3/19-mechanism2d.md) | A live stick figure of the mechanism, with a second piece riding on it | Composition as attachment |
| 20 | [Intake arm](docs/lessons/v3/20-intake-arm.md) | A swinging arm with a roller, mounted on the elevator, gravity-compensated by angle | Two motors in one subsystem, a `Mechanism` that takes a `Mechanism` |
| 21 | [Homing & limit sensors](docs/lessons/v3/21-limit-sensors.md) | A limit switch that tells the elevator where zero actually is | `Trigger` from any `BooleanSupplier`, no-requirements commands |
| 22 | — | *Gap for now* — the old lesson's beam-break sim needs maple-sim's intake simulation. See the plan doc. | — |
| 23 | [LEDs](docs/lessons/v3/23-leds.md) | A strip that shows what the robot knows, and a priority order you chose | Combinator methods |
| 24 | [A superstructure](docs/lessons/v3/24-superstructure.md) | One named state the whole robot reads, with the illegal moves made impossible | Enums with fields and methods, exhaustive `switch`, a hand-built guard |
| 25 | — | *Gap for now* — same BLine dependency as 17. See the plan doc. | — |
| 26 | [Getting there exactly](docs/lessons/v3/26-drive-to-pose.md) | A two-stage drive-to-pose: fast across the field, then precise onto the spot | `PIDController`, controller objects as fields |
| 27 | [Going to get something you just saw](docs/lessons/v3/27-object-detection.md) | A camera that finds a game piece, and an approach built while the robot runs | `Command.requiring(...).executing(...)` |
| 28 | [Keeping the nose on the target](docs/lessons/v3/28-aim-at-tag.md) | Aim assist that holds while you drive, shared by the driver and by autos | None — the point is that it needs none |
| 29 | [A wheel that holds a speed](docs/lessons/v3/29-flywheel.md) | A shooter flywheel with a speedometer, and the first mechanism with no destination | None — the spine repeats |
| 30 | [One battery, everything on it](docs/lessons/v3/30-current-limits.md) | Current limits chosen as a budget, and a brownout you cause on purpose | None |
| 31 | [The robot tells you what's wrong](docs/lessons/v3/31-alerts.md) | A pre-match checklist the robot runs on itself, surfaced where a human looks | None |
| 32 | [Tests that catch what a plot won't](docs/lessons/v3/32-testing.md) | JUnit tests against your own subsystems, with the simulation running inside them | JUnit, arrange/act/assert |
| 33 | [Reading a match log](docs/lessons/v3/33-reading-a-log.md) | Diagnose a failure that already happened, from the log alone — real replay isn't available on this track yet, so the fix is proven by re-running the same script instead | None |
| 34 | [Tuning your robot when build team hands it over](docs/lessons/v3/34-tuning-with-sysid.md) | Measure a real machine's gains with a hand-built `SysIdRoutine`, since WPILib's own isn't ported to this framework yet | `Trigger.and(...)` |

### Asides (classic track — out of order, read when you need them)

The OpMode track has no asides of its own yet.

- [Setting up the project and connecting it to GitHub](docs/lessons/aside-setup.md) —
  installing WPILib, Git, and the GitHub CLI; creating the project from the
  template; the daily `add`/`commit`/`push` loop. **Start here before Lesson 0
  if you're new to any of it.**
- [Branches: one per lesson, merged into a `main` that always works](docs/lessons/aside-git-branching.md) —
  branching, merging, and the day two lessons touch the same file. Reads on from
  the setup aside, so you can start using it from Lesson 1. Covers merge
  conflicts (and why "keep both" is usually the answer), pull requests, and when
  `rebase` beats `merge`.
- [Debugging in VSCode and reading stack traces](docs/lessons/aside-debugger.md) —
  breakpoints, stepping, watches, conditional breakpoints, and how to read the
  error trail Java prints when something crashes. Useful from Lesson 1 onward;
  the worked example uses Lesson 5's P control.
- [A second thread: sampling odometry faster than the robot loop](docs/lessons/aside-odometry-thread.md) —
  the AdvantageKit odometry thread, and the Java it needs: threads, locks, and
  `waitForAll`. Readable any time after Lesson 16, and genuinely optional —
  Lessons 17–34 neither need it nor break with it. Includes the measurement of
  what 250 Hz odometry actually buys, which is less than you'd think.

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
VERIFY_SANDBOX=~/dev/MyRobot ./tools/verify-lessons.sh 17
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
  you're about to build on — the table above says what each one added.

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
