# Lesson 23 — LEDs: showing what the robot is thinking

**Goal:** Drive an addressable LED strip from state the robot already computes, so
a human standing next to it can tell what it knows — and decide, on purpose, what
wins when two things are true at once.

**New Java concepts**
- **Combinator methods** — `LEDPattern.solid(...).blink(...).atBrightness(...)`,
  where each call returns a *new* value rather than changing anything. Third
  unrelated type in this course to work that way, which is when it stops being an
  API quirk and starts being a pattern.

**New robot concepts**
- **`AddressableLED`** and **`AddressableLEDBuffer`** — a strip, a pixel array,
  and one write per tick
- **`LEDPattern`** — an animation described as a value instead of written as a loop
- **When *not* to use the IO layer.** Four lessons have put hardware behind
  `XxxIO`; this one shouldn't, and the reason is worth more than the pattern.
- **Priority** — several conditions, one strip, and an ordering that is a design
  decision rather than an accident

---

## 1. Everything the robot knows and won't say

Take stock of what your robot currently knows about itself.

It knows whether a game piece is sitting in the intake. It knows whether the
elevator has reached the height it was sent to, and whether the arm has. It knows
whether the carriage is resting on its bottom limit. Every one of those is a
`boolean` you can read today, and it took five lessons of sensors to earn them.

Now stand three metres away, behind a field wall, holding a controller. How many
of them can you see?

None. The robot knows and won't say. That's fine while you're sitting at a laptop
with AdvantageScope open, and it is useless in a match — and worse than useless in
the pit, where the person who needs to know something about the robot is usually
not the person who wrote the code.

An LED strip fixes that, and it's the cheapest thing on the robot. What it costs
instead is a decision: the strip can show one thing at a time, and the robot knows
several. Deciding which one wins is most of this lesson.

---

## 2. A strip, a buffer, and one write per tick

Addressable LEDs are a chain of individually-controlled pixels on a single data
wire. In WPILib that's two objects: an **`AddressableLED`** for the port, and an
**`AddressableLEDBuffer`** holding the colour of every pixel.

You write colours into the buffer, then hand the whole buffer to the strip. Same
rhythm as Lesson 19's drawing — build it once, mutate it every tick, publish it
every tick.

**Add to `Constants.java`, as a new nested class above `ArmConstants`:**

```java
  public static class LedConstants {
    public static final int kPwmPort = 0; // roboRIO PWM — change to yours
    public static final int kLength = 40; // LEDs on the strip — change to yours

    // A pattern is a value, not a loop. Build them once, here, next to the
    // colours they use, and hand the finished description to the strip.
    public static final LEDPattern kNotHomed =
        LEDPattern.solid(Color.kRed).blink(Seconds.of(0.15));
    public static final LEDPattern kHasGamePiece = LEDPattern.solid(Color.kLimeGreen);
    public static final Time kBreathePeriod = Seconds.of(2);
    public static final Dimensionless kIdleBrightness = Percent.of(25);
  }
```

**Add both imports, each to the group it belongs in:**

```java
import edu.wpi.first.units.measure.Dimensionless;
import edu.wpi.first.wpilibj.LEDPattern;
```

Note the port: **PWM 0, not DIO 0.** Lesson 21 put the limit switch on DIO 0 and
Lesson 22 the beam break on DIO 1. Those are different connectors on the roboRIO
with separate numbering, so there's no clash — but it's exactly the kind of thing
that costs an afternoon if you assume otherwise.

---

## 3. A pattern is a value, not a loop

Here's the part that's more interesting than it looks.

If you've written LED code before, you probably wrote a loop: work out how far
through the blink cycle you are, decide whether this is an on frame or an off
frame, walk the buffer, set each pixel. Every animation is its own little pile of
timing arithmetic, and they're all subtly different.

**`LEDPattern` is not that.** A pattern is a *description* of what the strip should
look like, as a value you can hold in a variable. Solid green is a value. Solid
green blinking every 150 ms is also a value — and you get it by asking the first
one for it:

*Nothing to add — this is the shape, and you already wrote it in section 2:*

```java
LEDPattern.solid(Color.kRed).blink(Seconds.of(0.15))
```

`blink` doesn't blink anything. It returns a **new pattern** that happens to be
the old one, blinking. `solid(...)` is untouched, and you could hand it to a
different strip on the next line. That's why these live in `Constants.java`
alongside the colours: they're constants in the ordinary sense, not machinery.

Which brings us to the reason this lesson names the idea. You have now seen the
same shape three times, on three types that have nothing to do with each other:

| Lesson | Type | Example |
|---|---|---|
| 9 | `Command` | `run(...).until(...).finallyDo(...)` |
| 22 | `Trigger` | `trigger.debounce(0.1).and(...)` |
| 23 | `LEDPattern` | `solid(...).blink(...).atBrightness(...)` |

Every one takes a value and returns a new value with one more idea layered on.
Once you've noticed it, a lot of libraries stop being lists of methods to memorise
and start being small vocabularies you can combine. **When a method returns its own
type, try chaining it** — that guess is right far more often than it has any right
to be.

The measure arguments are the Lesson 10 habit still paying off: `blink(Seconds.of(0.15))`
and `atBrightness(Percent.of(25))` say what they mean without a comment.

---

## 4. No IO layer here, and why that's the interesting part

Every piece of hardware since Lesson 13 has gone behind an interface —
`ModuleIO`, `ElevatorIO`, `ArmIO`, `VisionIO`, each with a real implementation, a
sim implementation, and `@AutoLog` inputs. It is the most consistent structure in
this course.

The LED strip is not going to get one. That's worth a paragraph, because knowing
when a pattern doesn't apply is a more useful skill than knowing the pattern.

Go back to what the IO layer is *for*. Lesson 13 built it so that a log could be
replayed: sensor readings become **inputs**, inputs get recorded, and re-running
them through changed code reproduces the session exactly. Every piece of that
machinery exists to serve one direction of data — hardware into the robot.

An LED strip has no inputs. Nothing about it can be read, nothing about it can
surprise you, and there is nothing for a replay to reconstruct. Wrapping it in an
IO interface would give you a sim implementation that does nothing, an inputs
class with no fields, and a mode switch with three identical arms.

> **The IO layer is a tool with a purpose, not a ritual.** Lesson 19 already made
> this call once — the mechanism drawing is fields and a log call, no IO layer,
> for the same reason. If you find yourself writing an empty inputs class, stop
> and ask what you were hoping to replay.

What the strip *does* get is a log line, because "what was the robot showing at
14:32?" is a real question after a match.

---

## 5. Something worth showing

The most useful thing an LED strip can tell you in a pit is *don't enable me yet*.

Lesson 21 built homing, and it works — but look at what it leaves behind. `home()`
drives to the switch, resets the encoder, and finishes. Nothing anywhere records
that it ever ran. The robot goes from "every height I report is a guess" to "every
height I report is real" and keeps no memory of which side of that line it's on.

**Add to `Elevator`, next to `m_goal`:**

```java
    private boolean m_homed = false;
```

**Set it in `home()`'s `finallyDo`, after the goal:**

```java
                    m_homed = true;
```

**Add the accessor, above `atBottomLimit`:**

```java
    /** Has homing ever run? Until it has, every height on this elevator is a guess. */
    public boolean isHomed() {
        return m_homed;
    }
```

**And log it, next to the other outputs in `periodic()`:**

```java
        Logger.recordOutput("Elevator/Homed", m_homed);
```

Three lines and an accessor, for something the robot already knew and had no way
to say. That's usually how this goes: the sensor work was Lesson 21's, and the
only thing missing was somewhere to put the answer.

---

## 6. Four conditions, one strip

Now the design problem.

You have four things worth showing and one strip to show them on. Here they are,
and the order is the whole point:

| Priority | When | What the strip does |
|---|---|---|
| 1 | not homed | red, blinking fast |
| 2 | holding a game piece | solid green |
| 3 | disabled | alliance colour, breathing |
| 4 | anything else | alliance colour, dim |

**Two of those can be true at the same time.** A robot can be unhomed *and*
holding a game piece — somebody loaded a piece into it in the queue line before
anyone ran homing. That's not a rare edge case, it's a Tuesday. The strip can only
say one thing, so you have to decide which, and there's a right answer: a piece in
the intake is nice to know, but an unhomed elevator is about to drive itself into
the top of the frame. **The dangerous thing outranks the useful thing.**

That decision has to live somewhere. Writing it as an ordered chain — first match
wins, read top to bottom — makes it something you can point at in a design review.

**Create `src/main/java/frc/robot/subsystems/Leds.java`:**

```java
package frc.robot.subsystems;

import org.littletonrobotics.junction.Logger;

import edu.wpi.first.wpilibj.AddressableLED;
import edu.wpi.first.wpilibj.AddressableLEDBuffer;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.LEDPattern;
import edu.wpi.first.wpilibj.util.Color;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.LedConstants;

/**
 * The strip. It owns no motors and makes no decisions about what the robot does —
 * it only decides what a human standing next to the robot gets to know.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO pattern
 * exists to make sensor *inputs* replayable. There are none to replay.
 */
public class Leds extends SubsystemBase {
    private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
    private final AddressableLEDBuffer m_buffer =
            new AddressableLEDBuffer(LedConstants.kLength);

    private final Elevator m_elevator;
    private final Arm m_arm;

    public Leds(Elevator elevator, Arm arm) {
        m_elevator = elevator;
        m_arm = arm;

        m_strip.setLength(m_buffer.getLength());
        m_strip.start();
    }

    @Override
    public void periodic() {
        // Ordered on purpose: the first condition that is true wins the strip.
        // Read it top to bottom as "what matters most, if it's happening."
        String showing;
        LEDPattern pattern;

        if (!m_elevator.isHomed()) {
            showing = "NotHomed";
            pattern = LedConstants.kNotHomed;
        } else if (m_arm.hasGamePiece()) {
            showing = "HasGamePiece";
            pattern = LedConstants.kHasGamePiece;
        } else if (DriverStation.isDisabled()) {
            showing = "Disabled";
            pattern = LEDPattern.solid(allianceColor()).breathe(LedConstants.kBreathePeriod);
        } else {
            showing = "Idle";
            pattern = LEDPattern.solid(allianceColor())
                    .atBrightness(LedConstants.kIdleBrightness);
        }

        pattern.applyTo(m_buffer);
        m_strip.setData(m_buffer);
        Logger.recordOutput("Leds/Showing", showing);
    }

    /** Blue until the field tells us otherwise — getAlliance() is empty before connection. */
    private static Color allianceColor() {
        return DriverStation.getAlliance()
                .map(alliance -> alliance == DriverStation.Alliance.Red ? Color.kRed : Color.kBlue)
                .orElse(Color.kBlue);
    }
}
```

A few things worth pointing at.

**It takes the subsystems it reads.** `Leds(Elevator, Arm)` is the same shape as
`Arm(Elevator)` from Lesson 20, and it means `RobotContainer` must declare
`m_leds` after both. The strip reads them and drives nothing, which is a
one-directional relationship worth noticing — no other subsystem in this robot has
one.

**`applyTo` then `setData`, every tick.** The pattern writes colours into the
buffer; the buffer goes to the strip. Both happen every time, because a blinking
pattern is only blinking if you keep asking it what it looks like *now*.

**`allianceColor()` uses `Optional`.** `DriverStation.getAlliance()` returns
`Optional<Alliance>` because before the driver station connects, the robot
genuinely does not know which side it's on. `Optional` showed up in Lesson 15 for
a camera that might not see a tag; this is the same idea about a different
unknown, and `.map(...).orElse(...)` is how you answer anyway.

**The chain is going to get worse.** Four conditions read fine. Eight won't, and
some of what you'll want to say next can't be phrased as "is this true" at all —
"we're in the middle of a handoff" is a *state*, not a condition. Keep that in
mind; Lesson 24 is about it.

---

## 7. Wire it up

**In `RobotContainer`, add the subsystem after the arm:**

```java
  private final Leds m_leds = new Leds(m_elevator, m_arm); // reads them; drives nothing
```

**Add the import:**

```java
import frc.robot.subsystems.Leds;
```

That's all. No bindings, no default command, no button — the strip has nothing to
be commanded to do. It reads the robot and reports, once per tick, forever.

---

## 8. Run it

`./gradlew simulateJava`. Before you enable anything, find the LED view in
**SimGUI** — the strip shows up as a row of coloured pixels you can watch change.

It's **blinking red**, because nothing has homed the elevator yet. That's the
lesson working: the robot booted, doesn't know where its carriage is, and is
saying so before anyone asks.

Now walk it through the chain:

1. Enable and press **Back**. The elevator homes, and the moment it finishes the
   strip stops blinking and settles to a dim blue — condition 1 stopped being
   true, so condition 4 took over.
2. Drop the arm with **X**, hold **right bumper**, and drive into a `Fuel` piece.
   The instant the beam breaks, the strip goes **solid green**.
3. Disable the robot. The strip breathes in the alliance colour.

Then go and prove the priority decision to yourself, because it's the part you
actually designed. Restart the sim, *don't* home, and pick up a game piece. The
robot is now holding a piece and unhomed at the same time — and the strip stays
**red**. Condition 1 outranked condition 2, exactly as written, and the strip is
telling you the thing that could break the robot rather than the thing that's
merely interesting.

`Leds/Showing` is on the log the whole time, so you can check what it decided
after the fact rather than squinting at a video.

---

## Try it

1. **Switch alliances.** SimGUI lets you set the alliance on the driver station
   panel. Set it to red, disable, and confirm the breathing colour follows. Then
   think about what the strip showed *before* you set it, and whether
   `orElse(Color.kBlue)` was the right default or just a convenient one.
2. **Show the elevator's height as a bar.** `LEDPattern.progressMaskLayer(DoubleSupplier)`
   masks one pattern by a 0–1 fraction. Feed it the elevator's height over its max
   travel and use it to light part of the strip.
3. **Reorder the chain and find the damage.** Move the `hasGamePiece` branch above
   the `isHomed` branch, then reproduce the queue-line scenario from section 8.
   The robot now looks fine while being unsafe. Put it back — and notice that
   nothing crashed, nothing logged an error, and the only symptom was a colour.
4. **Split the strip.** `m_buffer.createView(int, int)` returns a view of part of
   the buffer, and a pattern applied to a view only touches those pixels. Use it
   to show the elevator's state on one half and the arm's on the other. Then decide
   whether that's genuinely better than one clear answer.
5. **Replay it.** Record a run that hits all four conditions, switch `kSimMode` to
   `Mode.REPLAY`, and confirm `Leds/Showing` comes back identical — even though
   the strip itself has no IO layer and nothing about the hardware was recorded.
   Work out why that still works.

---

## What you learned

The strip is the easy part. Three objects, one write per tick, done.

What's worth keeping is the two decisions around it.

**Priority is design, not plumbing.** Four booleans and one output forced you to
say which one matters most, and the answer wasn't arbitrary — the reading that
signals danger beat the reading that signals convenience. That ordering is now
written down where somebody can disagree with it, which is the whole point. A
robot that shows you the *second* most important thing is not obviously broken,
and that's exactly what makes it worth getting right on purpose.

**Not every piece of hardware wants the same treatment.** You have applied the IO
layer four times, and this time you didn't, because a write-only device has no
inputs and a replay has nothing to reconstruct. Recognising that took knowing what
the pattern was *for* rather than what it looked like. That's the difference
between following a convention and understanding one, and it's the more useful
half.

And the smaller idea that will keep showing up: **when a method returns its own
type, it's probably meant to be chained.** `Command`, `Trigger`, and now
`LEDPattern` all work that way, and none of them coordinated to do it. It's a
shape, and you'll start seeing it in libraries nobody in this course wrote.

One thing to carry into the next lesson. That `if`/`else` chain is fine at four
branches and you can already feel where it goes. Some of what you'll want the
robot to show isn't a condition at all — "mid-handoff" isn't a thing that's true
or false about a sensor, it's a thing the robot *is*. Conditions can't express
that, and stacking more of them won't help.

Next: [Lesson 24 — A superstructure: state you can name](24-superstructure.md).
