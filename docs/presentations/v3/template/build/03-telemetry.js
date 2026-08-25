const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 3 — Telemetry' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 3',
    title: 'Telemetry',
    subtitle: 'Plot position and velocity, live',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'So far the conversation with the motor has been one-way — you talk, it spins. This lesson makes it talk back: a TalonFX has a built-in encoder that reports position and velocity for free, and the theme of the whole lesson is asking instead of telling.'
  );

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
    s.addNotes(
      'A TalonFX\'s built-in encoder gives you position — how many rotations the motor has turned since boot — and velocity, how fast it\'s turning right now in rotations per second. You read these instead of setting them, which is the "questions vs. actions" split the rest of the lesson builds on.'
    );
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
    s.addNotes(
      'Walk the chain left to right like a little assembly line. m_driveMotor.getPosition() doesn\'t return a plain number — it returns a signal object, Phoenix\'s wrapper that carries the value together with a timestamp. .getValue() reads the signal\'s current value, but that\'s a measurement that remembers its own unit, so it can\'t be silently misread as the wrong one. .in(Rotations) is where you say which unit you want it as. This is also a good moment to name a pattern already in use without a name: setThrottle(0.3) is an action — nothing comes back — while getPosition() is a question, and the answer comes back as a return value to catch in a variable. From this lesson on, question-methods start doing the heavy lifting.'
    );
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
    s.addNotes(
      'Your code runs on the robot; you\'re looking at a laptop. SmartDashboard.putNumber("some name", value) is the plumbing that gets a number from one to the other, live. This course holds a standard from day one: the name is the address. Every value goes under an organized name, one branch per mechanism, so a hundred values from now you can still find the one you want — and names carry their units too, PositionRotations rather than just Position, so nobody has to guess what a number means later.'
    );
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
    s.addNotes(
      'SmartDashboard\'s values are live — visible while the robot runs, gone the instant it stops — unless something is also saving them. DataLogManager.start() does exactly that: start it once, and every value published anywhere gets mirrored into a .wpilog file automatically. It has to go at the very top of the Robot constructor, before anything else gets set up. Recording sim sessions might sound like overkill, but it isn\'t — a session you can scrub through afterward is how you answer "wait, what just happened?" without having to make it happen again.'
    );
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
    s.addNotes(
      'You want telemetry fresh always, not just while some command happens to be running — that means it belongs somewhere that always runs, on its own schedule, independent of whatever command is currently active. Scheduler.getDefault().addPeriodic(...) registers a callback that runs every tick, forever, for as long as the robot runs, no command required. this::logTelemetry is a method reference — shorthand for () -> this.logTelemetry() — reads naturally out loud as "add a periodic task, this dot logTelemetry." The slash in the dashboard key isn\'t decoration; it builds a folder tree, and the organization rule for this whole course is that every value a mechanism logs starts with the mechanism\'s name and a slash. When this robot grows to four modules, a gyro, and an arm, that tree is what keeps a hundred values findable. Worth calling out the standing habit: log from a steady, always-running callback like this one, not from inside command bodies — commands come and go, this callback doesn\'t, so plots never go blank just because a command ended.'
    );
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
    s.addNotes(
      'AdvantageScope ships in the WPILib installer, so it\'s already there — it plots live data, overlays signals, scrubs back through time, and opens .wpilog flight-recorder files. Don\'t be discouraged when the traces sit nearly flat even at full stick — in simulation the motor isn\'t actually turning yet, so there\'s nothing for the encoder to count. That\'s exactly what Lesson 4 fixes. What\'s built today is the pipe; next lesson gives it something real to carry. On a real robot these plots already work — spin the wheel by hand and watch position climb. And sim or real, DataLogManager has been saving every value to a .wpilog file this whole time; open one with File → Open Log(s) to scrub back through an entire session. This tool comes back constantly — tuning P control in Lesson 5, comparing commanded vs. actual speed, eventually watching the robot drive around a virtual field.'
    );
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
    s.addNotes(
      'Lesson 1\'s logRunningCommand() asked the scheduler a question every tick and read entry zero off the answer — it worked because every command built so far either parks or loops until canceled, so there\'s always something running whenever you ask. That guarantee won\'t last: later lessons build commands that finish on their own, and Lesson 8 ships one that can finish the instant it\'s scheduled, before a poll ever gets a chance to see it run — asking at just the wrong moment means reading past the end of an empty list, not a stale answer. The fix isn\'t a smarter poll, it\'s not polling at all: the scheduler announces every SchedulerEvent it fires — scheduled, completed, canceled, interrupted, and a few more — and addEventListener reacts the instant one happens. The if line does two jobs at once: "event instanceof SchedulerEvent.Scheduled scheduled" asks whether this event is specifically a Scheduled event, and if so hands it back as a variable named scheduled, typed as that specific kind rather than the general SchedulerEvent — which is why the check has to come first, since only the specific kind has a .command() on it. The && after it can use scheduled right away because Java only evaluates the rest of the line once the left side has already passed. scheduled.command().requires(module) matters because the same event stream fires for every mechanism on the robot, not just this one. Run it again and press the button: DriveModule/CurrentCommand still flips the same way as before — what changed is that it isn\'t asking anymore, it\'s told.'
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
        { title: 'Log the commanded speed', body: 'Inside driveWithJoystick\'s loop, log CommandedOutput right where it\'s computed.' },
        { title: 'Add getPositionRotations()', body: 'A reading method returning position as a double — safe to share, unlike a command.' },
        { title: 'Rename a dashboard key', body: 'Swap "DriveModule/" for "Elevator/", rebuild, and watch a new folder appear in the tree.' },
        { title: 'Log when a command completes', body: 'Handle SchedulerEvent.Completed and write LastCompletedCommand.' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Telemetry', dark: true });
    s.addNotes(
      'Logging the commanded speed is a refinement of the always-running rule from section 4: a value that only exists inside a command — like the command\'s own output — gets logged right where it\'s computed, not from a periodic callback. On a real robot, overlaying CommandedOutput against VelocityRotPerSec shows how the motor lags the command — the seed of understanding control, which pays off starting in Lesson 5. getPositionRotations() is worth calling out as exposing a reading method alongside command factories — that\'s fine, readings are safe to share, unlike commands. Renaming a dashboard key is a hands-on demonstration that the slash really is a folder path and the name really is the address — the old entry goes stale and a new folder appears in the tree. The SchedulerEvent.Completed exercise previews the vocabulary callout: Scheduled isn\'t the only kind of event.'
    );
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
    s.addNotes(
      'That naming discipline — Mechanism/Name — feels like overkill for two values; it stops being overkill around value twenty, and this course gets there sooner than it seems. The bigger shift is trading a poll for a listener: logRunningCommand() asked a question every tick and happened to always have an answer, but "happened to" isn\'t a guarantee. logCommandStart() doesn\'t ask at all — it registers once and reacts exactly when a SchedulerEvent.Scheduled actually occurs, unpacked with instanceof pattern matching. Same dashboard key, same string showing up, but nothing left that can come up empty. The plots look unimpressive while the sim motor stands still, but Lesson 4 turns the physics on, and these same plots come alive.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '03-telemetry.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
