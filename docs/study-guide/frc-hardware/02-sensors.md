# Sensors: gyro, encoders, limits

A sensor is how the robot finds out where something is: an encoder for a motor or a wheel, a
gyro for the whole robot, a switch or a light beam for "has it got there yet?"

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise, and each
one links to the lesson section where you write it. The motor's own sensor and how to read it
are on the [TalonFX](01-talonfx.md) page; this page is about what each sensor can and can't
tell you.

## 1. Relative and absolute encoders

An **encoder** measures how far something has turned. There are two kinds, and the difference
matters every time the robot is switched on.

- A **relative** encoder counts turns *since power-on*. Every TalonFX has one built in. At
  boot it reads 0, wherever the mechanism happens to be.
- An **absolute** encoder reads a real angle the moment it's switched on, from the direction
  of a magnet. The course's is the **CANcoder**, one on each swerve wheel's steering.

Here's the wrong picture to drop: a reading of 0.00 at boot doesn't mean the mechanism is at
its zero. From a relative encoder it only means nothing has been counted yet. If the elevator
was left 35 cm up, it boots believing it's on the floor, and nothing shows up as an error.

An absolute encoder still needs one calibration. Its own zero is wherever its magnet was glued,
so you measure the gap once, as a **magnet offset**: point the wheel straight ahead, read the raw
position, and store its negative. Configured with that, the CANcoder reads 0 with the wheel
pointing forward. <!-- claim: phoenix6.cancoder-offset-and-direction -->

<!-- source: lesson-33 subsystems/ModuleIOTalonFX.java -->
*Example, from `ModuleIOTalonFX.java`'s constructor ([Lesson 5, section 3](../../lessons/v3/05-steering-p-control.md#3-give-it-a-memory-priming-from-an-absolute-encoder); Lesson 7 gives each module its own offset):*
```java
CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();
cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;
m_steerEncoder.getConfigurator().apply(cancoderConfig);
```

An absolute encoder only works when the mechanism turns less than once over its travel, since
it reads an angle within one turn. A steering wheel and an arm fit that. The elevator's drum
turns many times from bottom to top, so it needs a different answer, in
[section 4](#4-homing-teaching-a-relative-encoder-where-it-is).

<details class="quiz" id="q-sensors-1" markdown="1">
<summary>Check yourself: the robot boots and the elevator's encoder reads 0.00 m. What does that tell you about the carriage?</summary>

- [ ] It's at the bottom of its travel. *Only if it happened to be there at power-on.*
- [x] Nothing yet: a relative encoder reads 0 at power-on wherever the carriage is. *Until the elevator is homed, every height is a guess.*
- [ ] The encoder is broken. *A relative encoder always starts at 0.*

</details>

<details class="quiz" id="q-sensors-2" markdown="1">
<summary>Check yourself: you point a wheel straight ahead and its CANcoder reads 0.30 rotations. What magnet offset makes it read 0 there?</summary>

- [ ] 0.30 *That would make it read 0.60.*
- [x] −0.30 *Store the negative of the reading at forward.*
- [ ] 0, since the offset only matters on a real robot. *The offset is exactly what makes forward read 0.*

</details>

## 2. Reading the CANcoder: once, or all the time

There are two ways to use an absolute encoder alongside the motor's relative one. Lesson 5
**primes** the motor's own sensor: read the CANcoder once at boot, and call `setPosition` on
the motor so its relative count starts from the right angle. <!-- claim: phoenix6.talonfx-set-position -->
That fixes the boot, but from then on the relative count is in charge again, and anything that
turns the wheel without the motor's knowledge, a hard hit or gear backlash, can make the two
drift apart.

Lesson 12 does better: it tells the steering motor to read the CANcoder itself, continuously,
for its position, its speed and its control loop. <!-- claim: phoenix6.remote-cancoder-feedback -->

<!-- source: lesson-33 subsystems/ModuleIOTalonFX.java -->
*Example, from `ModuleIOTalonFX.java`'s constructor ([Lesson 12, section 3](../../lessons/v3/12-model-based-control.md#3-configure-the-motors)):*
```java
steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;
steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;
steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;
steerConfig.Feedback.SensorToMechanismRatio = 1.0;
```

Once that's set, `setPosition` on the steering motor changes nothing: its position comes from
the CANcoder, not from its own count. <!-- claim: phoenix6.remote-cancoder-feedback -->

<details class="quiz" id="q-sensors-3" markdown="1">
<summary>Check yourself: with priming only, the robot takes a hard hit that knocks one wheel round without the motor turning. What does that module believe afterwards?</summary>

- [ ] The right angle: the CANcoder corrects it on the next tick. *Priming reads the CANcoder only once, at boot.*
- [x] The wrong angle, by however far the wheel was knocked. *The relative count is in charge after priming, so it can drift.*
- [ ] Nothing: the module stops reporting. *It keeps reporting, just wrongly.*

</details>

<details class="quiz" id="q-sensors-4" markdown="1">
<summary>Check yourself: the steering motor reads a remote CANcoder. You call `setPosition(0)` on the motor. What changes?</summary>

- [ ] The wheel's angle now reads 0. *Its position comes from the CANcoder now.*
- [x] Nothing: the motor's position is the CANcoder's reading. *There's no relative count left to reset.*
- [ ] The wheel turns to 0. *`setPosition` never moves anything.*

</details>

## 3. The gyro

An encoder says how far a motor turned. A **gyro** says how far the *whole robot* has turned.
The course's is a **Pigeon 2**, and it reports **yaw**: rotation about the vertical axis, in
degrees, counterclockwise positive, counted from where the robot faced when the gyro
zeroed. <!-- claim: phoenix6.pigeon2-yaw-ccw-from-boot -->

<!-- source: lesson-33 subsystems/GyroIOPigeon2.java -->
*Example, from `GyroIOPigeon2.java` ([Lesson 13, section 8](../../lessons/v3/13-io-replay.md#8-the-gyro-gets-the-same-treatment); Lesson 8 first reads the yaw):*
```java
public class GyroIOPigeon2 implements GyroIO {
  private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kGyroPort, new CANBus(CANPort.CAN_S0));

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_gyro.getYaw().getValue().in(Degrees);
    inputs.connected = m_gyro.isConnected();
  }
}
```

The gyro lives on the drivetrain, because heading is a fact about the whole chassis: no single
wheel knows it. And "counted from where it zeroed" is the part to remember. A gyro knows how far
the robot has turned, not which way the field is; telling the robot which way it faces on the
field is the pose estimate's job, from Lesson 14 on.

<details class="quiz" id="q-sensors-5" markdown="1">
<summary>Check yourself: the robot powers on facing the side wall and turns 90° to its left. What does the Pigeon's yaw read?</summary>

- [x] 90°: it counts from where it faced at power-on, and left is counterclockwise, which is positive. *The gyro doesn't know which way the field is.*
- [ ] 180°, its angle on the field. *That's the field heading; the gyro only knows how far it turned.*
- [ ] −90°, because turning left is negative. *Counterclockwise is positive.*

</details>

<details class="quiz" id="q-sensors-6" markdown="1">
<summary>Check yourself: why does the gyro belong to `Drivetrain` and not to a `SwerveModule`?</summary>

- [ ] A module has no CAN bus. *Each module's motors and CANcoder are on the CAN bus.*
- [x] Heading is a fact about the whole chassis; no single module knows it or needs it alone. *Put a sensor with the thing it measures.*
- [ ] Only one class may use `Pigeon2`. *Any class could; it's about where the fact belongs.*

</details>

## 4. Homing: teaching a relative encoder where it is

When a mechanism can't carry an absolute encoder, you give it one place it *knows*: a switch at
the bottom of its travel. At boot the code drives the mechanism gently toward the switch, and
the moment the switch trips it tells the encoder what it should read there. That's
**homing**.

<!-- source: lesson-33 subsystems/Elevator.java -->
*Example, from `Elevator.java` ([Lesson 21, section 5](../../lessons/v3/21-limit-sensors.md#5-the-homing-routine)):*
```java
/** The switch knows where the carriage is. The encoder only had an opinion. */
private void acceptBottomLimit() {
  m_io.setPositionMeters(ElevatorConstants.kBottomLimitHeight.in(Meters));
}
```

`kBottomLimitHeight` is 1 cm, not 0, because the switch trips a little before the carriage
reaches the hard stop. Figure 21.1 shows homing's whole point: what the encoder believes against
where the carriage really is.

![Graph over 20 seconds. A black dashed line, the carriage's true height, slides from 0.35 meters down to 0. An orange line, the encoder's Elevator/HeightMeters, slides from 0 down to minus 0.34 meters, always 35 centimeters below the dashed line. At about 17.4 seconds the orange line jumps up to 0.01 and the two lines meet and stay together. A strip underneath shows AtBottomLimit false until that same moment, then true.](../../lessons/v3/images/21-belief-vs-truth.png)

*Figure 21.1, from [Lesson 21](../../lessons/v3/21-limit-sensors.md#figure-21-1) — What the encoder believes (orange) against where the carriage really is (black, dashed). The true height exists only inside the simulator, so on your robot, and in your logs, you can't graph the dashed line; this is the one place you get to see it.* <!-- claim: l21.fig-land-time -->

Read the two lines side by side. They slide down together, always 35 cm apart, because the
encoder counted every bit of the sink correctly: it just started from the wrong place. Then the
switch trips, the orange line jumps up onto the dashed one, and from there on they agree.

One trap to know about: don't add a reverse soft limit at the bottom. It's measured from the
same untrusted boot-time zero that homing exists to correct, so it fights the homing routine and
makes it crawl. <!-- claim: phoenix6.reverse-soft-limit-fights-homing -->

<details class="quiz" id="q-sensors-7" markdown="1">
<summary>Check yourself: in Figure 21.1, before the switch trips, why are the two lines always the same distance apart?</summary>

- [ ] The encoder is counting too slowly. *It counts every bit of the movement correctly.*
- [x] The encoder counts the movement correctly but started from the wrong place, 35 cm off. *Homing fixes the starting point, not the counting.*
- [ ] The simulator adds a fixed error on purpose. *The 35 cm is where the carriage really sat at power-on.*

</details>

<details class="quiz" id="q-sensors-8" markdown="1">
<summary>Check yourself: why is the elevator re-zeroed to 1 cm when the switch trips, and not to 0?</summary>

- [x] The switch trips slightly before the carriage reaches the hard stop, at 1 cm. *Write down where the switch really is.*
- [ ] Phoenix can't set a position of exactly 0. *It can; homing just shouldn't.*
- [ ] So the soft limit doesn't trigger. *There's no reverse soft limit, on purpose.*

</details>

## 5. Switches and beams, and which way to wire them

A limit switch and a beam break are both **digital inputs**: in code a `DigitalInput`, and
`get()` answers "is this channel high?" <!-- claim: wpilib.dio-pullup-high -->

The wiring hides a real decision, because of one hardware fact: **every DIO channel pulls up to
high on its own.** A channel with nothing connected reads `true`, and so does one whose wire has
fallen off or been cut. <!-- claim: wpilib.dio-pullup-high --> So ask, for each sensor: if the wire
breaks, which answer do I want it stuck on?

- **The elevator's limit switch** should be stuck on "you're at the limit, stop". Stuck on "not
  there yet", the elevator drives into its own frame. So it's a normally-closed switch to ground,
  and `get() == true` means at the limit, or a broken wire. <!-- claim: wpilib.dio-pullup-high -->
- **The intake's beam break** should be stuck on "no game piece". Stuck on "there's a piece",
  the automatic handoff fires at nothing and the arm moves when nobody asked. So a broken beam
  pulls the line low, and the code reads `!get()`. <!-- claim: wpilib.dio-pullup-high -->

<!-- source: lesson-33 subsystems/ElevatorIOTalonFX.java -->
*Example, from `ElevatorIOTalonFX.java`'s `updateInputs` ([Lesson 21, section 3](../../lessons/v3/21-limit-sensors.md#3-teach-elevatorio-to-read-it)):*
```java
// Normally closed to ground: the switch holds this line low while the
// carriage is clear of it, so "high" means tripped — or a broken wire.
inputs.atBottomLimit = m_bottomLimit.get();
```

<!-- source: lesson-33 subsystems/ArmIOTalonFX.java -->
*Example, from `ArmIOTalonFX.java`'s `updateInputs` ([Lesson 22, section 3](../../lessons/v3/22-light-sensors.md#3-add-it-to-armio)):*
```java
// Wired so that a broken beam pulls the line low. An unplugged sensor
// floats high, which reads as "no game piece": the harmless answer.
inputs.hasGamePiece = !m_beamBreak.get();
```

**The rule isn't about the sensor, it's about the consequence.** Two digital inputs on one robot
can end up with opposite polarity, and these two do.

<details class="quiz" id="q-sensors-9" markdown="1">
<summary>Check yourself: the elevator's limit-switch wire is cut mid-match. What does `atBottomLimit` read, and is that safe?</summary>

- [ ] False, so the elevator keeps going: safe. *A cut wire floats high, which reads true.*
- [x] True, as if the switch were pressed, so the elevator stops: the safe failure. *That's why it's wired normally closed.*
- [ ] It throws an exception. *A `DigitalInput` just reads high.*

</details>

<details class="quiz" id="q-sensors-10" markdown="1">
<summary>Check yourself: why is the beam break read as `!m_beamBreak.get()` when the limit switch is read as plain `get()`?</summary>

- [ ] Beam breaks always report backwards. *It's a wiring choice, made on purpose.*
- [x] A disconnected beam break should read "no game piece", the harmless answer, so high has to mean no piece. *Pick the failure you'd rather have, then wire and read to match.*
- [ ] So the two sensors can share a channel. *Each has its own channel.*

</details>

## 6. Believe it, but not instantly

A game piece doesn't glide into an intake. It tumbles, bounces, and can cross the beam and come
back out before it settles. A sequence started off the raw signal would start on the first
bounce. A **debounce** waits until the signal has held for a while before believing it.

A trigger has one built in: `.debounce(time)` only turns true once its condition has been true
for that long, and turns false the moment it drops. <!-- claim: commandsv3.debounce-rising -->
The superstructure uses WPILib's plain `Debouncer` instead, because it reads the beam break in
its own periodic rather than through a trigger:

<!-- source: lesson-33 subsystems/Superstructure.java -->
*Example, from `Superstructure.java` ([Lesson 24, section 4](../../lessons/v3/24-superstructure.md#4-superstructure-legality-and-readiness-are-different-jobs)):*
```java
/** The filter Lesson 22 hung on a Trigger, here in its plain form. */
private final Debouncer m_pieceFilter = new Debouncer(ArmConstants.kBeamDebounce.in(Seconds));
// ...
private void periodic() {
  boolean hasPiece = m_pieceFilter.calculate(m_arm.hasGamePiece());
  // ...
}
```

`Debouncer` takes its time in seconds as a plain `double`, where the trigger's `.debounce` takes
a `Time` measure. <!-- claim: wpilib.debouncer-replayable-clock --> Both delay believing "yes"
and report "no" straight away, which is the right shape here: be sure before an automatic
sequence starts, and notice a dropped piece at once.

<details class="quiz" id="q-sensors-11" markdown="1">
<summary>Check yourself: the beam break reads true for 30 ms, false, then true for good. With a 0.1 s debounce, when does `hasPiece` turn true?</summary>

- [ ] After the first 30 ms. *That's the bounce the debounce is there to ignore.*
- [x] 0.1 s after the signal turns true for good. *It has to hold the whole time.*
- [ ] Never, because it flickered. *Once it holds steadily for 0.1 s it's believed.*

</details>

<details class="quiz" id="q-sensors-12" markdown="1">
<summary>Check yourself: a held piece falls out and the beam break drops to false. How soon does the debounced reading follow?</summary>

- [x] At once: the debounce only delays the change to true. *Notice a dropped piece immediately.*
- [ ] 0.1 s later, the same delay as on the way up. *By default only the rising edge is delayed.*
- [ ] Never, because the debounce holds the last true value. *A debounce delays; it doesn't latch.*

</details>

## 7. Is the reading real?

A reading is only as good as the device behind it. Every Phoenix device has an `isConnected()`
answer, true while it has been talking on the CAN bus lately, and the course records it with
the readings. <!-- claim: phoenix6.talonfx-is-connected-boot -->

Two moments to expect a disconnected reading even when nothing is wrong:

- **Right after boot.** For the first tick or so after a device is built it reads disconnected,
  in simulation too, and then clears. <!-- claim: phoenix6.talonfx-is-connected-boot -->
- **The simulated camera's first tick.** It publishes each frame one loop after it captures it,
  so on the first tick no frame has arrived yet. <!-- claim: limelightlib.sim-camera-frame-one-loop-late -->

The readings themselves are taken once a tick, in each class's periodic, before any command
looks at them, so every command in a tick sees the same, fresh values. The
[periodic functions](../frc-framework/02-periodic-functions.md#4-the-order-inside-one-tick) page
explains that order.

<details class="quiz" id="q-sensors-13" markdown="1">
<summary>Check yourself: on a fresh launch, the elevator motor's connected flag reads false on the very first tick, then true. Is the motor faulty?</summary>

- [ ] Yes: a working motor is always connected. *Every device reads disconnected for a moment after it's built.*
- [x] No: it hadn't reported on the CAN bus yet, and that clears within a few ticks. *Worry about a disconnect that lasts.*
- [ ] Only in simulation. *A real device has the same moment at boot.*

</details>

<details class="quiz" id="q-sensors-14" markdown="1">
<summary>Check yourself: two commands in the same tick both read the elevator's height. Can they see different values?</summary>

- [ ] Yes, because each reads the sensor at its own moment. *They read the bundle the periodic filled in.*
- [x] No: the elevator's periodic reads the sensor once, before any command runs, and both read that. *Readings are taken once a tick.*
- [ ] Only if one of them requires the elevator. *Requirements don't change what a reading returns.*

</details>

## Common mistakes

- **Trusting a relative encoder's boot reading.** Home the mechanism, or give it an absolute
  sensor ([section 1](#1-relative-and-absolute-encoders)).
- **Forgetting the magnet offset**, or storing the reading instead of its negative.
- **Priming once and assuming the angle stays right.** Read the absolute sensor continuously
  where you can.
- **Wiring a sensor so a broken wire gives the dangerous answer.** Decide which stuck reading
  is safe, then wire and read to match.
- **A reverse soft limit on a mechanism that homes.** It's measured from the zero homing hasn't
  fixed yet.
- **Starting an automatic sequence off a raw, bouncy signal.** Debounce it.
- **Reading the gyro as a field heading.** It counts from where it zeroed.

## Where this comes from

- **[Lesson 5](../../lessons/v3/05-steering-p-control.md):** the CANcoder, magnet offsets and
  priming.
- **[Lesson 8](../../lessons/v3/08-gyro-heading.md):** the gyro.
- **[Lesson 12](../../lessons/v3/12-model-based-control.md):** reading the CANcoder
  continuously.
- **[Lesson 13](../../lessons/v3/13-io-replay.md):** sensors behind IO classes.
- **[Lesson 21](../../lessons/v3/21-limit-sensors.md):** limit switches, safe wiring and homing.
- **[Lesson 22](../../lessons/v3/22-light-sensors.md):** beam breaks and debouncing.
- **[Lesson 24](../../lessons/v3/24-superstructure.md):** the plain `Debouncer`.
- **[Lesson 30](../../lessons/v3/30-alerts.md):** acting on a disconnected device.

## Quick reference

| You write | What it does |
|---|---|
| `new CANcoder(id, new CANBus(CANPort.CAN_S0))` | an absolute encoder on the CAN bus |
| `cancoderConfig.MagnetSensor.MagnetOffset = ...` | make "forward" read 0 |
| `steerConfig.Feedback.FeedbackSensorSource = ...RemoteCANcoder` | the motor reads the CANcoder all the time |
| `new Pigeon2(id, new CANBus(CANPort.CAN_S0))` | the gyro |
| `m_gyro.getYaw().getValue().in(Degrees)` | heading, counterclockwise positive, from where it zeroed |
| `new DigitalInput(channel)` and `.get()` | a switch or beam; true means the line is high |
| `m_motor.setPosition(rotations)` | tell a relative encoder where it is |
| `trigger.debounce(time)` | a trigger that waits for its condition to hold |
| `new Debouncer(seconds)` and `.calculate(value)` | the same, for a plain `boolean` |
| `device.isConnected()` | has it talked on the CAN bus lately? |
