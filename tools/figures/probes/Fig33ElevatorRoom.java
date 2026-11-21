package first.robot.figures;

import static org.wpilib.units.Units.Seconds;
import static org.wpilib.units.Units.Volts;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Command;
import org.wpilib.command3.Scheduler;
import org.wpilib.command3.sysid.SysIdRoutine;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.subsystems.Elevator;
import first.robot.subsystems.ElevatorIO;
import first.robot.subsystems.ElevatorIO.ElevatorIOInputs;

/**
 * Data for Lesson 33's Figure 33.4: how far the real elevator travels under a SysId ramp or step.
 * The real {@code Elevator} and its real {@code ElevatorIOSim} / {@code ElevatorIOTalonFX} are
 * driven open loop through a real {@code SysIdRoutine} (quasistatic or dynamic, forward), on the
 * Lesson 33 state with the physics widened to +-20 m and started at 0 (the generator's docstring
 * gives the {@code --replace} lines). Settings come from the environment: {@code MODE} is
 * {@code ramp} or {@code step}; {@code RATE} (V/s) for a ramp; {@code VOLTS} for a step.
 *
 * <p>RIG method: Elevator built after {@code HAL.initialize()}, robot enabled, {@code
 * Scheduler.run()} on a fixed 20 ms deadline schedule. For 2 s before the test a command holds
 * 0.194 V so the carriage does not sink first (an unpowered sim carriage falls at 1.96 cm/s).
 * One scenario per JVM, because the elevator holds DIO 0.
 *
 * <p>One row per tick: seconds since the test started (wall clock, which is the routine's own
 * timer), the voltage the motor applied, and the carriage height.
 */
public class Fig33ElevatorRoom {
  private static final long PERIOD_NANOS = 20_000_000L;

  @Test
  void record() throws Exception {
    String mode = System.getenv().getOrDefault("MODE", "ramp");
    double rate = Double.parseDouble(System.getenv().getOrDefault("RATE", "1.0"));
    double volts = Double.parseDouble(System.getenv().getOrDefault("VOLTS", "7.0"));

    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Elevator elevator = new Elevator();
    Field fi = elevator.getClass().getDeclaredField("m_io");
    fi.setAccessible(true);
    ElevatorIO io = (ElevatorIO) fi.get(elevator);
    Field fn = elevator.getClass().getDeclaredField("m_inputs");
    fn.setAccessible(true);
    ElevatorIOInputs inputs = (ElevatorIOInputs) fn.get(elevator);

    SysIdRoutine.Config config = mode.equals("ramp")
        ? SysIdRoutine.Config.useDataLog(Volts.of(rate).per(Seconds), Volts.of(7), Seconds.of(6.0 / rate + 1))
        : SysIdRoutine.Config.useDataLog(Volts.of(1).per(Seconds), Volts.of(volts), Seconds.of(1.5));
    SysIdRoutine routine = new SysIdRoutine(config, new SysIdRoutine.SysIdMechanism(
        v -> io.setVoltage(v.in(Volts)),
        log -> log.motor("elevator").voltage(Volts.of(inputs.appliedVolts)),
        elevator, "elevator"));

    StringBuilder csv = new StringBuilder("t_s,applied_v,height_m\n");
    long next = System.nanoTime();
    Command hold = elevator.runRepeatedly(() -> io.setVoltage(0.194)).named("Hold");
    Scheduler.getDefault().schedule(hold);
    for (int i = 0; i < 100; i++) {
      next = tick(next);
    }
    Scheduler.getDefault().cancel(hold);
    Command test = mode.equals("ramp")
        ? routine.quasistatic(SysIdRoutine.Direction.FORWARD)
        : routine.dynamic(SysIdRoutine.Direction.FORWARD);
    Scheduler.getDefault().schedule(test);
    long start = System.nanoTime();
    double seconds = mode.equals("ramp") ? 6.0 / rate + 0.5 : 1.7;
    while ((System.nanoTime() - start) / 1e9 < seconds) {
      next = tick(next);
      csv.append(String.format("%.3f,%.4f,%.5f%n", (System.nanoTime() - start) / 1e9,
          inputs.appliedVolts, inputs.heightMeters));
    }
    Path out = Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig33-room.csv"));
    Files.writeString(out, csv);
    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }

  private static long tick(long next) throws InterruptedException {
    Scheduler.getDefault().run();
    next += PERIOD_NANOS;
    long wait = next - System.nanoTime();
    if (wait > 0) {
      Thread.sleep(wait / 1_000_000L, (int) (wait % 1_000_000L));
    }
    return next;
  }
}
