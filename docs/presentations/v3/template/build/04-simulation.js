const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 4 — Simulation' });

  K.addTitleSlide(p, {
    tag: 'LESSON 4',
    title: 'Simulation',
    subtitle: 'Make the motor move on your laptop',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Give the sim motor a physics model' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'So the position and velocity plots from Lesson 3 actually respond to what you command — no real robot required.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.25 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Objects that model the real world', options: { bullet: true, breakLine: true } },
        { text: 'simulationPeriodic() — a sim-only tick', options: { bullet: true, breakLine: true } },
        { text: 'Composition — objects passed into objects', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('flask_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Why simulation matters', options: { bullet: true, breakLine: true } },
        { text: 'Phoenix 6 sim state — the bridge', options: { bullet: true, breakLine: true } },
        { text: 'DCMotorSim — a motor + load model', options: { bullet: true, breakLine: true } },
        { text: 'Why sim code lives on Robot', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Simulation' });
  }

  // ============================================================ SLIDE 3 — why simulate?
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 1 · Why simulate?', title: 'Nothing has mass until you tell it to' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 4.85, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Simulation is not a video game that comes with physics built in.', {
      x: 1.0, y: 2.0, w: 11.3, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('On a real robot, code that spins a motor produces motion because the universe handles the physics for free. In sim, nothing has mass or inertia unless you tell it to — that\'s why the plots sat flat at the end of Lesson 3. The sim motor isn\'t broken; it\'s sitting in a world with no physics yet.\n\nAn object that takes the voltage your code applies and computes how fast a real motor would spin fixes that — feed the motion back into the TalonFX, and getVelocity()/getPosition() report believable numbers.', {
      x: 1.0, y: 3.0, w: 11.3, h: 3.5, fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 3, label: 'Simulation', dark: true });
  }

  // ============================================================ SLIDE 4 — the sim bridge and the model
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 2 · DriveModule.java', title: 'Two objects do the work' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 4.2, fontSize: 15,
      lines: [
        { text: 'private final TalonFX m_driveMotor =', color: 'D7E3F4' },
        { text: '    new TalonFX(Constants.DriveConstants.kDriveMotorPort, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '// The bridge: lets us push fake sensor values into the TalonFX during sim.', color: '7FA8C9' },
        { text: 'private final TalonFXSimState m_driveSim = m_driveMotor.getSimState();', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '// The physics: one Kraken X60 motor spinning a small inertia.', color: '7FA8C9' },
        { text: 'private final DCMotorSim m_driveModel =', color: 'D7E3F4' },
        { text: '    new DCMotorSim(', color: 'D7E3F4' },
        { text: '        Models.singleJointedArmFromPhysicalConstants(DCMotor.getKrakenX60(1), 0.001, 1.0),', color: '9EF01A' },
        { text: '        DCMotor.getKrakenX60(1));', color: '9EF01A' },
      ],
    });

    K.addFooter(s, { pageNum: 4, label: 'Simulation' });
  }

  // ============================================================ SLIDE 5 — composition
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cube_white.png', eyebrow: 'Section 2 · Composition', title: 'Objects built from objects, handed one into the next' });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 5.85, h: 4.65, bg: CARDBG,
      heading: 'Field order is not cosmetic.',
      headingSize: 22,
      body: 'Fields initialize top to bottom. m_driveSim is built by asking the motor for its sim state, so the motor has to exist first — put it above and the compiler refuses outright.',
    });
    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      heading: 'Read it inside-out.',
      headingColor: WHITE, headingSize: 22,
      body: 'DCMotor describes the motor. Models.singleJointedArmFromPhysicalConstants(motor, inertia, gearing) builds the math. new DCMotorSim(...) wraps it into something you can step forward in time.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 5, label: 'Simulation' });
  }

  // ============================================================ SLIDE 6 — step the physics
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 3 · DriveModule.java', title: 'Four steps, once per tick, sim only' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 4.5, fontSize: 15,
      lines: [
        { text: 'public void simulatePeriodic() {', color: 'FFD166' },
        { text: '  // 1. Tell the sim the battery voltage available.', color: '7FA8C9' },
        { text: '  m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // 2. Read the voltage the TalonFX is applying.', color: '7FA8C9' },
        { text: '  double appliedVolts = m_driveSim.getMotorVoltage();', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // 3. Feed it into the model, advance time by one tick (20 ms).', color: '7FA8C9' },
        { text: '  m_driveModel.setInputVoltage(appliedVolts);', color: 'D7E3F4' },
        { text: '  m_driveModel.update(0.020);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // 4. Push the resulting motion BACK into the fake encoder.', color: '7FA8C9' },
        { text: '  m_driveSim.setRawRotorPosition(m_driveModel.getAngularPosition() / (2 * Math.PI));', color: '9EF01A' },
        { text: '  m_driveSim.setRotorVelocity(m_driveModel.getAngularVelocity() / (2 * Math.PI));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Simulation' });
  }

  // ============================================================ SLIDE 7 — the loop picture
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 3 · The picture to keep', title: 'Command out as voltage, motion back as sensor reads' });

    s.addShape('roundRect', { x: 0.7, y: 1.9, w: 11.9, h: 2.4, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('setThrottle(0.3)  →  TalonFX applies volts  →  getMotorVoltage()', {
      x: 1.0, y: 2.15, w: 11.3, h: 0.55, fontFace: 'Courier New', bold: true, fontSize: 20, color: '9EF01A', align: 'center', margin: 0,
    });
    s.addText('↑                                                                    ↓', {
      x: 1.0, y: 2.7, w: 11.3, h: 0.4, fontFace: 'Courier New', fontSize: 20, color: TEAL, align: 'center', margin: 0,
    });
    s.addText('setRawRotorPosition  ←  DCMotorSim computes motion (update)', {
      x: 1.0, y: 3.15, w: 11.3, h: 0.55, fontFace: 'Courier New', bold: true, fontSize: 20, color: '9EF01A', align: 'center', margin: 0,
    });

    s.addText('One unit note: DCMotorSim reports radians and radians/sec, but setRawRotorPosition and setRotorVelocity want rotations. Skip the ÷ 2π and your plots lie by a factor of about 6.3.', {
      x: 0.7, y: 4.6, w: 11.9, h: 1.9, fontFace: FONT_BODY, italic: true, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 7, label: 'Simulation', dark: true });
  }

  // ============================================================ SLIDE 8 — wire it into Robot
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'plug_white.png', eyebrow: 'Section 4 · Robot.java', title: 'A sim-only sibling of robotPeriodic()' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.0, fontSize: 20,
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void simulationPeriodic() {', color: 'D7E3F4' },
        { text: '  module.simulatePeriodic();', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 2.9,
      heading: 'Called on the same schedule as robotPeriodic() — except only in simulation.',
      headingSize: 22,
      body: 'On a real robot it never runs, so nothing inside it can ever leak onto the field. As more mechanisms arrive, this is where each one\'s simulatePeriodic() gets called from — one obvious place.',
    });

    K.addFooter(s, { pageNum: 8, label: 'Simulation' });
  }

  // ============================================================ SLIDE 9 — run it
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'play_white.png', eyebrow: 'Section 5 · Run it', title: 'The payoff Lesson 3 promised' });

    K.addNumberedSteps(s, {
      startY: 1.85, rowH: 1.3,
      steps: [
        { title: './gradlew simulateJava → My Teleop → Enabled', detail: 'Push the stick and watch the Lesson 3 plots.' },
        { title: 'Velocity ramps up, then back to zero', detail: 'Like a real motor accelerating.' },
        { title: 'Position climbs while driving, holds when stopped', detail: 'A robot you can develop against with no hardware on the bench.' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'Simulation' });
  }

  // ============================================================ SLIDE 10 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Change the inertia', body: 'From 0.001 to 0.05. Does velocity reach full speed faster or slower? Explain why.' },
        { title: 'Command a step input', body: 'Change driveAtSpeed(0.3) to 1.0 and watch the S-shaped velocity ramp.' },
        { title: 'Log applied volts', body: 'SmartDashboard.putNumber inside simulatePeriodic() — a sim-only logTelemetry().' },
      ],
    });

    K.addFooter(s, { pageNum: 10, label: 'Simulation', dark: true });
  }

  // ============================================================ SLIDE 11 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Simulation isn\'t magic — you model it' });

    const points = [
      'The sim state is the bridge; DCMotorSim is the physics; simulationPeriodic() is where you step it, one 20ms tick at a time.',
      'Composition: objects built from objects, and a field-order rule — the dependency comes first.',
      'The loop: command → voltage → model → fake encoder → your reads. Everything downstream can\'t tell sim from reality.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 12 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 5', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Steering with P Control', { x: 8.3, y: 3.1, w: 4.0, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    s.addText('Your first feedback controller — the single most important idea in robotics.', {
      x: 8.3, y: 4.1, w: 4.0, h: 1.4, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 11, label: 'Simulation' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '04-simulation.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
