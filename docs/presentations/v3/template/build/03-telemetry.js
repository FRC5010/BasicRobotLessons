const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 3 — Telemetry' });

  K.addTitleSlide(p, {
    tag: 'LESSON 3',
    title: 'Telemetry',
    subtitle: 'Plot position and velocity, live',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Make the motor talk back' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Read the drive motor\'s built-in sensor, log its position and velocity, and watch them plotted live as you drive.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.25 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Methods that return values you act on', options: { bullet: true, breakLine: true } },
        { text: 'Chaining calls', options: { bullet: true, breakLine: true } },
        { text: 'Method references (this::logTelemetry)', options: { bullet: true, breakLine: true } },
        { text: 'instanceof pattern matching', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('chartline_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'The TalonFX integrated encoder', options: { bullet: true, breakLine: true } },
        { text: 'Logging with SmartDashboard', options: { bullet: true, breakLine: true } },
        { text: 'Plotting in AdvantageScope', options: { bullet: true, breakLine: true } },
        { text: 'Reacting to scheduler events, not polling', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 3 — motors that know where they are
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 1 · The encoder', title: 'Three dots, three method calls, one chain' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.2, fontSize: 14,
      fileLabel: "Nothing to add yet — this is how you'll read them, in section 4",
      example: true,
      lines: [
        { text: 'double rotations = m_driveMotor.getPosition().getValue().in(Rotations);', color: '9EF01A' },
        { text: 'double rps       = m_driveMotor.getVelocity().getValue().in(RotationsPerSecond);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.1, w: 11.9, h: 2.45,
      heading: 'getPosition() returns a signal object, not a plain number.',
      headingSize: 22,
      body: '.getValue() reads a measurement that remembers its own unit; .in(Rotations) says which unit you want it as. Whatever a method returns, you can call methods on it immediately — that\'s chaining.',
    });

    K.addFooter(s, { pageNum: 3, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 4 — telemetry & the naming rule
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'broadcasttower_white.png', eyebrow: 'Section 2 · Telemetry', title: 'The name is the address' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.6, fontSize: 16,
      fileLabel: 'Nothing to add — just the general shape',
      example: true,
      lines: [{ text: 'SmartDashboard.putNumber("DriveModule/PositionRotations", rotations);', color: '9EF01A' }],
    });

    K.addCard(s, {
      x: 0.7, y: 3.6, w: 11.9, h: 3.15,
      heading: 'Every value goes under an organized name, one branch per mechanism.',
      headingSize: 22,
      body: 'A hundred values from now, you can still find the one you want. Names carry their units too — PositionRotations, not Position — so nobody has to guess what a number means later.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 5 — start the flight recorder
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 3 · Robot.java', title: 'Every published value, saved automatically' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.8, fontSize: 15,
      fileLabel: "Edit Robot.java's constructor",
      lines: [
        { text: 'public Robot() {', color: 'FFD166' },
        { text: '  DataLogManager.start(); // saves every published value to a .wpilog file', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.9, w: 11.9, h: 2.85,
      heading: 'The logger runs before anything else is set up — top of the constructor.',
      headingSize: 22,
      body: 'On a real robot the file lands on SystemCore; in sim it lands in a logs/ folder in your project. A session you can scrub through later is how you answer "what just happened?" without making it happen again.',
    });

    K.addFooter(s, { pageNum: 5, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 6 — what to log, and where
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 4 · DriveModule.java', title: 'A standing callback, not a one-off poll' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.7, fontSize: 12,
      fileLabel: "Edit DriveModule's constructor",
      lines: [
        { text: 'public DriveModule() {', color: 'FFD166' },
        { text: '  Scheduler.getDefault().addPeriodic(this::logTelemetry);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'private void logTelemetry() {', color: 'FFD166' },
        { text: '  double rotations = m_driveMotor.getPosition().getValue().in(Rotations);', color: 'D7E3F4' },
        { text: '  double rps = m_driveMotor.getVelocity().getValue().in(RotationsPerSecond);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  SmartDashboard.putNumber("DriveModule/PositionRotations", rotations);', color: '9EF01A' },
        { text: '  SmartDashboard.putNumber("DriveModule/VelocityRotPerSec", rps);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.65, w: 11.9, h: 1.25,
      body: 'this::logTelemetry is a method reference — shorthand for () -> this.logTelemetry(). addPeriodic runs it every tick, forever, with no command required.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 6, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 7 — AdvantageScope
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 5 · AdvantageScope', title: 'Watch it plotted, live' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 0.98,
      steps: [
        { title: 'File → Connect to Simulator', detail: 'On a real robot it\'s Connect to Robot, with your team number.' },
        { title: 'NetworkTables → SmartDashboard → DriveModule', detail: 'Your folder tree, with both values ticking.' },
        { title: 'Drag VelocityRotPerSec onto the Line Graph tab', detail: 'A live plot appears.' },
        { title: 'Drag PositionRotations on too, right axis', detail: 'Two signals, one time axis.' },
        { title: 'Drive, and watch', detail: 'The traces sit nearly flat — nothing\'s actually spinning yet. Lesson 4 fixes that.' },
      ],
    });

    K.addFooter(s, { pageNum: 7, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 8 — listening instead of asking
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 6 · Robot.java', title: 'Told, not asked' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.8, fontSize: 12,
      fileLabel: 'Edit Robot: add the listener, then replace logRunningCommand()',
      lines: [
        { text: 'Scheduler.getDefault().addEventListener(this::logCommandStart);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: 'private void logCommandStart(SchedulerEvent event) {', color: 'FFD166' },
        { text: '  if (event instanceof SchedulerEvent.Scheduled scheduled', color: 'D7E3F4' },
        { text: '      && scheduled.command().requires(module)) {', color: 'D7E3F4' },
        { text: '    SmartDashboard.putString("DriveModule/CurrentCommand", scheduled.command().name());', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.7, w: 11.9, h: 2.3,
      heading: 'Is this a Scheduled event? Type it as one.',
      headingSize: 20,
      body: 'Only the specific kind has .command() on it. The old version polled and got lucky every time; this one can\'t get unlucky — it isn\'t asking, it\'s told.',
    });

    K.addFooter(s, { pageNum: 8, label: 'Telemetry' });
  }

  // ============================================================ SLIDE 9 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Log the commanded speed', body: 'Inside driveWithJoystick\'s loop, log CommandedOutput right where it\'s computed.' },
        { title: 'Add getPositionRotations()', body: 'A reading method returning position as a double — safe to share, unlike a command.' },
        { title: 'Rename a dashboard key', body: 'Swap "DriveModule/" for "Elevator/", rebuild, and watch a new folder appear in the tree.' },
        { title: 'Log when a command completes', body: 'Handle SchedulerEvent.Completed and write LastCompletedCommand.' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Telemetry', dark: true });
  }

  // ============================================================ SLIDE 10 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Asking instead of telling' });

    const points = [
      'Methods split into actions (setThrottle) and questions (getPosition) — chain a question\'s return value straight into the next call.',
      'SmartDashboard.putNumber("Mechanism/Name", value) with DataLogManager recording started, is this course\'s whole telemetry story.',
      'A listener reacting to a SchedulerEvent can\'t get unlucky the way a poll can — it\'s told the instant something happens.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 4', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Simulation', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Give the simulated motor a physics model, so the plots actually respond.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 10, label: 'Telemetry' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '03-telemetry.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
