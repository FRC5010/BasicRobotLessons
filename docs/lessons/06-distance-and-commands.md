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

`getPosition()` gives **rotor** rotations, and "the rotor turned 47 times"
means nothing to a driver. The question that matters is *how far did the
robot go* — and two physical facts stand between the rotor and the floor.

First, the **gear ratio**. The rotor doesn't turn the wheel directly; it
turns a gearbox, and the gearbox trades speed for strength. On an SDS MK4
module at "L2" the ratio is `6.75 : 1` — the rotor spins 6.75 times for one
wheel turn — so `wheelTurns = rotorTurns / 6.75`.

Second, the **wheel circumference**. One wheel turn rolls the robot exactly
one circumference along the floor: `π × diameter`. A 4-inch (0.1016 m) wheel
travels `π × 0.1016 ≈ 0.319 m` per turn.

Both numbers describe *your hardware*, which makes them constants — so they
go in `Constants.java`, in a new nested class alongside `SteerConstants` from
Lesson 5:

```java
public final class Constants {
  // ...SteerConstants from Lesson 5 stays...

  public static class DriveConstants {
    public static final double kDriveGearRatio = 6.75;                 // rotor : wheel
    public static final double kWheelDiameterMeters = 0.1016;          // 4 inch wheel
    public static final double kWheelCircumferenceMeters =
        Math.PI * kWheelDiameterMeters;                                // ≈ 0.319 m
  }
}
```

(Notice `kWheelCircumferenceMeters` is *computed from* `kWheelDiameterMeters`
— constants can be built from other constants, and letting Java do the
multiplication beats typing in a rounded decimal.)

Now the conversion itself: a question-method in `DriveModule`, next to
`getSteerAngleDegrees`. Add the import up top, then the method:

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

Read it as a pipeline: rotor turns ÷ gear ratio = wheel turns; wheel turns ×
circumference = meters. This is why the constants get names instead of
`6.75` sprinkled through the code — when you swap modules next season, you
change *one line* in `Constants.java` and everything downstream is correct.

Log it from `periodic()` with the others, and you've got a live odometer:

```java
  @Override
  public void periodic() {
    // ...the logs from Lessons 3 and 5 stay...

    Logger.recordOutput("DriveModule/DistanceMeters", getDistanceMeters());
  }
```

---

## 2. Line up the sim with the real gearing

Back in Lesson 4 we built the sim with `gearing = 1.0` — a rotor spinning against
a tiny inertia, no gearbox. Now that a real `6.75 : 1` reduction exists in the
distance math, the sim has to learn about it too, or "one wheel turn" in sim
won't mean the same physical motion as on the real robot.

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

Here's the subtlety worth slowing down for. Because `DCMotorSim` now models a
gearbox, `getAngularPositionRotations()` and `getAngularVelocityRPM()` report
the **wheel** (output) motion, not the rotor. But the TalonFX's fake encoder
still lives on the *rotor* — the sensor is physically on the motor, gearbox
or not. So `simulationPeriodic()` has to convert wheel-side back to
rotor-side by *multiplying* by the ratio:

```java
m_driveSim.setRawRotorPosition(
    m_driveModel.getAngularPositionRotations() * DriveConstants.kDriveGearRatio);
m_driveSim.setRotorVelocity(
    m_driveModel.getAngularVelocityRPM() * DriveConstants.kDriveGearRatio / 60.0);
```

Now the whole chain is honest: applied volts spin the *rotor*, the *wheel* moves
`1/6.75` as fast, `getDistanceMeters()` divides `getPosition()` by that same
ratio, and the number of meters on the plot matches what the real robot would
roll. If you ever see sim distances off by a suspiciously round factor, check
this chain first — a gear ratio applied twice (or not at all) is the classic
cause.

> Don't forget the `import frc.robot.Constants.DriveConstants;` at the top of
> `DriveModule` — added earlier in section 1.

---

## 3. Commands that finish

Stop and notice something about every command you've written so far: none of
them ever *finishes*. They run until something else kills them — a button
release, a rival command. That was fine for "spin while I hold A," but "drive
exactly one meter" is a different kind of job: the command itself is the only
thing that knows when the job is done, so the command has to decide **for
itself** when to end. A command reports this through its **finish
condition**, and the easy way to add one is the **`until`** decorator.

Add to `DriveModule`, with the other command factories:

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
1. **`runOnce(...)`** is another factory from the Lesson 1 family (`run`,
   `startEnd`, `runOnce`, `runEnd`): it builds a command that does its action
   once and immediately finishes. The action here is `setPosition(0)`, which
   tells the encoder "call right here zero" — so we measure distance *from
   the start of this command*, not since boot.
2. **`.andThen(...)`** glues a second command after the first: once the reset
   command finishes, the drive command starts. This only works because
   `runOnce` finishes — you can't sequence *after* something that never ends.
3. **`.until(condition)`** wraps the whole thing with a finish condition. The
   condition is a lambda that answers true or false — the same trick as
   Lesson 2's `DoubleSupplier`, but yes/no instead of a number — and the
   scheduler asks it every tick. The moment `getDistanceMeters() >= meters`
   comes back true, the command ends.
4. **`.finallyDo(...)`** runs when the command ends *for any reason* —
   finished on its own or interrupted — and stops the motor. Lesson 1's rule
   never goes away: nothing stops the wheel unless some code commands `0`.

One factory and three chained decorators, and look at what you built: a
command that sets up, works, watches for done, and cleans up. These pieces
are Lego bricks — almost every robot behavior, all the way up to full
autonomous routines, is small commands snapped together exactly like this.
That's the real lesson hiding inside "drive a distance."

---

## 4. A turn-in-place hint

You now have the two ingredients for turning the *robot*: point the wheel
(`steerToAngle` from Lesson 5) and roll it forward (`driveDistance`). A real swerve
robot turns in place by angling all wheels tangent to a circle and driving them. For
one module, you can approximate "turn the robot" as "steer to an angle, then drive
an arc length." Lesson 7 builds the four-module chassis this turns into, and
Lesson 8 does the clean version with a gyro — but if you want to experiment
now, compose `steerToAngle(...).andThen(driveDistance(...))`. You already know
both bricks; snapping them together is the point.

---

## 5. Bind and test

In `configureBindings()`, with the rest of the wiring. `povUp()` is a new
button: the **POV** is the D-pad, and `povUp()` fires on its up direction —
handy once the face buttons fill up:

```java
  private void configureBindings() {
    // ...bindings from earlier lessons stay...

    m_driverController.povUp().onTrue(m_module.driveDistance(1.0, 0.4)); // drive 1 meter
  }
```

Run in sim, plot `DriveModule/DistanceMeters` in AdvantageScope, and tap D-pad
up. The trace should climb to 1.0 and flatten as the command stops itself.
Change the target to `2.0` and confirm it goes twice as far. You've built a
command that *accomplishes a goal and reports done* — exactly what autonomous
routines are made of.

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

Two ideas carried this lesson. The first is that units are yours to build:
**gear ratio** and **wheel circumference** turn rotor rotations into
**meters**, `setPosition(0)` rezeros the encoder so distance means "since
this command started," and named constants keep the conversion honest in one
place. The second is bigger: commands can **finish**. `runOnce` does one-shot
setup, **`andThen`** sequences steps, **`until`** adds the finish condition,
and **`finallyDo`** cleans up no matter how the end came — small commands
snapped together into a behavior that accomplishes a goal and reports done.
That composition idea is the heart of the command-based framework, and it's
about to pay off hard: Lesson 7 turns your one module into four, and Lesson 9
strings finishing commands into a full autonomous routine. If the gearbox
math felt dense, let the plot reassure you — when the trace stops at exactly
1.0 meters, every conversion in the chain earned its keep.

Next: [Lesson 7 — Four modules](07-four-modules.md).
