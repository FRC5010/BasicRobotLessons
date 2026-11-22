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

  @Test
  @DisplayName("commandsv3.noyield-command-finishes-same-tick")
  void noYieldBodyFinishesOnItsTick() {
    var scheduler = Scheduler.createIndependentScheduler();
    var ran = new int[] {0};
    Command once = Command.noRequirements(coroutine -> ran[0]++).named("Once");
    scheduler.schedule(once);
    scheduler.run();
    assertEquals(1, ran[0], "the body didn't run on the first tick");
    assertFalse(scheduler.isRunning(once), "a body with no yield was still running after its first tick");
    assertTrue(once.requirements().isEmpty());
  }

  @Test
  @DisplayName("commandsv3.loop-without-yield-one-tick")
  void loopWithoutYieldRunsInsideOneTick() {
    var scheduler = Scheduler.createIndependentScheduler();
    var periodicRuns = new int[] {0};
    scheduler.addPeriodic(() -> periodicRuns[0]++);
    var seenWithout = new ArrayList<Integer>();
    var seenWith = new ArrayList<Integer>();
    Command without = Command.noRequirements(coroutine -> {
      for (int pass = 0; pass < 5; pass++) {
        seenWithout.add(periodicRuns[0]);
      }
    }).named("Without Yield");
    Command with = Command.noRequirements(coroutine -> {
      for (int pass = 0; pass < 5; pass++) {
        seenWith.add(periodicRuns[0]);
        coroutine.yield();
      }
    }).named("With Yield");

    scheduler.schedule(without);
    scheduler.run();
    assertEquals(5, seenWithout.size(), "the loop didn't finish all its passes in one tick");
    assertEquals(1, seenWithout.stream().distinct().count(),
        "a periodic callback ran between passes of a loop with no yield: " + seenWithout);
    assertFalse(scheduler.isRunning(without));

    scheduler.schedule(with);
    for (int tick = 0; tick < 10; tick++) {
      scheduler.run();
    }
    assertEquals(5, seenWith.stream().distinct().count(),
        "with yield, each pass should see one more periodic run: " + seenWith);
  }

  @Test
  @DisplayName("commandsv3.builders-need-a-name")
  void factoriesReturnBuildersThatNeedAName() throws Exception {
    for (var method : new java.lang.reflect.Method[] {
        Mechanism.class.getMethod("run", java.util.function.Consumer.class),
        Mechanism.class.getMethod("runRepeatedly", Runnable.class),
        Command.class.getMethod("noRequirements", java.util.function.Consumer.class),
        Command.class.getMethod("sequence", Command[].class),
        Command.class.getMethod("parallel", Command[].class)}) {
      Class<?> builder = method.getReturnType();
      assertFalse(Command.class.isAssignableFrom(builder),
          method.getName() + " returns a Command now, so .named(...) is optional: " + builder);
      assertTrue(Command.class.isAssignableFrom(builder.getMethod("named", String.class).getReturnType()),
          method.getName() + "'s builder has no named(String) returning a Command");
    }
    // The decorators the course chains before naming stay on the builder.
    Class<?> stage = Mechanism.class.getMethod("run", java.util.function.Consumer.class).getReturnType();
    for (String decorator : new String[] {"whenExited", "whenCanceled", "until"}) {
      Class<?> arg = decorator.equals("until") ? java.util.function.BooleanSupplier.class : Runnable.class;
      assertEquals(stage, stage.getMethod(decorator, arg).getReturnType(), decorator + " leaves the builder stage");
    }
  }

  @Test
  @DisplayName("commandsv3.ontrue-starts-not-stops")
  void onTrueStartsOnTheRisingEdgeAndNeverCancels() {
    var scheduler = Scheduler.createIndependentScheduler();
    var pressed = new boolean[] {false};
    var starts = new int[] {0};
    Command held = Command.noRequirements(coroutine -> {
      starts[0]++;
      coroutine.park();
    }).named("Held");
    new org.wpilib.command3.Trigger(scheduler, () -> pressed[0]).onTrue(held);

    scheduler.run();
    assertFalse(scheduler.isRunning(held), "onTrue scheduled before the trigger went true");
    pressed[0] = true;
    for (int tick = 0; tick < 5; tick++) {
      scheduler.run();
    }
    assertTrue(scheduler.isRunning(held), "onTrue didn't schedule on the rising edge");
    assertEquals(1, starts[0], "onTrue restarted the command while the trigger stayed true");
    pressed[0] = false;
    for (int tick = 0; tick < 5; tick++) {
      scheduler.run();
    }
    assertTrue(scheduler.isRunning(held), "onTrue cancelled the command when the trigger went false");
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
