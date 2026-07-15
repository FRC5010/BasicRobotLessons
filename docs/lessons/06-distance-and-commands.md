# Lesson 6 — Distance & commands: drive an exact distance

**Goal:** Turn motor rotations into **meters**, then build a command that drives a
set distance and **stops on its own** — your first command that *finishes*.

**New Java concepts**
- **Unit conversion** with named constants
- Commands that **end** (`until`, `finallyDo`) vs. commands that run forever
- Composing steps with **`andThen`**

**New robot concepts**
- **Gear ratio** and **wheel circumference** — from rotor turns to travel
- Resetting the encoder to measure a *relative* distance
- A command's **finish condition**

---

## 1. From rotations to meters

`getPosition()` gives **rotor** rotations. To know how far the *robot* drove, two
numbers stand between the rotor and the floor:

- **Gear ratio** — the rotor spins several times per one wheel turn. An SDS MK4
  module at "L2" is `6.75 : 1`, so `wheelTurns = rotorTurns / 6.75`.
- **Wheel circumference** — one wheel turn moves the robot `π × diameter` meters. A
  4-inch (0.1016 m) wheel travels `π × 0.1016 ≈ 0.319 m` per turn.

Put both in `Constants.java`:

```java
public static class DriveConstants {
  public static final double kDriveGearRatio = 6.75;                 // rotor : wheel
  public static final double kWheelDiameterMeters = 0.1016;          // 4 inch wheel
  public static final double kWheelCircumferenceMeters =
      Math.PI * kWheelDiameterMeters;                                // ≈ 0.319 m
}
```

Add a reading method to `DriveModule`:

```java
import frc.robot.Constants.DriveConstants;
```

```java
/** How far this module's wheel has driven, in meters, since the last reset. */
public double getDistanceMeters() {
  double rotorRotations = m_driveMotor.getPosition().getValueAsDouble();
  double wheelRotations = rotorRotations / DriveConstants.kDriveGearRatio;
  return wheelRotations * DriveConstants.kWheelCircumferenceMeters;
}
```

Named constants (not `6.75` sprinkled through the code) mean that when you swap
modules, you change *one line* and everything downstream is correct. Publish
`getDistanceMeters()` in `periodic()` and watch it read real meters as you drive.

---

## 2. Line up the sim with the real gearing

Back in Lesson 4 we built the sim with `gearing = 1.0` — a rotor spinning against
a tiny inertia, no gearbox. Now that a real `6.75 : 1` reduction exists in the
distance math, we should teach the sim about it too so "one wheel turn" in sim
represents the same physical motion as on the real robot.

Update the `DCMotorSim` field in `DriveModule`:

```java
private final DCMotorSim m_driveModel =
    new DCMotorSim(
        LinearSystemId.createDCMotorSystem(
            DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),
        DCMotor.getKrakenX60(1));
```

Two things changed from Lesson 4:

- **Inertia** grew from `0.001` to `0.025` (kg·m² at the wheel). A bare rotor
  spins up nearly instantly; a rotor pulling a wheel through a gearbox has more
  to move. `0.025` gives a visible ramp without dragging.
- **Gearing** is now `DriveConstants.kDriveGearRatio` (`6.75`) instead of `1.0`.

Because `DCMotorSim` now models a gearbox, `getAngularPositionRotations()` /
`getAngularVelocityRPM()` report the **wheel** (output) motion, not the rotor.
The TalonFX's fake encoder still lives on the *rotor*, so `simulationPeriodic()`
has to convert wheel-side back to rotor-side by *multiplying* by the ratio:

```java
m_driveSim.setRawRotorPosition(
    m_driveModel.getAngularPositionRotations() * DriveConstants.kDriveGearRatio);
m_driveSim.setRotorVelocity(
    m_driveModel.getAngularVelocityRPM() * DriveConstants.kDriveGearRatio / 60.0);
```

Now the whole chain is honest: applied volts spin the *rotor*, the *wheel* moves
`1/6.75` as fast, `getDistanceMeters()` divides `getPosition()` by that same
ratio, and the number of meters on the plot matches what the real robot would
roll.

> Don't forget the `import frc.robot.Constants.DriveConstants;` at the top of
> `DriveModule` — added earlier in section 1.

---

## 3. Commands that finish

Every command you've written so far runs until *something else* cancels it (button
release, a new command). A `driveDistance` command must decide **for itself** when
it's done: "stop when I've gone far enough." A command reports this through its
**finish condition**. The easy way to add one is the **`until`** decorator.

Add to `DriveModule`:

```java
/** Drives forward 'meters' at 'speed', then stops. Finishes on its own. */
public Command driveDistance(double meters, double speed) {
  return runOnce(() -> m_driveMotor.setPosition(0))       // 1. zero the encoder
      .andThen(run(() -> m_driveMotor.set(speed)))        // 2. drive...
      .until(() -> getDistanceMeters() >= meters)         // 3. ...until far enough
      .finallyDo(() -> m_driveMotor.set(0));              // 4. stop when it ends
}
```

**Reading it top to bottom — this is command *composition*:**
1. **`runOnce(...)`** does a one-shot action: `setPosition(0)` tells the encoder
   "call right here zero," so we measure distance *from the start of this command*.
2. **`.andThen(...)`** glues a second command after the first: once the reset is
   done, start driving.
3. **`.until(condition)`** wraps the whole thing with a finish condition. The
   `condition` is a lambda checked every tick; when `getDistanceMeters() >= meters`
   is true, the command ends.
4. **`.finallyDo(...)`** runs when the command ends *for any reason* (finished or
   interrupted) — here, stop the motor so it doesn't coast under power.

These four **decorators** (`runOnce`, `andThen`, `until`, `finallyDo`) are Lego
bricks. Almost every robot behavior is small commands snapped together like this.

---

## 4. A turn-in-place hint

You now have the two ingredients for turning the *robot*: point the wheel
(`steerToAngle` from Lesson 5) and roll it forward (`driveDistance`). A real swerve
robot turns in place by angling all wheels tangent to a circle and driving them. For
one module, you can approximate "turn the robot" as "steer to an angle, then drive
an arc length." We'll do the clean version with the gyro in Lesson 7 — but if you
want to experiment now, compose `steerToAngle(...).andThen(driveDistance(...))`.

---

## 5. Bind and test

```java
m_driverController.povUp().onTrue(m_module.driveDistance(1.0, 0.4)); // drive 1 meter
```

Run in sim, plot `getDistanceMeters()`, and tap D-pad up. The trace should climb to
1.0 and flatten as the command stops itself. Change the target to `2.0` and confirm
it goes twice as far. You've built a command that *accomplishes a goal and reports
done* — exactly what autonomous routines are made of.

---

## Try it

1. **Reverse:** what happens if you call `driveDistance(1.0, -0.4)`? The condition
   `>= meters` never becomes true because distance goes negative. Fix it by
   comparing `Math.abs(getDistanceMeters()) >= Math.abs(meters)`. This is why you
   test edge cases.
2. **Ease-in with P control:** instead of a constant `speed`, reuse Lesson 5's idea
   — drive at `kP × (meters − getDistanceMeters())` so it slows as it arrives.
   Notice you're applying the *same control pattern* to a new quantity.
3. Print `"Reached target"` from `finallyDo` and confirm it fires whether the
   command finishes or you interrupt it with another button.

---

## What you learned

- **Gear ratio** and **wheel circumference** convert rotor rotations to **meters**;
  keep them as **named constants**.
- `setPosition(0)` rezeros the encoder so you measure a **relative** distance.
- Commands finish via a **condition**: **`until`** adds one, **`andThen`** sequences
  steps, **`runOnce`** does one-shot setup, and **`finallyDo`** cleans up on exit.
- Small commands **compose** into bigger behaviors — the core of the command-based
  framework.

Next: [Lesson 7 — Gyro & heading](07-gyro-heading.md).
