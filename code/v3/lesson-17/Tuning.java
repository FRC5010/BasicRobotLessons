package first.robot;

import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;

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
   * ====== NEXT LESSON: ADD CODE HERE ======
   * One method that makes the settings every tunable starts from, so a single
   * switch in Constants can lock them all.
   */

  /** A tunable number, published under 'name', that starts at 'initial'. */
  public static TunableDouble number(String name, double initial) {
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Start from the shared settings instead of fresh ones.
     */
    TunableDouble tunable = TunableDouble.createConfig(initial, new TunableConfig());
    Tunables.publish(name, tunable);
    return tunable;
  }

  /** The same, and 'onTune' runs each time a dashboard changes the number. */
  public static TunableDouble number(String name, double initial, Runnable onTune) {
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Start from the shared settings, then add the callback.
     */
    TunableDouble tunable =
        TunableDouble.createConfig(initial, new TunableConfig().withOnTune(onTune));
    Tunables.publish(name, tunable);
    return tunable;
  }

  /**
   * A tunable for a number something else already holds: it publishes what 'getter'
   * returns, and hands a dashboard's new value to 'setter'.
   */
  public static TunableDouble property(String name, DoubleSupplier getter, DoubleConsumer setter) {
    /**
     * ====== NEXT LESSON: CHANGE THE CODE BELOW ======
     * Use the shared settings here too.
     */
    return Tunables.publishDouble(name, getter, setter, new TunableConfig());
  }

  /**
   * ====== NEXT LESSON: ADD CODE HERE ======
   * Two more makers, for tunable measures such as a Distance or a speed: one
   * plain, and one that runs a callback when a dashboard changes it.
   */
}
