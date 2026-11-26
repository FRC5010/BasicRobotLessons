package first.robot;

import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;

import org.wpilib.tunable.Tunable;
import org.wpilib.tunable.TunableConfig;
import org.wpilib.tunable.TunableDouble;
import org.wpilib.tunable.Tunables;

/**
 * Makes tunables: numbers SimGUI (or any dashboard) can change while the robot runs. Every
 * tunable in the robot is made here, so a rule about all of them has one place to live.
 */
public final class Tuning {
  private Tuning() {} // only static methods; nothing to build

  /**
   * The settings every tunable starts from. A dashboard can change a tunable only while
   * Constants.kTuningMode is true; with it false, the value still shows, but typing a new
   * one changes nothing.
   */
  private static TunableConfig config() {
    return new TunableConfig().withMutable(Constants.kTuningMode);
  }

  /** A tunable number, published under 'name', that starts at 'initial'. */
  public static TunableDouble number(String name, double initial) {
    TunableDouble tunable = TunableDouble.createConfig(initial, config());
    Tunables.publish(name, tunable);
    return tunable;
  }

  /** The same, and 'onTune' runs each time a dashboard changes the number. */
  public static TunableDouble number(String name, double initial, Runnable onTune) {
    TunableDouble tunable = TunableDouble.createConfig(initial, config().withOnTune(onTune));
    Tunables.publish(name, tunable);
    return tunable;
  }

  /**
   * A tunable for a number something else already holds: it publishes what 'getter'
   * returns, and hands a dashboard's new value to 'setter'.
   */
  public static TunableDouble property(String name, DoubleSupplier getter, DoubleConsumer setter) {
    return Tunables.publishDouble(name, getter, setter, config());
  }

  /** A tunable measure (a Distance, a LinearVelocity, ...), shown in its base unit. */
  public static <T> Tunable<T> value(String name, T initial) {
    Tunable<T> tunable = Tunable.createConfig(initial, config());
    Tunables.publish(name, tunable);
    return tunable;
  }

  /** The same, and 'onTune' runs each time a dashboard changes the measure. */
  public static <T> Tunable<T> value(String name, T initial, Runnable onTune) {
    Tunable<T> tunable = Tunable.createConfig(initial, config().withOnTune(onTune));
    Tunables.publish(name, tunable);
    return tunable;
  }
}
