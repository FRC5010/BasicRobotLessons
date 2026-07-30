# Lesson 17 — B-Line autos: waypoints and trajectories

**Goal:** Retire hand-composed drive-turn-drive autos in favor of a real path —
drawn as waypoints on a picture of the field, saved as a file, and followed
continuously against Lesson 14's fused pose.

**New Java concepts**
- **`PIDController`** — the library class behind the P control you've been
  writing by hand since Lesson 5
- **Method references as *actions*** — `drivetrain::driveRobotRelative`, not
  just "a reference that fetches a value"
- **`Supplier<Command>`** — storing *how to build* a command instead of the
  command, so the work happens when you want it to
- **The `deploy` folder** — the first thing you ship to the robot that isn't code

**New robot concepts**
- **B-Line's path model** — a path as a chain of `Waypoint`s, `TranslationTarget`s,
  and `RotationTarget`s, connected by straight lines rather than curves
- **Kinematics run backward** — `toChassisSpeeds` as the mirror of Lesson 10's
  `toSwerveModuleStates`
- **Three loops at once** — separate controllers for distance-to-go, heading, and
  how far you've drifted off the line
- **Event markers** — firing a command partway along a path
- **Building autos lazily** — a chooser that costs nothing at startup, and
  pre-builds the selected auto while the robot is still disabled
- **BLine Web**, the browser-based path editor, as this lesson's outside tool

---

## 1. What drive-turn-drive can't do

Look at Lesson 9's auto again, honestly:

```java
Commands.sequence(
    drivetrain.driveDistance(1.0),
    drivetrain.turnToHeading(90),
    drivetrain.driveDistance(1.0));
```

That's a *script*, and it works. But notice what it doesn't contain: any mention
of where the robot is on the field. It's a sequence of relative nudges — go
forward a bit, spin, go forward a bit — and each one starts from wherever the
last one happened to end. Errors don't cancel; they stack. Bump the robot at the
start and every step after it is wrong by that same amount, forever, with nothing
in the code that could ever notice.

It's also stuck driving in straight lines and turning in place, because that's
all `driveDistance` and `turnToHeading` know how to do. Lesson 10 gave this
chassis the ability to translate and rotate *simultaneously* — full holonomic
freedom — and the autos have never once used it.

Here's the shift, and it's the whole lesson:

> A path isn't a list of moves. It's a **shape on the field**, and the robot's
> job is to chase the nearest point on it, continuously, correcting as it goes.

That reframing is what makes the fused pose from Lesson 14 finally pay off. If
you know where you are — really know, gyro and wheels and cameras all folded
together — then "am I on the line?" is a question you can answer fifty times a
second and fix. Get bumped, and the follower simply drives back to the line. It
doesn't need to know it was bumped.

The library doing this is **B-Line** (FRC Team 2638), and it makes one choice
worth understanding up front: its paths are made of **straight segments**, not
curves. Most path libraries fit smooth splines through your points. B-Line
connects them with lines and rounds the corners by handing off to the next
segment early. That's less theoretically elegant and much easier to reason
about — you can look at a drawn path and know what the robot will do.

---

## 2. Install BLine

Same ritual as every vendordep since Lesson 3 — Ctrl+Shift+P → **WPILib: Manage
Vendor Libraries** → **Install new library (online search)**, then paste this URL:

```
https://bline-metrics.edan-liahovetsky.workers.dev/vendor/BLine-Lib.json
```

Rebuild to confirm: `./gradlew build`.

One thing that will look wrong later, so let's name it now: BLine's classes live
in the package **`frc.robot.lib.BLine`** — under `frc.robot`, the same root as
your own code. Every other library you've installed announced itself with a
vendor's name (`com.ctre.phoenix6`, `org.photonvision`,
`org.littletonrobotics.junction`). So when you type
`import frc.robot.lib.BLine.Path;` and it resolves to something you never wrote,
that's not a mistake — it's just an unusual packaging choice. It still comes from
the jar.

---

## 3. Two new doors on `Drivetrain`

B-Line drives your robot the same way a human driver does: it looks at where you
are, decides on a chassis motion, and hands it over. So it needs exactly two
things from `Drivetrain` that don't exist yet — a way to *read* the current
chassis motion, and a way to *command* one.

The reading half is a genuinely nice idea. Lesson 10 taught kinematics in one
direction: hand `toSwerveModuleStates` a `ChassisSpeeds` and get four module
states back. The same object runs the other way. Give it the four states you're
*measuring* right now and it solves for the single chassis motion that would
produce them.

**Add to `Drivetrain`, below `getModulePositions`:**

```java
    /**
     * Current robot-relative chassis speeds — Lesson 10's kinematics run
     * backward: four measured module states in, one chassis motion out.
     */
    public ChassisSpeeds getChassisSpeeds() {
        SwerveModuleState[] states = new SwerveModuleState[m_modules.length];
        for (int i = 0; i < m_modules.length; i++) {
            states[i] = new SwerveModuleState(
                    m_modules[i].getDriveVelocityMetersPerSec(),
                    Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
        }
        return m_kinematics.toChassisSpeeds(states);
    }

    /** Drive one tick from a robot-relative ChassisSpeeds. The door BLine drives through. */
    public void driveRobotRelative(ChassisSpeeds speeds) {
        applyChassisSpeeds(speeds);
    }
```

Both go with the other public accessors — `getKinematics`, `getRotation`,
`getModulePositions` — because that's what they are: questions other classes ask
about the drivetrain, and one instruction they can give it.

That second method deserves a second look, because it seems to do nothing.
`applyChassisSpeeds` already exists and already does exactly this. But it's
**`private`** — deliberately, since Lesson 10 — so that nothing outside
`Drivetrain` could command the wheels without going through a command factory.
`driveRobotRelative` is a door punched in that wall on purpose, for one specific
outside caller, with a name that says who it's for. That's a normal and healthy
thing to do; what would be unhealthy is quietly changing `applyChassisSpeeds` to
`public` and letting anything reach in.

> **Why isn't it a `Command` like everything else?** Because B-Line is building
> the command. It needs a plain method it can call every tick from inside its own
> `execute()`. This is the callback shape from Lesson 16 again — you write the
> method, the library decides when to call it.

---

## 4. Meet `PIDController`

You have written this code four times:

```java
double error = target - measured;
double output = kP * error;
```

Lesson 5 steered a module with it. Lesson 6 drove a distance. Lesson 8 turned to
a heading. Lesson 11 drove to a pose. Each time, the same three lines with
different names around them. WPILib has had a class for this the whole time, and
now you need three of them at once, so it's finally worth reaching for:

```java
PIDController controller = new PIDController(5.0, 0.0, 0.0);
double output = controller.calculate(measured, target);
```

`calculate(measured, target)` is your two lines, and the constructor's three
numbers are the **P**, **I**, and **D** gains — proportional, integral, and
derivative. You've only ever used the first. Leave the other two at zero; a plain
P loop is genuinely the right answer for path following, and I and D are a
different lesson's problem.

What the class buys you beyond tidiness is state. It remembers the previous
error, so it can compute a derivative; it accumulates error over time, so it can
integrate; and it can be told a tolerance and asked `atSetpoint()`. B-Line uses
that last part to decide when you've arrived.

Now, three loops. This is the part worth slowing down for, because "why three?"
has a good answer. Chasing a line is genuinely three separate jobs, and they pull
in different directions:

- **Translation** — how much path is left? Drive faster when there's a lot,
  ease off as you arrive. Error is meters remaining, output is meters per second.
- **Rotation** — the robot's *heading* is independent of where it's going, because
  swerve. This loop spins the chassis toward the heading the path asked for, with
  no regard for the driving. Error is radians, output is radians per second.
- **Cross-track** — you're headed the right way, at the right speed, but you're
  half a meter to the left of the line. Nothing above notices that. This loop
  pushes you sideways back onto it. Error is meters off the line, output is
  meters per second.

Every one of those gains has the same units — output per unit of error, per
second, so `1/s` — which is why the numbers are all in the same ballpark
despite measuring different things.

**Add to `Constants.java`, as a new nested class:**

```java
  public static class PathConstants {
    // BLine runs three P loops at once. Every gain here is "output per unit of
    // error", and since error is meters (or radians) and output is per-second,
    // the units all come out to 1/s.
    public static final double kTranslationP = 5.0; // m/s per meter of path left
    public static final double kRotationP = 3.0;    // rad/s per radian of heading error
    public static final double kCrossTrackP = 2.0;  // m/s per meter off the line
  }
```

Gains stay bare `double`s, same as `kDriveKV` and `kSteerKP` — they're ratios,
not physical quantities, so there's no unit for `Units` to carry.

---

## 5. Draw a path

Here's where you leave the editor, the way you left it for AdvantageScope in
Lesson 3 and the PhotonVision UI in Lesson 15. **BLine Web** is a path editor
that runs in your browser — [bline-web.pages.dev](https://bline-web.pages.dev/).
Open it, drop points on a picture of the field, drag them around, and export a
`.json` file. (The [BLine docs](https://bline-docs.pages.dev/) have a full
walkthrough of the editor if you want one.)

Before you draw, the three things you can place:

A **`Waypoint`** is a position *and* a heading — "be here, facing this way." A
**`TranslationTarget`** is a position only — "drive through this point, I don't
care which way you're pointed." A **`RotationTarget`** is a heading only — "by
about here, be facing this way," and it sits partway along a segment rather than
at a corner.

That split exists because swerve genuinely decouples the two. A robot can loop
around an obstacle while slowly rotating to face a target the entire time, and
you want to say those two things separately instead of pretending each corner
needs a heading.

> **One hard rule:** the first and last elements of a path must each be a
> `Waypoint` or a `TranslationTarget` — something with a *position*. A path that
> starts or ends on a bare rotation has no shape to follow, and B-Line will
> reject it.

Whether you draw it or type it, the result is a JSON file, and you should see one
so the editor stops being magic.

**Create `src/main/deploy/autos/paths/TwoCorners.json`:**

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 2.0, "y_meters": 2.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    },
    {
      "type": "translation",
      "x_meters": 5.0,
      "y_meters": 2.0
    },
    {
      "type": "rotation",
      "rotation_radians": 1.5707963,
      "t_ratio": 0.5
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 5.0, "y_meters": 5.0 },
      "rotation_target": { "rotation_radians": 3.1415927 }
    }
  ]
}
```

Read it as a sentence: start at (2, 2) facing 0°, drive through (5, 2), and
somewhere around halfway through the next leg come around to 90°, ending at
(5, 5) facing 180°. That `t_ratio` of `0.5` is "halfway along this segment" —
rotations get placed by fraction-of-segment rather than by coordinate, since
they don't have a position of their own.

Angles here are **radians**, not degrees. The editor writes them for you; this is
mostly a warning for when you hand-edit and wonder why `90` sent the robot
somewhere strange.

B-Line also needs to know how fast it's allowed to go, and that lives in one file
shared by every path.

**Create `src/main/deploy/autos/config.json`:**

```json
{
  "kinematic_constraints": {
    "default_max_velocity_meters_per_sec": 3.0,
    "default_max_acceleration_meters_per_sec2": 3.0,
    "default_max_velocity_deg_per_sec": 360.0,
    "default_max_acceleration_deg_per_sec2": 720.0,
    "default_end_translation_tolerance_meters": 0.05,
    "default_end_rotation_tolerance_deg": 2.0,
    "default_intermediate_handoff_radius_meters": 0.3
  }
}
```

> **`config.json` is not optional.** B-Line reads it every time it loads a path,
> so a missing file is a crash at startup, not a quiet default. If your robot
> throws `Failed to load global constraints` the moment it boots, this is why.

The last of those numbers is the cornering knob. **Handoff radius** is how close
the robot has to get to a point before it gives up on it and starts driving to
the next one — so `0.3` means corners get rounded off by about 30 cm instead of
coming to a stop and pivoting. Turn it down for precision, up for speed.

And now the `deploy` folder, which you've had since Lesson 0 and never used.
Anything under `src/main/deploy/` gets copied onto the roboRIO next to your
program when you run `./gradlew deploy` — it's for the files your code needs to
*read* rather than compile. Paths are the classic case: you want to redraw one
between matches without recompiling anything. The simulator points at the same
folder, so a path you drop in works in sim immediately.

Make a second path too. Real robots carry one per starting position, and having
two here makes something visible in section 7 that one path would hide.

**Create `src/main/deploy/autos/paths/FarSide.json`:**

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 2.0, "y_meters": 6.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    },
    {
      "type": "translation",
      "x_meters": 8.0,
      "y_meters": 6.0
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 8.0, "y_meters": 2.0 },
      "rotation_target": { "rotation_radians": -1.5707963 }
    }
  ]
}
```

---

## 6. Build the follow command

`FollowPath.Builder` takes everything B-Line needs to drive your specific robot,
and `build(path)` turns a `Path` into a `Command` you can schedule like any other.

Look at what goes into the builder and notice what *isn't* there: the path. The
builder describes how **this robot** follows a line — which subsystem to require,
where to read pose and speed, how to make it move, how hard to correct. None of
that changes between autos. Only the `Path` does.

So build one builder and call `build(...)` on it as many times as you have paths.
Two autos, one builder, two lines that differ by a filename:

```java
    FollowPath.Builder paths = new FollowPath.Builder(/* ...seven things... */);

    Command twoCorners = paths.build(new Path("TwoCorners"));
    Command farSide    = paths.build(new Path("FarSide"));
```

Getting that backwards — a fresh builder and three fresh `PIDController`s per
auto — is the kind of thing that looks fine and quietly triples as your auto list
grows.

> **Is sharing controllers safe?** Yes, and for a reason worth knowing. Every
> `FollowPath` requires the drivetrain, so the scheduler guarantees only one runs
> at a time. B-Line also resets the controllers and re-reads the path's tolerances
> in `initialize()`, so each run starts clean.

---

## 7. A chooser that holds recipes

Now the part that decides *when* all of that happens, and it's the difference
between a robot that boots fast and one that doesn't.

Lesson 9's chooser holds `Command` objects:

```java
    m_autoChooser.addOption("Two Corners", Autos.followPath("TwoCorners"));
```

Read that as code, not as intent. `Autos.followPath("TwoCorners")` runs *right
there*, at startup, to produce the object you hand to `addOption`. Which means
every auto in the drop-down gets fully constructed before the robot is ready —
including the nine you aren't going to run. Each BLine auto opens a file, parses
JSON, and validates a path. Ten of those is ten file reads on a roboRIO during
boot, to throw away nine of them.

The fix is to put a **recipe** in the chooser instead of a finished dish:

```java
    chooser.addOption("Two Corners", () -> paths.build(new Path("TwoCorners")));
```

That lambda is a `Supplier<Command>` — the same "code stored as data" idea as the
joystick suppliers in Lesson 2, except what it supplies is a whole command. The
chooser now holds ten tiny lambdas instead of ten built autos, and startup does no
path loading at all.

But that just moves the bill. If you build the command in
`getAutonomousCommand()`, you pay for the file read *when autonomous starts* —
out of the fifteen seconds you actually needed. So build it as soon as the
**selection changes**, which is minutes earlier, while everyone's still standing
behind the glass:

```java
    chooser.onChange(recipe -> s_selected = recipe.get());
```

`onChange` is AdvantageKit's callback for "the driver picked something different."
It fires while the robot is **disabled** — AdvantageKit polls its dashboard inputs
every loop regardless of enable state — so the work lands in dead time. It also
fires once for the *default* option on the first loop, which matters: if it
didn't, a driver who never touched the chooser would get nothing.

**Replace `Autos.java` with:**

```java
// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot.commands;

import java.util.function.Supplier;

import org.littletonrobotics.junction.networktables.LoggedDashboardChooser;

import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.Constants.PathConstants;
import frc.robot.lib.BLine.FollowPath;
import frc.robot.lib.BLine.Path;
import frc.robot.subsystems.Drivetrain;
import frc.robot.subsystems.Localizer;

public final class Autos {
  /** The selected auto, already built and ready to schedule. */
  private static Command s_selected = Commands.none();

  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Commands.sequence(
        drivetrain.driveDistance(1.0),     // step 1: forward 1 meter
        drivetrain.turnToHeading(90),      // step 2: face 90°
        drivetrain.driveDistance(1.0));    // step 3: forward 1 meter
  }

  /**
   * Builds the auto chooser. Every option is a recipe, not a finished command, so
   * nothing is constructed at startup. onChange builds whichever one is selected
   * the moment the selection changes — including the default, on the first loop.
   */
  public static LoggedDashboardChooser<Supplier<Command>> buildChooser(
      Drivetrain drivetrain, Localizer localizer) {
    // One builder, shared by every path below. It describes how *this robot*
    // follows a path; the Path is the only thing that differs per auto.
    FollowPath.Builder paths = new FollowPath.Builder(
        drivetrain,                     // the subsystem the command will require
        localizer::getPose,             // where we are (fused, Lesson 14)
        drivetrain::getChassisSpeeds,   // how fast we're going, robot-relative
        drivetrain::driveRobotRelative, // how to make the robot move
        new PIDController(PathConstants.kTranslationP, 0, 0),
        new PIDController(PathConstants.kRotationP, 0, 0),
        new PIDController(PathConstants.kCrossTrackP, 0, 0))
        .withDefaultShouldFlip()              // mirror the path for the red alliance
        .withPoseReset(localizer::resetPose); // snap the estimate to the path's start

    LoggedDashboardChooser<Supplier<Command>> chooser =
        new LoggedDashboardChooser<>("Auto Choice");
    chooser.addDefaultOption("Drive-Turn-Drive", () -> driveTurnDrive(drivetrain));
    chooser.addOption("Do Nothing", Commands::none);
    chooser.addOption("Two Corners", () -> paths.build(new Path("TwoCorners")));
    chooser.addOption("Far Side", () -> paths.build(new Path("FarSide")));

    chooser.onChange(recipe -> s_selected = recipe.get());
    return chooser;
  }

  /** The selected auto, built ahead of time. Never null — worst case it does nothing. */
  public static Command selected() {
    return s_selected;
  }
}
```

Those last two path options are the payoff from section 6: adding an auto is one
line, because `paths` already knows how this robot drives.

A few things worth reading twice. `paths` is a **local variable**, and the lambdas
below it still use it after `buildChooser` returns — the same closure behavior as
`m_localizer::getPose` in Lesson 15, and the reason no field is needed. Java
requires such a captured local to be effectively final, which `paths` is.
`Commands::none` is a method reference standing in for `() -> Commands.none()`.
And `s_selected` starts as `Commands.none()` rather than `null`, so
`getAutonomousCommand()` can never hand the scheduler a null — an improvement on
Lesson 9, where an untouched chooser could do exactly that.

> **Why is the chooser in `Autos` now?** Because everything it needs is here: the
> builder, the path names, `driveTurnDrive`. `RobotContainer` is the wiring
> diagram — it says which subsystems exist and what triggers what. *Which autos
> the robot has* is a fact about autos.

---

## 8. Wire it up

`RobotContainer` gets shorter. It holds the chooser — something has to own it —
but it no longer knows what's in it.

**In `RobotContainer`, replace the `m_autoChooser` field with:**

```java
  // Publishes a drop-down AND logs the selection (AdvantageKit). Holds recipes,
  // not built commands — Autos owns the options and pre-builds the pick.
  private final LoggedDashboardChooser<Supplier<Command>> m_autoChooser;
```

**Add the import:**

```java
import java.util.function.Supplier;
```

**In the constructor, replace the three `addOption` lines with:**

```java
    m_autoChooser = Autos.buildChooser(m_drivetrain, m_localizer);
```

**And read the pre-built command instead of building one:**

```java
  public Command getAutonomousCommand() {
    return Autos.selected();
  }
```

`driveTurnDrive` survived all of this, by the way. Lesson 9's auto isn't wrong,
and keeping it in the drop-down makes the difference easy to see on the field
view — a fixed sequence of nudges next to a path being chased.

---

## 9. Event markers

Real autos do things along the way — start a shooter while still driving, drop an
intake before arriving. B-Line handles that with **event markers**: a named point
on the path that fires a command when the robot passes it.

You register the name once in code, and the path file refers to it by that name.

**Add to `RobotContainer`'s constructor, above `configureBindings()`:**

```java
    // Any "shoot" marker dropped on a path fires this. No mechanism exists yet,
    // so it just says so in the console — Lesson 18 gives it something to do.
    FollowPath.registerEventTrigger("shoot", Commands.print("Event: shoot!"));
```

**Add the import at the top of `RobotContainer.java`:**

```java
import frc.robot.lib.BLine.FollowPath;
```

**Then add a marker to `TwoCorners.json`, between the `rotation` and the final
`waypoint`:**

```json
    {
      "type": "event_trigger",
      "t_ratio": 0.8,
      "lib_key": "shoot"
    },
```

`lib_key` is the name you registered; `t_ratio` places it 80% of the way along
that segment. The registration is `static` — it's a table B-Line keeps for the
whole program, not something a single path owns — which is why one call in
`RobotContainer` covers every path that mentions `"shoot"`.

Printing to the console is a placeholder, and an honest one: there is nothing on
this robot to shoot with yet. Lesson 18 starts building mechanisms, and when it
does, this line becomes a real command and nothing else here changes.

---

## 10. Run it

Run `./gradlew simulateJava`, pick **Two Corners** in the auto chooser, and enable
**Autonomous**.

Then watch it the way you've watched every closed-loop lesson since Lesson 5 —
commanded against measured. Open AdvantageScope, put `Localizer/Pose` on the
Odometry tab, and look for the robot tracing an actual shape: out along X,
rounding the corner without stopping, coming around to 90° partway up the second
leg, settling at (5, 5) facing 180°. Somewhere near the top you should see
`Event: shoot!` in the console.

If you did Lesson 16, you have something better than commanded-vs-measured
available: plot `Drivetrain/SimulatedPose` — ground truth — on the same chart as
`Localizer/Pose`. Now you can see all three stories at once: the line you drew,
where the robot thinks it is, and where it actually is.

The satisfying test is the one a fixed sequence of nudges could never survive.
While the path is running, drag the robot sideways off the line in the sim's field
view. `driveDistance` would have carried that error to the end of the match. This
just... drives back to the line and carries on.

One more thing to notice, and it's about section 7 rather than the driving. Put a
`System.out.println` inside the `Two Corners` lambda, restart the sim, and watch
*when* it prints while the robot sits disabled: once at startup for the default,
then once each time you change the drop-down — never during autonomous. That's
the pre-building working. Take it out when you've seen it.

---

## Try it

1. **Add a third path.** Draw or hand-write one, then add it to the chooser. It
   should be a single line next to the other two, because `paths` already exists —
   if you find yourself building a second `FollowPath.Builder`, re-read section 6.
   Then set `default_intermediate_handoff_radius_meters` to `0.05` and run it
   again: tight corners, slower lap.
2. **Mistune the cross-track gain.** Set `kCrossTrackP` to `0.0` and run the path.
   The robot still gets to the end, because translation and rotation are handling
   themselves — but it will visibly bow off the straight lines in between. Then
   try `15.0` and watch it oscillate across the line instead. This is the clearest
   single-loop demo in the whole course, because you can see exactly which job
   that one controller was doing.
3. **Compose a path with a sequence.** Add a chooser option whose lambda follows
   `TwoCorners` and *then* runs Lesson 8's `turnToHeading(0)`, via
   `Commands.sequence`. A library-built command and a hand-written one are both
   just `Command`s. Note that the whole composition still happens lazily, inside
   the lambda — you get that for free now.
4. **Give the marker a real job.** Swap the `Commands.print` for something you can
   see — `Commands.runOnce(() -> Logger.recordOutput("Auto/ShootFired", true))`,
   say — and confirm on the plot that it fires where you placed it. Then move the
   `t_ratio` and watch the timing move with it.
5. **(With Lesson 16)** Run a path that clips a field wall. maple-sim will refuse
   to let the robot through, the follower will keep trying to reach a point it
   can't get to, and you'll learn something real about drawing paths that assume
   an empty field.

---

## What you learned

Autonomous stopped being a script. A path is a shape now — points in field
coordinates, saved in a file you can redraw between matches — and the robot's job
changed from "perform these moves in order" to "find the nearest point on that
shape and chase it." That's why a bump no longer ruins the match: correcting is
the only thing the follower ever does.

That switch is only possible because of what Lesson 14 built. Chasing a line
requires knowing where you are, continuously and honestly, and a fused estimate
is what makes "am I on the line?" a question with an answer. Three lessons of
localization work cashed in here.

**`PIDController`** finally put a name on the arithmetic you'd written four
times, and using three of them at once made a point that one never could:
following a path is not one problem. Distance-to-go, heading, and drift off the
line are genuinely separate jobs, and giving each its own loop with its own gain
is what lets you tune them independently — which is exactly what Try It 2 lets you
feel.

Two habits from this lesson outlive B-Line entirely. **Build the expensive,
unchanging thing once** — the `FollowPath.Builder` describes how your robot follows
a line, which is the same for every path, so one builder serves all of them.
And **store work you might not need as a recipe, not a result**: a chooser full of
`Supplier<Command>` costs nothing at boot, and `onChange` moves the real
construction into the minutes the robot spends disabled instead of the fifteen
seconds it spends scoring. Neither is about path following. Both are about
noticing *when* your code runs, not just what it does.

Underneath all of it the old shapes kept holding. Kinematics ran backward with no
new class. `resetPose` from Lesson 14 got called by B-Line instead of by you. And a
**method reference** turned out to work just as well for handing over a verb
(`drivetrain::driveRobotRelative`) as it did for handing over a value back in
Lesson 2. The only genuinely new plumbing was two small public doors on
`Drivetrain` — deliberate, named, and narrow.

The drivetrain half of this course is done. Your robot drives itself along drawn
paths, knows where it is from three kinds of evidence, replays a match from a log,
and lives in a world with walls. What it doesn't have is anything to *do* when it
arrives. That's next.

Next: [Lesson 18 — Scoring elevator: a second mechanism](18-elevator.md).
