# Lesson 6 — Distance & commands: drive an exact distance

**Goal:** Turn motor rotations into **meters**, then build a command that drives a
set distance and **stops on its own** — your first command that *finishes*.

**New Java concepts**
- **Unit conversion** with named constants
- Commands whose coroutine body **runs out** instead of running forever
- Two different endings — **finished** and **canceled** — and why each needs
  its own cleanup

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
go in `Constants.java`, alongside the CAN IDs from Lesson 5.

**Add to `DriveConstants` in `Constants.java`:**

```java
public static final class DriveConstants {
  public static final int kDriveMotorPort = 1; // CAN ID — change to yours
  public static final int kSteerMotorPort = 2; // CAN ID — change to yours
  public static final int kCancoderPort = 3;   // CAN ID — change to yours

  public static final double kDriveGearRatio = 6.75;                 // rotor : wheel
  public static final double kWheelDiameterMeters = 0.1016;          // 4 inch wheel
  public static final double kWheelCircumferenceMeters =
      Math.PI * kWheelDiameterMeters;                                // ≈ 0.319 m
}
```

(Notice `kWheelCircumferenceMeters` is *computed from* `kWheelDiameterMeters`
— constants can be built from other constants, and letting Java do the
multiplication beats typing in a rounded decimal.)

Now the conversion itself: a question-method in `DriveModule`, next to
`getSteerAngleDegrees`.

**Add to `DriveModule`, with your other public methods:**

```java
/** How far this module's wheel has driven, in meters, since the last reset. */
public double getDistanceMeters() {
  double rotorRotations = m_driveMotor.getPosition().getValue().in(Rotations);
  double wheelRotations = rotorRotations / DriveConstants.kDriveGearRatio;
  return wheelRotations * DriveConstants.kWheelCircumferenceMeters;
}
```

**Add to `DriveModule`'s imports:**

```java
import first.robot.Constants.DriveConstants;
```

Read it as a pipeline: rotor turns ÷ gear ratio = wheel turns; wheel turns ×
circumference = meters. This is why the constants get names instead of
`6.75` sprinkled through the code — when you swap modules next season, you
change *one line* in `Constants.java` and everything downstream is correct.

Log it from the same place the other readings have been logging since Lesson 3,
and you've got a live odometer.

**Add to `DriveModule`'s `logTelemetry()`:**

```java
private void logTelemetry() {
  // ...the logs from Lessons 3 and 5 stay...

  SmartDashboard.putNumber("DriveModule/DistanceMeters", getDistanceMeters());
}
```

---

## 2. Line up the sim with the real gearing

Back in Lesson 4 we built the sim with `gearing = 1.0` — a rotor spinning against
a tiny inertia, no gearbox. Now that a real `6.75 : 1` reduction exists in the
distance math, the sim has to learn about it too, or "one wheel turn" in sim
won't mean the same physical motion as on the real robot.

**Replace the `m_driveModel` field in `DriveModule`:**

```java
private final DCMotorSim m_driveModel =
    new DCMotorSim(
        Models.singleJointedArmFromPhysicalConstants(
            DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),
        DCMotor.getKrakenX60(1));
```

Two things changed from Lesson 4:

- **Inertia** grew from `0.001` to `0.025` (kg·m² at the wheel). A bare rotor
  spins up nearly instantly; a rotor pulling a wheel through a gearbox has more
  to move. `0.025` gives a visible ramp without dragging.
- **Gearing** is now `DriveConstants.kDriveGearRatio` (`6.75`) instead of `1.0`.

Here's the subtlety worth slowing down for. Because `DCMotorSim` now models a
gearbox, `getAngularPosition()` and `getAngularVelocity()` report the
**wheel** (output) motion, not the rotor. But the TalonFX's fake encoder
still lives on the *rotor* — the sensor is physically on the motor, gearbox
or not. So `simulatePeriodic()` has to convert wheel-side back to
rotor-side by *multiplying* by the ratio — on top of the radians-to-rotations
conversion from Lesson 4, which still has to happen too.

**Replace the last two drive-motor lines of `simulatePeriodic()`:**

```java
m_driveSim.setRawRotorPosition(
    m_driveModel.getAngularPosition() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);
m_driveSim.setRotorVelocity(
    m_driveModel.getAngularVelocity() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);
```

Now the whole chain is honest: applied volts spin the *rotor*, the *wheel* moves
`1/6.75` as fast, `getDistanceMeters()` divides `getPosition()` by that same
ratio, and the number of meters on the plot matches what the real robot would
roll. If you ever see sim distances off by a suspiciously round factor, check
this chain first — a gear ratio applied twice (or not at all) is the classic
cause.

> Don't forget the `import first.robot.Constants.DriveConstants;` at the top
> of `DriveModule` — added earlier in section 1.

---

## 3. Commands that finish

Stop and notice something about every command you've written so far: none of
them ever *finishes*. `driveAtSpeed` parks forever. `driveWithJoystick` and
`steerToAngle` recompute every tick, forever. They run until something else
kills them — a button release, a rival command. That was fine for "spin while
I hold a button," but "drive exactly one meter" is a different kind of job:
the command itself is the only thing that knows when the job is done, so the
command has to decide **for itself** when to end.

Here's the idea, and it's smaller than it sounds: a coroutine body is just
code, top to bottom, like any method. `driveAtSpeed`'s body never ends because
it calls `coroutine.park()`, which means "suspend here forever." Leave that
call out, and once the body's last line runs, the coroutine is *done* — same
as a method returning — and the command finishes right along with it.

**Add to `DriveModule`, with the other command factories:**

```java
/** Drives forward 'meters' at 'speed', then stops. Finishes on its own. */
public Command driveDistance(double meters, double speed) {
  return run(coroutine -> {
        m_driveMotor.setPosition(0);                              // 1. zero the encoder
        m_driveMotor.setThrottle(speed);                          // 2. drive...
        coroutine.waitUntil(() -> getDistanceMeters() >= meters); // 3. ...until far enough
        m_driveMotor.setThrottle(0);                              // 4. reached it — stop
      })
      .whenCanceled(() -> m_driveMotor.setThrottle(0))
      .named("Drive Distance");
}
```

**Reading it top to bottom:**
1. **`m_driveMotor.setPosition(0)`** tells the encoder "call right here zero"
   — so `getDistanceMeters()` measures *from the start of this command*, not
   since boot.
2. **`m_driveMotor.setThrottle(speed)`** starts the wheel moving, once.
3. **`coroutine.waitUntil(condition)`** is new — a coroutine method that
   suspends the command right here, checking the condition every tick, and
   only lets execution continue once it's true. The condition is a lambda
   that answers true or false — the same trick as Lesson 2's `DoubleSupplier`,
   but yes/no instead of a number.
4. Once `waitUntil` returns, `getDistanceMeters() >= meters` is true, so the
   next line runs: stop the motor. Then the lambda has nothing left to do —
   it falls off the end, the coroutine is done, and so is the command.

One method, four lines, and look at what you built: a command that sets up,
works, waits for done, and cleans up — no separate decorators needed, because
it's just code running in order. That's the payoff of a coroutine body: "do
this, then wait, then do that" *is* Java's normal control flow. You'll write
this shape constantly from here on.

Now look at `.whenCanceled(() -> m_driveMotor.setThrottle(0))` again, because
there's something worth being precise about. **It does *not* fire when the
coroutine body finishes on its own** — only when something *else* interrupts
this command before it gets there, the same button-swap situation Lesson 5
already used it for. Those are genuinely two different endings:

- **Finished** — the body ran to the end by itself. Line 4, `setThrottle(0)`,
  already handled it.
- **Canceled** — something else took the module away first (another command
  scheduled on it, or the driver mashing a different button mid-drive), and
  the body's own line 4 never gets a chance to run.

Every earlier command in this course only had one of those endings —
`driveAtSpeed` and `steerToAngle` never finish on their own, so
`.whenCanceled(...)` was the *only* ending that ever happened, and it was
enough by itself. `driveDistance` is the first command that can end either
way, which is why it's also the first one that needs cleanup written twice:
once for "got there," inline in the body, and once for "got interrupted," in
`.whenCanceled(...)`. Miss either one and the motor keeps spinning in exactly
that scenario — Lesson 1's rule, still true, just now with two doors it can
sneak out of.

Last piece: notice there's no new decorator here at all — `run(...)`,
`.whenCanceled(...)`, `.named(...)` are all things you already had from
Lesson 1. What's new is entirely inside the lambda: a `while`-shaped wait
(`waitUntil`) sitting between two motor commands, in a body that's allowed to
just... end.

---

## 4. A turn-in-place hint

You now have the two ingredients for turning the *robot*: point the wheel
(`steerToAngle` from Lesson 5) and roll it forward (`driveDistance`). A real
swerve robot turns in place by angling all wheels tangent to a circle and
driving them. For one module, you can approximate "turn the robot" as "steer
to an angle, then drive an arc length." Lesson 7 builds the four-module
chassis this turns into, and Lesson 8 does the clean version with a gyro —
but if you want to experiment now, `Command` has an `.andThen(...)` decorator
for exactly this: `steerToAngle(90).andThen(driveDistance(1.0, 0.4)).named("Turn And Drive")`
sequences the two commands, one after the other, and (like every command
builder in this course) needs its own `.named(...)` before it's ready to
schedule. You already know both bricks; snapping them together is the point.

---

## 5. Bind and test

`dpadUp()` is a new button family: the **D-pad** reports its four directions
separately, and `dpadUp()` fires on the up direction — handy once the face
buttons fill up.

**Add to `MyTeleop`'s constructor, with the rest of the wiring:**

```java
// Tap D-pad up to drive forward exactly 1 meter, then stop on its own.
robot.driverController.dpadUp().onTrue(robot.module.driveDistance(1.0, 0.4));
```

Run in sim, plot `DriveModule/DistanceMeters` in AdvantageScope, and tap D-pad
up. The trace should climb to 1.0 and flatten as the command stops itself.
Change the target to `2.0` and confirm it goes twice as far. You've built a
command that *accomplishes a goal and reports done* — exactly what autonomous
routines are made of.

---

## Try it

1. **Reverse:** what happens if you call `driveDistance(1.0, -0.4)`? The condition
   `getDistanceMeters() >= meters` never becomes true because distance goes negative.
   Fix it by changing `coroutine.waitUntil(...)`'s condition to
   `Math.abs(getDistanceMeters()) >= Math.abs(meters)`. This is why you test
   edge cases.
2. **Ease-in with P control:** instead of a constant `speed`, reuse Lesson 5's idea
   — drive at `kP × (meters − getDistanceMeters())` so it slows as it arrives.
   Notice you're applying the *same control pattern* to a new quantity.
3. **Watch the two endings for real.** Add a print right after `waitUntil`
   returns (before the line that stops the motor) and a different print
   inside `.whenCanceled(...)`. Tap D-pad up and let it finish — which one
   printed? Now tap it again and immediately press a different drive button
   to interrupt it — which one printed *that* time? You should see exactly
   one, never both, on either run. That's section 3's split, confirmed by
   watching it happen.

---

## What you learned

Two ideas carried this lesson. The first is that units are yours to build:
**gear ratio** and **wheel circumference** turn rotor rotations into
**meters**, `setPosition(0)` rezeros the encoder so distance means "since
this command started," and named constants keep the conversion honest in one
place. The second is bigger: commands can **finish**, and in this framework
that just means the coroutine body runs out of lines — no `park()`, no more
code, done. `coroutine.waitUntil(condition)` is the shape for "wait right
here until something becomes true," reading top to bottom like ordinary
code instead of chained decorators. The sharper edge underneath that: a
command can end **finished** or **canceled**, they're genuinely different
events, and only `driveDistance` has needed to handle both — one cleanup
written inline for the first, one in `.whenCanceled(...)` for the second.
That distinction is easy to miss and expensive to get wrong, so it's worth
carrying forward deliberately. Lesson 7 turns your one module into four, and
Lesson 9 strings finishing commands into a full autonomous routine. If the
gearbox math felt dense, let the plot reassure you — when the trace stops at
exactly 1.0 meters, every conversion in the chain earned its keep.

Next: Lesson 7 — Four modules.
