# Lesson 31 — The robot tells you what's wrong

**Goal:** Make the robot run its own pre-match checklist and say what it
finds, somewhere a human will actually look.

**New Java concepts**
- None.

**New robot concepts**
- **`Alert`** and `Alert.Level`, and where they surface
- **Logging a problem and reporting one are different jobs** — you've
  logged everything since Lesson 3, and nobody reads a log in the queue
  line
- **"Is this device there?" is a sensor reading**, so it belongs in the
  inputs
- Choosing what's worth alerting on, and what's an error versus a warning

---

## 1. Five minutes before a match

You're in the queue line. The robot is on its cart, powered on. You have
about five minutes, no laptop connection worth trusting, and one
question: **is this thing going to work?**

Everything you'd want to know, the robot already knows.

It knows whether every motor answered on the CAN bus. It knows whether
the elevator has ever been homed, because Lesson 21 recorded that. It
knows what the battery is doing, because Lesson 30 measured it. It knows
whether the cameras are alive. Every one of those facts is sitting in a
variable right now.

And every one of them is invisible, because the only place any of it goes
is a log file that gets opened after the match, by which point the
interesting question has already been answered the hard way.

---

## 2. Logging it and saying it are different jobs

This is worth being precise about, because the course has spent thirty
lessons building the first one and it is genuinely not the second.

**A log is a record.** It's complete, it's timestamped, it's for later,
and it answers "what happened?" — usually while sitting down, after
something went wrong. Everything in this course logs, and that has been
the right call every time.

**An alert is a statement about now.** It's short, it's for a human
standing next to the robot with thirty seconds to spare, and it answers
"should I be worried?"

A log entry saying `Elevator/Homed = false` is a perfect record and a
useless warning. Nobody scrolls to it. What you want is a line that says
*Elevator has never been homed*, next to the other things that are wrong,
in front of someone who can still do something about it.

WPILib has exactly that.

---

## 3. `Alert`

An `Alert` is a message that is either currently true or currently false.
You make one, and you tell it which it is.

*Nothing to add yet — this is just the shape:*

```java
Alert lowBattery = new Alert("Battery is low", Alert.Level.MEDIUM);
lowBattery.set(true);   // now showing
lowBattery.set(false);  // gone again
```

Three levels, and the difference is what a human should do about it:

- **`HIGH`** — this robot is broken. A motor didn't answer. Do not queue.
- **`MEDIUM`** — this robot works, but something is off. Fix it if
  there's time.
- **`LOW`** — worth knowing. Not a problem.

**The important habit is in that second line.** `set` takes a boolean,
and you call it *every tick* with the current answer — you don't "raise"
an alert when something breaks. An alert describes how things are right
now, which means it has to be able to go away by itself when somebody
plugs the cable back in.

> This is the exact API `OpModeRobot` already uses on itself: its own
> loop-overrun warning is `new Alert("Loop time of \"" + period + "\"s
> overrun", Alert.Level.MEDIUM)`. You're not reaching for a course
> invention — this is the framework's own mechanism, the same one it
> trusts for its own diagnostics.

**Where this shows up is worth being honest about, because it's not
where the old WPILib course expected.** In earlier WPILib versions,
`Alert` published to NetworkTables under `/SmartDashboard/Alerts/`, which
is what let AdvantageScope, Elastic, and Shuffleboard render a list with
no wiring at all. This alpha's `Alert` doesn't do that — confirmed by
watching NetworkTables directly after calling `set(true)` on one: nothing
appears, anywhere. Instead it routes through the HAL to the **new 2027
Driver Station application**, which is a real, documented feature of that
app, not a gap — WPILib's own compatibility notes say plainly that
*"newer Driver Station features (for example, OpMode selection and
Alerts) are only available in the 2027 Driver Station."* Alerts moved
from being a dashboard trick to being a native part of the driver
station, which is arguably a better home for "should I be worried right
now" than a NetworkTables array ever was.

This course's `simulateJava` workflow doesn't run that new application,
though, and SimGUI's own Alerts window is still wired to the *old*
NetworkTables-backed mechanism — so it won't show anything either, for
now. Section 7 shows how this course checks alert state anyway.

---

## 4. "Is this device there?" is a sensor reading

Start with the most valuable alert on any robot: a motor that never
showed up.

Phoenix will tell you — `TalonFX.isConnected()` is true when the device
has been answering recently. The question is where to ask it.

It goes in the **inputs**. It's a fact read off the hardware once per
tick, which is the definition the IO layer has used since Lesson 13, and
putting it there means a replay knows the device was missing. Debugging a
log where the flywheel did nothing is a great deal easier when the log
says the flywheel wasn't plugged in.

**Add to `ElevatorIO.ElevatorIOInputs` and `FlywheelIO.FlywheelIOInputs`, below `atBottomLimit`/`supplyCurrentAmps`:**

```java
    public boolean motorConnected = false;
```

**Add to `ArmIO.ArmIOInputs`, below `rollerSupplyCurrentAmps` — two motors, two answers:**

```java
    public boolean pivotConnected = false;
    public boolean rollerConnected = false;
```

**Add to `VisionIO.VisionIOInputs`:**

```java
    public boolean cameraConnected = false;
```

**Read them, in `ElevatorIOTalonFX` and `FlywheelIOTalonFX`, below the supply-current line:**

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

> **Measured, not assumed: a fresh TalonFX reads disconnected for about a
> third of a second after construction, then connects and stays that
> way.** There's no real CAN bus in simulation and nothing to unplug, so
> you can't make this alert fire for a motor at a laptop — that startup
> flicker is the only version of "disconnected" sim can show you. That's
> honest rather than useless: the check costs one line, and it's the one
> that saves you at an event.

---

## 5. Alerts that belong to a subsystem

Each subsystem knows what's wrong with itself, so each one owns its own
alerts.

**Add to `Elevator`, below `m_homed`:**

```java
  // Two things worth saying out loud in the pit, and they are different
  // kinds of bad: a missing motor means the robot cannot work, an
  // unhomed elevator means it will work wrongly.
  private final Alert m_disconnected =
      new Alert("Elevator motor is not on the CAN bus", Level.HIGH);
  private final Alert m_notHomed =
      new Alert("Elevator has never been homed", Level.MEDIUM);
```

**Add to `Elevator.periodic()`, below the `Homed` log line:**

```java
    // Alerts are set every tick, not raised once: an alert is a statement
    // about how things are now, so it has to be able to go away again.
    m_disconnected.set(!m_inputs.motorConnected);
    m_notHomed.set(!m_homed);
```

That pair is the whole lesson in miniature. **A missing motor is
`HIGH`** — the robot cannot do its job, and nobody should let it onto the
field. **An unhomed elevator is `MEDIUM`** — everything works, and it
will work *wrongly*, moving to heights measured from a zero that means
nothing. Lesson 21 built the machinery to detect that and Lesson 24 made
it structural; this is the part that tells a human.

**Add to `Arm`, below `m_goal`:**

```java
  private final Alert m_disconnected =
      new Alert("Arm motor is not on the CAN bus", Level.HIGH);
```

**And in `Arm.periodic()`, below the `AtGoal` log line:**

```java
    // Either motor missing is the same problem from the pit's point of view.
    m_disconnected.set(!m_inputs.pivotConnected || !m_inputs.rollerConnected);
```

**Add to `Flywheel`, below `m_goal`:**

```java
  private final Alert m_disconnected =
      new Alert("Flywheel motor is not on the CAN bus", Level.HIGH);
```

**And in `Flywheel.periodic()`, below the `AtSpeed` log line:**

```java
    m_disconnected.set(!m_inputs.motorConnected);
```

**Add the imports to all three:**

```java
import org.wpilib.driverstation.Alert;
import org.wpilib.driverstation.Alert.Level;
```

The cameras get one too, and theirs needs a detail the others didn't.

**Replace `PhotonVisionPoseProvider`'s field block and constructor:**

```java
  private final StructArrayPublisher<Pose3d> m_observationsPublisher;
  private final Alert m_disconnected;

  public PhotonVisionPoseProvider(VisionIO io, String logKey) {
    m_io = io;
    m_observationsPublisher = NetworkTableInstance.getDefault()
        .getStructArrayTopic(logKey + "/PoseObservations", Pose3d.struct)
        .publish();
    // The name goes in the message: "a camera is missing" is not
    // actionable when the robot has two of them.
    m_disconnected = new Alert(logKey + " camera is not connected", Level.HIGH);
  }
```

**And in `updatePoseEstimate`, below `m_observationsPublisher.set(poses)`:**

```java
    m_disconnected.set(!m_inputs.cameraConnected);
```

**Add the same two imports.**

There are two cameras, so the message has to say *which*. An alert that
doesn't tell you where to go is barely better than no alert — the whole
point is that somebody reads it and immediately knows what to pick up.

---

## 6. The alert nothing owns

One more, and it belongs to no subsystem at all.

The battery is the robot's, not the elevator's — the same argument
Lesson 30 made about the current total. So it goes where the robot lives.

**Add to `Constants.PowerConstants`, below `kBrownoutVoltage`:**

```java
    /**
     * Worth complaining about before a match. Well above the brownout threshold —
     * the point of an alert is to be early, not accurate.
     */
    public static final Voltage kLowBatteryVoltage = Volts.of(11.5);
```

**Add to `Robot`, below the `flywheel` field:**

```java
  /** Not an error — the robot works fine on a low battery, right up until it doesn't. */
  private final Alert m_lowBattery =
      new Alert("Battery is low — swap it before the next match", Level.MEDIUM);
```

**Add to `Robot.robotPeriodic()`, below the `Power/BrownedOut` line:**

```java
    // This one belongs to the robot rather than to any subsystem, for the
    // same reason Lesson 30's current total did: nothing smaller knows
    // about it.
    m_lowBattery.set(batteryVolts < PowerConstants.kLowBatteryVoltage.in(Volts));
```

**Add the imports:**

```java
import org.wpilib.driverstation.Alert;
import org.wpilib.driverstation.Alert.Level;
```

11.5 V is deliberately generous. The rail doesn't sag to real trouble
until well below that (Lesson 30 measured brownouts happening in the
5–6 V range under load), and by the time you're anywhere near that it's
far too late to do anything about it. **An alert that fires when the
problem is already happening has missed its job** — the useful threshold
is the one that gives you time to fetch a charged battery, not the one
that's technically correct.

---

## 7. Run it

**Run it:**

```powershell
./gradlew simulateJava
```

Section 3 already told you why looking at a dashboard widget won't work
yet on this alpha: nothing publishes to NetworkTables anymore, and
SimGUI's own Alerts window still expects the old NT-backed mechanism.
What *does* work, right now, is `AlertSim` — the same simulation-only
inspection surface this course has used since Lesson 29 for `FlywheelSim`
and Lesson 30 for `RoboRioSim`, just for alerts instead of physics.

**Add to `Robot.robotPeriodic()`, temporarily, to watch alert state as you go:**

```java
    for (var alert : org.wpilib.simulation.AlertSim.getActive()) {
      System.out.println("[" + alert.level + "] " + alert.text);
    }
```

**Straight away you should see one line:** `[MEDIUM] Elevator has never
been homed`. That's correct. Press Back to home it and watch the line
disappear on its own within a tick or two, without anything explicitly
clearing it — because `set(false)` runs every tick once `m_homed` is
true.

**Watch the very first tick after startup, too.** Building the whole
robot — twelve motors, two cameras, every subsystem — takes real
wall-clock time, and a motor genuinely reads disconnected for a moment
before it does. Measured directly: `[HIGH] Arm motor is not on the CAN
bus` and `[HIGH] Flywheel motor is not on the CAN bus` on tick zero,
gone by tick one. That's not a bug in your code and it's not a bug in the
sim: devices genuinely take a moment to come up on a real CAN bus too.
It's also the clearest possible demonstration of why alerts are set
every tick rather than raised once — a `set` that only fired on a
`true`→`false` edge would have latched that flicker on forever.

Now make one appear on purpose, for real this time:

**Drop the battery.** In SimGUI's Other Devices panel, drag the RoboRIO's
input voltage down below 11.5 and watch `[MEDIUM] Battery is low — swap
it before the next match` appear in the console. That's the same rail
Lesson 30's model drives, so a genuinely heavy moment will trip it too.

> **One demo from the old course doesn't reproduce here, and it's worth
> knowing why rather than just being told it doesn't work.** Renaming
> `kFrontCameraName` to something nothing is publishing under, the way
> the old lesson has you break a camera on purpose, does nothing in this
> port — verified directly, not assumed. `VisionIOPhotonVisionSim` builds
> its simulated camera from the *same* `PhotonCamera` object it reads
> from, so the name the code listens on and the name the simulated
> coprocessor publishes under always move together; there's no way to
> desync them with a single constant. On a real robot this isn't true —
> the constant only controls what *your* code listens for, while an
> actual coprocessor decides what it publishes under from its own
> configuration — so the alert is still correct and worth having. It just
> can't be demonstrated by renaming a constant in *this* simulated setup.
> Try It #3 picks this back up.

Once you've confirmed it all works, take the temporary `AlertSim` loop
back out — it did its job, and a real match won't need a console open.

---

## Try it

1. **Pick the battery threshold from real data.** Lesson 30 gave you a
   battery model and a current total. Drive the robot hard, watch how far
   the rail sags under a normal cycle, and choose a threshold that
   doesn't cry wolf every time the elevator moves. Defend your number.
2. **Argue about `HIGH` versus `MEDIUM`.** Is an unhomed elevator really
   only a `MEDIUM`? Is a missing back camera a `HIGH` when the front one
   works? Go through all six alerts and decide, then write one sentence
   per alert saying what a human should *do* about it. If you can't write
   that sentence, the alert probably shouldn't exist.
3. **Make the camera-disconnect alert demonstrable.** Section 7 explained
   why renaming `kFrontCameraName` doesn't work in this port's simulated
   setup — the reading name and the publishing name are the same object.
   Find a way to actually desync them (a second, independently-named
   `PhotonCamera` reading a table nothing publishes to is one option) and
   confirm the alert fires the way it would for a genuinely dead
   coprocessor.
4. **Alert on something that has never been true.** The flywheel has a
   tolerance and Lesson 29 logged `AtSpeed`. If it has never once reached
   speed since boot, something is wrong — a jammed wheel, a bad gain, a
   dead motor that still answers on CAN. Detect it and say so.
5. **Make an alert that would have saved you earlier.** Look back through
   this course for a failure you had to diagnose by reading code — a
   wrong tag ID from Lesson 28, a class ID mismatch from Lesson 27. Add
   the alert that would have just told you.
6. **Count your alerts.** If a robot boots with nine warnings showing,
   nobody reads any of them. Decide how many is too many, and what you'd
   cut first.

---

## What you learned

The robot can now answer "is this thing going to work?" without a
laptop — or, on this alpha, without anything except the driver station
software itself, which is arguably the point sharpened rather than
blunted.

**Recording and reporting are different jobs.** Thirty lessons of logging
built a complete record of everything the robot does, and none of it
helps the person standing next to it with two minutes on the clock.
Alerts are the other half: short, current, and in front of someone. Most
of the information was already there — what was missing was somewhere to
say it.

**"Is it plugged in?" is a sensor reading.** Connection state went into
the IO inputs alongside positions and currents, for exactly the same
reason everything else did: it's read off hardware, it changes, and a
replay is far more useful when the log knows the device was missing.

**An alert is a statement, not an event.** Setting it every tick with the
current answer — rather than raising it when something breaks — is what
lets it clear itself when the problem goes away. It's a small API detail
that reflects a real distinction, and the startup flicker on tick zero is
the proof: a `set` that only fired once would have latched that flicker
on forever.

**And a genuinely new one for this platform: where an alert surfaces
isn't fixed, and it just moved.** This alpha pulled `Alert` out of
NetworkTables entirely and gave it to the new Driver Station app
directly — a real architecture change, not a bug, confirmed against
WPILib's own compatibility notes. The lesson underneath didn't change at
all: decide what's worth saying, decide how urgently, and say it exactly
once per tick. Whatever displays it next season is somebody else's
problem to solve correctly, which is what a clean API boundary is for.

And the one that matters most in practice: **an alert has to arrive
early enough to act on.** The brownout threshold is 6.3 V and the useful
warning is at 11.5, because the point isn't to be right, it's to be in
time. The same test applies to every alert you'll ever add — if a human
can't do something about it in the window you've given them, you've
built a log entry with a colour.

That's the robot able to tell you it's unwell. Go and break something on
purpose, and enjoy being told about it for once.

Alerts tell you when something is wrong *now*. There's a third question
neither they nor the logs answer: is the thing that worked last Tuesday
still working? The next lesson gets a machine to check.
