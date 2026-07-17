# Lesson 11 — Odometry & the field view

**Goal:** Track where the robot is on the field over time — its **pose** (x, y,
heading) — by combining the gyro and how far each wheel has rolled. Then log
that pose and watch the robot drive around a real field in AdvantageScope's
**Odometry** tab.

**New Java concepts**
- Building an array in a loop
- Small data-carrier types that bundle a couple of values (`SwerveModulePosition`,
  `Pose2d`)

**New robot concepts**
- **Odometry** — dead-reckoning the chassis pose from wheel motion + heading
- **`SwerveModulePosition`** — the "how far and in what direction" report each
  wheel owes odometry every tick
- **`SwerveDriveOdometry`** — the accumulator that turns those reports into a
  pose
- Logging a **`Pose2d`** so AdvantageScope can draw the robot on a field
- Why the same setup upgrades cleanly to **`SwerveDrivePoseEstimator`** when
  you add vision

---

## 1. Why odometry?

Right now the logs tell you `getHeadingDegrees()` and `getDistanceMeters()`
from module 0 — useful, but each is a *scalar*. You can't tell from those
numbers alone that the robot is at (2.3 m, 1.1 m) facing 35°. That's a
**pose**, and knowing it unlocks:

- Field-relative visualizations (watch the robot move on a field).
- Auto routines that say "drive to (5, 3)" instead of "drive forward 2 m."
- Vision fusion (Lesson 12 territory — align odometry with camera-based
  measurements).

The idea itself is old — sailors called it **dead reckoning**: no GPS, but if
you know your heading and how far you've traveled each hour, you can plot
your position on the chart. Our version just samples fifty times a second:
WPILib's `SwerveDriveOdometry` combines **wheel motion** (how far each wheel
rolled and in which direction) with **gyro heading**, integrates the change
every tick, and answers `getPoseMeters()` any time you ask.

---

## 2. Have each module report its position

Odometry needs a `SwerveModulePosition` per corner: the wheel's accumulated
distance and its current steer angle. Both halves are question-methods you
already have — this just bundles them. Add to `SwerveModule`, with the other
public methods:

```java
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
```

```java
/** How far this wheel has rolled and where it's pointing — for odometry. */
public SwerveModulePosition getPosition() {
  return new SwerveModulePosition(
      getDistanceMeters(),
      Rotation2d.fromDegrees(getSteerAngleDegrees()));
}
```

**`SwerveModulePosition`** is another lightweight data carrier — no behavior,
just two values riding together. By now you've met the whole family
(`ChassisSpeeds`, `SwerveModuleState`, and soon `Pose2d`), and the pattern
behind them should be visible: WPILib bundles related numbers into little
named types because a `SwerveModulePosition` in a method signature says
*meters and an angle, in that order* — where two bare `double`s say nothing
and let you swap them silently.

---

## 3. Add odometry to the Drivetrain

Odometry needs the kinematics you built in Lesson 10, the current heading, and
the initial wheel positions. Add to `Drivetrain` — and note the field goes
*below* both `m_modules` and `m_kinematics`, because its construction reads
both. Same ordering rule as always: dependencies first.

```java
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.SwerveDriveOdometry;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
```

```java
private final SwerveDriveOdometry m_odometry = new SwerveDriveOdometry(
    m_kinematics,
    Rotation2d.fromDegrees(getHeadingDegrees()),
    modulePositions());

/** Snapshot the four modules' positions into one array — used by odometry. */
private SwerveModulePosition[] modulePositions() {
  SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];
  for (int i = 0; i < m_modules.length; i++) {
    positions[i] = m_modules[i].getPosition();
  }
  return positions;
}

public Pose2d getPose() {
  return m_odometry.getPoseMeters();
}
```

The private helper **builds an array in a loop** — you half-met this in
Lesson 7's `states` array, and here it is as a full standalone pattern:
`new SwerveModulePosition[m_modules.length]` allocates the empty slots, the
loop fills each one, and the method hands back the finished array. Reach for
this shape any time a library wants an array whose contents change every
tick. (Sizing it with `m_modules.length` instead of a literal `4` means one
less place to fix if the module count ever changes.)

Then in `periodic()`, feed odometry the newest sample every tick:

```java
  @Override
  public void periodic() {
    // ...the module loop and logging from Lessons 7–8 stay...

    m_odometry.update(
        Rotation2d.fromDegrees(getHeadingDegrees()),
        modulePositions());
  }
```

That's the whole loop: `update(newHeading, newPositions)` → odometry integrates
the change since the last call → `getPose()` gives you the running total.

---

## 4. Draw the robot: log the pose

Here's where the logging discipline you've kept since Lesson 3 pays off in
full. Drawing the robot on a field takes exactly one more line in
`periodic()`, right after the update:

```java
    Logger.recordOutput("Drivetrain/Pose", getPose());
```

`Pose2d` is a structured value, like the module states in Lesson 7 — and
AdvantageScope knows how to *draw* a logged pose, not just plot it. Run
`./gradlew simulateJava`, then in AdvantageScope:

1. Connect to the sim (**File → Connect to Simulator**).
2. Add an **📐 Odometry** tab and drag `Drivetrain/Pose` onto it.
3. Pick a field image (e.g., the current game) from the source dropdown.
4. Drive with the joysticks. The little robot moves and rotates on the field.

If everything is wired right, driving forward moves the robot along +X,
strafing slides it along +Y, and spinning rotates it — the coordinate
convention you memorized in Lesson 7, now visible as motion on a map. Driving
in the sim officially looks like a game. Take a lap.

---

## 5. Reset and starting pose

Autos usually start from a known place. Add:

```java
public void resetPose(Pose2d pose) {
  m_odometry.resetPosition(
      Rotation2d.fromDegrees(getHeadingDegrees()),
      modulePositions(),
      pose);
}
```

Call it at the top of an auto factory so odometry starts at, say,
`new Pose2d(2, 5, Rotation2d.fromDegrees(0))`. Everything the auto reports from
then on is anchored to that origin.

---

## 6. Field-relative auto with a real pose

Once odometry works, auto routines can talk in field coordinates. A minimal
sketch — drive toward a target pose using P control on the position error, with
`applyChassisSpeeds` from Lesson 10 doing the actuation:

```java
public Command driveToPose(Pose2d target) {
  return run(() -> {
    Pose2d current = getPose();
    double dx = target.getX() - current.getX();
    double dy = target.getY() - current.getY();
    double vx = MathUtil.clamp(1.5 * dx, -DriveConstants.kMaxSpeedMps, DriveConstants.kMaxSpeedMps);
    double vy = MathUtil.clamp(1.5 * dy, -DriveConstants.kMaxSpeedMps, DriveConstants.kMaxSpeedMps);
    double omega = MathUtil.clamp(
        3.0 * target.getRotation().minus(current.getRotation()).getRadians(),
        -Math.PI, Math.PI);
    applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
        vx, vy, omega, current.getRotation()));
  }).until(() -> getPose().minus(target).getTranslation().getNorm() < 0.05);
}
```

Squint at it and you'll see three copies of Lesson 5 stacked up — one P
controller for x, one for y, one for heading, each doing measure-subtract-
multiply-clamp, with `applyChassisSpeeds` as the shared "command" step.
Robotics really is one idea reused with different sensors. (The `1.5` and
`3.0` gains are inlined here because this is a sketch — if this command
graduates into your real robot, they belong in `Constants.java` like every
other tuning number.)

> **When you outgrow odometry:** wheels slip, wheels drift, and after a minute
> of driving the pose can be meters off from reality. **`SwerveDrivePoseEstimator`**
> is a drop-in replacement that fuses odometry with camera measurements
> (AprilTags, etc.) to keep the pose honest. Same `update` shape; extra
> `addVisionMeasurement(...)` calls when you have a camera pose.

---

## Try it

1. Reset the pose at the start of teleop (`m_drivetrain.resetPose(new Pose2d())`
   from a button) and confirm the robot on the field jumps back to (0, 0, 0°).
2. Drive a square with the sticks — forward a meter or so, strafe, back,
   strafe — and try to end exactly where you started. Watch how far off the
   field view says you are. That accumulating error is *drift*, and it's why
   teams add vision.
3. Refactor `driveToPose` to use a `Rotation2d`-aware helper (the
   `target.getRotation().minus(current.getRotation()).getRadians()` line
   handles wrap-around because `Rotation2d` knows about the circle — try
   printing it as you rotate past 180° to see it stay in `(-π, π]`).

---

## What you learned — and where to go next

Odometry closed the last gap between "the robot can move" and "the robot
knows where it is": each module reports a **`SwerveModulePosition`**,
**`SwerveDriveOdometry`** integrates those reports with the gyro heading into
a running **`Pose2d`**, and one logged pose turns AdvantageScope's field view
into a live map. The Java pattern to keep is **building an array in a loop**
— allocate the slots, fill them, hand it off — and the deeper pattern is the
one you spotted in `driveToPose`: everything in this course has been
measure-subtract-multiply-clamp-command wearing different sensors.

That's the course. You have a full command-based swerve robot that can be
driven, plotted, simulated, tuned, auto'd, and located on a field — and every
piece of it is something you typed yourself and can explain. Where to go
next, in rough order of payoff:

- **AprilTags + PhotonVision:** feed vision poses into
  `SwerveDrivePoseEstimator.addVisionMeasurement(...)`. Suddenly you know
  where you are absolutely, not just relatively.
- **Trajectory following:** `PathPlanner` or `Choreo` turn a drawn path into a
  time-parameterized trajectory your `driveToPose` pattern can chase.
- **Real Phoenix control:** replace hand-rolled P steering with a
  `PositionVoltage` / `MotionMagicVoltage` on-motor closed loop. The
  bookkeeping stays; the tuning gets much better.
- **A second mechanism:** the `Subsystem` + `Command` + `startEnd`/`run` +
  `finallyDo` toolkit you built here is the same for a shooter, an elevator,
  or an intake. Same shape, different actuator.

Wherever you go next, you're not starting over — you're reusing the spine.
