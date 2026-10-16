const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

// Code-card colors, the same ones every deck in the series uses.
const COMMENT = '7FA8C9';
const NEW = '9EF01A';
const SIG = 'FFD166';
const PLAIN = 'D7E3F4';

const LABEL = 'Scoring Elevator';

/** A thin straight line from (x1, y1) to (x2, y2), in inches. */
function seg(s, x1, y1, x2, y2, color, width) {
  s.addShape('line', {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipV: (x2 - x1) * (y2 - y1) < 0,
    line: { color, width },
  });
}

/** A row of number boxes joined by arrows — one step of gain arithmetic per box. */
function chain(s, { x, y, w, h, gap, boxes }) {
  const boxW = (w - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach((b, i) => {
    const bx = x + i * (boxW + gap);
    s.addShape('roundRect', { x: bx, y, w: boxW, h, rectRadius: 0.1, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText(b.value, { x: bx + 0.15, y: y + 0.2, w: boxW - 0.3, h: 0.7, fontFace: FONT_HEAD, bold: true, fontSize: 28, color: b.color || WHITE, align: 'center', valign: 'middle', margin: 0 });
    s.addText(b.how, { x: bx + 0.15, y: y + 0.95, w: boxW - 0.3, h: h - 1.1, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', align: 'center', valign: 'top', margin: 0 });
    if (i < boxes.length - 1) {
      s.addText('→', { x: bx + boxW, y: y + 0.2, w: gap, h: 0.7, fontFace: FONT_BODY, bold: true, fontSize: 24, color: TEAL, align: 'center', valign: 'middle', margin: 0 });
    }
  });
}

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 18 — Scoring Elevator: Holding a Position, Not Just Reaching One' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 18',
    title: 'Scoring Elevator',
    subtitle: 'Holding a position, not just reaching one',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3  ·  Phoenix 6',
  });
  titleSlide.addNotes(
    'The drivetrain half of the course is done: the robot drives itself along drawn paths and knows where it is. Now it gets something to do when it arrives — a scoring elevator. It\'s built on the same IO-layer spine Lesson 13 gave the drivetrain, so most of the files will look familiar. What\'s new is the job: an elevator has to stay where you put it, against gravity, for as long as you ask. That changes how you control it.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'The Goal', title: 'An elevator that holds its height' });

    s.addShape('roundRect', { x: 0.7, y: 1.6, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Build a scoring elevator on Lesson 13\'s IO-layer spine — driven by Phoenix\'s Motion Magic profile generator and a full feedforward model — and bind it to three preset heights on the D-pad.',
      { x: 1.05, y: 1.73, w: 11.2, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 18, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Comparing measures directly — Distance.gt(...) and .lt(...), for a hand-rolled clamp', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('robot_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Motion Magic — profiles generated in firmware', options: { bullet: true, breakLine: true } },
        { text: 'The full feedforward model: kG + kV + kA, with kP as a trim', options: { bullet: true, breakLine: true } },
        { text: 'GravityTypeValue.Elevator_Static', options: { bullet: true, breakLine: true } },
        { text: 'Gains computed from the motor\'s spec sheet', options: { bullet: true, breakLine: true } },
        { text: 'Goal, setpoint, and position', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: LABEL });
    s.addNotes(
      'One small Java idea: measures like Distance can be compared to each other directly, so a clamp doesn\'t have to unpack them to doubles first. The robot ideas are the real load. Motion Magic is Phoenix generating a smooth trapezoidal move in firmware — a cruise speed and an acceleration, not just a target. The full feedforward model gives the controller a term for each physical effect: kG for gravity, kV for speed, kA for acceleration, with kP shrunk to a small trim. Elevator_Static tells the controller that gravity\'s pull doesn\'t change with height. The gains come from the Kraken X60\'s spec sheet, not from guessing. And you\'ll learn to tell apart three numbers every profiled mechanism has: the goal, the setpoint, and the position.'
    );
  }

  // ============================================================ SLIDE 3 — §1 staying somewhere
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'Section 1 · A new kind of job', title: 'Arriving is easy. Staying is the job.', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.4, bg: NAVY2,
      heading: 'Every motor so far had one job at a time',
      headingSize: 22, headingColor: WHITE,
      body: 'The drive motors spin at a speed. The steer motors hold an angle just long enough to steer through it. Nothing has had to stay anywhere once you stopped paying attention to it.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });
    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.4, bg: NAVY2,
      heading: 'An elevator has to stay where you put it',
      headingSize: 22, headingColor: WHITE,
      body: 'Ask for the mid-score height and walk away: a minute later it has to still be there, fighting gravity the whole time with nothing but a motor and a closed loop.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 3, label: LABEL, dark: true });
    s.addNotes(
      'That\'s a qualitatively different job from steering, and it\'s worth understanding why the steering gains you already have — SteerConstants.kP = 40.0, back in Lesson 5 — won\'t do it alone. The next slide is the reason.'
    );
  }

  // ============================================================ SLIDE 4 — §2 why kP sags
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'weight_white.png', eyebrow: 'Section 2 · Why kP alone sags', title: 'A P controller can only push by being wrong', badgeColor: ORANGE });

    s.addShape('roundRect', { x: 0.7, y: 1.65, w: 11.9, h: 1.05, rectRadius: 0.1, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('voltage  =  kP × error', {
      x: 1.0, y: 1.8, w: 11.3, h: 0.75, fontFace: K.FONT_CODE, bold: true, fontSize: 28, color: ORANGE, align: 'center', valign: 'middle', margin: 0,
    });

    K.addCard(s, {
      x: 0.7, y: 2.95, w: 5.8, h: 3.75, bg: NAVY2,
      heading: 'No error, no volts',
      headingSize: 22, headingColor: WHITE,
      body: 'Gravity needs some voltage just to stand still. Ask P to hold with zero error and it commands zero volts — so the carriage starts to fall, which makes error, which makes voltage.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });
    K.addCard(s, {
      x: 6.8, y: 2.95, w: 5.8, h: 3.75, bg: NAVY2,
      heading: 'A quiet compromise',
      headingSize: 22, headingColor: WHITE,
      body: 'It settles a little low: just far enough that kP × gap equals the voltage gravity demands. It gets close, stops moving, and sits there. Nothing looks broken.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 4, label: LABEL, dark: true });
    s.addNotes(
      'Picture a pure proportional controller holding the elevator up. Gravity constantly pulls the carriage down, so the motor constantly needs some voltage just to stand still. But the only way a P controller produces voltage is by first tolerating error. Ask it to hold with zero error, and it commands zero volts, and the carriage starts falling — which creates error — which makes it command voltage again. The system doesn\'t fail loudly. It finds a quiet compromise: a small, permanent gap, just large enough that kP times the gap happens to equal the holding voltage. That gap is easy to miss on a graph, because nothing looks broken.'
    );
  }

  // ============================================================ SLIDE 5 — §2 the measured sag + the rule
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 2 · Measured', title: 'Small, permanent, and not noise' });

    s.addShape('roundRect', { x: 0.7, y: 1.65, w: 4.6, h: 3.0, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('1.6 mm', { x: 0.9, y: 1.95, w: 4.2, h: 1.3, fontFace: FONT_HEAD, bold: true, fontSize: 60, color: ORANGE, align: 'center', valign: 'middle', margin: 0 });
    s.addText('low, for as long as the request stands', { x: 0.95, y: 3.35, w: 4.1, h: 1.0, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', align: 'center', valign: 'top', margin: 0 });

    K.addCard(s, {
      x: 5.6, y: 1.65, w: 7.0, h: 3.0,
      heading: 'kElevatorKG zeroed, holding kScoreMid',
      headingSize: 22,
      body: 'Measured on this course\'s own gains. A small number — but it isn\'t noise. It\'s kG\'s whole job, missing.',
      bodySize: 20,
    });

    s.addShape('roundRect', { x: 0.7, y: 4.95, w: 11.9, h: 1.85, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      [
        { text: 'The fix: compute the voltage the mechanism needs and hand it over. ', options: {} },
        { text: 'A term for each physical effect, with kP cleaning up after all of them.', options: { bold: true, color: ORANGE } },
      ],
      { x: 1.0, y: 5.1, w: 11.3, h: 1.55, fontFace: FONT_HEAD, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.15 }
    );

    K.addFooter(s, { pageNum: 5, label: LABEL });
    s.addNotes(
      'Deliberate voltage, not accidental voltage, is the fix: instead of asking kP to back into the right voltage through tolerated error, compute what the mechanism actually needs and hand it over directly. kP\'s job shrinks to correcting whatever the model got wrong — a trim, not the whole controller. Every profiled mechanism in this course gets that treatment.'
    );
  }

  // ============================================================ SLIDE 6 — §3 two spec-sheet facts
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'tachometer_white.png', eyebrow: 'Section 3 · The spec sheet', title: 'Two Kraken X60 facts do almost all the work', badgeColor: ORANGE });

    const cols = [
      { label: 'FREE SPEED', value: '0.12 V', unit: 'per rotor rotation/sec', how: '6000 RPM at 12 V = 100 rot/s, so 12 ÷ 100' },
      { label: 'STALL TORQUE', value: '1.69 V', unit: 'per N·m at the rotor', how: '7.09 N·m at 12 V, so 12 ÷ 7.09' },
    ];
    cols.forEach((c, i) => {
      const x = 0.7 + i * 6.1;
      s.addShape('roundRect', { x, y: 1.65, w: 5.8, h: 3.3, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c.label, { x: x + 0.3, y: 1.85, w: 5.2, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 0.5, margin: 0 });
      s.addText(c.value, { x: x + 0.3, y: 2.35, w: 5.2, h: 1.0, fontFace: FONT_HEAD, bold: true, fontSize: 48, color: WHITE, valign: 'middle', margin: 0 });
      s.addText(c.unit, { x: x + 0.3, y: 3.4, w: 5.2, h: 0.45, fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, margin: 0 });
      s.addText(c.how, { x: x + 0.3, y: 3.95, w: 5.2, h: 0.8, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.2, w: 11.9, h: 1.55, bg: NAVY2,
      heading: 'Every gain walks the same path',
      headingSize: 22, headingColor: WHITE,
      body: 'What the drum needs → what the rotor needs → × whichever factor applies.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 6, label: LABEL, dark: true });
    s.addNotes(
      'Every gain on the next two slides comes from one of these two numbers, walked through the gearbox. Free speed: 6000 RPM on 12 V is 100 rotations a second, so it takes 0.12 V to sustain each rotor rotation per second. Stall torque: 7.09 N·m on 12 V, so it takes 1.69 V for each N·m at the rotor. The walk is always the same shape: figure out what the mechanism — the drum — needs, convert that to what the rotor needs, then multiply by whichever factor applies.'
    );
  }

  // ============================================================ SLIDE 7 — §3 kV and kA
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 3 · kV and kA', title: 'kV: the voltage a steady speed costs', badgeColor: ORANGE });

    chain(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.1, gap: 0.5,
      boxes: [
        { value: '1 rot/s', how: 'at the drum' },
        { value: '12 rot/s', how: 'at the rotor — gear ratio 12' },
        { value: '1.44 V', how: '12 × 0.12 = kElevatorKV', color: ORANGE },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 1.3, bg: NAVY2,
      body: 'The closed loop runs in drum rotations, so kV, kA and kP all live on the drum side — like kDriveKV = 0.8 is per wheel rotation.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 5.5, w: 11.9, h: 1.3, bg: NAVY2,
      body: 'kA = 0.003 is the smallest term: it only covers how sharply the profile speeds up and slows down. You\'ll check it from a graph.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 7, label: LABEL, dark: true });
    s.addNotes(
      'The elevator\'s gear ratio is 12.0 — twelve rotor rotations per drum rotation — so sustaining one drum rotation per second means sustaining twelve rotor rotations per second. Multiply by the speed factor: 12 × 0.12 = 1.44. That\'s kElevatorKV. Phoenix\'s SensorToMechanismRatio makes the closed loop run in drum rotations, the same way DriveConstants.kDriveKV = 0.8 is volts per wheel rotation per second, not per rotor rotation. kA scales with the mechanism\'s effective inertia, a smaller and harder-to-eyeball number than mass or drum radius. It\'s the smallest of the three terms, and you won\'t derive it by hand — section 10 shows how to confirm it\'s in the right neighborhood from a graph.'
    );
  }

  // ============================================================ SLIDE 8 — §3 kG
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'weight_white.png', eyebrow: 'Section 3 · kG', title: 'kG: the voltage to hold still against gravity', badgeColor: ORANGE });

    chain(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.5, gap: 0.45,
      boxes: [
        { value: '49.05 N', how: '5 kg × 9.81' },
        { value: '1.246 N·m', how: 'at the drum: × 0.0254 m radius' },
        { value: '0.104 N·m', how: 'at the rotor: ÷ 12' },
        { value: '0.18 V', how: '× 1.69 = kElevatorKG', color: ORANGE },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.4, w: 11.9, h: 2.3, bg: NAVY2,
      heading: 'Divide by the gear ratio this time',
      headingSize: 22, headingColor: WHITE,
      body: 'Speed goes up through the gearbox, so kV multiplied by 12. Torque goes the other way — the gearbox multiplies it for you — so the rotor needs 12 times less.',
      bodyColor: 'D7E3F4', bodySize: 19,
    });

    K.addFooter(s, { pageNum: 8, label: LABEL, dark: true });
    s.addNotes(
      'The carriage weighs kCarriageMass = 5 kg, so gravity pulls with 5 × 9.81 ≈ 49.05 N. That force acts at the drum\'s radius — kDrumRadius, 1 inch, 0.0254 m — so the drum needs 49.05 × 0.0254 ≈ 1.246 N·m just to stand still. Reflect that back through the gearbox to the rotor — dividing by the gear ratio this time, since the gearbox multiplies torque going the other way — and the rotor needs 1.246 / 12 ≈ 0.104 N·m. Multiply by the torque factor: 0.104 × 1.69 ≈ 0.18 V. That\'s kElevatorKG. Nothing guessed.'
    );
  }

  // ============================================================ SLIDE 9 — Constants part 1
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 3 · Constants.java', title: 'ElevatorConstants: the hardware and its limits' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.85, fontSize: 12.5,
      fileLabel: 'Add to Constants.java, as a new nested class after PathConstants — part 1',
      lines: [
        { text: 'public static final class ElevatorConstants {', color: SIG },
        { text: '  public static final int kMotorPort = 20; // CAN ID — change to yours', color: NEW },
        { text: '  public static final double kGearRatio = 12.0; // motor rotations per drum rotation', color: NEW },
        { text: '  public static final Distance kDrumRadius = Inches.of(1.0);', color: NEW },
        { text: '  public static final Mass kCarriageMass = Kilograms.of(5.0); // carriage + anything riding on it', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public static final Distance kMinHeight = Meters.of(0.0);', color: NEW },
        { text: '  public static final Distance kMaxHeight = Meters.of(1.5);', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public static final LinearVelocity kMaxVelocity = MetersPerSecond.of(1.0);', color: NEW },
        { text: '  public static final LinearAcceleration kMaxAcceleration = MetersPerSecondPerSecond.of(2.0);', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.45, w: 11.9, h: 1.4,
      body: 'kMaxVelocity and kMaxAcceleration are the carriage\'s own numbers, in meters. Section 6 converts them into drum rotations for Motion Magic.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 9, label: LABEL });
    s.addNotes(
      'ElevatorConstants goes inside Constants, alongside DriveConstants, SteerConstants and the rest. kGearRatio, kDrumRadius and kCarriageMass are the three facts the gain arithmetic used. kMinHeight and kMaxHeight are the travel range, which the Elevator will clamp every request to. kMaxVelocity and kMaxAcceleration are the mechanism\'s numbers — meters per second and meters per second squared of carriage travel.'
    );
  }

  // ============================================================ SLIDE 10 — Constants part 2
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 3 · Constants.java', title: 'The four gains, the presets, the tolerance' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.45, fontSize: 11.5,
      fileLabel: 'ElevatorConstants — part 2, finishing the class',
      lines: [
        { text: '  // Feedforward + trim gains, computed from the Kraken X60 spec sheet — see the lesson\'s §3.', color: COMMENT },
        { text: '  // SensorToMechanismRatio makes the closed loop run in drum rotations, so', color: COMMENT },
        { text: '  // every gain below is drum-side (mechanism-side), not rotor-side.', color: COMMENT },
        { text: '  public static final double kElevatorKG = 0.18; // volts to hold position against gravity', color: NEW },
        { text: '  public static final double kElevatorKV = 1.44; // volts per drum rotation/sec', color: NEW },
        { text: '  public static final double kElevatorKA = 0.003; // volts per drum rotation/sec^2', color: NEW },
        { text: '  public static final double kElevatorKP = 20.0; // volts per drum rotation of error — the trim', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public static final Distance kStowed = Meters.of(0.02);', color: NEW },
        { text: '  public static final Distance kScoreMid = Meters.of(0.75);', color: NEW },
        { text: '  public static final Distance kScoreHigh = Meters.of(1.45);', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public static final Distance kTolerance = Centimeters.of(2);', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.0, w: 11.9, h: 0.9,
      body: '0.18 and 1.44 are the numbers you just worked out; 20.0 is the trim.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 10, label: LABEL });
    s.addNotes(
      'kElevatorKG and kElevatorKV are the two numbers worked out on the last two slides. kElevatorKA is the small one you\'ll confirm from a graph. kElevatorKP = 20.0 is the trim. The three presets are what the D-pad will ask for: stowed at 2 cm, mid at 0.75 m, high at 1.45 m. kTolerance is how close counts as "arrived."'
    );
  }

  // ============================================================ SLIDE 11 — Constants imports
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 3 · Constants.java', title: 'Four new units and three new measure types' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.8, fontSize: 13,
      fileLabel: 'Add to Constants.java\'s imports, next to the ones already there',
      lines: [
        { text: 'import static org.wpilib.units.Units.Centimeters;', color: NEW },
        { text: 'import static org.wpilib.units.Units.Inches;', color: NEW },
        { text: 'import static org.wpilib.units.Units.Kilograms;', color: NEW },
        { text: 'import static org.wpilib.units.Units.MetersPerSecondPerSecond;', color: NEW },
        { text: 'import org.wpilib.units.measure.Distance;', color: NEW },
        { text: 'import org.wpilib.units.measure.LinearAcceleration;', color: NEW },
        { text: 'import org.wpilib.units.measure.Mass;', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.45, w: 11.9, h: 2.35,
      heading: 'kMotorPort = 20 is a placeholder',
      headingSize: 22,
      body: 'It steers clear of the drive and steer ports you\'ve already claimed (1 through 12) and the CANcoder ports (9 through 12). Change it to whatever is free on your own robot.',
      bodySize: 19,
    });

    K.addFooter(s, { pageNum: 11, label: LABEL });
    s.addNotes(
      'Four new static imports — Centimeters, Inches, Kilograms and MetersPerSecondPerSecond — plus the measure types Distance, Mass and LinearAcceleration, next to the AngularVelocity and LinearVelocity imports already there. Every new CAN device needs an ID nobody else has; 20 is just a number that\'s free on the course\'s robot.'
    );
  }

  // ============================================================ SLIDE 12 — §4 Motion Magic
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 4 · Motion Magic', title: 'Ramp up, cruise, ramp down — in firmware', badgeColor: ORANGE });

    // A velocity-vs-time trapezoid, drawn from lines.
    const px = 0.7, py = 1.65, pw = 6.3, ph = 3.6;
    s.addShape('roundRect', { x: px, y: py, w: pw, h: ph, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    const ax = px + 0.6, ay = py + ph - 0.65, top = py + 0.9;
    seg(s, ax, ay, px + pw - 0.35, ay, '7A93B8', 1.5);         // time axis
    seg(s, ax, ay, ax, py + 0.7, '7A93B8', 1.5);               // speed axis
    seg(s, ax, ay, ax + 1.5, top, TEAL, 4);                   // ramp up
    seg(s, ax + 1.5, top, ax + 3.5, top, TEAL, 4);            // cruise
    seg(s, ax + 3.5, top, ax + 5.0, ay, TEAL, 4);             // ramp down
    s.addText('Carriage speed during one move', { x: px + 0.3, y: py + 0.15, w: pw - 0.6, h: 0.4, fontFace: FONT_BODY, fontSize: 20, color: '7A93B8', margin: 0 });
    s.addText('ramp up', { x: ax, y: ay + 0.1, w: 1.5, h: 0.4, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', align: 'center', margin: 0 });
    s.addText('cruise', { x: ax + 1.5, y: ay + 0.1, w: 2.0, h: 0.4, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', align: 'center', margin: 0 });
    s.addText('ramp down', { x: ax + 3.4, y: ay + 0.1, w: 1.7, h: 0.4, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', align: 'center', margin: 0 });

    K.addCard(s, {
      x: 7.3, y: 1.65, w: 5.3, h: 1.7, bg: NAVY2,
      heading: 'PositionVoltage snaps',
      headingSize: 22, headingColor: WHITE,
      body: 'Full voltage, then a hard stop.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });
    K.addCard(s, {
      x: 7.3, y: 3.55, w: 5.3, h: 1.7, bg: NAVY2,
      heading: 'Motion Magic profiles',
      headingSize: 22, headingColor: WHITE,
      body: 'Cruise speed + acceleration.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addCard(s, {
      x: 0.7, y: 5.5, w: 11.9, h: 1.3, bg: NAVY2,
      body: 'Same kG, kV, kA and kP — Motion Magic feeds the profile\'s own speed and position into that model, recalculating when the goal changes.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 12, label: LABEL, dark: true });
    s.addNotes(
      'PositionVoltage, back in Lesson 5, snaps straight to a target angle — fine for steering, where the whole trip takes a fraction of a second. Ask an elevator to jump from stowed to full height the same way and you\'d get a violent, all-or-nothing lurch. Motion Magic is Phoenix\'s answer: you hand the firmware a cruise velocity and an acceleration, and it generates a smooth trapezoidal profile on its own — ramp up, cruise, ramp down — recalculating it continuously as you change the goal. You still supply the same gains. MotionMagicConfigs wants drum rotations per second and per second squared, the same mechanism-side units the gains use, so section 6 converts kMaxVelocity and kMaxAcceleration from meters.'
    );
  }

  // ============================================================ SLIDE 13 — create the four files
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Sections 5–8 · New files', title: 'Four new files, all in subsystems' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'Right-click subsystems → New File: ElevatorIO.java', detail: 'The contract: what the elevator senses, and what it can be told.' },
        { title: 'Right-click subsystems → New File: ElevatorIOTalonFX.java', detail: 'The real motor, behind the contract.' },
        { title: 'Right-click subsystems → New File: ElevatorIOSim.java', detail: 'The real class, plus a physics model underneath it.' },
        { title: 'Right-click subsystems → New File: Elevator.java', detail: 'The mechanism your commands talk to.' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: LABEL });
    s.addNotes(
      'All four live in src/main/java/first/robot/subsystems, next to the drivetrain\'s files. If the shape looks familiar, it should: ModuleIO, ModuleIOTalonFX, ModuleIOSim and SwerveModule from Lesson 13 are the same four roles. The next slides fill them in, one file at a time.'
    );
  }

  // ============================================================ SLIDE 14 — ElevatorIO
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 5 · ElevatorIO.java', title: 'The contract: four readings, two methods' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.85, fontSize: 11.5,
      fileLabel: 'Create subsystems/ElevatorIO.java — the whole file',
      lines: [
        { text: 'package first.robot.subsystems;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'public interface ElevatorIO {', color: SIG },
        { text: '  public static class ElevatorIOInputs {', color: SIG },
        { text: '    public double heightMeters = 0.0;', color: NEW },
        { text: '    public double velocityMetersPerSec = 0.0;', color: NEW },
        { text: '    public double appliedVolts = 0.0;', color: NEW },
        { text: '    public double setpointMeters = 0.0; // the profile\'s instantaneous target, not the final goal', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  /** Read every sensor into \'inputs\'. Called once per tick, before anything else. */', color: COMMENT },
        { text: '  public default void updateInputs(ElevatorIOInputs inputs) {}', color: NEW },
        { text: '', color: PLAIN },
        { text: '  /** Firmware Motion Magic position control, in meters of carriage height. */', color: COMMENT },
        { text: '  public default void setGoalHeightMeters(double meters) {}', color: NEW },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.35, w: 11.9, h: 0.6,
      body: 'Default do-nothing methods: REPLAY needs no code of its own.',
      pad: 0.1, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 14, label: LABEL });
    s.addNotes(
      'Same shape as ModuleIO and GyroIO from Lesson 13 — a bundle of sensor readings, and default do-nothing methods so a REPLAY implementation needs zero code of its own. Look twice at setpointMeters before moving on: it\'s the third number, and the next slide is about why it matters.'
    );
  }

  // ============================================================ SLIDE 15 — goal / setpoint / position
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 5 · Three numbers, not two', title: 'Goal, setpoint, position', badgeColor: ORANGE });

    // A sketch of the three traces during one move.
    const px = 0.7, py = 1.65, pw = 6.3, ph = 3.85;
    s.addShape('roundRect', { x: px, y: py, w: pw, h: ph, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    const x0 = px + 0.5, x1 = px + 1.3, x2 = px + 4.3, x3 = px + pw - 0.4;
    const lo = py + ph - 0.6, hi = py + 0.75;
    seg(s, x0, lo, x1, lo, ORANGE, 3);          // goal: low...
    seg(s, x1, lo, x1, hi, ORANGE, 3);          // ...steps up...
    seg(s, x1, hi, x3, hi, ORANGE, 3);          // ...and stays
    seg(s, x1, lo - 0.04, x2, hi + 0.04, TEAL, 4);           // setpoint: the profile's ramp
    seg(s, x2, hi + 0.04, x3, hi + 0.04, TEAL, 4);
    seg(s, x1 + 0.45, lo, x2 + 0.35, hi + 0.12, WHITE, 2);   // position: just behind it
    seg(s, x2 + 0.35, hi + 0.12, x3, hi + 0.12, WHITE, 2);

    const rows = [
      { name: 'GOAL', color: ORANGE, text: 'What you asked for. A step.' },
      { name: 'SETPOINT', color: TEAL, text: 'Where the profile is right now. A ramp.' },
      { name: 'POSITION', color: WHITE, text: 'Where the carriage actually is.' },
    ];
    rows.forEach((r, i) => {
      const y = 1.65 + i * 1.3;
      s.addShape('roundRect', { x: 7.3, y, w: 5.3, h: 1.15, rectRadius: 0.1, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(r.name, { x: 7.55, y: y + 0.12, w: 4.8, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: r.color, charSpacing: 1, margin: 0 });
      s.addText(r.text, { x: 7.55, y: y + 0.55, w: 4.9, h: 0.45, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', margin: 0 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.7, w: 11.9, h: 1.15, bg: NAVY2,
      body: 'Without the setpoint, a carriage that can\'t keep up and a profile still ramping look identical.',
      bodyColor: 'D7E3F4', pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 15, label: LABEL, dark: true });
    s.addNotes(
      'It\'s tempting to think a mechanism has only two numbers worth tracking — where you asked it to go, and where it is. There\'s a third: where the profile currently says it should be, mid-ramp. Plot position against the goal alone and you see a step next to a smooth curve, and you can\'t tell whether a gap is the profile still ramping up — which is supposed to happen — or the motor failing to keep up with a profile that\'s already there. Section 10 puts this number to work.'
    );
  }

  // ============================================================ SLIDE 16 — ElevatorIOTalonFX imports
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'microchip_white.png', eyebrow: 'Section 6 · ElevatorIOTalonFX.java', title: 'The real motor: package and imports' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.4, fontSize: 11,
      fileLabel: 'Create subsystems/ElevatorIOTalonFX.java — part 1',
      lines: [
        { text: 'package first.robot.subsystems;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.Meters;', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.MetersPerSecond;', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.MetersPerSecondPerSecond;', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.Rotations;', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.RotationsPerSecond;', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.Volts;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import com.ctre.phoenix6.CANBus;', color: PLAIN },
        { text: 'import com.ctre.phoenix6.configs.TalonFXConfiguration;', color: PLAIN },
        { text: 'import com.ctre.phoenix6.controls.MotionMagicVoltage;', color: PLAIN },
        { text: 'import com.ctre.phoenix6.hardware.TalonFX;', color: PLAIN },
        { text: 'import com.ctre.phoenix6.signals.GravityTypeValue;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import org.wpilib.hardware.bus.CANPort;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import first.robot.Constants.ElevatorConstants;', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 16, label: LABEL });
    s.addNotes(
      'Two imports are new to you: MotionMagicVoltage, the control request that asks for a profiled move, and GravityTypeValue, which tells the closed loop what shape gravity\'s pull has. Everything else you\'ve imported before for the drive and steer motors.'
    );
  }

  // ============================================================ SLIDE 17 — ElevatorIOTalonFX constructor, gains
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'microchip_white.png', eyebrow: 'Section 6 · ElevatorIOTalonFX.java', title: 'Every gain goes into Slot0' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.0, fontSize: 12,
      fileLabel: 'ElevatorIOTalonFX — part 2: the class, its fields, the start of the constructor',
      lines: [
        { text: '/** Real hardware: Motion Magic profiles the move, Slot0\'s full feedforward set holds it. */', color: COMMENT },
        { text: 'public class ElevatorIOTalonFX implements ElevatorIO {', color: SIG },
        { text: '  protected final TalonFX m_motor;', color: NEW },
        { text: '  private final MotionMagicVoltage m_request = new MotionMagicVoltage(0);', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public ElevatorIOTalonFX() {', color: SIG },
        { text: '    m_motor = new TalonFX(ElevatorConstants.kMotorPort, new CANBus(CANPort.CAN_S0));', color: NEW },
        { text: '', color: PLAIN },
        { text: '    TalonFXConfiguration config = new TalonFXConfiguration();', color: NEW },
        { text: '    config.Feedback.SensorToMechanismRatio = ElevatorConstants.kGearRatio;', color: NEW },
        { text: '', color: PLAIN },
        { text: '    // Full feedforward set — kP is the trim, not the whole story.', color: COMMENT },
        { text: '    config.Slot0.kG = ElevatorConstants.kElevatorKG;', color: NEW },
        { text: '    config.Slot0.GravityType = GravityTypeValue.Elevator_Static;', color: NEW },
        { text: '    config.Slot0.kV = ElevatorConstants.kElevatorKV;', color: NEW },
        { text: '    config.Slot0.kA = ElevatorConstants.kElevatorKA;', color: NEW },
        { text: '    config.Slot0.kP = ElevatorConstants.kElevatorKP;', color: NEW },
      ],
    });

    K.addFooter(s, { pageNum: 17, label: LABEL });
    s.addNotes(
      'm_motor is protected rather than private for the same reason ModuleIOTalonFX\'s motors are: the sim class will extend this one and reach in for the motor\'s sim state. SensorToMechanismRatio = kGearRatio makes every gain, and every position the motor reports, live in drum rotations instead of rotor rotations. Then the full feedforward set: kG with its gravity type, kV, kA, and kP last — the trim.'
    );
  }

  // ============================================================ SLIDE 18 — Motion Magic config + updateInputs
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'microchip_white.png', eyebrow: 'Section 6 · ElevatorIOTalonFX.java', title: 'Profile limits in, four readings out' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.0, fontSize: 12,
      fileLabel: 'ElevatorIOTalonFX — part 3: finishing the constructor, then updateInputs',
      lines: [
        { text: '    config.MotionMagic.MotionMagicCruiseVelocity =', color: NEW },
        { text: '        metersToRotations(ElevatorConstants.kMaxVelocity.in(MetersPerSecond));', color: NEW },
        { text: '    config.MotionMagic.MotionMagicAcceleration =', color: NEW },
        { text: '        metersToRotations(ElevatorConstants.kMaxAcceleration.in(MetersPerSecondPerSecond));', color: NEW },
        { text: '', color: PLAIN },
        { text: '    m_motor.getConfigurator().apply(config);', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  @Override', color: SIG },
        { text: '  public void updateInputs(ElevatorIOInputs inputs) {', color: SIG },
        { text: '    inputs.heightMeters = rotationsToMeters(m_motor.getPosition().getValue().in(Rotations));', color: NEW },
        { text: '    inputs.velocityMetersPerSec =', color: NEW },
        { text: '        rotationsToMeters(m_motor.getVelocity().getValue().in(RotationsPerSecond));', color: NEW },
        { text: '    inputs.appliedVolts = m_motor.getMotorVoltage().getValue().in(Volts);', color: NEW },
        { text: '    inputs.setpointMeters = rotationsToMeters(m_motor.getClosedLoopReference().getValue());', color: NEW },
        { text: '  }', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 18, label: LABEL });
    s.addNotes(
      'The cruise velocity and acceleration go in as drum rotations, converted from the meters in Constants by metersToRotations — written on the next slide. updateInputs reads four things. Three you\'d expect: height, velocity, applied volts. The fourth, getClosedLoopReference(), is the profile\'s own live setpoint straight from the firmware — the third number from two slides ago.'
    );
  }

  // ============================================================ SLIDE 19 — setGoal + conversions
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'microchip_white.png', eyebrow: 'Section 6 · ElevatorIOTalonFX.java', title: 'Meters in, drum rotations out' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.4, fontSize: 11,
      fileLabel: 'ElevatorIOTalonFX — part 4, finishing the file',
      lines: [
        { text: '  @Override', color: SIG },
        { text: '  public void setGoalHeightMeters(double meters) {', color: SIG },
        { text: '    // Phoenix speaks Units — hand it the position as a measure.', color: COMMENT },
        { text: '    m_motor.setControl(m_request.withPosition(Rotations.of(metersToRotations(meters))));', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  /** Drum rotations for a given carriage height — the drum\'s circumference does the conversion. */', color: COMMENT },
        { text: '  protected static double metersToRotations(double meters) {', color: SIG },
        { text: '    return meters / (2 * Math.PI * ElevatorConstants.kDrumRadius.in(Meters));', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  protected static double rotationsToMeters(double rotations) {', color: SIG },
        { text: '    return rotations * 2 * Math.PI * ElevatorConstants.kDrumRadius.in(Meters);', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.0, w: 11.9, h: 0.9,
      body: 'Both conversions are protected, so ElevatorIOSim can reuse them.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 19, label: LABEL });
    s.addNotes(
      'One drum rotation lifts the carriage by one drum circumference, 2π × radius — the same way one wheel rotation moves the robot one wheel circumference. setGoalHeightMeters converts the requested height and hands Motion Magic the position as a measure. The conversions are protected, not private, because the sim class reaches straight in and reuses them instead of redefining the same conversion twice.'
    );
  }

  // ============================================================ SLIDE 20 — four things to point at
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 6 · Reading the code', title: 'Four lines worth pointing at', badgeColor: ORANGE });

    const cards = [
      { heading: 'Elevator_Static', body: 'Gravity\'s pull is the same at the bottom and the top, so kG is too. An arm\'s isn\'t.' },
      { heading: 'SensorToMechanismRatio', body: 'Every gain and every reported position is in drum rotations, not rotor rotations.' },
      { heading: 'getClosedLoopReference()', body: 'The profile\'s live setpoint, straight from the firmware: the third number.' },
      { heading: '.getValue(), nothing shorter', body: 'A Voltage or an Angle unpacks with .in(...); a bare Double just auto-unboxes.' },
    ];
    cards.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      K.addCard(s, {
        x: 0.7 + col * 6.1, y: 1.65 + row * 2.65, w: 5.8, h: 2.5, bg: NAVY2,
        heading: c.heading, headingSize: 22, headingColor: WHITE,
        body: c.body, bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
      });
    });

    K.addFooter(s, { pageNum: 20, label: LABEL, dark: true });
    s.addNotes(
      'GravityTypeValue.Elevator_Static tells the closed loop that kG\'s contribution doesn\'t depend on where the carriage is — full weight, full holding voltage, at the bottom or the top. An arm\'s gravity load does change with angle, which is a different GravityTypeValue a later lesson introduces. SensorToMechanismRatio is the same trick ModuleIOTalonFX already uses for the drive and steer motors. And there\'s no getValueAsDouble() anywhere: every StatusSignal in this API gives you .getValue() and nothing shorter — for a Voltage or an Angle that means unpacking with .in(...), and for a bare Double like getClosedLoopReference()\'s it just auto-unboxes.'
    );
  }

  // ============================================================ SLIDE 21 — ElevatorIOSim imports
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 7 · ElevatorIOSim.java', title: 'The simulated elevator: package and imports' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.05, fontSize: 12.5,
      fileLabel: 'Create subsystems/ElevatorIOSim.java — part 1',
      lines: [
        { text: 'package first.robot.subsystems;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.Kilograms;', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.Meters;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import com.ctre.phoenix6.sim.TalonFXSimState;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import org.wpilib.math.system.DCMotor;', color: PLAIN },
        { text: 'import org.wpilib.simulation.ElevatorSim;', color: PLAIN },
        { text: 'import org.wpilib.system.RobotController;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import first.robot.Constants.ElevatorConstants;', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.3,
      body: 'Same pattern as ModuleIOSim: extend the real class, then feed a physics model into its motor every tick.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 21, label: LABEL });
    s.addNotes(
      'Extending the real class means inheriting its motor and its configs — every gain you just set runs in the simulated firmware too. The physics model this time is WPILib\'s ElevatorSim: it already knows how to turn a voltage into a height and a velocity, and with simulateGravity on, a carriage that falls when nothing holds it up.'
    );
  }

  // ============================================================ SLIDE 22 — ElevatorIOSim class + constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 7 · ElevatorIOSim.java', title: 'An ElevatorSim built from the same constants' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.3, fontSize: 12,
      fileLabel: 'ElevatorIOSim — part 2: the class, its physics model, the constructor',
      lines: [
        { text: '/** Sim: the real TalonFX class, plus WPILib\'s ElevatorSim physics model underneath it. */', color: COMMENT },
        { text: 'public class ElevatorIOSim extends ElevatorIOTalonFX {', color: SIG },
        { text: '  private final TalonFXSimState m_sim;', color: NEW },
        { text: '  private final ElevatorSim m_elevatorModel = new ElevatorSim(', color: NEW },
        { text: '      DCMotor.getKrakenX60(1),', color: NEW },
        { text: '      ElevatorConstants.kGearRatio,', color: NEW },
        { text: '      ElevatorConstants.kCarriageMass.in(Kilograms),', color: NEW },
        { text: '      ElevatorConstants.kDrumRadius.in(Meters),', color: NEW },
        { text: '      ElevatorConstants.kMinHeight.in(Meters),', color: NEW },
        { text: '      ElevatorConstants.kMaxHeight.in(Meters),', color: NEW },
        { text: '      true, // simulateGravity — an unpowered carriage falls', color: NEW },
        { text: '      ElevatorConstants.kStowed.in(Meters));', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public ElevatorIOSim() {', color: SIG },
        { text: '    super(); // build the motor and apply the real configs', color: NEW },
        { text: '    m_sim = m_motor.getSimState();', color: NEW },
        { text: '  }', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 22, label: LABEL });
    s.addNotes(
      'The model takes the same facts the gain arithmetic used — one Kraken X60, the 12:1 gearbox, a 5 kg carriage, a 1-inch drum — plus the travel range and a starting height. Nothing here is tuned for the sim: if the model and the gains disagree, that\'s worth knowing. super() builds the motor and applies the real configs; then the constructor grabs the motor\'s sim state.'
    );
  }

  // ============================================================ SLIDE 23 — ElevatorIOSim stepSim
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 7 · ElevatorIOSim.java', title: 'Step the physics, then read it like the real class' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.4, fontSize: 11,
      fileLabel: 'ElevatorIOSim — part 3, finishing the file',
      lines: [
        { text: '  @Override', color: SIG },
        { text: '  public void updateInputs(ElevatorIOInputs inputs) {', color: SIG },
        { text: '    stepSim(); // advance the physics one tick...', color: NEW },
        { text: '    super.updateInputs(inputs); // ...then read the sensor like the real class', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  /** One tick of pretend reality. */', color: COMMENT },
        { text: '  private void stepSim() {', color: SIG },
        { text: '    m_sim.setSupplyVoltage(RobotController.getBatteryVoltage());', color: NEW },
        { text: '    m_elevatorModel.setInputVoltage(m_sim.getMotorVoltage());', color: NEW },
        { text: '    m_elevatorModel.update(0.020);', color: NEW },
        { text: '', color: PLAIN },
        { text: '    // The model reports carriage motion in meters; convert back to rotor-side', color: COMMENT },
        { text: '    // rotations through the drum and the gearbox, same as every module motor.', color: COMMENT },
        { text: '    m_sim.setRawRotorPosition(', color: NEW },
        { text: '        metersToRotations(m_elevatorModel.getPosition()) * ElevatorConstants.kGearRatio);', color: NEW },
        { text: '    m_sim.setRotorVelocity(', color: NEW },
        { text: '        metersToRotations(m_elevatorModel.getVelocity()) * ElevatorConstants.kGearRatio);', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 23, label: LABEL });
    s.addNotes(
      'Each tick: tell the simulated motor what the battery is doing, hand the model whatever voltage the simulated firmware decided to apply, advance the physics 20 ms, then feed the result back as rotor position and velocity. The model speaks meters at the carriage; the motor\'s sim state wants rotor rotations, so the height goes through the drum (metersToRotations) and then the gearbox (× kGearRatio). updateInputs steps first and then reads exactly the way the real class does.'
    );
  }

  // ============================================================ SLIDE 24 — Elevator imports
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'Section 8 · Elevator.java', title: 'The mechanism: package and imports' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.05, fontSize: 12.5,
      fileLabel: 'Create subsystems/Elevator.java — part 1',
      lines: [
        { text: 'package first.robot.subsystems;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import static org.wpilib.units.Units.Meters;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import org.wpilib.command3.Command;', color: PLAIN },
        { text: 'import org.wpilib.command3.Mechanism;', color: PLAIN },
        { text: 'import org.wpilib.command3.Scheduler;', color: PLAIN },
        { text: 'import org.wpilib.telemetry.Telemetry;', color: PLAIN },
        { text: 'import org.wpilib.units.measure.Distance;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'import first.robot.Constants;', color: PLAIN },
        { text: 'import first.robot.Constants.ElevatorConstants;', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.3,
      body: 'Same shape as Drivetrain: a mode switch picks the IO once, and a periodic callback senses and logs.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 24, label: LABEL });
    s.addNotes(
      'Elevator is the class every command talks to. Nothing outside it knows whether the motor behind it is real, simulated, or a log being replayed.'
    );
  }

  // ============================================================ SLIDE 25 — Elevator fields + constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'Section 8 · Elevator.java', title: 'One IO, picked once, by mode' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.35, fontSize: 12.5,
      fileLabel: 'Elevator — part 2: the class, its fields, the constructor',
      lines: [
        { text: '/** Scoring elevator: Motion Magic profiles the move, Slot0\'s feedforward model holds it there. */', color: COMMENT },
        { text: 'public class Elevator implements Mechanism {', color: SIG },
        { text: '  private final ElevatorIO m_io = switch (Constants.kCurrentMode) {', color: NEW },
        { text: '    case REAL -> new ElevatorIOTalonFX();', color: NEW },
        { text: '    case SIM -> new ElevatorIOSim();', color: NEW },
        { text: '    case REPLAY -> new ElevatorIO() {}; // inputs come from the log', color: NEW },
        { text: '  };', color: NEW },
        { text: '  private final ElevatorIO.ElevatorIOInputs m_inputs = new ElevatorIO.ElevatorIOInputs();', color: NEW },
        { text: '  private Distance m_goal = ElevatorConstants.kStowed;', color: NEW },
        { text: '', color: PLAIN },
        { text: '  public Elevator() {', color: SIG },
        { text: '    Scheduler.getDefault().addPeriodic(this::periodic);', color: NEW },
        { text: '  }', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.95, w: 11.9, h: 0.95,
      body: 'Mechanism has no periodic() hook, so the constructor asks the scheduler for one.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 25, label: LABEL });
    s.addNotes(
      'The mode switch is the same one Drivetrain has used since Lesson 13: real hardware, the simulated version, or an empty IO whose inputs come from the log. m_goal remembers the last height asked for — it starts stowed, where the sim model starts too. Mechanism doesn\'t hand you a periodic() hook of its own, so you ask the scheduler for one the same way Drivetrain already does.'
    );
  }

  // ============================================================ SLIDE 26 — periodic + goToHeight
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'Section 8 · Elevator.java', title: 'Log five numbers, command one height' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.4, fontSize: 11,
      fileLabel: 'Elevator — part 3: periodic, then goToHeight',
      lines: [
        { text: '  /** One tick of sensing: read the hardware into the bundle and log it. */', color: COMMENT },
        { text: '  private void periodic() {', color: SIG },
        { text: '    m_io.updateInputs(m_inputs);', color: NEW },
        { text: '    Telemetry.log("Elevator/HeightMeters", m_inputs.heightMeters);', color: NEW },
        { text: '    Telemetry.log("Elevator/VelocityMetersPerSec", m_inputs.velocityMetersPerSec);', color: NEW },
        { text: '    Telemetry.log("Elevator/AppliedVolts", m_inputs.appliedVolts);', color: NEW },
        { text: '    Telemetry.log("Elevator/SetpointMeters", m_inputs.setpointMeters);', color: NEW },
        { text: '    Telemetry.log("Elevator/GoalMeters", m_goal.in(Meters));', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  /** Send the carriage to \'target\', clamped to safe travel. Keeps holding once it arrives. */', color: COMMENT },
        { text: '  public Command goToHeight(Distance target) {', color: SIG },
        { text: '    return runRepeatedly(() -> {', color: NEW },
        { text: '          m_goal = clampToTravel(target);', color: NEW },
        { text: '          m_io.setGoalHeightMeters(m_goal.in(Meters));', color: NEW },
        { text: '        })', color: NEW },
        { text: '        .until(this::atGoal)', color: NEW },
        { text: '        .named("Go To Height");', color: NEW },
        { text: '  }', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 26, label: LABEL });
    s.addNotes(
      'periodic reads the IO into the bundle and logs all three of goal, setpoint and height, plus velocity and applied volts — everything section 10 will graph. goToHeight clamps the target to the travel range, hands it to the IO, and finishes once the carriage is within tolerance. It keeps holding after it finishes, because a Motion Magic request is a standing order to the firmware — more on that in two slides.'
    );
  }

  // ============================================================ SLIDE 27 — atGoal + clampToTravel
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'Section 8 · Elevator.java', title: 'Arrived, where, and never past the ends' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.4, fontSize: 11,
      fileLabel: 'Elevator — part 4, finishing the file',
      lines: [
        { text: '  public boolean atGoal() {', color: SIG },
        { text: '    return Math.abs(m_inputs.heightMeters - m_goal.in(Meters)) < ElevatorConstants.kTolerance.in(Meters);', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  public double getHeightMeters() {', color: SIG },
        { text: '    return m_inputs.heightMeters;', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  /** Keeps \'target\' inside [kMinHeight, kMaxHeight] — there\'s no MathUtil.clamp to reach for here. */', color: COMMENT },
        { text: '  private static Distance clampToTravel(Distance target) {', color: SIG },
        { text: '    if (target.gt(ElevatorConstants.kMaxHeight)) {', color: NEW },
        { text: '      return ElevatorConstants.kMaxHeight;', color: NEW },
        { text: '    } else if (target.lt(ElevatorConstants.kMinHeight)) {', color: NEW },
        { text: '      return ElevatorConstants.kMinHeight;', color: NEW },
        { text: '    } else {', color: NEW },
        { text: '      return target;', color: NEW },
        { text: '    }', color: NEW },
        { text: '  }', color: PLAIN },
        { text: '}', color: PLAIN },
      ],
    });

    K.addFooter(s, { pageNum: 27, label: LABEL });
    s.addNotes(
      'atGoal compares the measured height with the goal, inside kTolerance. getHeightMeters is a plain getter. clampToTravel keeps every request inside the travel range before it ever reaches the motor — the next slide is about how it compares two Distances without unpacking them.'
    );
  }

  // ============================================================ SLIDE 28 — two design choices
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 8 · Two design choices', title: 'A typed clamp, and no stop on cancel', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'Measures compare themselves',
      headingSize: 22, headingColor: WHITE,
      body: 'Every measure type gets .gt, .lt, .gte and .lte for free, so the clamp reads like a double one — comparing Distances, never unpacking them.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'goToHeight never calls whenCanceled',
      headingSize: 22, headingColor: WHITE,
      body: 'A Motion Magic request is a standing order: go here and stay. A new goToHeight issues its own goal at once, so the carriage is never uncommanded.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });

    K.addFooter(s, { pageNum: 28, label: LABEL, dark: true });
    s.addNotes(
      'WPILib\'s units library gives every measure type ordering through the Measure interface, so a typed clamp reads almost exactly like the double-based one Drivetrain already has. Every drive command you\'ve written stops the robot on cancellation, because leaving a swerve module spinning is dangerous. An elevator command is the opposite case: the firmware keeps running a Motion Magic request until something replaces it. If goToHeight gets interrupted by a fresh call to itself — pressing a different D-pad direction — the new command\'s runRepeatedly immediately issues a new goal, and the old one\'s absence changes nothing.'
    );
  }

  // ============================================================ SLIDE 29 — Robot.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'robot_white.png', eyebrow: 'Section 9 · Robot.java', title: 'One elevator, built once' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.75, fontSize: 13,
      fileLabel: 'Add to Robot, below the pathBuilder field',
      lines: [
        { text: 'public final FollowPath.Builder pathBuilder = Autos.makePathBuilder(drivetrain, localizer);', color: PLAIN },
        { text: '', color: PLAIN },
        { text: 'public final Elevator elevator = new Elevator();', color: NEW },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.35, w: 11.9, h: 1.2, fontSize: 14,
      fileLabel: 'Add to Robot\'s imports',
      lines: [{ text: 'import first.robot.subsystems.Elevator;', color: NEW }],
    });

    K.addCard(s, {
      x: 0.7, y: 4.75, w: 11.9, h: 1.3,
      body: 'Robot lives for the whole program, so the elevator lives there with the drivetrain. Every opmode reaches in through robot.elevator.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 29, label: LABEL });
    s.addNotes(
      'A field on Robot is built once, when the program starts, and every opmode gets the same Robot handed to its constructor — which is how the teleop opmode will reach the elevator on the next slide.'
    );
  }

  // ============================================================ SLIDE 30 — RobotTeleop D-pad
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 9 · RobotTeleop.java', title: 'Three presets on the D-pad' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.6, fontSize: 11.5,
      fileLabel: 'Add to RobotTeleop\'s constructor, after the heading bindings',
      lines: [
        { text: '    robot.driverController.faceDown().onTrue(robot.drivetrain.turnToHeading(90));', color: PLAIN },
        { text: '    robot.driverController.faceRight().onTrue(robot.drivetrain.turnToHeading(0));', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '    // D-pad: send the elevator to one of its three preset heights.', color: COMMENT },
        { text: '    robot.driverController.dpadDown().onTrue(robot.elevator.goToHeight(ElevatorConstants.kStowed));', color: NEW },
        { text: '    robot.driverController.dpadRight().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreMid));', color: NEW },
        { text: '    robot.driverController.dpadUp().onTrue(robot.elevator.goToHeight(ElevatorConstants.kScoreHigh));', color: NEW },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 1.2, fontSize: 14,
      fileLabel: 'Add to RobotTeleop\'s imports, next to DriveConstants',
      lines: [{ text: 'import first.robot.Constants.ElevatorConstants;', color: NEW }],
    });

    K.addCard(s, {
      x: 0.7, y: 5.6, w: 11.9, h: 1.25,
      body: 'Down stows it, right is mid, up is high. A new press replaces the last request — no gap in between.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 30, label: LABEL });
    s.addNotes(
      'onTrue schedules the command once per press. Press a different direction mid-move and the new goToHeight takes over immediately — the carriage just gets a new standing order.'
    );
  }

  // ============================================================ SLIDE 31 — run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 9 · Run it', title: 'Tap the D-pad and watch it hold' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: './gradlew simulateJava, then Teleoperated', detail: 'Enable it — the D-pad only works while teleop runs.' },
        { title: 'AdvantageScope: NetworkTables → Telemetry → Elevator', detail: 'Connect to the simulator, as in Lesson 3.' },
        { title: 'Tap D-pad up, right, then down', detail: 'High at 1.45 m, mid at 0.75 m, stowed at 0.02 m.' },
        { title: 'Watch HeightMeters climb — and stay', detail: 'It gets there, and it doesn\'t sag back down.' },
      ],
    });

    K.addFooter(s, { pageNum: 31, label: LABEL });
    s.addNotes(
      'Run ./gradlew simulateJava, enable Teleoperated, open AdvantageScope, expand NetworkTables → Telemetry → Elevator, tap the D-pad, and watch HeightMeters climb toward whichever preset you asked for and stay there. That "and stay there" is the whole lesson.'
    );
  }

  // ============================================================ SLIDE 32 — §10 the graph
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'chartline_white.png', eyebrow: 'Section 10 · Reading the gains off a graph', title: 'Three curves on one graph' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: 'AdvantageScope: open a Line Graph tab', detail: 'Connected to the simulator, as before.' },
        { title: 'Drag GoalMeters, SetpointMeters, HeightMeters onto it', detail: 'All three from NetworkTables → Telemetry → Elevator.' },
        { title: 'Press a preset and read the gaps', detail: 'The goal steps; the setpoint ramps; the height follows.' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.45,
      heading: 'Tune against the middle curve',
      headingSize: 22,
      body: 'Setpoint vs height is the controller; goal vs setpoint, the profile.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 32, label: LABEL });
    s.addNotes(
      'Every gain here was computed, not guessed — but "computed" still means "worth checking against what the robot actually does." Each curve answers a different question: the goal is a step (what you asked for), the setpoint is the smooth ramp Motion Magic generated (what the profile is asking for right now), and the height is what the carriage is actually doing. A gap between setpoint and height is the controller failing to keep up; a gap between goal and setpoint is the profile still ramping, which is supposed to happen.'
    );
  }

  // ============================================================ SLIDE 33 — tuning order
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'sliders_white.png', eyebrow: 'Section 10 · The order to tune in', title: 'Tune in the order the model was built', badgeColor: ORANGE });

    const cards = [
      { heading: '1 · kG wrong', body: 'A steady offset even at rest. Zeroed: about 1.6 mm, forever.' },
      { heading: '2 · kV wrong', body: 'Lag only while moving: opens while cruising, closes as it slows.' },
      { heading: '3 · kA wrong', body: 'Brief spikes at the start and end, where the profile accelerates hardest.' },
      { heading: '4 · kP last', body: 'Settled gap under ¼ mm. Chasing more? The bug is upstream.' },
    ];
    cards.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      K.addCard(s, {
        x: 0.7 + col * 6.1, y: 1.65 + row * 2.65, w: 5.8, h: 2.5, bg: NAVY2,
        heading: c.heading, headingSize: 22, headingColor: WHITE,
        body: c.body, bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
      });
    });

    K.addFooter(s, { pageNum: 33, label: LABEL, dark: true });
    s.addNotes(
      'kG first, then kV, then kA, then kP last, as the smallest possible trim — each wrong gain has its own signature on the graph. A wrong kG is a fixed offset from the setpoint that never goes away on its own: small here, because 0.18 V is small. A wrong kV shows up only while moving — position lagging setpoint during the flat part of the profile, closing again as it decelerates. A wrong kA is the subtlest: a brief spike right at the ramp edges, vanishing at constant speed — easy to miss unless you\'re looking for it. With the model correct, the fully settled gap lands under a quarter of a millimeter; if you find yourself raising kP to chase more than that, the real bug is almost always in kG, kV or kA.'
    );
  }

  // ============================================================ SLIDE 34 — predicting kV's lag
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 10 · Predict, then measure', title: 'What kV saves kP from doing', badgeColor: ORANGE });

    const cols = [
      { label: 'PREDICT, WITH NO kV', a: '≈ 9 V', aHow: 'to cruise: 1.44 × 6.3 drum rot/s', b: '≈ 7 cm', bHow: 'of lag for kP = 20 to make 9 V' },
      { label: 'MEASURED, FULL TRAVEL', a: '≈ 9 cm', aHow: 'peak lag, kElevatorKV zeroed', b: '1.5–2 cm', bHow: 'peak lag, with the model' },
    ];
    cols.forEach((c, i) => {
      const x = 0.7 + i * 6.1;
      s.addShape('roundRect', { x, y: 1.65, w: 5.8, h: 3.6, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c.label, { x: x + 0.3, y: 1.85, w: 5.2, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 0.5, margin: 0 });
      s.addText(c.a, { x: x + 0.3, y: 2.4, w: 2.4, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 36, color: WHITE, valign: 'middle', margin: 0 });
      s.addText(c.aHow, { x: x + 2.75, y: 2.4, w: 2.85, h: 0.9, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'middle', margin: 0 });
      s.addText(c.b, { x: x + 0.3, y: 3.75, w: 2.4, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 36, color: i === 1 ? ORANGE : WHITE, valign: 'middle', margin: 0 });
      s.addText(c.bHow, { x: x + 2.75, y: 3.75, w: 2.85, h: 0.9, fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'middle', margin: 0 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.5, w: 11.9, h: 1.3, bg: NAVY2,
      body: 'kP is working either way. The model decides how much work it\'s forced to do.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 34, label: LABEL, dark: true });
    s.addNotes(
      'You can predict kV\'s effect before measuring it. A 1.0 m/s cruise is about 6.3 drum rotations a second, which costs 1.44 × 6.3 ≈ 9 V. With no kV, kP = 20 can only make 9 V out of about 0.45 rotations of error — some 7 cm. Measured moving the full travel range with kElevatorKV zeroed: about 9 cm of peak lag — the 7 cm, plus a little extra while the profile is still speeding up. With the model in place, the same move: 1.5 to 2 cm. Both numbers wander by several millimeters from run to run, so don\'t expect to match them to the millimeter. kP = 20 is doing real work either way; the difference is how much it\'s forced to do versus how much the model already handled.'
    );
  }

  // ============================================================ SLIDE 35 — real hardware
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'exclamationtriangle_white.png', eyebrow: 'Section 10 · On real hardware', title: 'Slow, short moves first', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.4,
      heading: 'Don\'t start with full-height moves',
      headingSize: 22,
      body: 'Start with kScoreMid from a stop and watch it settle. Only then try a move across the full travel.',
      bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.4,
      heading: 'A wrong kG shows up two ways',
      headingSize: 22,
      body: 'The carriage creeps down under its own weight, or overshoots the second you let go of manual control. Catch either one on a short move.',
      bodySize: 20,
    });

    K.addFooter(s, { pageNum: 35, label: LABEL });
    s.addNotes(
      'Everything in this lesson runs safely in the simulator, where a wrong gain costs nothing. On a real elevator, a wrong kG means a carriage that drifts or jumps, and you want to find that out on a slow, short move, with hands ready, before you ask for the full range.'
    );
  }

  // ============================================================ SLIDE 36 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.65, h: 2.5,
      cards: [
        { title: 'A fourth preset', body: 'Add kScoreLow below kScoreMid; bind it to a face button.', code: true },
        { title: 'Watch the sag', body: 'kElevatorKG = 0.0 in sim, hold kScoreMid: find the 1.6 mm.', code: true },
        { title: 'Ask for 3 meters', body: 'Bind goToHeight(Meters.of(3.0)). GoalMeters reads 1.5.', code: true },
        { title: 'Halve the limits', body: '0.5 m/s and 1.0 m/s²: the setpoint stretches, tracking doesn\'t.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 36, label: LABEL, dark: true });
    s.addNotes(
      '1: Give ElevatorConstants a kScoreLow between kStowed and kScoreMid, and bind it to a face button. 2: Temporarily set kElevatorKG to 0.0, command kScoreMid, let it settle, and compare HeightMeters against GoalMeters — you should see almost exactly the gap section 10 measured. Do this in the simulator only, and put 0.18 back when you\'re done. 3: Bind a spare button to elevator.goToHeight(Meters.of(3.0)) — well past kMaxHeight — and watch GoalMeters clamp to 1.5 instead of jumping to 3.0: clampToTravel doing its job before the request ever reaches the motor. 4: Try kMaxVelocity = 0.5 m/s and kMaxAcceleration = 1.0 m/s². The setpoint curve stretches out — same shape, twice the time — while the tracking of setpoint by height barely changes, since that\'s governed by kV, kA and kP, not by how fast the profile goes.'
    );
  }

  // ============================================================ SLIDE 37 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Staying put is a model, not a big kP' });

    const points = [
      'A P controller can only push by being wrong, so kP alone holds an elevator a little low, forever.',
      'A term for each physical effect: kG for gravity, kV for speed, kA for changing speed, kP for what\'s left.',
      'kG and kV came straight off the Kraken X60\'s spec sheet, walked through the gearbox.',
      'Motion Magic profiles the move, and its setpoint is the third number: goal, setpoint, position.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.85, fontFace: FONT_BODY, fontSize: 18, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 19', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Drawing the Elevator', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Watch it move, instead of reading three numbers.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 37, label: LABEL });
    s.addNotes(
      'An elevator\'s job is different from anything you\'d automated before: it has to stay, not just arrive. The fix wasn\'t a bigger kP. It was a term for each physical effect, with kP shrunk to what\'s left once the model has done its job. Motion Magic turned "go here" into a real trapezoidal profile, and handed you the setpoint — without it, a lagging elevator and a still-ramping one look identical on a graph. And the IO layer from Lesson 13 paid for itself again: three new IO files, but nothing about how Elevator is used differs from Drivetrain\'s shape. That repetition isn\'t an accident — it\'s the pattern this course keeps handing you because it keeps being the right one. Next: watching the elevator move as more than numbers on a graph — drawing it.'
    );
  }

  const outPath = path.join(__dirname, '..', '..', '18-elevator.pptx');
  return p.writeFile({ fileName: outPath }).then(() => {
    console.log('Wrote', outPath);
  });
}

buildDeck().catch((err) => {
  console.error(err);
  process.exit(1);
});
