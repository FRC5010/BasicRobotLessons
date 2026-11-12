# 2026 classic track (parked)

This folder holds the course as it was taught for the **roboRIO, WPILib 2026
and Commands V2**. It is **parked and no longer maintained**: the course is now
the OpMode track in the repository root ([`docs/lessons/v3/`](../docs/lessons/v3/README.md),
[`code/v3/`](../code/v3)). Nothing here is on the website. It's kept so the
earlier course, its reference code and its measurements stay available.

## What's here

| Path | What |
|------|------|
| [`lessons/`](lessons/README.md) | Lessons 0 to 34 and the asides (setup, branching, the debugger, the odometry thread) |
| `code/lesson-N/` | Per-lesson reference snapshots: only the files that lesson changes, mirroring the `frc/robot` package layout |
| `code/ActualLessons/` | A real, buildable GradleRIO project at pristine WPILib Command Robot template state: the starting point |
| `code/aside-odometry-thread/` | The odometry-thread aside's code, applied on top of Lesson 16 |
| `tools/verify-lessons.sh` | Compile-checks the snapshots by rolling them onto `ActualLessons` |
| `lesson-plan-16-22.md`, `lesson-plan-23-34.md` | The old planning documents (paths in them are relative to this folder) |
| [`CLAUDE.md`](CLAUDE.md) | Contributor notes for this track |

## Building it

Run from the **repository root**:

```bash
./2026/tools/verify-lessons.sh        # roll every lesson, compile
./2026/tools/verify-lessons.sh 13     # stop after Lesson 13
./2026/tools/verify-lessons.sh 17 test
```

It copies `code/ActualLessons` to a scratch sandbox, fetches the pinned
vendordeps, applies `code/lesson-0` ... `code/lesson-N` in order and runs
Gradle. It needs `bash`, `curl`, `python3`, network access, and the JDK the
WPILib 2026 template builds with (JDK 17 or 21), not the JDK 25 the OpMode
track needs. See the comment at the top of the script for `--sandbox`, `--base`
and the aside option.

## Skipping ahead to a lesson in the middle

The lessons are cumulative: Lesson 18 assumes the `Drivetrain`, `ModuleIO`,
`Localizer` and everything else lessons 0 to 17 built is already in your
project. To get a project in that state, **roll forward to the lesson before the
one you want to start on**. To begin at Lesson 18, build the state as of the end
of Lesson 17, into a folder outside this repository:

```bash
git clone https://github.com/FRC5010/BasicRobotLessons.git
cd BasicRobotLessons
./2026/tools/verify-lessons.sh 17 --sandbox ~/dev/MyRobot
```

On Windows, run that in **Git Bash**, not PowerShell, with a forward-slash path.

The result is a real GradleRIO project: vendordeps fetched and pinned, the
AdvantageKit `build.gradle` blocks in place, and the files the lessons deleted
gone. Check it with `./gradlew build` and `./gradlew simulateJava`, then
`git init` it and set your team number in `.wpilib/wpilib_preferences.json`
(the template ships 5010).

Three things to know:

- **The sandbox folder is deleted at the start of every run.** Generate it once,
  then treat it as your project. The script refuses a path inside this repo.
- **The device IDs are placeholders.** Change them to match your robot.
- **You're skipping the explanations, not just the typing.** Skim the lessons
  that introduced the patterns you're building on ([the table](lessons/README.md)
  says what each added).
