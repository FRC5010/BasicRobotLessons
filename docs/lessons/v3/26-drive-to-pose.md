# Lesson 26 — Getting there exactly

**Goal:** Land the robot on an exact pose, by admitting that crossing the field
and landing on a spot are two different jobs — and giving each one its own
controller.

**New Java concepts**
- **`PIDController`**, WPILib's own P/I/D loop, in place of the hand-rolled
  `measure → subtract → multiply → clamp` you've written by hand since
  Lesson 5. You've built the thing it does; now use the library version.
- **Controller objects as fields, not locals.** `atPose()` has to read the
  same error the last `calculate()` saw — a local variable would forget it
  the instant the method returned.

**New robot concepts**
- Why one controller struggles to do two different jobs well
- **`PIDController.setTolerance` / `atSetpoint`** — "arrived" as a decision
  you make, not a fact you observe
- **`enableContinuousInput`** — telling a controller that angles wrap

---

## 1. A sketch you wrote and never used

Open `Drivetrain.java` and find `driveToPose`. You wrote it back in Lesson
11, and you have never once called it. Fifteen lessons later, it's still
sitting there.

*Nothing to add — this is the code you already have:*

```java
  /** Drive straight toward 'target' using P control, field-relative. Finishes within 5 cm. */
  public Command driveToPose(Pose2d target, Supplier<Pose2d> pose) {
    double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond); // convert once, reuse
    return runRepeatedly(() -> {
          Pose2d current = pose.get();
          double dx = target.getX() - current.getX();
          double dy = target.getY() - current.getY();
          double vx = clamp(1.5 * dx, -maxMps, maxMps);
          double vy = clamp(1.5 * dy, -maxMps, maxMps);
          double omega = clamp(
              3.0 * target.getRotation().minus(current.getRotation()).getRadians(),
              -Math.PI, Math.PI);
          ChassisVelocities fieldSpeeds = new ChassisVelocities(vx, vy, omega);
          applyChassisSpeeds(fieldSpeeds.toRobotRelative(current.getRotation()));
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // reached it or interrupted — stop
        .until(() -> pose.get().minus(target).getTranslation().getNorm() < 0.05)
        .named("Drive To Pose");
  }
```

It's honest work: measure the error, multiply by a gain, clamp it, command
it. That's the shape of every controller in this course.

Run it from one corner of the field to a pose four-and-change metres away,
and it takes about **three seconds** to declare success — reporting
**5 cm** out, because that's exactly what you told it to accept.

There's a worse problem hiding in that line, though, and it's worth finding
before someone finds it in a match.

**Read the finish condition again. It only looks at translation.**

`pose.get().minus(target).getTranslation().getNorm()` measures how far the
robot is from the spot. Nothing in there asks which way it's facing. Watch
how bad that gets: place the robot **exactly on the target, facing the
opposite direction**, and run `driveToPose`. It declares arrival
**instantly, on the first tick** — while sitting **180° out of alignment.**
It is, by its own definition, done.

> Every finish condition is a claim about what "done" means, and it is
> worth reading each one as if you were trying to break it. `.until(...)`
> is the most load-bearing line in most commands and usually the least
> examined.

---

## 2. "Arrived" is a decision, not a fact

That `< 0.05` is doing more work than it looks like.

A P controller approaches its target the way a cup of tea approaches room
temperature: quickly at first, then slower and slower, and strictly
speaking never quite getting there. The error curve is an asymptote. So
the controller can never tell you it has arrived — *you* have to decide
how close counts, and the number you pick is the accuracy of your robot.

`driveToPose`'s number is 5 cm, chosen once, in Lesson 11, for a sketch
that was never meant to be the final word.

---

## 3. Two jobs that want opposite things

The instinct is to tighten that one controller until it's accurate enough
for everything. That's the instinct worth arguing with, because crossing
the field and landing on a spot want opposite things.

**Crossing the field** wants speed, and doesn't care about centimetres
three metres out — nobody's landing there. `driveToPose` is already tuned
for exactly that: fast, loose, translation-only.

**Landing on a spot** wants the opposite. Speed is irrelevant over the
last few centimetres. What it wants is a tolerance tight enough to be
worth having — on rotation as well as translation — and a gain that keeps
pushing right up to that line.

One controller compromising between those two jobs is worse at both than
two specialists would be. So use two: `driveToPose` gets you close, fast.
A second, tighter controller takes over from wherever the first one left
off and finishes the job properly.

---

## 4. Stage two: controllers that know when to stop

Three `PIDController`s — one per axis — held as **fields**, because
`atPose()` has to read the same error the last `calculate()` saw. A local
would forget it the moment the method returned.

**Add to `Drivetrain`, below the module array:**

```java
  // Stage two's close-range controllers. Fields, not locals, because
  // atPose() has to read the same error the last calculate() saw.
  private final PIDController m_xController = makeAlignController(
      PathConstants.kAlignP, PathConstants.kPositionTolerance.in(Meters));
  private final PIDController m_yController = makeAlignController(
      PathConstants.kAlignP, PathConstants.kPositionTolerance.in(Meters));
  private final PIDController m_thetaController = makeThetaController();
```

**Add the two builders, below `driveToPose`:**

```java
  /** One axis of the close-range controller: a P gain and the tolerance it stops at. */
  private static PIDController makeAlignController(double kP, double tolerance) {
    PIDController controller = new PIDController(kP, 0, 0);
    controller.setTolerance(tolerance);
    return controller;
  }

  /** The heading controller, told that -180 and +180 are the same place. */
  private static PIDController makeThetaController() {
    PIDController controller = new PIDController(PathConstants.kAlignThetaP, 0, 0);
    controller.enableContinuousInput(-Math.PI, Math.PI);
    controller.setTolerance(PathConstants.kAngleTolerance.in(Radians));
    return controller;
  }
```

`enableContinuousInput` is the last chapter of a story this course has
been telling since Lesson 5. You wrapped angles by hand with a `while`
loop, swapped that for `MathUtil.inputModulus` in Lesson 10, and moved it
into motor firmware with `ContinuousWrap` in Lesson 12. This is the same
idea told to a `PIDController`: the input axis is a circle, so go the
short way. Ask it to turn from 179° to −179° and it commands a small
positive rotation, not a 358° panic.

**Now add `alignToPose` itself, below the builders:**

```java
  /**
   * Close the last stretch to an exact pose. Three controllers on field-relative
   * error, and tolerances that decide when "arrived" is true.
   *
   * <p>Deliberately short-range: its top speed is its gain times the distance
   * it is ever asked to cover, so it is slow by construction rather than by
   * clamping. Send it across the field and it will get there, eventually.
   */
  public Command alignToPose(Pose2d target, Supplier<Pose2d> pose) {
    return runRepeatedly(() -> {
          Pose2d current = pose.get();
          double vx = m_xController.calculate(current.getX(), target.getX());
          double vy = m_yController.calculate(current.getY(), target.getY());
          double omega = m_thetaController.calculate(
              current.getRotation().getRadians(), target.getRotation().getRadians());
          ChassisVelocities fieldSpeeds = new ChassisVelocities(vx, vy, omega);
          applyChassisSpeeds(fieldSpeeds.toRobotRelative(current.getRotation()));
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // reached it or interrupted — stop
        .until(this::atPose)
        .named("Align To Pose");
  }

  /** Arrived — in both senses. Rotation counts, which is what driveToPose forgets. */
  public boolean atPose() {
    return m_xController.atSetpoint() && m_yController.atSetpoint() && m_thetaController.atSetpoint();
  }
```

Notice there's no clamp anywhere in `alignToPose`, and that's deliberate.
Its top speed is its gain times whatever error it's handed —
`3.0 × distance`. That's only safe because of how it's going to be used:
never as the first move of a long trip, only ever as the second half of
one, starting from wherever `driveToPose` already left off. Handed a
five-metre error it would ask for 15 m/s just like the sketch would;
`desaturateWheelVelocities` from Lesson 10 would quietly cap that and the
robot would get there anyway, just badly. The speed limit here is the
*design* — always start close — not a line of code.

**Add the imports `Drivetrain.java` needs:**

```java
import static org.wpilib.units.Units.Radians;

import org.wpilib.math.controller.PIDController;

import first.robot.Constants.PathConstants;
```

**Add `PathConstants` to `Constants.java`, as a new nested class:**

```java
  public static class PathConstants {
    // Stage two's gains. Higher than stage one's, because its errors are tiny
    // by the time it takes over — it only ever starts a short distance away.
    public static final double kAlignP = 3.0;      // m/s per meter of error
    public static final double kAlignThetaP = 4.0; // rad/s per radian of error

    // "Arrived" is a decision, and this is where it gets made.
    public static final Distance kPositionTolerance = Centimeters.of(2);
    public static final Angle kAngleTolerance = Degrees.of(1);

    /** Where the left bumper lines the robot up. */
    public static final Pose2d kScoringPose = new Pose2d(5.0, 4.0, Rotation2d.fromDegrees(90));
  }
```

---

## 5. Chaining the two stages

The command that actually gets you somewhere exactly is just two `await`s
in a row — coarse, then fine, at the same target both times.

**Add to `Autos.java`, below `driveTurnDrive`:**

```java
  /**
   * Get somewhere exactly, in two stages: cross the field with the coarse,
   * five-centimeter sketch from Lesson 11, then close the last stretch with
   * the align controllers, which check rotation too.
   */
  public static Command driveToScoringPose(Drivetrain drivetrain, Localizer localizer) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(drivetrain.driveToPose(PathConstants.kScoringPose, localizer::getPose));
          coroutine.await(drivetrain.alignToPose(PathConstants.kScoringPose, localizer::getPose));
        })
        .named("Drive To Scoring Pose");
  }
```

**Add the imports:**

```java
import first.robot.Constants.PathConstants;
import first.robot.subsystems.Localizer;
```

There's nothing here you haven't written before. `coroutine.await(...)`
runs a command to completion before moving to the next line — the same
tool you used for `driveTurnDrive`'s three steps back in Lesson 9. The
first `await` doesn't finish until `driveToPose`'s own 5 cm check passes;
the second doesn't finish until `alignToPose`'s tighter, rotation-aware
`atPose()` does. Nobody outside this method needs to know that "getting
somewhere exactly" is secretly two different controllers — it's one
command, same as `driveTurnDrive` was one command.

---

## 6. Wire it up

**Add a third `@Autonomous` opmode, `opmode/RobotAutoDriveToPose.java`:**

```java
package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;

@Autonomous(name = "Drive To Pose", group = "Group 1")
public class RobotAutoDriveToPose extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoDriveToPose(Robot robot) {
    this.robot = robot;

    RobotModeTriggers.autonomous().onTrue(
        Autos.driveToScoringPose(robot.drivetrain, robot.localizer));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
```

It shows up on the driver station next to **Drive Turn Drive** and **Do
Nothing** — no chooser code, same as every `@Autonomous` class since
Lesson 9.

The same command is worth having in teleop, too, where lining up on a
scoring position by hand is the slowest thing a driver does.

**Add to `RobotTeleop.java`'s constructor:**

```java
    // Hold the left bumper to line up on the scoring pose: coarse across
    // the field, then slow and exact for the last stretch.
    robot.driverController.leftBumper().whileTrue(
        Autos.driveToScoringPose(robot.drivetrain, robot.localizer));
```

**Add the import:**

```java
import first.robot.commands.Autos;
```

---

## 7. Run it

`./gradlew simulateJava`. Select **Drive To Pose** and run autonomous with
the robot starting well away from the target. Watch it change character
partway through: a fast run across most of the field, then a visibly
slower, more deliberate creep for the last stretch as `alignToPose` takes
over.

Here's what was actually measured, driving from (1, 1) to (5, 4) facing
90° — the exact scenario above, checked with a throwaway test harness
before this page was written, not guessed:

| | Time | Where it actually ended up |
|---|---|---|
| `driveToPose` alone, at its own finish line | 3.02 s | 49 mm out, rotation unchecked |
| Two stages | 3.30 s | **20 mm / 0.003°** |

Two stages costs about a quarter of a second here. What that quarter
second buys is real: **more than double the position accuracy, and a
rotation guarantee `driveToPose` never had at all.** The backwards-facing
demo from section 1 is the sharper way to see why that guarantee matters
— run it again now, and notice `alignToPose` alone would never make that
mistake, because rotation is one of the three things `atPose()` checks
before it's willing to say "done."

Worth plotting while you watch:

| Log key | What to look for |
|---|---|
| `Localizer/Pose` | the handoff — a visible change of pace near the target |

---

## Try it

1. **Break `alignToPose` the same way you broke `driveToPose`.** Comment
   out the rotation term from `atPose()` — just `m_xController.atSetpoint()
   && m_yController.atSetpoint()`. Run the backwards demo again. You've
   just rebuilt section 1's bug with a fancier controller. Put it back,
   and notice that having a `PIDController` doesn't save you from a
   finish condition that doesn't ask the right question — you still have
   to ask it.
2. **Tighten `kPositionTolerance` to 5 mm and watch what it costs.** More
   accuracy is available; it isn't free. Measure how much longer
   `alignToPose` takes to satisfy the new bound, and decide for yourself
   where the trade stops being worth it.
3. **Make the staging distance explicit.** Right now stage two starts
   from wherever stage one's 5 cm check happens to leave the robot. Add a
   `Distance kApproachTolerance` to `PathConstants` and use it in place of
   `driveToPose`'s hardcoded `0.05`, so the handoff distance is a named
   constant instead of a number buried in Lesson 11's code.
4. **Log `Drivetrain/AtPose`.** Right now the only way to know stage two
   finished is watching the robot stop. Add `SmartDashboard.putBoolean(...)`
   for `atPose()` in `logTelemetry()`, the same way every other subsystem
   in this course reports its own "am I done" answer.

---

## What you learned

Fifteen lessons ago you wrote a controller, called it minimal, and never
called it again. This lesson didn't replace it — it gave it a partner,
and a name for the job it was actually good at.

**A finish condition is a claim, and it's worth trying to break.**
`driveToPose`'s `< 0.05` on translation alone looked reasonable until you
put the robot on the target facing backwards and watched it declare
victory on the first tick. That's not a corner case skimmed over by
accident — it's the shape every `.until(...)` in this course deserves to
be checked against.

**Two specialized controllers can beat one compromise controller**, and
not because the library version is fancier than the hand-rolled one.
`driveToPose` and `alignToPose` run nearly the same math — the difference
is that each one only ever has to be good at the job it's actually
doing. Chaining them cost a quarter of a second and bought back more than
double the accuracy, plus a guarantee on rotation that never existed
before.

**`PIDController` is the library version of five lessons of hand-rolled P
control** — `setTolerance`/`atSetpoint` turn "how close counts" into
something you declare instead of something buried in a `.until(...)`
expression, and `enableContinuousInput` closes the angle-wrap story that's
been running since Lesson 5.

Next: [Lesson 27 — Going to get something you just saw](27-object-detection.md).
