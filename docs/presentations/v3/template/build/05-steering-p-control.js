const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 5 — Steering with P Control' });

  K.addTitleSlide(p, {
    tag: 'LESSON 5',
    title: 'Steering with P Control',
    subtitle: 'Turn to an angle, and hold it there',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

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
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '05-steering-p-control.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
