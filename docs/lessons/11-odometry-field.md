# Lesson 11 — Odometry and the `Field2d` view

**Goal:** Track where the robot is on the field over time — its **pose** (x, y,
heading) — by combining the gyro and how far each wheel has rolled. Then show
the robot moving on a **`Field2d`** widget in AdvantageScope.

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
- **`Field2d`** — a top-down field view that draws your robot
- Why the same setup upgrades cleanly to **`SwerveDrivePoseEstimator`** when
  you add vision

---

## 1. Why odometry?

Right now the plots tell you `getHeadingDegrees()` and `getDistanceMeters()`
from module 0 — useful, but each is a *scalar*. You can't tell from those
numbers alone that the robot is at (2.3 m, 1.1 m) facing 35°. That's a
**pose**, and knowing it unlocks:

- Field-relative visualizations (watch the robot move on a field).
- Auto routines that say "drive to (5, 3)" instead of "drive forward 2 m."
- Vision fusion (Lesson 12 territory — align odometry with camera-based
  measurements).

WPILib's `SwerveDriveOdometry` computes pose by combining **wheel motion** (how
far each wheel rolled and in which direction) with **gyro heading**. Every tick
you feed it the newest readings, it integrates the change, and you can ask
`getPoseMeters()` any time.

---

## 2. Have each module report its position

Odometry needs a `SwerveModulePosition` per corner: the wheel's accumulated
distance and its current steer angle. Add to `SwerveModule`:

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

**`SwerveModulePosition`** is a lightweight data carrier — no behavior, just two
public fields. WPILib is full of these little bundles (`ChassisSpeeds`,
`SwerveModuleState`, `Pose2d`) because they make method signatures readable and
force you to pass units consistently.

---

## 3. Add odometry to the Drivetrain

Odometry needs the kinematics you built in Lesson 10, the current heading, and
the initial positions. Add to `Drivetrain`:

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

**New idea:** the private helper **builds an array in a loop**. `new
SwerveModulePosition[m_modules.length]` allocates space; the loop fills each
slot. That pattern shows up any time you need to hand a library an array whose
contents change every tick.

Then in `periodic()`, feed odometry the latest sample every tick:

```java
@Override
public void periodic() {
  for (SwerveModule module : m_modules) {
    module.periodic();
  }
  m_odometry.update(
      Rotation2d.fromDegrees(getHeadingDegrees()),
      modulePositions());
  SmartDashboard.putNumber("Heading (deg)", getHeadingDegrees());
}
```

That's the whole loop: `update(newHeading, newPositions)` → odometry integrates
the change since the last call → `getPose()` gives you the running total.

---

## 4. Draw the robot: `Field2d`

`Field2d` is a WPILib "sendable" that publishes a robot pose to a dashboard
that knows how to draw it (SmartDashboard, Glass, AdvantageScope). Add to
`Drivetrain`:

```java
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
```

```java
private final Field2d m_field = new Field2d();

// in the constructor:
SmartDashboard.putData("Field", m_field);
```

And extend `periodic()` to push the current pose:

```java
m_field.setRobotPose(getPose());
```

Run `./gradlew simulateJava`. In **AdvantageScope**:

1. Connect to the sim (**File → Connect to Simulator**).
2. Add an **📐 Odometry** tab, then drag "SmartDashboard/Field/Robot" onto it.
3. Optionally pick a real field image (e.g., 2026 game) from the source dropdown.
4. Drive with the joystick. The little arrow moves and rotates on the field.

If everything is wired right, translating forward moves the robot up, strafing
moves it sideways, and spinning rotates the arrow — driving in the sim now looks
like a game.

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
example — drive to a target pose using P control on the position error:

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
    ChassisSpeeds robotSpeeds = ChassisSpeeds.fromFieldRelativeSpeeds(
        vx, vy, omega, current.getRotation());
    // ...(same downstream as drive() in Lesson 10)...
  }).until(() -> getPose().minus(target).getTranslation().getNorm() < 0.05);
}
```

Three P controllers stacked on one another — one for x, one for y, one for
heading — is exactly Lesson 5's pattern applied to a `Pose2d`. Robotics really
is one idea reused with different sensors.

> **When you outgrow odometry:** wheels slip, wheels drift, and after a minute
> of driving the pose can be meters off from reality. **`SwerveDrivePoseEstimator`**
> is a drop-in replacement that fuses odometry with camera measurements
> (AprilTags, etc.) to keep the pose honest. Same `update` shape; extra
> `addVisionMeasurement(...)` calls when you have a camera pose.

---

## Try it

1. Reset the pose at the start of teleop (`m_drivetrain.resetPose(new Pose2d())`
   from a button) and confirm the arrow on the field jumps back to (0, 0, 0°).
2. Drive a manual square: `translate` forward one wheel-diameter's worth
   several times, watch the field, and see how much error accumulates by the
   time you're back where you started. That drift is why teams add vision.
3. Refactor `driveToPose` to use a `Rotation2d`-aware helper (the
   `target.getRotation().minus(current.getRotation()).getRadians()` line
   handles wrap-around because `Rotation2d` knows about the circle — try
   printing it as you rotate past 180° to see it stay in `(-π, π]`).

---

## What you learned — and where to go next

- **Odometry** dead-reckons a `Pose2d` from wheel positions + heading; every
  tick you `update(newHeading, newPositions)` and query `getPoseMeters()`.
- **`SwerveModulePosition`** is the per-corner report; **`Field2d`** turns the
  running pose into something you can watch.
- Vision fusion is one type-swap away: **`SwerveDrivePoseEstimator`** in place
  of `SwerveDriveOdometry`.

You now have a full command-based swerve robot that can be driven, plotted,
simulated, tuned, auto'd, and located on a field. From here:

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
