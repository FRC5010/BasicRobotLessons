const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 1 — Your First Motor' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 1',
    title: 'Your First Motor',
    subtitle: 'Spin a drive wheel with a button',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'The first lesson where students write a whole new file and see a motor respond to code. Up to now (Lesson 0) it\'s been reading and lightly editing template code; today is the first thing they build themselves, end to end: a mechanism, a command, and a button bound to it.'
  );

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
    s.addNotes(
      'Goal: create a mechanism that owns one TalonFX drive motor, and make it spin at a fixed speed while a button is held. The Java concepts and the robot concepts are two sides of one coin this lesson: objects, fields, and constructors are the anatomy of any class that owns hardware, and by the end students will have built exactly one — DriveModule, holding one TalonFX, exposing one command factory method, wired into Robot and the Scheduler.'
    );
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
    s.addNotes(
      'TalonFX motors are made by CTRE, and their code lives in a vendor library that isn\'t in the template yet — WPILib\'s VS Code has a built-in manager for these, all clicking, no downloads, no URLs. Why isn\'t this just part of WPILib? WPILib ships the core robot framework; hardware makers (CTRE, REV, etc.) ship their own code separately so they can update on their own schedule. The vendordep file that gets installed is nothing more than a JSON file telling Gradle where to download CTRE\'s code — students never edit build.gradle for this.'
    );
  }

  // ============================================================ SLIDE 4 — objects: the big idea
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 2 · Objects', title: 'A class is a blueprint; an object is one built from it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.85, w: 11.9, h: 1.5, fontSize: 19,
      fileLabel: 'Nothing to add — just an example, not code for any file',
      example: true,
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
    s.addNotes(
      'This is the missing third piece after classes and methods — the piece that makes classes finally make sense. A class is a blueprint: TalonFX describes what any TalonFX can do. An object is one actual thing built from that blueprint — the specific motor with CAN ID 1, bolted to the robot. One blueprint, as many objects as needed. Read the example right-to-left: new TalonFX(1, CANBus.systemcore(0)) builds a TalonFX object for CAN ID 1 on SystemCore\'s first CAN bus; TalonFX driveMotor declares a variable to hold it. Worth saying explicitly, since it isn\'t on the slide: a robot can have more than one CAN bus, so a TalonFX needs to be told which one to listen on — CANBus.systemcore(0) picks the first one, the one the motor is actually wired to.'
    );
  }

  // ============================================================ SLIDE 5 — create DriveModule.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 3 · A new file', title: 'Create the file before you type anything' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Right-click robot, under src/main/java/first/', detail: 'In VS Code\'s Explorer panel, on the left.' },
        { title: 'Add a new folder: subsystems', detail: 'Every mechanism this course builds will live inside it.' },
        { title: 'Inside subsystems, add a new file: DriveModule.java', detail: 'Right-click subsystems, then New File.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.35, w: 11.9, h: 1.65,
      body: 'The folder matters — Lesson 0\'s rule was that the package line at the top of a file has to match its folder path, and the line you\'re about to type declares this file lives in subsystems.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: 'First Motor' });
    s.addNotes(
      'We\'re building the course around one swerve module first — one drive motor and, soon, one steering motor — then scaling up to four modules in Lesson 7. There\'s a lot of new material packed into DriveModule.java, so rather than dropping it on students whole, build it in four pieces, top to bottom, talking through each as it lands. Have them type each piece in themselves rather than pasting — the syntax sticks faster when their fingers have been through it.'
    );
  }

  // ============================================================ SLIDE 6 — DriveModule pieces 1-2
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · DriveModule.java', title: 'The package, the imports, the field' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.4, fontSize: 12,
      fileLabel: 'Start DriveModule.java with this',
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

    K.addFooter(s, { pageNum: 6, label: 'First Motor' });
    s.addNotes(
      'An import lets this file refer to a class from another package by its short name — without the first two, every mention of the motor would have to be spelled com.ctre.phoenix6.hardware.TalonFX in full. org.wpilib.command3 is where Command and Mechanism live — the classes that let this motor plug into the scheduler. Reassure students they don\'t need to memorize import paths: whenever they use a class they haven\'t imported, VS Code underlines it in red and offers to add the import for them. On the field: extends Mechanism declares that DriveModule IS a mechanism, inheriting the machinery that lets the scheduler manage it and hand it commands — this is what plugs DriveModule into the heartbeat from Lesson 0. A field is data the object keeps for life, not a variable that vanishes when a method returns — the motor has to exist for the whole match. private hides it from other classes (encapsulation, paying off in a couple of slides); final means the variable always points at the same motor object; the m_ prefix is a team convention meaning "member field."'
    );
  }

  // ============================================================ SLIDE 7 — DriveModule pieces 3-4
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · DriveModule.java', title: 'The constructor, and the first command' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 4.4, fontSize: 13,
      fileLabel: 'Add to DriveModule, below the field',
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

    K.addFooter(s, { pageNum: 7, label: 'First Motor' });
    s.addNotes(
      'A constructor is the setup method that runs once, the instant new DriveModule() builds the object — spot one by two tells: its name exactly matches the class name, and it has no return type, not even void. This one\'s empty for now (the field above already constructs the motor) but earns its keep in Lesson 3; convention puts the constructor right after the fields. driveAtSpeed is the sneakiest thing in the file: a command factory method. Calling it does NOT spin the motor — it returns a Command, a little recipe the scheduler will run later, which is why the return type is Command and the body starts with return. Walk through the recipe: run(coroutine -> ...) starts building a command whose body is the code between the braces; that coroutine -> arrow is brand-new syntax — like a tiny method with no name, handed over instead of called, that the scheduler runs when the time comes. Inside, m_driveMotor.setThrottle(fraction) sets the motor once, and coroutine.park() tells the scheduler "hold here — keep this command alive until something cancels it" — exactly what "spin while the button is held" needs.'
    );
  }

  // ============================================================ SLIDE 8 — the command factory, explained
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

    K.addFooter(s, { pageNum: 8, label: 'First Motor', dark: true });
    s.addNotes(
      'Two things worth making explicit that aren\'t spelled out on the slide itself. First, why return commands instead of just spinning the motor directly: this is where private pays off. The motor is hidden, so the only way anything outside DriveModule can move it is by asking for a command — and the scheduler guarantees only one command controls a mechanism at a time. If two things try to drive the module at once, the scheduler sorts it out instead of the motor getting conflicting orders; that safety is free. Second, the Watch Out that matters most in this whole lesson: motors do NOT stop on their own when a command ends. set(fraction) writes a value the motor keeps applying until something overwrites it — leave off .whenCanceled(...) and the wheel keeps spinning after the button is released, because the scheduler stops running the command but nobody ever commands 0. Explicit stop, every time — if students take one habit from this lesson, it\'s this one.'
    );
  }

  // ============================================================ SLIDE 9 — give Robot its hardware
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 4 · Robot.java', title: 'Hardware lives on Robot, not on an opmode' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.1, fontSize: 15,
      fileLabel: 'Add to Robot, alongside the existing content',
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

    K.addFooter(s, { pageNum: 9, label: 'First Motor' });
    s.addNotes(
      'Robot is built exactly once, the moment the program starts, and stays alive for as long as the robot runs — through every opmode selected, one after another. An opmode like MyTeleop, by contrast, is thrown away and rebuilt fresh every time it\'s picked on the Driver Station, including the ordinary switch from autonomous to teleop in a real match. A motor needs to exist exactly once, the same way Robot does — so the motor and the controller belong on Robot, and opmodes just reach in and use them. CommandGamepad(0)\'s 0 is a USB port number on the driver station — controller 0 is the first one plugged in; keep that 0 in mind, since the simulator needs to be told which device to feed it, in slot 0. DriveModule() is the moment the mechanism actually gets built — it runs everything written in the previous section, including new TalonFX(...), which brings the motor to life. Notice these fields are public, not private like the motor field — the same encapsulation idea working in reverse: nothing outside DriveModule needs the motor directly, so it\'s hidden, but every opmode needs to reach the module and the controller, so Robot holds them out in the open. Robot is the robot\'s toolbox; opmodes are what you do with the tools. For the imports: VS Code underlines an unimported class in red — Ctrl+. picks the import, a shortcut worth demonstrating live.'
    );
  }

  // ============================================================ SLIDE 10 — keep the scheduler running
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'heartbeat_white.png', eyebrow: 'Section 5 · Robot.java', title: 'Someone has to tick the scheduler, every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 6.6, h: 2.4, fontSize: 17,
      fileLabel: 'Add to Robot, below the constructor',
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

    s.addShape('roundRect', { x: 0.7, y: 4.35, w: 6.6, h: 2.15, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText('Watch out: this scheduler doesn\'t check whether the robot is enabled. What actually stops a disabled robot is the TalonFX itself refusing to apply power — a hardware safety net, not a software one.', {
      x: 1.0, y: 4.5, w: 6.0, h: 1.85, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 10, label: 'First Motor' });
    s.addNotes(
      'The scheduler manages commands so only one runs a mechanism at a time, and it has one job nobody does for it automatically: something has to tell it to check its triggers and run its commands, every single tick. extends Mechanism already registered DriveModule with it — but that registration doesn\'t make anything happen by itself. Lesson 0 introduced the heartbeat: OpModeRobot calls a fixed set of methods on a schedule, forever, whether or not they\'re overridden. robotPeriodic() runs every single tick, no matter which opmode is selected and whether the robot is enabled or disabled — exactly the right place for something that has to keep running no matter what. Scheduler.getDefault() is the one scheduler every mechanism and every trigger plugs into automatically; .run() is the tick — check every trigger, hand out and step every command that should be running right now. Skip this line and none of it moves — buttons would sit there fully wired and nothing would ever happen when pressed.'
    );
  }

  // ============================================================ SLIDE 11 — wire a button
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 6 · MyTeleop.java', title: 'Hold a button, drive a motor' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.15, fontSize: 13,
      fileLabel: "Add to MyTeleop's constructor",
      lines: [
        { text: 'public MyTeleop(Robot robot) {', color: 'FFD166' },
        { text: '  this.robot = robot;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  robot.driverController.southFace().whileTrue(robot.module.driveAtSpeed(0.3));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.6,
      heading: 'Why the constructor, and not start()?',
      headingSize: 22,
      body: 'The constructor runs once, the instant MyTeleop is built. start() runs on every re-enable, so wiring there would register a fresh binding each time. The constructor registers it exactly once.',
    });

    K.addFooter(s, { pageNum: 11, label: 'First Motor' });
    s.addNotes(
      'CommandGamepad gives a method per button — southFace(), eastFace(), leftBumper(), and so on — named by where the button sits on the pad rather than by letter; on a standard layout, southFace() is the bottom face button, the one an Xbox pad labels A. Each hands back a Trigger: an object that answers "is that button down right now?" and, more usefully, lets you attach a command to it. What that binding line says: while the bottom face button is held (whileTrue), schedule the command driveAtSpeed(0.3) returns; let go, and the scheduler cancels it, firing the .whenCanceled(...) cleanup so the motor stops. This line runs once, when MyTeleop is constructed — it registers the wiring, and the scheduler does the watching from then on. Why the constructor and not start()? The constructor runs once, the instant MyTeleop is built, when it\'s selected on the Driver Station. start() runs on a different schedule — every time the robot goes from disabled to enabled, more than once per opmode. Toggle Robot State off and back on in SimGUI and watch: wiring in start() would register a fresh binding on top of the old one each re-enable. The constructor registers it exactly once.'
    );
  }

  // ============================================================ SLIDE 12 — run it
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

    K.addFooter(s, { pageNum: 12, label: 'First Motor' });
    s.addNotes(
      'Before the button can do anything, SimGUI needs a controller handed to it — it doesn\'t pick one up on its own, and this is the step everybody misses the first time, then spends ten minutes convinced their binding is broken. System Joysticks lists what the laptop has attached, including Keyboard 0 and Keyboard 1 as stand-ins; Joysticks is the panel the robot code actually reads, numbered slots starting at 0. Slot 0 isn\'t arbitrary — it\'s the 0 in CommandGamepad(0); the field and the panel have to agree. Using a real gamepad? Turn on the Map gamepad toggle underneath the Joysticks panel — the real Driver Station quietly remaps gamepads so every controller reports buttons in the same order, and SimGUI doesn\'t bother unless asked. Closing thought worth saying out loud: a number changing in a panel isn\'t as satisfying as a wheel spinning, but that number IS the code commanding a motor because a button was pressed. It counts.'
    );
  }

  // ============================================================ SLIDE 13 — see what's running
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'listol_white.png', eyebrow: 'Section 8 · Robot.java', title: 'What is this mechanism doing right now?' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.4, fontSize: 14,
      fileLabel: "Add to Robot, below robotPeriodic()",
      lines: [
        { text: 'private void logRunningCommand() {', color: 'FFD166' },
        { text: '  List<Command> running = Scheduler.getDefault().getRunningCommandsFor(module);', color: 'D7E3F4' },
        { text: '  Command current = running.get(0);', color: 'D7E3F4' },
        { text: '  SmartDashboard.putString("DriveModule/CurrentCommand", current.name());', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.7,
      heading: 'getRunningCommandsFor(module) returns a List<Command>.',
      headingSize: 21,
      body: '.get(0) asks for entry zero — safe here because a mechanism can only ever have one command running on it. Read it after Scheduler.run(), never before, or the list is still empty.',
    });

    K.addFooter(s, { pageNum: 13, label: 'First Motor' });
    s.addNotes(
      'Back in the command-factory section, .named("Drive At Speed") came with a promise: that name would show up later, in logs and on screen. This cashes it in — just enough to see it work, with the rest coming as the course builds up its telemetry in Lesson 3. The scheduler already knows, at every instant, which command owns which mechanism — the same "only one command per mechanism" rule from earlier — so it can just be asked. getRunningCommandsFor(module) hands back a List<Command>, a numbered collection; .get(0) asks for entry zero, safe here only because a mechanism can have exactly one command running on it. Order matters: logRunningCommand() has to run after Scheduler.getDefault().run(), not before — the scheduler doesn\'t know anything is running until it\'s actually ticked once, so asking beforehand on the very first frame would find an empty list. On the dashboard, CurrentCommand reads "DriveModule[IDLE]" at rest — Mechanism\'s own name for the fallback command every mechanism starts with — and flips to "Drive At Speed" the instant the button is held. Worth flagging as a preview: this only works because everything built so far either parks or loops forever, so there\'s always something running whenever asked. Lesson 3 replaces the asking with listening.'
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
        { title: 'Add a reverse button', body: 'eastFace() drives at -0.3. Press both — the most-recently-scheduled command wins cleanly.' },
        { title: 'Change the CAN ID', body: 'Rebuild. Nothing breaks in sim, but get in the habit of setting IDs deliberately.' },
        { title: 'Move the ID into a constant', body: 'Create Constants.java with DriveConstants.kDriveMotorPort — this is where robot numbers should live.' },
        { title: 'Use the constant', body: 'Reference it as Constants.DriveConstants.kDriveMotorPort in the subsystem instead of a bare number.' },
      ],
    });

    K.addFooter(s, { pageNum: 14, label: 'First Motor', dark: true });
    s.addNotes(
      'Three exercises, and the third plants a habit that carries the rest of the course. First, a reverse button on eastFace() at -0.3 — pressing both proves the scheduler lets the most-recently-scheduled command win cleanly, no conflict. Second, changing the CAN ID and rebuilding — nothing breaks in sim since IDs only matter on the real robot, but it builds the habit of setting them deliberately. Third — the one to spend real time on — moving the CAN ID out of the code and into a named constant in a new Constants.java, referenced as Constants.DriveConstants.kDriveMotorPort. This is where robot numbers should live, and it\'s the pattern every later lesson assumes.'
    );
  }

  // ============================================================ SLIDE 15 — what you learned + next
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

    K.addFooter(s, { pageNum: 15, label: 'First Motor' });
    s.addNotes(
      'The big new idea is the object — a live instance of a class, made with new — plus the anatomy of a class that owns one: imports up top borrowing classes from other packages, fields holding data the object keeps for life, a constructor doing setup when the object is born, and methods below, with private keeping other classes\' hands off the hardware. Where each piece goes matters as much as what it does — package, imports, fields, constructor, methods — and that anatomy repeats in every file from here on. Mechanisms expose behavior as command factory methods that return commands, so the scheduler can manage who controls the hardware; motors hold the last value set, which is why a command that spins a motor pairs a start with a .whenCanceled(...) cleanup. Hardware belongs on Robot, built once and lasting the whole run, not on an opmode that\'s rebuilt fresh every time it\'s selected — and Robot got one more permanent job, ticking the Scheduler from robotPeriodic(). The simulator needs a joystick dragged into slot 0 before any of it responds — worth remembering, since that one bites people every season. Next lesson: that hard-coded 0.3 becomes a live joystick reading, and this starts feeling like driving.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '01-first-motor.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
