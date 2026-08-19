# Lesson 32 — Tests that catch what a plot won't

**Goal:** Write JUnit tests against your own subsystems, using exactly the
technique that verified every lesson in this course.

**New Java concepts**
- **JUnit** — `@Test`, `assertEquals` with a tolerance, `assertTrue`, and
  the arrange / act / assert shape that most tests turn out to have.

**New robot concepts**
- Running the simulation *inside* a test: `HAL.initialize`,
  `DriverStationSim`, and stepping the scheduler yourself
- **The real-time trap** — the one that quietly turns every number into
  fiction
- **Simulated devices outlive a test**, which changes how you have to
  write them
- Which claims are worth testing, and which aren't

---

## 1. "It worked when I tried it" is not a record

You have checked a great many things by running the simulator and
looking.

Lesson 21's homing works — you watched the carriage drive down and the
number snap. Lesson 24's state machine refuses illegal requests — you
pressed the button and nothing happened. Lesson 26's alignment lands
within two centimetres — you saw it on the field view.

Every one of those was true on the day. None of them is checked again,
ever, by anything. When somebody retunes a gain in week six, or the
elevator gets a new gearbox, or a refactor moves a line, nothing re-runs
those checks except a human who remembers to.

That's the gap. Logs record what happened; alerts report what's wrong
*now*; a test is the only thing on this list that says **"this was true,
and it had better still be."**

And there's a second reason, which matters more than it sounds. Some
claims can't be checked by looking at all. "Homing fixes a lying encoder"
is visible on a plot once. "The state machine refuses every illegal
transition" is a dozen combinations, and you are not going to press a
dozen buttons.

---

## 2. Where tests live

Good news first: **your project is already set up for this**, and has
been since Lesson 0.

*Nothing to add — this is already in your `build.gradle`:*

```
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
```

The template ships JUnit 5, a configured `test` task, and
`wpi.java.configureTestTasks(test)` — which is the line that makes the
HAL and the simulation libraries available to tests. There is nothing to
install and nothing to configure.

> Look just above that line in your `build.gradle` and you'll find two
> `jvmArgs '--add-opens', ...` entries already sitting in the `test`
> block. Those exist because Commands V3 runs a command's body as a
> coroutine, and a test that schedules *any* command — directly or
> through a `Mechanism`, the way this lesson's tests both do — needs that
> module access or it fails before your test logic even runs. It's
> already there; you don't need to add it, only to know why it's there
> if you ever go looking.

The only thing missing is the folder.

**Create the directory `src/test/java/first/robot/`.** It mirrors
`src/main/java`, so a test for something in `first.robot.subsystems`
still lives in a file whose package line says `package first.robot;` or
`package first.robot.subsystems;` — the same rule from Lesson 0 about
packages matching folders, in a second tree.

**Then run:**

```powershell
./gradlew test
```

That runs everything in there and tells you what failed.

---

## 3. A first test, with no robot in it

Start with the cheapest possible kind: pure logic, no hardware, no
waiting.

Lesson 24's transition table is perfect for this. It's a rule with a
handful of combinations, it's easy to get wrong, and it involves no
motors at all.

**Create `src/test/java/first/robot/SuperstructureStateTest.java`:**

```java
package first.robot;

import static first.robot.subsystems.SuperstructureState.IDLE;
import static first.robot.subsystems.SuperstructureState.INTAKING;
import static first.robot.subsystems.SuperstructureState.SCORING;
import static first.robot.subsystems.SuperstructureState.UNHOMED;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import first.robot.subsystems.SuperstructureState;

/**
 * The cheapest useful test on the robot: pure logic, no hardware, no HAL, no
 * waiting. It runs in a millisecond and it checks a rule you can get wrong.
 */
public class SuperstructureStateTest {

  @Test
  void scoringRequiresHavingIntakenFirst() {
    assertFalse(IDLE.canGoTo(SCORING), "cannot score with nothing on board");
    assertTrue(INTAKING.canGoTo(SCORING), "intaking is exactly when you're ready to score");
  }

  @Test
  void nothingEscapesUnhomedByAsking() {
    for (SuperstructureState next : SuperstructureState.values()) {
      assertFalse(UNHOMED.canGoTo(next),
          "a request must not get the robot out of UNHOMED via " + next);
    }
  }

  @Test
  void everyStateCanGiveUpAndGoBackToIdle() {
    for (SuperstructureState from : SuperstructureState.values()) {
      if (from == UNHOMED || from == IDLE) {
        continue;
      }
      assertTrue(from.canGoTo(IDLE), from + " has no way back to IDLE");
    }
  }
}
```

Three things about the shape of that.

**`@Test` marks a method as a test.** It takes no arguments, returns
nothing, and its name is documentation — `scoringRequiresHavingIntakenFirst`
reads as a claim, which is what a test is. When it fails, that name is
the first thing you'll see.

**Every assertion carries a message.** `assertFalse(x, "why this
matters")` costs one string and buys you a failure report you can read
without opening the file.

**The last two tests are loops.** That's the thing a human at a
controller cannot do: `nothingEscapesUnhomedByAsking` checks every state
there is, and it will keep checking them when somebody adds a fifth.
Lesson 24's exhaustive `switch` makes the compiler force you to *handle*
a new state; this makes sure you handled it the way you meant to.

Run it. Three green ticks in well under a second.

---

## 4. A test with a robot in it

Pure logic is the easy half. The interesting claims involve hardware,
and those need the simulation running inside the test.

Three things have to happen before a subsystem will do anything:

*Nothing to add — the three ideas, before they go into a real test:*

```java
    HAL.initialize(500, 0);
    DriverStationSim.setEnabled(true);
    Scheduler.getDefault().run();
```

**`HAL.initialize`** starts the hardware abstraction layer in simulation
mode. Without it, constructing anything that touches hardware fails.

**`DriverStationSim.setEnabled(true)`** is the one people miss. A
disabled robot's motors output nothing and `Scheduler.run()` cancels
every command it sees — so without this, a test can run for a thousand
ticks, assert nothing happened, and pass for entirely the wrong reason.

**`Scheduler.getDefault().run()`** is one robot tick. Nothing in this
project moves on its own; `Robot.robotPeriodic()` normally calls that
fifty times a second, and in a test *you* are `Robot`.

---

## 5. The test that checks Lesson 21

Now a real one. Lesson 21 made a specific claim: a relative encoder reads
zero at power-on wherever the carriage actually is, and homing is what
replaces that guess with a fact. That's exactly the kind of thing worth
pinning down — it's a behaviour, not a value, and it stops being true the
moment somebody edits the homing routine.

First, the elevator has to be able to answer the question — and this is
one place this port is ahead of the original course rather than behind
it. **`Elevator.getHeightMeters()` already exists**, added back in
Lesson 30 so the total-current calculation had something to read. It
was written for an unrelated reason and it's exactly what this test
needs, which is itself worth noticing: **you cannot assert on something
you cannot observe**, and a getter that turns out to be reusable for
testing is a small sign the design is honest about its own state.

**Create `src/test/java/first/robot/ElevatorHomingTest.java`:**

```java
package first.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.wpilib.units.Units.Meters;

import org.junit.jupiter.api.Test;

import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.RobotState;
import org.wpilib.hardware.hal.HAL;
import org.wpilib.simulation.DriverStationSim;

import first.robot.Constants.ElevatorConstants;
import first.robot.subsystems.Elevator;

/**
 * Lesson 21's claim, checked: a relative encoder reads zero at power-on wherever
 * the carriage actually is, and homing is what replaces that guess with a fact.
 *
 * <p>One test method, on purpose. A DigitalInput holds its DIO channel for the
 * life of the JVM, so a second Elevator in a second test would fail to allocate.
 */
public class ElevatorHomingTest {

  /** One robot tick: run the scheduler, then wait as long as a real tick takes. */
  private static void tick() {
    Scheduler.getDefault().run();
    try {
      Thread.sleep(20); // the full 20 ms — see the lesson on why
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  @Test
  void homingReplacesTheEncodersGuessWithTheSwitchesFact() {
    // --- arrange ---------------------------------------------------------
    HAL.initialize(500, 0);
    DriverStationSim.setDsAttached(true);
    DriverStationSim.setEnabled(true);
    DriverStationSim.notifyNewData();
    assertFalse(RobotState.isDisabled(), "enable, or the scheduler cancels everything");

    Elevator elevator = new Elevator();
    for (int i = 0; i < 3; i++) {
      tick();
    }

    // --- assert the lie --------------------------------------------------
    // The simulated carriage is sitting at kSimStartHeight, well up the rails.
    assertFalse(elevator.isHomed(), "nothing has homed it yet");
    assertEquals(0.0, elevator.getHeightMeters(), 0.01,
        "a relative encoder reads zero at power-on, wherever the carriage is");
    assertFalse(elevator.atBottomLimit(),
        "and the switch knows better — the carriage is not at the bottom");

    // --- act ---------------------------------------------------------------
    Scheduler.getDefault().schedule(elevator.home());
    for (int i = 0; i < 300 && !elevator.isHomed(); i++) {
      tick();
    }

    // --- assert the fix ----------------------------------------------------
    assertTrue(elevator.isHomed(), "homing should have finished within 6 seconds");
    assertTrue(elevator.atBottomLimit(), "it stopped because the switch tripped");
    for (int i = 0; i < 3; i++) {
      tick(); // setPositionMeters needs a couple of ticks to read back
    }
    assertEquals(ElevatorConstants.kBottomLimitHeight.in(Meters),
        elevator.getHeightMeters(), 0.02,
        "the encoder now agrees with the switch");

    Scheduler.getDefault().cancelAll();
    HAL.shutdown();
  }
}
```

That's the **arrange / act / assert** shape, and most tests you write
will have it: set up a world, do one thing, check what changed. The
comment banners are there because this one is long enough to be worth
signposting.

The two assertions before the act are doing real work. They establish
that the encoder is *wrong* and the switch *disagrees with it* — without
them, the final assertion would pass on a robot where homing did nothing
at all, because the carriage might already have been at the bottom.

**`assertEquals` with three arguments is expected, actual, tolerance.**
Floating point never lands exactly, and physics never lands twice in the
same place, so a tolerance isn't a cop-out — it's the claim. Two
centimetres says "this is what 'homed' means to me."

**One naming difference from the API you'd guess:** disabled/enabled
lives on `RobotState.isDisabled()`/`isEnabled()` in this alpha, not on a
`DriverStation` instance method the way older WPILib versions had it —
`org.wpilib.driverstation.DriverStation` in this alpha is a much smaller
class (just data-log wiring), and the query methods moved to
`RobotState`. `Scheduler.getDefault().schedule(...)`/`.cancelAll()` play
the same role `CommandScheduler.getInstance()` used to.

---

## 6. Two traps that will waste your evening

Both of these cost real time while this course was being written.
Neither produces an error message that points anywhere near the cause.

### The real-time trap

Look at `tick()` again: it sleeps a **full 20 ms**. That looks like a
waste — the test would finish five times faster without it.

Shorten it and the test starts lying to you — though *how much* you have
to shorten it turns out to matter, and this is worth measuring rather
than assuming. On this exact test, measured:

| `Thread.sleep(...)` | Final height | |
|---|---|---|
| 20 ms (correct) | 0.0092 m | within tolerance of 0.01 m |
| 4 ms | 0.0092–0.0095 m | still within tolerance — barely different |
| 0 ms (no sleep at all) | **−0.34 m** | a third of a metre below the floor |

The middle row is the surprising one: a *partial* shortcut barely moves
the number here. The physics model only diverges from the firmware once
the mismatch is severe enough, and for this particular routine (a slow,
gentle, open-loop creep) that threshold turns out to be close to zero
slack at all. It's not that the trap is smaller in this port — it's that
it has a cliff rather than a slope, and you won't find the cliff by
guessing where it is.

The mechanism is the same one named in Lesson 30: the physics model
advances a fixed 20 ms of simulated time every time you step it, while
Phoenix's simulated firmware, running the closed loop, advances on the
**wall clock**. Remove the sleep and the mechanism computes as if a full
tick's worth of firmware response happened between calls that are
actually adjacent — on a real robot that's impossible, and −0.34 m looks
precisely like a broken homing routine, which is where you'll spend the
evening.

**If a test involves physics, sleep the full tick.** A slow correct test
is worth more than a fast one that lies — and "slightly shortened"
isn't a safe middle ground just because it happened not to break this
particular test.

### Simulated devices outlive their test

Everything a subsystem allocates — a CAN ID, a DIO channel — is claimed
for the life of the **JVM**, not the life of the test. All your tests run
in one JVM.

Build a second `Elevator` in a second test method and you get:

*Nothing to add — this is the error, so you recognise it:*

```
AllocationException: Code: -1029
DIO 0 previously allocated.
```

That's the DIO channel for the bottom limit switch, still held by the
first elevator. `HAL.shutdown()` does not release it.

Two ways out, and this course uses both:

- **One sequential scenario per subsystem**, in a single test method, the
  way `ElevatorHomingTest` does. Less isolated than ideal, and honest
  about it.
- **Give each test its own CAN IDs** when you're building bare motors
  rather than whole subsystems. Note that IDs must be **62 or lower** —
  a rig on ID 70 fails silently, with no output at all.

---

## 7. What to test, and what not to

You could write tests forever. Most of them wouldn't be worth having.

The ones that earn their place are **claims a compiler can't check and a
plot won't show you twice**:

- **Rules with many combinations.** The transition table. Four states,
  two loops.
- **Behaviours that fix something.** Homing. The claim isn't a number,
  it's a before-and-after.
- **Things you got wrong once.** Every bug you fix is a test worth
  writing, because it already proved it can happen.
- **Invariants you're relying on elsewhere.** Lesson 24's guard rule only
  works if `canGoTo` is right.

The ones that aren't worth it:

- **Whether a constant equals itself.** `assertEquals(40, kElevatorSupplyLimit)`
  tests nothing except that you can read.
- **Whether a gain is well tuned.** That's a judgement about a plot, and
  a test that asserts it will be wrong the first time somebody improves
  it.
- **Anything the compiler already guarantees.**

> A test suite is code you have to maintain. Three tests that fail when
> something real breaks are worth more than thirty that fail whenever
> anyone touches anything.

**Run them:**

```powershell
./gradlew test
```

Green means every claim you wrote down is still true. Red means one of
them isn't — and because the method name is a sentence, the failure
tells you *which claim* before you've opened a single file.

Now break something on purpose. Change `SuperstructureState.canGoTo` so
`IDLE` can reach `SCORING`, and run the tests again — measured directly:
`scoringRequiresHavingIntakenFirst` fails, by name, in about a second.
That's the whole point: you found out immediately, from a machine,
instead of at an event, from a driver.

---

## Try it

1. **Test Lesson 27's claim.** `GamePieceDetector` is supposed to find
   nothing when there's nothing to find. Build one with an empty field
   and assert its target comes back empty — the same claim the lesson
   verified by hand.
2. **Test the arm's soft limits.** Lesson 20 put limits in the firmware
   *and* a clamp in the code, deliberately. Bypass the clamp and assert
   the firmware still holds. This one needs its own CAN IDs.
3. **Break a gain and watch the right test fail.** Set `kElevatorKG` to
   zero and run the suite. Which test catches it? If none does, that's
   information — write the one that would.
4. **Write the test for a bug you actually had.** Somewhere in the last
   thirty-one lessons you got something wrong and fixed it. Write the
   test that would have caught it, and notice how much easier it is to
   write now that you know the answer.
5. **Make a test lie to you.** Delete the `DriverStationSim.setEnabled(true)`
   line from the homing test and see what happens. It fails — measured,
   `isHomed()` never becomes true because a disabled scheduler refuses to
   run the command at all — but work out whether a *differently written*
   test might have passed instead, and what that tells you about
   assertions that only check for absence.

---

## What you learned

The robot's behaviour is now something a machine checks, rather than
something you remember checking.

**A test is a claim with a name.**
`homingReplacesTheEncodersGuessWithTheSwitchesFact` isn't a method name,
it's a sentence somebody can disagree with — and when it goes red, that
sentence is the error message. Naming tests as claims rather than as
"testElevator1" is most of what makes a suite readable a year later.

**Arrange, act, assert — and the arrange half does real work.** The two
assertions before homing ran are what stop the test passing on a robot
where homing does nothing. A test that only checks the end state often
checks less than you think.

**The simulation has rules, and breaking them fails quietly — sometimes
much more quietly than you'd expect.** A 4 ms sleep and a 20 ms sleep
produced nearly the same number on this test; only removing the sleep
entirely revealed the trap, a third of a metre below the floor, with no
error anywhere. The lesson isn't "shave a little and you'll notice" —
it's that you can't tell how much slack a real-time simulation will
tolerate without measuring it, so don't cut the corner at all. Simulated
devices are claimed for the life of the JVM, so tests are not as isolated
as JUnit makes them look. Neither of those is discoverable from a stack
trace.

And the judgement that matters most: **test the claims a compiler can't
check and a plot won't show you twice.** Not constants. Not gains. The
rules with too many combinations to press by hand, the behaviours that
fix something, and every bug you've already had once — because those
have proved they can happen.

That's the last thing standing between "it worked on Tuesday" and
knowing. Go and write one test for something you're quietly unsure
about; that unease is usually right.

Tests catch what you already thought to check. The next lesson is for
the failure nobody thought to write a test for — the one you only find
out about from a log, after the fact.

Next: [Lesson 33 — Reading a match log](33-reading-a-log.md).
