package claims;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.ctre.phoenix6.BaseStatusSignal;
import com.ctre.phoenix6.StatusSignal;
import com.ctre.phoenix6.hardware.TalonFX;
import java.lang.reflect.ParameterizedType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.wpilib.units.measure.Angle;
import org.wpilib.units.measure.AngularVelocity;
import org.wpilib.units.measure.Voltage;

/**
 * Tier A claims about Phoenix 6 (tools/claims/registry/phoenix6.toml). Each test's display name
 * is the claim it checks. Run with tools/claims/run-java-tests.sh.
 */
class Phoenix6ApiTest {
  @Test
  @DisplayName("phoenix6.get-value-in-units")
  void statusSignalsCarryMeasures() throws Exception {
    // getValue() is StatusSignal<T>.getValue(), so the measure type comes from the signal's T.
    assertSignalOf("getPosition", Angle.class);
    assertSignalOf("getVelocity", AngularVelocity.class);
    assertSignalOf("getMotorVoltage", Voltage.class);
    assertEquals(double.class, BaseStatusSignal.class.getMethod("getValueAsDouble").getReturnType(),
        "getValueAsDouble() is gone; the lessons say it exists");
  }

  private static void assertSignalOf(String getter, Class<?> measure) throws Exception {
    var type = TalonFX.class.getMethod(getter).getGenericReturnType();
    assertTrue(type instanceof ParameterizedType p && p.getRawType() == StatusSignal.class,
        getter + " returns " + type);
    assertEquals(measure, ((ParameterizedType) type).getActualTypeArguments()[0], getter + "'s signal");
  }
}
