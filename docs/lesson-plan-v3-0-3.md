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
and controller bindings use `CommandGamepad`'s generic naming
(`southFace()/eastFace()/westFace()/northFace()`), not any Xbox-specific
method names.

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
| 3 | Telemetry & plots | L2 | AdvantageKit (`AdvantageKit-27.0.0-alpha-4.json`) | **Blocked** — AdvantageKit doesn't support `OpModeRobot` yet |

Lessons 0–2 have no dependency on the AdvantageKit blocker and can be written
and verified today. Lesson 3 cannot be written for real until that clears —
see its section for the options considered and why "wait" is the
recommendation rather than a workaround.

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

## Lesson 3: Telemetry & plots (blocked)

**Old lesson:** [`docs/lessons/03-telemetry.md`](lessons/03-telemetry.md) —
reads the TalonFX's integrated encoder, installs AdvantageKit, changes
`Robot extends TimedRobot` to `Robot extends LoggedRobot`, starts the logger
in `Robot`'s constructor, fills in `DriveModule.periodic()` with
`Logger.recordOutput(...)` calls, views the result in AdvantageScope.

### Exactly where this breaks

Old L3 §3's first step is the whole problem, named precisely: **"change what
`Robot` extends"** — from `TimedRobot` to `LoggedRobot`, AdvantageKit's
"drop-in replacement" base class that rides along on the heartbeat. In this
track, `Robot` already extends `OpModeRobot`. Java doesn't have multiple
inheritance, so `Robot` cannot extend both `OpModeRobot` (required for opmode
selection, the entire point of this track) and `LoggedRobot` (required for
AdvantageKit's logger to start). WPILib's own `SystemCoreTesting/AdvantageKit.md`,
describing the exact release paired with this project's pinned WPILib
version, confirms there is no third option yet: *"Users can continue to use
`LoggedRobot`... An equivalent for WPILib's `OpModeRobot` will be available
in a future release."* This isn't a missing-detail gap this plan failed to
verify — it's a real capability that doesn't exist yet in the library this
course's entire telemetry model depends on.

The blocker is narrower than "AdvantageKit doesn't work" — it's specifically
"AdvantageKit's `Logger` has no supported way to start itself without a
`LoggedRobot`." Everything downstream of that (the encoder read, the
`Logger.recordOutput` calls, the AdvantageScope viewing) is unaffected in
concept; there's simply no supported way to turn the logger on yet.

### Options considered

1. **Wait, tracked against AdvantageKit's releases. (Recommended.)** Lessons
   0–2 don't depend on this at all and can proceed today. This lesson —
   and everything after it that assumes logging is already wired up, which
   per `CLAUDE.md` is *every remaining lesson in the course* — waits for
   AdvantageKit to ship `OpModeRobot` support. Check
   `Mechanical-Advantage/AdvantageKit`'s releases (or the `vendor-json-repo/2027_alpha*`
   bucket, where its vendordep is already mirrored) periodically rather than
   assuming a timeline.
2. **Temporary non-AdvantageKit stand-in** (bare `SmartDashboard.putNumber`,
   or hand-rolled `NetworkTables` publishing). Technically unblocks writing
   *a* Lesson 3 today. **Not recommended**: `CLAUDE.md` states this course's
   telemetry rule in absolute terms — "every value goes through
   `Logger.recordOutput(...)` — never bare `SmartDashboard.putNumber`" — and
   that rule is load-bearing for all 34 existing lessons plus this track's
   own Lesson 13 equivalent (IO layers + replay, which needs AdvantageKit's
   replay machinery specifically, not just some telemetry pipe). Building
   Lesson 3 on a stand-in means either rewriting it again later (real cost,
   and a second "why did the telemetry style change" moment for students) or
   letting this track diverge permanently from the rest of the course's
   stated standard. Neither is worth it to avoid a wait.
3. **Manually drive AdvantageKit's `Logger` from `OpModeRobot`'s own hooks**
   (e.g., calling whatever internal per-tick methods `LoggedRobot` calls,
   directly from `Robot.robotPeriodic()`). Possible in principle, since
   `OpModeRobot.robotPeriodic()` is confirmed to run every tick regardless of
   opmode state — the same hook point `LoggedRobot` itself would use.
   **Unverified and not recommended to build a lesson on**: this is
   explicitly unsupported by AdvantageKit's own maintainers right now, the
   relevant methods may not even be public, and even if logging *appeared*
   to work, there's no guarantee replay would — replay is the harder-to-test
   half, and a lesson built on an unsupported hookup could teach a pattern
   that silently breaks the exact feature (Lesson 13's equivalent) this
   whole track is gated on. If someone wants to spike this to see how close
   it gets, that's a reasonable side investigation — just don't write lesson
   prose that tells students to do it.

### The lesson, once unblocked

Kept here so the plan is ready to execute the moment R1 clears — everything
below is what *would* change, written with the same confidence as Lessons
0–2, contingent only on the blocker.

- **New Java/robot concepts:** unchanged from old L3 (return values vs.
  commands, chaining, the encoder, logging, AdvantageScope, units).
- **§1 (read the encoder):** unchanged — `m_driveMotor.getPosition().getValueAsDouble()` /
  `.getVelocity()...` is Phoenix 6 API, orthogonal to the OpMode/Commands V3
  swap.
- **§2 (install AdvantageKit):** same VS Code vendor-manager flow as old
  L3 §2, pinned to `AdvantageKit-27.0.0-alpha-4.json` once it supports
  `OpModeRobot`.
- **§3 (turn the logger on):** this is the section that actually changes.
  Whatever AdvantageKit's eventual `OpModeRobot`-compatible entry point turns
  out to be (a new base class the same shape as `LoggedRobot`, a static
  `Logger.start()` call that no longer requires a specific `RobotBase`
  subclass, or something else) replaces old L3's "change what `Robot`
  extends" step — the two `Logger.addDataReceiver(...)` lines and
  `Logger.start()` in `Robot`'s constructor are plausibly unchanged, but
  don't assert that without checking the real API once it ships.
- **§4 (what to log, and where):** the biggest structural question, and one
  the master plan already flags under R1: `Mechanism` has no `periodic()`
  hook the way `SubsystemBase` did, so "log from `periodic()`, always
  running, never just while a command is active" — old L3's explicit
  "make it a habit" callout — needs a new home. Leading candidate:
  `Scheduler.getDefault().addPeriodic(Runnable)` (confirmed to exist),
  called once from `MyTeleop`'s constructor (or wherever the eventual
  `RobotTeleop`/mechanism-owning class lives) to register a logging
  callback per mechanism. Verify this actually behaves like `periodic()` —
  same cadence, runs regardless of which command is active — before writing
  it as fact.
- **§5 (AdvantageScope):** unaffected. AdvantageScope is a separate
  application reading `.wpilog`/NetworkTables data; nothing about the OpMode
  swap touches it.

### Open items

- Track AdvantageKit's release notes for `OpModeRobot` support — this is the
  actual blocking task, not something this plan can resolve by more reading.
- Once support lands, verify where per-tick logging belongs
  (`Scheduler.addPeriodic` vs. some other mechanism-level hook AdvantageKit
  or the OpMode framework might add alongside it).
- Re-verify whether `Logger.addDataReceiver`/`Logger.start()`'s exact call
  shape changes at all for `OpModeRobot` support, rather than assuming it's
  identical to the `LoggedRobot` version.

---

## Housekeeping

- [ ] Lessons 0–2: verify against a real running sandbox (SimGUI opmode
      selection UI, `TalonFX`/`CANBus` constructor, vendor-manager alpha
      visibility) before finalizing prose — several details above are
      flagged as read-from-source-but-not-driven.
- [ ] Lesson 3: blocked on AdvantageKit `OpModeRobot` support (R1 in the
      master plan). Re-check periodically; don't build a workaround per the
      options analysis above.
- [ ] Once Lessons 0–2 are written, extend `tools/verify-lessons.sh` (or
      build its v3-track sibling) to actually compile them against
      `code/OpModeV3Robot` — per R6 in the master plan, nothing here should
      be marked "done" on the strength of source-reading alone.
