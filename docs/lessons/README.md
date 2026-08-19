# Classic track — roboRIO, WPILib 2026, Commands V2

The version this course has always taught: the roboRIO, WPILib 2026, and
Commands V2. Reference code lives under [`code/lesson-N/`](../../code/), and
the whole track rolls forward with `./tools/verify-lessons.sh` — see the
main [README](../../README.md) for how to use that to jump into a lesson in
the middle.

This is also the track to be on unless you specifically want
[the OpMode track](v3/README.md) — a newer, still-settling alternative built
on SystemCore and coroutine-style Commands V3.

| # | Lesson | You'll build | Key Java ideas |
|---|--------|--------------|----------------|
| 0 | [Orientation](00-orientation.md) | Run the template, print a message | Classes, packages, methods, the loop |
| 1 | [Your first motor](01-first-motor.md) | Spin a drive motor with a button | Objects, fields, constructors, `import` |
| 2 | [Joystick control](02-joystick-control.md) | Drive the motor with a joystick | Methods, parameters, `double`, lambdas |
| 3 | [Telemetry & plots](03-telemetry.md) | Plot position & velocity live | Return values, sensors, AdvantageKit logging |
| 4 | [Simulation](04-simulation.md) | Make it move on your laptop | `simulationPeriodic`, physics models |
| 5 | [Steering with P control](05-steering-p-control.md) | Point the module to an angle, primed from a CANcoder at boot | `if`, arithmetic, error, setpoints |
| 6 | [Distance & commands](06-distance-and-commands.md) | Drive an exact distance | Unit conversion, commands that finish |
| 7 | [Four modules](07-four-modules.md) | Assemble a 4-module chassis you can translate and rotate | Arrays, `for` loops, helper classes |
| 8 | [Gyro & heading](08-gyro-heading.md) | Turn the chassis to a compass heading | Reusing patterns, extracting helpers |
| 9 | [Autonomous](09-autonomous.md) | Compose a drive-turn-drive auto | Command composition, sequences & groups |
| 10 | [Full swerve — kinematics](10-kinematics.md) | Drive-and-rotate at once with `SwerveDriveKinematics` | Data-carrier types, indexed loops |
| 11 | [Odometry & the field view](11-odometry-field.md) | Track and draw the robot on a virtual field | Building arrays in loops, small bundle types |
| 12 | [Model-based control](12-model-based-control.md) | Onboard 1 kHz closed loop with feedforward, replacing boot-time CANcoder priming with continuous remote-sensor feedback | Config objects, control requests |
| 13 | [IO layers & replay](13-io-replay.md) | Re-run a logged session through changed code | Interfaces, enums, subclassing, annotations |
| 14 | [Pose estimator & localizer](14-pose-estimator.md) | A localization subsystem fused from pluggable pose providers | Interfaces, registries, timestamps |
| 15 | [Real vision — PhotonVision](15-photonvision.md) | A real, replay-capable PhotonVision pose provider, plus simulated multi-camera coverage | `Optional`, `static` fields, `record` |
| 16 | [maple-sim — a world to drive in](16-maple-sim-field.md) | Physics-engine simulation with mass, tire grip, walls, and game pieces | Callbacks, anonymous class bodies |
| 17 | [B-Line autos](17-bline-autos.md) | Follow a drawn path against the fused pose, with event markers | `PIDController`, method refs as actions |
| 18 | [Scoring elevator](18-elevator.md) | A second mechanism on the same IO spine, profiled and gravity-compensated | Clamping a goal, reuse over novelty |
| 19 | [A picture of the elevator](19-mechanism2d.md) | A live stick figure of the mechanism, with a second piece riding on it | Composition as attachment |
| 20 | [Intake arm](20-intake-arm.md) | A swinging arm with a roller, mounted on the elevator, gravity-compensated by angle | Two motors in one subsystem |
| 21 | [Homing & limit sensors](21-limit-sensors.md) | A limit switch that tells the elevator where zero actually is | `Trigger` from any boolean |
| 22 | [Beam breaks & the handoff](22-light-sensors.md) | A sensor that knows you caught a game piece, driving both mechanisms at once | `Trigger` combinators |
| 23 | [LEDs](23-leds.md) | A strip that shows what the robot knows, and a priority order you chose | Combinator methods |
| 24 | [A superstructure](24-superstructure.md) | One named state the whole robot reads, with the illegal moves made impossible | Enums with fields and methods, exhaustive `switch` |
| 25 | [Doing two things at once](25-path-events.md) | Autos that intake, stow and aim *while* they drive, instead of after | Composition applied, not new syntax |
| 26 | [Getting there exactly](26-drive-to-pose.md) | A two-stage drive-to-pose: fast across the field, then precise onto the spot | Building a `Path` in code |
| 27 | [Going to get something you just saw](27-object-detection.md) | A camera that finds a game piece, and an approach built while the robot runs | `Commands.defer` |
| 28 | [Keeping the nose on the target](28-aim-at-tag.md) | Aim assist that holds while you drive, shared by the driver and by autos | None — the point is that it needs none |
| 29 | [A wheel that holds a speed](29-flywheel.md) | A shooter flywheel with a speedometer, and the first mechanism with no destination | None — the spine repeats |
| 30 | [One battery, everything on it](30-current-limits.md) | Current limits chosen as a budget, and a brownout you cause on purpose | None |
| 31 | [The robot tells you what's wrong](31-alerts.md) | A pre-match checklist the robot runs on itself, surfaced where a human looks | None |
| 32 | [Tests that catch what a plot won't](32-testing.md) | JUnit tests against your own subsystems, with the simulation running inside them | JUnit, arrange/act/assert |
| 33 | [Reading a match log](33-reading-a-log.md) | Diagnose a failure that already happened, from the log alone, and prove the fix by replaying the match | None |
| 34 | [Tuning your robot when build team hands it over](34-tuning-with-sysid.md) | Measure a real machine's gains with `SysIdRoutine`, and find out how close the computed ones were | None |

## Asides (out of order — read when you need them)

- [Setting up the project and connecting it to GitHub](aside-setup.md) —
  installing WPILib, Git, and the GitHub CLI; creating the project from the
  template; the daily `add`/`commit`/`push` loop. **Start here before Lesson 0
  if you're new to any of it.** (On [the OpMode track](v3/README.md)? Use
  [its own setup aside](v3/aside-setup.md) instead — the WPILib-install and
  project-creation steps are genuinely different there.)
- [Branches: one per lesson, merged into a `main` that always works](aside-git-branching.md) —
  branching, merging, and the day two lessons touch the same file. Reads on from
  the setup aside, so you can start using it from Lesson 1. Covers merge
  conflicts (and why "keep both" is usually the answer), pull requests, and when
  `rebase` beats `merge`. **Shared with the OpMode track** — nothing on this
  page is WPILib-version-specific.
- [Debugging in VSCode and reading stack traces](aside-debugger.md) —
  breakpoints, stepping, watches, conditional breakpoints, and how to read the
  error trail Java prints when something crashes. Useful from Lesson 1 onward;
  the worked example uses Lesson 5's P control. **Shared with the OpMode
  track**, including a dedicated section on how that track's stack traces
  differ (and what they can tell you the classic track's can't).
- [A second thread: sampling odometry faster than the robot loop](aside-odometry-thread.md) —
  the AdvantageKit odometry thread, and the Java it needs: threads, locks, and
  `waitForAll`. Readable any time after Lesson 16, and genuinely optional —
  Lessons 17–34 neither need it nor break with it. Includes the measurement of
  what 250 Hz odometry actually buys, which is less than you'd think.
  **Classic track only for now** — it leans on AdvantageKit, which the
  OpMode track doesn't have; porting it is still open.
