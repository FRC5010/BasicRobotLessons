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
values ticking. SimGUI is built on the same widget library as WPILib's standalone
**Glass** tool, so plotting is already right there in the sim window — you don't
need to launch anything extra:

1. In the **SmartDashboard** panel, find "Drive Velocity (rps)".
2. Right-click the value → **Plot** (or drag it onto an existing plot). A live
   plot appears.
3. Drive with the stick (or slide the joystick in SimGUI) and watch the trace
   rise and fall.

Right now position barely moves and velocity is near zero even at full stick —
because in simulation the motor isn't actually turning yet. **That's exactly what
Lesson 4 fixes.** For now you've built the *pipe*; next we give it something real to
carry.

> On a **real robot**, these plots already work — spin the wheel by hand and watch
> position climb.

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

- The TalonFX's **integrated encoder** gives **position** (rotations) and
  **velocity** (rps) for free — you *read* them with `getPosition()` /
  `getVelocity()` and `.getValueAsDouble()`.
- Methods can **return values** you use, not just perform actions.
- **NetworkTables**, via **`SmartDashboard.putNumber`**, carries data to the
  dashboard; publishing in **`periodic()`** keeps it live.
- **SimGUI's built-in plot** gives you a live view; **AdvantageScope** is the
  richer tool for comparing signals, scrubbing history, and field/robot views.

Next: [Lesson 4 — Simulation](04-simulation.md).
