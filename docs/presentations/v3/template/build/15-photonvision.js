const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 15 — Real Vision: PhotonVision' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 15',
    title: 'Real Vision: PhotonVision',
    subtitle: 'A real camera, and multi-camera simulation',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Lesson 14 ended with a promise: "Add a real vision provider next season and Localizer doesn\'t change by a line." Today that gets cashed in — a real PhotonCamera reading actual AprilTags through a PhotonPoseEstimator, with as many simulated cameras as you want, behind the same VisionIO treatment ModuleIO and GyroIO got in Lesson 13.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'A real camera, behind the same IO treatment' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.6, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Replace Lesson 14\'s fake vision provider with a real one — a PhotonCamera reading actual AprilTags — give it as many simulated cameras as you want, and put it behind the same VisionIO treatment ModuleIO and GyroIO got.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.35, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.6;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Optional<T> — a value that might not be there', options: { bullet: true, breakLine: true } },
        { text: 'A static field — shared by every instance', options: { bullet: true, breakLine: true } },
        { text: 'A blank final — assigned in the constructor', options: { bullet: true, breakLine: true } },
        { text: 'record — a small, structured data bundle', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('camera_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'PhotonCamera and PhotonPoseEstimator', options: { bullet: true, breakLine: true } },
        { text: 'AprilTagFieldLayout — the season\'s tag positions', options: { bullet: true, breakLine: true } },
        { text: 'Multi-tag vs. single-tag pose strategies', options: { bullet: true, breakLine: true } },
        { text: 'Transform3d, and +Z is up', options: { bullet: true, breakLine: true } },
        { text: 'VisionSystemSim / PhotonCameraSim', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'PhotonVision' });
    s.addNotes(
      'A real vision setup has one more computer than met so far: a coprocessor runs PhotonVision, which watches a camera feed, finds AprilTags, and does the geometry. Your robot code never touches pixels — it asks PhotonVision\'s Java library, PhotonLib, for the answer.'
    );
  }

  // ============================================================ SLIDE 3 — what a real camera changes (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 1 · What changes', title: 'Localizer was never told there was a difference' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('The shape your code needs — a Pose2d and a timestamp — was already exactly what PoseProvider.updatePoseEstimate expects.', {
      x: 1.0, y: 2.1, w: 11.3, h: 1.5, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('A button press satisfied that shape in Lesson 14. A real camera satisfies the same shape today.', {
      x: 1.0, y: 3.5, w: 11.3, h: 1.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('A coprocessor runs PhotonVision, watching a camera feed, finding AprilTags, and publishing the answer over NetworkTables — the same pipe every published value already travels over.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'PhotonVision', dark: true });
    s.addNotes(
      'Lesson 14 ended with a promise: "Add a real vision provider next season and Localizer doesn\'t change by a line." Today that gets cashed in.'
    );
  }

  // ============================================================ SLIDE 4 — install PhotonLib
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'download_white.png', eyebrow: 'Section 2 · Install PhotonLib', title: 'Same ritual as Lesson 1\'s Phoenix 6 install' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.0,
      steps: [
        { title: 'WPILib: Manage Vendor Libraries → Install new library (online search)', detail: 'Search for photonlib and install it.' },
        { title: 'Search scoped to this project\'s pinned WPILib version', detail: 'It offers a matching 2027 alpha build.' },
        { title: 'If the search comes up empty, install by URL instead', detail: 'WPILib\'s own pinned copy — see below.' },
        { title: 'Rebuild to confirm', detail: './gradlew build' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.7, w: 11.9, h: 1.05,
      body: 'Take the version pin seriously: PhotonVision\'s own docs hand out a moving URL. WPILib\'s own pinned copy can\'t drift — same trick works for any vendordep.',
      pad: 0.15, bodySize: 16,
    });

    K.addFooter(s, { pageNum: 4, label: 'PhotonVision' });
    s.addNotes(
      'The fallback URL: https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/2027_alpha5/photonlib-v2027.0.0-alpha-2.json — PhotonVision\'s own docs hand out a moving link that serves whatever build is newest, which can silently be built for a different season than this project targets.'
    );
  }

  // ============================================================ SLIDE 5 — VisionConstants.kTagLayout
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 3 · Constants.java', title: 'Where the tags actually are — a solved problem' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.0, fontSize: 16,
      fileLabel: 'Add to Constants.java',
      lines: [
        { text: 'public static final class VisionConstants {', color: 'FFD166' },
        { text: '  public static final AprilTagFieldLayout kTagLayout =', color: '9EF01A' },
        { text: '      AprilTagFieldLayout.loadField(AprilTagFields.kDefaultField);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.1, w: 11.9, h: 2.7,
      body: 'AprilTagFields is an enum with one entry per season\'s field — kDefaultField is a standing alias to whichever one is current, so this line never goes stale when the calendar turns over. If your specific event uses a field built by a different manufacturer, swap in that season\'s exact constant instead, e.g. AprilTagFields.k2026RebuiltWelded.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 5, label: 'PhotonVision' });
    s.addNotes(
      'A PhotonPoseEstimator needs to know two things to turn "I see tag 7" into a field position: where tag 7 actually is on the field, and where the camera is on your robot. The first one is a solved problem — WPILib ships the official tag layout for the current game.'
    );
  }

  // ============================================================ SLIDE 6 — camera mount transforms
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 4 · Constants.java', title: '+Z is up — the third axis of Lesson 7\'s rule' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 12,
      fileLabel: 'Add to VisionConstants, next to the tag layout',
      lines: [
        { text: '// Camera mount positions: robot center → camera lens.', color: '7FA8C9' },
        { text: 'public static final String kFrontCameraName = "Front"; // must match PhotonVision UI', color: 'D7E3F4' },
        { text: 'public static final Transform3d kFrontRobotToCamera = new Transform3d(', color: 'FFD166' },
        { text: '    new Translation3d(0.3, 0.0, 0.2), // 30 cm forward, centered, 20 cm up', color: '9EF01A' },
        { text: '    new Rotation3d(0, 0, 0));         // facing straight forward', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: 'public static final String kBackCameraName = "Back";', color: 'D7E3F4' },
        { text: 'public static final Transform3d kBackRobotToCamera = new Transform3d(', color: 'FFD166' },
        { text: '    new Translation3d(-0.3, 0.0, 0.2), // 30 cm back, 20 cm up', color: '9EF01A' },
        { text: '    new Rotation3d(0, 0, Math.PI));    // facing straight backward', color: '9EF01A' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'PhotonVision' });
    s.addNotes(
      'A Transform3d bundles a Translation3d (the position offset) with a Rotation3d (the orientation offset) — the 3D sibling of the Translation2d used since Lesson 7. Front and back, facing opposite directions, is a common real layout: two cameras double your chance of seeing a tag and cover each other\'s blind spot. Measure this for real on an actual robot — a wrong transform doesn\'t crash anything, it just quietly reports a robot position offset from the truth by exactly however wrong the measurement was.'
    );
  }

  // ============================================================ SLIDE 7 — pose strategy (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 5 · Picking a pose strategy', title: 'Multi-tag first, single-tag fallback' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('estimateCoprocMultiTagPose(result)', { x: 1.0, y: 2.1, w: 5.25, h: 0.85, fontFace: K.FONT_CODE, bold: true, fontSize: 19, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 });
    s.addText('When the coprocessor sees multiple tags in one frame, it solves using all of them at once — dramatically more accurate than any single tag alone. One tag has an inherent ambiguity; a second from a different angle kills it almost completely.', {
      x: 1.0, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('estimateLowestAmbiguityPose(result)', { x: 7.05, y: 2.1, w: 5.25, h: 0.85, fontFace: K.FONT_CODE, bold: true, fontSize: 19, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 });
    s.addText('When only one tag is visible, multi-tag has nothing to fuse and returns empty — that\'s the fallback: picks whichever visible tag\'s solve was least confused and uses that alone.', {
      x: 7.05, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 7, label: 'PhotonVision', dark: true });
    s.addNotes(
      'A PhotonPoseEstimator doesn\'t watch a camera continuously on its own — you hand it one frame\'s worth of detections at a time, and it hands back a candidate pose, if it could compute one. estimateCoprocMultiTagPose needs "Do Multi-Target Estimation" turned on in the PhotonVision web UI\'s pipeline settings — robot code can\'t turn it on for you.'
    );
  }

  // ============================================================ SLIDE 8 — Optional example
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'puzzlepiece_white.png', eyebrow: 'Section 5 · Optional<T>', title: 'A box that either holds a value or holds nothing' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.2, fontSize: 14,
      fileLabel: "Nothing to add yet — this is the shape you'll write in a moment",
      example: true,
      lines: [
        { text: 'Optional<EstimatedRobotPose> estimate = poseEstimator.estimateCoprocMultiTagPose(result);', color: '9EF01A' },
        { text: 'if (estimate.isPresent()) {', color: 'D7E3F4' },
        { text: '  EstimatedRobotPose pose = estimate.get(); // safe — you just checked', color: '9EF01A' },
        { text: '  // ...use pose...', color: '7FA8C9' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.6,
      body: 'isPresent() asks "is there something in here?"; .get() unwraps it — call .get() without checking first and you crash the instant a frame comes back empty, exactly the crash Optional exists to make you handle on purpose instead of by accident.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 8, label: 'PhotonVision' });
    s.addNotes(
      '"No pose" has to be a real, distinct answer from "here\'s a pose" — not a fake Pose2d with a sentinel value crossing your fingers nobody checks it.'
    );
  }

  // ============================================================ SLIDE 9 — VisionIO.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'dooropen_white.png', eyebrow: 'Section 6 · A new file', title: 'VisionIO — an array of records, not one number' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.35, w: 11.9, h: 3.4, fontSize: 13,
      fileLabel: 'Create src/main/java/first/robot/subsystems/VisionIO.java — the whole file',
      lines: [
        { text: 'public interface VisionIO {', color: 'FFD166' },
        { text: '  public static class VisionIOInputs {', color: 'D7E3F4' },
        { text: '    public PoseObservation[] poseObservations = new PoseObservation[0];', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** One camera frame\'s evidence: a candidate pose and how many tags built it. */', color: '7FA8C9' },
        { text: '  public static record PoseObservation(', color: '9EF01A' },
        { text: '      double timestampSeconds, Pose3d pose, int tagCount) {}', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  public default void updateInputs(VisionIOInputs inputs) {}', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.95, w: 11.9, h: 1.9,
      body: 'A camera can report zero, one, or several frames since the last read, so the input is an array of a small record — exactly what one correction needs: when it was true, what the candidate pose was, and how many tags built it.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 9, label: 'PhotonVision' });
    s.addNotes(
      'The default do-nothing method and the nested Inputs class are exactly what ModuleIO and GyroIO already taught you. What\'s new is the input itself: a single tick of vision isn\'t one number.'
    );
  }

  // ============================================================ SLIDE 10 — VisionIOPhotonVision fields+constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 7 · A new file', title: 'VisionIOPhotonVision: a real camera, a real estimator' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.1, fontSize: 14,
      fileLabel: 'Create src/main/java/first/robot/subsystems/VisionIOPhotonVision.java — fields and constructor',
      lines: [
        { text: '/** IO implementation for a real PhotonVision camera. */', color: '7FA8C9' },
        { text: 'public class VisionIOPhotonVision implements VisionIO {', color: 'FFD166' },
        { text: '  protected final PhotonCamera m_camera;', color: '9EF01A' },
        { text: '  private final PhotonPoseEstimator m_poseEstimator;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public VisionIOPhotonVision(String cameraName, Transform3d robotToCamera) {', color: 'FFD166' },
        { text: '    m_camera = new PhotonCamera(cameraName);', color: 'D7E3F4' },
        { text: '    m_poseEstimator = new PhotonPoseEstimator(VisionConstants.kTagLayout, robotToCamera);', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.85, w: 11.9, h: 2.05,
      body: 'One detail worth flagging before the next slide: m_camera is protected, not private. That\'s Lesson 13\'s signal again — a subclass is coming for it.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 10, label: 'PhotonVision' });
    s.addNotes(
      'protected instead of private is the same pattern as ModuleIOTalonFX\'s motors in Lesson 13.'
    );
  }

  // ============================================================ SLIDE 11 — VisionIOPhotonVision updateInputs
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 7 · A new file', title: 'For every unread frame: multi-tag first, fallback second' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Add to VisionIOPhotonVision, closing out the class',
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void updateInputs(VisionIOInputs inputs) {', color: 'D7E3F4' },
        { text: '  List<PoseObservation> observations = new ArrayList<>();', color: 'D7E3F4' },
        { text: '  for (PhotonPipelineResult result : m_camera.getAllUnreadResults()) {', color: '9EF01A' },
        { text: '    Optional<EstimatedRobotPose> estimate = m_poseEstimator.estimateCoprocMultiTagPose(result);', color: '9EF01A' },
        { text: '    if (estimate.isEmpty()) {', color: '9EF01A' },
        { text: '      estimate = m_poseEstimator.estimateLowestAmbiguityPose(result);', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '    if (estimate.isPresent()) {', color: '9EF01A' },
        { text: '      EstimatedRobotPose pose = estimate.get();', color: '9EF01A' },
        { text: '      observations.add(new PoseObservation(', color: '9EF01A' },
        { text: '          pose.timestampSeconds, pose.estimatedPose, pose.targetsUsed.size()));', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  inputs.poseObservations = observations.toArray(new PoseObservation[0]);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'PhotonVision' });
    s.addNotes(
      'Notice what it doesn\'t do: it never touches the pose estimator this file\'s own name doesn\'t belong to (Localizer\'s), never decides whether a correction is good enough to trust. Reading is the only job an IO class has; deciding what to do with what it read belongs one layer up.'
    );
  }

  // ============================================================ SLIDE 12 — VisionIOPhotonVisionSim static field + constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 8 · A new file', title: 'One shared fake field, every camera adds itself' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Create VisionIOPhotonVisionSim.java — extends VisionIOPhotonVision',
      lines: [
        { text: '/** IO implementation for a simulated PhotonVision camera. */', color: '7FA8C9' },
        { text: 'public class VisionIOPhotonVisionSim extends VisionIOPhotonVision {', color: 'FFD166' },
        { text: '  private static VisionSystemSim visionSim; // one fake field, shared by every camera', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  private final Supplier<Pose2d> m_poseSupplier;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public VisionIOPhotonVisionSim(', color: 'FFD166' },
        { text: '      String cameraName, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {', color: 'D7E3F4' },
        { text: '    super(cameraName, robotToCamera);', color: '9EF01A' },
        { text: '    m_poseSupplier = poseSupplier;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '    if (visionSim == null) {', color: '9EF01A' },
        { text: '      visionSim = new VisionSystemSim("main");', color: '9EF01A' },
        { text: '      visionSim.addAprilTags(VisionConstants.kTagLayout);', color: '9EF01A' },
        { text: '      SmartDashboard.putData("VisionSim/DebugField", visionSim.getDebugField());', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 12, label: 'PhotonVision' });
    s.addNotes(
      'The first VisionIOPhotonVisionSim ever constructed finds visionSim still null, builds the shared fake field, and populates it with tags; every camera built after that finds it already there. That\'s the whole multi-camera feature, and there\'s no varargs, no collection, no extra class to write.'
    );
  }

  // ============================================================ SLIDE 13 — VisionIOPhotonVisionSim camera props + updateInputs
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 8 · A new file', title: 'Camera properties, and physics-first-then-read again' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Add to VisionIOPhotonVisionSim, closing out the constructor and class',
      lines: [
        { text: '    SimCameraProperties cameraProps = new SimCameraProperties();', color: 'D7E3F4' },
        { text: '    cameraProps.setCalibration(960, 720, Rotation2d.fromDegrees(90));', color: '9EF01A' },
        { text: '    cameraProps.setCalibError(0.25, 0.08);', color: '9EF01A' },
        { text: '    cameraProps.setFPS(20);', color: '9EF01A' },
        { text: '    cameraProps.setAvgLatencyMs(35);', color: '9EF01A' },
        { text: '    cameraProps.setLatencyStdDevMs(5);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '    PhotonCameraSim cameraSim = new PhotonCameraSim(m_camera, cameraProps);', color: '9EF01A' },
        { text: '    visionSim.addCamera(cameraSim, robotToCamera);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updateInputs(VisionIOInputs inputs) {', color: 'D7E3F4' },
        { text: '    visionSim.update(m_poseSupplier.get());', color: '9EF01A' },
        { text: '    super.updateInputs(inputs);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: 'PhotonVision' });
    s.addNotes(
      'updateInputs layers cleanly on top of super: step the fake field forward with the robot\'s current pose, then let VisionIOPhotonVision\'s already-written logic read whatever the camera now reports — the same "physics first, then read" order ModuleIOSim used back in Lesson 13. PhotonCameraSim feeds its fake detections into the exact same PhotonCamera object VisionIOPhotonVision already reads, over NetworkTables, the same pipe a real coprocessor would use.'
    );
  }

  // ============================================================ SLIDE 14 — static field (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'layergroup_white.png', eyebrow: 'Section 8 · A new kind of field', title: 'static: one copy, owned by the class' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Every field so far belonged to one object.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('m_driveMotor on THIS module, not the others. static removes that belonging: a static field lives on the class, one copy shared by every instance that exists, not one copy per instance.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('This course\'s first reach for static state, and a clean picture of what it\'s for: one copy, owned by the class, not by any one instance.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 14, label: 'PhotonVision', dark: true });
    s.addNotes(
      'Read private static VisionSystemSim visionSim slowly, because it\'s new. Each camera you construct registers itself, because static state remembers who\'s already shown up.'
    );
  }

  // ============================================================ SLIDE 15 — PhotonVisionPoseProvider fields+constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 9 · A new file', title: 'PhotonVisionPoseProvider: own an IO, own a bundle, read it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.5, fontSize: 13,
      fileLabel: 'Create src/main/java/first/robot/subsystems/PhotonVisionPoseProvider.java — fields and constructor',
      lines: [
        { text: '/** A vision camera, contributing whatever pose corrections its IO reported this tick. */', color: '7FA8C9' },
        { text: 'public class PhotonVisionPoseProvider implements PoseProvider {', color: 'FFD166' },
        { text: '  private final VisionIO m_io;', color: 'D7E3F4' },
        { text: '  private final VisionIO.VisionIOInputs m_inputs = new VisionIO.VisionIOInputs();', color: 'D7E3F4' },
        { text: '  private final StructArrayPublisher<Pose3d> m_observationsPublisher;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public PhotonVisionPoseProvider(VisionIO io, String logKey) {', color: 'FFD166' },
        { text: '    m_io = io;', color: 'D7E3F4' },
        { text: '    m_observationsPublisher = NetworkTableInstance.getDefault()', color: 'D7E3F4' },
        { text: '        .getStructArrayTopic(logKey + "/PoseObservations", Pose3d.struct).publish();', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 15, label: 'PhotonVision' });
    s.addNotes(
      'All the real work already happened in VisionIO, so the provider itself is almost nothing — the same shape SwerveModule has had since Lesson 13: own an IO, own an inputs bundle, read the bundle.'
    );
  }

  // ============================================================ SLIDE 16 — PhotonVisionPoseProvider updatePoseEstimate
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 9 · A new file', title: 'Read once, log the poses, then fire every correction' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.0, fontSize: 12,
      fileLabel: 'Add to PhotonVisionPoseProvider',
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {', color: 'D7E3F4' },
        { text: '  m_io.updateInputs(m_inputs);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  Pose3d[] poses = new Pose3d[m_inputs.poseObservations.length];', color: 'D7E3F4' },
        { text: '  for (int i = 0; i < poses.length; i++) {', color: 'D7E3F4' },
        { text: '    poses[i] = m_inputs.poseObservations[i].pose();', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  m_observationsPublisher.set(poses);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {', color: '9EF01A' },
        { text: '    estimator.addVisionMeasurement(observation.pose().toPose2d(), observation.timestampSeconds());', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 16, label: 'PhotonVision' });
    s.addNotes(
      'm_io.updateInputs(m_inputs) reads (and, via the publisher, logs) whatever the camera saw this tick — live hardware or the simulated one, updatePoseEstimate can\'t tell which. Only after that read runs does the loop over poseObservations fire the corrections into the estimator. Notice what\'s missing compared to SwerveModule: no separate periodic() and setDesiredState(). A camera only ever reports; nothing here commands it.'
    );
  }

  // ============================================================ SLIDE 17 — PhotonVisionPoseProvider makeCamera
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 9 · A new file', title: 'makeCamera: the same picking pattern as makeModule' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.2, fontSize: 13,
      fileLabel: 'Add to PhotonVisionPoseProvider, closing out the class',
      lines: [
        { text: '/** Picks each camera\'s real/sim/replay IO, the same way Drivetrain picks each module\'s. */', color: '7FA8C9' },
        { text: 'public static PhotonVisionPoseProvider makeCamera(', color: 'FFD166' },
        { text: '    String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {', color: 'D7E3F4' },
        { text: '  VisionIO io = switch (Constants.kCurrentMode) {', color: '9EF01A' },
        { text: '    case REAL -> new VisionIOPhotonVision(name, robotToCamera);', color: '9EF01A' },
        { text: '    case SIM -> new VisionIOPhotonVisionSim(name, robotToCamera, poseSupplier);', color: '9EF01A' },
        { text: '    case REPLAY -> new VisionIO() {}; // nothing feeds this yet', color: '9EF01A' },
        { text: '  };', color: '9EF01A' },
        { text: '  return new PhotonVisionPoseProvider(io, "Localizer/" + name);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 1.75,
      body: 'Unlike Drivetrain\'s private makeModule, this one is public — Robot calls it from outside, keeping IO selection out of the wiring class.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 17, label: 'PhotonVision' });
    s.addNotes(
      'That Supplier<Pose2d> poseSupplier parameter is only ever read by the SIM arm — VisionIOPhotonVisionSim needs to know where the robot is so it knows what a camera there would see. It has to be a supplier, not a plain Pose2d, because the robot\'s pose changes every tick.'
    );
  }

  // ============================================================ SLIDE 18 — delete VisionPoseProvider + Robot fields
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 10 · Robot.java', title: 'Two blank finals — assigned once the constructor runs' });

    K.addCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 1.15, bg: CARDBG,
      body: 'Delete VisionPoseProvider.java — PhotonVisionPoseProvider replaces it.',
      pad: 0.2, bodySize: 20,
    });

    K.addCodeCard(s, {
      x: 0.7, y: 2.95, w: 11.9, h: 3.35, fontSize: 13,
      fileLabel: "Edit Robot's fields",
      lines: [
        { text: 'public class Robot extends OpModeRobot {', color: 'FFD166' },
        { text: '  public final CommandGamepad driverController = new CommandGamepad(0);', color: 'D7E3F4' },
        { text: '  public final Drivetrain drivetrain = new Drivetrain();', color: 'D7E3F4' },
        { text: '  public final Localizer localizer = new Localizer(drivetrain);', color: 'D7E3F4' },
        { text: '  // Blank finals: building a camera needs localizer, so localizer has to be', color: '7FA8C9' },
        { text: '  // a finished object first. Assigned below.', color: '7FA8C9' },
        { text: '  public final PhotonVisionPoseProvider frontCamera;', color: '9EF01A' },
        { text: '  public final PhotonVisionPoseProvider backCamera;', color: '9EF01A' },
      ],
    });

    K.addFooter(s, { pageNum: 18, label: 'PhotonVision' });
    s.addNotes(
      'Two cameras join Robot\'s fields, as blank finals, and get built in the constructor — the same pattern Lesson 14 used for localizer itself: a field needs a value assigned by the time the constructor returns, but that value doesn\'t have to come from the field\'s own declaration line.'
    );
  }

  // ============================================================ SLIDE 19 — Robot constructor building cameras
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 10 · Robot.java', title: 'localizer::getPose — an already-built object, right there' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.35, fontSize: 13,
      fileLabel: "Build both cameras in Robot's constructor",
      lines: [
        { text: 'public Robot() {', color: 'FFD166' },
        { text: '  DataLogManager.start();', color: 'D7E3F4' },
        { text: '  Scheduler.getDefault().addEventListener(this::logCommandStart);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  frontCamera = PhotonVisionPoseProvider.makeCamera(', color: '9EF01A' },
        { text: '      VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, localizer::getPose);', color: '9EF01A' },
        { text: '  backCamera = PhotonVisionPoseProvider.makeCamera(', color: '9EF01A' },
        { text: '      VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, localizer::getPose);', color: '9EF01A' },
        { text: '  localizer.addProvider(frontCamera);', color: '9EF01A' },
        { text: '  localizer.addProvider(backCamera);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.05, w: 11.9, h: 1.7,
      body: 'Building the cameras in the constructor body, instead of in their own field initializers, is what buys this: every field initializer above has already run before the constructor\'s first line executes.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 19, label: 'PhotonVision' });
    s.addNotes(
      'localizer::getPose is a method reference — shorthand for () -> localizer.getPose() — and there\'s nothing subtle about it this time. localizer isn\'t a promise to look something up later; it\'s an already-built object sitting right there.'
    );
  }

  // ============================================================ SLIDE 20 — delete Start-button binding
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 10 · RobotTeleop.java', title: 'No fake camera left, no fake sighting to trigger' });

    K.addCard(s, {
      x: 0.7, y: 2.0, w: 11.9, h: 2.2, bg: CARDBG,
      heading: 'Delete the Start-button binding from Lesson 14.',
      headingSize: 22,
      body: 'robot.camera.reportSighting(...) doesn\'t exist anymore — there\'s no fake sighting to trigger, because there\'s no fake camera left.',
    });

    K.addFooter(s, { pageNum: 20, label: 'PhotonVision' });
    s.addNotes(
      'Now run it: ./gradlew simulateJava → RobotTeleop, and open the VisionSim/DebugField widget in SimGUI alongside the usual Field. AprilTags live around the edges of the field, so drive toward any boundary — the debug field shows every tag and a wedge for each camera\'s field of view.'
    );
  }

  // ============================================================ SLIDE 21 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Add a third camera', body: 'A corner mount, angled 45°. Nothing in VisionIOPhotonVisionSim changes — its shared static field just picks up a third.', code: true },
        { title: 'Turn off multi-tag', body: 'Delete the estimateCoprocMultiTagPose branch. Single-tag estimates should look visibly noisier on the plot.', code: true },
        { title: 'Prove a miscalibrated camera is invisible', body: 'Add 0.3 m to kFrontRobotToCamera\'s forward offset. Localizer/Pose doesn\'t skew — the offset cancels itself out in this sim.', code: true },
        { title: 'Watch the empty doorway, vision edition', body: 'Flip kSimMode to Mode.REPLAY. Both cameras build fine, but neither ever publishes a reading.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 21, label: 'PhotonVision', dark: true });
    s.addNotes(
      'All four Try Its involve real code edits. The third is the deepest one: robotToCamera feeds both sides of this simulation — the fake camera\'s placement AND the math that turns its detections back into a robot pose — so a wrong number cancels itself out. A real robot has no such luck: the physical mount doesn\'t know what constant you typed into VisionConstants, so this exact mistake would quietly and permanently offset every vision correction it makes.'
    );
  }

  // ============================================================ SLIDE 22 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The Localizer proved its reason for existing' });

    const points = [
      'A real PhotonVisionPoseProvider slots into the exact same registry Lesson 14\'s fake button-press provider used, with zero changes to Localizer.',
      'Optional<EstimatedRobotPose> gave "there might not be a pose" an honest, checkable type. Multi-tag-first-with-single-tag-fallback: more agreeing evidence beats less.',
      'A static field gave every simulated camera a way to share one VisionSystemSim — this course\'s first reach for static state.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 16', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Ground Truth', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Give the simulation a body — and something other than itself to check odometry against.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 22, label: 'PhotonVision' });
    s.addNotes(
      'You ran head-first into a real limit of this course\'s simulator: because VisionIOPhotonVisionSim renders what the fake camera sees from the same estimate vision then corrects, this sim can confirm a good pose but can\'t demonstrate rescuing a bad one, and can\'t expose a miscalibrated camera mount either — both need an independent "actual" position to check against, which doesn\'t exist yet. A future lesson hands the whole thing a physics engine, and with it, the ground truth this lesson\'s callouts kept pointing toward.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '15-photonvision.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
