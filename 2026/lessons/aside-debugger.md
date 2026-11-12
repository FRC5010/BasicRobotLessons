# Aside — Debugging in VSCode and reading stack traces

**Goal:** Learn to pause a running robot program, inspect its state at exactly
the moment something odd happens, step through code line by line, and read the
error trail Java prints when the program crashes.

This isn't part of the numbered sequence. Reach for it any time you're stuck —
"the number should be 90 but the wheel isn't moving," or "sim just exploded and
printed 40 lines of red." Everyone's first instinct in those moments is to
sprinkle print statements everywhere and squint at the output. The debugger and
stack traces are the faster way to the answer, and they're much less scary than
they look.

**New concepts**
- **Breakpoints**, **stepping** (over / into / out), and the **Variables**,
  **Watch**, and **Call Stack** panels
- **Conditional breakpoints** — pause only when a specific condition is true
- **Stack traces** — how to read the receipt Java prints when something throws

**When you can use this**
- The debugger works from [Lesson 1](01-first-motor.md) onward. Any code you can
  run, you can debug.
- The worked example uses [Lesson 5](05-steering-p-control.md)'s P control
  because that's where per-tick variables (`measurement`, `error`, `output`)
  first get interesting. If you haven't finished Lesson 5, the *shape* of the
  walkthrough still applies to whatever code you have — the numbers change, the
  moves don't. (And if you're past [Lesson 12](12-model-based-control.md),
  that P-control code has moved into the motor firmware — set your breakpoints
  in `setDesiredState`, where the target-setting and cosine math now live,
  instead.)
- **On [the OpMode track](v3/README.md), everything here still applies** —
  breakpoints and stepping are a VSCode feature, not a WPILib one. Three
  things differ, called out inline below: the code lives under
  `first.robot`, not `frc.robot`; SimGUI has an extra opmode-selector step;
  and the framework rewrites a thrown exception's stack trace before Java
  prints it, which changes what section 4's reading applies to. (This
  course hasn't verified whether the WPILib VSCode extension's launch
  configs recognize a 2027-alpha OpMode project yet — if `F5` doesn't do
  anything, `./gradlew simulateJava` from a terminal is the fallback path
  every lesson in that track was actually built and checked against.)

---

## 1. Launching in the debugger

The WPILib VSCode extension adds a debug launch. Two ways to start it:

- **Command Palette** (`Ctrl+Shift+P`) → search **WPILib: Simulate Robot Code**
  and pick the option that launches with the debugger attached.
- Or just press **`F5`** with a `.java` file open. VSCode will use the WPILib
  launch config.

Either way, sim starts up the same as `./gradlew simulateJava` — except VSCode
is now watching the JVM and will pause it the moment a breakpoint hits.

There's an equivalent **Debug Robot Code** command that deploys with the
debugger attached — to a roboRIO on the classic track, to a SystemCore on
the OpMode track. You'll rarely need it — sim covers 90% of debugging — but
it's there if a bug only shows up on real hardware.

If a Java process starts but the SimGUI window never appears, look at the
**Debug Console** panel at the bottom of VSCode for a stack trace from startup
— skip to [section 4](#4-reading-a-stack-trace).

---

## 2. Breakpoints, stepping, and watches

Click in the **gutter** — the empty strip just left of the line numbers — next
to any line of Java. A red dot appears. That's a breakpoint. When execution
reaches that line, the entire robot pauses (the 50 Hz tick freezes with it) and
VSCode shows you:

- **Variables** — every local variable and field currently in scope, with its
  value. Expand objects to drill in.
- **Watch** — expressions you type in, evaluated every time execution pauses.
  Try `Math.abs(error)`, `SteerConstants.kP * error`, or
  `m_module.getSteerAngleDegrees()`.
- **Call Stack** — the chain of method calls that led here. This is a *live*
  stack trace (section 4 shows the crashed-program version).
- **Debug toolbar** at the top of the window:
  - **Continue** (`F5`) — resume until the next breakpoint.
  - **Step Over** (`F10`) — run the next line, but don't dive into its called
    method.
  - **Step Into** (`F11`) — dive into the called method.
  - **Step Out** (`Shift+F11`) — run until the current method returns.
  - **Stop** — kill the debug session.

That's a lot of panels at once — don't try to memorize them. The worked
example below touches each one, and after a session or two your hands will
know where everything is.

One thing to internalize now, though: **while paused, nothing on the robot is
running.** The scheduler isn't ticking, sensors aren't updating, timers aren't
advancing. In sim that's harmless — sim time stops with everything else. On a
real robot, motors keep applying their last command until you continue, which
is exactly why debugging in sim is almost always safer.

---

## 3. Worked example: watching Lesson 5's P control tick by tick

Open `SwerveModule.java` — under `src/main/java/frc/robot/subsystems/` on the
classic track, `src/main/java/first/robot/subsystems/` on the OpMode track
(or `DriveModule.java` in either one if you're still on Lesson 5). Find the
line inside `steerToAngle` that computes `error`.

*Nothing to add — this is code you already have:*

```java
double error = targetDegrees - measurement;
```

1. Click the gutter next to that line. Red dot.
2. Press `F5` to launch the debugger. In SimGUI, drag **Robot State** to
   **Teleoperated**. On the OpMode track, pick the opmode from the selector
   first (**My Teleop**), *then* set Robot State — there's no code to run
   until an opmode is actually selected.
3. Press **X** on the controller (from Lesson 5, that's `steerToAngle(90)`
   either way — it's bound to `westFace()` on the OpMode track, which is
   the same physical button).
   Execution hits the breakpoint and VSCode steals focus.
4. Look at the **Variables** panel:
   - `targetDegrees` = `90.0`
   - `measurement` = something near `0.0` (the module hasn't moved yet)
   - `error` doesn't have a value yet — this is the line that will *compute* it.
5. Press **Step Over** (`F10`). Now `error ≈ 90`. On the next line, watch
   `output` be computed as `SteerConstants.kP * error` — with `kP = 0.01`, that's
   `0.9`. That's the number about to go to the motor.
6. Add a **Watch**: `SteerConstants.kP * error`. Now every time you continue,
   you'll see the number the motor is about to receive without having to
   compute it yourself.
7. Press **Continue** (`F5`). The breakpoint fires again on the next tick —
   `measurement` has ticked up a little, `error` has shrunk a little, `output`
   is smaller. **That decay curve you plotted in Lesson 5? You're watching it
   happen one tick at a time.**

### Catch a rare case with a conditional breakpoint

Lesson 5's **Try it #1** was about the "long way around" bug — if `error` is
ever bigger than 180° in magnitude, the module is spinning further than it
needs to. Instead of hammering Continue looking for that case, let VSCode do it:

1. Right-click the red dot → **Edit Breakpoint…** → **Expression**.
2. Type: `Math.abs(error) > 180`
3. Continue.

The robot now runs at full speed and pauses **only** when the bad case
happens. This is how you catch flaky, once-every-20-seconds bugs without
staring at a plot for hours.

---

## 4. Reading a stack trace

When something throws, Java prints a **stack trace**, and the first time you
see one it reads like the program yelling at you in a foreign language. It
isn't. It's a receipt — a list of every method call that was open at the
moment of the crash. Here's a typical one from forgetting to construct a
motor.

*Nothing to add — a sample stack trace, not code:*

```
Unhandled exception: java.lang.NullPointerException: Cannot invoke
"com.ctre.phoenix6.hardware.TalonFX.set(double)" because "this.m_driveMotor" is null
        at frc.robot.subsystems.DriveModule.lambda$driveForward$0(DriveModule.java:37)
        at edu.wpi.first.wpilibj2.command.FunctionalCommand.execute(FunctionalCommand.java:70)
        at edu.wpi.first.wpilibj2.command.CommandScheduler.run(CommandScheduler.java:326)
        at frc.robot.Robot.robotPeriodic(Robot.java:25)
        ...
```

Read it in two passes.

**Pass one — the first line.** It says *what* went wrong in almost-plain
English:

> `NullPointerException: Cannot invoke ".set(double)" because "this.m_driveMotor" is null`

Translated: you tried to call `.set(...)` on `m_driveMotor`, but `m_driveMotor`
was never assigned. The fix isn't in the scheduler or in WPILib — it's that
your constructor never ran `m_driveMotor = new TalonFX(…)`.

**Pass two — the first frame you own.** The trace lists methods most-recent
first. Skip past library frames (`edu.wpi.first.*`, `com.ctre.*`, `java.*`).
The first line that mentions **your code** (`frc.robot.*`) is where you look:

> `at frc.robot.subsystems.DriveModule.lambda$driveForward$0(DriveModule.java:37)`

Break it apart:

- `frc.robot.subsystems.DriveModule` — the class.
- `lambda$driveForward$0` — a name Java made up for the `() -> …` block you
  passed to `run(...)` inside `driveForward()`. The `$0` means "first lambda in
  this method." Read it as: "inside `driveForward`."
- `(DriveModule.java:37)` — the file and line. **Ctrl+click the `file:line` in
  the terminal and VSCode jumps you there.** This is the single most useful
  keystroke in debugging.

The frames below (`FunctionalCommand.execute` → `CommandScheduler.run` →
`Robot.robotPeriodic`) are just the story of how a scheduler tick reached your
lambda. That's the mental model from Lesson 0 — you rarely need to look below
the topmost `frc.robot.*` frame.

### The same trace on the OpMode track

Same mistake, same two passes — but the framework does you a real favor here
that's worth knowing about before you meet it cold. Coroutine-style commands
run on top of `jdk.internal.vm.Continuation`, and a raw trace through that
machinery is unreadable — dozens of frames of continuation plumbing between
your code and the exception. Commands V3 doesn't hand you that trace; it
rewrites it first, through a class actually named `CommandTraceHelper` —
confirmed by decompiling it, not guessed. It **strips every internal
`Coroutine`/`Continuation`/`Scheduler` frame out**, and then does something
the classic track's trace can't: it **splices in a second stack trace**,
captured back when the command was originally scheduled, so you can see
*both* where it broke *and* which button bound it — separated by a literal
marker frame. Verified by forcing the identical `m_driveMotor` mistake in a
`Mechanism.run(...)` command and reading what actually printed:

*Nothing to add — the top three frames are exactly what printed; the bottom
two are relabeled to show what they'd read in a deployed robot instead of
the bare test harness that produced this:*

```
Exception in thread "main" java.lang.NullPointerException: Cannot invoke
"com.ctre.phoenix6.hardware.TalonFX.setThrottle(double)" because "this.m_driveMotor" is null
        at first.robot.subsystems.DriveModule.lambda$driveForward$0(DriveModule.java:13)
        at org.wpilib.command3.Mechanism.lambda$runRepeatedly$0(Mechanism.java:118)
        at first.robot.Robot.robotPeriodic(Robot.java:53)
        at === Command Binding Trace ===.()
        at first.robot.opmode.RobotTeleop.<init>(RobotTeleop.java:41)
```

Read it the same two-pass way. Pass one, the first line, is identical —
`setThrottle` is this track's version of `.set(...)`, and the diagnosis is
the same uninitialized field. Pass two, the first frame you own, is also
where you'd expect it: `DriveModule.lambda$driveForward$0`, same meaning as
before — the lambda you passed to `run(...)`/`runRepeatedly(...)` inside
`driveForward()`.

What's new is everything from `=== Command Binding Trace ===` down. That
line isn't a bug in the printout — it's the framework telling you "the
frames above this are where the exception happened; the frames below it are
where the command that threw it was scheduled from." Here that's
`RobotTeleop.<init>`, meaning the button binding that scheduled
`driveForward()` in the first place. On a real robot with a dozen bindings,
that second half is the fast way to answer "which button did this?" without
guessing — a question the classic track's trace can't answer at all, because
it only ever shows you the scheduler tick that happened to run when things
broke, not who asked for the command to begin with.

### Other common shapes

- **`ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4`** —
  Lesson 7 territory. You built `SwerveModule[] m_modules = new SwerveModule[4]`
  and then wrote `m_modules[4]`. Arrays are zero-indexed; the last valid index
  is `length - 1 = 3`. Ninety percent of the time it's an off-by-one at the
  boundary of a `for` loop.
- **`StackOverflowError`** — a method calling itself with no way out. Classic
  case: a getter that accidentally returns `getX()` instead of the field `x`.
  The trace shows the same method repeating forever.
- **A trace with `Caused by:` further down** — one exception triggered another
  (typical during initialization). Read the *bottom-most* `Caused by:` first —
  that's the original problem; the ones above are the wrapping.

---

## Try it

Three exercises — and yes, the first one is "break your robot on purpose."
Crashing a program you *meant* to crash is the best way to take the fear out
of the real thing.

1. **Force an NPE on purpose.** In a subsystem you have, add a new field:
   `private TalonFX m_bogus;` — don't initialize it. Then call
   `m_bogus.set(0.1)` (`m_bogus.setThrottle(0.1)` on the OpMode track) inside
   `periodic()`. Run sim, read the trace, note the exact `file:line` it
   points to, Ctrl+click it. Then delete the bogus code.
2. **Conditional breakpoint.** On your `steerToAngle`'s `error` line, set a
   conditional breakpoint with `Math.abs(error) > 180`. Verify it fires on the
   long-way-around case and stays quiet on normal moves. If your Lesson 5 fix
   already wraps `error` to `[-180, 180]`, temporarily comment the fix out to
   see the breakpoint catch what the fix prevents.
3. **Step Into a WPILib method.** Set a breakpoint on `m_steerMotor.set(output)`
   (`m_steerMotor.setThrottle(output)` on the OpMode track). When it hits,
   press **Step Into** (`F11`) instead of **Step Over**. You'll land inside
   CTRE's library code. Look around for one screen — you don't need to
   understand it — then press **Step Out** (`Shift+F11`) to bounce back to
   your code. Doing this once demystifies "what's inside a library call."

---

## What you learned

You now have two tools that beat `System.out.println` sprinkled through the
code. The first is the **breakpoint**: it freezes the whole 50 Hz loop, and
while everything's paused the **Variables**, **Watch**, and **Call Stack**
panels show you what the robot was thinking, one tick at a time — with **Step
Over / Into / Out** to walk forward line by line, and **conditional
breakpoints** to catch the rare bad tick without pounding Continue. The second
is the **stack trace**, which is a receipt, not gibberish: the first line says
*what* broke, the first `frc.robot.*` frame (`first.robot.*` on the OpMode
track, which also hands you a second trace showing which button scheduled
the command in the first place) says *where*, and Ctrl+clicking the
`file:line` takes you straight there. Next time something goes sideways,
reach for these *before* you spend twenty minutes staring at code — that's the
whole reason this aside exists.
