# Lesson 22 — Beam breaks: knowing you actually have it

**Goal:** Give the arm a beam break so it can tell the difference between "the
roller is spinning" and "there is a game piece in here," then let that one
boolean drive both mechanisms automatically — with `Trigger` composition doing
the logic instead of a pile of `if`s.

**New Java concepts**
- **`Trigger` combinators** — `.debounce(...)` and `.and(...)`, building a
  condition out of smaller conditions instead of nesting checks by hand

**New robot concepts**
- **Beam-break sensors** — electrically just another `DigitalInput`, doing a
  completely different job
- **The safe failure direction depends on the job**, not on the sensor
- **Debouncing** a signal that flickers at exactly the wrong moment
- **Coordinating two subsystems from one sensor event**
- **`IntakeSimulation`** — maple-sim game pieces the roller can genuinely catch

---

## 1. The roller doesn't know

Lesson 20 gave the arm a roller and a button to spin it. Ask yourself what the
robot knows after the driver holds that button for a second.

It knows the roller is turning. `Arm/RollerVelocityRotPerSec` will happily report
sixty rotations a second whether the intake is full of game piece or full of air.
Nothing in the code so far can tell those two apart, which means every decision
built on "we probably have one by now" is a guess — and a guess made by a driver
watching from behind a wall, two seconds late.

Real robots settle this with a sensor that answers one question: **is there
something in the place where a captured piece sits?** The usual answer is a
**beam break** — an emitter on one side of the intake throat, a receiver on the
other, and a game piece that interrupts the light between them.

That single boolean turns out to be worth a lot. Once the robot knows it's
holding something, it can put itself into carry position without being asked, and
it can refuse to fire when there's nothing to fire.

---

## 2. Another `DigitalInput`, a different safe direction

Electrically, a beam break is nothing new. It's a sensor that pulls a DIO channel
high or low, so in code it's the same `DigitalInput` and the same `get()` you used
for the limit switch.

What *is* new is which way round to wire it — and the interesting part is that
Lesson 21's answer is the wrong one here.

Run the same reasoning. A roboRIO DIO channel floats high, so a sensor that loses
its wire reads `true`. Now ask what each stuck reading costs you:

- **Stuck on "there's a piece."** The automatic handoff fires at nothing. The arm
  swings up on its own while the driver is doing something else. The score
  interlock happily lets you fire an empty intake.
- **Stuck on "no piece."** None of the automation ever runs, and the driver does
  everything by hand, exactly as they did in Lesson 20.

The second failure is a bad day; the first is a robot moving when nobody asked it
to. So the safe stuck-reading here is **"no piece"** — which is the opposite end
from the limit switch, where the safe stuck-reading was "stop."

Since a disconnected channel reads high, that means high has to mean *no piece*:
wire or configure the sensor so that a **broken beam pulls the line low**, and
read it as `!get()`.

> **The rule isn't about the sensor, it's about the consequence.** Ask what
> happens if this reading gets stuck, pick the direction whose failure you'd
> rather have, then wire to match. Two `DigitalInput`s on the same robot can
> honestly end up with opposite polarity, and this one does.

**Add to `ArmConstants` in `Constants.java`, below the roller speeds:**

```java
    // The beam break: an infrared beam across the throat of the intake, broken
    // when a game piece is actually sitting where it belongs.
    public static final int kBeamBreakChannel = 1; // roboRIO DIO — change to yours
    public static final Time kBeamDebounce = Seconds.of(0.1);

    // Sim only: the box maple-sim uses to decide what the roller can reach.
    public static final Distance kIntakeWidth = Inches.of(24);
    public static final Distance kIntakeExtension = Inches.of(12);
```

**Add the `Time` measure type, next to the other `units.measure` imports:**

```java
import edu.wpi.first.units.measure.Time;
```

---

## 3. Add it to `ArmIO`

One more input, same as every sensor since Lesson 13 — which also means it lands
in the log for free, so a replay can show you exactly when the robot believed it
was holding something.

**Add to `ArmIOInputs` in `ArmIO.java`:**

```java
        public boolean hasGamePiece = false;
```

**Add to `ArmIOTalonFX`'s imports:**

```java
import edu.wpi.first.wpilibj.DigitalInput;
```

**Add to `ArmIOTalonFX`, with the other fields:**

```java
    private final DigitalInput m_beamBreak =
            new DigitalInput(ArmConstants.kBeamBreakChannel);
```

**And read it in `updateInputs`, after the roller velocity:**

```java
        // Wired so that a broken beam pulls the line low. An unplugged sensor
        // floats high, which reads as "no game piece" — the harmless answer.
        inputs.hasGamePiece = !m_beamBreak.get();
```

**Add the accessor to `Arm`, above `atGoal`:**

```java
    /** Is a game piece actually sitting in the intake? The roller can't tell you. */
    public boolean hasGamePiece() {
        return m_inputs.hasGamePiece;
    }
```

---

## 4. A simulator that can actually hold something

Now a question with a trap in it: what should the beam break read in simulation?

The tempting answer is "true once the roller has been running for a bit." Don't.
That would make the simulated sensor a function of the roller — and the entire
point of this lesson is that those are different things. You'd build the sensor,
run it in sim, see it work perfectly, and have proved nothing at all.

The honest answer needs game pieces that exist independently of your intake, and
you already have them. Lesson 16 put a physics-engine field under the robot, with
`Fuel` scattered on it, which the field view has been drawing ever since. maple-sim
can attach an **intake** to the chassis: a region that grabs a piece when the
intake is running *and* a piece is actually in front of it.

**Add a way to reach the simulated chassis — in `Drivetrain`, above `createDriveSim`:**

```java
    /** The simulated chassis, or null off SIM. Sim IO classes attach things to it. */
    public static SwerveDriveSimulation getDriveSim() {
        return m_driveSim;
    }
```

**Add to `ArmIOSim`'s imports:**

```java
import org.ironmaple.simulation.IntakeSimulation;
import org.ironmaple.simulation.SimulatedArena;
import org.ironmaple.simulation.seasonspecific.rebuilt2026.RebuiltFuelOnField;

import edu.wpi.first.math.geometry.Translation2d;
```

**Add to `ArmIOSim`, above the roller model:**

```java
    /**
     * maple-sim's model of what the roller can physically reach. It grabs game
     * pieces off the arena floor only while it is running and only when one is
     * actually in front of it — which is exactly what the beam break should see.
     */
    private final IntakeSimulation m_intakeSim = IntakeSimulation.OverTheBumperIntake(
            "Fuel",
            Drivetrain.getDriveSim(),
            ArmConstants.kIntakeWidth,
            ArmConstants.kIntakeExtension,
            IntakeSimulation.IntakeSide.FRONT,
            1); // this intake holds one piece
```

**Register it at the end of `ArmIOSim`'s constructor:**

```java
        m_intakeSim.register(); // put it in the arena so collisions count
```

**Add to `ArmIOSim` — the roller now reaches into the world:**

```java
    @Override
    public void setRollerOutput(double output) {
        super.setRollerOutput(output);
        if (output > 0) {
            m_intakeSim.startIntake(); // reaching out, able to grab
        } else {
            m_intakeSim.stopIntake();
            if (output < 0 && m_intakeSim.obtainGamePieceFromIntake()) {
                // Spat back onto the field in front of the robot, where you can
                // go and pick it up again.
                var pose = Drivetrain.getDriveSim().getSimulatedDriveTrainPose();
                SimulatedArena.getInstance().addGamePiece(new RebuiltFuelOnField(
                        pose.getTranslation().plus(
                                new Translation2d(0.8, 0).rotateBy(pose.getRotation()))));
            }
        }
    }
```

**And override the sensor in `updateInputs`, after the `super` call:**

```java
        // The beam break reads the arena, not the roller. Spin it in empty space
        // and nothing happens — which is the entire reason for having the sensor.
        inputs.hasGamePiece = m_intakeSim.getGamePiecesAmount() > 0;
```

That comment is the whole section. In simulation you can now hold the intake
button down in the middle of an empty field for as long as you like and
`Arm/HasGamePiece` stays `false`, exactly as it would on a real robot — because
the signal comes from whether a piece is really there, not from whether you asked
for one.

It's the same move Lesson 21 made with the limit switch, one level up. There, the
switch read the physics model's true height instead of the encoder's belief. Here,
the beam break reads the arena's true contents instead of the roller's intent.
**A simulated sensor is only worth having if it can tell you no.**

---

## 5. Believe it, but not instantly

A game piece arriving at an intake does not glide smoothly into place. It tumbles,
bounces off a wall of the intake, and can cross the beam and come back out again
before it settles. A beam break watching that reports `true` for thirty
milliseconds, then `false`, then `true` for good.

If you hang an automatic sequence off the raw signal, that first thirty
milliseconds launches it. The arm starts swinging up while the piece is still
half in.

`Trigger` has this built in:

*Nothing to add — this is the method you're about to use:*

```java
someTrigger.debounce(0.1)
```

It makes a new `Trigger` that only goes true once the original has been true
*continuously* for that long. Worth knowing exactly what it does at each edge:
the one-argument version debounces **rising edges only**, so it delays believing
"yes" while reporting "no" the instant the signal drops. That's the right shape
here. Be sure before you commit to an automatic sequence; notice a dropped piece
immediately.

> In this simulation the signal is clean — a captured piece stays captured, so
> you won't see the debounce do anything at all. That's fine. It costs nothing
> when the sensor behaves, and the sensor will not always behave.

---

## 6. Conditions that compose

The second combinator is `.and(...)`, and it's the one that saves you from a mess.

Think about what should have to be true before the robot fires a game piece: the
driver asked for it, there's actually a piece on board, and the elevator has
arrived at the height it was sent to. Written by hand, that's a nested condition
inside a command, re-checked every tick, with the "is it still true?" logic your
problem to get right.

Written as `Trigger`s it's an expression:

*Nothing to add — this is the shape, not the code you'll type:*

```java
triggerA.and(triggerB).and(triggerC).whileTrue(someCommand)
```

Each `.and(...)` builds a new `Trigger` whose boolean is both of its parts, and
the scheduler polls the whole thing every tick like any other. The command runs
while all three hold and stops when any one of them stops — and you didn't write a
single `if`.

`.and(...)` takes any `BooleanSupplier`, which means a method reference works just
as well as another `Trigger`. `m_arm::hasGamePiece` slots straight in.

---

## 7. Wire the cycle

Two bindings, and between them they close the loop.

**Add to `RobotContainer`'s imports:**

```java
import static edu.wpi.first.units.Units.Seconds;
```

**Add to `configureBindings`, below the roller bumpers:**

```java
    // Capture. The beam break says a piece is really in there — not that the
    // roller is spinning. Debounced, so a piece tumbling past can't trigger it.
    new Trigger(m_arm::hasGamePiece)
        .debounce(ArmConstants.kBeamDebounce.in(Seconds))
        .onTrue(Commands.parallel(
            m_arm.goToAngle(ArmConstants.kStowed),
            m_elevator.goToHeight(ElevatorConstants.kScoreMid)));

    // Score, but only when it makes sense: a piece on board, and the elevator
    // actually arrived where it was sent.
    m_driverController.rightTrigger()
        .and(m_arm::hasGamePiece)
        .and(m_elevator::atGoal)
        .whileTrue(m_arm.runRoller(ArmConstants.kEjectSpeed));
```

The first binding is the one worth pausing on, and not because of the sensor.
`Commands.parallel(...)` is running **two different subsystems from one sensor
event** — the arm stows and the elevator rises at the same moment, off a boolean
that no button produced. That's Lesson 9's command composition, thirteen lessons
later, finally doing the thing it was built for.

Parallel is a choice, not a rule. If the arm had to clear the frame before the
elevator could move, `Commands.sequence(...)` would be the answer instead, and
nothing else about the binding would change.

Notice also what the capture binding does to the driver's roller button. They're
holding right bumper, the piece gets caught, and this command takes the arm — which
interrupts `runRoller`, which stops the roller. That's the behavior you want, and
you got it for free from the scheduler's requirement rules rather than by writing
any of it.

---

## 8. Run it

`./gradlew simulateJava`, **Teleoperated**. Open AdvantageScope with an **Odometry**
tab showing `Drivetrain/Pose` and the `Fuel` array Lesson 16 already logs, plus a
graph of `Arm/HasGamePiece` and `Arm/RollerVelocityRotPerSec`.

First, prove the point. Press **X** to drop the arm to intake position, hold **right
bumper**, and just sit there in open field. The roller trace climbs to about sixty
rotations a second. `HasGamePiece` stays flat `false`. Spinning is not holding, and
now the robot agrees.

Now drive toward one of the `Fuel` pieces on the field with the bumper held. The
moment the intake reaches it:

- `Arm/HasGamePiece` flips to `true`.
- The arm swings up to 90° and the elevator rises to 0.75 m, together, because one
  sensor reading scheduled both.
- The roller stops on its own — the driver is still holding the button, and it
  doesn't matter.

Watch it happen on the **Mechanism** tab from Lesson 19 while you're at it. Both
segments of the stick figure move at once, off a boolean.

Then pull the **right trigger**. The piece is ejected and lands back on the field
in front of you, `HasGamePiece` goes false, and you can go and collect it again.
Try pulling the trigger with an empty intake and nothing happens at all — the
`.and(...)` chain simply never becomes true.

Finally, record a lap of that cycle and replay it with `kSimMode = Mode.REPLAY`.
`HasGamePiece` comes back identically, because it went into the log as an input
like every other sensor in this course.

---

## Try it

> **Do these in simulation** (`kSimMode = Mode.SIM`). Nothing here is dangerous by
> itself, but #2 deliberately makes the robot move on a false sensor reading, and
> that's a thing to watch happen on a screen rather than on a field.

1. **Break the polarity.** Change `!m_beamBreak.get()` to `m_beamBreak.get()` in
   `ArmIOTalonFX` and reason about what a real robot would do at power-on with
   nothing plugged in. (The simulator overrides this value, so you'll have to
   reason it out rather than watch it — which is the exercise.)
2. **Make it twitchy.** In `ArmIOSim`, report `hasGamePiece` as true only on
   every other tick while a piece is held. Watch the handoff sequence fire and
   cancel repeatedly, then raise `kBeamDebounce` until it settles. Now you've seen
   what the debounce is insuring you against.
3. **Add the second interlock.** Right now `.and(m_elevator::atGoal)` is happy at
   *any* goal, including stowed. Tighten it so scoring also requires the elevator
   to be above some height — one more `.and(...)`, no new `if`.
4. **Refuse to intake when full.** Bind the roller's intake button through a
   `Trigger` that also requires `hasGamePiece` to be false. One `.negate()` and one
   `.and(...)`.
5. **Log what you decided, not just what you sensed.** Record a boolean output for
   "ready to score" — piece present and elevator at goal — and put it on the same
   graph as `HasGamePiece`. When something misbehaves in a match, the log of what
   the robot *concluded* is usually more useful than the log of what it saw.

---

## What you learned

The sensor was the small part. A beam break is a `DigitalInput` you already knew
how to read, and the interesting work was everything around it.

**The safe failure direction is a property of the job.** Lesson 21's limit switch
wanted to fail toward "stop"; this beam break wants to fail toward "I have
nothing." Same hardware, same pull-up, opposite wiring, and the way you tell them
apart is to ask what a stuck reading would make the robot do. That question is
worth asking of every sensor you ever add.

**A simulated sensor has to be able to say no.** It would have been half an hour's
work to make `hasGamePiece` follow the roller, and the result would have looked
perfect and taught nothing. Wiring it to maple-sim's arena instead means the
simulator can disagree with you — which is the only reason to have one.

**Conditions compose.** `new Trigger(m_arm::hasGamePiece).debounce(0.1)` and
`.and(m_elevator::atGoal)` do work that would otherwise be flags, nested `if`s and
edge-detection bookkeeping scattered across two subsystems. You built a small
piece of robot behavior by describing when it should happen rather than by
checking, every tick, whether it should be happening now.

And the last one is worth sitting with. Look at what the capture binding actually
is: one sensor reading, and two mechanisms that put themselves where they need to
be. There's no `Superstructure` class, no state machine, no coordinator. There's a
subsystem that owns an arm, a subsystem that owns an elevator, commands that
describe what each can do, and a scheduler that was always going to be able to run
them together.

That structure has been there since Lesson 1, when `RobotContainer` bound a single
button to a single motor. Everything since — the IO layers, the physics models, the
replay, the feedforward models, the paths, the pictures, the sensors — has been
filling it in. You're now running a robot with four subsystems, three physics
models, two cameras, and a field full of game pieces, and the wiring diagram is
still the one from the first page.

That's the thing to take with you. Not the API names, which will drift; the shape.

Which leaves one gap, and it's a funny one for a robot this capable: it knows a
great deal about itself and has no way to tell anybody. Every sensor reading in the
last three lessons lives on a laptop screen. Time to put some of it where a human
can see it.

Next: [Lesson 23 — LEDs: showing what the robot is thinking](23-leds.md).
