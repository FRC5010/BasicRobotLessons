const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 9 — Autonomous' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 9',
    title: 'Autonomous',
    subtitle: 'Combine everything into a routine that runs itself',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Step back and look at the whole spine built so far: mechanisms own hardware, commands describe work, the scheduler runs it, telemetry records it, and simulation proves it before the robot exists. This lesson is where all of that finally gets composed into something that runs itself, with nobody\'s hands on the sticks — which is a genuinely satisfying moment to let land.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Drive, turn, drive — with nobody\'s hands on the sticks' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Snap your building blocks together into an autonomous routine that runs by itself — then explore running steps in parallel.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.25 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Command composition into named routines', options: { bullet: true, breakLine: true } },
        { text: 'Sequential vs. parallel execution', options: { bullet: true, breakLine: true } },
        { text: 'coroutine.await(...) — sequencing as plain code', options: { bullet: true, breakLine: true } },
        { text: 'Passing subsystems into a factory method', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('shoeprints_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'How @Autonomous opmodes actually run', options: { bullet: true, breakLine: true } },
        { text: 'Command.sequence, .parallel, .race', options: { bullet: true, breakLine: true } },
        { text: 'A whole-chassis driveDistance', options: { bullet: true, breakLine: true } },
        { text: 'Cosine compensation', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Autonomous' });
    s.addNotes(
      'For the first 15 seconds of an FRC match, the robot runs with no driver. In this framework that\'s not a special mode with its own API — it\'s just another opmode, annotated @Autonomous instead of @Teleop, selected on the Driver Station exactly the way RobotTeleop has been all along. Nothing new to learn about how it runs; the only new part is what it does once it\'s running.'
    );
  }

  // ============================================================ SLIDE 3 — what autonomous is (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'robot_white.png', eyebrow: 'Section 1 · What autonomous actually is', title: 'Just another opmode' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Not a special mode with its own API.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('For the first 15 seconds of a match, the robot runs with no driver — in this framework that\'s just another opmode, annotated @Autonomous instead of @Teleop, selected on the Driver Station exactly the way MyTeleop always has been. Nothing new about how it runs — the only new part is what it does once it\'s running.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addText('MyAuto has been printing a message and doing nothing else since Lesson 0. Today it earns real work.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 21, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Autonomous', dark: true });
    s.addNotes(
      'This is also a good moment for the rename this course has been quietly setting up since Lesson 1: MyTeleop and MyAuto were fine names for template example code, but they\'re not example code anymore — they\'re the permanent home for how this robot drives and how it runs itself. Time they sounded like it.'
    );
  }

  // ============================================================ SLIDE 4 — rename MyTeleop/MyAuto
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'random_white.png', eyebrow: 'Section 1 · A name change', title: 'Template names become permanent ones' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 1.1,
      steps: [
        { title: 'Right-click MyTeleop.java\'s class name → Refactor → Rename', detail: 'Same move as DriveModule → SwerveModule in Lesson 7.' },
        { title: 'Type RobotTeleop, confirm', detail: 'Keeps @Teleop, the Robot robot parameter, and every binding inside.' },
        { title: 'Do the same for MyAuto.java → RobotAuto', detail: 'This one\'s about to look very different inside.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.15, w: 11.9, h: 1.7,
      body: 'MyTeleop and MyAuto were fine names for template example code — but they\'re not example code anymore. They\'re the permanent home for how this robot drives and runs itself.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 4, label: 'Autonomous' });
    s.addNotes(
      'Same VS Code refactor-rename move as DriveModule → SwerveModule back in Lesson 7 — it keeps @Teleop, keeps the Robot robot constructor parameter, and every binding inside RobotTeleop stays exactly as it was; only the file and class name change. RobotAuto is the one that\'s about to look very different inside — the rest of this lesson is what goes in it.'
    );
  }

  // ============================================================ SLIDE 5 — whole-chassis driveDistance
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 2 · Drivetrain.java', title: 'Watch one wheel to know when all four have arrived' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.55, fontSize: 12,
      fileLabel: 'Add to Drivetrain, with the other command factories',
      lines: [
        { text: '/** Drive straight forward \'meters\' at 40% power. Finishes on its own. */', color: '7FA8C9' },
        { text: 'public Command driveDistance(double meters) {', color: 'FFD166' },
        { text: '  return run(coroutine -> {', color: 'D7E3F4' },
        { text: '        m_modules[0].resetDrivePosition(); // zero one wheel\'s odometer', color: '9EF01A' },
        { text: '        while (Math.abs(m_modules[0].getDistanceMeters()) < Math.abs(meters)) {', color: 'D7E3F4' },
        { text: '          for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '            module.setDesiredState(0.0, 0.4); // point forward, 40% throttle', color: 'D7E3F4' },
        { text: '          }', color: 'D7E3F4' },
        { text: '          m_lastCommandedOmega = 0.0;', color: 'D7E3F4' },
        { text: '          coroutine.yield();', color: '9EF01A' },
        { text: '        }', color: 'D7E3F4' },
        { text: '        for (SwerveModule module : m_modules) { module.setDesiredState(0.0, 0.0); } // stop', color: 'D7E3F4' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> { /* ...same stop, for every module... */ })', color: '9EF01A' },
        { text: '      .named("Drive Distance");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 5, label: 'Autonomous' });
    s.addNotes(
      'Read this top to bottom as the same shape as Lesson 6\'s driveDistance, applied one level up. Every module is asked to point forward and roll, and only one wheel is watched to know when we\'ve gone far enough. Watching one wheel works for straight-ahead driving because, with all four wheels aimed the same direction at the same speed, they all cover the same distance. Two endings, same as every finishing command since Lesson 6 — the loop\'s own stop-order for finishing on its own, .whenCanceled(...) for being interrupted. If that split is starting to feel routine, that\'s the point.'
    );
  }

  // ============================================================ SLIDE 6 — resetDrivePosition (encapsulation)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 2 · SwerveModule.java', title: "A named method, because m_driveMotor is private" });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.15, fontSize: 16,
      fileLabel: "Add to SwerveModule, with its other public methods",
      lines: [
        { text: '/** Zero the drive encoder — start measuring distance from *here*. */', color: '7FA8C9' },
        { text: 'public void resetDrivePosition() {', color: 'FFD166' },
        { text: '  m_driveMotor.setPosition(0);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.1, w: 11.9, h: 2.8,
      heading: 'The Drivetrain can\'t reach a module\'s hardware directly.',
      headingSize: 22,
      body: 'That\'s encapsulation doing its job — outsiders don\'t get to poke a module\'s motor. What the module can do is offer a named, intention-revealing method instead.',
    });

    K.addFooter(s, { pageNum: 6, label: 'Autonomous' });
    s.addNotes(
      'Lesson 6 called setPosition(0) directly on the TalonFX — but that was inside DriveModule, where the motor is visible. The Drivetrain can\'t do that: m_driveMotor is private to the module, and that\'s encapsulation doing its job — outsiders don\'t get to poke a module\'s hardware. What the module can do is offer a named, intention-revealing method instead. This is a nice small callback to Lesson 1\'s original encapsulation pitch, now paying rent four lessons later.'
    );
  }

  // ============================================================ SLIDE 7 — create Autos.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 3 · A new file', title: 'A cookbook for the robot, not a subsystem' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Right-click commands, under src/main/java/first/robot/', detail: 'A new sibling folder to subsystems and opmode.' },
        { title: 'Add a new file: Autos.java', detail: 'Right-click commands → New File.' },
        { title: 'This one holds auto factories', detail: 'Static methods only — Autos itself is never instantiated.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.35, w: 11.9, h: 1.65,
      body: 'private Autos() {} is a constructor nobody can call — the idiom for "don\'t bother making instances of this class; just use its static methods."',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 7, label: 'Autonomous' });
    s.addNotes(
      'commands/Autos.java is a new file — the home for auto factories, a cookbook for the robot rather than a subsystem. driveTurnDrive is static — called on the class itself, Autos.driveTurnDrive(...), no object needed, the same way you call Math.abs(...). That fits, because Autos has no data of its own; it\'s a cookbook, not a machine.'
    );
  }

  // ============================================================ SLIDE 8 — driveTurnDrive (sequence)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · Autos.java', title: 'One step at a time, in order' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 3.9, fontSize: 12,
      fileLabel: 'Autos.java — the whole file, to start',
      lines: [
        { text: 'public final class Autos {', color: 'FFD166' },
        { text: '  private Autos() {} // utility class — never instantiated', color: '7FA8C9' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Drive 1 m, turn to 90°, drive 1 m more. */', color: '7FA8C9' },
        { text: '  public static Command driveTurnDrive(Drivetrain drivetrain) {', color: 'FFD166' },
        { text: '    return Command.sequence(', color: 'D7E3F4' },
        { text: '            drivetrain.driveDistance(1.0),', color: '9EF01A' },
        { text: '            drivetrain.turnToHeading(90),', color: '9EF01A' },
        { text: '            drivetrain.driveDistance(1.0))', color: '9EF01A' },
        { text: '        .named("Drive Turn Drive");', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.7, w: 11.9, h: 1.2,
      body: 'Command.sequence(...) runs steps one at a time — step 2 waits for step 1. Static, needs .named(...) like every builder.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 8, label: 'Autonomous' });
    s.addNotes(
      'Command.sequence(...) runs the commands you give it one at a time, in order. Step 2 doesn\'t start until step 1 reports finished; step 3 waits for step 2. Because each step finishes itself, the sequence flows step to step and then ends — at which point auto is over. Command.sequence(...) is a static method — same family as Command.noRequirements(...) and Command.requiring(...) already used — and, like every builder in this API, it needs .named(...) before it\'s a real, runnable Command. (Command.andThen(Command) does the same job for exactly two commands — Lesson 7\'s turn-in-place hint already used it — sequence is the clean way to chain many.)'
    );
  }

  // ============================================================ SLIDE 9 — the await rewrite
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'shoeprints_white.png', eyebrow: 'Section 3 · A better way to write the same plan', title: 'The sequencing is the code\'s own control flow' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.0, fontSize: 14,
      fileLabel: 'Replace driveTurnDrive with',
      lines: [
        { text: 'public static Command driveTurnDrive(Drivetrain drivetrain) {', color: 'FFD166' },
        { text: '  return Command.noRequirements(coroutine -> {', color: 'D7E3F4' },
        { text: '        coroutine.await(drivetrain.driveDistance(1.0));  // step 1', color: '9EF01A' },
        { text: '        coroutine.await(drivetrain.turnToHeading(90));   // step 2', color: '9EF01A' },
        { text: '        coroutine.await(drivetrain.driveDistance(1.0));  // step 3', color: '9EF01A' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .named("Drive Turn Drive");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.75, w: 11.9, h: 2.1,
      body: 'coroutine.await(command) schedules it and suspends right there until it finishes. driveTurnDrive itself requires nothing — each step claims the Drivetrain only while it\'s running.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 9, label: 'Autonomous' });
    s.addNotes(
      'This is worth slowing down for, because it changes how every routine gets written from here on. Command.sequence(...) takes three already-built commands and glues them together from the outside. coroutine.await(command) schedules command and suspends this coroutine right there until it finishes — then the next line runs. Read the method top to bottom and it IS the plan you\'d say out loud: drive a meter, await it; turn to ninety, await it; drive a meter, await it. No decorators gluing pieces together from outside — the sequencing IS the code\'s own control flow, the same "just write it as a loop" idea Lesson 8 used for turnToHeading. Here\'s the part that matters beyond looking nicer: Command.sequence(...) builds one command that requires the Drivetrain for the group\'s ENTIRE duration, start to finish. The await version is different — driveTurnDrive itself requires nothing, and each step claims the Drivetrain only while that step is actually running, then lets go the instant it finishes. With only a Drivetrain in this robot that distinction has nowhere to show off yet, but it matters the moment a routine mixes mechanisms — drive somewhere, then run an arm, then drive again — where a sequence(...) group would hold the drivetrain reserved even during the arm step it doesn\'t need. Get comfortable with the shape now; it pays off the moment this robot has more than one mechanism to coordinate.'
    );
  }

  // ============================================================ SLIDE 10 — hand it to the robot
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 4 · RobotAuto.java', title: 'Fires the instant Autonomous begins' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.7, fontSize: 14,
      fileLabel: "Replace the contents of RobotAuto's constructor",
      lines: [
        { text: 'public RobotAuto(Robot robot) {', color: 'FFD166' },
        { text: '  this.robot = robot;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Fires once, the moment this opmode goes from disabled to enabled.', color: '7FA8C9' },
        { text: '  RobotModeTriggers.autonomous().onTrue(Autos.driveTurnDrive(robot.drivetrain));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.65, w: 11.9, h: 2.3,
      heading: 'No getAutonomousCommand() hook to fill in.',
      headingSize: 22,
      body: 'RobotModeTriggers.autonomous() is a Trigger, like a button, except its condition is Autonomous and enabled. .onTrue schedules the plan once per enable.',
    });

    K.addFooter(s, { pageNum: 10, label: 'Autonomous' });
    s.addNotes(
      'Autonomous doesn\'t need a getAutonomousCommand() hook to fill in — there\'s no framework method waiting for a return value. RobotAuto just has to schedule its own plan the moment auto actually starts, the same way every other binding in this course has lived in a constructor since Lesson 1. Why the constructor and not start()? The constructor runs exactly once, when RobotAuto is selected, and that\'s what makes this binding scoped to RobotAuto specifically — it\'s automatically torn down the moment the Driver Station selects a different opmode, the same scoping that already protects every button binding written so far. Put this logic in start() instead and you\'d re-register a fresh trigger on every re-enable, stacking duplicates — Lesson 1\'s exact warning, still true here. Once running: Drivetrain/Module0/SteerAngleDegrees holds 0 while distance climbs to 1.0, the heading sweeps to 90° and settles, distance climbs again from a new zero — the robot ran the plan untouched, nobody\'s hands on the controller. That\'s worth savoring for a second before moving to the polish in the next section.'
    );
  }

  // ============================================================ SLIDE 11 — cosine compensation
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 5 · SwerveModule.java', title: "Don't drive hard until the wheel points right" });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.0, fontSize: 15,
      fileLabel: 'Edit setDesiredState in SwerveModule',
      lines: [
        { text: '// Drive only as much as the wheel is pointed the right way:', color: '7FA8C9' },
        { text: '// cos(0°) = 1 → full speed; cos(90°) = 0 → don\'t drive while sideways.', color: '7FA8C9' },
        { text: 'double alignment = Math.cos(Math.toRadians(error));', color: '9EF01A' },
        { text: 'm_driveMotor.setThrottle(speedFraction * alignment);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.75, w: 11.9, h: 2.1,
      body: 'Steering takes real time — for a fraction of a second the drive motor pushes through a wheel pointed the wrong way. Scaling by cosine means don\'t drive hard until you\'re pointed right.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 11, label: 'Autonomous' });
    s.addNotes(
      'Watch the Swerve tab closely at the moment each step changes — right when the turn begins, and right when step 3 starts — and there\'s a little ugliness hiding in those transitions. When step 2 begins, every wheel\'s steering target snaps from 0° to its pinwheel angle, but steering takes real time (that 25:1 gearbox from Lesson 7 doesn\'t teleport). For a fraction of a second the drive motors push at full command through wheels pointed somewhere between the old direction and the new one — the chassis scrubs sideways, the tires drag, and the odometer counts distance the robot didn\'t cleanly travel. In teleop you\'d never notice; in an auto that\'s supposed to end in a precise spot, these little smears add up. The fix is one line of trigonometry, and it\'s a trick every good swerve robot uses: ask how much of this wheel\'s rolling actually points where we want to go — that\'s exactly what cosine measures. Pointed perfectly, cos = 1, drive full speed; pointed 60° off, cos = 0.5, drive at half; pointed sideways at 90°, cos = 0, don\'t drive at all. One subtlety worth naming: past 90° of error, cosine goes negative, so the wheel briefly drives backward — that\'s not a bug, it\'s the honest answer to "how much of my rolling points the right way," since at 180° off, rolling backward IS rolling the right way. WPILib ships this exact idea as SwerveModuleVelocity.cosineScale, swappable in once Lesson 10 has the module speaking in states.'
    );
  }

  // ============================================================ SLIDE 12 — parallel / race
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 6 · Doing things at once', title: 'Two tools for simultaneous work' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.75, fontSize: 16,
      fileLabel: 'Nothing to add — just an example, not code for any file',
      example: true,
      lines: [
        { text: 'Command.parallel(drivetrain.turnToHeading(90))', color: 'D7E3F4' },
        { text: '    .optional(reportCommand)', color: '9EF01A' },
        { text: '    .named("Turn And Report");', color: 'D7E3F4' },
      ],
    });

    const cols = [
      ['Command.parallel(a, b)', 'Runs both, finishes when ALL are done.'],
      ['Command.race(a, b)', 'Runs both, finishes the instant ANY ONE finishes, canceling the rest.'],
    ];
    cols.forEach((c, i) => {
      const x = 0.7 + i * 6.05;
      s.addShape('roundRect', { x, y: 3.6, w: 5.85, h: 1.85, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c[0], { x: x + 0.3, y: 3.8, w: 5.25, h: 0.45, fontFace: K.FONT_CODE, bold: true, fontSize: 19, color: ORANGE, margin: 0 });
      s.addText(c[1], { x: x + 0.3, y: 4.25, w: 5.25, h: 1.1, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    });

    s.addText('One hard rule: two required commands in a parallel group must not share a mechanism — building one throws IllegalArgumentException immediately, not a mysterious hang.', {
      x: 0.7, y: 5.7, w: 11.9, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 12, label: 'Autonomous', dark: true });
    s.addNotes(
      'Sequences do one thing at a time; sometimes you want simultaneous actions — running a mechanism alongside a drive step, say. The .optional(...) shape chained onto Command.parallel(...) is worth naming because it\'s more flexible than the two static methods alone. Command.parallel(a, b) treats every command you hand it as required — the group waits for all of them. Chain .optional(...) instead of listing a command as required, and it rides along without being able to keep the group alive — the group finishes based on its required commands alone, and optional ones just get cancelled when that happens. That\'s exactly "run this, and something else alongside it for as long as it takes" — one designated command sets the pace, everything else just comes along for the ride. On the hard rule: this framework tells you about the violation immediately — IllegalArgumentException: Commands running in parallel cannot share requirements — not a mysterious runtime hang, a clear error the moment you build the group. The way to actually combine translation and rotation on one mechanism is Lesson 10\'s SwerveDriveKinematics.'
    );
  }

  // ============================================================ SLIDE 13 — RobotAutoBox (second opmode)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 7 · A second auto, no chooser needed', title: 'Every @Autonomous class is its own selectable entry' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 1.0,
      steps: [
        { title: 'Right-click opmode, under src/main/java/first/robot/', detail: 'The same folder RobotTeleop and RobotAuto already live in.' },
        { title: 'Add a new file: RobotAutoBox.java', detail: 'Right-click opmode → New File.' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.75, w: 11.9, h: 2.3, fontSize: 13,
      fileLabel: 'RobotAutoBox.java — the whole file',
      lines: [
        { text: '@Autonomous(name = "Do Nothing", group = "Group 1")', color: 'FFD166' },
        { text: 'public class RobotAutoBox extends PeriodicOpMode {', color: 'D7E3F4' },
        { text: '  public RobotAutoBox(Robot robot) { /* an empty auto — nothing scheduled */ }', color: '7FA8C9' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void periodic() {}', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: 'Autonomous' });
    s.addNotes(
      'Real robots pick from several autos before a match. In this framework that\'s not a dashboard widget you build — it\'s the Driver Station\'s own opmode selector, the exact same list RobotTeleop and RobotAuto already show up in. Every @Autonomous class is its own selectable entry. After rebuilding, open the opmode selector in SimGUI and "Do Nothing" sits right next to "Drive Turn Drive" — two real, independent choices, zero chooser code written. This is the pattern to reach for every time this robot needs another auto: one more small @Autonomous class, not a dropdown living inside a bigger one.'
    );
  }

  // ============================================================ SLIDE 14 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Design a box pattern', body: 'Drive 1 m, turn 90°, four times, ending where it started. Predict the final heading first.' },
        { title: 'Parameterize the distance', body: 'Give driveTurnDrive a double distance, and a third @Autonomous opmode that calls it differently.' },
        { title: 'Add a deliberate wait', body: 'coroutine.wait(Seconds.of(1.0)) between two awaits. When might that help a real auto?' },
      ],
    });

    K.addFooter(s, { pageNum: 14, label: 'Autonomous', dark: true });
    s.addNotes(
      'The box pattern is the meaty exercise here — worth having students actually predict the final heading before running it, since a wrong prediction (and it should end at the start heading, 0°, having turned 90° four times) is a great teaching moment about accumulating turns. The parameterize-the-distance exercise is a light reprise of dependency injection applied to a second axis (distance instead of just the drivetrain). The deliberate-wait exercise previews a real pattern: letting a mechanism settle before moving on is exactly the kind of thing coroutine.wait(...) is for once this robot has more than a drivetrain.'
    );
  }

  // ============================================================ SLIDE 15 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The least mysterious thing in robot programming' });

    const points = [
      'Autonomous is just another opmode, scheduling one plan the moment RobotModeTriggers.autonomous() fires.',
      'coroutine.await(...) turns a sequence into something you write, one line per step, each mechanism held only as long as it\'s needed.',
      'Cosine compensation fixed a real flaw: scale the drive by cos(steer error), so a wheel doesn\'t push until it\'s pointed right.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 10', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Full Swerve', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Translate and rotate at the same time, with kinematics.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 15, label: 'Autonomous' });
    s.addNotes(
      'Autonomous turned out to be the least mysterious thing in robot programming: just another opmode, whose whole job is scheduling one plan the moment RobotModeTriggers.autonomous() fires — built by composing the small finishing commands already in hand. An auto factory that takes the drivetrain as a parameter is dependency injection, keeping every command pointed at the one real robot. Running a plan with nobody\'s hands on the sticks also exposed a flaw teleop had been hiding, and cosine compensation fixed it with one line. And the MyTeleop/MyAuto names finally became RobotTeleop/RobotAuto — not because anything technical demanded it today, but because template example code doesn\'t drive a match, and now neither of these files is that anymore. Everything from here on is refinement — starting with Lesson 10, where the chassis finally learns to drive and spin at the same time.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '09-autonomous.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
