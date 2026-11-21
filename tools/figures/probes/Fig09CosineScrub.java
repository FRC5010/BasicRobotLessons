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

import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.SwerveModule;

/**
 * Data for Lesson 9's cosine figure: {@code driveDistance(1.0)} runs to its end, then
 * {@code turnToHeading(90)} is scheduled (the same hand-off Lesson 9's sequence makes),
 * on the Lesson 9 state. Real {@code Drivetrain}, enabled, fixed 20 ms schedule
 * ({@code Scheduler.run()}, then {@code simulatePeriodic()}). One row per tick of the turn,
 * module 0 only: seconds since the turn was scheduled; its steer angle; its drive throttle
 * (applied volts / 12 from its sim state); the heading. Run once as shipped and once with
 * the cosine line replaced (see the generator's docstring).
 */
public class Fig09CosineScrub {
  private static final long PERIOD_NANOS = 20_000_000L;

  @Test
  void record() throws Exception {
    HAL.initialize();
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();

    Drivetrain dt = new Drivetrain();
    Field mf = Drivetrain.class.getDeclaredField("m_modules");
    mf.setAccessible(true);
    SwerveModule m0 = ((SwerveModule[]) mf.get(dt))[0];
    Field sf = SwerveModule.class.getDeclaredField("m_driveSim");
    sf.setAccessible(true);
    TalonFXSimState sim = (TalonFXSimState) sf.get(m0);

    long next = System.nanoTime();
    for (int i = 0; i < 100; i++) {
      Scheduler.getDefault().run();
      dt.simulatePeriodic();
      next = sleep(next);
    }
    Command drive = dt.driveDistance(1.0);
    Scheduler.getDefault().schedule(drive);
    int guard = 0;
    do {
      Scheduler.getDefault().run();
      dt.simulatePeriodic();
      next = sleep(next);
    } while (Scheduler.getDefault().isRunning(drive) && ++guard < 1000);

    StringBuilder csv = new StringBuilder("t_s,steer_deg,throttle,applied_v,heading_deg\n");
    Command turn = dt.turnToHeading(90);
    Scheduler.getDefault().schedule(turn);
    for (int i = 0; i < 100; i++) { // 2 s
      Scheduler.getDefault().run();
      csv.append(String.format("%.2f,%.4f,%.5f,%.5f,%.4f%n", i * 0.02, m0.getSteerAngleDegrees(),
          sim.getMotorVoltage() / 12.0, sim.getMotorVoltage(), dt.getHeadingDegrees()));
      dt.simulatePeriodic();
      next = sleep(next);
    }
    Files.writeString(Path.of(System.getenv().getOrDefault("FIGURE_OUT", "fig09.csv")), csv);
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
