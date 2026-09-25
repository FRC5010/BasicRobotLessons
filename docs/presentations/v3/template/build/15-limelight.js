const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

// Code cards in this deck are sliced verbatim from docs/lessons/v3/15-limelight.md.
// If you change a card, check the line still appears in the lesson exactly.

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 15 — Real Vision: Limelight' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 15',
    title: 'Real Vision: Limelight',
    subtitle: 'A real camera, and a simulated one',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Lesson 14 ended with a promise: "Add a real vision provider next season and Localizer doesn\'t change by a line." Today that gets cashed in — a Limelight camera read through LimelightLib 2, a simulated twin that sends exactly what a real Limelight would, and both behind the same VisionIO treatment ModuleIO and GyroIO got in Lesson 13.'
  );

  // ============================================================ SLIDE 2
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'A real camera, and a simulated one' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.6, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Replace Lesson 14\'s fake vision provider with a real one — a Limelight read through LimelightLib 2 — give it a simulated twin that sends exactly what a real Limelight would, behind the same VisionIO treatment ModuleIO and GyroIO got.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.35, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.6;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Optional<T> — make one, and open one', options: { bullet: true, breakLine: true } },
        { text: 'static — owned by the class, not an object', options: { bullet: true, breakLine: true } },
        { text: 'A blank final — assigned in the constructor', options: { bullet: true, breakLine: true } },
        { text: 'record — a small, structured data bundle', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('camera_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Limelight and LimelightLib 2', options: { bullet: true, breakLine: true } },
        { text: 'MegaTag2 — it borrows your heading', options: { bullet: true, breakLine: true } },
        { text: 'Per-frame trust, and latency', options: { bullet: true, breakLine: true } },
        { text: 'Field and Transform3d, +Z is up', options: { bullet: true, breakLine: true } },
        { text: 'A sim camera that speaks NetworkTables', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Limelight' });
    s.addNotes(
      'Per-frame trust means Lesson 14\'s standard deviations, computed fresh for every frame from how far away the tags were and how many there were. Latency is why every frame says how old it is. The simulated camera speaks the real camera\'s language over NetworkTables, so the real library can\'t tell the difference.'
    );
  }

  // ============================================================ SLIDE 3
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 1 · What changes', title: 'Localizer was never told there was a difference' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('What your code needs — a Pose2d, a timestamp, and how far to trust it — is exactly what addVisionMeasurement already takes.', {
      x: 1.0, y: 2.1, w: 11.3, h: 1.5, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('A button press satisfied that shape in Lesson 14. A real camera satisfies the same shape today.', {
      x: 1.0, y: 3.5, w: 11.3, h: 1.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('A Limelight is a camera with its own computer inside: it finds AprilTags and works out the robot\'s position itself. Systemcore runs the same vision software on a plain USB camera.', {
      x: 0.7, y: 5.1, w: 11.9, h: 1.4, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Limelight', dark: true });
    s.addNotes(
      'Lesson 14 ended with a promise: Add a real vision provider next season and Localizer doesn\'t change by a line. Today you cash that in. A Limelight watches its video feed, finds AprilTags, and does all the geometry itself — "I see tag 26 at this spot in the image" becomes "the robot is at (1.7, 4.0) on the field" before your code hears a word. The answer travels to your robot code over NetworkTables, the same network pipe every published value in this course already rides on. Your code never touches a pixel — it asks Limelight\'s Java library, LimelightLib 2, for the answer.'
    );
  }

  // ============================================================ SLIDE 4
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'download_white.png', eyebrow: 'Section 2 · Install LimelightLib 2', title: 'Same ritual as Phoenix 6 — but by URL' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 0.9,
      steps: [
        { title: 'WPILib: Manage Vendor Libraries → Install new library (online)', detail: 'LimelightLib isn\'t in the search list, so it installs by URL.' },
        { title: 'Paste the pinned URL below', detail: 'All of it, as one line — it\'s in the lesson too.' },
        { title: 'Rebuild to confirm', detail: './gradlew build' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.5, w: 11.9, h: 1.45, fontSize: 14,
      fileLabel: 'Paste into the dialog as ONE line',
      lines: [
        { text: 'https://raw.githubusercontent.com/LimelightVision/limelightlib-public/', color: '9EF01A' },
        { text: '717a921719f5dbaf4ce940819e2d84bdab8738b9/LimelightLib-alpha7.json', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.05, w: 11.9, h: 0.9,
      body: 'Limelight\'s own link is replaced on every release — beta5 to beta9 in one week. A commit can\'t change.',
      pad: 0.15,
      bodySize: 16,
    });

    K.addFooter(s, { pageNum: 4, label: 'Limelight' });
    s.addNotes(
      'Limelight\'s own docs hand out a shorter link, .../limelightlib-public/LimelightLib-alpha7.json. That file gets replaced every time they publish — it went from beta5 to beta9 in one week of September 2026 — so the same link builds different code from one day to the next. The long URL names one exact commit of that file, and a commit can\'t change. Every WPILib-marketplace vendordep in this course is pinned the same way, by version; this one just had to be pinned by hand.'
    );
  }

  // ============================================================ SLIDE 5
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 3 · Constants.java', title: 'Where the tags actually are — a solved problem' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.1, fontSize: 14,
      fileLabel: 'Add to Constants.java',
      lines: [
        { text: 'public static final class VisionConstants {', color: 'FFD166' },
        { text: '  // This season\'s field: its size, and where every AprilTag sits on it.', color: '7FA8C9' },
        { text: '  public static final Field kTagLayout = Field.loadField(Fields.DEFAULT_FIELD);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.95, w: 11.9, h: 2.9,
      body: 'Fields.DEFAULT_FIELD always points at the current season\'s field — as of this writing, the 2026 REBUILT welded field: 16.54 m by 8.07 m, 32 tags. An AndyMark-built field has its own entry, FRC_2026_REBUILT_ANDY_MARK. And don\'t mix this Field up with Lesson 11\'s Field2d: Field2d is a drawing on a dashboard; Field is measurements of the real thing.',
      pad: 0.25,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 5, label: 'Limelight' });
    s.addNotes(
      'To turn "I see tag 26" into a field position, something has to know where tag 26 actually is. That\'s a solved problem — WPILib ships the official field for the current game, tag positions included. Fields is an enum with one entry per field WPILib knows about, and DEFAULT_FIELD is a standing alias to the current season\'s. This lesson uses both Field and Field2d.'
    );
  }

  // ============================================================ SLIDE 6
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 4 · Constants.java', title: '+Z is up — the third axis of Lesson 7\'s rule' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.25, fontSize: 14,
      fileLabel: 'Add to VisionConstants, below the tag layout',
      lines: [
        { text: '// Camera mount positions: robot center → camera lens. Each name must', color: '7FA8C9' },
        { text: '// match the one set in that camera\'s web UI.', color: '7FA8C9' },
        { text: 'public static final String kFrontCameraName = "limelight-front";', color: 'D7E3F4' },
        { text: 'public static final Transform3d kFrontRobotToCamera = new Transform3d(', color: '9EF01A' },
        { text: '    new Translation3d(0.3, 0.0, 0.2), // 30 cm forward, centered, 20 cm up', color: '9EF01A' },
        { text: '    new Rotation3d(0, 0, 0));         // facing straight forward', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: 'public static final String kBackCameraName = "limelight-back";', color: 'D7E3F4' },
        { text: 'public static final Transform3d kBackRobotToCamera = new Transform3d(', color: '9EF01A' },
        { text: '    new Translation3d(-0.3, 0.0, 0.2), // 30 cm back, 20 cm up', color: '9EF01A' },
        { text: '    new Rotation3d(0, 0, Math.PI));    // facing straight backward', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.85, w: 11.9, h: 1.05,
      body: 'Measure it for real, to the centimeter — a wrong transform quietly offsets every position.',
      pad: 0.2,
      bodySize: 17,
    });
    K.addFooter(s, { pageNum: 6, label: 'Limelight' });
    s.addNotes(
      'A Transform3d bundles a Translation3d (the position offset) with a Rotation3d (the orientation offset) — the 3D sibling of the Translation2d you\'ve used since Lesson 7. Front and back, facing opposite directions, is a common real layout: two cameras double your chances of seeing a tag and cover each other\'s blind spot. Every Limelight has a name, set in its web interface, and that name is how your code finds it on the network — a camera named limelight-front publishes under limelight-front. A USB camera running on Systemcore gets a fixed name instead, one per port; the library has constants for them, like Limelight.SYSTEMCORE_USB0 (which is "limelightsc0"). A wrong transform reports a robot position that\'s off by however wrong the measurement was — and Try It #4 shows why this course\'s simulator can\'t show you that happening.'
    );
  }

  // ============================================================ SLIDE 7
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 4 · Constants.java', title: 'Three numbers for the simulated camera' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 2.4, fontSize: 14,
      fileLabel: 'Add to VisionConstants, one more block',
      lines: [
        { text: '// The simulated camera only. Plausible guesses, not any one camera\'s spec', color: '7FA8C9' },
        { text: '// sheet — check yours before trusting them.', color: '7FA8C9' },
        { text: 'public static final double kSimHorizontalFovDegrees = 80.0;', color: '9EF01A' },
        { text: 'public static final double kSimVerticalFovDegrees = 56.0;', color: '9EF01A' },
        { text: 'public static final double kSimMaxRangeMeters = 6.0;', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.75,
      heading: 'Add the imports VisionConstants needs',
      headingSize: 22,
      body: 'Field and Fields live under org.wpilib.fields. Transform3d, Translation3d, and Rotation3d live under org.wpilib.math.geometry, next to the Translation2d already imported there. Let autocomplete find them.',
      pad: 0.3,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 7, label: 'Limelight' });
    s.addNotes(
      'These three are only for the simulated camera you\'ll build in section 8: how wide and tall its view is, and how far away it can still read a tag. They\'re plausible guesses, not any one camera\'s spec sheet — check yours before trusting them.'
    );
  }

  // ============================================================ SLIDE 8
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 5 · The heading problem', title: 'MegaTag2 borrows the heading you already know' });
    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('MegaTag1', { x: 1.0, y: 2.1, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0 });
    s.addText('Works everything out from the tags alone. One flat square seen a little from the left looks almost like the same square seen from the right — so a single tag can leave two believable answers.', {
      x: 1.0, y: 2.8, w: 5.25, h: 3.35, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('MegaTag2', { x: 7.05, y: 2.1, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0 });
    s.addText('You tell the camera which way the robot faces — your gyro knows that far better than a picture does — so it only has to work out where you are. This is the one you\'ll use.', {
      x: 7.05, y: 2.8, w: 5.25, h: 3.35, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
    K.addFooter(s, { pageNum: 8, label: 'Limelight', dark: true });
    s.addNotes(
      'Limelight\'s MegaTag1 works everything out from the tags alone, so with a single tag in view it inherits that blind spot — the library screens single-tag MegaTag1 answers extra hard for exactly this reason. MegaTag2 sidesteps it. The price is that you have to send the heading every loop.'
    );
  }

  // ============================================================ SLIDE 9
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'layergroup_white.png', eyebrow: 'Section 5 · static, named at last', title: 'Look left of the dot: the class, not a camera' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.55, w: 11.9, h: 1.25, fontSize: 16,
      fileLabel: 'Nothing to add yet — this is the call you\'ll write in section 7',
      example: true,
      lines: [
        { text: 'Limelight.setSharedRobotOrientation(heading.getDegrees());', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.05, w: 11.9, h: 3.85,
      heading: 'static: owned by the class, one copy total',
      headingSize: 22,
      body: 'Something static belongs to the class itself — one copy total, not one per object you build. It\'s been in every public static final in Constants.java since Lesson 1: that\'s why you write DriveConstants.kMaxSpeed without ever building a DriveConstants. Here it matches the physics. A robot has one heading, so there\'s one shared heading value that every Limelight on the robot reads.',
      pad: 0.3,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 9, label: 'Limelight' });
    s.addNotes(
      'Look at what\'s on the left of the dot: Limelight, the class, not a camera object. That\'s static, and it\'s been hiding in plain sight since Lesson 1 — every public static final in Constants.java, and every Rotation2d.fromDegrees(...) you\'ve called.'
    );
  }

  // ============================================================ SLIDE 10
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 5 · The trust problem', title: 'How far to trust a frame — worked out every frame' });

    s.addShape('roundRect', { x: 0.7, y: 1.65, w: 11.9, h: 1.05, rectRadius: 0.1, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('trust (m)  =  0.3 × distance to the tags ÷ √(number of tags)', {
      x: 1.0, y: 1.8, w: 11.3, h: 0.75, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, align: 'center', valign: 'middle', margin: 0,
    });

    K.addCard(s, {
      x: 0.7, y: 2.95, w: 3.77, h: 2.5,
      heading: '1 tag, 2 m away',
      headingSize: 22,
      body: '0.3 × 2 = 0.6 m.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addCard(s, {
      x: 4.77, y: 2.95, w: 3.77, h: 2.5,
      heading: '1 tag, 4 m → 1.2 m',
      headingSize: 22,
      body: 'A farther tag is a smaller target: a shakier answer, a weaker pull.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addCard(s, {
      x: 8.84, y: 2.95, w: 3.77, h: 2.5,
      heading: '2 tags, ~2.2 m',
      headingSize: 22,
      body: '0.3 × 2.2 ÷ √2 ≈ 0.47 m — what this sim reported, 2 m from a hub.',
      pad: 0.25,
      bodySize: 18,
    });

    s.addText('More tags, closer tags: more trust. Heading is always marked "ignore" — MegaTag2\'s heading is just yours, handed back.', {
      x: 0.7, y: 5.7, w: 11.9, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });

    K.addFooter(s, { pageNum: 10, label: 'Limelight' });
    s.addNotes(
      'Lesson 14 showed you the trust knob — VecBuilder.fill(0.5, 0.5, 999999), trust x and y to about half a meter, ignore heading — and said tuning it was a deep art. The library does the first round of that art for you, fresh for every frame. The 0.47 m figure is exactly what this course\'s own simulation reported, standing 2 m from a hub with two of its tags in view.'
    );
  }

  // ============================================================ SLIDE 11
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'history_white.png', eyebrow: 'Section 5 · Filtering and timestamps', title: 'The library filters before it feeds' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.55, w: 11.9, h: 1.25, fontSize: 16,
      fileLabel: 'Nothing to add yet — the call you\'ll use in section 7',
      example: true,
      lines: [
        { text: 'm_camera.readAcceptedPoseEstimates(PoseEstimateType.MT2_WPIBLUE)', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.05, w: 5.8, h: 3.85,
      eyebrow: 'Only frames that pass',
      body: 'A real tag was used, a pose came back, the timestamp makes sense. MT2 is MegaTag2; WPIBLUE means the same blue-corner origin WPILib\'s field uses.',
      pad: 0.3,
      bodySize: 18,
    });
    K.addCard(s, {
      x: 6.8, y: 3.05, w: 5.8, h: 3.85,
      eyebrow: 'Already latency-corrected',
      body: 'A frame that took 30 ms to capture and process is stamped 30 ms in the past — exactly the "when was this true?" Lesson 14\'s estimator rewinds to.',
      pad: 0.3,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 11, label: 'Limelight' });
    s.addNotes(
      'The library filtering before it hands you anything is Lesson 14\'s last Try It paying off — real vision code filters before it feeds. And because WPIBLUE uses the same origin WPILib\'s field does, the pose means the same thing to your estimator that it means to the camera.'
    );
  }

  // ============================================================ SLIDE 12
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'dooropen_white.png', eyebrow: 'Section 6 · A new file', title: 'VisionIO — an array of records, plus one output' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.2, fontSize: 11,
      fileLabel: 'Create src/main/java/first/robot/subsystems/VisionIO.java — the whole interface',
      lines: [
        { text: 'public interface VisionIO {', color: 'FFD166' },
        { text: '  public static class VisionIOInputs {', color: 'FFD166' },
        { text: '    public PoseObservation[] poseObservations = new PoseObservation[0];', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** One camera frame\'s worth of evidence: where it put the robot, when, and how far to trust it. */', color: '7FA8C9' },
        { text: '  public static record PoseObservation(', color: '9EF01A' },
        { text: '      double timestampSeconds, Pose2d pose, int tagCount, Vector<N3> stdDevs) {}', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  public default void updateInputs(VisionIOInputs inputs) {}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** MegaTag2 borrows the robot\'s heading instead of solving for it — tell it every loop. */', color: '7FA8C9' },
        { text: '  public default void setRobotHeading(Rotation2d heading) {}', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.8, w: 11.9, h: 1.1,
      body: 'setRobotHeading is an output: your code tells the hardware, like setSteerAngleDegrees.',
      pad: 0.2,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 12, label: 'Limelight' });
    s.addNotes(
      'Most of that is familiar: the default do-nothing methods and the nested Inputs class are exactly what ModuleIO and GyroIO already taught you. What\'s new is the input itself. A camera can deliver zero, one, or several frames between reads, so the input is an array of a small record, PoseObservation — a compact way to bundle when it was true, where it put the robot, how many tags built it, and how far to trust it. Java writes the constructor and getters for you: observation.pose(), observation.stdDevs(). Vector<N3> is WPILib\'s type for three numbers in a column — the trust for x, y, and heading, the same kind of value VecBuilder.fill(0.5, 0.5, 999999) made in Lesson 14\'s callout. (The file\'s package line and imports are in the lesson.)'
    );
  }

  // ============================================================ SLIDE 13
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 7 · A new file', title: 'VisionIOLimelight: one camera, one shared heading' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.75, fontSize: 12,
      fileLabel: 'Create src/main/java/first/robot/subsystems/VisionIOLimelight.java — fields, constructor, setRobotHeading',
      lines: [
        { text: '/** IO implementation for a real Limelight camera. */', color: '7FA8C9' },
        { text: 'public class VisionIOLimelight implements VisionIO {', color: 'FFD166' },
        { text: '  private final Limelight m_camera;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public VisionIOLimelight(String cameraName, Transform3d robotToCamera) {', color: 'FFD166' },
        { text: '    // Handing the library the mount position overrides whatever the camera\'s', color: '7FA8C9' },
        { text: '    // web UI says, so the measurement lives in exactly one place: VisionConstants.', color: '7FA8C9' },
        { text: '    m_camera = new Limelight(', color: '9EF01A' },
        { text: '        cameraName, new Pose3d(robotToCamera.getTranslation(), robotToCamera.getRotation()));', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void setRobotHeading(Rotation2d heading) {', color: 'FFD166' },
        { text: '    Limelight.setSharedRobotOrientation(heading.getDegrees());', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });
    K.addFooter(s, { pageNum: 13, label: 'Limelight' });
    s.addNotes(
      'The constructor turns your Transform3d into the Pose3d the library asks for — same translation, same rotation, just "where the camera sits, measured from the robot\'s center" spelled as a pose. One small thing about setRobotHeading: every camera\'s provider will call it, so with two cameras the shared heading gets set twice a loop, to the same number. That\'s harmless, and it means each camera\'s code works on its own without knowing whether any others exist. (The imports are in the lesson.)'
    );
  }

  // ============================================================ SLIDE 14
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 7 · A new file', title: 'Read every accepted frame into a PoseObservation' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.5, fontSize: 11,
      fileLabel: 'Add to VisionIOLimelight, closing out the class',
      lines: [
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updateInputs(VisionIOInputs inputs) {', color: 'FFD166' },
        { text: '    PoseEstimate[] estimates = m_camera.readAcceptedPoseEstimates(PoseEstimateType.MT2_WPIBLUE);', color: '9EF01A' },
        { text: '    inputs.poseObservations = new PoseObservation[estimates.length];', color: 'D7E3F4' },
        { text: '    for (int i = 0; i < estimates.length; i++) {', color: 'D7E3F4' },
        { text: '      PoseEstimate estimate = estimates[i];', color: 'D7E3F4' },
        { text: '      inputs.poseObservations[i] = new PoseObservation(', color: '9EF01A' },
        { text: '          estimate.timestampSeconds, estimate.pose, estimate.fieldedTagCount, estimate.stdDevs);', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 5.8, h: 1.8,
      eyebrow: 'Reading is its only job',
      body: 'It never touches the estimator or judges whether a correction is good.',
      pad: 0.25,
      bodySize: 17,
    });
    K.addCard(s, {
      x: 6.8, y: 5.1, w: 5.8, h: 1.8,
      eyebrow: 'private, not protected',
      body: 'The simulated camera never needs to reach in — section 8 shows why.',
      pad: 0.25,
      bodySize: 17,
    });
    K.addFooter(s, { pageNum: 14, label: 'Limelight' });
    s.addNotes(
      'updateInputs reads every frame that arrived since last time, keeps only the ones the library accepted, and copies each one into a PoseObservation. Reading is the only job an IO class has; deciding what to do with what it read belongs one layer up. In Lesson 13, ModuleIOTalonFX made its motors protected because ModuleIOSim needed to reach in and feed them. The simulated camera you\'re about to write doesn\'t need to reach in at all.'
    );
  }

  // ============================================================ SLIDE 15
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'broadcasttower_white.png', eyebrow: 'Section 8 · Simulating a camera', title: 'What exactly are you pretending to be?' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.35, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Everything a real Limelight tells your robot code arrives one way: one message per frame, on a topic named after itself.', {
      x: 1.0, y: 2.1, w: 11.3, h: 1.1, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('limelight-front/results_msgpack', {
      x: 1.0, y: 3.3, w: 11.3, h: 0.5, fontFace: K.FONT_CODE, bold: true, fontSize: 22, color: '9EF01A', valign: 'top', margin: 0,
    });
    s.addText('The filtering, trust, and timestamps all happen inside the library as it reads those messages. So publish the same message to the same topic, and the real library runs, unmodified, on your fake camera.', {
      x: 1.0, y: 3.95, w: 11.3, h: 1.25, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });

    s.addText('When you have to fake something, fake it at the boundary where the real thing would plug in.', {
      x: 0.7, y: 5.45, w: 11.9, h: 1.0, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 15, label: 'Limelight', dark: true });
    s.addNotes(
      'Nobody in this course has a Limelight on their desk, so you\'ll simulate one. The library subscribes to that topic, and everything you used in section 7 happens inside the library, on the robot, as it reads those messages. It can\'t tell the difference, because from where it sits there is no difference. That\'s why the simulated camera doesn\'t need m_camera: it doesn\'t talk to the library at all. It talks to the network, the way the real camera does.'
    );
  }

  // ============================================================ SLIDE 16
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 8a · A new file', title: 'LimelightFrame: the message a Limelight sends' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 5.0, fontSize: 11,
      fileLabel: 'Create src/main/java/first/robot/subsystems/LimelightFrame.java — the class and noTargets',
      lines: [
        { text: '/**', color: '7FA8C9' },
        { text: ' * Builds one results frame the way a Limelight writes it: MessagePack, a', color: '7FA8C9' },
        { text: ' * compact binary cousin of JSON. Sim-only plumbing, holding just the few', color: '7FA8C9' },
        { text: ' * keys the library needs to build a MegaTag2 pose estimate.', color: '7FA8C9' },
        { text: ' */', color: '7FA8C9' },
        { text: 'public class LimelightFrame {', color: 'FFD166' },
        { text: '  private final ByteArrayOutputStream m_bytes = new ByteArrayOutputStream();', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** A frame that saw nothing. Real cameras send these too — silence would mean "unplugged". */', color: '7FA8C9' },
        { text: '  public static byte[] noTargets(long frameIndex, double latencyMs) {', color: '9EF01A' },
        { text: '    return new LimelightFrame()', color: 'D7E3F4' },
        { text: '        .map(3)', color: 'D7E3F4' },
        { text: '        .key("fidx").number(frameIndex)         // every frame is numbered, so no two are identical', color: '9EF01A' },
        { text: '        .key("v").number(0)                     // 0 = no valid target this frame', color: '9EF01A' },
        { text: '        .key("cl").number(latencyMs)            // capture latency, milliseconds', color: '9EF01A' },
        { text: '        .bytes();', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });
    K.addFooter(s, { pageNum: 16, label: 'Limelight' });
    s.addNotes(
      'The message is MessagePack — a compact, binary cousin of JSON. A Limelight packs a lot into each frame; the library only needs a handful of keys to build a MegaTag2 estimate, and this small class writes exactly those. A frame that saw nothing still gets sent — real cameras send these too, because silence would mean "unplugged." (The file\'s package line and imports are in the lesson.)'
    );
  }

  // ============================================================ SLIDE 17
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 8a · A new file', title: 'withTargets: a frame that saw something' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.0, fontSize: 11,
      fileLabel: 'Add to LimelightFrame, below noTargets',
      lines: [
        { text: '  /** A frame that saw \'tagIds\' and placed the robot at \'robot\' (MegaTag2, blue-alliance origin). */', color: '7FA8C9' },
        { text: '  public static byte[] withTargets(long frameIndex, Pose2d robot, List<Integer> tagIds,', color: 'D7E3F4' },
        { text: '      double avgDistanceMeters, double latencyMs) {', color: 'D7E3F4' },
        { text: '    LimelightFrame frame = new LimelightFrame()', color: 'D7E3F4' },
        { text: '        .map(6)', color: 'D7E3F4' },
        { text: '        .key("fidx").number(frameIndex)', color: 'D7E3F4' },
        { text: '        .key("v").number(1)', color: 'D7E3F4' },
        { text: '        .key("cl").number(latencyMs)', color: 'D7E3F4' },
        { text: '        .key("botpose_orb_wpiblue").array(6)    // x, y, z (meters), roll, pitch, yaw (degrees)', color: '9EF01A' },
        { text: '            .number(robot.getX()).number(robot.getY()).number(0)', color: 'D7E3F4' },
        { text: '            .number(0).number(0).number(robot.getRotation().getDegrees())', color: 'D7E3F4' },
        { text: '        .key("botpose_avgdist").number(avgDistanceMeters)', color: '9EF01A' },
        { text: '        .key("Fiducial").array(tagIds.size());', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.3,
      body: 'The keys are the list of what the library checks: "v" (a target at all), "botpose_orb_wpiblue" (the MegaTag2 pose), "botpose_avgdist" (feeds the trust formula), "Fiducial" (the tags).',
      pad: 0.2,
      bodySize: 17,
    });
    K.addFooter(s, { pageNum: 17, label: 'Limelight' });
    s.addNotes(
      'The part worth reading is the two public methods, because they\'re a list of what the library actually checks. "v" says whether the camera saw a target at all. "botpose_orb_wpiblue" is the MegaTag2 pose, as six numbers (in Limelight\'s naming, orb marks the MegaTag2 answers). "botpose_avgdist" feeds the trust formula from section 5.'
    );
  }

  // ============================================================ SLIDE 18
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 8a · A new file', title: 'One entry per tag, marked as having helped' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.55, w: 11.9, h: 2.85, fontSize: 13,
      fileLabel: 'Add to withTargets, finishing the method',
      lines: [
        { text: '    for (int id : tagIds) {', color: 'D7E3F4' },
        { text: '      frame.map(2)', color: 'D7E3F4' },
        { text: '          .key("fID").number(id)', color: '9EF01A' },
        { text: '          .key("fielded").number(1);            // 1 = this tag helped place the robot', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '    return frame.bytes();', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.55, w: 11.9, h: 2.35,
      body: 'Each entry in "Fiducial" is one tag, marked as having helped place the robot — the library rejects a pose no real tag contributed to. Each helper ends in return this, which is what lets the calls chain — .key("v").number(1) — the same way .until(...) and .named(...) chain onto a command.',
      pad: 0.3,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 18, label: 'Limelight' });
    s.addNotes(
      'Chaining works because each helper hands back the same object it was called on, so the next call has something to call on. You\'ve been doing this with commands since the start of the course.'
    );
  }

  // ============================================================ SLIDE 19
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 8a · A new file', title: 'The byte-level helpers: map and array' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.3, fontSize: 13,
      fileLabel: 'Add to LimelightFrame, below withTargets',
      lines: [
        { text: '  // The four MessagePack shapes those frames use. Each starts with one byte', color: '7FA8C9' },
        { text: '  // saying what\'s coming, then the thing itself.', color: '7FA8C9' },
        { text: '', color: 'D7E3F4' },
        { text: '  private LimelightFrame map(int entries) {     // up to 15 key/value pairs', color: 'D7E3F4' },
        { text: '    m_bytes.write(0x80 | entries);', color: '9EF01A' },
        { text: '    return this;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  private LimelightFrame array(int items) {     // up to 15 items', color: 'D7E3F4' },
        { text: '    m_bytes.write(0x90 | items);', color: '9EF01A' },
        { text: '    return this;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.9, w: 11.9, h: 1.0,
      body: 'No need to memorize these bytes — they\'re MessagePack\'s rules, not ideas you\'ll reuse.',
      pad: 0.2,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 19, label: 'Limelight' });
    s.addNotes(
      'Each helper writes a one-byte header saying what\'s coming, then the thing itself. 0x80 plus a count means a map with that many key/value pairs; 0x90 plus a count means an array with that many items.'
    );
  }

  // ============================================================ SLIDE 20
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 8a · A new file', title: 'The byte-level helpers: key, number, bytes' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 5.3, fontSize: 12,
      fileLabel: 'Add to LimelightFrame, closing out the class',
      lines: [
        { text: '  private LimelightFrame key(String text) {     // strings up to 31 bytes', color: 'D7E3F4' },
        { text: '    byte[] utf8 = text.getBytes(StandardCharsets.UTF_8);', color: 'D7E3F4' },
        { text: '    m_bytes.write(0xA0 | utf8.length);', color: '9EF01A' },
        { text: '    m_bytes.writeBytes(utf8);', color: 'D7E3F4' },
        { text: '    return this;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  private LimelightFrame number(double value) { // every number as a 64-bit double', color: 'D7E3F4' },
        { text: '    m_bytes.write(0xCB);', color: '9EF01A' },
        { text: '    m_bytes.writeBytes(ByteBuffer.allocate(8).putDouble(value).array());', color: '9EF01A' },
        { text: '    return this;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  private byte[] bytes() {', color: 'FFD166' },
        { text: '    return m_bytes.toByteArray();', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });
    K.addFooter(s, { pageNum: 20, label: 'Limelight' });
    s.addNotes(
      '0xA0 plus a length is a short string; 0xCB says a 64-bit double follows. Every number in these frames goes out as a double — the library\'s reader accepts any numeric encoding, so one shape covers them all. bytes() hands back the finished message.'
    );
  }

  // ============================================================ SLIDE 21
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'exclamationtriangle_white.png', eyebrow: 'Section 8a · The keys that matter', title: 'Two keys you\'d only find the hard way' });
    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('"cl"', { x: 1.0, y: 2.1, w: 5.25, h: 0.6, fontFace: K.FONT_CODE, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0 });
    s.addText('Capture latency: how many milliseconds old this frame already is when it arrives. The library subtracts it to get the timestamp.', {
      x: 1.0, y: 2.8, w: 5.25, h: 3.35, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('"fidx"', { x: 7.05, y: 2.1, w: 5.25, h: 0.6, fontFace: K.FONT_CODE, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0 });
    s.addText('The frame number. NetworkTables quietly drops a value that\'s the same as the last one — so identical "saw nothing" frames get thrown away, and the camera reads as gone silent.', {
      x: 7.05, y: 2.8, w: 5.25, h: 3.35, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
    K.addFooter(s, { pageNum: 21, label: 'Limelight', dark: true });
    s.addNotes(
      'Without a frame number, a camera staring at an empty wall would send the same "saw nothing" frame over and over, NetworkTables would throw the repeats away, and the library would decide the camera had gone silent. A real Limelight numbers its frames too.'
    );
  }

  // ============================================================ SLIDE 22
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 8b · A new file', title: 'VisionIOLimelightSim extends the real class' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.9, fontSize: 11,
      fileLabel: 'Create src/main/java/first/robot/subsystems/VisionIOLimelightSim.java — the class and its fields',
      lines: [
        { text: '/**', color: '7FA8C9' },
        { text: ' * IO implementation for a simulated Limelight. Works out which tags a camera', color: '7FA8C9' },
        { text: ' * mounted here could see, then publishes the answer exactly where a real', color: '7FA8C9' },
        { text: ' * Limelight would — so the real library reads it without knowing the difference.', color: '7FA8C9' },
        { text: ' */', color: '7FA8C9' },
        { text: 'public class VisionIOLimelightSim extends VisionIOLimelight {', color: '9EF01A' },
        { text: '  private static final double kLatencyMs = 20.0; // one loop: captured last tick, published this one', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  private final Transform3d m_robotToCamera;', color: 'D7E3F4' },
        { text: '  private final Supplier<Pose2d> m_poseSupplier;', color: 'D7E3F4' },
        { text: '  private final RawPublisher m_publisher;', color: 'D7E3F4' },
        { text: '  private byte[] m_captured = null; // this tick\'s frame, published next tick', color: '9EF01A' },
        { text: '  private long m_frameCount = 0;', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.5, w: 11.9, h: 1.4,
      body: 'The same "extend the real class" move Lesson 13 used for ModuleIOSim: inherit the real reading code, and add the fake camera in front of it.',
      pad: 0.25,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 22, label: 'Limelight' });
    s.addNotes(
      'It extends VisionIOLimelight, so it inherits the real reading code and only adds the fake camera in front of it. Build it in pieces. (The imports are in the lesson.)'
    );
  }

  // ============================================================ SLIDE 23
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 8b · A new file', title: 'Publish where a real Limelight with this name would' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.0, fontSize: 13,
      fileLabel: 'Add to VisionIOLimelightSim, below the fields',
      lines: [
        { text: '  public VisionIOLimelightSim(', color: 'FFD166' },
        { text: '      String cameraName, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {', color: 'D7E3F4' },
        { text: '    super(cameraName, robotToCamera);', color: '9EF01A' },
        { text: '    m_robotToCamera = robotToCamera;', color: 'D7E3F4' },
        { text: '    m_poseSupplier = poseSupplier;', color: 'D7E3F4' },
        { text: '    // The same topic a real Limelight with this name publishes to.', color: '7FA8C9' },
        { text: '    m_publisher = NetworkTableInstance.getDefault()', color: 'D7E3F4' },
        { text: '        .getTable(cameraName)', color: 'D7E3F4' },
        { text: '        .getRawTopic("results_msgpack")', color: '9EF01A' },
        { text: '        .publish("msgpack");', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.3,
      body: 'The poseSupplier is where the fake camera stands. It\'s a supplier, not a Pose2d: the robot moves every tick, and the camera needs a fresh position each time.',
      pad: 0.2,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 23, label: 'Limelight' });
    s.addNotes(
      'The poseSupplier has to be a supplier, not a plain Pose2d: the robot moves every tick, and the camera needs a fresh position each time, not wherever the robot happened to be at construction. Section 10 decides what to pass in.'
    );
  }

  // ============================================================ SLIDE 24
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'history_white.png', eyebrow: 'Section 8b · A new file', title: 'A real camera\'s answer is always a little old' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.2, fontSize: 12,
      fileLabel: 'Add to VisionIOLimelightSim, below the constructor',
      lines: [
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updateInputs(VisionIOInputs inputs) {', color: 'FFD166' },
        { text: '    if (m_captured != null) {', color: 'D7E3F4' },
        { text: '      m_publisher.set(m_captured);       // last tick\'s frame arrives now, one loop late', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '    m_frameCount++;', color: 'D7E3F4' },
        { text: '    m_captured = capture(m_poseSupplier.get());', color: '9EF01A' },
        { text: '    super.updateInputs(inputs);          // read it back through the real library', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.8, w: 11.9, h: 2.1,
      heading: 'updateInputs is where the honesty lives',
      headingSize: 20,
      body: 'It holds each frame one loop: publish last tick\'s, capture this tick\'s, read through the real class. A loop is 20 ms, so kLatencyMs is 20 — the frame is honest about its age.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 24, label: 'Limelight' });
    s.addNotes(
      'A fake camera that answered instantly would hide latency from you. Holding each frame one loop and reporting 20 ms means the library\'s timestamp lands on the tick the frame was captured — the timestamp math works on fake frames exactly as it will on real ones.'
    );
  }

  // ============================================================ SLIDE 25
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 8b · A new file', title: 'capture: where is the camera, and what can it see?' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 4.3, fontSize: 12,
      fileLabel: 'Add capture to VisionIOLimelightSim, below updateInputs',
      lines: [
        { text: '  /** What this camera would report with the robot standing at \'robot\'. */', color: '7FA8C9' },
        { text: '  private byte[] capture(Pose2d robot) {', color: 'FFD166' },
        { text: '    Pose3d camera = new Pose3d(robot).transformBy(m_robotToCamera);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '    List<Integer> tagIds = new ArrayList<>();', color: 'D7E3F4' },
        { text: '    double totalDistance = 0.0;', color: 'D7E3F4' },
        { text: '    for (FieldTag tag : VisionConstants.kTagLayout.getTags()) {', color: 'D7E3F4' },
        { text: '      Optional<Translation3d> seen = whereInView(camera, tag.getPose());', color: '9EF01A' },
        { text: '      if (seen.isPresent()) {', color: '9EF01A' },
        { text: '        tagIds.add(tag.getID());', color: 'D7E3F4' },
        { text: '        totalDistance += seen.get().getNorm();', color: '9EF01A' },
        { text: '      }', color: 'D7E3F4' },
        { text: '    }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.9, w: 11.9, h: 1.0,
      body: 'Lesson 7\'s coordinates in 3D: robot pose plus mount offset = where the camera is.',
      pad: 0.2,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 25, label: 'Limelight' });
    s.addNotes(
      'The first line starts from the robot\'s pose, applies the mount offset, and gets where the camera is on the field. Then it walks every tag on the field and asks one question of each: can the camera see it? The tags it can see go in the frame.'
    );
  }

  // ============================================================ SLIDE 26
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 8b · A new file', title: 'A perfect camera — on purpose' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.55, w: 11.9, h: 3.3, fontSize: 12,
      fileLabel: 'Add to capture, finishing the method',
      lines: [
        { text: '    if (tagIds.isEmpty()) {', color: 'D7E3F4' },
        { text: '      return LimelightFrame.noTargets(m_frameCount, kLatencyMs);', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '    // A perfect camera: it reports exactly where it\'s standing.', color: '7FA8C9' },
        { text: '    double avgDistance = totalDistance / tagIds.size();', color: 'D7E3F4' },
        { text: '    return LimelightFrame.withTargets(m_frameCount, robot, tagIds, avgDistance, kLatencyMs);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.05, w: 11.9, h: 1.85,
      body: 'A real camera scatters a little, more at a distance — which is why the trust formula exists. Leaving scatter out here is deliberate; Try It #3 shows why.',
      pad: 0.25,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 26, label: 'Limelight' });
    s.addNotes(
      'This camera reports exactly where it\'s standing, heading included — MegaTag2\'s heading was never the camera\'s opinion anyway. This lesson\'s simulator doesn\'t yet have what scatter needs to behave sensibly, and Try It #3 lets you find that out first-hand.'
    );
  }

  // ============================================================ SLIDE 27
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 8b · A new file', title: 'whereInView: an answer that might not exist' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 5.2, fontSize: 11,
      fileLabel: 'Add whereInView, the last method in the class',
      lines: [
        { text: '  /** Where \'tag\' sits relative to the camera — or empty, if the camera can\'t see it. */', color: '7FA8C9' },
        { text: '  private static Optional<Translation3d> whereInView(Pose3d camera, Pose3d tag) {', color: 'FFD166' },
        { text: '    Translation3d offset = tag.relativeTo(camera).getTranslation(); // +X straight out of the lens', color: '9EF01A' },
        { text: '    double yawDegrees = Math.toDegrees(Math.atan2(offset.getY(), offset.getX()));', color: 'D7E3F4' },
        { text: '    double pitchDegrees = Math.toDegrees(Math.atan2(offset.getZ(), offset.getX()));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '    boolean inFront = offset.getX() > 0;', color: 'D7E3F4' },
        { text: '    boolean inFrame = Math.abs(yawDegrees) <= VisionConstants.kSimHorizontalFovDegrees / 2', color: 'D7E3F4' },
        { text: '        && Math.abs(pitchDegrees) <= VisionConstants.kSimVerticalFovDegrees / 2;', color: 'D7E3F4' },
        { text: '    boolean closeEnough = offset.getNorm() <= VisionConstants.kSimMaxRangeMeters;', color: 'D7E3F4' },
        { text: '    boolean facingUs = camera.relativeTo(tag).getX() > 0; // a tag\'s +X points out of its printed face', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '    if (inFront && inFrame && closeEnough && facingUs) {', color: 'D7E3F4' },
        { text: '      return Optional.of(offset);', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '    return Optional.empty();', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });
    K.addFooter(s, { pageNum: 27, label: 'Limelight' });
    s.addNotes(
      'tag.relativeTo(camera) answers "where is the tag, measured from the camera?" in the camera\'s own coordinates — +X straight out of the lens, +Y left, +Z up. From there, everything is triangles. camera.relativeTo(tag) asks the reverse: where is the camera, measured from the tag? A tag\'s +X points out of its printed face, so a positive X means the camera is in front of it rather than behind the wall it\'s stuck to. It\'s private static because it never touches a field — the same reason Lesson 13\'s makeModule was static.'
    );
  }

  // ============================================================ SLIDE 28
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'puzzlepiece_white.png', eyebrow: 'Section 8b · Optional<T>', title: 'A box that holds a value — or holds nothing' });
    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Filling it', { x: 1.0, y: 2.1, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0 });
    s.addText('Optional.of(offset) when the tag is visible. Optional.empty() when it isn\'t — behind the camera, out of frame, too far, or facing away.', {
      x: 1.0, y: 2.8, w: 5.25, h: 3.35, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Opening it', { x: 7.05, y: 2.1, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0 });
    s.addText('seen.isPresent() asks "is there something in here?" and seen.get() takes it out. Call .get() on an empty one and the program crashes — which is the point.', {
      x: 7.05, y: 2.8, w: 5.25, h: 3.35, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
    K.addFooter(s, { pageNum: 28, label: 'Limelight', dark: true });
    s.addNotes(
      '"No answer" has to be a real, distinct result, not a fake Translation3d of zeros that some later line forgets to check for. Optional\'s type itself warns everyone who receives it to check. It turns "I forgot the tag might not be visible" from a quiet wrong number into a loud mistake you can\'t miss. This time you\'re on both ends of it: filling the box in whereInView and opening it in capture.'
    );
  }

  // ============================================================ SLIDE 29
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 9 · A new file', title: 'LimelightPoseProvider: own an IO, own a bundle' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.5, fontSize: 12,
      fileLabel: 'Create src/main/java/first/robot/subsystems/LimelightPoseProvider.java — fields and constructor',
      lines: [
        { text: '/** A vision camera, contributing whatever pose corrections its IO reported this tick. */', color: '7FA8C9' },
        { text: 'public class LimelightPoseProvider implements PoseProvider {', color: '9EF01A' },
        { text: '  private final VisionIO m_io;', color: 'D7E3F4' },
        { text: '  private final VisionIO.VisionIOInputs m_inputs = new VisionIO.VisionIOInputs();', color: 'D7E3F4' },
        { text: '  private final String m_logKey;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public LimelightPoseProvider(VisionIO io, String logKey) {', color: 'FFD166' },
        { text: '    m_io = io;', color: 'D7E3F4' },
        { text: '    m_logKey = logKey;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.8,
      body: 'The same shape SwerveModule has had since Lesson 13: own an IO, own an inputs bundle, read the bundle.',
      pad: 0.3,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 29, label: 'Limelight' });
    s.addNotes(
      'All the real work happened in VisionIO, so the provider itself is small. It also picks up one more job you\'ve seen before: choosing which IO to build. (The imports are in the lesson.)'
    );
  }

  // ============================================================ SLIDE 30
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 9 · A new file', title: 'Heading first, then read, log, and fuse with trust' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 5.1, fontSize: 12,
      fileLabel: 'Add to LimelightPoseProvider, below the constructor',
      lines: [
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {', color: 'FFD166' },
        { text: '    m_io.setRobotHeading(estimator.getEstimatedPosition().getRotation());', color: '9EF01A' },
        { text: '    m_io.updateInputs(m_inputs);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '    Pose2d[] poses = new Pose2d[m_inputs.poseObservations.length];', color: 'D7E3F4' },
        { text: '    for (int i = 0; i < poses.length; i++) {', color: 'D7E3F4' },
        { text: '      poses[i] = m_inputs.poseObservations[i].pose();', color: 'D7E3F4' },
        { text: '    }', color: 'D7E3F4' },
        { text: '    Telemetry.log(m_logKey + "/PoseObservations", poses, Pose2d.struct);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '    for (VisionIO.PoseObservation observation : m_inputs.poseObservations) {', color: 'D7E3F4' },
        { text: '      estimator.addVisionMeasurement(', color: 'D7E3F4' },
        { text: '          observation.pose(), observation.timestampSeconds(), observation.stdDevs());', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });
    K.addFooter(s, { pageNum: 30, label: 'Limelight' });
    s.addNotes(
      'updatePoseEstimate runs in a deliberate order. First it tells the camera which way the robot faces — MegaTag2 needs that before it can place the robot, and the estimator\'s heading is the best one on the robot. Then it reads, logs what the camera said, and only then feeds each observation into the estimator, trust and all. That third argument to addVisionMeasurement is the per-frame version of Lesson 14\'s trust knob. Notice there\'s no separate periodic() and setDesiredState(): a camera only reports. The heading it\'s handed isn\'t a target to chase — it\'s context for the report.'
    );
  }

  // ============================================================ SLIDE 31
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 9 · A new file', title: 'makeCamera: the same picking pattern as makeModule' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.75, fontSize: 12,
      fileLabel: 'Add to LimelightPoseProvider, closing out the class',
      lines: [
        { text: '  /** Picks each camera\'s real/sim/replay IO, the same way Drivetrain picks each module\'s. */', color: '7FA8C9' },
        { text: '  public static LimelightPoseProvider makeCamera(', color: 'FFD166' },
        { text: '      String name, Transform3d robotToCamera, Supplier<Pose2d> poseSupplier) {', color: 'D7E3F4' },
        { text: '    VisionIO io = switch (Constants.kCurrentMode) {', color: 'D7E3F4' },
        { text: '      case REAL -> new VisionIOLimelight(name, robotToCamera);', color: '9EF01A' },
        { text: '      case SIM -> new VisionIOLimelightSim(name, robotToCamera, poseSupplier);', color: '9EF01A' },
        { text: '      case REPLAY -> new VisionIO() {}; // nothing feeds this yet', color: '9EF01A' },
        { text: '    };', color: 'D7E3F4' },
        { text: '    return new LimelightPoseProvider(io, "Localizer/" + name);', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.35, w: 11.9, h: 1.55,
      body: 'Public, unlike Drivetrain\'s private makeModule — Robot calls it from outside. Only the SIM arm reads poseSupplier: a real camera knows where it is by looking.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 31, label: 'Limelight' });
    s.addNotes(
      'makeCamera is Drivetrain.makeModule with one difference: makeModule is private, because only Drivetrain ever calls it, while makeCamera is public, because Robot is about to call it from outside. A real camera knows where it is by looking; only the fake one needs to be told.'
    );
  }

  // ============================================================ SLIDE 32
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 10 · Robot.java', title: 'Two blank finals — assigned once the constructor runs' });
    K.addCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 1.0,
      bg: CARDBG,
      body: 'Delete VisionPoseProvider.java — LimelightPoseProvider replaces it.',
      pad: 0.2,
      bodySize: 20,
    });

    K.addCodeCard(s, {
      x: 0.7, y: 2.7, w: 11.9, h: 3.45, fontSize: 13,
      fileLabel: 'Replace Lesson 14\'s camera field in Robot with two blank finals',
      lines: [
        { text: 'public class Robot extends OpModeRobot {', color: 'FFD166' },
        { text: '  public final CommandGamepad driverController = new CommandGamepad(0);', color: 'D7E3F4' },
        { text: '  public final Drivetrain drivetrain = new Drivetrain();', color: 'D7E3F4' },
        { text: '  public final Localizer localizer = new Localizer(drivetrain);', color: 'D7E3F4' },
        { text: '  // Blank finals: building a camera needs localizer (for its pose supplier),', color: '7FA8C9' },
        { text: '  // so localizer has to be a finished object first. Assigned in the', color: '7FA8C9' },
        { text: '  // constructor body, below, which runs after every field initializer above.', color: '7FA8C9' },
        { text: '  public final LimelightPoseProvider frontCamera;', color: '9EF01A' },
        { text: '  public final LimelightPoseProvider backCamera;', color: '9EF01A' },
      ],
    });
    K.addFooter(s, { pageNum: 32, label: 'Limelight' });
    s.addNotes(
      'Localizer needs no changes at all — an entire IO layer, a vendor library, and a simulated camera just went into the project, and the class that fuses poses together never had to hear about any of it. Two cameras join Robot\'s fields as blank finals — final fields with no value on their declaration line. Java allows that as long as the constructor assigns each one exactly once, and the compiler checks that it does.'
    );
  }

  // ============================================================ SLIDE 33
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 10 · Robot.java', title: 'localizer::getPose — an already-built object' });
    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.5, fontSize: 11,
      fileLabel: 'In Robot\'s constructor, replace localizer.addProvider(camera); with this',
      lines: [
        { text: '  public Robot() {', color: 'FFD166' },
        { text: '    DataLogManager.start(); // saves every published value to a .wpilog file', color: 'D7E3F4' },
        { text: '    Scheduler.getDefault().addEventListener(this::logCommandStart);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '    frontCamera = LimelightPoseProvider.makeCamera(', color: '9EF01A' },
        { text: '        VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera, localizer::getPose);', color: 'D7E3F4' },
        { text: '    backCamera = LimelightPoseProvider.makeCamera(', color: '9EF01A' },
        { text: '        VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera, localizer::getPose);', color: 'D7E3F4' },
        { text: '    localizer.addProvider(frontCamera);', color: '9EF01A' },
        { text: '    localizer.addProvider(backCamera);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.8,
      heading: 'Fix Robot\'s imports',
      headingSize: 20,
      body: 'Remove the VisionPoseProvider import. Add VisionConstants and LimelightPoseProvider.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 33, label: 'Limelight' });
    s.addNotes(
      'localizer::getPose is a method reference — shorthand for () -> localizer.getPose(). Building the cameras in the constructor body, instead of in their own field initializers, is what makes it safe: every field initializer above has already run before the constructor\'s first line executes, so localizer is a finished object by the time anything points at it. The imports to add are first.robot.Constants.VisionConstants and first.robot.subsystems.LimelightPoseProvider.'
    );
  }

  // ============================================================ SLIDE 34
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 10 · RobotTeleop.java', title: 'No fake camera left, no fake sighting to trigger' });
    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.2,
      bg: CARDBG,
      heading: 'Delete the Start-button binding and the reportFakeSighting method from Lesson 14.',
      headingSize: 22,
      body: 'robot.camera doesn\'t exist anymore, because there\'s no fake camera left.',
      pad: 0.3,
      bodySize: 19,
    });
    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.1,
      bg: CARDBG,
      heading: 'Then delete the three imports only that method used.',
      headingSize: 22,
      body: 'Command, Pose2d, and Rotation2d.',
      pad: 0.3,
      bodySize: 19,
    });
    K.addFooter(s, { pageNum: 34, label: 'Limelight' });
    s.addNotes(
      'Both deletions are in RobotTeleop. After them, the project builds again with no fake vision anywhere in it.'
    );
  }

  // ============================================================ SLIDE 35
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 10 · Run it', title: 'Watch two cameras report' });
    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 1.0,
      steps: [
        { title: './gradlew simulateJava → RobotTeleop', detail: 'Watch Field next to Localizer/limelight-front/PoseObservations.' },
        { title: 'Nudge the robot off its (0, 0) start', detail: 'The front camera already sees two tags 4–6 m away.' },
        { title: 'Spin 180° in place', detail: 'The front camera goes quiet; the back camera takes over.' },
        { title: 'Drive to the nearer hub and turn near it', detail: 'Tags on all four sides — watch the cameras hand off.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.85, w: 11.9, h: 1.05,
      body: 'Each camera logs under its own name, through the exact same Localizer loop.',
      pad: 0.2,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 35, label: 'Limelight' });
    s.addNotes(
      'The robot starts at (0, 0), in the blue corner, facing down the field. The hub is the big structure in the middle of each half of the field, with tags on all four sides.'
    );
  }

  // ============================================================ SLIDE 36
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'heartbeat_white.png', eyebrow: 'Section 10 · Run it', title: 'Why nothing arrives until you move' });
    K.addCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.55,
      heading: 'The fake-value problem, inside a real library',
      headingSize: 20,
      body: 'Before you touch the stick, the front camera does see two tags — but it reports exactly (0, 0, 0°), and the library uses an all-zeros pose to mean "no answer." A genuine answer that equals the stand-in for "no answer" is indistinguishable from it.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 2.55,
      heading: 'The library keeps its own notes',
      headingSize: 20,
      body: 'Under limelight_telemetry/limelight-front/: a status string (OK, STALE, NO_DATA), and under MT2_WPIBLUE/ the poses it accepted and rejected, with rejectionReasons — which reads MISSING_POSE before you move.',
      pad: 0.25,
      bodySize: 18,
    });
    K.addFooter(s, { pageNum: 36, label: 'Limelight' });
    s.addNotes(
      'The library rejects every one of those start-up frames as a missing pose. That\'s the fake-value problem section 8 warned about, living inside a real library. A real robot never sits exactly on the field\'s corner, so this one only bites in simulation, and only until you move. OK means frames are arriving, STALE means they stopped, NO_DATA means no frame ever came. When a real camera misbehaves, the library\'s telemetry is the first place to look.'
    );
  }

  // ============================================================ SLIDE 37
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'exclamationtriangle_white.png', eyebrow: 'Section 10 · An honest limit', title: 'Confirmation, not rescue' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('This camera looks out from localizer::getPose — the very estimate vision is supposed to correct.', {
      x: 1.0, y: 2.1, w: 11.3, h: 1.2, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('So every frame reports "you\'re exactly where you think you are," and the estimate never needs to move.', {
      x: 1.0, y: 3.4, w: 11.3, h: 1.3, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('A real tag\'s position is real, whatever your code believes. Lesson 16 gives this simulator an independent truth of its own.', {
      x: 0.7, y: 5.1, w: 11.9, h: 1.3, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 37, label: 'Limelight', dark: true });
    s.addNotes(
      'Lesson 14\'s fake camera could pull a wrong pose toward (2, 5) dramatically, because it was an independent claim. This one can\'t. What you\'re watching is confirmation, not rescue. A real camera doesn\'t share this limit. Lesson 16 gives this simulator an independent truth, and one argument to makeCamera changes to use it.'
    );
  }

  // ============================================================ SLIDE 38
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it (1 of 2)' });

    K.addTryItGrid(s, {
      y: 1.75, cols: 2,
      cards: [
        { title: 'Add a third camera', body: 'A 45° corner mount: a name and Transform3d in VisionConstants, a blank final, makeCamera, addProvider. The sim needs no changes.', code: true },
        { title: 'Check the trust formula', body: 'Add avgTagDistanceMeters to the record, log it with tagCount() and stdDevs().get(0, 0), and check 0.3 × distance ÷ √tags.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 38, label: 'Limelight', dark: true });
    s.addNotes(
      'Third camera: nothing in VisionIOLimelightSim changes, because each camera publishes to its own topic, named after itself. Give it a new name — two cameras sharing one would publish over each other, on a real robot too. Trust formula: fill avgTagDistanceMeters from estimate.avgTagDistanceMeters in VisionIOLimelight. Adding a field to a record changes its constructor, so the compiler will point you at every call that needs updating. Then drive at a hub from far away and check a few readings by hand.'
    );
  }

  // ============================================================ SLIDE 39
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it (2 of 2)' });

    K.addTryItGrid(s, {
      y: 1.65, cols: 2, h: 2.4,
      cards: [
        { title: 'Give it a shaky hand', body: 'Add Random scatter, 1.5 cm per meter, park in view of tags, and watch Localizer/Pose. Why does it drift?', code: true },
        { title: 'Miscalibrate the mount', body: 'Add 0.3 m to kFrontRobotToCamera. Localizer/Pose doesn\'t shift — read capture to see why.', code: true },
        { title: 'The empty doorway, vision edition', body: 'Flip kSimMode to Mode.REPLAY. Both cameras build, but neither ever publishes a reading.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 39, label: 'Limelight', dark: true });
    s.addNotes(
      'Shaky hand: in one of this course\'s runs, the parked estimate drifted about 60 cm in 60 seconds with nothing moving. The camera looks out from the estimate itself, so each frame says "you\'re where you think you are, give or take a little," the estimate shifts by that little, and the next frame starts from the shifted spot. Nothing pulls it back, because nothing in this simulator knows where the robot really is. Take the scatter back out: a shaky camera needs a truth to be shaky around, and that\'s Lesson 16. Miscalibrated mount: the fake camera uses the mount only to decide which tags are visible, then reports the robot\'s position straight from where the robot is. A real Limelight turns what it sees back into a robot position through the mount you told it, so on a real robot this exact mistake would quietly offset every correction. Some bugs this simulator simply cannot show you, and knowing which ones is its own kind of expertise.'
    );
  }

  // ============================================================ SLIDE 40
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The Localizer proved its reason for existing' });

    const points = [
      'A real LimelightPoseProvider slots into Lesson 14\'s registry, and Localizer needed no changes to accept it.',
      'MegaTag2 borrows your heading; every frame brings its own trust and a delay-corrected timestamp.',
      'Fake at the boundary: the sim camera publishes the real message, so the real library runs on it.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 16', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Ground Truth', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Give the simulation a body — and something other than itself to check against.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 40, label: 'Limelight' });
    s.addNotes(
      'On the Java side, Optional gave "that tag isn\'t visible" an honest, checkable type, and this time you were on both ends of it. static finally got a name for something you\'ve typed since Lesson 1: one copy, owned by the class, like the single shared heading every Limelight on the robot reads. A blank final let Robot build its cameras after localizer existed, and a record bundled one frame\'s evidence into a single value. And you ran head-first into an honest limit: because the simulated camera looks out from the same estimate it then corrects, it can confirm a good pose but can\'t rescue a bad one, can\'t be given realistic scatter without drifting, and can\'t expose a miscalibrated mount. All three need an independent "where the robot actually is" to check against — that\'s the next lesson.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '15-limelight.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
