# Lesson 0 — Orientation: run the robot and print a message

**Goal:** Get the template building and running in simulation, understand how the
pieces fit together, and make your first code change — printing a message every
time the robot boots into teleop.

**New Java concepts**
- What a **class**, **package**, and **method** are
- **Statements** and the semicolon
- Calling a method (`System.out.println(...)`)

**New robot concepts**
- The four files that make up a command-based robot
- The **scheduler tick** — the heartbeat of the robot

---

## 1. What am I even looking at?

Open `src/main/java/frc/robot/`. There are four files that matter:

```
frc/robot/
├── Main.java             ← JVM entry point. Never touch it.
├── Robot.java            ← The heartbeat. You'll rarely touch it.
├── RobotContainer.java   ← The wiring diagram. You edit this a lot.
├── Constants.java        ← Numbers with names. You edit this a lot.
├── subsystems/           ← Hardware lives here (motors, gyro).
└── commands/             ← Actions live here.
```

### Classes and packages

Every `.java` file defines a **class** — a blueprint that bundles together data and
the actions that work on it. The first real line of each file is:

```java
package frc.robot;
```

A **package** is just a folder-path name that keeps classes organized and lets
them find each other. `frc.robot` matches the folder `frc/robot`. Subsystems live
in `frc.robot.subsystems`, commands in `frc.robot.commands`.

### Methods

Inside a class are **methods** — named blocks of code that *do* something. You've
already got some:

```java
@Override
public void teleopInit() {   // ← this is a method named "teleopInit"
  // ...
}
```

`teleopInit` runs once, the moment the robot is enabled in teleop mode.
The `@Override` above it means "this replaces a method WPILib already defined."

---

## 2. The heartbeat

Open `Robot.java` and find `robotPeriodic()`:

```java
@Override
public void robotPeriodic() {
  CommandScheduler.getInstance().run();
}
```

This one line runs **about 50 times per second**, forever, while the robot is on.
Each run is called a **tick**. On every tick the scheduler:

1. runs each subsystem's `periodic()` method, then
2. runs one step of every command that's currently scheduled.

That's the whole robot: a fast loop. Everything you build hangs off that loop.
You don't call your subsystems yourself — you *register* them and the scheduler
ticks them for you.

---

## 3. Run it

From the project folder in PowerShell:

```powershell
./gradlew simulateJava
```

The first run downloads dependencies and may take a few minutes. When the
**SimGUI** window opens:

- Find the **Robot State** panel. Drag it from *Disabled* to *Teleoperated*.
- You're now "driving" a simulated robot. Nothing moves yet — we haven't added
  motors. That's Lesson 1.

Close the window (or press Ctrl+C in the terminal) to stop.

---

## 4. Your first change: say hello

Let's prove you can change behavior. In `Robot.java`, add a line inside
`teleopInit()`:

```java
@Override
public void teleopInit() {
  System.out.println("Hello from Team 5010! Teleop started.");

  // ... any existing code stays below
}
```

**Read that line carefully:**
- `System.out.println( ... )` is a **method call**. It prints whatever is in the
  parentheses to the console, then a newline.
- The text in `"double quotes"` is a **String** — literal text.
- The line ends in a **semicolon** `;`. Every statement in Java does. Forgetting it
  is the #1 beginner compile error — get used to the error message now, because
  you'll see it a hundred times.

Run `./gradlew simulateJava` again, drag the state to **Teleoperated**, and watch
the terminal. You should see your message. You just changed what the robot does.

---

## Try it

1. Print a *different* message from `autonomousInit()` (runs when you switch to
   *Autonomous* instead of *Teleoperated*). Confirm each message shows up only when
   you enter that mode.
2. Break it on purpose: delete a semicolon and run `./gradlew build`. Read the
   error. Note the file and line number it gives you — learning to read compiler
   errors is a core skill. Put the semicolon back.

---

## What you learned

- A robot program is a collection of **classes** organized into **packages**.
- **Methods** are named blocks of code; some (`teleopInit`, `robotPeriodic`) are
  called for you by WPILib at specific times.
- The **scheduler tick** in `robotPeriodic()` is the robot's heartbeat, ~50 Hz.
- Every statement ends in a **semicolon**, and the compiler tells you (with a line
  number) when you forget.

Next: [Lesson 1 — Your first motor](01-first-motor.md).
