# Lesson 26 — Getting there exactly

**Goal:** Land the robot on an exact pose without lurching: plan each stage
of the trip as a motion profile, and hand from one stage to the next while
the robot is still moving.

**New Java concepts**
- **`do` … `while`**, a loop whose body always runs at least once.
- **Controller objects as fields, not locals.** The "have we arrived?"
  question has to read what the last tick worked out, and a local variable
  would forget it the moment the method returned.

**New robot concepts**
- **`ProfiledPIDController`**: Lesson 18's motion profile, run in your own
  code instead of in a motor's firmware
- **The plan's speed is the feedforward, P corrects the drift**: the rule
  from Lessons 12 and 18, applied to the whole chassis
- **Handing over while moving**: the second stage plans from how the robot
  is really moving, not from rest
- Driving along a line, and getting pushed back onto it
- **"Arrived" is a decision**: there, stopped, and facing the right way

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

Run it from (1, 1) to a pose five metres away and it takes about **three
seconds** to declare success, reporting **5 cm** out, because that's exactly
what you told it to accept.

There are two worse problems hiding in it, though, and both are worth
finding before someone finds them in a match.

**Look at the very first tick.** Five metres of error times 1.5 is a request
for 7.5 m/s, which the clamp trims to the robot's top speed. So on tick one,
standing still, the sketch asks for full speed. The wheels can't deliver
that instantly. They spin up as hard as the tyres can push, which in this
simulation measured **11.8 m/s²**, the grip limit itself. On a real robot,
that's tyres on the edge of slipping, a lurch that throws everything on the
robot forward, and wheel odometry you can't trust while it lasts.

**Now read the finish condition. It only looks at translation.**
`pose.get().minus(target).getTranslation().getNorm()` measures how far the
robot is from the spot. Nothing in there asks which way it's facing. Place
the robot **exactly on the target, facing the opposite direction**, and run
`driveToPose`. It declares arrival **instantly, on the first tick**, while
sitting **180° out of alignment.** It is, by its own definition, done.

> Every finish condition is a claim about what "done" means, and it is
> worth reading each one as if you were trying to break it. `.until(...)`
> is the most load-bearing line in most commands and usually the least
> examined.

---

## 2. "Arrived" is a decision, not a fact

That `< 0.05` is doing more work than it looks like.

A P controller approaches its target the way a cup of tea approaches room
temperature: quickly at first, then slower and slower, and strictly
speaking never quite getting there. So the controller can never tell you
it has arrived. *You* have to decide what counts, and the number you pick
is the accuracy of your robot.

By the end of this lesson, "arrived" will mean three things at once:
**close enough, slow enough, and facing the right way.** Leave any one of
them out and you can find a case where the robot calls itself done when it
isn't.

---

## 3. Two jobs that want different things

Getting somewhere is really two jobs.

**Covering ground** wants to be firm. Three metres out, nobody cares about
centimetres; what matters is getting up to speed and staying there.

**Arriving** wants to be gentle. The last metre is where the accuracy
lives, and a robot that brakes hard into its target shakes everything on
it, slides, and overshoots.

The obvious move is two controllers, one per job, run one after the other.
That's right, and it's where this lesson ends up. But it's worth seeing how
easy it is to get the handover wrong.

Suppose the first stage hands over a metre out, and the second stage is a
plain P controller like the sketch, three metres per second for every metre
of error. At the handover the robot is doing about 1.7 m/s. The second
stage looks at its one metre of error and asks for **3.0 m/s** on the spot:
measured, the request jumped from 1.5 to 2.9 m/s in a single tick, and
then the robot braked at about 7 m/s² as the error shrank. Each stage was
reasonable on its own. Together they handed over with a jolt.

What's missing is a **plan**: a controller that decides in advance how
fast the robot should be going at each moment, inside limits you choose,
and that can start that plan from however the robot is *actually* moving.
You've already used one.

---

## 4. A plan, not a reaction

Back in Lesson 18, Motion Magic moved the elevator on a **motion profile**:
ramp up, cruise, ramp down, inside a top speed and an acceleration you
chose. Every tick, the profile produced a **setpoint**, where the carriage
should be *right now*, which wasn't the same as the **goal**, where it
should end up, or the **position**, where it actually was.

The motor's firmware ran that profile for the elevator. A swerve drive has
no such firmware for the whole chassis, so you run the profile yourself.
WPILib's **`ProfiledPIDController`** is exactly that: a profile and a P
controller in one object.

*Nothing to add — this is just how the class is used:*

```java
ProfiledPIDController controller = new ProfiledPIDController(
    3.0, 0, 0,                                 // P, I, D
    new TrapezoidProfile.Constraints(3.0, 4.0)); // top speed, acceleration
controller.reset(0.0, 1.4);       // the plan starts here: at 0 m, already doing 1.4 m/s
controller.setGoal(5.0);          // where the plan ends: 5 m, stopped
double correction = controller.calculate(measuredPosition); // moves the plan on one tick
double planSpeed = controller.getSetpoint().velocity;       // how fast the plan says to go
double speed = planSpeed + correction;
```

**Look at that last line, because it's the whole idea.** The plan's own
speed is the feedforward: it's what the robot *should* be doing, worked out
ahead of time. `calculate` returns only the P term, which corrects for the
robot drifting ahead of or behind the plan. That's the rule you met in
Lesson 12, where `kV` turned a requested wheel speed straight into volts,
and again in Lesson 18's elevator: **P is for correcting, not for
sustaining.** Here the profile does the sustaining.

Notice `reset(0.0, 1.4)`. A profile doesn't have to start from rest. Tell
it how fast the robot is already going and it plans from there, which is
exactly what a stage needs when it takes over from another stage that
hasn't stopped.

One more thing a profile can't do, and it's the reason this lesson still
has two stages: a `TrapezoidProfile` uses **the same acceleration to speed
up and to slow down.** Firm out of the blocks and gentle into the target is
two different numbers. One profile can't have both. Two stages can.

---

## 5. Driving along a line

Each stage drives along a straight line from wherever it started to the
target. The profile only cares about one number: **how far along that line
the robot is.** Something else has to keep it *on* the line.

That's a question you've answered before. In Lesson 17, BLine followed
paths with three loops, and one of them was **cross-track**: you're headed
the right way at the right speed, but half a metre to the left of the
line, and this loop pushes you back. You'll use the same idea, and even
the same gain, `PathConstants.kCrossTrackP`.

To get "how far along" and "how far off" out of a field position, measure
the robot from the line's start, then rotate that offset so the line points
along x. **After that rotation, x is how far along the line, and y is how
far off to the left.** To turn a speed along the line and a speed across it
back into field speeds, rotate the other way.

> Why a fixed line, instead of pointing at the target afresh every tick?
> Because the line stays put while the stage runs. If the robot rolls a
> little past the target, "how far along" just reads a little past the
> end, and the plan and P bring it back calmly. A controller that
> re-aimed at the target every tick would suddenly find the target behind
> it, and reverse its whole command in one tick.

---

## 6. The numbers

**Add to `PathConstants` in `Constants.java`, below `kAimTarget`:**

```java
    // Getting somewhere on a plan, in two stages. Stage one covers ground, and
    // can afford to be firm about it.
    public static final LinearVelocity kTravelSpeed = MetersPerSecond.of(3.0);
    public static final LinearAcceleration kTravelAccel = MetersPerSecondPerSecond.of(4.0);

    // Where stage one hands over, and how fast the robot may still be going.
    // Stage two could stop from at most √(2 × 1.5 × 1.0) = 1.73 m/s in that
    // distance; the drive runs about 0.3 m/s behind the plan while slowing at
    // 4 m/s², so plan 1.2 and leave it room.
    public static final Distance kHandoffDistance = Meters.of(1.0);
    public static final LinearVelocity kHandoffSpeed = MetersPerSecond.of(1.2);

    // Stage two arrives, and gently: the last metre is where accuracy lives.
    public static final LinearAcceleration kApproachAccel = MetersPerSecondPerSecond.of(1.5);

    // Turning, in both stages: half a turn a second at most.
    public static final AngularVelocity kTurnSpeed = RadiansPerSecond.of(Math.PI);
    public static final AngularAcceleration kTurnAccel = RadiansPerSecondPerSecond.of(4.0);

    // The same limits in the form a profile takes them: top speed, then acceleration.
    public static final TrapezoidProfile.Constraints kTravelLimits = new TrapezoidProfile.Constraints(
        kTravelSpeed.in(MetersPerSecond), kTravelAccel.in(MetersPerSecondPerSecond));
    public static final TrapezoidProfile.Constraints kApproachLimits = new TrapezoidProfile.Constraints(
        kHandoffSpeed.in(MetersPerSecond), kApproachAccel.in(MetersPerSecondPerSecond));
    public static final TrapezoidProfile.Constraints kTurnLimits = new TrapezoidProfile.Constraints(
        kTurnSpeed.in(RadiansPerSecond), kTurnAccel.in(RadiansPerSecondPerSecond));

    // The trims: what to do about the robot drifting off its plan.
    public static final double kAlignP = 3.0;      // m/s per meter behind or ahead of the plan
    public static final double kAlignThetaP = 4.0; // rad/s per radian of heading error

    // "Arrived" is a decision, and this is where it gets made: close enough,
    // slow enough, and facing the right way.
    public static final Distance kPositionTolerance = Centimeters.of(2);
    public static final LinearVelocity kSpeedTolerance = MetersPerSecond.of(0.05);
    public static final Angle kAngleTolerance = Degrees.of(1);

    /** Where the left bumper lines the robot up. */
    public static final Pose2d kScoringPose = new Pose2d(5.0, 4.0, Rotation2d.fromDegrees(90));
```

**Add the imports to `Constants.java`:**

```java
import static org.wpilib.units.Units.RadiansPerSecond;
import static org.wpilib.units.Units.RadiansPerSecondPerSecond;

import org.wpilib.math.trajectory.TrapezoidProfile;
```

`Constants.java` already imports everything else those lines need.

The handoff speed is the one number here worth working through, because
it's computed, not guessed. Stopping from speed *v* at deceleration *a*
takes *v*² ÷ 2*a* metres. Stage two has 1.0 m to stop in at 1.5 m/s², so
the fastest it can take over at is √(2 × 1.5 × 1.0) = **1.73 m/s**.

Then the robot itself gets a say. The drive motors follow a speed request
a little late: measured, about **0.07 s**, so while stage one slows at
4 m/s² the real speed runs roughly **0.3 m/s** above the plan. Plan the
handoff at 1.73 and the robot arrives at about 2 m/s, too fast to stop in
time. So the plan says **1.2**, and the robot really arrives at about
1.45, safely under the limit. Try It #1 shows what happens when you skip
that step.

> Notice `kApproachLimits` uses `kHandoffSpeed` as its top speed. Stage two
> never speeds up past what it was handed, and if the robot arrives a
> little faster than planned, the profile's first job is to shed the
> excess, gently.

---

## 7. Stage one: covering ground

This section builds the pieces both stages share, then stage one itself.
It all goes in `Drivetrain`.

**Start with the two controllers. Add these fields to `Drivetrain`, below
the gyro fields and above the constructor:**

```java
  // Getting somewhere on a plan. One profile says how far along a straight line
  // the robot should be by now, and how fast it should be going; the other does
  // the same for which way it faces. Fields, not locals, because arrived() has
  // to read what the last tick worked out.
  private final ProfiledPIDController m_alongController = makeAlongController();
  private final ProfiledPIDController m_headingController = makeHeadingController();
```

**Delete `driveToPose` — the sketch from section 1 — and put the builders
where it was:**

```java
  /** Along the line: P to trim the plan, and what counts as arrived — there, and stopped. */
  private static ProfiledPIDController makeAlongController() {
    ProfiledPIDController controller =
        new ProfiledPIDController(PathConstants.kAlignP, 0, 0, PathConstants.kTravelLimits);
    controller.setTolerance(
        PathConstants.kPositionTolerance.in(Meters), PathConstants.kSpeedTolerance.in(MetersPerSecond));
    return controller;
  }

  /** The heading: profiled too, and told that -180 and +180 are the same place. */
  private static ProfiledPIDController makeHeadingController() {
    ProfiledPIDController controller =
        new ProfiledPIDController(PathConstants.kAlignThetaP, 0, 0, PathConstants.kTurnLimits);
    controller.enableContinuousInput(-Math.PI, Math.PI);
    controller.setTolerance(PathConstants.kAngleTolerance.in(Radians));
    return controller;
  }
```

`setTolerance` takes two numbers here. The first is how close counts as
"there"; the second is how slow counts as "stopped". With both set,
`atGoal()` only says yes when the plan has finished *and* the robot is
within both of them.

`enableContinuousInput` is the last chapter of a story this course has
been telling since Lesson 5. You wrapped angles by hand with a `while`
loop, swapped that for `MathUtil.inputModulus` in Lesson 10, and moved it
into motor firmware with `ContinuousWrap` in Lesson 12. This is the same
idea told to a controller: the input is a circle, so go the short way.
Ask it to turn from 179° to −179° and it plans a small turn, not a 358°
one.

**Next, below the builders, the line's frame from section 5:**

```java
  /** Where 'current' sits relative to a line: x is how far along it, y how far off to the left. */
  private static Translation2d inLineFrame(Translation2d start, Rotation2d direction, Pose2d current) {
    return current.getTranslation().minus(start).rotateBy(direction.unaryMinus());
  }
```

**Then the start of a stage, which is where the handover happens:**

```java
  /**
   * Start a stage's plan from how the robot is really moving right now, under
   * this stage's limits. A plan that assumed the robot was standing still
   * would ask a moving robot to stop dead on its first tick.
   */
  private void startStage(Pose2d current, Rotation2d direction, TrapezoidProfile.Constraints limits) {
    ChassisVelocities moving = getChassisVelocities().toFieldRelative(current.getRotation());
    Translation2d velocity = new Translation2d(moving.vx, moving.vy);
    m_alongController.setConstraints(limits);
    m_alongController.reset(0.0, velocity.rotateBy(direction.unaryMinus()).getX());
    m_headingController.reset(current.getRotation().getRadians(), moving.omega);
  }
```

Three lines do the real work. `getChassisVelocities()` is Lesson 17's
measured speed, from the wheels themselves, not what was last asked for.
Rotating it into the line's frame and taking x gives "how fast along the
line". And `reset` starts the plan at the beginning of the line, already
moving at that speed. The heading gets the same treatment with the measured
turning rate. `setConstraints` is how one controller serves both stages:
same controller, different limits.

**Then one tick of following the line:**

```java
  /**
   * One tick of a stage: keep to the plan along the line, steer back onto the
   * line, and turn toward the target's heading. Each speed is the plan's own
   * speed, plus P on how far the robot has drifted from the plan.
   */
  private void followLine(Translation2d start, Rotation2d direction, Pose2d target, Pose2d current) {
    Translation2d where = inLineFrame(start, direction, current);
    double alongCorrection = m_alongController.calculate(where.getX()); // also moves the plan on a tick
    double alongSpeed = m_alongController.getSetpoint().velocity + alongCorrection;
    double acrossSpeed = -PathConstants.kCrossTrackP * where.getY();
    Translation2d velocity = new Translation2d(alongSpeed, acrossSpeed).rotateBy(direction);

    double turnCorrection = m_headingController.calculate(
        current.getRotation().getRadians(), target.getRotation().getRadians());
    double omega = m_headingController.getSetpoint().velocity + turnCorrection;

    ChassisVelocities fieldSpeeds = new ChassisVelocities(velocity.getX(), velocity.getY(), omega);
    applyChassisSpeeds(fieldSpeeds.toRobotRelative(current.getRotation()));
  }
```

**Watch the order on the `along` lines.** `calculate` steps the plan
forward a tick, so it has to run *before* `getSetpoint()` reads the plan's
speed. Swap them and you're always feeding forward last tick's plan.

The across speed has a minus sign because y is "off to the left": a robot
to the left gets pushed right.

**Finally, stage one itself, below `followLine`:**

```java
  /**
   * Stage one: cover ground. Firm limits, and it finishes a short way out while
   * still moving, so stage two takes over from a robot in motion.
   */
  public Command travelToward(Pose2d target, Supplier<Pose2d> pose) {
    return run(coroutine -> {
          Pose2d current = pose.get();
          Translation2d start = current.getTranslation();
          Translation2d toTarget = target.getTranslation().minus(start);
          Rotation2d direction = toTarget.getAngle().orElse(current.getRotation()); // already there: any way will do
          double handoff = toTarget.getNorm() - PathConstants.kHandoffDistance.in(Meters);

          startStage(current, direction, PathConstants.kTravelLimits);
          m_alongController.setGoal(
              new TrapezoidProfile.State(handoff, PathConstants.kHandoffSpeed.in(MetersPerSecond)));
          while (inLineFrame(start, direction, current).getX() < handoff) {
            followLine(start, direction, target, current);
            coroutine.yield();
            current = pose.get();
          }
          // No stop here: stage two takes over from a robot that's still moving.
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // interrupted — stop
        .named("Travel Toward");
  }
```

The goal is the interesting line. `TrapezoidProfile.State` is a position
*and* a speed, and stage one's goal is the handoff point, a metre short of
the target, **still moving at `kHandoffSpeed`.** The profile ramps up,
cruises, then slows to exactly that speed by exactly that point.

`toTarget.getAngle()` is the same `Optional` Lesson 25's aiming code got
back: empty when the robot is already on the target, because an arrow with
no length has no direction. `orElse(...)` says what to use instead, and
any direction will do for a line with nothing left to drive along.

When the loop ends, the command simply finishes, and there's no stop
command after it. That's the point: the robot is meant to keep moving into
stage two. Only `whenCanceled` stops it, because only an interruption
means nothing is coming next.

---

## 8. Stage two: arriving

**Add below `travelToward`:**

```java
  /**
   * Stage two: arrive. Gentler limits, a plan that starts from however the robot
   * is really moving, and a finish that waits until it's there, on the line,
   * facing the right way, and stopped.
   */
  public Command approach(Pose2d target, Supplier<Pose2d> pose) {
    return run(coroutine -> {
          Pose2d current = pose.get();
          Translation2d start = current.getTranslation();
          Translation2d toTarget = target.getTranslation().minus(start);
          Rotation2d direction = toTarget.getAngle().orElse(current.getRotation());

          startStage(current, direction, PathConstants.kApproachLimits);
          m_alongController.setGoal(toTarget.getNorm()); // the end of the line, stopped
          do {
            followLine(start, direction, target, current);
            coroutine.yield();
            current = pose.get();
          } while (!arrived(start, direction, current));
          applyChassisSpeeds(new ChassisVelocities()); // arrived — stop
        })
        .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities())) // interrupted — stop
        .named("Approach");
  }

  /** Arrived: at the end of the line and stopped, on the line, and facing the right way. */
  private boolean arrived(Translation2d start, Rotation2d direction, Pose2d current) {
    double offLine = Math.abs(inLineFrame(start, direction, current).getY());
    return m_alongController.atGoal()
        && offLine < PathConstants.kPositionTolerance.in(Meters)
        && m_headingController.atGoal();
  }
```

It's stage one's shape with three differences: the gentle limits, a goal
of the target itself with a speed of zero, and a finish that asks
`arrived()`.

That loop is a **`do` … `while`**, which is new. It's a `while` with the
test moved to the bottom, so the body always runs at least once. That's
the right shape here: `atGoal()` reports on the last `calculate()`, so its
answer only means something after a step. A plain `while` would ask first,
about a plan that hasn't taken a single step.

`arrived()` asks all three of section 2's questions. The along controller
covers "there and stopped". `offLine` covers "on the line". The heading
controller covers "facing the right way". The facing-backwards trap from
section 1 can't happen here, because rotation is one of the things it
waits for.

**Add the imports `Drivetrain.java` needs:**

```java
import static org.wpilib.units.Units.Meters;
import static org.wpilib.units.Units.Radians;

import org.wpilib.math.controller.ProfiledPIDController;
import org.wpilib.math.trajectory.TrapezoidProfile;

import first.robot.Constants.PathConstants;
```

---

## 9. Chaining the two stages

The command that actually gets you somewhere exactly is two `await`s in a
row, at the same target both times.

**Add to `Autos.java`, above `makePathBuilder`:**

```java
  /**
   * Get somewhere exactly, in two stages: cover ground on firm limits, then hand
   * over, still moving, to a gentler approach that picks up from however the
   * robot is really moving and finishes stopped on the spot.
   */
  public static Command driveToScoringPose(Drivetrain drivetrain, Localizer localizer) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(drivetrain.travelToward(PathConstants.kScoringPose, localizer::getPose));
          coroutine.await(drivetrain.approach(PathConstants.kScoringPose, localizer::getPose));
        })
        .named("Drive To Scoring Pose");
  }
```

`Autos` already imports `PathConstants` and `Localizer` from Lesson 17.

`coroutine.await(...)` runs a command to completion before moving to the
next line, the same tool you used for `driveTurnDrive` back in Lesson 9.
The first `await` finishes the moment stage one reaches the handoff point,
and the second picks up a robot still rolling at about 1.45 m/s and plans
from there. Nobody outside this method needs to
know there are two stages. It's one command.

---

## 10. Wire it up

**Create `opmode/RobotAutoDriveToPose.java`:**

```java
package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;

/**
 * Drives to the scoring pose. It has no annotation, so the opmode scan skips
 * it; Robot registers it with addOpMode, next to the path autos.
 */
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

Look at what's missing: the `@Autonomous` line. Since Lesson 25, autos are
registered in `Robot`, and an annotated class with the same name as a
registered one stops the program at boot. This one isn't a drawn path, so it
gets a class of its own instead of a `PathAuto`, but it's registered the same
way.

**In `Robot`'s constructor, add this above the comment that ends with
`publishOpModes()`:**

```java
    // Not a drawn path, so it has its own opmode class, but registered the same
    // way: an annotated class would be found by the scan, and this one isn't.
    addOpMode(RobotMode.AUTONOMOUS, "Drive To Pose", "Poses", () -> new RobotAutoDriveToPose(this));
```

**Add the import to `Robot.java`:**

```java
import first.robot.opmode.RobotAutoDriveToPose;
```

It shows up in the selector under its own group, **Poses**, beside **Paths**.
The `publishOpModes()` call that was already there announces it too.

The same command is worth having in teleop, too, where lining up on a
scoring position by hand is the slowest thing a driver does.

**Add to `RobotTeleop.java`'s constructor:**

```java
    // Hold the left bumper to line up on the scoring pose: firm across the
    // field, then a gentle approach that ends stopped on the spot.
    robot.driverController.leftBumper().whileTrue(
        Autos.driveToScoringPose(robot.drivetrain, robot.localizer));
```

**Add the import:**

```java
import first.robot.commands.Autos;
```

---

## 11. Run it

Run the robot in simulation. Select **Drive To Pose** and run autonomous with
the robot starting well away from the target. This opmode doesn't set the
simulated robot down anywhere the way **Paths** does, so a second run starts
where the first one ended: on the pose. Drive away in teleop first (or hold
the left bumper from somewhere else).

Here's what was measured driving from (1, 1) facing 0° to (5, 4) facing 90°,
with a throwaway test that ran the real `Robot` loop in simulation, three
times over. The error is measured against the simulated chassis's true
position, not the estimate:

| | Old: sketch, then P | Two profiled stages |
|---|---|---|
| Time to "arrived" | 3.5 s | 3.4 s |
| Where it ended up | 14 mm out | **7–8 mm out, under 0.01°** |
| Hardest acceleration at the start | 11.8 m/s² (the tyres' limit) | about 4 m/s² on average, 6–8 at peak |
| At the handover | nearly stopped (0.08 m/s) | still moving, about 1.45 m/s |
| Slowing into the target | not measured | about 1.4 m/s² on average |

The time barely changed. What changed is *how* it gets there: no launch at
the tyres' limit, no stop in the middle, and a gentle last metre. The
peaks above 4 m/s² at the start are what you'd expect from the P term: the
wheels take a moment to spin up, the robot falls behind the plan, and P
pushes to catch it up.

Two other runs worth doing yourself:

- **Start on the target, facing backwards.** The sketch called that done on
  tick one. Now stage one finishes at once (it's already past its handoff
  point), and stage two turns the robot round on the spot: measured, about
  **2.2 s**, ending 0.1 mm and 0.3° out.
- **Start 0.6 m away.** That's already inside the handoff distance, so
  stage one finishes immediately and stage two does the whole trip: about
  **1.65 s**, 1 cm out.

You'll also see two honest imperfections in the field view:

> **The robot rolls a few centimetres past the target and comes back.**
> Measured, 37 mm. That's the same 0.07 s drive lag from section 6: the real
> speed trails the plan, so it reaches the end of the line still moving a
> little. The plan and P bring it back, and `arrived()` won't say yes
> until it's stopped.
>
> **The path bows out sideways while the robot turns.** Measured, about
> 26 cm at the widest, on a trip that turns 90°. The same trip with no turn
> stays within about 11 mm of the line, so it's the turning that does it:
> a chassis that turns and drives at once doesn't quite go where it was
> told. The cross-track term pulls it back; it can't prevent it.

Worth plotting while you watch:

| Log key | What to look for |
|---|---|
| `Localizer/Pose` | the bow while it turns, and the small roll past the target |
| `Drivetrain/CurrentCommand` | `Travel Toward`, then `Approach` |

---

## Try it

1. **Hand over at the limit.** Set `kHandoffSpeed` to 1.73, the most
   section 6's arithmetic allows, and run it again. The robot really
   arrives at the handoff at about 1.95 m/s, too fast to stop in a metre at
   1.5 m/s². Measured, it overshot by **46 cm**, came back, and took
   **4.5 s** instead of 3.4. A plan that ignores how the robot actually
   responds isn't a plan.
2. **Start every stage from rest.** In `startStage`, change both `reset`
   calls to start at a speed of `0.0`. Run it and watch the handover: a
   plan that starts at zero tells a robot doing 1.45 m/s to be standing
   still. Measured, it braked at the tyres' limit, **11.8 m/s²**, and the
   trip took **3.8 s** instead of 3.4. That's the jolt this lesson exists
   to remove, and it comes from one wrong number.
3. **Take "stopped" out of arrived.** Set `kSpeedTolerance` to something
   enormous. Stage two now finishes while the robot is still rolling, and
   the stop after the loop has to catch it: measured, it ended **12 mm**
   out instead of 7. Then put it back and decide which of the three
   questions in `arrived()` you could do without. (None.)
4. **Move the handover.** Hand over 2 m out instead of 1. Work out the new
   largest safe `kHandoffSpeed` before you run it, allow for the lag, and
   measure how much time it costs or saves.
5. **Give the drive motors an acceleration term.** Since Lesson 12 the
   drive motors have had `kV` and `kP` but no `kA`, so every change of
   speed has to open up an error before P pushes for it. That's a likely
   suspect for section 6's lag, though nobody has measured how much of it.
   Phoenix's `VelocityVoltage` takes an acceleration too
   (`withAcceleration`, used with `Slot0.kA`). Work out `kA` the way
   Lesson 18 did, pass the profile's acceleration down to each module, and
   measure whether the lag and the roll-past shrink. This one touches
   `ModuleIO` and `SwerveModule`, so plan it before you type it.
6. **Log the plan against reality.** Log the along controller's setpoint
   position next to the robot's real progress along the line, every tick.
   Your code works out both, so both are outputs: `Logger.recordOutput`.
   Plot both. The gap between them is exactly what the P term is fighting.

---

## What you learned

Fifteen lessons ago you wrote a controller, called it minimal, and never
called it again. This lesson retired it, after finding two things wrong with
it that a match would have found for you: it launches as hard as the tyres
allow, and it declares victory facing the wrong way.

**A profile is a plan, and P is for the drift.** The robot now knows ahead
of time how fast it should be going at every moment, inside limits you
chose. The plan's speed is fed forward and P only corrects the difference,
the same rule as the drive motors' `kV` and the elevator's. The drive
didn't need a new idea, just the one you already had, applied to the whole
chassis.

**Two stages, one motion.** Covering ground and arriving want different
accelerations, and a trapezoid profile has only one, so there are two
stages. The handover is what made them one motion instead of two: stage
two plans from how the robot is *really* moving. Get that one number wrong
and the robot brakes at the tyres' limit in the middle of the field.

**A plan has to fit the robot.** The handoff speed came from arithmetic,
then got trimmed for a lag you measured. Skip the trim and the robot
overshoots by half a metre. The plan was right on paper and wrong on the
robot.

**"Arrived" is a decision with three parts**: there, stopped, and facing
the right way. Every one of them is a line in `arrived()`, and every one
of them has a demonstration of what goes wrong without it.

If the line-frame rotations still feel slippery, that's normal: draw the
line, draw the robot off to one side, and rotate the paper until the line
points right. That's all the code is doing.

Next: [Lesson 27 — Keeping the nose on the target](27-aim-at-tag.md).
