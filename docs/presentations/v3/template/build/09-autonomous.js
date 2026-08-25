const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 9 — Autonomous' });

  K.addTitleSlide(p, {
    tag: 'LESSON 9',
    title: 'Autonomous',
    subtitle: 'Combine everything into a routine that runs itself',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

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
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '09-autonomous.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
