const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 7 — Four Modules' });

  K.addTitleSlide(p, {
    tag: 'LESSON 7',
    title: 'Four Modules',
    subtitle: 'Build the real four-corner chassis',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'One module becomes four, moving together' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.55, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Rename DriveModule to SwerveModule, put four in an array, and command them together: translate (slide) and rotate (spin in place).',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.25, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Arrays: SwerveModule[]', options: { bullet: true, breakLine: true } },
        { text: 'The enhanced for loop', options: { bullet: true, breakLine: true } },
        { text: 'Constructor parameters that vary per instance', options: { bullet: true, breakLine: true } },
        { text: 'Translation2d, a library helper', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('thlarge_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'The four corners of a swerve chassis', options: { bullet: true, breakLine: true } },
        { text: 'A helper class vs. a mechanism', options: { bullet: true, breakLine: true } },
        { text: 'Translate vs. rotate in place', options: { bullet: true, breakLine: true } },
        { text: 'Structured telemetry for AdvantageScope', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 3 — why four (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'thlarge_white.png', eyebrow: 'Section 1 · Why four?', title: 'Two shapes of motion cover almost everything' });

    const cards = [
      ['Translate', 'All four wheels point the same direction, same speed — the chassis slides that way.'],
      ['Rotate in place', 'Each wheel steers tangent to a circle around center, same speed — the chassis spins.'],
    ];
    cards.forEach((c, i) => {
      const x = 0.7 + i * 6.05;
      s.addShape('roundRect', { x, y: 1.85, w: 5.85, h: 3.6, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c[0], { x: x + 0.3, y: 2.15, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
      s.addText(c[1], { x: x + 0.3, y: 2.85, w: 5.25, h: 2.5, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25 });
    });

    s.addText('Doing both at once needs per-wheel math — that\'s Lesson 10\'s SwerveDriveKinematics. For now, these two simple cases give Lesson 8\'s gyro a robot that actually turns.', {
      x: 0.7, y: 5.65, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Four Modules', dark: true });
  }

  // ============================================================ SLIDE 4 — rename the class
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'random_white.png', eyebrow: 'Section 2 · Rename and parameterize', title: 'Rename the file first, then reshape it' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 1.05,
      steps: [
        { title: 'Right-click the class name DriveModule in VS Code', detail: 'Anywhere it appears in the file.' },
        { title: 'Choose Refactor → Rename', detail: 'Updates the filename and every reference in the project for you.' },
        { title: 'Type SwerveModule, confirm', detail: 'The file becomes SwerveModule.java, everywhere it\'s used.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.85, w: 11.9, h: 2.1,
      heading: 'Then two changes: drop Mechanism, parameterize the constructor.',
      headingSize: 21,
      body: 'A single wheel isn\'t what the scheduler needs to lock — the whole chassis is. Drivetrain becomes the only mechanism; each SwerveModule is a plain helper it owns.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 5 — parameterized constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · SwerveModule.java', title: 'Fields with no initializers — the constructor fills them in' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.6, fontSize: 10,
      fileLabel: 'Replace the top of the class with',
      lines: [
        { text: 'public class SwerveModule {', color: 'FFD166' },
        { text: '  public final Translation2d location;', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  private final TalonFX m_driveMotor;', color: 'D7E3F4' },
        { text: '  private final TalonFX m_steerMotor;', color: 'D7E3F4' },
        { text: '  private final CANcoder m_steerEncoder;', color: 'D7E3F4' },
        { text: '  private final TalonFXSimState m_driveSim;', color: 'D7E3F4' },
        { text: '  private final TalonFXSimState m_steerSim;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public SwerveModule(', color: 'FFD166' },
        { text: '      int driveId, int steerId, int cancoderId,', color: 'D7E3F4' },
        { text: '      double magnetOffsetRotations, Translation2d location) {', color: 'D7E3F4' },
        { text: '    this.location  = location;', color: '9EF01A' },
        { text: '    m_driveMotor   = new TalonFX(driveId, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '    m_steerMotor   = new TalonFX(steerId, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '    m_steerEncoder = new CANcoder(cancoderId, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '    // ...sim states, CANcoder config, and priming follow...', color: '7FA8C9' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 5, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 6 — setDesiredState
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · SwerveModule.java', title: 'One tick of control, told what to do' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.15, fontSize: 14,
      fileLabel: 'Add to SwerveModule, one plain method that does a single tick of control',
      lines: [
        { text: 'public void setDesiredState(double angleDegrees, double speedFraction) {', color: 'FFD166' },
        { text: '  double error = angleDegrees - getSteerAngleDegrees();', color: 'D7E3F4' },
        { text: '  while (error > 180)  { error -= 360; }', color: 'D7E3F4' },
        { text: '  while (error < -180) { error += 360; }', color: 'D7E3F4' },
        { text: '  double steerOutput = clamp(SteerConstants.kP * error, -1.0, 1.0);', color: 'D7E3F4' },
        { text: '  m_steerMotor.setThrottle(steerOutput);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  m_driveMotor.setThrottle(speedFraction);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.85,
      body: 'Lesson 5\'s steerToAngle math, wearing a new home. Who calls it, and how often? Drivetrain\'s commands will, every tick they run — the module never talks to the scheduler at all.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 6, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 7 — real steering gearing
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 2 · Paying off Lesson 5\'s IOU', title: 'The steering sensor gets its real 25:1' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.2, fontSize: 13,
      fileLabel: 'Add kSteerGearRatio, then edit getSteerAngleDegrees',
      lines: [
        { text: 'public static final double kSteerGearRatio = 25.0; // rotor : steering', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: 'public double getSteerAngleDegrees() {', color: 'FFD166' },
        { text: '  double steerRotations = m_steerMotor.getPosition().getValue().in(Rotations)', color: 'D7E3F4' },
        { text: '      / SteerConstants.kSteerGearRatio;', color: '9EF01A' },
        { text: '  return steerRotations * 360.0;', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 1.95,
      body: 'Divide on the way in (sensor → angle), multiply on the way back (sim model → fake rotor, and the CANcoder priming line) — the same two moves Lesson 6 made for the drive motor.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 7, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 8 — DriveConstants corners
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'sitemap_white.png', eyebrow: 'Section 2 · Constants.java', title: 'Four corners, as Translation2d values' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.4, fontSize: 13,
      fileLabel: 'Add the four corners to DriveConstants',
      lines: [
        { text: 'public static final double kHalfLength = 0.3;  // meters, wheelbase / 2', color: 'D7E3F4' },
        { text: 'public static final double kHalfWidth  = 0.3;  // meters, track width / 2', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public static final Translation2d kFrontLeft  = new Translation2d( kHalfLength,  kHalfWidth);', color: '9EF01A' },
        { text: 'public static final Translation2d kFrontRight = new Translation2d( kHalfLength, -kHalfWidth);', color: '9EF01A' },
        { text: 'public static final Translation2d kBackLeft   = new Translation2d(-kHalfLength,  kHalfWidth);', color: '9EF01A' },
        { text: 'public static final Translation2d kBackRight  = new Translation2d(-kHalfLength, -kHalfWidth);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.2, w: 11.9, h: 1.75,
      body: 'Memorize this now — every WPILib class assumes it: +X is forward, +Y is left, yaw is CCW-positive. Front-left is forward and left, so both signs are positive.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 8, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 9 — create Drivetrain.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 3 · A new file', title: 'One mechanism to own all four modules' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Right-click subsystems, under src/main/java/first/robot/', detail: 'The same folder SwerveModule.java already lives in.' },
        { title: 'Add a new file: Drivetrain.java', detail: 'Right-click subsystems → New File.' },
        { title: 'This one is the mechanism now', detail: 'It owns the array of four modules and the scheduler\'s one lock.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.35, w: 11.9, h: 1.65,
      body: 'Not every class should be a mechanism. SwerveModule became a plain helper — Drivetrain owns the array and is the only thing the scheduler needs to lock.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 9, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 10 — Drivetrain array + constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'An array of four, built with their own IDs' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.2, fontSize: 13,
      fileLabel: 'Start Drivetrain.java with the module array',
      lines: [
        { text: 'public class Drivetrain extends Mechanism {', color: 'FFD166' },
        { text: '  // Corner order: FL, FR, BL, BR. Pick a convention and stick to it.', color: '7FA8C9' },
        { text: '  private final SwerveModule[] m_modules = new SwerveModule[] {', color: 'D7E3F4' },
        { text: '      new SwerveModule(1, 2, 9, 0.0, DriveConstants.kFrontLeft),', color: '9EF01A' },
        { text: '      new SwerveModule(3, 4, 10, 0.0, DriveConstants.kFrontRight),', color: '9EF01A' },
        { text: '      new SwerveModule(5, 6, 11, 0.0, DriveConstants.kBackLeft),', color: '9EF01A' },
        { text: '      new SwerveModule(7, 8, 12, 0.0, DriveConstants.kBackRight)', color: '9EF01A' },
        { text: '  };', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public Drivetrain() {', color: 'FFD166' },
        { text: '    Scheduler.getDefault().addPeriodic(this::logTelemetry);', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 10, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 11 — structured telemetry
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'One call publishes all four modules together' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.1, fontSize: 13,
      fileLabel: 'Add to Drivetrain, alongside the constructor',
      lines: [
        { text: 'private final StructArrayPublisher<SwerveModuleVelocity> m_moduleStatesPublisher =', color: 'D7E3F4' },
        { text: '    NetworkTableInstance.getDefault()', color: 'D7E3F4' },
        { text: '        .getStructArrayTopic("Drivetrain/ModuleStates", SwerveModuleVelocity.struct)', color: '9EF01A' },
        { text: '        .publish();', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'private void logTelemetry() {', color: 'FFD166' },
        { text: '  for (SwerveModule module : m_modules) { /* ...build states[], log angles... */ }', color: '7FA8C9' },
        { text: '  m_moduleStatesPublisher.set(states);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.9, w: 11.9, h: 2.05,
      body: 'SmartDashboard only knows numbers and strings — a whole SwerveModuleVelocity[] needs a struct bridge. Built once as a field, .set(states) pushes a fresh array every tick.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 11, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 12 — translate
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Every module gets the same target' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.6, fontSize: 12,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: 'public Command translate(DoubleSupplier vxSupplier, DoubleSupplier vySupplier) {', color: 'FFD166' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '    double vx = vxSupplier.getAsDouble();', color: 'D7E3F4' },
        { text: '    double vy = vySupplier.getAsDouble();', color: 'D7E3F4' },
        { text: '    double speed = Math.hypot(vx, vy);                     // vector length', color: '9EF01A' },
        { text: '    double angleDeg = Math.toDegrees(Math.atan2(vy, vx));  // vector angle', color: '9EF01A' },
        { text: '    for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '      module.setDesiredState(angleDeg, speed);', color: 'D7E3F4' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }).named("Translate");', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.55, w: 11.9, h: 1.4,
      body: 'Math.hypot(vx, vy) is the vector\'s length; Math.atan2(vy, vx) is its angle in radians, four-quadrant so negative vx or vy still points the right way.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 12, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 13 — rotate + corner table
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 5 · Drivetrain.java', title: 'Rotate: a different angle per corner' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 6.9, h: 3.2, fontSize: 12,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: 'public Command rotate(double omega) {', color: 'FFD166' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '    for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '      double x = module.location.getX();', color: 'D7E3F4' },
        { text: '      double y = module.location.getY();', color: 'D7E3F4' },
        { text: '      double angleDeg = Math.toDegrees(Math.atan2(x, -y));', color: '9EF01A' },
        { text: '      module.setDesiredState(angleDeg, omega);', color: 'D7E3F4' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }).named("Rotate");', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    const rows = [
      ['Front-left', '135°'],
      ['Front-right', '45°'],
      ['Back-left', '-135°'],
      ['Back-right', '-45°'],
    ];
    s.addShape('roundRect', { x: 7.85, y: 1.6, w: 4.75, h: 3.2, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    rows.forEach((r, i) => {
      const y = 1.85 + i * 0.72;
      s.addText(r[0], { x: 8.1, y, w: 3.0, h: 0.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'middle', margin: 0 });
      s.addText(r[1], { x: 10.6, y, w: 1.7, h: 0.6, fontFace: K.FONT_CODE, bold: true, fontSize: 20, color: ORANGE, valign: 'middle', margin: 0 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 1.95,
      body: 'For a module at (x, y), the CCW-tangent direction is (-y, x). Sketch the four wheels pointing those ways and the whole robot spins CCW.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 13, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 14 — wire it up
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 6 · Robot.java & MyTeleop.java', title: 'Fix the red: swap module for drivetrain' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 1.4, fontSize: 16,
      fileLabel: "Delete Robot's old module field, add in its place",
      lines: [
        { text: 'public final Drivetrain drivetrain = new Drivetrain();', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.25, w: 11.9, h: 2.1, fontSize: 13,
      fileLabel: "Delete the old bindings, replace MyTeleop's constructor",
      lines: [
        { text: 'robot.drivetrain.setDefaultCommand(robot.drivetrain.translate(', color: 'D7E3F4' },
        { text: '    () -> -robot.driverController.getLeftY(),   // forward = +X', color: '9EF01A' },
        { text: '    () -> -robot.driverController.getLeftX())); // left    = +Y', color: '9EF01A' },
        { text: 'robot.driverController.leftBumper().whileTrue(robot.drivetrain.rotate(0.3));', color: '9EF01A' },
        { text: 'robot.driverController.rightBumper().whileTrue(robot.drivetrain.rotate(-0.3));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.35,
      body: 'Both bumper commands and the default translate require the Drivetrain — holding a bumper cancels the default; releasing hands control back automatically.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 14, label: 'Four Modules' });
  }

  // ============================================================ SLIDE 15 — run it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'play_white.png', eyebrow: 'Section 7 · Run it', title: 'A live diagram of the whole chassis' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15, dark: true,
      steps: [
        { title: './gradlew simulateJava → My Teleop → Enabled', detail: 'Push the stick — all four steer angles snap to the same value.' },
        { title: 'Hold a bumper', detail: 'The four angles split into the pinwheel from the table.' },
        { title: 'Open AdvantageScope\'s Swerve tab', detail: 'Drag Drivetrain/ModuleStates into its States slot, Max Speed ≈ 5.' },
        { title: 'Retune kP now that you can see it move', detail: 'kP = 0.005 — ten times Lesson 5\'s value — settles in about a second.' },
      ],
    });

    K.addFooter(s, { pageNum: 15, label: 'Four Modules', dark: true });
  }

  // ============================================================ SLIDE 16 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Check the rotate table', body: 'Hold a bumper, check the four plotted angles corner by corner. A wrong one names its own bug.' },
        { title: 'Change the chassis geometry', body: 'kHalfLength = 0.4, kHalfWidth = 0.2. What do the four rotate angles become?' },
        { title: 'Move CAN IDs into Constants.java', body: 'Twelve IDs and four magnet offsets, named, right alongside the gear ratios.' },
        { title: 'Break one calibration on purpose', body: 'Change one corner\'s magnet offset by 0.1. Three arrows agree, one doesn\'t — put it back.' },
      ],
    });

    K.addFooter(s, { pageNum: 16, label: 'Four Modules', dark: true });
  }

  // ============================================================ SLIDE 17 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'One mechanism, four workers commanded together' });

    const points = [
      'An array holds four same-typed modules; the enhanced for loop does the same work to each.',
      'Constructor parameters let one class describe four corners that differ only in their numbers.',
      'Not every class is a mechanism — SwerveModule became a helper; Drivetrain owns the scheduler\'s one lock.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 8', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Gyro & Heading', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Turn the whole robot to a compass direction and stop.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 17, label: 'Four Modules' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '07-four-modules.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
