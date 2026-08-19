# Lesson 19 — A picture of the elevator

**Goal:** Draw the elevator as a live stick figure that grows and shrinks as
the carriage moves, and hang a second piece off the top of it that follows
along without a single line of code telling it to.

**New Java concepts**
- **Composition as attachment.** Every object you've built out of other
  objects so far was assembled once and then stood still. `append(...)`
  builds a *structure*: attach a child to a parent, and from then on moving
  the parent moves the child too, every tick, for free.

**New robot concepts**
- **`Mechanism2d`** — a small canvas you draw a mechanism on
- **`MechanismRoot2d`** — a point pinned to that canvas, where the drawing
  starts
- **`MechanismLigament2d`** — a segment with a length, an angle, and a color
- **Publish once, mutate forever** — `SmartDashboard.putData` registers a
  *live* object; you never call it again, you just keep changing the object
  it's already watching

---

## 1. Numbers you can read vs. a shape you can see

Lesson 18 ended with three traces on a graph, and they told you a lot: the
goal stepped, the height eased after it, the velocity drew a clean
trapezoid. That's the right tool for asking *is the control loop behaving*.

It is the wrong tool for asking *what is the robot doing right now*. To
answer that from a graph you have to read `0.75`, remember that the
elevator's range is 0 to 1.5 meters, and picture a carriage halfway up. You
are doing the drawing in your head, fifty times a second, while also trying
to debug something.

You already met the fix in Lesson 11. Odometry gave you an X, a Y, and a
heading, and you didn't stare at three numbers — you drew a robot on a field
and watched it drive, through `Field2d`. **`Mechanism2d` is that same move
for a mechanism.** Instead of a top-down field with a robot on it, you get a
side-on canvas with a stick figure on it, and the stick figure's shape comes
from your logged sensor values.

By the end of this lesson you'll press D-pad up and watch a line grow.

---

## 2. Three pieces: canvas, anchor, segment

A mechanism drawing is built from exactly three kinds of thing, and it's
worth having all three straight before you type any of them.

The **canvas** is a `Mechanism2d`. You give it a width and a height in
meters, and that's the window the viewer shows you — a coordinate space, not
a picture. Nothing is drawn on it yet.

The **anchor** is a `MechanismRoot2d`, and you get one by asking the canvas
for it: `getRoot("Base", x, y)`. It's a fixed point in canvas coordinates.
Fixed is the whole idea — the base of a real elevator is bolted to the
frame, so its dot on the canvas never moves.

The **segments** are `MechanismLigament2d`s. A ligament is a line with a
length, an angle, and a color, and it is always drawn *starting from
whatever it is attached to*. That last clause is doing more work than it
looks like, and most of this lesson is about nothing else.

*Nothing to add — this is only the shape of the three calls:*

```java
Mechanism2d canvas = new Mechanism2d(widthMeters, heightMeters);
MechanismRoot2d anchor = canvas.getRoot("Name", x, y);
MechanismLigament2d segment =
    anchor.append(new MechanismLigament2d("Name", lengthMeters, angleDegrees));
```

Angles are measured counter-clockwise from "pointing right" — the same
CCW-positive convention you've been holding since Lesson 7. So straight up
is 90°.

> **All three constructors above take plain `double`s, not `Distance`s or
> `Angle`s.** That's a genuine exception to the "prefer measures" habit
> you've been building since Lesson 10 — this particular corner of WPILib
> predates the Units library and was never updated to use it. When you
> reach for `ElevatorConstants.kDisplayWidth` (a `Distance`) in a moment,
> you'll unpack it with `.in(Meters)` right at the call site, exactly the
> "unpack only at a genuine double-only boundary" rule you already know —
> this is just a boundary you haven't hit yet.

---

## 3. Constants for the drawing

The picture needs a few numbers of its own: how big the canvas is, how long
the piece on top of the carriage should be, and what colors mean.

**Add to `ElevatorConstants` in `Constants.java`, below `kTolerance`:**

```java
    // The stick-figure view. The canvas is measured in meters, like the field.
    public static final Distance kDisplayWidth = Meters.of(1.0);
    public static final Distance kDisplayHeight = Meters.of(2.0);
    public static final Distance kEffectorLength = Centimeters.of(25);
    public static final Color8Bit kMovingColor = new Color8Bit(Color.ORANGE);
    public static final Color8Bit kAtGoalColor = new Color8Bit(Color.LIME_GREEN);
```

**Add the two color imports, next to the other `org.wpilib.units`/measure
ones in `Constants.java`:**

```java
import org.wpilib.util.Color;
import org.wpilib.util.Color8Bit;
```

The canvas is 2 meters tall for a 1.5 meter elevator, which leaves the
carriage some headroom at the top of the frame rather than letting it run
off the edge. `Color` is a big list of named colors; `Color8Bit` is the
packed three-bytes-per-pixel form the drawing actually wants, and wrapping
one in the other is the normal way to get from a name to a usable color.

> Reach for `Color.ORANGE` and `Color.LIME_GREEN`, not `Color.kOrange` or
> `Color.kLimeGreen`. Every constant you've written yourself in this course
> gets a `k` prefix, but this particular library class doesn't follow that
> convention — its named colors are plain, all-caps constants. Worth
> knowing before the compiler tells you `kOrange` doesn't exist.

Building the two `Color8Bit`s once, here, matters slightly more than it
looks: `periodic()` picks between them fifty times a second, and a constant
it can point at beats a new object every tick.

---

## 4. Build the figure

Now the part that draws.

**Add to `Elevator.java`'s imports:**

```java
import org.wpilib.smartdashboard.Mechanism2d;
import org.wpilib.smartdashboard.MechanismLigament2d;
import org.wpilib.smartdashboard.MechanismRoot2d;
```

Same package as `SmartDashboard` itself and Lesson 11's `Field2d` —
`org.wpilib.smartdashboard`. That's not a coincidence; you're about to use
these three the same way you already used `Field2d`.

**Add to `Elevator`, below `m_goal`:**

```java
    // The picture: a canvas, one point anchored to it, and a chain of segments.
    private final Mechanism2d m_mechanism = new Mechanism2d(
        ElevatorConstants.kDisplayWidth.in(Meters), ElevatorConstants.kDisplayHeight.in(Meters));
    private final MechanismRoot2d m_base = m_mechanism.getRoot(
        "Base", ElevatorConstants.kDisplayWidth.in(Meters) / 2, 0);
    /** Straight up from the base. Its length is the carriage height. */
    private final MechanismLigament2d m_carriage =
        m_base.append(new MechanismLigament2d("Carriage", 0, 90));
    /** Rides on top of the carriage. Lesson 20 puts a real arm here. */
    private final MechanismLigament2d m_effector = m_carriage.append(
        new MechanismLigament2d("Effector", ElevatorConstants.kEffectorLength.in(Meters), -90));
```

These are fields, at the top of the class with the rest, for the reason
fields always go there: the drawing has to survive between ticks. If you
built it inside `periodic()` you'd construct a brand-new canvas every 20
milliseconds and throw it away, and the picture would be reassembled from
scratch forever instead of being a thing that changes.

Read the four declarations top-to-bottom and you're reading the robot from
the floor up. The canvas is the window. `m_base` sits at the horizontal
middle (`kDisplayWidth / 2`) and at height 0 — on the floor, dead center.
`m_carriage` attaches to the base and points straight up at 90°, and it
starts at length zero because the elevator starts stowed. `m_effector`
attaches to *the carriage* and points at −90°, which is 90° back from its
parent — so it sticks out sideways from the top of the carriage.

Two details in there are worth stopping on.

**`append` hands you back the thing you appended.** That's why
`m_carriage = m_base.append(new MechanismLigament2d(...))` works as one
statement: you construct the ligament, hand it to its parent, and get a
reference to it in return so you can move it later. Without that, you'd
need two lines and a temporary variable every time.

**A child's angle is measured relative to its parent, not to the world.**
The effector's −90° doesn't mean "pointing down." It means "90° clockwise
from whatever direction the carriage is pointing." The carriage points up,
so the effector points right. This is the same idea as Lesson 15's
`Transform3d` for the cameras — an offset measured relative to the thing
it's mounted on, not to the field — arriving in a new place.

---

## 5. Publish it once

**Add to `Elevator`'s constructor:**

```java
  public Elevator() {
    SmartDashboard.putData("Elevator/Mechanism", m_mechanism);
    Scheduler.getDefault().addPeriodic(this::periodic);
  }
```

That's the whole wiring step, and it's worth noticing it happens exactly
once, in the constructor — not in `periodic()`. `putData` isn't "send this
value now," the way `putNumber` is. It registers `m_mechanism` as a
NetworkTables-backed object and hands the dashboard a live reference to it.
From that point on, anything that mutates the object — `setLength`,
`setColor` — pushes straight through to NetworkTables on its own. You're
not re-publishing a snapshot every tick; you're changing an object the
dashboard is already watching.

You've done this exact thing once before. `Localizer`'s `Field2d` (Lesson
14) is published with `SmartDashboard.putData("Field", m_field)` a single
time in its constructor, and every tick after that `m_field.setRobotPose(...)`
just updates it. `Mechanism2d` follows the identical rule — build it once,
publish it once, mutate it forever.

---

## 6. The payoff: what you don't have to write

Here's the thing to notice, and it is the actual reason this lesson exists.

**Update `periodic()` — add this after the existing telemetry calls:**

```java
    // The picture is built once and mutated every tick; only the carriage
    // changes, and the effector rides along with it for free.
    m_carriage.setLength(m_inputs.heightMeters);
    m_carriage.setColor(
        atGoal() ? ElevatorConstants.kAtGoalColor : ElevatorConstants.kMovingColor);
```

Count the ligaments you just updated: one. There are two ligaments in the
picture. When the carriage grows from 0.2 m to 0.75 m, the effector on top
of it slides up 55 centimeters — and no line of code moved it. It moved
because it's *attached*, and drawing a child always starts from wherever
its parent ended.

That's the difference between composition that happens once and
composition that is a **structure**. `SwerveModule` holds two motors;
that's assembly, and it's done the moment the constructor finishes.
`m_base` → `m_carriage` → `m_effector` is a chain, and every tick the
drawing walks it: place the base, draw the carriage from there, draw the
effector from wherever the carriage ended up. Change one link and
everything downstream of it follows.

Scale that up. A real arm on top of an elevator, with a wrist on the end of
the arm, and a roller on the end of the wrist — four links. Raise the
elevator and all three of the others come with it. You update one number.

`m_effector` is a placeholder with no motor behind it, so you will not
touch it again in this lesson. **That is the point.** In Lesson 20 a real
arm takes its place — its own motor, its own angle, its own subsystem — and
the two lines above that move the carriage won't change at all.

`setColor` is the other new call, and it's carrying information rather than
decoration: `atGoal()` is already computed for the log, so feeding it into
the color costs nothing and turns the drawing into a status light. Orange
while it's travelling, green the moment it settles.

---

## 7. Watch it

`./gradlew simulateJava`, **Teleoperated**, and press D-pad up.

In **AdvantageScope** (Lesson 3), add a **Mechanism** tab and select
`/SmartDashboard/Elevator/Mechanism` as its source. You get a vertical
orange line that grows out of the floor when you press D-pad up, with a
short stub sticking out sideways at the top, riding along. When the
carriage settles on the goal, the line turns green.

Press D-pad down and it shrinks back toward the floor. Press D-pad right
and it stops halfway. The picture is `Elevator/HeightMeters` — the same
number as the graph, drawn instead of printed.

You can also find it inside SimGUI without opening a second tool: menu
**NetworkTables → SmartDashboard → Elevator → Mechanism**. Same drawing,
same two viewers as the field view in Lesson 11 — the quick glance while
sim is already open, and the full tool for anything careful.

Now do the thing that makes it worth having. Put the Mechanism tab and the
`HeightMeters` graph on screen at the same time and press a preset. The
trace easing toward the goal and the line growing toward the top are the
same event, and seeing them together is how you build the instinct to read
one from the other.

---

## Try it

1. **Color by height band.** Instead of green-when-arrived, color the
   carriage by where it is: one color below `kScoreMid`, another above.
   You'll need an `if` in `periodic()` and one more constant — nothing
   you haven't done since Lesson 5.
2. **Add a travel reference.** Ask the canvas for a second root a little to
   the side of `m_base`, and append to it one fixed ligament, 1.5 meters
   long, straight up, in gray. It never changes, so it costs two lines in
   the field block and zero in `periodic()` — a static ruler you can read
   the carriage against. (`MechanismLigament2d` has a five-argument form
   that also takes a line weight and a `Color8Bit`.)
3. **Wiggle the effector.** In `periodic()`, call
   `m_effector.setAngle(45 * Math.sin(Timer.getTimestamp()))` and run it.
   The stub waves back and forth while the carriage does whatever the
   D-pad tells it. Prove to yourself that the two are independent: the
   effector's angle is its own, and its *position* is entirely the
   carriage's business. (`org.wpilib.system.Timer` — and take it back out
   when you're done, since Lesson 20 wants that ligament.)
4. **Break it on purpose.** Move the `setLength` call out of `periodic()`
   and into the field declaration, so it runs once. Watch the drawing
   freeze at zero while the graph keeps moving. That's the difference
   between an object that's mutated every tick and one that isn't, and
   it's a bug worth having seen once.

---

## What you learned

This was a short lesson with one idea in it, so make sure it's the one you
take away. It isn't `Mechanism2d` — that's three classes and a handful of
method calls, and you'll look up the exact names when you need them. It's
what `append` does.

Up to now, building an object out of other objects meant assembling
something once. A `SwerveModule` gets two motors in its constructor and the
relationship is finished. The chain `m_base` → `m_carriage` → `m_effector`
sets up a relationship that keeps paying out: every tick, forever, the
effector's position is computed from the carriage's, and nothing has to
remember to do it. You changed one number and two things moved.

That's worth recognizing when you meet it again, because it shows up
everywhere in robot code once you know the shape — coordinate frames,
transforms, pose composition. Lesson 15 already had you doing it with
`Transform3d`s for the cameras without naming it. This is the same idea
with a picture attached, which is a much easier place to learn it.

The rest was familiar on purpose, once you saw where it pointed:
`SmartDashboard.putData` once, in the constructor, the exact call Lesson
14's `Field2d` already taught you — and then mutation in `periodic()` for
as long as the robot runs.

Next up, that placeholder stub on top of the carriage stops being a
placeholder.
