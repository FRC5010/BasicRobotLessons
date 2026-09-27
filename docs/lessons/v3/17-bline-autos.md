# Lesson 17 — B-Line autos: following a drawn path

**Goal:** Retire hand-composed drive-turn-drive autos in favor of a real path —
drawn as points on a picture of the field, saved as a file, and followed
continuously against Lesson 14's fused pose — with one autonomous opmode per
path.

**New Java concepts**
- **`PIDController`** — the library class behind the P control you've been
  writing by hand since Lesson 5
- **Method references as *actions*** — `drivetrain::driveRobotRelative`, not
  just "a reference that fetches a value"
- **The `deploy` folder** — the first thing you ship to the robot that isn't code

**New robot concepts**
- **B-Line's path model** — a path as a chain of `Waypoint`s, `TranslationTarget`s,
  and `RotationTarget`s, connected by straight lines rather than curves
- **Three loops at once** — separate controllers for distance-to-go, heading, and
  how far you've drifted off the line
- **Speed limits are physics** — why a corner costs speed, and the arithmetic
  for picking a top speed your robot can actually stop from
- **Event markers** — firing an action partway along a path
- **An opmode is built when it's selected** — so an auto's path file is read
  while the robot is still disabled, not when the match starts

---

## 1. What drive-turn-drive can't do

Look at Lesson 9's auto again, honestly.

*Nothing to add — this is code you already have:*

```java
return Command.noRequirements(coroutine -> {
      coroutine.await(drivetrain.driveDistance(1.0));  // step 1: forward 1 meter
      coroutine.await(drivetrain.turnToHeading(90));   // step 2: face 90°
      coroutine.await(drivetrain.driveDistance(1.0));  // step 3: forward 1 meter
    })
    .named("Drive Turn Drive");
```

That's a *script*, and it works. But notice what it doesn't contain: any mention
of where the robot is on the field. It's a sequence of relative nudges — go
forward a bit, spin, go forward a bit — and each one starts from wherever the
last one happened to end. Errors don't cancel; they stack. Bump the robot at the
start and every step after it is wrong by that same amount, forever, with nothing
in the code that could ever notice.

It's also stuck driving in straight lines and turning in place, because that's
all `driveDistance` and `turnToHeading` know how to do. Lesson 10 gave this
chassis the ability to translate and rotate *simultaneously* — full swerve
freedom — and the autos have never once used it.

Here's the shift, and it's the whole lesson:

> A path isn't a list of moves. It's a **shape on the field**, and the robot's
> job is to chase the nearest point on it, continuously, correcting as it goes.

That reframing is what makes the fused pose from Lesson 14 finally pay off. If
you know where you are — really know, gyro and wheels and cameras all folded
together — then "am I on the line?" is a question you can answer fifty times a
second and fix. Drift off it, for any reason, and the follower simply drives
back. It doesn't need to know *why* you were off.

The library doing this is **B-Line**, and it makes one choice
worth understanding up front: its paths are made of **straight segments**, not
curves. Most path libraries fit smooth splines through your points. B-Line
connects them with lines and rounds the corners by handing off to the next
segment early. That's less theoretically elegant and much easier to reason
about — you can look at a drawn path and know what the robot will do.

---

## 2. Install BLine

Same ritual as Lesson 15's LimelightLib: BLine isn't in WPILib's online search
list, so you install it by URL. Ctrl+Shift+P → **WPILib: Manage Vendor
Libraries** → **Install new library (online)**, and paste this:

```
https://raw.githubusercontent.com/edanliahovetsky/BLine-Lib/d9967810725ff861767ccde5c5d84981b9defc94/BLine-Lib-2027.json
```

Rebuild to confirm: `./gradlew build`.

That long URL names one exact commit, the one BLine tagged as its
`2027.0.0-beta.1` release, for the same reason as Lesson 15's: BLine's own
docs hand out a shorter link that follows whatever they publish next. The
file it installs is `BLine-Lib-2027.json` — the 2027 build, written for this
framework's Commands V3. (BLine's 2026 build is a different file for a
different command framework. If you ever see a `BLine-Lib.json` in your
`vendordeps` folder, it's the wrong one for this course — remove it.)

One thing that will look wrong later, so here it is now: BLine's classes live
in packages under **`frc.robot.lib.BLine`** — `frc.robot.lib.BLine.commands`,
`frc.robot.lib.BLine.path`, and a couple of others. Every other library you've
installed announced itself with a vendor's name (`com.ctre.phoenix6`,
`com.limelightvision`). So when you type
`import frc.robot.lib.BLine.path.Path;` and it resolves to something you never
wrote — in a package that isn't even your `first.robot` — that's not a
mistake. It's just an unusual packaging choice, and it still comes from the jar.

---

## 3. Two new doors on `Drivetrain`

B-Line drives your robot the same way a human driver does: it looks at where you
are, decides on a chassis motion, and hands it over. So it needs exactly two
things from `Drivetrain` that aren't public yet — a way to *read* the current
chassis motion, and a way to *command* one.

You've already written the reading half. Lesson 16's `simulateChassis` needed
to know how the chassis was really moving, so it asked the kinematics the
question backward: here are the four wheel velocities I'm *measuring*, what
single chassis motion would produce them? That's exactly what B-Line needs too.
Two callers now want the same answer, so it moves into its own method — the
same "pull out a helper" move as Lesson 8's `commandRotation`.

**Add to `Drivetrain`, below `getModulePositions`:**

```java
  /**
   * How the chassis is moving right now, robot-relative — kinematics run
   * backward: four measured wheel velocities in, one chassis motion out.
   */
  public ChassisVelocities getChassisVelocities() {
    SwerveModuleVelocity[] wheels = new SwerveModuleVelocity[m_modules.length];
    for (int i = 0; i < m_modules.length; i++) {
      wheels[i] = new SwerveModuleVelocity(
          m_modules[i].getDriveVelocityMetersPerSec(),
          Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
    }
    return m_kinematics.toChassisVelocities(wheels);
  }

  /** Drive one tick from a robot-relative chassis motion. The door BLine drives through. */
  public void driveRobotRelative(ChassisVelocities speeds) {
    applyChassisSpeeds(speeds);
  }
```

**Then replace the body of `simulateChassis` below the null check, so it calls the new method:**

```java
  /** Moves the simulated chassis the way its wheels actually turned this tick. Sim only. */
  private void simulateChassis() {
    if (m_chassisSim == null) {
      return; // a real robot moves itself
    }
    m_chassisSim.update(getChassisVelocities(), 0.020);
  }
```

Both new methods go with the other public accessors — `getKinematics`,
`getRotation`, `getModulePositions` — because that's what they are: questions
other classes ask about the drivetrain, and one instruction they can give it.

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
> command. You write the method; the library decides when to call it.

---

## 4. Meet `PIDController`

You have written this code three times.

*Nothing to add — you know this one:*

```java
double error = target - measured;
double output = kP * error;
```

Lesson 5 steered a module with it. Lesson 8 turned to a heading. Lesson 11
drove to a pose. Each time, the same two lines with different names around
them. WPILib has had a class for this the whole time, and
now you need three of them at once, so it's finally worth reaching for.

*Nothing to add — this is just how the class is used:*

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
integrate; and it can be told a tolerance and asked whether it's there yet.
B-Line uses all of that inside its follower. You just hand it the controllers.

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

**Add to `Constants.java`, as a new nested class after `VisionConstants`:**

```java
  public static final class PathConstants {
    // BLine runs three P loops at once. Every gain here is "output per unit of
    // error", and since error is meters (or radians) and output is per-second,
    // the units all come out to 1/s.
    public static final double kTranslationP = 5.0; // m/s per meter of path left
    public static final double kRotationP = 3.0;    // rad/s per radian of heading error
    public static final double kCrossTrackP = 2.0;  // m/s per meter off the line
  }
```

Gains stay bare `double`s, same as `kDriveKV` and `HeadingConstants.kP` —
they're ratios, not physical quantities, so there's no unit for `Units` to
carry.

---

## 5. Draw a path

Here's where you leave the editor, the way you left it for AdvantageScope in
Lesson 3. **BLine Web** is a path editor that runs in your browser: drop points
on a picture of the field, drag them around, and export a `.json` file. The
2027 build you installed has its own beta editor, which BLine's 2027 guide
lists at [web-beta.bline-web.pages.dev](https://web-beta.bline-web.pages.dev/).
Use that one, not the 2026 editor.

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

Whether you draw it or type it, the result is a JSON file, and you should see one
so the editor stops being magic. The simulated robot starts at (3, 3) facing 0°
— that's `DriveConstants.kSimStartingPose` from Lesson 16 — so this path starts
there too.

**Create `src/main/deploy/autos/paths/TwoCorners.json`:**

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 3.0, "y_meters": 3.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    },
    {
      "type": "translation",
      "x_meters": 6.0,
      "y_meters": 3.0
    },
    {
      "type": "rotation",
      "rotation_radians": 1.5707963,
      "t_ratio": 0.5,
      "profiled_rotation": true
    },
    {
      "type": "event_trigger",
      "t_ratio": 0.8,
      "lib_key": "shoot"
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 6.0, "y_meters": 6.0 },
      "rotation_target": { "rotation_radians": 3.1415927, "profiled_rotation": true }
    }
  ]
}
```

Read it as a sentence: start at (3, 3) facing 0°, drive through (6, 3), be facing
90° by halfway up the next leg, and end at (6, 6) facing 180°. That `t_ratio` of
`0.5` is "halfway along this segment" — rotations get placed by
fraction-of-segment rather than by coordinate, since they don't have a position
of their own. The `event_trigger` element is for section 8; leave it in for now.

**`"profiled_rotation": true`** is what makes "by halfway up the next leg" true.
With it, the heading the path asks for turns *gradually*, in step with how far
along the path you are. Leave it out and the robot turns to face the next
heading as fast as it can, the moment that target becomes the next one — on this
path, that means it's already facing 90° before it reaches the first corner.

Angles here are **radians**, not degrees. The editor writes them for you; this is
mostly a warning for when you hand-edit and wonder why `90` sent the robot
somewhere strange.

> **The simulated field is empty.** Lesson 16's chassis has no walls and nothing
> to bump into, so a path can cross places a real robot couldn't. When you draw
> paths for a real field, draw them around its structures.

B-Line also needs to know how fast it's allowed to go, and that lives in one file
shared by every path.

**Create `src/main/deploy/autos/config.json`:**

```json
{
  "kinematic_constraints": {
    "default_max_velocity_meters_per_sec": 2.0,
    "default_max_acceleration_meters_per_sec2": 6.0,
    "default_max_velocity_deg_per_sec": 360.0,
    "default_max_acceleration_deg_per_sec2": 720.0,
    "default_end_translation_tolerance_meters": 0.05,
    "default_end_rotation_tolerance_deg": 2.0,
    "default_intermediate_handoff_radius_meters": 0.5
  }
}
```

> **`config.json` is not optional.** B-Line reads it every time it loads a path,
> so a missing file is an error the moment the path loads, not a quiet default.

The last of those numbers is the cornering knob. **Handoff radius** is how close
the robot has to get to a point before it gives up on it and starts driving to
the next one — so `0.5` means the robot starts turning up the second leg half a
meter before it reaches the corner, instead of driving all the way in.

The first two numbers deserve more than a glance, because they're not taste.
**B-Line never slows down for a corner or a stop by planning ahead.** The
translation loop just asks for `kTranslationP` × distance left, capped at the
max speed, and the acceleration limit decides how fast the robot is allowed to
change what it's doing. So whether the robot can stop where you asked comes down
to two lines of arithmetic:

- The loop starts slowing the robot when `5.0 × distance left` drops below the
  top speed. At 2 m/s, that's 2.0 ÷ 5.0 = **0.4 m** from the end.
- Stopping from 2 m/s at 6 m/s² takes 2² ÷ (2 × 6) = **0.33 m**.

0.33 m of stopping fits inside 0.4 m of warning, so the robot arrives. At 3 m/s
it wouldn't: slowing starts 0.6 m out, and stopping takes 3² ÷ (2 × 6) = 0.75 m.
That's what Try It #2 has you watch. The same limit governs corners — turning
2 m/s of "east" into 2 m/s of "north" is a change in velocity like any other,
and it can't happen faster than 6 m/s² allows. With these numbers the robot
swings roughly 5–12 cm past this path's first corner before it's heading up the
second leg. (Measured in this course's sim over several runs; it varies a
little, because vision nudges the estimate a little differently each time.)

And now the `deploy` folder, which you've had since Lesson 0 and never used.
Anything under `src/main/deploy/` gets copied onto the robot next to your
program when you deploy — it's for the files your code needs to *read* rather
than compile. Paths are the classic case: you want to redraw one between matches
without recompiling anything. The simulator reads from the same folder, so a
path you drop in works in sim immediately.

Make a second path too. Real robots carry several autos, and having two here
makes something visible in section 7 that one path would hide.

**Create `src/main/deploy/autos/paths/FarSide.json`:**

```json
{
  "path_elements": [
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 3.0, "y_meters": 3.0 },
      "rotation_target": { "rotation_radians": 0.0 }
    },
    {
      "type": "translation",
      "x_meters": 9.0,
      "y_meters": 3.0
    },
    {
      "type": "waypoint",
      "translation_target": { "x_meters": 9.0, "y_meters": 1.0 },
      "rotation_target": { "rotation_radians": -1.5707963, "profiled_rotation": true }
    }
  ]
}
```

It starts at the same place — in this sim the robot always starts at
(3, 3) — then runs past the middle of the field and turns right, ending up
facing −90°.

---

## 6. Meet `FollowPath.Builder`

B-Line needs a handful of facts about your specific robot before it can drive it
down a line, and `FollowPath.Builder` is where you hand them over. Once it has
them, `build(path)` turns a `Path` into an ordinary Commands V3 `Command`.

Everything about following a path lives in `Autos`, next to `driveTurnDrive`,
because it's all about autonomous — so that's where the builder gets made.

**Add to `Autos`, below `driveTurnDrive`:**

```java
  /** Everything about following a path that doesn't depend on which path it is. */
  public static FollowPath.Builder makePathBuilder(Drivetrain drivetrain, Localizer localizer) {
    return new FollowPath.Builder(
        DriveType.SWERVE,                  // what kind of drivetrain this is
        drivetrain,                        // the mechanism the command will require
        localizer::getPose,                // where we are (fused, Lesson 14)
        localizer::resetPose,              // how to tell the estimate where we are
        drivetrain::getChassisVelocities,  // how fast we're going, robot-relative
        drivetrain::driveRobotRelative,    // how to make the robot move
        new PIDController(PathConstants.kTranslationP, 0, 0),
        new PIDController(PathConstants.kRotationP, 0, 0),
        new PIDController(PathConstants.kCrossTrackP, 0, 0))
        .withDefaultShouldFlip()           // mirror the path for the red alliance
        .withTelemetry(Telemetry.getTable()); // log what the follower is doing
  }
```

**Add to `Autos`'s imports:**

```java
import org.wpilib.math.controller.PIDController;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.PathConstants;
import first.robot.subsystems.Localizer;
import frc.robot.lib.BLine.commands.FollowPath;
import frc.robot.lib.BLine.following.DriveType;
```

Nine arguments, and you've already met every idea in them.

The first says what kind of drivetrain this is — B-Line can drive tank and
mecanum robots too, and it follows a path differently for each. The second is
the **mechanism the command requires** — Lesson 9's mutual exclusion, so your
teleop drive command steps aside while a path is running.

The next four are section 3's two new doors plus Lesson 14's pose and reset,
all handed over as **method references**. Two of them are suppliers:
`localizer::getPose` and `drivetrain::getChassisVelocities` fetch a value when
asked, exactly like the joystick suppliers back in Lesson 2. The other two are
different in kind. `drivetrain::driveRobotRelative` doesn't return anything —
B-Line *calls* it, every tick, with the chassis motion it has decided on.
`localizer::resetPose` is the same shape: B-Line calls it with a pose. You're
not handing over a value, or even a way to get one. You're handing over a
**verb**.

Then the three `PIDController`s from section 4, in the order the builder expects
them: translation, rotation, cross-track. They have to be three separate
objects — hand the builder the same controller twice and it throws an error
the moment it's made.

Two more settings are chained onto the end. `withDefaultShouldFlip()` mirrors the
whole path to the far side of the field when the Driver Station reports you're on
the red alliance — draw once, works on both. `withTelemetry(Telemetry.getTable())`
tells B-Line to log what it's doing — cross-track error, distance left, which
point it's heading for — under `FollowPath/`, next to everything else you log.
Section 9 uses those.

Alright — one thing to notice about that list, because it explains the shape of
the method. The path isn't in it. Every one of those arguments describes how
*this robot* follows a line, and none of them depend on *which* line. That's why
`makePathBuilder` takes only the drivetrain and the localizer, and why it hands back
the builder instead of a finished command: one builder can serve every path you'll
ever draw.

> **One builder means one set of controllers for every auto. Is that safe?** Yes.
> Every command the builder makes requires the drivetrain, so the scheduler
> guarantees only one of them is ever running. And B-Line resets the controllers
> each time a path starts, so each run starts clean.

With that in place, turning a path's name into something you can schedule is
one short method.

**Add to `Autos`, below `makePathBuilder`:**

```java
  /** One drawn path, as a command. The file is deploy/autos/paths/<pathName>.json. */
  public static Command followPath(FollowPath.Builder pathBuilder, String pathName) {
    return pathBuilder.build(new Path(pathName))
        .withPoseReset(); // start by telling the estimate we're at the path's start
  }
```

**Add to `Autos`'s imports:**

```java
import frc.robot.lib.BLine.path.Path;
```

`new Path("TwoCorners")` opens `deploy/autos/paths/TwoCorners.json`, reads it,
and reads `config.json` alongside it — the `.json` is added for you.
`withPoseReset()` asks B-Line to call `localizer::resetPose` with the path's
starting pose the moment the path starts: "we're at the start of the path, trust
me." On a real field that's true because a person put the robot there, which is
exactly why it's worth doing — the estimate starts the auto knowing where the
robot is instead of guessing.

The builder needs a home that's built once and reachable from every autonomous
opmode. You already have exactly that place.

**Add to `Robot`, below the camera fields:**

```java
  public final LimelightPoseProvider frontCamera;
  public final LimelightPoseProvider backCamera;

  // How this robot follows a path. It's the same for every path, so it's
  // built once, here, and every autonomous opmode reaches in and uses it.
  public final FollowPath.Builder pathBuilder = Autos.makePathBuilder(drivetrain, localizer);
```

**Add to `Robot`'s imports:**

```java
import first.robot.commands.Autos;
import frc.robot.lib.BLine.commands.FollowPath;
```

It goes in `Robot` for the same reason the drivetrain does: opmodes are rebuilt
every time they're selected, and `Robot` is the thing that lives for the whole
program. It's a field initializer that uses `drivetrain` and `localizer`, so it
has to come after both — it does, since they're declared above it.

---

## 7. One opmode per path

In Lesson 9 you learned how this framework offers a choice of autos: every
`@Autonomous` class is its own entry on the Driver Station's opmode selector.
A path auto is one more of those — and here's why that's a better deal than it
looks.

**Create `opmode/RobotAutoTwoCorners.java`:**

```java
// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package first.robot.opmode;

import org.wpilib.command3.button.RobotModeTriggers;
import org.wpilib.opmode.Autonomous;
import org.wpilib.opmode.PeriodicOpMode;

import first.robot.Robot;
import first.robot.commands.Autos;

@Autonomous(name = "Two Corners", group = "Paths")
public class RobotAutoTwoCorners extends PeriodicOpMode {
  private final Robot robot;

  public RobotAutoTwoCorners(Robot robot) {
    this.robot = robot;

    // Built right now, while the robot is still disabled; it runs on enable.
    RobotModeTriggers.autonomous().onTrue(Autos.followPath(robot.pathBuilder, "TwoCorners"));
  }

  @Override
  public void periodic() {
    /* Called periodically (set time interval) while the robot is enabled. */
  }
}
```

**Create `opmode/RobotAutoFarSide.java`** — the same file with three words
changed: the class name `RobotAutoFarSide` (in both places), the annotation's
`name = "Far Side"`, and the path name `"FarSide"`.

The `group = "Paths"` sorts both into a group of their own, apart from
Lesson 9's two.

Now the part worth understanding. **An opmode's constructor runs the moment it's
selected on the Driver Station** — not when you enable. That's how Lesson 9's
binding got scoped to its opmode, and it has a second consequence here: the
`Autos.followPath(...)` call on that line runs at selection time too. So the path
file is opened, parsed and checked while the robot is still sitting disabled,
minutes before the match — and when autonomous starts, the command is already
built and just has to run.

That matters more than it sounds. Reading and checking a file isn't free, and the
start of autonomous is the one moment you can't afford to spend on setup. It also
means a mistake shows up early. Misspell the path name — `"TwoCorner"` — and
`new Path(...)` throws an `IllegalArgumentException` that names the missing
file the moment you select the auto, in the pits, instead of when the match
starts.

> **Why not one opmode with a menu inside it?** Because the Driver Station
> already *is* the menu. Each extra auto is one small file and no chooser code —
> the same pattern Lesson 9 set up with **Do Nothing**.

---

## 8. Event markers

Real autos do things along the way — spin up a shooter while still driving, drop an
intake before arriving. B-Line handles that with **event markers**: a named point on
the path that fires an action as the robot passes it.

The name is the link. A path file refers to a marker by `lib_key`, and your code
registers what that key should do. Registration is `static` — B-Line keeps one table
for the whole program, not one per path — so it happens once, and every path that
mentions `"shoot"` gets it.

**Add to `Autos`, below `followPath`:**

```java
  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers() {
    // Nothing on this robot can shoot yet, so it just says so in the console.
    FollowPath.registerEventTrigger("shoot", () -> System.out.println("Event: shoot!"));
  }
```

The second argument is a lambda that takes nothing and returns nothing — a plain
action, which Java calls a `Runnable`. B-Line runs it once, on the loop after the
robot passes the marker. It has to be quick: it runs inside the robot's loop, so
anything slow stalls the whole robot. (`registerEventTrigger` also accepts a
`Command`, for an event that needs to keep running for a while.)

Once for the whole program means the constructor of the thing that lives for the
whole program.

**Add to `Robot`'s constructor, after the `addEventListener` line:**

```java
  public Robot() {
    DataLogManager.start(); // saves every published value to a .wpilog file
    Scheduler.getDefault().addEventListener(this::logCommandStart);
    Autos.registerEventTriggers(); // once, for the whole program

    // ...
  }
```

The path side is already done: `TwoCorners.json` has had this element since
section 5.

*Nothing to add — this is already in your path file:*

```json
    {
      "type": "event_trigger",
      "t_ratio": 0.8,
      "lib_key": "shoot"
    },
```

`t_ratio` places it 80% of the way along the segment it sits in — the second
leg, from (6, 3) to (6, 6) — the same fraction-of-segment idea rotations use.

> **A misspelled `lib_key` won't crash.** B-Line looks the name up when the robot
> reaches the marker, not when the path loads, and an unknown key just logs
> `FollowPath: Unregistered event trigger key: Shoot` and keeps driving. So if a
> marker never seems to fire, check the console for that line before you go
> hunting in the geometry.

That's the last piece of `Autos`.

*Nothing to add — this is the whole file, assembled so you can check it:*

```java
package first.robot.commands;

import org.wpilib.command3.Command;
import org.wpilib.math.controller.PIDController;
import org.wpilib.telemetry.Telemetry;

import first.robot.Constants.PathConstants;
import first.robot.subsystems.Drivetrain;
import first.robot.subsystems.Localizer;
import frc.robot.lib.BLine.commands.FollowPath;
import frc.robot.lib.BLine.following.DriveType;
import frc.robot.lib.BLine.path.Path;

public final class Autos {
  private Autos() {} // utility class — never instantiated

  /** Drive 1 m, turn to 90°, drive 1 m more. */
  public static Command driveTurnDrive(Drivetrain drivetrain) {
    return Command.noRequirements(coroutine -> {
          coroutine.await(drivetrain.driveDistance(1.0));  // step 1: forward 1 meter
          coroutine.await(drivetrain.turnToHeading(90));   // step 2: face 90°
          coroutine.await(drivetrain.driveDistance(1.0));  // step 3: forward 1 meter
        })
        .named("Drive Turn Drive");
  }

  /** Everything about following a path that doesn't depend on which path it is. */
  public static FollowPath.Builder makePathBuilder(Drivetrain drivetrain, Localizer localizer) {
    return new FollowPath.Builder(
        DriveType.SWERVE,                  // what kind of drivetrain this is
        drivetrain,                        // the mechanism the command will require
        localizer::getPose,                // where we are (fused, Lesson 14)
        localizer::resetPose,              // how to tell the estimate where we are
        drivetrain::getChassisVelocities,  // how fast we're going, robot-relative
        drivetrain::driveRobotRelative,    // how to make the robot move
        new PIDController(PathConstants.kTranslationP, 0, 0),
        new PIDController(PathConstants.kRotationP, 0, 0),
        new PIDController(PathConstants.kCrossTrackP, 0, 0))
        .withDefaultShouldFlip()           // mirror the path for the red alliance
        .withTelemetry(Telemetry.getTable()); // log what the follower is doing
  }

  /** One drawn path, as a command. The file is deploy/autos/paths/<pathName>.json. */
  public static Command followPath(FollowPath.Builder pathBuilder, String pathName) {
    return pathBuilder.build(new Path(pathName))
        .withPoseReset(); // start by telling the estimate we're at the path's start
  }

  /** Names a path file can fire with lib_key. BLine keeps them for the whole program. */
  public static void registerEventTriggers() {
    // Nothing on this robot can shoot yet, so it just says so in the console.
    FollowPath.registerEventTrigger("shoot", () -> System.out.println("Event: shoot!"));
  }
}
```

---

## 9. Run it

Run `./gradlew simulateJava` and pick **Two Corners** on SimGUI's opmode
selector. Before you enable anything, look at the console: the line
`********** Creating OpMode Two Corners **********` just printed, and that's the
moment your path file was read. Pick **Far Side** and it prints again for that
one. Pick **Two Corners** back, then set state to **Enabled**.

Then watch it the way you've watched every closed-loop lesson since Lesson 5 —
asked-for against measured. Open AdvantageScope's **Odometry** tab, put
`Localizer/Pose` on the field, and look for the robot tracing an actual shape:
out along X, turning up the second leg just before the corner, coming around to
90° partway up, settling at (6, 6) facing 180°. In this course's sim that takes
about 4 seconds, and `Event: shoot!` shows up in the console about 80% of the way
up the second leg. The robot finishes within the tolerances in `config.json`
— within 5 cm and 2°, so don't be surprised to read 178.3° rather than 180°.

Add `Drivetrain/SimulatedPose` — Lesson 16's ground truth — to the same field.
Now you can see the whole story at once: the line you drew, where the robot
thinks it is, and where it actually is. They should sit within a couple of
centimeters of each other the whole way.

Then plot B-Line's own view of the job. `FollowPath/crossTrackError` is the
cross-track loop's error — how far off the line the robot is — and
`FollowPath/remainingPathDistanceMeters` is the translation loop's. Watch the
cross-track error jump to about half a meter right at the corner: that's the
0.5 m handoff radius, since the robot is still on the first leg's line when it
starts measuring against the second's. Then watch it shrink back toward zero as
the cross-track loop pulls the robot onto the second leg. Nothing told the
follower it was off the line. Correcting is the only thing it ever does.

> **Leave the sim's alliance on blue (or unset).** With `withDefaultShouldFlip()`,
> choosing a red alliance station flips the whole path to the red end of the
> field — and resets the estimate there — while the simulated robot is still
> parked at the blue start. The estimate and the truth then disagree by most of
> a field, and in this course's sim the robot drives off the edge of the world.
> On a real field that can't happen, because a person puts the robot at the red
> start. Try It #6 shows the sim version of that.

---

## Try it

1. **Add a third path.** Draw or hand-write one, then make it selectable. It
   should be one new JSON file and one new opmode whose constructor is a single
   `Autos.followPath(robot.pathBuilder, "YourPath")` line — if you find yourself
   building a second `FollowPath.Builder`, re-read section 6.
2. **Break the arithmetic on purpose.** First, predict: what does setting
   `default_intermediate_handoff_radius_meters` to `0.05` do to the corners —
   tighter, or wider? Run it and see. (In this course's sim the robot swings
   about half a meter past the first corner instead of 5–12 cm, and takes half a
   second longer. A later handoff means the robot drives into the corner at full
   speed before it starts turning.) Put it back, then raise
   `default_max_velocity_meters_per_sec` to `3.0`. Section 5's arithmetic says
   the robot can't stop in time from 3 m/s; watch it sail roughly 30 cm past the
   end and come back, and about 60 cm past the first corner. Then change the
   acceleration so the arithmetic works again, and check that it does.
3. **Mistune the cross-track gain.** Set `kCrossTrackP` to `0.0` and run the path.
   The robot still gets to the end, because translation and rotation are handling
   themselves — but it swings about half a meter wide at the corner, because
   nothing is pulling it back onto the second leg. Then try `15.0`: it
   swings back and forth across the line near the end — about a third of a
   meter each way, a full swing every second or so — and never finishes.
   It's still swinging 30 seconds later. Plot
   `FollowPath/crossTrackError` for both. This is the clearest single-loop demo
   in the whole course, because you can see exactly which job that one
   controller was doing.
4. **Compose a path with a script.** Make an auto that follows `TwoCorners` and
   *then* runs Lesson 8's `turnToHeading(0)`. A library-built command and one
   you wrote are both just `Command`s, so Lesson 9's
   `Command.noRequirements(coroutine -> { ... })` with two `coroutine.await(...)`
   calls is all it takes.
5. **Give the marker a real job.** In `registerEventTriggers`, swap the
   `System.out.println` for something you can plot —
   `Telemetry.log("Auto/ShootFired", true)`, say — and confirm on the plot
   that it fires where you placed it. Then move the `t_ratio` in the path file
   and watch the timing move with it.
6. **Run it on red — properly.** The callout in section 9 says the robot has to
   actually *be* at the red start. So put it there: change `kSimStartingPose`
   to the mirrored pose, `new Pose2d(16.54 - 3, 8.07 - 3,
   Rotation2d.fromDegrees(180))`, pick a red alliance station in SimGUI, and run
   Two Corners. It should trace the same shape rotated half a turn and finish
   near (10.54, 2.07) facing 0°. Put `kSimStartingPose` back when you're done.

---

## What you learned

Autonomous stopped being a script. A path is a shape now — points in field
coordinates, saved in a file you can redraw between matches — and the robot's job
changed from "perform these moves in order" to "find the nearest point on that
shape and chase it." That's why drifting off the line no longer ruins the auto:
correcting is the only thing the follower ever does.

That switch is only possible because of what Lesson 14 built. Chasing a line
requires knowing where you are, continuously and honestly, and a fused estimate
is what makes "am I on the line?" a question with an answer. Three lessons of
localization work cashed in here.

**`PIDController`** finally put a name on the arithmetic you'd written three
times, and using three of them at once made a point that one never could:
following a path is not one problem. Distance-to-go, heading, and drift off the
line are genuinely separate jobs, and giving each its own loop with its own gain
is what lets you tune them independently — which is exactly what Try It #3 lets
you feel.

If one thing from this lesson sticks, make it section 5's arithmetic. A speed
limit in a config file isn't a preference. Whether the robot can stop where you
asked is two lines of math — where the loop starts slowing, and how far it takes
to stop — and you can do that math before the robot ever moves.

Two habits from this lesson outlive B-Line entirely. **Build the unchanging thing
once** — the `FollowPath.Builder` describes how your robot follows a line, which
is the same for every path, so one builder in `Robot` serves all of them. And
**notice *when* your code runs, not just what it does**: putting the path in the
opmode's constructor means the file is read when the auto is *selected*, while
everyone is still standing behind the glass, instead of in the first seconds of
the match.

Underneath all of it the old shapes kept holding. Lesson 16's kinematics-backward
loop got a name and a second caller. `resetPose` from Lesson 14 got called by
B-Line instead of by you. And a **method reference** turned out to work just as
well for handing over a verb (`drivetrain::driveRobotRelative`) as it did for
handing over a value back in Lesson 2. The only genuinely new plumbing was two
small public doors on `Drivetrain` — deliberate, named, and narrow.

The drivetrain half of this course is done. Your robot drives itself along drawn
paths, knows where it is from three kinds of evidence, and lives in a simulated
world with real limits on grip. What it doesn't have is anything to *do* when it
arrives. That's next.

Next: [Lesson 18 — Scoring elevator: holding a position, not just reaching one](18-elevator.md).
