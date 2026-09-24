const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 14 — The Pose Estimator' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 14',
    title: 'The Pose Estimator',
    subtitle: 'A localizer fed by many sources',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Lesson 11\'s Try It had you drive a square and watch the reported pose come home slightly wrong — drift, and it\'s worth understanding why it\'s unfixable from the inside. This lesson moves pose tracking out of the drivetrain into its own localization class that fuses a pose estimator with any number of registered pose providers — the drivetrain\'s wheel odometry first, a camera second — and proves it works by injecting fake "camera sightings" and watching the pose snap back to truth.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Fuse odometry with corrections, in its own class' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Move pose tracking out of the drivetrain into a Localizer that fuses a pose estimator with any number of registered pose providers — wheel odometry first, a camera second.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.75;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'An interface for extensibility — many classes, one contract', options: { bullet: true, breakLine: true } },
        { text: 'A registry — a List you add sources to, then loop over', options: { bullet: true, breakLine: true } },
        { text: 'Timestamps — data that says when it was true', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('crosshairs_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Why dead reckoning drifts, and why no math fixes it', options: { bullet: true, breakLine: true } },
        { text: 'SwerveDrivePoseEstimator — odometry plus corrections', options: { bullet: true, breakLine: true } },
        { text: 'Localization pulled into its own class', options: { bullet: true, breakLine: true } },
        { text: 'addVisionMeasurement and measurement trust', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Pose Estimator' });
    s.addNotes(
      'Odometry adds up thousands of tiny measured steps, and every step carries a tiny error — addition never forgets. What fixes drift is an outside reference: something that occasionally says "actually, you are here," anchored to the world instead of your own history.'
    );
  }

  // ============================================================ SLIDE 3 — odometry lies, slowly (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'exclamationtriangle_white.png', eyebrow: 'Section 1 · Odometry lies, slowly', title: 'Addition never forgets' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('The wrong instinct is "better math will fix it." It won\'t.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('Odometry adds up thousands of tiny measured steps. Every step carries a tiny error — a wheel scrubbing in a turn, a bump, carpet flex — and the errors don\'t average out; they accumulate. The information is simply gone.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('What fixes drift is an outside reference: something that occasionally says "actually, you are here," anchored to the world instead of your own history. WPILib ships SwerveDrivePoseEstimator — odometry with a door for corrections.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Pose Estimator', dark: true });
    s.addNotes(
      'After a minute of hard driving, the pose can be off by half a meter, and nothing in the math can tell, because every individual step looked perfectly reasonable. Tracking position is about to stop being a wheels-only job and start being a fusion job — wheels, gyro, one camera, maybe three next season. That\'s a distinct responsibility, and it doesn\'t belong to the class whose job is spinning motors.'
    );
  }

  // ============================================================ SLIDE 4 — PoseProvider.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'puzzlepiece_white.png', eyebrow: 'Section 2 · A new file', title: 'PoseProvider — anything with evidence to contribute' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.5, fontSize: 15,
      fileLabel: 'Create src/main/java/first/robot/subsystems/PoseProvider.java — the whole file',
      lines: [
        { text: 'package first.robot.subsystems;', color: '7FD1D9' },
        { text: '', color: 'D7E3F4' },
        { text: 'public interface PoseProvider {', color: 'FFD166' },
        { text: '  /** Called every tick: fold whatever you know into the shared estimate. */', color: '7FA8C9' },
        { text: '  void updatePoseEstimate(SwerveDrivePoseEstimator estimator);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.1, w: 11.9, h: 2.9,
      heading: 'Notice what\'s missing compared to Lesson 13\'s ModuleIO/GyroIO: no default body.',
      headingSize: 20,
      body: 'Every provider genuinely has evidence to contribute — there\'s no "hardware that doesn\'t exist yet" case here. Wheel odometry calls the estimator\'s update(...); a camera calls addVisionMeasurement(...) — an interface is exactly how you let two unlike classes answer the same call in their own way.',
      bodySize: 17,
    });

    K.addFooter(s, { pageNum: 4, label: 'Pose Estimator' });
    s.addNotes(
      'One method, and it hands the provider the estimator to contribute to. Handing each provider the whole estimator is a small liberty (a camera could call update); the tradeoff buys a dead-simple contract, and we take it.'
    );
  }

  // ============================================================ SLIDE 5 — Localizer.java fields+constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 2 · A new file', title: 'Localizer: owns the estimator, keeps a list of providers' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Create src/main/java/first/robot/subsystems/Localizer.java — fields and constructor',
      lines: [
        { text: 'public class Localizer {', color: 'FFD166' },
        { text: '  private final Drivetrain m_drivetrain;', color: 'D7E3F4' },
        { text: '  private final SwerveDrivePoseEstimator m_estimator;', color: 'D7E3F4' },
        { text: '  private final List<PoseProvider> m_providers = new ArrayList<>();', color: '9EF01A' },
        { text: '  private final Field2d m_field = new Field2d();', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public Localizer(Drivetrain drivetrain) {', color: 'FFD166' },
        { text: '    m_drivetrain = drivetrain;', color: 'D7E3F4' },
        { text: '    m_estimator = new SwerveDrivePoseEstimator(', color: '9EF01A' },
        { text: '        drivetrain.getKinematics(), drivetrain.getRotation(),', color: '9EF01A' },
        { text: '        drivetrain.getModulePositions(), new Pose2d()); // start at (0,0,0°)', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '    addProvider(drivetrain); // the odometry backbone, registered first', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '    Telemetry.log("Field", m_field);', color: '9EF01A' },
        { text: '    Scheduler.getDefault().addPeriodic(this::periodic);', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 5, label: 'Pose Estimator' });
    s.addNotes(
      'The estimator is swerve-shaped at its core: it needs the drivetrain\'s kinematics and a first sample to start blending from. The drivetrain plays two roles here: it\'s the odometry backbone the estimator is literally built around, and it\'s the first registered provider, so its wheel-and-gyro update runs each tick through the very same loop every future camera will. Backbone and provider #0 at once.'
    );
  }

  // ============================================================ SLIDE 6 — Localizer.java addProvider+periodic+getPose+resetPose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'crosshairs_white.png', eyebrow: 'Section 2 · A new file', title: 'Walk the providers, publish the result' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 12,
      fileLabel: 'Add to Localizer, closing out the class',
      lines: [
        { text: '/** Register a source of pose information. */', color: '7FA8C9' },
        { text: 'public void addProvider(PoseProvider provider) {', color: 'FFD166' },
        { text: '  m_providers.add(provider);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'private void periodic() {', color: 'FFD166' },
        { text: '  for (PoseProvider provider : m_providers) {', color: '9EF01A' },
        { text: '    provider.updatePoseEstimate(m_estimator);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  Telemetry.log("Localizer/Pose", getPose(), Pose2d.struct);', color: '9EF01A' },
        { text: '  m_field.setRobotPose(getPose());', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public Pose2d getPose() {', color: 'FFD166' },
        { text: '  return m_estimator.getEstimatedPosition();', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Re-anchor the estimate — re-supplies the live gyro and wheel positions. */', color: '7FA8C9' },
        { text: 'public void resetPose(Pose2d pose) {', color: 'FFD166' },
        { text: '  m_estimator.resetPosition(', color: '9EF01A' },
        { text: '      m_drivetrain.getRotation(), m_drivetrain.getModulePositions(), pose);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Pose Estimator' });
    s.addNotes(
      'The periodic() method is the whole engine: walk the providers in registration order — odometry first, corrections after — letting each fold its evidence in, then publish the result. Nothing here drives a motor, so running it every tick (even while disabled) is exactly right: you want the pose to keep tracking if someone shoves the robot on the field.'
    );
  }

  // ============================================================ SLIDE 7 — why Localizer isn't a Mechanism (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 2 · A real design call', title: 'Localizer isn\'t a Mechanism, and that\'s deliberate' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('What does Mechanism actually buy a class?', { x: 1.0, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('Command-builder methods (run, runRepeatedly) so it can be required by a command, and an automatic idle() default command. Localizer needs neither.', {
      x: 1.0, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('It needs a heartbeat, and addPeriodic is the tool sized for that.', { x: 7.05, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('Drives no motors, so no command will ever .require() it, and there\'s no idle behavior to fall back to. Being a Mechanism is for classes the scheduler needs to run commands against.', {
      x: 7.05, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 7, label: 'Pose Estimator', dark: true });
    s.addNotes(
      'Every subsystem-shaped class written since Lesson 1 has extended Mechanism — Drivetrain still does, two sections from now — so this is worth asking about directly. Being a Mechanism is for classes the scheduler needs to run commands against; being ticked every frame is a smaller ask, and addPeriodic is the tool sized for it. Worth remembering the next time you write a class that needs to tick every frame but never needs to be .require()d by a command.'
    );
  }

  // ============================================================ SLIDE 8 — Drivetrain imports + class line
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'The class line grows a promise' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.9, fontSize: 16,
      fileLabel: "Add to Drivetrain's imports, and let the class line grow a promise",
      lines: [
        { text: 'import org.wpilib.math.estimator.SwerveDrivePoseEstimator;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public class Drivetrain implements Mechanism, PoseProvider {', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.05, w: 11.9, h: 2.7,
      body: 'SwerveDriveKinematics and SwerveModulePosition are already imported from earlier lessons; PoseProvider is in the same package, so it needs no import.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 8, label: 'Pose Estimator' });
    s.addNotes(
      'The drivetrain already knows everything odometry needs; now it just has to expose it and answer the PoseProvider call.'
    );
  }

  // ============================================================ SLIDE 9 — delete pose machinery
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'All of it moves to Localizer' });

    K.addCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 2.35, bg: CARDBG,
      heading: 'Delete the pose machinery that used to live here.',
      headingSize: 21,
      body: 'The m_odometry field, the Field2d/m_field, and the Telemetry.log call that published Drivetrain/Pose — all of it moves to Localizer, which publishes the fused result as Localizer/Pose instead.',
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.05, w: 11.9, h: 2.65, fontSize: 13,
      fileLabel: 'Delete from logTelemetry(), at the bottom',
      lines: [
        { text: '// DELETE — odometry lives on Localizer now.', color: 'FF8B8B' },
        { text: 'Pose2d pose = m_odometry.update(', color: 'FF6B6B' },
        { text: '    Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());', color: 'FF6B6B' },
        { text: 'Telemetry.log("Drivetrain/Pose", pose, Pose2d.struct);', color: 'FF6B6B' },
        { text: 'm_field.setRobotPose(pose);', color: 'FF6B6B' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Pose Estimator' });
    s.addNotes(
      'This is a real deletion, not a rename — everything the old odometry block did now happens inside Localizer\'s periodic() instead.'
    );
  }

  // ============================================================ SLIDE 10 — three getters + updatePoseEstimate
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'Three getters, and the provider method' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 13,
      fileLabel: 'Add to Drivetrain in its place',
      lines: [
        { text: 'public SwerveDriveKinematics getKinematics() {', color: 'FFD166' },
        { text: '  return m_kinematics;', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Heading as a Rotation2d — what the estimator speaks. */', color: '7FA8C9' },
        { text: 'public Rotation2d getRotation() {', color: 'FFD166' },
        { text: '  return Rotation2d.fromDegrees(getHeadingDegrees());', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Snapshot the four modules\' positions into one array — for odometry. */', color: '7FA8C9' },
        { text: 'public SwerveModulePosition[] getModulePositions() {', color: 'FFD166' },
        { text: '  SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];', color: 'D7E3F4' },
        { text: '  for (int i = 0; i < m_modules.length; i++) {', color: 'D7E3F4' },
        { text: '    positions[i] = m_modules[i].getPosition();', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  return positions;', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 10, label: 'Pose Estimator' });
    s.addNotes(
      'getModulePositions() replaces the private modulePositions() written in Lesson 11 — same body, now public, because Localizer needs to call it too.'
    );
  }

  // ============================================================ SLIDE 11 — updatePoseEstimate
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'As a PoseProvider, the drivetrain contributes odometry' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.0, fontSize: 15,
      fileLabel: 'Add to Drivetrain, right after the getters',
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {', color: 'D7E3F4' },
        { text: '  estimator.update(getRotation(), getModulePositions());', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.9, w: 11.9, h: 3.05,
      heading: 'A subtle ordering requirement.',
      headingSize: 21,
      body: 'updatePoseEstimate reads the gyro and module input bundles, which Drivetrain\'s own logTelemetry() refreshes each tick. For the odometry update to use fresh numbers, Drivetrain\'s periodic callback must run before Localizer\'s — it does, because Scheduler.addPeriodic runs callbacks in registration order. Declare the fields in that order in Robot.java and you never have to think about it again.',
      bodySize: 18,
    });

    K.addFooter(s, { pageNum: 11, label: 'Pose Estimator' });
    s.addNotes(
      'Each class registers its own periodic callback in its own constructor, so as long as drivetrain is built (and therefore registers) before localizer is, the dependency takes care of itself.'
    );
  }

  // ============================================================ SLIDE 12 — driveToPose signature change
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'The pose lives somewhere new — ask for it instead of owning it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.9, fontSize: 12,
      fileLabel: "Change driveToPose's signature to take the pose as a supplier, and swap every getPose() inside it for pose.get()",
      lines: [
        { text: '/** Drive straight toward \'target\' using P control, field-relative. Finishes within 5 cm. */', color: '7FA8C9' },
        { text: 'public Command driveToPose(Pose2d target, Supplier<Pose2d> pose) {', color: 'FFD166' },
        { text: '  double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond);', color: 'D7E3F4' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '        Pose2d current = pose.get(); // ...same body as Lesson 11 otherwise...', color: '9EF01A' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities()))', color: 'D7E3F4' },
        { text: '      .until(() -> pose.get().minus(target).getTranslation().getNorm() < 0.05)', color: '9EF01A' },
        { text: '      .named("Drive To Pose");', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.9, w: 11.9, h: 2.0,
      body: 'No new import needed — Drivetrain.java already imports java.util.function.Supplier for drive/driveFieldRelative. A future caller hands it the localizer\'s getter: driveToPose(target, () -> robot.localizer.getPose()).',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 12, label: 'Pose Estimator' });
    s.addNotes(
      'One method used to ask the drivetrain for its own pose — Lesson 11\'s driveToPose sketch. driveToPose stays unbound to any button for now, exactly as it was in Lesson 11 — this lesson only fixes where its pose comes from.'
    );
  }

  // ============================================================ SLIDE 13 — addVisionMeasurement example
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 4 · The door: a vision provider', title: 'A pose, and when it was true' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.35, fontSize: 20,
      fileLabel: "Nothing to add yet — this is just how it's called, inside the provider you're about to write",
      example: true,
      lines: [
        { text: 'estimator.addVisionMeasurement(visionPose, timestampSeconds);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.5, w: 11.9, h: 3.4,
      heading: 'timestampSeconds says WHEN that claim was true.',
      headingSize: 22,
      body: 'By the time a camera has captured a frame, found an AprilTag, and done the geometry, tens of milliseconds have passed, and the robot has moved. The estimator keeps a short history, rewinds to the timestamp, blends the correction in where it belongs, and replays its own updates forward.',
    });

    K.addFooter(s, { pageNum: 13, label: 'Pose Estimator' });
    s.addNotes(
      'visionPose is an absolute claim: "a camera computed that the robot is at this field position." Data that knows its own age is what makes fusing a slow sensor with a fast one possible — remember that; it\'s everywhere in robotics.'
    );
  }

  // ============================================================ SLIDE 14 — VisionPoseProvider.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 4 · A new file', title: 'A stand-in camera: holds a pending sighting until the next tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 12,
      fileLabel: 'Create src/main/java/first/robot/subsystems/VisionPoseProvider.java — the whole file',
      lines: [
        { text: 'public class VisionPoseProvider implements PoseProvider {', color: 'FFD166' },
        { text: '  private Pose2d m_pending = null;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Pretend a camera just saw the robot here. A real camera calls this on each frame. */', color: '7FA8C9' },
        { text: '  public void reportSighting(Pose2d pose) {', color: 'FFD166' },
        { text: '    m_pending = pose;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {', color: 'D7E3F4' },
        { text: '    if (m_pending != null) {', color: '9EF01A' },
        { text: '      estimator.addVisionMeasurement(m_pending, Timer.getTimestamp());', color: '9EF01A' },
        { text: '      Telemetry.log("Localizer/VisionPose", m_pending, Pose2d.struct);', color: '9EF01A' },
        { text: '      m_pending = null;', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 14, label: 'Pose Estimator' });
    s.addNotes(
      'Timer.getTimestamp() is the robot\'s clock, in seconds. "Now" is the honest timestamp for a zero-latency fake; a real vision system hands you the capture time instead. Look at what Localizer never had to learn: it loops PoseProviders and calls updatePoseEstimate. It has no idea one of them is a camera. Add a real vision provider next season and Localizer doesn\'t change by a line.'
    );
  }

  // ============================================================ SLIDE 15 — Robot fields
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 5 · Robot.java', title: 'Order matters: drivetrain, then localizer, then camera' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.7, fontSize: 14,
      fileLabel: 'Add to Robot, with the other fields',
      lines: [
        { text: 'public final Drivetrain drivetrain = new Drivetrain();', color: 'D7E3F4' },
        { text: '// Localizer reads the drivetrain\'s kinematics/rotation/module positions at', color: '7FA8C9' },
        { text: '// construction, so drivetrain must be built first — it already is, above.', color: '7FA8C9' },
        { text: 'public final Localizer localizer = new Localizer(drivetrain);', color: '9EF01A' },
        { text: 'public final VisionPoseProvider camera = new VisionPoseProvider();', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.85, w: 11.9, h: 2.0,
      body: 'Three fields on Robot — drivetrain, localizer, camera, in that order so the drivetrain ticks first — with the camera registered as a second provider next.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 15, label: 'Pose Estimator' });
    s.addNotes(
      'Order matters here for the same reason it did on the getters/updatePoseEstimate slide: field initializers run top to bottom, and each class registers its own periodic callback in its own constructor.'
    );
  }

  // ============================================================ SLIDE 16 — Robot constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 5 · Robot.java', title: 'Register the camera as a second provider' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.35, fontSize: 15,
      fileLabel: "Add to Robot's constructor",
      lines: [
        { text: 'public Robot() {', color: 'FFD166' },
        { text: '  DataLogManager.start();', color: 'D7E3F4' },
        { text: '  Scheduler.getDefault().addEventListener(this::logCommandStart);', color: 'D7E3F4' },
        { text: '  localizer.addProvider(camera); // the second provider — vision', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 16, label: 'Pose Estimator' });
    s.addNotes(
      'One more registration line, the same addProvider call the drivetrain used automatically inside Localizer\'s own constructor — this time from the outside, because the camera is built after Localizer already exists.'
    );
  }

  // ============================================================ SLIDE 17 — RobotTeleop fake sighting button
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 5 · RobotTeleop.java', title: 'A button that pretends a camera just saw us' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.4, fontSize: 14,
      fileLabel: "Add a button that fires a fake sighting, to RobotTeleop's constructor",
      lines: [
        { text: '// Pretend a camera just saw us at (2, 5) facing 90°.', color: '7FA8C9' },
        { text: 'robot.driverController.start().onTrue(reportFakeSighting(robot));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'private static Command reportFakeSighting(Robot robot) {', color: 'FFD166' },
        { text: '  return Command.noRequirements(coroutine ->', color: 'D7E3F4' },
        { text: '          robot.camera.reportSighting(new Pose2d(2.0, 5.0, Rotation2d.fromDegrees(90))))', color: '9EF01A' },
        { text: '      .named("Report Fake Sighting");', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 1.85,
      body: 'The coroutine body has no coroutine.yield() in it at all, so it runs once and the command is done on the very same tick — the same one-shot shape Lesson 9\'s Autos used.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 17, label: 'Pose Estimator' });
    s.addNotes(
      'The Start button is the little one near the middle of the gamepad — face buttons are precious, fake cameras are not — and Command.noRequirements is right because reporting a sighting isn\'t driving: it claims no mechanism and interrupts nothing.'
    );
  }

  // ============================================================ SLIDE 18 — trust knob (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'syncalt_white.png', eyebrow: 'The trust knob', title: 'A press nudges the estimate; it doesn\'t overwrite it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.35, fontSize: 16,
      fileLabel: 'Nothing to add — one line in Localizer, if you want to adjust the defaults',
      example: true,
      lines: [
        { text: 'm_estimator.setVisionMeasurementStdDevs(VecBuilder.fill(0.5, 0.5, 999999));', color: '9EF01A' },
      ],
    });

    s.addShape('roundRect', { x: 0.7, y: 3.5, w: 11.9, h: 3.35, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Smaller numbers mean "trust this more."', { x: 1.0, y: 3.75, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, margin: 0 });
    s.addText('That line reads as "trust vision\'s x and y to about half a meter, and ignore its heading entirely" — a common real-robot choice, since the gyro\'s heading is usually better than a camera\'s. Press Start once, watch the robot slide toward (2, 5) — not a teleport, a real pull. Press it again and it slides a little further; a real camera reports dozens of times a second, so in practice the pull looks instantaneous.', {
      x: 1.0, y: 4.4, w: 11.3, h: 2.3, fontFace: FONT_BODY, fontSize: 19, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 18, label: 'Pose Estimator', dark: true });
    s.addNotes(
      'How hard a measurement pulls is set by its standard deviations. Tuning trust is a deep art; knowing the knob exists is enough for today. That division of labor — odometry for smoothness, vision for truth — is modern FRC localization in one sentence.'
    );
  }

  // ============================================================ SLIDE 19 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Drift, then correct', body: 'Resurrect Lesson 13\'s 1.1 slip multiplier, drive a lap, then press Start a few times. Watch the lie get pulled back.', code: true },
        { title: 'A second camera', body: 'Register a second VisionPoseProvider on another button. Nothing in Localizer changes — just addProvider again.', code: true },
        { title: 'Feed it garbage', body: 'Report an absurd sighting like (15, 1, 0°) and press Start repeatedly. The estimate lurches toward a place the robot never was.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 19, label: 'Pose Estimator', dark: true });
    s.addNotes(
      'All three Try Its involve real code: re-adding the fake wheel-slip multiplier, wiring up and binding a second VisionPoseProvider, and reporting a deliberately bad sighting. The moral of the third: the estimator believes what you feed it, weighted by the trust knob — real vision code filters before it feeds, rejecting sightings too far from the current estimate to be plausible.'
    );
  }

  // ============================================================ SLIDE 20 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Localization pulled into its own class' });

    const points = [
      'Dead reckoning drifts because addition never forgets — the cure is an outside reference, fused through a Localizer.',
      'PoseProvider is the star: odometry and vision are wildly different sources, but behind one contract they\'re interchangeable.',
      'Localizer isn\'t a Mechanism — it needs a heartbeat, not the full command-and-requirement machinery.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 15', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Real Vision: Limelight', { x: 8.3, y: 3.1, w: 4.0, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    s.addText('Replace the fake button-press camera with a real one, reading actual AprilTags.', {
      x: 8.3, y: 4.1, w: 4.0, h: 1.4, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 20, label: 'Pose Estimator' });
    s.addNotes(
      'Fourteen lessons ago, printing a line of text was an achievement. Now there\'s a field-relative swerve robot with firmware closed-loop control, organized telemetry, and a self-correcting pose fused from pluggable sources — and every piece of it is something you typed and can explain. One provider in that fusion is still pretend, though — VisionPoseProvider only reports what a button tells it to. Watch how much of Localizer would have to change to accept the real thing. (Spoiler: none.)'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '14-pose-estimator.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
