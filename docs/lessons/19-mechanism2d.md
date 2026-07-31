# Lesson 19 — A picture of the elevator

**Goal:** Draw the elevator as a live stick figure that grows and shrinks as the
carriage moves, and hang a second piece off the top of it that follows along
without a single line of code telling it to.

**New Java concepts**
- **Composition as attachment.** Every object you've built out of other objects
  so far was assembled once and then stood still. `append(...)` builds a
  *structure*: attach a child to a parent, and from then on moving the parent
  moves the child too, every tick, for free.

**New robot concepts**
- **`LoggedMechanism2d`** — a small canvas you draw a mechanism on
- **`LoggedMechanismRoot2d`** — a point pinned to that canvas, where the drawing
  starts
- **`LoggedMechanismLigament2d`** — a segment with a length, an angle, and a color
- Driving `setLength` / `setColor` from logged inputs — the mechanism version of
  Lesson 11's `Field2d.setRobotPose`

---

## 1. Numbers you can read vs. a shape you can see

Lesson 18 ended with three traces on a graph, and they told you a lot: the goal
stepped, the height eased after it, the velocity drew a clean trapezoid. That's
the right tool for asking *is the control loop behaving*.

It is the wrong tool for asking *what is the robot doing right now*. To answer
that from a graph you have to read `0.75`, remember that the elevator's range is
0 to 1.5 meters, and picture a carriage halfway up. You are doing the drawing in
your head, fifty times a second, while also trying to debug something.

You already met the fix in Lesson 11. Odometry gave you an X, a Y, and a heading,
and you didn't stare at three numbers — you drew a robot on a field and watched
it drive. **`LoggedMechanism2d` is that same move for a mechanism.** Instead of a
top-down field with a robot on it, you get a side-on canvas with a stick figure
on it, and the stick figure's shape comes from your logged sensor values.

By the end of this lesson you'll press D-pad up and watch a line grow.

---

## 2. Three pieces: canvas, anchor, segment

A mechanism drawing is built from exactly three kinds of thing, and it's worth
having all three straight before you type any of them.

The **canvas** is a `LoggedMechanism2d`. You give it a width and a height in
meters, and that's the window the viewer shows you — a coordinate space, not a
picture. Nothing is drawn on it yet.

The **anchor** is a `LoggedMechanismRoot2d`, and you get one by asking the canvas
for it: `getRoot("Base", x, y)`. It's a fixed point in canvas coordinates.
Fixed is the whole idea — the base of a real elevator is bolted to the frame, so
its dot on the canvas never moves.

The **segments** are `LoggedMechanismLigament2d`s. A ligament is a line with a
length, an angle, and a color, and it is always drawn *starting from whatever it
is attached to*. That last clause is doing more work than it looks like, and most
of this lesson is about nothing else.

*Nothing to add — this is only the shape of the three calls:*

```java
LoggedMechanism2d canvas = new LoggedMechanism2d(width, height);
LoggedMechanismRoot2d anchor = canvas.getRoot("Name", x, y);
LoggedMechanismLigament2d segment =
    anchor.append(new LoggedMechanismLigament2d("Name", length, angle));
```

Angles are measured counter-clockwise from "pointing right" — the same
CCW-positive convention you've been holding since Lesson 7. So straight up is 90°.

> These classes come from AdvantageKit, not from WPILib's dashboard package.
> WPILib has its own `Mechanism2d` with an identical API; AdvantageKit's version
> exists so the drawing can go through `Logger` like everything else you record,
> which means it shows up in a replay. Given Lesson 13, that's not a small
> difference, and it's why this course uses the `Logged` variants.

---

## 3. Constants for the drawing

The picture needs a few numbers of its own: how big the canvas is, how long the
piece on top of the carriage should be, and what colors mean.

**Add to `ElevatorConstants` in `Constants.java`, below `kTolerance`:**

```java
    // The stick-figure view. The canvas is measured in meters, like the field.
    public static final Distance kDisplayWidth = Meters.of(1.0);
    public static final Distance kDisplayHeight = Meters.of(2.0);
    public static final Distance kEffectorLength = Centimeters.of(25);
    public static final Color8Bit kMovingColor = new Color8Bit(Color.kOrange);
    public static final Color8Bit kAtGoalColor = new Color8Bit(Color.kLimeGreen);
```

**Add the two color imports, next to the other `edu.wpi.first.wpilibj` ones:**

```java
import edu.wpi.first.wpilibj.util.Color;
import edu.wpi.first.wpilibj.util.Color8Bit;
```

The canvas is 2 meters tall for a 1.5 meter elevator, which leaves the carriage
some headroom at the top of the frame rather than letting it run off the edge.
`Color` is a big list of named colors; `Color8Bit` is the packed
three-bytes-per-pixel form the drawing actually wants, and wrapping one in the
other is the normal way to get from a name to a usable color.

Building the two `Color8Bit`s once, here, matters slightly more than it looks:
`periodic()` picks between them fifty times a second, and a constant it can point
at beats a new object every tick.

---

## 4. Build the figure

Now the part that draws.

**Add to `Elevator.java`'s imports:**

```java
import static edu.wpi.first.units.Units.Degrees;

import org.littletonrobotics.junction.mechanism.LoggedMechanism2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismLigament2d;
import org.littletonrobotics.junction.mechanism.LoggedMechanismRoot2d;
```

Each one goes in the group it belongs to — `Degrees` up with the other static
`Units` import, the three mechanism classes down with `Logger`'s.

**Add to `Elevator`, below `m_goal`:**

```java
    // The picture: a canvas, one point anchored to it, and a chain of segments.
    private final LoggedMechanism2d m_mechanism = new LoggedMechanism2d(
            ElevatorConstants.kDisplayWidth, ElevatorConstants.kDisplayHeight);
    private final LoggedMechanismRoot2d m_base = m_mechanism.getRoot(
            "Base", ElevatorConstants.kDisplayWidth.in(Meters) / 2, 0);
    /** Straight up from the base. Its length is the carriage height. */
    private final LoggedMechanismLigament2d m_carriage = m_base.append(
            new LoggedMechanismLigament2d("Carriage", Meters.of(0), Degrees.of(90)));
    /** Rides on top of the carriage. Lesson 20 puts a real arm here. */
    private final LoggedMechanismLigament2d m_effector = m_carriage.append(
            new LoggedMechanismLigament2d(
                    "Effector", ElevatorConstants.kEffectorLength, Degrees.of(-90)));
```

These are fields, at the top of the class with the rest, for the reason fields
always go there: the drawing has to survive between ticks. If you built it inside
`periodic()` you'd construct a brand-new canvas every 20 milliseconds and throw
it away, and the picture would be reassembled from scratch forever instead of
being a thing that changes.

Read the four declarations top-to-bottom and you're reading the robot from the
floor up. The canvas is the window. `m_base` sits at the horizontal middle
(`kDisplayWidth / 2`) and at height 0 — on the floor, dead center. `m_carriage`
attaches to the base and points straight up at 90°, and it starts at length zero
because the elevator starts stowed. `m_effector` attaches to *the carriage* and
points at −90°, which is 90° back from its parent — so it sticks out sideways
from the top of the carriage.

Two details in there are worth stopping on.

**`append` hands you back the thing you appended.** That's why
`m_carriage = m_base.append(new LoggedMechanismLigament2d(...))` works as one
statement: you construct the ligament, hand it to its parent, and get a reference
to it in return so you can move it later. Without that, you'd need two lines and
a temporary variable every time.

**A child's angle is measured relative to its parent, not to the world.** The
effector's −90° doesn't mean "pointing down." It means "90° clockwise from
whatever direction the carriage is pointing." The carriage points up, so the
effector points right. This is the same idea as Lesson 15's `Transform3d` for the
cameras — an offset measured relative to the thing it's mounted on, not to the
field — arriving in a new place.

---

## 5. The payoff: what you don't have to write

Here's the thing to notice, and it is the actual reason this lesson exists.

**Update `periodic()` — add this after the existing `recordOutput` calls:**

```java
        // The picture is built once and mutated every tick; only the carriage
        // changes, and the effector rides along with it for free.
        m_carriage.setLength(m_inputs.heightMeters);
        m_carriage.setColor(
                atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
        Logger.recordOutput("Elevator/Mechanism", m_mechanism);
```

Count the ligaments you just updated: one. There are two ligaments in the
picture. When the carriage grows from 0.2 m to 0.75 m, the effector on top of it
slides up 55 centimeters — and no line of code moved it. It moved because it's
*attached*, and drawing a child always starts from wherever its parent ended.

That's the difference between composition that happens once and composition that
is a **structure**. `SwerveModule` holds two motors; that's assembly, and it's
done the moment the constructor finishes. `m_base` → `m_carriage` → `m_effector`
is a chain, and every tick the drawing walks it: place the base, draw the
carriage from there, draw the effector from wherever the carriage ended up.
Change one link and everything downstream of it follows.

Scale that up. A real arm on top of an elevator, with a wrist on the end of the
arm, and a roller on the end of the wrist — four links. Raise the elevator and
all three of the others come with it. You update one number.

`m_effector` is a placeholder with no motor behind it, so you will not touch it
again in this lesson. **That is the point.** In Lesson 20 it becomes a real arm
with its own angle, and the only thing that changes about the elevator's code is
nothing.

`setColor` is the other new call, and it's carrying information rather than
decoration: `atGoal()` is already computed for the log, so feeding it into the
color costs nothing and turns the drawing into a status light. Orange while it's
travelling, green the moment it settles.

Finally, `Logger.recordOutput("Elevator/Mechanism", m_mechanism)` publishes the
whole drawing as one output, in exactly the way you've recorded every other value
since Lesson 3. It has to be called every tick — `recordOutput` records the
picture's state *right now*, so a drawing that's only recorded once is a drawing
that never moves.

---

## 6. Watch it

`./gradlew simulateJava`, **Teleoperated**, and press D-pad up.

In **AdvantageScope**, add a **Mechanism** tab and select
`/RealOutputs/Elevator/Mechanism` as its source. You get a vertical orange line
that grows out of the floor when you press D-pad up, with a short stub sticking
out sideways at the top, riding along. When the carriage settles on the goal, the
line turns green.

Press D-pad down and it shrinks back toward the floor. Press D-pad right and it
stops halfway. The picture is `Elevator/HeightMeters` — the same number as the
graph, drawn instead of printed.

You can also find it inside SimGUI without opening a second tool: menu
**NetworkTables → AdvantageKit → RealOutputs → Elevator → Mechanism**. Same
drawing, same two viewers as the field view in Lesson 11 — the quick glance while
sim is already open, and the full tool for anything careful.

Now do the thing that makes it worth having. Put the Mechanism tab and the
`HeightMeters` graph on screen at the same time and press a preset. The trace
easing toward the goal and the line growing toward the top are the same event,
and seeing them together is how you build the instinct to read one from the
other.

---

## Try it

1. **Color by height band.** Instead of green-when-arrived, color the carriage by
   where it is: one color below `kScoreMid`, another above. You'll need an `if`
   in `periodic()` and one more constant — nothing you haven't done since
   Lesson 5.
2. **Add a travel reference.** Ask the canvas for a second root a little to the
   side of `m_base`, and append to it one fixed ligament, 1.5 meters long,
   straight up, in gray. It never changes, so it costs two lines in the field
   block and zero in `periodic()` — a static ruler you can read the carriage
   against. (`LoggedMechanismLigament2d` has a five-argument form that also takes
   a line weight and a `Color8Bit`.)
3. **Wiggle the effector.** In `periodic()`, call
   `m_effector.setAngle(Degrees.of(45 * Math.sin(Timer.getFPGATimestamp())))` and
   run it. The stub waves back and forth while the carriage does whatever the
   D-pad tells it. Prove to yourself that the two are independent: the effector's
   angle is its own, and its *position* is entirely the carriage's business.
   (`edu.wpi.first.wpilibj.Timer` — and take it back out when you're done, since
   Lesson 20 wants that ligament.)
4. **Break it on purpose.** Move the `setLength` call out of `periodic()` and
   into the field declaration, so it runs once. Watch the drawing freeze at zero
   while the graph keeps moving. That's the difference between recording a value
   and recording a value *every tick*, and it's a bug worth having seen once.
5. **Replay the picture.** Record a run with a few preset presses, switch
   `kSimMode` to `Mode.REPLAY`, and open the log. The drawing replays with
   everything else, because it went out through `Logger` rather than around it.

---

## What you learned

This was a short lesson with one idea in it, so make sure it's the one you take
away. It isn't `LoggedMechanism2d` — that's three classes and six method calls,
and you'll look up the exact names when you need them. It's what `append` does.

Up to now, building an object out of other objects meant assembling something
once. A `SwerveModule` gets two motors in its constructor and the relationship is
finished. The chain `m_base` → `m_carriage` → `m_effector` sets up a relationship
that keeps paying out: every tick, forever, the effector's position is computed
from the carriage's, and nothing has to remember to do it. You changed one
number and two things moved.

That's worth recognizing when you meet it again, because it shows up everywhere
in robot code once you know the shape — coordinate frames, transforms, pose
composition. Lesson 15 already had you doing it with `Transform3d`s for the
cameras without naming it. This is the same idea with a picture attached, which
is a much easier place to learn it.

The rest was familiar on purpose. Build it in fields, mutate it in `periodic()`,
push it out through `Logger` — the same rhythm as the field view in Lesson 11 and
every logged value since Lesson 3.

Next up, that placeholder stub on top of the carriage stops being a placeholder.

Next: [Lesson 20 — Intake arm: a mechanism that swings](20-intake-arm.md).
