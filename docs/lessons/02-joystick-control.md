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
to `1.0`. Centered is `0.0` (ish — see deadband below). WPILib gives it to you like
this:

```java
double y = m_driverController.getLeftY();
```

We want that number to become the motor's speed. The catch: it changes every
moment, so we can't grab it once. We need something that fetches the *current*
value on **every tick**. That's what a **supplier** is for.

---

## 2. Lambdas and suppliers

You already used a lambda in Lesson 1 without us naming it:

```java
return run(() -> m_driveMotor.set(fraction));
//           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this is a lambda
```

A **lambda** is a tiny anonymous function written inline. `() -> doSomething()`
means "a function that takes no arguments and runs `doSomething()`." The scheduler
calls it every tick.

A **`DoubleSupplier`** is a lambda that *returns a double* each time it's called:
`() -> m_driverController.getLeftY()`. Every tick, ask it for a value and you get
the stick's current position. That's exactly what we need.

Update `DriveModule` with a method that takes a supplier:

```java
import java.util.function.DoubleSupplier;
```

```java
/** Drives continuously using a live speed source (e.g. a joystick axis). */
public Command driveWithJoystick(DoubleSupplier speedSupplier) {
  return run(() -> {
    double raw = speedSupplier.getAsDouble();   // fetch fresh value this tick
    double speed = applyDeadband(raw, 0.1);     // clean it up (next section)
    m_driveMotor.set(speed);
  });
}
```

Notice the `{ }` braces: when a lambda body has more than one statement, wrap it in
braces, just like a method body.

---

## 3. Deadband: cleaning up messy input

Real joysticks don't rest at exactly `0.0` — a centered stick might read `0.03`.
Left alone, the motor would hum and creep forever. A **deadband** treats anything
close to center as zero. Add this helper method to `DriveModule`:

```java
/** Returns 0 when |value| is within 'band', otherwise passes the value through. */
private double applyDeadband(double value, double band) {
  if (Math.abs(value) < band) {
    return 0.0;
  }
  return value;
}
```

**New pieces:**
- **`if (condition) { ... }`** runs the block only when the condition is true. Your
  first conditional! We'll lean on these hard in Lesson 5.
- **`Math.abs(value)`** returns the absolute value (drops the sign), so the band
  works for both forward and reverse.
- **`return`** immediately hands a value back to whoever called the method and
  stops running it.

> WPILib actually ships `MathUtil.applyDeadband(value, band)` that does this (and
> rescales smoothly). We wrote our own so you see what it does. Feel free to swap in
> `MathUtil.applyDeadband` later — knowing what a library call does beats trusting
> it blindly.

---

## 4. Default commands: control when nothing else asks

We don't want to hold a button to drive — driving is the *normal* thing this module
does. A **default command** runs automatically whenever no other command is using
the subsystem. Set it in `RobotContainer`'s constructor (or `configureBindings`):

```java
m_module.setDefaultCommand(
    m_module.driveWithJoystick(() -> -m_driverController.getLeftY()));
```

Two things to notice:

- `() -> -m_driverController.getLeftY()` is a `DoubleSupplier` lambda. It's re-asked
  every tick, so it always reflects the current stick position.
- The **minus sign**: on Xbox sticks, pushing *forward* reads *negative*. Negating
  makes "push forward" = "positive speed" = "drive forward." Small detail, endless
  confusion if you forget it.

Now the stick always drives the module — unless some other command (like a future
"drive to distance") temporarily takes over. When that command finishes, the
default automatically resumes. That hand-off is free.

---

## 5. Run it

`./gradlew simulateJava` → **Teleoperated**. Push the left stick (or SimGUI's
joystick slider). The motor output should track the stick, snap to zero near
center, and reverse when you pull back.

---

## Try it

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

- A **`double`** is a decimal number; joystick axes and motor speeds are doubles.
- A **lambda** `() -> ...` is an inline function; a **`DoubleSupplier`** is one that
  returns a fresh double each tick — perfect for live inputs.
- **`if`**, **`Math.abs`**, and **`return`** let you clean up input (**deadband**).
- A **default command** is what a subsystem does when nothing else claims it, and
  the scheduler hands control back to it automatically.

Next: [Lesson 3 — Telemetry & plots](03-telemetry.md).
