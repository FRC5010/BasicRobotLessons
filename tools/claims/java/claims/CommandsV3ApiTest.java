package claims;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.wpilib.command3.Command;
import org.wpilib.command3.Mechanism;
import org.wpilib.command3.Scheduler;

/**
 * Tier A claims about Commands V3 (tools/claims/registry/commandsv3.toml). Each test's display
 * name is the claim it checks. Run with tools/claims/run-java-tests.sh.
 */
class CommandsV3ApiTest {
  @Test
  @DisplayName("commandsv3.no-requirements-exists")
  void noRequirementsAndNoOnlyIf() throws Exception {
    Command guard = Command.noRequirements(coroutine -> {}).named("Guard");
    assertTrue(guard.requirements().isEmpty(), "noRequirements built a command that requires " + guard.requirements());

    var found = new ArrayList<String>();
    var classes = Reflect.packageClasses(Command.class);
    assertTrue(classes.size() > 50, "only " + classes.size() + " classes found in Commands V3's jar");
    for (Class<?> c : classes) {
      found.addAll(Reflect.methods(c, "onlyIf"));
    }
    assertTrue(found.isEmpty(), "Commands V3 has onlyIf now (Lesson 24 hand-builds the guard): " + found);
  }

  @Test
  @DisplayName("commandsv3.mechanism-no-periodic")
  void mechanismHasNoPeriodic() throws Exception {
    assertTrue(Mechanism.class.isInterface());
    assertTrue(Reflect.methods(Mechanism.class, "periodic").isEmpty(),
        "Mechanism has a periodic() now: " + Reflect.methods(Mechanism.class, "periodic"));
    Scheduler.class.getMethod("addPeriodic", Runnable.class);
  }

  @Test
  @DisplayName("commandsv3.andthen-builder")
  void andThenNeedsAName() throws Exception {
    var log = new ArrayList<String>();
    Command first = step("First", log);
    Command second = step("Second", log);
    Object sequence = first.andThen(second);
    assertFalse(sequence instanceof Command, "andThen returns a Command now, so .named(...) is optional: "
        + sequence.getClass());
    Command both = (Command) sequence.getClass().getMethod("named", String.class).invoke(sequence, "Both");
    assertEquals("Both", both.name());

    // It sequences them: the second starts only after the first has finished.
    var scheduler = Scheduler.createIndependentScheduler();
    var result = scheduler.schedule(both);
    for (int tick = 0; tick < 10; tick++) {
      scheduler.run();
    }
    assertEquals(List.of("First start", "First end", "Second start", "Second end"), log,
        "schedule() said " + result);
    assertFalse(scheduler.isRunning(both), "the sequence didn't finish in 10 ticks");
  }

  /** A command that takes two ticks, logging when it starts and ends. */
  private static Command step(String name, List<String> log) {
    return Command.noRequirements(coroutine -> {
      log.add(name + " start");
      coroutine.yield();
      log.add(name + " end");
    }).named(name);
  }
}
