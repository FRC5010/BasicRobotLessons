# Lesson 23 — LEDs: showing what the robot is thinking

**Goal:** Drive an addressable LED strip from state the robot already
computes, so a human standing next to it can tell what it knows — and
decide, on purpose, what wins when two things are true at once.

**New Java concepts**
- **Combinator methods** — `LEDPattern.solid(...).blink(...).atBrightness(...)`,
  where each call returns a *new* value rather than changing anything.
  You've already met this shape once, in how a `Command` gets built; this
  is the same idea on a completely unrelated type, which is when it stops
  being an API quirk and starts being a pattern worth naming.

**New robot concepts**
- **`AddressableLED`** and **`AddressableLEDBuffer`** — a strip, a pixel
  array, and one write per tick
- **`LEDPattern`** — an animation described as a value instead of written
  as a loop
- **When *not* to use the IO layer.** Four lessons have put hardware
  behind `XxxIO`; this one shouldn't, and the reason is worth more than
  the pattern
- **Priority** — several conditions, one strip, and an ordering that is a
  design decision rather than an accident

---

## 1. Everything the robot knows and won't say

Take stock of what your robot currently knows about itself.

It knows whether the elevator has reached the height it was sent to. It
knows whether the arm has reached its angle. It knows whether the
carriage is resting on its bottom limit, and — since last lesson —
whether it has *ever* been homed at all. Every one of those is a
`boolean` you can read today, and it took three lessons of mechanisms and
sensors to earn them.

Now stand three metres away, behind a field wall, holding a controller.
How many of them can you see?

None. The robot knows and won't say. That's fine while you're sitting at
a laptop with SmartDashboard open, and it is useless in a match — and
worse than useless in the pit, where the person who needs to know
something about the robot is usually not the person who wrote the code.

An LED strip fixes that, and it's the cheapest thing on the robot. What
it costs instead is a decision: the strip can show one thing at a time,
and the robot knows several. Deciding which one wins is most of this
lesson.

---

## 2. A strip, a buffer, and one write per tick

Addressable LEDs are a chain of individually-controlled pixels on a
single data wire. In WPILib that's two objects: an **`AddressableLED`**
for the port, and an **`AddressableLEDBuffer`** holding the color of
every pixel.

You write colors into the buffer, then hand the whole buffer to the
strip. Same rhythm as Lesson 19's drawing — build it once, mutate it
every tick, publish it every tick.

**Add to `Constants.java`, as a new nested class above `ArmConstants`:**

```java
  public static class LedConstants {
    public static final int kPwmPort = 5; // PWM — change to yours
    public static final int kLength = 40; // LEDs on the strip — change to yours

    // A pattern is a value, not a loop. Build it once, here, next to the
    // color it uses, and hand the finished description to the strip.
    public static final LEDPattern kNotHomed = LEDPattern.solid(Color.RED).blink(Seconds.of(0.15));
    public static final Time kBreathePeriod = Seconds.of(2);
    public static final Dimensionless kIdleBrightness = Percent.of(25);
  }
```

**Add the imports this needs, each to the group it belongs in:**

```java
import static org.wpilib.units.Units.Percent;
import static org.wpilib.units.Units.Seconds;

import org.wpilib.hardware.led.LEDPattern;
import org.wpilib.units.measure.Dimensionless;
import org.wpilib.units.measure.Time;
```

> **Pick a channel number nothing else is using.** `kBottomLimitChannel`
> from Lesson 21 already claimed channel 0 on its own peripheral type,
> and it's tempting to assume an LED strip's port numbering is a
> completely separate space — it isn't, on this platform. Two
> constructors quietly claiming the same channel number is a startup
> exception, not a silent bug, but it's still worth choosing on purpose
> rather than finding out at boot: `kPwmPort = 5` clears every DIO
> channel this robot has claimed so far.

---

## 3. A pattern is a value, not a loop

Here's the part that's more interesting than it looks.

If you've written LED code before, you probably wrote a loop: work out
how far through the blink cycle you are, decide whether this is an on
frame or an off frame, walk the buffer, set each pixel. Every animation
is its own little pile of timing arithmetic, and they're all subtly
different.

**`LEDPattern` is not that.** A pattern is a *description* of what the
strip should look like, as a value you can hold in a variable. Solid red
is a value. Solid red blinking every 150 ms is also a value — and you get
it by asking the first one for it:

*Nothing to add — this is the shape, and you already wrote it in section 2:*

```java
LEDPattern.solid(Color.RED).blink(Seconds.of(0.15))
```

`blink` doesn't blink anything. It returns a **new pattern** that happens
to be the old one, blinking. `solid(...)` is untouched, and you could
hand it to a different strip on the next line. That's why these live in
`Constants.java` alongside the colors: they're constants in the ordinary
sense, not machinery.

You've actually already met this shape once, back when you first built a
`Command`: `runRepeatedly(...).whenCanceled(...).until(...).named(...)`
is the same idea — each call takes what came before and returns something
with one more idea layered on, rather than mutating anything in place.
Once you've noticed it, a lot of libraries stop being lists of methods to
memorize and start being small vocabularies you can combine. **When a
method returns its own type, try chaining it** — that guess is right far
more often than it has any right to be.

The measure arguments are the Lesson 10 habit still paying off:
`blink(Seconds.of(0.15))` and `atBrightness(Percent.of(25))` say what
they mean without a comment.

---

## 4. No IO layer here, and why that's the interesting part

Every piece of hardware since Lesson 13 has gone behind an interface —
`ModuleIO`, `ElevatorIO`, `ArmIO`, `VisionIO`, each with a real
implementation, a sim implementation, and a logged inputs bundle. It is
the most consistent structure in this course.

The LED strip is not going to get one. That's worth a paragraph, because
knowing when a pattern doesn't apply is a more useful skill than knowing
the pattern.

Go back to what the IO layer is *for*. Lesson 13 built it so that a log
could eventually be replayed: sensor readings become **inputs**, inputs
get recorded, and re-running them through changed code reproduces the
session exactly. Every piece of that machinery exists to serve one
direction of data — hardware into the robot.

An LED strip has no inputs. Nothing about it can be read, nothing about
it can surprise you, and there is nothing for a replay to reconstruct.
Wrapping it in an IO interface would give you a sim implementation that
does nothing, an inputs class with no fields, and a mode switch with
three identical arms.

> **The IO layer is a tool with a purpose, not a ritual.** Lesson 19
> already made this call once — the mechanism drawing is fields and a log
> call, no IO layer, for the same reason. If you find yourself writing an
> empty inputs class, stop and ask what you were hoping to replay.

What the strip *does* get is a log line, because "what was the robot
showing at 14:32?" is a real question after a match.

---

## 5. Something worth showing

The most useful thing an LED strip can tell you in a pit is *don't enable
me yet*.

Lesson 21 built homing, and it works — but look at what it leaves behind.
`home()` drives to the switch, resets the encoder, and finishes. Nothing
anywhere records that it ever ran. The robot goes from "every height I
report is a guess" to "every height I report is real" and keeps no
memory of which side of that line it's on.

**Add to `Elevator`, next to `m_goal`:**

```java
  private boolean m_homed = false;
```

**Set it in `home()`'s `.whenCanceled(...)` block, after the goal:**

```java
          m_homed = true;
```

**Add the accessor, below `atBottomLimit`:**

```java
  /** Has homing ever run? Until it has, every height on this elevator is a guess. */
  public boolean isHomed() {
    return m_homed;
  }
```

**And log it, next to the other outputs in `periodic()`:**

```java
    SmartDashboard.putBoolean("Elevator/Homed", m_homed);
```

Three lines and an accessor, for something the robot already knew and
had no way to say. That's usually how this goes: the sensor work was
Lesson 21's, and the only thing missing was somewhere to put the answer.

---

## 6. Three conditions, one strip

Now the design problem.

You have three things worth showing and one strip to show them on. Here
they are, and the order is the whole point:

| Priority | When | What the strip does |
|---|---|---|
| 1 | not homed | red, blinking fast |
| 2 | disabled | alliance color, breathing |
| 3 | anything else | alliance color, dim |

**Two of those can be true at the same time.** Every robot boots
disabled *and* unhomed at once — that's not a rare edge case, it's every
single match's opening second. The strip can only say one thing, so you
have to decide which, and there's a right answer: knowing the robot is
disabled is background information a pit crew already has (nobody has
walked over and enabled it yet), but an unhomed elevator is about to
drive itself into the top of the frame the moment somebody does.
**The dangerous thing outranks the merely-informative thing.**

That decision has to live somewhere. Writing it as an ordered chain —
first match wins, read top to bottom — makes it something you can point
at in a design review.

**Create `subsystems/Leds.java`:**

```java
package first.robot.subsystems;

import org.wpilib.command3.Scheduler;
import org.wpilib.driverstation.Alliance;
import org.wpilib.driverstation.MatchState;
import org.wpilib.driverstation.RobotState;
import org.wpilib.hardware.led.AddressableLED;
import org.wpilib.hardware.led.AddressableLEDBuffer;
import org.wpilib.hardware.led.LEDPattern;
import org.wpilib.smartdashboard.SmartDashboard;
import org.wpilib.util.Color;

import first.robot.Constants.LedConstants;

/**
 * The strip. It owns no motors and makes no decisions about what the robot
 * does — it only decides what a human standing next to the robot gets to
 * know.
 *
 * <p>No IO layer here on purpose: an LED strip is write-only, and the IO
 * pattern exists to make sensor *inputs* replayable. There are none to
 * replay. Not a Mechanism either, for the same reason Lesson 14's
 * Localizer isn't one — it drives nothing and no command ever needs to
 * require it, so a plain {@code Scheduler.addPeriodic} heartbeat is all it
 * needs.
 */
public class Leds {
  private final AddressableLED m_strip = new AddressableLED(LedConstants.kPwmPort);
  private final AddressableLEDBuffer m_buffer = new AddressableLEDBuffer(LedConstants.kLength);

  private final Elevator m_elevator;

  public Leds(Elevator elevator) {
    m_elevator = elevator;

    m_strip.setLength(m_buffer.getLength());
    Scheduler.getDefault().addPeriodic(this::periodic);
  }

  private void periodic() {
    // Ordered on purpose: the first condition that is true wins the strip.
    // Read it top to bottom as "what matters most, if it's happening."
    String showing;
    LEDPattern pattern;

    if (!m_elevator.isHomed()) {
      showing = "NotHomed";
      pattern = LedConstants.kNotHomed;
    } else if (RobotState.isDisabled()) {
      showing = "Disabled";
      pattern = LEDPattern.solid(allianceColor()).breathe(LedConstants.kBreathePeriod);
    } else {
      showing = "Idle";
      pattern = LEDPattern.solid(allianceColor()).atBrightness(LedConstants.kIdleBrightness);
    }

    pattern.applyTo(m_buffer);
    m_strip.setData(m_buffer);
    SmartDashboard.putString("Leds/Showing", showing);
  }

  /** Blue until the field tells us otherwise — getAlliance() is empty before connection. */
  private static Color allianceColor() {
    return MatchState.getAlliance()
        .map(alliance -> alliance == Alliance.RED ? Color.RED : Color.BLUE)
        .orElse(Color.BLUE);
  }
}
```

A few things worth pointing at.

**It takes the subsystem it reads.** `Leds(Elevator)` is the same shape
as `Arm(Elevator)` from Lesson 20, and it means `Robot.java` must declare
`leds` after `elevator`. The strip reads it and drives nothing, which is
a one-directional relationship worth noticing — no other class in this
robot has one.

**No `.start()` call, and none is needed.** If you've used
`AddressableLED` before, you may be reaching for one — it doesn't exist
on this platform. `setLength(...)` once and `setData(...)` every tick is
the whole lifecycle; the strip outputs whatever it was last handed, with
no separate arm-and-start step.

**`applyTo` then `setData`, every tick.** The pattern writes colors into
the buffer; the buffer goes to the strip. Both happen every time, because
a blinking pattern is only blinking if you keep asking it what it looks
like *now*.

**`allianceColor()` uses `Optional`.** `MatchState.getAlliance()` returns
`Optional<Alliance>` because before the driver station connects, the
robot genuinely does not know which side it's on. `Optional` showed up in
Lesson 15 for a camera that might not see a tag; this is the same idea
about a different unknown, and `.map(...).orElse(...)` is how you answer
anyway.

**The chain is going to get worse.** Three conditions read fine. Eight
won't, and some of what you'll want to say next can't be phrased as "is
this true" at all — "we're in the middle of a handoff" is a *state*, not
a condition. Keep that in mind for later.

---

## 7. Wire it up

**In `Robot.java`, add the field after the arm:**

```java
  public final Leds leds = new Leds(elevator); // reads it; drives nothing
```

**Add the import:**

```java
import first.robot.subsystems.Leds;
```

That's all. No bindings, no default command, no button — the strip has
nothing to be commanded to do. It reads the robot and reports, once per
tick, forever.

---

## 8. Run it

`./gradlew simulateJava`. Before you enable anything, find the LED view
in **SimGUI** — the strip shows up as a row of colored pixels you can
watch change.

It's **blinking red**, because nothing has homed the elevator yet — and
notice it's blinking red even though the robot is *also* currently
disabled. That's the priority chain working: two conditions are true at
once, and the one you actually need to act on is the one that wins.

Now walk it through the chain:

1. **Enable, then press Back.** (Homing drives an actual motor, so it
   needs the robot enabled — the same reason Lesson 21's `home()` never
   moved anything while disabled.) The elevator homes, and the moment it
   finishes the strip stops blinking and settles to a dim alliance color
   — condition 1 stopped being true, and the robot is enabled, so
   condition 3 took over directly.
2. **Disable the robot.** The strip switches to breathing in the alliance
   color — homed is still true, so condition 1 stays out of the way, and
   condition 2 takes over.

`Leds/Showing` is on the dashboard the whole time, so you can check what
it decided after the fact rather than squinting at a strip.

---

## Try it

1. **Switch alliances.** `DriverStationSim.setAllianceStationId(...)` in
   SimGUI's driver station panel lets you set the alliance. Set it to
   red, disable, and confirm the breathing color follows. Then think
   about what the strip showed *before* you set it, and whether
   `orElse(Color.BLUE)` was the right default or just a convenient one.
2. **Show the elevator's height as a bar.** `LEDPattern.progressMaskLayer(DoubleSupplier)`
   masks one pattern by a 0–1 fraction. Feed it the elevator's height
   over its max travel and use it to light part of the strip.
3. **Reorder the chain and find the damage.** Move the `isHomed` check
   below the disabled check, then reproduce the boot scenario from
   section 8 — power on, don't home, and just look at the strip while
   disabled. It now breathes calmly in the alliance color instead of
   screaming red, and there is nothing about that strip that looks
   broken. Put it back — and notice that nothing crashed, nothing logged
   an error, and the only symptom was a color meaning something different
   than you designed it to.
4. **Split the strip.** `m_buffer.createView(int, int)` returns a view of
   part of the buffer, and a pattern applied to a view only touches those
   pixels. Use it to show homed-state on one half and disabled-state on
   the other. Then decide whether that's genuinely better than one clear
   answer.

---

## What you learned

The strip is the easy part. Three objects, one write per tick, done.

What's worth keeping is the two decisions around it.

**Priority is design, not plumbing.** Two conditions and one output
forced you to say which one matters most, and the answer wasn't
arbitrary — the reading that signals danger beat the reading that's
merely background information. That ordering is now written down where
somebody can disagree with it, which is the whole point. A robot that
shows you the *second* most important thing is not obviously broken, and
that's exactly what makes it worth getting right on purpose.

**Not every piece of hardware wants the same treatment.** You have
applied the IO layer four times, and this time you didn't, because a
write-only device has no inputs and a replay has nothing to reconstruct.
Recognizing that took knowing what the pattern was *for* rather than what
it looked like. That's the difference between following a convention and
understanding one, and it's the more useful half.

And the smaller idea that will keep showing up: **when a method returns
its own type, it's probably meant to be chained.** A `Command` builder
and now `LEDPattern` both work that way, and neither coordinated with the
other to do it. It's a shape, and you'll start seeing it in libraries
nobody in this course wrote.

One thing to carry forward. That `if`/`else` chain is fine at three
branches and you can already feel where it goes. Some of what you'll
want the robot to show isn't a condition at all — "mid-handoff" isn't a
thing that's true or false about a sensor, it's a thing the robot *is*.
Conditions can't express that, and stacking more of them won't help.
