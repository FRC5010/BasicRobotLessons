package first.robot.figures;

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

import first.robot.Robot;

/**
 * Records the drive behind Lesson 13's Figure 13.3 (the "* 1.1" experiment) on the Lesson 13
 * state, in SIM. Follows CLAUDE.md's Lesson 25 probe recipe: the real {@code Robot} on its own
 * thread after {@code HAL.initialize()}, a sampler registered after every robot periodic makes
 * every driver-station and gamepad change between cycles. RobotTeleop is selected at tick 75
 * and enabled at tick 105 (time zero). Then, at quarter stick: forward 0-3 s, left 3-6 s, forward
 * and right 6-9 s, and the bottom face button tapped at 4 s (turn to 90 degrees), ten seconds
 * in all. The recording is AdvantageKit's {@code akit_*.wpilog} in the sandbox's logs folder.
 * The generator's docstring says how that is replayed, with and without the 1.1.
 */
public class Fig13ReplayScaled {
  private static final int SELECT_TICK = 75;
  private static final int ENABLE_TICK = 105;
  private static final int END_TICK = ENABLE_TICK + 550;

  private static GamepadSim pad;
  private static final CountDownLatch done = new CountDownLatch(1);
  private static int tick = 0;

  @Test
  void recordDrive() throws Exception {
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
      Scheduler.getDefault().addPeriodic(Fig13ReplayScaled::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();

    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("probe timed out");
    }
    Thread.sleep(1000);
    Logger.end();
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig13.csv"));
    Files.writeString(out, "recorded\n");
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
    int s = tick - ENABLE_TICK; // ticks since enable, 50 per second
    if (s == 0) { pad.setLeftY(-0.25); pad.notifyNewData(); }                       // forward
    if (s == 150) { pad.setLeftY(0.0); pad.setLeftX(-0.25); pad.notifyNewData(); }  // left
    if (s == 200) { pad.setFaceDownButton(true); pad.notifyNewData(); }            // turn to 90
    if (s == 210) { pad.setFaceDownButton(false); pad.notifyNewData(); }
    if (s == 300) { pad.setLeftX(0.25); pad.setLeftY(-0.25); pad.notifyNewData(); }  // forward and right
    if (s == 450) { pad.setLeftX(0.0); pad.setLeftY(0.0); pad.notifyNewData(); }
    if (tick == END_TICK) {
      DriverStationSim.setEnabled(false);
      DriverStationSim.notifyNewData();
      done.countDown();
    }
  }
}
