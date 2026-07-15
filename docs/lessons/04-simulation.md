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

---

## 1. Why simulate?

On a real robot, code that spins a motor produces motion you can see. In
simulation, nothing has mass or inertia unless you *tell it to*. So far our sim
motor reads zero velocity because nothing connects "I commanded 30% power" to "the
rotor spins up."

We fix that by adding a **physics model**: an object that takes the voltage your
code applies and computes how fast a real motor with a real load would spin. Then we
feed that back into the TalonFX so `getVelocity()` and `getPosition()` report
believable numbers. Now you can develop and debug logic on your laptop and only
touch the real robot to fine-tune.

---

## 2. The sim bridge and the model

Phoenix 6 gives every TalonFX a **sim state** object — your hook to inject fake
sensor readings. WPILib gives you **`DCMotorSim`** — the physics.

Add these imports and fields to `DriveModule`:

```java
import com.ctre.phoenix6.sim.TalonFXSimState;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
```

```java
// The bridge: lets us push fake sensor values into the TalonFX during sim.
private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();

// The physics: one Kraken X60 motor spinning a small inertia.
// 0.001 = moment of inertia (kg·m²), 1.0 = gear ratio (we'll add gearing in L6).
private final DCMotorSim m_driveModel =
    new DCMotorSim(
        LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.001, 1.0),
        DCMotor.getKrakenX60(1));
```

**What each piece is:**
- `DCMotor.getKrakenX60(1)` describes the motor itself (a Kraken X60 = TalonFX +
  built-in motor). The `1` means one motor.
- `LinearSystemId.createDCMotorSystem(motor, inertia, gearing)` builds the math
  model. Inertia is "how hard it is to spin up" — small number = spins up fast.
- `new DCMotorSim(model, motor)` wraps it into something we can step forward in time.

> Don't sweat the exact numbers yet. `0.001` just makes it feel snappy. Tuning
> realism comes later; right now we want *any* believable motion.

---

## 3. Step the simulation every tick

WPILib calls **`simulationPeriodic()`** ~50×/sec, but **only in simulation** (never
on the real robot). That's where we run the physics. Add it to `DriveModule`:

```java
@Override
public void simulationPeriodic() {
  // 1. Tell the sim the battery voltage available to the motor.
  m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());

  // 2. Read the voltage the TalonFX is applying (result of your set() command).
  double appliedVolts = m_driveSim.getMotorVoltage();

  // 3. Feed that into the physics model and advance time by one tick (20 ms).
  m_driveModel.setInputVoltage(appliedVolts);
  m_driveModel.update(0.020);

  // 4. Push the model's resulting motion BACK into the TalonFX's fake encoder.
  m_driveSim.setRawRotorPosition(m_driveModel.getAngularPositionRotations());
  m_driveSim.setRotorVelocity(m_driveModel.getAngularVelocityRPM() / 60.0);
}
```

**The loop of information** (this is the whole idea of sim):

```
your set(0.3)  →  TalonFX applies volts  →  getMotorVoltage()
      ↑                                            ↓
setRawRotorPosition  ←  DCMotorSim computes motion (update)
```

Your command flows *out* as voltage; the model turns voltage into motion; the motion
flows *back in* as fake sensor readings. Now `getPosition()`/`getVelocity()` — the
values you plot — reflect real-feeling physics.

Step 4 converts RPM to rps (`/ 60.0`) because `setRotorVelocity` wants rotations per
second, matching what `getVelocity()` reports.

---

## 4. Run it

`./gradlew simulateJava` → **Teleoperated**. Push the stick and watch the plots from
Lesson 3:

- **Velocity** ramps up to a steady value and back to zero — like a real motor
  accelerating.
- **Position** climbs while you drive and holds when you stop.

You now have a robot you can develop against with no hardware on the bench. This is
how good teams write most of their code.

---

## Try it

1. Change the inertia from `0.001` to `0.05`. Does the velocity plot reach full
   speed faster or slower? Explain why in one sentence.
2. Command a step input (bind A to `driveAtSpeed(1.0)` from Lesson 1) and watch the
   velocity curve. That S-shaped ramp is the motor's natural response — you'll meet
   it again when you tune control.
3. Add `SmartDashboard.putNumber("Applied Volts", appliedVolts);` inside
   `simulationPeriodic` and plot it against velocity.

---

## What you learned

- **Simulation** lets you test real logic with no robot by *modeling* the physics.
- **`simulationPeriodic()`** runs only in sim; that's where you step the model.
- The Phoenix **sim state** injects fake sensor values; a **`DCMotorSim`** computes
  motion from applied voltage.
- The pattern is a loop: **command → voltage → model → fake encoder → your reads**.

Next: [Lesson 5 — Steering with P control](05-steering-p-control.md).
