# Lesson 31 — The robot tells you what's wrong

**Goal:** Make the robot run its own pre-match checklist and say what it finds,
somewhere a human will actually look.

**New Java concepts**
- None.

**New robot concepts**
- **`Alert`** and `AlertType`, and where they surface
- **Logging a problem and reporting one are different jobs** — you've logged
  everything since Lesson 3, and nobody reads a log in the queue line
- **"Is this device there?" is a sensor reading**, so it belongs in the inputs
- Choosing what's worth alerting on, and what's an error versus a warning

---

## 1. Five minutes before a match

You're in the queue line. The robot is on its cart, powered on. You have about
five minutes, no laptop connection worth trusting, and one question: **is this
thing going to work?**

Everything you'd want to know, the robot already knows.

It knows whether every motor answered on the CAN bus. It knows whether the
elevator has ever been homed, because Lesson 21 recorded that. It knows what the
battery is doing, because Lesson 30 measured it. It knows whether the cameras are
alive. Every one of those facts is sitting in a variable right now.

And every one of them is invisible, because the only place any of it goes is a log
file that gets opened after the match, by which point the interesting question has
already been answered the hard way.

---

## 2. Logging it and saying it are different jobs

This is worth being precise about, because the course has spent thirty lessons
building the first one and it is genuinely not the second.

**A log is a record.** It's complete, it's timestamped, it's for later, and it
answers "what happened?" — usually while sitting down, with AdvantageScope open,
after something went wrong. Everything in this course logs, and that has been the
right call every time.

**An alert is a statement about now.** It's short, it's for a human standing next
to the robot with thirty seconds to spare, and it answers "should I be worried?"

A log entry saying `Elevator/Homed = false` is a perfect record and a useless
warning. Nobody scrolls to it. What you want is a line on a dashboard that says
*Elevator has never been homed*, in a colour, next to the other things that are
wrong.

WPILib has exactly that.

---

## 3. `Alert`

An `Alert` is a message that is either currently true or currently false. You make
one, and you tell it which it is.

*Nothing to add yet — this is just the shape:*

```java
Alert lowBattery = new Alert("Battery is low", AlertType.kWarning);
lowBattery.set(true);   // now showing
lowBattery.set(false);  // gone again
```

Three types, and the difference is what a human should do about it:

- **`kError`** — this robot is broken. A motor didn't answer. Do not queue.
- **`kWarning`** — this robot works, but something is off. Fix it if there's time.
- **`kInfo`** — worth knowing. Not a problem.

Alerts publish to `/SmartDashboard/Alerts/`, as three string arrays named
`errors`, `warnings` and `infos`. AdvantageScope, Elastic and Shuffleboard all
know how to render that, so you get a list on screen without wiring anything up.

**The important habit is in that second line.** `set` takes a boolean, and you
call it *every tick* with the current answer — you don't "raise" an alert when
something breaks. An alert describes how things are right now, which means it has
to be able to go away by itself when somebody plugs the cable back in.

---

## 4. "Is this device there?" is a sensor reading

Start with the most valuable alert on any robot: a motor that never showed up.

Phoenix will tell you — `TalonFX.isConnected()` is true when the device has been
answering recently. The question is where to ask it.

It goes in the **inputs**. It's a fact read off the hardware once per tick, which
is the definition the IO layer has used since Lesson 13, and putting it there
means a replay knows the device was missing. Debugging a log where the flywheel
did nothing is a great deal easier when the log says the flywheel wasn't plugged
in.

**Add to `ElevatorIO.ElevatorIOInputs` and `FlywheelIO.FlywheelIOInputs`:**

```java
        public boolean motorConnected = false;
```

**Add to `ArmIO.ArmIOInputs`, above `hasGamePiece` — two motors, two answers:**

```java
        public boolean pivotConnected = false;
        public boolean rollerConnected = false;
```

**Add to `VisionIO.VisionIOInputs`:**

```java
        public boolean cameraConnected = false;
```

**Read them, in `ElevatorIOTalonFX` and `FlywheelIOTalonFX`:**

```java
        inputs.motorConnected = m_motor.isConnected();
```

**In `ArmIOTalonFX`:**

```java
        inputs.pivotConnected = m_pivot.isConnected();
        inputs.rollerConnected = m_roller.isConnected();
```

**And in `VisionIOPhotonVision`, below the observations line:**

```java
        inputs.cameraConnected = m_camera.isConnected();
```

> **In simulation, motors report connected within about a quarter-second of
> startup and stay that way.** There's no CAN bus and nothing to unplug, so you
> can't make this alert fire for a motor at a laptop. That's honest rather than
> useless: the check costs one line and it's the one that saves you at an event.
> Cameras *are* testable in sim — see section 7.

---

## 5. Alerts that belong to a subsystem

Each subsystem knows what's wrong with itself, so each one owns its own alerts.

**Add to `Elevator`, below `m_homed`:**

```java
    // Two things worth saying out loud in the pit, and they are different kinds
    // of bad: a missing motor means the robot cannot work, an unhomed elevator
    // means it will work wrongly.
    private final Alert m_disconnected =
            new Alert("Elevator motor is not on the CAN bus", AlertType.kError);
    private final Alert m_notHomed =
            new Alert("Elevator has never been homed", AlertType.kWarning);
```

**Add to `Elevator.periodic()`, below the `Homed` log line:**

```java
        // Alerts are set every tick, not raised once: an alert is a statement
        // about how things are now, so it has to be able to go away again.
        m_disconnected.set(!m_inputs.motorConnected);
        m_notHomed.set(!m_homed);
```

That pair is the whole lesson in miniature. **A missing motor is an error** — the
robot cannot do its job, and nobody should let it onto the field. **An unhomed
elevator is a warning** — everything works, and it will work *wrongly*, moving to
heights measured from a zero that means nothing. Lesson 21 built the machinery to
detect that and Lesson 24 made it structural; this is the part that tells a human.

**Add to `Arm`, below `m_goal`:**

```java
    private final Alert m_disconnected =
            new Alert("Arm motor is not on the CAN bus", AlertType.kError);
```

**And in `Arm.periodic()`, below the `AtGoal` log line:**

```java
        // Either motor missing is the same problem from the pit's point of view.
        m_disconnected.set(!m_inputs.pivotConnected || !m_inputs.rollerConnected);
```

**Add to `Flywheel`, below `m_goal`:**

```java
    private final Alert m_disconnected =
            new Alert("Flywheel motor is not on the CAN bus", AlertType.kError);
```

**And in `Flywheel.periodic()`, below the `AtSpeed` log line:**

```java
        m_disconnected.set(!m_inputs.motorConnected);
```

**Add the imports to all three:**

```java
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
```

The cameras get one too, and theirs needs a detail the others didn't.

**Add to `PhotonVisionPoseProvider`, replacing the field block and constructor:**

```java
    private final String m_logKey;
    private final Alert m_disconnected;

    public PhotonVisionPoseProvider(VisionIO io, String logKey) {
        m_io = io;
        m_logKey = logKey;
        // The name goes in the message: "a camera is missing" is not actionable
        // when the robot has two of them.
        m_disconnected = new Alert(logKey + " camera is not connected", AlertType.kError);
    }
```

**And in `updatePoseEstimate`, below `Logger.processInputs`:**

```java
        m_disconnected.set(!m_inputs.cameraConnected);
```

**Add the same two imports.**

There are two cameras, so the message has to say *which*. An alert that doesn't
tell you where to go is barely better than no alert — the whole point is that
somebody reads it and immediately knows what to pick up.

---

## 6. The alert nothing owns

One more, and it belongs to no subsystem at all.

The battery is the robot's, not the elevator's — the same argument Lesson 30 made
about the current total. So it goes where the robot lives.

**Add to `Constants.PowerConstants`, below `kBrownoutVoltage`:**

```java
    /**
     * Worth complaining about before a match. Well above the brownout threshold —
     * the point of an alert is to be early, not accurate.
     */
    public static final Voltage kLowBatteryVoltage = Volts.of(11.5);
```

**Add to `Robot`, below `m_robotContainer`:**

```java
  /** Not an error — the robot works fine on a low battery, right up until it doesn't. */
  private final Alert m_lowBattery =
      new Alert("Battery is low — swap it before the next match", AlertType.kWarning);
```

**Add to `Robot.robotPeriodic()`:**

```java
    // This one belongs to the robot rather than to any subsystem, for the same
    // reason Lesson 30's current total did: nothing smaller knows about it.
    m_lowBattery.set(RobotController.getBatteryVoltage()
        < PowerConstants.kLowBatteryVoltage.in(Volts));
```

**Add the imports:**

```java
import static edu.wpi.first.units.Units.Volts;
import edu.wpi.first.wpilibj.Alert;
import edu.wpi.first.wpilibj.Alert.AlertType;
import frc.robot.Constants.PowerConstants;
```

11.5 V is deliberately generous. The roboRIO doesn't give up until 6.3 V, and by
the time you're near that it's far too late to do anything about it. **An alert
that fires when the problem is already happening has missed its job** — the useful
threshold is the one that gives you time to fetch a charged battery, not the one
that's technically correct.

---

## 7. Run it

```powershell
./gradlew simulateJava
```

Look at the Alerts widget — AdvantageScope has one, or read
`/SmartDashboard/Alerts/warnings` directly.

**Straight away you should see one warning:** *Elevator has never been homed*.
That's correct. Press Back to home it and watch the warning disappear on its own,
without anything explicitly clearing it — because `set(false)` runs every tick
once `m_homed` is true.

Now make one appear on purpose. The motors won't cooperate in simulation, but the
cameras will.

*Nothing to add — an experiment to run and undo:*

```java
    public static final String kFrontCameraName = "NotPluggedIn";
```

Restart the sim and you'll get *Localizer/NotPluggedIn camera is not connected* in
the errors list, in red, because nothing is publishing under that name. Put the
name back and it clears.

Two more things worth doing:

- **Drop the battery.** In SimGUI's Other Devices panel, drag the RoboRIO's input
  voltage down below 11.5 and watch the battery warning appear. That's the same
  rail Lesson 30's model drives, so a genuinely heavy moment will trip it too.
- **Watch the very first quarter-second after startup.** A simulated TalonFX reads
  *disconnected* for roughly the first 240 ms, then connects — so every motor
  alert flashes on and clears itself before you've finished reading it. That's not
  a bug in your code and it's not a bug in the sim: devices genuinely take a moment
  to come up on a real CAN bus too. It's also the clearest possible demonstration
  of why alerts are set every tick rather than raised once.

---

## Try it

1. **Pick the battery threshold from real data.** Lesson 30 gave you a battery
   model and a current total. Drive the robot hard, watch how far the rail sags
   under a normal cycle, and choose a threshold that doesn't cry wolf every time
   the elevator moves. Defend your number.
2. **Argue about error versus warning.** Is an unhomed elevator really only a
   warning? Is a missing back camera an error when the front one works? Go through
   all six alerts and decide, then write one sentence per alert saying what a
   human should *do* about it. If you can't write that sentence, the alert
   probably shouldn't exist.
3. **Alert on something that has never been true.** The flywheel has a tolerance
   and Lesson 29 logged `AtSpeed`. If it has never once reached speed since boot,
   something is wrong — a jammed wheel, a bad gain, a dead motor that still
   answers on CAN. Detect it and say so.
4. **Make an alert that would have saved you earlier.** Look back through this
   course for a failure you had to diagnose by reading code — a wrong tag ID from
   Lesson 28, a class ID mismatch from Lesson 27. Add the alert that would have
   just told you.
5. **Count your alerts.** If a robot boots with nine warnings showing, nobody
   reads any of them. Decide how many is too many, and what you'd cut first.

---

## What you learned

The robot can now answer "is this thing going to work?" without a laptop.

**Recording and reporting are different jobs.** Thirty lessons of logging built a
complete record of everything the robot does, and none of it helps the person
standing next to it with two minutes on the clock. Alerts are the other half:
short, current, and in front of someone. Most of the information was already
there — what was missing was somewhere to say it.

**"Is it plugged in?" is a sensor reading.** Connection state went into the
`@AutoLog` inputs alongside positions and currents, for exactly the same reason
everything else did: it's read off hardware, it changes, and a replay is far more
useful when the log knows the device was missing.

**An alert is a statement, not an event.** Setting it every tick with the current
answer — rather than raising it when something breaks — is what lets it clear
itself when the problem goes away. It's a small API detail that reflects a real
distinction, and the 240 ms of startup flicker is the proof.

And the one that matters most in practice: **an alert has to arrive early enough
to act on.** The brownout threshold is 6.3 V and the useful warning is at 11.5,
because the point isn't to be right, it's to be in time. The same test applies to
every alert you'll ever add — if a human can't do something about it in the window
you've given them, you've built a log entry with a colour.

That's the robot able to tell you it's unwell. Go and break something on purpose,
and enjoy being told about it for once.
