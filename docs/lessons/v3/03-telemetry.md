# Lesson 3 — Telemetry: plot position and velocity

**Goal:** Read the drive motor's built-in sensor, log its **position** and
**velocity**, and watch them plotted live as you drive.

**New Java concepts**
- Methods that **return values** you use, not just perform actions
- Reading a value vs. commanding a value
- Chaining calls (`getPosition().getValueAsDouble()`)
- Method references (`this::logTelemetry`)

**New robot concepts**
- The TalonFX **integrated encoder** (position & velocity for free)
- **Logging** with `SmartDashboard` — every interesting value, recorded
  under an organized name
- **Plotting** in **AdvantageScope**
- **Units:** rotations and rotations-per-second

---

## 1. Motors that know where they are

So far the conversation with the motor has been one-way: you talk, it
spins. Time to make it talk back. A TalonFX has a built-in **encoder** — a
sensor that counts how far the motor's rotor has turned. That means the
motor can tell you two things for free:

- **Position** — how many rotations it has turned since boot.
- **Velocity** — how fast it's turning right now, in rotations per second
  (rps).

You *read* these instead of *setting* them.

*Nothing to add yet — this is how you'll read them, in section 4:*

```java
double rotations = m_driveMotor.getPosition().getValueAsDouble();
double rps       = m_driveMotor.getVelocity().getValueAsDouble();
```

Two dots, two method calls in one expression — that's called **chaining**,
and it reads left to right like a little assembly line.
`m_driveMotor.getPosition()` doesn't return a plain number; it returns a
*signal object*, Phoenix's wrapper that carries the value together with its
units and a timestamp. Then `.getValueAsDouble()` is called on *that
result* to pull the plain number out — rotations for position, rps for
velocity. That's the general rule chaining runs on: whatever a method
returns, you can immediately call methods on it, without parking it in a
variable first.

Which is a good moment to name a pattern you've been using without a name.
You've already caught values that methods handed back —
`robot.driverController.getLeftY()` gave you the stick position, and your
own `applyDeadband` handed back a cleaned-up number. Here's the pattern: methods
come in two flavors. Some are *actions* — `set(0.3)` means "do this," and
nothing comes back. Some are *questions* — `getPosition()` means "what is
this?", and the answer comes back as a **return value** for you to catch in
a variable and act on. Most of programming is asking questions and acting
on the answers, and from this lesson on, the question-methods start doing
the heavy lifting.

---

## 2. Telemetry: get numbers off the robot

Now the plumbing problem: your code runs on the robot, and you're looking
at a laptop. The numbers need a way off the robot and onto a screen.
WPILib's answer is a class called `SmartDashboard` — sprinkle
`SmartDashboard.putNumber("some name", value)` anywhere and the value shows
up on a dashboard, live.

This course holds a standard from day one: **the name is the address.**
Every value goes under an organized name, one branch per mechanism, so a
hundred values from now, you can still find the one you want. Names carry
their units too — `PositionRotations`, not `Position` — so nobody has to
guess what a number means later.

---

## 3. Start the flight recorder

`SmartDashboard`'s values are live — visible while the robot runs,
gone the moment it stops, unless something is also saving them. WPILib's
`DataLogManager` does exactly that: start it once, and every value
published anywhere gets mirrored into a `.wpilog` file automatically.

The logger should be running before anything else gets set up, so it goes
at the *top* of the `Robot` constructor.

**Edit `Robot.java`'s constructor:**

```java
public Robot() {
  DataLogManager.start(); // saves every published value to a .wpilog file
}
```

**Add to `Robot.java`'s imports:**

```java
import org.wpilib.datalog.DataLogManager;
```

On a real robot the file lands on SystemCore (or a USB stick plugged into
it); in sim it lands in a `logs/` folder inside your project. Recording sim
sessions might sound like overkill — it isn't. A session you can scrub
through afterward is how you answer "wait, what just happened?" without
having to make it happen again.

---

## 4. What to log, and where

You want telemetry fresh *always* — not just while some command happens to
be running. That means it belongs somewhere that always runs, on its own
schedule, independent of whatever command is currently active. A mechanism
can ask the scheduler for exactly that kind of standing callback, once, in
its constructor.

**Edit `DriveModule`'s constructor:**

```java
public DriveModule() {
  Scheduler.getDefault().addPeriodic(this::logTelemetry);
}
```

`Scheduler.getDefault().addPeriodic(...)` registers a callback that runs
every tick, forever, for as long as the robot runs — no command required.
`this::logTelemetry` is a **method reference**: shorthand for `() ->
this.logTelemetry()`, pointing at a method below instead of writing a
lambda around it. It reads naturally once you say it out loud: "add a
periodic task — this dot logTelemetry."

**Add the method itself, below the constructor:**

```java
private void logTelemetry() {
  double rotations = m_driveMotor.getPosition().getValueAsDouble();
  double rps = m_driveMotor.getVelocity().getValueAsDouble();

  SmartDashboard.putNumber("DriveModule/PositionRotations", rotations);
  SmartDashboard.putNumber("DriveModule/VelocityRotPerSec", rps);
}
```

**Add to `DriveModule`'s imports:**

```java
import org.wpilib.command3.Scheduler;
import org.wpilib.smartdashboard.SmartDashboard;
```

Look at the names. The slash isn't decoration — it builds a folder tree,
and the dashboard groups everything under `DriveModule/` together. That's
the organization rule of this whole course: **every value a mechanism logs
starts with the mechanism's name and a slash.** When this robot grows to
four modules, a gyro, and an arm, the tree is what keeps a hundred values
findable.

> **Make it a habit:** measurements get logged from a steady,
> always-running callback like this one, not from inside your command
> bodies. Commands come and go; this callback doesn't, so your plots never
> go blank just because a command ended.

---

## 5. See the plot in AdvantageScope

The viewer that pairs with this is
[**AdvantageScope**](https://docs.advantagescope.org/), and it ships in the
WPILib installer, so you already have it. It plots live data, overlays
signals, scrubs back through time, and opens `.wpilog` flight-recorder
files.

Start sim (`./gradlew simulateJava` → pick **My Teleop** → **Enabled**),
then launch AdvantageScope from the WPILib command palette → **Start
Tool** → **AdvantageScope**. In AdvantageScope:

1. **File → Connect to Simulator** (on a real robot it's "Connect to
   Robot" with team number e.g. 5010). Also choose the default NetworkTables
   4.
2. In the sidebar, expand **NetworkTables → SmartDashboard → DriveModule**
   — there's your folder tree, with both values ticking.
3. Drag `VelocityRotPerSec` onto the **📈 Line Graph** tab. A live plot
   appears.
4. Drag `PositionRotations` onto the same graph, on the *right axis*. Two
   signals, one time axis.
5. Drive with the stick (or slide the joystick in SimGUI) and watch.

Don't be discouraged when the traces sit nearly flat even at full stick —
in simulation the motor isn't actually turning yet, so there's nothing for
the encoder to count. **That's exactly what Lesson 4 fixes.** What you
built today is the pipe; next lesson gives it something real to carry.

> On a **real robot**, these plots already work — spin the wheel by hand
> and watch position climb.

And sim or real, `DataLogManager` has been saving every value to a
`.wpilog` file this whole time — after a sim run, look for the `logs/`
folder in your project. Open a log with **File → Open Log(s)** in
AdvantageScope and you can scrub back through the entire session.

You'll come back to AdvantageScope constantly — tuning P control in
Lesson 5, comparing commanded vs. actual speed, and eventually watching the
robot drive around a virtual field.

---

## Try it

1. Log the **commanded** speed too. Inside `driveWithJoystick`'s loop body,
   add `SmartDashboard.putNumber("DriveModule/CommandedOutput", speed);`.
   This is a refinement to the always-running rule: a value that only
   exists inside a command — like the command's own output — gets logged
   right where it's computed. On a real robot, overlaying
   `CommandedOutput` against `VelocityRotPerSec` shows how the motor lags
   your command — the seed of understanding control.
2. Add a `getPositionRotations()` method to `DriveModule` that returns the
   position as a `double`. Notice you're now exposing a *reading* method
   alongside your command factories — that's fine; readings are safe to
   share. We'll use this in Lesson 6.
3. Change the prefix of one key from `"DriveModule/"` to `"Elevator/"`,
   rebuild, and watch AdvantageScope: the old entry goes stale and a new
   folder appears in the tree. The slash really is a folder path, and the
   name really is the address. Change it back before moving on.

---

## What you learned

The theme of this lesson is asking instead of telling. Methods split into
actions and questions: `set(...)` tells the motor what to do, while
`getPosition()` and `getVelocity()` ask the TalonFX's **integrated
encoder** what actually happened — position in rotations, velocity in rps —
with `.getValueAsDouble()` **chained** on to unwrap the plain number from
the signal object. And instead of scattering ad-hoc numbers around the
code, you set up real, organized **logging**: `DataLogManager.start()`
turns the flight recorder on once in `Robot.java`, a mechanism registers a
steady periodic callback with the scheduler using a **method reference**,
and every value flows through `SmartDashboard.putNumber("Mechanism/Name",
value)` from there. That naming discipline feels like overkill for two
values — it stops being overkill around value twenty, and you'll get there
sooner than you think. The plots look unimpressive while the sim motor
stands still, but Lesson 4 turns the physics on, and these same plots come
alive.

Next: Lesson 4 — Simulation.
