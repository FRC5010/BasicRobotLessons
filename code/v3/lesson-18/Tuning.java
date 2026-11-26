package first.robot;

import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;
import java.util.function.Supplier;

import org.wpilib.tunable.TunableConfig;
import org.wpilib.tunable.TunableDouble;
import org.wpilib.tunable.Tunables;
import org.wpilib.units.Measure;
import org.wpilib.units.Unit;

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

  /**
   * A tunable measure, such as a Distance or an angle. A dashboard shows it as a plain number
   * in 'unit' (Centimeters or Degrees, say), and your code gets it back as a measure: call
   * get() on what this returns, each time you use it.
   */
  public static <U extends Unit, M extends Measure<U>> Supplier<M> value(
      String name, M initial, U unit) {
    TunableDouble number = number(name, initial.in(unit));
    return () -> measureOf(number.get(), unit);
  }

  /** The same, and 'onTune' runs each time a dashboard changes the measure. */
  public static <U extends Unit, M extends Measure<U>> Supplier<M> value(
      String name, M initial, U unit, Runnable onTune) {
    TunableDouble number = number(name, initial.in(unit), onTune);
    return () -> measureOf(number.get(), unit);
  }

  /** The number 'value' in 'unit', as the same kind of measure the tunable started from. */
  @SuppressWarnings("unchecked") // unit.of() is only declared to return "some measure"
  private static <U extends Unit, M extends Measure<U>> M measureOf(double value, U unit) {
    return (M) unit.of(value);
  }
}
