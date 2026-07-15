# Lesson 1 — Your first motor: spin a drive wheel with a button

**Goal:** Create a real subsystem that owns one TalonFX drive motor, and make it
spin at a fixed speed while you hold a button.

**New Java concepts**
- **Objects** and creating them with `new`
- **Fields** (data a class holds onto)
- **Constructors** (the setup method that runs when an object is created)
- **`import`** (borrowing classes from other packages)
- **`private` / `public`** (encapsulation — who's allowed to touch what)

**New robot concepts**
- Adding a vendor library (Phoenix 6)
- The `TalonFX` motor object
- Exposing behavior as a **command factory method**

---

## 1. Add the Phoenix 6 vendor library

TalonFX motors are made by CTRE, so their code lives in a **vendor library** that
isn't in the template yet. In VS Code:

1. Open the command palette (Ctrl+Shift+P) → **WPILib: Manage Vendor Libraries**.
2. Choose **Install new libraries (online)**.
3. Paste the Phoenix 6 URL from
   [CTRE's install page](https://v6.docs.ctr-electronics.com/en/stable/docs/installation/installation-frc.html)
   (looks like `https://maven.ctr-electronics.com/.../Phoenix6-frc2026-latest.json`).
4. Rebuild: `./gradlew build`.

A new file appears under `vendordeps/`. GradleRIO finds it automatically — you
never edit `build.gradle` for this.

> **Why "vendor" libraries?** WPILib ships the core robot framework. Hardware makers
> (CTRE, REV, etc.) ship *their* code separately so they can update on their own
> schedule. A vendordep is just a JSON file telling Gradle where to download it.

---

## 2. Objects: the big idea

So far you've seen classes and methods. Now the missing third piece: **objects**.

- A **class** is a blueprint (e.g., "TalonFX" describes what any TalonFX can do).
- An **object** is one actual thing built from that blueprint (e.g., *the specific
  motor with CAN ID 1 on your robot*).

You create an object with the keyword **`new`**:

```java
TalonFX driveMotor = new TalonFX(1);
```

Read it right-to-left: `new TalonFX(1)` builds a TalonFX object for the motor at
CAN ID 1. `TalonFX driveMotor` declares a **variable** of type `TalonFX` named
`driveMotor` to hold it. Now `driveMotor` is your handle to that motor.

---

## 3. Build the DriveModule subsystem

We'll build the course around **one swerve module** first — one drive motor and
(soon) one steering motor — then scale up to four later. Create a new file
`src/main/java/frc/robot/subsystems/DriveModule.java`:

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.TalonFX;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class DriveModule extends SubsystemBase {
  // A FIELD: data this object holds for its whole life.
  // 'private' means only code inside DriveModule can touch it directly.
  private final TalonFX m_driveMotor = new TalonFX(1); // CAN ID 1 — change to yours

  // The CONSTRUCTOR: runs once when 'new DriveModule()' is called.
  public DriveModule() {
    // Setup that must happen when the module is created goes here.
  }

  /** Spins the drive motor at the given fraction of full power (-1.0 to 1.0). */
  public Command driveAtSpeed(double fraction) {
    // 'run(...)' builds a command that repeats the action every tick while scheduled.
    return run(() -> m_driveMotor.set(fraction));
  }

  @Override
  public void periodic() {
    // Called ~50x/sec by the scheduler. Empty for now.
  }
}
```

**New things in that file, one at a time:**

- **`import com.ctre.phoenix6.hardware.TalonFX;`** — lets us write `TalonFX` instead
  of its full package name. `import edu.wpi.first...` lines do the same for WPILib.
- **`extends SubsystemBase`** — our class *is a* subsystem, inheriting all the
  machinery that lets the scheduler manage it.
- **`private final TalonFX m_driveMotor = ...`** — a **field**. `private` = hidden
  from other classes (encapsulation). `final` = this variable will always point at
  the *same* motor object (good — you never want to accidentally reassign it). The
  `m_` prefix is a team convention meaning "member field."
- **`driveAtSpeed(double fraction)`** — a **command factory method**. It doesn't
  spin the motor *now*; it *returns a Command* describing how to. The scheduler runs
  it later. `m_driveMotor.set(0.5)` means "50% power."

> **Why return commands instead of just spinning the motor?** Because the scheduler
> guarantees only one command controls a subsystem at a time. If two things try to
> drive the module at once, the scheduler sorts it out instead of the motor getting
> conflicting orders. You get that safety for free by exposing *commands*.

---

## 4. Wire a button to it

Open `RobotContainer.java`. Add a field for the module and a binding.

```java
// near the other subsystem fields:
private final DriveModule m_module = new DriveModule();
```

Add the import at the top:

```java
import frc.robot.subsystems.DriveModule;
```

Then in `configureBindings()`:

```java
// Hold A to drive forward at 30% power; release to stop.
m_driverController.a().whileTrue(m_module.driveAtSpeed(0.3));
```

**What this says:** while the A button is held (`whileTrue`), schedule the command
from `driveAtSpeed(0.3)`. When you let go, the scheduler cancels it and the motor
stops (an unscheduled command's motor goes back to its default — nothing — so it
coasts to a stop).

---

## 5. Run it

`./gradlew simulateJava`, set state to **Teleoperated**. In SimGUI, open the
**Other Devices** or **CAN** panel — you can find the TalonFX and watch its output
change when you press A. (On a real robot the wheel would spin. We'll get proper
motion in the simulation lesson.)

If you don't have an Xbox controller plugged in, use SimGUI's **Keyboard 0**
settings to map a key to the A button, or drag the joystick sliders.

---

## Try it

1. Add a **second** button (`m_driverController.b()`) that drives at `-0.3`
   (reverse). Confirm A and B fight for the motor cleanly — press both; the
   scheduler lets the most-recently-scheduled one win.
2. Change `m_driveMotor`'s CAN ID and rebuild. Nothing breaks in sim — IDs only
   matter on the real robot, but get in the habit of setting them deliberately.
3. Move the CAN ID out of the code and into `Constants.java` as a named constant
   (e.g. `public static final int kDriveMotorId = 1;`) and use it in the subsystem.
   This is where robot numbers *should* live.

---

## What you learned

- An **object** is a live instance of a **class**, made with `new`.
- **Fields** hold an object's data; **`private`** hides them (encapsulation).
- A **constructor** does setup when the object is born.
- **`import`** borrows classes from other packages; vendordeps add hardware classes.
- Subsystems expose behavior as **command factory methods** that *return* commands,
  so the scheduler can manage who controls the hardware.

Next: [Lesson 2 — Joystick control](02-joystick-control.md).
