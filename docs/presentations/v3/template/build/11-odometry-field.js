const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 11 — Odometry & Field View' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 11',
    title: 'Odometry & Field View',
    subtitle: 'Track where the robot is, and watch it drive on a real field',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Right now the logs report a heading and each module\'s distance — useful scalars, but none of them alone says the robot is at (2.3 m, 1.1 m) facing 35 degrees. That\'s a pose, and this lesson builds the machinery that tracks one: combining wheel motion with gyro heading, the same dead-reckoning trick sailors used long before GPS.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Know the robot\'s pose, and draw it on a field' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.55, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Track the robot\'s pose — x, y, heading — by combining the gyro and how far each wheel has rolled. Then log it and watch the robot drive around a real field in AdvantageScope.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.25, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Small data-carrier types (SwerveModulePosition, Pose2d)', options: { bullet: true, breakLine: true } },
        { text: 'Building an array in a loop — the full pattern', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.15 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('mapmarker_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Odometry — dead-reckoning the pose', options: { bullet: true, breakLine: true } },
        { text: 'SwerveModulePosition and SwerveDriveOdometry', options: { bullet: true, breakLine: true } },
        { text: 'Logging a Pose2d, and Field2d in SimGUI', options: { bullet: true, breakLine: true } },
        { text: '.until(...) — finish a command early', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Odometry & Field' });
    s.addNotes(
      'SwerveDriveOdometry combines wheel motion (how far each wheel rolled and in which direction) with gyro heading, integrates the change every tick, and answers getPose() any time you ask. Knowing a pose unlocks field-relative visualizations, autos that say "drive to (5, 3)" instead of "drive forward 2 m," and — a future lesson — fusing odometry with camera measurements.'
    );
  }

  // ============================================================ SLIDE 3 — why odometry (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 1 · Why odometry?', title: 'Dead reckoning, sampled fifty times a second' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Sailors called it dead reckoning.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('No GPS, but if you know your heading and how far you\'ve traveled each hour, you can plot your position on the chart. SwerveDriveOdometry combines wheel motion with gyro heading, integrates the change every tick, and answers getPose() any time you ask.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addText('A scalar like getHeadingDegrees() can\'t tell you the robot is at (2.3 m, 1.1 m) facing 35° — that\'s a pose, and knowing it is what unlocks field views, "drive to (5, 3)" autos, and vision fusion.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Odometry & Field', dark: true });
    s.addNotes(
      'Right now the logs tell you getHeadingDegrees() and each module\'s getDistanceMeters() — useful, but each is a scalar. Knowing a pose unlocks field-relative visualizations (watch the robot move on a field), auto routines that say "drive to (5, 3)" instead of "drive forward 2 m," and vision fusion, a future lesson\'s job.'
    );
  }

  // ============================================================ SLIDE 4 — SwerveModule.getPosition()
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · SwerveModule.java', title: 'Bundle distance and angle into one report' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.6, fontSize: 15,
      fileLabel: 'Add to SwerveModule, with the other public methods',
      lines: [
        { text: '/** How far this wheel has rolled and where it\'s pointing — for odometry. */', color: '7FA8C9' },
        { text: 'public SwerveModulePosition getPosition() {', color: 'FFD166' },
        { text: '  return new SwerveModulePosition(', color: 'D7E3F4' },
        { text: '      getDistanceMeters(), Rotation2d.fromDegrees(getSteerAngleDegrees()));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.85,
      heading: 'A lightweight data carrier — no behavior, just two values riding together.',
      headingSize: 22,
      body: 'You\'ve now met the whole family: ChassisVelocities, SwerveModuleVelocity, and now SwerveModulePosition. A named type in a signature says meters and an angle, in that order — bare doubles say nothing and let you swap them silently.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Odometry & Field' });
    s.addNotes(
      'Odometry needs a SwerveModulePosition per corner: the wheel\'s accumulated distance and its current steer angle. Both halves are question-methods already in hand — getDistanceMeters() and getSteerAngleDegrees() — this just bundles them. By now the pattern behind these little named types should be visible: WPILib bundles related numbers into one type so a signature can\'t be silently misread the way two bare doubles could.'
    );
  }

  // ============================================================ SLIDE 5 — m_odometry field
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'Odometry needs everything above it to exist first' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.9, fontSize: 14,
      fileLabel: 'Add to Drivetrain, below m_gyro',
      lines: [
        { text: '// Odometry reads the kinematics, the gyro, and the modules\' starting', color: '7FA8C9' },
        { text: '// positions — everything above this line has to exist first.', color: '7FA8C9' },
        { text: 'private final SwerveDriveOdometry m_odometry = new SwerveDriveOdometry(', color: 'FFD166' },
        { text: '    m_kinematics,', color: '9EF01A' },
        { text: '    Rotation2d.fromDegrees(getHeadingDegrees()),', color: '9EF01A' },
        { text: '    modulePositions());', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 2.0,
      body: 'modulePositions() doesn\'t exist yet — that\'s the next slide. Odometry needs the kinematics you built in Lesson 10, the current heading, and each module\'s starting position, so the field goes below m_gyro: dependencies first, same ordering rule as always.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: 'Odometry & Field' });
    s.addNotes(
      'Odometry needs the kinematics you built in Lesson 10, the current heading, and the initial wheel positions. The field goes below m_gyro because its construction reads all three — same ordering rule as always: dependencies first.'
    );
  }

  // ============================================================ SLIDE 6 — modulePositions() + getPose()
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'Building an array in a loop' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.35, w: 11.9, h: 4.5, fontSize: 13,
      fileLabel: 'Add to Drivetrain — a private helper, and the public getter that uses it',
      lines: [
        { text: '/** Snapshot the four modules\' positions into one array — used by odometry. */', color: '7FA8C9' },
        { text: 'private SwerveModulePosition[] modulePositions() {', color: 'FFD166' },
        { text: '  SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];', color: '9EF01A' },
        { text: '  for (int i = 0; i < m_modules.length; i++) {', color: 'D7E3F4' },
        { text: '    positions[i] = m_modules[i].getPosition();', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  return positions;', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Where odometry currently believes the robot is. */', color: '7FA8C9' },
        { text: 'public Pose2d getPose() {', color: 'FFD166' },
        { text: '  return m_odometry.getPose();', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.0, w: 11.9, h: 0.95,
      body: 'Allocate the slots, loop, fill, hand it off — the same shape as Lesson 7\'s logTelemetry(), reused because odometry needs a fresh snapshot more than once.',
      pad: 0.15, bodySize: 16,
    });

    K.addFooter(s, { pageNum: 6, label: 'Odometry & Field' });
    s.addNotes(
      'modulePositions() builds an array in a loop: new SwerveModulePosition[m_modules.length] allocates the empty slots, the loop fills each one, and the method hands back the finished array. Sizing it with m_modules.length instead of a literal 4 means one less place to fix if the module count ever changes. Reach for this shape any time a library wants an array whose contents change every tick.'
    );
  }

  // ============================================================ SLIDE 7 — logTelemetry gets the odometry update
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'Feed odometry every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.35, fontSize: 15,
      fileLabel: "Add to Drivetrain.logTelemetry(), after the heading log",
      lines: [
        { text: 'private void logTelemetry() {', color: 'FFD166' },
        { text: '  // ...distance and heading logs stay...', color: '7FA8C9' },
        { text: '  Pose2d pose = m_odometry.update(', color: '9EF01A' },
        { text: '      Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions());', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.7,
      heading: 'There\'s no separate periodic() to hook here.',
      headingSize: 22,
      body: 'Mechanism doesn\'t have one — that\'s exactly why logTelemetry() exists as a periodic callback in the first place. update(newHeading, newPositions) integrates the change since the last call AND hands back the fresh pose — one call does both jobs, which is why there\'s no separate getPose() call right here.',
    });

    K.addFooter(s, { pageNum: 7, label: 'Odometry & Field' });
    s.addNotes(
      'Odometry needs feeding every tick, same as everything else logTelemetry() already does. That\'s the whole loop: update(newHeading, newPositions) integrates the change since the last call and hands back the fresh pose — one call does both jobs, which is why you don\'t see a separate getPose() call right here.'
    );
  }

  // ============================================================ SLIDE 8 — m_posePublisher + logTelemetry publish line
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'broadcasttower_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Publish the pose, the same shape as every structured value' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.0, fontSize: 13,
      fileLabel: 'Add to Drivetrain, alongside the other structured-telemetry publishers',
      lines: [
        { text: 'private final StructPublisher<Pose2d> m_posePublisher =', color: 'D7E3F4' },
        { text: '    NetworkTableInstance.getDefault()', color: 'D7E3F4' },
        { text: '        .getStructTopic("Drivetrain/Pose", Pose2d.struct)', color: '9EF01A' },
        { text: '        .publish();', color: 'D7E3F4' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.8, w: 11.9, h: 1.4, fontSize: 16,
      fileLabel: 'Add to Drivetrain.logTelemetry(), right after the odometry update',
      lines: [
        { text: 'm_posePublisher.set(pose);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.6,
      body: 'Pose2d is a structured value, like the module states from Lesson 7 — and AdvantageScope knows how to draw a logged pose, not just plot it.',
      pad: 0.2, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 8, label: 'Odometry & Field' });
    s.addNotes(
      'Here\'s where the logging discipline kept since Lesson 3 pays off in full. Drawing the robot on a field takes exactly one more publisher, the same shape as every structured value since Lesson 7. Pose2d is a structured value — and AdvantageScope knows how to draw a logged pose, not just plot it.'
    );
  }

  // ============================================================ SLIDE 9 — AdvantageScope steps
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 4 · Watch it in AdvantageScope', title: 'Driving in the sim officially looks like a game' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.05, dark: true,
      steps: [
        { title: 'File → Connect to Simulator', detail: 'Run ./gradlew simulateJava first.' },
        { title: 'Add an 📐 Odometry tab, drag Drivetrain/Pose onto it', detail: 'From the sidebar tree.' },
        { title: 'Pick a field image from the source dropdown', detail: 'The current game\'s field.' },
        { title: 'Drive with the joysticks', detail: 'The little robot moves and rotates on the field.' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Odometry & Field', dark: true });
    s.addNotes(
      'If everything is wired right, driving forward moves the robot along +X, strafing slides it along +Y, and spinning rotates it — the coordinate convention memorized in Lesson 7, now visible as motion on a map. Take a lap.'
    );
  }

  // ============================================================ SLIDE 10 — Field2d field + constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'thlarge_white.png', eyebrow: 'Section 4 · The same view inside SimGUI', title: 'Field2d — a dashboard widget, not a value' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 1.15, fontSize: 17,
      fileLabel: 'Add to Drivetrain, alongside the other fields',
      lines: [
        { text: 'private final Field2d m_field = new Field2d();', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.0, w: 11.9, h: 2.0, fontSize: 15,
      fileLabel: 'Add to Drivetrain\'s constructor, alongside the periodic registration from Lesson 7',
      lines: [
        { text: 'public Drivetrain() {', color: 'FFD166' },
        { text: '  SmartDashboard.putData("Field", m_field);', color: '9EF01A' },
        { text: '  Scheduler.getDefault().addPeriodic(this::logTelemetry);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.25, w: 11.9, h: 1.75,
      body: 'putData publishes a widget — a thing dashboards know how to draw — a different job from the per-value putNumber spam sworn off in Lesson 3. This is the one place this course touches SmartDashboard directly.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 10, label: 'Odometry & Field' });
    s.addNotes(
      'AdvantageScope is the full-featured viewer, but sometimes you just want the field right inside the sim window — no second tool. WPILib\'s Field2d is a dashboard widget that does exactly that. The distinction matters: putData publishes a widget, a different job from the per-value putNumber spam sworn off in Lesson 3.'
    );
  }

  // ============================================================ SLIDE 11 — logTelemetry gets setRobotPose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'thlarge_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Same pose, two viewers' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.6, fontSize: 17,
      fileLabel: "Add to Drivetrain.logTelemetry(), right after the pose publish",
      lines: [
        { text: 'm_field.setRobotPose(pose);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.65, w: 11.9, h: 3.3,
      heading: 'Field for the quick glance, AdvantageScope for everything else.',
      headingSize: 22,
      body: 'In SimGUI: menu NetworkTables → SmartDashboard → Field opens a top-down field pane right in the sim window, robot moving as you drive. Field2d for the quick glance while sim is already open; the logged Pose2d for AdvantageScope\'s field images, replays, and everything else.',
    });

    K.addFooter(s, { pageNum: 11, label: 'Odometry & Field' });
    s.addNotes(
      'Now in SimGUI: menu NetworkTables → SmartDashboard → Field, and a top-down field pane opens right in the sim window, robot moving as you drive. Same pose, two viewers: Field2d for the quick glance while sim is already open, the logged Pose2d for AdvantageScope\'s field images, replays, and everything else.'
    );
  }

  // ============================================================ SLIDE 12 — resetPose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compressarrowsalt_white.png', eyebrow: 'Section 5 · Drivetrain.java', title: 'Autos usually start from a known place' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.4, fontSize: 15,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: '/** Tell odometry the robot is actually at \'pose\' right now. */', color: '7FA8C9' },
        { text: 'public void resetPose(Pose2d pose) {', color: 'FFD166' },
        { text: '  m_odometry.resetPosition(', color: 'D7E3F4' },
        { text: '      Rotation2d.fromDegrees(getHeadingDegrees()), modulePositions(), pose);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.8,
      heading: 'modulePositions()\'s second job — build-in-a-loop paying rent twice in one lesson.',
      headingSize: 21,
      body: 'Call resetPose at the top of an auto factory so odometry starts at, say, new Pose2d(2, 5, Rotation2d.fromDegrees(0)). Everything the auto reports from then on is anchored to that origin.',
    });

    K.addFooter(s, { pageNum: 12, label: 'Odometry & Field' });
    s.addNotes(
      'Call resetPose at the top of an auto factory so odometry starts at a known place. Everything the auto reports from then on is anchored to that origin.'
    );
  }

  // ============================================================ SLIDE 13 — driveToPose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 6 · Drivetrain.java', title: 'Three P controllers stacked: x, y, heading' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 5.3, fontSize: 11,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: '/** Drive straight toward \'target\' using P control, field-relative. Finishes within 5 cm. */', color: '7FA8C9' },
        { text: 'public Command driveToPose(Pose2d target) {', color: 'FFD166' },
        { text: '  double maxMps = DriveConstants.kMaxSpeed.in(MetersPerSecond); // convert once, reuse', color: 'D7E3F4' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '        Pose2d current = getPose();', color: 'D7E3F4' },
        { text: '        double dx = target.getX() - current.getX();', color: 'D7E3F4' },
        { text: '        double dy = target.getY() - current.getY();', color: 'D7E3F4' },
        { text: '        double vx = clamp(1.5 * dx, -maxMps, maxMps);', color: '9EF01A' },
        { text: '        double vy = clamp(1.5 * dy, -maxMps, maxMps);', color: '9EF01A' },
        { text: '        double omega = clamp(', color: '9EF01A' },
        { text: '            3.0 * target.getRotation().minus(current.getRotation()).getRadians(),', color: '9EF01A' },
        { text: '            -Math.PI, Math.PI);', color: '9EF01A' },
        { text: '        ChassisVelocities fieldSpeeds = new ChassisVelocities(vx, vy, omega);', color: 'D7E3F4' },
        { text: '        applyChassisSpeeds(fieldSpeeds.toRobotRelative(current.getRotation()));', color: 'D7E3F4' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> applyChassisSpeeds(new ChassisVelocities()))', color: '9EF01A' },
        { text: '      .until(() -> getPose().minus(target).getTranslation().getNorm() < 0.05)', color: '9EF01A' },
        { text: '      .named("Drive To Pose");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: 'Odometry & Field' });
    s.addNotes(
      'Squint at it and you\'ll see three copies of Lesson 5 stacked up — one P controller for x, one for y, one for heading, each doing measure-subtract-multiply-clamp, with applyChassisSpeeds as the shared "command" step. kMaxSpeed is unpacked to a double once with .in(MetersPerSecond) before the lambda — same convert-once habit as the joystick bindings. The 1.5/3.0 gains are inlined because this is a sketch; if it graduates into a real robot they belong in Constants.java. The heading term needs no wrap helper — Rotation2d.minus already returns the shortest angle — and there\'s no MathUtil.clamp to reach for here either, that\'s still Drivetrain\'s own private clamp from Lesson 5. vx/vy are computed straight from field-frame position error, so they\'re field-relative speeds — the same shape driveFieldRelative builds from joystick input in Lesson 10, and fieldSpeeds.toRobotRelative(...) is the identical conversion, just fed by a P controller instead of a stick.'
    );
  }

  // ============================================================ SLIDE 14 — .until() explained (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'flagcheckered_white.png', eyebrow: 'Section 6 · .until(...) is new', title: 'One cleanup path covers every way it can end' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('It ends the command by interrupting it.', { x: 1.0, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('After each tick, the scheduler checks the condition and stops the command the moment it\'s true — not the same as a coroutine body running out of lines the way driveDistance\'s while loop does in Lesson 6.', {
      x: 1.0, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('.whenCanceled(...) fires every time — reached target or not.', { x: 7.05, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('Simpler than Lesson 6\'s two separate cleanup paths: one cleanup here covers both "got there" and "got interrupted," because as far as the scheduler\'s concerned, both endings are the same kind of ending.', {
      x: 7.05, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 14, label: 'Odometry & Field', dark: true });
    s.addNotes(
      '.until(...) is new, and it\'s worth being precise about what it does. Called on a builder stage — before .named(...) — it wraps the command so that, after each tick, the scheduler checks the condition and stops the command the moment it\'s true. It\'s not the same as a command finishing its own coroutine body naturally the way driveDistance\'s while loop does in Lesson 6 — under the hood, .until(...) ends the command by interrupting it, which means .whenCanceled(...) fires every time .until(...) stops it, reached-target or not. That\'s simpler than driveDistance\'s two separate cleanup paths back in Lesson 6.'
    );
  }

  // ============================================================ SLIDE 15 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Reset the pose from a button', body: 'resetPose(new Pose2d()) and confirm the robot on the field jumps back to (0, 0, 0°).', code: true },
        { title: 'Drive a square, watch drift', body: 'Forward, strafe, back, strafe, try to end exactly where you started. That accumulating error is why teams add vision.' },
        { title: 'Watch Rotation2d do the wrap', body: 'Point near -170°, target +170°. The logged error should read about -20°, not +340° — minus always takes the short way.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 15, label: 'Odometry & Field', dark: true });
    s.addNotes(
      'Resetting the pose at the start of teleop from a button is a small real edit — a binding calling robot.drivetrain.resetPose(new Pose2d()). Driving a square is a pure observation exercise: watch how far off the field view says you are after trying to return to the start — that accumulating error is drift, and it\'s why teams add vision. The Rotation2d wrap exercise asks students to log driveToPose\'s heading term and prove Rotation2d.minus always hands back the shortest turn, never the long way around — point the robot near -170°, target +170°, and the logged error should read about -20°.'
    );
  }

  // ============================================================ SLIDE 16 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The robot finally knows where it is' });

    const points = [
      'SwerveModulePosition per corner, integrated by SwerveDriveOdometry into a running Pose2d.',
      'Building an array in a loop: allocate, fill, hand it off — modulePositions() reused it three times.',
      'The deeper pattern: everything in this course has been measure-subtract-multiply-clamp-command wearing different sensors.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 12', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Model-Based Control', { x: 8.3, y: 3.1, w: 4.0, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    s.addText('Move the control loops onto the motor controllers themselves.', {
      x: 8.3, y: 4.1, w: 4.0, h: 1.4, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 16, label: 'Odometry & Field' });
    s.addNotes(
      'Odometry closed the last gap between "the robot can move" and "the robot knows where it is." The Java pattern to keep is building an array in a loop — modulePositions() reused it three times over in this lesson alone. You also picked up .until(...), with a genuinely simpler cleanup story than Lesson 6\'s driveDistance needed. The robot is now complete, but the programming has one more act: control loops are still 50 Hz software P, log files can only be watched, and the pose you just built drifts. Lesson 12 moves control into the motor controllers themselves.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '11-odometry-field.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
