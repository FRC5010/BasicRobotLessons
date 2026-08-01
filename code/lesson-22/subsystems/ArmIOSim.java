package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Kilograms;
import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.Radians;
import static edu.wpi.first.units.Units.RadiansPerSecond;
import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import org.ironmaple.simulation.IntakeSimulation;
import org.ironmaple.simulation.SimulatedArena;
import org.ironmaple.simulation.seasonspecific.rebuilt2026.RebuiltFuelOnField;

import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import edu.wpi.first.wpilibj.simulation.SingleJointedArmSim;
import frc.robot.Constants.ArmConstants;

/**
 * The sim implementation: the real TalonFX class (Phoenix simulates its own
 * firmware, so Motion Magic still runs), plus physics for both motors — an arm
 * that gravity pulls on, and a roller that just has some inertia.
 */
public class ArmIOSim extends ArmIOTalonFX {
    private final TalonFXSimState m_pivotSim;
    private final TalonFXSimState m_rollerSim;

    private final SingleJointedArmSim m_model = new SingleJointedArmSim(
            DCMotor.getKrakenX60(1),
            ArmConstants.kGearRatio,
            SingleJointedArmSim.estimateMOI(
                    ArmConstants.kArmLength.in(Meters), ArmConstants.kArmMass.in(Kilograms)),
            ArmConstants.kArmLength.in(Meters),
            ArmConstants.kMinAngle.in(Radians),
            ArmConstants.kMaxAngle.in(Radians),
            true, // simulate gravity — the whole point
            ArmConstants.kMinAngle.in(Radians));

    /**
     * maple-sim's model of what the roller can physically reach. It grabs game
     * pieces off the arena floor only while it is running and only when one is
     * actually in front of it — which is exactly what the beam break should see.
     */
    private final IntakeSimulation m_intakeSim = IntakeSimulation.OverTheBumperIntake(
            "Fuel",
            Drivetrain.getDriveSim(),
            ArmConstants.kIntakeWidth,
            ArmConstants.kIntakeExtension,
            IntakeSimulation.IntakeSide.FRONT,
            1); // this intake holds one piece

    private final DCMotorSim m_rollerModel = new DCMotorSim(
            LinearSystemId.createDCMotorSystem(DCMotor.getKrakenX60(1), 0.001, 1.0),
            DCMotor.getKrakenX60(1));

    public ArmIOSim(int pivotId, int rollerId) {
        super(pivotId, rollerId); // build both motors and apply the configs
        m_pivotSim = m_pivot.getSimState();
        m_rollerSim = m_roller.getSimState();
        m_intakeSim.register(); // put it in the arena so collisions count
    }

    @Override
    public void setRollerOutput(double output) {
        super.setRollerOutput(output);
        if (output > 0) {
            m_intakeSim.startIntake(); // reaching out, able to grab
        } else {
            m_intakeSim.stopIntake();
            if (output < 0 && m_intakeSim.obtainGamePieceFromIntake()) {
                // Spat back onto the field in front of the robot, where you can
                // go and pick it up again.
                var pose = Drivetrain.getDriveSim().getSimulatedDriveTrainPose();
                SimulatedArena.getInstance().addGamePiece(new RebuiltFuelOnField(
                        pose.getTranslation().plus(
                                new Translation2d(0.8, 0).rotateBy(pose.getRotation()))));
            }
        }
    }

    @Override
    public void updateInputs(ArmIOInputs inputs) {
        stepSim(); // advance the physics one tick...
        super.updateInputs(inputs); // ...then read the sensors like the real class

        // The beam break reads the arena, not the roller. Spin it in empty space
        // and nothing happens — which is the entire reason for having the sensor.
        inputs.hasGamePiece = m_intakeSim.getGamePiecesAmount() > 0;
    }

    /** One tick of pretend reality: our voltage in, its motion back out. */
    private void stepSim() {
        m_pivotSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_model.setInputVoltage(m_pivotSim.getMotorVoltage());
        m_model.update(0.020);

        // The model speaks radians; the motor's sim state speaks rotor rotations.
        m_pivotSim.setRawRotorPosition(
                Radians.of(m_model.getAngleRads()).in(Rotations) * ArmConstants.kGearRatio);
        m_pivotSim.setRotorVelocity(
                RadiansPerSecond.of(m_model.getVelocityRadPerSec()).in(RotationsPerSecond)
                        * ArmConstants.kGearRatio);

        m_rollerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_rollerModel.setInputVoltage(m_rollerSim.getMotorVoltage());
        m_rollerModel.update(0.020);
        m_rollerSim.setRawRotorPosition(m_rollerModel.getAngularPositionRotations());
        m_rollerSim.setRotorVelocity(m_rollerModel.getAngularVelocityRPM() / 60.0);
    }
}
