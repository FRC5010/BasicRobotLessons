const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

// Code-card colors, the same ones every deck in the series uses.
const COMMENT = '7FA8C9';
const NEW = '9EF01A';
const SIG = 'FFD166';
const PLAIN = 'D7E3F4';

const LABEL = 'Drawing the Elevator';

// The drawing's own colors: Color.ORANGE while moving, Color.LIME_GREEN once arrived.
const MOVING = 'FFA500';
const AT_GOAL = '32CD32';

/** A thin straight line from (x1, y1) to (x2, y2), in inches. */
function seg(s, x1, y1, x2, y2, color, width) {
  s.addShape('line', {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipV: (x2 - x1) * (y2 - y1) < 0,
    line: { color, width },
  });
}

/** The stick figure on a 1 m × 2 m canvas: base dot, carriage straight up, effector sideways off its top. */
function figure(s, { x, y, inPerM, heightM, color }) {
  const w = 1.0 * inPerM, h = 2.0 * inPerM;
  s.addShape('rect', { x, y, w, h, fill: { color: '0B1A33' }, line: { color: '3A5378', width: 1 } });
  const cx = x + w / 2, floor = y + h, top = floor - heightM * inPerM;
  if (heightM > 0) seg(s, cx, floor, cx, top, color, 6);
  seg(s, cx, top, cx + 0.25 * inPerM, top, 'B8C4D6', 4);
  s.addShape('ellipse', { x: cx - 0.09, y: floor - 0.09, w: 0.18, h: 0.18, fill: { color: WHITE }, line: { type: 'none' } });
  return { cx, floor, top };
}

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 19 — A Picture of the Elevator' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 19',
    title: 'Drawing the Elevator',
    subtitle: 'Attach one piece to another, and it rides along',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Lesson 18 ended with three traces on a graph, and they told you a lot about whether the control loop is behaving. They\'re the wrong tool for a different question: what is the robot doing right now? This lesson draws the elevator as a live stick figure that grows and shrinks as the carriage moves — and hangs a second piece off the top of it that follows along without a single line of code telling it to. That second part is the real lesson.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'pencil_white.png', eyebrow: 'The Goal', title: 'A live stick figure of the elevator' });

    s.addShape('roundRect', { x: 0.7, y: 1.6, w: 11.9, h: 1.75, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Draw the elevator as a live stick figure that grows and shrinks as the carriage moves, and hang a second piece off the top of it that follows along without a single line of code telling it to.',
      { x: 1.05, y: 1.73, w: 11.2, h: 1.5, fontFace: FONT_HEAD, italic: true, fontSize: 18, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Composition as attachment — append(...) builds a structure: move the parent and the child moves too, every tick', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('robot_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Mechanism2d — a canvas to draw a mechanism on', options: { bullet: true, breakLine: true } },
        { text: 'MechanismRoot2d — a point pinned to it', options: { bullet: true, breakLine: true } },
        { text: 'MechanismLigament2d — a segment with a length, an angle, a color', options: { bullet: true, breakLine: true } },
        { text: 'A drawing is logged like a number', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.7, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: LABEL });
    s.addNotes(
      'Every object you\'ve built out of other objects so far was assembled once and then stood still. append(...) builds a structure: attach a child to a parent, and from then on moving the parent moves the child too, every tick, for free. The robot side is three small classes — a canvas, a point pinned to it, and segments — plus one rule you already know from Lesson 11\'s field: change the drawing, then log it, every tick.'
    );
  }

  // ============================================================ SLIDE 3 — §1 numbers vs a shape
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'eye_white.png', eyebrow: 'Section 1 · Numbers vs. a shape', title: 'A graph and a picture answer different questions', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 5.8, h: 3.2, bg: NAVY2,
      eyebrow: 'A graph', eyebrowColor: TEAL,
      heading: 'Is the control loop behaving?',
      headingSize: 22, headingColor: WHITE,
      body: 'Lesson 18\'s three traces: the goal stepped, the height eased after it.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });
    K.addCard(s, {
      x: 6.8, y: 1.65, w: 5.8, h: 3.2, bg: NAVY2,
      eyebrow: 'A picture', eyebrowColor: ORANGE,
      heading: 'What is the robot doing right now?',
      headingSize: 22, headingColor: WHITE,
      body: 'Read 0.75 off a graph and you\'re drawing the carriage in your head.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addCard(s, {
      x: 0.7, y: 5.1, w: 11.9, h: 1.7, bg: NAVY2,
      heading: 'Mechanism2d is Lesson 11\'s Field2d move, for a mechanism',
      headingSize: 22, headingColor: WHITE,
      body: 'Side-on, not top-down: a stick figure shaped by your sensor values.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 3, label: LABEL, dark: true });
    s.addNotes(
      'To answer "what is the robot doing" from a graph, you have to read 0.75, remember that the elevator\'s range is 0 to 1.5 meters, and picture a carriage halfway up — doing the drawing in your head, fifty times a second, while also trying to debug something. You already met the fix in Lesson 11: odometry gave you an X, a Y and a heading, and instead of staring at three numbers you drew a robot on a field. By the end of this lesson you\'ll press D-pad up and watch a line grow.'
    );
  }

  // ============================================================ SLIDE 4 — §2 three pieces
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'layergroup_white.png', eyebrow: 'Section 2 · Three pieces', title: 'A canvas, an anchor, and segments', badgeColor: ORANGE });

    const cols = [
      { label: 'CANVAS', name: 'Mechanism2d', body: 'A window measured in meters. A coordinate space, not a picture — nothing is drawn yet.' },
      { label: 'ANCHOR', name: 'MechanismRoot2d', body: 'A fixed point on the canvas, from getRoot(...). The base of a real elevator never moves.' },
      { label: 'SEGMENT', name: 'MechanismLigament2d', body: 'A line with a length, an angle and a color, drawn from whatever it\'s attached to.' },
    ];
    cols.forEach((c, i) => {
      const x = 0.7 + i * 4.05;
      s.addShape('roundRect', { x, y: 1.65, w: 3.8, h: 3.9, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c.label, { x: x + 0.25, y: 1.85, w: 3.3, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1, margin: 0 });
      s.addText(c.name, { x: x + 0.25, y: 2.3, w: 3.4, h: 0.5, fontFace: FONT_HEAD, bold: true, fontSize: 20, color: WHITE, margin: 0 });
      s.addText(c.body, { x: x + 0.25, y: 2.95, w: 3.3, h: 2.4, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.8, w: 11.9, h: 1.0, bg: NAVY2,
      body: '"Drawn from whatever it\'s attached to" is the rest of this lesson.',
      bodyColor: 'D7E3F4', pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 4, label: LABEL, dark: true });
    s.addNotes(
      'A mechanism drawing is built from exactly three kinds of thing. The canvas is a Mechanism2d: you give it a width and a height in meters, and that\'s the window the viewer shows you. The anchor is a MechanismRoot2d, and you get one by asking the canvas for it with getRoot. Fixed is the whole idea — the base of a real elevator is bolted to the frame, so its dot never moves. The segments are MechanismLigament2ds: a length, an angle and a color, always drawn starting from whatever they\'re attached to. That last clause is doing more work than it looks like.'
    );
  }

  // ============================================================ SLIDE 5 — §2 the shape of the calls
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 2 · The three calls', title: 'Each piece comes from the one before it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.05, fontSize: 14, example: true,
      fileLabel: 'Nothing to add — this is only the shape of the three calls',
      lines: [
        { text: 'Mechanism2d canvas = new Mechanism2d(widthMeters, heightMeters);', color: PLAIN },
        { text: 'MechanismRoot2d anchor = canvas.getRoot("Name", x, y);', color: PLAIN },
        { text: 'MechanismLigament2d segment =', color: PLAIN },
        { text: '    anchor.append(new MechanismLigament2d("Name", lengthMeters, angleDegrees));', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.6, w: 11.9, h: 1.5,
      heading: 'Angles: counter-clockwise from pointing right',
      headingSize: 22,
      body: 'Straight up is 90° — the convention you\'ve held since Lesson 7.',
      pad: 0.2, bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 5.3, w: 11.9, h: 1.5,
      heading: 'All three take plain doubles, not measures',
      headingSize: 22,
      body: 'This corner of WPILib predates Units. Unpack with .in(Meters) right at the call.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: LABEL });
    s.addNotes(
      'The canvas hands you the anchor; the anchor hands you the segment. The constructors take plain doubles, which is a genuine exception to the "prefer measures" habit you\'ve built since Lesson 10 — this particular corner of WPILib predates the Units library and was never updated. So when you reach for ElevatorConstants.kDisplayWidth, a Distance, you\'ll unpack it with .in(Meters) right at the call site: the "unpack only at a genuine double-only boundary" rule you already know, at a boundary you haven\'t hit yet.'
    );
  }

  // ============================================================ SLIDE 6 — §3 Constants
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 3 · Constants.java', title: 'A canvas size, a stub length, two colors' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.1, fontSize: 13,
      fileLabel: 'Add to ElevatorConstants in Constants.java, below kTolerance',
      lines: [
        { text: '  public static final Distance kTolerance = Centimeters.of(2);', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  // The stick-figure view. The canvas is measured in meters, like the field.', color: COMMENT },
        { text: '  public static final Distance kDisplayWidth = Meters.of(1.0);', color: NEW },
        { text: '  public static final Distance kDisplayHeight = Meters.of(2.0);', color: NEW },
        { text: '  public static final Distance kEffectorLength = Centimeters.of(25);', color: NEW },
        { text: '  public static final Color8Bit kMovingColor = new Color8Bit(Color.ORANGE);', color: NEW },
        { text: '  public static final Color8Bit kAtGoalColor = new Color8Bit(Color.LIME_GREEN);', color: NEW },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.7, w: 11.9, h: 1.45, fontSize: 14,
      fileLabel: 'Add to Constants.java\'s imports, next to the measure types',
      lines: [
        { text: 'import org.wpilib.util.Color;', color: NEW },
        { text: 'import org.wpilib.util.Color8Bit;', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 6.3, w: 11.9, h: 0.6,
      body: '2 m tall for a 1.5 m elevator: headroom at the top.',
      pad: 0.1, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 6, label: LABEL });
    s.addNotes(
      'The picture needs a few numbers of its own: how big the canvas is, how long the piece on top of the carriage should be, and what colors mean. The canvas is 2 meters tall for a 1.5 meter elevator, which leaves the carriage some headroom at the top of the frame rather than letting it run off the edge.'
    );
  }

  // ============================================================ SLIDE 7 — §3 colors
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'palette_white.png', eyebrow: 'Section 3 · Two things about colors', title: 'Color.ORANGE, not Color.kOrange', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'This library class skips the k prefix',
      headingSize: 22, headingColor: WHITE,
      body: 'Every constant you write gets a k. Color\'s named colors are plain all-caps constants — worth knowing before the compiler says kOrange doesn\'t exist.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'Build the Color8Bits once',
      headingSize: 22, headingColor: WHITE,
      body: 'Color is a list of named colors; Color8Bit is the packed form a drawing wants. periodic() picks one fifty times a second — point at a constant.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });

    K.addFooter(s, { pageNum: 7, label: LABEL, dark: true });
    s.addNotes(
      'Wrapping a Color in a Color8Bit is the normal way to get from a name to a usable color. Building the two Color8Bits once, in Constants, matters slightly more than it looks: periodic() picks between them fifty times a second, and a constant it can point at beats a new object every tick.'
    );
  }

  // ============================================================ SLIDE 8 — §4 Elevator imports
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'pencil_white.png', eyebrow: 'Section 4 · Elevator.java', title: 'Three classes, from Field2d\'s package' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 1.75, fontSize: 14,
      fileLabel: 'Add to Elevator.java\'s imports',
      lines: [
        { text: 'import org.wpilib.smartdashboard.Mechanism2d;', color: NEW },
        { text: 'import org.wpilib.smartdashboard.MechanismLigament2d;', color: NEW },
        { text: 'import org.wpilib.smartdashboard.MechanismRoot2d;', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.4, w: 11.9, h: 1.7,
      heading: 'Same package as Lesson 11\'s Field2d',
      headingSize: 22,
      body: 'Not a coincidence: you\'re about to use these three the way you used Field2d.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 8, label: LABEL });
    s.addNotes(
      'org.wpilib.smartdashboard is where Field2d lives too. A field and a mechanism drawing are the same kind of thing: a widget that holds a picture, which you change and then log.'
    );
  }

  // ============================================================ SLIDE 9 — §4 the fields
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'pencil_white.png', eyebrow: 'Section 4 · Elevator.java', title: 'Build the figure: four fields' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 4.3, fontSize: 12,
      fileLabel: 'Add to Elevator, below m_goal',
      lines: [
        { text: '  private Distance m_goal = ElevatorConstants.kStowed;', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '  // The picture: a canvas, one point anchored to it, and a chain of segments.', color: COMMENT },
        { text: '  private final Mechanism2d m_mechanism = new Mechanism2d(', color: NEW },
        { text: '      ElevatorConstants.kDisplayWidth.in(Meters), ElevatorConstants.kDisplayHeight.in(Meters));', color: NEW },
        { text: '  private final MechanismRoot2d m_base = m_mechanism.getRoot(', color: NEW },
        { text: '      "Base", ElevatorConstants.kDisplayWidth.in(Meters) / 2, 0);', color: NEW },
        { text: '  /** Straight up from the base. Its length is the carriage height. */', color: COMMENT },
        { text: '  private final MechanismLigament2d m_carriage =', color: NEW },
        { text: '      m_base.append(new MechanismLigament2d("Carriage", 0, 90));', color: NEW },
        { text: '  /** Rides on top of the carriage. Lesson 20 puts a real arm here. */', color: COMMENT },
        { text: '  private final MechanismLigament2d m_effector = m_carriage.append(', color: NEW },
        { text: '      new MechanismLigament2d("Effector", ElevatorConstants.kEffectorLength.in(Meters), -90));', color: NEW },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.9, w: 11.9, h: 1.0,
      body: 'Fields, because the drawing has to survive between ticks.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 9, label: LABEL });
    s.addNotes(
      'These are fields, at the top of the class with the rest, for the reason fields always go there: the drawing has to survive between ticks. If you built it inside periodic() you\'d construct a brand-new canvas every 20 milliseconds and throw it away, and the picture would be reassembled from scratch forever instead of being a thing that changes.'
    );
  }

  // ============================================================ SLIDE 10 — §4 read it from the floor up
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'arrowsaltv_white.png', eyebrow: 'Section 4 · Reading the fields', title: 'Top to bottom in the code, floor up on the robot', badgeColor: ORANGE });

    s.addShape('roundRect', { x: 0.7, y: 1.65, w: 5.2, h: 5.15, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    const f = figure(s, { x: 1.0, y: 1.9, inPerM: 2.3, heightM: 1.2, color: MOVING });
    s.addText('m_effector', { x: f.cx + 0.75, y: f.top - 0.2, w: 2.3, h: 0.4, fontFace: K.FONT_CODE, bold: true, fontSize: 20, color: 'B8C4D6', margin: 0 });
    s.addText('m_carriage', { x: f.cx + 0.25, y: (f.top + f.floor) / 2 - 0.2, w: 2.3, h: 0.4, fontFace: K.FONT_CODE, bold: true, fontSize: 20, color: MOVING, margin: 0 });
    s.addText('m_base', { x: f.cx + 0.25, y: f.floor - 0.45, w: 2.0, h: 0.4, fontFace: K.FONT_CODE, bold: true, fontSize: 20, color: WHITE, margin: 0 });

    const rows = [
      { name: 'm_mechanism', text: 'The window: 1 m wide, 2 m tall.' },
      { name: 'm_base', text: 'Dead center, on the floor.' },
      { name: 'm_carriage', text: 'Straight up at 90°, length 0 to start.' },
      { name: 'm_effector', text: 'On the carriage, at −90°: sideways.' },
    ];
    rows.forEach((r, i) => {
      const y = 1.65 + i * 1.3;
      s.addShape('roundRect', { x: 6.2, y, w: 6.4, h: 1.15, rectRadius: 0.1, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(r.name, { x: 6.45, y: y + 0.12, w: 5.9, h: 0.4, fontFace: K.FONT_CODE, bold: true, fontSize: 20, color: TEAL, margin: 0 });
      s.addText(r.text, { x: 6.45, y: y + 0.57, w: 5.9, h: 0.45, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', margin: 0 });
    });

    K.addFooter(s, { pageNum: 10, label: LABEL, dark: true });
    s.addNotes(
      'Read the four declarations top to bottom and you\'re reading the robot from the floor up. The canvas is the window. m_base sits at the horizontal middle — kDisplayWidth / 2 — and at height 0: on the floor, dead center. m_carriage attaches to the base and points straight up at 90°, and it starts at length zero because the elevator starts stowed. m_effector attaches to the carriage and points at −90°, which is 90° back from its parent, so it sticks out sideways from the top of the carriage. The figure here is drawn mid-move, carriage about 1.2 m up.'
    );
  }

  // ============================================================ SLIDE 11 — §4 two details
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'link_white.png', eyebrow: 'Section 4 · Two details', title: 'append hands back the child, angles are relative', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'append hands you back what you appended',
      headingSize: 22, headingColor: WHITE,
      body: 'Construct the ligament, hand it to its parent, keep a reference to move it later — one statement, no temporary variable.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 2.45, bg: NAVY2,
      heading: 'A child\'s angle is measured from its parent',
      headingSize: 22, headingColor: WHITE,
      body: '−90° means 90° clockwise from the carriage, which points up — so the effector points right. Lesson 15\'s camera Transform3d was the same idea.',
      bodyColor: 'D7E3F4', bodySize: 20,
    });

    K.addFooter(s, { pageNum: 11, label: LABEL, dark: true });
    s.addNotes(
      'That\'s why m_carriage = m_base.append(new MechanismLigament2d(...)) works as one statement: you construct the ligament, hand it to its parent, and get a reference to it in return. And the effector\'s −90° doesn\'t mean "pointing down." It means "90° clockwise from whatever direction the carriage is pointing." This is the same idea as Lesson 15\'s Transform3d for the cameras — an offset measured relative to the thing it\'s mounted on, not to the field — arriving in a new place.'
    );
  }

  // ============================================================ SLIDE 12 — §5 periodic
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 5 · Elevator.java', title: 'Move it, then log it — every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 3.85, fontSize: 12,
      fileLabel: 'Update periodic() — add this after the existing telemetry calls',
      lines: [
        { text: '    // ...', color: COMMENT },
        { text: '    Telemetry.log("Elevator/GoalMeters", m_goal.in(Meters));', color: PLAIN },
        { text: '', color: PLAIN },
        { text: '    // The picture is built once and changed every tick; only the carriage', color: COMMENT },
        { text: '    // changes, and the effector rides along with it for free. Then log it,', color: COMMENT },
        { text: '    // like every number above: the log is a snapshot of the drawing right now.', color: COMMENT },
        { text: '    m_carriage.setLength(m_inputs.heightMeters);', color: NEW },
        { text: '    m_carriage.setColor(', color: NEW },
        { text: '        atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);', color: NEW },
        { text: '    Telemetry.log("Elevator/Mechanism", m_mechanism);', color: NEW },
        { text: '  }', color: PLAIN },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.45, w: 11.9, h: 1.4,
      body: 'setColor carries information: orange while it travels, green the moment it settles. atGoal() was already computed.',
      pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 12, label: LABEL });
    s.addNotes(
      'The drawing changes every tick, and it gets logged every tick — the same order as Lesson 11\'s field: change it, then log it. setColor is the other new call, and it\'s carrying information rather than decoration: atGoal() is already computed, so feeding it into the color costs nothing and turns the drawing into a status light. The constructor doesn\'t change at all.'
    );
  }

  // ============================================================ SLIDE 13 — §5 a snapshot
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'camera_white.png', eyebrow: 'Section 5 · Logged like a number', title: 'Telemetry.log sends what it looks like right now', badgeColor: ORANGE });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 5.8, h: 3.6, bg: NAVY2,
      eyebrow: 'Logged every tick', eyebrowColor: TEAL,
      heading: 'The viewer follows the carriage',
      headingSize: 22, headingColor: WHITE,
      body: 'Change it, then log it, right after — like every number above.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });
    K.addCard(s, {
      x: 6.8, y: 1.65, w: 5.8, h: 3.6, bg: NAVY2,
      eyebrow: 'Logged once', eyebrowColor: ORANGE,
      heading: 'Frozen at zero, forever',
      headingSize: 22, headingColor: WHITE,
      body: 'Log it only in the constructor and the viewer keeps that first snapshot.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addCard(s, {
      x: 0.7, y: 5.5, w: 11.9, h: 1.3, bg: NAVY2,
      body: 'The same rule Lesson 11\'s field follows. A drawing is logged like a number.',
      bodyColor: 'D7E3F4', pad: 0.25, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 13, label: LABEL, dark: true });
    s.addNotes(
      'Telemetry.log treats the drawing exactly the way it treats Lesson 11\'s field: it sends what the drawing looks like at that moment. Log it once, in the constructor, and the viewer would show a carriage frozen at zero forever. So it goes in periodic(), right after the two lines that change it. Try It #4 has you make exactly that mistake on purpose, once.'
    );
  }

  // ============================================================ SLIDE 14 — §6 the payoff, drawn
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'link_white.png', eyebrow: 'Section 6 · The payoff', title: 'One length changed. Two things moved.', badgeColor: ORANGE });

    const states = [
      { heightM: 0.2, title: 'Carriage at 0.20 m', note: 'The effector sits at its top.' },
      { heightM: 0.75, title: 'Carriage at 0.75 m', note: 'The effector is 55 cm higher. No code moved it.' },
    ];
    states.forEach((st, i) => {
      const x = 0.7 + i * 6.1;
      s.addShape('roundRect', { x, y: 1.65, w: 5.8, h: 3.95, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      figure(s, { x: x + 0.4, y: 1.95, inPerM: 1.65, heightM: st.heightM, color: MOVING });
      s.addText(st.title, { x: x + 2.4, y: 2.0, w: 3.15, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0 });
      s.addText(st.note, { x: x + 2.4, y: 3.0, w: 3.15, h: 2.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    });

    K.addCard(s, {
      x: 0.7, y: 5.85, w: 11.9, h: 0.95, bg: NAVY2,
      body: 'Drawing a child always starts from wherever its parent ended.',
      bodyColor: 'D7E3F4', pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 14, label: LABEL, dark: true });
    s.addNotes(
      'Here\'s the thing to notice, and it\'s the actual reason this lesson exists. Count the ligaments you update in periodic(): one. There are two ligaments in the picture. When the carriage grows from 0.2 m to 0.75 m, the effector on top of it slides up 55 centimeters — and no line of code moved it. It moved because it\'s attached.'
    );
  }

  // ============================================================ SLIDE 15 — §6 assembly vs structure
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'sitemap_white.png', eyebrow: 'Section 6 · Assembly vs. structure', title: 'A chain the drawing walks every tick' });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 5.8, h: 3.0,
      eyebrow: 'Assembly',
      heading: 'SwerveModule holds two motors',
      headingSize: 22,
      body: 'Done the moment its constructor finishes.',
      pad: 0.25, bodySize: 20,
    });
    K.addCard(s, {
      x: 6.8, y: 1.65, w: 5.8, h: 3.0,
      eyebrow: 'Structure',
      heading: 'base → carriage → effector',
      headingSize: 22,
      body: 'Change one link and everything downstream follows.',
      pad: 0.25, bodySize: 20,
    });

    s.addShape('roundRect', { x: 0.7, y: 4.9, w: 11.9, h: 1.9, rectRadius: 0.1, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText(
      [
        { text: 'm_effector has no motor behind it, and you won\'t touch it again. ', options: { color: WHITE } },
        { text: 'That is the point: Lesson 20 puts a real arm there, and the two lines that move the carriage don\'t change.', options: { bold: true, color: ORANGE } },
      ],
      { x: 1.0, y: 5.05, w: 11.3, h: 1.6, fontFace: FONT_HEAD, fontSize: 21, valign: 'middle', margin: 0, lineSpacingMultiple: 1.15 }
    );

    K.addFooter(s, { pageNum: 15, label: LABEL });
    s.addNotes(
      'SwerveModule holds two motors; that\'s assembly, and it\'s done the moment the constructor finishes. m_base → m_carriage → m_effector is a chain, and every tick the drawing walks it: place the base, draw the carriage from there, draw the effector from wherever the carriage ended up. Scale that up — an arm on top of an elevator, a wrist on the arm, a roller on the wrist. Raise the elevator and all three come with it. You update one number. In Lesson 20 a real arm takes m_effector\'s place, with its own motor, its own angle and its own mechanism.'
    );
  }

  // ============================================================ SLIDE 16 — §7 run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 7 · Watch it', title: 'Press D-pad up and watch a line grow' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.15,
      steps: [
        { title: './gradlew simulateJava, then Teleoperated', detail: 'The D-pad presets from Lesson 18 still drive it.' },
        { title: 'AdvantageScope: add a Mechanism tab', detail: 'Source: /Telemetry/Elevator/Mechanism.' },
        { title: 'Press D-pad up', detail: 'An orange line grows from the floor, a short stub riding at its top.' },
        { title: 'Wait for it to settle', detail: 'The line turns green. Down shrinks it; right stops it halfway.' },
      ],
    });

    K.addFooter(s, { pageNum: 16, label: LABEL });
    s.addNotes(
      'In AdvantageScope, add a Mechanism tab and select /Telemetry/Elevator/Mechanism as its source. You get a vertical orange line that grows out of the floor when you press D-pad up, with a short stub sticking out sideways at the top, riding along. When the carriage settles on the goal, the line turns green. Press D-pad down and it shrinks back toward the floor; press right and it stops halfway. The picture is Elevator/HeightMeters — the same number as the graph, drawn instead of printed.'
    );
  }

  // ============================================================ SLIDE 17 — §7 two viewers, one event
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'eye_white.png', eyebrow: 'Section 7 · Read one from the other', title: 'The graph and the picture are one event' });

    K.addCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 2.3,
      heading: 'Put the Mechanism tab and the HeightMeters graph side by side',
      headingSize: 22,
      body: 'Press a preset. The trace easing toward the goal and the line growing are the same event.',
      pad: 0.3, bodySize: 20,
    });
    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.6,
      heading: 'Or glance at it inside SimGUI',
      headingSize: 22,
      body: 'NetworkTables → Telemetry → Elevator → Mechanism. The quick look while sim is open; AdvantageScope for anything careful — same as Lesson 11\'s field.',
      pad: 0.3, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 17, label: LABEL });
    s.addNotes(
      'Seeing the trace and the line together is how you build the instinct to read one from the other. SimGUI shows the same drawing without opening a second tool: menu NetworkTables → Telemetry → Elevator → Mechanism. Two viewers, like the field view in Lesson 11 — the quick glance while sim is already open, and the full tool for anything careful.'
    );
  }

  // ============================================================ SLIDE 18 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.65, h: 2.5,
      cards: [
        { title: 'Color by height', body: 'One color below kScoreMid, another above: an if, one constant.', code: true },
        { title: 'A travel ruler', body: 'A second root and one fixed 1.5 m gray ligament beside the carriage.', code: true },
        { title: 'Wiggle the stub', body: 'm_effector.setAngle(45 * Math.sin(Timer.getTimestamp())).', code: true },
        { title: 'Freeze the drawing', body: 'Log it once, in the constructor. Watch the graph keep moving.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 18, label: LABEL, dark: true });
    s.addNotes(
      '1: Instead of green-when-arrived, color the carriage by where it is — one color below kScoreMid, another above. An if in periodic() and one more constant; nothing you haven\'t done since Lesson 5. 2: Ask the canvas for a second root a little to the side of m_base, and append one fixed ligament, 1.5 meters long, straight up, in gray — two lines in the field block, zero in periodic(). MechanismLigament2d has a five-argument form that also takes a line weight and a Color8Bit. 3: In periodic(), call m_effector.setAngle(45 * Math.sin(Timer.getTimestamp())) — Timer is org.wpilib.system.Timer. The stub waves while the carriage does whatever the D-pad says: its angle is its own, its position is the carriage\'s business. Take it back out afterwards; Lesson 20 wants that ligament. 4: Move the Telemetry.log("Elevator/Mechanism", ...) line into the constructor, so it runs once. The drawing freezes where it started while the graph keeps moving — a bug worth having seen once, since the same mistake would freeze Lesson 11\'s field.'
    );
  }

  // ============================================================ SLIDE 19 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Attach it once, and it keeps paying out' });

    const points = [
      'The idea isn\'t Mechanism2d — it\'s what append does: a relationship that holds every tick, forever.',
      'A canvas, an anchor and segments; a child\'s angle is measured from its parent.',
      'You changed one number and two things moved.',
      'A drawing is logged like a number: change it, then log it, every tick.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.85, fontFace: FONT_BODY, fontSize: 18, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 20', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Intake Arm', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('The stub on top of the carriage stops being a placeholder.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 19, label: LABEL });
    s.addNotes(
      'This was a short lesson with one idea in it, so make sure it\'s the one you take away. It isn\'t Mechanism2d — that\'s three classes and a handful of method calls, and you\'ll look up the exact names when you need them. It\'s what append does. Up to now, building an object out of other objects meant assembling something once. The chain m_base → m_carriage → m_effector sets up a relationship that keeps paying out: every tick, the effector\'s position is computed from the carriage\'s, and nothing has to remember to do it. That shape shows up everywhere in robot code once you know it — coordinate frames, transforms, pose composition. Lesson 15 already had you doing it with Transform3ds for the cameras without naming it.'
    );
  }

  const outPath = path.join(__dirname, '..', '..', '19-mechanism2d.pptx');
  return p.writeFile({ fileName: outPath }).then(() => {
    console.log('Wrote', outPath);
  });
}

buildDeck().catch((err) => {
  console.error(err);
  process.exit(1);
});
