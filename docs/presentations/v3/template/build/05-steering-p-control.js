const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 5 — Steering with P Control' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 5',
    title: 'Steering with P Control',
    subtitle: 'Turn to an angle, and hold it there',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'A swerve module\'s steering motor has to point the wheel at a commanded angle. The model students bring in is "if I want 90°, I\'ll set the motor to 90°" — reasonable, and not how motors work. A motor takes an effort, not a destination; there is no "go to 90°" knob. This lesson is the single most important idea in robotics: look at where you are, compare to where you want to be, push in the right direction, and keep re-checking until they match.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'The simplest feedback that actually works' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Add the module\'s steering motor and make it turn to a target angle on its own, using error times a gain.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.25 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'if / else, and comparisons in depth', options: { bullet: true, breakLine: true } },
        { text: 'Arithmetic that means something (error)', options: { bullet: true, breakLine: true } },
        { text: 'A lambda remembering a target', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('compass_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Setpoint, measurement, error', options: { bullet: true, breakLine: true } },
        { text: 'Proportional (P) control', options: { bullet: true, breakLine: true } },
        { text: 'A CANcoder, and priming', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Steering P Control' });
    s.addNotes(
      'Three words to learn that will follow students their whole robotics career: setpoint (where you want to be), measurement (where you are), error (setpoint minus measurement). The bigger the error, the harder you push; when error hits zero, you stop. That\'s the whole idea, and everything else in this lesson is just writing it down in Java.'
    );
  }

  // ============================================================ SLIDE 3 — setpoint, measurement, error
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 1 · The problem', title: 'A motor takes an effort, not a destination' });

    const cards = [
      ['Setpoint', 'Where you want to be.', '90°'],
      ['Measurement', 'Where you are.', '20°'],
      ['Error', 'Setpoint minus measurement.', '70°'],
    ];
    cards.forEach((c, i) => {
      const x = 0.7 + i * 4.05;
      s.addShape('roundRect', { x, y: 1.85, w: 3.85, h: 3.5, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c[0].toUpperCase(), { x: x + 0.3, y: 2.1, w: 3.25, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 0.5, margin: 0 });
      s.addText(c[2], { x: x + 0.3, y: 2.55, w: 3.25, h: 1.0, fontFace: FONT_HEAD, bold: true, fontSize: 44, color: WHITE, margin: 0 });
      s.addText(c[1], { x: x + 0.3, y: 3.65, w: 3.25, h: 1.5, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    });

    s.addText('The bigger the error, the harder you push. When error hits zero, you stop.', {
      x: 0.7, y: 5.55, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Steering P Control', dark: true });
    s.addNotes(
      'Say this slowly, because this is the idea the rest of the course builds on: a motor takes an effort — a speed, a voltage — not a destination. You have to drive it there yourself, tick after tick, by looking at where it is and comparing to where you want it. That\'s feedback control, and P control (proportional control) is the simplest useful form of it.'
    );
  }

  // ============================================================ SLIDE 4 — add the steering motor + sim
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 2 · DriveModule.java', title: 'A second motor, the same sim pattern' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.0, fontSize: 11,
      fileLabel: "Add to DriveModule, below the drive motor's fields",
      lines: [
        { text: 'private final TalonFX m_steerMotor =', color: 'D7E3F4' },
        { text: '    new TalonFX(Constants.DriveConstants.kSteerMotorPort, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '// Sim plumbing for the steering motor (same pattern as the drive motor).', color: '7FA8C9' },
        { text: 'private final TalonFXSimState m_steerSim = m_steerMotor.getSimState();', color: '9EF01A' },
        { text: 'private final DCMotorSim m_steerModel =', color: 'D7E3F4' },
        { text: '    new DCMotorSim(', color: 'D7E3F4' },
        { text: '        Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.004, 1.0),', color: '9EF01A' },
        { text: '        DCMotor.getKrakenX60(1));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.15, w: 11.9, h: 1.75,
      body: 'Step the steer physics in simulatePeriodic() right after the drive motor\'s four steps — same loop, second motor. Robot.simulationPeriodic() doesn\'t change at all.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 4, label: 'Steering P Control' });
    s.addNotes(
      'The steering motor is a second TalonFX, and it needs the same sim plumbing the drive motor got in Lesson 4 — the ordering rule applies again, m_steerSim is built by asking m_steerMotor for its sim state, so the motor field comes first. No new imports are needed; everything here arrived in Lesson 4. Worth reading the steering angle in degrees, not rotations: a real steering module has a big reduction between motor and wheel — this one steers through 25:1 — but to keep this lesson focused on P control rather than unit conversion, the sensor is treated as 1:1 with the wheel for now. Lesson 6 applies the gear-ratio pattern to the drive motor, and Lesson 7 gives steering its real 25:1 as part of growing up.'
    );
  }

  // ============================================================ SLIDE 5 — priming: why a relative sensor needs a memory
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 3 · A blind spot', title: 'Relative sensors forget where "forward" is' });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 5.85, h: 4.65, bg: CARDBG,
      heading: 'The steering motor\'s own sensor counts rotations from wherever it booted — not from a fixed reference.',
      headingSize: 21,
      body: 'Invisible on the bench. After a real match day of unplugging and replugging, there\'s no guarantee the wheel is anywhere near where it was last time.',
    });
    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      eyebrow: 'The fix: a CANcoder',
      eyebrowColor: TEAL,
      heading: 'A magnetic absolute encoder — the same true angle every time, power cycle or not.',
      headingColor: WHITE, headingSize: 21,
      body: 'Read it once at boot, and tell the steering motor\'s own sensor to start counting from there. That\'s priming.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 5, label: 'Steering P Control' });
    s.addNotes(
      'getSteerAngleDegrees() trusts the steering motor\'s own sensor completely, and that sensor has a blind spot: it\'s relative, counting rotations from wherever it happened to be when the robot powered on, not from any fixed reference. On the bench that\'s invisible, because the robot gets built with the wheel already close to "forward." On a real match day, after being unplugged, carried around, and replugged a dozen times, there\'s no guarantee the wheel is anywhere near where it was last time — and the sensor has no way to know. We won\'t make the steering motor read the CANcoder continuously yet — that\'s a firmware trick for Lesson 12. For now: read it once, right when the robot boots, and tell the steering motor\'s own sensor to start counting from there.'
    );
  }

  // ============================================================ SLIDE 6 — Constants + CANcoder + priming
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · Priming, in code', title: 'One reading, right at the start' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 5.2, fontSize: 11,
      fileLabel: 'Add the CANcoder field, then fill in the constructor',
      lines: [
        { text: 'private final CANcoder m_steerEncoder =', color: 'D7E3F4' },
        { text: '    new CANcoder(Constants.DriveConstants.kCancoderPort, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public DriveModule() {', color: 'FFD166' },
        { text: '  // Calibrate the CANcoder\'s zero to "wheel pointing forward"...', color: '7FA8C9' },
        { text: '  CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();', color: 'D7E3F4' },
        { text: '  cancoderConfig.MagnetSensor.MagnetOffset = SteerConstants.kMagnetOffset;', color: 'D7E3F4' },
        { text: '  m_steerEncoder.getConfigurator().apply(cancoderConfig);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // ...then prime the steering motor\'s own sensor to match it, once.', color: '7FA8C9' },
        { text: '  m_steerMotor.setPosition(m_steerEncoder.getAbsolutePosition().getValue().in(Rotations));', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  Scheduler.getDefault().addPeriodic(this::logTelemetry);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Steering P Control' });
    s.addNotes(
      'One calibration step first, worth explaining before the code: the CANcoder\'s own zero is wherever its magnet happens to be glued on — probably not "wheel pointing forward." You measure that gap once, with a number called the magnet offset — point the wheel straight forward by hand, read the CANcoder\'s raw position in Phoenix Tuner X, and store the negative of that reading as the offset. getConfigurator().apply(...) is a pattern that shows up constantly from here on: build a small object describing what you want, hand it to the device once, done. setPosition(...) is new — every Phoenix device lets you tell it what its own sensor should currently read, which is exactly what priming means: not moving the wheel, just correcting what the motor believes about where it already is. Two callouts worth mentioning if asked: a CAN device needs a moment after power-on before it reports real values, so if a prime ever looks like it read 0 instead of the real angle, that\'s the usual suspect; and a CANcoder reads counterclockwise-positive by default — if yours reads backwards, set MagnetSensor.SensorDirection = SensorDirectionValue.Clockwise_Positive, or priming will confidently seed the wrong zero every single boot.'
    );
  }

  // ============================================================ SLIDE 7 — proportional control
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 4 · The heart of the lesson', title: 'Measure, subtract, multiply, clamp, command' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 5.2, fontSize: 13,
      fileLabel: 'Add to DriveModule, below your other command factories',
      lines: [
        { text: 'public Command steerToAngle(double targetDegrees) {', color: 'FFD166' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '        double measurement = getSteerAngleDegrees();   // where we are', color: 'D7E3F4' },
        { text: '        double error = targetDegrees - measurement;    // how far off', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '        double output = SteerConstants.kP * error;     // push proportional', color: '9EF01A' },
        { text: '        output = clamp(output, -1.0, 1.0);              // never exceed full', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '        m_steerMotor.setThrottle(output);', color: 'D7E3F4' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> m_steerMotor.setThrottle(0))', color: '9EF01A' },
        { text: '      .named("Steer To Angle");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 7, label: 'Steering P Control' });
    s.addNotes(
      'This is the heart of the lesson — read it slowly, because this little method is the seed of every controller students will ever write. runRepeatedly(...).whenCanceled(...).named(...) is a chain built twice already: runRepeatedly is Lesson 2\'s shape, running fresh every tick, exactly what a controller needs since it has to keep re-measuring; whenCanceled is Lesson 1\'s shape, cleanup that fires once when something takes the module away. steerToAngle is just the first method that needed both at once. Also worth naming explicitly: the lambda remembers targetDegrees — a parameter of steerToAngle used tick after tick, long after the method returned. Lambdas hold onto the variables around them when they were created, which is the "tiny bit of state" this lesson promised, and it\'s why one factory method can produce a go-to-90 command and a go-to-0 command that each remember their own target. Also point out the comment about motors holding their last value: when this command is interrupted, its per-tick math stops running, so unless 0 is commanded in cleanup, the motor keeps applying whatever fraction it was last given and the wheel drifts.'
    );
  }

  // ============================================================ SLIDE 8 — walk through one tick
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 4 · One tick, worked out', title: 'Target 90°, currently at 20°' });

    K.addNumberedSteps(s, {
      startY: 1.9, rowH: 1.0, numberColor: TEAL, dark: true,
      steps: [
        { title: 'Read the measurement', detail: 'measurement = 20°, error = 90 − 20 = 70°' },
        { title: 'Compute the output', detail: 'output = kP × error = 0.0005 × 70 ≈ 0.035 (about 3.5% power)' },
        { title: 'Error shrinks as it turns', detail: 'measurement rises toward 90°, so error — and output — shrink with it' },
        { title: 'Ease in and hold', detail: 'Near 90°, error ≈ 0, output ≈ 0 — it settles and stays' },
      ],
    });

    s.addText('Overshoot past 90° and error goes negative, so output goes negative and the motor pushes back. The sign carries direction; the size carries how hard.', {
      x: 0.7, y: 5.9, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 8, label: 'Steering P Control', dark: true });
    s.addNotes(
      'Walk this out loud as a story, not just numbers: with kP = 0.0005, an error of 70° gives output = 0.035, about 3.5% power toward the target — a Kraken X60 spinning something this light doesn\'t need much to get moving. As the motor turns and measurement rises, error shrinks, so output shrinks with it. Near 90°, error is roughly 0, output is roughly 0 — it eases in and holds. That gentle slow-down is what "proportional" buys you: no slamming into the target. And the math handles direction for free — overshoot past 90° and error goes negative, so output goes negative and the motor pushes back. The sign of the error carries which way to go; the size carries how hard.'
    );
  }

  // ============================================================ SLIDE 9 — clamp + kP as a tuning constant
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 4 · Two supporting pieces', title: 'A safety clamp, and one named constant' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.15, fontSize: 12,
      fileLabel: 'Add to DriveModule, right after steerToAngle',
      lines: [
        { text: 'private double clamp(double value, double min, double max) {', color: 'FFD166' },
        { text: '  if (value > max) {', color: 'D7E3F4' },
        { text: '    return max;', color: 'D7E3F4' },
        { text: '  } else if (value < min) {', color: 'D7E3F4' },
        { text: '    return min;', color: 'D7E3F4' },
        { text: '  } else {', color: 'D7E3F4' },
        { text: '    return value;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.85,
      body: 'kP is a tuning constant — SteerConstants.kP = 0.0005 in Constants.java, never reassigned. clamp is if / else if / else: without it, a large error could ask for more power than the motor has.',
    });

    K.addFooter(s, { pageNum: 9, label: 'Steering P Control' });
    s.addNotes(
      'clamp shows off if / else if / else — one decision, three branches, exactly one of which runs. Without it, a large error could compute an output like 5.0, which the motor can\'t do; clamping keeps commands sane. It\'s private, like applyDeadband was back in Lesson 2 — internal plumbing, placed right below the method that uses it. kP itself is a tuning constant, a number you\'ll adjust over and over, and numbers like that live in Constants.java in a nested class named for the subsystem area they belong to. public static final reads as: anyone can see it, there\'s exactly one of it — no object needed, you write SteerConstants.kP just like Math.abs — and it can never be reassigned. One named number, one home, every place that needs it points here. That\'s the whole philosophy of Constants.java.'
    );
  }

  // ============================================================ SLIDE 10 — bind it and tune
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 5 · MyTeleop.java', title: 'onTrue: schedule once, and walk away' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.05, fontSize: 15,
      fileLabel: "Add to MyTeleop's constructor, with the rest of the wiring",
      lines: [
        { text: '// Tap the left face button to steer to 90° and hold it there.', color: '7FA8C9' },
        { text: 'robot.driverController.westFace().onTrue(robot.module.steerToAngle(90));', color: '9EF01A' },
        { text: 'robot.driverController.northFace().onTrue(robot.module.steerToAngle(0));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 2.8,
      heading: 'whileTrue held; onTrue fires once and lets go.',
      headingSize: 22,
      body: 'Since steerToAngle never finishes on its own, one tap sends the module to 90° and holds it — no need to keep the button down. Tap the other button and the scheduler swaps commands, firing the old one\'s whenCanceled cleanup on the way out.',
    });

    K.addFooter(s, { pageNum: 10, label: 'Steering P Control' });
    s.addNotes(
      'New word: onTrue, where Lesson 1 used whileTrue. whileTrue runs a command while you hold the button; onTrue schedules it once when the button is pressed and then walks away. Since steerToAngle is built on runRepeatedly, it never finishes on its own — so a single tap of the west button sends the module to 90° and holds it there, no need to keep the button down. Tap the north button and the scheduler swaps commands: one command per mechanism, so scheduling the go-to-0 command cancels the go-to-90 one, firing its whenCanceled cleanup on the way out. Worth calling out as a callout of its own: while a steering command owns the module, the joystick stops driving the wheel — the Lesson 2 default command only runs when no other command is using the mechanism, and steerToAngle never lets go. That\'s the one-command-per-mechanism rule doing exactly what it promised; it\'s fine here since we\'re steering, not driving, and the module learns to do both at once when it grows up in Lesson 7.'
    );
  }

  // ============================================================ SLIDE 11 — run it, tune kP
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'play_white.png', eyebrow: 'Section 5 · Run it', title: 'Tuning kP by watching the plot' });

    const rows = [
      ['kP too small', 'Crawls to 90° and takes forever (or never gets there).'],
      ['kP too big', 'Overshoots and oscillates back and forth around 90°.'],
      ['kP just right', 'Quick, smooth, settles near 90° and stays.'],
    ];
    rows.forEach((r, i) => {
      const y = 1.85 + i * 1.35;
      s.addShape('roundRect', { x: 0.7, y, w: 11.9, h: 1.2, rectRadius: 0.1, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(r[0], { x: 1.0, y: y + 0.18, w: 3.4, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'middle', margin: 0 });
      s.addText(r[1], { x: 4.6, y: y + 0.18, w: 7.7, h: 0.85, fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 });
    });

    K.addFooter(s, { pageNum: 11, label: 'Steering P Control', dark: true });
    s.addNotes(
      'Before running it, add the steering angle to logTelemetry() the same place drive readings have been logging since Lesson 3, so the plot in AdvantageScope actually shows something. Tuning kP by watching the plot is the job — start at 0.0005, double it until it oscillates, then back off. This intuition transfers to every controller students will ever write, so it\'s worth letting them actually watch all three states (too small, too big, just right) rather than just telling them what each looks like.'
    );
  }

  // ============================================================ SLIDE 12 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Shortest path', body: 'Wrap error to -180°..180° with two while loops. Test 350° → 0°: it should move +10°.' },
        { title: 'Log the error', body: 'SteerErrorDegrees, right after error is computed. Plot it decaying toward zero.' },
        { title: 'Try kP = 0', body: 'Then a negative kP. Predict first, then run it, and explain what you saw.' },
      ],
    });

    K.addFooter(s, { pageNum: 12, label: 'Steering P Control', dark: true });
    s.addNotes(
      'The shortest-path exercise is worth setting up with the wrinkle it fixes: ask for 0° while sitting at 350°. Error = 0 − 350 = −350, so it spins almost all the way around backwards — when it could have nudged +10° forward. Real steering code wraps the error to the range −180°…+180° so it always takes the short path; the two while loops in the exercise are the fix, and it\'s students\' first while loop — it repeats until the condition is false. Logging the error is Lesson 3\'s refinement applied again: a value that only exists inside a command gets logged where it\'s computed. The kP = 0 / negative-kP exercise is a genuine predict-then-check: 0 means no output ever, so the wheel never moves regardless of error; negative kP pushes the wrong direction and error grows instead of shrinking.'
    );
  }

  // ============================================================ SLIDE 13 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The most important idea in robotics' });

    const points = [
      'setpoint − measurement = error, output = kP × error — the shrinking error eases you into the target, and its sign steers direction.',
      'Tune kP against a live plot: double it until it oscillates, then back off.',
      'Priming: read an absolute sensor once at boot, and tell a relative one\'s counter to match it.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 6', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Distance & Commands', { x: 8.3, y: 3.1, w: 4.0, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    s.addText('The same measure-subtract-multiply shape, pointed at a different sensor.', {
      x: 8.3, y: 4.1, w: 4.0, h: 1.4, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 13, label: 'Steering P Control' });
    s.addNotes(
      'P control earns its billing as the most important idea in robotics, so it\'s worth saying one more time: motors take effort, not destinations, so you close the gap yourself — setpoint − measurement = error, output = kP × error, and the shrinking error eases you into the target while its sign steers the direction. Hold onto the shape of steerToAngle: measure, subtract, multiply, clamp, command. The same five moves point a whole chassis at a compass heading in Lesson 8 — only the sensor changes, which is a sign something real was learned. One more habit worth naming as smaller but just as real: priming. The steering motor\'s own sensor only knows change, not place, so it got a memory — read the CANcoder once at startup, tell the motor\'s sensor to match. It isn\'t the whole fix — Lesson 12 finishes that job — but it\'s the part that matters on the very first boot, which is most of them.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '05-steering-p-control.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
