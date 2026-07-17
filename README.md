# Team 5010 — Learn Java + Robot Programming

A hands-on course that teaches Java **while** building working swerve-drive robot
code. You start from the WPILib Command Robot template in this repo and, lesson by
lesson, grow it into a robot you can drive with a joystick, watch on live plots,
run in simulation, steer to angles, drive exact distances, turn to a compass
heading, and finally string it all together into an autonomous routine.

Each lesson introduces **as few new ideas as possible** and ends with a real,
runnable result. Do them in order — every lesson builds on the previous one.

## Hardware assumed

- **TalonFX** motors (CTRE Phoenix 6) — drive and steering.
- **Pigeon 2** gyro (CTRE Phoenix 6).
- An Xbox controller on the driver station.

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

| # | Lesson | You'll build | Key Java ideas |
|---|--------|--------------|----------------|
| 0 | [Orientation](docs/lessons/00-orientation.md) | Run the template, print a message | Classes, packages, methods, the loop |
| 1 | [Your first motor](docs/lessons/01-first-motor.md) | Spin a drive motor with a button | Objects, fields, constructors, `import` |
| 2 | [Joystick control](docs/lessons/02-joystick-control.md) | Drive the motor with a joystick | Methods, parameters, `double`, lambdas |
| 3 | [Telemetry & plots](docs/lessons/03-telemetry.md) | Plot position & velocity live | Return values, sensors, AdvantageKit logging |
| 4 | [Simulation](docs/lessons/04-simulation.md) | Make it move on your laptop | `simulationPeriodic`, physics models |
| 5 | [Steering with P control](docs/lessons/05-steering-p-control.md) | Point the module to an angle | `if`, arithmetic, error, setpoints |
| 6 | [Distance & commands](docs/lessons/06-distance-and-commands.md) | Drive an exact distance | Unit conversion, commands that finish |
| 7 | [Four modules](docs/lessons/07-four-modules.md) | Assemble a 4-module chassis you can translate and rotate | Arrays, `for` loops, helper classes |
| 8 | [Gyro & heading](docs/lessons/08-gyro-heading.md) | Turn the chassis to a compass heading | Reusing patterns, extracting helpers |
| 9 | [Autonomous](docs/lessons/09-autonomous.md) | Compose a drive-turn-drive auto | Command composition, sequences & groups |
| 10 | [Full swerve — kinematics](docs/lessons/10-kinematics.md) | Drive-and-rotate at once with `SwerveDriveKinematics` | Data-carrier types, indexed loops |
| 11 | [Odometry & the field view](docs/lessons/11-odometry-field.md) | Track and draw the robot on a virtual field | Building arrays in loops, small bundle types |

### Asides (out of order — read when you need them)

- [Setting up the project and connecting it to GitHub](docs/lessons/aside-setup.md) —
  installing WPILib, Git, and the GitHub CLI; creating the project from the
  template; the daily `add`/`commit`/`push` loop. **Start here before Lesson 0
  if you're new to any of it.**
- [Debugging in VSCode and reading stack traces](docs/lessons/aside-debugger.md) —
  breakpoints, stepping, watches, conditional breakpoints, and how to read the
  error trail Java prints when something crashes. Useful from Lesson 1 onward;
  the worked example uses Lesson 5's P control.

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
