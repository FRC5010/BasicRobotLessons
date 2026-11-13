# Lesson 2 — Joystick control: drive the motor with a stick

**Goal:** Replace the fixed-speed button with smooth, proportional control from a
joystick axis — push the stick further, spin faster — with a deadband so the motor
doesn't creep when the stick is centered.

**New Java concepts**
- **Method parameters** and **return values** (a closer look)
- The **`double`** type and basic math
- **Lambdas** (`() -> ...`) and **suppliers** (a value fetched fresh each tick)
- **`Math`** helper methods

**New robot concepts**
- Reading a controller axis
- **Default commands** (what a subsystem does when nothing else is asked)
- **Deadband** and why raw joystick input is messy

---

## 1. A joystick axis is just a number

A controller axis reports a `double` — a number with a decimal point — from `-1.0`
to `1.0`. Centered is `0.0` (ish — section 3 deals with the "ish"). WPILib hands
it to you like this:

*Nothing to add — this is just how you read one:*

```java
double y = m_driverController.getLeftY();
```

We want that number to become the motor's speed, and the obvious plan is to read
it once and pass it along — the way `driveAtSpeed(0.3)` took a number in Lesson 1.
But that plan has a hole in it: the stick changes every moment, and a `double`
you grabbed is frozen — a snapshot of where the stick *was*, not where it is.
What we actually need is something the command can ask for the *current* value
on **every tick**. That's what a **supplier** is for.

---

## 2. Lambdas and suppliers

You already used lambdas in Lesson 1 without us naming them.

*Nothing to add — this is code you already have:*

```java
return startEnd(() -> m_driveMotor.set(fraction), () -> m_driveMotor.set(0));
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^
//              this is a lambda                  and so is this
```

A **lambda** is the inline version of a method: the same idea — a block of
code that runs when called — but with no name, because instead of naming it
you hand it directly to whoever's going to run it. `() -> doSomething()`
means "a method that takes no arguments and runs `doSomething()`." In
Lesson 1, `startEnd` ran the first one at start and the second at end. This lesson leans on `run(...)`, which calls its lambda **every
tick** — perfect for reading a stick that keeps changing.

Now the twist that makes lambdas genuinely powerful: a lambda is a *value*,
just like `3.7` or a `TalonFX` object. You can store it in a variable, pass it
into a method, and run it later. **Code, stored as data.** And like every value in
Java, it needs a type. **`DoubleSupplier`** is the type for a lambda that
takes no arguments and *returns a double*:

*Nothing to add — this is just an example, not code for any file:*

```java
DoubleSupplier stickReader = () -> m_driverController.getLeftY();
double position = stickReader.getAsDouble();  // runs the stored code right now
```

Read that first line the same way you read `TalonFX driveMotor = new
TalonFX(1)` in Lesson 1 — type, name, value — except this time the *value* is a
*piece of code*. Nothing runs when the variable is assigned; the code just sits
there, stored. Calling `stickReader.getAsDouble()` is what runs it, and it
hands back whatever the code returned. Call it every tick, get the stick's
position every tick — exactly the fetch-it-fresh behavior section 1 said we
needed.

Time to put it to work. Open `DriveModule.java` and add a second command factory
directly below `driveAtSpeed` — it's the same kind of method, so they belong
side by side. Look at its parameter: `speedSupplier` is a variable of type
`DoubleSupplier`, which means whoever calls this method hands in *the code for
reading the speed*, and the command runs that code every tick.

**Add to `DriveModule`, below `driveAtSpeed`:**

```java
public class DriveModule extends SubsystemBase {
  // ...field, constructor, and driveAtSpeed(...) stay as they are...

  /** Drives continuously using a live speed source (e.g. a joystick axis). */
  public Command driveWithJoystick(DoubleSupplier speedSupplier) {
    return run(() -> {
      double raw = speedSupplier.getAsDouble();   // fetch fresh value this tick
      double speed = applyDeadband(raw, 0.1);     // clean it up (next section)
      m_driveMotor.set(speed);
    });
  }
```

`DoubleSupplier` is a class from another package, so the file needs an import —
up top with the others, below the `package` line (or click the red underline and
let `Ctrl+.` add it).

**Add to `DriveModule`'s imports:**

```java
import java.util.function.DoubleSupplier;
```

Notice the package name: `java.util.function` is Java itself, not WPILib —
suppliers are a plain Java idea that robot code leans on heavily.

Two more things about the new method. The `{ }` braces after the arrow: when a
lambda body has more than one statement, wrap it in braces, just like a method
body. And your file won't compile right now — `applyDeadband` doesn't exist
yet. On purpose: writing the call first lets the code you *wish* you had tell
you what to build next.

---

## 3. Deadband: cleaning up messy input

Real joysticks don't rest at exactly `0.0` — a centered stick might read `0.03`.
Left alone, the motor would hum and creep forever. A **deadband** treats anything
close to center as zero.

Make the helper `private`: this is internal cleanup plumbing, and nothing
outside the class has any business calling it — so nothing outside gets to.

**Add to `DriveModule`, below `driveWithJoystick`:**

```java
/** Returns 0 when |value| is within 'band', otherwise passes the value through. */
private double applyDeadband(double value, double band) {
  if (Math.abs(value) < band) {
    return 0.0;
  }
  return value;
}
```

Three small pieces of Java arrived in those six lines. **`if (condition) {
... }`** runs its block only when the condition is true — your first
conditional, and Lesson 5 leans on these hard. **`Math.abs(value)`** returns
the absolute value (drops the sign), so one comparison covers both forward and
reverse. And **`return`** hands a value back to whoever called the method and
stops the method on the spot — which is why the second `return value;` only
happens when the `if` didn't fire. Trace it with `value = 0.03`, then with
`value = 0.8`, and convince yourself each one takes the path you expect.

> WPILib actually ships `MathUtil.applyDeadband(value, band)` that does this
> (and rescales smoothly). You wrote your own so you'd know exactly what's
> inside it. Feel free to swap in `MathUtil.applyDeadband` later — knowing
> what a library call does beats trusting it blindly.

---

## 4. Default commands: control when nothing else asks

We don't want to hold a button to drive — driving is the *normal* thing this
module does, the thing it should fall back to whenever nothing more important
is happening. WPILib has a name for exactly that: a **default command** runs
automatically whenever no other command is using the subsystem.

Back in `RobotContainer.java`, inside `configureBindings()` with the rest of
the wiring.

**Edit `configureBindings()` in `RobotContainer`:**

```java
  private void configureBindings() {
    // ...the A-button binding from Lesson 1 can stay...

    m_module.setDefaultCommand(
        m_module.driveWithJoystick(() -> -m_driverController.getLeftY()));
  }
```

Read the new statement inside-out. `() -> -m_driverController.getLeftY()` is a
`DoubleSupplier` lambda — and it's re-asked every tick, so it always reflects where the
stick is *right now*. And that **minus sign** is doing real work: on Xbox
sticks, pushing *forward* reads *negative*. Negating makes "push forward" =
"positive speed" = "drive forward." Small detail, endless confusion if you
forget it — someday a robot will lurch backward off the starting line, and the
first thing to check will be a sign.

Now the stick always drives the module — unless some other command (like a
future "drive to distance") temporarily takes over. When that command
finishes, the default resumes on its own. You never write that hand-off; the
scheduler does it. That's the quiet payoff of making everything a command.

---

## 5. Run it

`./gradlew simulateJava` → **Teleoperated**. Push the left stick (or SimGUI's
joystick slider). The motor output should track the stick, snap to zero near
center, and reverse when you pull back. If it creeps at rest instead, your
deadband isn't in the path — check that `driveWithJoystick` really calls
`applyDeadband`.

---

## Try it

The first two are the kind of feature request real drivers make of their
programmers every season.

1. **Slow mode:** make a method `driveWithJoystick(DoubleSupplier speed, double
   scale)` that multiplies the speed by `scale`. Bind the right bumper so that while
   held, the module drives at `scale = 0.25` for fine control.
2. **Square the input** for finer low-speed control: `speed * Math.abs(speed)`.
   Feel the difference. Why does keeping `Math.abs` matter here? (Hint: what happens
   to the sign if you just do `speed * speed`?)
3. Print the raw vs. deadbanded value with `System.out.println` and watch how much
   the raw value jitters at rest.

---

## What you learned

The through-line of this lesson is *live* data. A joystick axis is just a
**`double`**, but it's a double that changes constantly — so instead of
passing a number, you passed a **lambda**: code stored as data, in a
**`DoubleSupplier`** variable the command re-asks every tick. Around that you picked up your first **`if`**,
plus `Math.abs` and `return`, and used all three to build a **deadband** so a
resting stick means a resting motor. The robot-side idea to carry forward is
the **default command**: what a subsystem does when nothing else claims it,
with the scheduler handing control back automatically. If lambdas still feel
like strange syntax, that's normal — you'll write so many `() ->`s over the
coming lessons that the arrow will stop registering as weird. Next, we make
the robot's numbers visible, because plots beat print statements.

Next: [Lesson 3 — Telemetry & plots](03-telemetry.md).
