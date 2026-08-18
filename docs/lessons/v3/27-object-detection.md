# Lesson 27 — Going to get something you just saw

**Goal:** Let the robot find a game piece with its camera, work out where on the
field it actually is, drive there, and pick it up — with no target picked in
advance.

**New Java concepts**
- **`Command.requiring(...).executing(...)`** — a command that decides what
  it's actually going to do the moment it starts, rather than when it was
  written. You declare the Mechanisms it will need up front; the body itself
  is built and run later.

**New robot concepts**
- **Object detection** — `getDetectedObjectClassID()` and
  `getDetectedObjectConfidence()`, and why a class ID is a number you agree
  with your model about
- **Bearing to field pose** — a detection is a pair of angles; turning it into
  a place requires knowing where you are
- **Choosing a target** when there's more than one
- **What to do when the thing you were driving to disappears**

---

## 1. A target you can't pick in advance

Everything the robot has driven to so far, you knew about before the match.

Lesson 26's scoring pose was typed into `Constants`. Even the two-stage
handoff between `driveToPose` and `alignToPose` was aimed at a place you
picked while sitting at a laptop.

Game pieces don't work like that. They start in known places and then,
roughly four seconds into the match, they are wherever twelve robots have
knocked them. An auto that drives to where a piece was supposed to be is an
auto that spends fifteen seconds intaking floor.

So the robot needs to look, decide, and drive — during the match, based on
something nobody knew when the code was written. Every piece of that exists
already: Lesson 15 put a camera behind an IO layer, Lesson 26 taught you to
drive to an exact pose, and Lesson 20 built the intake. What's missing is the
part where the camera says *there's one over there* and the code believes it
enough to act.

---

## 2. What a detection actually is

A detection pipeline is not the tag pipeline from Lesson 15. Tags are known
objects at known places, so seeing one tells you where *you* are. A detection
model doesn't know the field at all — it draws a box around something it
thinks it recognises and reports four things:

- **A class ID.** An integer. Which of the things it was trained to find this
  is.
- **A confidence.** How sure it is, 0 to 1.
- **A yaw and a pitch.** Where in the camera's view the box sits.

That's all. No distance, no position, no idea what it's looking at beyond a
number. Turning it into something useful is entirely your job, and that's the
lesson.

Start with the two constants that make the number mean something.

**Add to `VisionConstants` in `Constants.java`, below the back camera:**

```java
    // --- Object detection ---------------------------------------------------
    // A detection model reports what it saw as a number, and this pair is the
    // entire mapping between that number and what it means. There is no
    // standard class ID — it's the index of a class in the model YOU trained,
    // so on a real robot this constant is whatever your model emits.
    public static final String kGamePieceType = "Fuel";
    public static final int kGamePieceClassId = 0;

    /** A Fuel is a 15 cm ball, so its middle sits 8 cm off the floor. */
    public static final Distance kGamePieceDiameter = Meters.of(0.15);
    public static final Distance kGamePieceHeight = Meters.of(0.08);

    public static final String kObjectCameraName = "Objects";
    /**
     * The detection camera, tilted down so it can see the floor in front of
     * the robot. Positive pitch here points the camera DOWN.
     */
    public static final Transform3d kRobotToObjectCamera = new Transform3d(
        new Translation3d(0.3, 0.0, 0.5),           // 30 cm forward, 50 cm up
        new Rotation3d(0, Math.toRadians(20), 0));  // 20° down

    /** Below this, the model is guessing and we'd rather not drive at it. */
    public static final double kMinConfidence = 0.5;
```

> **There is no standard class ID.** It isn't in a rulebook and no library
> defines it. It's the index of a class in the model *you* trained, so it's
> whatever your model emits — and the only thing that matters is that this
> constant and that model agree. Getting it wrong produces no error and no
> detections, which is a combination worth recognising in advance.

Now the IO layer, which by now you can probably predict.

**Create `subsystems/ObjectDetectionIO.java`:**

```java
package first.robot.subsystems;

public interface ObjectDetectionIO {
  public static class ObjectDetectionIOInputs {
    public Detection[] detections = new Detection[0];
  }

  /**
   * One thing the camera saw, exactly as the camera saw it: two angles and how
   * sure the model was. Deliberately not a place on the field — the camera has
   * no idea where it is, and turning these into a position is somebody else's
   * job.
   */
  public static record Detection(double yawDegrees, double pitchDegrees, double confidence) {}

  public default void updateInputs(ObjectDetectionIOInputs inputs) {}
}
```

**That record is the design decision of this lesson, and it's worth
defending.** It would be easy to have the IO layer report a field position —
it's more convenient for everyone downstream. But a field position depends on
the robot's pose estimate, and the pose estimate isn't sensor data. Log a
position and you've baked in whatever the estimate happened to be at the
time; log the angles and the sensor reading stays honest no matter what the
localization code around it does later.

**An IO layer reports what the sensor said, not what you concluded.**

**Create `subsystems/ObjectDetectionIOPhotonVision.java`:**

```java
package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.photonvision.PhotonCamera;
import org.photonvision.targeting.PhotonPipelineResult;
import org.photonvision.targeting.PhotonTrackedTarget;

import first.robot.Constants.VisionConstants;

/** IO implementation for a real PhotonVision camera running a detection model. */
public class ObjectDetectionIOPhotonVision implements ObjectDetectionIO {
  protected final PhotonCamera m_camera;

  public ObjectDetectionIOPhotonVision(String cameraName) {
    m_camera = new PhotonCamera(cameraName);
  }

  @Override
  public void updateInputs(ObjectDetectionIOInputs inputs) {
    List<Detection> detections = new ArrayList<>();
    for (PhotonPipelineResult result : m_camera.getAllUnreadResults()) {
      for (PhotonTrackedTarget target : result.getTargets()) {
        // Two filters, and they reject different things: the wrong class is
        // a different object, low confidence is the same object badly seen.
        if (target.getDetectedObjectClassID() != VisionConstants.kGamePieceClassId) {
          continue;
        }
        if (target.getDetectedObjectConfidence() < VisionConstants.kMinConfidence) {
          continue;
        }
        detections.add(new Detection(
            target.getYaw(), target.getPitch(), target.getDetectedObjectConfidence()));
      }
    }
    inputs.detections = detections.toArray(new Detection[0]);
  }
}
```

`protected final PhotonCamera m_camera` for the same reason Lesson 15 did it:
the simulated version is about to extend this one.

---

## 3. Giving the simulator something to see

Lesson 15's fake camera can see `VisionTargetSim` objects — that's how it
fooled `PhotonPoseEstimator` into thinking it saw real AprilTags. It knows
nothing about a game piece, though, so the simulated detection camera needs
its own targets to look at.

**Create `subsystems/ObjectDetectionIOPhotonVisionSim.java`:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import java.util.function.Supplier;

import org.photonvision.estimation.TargetModel;
import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;
import org.photonvision.simulation.VisionTargetSim;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Rotation3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.geometry.Translation3d;

import first.robot.Constants.VisionConstants;

/**
 * IO implementation for a simulated detection camera.
 *
 * <p>Its own VisionSystemSim, separate from Lesson 15's: that one holds
 * AprilTags that never move, this one holds game pieces, and a camera
 * belongs to exactly one.
 *
 * <p>The pieces here sit at fixed field positions, not moving physics
 * objects — this places them once, at startup, and leaves them there.
 * Everything downstream of the camera — the angle math, the field-position
 * conversion, the driving — is exercised exactly the same either way.
 */
public class ObjectDetectionIOPhotonVisionSim extends ObjectDetectionIOPhotonVision {
  private final VisionSystemSim m_visionSim;
  private final Supplier<Pose2d> m_poseSupplier;

  public ObjectDetectionIOPhotonVisionSim(String cameraName, Supplier<Pose2d> poseSupplier) {
    super(cameraName);
    m_poseSupplier = poseSupplier;

    m_visionSim = new VisionSystemSim(cameraName);

    TargetModel pieceModel = new TargetModel(VisionConstants.kGamePieceDiameter.in(Meters));
    for (Translation2d position : VisionConstants.kSimGamePiecePositions) {
      Pose3d piecePose = new Pose3d(
          new Translation3d(
              position.getX(), position.getY(), VisionConstants.kGamePieceHeight.in(Meters)),
          new Rotation3d());
      // The 4-argument constructor sets the object-detection class and
      // confidence. The 3-argument one sets a fiducial ID instead, which is
      // a very quiet way to get no detections at all.
      m_visionSim.addVisionTargets(
          new VisionTargetSim(piecePose, pieceModel, VisionConstants.kGamePieceClassId, 1.0f));
    }

    SimCameraProperties cameraProps = new SimCameraProperties();
    cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
    cameraProps.setCalibError(0.25, 0.08);
    cameraProps.setFPS(20);

    PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);
    m_visionSim.addCamera(cameraSim, VisionConstants.kRobotToObjectCamera);
  }

  @Override
  public void updateInputs(ObjectDetectionIOInputs inputs) {
    m_visionSim.update(m_poseSupplier.get());
    super.updateInputs(inputs);
  }
}
```

**Add the fixed positions to `VisionConstants`, below `kMinConfidence`:**

```java
    /** Sim only: fixed field positions for the fake camera to see. No physics — just a layout. */
    public static final Translation2d[] kSimGamePiecePositions = {
        new Translation2d(4.5, 3.2),
        new Translation2d(2.0, 1.5),
        new Translation2d(6.0, 3.8),
    };
```

Two things there will cost you time if you meet them the hard way.

**This gets its own `VisionSystemSim`.** Lesson 15's holds the tag layout. A
camera can only belong to one, and mixing a permanent tag layout with a
completely different set of targets would mean the two pipelines fighting
over what the camera is even looking for.

**The four-argument `VisionTargetSim` constructor is not the three-argument
one with a default.** Three arguments sets a *fiducial ID* — an AprilTag
number. Four sets the object-detection class and confidence. They're both
`(Pose3d, TargetModel, int, ...)`, so the compiler is perfectly happy either
way, and the three-argument version produces a target your detection filter
silently rejects forever.

---

## 4. From two angles to a place on the field

Now the real content.

You have a yaw and a pitch. You want a point on the field. The gap between
those is everything the camera doesn't know, and you close it with one
assumption and one piece of arithmetic.

**The assumption is that the piece is on the floor.** A ball sitting on the
carpet has its middle at a fixed, known height — 8 cm, for this one. That
single fact is what makes one camera enough. Without it, a pitch angle
describes a whole ray of possible positions and you'd need a second camera to
pin down which.

With it, the geometry closes: you know how high the camera is, how far down
it's tilted, and how far below its centre the piece appears. That's a
right-angled triangle, and the missing side is the distance.

**Create `subsystems/GamePieceDetector.java`, starting with the conversion —
the heart of the lesson:**

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import java.util.Optional;
import java.util.function.Supplier;

import org.photonvision.PhotonUtils;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.util.Units;

import first.robot.Constants.VisionConstants;
import first.robot.subsystems.ObjectDetectionIO.Detection;

public class GamePieceDetector {
  /**
   * Two angles plus the robot's pose make a position. The height trick only
   * works because a game piece sits on the floor, so its middle is always the
   * same distance up — the one fact that makes a single camera enough.
   */
  private Optional<Translation2d> toFieldPosition(Detection detection, Pose2d robot) {
    Transform3d robotToCamera = VisionConstants.kRobotToObjectCamera;

    // PhotonUtils measures camera pitch UP from horizontal; the mounting
    // transform measures it down. Hence the minus sign.
    double distance = PhotonUtils.calculateDistanceToTargetMeters(
        robotToCamera.getZ(),
        VisionConstants.kGamePieceHeight.in(Meters),
        -robotToCamera.getRotation().getY(),
        Units.degreesToRadians(detection.pitchDegrees()));

    // Above the horizon the maths gives a negative distance, which means the
    // camera is looking at something that is not on the floor.
    if (distance <= 0) {
      return Optional.empty();
    }

    Translation2d cameraToPiece = PhotonUtils.estimateCameraToTargetTranslation(
        distance, Rotation2d.fromDegrees(-detection.yawDegrees()));

    // Camera frame -> robot frame -> field frame, one rotation at a time.
    Translation2d robotToPiece = cameraToPiece
        .rotateBy(robotToCamera.getRotation().toRotation2d())
        .plus(robotToCamera.getTranslation().toTranslation2d());

    return Optional.of(robot.getTranslation().plus(robotToPiece.rotateBy(robot.getRotation())));
  }
}
```

Three details in there are each worth an afternoon if you meet them cold.

**The minus signs are not decoration.** `PhotonUtils` measures the camera's
pitch as *up from horizontal*; the mounting `Transform3d` measures it *down*.
Same for yaw, where the camera's convention and the field's run opposite
ways. Neither is wrong, they're just different conventions meeting — and a
sign error here doesn't crash anything, it just sends the robot to a spot
that's mirrored or ten metres away.

**The negative-distance check is a real case, not paranoia.** If the camera
sees something above its own horizon, the triangle doesn't close and the
arithmetic hands back a negative number. On a real field that's a reflection,
a light, or a piece someone is holding. Driving to a negative distance would
send the robot backwards, fast.

**That last block is three coordinate frames in three lines.** The camera
measures in its own frame; the camera is mounted somewhere on the robot; the
robot is somewhere on the field. Each `rotateBy` moves up one level. Read it
bottom-up and it's the same nesting Lesson 19's mechanism drawing used, in
different clothes.

---

## 5. Choosing which one, and the rest of the class

A camera pointed at a field usually sees several pieces. Something has to
pick.

**Finish `GamePieceDetector` — fields and constructor first:**

```java
  private final ObjectDetectionIO m_io;
  private final ObjectDetectionIO.ObjectDetectionIOInputs m_inputs =
      new ObjectDetectionIO.ObjectDetectionIOInputs();

  private final Supplier<Pose2d> m_poseSupplier;

  /** Where the pieces are, in field coordinates, as of this tick. */
  private Translation2d[] m_pieces = new Translation2d[0];

  private final StructArrayPublisher<Translation2d> m_piecesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("ObjectDetection/Pieces", Translation2d.struct)
          .publish();

  public GamePieceDetector(Supplier<Pose2d> poseSupplier) {
    m_poseSupplier = poseSupplier;
    m_io = switch (Constants.kCurrentMode) {
      case REAL -> new ObjectDetectionIOPhotonVision(VisionConstants.kObjectCameraName);
      case SIM -> new ObjectDetectionIOPhotonVisionSim(
          VisionConstants.kObjectCameraName, poseSupplier);
      case REPLAY -> new ObjectDetectionIO() {}; // inputs come from the log
    };
    Scheduler.getDefault().addPeriodic(this::periodic);
  }
```

**Then `periodic()` and the three accessors, below the constructor:**

```java
  private void periodic() {
    m_io.updateInputs(m_inputs);

    List<Translation2d> pieces = new ArrayList<>();
    for (Detection detection : m_inputs.detections) {
      toFieldPosition(detection, m_poseSupplier.get()).ifPresent(pieces::add);
    }
    m_pieces = pieces.toArray(new Translation2d[0]);

    m_piecesPublisher.set(m_pieces);
    SmartDashboard.putBoolean("ObjectDetection/HasTarget", hasTarget());
  }

  /** Everything the camera can see right now, in field coordinates. */
  public Translation2d[] getPieces() {
    return m_pieces;
  }

  public boolean hasTarget() {
    return m_pieces.length > 0;
  }

  /**
   * The piece worth going for: the nearest one. Change this and you change
   * what the robot does — nearest is quick, but it isn't the only sensible
   * answer.
   */
  public Optional<Translation2d> bestPiece() {
    Translation2d robot = m_poseSupplier.get().getTranslation();
    Translation2d best = null;
    double bestDistance = Double.MAX_VALUE;
    for (Translation2d piece : m_pieces) {
      double distance = piece.getDistance(robot);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = piece;
      }
    }
    return Optional.ofNullable(best);
  }
```

**Add the imports this file needs, each to the group it belongs in:**

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.photonvision.PhotonUtils;

import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.util.Units;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants;
import first.robot.Constants.VisionConstants;
import first.robot.subsystems.ObjectDetectionIO.Detection;
```

That's `GamePieceDetector` in full — a plain class, the same shape as
`Localizer`: it drives nothing, no command ever needs to require it, so a
periodic heartbeat is all it needs.

Nearest is a defensible default and it is not the only one. Most-centred
means less turning. Most-confident means fewer wild goose chases. Every one
of those is a one-line change to `bestPiece`, which is worth noticing: **the
selection rule is strategy, expressed as code, and it's the cheapest thing on
this whole robot to change your mind about.**

*Nothing to add — this is everything you just wrote, in file order, to check
yours against:*

```java
package first.robot.subsystems;

import static org.wpilib.units.Units.Meters;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.photonvision.PhotonUtils;

import org.wpilib.command3.Scheduler;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation2d;
import org.wpilib.math.util.Units;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.StructArrayPublisher;
import org.wpilib.smartdashboard.SmartDashboard;

import first.robot.Constants;
import first.robot.Constants.VisionConstants;
import first.robot.subsystems.ObjectDetectionIO.Detection;

/**
 * Turns "the camera saw something at these angles" into "there is a game
 * piece at this spot on the field", which needs one thing the camera doesn't
 * have: knowing where the robot is.
 *
 * <p>Not a Mechanism, same reasoning as Localizer — it drives nothing and no
 * command ever needs to require it, so a plain periodic heartbeat is all it
 * needs.
 */
public class GamePieceDetector {
  private final ObjectDetectionIO m_io;
  private final ObjectDetectionIO.ObjectDetectionIOInputs m_inputs =
      new ObjectDetectionIO.ObjectDetectionIOInputs();

  private final Supplier<Pose2d> m_poseSupplier;

  /** Where the pieces are, in field coordinates, as of this tick. */
  private Translation2d[] m_pieces = new Translation2d[0];

  private final StructArrayPublisher<Translation2d> m_piecesPublisher =
      NetworkTableInstance.getDefault()
          .getStructArrayTopic("ObjectDetection/Pieces", Translation2d.struct)
          .publish();

  public GamePieceDetector(Supplier<Pose2d> poseSupplier) {
    m_poseSupplier = poseSupplier;
    m_io = switch (Constants.kCurrentMode) {
      case REAL -> new ObjectDetectionIOPhotonVision(VisionConstants.kObjectCameraName);
      case SIM -> new ObjectDetectionIOPhotonVisionSim(
          VisionConstants.kObjectCameraName, poseSupplier);
      case REPLAY -> new ObjectDetectionIO() {}; // inputs come from the log
    };
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    m_io.updateInputs(m_inputs);

    List<Translation2d> pieces = new ArrayList<>();
    for (Detection detection : m_inputs.detections) {
      toFieldPosition(detection, m_poseSupplier.get()).ifPresent(pieces::add);
    }
    m_pieces = pieces.toArray(new Translation2d[0]);

    m_piecesPublisher.set(m_pieces);
    SmartDashboard.putBoolean("ObjectDetection/HasTarget", hasTarget());
  }

  /** Everything the camera can see right now, in field coordinates. */
  public Translation2d[] getPieces() {
    return m_pieces;
  }

  public boolean hasTarget() {
    return m_pieces.length > 0;
  }

  /**
   * The piece worth going for: the nearest one. Change this and you change
   * what the robot does — nearest is quick, but it isn't the only sensible
   * answer.
   */
  public Optional<Translation2d> bestPiece() {
    Translation2d robot = m_poseSupplier.get().getTranslation();
    Translation2d best = null;
    double bestDistance = Double.MAX_VALUE;
    for (Translation2d piece : m_pieces) {
      double distance = piece.getDistance(robot);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = piece;
      }
    }
    return Optional.ofNullable(best);
  }

  /**
   * Two angles plus the robot's pose make a position. The height trick only
   * works because a game piece sits on the floor, so its middle is always the
   * same distance up — the one fact that makes a single camera enough.
   */
  private Optional<Translation2d> toFieldPosition(Detection detection, Pose2d robot) {
    Transform3d robotToCamera = VisionConstants.kRobotToObjectCamera;

    // PhotonUtils measures camera pitch UP from horizontal; the mounting
    // transform measures it down. Hence the minus sign.
    double distance = PhotonUtils.calculateDistanceToTargetMeters(
        robotToCamera.getZ(),
        VisionConstants.kGamePieceHeight.in(Meters),
        -robotToCamera.getRotation().getY(),
        Units.degreesToRadians(detection.pitchDegrees()));

    // Above the horizon the maths gives a negative distance, which means the
    // camera is looking at something that is not on the floor.
    if (distance <= 0) {
      return Optional.empty();
    }

    Translation2d cameraToPiece = PhotonUtils.estimateCameraToTargetTranslation(
        distance, Rotation2d.fromDegrees(-detection.yawDegrees()));

    // Camera frame -> robot frame -> field frame, one rotation at a time.
    Translation2d robotToPiece = cameraToPiece
        .rotateBy(robotToCamera.getRotation().toRotation2d())
        .plus(robotToCamera.getTranslation().toTranslation2d());

    return Optional.of(robot.getTranslation().plus(robotToPiece.rotateBy(robot.getRotation())));
  }
}
```

---

## 6. Driving to something you only just learned about

Now a problem that's been waiting since Lesson 26.

Every command you've bound to a button so far was built once, when the robot
was switched on — `Autos.driveToScoringPose(drivetrain, localizer)` reads a
constant that already existed at boot. `bestPiece()` doesn't exist yet at
boot. Nobody has seen anything.

*Nothing to add — this is the version we're about to reject:*

```java
    // Built at startup, when the camera has never seen anything.
    robot.driverController.rightBumper().whileTrue(
        drivetrain.driveToPose(detector.bestPiece().orElseThrow(), localizer::getPose));
```

That throws the instant the robot boots, because `bestPiece()` is empty
before anyone has pressed anything. Even patched to tolerate emptiness, the
target would be frozen at whatever `bestPiece()` returned the moment
`RobotTeleop`'s constructor ran — which is always nothing, because the
constructor runs before the match starts.

**`Command.requiring(...).executing(...)` is the fix.** `requiring` declares
the Mechanisms the eventual command will need — it has to be declared up
front, because the command doesn't exist yet for the scheduler to work it out
from. `executing` takes the coroutine body, and that body isn't run until the
command is actually scheduled — which is the first moment a real detection
exists to build a target from.

**Add to `Autos.java`:**

```java
  /**
   * Where to stand to collect a piece: at the piece, facing the way we came, so
   * the intake gets there first.
   */
  private static Pose2d collectPose(Pose2d robot, Translation2d piece) {
    return new Pose2d(piece, piece.minus(robot.getTranslation()).getAngle());
  }

  /**
   * Go and get whatever the camera can see right now, running the intake on
   * the way.
   *
   * <p>The approach pose can't be picked at startup, because at startup
   * nobody has seen anything — {@code requiring(...).executing(...)} builds
   * the actual drive command from inside its own body, the moment it starts,
   * which is the first time a detection exists to build it from. Declaring
   * the requirement up front is the price: the command doesn't exist yet, so
   * the scheduler can't work it out on its own.
   */
  public static Command fetchPiece(
      Drivetrain drivetrain, Localizer localizer, GamePieceDetector detector,
      Superstructure superstructure) {
    return Command.requiring(drivetrain)
        .executing(coroutine -> {
          Optional<Translation2d> piece = detector.bestPiece();
          if (piece.isEmpty()) {
            return; // saw nothing — undramatic: the intake still deploys, the robot doesn't move
          }
          // Legality is Superstructure's call, not this method's — if a
          // request to intake isn't allowed right now, it's silently
          // refused exactly like any other button-bound request would be.
          coroutine.await(superstructure.requestIntake());
          coroutine.await(drivetrain.driveToPose(
              collectPose(localizer.getPose(), piece.get()), localizer::getPose));
        })
        .named("Fetch Piece");
  }
```

**Add the imports:**

```java
import java.util.Optional;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Translation2d;

import first.robot.subsystems.GamePieceDetector;
import first.robot.subsystems.Superstructure;
```

The empty-piece branch is deliberately undramatic — press the button facing
an empty corner and the request goes out, `canGoTo` might grant it, the arm
swings down, and the robot simply doesn't move. Nothing throws.

`superstructure.requestIntake()` is worth pausing on, because it's the
payoff of Lesson 24 already existing: this method doesn't touch the arm or
elevator directly at all. It asks Superstructure to change state, the same
guarded request any button uses, and the actual arm-and-roller motion is
already wired to fire the instant `m_state` becomes `INTAKING` — from
`RobotTeleop`'s `inState(INTAKING).whileTrue(intakeMotion())` binding, built
in Lesson 24. `fetchPiece` only ever has to require `Drivetrain`, because the
intake half of the job isn't its job at all.

**Add the field to `Robot.java`, right after `localizer`:**

```java
  // Same trick as the cameras below: it needs localizer, which is already a
  // finished object by the time this line runs.
  public final GamePieceDetector pieceDetector = new GamePieceDetector(localizer::getPose);
```

**Add the import:**

```java
import first.robot.subsystems.GamePieceDetector;
```

**Add the binding in `RobotTeleop.java`'s constructor:**

```java
    // Hold the right bumper to go and get a game piece — wherever it is, if
    // the camera can see one at the moment you press it.
    robot.driverController.rightBumper().whileTrue(Autos.fetchPiece(
        robot.drivetrain, robot.localizer, robot.pieceDetector, robot.superstructure));
```

---

## 7. What "seeing it" actually means, tick to tick

`Command.requiring(...).executing(...)` takes a snapshot. The moment you
press the button, the robot decides where the piece is and commits to
driving there. From then on it's driving to a *memory*.

How stale can that memory get? This is the part where it would be easy to
hand you a table of made-up numbers that look like real hardware, and that
would be dishonest. Here's what's actually true of this simulated camera,
measured, not guessed:

**The simulated detection itself is close to exact.** Every distance from
1 m to 4 m came back within a few millimetres of the piece's real position —
because this simulated camera projects the piece's exact 3D model onto the
image and reads the box back off, with no lens distortion, no pixel
quantization noise, and no mounting slop. A real camera and a real trained
model have all three. **Don't take this simulator's accuracy as a promise
about real hardware — it's a property of a clean simulated bounding box, not
of the technique.**

**What *is* real, and worth watching, is the flicker.** This camera runs at
20 frames a second inside a scheduler ticking at 50. Watch
`ObjectDetection/HasTarget` on the dashboard while the robot sits still
facing a piece: it doesn't hold `true`. It's `true` on roughly two ticks out
of every five and `false` the rest of the time, because most ticks land
between camera frames. That's not a bug and it never mattered before now,
because nothing was making a one-time decision based on it. `fetchPiece`
does. The moment you press the button, whatever `bestPiece()` returns *right
then* is what gets built into a target — a `false` tick a tenth of a second
later doesn't call the drive back, because the drive was never watching.

That's the real version of the question the old numbers would have been
gesturing at: **a decision made from sensor data has a shelf life, and the
question isn't "how noisy was the reading" so much as "how have things
changed since the reading was taken."** Three honest options, same as ever:

**Commit.** What the code above does. Simple, predictable, fine when the
intake is wide and pieces don't move much. It fails silently — the robot
drives confidently to nothing if the piece was moved or the reading was
wrong.

**Abort.** Give up if the piece hasn't been seen for a few tenths of a
second, and let the driver try again. Honest, and it turns a silent failure
into an obvious one — though the flicker above means you'd need to debounce
"hasn't been seen," or a normal camera frame gap looks identical to the
piece actually being gone.

**Look again on the way.** Drive most of the distance using the snapshot,
then re-derive the target from a fresh detection once close. Lesson 26
already split driving into a coarse stage and a fine one; the seam to do
this at is sitting right there.

The code ships the simple version because it's the one you can read. Try It
3 builds the second one.

---

## 8. Run it

`./gradlew simulateJava`. Drive around and watch `ObjectDetection/Pieces` on
the field view — markers should sit on top of the three fixed positions from
`kSimGamePiecePositions`, flickering in and out as the camera's frame rate
and the scheduler's tick rate drift in and out of phase.

Then drive near one of the pieces and hold the right bumper. The arm drops,
the roller spins, and the robot drives itself onto the piece.

Things worth doing deliberately:

- **Press the bumper facing an empty part of the field.** The intake
  deploys, nothing moves, nothing breaks.
- **Watch `ObjectDetection/HasTarget` flicker while the robot sits
  still.** That's section 7, live — and it's exactly why `fetchPiece`
  commits once instead of continuously re-checking.
- **Set `kGamePieceClassId` to 1 and try again.** No error, no warning, no
  detections — exactly the failure mode from section 2. Put it back.

---

## Try it

1. **Change the selection rule.** Make `bestPiece` prefer the most *centred*
   piece — smallest absolute yaw — instead of the nearest. Which one gets
   more pieces per fifteen seconds is a real question with a real answer,
   and you can measure it.
2. **Find the confidence floor — on the model, not the constant.** In this
   sim, every fake piece reports confidence `1.0`, so raising or lowering
   `kMinConfidence` won't visibly change anything here — that constant only
   matters against a real, imperfect model. Instead, change the `1.0f` in
   `ObjectDetectionIOPhotonVisionSim`'s `VisionTargetSim` construction to
   something below `kMinConfidence` and watch the piece vanish from
   `ObjectDetection/Pieces` even though it's sitting right there. That's the
   filter doing exactly what it's for.
3. **Look again on the way in.** Split `fetchPiece` so the last stretch
   re-derives the target from a fresh detection rather than the snapshot.
   You'll have to decide what to do when the piece isn't visible at that
   exact tick — which, per section 7's flicker, is going to happen whether
   the piece moved or not.
4. **Make failure loud.** Add a state to `SuperstructureState` — or a
   separate boolean Leds already knows how to read — that lights up while
   `fetchPiece` is committed to a target it can no longer see.
5. **Reject the impossible.** A detection outside the field boundary is
   wrong no matter how confident the model is. Add that filter and decide
   where it belongs — the IO layer, or the detector.

---

## What you learned

The robot can now be told "go get that" by something other than a person.

**A detection is an angle, not a place.** The camera reports where something
sits in its own view and nothing more. Turning that into a point on the
field takes an assumption about the world — that the piece is on the floor —
and knowledge of where the robot is. Neither comes from the camera, and
that's why this lesson needed Lesson 14's pose estimator as much as it
needed a vision pipeline.

**IO layers report readings, not conclusions.** It would have been easier to
have the IO hand back field positions. Logging the raw angles instead means
the sensor reading stays honest no matter what the localization code around
it does later — the same argument Lesson 15 made about tags, applied to
something that moves.

**Some commands can't be built in advance.** Everything up to now was
assembled at startup, because everything up to now was known at startup.
`Command.requiring(...).executing(...)` is the escape hatch for the moment
that stops being true, and the price is declaring the requirement yourself,
since the scheduler can't read it off a command that doesn't exist yet.

And the one worth carrying past this lesson: **a decision made from sensor
data has a shelf life.** This particular simulated camera happens to be
almost perfectly accurate, which is a fact about the simulator, not a promise
about your robot. What's real in every case — sim or hardware — is that
`fetchPiece` commits once and doesn't look back, and knowing that is what
separates an auto that works in the pit from one that works on the field.
