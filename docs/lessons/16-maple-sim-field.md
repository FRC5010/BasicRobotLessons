# Lesson 16 — maple-sim: give the simulation a world

**Goal:** Replace the four independent `DCMotorSim`s with a real physics engine —
one chassis with mass, wheels that grip and slip, walls that push back, and game
pieces you can shove around — without changing a single line above the IO layer.

**New Java concepts**
- **Callbacks** — you write the method, the library decides when to call it
- An **anonymous class with a body** — Lesson 13's `new ModuleIO() {}` had
  nothing in it; this one does the work

**New robot concepts**
- **`SimulatedArena`** — one shared physics world holding the field, the game
  pieces, and every robot on it
- **`DriveTrainSimulationConfig`** — describing the robot's real mass, bumpers,
  and tires instead of one made-up inertia number
- **Wheel grip and skidding** — odometry that drifts because the wheels
  genuinely slip, not because you faked it
- **Ground truth** — the first time simulation can tell you where the robot
  *really* is

---

## 1. Four motors in an empty universe

Here's the picture worth correcting before anything else, because it's been
quietly wrong since Lesson 4: *your simulation does not model your robot.* It
models four drive motors and four steering motors, each spinning a small
flywheel, each in its own private universe where nothing else exists. Module 0
has never once been aware that module 1 is bolted to the same frame. The chassis
has no mass. The tires have no grip. The field has no walls.

You've been getting away with it because everything downstream of the encoder
can't tell the difference — that was Lesson 4's whole promise, and it held. But
look at what the course has had to fake as a result. Lesson 13's Try it asked
you to multiply `drivePositionMeters` by `1.1` to pretend a wheel slipped.
Lesson 14 asked you to do it *again*, because there was no other way to make the
pose drift and watch vision pull it back. Both times you were hand-forging a
symptom that a real robot produces for free, because real wheels skid on real
carpet when you ask them for more force than the tire can deliver.

That's what **maple-sim** changes. It's a physics engine — rigid bodies,
collisions, friction — with an FRC field already built into it. Your robot
becomes a body with mass and bumpers, sitting on tires with a coefficient of
friction, on a field with boundaries. Drive into a wall and you stop. Accelerate
harder than the tires can grip and you skid, and your odometry quietly lies
about it, exactly the way it would at a competition.

The best part is what *doesn't* change. `SwerveModule`, `Drivetrain`,
`Localizer`, every command, every log key: untouched. All of this happens
underneath the IO layer you built in Lesson 13, and that's not a happy accident
— it's the specific thing that boundary was for.

---

## 2. Install maple-sim

Same ritual as AdvantageKit in Lesson 3 and PhotonLib in Lesson 15. Open the
vendor dependency manager (Ctrl+Shift+P → **WPILib: Manage Vendor Libraries** →
**Install new library (online)**) and paste:

```
https://shenzhen-robotics-alliance.github.io/maple-sim/vendordep/maple-sim.json
```

Rebuild to confirm: `./gradlew build`.

> maple-sim moves fast and its docs carry a beta notice. If a class or method
> name below doesn't autocomplete, check the
> [maple-sim docs](https://shenzhen-robotics-alliance.github.io/maple-sim/) for
> the current spelling — the same standing advice the README gives for Phoenix.

---

## 3. Describe the robot to the physics engine

A `DCMotorSim` needed one number about your robot: a moment of inertia you
guessed. A physics engine needs to know what the robot actually *is* — how heavy
it is, how big its bumpers are, how far apart the wheels sit, and how well the
tires grip. Most of those numbers are already in `DriveConstants`. The rest are
new.

**Add to `DriveConstants` in `Constants.java`:**

```java
  // Physical facts a physics engine needs that pure motor math never did.
  public static final Mass kRobotMass = Kilograms.of(45);          // with battery and bumpers
  public static final Distance kBumperLength = Inches.of(30);      // front-to-back, over bumpers
  public static final Distance kBumperWidth  = Inches.of(30);      // side-to-side, over bumpers
  public static final Distance kWheelRadius  = Meters.of(kWheelDiameterMeters / 2);

  /** Where the simulated robot is placed on the field at startup. */
  public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
```

`kWheelRadius` is Lesson 10's Units habit doing its gradual thing: the old
`kWheelDiameterMeters` double stays exactly where it is, still feeding
`kWheelCircumferenceMeters` and every conversion built on it, and the new typed
constant is *derived* from it — compute in doubles, wrap the answer. One source
of truth, two shapes. (`Mass` and `Distance` come from
`edu.wpi.first.units.measure`; `Kilograms`, `Inches`, and `Meters` come from the
static Units import already at the top of the file since Lesson 10. `Pose2d` and
`Rotation2d` need `edu.wpi.first.math.geometry` — let `Ctrl+.` do it.)

Measure the bumper numbers on your real robot if you have one. They're not
decoration: they're the shape that will collide with walls, so a robot described
as 30 inches wide will stop 30 inches from the wall whether or not that's true.

---

## 4. Build the world — one chassis, four modules

Now the object that ties it together. A **`SwerveDriveSimulation`** is your
robot's body in the physics world: one rigid body, four module simulations
hanging off it, one gyro. It gets built once and registered into the shared
arena.

Where should it live? It can't belong to any one module — all four modules are
parts of the *same* body, and each needs a reference to its own corner of it.
That's exactly the situation Lesson 15 met with `VisionSystemSim`, and the answer
is the same word: **`static`**. One copy owned by the class, not one per
instance.

**Add to `Drivetrain`, above the `m_modules` field:**

```java
  /** The chassis's body in the physics world — one, shared by all four modules. */
  private static final SwerveDriveSimulation m_driveSim = createDriveSim();
```

**Add to `Drivetrain`, next to `makeModule`:**

```java
  /** Builds the simulated chassis and puts it on the simulated field. Sim only. */
  private static SwerveDriveSimulation createDriveSim() {
    if (Constants.kCurrentMode != Constants.Mode.SIM) {
      return null; // a real robot already has a world; replay doesn't need one
    }

    DriveTrainSimulationConfig config = DriveTrainSimulationConfig.Default()
        .withRobotMass(DriveConstants.kRobotMass)
        .withBumperSize(DriveConstants.kBumperLength, DriveConstants.kBumperWidth)
        .withTrackLengthTrackWidth(
            Meters.of(DriveConstants.kHalfLength * 2),
            Meters.of(DriveConstants.kHalfWidth * 2))
        .withGyro(COTS.ofPigeon2())
        .withSwerveModule(new SwerveModuleSimulationConfig(
            DCMotor.getKrakenX60(1),        // drive motor
            DCMotor.getKrakenX60(1),        // steer motor
            DriveConstants.kDriveGearRatio,
            SteerConstants.kSteerGearRatio,
            Volts.of(0.1),                  // volts needed to break drive friction
            Volts.of(0.2),                  // volts needed to break steer friction
            DriveConstants.kWheelRadius,
            KilogramSquareMeters.of(0.03),  // steering inertia
            COTS.WHEELS.COLSONS.cof));      // how hard the tires grip

    SwerveDriveSimulation sim =
        new SwerveDriveSimulation(config, DriveConstants.kSimStartingPose);
    SimulatedArena.getInstance().addDriveTrainSimulation(sim);
    return sim;
  }
```

Read the config as a description of a robot rather than a pile of settings.
`DriveTrainSimulationConfig.Default()` starts from a plausible FRC robot and the
`.withX(...)` calls correct it toward *yours* — a chain of small overrides, each
returning the config so the next one can keep going. Half the numbers you handed
it are constants you've had since Lesson 6 and 7: the gear ratios, the wheel
radius, the track dimensions built from `kHalfLength` and `kHalfWidth`. The
physics engine wants the same facts your conversions have always wanted; it just
wants more of them.

Two of the new ones matter more than they look. **`COTS.WHEELS.COLSONS.cof`** is
the tires' coefficient of friction — the number that decides when a wheel stops
pushing the robot and starts skidding, which is the mechanism behind every
odometry error you're about to see. And the friction voltages say how much
voltage it takes just to start something moving; that's why a real mechanism
ignores a tiny command instead of creeping.

Now `null`, because it's doing real work here. On a real robot there is no
simulated world — and `SimulatedArena.getInstance()` will actually throw if you
ask for one — so `createDriveSim` bails out early and the field stays empty. That
sounds fragile until you notice who reads it: only code paths that run in `SIM`,
which is exactly where it isn't null. **A field that's null in one mode is fine
as long as only that mode's code touches it** — and the mode switch you built in
Lesson 13 is what guarantees that.

**Add to `Drivetrain`'s imports:**

```java
import static edu.wpi.first.units.Units.KilogramSquareMeters;
import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.Volts;

import org.ironmaple.simulation.SimulatedArena;
import org.ironmaple.simulation.drivesims.COTS;
import org.ironmaple.simulation.drivesims.SwerveDriveSimulation;
import org.ironmaple.simulation.drivesims.configs.DriveTrainSimulationConfig;
import org.ironmaple.simulation.drivesims.configs.SwerveModuleSimulationConfig;

import edu.wpi.first.math.system.plant.DCMotor;
import frc.robot.Constants.SteerConstants;
```

---

## 5. The bridge: your voltage for their motion

This is the heart of the lesson, and it's Lesson 4's loop turned inside out.

Lesson 4 had you write four steps, in order, every tick: read the voltage the
TalonFX is applying, push it into the model, step the model, push the resulting
motion back into the fake encoder. *You* drove that loop. The physics was your
private property, sitting inside `simulationPeriodic()`, and you called it.

maple-sim can't work that way. It steps the whole world — every robot, every
game piece, five sub-steps per tick — and it needs the voltage from your motor
at each of those sub-steps, not once per tick when you happen to feel like
offering it. So the relationship flips: instead of your code calling the physics,
**the physics calls your code.**

```
Lesson 4:  you ask the motor for volts  →  you step the model  →  you push motion back
Lesson 16: the engine asks you for volts  →  it steps the world  →  it hands you motion
```

Code you write that a library calls, at a time the library chooses, is a
**callback** — and it's one of the most common shapes in real software. The
contract is an interface with one method,
`SimulatedMotorController.updateControlSignal(...)`: it hands you where the
mechanism is and how fast it's going, and you hand back the voltage your motor
controller wants to apply right now. That's the entire conversation, and it's
enough, because your TalonFX is still the one running the control loops — Lesson
12's configs and gains, untouched, doing exactly what they'd do on a real robot.

**Replace the whole contents of `ModuleIOSim.java` with:**

```java
package frc.robot.subsystems;

import static edu.wpi.first.units.Units.Rotations;
import static edu.wpi.first.units.Units.RotationsPerSecond;
import static edu.wpi.first.units.Units.Volts;

import org.ironmaple.simulation.drivesims.SwerveModuleSimulation;
import org.ironmaple.simulation.motorsims.SimulatedMotorController;

import com.ctre.phoenix6.sim.CANcoderSimState;
import com.ctre.phoenix6.sim.TalonFXSimState;

import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Voltage;
import edu.wpi.first.wpilibj.RobotController;

public class ModuleIOSim extends ModuleIOTalonFX {
  private final TalonFXSimState m_driveSim;
  private final TalonFXSimState m_steerSim;
  private final CANcoderSimState m_steerEncoderSim;

  public ModuleIOSim(
      int driveId, int steerId, int cancoderId, double magnetOffsetRotations,
      SwerveModuleSimulation moduleSim) {
    super(driveId, steerId, cancoderId, magnetOffsetRotations); // motors, CANcoder, configs
    m_driveSim = m_driveMotor.getSimState();
    m_steerSim = m_steerMotor.getSimState();
    m_steerEncoderSim = m_steerEncoder.getSimState();

    // Drive: the engine asks what we're applying; we answer, and take its motion.
    moduleSim.useDriveMotorController(new SimulatedMotorController() {
      @Override
      public Voltage updateControlSignal(
          Angle mechanismAngle, AngularVelocity mechanismVelocity,
          Angle encoderAngle, AngularVelocity encoderVelocity) {
        m_driveSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_driveSim.setRawRotorPosition(encoderAngle.in(Rotations));
        m_driveSim.setRotorVelocity(encoderVelocity.in(RotationsPerSecond));
        return Volts.of(m_driveSim.getMotorVoltage());
      }
    });

    // Steer: the same trade, plus the CANcoder — which reads the wheel, not the rotor.
    moduleSim.useSteerMotorController(new SimulatedMotorController() {
      @Override
      public Voltage updateControlSignal(
          Angle mechanismAngle, AngularVelocity mechanismVelocity,
          Angle encoderAngle, AngularVelocity encoderVelocity) {
        m_steerSim.setSupplyVoltage(RobotController.getBatteryVoltage());
        m_steerSim.setRawRotorPosition(encoderAngle.in(Rotations));
        m_steerSim.setRotorVelocity(encoderVelocity.in(RotationsPerSecond));
        m_steerEncoderSim.setRawPosition(mechanismAngle.in(Rotations));
        m_steerEncoderSim.setVelocity(mechanismVelocity.in(RotationsPerSecond));
        return Volts.of(m_steerSim.getMotorVoltage());
      }
    });
  }
}
```

That's the entire class. Look at what left: both `DCMotorSim` fields, the
`stepSim()` method, and the `updateInputs` override that used to call it. The
override is the interesting deletion — with it gone, `ModuleIOSim` inherits
`ModuleIOTalonFX.updateInputs` unchanged, which reads the TalonFXs exactly the
way the real robot does. It works because the sim states those reads consult are
being fed by the callbacks above. **Deleting the override is the point, not a
side effect**: the sim class now adds physics and *nothing else*, which is what
Lesson 13 claimed the shape was for.

`new SimulatedMotorController() { ... }` is an **anonymous class**, the same
syntax as Lesson 13's `new ModuleIO() {}` — except that one deliberately
overrode nothing, and this one exists entirely for its body. Same tool, opposite
purpose: there's no reason to give this class a name, because it's used once, at
the spot where it's written.

Now the four parameters, because getting them backwards is the one way to break
this quietly. **`encoderAngle` is rotor-side, `mechanismAngle` is mechanism-side**
— the same distinction you've been converting between by hand since Lesson 6's
gear ratio. So the rotor sim states get `encoderAngle`, exactly like the
`* kDriveGearRatio` multiply-backs you used to write, and the CANcoder — which
sits directly on the wheel and reads mechanism rotations — gets `mechanismAngle`,
with no gear multiply, precisely as Lesson 12 explained when it first fed that
sim state.

And notice what closes the loop: `getMotorVoltage()` is the *result* of the
Lesson 12 closed loop running inside Phoenix's simulated firmware, on the numbers
we just handed it. Your `PositionVoltage` request, your `Slot0` gains, your
`ContinuousWrap`, your `RemoteCANcoder` feedback — all of it still runs, and its
output is what the physics engine now pushes the robot with. The simulation got
more real without your control code learning anything new.

**Finally, give the modules their corner of the chassis. Edit `makeModule`'s
`SIM` arm in `Drivetrain`:**

```java
      case SIM -> new ModuleIOSim(
          driveId, steerId, cancoderId, magnetOffsetRotations,
          m_driveSim.getModules()[index]);
```

`makeModule` already took an `index` for its log key; now that number does a
second job, picking this module's body out of the four the chassis simulation
built. Keep the array order honest — `getModules()` hands them back in the order
your config's corners were laid out, which is the FL, FR, BL, BR order you've
kept since Lesson 7.

---

## 6. The gyro stops pretending

Lesson 8 gave you a fake gyro that integrated the rotation rate you *commanded*:
add `omega × dt` every tick and call it a heading. It was a reasonable lie. Its
flaw is that a robot which is commanded to spin always spins, exactly as much as
asked — pin that robot against a wall and its heading keeps climbing anyway.

The physics engine knows better, because it's the thing actually rotating the
body. maple-sim's `GyroSimulation` reports the heading of the real simulated
chassis, with drift and measurement error, and it will *lose* heading if you take
a hit — which is the honest behavior, and the reason Lesson 12 was so insistent
about the CANcoder.

**Replace the whole contents of `GyroIOSim.java` with:**

```java
package frc.robot.subsystems;

import org.ironmaple.simulation.drivesims.GyroSimulation;

public class GyroIOSim implements GyroIO {
  private final GyroSimulation m_gyroSim;

  public GyroIOSim(GyroSimulation gyroSim) {
    m_gyroSim = gyroSim;
  }

  @Override
  public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_gyroSim.getGyroReading().getDegrees();
  }
}
```

That deletion has a tail, and it's the good kind. `m_lastCommandedOmega` and
`m_simHeadingDegrees` are gone, which means nothing in the project has any use
for `setSimRotationRate` anymore — the whole reason that method existed was to
feed an integration that no longer happens.

**Delete `setSimRotationRate` from the `GyroIO` interface:**

```java
  // DELETE — nothing integrates a commanded rate anymore; the physics engine
  // rotates the robot and the gyro just reports it.
  public default void setSimRotationRate(double omegaRevPerSec) {}
```

**Delete both calls to it in `Drivetrain`** — one near the bottom of
`applyChassisSpeeds`, one in `driveDistance` where it zeroed the rate:

```java
  // DELETE from applyChassisSpeeds:
  m_gyroIO.setSimRotationRate(speeds.omegaRadiansPerSecond / (2 * Math.PI));

  // DELETE from driveDistance:
  m_gyroIO.setSimRotationRate(0.0);
```

**Then hand the sim gyro its simulation. Edit the gyro switch in `Drivetrain`:**

```java
  private final GyroIO m_gyroIO = switch (Constants.kCurrentMode) {
    case REAL -> new GyroIOPigeon2();
    case SIM -> new GyroIOSim(m_driveSim.getGyroSimulation());
    case REPLAY -> new GyroIO() {}; // inputs come from the log
  };
```

Three files got shorter and the robot got more honest. That trade shows up
often enough that it's worth expecting: code that exists to fake something is
code you delete when you can afford the real thing.

---

## 7. Step the world

Something has to advance the physics, and for the first time in this course it
isn't a subsystem's job. The arena isn't the drivetrain's property — it holds the
field, the game pieces, and eventually other robots. It belongs to the program,
so it gets stepped in `Robot.java`.

**Add to `Robot.java`:**

```java
  @Override
  public void simulationPeriodic() {
    SimulatedArena.getInstance().simulationPeriodic();
  }
```

**Add the import:**

```java
import org.ironmaple.simulation.SimulatedArena;
```

One call, once per tick. Internally it runs five sub-steps for every robot
period — that's how a 50 Hz robot gets collisions that don't tunnel through
walls — and each of those sub-steps is where your callbacks from section 5 get
invoked. `simulationPeriodic()` only runs in simulation, which is the whole
reason this is safe: on a real roboRIO this method never fires, and the physics
engine never wakes up.

Yes, Lesson 13 ended by deleting every `simulationPeriodic()` in the project and
declaring that sim code belongs inside IO implementations. This is the deliberate
exception, and the distinction is worth holding onto: **an IO class owns one
device's pretend hardware; the arena is the world all of them share.** Shared
world state doesn't belong to any one of them.

---

## 8. Run it: walls that push back

One loose end first. The simulated chassis starts at `kSimStartingPose`, but your
`Localizer` starts at `(0, 0, 0°)`, because odometry has no idea where it was
switched on. Left alone, you'd watch two robots in different places and doubt
your own code.

**Add to the `RobotContainer` constructor:**

```java
    if (Constants.kCurrentMode == Constants.Mode.SIM) {
      m_localizer.resetPose(DriveConstants.kSimStartingPose);
    }
```

(No new imports for that one. `DriveConstants` has been imported since Lesson 7,
and `Constants` itself needs no import at all — `RobotContainer` lives in the
same `frc.robot` package, so it's already in scope. Classes in the same package
can always see each other; that's what a package *is*.)

That's Lesson 11's "autos start from a known place," applied to the simulator:
anchor the estimate to the truth once, at the start, and every difference after
that is real error rather than a bookkeeping mismatch.

Now run it. `./gradlew simulateJava` → **Teleoperated**, and drive.

The first thing you'll feel is weight. The robot doesn't reach commanded speed
instantly anymore, because 45 kilograms have to be accelerated by whatever force
four tires can put down. Push the stick to full and let go — it coasts.

Then drive straight at a field boundary and hold the stick down. The robot
stops. Not a number clipping somewhere in your code; a body hitting a wall.
Wheels keep spinning, the robot goes nowhere, and your odometry cheerfully
reports that you're still making progress — which is the single most useful lie
this lesson will show you, and section 9 is about watching it happen.

---

## 9. Ground truth, and drift you didn't have to fake

Every pose this course has ever drawn has been an *estimate* — odometry's best
guess, later fused with vision. There was never anything to check it against,
because in the old sim there was no fact of the matter: the robot's "real"
position was itself computed from the same encoders.

That changed in section 4. The physics engine tracks where the chassis actually
is, and it will tell you.

**Add to the end of `Drivetrain.periodic()`:**

```java
    if (m_driveSim != null) {
      Logger.recordOutput("Drivetrain/SimulatedPose", m_driveSim.getSimulatedDriveTrainPose());
    }
```

(The `null` check is section 4's design, being cashed in exactly where promised:
only sim has a simulated pose, so only sim logs one.)

Open AdvantageScope's **Odometry** tab and put both `Localizer/Pose` and
`Drivetrain/SimulatedPose` on the field at once. Now drive like you mean it —
hard accelerations, quick reversals, a spin while translating.

For gentle driving they'll sit on top of each other. Then you'll ask for more
force than the tires can deliver, the wheels will break traction, and the two
robots will separate: the encoders count rotations that never turned into
motion, so the estimate drifts *ahead* of the truth and stays there. Nothing
resets it. Errors accumulate, addition never forgets — which is precisely the
argument Lesson 14 opened with, except this time you're watching it instead of
taking its word.

Then drive along a wall while pressed against it, and watch the estimate slide
away from a robot that isn't moving at all.

If you did Lesson 15, this is also the moment its cameras start earning their
keep against a genuine adversary. Park somewhere a tag is visible after a good
skid and watch `Localizer/Pose` get yanked back toward `Drivetrain/SimulatedPose`.
Odometry for smoothness, vision for truth — with, for the first time, a truth to
compare against.

---

## 10. Game pieces

The field is more than walls. Game pieces are rigid bodies too, and your bumpers
can shove them around.

**Add to `Robot.java`:**

```java
  @Override
  public void simulationInit() {
    SimulatedArena.getInstance().resetFieldForAuto();
  }
```

`resetFieldForAuto()` lays out the current season's pieces the way they'd be
staged at the start of a match. To place one somewhere specific instead, add it
yourself:

```java
    SimulatedArena.getInstance().addGamePiece(new RebuiltFuelOnField(new Translation2d(3, 3)));
```

To see any of it, log it — the same move as every structured value since
Lesson 7's module states.

**Add to `Robot.simulationPeriodic()`, below the arena step:**

```java
    Logger.recordOutput("FieldSimulation/Fuel",
        SimulatedArena.getInstance().getGamePiecesArrayByType("Fuel"));
```

`getGamePiecesArrayByType` hands back a `Pose3d[]` — one pose per piece, in 3D
because pieces get knocked into the air. Drop that key onto your Odometry tab
next to the robot and drive through the middle of a cluster. They scatter, they
bounce off each other, they settle. Your robot is playing with objects that
exist.

Nothing intakes them yet — a bumper can only push. Giving the robot something
that *picks a piece up* needs a mechanism, and that's where the next stretch of
the course goes.

---

## Try it

1. **Hit a wall and lose your heading.** Drive into a boundary at speed at an
   angle, so the robot spins off it. Plot `Drivetrain/Gyro/YawDegrees` against
   the rotation of `Drivetrain/SimulatedPose` before and after the hit. Lesson 8's
   fake gyro could never have done this — explain in one sentence why not.
2. **Make the tires slick.** Swap `COTS.WHEELS.COLSONS.cof` for a lower number
   (try `0.7`) and repeat section 9's hard driving. The estimate should peel away
   from ground truth far faster. Put it back, then go delete the fake `1.1` wheel
   slip from Lesson 13's Try it if it's still lurking in `ModuleIOTalonFX` — you
   have the real thing now.
3. **Let vision see the truth.** Lesson 15 fed `VisionIOPhotonVisionSim` from
   `m_localizer.getPose()` and admitted it was a compromise: the robot was
   checking its simulated eyesight against its own guess, because no independent
   truth existed. Now one does. Add a `getSimulatedPose()` method to `Drivetrain`,
   and change `RobotContainer`'s camera suppliers to use it instead. Vision
   corrections now come from where the robot *is*, not where it thinks it is —
   which is what a real camera has been doing all along.
4. **Park a piece where you want it.** Use `addGamePiece(...)` to drop three
   pieces in a row in front of the starting pose, then write a short auto (Lesson
   9's `Commands.sequence`) that drives through all three. Watch the logged
   `Pose3d[]` to see where they end up.

---

## What you learned

The simulation finally has a world. Your robot is a body with mass and bumpers,
sitting on tires with a coefficient of friction, on a field with walls and game
pieces that push back — and the number your odometry reports is no longer the
only version of events, because **ground truth** exists now and you can plot the
gap. Drift stopped being something you faked with a `1.1` multiplier and became
something the tires do to you when you ask for more than they can give.

The Java idea underneath it is **callbacks**, and it's worth carrying forward.
Up to now, your code called libraries: you asked `DCMotorSim` to step, you asked
the TalonFX for its voltage. Here the direction reversed — you handed maple-sim a
method and it decided when to run it, five times per tick, inside its own loop.
That inversion is everywhere in real software, and the **anonymous class** from
Lesson 13 turned out to be exactly the right way to write one: a class with no
name, used once, right where it's needed.

But the thing actually worth stopping on is what *didn't* happen. An entire
physics engine replaced the guts of this robot's simulation, and `SwerveModule`
never heard about it. Neither did `Drivetrain`'s commands, `Localizer`, your
kinematics, your autos, or a single log key. The changes fit inside
`ModuleIOSim` and `GyroIOSim` — the two classes whose whole job is *being the
world the code wakes up in* — because Lesson 13 drew the boundary in the right
place. That's the return on architecture: you don't feel it when you build it,
and then one day a change that should have touched forty files touches two.

Next: [Lesson 17 — B-Line autos: waypoints and trajectories](17-bline-autos.md).
