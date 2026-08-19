# OpMode track — SystemCore, WPILib 2027 alpha, Commands V3

A newer, still-settling alternative to [the classic track](../README.md):
SystemCore and the 2027 alpha's OpMode framework, with coroutine-style
Commands V3. Reference code lives under [`code/v3/lesson-N/`](../../../code/v3/),
and the whole track rolls forward with `./tools/verify-lessons-v3.sh` — see
the main [README](../../../README.md) for how to use that to jump into a
lesson in the middle.

**Start on [the classic track](../README.md) unless you specifically want
this one.** Three lessons (17, 22, 25) are gaps for now — their old-course
content leans on third-party libraries (BLine, maple-sim) that don't yet run
on this alpha — and one (16) is a genuinely different, hand-built lesson
rather than a straight port. See
[the restructure plan](../../lesson-plan-opmode-restructure.md) for the full
status of every lesson, including what changed and why.

| # | Lesson | You'll build | Key Java ideas |
|---|--------|--------------|----------------|
| 0 | [Orientation](00-orientation.md) | Run the template, print a message | Classes, packages, methods, annotations |
| 1 | [Your first motor](01-first-motor.md) | Spin a drive motor with a button | Objects, fields, constructors, `import` |
| 2 | [Joystick control](02-joystick-control.md) | Drive the motor with a joystick | Parameters, return values, lambdas, suppliers |
| 3 | [Telemetry](03-telemetry.md) | Plot position & velocity live | Return values, `instanceof` pattern matching, `SmartDashboard`/`DataLogManager` logging |
| 4 | [Simulation](04-simulation.md) | Make it move on your laptop | `simulationPeriodic()`, physics models, composition |
| 5 | [Steering with P control](05-steering-p-control.md) | Point the module to an angle, primed from a CANcoder at boot | `if`/`else`, arithmetic, error, setpoints |
| 6 | [Distance & commands](06-distance-and-commands.md) | Drive an exact distance | Unit conversion, coroutine bodies that run out, finished vs. canceled |
| 7 | [Four modules](07-four-modules.md) | Assemble a 4-module chassis you can translate and rotate | Arrays, `for` loops, per-module constructor args |
| 8 | [Gyro & heading](08-gyro-heading.md) | Turn the chassis to a compass heading | Reusing patterns, extracting helpers |
| 9 | [Autonomous](09-autonomous.md) | Compose a drive-turn-drive auto | `coroutine.await(...)`, sequential vs. parallel |
| 10 | [Full swerve — kinematics](10-kinematics.md) | Drive-and-rotate at once with `SwerveDriveKinematics` | Data-carrier types (`ChassisVelocities`), indexed loops |
| 11 | [Odometry & the field view](11-odometry-field.md) | Track and draw the robot on a virtual field | Building arrays in loops, small bundle types |
| 12 | [Model-based control](12-model-based-control.md) | Onboard closed loop with feedforward, replacing boot-time CANcoder priming with continuous remote-sensor feedback | Config objects, control requests |
| 13 | [IO layers](13-io-replay.md) | Every sensor behind a clean `ModuleIO`/`GyroIO` — the doors real replay will use once this framework's tooling catches up, not replay itself yet | Interfaces & default methods, anonymous classes, enums, `switch` expressions |
| 14 | [Pose estimator & localizer](14-pose-estimator.md) | A localization subsystem fused from pluggable pose providers | Interfaces, registries, timestamps |
| 15 | [Real vision — PhotonVision](15-photonvision.md) | A real PhotonVision pose provider, plus simulated multi-camera coverage | `Optional`, `static` fields, `record` |
| 16 | [Ground truth — a hand-built stand-in](16-ground-truth.md) | A hand-built chassis body with friction-limited acceleration, standing in for maple-sim until it supports this framework | Friction-limited acceleration, `MathUtil.slewRateLimit`, `Twist2d.exp()` |
| 17 | — | *Gap for now* — the old lesson's BLine path-following library doesn't run on Commands V3 yet. See the plan doc. | — |
| 18 | [Scoring elevator](18-elevator.md) | A second mechanism on the same IO spine, profiled and gravity-compensated | Comparing measures directly (`Distance.gt`/`.lt`) |
| 19 | [A picture of the elevator](19-mechanism2d.md) | A live stick figure of the mechanism, with a second piece riding on it | Composition as attachment |
| 20 | [Intake arm](20-intake-arm.md) | A swinging arm with a roller, mounted on the elevator, gravity-compensated by angle | Two motors in one subsystem, a `Mechanism` that takes a `Mechanism` |
| 21 | [Homing & limit sensors](21-limit-sensors.md) | A limit switch that tells the elevator where zero actually is | `Trigger` from any `BooleanSupplier`, no-requirements commands |
| 22 | — | *Gap for now* — the old lesson's beam-break sim needs maple-sim's intake simulation. See the plan doc. | — |
| 23 | [LEDs](23-leds.md) | A strip that shows what the robot knows, and a priority order you chose | Combinator methods |
| 24 | [A superstructure](24-superstructure.md) | One named state the whole robot reads, with the illegal moves made impossible | Enums with fields and methods, exhaustive `switch`, a hand-built guard |
| 25 | — | *Gap for now* — same BLine dependency as 17. See the plan doc. | — |
| 26 | [Getting there exactly](26-drive-to-pose.md) | A two-stage drive-to-pose: fast across the field, then precise onto the spot | `PIDController`, controller objects as fields |
| 27 | [Going to get something you just saw](27-object-detection.md) | A camera that finds a game piece, and an approach built while the robot runs | `Command.requiring(...).executing(...)` |
| 28 | [Keeping the nose on the target](28-aim-at-tag.md) | Aim assist that holds while you drive, shared by the driver and by autos | None — the point is that it needs none |
| 29 | [A wheel that holds a speed](29-flywheel.md) | A shooter flywheel with a speedometer, and the first mechanism with no destination | None — the spine repeats |
| 30 | [One battery, everything on it](30-current-limits.md) | Current limits chosen as a budget, and a brownout you cause on purpose | None |
| 31 | [The robot tells you what's wrong](31-alerts.md) | A pre-match checklist the robot runs on itself, surfaced where a human looks | None |
| 32 | [Tests that catch what a plot won't](32-testing.md) | JUnit tests against your own subsystems, with the simulation running inside them | JUnit, arrange/act/assert |
| 33 | [Reading a match log](33-reading-a-log.md) | Diagnose a failure that already happened, from the log alone — real replay isn't available on this track yet, so the fix is proven by re-running the same script instead | None |
| 34 | [Tuning your robot when build team hands it over](34-tuning-with-sysid.md) | Measure a real machine's gains with a hand-built `SysIdRoutine`, since WPILib's own isn't ported to this framework yet | `Trigger.and(...)` |

## Asides

- [Setting up the OpMode track and connecting it to GitHub](aside-setup.md) —
  this track's own version: Git, a JDK 25, and pulling your starting project
  out of this course's repo (there's no installer wizard for this alpha yet),
  then the same GitHub/`gh` setup and daily `add`/`commit`/`push` loop as the
  classic track. **Start here before Lesson 0.**
- [Branches: one per lesson, merged into a `main` that always works](../aside-git-branching.md) —
  shared with the classic track as-is; nothing in it is WPILib-version-specific.
- [Debugging in VSCode and reading stack traces](../aside-debugger.md) —
  shared with the classic track, with its own section on how this track's
  stack traces differ: the framework strips internal coroutine frames and
  splices in a second trace showing which button scheduled the failing
  command, which the classic track's traces can't show you at all.

**Not yet ported:** [the odometry-thread aside](../aside-odometry-thread.md)
leans on AdvantageKit's `Logger`/`@AutoLog`, which this track doesn't have —
porting it needs a real rewrite of its logging and replay sections, not a
rename, and it's still open.
