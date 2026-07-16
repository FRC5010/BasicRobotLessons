# Lesson 3 — Telemetry: plot position and velocity

**Goal:** Read the drive motor's built-in sensor, publish its **position** and
**velocity** to the dashboard, and watch them plotted live as you drive.

**New Java concepts**
- Methods that **return values** you use, not just perform actions
- Reading a value vs. commanding a value
- Chaining calls (`getPosition().getValueAsDouble()`)

**New robot concepts**
- The TalonFX **integrated encoder** (position & velocity for free)
- **NetworkTables / SmartDashboard** — the pipe that carries data off the robot
- **Plotting** in SimGUI, and viewing the same data in **AdvantageScope**
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

## 2. Getting data off the robot: NetworkTables

Now the plumbing problem: your code runs on the robot, and you're looking at a
laptop. **NetworkTables** is the shared bulletin board between them — the
robot posts numbers under a name, and anything on the network can look them up
by that name. The board is already running; you don't write any connection
code. The easiest door into it is **`SmartDashboard`**. Add the import to
`DriveModule.java`, up top with the others:

```java
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
```

And publishing looks like this:

```java
SmartDashboard.putNumber("Drive Position (rot)", rotations);
SmartDashboard.putNumber("Drive Velocity (rps)", rps);
```

`putNumber("name", value)` posts a number under a label — the label is the
address on the bulletin board, and the dashboard finds the value by it.
Publish it **every tick** and the dashboard can plot it over time. Which
raises the real question: *where* do these lines go so they run every tick?

---

## 3. Where to put it: `periodic()`

Remember the empty `periodic()` that's been sitting at the bottom of
`DriveModule` since Lesson 1? The scheduler calls it about 50 times a second
no matter what commands are running — it's been waiting for exactly this job.
Telemetry wants to be fresh *always*, not just while some command happens to
be active, so it goes in the method that always runs. Fill in the body:

```java
public class DriveModule extends SubsystemBase {
  // ...fields, constructor, and command factories stay as they are...

  @Override
  public void periodic() {
    double rotations = m_driveMotor.getPosition().getValueAsDouble();
    double rps       = m_driveMotor.getVelocity().getValueAsDouble();

    SmartDashboard.putNumber("Drive Position (rot)", rotations);
    SmartDashboard.putNumber("Drive Velocity (rps)", rps);
  }
}
```

> **Make it a habit:** telemetry goes in `periodic()`, *not* inside your
> command lambdas. Commands come and go; `periodic()` is always running, so
> your plots never go blank just because a command ended.

---

## 4. See the plot

`./gradlew simulateJava` → **Teleoperated**.

In **SimGUI**: menu **NetworkTables → SmartDashboard**, and you'll see your two
values ticking. SimGUI is built on the same widget library as WPILib's standalone
**Glass** tool, so plotting is already right there in the sim window — you don't
need to launch anything extra:

1. In the **SmartDashboard** panel, find "Drive Velocity (rps)".
2. Right-click the value → **Plot** (or drag it onto an existing plot). A live
   plot appears.
3. Drive with the stick (or slide the joystick in SimGUI) and watch the trace
   rise and fall.

Don't be discouraged when the traces sit nearly flat even at full stick —
in simulation the motor isn't actually turning yet, so there's nothing for
the encoder to count. **That's exactly what Lesson 4 fixes.** What you built
today is the *pipe*; next lesson gives it something real to carry.

> On a **real robot**, these plots already work — spin the wheel by hand and
> watch position climb.

### A richer viewer: AdvantageScope

SimGUI's built-in plot is great for a quick look at one or two signals. Once you
want to overlay a *commanded* value against a *measured* one, scrub back through
what happened five seconds ago, or see the robot on a virtual field,
[**AdvantageScope**](https://docs.advantagescope.org/) is the tool teams reach
for. It's made by Team 6328 and ships in the WPILib installer, so you already
have it.

Launch it from the WPILib command palette → **Start Tool** → **AdvantageScope**,
then in AdvantageScope:

1. **File → Connect to Simulator** (or "Connect to Robot" and enter team number
   5010 on a real robot).
2. Drag "Drive Velocity (rps)" from the sidebar onto the **📈 Line Graph** tab.
3. Drag "Drive Position (rot)" onto the same graph, on the *right axis*. Two
   signals, one time axis.

You'll come back to AdvantageScope often — for tuning P control in Lesson 5,
comparing commanded vs. actual speed, and eventually watching the robot pose on
the field.

---

## Try it

1. Publish the **commanded** speed too (`SmartDashboard.putNumber("Drive Command",
   speed)`). On a real robot, plotting command vs. velocity on the same graph shows
   how the motor lags your command — the seed of understanding control.
2. Add a `getPositionRotations()` method to `DriveModule` that returns the position
   as a `double`. Notice you're now exposing a *reading* method alongside your
   command factories — that's fine; readings are safe to share. We'll use this in
   Lesson 6.
3. Rename a dashboard key and confirm the old plot goes stale while the new one
   appears — proof that the "name" is the address on the bulletin board.

---

## What you learned

The theme of this lesson is asking instead of telling. Methods split into
actions and questions: `set(...)` tells the motor what to do, while
`getPosition()` and `getVelocity()` ask the TalonFX's **integrated encoder**
what actually happened — position in rotations, velocity in rps — with
`.getValueAsDouble()` **chained** on to unwrap the plain number from the
signal object. **NetworkTables** is the bulletin board that carries those
answers off the robot: publish with `SmartDashboard.putNumber` from
`periodic()` so the data never goes stale, plot it in SimGUI for a quick
look, and reach for **AdvantageScope** when you want to compare signals or
scrub back through time. The pipe looks unimpressive while the sim motor
stands still — but Lesson 4 turns the physics on, and these same plots come
alive.

Next: [Lesson 4 — Simulation](04-simulation.md).
