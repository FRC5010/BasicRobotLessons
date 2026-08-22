const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 1 — Your First Motor' });

  K.addTitleSlide(p, {
    tag: 'LESSON 1',
    title: 'Your First Motor',
    subtitle: 'Spin a drive wheel with a button',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Give a motor a name, and a job' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Create a mechanism that owns one TalonFX drive motor, and make it spin at a fixed speed while you hold a button.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.25 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Objects, created with new', options: { bullet: true, breakLine: true } },
        { text: 'Fields — data a class holds onto', options: { bullet: true, breakLine: true } },
        { text: 'Constructors — setup that runs once', options: { bullet: true, breakLine: true } },
        { text: 'import, private / public', options: { bullet: true, breakLine: true } },
        { text: 'A List, asked for an item by number', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('plug_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'A vendor library (Phoenix 6)', options: { bullet: true, breakLine: true } },
        { text: 'The TalonFX motor object', options: { bullet: true, breakLine: true } },
        { text: 'Command factory methods', options: { bullet: true, breakLine: true } },
        { text: 'Robot as the home for hardware', options: { bullet: true, breakLine: true } },
        { text: 'The Scheduler, ticked every loop', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'First Motor' });
  }

  // ============================================================ SLIDE 3 — vendor library
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 1 · Add Phoenix 6', title: 'Motors need their maker\'s code, too' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.05,
      steps: [
        { title: 'Open WPILib: Manage Vendor Libraries', detail: 'The WPILib icon in VS Code, or Ctrl+Shift+P and search for it.' },
        { title: 'Find Phoenix 6 in the list, and install it', detail: 'CTRE ships TalonFX support this way — it\'s not part of WPILib itself.' },
        { title: 'Rebuild: ./gradlew build', detail: 'A new file appears under vendordeps/ — GradleRIO finds it automatically.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.05, w: 11.9, h: 1.9,
      body: 'WPILib ships the core framework; hardware makers ship their own code separately so they can update on their own schedule. The vendordep file is just a JSON pointer telling Gradle where to fetch it.',
      pad: 0.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'First Motor' });
  }

  // ============================================================ SLIDE 4 — objects: the big idea
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 2 · Objects', title: 'A class is a blueprint; an object is one built from it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.85, w: 11.9, h: 1.5, fontSize: 19,
      lines: [{ text: 'TalonFX driveMotor = new TalonFX(1, CANBus.systemcore(0));', color: '9EF01A' }],
    });

    K.addCard(s, {
      x: 0.7, y: 3.7, w: 5.85, h: 3.0, bg: CARDBG,
      heading: 'Read it right to left.',
      headingSize: 22,
      body: 'new TalonFX(1, CANBus.systemcore(0)) builds the object for CAN ID 1, on SystemCore\'s first CAN bus. driveMotor is your handle to it from here on.',
    });
    K.addCard(s, {
      x: 6.75, y: 3.7, w: 5.85, h: 3.0, bg: NAVY,
      heading: 'One blueprint, as many objects as you need.',
      headingColor: WHITE, headingSize: 22,
      body: 'TalonFX describes what any TalonFX can do — new TalonFX(...) builds the one specific motor bolted to CAN ID 1.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 4, label: 'First Motor' });
  }

  // ============================================================ SLIDE 5 — DriveModule pieces 1-2
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · DriveModule.java', title: 'The package, the imports, the field' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.4, fontSize: 14,
      lines: [
        { text: 'package first.robot.subsystems;', color: '7FD1D9' },
        { text: '', color: 'D7E3F4' },
        { text: 'import com.ctre.phoenix6.CANBus;', color: 'D7E3F4' },
        { text: 'import com.ctre.phoenix6.hardware.TalonFX;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'import org.wpilib.command3.Command;', color: 'D7E3F4' },
        { text: 'import org.wpilib.command3.Mechanism;', color: 'D7E3F4' },
        { text: 'public class DriveModule extends Mechanism {', color: 'FFD166' },
        { text: '  private final TalonFX m_driveMotor =', color: 'D7E3F4' },
        { text: '      new TalonFX(1, CANBus.systemcore(0)); // CAN ID 1', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.35, w: 11.9, h: 1.65,
      body: 'extends Mechanism plugs this class into the scheduler. private hides the field from other classes; final means it always points at the same motor. m_ marks a field, by convention.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: 'First Motor' });
  }

  // ============================================================ SLIDE 6 — DriveModule pieces 3-4
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · DriveModule.java', title: 'The constructor, and the first command' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 4.4, fontSize: 14,
      lines: [
        { text: 'public DriveModule() {', color: 'FFD166' },
        { text: '  // Setup that should happen when the module is created goes here.', color: '7FA8C9' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '/** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */', color: '7FA8C9' },
        { text: 'public Command driveAtSpeed(double fraction) {', color: 'FFD166' },
        { text: '  return run(coroutine -> {', color: 'D7E3F4' },
        { text: '    m_driveMotor.setThrottle(fraction);', color: 'D7E3F4' },
        { text: '    coroutine.park();', color: 'D7E3F4' },
        { text: '  })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> m_driveMotor.setThrottle(0))', color: '9EF01A' },
        { text: '      .named("Drive At Speed");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'First Motor' });
  }

  // ============================================================ SLIDE 7 — the command factory, explained
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 3 · What that method really does', title: 'Calling it doesn\'t spin the motor — it returns a recipe' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 5.85, h: 4.65, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('coroutine.park()', { x: 1.0, y: 2.0, w: 5.25, h: 0.4, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, margin: 0 });
    s.addText('Sets the speed once, then tells the scheduler "hold here — keep this command alive until something cancels it." Exactly what "spin while held" needs.', {
      x: 1.0, y: 2.5, w: 5.25, h: 3.7, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.75, w: 5.85, h: 4.65, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('.whenCanceled(...)', { x: 7.05, y: 2.0, w: 5.25, h: 0.4, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, margin: 0 });
    s.addText('Motors hold the last value you set. Nothing stops the wheel unless code commands 0 — so cleanup runs it back to zero the instant this command is canceled.', {
      x: 7.05, y: 2.5, w: 5.25, h: 3.7, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 7, label: 'First Motor', dark: true });
  }

  // ============================================================ SLIDE 8 — give Robot its hardware
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 4 · Robot.java', title: 'Hardware lives on Robot, not on an opmode' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.1, fontSize: 16,
      lines: [
        { text: 'public class Robot extends OpModeRobot {', color: 'FFD166' },
        { text: '  public final CommandGamepad driverController = new CommandGamepad(0);', color: 'D7E3F4' },
        { text: '  public final DriveModule module = new DriveModule();', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.1, w: 11.9, h: 2.85,
      heading: 'Robot is built once and lasts the whole run. An opmode is rebuilt fresh every time you select it.',
      headingSize: 22,
      body: 'A motor has to exist exactly once, same as Robot — so it (and the controller) live here, public, and every opmode just reaches in and uses them. Robot is the toolbox; opmodes are what you do with the tools.',
    });

    K.addFooter(s, { pageNum: 8, label: 'First Motor' });
  }

  // ============================================================ SLIDE 9 — keep the scheduler running
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'heartbeat_white.png', eyebrow: 'Section 5 · The scheduler', title: 'Someone has to tick it, every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 6.6, h: 2.1, fontSize: 19,
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void robotPeriodic() {', color: 'D7E3F4' },
        { text: '  Scheduler.getDefault().run();', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 7.5, y: 1.75, w: 5.1, h: 4.65,
      heading: 'extends Mechanism registered your module — it didn\'t make anything happen.',
      headingSize: 21,
      body: '.run() is the tick: check every trigger, hand out and step every command that should be running. Skip this and buttons sit there fully wired, doing nothing.',
    });

    s.addShape('roundRect', { x: 0.7, y: 4.05, w: 6.6, h: 2.45, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText('Watch out: this scheduler doesn\'t check whether the robot is enabled. What actually stops a disabled robot is the TalonFX itself refusing to apply power — a hardware safety net, not a software one.', {
      x: 1.0, y: 4.25, w: 6.0, h: 2.05, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 9, label: 'First Motor' });
  }

  // ============================================================ SLIDE 10 — wire a button
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 6 · MyTeleop.java', title: 'Hold a button, drive a motor' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.85, fontSize: 14,
      lines: [
        { text: 'public MyTeleop(Robot robot) {', color: 'FFD166' },
        { text: '  this.robot = robot;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  robot.driverController.southFace().whileTrue(robot.module.driveAtSpeed(0.3));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.9, w: 11.9, h: 3.0,
      heading: 'Why the constructor, and not start()?',
      headingSize: 22,
      body: 'The constructor runs once, the instant MyTeleop is built. start() runs on every re-enable — wire a button there and you\'d register a fresh binding on top of the old one each time. Put wiring in the constructor and it\'s registered exactly once.',
    });

    K.addFooter(s, { pageNum: 10, label: 'First Motor' });
  }

  // ============================================================ SLIDE 11 — run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 7 · Run it', title: 'The step everybody misses the first time' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 1.15,
      highlight: { 1: ORANGE },
      steps: [
        { title: 'Start the simulator', detail: './gradlew simulateJava' },
        { title: 'Drag a controller into Joysticks slot 0', detail: 'From System Joysticks — a real controller, or Keyboard 0 if you don\'t have one plugged in.' },
        { title: 'Pick My Teleop, set Robot State to Enabled', detail: 'Open Other Devices to watch the TalonFX.' },
        { title: 'Hold the bottom face button', detail: 'Output jumps to 0.3, drops to 0 on release. On real hardware, the wheel spins.' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'First Motor' });
  }

  // ============================================================ SLIDE 12 — see what's running
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'listol_white.png', eyebrow: 'Section 8 · Ask the scheduler', title: 'What is this mechanism doing right now?' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.9, fontSize: 14,
      lines: [
        { text: 'private void logRunningCommand() {', color: 'FFD166' },
        { text: '  List<Command> running = Scheduler.getDefault().getRunningCommandsFor(module);', color: 'D7E3F4' },
        { text: '  Command current = running.get(0);', color: 'D7E3F4' },
        { text: '  SmartDashboard.putString("DriveModule/CurrentCommand", current.name());', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.85, w: 11.9, h: 3.05,
      heading: 'getRunningCommandsFor(module) hands back a List<Command> — a numbered collection.',
      headingSize: 21,
      body: '.get(0) asks for entry zero — safe here because a mechanism can only ever have one command running on it. Read it after Scheduler.run(), never before, or the list is still empty.',
    });

    K.addFooter(s, { pageNum: 12, label: 'First Motor' });
  }

  // ============================================================ SLIDE 13 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Add a reverse button', body: 'eastFace() drives at -0.3. Press both — the most-recently-scheduled command wins cleanly.' },
        { title: 'Change the CAN ID', body: 'Rebuild. Nothing breaks in sim, but get in the habit of setting IDs deliberately.' },
        { title: 'Move the ID into a constant', body: 'Create Constants.java with DriveConstants.kDriveMotorPort — this is where robot numbers should live.' },
        { title: 'Use the constant', body: 'Reference it as Constants.DriveConstants.kDriveMotorPort in the subsystem instead of a bare number.' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: 'First Motor', dark: true });
  }

  // ============================================================ SLIDE 14 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'One object, one job, one safe way to control it' });

    const points = [
      'An object is a live instance of a class, made with new.',
      'A class\'s anatomy: package, imports, fields, constructor, methods.',
      'Command factory methods return commands; motors hold their last value, so a stop needs an explicit .whenCanceled(...).',
      'Hardware lives on Robot, which is built once — not on an opmode, which is rebuilt every time it\'s selected.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 2', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Joystick Control', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Replace the fixed-speed button with smooth, proportional control from a joystick axis.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 14, label: 'First Motor' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '01-first-motor.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
