# Lesson 14 — The pose estimator: let something correct you

**Goal:** Upgrade odometry to a **`SwerveDrivePoseEstimator`** — the same
tick-by-tick dead reckoning, but with a door for outside corrections — and
prove it works by injecting fake "camera sightings" in sim and watching the
pose snap back to truth.

**New Java concepts**
- A **type swap** as a refactor — how narrow interfaces make upgrades cheap
- **Timestamps** — data that says *when* it was true, not just what

**New robot concepts**
- Why dead reckoning **drifts**, and why no amount of math fixes it
- **`SwerveDrivePoseEstimator`** — odometry plus a correction input
- **`addVisionMeasurement`** — feeding in an absolute pose from outside
- **Measurement trust** (standard deviations) — how hard a correction pulls

---

## 1. Odometry lies, slowly

Lesson 11's Try it had you drive a square and watch the reported pose come
home slightly wrong. That error is **drift**, and it's worth understanding
why it's unfixable from the inside. Odometry adds up thousands of tiny
measured steps. Every step carries a tiny error — a wheel scrubbing in a
turn, a bump, carpet flex — and *addition never forgets*. The errors don't
average out; they accumulate. After a minute of hard driving, the pose can
be off by half a meter, and nothing in the math can tell, because every
individual step looked perfectly reasonable.

The wrong instinct is "better math will fix it." It won't — the information
is simply *gone*. What fixes drift is an **outside reference**: something
that occasionally says "actually, you are *here*," anchored to the world
instead of to your own history. On real robots that's a camera seeing an
AprilTag whose field position is known. Blending "my running total" with
"occasional absolute sightings" is a classic estimation problem, and WPILib
ships the solution with a familiar shape:
**`SwerveDrivePoseEstimator`**.

---

## 2. The swap

Here's the payoff for a habit you didn't know you were building: everything
in your code asks for the pose through `getPose()`, and everything feeds
position through `update(...)`. Nobody touches `m_odometry` directly except
`Drivetrain` itself. So swapping the engine underneath is a three-edit
refactor. In `Drivetrain`:

```java
import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
```

Replace the `m_odometry` field:

```java
  private final SwerveDrivePoseEstimator m_poseEstimator = new SwerveDrivePoseEstimator(
      m_kinematics,
      Rotation2d.fromDegrees(getHeadingDegrees()),
      modulePositions(),
      new Pose2d()); // starting pose — (0, 0, 0°) until an auto resets it
```

(One small difference from the odometry constructor: the estimator *requires*
a starting pose as its fourth argument. It needs a definite opinion to start
blending from.) Then update the three places that used the old field —
`periodic()`'s `update` call, `getPose()`, and `resetPose(...)` — to point at
`m_poseEstimator`. The method names almost all match; the one rename is that
the estimator calls its getter `getEstimatedPosition()`:

```java
  public Pose2d getPose() {
    return m_poseEstimator.getEstimatedPosition();
  }
```

Build and run. Everything behaves *exactly* as before — same field view,
same drift. An estimator that never receives a correction just *is*
odometry. The upgrade bought you one new capability, and it's sitting
unused: a door.

---

## 3. The door: `addVisionMeasurement`

The estimator's new method is the whole point of the lesson:

```java
m_poseEstimator.addVisionMeasurement(visionPose, timestampSeconds);
```

Read the two arguments carefully, because the second one carries a big idea.
`visionPose` is an absolute claim: "a camera computed that the robot is at
this field position." And `timestampSeconds` says **when that claim was
true** — because by the time a camera has captured a frame, found an
AprilTag, and done the geometry, tens of milliseconds have passed, and the
robot has moved. The estimator handles this with quiet brilliance: it keeps
a short history, rewinds to the timestamp, blends the correction in *where
it belongs*, and replays its own updates forward. Data that knows its own
age is what makes fusing a slow sensor with a fast one possible — remember
that; it's everywhere in robotics.

Give `Drivetrain` a public door, with a log so corrections are visible:

```java
import edu.wpi.first.wpilibj.Timer;
```

```java
  /** Feed an absolute pose sighting into the estimator. */
  public void addVisionMeasurement(Pose2d visionPose) {
    m_poseEstimator.addVisionMeasurement(visionPose, Timer.getFPGATimestamp());
    Logger.recordOutput("Drivetrain/VisionPose", visionPose);
  }
```

(`Timer.getFPGATimestamp()` is the robot's clock, in seconds. Using "now" as
the timestamp is the honest choice for our fake camera, which has zero
latency; a real vision system hands you the capture time instead.)

---

## 4. A fake camera, and the proof

No camera on the bench — but the *estimator* doesn't know that. We'll bind a
button that pretends a camera just saw the robot at a known spot on the
field. In `configureBindings()`:

```java
    // Pretend a camera just saw us at (2, 5) facing 90°.
    m_driverController.start().onTrue(Commands.runOnce(() ->
        m_drivetrain.addVisionMeasurement(
            new Pose2d(2.0, 5.0, Rotation2d.fromDegrees(90)))));
```

Two small notes: the Start button is the little one near the Xbox logo —
face buttons are precious, fake cameras are not — and this uses
`Commands.runOnce` (from Lesson 9's `Commands` toolbox) rather than the
drivetrain's own `runOnce`, because feeding the estimator isn't *driving*:
it shouldn't claim the subsystem and interrupt whatever command is running.
Let `Ctrl+.` add the `Pose2d` and `Rotation2d` imports to `RobotContainer`.

Now run it. Sim up, Odometry tab open with `Drivetrain/Pose` on the field
(drop `Drivetrain/VisionPose` on there too, as a second object). Drive
somewhere — anywhere — then press Start. The robot on the field *slides
decisively toward (2, 5)*. Not a teleport: a strong pull, blended over a few
ticks, weighted by how much the estimator trusts vision versus its own
wheels. Keep driving and press it again. Every press is one "camera frame";
a real robot gets dozens per second, each nudging the estimate toward
truth while odometry fills in the fast motion between frames. That division
of labor — **odometry for smoothness, vision for truth** — is modern FRC
localization in one sentence.

> **The trust knob.** How hard a measurement pulls is set by its **standard
> deviations** — smaller numbers mean "trust this more." The defaults are
> reasonable, and one line adjusts them:
> `m_poseEstimator.setVisionMeasurementStdDevs(VecBuilder.fill(0.5, 0.5, 999999));`
> reads as "trust vision's x and y to about half a meter, and ignore its
> heading entirely" — a common real-robot choice, since the gyro's heading
> is usually better than a camera's. Tuning trust is a deep art; knowing
> the knob exists is enough for today.

---

## Try it

1. **Drift, then correct.** Resurrect Lesson 13's fake wheel slip (multiply
   `drivePositionMeters` by `1.1` in `ModuleIOTalonFX`), drive a lap, and
   watch the pose wander somewhere false. Now press Start. The lie gets
   pulled back toward the "camera's" truth — this is the exact drama that
   plays out on a real field, in slow motion. Remove the slip after.
2. **Feed it garbage.** Change the fake sighting to somewhere absurd —
   `(15, 1, 0°)` while you're sitting at the origin — and press Start once
   mid-drive. Watch the estimate lurch toward a place the robot never was.
   Moral: the estimator believes what you feed it, weighted by the trust
   knob. Real vision code *filters* before it feeds — rejecting sightings
   that are too far from the current estimate to be plausible.
3. **Replay bonus.** Record a sim session with a few corrections, then
   replay it (Lesson 13). The corrections replay too — AdvantageKit logs
   driver-station inputs, so your button presses are part of the recorded
   past.

---

## What you learned — and where the road goes

The estimator closed the course's last loop: dead reckoning **drifts**
because addition never forgets, no inside math can fix it, and the cure is
an outside reference fed through `addVisionMeasurement` — an absolute pose
plus a **timestamp**, so the estimator can rewind, blend the correction
where it belongs, and roll forward. The swap itself was three edits, and
that's its own lesson: because everything asked through `getPose()`, the
engine underneath was free to change. Narrow doors make cheap upgrades —
you've now seen that with `setDesiredState`, with the IO layer, and here.

And that's the course — for real this time. Fourteen lessons ago, printing a
line of text was an achievement. Now you have a field-relative swerve robot
with firmware closed-loop control, organized telemetry, deterministic
replay, and a self-correcting pose — and every piece of it is something you
typed and can explain. Where the road goes from here:

- **A real camera:** PhotonVision + AprilTags produce exactly what
  `addVisionMeasurement` wants — a pose and a capture timestamp. Your fake
  button becomes a real pipeline with almost no new drivetrain code.
- **Trajectory following:** `PathPlanner` or `Choreo` turn a drawn path into
  a timed trajectory, chased with the `driveToPose` pattern from Lesson 11 —
  now running on a pose you can finally trust.
- **A second mechanism:** an elevator, a shooter, an intake. Subsystem,
  commands, IO layer, logged inputs — the same spine, one more time, and
  the second time it takes a tenth as long.

Wherever you go, you're not starting over. You're reusing the spine — and
now you know how it holds up.
