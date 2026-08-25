const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 8 — Gyro & Heading' });

  K.addTitleSlide(p, {
    tag: 'LESSON 8',
    title: 'Gyro & Heading',
    subtitle: 'Turn the robot to a compass direction and stop',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'The same P control, pointed at the whole robot' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.55, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Add a Pigeon 2 to the Drivetrain, then use Lesson 5\'s P control to make the chassis turn to a target heading and stop — using real chassis rotation.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.25, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Adding a field to an existing mechanism', options: { bullet: true, breakLine: true } },
        { text: 'Reusing a pattern on a whole-robot quantity', options: { bullet: true, breakLine: true } },
        { text: 'Extracting a helper to avoid duplicating logic', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('compass_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'The gyroscope and yaw (heading)', options: { bullet: true, breakLine: true } },
        { text: 'Closing a control loop on heading', options: { bullet: true, breakLine: true } },
        { text: 'Faking a gyro by integrating commanded rate', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 3 — gyro field + getHeadingDegrees
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 1 · Drivetrain.java', title: 'A chassis fact belongs on the Drivetrain' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.35, fontSize: 12,
      fileLabel: 'Add to Drivetrain, below the modules array',
      lines: [
        { text: 'private final Pigeon2 m_gyro = new Pigeon2(0, CANBus.systemcore(0)); // CAN ID 0', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '// Remembered for the sim: what rotation rate did we just command?', color: '7FA8C9' },
        { text: 'private double m_lastCommandedOmega = 0.0;', color: 'D7E3F4' },
        { text: 'private double m_simHeadingDegrees  = 0.0;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Robot heading in degrees (CCW positive). */', color: '7FA8C9' },
        { text: 'public double getHeadingDegrees() {', color: 'FFD166' },
        { text: '  return m_gyro.getYaw().getValue().in(Degrees);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.15, w: 11.9, h: 1.7,
      body: 'No single module knows the chassis heading, so it lives on Drivetrain. m_lastCommandedOmega and m_simHeadingDegrees are plain mutable doubles — memory, not final hardware.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 3, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 4 — structured telemetry for heading
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 1 · Drivetrain.java', title: "StructPublisher — one value, not an array" });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.15, fontSize: 15,
      fileLabel: 'Add the publisher, next to m_moduleStatesPublisher',
      lines: [
        { text: 'private final StructPublisher<Rotation2d> m_headingPublisher =', color: 'D7E3F4' },
        { text: '    NetworkTableInstance.getDefault()', color: 'D7E3F4' },
        { text: '        .getStructTopic("Drivetrain/Heading", Rotation2d.struct)', color: '9EF01A' },
        { text: '        .publish();', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.7,
      heading: 'The plain number is for line graphs; the Rotation2d is for the Swerve tab.',
      headingSize: 21,
      body: 'StructPublisher is StructArrayPublisher\'s singular sibling from Lesson 7 — same bridge, one value instead of an array. Same fact, packaged for a tool that draws instead of plots.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 5 — extract commandRotation
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 2 · Extract a helper', title: 'Copied code is a bug with a delay on it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.3, fontSize: 12,
      fileLabel: 'Add a helper, then replace rotate with the one-liner',
      lines: [
        { text: 'private void commandRotation(double omega) {', color: 'FFD166' },
        { text: '  m_lastCommandedOmega = omega;', color: '9EF01A' },
        { text: '  for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '    /* ...same tangent-angle math rotate() already had... */', color: '7FA8C9' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public Command rotate(double omega) {', color: 'FFD166' },
        { text: '  return runRepeatedly(() -> commandRotation(omega)).named("Rotate");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.05, w: 11.9, h: 1.9,
      body: 'rotate\'s whole body became one line that says what it wants; the helper holds the how. turnToHeading needs the same math with a different omega each tick — now both callers share it.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 6 — turnToHeading
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'Measure, subtract, multiply, clamp, command' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.2, fontSize: 12,
      fileLabel: 'Add to Drivetrain, with the other command factories',
      lines: [
        { text: '/** Signed error to \'target\', wrapped to (-180, 180]. */', color: '7FA8C9' },
        { text: 'private double headingError(double targetDegrees) { /* ...wrap, like Lesson 5... */ }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Turn to face \'targetDegrees\'. Finishes when within 2°. */', color: '7FA8C9' },
        { text: 'public Command turnToHeading(double targetDegrees) {', color: 'FFD166' },
        { text: '  return run(coroutine -> {', color: 'D7E3F4' },
        { text: '        while (Math.abs(headingError(targetDegrees)) >= 2.0) {', color: 'D7E3F4' },
        { text: '          double omega = clamp(HeadingConstants.kP * headingError(targetDegrees), -0.5, 0.5);', color: '9EF01A' },
        { text: '          commandRotation(omega);', color: 'D7E3F4' },
        { text: '          coroutine.yield();', color: '9EF01A' },
        { text: '        }', color: 'D7E3F4' },
        { text: '        commandRotation(0.0); // reached it — stop', color: 'D7E3F4' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> commandRotation(0.0))', color: '9EF01A' },
        { text: '      .named("Turn To Heading");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 7 — the while loop, explained
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 3 · Real work every pass', title: "Not just waiting — computing, every tick" });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('coroutine.yield()', { x: 1.0, y: 2.1, w: 5.25, h: 0.4, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, margin: 0 });
    s.addText('Suspends until the next tick — exactly what waitUntil(...) did under the hood in Lesson 6, just written out by hand because this loop has real work on every pass, not just a condition to poll.', {
      x: 1.0, y: 2.6, w: 5.25, h: 3.6, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Two endings, same as driveDistance', { x: 7.05, y: 2.1, w: 5.25, h: 0.4, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, margin: 0 });
    s.addText('The finish condition calls the same headingError the loop used — "done" means "within 2° by the shortest path," and the wrap logic can\'t disagree with itself.', {
      x: 7.05, y: 2.6, w: 5.25, h: 3.6, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 7, label: 'Gyro & Heading', dark: true });
  }

  // ============================================================ SLIDE 8 — wire it up
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 4 · MyTeleop.java', title: 'Two free buttons, two headings' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.85, fontSize: 16,
      fileLabel: "Add two taps to MyTeleop's constructor",
      lines: [
        { text: '// Tap the bottom face button to face 90°; the right face button for 0°.', color: '7FA8C9' },
        { text: 'robot.driverController.southFace().onTrue(robot.drivetrain.turnToHeading(90));', color: '9EF01A' },
        { text: 'robot.driverController.eastFace().onTrue(robot.drivetrain.turnToHeading(0));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.9, w: 11.9, h: 3.0,
      heading: 'Unlike Lesson 5\'s steerToAngle, this command finishes.',
      headingSize: 22,
      body: 'Pressing the bottom button cancels the default translate; when turnToHeading finishes (or is interrupted), the default resumes automatically — the stick comes back to life on its own.',
    });

    K.addFooter(s, { pageNum: 8, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 9 — fake the gyro in sim
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 5 · Drivetrain.java', title: 'Close the loop yourself: integrate the commanded rate' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.15, fontSize: 15,
      fileLabel: "Edit Drivetrain's simulatePeriodic()",
      lines: [
        { text: '// New: integrate the commanded angular rate into a fake heading.', color: '7FA8C9' },
        { text: 'm_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020; // one 20 ms tick', color: '9EF01A' },
        { text: 'm_gyro.getSimState().setRawYaw(m_simHeadingDegrees);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.7,
      heading: 'Integrating: every tick, add rate × time to a running total.',
      headingSize: 21,
      body: 'Rotating at 180°/s for one 20 ms tick adds 3.6°; do that fifty times a second and the total is the heading. Same command → model → fake sensor loop as Lesson 4, one line of model.',
    });

    K.addFooter(s, { pageNum: 9, label: 'Gyro & Heading' });
  }

  // ============================================================ SLIDE 10 — run it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'play_white.png', eyebrow: 'Section 6 · Run it', title: 'P control on a whole-robot quantity' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15, dark: true,
      steps: [
        { title: './gradlew simulateJava → My Teleop → Enabled', detail: 'Plot Drivetrain/HeadingDegrees in AdvantageScope.' },
        { title: 'Press the bottom face button', detail: 'Heading sweeps toward 90°, slows as it approaches, settles inside ±2°.' },
        { title: 'Watch the Swerve tab', detail: 'Drop Drivetrain/Heading into the Rotation slot — the chassis diagram turns too.' },
        { title: 'Tune kP the Lesson 5 way', detail: 'Too small crawls; too big oscillates; just right settles quick and smooth.' },
      ],
    });

    K.addFooter(s, { pageNum: 10, label: 'Gyro & Heading', dark: true });
  }

  // ============================================================ SLIDE 11 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Prove the wrap works', body: 'From 90°, bind turnToHeading(-170). It should sweep +100° through 180°, not -260°.' },
        { title: 'Snap to nearest 90°', body: 'Math.round(heading / 90.0) * 90.0 — turn to the closest multiple of 90.' },
        { title: 'Zero the gyro at start', body: 'A zeroHeading() command with one statement — no coroutine.park(), it finishes instantly.' },
        { title: 'Move the gyro ID into Constants', body: 'kGyroPort, right alongside the twelve motor and CANcoder ports from Lesson 7.' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'Gyro & Heading', dark: true });
  }

  // ============================================================ SLIDE 12 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'What didn\'t change is the point' });

    const points = [
      'Turning a whole robot to face 90° is the same five moves as pointing one wheel — measure, subtract, multiply, clamp, command.',
      'When a second caller needs the same math, extract a helper — copied code is a bug with a delay on it.',
      'When the physics doesn\'t exist yet, fake the sensor: integrate the commanded rate, add rate × time every tick.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 9', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Autonomous', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Combine everything into a routine that runs itself.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 12, label: 'Gyro & Heading' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '08-gyro-heading.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
