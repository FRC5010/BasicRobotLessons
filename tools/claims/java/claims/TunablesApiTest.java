package claims;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.wpilib.framework.RobotBase;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.networktables.DoublePublisher;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.simulation.AlertSim;
import org.wpilib.tunable.TunableDouble;
import org.wpilib.tunable.TunableRegistry;
import org.wpilib.tunable.Tunables;

/**
 * Claims about WPILib's tunables (tools/claims/registry/wpilib.toml). A bare RobotBase sets up
 * the same NetworkTables backend at /Tunables that every robot program gets, and a second
 * publisher on the same NetworkTables instance stands in for a dashboard. Each test's display
 * name is the claim it checks. Run with tools/claims/run-java-tests.sh.
 */
class TunablesApiTest {
  private static RobotBase s_robot;
  private static final NetworkTableInstance s_nt = NetworkTableInstance.getDefault();

  @BeforeAll
  static void robot() {
    assertTrue(HAL.initialize());
    s_robot = new RobotBase() {
      @Override
      public void startCompetition() {}

      @Override
      public void endCompetition() {}
    };
  }

  @AfterAll
  static void shutdown() {
    s_robot.close();
  }

  /** What a dashboard does: publish a new value on the tunable's topic. */
  private static DoublePublisher dashboardWrite(String topic, double value) throws Exception {
    DoublePublisher pub = s_nt.getDoubleTopic(topic).publish();
    pub.set(value);
    Thread.sleep(100); // let the backend's listener queue the event
    return pub;
  }

  @Test
  @DisplayName("wpilib.tunables-publish-under-tunables")
  void publishUnderTunables() {
    Tunables.addDouble("ClaimTest/Published", 20.0);
    TunableRegistry.update();
    var topic = s_nt.getTopic("/Tunables/ClaimTest/Published");
    assertTrue(topic.exists(), "no topic at /Tunables/ClaimTest/Published");
    assertEquals("double", topic.getTypeString());
    assertEquals(20.0, s_nt.getEntry("/Tunables/ClaimTest/Published").getDouble(-1), 0.0);
  }

  @Test
  @DisplayName("wpilib.tunables-applied-on-update")
  void appliedOnUpdate() throws Exception {
    TunableDouble kP = Tunables.addDouble("ClaimTest/Applied", 20.0);
    TunableRegistry.update();
    try (DoublePublisher pub = dashboardWrite("/Tunables/ClaimTest/Applied", 25.0)) {
      assertEquals(20.0, kP.get(), 0.0, "the write was applied before TunableRegistry.update()");
      TunableRegistry.update();
      assertEquals(25.0, kP.get(), 0.0, "the write wasn't applied by TunableRegistry.update()");
    }
  }

  @Test
  @DisplayName("wpilib.tunables-duplicate-name-alert")
  void duplicateNameAlert() throws Exception {
    TunableDouble first = Tunables.addDouble("ClaimTest/Twice", 1.0);
    TunableDouble second = Tunables.addDouble("ClaimTest/Twice", 2.0); // doesn't throw
    TunableRegistry.update();
    boolean alerted = java.util.Arrays.stream(AlertSim.getAll())
        .anyMatch(a -> a.isActive() && a.group.equals("Tunables")
            && a.text.contains("/Tunables/ClaimTest/Twice"));
    assertTrue(alerted, "no active Tunables alert names the duplicate");
    try (DoublePublisher pub = dashboardWrite("/Tunables/ClaimTest/Twice", 5.0)) {
      TunableRegistry.update();
      assertEquals(5.0, first.get(), 0.0, "the first tunable didn't get the write");
      assertEquals(2.0, second.get(), 0.0, "the second tunable got the write");
    }
  }
}
