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
- **Coordinating two mechanisms from one sensor event**
- **A simulated intake** — game pieces on the field that the roller can
  genuinely catch, and genuinely miss

---

## 1. The roller doesn't know

Lesson 20 gave the arm a roller and a bumper to spin it. Ask yourself what the
robot knows after the driver holds that bumper for a second.

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

Run the same reasoning. Every DIO channel pulls up to high on its own, so a sensor
that loses its wire reads `true`. Now ask what each stuck reading costs you:

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
    public static final int kBeamBreakChannel = 1; // DIO — change to yours
    public static final Time kBeamDebounce = Seconds.of(0.1);

    // Sim only: the box in front of the bumper that the roller can reach, and
    // where the game pieces lie on the field when the simulation starts.
    public static final Distance kIntakeWidth = Inches.of(24);
    public static final Distance kIntakeReach = Inches.of(12);
    public static final Translation2d[] kSimGamePiecePositions = {
        new Translation2d(4.5, 3.2),
        new Translation2d(2.0, 1.5),
        new Translation2d(6.0, 3.8),
    };
```

**Add the `Seconds` static import and the `Time` measure type, next to the
others of their kind:**

```java
import static org.wpilib.units.Units.Seconds;
```

```java
import org.wpilib.units.measure.Time;
```

The first of those game pieces sits 1.5 m straight ahead of where the simulated
robot starts, which is on purpose. You'll drive to it in section 8.

---

## 3. Add it to `ArmIO`

One more input, same as every sensor since Lesson 13. It lands in the log, where
you can see exactly when the robot believed it was holding something, without a
line of logging code: `processInputs` records every field of the arm's bundle,
so a new field shows up as `Arm/HasGamePiece` on its own.

**Add to `ArmIOInputs` in `ArmIO.java`:**

```java
    public boolean hasGamePiece = false;
```

**Add to `ArmIOTalonFX`'s imports:**

```java
import org.wpilib.hardware.discrete.DigitalInput;
```

**Add to `ArmIOTalonFX`, with the other fields:**

```java
  private final DigitalInput m_beamBreak = new DigitalInput(ArmConstants.kBeamBreakChannel);
```

**And read it in `updateInputs`, after the roller velocity:**

```java
    // Wired so that a broken beam pulls the line low. An unplugged sensor
    // floats high, which reads as "no game piece": the harmless answer.
    inputs.hasGamePiece = !m_beamBreak.get();
```

**And add the accessor to `Arm`, above `atGoal`:**

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

The honest answer needs game pieces that exist independently of your intake: on
the field, at places of their own, whether or not the robot ever comes near them.
Nothing hands you that on this track, so you'll build the small piece of it you
need, the same way Lesson 16 built ground truth. The simulated intake catches a
piece only when three things are all true at once: the roller is pulling inward,
the arm is down where it can reach the floor, and a piece is actually in the box
just in front of the bumper.

That last check needs to know where the robot *really* is — not where the pose
estimate thinks it is, but the simulated chassis itself. `Drivetrain` has been
able to tell you that since Lesson 16, and the cameras already ask it.

### Hand the arm the robot's true position

**Change the arm's line in `Robot.java`:**

```java
  // Arm reads elevator.getCarriage() in its constructor, so elevator must be
  // a finished object first — it already is, above. In simulation its intake
  // also needs to know where the robot really is, which only drivetrain knows.
  public final Arm arm = new Arm(elevator, drivetrain::getSimulatedPose);
```

That means `Arm`'s constructor takes a second argument — and runs straight into a
Java rule worth knowing. Right now `Arm` picks its IO in a field initializer, up
with the other fields. **A field initializer can't see the constructor's
parameters**: it runs before the constructor body, and the parameters don't exist
yet. So the choice moves into the constructor, and the field is left unassigned
until then — exactly how `Robot` builds its cameras.

**In `Arm`, replace the `m_io` field and its `switch` with a field that's
assigned later:**

```java
  private final ArmIO m_io;
```

**Then replace the start of `Arm`'s constructor, so it takes the pose and makes
the choice itself:**

```java
  public Arm(Elevator elevator, Supplier<Pose2d> simulatedRobotPose) {
    // Chosen here rather than up with the fields: the simulated intake needs
    // to know where the robot really is, and only the constructor is told.
    m_io = switch (Constants.kCurrentMode) {
      case REAL -> new ArmIOTalonFX();
      case SIM -> new ArmIOSim(simulatedRobotPose);
      case REPLAY -> new ArmIO() {}; // inputs come from the log
    };
    m_ligament = elevator.getCarriage().append(new MechanismLigament2d(
        "Arm", ArmConstants.kArmLength.in(Meters), toDrawingAngle(ArmConstants.kMinAngle).in(Degrees)));
    Scheduler.getDefault().addPeriodic(this::periodic);
  }
```

**Add to `Arm`'s imports:**

```java
import java.util.function.Supplier;
```

```java
import org.wpilib.math.geometry.Pose2d;
```

### The field, and the catch

**Add to `ArmIOSim`'s imports:**

```java
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

import org.wpilib.math.geometry.Pose2d;
import org.wpilib.math.geometry.Rotation2d;
import org.wpilib.math.geometry.Translation2d;
```

```java
import org.littletonrobotics.junction.Logger;

import first.robot.Constants.DriveConstants;
```

**Add to `ArmIOSim`, below the roller model — the field's pieces, and what the
intake knows:**

```java
  // The game pieces lying on the field. Nothing in the robot's own code reads
  // this list: the only way the robot learns about a piece is the beam break,
  // and only once a piece is really inside the intake.
  private final List<Translation2d> m_piecesOnField =
      new ArrayList<>(List.of(ArmConstants.kSimGamePiecePositions));
  private boolean m_holdingPiece = false;
  private double m_rollerOutput = 0.0;

  /** Where the robot really is: the simulated chassis, not the estimate. */
  private final Supplier<Pose2d> m_robotPose;
```

**Replace `ArmIOSim`'s constructor, so it takes the pose and keeps it:**

```java
  public ArmIOSim(Supplier<Pose2d> robotPose) {
    super(); // build both motors and apply the real configs
    m_pivotSim = m_pivot.getSimState();
    m_rollerSim = m_roller.getSimState();
    m_robotPose = robotPose;
  }
```

**Add to `updateInputs`, after the `super` call:**

```java
    // Catch a piece if the roller is pulling in, the arm is down where it can
    // reach the floor, and a piece is really there.
    if (!m_holdingPiece && m_rollerOutput > 0 && m_model.getAngle() < 0) {
      for (int i = 0; i < m_piecesOnField.size(); i++) {
        if (inReach(m_piecesOnField.get(i))) {
          m_piecesOnField.remove(i);
          m_holdingPiece = true;
          break;
        }
      }
    }

    // The beam break reads what's in the intake, not what the roller is doing.
    // Spin it in empty space and nothing happens, which is the entire reason
    // for having the sensor.
    inputs.hasGamePiece = m_holdingPiece;

    Pose2d[] pieces = new Pose2d[m_piecesOnField.size()];
    for (int i = 0; i < pieces.length; i++) {
      pieces[i] = new Pose2d(m_piecesOnField.get(i), new Rotation2d());
    }
    Logger.recordOutput("Sim/GamePieces", pieces); // simulation only: no replay has a field
```

The intake holds one piece, so the moment it catches one it stops looking —
that's what the `break` is for. And the last few lines record where the pieces
are, as poses, which is the shape AdvantageScope draws on its field. It's an
output, like Lesson 16's `Drivetrain/SimulatedPose`, and for the same reason it
only exists in simulation: a replay builds no `ArmIOSim` and has no field, so it
gets the beam break's answer straight from the log, and the pieces show up only
under `RealOutputs`.

**Add two methods to `ArmIOSim`, below `updateInputs`. First, the roller reaching
into the world:**

```java
  @Override
  public void setRollerOutput(double output) {
    super.setRollerOutput(output);
    m_rollerOutput = output;
    if (output < 0 && m_holdingPiece) {
      // Spat back onto the field in front of the robot, where you can go and
      // pick it up again.
      Pose2d robot = m_robotPose.get();
      m_piecesOnField.add(
          robot.getTranslation().plus(new Translation2d(0.8, 0).rotateBy(robot.getRotation())));
      m_holdingPiece = false;
    }
  }
```

This one *overrides* the real class's method, and still calls it first with
`super` — so the real roller motor gets the same output it always did, and the
simulation gets to notice what was asked.

**Then the box in front of the bumper:**

```java
  /** Is this piece inside the box in front of the bumper that the roller can reach? */
  private boolean inReach(Translation2d piece) {
    Pose2d robot = m_robotPose.get();
    // The piece as the robot sees it: x straight ahead, y to the left.
    Translation2d fromRobot =
        piece.minus(robot.getTranslation()).rotateBy(robot.getRotation().unaryMinus());
    double front = DriveConstants.kHalfLength;
    return fromRobot.getX() > front
        && fromRobot.getX() < front + ArmConstants.kIntakeReach.in(Meters)
        && Math.abs(fromRobot.getY()) < ArmConstants.kIntakeWidth.in(Meters) / 2;
  }
```

The one line worth slowing down for is `fromRobot`. A piece's position is
recorded on the field: "4.5 m along, 3.2 m across." The box the roller can reach
is described from the robot: "just past the front bumper, a foot deep, two feet
wide." To compare the two, put the piece in the robot's terms — subtract where
the robot is, so the robot is at the origin, then undo the robot's heading with
`rotateBy` its opposite, so "ahead of the robot" is the x direction. After that,
"is it in the box?" is three plain comparisons. You'll meet this exact move again
any time the robot has to reason about something on the field.

The comment in `updateInputs` is the whole section. In simulation you can now hold
the intake button down in the middle of an empty field for as long as you like and
`Arm/HasGamePiece` stays `false`, exactly as it would on a real robot — because
the signal comes from whether a piece is really there, not from whether you asked
for one.

It's the same move Lesson 21 made with the limit switch, one level up. There, the
switch read the physics model's true height instead of the encoder's belief. Here,
the beam break reads where the pieces truly are instead of the roller's intent.
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
someTrigger.debounce(ArmConstants.kBeamDebounce)
```

It makes a new `Trigger` that only goes true once the original has been true
*continuously* for that long — and it takes the `Time` constant as it is, no
unpacking to seconds. Worth knowing exactly what it does at each edge: the
one-argument version debounces **rising edges only**, so it delays believing
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
as well as another `Trigger`. `robot.arm::hasGamePiece` slots straight in.

---

## 7. Wire the cycle

Two bindings, and between them they close the loop.

**Add to `RobotTeleop.java`'s imports:**

```java
import org.wpilib.command3.Command;
```

**Add to `RobotTeleop`'s constructor, below the limit-switch trigger:**

```java
    // Capture. The beam break says a piece is really in there, not that the
    // roller is spinning. Debounced, so a piece tumbling past can't trigger it.
    new Trigger(robot.arm::hasGamePiece)
        .debounce(ArmConstants.kBeamDebounce)
        .onTrue(Command.parallel(
                robot.arm.goToAngle(ArmConstants.kStowed),
                robot.elevator.goToHeight(ElevatorConstants.kScoreMid))
            .named("Capture"));

    // Score, but only when it makes sense: a piece on board, and the elevator
    // actually arrived where it was sent.
    robot.driverController.rightTrigger()
        .and(robot.arm::hasGamePiece)
        .and(robot.elevator::atGoal)
        .whileTrue(robot.arm.runRoller(ArmConstants.kEjectSpeed));
```

The first binding is the one worth pausing on, and not because of the sensor.
`Command.parallel(...)` is running **two different mechanisms from one sensor
event** — the arm stows and the elevator rises at the same moment, off a boolean
that no button produced. That's Lesson 9's command composition, thirteen lessons
later, finally doing the thing it was built for.

Parallel is a choice, not a rule. If the arm had to clear the frame before the
elevator could move, `Command.sequence(...)` would be the answer instead, and
nothing else about the binding would change.

Notice also what the capture binding does to the driver's roller button. They're
holding the right bumper, the piece gets caught, and this command takes the arm —
which interrupts `runRoller`, which stops the roller. That's the behavior you
want, and you got it for free from the scheduler's requirement rules rather than
by writing any of it.

---

## 8. Run it

`./gradlew simulateJava`, **Teleoperated**. Open AdvantageScope with an
**Odometry** tab showing `Drivetrain/SimulatedPose` — where the robot really is —
and `Sim/GamePieces` (both under **AdvantageKit → RealOutputs**), plus a graph of
`Arm/HasGamePiece` and `Arm/RollerVelocityRotPerSec` (under **AdvantageKit →
Arm**).

**Home the elevator first** (Back), the way Lesson 21 taught you — or wait the
eighteen seconds it takes to land on its switch by itself. A catch is about to
send the elevator to a height, and that height should mean something.

First, prove the point. Press the left face button (X) to drop the arm to the
floor, then hold the **right bumper** and just sit there in open field. The roller
trace climbs to about sixty rotations a second. `HasGamePiece` stays flat
`false`. Spinning is not holding, and now the robot agrees.

> Drop the arm *before* you hold the bumper. The arm's motor and the roller belong
> to the same mechanism, so the arm button takes it over and stops the roller —
> the same rule that's about to work in your favor.

Now, with the bumper still held, drive straight ahead toward the piece in front of
you. The moment it reaches the box just past the bumper — when its center is about
0.6 m ahead of the robot's:

- `Arm/HasGamePiece` flips to `true`.
- The arm swings up to 90° and the elevator rises to 0.75 m, together, because one
  sensor reading scheduled both.
- The roller stops on its own — the driver is still holding the button, and it
  doesn't matter.

Watch it happen on the **Mechanism** tab from Lesson 19 while you're at it
(`/Telemetry/Elevator/Mechanism`). Both segments of the stick figure move at once,
off a boolean.

Then pull the **right trigger**. The piece is ejected and lands back on the field
0.8 m in front of the robot's center, `HasGamePiece` goes false, the roller stops
the instant it does, and you can go and collect the piece again. Pull the trigger
with an empty intake and nothing happens at all — the `.and(...)` chain simply
never becomes true.

Last, make the simulator say no one more way. With the arm still up, hold the
bumper and creep forward until the piece you just ejected is right in front of the
bumper. Nothing. The roller is spinning and the piece is there, but the arm isn't
down where it can reach the floor. Let go of the bumper, drop the arm, hold the
bumper again — and it's caught at once.

---

## Try it

> **Do these in simulation.** Nothing here is dangerous by itself, but #2
> deliberately makes the robot move on a false sensor reading, and that's a thing
> to watch happen on a screen rather than on a field.

1. **Break the polarity.** Change `!m_beamBreak.get()` to `m_beamBreak.get()` in
   `ArmIOTalonFX` and reason about what a real robot would do at power-on with
   nothing plugged in. (The simulator overrides this value, so you'll have to
   reason it out rather than watch it — which is the exercise.)
2. **Make it twitchy.** In `ArmIOSim`, report `hasGamePiece` as true only on
   every other tick while a piece is held. Watch `HasGamePiece` flicker and the
   capture never happen: the debounce never sees a tenth of a second of steady
   "yes." Then take the `.debounce(...)` line out and watch the capture fire on
   the very first flicker. Neither is what you want from a sensor that flickers
   forever — which is the point. A debounce smooths a sensor that settles; one
   that never settles needs its wiring looked at.
3. **Add the second interlock.** Right now `.and(robot.elevator::atGoal)` is happy
   at *any* goal, including stowed. Tighten it so scoring also requires the
   elevator to be above some height — one more `.and(...)`, no new `if`.
4. **Refuse to intake when full.** Bind the roller's intake button through a
   `Trigger` that also requires `hasGamePiece` to be false. One `.negate()` and
   one `.and(...)`.
5. **Log what you decided, not just what you sensed.** Log a boolean for "ready to
   score" — piece present and elevator at goal — and put it on the same graph as
   `HasGamePiece`. When something misbehaves in a match, the log of what the robot
   *concluded* is usually more useful than the log of what it saw.

---

## What you learned

The sensor was the small part. A beam break is a `DigitalInput` you already knew
how to read, and the interesting work was everything around it.

**The safe failure direction is a property of the job.** Lesson 21's limit switch
wanted to fail toward "stop"; this beam break wants to fail toward "I have
nothing." Same hardware, same pull-up, opposite wiring, and the way you tell them
apart is to ask what a stuck reading would make the robot do. That question is
worth asking of every sensor you ever add.

**A simulated sensor has to be able to say no.** It would have been five minutes'
work to make `hasGamePiece` follow the roller, and the result would have looked
perfect and taught nothing. Building a field with pieces on it instead means the
simulator can disagree with you — the roller spinning in open air, the arm up when
it needed to be down — which is the only reason to have one.

**Conditions compose.** `new Trigger(robot.arm::hasGamePiece).debounce(...)` and
`.and(robot.elevator::atGoal)` do work that would otherwise be flags, nested `if`s
and edge-detection bookkeeping scattered across two mechanisms. You built a small
piece of robot behavior by describing when it should happen rather than by
checking, every tick, whether it should be happening now.

And the last one is worth sitting with. Look at what the capture binding actually
is: one sensor reading, and two mechanisms that put themselves where they need to
be. There's no coordinator class, no state machine. There's a mechanism that owns
an arm, a mechanism that owns an elevator, commands that describe what each can
do, and a scheduler that was always going to be able to run them together.

That structure has been there since Lesson 1, when your teleop opmode bound a
single button to a single motor. Everything since — the IO layers, the physics models,
the feedforward models, the paths, the pictures, the sensors — has been filling it
in. You're now running a robot with a drivetrain, an elevator and an arm, two
cameras, a simulated chassis and a field with game pieces on it, and the wiring
diagram is still the one from the first page.

That's the thing to take with you. Not the API names, which will drift; the shape.

Which leaves one gap, and it's a funny one for a robot this capable: it knows a
great deal about itself and has no way to tell anybody. Every sensor reading in the
last three lessons lives on a laptop screen. Time to put some of it where a human
can see it.

Next: [Lesson 23 — LEDs: showing what the robot is thinking](23-leds.md).
