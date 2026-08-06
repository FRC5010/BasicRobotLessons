# Lesson 32 — Tests that catch what a plot won't

**Goal:** Write JUnit tests against your own subsystems, using exactly the
technique that verified every lesson in this course.

**New Java concepts**
- **JUnit** — `@Test`, `assertEquals` with a tolerance, `assertTrue`, and the
  arrange / act / assert shape that most tests turn out to have.

**New robot concepts**
- Running the simulation *inside* a test: `HAL.initialize`, `DriverStationSim`,
  and stepping the scheduler yourself
- **The real-time trap** — the one that quietly turns every number into fiction
- **Simulated devices outlive a test**, which changes how you have to write them
- Which claims are worth testing, and which aren't

---

## 1. "It worked when I tried it" is not a record

You have checked a great many things by running the simulator and looking.

Lesson 21's homing works — you watched the carriage drive down and the number
snap. Lesson 24's state machine refuses illegal requests — you pressed the button
and nothing happened. Lesson 26's alignment lands within two centimetres — you saw
it on the field view.

Every one of those was true on the day. None of them is checked again, ever, by
anything. When somebody retunes a gain in week six, or the elevator gets a new
gearbox, or a refactor moves a line, nothing re-runs those checks except a human
who remembers to.

That's the gap. Logs record what happened; alerts report what's wrong *now*; a
test is the only thing on this list that says **"this was true, and it had better
still be."**

And there's a second reason, which matters more than it sounds. Some claims can't
be checked by looking at all. "Homing fixes a lying encoder" is visible on a plot
once. "The state machine refuses every illegal transition" is thirty combinations,
and you are not going to press thirty buttons.

---

## 2. Where tests live

Good news first: **your project is already set up for this**, and has been since
Lesson 0.

*Nothing to add — this is already in your `build.gradle`:*

```
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
```

The WPILib template ships JUnit 5, a configured `test` task, and
`wpi.java.configureTestTasks(test)` — which is the line that makes the HAL and the
simulation libraries available to tests. There is nothing to install and nothing to
configure.

The only thing missing is the folder.

**Create the directory `src/test/java/frc/robot/`.** It mirrors `src/main/java`,
so a test for something in `frc.robot.subsystems` still lives in a file whose
package line says `package frc.robot;` or `package frc.robot.subsystems;` — the
same rule from Lesson 0 about packages matching folders, in a second tree.

**Then run:**

```powershell
./gradlew test
```

That runs everything in there and tells you what failed.

---

## 3. A first test, with no robot in it

Start with the cheapest possible kind: pure logic, no hardware, no waiting.

Lesson 24's transition table is perfect for this. It's a rule with about thirty
combinations, it's easy to get wrong, and it involves no motors at all.

**Create `src/test/java/frc/robot/SuperstructureStateTest.java`:**

```java
package frc.robot;

import static frc.robot.subsystems.SuperstructureState.HOLDING;
import static frc.robot.subsystems.SuperstructureState.IDLE;
import static frc.robot.subsystems.SuperstructureState.INTAKING;
import static frc.robot.subsystems.SuperstructureState.SCORING;
import static frc.robot.subsystems.SuperstructureState.UNHOMED;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import frc.robot.subsystems.SuperstructureState;

/**
 * The cheapest useful test on the robot: pure logic, no hardware, no HAL, no
 * waiting. It runs in a millisecond and it checks a rule you can get wrong.
 */
public class SuperstructureStateTest {

    @Test
    void scoringRequiresSomethingToScore() {
        assertFalse(IDLE.canGoTo(SCORING), "cannot score with nothing on board");
        assertFalse(INTAKING.canGoTo(SCORING), "cannot score mid-intake");
        assertTrue(HOLDING.canGoTo(SCORING), "holding a piece is exactly when you can");
    }

    @Test
    void nothingEscapesUnhomedByAsking() {
        for (SuperstructureState next : SuperstructureState.values()) {
            assertFalse(UNHOMED.canGoTo(next),
                    "a request must not get the robot out of UNHOMED via " + next);
        }
    }

    @Test
    void everyStateCanGiveUpAndGoBackToNeutral() {
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

**`@Test` marks a method as a test.** It takes no arguments, returns nothing, and
its name is documentation — `scoringRequiresSomethingToScore` reads as a claim,
which is what a test is. When it fails, that name is the first thing you'll see.

**Every assertion carries a message.** `assertFalse(x, "why this matters")` costs
one string and buys you a failure report you can read without opening the file.

**The last two tests are loops.** That's the thing a human at a controller cannot
do: `nothingEscapesUnhomedByAsking` checks every state there is, and it will keep
checking them when somebody adds a seventh. Lesson 24's exhaustive `switch` makes
the compiler force you to *handle* a new state; this makes sure you handled it the
way you meant to.

Run it. Three green ticks in well under a second.

---

## 4. A test with a robot in it

Pure logic is the easy half. The interesting claims involve hardware, and those
need the simulation running inside the test.

Three things have to happen before a subsystem will do anything:

*Nothing to add — the three ideas, before they go into a real test:*

```java
        HAL.initialize(500, 0);
        DriverStationSim.setEnabled(true);
        CommandScheduler.getInstance().run();
```

**`HAL.initialize`** starts the hardware abstraction layer in simulation mode.
Without it, constructing anything that touches hardware fails.

**`DriverStationSim.setEnabled(true)`** is the one people miss. A disabled robot's
motors output nothing and `CommandScheduler.run()` cancels every command it sees —
so without this, a test can run for a thousand ticks, assert nothing happened, and
pass for entirely the wrong reason.

**`CommandScheduler.getInstance().run()`** is one robot tick. Nothing in this
project moves on its own; `Robot` normally calls that fifty times a second, and in
a test *you* are `Robot`.

---

## 5. The test that checks Lesson 21

Now a real one. Lesson 21 made a specific claim: a relative encoder reads zero at
power-on wherever the carriage actually is, and homing is what replaces that guess
with a fact. That's exactly the kind of thing worth pinning down — it's a
behaviour, not a value, and it stops being true the moment somebody edits the
homing routine.

First, the elevator has to be able to answer the question.

**Add to `Elevator`, above `isHomed`:**

```java
    /**
     * Where the encoder currently thinks the carriage is. Nothing outside this
     * class needed to know until something started asking questions about it.
     */
    public double getHeightMeters() {
        return m_inputs.heightMeters;
    }
```

That's worth noticing rather than skipping past. **You cannot assert on something
you cannot observe**, and being unable to write a test is usually the design
telling you something. Here it's mild — a height getter on an elevator is
obviously reasonable and simply hadn't been needed. Sometimes it's louder, and
"this is impossible to test" turns out to mean "this does too much."

**Create `src/test/java/frc/robot/ElevatorHomingTest.java`:**

```java
package frc.robot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import frc.robot.Constants.ElevatorConstants;
import frc.robot.subsystems.Elevator;

import static edu.wpi.first.units.Units.Meters;

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
        CommandScheduler.getInstance().run();
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
        DriverStation.refreshData();
        assertFalse(DriverStation.isDisabled(), "enable, or the scheduler cancels everything");

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

        // --- act -------------------------------------------------------------
        CommandScheduler.getInstance().schedule(elevator.home());
        for (int i = 0; i < 300 && !elevator.isHomed(); i++) {
            tick();
        }

        // --- assert the fix --------------------------------------------------
        assertTrue(elevator.isHomed(), "homing should have finished within 6 seconds");
        assertTrue(elevator.atBottomLimit(), "it stopped because the switch tripped");
        for (int i = 0; i < 3; i++) {
            tick(); // setPositionMeters needs a couple of ticks to read back
        }
        assertEquals(ElevatorConstants.kBottomLimitHeight.in(Meters),
                elevator.getHeightMeters(), 0.02,
                "the encoder now agrees with the switch");

        CommandScheduler.getInstance().cancelAll();
        HAL.shutdown();
    }
}
```

That's the **arrange / act / assert** shape, and most tests you write will have
it: set up a world, do one thing, check what changed. The comment banners are
there because this one is long enough to be worth signposting.

The two assertions before the act are doing real work. They establish that the
encoder is *wrong* and the switch *disagrees with it* — without them, the final
assertion would pass on a robot where homing did nothing at all, because the
carriage might already have been at the bottom.

**`assertEquals` with three arguments is expected, actual, tolerance.** Floating
point never lands exactly, and physics never lands twice in the same place, so a
tolerance isn't a cop-out — it's the claim. Two centimetres says "this is what
'homed' means to me."

---

## 6. Two traps that will waste your evening

Both of these cost real time while this course was being written. Neither
produces an error message that points anywhere near the cause.

### The real-time trap

Look at `tick()` again: it sleeps a **full 20 ms**. That looks like a waste — the
test would finish five times faster without it.

Take it out and the test still passes. The numbers become fiction.

The physics model advances 20 ms of simulated time every time you step it. Phoenix's
simulated firmware, running the closed loops, advances on the **wall clock**. Sleep
only 4 ms and the mechanism moves five times further per unit of firmware time than
it ever could on a real robot.

The measured symptom, on this exact test: with 4 ms sleeps, homing still "succeeds"
— and the final height reads **−0.34 m**. A third of a metre below the floor. On a
real robot that's impossible, and it looks precisely like a broken homing routine,
which is where you'll spend the evening.

**If a test involves physics, sleep the full tick.** A slow correct test is worth
more than a fast one that lies.

### Simulated devices outlive their test

Everything a subsystem allocates — a CAN ID, a DIO channel — is claimed for the
life of the **JVM**, not the life of the test. All your tests run in one JVM.

Build a second `Elevator` in a second test method and you get:

*Nothing to add — this is the error, so you recognise it:*

```
AllocationException: Code: -1029
```

That's the DIO channel for the bottom limit switch, still held by the first
elevator. `HAL.shutdown()` does not release it.

Two ways out, and this course uses both:

- **One sequential scenario per subsystem**, in a single test method, the way
  `ElevatorHomingTest` does. Less isolated than ideal, and honest about it.
- **Give each test its own CAN IDs** when you're building bare motors rather than
  whole subsystems. Note that IDs must be **62 or lower** — a rig on ID 70 fails
  silently, with no output at all.

---

## 7. What to test, and what not to

You could write tests forever. Most of them wouldn't be worth having.

The ones that earn their place are **claims a compiler can't check and a plot
won't show you twice**:

- **Rules with many combinations.** The transition table. Thirty cases, one loop.
- **Behaviours that fix something.** Homing. The claim isn't a number, it's a
  before-and-after.
- **Things you got wrong once.** Every bug you fix is a test worth writing, because
  it already proved it can happen.
- **Invariants you're relying on elsewhere.** Lesson 24's guard rule only works if
  `canGoTo` is right.

The ones that aren't worth it:

- **Whether a constant equals itself.** `assertEquals(40, kElevatorSupplyLimit)`
  tests nothing except that you can read.
- **Whether a gain is well tuned.** That's a judgement about a plot, and a test
  that asserts it will be wrong the first time somebody improves it.
- **Anything the compiler already guarantees.**

> A test suite is code you have to maintain. Three tests that fail when something
> real breaks are worth more than thirty that fail whenever anyone touches
> anything.

**Run them:**

```powershell
./gradlew test
```

Green means every claim you wrote down is still true. Red means one of them isn't
— and because the method name is a sentence, the failure tells you *which claim*
before you've opened a single file.

Now break something on purpose. Change `SuperstructureState.canGoTo` so `IDLE` can
reach `SCORING`, and run the tests again. `scoringRequiresSomethingToScore` fails,
by name, in about a second. That's the whole point: you found out immediately,
from a machine, instead of at an event, from a driver.

---

## Try it

1. **Test Lesson 22's claim.** A spinning roller does not mean a held piece. Drive
   the roller with nothing on the field and assert `hasGamePiece()` stays false —
   the same claim the lesson made in prose.
2. **Test the arm's soft limits.** Lesson 20 put limits in the firmware *and* a
   clamp in the code, deliberately. Bypass the clamp and assert the firmware still
   holds. This one needs its own CAN IDs.
3. **Break a gain and watch the right test fail.** Set `kElevatorKG` to zero and
   run the suite. Which test catches it? If none does, that's information — write
   the one that would.
4. **Write the test for a bug you actually had.** Somewhere in the last thirty-one
   lessons you got something wrong and fixed it. Write the test that would have
   caught it, and notice how much easier it is to write now that you know the
   answer.
5. **Make a test lie to you.** Delete the `DriverStationSim.setEnabled(true)` line
   from the homing test and see what happens. It should fail — but work out
   whether a *differently written* test might have passed instead, and what that
   tells you about assertions that only check for absence.

---

## What you learned

The robot's behaviour is now something a machine checks, rather than something you
remember checking.

**A test is a claim with a name.** `homingReplacesTheEncodersGuessWithTheSwitchesFact`
isn't a method name, it's a sentence somebody can disagree with — and when it goes
red, that sentence is the error message. Naming tests as claims rather than as
"testElevator1" is most of what makes a suite readable a year later.

**Arrange, act, assert — and the arrange half does real work.** The two assertions
before homing ran are what stop the test passing on a robot where homing does
nothing. A test that only checks the end state often checks less than you think.

**The simulation has rules, and breaking them fails quietly.** Sleep the full tick
or the physics outruns the firmware and your numbers become fiction — a third of a
metre below the floor, in this case, with no error anywhere. Simulated devices are
claimed for the life of the JVM, so tests are not as isolated as JUnit makes them
look. Neither of those is discoverable from a stack trace.

And the judgement that matters most: **test the claims a compiler can't check and
a plot won't show you twice.** Not constants. Not gains. The rules with too many
combinations to press by hand, the behaviours that fix something, and every bug
you've already had once — because those have proved they can happen.

That's the last thing standing between "it worked on Tuesday" and knowing. Go and
write one test for something you're quietly unsure about; that unease is usually
right.
