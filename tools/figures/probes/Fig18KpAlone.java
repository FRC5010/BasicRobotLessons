package first.robot.figures;

import static org.wpilib.units.Units.Meters;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.units.measure.Distance;

import first.robot.Constants.ElevatorConstants;
import first.robot.subsystems.Elevator;
import first.robot.subsystems.ElevatorIO.ElevatorIOInputs;

/**
 * Data for Lesson 18's "kP alone" figure: one move from stowed to kScoreMid and
 * the hold after it, on the Lesson 18 state. Run it once as shipped and once with
 * kElevatorKG, kElevatorKV and kElevatorKA zeroed (measure.sh --replace), so only
 * kP = 20 is left.
 *
 * <p>Same method as {@code Fig18HeightSetpointGoal}: the real {@code Elevator} and
 * {@code ElevatorIOSim} through the scheduler, enabled, on a fixed 20 ms schedule,
 * two seconds holding stowed and two practice round trips first. Writes one row
 * per tick of the recorded move and hold, with the same six columns.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see tools/figures/README.md.
 */
public class Fig18KpAlone {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100; // 2 s holding stowed
  private static final int RECORD_TICKS = 300; // 6 s from the request: the move and a long hold
  private static final int PRACTICE_ROUND_TRIPS = 2;

  @Test
  void recordOneMove() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Elevator elevator = new Elevator();
    ElevatorIOInputs inputs = (ElevatorIOInputs) field(elevator, "m_inputs");

    long next = System.nanoTime();
    Scheduler.getDefault().schedule(elevator.goToHeight(ElevatorConstants.kStowed));
    for (int i = 0; i < WARMUP_TICKS; i++) {
      next = tick(next);
    }
    for (int trip = 0; trip < PRACTICE_ROUND_TRIPS; trip++) {
      Scheduler.getDefault().schedule(elevator.goToHeight(ElevatorConstants.kScoreMid));
      for (int i = 0; i < RECORD_TICKS; i++) {
        next = tick(next);
      }
      Scheduler.getDefault().schedule(elevator.goToHeight(ElevatorConstants.kStowed));
      for (int i = 0; i < RECORD_TICKS; i++) {
        next = tick(next);
      }
    }

    StringBuilder csv = new StringBuilder("t_s,goal_m,setpoint_m,height_m,velocity_mps,applied_v\n");
    Scheduler.getDefault().schedule(elevator.goToHeight(ElevatorConstants.kScoreMid));
    for (int i = 0; i < RECORD_TICKS; i++) {
      next = tick(next);
      double goal = ((Distance) field(elevator, "m_goal")).in(Meters);
      csv.append(String.format("%.2f,%.6f,%.6f,%.6f,%.6f,%.4f%n",
          i * 0.02, goal, inputs.setpointMeters, inputs.heightMeters,
          inputs.velocityMetersPerSec, inputs.appliedVolts));
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig18-kp.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  /** One robot tick on a fixed schedule: run the scheduler, then sleep to the next deadline. */
  private static long tick(long next) throws InterruptedException {
    Scheduler.getDefault().run();
    next += PERIOD_NANOS;
    long wait = next - System.nanoTime();
    if (wait > 0) {
      Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
    }
    return next;
  }

  private static Object field(Object owner, String name) throws ReflectiveOperationException {
    Field f = owner.getClass().getDeclaredField(name);
    f.setAccessible(true);
    return f.get(owner);
  }
}
