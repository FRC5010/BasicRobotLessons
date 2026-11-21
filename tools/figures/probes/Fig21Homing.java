package first.robot.figures;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.OpModeOption;
import org.wpilib.hardware.hal.RobotMode;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.ElevatorSim;

import first.robot.Robot;
import first.robot.subsystems.Elevator;
import first.robot.subsystems.ElevatorIO.ElevatorIOInputs;

/**
 * Data for Lesson 21's belief-against-truth figure: the encoder's reading and the
 * carriage's real height while the elevator sinks and then lands on the limit switch,
 * on the Lesson 21 state.
 *
 * <p>The real {@code Robot} loop (CLAUDE.md's Lesson 25 recipe: built on its own thread
 * after {@code HAL.initialize()}, a sampler registered with {@code Scheduler.addPeriodic}
 * after every robot periodic, driver-station changes made from the sampler), never
 * enabled. The Teleoperated opmode is selected {@code SELECT_AT_S} seconds in
 * (environment variable, default 3): the re-zero {@code Trigger} lives in
 * {@code RobotTeleop}, so it exists only once Teleoperated is selected. One row per
 * 20 ms tick for {@code RECORD_S} seconds (default 25): seconds since the first robot
 * cycle; the encoder's belief ({@code Elevator/HeightMeters}); the carriage's true height,
 * read by reflection from the {@code ElevatorSim} inside {@code ElevatorIOSim} (the log
 * never holds it); and the {@code Elevator/AtBottomLimit} reading.
 *
 * <p>Run it with {@code tools/figures/measure.sh}; see the generator's docstring.
 */
public class Fig21Homing {
  private static final double SELECT_AT_S = Double.parseDouble(System.getenv().getOrDefault("SELECT_AT_S", "3"));
  private static final double RECORD_S = Double.parseDouble(System.getenv().getOrDefault("RECORD_S", "25"));

  private static volatile Robot robot;
  private static ElevatorIOInputs inputs;
  private static ElevatorSim model;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder("t_s,belief_m,truth_m,at_bottom_limit\n");
  private static int tick = 0;

  @Test
  void sinkAndLand() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();

    Thread t = new Thread(() -> {
      Robot r = new Robot();
      try {
        Elevator e = r.elevator;
        inputs = (ElevatorIOInputs) field(e, "m_inputs");
        Object io = field(e, "m_io");
        model = (ElevatorSim) field(io, "m_elevatorModel");
      } catch (ReflectiveOperationException ex) {
        throw new RuntimeException(ex);
      }
      robot = r;
      Scheduler.getDefault().addPeriodic(Fig21Homing::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(180, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Files.writeString(Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig21.csv")), csv);
  }

  private static void sample() {
    tick++;
    double t = tick * 0.02;
    if (tick == (int) Math.round(SELECT_AT_S / 0.02)) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.getMode() == RobotMode.TELEOPERATED) {
          DriverStationSim.setRobotMode(o.getMode());
          DriverStationSim.setOpMode(o.id);
          break;
        }
      }
      DriverStationSim.notifyNewData();
    }
    csv.append(String.format("%.2f,%.5f,%.5f,%d%n", t, inputs.heightMeters, model.getPosition(),
        inputs.atBottomLimit ? 1 : 0));
    if (t >= RECORD_S) {
      done.countDown();
    }
  }

  private static Object field(Object owner, String name) throws ReflectiveOperationException {
    Field f = owner.getClass().getDeclaredField(name);
    if (!f.canAccess(owner)) {
      f.setAccessible(true);
    }
    return f.get(owner);
  }
}
