# Lesson 4 — Simulation: make the motor move on your laptop

**Goal:** Give the simulated motor a physics model so that when you command it, the
position and velocity plots from Lesson 3 actually respond — no real robot required.

**New Java concepts**
- Objects that model the real world (a **simulation model** object)
- **`simulationPeriodic()`** — a tick that only runs in sim
- Passing objects *into* other objects (composition)

**New robot concepts**
- Why simulation matters (test logic before the robot exists)
- Phoenix 6 **sim state** — the bridge between your code and fake physics
- A **`DCMotorSim`** — WPILib's model of a motor + load
- Why sim-only code lives on `Robot`, and calls into the mechanism

---

## 1. Why simulate?

Here's the mental model to correct before anything else: simulation is not a
video game that comes with physics built in. On a real robot, code that spins
a motor produces motion because the universe handles the physics for free. In
simulation, nothing has mass or inertia unless you *tell it to*. That's why
your plots sat flat at the end of Lesson 3 — nothing connects "I commanded
30% power" to "the rotor spins up." The sim motor isn't broken; it's just
sitting in a world with no physics yet.

You fix that by adding a **physics model**: an object that takes the voltage
your code applies and computes how fast a real motor with a real load would
spin. Feed that motion back into the TalonFX and suddenly `getVelocity()` and
`getPosition()` report believable numbers. From then on you can develop and
debug logic on your laptop and save the real robot for fine-tuning — which is
how good teams write most of their code.

---

## 2. The sim bridge and the model

Two objects do the work. Phoenix 6 gives every TalonFX a **sim state** —
your hook for injecting fake sensor readings into the motor. WPILib gives
you **`DCMotorSim`** — the physics.

Both live in `DriveModule`, and both are data the module keeps for life — so
they're fields, up top with the motor.

**Add to `DriveModule`'s imports:**

```java
import com.ctre.phoenix6.sim.TalonFXSimState;

import org.wpilib.math.system.DCMotor;
import org.wpilib.math.system.Models;
import org.wpilib.simulation.DCMotorSim;
import org.wpilib.system.RobotController;
```

**Add to `DriveModule`, directly below `m_driveMotor`:**

```java
public class DriveModule extends Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, CANBus.systemcore(0)); // already here

  // The bridge: lets us push fake sensor values into the TalonFX during sim.
  private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();

  // The physics: one Kraken X60 motor spinning a small inertia.
  // 0.001 = moment of inertia (kg·m²), 1.0 = gear ratio (we'll add gearing in L7).
  private final DCMotorSim m_driveModel =
      new DCMotorSim(
          Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.001, 1.0),
          DCMotor.getKrakenX60(1));

  // ...constructor and everything below stays as it is...
```

The order of those fields is not cosmetic. Fields initialize top to bottom,
and `m_driveSim` is built by *asking the motor* for its sim state — so the
motor has to exist first. Put `m_driveSim` above `m_driveMotor` and the
compiler refuses outright (try it — the error is "illegal forward
reference"). **When one field is built from another, the one it depends on
goes first.**

Now read the `m_driveModel` field inside-out, because it's objects built
from other objects — that's **composition**, and it's how most robot code
fits together. Innermost: `DCMotor.getKrakenX60(1)` describes the motor
itself (a Kraken X60 is the motor a TalonFX lives inside; the `1` means one
of them). That description gets handed to
`Models.singleJointedArmFromPhysicalConstants(motor, inertia, gearing)`,
which builds the math model — inertia is "how hard is this thing to spin
up," so a small number means it spins up fast. And the math model gets
handed to `new DCMotorSim(...)`, which wraps it into something you can step
forward in time, tick by tick. Three objects, each passed into the next.
You'll see this shape constantly from here on.

> The method's name mentions an arm — that's because a motor turning a shaft
> against a load is the same equation whether the shaft is an arm joint or a
> wheel axle, so WPILib doesn't duplicate the math under a second name.
> `DCMotorSim` doesn't know or care that this one happens to spin a wheel.

> Don't sweat the exact numbers yet. `0.001` just makes the motor feel
> snappy. Tuning for realism comes later; right now you want *any*
> believable motion.

---

## 3. Give `DriveModule` a way to step the physics

WPILib steps simulated physics on its own schedule, separate from the
scheduler tick you wired up in Lesson 1 — but that schedule lives on `Robot`,
not on `Mechanism`. A mechanism doesn't get a "run my physics" hook of its
own; the only thing that does is a plain method you write yourself, for
`Robot` to call. That's a smaller idea than it sounds: you're just writing
another method, the same way `getPositionRotations()` in Lesson 3 was just
another method.

**Add to `DriveModule`, below `getPositionRotations()`:**

```java
/** Advances the physics model by one tick. Only ever called in simulation. */
public void simulatePeriodic() {
  // 1. Tell the sim the battery voltage available to the motor.
  m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());

  // 2. Read the voltage the TalonFX is applying (result of your setThrottle() command).
  double appliedVolts = m_driveSim.getMotorVoltage();

  // 3. Feed that into the physics model and advance time by one tick (20 ms).
  m_driveModel.setInputVoltage(appliedVolts);
  m_driveModel.update(0.020);

  // 4. Push the model's resulting motion BACK into the TalonFX's fake encoder.
  m_driveSim.setRawRotorPosition(m_driveModel.getAngularPosition() / (2 * Math.PI));
  m_driveSim.setRotorVelocity(m_driveModel.getAngularVelocity() / (2 * Math.PI));
}
```

Those four steps form a loop, and the loop is the whole idea of simulation —
if you take one picture from this lesson, take this one.

*Nothing to add — a picture of the loop, not code:*

```
your setThrottle(0.3)  →  TalonFX applies volts  →  getMotorVoltage()
      ↑                                                    ↓
setRawRotorPosition  ←  DCMotorSim computes motion (update)
```

Your command flows *out* as voltage; the model turns voltage into motion; the
motion flows *back in* as fake sensor readings. Once this runs, `getPosition()`
and `getVelocity()` — the values you've been logging since Lesson 3 — reflect
real-feeling physics, and nothing downstream of the encoder can tell the
difference. Your telemetry, your plots, and every controller you write later
work identically in sim and on the real robot. That's the payoff.

One small unit note on step 4: `DCMotorSim` reports position and velocity in
**radians** and **radians per second**, but `setRawRotorPosition` and
`setRotorVelocity` want **rotations** and **rotations per second** — one full
turn is `2 * Math.PI` radians, so dividing by it converts either quantity.
Skip that division and your plots would be lying by a factor of about 6.3.

---

## 4. Wire it into `Robot`

You've already met one method that WPILib calls every tick no matter what:
`robotPeriodic()`, which you gave the scheduler tick to back in Lesson 1.
**`simulationPeriodic()`** is that method's sim-only sibling — same idea,
called on the same schedule, except WPILib only calls it when you're actually
running in simulation. On a real robot it never runs, so nothing inside it
can ever leak onto the field.

**Add to `Robot`, below `robotPeriodic()`:**

```java
  /** Runs every tick, but only while the code is running in simulation. */
  @Override
  public void simulationPeriodic() {
    module.simulatePeriodic();
  }
```

That's the whole wire-up: `Robot` already holds `module`, so it just calls
the method you wrote in section 3. As you add more mechanisms in later
lessons, this is where each one's `simulatePeriodic()` gets called from —
one line per mechanism, all in one obvious place.

---

## 5. Run it

`./gradlew simulateJava` → **My Teleop** → **Enabled**. Push the stick and
watch the plots from Lesson 3 — this is the payoff Lesson 3 promised:

- **Velocity** ramps up to a steady value and back to zero — like a real motor
  accelerating.
- **Position** climbs while you drive and holds when you stop.

You now have a robot you can develop against with no hardware on the bench.

---

## Try it

1. Change the inertia from `0.001` to `0.05`. Does the velocity plot reach full
   speed faster or slower? Explain why in one sentence.
2. Command a step input (hold the bottom face button, which is already bound
   to `driveAtSpeed(0.3)` from Lesson 1 — try changing it to `1.0` and
   rebuilding) and watch the velocity curve. That S-shaped ramp is the
   motor's natural response — you'll meet it again when you tune control.
3. Add `SmartDashboard.putNumber("DriveModule/AppliedVolts", appliedVolts);`
   inside `simulatePeriodic()` and overlay it against velocity in
   AdvantageScope. (A value that only exists in sim gets logged from
   `simulatePeriodic()` — it's the `logTelemetry()` of the sim world.)

---

## What you learned

Simulation isn't magic — that's the lesson under the lesson. Nothing in sim
moves until you model it: the Phoenix **sim state** is the bridge for
injecting fake sensor readings, **`DCMotorSim`** is the physics that turns
applied voltage into motion, and `Robot`'s **`simulationPeriodic()`** is
where you step it, one 20 ms tick at a time — the sim-only sibling of the
`robotPeriodic()` scheduler tick you wrote in Lesson 1. Along the way you met
**composition** — objects built from objects, handed one into the next — and
a rule about field order: when one field is built from another, the
dependency comes first. The picture to keep is the loop: **command → voltage
→ model → fake encoder → your reads**. Everything downstream of the encoder
can't tell sim from reality, which means from here on you can build and
debug on your laptop and bring the real robot in at the end. Lesson 5 cashes
that in immediately with your first feedback controller.

Next: Lesson 5 — Steering with P control.
