const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 16 — Ground Truth: Give the Simulation a Body' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 16',
    title: 'Ground Truth: Give the Simulation a Body',
    subtitle: 'One shared chassis, grip-limited acceleration, and a second truth to check against',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Every pose this course has drawn has been odometry\'s own estimate, checked against nothing but itself. Today the simulation gets a real chassis body — mass-equivalent grip, a real acceleration limit, a heading tracked once instead of trusted from four separate encoders — and for the first time there\'s a second, independent truth to compare the estimate against.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'The Goal', title: 'One shared chassis, instead of four lonely motors' });

    s.addShape('roundRect', { x: 0.7, y: 1.7, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Replace four drive motors that don\'t know about each other with one shared chassis body, moving under a grip-limited acceleration instead of teleporting to whatever speed was commanded — and use it to check odometry against something other than itself for the first time.',
      { x: 1.05, y: 1.83, w: 11.2, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 18, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.6;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      'None this lesson. Every tool below — private helper methods, a shared static field, if/else if/else — is one you already have. The new ideas are all about the robot, not the language.',
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, italic: true, fontSize: 18, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.25 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('weight_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Ground truth — a second, independent "where"', options: { bullet: true, breakLine: true } },
        { text: 'Friction-limited acceleration: a = μg', options: { bullet: true, breakLine: true } },
        { text: 'MathUtil.slewRateLimit — bounding a 2D magnitude', options: { bullet: true, breakLine: true } },
        { text: 'Twist2d.exp() — exact pose integration', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Ground Truth' });
    s.addNotes(
      'No new Java syntax this lesson — the new ideas are all about the robot, not the language.'
    );
  }

  // ============================================================ SLIDE 3 — four motors in an empty universe (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addHeader(s, { icon: 'exclamationtriangle_white.png', eyebrow: 'Section 1 · The picture worth correcting', title: 'Your simulation does not model your robot', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.9, w: 11.9, h: 2.4, bg: NAVY2,
      heading: 'It models eight motors, each in its own private universe',
      headingColor: WHITE, headingSize: 22,
      body: 'Four drive motors and four steering motors, each spinning a small flywheel, each unaware anything else exists. Module 0 has never once known module 1 is bolted to the same frame. The chassis has no mass. The tires have no grip.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.5, w: 11.9, h: 2.4, bg: NAVY2,
      heading: 'You\'ve gotten away with it — until now',
      headingColor: WHITE, headingSize: 22,
      body: 'Every wheel spins exactly as fast as it\'s told, so odometry has never once been wrong in simulation — just a precise record of what the motors did, with nothing independent to compare it to.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 3, label: 'Ground Truth', dark: true });
    s.addNotes(
      'Lesson 15\'s Try It asked you to multiply robotToCamera\'s offset on purpose and notice the sim couldn\'t show you the consequence, because there was no independent truth to check against. Today that changes: one shared chassis gets a body, and for the first time the number your odometry reports is no longer the only version of events. The best part is what doesn\'t change: SwerveModule, ModuleIOTalonFX, ModuleIOSim, Localizer, every command, every log key from Lessons 13-15 stay untouched — this all happens in one new class and two small edits, the IO layer from Lesson 13 doing exactly the job it was built for.'
    );
  }

  // ============================================================ SLIDE 4 — a = μg (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addHeader(s, { icon: 'weight_white.png', eyebrow: 'Section 2 · The physics in one line', title: 'Grip decides the limit — mass cancels right out', badgeColor: ORANGE });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 1.9, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText(
      [
        { text: 'F = μmg', options: { breakLine: true } },
        { text: 'a = F / m', options: { breakLine: true } },
        { text: 'a = μg', options: { breakLine: false, bold: true, color: ORANGE } },
      ],
      { x: 1.0, y: 2.05, w: 11.3, h: 1.55, fontFace: K.FONT_CODE, fontSize: 26, color: WHITE, valign: 'middle', align: 'center', margin: 0, lineSpacingMultiple: 1.3 }
    );

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 2.8, bg: NAVY2,
      heading: 'The mass cancels — a heavier robot isn\'t slower to accelerate',
      headingColor: WHITE, headingSize: 21,
      body: 'The force a tire can supply before skidding is μmg — grip times mass times gravity. Divide by mass for acceleration and the mass drops out entirely: a = μg. That\'s exactly why real FRC robots don\'t scale wheel count or tire pressure down just because they\'re light. Grip alone decides how hard you can accelerate.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 4, label: 'Ground Truth', dark: true });
    s.addNotes(
      'Worth sitting with because the answer is smaller than it looks — mass cancels, provided the heavier robot has proportionally more grip to move that weight.'
    );
  }

  // ============================================================ SLIDE 5 — DriveConstants additions
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 2 · Constants.java', title: 'Grip, acceleration limits, and a starting pose' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.25, fontSize: 13,
      fileLabel: 'Add to DriveConstants in Constants.java',
      lines: [
        { text: '// How hard the tires can grip, in sim — a Colson-wheel-on-carpet guess.', color: '7FA8C9' },
        { text: 'public static final double kWheelCoF = 1.2;', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '// a = μg — how hard the chassis can actually accelerate, independent', color: '7FA8C9' },
        { text: '// of mass, because a heavier robot needs proportionally more force to', color: '7FA8C9' },
        { text: '// move and proportionally more grip to supply it.', color: '7FA8C9' },
        { text: 'public static final double kMaxAccelMps2 = kWheelCoF * 9.81;', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '// The same grip limit, applied at each wheel\'s distance from center.', color: '7FA8C9' },
        { text: 'public static final double kMaxAngularAccelRadPerSec2 =', color: '9EF01A' },
        { text: '    kMaxAccelMps2 / Math.hypot(kHalfLength, kHalfWidth);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Where the simulated robot is placed on the field at startup. */', color: '7FA8C9' },
        { text: 'public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());', color: '9EF01A' },
      ],
    });

    K.addFooter(s, { pageNum: 5, label: 'Ground Truth' });
    s.addNotes(
      'kMaxAngularAccelRadPerSec2 reuses the same idea sideways: a wheel turning the chassis in place traces a circle of radius Math.hypot(kHalfLength, kHalfWidth) — the corner-to-center distance you\'ve had since Lesson 7 — bound by the same μg limit. Add import org.wpilib.math.geometry.Pose2d and import org.wpilib.math.geometry.Rotation2d to Constants.java — the first time this file has needed either.'
    );
  }

  // ============================================================ SLIDE 6 — ChassisSimulation piece 1
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 3 · A new file', title: 'ChassisSimulation — state and construction' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 4.5, fontSize: 13,
      fileLabel: 'Create src/main/java/first/robot/subsystems/ChassisSimulation.java — piece 1',
      lines: [
        { text: 'package first.robot.subsystems;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'import org.wpilib.math.geometry.Pose2d;', color: 'D7E3F4' },
        { text: 'import org.wpilib.math.geometry.Translation2d;', color: 'D7E3F4' },
        { text: 'import org.wpilib.math.kinematics.ChassisVelocities;', color: 'D7E3F4' },
        { text: 'import org.wpilib.math.util.MathUtil;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'import first.robot.Constants.DriveConstants;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public class ChassisSimulation {', color: 'FFD166' },
        { text: '  private Pose2d m_pose;', color: '9EF01A' },
        { text: '  private ChassisVelocities m_velocity = new ChassisVelocities();', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  public ChassisSimulation(Pose2d startingPose) {', color: 'FFD166' },
        { text: '    m_pose = startingPose;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Ground Truth' });
    s.addNotes(
      'Two fields, and notice what\'s not here: no per-wheel state at all. This class doesn\'t know or care how the chassis is being driven — only what velocity it\'s chasing and where that velocity has carried it. Ground truth — the Drivetrain\'s own estimate is still built from wheel encoders alone, and the two can disagree exactly the way they would on a real robot.'
    );
  }

  // ============================================================ SLIDE 7 — ChassisSimulation piece 2 (update)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 3 · A new file', title: 'ChassisSimulation — one tick, chasing the commanded speed' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.3, fontSize: 13,
      fileLabel: 'Add to ChassisSimulation — piece 2',
      lines: [
        { text: '/** Advance the chassis by one tick, chasing \'commanded\' as hard as grip allows. */', color: '7FA8C9' },
        { text: 'public void update(ChassisVelocities commanded, double dtSeconds) {', color: 'FFD166' },
        { text: '  Translation2d nextVelocityXY = MathUtil.slewRateLimit(', color: '9EF01A' },
        { text: '      new Translation2d(m_velocity.vx, m_velocity.vy),', color: '9EF01A' },
        { text: '      new Translation2d(commanded.vx, commanded.vy),', color: '9EF01A' },
        { text: '      DriveConstants.kMaxAccelMps2,', color: '9EF01A' },
        { text: '      dtSeconds);', color: '9EF01A' },
        { text: '  double omega = chaseOmega(m_velocity.omega, commanded.omega, dtSeconds);', color: '9EF01A' },
        { text: '  m_velocity = new ChassisVelocities(nextVelocityXY.getX(), nextVelocityXY.getY(), omega);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Exact integration: how far a constant twist carries the chassis,', color: '7FA8C9' },
        { text: '  // curved turns included, not just a straight-line approximation.', color: '7FA8C9' },
        { text: '  m_pose = m_pose.plus(m_velocity.toTwist2d(dtSeconds).exp());', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 7, label: 'Ground Truth' });
    s.addNotes(
      'MathUtil.slewRateLimit(current, target, maxRate, dt) moves current toward target, never faster than maxRate per second.'
    );
  }

  // ============================================================ SLIDE 8 — Translation2d-as-velocity concept
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addHeader(s, { icon: 'compressarrowsalt_white.png', eyebrow: 'Section 3 · Reading the code', title: 'A vector rate limit, not two separate ones', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.9, w: 11.9, h: 2.5, bg: NAVY2,
      heading: 'Handing it a Translation2d instead of a bare number is the whole trick',
      headingColor: WHITE, headingSize: 21,
      body: 'vx and vy don\'t get clamped separately — they\'re bundled into one 2D vector and rate-limited as a magnitude, so a diagonal acceleration is limited by the same grip a straight-line one is, not double-counted on each axis.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.6, w: 11.9, h: 2.2, bg: NAVY2,
      heading: 'A geometry type, repurposed to hold a velocity',
      headingColor: WHITE, headingSize: 21,
      body: 'Translation2d is just an (x, y) pair. Nothing stops you from repurposing it to hold a velocity instead of a position — this is a legitimate use of one.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 8, label: 'Ground Truth', dark: true });
    s.addNotes(
      'omega has no vector to join, so it gets a small helper of its own — the scalar sibling of slewRateLimit, written by hand because the library only ships the vector version.'
    );
  }

  // ============================================================ SLIDE 9 — ChassisSimulation piece 3 (chaseOmega + getPose)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 3 · A new file', title: 'ChassisSimulation — chaseOmega, and a getter' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 4.6, fontSize: 12,
      fileLabel: 'Add to ChassisSimulation — piece 3, closing out the class',
      lines: [
        { text: '/** Move \'current\' toward \'target\', never faster than the grip-limited angular rate. */', color: '7FA8C9' },
        { text: 'private double chaseOmega(double current, double target, double dtSeconds) {', color: 'FFD166' },
        { text: '  double maxStep = DriveConstants.kMaxAngularAccelRadPerSec2 * dtSeconds;', color: '9EF01A' },
        { text: '  double error = target - current;', color: '9EF01A' },
        { text: '  if (error > maxStep) {', color: '9EF01A' },
        { text: '    return current + maxStep;', color: '9EF01A' },
        { text: '  } else if (error < -maxStep) {', color: '9EF01A' },
        { text: '    return current - maxStep;', color: '9EF01A' },
        { text: '  } else {', color: '9EF01A' },
        { text: '    return target;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public Pose2d getPose() {', color: 'FFD166' },
        { text: '  return m_pose;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Ground Truth' });
    s.addNotes(
      'Read that as the scalar sibling of slewRateLimit — same idea, one number instead of two.'
    );
  }

  // ============================================================ SLIDE 10 — Twist2d.exp() concept
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 3 · Reading the code', title: 'Twist2d.exp() — the same math odometry runs internally', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.8, w: 11.9, h: 2.3, bg: NAVY2,
      heading: 'toTwist2d(dt) — "this velocity, held for this long"',
      headingColor: WHITE, headingSize: 21,
      body: 'm_velocity.toTwist2d(dtSeconds) turns a velocity into a Twist2d — how far the chassis moved in that instant, exactly the small nudge SwerveDriveOdometry computes every tick from your wheel encoders.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.25, w: 11.9, h: 2.7, bg: NAVY2,
      heading: 'exp() turns that nudge into a curve, not a straight line',
      headingColor: WHITE, headingSize: 21,
      body: 'Twist2d.exp() accounts for the curve a turning chassis actually traces, and Pose2d.plus(Transform2d) composes it onto where the chassis already was — precisely what SwerveDriveOdometry.update(...) does under the hood, written out instead of hidden behind a library call.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 10, label: 'Ground Truth', dark: true });
    s.addNotes(
      'You\'re not approximating anything here — this is exact pose integration, curved turns included.'
    );
  }

  // ============================================================ SLIDE 11 — Drivetrain field + builder
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'One shared chassis, null on a real robot' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.5, fontSize: 13,
      fileLabel: 'Add to Drivetrain, above the m_gyroIO field',
      lines: [
        { text: '// The chassis\'s ground truth in the physics world — one, shared, null on', color: '7FA8C9' },
        { text: '// a real robot (which already has a world) and in replay (which needs none).', color: '7FA8C9' },
        { text: 'private static final ChassisSimulation m_chassisSim = createChassisSim();', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.15, w: 11.9, h: 2.55, fontSize: 13,
      fileLabel: 'Add the builder, next to makeModule',
      lines: [
        { text: '/** Builds the shared chassis ground truth. Sim only — null everywhere else. */', color: '7FA8C9' },
        { text: 'private static ChassisSimulation createChassisSim() {', color: 'FFD166' },
        { text: '  if (Constants.kCurrentMode != Constants.Mode.SIM) {', color: '9EF01A' },
        { text: '    return null; // a real robot already has a world; replay doesn\'t need one', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  return new ChassisSimulation(DriveConstants.kSimStartingPose);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'Ground Truth' });
    s.addNotes(
      'ChassisSimulation needs exactly one home: shared by every module (they\'re all bolted to the same frame), null on a real robot and in replay — the same shape Lesson 13\'s ModuleIO/GyroIO switch expressions already taught you to reach for.'
    );
  }

  // ============================================================ SLIDE 12 — applyChassisSpeeds feed + delete fake gyro line
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Feed it from the one place that computes chassis speed' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.85, fontSize: 14,
      fileLabel: 'Add to the end of applyChassisSpeeds',
      lines: [
        { text: 'if (m_chassisSim != null) {', color: '9EF01A' },
        { text: '  m_chassisSim.update(speeds, 0.020);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.55, w: 11.9, h: 1.5, fontSize: 14,
      fileLabel: 'DELETE from inside applyChassisSpeeds',
      lines: [
        { text: '// nothing integrates a commanded rate by hand anymore; the shared', color: 'FF8B8B' },
        { text: '// chassis tracks heading itself now.', color: 'FF8B8B' },
        { text: 'm_gyroIO.setSimRotationRate(speeds.omega / (2 * Math.PI));', color: 'FF6B6B' },
      ],
    });

    K.addFooter(s, { pageNum: 12, label: 'Ground Truth' });
    s.addNotes(
      'applyChassisSpeeds already computes the one number that matters — the ChassisVelocities every drive command is asking for — so that\'s exactly where the chassis sim\'s own tick belongs.'
    );
  }

  // ============================================================ SLIDE 13 — delete driveDistance twin + getSimulatedPose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Delete the twin, then expose the truth' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.2, fontSize: 14,
      fileLabel: 'DELETE from driveDistance, where it zeroed the rate',
      lines: [
        { text: 'm_gyroIO.setSimRotationRate(0.0);', color: 'FF6B6B' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 2.85, w: 11.9, h: 1.8, fontSize: 14,
      fileLabel: 'Add next to getHeadingDegrees()',
      lines: [
        { text: '/** Where the chassis really is, ground truth — null outside sim. */', color: '7FA8C9' },
        { text: 'public Pose2d getSimulatedPose() {', color: 'FFD166' },
        { text: '  return m_chassisSim != null ? m_chassisSim.getPose() : null;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.9, w: 11.9, h: 1.9,
      body: 'Two small deletions and one getter close out Drivetrain\'s side of the wiring — the rest of the file, and Lesson 15\'s cameras, can now reach ground truth directly.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 13, label: 'Ground Truth' });
    s.addNotes(
      'Finally, expose the truth so the rest of the file — and Lesson 15\'s cameras — can reach it.'
    );
  }

  // ============================================================ SLIDE 14 — GyroIOSim.java full replacement
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 5 · A rewritten file', title: 'The gyro stops pretending, and just reads the truth' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 4.7, fontSize: 14,
      fileLabel: 'Replace the whole contents of GyroIOSim.java',
      lines: [
        { text: 'package first.robot.subsystems;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Reports the heading of the real simulated chassis — no integration of its own. */', color: '7FA8C9' },
        { text: 'public class GyroIOSim implements GyroIO {', color: 'FFD166' },
        { text: '  private final ChassisSimulation m_chassisSim;', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  public GyroIOSim(ChassisSimulation chassisSim) {', color: 'FFD166' },
        { text: '    m_chassisSim = chassisSim;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updateInputs(GyroIOInputs inputs) {', color: 'D7E3F4' },
        { text: '    inputs.yawDegrees = m_chassisSim.getPose().getRotation().getDegrees();', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 14, label: 'Ground Truth' });
    s.addNotes(
      'Lesson 8 gave you a fake gyro that integrated the rotation rate you commanded — add omega × dt every tick and call it a heading. It was a reasonable lie with a tell: a robot commanded to spin always spun exactly as asked, with no acceleration limit slowing it down. The chassis sim you just built already tracks heading properly, grip limit and all — the gyro should just read it.'
    );
  }

  // ============================================================ SLIDE 15 — delete setSimRotationRate + edit gyro switch
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 5 · GyroIO.java + Drivetrain.java', title: 'A dead method, deleted — and the gyro gets its chassis' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.5, fontSize: 14,
      fileLabel: 'DELETE from the GyroIO interface',
      lines: [
        { text: '// nothing integrates a commanded rate anymore; the shared chassis', color: 'FF8B8B' },
        { text: '// tracks rotation and the gyro just reports it.', color: 'FF8B8B' },
        { text: 'public default void setSimRotationRate(double omegaRevPerSec) {}', color: 'FF6B6B' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.15, w: 11.9, h: 2.55, fontSize: 14,
      fileLabel: 'Edit the gyro switch in Drivetrain',
      lines: [
        { text: 'private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {', color: 'FFD166' },
        { text: '  case REAL -> new GyroIOPigeon2();', color: 'D7E3F4' },
        { text: '  case SIM -> new GyroIOSim(m_chassisSim);', color: '9EF01A' },
        { text: '  case REPLAY -> new GyroIO() {}; // inputs come from the log', color: 'D7E3F4' },
        { text: '};', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 15, label: 'Ground Truth' });
    s.addNotes(
      'That deletion has a tail, and it\'s the good kind: nothing anywhere calls setSimRotationRate anymore, so the method itself is dead.'
    );
  }

  // ============================================================ SLIDE 16 — field ordering concept
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addHeader(s, { icon: 'sitemap_white.png', eyebrow: 'Section 5 · Why the order matters', title: 'Field initializers run top to bottom', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 2.0, w: 11.9, h: 3.5, bg: NAVY2,
      heading: 'This is exactly why m_chassisSim had to come first',
      headingColor: WHITE, headingSize: 22,
      body: 'GyroIOSim\'s constructor needs a chassis that already exists. Because m_chassisSim was declared above m_gyroIO back in section 4, it\'s already built by the time the gyro field\'s initializer runs — the same ordering discipline Lesson 14 taught you with m_drivetrain before m_localizer.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });

    K.addFooter(s, { pageNum: 16, label: 'Ground Truth', dark: true });
    s.addNotes(
      'Field declaration order isn\'t cosmetic — it\'s the sequence Java actually runs the initializers in.'
    );
  }

  // ============================================================ SLIDE 17 — publisher + log line
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'broadcasttower_white.png', eyebrow: 'Section 6 · Drivetrain.java', title: 'Publish the truth, alongside the estimate' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.0, fontSize: 14,
      fileLabel: 'Add a publisher next to m_headingPublisher',
      lines: [
        { text: 'private final StructPublisher<Pose2d> m_simulatedPosePublisher =', color: 'D7E3F4' },
        { text: '    NetworkTableInstance.getDefault()', color: '9EF01A' },
        { text: '        .getStructTopic("Drivetrain/SimulatedPose", Pose2d.struct)', color: '9EF01A' },
        { text: '        .publish();', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.65, w: 11.9, h: 1.95, fontSize: 14,
      fileLabel: 'Log it at the end of logTelemetry()',
      lines: [
        { text: 'if (m_chassisSim != null) {', color: '9EF01A' },
        { text: '  m_simulatedPosePublisher.set(m_chassisSim.getPose());', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 17, label: 'Ground Truth' });
    s.addNotes(
      'Every pose this course has drawn has been an estimate. That\'s no longer true — the chassis sim tracks where the chassis actually is, independent of what any wheel reports, and it\'s been running since section 4.'
    );
  }

  // ============================================================ SLIDE 18 — watch it drift
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'history_white.png', eyebrow: 'Section 6 · Drift you didn\'t have to fake', title: 'Drive hard, and watch the two poses separate' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.0,
      steps: [
        { title: 'AdvantageScope → Odometry tab', detail: 'Put both Localizer/Pose and Drivetrain/SimulatedPose on the field at once.' },
        { title: 'Drive gently', detail: 'The two poses sit right on top of each other.' },
        { title: 'Drive like you mean it', detail: 'Full stick from a stop, a hard reversal, a fast spin — watch them separate.' },
        { title: 'The estimate creeps ahead, and stays there', detail: 'Nothing resets it — addition never forgets.' },
      ],
    });

    K.addFooter(s, { pageNum: 18, label: 'Ground Truth' });
    s.addNotes(
      'The wheel motors respond to a velocity command quickly (Lesson 12\'s firmware loop doing its job); the chassis is limited by the same grip you just gave it a number for. When you ask for more than the tires could really deliver, the wheels report motion that never fully became chassis motion, odometry counts every rotation as if it had, and the estimate creeps ahead of the truth — precisely the argument Lesson 14 opened with, except this time you\'re watching it happen instead of taking its word.'
    );
  }

  // ============================================================ SLIDE 19 — swap camera suppliers
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 7 · Robot.java', title: 'Closing the loop: vision checks itself against truth' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.0, fontSize: 14,
      fileLabel: "Change both camera suppliers in Robot's constructor",
      lines: [
        { text: 'frontCamera = PhotonVisionPoseProvider.makeCamera(', color: '9EF01A' },
        { text: '    VisionConstants.kFrontCameraName, VisionConstants.kFrontRobotToCamera,', color: '9EF01A' },
        { text: '    drivetrain::getSimulatedPose);', color: '9EF01A' },
        { text: 'backCamera = PhotonVisionPoseProvider.makeCamera(', color: '9EF01A' },
        { text: '    VisionConstants.kBackCameraName, VisionConstants.kBackRobotToCamera,', color: '9EF01A' },
        { text: '    drivetrain::getSimulatedPose);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.75, w: 11.9, h: 2.05,
      body: 'That\'s the whole fix — drivetrain::getSimulatedPose in place of localizer::getPose. The simulated camera now renders from where the chassis actually is, so a correction it computes pulls the estimate toward something real, not toward itself.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 19, label: 'Ground Truth' });
    s.addNotes(
      'Lesson 15 admitted a compromise: VisionIOPhotonVisionSim rendered what the simulated camera saw from Localizer::getPose() — the very estimate vision was supposed to correct — because no independent truth existed yet. One does now, and the fix is a one-line swap.'
    );
  }

  // ============================================================ SLIDE 20 — resetPose to starting pose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 7 · Robot.java', title: 'One loose end: tell the estimate where it started' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 2.0, fontSize: 14,
      fileLabel: "Add to Robot's constructor, after the cameras are registered",
      lines: [
        { text: '// The simulated chassis starts at kSimStartingPose; tell the estimate', color: '7FA8C9' },
        { text: '// where that is instead of guessing from (0, 0, 0°).', color: '7FA8C9' },
        { text: 'if (Constants.kCurrentMode == Constants.Mode.SIM) {', color: '9EF01A' },
        { text: '  localizer.resetPose(DriveConstants.kSimStartingPose);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.75, w: 11.9, h: 2.8,
      body: 'The chassis sim starts at kSimStartingPose, but Localizer still starts at (0, 0, 0°), because odometry has no idea where it was switched on. Left alone, you\'d watch two robots in different places and doubt your own code.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 20, label: 'Ground Truth' });
    s.addNotes(
      'A one-time correction, guarded by SIM, so a real robot\'s boot-time pose is left exactly as it was.'
    );
  }

  // ============================================================ SLIDE 21 — run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Run it', title: 'Feel the grip limit, then watch vision pull the estimate home' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: './gradlew simulateJava → RobotTeleop', detail: 'Push the stick to full — the robot ramps up, the way a real chassis with real tires does.' },
        { title: 'Let go of the stick', detail: 'It coasts back down instead of stopping dead.' },
        { title: 'Drive hard enough to separate the two poses', detail: 'The way section 6 showed you, then park somewhere a tag is visible.' },
        { title: 'Watch Localizer/Pose get pulled back', detail: 'Toward Drivetrain/SimulatedPose — odometry for smoothness, vision for truth.' },
      ],
    });

    K.addFooter(s, { pageNum: 21, label: 'Ground Truth' });
    s.addNotes(
      'For the first time, a truth to compare against instead of a guess checking itself.'
    );
  }

  // ============================================================ SLIDE 22 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.7, cols: 1, h: 1.45,
      cards: [
        { title: 'Make the tires slicker', body: 'Drop kWheelCoF to 0.4 and repeat hard driving. The estimate should peel away from ground truth far faster. Put it back — and if Lesson 13\'s Try It left a fake 1.1 wheel-slip multiplier in ModuleIOTalonFX, delete it now.', code: true },
        { title: 'Feel the limit in a spin, not just a line', body: 'Command a fast turnToHeading from a stop and compare Drivetrain/Gyro/YawDegrees against how fast the raw commanded rate would have turned the robot with nothing limiting it.' },
        { title: 'Push the estimate somewhere wrong on purpose', body: 'Call m_localizer.resetPose(...) from a temporary button binding, half a meter off from the chassis sim, then park where a tag is visible. Watch the estimate get pulled back — toward the truth this time.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 22, label: 'Ground Truth', dark: true });
    s.addNotes(
      'Item 2 is an observe-and-compare exercise — no code changes, just watching the gyro visibly lag the instant command, something Lesson 8\'s fake gyro could never have shown you because it had no concept of "too fast to actually achieve." Items 1 and 3 both involve real code edits.'
    );
  }

  // ============================================================ SLIDE 23 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The simulation finally has a body' });

    const points = [
      'One shared chassis, moving under a μg acceleration limit instead of teleporting to whatever speed was commanded, replaced four drive motors that never knew about each other — and because the limit comes from grip alone, mass canceled right out of the formula.',
      'MathUtil.slewRateLimit on a Translation2d limited acceleration as a true 2D magnitude, and Twist2d.exp() gave you exact pose integration — the same math SwerveDriveOdometry has been running for you since Lesson 11, written out by hand this time.',
      'What\'s actually worth stopping on: an entire ground-truth chassis went into the project, and SwerveModule never heard about it — Lesson 13\'s IO-layer boundary made ground truth cheap.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 18, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 18', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Scoring Elevator', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('The first mechanism whose whole job is holding a position against gravity.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 23, label: 'Ground Truth' });
    s.addNotes(
      'And Lesson 15\'s admitted compromise is gone. Vision checks its simulated eyesight against where the chassis actually is now, not against its own guess — the same one-line supplier swap you\'d make to point a real camera at a real robot\'s real position, because that\'s what a real camera was doing all along.'
    );
  }

  const outPath = path.join(__dirname, '..', '..', '16-ground-truth.pptx');
  return p.writeFile({ fileName: outPath }).then(() => {
    console.log('Wrote', outPath);
  });
}

buildDeck().catch((err) => {
  console.error(err);
  process.exit(1);
});
