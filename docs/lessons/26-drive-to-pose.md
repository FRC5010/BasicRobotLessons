# Lesson 26 — Getting there exactly

**Goal:** Land the robot on an exact pose, by admitting that crossing the field
and landing on a spot are two different jobs — and giving each one its own stage.

**New Java concepts**
- **Building a `Path` in code** — `new Path(new Path.Waypoint(...))`. Up to now
  paths have been files you drew. Now they're data your program makes, which is
  the door Lesson 27 walks through.

**New robot concepts**
- Why one controller can't do both jobs well
- **`PIDController.setTolerance` / `atSetpoint`** — "arrived" as a decision you
  make, not a fact you observe
- **`enableContinuousInput`** — telling a controller that angles wrap
- Staging poses, and sequencing coarse into fine

---

## 1. A sketch you wrote and never used

Open `Drivetrain.java` and find `driveToPose`. You wrote it back in Lesson 11,
the lesson called it "minimal", and you have never once called it. Fifteen
lessons later, it's still sitting there.

*Nothing to add — this is the code you already have:*

```java
    /** Drive toward a field-coordinate pose. The pose now comes from the Localizer. */
    public Command driveToPose(Pose2d target, Supplier<Pose2d> pose) {
        double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond);
        return run(() -> {
            Pose2d current = pose.get();
            double dx = target.getX() - current.getX();
            double dy = target.getY() - current.getY();
            double vx = MathUtil.clamp(1.5 * dx, -maxMps, maxMps);
            double vy = MathUtil.clamp(1.5 * dy, -maxMps, maxMps);
            double omega = MathUtil.clamp(
                    3.0 * target.getRotation().minus(current.getRotation()).getRadians(),
                    -Math.PI, Math.PI);
            applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
                    vx, vy, omega, current.getRotation()));
        }).until(() -> pose.get().minus(target).getTranslation().getNorm() < 0.05);
    }
```

It's honest work: measure the error, multiply by a gain, clamp it, command it.
That's the shape of every controller in this course.

Now actually run it, and the trouble starts. Send the robot from one corner of
the field to a pose four metres away and it reports success after **three
seconds** — at which point it is **five centimetres from where you sent it.**

Not because anything failed. Because five centimetres is precisely what you told
it to accept.

---

## 2. "Arrived" is a decision, not a fact

That `< 0.05` is doing more work than it looks like.

A P controller approaches its target the way a cup of tea approaches room
temperature: quickly at first, then slower and slower, and strictly speaking
never quite getting there. The error curve is an asymptote. So the controller can
never tell you it has arrived — *you* have to decide how close counts, and the
number you pick is the accuracy of your robot.

And the closer you insist on, the more it costs. Push that same sketch from five
centimetres to two, and from "close enough" on rotation to within a degree, and
it needs **3.64 seconds** instead of 3.02. Half a second of autonomous bought by
tightening one number — and the next factor of two costs more again.

There's a worse problem in that line, though, and it's worth finding before
someone finds it at a competition.

**Read the finish condition again. It only looks at translation.**

`pose.get().minus(target).getTranslation().getNorm()` measures how far the robot
is from the spot. Nothing in there asks which way it's facing. So the command
will happily declare victory while the robot is still spinning — or while it's
pointing entirely the wrong way and has no intention of turning.

Watch how bad that gets. Put the robot exactly on the target but facing backwards,
then run the sketch: it declares arrival **immediately**, on the very first tick,
while sitting **176° out of alignment**. It is, by its own definition, done.

> Every finish condition is a claim about what "done" means, and it is worth
> reading each one as if you were trying to break it. `.until(...)` is the most
> load-bearing line in most commands and usually the least examined.

---

## 3. Two jobs that want opposite things

So this needs fixing. The instinct is to tune the gain until it does both jobs
well — and that's the instinct worth arguing with, because the two jobs want
opposite things.

**Crossing the field** wants a route you chose, an acceleration limit so the
wheels don't slip, a high top speed, and a loose finish — nobody cares about
millimetres three metres out. You have exactly that already: it's `FollowPath`,
and Lesson 17 built it.

**Landing on a pose** wants none of that. There's no route to plan across forty
centimetres. Top speed is irrelevant. What it wants is a gain high enough to keep
pushing on errors of a centimetre or two, and a tolerance tight enough to be
worth having — on rotation as well as translation.

One controller has to compromise between those, and a compromise is worse at both
than two specialists would be. So use two.

The plan: **stage one** takes the robot across the field to a *staging pose* a
short distance from the target, using the path follower. **Stage two** closes the
remaining forty centimetres with its own controllers and its own tolerance.

That's not a workaround for a weak library. Real robots are built this way,
because the two problems genuinely are different problems.

---

## 4. Stage one: a path you build in code

Every path so far has been a JSON file you drew. But a staging pose depends on
where you're going, which you might not know until the match is running — so this
one has to be built in code.

`Path` takes path elements directly, and they're the same elements the JSON file
describes. A single `Waypoint` is all this needs.

**Add to `Autos.java`, above `registerEventTriggers`:**

```java
  /**
   * A pose short of the target, backed off along the direction the robot will be
   * facing when it gets there. Stage one drives here; stage two closes the gap.
   */
  private static Pose2d stagingPose(Pose2d target) {
    Translation2d backOff = new Translation2d(-PathConstants.kStagingDistance.in(Meters), 0)
        .rotateBy(target.getRotation());
    return new Pose2d(target.getTranslation().plus(backOff), target.getRotation());
  }
```

`rotateBy` is doing the geometry: step backwards along the robot's own facing,
then rotate that step into field coordinates. It means the robot always approaches
the target from behind, whichever way the target is pointing.

Now the path itself — and it has **one element**.

**Add to `Autos.java`, below `stagingPose`:**

```java
  /**
   * Get somewhere exactly, in two stages: cross the field to a staging pose with
   * the path follower, then close the last stretch with the align controllers.
   *
   * <p>The path is built here, in code, from a single waypoint — it says where to
   * go and nothing about where it starts, because it starts wherever the robot is.
   */
  public static Command driveToPose(Drivetrain drivetrain, Localizer localizer, Pose2d target) {
    Pose2d staging = stagingPose(target);
    Path approach = new Path(new Path.Waypoint(
        staging.getTranslation(),
        PathConstants.kGeneratedHandoffRadius.in(Meters),
        staging.getRotation()));

    return Commands.sequence(
        s_generatedBuilder.build(approach),
        drivetrain.alignToPose(target, localizer::getPose));
  }
```

That one-element path is worth a moment. Every drawn path in this course starts
with a waypoint at the robot's starting position, because you physically placed
the robot there before the match. A path built at runtime can't do that — you
don't know where the robot will be. So it names only the destination, and BLine
drives there from wherever the robot actually is.

Which creates a problem you'd otherwise hit at speed.

**`withPoseReset` snaps the pose estimate to the path's start.** That's right for
a drawn auto — you placed the robot on the line, so the path knows better than
odometry does. It is catastrophically wrong for a generated path, because a
one-waypoint path's "start" *is its destination*. Reset to that and the robot
instantly believes it has already arrived.

So generated paths get their own builder without it.

**Split the pose reset out of `makePathBuilder` — change its last line to:**

```java
        .withDefaultShouldFlip();  // mirror the path for the red alliance
  }
```

**Add the second builder field, below `s_pathBuilder`:**

```java
  /**
   * The same, for paths this program generates at runtime. No pose reset: a
   * generated path names only where it is going, so snapping the estimate to
   * its "start" would teleport the robot's belief to the destination.
   */
  private static FollowPath.Builder s_generatedBuilder;
```

**And build both in `buildChooser`, replacing the single assignment:**

```java
    // A drawn path knows where it starts, because you put the robot there —
    // so snap the estimate to it. A generated path does not, so don't.
    s_pathBuilder = makePathBuilder(drivetrain, localizer)
        .withPoseReset(localizer::resetPose);
    s_generatedBuilder = makePathBuilder(drivetrain, localizer);
```

**Add the import:**

```java
import edu.wpi.first.math.geometry.Translation2d;
```

---

## 5. Stage two: controllers that know when to stop

Now replace the Lesson 11 sketch with something that only has one job.

Three `PIDController`s — one per axis — held as **fields**, because `atSetpoint()`
has to read the same error the last `calculate()` saw. A local would forget.

**Add to `Drivetrain`, below the module array:**

```java
    // The close-range controllers. Fields, not locals, because atPose() has to
    // read the same error the last calculate() saw.
    private final PIDController m_xController = makeAlignController(PathConstants.kAlignP,
            PathConstants.kPositionTolerance.in(Meters));
    private final PIDController m_yController = makeAlignController(PathConstants.kAlignP,
            PathConstants.kPositionTolerance.in(Meters));
    private final PIDController m_thetaController = makeThetaController();
```

**Add the two builders to `Drivetrain`, above `getHeadingDegrees`:**

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

`enableContinuousInput` is the last chapter of a story this course has been
telling since Lesson 5. You wrapped angles by hand with a `while` loop, swapped
that for `MathUtil.inputModulus` in Lesson 10, and moved it into motor firmware
with `ContinuousWrap` in Lesson 12. This is the same idea told to a
`PIDController`: the input axis is a circle, so go the short way. Ask it to turn
from 179° to −179° and it commands a small positive rotation, not a 358° panic.

**Now replace `driveToPose` in `Drivetrain` with:**

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
        return run(() -> {
            Pose2d current = pose.get();
            double vx = m_xController.calculate(current.getX(), target.getX());
            double vy = m_yController.calculate(current.getY(), target.getY());
            double omega = m_thetaController.calculate(
                    current.getRotation().getRadians(), target.getRotation().getRadians());
            applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
                    vx, vy, omega, current.getRotation()));
        })
                .until(this::atPose)
                .finallyDo(() -> applyChassisSpeeds(new ChassisSpeeds()));
    }

    /** Arrived — in both senses. Rotation counts, which is what the old sketch forgot. */
    public boolean atPose() {
        return m_xController.atSetpoint()
                && m_yController.atSetpoint()
                && m_thetaController.atSetpoint();
    }
```

Note the rename: **`driveToPose` is now `alignToPose`.** The name matters, because
this command no longer drives anywhere — it aligns, over a short distance, and
`Autos.driveToPose` is the thing that gets you there first. A method whose name
promises more than it does is how the Lesson 11 version stayed misleading for
fifteen lessons.

**Add the imports to `Drivetrain`:**

```java
import edu.wpi.first.math.controller.PIDController;
import frc.robot.Constants.PathConstants;
```

**And the static import, with the other units:**

```java
import static edu.wpi.first.units.Units.Radians;
```

There's no clamp anywhere in `alignToPose`, and that's deliberate. Its top speed
is its gain times its distance — `3.0 × 0.4 m` is 1.2 m/s, and that ceiling comes
from *how far it is ever asked to travel*, not from a limiter. Hand it a target
across the field and it will ask for 15 m/s; `desaturateWheelSpeeds` from Lesson
10 will quietly scale that down and the robot will get there anyway, just badly.
The speed limit is the design, not the code.

**Add the constants to `PathConstants` in `Constants.java`:**

```java
    // Getting somewhere exactly, in two stages. Stage one is a generated path
    // to a pose short of the target; stage two closes the gap.
    public static final Distance kStagingDistance = Meters.of(0.4);
    public static final Distance kGeneratedHandoffRadius = Meters.of(0.3);

    // Stage two's gains. Higher than the path's, because its errors are tiny —
    // and safe to be higher, because it only ever starts kStagingDistance away.
    public static final double kAlignP = 3.0;      // m/s per meter of error
    public static final double kAlignThetaP = 4.0; // rad/s per radian of error

    // "Arrived" is a decision, and this is where it gets made.
    public static final Distance kPositionTolerance = Centimeters.of(2);
    public static final Angle kAngleTolerance = Degrees.of(1);

    /** Where the left bumper lines the robot up. */
    public static final Pose2d kScoringPose = new Pose2d(3.0, 4.0, Rotation2d.fromDegrees(0));
```

---

## 6. Wire it up

**Add a chooser option in `buildChooser`:**

```java
    chooser.addOption("Drive To Pose",
        () -> driveToPose(drivetrain, localizer, PathConstants.kScoringPose));
```

The same command is worth having in teleop, where lining up on a scoring position
by hand is the slowest thing a driver does.

**Add to `configureBindings` in `RobotContainer`:**

```java
    // Hold the left bumper to line up on the scoring pose: across the field with
    // the path follower, then slow and exact for the last 40 cm.
    m_driverController.leftBumper().whileTrue(
        Autos.driveToPose(m_drivetrain, m_localizer, PathConstants.kScoringPose));
```

That binding needs one thing to have happened first, and it's the kind of ordering
bug that produces a null pointer at startup with no obvious cause.

**Reorder the two calls in `RobotContainer`'s constructor:**

```java
    // Before configureBindings, not after: buildChooser is what creates the path
    // builders, and a binding below now asks Autos to build a command with one.
    m_autoChooser = Autos.buildChooser(m_drivetrain, m_localizer, m_arm);

    configureBindings();
```

**Add the import:**

```java
import frc.robot.Constants.PathConstants;
```

---

## 7. Run it

```powershell
./gradlew simulateJava
```

Select **Drive To Pose** and run autonomous with the robot starting well away from
the target. You should see it clearly change character partway: a fast, profiled
run across the field, a brief pause at the staging pose, then a slow, deliberate
creep onto the target.

Here's what the two approaches actually do, driving from (1, 1) to (5, 4) facing
90°:

| | Time | Where it actually ended up |
|---|---|---|
| Lesson 11 sketch, at its own finish line | 3.02 s | 49.9 mm out |
| Lesson 11 sketch, pushed to 2 cm and 1° | 3.64 s | 20 mm / 1° |
| **Two stages** | **2.58 s** | **17.9 mm / 0.01°** |

Two stages is both **faster and more accurate than one** — a full second quicker
than making the sketch hit the same tolerance, and it arrives pointing the right
way rather than merely near the right spot.

Note that the two-stage result is 17.9 mm, not zero. It stopped because it crossed
the line you drew at 20 mm, and that's the honest ceiling: **you get your
tolerance, not perfection.** If 17.9 mm isn't good enough, the number to change is
`kPositionTolerance`, and the cost will be time.

Worth plotting while you watch:

| Log key | What to look for |
|---|---|
| `Localizer/Pose` | the handoff — a visible change of pace near the target |
| `FollowPath/remainingPathDistanceMeters` | counts down, then stops existing when stage one ends |
| `Drivetrain/ChassisSpeeds` | fast and profiled, then slow and shrinking |

Then hold the left bumper in teleop from various spots on the field and watch it
find the same pose every time — including from the far side, where stage one has
real work to do.

---

## Try it

1. **Tune stage two to settle in under half a second.** It currently takes about
   one. Raise `kAlignP` and find the point where it stops helping — in sim you'll
   run into the module steering rather than the gain, which is itself worth
   seeing.
2. **Make the staging distance too small.** Set `kStagingDistance` to 5 cm and
   explain what you observe. Then set it to 3 m. There's a right answer in the
   middle and a reason for both failures.
3. **Skip stage one when you don't need it.** If the robot is already 30 cm from
   the target, crossing the field to a staging pose is silly. Make
   `Autos.driveToPose` return just the align stage when the robot starts close
   enough. You have everything you need; the only real question is where you get
   the current pose from at the moment the command is *built* versus *run*.
4. **Break the pose reset on purpose.** Build the generated path with
   `s_pathBuilder` instead of `s_generatedBuilder` and watch what happens to
   `Localizer/Pose` the instant the command starts. Then explain it out loud.
5. **Give the tolerance a shape.** Two centimetres in x and y is a square, but
   what you probably mean is a circle of radius 2 cm. Rewrite `atPose` to measure
   actual distance to the target, and work out whether the difference ever matters.

---

## What you learned

The robot can now be sent somewhere and actually arrive there, which is a smaller
sentence than it deserves.

**"Arrived" is something you decide.** A P controller approaches its target
asymptotically and never truly gets there, so every one of these commands ends
because a number in your code said it could. That makes the finish condition the
most important line in the command, and the Lesson 11 sketch is the cautionary
tale: it declared success while 176° out of alignment, and it had been sitting in
your code for fifteen lessons ready to do exactly that.

**When one thing is bad at two jobs, check whether they're the same job.** The
compromise gains that made travel acceptable also made landing sloppy, and no
amount of tuning fixes that — because crossing four metres and closing forty
centimetres genuinely want opposite things. Splitting them made the robot both
faster *and* more accurate, which is the signature of having been solving the
wrong problem.

**Paths are data now.** `new Path(new Path.Waypoint(...))` looks like a small
thing next to a drawn JSON file, but it means a route can depend on something the
robot only learns while it's running. That's not useful yet. It becomes useful the
moment the robot can see something worth driving to.

And a habit worth keeping: **a generated path can't assume where it starts.**
`withPoseReset` is right for a path you drew and placed the robot on, and actively
harmful for one built at runtime. Every convenience feature has a set of
assumptions behind it, and it's worth knowing what they are before the robot
teleports itself onto its own destination.

Go run the left-bumper alignment a few dozen times from silly places. Watching it
land on the same spot every time never quite gets old.
