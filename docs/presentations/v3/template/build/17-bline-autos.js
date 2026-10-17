const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

// Code-card colors, the same ones every deck in the series uses.
const COMMENT = '7FA8C9';
const NEW = '9EF01A';
const SIG = 'FFD166';
const PLAIN = 'D7E3F4';

const LABEL = 'B-Line Autos';

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 17 — B-Line Autos: Following a Drawn Path' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 17',
    title: 'B-Line Autos',
    subtitle: 'A path is a shape on the field, and the robot chases it',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3  ·  BLine 2027.0.0-beta.1',
  });
  titleSlide.addNotes(
    'Lesson 9\'s autonomous was a script: drive a meter, turn, drive a meter. Today it becomes a path — points in field coordinates, drawn on a picture of the field, saved in a file you can redraw between matches — and the robot\'s job changes from "perform these moves in order" to "find the nearest point on that shape and chase it." That only works because Lesson 14 gave the robot a fused estimate of where it is, so this is where three lessons of localization work finally pay off.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'shoeprints_white.png', eyebrow: 'The Goal', title: 'Retire the script, follow a drawn path' });

    s.addShape('roundRect', { x: 0.7, y: 1.6, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Replace hand-composed drive-turn-drive autos with a real path — drawn as points on a picture of the field, saved as a file, and followed continuously against Lesson 14\'s fused pose — with one autonomous opmode per path.',
      { x: 1.05, y: 1.73, w: 11.2, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 18, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'PIDController — the class behind the P control you\'ve written by hand', options: { bullet: true, breakLine: true } },
        { text: 'Method references as actions, not just values', options: { bullet: true, breakLine: true } },
        { text: 'The deploy folder — files the robot reads, not code', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('robot_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'B-Line\'s path model: straight segments', options: { bullet: true, breakLine: true } },
        { text: 'Three loops at once', options: { bullet: true, breakLine: true } },
        { text: 'Speed limits are physics — can it stop?', options: { bullet: true, breakLine: true } },
        { text: 'Event markers along a path', options: { bullet: true, breakLine: true } },
        { text: 'An opmode is built when it\'s selected', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: LABEL });
    s.addNotes(
      'B-Line\'s path model is a chain of Waypoints, TranslationTargets and RotationTargets, connected by straight lines rather than curves. Following a path is three separate control loops at once — distance-to-go, heading, and drift off the line. The speed limits in the path\'s config file aren\'t taste: whether the robot can stop where you asked is arithmetic you can do before it ever moves. Event markers fire an action partway along a path. And an opmode is built the moment it\'s selected, so an auto\'s path file is read — and, in the simulator, the robot set down at its start — while the robot is still disabled.'
    );
  }

  // ============================================================ SLIDE 3 — §1 the script
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'history_white.png', eyebrow: 'Section 1 · What drive-turn-drive can\'t do', title: 'A script of nudges, with no idea where it is' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.95, fontSize: 14, example: true,
      fileLabel: 'Nothing to add — this is code you already have (Autos.driveTurnDrive)',
      lines: [
        { text: 'return Command.noRequirements(coroutine -> {', color: SIG },
        { text: '      coroutine.await(drivetrain.driveDistance(1.0));  // step 1: forward 1 meter', color: PLAIN },
        { text: '      coroutine.await(drivetrain.turnToHeading(90));   // step 2: face 90°', color: PLAIN },
        { text: '      coroutine.await(drivetrain.driveDistance(1.0));  // step 3: forward 1 meter', color: PLAIN },
        { text: '    })', color: PLAIN },
        { text: '    .named("Drive Turn Drive");', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.6, w: 11.9, h: 2.3,
      heading: 'Errors don\'t cancel — they stack',
      headingSize: 22,
      body: 'Each step starts wherever the last one ended. Bump the robot at the start and every step after it is wrong by that much, with nothing in the code that could notice.',
      bodySize: 19,
    });

    K.addFooter(s, { pageNum: 3, label: LABEL });
    s.addNotes(
      'That\'s a script, and it works. But notice what it doesn\'t contain: any mention of where the robot is on the field. It\'s a sequence of relative nudges — go forward a bit, spin, go forward a bit. It\'s also stuck driving in straight lines and turning in place, because that\'s all driveDistance and turnToHeading know how to do. Lesson 10 gave this chassis the ability to translate and rotate simultaneously — full swerve freedom — and the autos have never once used it.'
    );
  }

  // ============================================================ SLIDE 4 — §1 the shift
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'shoeprints_white.png', eyebrow: 'Section 1 · The whole lesson', title: 'A path isn\'t a list of moves — it\'s a shape', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.55, bg: NAVY2,
      heading: 'The robot\'s job: chase the nearest point on the shape, continuously',
      headingColor: WHITE, headingSize: 22,
      body: 'Drift off the line, for any reason, and the follower simply drives back. It doesn\'t need to know why you were off — it only needs to know where you are, which Lesson 14 gave you.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.45, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'B-Line connects points with straight lines',
      headingColor: WHITE, headingSize: 22,
      body: 'No curves fitted through your points: corners get rounded by handing off to the next segment early. Less elegant than splines, and much easier to reason about.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 4, label: LABEL, dark: true });
    s.addNotes(
      'That reframing is what makes the fused pose from Lesson 14 finally pay off. If you know where you are — really know, gyro and wheels and cameras all folded together — then "am I on the line?" is a question you can answer fifty times a second and fix. Most path libraries fit smooth splines through your points; B-Line connects them with lines and rounds the corners by handing off to the next segment early. You can look at a drawn path and know what the robot will do.'
    );
  }

  // ============================================================ SLIDE 5 — §2 install
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'download_white.png', eyebrow: 'Section 2 · Install BLine', title: 'Installed by URL, like LimelightLib' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 0.85,
      steps: [
        { title: 'Ctrl+Shift+P → WPILib: Manage Vendor Libraries', detail: 'Then Install new library (online) — BLine isn\'t in the search list.' },
        { title: 'Paste the URL below', detail: 'It installs BLine-Lib-2027.json, the build for Commands V3.' },
        { title: 'Rebuild: ./gradlew build', detail: 'A BLine-Lib.json in vendordeps is the 2026 build — remove it.' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.5, w: 11.9, h: 1.45, fontSize: 14,
      fileLabel: 'Paste into the dialog as ONE line',
      lines: [
        { text: 'https://raw.githubusercontent.com/edanliahovetsky/BLine-Lib/', color: NEW },
        { text: 'd9967810725ff861767ccde5c5d84981b9defc94/BLine-Lib-2027.json', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.05, w: 11.9, h: 0.9,
      body: 'That long URL names the commit tagged 2027.0.0-beta.1. A commit can\'t change.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: LABEL });
    s.addNotes(
      'Same ritual as Lesson 15\'s LimelightLib: BLine isn\'t in WPILib\'s online search list, so you install it by URL. The long URL names one exact commit, the one BLine tagged as its 2027.0.0-beta.1 release, for the same reason as Lesson 15\'s: BLine\'s own docs hand out a shorter link that follows whatever they publish next. The file it installs is BLine-Lib-2027.json — the 2027 build, written for this framework\'s Commands V3. BLine\'s 2026 build is a different file for a different command framework.'
    );
  }

  // ============================================================ SLIDE 6 — §2 packages
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 2 · One thing that will look wrong', title: 'BLine lives under frc.robot.lib.BLine', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.6, bg: NAVY2,
      heading: 'Not your code, even though the package says frc.robot',
      headingColor: WHITE, headingSize: 22,
      body: 'Every other library announced itself with a vendor\'s name — com.ctre.phoenix6, com.limelightvision. BLine chose frc.robot.lib.BLine. Unusual, not a mistake: it still comes from the jar.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.5, w: 11.9, h: 2.4, bg: NAVY2,
      heading: 'Four packages you\'ll import from',
      headingColor: WHITE, headingSize: 22,
      body: '.commands (FollowPath) · .path (Path) · .following (DriveType) · .field (FlippingUtil)',
      bodyColor: 'D7E3F4', bodySize: 20,
    });

    K.addFooter(s, { pageNum: 6, label: LABEL, dark: true });
    s.addNotes(
      'BLine\'s classes live in packages under frc.robot.lib.BLine — frc.robot.lib.BLine.commands, frc.robot.lib.BLine.path, and a couple of others. So when you type import frc.robot.lib.BLine.path.Path; and it resolves to something you never wrote — in a package that isn\'t even your first.robot — that\'s not a mistake. It\'s just an unusual packaging choice, and it still comes from the jar.'
    );
  }

  // ============================================================ SLIDE 7 — §3 the two doors
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'dooropen_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'Two new doors: read the motion, command a motion' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.45, fontSize: 13,
      fileLabel: 'Add to Drivetrain, below getModulePositions',
      lines: [
        { text: '/**', color: COMMENT },
        { text: ' * How the chassis is moving right now, robot-relative — kinematics run', color: COMMENT },
        { text: ' * backward: four measured wheel velocities in, one chassis motion out.', color: COMMENT },
        { text: ' */', color: COMMENT },
        { text: 'public ChassisVelocities getChassisVelocities() {', color: SIG },
        { text: '  SwerveModuleVelocity[] wheels = new SwerveModuleVelocity[m_modules.length];', color: NEW },
        { text: '  for (int i = 0; i < m_modules.length; i++) {', color: NEW },
        { text: '    wheels[i] = new SwerveModuleVelocity(', color: NEW },
        { text: '        m_modules[i].getDriveVelocityMetersPerSec(),', color: NEW },
        { text: '        Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));', color: NEW },
        { text: '  }', color: NEW },
        { text: '  return m_kinematics.toChassisVelocities(wheels);', color: NEW },
        { text: '}', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '/** Drive one tick from a robot-relative chassis motion. The door BLine drives through. */', color: COMMENT },
        { text: 'public void driveRobotRelative(ChassisVelocities speeds) {', color: SIG },
        { text: '  applyChassisSpeeds(speeds);', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 7, label: LABEL });
    s.addNotes(
      'B-Line drives your robot the same way a human driver does: it looks at where you are, decides on a chassis motion, and hands it over. So it needs two things from Drivetrain that aren\'t public yet. You\'ve already written the reading half: Lesson 16\'s simulateChassis asked the kinematics the question backward — here are the four wheel velocities I\'m measuring, what single chassis motion would produce them? Two callers now want the same answer, so it moves into its own method — the same "pull out a helper" move as Lesson 8\'s commandRotation. Both go with the other public accessors — getKinematics, getRotation, getModulePositions.'
    );
  }

  // ============================================================ SLIDE 8 — §3 simulateChassis + why a door
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'dooropen_white.png', eyebrow: 'Section 3 · Drivetrain.java', title: 'simulateChassis now asks the new method' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.95, fontSize: 14,
      fileLabel: 'Then replace the body of simulateChassis below the null check',
      lines: [
        { text: '/** Moves the simulated chassis the way its wheels actually turned this tick. Sim only. */', color: COMMENT },
        { text: 'private void simulateChassis() {', color: SIG },
        { text: '  if (m_chassisSim == null) {', color: PLAIN },
        { text: '    return; // a real robot moves itself', color: PLAIN },
        { text: '  }', color: PLAIN },
        { text: '  m_chassisSim.update(getChassisVelocities(), 0.020);', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.6, w: 11.9, h: 2.3,
      heading: 'A door punched on purpose, for one caller',
      headingSize: 22,
      body: 'applyChassisSpeeds stays private. driveRobotRelative is a narrow public door with a name that says who it\'s for — not a visibility change.',
      bodySize: 19,
    });

    K.addFooter(s, { pageNum: 8, label: LABEL });
    s.addNotes(
      'driveRobotRelative seems to do nothing: applyChassisSpeeds already exists and already does exactly this. But it\'s private — deliberately, since Lesson 10 — so that nothing outside Drivetrain could command the wheels without going through a command factory. A door punched in that wall on purpose, for one specific outside caller, is a normal and healthy thing to do; quietly making applyChassisSpeeds public would not be. Why isn\'t it a Command like everything else? Because B-Line is building the command. It needs a plain method it can call every tick from inside its own command. You write the method; the library decides when to call it.'
    );
  }

  // ============================================================ SLIDE 9 — §4 PIDController
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 4 · Meet PIDController', title: 'The class behind code you\'ve written three times' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.6, fontSize: 16, example: true,
      fileLabel: 'Nothing to add — Lessons 5, 8 and 11, by hand',
      lines: [
        { text: 'double error = target - measured;', color: PLAIN },
        { text: 'double output = kP * error;', color: PLAIN },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.2, w: 11.9, h: 1.6, fontSize: 16, example: true,
      fileLabel: 'Nothing to add — this is just how the class is used',
      lines: [
        { text: 'PIDController controller = new PIDController(5.0, 0.0, 0.0);', color: PLAIN },
        { text: 'double output = controller.calculate(measured, target);', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 1.9,
      body: 'calculate(measured, target) is your two lines. The three numbers are the P, I and D gains — leave I and D at zero. What the class adds is state: it remembers past errors and knows a tolerance.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 9, label: LABEL });
    s.addNotes(
      'Lesson 5 steered a module with those two lines. Lesson 8 turned to a heading. Lesson 11 drove to a pose. WPILib has had a class for this the whole time, and now you need three of them at once, so it\'s finally worth reaching for. A plain P loop is genuinely the right answer for path following, and I and D are a different lesson\'s problem. Beyond tidiness, the class remembers the previous error so it can compute a derivative, accumulates error so it can integrate, and can be told a tolerance and asked whether it\'s there yet. B-Line uses all of that inside its follower — you just hand it the controllers.'
    );
  }

  // ============================================================ SLIDE 10 — §4 three loops
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'random_white.png', eyebrow: 'Section 4 · Why three?', title: 'Chasing a line is three separate jobs', badgeColor: ORANGE });

    const cards = [
      { heading: 'Translation', body: 'How much path is left? Error: meters remaining. Output: meters per second.' },
      { heading: 'Rotation', body: 'Which way to face, independent of where you go. Error: radians. Output: rad/s.' },
      { heading: 'Cross-track', body: 'Half a meter left of the line? Push sideways back onto it. Meters off → m/s.' },
    ];
    cards.forEach((c, i) => {
      K.addCard(s, {
        x: 0.7 + i * 4.07, y: 1.7, w: 3.77, h: 3.45, bg: NAVY2,
        heading: c.heading, headingColor: WHITE, headingSize: 22,
        body: c.body, bodyColor: 'D7E3F4', bodySize: 19,
      });
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.5, bg: NAVY2,
      body: 'Every gain is output per unit of error, per second — 1/s — so all three sit in the same ballpark.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 10, label: LABEL, dark: true });
    s.addNotes(
      'The three loops pull in different directions. Translation drives faster when there\'s a lot of path left and eases off as you arrive. Rotation spins the chassis toward the heading the path asked for, with no regard for the driving — because swerve. Cross-track catches what neither of the others notices: you\'re headed the right way at the right speed, but you\'re half a meter to the left of the line. That\'s why the numbers are all in the same ballpark despite measuring different things.'
    );
  }

  // ============================================================ SLIDE 11 — §4 PathConstants
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 4 · Constants.java', title: 'Three gains, one new class' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.5, fontSize: 13,
      fileLabel: 'Add to Constants.java, as a new nested class after VisionConstants',
      lines: [
        { text: 'public static final class PathConstants {', color: SIG },
        { text: '  // BLine runs three P loops at once. Every gain here is "output per unit of', color: COMMENT },
        { text: '  // error", and since error is meters (or radians) and output is per-second,', color: COMMENT },
        { text: '  // the units all come out to 1/s.', color: COMMENT },
        { text: '  public static final double kTranslationP = 5.0; // m/s per meter of path left', color: NEW },
        { text: '  public static final double kRotationP = 3.0;    // rad/s per radian of heading error', color: NEW },
        { text: '  public static final double kCrossTrackP = 2.0;  // m/s per meter off the line', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.15, w: 11.9, h: 1.75,
      body: 'Gains stay bare doubles, same as kDriveKV and HeadingConstants.kP — they\'re ratios, not physical quantities, so there\'s no unit for Units to carry.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 11, label: LABEL });
    s.addNotes(
      'kTranslationP is meters per second of speed for every meter of path left; kRotationP is radians per second for every radian of heading error; kCrossTrackP is meters per second of sideways push for every meter off the line. Section 5 comes back to kTranslationP, because it\'s half of the arithmetic that decides whether the robot can stop where you asked.'
    );
  }

  // ============================================================ SLIDE 12 — §5 path model
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 5 · Draw a path', title: 'Three things you can place on the field' });

    const cards = [
      { heading: 'Waypoint', body: 'A position and a heading: "be here, facing this way."' },
      { heading: 'TranslationTarget', body: 'A position only: "drive through this point, any heading."' },
      { heading: 'RotationTarget', body: 'A heading only, partway along a segment: "by about here, face this way."' },
    ];
    cards.forEach((c, i) => {
      K.addCard(s, {
        x: 0.7 + i * 4.07, y: 1.6, w: 3.77, h: 3.3,
        heading: c.heading, headingSize: 22,
        body: c.body, bodySize: 20,
      });
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.8,
      body: 'The split exists because swerve decouples the two: a robot can loop around an obstacle while slowly turning to face a target the whole time.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 12, label: LABEL });
    s.addNotes(
      'BLine Web is a path editor that runs in your browser: drop points on a picture of the field, drag them around, and export a .json file. The 2027 build you installed has its own beta editor, which BLine\'s 2027 guide lists at web-beta.bline-web.pages.dev — use that one, not the 2026 editor. Whether you draw it or type it, the result is a JSON file, and you should see one so the editor stops being magic. You want to say "where" and "which way" separately instead of pretending each corner needs a heading.'
    );
  }

  // ============================================================ SLIDE 13 — §5 create the files
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 5 · New files', title: 'Paths live in the deploy folder' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Right-click src/main/deploy → New Folder: autos', detail: 'The deploy folder you\'ve had since Lesson 0 — for files the robot reads.' },
        { title: 'Right-click autos → New Folder: paths', detail: 'One JSON file per path goes in here.' },
        { title: 'Right-click paths → New File: TwoCorners.json, then FarSide.json', detail: 'The next slides show what goes in each.' },
        { title: 'Right-click autos → New File: config.json', detail: 'Speed limits shared by every path. Not optional.' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: LABEL });
    s.addNotes(
      'Anything under src/main/deploy/ gets copied onto the robot next to your program when you deploy — it\'s for the files your code needs to read rather than compile. Paths are exactly that kind of file: you want to redraw one between matches without recompiling anything. The simulator reads from the same folder, so a path you drop in works in sim immediately.'
    );
  }

  // ============================================================ SLIDE 14 — TwoCorners.json part 1
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'shoeprints_white.png', eyebrow: 'Section 5 · TwoCorners.json', title: 'Start at (3, 3), through (6, 3), turning toward 90°' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.55, fontSize: 12,
      fileLabel: 'Create src/main/deploy/autos/paths/TwoCorners.json — part 1',
      lines: [
        { text: '{', color: PLAIN },
        { text: '  "path_elements": [', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "waypoint",', color: SIG },
        { text: '      "translation_target": { "x_meters": 3.0, "y_meters": 3.0 },', color: NEW },
        { text: '      "rotation_target": { "rotation_radians": 0.0 }', color: NEW },
        { text: '    },', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "translation",', color: SIG },
        { text: '      "x_meters": 6.0,', color: NEW },
        { text: '      "y_meters": 3.0', color: NEW },
        { text: '    },', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "rotation",', color: SIG },
        { text: '      "rotation_radians": 1.5707963,', color: NEW },
        { text: '      "t_ratio": 0.5,', color: NEW },
        { text: '      "profiled_rotation": true', color: NEW },
        { text: '    },', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 14, label: LABEL });
    s.addNotes(
      'The simulated robot starts at (3, 3) facing 0° — that\'s DriveConstants.kSimStartingPose from Lesson 16 — so this path starts there too. A t_ratio of 0.5 is "halfway along this segment": rotations get placed by fraction-of-segment rather than by coordinate, since they don\'t have a position of their own. The simulated field is empty — Lesson 16\'s chassis has no walls and nothing to bump into — so a path can cross places a real robot couldn\'t. When you draw paths for a real field, draw them around its structures.'
    );
  }

  // ============================================================ SLIDE 15 — TwoCorners.json part 2
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'shoeprints_white.png', eyebrow: 'Section 5 · TwoCorners.json', title: 'An event marker, then the end at (6, 6)' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.0, fontSize: 12,
      fileLabel: 'TwoCorners.json — part 2, finishing the file',
      lines: [
        { text: '    {', color: PLAIN },
        { text: '      "type": "event_trigger",', color: SIG },
        { text: '      "t_ratio": 0.8,', color: NEW },
        { text: '      "lib_key": "shoot"', color: NEW },
        { text: '    },', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "waypoint",', color: SIG },
        { text: '      "translation_target": { "x_meters": 6.0, "y_meters": 6.0 },', color: NEW },
        { text: '      "rotation_target": { "rotation_radians": 3.1415927, "profiled_rotation": true }', color: NEW },
        { text: '    }', color: PLAIN },
        { text: '  ]', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.3,
      body: 'Read it as a sentence: start at (3, 3) facing 0°, drive through (6, 3), face 90° halfway up the next leg, end at (6, 6) facing 180°.',
      pad: 0.2, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 15, label: LABEL });
    s.addNotes(
      'The event_trigger element is for section 9 — leave it in for now. Angles here are radians, not degrees: 1.5707963 is 90° and 3.1415927 is 180°. The editor writes them for you; this is mostly a warning for when you hand-edit and wonder why 90 sent the robot somewhere strange.'
    );
  }

  // ============================================================ SLIDE 16 — profiled rotation + radians (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 5 · Reading the file', title: 'Two details that change what the robot does', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.5, bg: NAVY2,
      heading: '"profiled_rotation": true turns the robot gradually',
      headingColor: WHITE, headingSize: 22,
      body: 'The heading the path asks for turns in step with progress along the path. Leave it out and the robot faces 90° before it even reaches the first corner.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.4, w: 11.9, h: 2.5, bg: NAVY2,
      heading: 'Angles are radians, and t_ratio is a fraction',
      headingColor: WHITE, headingSize: 22,
      body: '1.5707963 is 90°. A t_ratio of 0.5 means halfway along the segment the element sits in.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 16, label: LABEL, dark: true });
    s.addNotes(
      '"profiled_rotation": true is what makes "by halfway up the next leg" true. With it, the heading the path asks for turns gradually, in step with how far along the path you are. Leave it out and the robot turns to face the next heading as fast as it can, the moment that target becomes the next one — on this path, that means it\'s already facing 90° before it reaches the first corner.'
    );
  }

  // ============================================================ SLIDE 17 — config.json
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 5 · config.json', title: 'How fast every path is allowed to go' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.0, fontSize: 13,
      fileLabel: 'Create src/main/deploy/autos/config.json',
      lines: [
        { text: '{', color: PLAIN },
        { text: '  "kinematic_constraints": {', color: PLAIN },
        { text: '    "default_max_velocity_meters_per_sec": 2.0,', color: NEW },
        { text: '    "default_max_acceleration_meters_per_sec2": 6.0,', color: NEW },
        { text: '    "default_max_velocity_deg_per_sec": 360.0,', color: NEW },
        { text: '    "default_max_acceleration_deg_per_sec2": 720.0,', color: NEW },
        { text: '    "default_end_translation_tolerance_meters": 0.05,', color: NEW },
        { text: '    "default_end_rotation_tolerance_deg": 2.0,', color: NEW },
        { text: '    "default_intermediate_handoff_radius_meters": 0.5', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.3,
      body: 'Handoff radius 0.5: start turning up the next leg half a meter before the corner, instead of driving all the way in.',
      pad: 0.2, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 17, label: LABEL });
    s.addNotes(
      'config.json is not optional. B-Line reads it every time it loads a path, so a missing file is an error the moment the path loads, not a quiet default. The last number, handoff radius, is the cornering knob: how close the robot has to get to a point before it gives up on it and starts driving to the next one. The first two numbers deserve more than a glance, because they\'re not taste — that\'s the next slide.'
    );
  }

  // ============================================================ SLIDE 18 — the stopping arithmetic
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 5 · Not taste — physics', title: 'Can it stop in time? Two lines of arithmetic', badgeColor: ORANGE });

    const cols = [
      { label: 'AT 2 m/s — THE SHIPPED LIMIT', warn: '0.40 m', warnHow: 'warning: 2.0 ÷ 5.0', stop: '0.33 m', stopHow: 'to stop: 2² ÷ (2 × 6)', verdict: 'Fits — the robot arrives', vColor: '9EF01A' },
      { label: 'AT 3 m/s', warn: '0.60 m', warnHow: 'warning: 3.0 ÷ 5.0', stop: '0.75 m', stopHow: 'to stop: 3² ÷ (2 × 6)', verdict: 'Doesn\'t fit — it sails past', vColor: 'FF8B8B' },
    ];
    cols.forEach((c, i) => {
      const x = 0.7 + i * 6.1;
      s.addShape('roundRect', { x, y: 1.65, w: 5.8, h: 4.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c.label, { x: x + 0.3, y: 1.85, w: 5.2, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 0.5, margin: 0 });
      s.addText(c.warn, { x: x + 0.3, y: 2.4, w: 2.2, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 40, color: WHITE, valign: 'middle', margin: 0 });
      s.addText(c.warnHow, { x: x + 2.6, y: 2.5, w: 3.0, h: 0.7, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'middle', margin: 0 });
      s.addText(c.stop, { x: x + 0.3, y: 3.45, w: 2.2, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 40, color: WHITE, valign: 'middle', margin: 0 });
      s.addText(c.stopHow, { x: x + 2.6, y: 3.55, w: 3.0, h: 0.7, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'middle', margin: 0 });
      s.addText(c.verdict, { x: x + 0.3, y: 4.6, w: 5.2, h: 0.75, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: c.vColor, valign: 'middle', margin: 0 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.85, w: 11.9, h: 1.05, bg: NAVY2,
      body: 'B-Line plans nothing ahead: acceleration alone decides if it can stop.',
      bodyColor: 'D7E3F4', pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 18, label: LABEL, dark: true });
    s.addNotes(
      'The translation loop just asks for kTranslationP × distance left, capped at the max speed, and the acceleration limit decides how fast the robot is allowed to change what it\'s doing. The loop starts slowing the robot when 5.0 × distance left drops below the top speed — at 2 m/s, that\'s 0.4 m from the end. Stopping from 2 m/s at 6 m/s² takes 0.33 m. 0.33 m of stopping fits inside 0.4 m of warning, so the robot arrives. At 3 m/s it wouldn\'t. The same limit governs corners — turning 2 m/s of "east" into 2 m/s of "north" is a change in velocity like any other — and with these numbers the robot swings roughly 5–12 cm past the first corner. If one thing from this lesson sticks, make it this: you can do this math before the robot ever moves.'
    );
  }

  // ============================================================ SLIDE 19 — FarSide.json
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'shoeprints_white.png', eyebrow: 'Section 5 · FarSide.json', title: 'A second path, from the same start' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.15, fontSize: 12,
      fileLabel: 'Create src/main/deploy/autos/paths/FarSide.json',
      lines: [
        { text: '{', color: PLAIN },
        { text: '  "path_elements": [', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "waypoint",', color: SIG },
        { text: '      "translation_target": { "x_meters": 3.0, "y_meters": 3.0 },', color: NEW },
        { text: '      "rotation_target": { "rotation_radians": 0.0 }', color: NEW },
        { text: '    },', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "translation",', color: SIG },
        { text: '      "x_meters": 9.0,', color: NEW },
        { text: '      "y_meters": 3.0', color: NEW },
        { text: '    },', color: PLAIN },
        { text: '    {', color: PLAIN },
        { text: '      "type": "waypoint",', color: SIG },
        { text: '      "translation_target": { "x_meters": 9.0, "y_meters": 1.0 },', color: NEW },
        { text: '      "rotation_target": { "rotation_radians": -1.5707963, "profiled_rotation": true }', color: NEW },
        { text: '    }', color: PLAIN },
        { text: '  ]', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 19, label: LABEL });
    s.addNotes(
      'Real robots carry several autos, and having two here makes something visible in section 7 that one path would hide. It starts at the same place as Two Corners, then runs past the middle of the field and turns right, ending up facing −90°.'
    );
  }

  // ============================================================ SLIDE 20 — makePathBuilder
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'sitemap_white.png', eyebrow: 'Section 6 · Autos.java', title: 'FollowPath.Builder: everything about this robot' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.45, fontSize: 11.5,
      fileLabel: 'Add to Autos, below driveTurnDrive',
      lines: [
        { text: '/** Everything about following a path that doesn\'t depend on which path it is. */', color: COMMENT },
        { text: 'public static FollowPath.Builder makePathBuilder(Drivetrain drivetrain, Localizer localizer) {', color: SIG },
        { text: '  return new FollowPath.Builder(', color: NEW },
        { text: '      DriveType.SWERVE,                  // what kind of drivetrain this is', color: NEW },
        { text: '      drivetrain,                        // the mechanism the command will require', color: NEW },
        { text: '      localizer::getPose,                // where we are (fused, Lesson 14)', color: NEW },
        { text: '      localizer::resetPose,              // how to tell the estimate where we are', color: NEW },
        { text: '      drivetrain::getChassisVelocities,  // how fast we\'re going, robot-relative', color: NEW },
        { text: '      drivetrain::driveRobotRelative,    // how to make the robot move', color: NEW },
        { text: '      new PIDController(PathConstants.kTranslationP, 0, 0),', color: NEW },
        { text: '      new PIDController(PathConstants.kRotationP, 0, 0),', color: NEW },
        { text: '      new PIDController(PathConstants.kCrossTrackP, 0, 0))', color: NEW },
        { text: '      .withDefaultShouldFlip()           // mirror the path for the red alliance', color: NEW },
        { text: '      .withTelemetry(Telemetry.getTable()); // log what the follower is doing', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 20, label: LABEL });
    s.addNotes(
      'B-Line needs a handful of facts about your specific robot before it can drive it down a line, and FollowPath.Builder is where you hand them over. Once it has them, build(path) turns a Path into an ordinary Commands V3 Command. Everything about following a path lives in Autos, next to driveTurnDrive, because it\'s all about autonomous — so that\'s where the builder gets made. Nine arguments, and you\'ve already met every idea in them.'
    );
  }

  // ============================================================ SLIDE 21 — Autos imports + the arguments
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'listol_white.png', eyebrow: 'Section 6 · Autos.java', title: 'Imports, and the first two arguments' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.95, fontSize: 14,
      fileLabel: 'Add to Autos\'s imports',
      lines: [
        { text: 'import org.wpilib.math.controller.PIDController;', color: NEW },
        { text: 'import org.wpilib.telemetry.Telemetry;', color: NEW },
        { text: '', color: PLAIN },
        { text: 'import first.robot.Constants.PathConstants;', color: NEW },
        { text: 'import first.robot.subsystems.Localizer;', color: NEW },
        { text: 'import frc.robot.lib.BLine.commands.FollowPath;', color: NEW },
        { text: 'import frc.robot.lib.BLine.following.DriveType;', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.6, w: 11.9, h: 2.3,
      heading: 'DriveType.SWERVE, then the mechanism it requires',
      headingSize: 22,
      body: 'B-Line drives tank and mecanum too. The drivetrain argument is Lesson 9\'s mutual exclusion: teleop driving steps aside while a path runs.',
      bodySize: 19,
    });

    K.addFooter(s, { pageNum: 21, label: LABEL });
    s.addNotes(
      'The first argument says what kind of drivetrain this is — B-Line can drive tank and mecanum robots too, and it follows a path differently for each. The second is the mechanism the command requires — Lesson 9\'s mutual exclusion, so your teleop drive command steps aside while a path is running.'
    );
  }

  // ============================================================ SLIDE 22 — suppliers vs verbs
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 6 · Method references', title: 'Two of them fetch a value; two of them are verbs', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 5.8, h: 3.85, bg: NAVY2,
      eyebrow: 'Suppliers', eyebrowColor: TEAL,
      heading: 'localizer::getPose, drivetrain::getChassisVelocities',
      headingColor: WHITE, headingSize: 20,
      body: 'Fetch a value when asked — like the joystick suppliers back in Lesson 2.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 6.8, y: 1.7, w: 5.8, h: 3.85, bg: NAVY2,
      eyebrow: 'Verbs', eyebrowColor: ORANGE,
      heading: 'drivetrain::driveRobotRelative, localizer::resetPose',
      headingColor: WHITE, headingSize: 20,
      body: 'Return nothing. B-Line calls them — every tick with a motion, or once with a pose.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 5.75, w: 11.9, h: 1.15, bg: NAVY2,
      body: 'Then three separate PIDControllers: translation, rotation, cross-track.',
      bodyColor: 'D7E3F4', pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 22, label: LABEL, dark: true });
    s.addNotes(
      'The next four arguments are section 3\'s two new doors plus Lesson 14\'s pose and reset, all handed over as method references. drivetrain::driveRobotRelative doesn\'t return anything — B-Line calls it, every tick, with the chassis motion it has decided on. localizer::resetPose is the same shape: B-Line calls it with a pose. You\'re not handing over a value, or even a way to get one. You\'re handing over a verb. The three PIDControllers come in the order the builder expects them, and they have to be three separate objects — hand the builder the same controller twice and it throws an error the moment it\'s made.'
    );
  }

  // ============================================================ SLIDE 23 — flip, telemetry, one builder
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'layergroup_white.png', eyebrow: 'Section 6 · Notice what\'s missing', title: 'The path isn\'t in it — one builder serves every path', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'Two settings chained on the end',
      headingColor: WHITE, headingSize: 22,
      body: 'withDefaultShouldFlip() mirrors the path for the red alliance — draw once, works on both. withTelemetry(...) logs what B-Line is doing under FollowPath/.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 2.55, bg: NAVY2,
      heading: 'Every argument describes this robot, not one line',
      headingColor: WHITE, headingSize: 22,
      body: 'So one builder can serve every path you\'ll ever draw. Sharing its controllers is safe: every command it makes requires the drivetrain.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 23, label: LABEL, dark: true });
    s.addNotes(
      'That\'s why makePathBuilder takes only the drivetrain and the localizer, and why it hands back the builder instead of a finished command. One builder means one set of controllers for every auto, and that\'s safe: every command the builder makes requires the drivetrain, so the scheduler guarantees only one of them is ever running. And B-Line resets the controllers each time a path starts, so each run starts clean. The telemetry — cross-track error, distance left, which point it\'s heading for — is what section 10 plots.'
    );
  }

  // ============================================================ SLIDE 24 — followPath
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 6 · Autos.java', title: 'Turning a path into something you can schedule' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.4, fontSize: 14,
      fileLabel: 'Add to Autos, below makePathBuilder',
      lines: [
        { text: '/** One drawn path, as a command. */', color: COMMENT },
        { text: 'public static Command followPath(FollowPath.Builder pathBuilder, Path path) {', color: SIG },
        { text: '  return pathBuilder.build(path)', color: NEW },
        { text: '      .withPoseReset(); // start by telling the estimate we\'re at the path\'s start', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 1.2, fontSize: 14,
      fileLabel: 'Add to Autos\'s imports',
      lines: [{ text: 'import frc.robot.lib.BLine.path.Path;', color: NEW }],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.5,
      body: 'withPoseReset(): "we\'re at the start of the path, trust me." True on a real field because a person put the robot there.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 24, label: LABEL });
    s.addNotes(
      'It takes a Path — a path file, already read in; section 7 is where that happens. withPoseReset() asks B-Line to call localizer::resetPose with the path\'s starting pose the moment the path starts. On a real field that\'s true because a person put the robot there, which is exactly why it\'s worth doing — the estimate starts the auto knowing where the robot is instead of guessing. Hold on to that "because a person put it there"; section 8 is about what happens when nobody did.'
    );
  }

  // ============================================================ SLIDE 25 — Robot.pathBuilder
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'robot_white.png', eyebrow: 'Section 6 · Robot.java', title: 'Built once, where the drivetrain lives' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.75, fontSize: 13,
      fileLabel: 'Add to Robot, below the camera fields',
      lines: [
        { text: 'public final LimelightPoseProvider frontCamera;', color: PLAIN },
        { text: 'public final LimelightPoseProvider backCamera;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '// How this robot follows a path. It\'s the same for every path, so it\'s', color: COMMENT },
        { text: '// built once, here, and every autonomous opmode reaches in and uses it.', color: COMMENT },
        { text: 'public final FollowPath.Builder pathBuilder = Autos.makePathBuilder(drivetrain, localizer);', color: NEW },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 1.45, fontSize: 14,
      fileLabel: 'Add to Robot\'s imports',
      lines: [
        { text: 'import first.robot.commands.Autos;', color: NEW },
        { text: 'import frc.robot.lib.BLine.commands.FollowPath;', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.0, w: 11.9, h: 0.9,
      body: 'Robot lives for the whole program; opmodes are rebuilt on every selection.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 25, label: LABEL });
    s.addNotes(
      'The builder needs a home that\'s built once and reachable from every autonomous opmode, and you already have exactly that place. It goes in Robot for the same reason the drivetrain does: opmodes are rebuilt every time they\'re selected, and Robot is the thing that lives for the whole program. It\'s a field initializer that uses drivetrain and localizer, so it has to come after both — it does, since they\'re declared above it.'
    );
  }

  // ============================================================ SLIDE 26 — §7 create the opmodes
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 7 · New files', title: 'One opmode per path' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Right-click opmode → New File: RobotAutoTwoCorners.java', detail: 'The next two slides show the whole file.' },
        { title: 'Right-click opmode → New File: RobotAutoFarSide.java', detail: 'Same file, three words changed: the class name, "Far Side", "FarSide".' },
        { title: 'Both say group = "Paths"', detail: 'A group of their own on the opmode selector, apart from Lesson 9\'s.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.5,
      body: 'Why not one opmode with a menu inside it? Because the Driver Station already is the menu — each auto is one small file, no chooser code.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 26, label: LABEL });
    s.addNotes(
      'In Lesson 9 you learned how this framework offers a choice of autos: every @Autonomous class is its own entry on the Driver Station\'s opmode selector. A path auto is one more of those. The class name RobotAutoFarSide appears in both places — the class line and the constructor — and the path file\'s name is "FarSide". It\'s the same pattern Lesson 9 set up with Do Nothing.'
    );
  }

  // ============================================================ SLIDE 27 — RobotAutoTwoCorners part 1
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 7 · RobotAutoTwoCorners.java', title: 'The top of the file' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.45, fontSize: 13,
      fileLabel: 'Create opmode/RobotAutoTwoCorners.java — part 1',
      lines: [
        { text: '// Copyright (c) FIRST and other WPILib contributors.', color: COMMENT },
        { text: '// Open Source Software; you can modify and/or share it under the terms of', color: COMMENT },
        { text: '// the WPILib BSD license file in the root directory of this project.', color: COMMENT },
        { text: '', color: PLAIN },
        { text: 'package first.robot.opmode;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import org.wpilib.command3.button.RobotModeTriggers;', color: NEW },
        { text: 'import org.wpilib.opmode.Autonomous;', color: NEW },
        { text: 'import org.wpilib.opmode.PeriodicOpMode;', color: NEW },
        { text: '', color: PLAIN },
        { text: 'import first.robot.Robot;', color: NEW },
        { text: 'import first.robot.commands.Autos;', color: NEW },
        { text: 'import frc.robot.lib.BLine.path.Path;', color: NEW },
        { text: '', color: PLAIN },
        { text: '@Autonomous(name = "Two Corners", group = "Paths")', color: SIG },
        { text: 'public class RobotAutoTwoCorners extends PeriodicOpMode {', color: SIG },
        { text: '  private final Robot robot;', color: NEW },
      ],
    });

    K.addFooter(s, { pageNum: 27, label: LABEL });
    s.addNotes(
      'name = "Two Corners" is what the opmode selector shows; group = "Paths" sorts it into its own group. The robot field holds the Robot that the framework hands every opmode\'s constructor, the same as Lesson 9\'s RobotAuto.'
    );
  }

  // ============================================================ SLIDE 28 — RobotAutoTwoCorners part 2
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 7 · RobotAutoTwoCorners.java', title: 'Read the file now; run it on enable' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.2, fontSize: 13,
      fileLabel: 'RobotAutoTwoCorners.java — part 2, finishing the class',
      lines: [
        { text: '  public RobotAutoTwoCorners(Robot robot) {', color: SIG },
        { text: '    this.robot = robot;', color: NEW },
        { text: '', color: PLAIN },
        { text: '    // Read the path file now, while the robot is still disabled.', color: COMMENT },
        { text: '    Path path = new Path("TwoCorners");', color: NEW },
        { text: '', color: PLAIN },
        { text: '    // Runs on enable.', color: COMMENT },
        { text: '    RobotModeTriggers.autonomous().onTrue(Autos.followPath(robot.pathBuilder, path));', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  @Override', color: SIG },
        { text: '  public void periodic() {', color: PLAIN },
        { text: '    /* Called periodically (set time interval) while the robot is enabled. */', color: COMMENT },
        { text: '  }', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 28, label: LABEL });
    s.addNotes(
      'new Path("TwoCorners") opens deploy/autos/paths/TwoCorners.json, reads it, and reads config.json alongside it — the .json is added for you. The autonomous trigger is the same one Lesson 9\'s RobotAuto uses: it schedules the path the moment autonomous is enabled.'
    );
  }

  // ============================================================ SLIDE 29 — §7 constructor timing (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'history_white.png', eyebrow: 'Section 7 · The part worth understanding', title: 'An opmode\'s constructor runs when it\'s selected', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.55, bg: NAVY2,
      heading: 'The path file is read while the robot sits disabled',
      headingColor: WHITE, headingSize: 22,
      body: 'Minutes before the match — so when autonomous starts, the command is already built and just has to run.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.45, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'A mistake shows up in the pits, not on the field',
      headingColor: WHITE, headingSize: 22,
      body: 'Misspell "TwoCorner" and new Path(...) throws an IllegalArgumentException naming the missing file — the moment you select the auto.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 29, label: LABEL, dark: true });
    s.addNotes(
      'An opmode\'s constructor runs the moment it\'s selected on the Driver Station — not when you enable. That\'s how Lesson 9\'s binding got scoped to its opmode, and it has a second consequence here: the new Path(...) line runs at selection time too. That matters more than it sounds. Reading and checking a file isn\'t free, and the start of autonomous is the one moment you can\'t afford to spend on setup.'
    );
  }

  // ============================================================ SLIDE 30 — §8 the promise
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 8 · Put the robot where the path starts', title: 'withPoseReset() makes a promise on your behalf', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.3, bg: NAVY2,
      heading: 'On a real field, a person keeps it',
      headingColor: WHITE, headingSize: 22,
      body: 'Someone carries the robot out and sets it down at the start. In the simulator, nobody does.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.7, bg: NAVY2,
      heading: 'Broken twice in the simulator',
      headingColor: WHITE, headingSize: 22,
      body: 'Run an auto a second time: the robot is where the last run ended. Or first time: SimGUI starts on Red 1, so the path flips while the robot sits at the blue start.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 30, label: LABEL, dark: true });
    s.addNotes(
      'Break that promise and the robot gets told a pose it isn\'t at. The cameras still see where it really is, so within about a second they drag the estimate\'s position back to the truth. They don\'t fix its heading, so the robot goes on believing it faces the wrong way and drives off in strange directions. SimGUI\'s DS window says Red 1, and the first time you click Autonomous it tells the robot so. withDefaultShouldFlip() from section 6 does exactly its job — it mirrors the path to the red end of the field and resets the estimate there — while the simulated robot is still sitting at the blue start, most of a field away. So do the person\'s job in the simulator: when an auto is selected, set the simulated robot down where that auto starts. Three small pieces.'
    );
  }

  // ============================================================ SLIDE 31 — ChassisSimulation.placeAt
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 8 · ChassisSimulation.java', title: 'Piece 1: set the chassis down, at rest' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.4, fontSize: 14,
      fileLabel: 'Add to ChassisSimulation, above getPose',
      lines: [
        { text: '/** Set the chassis down at \'pose\', at rest — what a person does before a match. */', color: COMMENT },
        { text: 'public void placeAt(Pose2d pose) {', color: SIG },
        { text: '  m_pose = pose;', color: NEW },
        { text: '  m_velocity = new ChassisVelocities();', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.05, w: 11.9, h: 1.6,
      body: '"At rest" is the second line: a robot you\'ve just set down isn\'t moving, so whatever velocity the chassis was carrying goes too.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 31, label: LABEL });
    s.addNotes(
      'ChassisSimulation is Lesson 16\'s ground truth — the one place that knows where the simulated chassis really is. Setting it down means replacing its pose and zeroing its velocity.'
    );
  }

  // ============================================================ SLIDE 32 — Drivetrain.placeSimulatedRobot
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'robot_white.png', eyebrow: 'Section 8 · Drivetrain.java', title: 'Piece 2: a sim-only door that does nothing for real' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.35, fontSize: 14,
      fileLabel: 'Add to Drivetrain, below getSimulatedPose',
      lines: [
        { text: '/**', color: COMMENT },
        { text: ' * Sim only: set the simulated chassis down at \'pose\', the job a person does', color: COMMENT },
        { text: ' * before a real match. Does nothing on a real robot.', color: COMMENT },
        { text: ' */', color: COMMENT },
        { text: 'public void placeSimulatedRobot(Pose2d pose) {', color: SIG },
        { text: '  if (m_chassisSim != null) {', color: NEW },
        { text: '    m_chassisSim.placeAt(pose);', color: NEW },
        { text: '  }', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.0, w: 11.9, h: 1.9,
      body: 'The same null check as simulateChassis: a real robot has no m_chassisSim. The gyro turns with it — Lesson 16\'s GyroIOSim reads its heading off the chassis.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 32, label: LABEL });
    s.addNotes(
      'On a real robot there\'s no m_chassisSim, because a person does this job. Nothing else needs telling, either: Lesson 16\'s GyroIOSim reads its heading straight off the simulated chassis, so the gyro turns with it.'
    );
  }

  // ============================================================ SLIDE 33 — Autos.startPose
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 8 · Autos.java', title: 'Piece 3: where does this auto start, on our side?' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.55, fontSize: 11.5,
      fileLabel: 'Add to Autos, below followPath',
      lines: [
        { text: '/** Where a path starts, on this alliance\'s side of the field — the same flip BLine makes. */', color: COMMENT },
        { text: 'public static Pose2d startPose(Path path) {', color: SIG },
        { text: '  Pose2d start = path.getAuthoredStartPose().get(); // every path here starts with a waypoint', color: NEW },
        { text: '  boolean red = MatchState.getAlliance().orElse(Alliance.BLUE) == Alliance.RED;', color: NEW },
        { text: '  return red ? FlippingUtil.flipFieldPose(start) : start;', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.15, w: 11.9, h: 2.4, fontSize: 14,
      fileLabel: 'Add to Autos\'s imports',
      lines: [
        { text: 'import org.wpilib.driverstation.Alliance;', color: NEW },
        { text: 'import org.wpilib.driverstation.MatchState;', color: NEW },
        { text: 'import org.wpilib.math.geometry.Pose2d;', color: NEW },
        { text: '', color: PLAIN },
        { text: 'import frc.robot.lib.BLine.field.FlippingUtil;', color: NEW },
      ],
    });

    K.addFooter(s, { pageNum: 33, label: LABEL });
    s.addNotes(
      'The third piece answers "where does this auto start?", on whichever side of the field the robot is playing. FlippingUtil.flipFieldPose comes from B-Line itself, so the robot is set down exactly where the flipped path starts.'
    );
  }

  // ============================================================ SLIDE 34 — two Optionals (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'puzzlepiece_white.png', eyebrow: 'Section 8 · Reading startPose', title: 'Two Optionals, and the mirror B-Line uses', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.5, bg: NAVY2,
      heading: 'getAuthoredStartPose().get()',
      headingColor: WHITE, headingSize: 22,
      body: 'A path could begin with a bare rotation and have no start of its own. Yours begin with a waypoint, so .get() is safe — and crashes loudly if not.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addCard(s, {
      x: 0.7, y: 4.4, w: 11.9, h: 2.5, bg: NAVY2,
      heading: 'getAlliance().orElse(Alliance.BLUE)',
      headingColor: WHITE, headingSize: 22,
      body: 'Until the Driver Station says, there is no alliance. orElse takes what\'s in the box, or blue if it\'s empty — the rule B-Line\'s flip follows.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 34, label: LABEL, dark: true });
    s.addNotes(
      'Both are Lesson 15\'s Optional — a box that might be empty. getAuthoredStartPose() is one because a path could begin with a bare rotation and have no starting spot of its own; if you ever draw one like that, .get() crashes right there, which is what you\'d want. MatchState.getAlliance() is the other: until the Driver Station says, there is no alliance. Then FlippingUtil.flipFieldPose mirrors the pose the same way B-Line mirrors the path.'
    );
  }

  // ============================================================ SLIDE 35 — place in the opmode constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'mapmarker_white.png', eyebrow: 'Section 8 · Both auto opmodes', title: 'Set the robot down when the auto is selected' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.65, fontSize: 13,
      fileLabel: 'Add the placement to both auto opmodes\' constructors, between the two lines you have',
      lines: [
        { text: 'public RobotAutoTwoCorners(Robot robot) {', color: SIG },
        { text: '  this.robot = robot;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  // Read the path file now, while the robot is still disabled.', color: COMMENT },
        { text: '  Path path = new Path("TwoCorners");', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  // In the simulator, set the robot down at the path\'s start — the job a', color: COMMENT },
        { text: '  // person does on a real field. On a real robot this does nothing.', color: COMMENT },
        { text: '  robot.drivetrain.placeSimulatedRobot(Autos.startPose(path));', color: NEW },
        { text: '', color: PLAIN },
        { text: '  // Runs on enable.', color: COMMENT },
        { text: '  RobotModeTriggers.autonomous().onTrue(Autos.followPath(robot.pathBuilder, path));', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.15, w: 11.9, h: 0.75,
      body: 'Selected: set down. Disabled after a run: rebuilt, and set down again.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 35, label: LABEL });
    s.addNotes(
      'The constructor is exactly the right moment, for the same reason it\'s the right moment to read the file: it runs when the auto is selected, while the robot is disabled — when, on a real field, someone is setting the robot down. And it runs again every time you disable after an auto has run, because the framework rebuilds the opmode then. So every run starts from the start, on whichever side of the field you\'re playing. Make the same change in RobotAutoFarSide.'
    );
  }

  // ============================================================ SLIDE 36 — §9 register events
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'tag_white.png', eyebrow: 'Section 9 · Event markers', title: 'A named point on the path that fires an action' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.4, fontSize: 13,
      fileLabel: 'Add to Autos, below startPose',
      lines: [
        { text: '/** Names a path file can fire with lib_key. BLine keeps them for the whole program. */', color: COMMENT },
        { text: 'public static void registerEventTriggers() {', color: SIG },
        { text: '  // Nothing on this robot can shoot yet, so it just says so in the console.', color: COMMENT },
        { text: '  FollowPath.registerEventTrigger("shoot", () -> System.out.println("Event: shoot!"));', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 2.9, fontSize: 13,
      fileLabel: 'Add to Robot\'s constructor, after the addEventListener line',
      lines: [
        { text: 'public Robot() {', color: SIG },
        { text: '  DataLogManager.start(); // saves every published value to a .wpilog file', color: PLAIN },
        { text: '  Scheduler.getDefault().addEventListener(this::logCommandStart);', color: PLAIN },
        { text: '  Autos.registerEventTriggers(); // once, for the whole program', color: NEW },
        { text: '', color: PLAIN },
        { text: '  // ...', color: COMMENT },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 36, label: LABEL });
    s.addNotes(
      'Real autos do things along the way — spin up a shooter while still driving, drop an intake before arriving. The name is the link: a path file refers to a marker by lib_key, and your code registers what that key should do. Registration is static — B-Line keeps one table for the whole program, not one per path — so it happens once, and once for the whole program means the constructor of the thing that lives for the whole program. The second argument is a lambda that takes nothing and returns nothing — a plain action, which Java calls a Runnable. B-Line runs it once, on the loop after the robot passes the marker. It has to be quick: it runs inside the robot\'s loop. registerEventTrigger also accepts a Command, for an event that needs to keep running for a while.'
    );
  }

  // ============================================================ SLIDE 37 — §9 the path side
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'tag_white.png', eyebrow: 'Section 9 · The path side', title: 'Already in your file since section 5' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.35, fontSize: 14, example: true,
      fileLabel: 'Nothing to add — this is already in TwoCorners.json',
      lines: [
        { text: '{', color: PLAIN },
        { text: '  "type": "event_trigger",', color: PLAIN },
        { text: '  "t_ratio": 0.8,', color: PLAIN },
        { text: '  "lib_key": "shoot"', color: PLAIN },
        { text: '},', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 5.8, h: 2.9,
      heading: '80% along its own segment',
      headingSize: 22,
      body: 'The second leg, from (6, 3) to (6, 6) — the same fraction idea rotations use.',
      bodySize: 19,
    });

    K.addCard(s, {
      x: 6.8, y: 4.0, w: 5.8, h: 2.9,
      heading: 'A misspelled key won\'t crash',
      headingSize: 22,
      body: 'B-Line logs "Unregistered event trigger key: Shoot" and keeps driving. Check the console first.',
      bodySize: 19,
    });

    K.addFooter(s, { pageNum: 37, label: LABEL });
    s.addNotes(
      'B-Line looks the name up when the robot reaches the marker, not when the path loads, and an unknown key just logs "FollowPath: Unregistered event trigger key: Shoot" and keeps driving. So if a marker never seems to fire, check the console for that line before you go hunting in the geometry.'
    );
  }

  // ============================================================ SLIDE 38 — §10 run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 10 · Run it', title: 'Blue 1 first, then pick the auto and enable' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: './gradlew simulateJava → DS window: Alliance Station = Blue 1', detail: 'Editable only while Disconnected. SimGUI starts on Red 1 every time.' },
        { title: 'Click Autonomous, pick Two Corners', detail: 'Console: Creating OpMode Two Corners — path read, robot set down.' },
        { title: 'Set state to Enabled', detail: 'About 4 s: out along X, up the second leg, settling at (6, 6).' },
        { title: 'To run again: Disabled, then Enabled', detail: 'The opmode is rebuilt and the robot set back down at (3, 3).' },
      ],
    });

    K.addFooter(s, { pageNum: 38, label: LABEL });
    s.addNotes(
      'Red works too now — that\'s Try It #6 — but the numbers in this walkthrough are for blue. Pick Far Side and the Creating OpMode line prints again for that one; pick Two Corners back before you enable. The robot finishes within the tolerances in config.json — within 5 cm and 2° — so don\'t be surprised to read 178.3° rather than 180°. If you want to watch section 8\'s problem happen, comment out the placeSimulatedRobot line and run twice without restarting.'
    );
  }

  // ============================================================ SLIDE 39 — §10 what to watch
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 10 · What to watch', title: 'The line, the belief, and the truth' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Odometry tab: Localizer/Pose', detail: 'An actual shape — the corner rounded, 90° partway up, 180° at the end.' },
        { title: 'Add Drivetrain/SimulatedPose', detail: 'Where the robot thinks it is and where it is, within a couple of cm.' },
        { title: 'Plot FollowPath/crossTrackError', detail: 'Jumps to about 0.5 m at the corner — the handoff radius — then shrinks.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.5,
      body: 'Nothing told the follower it was off the line. Correcting is the only thing it ever does.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 39, label: LABEL });
    s.addNotes(
      'Watch it the way you\'ve watched every closed-loop lesson since Lesson 5 — asked-for against measured. Event: shoot! shows up in the console about 80% of the way up the second leg. FollowPath/crossTrackError is the cross-track loop\'s error and FollowPath/remainingPathDistanceMeters is the translation loop\'s. The cross-track error jumps right at the corner because the robot is still on the first leg\'s line when it starts measuring against the second\'s, then shrinks back toward zero as the cross-track loop pulls the robot onto the second leg.'
    );
  }

  // ============================================================ SLIDE 40 — try it (1-4)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.65, h: 2.5,
      cards: [
        { title: 'Add a third path', body: 'One JSON file and one opmode. Building a second Builder? Re-read section 6.', code: true },
        { title: 'Break the math', body: 'Handoff 0.05: tighter or wider corner? Predict, run. Then try 3 m/s.', code: true },
        { title: 'Mistune a gain', body: 'kCrossTrackP 0.0 swings wide; 15.0 oscillates and never finishes.', code: true },
        { title: 'Path, then script', body: 'Follow TwoCorners, then turnToHeading(0): two coroutine.await calls.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 40, label: LABEL, dark: true });
    s.addNotes(
      '1: It should be one new JSON file and one new opmode whose constructor is Two Corners\' three lines with a different file name. Your path can start anywhere — the robot is set down wherever it begins. 2: In this course\'s sim, a 0.05 handoff swings the robot about half a meter past the first corner instead of 5–12 cm, and takes half a second longer — a later handoff means it drives into the corner at full speed before it starts turning. At 3 m/s, section 5\'s arithmetic says it can\'t stop in time: it sails roughly 30 cm past the end and about 60 cm past the first corner. Then change the acceleration so the arithmetic works again. 3: With kCrossTrackP at 0.0 the robot swings about half a meter wide at the corner, because nothing pulls it back onto the second leg. At 15.0 it swings back and forth across the line near the end — about a third of a meter each way — and is still swinging 30 seconds later. Plot FollowPath/crossTrackError for both. 4: A library-built command and one you wrote are both just Commands, so Lesson 9\'s Command.noRequirements(coroutine -> { ... }) with two coroutine.await(...) calls is all it takes.'
    );
  }

  // ============================================================ SLIDE 41 — try it (5-6)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it, continued' });

    K.addTryItGrid(s, {
      y: 1.65, h: 4.2, startNum: 5,
      cards: [
        { title: 'A real marker job', body: 'Swap the println for Telemetry.log("Auto/ShootFired", true). Check it fires where you placed it, then move the t_ratio and watch the timing move.', code: true },
        { title: 'Run it on red', body: 'Disconnected, Alliance Station Red 1, Autonomous, Two Corners. The robot is set down at (13.54, 5.07) and runs the mirrored path. Predict: what if startPose didn\'t flip?' },
      ],
    });

    K.addFooter(s, { pageNum: 41, label: LABEL, dark: true });
    s.addNotes(
      '5 is a real code edit in registerEventTriggers; confirm on the plot that the value flips where you placed the marker. 6 needs no code: the robot is set down at the red end, (13.54, 5.07) facing 180°, and runs the same shape rotated half a turn, finishing near (10.54, 2.07) facing 0°. Nothing in your code changed — withDefaultShouldFlip() and startPose agree about which side of the field you\'re on. If startPose didn\'t flip, you\'d be back to section 8\'s problem: a flipped path, and a robot set down at the blue start.'
    );
  }

  // ============================================================ SLIDE 42 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Autonomous stopped being a script' });

    const points = [
      'A path is a shape in a file, and the follower\'s only job is to chase it — so drifting off the line no longer ruins the auto.',
      'Three PIDControllers, three separate jobs: distance-to-go, heading, and drift off the line.',
      'Speed limits are arithmetic: where slowing starts, and how far stopping takes.',
      'Notice when code runs: the opmode\'s constructor reads the path, and sets the sim robot down, at selection.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.85, fontFace: FONT_BODY, fontSize: 18, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 18', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Scoring Elevator', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Holding a position, not just reaching one.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 42, label: LABEL });
    s.addNotes(
      'That switch is only possible because of what Lesson 14 built: chasing a line requires knowing where you are, continuously and honestly. Two habits outlive B-Line entirely. Build the unchanging thing once — one FollowPath.Builder in Robot serves every path. And notice when your code runs, not just what it does. withPoseReset() is a promise about the world — "a person put the robot here" — and in the simulator you had to keep it yourself, at the same moment a person would. The drivetrain half of this course is done. Your robot drives itself along drawn paths, knows where it is from three kinds of evidence, and lives in a simulated world with real limits on grip. What it doesn\'t have is anything to do when it arrives. That\'s next.'
    );
  }

  const outPath = path.join(__dirname, '..', '..', '17-bline-autos.pptx');
  return p.writeFile({ fileName: outPath }).then(() => {
    console.log('Wrote', outPath);
  });
}

buildDeck().catch((err) => {
  console.error(err);
  process.exit(1);
});
