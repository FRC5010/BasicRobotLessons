# Lesson 30 — The robot tells you what's wrong

**Goal:** Make the robot run its own pre-match checklist and say what it
finds, somewhere a human will actually look. Then pull a few plugs in
simulation to prove it works.

**New Java concepts**
- None.

**New robot concepts**
- **`Alert`** and `Alert.Level`, and where alerts show up
- **Logging a problem and reporting one are different jobs.** You've logged
  everything since Lesson 3, and nobody reads a log in the queue line.
- **"Is this device there?" is a sensor reading**, so it belongs in the
  inputs
- **A simulated fault**: a switch in SimGUI that a simulated device checks
- Choosing what's worth alerting on, and what's an error versus a warning

---

## 1. Five minutes before a match

You're in the queue line. The robot is on its cart, powered on. You have
about five minutes, no laptop connection worth trusting, and one question:
**is this thing going to work?**

Everything you'd want to know, the robot already knows.

It knows whether every motor answered on the CAN bus. It knows whether the
elevator has ever been homed, because Lesson 23 started recording that. It
knows what the battery is doing, because Lesson 29 measured it. It knows
whether the cameras are sending pictures. Every one of those facts is
sitting in a variable right now.

And every one of them is invisible, because the only place any of it goes
is a log file that gets opened after the match. By then the interesting
question has already been answered the hard way.

---

## 2. Logging it and saying it are different jobs

This is worth being precise about, because the course has spent thirty
lessons building the first one, and it is genuinely not the second.

**A log is a record.** It's complete, it's timestamped, it's for later,
and it answers "what happened?", usually while sitting down after
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
You make one, and every tick you tell it which.

*Nothing to add yet — this is just the shape:*

```java
Alert lowBattery = new Alert("Power/LowBattery", "Battery is low", Alert.Level.MEDIUM);
lowBattery.set(true);   // now showing
lowBattery.set(false);  // gone again
```

The first string is an **id**, and all it has to be is unique: build a
second alert with the same id and level and the constructor throws
`AlertException: Alert already allocated`. You already have a scheme for
unique names, though. Every log key in this robot is one, so every id in
this lesson borrows a log key's shape: the subsystem, a slash, what's
wrong. The second string is the text a human reads.

Three levels, and the difference is what a human should do about it:

- **`HIGH`**: this robot is broken. A motor didn't answer. Do not queue.
- **`MEDIUM`**: this robot works, but something is off. Fix it if there's
  time.
- **`LOW`**: worth knowing. Not a problem.

**The important habit is in those last two lines.** `set` takes a boolean,
and you call it *every tick* with the current answer. You don't "raise"
an alert when something breaks. An alert describes how things are right
now, which means it has to be able to go away by itself when somebody
plugs the cable back in.

`OpModeRobot` itself has an alert, and it shows what happens when you don't
do that. Its loop-overrun warning, `Loop time of "0.02"s overrun`, is set to
true whenever a loop runs long, and nothing ever sets it back. The first
loop after boot has run long every time we've measured it, while
everything warms up: in one run its `robotPeriodic()` alone took almost
half a second, against a 0.02 s budget. So that warning is up from the
first moment and stays up for the rest of the session. It means "this has happened since boot", which
is a different kind of statement. Every alert you write in this lesson means
"this is true right now".

**Where alerts show up is new.** On a real robot they go to the **2027
Driver Station** app. WPILib's
[Systemcore testing notes](https://github.com/wpilibsuite/SystemcoreTesting#readme)
list Alerts among the features that are *"only available in the 2027 Driver
Station"*. They used to be a dashboard trick riding on NetworkTables. Now
they're part of the driver station itself, which is a better home for
"should I be worried right now".

SimGUI can't show them yet, though. On this version of WPILib, alerts
are kept inside the robot program, and SimGUI has no way to read them.
So before writing a single alert of your own, give yourself somewhere to
see them.

---

## 4. Somewhere to see them

WPILib's simulation tools include **`AlertSim`**, which can list every
alert that's currently active. SimGUI can't read alerts, but it can draw an
**alerts panel**, the red-and-yellow list a dashboard shows. It draws one
from a table of three lists of text: `errors`, `warnings` and `infos`. So
every tick, in simulation only, copy one into the other.

**Add to `Robot`, below `simulationPeriodic()`:**

```java
  /**
   * Sim only. On a real robot the Driver Station shows alerts, but SimGUI
   * can't read them on this WPILib. It can draw an alerts panel from a table
   * holding three lists, though, so fill one in from what the simulator knows.
   */
  private void showAlerts() {
    List<String> errors = new ArrayList<>();
    List<String> warnings = new ArrayList<>();
    List<String> infos = new ArrayList<>();
    for (AlertSim.AlertInfo alert : AlertSim.getActive()) {
      switch (alert.level) {
        case HIGH -> errors.add(alert.text);
        case MEDIUM -> warnings.add(alert.text);
        case LOW -> infos.add(alert.text);
      }
    }
    TelemetryTable panel = Telemetry.getTable("Alerts");
    panel.setType("Alerts"); // what tells SimGUI to draw this table as a panel
    panel.log("errors", errors.toArray(new String[0]));
    panel.log("warnings", warnings.toArray(new String[0]));
    panel.log("infos", infos.toArray(new String[0]));
  }
```

**And call it at the end of `simulationPeriodic()`, below the battery line:**

```java
  @Override
  public void simulationPeriodic() {
    // ...
    RoboRioSim.setVInVoltage(BatterySim.calculateDefaultBatteryLoadedVoltage(getTotalCurrentAmps()));
    showAlerts();
  }
```

**Add the imports:**

```java
import java.util.ArrayList;
import java.util.List;

import org.wpilib.simulation.AlertSim;
import org.wpilib.telemetry.TelemetryTable;
```

The `switch` is the arrow-style one you've used since Lesson 13 to pick an
IO, used here to do something instead of to produce a value.
`toArray(new String[0])` turns each list into the plain array
`TelemetryTable.log` takes. `setType` is the line that matters most: a
table that announces a type is what SimGUI lists under its NetworkTables
menu. That's how Lesson 11's field and Lesson 19's mechanism drawing got
there, and `"Alerts"` is one more type it knows how to draw.

It lives in `simulationPeriodic()` for the same reason Lesson 29's battery
model does: it isn't any subsystem's job. When SimGUI learns to read alerts
on its own, delete it.

**Run it:**

```powershell
./gradlew run
```

In SimGUI, open **NetworkTables → Telemetry → Alerts**. One line is
already there: the framework's own `Loop time of "0.02"s overrun`, with a
yellow warning sign. Everything else in this lesson lands in that same
panel.

---

## 5. "Is this device there?" is a sensor reading

Start with the most valuable alert on any robot: a motor that never showed
up.

Phoenix will tell you. `isConnected()` is true when the device has been
answering on the CAN bus recently. The question is where to ask it.

It goes in the **inputs**. It's a fact read off the hardware once per tick,
which is the definition the IO layer has used since Lesson 13. Putting it
there also means the log knows the device was missing. Debugging a log
where the flywheel did nothing is a great deal easier when the log says the
flywheel wasn't plugged in.

**Add to `ElevatorIO.ElevatorIOInputs`, below `atBottomLimit`, and to `FlywheelIO.FlywheelIOInputs`, below `supplyCurrentAmps`:**

```java
    public boolean motorConnected = false;
```

**Add to `ArmIO.ArmIOInputs`, below `rollerSupplyCurrentAmps` — two motors, two answers:**

```java
    public boolean pivotConnected = false;
    public boolean rollerConnected = false;
```

Each one starts `false`. A device you haven't heard from yet isn't
connected, as far as anyone can prove.

**Read it in `ElevatorIOTalonFX.updateInputs`, below the bottom-limit line:**

```java
    inputs.atBottomLimit = m_bottomLimit.get();
    // Has the motor answered on the CAN bus lately? A reading, like the rest.
    inputs.motorConnected = m_motor.isConnected();
```

**In `FlywheelIOTalonFX.updateInputs`, below the supply-current line:**

```java
    inputs.motorConnected = m_motor.isConnected();
```

**And in `ArmIOTalonFX.updateInputs`, below the roller's supply-current line:**

```java
    inputs.pivotConnected = m_pivot.isConnected();
    inputs.rollerConnected = m_roller.isConnected();
```

---

## 6. Alerts that belong to a subsystem

Each subsystem knows what's wrong with itself, so each one owns its own
alerts.

**Add to `Elevator`, below `m_homed`:**

```java
  // Two things worth saying out loud in the pit, and they are different
  // kinds of bad: a missing motor means the robot cannot work, an unhomed
  // elevator means it will work wrongly. Each id only has to be unique, and
  // a log key is already unique, so they borrow its shape.
  private final Alert m_disconnected =
      new Alert("Elevator/Disconnected", "Elevator motor is not on the CAN bus", Level.HIGH);
  private final Alert m_notHomed =
      new Alert("Elevator/NotHomed", "Elevator has never been homed", Level.MEDIUM);
```

**Add to `Elevator.periodic()`, below the `Homed` log line:**

```java
    Telemetry.log("Elevator/MotorConnected", m_inputs.motorConnected);

    // Set every tick, not raised once: an alert is a statement about how
    // things are now, so it has to be able to go away again.
    m_disconnected.set(!m_inputs.motorConnected);
    m_notHomed.set(!m_homed);
```

That pair is the whole lesson in miniature. **A missing motor is `HIGH`**:
the robot cannot do its job, and nobody should let it onto the field. **An
unhomed elevator is `MEDIUM`**: everything works, and it will work
*wrongly*, moving to heights measured from a zero that means nothing.
Lesson 21 built the machinery to fix that and Lesson 24 made it structural;
this is the part that tells a human.

**Add to `Arm`, below `m_goal`:**

```java
  private final Alert m_disconnected =
      new Alert("Arm/Disconnected", "Arm motor is not on the CAN bus", Level.HIGH);
```

**And to `Arm.periodic()`, below the `AtGoal` log line:**

```java
    Telemetry.log("Arm/PivotConnected", m_inputs.pivotConnected);
    Telemetry.log("Arm/RollerConnected", m_inputs.rollerConnected);

    // Either motor missing is the same problem from the pit's point of view.
    m_disconnected.set(!m_inputs.pivotConnected || !m_inputs.rollerConnected);
```

**Add to `Flywheel`, below `m_goal`:**

```java
  private final Alert m_disconnected =
      new Alert("Flywheel/Disconnected", "Flywheel motor is not on the CAN bus", Level.HIGH);
```

**And to `Flywheel.periodic()`, below the `AtSpeed` log line:**

```java
    Telemetry.log("Flywheel/MotorConnected", m_inputs.motorConnected);
    m_disconnected.set(!m_inputs.motorConnected);
```

**Add the imports to all three:**

```java
import org.wpilib.util.Alert;
import org.wpilib.util.Alert.Level;
```

**Run it again.** The panel now says `Elevator has never been homed`,
which is correct. Enable Teleoperated and press **Back** to home it, and
watch the line disappear on its own. Nothing clears it explicitly:
`set(false)` runs every tick once `m_homed` is true.

You may also catch a burst of red the moment the robot starts. On the very
first tick, measured, the elevator, arm and flywheel motors all read
disconnected, and a tick later they're fine. Those motors were built only a
moment before that first tick, and a device needs a moment to come up on a
CAN bus, real or simulated. It's the clearest proof there is of why alerts
are set every tick. An alert raised once on that first tick would never
have gone away, just like the framework's overrun warning.

---

## 7. The gyro, and a plug you can pull

The mechanisms aren't the only hardware this robot can lose. If the gyro
falls off the bus, field-relative driving and every pose estimate go with
it. It gets the same treatment as the motors.

**Add to `GyroIO.GyroIOInputs`, below `yawDegrees`:**

```java
    public boolean connected = false;
```

**Read it in `GyroIOPigeon2.updateInputs`, below the yaw line:**

```java
    inputs.connected = m_gyro.isConnected();
```

The `Drivetrain` owns the gyro's inputs, so it owns the alert.

**Add to `Drivetrain`, below `m_gyroInputs`:**

```java
  private final Alert m_gyroDisconnected =
      new Alert("Drivetrain/Gyro/Disconnected", "Gyro is not on the CAN bus", Level.HIGH);
```

**And to `Drivetrain.periodic()`, below the yaw log line:**

```java
    Telemetry.log("Drivetrain/Gyro/Connected", m_gyroInputs.connected);
    m_gyroDisconnected.set(!m_gyroInputs.connected);
```

**Add the same two imports to `Drivetrain`.**

Now look at `GyroIOSim`. It doesn't have a gyro. Since Lesson 16 it has
simply reported the simulated chassis's true heading, so there's no device
to ask whether it's connected. And `connected` starts `false`. Run the
robot now and the gyro alert is up, and it stays up.

So the simulated gyro needs an answer. "Always connected" would be honest,
but it would also mean you can never see this alert fire before the day it
fires for real. Better to give the simulation something a real gyro has: a
cable you can pull.

**Create `subsystems/UnplugSwitch.java`:**

```java
package first.robot.subsystems;

import org.wpilib.hardware.hal.SimBoolean;
import org.wpilib.hardware.hal.SimDevice;
import org.wpilib.hardware.hal.SimDevice.Direction;

/**
 * Sim only: a pretend cable, and a switch for pulling it. It shows up in
 * SimGUI's Other Devices window as "Unplug" plus the name you give it.
 * Pulling it changes exactly one thing: a sim IO that checks it reports its
 * device as not connected. Nothing else in the simulation notices.
 */
public class UnplugSwitch {
  private final SimBoolean m_unplugged;

  public UnplugSwitch(String deviceName) {
    // Null if a switch with this name already exists.
    SimDevice device = SimDevice.create("Unplug " + deviceName);
    // INPUT means the value comes from outside the robot code: from you, in
    // SimGUI, or from a test.
    m_unplugged = device != null
        ? device.createBoolean("Unplugged", Direction.INPUT, false)
        : null;
  }

  /** Has someone pulled this cable? */
  public boolean isUnplugged() {
    return m_unplugged != null && m_unplugged.get();
  }
}
```

A **`SimDevice`** is the simulator's way of letting code invent a device
that has no real hardware behind it. Phoenix uses the same mechanism for
its simulated motors, which is why SimGUI's **Other Devices** window has
been full of `Talon FX (v6)[1]` entries all along. Each device holds named
values. This one holds a single boolean, and because it's an `INPUT`,
SimGUI lets you change it.

**Add to `GyroIOSim`, below `m_chassisSim`:**

```java
  private final UnplugSwitch m_unplug = new UnplugSwitch("Gyro");
```

**And to `GyroIOSim.updateInputs`, below the yaw line:**

```java
    // There's no gyro here to ask, so the switch is the whole answer.
    inputs.connected = !m_unplug.isUnplugged();
```

**Run it.** The gyro alert is gone. In the **Other Devices** window,
scroll past Phoenix's motors to **Unplug Gyro** and expand it. Its
**Unplugged** value is a false/true drop-down. Set it to **true**, and
`Gyro is not on the CAN bus` appears in the alerts panel with a red mark.
Set it back to **false** and the alert goes away. Measured, both happen
within one tick.

> Notice what *didn't* happen: the robot still knows which way it's
> facing. The switch changes the gyro's answer to "are you there?" and
> nothing else. That's the point of it. You're testing the *alert*, which
> otherwise has no way to fire on a laptop. What the robot should *do*
> without a gyro is a separate question, and a much bigger one.

---

## 8. The CANcoders

Each swerve module has a CANcoder telling its steering motor where the
wheel points. Lose one and that wheel no longer knows where it's pointing.
Four of them, four alerts.

**Add to `ModuleIO.ModuleIOInputs`, below `driveVelocityMetersPerSec`:**

```java
    public boolean steerEncoderConnected = false;
```

**Read it at the end of `ModuleIOTalonFX.updateInputs`:**

```java
    inputs.steerEncoderConnected = m_steerEncoder.isConnected();
```

The modules aren't subsystems, but each `SwerveModule` owns its own inputs,
so each owns its own alert. There are four of them, so the alert has to say
*which*. "A CANcoder is missing" doesn't tell anyone which corner to go and
look at. The log key already names the module, so it goes in both the id and
the text.

**Add to `SwerveModule`, below `m_logKey`:**

```java
  private final Alert m_steerEncoderDisconnected;
```

**Build it at the end of the `SwerveModule` constructor:**

```java
    // Four modules, four alerts, so the log key goes in the message too:
    // "a CANcoder is missing" doesn't say which corner to go and look at.
    m_steerEncoderDisconnected = new Alert(logKey + "/SteerEncoderDisconnected",
        logKey + " CANcoder is not on the CAN bus", Level.HIGH);
```

The field is a blank `final`, built in the constructor rather than up
with the fields, because its text needs `logKey`, and only the constructor
is told that.

**And at the end of `SwerveModule.periodic()`:**

```java
    Telemetry.log(m_logKey + "/SteerEncoderConnected", m_inputs.steerEncoderConnected);
    m_steerEncoderDisconnected.set(!m_inputs.steerEncoderConnected);
```

**Add the two `Alert` imports to `SwerveModule`.**

Unlike the gyro, the simulated CANcoder is a real Phoenix sim device, and it
answers `isConnected()` like a real one. So its switch can only take a
"yes" away.

**Add to `ModuleIOSim`, below `m_steerEncoderSim`:**

```java
  private final UnplugSwitch m_unplug;
```

**Build it at the end of the `ModuleIOSim` constructor:**

```java
    // Named by CAN ID, because that's the only name this class is given.
    m_unplug = new UnplugSwitch("CANcoder " + cancoderId);
```

**And at the end of `ModuleIOSim.updateInputs`, below `super.updateInputs(inputs)`:**

```java
    // The simulated CANcoder answers like a real one. The switch can only
    // turn a yes into a no.
    inputs.steerEncoderConnected = inputs.steerEncoderConnected && !m_unplug.isUnplugged();
```

The order matters. `super.updateInputs` asks the simulated CANcoder first,
and only then does the switch get a say.

**Run it** and pull **Unplug CANcoder 9**. The panel says
`Drivetrain/Module0 CANcoder is not on the CAN bus`. The switch is named by
CAN ID and the alert by module, because each class names things by what it
was given. `DriveConstants` is where the two meet: 9 is the front-left
CANcoder, and front-left is module 0.

---

## 9. The cameras

The cameras get one too, and theirs is the one you'd most want in a queue
line. A camera that's lost its network cable looks completely normal from
the outside.

**Add to `VisionIO.VisionIOInputs`, below `poseObservations`:**

```java
    public boolean cameraConnected = false;
```

**Read it at the end of `VisionIOLimelight.updateInputs`, below the loop:**

```java
    // True while frames keep arriving. Seeing no tags still counts: an empty
    // frame is still a frame.
    inputs.cameraConnected = m_camera.isConnected();
```

A Limelight isn't on the CAN bus, so "connected" means something slightly
different. LimelightLib counts a camera as connected while its frames keep
arriving. One that has sent nothing yet, or has gone quiet for more than a
quarter of a second, doesn't count.

**Add to `LimelightPoseProvider`, below `m_logKey`:**

```java
  private final Alert m_disconnected;
```

**Build it at the end of the `LimelightPoseProvider` constructor:**

```java
    // Two cameras, so the message says which one.
    m_disconnected = new Alert(logKey + "/Disconnected", logKey + " camera is not connected", Level.HIGH);
```

**And in `updatePoseEstimate`, below the `PoseObservations` log line:**

```java
    Telemetry.log(m_logKey + "/Connected", m_inputs.cameraConnected);
    m_disconnected.set(!m_inputs.cameraConnected);
```

**Add the two `Alert` imports to `LimelightPoseProvider`.**

The simulated camera gets a switch the same way the CANcoder did.

**Add to `VisionIOLimelightSim`, below `m_publisher`:**

```java
  private final UnplugSwitch m_unplug;
```

**Build it at the end of the `VisionIOLimelightSim` constructor:**

```java
    m_unplug = new UnplugSwitch(cameraName);
```

**And at the end of `VisionIOLimelightSim.updateInputs`, below `super.updateInputs(inputs)`:**

```java
    // Frames keep coming either way. The switch only changes the answer.
    inputs.cameraConnected = inputs.cameraConnected && !m_unplug.isUnplugged();
```

**Run it** and pull **Unplug limelight-front**. The panel says
`Localizer/limelight-front camera is not connected`.

Two more things to notice. First, that burst of red at startup now
includes both cameras, because on the first tick no frame has arrived yet:
Lesson 15's simulated camera publishes each frame one loop after it
captures it. Second, with the front camera "unplugged", the
robot keeps using it. Measured with the robot parked 3 m in front of tag
20: the front camera delivered a pose on every single tick while its alert
said it wasn't connected. Same reason as the gyro. The switch tests the
alert, not the robot.

---

## 10. The alert nothing owns

One more, and it belongs to no subsystem at all.

The battery is the robot's, not the elevator's. That's the same argument
Lesson 29 made about the current total, so it goes where the robot lives.

**Add to `Constants.PowerConstants`, below `kBrownoutVoltage`:**

```java
    /**
     * Worth complaining about before a match. Well above the brownout line:
     * the point of an alert is to be early, not accurate.
     */
    public static final Voltage kLowBatteryVoltage = Volts.of(11.5);
```

**Add to `Robot`, below the `flywheel` field:**

```java
  /** Not an error: the robot works fine on a low battery, right up until it doesn't. */
  private final Alert m_lowBattery = new Alert(
      "Power/LowBattery", "Battery is low — swap it before the next match", Level.MEDIUM);
```

**Add to `Robot.robotPeriodic()`, below the `Power/BrownedOut` line:**

```java
    // The robot's, not any subsystem's: nothing smaller knows about it. Only
    // judged while disabled, because a battery under load always reads low;
    // what says it's flat is the voltage at rest.
    m_lowBattery.set(
        RobotState.isDisabled() && batteryVolts < PowerConstants.kLowBatteryVoltage.in(Volts));
```

**Add the imports:**

```java
import org.wpilib.driverstation.RobotState;
import org.wpilib.util.Alert;
import org.wpilib.util.Alert.Level;
```

The `RobotState.isDisabled()` half earns its place, and the numbers show
why. Measured without it, on a fresh simulated battery that rests at
12.0 V: enabling the robot set the alert off for about 0.7 s, because the
flywheel spinning up to idle sagged the rail to 11.5 V. Spinning it up to
shooting speed set it off for another 1.6 s, with the rail at 11.2 V. A
low-battery warning that flickers every time you press the trigger teaches
everyone to ignore it.

A sagging rail under load is Lesson 29's problem. *A flat battery* is this
alert's problem, and a battery's resting voltage is what tells you that.
The queue line is exactly where the robot sits disabled, so that's where
it's judged.

**An alert that fires when the problem is already happening has missed its
job.** 11.5 V is deliberately generous. The useful threshold is the one that
gives you time to fetch a charged battery, not the one that's technically
correct.

To watch it fire, bring back Lesson 29's tired battery: 11 V, with twice
the internal resistance.

*Nothing to add — an experiment to run and undo, in `Robot.simulationPeriodic()`:*

```java
    RoboRioSim.setVInVoltage(BatterySim.calculateLoadedBatteryVoltage(11.0, 0.04, getTotalCurrentAmps()));
```

The warning appears in the panel almost immediately, while the robot is
disabled. Enable it and the warning goes away, because under load the
reading is answering a different question. Disable it again and the warning
is back.

**Put the original battery line back when you're done.**

---

## Try it

1. **Give a motor a plug to pull.** The mechanism motors' alerts are the
   only ones you still can't fire on purpose. `FlywheelIOSim` extends
   `FlywheelIOTalonFX` just as `ModuleIOSim` extends `ModuleIOTalonFX`.
   Give it an `UnplugSwitch` and make `Flywheel motor is not on the CAN bus`
   appear from SimGUI.
2. **Make the camera fault real.** The switch only changes the answer. Make
   it also stop `VisionIOLimelightSim` from publishing frames while it's
   pulled, and remove the `&&` line so LimelightLib has to notice by
   itself. How long does the alert take to appear now, and why that long?
   Watch what happens to the pose estimate.
3. **Name the corner.** `Drivetrain/Module0 CANcoder` is unique, but only
   someone who knows the corner order can find it. Make the alert say
   *front left*, without hard-coding four strings in `SwerveModule`.
4. **Argue about `HIGH` versus `MEDIUM`.** Is an unhomed elevator really
   only a `MEDIUM`? Is a missing back camera a `HIGH` when the front one
   works? Go through every alert in this lesson and decide. Then write one
   sentence per alert saying what a human should *do* about it. If you
   can't write that sentence, the alert probably shouldn't exist.
5. **Another way to stop crying wolf.** Instead of judging the battery only
   while disabled, Lesson 24's `Debouncer` could insist the voltage stay low
   for a few seconds first. Build that version and run both through a match
   in your head. Which one answers "should I swap this battery?" better?
6. **Alert on something that has never been true.** The flywheel has a
   tolerance and Lesson 28 logged `AtSpeed`. If the flywheel hasn't reached
   speed even once since boot, something is wrong: a jammed wheel, a bad
   gain, a dead motor that still answers on CAN. Detect it and say so.
7. **Count your alerts.** This robot now has thirteen, counting the
   framework's own. If one boots with nine warnings showing, nobody reads
   any of them. Decide how many is too many, and what you'd cut first.

---

## What you learned

The robot can now answer "is this thing going to work?" without a laptop.
On a real robot the 2027 Driver Station shows the answer; in simulation, a
panel you built shows it.

**Recording and reporting are different jobs.** Thirty lessons of logging
built a complete record of everything the robot does, and none of it helps
the person standing next to it with two minutes on the clock. Alerts are
the other half: short, current, and in front of someone. Most of the
information was already there. What was missing was somewhere to say it.

**"Is it plugged in?" is a sensor reading.** Connection state went into the
IO inputs alongside positions and currents, for the same reason everything
else did: it's read off hardware, it changes, and a log is far more useful
when it knows the device was missing.

**An alert is a statement, not an event.** Setting it every tick with the
current answer is what lets it clear itself, and you saw both sides of that:
your motor alerts flickered on for a single tick at startup and went away,
while the framework's overrun warning went up once and never came down.

**A simulator can fake the fault you want to test.** The unplug switches
don't make the robot lose anything; they make one reading lie, on purpose,
where you can control it. That's enough to prove an alert works before the
day it matters. Making the robot *cope* with a lost device is a different
job, and Try It #2 is the start of it.

And the one that matters most in practice: **an alert has to arrive early
enough to act on, and only when it means something.** The brownout line is
6.3 V and the warning is at 11.5, because the point is to be in time. And the
warning is judged at rest, because a warning that fires on every shot gets
ignored. If a human can't do something about an alert in the window you've
given them, you've built a log entry with a colour.

Go and pull a few plugs. It's the only time you'll get to break the robot
without anyone minding.

Alerts tell you when something is wrong *now*. There's a third question
neither they nor the logs answer: is the thing that worked last Tuesday
still working? The next lesson gets a machine to check.

Next: [Lesson 31 — Tests that catch what a plot won't](31-testing.md).
