const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 6 — Distance & Commands' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 6',
    title: 'Distance & Commands',
    subtitle: 'Drive an exact distance, then stop on your own',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'getPosition() gives rotor rotations, and "the rotor turned 47 times" means nothing to a driver — the question that matters is how far did the robot go. This lesson converts rotor turns into meters, then builds the course\'s first command that finishes on its own, rather than running until something else kills it.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'A command that finishes on its own' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.4, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Turn motor rotations into meters, then build a command that drives a set distance and stops — your first command that finishes.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.1, fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.25 }
    );

    const colY = 3.4;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Unit conversion with named constants', options: { bullet: true, breakLine: true } },
        { text: 'A coroutine body that runs out, not forever', options: { bullet: true, breakLine: true } },
        { text: 'Two endings: finished vs. canceled', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('ruler_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Gear ratio and wheel circumference', options: { bullet: true, breakLine: true } },
        { text: 'Resetting the encoder for a relative distance', options: { bullet: true, breakLine: true } },
        { text: "A command's finish condition", options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 3.1, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'Distance & Commands' });
    s.addNotes(
      'Two physical facts stand between the rotor and the floor. The gear ratio: the rotor doesn\'t turn the wheel directly, it turns a gearbox, and the gearbox trades speed for strength — on an SDS MK4 module at "L2" the ratio is 6.75:1, so the rotor spins 6.75 times for one wheel turn. The wheel circumference: one wheel turn rolls the robot exactly one circumference along the floor, π × diameter — a 4-inch (0.1016 m) wheel travels about 0.319 m per turn.'
    );
  }

  // ============================================================ SLIDE 3 — gear ratio + circumference constants
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'ruler_white.png', eyebrow: 'Section 1 · Constants.java', title: 'Two hardware facts become named constants' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 3.35, fontSize: 13,
      fileLabel: "Add to DriveConstants in Constants.java",
      lines: [
        { text: 'public static final class DriveConstants {', color: 'FFD166' },
        { text: '  public static final int kDriveMotorPort = 1;', color: '7FA8C9' },
        { text: '  // ...kSteerMotorPort, kCancoderPort stay...', color: '7FA8C9' },
        { text: '', color: 'D7E3F4' },
        { text: '  public static final double kDriveGearRatio = 6.75;        // rotor : wheel', color: '9EF01A' },
        { text: '  public static final double kWheelDiameterMeters = 0.1016; // 4 inch wheel', color: '9EF01A' },
        { text: '  public static final double kWheelCircumferenceMeters =', color: '9EF01A' },
        { text: '      Math.PI * kWheelDiameterMeters;                      // ≈ 0.319 m', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.3, w: 11.9, h: 1.7,
      body: 'kWheelCircumferenceMeters is computed from kWheelDiameterMeters — constants can be built from other constants, and letting Java multiply beats typing a rounded decimal.',
      pad: 0.2, bodySize: 20,
    });

    K.addFooter(s, { pageNum: 3, label: 'Distance & Commands' });
    s.addNotes(
      'Both numbers describe the hardware, which makes them constants, so they go in Constants.java alongside the CAN IDs from Lesson 5. Point out that kWheelCircumferenceMeters is computed from kWheelDiameterMeters, not typed in as a rounded decimal — constants can be built from other constants, and letting Java do the multiplication is both less error-prone and self-documenting about where the number comes from.'
    );
  }

  // ============================================================ SLIDE 4 — getDistanceMeters
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 1 · DriveModule.java', title: 'Rotor turns ÷ gear ratio × circumference = meters' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.6, fontSize: 15,
      fileLabel: 'Add to DriveModule, with your other public methods',
      lines: [
        { text: '/** How far this module\'s wheel has driven, in meters, since the last reset. */', color: '7FA8C9' },
        { text: 'public double getDistanceMeters() {', color: 'FFD166' },
        { text: '  double rotorRotations = m_driveMotor.getPosition().getValue().in(Rotations);', color: 'D7E3F4' },
        { text: '  double wheelRotations = rotorRotations / DriveConstants.kDriveGearRatio;', color: 'D7E3F4' },
        { text: '  return wheelRotations * DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.5, w: 11.9, h: 2.5,
      heading: 'Read it as a pipeline.',
      headingSize: 22,
      body: 'Rotor turns ÷ gear ratio = wheel turns; wheel turns × circumference = meters. Name the constants, and swapping modules next season means changing one line in Constants.java.',
    });

    K.addFooter(s, { pageNum: 4, label: 'Distance & Commands' });
    s.addNotes(
      'This is why the constants get names instead of 6.75 sprinkled through the code: when you swap modules next season, you change one line in Constants.java and everything downstream is correct. Once this compiles, log it from the same place the other readings have been logging since Lesson 3 (DriveModule/DistanceMeters) — now there\'s a live odometer on the dashboard.'
    );
  }

  // ============================================================ SLIDE 5 — line up the sim with real gearing
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 2 · DriveModule.java', title: 'The sim needs to learn the gearbox too' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.3, fontSize: 13,
      fileLabel: 'Replace the m_driveModel field in DriveModule',
      lines: [
        { text: 'private final DCMotorSim m_driveModel =', color: 'D7E3F4' },
        { text: '    new DCMotorSim(', color: 'D7E3F4' },
        { text: '        Models.singleJointedArmFromPhysicalConstants(', color: 'D7E3F4' },
        { text: '            DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),', color: '9EF01A' },
        { text: '        DCMotor.getKrakenX60(1));', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.2, w: 11.9, h: 2.8,
      heading: 'The encoder still lives on the rotor — gearbox or not.',
      headingSize: 21,
      body: 'DCMotorSim now reports wheel-side motion, so simulatePeriodic() has to multiply back by the gear ratio before writing the fake rotor encoder — on top of the radians-to-rotations fix from Lesson 4.',
    });

    K.addFooter(s, { pageNum: 5, label: 'Distance & Commands' });
    s.addNotes(
      'Back in Lesson 4 the sim was built with gearing = 1.0 — a rotor spinning against a tiny inertia, no gearbox. Now that a real 6.75:1 reduction exists in the distance math, the sim has to learn about it too, or "one wheel turn" in sim won\'t mean the same physical motion as on the real robot. Two things changed: inertia grew from 0.001 to 0.025 (kg·m² at the wheel) — a rotor pulling a wheel through a gearbox has more to move than a bare rotor, and 0.025 gives a visible ramp without dragging; and gearing is now kDriveGearRatio instead of 1.0. The subtlety worth slowing down for: because DCMotorSim now models a gearbox, getAngularPosition/getAngularVelocity report the wheel (output) motion, not the rotor — but the TalonFX\'s fake encoder still lives on the rotor, since the sensor is physically on the motor, gearbox or not. So simulatePeriodic() has to convert wheel-side back to rotor-side by multiplying by the ratio, on top of the radians-to-rotations conversion from Lesson 4 which still has to happen too. If sim distances ever come out off by a suspiciously round factor, this chain — a gear ratio applied twice, or not at all — is the classic cause.'
    );
  }

  // ============================================================ SLIDE 6 — commands that finish (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'flagcheckered_white.png', eyebrow: 'Section 3 · A new kind of command', title: 'Every command so far has run forever' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('driveAtSpeed, driveWithJoystick, steerToAngle', {
      x: 1.0, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('None of them ever finish. They park or loop forever, and run until something else kills them — a button release, a rival command.', {
      x: 1.0, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    s.addShape('roundRect', { x: 6.75, y: 1.85, w: 5.85, h: 4.55, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('"Drive exactly one meter" is different.', {
      x: 7.05, y: 2.1, w: 5.25, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('The command is the only thing that knows when the job is done — so it has to decide, for itself, when to end. Leave out coroutine.park() and once the body\'s last line runs, the command finishes right along with it.', {
      x: 7.05, y: 3.0, w: 5.25, h: 3.2, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });

    K.addFooter(s, { pageNum: 6, label: 'Distance & Commands', dark: true });
    s.addNotes(
      'Stop and notice something about every command written so far: none of them ever finishes. driveAtSpeed parks forever; driveWithJoystick and steerToAngle recompute every tick, forever. They run until something else kills them — a button release, a rival command. That was fine for "spin while I hold a button," but "drive exactly one meter" is a different kind of job: the command itself is the only thing that knows when the job is done, so it has to decide for itself when to end. The idea is smaller than it sounds: a coroutine body is just code, top to bottom, like any method. driveAtSpeed\'s body never ends because it calls coroutine.park(), which means "suspend here forever." Leave that call out, and once the body\'s last line runs, the coroutine is done — same as a method returning — and the command finishes right along with it.'
    );
  }

  // ============================================================ SLIDE 7 — driveDistance
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · DriveModule.java', title: 'Set up, work, wait for done, clean up' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.15, fontSize: 13,
      fileLabel: 'Add to DriveModule, with the other command factories',
      lines: [
        { text: '/** Drives forward \'meters\' at \'speed\', then stops. Finishes on its own. */', color: '7FA8C9' },
        { text: 'public Command driveDistance(double meters, double speed) {', color: 'FFD166' },
        { text: '  return run(coroutine -> {', color: 'D7E3F4' },
        { text: '        m_driveMotor.setPosition(0);                              // 1. zero it', color: 'D7E3F4' },
        { text: '        m_driveMotor.setThrottle(speed);                          // 2. drive...', color: 'D7E3F4' },
        { text: '        coroutine.waitUntil(() -> getDistanceMeters() >= meters); // 3. ...wait', color: '9EF01A' },
        { text: '        m_driveMotor.setThrottle(0);                              // 4. stop', color: 'D7E3F4' },
        { text: '      })', color: 'D7E3F4' },
        { text: '      .whenCanceled(() -> m_driveMotor.setThrottle(0))', color: '9EF01A' },
        { text: '      .named("Drive Distance");', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 7, label: 'Distance & Commands' });
    s.addNotes(
      'Read it top to bottom as four steps. 1: m_driveMotor.setPosition(0) tells the encoder "call right here zero," so getDistanceMeters() measures from the start of this command, not since boot. 2: setThrottle(speed) starts the wheel moving, once. 3: coroutine.waitUntil(condition) is new — it suspends the command right here, checking the condition every tick, and only lets execution continue once it\'s true; the condition is a lambda answering true or false, the same trick as Lesson 2\'s DoubleSupplier but yes/no instead of a number. 4: once waitUntil returns, the distance check is true, so the next line stops the motor — then the lambda has nothing left to do, falls off the end, and the coroutine (and command) is done. One method, four lines, and it sets up, works, waits for done, and cleans up — no separate decorators needed, because it\'s just code running in order. This is the shape students will write constantly from here on.'
    );
  }

  // ============================================================ SLIDE 8 — waitUntil explained
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 3 · What waitUntil does', title: 'Suspend here, checking every tick, until true' });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 5.85, h: 4.65, bg: CARDBG,
      eyebrow: 'coroutine.waitUntil(condition)',
      heading: 'Suspends the command right here.',
      headingSize: 21,
      body: 'The condition is a lambda that answers true or false, checked every tick — the same trick as Lesson 2\'s DoubleSupplier, but yes/no instead of a number. Once it\'s true, the next line runs.',
    });
    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      eyebrow: 'The whole shape',
      eyebrowColor: TEAL,
      heading: 'Set up, work, wait, clean up — one method, four lines.',
      headingColor: WHITE, headingSize: 21,
      body: '"Do this, then wait, then do that" is just Java\'s normal control flow now. No separate decorators needed — you\'ll write this shape constantly from here on.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 8, label: 'Distance & Commands' });
    s.addNotes(
      'Notice there\'s no new decorator here at all — run(...), .whenCanceled(...), .named(...) are all things already had from Lesson 1. What\'s new is entirely inside the lambda: a while-shaped wait (waitUntil) sitting between two motor commands, in a body that\'s allowed to just... end. That\'s the payoff of a coroutine body: "do this, then wait, then do that" IS Java\'s normal control flow, not something bolted on with chained decorators.'
    );
  }

  // ============================================================ SLIDE 9 — two endings
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'checkcircle_white.png', eyebrow: 'Section 3 · Two different endings', title: 'Finished and canceled are genuinely different events' });

    const cols = [
      ['Finished', 'The body ran to the end by itself. Line 4, setThrottle(0), already handled it.'],
      ['Canceled', 'Something else took the module away first — the body\'s own line 4 never gets to run. That\'s what .whenCanceled(...) is for.'],
    ];
    cols.forEach((c, i) => {
      const x = 0.7 + i * 6.05;
      s.addShape('roundRect', { x, y: 1.85, w: 5.85, h: 3.6, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
      s.addText(c[0], { x: x + 0.3, y: 2.15, w: 5.25, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
      s.addText(c[1], { x: x + 0.3, y: 2.85, w: 5.25, h: 2.5, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25 });
    });

    s.addText('Every earlier command only had one ending. driveDistance is the first with two doors the motor can sneak out of — miss either cleanup, and it keeps spinning.', {
      x: 0.7, y: 5.65, w: 11.9, h: 1.15, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 9, label: 'Distance & Commands', dark: true });
    s.addNotes(
      'Be precise here: .whenCanceled(() -> m_driveMotor.setThrottle(0)) does NOT fire when the coroutine body finishes on its own — only when something else interrupts this command before it gets there, the same button-swap situation Lesson 5 already used it for. Every earlier command in this course only had one of these endings — driveAtSpeed and steerToAngle never finish on their own, so .whenCanceled(...) was the only ending that ever happened, and it was enough by itself. driveDistance is the first command that can end either way, which is why it\'s also the first one that needs cleanup written twice: once for "got there," inline in the body, and once for "got interrupted," in .whenCanceled(...). Miss either one and the motor keeps spinning in exactly that scenario — Lesson 1\'s rule, still true, just now with two doors it can sneak out of.'
    );
  }

  // ============================================================ SLIDE 10 — bind and test
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'gamepad_white.png', eyebrow: 'Section 5 · MyTeleop.java', title: 'D-pad up: drive one meter, then stop' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.6, fontSize: 17,
      fileLabel: "Add to MyTeleop's constructor, with the rest of the wiring",
      lines: [
        { text: '// Tap D-pad up to drive forward exactly 1 meter, then stop on its own.', color: '7FA8C9' },
        { text: 'robot.driverController.dpadUp().onTrue(robot.module.driveDistance(1.0, 0.4));', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 3.65, w: 11.9, h: 3.15,
      heading: 'Run it, plot DriveModule/DistanceMeters, tap D-pad up.',
      headingSize: 22,
      body: 'The trace climbs to 1.0 and flattens as the command stops itself. Change the target to 2.0 and confirm it goes twice as far — a command that accomplishes a goal and reports done, exactly what autonomous routines are made of.',
    });

    K.addFooter(s, { pageNum: 10, label: 'Distance & Commands' });
    s.addNotes(
      'dpadUp() is a new button family worth naming: the D-pad reports its four directions separately, and dpadUp() fires on the up direction — handy once the face buttons fill up, which they have by this point in the course. Worth mentioning as an aside, since this deck doesn\'t give it its own slide: with steerToAngle from Lesson 5 (point the wheel) and driveDistance now (roll it forward), students have the two ingredients for turning the robot — steer to an angle, then drive an arc length, sequenced with .andThen(...) (e.g. steerToAngle(90).andThen(driveDistance(1.0, 0.4)).named("Turn And Drive")). Lesson 7 builds the real four-module version and Lesson 8 does the clean gyro version, but the two bricks already exist to experiment with now.'
    );
  }

  // ============================================================ SLIDE 11 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Reverse it', body: 'driveDistance(1.0, -0.4) never finishes — distance goes negative. Fix the wait condition with Math.abs on both sides.' },
        { title: 'Ease in with P control', body: 'Drive at kP × (meters − getDistanceMeters()) instead of a constant speed — the same pattern, a new quantity.' },
        { title: 'Watch both endings for real', body: 'Print after waitUntil returns, and print inside .whenCanceled(...). Confirm you only ever see one, never both.' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'Distance & Commands', dark: true });
    s.addNotes(
      'The reverse exercise is a genuine bug students should hit before being told the fix: driveDistance(1.0, -0.4) never finishes because getDistanceMeters() >= meters never becomes true — distance goes negative while meters stays positive. Wrapping both sides in Math.abs is the fix, and the point is explicitly "this is why you test edge cases," not just a syntax exercise. The ease-in exercise reuses Lesson 5\'s P control pattern on a new quantity — kP × (meters − getDistanceMeters()) — worth naming that this is the same control idea, just applied somewhere new. The watch-both-endings exercise is meant to be run for real, not just reasoned about: a print after waitUntil returns and a different print inside .whenCanceled(...), then tap D-pad up and let it finish, then tap again and interrupt it with a different button — exactly one print should appear each time, never both, confirming section 3\'s split by watching it happen.'
    );
  }

  // ============================================================ SLIDE 12 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Units you built, and a command that ends itself' });

    const points = [
      'Gear ratio and wheel circumference turn rotor rotations into meters; setPosition(0) rezeros the encoder for a relative distance.',
      'A coroutine body that runs out of lines finishes — no park(), no more code, done. coroutine.waitUntil(condition) is the shape.',
      'Finished and canceled are different events — driveDistance is the first command that needs cleanup written twice.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 7', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('Four Modules', { x: 8.3, y: 3.1, w: 4.0, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0 });
    s.addText('Turn one module into a real four-corner swerve chassis.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.7, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 12, label: 'Distance & Commands' });
    s.addNotes(
      'Two ideas carried this lesson. First: units are yours to build — gear ratio and wheel circumference turn rotor rotations into meters, setPosition(0) rezeros the encoder so distance means "since this command started," and named constants keep the conversion honest in one place. Second, and bigger: commands can finish, and in this framework that just means the coroutine body runs out of lines — no park(), no more code, done. The sharper edge underneath that: a command can end finished or canceled, they\'re genuinely different events, and only driveDistance has needed to handle both. That distinction is easy to miss and expensive to get wrong, so it\'s worth carrying forward deliberately. Lesson 7 turns the one module into four, and Lesson 9 strings finishing commands into a full autonomous routine. If the gearbox math felt dense, let the plot reassure you — when the trace stops at exactly 1.0 meters, every conversion in the chain earned its keep.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '06-distance-and-commands.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
