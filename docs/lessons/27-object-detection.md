# Lesson 27 — Going to get something you just saw

**Goal:** Let the robot find a game piece with its camera, work out where on the
field it actually is, drive there, and pick it up — with no path drawn in advance.

**New Java concepts**
- **`Commands.defer`** — a command that decides what it's going to do at the
  moment it starts, rather than when it was written.

**New robot concepts**
- **Object detection** — `getDetectedObjectClassID()` and
  `getDetectedObjectConfidence()`, and why a class ID is a number you agree with
  your model about
- **Bearing to field pose** — a detection is a pair of angles; turning it into a
  place requires knowing where you are
- **Choosing a target** when there's more than one
- **What to do when the thing you were driving to disappears**

---

## 1. A path you can't draw in advance

Everything the robot has driven to so far, you knew about in advance.

Lesson 17's paths were drawn in a file before the match. Lesson 26's staging pose
was computed from a target you'd typed into `Constants`. Even the clever bits —
the event markers, the rotation override — were all aimed at places you picked
while sitting at a laptop.

Game pieces don't work like that. They start in known places and then, roughly
four seconds into the match, they are wherever twelve robots have knocked them.
An auto that drives to where a piece was supposed to be is an auto that spends
fifteen seconds intaking floor.

So the robot needs to look, decide, and drive — during the match, based on
something nobody knew when the code was written. Every piece of that exists
already: Lesson 15 put a camera behind an IO layer, Lesson 26 taught you to build
a path in code, and Lesson 20 built the intake. What's missing is the part where
the camera says *there's one over there* and the code believes it enough to act.

---

## 2. What a detection actually is

A detection pipeline is not the tag pipeline from Lesson 15. Tags are known
objects at known places, so seeing one tells you where *you* are. A detection
model doesn't know the field at all — it draws a box around something it thinks
it recognises and reports four things:

- **A class ID.** An integer. Which of the things it was trained to find this is.
- **A confidence.** How sure it is, 0 to 1.
- **A yaw and a pitch.** Where in the camera's view the box sits.

That's all. No distance, no position, no idea what it's looking at beyond a
number. Turning it into something useful is entirely your job, and that's the
lesson.

Start with the two constants that make the number mean something.

**Add to `VisionConstants` in `Constants.java`, below the back camera:**

```java
    // --- Object detection ---------------------------------------------------
    // A detection model reports what it saw as a number. maple-sim types its
    // pieces by name. This pair is the entire mapping between the two, and it
    // only has to agree with itself: on a real robot the ID is whatever your
    // model was trained to emit, which you read off the model.
    public static final String kGamePieceType = "Fuel";
    public static final int kGamePieceClassId = 0;

    /** A Fuel is a 15 cm ball, so its middle sits 8 cm off the floor. */
    public static final Distance kGamePieceDiameter = Meters.of(0.15);
    public static final Distance kGamePieceHeight = Meters.of(0.08);

    public static final String kObjectCameraName = "Objects";
    /**
     * The detection camera, tilted down so it can see the floor in front of the
     * robot. Positive pitch here points the camera DOWN.
     */
    public static final Transform3d kRobotToObjectCamera = new Transform3d(
        new Translation3d(0.3, 0.0, 0.5),           // 30 cm forward, 50 cm up
        new Rotation3d(0, Math.toRadians(20), 0));  // 20° down

    /** Below this, the model is guessing and we'd rather not drive at it. */
    public static final double kMinConfidence = 0.5;
```

> **There is no standard class ID.** It isn't in a rulebook and no library defines
> it. It's the index of a class in the model *you* trained, so it's whatever your
> model emits — and the only thing that matters is that this constant and that
> model agree. Getting it wrong produces no error and no detections, which is a
> combination worth recognising in advance.

Now the IO layer, which by now you can probably predict.

**Create `ObjectDetectionIO.java` in `frc/robot/subsystems/`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.AutoLog;

public interface ObjectDetectionIO {
    @AutoLog
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

**That record is the design decision of this lesson, and it's worth defending.**
It would be easy to have the IO layer report a field position — it's more
convenient for everyone downstream. But a field position depends on the robot's
pose estimate, and the pose estimate is not sensor data. Log a position and your
replay is stuck with whatever the estimate happened to be that day; log the
angles and you can replay the same camera frames through better localization
code tomorrow.

**An IO layer reports what the sensor said, not what you concluded.**

**Create `ObjectDetectionIOPhotonVision.java`:**

```java
package frc.robot.subsystems;

import java.util.ArrayList;
import java.util.List;

import org.photonvision.PhotonCamera;
import org.photonvision.targeting.PhotonPipelineResult;
import org.photonvision.targeting.PhotonTrackedTarget;

import frc.robot.Constants.VisionConstants;

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
                // Two filters, and they reject different things: the wrong class
                // is a different object, low confidence is the same object badly
                // seen.
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

`protected final PhotonCamera m_camera` for the same reason Lesson 15 did it: the
simulated version is about to extend this one.

---

## 3. The simulator has to put the balls where the balls are

Here's the part that makes this lesson runnable on a laptop, and it's more
interesting than plumbing.

Lesson 16 gave you a physics field full of game pieces that roll around and get
eaten. Lesson 15 gave you a fake camera that can see `VisionTargetSim` objects.
Those two systems have never met. The fake camera knows about AprilTags, which
never move; it knows nothing about a ball that just bounced off a wall.

So the simulated IO has one real job: **every tick, ask the physics engine where
the pieces are, and tell the fake camera.**

**Create `ObjectDetectionIOPhotonVisionSim.java`:**

```java
package frc.robot.subsystems;

import java.util.function.Supplier;

import org.ironmaple.simulation.SimulatedArena;
import org.photonvision.estimation.TargetModel;
import org.photonvision.simulation.PhotonCameraSim;
import org.photonvision.simulation.SimCameraProperties;
import org.photonvision.simulation.VisionSystemSim;
import org.photonvision.simulation.VisionTargetSim;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import frc.robot.Constants.VisionConstants;

import static edu.wpi.first.units.Units.Meters;

/**
 * IO implementation for a simulated detection camera.
 *
 * <p>Its own VisionSystemSim, separate from Lesson 15's: that one holds AprilTags
 * that never move, this one holds game pieces that move constantly, and a camera
 * belongs to exactly one of them.
 */
public class ObjectDetectionIOPhotonVisionSim extends ObjectDetectionIOPhotonVision {
    private static final String kTargetGroup = "gamepieces";
    private static final TargetModel kPieceModel =
            new TargetModel(VisionConstants.kGamePieceDiameter.in(Meters));

    private final VisionSystemSim m_visionSim;
    private final Supplier<Pose2d> m_poseSupplier;

    public ObjectDetectionIOPhotonVisionSim(String cameraName, Supplier<Pose2d> poseSupplier) {
        super(cameraName);
        m_poseSupplier = poseSupplier;

        m_visionSim = new VisionSystemSim(cameraName);
        SmartDashboard.putData("ObjectSim/DebugField", m_visionSim.getDebugField());

        SimCameraProperties cameraProps = new SimCameraProperties();
        cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));
        cameraProps.setCalibError(0.25, 0.08);
        cameraProps.setFPS(20);

        PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);
        m_visionSim.addCamera(cameraSim, VisionConstants.kRobotToObjectCamera);
    }

    @Override
    public void updateInputs(ObjectDetectionIOInputs inputs) {
        refreshPieceTargets();
        m_visionSim.update(m_poseSupplier.get());
        super.updateInputs(inputs);
    }

    /**
     * Game pieces move, get eaten and get spat back out, so the fake camera's idea
     * of what is on the field has to be rebuilt from the physics engine every tick.
     */
    private void refreshPieceTargets() {
        m_visionSim.removeVisionTargets(kTargetGroup);
        for (Pose3d piece :
                SimulatedArena.getInstance().getGamePiecesPosesByType(VisionConstants.kGamePieceType)) {
            // The 4-argument constructor sets the object-detection class and
            // confidence. The 3-argument one sets a fiducial ID instead, which is
            // a very quiet way to get no detections at all.
            m_visionSim.addVisionTargets(kTargetGroup, new VisionTargetSim(
                    piece, kPieceModel, VisionConstants.kGamePieceClassId, 1.0f));
        }
    }
}
```

Two things there will cost you time if you meet them the hard way.

**This gets its own `VisionSystemSim`.** Lesson 15's holds the tag layout. A
camera can only belong to one, and mixing a permanent tag layout with targets you
rebuild every tick would mean deleting and re-adding the tags too.

**The four-argument `VisionTargetSim` constructor is not the three-argument one
with a default.** Three arguments sets a *fiducial ID* — an AprilTag number.
Four sets the object-detection class and confidence. They're both `(Pose3d,
TargetModel, int, ...)`, so the compiler is perfectly happy either way, and the
three-argument version produces a target your detection filter silently rejects
forever.

---

## 4. From two angles to a place on the field

Now the real content.

You have a yaw and a pitch. You want a point on the field. The gap between those
is everything the camera doesn't know, and you close it with one assumption and
one piece of arithmetic.

**The assumption is that the piece is on the floor.** A ball sitting on the carpet
has its middle at a fixed, known height — 8 cm, for this one. That single fact is
what makes one camera enough. Without it, a pitch angle describes a whole ray of
possible positions and you'd need a second camera to pin down which.

With it, the geometry closes: you know how high the camera is, how far down it's
tilted, and how far below its centre the piece appears. That's a right-angled
triangle, and the missing side is the distance.

**Create `GamePieceDetector.java` in `frc/robot/subsystems/`, starting with:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.littletonrobotics.junction.Logger;
import org.photonvision.PhotonUtils;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.VisionConstants;
import frc.robot.subsystems.ObjectDetectionIO.Detection;
```

**Then the class, its fields, and the mode switch you've written five times now:**

```java
/**
 * Turns "the camera saw something at these angles" into "there is a game piece
 * at this spot on the field", which needs one thing the camera doesn't have:
 * knowing where the robot is.
 */
public class GamePieceDetector extends SubsystemBase {
    private final ObjectDetectionIO m_io;
    private final ObjectDetectionIOInputsAutoLogged m_inputs =
            new ObjectDetectionIOInputsAutoLogged();

    private final Supplier<Pose2d> m_poseSupplier;

    /** Where the pieces are, in field coordinates, as of this tick. */
    private Translation2d[] m_pieces = new Translation2d[0];

    public GamePieceDetector(Supplier<Pose2d> poseSupplier) {
        m_poseSupplier = poseSupplier;
        m_io = switch (Constants.kCurrentMode) {
            case REAL -> new ObjectDetectionIOPhotonVision(VisionConstants.kObjectCameraName);
            case SIM -> new ObjectDetectionIOPhotonVisionSim(
                    VisionConstants.kObjectCameraName, poseSupplier);
            case REPLAY -> new ObjectDetectionIO() {}; // inputs come from the log
        };
    }
```

**Then the conversion — the heart of the lesson:**

```java
    /**
     * Two angles plus the robot's pose make a position. The height trick only
     * works because a game piece sits on the floor, so its middle is always the
     * same distance up — the one fact that makes a single camera enough.
     */
    private Optional<Translation2d> toFieldPosition(Detection detection) {
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

        Pose2d robot = m_poseSupplier.get();
        return Optional.of(robot.getTranslation()
                .plus(robotToPiece.rotateBy(robot.getRotation())));
    }
}
```

Three details in there are each worth an afternoon if you meet them cold.

**The minus signs are not decoration.** `PhotonUtils` measures the camera's pitch
as *up from horizontal*; the mounting `Transform3d` measures it *down*. Same for
yaw, where the camera's convention and the field's run opposite ways. Neither is
wrong, they're just different conventions meeting — and a sign error here doesn't
crash anything, it just sends the robot to a spot that's mirrored or ten metres
away.

**The negative-distance check is a real case, not paranoia.** If the camera sees
something above its own horizon, the triangle doesn't close and the arithmetic
hands back a negative number. On a real field that's a reflection, a light, or a
piece someone is holding. Driving to a negative distance would send the robot
backwards, fast.

**That last block is three coordinate frames in three lines.** The camera measures
in its own frame; the camera is mounted somewhere on the robot; the robot is
somewhere on the field. Each `rotateBy` moves up one level. Read it bottom-up and
it's the same nesting Lesson 19's mechanism drawing used, in different clothes.

---

## 5. Choosing which one

A camera pointed at a field usually sees several pieces. Something has to pick.

**Add to `GamePieceDetector`, above `toFieldPosition`:**

```java
    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("ObjectDetection", m_inputs);

        List<Translation2d> pieces = new ArrayList<>();
        for (Detection detection : m_inputs.detections) {
            toFieldPosition(detection).ifPresent(pieces::add);
        }
        m_pieces = pieces.toArray(new Translation2d[0]);

        Logger.recordOutput("ObjectDetection/Pieces", m_pieces);
        Logger.recordOutput("ObjectDetection/HasTarget", hasTarget());
    }

    /** Everything the camera can see right now, in field coordinates. */
    public Translation2d[] getPieces() {
        return m_pieces;
    }

    public boolean hasTarget() {
        return m_pieces.length > 0;
    }

    /**
     * The piece worth going for: the nearest one. Change this and you change what
     * the robot does — nearest is quick, but it isn't the only sensible answer.
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

That completes `GamePieceDetector`, but you wrote it out of order — the
conversion first, because it's the interesting part, and the bookkeeping after.
Here's the whole file, to check yours against:

*Nothing to add — this is everything you just wrote, in file order:*

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Meters;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.littletonrobotics.junction.Logger;
import org.photonvision.PhotonUtils;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.VisionConstants;
import frc.robot.subsystems.ObjectDetectionIO.Detection;

/**
 * Turns "the camera saw something at these angles" into "there is a game piece
 * at this spot on the field", which needs one thing the camera doesn't have:
 * knowing where the robot is.
 */
public class GamePieceDetector extends SubsystemBase {
    private final ObjectDetectionIO m_io;
    private final ObjectDetectionIOInputsAutoLogged m_inputs =
            new ObjectDetectionIOInputsAutoLogged();

    private final Supplier<Pose2d> m_poseSupplier;

    /** Where the pieces are, in field coordinates, as of this tick. */
    private Translation2d[] m_pieces = new Translation2d[0];

    public GamePieceDetector(Supplier<Pose2d> poseSupplier) {
        m_poseSupplier = poseSupplier;
        m_io = switch (Constants.kCurrentMode) {
            case REAL -> new ObjectDetectionIOPhotonVision(VisionConstants.kObjectCameraName);
            case SIM -> new ObjectDetectionIOPhotonVisionSim(
                    VisionConstants.kObjectCameraName, poseSupplier);
            case REPLAY -> new ObjectDetectionIO() {}; // inputs come from the log
        };
    }

    @Override
    public void periodic() {
        m_io.updateInputs(m_inputs);
        Logger.processInputs("ObjectDetection", m_inputs);

        List<Translation2d> pieces = new ArrayList<>();
        for (Detection detection : m_inputs.detections) {
            toFieldPosition(detection).ifPresent(pieces::add);
        }
        m_pieces = pieces.toArray(new Translation2d[0]);

        Logger.recordOutput("ObjectDetection/Pieces", m_pieces);
        Logger.recordOutput("ObjectDetection/HasTarget", hasTarget());
    }

    /** Everything the camera can see right now, in field coordinates. */
    public Translation2d[] getPieces() {
        return m_pieces;
    }

    public boolean hasTarget() {
        return m_pieces.length > 0;
    }

    /**
     * The piece worth going for: the nearest one. Change this and you change what
     * the robot does — nearest is quick, but it isn't the only sensible answer.
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
    private Optional<Translation2d> toFieldPosition(Detection detection) {
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

        Pose2d robot = m_poseSupplier.get();
        return Optional.of(robot.getTranslation()
                .plus(robotToPiece.rotateBy(robot.getRotation())));
    }
}
```

Nearest is a defensible default and it is not the only one. Most-centred means
less turning. Most-confident means fewer wild goose chases. Furthest-from-the-
opposing-alliance means you don't drive into traffic. Every one of those is a
one-line change to this method and a different robot on the field, which is worth
noticing: **the selection rule is strategy, expressed as code, and it's the
cheapest thing on this whole robot to change your mind about.**

---

## 6. Driving to something you only just learned about

Now a problem you've been walking towards since Lesson 26.

`Autos.driveToPose` builds a path when it is *called*. Every command in
`RobotContainer` is built once, at startup, when the robot is switched on. At
that moment nobody has seen anything, so there is no target to build a path to.

You cannot write `driveToPose(drivetrain, localizer, detector.bestPiece())`
because at startup that's empty, and it will still be empty every time the button
is pressed, because the command was frozen at boot.

*Nothing to add — this is the version we're about to reject:*

```java
    // Built at startup, when the camera has never seen anything.
    m_driverController.rightBumper().whileTrue(
        Autos.driveToPose(m_drivetrain, m_localizer, detector.bestPiece().orElseThrow()));
```

**`Commands.defer` is the fix.** It takes a supplier of a command and doesn't call
it until the moment the command is scheduled. The thing you write at startup is a
promise to decide later.

It needs one extra thing: the subsystems the eventual command will require. It
can't work them out, because the command doesn't exist yet — so you declare them
up front and the scheduler can do its job normally.

**Add to `Autos.java`, above `registerEventTriggers`:**

```java
  /**
   * Where to stand to collect a piece: at the piece, facing the way we came, so
   * the intake gets there first.
   */
  private static Pose2d collectPose(Pose2d robot, Translation2d piece) {
    return new Pose2d(piece, piece.minus(robot.getTranslation()).getAngle());
  }

  /**
   * Go and get whatever the camera can see, running the intake on the way.
   *
   * <p>The approach path cannot be built now, because right now nobody has seen
   * anything. Commands.defer builds it at the moment the command is scheduled,
   * which is the first time a detection exists to build it from.
   */
  public static Command fetchPiece(
      Drivetrain drivetrain, Localizer localizer, GamePieceDetector detector, Arm arm) {
    Command approach = Commands.defer(
        () -> detector.bestPiece()
            .map(piece -> driveToPose(drivetrain, localizer,
                collectPose(localizer.getPose(), piece)))
            .orElseGet(Commands::none),
        Set.of(drivetrain));

    return Commands.parallel(
        approach,
        Commands.sequence(
            arm.goToAngle(ArmConstants.kIntake),
            arm.runRoller(ArmConstants.kIntakeSpeed).until(arm::hasGamePiece)));
  }
```

**Add the imports to `Autos.java`:**

```java
import java.util.Set;
import frc.robot.subsystems.GamePieceDetector;
```

The `orElseGet(Commands::none)` is the "saw nothing" case, and it's deliberately
undramatic — press the button with an empty field and the intake deploys, the
robot doesn't move, and nothing breaks.

The intake runs alongside the approach rather than after it, which is Lesson 25's
idea reused without any new machinery: the approach needs the drivetrain, the
intake needs the arm, so they can run at once.

**Add the detector field to `RobotContainer`, above the camera fields:**

```java
  // Same trick as the cameras: it needs m_localizer, so it is built in the body.
  private final GamePieceDetector m_pieceDetector;
```

**Build it in the constructor, above the `addProvider` calls:**

```java
    m_pieceDetector = new GamePieceDetector(m_localizer::getPose);
```

**Add the binding in `configureBindings`:**

```java
    // Hold the right bumper to go and get a game piece — wherever it is, if the
    // camera can see one at the moment you press it.
    m_driverController.rightBumper().whileTrue(
        Autos.fetchPiece(m_drivetrain, m_localizer, m_pieceDetector, m_arm));
```

**Add the import:**

```java
import frc.robot.subsystems.GamePieceDetector;
```

---

## 7. When the thing you were driving to isn't there

This is the part with no clean answer, and pretending otherwise would be doing
you a disservice.

`Commands.defer` takes a snapshot. The moment you press the button, the robot
decides where the piece is and commits to driving there. From then on it is
driving to a *memory*, and memories go stale: another robot knocks the piece
away, your pose estimate drifts, or the detection was a reflection off a bumper.

And the snapshot is worse than you'd hope, because detection error grows with
distance. Measured in this simulator, with a ball straight ahead:

| Distance to the piece | Typical position error |
|---|---|
| 1.0 m | ~10 mm |
| 2.0 m | ~65 mm |
| 3.0 m | ~130 mm |
| 5.0 m | ~150 mm |

Those wobble by ten or twenty percent run to run, because the simulated camera
has noise in it — but the trend is solid and it is not noise you can tune away. It's the height trick doing its job: distance
comes out of `tan()` of a small angle, and at five metres that angle is very small
indeed, so a pixel of error becomes a lot of centimetres. **A detection from
across the field is a direction, not an address.**

Fifteen centimetres is still inside the intake's mouth, which is why committing
works at all. But there are three honest options and the right one depends on your
robot:

**Commit.** What the code above does. Simple, predictable, and fine when the
intake is wide and pieces don't move much. It fails silently — the robot drives
confidently to nothing.

**Abort.** Give up if the piece hasn't been seen for a few tenths of a second, and
let the driver try again. Honest, and it turns a silent failure into an obvious
one. It also gives up on pieces that are merely momentarily out of frame — which
happens constantly, because the camera is bouncing around on a robot.

**Look again on the way.** Drive most of the distance using the snapshot, then
re-derive the target from a fresh, much closer detection. The error table says
this is the right answer: you'd be re-aiming with 10 mm of error instead of
committing to 155 mm. Lesson 26 already split the approach into a coarse stage
and a fine one, so the seam to do it at is sitting right there.

The code ships the simple version because it's the one you can read. Try It #3
builds the good one.

> The rule underneath all three: **a decision made from sensor data has a
> shelf life.** Ask how old the data is when you act on it, and whether anything
> in between could have made it wrong.

---

## 8. Run it

```powershell
./gradlew simulateJava
```

Drive around and watch `ObjectDetection/Pieces` in AdvantageScope — put it on the
field view as a set of translations and you'll see markers appear where the balls
are as they come into view, and vanish as they leave. Compare against
`Drivetrain/SimulatedPose` and the arena's own pieces: they should sit on top of
each other.

Then drive somewhere with a ball in front of you and hold the right bumper. The
arm drops, the roller spins, and the robot drives itself onto the ball.

Things worth doing deliberately:

- **Press the bumper facing an empty corner.** The intake deploys, nothing moves,
  nothing breaks. That's `orElseGet(Commands::none)` doing its job.
- **Press it with a ball 5 m away, then with one 1 m away**, and watch how much
  closer to centred the near one ends up. That's the error table, live.
- **Set `kGamePieceClassId` to 1** and try again. No error, no warning, no
  detections — exactly the failure mode the callout in section 2 described. Put it
  back.
- **Watch `ObjectDetection/HasTarget` flicker** as the robot drives. It drops out
  constantly, and it never mattered because the path was already committed. That
  flicker is what Try It #3 has to survive.

---

## Try it

1. **Change the selection rule.** Make `bestPiece` prefer the most *centred*
   piece — smallest absolute yaw — instead of the nearest. Drive at a cluster and
   watch it choose differently. Which one gets more pieces per fifteen seconds is
   a real question with a real answer, and you can measure it.
2. **Find the confidence floor.** Lower `kMinConfidence` until the robot starts
   chasing things that aren't there, then raise it until it starts ignoring things
   that are. The gap between those two numbers is how much room your model gives
   you, and on a badly-trained model there is none.
3. **Look again on the way in.** Split `fetchPiece` so the last stretch re-derives
   the target from a fresh detection rather than the snapshot. You'll have to
   decide what to do when the piece isn't visible at that moment — which is the
   whole problem, arriving on schedule.
4. **Make failure loud.** Log the age of the detection you're driving to, and have
   the LEDs from Lesson 23 show when the robot is driving to a memory rather than
   something it can currently see.
5. **Reject the impossible.** A detection more than a few metres away, or outside
   the field boundary, is wrong no matter how confident the model is. Add that
   filter and work out where it belongs — the IO layer, or the detector.

---

## What you learned

The robot can now be told "go get that" by something other than a person.

**A detection is an angle, not a place.** The camera reports where something sits
in its own view and nothing more. Turning that into a point on the field takes an
assumption about the world — that the piece is on the floor — and knowledge of
where the robot is. Neither comes from the camera, and that's why this lesson
needed Lesson 14's pose estimator as much as it needed a vision pipeline.

**IO layers report readings, not conclusions.** It would have been easier to have
the IO hand back field positions. Logging the raw angles instead means a replay
can be run through better localization code later, and that distinction — what
the sensor said versus what you worked out — is the one that keeps replay useful
as the code around it changes.

**Some commands can't be built in advance.** Everything up to now was assembled at
startup, because everything up to now was known at startup. `Commands.defer` is
the escape hatch for the moment that stops being true, and the price is that you
have to declare the requirements yourself.

And the one worth carrying past this course: **data has a shelf life.** The robot
drives to where a piece was when you looked, and the further away it was the less
that's worth. Every autonomous decision made from a sensor reading is a bet that
nothing important changed in between, and knowing how long that bet stays good is
most of what separates an auto that works in the pit from one that works on the
field.

Go and watch it chase a few balls. It's the first thing in this whole course that
looks like the robot decided something on its own.
