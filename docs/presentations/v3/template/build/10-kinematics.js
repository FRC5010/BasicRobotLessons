const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 10 — Full Swerve with Kinematics' });

  K.addTitleSlide(p, {
    tag: 'LESSON 10',
    title: 'Full Swerve with Kinematics',
    subtitle: 'Translate and rotate at the same time',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'One drive command that mixes translation and spin' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.55, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Replace the hand-rolled translate and rotate with SwerveDriveKinematics — full swerve, plus always steering the shortest path.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.25, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.55;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Immutable data-carrier objects', options: { bullet: true, breakLine: true } },
        { text: 'Indexed for loops, for pairing two arrays', options: { bullet: true, breakLine: true } },
        { text: 'MathUtil.inputModulus — the wrap loop, graduated', options: { bullet: true, breakLine: true } },
        { text: 'Scaling a typed measure by a fraction', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('calculator_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'SwerveDriveKinematics', options: { bullet: true, breakLine: true } },
        { text: 'ChassisVelocities and SwerveModuleVelocity', options: { bullet: true, breakLine: true } },
        { text: 'Speed desaturation and state optimization', options: { bullet: true, breakLine: true } },
        { text: 'Field-relative driving, using the gyro', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.9, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 3 — why kinematics (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 1 · Why kinematics?', title: 'Neither command does both at once' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('translate and rotate both require the Drivetrain.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('So scheduling one cancels the other. Real swerve robots drive and spin constantly — sweeping around a defender while a shooter stays pointed at the goal. At each corner, add the translation velocity vector to the rotation velocity vector, and you get motion that does both.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addText('SwerveDriveKinematics packages that math so you never re-derive it: give it a ChassisVelocities, it hands back four SwerveModuleVelocitys.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'Full Swerve', dark: true });
  }

  // ============================================================ SLIDE 4 — kinematics object + max speed
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'calculator_white.png', eyebrow: 'Section 2 · Drivetrain.java & Constants.java', title: 'Built from the modules\' locations' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 2.4, fontSize: 14,
      fileLabel: 'Add to Drivetrain, directly below the m_modules field',
      lines: [
        { text: 'private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(', color: 'D7E3F4' },
        { text: '    m_modules[0].location, m_modules[1].location,', color: '9EF01A' },
        { text: '    m_modules[2].location, m_modules[3].location); // FL, FR, BL, BR', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.1, w: 11.9, h: 2.0, fontSize: 14,
      fileLabel: 'Add to DriveConstants',
      lines: [
        { text: 'public static final LinearVelocity kMaxSpeed =', color: 'D7E3F4' },
        { text: '    MetersPerSecond.of(100.0 / kDriveGearRatio * kWheelCircumferenceMeters); // ≈4.7 m/s', color: '9EF01A' },
        { text: 'public static final AngularVelocity kMaxAngularSpeed = RotationsPerSecond.of(1.0);', color: '9EF01A' },
      ],
    });

    K.addFooter(s, { pageNum: 4, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 5 — setDesiredState speaks m/s
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · SwerveModule.java', title: 'One state in, chase it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.4, fontSize: 13,
      fileLabel: 'Replace the two-argument setDesiredState with',
      lines: [
        { text: '/** One tick of control: chase the given state. */', color: '7FA8C9' },
        { text: 'public void setDesiredState(SwerveModuleVelocity state) {', color: 'FFD166' },
        { text: '  double error = MathUtil.inputModulus(', color: 'D7E3F4' },
        { text: '      state.angle.getDegrees() - getSteerAngleDegrees(), -180, 180);', color: '9EF01A' },
        { text: '  double steerOutput = clamp(SteerConstants.kP * error, -1.0, 1.0);', color: 'D7E3F4' },
        { text: '  m_steerMotor.setThrottle(steerOutput);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  double alignment = Math.cos(Math.toRadians(error));', color: 'D7E3F4' },
        { text: '  double fraction = state.velocity / DriveConstants.kMaxSpeed.in(MetersPerSecond);', color: '9EF01A' },
        { text: '  m_driveMotor.setThrottle(fraction * alignment);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.15, w: 11.9, h: 1.65,
      body: 'The two while loops from Lesson 5 collapse into MathUtil.inputModulus(value, -180, 180) — the one-liner, now that you\'ve built the hand-rolled version and know what it does.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 5, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 6 — applyChassisSpeeds
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Convert, desaturate, optimize, command' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 5.3, fontSize: 12,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: '/** One tick of chassis motion: convert, desaturate, optimize, command. */', color: '7FA8C9' },
        { text: 'private void applyChassisSpeeds(ChassisVelocities speeds) {', color: 'FFD166' },
        { text: '  SwerveModuleVelocity[] states = m_kinematics.toSwerveModuleVelocities(speeds);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Scale ALL wheels down together if any one would exceed the max.', color: '7FA8C9' },
        { text: '  states = SwerveDriveKinematics.desaturateWheelVelocities(states, DriveConstants.kMaxSpeed);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  m_lastCommandedOmega = speeds.omega / (2 * Math.PI); // rev/s for sim', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  for (int i = 0; i < m_modules.length; i++) {', color: 'FFD166' },
        { text: '    states[i] = states[i].optimize(', color: '9EF01A' },
        { text: '        Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));', color: '9EF01A' },
        { text: '    m_modules[i].setDesiredState(states[i]);', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  m_desiredModuleStatesPublisher.set(states);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 7 — drive() + commandRotation
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 4 · Drivetrain.java', title: 'Every path funnels through one helper' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 2.0, fontSize: 13,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: 'public Command drive(', color: 'FFD166' },
        { text: '    Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {', color: 'D7E3F4' },
        { text: '  return runRepeatedly(() -> applyChassisSpeeds(', color: 'D7E3F4' },
        { text: '      new ChassisVelocities(vx.get(), vy.get(), omega.get()))).named("Drive");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.85, w: 11.9, h: 1.55, fontSize: 14,
      fileLabel: 'Replace commandRotation in Drivetrain',
      lines: [
        { text: 'private void commandRotation(double omegaRevPerSec) {', color: 'FFD166' },
        { text: '  applyChassisSpeeds(new ChassisVelocities(0, 0, omegaRevPerSec * 2 * Math.PI));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.65, w: 11.9, h: 1.3,
      body: 'delete translate and rotate — kinematics subsumes both. turnToHeading keeps working without a single edit, because commandRotation still exists underneath it.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 7, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 8 — optimize (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 5 · Optimize', title: 'Steer the short way, every time' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('Wheel at 10°, told to go to 190°.', { x: 1.0, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('It\'s much faster to steer to 10° and drive at -2 m/s than to physically turn 180°. optimize picks the shorter steering move, flipping the drive sign if needed.', {
      x: 1.0, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('It returns a new value — nothing changes in place.', { x: 7.05, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2 });
    s.addText('states[i].optimize(...) alone does nothing — the loop must read states[i] = states[i].optimize(...). Throw away the result and the module gets commanded un-optimized, silently.', {
      x: 7.05, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 8, label: 'Full Swerve', dark: true });
  }

  // ============================================================ SLIDE 9 — wire up joysticks
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 6 · RobotTeleop.java', title: 'Left stick translates, right stick rotates' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.5, fontSize: 13,
      fileLabel: "Delete the old bindings, add to RobotTeleop's constructor",
      lines: [
        { text: 'robot.drivetrain.setDefaultCommand(robot.drivetrain.drive(', color: 'D7E3F4' },
        { text: '    () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftY()),', color: '9EF01A' },
        { text: '    () -> DriveConstants.kMaxSpeed.times(-robot.driverController.getLeftX()),', color: '9EF01A' },
        { text: '    () -> DriveConstants.kMaxAngularSpeed.times(-robot.driverController.getRightX())));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.35, w: 11.9, h: 2.55,
      heading: 'kMaxSpeed.times(fraction) scales the measure, stays a LinearVelocity.',
      headingSize: 22,
      body: 'No maxMps local, no .in(...) — the unit rides all the way from the constant into ChassisVelocities. No boundary to convert at until Phoenix\'s setThrottle, deep inside setDesiredState.',
    });

    K.addFooter(s, { pageNum: 9, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 10 — field-relative
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 7 · Drivetrain.java', title: 'Forward always means away from the driver' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.1, fontSize: 13,
      fileLabel: 'Add to Drivetrain',
      lines: [
        { text: 'public Command driveFieldRelative(', color: 'FFD166' },
        { text: '    Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {', color: 'D7E3F4' },
        { text: '  return runRepeatedly(() -> {', color: 'D7E3F4' },
        { text: '    ChassisVelocities fieldSpeeds = new ChassisVelocities(vx.get(), vy.get(), omega.get());', color: 'D7E3F4' },
        { text: '    Rotation2d heading = Rotation2d.fromDegrees(getHeadingDegrees());', color: 'D7E3F4' },
        { text: '    applyChassisSpeeds(fieldSpeeds.toRobotRelative(heading));', color: '9EF01A' },
        { text: '  }).named("Drive Field Relative");', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.8, w: 11.9, h: 2.1,
      body: 'toRobotRelative(...) rotates the field-frame velocity into the robot\'s frame using the current heading — the gyro from Lesson 8 quietly becoming load-bearing. Swap drive for driveFieldRelative in setDefaultCommand and you\'re done.',
      pad: 0.15, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 10, label: 'Full Swerve' });
  }

  // ============================================================ SLIDE 11 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Watch a wheel optimize', body: 'Drive slow forward, then abruptly reverse. The wheel should flip drive sign, not spin 180°.' },
        { title: 'Spin-while-driving auto', body: 'drivetrain.drive(...) forward at 1 m/s while spinning half a turn per second, for 2 seconds.' },
        { title: 'Slow-mode multiplier', body: 'While a bumper is held, multiply the three suppliers\' outputs by 0.25 for fine control.' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'Full Swerve', dark: true });
  }

  // ============================================================ SLIDE 12 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'A translation exercise, in the end' });

    const points = [
      'ChassisVelocities says what you want; SwerveDriveKinematics translates it into per-wheel SwerveModuleVelocitys.',
      'desaturateWheelVelocities preserves the motion\'s shape when you overask; optimize trades a pirouette for a sign flip.',
      'Because every path funnels through applyChassisSpeeds, field-relative driving cost one line.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 11', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Odometry & Field View', { x: 8.3, y: 3.1, w: 4.0, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    s.addText('The robot can move any way you ask — now it learns where it is.', {
      x: 8.3, y: 4.1, w: 4.0, h: 1.4, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 12, label: 'Full Swerve' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '10-kinematics.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
