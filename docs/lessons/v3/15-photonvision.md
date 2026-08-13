# Lesson 15 — Real vision: PhotonVision and multi-camera simulation

**Goal:** Replace Lesson 14's fake vision provider with a real one — a
`PhotonCamera` reading actual AprilTags through a `PhotonPoseEstimator` —
give it as many simulated cameras as you want, and put it behind the same
`VisionIO` treatment `ModuleIO` and `GyroIO` got in Lesson 13.

**New Java concepts**
- **`Optional<T>`** — a value that might not be there, and the two clean
  ways to react to that
- A **`static` field** — shared by every instance of a class, not owned by
  any one of them
- A **blank `final`** — a field that gets its one and only value from the
  constructor instead of its declaration line
- **`record`** — a small, structured data bundle

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
- Extending the IO-layer pattern to vision

---

## 1. What a real camera changes

Lesson 14 ended with a promise: *"Add a real vision provider next season
and `Localizer` doesn't change by a line."* Today you cash that in, and
it's worth understanding why the promise was even possible to make.

A real vision setup has one more computer than you've met so far. A
**coprocessor** — a small board bolted to the robot — runs **PhotonVision**,
a program that watches a camera feed, finds AprilTags in it, and does the
geometry to turn "I see tag 7 at this pixel location" into "the camera is at
this 3D position relative to that tag." It publishes the result over
NetworkTables, the same network pipe every published value in this course
already travels over. Your robot code never touches pixels — it asks
PhotonVision's Java library, **PhotonLib**, for the answer.

Here's the part that makes Lesson 14's promise true: whatever produces that
answer, the **shape** of what your code needs — a `Pose2d` and a timestamp —
was already exactly what `PoseProvider.updatePoseEstimate` expects. A button
press satisfied that shape in Lesson 14. A real camera satisfies the same
shape today. `Localizer` never has to learn the difference, because it was
never told there was one.

---

## 2. Install PhotonLib

Same ritual as Lesson 1's Phoenix 6 install: open the vendor dependency
manager (Ctrl+Shift+P → **WPILib: Manage Vendor Libraries** → **Install new
library (online search)**), search for **photonlib**, and install it. The
search list is scoped to this project's pinned WPILib version, so it offers
you a matching 2027 alpha build.

**If the search comes up empty, install by this URL instead:**

```
https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/2027_alpha5/photonlib-v2027.0.0-alpha-2.json
```

Rebuild to confirm: `./gradlew build`.

> **Take the version pin seriously here.** PhotonVision's own docs hand out
> a URL that's a *moving* link — it serves whatever build is newest, which
> can silently be built for a different season than this project targets.
> The URL above is WPILib's own copy, pinned to one version, and it can't
> drift. Same trick works for any vendordep: swap the year and library name.

---

## 3. Tell the robot where the tags are

A `PhotonPoseEstimator` needs to know two things to turn "I see tag 7" into
a field position: where tag 7 *actually is* on the field, and where the
camera is on *your robot*. The first one is a solved problem — WPILib ships
the official tag layout for the current game.

**Add to `Constants.java`:**

```java
public static final class VisionConstants {
  public static final AprilTagFieldLayout kTagLayout =
      AprilTagFieldLayout.loadField(AprilTagFields.kDefaultField);
}
```

`AprilTagFields` is an enum with one entry per season's field —
`kDefaultField` is a standing alias to *whichever one is current*, so this
line never goes stale when the calendar turns over. (If your specific event
uses a field built by a different manufacturer, swap in that season's exact
constant instead, e.g. `AprilTagFields.k2026RebuiltWelded`.)

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
> a guess — you measure the camera's physical mount with a tape measure (or
> read it off a CAD model) and get it right to the centimeter. A wrong
> transform doesn't crash anything; it just quietly reports a robot position
> that's offset from the truth by exactly however wrong the measurement was.
> Section 10 has more to say about why this course's simulator, specifically,
> can't show you that failure happening.

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
hardware lives behind an interface, so nothing outside it needs to know or
care where a reading actually came from. Vision gets the same treatment.

**Create `src/main/java/first/robot/subsystems/VisionIO.java`:**

```java
package first.robot.subsystems;

import org.wpilib.math.geometry.Pose3d;

public interface VisionIO {
  public static class VisionIOInputs {
    public PoseObservation[] poseObservations = new PoseObservation[0];
  }

  /** One camera frame's worth of evidence: a candidate pose and how many tags built it. */
  public static record PoseObservation(double timestampSeconds, Pose3d pose, int tagCount) {}

  public default void updateInputs(VisionIOInputs inputs) {}
}
```

Two familiar pieces, one new shape. The `default` do-nothing method and the
nested `Inputs` class are exactly what `ModuleIO` and `GyroIO` already
taught you. What's new is the input itself: a single tick of vision isn't
one number — a camera can report zero, one, or several frames since the
last read (that's `getAllUnreadResults()`, from section 5), so the input is
an **array** of a small **`record`**, `PoseObservation`. A record is a
compact way to bundle a few related values — here, exactly what one
correction needs: when it was true, what the candidate pose was, and how
many tags built it.

---

## 7. Build `VisionIOPhotonVision`

Time to put section 5's ideas to work.

**Create `src/main/java/first/robot/subsystems/VisionIOPhotonVision.java`:**

```java
package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.photonvision.EstimatedRobotPose;
import org.photonvision.PhotonCamera;
import org.photonvision.PhotonPoseEstimator;
import org.photonvision.targeting.PhotonPipelineResult;

import org.wpilib.math.geometry.Transform3d;

import first.robot.Constants.VisionConstants;

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
*doesn't* do: it never touches the pose estimator this file's own name
doesn't belong to (`Localizer`'s), never decides whether a correction is
good enough to trust. Reading is the only job an IO class has; deciding what
to do with what it read belongs one layer up.

One detail worth flagging before section 8: `m_camera` is **`protected`**,
not `private`. That's Lesson 13's signal again — a subclass is coming for it.

---

## 8. Simulating a camera you don't own — the `extends` way

Nobody in this course has a coprocessor on their desk, so simulate it — and
this time, reach for the exact trick Lesson 13 already taught for
`ModuleIOSim`: **extend the real class, add the physics.**

**Create `src/main/java/first/robot/subsystems/VisionIOPhotonVisionSim.java`:**

```java
package first.robot.subsystems;

import java.util.function.Supplier;

import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants.VisionConstants;

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
builds the shared fake field, and populates it with tags; every camera built
after that — a second, a third — finds it already there and just adds
itself with `addCamera(...)`. That's the whole multi-camera feature, and
there's no varargs, no collection, no extra class to write: each camera you
construct registers itself, because `static` state remembers who's already
shown up.

`updateInputs` layers cleanly on top of `super`: step the fake field forward
with the robot's current pose, *then* let `VisionIOPhotonVision`'s
already-written logic read whatever the camera now reports — the same
"physics first, then read" order `ModuleIOSim` used back in Lesson 13.
`PhotonCameraSim` feeds its fake detections into the exact same `PhotonCamera`
object `VisionIOPhotonVision` already reads, over NetworkTables, the same
pipe a real coprocessor would use — so `estimateCoprocMultiTagPose` and
`estimateLowestAmbiguityPose` can't tell the difference, and don't need to.

The `poseSupplier` tells the fake vision field where to look from — what
pose to check each tag against when deciding whether a camera would see it.
Section 10 wires it to `Localizer::getPose()`, the same fused pose vision
itself feeds corrections into — the robot checking its simulated eyesight
against its own best guess, because this course's sim doesn't keep a
separate "actual" position to check against instead. Section 10 says more
about exactly what that trade-off costs you.

---

## 9. Build `PhotonVisionPoseProvider`

All the real work already happened in `VisionIO`, so the provider itself is
almost nothing — the same shape `SwerveModule` has had since Lesson 13: own
an IO, own an inputs bundle, read the bundle. It also picks up one more
job, one you've seen before in a different class: choosing *which* IO to
build. `Drivetrain` does that for its modules with a static `makeModule`
helper back in Lesson 13; `PhotonVisionPoseProvider` does the same for
itself with `makeCamera`.

**Create `src/main/java/first/robot/subsystems/PhotonVisionPoseProvider.java`:**

```java
package first.robot.subsystems;

import java.util.function.Supplier;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;

import first.robot.Constants;

/** A vision camera, contributing whatever pose corrections its IO reported this tick. */
public class PhotonVisionPoseProvider implements PoseProvider {
  private final VisionIO m_io;
  private final VisionIO.VisionIOInputs m_inputs = new VisionIO.VisionIOInputs();

  private final StructArrayPublisher<Pose3d> m_observationsPublisher;

  public PhotonVisionPoseProvider(VisionIO io, String logKey) {
    m_io = io;
    m_observationsPublisher = NetworkTableInstance.getDefault()
        .getStructArrayTopic(logKey + "/PoseObservations", Pose3d.struct)
        .publish();
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    m_io.updateInputs(m_inputs);

    Pose3d[] poses = new Pose3d[m_inputs.poseObservations.length];
    for (int i = 0; i < poses.length; i++) {
      poses[i] = m_inputs.poseObservations[i].pose();
    }
    m_observationsPublisher.set(poses);

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
      case REPLAY -> new VisionIO() {}; // nothing feeds this yet
    };
    return new PhotonVisionPoseProvider(io, "Localizer/" + name);
  }
}
```

`m_io.updateInputs(m_inputs)` reads (and, via the publisher, logs) whatever
the camera saw this tick — live hardware or the simulated one, `updatePoseEstimate`
can't tell which. Only after that read runs does the loop over
`m_inputs.poseObservations` fire the corrections into the estimator.

Notice what's missing compared to `SwerveModule`: no separate `periodic()`
and `setDesiredState()`. A steering module both senses *and* acts — an
angle to chase — so Lesson 13 split those into two methods. A camera only
ever reports; nothing here commands it. `PoseProvider` only ever asked for
one method, and today that one method both senses and consumes, because
there's nothing to separate.

`makeCamera` is `Drivetrain.makeModule` with one difference: `makeModule` is
`private`, because only `Drivetrain` ever calls it. `makeCamera` is `public`,
because `Robot` is about to call it from the outside — building a
`PhotonVisionPoseProvider` and picking its IO are the same decision now,
made in the one class that knows how to make both. That `Supplier<Pose2d>
poseSupplier` parameter is only ever read by the `SIM` arm —
`VisionIOPhotonVisionSim` needs to know where the robot is so it knows what
a camera there would see. It has to be a *supplier*, not a plain `Pose2d`:
the robot's pose changes every tick, and `VisionIOPhotonVisionSim` needs a
fresh one each time `updateInputs` runs, not whatever the pose happened to
be once, back at construction. Section 10 supplies it.

---

## 10. Wire it up and watch two cameras report

**In `Constants.java`, add the imports** `VisionConstants` needs — let
autocomplete find them: `AprilTagFieldLayout`/`AprilTagFields` live under
`org.wpilib.vision.apriltag`; `Transform3d`, `Translation3d`, and `Rotation3d`
live under `org.wpilib.math.geometry`, alongside the `Translation2d` already
imported there.

**Delete `VisionPoseProvider.java`** — `PhotonVisionPoseProvider` replaces
it, and nothing else in the project references the old one once `Robot` is
updated below.

`Localizer` needs no changes at all — its constructor, `periodic()`, and
every method stay exactly as Lesson 14 left them. That's worth sitting with:
an entire IO layer just went into the project, and the class that fuses
poses together never had to hear about it.

Two cameras join `Robot`'s fields, as blank finals, and get built in the
constructor — the same pattern Lesson 14 used for `localizer` itself: a
field needs a value assigned by the time the constructor returns, but that
value doesn't have to come from the field's own declaration line.

**Edit `Robot`'s fields:**

```java
public class Robot extends OpModeRobot {
  public final CommandGamepad driverController = new CommandGamepad(0);
  public final Drivetrain drivetrain = new Drivetrain();
  public final Localizer localizer = new Localizer(drivetrain);
  // Blank finals: building a camera needs localizer (for its pose supplier),
  // so localizer has to be a finished object first. Assigned below.
  public final PhotonVisionPoseProvider frontCamera;
  public final PhotonVisionPoseProvider backCamera;
```

**Build both cameras in `Robot`'s constructor:**

```java
  public Robot() {
    DataLogManager.start();
    Scheduler.getDefault().addEventListener(this::logCommandStart);

    frontCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, localizer::getPose);
    backCamera = PhotonVisionPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, localizer::getPose);
    localizer.addProvider(frontCamera);
    localizer.addProvider(backCamera);
  }
```

`localizer::getPose` is a **method reference** — shorthand for
`() -> localizer.getPose()` — and there's nothing subtle about it this time.
`localizer` isn't a promise to look something up later; it's an
already-built object sitting right there, the same way `drivetrain` is an
already-built object by the time `RobotTeleop` reaches for it. Building the
cameras in the constructor body, instead of in their own field initializers,
is what buys that: every field initializer above the constructor has
already run before the constructor's first line executes.

**Delete the Start-button binding from Lesson 14, in `RobotTeleop`** —
`robot.camera.reportSighting(...)` doesn't exist anymore; there's no fake
sighting to trigger, because there's no fake camera left.

Now run it. `./gradlew simulateJava` → **RobotTeleop**, and open the
**VisionSim/DebugField** widget in SimGUI alongside your usual **Field**.
AprilTags live around the edges of the field, so drive toward any boundary
— the debug field shows every tag and a wedge for each camera's field of
view, so you'll see exactly when one overlaps a tag. The moment it does,
watch `Localizer/Pose` on your main field view: the readings hold steady,
tightly clustered on wherever you actually drove, and `Localizer/Front/PoseObservations`
starts publishing real detections. Turn the robot so the *back* camera
crosses a different tag and watch that one contribute too, through the
exact same `Localizer` loop, logging under its own key.

> **Why you won't see the pose "snap."** Lesson 14's fake camera could pull
> a wrong pose toward (2, 5) dramatically, because it was an independent
> claim, unconnected to whatever `Localizer` already believed.
> `VisionIOPhotonVisionSim` can't do that trick, and section 8 already told
> you why: it renders what the *simulated* camera sees from
> `poseSupplier.get()` — the fused estimate itself. If that estimate were
> ever wrong, the simulated camera would compute a correction that's
> consistent with *being* wrong, not one that pulls toward some separate
> truth, because this course's simulator doesn't keep one of those yet. In
> practice this isn't a problem: with nothing to actively de-rail it,
> odometry alone tracks position closely enough in sim that the estimate
> never needs a dramatic correction — what you're watching is confirmation,
> not rescue. A real camera on a real field doesn't share this limitation;
> a real tag's position is real ground truth, independent of anything your
> code believes. Lesson 16 gives this course's simulator its own
> independent ground truth too, closing the gap.

---

## Try it

1. **Add a third camera.** Pick a corner mount — angled 45°, say — add its
   `Transform3d` to `VisionConstants`, declare a third `PhotonVisionPoseProvider`
   blank final on `Robot`, build it in the constructor with
   `PhotonVisionPoseProvider.makeCamera(...)`, and register it right after
   with `localizer.addProvider(...)`. Nothing in `VisionIOPhotonVisionSim`
   changes to make this work — its shared `static VisionSystemSim` just
   picks up a third camera the moment one more `VisionIOPhotonVisionSim` is
   constructed.
2. **Turn off multi-tag.** In `VisionIOPhotonVision.updateInputs`, delete the
   `estimateCoprocMultiTagPose` branch so every frame falls straight to
   `estimateLowestAmbiguityPose`. Drive past a spot where two tags are
   visible at once and compare — single-tag estimates should look visibly
   noisier on the plot than multi-tag did.
3. **Prove a miscalibrated camera is invisible here — and understand why.**
   Add 0.3 meters to `kFrontRobotToCamera`'s forward offset, pretending you
   measured wrong, and drive around watching `Localizer/Pose`. It doesn't
   skew. The callout in section 10 explains the mechanism: `robotToCamera`
   feeds both sides of this simulation — the fake camera's placement *and*
   the math that turns its detections back into a robot pose — so a wrong
   number cancels itself out. A real robot has no such luck: the physical
   mount doesn't know what constant you typed into `VisionConstants`, so
   this exact mistake would quietly and permanently offset every vision
   correction it makes. Put the number back, and take the lesson: some bugs
   this simulator simply cannot show you, and knowing which ones is its own
   kind of expertise.
4. **Watch the empty doorway, vision edition.** Flip `kSimMode` to
   `Mode.REPLAY` in `Constants.java` and run `./gradlew simulateJava`. Both
   cameras build fine — `PhotonVisionPoseProvider.makeCamera`'s `REPLAY` arm
   resolves to `new VisionIO() {}` — but `Localizer/Front/PoseObservations`
   and `Localizer/Back/PoseObservations` never publish a single reading, no
   matter how you drive. Same dormant doorway Lesson 13 built, now with a
   camera-shaped lock on it. Flip `kSimMode` back to `Mode.SIM` when you're
   done.

---

## What you learned

The `Localizer` you built in Lesson 14 just proved its reason for existing:
a real `PhotonVisionPoseProvider`, backed by an actual `PhotonCamera` and
`PhotonPoseEstimator`, slots into the exact same registry Lesson 14's fake
button-press provider used, and `Localizer` itself required no changes to
accept it. That's what the `PoseProvider` interface was for all along.

`Optional<EstimatedRobotPose>` gave "there might not be a pose this frame"
an honest, checkable type instead of a sentinel value someone forgets to
guard against, and multi-tag-first-with-single-tag-fallback is a real
version of the trust story Lesson 14 only sketched: more agreeing evidence
beats less, every time. A **`static` field** gave every simulated camera a
way to share one `VisionSystemSim` without holding a reference to each
other — this course's first reach for `static` state, and a clean picture
of what it's for: one copy, owned by the class, not by any one instance.

The bigger structural move was giving vision its own `VisionIO` — the same
interface/inputs-bundle/`REAL`-`SIM`-`REPLAY` treatment `ModuleIO` and
`GyroIO` got in Lesson 13. And you ran head-first into a real limit of this
course's simulator: because `VisionIOPhotonVisionSim` renders what the fake
camera sees from the *same* estimate vision then corrects, this sim can
confirm a good pose but can't demonstrate rescuing a bad one, and can't
expose a miscalibrated camera mount either — both need an independent
"actual" position to check against, which doesn't exist yet. That's not a
bug in what you built today; it's an honest boundary worth knowing, and
naming it is the whole reason section 10's callout and Try It 3 exist.

Fifteen lessons built a robot that knows how to move, knows where it is
(and can say honestly when it isn't sure), and now takes real, independent
evidence from a camera to help. What it still doesn't have is anywhere to
drive, or an independent truth to check its own guesses against — every
simulation you've run since Lesson 4 has been motors spinning in an empty
void. A future lesson hands the whole thing a physics engine, and with it,
the ground truth this lesson's callouts kept pointing toward.

Next: [Lesson 16 — Ground truth: give the simulation a body](16-ground-truth.md).
