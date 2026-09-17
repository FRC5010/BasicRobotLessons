const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Lesson 13 — IO Layers' });

  const titleSlide = K.addTitleSlide(p, {
    tag: 'LESSON 13',
    title: 'IO Layers',
    subtitle: 'Hardware behind an interface',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });
  titleSlide.addNotes(
    'Since Lesson 4, SwerveModule has done two jobs at once: it is the hardware, and it is the logic deciding what to command it to do. This lesson draws a hard line between them — one interface describing every sensor reading and every command a module can perform, one implementation class per world behind it. It is also the exact shape a future lesson needs to record a whole match and play it back, including a third mode, REPLAY, that exists in the code today with nothing behind it.'
  );

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'Hardware behind one clearly-named door' });

    s.addShape('roundRect', { x: 0.7, y: 1.75, w: 11.9, h: 1.85, rectRadius: 0.1, fill: { color: CARDBG }, line: { type: 'none' } });
    s.addText(
      'Restructure the drivetrain so every sensor reading enters through a ModuleIO and a GyroIO — real hardware and sim behind separate classes, chosen by a Constants.Mode switch. SwerveModule and Drivetrain stop touching hardware entirely.',
      { x: 1.05, y: 1.9, w: 11.2, h: 1.6, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: INK, valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }
    );

    const colY = 3.75;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('code_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW JAVA CONCEPTS', { x: 1.35, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Interfaces and default methods', options: { bullet: true, breakLine: true } },
        { text: 'Anonymous classes', options: { bullet: true, breakLine: true } },
        { text: 'Enums, and switch expressions', options: { bullet: true, breakLine: true } },
        { text: 'Subclassing your own class: extends, protected, super', options: { bullet: true, breakLine: false } },
      ],
      { x: 0.75, y: colY + 0.62, w: 5.75, h: 2.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('dooropen_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('NEW ROBOT CONCEPTS', { x: 7.55, y: colY + 0.03, w: 5, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0 });
    s.addText(
      [
        { text: 'Inputs vs. outputs', options: { bullet: true, breakLine: true } },
        { text: 'The IO layer — hardware behind an interface', options: { bullet: true, breakLine: true } },
        { text: 'A dormant third mode, waiting for a future lesson', options: { bullet: true, breakLine: false } },
      ],
      { x: 6.95, y: colY + 0.62, w: 5.75, h: 2.6, fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1 }
    );

    K.addFooter(s, { pageNum: 2, label: 'IO Layers' });
    s.addNotes(
      'If hardware only ever enters your code through one door per sensor, that door is the only place anything would ever need to intercept a reading — to log it, to fake it for a test, or, down the road, to hand it a value read back out of a recorded match instead of a live sensor. That last one is the biggest idea in the professional version of this course.'
    );
  }

  // ============================================================ SLIDE 3 — hardware behind a door (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'dooropen_white.png', eyebrow: 'Section 1 · The idea', title: 'One door per sensor, one class per world' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('SwerveModule has done two jobs at once since Lesson 4.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.6, fontFace: FONT_HEAD, bold: true, fontSize: 24, color: ORANGE, margin: 0,
    });
    s.addText('It IS the hardware — it owns the TalonFXs and the CANcoder — and it\'s also the logic that decides what to command them to do. Every sensor reading could, in principle, come from a real motor, a physics model, or a recorded log, and nothing in the code says so.', {
      x: 1.0, y: 2.8, w: 11.3, h: 1.9, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('One interface describes every reading and command. One implementation class per world sits behind it. SwerveModule owns an interface reference, with no idea — and no need to know — which world is on the other end.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 3, label: 'IO Layers', dark: true });
    s.addNotes(
      'This lesson draws a hard line instead. Here\'s why that\'s worth the ceremony, beyond tidiness: if hardware only ever enters your code through one door per sensor, that door is the only place anything would ever need to intercept a reading. You\'ll see the empty doorway by the end of this lesson: a mode called REPLAY, sitting in your code, with nothing behind it yet.'
    );
  }

  // ============================================================ SLIDE 4 — ModuleIO.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'puzzlepiece_white.png', eyebrow: 'Section 2 · A new file', title: 'ModuleIO — one read, three writes, no bodies' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Create src/main/java/first/robot/subsystems/ModuleIO.java — the whole file',
      lines: [
        { text: 'package first.robot.subsystems;', color: '7FD1D9' },
        { text: '', color: 'D7E3F4' },
        { text: 'public interface ModuleIO {', color: 'FFD166' },
        { text: '  public static class ModuleIOInputs {', color: 'D7E3F4' },
        { text: '    public double steerAngleDegrees = 0.0;', color: '9EF01A' },
        { text: '    public double drivePositionMeters = 0.0;', color: '9EF01A' },
        { text: '    public double driveVelocityMetersPerSec = 0.0;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Read every sensor into \'inputs\'. Called once per tick, before anything else. */', color: '7FA8C9' },
        { text: '  public default void updateInputs(ModuleIOInputs inputs) {}', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Firmware position control for steering. */', color: '7FA8C9' },
        { text: '  public default void setSteerAngleDegrees(double angleDegrees) {}', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Firmware velocity control for drive (wheel meters per second). */', color: '7FA8C9' },
        { text: '  public default void setDriveVelocityMetersPerSec(double mps) {}', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Zero the drive encoder. */', color: '7FA8C9' },
        { text: '  public default void resetDrivePosition() {}', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 4, label: 'IO Layers' });
    s.addNotes(
      'ModuleIOInputs is a plain nested class holding every sensor fact the module knows, in one bundle — three public fields, no getters, because this class exists purely to be filled in and read, not to protect itself from its own owner. The default keyword gives each method a body right in the interface — here, a body that does nothing. That\'s deliberate: an implementation only overrides what it actually needs to, and "hardware that does nothing" is about to be exactly what one of the three worlds wants.'
    );
  }

  // ============================================================ SLIDE 5 — ModuleIOTalonFX piece 1a: fields
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · A new file, Piece 1', title: 'ModuleIOTalonFX: fields migrate almost unchanged' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 3.0, fontSize: 12,
      fileLabel: 'Create ModuleIOTalonFX.java — class line and fields',
      lines: [
        { text: 'public class ModuleIOTalonFX implements ModuleIO {', color: 'FFD166' },
        { text: '  protected final TalonFX m_driveMotor;', color: '9EF01A' },
        { text: '  protected final TalonFX m_steerMotor;', color: '9EF01A' },
        { text: '  protected final CANcoder m_steerEncoder;', color: '9EF01A' },
        { text: '  private final PositionVoltage m_steerRequest = new PositionVoltage(0);', color: 'D7E3F4' },
        { text: '  private final VelocityVoltage m_driveRequest = new VelocityVoltage(0);', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.3, w: 11.9, h: 2.75,
      heading: 'The class line now says implements ModuleIO — and the motors are protected, not private.',
      headingSize: 20,
      body: 'These migrate from SwerveModule almost unchanged. protected instead of private is on purpose: more on that word in the next section, once ModuleIOSim needs to reach them.',
    });

    K.addFooter(s, { pageNum: 5, label: 'IO Layers' });
    s.addNotes(
      'Now the hardware moves house. The motors, the CANcoder, and every config and control request from Lesson 12 relocate from SwerveModule into a class that implements the contract — and only that. The sim plumbing does NOT come along; it gets its own implementation in the next section, so this class stays a clean picture of the real robot.'
    );
  }

  // ============================================================ SLIDE 6 — ModuleIOTalonFX piece 1b: constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'cog_white.png', eyebrow: 'Section 3 · A new file, Piece 1', title: 'The constructor: motors, CANcoder, and Lesson 12\'s configs' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 10,
      fileLabel: "ModuleIOTalonFX's constructor",
      lines: [
        { text: 'public ModuleIOTalonFX(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {', color: 'FFD166' },
        { text: '  m_driveMotor = new TalonFX(driveId, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '  m_steerMotor = new TalonFX(steerId, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '  m_steerEncoder = new CANcoder(cancoderId, CANBus.systemcore(0));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  CANcoderConfiguration cancoderConfig = new CANcoderConfiguration();', color: 'D7E3F4' },
        { text: '  cancoderConfig.MagnetSensor.MagnetOffset = magnetOffsetRotations;', color: 'D7E3F4' },
        { text: '  m_steerEncoder.getConfigurator().apply(cancoderConfig);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Steering: read angle from the CANcoder, wrap like a circle, hold a P gain.', color: '7FA8C9' },
        { text: '  TalonFXConfiguration steerConfig = new TalonFXConfiguration();', color: '9EF01A' },
        { text: '  steerConfig.Feedback.FeedbackRemoteSensorID = cancoderId;', color: '9EF01A' },
        { text: '  steerConfig.Feedback.FeedbackSensorSource = FeedbackSensorSourceValue.RemoteCANcoder;', color: '9EF01A' },
        { text: '  steerConfig.Feedback.RotorToSensorRatio = SteerConstants.kSteerGearRatio;', color: '9EF01A' },
        { text: '  steerConfig.Feedback.SensorToMechanismRatio = 1.0;', color: '9EF01A' },
        { text: '  steerConfig.ClosedLoopGeneral.ContinuousWrap = true;', color: '9EF01A' },
        { text: '  steerConfig.Slot0.kP = SteerConstants.kSteerKP;', color: '9EF01A' },
        { text: '  m_steerMotor.getConfigurator().apply(steerConfig);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Drive: firmware knows the gearbox and runs a kV model + kP trim.', color: '7FA8C9' },
        { text: '  TalonFXConfiguration driveConfig = new TalonFXConfiguration();', color: '9EF01A' },
        { text: '  driveConfig.Feedback.SensorToMechanismRatio = DriveConstants.kDriveGearRatio;', color: '9EF01A' },
        { text: '  driveConfig.Slot0.kV = DriveConstants.kDriveKV;', color: '9EF01A' },
        { text: '  driveConfig.Slot0.kP = DriveConstants.kDriveKP;', color: '9EF01A' },
        { text: '  m_driveMotor.getConfigurator().apply(driveConfig);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 6, label: 'IO Layers' });
    s.addNotes(
      'Nothing in this file is new behavior — it\'s Lesson 12, re-shelved. The work of this lesson isn\'t inventing what the module does; it\'s drawing a boundary around it.'
    );
  }

  // ============================================================ SLIDE 7 — ModuleIOTalonFX piece 2: updateInputs
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · A new file, Piece 2', title: 'The read: nothing else, no sim checks' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 2.6, fontSize: 10,
      fileLabel: 'Add to ModuleIOTalonFX',
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void updateInputs(ModuleIOInputs inputs) {', color: 'D7E3F4' },
        { text: '  inputs.steerAngleDegrees = m_steerMotor.getPosition().getValue().in(Rotations) * 360.0;', color: '9EF01A' },
        { text: '  inputs.drivePositionMeters =', color: '9EF01A' },
        { text: '      m_driveMotor.getPosition().getValue().in(Rotations) * DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '  inputs.driveVelocityMetersPerSec =', color: '9EF01A' },
        { text: '      m_driveMotor.getVelocity().getValue().in(RotationsPerSecond) * DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.65, w: 11.9, h: 2.1,
      body: 'updateInputs fills the inputs bundle from the sensors — nothing else. On the real robot the sensors just have values, and this class is the real robot.',
      pad: 0.2, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 7, label: 'IO Layers' });
    s.addNotes(
      'No sim checks, no physics: on the real robot the sensors just have values, and this class is the real robot.'
    );
  }

  // ============================================================ SLIDE 8 — ModuleIOTalonFX piece 3: the writes
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'filecode_teal.png', eyebrow: 'Section 3 · A new file, Piece 3', title: 'The writes: each one a Lesson 12 line wearing @Override' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 13,
      fileLabel: 'Add to ModuleIOTalonFX, closing out the class',
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void setSteerAngleDegrees(double angleDegrees) {', color: 'D7E3F4' },
        { text: '  // Phoenix speaks Units — hand it the angle as a measure.', color: '7FA8C9' },
        { text: '  m_steerMotor.setControl(m_steerRequest.withPosition(Degrees.of(angleDegrees)));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '@Override', color: 'FFD166' },
        { text: 'public void setDriveVelocityMetersPerSec(double mps) {', color: 'D7E3F4' },
        { text: '  double wheelRps = mps / DriveConstants.kWheelCircumferenceMeters;', color: '9EF01A' },
        { text: '  m_driveMotor.setControl(m_driveRequest.withVelocity(RotationsPerSecond.of(wheelRps)));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '@Override', color: 'FFD166' },
        { text: 'public void resetDrivePosition() {', color: 'D7E3F4' },
        { text: '  m_driveMotor.setPosition(0);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 8, label: 'IO Layers' });
    s.addNotes(
      'Now that the target arrives as a plain double (the contract speaks degrees and meters-per-second), wrap it in the matching unit measure on the way into Phoenix, exactly as Lesson 12 did.'
    );
  }

  // ============================================================ SLIDE 9 — ModuleIOSim fields+constructor
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 4 · A new file', title: 'ModuleIOSim: the TalonFX class, plus the physics' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 10,
      fileLabel: 'Create ModuleIOSim.java — extends ModuleIOTalonFX',
      lines: [
        { text: '/** Sim: the real TalonFX class, plus the physics models from Lessons 4-5/12. */', color: '7FA8C9' },
        { text: 'public class ModuleIOSim extends ModuleIOTalonFX {', color: 'FFD166' },
        { text: '  private final TalonFXSimState m_driveSim;', color: 'D7E3F4' },
        { text: '  private final TalonFXSimState m_steerSim;', color: 'D7E3F4' },
        { text: '  private final CANcoderSimState m_steerEncoderSim;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  private final DCMotorSim m_driveModel = new DCMotorSim(', color: 'D7E3F4' },
        { text: '      Models.singleJointedArmFromPhysicalConstants(', color: 'D7E3F4' },
        { text: '          DCMotor.getKrakenX60(1), 0.025, DriveConstants.kDriveGearRatio),', color: 'D7E3F4' },
        { text: '      DCMotor.getKrakenX60(1));', color: 'D7E3F4' },
        { text: '  private final DCMotorSim m_steerModel = new DCMotorSim(', color: 'D7E3F4' },
        { text: '      Models.singleJointedArmFromPhysicalConstants(', color: 'D7E3F4' },
        { text: '          DCMotor.getKrakenX60(1), 0.004, SteerConstants.kSteerGearRatio),', color: 'D7E3F4' },
        { text: '      DCMotor.getKrakenX60(1));', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public ModuleIOSim(int driveId, int steerId, int cancoderId, double magnetOffsetRotations) {', color: 'FFD166' },
        { text: '    super(driveId, steerId, cancoderId, magnetOffsetRotations); // build motors, CANcoder, configs', color: '9EF01A' },
        { text: '    m_driveSim = m_driveMotor.getSimState();', color: '9EF01A' },
        { text: '    m_steerSim = m_steerMotor.getSimState();', color: '9EF01A' },
        { text: '    m_steerEncoderSim = m_steerEncoder.getSimState();', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 9, label: 'IO Layers' });
    s.addNotes(
      'ModuleIOSim isn\'t instead of the TalonFX class, it\'s the TalonFX class plus the physics models. Java has a word for "that class, plus": extends — the first time you extend a class you wrote. super(driveId, steerId, cancoderId, magnetOffsetRotations) runs the parent\'s constructor first — so the motors and CANcoder exist and the configs are applied before the sim states hook onto them. That protected from the previous section is the reason this compiles: private means "mine alone," protected means "mine and my subclasses\'."'
    );
  }

  // ============================================================ SLIDE 10 — ModuleIOSim updateInputs + stepSim
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 4 · A new file', title: 'Physics first, then read — same order every tick' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 2.5, fontSize: 12,
      fileLabel: 'Add to ModuleIOSim',
      lines: [
        { text: '@Override', color: 'FFD166' },
        { text: 'public void updateInputs(ModuleIOInputs inputs) {', color: 'D7E3F4' },
        { text: '  stepSim(); // advance the physics one tick...', color: '9EF01A' },
        { text: '  super.updateInputs(inputs); // ...then read the sensors like the real class', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.9, w: 11.9, h: 3.05, fontSize: 12,
      fileLabel: "stepSim(), drive-motor half — one tick of pretend reality",
      lines: [
        { text: 'private void stepSim() {', color: 'FFD166' },
        { text: '  m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());', color: 'D7E3F4' },
        { text: '  m_driveModel.setInputVoltage(m_driveSim.getMotorVoltage());', color: 'D7E3F4' },
        { text: '  m_driveModel.update(0.020);', color: 'D7E3F4' },
        { text: '  m_driveSim.setRawRotorPosition(', color: 'D7E3F4' },
        { text: '      m_driveModel.getAngularPosition() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);', color: 'D7E3F4' },
        { text: '  m_driveSim.setRotorVelocity(', color: 'D7E3F4' },
        { text: '      m_driveModel.getAngularVelocity() / (2 * Math.PI) * DriveConstants.kDriveGearRatio);', color: 'D7E3F4' },
        { text: '  // ...steer motor and CANcoder feeds continue on the next slide...', color: '7FA8C9' },
      ],
    });

    K.addFooter(s, { pageNum: 10, label: 'IO Layers' });
    s.addNotes(
      'super.updateInputs(inputs) calls the parent\'s version of the method this class overrides: step the physics, then read the sensors exactly the way the real robot would. Step back and look at what the shape buys you: the real class has zero sim code, the sim class has zero new control behavior — same firmware loops, same gains, same reads — and the physics runs right before the read, so the bundle always holds one fresh tick of pretend reality.'
    );
  }

  // ============================================================ SLIDE 11 — ModuleIOSim stepSim steer half + CANcoder
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 4 · A new file', title: 'The CANcoder needs its own honest feed too' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 3.0, fontSize: 12,
      fileLabel: 'stepSim(), continued — steer motor, through the 25:1 reduction',
      lines: [
        { text: '  m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());', color: 'D7E3F4' },
        { text: '  m_steerModel.setInputVoltage(m_steerSim.getMotorVoltage());', color: 'D7E3F4' },
        { text: '  m_steerModel.update(0.020);', color: 'D7E3F4' },
        { text: '  m_steerSim.setRawRotorPosition(', color: 'D7E3F4' },
        { text: '      m_steerModel.getAngularPosition() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);', color: 'D7E3F4' },
        { text: '  m_steerSim.setRotorVelocity(', color: 'D7E3F4' },
        { text: '      m_steerModel.getAngularVelocity() / (2 * Math.PI) * SteerConstants.kSteerGearRatio);', color: 'D7E3F4' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.55, w: 11.9, h: 1.85, fontSize: 13,
      fileLabel: 'stepSim(), closing out — CANcoder: mechanism-side, no gear multiply',
      lines: [
        { text: '  m_steerEncoderSim.setRawPosition(m_steerModel.getAngularPosition() / (2 * Math.PI));', color: '9EF01A' },
        { text: '  m_steerEncoderSim.setVelocity(m_steerModel.getAngularVelocity() / (2 * Math.PI));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'IO Layers' });
    s.addNotes(
      'The closed loop now reads the CANcoder continuously, so it needs its own honest sim feed every tick, or the simulated firmware spends the whole match chasing a signal that never moves — that\'s Lesson 12\'s section 6 payoff landing here.'
    );
  }

  // ============================================================ SLIDE 13 — SwerveModule rewrite: fields+ctor+periodic
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compressarrowsalt_white.png', eyebrow: 'Section 5 · SwerveModule.java', title: 'Hardware-free: an IO, a bundle, its targets' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Rewrite SwerveModule.java — fields, constructor, periodic()',
      lines: [
        { text: 'public class SwerveModule {', color: 'FFD166' },
        { text: '  /** Position of this module relative to robot center, in meters. */', color: '7FA8C9' },
        { text: '  public final Translation2d location;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  private final ModuleIO m_io;', color: '9EF01A' },
        { text: '  private final ModuleIO.ModuleIOInputs m_inputs = new ModuleIO.ModuleIOInputs();', color: '9EF01A' },
        { text: '  private final String m_logKey; // e.g. "Drivetrain/Module0"', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  public SwerveModule(ModuleIO io, String logKey, Translation2d location) {', color: 'FFD166' },
        { text: '    m_io = io;', color: 'D7E3F4' },
        { text: '    m_logKey = logKey;', color: 'D7E3F4' },
        { text: '    this.location = location;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** One tick of sensing: read the hardware into the bundle and log it. */', color: '7FA8C9' },
        { text: '  public void periodic() {', color: 'FFD166' },
        { text: '    m_io.updateInputs(m_inputs);', color: '9EF01A' },
        { text: '    SmartDashboard.putNumber(m_logKey + "/SteerAngleDegrees", m_inputs.steerAngleDegrees);', color: '9EF01A' },
        { text: '    SmartDashboard.putNumber(m_logKey + "/DrivePositionMeters", m_inputs.drivePositionMeters);', color: '9EF01A' },
        { text: '    SmartDashboard.putNumber(m_logKey + "/DriveVelocityMetersPerSec", m_inputs.driveVelocityMetersPerSec);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 12, label: 'IO Layers' });
    s.addNotes(
      'With the hardware gone, SwerveModule becomes short and pure: it owns an IO (whichever kind), a bundle of inputs, its targets, and the cosine decision. The split between periodic() and setDesiredState is a rule, not a style choice: sense in periodic(), act in a command. periodic() runs every tick no matter what — that\'s why it holds only the harmless read-and-log.'
    );
  }

  // ============================================================ SLIDE 14 — SwerveModule rewrite: setDesiredState + getters
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compressarrowsalt_white.png', eyebrow: 'Section 5 · SwerveModule.java', title: 'Question-methods read the bundle, not the hardware' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Rewrite SwerveModule.java — setDesiredState() and the getters, closing the class',
      lines: [
        { text: '/** One tick of control: hand the IO its targets. Called by a command each tick. */', color: '7FA8C9' },
        { text: 'public void setDesiredState(SwerveModuleVelocity state) {', color: 'FFD166' },
        { text: '  double targetDegrees = state.angle.getDegrees();', color: 'D7E3F4' },
        { text: '  m_io.setSteerAngleDegrees(targetDegrees);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  // Cosine compensation (Lesson 9) — a decision, so it stays in our code.', color: '7FA8C9' },
        { text: '  double error = targetDegrees - m_inputs.steerAngleDegrees;', color: 'D7E3F4' },
        { text: '  double alignment = Math.cos(Math.toRadians(error));', color: 'D7E3F4' },
        { text: '  m_io.setDriveVelocityMetersPerSec(state.velocity * alignment);', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public double getSteerAngleDegrees() { return m_inputs.steerAngleDegrees; }', color: 'D7E3F4' },
        { text: 'public double getDistanceMeters() { return m_inputs.drivePositionMeters; }', color: 'D7E3F4' },
        { text: 'public double getDriveVelocityMetersPerSec() { return m_inputs.driveVelocityMetersPerSec; }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public SwerveModulePosition getPosition() {', color: 'FFD166' },
        { text: '  return new SwerveModulePosition(', color: 'D7E3F4' },
        { text: '      m_inputs.drivePositionMeters, Rotation2d.fromDegrees(m_inputs.steerAngleDegrees));', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: 'public void resetDrivePosition() { m_io.resetDrivePosition(); }', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 13, label: 'IO Layers' });
    s.addNotes(
      'Because the scheduler runs periodic() before any command each tick, the bundle is always fresh by the time setDesiredState reads it for the cosine error: inputs first, then logic, which is exactly what makes a tick reproducible. Every sensor fact now takes exactly one path into the program — which is why logging it is one line per field, sitting right where the bundle gets filled, instead of scattered wherever someone happened to need the number.'
    );
  }

  // ============================================================ SLIDE 15 — Constants.Mode enum
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'tag_white.png', eyebrow: 'Section 6 · Constants.java', title: 'A fixed menu of values — you can\'t typo a mode that doesn\'t exist' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.0, fontSize: 13,
      fileLabel: 'Add to the top of Constants.java',
      lines: [
        { text: 'public final class Constants {', color: 'FFD166' },
        { text: '  public enum Mode { REAL, SIM, REPLAY }', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Change kSimMode to Mode.REPLAY to re-run a log file instead of simulating fresh. */', color: '7FA8C9' },
        { text: '  public static final Mode kSimMode = Mode.SIM;', color: '9EF01A' },
        { text: '  public static final Mode kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  // ...the nested constants classes stay...', color: '7FA8C9' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.65, w: 11.9, h: 2.25,
      body: 'Needs import org.wpilib.framework.RobotBase; — a question-method deciding a constant. That comment on kSimMode is honest about where this is going, even though flipping it to REPLAY today buys nothing yet but a dormant, empty implementation.',
      pad: 0.25, bodySize: 19,
    });

    K.addFooter(s, { pageNum: 14, label: 'IO Layers' });
    s.addNotes(
      'Which IO does a module get? That depends on where the code is running, and "where am I running" deserves a proper type. A Java enum is a type whose values are a fixed menu.'
    );
  }

  // ============================================================ SLIDE 16 — m_modules array
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 6 · Drivetrain.java', title: 'Finally wiring in the per-corner constants' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 5.5, fontSize: 11,
      fileLabel: 'Edit the m_modules field in Drivetrain',
      lines: [
        { text: 'private final SwerveModule[] m_modules = new SwerveModule[] {', color: 'FFD166' },
        { text: '    makeModule(0, DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,', color: '9EF01A' },
        { text: '        DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,', color: '9EF01A' },
        { text: '        DriveConstants.kFrontLeft),', color: '9EF01A' },
        { text: '    makeModule(1, DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,', color: '9EF01A' },
        { text: '        DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,', color: '9EF01A' },
        { text: '        DriveConstants.kFrontRight),', color: '9EF01A' },
        { text: '    makeModule(2, DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,', color: '9EF01A' },
        { text: '        DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,', color: '9EF01A' },
        { text: '        DriveConstants.kBackLeft),', color: '9EF01A' },
        { text: '    makeModule(3, DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,', color: '9EF01A' },
        { text: '        DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,', color: '9EF01A' },
        { text: '        DriveConstants.kBackRight)', color: '9EF01A' },
        { text: '};', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 15, label: 'IO Layers' });
    s.addNotes(
      'This is also the moment to finally use the per-corner constants DriveConstants has carried since Lesson 7 — Try It 4 back then asked you to wire them in yourself, and rebuilding this array is the natural place to make it required.'
    );
  }

  // ============================================================ SLIDE 17 — makeModule helper
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'objectgroup_white.png', eyebrow: 'Section 6 · Drivetrain.java', title: 'One switch, three worlds' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 3.9, fontSize: 12,
      fileLabel: 'Add the builder, next to makeModule',
      lines: [
        { text: '/** Builds the right ModuleIO for the current mode, then wraps it in a SwerveModule. */', color: '7FA8C9' },
        { text: 'private static SwerveModule makeModule(', color: 'FFD166' },
        { text: '    int index, int driveId, int steerId, int cancoderId, double magnetOffsetRotations,', color: 'D7E3F4' },
        { text: '    Translation2d location) {', color: 'D7E3F4' },
        { text: '  ModuleIO io = switch (Constants.kCurrentMode) {', color: '9EF01A' },
        { text: '    case REAL -> new ModuleIOTalonFX(driveId, steerId, cancoderId, magnetOffsetRotations);', color: '9EF01A' },
        { text: '    case SIM -> new ModuleIOSim(driveId, steerId, cancoderId, magnetOffsetRotations);', color: '9EF01A' },
        { text: '    case REPLAY -> new ModuleIO() {}; // nothing feeds this yet', color: '9EF01A' },
        { text: '  };', color: '9EF01A' },
        { text: '  return new SwerveModule(io, "Drivetrain/Module" + index, location);', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.3,
      body: 'Drivetrain needs import first.robot.Constants; alongside its existing DriveConstants/HeadingConstants imports — importing a nested class doesn\'t let you refer to the outer one by its bare name.',
      pad: 0.15, bodySize: 17,
    });

    K.addFooter(s, { pageNum: 16, label: 'IO Layers' });
    s.addNotes(
      'Enums and switch expressions are made for each other: one arrow arm per mode, and the whole thing IS a value you can assign. Better, the compiler counts the arms against the menu — add a fourth mode next season and this line refuses to build until you say what it means. Three worlds, three implementations, chosen in one place, once, at construction.'
    );
  }

  // ============================================================ SLIDE 18 — anonymous class (concept)
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'puzzlepiece_white.png', eyebrow: 'Section 6 · new ModuleIO() {}', title: 'Ten characters for "hardware that doesn\'t exist"' });

    s.addShape('roundRect', { x: 0.7, y: 1.85, w: 11.9, h: 3.0, rectRadius: 0.12, fill: { color: NAVY2 }, line: { type: 'none' } });
    s.addText('A nameless class implementing ModuleIO, overriding nothing.', {
      x: 1.0, y: 2.1, w: 11.3, h: 0.85, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    s.addText('Every method keeps its default do-nothing body: reads leave the inputs sitting at whatever they were (0.0, since nothing has ever touched them), writes go nowhere — there are no motors.', {
      x: 1.0, y: 3.0, w: 11.3, h: 1.7, fontFace: FONT_BODY, fontSize: 20, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addText('This is exactly why the interface\'s methods got default bodies in section 2: without them, new ModuleIO() {} wouldn\'t compile — you\'d owe the compiler four method bodies for a class that\'s supposed to do nothing at all.', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.2, fontFace: FONT_HEAD, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addFooter(s, { pageNum: 17, label: 'IO Layers', dark: true });
    s.addNotes(
      'That new ModuleIO() {} in the replay arm is an anonymous class. Every method keeps its default do-nothing body — ten characters of syntax for "hardware that doesn\'t exist."'
    );
  }

  // ============================================================ SLIDE 19 — GyroIO.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 7 · A new file', title: 'The gyro gets the same treatment' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 4.1, fontSize: 13,
      fileLabel: 'Create GyroIO.java — the whole file',
      lines: [
        { text: 'package first.robot.subsystems;', color: '7FD1D9' },
        { text: '', color: 'D7E3F4' },
        { text: 'public interface GyroIO {', color: 'FFD166' },
        { text: '  public static class GyroIOInputs {', color: 'D7E3F4' },
        { text: '    public double yawDegrees = 0.0;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  public default void updateInputs(GyroIOInputs inputs) {}', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  /** Sim bookkeeping: the commanded rotation rate, in revolutions per second. */', color: '7FA8C9' },
        { text: '  public default void setSimRotationRate(double omegaRevPerSec) {}', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 18, label: 'IO Layers' });
    s.addNotes(
      'Same pattern, smaller scale — read it as a rerun.'
    );
  }

  // ============================================================ SLIDE 20 — GyroIOPigeon2.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 7 · A new file', title: 'GyroIOPigeon2 — the shortest class in the course' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.1, fontSize: 14,
      fileLabel: 'Create GyroIOPigeon2.java — the whole file',
      lines: [
        { text: 'public class GyroIOPigeon2 implements GyroIO {', color: 'FFD166' },
        { text: '  private final Pigeon2 m_gyro = new Pigeon2(0, CANBus.systemcore(0)); // CAN ID 0', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updateInputs(GyroIOInputs inputs) {', color: 'D7E3F4' },
        { text: '    inputs.yawDegrees = m_gyro.getYaw().getValue().in(Degrees);', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.85, w: 11.9, h: 2.05,
      body: 'Notice it doesn\'t override setSimRotationRate at all — the real robot has no use for it, so the default no-op body is exactly right. That\'s the interface earning its keep from the other direction.',
      pad: 0.2, bodySize: 18,
    });

    K.addFooter(s, { pageNum: 19, label: 'IO Layers' });
    s.addNotes(
      'A Pigeon and one read.'
    );
  }

  // ============================================================ SLIDE 21 — GyroIOSim.java
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'flask_white.png', eyebrow: 'Section 7 · A new file', title: 'GyroIOSim: no hardware at all — arithmetic only' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.3, w: 11.9, h: 5.5, fontSize: 14,
      fileLabel: 'Create GyroIOSim.java — the whole file',
      lines: [
        { text: 'public class GyroIOSim implements GyroIO {', color: 'FFD166' },
        { text: '  private double m_lastCommandedOmega = 0.0;', color: 'D7E3F4' },
        { text: '  private double m_simHeadingDegrees = 0.0;', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void updateInputs(GyroIOInputs inputs) {', color: 'D7E3F4' },
        { text: '    // Lesson 8\'s integration: add rate x time, every tick.', color: '7FA8C9' },
        { text: '    m_simHeadingDegrees += m_lastCommandedOmega * 360.0 * 0.020;', color: '9EF01A' },
        { text: '    inputs.yawDegrees = m_simHeadingDegrees;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  @Override', color: 'FFD166' },
        { text: '  public void setSimRotationRate(double omegaRevPerSec) {', color: 'D7E3F4' },
        { text: '    m_lastCommandedOmega = omegaRevPerSec;', color: '9EF01A' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 20, label: 'IO Layers' });
    s.addNotes(
      'The sim implementation absorbs Lesson 8\'s fake-gyro integration — the m_lastCommandedOmega and m_simHeadingDegrees fields move here from Drivetrain — and look: no Pigeon, no Phoenix, no hardware at all. A heading you integrate yourself needs nothing but arithmetic, so unlike the module, this sim class doesn\'t extend the real one — it stands alone.'
    );
  }

  // ============================================================ SLIDE 22 — Drivetrain gyro field + getHeadingDegrees
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compass_white.png', eyebrow: 'Section 8 · Drivetrain.java', title: 'Wire the gyro in with the same three-arm switch' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 2.2, fontSize: 13,
      fileLabel: "Replace Drivetrain's gyro field with",
      lines: [
        { text: 'private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {', color: 'FFD166' },
        { text: '  case REAL -> new GyroIOPigeon2();', color: '9EF01A' },
        { text: '  case SIM -> new GyroIOSim();', color: '9EF01A' },
        { text: '  case REPLAY -> new GyroIO() {}; // nothing feeds this yet', color: '9EF01A' },
        { text: '};', color: 'D7E3F4' },
        { text: 'private final GyroIO.GyroIOInputs m_gyroInputs = new GyroIO.GyroIOInputs();', color: 'D7E3F4' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 4.0, w: 11.9, h: 1.9, fontSize: 15,
      fileLabel: 'Replace getHeadingDegrees() — it now reads the bundle',
      lines: [
        { text: '/** Robot heading in degrees (CCW positive). */', color: '7FA8C9' },
        { text: 'public double getHeadingDegrees() {', color: 'FFD166' },
        { text: '  return m_gyroInputs.yawDegrees;', color: '9EF01A' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 21, label: 'IO Layers' });
    s.addNotes(
      'The two places that fed the old bookkeeping now call the IO instead — that\'s the next slide.'
    );
  }

  // ============================================================ SLIDE 23 — applyChassisSpeeds / driveDistance edits
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 8 · Drivetrain.java', title: 'The two places that fed the old bookkeeping' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 1.5, fontSize: 15,
      fileLabel: 'In applyChassisSpeeds, replace the m_lastCommandedOmega assignment with',
      lines: [
        { text: 'm_gyroIO.setSimRotationRate(speeds.omega / (2 * Math.PI));', color: '9EF01A' },
      ],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.5, w: 11.9, h: 1.5, fontSize: 15,
      fileLabel: 'And driveDistance\'s zero line does the same, with',
      lines: [
        { text: 'm_gyroIO.setSimRotationRate(0.0);', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.4, w: 11.9, h: 1.3,
      body: 'applyChassisSpeeds sets the rate every tick it runs; driveDistance zeros it the same way — both used to assign m_lastCommandedOmega directly, and both now call the IO instead.',
      pad: 0.15, bodySize: 17,
    });

    K.addFooter(s, { pageNum: 22, label: 'IO Layers' });
    s.addNotes(
      'applyChassisSpeeds sets m_gyroIO.setSimRotationRate(speeds.omega / (2 * Math.PI)) in place of assigning m_lastCommandedOmega, and driveDistance\'s zero line does the same with 0.0.'
    );
  }

  // ============================================================ SLIDE 24 — logTelemetry gyro read + module.periodic()
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'broadcasttower_white.png', eyebrow: 'Section 8 · Drivetrain.java', title: 'Now something has to ask each module to refresh' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.2, w: 11.9, h: 4.6, fontSize: 12,
      fileLabel: 'Add the gyro read to the top of logTelemetry(), and give each module its own read a line above',
      lines: [
        { text: 'private void logTelemetry() {', color: 'FFD166' },
        { text: '  m_gyroIO.updateInputs(m_gyroInputs);', color: '9EF01A' },
        { text: '  SmartDashboard.putNumber("Drivetrain/Gyro/YawDegrees", m_gyroInputs.yawDegrees);', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: '  SwerveModuleVelocity[] states = new SwerveModuleVelocity[4];', color: 'D7E3F4' },
        { text: '  int index = 0;', color: 'D7E3F4' },
        { text: '  for (SwerveModule module : m_modules) {', color: 'D7E3F4' },
        { text: '    module.periodic(); // refresh + log this module\'s inputs', color: '9EF01A' },
        { text: '    states[index] = new SwerveModuleVelocity(', color: 'D7E3F4' },
        { text: '        module.getDriveVelocityMetersPerSec(),', color: 'D7E3F4' },
        { text: '        Rotation2d.fromDegrees(module.getSteerAngleDegrees()));', color: 'D7E3F4' },
        { text: '    index++;', color: 'D7E3F4' },
        { text: '  }', color: 'D7E3F4' },
        { text: '  m_moduleStatesPublisher.set(states);', color: 'D7E3F4' },
        { text: '', color: 'D7E3F4' },
        { text: '  // ...Heading/Pose publishing, odometry update, Field2d — unchanged...', color: '7FA8C9' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addFooter(s, { pageNum: 23, label: 'IO Layers' });
    s.addNotes(
      'That module.periodic() call is new — it\'s the read that used to happen implicitly every time SwerveModule reached straight into its own motors. Now the bundle only refreshes when something asks it to, so something has to ask.'
    );
  }

  // ============================================================ SLIDE 25 — delete simulatePeriodic
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: 'Section 8 · Drivetrain.java & Robot.java', title: 'A real behavior change, not a formality' });

    K.addCard(s, {
      x: 0.7, y: 1.4, w: 11.9, h: 2.05, bg: CARDBG,
      heading: 'Delete Drivetrain.simulatePeriodic() entirely.',
      headingSize: 22,
      body: 'Every scrap of sim-only code now lives inside an IO implementation, chosen once at construction instead of re-run from a method every tick.',
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.55, w: 11.9, h: 1.7, fontSize: 14,
      fileLabel: "Empty out simulationPeriodic() in Robot.java",
      lines: [
        { text: '/** Runs every tick, but only while the code is running in simulation. */', color: '7FA8C9' },
        { text: '@Override', color: 'FFD166' },
        { text: 'public void simulationPeriodic() {}', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.45, w: 11.9, h: 1.4,
      body: 'A genuinely different shape than every earlier lesson used: physics now happens as a side effect of which class got constructed. Nothing to opt into each tick, nothing to forget.',
      pad: 0.15, bodySize: 17,
    });

    K.addFooter(s, { pageNum: 24, label: 'IO Layers' });
    s.addNotes(
      'There\'s nothing left for Drivetrain to do when Robot.simulationPeriodic() fires. Which means Robot.java needs to stop calling a method that no longer exists. Pick ModuleIOSim at startup, and every future updateInputs() call steps the physics on its own.'
    );
  }

  // ============================================================ SLIDE 26 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Watch the empty doorway', body: 'Flip kSimMode to Mode.REPLAY. Everything on the Swerve tab sits frozen at 0.0 forever — that\'s the honest state of an open, empty door.', code: true },
        { title: 'Corrupt a sensor on purpose', body: 'Multiply drivePositionMeters by 1.1 in ModuleIOTalonFX. Odometry disagrees by a consistent 10%.', code: true },
        { title: 'Cut the cord', body: 'Rebuild ModuleIOSim standalone: implements ModuleIO directly, a DCMotorSim and a PIDController, no Phoenix at all.', code: true },
      ],
    });

    K.addFooter(s, { pageNum: 25, label: 'IO Layers', dark: true });
    s.addNotes(
      'Watching the empty doorway is a one-value flip plus running — arguably light code-editing but a real edit nonetheless; tagged for consistency with how directly it modifies Constants.java. Corrupting a sensor on purpose is a genuine one-line edit demonstrating the shape of a real hardware bug: it happened behind the one door everything else trusts, so everything downstream inherited it without any of that code being wrong itself. Cutting the cord is the biggest exercise in the lesson — rebuilding ModuleIOSim without leaning on Phoenix\'s simulated firmware at all, testing whether the interface boundary is really as clean as it looks.'
    );
  }

  // ============================================================ SLIDE 27 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Hardware behind a door, everywhere' });

    const points = [
      'default do-nothing methods make "hardware that doesn\'t exist" ten characters of anonymous class, not four method bodies you owe the compiler.',
      'One implementation per world — real hardware, and sim extending the real one to borrow its firmware — chosen once, at construction, by an enum and a switch expression.',
      'SwerveModule and Drivetrain never touch a motor or a gyro anymore; they touch the bundle an IO filled in.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 10 } })),
      { x: 0.7, y: 1.75, w: 6.9, h: 4.6, fontFace: FONT_BODY, fontSize: 19, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 }
    );

    s.addShape('roundRect', { x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12, fill: { color: NAVY }, line: { type: 'none' } });
    s.addText('NEXT', { x: 8.3, y: 2.1, w: 4.0, h: 0.4, fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText('Lesson 14', { x: 8.3, y: 2.55, w: 4.0, h: 0.55, fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0 });
    s.addText('The Pose Estimator', { x: 8.3, y: 3.1, w: 4.0, h: 0.9, fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1 });
    s.addText('A localizer fused from many sources, closing the drift odometry leaves open.', {
      x: 8.3, y: 4.1, w: 4.0, h: 1.4, fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 26, label: 'IO Layers' });
    s.addNotes(
      'You also met a mode with nothing behind it. REPLAY compiles, constructs, and does exactly nothing — the honest state of a doorway with no tooling on the other side yet. Every future lesson that needs a reading from "somewhere other than live hardware" walks through the exact door built today. One upgrade remains before you\'d want to trust that heading and pose any further: the pose odometry dead-reckons still drifts, uncorrected, and Lesson 14 teaches the robot to fix it.'
    );
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', '13-io-replay.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
