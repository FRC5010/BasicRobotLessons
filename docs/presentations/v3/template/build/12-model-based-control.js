const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 12 — Model-Based Control' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 12',
    title: 'Model-Based Control',
    subtitle: 'Let the motor do the math',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Every TalonFX is a computer, running its own control code about 1000 times a second — a fact hiding in plain sight since Lesson 1. This lesson moves the module\'s control loops off the 50 Hz robot code and onto the motor controllers themselves: position control with wrap-around for steering, velocity control with a feedforward model for drive, and retires the one-time CANcoder priming from Lesson 5 in favor of a firmware fix that keeps watching all match long.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Move control onto the motor controllers' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Position control with wrap-around for steering, velocity control with a feedforward model for drive — and retire one-time CANcoder priming for a firmware fix that watches all match long.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.75;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Configuration objects — a bigger one, for the motors', options: { bullet: true, breakLine: true } },
        { text: 'Control request objects — built once, reused every tick', options: { bullet: true, breakLine: true } },
        { text: 'Deleting code as progress', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('microchip_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'The TalonFX is a computer, at 1 kHz', options: { bullet: true, breakLine: true } },
        { text: 'TalonFXConfiguration: ratios, ContinuousWrap, Slot0', options: { bullet: true, breakLine: true } },
        { text: 'Remote sensor fusion', options: { bullet: true, breakLine: true } },
        { text: 'PositionVoltage / VelocityVoltage, and feedforward (kV)', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Model-Based Control' });
    s.addNotes(
      'The mental model to correct: your code is not the robot\'s only brain. Your code is the coach — it decides what each motor should be doing. The motor controller is the player — it can chase that goal twenty times faster than a 50 Hz loop can even look. That\'s the whole lesson: teach the firmware about your mechanism, then change setDesiredState from "do the math" to "state the goal."'
    );
  }

  // ============================================================ SLIDE 3 — two computers (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'microchip_white.png', eyebrow: 'Section 1 · Two computers', title: 'Your code is the coach; the TalonFX is the player' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Every TalonFX IS a computer. Not a metaphor.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('There\'s a processor inside each motor controller, running its own control code about 1000 times per second — 20x faster than your 50 Hz loop can even look. Once every 20 ms your steering P control checks the angle, computes an output, and commands it — then goes blind until the next tick.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('Instead of computing efforts every tick, your code states targets and lets the firmware close the loop — tighter control, and simpler code, at the same time.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Model-Based Control', dark: true });
    s.addNotes(
      'Here\'s a fact hiding in plain sight since Lesson 1: every TalonFX is a computer. The mental model to correct is "my code is the robot\'s only brain." Your code is the coach: it decides what each motor should be doing. The motor controller is the player: it can chase that goal twenty times faster than your 50 Hz loop can even look. The TalonFX can run the same P loop at 1 kHz, right next to the sensor, with no CAN-bus delay in the middle. That\'s the whole lesson: teach the firmware about your mechanism (gearing, wrap-around, gains), then change setDesiredState — the method every command calls each tick — from "do the math" to "state the goal."'
    );
  }

  // ============================================================ SLIDE 4 — priming isn't enough (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 2 · Priming isn\'t enough', title: 'Stop trusting the rotor at all' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Priming fixes the boot-alignment problem — for the first tick.', { x: 1.0, y: 2.1, w: 5.25, h: 1.1, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('From then on the rotor sensor is back in charge, and a relative sensor drifts from anything that turns the wheel without turning the motor\'s report of it: a hard collision, gearbox backlash, a slow accumulation of small slips over a long match.', {
      x: 1.0, y: 3.2, w: 5.25, h: 3.0, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('The fix: point the firmware\'s closed loop at the CANcoder, continuously.', { x: 7.05, y: 2.1, w: 5.25, h: 1.1, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('So "where the wheel is" and "what the sensor reports" can never quietly drift apart. The CANcoder, its config, and the magnet offset are already sitting in your code from Lesson 7 — this lesson doesn\'t add hardware. It changes who\'s allowed to read it.', {
      x: 7.05, y: 3.2, w: 5.25, h: 3.0, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 4, label: 'Model-Based Control', dark: true });
    s.addNotes(
      'Since Lesson 5, every module has primed its steering sensor from the CANcoder once, at startup. None of the drift ever happens on the bench, which is exactly why it\'s easy to trust priming forever and get burned in a real one. The fix sounds almost too simple: stop trusting the rotor at all.'
    );
  }

  // ============================================================ SLIDE 5 — delete the priming line
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 3 · SwerveModule.java', title: 'Delete the priming line' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.9, fontSize: 12,
      fileLabel: "Delete from SwerveModule's constructor — it was the last line",
      lines: [
        { text: '// DELETE — the steering configuration now reads the CANcoder continuously;', color: 'FF8B8B' },
        { text: '// seeding the rotor\'s own counter no longer does anything useful.', color: 'FF8B8B' },
        { text: 'm_steerMotor.setPosition(', color: 'FF6B6B' },
        { text: '    m_steerEncoder.getAbsolutePosition().getValue().in(Rotations) * SteerConstants.kSteerGearRatio);', color: 'FF6B6B' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 3.0,
      body: 'The firmware is about to take over reading the CANcoder permanently, so seeding the rotor\'s own count is solving a problem that\'s about to stop existing. The CANcoder object, its CAN ID, and its magnet offset are all still right there as constructor parameters from Lesson 7 — nothing about the constructor\'s signature changes today, only what happens inside it.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 5, label: 'Model-Based Control' });
    s.addNotes(
      'This was the last line of the constructor — m_steerMotor.setPosition(...), seeding the rotor\'s counter from the CANcoder\'s absolute reading. Delete it.'
    );
  }

  // ============================================================ SLIDE 6 — configure the motors
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 3 · SwerveModule.java', title: 'Two configuration objects, one apply each' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 5.35, fontSize: 11,
      fileLabel: "Replace Lesson 7's steering configuration (just above where priming was) with",
      lines: [
        { text: '// Steering: which way it counts (Lesson 7), then read angle from the CANcoder,', color: '7FA8C9' },
        { text: '// wrap like a circle, hold a P gain.', color: '7FA8C9' },
        { text: 'TalonFXConfiguration steerConfig = new TalonFXConfiguration();', color: 'D7E3F4' },
        { text: 'steerConfig.MotorOutput.Inverted = SteerConstants.kSteerInverted;', color: 'D7E3F4' },
        { text: 'steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;', color: '9EF01A' },
        { text: 'steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;', color: '9EF01A' },
        { text: 'steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;', color: '9EF01A' },
        { text: 'steerConfig.Feedback.SensorToMechanismRatio = 1.0;', color: '9EF01A' },
        { text: 'steerConfig.ClosedLoopGeneral.ContinuousWrap = true;', color: '9EF01A' },
        { text: 'steerConfig.Slot0.kP = SteerConstants.kSteerKP;', color: '9EF01A' },
        { text: 'm_steerMotor.getConfigurator().apply(steerConfig);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '// Drive: firmware knows the gearbox and runs a kV model + kP trim.', color: '7FA8C9' },
        { text: 'TalonFXConfiguration driveConfig = new TalonFXConfiguration();', color: 'FFD166' },
        { text: 'driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;', color: '9EF01A' },
        { text: 'driveConfig.Slot0.kV = DriveConstants.kDriveKV;', color: '9EF01A' },
        { text: 'driveConfig.Slot0.kP = DriveConstants.kDriveKP;', color: '9EF01A' },
        { text: 'm_driveMotor.getConfigurator().apply(driveConfig);', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Model-Based Control' });
    s.addNotes(
      'Phoenix 6 configuration works in two steps: build a configuration object that describes everything about the mechanism, then apply it to the motor once. This has happened twice already: in Lesson 5 for the CANcoder, and in Lesson 7 for the steering motor, when all it needed to know was which way it counts. Today that steering configuration grows into the one that runs the loop, and the drive motor gets one of its own. TalonFXConfiguration is already imported from Lesson 7. Keep the Inverted line: applying a configuration sets every setting it holds, including the ones never mentioned, so leaving the line out would quietly put a flipped steering motor back to Phoenix\'s default. And from today it matters more than it did: the loop reads the CANcoder, so a motor that counts the opposite way from its sensor makes the loop push the wrong way. Four new settings carry the lesson, walked through on the next slide.'
    );
  }

  // ============================================================ SLIDE 7 — four settings explained (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'listul_white.png', eyebrow: 'Section 3 · Four settings carry the lesson', title: 'What each config line actually buys you' });

    const cells = [
      ['FeedbackRemoteSensorID / FeedbackSensorSource', '"Don\'t trust your own rotor — read this CANcoder instead, every tick." Every getPosition()/getVelocity() call, and the closed loop itself, transparently reflects the CANcoder from here on.'],
      ['RotorToSensorRatio', 'Replaces SensorToMechanismRatio for steer specifically — it\'s now "rotor turns per CANcoder turn," the same 25:1 number, new meaning. SensorToMechanismRatio stays 1:1, the CANcoder-to-mechanism ratio.'],
      ['ContinuousWrap', 'The mechanism is a circle: 0.9 rotations and -0.1 are one small step apart. The Lesson 5 wrap trick, implemented in silicon — it doesn\'t care which sensor feeds the loop.'],
      ['Slot0', 'Holds the gains the onboard loop uses. The old software-P kP in SteerConstants retires this lesson — different loop, different units, different name.'],
    ];
    const cw = 5.85, ch = 2.15, gap = 0.2;
    cells.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.7 + col * (cw + gap);
      const y = 1.85 + row * (ch + gap);
      s.addShape('roundRect', { x, y, w: cw, h: ch, rectRadius: 0.1, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c[0], { x: x + 0.3, y: y + 0.18, w: cw - 0.6, h: 0.6, fontFace: K.FONT_CODE, bold: true, fontSize: 16, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
      s.addText(c[1], { x: x + 0.3, y: y + 0.78, w: cw - 0.6, h: ch - 0.95, fontFace: FONT_BODY, fontSize: 15, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.15 });
    });

    K.addFooter(s, { pageNum: 7, label: 'Model-Based Control', dark: true });
    s.addNotes(
      'FeedbackRemoteSensorID and FeedbackSensorSource are the actual handoff: together they tell the steering TalonFX "don\'t trust your own rotor for position and velocity — read this CANcoder instead, every tick, not just once at boot." RotorToSensorRatio replaces SensorToMechanismRatio for the steer motor specifically, because the ratio it describes moved: it\'s no longer "rotor turns per mechanism turn," it\'s "rotor turns per CANcoder turn" — the same 25:1 number, new meaning. The drive motor never picked up a remote sensor, so its SensorToMechanismRatio keeps doing exactly what it always did. ContinuousWrap tells the steering closed loop that its mechanism is a circle — this part doesn\'t care which sensor feeds the loop, wrap-around is about the mechanism, not the sensor. Slot0 holds the gains the onboard loop will use, same as before.'
    );
  }

  // ============================================================ SLIDE 8 — SteerConstants + DriveConstants gains
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 3 · Constants.java', title: 'These gains produce volts, not fractions of full power' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.45, w: 11.9, h: 3.75, fontSize: 12,
      fileLabel: "Replace SteerConstants — keeping your own kSteerInverted — and add to DriveConstants",
      lines: [
        { text: 'public static final class SteerConstants {', color: 'FFD166' },
        { text: '  public static final double kSteerGearRatio = 25.0;  // rotor : CANcoder', color: 'D7E3F4' },
        { text: '  public static final double kSteerKP = 40.0;         // volts per rotation of error — tune', color: '9EF01A' },
        { text: '  public static final InvertedValue kSteerInverted =', color: 'D7E3F4' },
        { text: '      InvertedValue.CounterClockwise_Positive; // flip if your steering counts backward', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: 'public static final class DriveConstants {', color: 'FFD166' },
        { text: '  // ...existing constants stay...', color: '7FA8C9' },
        { text: '  public static final double kDriveKV = 0.8;   // volts per wheel rotation/sec — the model', color: '9EF01A' },
        { text: '  public static final double kDriveKP = 0.1;   // volts per rps of error — the trim', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.35, w: 11.9, h: 1.6,
      heading: 'kSteerKP = 40 means "40 volts per full rotation of error."',
      headingSize: 20,
      body: 'A wheel 90° off (0.25 rotations) gets 10 volts of push, easing off as it closes.',
      bodySize: 18,
    });

    K.addFooter(s, { pageNum: 8, label: 'Model-Based Control' });
    s.addNotes(
      'Note the units: these gains produce volts, not fractions of full power, because the control requests about to be used speak voltage. Same P control tuned twice already, wearing engineering units. Keep kSteerInverted from Lesson 7 when you replace SteerConstants — if you flipped it for your robot, keep your value. Nothing about Drivetrain\'s module array changes today — the constructor still takes the same five parameters it\'s taken since Lesson 7.'
    );
  }

  // ============================================================ SLIDE 9 — three methods go on a diet
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compressarrowsalt_white.png', eyebrow: 'Section 4 · SwerveModule.java', title: 'Deleting is the progress' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 4.5, fontSize: 10,
      fileLabel: 'Update these three methods in SwerveModule, dropping the gear-ratio division',
      lines: [
        { text: '/** Current steering angle in degrees — the CANcoder\'s own reading now. */', color: '7FA8C9' },
        { text: 'public double getSteerAngleDegrees() {', color: 'FFD166' },
        { text: '  return m_steerMotor.getPosition().getValue().in(Rotations) * 360.0;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** How far this module\'s wheel has driven, in meters, since the last reset. */', color: '7FA8C9' },
        { text: 'public double getDistanceMeters() {', color: 'FFD166' },
        { text: '  return m_driveMotor.getPosition().getValue().in(Rotations) * DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Current wheel speed in meters per second. */', color: '7FA8C9' },
        { text: 'public double getDriveVelocityMetersPerSec() {', color: 'FFD166' },
        { text: '  return m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) * DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Model-Based Control' });
    s.addNotes(
      'With the firmware doing mechanism math, three methods in SwerveModule simplify. This is the rare edit where deleting is the progress. The / kSteerGearRatio and / kDriveGearRatio steps didn\'t disappear — they moved into the firmware, steering\'s via RotorToSensorRatio and drive\'s via SensorToMechanismRatio. One source of truth for the ratio beats two, because two can disagree. Notice getSteerAngleDegrees() didn\'t need a single line changed to start reading the CANcoder instead of the rotor — the method only ever asked the steer motor for its position; what answers that question moved, and the method never noticed.'
    );
  }

  // ============================================================ SLIDE 10 — control request fields
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 5 · SwerveModule.java', title: 'Create the request once, reuse it every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.55, fontSize: 16,
      fileLabel: 'Add two control request fields to SwerveModule, up with the others',
      lines: [
        { text: 'private final PositionVoltage m_steerRequest = new PositionVoltage(0);', color: '9EF01A' },
        { text: 'private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.6, w: 11.9, h: 3.4,
      heading: 'A control request is a little message object — "run position control toward X."',
      headingSize: 21,
      body: 'Phoenix asks you to create it once and reuse it every tick rather than making a new one 50 times a second. setDesiredState — the method a command calls each tick — gets rewritten: out go the error math, the wrap loop, the clamp, the setThrottle(...) calls; in come two setControl calls that state goals.',
    });

    K.addFooter(s, { pageNum: 10, label: 'Model-Based Control' });
    s.addNotes(
      'Since the firmware now speaks real velocity, the drive target stays in meters per second, exactly as SwerveModuleVelocity already hands it in.'
    );
  }

  // ============================================================ SLIDE 11 — setDesiredState replacement
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 5 · SwerveModule.java', title: 'From "do the math" to "state the goal"' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 4.05, fontSize: 13,
      fileLabel: 'Replace setDesiredState in SwerveModule with',
      lines: [
        { text: '/** One tick of control: hand the firmware its targets. */', color: '7FA8C9' },
        { text: 'public void setDesiredState(SwerveModuleVelocity state) {', color: 'FFD166' },
        { text: '  // Steering: firmware position control. Phoenix speaks Units too — hand its', color: '7FA8C9' },
        { text: '  // Angle measure straight to withPosition, no degrees-to-rotations conversion.', color: '7FA8C9' },
        { text: '  m_steerMotor.setControl(m_steerRequest.withPosition(state.angle.getMeasure()));', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Drive: cosine compensation (Lesson 9), then firmware velocity control.', color: '7FA8C9' },
        { text: '  double error = state.angle.getDegrees() - getSteerAngleDegrees();', color: 'D7E3F4' },
        { text: '  double alignment = Math.cos(Math.toRadians(error));', color: 'D7E3F4' },
        { text: '  double wheelRps = state.velocity * alignment / DriveConstants.kWheelCircumferenceMeters;', color: 'D7E3F4' },
        { text: '  m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'Model-Based Control' });
    s.addNotes(
      'Look at what withPosition(state.angle.getMeasure()) replaced: measure, subtract, wrap, multiply, clamp, command — the whole Lesson 5 ritual — now happens inside the motor at 1 kHz, and there\'s not even an angle conversion to write, because Phoenix\'s control requests take Angle/AngularVelocity measures the same way WPILib does. The drive side still divides by circumference to get wheel rev/s, then wraps that in RotationsPerSecond.of(...) for withVelocity — that import is already there, from getDriveVelocityMetersPerSec()\'s own unpack a few lines up. The cosine trick stays in your code because it isn\'t a control loop; it\'s a decision about how hard to drive, and decisions are the coach\'s job.'
    );
  }

  // ============================================================ SLIDE 12 — delete clamp
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 5 · SwerveModule.java', title: 'Nothing calls clamp anymore' });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.4, bg: CARDBG,
      heading: 'Delete SwerveModule\'s private clamp method and its now-unused MathUtil import.',
      headingSize: 22,
      body: 'The steering setDesiredState was its only caller, and that math just moved into steerConfig.ClosedLoopGeneral/Slot0.',
    });

    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.5,
      heading: 'Drivetrain keeps its own separate clamp.',
      headingSize: 21,
      body: 'A different copy, still doing real work for turnToHeading and driveToPose. This deletion is SwerveModule\'s alone.',
    });

    K.addFooter(s, { pageNum: 12, label: 'Model-Based Control' });
    s.addNotes(
      'Nothing calls clamp anymore — the steering setDesiredState was its only caller, and that math just moved into steerConfig.ClosedLoopGeneral/Slot0 above.'
    );
  }

  // ============================================================ SLIDE 13 — kV/kP model-based control (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 5 · Where "model-based" earns its name', title: 'Predict with a model, correct with feedback' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('kV is a model of the motor.', { x: 1.0, y: 2.1, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, margin: 0 });
    s.addText('It answers "how many volts does one wheel rotation per second cost?" Request 10 rps, and the firmware immediately applies 10 × 0.8 = 8 volts because the model says that\'s what 10 rps costs — no waiting for error to build up.', {
      x: 1.0, y: 2.8, w: 5.25, h: 3.5, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('kP handles only the leftover.', { x: 7.05, y: 2.1, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, margin: 0 });
    s.addText('Friction, battery sag, carpet. The model does most of the work by prediction; feedback trims the rest by reaction — that division of labor is model-based control, and it\'s how every high-level controller you\'ll ever meet is built.', {
      x: 7.05, y: 2.8, w: 5.25, h: 3.5, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 13, label: 'Model-Based Control', dark: true });
    s.addNotes(
      'Ours is about 0.8 — at 12 volts that predicts ~15 wheel rps, which is the free-speed math from Lesson 10 read backwards. One thing that doesn\'t change: Drivetrain. It talks to modules through setDesiredState and the question-methods, and those signatures held steady while everything behind them was replaced — the encapsulation payoff, one more time, at refactor scale.'
    );
  }

  // ============================================================ SLIDE 14 — sim CANcoder field + constructor grab
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 6 · Is the sim still honest?', title: 'The CANcoder\'s sim state has never been fed' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 1.1, fontSize: 16,
      fileLabel: "Add its sim-state field next to the motors'",
      lines: [
        { text: 'private final CANcoderSimState m_steerEncoderSim;', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 2.95, w: 11.9, h: 1.1, fontSize: 16,
      fileLabel: 'Grab it in the constructor, alongside the other sim states',
      lines: [
        { text: 'm_steerEncoderSim = m_steerEncoder.getSimState();', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.55,
      body: 'Priming only ever read the CANcoder once, before simulatePeriodic() had run a single tick — a free ride that ends here. The steering closed loop now reads the CANcoder continuously, so it needs its own honest sim feed every tick, or the simulated firmware spends the whole match chasing a signal that never moves.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 14, label: 'Model-Based Control' });
    s.addNotes(
      'The sim state is always rotor-side, so the drive-side simulatePeriodic() multiply-back is untouched, and so is the steer-side rotor feed. But the CANcoder\'s sim state has gone this whole time without ever being fed, and it\'s gotten away with it — a freshly-built sim CANcoder defaults to 0, which happened to match the physics model\'s own starting zero, so the prime was accidentally correct every time.'
    );
  }

  // ============================================================ SLIDE 15 — simulatePeriodic CANcoder feed
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 6 · SwerveModule.java', title: 'Mechanism-side, no gear multiply' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.75, fontSize: 15,
      fileLabel: "Add to simulatePeriodic(), right after the steer motor's own rotor feed",
      lines: [
        { text: 'm_steerEncoderSim.setRawPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));', color: '9EF01A' },
        { text: 'm_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.7, w: 11.9, h: 3.2,
      heading: 'Unlike the rotor feed, there\'s no gear multiply here.',
      headingSize: 22,
      body: 'The CANcoder sits directly on the wheel, so it reads mechanism rotations straight from the model. That / (2 * Math.PI) is the same radians-to-rotations conversion the rotor feed already uses two lines up — this alpha has no shortcut method for that one division. One small bonus: sim has no real magnet to calibrate, so the model\'s own zero already stands in for "aligned to true forward."',
    });

    K.addFooter(s, { pageNum: 15, label: 'Model-Based Control' });
    s.addNotes(
      'The physics itself doesn\'t change — the same voltage still turns the same motor through the same gearbox. What changed is which sensor\'s sim state the closed loop trusts, so that\'s the sim state that has to stay honest.'
    );
  }

  // ============================================================ SLIDE 16 — run it / tuning
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'play_white.png', eyebrow: 'Section 7 · Run it and feel the difference', title: 'Model first, feedback second' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.1, dark: true,
      steps: [
        { title: './gradlew simulateJava → RobotTeleop', detail: 'Swerve tab open with both Telemetry/Drivetrain/ModuleStates and Telemetry/Drivetrain/DesiredModuleStates showing.' },
        { title: 'Drive hard, reverse abruptly, spin while translating', detail: 'The measured arrows should hug the desired ones noticeably tighter than last lesson.' },
        { title: 'Tune kSteerKP: too low lags, too high buzzes', detail: 'Same feel as any P gain from Lesson 5.' },
        { title: 'Tune kDriveKV first, then kDriveKP', detail: 'Set kDriveKP = 0, adjust kV until measured speed matches requested — then bring in a little kP for the residue.' },
      ],
    });

    K.addFooter(s, { pageNum: 16, label: 'Model-Based Control', dark: true });
    s.addNotes(
      'Steering snaps to new angles without the soft lag of 50 Hz P control, and wheel speeds land on their targets instead of drifting near them. kDriveKV is the interesting one to tune — get it right and kDriveKP barely has anything to do.'
    );
  }

  // ============================================================ SLIDE 17 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Watch the model work', body: 'Log applied voltage next to requested and measured speed. Command a step — voltage jumps instantly to kV × requested, before any error exists.', code: true },
        { title: 'Break the model on purpose', body: 'Set kDriveKV = 0.4 and watch kP struggle to make up the difference. Restore 0.8.' },
        { title: 'Turn off ContinuousWrap', body: 'Ask for a steer target across ±180° and watch the wheel take the long way. Turn it back on.' },
        { title: 'Prove priming is really dead', body: 'Add the deleted setPosition(...) line back. Run it and confirm nothing changes. Delete it again.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 17, label: 'Model-Based Control', dark: true });
    s.addNotes(
      'Watching the model work asks students to add a real log line — m_driveMotor.getMotorVoltage().getValue().in(Volts) — next to requested and measured speed, real code-writing. Breaking the model on purpose and toggling ContinuousWrap are single-value edits, predict-then-observe. Proving priming is dead is genuine code-writing too: re-add the deleted line, run it, confirm nothing changes, then delete it again — code you\'ve proven is dead is satisfying to remove.'
    );
  }

  // ============================================================ SLIDE 18 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The robot grew a second brain' });

    const points = [
      'A configuration object teaches each TalonFX about its mechanism once; reusable control requests turn setDesiredState from computing efforts into stating targets.',
      'kV is a model that predicts the voltage a speed costs; kP only corrects what the model missed — predict, then trim.',
      'A quick fix that solves the common case (priming) buys time to build the fix that solves all of them (continuous CANcoder feedback).',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 13', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('IO Layers', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Restructure the code so hardware sits behind a door your logic never has to open.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 18, label: 'Model-Based Control' });
    s.addNotes(
      'And the CANcoder primed from since Lesson 5 finally got read the way it deserved all along: not a one-time correction at boot, but a live source the firmware trusts every tick, so "where the wheel is" and "what the sensor says" can\'t quietly drift apart mid-match. Your code got shorter, your control got tighter, and Drivetrain never noticed a thing. Next, one of the biggest architectural ideas of the course: restructuring the code so hardware sits behind a door your logic never has to open.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '12-model-based-control.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
