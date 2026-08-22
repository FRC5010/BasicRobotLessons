const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY, W } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 0 — Orientation' });

  K.addTitleSlide(p, {
    tag: 'LESSON 0',
    title: 'Orientation',
    subtitle: 'Run the robot and print a message',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — Goal + what you'll learn
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: "What this lesson gets you to" });

    s.addShape('roundRect', {
      x: 0.7, y: 1.75, w: 11.9, h: 1.75, rectRadius: 0.1,
      fill: { color: CARDBG }, line: { type: 'none' },
    });
    s.addText(
      'Get the template building in simulation, see how the pieces fit together, and make your first code change — print a message the moment teleop wakes up.',
      {
        x: 1.05, y: 1.9, w: 11.2, h: 1.5,
        fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0,
        lineSpacingMultiple: 1.25,
      }
    );

    const colY = 3.75;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', {
      x: 1.35, y: colY + 0.03, w: 5, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0,
    });
    s.addText(
      [
        { text: 'Classes, packages, and methods', options: { bullet: true, breakLine: true } },
        { text: 'Statements and the semicolon', options: { bullet: true, breakLine: true } },
        { text: 'Annotations — a tag above a class', options: { bullet: true, breakLine: true } },
        { text: 'Calling a method: System.out.println(...)', options: { bullet: true, breakLine: false } },
      ],
      {
        x: 0.75, y: colY + 0.62, w: 5.75, h: 2.6,
        fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 10, lineSpacingMultiple: 1.1,
      }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('robot_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', {
      x: 7.55, y: colY + 0.03, w: 5, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0,
    });
    s.addText(
      [
        { text: 'Opmodes — named, selectable robot behaviors', options: { bullet: true, breakLine: true } },
        { text: 'The opmode loop — the heartbeat of whichever one is picked', options: { bullet: true, breakLine: false } },
      ],
      {
        x: 6.95, y: colY + 0.62, w: 5.75, h: 2.6,
        fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 10, lineSpacingMultiple: 1.1,
      }
    );

    K.addFooter(s, { pageNum: 2, label: 'Orientation' });
  }

  // ============================================================ SLIDE 3 — file tree
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 1 · What am I even looking at?', title: 'Four files, one boot sequence' });

    s.addText(
      "Half the folder tree won't matter yet. Open src/main/java/first/robot/ and you'll find these four.",
      {
        x: 0.7, y: 1.5, w: 11.9, h: 1.0,
        fontFace: FONT_BODY, italic: true, fontSize: 22, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );

    const rows = [
      ['Main.java', 'JVM entry point. Never touch it.'],
      ['Robot.java', "Boots the framework. You'll rarely touch it."],
      ['MyTeleop.java', 'What the robot does when you drive it.'],
      ['MyAuto.java', 'What the robot does on its own, in autonomous.'],
    ];
    const startY = 2.65, rowH = 1.85, gap = 0.2, colW = 5.85;
    rows.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.7 + col * (colW + 0.2);
      const y = startY + row * (rowH + gap);
      s.addShape('roundRect', {
        x, y, w: colW, h: rowH, rectRadius: 0.1,
        fill: { color: CARDBG }, line: { type: 'none' },
      });
      s.addImage({ path: K.ICON('filecode_teal.png'), x: x + 0.3, y: y + 0.32, w: 0.42, h: 0.42 });
      s.addText(r[0], {
        x: x + 0.9, y: y + 0.3, w: colW - 1.15, h: 0.45,
        fontFace: K.FONT_CODE, bold: true, fontSize: 22, color: INK, margin: 0,
      });
      s.addText(r[1], {
        x: x + 0.35, y: y + 0.95, w: colW - 0.7, h: 0.75,
        fontFace: FONT_BODY, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.15,
      });
    });

    K.addFooter(s, { pageNum: 3, label: 'Orientation' });
  }

  // ============================================================ SLIDE 4 — classes & packages
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 1 · Classes and packages', title: 'A class is a blueprint' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 5.7, h: 1.9, fontSize: 26,
      lines: [{ text: 'package first.robot;', color: '7FD1D9' }],
    });

    s.addText(
      'Packages keep class names from colliding — first.robot mirrors the folder first/robot.',
      {
        x: 0.7, y: 3.9, w: 5.7, h: 2.2,
        fontFace: FONT_BODY, fontSize: 22, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
      }
    );

    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65,
      eyebrow: 'The one rule to remember',
      heading: 'The package at the top of a file has to match its folder path.',
      body: 'Every file defines a class — a blueprint holding data plus the actions that go with it. Robot boots the program; MyTeleop and MyAuto are opmodes.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Orientation' });
  }

  // ============================================================ SLIDE 5 — methods
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'listul_white.png', eyebrow: 'Section 1 · Methods', title: 'Five homes, each named for its moment' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 6.3, h: 3.55, fontSize: 19,
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void start() {', color: 'D7E3F4' },
        { text: '  // once, when enabled', color: '7FA8C9' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '@Override', color: 'FFD166' },
        { text: 'public void periodic() {', color: 'D7E3F4' },
        { text: '  // ~50x / sec, enabled', color: '7FA8C9' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 7.25, y: 1.75, w: 5.35, h: 4.65,
      eyebrow: 'Five, total',
      heading: 'start(), periodic(), end(), close(), disabledPeriodic() — five methods, all empty, each named for the moment it fires.',
      headingSize: 21,
      body: "Focus on periodic() today — you'll meet the rest as you need them. You never call it yourself. The framework does, on its own schedule.",
    });

    K.addFooter(s, { pageNum: 5, label: 'Orientation' });
  }

  // ============================================================ SLIDE 6 — @Teleop annotation + mental shift
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'tag_white.png', eyebrow: 'Section 1 · Annotations', title: '@Teleop is a tag, not a method' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 5.9, h: 1.9, fontSize: 20,
      lines: [
        { text: '@Teleop', color: 'FFD166' },
        { text: 'public class MyTeleop', color: 'D7E3F4' },
        { text: '    extends PeriodicOpMode {', color: 'D7E3F4' },
      ],
    });
    s.addText(
      '@Teleop sits above the whole class — a tag the framework reads before your code ever runs. It says: offer this on the Driver Station as "My Teleop."',
      {
        x: 0.7, y: 3.9, w: 5.9, h: 2.2,
        fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
      }
    );

    s.addShape('roundRect', {
      x: 6.95, y: 1.75, w: 5.65, h: 4.65, rectRadius: 0.12,
      fill: { color: NAVY }, line: { type: 'none' },
    });
    s.addImage({ path: K.ICON('lightbulb_white.png'), x: 7.3, y: 2.05, w: 0.5, h: 0.5 });
    s.addText('THE BIGGEST MENTAL SHIFT', {
      x: 7.95, y: 2.18, w: 4.4, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 0.5, margin: 0,
    });
    s.addText(
      "You don't write one program that runs top to bottom.",
      {
        x: 7.3, y: 2.8, w: 5.0, h: 1.35,
        fontFace: FONT_HEAD, bold: true, fontSize: 24, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );
    s.addText(
      'You write several small ones — opmodes — and something else decides which one runs right now.',
      {
        x: 7.3, y: 4.25, w: 5.0, h: 1.9,
        fontFace: FONT_HEAD, italic: true, fontSize: 21, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
      }
    );

    K.addFooter(s, { pageNum: 6, label: 'Orientation' });
  }

  // ============================================================ SLIDE 7 — opmodes & the heartbeat
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'heartbeat_white.png', eyebrow: 'Section 2 · Opmodes and the heartbeat', title: 'One heartbeat, whichever opmode is picked' });

    s.addShape('roundRect', {
      x: 0.7, y: 1.75, w: 3.6, h: 1.9, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    s.addText('50', {
      x: 0.7, y: 1.8, w: 3.6, h: 1.15,
      fontFace: FONT_HEAD, bold: true, fontSize: 58, color: ORANGE, align: 'center', margin: 0,
    });
    s.addText('TIMES A SECOND', {
      x: 0.7, y: 2.9, w: 3.6, h: 0.5,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: 'CADCE8', charSpacing: 1, align: 'center', margin: 0,
    });

    s.addText(
      "Once picked and enabled, an opmode's periodic() runs about 50 times a second — forever, until something else is picked or the robot disables.",
      {
        x: 4.5, y: 1.8, w: 8.15, h: 1.9,
        fontFace: FONT_BODY, fontSize: 22, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
      }
    );

    s.addText(
      "You never write while (true) yourself — the framework is the loop, and you plug things into it.",
      {
        x: 0.7, y: 4.0, w: 11.9, h: 1.1,
        fontFace: FONT_HEAD, italic: true, fontSize: 24, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
      }
    );
    s.addShape('roundRect', {
      x: 0.7, y: 5.25, w: 11.9, h: 1.4, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    s.addText(
      'Picking an opmode is what decides which code the heartbeat drives — that choice happens when you select one, not when you write its class.',
      {
        x: 1.0, y: 5.25, w: 11.3, h: 1.4,
        fontFace: FONT_BODY, italic: true, fontSize: 22, color: 'CADCE8', valign: 'middle', margin: 0, lineSpacingMultiple: 1.3,
      }
    );

    K.addFooter(s, { pageNum: 7, label: 'Orientation', dark: true });
  }

  // ============================================================ SLIDE 8 — run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 3 · Run it', title: 'Time to see it boot' });

    K.addNumberedSteps(s, {
      startY: 1.7,
      highlight: { 3: ORANGE },
      steps: [
        { title: 'Open the WPILib command palette', detail: 'Ctrl+Shift+P → "WPILib: Simulate Robot Code" (or the WPILib icon).' },
        { title: 'Or, from a terminal', detail: './gradlew simulateJava — first run downloads dependencies.' },
        { title: 'Choose Sim GUI', detail: 'Not Real Driverstation — Sim GUI is correct for now.' },
        { title: 'Pick My Teleop on the opmode selector', detail: 'That names which code the heartbeat will drive.' },
        { title: 'Flip Robot State to Enabled', detail: "Nothing moves yet — there's no motor. That's Lesson 1." },
      ],
    });

    K.addFooter(s, { pageNum: 8, label: 'Orientation' });
  }

  // ============================================================ SLIDE 9 — say hello
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'commentdots_white.png', eyebrow: 'Section 4 · Your first change', title: 'Say hello, and watch it show up' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 7.1, h: 2.5, fontSize: 19,
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void start() {', color: 'D7E3F4' },
        { text: '  System.out.println(', color: 'D7E3F4' },
        { text: '    "Hello from Team 5010! " +', color: '9EF01A' },
        { text: '    "Teleop started.");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });
    s.addText(
      "start() runs once — the instant the opmode is enabled. periodic() would print this fifty times a second and flood your terminal.",
      {
        x: 0.7, y: 4.45, w: 7.1, h: 1.9,
        fontFace: FONT_HEAD, italic: true, fontSize: 21, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
      }
    );

    s.addShape('roundRect', {
      x: 8.05, y: 1.75, w: 4.6, h: 4.6, rectRadius: 0.1,
      fill: { color: CARDBG }, line: { type: 'none' },
    });
    s.addText('THREE THINGS, ONE LINE', {
      x: 8.35, y: 2.0, w: 4.0, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 0.5, margin: 0,
    });
    const bits = [
      ['Method call', 'println(...) asks a method to run.'],
      ['String', 'Text in "quotes" — literal text.'],
      ['Semicolon', 'Ends every statement, no exceptions.'],
    ];
    bits.forEach((b, i) => {
      const y = 2.55 + i * 1.28;
      s.addText(b[0], {
        x: 8.35, y, w: 4.0, h: 0.42,
        fontFace: FONT_HEAD, bold: true, fontSize: 21, color: INK, margin: 0,
      });
      s.addText(b[1], {
        x: 8.35, y: y + 0.44, w: 4.0, h: 0.78,
        fontFace: FONT_BODY, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.15,
      });
    });

    K.addFooter(s, { pageNum: 9, label: 'Orientation' });
  }

  // ============================================================ SLIDE 10 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });
    s.addText(
      "The real learning happens when you have to think, not when you're copying the walkthrough. Don't skip these.",
      {
        x: 1.5, y: 1.55, w: 10.8, h: 0.85,
        fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'B8CBE3', valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );

    K.addTryItGrid(s, {
      cards: [
        { title: 'Give MyAuto a start()', body: "It doesn't have one yet — add it, matching the shape MyTeleop's already has, and print a different message. Confirm it only shows up when you've picked My Auto." },
        { title: 'Break it on purpose', body: 'Delete a semicolon and run ./gradlew build. Read the error carefully — note the file and line it names. Then put the semicolon back.' },
      ],
    });

    K.addFooter(s, { pageNum: 10, label: 'Orientation', dark: true });
  }

  // ============================================================ SLIDE 11 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'The picture to carry forward' });

    const points = [
      'Every class lives inside a package.',
      'Some classes are opmodes, tagged with an annotation like @Teleop so the framework can find and offer them by name.',
      "Whichever opmode is picked, its periodic() ticks ~50 times a second — that's the heartbeat.",
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 14 } })),
      {
        x: 0.7, y: 1.75, w: 6.9, h: 3.7,
        fontFace: FONT_BODY, fontSize: 21, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );
    s.addText(
      'Picking an opmode is what decides which code the heartbeat drives.',
      {
        x: 0.7, y: 5.55, w: 6.9, h: 1.2,
        fontFace: FONT_HEAD, italic: true, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
      }
    );

    s.addShape('roundRect', {
      x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12,
      fill: { color: NAVY }, line: { type: 'none' },
    });
    s.addText('NEXT', {
      x: 8.3, y: 2.1, w: 4.0, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0,
    });
    s.addText('Lesson 1', {
      x: 8.3, y: 2.55, w: 4.0, h: 0.55,
      fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0,
    });
    s.addText('Your first motor', {
      x: 8.3, y: 3.1, w: 4.0, h: 0.6,
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0,
    });
    s.addText('Spin a drive motor with a button — objects, fields, and constructors.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.4,
      fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 11, label: 'Orientation' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '00-orientation.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
