package first.robot.figures;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.Drivetrain;

/**
 * Data for Lesson 8's turn-to-heading figure: one tap of the bottom face button,
 * {@code turnToHeading(90)} from a standstill at 0 degrees, on the Lesson 8 state.
 *
 * <p>Runs the real {@code Drivetrain} through the scheduler with the robot
 * enabled, on a fixed 20 ms schedule, the way {@code Robot} does it:
 * {@code Scheduler.run()}, then {@code drivetrain.simulatePeriodic()}. It holds
 * still for two seconds first, then schedules the command. One row per tick, read
 * right after the scheduler ran and before the physics step, so the heading is the
 * value the command acted on: seconds since the request; the heading in degrees;
 * the error {@code 90 - heading}; the commanded rotation rate {@code omega} the
 * command passed to {@code commandRotation} that tick (a fraction of 360 deg/s,
 * read from {@code m_lastCommandedOmega}); and whether the command was still
 * running after the tick.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see tools/figures/README.md.
 */
public class Fig08TurnToHeading {
  private static final long PERIOD_NANOS = 20_000_000L;
  private static final int WARMUP_TICKS = 100; // 2 s standing still
  private static final int RECORD_TICKS = 150; // 3 s from the request
  private static final double TARGET = 90.0;

  @Test
  void recordOneTurn() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Drivetrain drivetrain = new Drivetrain();
    Field omegaField = Drivetrain.class.getDeclaredField("m_lastCommandedOmega");
    omegaField.setAccessible(true);

    long next = System.nanoTime();
    for (int i = 0; i < WARMUP_TICKS; i++) {
      Scheduler.getDefault().run();
      drivetrain.simulatePeriodic();
      next = sleepUntilNext(next);
    }

    StringBuilder csv = new StringBuilder("t_s,heading_deg,error_deg,omega,running\n");
    Command turn = drivetrain.turnToHeading(TARGET);
    Scheduler.getDefault().schedule(turn);
    for (int i = 0; i < RECORD_TICKS; i++) {
      Scheduler.getDefault().run();
      double heading = drivetrain.getHeadingDegrees();
      csv.append(String.format("%.2f,%.5f,%.5f,%.6f,%d%n",
          i * 0.02, heading, TARGET - heading, omegaField.getDouble(drivetrain),
          Scheduler.getDefault().isRunning(turn) ? 1 : 0));
      drivetrain.simulatePeriodic();
      next = sleepUntilNext(next);
    }

    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig08.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  private static long sleepUntilNext(long next) throws InterruptedException {
    next += PERIOD_NANOS;
    long wait = next - System.nanoTime();
    if (wait > 0) {
      Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
    }
    return next;
  }
}
