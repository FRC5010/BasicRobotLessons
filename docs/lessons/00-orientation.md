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

If you just opened this project cold, the folder tree probably looks like a wall
of unfamiliar names. That's totally normal — half of them don't matter yet, and
the other half will start making sense by the end of this lesson. Open
`src/main/java/frc/robot/` and you'll find the four files that do the real
work:

```
frc/robot/
├── Main.java             ← JVM entry point. Never touch it.
├── Robot.java            ← The heartbeat. You'll occasionally touch it.
├── RobotContainer.java   ← The wiring diagram. You edit this a lot.
├── Constants.java        ← Numbers with names. You edit this a lot.
|
├── subsystems/           ← Hardware lives here (motors, gyro).
└── commands/             ← High-level actions live here.
```

Read those comments once and let them sit. You don't need to memorize anything
yet — the picture (heartbeat, wiring diagram, hardware, actions) is what
matters, and the details will come as we go.

### Classes and packages

Peek at any `.java` file and the first real line looks like this:

```java
package frc.robot;
```

That's a **package** declaration. Packages are Java's way of keeping class
names from colliding across libraries — if two vendors both shipped a `Timer`
class, packages are how you'd tell them apart. We don't really have that
problem in this project; the packages just mirror the folder structure.
`frc.robot` is the folder `frc/robot`, subsystems live in
`frc.robot.subsystems`, commands in `frc.robot.commands`. The one rule to
remember: **the package at the top of a file has to match its folder path.**

Below the package line, every file defines a **class**. Think of a class as a
blueprint — it says "here's a bundle of data, and here are the actions that
go with that data." That's the pattern for basically every file you'll open
in this course. `Robot` is the class the whole program starts from;
`RobotContainer` is where you'll do most of your wiring; and every subsystem
and command you write from Lesson 1 on will get its own class.

### Methods

Inside a class, the code that actually runs lives in **methods** — named
blocks of code that *do* something. Open `Robot.java` and you'll see several
already:

```java
@Override
public void teleopInit() {   // ← this is a method named "teleopInit"
  // ...
}
```

`teleopInit` runs exactly once — the instant the robot switches into teleop
mode. The `@Override` sitting above it is telling the compiler "yes, I know
WPILib already defined a method by this name; I'm replacing it with mine."
You'll see `@Override` on most of the methods in this file, and that's the
giveaway: they're all methods WPILib is going to call for you at specific
moments. You fill them in; the framework decides when they run.

That last idea is worth stopping to internalize, because it's genuinely the
biggest mental shift when you start writing robot code: **you don't call
these methods. WPILib does.** You're not writing a program that runs
top-to-bottom. You're filling in blanks that the framework will visit on its
own schedule. Which brings us to…

---

## 2. The heartbeat

Still in `Robot.java`, find `robotPeriodic()`:

```java
@Override
public void robotPeriodic() {
  CommandScheduler.getInstance().run();
}
```

That single line runs **about 50 times a second**, forever, from the moment
the robot boots until you power it down. Each run is called a **tick**. On
every tick the scheduler:

1. runs each subsystem's `periodic()` method, and then
2. runs one step of every command that's currently scheduled.

That's it. That's the whole robot: a fast loop, ticking away, doing tiny bits
of work fifty times a second. Everything you build in this course hangs off
that loop. You never write `while (true)` yourself — the scheduler is the
loop, and you plug things into it. If you take one thing from this lesson,
take that picture.

---

## 3. Run it

Alright — time to actually see it. Well, not move, but boot. Either:
1. Click the **WPILib icon** in VS Code's left sidebar (or open the command
   palette with Ctrl+Shift+P → **WPILib: Simulate Robot Code**) to use the 
   WPILib Command Pallet menu or... 
2. From the project folder in PowerShell:

```powershell
./gradlew simulateJava
```

The very first run has to download a pile of dependencies and might take
several minutes. Grab an energy drink. 

When the build finishes, you'll see a prompt at the top of VSCode asking if you 
want Sim GUI and/or Real Driverstation. Just **Sim GUI** is correct for now.
When the **SimGUI** window finally opens:

- Find the **Robot State** panel and change it from *Disabled* to *Teleoperated*.
- Congratulations — you're "driving" a simulated robot. Nothing moves,
  because we haven't added any motors yet. That's Lesson 1.

Close the window (or hit `Ctrl+C` in the terminal) when you're done.

---

## 4. Your first change: say hello

Let's prove that when you edit code, the robot notices. Back in `Robot.java`,
find `teleopInit()` and drop this line into it:

```java
@Override
public void teleopInit() {
  System.out.println("Hello from Team 5010! Teleop started.");

  // ... any existing code stays below
}
```

Small line, three things worth naming. `System.out.println(...)` is a
**method call** — we're asking a method to run and handing it something in
the parentheses. The stuff in `"double quotes"` is a **String**, which is
Java's word for a chunk of literal text. And the whole line ends in a
**semicolon**. Every statement in Java does. Forgetting the semicolon is the
number-one beginner compile error, and you're going to run into it more
times than you'd like before this course is over — better to meet the error
message now than be surprised by it later.

Run `./gradlew simulateJava` again, drag to **Teleoperated**, and glance at
the terminal. Your message should be sitting right there. You just changed
what the robot does.

From now on, if you see `./gradlew simulateJava` and you'd prefer to use the
VSCode Command Pallet, just substitute that instead. Usually, there's a way to
do everything on the command line from the pallet, but it's good to know how
to do both.

---

## Try it

Two quick exercises before you move on. Don't skip them — most of the actual
learning happens when you have to think, not when you're copying code out of
the walkthrough.

1. Print a *different* message from `autonomousInit()` — that's the method
   that runs when you flip the state to *Autonomous* instead of
   *Teleoperated*. Verify each message only shows up when you enter that
   particular mode.
2. Break it on purpose. Delete a semicolon and run `./gradlew build`. Read
   the error carefully — note the file it points at and the line number it
   gives you. Reading compiler errors is a real skill, and the sooner
   you're comfortable with them the better. Put the semicolon back when
   you're done.

---

## What you learned

You now know how a robot program is put together: it's a stack of
**classes** organized into **packages**, each class holding **methods** that
WPILib calls for you at specific moments. The one that matters most is the
scheduler tick inside `robotPeriodic()` — that ~50 Hz heartbeat is what
drives everything else in the course. You also got your first taste of the
semicolon rule (and the compiler yelling when you forget). If half of the
file-structure stuff still feels fuzzy, that's fine — it'll get concrete the
first time you write your own class, which is exactly what Lesson 1 has you
do. That's plenty for one sitting.

Next: [Lesson 1 — Your first motor](01-first-motor.md).
