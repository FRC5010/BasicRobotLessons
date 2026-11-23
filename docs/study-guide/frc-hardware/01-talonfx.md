# TalonFX motor control and configuration

A TalonFX is the motor controller built into each of the course's motors. Your code tells
it what to do with a control request, and describes the mechanism to it once with a
configuration.

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise, and each
one links to the lesson section where you write it. Since Lesson 13 the motors live in the
`...IOTalonFX` classes, behind an IO interface; the
[Inheritance and interfaces](../java/03-inheritance-interfaces.md) page explains that split.

## 1. A motor on the CAN bus

Every TalonFX sits on a **CAN bus**, a pair of wires that runs past every device on the
robot, and has a **CAN ID**, a number that tells it apart from the others. Building one in
code names both:

<!-- source: lesson-33 subsystems/ElevatorIOTalonFX.java -->
*Example, from `ElevatorIOTalonFX.java` ([Lesson 18, section 6](../../lessons/v3/18-elevator.md#6-the-hardware-implementation-elevatoriotalonfx)):*
```java
public ElevatorIOTalonFX() {
  m_motor = new TalonFX(ElevatorConstants.kMotorPort, new CANBus(CANPort.CAN_S0));
  // ...
}
```

`CANPort.CAN_S0` is SystemCore's first built-in CAN bus. A CANcoder and a Pigeon 2 are built
the same way, with an ID and a bus. <!-- claim: phoenix6.talonfx-canbus-constructor --> The ID
lives in `Constants.java` with a `// change to yours` comment, because it's a fact about your
robot's wiring, not about the code. Keep IDs at 62 or below: a simulated TalonFX on a higher ID
fails silently, with no output at all. <!-- claim: phoenix6.can-id-limit-62 -->

<details class="quiz" id="q-talonfx-1" markdown="1">
<summary>Check yourself: why is the elevator motor's CAN ID a constant in `Constants.java` instead of a number typed into `ElevatorIOTalonFX`?</summary>

- [ ] The compiler requires CAN IDs to be constants. *A plain number would compile.*
- [x] It's a fact about how your robot is wired, so it lives with the other robot-specific values, where you change it once. *The code stays the same from robot to robot; the IDs don't.*
- [ ] A CAN ID can only be read once. *It's an ordinary number.*

</details>

<details class="quiz" id="q-talonfx-2" markdown="1">
<summary>Check yourself: a simulated TalonFX is given CAN ID 70. What happens?</summary>

- [ ] It works like any other ID. *IDs above 62 don't work.*
- [x] It fails silently: no error, and no output at all. *Keep IDs at 62 or below.*
- [ ] The program stops with an exception naming the ID. *Nothing tells you; that's what makes it a trap.*

</details>

## 2. Control requests: telling the motor what to do

You don't set a motor's power directly. You hand it a **control request**, a small object
that says what kind of control to run and toward what: a voltage, a position, a speed. The
motor keeps carrying out the last request it was given until another one replaces
it. <!-- claim: phoenix6.control-request-persists -->

Make each request once, as a field, and reuse it every tick, changing only its target:

<!-- source: lesson-33 subsystems/FlywheelIOTalonFX.java -->
*Example, from `FlywheelIOTalonFX.java` ([Lesson 28, section 2](../../lessons/v3/28-flywheel.md#2-the-spine-for-the-fourth-time); `VoltageOut` arrives in Lesson 33):*
```java
private final VelocityVoltage m_request = new VelocityVoltage(0);
private final NeutralOut m_neutral = new NeutralOut();
private final VoltageOut m_openLoop = new VoltageOut(0);
// ...
@Override
public void setGoalRps(double rps) {
  m_motor.setControl(m_request.withVelocity(RotationsPerSecond.of(rps)));
}

@Override
public void stop() {
  m_motor.setControl(m_neutral);
}

@Override
public void setVoltage(double volts) {
  m_motor.setControl(m_openLoop.withOutput(volts));
}
```

The requests the course uses:

| Request | What the motor does |
|---|---|
| `VoltageOut` | applies a voltage: no target, no gains <!-- claim: phoenix6.voltage-out-request --> |
| `PositionVoltage` | holds a position, using its gains <!-- claim: phoenix6.control-request-measures --> |
| `VelocityVoltage` | holds a speed, straight away, with no profile <!-- claim: phoenix6.velocity-voltage-no-profile --> |
| `MotionMagicVoltage` | moves to a position along a planned profile <!-- claim: phoenix6.closed-loop-reference-is-profile-setpoint --> |
| `NeutralOut` | lets go, so the wheel coasts <!-- claim: phoenix6.neutral-out-vs-zero-velocity --> |

`withPosition` and `withVelocity` take measures, like `RotationsPerSecond.of(rps)`, so there's
no conversion to write. <!-- claim: phoenix6.control-request-measures --> And note the last row:
a velocity goal of zero isn't the same as `NeutralOut`. Zero speed actively brakes the wheel to
a stop; `NeutralOut` lets it coast. <!-- claim: phoenix6.neutral-out-vs-zero-velocity -->

<details class="quiz" id="q-talonfx-3" markdown="1">
<summary>Check yourself: your code sends the elevator a Motion Magic request to 0.75 m once, and then sends nothing more. What does the motor do?</summary>

- [ ] It stops after one tick, because no new request came. *A request keeps running until another replaces it.*
- [x] It keeps moving to 0.75 m and holding there. *The firmware carries out the last request until it's replaced.*
- [ ] It coasts. *Coasting is what `NeutralOut` asks for.*

</details>

<details class="quiz" id="q-talonfx-4" markdown="1">
<summary>Check yourself: you want the flywheel to spin down freely when the driver lets go. Which do you send?</summary>

- [ ] `VelocityVoltage` with a speed of 0. *That actively brakes the wheel to a stop.*
- [x] `NeutralOut`. *It lets the motor go, so the wheel coasts.*
- [ ] Nothing: stop sending requests. *The motor would keep carrying out its last request.*

</details>

## 3. Configuration: describe the mechanism once

The motor also needs to know things about the mechanism: its gearing, its gains, its limits.
Phoenix does this in two steps: fill in a **`TalonFXConfiguration`** object, then **apply** it
to the motor, once, in the constructor.

<!-- source: lesson-33 subsystems/ModuleIOTalonFX.java -->
*Example, from `ModuleIOTalonFX.java`'s constructor ([Lesson 12, section 3](../../lessons/v3/12-model-based-control.md#3-configure-the-motors)):*
```java
// Drive: firmware knows the gearbox and runs a kV model + kP trim.
TalonFXConfiguration driveConfig = new TalonFXConfiguration();
driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;
driveConfig.Slot0.kV = DriveConstants.kDriveKV;
driveConfig.Slot0.kP = DriveConstants.kDriveKP;
m_driveMotor.getConfigurator().apply(driveConfig);
```

`Slot0` holds the gains the motor's own control loop uses, such as `kV` (the model) and `kP`
(the correction). The [control math](../frc-control/README.md) group explains what each gain
does.

**Applying a configuration sets every setting it holds, including the ones you never
mention.** A fresh configuration is all defaults, so applying a second one later quietly puts
back everything the first one changed. That's why the steering configuration keeps its
`Inverted` line in every lesson that extends it, rather than starting a new
configuration. <!-- claim: phoenix6.steer-inverted-default -->

<details class="quiz" id="q-talonfx-5" markdown="1">
<summary>Check yourself: a steering motor's configuration sets `Inverted`. Later, a second `TalonFXConfiguration` that sets only the gains is applied to the same motor. Which way does the motor count now?</summary>

- [ ] Still inverted: the second configuration didn't mention it. *Applying sets every setting, the unmentioned ones included.*
- [x] Back to the default direction, because the fresh configuration's default `Inverted` was applied too. *Extend one configuration instead of applying another.*
- [ ] It depends on which was applied most recently. *It does, and the most recent one carried the default.*

</details>

<details class="quiz" id="q-talonfx-6" markdown="1">
<summary>Check yourself: where does the motor's `kP` for its own control loop go?</summary>

- [ ] In a `PositionVoltage` request. *The request carries the target, not the gains.*
- [x] In the configuration's `Slot0`, applied once. *The firmware loop reads its gains from the slot.*
- [ ] Into `setControl` every tick. *Gains are configured once; requests change every tick.*

</details>

## 4. Gear ratios: speaking in mechanism units

A motor's own sensor counts turns of the motor's rotor. The mechanism usually turns slower,
through a gearbox. Tell the configuration the ratio, and the motor reports position and speed
in turns of the *mechanism* instead, and its gains work in those units too. <!-- claim: phoenix6.sensor-to-mechanism-ratio -->

- **`SensorToMechanismRatio`**: sensor turns per mechanism turn. For the drive motor the sensor
  is the rotor, so it's the whole 6.75 : 1 gearbox.
- **`RotorToSensorRatio`**: rotor turns per sensor turn, used when the motor reads a different
  sensor. The steering motor reads a CANcoder on the wheel, so the 25 : 1 sits *before* the
  sensor, and what's left after it is 1 : 1. <!-- claim: phoenix6.rotor-to-sensor-ratio -->

Figure 12.2 draws both chains. Find the sensor in each, and the ratio on each side of it gets
its name from where it sits.

![Two gear chains. Steering: the steer motor's rotor connects through a 25 to 1 ratio called RotorToSensorRatio to the CANcoder on the wheel, then through a 1 to 1 ratio called SensorToMechanismRatio to the wheel angle, and the motor's closed loop reads the CANcoder. Drive: the drive motor's rotor, which is its own sensor, connects through a 6.75 to 1 SensorToMechanismRatio to the wheel.](../../lessons/v3/images/12-sensor-gear-chain.svg)

*Figure 12.2, from [Lesson 12](../../lessons/v3/12-model-based-control.md#figure-12-2) — The ratio before the sensor is `RotorToSensorRatio`; the ratio after it is `SensorToMechanismRatio`.* <!-- claim: phoenix6.rotor-to-sensor-ratio, phoenix6.sensor-to-mechanism-ratio -->

<details class="quiz" id="q-talonfx-7" markdown="1">
<summary>Check yourself: the drive motor has `SensorToMechanismRatio = 6.75`. The wheel turns once. What does `getPosition()` read?</summary>

- [ ] 6.75 rotations, one for each turn of the rotor. *That's what it reads with no ratio set.*
- [x] 1 rotation: the ratio converts rotor turns into wheel turns. *Position, speed and the gains all work in mechanism units.*
- [ ] 1 ÷ 6.75 rotations. *The ratio divides the rotor's count, which is 6.75 here.*

</details>

<details class="quiz" id="q-talonfx-8" markdown="1">
<summary>Check yourself: why does the steering motor's 25 : 1 go in `RotorToSensorRatio` and not `SensorToMechanismRatio`?</summary>

- [ ] Steering motors can't use `SensorToMechanismRatio`. *They do: it's set to 1.0.*
- [x] The motor reads the CANcoder on the wheel, so the gearbox sits between the rotor and the sensor. *The ratio is named by where it sits relative to the sensor.*
- [ ] `RotorToSensorRatio` is just the newer name for the same thing. *They're two different links in the chain.*

</details>

## 5. The motor runs its own loop

Each TalonFX has its own processor, running its control loop about 1000 times a second, close to
the sensor and whatever your code is doing. <!-- claim: phoenix6.onboard-loop-1khz -->
So the job splits in two. Your code is the coach: once a tick it decides what each motor should
be doing and sends that as a request. The motor is the player: it chases that goal twenty times
for every one of your ticks.

![Two timelines covering the same 60 milliseconds. The top one, in blue, has a tick every 20 milliseconds, labelled as your 50 hertz code stating a target. Green arrows carry each new target down to the bottom timeline, in orange, which has a tick every millisecond: the TalonFX closing the loop about 1000 times per second.](../../lessons/v3/images/12-coach-and-player.svg)

*Figure 12.1, from [Lesson 12](../../lessons/v3/12-model-based-control.md#figure-12-1) — The same 60 ms, seen by each computer. Your code states a target every 20 ms; the TalonFX closes the loop itself about 1000 times per second.* <!-- claim: phoenix6.onboard-loop-1khz -->

In Figure 12.1, read the blue line first: three ticks of your code, each sending one target. The
orange line underneath is the motor over the same 60 ms, adjusting its output every millisecond.
The green arrows are all that crosses between them.

Some settings only make sense on the motor's side. With `ContinuousWrap` on, the steering loop
knows its mechanism is a circle and takes the short way round, so the software angle wrap
Lessons 5 and 10 wrote isn't needed any more. <!-- claim: phoenix6.continuous-wrap -->

<details class="quiz" id="q-talonfx-9" markdown="1">
<summary>Check yourself: with `PositionVoltage` on the steering motor, who works out the voltage for each moment?</summary>

- [ ] Your code, once a tick, from the error. *That was Lesson 5's software P control.*
- [x] The TalonFX's own loop, about 1000 times a second, from the target your code sent. *Your code only states the target.*
- [ ] Nobody: the motor applies a fixed voltage. *That's `VoltageOut`.*

</details>

<details class="quiz" id="q-talonfx-10" markdown="1">
<summary>Check yourself: the wheel is at 350° and the target is 10°. With `ContinuousWrap` on, which way does the steering turn?</summary>

- [x] Forward through 360°, a 20° move. *The loop knows a circle has no ends.*
- [ ] Back through 180°, a 340° move. *That's what it would do without the wrap.*
- [ ] It depends on the sign of `kP`. *The wrap decides which way is shorter, whatever the gain.*

</details>

## 6. Limits: what the motor won't do

Two kinds of limit live in the configuration, and the motor enforces them itself.

**Soft limits** stop a mechanism at a position, measured by the motor's own sensor. The arm
has them at both ends of its swing from Lesson 20, and under Motion Magic the plan stops at the
limit. <!-- claim: phoenix6.soft-limit-stops-motion-magic --> The elevator gets a forward one at the top
of its travel in Lesson 33, and it holds in any control mode,
open-loop voltage included. <!-- claim: phoenix6.soft-limit-holds-open-loop -->

**Current limits** cap the current. There are two, because there's a current on each side of
the controller:

- **Stator current** flows through the motor's windings. It makes torque and heat: the
  motor's problem.
- **Supply current** is what the controller draws from the battery. It makes the battery's
  voltage sag: the robot's problem.

They can be very different. A controller applying 3 V of 12 is switched on about a quarter of
the time, so it draws about a quarter of its stator current from the battery. <!-- claim: phoenix6.supply-current-duty-scaling -->
A stalled motor is hard on the windings and cheap for the battery; a fast one is the other way
round. **A fresh configuration already limits both**: 120 A stator and 70 A supply, dropping to
40 A after a second. <!-- claim: phoenix6.talonfx-default-current-limits --> But those limits
are per motor, and the battery is shared, so Lesson 29 gives each motor its own slice:

<!-- source: lesson-33 subsystems/ElevatorIOTalonFX.java -->
*Example, from `ElevatorIOTalonFX.java`'s constructor ([Lesson 33, section 8](../../lessons/v3/33-tuning-with-sysid.md#8-a-mechanism-that-can-run-out-of-room) for the soft limit, [Lesson 29, section 4](../../lessons/v3/29-current-limits.md#4-a-budget-you-can-read-in-one-place) for the current limits):*
```java
config.SoftwareLimitSwitch.ForwardSoftLimitEnable = true;
config.SoftwareLimitSwitch.ForwardSoftLimitThreshold =
    metersToRotations(ElevatorConstants.kMaxHeight.in(Meters));

// The budget: this motor's slice of the battery, plus the shared winding cap.
config.CurrentLimits.StatorCurrentLimitEnable = true;
config.CurrentLimits.StatorCurrentLimit = PowerConstants.kStatorLimit.in(Amps);
config.CurrentLimits.SupplyCurrentLimitEnable = true;
config.CurrentLimits.SupplyCurrentLimit = PowerConstants.kElevatorSupplyLimit.in(Amps);
```

<details class="quiz" id="q-talonfx-11" markdown="1">
<summary>Check yourself: a motor is stalled against a jammed mechanism, at its 120 A stator limit and applying 3 V. Roughly how much is it drawing from a 12 V battery?</summary>

- [ ] 120 A, the same as the stator. *The controller is only switched on about a quarter of the time.*
- [x] About 30 A, a quarter of the stator current. *Supply current is about stator current times applied volts over battery volts.*
- [ ] Nothing: a stalled motor draws no current. *It draws a lot through its windings.*

</details>

<details class="quiz" id="q-talonfx-12" markdown="1">
<summary>Check yourself: every motor keeps the default 70 A supply limit. Why can the robot still brown out?</summary>

- [ ] The default limits are turned off. *They're on in a fresh configuration.*
- [x] The limits are per motor, and the battery is shared: a dozen motors each allowed 70 A add up to far more than it can give. *A budget gives each motor a slice of what the battery can supply.*
- [ ] Supply limits only apply in simulation. *They apply on the real motor too.*

</details>

## 7. Reading the motor back, and what disabling does

The motor reports its state as **status signals**: `getPosition()`, `getVelocity()`,
`getMotorVoltage()`, `getStatorCurrent()`, and more. Each one's `getValue()` is a measure, so
`.in(...)` gets the number in the unit you want. <!-- claim: phoenix6.status-signal-get-value-in -->

<!-- source: lesson-33 subsystems/ElevatorIOTalonFX.java -->
*Example, from `ElevatorIOTalonFX.java` ([Lesson 18, section 6](../../lessons/v3/18-elevator.md#6-the-hardware-implementation-elevatoriotalonfx); later lessons add the currents and the connection check):*
```java
@Override
public void updateInputs(ElevatorIOInputs inputs) {
  inputs.heightMeters = rotationsToMeters(m_motor.getPosition().getValue().in(Rotations));
  inputs.velocityMetersPerSec =
      rotationsToMeters(m_motor.getVelocity().getValue().in(RotationsPerSecond));
  inputs.appliedVolts = m_motor.getMotorVoltage().getValue().in(Volts);
  inputs.setpointMeters = rotationsToMeters(m_motor.getClosedLoopReference().getValue());
  // ...
  inputs.motorConnected = m_motor.isConnected();
}
```

`getClosedLoopReference()` is where the motor's plan says the mechanism should be *right now*,
which under Motion Magic ramps from the start to the goal. <!-- claim: phoenix6.closed-loop-reference-is-profile-setpoint -->
`isConnected()` says whether the device has answered on the CAN bus lately; it reads false for
the first tick or so after the device is built, even in simulation. <!-- claim: phoenix6.talonfx-is-connected-boot -->
`setPosition(...)` is the one call that changes a reading without moving anything: it tells the
motor what its own sensor should read now, which is how homing zeroes the
elevator. <!-- claim: phoenix6.talonfx-set-position -->

**A TalonFX applies no power while the robot is disabled**, whatever the code asks for, and on
enable it carries on with its last request. <!-- claim: phoenix6.talonfx-no-output-when-disabled -->
That's a safety net underneath the scheduler, which cancels mechanism commands on disable
too.

<details class="quiz" id="q-talonfx-13" markdown="1">
<summary>Check yourself: the elevator is homed, and the switch says the carriage is at 1 cm. Which call makes the encoder agree?</summary>

- [ ] A `PositionVoltage` request to 1 cm. *That would move the carriage; it's already there.*
- [x] `setPosition(...)` with 1 cm's worth of rotations. *It changes what the sensor reads without moving anything.*
- [ ] Re-applying the configuration. *Configuration doesn't hold a position.*

</details>

<details class="quiz" id="q-talonfx-14" markdown="1">
<summary>Check yourself: the code is still sending the arm a Motion Magic request when the robot is disabled. What does the arm do?</summary>

- [ ] It keeps holding its angle. *A disabled TalonFX applies no power.*
- [x] It goes limp, and on enable the motor carries on with its last request. *Disabled means no output, whatever the code commands.*
- [ ] It drives to its soft limit. *Nothing drives it at all while disabled.*

</details>

## Common mistakes

- **Building a new control request every tick.** Make it once, as a field, and change its
  target ([section 2](#2-control-requests-telling-the-motor-what-to-do)).
- **Applying a second, fresh configuration** to a motor that already has one. It resets
  everything the first one set; extend the first one instead.
- **Forgetting the gear ratio**, then wondering why positions are 6.75 times too big or a gain
  needs an odd value.
- **Expecting a zero-speed request to coast.** Use `NeutralOut` to let go.
- **Trusting the default current limits to protect the battery.** They protect each motor;
  the battery needs a budget.
- **A CAN ID above 62.** It fails without a word.

## Where this comes from

- **[Lesson 1](../../lessons/v3/01-first-motor.md):** the first TalonFX and its CAN bus.
- **[Lesson 4](../../lessons/v3/04-simulation.md):** the simulated motor.
- **[Lesson 12](../../lessons/v3/12-model-based-control.md):** configurations, ratios, control
  requests, and the motor's own loop.
- **[Lesson 18](../../lessons/v3/18-elevator.md):** Motion Magic.
- **[Lesson 20](../../lessons/v3/20-intake-arm.md):** soft limits, and a second motor on one
  mechanism.
- **[Lesson 28](../../lessons/v3/28-flywheel.md):** velocity control and `NeutralOut`.
- **[Lesson 29](../../lessons/v3/29-current-limits.md):** stator and supply current, and a
  budget.
- **[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md):** a soft limit that holds open loop.

## Quick reference

| You write | What it does |
|---|---|
| `new TalonFX(id, new CANBus(CANPort.CAN_S0))` | a motor on SystemCore's first CAN bus |
| `m_motor.setControl(request)` | hand the motor a request; it runs until replaced |
| `new VoltageOut(0)` and `.withOutput(volts)` | a plain voltage |
| `new PositionVoltage(0)` and `.withPosition(angle)` | hold a position |
| `new VelocityVoltage(0)` and `.withVelocity(speed)` | hold a speed |
| `new MotionMagicVoltage(0)` | move to a position along a profile |
| `new NeutralOut()` | let go and coast |
| `new TalonFXConfiguration()` then `getConfigurator().apply(config)` | describe the mechanism, once |
| `config.Slot0.kP`, `.kV`, `.kG` ... | the motor loop's gains |
| `config.Feedback.SensorToMechanismRatio` | report in mechanism units |
| `config.SoftwareLimitSwitch...` | stop at a position |
| `config.CurrentLimits...` | cap stator and supply current |
| `m_motor.getPosition().getValue().in(Rotations)` | read a status signal as a number |
| `m_motor.setPosition(rotations)` | tell the sensor what it should read now |
