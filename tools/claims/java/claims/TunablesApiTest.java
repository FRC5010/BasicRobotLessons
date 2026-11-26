package claims;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.wpilib.units.Units.Centimeters;
import static org.wpilib.units.Units.Meters;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.wpilib.framework.RobotBase;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.networktables.DoublePublisher;
import org.wpilib.networktables.NetworkTableInstance;
import org.wpilib.simulation.AlertSim;
import org.wpilib.units.measure.Distance;
import com.ctre.phoenix6.CANBus;
import com.ctre.phoenix6.configs.Slot0Configs;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.InvertedValue;
import org.wpilib.hardware.bus.CANPort;
import org.wpilib.math.controller.PIDController;
import org.wpilib.tunable.Tunable;
import org.wpilib.tunable.TunableConfig;
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

  @Test
  @DisplayName("wpilib.tunables-ontune-once-per-change")
  void onTuneOncePerChange() throws Exception {
    int[] calls = {0};
    TunableDouble kV =
        TunableDouble.createConfig(1.42, new TunableConfig().withOnTune(() -> calls[0]++));
    Tunables.publish("ClaimTest/OnTune", kV);
    TunableRegistry.update();
    assertEquals(0, calls[0], "onTune ran on publish");
    try (DoublePublisher pub = dashboardWrite("/Tunables/ClaimTest/OnTune", 1.5)) {
      TunableRegistry.update();
      assertEquals(1, calls[0], "onTune didn't run once for one write");
      assertEquals(1.5, kV.get(), 0.0);
      TunableRegistry.update();
      assertEquals(1, calls[0], "onTune ran on a tick with no write");
    }
  }

  @Test
  @DisplayName("phoenix6.slot0-apply-keeps-other-config")
  void slot0ApplyKeepsOtherConfig() {
    try (TalonFX motor = new TalonFX(61, new CANBus(CANPort.CAN_S0))) {
      TalonFXConfiguration config = new TalonFXConfiguration();
      config.MotorOutput.Inverted = InvertedValue.Clockwise_Positive;
      config.SoftwareLimitSwitch.ForwardSoftLimitEnable = true;
      config.SoftwareLimitSwitch.ForwardSoftLimitThreshold = 3.0;
      config.CurrentLimits.SupplyCurrentLimitEnable = true;
      config.CurrentLimits.SupplyCurrentLimit = 33.0;
      config.Slot0.kP = 1.0;
      config.Slot0.kS = 0.3;
      assertTrue(motor.getConfigurator().apply(config).isOK());

      Slot0Configs slot0 = new Slot0Configs();
      slot0.kP = 7.0;
      slot0.kV = 0.5;
      assertTrue(motor.getConfigurator().apply(slot0).isOK());

      TalonFXConfiguration after = new TalonFXConfiguration();
      assertTrue(motor.getConfigurator().refresh(after).isOK());
      assertEquals(7.0, after.Slot0.kP, 1e-9, "the new kP didn't land");
      assertEquals(0.5, after.Slot0.kV, 1e-9, "the new kV didn't land");
      assertEquals(0.0, after.Slot0.kS, 1e-9, "a gain the Slot0Configs left out kept its old value");
      assertEquals(InvertedValue.Clockwise_Positive, after.MotorOutput.Inverted,
          "applying Slot0Configs reset Inverted");
      assertTrue(after.SoftwareLimitSwitch.ForwardSoftLimitEnable,
          "applying Slot0Configs turned the soft limit off");
      assertEquals(3.0, after.SoftwareLimitSwitch.ForwardSoftLimitThreshold, 1e-9);
      assertTrue(after.CurrentLimits.SupplyCurrentLimitEnable,
          "applying Slot0Configs turned the supply limit off");
      assertEquals(33.0, after.CurrentLimits.SupplyCurrentLimit, 1e-9);
    }
  }

  @Test
  @DisplayName("wpilib.tunables-getter-setter")
  void getterSetter() throws Exception {
    PIDController controller = new PIDController(5.0, 0, 0);
    Tunables.publishDouble("ClaimTest/ControllerP", controller::getP, controller::setP);
    TunableRegistry.update();
    assertEquals(5.0, s_nt.getEntry("/Tunables/ClaimTest/ControllerP").getDouble(-1), 0.0,
        "the getter's value wasn't published");
    try (DoublePublisher pub = dashboardWrite("/Tunables/ClaimTest/ControllerP", 2.0)) {
      TunableRegistry.update();
      assertEquals(2.0, controller.getP(), 0.0, "the setter didn't receive the write");
    }
    controller.setP(9.0); // the code changes it directly
    TunableRegistry.update();
    Thread.sleep(100);
    assertEquals(9.0, s_nt.getEntry("/Tunables/ClaimTest/ControllerP").getDouble(-1), 0.0,
        "a change made through the object wasn't published");
  }

  @Test
  @DisplayName("wpilib.tunables-immutable")
  void immutableIgnoresWrites() throws Exception {
    int[] calls = {0};
    TunableConfig locked = new TunableConfig().withMutable(false).withOnTune(() -> calls[0]++);
    TunableDouble kG = TunableDouble.createConfig(0.17, locked);
    Tunables.publish("ClaimTest/Locked", kG);
    PIDController controller = new PIDController(5.0, 0, 0);
    Tunables.publishDouble("ClaimTest/LockedP", controller::getP, controller::setP,
        new TunableConfig().withMutable(false));
    TunableRegistry.update();
    assertEquals(0.17, s_nt.getEntry("/Tunables/ClaimTest/Locked").getDouble(-1), 0.0,
        "a locked tunable wasn't published");
    try (DoublePublisher a = dashboardWrite("/Tunables/ClaimTest/Locked", 0.5);
        DoublePublisher b = dashboardWrite("/Tunables/ClaimTest/LockedP", 2.0)) {
      TunableRegistry.update();
      assertEquals(0.17, kG.get(), 0.0, "a locked tunable took a dashboard's write");
      assertEquals(0, calls[0], "a locked tunable's onTune ran");
      assertEquals(5.0, controller.getP(), 0.0, "a locked getter/setter tunable's setter ran");
    }
  }

  @Test
  @DisplayName("wpilib.tunables-measure-base-units")
  void measureInBaseUnits() throws Exception {
    Tunable<Distance> tolerance =
        Tunable.createConfig(Centimeters.of(2), new TunableConfig());
    Tunables.publish("ClaimTest/Tolerance", tolerance);
    TunableRegistry.update();
    var topic = s_nt.getTopic("/Tunables/ClaimTest/Tolerance");
    assertEquals("double", topic.getTypeString());
    assertEquals(0.02, s_nt.getEntry("/Tunables/ClaimTest/Tolerance").getDouble(-1), 1e-12,
        "2 cm wasn't published as 0.02 (meters)");
    System.out.println("Tolerance properties: " + topic.getProperties());
    try (DoublePublisher pub = dashboardWrite("/Tunables/ClaimTest/Tolerance", 0.001)) {
      TunableRegistry.update();
      assertEquals(0.001, tolerance.get().in(Meters), 1e-12,
          "a write of 0.001 wasn't read back as 0.001 m");
    }
  }

  @Test
  @DisplayName("wpilib.tunable-is-supplier")
  void tunableIsSupplier() {
    Tunable<Distance> height = Tunable.createConfig(Centimeters.of(30), new TunableConfig());
    java.util.function.Supplier<Distance> asSupplier = height; // compiles only if it is one
    assertEquals(0.3, asSupplier.get().in(Meters), 1e-12, "the Supplier view didn't read the value");
  }
}
