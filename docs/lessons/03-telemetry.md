# Lesson 3 — Telemetry: plot position and velocity

**Goal:** Read the drive motor's built-in sensor, log its **position** and
**velocity** with AdvantageKit, and watch them plotted live as you drive.

**New Java concepts**
- Methods that **return values** you use, not just perform actions
- Reading a value vs. commanding a value
- Chaining calls (`getPosition().getValueAsDouble()`)

**New robot concepts**
- The TalonFX **integrated encoder** (position & velocity for free)
- **Logging** with AdvantageKit — every interesting value, recorded under an
  organized name
- **Plotting** in **AdvantageScope**
- **Units:** rotations and rotations-per-second

---

## 1. Motors that know where they are

So far the conversation with the motor has been one-way: you talk, it spins.
Time to make it talk back. A TalonFX has a built-in **encoder** — a sensor
that counts how far the motor's rotor has turned. That means the motor can
tell you two things for free:

- **Position** — how many rotations it has turned since boot.
- **Velocity** — how fast it's turning right now, in rotations per second (rps).

You *read* these instead of *setting* them:

```java
double rotations = m_driveMotor.getPosition().getValueAsDouble();
double rps       = m_driveMotor.getVelocity().getValueAsDouble();
```

Two dots, two method calls in one expression — that's called **chaining**, and
it reads left to right like a little assembly line. `m_driveMotor.getPosition()`
doesn't return a plain number; it returns a *signal object*, Phoenix's wrapper
that carries the value together with its units and a timestamp. Then
`.getValueAsDouble()` is called on *that result* to pull the plain number out —
rotations for position, rps for velocity. That's the general rule chaining runs
on: whatever a method returns, you can immediately call methods on it, without
parking it in a variable first.

Which is a good moment to name a pattern you've been using without a name.
You've already caught values that methods handed back — `getLeftY()` gave you
the stick position, and your own `applyDeadband` handed back a cleaned-up
number. Here's the pattern: methods come in two flavors. Some are *actions* —
`set(0.3)` means "do this," and nothing comes back. Some are *questions* —
`getPosition()` means "what is this?", and the answer comes back as a
**return value** for you to catch in a variable and act on. Most of
programming is asking questions and acting on the answers, and from this
lesson on, the question-methods start doing the heavy lifting.

---

## 2. Telemetry done right: install AdvantageKit

Now the plumbing problem: your code runs on the robot, and you're looking at
a laptop. The numbers need a way off the robot and onto a screen.

WPILib's quick answer is a class called `SmartDashboard` — sprinkle
`SmartDashboard.putNumber("some name", value)` anywhere and the value shows
up on a dashboard. It works, and you'll see it in older code everywhere. It
also has a failure mode you can probably guess if you've ever debugged with
`System.out.println`: the calls multiply, the names are made up on the spot
(`"test2"`, `"vel_new_FINAL"`), and six weeks in, nobody knows which numbers
still mean anything. Telemetry turns into print-statement spam with a UI.

So this course holds a higher standard from day one: **telemetry is
logging.** Every interesting value goes through one call —
`Logger.recordOutput("SubsystemName/ValueName", value)` — from AdvantageKit,
a logging library by Team 6328. The names form an organized tree, one branch
per subsystem, and every value is recorded, not just displayed. (Under the
hood the values still travel over **NetworkTables**, the network pipe between
robot and laptop — but you'll never have to touch it directly; the logger
does.)

Install it the same way you installed Phoenix 6 in Lesson 1:

1. Command palette (Ctrl+Shift+P) → **WPILib: Manage Vendor Libraries** →
   **Install new libraries (online)**.
2. Paste the AdvantageKit vendordep URL:
   `https://github.com/Mechanical-Advantage/AdvantageKit/releases/latest/download/AdvantageKit.json`
3. Rebuild: `./gradlew build`.

---

## 3. Turn the logger on

The logger needs to be running before anything can log to it, and the place
where the whole program gets set up is `Robot.java` — you haven't touched it
since Lesson 0's print statement. Two changes.

**First, change what `Robot` extends.** Until now, `Robot` has extended
`TimedRobot` — the WPILib base class that provides the 50 Hz heartbeat.
`LoggedRobot` is AdvantageKit's drop-in replacement: the same heartbeat, plus
hooks that let the logger ride along on every tick. Change the class line and
the import (delete the `TimedRobot` import if VS Code doesn't do it for you):

```java
import org.littletonrobotics.junction.LoggedRobot;

public class Robot extends LoggedRobot {
```

**Second, configure and start the logger.** This goes at the *top* of the
`Robot` constructor — the logger should be running before anything else gets
set up, so it never misses a value:

```java
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;
```

```java
  public Robot() {
    Logger.addDataReceiver(new NT4Publisher());    // stream values live over the network
    if (isReal()) {
      Logger.addDataReceiver(new WPILOGWriter());  // on a real robot, also save a log file
    }
    Logger.start();

    // ...the constructor's existing code stays below...
  }
```

A **data receiver** is a destination for logged values, and you can have
several at once. `NT4Publisher` streams every value live over the network —
that's how your laptop will see them. `WPILOGWriter` writes every value to a
`.wpilog` file on the robot: a flight recorder, so after a match you can open
the file and scrub through everything that happened. And `isReal()` is a
question-method — there's section 1's pattern already at work — that answers
whether this code is running on a real roboRIO or on your laptop. In sim
there's no point writing a log file of a motor that isn't real, so the file
writer only runs on hardware.

---

## 4. What to log, and where: `periodic()`

Remember the empty `periodic()` that's been sitting at the bottom of
`DriveModule` since Lesson 1? The scheduler calls it about 50 times a second
no matter what commands are running — it's been waiting for exactly this job.
Telemetry wants to be fresh *always*, not just while some command happens to
be active, so it goes in the method that always runs. Add the `Logger` import
up top with the others, then fill in the body:

```java
import org.littletonrobotics.junction.Logger;
```

```java
public class DriveModule extends SubsystemBase {
  // ...fields, constructor, and command factories stay as they are...

  @Override
  public void periodic() {
    double rotations = m_driveMotor.getPosition().getValueAsDouble();
    double rps       = m_driveMotor.getVelocity().getValueAsDouble();

    Logger.recordOutput("DriveModule/PositionRotations", rotations);
    Logger.recordOutput("DriveModule/VelocityRotPerSec", rps);
  }
}
```

Look at the names. The slash isn't decoration — it builds a folder tree, and
the viewer groups everything under `DriveModule/` together. That's the
organization rule of this whole course: **every value a subsystem logs starts
with the subsystem's name and a slash.** When this robot grows to four
modules, a gyro, and an arm, the tree is what keeps a hundred values
findable. Notice the names carry their units too — `PositionRotations`, not
`Position` — so nobody ever has to guess what the number means.

> **Make it a habit:** measurements get logged from `periodic()`, not from
> inside your command lambdas. Commands come and go; `periodic()` is always
> running, so your plots never go blank just because a command ended.

---

## 5. See the plot in AdvantageScope

The viewer that pairs with AdvantageKit is
[**AdvantageScope**](https://docs.advantagescope.org/) — also by Team 6328,
and it ships in the WPILib installer, so you already have it. It plots live
data, overlays signals, scrubs back through time, and opens those `.wpilog`
flight-recorder files.

Start sim (`./gradlew simulateJava` → **Teleoperated**), then launch
AdvantageScope from the WPILib command palette → **Start Tool** →
**AdvantageScope**. In AdvantageScope:

1. **File → Connect to Simulator** (on a real robot it's "Connect to Robot"
   with team number 5010).
2. In the sidebar, expand **AdvantageKit → RealOutputs → DriveModule** —
   there's your folder tree, with both values ticking.
3. Drag `VelocityRotPerSec` onto the **📈 Line Graph** tab. A live plot
   appears.
4. Drag `PositionRotations` onto the same graph, on the *right axis*. Two
   signals, one time axis.
5. Drive with the stick (or slide the joystick in SimGUI) and watch.

Don't be discouraged when the traces sit nearly flat even at full stick —
in simulation the motor isn't actually turning yet, so there's nothing for
the encoder to count. **That's exactly what Lesson 4 fixes.** What you built
today is the pipe; next lesson gives it something real to carry.

> On a **real robot**, these plots already work — spin the wheel by hand and
> watch position climb. And because of `WPILOGWriter`, the same values are
> being saved to a `.wpilog` file: open it later in AdvantageScope with
> **File → Open Log(s)** and replay the whole session.

You'll come back to AdvantageScope constantly — tuning P control in Lesson 5,
comparing commanded vs. actual speed, and eventually watching the robot drive
around a virtual field.

---

## Try it

1. Log the **commanded** speed too. Inside `driveWithJoystick`'s lambda, add
   `Logger.recordOutput("DriveModule/CommandedOutput", speed);`. This is the
   one refinement to the periodic-only rule: a value that only exists inside
   a command — like the command's own output — gets logged right where it's
   computed. On a real robot, overlaying `CommandedOutput` against
   `VelocityRotPerSec` shows how the motor lags your command — the seed of
   understanding control.
2. Add a `getPositionRotations()` method to `DriveModule` that returns the
   position as a `double`. Notice you're now exposing a *reading* method
   alongside your command factories — that's fine; readings are safe to
   share. We'll use this in Lesson 6.
3. Change the prefix of one key from `DriveModule/` to `Elevator/`, rebuild,
   and watch AdvantageScope: the old entry goes stale and a new folder
   appears in the tree. The slash really is a folder path, and the name
   really is the address. Change it back before moving on.

---

## What you learned

The theme of this lesson is asking instead of telling. Methods split into
actions and questions: `set(...)` tells the motor what to do, while
`getPosition()` and `getVelocity()` ask the TalonFX's **integrated encoder**
what actually happened — position in rotations, velocity in rps — with
`.getValueAsDouble()` **chained** on to unwrap the plain number from the
signal object. And instead of scattering dashboard calls around the code, you
set up real **logging**: `LoggedRobot` and `Logger.start()` turn it on once
in `Robot.java`, data receivers decide where values go (streamed live by
`NT4Publisher`, saved to a file by `WPILOGWriter`), and every value flows
through `Logger.recordOutput("Subsystem/Name", value)` from `periodic()`.
That naming discipline feels like overkill for two values — it stops being
overkill around value twenty, and you'll get there sooner than you think. The
plots look unimpressive while the sim motor stands still, but Lesson 4 turns
the physics on, and these same plots come alive.

Next: [Lesson 4 — Simulation](04-simulation.md).
