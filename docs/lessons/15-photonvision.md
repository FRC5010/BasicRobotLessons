# Lesson 15 — Real vision: PhotonVision and multi-camera simulation

**Goal:** Replace Lesson 14's fake vision provider with a real one — a
`PhotonCamera` reading actual AprilTags through a `PhotonPoseEstimator` —
give it as many simulated cameras as you want, and put it behind the same
`VisionIO` treatment `ModuleIO` and `GyroIO` got in Lesson 13, so vision
corrections replay exactly like everything else.

**New Java concepts**
- **`Optional<T>`** — a value that might not be there, and the two clean
  ways to react to that
- A **`static` field** — shared by every instance of a class, not owned by
  any one of them
- A **blank `final`** — a field that gets its one and only value from the
  constructor instead of its declaration line
- **`record`** — a small, loggable data bundle (you've read them since
  Lesson 13; today you write one)

**New robot concepts**
- **`PhotonCamera`** and **`PhotonPoseEstimator`** — real AprilTag
  detections turned into candidate robot poses
- **`AprilTagFieldLayout`** — the season's official tag positions, loaded
  once via `kDefaultField`
- Multi-tag vs. single-tag pose strategies, and why more tags beats fewer
- **`Transform3d`** — a 3D camera-mount offset, and the +Z-is-up extension
  of Lesson 7's coordinate rule
- **`VisionSystemSim`** / **`PhotonCameraSim`** — a fully faked vision
  pipeline, extended onto in sim the same way `ModuleIOSim` extends
  `ModuleIOTalonFX`
- Extending the IO-layer pattern to vision, so it replays like everything
  else built since Lesson 13

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
library (online search)**), search for **photonlib**, and install it. The
search list is scoped to your project's season, so what it offers you is a
2026 build — this course was written against **v2026.3.4**.

**If the search comes up empty, install by this URL instead:**

```
https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/2026/photonlib-v2026.3.4.json
```

Rebuild to confirm: `./gradlew build`.

> **Take the version pin seriously here.** PhotonVision's own docs hand out a
> URL ending `photonlib-json-1.0.json`, and that one is a *moving* link — it
> serves whatever build is newest, which in the offseason means next season's
> alpha. Feed a 2027 alpha to a 2026 project and the build dies before it
> compiles a line, with `Vendor Dependency photonlib has invalid year null`.
> The URL above is WPILib's own copy, pinned to one version, and it can't drift.
> Same trick works for any vendordep: swap the year and library name.

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
      AprilTagFieldLayout.loadField(AprilTagFields.kDefaultField);
}
```

`AprilTagFields` is an enum with one entry per season's field —
`kDefaultField` is a standing alias to *whichever one is current*, so this
line never goes stale when the calendar turns over. (If your specific event
uses a field built by a different manufacturer — AndyMark and Welded field
kits mount tags with tiny position differences — swap in that season's
exact constant instead, e.g. `AprilTagFields.k2026RebuiltWelded`.)

Read the call in that order — the *layout class* does the loading, and the
enum value is just which field to load. Autocomplete may also offer
`kDefaultField.loadAprilTagLayoutField()`, which reads more naturally and is
what older code does; it's deprecated for removal, so use `loadField` instead.

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

*Nothing to add yet — this is the shape you'll write in a moment:*

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

## 6. One more IO layer: `VisionIO`

Every sensor this course has touched since Lesson 13 tells the same story:
hardware lives behind an interface, so a replay run can feed the exact same
numbers back in without touching real hardware. Vision has been the one
holdout — reading `PhotonCamera` straight from a `PoseProvider` means a
replayed match would quietly drop every correction that happened live, and
there'd be no error, no warning — the robot would just trust odometry alone
and nobody would notice until the replayed pose looked wrong. Today that
gap closes the same way it closed for `ModuleIO` and `GyroIO`.

**Create `src/main/java/frc/robot/subsystems/VisionIO.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

import edu.wpi.first.math.geometry.Pose3d;

public interface VisionIO {
  @AutoLog
  public static class VisionIOInputs {
    public PoseObservation[] poseObservations = new PoseObservation[0];
  }

  /** One camera frame's worth of evidence: a candidate pose and how many tags built it. */
  public static record PoseObservation(double timestampSeconds, Pose3d pose, int tagCount) {}

  public default void updateInputs(VisionIOInputs inputs) {}
}
```

Two familiar pieces, one new shape. `@AutoLog` and the do-nothing default
method are exactly what `ModuleIO` and `GyroIO` already taught you. What's
new is the input itself: a single tick of vision isn't one number — a
camera can report zero, one, or several frames since the last read (that's
`getAllUnreadResults()`, from section 5), so the input is an **array** of a
small **`record`**, `PoseObservation`. A record is a compact way to bundle a
few related values — here, exactly what one correction needs: when it was
true, what the candidate pose was, and how many tags built it. Records are
loggable the same way `Pose3d` already is, so an array of them slots into
`@AutoLog` with no extra ceremony.

---

## 7. Build `VisionIOPhotonVision`

Time to put section 5's ideas to work.

**Create `src/main/java/frc/robot/subsystems/VisionIOPhotonVision.java`:**

```java
package frc.robot.subsystems;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.photonvision.EstimatedRobotPose;
import org.photonvision.PhotonCamera;
import org.photonvision.PhotonPoseEstimator;
import org.photonvision.targeting.PhotonPipelineResult;

import edu.wpi.first.math.geometry.Transform3d;
import frc.robot.Constants.VisionConstants;

/** IO implementation for a real PhotonVision camera. */
public class VisionIOPhotonVision implements VisionIO {
  protected final PhotonCamera m_camera;
  private final PhotonPoseEstimator m_poseEstimator;

  public VisionIOPhotonVision(String cameraName, Transform3d robotToCamera) {
    m_camera = new PhotonCamera(cameraName);
    m_poseEstimator = new PhotonPoseEstimator(VisionConstants.kTagLayout, robotToCamera);
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    List<PoseObservation> observations = new ArrayList<>();
    for (PhotonPipelineResult result : m_camera.getAllUnreadResults()) {
      Optional<EstimatedRobotPose> estimate = m_poseEstimator.estimateCoprocMultiTagPose(result);
      if (estimate.isEmpty()) {
        estimate = m_poseEstimator.estimateLowestAmbiguityPose(result);
      }
      if (estimate.isPresent()) {
        EstimatedRobotPose pose = estimate.get();
        observations.add(new PoseObservation(
            pose.timestampSeconds, pose.estimatedPose, pose.targetsUsed.size()));
      }
    }
    inputs.poseObservations = observations.toArray(new PoseObservation[0]);
  }
}
```

`updateInputs` is section 5's logic doing real work: for every unread frame,
try multi-tag first, fall back to single-tag, and — `Optional` guarding
every step — pack whatever pose came out into `inputs`. Notice what it
*doesn't* do: it never touches a pose estimator, never decides whether a
correction is good enough to trust. Reading is the only job an IO class has;
deciding what to do with what it read belongs one layer up — the same
boundary `ModuleIOTalonFX` respects by never calling `setDesiredState` on
itself.

One detail worth flagging before section 8: `m_camera` is **`protected`**,
not `private`. That's Lesson 13's signal again — a subclass is coming for it.

---

## 8. Simulating a camera you don't own — the `extends` way

Nobody in this course has a coprocessor on their desk, so simulate it —
and this time, reach for the exact trick Lesson 13 already taught for
`ModuleIOSim`: **extend the real class, add the physics.**

**Create `src/main/java/frc/robot/subsystems/VisionIOPhotonVisionSim.java`:**

```java
package frc.robot.subsystems;

import java.util.function.Supplier;

import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants.VisionConstants;

/** IO implementation for a simulated PhotonVision camera. */
public class VisionIOPhotonVisionSim extends VisionIOPhotonVision {
  private static VisionSystemSim visionSim; // one fake field, shared by every camera

  private final Supplier<Pose2d> m_poseSupplier;

  public VisionIOPhotonVisionSim(
      String cameraName, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    super(cameraName, robotToCamera);
    m_poseSupplier = poseSupplier;

    if (visionSim == null) {
      visionSim = new VisionSystemSim("main");
      visionSim.addAprilTags(VisionConstants.kTagLayout);
      SmartDashboard.putData("VisionSim/DebugField", visionSim.getDebugField());
    }

    SimCameraProperties cameraProps = new SimCameraProperties();
    cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
    cameraProps.setCalibError(0.25, 0.08);
    cameraProps.setFPS(20);
    cameraProps.setAvgLatencyMs(35);
    cameraProps.setLatencyStdDevMs(5);

    PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);
    visionSim.addCamera(cameraSim, robotToCamera);
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    visionSim.update(m_poseSupplier.get());
    super.updateInputs(inputs);
  }
}
```

Read `private static VisionSystemSim visionSim` slowly, because it's new.
Every field you've written before this belonged to one object —
`m_driveMotor` on *this* module, not the others. **`static`** removes that
belonging: a `static` field lives on the *class*, one copy shared by every
instance that exists, not one copy per instance. The first
`VisionIOPhotonVisionSim` ever constructed finds `visionSim` still `null`,
builds the shared fake field, and populates it with tags; every camera
built after that — a second, a third — finds it already there and just
adds itself with `addCamera(...)`. That's the whole multi-camera feature,
and there's no varargs, no collection, no extra class to write: each
camera you construct registers itself, because `static` state remembers
who's already shown up.

`updateInputs` layers cleanly on top of `super`: step the fake field
forward with the robot's current pose, *then* let `VisionIOPhotonVision`'s
already-written logic read whatever the camera now reports — the same
"physics first, then read" order `ModuleIOSim` used back in Lesson 13.
`PhotonCameraSim` feeds its fake detections into the exact same `PhotonCamera`
object `VisionIOPhotonVision` already reads, over NetworkTables, the same
pipe a real coprocessor would use — so `estimateCoprocMultiTagPose` and
`estimateLowestAmbiguityPose` can't tell the difference, and don't need to.

The `poseSupplier` tells the fake vision field where to look from — what
pose to check each tag against when deciding whether a camera would see it.
Section 10 wires it to `Localizer::getPose()`, the same fused pose vision
itself feeds corrections into. That's the robot checking its simulated
eyesight against its own best guess, not against some separate "actual"
position — this course's simulation doesn't keep one of those. It works
fine in practice: odometry alone already tracks position closely in sim,
so the estimate never drifts far enough from reality for the difference to
matter. A team simulating a full physics model, with its own independent
robot pose, would feed vision from that pose instead.

---

## 9. Build `PhotonVisionPoseProvider`

All the real work already happened in `VisionIO`, so the provider itself is
almost nothing — the same shape `SwerveModule` has had since Lesson 13: own
an IO, own a logged inputs bundle, read the bundle. It also picks up one
more job, one you've seen before in a different class: choosing *which* IO
to build. `Drivetrain` does that for its modules with a static `makeModule`
helper back in Lesson 13; `PhotonVisionPoseProvider` does the same for
itself with `makeCamera`.
**Create `src/main/java/frc/robot/subsystems/PhotonVisionPoseProvider.java`:**

```java
package frc.robot.subsystems;

import java.util.function.Supplier;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Transform3d;
import frc.robot.Constants;

/** A vision camera, contributing whatever pose corrections its IO logged this tick. */
public class PhotonVisionPoseProvider implements PoseProvider {
  private final VisionIO m_io;
  private final VisionIOInputsAutoLogged m_inputs = new VisionIOInputsAutoLogged();
  private final String m_logKey;

  public PhotonVisionPoseProvider(VisionIO io, String logKey) {
    m_io = io;
    m_logKey = logKey;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    m_io.updateInputs(m_inputs);
    Logger.processInputs(m_logKey, m_inputs);

    for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {
      estimator.addVisionMeasurement(observation.pose().toPose2d(), observation.timestampSeconds());
    }
  }

  /** Picks each camera's real/sim/replay IO, the same way Drivetrain picks each module's. */
  public static PhotonVisionPoseProvider makeCamera(
      String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    VisionIO io = switch (Constants.kCurrentMode) {
      case REAL -> new VisionIOPhotonVision(name, robotToCamera);
      case SIM -> new VisionIOPhotonVisionSim(name, robotToCamera, poseSupplier);
      case REPLAY -> new VisionIO() {}; // inputs come from the log
    };
    return new PhotonVisionPoseProvider(io, "Localizer/" + name);
  }
}
```

`m_io.updateInputs(m_inputs)` followed by `Logger.processInputs(...)` is the
two-faced door from Lesson 13 again: live, it writes what the camera saw;
in replay, that same call reads it back out of the log instead, and
`PhotonVisionPoseProvider` can't tell the difference. Only after that door
has done its job does the loop run — over `m_inputs.poseObservations`, the
*logged* array, never the camera directly — so every vision correction a
replay run produces comes from exactly the same numbers the original match
did.

Notice what's missing compared to `SwerveModule`: no separate `periodic()`
and `setDesiredState()`. A steering module both senses *and* acts — an
angle to chase — so Lesson 13 split those into two methods. A camera only
ever reports; nothing here commands it. `PoseProvider` only ever asked for
one method, and today that one method both senses and consumes, because
there's nothing to separate.

`makeCamera` is `Drivetrain.makeModule` with one difference: `makeModule`
is `private`, because only `Drivetrain` ever calls it. `makeCamera` is
`public`, because `RobotContainer` is about to call it from the outside —
building a `PhotonVisionPoseProvider` and picking its IO are the same
decision now, made in the one class that knows how to make both. That
`Supplier<Pose2d> poseSupplier` parameter is only ever read by the `SIM`
arm — `VisionIOPhotonVisionSim` needs to know where the robot is so it
knows what a camera there would see. It has to be a *supplier*, not a
plain `Pose2d`: the robot's pose changes every tick, and
`VisionIOPhotonVisionSim` needs a fresh one each time `updateInputs` runs,
not whatever the pose happened to be once, back at construction. Section 10
supplies it.

---

## 10. Wire it up and watch two cameras agree

**In `Constants.java`, add the imports** `VisionConstants` needs (let
`Ctrl+.` find the rest — `AprilTagFieldLayout` and `AprilTagFields` live
under `edu.wpi.first.apriltag`; `Transform3d`, `Translation3d`, and
`Rotation3d` live under `edu.wpi.first.math.geometry`, alongside the
`Translation2d` already imported there).

**Delete `VisionPoseProvider.java`** — `PhotonVisionPoseProvider` replaces
it, and nothing else in the project still references the old one once
`RobotContainer` is updated below.

`Localizer` needs no changes at all — its constructor, `periodic()`, and
every method stay exactly as Lesson 14 left them. That's worth sitting with:
an entire IO layer just went into the project, and the class that fuses
poses together never had to hear about it.

Declare `m_localizer` right after `m_drivetrain`, and leave the two cameras
unassigned for now.

**Edit `RobotContainer`'s fields:**

```java
public class RobotContainer {
  private final CommandXboxController m_driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  private final Drivetrain m_drivetrain = new Drivetrain();
  private final Localizer m_localizer = new Localizer(m_drivetrain); // registers drivetrain
  private final PhotonVisionPoseProvider m_frontCamera;
  private final PhotonVisionPoseProvider m_backCamera;

  // ...m_autoChooser stays...
```

A `final` field doesn't have to get its value from its own declaration line
— it just has to get assigned exactly once, by the time the constructor
returns. Java calls that a **blank final**, and `m_frontCamera`/`m_backCamera`
are blank finals on purpose here: building a camera needs `m_localizer`,
so `m_localizer` has to be a real, finished object *first*. Moving its
declaration above the cameras' guarantees that — field initializers still
run top to bottom, so by the time you'd build a camera, `m_localizer`
already exists.

`m_localizer` is now guaranteed to be ready by the time the constructor runs.

**Finish building both cameras in the `RobotContainer` constructor:**

```java
  public RobotContainer() {
    m_frontCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, m_localizer::getPose);
    m_backCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, m_localizer::getPose);
    m_localizer.addProvider(m_frontCamera);
    m_localizer.addProvider(m_backCamera);

    // ...configureBindings(), auto chooser setup stay...
  }
```

`m_localizer::getPose` is a **method reference** — shorthand for
`() -> m_localizer.getPose()` — and there's nothing subtle about it this
time. `m_localizer` isn't a promise to look something up later; it's an
already-built object sitting right there, the same way `m_drivetrain` is an
already-built object by the time `configureBindings()` reaches for it a few
lines down. Building the cameras in the constructor body, instead of in
their own field initializers, is what buys that: every field initializer
above the constructor has already run before the constructor's first line
executes.

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

Then replay it, the Lesson 13 way: drive around with both cameras seeing
tags, switch `kSimMode` to `Mode.REPLAY`, and run again. Open the `_sim`
log next to the original and drop both `RealOutputs/Localizer/Front/PoseObservations`
and `ReplayOutputs/Localizer/Front/PoseObservations` on the same plot — they
should sit exactly on top of each other. That's the payoff this whole
lesson was for: vision corrections that happened live, replayed faithfully,
months later, on a laptop with no camera attached at all.

---

## Try it

1. **Add a third camera.** Pick a corner mount — angled 45°, say — add its
   `Transform3d` to `VisionConstants`, declare a third `PhotonVisionPoseProvider`
   blank final next to the other two, build it in the constructor with
   `PhotonVisionPoseProvider.makeCamera(...)`, and register it right after
   with `m_localizer.addProvider(...)`. Nothing in `VisionIOPhotonVisionSim`
   changes to make this work — its shared `static VisionSystemSim` just
   picks up a third camera the moment one more `VisionIOPhotonVisionSim` is
   constructed.
2. **Turn off multi-tag.** In `VisionIOPhotonVision.updateInputs`, delete the
   `estimateCoprocMultiTagPose` branch so every frame falls straight to
   `estimateLowestAmbiguityPose`. Drive past a spot where two tags are
   visible at once and compare — single-tag estimates should look visibly
   noisier on the plot than multi-tag did.
3. **Mismeasure a camera on purpose.** Add 0.3 meters to `kFrontRobotToCamera`'s
   forward offset — pretend you measured wrong — and watch the fused pose
   skew every time the front camera contributes. This is the vision-side
   sibling of Lesson 5's magnet-offset bug: a wrong calibration constant
   doesn't crash anything, it just quietly lies. Put the number back.
4. **Prove replay doesn't need a camera.** Record a `SIM` run with both
   cameras seeing tags, then switch to `REPLAY` and comment out the entire
   body of `VisionIOPhotonVision`'s constructor (or just unplug your
   laptop's network — either way, make it impossible for a real
   `PhotonCamera` to respond). Run the replay anyway. It still produces the
   exact same `PoseObservations` it logged the first time. In one sentence,
   explain why that's true — the answer is in `makeCamera`'s `REPLAY` branch.

---

## What you learned

The `Localizer` you built in Lesson 14 just proved its reason for existing:
a real `PhotonVisionPoseProvider`, backed by an actual `PhotonCamera` and
`PhotonPoseEstimator`, slots into the exact same registry Lesson 14's fake
button-press provider used, and `Localizer` itself required no changes to
accept it. That's what the `PoseProvider` interface was for all along.

`Optional<EstimatedRobotPose>` gave "there might not be a pose this frame"
an honest, checkable type instead of a sentinel value someone forgets to
guard against, and multi-tag-first-with-single-tag-fallback is the real
version of the trust story Lesson 14 only sketched: more agreeing evidence
beats less, every time. A **`static` field** gave every simulated camera a
way to share one `VisionSystemSim` without holding a reference to each
other — this course's first reach for `static` state, and a clean picture
of what it's for: one copy, owned by the class, not by any one instance.

The bigger structural move was giving vision its own `VisionIO` — the same
interface/`@AutoLog`/`REAL`-`SIM`-`REPLAY` treatment `ModuleIO` and `GyroIO`
got in Lesson 13. `PhotonVisionPoseProvider` only ever talks to that
interface: it logs whatever the IO handed it, and reads those same values
back out on replay, so a vision correction that happened live, months ago,
plays back exactly, on a laptop with no camera attached at all. And
`makeCamera`, the factory that decides which `VisionIO` to build, lives on
`PhotonVisionPoseProvider` itself — the same place `Drivetrain` keeps the
factory for its own modules. The class that knows how to build something is
the class that should decide which version to build.

Fifteen lessons built a robot that knows how to move, knows where it is,
and now remembers everything it saw well enough to prove it later.

What it still doesn't have is anywhere to drive. Every simulation you've run
since Lesson 4 has been motors spinning in an empty void — no mass, no tire
grip, no walls, and no way to check the robot's estimated pose against where it
actually is. Lesson 16 hands the whole thing a physics engine.

Next: [Lesson 16 — maple-sim: give the simulation a world](16-maple-sim-field.md).
