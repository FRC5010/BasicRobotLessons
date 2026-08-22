const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 2 — Joystick Control' });

  K.addTitleSlide(p, {
    tag: 'LESSON 2',
    title: 'Joystick Control',
    subtitle: 'Drive the motor with a stick, not a button',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Push further, spin faster' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.55, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Replace the fixed-speed button with smooth, proportional control from a joystick axis, with a deadband so the motor doesn\'t creep when the stick is centered.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.25, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Parameters and return values, closer look', options: { bullet: true, breakLine: true } },
        { text: 'double, and basic math', options: { bullet: true, breakLine: true } },
        { text: 'Lambdas and suppliers', options: { bullet: true, breakLine: true } },
        { text: 'Math helper methods', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('gamepad_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Reading a controller axis', options: { bullet: true, breakLine: true } },
        { text: 'Default commands', options: { bullet: true, breakLine: true } },
        { text: 'Deadband — cleaning up messy input', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Joystick Control' });
  }

  // ============================================================ SLIDE 3 — an axis is a number, but a live one
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 1 · A moving target', title: 'A snapshot isn\'t enough' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.35, fontSize: 22,
      lines: [{ text: 'double y = robot.driverController.getLeftY();', color: '9EF01A' }],
    });

    K.addCard(s, {
      x: 0.7, y: 3.35, w: 11.9, h: 3.4,
      heading: 'A double you grabbed once is frozen — where the stick was, not where it is.',
      headingSize: 22,
      body: 'An axis reports a double from -1.0 to 1.0, centered near 0.0. But the stick changes every moment — what a command needs is something it can ask for the current value on every tick. That\'s what a supplier is for.',
    });

    K.addFooter(s, { pageNum: 3, label: 'Joystick Control' });
  }

  // ============================================================ SLIDE 4 — lambdas and suppliers
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 2 · Lambdas', title: 'Code, stored as data' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.1, fontSize: 19,
      lines: [
        { text: 'DoubleSupplier stickReader = () -> robot.driverController.getLeftY();', color: '9EF01A' },
        { text: 'double position = stickReader.getAsDouble();  // runs the stored code now', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.6,
      heading: 'A lambda is a value, just like 3.7 or a TalonFX object.',
      headingSize: 22,
      body: 'DoubleSupplier is the type for a lambda that takes no arguments and returns a double. Nothing runs when you assign it — calling .getAsDouble() is what runs it, fresh, every time.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Joystick Control' });
  }

  // ============================================================ SLIDE 5 — driveWithJoystick
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · DriveModule.java', title: 'A command that reads the stick every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.1, fontSize: 18,
      lines: [
        { text: '/** Drives continuously using a live speed source (e.g. a joystick axis). */', color: '7FA8C9' },
        { text: 'public Command driveWithJoystick(DoubleSupplier speedSupplier) {', color: 'FFD166' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '    double raw = speedSupplier.getAsDouble();   // fetch fresh value this tick', color: 'D7E3F4' },
        { text: '    double speed = applyDeadband(raw, 0.1);     // clean it up', color: 'D7E3F4' },
        { text: '    m_driveMotor.setThrottle(speed);', color: 'D7E3F4' },
        { text: '  }).named("Drive With Joystick");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.15, w: 11.9, h: 1.75,
      body: 'runRepeatedly(...) runs its lambda once per tick, forever, until canceled — no coroutine.park() needed; the repeating loop itself keeps the command alive.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: 'Joystick Control' });
  }

  // ============================================================ SLIDE 6 — deadband
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 3 · Deadband', title: 'A resting stick should mean a resting motor' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 6.6, h: 3.0, fontSize: 18,
      lines: [
        { text: '/** 0 when |value| is within band, else passes value through. */', color: '7FA8C9' },
        { text: 'private double applyDeadband(double value, double band) {', color: 'FFD166' },
        { text: '  if (Math.abs(value) < band) {', color: 'D7E3F4' },
        { text: '    return 0.0;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  return value;', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 7.5, y: 1.75, w: 5.1, h: 4.65,
      heading: 'Three new pieces in six lines.',
      headingSize: 22,
      body: 'if (condition) { ... } runs its block only when true. Math.abs(value) drops the sign, so one check covers forward and reverse. return hands a value back and stops the method on the spot.',
    });

    s.addText('WPILib ships MathUtil.applyDeadband(value, band) that does this. You wrote your own so you\'d know exactly what\'s inside it.', {
      x: 0.7, y: 4.95, w: 6.6, h: 1.6, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 6, label: 'Joystick Control' });
  }

  // ============================================================ SLIDE 7 — default command
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 4 · MyTeleop.java', title: 'What the module does when nothing else asks' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.75, fontSize: 18,
      lines: [
        { text: 'robot.module.setDefaultCommand(', color: 'D7E3F4' },
        { text: '    robot.module.driveWithJoystick(() -> -robot.driverController.getLeftY()));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.75, w: 11.9, h: 3.05,
      heading: 'A default command runs automatically whenever no other command is using the mechanism.',
      headingSize: 21,
      body: 'The minus sign matters: on most sticks, pushing forward reads negative. Negating makes "push forward" mean "drive forward." When some other command takes over the module, the default steps aside — and resumes on its own the instant that command finishes. You never write that hand-off.',
    });

    K.addFooter(s, { pageNum: 7, label: 'Joystick Control' });
  }

  // ============================================================ SLIDE 8 — run it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'play_white.png', eyebrow: 'Section 5 · Run it', title: 'Push the stick, watch it track' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 2.15, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('./gradlew simulateJava → My Teleop → Enabled', {
      x: 1.0, y: 2.0, w: 11.3, h: 0.5, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('Push the left stick (or SimGUI\'s joystick slider). Output should track the stick, snap to zero near center, and reverse when you pull back.', {
      x: 1.0, y: 2.6, w: 11.3, h: 1.2, fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addShape('roundRect', { x: 0.7, y: 4.2, w: 11.9, h: 1.9, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('If it creeps at rest instead of holding zero, your deadband isn\'t in the path — check that driveWithJoystick really calls applyDeadband.', {
      x: 1.0, y: 4.4, w: 11.3, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 8, label: 'Joystick Control', dark: true });
  }

  // ============================================================ SLIDE 9 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Slow mode', body: 'A scale parameter multiplied into the speed. Bind the right bumper to 0.25 for fine control.' },
        { title: 'Square the input', body: 'speed * Math.abs(speed) for finer low-speed control. Why keep Math.abs? What breaks without it?' },
        { title: 'Print raw vs. deadbanded', body: 'System.out.println both, and watch how much the raw value jitters at rest.' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Joystick Control', dark: true });
  }

  // ============================================================ SLIDE 10 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Live data needs code, not just a number' });

    const points = [
      'A lambda is code stored as data — a DoubleSupplier a command re-asks every tick.',
      'if, Math.abs, and return combine into a deadband: a resting stick means a resting motor.',
      'A default command is what a mechanism does when nothing else claims it — the scheduler hands control back on its own.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 12 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 3', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Telemetry', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Make the robot\'s numbers visible, because plots beat print statements.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 10, label: 'Joystick Control' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '02-joystick-control.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
