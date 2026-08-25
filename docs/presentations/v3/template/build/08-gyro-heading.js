const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 8 — Gyro & Heading' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 8',
    title: 'Gyro & Heading',
    subtitle: 'Turn the robot to a compass direction and stop',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'An encoder tells you how far a motor turned. A gyro tells you how far the whole robot has rotated. The Pigeon 2 reports yaw — rotation about the vertical axis, i.e. heading — in degrees, 0° wherever the robot was pointing when the gyro zeroed, positive CCW (the Lesson 7 convention, holding as promised). The most important thing in this lesson is what does NOT change: turning a whole robot to face 90° turns out to be the same five moves as pointing one wheel.'
  );

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
    s.addNotes(
      'Where should the gyro live? Heading is a chassis fact — no single module knows it, and no single module needs it alone — so it goes on Drivetrain, not in SwerveModule and not in some new mechanism. That framing question is worth asking out loud before opening the file.'
    );
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
    s.addNotes(
      'Reading yaw has the same shape as reading motor position: getYaw() returns a signal, .getValue().in(Degrees) pulls the number out in the unit you want. Sensors all feel alike once you\'ve read one — that\'s worth naming explicitly, since it validates the pattern-recognition students have been building since Lesson 3. Notice those last two fields aren\'t final — they\'re memory, a running total the sim rewrites every tick, which is why they\'re plain mutable doubles and not final like the hardware fields around them.'
    );
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
    s.addNotes(
      'StructPublisher is StructArrayPublisher\'s singular sibling from Lesson 7\'s getStructArrayTopic — same bridge idea, one value instead of an array, so it\'s getStructTopic and .set(value) instead of .set(array). Rotation2d and NetworkTableInstance are already imported from Lesson 7, so this slots in without new plumbing beyond the publisher itself.'
    );
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
    s.addNotes(
      'The rotate(omega) command from Lesson 7 does the actual module-steering math for pure rotation. turnToHeading is about to need the same math with a different omega each tick — and the sim needs to know what omega was just asked for. You could copy the tangent-angle loop into the new command. Don\'t — copied code is a bug with a delay on it: fix the original and the copy stays wrong. Look at what happened to rotate: its whole body became one line that says what it wants, and the helper holds the how. That\'s the move — when two commands need the same math, promote it to a helper, and every caller gets the m_lastCommandedOmega bookkeeping for free. One loose end worth mentioning: translate(...) from Lesson 7 needs one new line too — pure translation shouldn\'t leave a stale rotation rate lying around for the sim to integrate, so it sets m_lastCommandedOmega = 0.0.'
    );
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
    s.addNotes(
      'Lesson 5 promised its five moves would come back — measure, subtract, multiply, clamp, command — and here they are, pointed at the whole robot. Two things differ from steerToAngle: which sensor gets measured, and that headings wrap around a circle, so the subtract step needs the wrap trick baked in (-170° to 170° should turn 20°, not 340°). The wrap logic goes in its own headingError question-method because the finish condition is about to need it too — the clamp is tighter than Lesson 5\'s ±1.0 on purpose, since full-power spins are violent and a heading turn never needs more than half throttle. Because the finish condition calls the same headingError the loop body used, "done" means "within 2° by the shortest path" — the wrap logic can\'t disagree with itself. Also worth noting: Drivetrain needs its own private clamp helper — it\'s a different class from SwerveModule, so it can\'t reach that one\'s private helper, even though the logic is identical.'
    );
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
    s.addNotes(
      'Read the while loop as "keep steering toward the target, one tick at a time, for as long as we\'re still more than 2° off." Each pass computes a fresh omega from the current error, hands it to commandRotation, then coroutine.yield() suspends until the next tick — this is precisely what Coroutine.waitUntil(...) did under the hood back in Lesson 6, just written out by hand because this loop has real work to do on every pass, not just a condition to poll. The moment the error drops under 2°, the loop exits, the line right after it commands a full stop, and the coroutine body is out of code — finished, the same way driveDistance finished in Lesson 6. And because Lesson 6\'s rule about endings hasn\'t gone anywhere, .whenCanceled(() -> commandRotation(0.0)) covers the other ending — something interrupting this command before the loop ever gets to its own stop line. Two endings, two stop orders, same as driveDistance.'
    );
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
    s.addNotes(
      'The bottom and right face buttons are free again since Lesson 7\'s cleanup, which is a small but nice callback worth mentioning — the refactor really did clear things out. Because turnToHeading requires the Drivetrain, pressing the bottom button cancels the default translate command; when it finishes (or is interrupted by the right button), the default resumes automatically. Unlike Lesson 5\'s steerToAngle, this command finishes — so the stick comes back to life on its own the moment the robot faces 90°, with no extra code needed to hand control back.'
    );
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
    s.addNotes(
      'On a real robot, commandRotation(omega) spins the four wheels tangent to the circle, the chassis rotates, and the gyro reads the result. In sim, the modules don\'t actually push the chassis around — that physics hasn\'t been built. So the loop gets closed by hand: pretend the robot rotates at the rate just commanded, and inject that back into the fake gyro. It\'s an honest stand-in that lets turnToHeading get developed on a laptop today; when Lesson 10 adds SwerveDriveKinematics, this can be replaced with a physics-driven simulation of the actual modules pushing the chassis around. Worth stating plainly: this is the same command → model → fake sensor → your reads loop as Lesson 4, just with a one-line model instead of a full DCMotorSim.'
    );
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
    s.addNotes(
      'Verified against this model: from a standing start, turnToHeading(90) settles inside the band in well under a second — no overshoot, no oscillation, because integrating a commanded rate has no momentum to fight, unlike the geared motors from Lesson 7. That\'s a clean, deliberate contrast worth naming: this control loop is easier to tune than the geared steering was, precisely because the fake gyro has no inertia. One glance at the Swerve tab now tells you what the wheels are doing and which way the robot thinks it\'s facing, at the same time.'
    );
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
    s.addNotes(
      'The wrap-proving exercise is the most important of the four to actually run, not just assign: from 90°, turnToHeading(-170) should sweep +100° through 180° — the short way — not -260°, and watching the plot is what confirms the wrap logic is really doing its job rather than just compiling. zeroHeading() is a good moment to point out that a one-statement coroutine body with nothing to wait for finishes the instant it runs — the same shape as a runOnce-style setup step from Lesson 6, just realized through the coroutine body instead of a decorator.'
    );
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
    s.addNotes(
      'The most important thing in this lesson is what didn\'t change: turning a five-hundred-newton robot to face 90° is the same five moves as pointing one wheel — measure, subtract, multiply, clamp, command — with a gyro as the sensor and the wrap trick promoted into a headingError helper that the finish condition shares, so "done" and "which way" can never disagree. Around that came two habits worth keeping: when a second caller needs the same math, extract a helper method instead of copying — copied code is a bug with a delay on it — and when the physics doesn\'t exist yet, fake the sensor by integrating the commanded rate. You also wrote your first finishing command whose loop body does real per-tick work instead of just waiting — the direct, by-hand version of what coroutine.waitUntil(...) was quietly doing all along back in Lesson 6. A robot that knows its heading and can command its own motion is most of what an autonomous routine needs — Lesson 9 takes the driver out of the loop entirely.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '08-gyro-heading.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
