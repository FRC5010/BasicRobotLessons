# Lesson 1 — Your first motor: spin a drive wheel with a button

**Goal:** Create a mechanism that owns one TalonFX drive motor, and make it
spin at a fixed speed while you hold a button.

**New Java concepts**
- **Objects** and creating them with `new`
- **Fields** (data a class holds onto)
- **Constructors** (the setup method that runs when an object is created)
- **`import`** (borrowing classes from other packages)
- **`private` / `public`** (encapsulation — who's allowed to touch what)
- A **`List`**, and asking it for an item by number

**New robot concepts**
- Adding a vendor library (Phoenix 6)
- The `TalonFX` motor object
- Exposing behavior as a **command factory method**
- `Robot` as the permanent home for hardware
- The `Scheduler`, and ticking it every loop
- Binding a controller button, and giving the simulator a joystick to read
- Asking the scheduler what's running right now

---

## 1. Add the Phoenix 6 vendor library

TalonFX motors are made by CTRE, and their code lives in a **vendor
library** that isn't in the template yet. WPILib's VS Code has a built-in
manager for these — all clicking, no downloads, no URLs:

1. Click the **WPILib icon** in VS Code's left sidebar (or open the command
   palette with Ctrl+Shift+P → **WPILib: Manage Vendor Libraries**) to open
   the vendor dependency manager.
2. In the list of available dependencies, find **Phoenix 6** and install it.
3. Rebuild: `./gradlew build`. (Ctrl-Shift-P **WPILib: Build Robot Code**)

A new file appears under `vendordeps/`. GradleRIO finds it automatically —
you never edit `build.gradle` for this.

> **Why isn't this just part of WPILib?** WPILib ships the core robot
> framework. Hardware makers (CTRE, REV, etc.) ship *their* code separately
> so they can update on their own schedule. The vendordep file you just
> installed is nothing more than a JSON file telling Gradle where to
> download CTRE's code.

---

## 2. Objects: the big idea

So far you've seen classes and methods. Now the missing third piece —
**objects** — and it's the piece that makes classes finally make sense. A
class is a blueprint: `TalonFX` describes what any TalonFX can do. An
**object** is one actual thing built from that blueprint: *the specific
motor with CAN ID 1, bolted to your robot*. One blueprint, as many objects
as you need.

You create an object with the keyword **`new`**.

*Nothing to add — this is just an example, not code for any file:*

```java
TalonFX driveMotor = new TalonFX(1, CANBus.systemcore(0));
```

Read it right-to-left: `new TalonFX(1, CANBus.systemcore(0))` builds a
TalonFX object for the motor at CAN ID 1, on SystemCore's first CAN bus.
`TalonFX driveMotor` declares a **variable** of type `TalonFX` named
`driveMotor` to hold it. From here on, `driveMotor` is your handle to that
motor — when you want the physical thing to do something, you talk to this
object.

A robot can have more than one CAN bus, so a `TalonFX` needs to be told
which one to listen on. `CANBus.systemcore(0)` picks the first one — the one
your motor is actually wired to.

---

## 3. Build the DriveModule mechanism

We'll build the course around **one swerve module** first — one drive motor
and (soon) one steering motor — then scale up to four later.

Create the file first: in VS Code's explorer, right-click the `robot`
folder under `src/main/java/first/`, add a new folder named `subsystems`,
and inside it a new file named `DriveModule.java`. The folder matters —
remember the rule from Lesson 0: **the package at the top of a file has to
match its folder path**, and the first line you're about to type declares
that this file lives in `subsystems`.

There's a lot of new material packed into this one file, so instead of
dropping it on you whole, we'll build it in four pieces, top to bottom, and
talk about each piece as it lands. Type them in yourself rather than
pasting — the syntax sticks faster when your fingers have been through it.

### Piece 1 — the package and the imports

Every Java file opens the same way: the `package` line first, the imports
under it, and nothing else until the class begins.

**Start `DriveModule.java` with:**

```java
package first.robot.subsystems;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.TalonFX;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
```

An **`import`** lets this file refer to a class from another package by its
short name. Without the first two, every mention of the motor would have to
be spelled `com.ctre.phoenix6.hardware.TalonFX` — the import is how you say
that mouthful exactly once. `org.wpilib.command3` is where `Command` and
`Mechanism` live — the classes that let this motor plug into the scheduler.
Don't worry about memorizing import paths, either: whenever you use a class
you haven't imported, VS Code underlines it in red and offers to add the
import for you.

### Piece 2 — the class line and the motor field

Below the imports, open the class and give it its one piece of hardware.

**Add to `DriveModule`, below the imports:**

```java
public class DriveModule extends Mechanism {
  private final TalonFX m_driveMotor = new TalonFX(1, CANBus.systemcore(0)); // CAN ID 1 — change to yours
```

Two big ideas on two lines. **`extends Mechanism`** declares that our class
*is a* mechanism — it inherits all the machinery that lets the scheduler
manage it and hand it commands. This line is what plugs `DriveModule` into
the heartbeat from Lesson 0.

The second line is a **field**: a variable that belongs to the object
itself rather than to any one method. The distinction matters. A variable
declared inside a method vanishes the moment the method returns — but the
motor has to exist for the whole match. Data an object needs to keep for
life goes in a field, and fields go exactly where this one is: inside the
class's opening brace, above the methods. Every time you see `m_driveMotor`
further down the file, it's referring back to this line.

Three keywords dress the field up. **`private`** hides it from other
classes — that's **encapsulation**, and you'll see what it buys us by the
end of this section. **`final`** means the variable will always point at
the *same* motor object; you never want to accidentally swap the motor out
from under yourself. And the `m_` prefix is a team convention meaning
"member field," so you can tell fields from local variables at a glance.

### Piece 3 — the constructor

**Add to `DriveModule`, below the field:**

```java
  public DriveModule() {
    // Setup that should happen when the module is created goes here.
  }
```

A **constructor** is the setup method that runs once, at the instant `new
DriveModule()` builds the object. You can spot a constructor by two tells:
its name exactly matches the class name, and it has no return type — not
even `void`. Ours is empty for now — the field above already constructs the
motor — but it earns its keep in Lesson 3. Convention puts the constructor
right after the fields, and this course sticks to that.

### Piece 4 — the behavior

The last piece: one method that does something, and the closing brace for
the whole class.

**Add to `DriveModule`, below the constructor:**

```java
  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    return run(coroutine -> {
      m_driveMotor.setThrottle(fraction);
      coroutine.park();
    })
        .whenCanceled(() -> m_driveMotor.setThrottle(0))
        .named("Drive At Speed");
  }
}
```

`driveAtSpeed` is the sneakiest thing in the file: a **command factory
method**. Calling it does *not* spin the motor. It *returns a `Command`* — a
little recipe the scheduler will run later — which is why the return type
is `Command` and the body starts with `return`.

Walk through the recipe. `run(coroutine -> ...)` starts building a command
whose body is the code between the braces. That `coroutine ->` arrow is
brand-new syntax, so slow down for it. You know methods — named blocks of
code that run when something calls them. `coroutine -> { ... }` is like a
tiny method with no name: instead of calling it, you hand it over, and the
scheduler calls it when the time comes. `coroutine` itself is a parameter
you can treat as a hidden helper for now — a handle the scheduler gives your
command so it can talk back. (You'll meet more of what it can do soon.)

Inside, `m_driveMotor.setThrottle(fraction)` sets the motor once —
`setThrottle(0.3)` means "30% power" — and `coroutine.park()` tells the
scheduler "hold here — don't do anything else, just keep this command alive
until something cancels it."
That's exactly what "spin while the button is held" needs: set the speed
once, then wait.

`.whenCanceled(() -> m_driveMotor.setThrottle(0))` is the other half. Whatever
cancels this command — releasing the button, another command taking over
the motor — this runs first, setting the motor back to zero. Why insist on
that? Because motors **hold** whatever value you last set. Nothing stops
the wheel unless some code commands `0`, and `.whenCanceled(...)` makes that
cleanup easy to add and easy to spot.

Then `.named("Drive At Speed")` gives the command a name. Every command in
this course gets one — it's how you'll recognize your own commands later,
in logs and on screen.

> **Watch out:** motors do **not** stop on their own when a command ends.
> `set(fraction)` writes a value that the motor keeps applying until
> something overwrites it. Leave off `.whenCanceled(...)` and the wheel
> keeps spinning after you release the button — the scheduler stops
> *running* the command, but nobody ever commands `0`. Explicit stop, every
> time. If you take one habit from this lesson, take that one.

### Check your work

Read your file top to bottom and check the order: package, imports, class
line, field, constructor, methods, closing brace. Java mostly doesn't care
about that order, but every file in this course — and most Java you'll ever
read — follows it, so your eyes learn where to look.

*Nothing to add — this is code you already have, assembled so you can check it:*

```java
package first.robot.subsystems;

import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.hardware.TalonFX;

import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;

public class DriveModule extends Mechanism {
  private final TalonFX m_driveMotor = new TalonFX(1, CANBus.systemcore(0)); // CAN ID 1 — change to yours

  public DriveModule() {
    // Setup that should happen when the module is created goes here.
  }

  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    return run(coroutine -> {
      m_driveMotor.setThrottle(fraction);
      coroutine.park();
    })
        .whenCanceled(() -> m_driveMotor.setThrottle(0))
        .named("Drive At Speed");
  }
}
```

> **Why return commands instead of just spinning the motor?** This is where
> `private` pays off. The motor is hidden, so the *only* way anything
> outside this class can move it is by asking for a command — and the
> scheduler guarantees only one command controls a mechanism at a time. If
> two things try to drive the module at once, the scheduler sorts it out
> instead of the motor getting conflicting orders. You get that safety for
> free.

---

## 4. Give the robot its hardware

The mechanism exists, but nothing builds it yet. It goes on `Robot`, not on
`MyTeleop` — and that's worth pausing on, because it's a rule you'll use for
every piece of real hardware from here on.

**`Robot` is built exactly once**, the moment your program starts, and it
stays alive for as long as the robot is running — through every opmode you
select, one after another. An opmode like `MyTeleop`, on the other hand, is
thrown away and **rebuilt fresh every time you pick it** on the Driver
Station — including the ordinary switch from autonomous to teleop in a real
match. A motor needs to exist exactly once, the same way `Robot` does. So
the motor — and the controller you're about to add — belong on `Robot`, and
opmodes just reach in and use them.

Open `Robot.java`. You're making two small edits.

**First, give `Robot` the controller and the module, as fields.**

**Add to `Robot`, alongside the existing content:**

```java
public class Robot extends OpModeRobot {
  public final CommandGamepad driverController = new CommandGamepad(0);
  public final DriveModule module = new DriveModule();
```

Two new fields, both built with `new`, both handles to a real thing.
`CommandGamepad(0)` is your handle to the driver's controller — the `0` is a
**USB port number** on the driver station: controller 0 is the first one
plugged in. Keep that `0` in mind — you'll need it again in a minute when
you tell the simulator which device to feed it. `DriveModule()` is the
moment your mechanism actually gets built — it runs everything you wrote in
section 3, including `new TalonFX(...)`, which brings the motor object to
life. One `new` sets off the whole chain.

Notice these fields are **public**, not `private` like `DriveModule`'s
motor field was. That's deliberate, and it's the same encapsulation idea
working in the opposite direction: nothing outside `DriveModule` ever needs
to touch the motor directly, so it's hidden — but every opmode needs to
*reach* the module and the controller, so `Robot` holds them out in the
open. `Robot` is the robot's toolbox; opmodes are what you do with the
tools.

**Second, the imports.** `DriveModule` lives in the
`first.robot.subsystems` package; `CommandGamepad` lives under
`org.wpilib.command3.button`. Different packages, so this file needs
imports.

**Add to `Robot`'s imports, below the `package` line:**

```java
import org.wpilib.command3.button.CommandGamepad;
import first.robot.subsystems.DriveModule;
```

Or let the editor do it: the moment you typed `DriveModule` above, VS Code
underlined it in red. Click it, press `Ctrl+.`, pick the import. That
shortcut will save you a thousand keystrokes over this course.

---

## 5. Keep the scheduler running

You've heard "the scheduler" a few times now — it's the thing that manages
commands so only one runs a mechanism at a time. Time to meet it directly,
because it has one job nobody does for it automatically: something has to
tell it to check its triggers and run its commands, every single tick.
`extends Mechanism` back in `DriveModule` already registered your module
with it; that registration doesn't make anything happen by itself.

Lesson 0 introduced the **heartbeat**: `OpModeRobot` calls a fixed set of
your methods on a schedule, forever, whether or not you've overridden them.
One of those is `robotPeriodic()` — it runs every single tick, no matter
which opmode is selected and whether the robot is enabled or disabled. That
makes it exactly the right place for something that has to keep running no
matter what.

**Add to `Robot`, below the constructor:**

```java
  @Override
  public void robotPeriodic() {
    Scheduler.getDefault().run();
  }
```

`Scheduler.getDefault()` is the one scheduler every mechanism and every
trigger plugs into automatically — `DriveModule` joined it the moment
`extends Mechanism` ran. Calling `.run()` on it is the tick: check every
trigger, hand out and step every command that should be running right now.
Skip this line and none of it moves — buttons would sit there fully wired
and nothing would ever happen when you pressed one.

**Add to `Robot`'s imports:**

```java
import org.wpilib.command3.Scheduler;
```

> **Watch out:** this scheduler doesn't check whether the robot is enabled
> before it runs commands — `robotPeriodic()` fires on every tick,
> disabled or not, and `Scheduler.run()` doesn't ask. What actually keeps a
> disabled robot from moving is the motor hardware itself: a TalonFX
> refuses to apply power while the robot is disabled, no matter what your
> code commands. Real safety net, just not a software one — worth knowing
> your code isn't the thing enforcing it.

---

## 6. Wire a button to it

Open `MyTeleop.java`. It already has a `robot` field from the template —
that's your way in.

`CommandGamepad` gives you a method per button — `southFace()`,
`eastFace()`, `leftBumper()`, and so on, named by where the button sits on
the pad rather than by letter. On a standard controller layout,
`southFace()` is the bottom face button — the one an Xbox pad labels A.
Each one hands back a **`Trigger`**: an object that knows how to answer "is
that button down right now?" and, more usefully, lets you attach a command
to it.

**Add to `MyTeleop`'s constructor:**

```java
  public MyTeleop(Robot robot) {
    this.robot = robot;

    // Hold the bottom face button to drive forward at 30% power; release to stop.
    robot.driverController.southFace().whileTrue(robot.module.driveAtSpeed(0.3));
  }
```

**What that line says:** while the bottom face button is held (`whileTrue`),
schedule the command that `driveAtSpeed(0.3)` returns. When you let go, the
scheduler cancels it — and because the command was built with
`.whenCanceled(...)`, the cleanup fires and the motor stops. One more thing
worth noticing: this line runs *once*, when `MyTeleop` is constructed. It
doesn't press anything — it registers the wiring, and the scheduler does the
watching from then on, tick after tick, all match long.

**Why the constructor, and not `start()`?** Bindings like this one belong in
the constructor because the constructor itself only runs once — the instant
`MyTeleop` is built, when you select it on the Driver Station. `start()`
runs on a different schedule: every time the robot goes from disabled to
enabled, which happens more than once per opmode — toggle **Robot State**
off and back on in SimGUI and watch. Wire a button in `start()` and you'd
register a fresh binding on top of the old one each time the robot
re-enables. Put the wiring in the constructor instead, and it's registered
exactly once, then just sits there working for as long as this opmode stays
selected.

---

## 7. Run it

**Start the simulator:**

```powershell
./gradlew simulateJava
```

Before the button can do anything, you have to hand SimGUI a controller. It
doesn't pick one up on its own, and this is the step everybody misses the
first time — then spends ten minutes convinced their perfectly good binding
is broken.

Two panels do the work. **System Joysticks** lists what your laptop
currently has attached: any real controllers, plus a few entries named
**Keyboard 0**, **Keyboard 1**, and so on. **Joysticks** is the panel your
robot code actually reads, and it's a set of numbered slots starting at 0.

**Drag an entry from System Joysticks into slot 0 of the Joysticks panel.**
If you have a controller plugged in, drag that. If you don't, drag
**Keyboard 0** and your keyboard will stand in for one — that's how most of
this course gets driven.

Slot 0 isn't an arbitrary choice. It's the `0` you just read in
`CommandGamepad(0)`: your controller reads whichever slot number it was
handed, so the field and the panel have to agree. Plug in a second
controller someday and it goes in slot 1, with a `1` in its constructor.

Pick **My Teleop** on the opmode selector, set **Robot State** to
**Enabled**, and open the **Other Devices** panel, where the TalonFX turns
up. Hold the bottom face button — on the controller, on the keyboard, or by
clicking it in the Joysticks panel — and watch the motor's output jump to
`0.3` and drop back to `0` when you let go. (On a real robot the wheel would
spin. We'll get proper motion in the simulation lesson.)

> **Using a real gamepad?** Turn on the **Map gamepad** toggle underneath
> the Joysticks panel. The real Driver Station quietly remaps gamepads so
> every controller reports its buttons in the same order; SimGUI doesn't
> bother unless you ask it to. Without that toggle, your buttons might not
> land where your code expects.

A number changing in a panel isn't as satisfying as a wheel spinning. But
that number *is* your code commanding a motor, because you pressed a
button. It counts.

---

## 8. See what's running

Back in section 3, `.named("Drive At Speed")` came with a promise: that name
would show up "later, in logs and on screen." Time to cash that in — just
enough to see it work, with the rest coming as this course builds up its
telemetry.

The scheduler already knows, at every instant, which command owns which
mechanism — that's the "only one command controls a mechanism at a time"
rule from section 3, and it means the scheduler can just be *asked*.

**Add to `Robot`, below `robotPeriodic()`:**

```java
private void logRunningCommand() {
  List<Command> running = Scheduler.getDefault().getRunningCommandsFor(module);
  Command current = running.get(0);
  SmartDashboard.putString("DriveModule/CurrentCommand", current.name());
}
```

**Call it from `robotPeriodic()`, right after the scheduler tick:**

```java
@Override
public void robotPeriodic() {
  Scheduler.getDefault().run();
  logRunningCommand();
}
```

**Add to `Robot`'s imports:**

```java
import java.util.List;

import org.wpilib.command3.Command;
import org.wpilib.smartdashboard.SmartDashboard;
```

`getRunningCommandsFor(module)` hands back a **`List<Command>`** — a
numbered collection, holding every command currently running on that
mechanism. `.get(0)` asks for entry number zero. That only works because a
mechanism can only ever have *one* command running on it at a time — the
same rule you already learned in section 3. One owner, so entry zero is
always the whole list.

Order matters here, and it's worth being deliberate about: `logRunningCommand()`
has to run *after* `Scheduler.getDefault().run()`, not before. The scheduler
doesn't know anything is running until it's actually ticked once — ask
beforehand, on the very first frame of the whole program, and the list would
be empty. `robotPeriodic()` already ticks first and reads second here, so
this just slots in.

Run it again, hold the bottom face button, and open **NetworkTables →
SmartDashboard → DriveModule** in SimGUI or AdvantageScope. `CurrentCommand`
reads `"DriveModule[IDLE]"` at rest — `Mechanism`'s own name for the fallback
command every mechanism starts with, built from the mechanism's own class
name — and flips to `"Drive At Speed"` the instant you hold the button, back
to `"DriveModule[IDLE]"` the instant you let go. That's the payoff of
`.named(...)`: not decoration, an actual answer to
"what is this thing doing right now," readable from a laptop instead of a
debugger.

> This is a small, direct version of something this course will keep
> building on. Fuller command history — when something started, why it
> ended, a real timeline instead of a snapshot — is possible too, through
> the scheduler's own event system. That's for a later lesson, once there's
> more worth logging and a better answer for where structured history like
> that should live.

---

## Try it

Three exercises. The third one plants a habit you'll lean on for the rest
of the course.

1. Add a **second** button (`robot.driverController.eastFace()`) that drives at
   `-0.3` (reverse). Confirm both buttons fight for the motor cleanly —
   press both; the scheduler lets the most-recently-scheduled one win.
2. Change `m_driveMotor`'s CAN ID and rebuild. Nothing breaks in sim — IDs
   only matter on the real robot, but get in the habit of setting them
   deliberately.
3. Move the CAN ID out of the code and into a named constant. Create
   `Constants.java` next to `Robot.java`, in package `first.robot`:

   ```java
   package first.robot;

   public final class Constants {
     public static final class DriveConstants {
       public static final int kDriveMotorPort = 1;
     }
   }
   ```

   Then use it in the subsystem as `Constants.DriveConstants.kDriveMotorPort`.
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
every file you'll write from here on. On the robot side, mechanisms expose
behavior as **command factory methods** that *return* commands, so the
scheduler can manage who controls the hardware, and motors **hold the last
value** you set — which is why a command that spins a motor pairs a start
with a `.whenCanceled(...)` cleanup. You also learned where hardware
belongs: on `Robot`, which is built once and lasts the whole time the robot
runs, not on an opmode like `MyTeleop`, which gets rebuilt fresh every time
it's selected. Right alongside that, you gave `Robot` one more permanent
job: ticking the **`Scheduler`** from `robotPeriodic()`, the one call that
makes every trigger and every command actually run. You wired a real button
to real behavior — in the constructor, not `start()`, because the
constructor runs once and `start()` runs on every re-enable — and learned
that the simulator needs a joystick dragged into slot 0 before any of it
responds — worth remembering, because that one bites people every season.
Last, you cashed in `.named(...)`'s promise: asking the scheduler for a
mechanism's running command, with `getRunningCommandsFor(module).get(0)`,
turns a name you typed once into a live answer on the dashboard — the first
small piece of a habit this course keeps building on. Next up, that
hard-coded `0.3` becomes a live joystick reading, and this starts feeling
like driving.

Next: Lesson 2 — Joystick control.
