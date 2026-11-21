package first.robot.figures;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import com.ctre.phoenix6.sim.TalonFXSimState;

import first.robot.subsystems.DriveModule;

/**
 * Data for Lesson 6's driveDistance trace: one {@code driveDistance(1.0, 0.4)} from a
 * standstill on the Lesson 6 state. Real {@code DriveModule} through the scheduler,
 * enabled, fixed 20 ms schedule ({@code Scheduler.run()}, then {@code simulatePeriodic()}),
 * 2 s of warm-up first. One row per tick, read after the scheduler ran and before the
 * physics step: seconds since the request; {@code getDistanceMeters()}; the throttle the
 * drive motor was last told (applied volts / 12, read from its sim state; the 3 V stator
 * limit can clip it at the start); whether the command was still running after the tick.
 * Keeps recording for FIGURE_SECONDS (default 4) so the coast shows.
 */
public class Fig06DriveDistance {
  private static final long PERIOD_NANOS = 20_000_000L;

  @Test
  void record() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    DriveModule module = new DriveModule();
    Field f = DriveModule.class.getDeclaredField("m_driveSim");
    f.setAccessible(true);
    TalonFXSimState sim = (TalonFXSimState) f.get(module);

    long next = System.nanoTime();
    for (int i = 0; i < 100; i++) {
      Scheduler.getDefault().run();
      module.simulatePeriodic();
      next = sleep(next);
    }
    int ticks = (int) Math.round(Double.parseDouble(System.getenv().getOrDefault("FIGURE_SECONDS", "4")) / 0.02);
    StringBuilder csv = new StringBuilder("t_s,distance_m,throttle,applied_v,running\n");
    Command cmd = module.driveDistance(1.0, 0.4);
    Scheduler.getDefault().schedule(cmd);
    for (int i = 0; i < ticks; i++) {
      Scheduler.getDefault().run();
      csv.append(String.format("%.2f,%.5f,%.5f,%.5f,%d%n", i * 0.02, module.getDistanceMeters(),
          sim.getMotorVoltage() / 12.0, sim.getMotorVoltage(), Scheduler.getDefault().isRunning(cmd) ? 1 : 0));
      module.simulatePeriodic();
      next = sleep(next);
    }
    Files.writeString(Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig06.csv")), csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  private static long sleep(long next) throws InterruptedException {
    next += PERIOD_NANOS;
    long wait = next - System.nanoTime();
    if (wait > 0) {
      Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
    }
    return next;
  }
}
