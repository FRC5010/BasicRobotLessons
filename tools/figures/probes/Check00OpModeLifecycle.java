package first.robot.figures;

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
import org.wpilib.simulation.GamepadSim;

import first.robot.Robot;

/** Counts MyTeleop's lifecycle calls (bumped by --replace edits) over three enable cycles. */
public class Check00OpModeLifecycle {
  private static final CountDownLatch done = new CountDownLatch(1);
  private static final StringBuilder out = new StringBuilder("tick,event,ctor,start,end,close,drive\n");
  private static GamepadSim pad;
  private static int tick;
  private static String last = "";

  @Test
  void cycles() throws Exception {
    HAL.initialize();
    pad = new GamepadSim(0);
    pad.setButtonsAvailable(-1L);
    pad.setAxesAvailable(0x3F);
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(false);
    DriverStationSim.notifyNewData();
    Thread t = new Thread(() -> {
      Robot r = new Robot();
      Scheduler.getDefault().addPeriodic(Check00OpModeLifecycle::sample);
      r.startCompetition();
    }, "robot");
    t.setDaemon(true);
    t.start();
    if (!done.await(120, TimeUnit.SECONDS)) {
      throw new AssertionError("timed out");
    }
    Files.writeString(Path.of(System.getenv().getOrDefault("FIGURE_OUT", "lc.csv")), out);
  }

  private static int n(String k) {
    return Integer.getInteger("lc." + k, 0);
  }

  private static void sample() {
    tick++;
    String ev = "";
    if (tick == 25) {
      for (OpModeOption o : DriverStationSim.getOpModeOptions()) {
        if (o.getMode() == RobotMode.TELEOPERATED) {
          DriverStationSim.setRobotMode(o.getMode());
          DriverStationSim.setOpMode(o.id);
          break;
        }
      }
      ev = "select";
    }
    for (int c = 0; c < 3; c++) {
      int base = 50 + c * 100;
      if (tick == base) { DriverStationSim.setEnabled(true); ev = "enable" + (c + 1); }
      if (tick == base + 20) { pad.setFaceDownButton(true); ev = "press" + (c + 1); }
      if (tick == base + 30) { pad.setFaceDownButton(false); ev = "release" + (c + 1); }
      if (tick == base + 50) { DriverStationSim.setEnabled(false); ev = "disable" + (c + 1); }
    }
    if (!ev.isEmpty()) {
      pad.notifyNewData();
      DriverStationSim.notifyNewData();
    }
    String now = n("ctor") + "," + n("start") + "," + n("end") + "," + n("close") + "," + n("drive");
    if (!ev.isEmpty() || !now.equals(last)) {
      out.append(tick).append(',').append(ev).append(',').append(now).append('\n');
      last = now;
    }
    if (tick >= 400) {
      done.countDown();
    }
  }
}
