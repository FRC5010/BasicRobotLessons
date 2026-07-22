# Lesson 15 — Real vision: PhotonVision and multi-camera simulation

**Goal:** Replace Lesson 14's fake vision provider with a real one — a
`PhotonCamera` reading actual AprilTags through a `PhotonPoseEstimator` — and
give it more than one simulated camera to prove the `Localizer` never has to
know the difference.

**New Java concepts**
- **`Optional<T>`** — a value that might not be there, and the two clean
  ways to react to that
- **Varargs** (`Type... name`) — a parameter that accepts "as many as you
  hand it"

**New robot concepts**
- **`PhotonCamera`** and **`PhotonPoseEstimator`** — real AprilTag
  detections turned into candidate robot poses
- **`AprilTagFieldLayout`** — the season's official tag positions, loaded
  once via `kDefaultField`
- Multi-tag vs. single-tag pose strategies, and why more tags beats fewer
- **`Transform3d`** — a 3D camera-mount offset, and the +Z-is-up extension
  of Lesson 7's coordinate rule
- **`VisionSystemSim`** / **`PhotonCameraSim`** — a fully faked vision
  pipeline, one shared sim, many cameras

---

## 1. What a real camera changes

Lesson 14 ended with a promise: *"Add a real PhotonVision provider next
season and the localizer doesn't change by a line."* Today you cash that
in, and it's worth understanding why the promise was even possible to make.

A real vision setup has one more computer than you've met so far. A
**coprocessor** — a small board bolted to the robot (an OrangePi, a
Limelight, sometimes just the roboRIO itself for a simple build) — runs
**PhotonVision**, a program that watches a camera feed, finds AprilTags in
it, and does the geometry to turn "I see tag 7 at this pixel location" into
"the camera is at this 3D position relative to that tag." It publishes the
result over NetworkTables, the same network pipe AdvantageKit has been
using since Lesson 3. Your robot code never touches pixels — it asks
PhotonVision's Java library, **PhotonLib**, for the answer.

Here's the part that makes Lesson 14's promise true: whatever produces that
answer, the **shape** of what your code needs — a `Pose2d` and a
timestamp — was already exactly what `PoseProvider.updatePoseEstimate`
expects. A button press satisfied that shape in Lesson 14. A real camera
satisfies the same shape today. `Localizer` never has to learn the
difference, because it was never told there was one.

---

## 2. Install PhotonLib

Same ritual as Lesson 3's AdvantageKit install: open the vendor dependency
manager (Ctrl+Shift+P → **WPILib: Manage Vendor Libraries** → **Install new
library (online search)**), search for **PhotonLib**, and install it. If
your search doesn't turn it up, install it by URL instead:

```
https://maven.photonvision.org/repository/internal/org/photonvision/photonlib-json/1.0/photonlib-json-1.0.json
```

Rebuild to confirm: `./gradlew build`.

---

## 3. Tell the robot where the tags are

A `PhotonPoseEstimator` needs to know two things to turn "I see tag 7" into
a field position: where tag 7 *actually is* on the field, and where the
camera is on *your robot*. The first one is a solved problem — WPILib ships
the official tag layout for the current game.

**Add to `Constants.java`:**

```java
public static class VisionConstants {
  public static final AprilTagFieldLayout kTagLayout =
      AprilTagFields.kDefaultField.loadAprilTagLayoutField();
}
```

`AprilTagFields` is an enum with one entry per season's field —
`kDefaultField` is a standing alias to *whichever one is current*, so this
line never goes stale when the calendar turns over. (If your specific event
uses a field built by a different manufacturer — AndyMark and Welded field
kits mount tags with tiny position differences — swap in that season's
exact constant instead, e.g. `AprilTagFields.k2026RebuiltWelded`.)

---

## 4. Tell the robot where the camera is

The second thing a `PhotonPoseEstimator` needs is a **`Transform3d`**: the
camera's mount position relative to the robot's center, in 3D. You already
know the rule for X and Y from Lesson 7 — **+X is forward, +Y is left** —
today it grows a third axis: **+Z is up.**

**Add to `VisionConstants`, next to the tag layout:**

```java
// Camera mount positions: robot center → camera lens.
public static final String kFrontCameraName = "Front"; // must match the name in the PhotonVision UI
public static final Transform3d kFrontRobotToCamera = new Transform3d(
    new Translation3d(0.3, 0.0, 0.2), // 30 cm forward, centered, 20 cm up
    new Rotation3d(0, 0, 0));         // facing straight forward

public static final String kBackCameraName = "Back";
public static final Transform3d kBackRobotToCamera = new Transform3d(
    new Translation3d(-0.3, 0.0, 0.2), // 30 cm back, 20 cm up
    new Rotation3d(0, 0, Math.PI));    // facing straight backward
```

A **`Transform3d`** bundles a `Translation3d` (the position offset) with a
`Rotation3d` (the orientation offset) — the 3D sibling of the `Translation2d`
you've used since Lesson 7. Front and back, facing opposite directions, is a
common real layout: two cameras double your chance of seeing a tag and cover
each other's blind spot.

> **Measure this for real.** On an actual robot, `kFrontRobotToCamera` isn't
> a guess — you measure the camera's physical mount with a tape measure
> (or read it off a CAD model) and get it right to the centimeter. A wrong
> transform doesn't crash anything; it just quietly reports a robot position
> that's offset from the truth by exactly however wrong the measurement was.

---

## 5. `PhotonPoseEstimator`: picking a pose strategy

A `PhotonPoseEstimator` doesn't watch a camera continuously on its own —
you hand it one frame's worth of detections at a time, and it hands back a
candidate pose, *if it could compute one.* That "if" is worth sitting with:
some frames have zero tags in view, and "no pose" has to be a real, distinct
answer from "here's a pose" — not a fake `Pose2d` with a sentinel value
crossing your fingers nobody checks it. Java's answer to that problem is
**`Optional<T>`**: a box that either holds a `T` or holds nothing, and the
compiler makes you ask before you reach in.

```java
Optional<EstimatedRobotPose> estimate = poseEstimator.estimateCoprocMultiTagPose(result);
if (estimate.isPresent()) {
  EstimatedRobotPose pose = estimate.get(); // safe — you just checked
  // ...use pose...
}
```

`isPresent()` asks "is there something in here?"; `.get()` unwraps it —
call `.get()` without checking first and you'll crash the instant a frame
comes back empty, which is exactly the crash `Optional` exists to make you
handle on purpose instead of by accident.

Now the strategy itself. `estimateCoprocMultiTagPose(result)` is the one to
reach for first: when the coprocessor can see *multiple* tags in one frame,
it solves for the camera's position using all of them at once, which is
dramatically more accurate than any single tag alone — one tag's geometry
has an inherent ambiguity (the solve can confuse "close and small" with "far
and rotated"); a second tag from a different angle kills that ambiguity
almost completely. When only one tag is visible, multi-tag has nothing to
fuse and returns empty — that's when you fall back to
`estimateLowestAmbiguityPose(result)`, which picks whichever visible tag's
solve was least confused and uses that alone. Both take a
`PhotonPipelineResult` — one camera frame's worth of detections — and both
return `Optional<EstimatedRobotPose>`.

> **On the coprocessor, not the check.** `estimateCoprocMultiTagPose` needs
> "Do Multi-Target Estimation" turned on in the PhotonVision web UI's
> pipeline settings — that's where the multi-tag solve actually runs. Robot
> code can't turn it on for you; if multi-tag never seems to fire on a real
> robot, that setting is the first thing to check.

---

## 6. Build `PhotonVisionPoseProvider`

Now the provider itself — a `PoseProvider`, same contract as the fake one
from Lesson 14, backed by a real camera. Create
`src/main/java/frc/robot/subsystems/PhotonVisionPoseProvider.java`:

```java
package frc.robot.subsystems;

import java.util.List;
import java.util.Optional;

import org.littletonrobotics.junction.Logger;
import org.photonvision.EstimatedRobotPose;
import org.photonvision.PhotonCamera;
import org.photonvision.PhotonPoseEstimator;
import org.photonvision.targeting.PhotonPipelineResult;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Transform3d;
import frc.robot.Constants.VisionConstants;

public class PhotonVisionPoseProvider implements PoseProvider {
  private final PhotonCamera m_camera;
  private final PhotonPoseEstimator m_poseEstimator;
  private final Transform3d m_robotToCamera;
  private final String m_logKey;

  public PhotonVisionPoseProvider(String cameraName, Transform3d robotToCamera) {
    m_camera = new PhotonCamera(cameraName);
    m_robotToCamera = robotToCamera;
    m_poseEstimator = new PhotonPoseEstimator(VisionConstants.kTagLayout, robotToCamera);
    m_logKey = "Localizer/" + cameraName;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    List<PhotonPipelineResult> results = m_camera.getAllUnreadResults();
    for (PhotonPipelineResult result : results) {
      Optional<EstimatedRobotPose> estimate = m_poseEstimator.estimateCoprocMultiTagPose(result);
      if (estimate.isEmpty()) {
        estimate = m_poseEstimator.estimateLowestAmbiguityPose(result);
      }
      if (estimate.isPresent()) {
        EstimatedRobotPose pose = estimate.get();
        estimator.addVisionMeasurement(pose.estimatedPose.toPose2d(), pose.timestampSeconds);
        Logger.recordOutput(m_logKey + "/Pose", pose.estimatedPose);
        Logger.recordOutput(m_logKey + "/TagCount", pose.targetsUsed.size());
      }
    }
  }

  public PhotonCamera getCamera() {
    return m_camera;
  }

  public Transform3d getRobotToCamera() {
    return m_robotToCamera;
  }
}
```

Walk the loop once. **`getAllUnreadResults()`** hands back every camera
frame that's arrived since the last time you asked — not just the newest
one — because a busy tick could otherwise let a frame slip by unprocessed.
For each result, try multi-tag first, fall back to single-tag, and if
*either* produced an estimate, feed it to the shared estimator exactly the
way `reportSighting` did in Lesson 14 — `addVisionMeasurement(pose, time)` —
except `pose.timestampSeconds` is now the camera's own honest capture time,
not `Timer.getFPGATimestamp()` standing in for one.

The two getters at the bottom — `getCamera()` and `getRobotToCamera()` —
aren't part of the `PoseProvider` contract. They exist for section 8, where
the simulation needs to reach in and borrow this exact camera object.

---

## 7. Simulating a camera you don't own

Nobody in this course has a coprocessor on their desk, so — same move as
every hardware lesson since Lesson 4 — simulate it. PhotonLib ships a
parallel set of classes for exactly this: **`VisionSystemSim`** stands in
for the whole physical world (the field, the tags, every camera watching
them), and **`PhotonCameraSim`** stands in for one physical camera.

Here's the part worth pausing on: `PhotonCameraSim` doesn't hand your code
fake data through some separate testing API. It **feeds fake detections
into the exact same `PhotonCamera` object** `PhotonVisionPoseProvider`
already reads — over NetworkTables, the same pipe a real coprocessor would
use. `PhotonVisionPoseProvider` never finds out. That's a stronger version
of the CANcoder/TalonFX trick from Lessons 4–12: instead of a class
choosing between real and simulated behavior, the *transport* itself is
faked, so there's no real/sim branch to write at all.

A `SimCameraProperties` object describes what kind of camera you're
pretending to have — resolution, field of view, and the imperfections a
real camera has that a perfect simulation wouldn't invent on its own:

```java
SimCameraProperties cameraProps = new SimCameraProperties();
cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90)); // resolution, diagonal FOV
cameraProps.setCalibError(0.25, 0.08);  // pixel noise: average, std-dev
cameraProps.setFPS(20);                 // frames per second
cameraProps.setAvgLatencyMs(35);        // pipeline processing delay
cameraProps.setLatencyStdDevMs(5);      // ...and how much that delay jitters
```

Real cameras are noisy and a little slow — a perfect simulation would teach
the wrong lesson. These numbers make the fake camera lie *the way a real one
does*, in small, honest amounts, which is exactly what makes testing your
pose fusion against it meaningful.

---

## 8. Multiple cameras, one `VisionSystemSim`

PhotonLib's rule is: **one shared `VisionSystemSim` can hold many cameras;
one camera can't be split across two sims.** That maps neatly onto how a
real robot works — one field, watched by however many cameras you've
bolted on — so build one small class that owns the shared sim and takes
however many providers you hand it. Create
`src/main/java/frc/robot/subsystems/VisionSim.java`:

```java
package frc.robot.subsystems;

import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants.VisionConstants;

public class VisionSim {
  private final VisionSystemSim m_sim = new VisionSystemSim("main");

  public VisionSim(PhotonVisionPoseProvider... cameras) {
    m_sim.addAprilTags(VisionConstants.kTagLayout);

    SimCameraProperties cameraProps = new SimCameraProperties();
    cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
    cameraProps.setCalibError(0.25, 0.08);
    cameraProps.setFPS(20);
    cameraProps.setAvgLatencyMs(35);
    cameraProps.setLatencyStdDevMs(5);

    for (PhotonVisionPoseProvider camera : cameras) {
      PhotonCameraSim cameraSim = new PhotonCameraSim(camera.getCamera(), cameraProps);
      m_sim.addCamera(cameraSim, camera.getRobotToCamera());
    }

    // Every simulated tag and each camera's field of view, in one widget.
    SmartDashboard.putData("VisionSim/DebugField", m_sim.getDebugField());
  }

  /** One tick of pretend reality: recompute what every camera can currently see. */
  public void update(Pose2d robotPose) {
    m_sim.update(robotPose);
  }
}
```

**`PhotonVisionPoseProvider... cameras`** is a **vararg** parameter — the
`...` means "call this with zero, one, or as many arguments as you like,"
and inside the method `cameras` is just an array. `new VisionSim(frontCam,
backCam)` and `new VisionSim(frontCam, backCam, sideCam)` both compile
against the exact same constructor; the enhanced `for` loop underneath
doesn't know or care how many you handed it. That's the whole feature this
lesson promised: adding a third camera later is one more argument at the
call site, not a line changed anywhere in `VisionSim`.

`addAprilTags(...)` populates the fake field with every tag from the layout
you loaded in section 3; `addCamera(cameraSim, robotToCamera)` registers
each camera at its own mount point, borrowed straight from the provider
that owns it. `update(robotPose)` is the one method the outside world calls
— every tick, it recomputes what every registered camera can currently see
from that pose and republishes fresh fake detections. And `getDebugField()`
is a bonus PhotonLib hands you for free: a `Field2d`, self-registered right
here the same way `Localizer` registers its own, showing every tag and
every camera's field of view — worth having open the moment you run this.

---

## 9. Wire it up and watch two cameras agree

**In `Constants.java`, add the imports** `VisionConstants` needs (let
`Ctrl+.` find the rest — `AprilTagFieldLayout` and `AprilTagFields` live
under `edu.wpi.first.apriltag`; `Transform3d`, `Translation3d`, and
`Rotation3d` live under `edu.wpi.first.math.geometry`, alongside the
`Translation2d` already imported there).

**Delete `VisionPoseProvider.java`** — `PhotonVisionPoseProvider` replaces
it, and nothing else in the project still references the old one once
`RobotContainer` is updated below.

**Give `Localizer` a `VisionSim` to drive.** Add the field, thread it
through the constructor, and add a `simulationPeriodic()`:

```java
public class Localizer extends SubsystemBase {
  private final Drivetrain m_drivetrain;
  private final VisionSim m_visionSim;
  // ...m_estimator, m_providers, m_field stay...

  public Localizer(Drivetrain drivetrain, VisionSim visionSim) {
    m_drivetrain = drivetrain;
    m_visionSim = visionSim;
    // ...everything else in the constructor stays...
  }

  // ...addProvider, periodic(), getPose(), resetPose() all stay unchanged...

  @Override
  public void simulationPeriodic() {
    m_visionSim.update(getPose());
  }
}
```

That override needs no `if (isSimulation())` check anywhere, and notice
this is a different shape than Lesson 13's `Mode` switch. `ModuleIOTalonFX`
and `ModuleIOSim` are separate classes so that hardware code and sim code
never share a file — one reason being **replay**: every value the real
class produces flows through `Logger.processInputs`, so a replay run can
feed it straight back in without touching a motor. `VisionSim` skips that
split — built and wired unconditionally, real robot included, since
`simulationPeriodic()` is already the mode check — which is simpler, but
worth being honest about the cost: **this lesson's vision doesn't replay.**
`PhotonVisionPoseProvider` reads `PhotonCamera` directly, not through a
logged inputs bundle, so a replay run has no recording to read the camera's
detections back from — vision corrections that happened live simply won't
happen again in replay. Giving vision the same `VisionIO`/`Logger.processInputs`
treatment `ModuleIO` and `GyroIO` got would fix that, and it's a genuinely
good exercise once this lesson feels comfortable — for today, the simpler
shape is the right trade for what this lesson is teaching.

One more honest simplification: `update(...)` gets fed `getPose()` — the
`Localizer`'s own fused best guess — because this course's simulation has
no separate "ground truth" physics pose to draw from instead. A team
running a full rigid-body physics sim would feed vision from that instead,
to avoid the estimate ever quietly grading its own homework. For learning
how the wiring and multi-camera mechanics work, this is a fine stand-in.

**In `RobotContainer`, replace the Lesson 14 fake camera:**

```java
public class RobotContainer {
  private final Drivetrain m_drivetrain = new Drivetrain();
  private final PhotonVisionPoseProvider m_frontCamera = new PhotonVisionPoseProvider(
      VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera);
  private final PhotonVisionPoseProvider m_backCamera = new PhotonVisionPoseProvider(
      VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera);
  private final VisionSim m_visionSim = new VisionSim(m_frontCamera, m_backCamera);
  private final Localizer m_localizer = new Localizer(m_drivetrain, m_visionSim);
```

```java
  // in the constructor:
  m_localizer.addProvider(m_frontCamera);
  m_localizer.addProvider(m_backCamera);
```

**Delete the Start-button binding from Lesson 14** — `m_camera.reportSighting(...)`
doesn't exist anymore; there's no fake sighting to trigger, because there's
no fake camera left.

Now run it. `./gradlew simulateJava` → **Teleoperated**, and open the
**VisionSim/DebugField** widget in SimGUI (or drop it into AdvantageScope)
alongside your usual **Field**. AprilTags live around the edges of the
field, so drive toward any boundary — the debug field shows every tag and
a wedge for each camera's field of view, so you'll see exactly when one
overlaps a tag. The moment it does, watch `Localizer/Pose` on your main
field view: the robot's estimate steadies and sharpens, the same "vision
for truth" pull from Lesson 14 — except nobody pressed a button this time.
Turn the robot so the *back* camera crosses a different tag and watch that
one contribute too, through the exact same `Localizer` loop, logging under
its own key.

---

## Try it

1. **Add a third camera.** Pick a corner mount — angled 45°, say — add its
   `Transform3d` to `VisionConstants`, construct a third
   `PhotonVisionPoseProvider`, and hand it to `VisionSim`'s constructor as
   a third vararg. Nothing in `VisionSim` or `Localizer` changes; that's
   the point.
2. **Turn off multi-tag.** Delete the `estimateCoprocMultiTagPose` branch
   in `PhotonVisionPoseProvider` so every frame falls straight to
   `estimateLowestAmbiguityPose`. Drive past a spot where two tags are
   visible at once and compare — single-tag estimates should look visibly
   noisier on the plot than multi-tag did.
3. **Mismeasure a camera on purpose.** Add 0.3 meters to `kFrontRobotToCamera`'s
   forward offset — pretend you measured wrong — and watch the fused pose
   skew every time the front camera contributes. This is the vision-side
   sibling of Lesson 5's magnet-offset bug: a wrong calibration constant
   doesn't crash anything, it just quietly lies. Put the number back.

---

## What you learned

The `Localizer` you built in Lesson 14 just proved its whole reason for
existing: a real `PhotonVisionPoseProvider`, backed by an actual
`PhotonCamera` and `PhotonPoseEstimator`, slotted into the exact same
registry as a fake button-press provider, and nothing about `Localizer`
itself changed. That's what the `PoseProvider` interface was for all along.

`Optional<EstimatedRobotPose>` gave "there might not be a pose this frame"
an honest, checkable type instead of a sentinel value someone forgets to
guard against, and multi-tag-first-with-single-tag-fallback is the real
version of the trust story Lesson 14 only sketched: more agreeing evidence
beats less, every time. Simulation didn't need a new real/sim branch
anywhere in your code, either — `PhotonCameraSim` fakes the *transport*,
not the logic, so `PhotonVisionPoseProvider` runs identically whether
`VisionSim` is quietly feeding it or a real coprocessor is. And **varargs**
made "however many cameras you own" a non-event: `VisionSim` doesn't know
or care if it's holding one camera or five.

Fourteen lessons built a robot that knows how to move. This one gave it
eyes, and let it stop needing a button to tell it where it is.
