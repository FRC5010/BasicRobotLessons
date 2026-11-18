package first.robot.figures;

import static org.wpilib.units.Units.Meters;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import org.littletonrobotics.junction.Logger;
import org.wpilib.command3.Scheduler;
import org.wpilib.hardware.hal.AllianceStationID;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.hal.OpModeOption;
import org.wpilib.simulation.DriverStationSim;
import org.wpilib.simulation.GamepadSim;
import org.wpilib.units.measure.Distance;

import first.robot.Robot;

/**
 * Data for Lesson 32's figures: one recorded "match" with the typo tolerance, on the Lesson 32
 * state with {@code kTolerance = Centimeters.of(0.00002)} (the generator's docstring gives the
 * {@code --replace}).
 *
 * <p>Follows CLAUDE.md's Lesson 25 probe recipe and the Lesson 32 notes: the real {@code Robot}
 * is built on its own thread after {@code HAL.initialize()}, a sampler registered with
 * {@code Scheduler.addPeriodic} after every robot periodic makes every driver-station and
 * gamepad change between cycles. RobotTeleop is selected at tick 75 and enabled at tick 105
 * (time zero). Back homes the elevator 0.5 s later; at 5 s D-pad right sends the goal to
 * {@code kScoreMid} (0.75 m); at 11 s D-pad down stows it; at 17 s D-pad right again. The run
 * ends at 24 s. AdvantageKit writes the {@code akit_*.wpilog} into the sandbox's logs folder
 * (read it with tools/figures/wpilog.py); this probe also writes one CSV row per tick as a
 * cross-check: seconds since enable, goal, height, and what {@code atGoal()} said.
 */
public class Fig32AtGoalMatch {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int BACK_TICK = ENABLE_TICK + 25;
  private static final int[] PRESS_TICKS = {ENABLE_TICK + 250, ENABLE_TICK + 550, ENABLE_TICK + 850};
  private static final int END_TICK = ENABLE_TICK + 1200;

  private static volatile Robot robot;
  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder csv = new StringBuilder("t_s,goal_m,height_m,at_goal\n");
  private static int tick = 0;

  @Test
  void recordMatch() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setAllianceStationId(AllianceStationID.BLUE_1);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();
    pad = new GamepadSim(0);
    pad.setButtonsAvailable(-1L);
    pad.setAxesAvailable(0x3F);
    pad.notifyNewData();

    Thread t = new Thread(() -> {
      Robot r = new Robot();
      robot = r;
      Scheduler.getDefault().addPeriodic(Fig32AtGoalMatch::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Thread.sleep(1000);
    Logger.end();
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig32.csv"));
    Files.writeString(out, csv);
  }

  private static void sample() {
    tick++;
    if (tick == SELECT_TICK) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.name.equals("RobotTeleop")) {
          DriverStationSim.setRobotMode(o.getMode());
          DriverStationSim.setOpMode(o.id);
        }
      }
      DriverStationSim.notifyNewData();
    }
    if (tick == ENABLE_TICK) {
      DriverStationSim.setEnabled(true);
      DriverStationSim.notifyNewData();
    }
    if (tick == BACK_TICK) {
      pad.setBackButton(true);
      pad.notifyNewData();
    }
    if (tick == BACK_TICK + 5) {
      pad.setBackButton(false);
      pad.notifyNewData();
    }
    for (int i = 0; i < PRESS_TICKS.length; i++) {
      boolean right = i != 1; // the middle press is D-pad down (stow)
      if (tick == PRESS_TICKS[i]) {
        if (right) {
          pad.setDpadRightButton(true);
        } else {
          pad.setDpadDownButton(true);
        }
        pad.notifyNewData();
      }
      if (tick == PRESS_TICKS[i] + 5) {
        pad.setDpadRightButton(false);
        pad.setDpadDownButton(false);
        pad.notifyNewData();
      }
    }
    if (tick > ENABLE_TICK && tick <= END_TICK) {
      try {
        Field f = robot.elevator.getClass().getDeclaredField("m_goal");
        f.setAccessible(true);
        double goal = ((Distance) f.get(robot.elevator)).in(Meters);
        csv.append(String.format("%.2f,%.6f,%.6f,%d%n", (tick - ENABLE_TICK) * 0.02, goal,
            robot.elevator.getHeightMeters(), robot.elevator.atGoal() ? 1 : 0));
      } catch (ReflectiveOperationException e) {
        throw new RuntimeException(e);
      }
    }
    if (tick == END_TICK) {
      done.countDown();
    }
  }
}
