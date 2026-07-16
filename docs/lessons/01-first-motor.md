# Lesson 1 — Your first motor: spin a drive wheel with a button

**Goal:** Create a real subsystem that owns one TalonFX drive motor, and make it
spin at a fixed speed while you hold a button.

**New Java concepts**
- **Objects** and creating them with `new`
- **Fields** (data a class holds onto)
- **Constructors** (the setup method that runs when an object is created)
- **`import`** (borrowing classes from other packages)
- **`private` / `public`** (encapsulation — who's allowed to touch what)

**New robot concepts**
- Adding a vendor library (Phoenix 6)
- The `TalonFX` motor object
- Exposing behavior as a **command factory method**

---

## 1. Add the Phoenix 6 vendor library

TalonFX motors are made by CTRE, and their code lives in a **vendor library**
that isn't in the template yet. Adding one is a one-time chore — all clicking,
no coding. In VS Code:

1. Open the command palette (Ctrl+Shift+P) → **WPILib: Manage Vendor Libraries**.
2. Choose **Install new libraries (online)**.
3. Paste the Phoenix 6 URL from
   [CTRE's install page](https://v6.docs.ctr-electronics.com/en/stable/docs/installation/installation-frc.html)
   (looks like `https://maven.ctr-electronics.com/.../Phoenix6-frc2026-latest.json`).
4. Rebuild: `./gradlew build`.

A new file appears under `vendordeps/`. GradleRIO finds it automatically — you
never edit `build.gradle` for this.

> **Why isn't this just part of WPILib?** WPILib ships the core robot
> framework. Hardware makers (CTRE, REV, etc.) ship *their* code separately so
> they can update on their own schedule. The vendordep you just installed is
> nothing more than a JSON file telling Gradle where to download CTRE's code.

---

## 2. Objects: the big idea

So far you've seen classes and methods. Now the missing third piece —
**objects** — and it's the piece that makes classes finally make sense. A
class is a blueprint: `TalonFX` describes what any TalonFX can do. An
**object** is one actual thing built from that blueprint: *the specific motor
with CAN ID 1, bolted to your robot*. One blueprint, as many objects as you
need.

You create an object with the keyword **`new`**:

```java
TalonFX driveMotor = new TalonFX(1);
```

Read it right-to-left: `new TalonFX(1)` builds a TalonFX object for the motor at
CAN ID 1. `TalonFX driveMotor` declares a **variable** of type `TalonFX` named
`driveMotor` to hold it. From here on, `driveMotor` is your handle to that
motor — when you want the physical thing to do something, you talk to this
object.

---

## 3. Build the DriveModule subsystem

We'll build the course around **one swerve module** first — one drive motor and
(soon) one steering motor — then scale up to four later.

Create the file first: in VS Code's explorer, right-click the `subsystems`
folder under `src/main/java/frc/robot/` and choose **New File**. Name it
`DriveModule.java`. The folder matters — remember the rule from Lesson 0:
**the package at the top of a file has to match its folder path**, and the
first line you're about to type declares that this file lives in
`subsystems`.

There's a lot of new material packed into this one file, so instead of
dropping it on you whole, we'll build it in four pieces, top to bottom, and
talk about each piece as it lands. Type them in yourself rather than pasting
— the syntax sticks faster when your fingers have been through it.

### Piece 1 — the package and the imports

Every Java file opens the same way: the `package` line first, the imports
under it, and nothing else until the class begins.

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.TalonFX;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
```

An **`import`** lets this file refer to a class from another package by its
short name. Without that first import, every mention of the motor would have
to be spelled `com.ctre.phoenix6.hardware.TalonFX` — the import is how you
say that mouthful exactly once. The two `edu.wpi.first...` lines do the same
for the WPILib classes we're about to use. Don't worry about memorizing
import paths, either: whenever you use a class you haven't imported, VS Code
underlines it in red and offers to add the import for you.

### Piece 2 — the class line and the motor field

Below the imports, open the class and give it its one piece of hardware:

```java
public class DriveModule extends SubsystemBase {
  private final TalonFX m_driveMotor = new TalonFX(1); // CAN ID 1 — change to yours
```

Two big ideas on two lines. **`extends SubsystemBase`** declares that our
class *is a* subsystem — it inherits all the machinery that lets the
scheduler manage it. This line is what plugs `DriveModule` into the 50 Hz
heartbeat from Lesson 0.

The second line is a **field**: a variable that belongs to the object itself
rather than to any one method. The distinction matters. A variable declared
inside a method vanishes the moment the method returns — but the motor has to
exist for the whole match. Data an object needs to keep for life goes in a
field, and fields go exactly where this one is: inside the class's opening
brace, above the methods. Every time you see `m_driveMotor` further down the
file, it's referring back to this line.

Three keywords dress the field up. **`private`** hides it from other classes
— that's **encapsulation**, and you'll see what it buys us by the end of this
section. **`final`** means the variable will always point at the *same* motor
object; you never want to accidentally swap the motor out from under
yourself. And the `m_` prefix is a team convention meaning "member field," so
you can tell fields from local variables at a glance.

### Piece 3 — the constructor

```java
  public DriveModule() {
    // Setup that should happen when the module is created goes here.
  }
```

A **constructor** is the setup method that runs once, at the instant
`new DriveModule()` builds the object. You can spot a constructor by two
tells: its name exactly matches the class name, and it has no return type —
not even `void`. Ours is empty for now — the field above already constructs
the motor — but it earns its keep in later lessons. Convention puts the
constructor right after the fields, and this course sticks to that.

### Piece 4 — the behavior

The last piece: one method that does something, one that doesn't yet, and the
closing brace for the whole class.

```java
  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    // Motors hold whatever value you last set — command 0 yourself when done.
    return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
  }

  @Override
  public void periodic() {
    // The scheduler calls this ~50 times a second. Nothing to do here yet.
  }
}
```

`driveAtSpeed` is the sneakiest thing in the file: a **command factory
method**. Calling it does *not* spin the motor. It *returns a Command* — a
little recipe the scheduler will run later — which is why the return type is
`Command` and the body starts with `return`.

Inside the recipe, that `() ->` arrow is brand-new syntax, so slow down for
it. You know methods — named blocks of code that run when something calls
them. `() -> m_driveMotor.set(fraction)` is like a tiny method with no name:
instead of calling it, you hand it over, and whoever you handed it to calls
it when the time comes. That's the whole difference the arrow makes — on its
own, `m_driveMotor.set(fraction)` would set the motor *right now*; behind
the arrow, it's saved for later. And saved-for-later is exactly what a
command needs: not actions happening now, but actions the scheduler can fire
at the right moments. (These nameless little methods do have a name of their
own, and many more uses — Lesson 2 introduces them properly.)

`startEnd(...)` — one of several helpers inherited from `SubsystemBase`,
alongside `run`, `runOnce`, and `runEnd` — takes two of them, one for each
moment that matters. The first runs once when the command starts: set the
motor to `fraction` (`m_driveMotor.set(0.5)` means "50% power"). The second
runs once when the command ends, whether it finished or got cancelled: set
the motor back to `0`. Why insist on that second one? Because motors **hold**
whatever value you last set. Nothing stops the wheel unless some code
commands `0`, and `startEnd` makes that cleanup impossible to forget.

Then `periodic()` — the scheduler calls it on every tick, about 50 times a
second. It's empty today, but it's part of what being a subsystem means, so
it goes in from day one. And that final `}` on its own line closes the class.
Every brace you open has to close; a missing one is right behind the missing
semicolon on the beginner error charts.

### Check your work

Read your file top to bottom and check the order: package, imports, class
line, field, constructor, methods, closing brace. Java mostly doesn't care
about that order, but every file in this course — and most Java you'll ever
read — follows it, so your eyes learn where to look. Assembled, the whole
thing is:

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.TalonFX;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class DriveModule extends SubsystemBase {
  private final TalonFX m_driveMotor = new TalonFX(1); // CAN ID 1 — change to yours

  public DriveModule() {
    // Setup that should happen when the module is created goes here.
  }

  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    // Motors hold whatever value you last set — command 0 yourself when done.
    return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
  }

  @Override
  public void periodic() {
    // The scheduler calls this ~50 times a second. Nothing to do here yet.
  }
}
```

> **Why return commands instead of just spinning the motor?** This is where
> `private` pays off. The motor is hidden, so the *only* way anything outside
> this class can move it is by asking for a command — and the scheduler
> guarantees only one command controls a subsystem at a time. If two things
> try to drive the module at once, the scheduler sorts it out instead of the
> motor getting conflicting orders. You get that safety for free.

---

## 4. Wire a button to it

The subsystem exists, but nothing builds it or talks to it yet. That's
`RobotContainer`'s job — it's the wiring diagram from Lesson 0. Open
`RobotContainer.java`. You're making three small edits, and where each one
lands matters as much as what it says.

**First, give `RobotContainer` the module as a field.** Near the top of the
class you'll find the fields the template already declares —
`m_driverController` is one of them. Add yours alongside:

```java
public class RobotContainer {
  // ...the template's existing fields, like m_driverController, stay put...

  private final DriveModule m_module = new DriveModule();
```

Why a field and not a line inside some method? Same reasoning as the motor in
section 3: the module has to live for the whole match, and fields are the
data an object keeps for life. This line is also the moment your subsystem
actually gets built — `new DriveModule()` runs everything you wrote in
section 3, including `new TalonFX(1)`, which brings the motor object to life.
One `new` sets off the whole chain.

**Second, the import.** `DriveModule` lives in the `frc.robot.subsystems`
package; `RobotContainer` lives in `frc.robot`. Different package, so this
file needs an import — up top with the other imports, anywhere among them,
below the `package` line:

```java
import frc.robot.subsystems.DriveModule;
```

Or let the editor do it: the moment you typed `DriveModule` above, VS Code
underlined it in red. Click it, press `Ctrl+.`, pick **Import
'DriveModule'**. That shortcut will save you a thousand keystrokes over this
course.

**Third, the binding.** Find the `configureBindings()` method — the template
calls it once at startup, and it exists precisely so every "this button does
that" decision lives in one place instead of scattered through the project.
Add one line inside it:

```java
  private void configureBindings() {
    // ...any example bindings from the template can stay for now...

    // Hold A to drive forward at 30% power; release to stop.
    m_driverController.a().whileTrue(m_module.driveAtSpeed(0.3));
  }
```

**What that line says:** while the A button is held (`whileTrue`), schedule
the command that `driveAtSpeed(0.3)` returns. When you let go, the scheduler
cancels it — and because the command was built with `startEnd`, the cleanup
`() -> m_driveMotor.set(0)` fires and the motor stops. One more thing worth
noticing: this line runs *once*, at startup. It doesn't press anything — it
registers the wiring, and the scheduler does the watching from then on, tick
after tick, all match long.

> **Watch out:** motors do **not** stop on their own when a command ends.
> `set(0.3)` writes a value that the motor keeps applying until something
> overwrites it. If you had written `return run(() -> m_driveMotor.set(0.3));`
> instead, the wheel would keep spinning after you released the button — the
> scheduler would stop *ticking* the command, but nobody would ever command
> `0`. Explicit stop, every time. If you take one habit from this lesson,
> take that one. (In Lesson 2 you'll meet **default commands**, which give a
> subsystem something to do when no other command is scheduled — the *other*
> way to make sure the motor is always being told what to do.)

---

## 5. Run it

`./gradlew simulateJava`, set state to **Teleoperated**. In SimGUI, open the
**Other Devices** or **CAN** panel — you can find the TalonFX and watch its output
change when you press A. (On a real robot the wheel would spin. We'll get proper
motion in the simulation lesson.)

If you don't have an Xbox controller plugged in, use SimGUI's **Keyboard 0**
settings to map a key to the A button, or drag the joystick sliders. A number
changing in a panel isn't as satisfying as a wheel spinning — but that number
*is* your code commanding a motor. It counts.

---

## Try it

Three exercises. The third one plants a habit you'll lean on for the rest of
the course.

1. Add a **second** button (`m_driverController.b()`) that drives at `-0.3`
   (reverse). Confirm A and B fight for the motor cleanly — press both; the
   scheduler lets the most-recently-scheduled one win.
2. Change `m_driveMotor`'s CAN ID and rebuild. Nothing breaks in sim — IDs only
   matter on the real robot, but get in the habit of setting them deliberately.
3. Move the CAN ID out of the code and into `Constants.java` as a named constant
   (e.g. `public static final int kDriveMotorId = 1;`) and use it in the subsystem.
   This is where robot numbers *should* live.

---

## What you learned

The big new idea is the **object** — a live instance of a class, made with
`new` — plus the anatomy of a class that owns one: **imports** up top
borrowing classes from other packages (including the vendordep you
installed), **fields** holding the data the object keeps for life, a
**constructor** doing setup when the object is born, and the methods below,
with **`private`** keeping other classes' hands off the hardware
(encapsulation). Where each piece went matters as much as what it does —
package, imports, fields, constructor, methods — and that anatomy repeats in
every file you'll write from here on. On the robot side, subsystems expose
behavior as **command factory methods** that *return* commands, so the
scheduler can manage who controls the hardware, and motors **hold the last
value** you set — which is why `startEnd(start, end)` pairs every start with
a cleanup. Next up, that hard-coded `0.3` becomes a live joystick reading,
and this starts feeling like driving.

Next: [Lesson 2 — Joystick control](02-joystick-control.md).
