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
 * Data for Lesson 18's goal / setpoint / height figure: one move from stowed to
 * the top of the travel, on the Lesson 18 state.
 *
 * <p>Runs the real {@code Elevator} and {@code ElevatorIOSim} through the scheduler
 * with the robot enabled, on a fixed 20 ms schedule (each tick waits for the next
 * deadline, not 20 ms after its own work), after two seconds of holding stowed.
 * Writes one row per tick: seconds since the move was requested, then the goal,
 * the profile's setpoint and the measured height, all in meters.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see tools/figures/README.md.
 */
public class Fig18HeightSetpointGoal {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100; // 2 s holding stowed
  private static final int RECORD_TICKS = 175; // 3.5 s from the request

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

    StringBuilder csv = new StringBuilder("t_s,goal_m,setpoint_m,height_m\n");
    Scheduler.getDefault().schedule(elevator.goToHeight(ElevatorConstants.kMaxHeight));
    for (int i = 0; i < RECORD_TICKS; i++) {
      next = tick(next);
      double goal = ((Distance) field(elevator, "m_goal")).in(Meters);
      csv.append(String.format("%.2f,%.6f,%.6f,%.6f%n",
          i * 0.02, goal, inputs.setpointMeters, inputs.heightMeters));
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig18.csv"));
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
