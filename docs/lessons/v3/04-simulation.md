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
sitting in a world with no physics yet. <!-- claim: phoenix6.sim-motor-stalls-without-physics -->

You fix that by adding a **physics model**: an object that takes the voltage
your code applies and computes how fast a real motor with a real load would
spin. Feed that motion back into the TalonFX and suddenly `getVelocity()` and
`getPosition()` report believable numbers. From then on you can develop and
debug logic on your laptop and save the real robot for fine-tuning — which is
how good teams write most of their code.

---

## 2. The sim bridge and the model

Two objects do the work. Phoenix 6 gives every TalonFX a **sim state** —
your hook for injecting fake sensor readings into the motor. <!-- claim: phoenix6.talonfx-sim-state-api --> WPILib gives
you **`DCMotorSim`** — the physics. <!-- claim: wpilib.sim-model-api -->

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
public class DriveModule implements Mechanism {
  private final TalonFX m_driveMotor =
      new TalonFX(Constants.DriveConstants.kDriveMotorPort, new CANBus(CANPort.CAN_S0)); // already here

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
forward in time, tick by tick. Three objects, each passed into the next. <!-- claim: wpilib.sim-model-api -->
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
`Robot` to call. <!-- claim: wpilib.simulation-periodic-sim-only --> That's a smaller idea than it sounds: you're just writing
another method, the same way `getPositionRotations()` in Lesson 3 was just
another method.

**Add to `DriveModule`, below `getPositionRotations()`:** <!-- claim: wpilib.opmode-periodic-20ms -->

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

<a id="figure-4-1"></a>
![The simulation loop as a ring: your setThrottle command, the TalonFX turning it into volts, then three steps inside simulatePeriodic (read the volts, step the DCMotorSim, push the motion into the fake encoder), then your getPosition and getVelocity reads, which lead back to your next command](images/04-simulation-loop.svg)

*Figure 4.1 — The simulation loop. Blue boxes are your code; the orange box is `simulatePeriodic()`.*

Figure 4.1 draws it. Start at the top left and follow the arrows: your
command goes out, the TalonFX turns it into volts, and the three orange
steps are the ones you just wrote — read the volts, let the model work out
what a real motor would do with them, hand the answer back to the TalonFX as
a fake encoder reading. The last blue box is your own code again, and its
arrow runs back up to the first one: what you read decides what you command
next tick.

Your command flows *out* as voltage; the model turns voltage into motion; the
motion flows *back in* as fake sensor readings. Once this runs, `getPosition()`
and `getVelocity()` — the values you've been logging since Lesson 3 — reflect
real-feeling physics, and nothing downstream of the encoder can tell the
difference. Your telemetry, your plots, and every controller you write later
work identically in sim and on the real robot. That's the payoff.

One small unit note on step 4: `DCMotorSim` reports position and velocity in
**radians** and **radians per second**, but `setRawRotorPosition` and
`setRotorVelocity` want **rotations** and **rotations per second** — one full
turn is `2 * Math.PI` radians, so dividing by it converts either quantity. <!-- claim: wpilib.sim-model-api, phoenix6.talonfx-sim-state-api -->
Skip that division and your plots would be lying by a factor of about 6.3.

---

## 4. Wire it into `Robot`

You've already met one method that WPILib calls every tick no matter what:
`robotPeriodic()`, which you gave the scheduler tick to back in Lesson 1.
**`simulationPeriodic()`** is that method's sim-only sibling — same idea,
called on the same schedule, except WPILib only calls it when you're actually
running in simulation. On a real robot it never runs, so nothing inside it
can ever leak onto the field. <!-- claim: wpilib.simulation-periodic-sim-only -->

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

Run the robot in simulation, pick **Teleoperated** and **MyTeleop**, then
**Enable** (Lesson 0's [Figure 0.2](00-orientation.md#figure-0-2) shows the panel). Push the stick and
watch the plots from Lesson 3 ([Figure 3.1](03-telemetry.md#figure-3-1) was taken with this
lesson's code) — this is the payoff Lesson 3 promised:

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
   rebuilding) and watch the velocity curve. That rise — steep at first, then
   rounding off as the wheel reaches its top speed — is the
   motor's natural response — you'll meet it again when you tune control.
3. **Code — log applied volts.** Add
   `Telemetry.log("DriveModule/AppliedVolts", appliedVolts);`
   inside `simulatePeriodic()` and overlay it against velocity in
   AdvantageScope. (A value that only exists in sim gets logged from
   `simulatePeriodic()` — it's the `logTelemetry()` of the sim world.)

Made your predictions for 1 and 2? Then compare them with Figure 4.2, which
plots the velocity with the stick held for one second and then let go, for
`0.001` and for `0.05`.

<a id="figure-4-2"></a>
![Two plots of rotor velocity against time. Top: with inertia 0.001 the velocity climbs to a steady 30.5 rotations per second within half a second while the button is held, then drops to zero within half a second of letting go; with inertia 0.05 it creeps up to under 6 and drifts back down slowly. Bottom: with inertia 0.05 and the button held throughout, the velocity takes about 4.6 seconds to reach 63 percent of the same 30.5 and about 20 seconds to settle](images/04-velocity-two-inertias.png)

*Figure 4.2 — Velocity after holding `driveAtSpeed(0.3)`: the lesson's inertia (orange) and `0.05` (green).* <!-- claim: l04.steady-velocity, l04.light-wheel-ramp-half-second, l04.heavy-wheel-one-second, l04.heavy-wheel-63pct, l04.heavy-wheel-settle -->

Read the top panel first. The orange curve is what your plot from section 5
shows: steep at first, then rounding off as it nears the **steady value**,
30.5 rotations per second, and falling away the same way once you let go. <!-- claim: l04.steady-velocity, l04.light-wheel-ramp-half-second -->
That rounded shape is the one to remember. The time it takes to cover the
first 63% of the way is the number to compare between wheels: about 0.16 s
here. <!-- claim: l04.light-wheel-63pct --> The green curve is the same motor asked to spin a wheel fifty times
heavier. In one second it only gets to about 6 rot/s, and when you let go it
doesn't stop quickly either. <!-- claim: l04.heavy-wheel-one-second --> The bottom panel holds the button for 20
seconds so you can watch green finish the climb: 63% takes about 4.6 s, and
it's close to the steady value after 15 or so. <!-- claim: l04.heavy-wheel-63pct, l04.heavy-wheel-settle --> Both wheels end at the same
30.5, because the motor and the 3.6 V (0.3 of a 12 V battery) are the same;
the inertia decides how long the trip takes, not where it ends. <!-- claim: l04.steady-velocity, wpilib.sim-battery-rests-at-12v --> One oddity
in the top panel: the plot sits at zero for the first tenth of a second or so
after the press. The model is already moving at that point (it's the TalonFX's
reading that takes a few ticks to catch up), so don't count that gap as part
of the wheel's response. <!-- claim: l04.velocity-reading-delay -->

---

## What you learned

Simulation isn't magic — that's the lesson under the lesson. Nothing in sim
moves until you model it: the Phoenix **sim state** is the bridge for
injecting fake sensor readings, **`DCMotorSim`** is the physics that turns
applied voltage into motion, and `Robot`'s **`simulationPeriodic()`** is
where you step it, one 20 ms tick at a time — the sim-only sibling of the
`robotPeriodic()` scheduler tick you wrote in Lesson 1. <!-- claim: wpilib.opmode-periodic-20ms, wpilib.simulation-periodic-sim-only --> Along the way you met
**composition** — objects built from objects, handed one into the next — and
a rule about field order: when one field is built from another, the
dependency comes first. The picture to keep is the loop: **command → voltage
→ model → fake encoder → your reads**. Everything downstream of the encoder
can't tell sim from reality, which means from here on you can build and
debug on your laptop and bring the real robot in at the end. Lesson 5 cashes
that in immediately with your first feedback controller.

Next: Lesson 5 — Steering with P control.
