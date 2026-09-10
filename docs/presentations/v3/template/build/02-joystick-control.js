const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 2 — Joystick Control' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 2',
    title: 'Joystick Control',
    subtitle: 'Drive the motor with a stick, not a button',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'This lesson replaces Lesson 1\'s fixed 0.3 with a live joystick reading — the first time a command reads something that changes continuously instead of a value baked in at compile time.'
  );

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
    s.addNotes(
      'Lesson 1 spun the motor at a fixed 0.3 on a button press — the number never changed. This lesson replaces that constant with whatever the joystick axis reads right now, so the motor speed tracks the stick continuously instead of snapping to one value. The deadband exists because a real joystick almost never reports exactly 0.0 at rest — a tiny bit of drift or noise would otherwise make the motor creep even when the driver isn\'t touching the stick.'
    );
  }

  // ============================================================ SLIDE 3 — an axis is a number, but a live one
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 1 · A moving target', title: 'A snapshot isn\'t enough' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.35, fontSize: 22,
      fileLabel: 'Nothing to add — this is just how you read one',
      example: true,
      lines: [{ text: 'double y = robot.driverController.getLeftY();', color: '9EF01A' }],
    });

    K.addCard(s, {
      x: 0.7, y: 3.35, w: 11.9, h: 3.4,
      heading: 'A double you grabbed once is frozen — where the stick was, not where it is.',
      headingSize: 22,
      body: 'An axis reports a double from -1.0 to 1.0, centered near 0.0. But the stick changes every moment — what a command needs is something it can ask for the current value on every tick. That\'s what a supplier is for.',
    });

    K.addFooter(s, { pageNum: 3, label: 'Joystick Control' });
    s.addNotes(
      'getLeftY() returns a double — whatever the stick position was at the exact instant you called it. If you grab that value once when the command is built, it\'s frozen forever at that reading; the motor would run at whatever speed the stick happened to be at when the code first ran, never updating again. What a repeating command actually needs is a way to ask "what is it right now?" on every single tick — that\'s the problem a supplier solves, and it\'s the reason the next two slides build up to DoubleSupplier before touching DriveModule at all.'
    );
  }

  // ============================================================ SLIDE 4 — lambdas and suppliers
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 2 · Lambdas', title: 'Code, stored as data' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.1, fontSize: 15,
      fileLabel: 'Nothing to add — just an example, not code for any file',
      example: true,
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
    s.addNotes(
      'A lambda — the () -> ... syntax — packages up a little bit of code and hands it around like any other value, the same way 3.7 or a TalonFX object is a value. Nothing inside the lambda runs when you write stickReader = () -> ...; that line just stores the code for later. Calling .getAsDouble() is the moment it actually runs, and it runs fresh every time you call it — that\'s exactly the "ask again right now" behavior the previous slide was missing. DoubleSupplier is the specific type for "a lambda with no arguments that returns a double"; there are other Supplier types for other return types, but this is the one the joystick axis needs.'
    );
  }

  // ============================================================ SLIDE 5 — driveWithJoystick
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · DriveModule.java', title: 'A command that reads the stick every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.05, fontSize: 13,
      fileLabel: 'Add to DriveModule, below driveAtSpeed',
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
    s.addNotes(
      'driveWithJoystick takes a DoubleSupplier as its parameter instead of a fixed double — that\'s the whole trick. Every tick, runRepeatedly\'s lambda calls speedSupplier.getAsDouble() to get a brand-new reading, runs it through applyDeadband, and sends it to the motor. Point out that the lambda body here has multiple statements, which is why it needs curly braces — the single-expression lambda from the previous slide didn\'t need them. This file won\'t compile yet on purpose: applyDeadband doesn\'t exist until the next section, and that\'s fine — it\'s a normal part of building up a file piece by piece.'
    );
  }

  // ============================================================ SLIDE 6 — deadband
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 3 · Deadband', title: 'A resting stick should mean a resting motor' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.85, fontSize: 14,
      fileLabel: 'Add to DriveModule, below driveWithJoystick',
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
      x: 0.7, y: 4.75, w: 11.9, h: 2.15,
      heading: 'Three new pieces in six lines.',
      headingSize: 22,
      body: 'if (condition) {...} runs only when true. Math.abs(value) drops the sign, covering both directions with one check. return hands back a value and exits.',
    });

    K.addFooter(s, { pageNum: 6, label: 'Joystick Control' });
    s.addNotes(
      'This is a private helper method — private because nothing outside DriveModule needs to call it, it exists purely to keep driveWithJoystick readable. Trace an example out loud: applyDeadband(0.03, 0.1) — Math.abs(0.03) is 0.03, which is less than 0.1, so it returns 0.0. applyDeadband(0.6, 0.1) — Math.abs(0.6) is 0.6, not less than 0.1, so it returns 0.6 unchanged. Worth mentioning that WPILib actually ships MathUtil.applyDeadband as a library method that does this exact job — writing it by hand once here is what makes reaching for the built-in one later feel like a shortcut instead of a mystery.'
    );
  }

  // ============================================================ SLIDE 7 — default command
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 4 · MyTeleop.java', title: 'What the module does when nothing else asks' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.05, fontSize: 14,
      fileLabel: "Edit MyTeleop's constructor",
      lines: [
        { text: 'robot.module.setDefaultCommand(', color: 'D7E3F4' },
        { text: '    robot.module.driveWithJoystick(() -> -robot.driverController.getLeftY()));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 2.8,
      heading: 'A default command runs automatically whenever no other command is using the mechanism.',
      headingSize: 21,
      body: 'The minus sign matters: on most sticks, pushing forward reads negative. Negating makes "push forward" mean "drive forward." When another command takes the module, the default steps aside, and resumes the instant it finishes.',
    });

    K.addFooter(s, { pageNum: 7, label: 'Joystick Control' });
    s.addNotes(
      'Read the binding from the inside out: () -> -robot.driverController.getLeftY() is a lambda — a DoubleSupplier — that reads the stick and flips its sign. That lambda gets passed into driveWithJoystick, which returns a Command, and that Command becomes the module\'s default. A default command is simply "what runs when nothing else is asking for this mechanism" — driving is the normal state for a drivetrain, so it makes sense as the default rather than something you\'d trigger with a button. The scheduler handles the handoff automatically: schedule some other command that requires the module, and the default steps aside for as long as that command runs, then resumes the instant it finishes or is canceled — no code in driveWithJoystick itself has to know that\'s happening.'
    );
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
    s.addNotes(
      'Nothing needs to be scheduled by hand this time — that\'s the point of a default command. As soon as the robot enables in teleop, the module is already running driveWithJoystick because no other command has claimed it. Push the stick forward and the motor should spin one direction; pull back and it should reverse; let go and it should settle at exactly zero rather than drifting. If it creeps at rest, the most common cause is that driveWithJoystick isn\'t actually routing through applyDeadband — double check the call is really there before assuming the deadband math itself is wrong.'
    );
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
    s.addNotes(
      'Slow mode is a good first extension because it reuses everything just built — one more parameter, one more multiply, one more button binding, nothing new conceptually. Squaring the input (speed * Math.abs(speed), not speed * speed) is worth pausing on: ask why Math.abs has to stay in there — squaring alone would always return a positive number and the motor would never reverse, since a negative times a negative is positive. Printing raw vs. deadbanded side by side is the most convincing demo of why the deadband exists at all — students can watch the raw number jitter near zero while the deadbanded one sits rock steady at 0.0.'
    );
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
    s.addNotes(
      'The big idea this lesson adds is that not every value a command needs is known up front — some of it has to be fetched fresh, tick after tick, and a lambda stored as a DoubleSupplier is how Java lets you pass around "go get the current value" instead of just a value. if, Math.abs, and return are ordinary building blocks, but stacked together they solve a real problem: a joystick that never quite reads zero. And a default command is the first time a mechanism does something without anybody explicitly telling it to on that tick — worth sitting with, because most of the commands still to come will interrupt this one temporarily rather than replace it for good.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '02-joystick-control.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
