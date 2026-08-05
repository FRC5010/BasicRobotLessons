package frc.robot.subsystems;

import static edu.wpi.first.units.Units.KilogramSquareMeters;
import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.Radians;
import static edu.wpi.first.units.Units.Volts;

import java.util.function.Supplier;

import org.ironmaple.simulation.SimulatedArena;
import org.ironmaple.simulation.drivesims.COTS;
import org.ironmaple.simulation.drivesims.SwerveDriveSimulation;
import org.ironmaple.simulation.drivesims.configs.DriveTrainSimulationConfig;
import org.ironmaple.simulation.drivesims.configs.SwerveModuleSimulationConfig;
import org.littletonrobotics.junction.Logger;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.LinearVelocity;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
import frc.robot.Constants.DriveConstants;
import frc.robot.Constants.HeadingConstants;
import frc.robot.Constants.PathConstants;
import frc.robot.Constants.SteerConstants;

public class Drivetrain extends SubsystemBase implements PoseProvider {
    /**
     * The chassis's body in the physics world — one, shared by all four modules,
     * so static (the same reasoning as Lesson 15's VisionSystemSim).
     *
     * <p>Null outside SIM: a real robot already has a world, and replay doesn't
     * need one. Only the SIM arms of the switches below ever read it.
     */
    private static final SwerveDriveSimulation m_driveSim = createDriveSim();

    // Corner order: FL, FR, BL, BR. Each module gets an IO chosen by the mode.
    private final SwerveModule[] m_modules = new SwerveModule[] {
            makeModule(0, DriveConstants.kFrontLeftDrivePort, DriveConstants.kFrontLeftSteerPort,
                    DriveConstants.kFrontLeftCancoderPort, DriveConstants.kFrontLeftMagnetOffset,
                    DriveConstants.kFrontLeft),
            makeModule(1, DriveConstants.kFrontRightDrivePort, DriveConstants.kFrontRightSteerPort,
                    DriveConstants.kFrontRightCancoderPort, DriveConstants.kFrontRightMagnetOffset,
                    DriveConstants.kFrontRight),
            makeModule(2, DriveConstants.kBackLeftDrivePort, DriveConstants.kBackLeftSteerPort,
                    DriveConstants.kBackLeftCancoderPort, DriveConstants.kBackLeftMagnetOffset,
                    DriveConstants.kBackLeft),
            makeModule(3, DriveConstants.kBackRightDrivePort, DriveConstants.kBackRightSteerPort,
                    DriveConstants.kBackRightCancoderPort, DriveConstants.kBackRightMagnetOffset,
                    DriveConstants.kBackRight)
    };

    // The close-range controllers. Fields, not locals, because atPose() has to
    // read the same error the last calculate() saw.
    private final PIDController m_xController = makeAlignController(PathConstants.kAlignP,
            PathConstants.kPositionTolerance.in(Meters));
    private final PIDController m_yController = makeAlignController(PathConstants.kAlignP,
            PathConstants.kPositionTolerance.in(Meters));
    private final PIDController m_thetaController = makeThetaController();

    private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
            m_modules[0].location,
            m_modules[1].location,
            m_modules[2].location,
            m_modules[3].location);

    private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
        case REAL -> new GyroIOPigeon2();
        case SIM -> new GyroIOSim(m_driveSim.getGyroSimulation());
        case REPLAY -> new GyroIO() {}; // inputs come from the log
    };
    private final GyroIOInputsAutoLogged m_gyroInputs = new GyroIOInputsAutoLogged();

    /** Builds the simulated chassis and puts it on the simulated field. Sim only. */
    /** The simulated chassis, or null off SIM. Sim IO classes attach things to it. */
    public static SwerveDriveSimulation getDriveSim() {
        return m_driveSim;
    }

    private static SwerveDriveSimulation createDriveSim() {
        if (Constants.kCurrentMode != Constants.Mode.SIM) {
            return null; // a real robot already has a world; replay doesn't need one
        }

        DriveTrainSimulationConfig config = DriveTrainSimulationConfig.Default()
                .withRobotMass(DriveConstants.kRobotMass)
                .withBumperSize(DriveConstants.kBumperLength, DriveConstants.kBumperWidth)
                .withTrackLengthTrackWidth(
                        Meters.of(DriveConstants.kHalfLength * 2),
                        Meters.of(DriveConstants.kHalfWidth * 2))
                .withGyro(COTS.ofPigeon2())
                .withSwerveModule(new SwerveModuleSimulationConfig(
                        DCMotor.getKrakenX60(1),       // drive motor
                        DCMotor.getKrakenX60(1),       // steer motor
                        DriveConstants.kDriveGearRatio,
                        SteerConstants.kSteerGearRatio,
                        Volts.of(0.1),                 // volts needed to break drive friction
                        Volts.of(0.2),                 // volts needed to break steer friction
                        DriveConstants.kWheelRadius,
                        KilogramSquareMeters.of(0.03), // steering inertia
                        COTS.WHEELS.COLSONS.cof));     // how hard the tires grip

        SwerveDriveSimulation sim =
                new SwerveDriveSimulation(config, DriveConstants.kSimStartingPose);
        SimulatedArena.getInstance().addDriveTrainSimulation(sim);
        return sim;
    }

    /** Pick a module's IO from the current mode: one implementation per world. */
    private static SwerveModule makeModule(
            int index, int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
            Translation2d location) {
        ModuleIO io = switch (Constants.kCurrentMode) {
            case REAL -> new ModuleIOTalonFX(driveId, steerId, cancoderId, magnetOffsetRotations);
            case SIM -> new ModuleIOSim(driveId, steerId, cancoderId, magnetOffsetRotations,
                    m_driveSim.getModules()[index]);
            case REPLAY -> new ModuleIO() {}; // inputs come from the log
        };
        return new SwerveModule(io, "Drivetrain/Module" + index, location);
    }

    /** One tick of chassis motion: convert, desaturate, optimize, command. */
    private void applyChassisSpeeds(ChassisSpeeds speeds) {
        SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);
        SwerveDriveKinematics.desaturateWheelSpeeds(states, DriveConstants.kMaxSpeed);

        for (int i = 0; i < m_modules.length; i++) {
            states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
            m_modules[i].setDesiredState(states[i]);
        }

        Logger.recordOutput("Drivetrain/DesiredModuleStates", states);
    }

    /** Drive with full swerve freedom: translate and rotate at once (robot frame). */
    public Command drive(
            Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
        return run(() -> applyChassisSpeeds(new ChassisSpeeds(vx.get(), vy.get(), omega.get())));
    }

    /** Drive in the field frame: "forward" is away from the driver, whatever way we face. */
    public Command driveFieldRelative(
            Supplier<LinearVelocity> vx, Supplier<LinearVelocity> vy, Supplier<AngularVelocity> omega) {
        return run(() -> {
            ChassisSpeeds fieldSpeeds = new ChassisSpeeds(vx.get(), vy.get(), omega.get());
            applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
                    fieldSpeeds, Rotation2d.fromDegrees(getHeadingDegrees())));
        });
    }

    /** 'omega' is revolutions per second (0.5 = half a turn per second). */
    private void commandRotation(double omegaRevPerSec) {
        applyChassisSpeeds(new ChassisSpeeds(0, 0, omegaRevPerSec * 2 * Math.PI));
    }

    /** Turn to face 'targetDegrees'. Finishes when within 2°. */
    public Command turnToHeading(double targetDegrees) {
        return run(() -> {
            double omega = MathUtil.clamp(
                    HeadingConstants.kP * headingError(targetDegrees),
                    -0.5, 0.5);
            commandRotation(omega);
        })
                .until(() -> Math.abs(headingError(targetDegrees)) < 2.0)
                .finallyDo(() -> commandRotation(0.0));
    }

    /** Drive straight forward 'meters' at 40% of max speed. Finishes on its own. */
    public Command driveDistance(double meters) {
        return runOnce(() -> m_modules[0].resetDrivePosition())
                .andThen(run(() -> {
                    for (SwerveModule module : m_modules) {
                        module.setDesiredState(new SwerveModuleState(
                                DriveConstants.kMaxSpeed.times(0.4), Rotation2d.fromDegrees(0)));
                    }
                }))
                .until(() -> Math.abs(m_modules[0].getDistanceMeters()) >= Math.abs(meters))
                .finallyDo(() -> {
                    for (SwerveModule module : m_modules) {
                        module.setDesiredState(new SwerveModuleState());
                    }
                });
    }

    /**
     * Close the last stretch to an exact pose. Three controllers on field-relative
     * error, and tolerances that decide when "arrived" is true.
     *
     * <p>Deliberately short-range: its top speed is its gain times the distance
     * it is ever asked to cover, so it is slow by construction rather than by
     * clamping. Send it across the field and it will get there, eventually.
     */
    public Command alignToPose(Pose2d target, Supplier<Pose2d> pose) {
        return run(() -> {
            Pose2d current = pose.get();
            double vx = m_xController.calculate(current.getX(), target.getX());
            double vy = m_yController.calculate(current.getY(), target.getY());
            double omega = m_thetaController.calculate(
                    current.getRotation().getRadians(), target.getRotation().getRadians());
            applyChassisSpeeds(ChassisSpeeds.fromFieldRelativeSpeeds(
                    vx, vy, omega, current.getRotation()));
        })
                .until(this::atPose)
                .finallyDo(() -> applyChassisSpeeds(new ChassisSpeeds()));
    }

    /** Arrived — in both senses. Rotation counts, which is what the old sketch forgot. */
    public boolean atPose() {
        return m_xController.atSetpoint()
                && m_yController.atSetpoint()
                && m_thetaController.atSetpoint();
    }

    /** One axis of the close-range controller: a P gain and the tolerance it stops at. */
    private static PIDController makeAlignController(double kP, double tolerance) {
        PIDController controller = new PIDController(kP, 0, 0);
        controller.setTolerance(tolerance);
        return controller;
    }

    /** The heading controller, told that -180 and +180 are the same place. */
    private static PIDController makeThetaController() {
        PIDController controller = new PIDController(PathConstants.kAlignThetaP, 0, 0);
        controller.enableContinuousInput(-Math.PI, Math.PI);
        controller.setTolerance(PathConstants.kAngleTolerance.in(Radians));
        return controller;
    }

    /** Robot heading in degrees (CCW positive) — read from the gyro's logged inputs. */
    public double getHeadingDegrees() {
        return m_gyroInputs.yawDegrees;
    }

    public SwerveDriveKinematics getKinematics() {
        return m_kinematics;
    }

    /** Heading as a Rotation2d — what the estimator speaks. */
    public Rotation2d getRotation() {
        return Rotation2d.fromDegrees(getHeadingDegrees());
    }

    /** Snapshot the four modules' positions. (Was the private modulePositions() in Lesson 11.) */
    public SwerveModulePosition[] getModulePositions() {
        SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];
        for (int i = 0; i < m_modules.length; i++) {
            positions[i] = m_modules[i].getPosition();
        }
        return positions;
    }

    /**
     * Current robot-relative chassis speeds — Lesson 10's kinematics run
     * backward: four measured module states in, one chassis motion out.
     */
    public ChassisSpeeds getChassisSpeeds() {
        SwerveModuleState[] states = new SwerveModuleState[m_modules.length];
        for (int i = 0; i < m_modules.length; i++) {
            states[i] = new SwerveModuleState(
                    m_modules[i].getDriveVelocityMetersPerSec(),
                    Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
        }
        return m_kinematics.toChassisSpeeds(states);
    }

    /** Drive one tick from a robot-relative ChassisSpeeds. The door BLine drives through. */
    public void driveRobotRelative(ChassisSpeeds speeds) {
        applyChassisSpeeds(speeds);
    }

    /** As a PoseProvider, the drivetrain contributes wheel-and-gyro odometry. */
    @Override
    public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
        estimator.update(getRotation(), getModulePositions());
    }

    /** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
    private double headingError(double targetDegrees) {
        return MathUtil.inputModulus(targetDegrees - getHeadingDegrees(), -180, 180);
    }

    @Override
    public void periodic() {
        // Inputs first: refresh + log the gyro, then each module.
        m_gyroIO.updateInputs(m_gyroInputs);
        Logger.processInputs("Drivetrain/Gyro", m_gyroInputs);

        SwerveModuleState[] states = new SwerveModuleState[4];
        for (int i = 0; i < m_modules.length; i++) {
            m_modules[i].periodic(); // refresh + log this module's inputs
            states[i] = new SwerveModuleState(
                    m_modules[i].getDriveVelocityMetersPerSec(),
                    Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
        }
        Logger.recordOutput("Drivetrain/ModuleStates", states);
        Logger.recordOutput("Drivetrain/Heading", Rotation2d.fromDegrees(getHeadingDegrees()));
        // Pose tracking moved to the Localizer — it reads these inputs after we refresh them.

        // Ground truth: where the robot REALLY is. Plot against Localizer/Pose to
        // watch odometry drift when the wheels skid. Sim only — see m_driveSim.
        if (m_driveSim != null) {
            Logger.recordOutput("Drivetrain/SimulatedPose", m_driveSim.getSimulatedDriveTrainPose());
        }
    }
}
