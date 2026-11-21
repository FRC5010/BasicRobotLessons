package first.robot.figures;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.Elevator;

/**
 * Data for Lesson 31's homing-test figure: the lesson's own ElevatorHomingTest, step for step, with
 * the sleep taken from the environment ({@code SLEEP_MS}, default 20), logging one row per call to
 * tick(): tick index, wall milliseconds since the first tick, the elevator's height reading,
 * isHomed and atBottomLimit, and the phase (0 arrange, 1 homing, 2 settle). Run it in a fresh JVM
 * per setting and per run (see 31-homing-test-height.py's docstring).
 */
public class Fig31HomingHeight {
  private static final StringBuilder csv =
      new StringBuilder("tick,wall_ms,height_m,homed,at_bottom,phase\n");
  private static int n = 0;
  private static long t0 = 0;
  private static int sleepMs = Integer.parseInt(System.getenv().getOrDefault("SLEEP_MS", "20"));

  private static void tick(Elevator e, int phase) {
    Scheduler.getDefault().run();
    try {
      if (sleepMs > 0) {
        Thread.sleep(sleepMs);
      }
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
    }
    if (n == 0) {
      t0 = System.nanoTime();
    }
    csv.append(String.format("%d,%.1f,%.5f,%d,%d,%d%n", n++, (System.nanoTime() - t0) / 1e6,
        e.getHeightMeters(), e.isHomed() ? 1 : 0, e.atBottomLimit() ? 1 : 0, phase));
  }

  @Test
  void homing() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Elevator elevator = new Elevator();
    for (int i = 0; i < 3; i++) {
      tick(elevator, 0);
    }
    Scheduler.getDefault().schedule(elevator.home());
    for (int i = 0; i < 300 && !elevator.isHomed(); i++) {
      tick(elevator, 1);
    }
    for (int i = 0; i < 3; i++) {
      tick(elevator, 2);
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig31.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }
}
