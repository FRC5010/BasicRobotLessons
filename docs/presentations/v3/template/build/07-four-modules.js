const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 7 — Four Modules' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 7',
    title: 'Four Modules',
    subtitle: 'Build the real four-corner chassis',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Fair warning up front: this is the biggest refactor of the course. Nothing in it is hard, but you\'ll touch four files and the project will spend a while mid-surgery, full of red squiggles. That\'s what refactoring feels like — keep going and it all compiles again by section 7. By the end there\'s a chassis that actually turns, which is what Lesson 8\'s gyro needs to make sense.'
  );

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
    s.addNotes(
      'A swerve robot has four modules, one at each corner. Two "shapes" of motion cover almost everything, which is the framing for the whole lesson — translate and rotate in place — with the combined case (drive-while-rotating) deliberately deferred to Lesson 10\'s SwerveDriveKinematics.'
    );
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
    s.addNotes(
      'Doing both translate and rotate at once requires per-wheel math — you add the translation velocity and the rotation velocity vector at each corner. That\'s what SwerveDriveKinematics handles, and it\'s the whole point of Lesson 10. For now, building the two simple cases gives Lesson 8\'s gyro a robot that actually turns, without needing the combined math yet.'
    );
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
    s.addNotes(
      'DriveModule hard-codes CAN IDs 1 and 2 and knows nothing about where it sits on the robot. Four modules need four unique ID triples, and the rotation math needs each module\'s position — that\'s why the rename comes first, then the reshape. Doing the rename through VS Code\'s refactor tool, not a manual find-replace, is deliberate: it updates the filename and every reference in the project for you, so nothing gets missed.'
    );
  }

  // ============================================================ SLIDE 5 — parameterized constructor (fields + top)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · SwerveModule.java', title: 'Fields with no initializers — the constructor fills them in' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.9, fontSize: 10,
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
        { text: '    m_driveSim     = m_driveMotor.getSimState();', color: 'D7E3F4' },
        { text: '    m_steerSim     = m_steerMotor.getSimState();', color: 'D7E3F4' },
        { text: '    // ...priming continues on the next slide...', color: '7FA8C9' },
      ],
    });

    K.addFooter(s, { pageNum: 5, label: 'Four Modules' });
    s.addNotes(
      'This is a new shape of field, worth looking at closely: the fields have no initializers — no "= new TalonFX(...)" on the declaration line. They can\'t be initialized up top anymore, because the CAN IDs aren\'t known until someone calls the constructor with real values. So the declaration says "this field will exist," and the constructor fills it in. final still holds — a final field must be assigned exactly once, and an assignment in the constructor counts. The Lesson 4 ordering rule follows the assignments into the constructor too: m_driveSim is created by asking m_driveMotor, so the motor lines come first. Constructor parameters are what make one class serve four corners: each new SwerveModule(...) call hands in different IDs and a different position. And in this.location = location, the parameter and the field share a name — this. means "the field on this object," which is how Java tells them apart. Worth naming as a deliberate exception: location is public, after all that encapsulation talk in Lesson 1 — but it\'s final, and a Translation2d is a value that never changes once built, so sharing a read-only fact is safe; hiding it behind a getter would add ceremony without adding protection. Hardware like m_driveMotor stays private, same as always. The constructor isn\'t done yet — it still has to prime the steering sensor from the CANcoder, same ritual as Lesson 5, just parameterized now instead of hardcoded. That\'s the next slide.'
    );
  }

  // ============================================================ SLIDE 6 — constructor continues: priming
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · SwerveModule.java', title: 'The constructor continues: prime the steering sensor' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.75, fontSize: 15,
      fileLabel: 'Same constructor, right after the sim-state lines',
      lines: [
        { text: '// Same CANcoder priming as Lesson 5 — the gear-ratio fix comes below.', color: '7FA8C9' },
        { text: 'CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();', color: 'D7E3F4' },
        { text: 'cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;', color: '9EF01A' },
        { text: 'm_steerEncoder.getConfigurator().apply(cancoderConfig);', color: 'D7E3F4' },
        { text: 'm_steerMotor.setPosition(', color: 'D7E3F4' },
        { text: '    m_steerEncoder.getAbsolutePosition().getValue().in(Rotations));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.6, w: 11.9, h: 2.15,
      body: 'Constructor parameters are what make one class serve four corners — each new SwerveModule(...) call hands in a different CANcoder ID and a different magnet offset, the same priming ritual from Lesson 5, just parameterized like everything else here.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 6, label: 'Four Modules' });
    s.addNotes(
      'This closes out the constructor. getConfigurator().apply(...) builds a small config object describing what you want, then hands it to the device once — the same shape Lesson 5 used. setPosition(...) primes the motor\'s own relative counter from the CANcoder\'s absolute reading, once, at construction. Nothing here is new math — it\'s the exact Lesson 5 ritual, just reading magnetOffsetRotations and cancoderId from constructor parameters instead of a single hardcoded pair. Section 2 comes back to the setPosition line one more time later, once the real 25:1 steering gearing enters the picture — this version is still the pretend 1:1 one from Lesson 5.'
    );
  }

  // ============================================================ SLIDE 7 — setDesiredState
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

    K.addFooter(s, { pageNum: 7, label: 'Four Modules' });
    s.addNotes(
      'Because the module no longer extends Mechanism, the command factories are literally gone — run, runRepeatedly, and friends were inherited from Mechanism, so driveAtSpeed, driveWithJoystick, steerToAngle, and driveDistance don\'t compile anymore. That\'s fine: commands belong to mechanisms, and this class isn\'t one anymore, so those all get deleted along with the constructor\'s addPeriodic call and logTelemetry() (telemetry moves up to Drivetrain in the next section). setDesiredState is Lesson 5\'s steerToAngle math wearing a new home: one call means one tick of control toward the given goal. The Drivetrain\'s commands will call it every tick they run — the same per-tick rhythm runRepeatedly has had since Lesson 2. That keeps a tidy rule intact: motors move only when a command asks, and commands only run while the robot is enabled. The module doesn\'t register anything with the scheduler at all — no addPeriodic, nothing — because there\'s nothing it needs to do on its own schedule. Keep the private clamp helper from Lesson 5 unchanged — this alpha\'s WPILib doesn\'t ship a MathUtil.clamp to replace it with.'
    );
  }

  // ============================================================ SLIDE 8 — real steering gearing (getSteerAngleDegrees)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 2 · Paying off Lesson 5\'s IOU', title: 'The steering sensor gets its real 25:1' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.5, fontSize: 13,
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
      x: 0.7, y: 5.2, w: 11.9, h: 1.75,
      body: 'Divide on the way in (sensor → angle) — that\'s this slide. Multiply on the way back (the priming line, the sim model, and simulatePeriodic) — that\'s the next one. Same two moves Lesson 6 made for the drive motor.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 8, label: 'Four Modules' });
    s.addNotes(
      'Lesson 5 pretended the steering sensor turned 1:1 with the wheel and promised the real gearing later. The module is growing up today, so the debt comes due: the steering turns through a real 25:1 reduction — the rotor spins 25 times per steering rotation. Same two moves as the drive motor in Lesson 6: divide on the way in, multiply on the way back. Worth flagging a real consequence for later: the steering now turns at a believable speed instead of a bare rotor\'s instant snap, so Lesson 5\'s kP is now tuned for the wrong plant — measured against this model, the same kP = 0.0005 that converged cleanly in Lesson 5 now crawls, taking about 9 simulated seconds to close the last degree of a 90° turn. That\'s not a bug; the thing being controlled changed, and a 25:1 reduction resists motion harder than a bare rotor did. Nothing can be retuned yet since nothing runs until the wiring in section 6 — section 7 comes back to this the moment the robot moves.'
    );
  }

  // ============================================================ SLIDE 9 — the other three edits paying off the same debt
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 2 · Paying off Lesson 5\'s IOU, continued', title: 'Multiply on the way back — three more spots' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.8, fontSize: 11,
      fileLabel: 'Edit the priming line, m_steerModel, and simulatePeriodic in SwerveModule',
      lines: [
        { text: '// 1. The priming line, back in the constructor:', color: '7FA8C9' },
        { text: 'm_steerMotor.setPosition(', color: 'D7E3F4' },
        { text: '    m_steerEncoder.getAbsolutePosition().getValue().in(Rotations)', color: 'D7E3F4' },
        { text: '        * SteerConstants.kSteerGearRatio);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '// 2. The m_steerModel field, to model the gearbox:', color: '7FA8C9' },
        { text: 'private final DCMotorSim m_steerModel = new DCMotorSim(', color: 'D7E3F4' },
        { text: '    Models.singleJointedArmFromPhysicalConstants(', color: 'D7E3F4' },
        { text: '        DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),', color: '9EF01A' },
        { text: '    DCMotor.getKrakenX60(1));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '// 3. The steer half of simulatePeriodic():', color: '7FA8C9' },
        { text: 'm_steerSim.setRawRotorPosition(m_steerModel.getAngularPosition()', color: 'D7E3F4' },
        { text: '    / (2 * Math.PI) * SteerConstants.kSteerGearRatio);', color: '9EF01A' },
        { text: 'm_steerSim.setRotorVelocity(m_steerModel.getAngularVelocity()', color: 'D7E3F4' },
        { text: '    / (2 * Math.PI) * SteerConstants.kSteerGearRatio);', color: '9EF01A' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Four Modules' });
    s.addNotes(
      'One more line from Lesson 5 needs the same fix: the constructor primes the steering motor\'s sensor from the CANcoder, but that line was written for the pretend 1:1 sensor. Now that 25 real rotor turns happen per wheel turn, seeding the motor\'s rotor-side counter means multiplying the CANcoder\'s wheel-side reading by the ratio — the same conversion getSteerAngleDegrees() just learned to undo. m_steerModel gets the same treatment DCMotorSim always gets: multiply back to rotor-side, exactly like the drive motor did in Lesson 6, passing SteerConstants.kSteerGearRatio where the drive motor passed DriveConstants.kDriveGearRatio. And simulatePeriodic()\'s steer half gets the identical fix as the drive half did in Lesson 6 — divide by 2π to go from radians to rotations, then multiply by the gear ratio to go from wheel-side to rotor-side. All three are the same one idea, applied in three places the ratio touches.'
    );
  }

  // ============================================================ SLIDE 10 — getDriveVelocityMetersPerSec
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 2 · SwerveModule.java', title: 'One more question-method, for the visualization ahead' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.8, fontSize: 16,
      fileLabel: 'Add to SwerveModule',
      lines: [
        { text: '/** Current wheel speed in meters per second. */', color: '7FA8C9' },
        { text: 'public double getDriveVelocityMetersPerSec() {', color: 'FFD166' },
        { text: '  double wheelRps = m_driveMotor.getVelocity().getValue().in(RotationsPerSecond)', color: 'D7E3F4' },
        { text: '      / DriveConstants.kDriveGearRatio;', color: '9EF01A' },
        { text: '  return wheelRps * DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.9, w: 11.9, h: 2.05,
      body: 'getDistanceMeters() stays unchanged from Lesson 6 — this is its velocity twin, the same pipeline applied to velocity instead of position. Section 3 needs it: the Swerve tab visualization draws each wheel\'s speed as an arrow\'s length.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 10, label: 'Four Modules' });
    s.addNotes(
      'This one is easy to skim past because it\'s short, but it\'s load-bearing: without it, Drivetrain has no way to hand a wheel\'s speed to the structured telemetry two sections from now. It\'s exactly getDistanceMeters()\'s pipeline — rotor turns ÷ gear ratio = wheel turns/sec, × circumference = meters/sec — just read from getVelocity() instead of getPosition(). Also worth mentioning while here: MyTeleop is lit up red right now, still binding buttons to command factories that no longer exist on SwerveModule. Leave it red — section 6 rebuilds that wiring around the Drivetrain. A refactor isn\'t done until every file that touched the old shape learns the new one, and the compiler\'s job is to keep that list for you.'
    );
  }

  // ============================================================ SLIDE 11 — DriveConstants corners
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

    K.addFooter(s, { pageNum: 11, label: 'Four Modules' });
    s.addNotes(
      'One field on DriveConstants no longer makes sense and has to go: kDriveMotorPort, kSteerMotorPort, and kCancoderPort described one module\'s wiring — four modules need four sets, so delete those three constants; the next section replaces them with per-corner IDs passed straight into each new SwerveModule(...) call. A refactor isn\'t done until every file that touched the old shape learns the new one, and the compiler\'s job is to keep that list for you.'
    );
  }

  // ============================================================ SLIDE 12 — create Drivetrain.java
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

    K.addFooter(s, { pageNum: 12, label: 'Four Modules' });
    s.addNotes(
      'The Drivetrain owns four SwerveModules in an array, logs them from its own always-on telemetry, and commands them from its command factories. This is the file that becomes the one mechanism for driving — the architectural payoff of dropping Mechanism from SwerveModule in section 2.'
    );
  }

  // ============================================================ SLIDE 13 — Drivetrain array + constructor
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

    K.addFooter(s, { pageNum: 13, label: 'Four Modules' });
    s.addNotes(
      'Two new pieces of Java carry this file. SwerveModule[] is an array: a fixed-size, ordered container where every slot holds the same type. new SwerveModule[] { a, b, c, d } builds one with four elements — and here each element is itself a new SwerveModule(...) call with its own IDs and corner, which is constructor parameters doing exactly the job section 2 promised. Corner order (FL, FR, BL, BR) is a convention to pick once and stick to — it\'s what makes Module0 through Module3 mean something consistent later.'
    );
  }

  // ============================================================ SLIDE 14 — structured telemetry: the publisher field
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'A struct bridge, built once as a field' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.15, fontSize: 13,
      fileLabel: 'Add to Drivetrain, alongside the constructor',
      lines: [
        { text: 'private final StructArrayPublisher<SwerveModuleVelocity> m_moduleStatesPublisher =', color: 'D7E3F4' },
        { text: '    NetworkTableInstance.getDefault()', color: 'D7E3F4' },
        { text: '        .getStructArrayTopic("Drivetrain/ModuleStates", SwerveModuleVelocity.struct)', color: '9EF01A' },
        { text: '        .publish();', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.8,
      body: 'SmartDashboard only knows numbers and strings — a whole SwerveModuleVelocity[] needs a struct bridge, the same idea as the TalonFXSimState bridge from Lesson 4, just for network data instead of fake sensor readings. Built once as a field, the same "set it up once, use it every tick" shape.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 14, label: 'Four Modules' });
    s.addNotes(
      'Every value logged since Lesson 3 has been a single number or string — SmartDashboard.putNumber/putString, one call, one value. SwerveModuleVelocity is different: a WPILib data-carrier bundling one wheel\'s speed with its angle as a Rotation2d. NetworkTableInstance.getDefault().getStructArrayTopic(name, structType) describes the bridge: "a topic at this name, carrying an array of this struct-shaped type." SwerveModuleVelocity.struct is a value the class ships for exactly this — it knows how to turn the object into bytes and back. .publish() claims the topic for writing and hands back a StructArrayPublisher. The method that actually fills it in — logTelemetry() — is next.'
    );
  }

  // ============================================================ SLIDE 15 — logTelemetry, the real body
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'One call publishes all four modules together' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.7, fontSize: 13,
      fileLabel: 'Add the method itself, right below the publisher field',
      lines: [
        { text: 'private void logTelemetry() {', color: 'FFD166' },
        { text: '  SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];', color: 'D7E3F4' },
        { text: '  int index = 0;', color: 'D7E3F4' },
        { text: '  for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '    SmartDashboard.putNumber(', color: 'D7E3F4' },
        { text: '        "Drivetrain/Module" + index + "/SteerAngleDegrees",', color: '9EF01A' },
        { text: '        module.getSteerAngleDegrees());', color: 'D7E3F4' },
        { text: '    states[index] = new SwerveModuleVelocity(', color: 'D7E3F4' },
        { text: '        module.getDriveVelocityMetersPerSec(),', color: '9EF01A' },
        { text: '        Rotation2d.fromDegrees(module.getSteerAngleDegrees()));', color: '9EF01A' },
        { text: '    index++;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  m_moduleStatesPublisher.set(states);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 15, label: 'Four Modules' });
    s.addNotes(
      'for (SwerveModule module : m_modules) is the enhanced for loop — read it as "for each module in m_modules": the body runs once per element with module standing for each in turn. One wrinkle: a for-each loop doesn\'t number its elements, and the log keys need numbers, so a plain int index counter rides along, and "Drivetrain/Module" + index + "/..." glues the number into the key (+ between a String and a number pulls the number into the text). Keys Module0-Module3 follow the FL, FR, BL, BR order of the array. From there .set(states) pushes a fresh array every time logTelemetry() runs — one call publishes all four modules\' speed and angle together, instead of four separate numbers that AdvantageScope would have no way to know belong to the same picture. Step back and name the division of labor: the periodic callback registered in the constructor runs rain or shine — every tick, even while the robot is disabled — so it holds the watching. The acting lives in commands, built next, which call setDesiredState only while enabled. That\'s the whole point of dropping Mechanism from SwerveModule — one mechanism, one lock, four workers commanded together.'
    );
  }

  // ============================================================ SLIDE 16 — Drivetrain.simulatePeriodic
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'One more loop: stepping every module\'s physics' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.8, fontSize: 16,
      fileLabel: 'Add to Drivetrain, below logTelemetry()',
      lines: [
        { text: '/** Advances every module\'s physics model. Only ever called in simulation. */', color: '7FA8C9' },
        { text: 'public void simulatePeriodic() {', color: 'FFD166' },
        { text: '  for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '    module.simulatePeriodic();', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.9, w: 11.9, h: 2.05,
      body: 'Robot.simulationPeriodic() will call this one method — section 6 wires it up — the same one-line pattern Lesson 4 established, now looping the enhanced for loop over four modules instead of stepping one module directly.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 16, label: 'Four Modules' });
    s.addNotes(
      'This is the third time this file reaches for the enhanced for loop, and it\'s the smallest use — one line in the body, calling the method every SwerveModule has carried since Lesson 4 unchanged. Drivetrain doesn\'t know or care how each module steps its own physics; it just asks all four to do it, every simulated tick. Without this method (and section 6\'s one-line wiring of it into Robot), the sim motors would sit frozen the instant this refactor lands — worth saying out loud, since it\'s an easy edit to skip and the failure mode (nothing moves in sim) doesn\'t obviously point back here.'
    );
  }

  // ============================================================ SLIDE 17 — translate
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

    K.addFooter(s, { pageNum: 17, label: 'Four Modules' });
    s.addNotes(
      'The shape should feel familiar — it\'s Lesson 2\'s driveWithJoystick grown up: a command factory (they\'re back, because Drivetrain IS a mechanism) taking suppliers so the sticks get re-read every tick. The two Math calls are the new part. Math.hypot(vx, vy) returns sqrt(vx² + vy²), the length of the vector, cleaner and numerically safer than writing the formula by hand. Math.atan2(vy, vx) is the vector\'s angle in radians — it\'s the four-quadrant version of atan, meaning it gets the direction right even when vx or vy goes negative — and Math.toDegrees converts to what the steering code expects. Then every module gets the same target, and the chassis slides as one.'
    );
  }

  // ============================================================ SLIDE 18 — rotate + corner table
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

    K.addFooter(s, { pageNum: 18, label: 'Four Modules' });
    s.addNotes(
      'This is where each module\'s location earns its keep: unlike translate, every corner gets a different angle, computed from where that corner sits. For a module at position (x, y) from center, the CCW-tangent direction is (-y, x) — rotate the outward radial 90° CCW. Sketch the four wheels pointing those table angles and imagine them rolling — the whole robot spins CCW. Worth pointing out explicitly: neither translate nor rotate bothers with a .whenCanceled(...) cleanup, unlike every command since Lesson 1 — that\'s not an oversight, it\'s because Drivetrain is never actually idle. translate is about to become the default command in section 6, so the instant rotate is canceled (a bumper released), the scheduler hands the mechanism straight back to translate, which immediately commands fresh output. Contrast that with driveDistance back in Lesson 6, which really could end with nothing else queued up — that\'s the difference that decides whether cleanup is required. Two simplifications worth naming as deliberate, fixed in Lesson 10: real rotation gives faster linear speed to wheels farther from center (v = ω × r), but the same speed is used for all four here, which is close enough on a square chassis; and translate and rotate can\'t run at once since both require the Drivetrain — SwerveDriveKinematics combines them per-wheel.'
    );
  }

  // ============================================================ SLIDE 19 — wire it up: Robot.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 6 · Robot.java', title: 'Fix the red: Robot.java learns about the Drivetrain' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 1.4, fontSize: 16,
      fileLabel: "Delete Robot's old module field, add in its place",
      lines: [
        { text: 'public final Drivetrain drivetrain = new Drivetrain();', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.25, w: 11.9, h: 2.15, fontSize: 16,
      fileLabel: "Update Robot's simulationPeriodic()",
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void simulationPeriodic() {', color: 'D7E3F4' },
        { text: '  drivetrain.simulatePeriodic();', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.55, w: 11.9, h: 1.5,
      body: 'Also update the import: DriveModule becomes Drivetrain. One more thing this class reaches for is next: logCommandStart() still checks the old module by name.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 19, label: 'Four Modules' });
    s.addNotes(
      'Two small, easy-to-separate edits to the same file. The field swap is the obvious one — module (the single DriveModule) goes away entirely, replaced by drivetrain. The simulationPeriodic() update is the one that\'s easy to forget, because the old version already compiled fine calling module.simulatePeriodic() — updating it to drivetrain.simulatePeriodic() is a silent edit the compiler won\'t flag if you rename the field but forget the body. Without it, nothing errors, but sim physics never advances again: every module sits frozen forever, and the failure looks nothing like "forgot to update simulationPeriodic()" from the outside. This is exactly the kind of thing a refactor\'s compiler-driven checklist is supposed to catch, and it will — Robot.java won\'t compile at all until the field rename happens, but simulationPeriodic()\'s body compiles either way, referencing whichever field exists. Watch for it by hand.'
    );
  }

  // ============================================================ SLIDE 20 — logCommandStart replacement
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 6 · Robot.java', title: 'The enhanced for loop, a second time' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.35, fontSize: 15,
      fileLabel: "Replace Robot's logCommandStart()",
      lines: [
        { text: 'private void logCommandStart(SchedulerEvent event) {', color: 'FFD166' },
        { text: '  if (event instanceof SchedulerEvent.Scheduled scheduled) {', color: 'D7E3F4' },
        { text: '    for (Mechanism mechanism : scheduled.command().requirements()) {', color: '9EF01A' },
        { text: '      SmartDashboard.putString(', color: 'D7E3F4' },
        { text: '          mechanism.getName() + "/CurrentCommand", scheduled.command().name());', color: '9EF01A' },
        { text: '    }', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.85,
      body: 'Add import org.wpilib.command3.Mechanism. requirements() is the whole set of mechanisms a command needs — this loop runs once today, but won\'t need editing when a second mechanism arrives.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 20, label: 'Four Modules' });
    s.addNotes(
      'logCommandStart() from Lesson 3 checks one mechanism by name — requires(module) — which was fine when Robot only ever had one to watch. You just renamed that mechanism once already, a few slides ago, and every mechanism this course adds from here on would mean coming back to this method again. requirements() is the data behind Lesson 3\'s requires(...) — the whole set of mechanisms a command needs, instead of a yes-or-no answer about just one. Every command in this course needs exactly one mechanism, so the loop runs once — but the method doesn\'t need to know that, which is the point. mechanism.getName() reads back the same name every Mechanism already carries — it\'s where the "Drivetrain" in "Drivetrain[IDLE]" comes from — so the dashboard key builds itself: Drivetrain/CurrentCommand for a command on drivetrain, whatever a future mechanism happens to be called for one of its own. Same dashboard key you\'ve had since Lesson 3, just arrived at without Robot needing to be told what it was watching.'
    );
  }

  // ============================================================ SLIDE 21 — wire it up: MyTeleop
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 6 · MyTeleop.java', title: 'Left stick translates, bumpers spin' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.6, fontSize: 14,
      fileLabel: "Delete the old bindings, replace MyTeleop's constructor",
      lines: [
        { text: '// Left stick translates by default; bumpers spin in place.', color: '7FA8C9' },
        { text: 'robot.drivetrain.setDefaultCommand(robot.drivetrain.translate(', color: 'D7E3F4' },
        { text: '    () -> -robot.driverController.getLeftY(),   // forward = +X', color: '9EF01A' },
        { text: '    () -> -robot.driverController.getLeftX())); // left    = +Y', color: '9EF01A' },
        { text: 'robot.driverController.leftBumper().whileTrue(robot.drivetrain.rotate(0.3));', color: '9EF01A' },
        { text: 'robot.driverController.rightBumper().whileTrue(robot.drivetrain.rotate(-0.3));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.65, w: 11.9, h: 2.3,
      body: 'Delete the old A/B, slow-mode, steering, and D-pad binds — all lived on a class that\'s now a helper. Both bumper commands and the default translate require the Drivetrain, so holding one cancels the other automatically.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 21, label: 'Four Modules' });
    s.addNotes(
      'The minus signs are Lesson 2\'s stick-inversion lesson meeting section 2\'s coordinate convention: pushing the stick forward reads negative but means +X; pushing it left reads negative but means +Y. Every one of the old bindings named in the caption lived on SwerveModule\'s command factories, which no longer exist — deleting them isn\'t optional cleanup, the project won\'t compile until they\'re gone. The project should compile clean again once this lands.'
    );
  }

  // ============================================================ SLIDE 22 — run it
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

    K.addFooter(s, { pageNum: 22, label: 'Four Modules', dark: true });
    s.addNotes(
      'Notice what didn\'t have to happen first: walking out to the robot and pointing every wheel at some agreed "forward" before enabling. That\'s Lesson 5\'s priming, paying off exactly where it matters — four independent modules that all agree on zero the instant power comes on, with no ritual and no chance to forget it before a match. On the Swerve tab: one arrow per module, direction showing steer angle, length showing wheel speed. Push the stick and all four arrows swing together and grow with speed; hold a bumper and they snap into the pinwheel — the table from the previous slide, drawn for you, sixty times a second. This diagram is about to become the main debugging view for everything swerve going forward. On retuning kP: verified against this model, kP = 0.005 — ten times Lesson 5\'s value — settles within about a second with barely any overshoot. The gearbox adds real damping, so a bigger gain is both safe and needed here, the opposite of Lesson 5\'s ungeared case — this is the first moment the effect can actually be seen and tuned. And the gyro still reports zero — the chassis isn\'t yet closing the loop from "commanded rotation" to "reported heading." That\'s exactly what Lesson 8 wires up.'
    );
  }

  // ============================================================ SLIDE 23 — try it (1 of 2)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it (1 of 2)' });

    K.addTryItGrid(s, {
      y: 1.75, cols: 2,
      cards: [
        { title: 'Check the rotate table', body: 'Hold a bumper, check the four plotted angles corner by corner. A wrong one names its own bug.' },
        { title: 'Change the chassis geometry', body: 'kHalfLength = 0.4, kHalfWidth = 0.2. What do the four rotate angles become?' },
      ],
    });

    K.addFooter(s, { pageNum: 23, label: 'Four Modules', dark: true });
    s.addNotes(
      'Checking the rotate table by corner is worth doing for real, not just reading: if one module disagrees, its position in Constants.java or its slot in the array is wrong, and the plot just told you which one. The geometry exercise is predict-then-check, not code-writing — swap two existing constants and watch the table you already have change shape, which is the point: now you understand why chassis geometry matters, not just that it does.'
    );
  }

  // ============================================================ SLIDE 24 — try it (2 of 2)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it (2 of 2)' });

    K.addTryItGrid(s, {
      y: 1.75, cols: 2,
      cards: [
        { title: 'Add driveForwardMeters', body: 'Read getDistanceMeters() from m_modules[0], sequence steps like Lesson 6\'s driveDistance — this becomes Lesson 9\'s real auto step.', code: true },
        { title: 'Move CAN IDs into Constants.java', body: 'Twelve CAN IDs and four magnet offsets, named in DriveConstants — then rebuild the module array to reference them.', code: true },
        { title: 'Break one calibration on purpose', body: 'Change one corner\'s magnet offset by 0.1. Three arrows agree, one doesn\'t — put it back.' },
      ],
    });

    K.addFooter(s, { pageNum: 24, label: 'Four Modules', dark: true });
    s.addNotes(
      'Two of these three genuinely expect written code, tagged accordingly. driveForwardMeters(double meters) is a whole-chassis version of Lesson 6\'s driveDistance: reset one wheel\'s odometer, drive all four forward, watch that same wheel to know when you\'ve gone far enough — the exact shape Lesson 9 formalizes for real autonomous routines, so this is a legitimate preview, not busywork. Moving CAN IDs into Constants.java is explicitly framed as "verbose, but now every ID and calibration number lives in the same file as the gear ratios and chassis dimensions" — twelve named ports plus four magnet offsets, then the array rebuilt to reference DriveConstants.kFrontLeftDrivePort and friends instead of bare literals. The calibration-break exercise is the most memorable of the three but isn\'t really code-writing — change one corner\'s magnet offset by 0.1 (about 36°) and watch the Swerve tab: three arrows agree, one doesn\'t, a fixed, consistent disagreement, not noise. That\'s exactly what a bad calibration looks like on a real robot, and with four modules on screen at once, it\'s obvious which corner needs remeasuring. Remember to put the offset back afterward.'
    );
  }

  // ============================================================ SLIDE 25 — what you learned + next
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

    K.addFooter(s, { pageNum: 25, label: 'Four Modules' });
    s.addNotes(
      'The Java half of this lesson was about many of the same thing: an array holds four same-typed modules, the enhanced for loop does the same work to each, and constructor parameters let one class describe four corners that differ only in their numbers. That same loop paid for itself twice — once over m_modules, and again over command.requirements(), which turned Lesson 3\'s one-mechanism logCommandStart() into a version that needs no further edits no matter how many mechanisms Robot ends up with. The robot half was an architecture decision worth remembering the reasoning for: not every class should be a mechanism. SwerveModule became a plain helper class — the Drivetrain owns the array and holds the scheduler\'s one lock — and the module\'s job shrank to one method: a single tick of control toward whatever it\'s told, whenever a command asks. You also picked up structured telemetry — a StructArrayPublisher bridges a whole array of labeled objects onto the network in one call, so AdvantageScope draws it live, which will catch a miswired corner faster than any plot. If the refactor felt long, that\'s because it was the real thing — a rename, deletions, red files, and the compiler walking you through every place the old design used to live. First, the robot needs to know which way it\'s facing — Lesson 8 gives it a gyro.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '07-four-modules.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
