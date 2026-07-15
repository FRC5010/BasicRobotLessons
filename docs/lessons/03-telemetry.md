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
- **Plotting** in SimGUI / Glass
- **Units:** rotations and rotations-per-second

---

## 1. Motors that know where they are

A TalonFX has a built-in **encoder** — a sensor that counts how far the motor's
rotor has turned. That means the motor can tell you two things for free:

- **Position** — how many rotations it has turned since boot.
- **Velocity** — how fast it's turning right now, in rotations per second (rps).

You *read* these instead of *setting* them:

```java
double rotations = m_driveMotor.getPosition().getValueAsDouble();
double rps       = m_driveMotor.getVelocity().getValueAsDouble();
```

**Reading the chain left to right:**
- `m_driveMotor.getPosition()` returns a *signal object* (Phoenix's wrapper that
  carries the value plus its units and a timestamp).
- `.getValueAsDouble()` pulls the plain number out of it — rotations for position,
  rps for velocity.

This is the first time you're using a method for its **return value**. `set(...)`
was a command ("do this"); `getPosition()` is a question ("what is this?"). Most of
programming is asking questions and acting on the answers.

---

## 2. Getting data off the robot: NetworkTables

Your code runs on the robot; you're looking at a laptop. **NetworkTables** is the
shared bulletin board between them: the robot posts numbers, the dashboard reads
them. The easiest door into it is **`SmartDashboard`**:

```java
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
```

```java
SmartDashboard.putNumber("Drive Position (rot)", rotations);
SmartDashboard.putNumber("Drive Velocity (rps)", rps);
```

`putNumber("name", value)` publishes a number under a label. Publish it **every
tick** and the dashboard can plot it over time.

---

## 3. Where to put it: `periodic()`

`periodic()` runs every tick regardless of what commands are scheduled — perfect for
telemetry, which you always want fresh. Update `DriveModule`:

```java
@Override
public void periodic() {
  double rotations = m_driveMotor.getPosition().getValueAsDouble();
  double rps       = m_driveMotor.getVelocity().getValueAsDouble();

  SmartDashboard.putNumber("Drive Position (rot)", rotations);
  SmartDashboard.putNumber("Drive Velocity (rps)", rps);
}
```

> **Design note:** telemetry belongs in `periodic()`, *not* inside your command
> lambdas. Commands come and go; `periodic()` is always running, so your plots never
> go blank just because a command ended.

---

## 4. See the plot

`./gradlew simulateJava` → **Teleoperated**.

In **SimGUI**: menu **NetworkTables → SmartDashboard**, and you'll see your two
values ticking. To *plot* them over time, use **Glass** (the richer dashboard):

1. Run the sim, then launch Glass (WPILib command palette → **Start Tool** → Glass),
   or in SimGUI drag a value into a **Plot** widget.
2. Add "Drive Velocity (rps)" to a plot. Drive with the stick and watch the trace
   rise and fall.

Right now position barely moves and velocity is near zero even at full stick —
because in simulation the motor isn't actually turning yet. **That's exactly what
Lesson 4 fixes.** For now you've built the *pipe*; next we give it something real to
carry.

> On a **real robot**, these plots already work — spin the wheel by hand and watch
> position climb.

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

- The TalonFX's **integrated encoder** gives **position** (rotations) and
  **velocity** (rps) for free — you *read* them with `getPosition()` /
  `getVelocity()` and `.getValueAsDouble()`.
- Methods can **return values** you use, not just perform actions.
- **NetworkTables**, via **`SmartDashboard.putNumber`**, carries data to the
  dashboard; publishing in **`periodic()`** keeps it live.
- SimGUI/Glass **plot** those values over time — your window into what the robot is
  actually doing.

Next: [Lesson 4 — Simulation](04-simulation.md).
