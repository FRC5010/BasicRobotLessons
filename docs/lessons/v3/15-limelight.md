# Lesson 15 — Real vision: a Limelight, and a simulated one

**Goal:** Replace Lesson 14's fake vision provider with a real one — a
Limelight camera read through **LimelightLib 2** — give it a simulated twin
that sends exactly what a real Limelight would, and put both behind the same
`VisionIO` treatment `ModuleIO` and `GyroIO` got in Lesson 13.

**New Java concepts**
- **`Optional<T>`** — a value that might not be there; this lesson has you
  both hand one back and open one
- **`static`**, named at last — belonging to the class instead of to any
  one object (you've been typing it since Lesson 1)
- A **blank `final`** — a field that gets its one and only value from the
  constructor instead of its declaration line
- **`record`** — a small, structured data bundle

**New robot concepts**
- **Limelight** and **LimelightLib 2** — a camera that finds AprilTags and
  works out the robot's position itself, and the library that reads its
  answers
- **MegaTag2** — tag-based localization that borrows the robot's heading
  instead of solving for it
- **Per-frame trust** — Lesson 14's standard deviations, computed fresh for
  every frame from how far away the tags were and how many there were
- **`Field`** and **`Transform3d`** — the season's tag positions, and a 3D
  camera-mount offset with +Z up
- **Latency** — why every frame says how old it is
- A simulated camera that speaks the real camera's language over
  NetworkTables, so the real library can't tell the difference

---

## 1. What a real camera changes

Lesson 14 ended with a promise: *"Add a real vision provider next season
and `Localizer` doesn't change by a line."* Today you cash that in, and
it's worth understanding why the promise was even possible to make.

A **Limelight** is a camera with its own computer inside. It watches its
video feed, finds AprilTags, and does all the geometry itself — "I see tag
26 at this spot in the image" becomes "the robot is at (1.7, 4.0) on the
field" before your code hears a word. Systemcore can also run the same
vision software on a plain USB camera plugged into it, and to your code that
looks exactly like a Limelight. Either way, the answer travels to your robot
code over NetworkTables, the same network pipe every published value in
this course already rides on. Your code never touches a pixel — it asks
Limelight's Java library, **LimelightLib 2**, for the answer.

Here's the part that makes Lesson 14's promise true: whatever produces that
answer, the **shape** of what your code needs — a `Pose2d`, a timestamp, and
how far to trust it — is exactly what `addVisionMeasurement` already takes.
A button press satisfied that shape in Lesson 14. A real camera satisfies
the same shape today. `Localizer` never has to learn the difference,
because it was never told there was one.

---

## 2. Install LimelightLib 2

Same ritual as Lesson 1's Phoenix 6 install, with one difference: LimelightLib
isn't in WPILib's online search list, so you install it by URL. Open the
vendor dependency manager (Ctrl+Shift+P → **WPILib: Manage Vendor Libraries**
→ **Install new library (online)**) and paste this:

```
https://raw.githubusercontent.com/LimelightVision/limelightlib-public/717a921719f5dbaf4ce940819e2d84bdab8738b9/LimelightLib-alpha7.json
```

Rebuild to confirm: `./gradlew build`.

> **Take the version pin seriously here.** Limelight's own docs hand out a
> shorter link, `.../limelightlib-public/LimelightLib-alpha7.json`. That
> file gets *replaced* every time they publish — it went from beta5 to beta9
> in one week of September 2026 — so the same link builds different code
> from one day to the next. The long URL above names one exact commit of
> that file, and a commit can't change. Every WPILib-marketplace vendordep
> in this course is pinned the same way, by version; this one just had to be
> pinned by hand.

---

## 3. Tell the robot where the tags are

To turn "I see tag 26" into a field position, something has to know where
tag 26 actually *is*. That's a solved problem — WPILib ships the official
field for the current game, tag positions included.

**Add to `Constants.java`:**

```java
public static final class VisionConstants {
  // This season's field: its size, and where every AprilTag sits on it.
  public static final Field kTagLayout = Field.loadField(Fields.DEFAULT_FIELD);
}
```

`Fields` is an enum with one entry per field WPILib knows about, and
`DEFAULT_FIELD` is a standing alias to the current season's — as of this
writing, `FRC_2026_REBUILT_WELDED`: 16.54 m by 8.07 m, with 32 tags. (If your
event's field was built by AndyMark instead, swap in
`Fields.FRC_2026_REBUILT_ANDY_MARK` — WPILib keeps separate measurements for
the two builds.)

Don't mix this `Field` up with Lesson 11's `Field2d`. `Field2d` is a
*drawing* — a dashboard widget you move a robot icon around on. `Field` is
*data* — measurements of the real thing. This lesson uses both.

---

## 4. Tell the robot where the camera is

The library also needs a **`Transform3d`**: the camera's mount position
relative to the robot's center, in 3D. You already know the rule for X and
Y from Lesson 7 — **+X is forward, +Y is left** — and today it grows a third
axis: **+Z is up.**

**Add to `VisionConstants`, below the tag layout:**

```java
// Camera mount positions: robot center → camera lens.
public static final String kFrontCameraName = "limelight-front"; // must match the camera's name in its web UI
public static final Transform3d kFrontRobotToCamera = new Transform3d(
    new Translation3d(0.3, 0.0, 0.2), // 30 cm forward, centered, 20 cm up
    new Rotation3d(0, 0, 0));         // facing straight forward

public static final String kBackCameraName = "limelight-back";
public static final Transform3d kBackRobotToCamera = new Transform3d(
    new Translation3d(-0.3, 0.0, 0.2), // 30 cm back, 20 cm up
    new Rotation3d(0, 0, Math.PI));    // facing straight backward
```

A **`Transform3d`** bundles a `Translation3d` (the position offset) with a
`Rotation3d` (the orientation offset) — the 3D sibling of the `Translation2d`
you've used since Lesson 7. Front and back, facing opposite directions, is a
common real layout: two cameras double your chances of seeing a tag and
cover each other's blind spot.

Every Limelight has a name, set in its web interface, and that name is how
your code finds it on the network — a camera named `limelight-front`
publishes under `limelight-front`. A USB camera running on Systemcore gets a
fixed name instead, one per port; the library has constants for them, like
`Limelight.SYSTEMCORE_USB0` (which is `"limelightsc0"`).

> **Measure this for real.** On an actual robot, `kFrontRobotToCamera` isn't
> a guess. You measure the camera's physical mount with a tape measure (or
> read it off the CAD model) and get it right to the centimeter. A wrong
> transform doesn't crash anything. It quietly reports a robot position
> that's off by however wrong the measurement was. Try It #4 has more to say
> about why this course's simulator, specifically, can't show you that
> happening.

**One more block for `VisionConstants`, for the simulated camera you'll
build in section 8:**

```java
// The simulated camera only. Plausible guesses, not any one camera's spec
// sheet — check yours before trusting them.
public static final double kSimHorizontalFovDegrees = 80.0;
public static final double kSimVerticalFovDegrees = 56.0;
public static final double kSimMaxRangeMeters = 6.0;
```

**Add the imports `VisionConstants` needs** — let autocomplete find them:
`Field` and `Fields` live under `org.wpilib.fields`; `Transform3d`,
`Translation3d`, and `Rotation3d` live under `org.wpilib.math.geometry`,
alongside the `Translation2d` already imported there.

---

## 5. MegaTag2, and how far to trust a frame

Before writing any code that reads the camera, it's worth knowing what the
camera actually hands back, because it answers two questions Lesson 14 left
open.

**The heading problem.** A single AprilTag is a small flat square, and
working out where you are from one flat square has an annoying blind spot:
the square seen a little from the left can look almost exactly like the same
square seen a little from the right. One tag alone can leave two believable
answers for where you're standing. **MegaTag1** works everything out from
the tags alone, so with a single tag in view it inherits that blind spot —
the library screens single-tag MegaTag1 answers extra hard for exactly this
reason. **MegaTag2** sidesteps it: you *tell* the camera which way the robot
is facing — your gyro already knows that far better than a picture of a tag
does — and the camera only has to work out where you are. That's the one
you'll use. The price is that you have to send the heading every loop, and
that call looks like this:

*Nothing to add yet — this is the call you'll write in section 7:*

```java
Limelight.setSharedRobotOrientation(heading.getDegrees());
```

Look at what's on the left of the dot: `Limelight`, the *class*, not a
camera object. That's **`static`**, and it's been hiding in plain sight
since Lesson 1 — every `public static final` in `Constants.java`, and every
`Rotation2d.fromDegrees(...)` you've called. Something `static` belongs to
the class itself, one copy total, instead of one copy per object you build.
That's why you've always written `DriveConstants.kMaxSpeed` and never had to
build a `DriveConstants` first. Here it matches the physical truth: a robot
has one heading, so there's one shared heading value that every Limelight on
the robot reads.

**The trust problem.** Lesson 14 showed you the trust knob —
`VecBuilder.fill(0.5, 0.5, 999999)`, "trust x and y to about half a meter,
ignore heading" — and said tuning it was a deep art. The library does the
first round of that art for you, fresh for every frame:

> trust (in meters) = 0.3 × distance to the tags ÷ √(number of tags)

A frame built from one tag 2 m away gets 0.3 × 2 = **0.6 m**. Back off to
4 m and it's **1.2 m** — a farther tag is a smaller target, so the answer is
shakier, so it pulls on the estimate less. Two tags at about 2.2 m each get
0.3 × 2.2 ÷ √2 ≈ **0.47 m** — which is exactly what this course's own
simulation reported, standing 2 m from a hub. More tags, closer tags: more
trust. And heading is always
marked "ignore" — which makes sense, since MegaTag2's heading is just yours,
handed back.

The library also **filters** before it hands you anything, which is Lesson
14's last Try It paying off. The call you'll use,
`readAcceptedPoseEstimates(PoseEstimateType.MT2_WPIBLUE)`, returns only the
frames that passed its checks: a real tag was used, a pose came back, the
timestamp makes sense. `MT2` is MegaTag2, and `WPIBLUE` means the answer uses
the same origin WPILib's field does — the blue alliance's corner — so the
pose means the same thing to your estimator that it means to the camera.

And each estimate comes with a **timestamp** that's already been corrected
for the camera's delay. A frame that took 30 ms to capture and process is
stamped 30 ms in the past, which is exactly the "when was this true?" that
Lesson 14's estimator knows how to rewind to.

---

## 6. One more IO layer: `VisionIO`

Every sensor this course has touched since Lesson 13 tells the same story:
hardware lives behind an interface, so nothing outside it needs to know or
care where a reading actually came from. Vision gets the same treatment.

**Create `src/main/java/first/robot/subsystems/VisionIO.java`:**

```java
package first.robot.subsystems;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.linalg.Vector;
import org.wpilib.math.numbers.N3;

public interface VisionIO {
  public static class VisionIOInputs {
    public PoseObservation[] poseObservations = new PoseObservation[0];
  }

  /** One camera frame's worth of evidence: where it put the robot, when, and how far to trust it. */
  public static record PoseObservation(
      double timestampSeconds, Pose2d pose, int tagCount, Vector<N3> stdDevs) {}

  public default void updateInputs(VisionIOInputs inputs) {}

  /** MegaTag2 borrows the robot's heading instead of solving for it — tell it every loop. */
  public default void setRobotHeading(Rotation2d heading) {}
}
```

Most of that is familiar. The `default` do-nothing methods and the nested
`Inputs` class are exactly what `ModuleIO` and `GyroIO` already taught you,
and `setRobotHeading` is an *output* — something your code tells the
hardware — the same way `ModuleIO.setSteerAngleDegrees` is.

What's new is the input itself. A single tick of vision isn't one number: a
camera can deliver zero, one, or several frames between reads. So the input
is an **array** of a small **`record`**, `PoseObservation`. A record is a
compact way to bundle a few related values that belong together — here,
exactly what one correction needs: when it was true, where it put the
robot, how many tags built it, and how far to trust it. Java writes the
constructor and the getters for you: `observation.pose()`,
`observation.stdDevs()`, and so on.

`Vector<N3>` is WPILib's type for "three numbers in a column" — here the
trust for x, y, and heading, in that order. It's the same kind of value
`VecBuilder.fill(0.5, 0.5, 999999)` made in Lesson 14's callout.

---

## 7. Build `VisionIOLimelight`

Time to put section 5 to work.

**Create `src/main/java/first/robot/subsystems/VisionIOLimelight.java`:**

```java
package first.robot.subsystems;

import com.limelightvision.Limelight;
import com.limelightvision.PoseEstimate;
import com.limelightvision.PoseEstimateType;

import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Transform3d;

/** IO implementation for a real Limelight camera. */
public class VisionIOLimelight implements VisionIO {
  private final Limelight m_camera;

  public VisionIOLimelight(String cameraName, Transform3d robotToCamera) {
    // Handing the library the mount position overrides whatever the camera's
    // web UI says, so the measurement lives in exactly one place: VisionConstants.
    m_camera = new Limelight(
        cameraName, new Pose3d(robotToCamera.getTranslation(), robotToCamera.getRotation()));
  }

  @Override
  public void setRobotHeading(Rotation2d heading) {
    Limelight.setSharedRobotOrientation(heading.getDegrees());
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    PoseEstimate[] estimates = m_camera.readAcceptedPoseEstimates(PoseEstimateType.MT2_WPIBLUE);
    inputs.poseObservations = new PoseObservation[estimates.length];
    for (int i = 0; i < estimates.length; i++) {
      PoseEstimate estimate = estimates[i];
      inputs.poseObservations[i] = new PoseObservation(
          estimate.timestampSeconds, estimate.pose, estimate.fieldedTagCount, estimate.stdDevs);
    }
  }
}
```

The constructor turns your `Transform3d` into the `Pose3d` the library asks
for — same translation, same rotation, just "where the camera sits, measured
from the robot's center" spelled as a pose. `updateInputs` reads every frame
that arrived since last time, keeps only the ones the library accepted, and
copies each one into a `PoseObservation`.

Notice what it *doesn't* do. It never touches `Localizer`'s estimator and
never decides whether a correction is good enough to use. Reading is the
only job an IO class has; deciding what to do with what it read belongs one
layer up.

One small thing about `setRobotHeading`: every camera's provider will call
it, so with two cameras the shared heading gets set twice a loop, to the same
number. That's harmless, and it means each camera's code works on its own
without knowing whether any others exist.

Notice something else, too: `m_camera` is `private`, not `protected`. In
Lesson 13, `ModuleIOTalonFX` made its motors `protected` because
`ModuleIOSim` needed to reach in and feed them. The simulated camera you're
about to write doesn't need to reach in at all. Section 8 shows why.

---

## 8. Simulating a camera you don't own

Nobody in this course has a Limelight on their desk, so you'll simulate one.
Before writing code, it's worth asking a sharp question: *what exactly are
you pretending to be?*

Everything a real Limelight *tells* your robot code arrives one way: every
frame, it publishes one message to a NetworkTables topic named after itself —
`limelight-front/results_msgpack`. The library subscribes to that topic, and
everything you used in section 7 — the filtering, the trust numbers, the
latency-corrected timestamps — happens inside the library, on the robot, as
it reads those messages. So the most honest possible fake is one that
publishes the same message to the same topic. Then the real library runs,
unmodified, on your fake camera's output. It can't tell the difference,
because from where it sits there *is* no difference.

That's why the simulated camera doesn't need `m_camera`. It doesn't talk to
the library at all. It talks to the network, the way the real camera does.

### 8a. The message format

The message is **MessagePack** — a compact, binary cousin of JSON. A
Limelight packs a lot into each frame; the library only needs a handful of
keys to build a MegaTag2 estimate. This small class writes exactly those.

**Create `src/main/java/first/robot/subsystems/LimelightFrame.java`:**

```java
package first.robot.subsystems;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.wpilib.math.geometry.Pose2d;

/**
 * Builds one results frame the way a Limelight writes it: MessagePack, a
 * compact binary cousin of JSON. Sim-only plumbing, holding just the few
 * keys the library needs to build a MegaTag2 pose estimate.
 */
public class LimelightFrame {
  private final ByteArrayOutputStream m_bytes = new ByteArrayOutputStream();

  /** A frame that saw nothing. Real cameras send these too — silence would mean "unplugged". */
  public static byte[] noTargets(long frameIndex, double latencyMs) {
    return new LimelightFrame()
        .map(3)
        .key("fidx").number(frameIndex)         // every frame is numbered, so no two are identical
        .key("v").number(0)                     // 0 = no valid target this frame
        .key("cl").number(latencyMs)            // capture latency, milliseconds
        .bytes();
  }

  /** A frame that saw 'tagIds' and placed the robot at 'robot' (MegaTag2, blue-alliance origin). */
  public static byte[] withTargets(
      long frameIndex, Pose2d robot, List<Integer> tagIds, double avgDistanceMeters, double latencyMs) {
    LimelightFrame frame = new LimelightFrame()
        .map(6)
        .key("fidx").number(frameIndex)
        .key("v").number(1)
        .key("cl").number(latencyMs)
        .key("botpose_orb_wpiblue").array(6)    // x, y, z (meters), roll, pitch, yaw (degrees)
            .number(robot.getX()).number(robot.getY()).number(0)
            .number(0).number(0).number(robot.getRotation().getDegrees())
        .key("botpose_avgdist").number(avgDistanceMeters)
        .key("Fiducial").array(tagIds.size());
    for (int id : tagIds) {
      frame.map(2)
          .key("fID").number(id)
          .key("fielded").number(1);            // 1 = this tag helped place the robot
    }
    return frame.bytes();
  }

  // The four MessagePack shapes those frames use. Each starts with one byte
  // saying what's coming, then the thing itself.

  private LimelightFrame map(int entries) {     // up to 15 key/value pairs
    m_bytes.write(0x80 | entries);
    return this;
  }

  private LimelightFrame array(int items) {     // up to 15 items
    m_bytes.write(0x90 | items);
    return this;
  }

  private LimelightFrame key(String text) {     // strings up to 31 bytes
    byte[] utf8 = text.getBytes(StandardCharsets.UTF_8);
    m_bytes.write(0xA0 | utf8.length);
    m_bytes.writeBytes(utf8);
    return this;
  }

  private LimelightFrame number(double value) { // every number as a 64-bit double
    m_bytes.write(0xCB);
    m_bytes.writeBytes(ByteBuffer.allocate(8).putDouble(value).array());
    return this;
  }

  private byte[] bytes() {
    return m_bytes.toByteArray();
  }
}
```

You don't need to memorize the byte values at the bottom — they're
MessagePack's rules, not ideas you'll use again. The part worth reading is
the two `public` methods, because they're a list of what the library
actually checks. `"v"` says whether the camera saw a target at all.
`"botpose_orb_wpiblue"` is the MegaTag2 pose, as six numbers (in
Limelight's naming, `orb` marks the MegaTag2 answers). `"botpose_avgdist"` feeds the trust formula from
section 5. And each entry in `"Fiducial"` is one tag, marked as having
helped place the robot — the library rejects a pose that no real tag
contributed to.

Two keys are there for reasons you'd only find the hard way. `"cl"` is
**capture latency**: how many milliseconds old this frame already is when it
arrives. The library subtracts it to get the timestamp. And `"fidx"`, the
frame number, keeps any two frames from being byte-for-byte identical.
That matters more than it looks. NetworkTables quietly drops a value that's
exactly the same as the last one, so without a frame number, a camera
staring at an empty wall would send the same "saw nothing" frame over and
over, NetworkTables would throw the repeats away, and the library would
decide the camera had gone silent. A real Limelight numbers its frames too.

Each helper ends in `return this`, which is what lets the calls chain —
`.key("v").number(1)` — the same way `.until(...)` and `.named(...)` chain
onto a command.

### 8b. The camera itself

Now the class that decides *what* to send. It extends `VisionIOLimelight` —
the same "extend the real class" move Lesson 13 used for `ModuleIOSim` — so
it inherits the real reading code and only adds the fake camera in front of
it. Build it in three pieces.

**Create `src/main/java/first/robot/subsystems/VisionIOLimelightSim.java`, starting with its fields, constructor, and `updateInputs`:**

```java
package first.robot.subsystems;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import org.wpilib.fields.FieldTag;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Pose3d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.math.geometry.Translation3d;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.networktables.RawPublisher;

import first.robot.Constants.VisionConstants;

/**
 * IO implementation for a simulated Limelight. Works out which tags a camera
 * mounted here could see, then publishes the answer exactly where a real
 * Limelight would — so the real library reads it without knowing the difference.
 */
public class VisionIOLimelightSim extends VisionIOLimelight {
  private static final double kLatencyMs = 20.0; // one loop: captured last tick, published this one

  private final Transform3d m_robotToCamera;
  private final Supplier<Pose2d> m_poseSupplier;
  private final RawPublisher m_publisher;
  private byte[] m_captured = null; // this tick's frame, published next tick
  private long m_frameCount = 0;

  public VisionIOLimelightSim(
      String cameraName, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    super(cameraName, robotToCamera);
    m_robotToCamera = robotToCamera;
    m_poseSupplier = poseSupplier;
    // The same topic a real Limelight with this name publishes to.
    m_publisher = NetworkTableInstance.getDefault()
        .getTable(cameraName)
        .getRawTopic("results_msgpack")
        .publish("msgpack");
  }

  @Override
  public void updateInputs(VisionIOInputs inputs) {
    if (m_captured != null) {
      m_publisher.set(m_captured);       // last tick's frame arrives now, one loop late
    }
    m_frameCount++;
    m_captured = capture(m_poseSupplier.get());
    super.updateInputs(inputs);          // read it back through the real library
  }
```

`updateInputs` is where the honesty lives. A real camera's answer is always
a little old by the time it arrives, and a fake one that answered instantly
would hide that from you. So this one holds each frame for exactly one loop:
it publishes *last* tick's frame, captures this tick's, and then lets the
real `VisionIOLimelight.updateInputs` read what just arrived. One loop is
20 ms, which is why `kLatencyMs` is 20 — the frame tells the truth about its
own age, and the library's timestamp lands on the tick it was captured.

The `poseSupplier` is where the fake camera stands — the robot pose to look
out from. It has to be a *supplier*, not a plain `Pose2d`: the robot moves
every tick, and the camera needs a fresh position each time, not wherever the
robot happened to be at construction. Section 10 decides what to pass in.

**Add `capture`, below `updateInputs`:**

```java
  /** What this camera would report with the robot standing at 'robot'. */
  private byte[] capture(Pose2d robot) {
    Pose3d camera = new Pose3d(robot).transformBy(m_robotToCamera);

    List<Integer> tagIds = new ArrayList<>();
    double totalDistance = 0.0;
    for (FieldTag tag : VisionConstants.kTagLayout.getTags()) {
      Optional<Translation3d> seen = whereInView(camera, tag.getPose());
      if (seen.isPresent()) {
        tagIds.add(tag.getID());
        totalDistance += seen.get().getNorm();
      }
    }
    if (tagIds.isEmpty()) {
      return LimelightFrame.noTargets(m_frameCount, kLatencyMs);
    }

    // A perfect camera: it reports exactly where it's standing.
    double avgDistance = totalDistance / tagIds.size();
    return LimelightFrame.withTargets(m_frameCount, robot, tagIds, avgDistance, kLatencyMs);
  }
```

The first line is Lesson 7's coordinate thinking in 3D: start from the
robot's pose, apply the mount offset, and you have where the *camera* is on
the field. Then it walks every tag on the field and asks one question of
each: can the camera see it? The tags it can see go in the frame.

This camera is perfect: it reports exactly where it's standing, heading
included (MegaTag2's heading was never the camera's opinion anyway). A real
one scatters a little, more at a distance, which is exactly why section 5's
trust formula exists. Leaving the scatter out here is deliberate, and Try It
#3 shows you why — this lesson's simulator doesn't yet have what scatter
needs to behave sensibly.

**Add `whereInView`, the last method in the class:**

```java
  /** Where 'tag' sits relative to the camera — or empty, if the camera can't see it. */
  private static Optional<Translation3d> whereInView(Pose3d camera, Pose3d tag) {
    Translation3d offset = tag.relativeTo(camera).getTranslation(); // +X straight out of the lens
    double yawDegrees = Math.toDegrees(Math.atan2(offset.getY(), offset.getX()));
    double pitchDegrees = Math.toDegrees(Math.atan2(offset.getZ(), offset.getX()));

    boolean inFront = offset.getX() > 0;
    boolean inFrame = Math.abs(yawDegrees) <= VisionConstants.kSimHorizontalFovDegrees / 2
        && Math.abs(pitchDegrees) <= VisionConstants.kSimVerticalFovDegrees / 2;
    boolean closeEnough = offset.getNorm() <= VisionConstants.kSimMaxRangeMeters;
    boolean facingUs = camera.relativeTo(tag).getX() > 0; // a tag's +X points out of its printed face

    if (inFront && inFrame && closeEnough && facingUs) {
      return Optional.of(offset);
    }
    return Optional.empty();
  }
}
```

This method's question — "where is that tag, from the camera's point of
view?" — doesn't always have an answer. The tag might be behind the camera,
out past the edge of the picture, too far away, or facing the other way. And
"no answer" has to be a real, distinct result, not a fake `Translation3d` of
zeros that some later line forgets to check for.

Java's tool for exactly this is **`Optional<T>`**: a box that either holds a
`T` or holds nothing, where the type itself warns everyone who receives it
to check. `whereInView` fills the box with `Optional.of(offset)` when the tag
is visible, and hands back `Optional.empty()` when it isn't. Back in
`capture`, `seen.isPresent()` asks "is there something in here?" and
`seen.get()` takes it out. Call `.get()` on an empty `Optional` and your
program crashes on the spot — which is the point. `Optional` turns "I forgot
the tag might not be visible" from a quiet wrong number into a loud
mistake you can't miss.

`tag.relativeTo(camera)` is the most useful line in the method. It answers
"where is the tag, measured from the camera?" in the camera's own
coordinates — +X straight out of the lens, +Y left, +Z up. From there,
everything is triangles. And `camera.relativeTo(tag)` asks the reverse:
where is the camera, measured from the tag? A tag's +X points out of its
printed face, so a positive X means the camera is in front of it rather than
behind the wall it's stuck to.

Finally, it's `private static` because it never touches a field — it
answers purely from its two arguments. That's the same reason Lesson 13's
`makeModule` was `static`.

---

## 9. Build `LimelightPoseProvider`

All the real work happened in `VisionIO`, so the provider itself is small —
the same shape `SwerveModule` has had since Lesson 13: own an IO, own an
inputs bundle, read the bundle. It also picks up one more job you've seen
before: choosing *which* IO to build. `Drivetrain` does that for its modules
with `makeModule`; `LimelightPoseProvider` does it for itself with
`makeCamera`.

**Create `src/main/java/first/robot/subsystems/LimelightPoseProvider.java`:**

```java
package first.robot.subsystems;

import java.util.function.Supplier;

import org.wpilib.math.estimator.SwerveDrivePoseEstimator;
import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Transform3d;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants;

/** A vision camera, contributing whatever pose corrections its IO reported this tick. */
public class LimelightPoseProvider implements PoseProvider {
  private final VisionIO m_io;
  private final VisionIO.VisionIOInputs m_inputs = new VisionIO.VisionIOInputs();
  private final String m_logKey;

  public LimelightPoseProvider(VisionIO io, String logKey) {
    m_io = io;
    m_logKey = logKey;
  }

  @Override
  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    m_io.setRobotHeading(estimator.getEstimatedPosition().getRotation());
    m_io.updateInputs(m_inputs);

    Pose2d[] poses = new Pose2d[m_inputs.poseObservations.length];
    for (int i = 0; i < poses.length; i++) {
      poses[i] = m_inputs.poseObservations[i].pose();
    }
    Telemetry.log(m_logKey + "/PoseObservations", poses, Pose2d.struct);

    for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {
      estimator.addVisionMeasurement(
          observation.pose(), observation.timestampSeconds(), observation.stdDevs());
    }
  }

  /** Picks each camera's real/sim/replay IO, the same way Drivetrain picks each module's. */
  public static LimelightPoseProvider makeCamera(
      String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {
    VisionIO io = switch (Constants.kCurrentMode) {
      case REAL -> new VisionIOLimelight(name, robotToCamera);
      case SIM -> new VisionIOLimelightSim(name, robotToCamera, poseSupplier);
      case REPLAY -> new VisionIO() {}; // nothing feeds this yet
    };
    return new LimelightPoseProvider(io, "Localizer/" + name);
  }
}
```

`updatePoseEstimate` runs in a deliberate order. First it tells the camera
which way the robot faces — MegaTag2 needs that before it can place the
robot, and the estimator's heading is the best one on the robot. Then it
reads, logs what the camera said, and only then feeds each observation into
the estimator, trust and all. That third argument to `addVisionMeasurement`
is the per-frame version of Lesson 14's trust knob: instead of one setting
for every frame, each frame brings its own.

Notice what's missing compared to `SwerveModule`: there's no separate
`periodic()` and `setDesiredState()`. A steering module both senses *and*
chases a target, so Lesson 13 split those into two methods. A camera only
reports. The heading it's handed isn't a target to chase — it's context for
the report. `PoseProvider` only ever asked for one method, and that one
method is enough.

`makeCamera` is `Drivetrain.makeModule` with one difference: `makeModule` is
`private`, because only `Drivetrain` ever calls it, while `makeCamera` is
`public`, because `Robot` is about to call it from outside. The
`poseSupplier` parameter is only read by the `SIM` arm. A real camera knows
where it is by looking; only the fake one needs to be told.

---

## 10. Wire it up and watch two cameras report

**Delete `VisionPoseProvider.java`** — `LimelightPoseProvider` replaces it,
and nothing else references the old one once `Robot` is updated below.

`Localizer` needs no changes at all. Its constructor, `periodic()`, and
every method stay exactly as Lesson 14 left them. That's worth sitting with:
an entire IO layer, a vendor library, and a simulated camera just went into
the project, and the class that fuses poses together never had to hear
about any of it.

Two cameras join `Robot`'s fields as **blank finals** — `final` fields with no
value on their declaration line. Java allows that as long as the constructor
assigns each one exactly once, and the compiler checks that it does.

**Replace Lesson 14's `camera` field in `Robot` with two blank finals:**

```java
public class Robot extends OpModeRobot {
  public final CommandGamepad driverController = new CommandGamepad(0);
  public final Drivetrain drivetrain = new Drivetrain();
  public final Localizer localizer = new Localizer(drivetrain);
  // Blank finals: building a camera needs localizer (for its pose supplier),
  // so localizer has to be a finished object first. Assigned in the
  // constructor body, below, which runs after every field initializer above.
  public final LimelightPoseProvider frontCamera;
  public final LimelightPoseProvider backCamera;
```

**In `Robot`'s constructor, replace `localizer.addProvider(camera);` with:**

```java
  public Robot() {
    DataLogManager.start(); // saves every published value to a .wpilog file
    Scheduler.getDefault().addEventListener(this::logCommandStart);

    frontCamera = LimelightPoseProvider.makeCamera(
        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, localizer::getPose);
    backCamera = LimelightPoseProvider.makeCamera(
        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, localizer::getPose);
    localizer.addProvider(frontCamera);
    localizer.addProvider(backCamera);
  }
```

**Fix `Robot`'s imports:** remove `VisionPoseProvider`, and add
`first.robot.Constants.VisionConstants` and
`first.robot.subsystems.LimelightPoseProvider`.

`localizer::getPose` is a **method reference** — shorthand for
`() -> localizer.getPose()`. Building the cameras in the constructor body,
instead of in their own field initializers, is what makes it safe: every
field initializer above has already run before the constructor's first line
executes, so `localizer` is a finished object by the time anything points at
it.

**In `RobotTeleop`, delete the Start-button binding and the
`reportFakeSighting` method from Lesson 14** — `robot.camera` doesn't exist
anymore, because there's no fake camera left. **Then delete the three imports
only that method used:** `Command`, `Pose2d`, and `Rotation2d`.

Now run it. `./gradlew simulateJava` → **RobotTeleop**, and watch the
**Field** widget in SimGUI next to `Localizer/limelight-front/PoseObservations`
and `Localizer/limelight-back/PoseObservations`. The robot starts at (0, 0),
in the blue corner, facing down the field — and the front camera can
already see a pair of tags 4 to 6 m down the field. Nudge the robot off its starting
spot and the front camera's observations start arriving every loop. Now
spin 180° in place: the front camera goes quiet and the back camera takes
over, logging under its own name, through the exact same `Localizer` loop.
Then drive toward the nearer **hub** — the big structure in the middle of
your half of the field, with tags on all four sides — and turn in place near
it to watch the two cameras hand it back and forth.

> **Why nothing arrives until you move.** Before you touch the stick, the
> front camera *does* see those two tags — but the pose it reports is
> exactly (0, 0, 0°), and the library uses an all-zeros pose to mean "no
> answer." It rejects every one of those frames as a missing pose. That's
> the fake-value problem section 8 warned about, living inside a real
> library: the day a genuine answer happens to equal the stand-in for "no
> answer," they're indistinguishable. A real robot never sits exactly on
> the field's corner, so this one only bites in simulation, and only until
> you move.

The library keeps its own notes, too. Under
`limelight_telemetry/limelight-front/` it publishes a **`status`** string —
`OK` while frames are arriving, `STALE` if they stop, `NO_DATA` if no frame
ever came — and, under `MT2_WPIBLUE/`, the poses it **accepted** and
**rejected**, with a `rejectionReasons` string explaining the last
rejection. Before you move, that string reads `MISSING_POSE`. When a real
camera misbehaves, this is the first place to look.

> **Why you won't see vision rescue anything.** Lesson 14's fake camera
> could pull a wrong pose toward (2, 5) dramatically, because it was an
> independent claim. This one can't, and section 8 already told you why: it
> looks out from `localizer::getPose` — the very estimate vision is supposed
> to correct. So every frame reports "you're exactly where you think you
> are," and the estimate never needs to move. What you're watching is
> *confirmation*, not *rescue*. A real camera doesn't share this limit — a
> real tag's position is real, whatever your code believes. Lesson 16 gives
> this simulator an independent truth of its own, and one argument to
> `makeCamera` changes to use it.

---

## Try it

1. **Code — add a third camera.** Pick a corner mount — angled 45°, say — add
   its name and `Transform3d` to `VisionConstants`, declare a third
   `LimelightPoseProvider` blank final on `Robot`, build it in the
   constructor with `makeCamera(...)`, and register it with
   `localizer.addProvider(...)`. Nothing in `VisionIOLimelightSim` changes:
   each camera publishes to its own topic, named after itself. (Give it a
   new name — two cameras sharing one would publish over each other, on a
   real robot too.)
2. **Code — check the trust formula yourself.** Add a
   `double avgTagDistanceMeters` to the `PoseObservation` record and fill it
   from `estimate.avgTagDistanceMeters` in `VisionIOLimelight`. (Adding a
   field to a record changes its constructor, so the compiler will point you
   at every call that needs updating.) Then, in `LimelightPoseProvider`,
   log the newest observation's distance, its `tagCount()`, and its x/y
   trust, `stdDevs().get(0, 0)`. Drive at a hub from far away and check a
   few readings against section 5: `0.3 × distance ÷ √tags`.
3. **Code — give the camera a shaky hand, and watch what happens.** A real
   camera's answer scatters a little. Add a `java.util.Random` field to
   `VisionIOLimelightSim`, and in `capture`, report
   `robot.getX() + m_random.nextGaussian() * spread` (and the same for Y)
   instead of the exact position, with
   `spread = 0.015 * avgDistance / Math.sqrt(tagIds.size())` — 1.5 cm of
   scatter per meter to the tags, less with more tags. (`nextGaussian()`
   returns a random number that's usually near zero and occasionally not:
   the bell curve.) Now nudge the robot off (0, 0) and leave it parked
   where the front camera can see those two tags. Watch `Localizer/Pose`
   for a minute. It drifts — in one of this course's runs, about 60 cm in
   60 seconds, with nothing moving. Work out why before reading on.
   Here's the answer: the camera looks out from the estimate itself, so each
   frame says "you're where you think you are, give or take a little," the
   estimate shifts by that little, and the next frame starts from the
   shifted spot. Nothing pulls it back, because nothing in this simulator
   knows where the robot really is. Take the scatter back out: a shaky
   camera needs a truth to be shaky *around*, and that's Lesson 16.
4. **Code — prove a miscalibrated camera is invisible here, and understand
   why.** Add 0.3 m to `kFrontRobotToCamera`'s forward offset, pretending
   you measured wrong, and drive around watching `Localizer/Pose`. It
   doesn't shift. Look at `capture` to see why: the fake camera uses the
   mount only to decide *which tags are visible*, then reports the robot's
   position straight from where the robot is. It never does what a real
   Limelight does — turn "I see this tag, here in my picture" back into a
   robot position *through* the mount you told it. A real robot has no such
   luck: the physical mount doesn't care what number you typed, so this
   exact mistake would quietly offset every correction. Put the number
   back, and take the lesson: some bugs this simulator simply cannot show
   you, and knowing which ones is its own kind of expertise.
5. **Code — watch the empty doorway, vision edition.** Flip `kSimMode` to
   `Mode.REPLAY` in `Constants.java` and run `./gradlew simulateJava`. Both
   cameras build fine — `makeCamera`'s `REPLAY` arm resolves to
   `new VisionIO() {}` — but `Localizer/limelight-front/PoseObservations`
   and `Localizer/limelight-back/PoseObservations` never publish a single
   reading, no matter how you drive. Same dormant doorway Lesson 13 built,
   now with a camera-shaped lock on it. Flip `kSimMode` back to `Mode.SIM`
   when you're done.

---

## What you learned

The `Localizer` you built in Lesson 14 just proved its reason for existing:
a real `LimelightPoseProvider`, backed by an actual camera library, slots
into the same registry Lesson 14's fake button-press provider used, and
`Localizer` needed no changes to accept it. That's what the `PoseProvider`
interface was for all along.

The camera answered both questions Lesson 14 left open. **MegaTag2** borrows
the heading your gyro already knows, and every frame arrives with its own
**trust** — tighter for closer tags and more of them — plus a timestamp
that's already been corrected for the camera's delay. The library filters
before it feeds, so a frame no real tag contributed to never reaches your
estimator.

On the Java side, **`Optional`** gave "that tag isn't visible" an honest,
checkable type, and this time you were on both ends of it — filling the box
in `whereInView` and opening it in `capture`. **`static`** finally got a name
for something you've typed since Lesson 1: one copy, owned by the class, like
the single shared heading every Limelight on the robot reads. A **blank
`final`** let `Robot` build its cameras after `localizer` existed, and a
**`record`** bundled one frame's evidence into a single value.

The move worth remembering is how the simulated camera works. It doesn't
imitate the library or reach inside it. It stands where a real camera stands
— on the network, publishing the same message to the same topic — so the
real library, filters and timestamps and health checks included, runs on
your fake camera exactly as it will on a real one. When you have to fake
something, fake it at the boundary where the real thing would plug in.

And you ran head-first into an honest limit. Because the simulated camera
looks out from the same estimate it then corrects, it can confirm a good
pose but can't rescue a bad one, can't be given realistic scatter without
drifting, and can't expose a miscalibrated mount. All three need an
independent "where the robot actually is" to check against, and this
simulator doesn't have one yet. That's the next lesson.

Next: [Lesson 16 — Ground truth: give the simulation a body](16-ground-truth.md).
