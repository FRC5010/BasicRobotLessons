package claims;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.wpilib.units.Units.MetersPerSecond;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.hardware.led.AddressableLED;
import org.wpilib.hardware.led.AddressableLEDBuffer;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.kinematics.SwerveModuleVelocity;
import org.wpilib.math.util.MathUtil;
import org.wpilib.math.util.Units;
import org.wpilib.simulation.AddressableLEDSim;
import org.wpilib.system.RobotController;
import org.wpilib.system.Timer;
import org.wpilib.util.Color;
import org.wpilib.util.Color8Bit;

/**
 * Tier A claims about WPILib (tools/claims/registry/wpilib.toml): what exists, what doesn't, and
 * a few results of pure math. Each test's display name is the claim it checks. Run with
 * tools/claims/run-java-tests.sh.
 */
class WpilibApiTest {
  @BeforeAll
  static void hal() {
    assertTrue(HAL.initialize());
  }

  @AfterAll
  static void shutdown() {
    HAL.shutdown();
  }

  @Test
  @DisplayName("wpilib.no-mathutil-clamp")
  void noMathUtilClamp() {
    assertTrue(Reflect.methods(MathUtil.class, "clamp").isEmpty(),
        "MathUtil.clamp exists now; Lessons 5, 7, 8, 11, 18, 20 and 28 say it doesn't: "
            + Reflect.methods(MathUtil.class, "clamp"));
  }

  @Test
  @DisplayName("wpilib.mathutil-helpers")
  void mathUtilHelpers() {
    assertEquals(170.0, MathUtil.inputModulus(-190.0, -180.0, 180.0), 1e-12);
    assertEquals(0.25, Units.radiansToRotations(Math.PI / 2), 1e-12);
  }

  @Test
  @DisplayName("wpilib.mathutil-apply-deadband")
  void applyDeadband() {
    assertEquals(0.0, MathUtil.applyDeadband(0.05, 0.1), 0.0);
    assertEquals(0.0, MathUtil.applyDeadband(-0.1, 0.1), 0.0);
    // Rescaled smoothly: just past the band is just past 0, the middle of the rest is the middle,
    // full scale stays full scale.
    assertEquals(0.0, MathUtil.applyDeadband(0.1 + 1e-9, 0.1), 1e-6);
    assertEquals(0.5, MathUtil.applyDeadband(0.55, 0.1), 1e-12);
    assertEquals(-0.5, MathUtil.applyDeadband(-0.55, 0.1), 1e-12);
    assertEquals(1.0, MathUtil.applyDeadband(1.0, 0.1), 1e-12);
  }

  @Test
  @DisplayName("wpilib.swerve-module-velocity-cosine-scale")
  void cosineScale() {
    var wheel = new SwerveModuleVelocity(MetersPerSecond.of(2.0), Rotation2d.fromDegrees(60));
    var scaled = wheel.cosineScale(Rotation2d.fromDegrees(0));
    assertEquals(1.0, scaled.velocity, 1e-9, "2 m/s at 60 degrees off is cos(60) x 2 = 1 m/s");
    assertEquals(60.0, scaled.angle.getDegrees(), 1e-9);
  }

  @Test
  @DisplayName("wpilib.color-named-constants")
  void colorNamedConstants() {
    assertTrue(Reflect.hasField(Color.class, "ORANGE"));
    assertTrue(Reflect.hasField(Color.class, "LIME_GREEN"));
    assertTrue(!Reflect.hasField(Color.class, "kOrange"), "Color.kOrange exists now");
    var lime = new Color8Bit(Color.LIME_GREEN);
    assertArrayEquals(new int[] {50, 205, 50}, new int[] {lime.red, lime.green, lime.blue});
  }

  @Test
  @DisplayName("wpilib.timer-get-timestamp")
  void timerGetTimestamp() {
    for (Class<?> c : new Class<?>[] {Timer.class, RobotController.class}) {
      assertTrue(Reflect.methodsStartingWith(c, "getFPGA").isEmpty(),
          c.getSimpleName() + " has a getFPGA... method again: " + Reflect.methodsStartingWith(c, "getFPGA"));
    }
    // In seconds: across a 300 ms wait, the timestamp moves 0.3.
    double before = Timer.getTimestamp();
    long start = System.nanoTime();
    sleep(300);
    double wall = (System.nanoTime() - start) / 1e9;
    assertEquals(wall, Timer.getTimestamp() - before, 0.05, "Timer.getTimestamp() should count seconds");
  }

  private static void sleep(long millis) {
    try {
      Thread.sleep(millis);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new AssertionError(e);
    }
  }

  @Test
  @DisplayName("wpilib.addressable-led-api")
  void addressableLedApi() {
    assertTrue(Reflect.methods(AddressableLED.class, "start").isEmpty(), "AddressableLED.start() exists again");
    try (var strip = new AddressableLED(5)) { // Lesson 23's kPwmPort
      strip.setLength(3);
      var buffer = new AddressableLEDBuffer(3);
      buffer.setRGB(0, 255, 0, 0);
      buffer.setRGB(2, 0, 0, 63);
      strip.setData(buffer);
      // No start() call: the strip shows the data it was handed.
      var sim = new AddressableLEDSim(strip);
      byte[] handed = {(byte) 255, 0, 0, 0, 0, 0, 0, 0, 63};
      assertArrayEquals(handed, sim.getData(), "3 bytes per LED, red, green, blue");
      // Changing the buffer shows nothing until it is handed over again.
      buffer.setRGB(1, 0, 255, 0);
      assertArrayEquals(handed, sim.getData());
      strip.setData(buffer);
      assertEquals((byte) 255, sim.getData()[4]);
    }
  }
}
