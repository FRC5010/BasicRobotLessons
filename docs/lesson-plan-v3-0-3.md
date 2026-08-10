# Lesson plan: v3 track, Lessons 0–3

A detailed plan for the first four lessons of the OpMode + coroutine-commands
track. **This is a contributor document, not lesson content** — it lives
beside `docs/lessons/`, never inside it, and nothing here should be pasted
into a lesson as-is. When these lessons are actually written, their prose
goes under **`docs/lessons/v3/`** (e.g. `docs/lessons/v3/00-orientation.md`),
per the layout decided in
[docs/lesson-plan-opmode-restructure.md](lesson-plan-opmode-restructure.md).

This doc inherits every decision recorded there: `code/OpModeV3Robot` now
ships `CommandsV3.json` (not V2); the rename to `RobotTeleop`/`RobotAuto`
happens at the lesson that introduces autonomous (today's Lesson 9), so all
four lessons here still say `MyTeleop`/`MyAuto`; autonomous selection will
lean on multiple `@Autonomous` opmodes once there's more than one routine;
controller bindings use `CommandGamepad`'s generic naming
(`southFace()/eastFace()/westFace()/northFace()`), not any Xbox-specific
method names; and — the change that unblocks this whole doc — telemetry uses
`org.wpilib.epilogue`'s `EpilogueBackend` directly instead of AdvantageKit's
`Logger`, per the team's 2026-08-10 decision to proceed without replay for
now and add it back in a later pass. See
[Telemetry without AdvantageKit](lesson-plan-opmode-restructure.md#telemetry-without-advantagekit-epilogue)
for the full design this lesson's rewrite is built on.

Each lesson section below was checked against the actual old-course lesson
file it replaces (`docs/lessons/0N-*.md`), not written from a summary of it —
same rule as everywhere else in this repo: verify before drafting.

---

## Status

| # | Working title | Builds on | Vendor deps | Status |
|---|---|---|---|---|
| 0 | Orientation | none | none | Ready to write |
| 1 | Your first motor | L0 | Phoenix 6 (`Phoenix6-26.50.0-alpha-1.json`) | Ready to write — one API detail needs a live-jar check, see below |
| 2 | Joystick control | L1 | none new | Ready to write |
| 3 | Telemetry & plots | L2 | none (Epilogue ships with core WPILib) | Ready to write — uses `EpilogueBackend` directly; real replay deferred to a later pass |

All four lessons are ready to write. Lesson 3 was blocked on AdvantageKit's
missing `OpModeRobot` support; the team decided (2026-08-10) to proceed using
WPILib's own Epilogue telemetry system instead, deferring real replay rather
than waiting on it — see that lesson's section for the design and what's
explicitly deferred.

---

## Lesson 0: Orientation

**Old lesson:** [`docs/lessons/00-orientation.md`](lessons/00-orientation.md) —
classes/packages/methods/statements/semicolons, the `robotPeriodic()` →
`CommandScheduler.getInstance().run()` heartbeat, running sim, printing from
`teleopInit()`.

**What changes structurally:** The old lesson's whole payoff is one idea —
"you don't call these methods, WPILib does, on its own schedule" — landing on
a single heartbeat in one `Robot` class. The v3 track has to teach a *second*
layer on top of that: not just "the framework calls your methods," but
"*which* methods it calls depends on what's selected on the Driver Station."
That's a real addition, not a rename, and it's worth the same "pair the right
mental model with the wrong one" treatment `CLAUDE.md`'s rewrite guidance
already asks for: the wrong model here is "one `Robot` class runs the whole
match," which the old course's Lesson 0 quietly reinforces (accurately, for
that stack) and this lesson has to explicitly retire.

**New Java concepts:** classes, packages, methods, statements/semicolons
(unchanged from old L0) — plus **annotations**, at least at
recognition level. `@Teleop` is sitting right there in `MyTeleop.java` before
the student has typed a single line, so it needs a name even though its full
meaning waits for Lesson 1 ("a tag that tells the framework 'find this class
and offer it on the Driver Station' — you'll write your own uses of
`@Override` in a minute, and this is the same idea: a label the framework
reads").

**New robot concepts:**
- **Opmodes** as the unit of "what the robot does right now" — see the
  master plan's [OpMode fundamentals](lesson-plan-opmode-restructure.md#opmode-fundamentals)
  section for the exact lifecycle to teach: constructed on selection,
  `disabledPeriodic()` while selected+disabled, `start()` once on enable,
  `periodic()` every tick while enabled, `end()`/`close()` on deselect —
  object never reused.
- **SystemCore**, named honestly here for the first time (this is the deploy
  target `code/OpModeV3Robot/build.gradle` already declares) but not dwelt
  on — a one-line acknowledgment, not a hardware-differences lecture. That
  lecture doesn't belong in Lesson 0 any more than "what's inside a roboRIO"
  belonged in the old course's Lesson 0.

**Walkthrough outline:**
1. Tour the same four-ish files, updated for the new layout: `Main.java`
   (still "never touch it"), `Robot.java` (now much thinner than old
   `Robot.java` — no `teleopInit`/`autonomousInit`, just the two overrides the
   scaffold ships), and the `opmode/` package holding `MyTeleop.java` and
   `MyAuto.java`. Name the shift directly: old `Robot.java` *was* the whole
   match; new `Robot.java` boots the framework and gets out of the way, and
   the opmode classes are where match behavior actually lives.
2. Point at `@Teleop` / `@Autonomous` sitting above `MyTeleop`/`MyAuto` and
   say what they do (auto-registration, no manual wiring call anywhere) — the
   payoff of the annotation concept introduced above.
3. Run it (`./gradlew simulateJava`), open SimGUI, and — this is new relative
   to old L0 — **pick an opmode** before anything runs. Old L0 only had to
   flip Disabled → Teleoperated; this lesson also has to show the opmode
   selector and explain that nothing in `MyTeleop.periodic()` runs at all
   until "My Teleop" is chosen, disabled or not.
   *Needs a live-sandbox pass to write accurately — the exact SimGUI/DS panel
   layout for opmode selection in this alpha hasn't been seen, only read
   about. Don't guess at panel names; drive the real sandbox once R1's
   blocker on Lesson 3 doesn't block Lessons 0–2 from being verified.*
4. First code change, same beat as old L0: add a print inside
   `MyTeleop.start()` (the "runs exactly once, on enable" hook — closer to
   old L0's `teleopInit()` than `periodic()` would be, since `periodic()`
   would spam the console 50 times a second and old L0 deliberately picked
   the once-per-transition hook). Rebuild, select My Teleop, enable, watch
   the terminal.
5. Briefly show `MyAuto` exists too and is still empty — planting the seed
   for Lesson 1 without doing anything with it yet, same as old L0 leaves
   `subsystems/`/`commands/` untouched until L1.

**Try it (mirrors old L0's two exercises):**
1. Print a *different* message from `MyAuto`'s equivalent hook, and confirm
   it only fires when "My Auto" is the selected opmode — same exercise as old
   L0's autonomousInit print, but now the proof is "different opmode" instead
   of "different DS mode."
2. Same semicolon-breaking exercise, unchanged — this part of Java hasn't
   moved.

**Open items:** the exact SimGUI/DS opmode-selection UI (flagged above) is
the only unverified piece; everything else is read directly from
`OpMode`/`PeriodicOpMode`/`OpModeRobot` source with high confidence.

---

## Lesson 1: Your first motor

**Old lesson:** [`docs/lessons/01-first-motor.md`](lessons/01-first-motor.md) —
installs Phoenix 6, teaches objects/`new`, builds `DriveModule extends SubsystemBase`
(field, constructor, `driveAtSpeed(double)` via `startEnd(...)`, empty
`periodic()`), wires it into `RobotContainer` (field, import,
`m_driverController.a().whileTrue(...)`), runs sim with a joystick dragged
into slot 0.

**What changes structurally, piece by piece:**

- **No `RobotContainer` to wire into.** Old L1's §4 ("wire a button to it")
  edits a file the template already gave the student. The new scaffold has
  no such file — `MyTeleop` itself is where the field, the import, and the
  binding all go. This is actually a small simplification: one file instead
  of two, and no "why does the module live in `RobotContainer` and not
  `DriveModule.java`" question to defer.
- **No pre-declared controller field to discover.** Old L1 meets
  `m_driverController` as something the *template* already wrote — the
  student's job is understanding it, not typing it. The new scaffold ships
  no controller field at all, so the student **constructs** `CommandGamepad`
  themselves, the same way they just constructed the motor. That's one more
  repetition of "field + `new`" instead of one "here's a field, learn to read
  it" — arguably a cleaner lesson, since it's the same idea taught once
  instead of split across two different presentations.
- **`extends Mechanism`, not `extends SubsystemBase`.** Mechanically the same
  move — "this class *is a* thing the scheduler manages" — and `Mechanism`'s
  no-arg constructor self-registers with `Scheduler.getDefault()` exactly the
  way `SubsystemBase` self-registered with `CommandScheduler`, so the
  teaching beat ("this line plugs the class into the heartbeat") carries over
  word for word.
- **`driveAtSpeed` needs a real coroutine-style rewrite, not a mechanical
  rename.** `Mechanism` has no `startEnd(...)` helper — there's no
  two-lambda "run this at start, run that at end" convenience in the V3 API.
  The direct, verified translation uses `Coroutine.park()` (confirmed in
  source: "suspend until interrupted") together with the required
  `.whenCanceled(...)` builder step:

  ```java
  public Command driveAtSpeed(double fraction) {
    return run(coroutine -> {
      m_driveMotor.set(fraction);
      coroutine.park();
    })
    .whenCanceled(() -> m_driveMotor.set(0))
    .named("Drive At Speed");
  }
  ```

  This isn't improvised — it's the exact shape `Mechanism.idle()` itself uses
  internally (`run(Coroutine::park).withPriority(LOWEST_PRIORITY).named(...)`),
  so the lesson can point at the library's own default command as
  confirmation this is idiomatic, not a workaround.
- **The "motors don't stop on their own" callout gets *more* important, not
  less.** Old `startEnd(start, end)` forced both lambdas as required
  constructor arguments — there was no way to call it with only a start.
  `.whenCanceled(...)` is an *optional* step in the V3 builder chain; a
  student can skip it, the code compiles, and the wheel keeps spinning after
  the button's released. The callout needs to say this explicitly: this
  mistake used to be impossible to make by accident, and now it isn't.
- **No empty `periodic()` to plant.** Old L1 ends `DriveModule` with an empty
  `@Override public void periodic() {}`, explicitly "waiting" for Lesson 3's
  telemetry to fill it in. `Mechanism` has no `periodic()` hook at all — see
  [R1 in the master plan](lesson-plan-opmode-restructure.md#risks-and-blocking-unknowns)
  for where per-tick logic goes once it's needed. **Drop this beat entirely
  here** rather than inventing a substitute; there is nothing to plant yet,
  and planting something not-yet-motivated would violate this course's own
  rule against forward-referencing.
- **CAN device construction likely needs a `CANBus` object, not a bus name
  string.** Phoenix 6's SystemCore support introduced `CANBus.systemCore(int busId)`,
  and a documented breaking change in `25.90.0-alpha-2` (before this
  project's pinned `26.50.0-alpha-1`) removed the string-based bus-name
  constructor overloads. The likely real form is something like
  `new TalonFX(1, CANBus.systemCore(0))` rather than old L1's bare
  `new TalonFX(1)`. **This is a guess extrapolated from release notes, not
  read from the jar — verify the actual `TalonFX` constructor overloads
  against the real `Phoenix6-26.50.0-alpha-1` artifact before writing this
  step for real**, the same "read the sources jar" rule `CLAUDE.md` already
  states for this course's existing vendor libraries.

**New Java concepts (unchanged from old L1):** objects, `new`, fields,
constructors, `import`, `private`/`public`.

**New robot concepts:** adding a vendor library (Phoenix 6, via the same VS
Code vendor-library manager — confirm whether alpha vendordeps need an
"include prerelease" toggle switched on, since they wouldn't be in the
default stable list; unverified, needs a live sandbox), the `TalonFX` object,
command factory methods (now coroutine-bodied), binding a gamepad button.

**Walkthrough outline:**
1. Install Phoenix 6 (`Phoenix6-26.50.0-alpha-1.json`) the same way old L1
   installs it — VS Code's vendor manager, or the offline JSON if the manager
   doesn't list alpha releases yet.
2. Objects/`new`, unchanged teaching content from old L1 §2.
3. Build `DriveModule` in `first.robot.subsystems` (mirroring the existing
   `first.robot.opmode` package convention `OpModeV3Robot` already
   establishes), same four-piece build-up old L1 uses (imports → class line +
   field → constructor → behavior), with the `driveAtSpeed` rewrite above
   replacing old L1's `startEnd(...)` version.
4. Wire it into `MyTeleop`: field, import, and the binding, all in one file
   now instead of two. `m_driverController.southFace().whileTrue(m_module.driveAtSpeed(0.3))`
   replaces old L1's `m_driverController.a().whileTrue(...)`.
5. Run it: same joystick-into-slot-0 SimGUI dance as old L1 §5. Whether the
   button-to-index mapping old L1 states ("A is button 1") holds the same
   way for `CommandGamepad`'s generic naming is unverified — flag it and
   confirm from a live sandbox rather than asserting it by analogy.

**Try it (mirrors old L1):**
1. Add `.eastFace()` (the B-button position) driving at `-0.3`, confirming
   the scheduler arbitrates between the two the same way it always has.
2. Change the CAN ID, rebuild, confirm nothing breaks in sim.
3. Move the CAN ID into `Constants.java` under a nested `DriveConstants`
   class — unchanged from old L1's habit-planting exercise.

**Open items:**
- Exact `TalonFX` constructor overloads on SystemCore (flagged above) — the
  single highest-priority thing to verify before writing this lesson for
  real, since it's the first line of code the student types that touches
  real hardware.
- Whether the VS Code vendor-library manager surfaces alpha vendordeps by
  default or needs a setting changed.
- Whether `CommandGamepad`'s button-to-DS-index mapping matches old L1's
  "A is button 1" framing or needs its own statement.

---

## Lesson 2: Joystick control

**Old lesson:** [`docs/lessons/02-joystick-control.md`](lessons/02-joystick-control.md) —
method parameters/return values, `double`, lambdas/`DoubleSupplier`,
`Math.abs`, deadband, default commands. Replaces the fixed `0.3` with a live
stick reading via `run(() -> {...})`, adds `applyDeadband`, sets a default
command in `RobotContainer`.

**What changes structurally:** less than any other lesson in this batch —
this is the clearest evidence for the master plan's claim that "most of what
this course teaches doesn't change." Two real differences:

- **`runRepeatedly(Runnable)` replaces bare `run(Runnable)` as the "call this
  every tick forever" factory.** V2's `run(Runnable)` auto-loops its lambda
  every tick by scheduler convention; V3's `run(Consumer<Coroutine>)` does
  **not** auto-loop — a command body runs once per schedule and controls its
  own looping via `while (...) { coroutine.yield(); }`. `Mechanism.runRepeatedly(Runnable)`
  is confirmed (from source) to wrap exactly that boilerplate
  (`while (true) { loopBody.run(); coroutine.yield(); }`), making it the
  direct, idiomatic replacement — the lesson doesn't need to show the
  hand-rolled `while` loop version at all, the same way old L1 doesn't show
  students the scheduler's internals.

  ```java
  public Command driveWithJoystick(DoubleSupplier speedSupplier) {
    return runRepeatedly(() -> {
      double raw = speedSupplier.getAsDouble();
      double speed = applyDeadband(raw, 0.1);
      m_driveMotor.set(speed);
    }).named("Drive With Joystick");
  }
  ```

- **`setDefaultCommand` is identical.** `Mechanism.setDefaultCommand(Command)`
  is the same name, same signature, same "runs whenever nothing else claims
  the mechanism" meaning as old L2's `SubsystemBase.setDefaultCommand`. The
  wiring line doesn't change at all:

  ```java
  m_module.setDefaultCommand(
      m_module.driveWithJoystick(() -> -m_driverController.getLeftY()));
  ```

  Worth stating to the student plainly, since it's a good confidence-builder
  after Lesson 1's real rewrite: *this line is exactly what you'd have
  written before.* `CommandGamepad.getLeftX/Y()`/`getRightX/Y()` keep the
  same names as `CommandXboxController`'s axis getters too — only the button
  methods changed names in Lesson 1, not the sticks.

Everything else — lambdas as values, `DoubleSupplier`, the deadband
`if`/`Math.abs`/`return` walkthrough, the "why a supplier and not a snapshot"
motivation — is Java and math, not framework, and carries over unedited from
old L2 §§1–3.

**New Java/robot concepts:** unchanged from old L2 (method parameters and
return values, `double`, lambdas/suppliers, `Math` helpers, reading a
controller axis, default commands, deadband).

**Walkthrough outline:** same shape as old L2 — read an axis as a `double`,
motivate suppliers, add `driveWithJoystick` (with the `runRepeatedly` swap
above), build `applyDeadband`, wire the default command in `MyTeleop`'s
constructor (same file, same place as Lesson 1's binding — no `RobotContainer`
split to reintroduce), run it.

**Try it:** unchanged from old L2 — slow mode via a scaled second parameter,
squaring the input, printing raw vs. deadbanded values.

**Open items:** none identified — this is the lowest-risk lesson in the
batch by a wide margin.

---

## Lesson 3: Telemetry & plots

**Old lesson:** [`docs/lessons/03-telemetry.md`](lessons/03-telemetry.md) —
reads the TalonFX's integrated encoder, installs AdvantageKit, changes
`Robot extends TimedRobot` to `Robot extends LoggedRobot`, starts the logger
in `Robot`'s constructor, fills in `DriveModule.periodic()` with
`Logger.recordOutput(...)` calls, views the result in AdvantageScope.

**Why this lesson changed:** old L3 §3's first step — "change what `Robot`
extends," from `TimedRobot` to `LoggedRobot` — has no equivalent here.
`Robot` already extends `OpModeRobot`, Java has no multiple inheritance, and
WPILib's own `SystemCoreTesting/AdvantageKit.md` confirms there's no third
option yet: *"An equivalent for WPILib's `OpModeRobot` will be available in a
future release."* Per the team's 2026-08-10 decision (full reasoning in
[Telemetry without AdvantageKit](lesson-plan-opmode-restructure.md#telemetry-without-advantagekit-epilogue)),
this lesson uses **`org.wpilib.epilogue`** — WPILib's own native telemetry
system, ships with core WPILib, no vendordep install step at all — instead of
waiting. The trade, stated to students directly rather than hidden: this
lesson's plots work today; **replay** (rerunning a whole match from its log
through changed code, which the old course's Lesson 13 teaches) does not yet,
and won't until a follow-up pass once AdvantageKit supports `OpModeRobot`.

### New Java/robot concepts

Unchanged from old L3's core teaching content (return values vs. commands,
chaining, the encoder, units) plus the swapped telemetry vocabulary: instead
of "data receivers" (`NT4Publisher`/`WPILOGWriter`), this lesson teaches
**backends** (`EpilogueBackend`, `NTEpilogueBackend`) — same job, same
plural-destinations idea, different noun.

### Walkthrough outline

1. **Read the encoder — unchanged.** `m_driveMotor.getPosition().getValueAsDouble()` /
   `.getVelocity().getValueAsDouble()` is Phoenix 6 API, untouched by the
   OpMode/Commands V3 swap. Old L3 §1's chaining/return-value teaching content
   carries over verbatim.
2. **No vendor library to install.** Old L3 §2 has the student open the
   vendor-library manager and install AdvantageKit. This lesson skips that
   step entirely — `org.wpilib.epilogue` is part of core WPILib
   (`epilogue-processor`/`epilogue-runtime` live in the same `allwpilib`
   monorepo as `wpilibj`, confirmed from source; high confidence this is
   already on the classpath via `wpi.java.deps.wpilib()`, but double-check
   against a real build before asserting it as fact in lesson prose).
3. **Construct a backend, once, somewhere with the right lifetime.** This
   replaces old L3 §3's "change what `Robot` extends" + `Logger.start()`
   steps. Since nothing about `EpilogueBackend` depends on `Robot`'s base
   class, the natural home is a small `private final EpilogueBackend` field —
   on `Robot` itself is the cleanest choice, since `Robot` is already the one
   object every opmode receives via constructor injection, so any opmode (or
   mechanism, once mechanisms take a `Robot` reference from Lesson 9 on) can
   reach it the same way.

   **Add to `Robot.java`:**
   ```java
   package first.robot;

   import org.wpilib.epilogue.logging.EpilogueBackend;
   import org.wpilib.epilogue.logging.NTEpilogueBackend;
   import org.wpilib.framework.OpModeRobot;
   import org.wpilib.networktables.NetworkTableInstance;
   import org.wpilib.datalog.DataLogManager; // verify exact package before writing for real

   public class Robot extends OpModeRobot {
     public final EpilogueBackend telemetry =
         new NTEpilogueBackend(NetworkTableInstance.getDefault());

     public Robot() {
       DataLogManager.start(); // mirrors every NetworkTables value to a .wpilog file
     }
     // ...driverStationConnected()/nonePeriodic() stay as the scaffold has them...
   }
   ```
   Two lines are doing the whole job that old L3's `Logger.addDataReceiver(...)`
   pair did: `NTEpilogueBackend` for live values (`NT4Publisher`'s role),
   `DataLogManager.start()` for the `.wpilog` flight recorder (`WPILOGWriter`'s
   role) — confirmed to auto-mirror NetworkTables, so nothing further is
   needed to wire the two together.
4. **Give `DriveModule` its own scoped backend and its own periodic hook.**
   This replaces old L3 §4's "fill in `periodic()`" step — `Mechanism` has no
   `periodic()` override the way `SubsystemBase` did, so the mechanism
   registers its own callback instead, once, in its constructor. `DriveModule`
   takes exactly what it needs — an `EpilogueBackend`, not the whole `Robot` —
   which matters: this deliberately does **not** preview Lesson 9's
   Robot-sharing restructure, since that lesson's forcing function is a
   different, specific problem (two opmodes needing the same *hardware*
   instance). Handing a mechanism a narrow `EpilogueBackend` today doesn't
   set up that expectation early or muddy Lesson 9's motivation later.

   **Add to `DriveModule`:**
   ```java
   private final EpilogueBackend m_backend;

   public DriveModule(EpilogueBackend backend) {
     m_backend = backend.getNested("DriveModule");
     Scheduler.getDefault().addPeriodic(this::logTelemetry);
   }

   private void logTelemetry() {
     double rotations = m_driveMotor.getPosition().getValueAsDouble();
     double rps = m_driveMotor.getVelocity().getValueAsDouble();
     m_backend.log("PositionRotations", rotations);
     m_backend.log("VelocityRotPerSec", rps);
   }
   ```
   `.getNested("DriveModule")` is confirmed from source to prepend
   `"DriveModule/"` to every key logged through it, so
   `"PositionRotations"` becomes the NetworkTables entry
   `"DriveModule/PositionRotations"` — the exact naming convention old L3
   teaches, unchanged. `MyTeleop`'s constructor changes to match:
   `new DriveModule(robot.telemetry)` in place of Lessons 1–2's no-arg
   `new DriveModule()` — a small, deliberate change worth calling out to
   students directly ("the module needs to reach something that lives on
   `Robot` now"), not glossed over.

   `Scheduler.getDefault().addPeriodic(Runnable)` runs the callback every
   scheduler tick regardless of which command is active — the direct
   replacement for old L3's "make it a habit: measurements get logged from
   `periodic()`, not from inside your command lambdas" callout, which carries
   over unchanged as advice, just with a new mechanism underneath it.
5. **AdvantageScope — same tool, unchanged.** AdvantageScope reads
   NetworkTables and `.wpilog` files generically; it was never
   AdvantageKit-exclusive (teams used it with plain `DataLogManager` output
   for years before AdvantageKit existed). Old L3 §5's walkthrough (Connect to
   Simulator, expand the sidebar tree, drag signals onto a line graph) carries
   over with one change: there's no `AdvantageKit → RealOutputs` prefix in the
   tree — values sit directly under `DriveModule/`, since that's the root this
   lesson's backend was given.

### Try it

1. Log the **commanded** speed too, same idea as old L3's Try It #1 — call
   `m_backend.log("CommandedOutput", speed)` from inside `driveWithJoystick`'s
   loop body (`runRepeatedly`'s `Runnable`), where the value is computed.
2. Same `getPositionRotations()` accessor exercise as old L3.
3. Same "change the prefix, watch the tree update" exercise — now change the
   string passed to `robot.telemetry.getNested(...)` instead of the old
   `"Elevator/"` prefix rename.

### What's deliberately not in this lesson

**Replay.** `EpilogueBackend` is write-only — nothing in its interface reads
a value back — so there is no way to teach "rerun this match through changed
code" the way old L3 sets up for Lesson 13 to pay off. Don't invent a
substitute or hint that one is coming soon within this lesson; state plainly
that this is deferred, the same honest framing the team decision uses, and
let the eventual replay-focused follow-up lesson (once AdvantageKit ships
`OpModeRobot` support) own that payoff instead.

### Open items

- Confirm `org.wpilib.epilogue`'s presence on the classpath without any extra
  `build.gradle` configuration, against a real build — high confidence, not
  yet driven.
- Confirm `DataLogManager`'s exact 2027 package (`org.wpilib.datalog` is a
  reasonable guess from `FileBackend`'s imports, not directly verified) and
  that it still auto-mirrors NetworkTables the way it has for years.
- Confirm `Robot.telemetry` (or an equivalent shared root backend) still
  makes sense as a public field once Lesson 9 restructures mechanism
  ownership onto `Robot` — `DriveModule(EpilogueBackend backend)` was
  deliberately kept narrow so this lesson doesn't preview that restructure
  early; revisit whether that narrowness still holds once mechanisms
  multiply.

---

## Housekeeping

- [ ] Lessons 0–3: verify against a real running sandbox (SimGUI opmode
      selection UI, `TalonFX`/`CANBus` constructor, vendor-manager alpha
      visibility, `org.wpilib.epilogue`'s presence without extra
      `build.gradle` config, `DataLogManager`'s exact package) before
      finalizing prose — several details above are flagged as
      read-from-source-but-not-driven.
- [x] Lesson 3: no longer blocked. Team decision (2026-08-10) — proceed using
      `org.wpilib.epilogue`'s `EpilogueBackend` directly, defer real replay to
      a later pass once AdvantageKit ships `OpModeRobot` support.
- [ ] Once Lessons 0–3 are written, extend `tools/verify-lessons.sh` (or
      build its v3-track sibling) to actually compile them against
      `code/OpModeV3Robot` — per R6 in the master plan, nothing here should
      be marked "done" on the strength of source-reading alone.
- [ ] Track AdvantageKit's releases for `OpModeRobot` support, and plan the
      follow-up pass that retrofits real replay onto the IO-layer structure
      once it lands (Lesson 13's equivalent, and everything after it).
