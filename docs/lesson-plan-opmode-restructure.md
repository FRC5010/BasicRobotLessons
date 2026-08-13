# Lesson plan: restructuring onto OpModes + coroutine commands (2027 alpha)

A working plan for a large, optional restructure: rebuilding the course on top
of `code/OpModeV3Robot` — WPILib's 2027 alpha "OpModeRobot" template, running
on **SystemCore** instead of the roboRIO — using the **OpMode** framework
(`org.wpilib.opmode`) and **coroutine-style commands**
(`org.wpilib.command3`, "Commands V3"). **This is a contributor document, not
lesson content** — it lives beside `docs/lessons/`, never inside it, and
nothing here should be pasted into a lesson as-is.

**Continued in [docs/lesson-plan-v3-0-3.md](lesson-plan-v3-0-3.md)**, which
lays out the first four lessons of the new track (Lessons 0–3) in detail and
inherits the decisions recorded here.

This plan is written before any lesson work has started. Every API claim in
it was read from the actual source at tag `v2027.0.0-alpha-6` of
`wpilibsuite/allwpilib` (the exact version pinned in
`code/OpModeV3Robot/build.gradle`), not from documentation or memory — see the
[verified API appendix](#appendix-verified-api-notes). That matches this
repo's existing rule: verify before drafting, and record what you verified.
What could **not** be verified — mainly, whether the third-party libraries
this course depends on (AdvantageKit, PhotonVision, maple-sim, BLine) work
against this stack yet — is called out explicitly in
[Risks and blocking unknowns](#risks-and-blocking-unknowns) rather than
guessed at.

---

## Why this now

`code/OpModeV3Robot` was added to this branch as a byte-for-byte WPILib
template scaffold: `Main`, `Robot extends OpModeRobot`, and two opmodes,
`MyTeleop` and `MyAuto`, each a `PeriodicOpMode` annotated `@Teleop` /
`@Autonomous`. It originally shipped WPILib's **Commands V2** vendordep
(`org.wpilib.commandsv2`) — the same architecture this course already
teaches, just repackaged under `org.wpilib.*`.

**Resolved 2026-08-10: swapped.** `code/OpModeV3Robot/vendordeps/CommandsV2.json`
is gone; `CommandsV3.json` is in its place, copied verbatim from
`commandsv3/CommandsV3.json` at `wpilibsuite/allwpilib` tag `v2027.0.0-alpha-6`
(the same tag this project's `build.gradle` pins). Coroutine-style commands
are the point of this whole track, so there was no reason to let the scaffold
sit on V2 even temporarily — see [OD1](#od1-commandsv3-installed-resolved).
Checked first: no Java source in `code/OpModeV3Robot/src` referenced
`commandsv2` anything, so the swap is a pure build-dependency change with zero
code impact.

There's a second reason this was worth doing now rather than later: this
course used to carry a page, `aside-commands-v3.md` (now deleted — see below),
about the *design* for Commands V3, whose Try It #4 said "if a real
`Coroutine` class exists by the time you read this, trust it over this page."
That condition is now true.
`org.wpilib.command3.Coroutine`, `org.wpilib.command3.Command`,
`org.wpilib.command3.Scheduler`, and the rest of the framework the aside
speculated about are real, compiled, documented Java source in the 2027
alpha — see the appendix for exactly what changed between the design doc and
the shipped API (mostly nothing; a few names moved). **That aside was retired
2026-08-10** — its content now lives here, verified against the real API
instead of the design doc. See
[Retired: the Commands V3 aside](#retired-the-commands-v3-aside).

## Scope and posture

This plan does **not** recommend rewriting Lessons 0–34 in place. Three
things argue against that, all real and not hedges:

1. **The hardware target changes, not just the API.** `code/OpModeV3Robot`
   deploys to **SystemCore**, not the roboRIO. That's WPILib's own framing —
   "the biggest control system update since the introduction of the cRIO" —
   and it removes several device classes outright (relay, analog output, SPI,
   analog gyro, DMA, the built-in accelerometer, interrupts, counters,
   ultrasonic, `Servo`, `Jaguar`; see the appendix). This course doesn't use
   any of those today, but it means "restructure the lessons" is really
   "port the lessons to different hardware that happens to also have a nicer
   command framework."
2. **Everything is alpha.** GradleRIO `2027.0.0-alpha-6`, Phoenix 6's own
   2027 alpha, AdvantageKit's 2027 alpha — all mid-flight, all documented by
   their own maintainers as alpha-test software with known gaps (Phoenix 6's
   alpha notes literally list "no Sendable replacement yet" as a known
   limitation). An API detail cited here as fact today can legitimately be
   wrong by alpha-7.
3. **AdvantageKit does not support `OpModeRobot` yet — confirmed, not just
   unverified.** WPILib's own `wpilibsuite/SystemCoreTesting/AdvantageKit.md`,
   describing the exact release paired with this project's pinned WPILib
   version (`v27.0.0-alpha-4` ↔ `2027.0.0-alpha-6`), says so directly: *"Users
   can continue to use `LoggedRobot`... An equivalent for WPILib's
   `OpModeRobot` will be available in a future release."*

**Team decision (2026-08-10): proceed without AdvantageKit's replay ability
for now, and do a second pass to add it back once AdvantageKit supports
`OpModeRobot`.** This resolves point 3 above without waiting on it. In its
place, the v3 track uses **plain `SmartDashboard`/`NetworkTables`** —
already core WPILib, already confirmed in active use by `OpModeRobot` itself,
and (used the way this plan recommends — see
[Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables)
below) has no dependency on `Robot`'s base class at all, so it works on
`OpModeRobot` today with no blocker. **A same-day second look also ruled out
`org.wpilib.epilogue`** (WPILib's own 2027 telemetry system) as the
replacement: it would have worked technically, but brought a backend
abstraction and its own set of new concepts for no real gain once replay was
already off the table — so the plainer option won. The trade this decision
accepts, stated plainly either way: **neither option has a replay
concept** — `SmartDashboard`/`NetworkTables` publish values one-directionally,
same as `EpilogueBackend` would have. This isn't "replay, minus
AdvantageKit's brand" — it's "get telemetry working today, and bring real
replay back in a follow-up pass once AdvantageKit's `OpModeRobot` support
lands," which is exactly the team's stated intent. The IO-layer *structure*
this course already teaches (interfaces, an Inputs data class per device, a
`Constants.Mode` switch, IO implementations) carries over unchanged precisely
so that follow-up pass is additive, not a redesign — see
[Lesson 13's entry](#per-lesson-impact-assessment) and R1 below for what
"structure now, replay later" means concretely.

Meanwhile PhotonVision's 2027 alpha vendordep does exist
(`photonlib-v2027.0.0-alpha-2.json`), so that part of the ecosystem is in
better shape than AdvantageKit specifically — see the appendix.

**Recommended posture: build this as a parallel track, not an in-place
rewrite**, using the same discipline `CLAUDE.md` already prescribes for the
existing course — points 1 and 2 above (hardware swap, everything alpha) hold
regardless of the telemetry decision. Per direction from the user, the new
track's lesson prose lives under **`docs/lessons/v3/`** (e.g.
`docs/lessons/v3/00-orientation.md`), a sibling of `docs/lessons/`'s numbered
files rather than mixed into them, and its code side mirrors that:
**`code/v3/lesson-N`** holds the snapshots, and `tools/verify-lessons-v3.sh` —
a sibling script, not an extension of the original, since almost everything
differs (base project, package root, vendordep source) — rolls them onto
`code/OpModeV3Robot` and actually compiles them. Both exist now, and Lessons
0–3 compile through the script for real, against the pinned alpha jars, not
just by inspection. A lesson gets written and verified **one at a time**,
same as every other pass this repo has done. Nothing in the existing 0–34
course should be deleted, retitled away from roboRIO, or treated as
superseded by this track.
With the `SmartDashboard` decision, **Lessons 0–3 can all be written and
verified today** — nothing in this batch is blocked anymore.

---

## Architecture mapping

The framework moves; most of what this course actually *teaches* does not.
Read this table with that in mind — it separates "the words change" from
"the idea changes."

| Concern | Today (V2, roboRIO) | New (OpMode + Commands V3, SystemCore) | Note |
|---|---|---|---|
| Robot base class | `Robot extends TimedRobot`, one class, whole-match lifecycle | `Robot extends OpModeRobot`, thin; per-mode behavior lives in `OpMode` classes | `OpModeRobot` still has `robotPeriodic()`, `disabledInit/Periodic/Exit`, `simulationInit/Periodic` — same hook names students already know |
| Scheduler tick | `CommandScheduler.getInstance().run()` in `robotPeriodic()` | `Scheduler.getDefault().run()` — **not called for you**, must be added the same way | `robotPeriodic()` runs every tick regardless of which opmode (if any) is selected — same hook point, same reason to use it |
| Mode selection | One binary: teleop or autonomous, chosen by the field/DS, same `Robot` class either way | Discrete named **opmodes** — any number of `@Teleop`/`@Autonomous`/`@Utility` classes, auto-discovered by package scan, each shown by name on the DS | New concept, not just a rename — see [OpMode fundamentals](#opmode-fundamentals) |
| Wiring class | `RobotContainer`: constructed once at boot, owns every subsystem and every binding for the robot's entire life | No such class exists in the template. `Robot` is the only thing constructed once at boot; opmodes receive it via constructor injection (`MyTeleop(Robot robot)`) already, in the stock scaffold | `Robot` plays `RobotContainer`'s role starting **Lesson 1**, not Lesson 9 — see [the transition section](#the-myteleopmyauto--robotteleop-transition) for the correction |
| Subsystem base | `SubsystemBase` (`periodic()` override, auto-registers with `CommandScheduler`) | `Mechanism` (constructor registers with `Scheduler.getDefault()`, auto-installs an idle default command) | No baked-in `periodic()` hook — see [Risk R1](#risks-and-blocking-unknowns) on where per-tick logging goes |
| Command shape | `initialize/execute/isFinished/end`, or `run(Runnable).until(...).finallyDo(...)` | Single `run(Coroutine)` method; `Mechanism.run(Consumer<Coroutine>)....named(...)`, with `.until(...)`, `.whenCanceled(...)`, `.withPriority(...)` builder stages | `.named(...)` is now a **compiler-enforced** final step, not a convention |
| Composition | `Commands.sequence/parallel/race/deadline`; `.andThen/.alongWith/.raceWith/.deadlineWith`; `Commands.defer(Supplier<Command>, Set<Subsystem>)` | `Command.sequence/parallel/race`; `.andThen/.alongWith/.raceWith/.until`; `coroutine.await(...)`/`coroutine.fork(...)` largely replace `defer` | See [the per-lesson impact table](#per-lesson-impact-assessment) (Lesson 27) |
| Controller | `CommandXboxController` — `a()/b()/x()/y()` | `CommandGamepad` — `southFace()/eastFace()/westFace()/northFace()` | On a standard Xbox pad: south=A, east=B, west=X, north=Y. Generic naming, FTC-style — no `CommandXboxController` equivalent shipped |
| Triggers | `edu.wpi.first.wpilibj2.command.button.Trigger`; lives until the program restarts | `org.wpilib.command3.Trigger`; **same** `and/or/negate/debounce`, **same** `onTrue/onFalse/whileTrue/whileFalse`, plus new `risingEdge()/fallingEdge()`; auto-torn-down when its creation scope (an opmode or a command) goes inactive | Direct vocabulary win for Lesson 22; real simplification opportunity for Lesson 25 — see below |
| Autonomous selection | Hand-built `LoggedDashboardChooser<Supplier<Command>>` (`Autos.buildChooser`) | Every `@Autonomous` class is automatically listed and grouped on the DS — no chooser code at all | **Decided:** lean into multiple `@Autonomous` classes, not a single routine-selecting `RobotAuto` — see [OD3](#od3-multiple-autonomous-opmodes-resolved) |
| State machines | Hand-rolled enum (`SuperstructureState`) + exhaustive `switch` | Library primitive: `org.wpilib.command3.StateMachine` (states, `switchFromAny`, `onEnter/onExit`, `when`/`whenComplete`) | Recommend keep the hand-rolled version for the teaching payoff, reference `StateMachine` the way the course already references `MathUtil.clamp` — see [the per-lesson impact table](#per-lesson-impact-assessment) (Lesson 24) |
| Telemetry widgets | `SmartDashboard.putData` (the one sanctioned use) | `org.wpilib.smartdashboard.SmartDashboard` — same class name, confirmed present (`OpModeRobot.loopFunc()` calls `SmartDashboard.updateValues()` itself) | Low risk |
| Telemetry logging | `Logger.recordOutput(...)` from every subsystem's `periodic()`, hooked into `LoggedRobot`'s lifecycle | **Decided:** plain `SmartDashboard.putNumber(...)`/`putBoolean(...)`, called from a manually-registered `Scheduler.addPeriodic(...)` callback — see [Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables). Replay is deferred, not replaced — see R1 | AdvantageKit itself is confirmed blocked on `OpModeRobot`; Epilogue was investigated and would have worked, but was dropped as more machinery than the decision needed (see R1's history) |
| Hardware target | roboRIO | SystemCore | Removes device classes this course never used; CAN devices (TalonFX, Pigeon 2, CANcoder) unaffected in principle, pending Phoenix 6 SystemCore verification |

---

## Telemetry without AdvantageKit: SmartDashboard and NetworkTables

Team decision, 2026-08-10: proceed without replay for now, and don't reach
for another library to fill AdvantageKit's spot — use the plainest option
that's already proven stable in this exact stack, while keeping the
IO-layer *structure* this course already teaches (interfaces, an Inputs data
class per device, a `Constants.Mode` switch, IO implementations) so a later
pass can add real replay back in once AdvantageKit supports `OpModeRobot`,
without a redesign.

### Why not Epilogue

An earlier pass of this plan recommended `org.wpilib.epilogue` (WPILib's own
2027 telemetry system) as AdvantageKit's replacement, and the investigation
behind that recommendation still stands as accurate — `Epilogue.bind(this)`
turns out to have the identical `TimedRobot`-only problem AdvantageKit does
(confirmed from `wpilibsuite/frc-docs`'s own docs), but its lower-level
`EpilogueBackend`/`NTEpilogueBackend` API is robot-base-agnostic and would
have worked. **Reconsidered, 2026-08-10: not a technical dead end, but more
machinery than this decision needs.** Given replay is already off the table
for now, Epilogue's whole value proposition — a backend abstraction, nested
loggers, an annotation processor waiting to be useful once `@Logged` is
usable again — buys nothing over just publishing values directly, at the
cost of one more not-fully-battle-tested alpha library to trust and one more
set of concepts (`EpilogueBackend`, `NTEpilogueBackend`, `.getNested(...)`)
students would need before they're motivated. The Epilogue findings are kept
in the appendix as verified facts — they're accurate and may be useful if the
course ever does want that abstraction back — but they're not what this
track builds on.

### The actual plan: `SmartDashboard`, directly

**`org.wpilib.smartdashboard.SmartDashboard` is already confirmed present and
in active use by the framework itself** — not a new finding, this was
verified back when this plan first read `OpModeRobot`'s source: its own
`loopFunc()` calls `SmartDashboard.updateValues()` every tick, unconditionally.
That's about as strong a stability signal as anything in this alpha stack
gets. The design:

- `SmartDashboard.putNumber(String key, double value)` / `.putBoolean(...)` /
  `.putString(...)` / the array overloads — one line per value, no backend
  object, no nested-logger concept, nothing to construct. This is the direct
  replacement for `Logger.recordOutput(key, value)`.
- **Keep the naming discipline, drop the abstraction that enforced it.**
  `SmartDashboard`'s entries live under `/SmartDashboard/` in NetworkTables,
  and NT4 topic names are genuinely hierarchical on `/` — dashboards
  (AdvantageScope included) render a `/`-containing key as nested folders.
  So `SmartDashboard.putNumber("DriveModule/PositionRotations", value)`
  produces the exact same organized tree old L3's
  `Logger.recordOutput("DriveModule/PositionRotations", value)` did — the
  `"Subsystem/Value"` convention survives as a **habit** the lesson teaches,
  the same way it always has, rather than something a library structurally
  enforces. Old L3's own framing already anticipated this exact tradeoff —
  it named `SmartDashboard.putNumber` as the thing AdvantageKit was chosen
  over specifically because undisciplined use of it turns into "print-statement
  spam with a UI." Nothing about the mechanism causes that; only skipping the
  naming habit does, so the lesson keeps teaching the habit and drops the
  enforcement.
- **`DataLogManager.start()`, called once in `Robot`'s constructor**, still
  gives the `.wpilog` flight recorder for free — this was never
  Epilogue-specific, it's separate, older, plain WPILib infrastructure that
  auto-mirrors NetworkTables (so `SmartDashboard` values included) to disk.
  One line, same as it would have been either way.
- **No field needed on `Robot` at all for this.** Epilogue's design needed a
  shared backend object living somewhere with the right lifetime
  (`Robot.telemetry`), which meant `DriveModule`'s constructor had to change
  to receive it — a real, if small, complication for a Lesson 3 student.
  `SmartDashboard`'s methods are `static`; any mechanism can call
  `SmartDashboard.putNumber(...)` directly with no constructor change and no
  new field anywhere. **`DriveModule()` stays exactly the no-arg constructor
  Lessons 1–2 already gave it.** This is the concrete shape of "simpler,"
  not just a description of it.

**Where per-tick logging happens, now that `Mechanism` has no `periodic()`
hook** (unchanged from the Epilogue-era finding — this part was never
Epilogue-specific): a mechanism's own constructor registers its own periodic
callback with the scheduler, using the confirmed `Scheduler.addPeriodic(Runnable)`
method (runs every scheduler tick — no period argument needed, unlike
`PeriodicOpMode.addPeriodic(Runnable, double)`):

```java
public DriveModule() {
  Scheduler.getDefault().addPeriodic(this::logTelemetry);
}

private void logTelemetry() {
  double rotations = m_driveMotor.getPosition().getValueAsDouble();
  double rps = m_driveMotor.getVelocity().getValueAsDouble();
  SmartDashboard.putNumber("DriveModule/PositionRotations", rotations);
  SmartDashboard.putNumber("DriveModule/VelocityRotPerSec", rps);
}
```

This becomes the standing convention for the whole v3 track everywhere the
old course wrote `@Override public void periodic() { ... }` — not just
Lesson 3. AdvantageScope, the viewer, is unaffected either way: it reads
NetworkTables and `.wpilog` files generically and was never
AdvantageKit-exclusive, so old Lesson 3's §5 walkthrough carries over with
only the sidebar tree path changing (values sit directly under
`SmartDashboard/DriveModule/`, no `AdvantageKit → RealOutputs` prefix).

**Known gap this simplification accepts, to revisit downstream, not now**:
`SmartDashboard.putNumber`'s family covers primitives and primitive arrays
only. AdvantageKit/Epilogue could log struct-serializable types
(`Pose2d`, `Rotation2d`, `SwerveModuleState[]`) directly; plain
`SmartDashboard` cannot — a later lesson that wants to log a `Pose2d` (the
old course's field-view/odometry lessons) will need either to log its
components as separate numbers or reach for raw
`NetworkTableInstance.getStructTopic(...)` publishers directly (the same
primitive `NTEpilogueBackend` itself was built on, still available without
Epilogue). Not a Lesson 0–3 problem — flagged here so it isn't rediscovered
as a surprise later.

**What this deliberately does not attempt**: replay. Neither `SmartDashboard`
nor raw `NetworkTables` reads a value back the way replay needs — this was
true of Epilogue too and remains true here. The course's `Constants.Mode`
switch keeps all three arms (`REAL`/`SIM`/`REPLAY`) so the structure is
already exhaustive and future-proofed, with `REPLAY` staying an unreachable,
dormant case (nothing currently selects it — no launch path exists to enter
it) until a follow-up pass gives it a real implementation once AdvantageKit's
`OpModeRobot` support lands.

---

## OpMode fundamentals

Worth stating plainly, because it's the actual new idea (not just new class
names): an **opmode** is a self-contained unit of "what the robot does right
now," selected by name on the Driver Station, constructed fresh every time
it's selected, and thrown away when it's deselected or the match phase
changes.

Verified from `org.wpilib.opmode.OpMode`'s own lifecycle javadoc and
`OpModeRobot.loopFunc()`:

- **Constructed when selected on the DS.** Not at boot. `MyTeleop` and
  `MyAuto` in the stock scaffold don't exist as objects until a human (or the
  field) picks them.
- **`disabledPeriodic()` runs the whole time it's selected and the robot is
  disabled** — not on a fixed schedule, just "whenever the DS is disabled."
- **`start()` fires on *every* disabled → enabled transition, not once per
  opmode lifetime — corrected 2026-08-11, read directly out of
  `loopFunc()`'s bytecode and reproduced with `DriverStationSim`.** The
  opmode *object* is still constructed exactly once, when it's selected —
  that part above is right — but `loopFunc()` branches on whether the
  enabled flag flipped since last tick, and calls `opMode.start()` every
  time that branch is taken while entering enabled. Toggling **Robot
  State** off and back on in SimGUI while the same opmode stays selected —
  or, on a real field, disabling and re-enabling during pit testing — calls
  `start()` again on the same object, with no intervening constructor call.
  **This is the one fact that settles where one-time wiring goes**: button
  bindings and `setDefaultCommand` calls belong in the constructor, which
  really does run once, not `start()`, which doesn't. Full writeup with the
  bytecode trace and the `DriverStationSim`-based confirmation is in
  [lesson-plan-v3-0-3.md's Lesson 1 section](lesson-plan-v3-0-3.md#lesson-1-your-first-motor).
- **`periodic()` runs every tick** while enabled, at `OpModeRobot`'s period
  (20 ms by default) — the same cadence students already know from
  `robotPeriodic()`.
- **`end()`, then `close()`, run when it stops being the active, enabled
  opmode** — disabled, or the DS switched to a different opmode. **The object
  is never reused.** Re-selecting "My Auto" a second time constructs a brand
  new `MyAuto`.
- Registration is automatic: any public, non-abstract class annotated
  `@Teleop`, `@Autonomous`, or `@Utility`, anywhere in `Robot`'s package or a
  subpackage, is found by scanning the classpath (`addAnnotatedOpModeClasses`)
  and shown on the DS by name — no manual registration call anywhere in
  `Robot.java`.
- **Neither `OpMode` nor `OpModeRobot` ticks Commands V3's `Scheduler` for
  you.** `Robot.robotPeriodic()` — which, per `loopFunc()`'s bytecode, runs
  unconditionally every tick regardless of which opmode is selected or
  whether the robot is enabled — is where `Scheduler.getDefault().run()`
  belongs, added by hand. Found the hard way: the first lesson-1 draft
  compiled clean with a `Trigger` binding wired and nothing ever ticking the
  scheduler to run it. See the v3-0-3 doc for the full story.

That last point is the one worth a dedicated teaching beat early: it's a
genuinely different mental model from "one `Robot` class, `isAutonomous()`
branches inside it," and the course's existing Lesson 0 already has a
callout for "you're filling in blanks the framework visits on its own
schedule" — this needs the same treatment, extended to "and which blanks get
filled in depends on what's selected on the DS."

---

## The MyTeleop/MyAuto → RobotTeleop transition

This is the specific design question this plan was asked to answer. It
splits into two genuinely separate questions that an earlier draft of this
plan wrongly treated as one: **where hardware lives** (a real, correctness
question, resolved by writing Lessons 0–3 and finding out the hard way) and
**when the class gets renamed** (a soft, editorial one). Keep them apart —
conflating them is exactly the mistake this section corrects.

### Corrected finding: hardware belongs on `Robot` from Lesson 1, not Lesson 9

An earlier draft of this plan argued mechanisms could stay owned by
`MyTeleop` through Lesson 8, on the theory that the forcing function was
"two opmodes needing the same hardware simultaneously" — and that doesn't
happen until autonomous gets real content at Lesson 9. **That reasoning was
wrong, and Lessons 0–3 exposed it directly**, not through more source
reading: writing Lesson 1 with `DriveModule` owned by `MyTeleop` turned out
to be a real bug, verified by tracing `OpModeRobot.loopFunc()` and
`Scheduler`'s source rather than caught by a compiler.

The actual forcing function is narrower and earlier than "two opmodes
fighting over hardware" — it's **opmode reconstruction, full stop, with only
one opmode involved:**

- Opmodes are reconstructed *every time they're re-selected* on the Driver
  Station — confirmed from `OpModeRobot.loopFunc()`: any change in the
  selected opmode ID tears down the current opmode (`end()`, `close()`) and
  builds a fresh one from its factory. This isn't a rare event a student
  might never trigger — it's exactly what happens at the **auto → teleop
  transition of every real match**, and it's what a student naturally
  triggers just working through Lesson 0's own Try It (select My Auto, then
  come back to My Teleop for Lesson 1).
- If `DriveModule` is a field on `MyTeleop`, every reconstruction builds a
  **new** `DriveModule`, and nothing tears down the old one.
  `Mechanism`'s own default-command binding is scope-aware and does get
  cleaned up when the creating opmode's scope goes stale — but the
  `Mechanism` object itself is never removed from `Scheduler`'s internal
  `m_defaultCommandBindings` map, just left with an empty binding list.
  That's a small, mostly harmless leak on its own.
- **`Scheduler.getDefault().addPeriodic(Runnable)` — the exact mechanism
  Lesson 3 uses for telemetry — has no scope tracking at all**, confirmed
  from source: it wraps the callback in a bare `while (true)` sideload
  coroutine, removed only via `Coroutine::isDone`, which a `while(true)` loop
  never satisfies. Every reconstruction adds a new, permanent, never-cleaned
  periodic callback still reading a now-orphaned `TalonFX` handle and writing
  to `SmartDashboard`. This is a real, compounding, verified bug starting
  the moment Lesson 3's `Scheduler.addPeriodic` call lands — not a
  theoretical one, and not confined to a Lesson 9 scenario.

`Robot`, by contrast, is constructed exactly once and never torn down. It's
the only object in the whole scaffold with a lifetime long enough to safely
own a `Mechanism`. **Lessons 1–3, as actually written, put `DriveModule` and
`CommandGamepad` on `Robot` from Lesson 1** — see
`docs/lessons/v3/01-first-motor.md` §4, "Give the robot its hardware." The
teaching framing there is deliberately simple for a first-time reader:
`Robot` is built once and lasts the whole time the robot runs; opmodes are
rebuilt fresh every time they're picked; so hardware goes on `Robot`, and
opmodes reach in and use it. No mention of the leak, the scheduler internals,
or this correction belongs in the lesson text itself — that's for this plan
doc, not the student.

### The rename is a separate, later, softer decision

With hardware ownership resolved at Lesson 1, **`MyTeleop` → `RobotTeleop`
no longer has a technical trigger at all** — it's purely about the name
feeling like a permanent piece of the robot's control scheme rather than
template example code, exactly as characterized when this was decided:
"just a name that sounds less like example code." That's still a fine
description, and Lesson 9 (autonomous) is still a reasonable, low-cost place
to do it — a natural pause point, and it lines up with `MyAuto` finally
getting real content instead of an empty stub, which is its own good reason
to touch both files in the same pass. But it's no longer load-bearing the
way the earlier draft claimed, and could just as easily happen at another
lesson boundary without breaking anything. Treat the rename as:

1. **`MyTeleop.java` renamed `RobotTeleop.java`, in place** — same move as
   `DriveModule` → `SwerveModule`, not a new file added alongside the old
   one. It keeps `@Teleop`, keeps the `Robot robot` constructor parameter,
   and continues reading mechanisms off `robot` exactly as it has since
   Lesson 1 — nothing about *how* it reaches hardware changes here, only
   the file and class name.
2. **`MyAuto.java` renamed `RobotAuto.java`** the same way, and finally gets
   real content: the drive-turn-drive script this course has always taught
   at this point, reading `robot.module` (or `robot.drivetrain`, by then)
   the same unremarkable way `RobotTeleop` already does. There's no
   "avoiding a conflict" drama here anymore — that was the old, incorrect
   framing. It's just `MyAuto` doing what `MyTeleop` already knows how to
   do.
3. Every lesson **before** the rename keeps saying "open `MyTeleop.java`."
   Every lesson **from** the rename on says "open `RobotTeleop.java`" /
   `RobotAuto.java`. Single, dated, one-time editorial pass — grep the whole
   `docs/lessons/v3/` tree for `MyTeleop`/`MyAuto` before committing to the
   cutover lesson, since earlier lessons reuse those names verbatim in code
   blocks.

**Resolved, not just assumed — twice over.** `BindingScope.createNarrowestScope`
picks an opmode-scoped binding by reading `OpModeFetcher.getFetcher().getOpModeId()`
at the moment a trigger or command is scheduled, and whether that ID already
reflects the *new* opmode while its constructor is still running determines
whether bindings belong in a constructor or `start()`. First confirmed by
tracing `loopFunc()`'s bytecode while writing Lesson 1 (see that lesson's
housekeeping entry and R9's neighbor findings above). Confirmed a second,
independent way while writing Lesson 9, with a real scheduler test rather
than more bytecode reading: a `Trigger` bound inside one simulated opmode
(via raw `DriverStationSim.setOpMode(long)`, not a full `OpModeRobot`) has
its bound command **actually cancelled** — not just prevented from re-firing
— the instant the simulated opmode ID changes, for both `.onTrue(...)` and
`.whileTrue(...)`. This is what makes `RobotAuto` scheduling its own plan
from its constructor (Lesson 9) safe: the scheduled auto sequence cannot
outlive `RobotAuto` being the selected opmode. See R11 for the full test and
a testing trap worth not rediscovering (`RobotState.getOpModeId()` silently
reads `0` forever unless `DriverStationBackend.observeUserProgramStarting()`
is called first in a bare test — no `OpModeRobot` instance to do it for you).

### Autonomous selection past Lesson 9

Today's Lesson 17 (BLine autos) builds a `LoggedDashboardChooser<Supplier<Command>>`
by hand specifically because WPILib's V2 stack has no other way to offer
"pick one of several autos" on the dashboard. The OpMode framework makes that
built in — every `@Autonomous` class is its own DS-selectable entry, grouped
by the annotation's `group` parameter. **Decided: lean into that** — multiple
small `@Autonomous(name=..., group=...)` classes once there's more than one
routine worth choosing between, rather than growing `RobotAuto` into its own
internal chooser. See [OD3](#od3-multiple-autonomous-opmodes-resolved) for
what that costs the syllabus (today's `Autos.buildChooser`
factory-lambda/`Supplier<Command>` teaching content needs a new home) and
what it buys (zero chooser boilerplate, and it's the idiomatic shape for this
stack — `MyAuto` already starts as "one opmode, one job").

---

## Coroutine-style commands: where they enter the syllabus

New Java concept, and a big one: `Coroutine` is backed by JDK continuations
(`org.wpilib.command3.Continuation`), which is a materially different runtime
idea from anything else in this course — a method that can pause mid-execution
and be resumed later, stack and all. It deserves the same "introduce the
smallest useful piece first" treatment every other big idea in this course
gets.

**Lesson 1 barely changes syntactically.** The recommended factory style for
a single-mechanism command was already `mechanism.run(() -> ...)`; the V3
version is `mechanism.run(coroutine -> ...)....named(...)`. The `coroutine`
parameter can be treated exactly the way `Robot robot` already is in
`MyTeleop`'s constructor at this point — a parameter the student passes
through without needing to understand it yet.

**`coroutine.yield()` needs its own explicit callout the first time a command
body contains a loop**, and it needs to be stated as a hazard, not a footnote:
forgetting it doesn't break one mechanism, it hangs the entire robot program.
Today's V2 stack makes that structurally impossible (`execute()` always
returns); V3 makes it possible to get wrong, in exchange for letting commands
read like ordinary code. That trade is worth naming explicitly, the same way
Lesson 21's "ask what a stuck reading would make the robot do" is named
explicitly instead of left implicit.

**The real payoff — `coroutine.await(...)` replacing chained `.andThen(...)`
groups — deserves a dedicated worked contrast**, and WPILib's own
`Command.java` javadoc already hands the course one, essentially lesson-ready:
a `basicScoringSequence()` built with `.andThen(...)` (owns every mechanism
for the group's entire duration) next to an `advancedScoringSequence()` built
with `coroutine.await(...)` calls in a straight-line method (each mechanism is
only owned while its own step is actually running). That's the same "pair the
right mental model with the wrong one" move `CLAUDE.md`'s rewrite guidance
already asks for — the wrong model here is "parallel/sequence groups are the
only way to combine commands," which V2 genuinely teaches by omission. This
is the natural home for that beat: whichever lesson ends up doing today's
Lesson 9's job (command composition) in the new sequence.

---

## Per-lesson impact assessment

Impact levels are about how much a lesson's *framework scaffolding* changes,
not its subject matter. A "Low" lesson's physics, math, and vendor-API
content is untouched — only the surrounding class shapes shift mechanically
(`SubsystemBase` → `Mechanism`, `CommandXboxController` → `CommandGamepad`,
and so on). A "High" lesson needs real rework or is where an open risk lands.

| # | Lesson | Impact | Why |
|---|---|---|---|
| 0 | Orientation | **High** | Entry point itself changes — OpMode selection replaces "the one Robot class," see [OpMode fundamentals](#opmode-fundamentals) |
| 1 | Your first motor | **High** | First real command; hardware (`DriveModule`, `CommandGamepad`) is owned by `Robot`, not `MyTeleop` — corrected from an earlier draft, see [the transition section](#the-myteleopmyauto--robotteleop-transition). **Retrofitted 2026-08-12** — command-name logging (`getRunningCommandsFor(module).get(0).name()` → `SmartDashboard`), closing a promise the lesson text itself makes at `.named(...)` ("how you'll recognize your own commands later, in logs and on screen") that nothing delivered on through Lesson 9. See [R12](#risks-and-blocking-unknowns), and its supersession by R13 at Lesson 3 below — Lesson 1 keeps this version deliberately, as the honest (and, for everything taught by Lesson 2, genuinely safe) first pass |
| 2 | Joystick control | Low | Same lambda-binding pattern, stays in `MyTeleop` |
| 3 | Telemetry & plots | Low | No longer blocked — uses plain `SmartDashboard.putNumber(...)` instead of AdvantageKit's `Logger` (Epilogue was considered, dropped as unnecessary machinery); see [Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables) and the [detailed Lesson 3 plan](lesson-plan-v3-0-3.md#lesson-3-telemetry--plots). **Updated 2026-08-12** — Lesson 1's command-name poll is replaced here with an `addEventListener`/`SchedulerEvent.Scheduled` listener, fixing a real crash R13 found in the polling version. See [R13](#risks-and-blocking-unknowns) |
| 4 | Simulation | Low–Medium | Written and compiled 2026-08-11. `simulationPeriodic()` exists, but only on `OpModeRobot`/`Robot` — `Mechanism` has no `simulationPeriodic()` hook of its own, so `DriveModule` exposes a plain public `simulatePeriodic()` method and `Robot.simulationPeriodic()` calls it (one line per mechanism, same shape as Lesson 1's scheduler tick). `LinearSystemId.createDCMotorSystem(...)` doesn't exist — real replacement is `org.wpilib.math.system.Models.singleJointedArmFromPhysicalConstants(DCMotor, J, gearing)` (same math, arm and generic-motor systems were always the same equation). `DCMotorSim.getAngularPosition()`/`.getAngularVelocity()` return **radians**/**radians per second**, not rotations/RPM — confirmed by an end-to-end `DriverStationSim`-backed test (`TalonFX.setThrottle(1.0)` through the real physics loop converges on ~100 rot/s, the Kraken X60's true free speed, only once the radians→rotations division is included). See the appendix and `code/v3/lesson-4/`. |
| 5 | Steering P control | Medium | Written and compiled 2026-08-11. `CANcoder` needs a `CANBus` argument now too (`CANcoder(int, CANBus)`, no single-int overload — same shift as `TalonFX`), and `getAbsolutePosition()` needs `.getValue().in(Rotations)` like every other `StatusSignal` since Lesson 3. **The old lesson's `kP = 0.01` is unconditionally unstable against this Phoenix 6 alpha's `DCMotorSim`, confirmed with a real `DriverStationSim`-backed test — not a porting bug, a numeric one.** See [R8](#risks-and-blocking-unknowns) |
| 6 | Distance & commands | Medium | Written and compiled 2026-08-11. The predicted "trivially a `while` loop" landed even cleaner than expected: `coroutine.waitUntil(BooleanSupplier)` (confirmed present, and confirmed by test to be exactly a `while (!condition) yield();` loop) means a finishing command is just a coroutine body that runs out of lines — no `.until(...)`/`.andThen(...)` composition needed at all for the base case. **The real finding is R9**: `.whenCanceled(...)` does **not** fire when a command finishes its coroutine body naturally — confirmed with a real scheduler test — so `driveDistance` is the first command needing cleanup written twice, once inline after `waitUntil` and once in `.whenCanceled(...)`. See [R9](#risks-and-blocking-unknowns) |
| 7 | Four modules | **High** | Written and compiled 2026-08-11. `DriveModule` → `SwerveModule` rename beat lands as predicted, and the aggregate `Drivetrain` takes `DriveModule`'s old spot as a field on `Robot`. Two real API surprises: **`MathUtil.clamp` doesn't exist in this alpha** (no replacement found — the old lesson's "delete yours, use the library" beat is dropped; the hand-rolled `clamp` from Lesson 5 stays for good), and **`SwerveModuleState` doesn't exist** — renamed to `SwerveModuleVelocity` (same `(double, Rotation2d)` shape) as part of a bigger `*State`→`*Velocity`/`*Acceleration` split (`ChassisSpeeds`→`ChassisVelocities`, new `ChassisAccelerations`/`SwerveModuleAcceleration`). **The bigger finding: `SmartDashboard` has no struct/struct-array publish method at all**, so the Swerve-tab payoff needs real `NetworkTableInstance.getStructArrayTopic(...).publish()` — this is the "no `SmartDashboard` one-liner for struct types" gap the Lesson 3 plan doc flagged in advance, arriving here rather than at odometry. Verified end to end: rotate-in-place angles match the documented table exactly, and a real struct-array publish/set cycle doesn't throw. `tools/verify-lessons-v3.sh` needed its first deletion-replay entry (`DriveModule.java`, same file the main course's script already deletes at this exact lesson) — see [R10](#risks-and-blocking-unknowns) |
| 8 | Gyro & heading | Low–Medium | Written and compiled 2026-08-11. `Pigeon2` needed the same `(int, CANBus)` constructor shift as every other Phoenix device since Lesson 1; `getYaw()` needed the same `.getValue().in(Degrees)` unpack as every `StatusSignal` since Lesson 3. No numeric surprise this time — the fake-gyro integration has no momentum to overshoot with, so Lesson 5's/7's kP-mismatch story doesn't repeat; the old lesson's `kP = 0.02` was verified to converge cleanly (well under a second, no overshoot) with a real end-to-end `DriverStationSim`-backed test. `turnToHeading` is the second finishing command (after Lesson 6's `driveDistance`) and the first one whose loop body does real per-tick work instead of just polling — written as an explicit `while` + `coroutine.yield()` rather than `coroutine.waitUntil(...)`, and the lesson explains why: `waitUntil` is exactly this loop shape with no work in the body |
| 9 | Autonomous | **High** | Written and compiled 2026-08-11. The rename landed here as planned (`MyTeleop`→`RobotTeleop`, `MyAuto`→`RobotAuto`, both in place, `tools/verify-lessons-v3.sh` gained the matching deletion entries), and `coroutine.await(...)` got its dedicated contrast against `Command.sequence(...)`, per-mechanism-release explained honestly as "not demonstrable with one mechanism yet, but the shape to reach for." **The load-bearing finding is R11**: there is no `getAutonomousCommand()` hook in this framework at all — `RobotAuto` schedules its own plan via `RobotModeTriggers.autonomous().onTrue(...)` in its constructor, and a real scheduler test (after finding and fixing a test-setup trap, `DriverStationBackend.observeUserProgramStarting()`) confirms this is correctly opmode-scoped: the scheduled auto sequence is cancelled automatically the instant the DS selects a different opmode, the same scoping already protecting every button binding since Lesson 1. `Command.parallel`'s `.optional(...)`/`.requiring(...)` mix (confirmed via bytecode to unify V2's separate `parallel`/`race`/`deadline` into one mechanism) replaces the old lesson's `Commands.deadline`. OD3's Lesson 17-deferred multi-auto decision effectively also landed here in miniature — the old lesson's `LoggedDashboardChooser` bonus section is replaced by a second `@Autonomous` opmode, the framework's native mechanism, since AdvantageKit was never installed in this track to begin with |
| 10 | Kinematics | Low | Written and verified 2026-08-12. `SwerveModuleState`→`SwerveModuleVelocity` and `ChassisSpeeds`→`ChassisVelocities` (fields `vx`/`vy`/`omega`, not the old `*MetersPerSecond`/`omegaRadiansPerSecond` names), `toSwerveModuleStates`→`toSwerveModuleVelocities`, `desaturateWheelSpeeds`→`desaturateWheelVelocities`. **`optimize` is now a pure function, not a mutator** — see [R14](#risks-and-blocking-unknowns) |
| 11 | Odometry & field view | Medium | Written and verified 2026-08-12. `Field2d`/`SmartDashboard.putData` confirmed working, not just source-read. `Odometry.getPoseMeters()`→`getPose()`, no `periodic()` hook to add to (folded into the existing `logTelemetry()` callback instead). **`.until(...)` genuinely simplifies cleanup vs. Lesson 6's `driveDistance`** — see [R16](#risks-and-blocking-unknowns) |
| 12 | Model-based control | Low | Written and verified 2026-08-13. Phoenix 6 config/control-request API ports essentially unchanged (not part of the `org.wpilib` 2027 rename) — `TalonFXConfiguration`, `PositionVoltage`/`VelocityVoltage`, `FeedbackSensorSourceValue.RemoteCANcoder` all confirmed via `javap`. Real end-to-end sim convergence verified for both loops — see [R17](#risks-and-blocking-unknowns) |
| 13 | IO layers & replay | **High** | Written and verified 2026-08-13. Structure (interfaces, Inputs classes, `Constants.Mode` switch, IO implementations) ported clean, with the owning class (`SwerveModule`/`Drivetrain`) `SmartDashboard.putNumber`-ing its own Inputs fields manually instead of `@AutoLog`/`Logger.processInputs`. **Actual replay is deferred** — `REPLAY` stays a dormant, unreachable switch arm, verified via a real test to construct cleanly and leave every reading at its Inputs class's default — see [R1](#risks-and-blocking-unknowns). Also pays off Lesson 7's Try It 4 (named CAN ID/offset constants finally wired into the module array) and deletes `Drivetrain.simulatePeriodic()`/empties `Robot.simulationPeriodic()`, a v3-specific consequence of `Mechanism` having no `simulationPeriodic()` hook of its own — see [R18](#risks-and-blocking-unknowns) |
| 14 | Pose estimator & localizer | Low | Written and verified 2026-08-13. Not a `SubsystemBase` → `Mechanism` rename after all — `Localizer` ships as a **plain class**, since it drives nothing and no command needs to require it; `Scheduler.addPeriodic(Runnable)` gives it a heartbeat with no `Mechanism`-ness needed. `SwerveDrivePoseEstimator`/`VecBuilder`/`Timer.getTimestamp()` all ported clean — see [R19](#risks-and-blocking-unknowns), which also corrects R18's retracted jvmArgs claim with a clean repro |
| 15 | PhotonVision | ~~Medium~~ Low | Written and verified 2026-08-13. Vendordep fetches, compiles, and runtime-verifies clean — `OpModeRobot` integration confirmed working via a real `DriverStationSim`-backed multi-tag detection test, not just "the API compiles." Real finding, not anticipated by this plan: this course's vision-sim has no independent ground truth, so it can demonstrate accurate tracking but not recovering from a bad pose or exposing a miscalibrated camera — see [R20](#risks-and-blocking-unknowns), which also retires the old lesson's "mismeasure the camera" Try It (doesn't work here) with a corrected one that teaches the limitation directly |
| 16 | maple-sim | **Blocking** | 2026-08-13: no longer just unverified — confirmed structurally incompatible with this 2027 alpha by direct test. maple-sim `0.4.0-beta`'s entire public API is typed in the pre-rename `edu.wpi.first.*` namespace, which doesn't exist on this alpha's classpath at all (`org.wpilib.*` only, no compatibility shim); a real attempt to construct `SwerveDriveSimulation` fails with `class file for edu.wpi.first.math.geometry.Pose2d not found`. See [R2](#risks-and-blocking-unknowns). Awaiting user direction on how to proceed. `Robot.simulationPeriodic()`'s "shared world state" exception still has a home on `OpModeRobot`, whenever this unblocks |
| 17 | BLine autos | **High** | BLine's 2027 status still unverified (R2) *and* this is where the resolved multi-`@Autonomous` selection decision (OD3) actually lands — `Autos.buildChooser` retires |
| 18–23 | Elevator … LEDs | Low | `SubsystemBase` → `Mechanism` rename; IO-layer pattern (Lesson 13's spine) is unaffected by this table's changes once Lesson 13 itself is resolved |
| 24 | Superstructure | Medium | `StateMachine` library primitive now exists — recommend keep the hand-rolled enum, reference the library the way the course references `MathUtil.clamp` |
| 25 | Path events | Medium | `Trigger`'s auto-scoping may let the manual `.finallyDo(FollowPath::clearRotationOverride)` handback shrink or disappear — depends on whether BLine v3 exposes a scoped registration path; needs the same source-jar verification this course already applies to BLine |
| 26 | Drive to pose | Low | Mechanically unaffected |
| 27 | Object detection | Medium | `Commands.defer` likely retires in favor of inline coroutine build-then-await — see [Coroutine pedagogy](#coroutine-style-commands-where-they-enter-the-syllabus) |
| 28 | Aim at tag | Low | Mechanically unaffected |
| 29 | Flywheel | Low | Mechanically unaffected |
| 30 | Current limits | Low | `Robot.simulationPeriodic()` still hosts the battery-sim exception |
| 31 | Alerts | Low | `org.wpilib.driverstation.Alert` confirmed present (imported directly by `OpModeRobot` itself) |
| 32 | Testing | Medium | Test harness patterns (`DriverStationSim`, stepping the scheduler) need re-verification against `OpMode`/`Scheduler` instead of `TimedRobot`/`CommandScheduler` |
| 33 | Reading a log | Low | Technique-only lesson, no new Java, but depends on Lesson 13's resolution |
| 34 | SysId | Medium | `SysIdRoutine`'s new package location is unverified |
| aside-setup | Low | Installer/imaging steps change (SystemCore, not roboRIO) — real but mechanical, not urgent |
| aside-git-branching | None | Tool-based, no framework dependency |
| aside-debugger | Low | Breakpoints/stepping unaffected; worked example's lesson reference may need updating |
| aside-odometry-thread | Low | Phoenix 6 `BaseStatusSignal.waitForAll` API; `Mechanism` rename only |
| aside-commands-v3 | **Retired** | Its entire premise ("this is a design doc, none of this code runs") went false — see below |

### Retired: the Commands V3 aside

`docs/lessons/aside-commands-v3.md` was **deleted 2026-08-10** rather than
rewritten in place — it was giving readers wrong information about the state
of the world, and its real content (verified against the shipped API instead
of the design doc) belongs in this plan, not in a standalone aside pretending
to be evergreen. Verified against the real shipped API before deleting it:

- The aside's speculative `run(() -> ...)` V3 rewrite of `home()` is close but
  not quite right — the real builder doesn't let cleanup-after-cancellation
  live inline after a loop; it's a separate, required step. Compare:

  What the aside guessed:
  ```java
  // aside-commands-v3.md's speculative version — NOT the shipped API
  return run(coroutine -> {
    m_io.setVoltage(...);
    while (!atBottomLimit()) { coroutine.yield(); }
    m_io.setVoltage(0);
    // ...
  }).named("Home");
  ```

  What the shipped API actually requires (verified against
  `NeedsNameBuilderStage`/`StagedCommandBuilder`):
  ```java
  return run(coroutine -> {
    m_io.setVoltage(ElevatorConstants.kHomingVolts.in(Volts));
    while (!atBottomLimit()) {
      coroutine.yield();
    }
    acceptBottomLimit();
    m_goal = ElevatorConstants.kBottomLimitHeight;
    m_homed = true;
  })
  .whenCanceled(() -> m_io.setVoltage(0))
  .named("Home");
  ```
  The aside guessed the concept exactly right (a separate cancellation hook is
  required because straight-line code can't guarantee it reaches its own end)
  and even guessed the name almost exactly right — it wrote
  `whenCancelled(Runnable)`; the shipped method is spelled the American way,
  `whenCanceled(Runnable)`, one `l`.
- The design doc's `Command.noRequirements(...)` and `.named(...)` pattern
  shipped essentially unchanged.
- `RobotModeTriggers` (`autonomous()`/`teleop()`/`disabled()`/`utility()`)
  shipped, matching the pattern the aside describes for scoped triggers.
- `StateMachine` — not mentioned in the aside at all — shipped as a full
  library primitive; see [the per-lesson impact table](#per-lesson-impact-assessment) (Lesson 24).

Its §§2–6 *reasoning* (why V3 solves the problems it solves — a procedure
turned inside out because the old framework couldn't wait, a mechanism held
uncommanded by a group that isn't using it, a lifetime nothing tracked) is
not lost — it's accurate and worth carrying forward once the actual v3 lesson
track reaches the equivalent material (today's Lessons 21, 24, and 25), just
written against the real API and with real measurements instead of design-doc
speculation, the same as every other lesson in this course.

---

## Open decisions

Genuinely the user's call, listed with a recommendation where this plan has
one, per the convention of `docs/lesson-plan-16-22.md` and `-23-34.md`.
Resolved items are kept, not deleted, as the record of what was decided —
same convention those two docs use.

### OD1: CommandsV3 installed (resolved)

Swapped 2026-08-10. `code/OpModeV3Robot/vendordeps/CommandsV2.json` → deleted;
`CommandsV3.json` → added, content copied verbatim from
`commandsv3/CommandsV3.json` at `wpilibsuite/allwpilib` tag `v2027.0.0-alpha-6`.
This vendordep is first-party WPILib (`"version": "wpilib"` in its
`javaDependencies` entry, no `mavenUrls`/`jsonUrl`), so it isn't pinned via
the third-party `vendor-json-repo` pattern `CLAUDE.md` documents for vendors
like CTRE/PhotonVision/REV — it ships bundled with the WPILib installation
itself, and the source tree is the authoritative copy to pin against.

### OD2: RobotTeleop rename timing (confirmed)

Confirmed at Lesson 9 (autonomous), for the reasons in
[the transition section](#the-myteleopmyauto--robotteleop-transition). User's
framing: the rename is really about the name no longer sounding like example
code once it's carrying real wiring — which lines up with the Lesson-9
forcing function exactly, since that's the first lesson where it stops being
example code and starts owning shared hardware.

### OD3: multiple Autonomous opmodes (resolved)

Decided: lean into the framework's native multi-opmode selection at Lesson 17
(BLine, multiple named autos) — several small `@Autonomous(name=..., group=...)`
classes, not a single `RobotAuto` with its own internal chooser. `Autos.buildChooser`
and its `LoggedDashboardChooser<Supplier<Command>>` machinery retire outright;
whatever teaching value that factory-lambda pattern carried needs a new home
elsewhere in the syllabus (candidate: the coroutine `await`/`fork` material at
Lesson 9, which already needs a `Supplier`-shaped example).

### OD4: `StateMachine` adoption at Lesson 24 — still open

Recommend **keep the hand-rolled `SuperstructureState` enum** — it's the
course's first enum-with-fields-and-methods-and-exhaustive-`switch` lesson,
and that compiler-enforced-exhaustiveness payoff ("adding a seventh constant
stops the build") is worth protecting. Reference `org.wpilib.command3.StateMachine`
the way the course already references `MathUtil.clamp` after teaching the
by-hand version: "now that you've built one, here's the library's version."

### OD5: use CommandGamepad (resolved)

Decided: use the new generic gamepad API (`southFace()/eastFace()/westFace()/northFace()`,
not any Xbox-specific naming — there is no `CommandXboxController` equivalent
to fall back to anyway). The course keeps assuming a physical Xbox-layout
controller as its target hardware (most student teams have one, and this
matches `README.md`'s existing hardware assumption); only the *method names*
change. State the south/east/west/north ↔ A/B/X/Y mapping once, early — see
the [first-4-lessons plan](lesson-plan-v3-0-3.md) for where.

### OD6: "roboRIO" → "SystemCore" terminology pass — still open

`CLAUDE.md`'s "Target platform" line, `README.md`'s "Hardware assumed"
section, and the `./gradlew deploy` table row ("Deploy to the roboRIO") all
name the old hardware. Recommend a single, mechanical, global find-and-replace
pass done once — but only once the parallel track is far enough along to be
worth calling out as a real target, not preemptively.

---

## Risks and blocking unknowns

Ranked by how much they could invalidate downstream lesson work if they turn
out badly.

- **R1 — no longer blocking; deferred by team decision (2026-08-10).**
  AdvantageKit does not support `OpModeRobot`, quoted directly from
  `wpilibsuite/SystemCoreTesting/AdvantageKit.md` (`v27.0.0-alpha-4`, paired
  with this project's pinned WPILib `2027.0.0-alpha-6`): *"Users can continue
  to use `LoggedRobot`... An equivalent for WPILib's `OpModeRobot` will be
  available in a future release."* This is still true and still worth
  tracking, but it no longer gates the track: the team decided to proceed
  using plain **`SmartDashboard`/`NetworkTables`** in place of AdvantageKit's
  `Logger`, with real replay explicitly deferred to a follow-up pass.
  (WPILib's own `org.wpilib.epilogue` telemetry system was investigated first
  and would have worked — its lower-level backend API is robot-base-agnostic —
  but was dropped the same day as more machinery than the decision needed,
  once replay was already off the table.) See
  [Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables)
  for the full design, verified against real source rather than guessed. The
  where-does-per-tick-logging-go question this entry used to leave open is
  resolved there too: each mechanism's constructor registers its own callback
  via `Scheduler.addPeriodic(Runnable)` (confirmed to exist). **What remains
  open, and is now future work rather than a blocker**: retrofitting real
  replay onto the IO-layer structure once AdvantageKit ships `OpModeRobot`
  support — track AdvantageKit's releases for that, the same way this entry
  originally recommended, just no longer as a precondition for writing
  lessons today.
- **R2 — split three ways as of 2026-08-13: PhotonVision de-risked, maple-sim
  now CONFIRMED BLOCKING (not just unverified), BLine still unchecked.**
  PhotonVision's 2027 alpha vendordep (`photonlib-v2027.0.0-alpha-2.json`,
  `vendor-json-repo/2027_alpha5/`) not only fetches and compiles against
  `code/OpModeV3Robot` — its `OpModeRobot`-specific integration is now
  runtime-verified: a real `DriverStationSim`-backed test built an actual
  `VisionSystemSim`/`PhotonCameraSim`/`PhotonPoseEstimator` pipeline and
  confirmed it produces correct multi-tag pose observations through the full
  `Drivetrain` → `Localizer` → `PhotonVisionPoseProvider` →
  `SwerveDrivePoseEstimator` stack. See R20 for the full findings.

  **maple-sim moved from "unverified" to "confirmed structurally
  incompatible," tested directly against a real GradleRIO 2027 alpha
  project, not inferred.** Its own published vendordep
  (`shenzhen-robotics-alliance.github.io/maple-sim/vendordep/maple-sim.json`)
  declares `frcYear: "2026"` using the *old* schema key — this alpha's
  GradleRIO plugin looks for `wpilibYear` instead, so the unmodified JSON
  fails at plugin-apply time with `Vendor Dependency maplesim has invalid
  year null. Expected to be 2027_alpha5`, before dependency resolution even
  starts. That much could plausibly be patched around (hand-editing in a
  `wpilibYear` key does clear this specific gate, confirmed). **The real
  blocker is one layer deeper and is not patchable**: maple-sim
  `0.4.0-beta`'s compiled API (confirmed via `javap` — e.g.
  `SwerveDriveSimulation`'s constructor, `getModules()`, `getGyroSimulation()`)
  is typed entirely in the pre-rename `edu.wpi.first.*` namespace, and this
  2027 alpha's WPILib distribution ships *only* the renamed `org.wpilib.*`
  packages with no `edu.wpi.first.*` compatibility shim at all. A real
  attempt to construct a `SwerveDriveSimulation` — the exact call this
  lesson's design requires — fails to compile with `cannot access Pose2d:
  class file for edu.wpi.first.math.geometry.Pose2d not found`, because that
  package doesn't exist anywhere on this alpha's classpath, full stop. This
  isn't a naming drift like Phoenix 6/PhotonLib needed; it's two type
  systems that share no common classes for the exact objects (`Pose2d`,
  kinematics types, `Distance`/`Mass` measures) every maple-sim call passes
  across the boundary. **Lesson 16 cannot be ported as designed until
  maple-sim publishes a build compiled against `org.wpilib.*`** — their
  Maven metadata's last update (2026-01-17) predates any indication of
  2027-alpha awareness. Flagged for a user decision on how to proceed (skip
  the lesson for now / write a physics-free interim / wait and retry later)
  rather than resolved unilaterally.

  **BLine remains fully unverified** — distributes from `jitpack.io`, not
  `vendor-json-repo`, and wasn't checked this session (out of scope for the
  maple-sim investigation; gates Lesson 17, immediately next). Each of
  these two gates a meaningful chunk of the back half of the course
  (Lessons 16–17, 22, 25–28).
- **R3 — pin confirmed, and API confirmed too, by actually compiling against
  it.** Phoenix 6's 2027 alpha vendordep for this project's WPILib version is
  `Phoenix6-26.50.0-alpha-1.json` (with a matching
  `Phoenix6-replay-26.50.0-alpha-1.json` for AdvantageKit-replay support —
  encouraging, once R1 clears), both in `vendor-json-repo/2027_alpha5/`.
  CTRE's own compatibility notes still list documented gaps: Motioncore CAN
  buses aren't supported yet (only SystemCore-native buses and CANivore), and
  there's no Sendable replacement yet, pending WPILib's Telemetry API —
  identified as Epilogue (see
  [Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables)).
  Neither gap blocks this course's TalonFX usage. **Real API changes found by
  `javap`-inspecting the downloaded jar** (`tools/verify-lessons-v3.sh`,
  2026-08-11) that Lessons 1–3 now reflect: `TalonFX` has **no `.set(double)`
  method at all** — it's `setThrottle(double)` (duty cycle, what this course
  uses) or `setVoltage(double)`/`setVoltage(Voltage)`; `CANBus.systemcore(int)`
  is lowercase; and `StatusSignal.getValueAsDouble()` is gone, replaced by a
  typed `getValue()` returning the signal's actual `Angle`/`AngularVelocity`
  measure — see the appendix and R7 below for what that costs the syllabus.
- **R4:** Everything cited in this plan is alpha software. An API fact
  verified today against `v2027.0.0-alpha-6` is not guaranteed to hold at
  alpha-7 or at a stable 2027 release.
- **R5 — RESOLVED 2026-08-11.** `code/OpModeV3Robot/build.gradle` targets
  `JavaVersion.VERSION_25`, confirmed load-bearing: this sandbox only had
  Java 21 installed, and `compileJava` needs 25 specifically —
  `apt-get install openjdk-25-jdk-headless` was required before anything
  would build. Once installed, `run(coroutine -> { ...; coroutine.park(); })`
  bodies from Lesson 1 **compiled clean with no `--enable-preview` flag and
  no warning**, so whatever `org.wpilib.command3.Continuation` needs from the
  JDK's continuation support, it's handled inside the library and doesn't
  leak into how student/lesson code is written or compiled.
- **R6 — RESOLVED 2026-08-11.** `tools/verify-lessons-v3.sh` now exists and
  Lessons 0–3 compile through it against the real pinned jars. Kept here as
  the record of what was required, matching this repo's convention of
  keeping resolved risks rather than deleting them.
- **R7 — new, found while verifying Lesson 3, not anticipated by this plan.**
  `StatusSignal.getValueAsDouble()` doesn't exist in this Phoenix 6 alpha —
  confirmed by `javap` against the real jar. Reading *any* Phoenix 6 sensor
  now requires `.getValue().in(SomeUnit)`, which means a WPILib `Measure`
  unpack is unavoidable as early as Lesson 3. This course's existing rule —
  "Units get peppered in from Lesson 10 on, after the by-hand math has been
  taught, never before" — was written for a stack where `getValueAsDouble()`
  let students avoid `Measure`s until then. Lesson 3 handles this by teaching
  `.in(Rotations)` as a small, self-contained idea ("a measurement that
  remembers its own unit") without pulling in the rest of the Units
  philosophy, but whoever drafts the v3 track's later lessons should
  re-examine whether the whole "Units from Lesson 10" sequencing decision
  needs to move earlier for this stack, now that the API itself forces a
  taste of it well before then. Not resolved here — flagged for whoever
  plans Lessons 4 onward.
- **R8 — new, found while verifying Lesson 5, and possibly relevant to the
  existing (2026, roboRIO) course too, not just this port.** The old Lesson
  5's steering numbers — `kP = 0.01`, steering inertia `0.004 kg·m²`,
  "pretend 1:1" gearing, direct-drive Kraken X60, a 20 ms control period —
  are **unconditionally unstable** against this alpha's `DCMotorSim`, not
  merely "aggressive." Confirmed with a real `DriverStationSim`-backed test
  (real `Thread.sleep(20)` per tick, matching R3's/Lesson 4's finding that
  Phoenix's simulated firmware runs in real time): commanding `steerToAngle(90)`
  from rest never settles — position swings by thousands of degrees within
  a few seconds, output pinned at ±100%, whether or not the error is wrapped
  to ±180°. Binary-searching `kP` downward found a real stability boundary:
  `kP = 0.0005` converges cleanly (settles within ~90° ± a few degrees by
  5 s, ~90.0° by 9 s); `kP = 0.001` oscillates without settling; `kP = 0.002`
  is clearly unstable. **The physics model itself is not the suspect** — it's
  the same underlying state-space equations under a renamed factory (see the
  Lesson 4 appendix rows), and a direct-drive Kraken X60 (100 rot/s free
  speed, 7+ N·m stall torque) swinging a 0.004 kg·m² load is simply too fast
  and too torque-dense for a P-only loop sampled at 50 Hz to tame at
  `kP = 0.01` — a gain that was, empirically, already deep into "wildly
  unstable" rather than at the "start here" edge the old lesson's tuning
  ritual assumes. Lesson 5 as written here ships the empirically-verified
  `kP = 0.0005`, with the walkthrough's worked numeric example and tuning
  guidance rewritten to match (start at `0.0005`, doubling toward `0.001`
  visibly oscillates, `0.002` is clearly too far). **Not verified against the
  existing 2026-track course** — that course's `code/lesson-5/subsystems/DriveModule.java`
  uses the identical `kP`, inertia, and 1:1-gearing numbers against
  WPILib's older `DCMotorSim`/`LinearSystemId`, which use the same
  state-space math, so the same instability plausibly exists there too, but
  this was not run against the old course's own tooling to confirm — flagged
  for whoever owns that course's Lesson 5, not fixed here.
- **R9 — new, found while verifying Lesson 6, confirmed with a real scheduler
  test, not inferred from the name.** `Command.whenCanceled(Runnable)` does
  **not** run when a command's coroutine body finishes on its own — only when
  something external interrupts it first. A minimal scheduler test proved
  this directly: a `noRequirements(...)` command whose body does nothing but
  `coroutine.waitUntil(...)` and returns was confirmed `!isRunning()` the
  tick its condition became true, while a `.whenCanceled(...)` callback
  attached to an identical command **never fired** across the same run — no
  external cancel ever happened, so the "canceled" hook stayed silent. This
  is a real, sharp-edged divergence from V2's `Command.finallyDo(...)`, which
  this course's existing lessons rely on firing "for any reason." Every
  command through Lesson 5 (`driveAtSpeed`, `driveWithJoystick`,
  `steerToAngle`) never finishes on its own, so this never mattered before —
  they only have the "canceled" ending, and `.whenCanceled(...)` covers it
  completely. Lesson 6's `driveDistance` is the first command with **two**
  endings, and needs cleanup written at *both* the natural end of the
  coroutine body and inside `.whenCanceled(...)` — the lesson teaches this
  explicitly rather than letting a student discover a silent bug (a motor
  that doesn't stop, exactly once, only on the interrupted path). Whoever
  writes later lessons with finishing commands (autonomous routines, Lesson
  9's equivalent) needs to carry this rule forward: **one cleanup path per
  ending, not one cleanup path for "the command is over."**
- **R10 — new, found while verifying Lesson 7, includes one predicted
  finding arriving early.** Three things, all confirmed by `javap` and/or a
  real test, none guessed:
  - **`MathUtil.clamp(double, double, double)` does not exist in this
    alpha.** Confirmed via a full, unfiltered `javap -p` of `org.wpilib.math.util.MathUtil`
    — `lerp`, `inverseLerp`, `applyDeadband` (still present, matching the
    existing Lesson 2 callout), `copyDirectionPow`, `inputModulus`,
    `angleModulus`, `isNear`, `slewRateLimit`, and nothing named `clamp`.
    The old lesson's "delete your hand-rolled clamp, use the library" beat
    doesn't have a library to point at here, so Lesson 7 keeps the private
    `clamp` from Lesson 5 permanently rather than teaching a swap that isn't
    available.
  - **`SwerveModuleState` doesn't exist.** WPILib's 2027 alpha renamed the
    whole family: `SwerveModuleState` → `SwerveModuleVelocity` (identical
    `(double, Rotation2d)` constructor and field shape, confirmed via
    `javap`), alongside a new `SwerveModuleAcceleration`, and `ChassisSpeeds`'s
    presumed analog is `ChassisVelocities` with a sibling `ChassisAccelerations`
    — acceleration tracking that didn't exist in the pre-2027 API at all.
    `Translation2d`, `Rotation2d`, and `SwerveDriveKinematics` itself are all
    confirmed present and unchanged in shape.
  - **The real finding: `SmartDashboard` has no struct or struct-array
    publish method** (`javap` shows only `putNumber`/`putBoolean`/`putString`/
    three array-of-primitive overloads/`putRaw`/`putData` — nothing
    struct-aware). This is exactly the gap `docs/lesson-plan-v3-0-3.md`'s
    Lesson 3 section flagged in advance ("no `SmartDashboard` one-liner the
    way AdvantageKit/Epilogue offered... flagged so it's not rediscovered as
    a surprise when the odometry/field-view lessons arrive") — it arrived
    one lesson earlier than predicted, at the Swerve-tab visualization
    instead of odometry. The real fix, confirmed working end to end:
    `NetworkTableInstance.getDefault().getStructArrayTopic(name, SwerveModuleVelocity.struct).publish()`
    once, as a field, then `.set(array)` every tick — bypasses `SmartDashboard`
    entirely, publishing at NT root rather than under `/SmartDashboard/`.
    Verified with a real `StructArrayPublisher<SwerveModuleVelocity>` test
    (`.set(...)` called twice with real values, no exception) and a separate
    test confirming the `rotate()` angle math matches the lesson's own
    documented table (135°/45°/-135°/-45°) exactly. **This same gap will
    recur** at every future structured-telemetry point (`Pose2d` at Lesson 11's
    equivalent, vision observations, etc.) — whoever plans those lessons
    should reuse this pattern rather than rediscovering it.
  - **Tooling note, not an API finding:** `tools/verify-lessons-v3.sh`
    needed its first deletion-replay entry to handle `DriveModule.java`
    being renamed to `SwerveModule.java` — the same file, at the same
    lesson number, the main course's `verify-lessons.sh` already deletes
    (`del 7 subsystems/DriveModule.java # became SwerveModule`). Added a
    matching `del()` mechanism to the v3 script rather than inventing a
    different shape, and updated the script's header comment, which had
    claimed "nothing has been deleted across Lessons 0-3 yet."
- **R11 — new, found while writing Lesson 9, the single most safety-relevant
  finding in this port so far.** This framework has **no `getAutonomousCommand()`
  hook, no `TimedRobot`-style auto-scheduling of any kind** — confirmed by
  the complete absence of anything like it anywhere in `OpModeRobot`'s
  method list (already fully enumerated for R-earlier findings). An
  `@Autonomous` opmode has to schedule its own plan itself. The obvious first
  instinct — call `Scheduler.getDefault().schedule(cmd)` directly from
  `start()` — is a real leak: `Scheduler.schedule(Command)` (confirmed via
  `javap`) takes no scope parameter at all, and a scheduler test proved a
  command scheduled that way keeps running (`isRunning() == true`)
  indefinitely, with no automatic cancellation when the opmode that scheduled
  it stops being selected. **The correct, verified-safe pattern**: bind the
  plan through a `Trigger` — `RobotModeTriggers.autonomous().onTrue(plan)` —
  created inside the opmode's own constructor. A real scheduler test
  (`Scheduler.getDefault()`, an always-true `Trigger` bound with both
  `.onTrue(...)` and separately `.whileTrue(...)`, opmode ID flipped via
  `DriverStationSim.setOpMode(long)`) confirms the bound command is
  **actually cancelled** — not merely prevented from re-firing — the instant
  the opmode ID changes, for both binding types. This closes the loop this
  plan doc's rename section flagged as still-open (see above) and is the
  reason `RobotAuto` in Lesson 9 schedules its plan via
  `RobotModeTriggers.autonomous().onTrue(...)` in its constructor rather than
  a raw `.schedule(...)` call in `start()`.

  **A real testing trap surfaced along the way, worth not rediscovering:**
  the very first version of this test showed the command staying scheduled
  *regardless* of the opmode-ID change — looking exactly like R11's danger
  was real. The actual cause: `RobotState.getOpModeId()` silently returns
  `0` forever, no matter what `DriverStationSim.setOpMode(long)` reports,
  unless `org.wpilib.driverstation.internal.DriverStationBackend.observeUserProgramStarting()`
  has been called first — a flag `OpModeRobot.startCompetition()` sets for
  you on a real robot, with no equivalent in a bare `HAL.initialize(...)`
  test. Once that one extra call was added, the opmode-ID change was
  correctly observed and the scope-cancellation fired as expected. Any
  future test that manipulates simulated opmode ID needs this call first, or
  it will silently look like opmode scoping doesn't work at all.

  **Also confirmed while building Lesson 9's `Autos.driveTurnDrive`:**
  `Command.parallel(cmds...)` is exactly `new ParallelGroupBuilder().requiring(cmds)`
  and `Command.race(cmds...)` is exactly `.optional(cmds)` (both confirmed by
  `javap -c` disassembly of `Command`'s static factories) — `ParallelGroupBuilder`'s
  `.optional(...)`/`.requiring(...)` split is the one real primitive
  underneath, and V2's three-way `parallel`/`race`/`deadline` split
  collapses into "required commands decide when the group ends; optional
  commands just ride along and get cancelled when it does." Mixing
  `Command.parallel(deadlineCmd).optional(others...)` reproduces V2's
  `Commands.deadline(deadlineCmd, others...)` exactly, with no separate
  method needed. Confirmed too: `coroutine.await(cmd)` inside a
  `Command.noRequirements(...)` body runs steps in the same order a
  `Command.sequence(...)` group would (verified with a real scheduler test
  tracking execution order across two mechanism-requiring sub-commands), and
  a default command bound to that mechanism does **not** sneak in during the
  brief gap between one awaited step finishing and the next one starting —
  also verified directly, not assumed from the "each mechanism released
  between steps" design description.
- **R12 — retrofitted 2026-08-12, prompted by a direct user question ("the
  command names should be getting logged... are we missing something?"),
  not found during a verification pass.** Lesson 1's text makes a promise at
  `.named(...)` — "it's how you'll recognize your own commands later, in
  logs and on screen" — and, through Lesson 9, nothing had ever delivered on
  it. Root cause, confirmed via `javap`: unlike V2's `CommandScheduler`,
  which implements `Sendable` and gets its running-command list published
  to NetworkTables for free with one `SmartDashboard.putData(...)` call,
  this alpha's `Scheduler` implements only `ProtobufSerializable` — no
  Sendable, no free path to "what's running" anywhere.

  **The fix, retrofitted at the point the promise is made rather than
  deferred:** `Robot` gained a `logRunningCommand()` method —
  `Scheduler.getDefault().getRunningCommandsFor(module).get(0).name()`
  published via `SmartDashboard.putString(...)` — called from
  `robotPeriodic()` immediately after `Scheduler.getDefault().run()`.
  Verified two things empirically before shipping it, not assumed:
  - **Call-order safety.** `getRunningCommandsFor(mechanism)` returns an
    **empty** list before the scheduler has ever ticked (confirmed with a
    real test) — `.get(0)` on that would throw. Confirmed separately that
    calling it *immediately after* a single `Scheduler.run()` is always
    safe: a mechanism's own auto-installed `idle()` default is already
    populated by then, every time, including the very first tick and
    immediately after any cancellation. This is why the method has to be
    the second line of `robotPeriodic()`, never the first.
  - **The idle command's real name.** `Mechanism`'s fallback command isn't
    named bare `"[IDLE]"` — a real end-to-end test through `Robot` and the
    actual `DriveModule` class showed `"DriveModule[IDLE]"`, i.e. the
    mechanism's own class name prefixed. (An earlier test with an anonymous
    `new Mechanism() {}` had shown bare `"[IDLE]"`, which is consistent
    once you know anonymous classes have an empty simple name — worth
    knowing so this isn't rediscovered as a discrepancy.) Lesson 1's text
    was written and verified against the real value, not the
    first-guessed one.

  Because `Robot.java` is fully redefined at four points (Lessons 1, 3, 4,
  7), the retrofit touched all four snapshots, plus Lesson 7's text (which
  had claimed "nothing else about `Robot` changes" — no longer true, and now
  also needs the `module`→`drivetrain` rename applied to this method, log
  key included, matching that lesson's `Drivetrain/`-prefixed convention).

  **Explicitly flagged for revisiting, per the user's request, not resolved
  as a final design**: this is a small, direct, one-command-at-a-time
  answer to "what's running right now," deliberately scoped to avoid
  forward-referencing collections/streams machinery this early (only
  `List<Command>` + `.get(0)`, no loop, no stream — safe because "one
  command per mechanism" guarantees the list never holds more than one
  entry). The scheduler's own richer event system (`SchedulerEvent`'s seven
  subtypes — `Scheduled`/`Mounted`/`Yielded`/`Completed`/`CompletedWithError`/
  `Canceled`/`Interrupted`, each carrying the `Command` and a timestamp, via
  `Scheduler.addEventListener(...)`) is confirmed to exist and would support
  real command *history* (when something started, why it ended) rather than
  a live snapshot — intentionally not used here, and intentionally not
  taught yet. Revisit once there's a real telemetry story worth building it
  into, rather than bolting event-listener machinery onto Lesson 1.

  **Superseded 2026-08-12 by R13, sooner than "revisit later" implied** —
  the deferred event-listener approach turned out not to be a nicety, it
  was fixing a real bug. See below.
- **R13 — found and fixed 2026-08-12, following up on a user suggestion
  ("the scheduler event listener is the right approach... it might be a
  better beat to place in lesson 3... explain why it's better at catching
  one-shot commands than what we did in lesson 1").** Went in expecting to
  write a nicer pedagogical example. Came out finding that R12's polling
  fix has a real, reproducible crash in code this track had already
  shipped — not a hypothetical.

  **The bug, confirmed with a real test against the actual Lesson 8/9
  classes, not a contrived one.** Lesson 8 binds
  `southFace().onTrue(turnToHeading(90))`. `turnToHeading`'s body is `while
  (Math.abs(headingError(target)) >= 2.0) { ...; coroutine.yield(); }` — if
  the heading error is already under 2° the instant the command is
  promoted, the loop body never runs, so the coroutine finishes with
  **zero** `yield()` calls, on the exact same `Scheduler.run()` tick it was
  scheduled. The sim `Pigeon2` starts at 0°, so `turnToHeading(0)` (Lesson
  8's `eastFace()` binding) hits this on a stock sim the very first time
  it's pressed — not an edge case, the obvious first thing a student tries.
  A real test scheduling that exact command and then calling
  `robotPeriodic()` (i.e., R12's `logRunningCommand()`) reproduces
  `ArrayIndexOutOfBoundsException` on `.get(0)`, every time.

  **Root cause, and a correction to R12's own finding.** R12 claimed
  `getRunningCommandsFor(mechanism)` is "always populated immediately after
  any `run()`, including immediately after any cancellation" — true for
  every case tested at the time (something else pre-empting the current
  command), but **not general**. Traced via `javap -c` on `Scheduler.run()`:
  the tick order is `cancelStaleBindings → unbindStaleTriggers →
  runPeriodicSideloads → eventLoop.poll() (triggers fire here) →
  scheduleDefaultCommands() → promoteScheduledCommands() → runCommands()`.
  A trigger firing during `poll()` gets promoted and stepped later in that
  *same* tick — so if it finishes with zero yields, `runCommands()` removes
  it and nothing puts the idle default back until `scheduleDefaultCommands()`
  runs again on the **next** tick, which already happened earlier in this
  one. Net effect, confirmed with a real test: `getRunningCommandsFor` can
  return a genuinely **empty** collection for one tick, not just a stale
  one.

  **A second correction, needed to design the real fix.** The first
  instinct was to filter the event stream on `SchedulerEvent.Mounted`
  (a command becoming the one actively stepped). Wrong signal — confirmed
  with a real test logging every event across several ticks of an unchanged,
  parked command: `Mounted` (and its `Yielded` counterpart) fire **every
  single tick** a command is the one being stepped, changed or not. The
  right signal is `SchedulerEvent.Scheduled`, confirmed with a dedicated
  test holding a mechanism idle across several ticks then handing it to a
  one-shot command and back: `Scheduled` fires exactly **once**, at the
  instant a command — including the idle default re-taking over — begins
  controlling a mechanism, and does not refire while it continues unchanged.

  **The fix, landed at Lesson 3 instead of staying deferred, per the user's
  suggestion.** `Robot`'s constructor registers
  `Scheduler.getDefault().addEventListener(this::logCommandStart)`;
  `logCommandStart(SchedulerEvent event)` does
  `if (event instanceof SchedulerEvent.Scheduled scheduled && scheduled.command().requires(module))`
  — new syntax (`instanceof` pattern matching) plus a previously-undocumented
  `Command.requires(Mechanism)` default method, confirmed via `javap`, that
  filters the scheduler's one shared, robot-wide event stream down to a
  single mechanism. Same `SmartDashboard` key as before,
  `getRunningCommandsFor`/`List<Command>`/`.get(0)` gone entirely — there is
  nothing left that can be asked about an empty collection, because nothing
  is asked at all.

  **Verified beyond the unit scale, matching this track's own bar.** A real
  `Trigger`-bound `whileTrue` press/hold/release cycle across many ticks
  (mirroring Lesson 1's actual binding) shows no spurious re-announcements
  while held or while idle, and correctly flips on press and release. The
  turnToHeading(already-there) scenario was re-run against the **actual
  rolled-forward Lesson 9 `Robot`/`Drivetrain` classes** produced by
  `tools/verify-lessons-v3.sh 9`'s own sandbox — real constructor, real
  registered listener, real `robotPeriodic()` call — and no longer throws.

  **Cascade, narrower than R12's.** Lesson 1's code and text are
  deliberately **unchanged** — its polling version is still the honest
  first pass, and it's genuinely safe for everything taught through
  Lesson 2 (every command either parks or loops forever). Lesson 1 gained
  one blockquote naming Lesson 3 by number instead of "a later lesson."
  The event-based version lands at Lesson 3 (new code, new lesson section)
  and cascades through the two remaining `Robot.java` redefinition points,
  Lessons 4 and 7 (Lesson 7's text also updates its `module`→`drivetrain`
  rename callout, same as R12's cascade, just against the new method name).
  Lessons 8 and 9 needed no changes — they inherit Lesson 7's `Robot.java`
  unmodified, which is exactly what makes the fix land before Lesson 8's
  `onTrue(turnToHeading(...))` ever ships with the crash-prone version.

  **Addendum, 2026-08-12, same day — the per-lesson rename churn this
  whole cascade kept hitting (R12 touched 4 files, R13 touched 3) is now
  closed structurally, on user direction.** `logCommandStart` at Lesson 3
  and 4 still checks one mechanism by name (`requires(module)`) — the
  right call there, since no loop construct exists yet in the taught
  vocabulary (confirmed: Lesson 5's Try It #1 is explicitly "your first
  `while` loop," and Lesson 7 §3 explicitly introduces the array and the
  enhanced `for` as new). But **at Lesson 7**, right where the enhanced
  `for` is already being taught for `m_modules`, `logCommandStart` is
  rewritten to loop over `scheduled.command().requirements()` (the `Set`
  behind Lesson 3's `requires(...)`) and build its dashboard key from
  `Mechanism.getName()` instead of a hardcoded string — confirmed via
  `javap` (`public java.lang.String getName()`) and a real test
  (`new Drivetrain().getName()` returns exactly `"Drivetrain"`, the same
  prefix `idle()` already put in front of `"[IDLE]"`). From Lesson 7 on,
  `Robot` never needs to be told about a mechanism by name again — the
  method that used to need a rename cascade at every `Robot.java`
  redefinition point now needs none, for however many mechanisms this
  track ends up with. Verified against the real rolled-forward Lesson 9
  classes, same as the fix above: `robotPeriodic()` still doesn't throw on
  the instantly-finishing `turnToHeading(0)` scenario with the generic
  version in place.
- **R14 — new, found while writing Lesson 10, all confirmed by `javap`/`javap -c`
  and real tests, not ported unchecked from the old lesson.** The kinematics
  family renamed harder than a simple `State`→`Velocity` swap:
  `ChassisSpeeds` is gone too, replaced by `ChassisVelocities` — and its
  fields are `vx`/`vy`/`omega` (plain, short names), not the old
  `vxMetersPerSecond`/`vyMetersPerSecond`/`omegaRadiansPerSecond`. Method
  names shifted to match: `SwerveDriveKinematics.toSwerveModuleStates` →
  `toSwerveModuleVelocities`, `desaturateWheelSpeeds` →
  `desaturateWheelVelocities` (confirmed to still have the `LinearVelocity`-
  typed overload the old lesson relied on, so `kMaxSpeed` still passes
  through as-is).

  **The one finding that would have silently broken a faithful port:**
  `SwerveModuleVelocity.optimize(Rotation2d)` is a **pure function** in this
  alpha — confirmed via `javap -c` disassembly (`new SwerveModuleVelocity(...)`
  then `areturn`, `this` never touched) and a real test (`original.velocity`/
  `original.angle` unchanged after calling `.optimize(...)` on it). The old
  lesson's code called `states[i].optimize(...)` and then used `states[i]` as
  if the call had mutated it in place — that exact line, ported unchanged,
  would compile, run, and silently do nothing (the optimized value discarded,
  the module commanded with the un-optimized state). The correct call is
  `states[i] = states[i].optimize(...)`, and Lesson 10's text calls this out
  by name as "a real trap," not a drive-by mention. `optimize`'s actual logic
  was also disassembled and confirmed to match the old lesson's description
  exactly: flips both the drive sign and rotates the angle 180° when the
  angle delta exceeds 90°, otherwise passes through unchanged.

  **A second pure-function discovery, not used but recorded:**
  `SwerveModuleVelocity.cosineScale(Rotation2d)` — confirmed via `javap -c`
  to compute `velocity * cos(angle - currentAngle)` and return a new value —
  is a native replacement for the hand-rolled cosine-compensation trick
  Lesson 9 already built into `SwerveModule.setDesiredState`. Not adopted:
  moving it would touch the P-control logic it sits beside for no real gain,
  and the lesson says so directly rather than silently ignoring a real
  library method a maintainer might later wonder about.

  **Field-relative conversion also changed shape, not just name.** The old
  `ChassisSpeeds.fromFieldRelativeSpeeds(fieldSpeeds, robotAngle)` (a static
  factory) is gone; the replacement is `fieldSpeeds.toRobotRelative(Rotation2d)`
  — an **instance** method on the field-relative value itself, also
  confirmed pure (returns a new `ChassisVelocities`, per its own `javap -c`
  disassembly, matching `optimize`'s and `cosineScale`'s shape). Verified
  with a real test computing the hand-expected rotation (a robot facing 90°
  converts field-forward `(1, 0, 0)` to robot-relative `(≈0, -1, 0)`,
  confirmed algebraically and by the library call agreeing exactly), then
  re-verified through the **entire real pipeline** — `Drivetrain`,
  `SwerveModule`, TalonFX sim, Pigeon2 sim — with a `DriverStationSim`-backed
  test forcing the gyro to 90° and confirming all four modules steer to
  -90° after settling.

  **A testing trap surfaced while building that last test, worth recording
  so it isn't rediscovered:** forcing `Pigeon2SimState.setRawYaw(...)`
  directly and then calling `Drivetrain.simulatePeriodic()` in the same test
  loop doesn't hold — `simulatePeriodic()` re-derives the raw yaw every tick
  from `m_simHeadingDegrees` (integrating `m_lastCommandedOmega`), so it
  stomps the manually-forced value back toward wherever that shadow field
  already was, the very next tick. A test that wants to force the gyro and
  *also* run `simulatePeriodic()` afterward has to set both the sim state
  and the private `m_simHeadingDegrees` field together, or the forced value
  never survives past the first simulated tick. This is specific to test
  methodology, not a lesson-code bug — `RobotTeleop`/match code never forces
  the gyro this way.

  Also reconfirmed rather than assumed: `MathUtil.inputModulus`'s exact
  signature and wrap behavior (a real test double-checked the lesson's own
  350°→0° example), and that `Rotation2d.fromDegrees(190).getDegrees()`
  reports back `-170`, not `190` — `Rotation2d` normalizes internally,
  which is `Rotation2d`'s own behavior and nearly read as a bug in
  `optimize` during this investigation before the cause was traced.
- **R15 — new, 2026-08-12, prompted by a user question about incorporating a
  record-pattern `switch` over `SchedulerEvent` (attributed to a WPILib
  developer recommendation) into the command logging from R12/R13.** Two
  things confirmed, one a real compile bug in the suggested snippet as
  given, not a style nitpick:
  - **`SchedulerEvent` is genuinely `sealed`, not just "seven record
    subtypes" as R12's appendix row phrased it.** Confirmed from the raw
    classfile (`javap -v`), not inferred: a `PermittedSubclasses` attribute
    lists all seven — `Scheduled`, `Mounted`, `Yielded`, `Completed`,
    `CompletedWithError`, `Interrupted`, `Canceled` — exactly. `javap -p`'s
    plain interface header doesn't print the `sealed`/`permits` keywords,
    which is why R12's row undersold this; the attribute is definitive.
  - **The suggested snippet — a `switch` covering only `Scheduled`/
    `Mounted`/`Yielded`/`Completed`, no `default` — does not compile.**
    Reproduced directly: `error: the switch statement does not cover all
    possible input values`. Sealed-type exhaustiveness is real and the
    compiler enforces it; a pattern `switch` over `SchedulerEvent` needs
    either all seven `case` arms (record-deconstructed, and note
    `CompletedWithError`/`Interrupted` have three components — an extra
    `error`/`interrupter` — not two like the other five) or an explicit
    `default -> {}`. Both fixes verified to compile. Also verified at
    runtime with a real scheduler test: the deconstruction pattern
    (`case Scheduled(var cmd, var time) -> ...`) correctly binds `cmd` and
    `time` to the record's real components, including a genuine positive
    microsecond timestamp — not a syntax risk, just the exhaustiveness gap.

  **Assessment, not adopted into any shipped lesson:** the style itself is
  good, idiomatic modern Java for a closed hierarchy of event records, and
  runtime-verified correct. But it bundles several concepts this course
  hasn't taught anywhere yet — `switch` as an expression/statement, record
  deconstruction patterns, and sealed-type exhaustiveness — well past
  Lesson 3's single `instanceof` check on one record type. It's exactly the
  "richer event system" R12 already named and deferred ("once there's more
  worth logging and a better answer for where structured history like that
  should live"), not a drop-in replacement for the live-snapshot logging
  Lessons 3–7 actually need. **Recorded here as the concrete recommended
  shape for that already-deferred future lesson**, exhaustiveness caveat
  included, rather than left as an abstract "revisit later."
- **R16 — new, found while writing Lesson 11, all confirmed by `javap` and
  real tests, not ported unchecked from the old lesson.** Odometry itself
  ported mechanically clean — `SwerveModulePosition`, `SwerveDriveOdometry`,
  and `Pose2d` all exist under `org.wpilib.math.*` with the same shapes the
  old lesson used. Three real findings, none of them "it just works":

  **`Odometry<T>.getPoseMeters()` is gone — it's `getPose()` now.**
  Confirmed via `javap` on the parent `Odometry<T>` class (`SwerveDriveOdometry`
  extends it and inherits the getter unchanged). A verbatim port of the old
  lesson's `m_odometry.getPoseMeters()` would fail to compile, not silently
  misbehave — the safer kind of API break, but still one that had to be
  caught before shipping.

  **No `periodic()` to add odometry's per-tick update to.** This track's
  `Mechanism` has never had one (established since Lesson 3/4) —
  `Drivetrain` feeds everything through the `logTelemetry()` callback
  already registered in its constructor. The old lesson's "add to
  `Drivetrain.periodic()`" instructions don't have a literal target here;
  Lesson 11 folds the odometry update into the existing `logTelemetry()`
  instead and says so directly, rather than silently renaming the
  instruction and hoping nobody notices the mismatch.

  **`.until(BooleanSupplier)` genuinely simplifies cleanup, verified with a
  real scheduler test, not assumed from the name.** Two things confirmed
  that weren't obvious going in: (1) `NeedsNameBuilderStage.until(...)` (the
  builder-stage overload, called before `.named(...)`) is a different method
  from `Command.until(...)` (the already-built-`Command` overload, which
  wraps in a `ParallelGroupBuilder` and needs a second `.named(...)`) — using
  the builder-stage one lets `driveToPose` stay a single `.named(...)` call
  at the end of one chain. (2) **`.whenCanceled(...)` fires every time
  `.until(...)` stops a command** — confirmed with a real test tracking both
  a tick counter and a `whenCanceled`-fired flag across the condition
  flipping true — which is a genuine, useful contrast with R9's Lesson 6
  finding (`.whenCanceled` does *not* fire when a coroutine body finishes
  naturally on its own). `.until(...)`'s finish is implemented as an
  interruption under the hood, not a natural finish, so it always fires the
  cleanup — meaning `driveToPose` needs exactly one `.whenCanceled(...)`
  callback covering both "reached the target" and "got interrupted," unlike
  `driveDistance`'s two separate cleanup paths in Lesson 6. Also confirmed:
  when the `.until(...)` condition is already true the instant the command
  is scheduled, the body still runs one tick before finishing (checked
  after each tick, not before) — not a zero-tick instant-complete case like
  R14's `turnToHeading` finding.

  **A real numeric correction to the old lesson's own Try It, not
  carried over unchecked.** The old lesson's Try It #3 claims
  `target.getRotation().minus(current.getRotation())` for a robot at −170°
  with a target at +170° "should read about +20°." A real test of the exact
  same expression in this alpha's `Rotation2d` gives **−20.0°**, not +20° —
  confirmed numerically, not a sign-convention guess. Lesson 11's Try It
  ships the verified value.
- **R17 — new, found while writing Lesson 12, verified against real jars
  and real simulated convergence, not ported from the old lesson on
  trust.** Phoenix 6 sits outside the `org.wpilib` 2027 rename entirely —
  `com.ctre.phoenix6.*` package names are untouched — so `TalonFXConfiguration`,
  `FeedbackConfigs` (`FeedbackRemoteSensorID`/`FeedbackSensorSource`/
  `RotorToSensorRatio`/`SensorToMechanismRatio`), `ClosedLoopGeneralConfigs.ContinuousWrap`,
  `Slot0Configs` (`kP`/`kV`), `PositionVoltage`/`VelocityVoltage`, and
  `FeedbackSensorSourceValue.RemoteCANcoder` all confirmed via `javap` to
  match the old lesson's API shape exactly — the config/control-request
  story ports essentially unchanged. What needed real work was everything
  that touches this track's own established conventions rather than
  Phoenix directly:

  - **The old lesson's `getValueAsDouble()`/`getAngularPositionRotations()`/
    `getAngularVelocityRPM()` calls don't exist in this alpha.** The first
    was already retired track-wide since Lesson 3 (`.getValue().in(Unit)`
    instead); the latter two are old-API `DCMotorSim` convenience methods
    that were never carried into `org.wpilib.simulation.DCMotorSim`
    (confirmed via `javap` — only `getAngularPosition()`/`getAngularVelocity()`,
    both in radians/rad-per-sec, per the Lesson 4 finding). The CANcoder's
    sim feed uses the same `/(2 * Math.PI)` conversion the rotor feed
    already uses two lines above it, rather than a same-named convenience
    method that isn't there.
  - **A real, additional deletion the old lesson didn't need**: because
    this alpha has no `MathUtil.clamp` to graduate to (R10), `SwerveModule`
    had its own private `clamp` (separate from `Drivetrain`'s copy) since
    Lesson 5. Once `setDesiredState`'s software P math moves into firmware,
    that `clamp` and its `MathUtil` import become genuinely dead code —
    caught by re-deriving what's actually still called, not assumed from
    the old lesson's smaller diff. Lesson 12 deletes both explicitly, and
    is explicit that `Drivetrain`'s own `clamp` is untouched (different
    class, different copy, still load-bearing for `turnToHeading`/`driveToPose`).
  - **Both closed loops verified to actually converge in sim, with the
    real firmware doing the work, not asserted from Phoenix's reputation.**
    A `DriverStationSim`-backed test drives a real `SwerveModule` end to
    end: steering (fed *only* by the CANcoder's own sim state, confirming
    remote sensor fusion genuinely works and not just "should") converges
    from 0° to a commanded 90° within 3°; drive velocity converges from
    rest to a commanded 2.0 m/s within 0.3 m/s using `kV = 0.8`/`kP = 0.1`
    unchanged from the old lesson's numbers (and cross-checked against this
    track's own Lesson 10 free-speed arithmetic, not just copied — `100
    rot/s ÷ 6.75 × 0.319 m ≈ 4.7 m/s` at 12 V implies `kV ≈ 12/14.7 ≈ 0.8`,
    matching). A third test drives a module to +170° then commands −170°
    (20° away the short way, across the wrap seam) and confirms the raw
    accumulated position moves to ≈190° (a +20° step) rather than ≈−170°
    the long way round (a −340° step) — `ContinuousWrap` verified to
    actually take the short path in this alpha's simulated firmware, not
    just configured and trusted.

  No `Drivetrain.java` changes were needed this lesson — confirmed by
  re-reading every caller of the touched `SwerveModule` methods, matching
  the old lesson's own claim that encapsulation absorbs the whole
  refactor at the boundary.
- **R18 — new, found while writing and verifying Lesson 13, all confirmed
  by real compiles and a `DriverStationSim`-backed end-to-end test, not
  ported from the old lesson on trust.** The IO-layer restructuring itself
  (`ModuleIO`/`ModuleIOTalonFX`/`ModuleIOSim`, `GyroIO`/`GyroIOPigeon2`/
  `GyroIOSim`, the `Constants.Mode` enum and its two `switch` expressions)
  ported onto this alpha with no API surprises — every method used
  (`.getValue().in(...)`, `CANBus.systemcore(0)` constructors,
  `RobotBase.isReal()`) was already established by earlier lessons. What
  needed real work was everything downstream of R1's team decision to defer
  replay:

  - **`RobotBase.isReal()` confirmed present** at
    `org.wpilib.framework.RobotBase` via `javap` — same signature and
    behavior as the pre-2027 API, just moved packages like everything else
    `org.wpilib`-renamed. Used unchanged for `Constants.kCurrentMode`'s
    ternary.
  - **A genuine v3-specific structural consequence the old (2026,
    `RobotContainer`) lesson never had to make**: because `Mechanism` has
    no `simulationPeriodic()` hook of its own (the Lesson 4 finding this
    track has carried since), every lesson through 11 gave `Drivetrain` a
    hand-rolled public `simulatePeriodic()` method that `Robot.
    simulationPeriodic()` called directly. Lesson 13's IO-layer switch
    makes that method's entire body dead: sim physics now runs as a side
    effect of *which class got constructed* (`ModuleIOSim`/`GyroIOSim`,
    only ever built when `Constants.kCurrentMode == SIM`), invoked
    transparently through the `updateInputs()` calls `logTelemetry()`
    already makes every tick. `Drivetrain.simulatePeriodic()` is deleted
    outright, and `Robot.simulationPeriodic()`'s override body is emptied
    to `{}` — the first lesson since 7 to touch `Robot.java` at all. The
    old lesson never needed an equivalent change because `SubsystemBase`'s
    real `simulationPeriodic()` hook doesn't disappear just because the
    class stops needing it; this track's hand-rolled stand-in does.
  - **The `getHeadingDegrees()` live-read-to-cached-read change is
    harmless, confirmed rather than assumed.** Before this lesson,
    `getHeadingDegrees()` read `m_gyro.getYaw()` live, every call; after,
    it reads `m_gyroInputs.yawDegrees`, a field only refreshed once a tick
    by `logTelemetry()`. Since `m_odometry`'s field initializer calls
    `getHeadingDegrees()` at construction — before any tick, and before
    `logTelemetry()` has ever run — the seed heading is now always the
    `GyroIOInputs` class's default `0.0`, not a live boot-time reading. A
    real `DriverStationSim`-backed test constructs a fresh `Drivetrain` and
    asserts `getPose()` reads exactly `(0, 0, 0°)` *before* the scheduler
    has ticked even once, confirming the seed is correct — matching both
    `GyroIOSim`'s own initial `m_simHeadingDegrees = 0.0` and this course's
    established "robot boots facing 0°" convention. Worth remembering if a
    future lesson ever seeds odometry from a sensor whose real boot-time
    value *isn't* its type's zero default.
  - **The `REPLAY` arm's honesty is verified, not asserted.** With
    `Constants.kSimMode` temporarily hand-edited to `Mode.REPLAY`, a real
    `DriverStationSim`-backed test constructs `Drivetrain` (both
    `switch` expressions resolve to the `new ModuleIO() {}`/`new GyroIO()
    {}` anonymous-class arms), ticks the scheduler 25 times, and confirms
    `getPose()` and `getHeadingDegrees()` still read exactly `(0, 0, 0°)`
    the whole time — the dormant doorway compiles, constructs, and truly
    does nothing, rather than silently working by accident or throwing.
  - **A testing trap worth not rediscovering, found while writing this
    lesson's own verification, not carried over from an earlier lesson's
    notes:** the first attempt at a `Drivetrain`-driving end-to-end test
    (schedule a `drive(...)` command, tick the scheduler, expect the
    module's velocity reading to converge) read `0.0` forever with no
    error, because the test never called `DriverStationSim.setEnabled(true)`.
    Phoenix's simulated motors output nothing while the robot reads as
    disabled — the same fact the main 2026 course already documents for
    its own Lesson 29 SysId testing, now confirmed to reproduce identically
    in this alpha. Adding `DriverStationSim.setEnabled(true)` +
    `DriverStationSim.notifyNewData()` before constructing `Drivetrain`
    fixed it: module velocity converged to within 0.2 m/s of a commanded
    2.0 m/s, and a following `turnToHeading(90)` converged the gyro-fed
    heading to within 2° — both through the full IO-layer round trip
    (`ModuleIOSim`/`GyroIOSim` → `Inputs` → `SwerveModule`/`Drivetrain` →
    odometry), not asserted from the pieces working in isolation.
  - **A discrepancy with an earlier appendix entry, flagged at the time,
    and now retracted — see R19 for the corrected, reproducible finding.**
    This lesson's own verification test appeared to run clean with zero
    `jvmArgs` added to `build.gradle`, seemingly contradicting the
    appendix's "GradleRIO test-task JVM args" row. Lesson 14's testing
    reproduced the *opposite* result under the exact same unmodified
    `code/OpModeV3Robot/build.gradle`: a bare `new Drivetrain()` — no
    coroutines, no `Scheduler.schedule(...)`, just construction — reliably
    threw `IllegalAccessException` from `ContinuationScope.<clinit>` every
    time, and adding the three `jvmArgs` reliably fixed it, every time.
    The original appendix row was right; this entry's "ran clean" result
    could not be reproduced and should be treated as an unreliable
    artifact of that session's Gradle daemon state, not a fact about the
    library. Left here rather than silently deleted, per this repo's
    convention of keeping the record of what was actually observed.

  No lesson code ships a test — `code/v3/lesson-13/` has no `tests/`
  directory, matching this track's own precedent (and the main course's,
  which doesn't ship tests until its Lesson 32 equivalent). Every finding
  above came from a throwaway JUnit file in the verification sandbox,
  written, run, and discarded, per this repo's established convention.
- **R19 — new, found while writing and verifying Lesson 14, all confirmed
  by `javap` against the real jars and a real `DriverStationSim`-backed
  test, not ported from the old lesson on trust.** The
  `Localizer`/`PoseProvider`/`VisionPoseProvider` port itself needed no
  behavioral changes from the old lesson — every API it calls exists here
  with the same shape:

  - **`org.wpilib.math.estimator.SwerveDrivePoseEstimator`**, confirmed via
    `javap`, extends a generic `PoseEstimator<SwerveModulePosition[]>` base
    class that actually declares `update`/`updateWithTime`/
    `getEstimatedPosition`/`resetPosition`/`addVisionMeasurement`/
    `setVisionMeasurementStdDevs` — the subclass itself only adds two
    constructors and a typed `updateWithTime` overload. Doesn't change how
    the lesson's code reads (Java resolves inherited methods
    transparently), but worth knowing if a future maintainer goes
    source-diving and can't find a method on the class they expected it on.
  - **`VecBuilder` moved to `org.wpilib.math.linalg`** (not the pre-2027
    `edu.wpi.first.math` root), confirmed via `javap`; `Vector<N3>`
    confirmed to `extend Matrix<N3, N1>`, so `VecBuilder.fill(0.5, 0.5,
    999999)` is assignment-compatible with `setVisionMeasurementStdDevs`'s
    `Matrix<N3, N1>` parameter with no cast needed — same as the pre-2027
    API's shape.
  - **`Timer.getFPGATimestamp()` doesn't exist in this alpha** — confirmed
    via `javap` on `org.wpilib.system.Timer`; renamed to
    `Timer.getTimestamp()` (no `FPGA` in the name), consistent with the
    aside-odometry-thread appendix's already-recorded `Timer::getTimestamp`
    reference for BLine. `VisionPoseProvider` uses the renamed call.
  - **A genuine, deliberate design decision this lesson makes that the old
    lesson didn't need to: `Localizer` is a plain class, not a
    `Mechanism`.** The old lesson's `Localizer extends SubsystemBase`
    because that's V2's uniform "anything with a `periodic()`" convention.
    This track doesn't have that pressure — `Mechanism` has no
    `periodic()` hook of its own (the Lesson 4 finding this track has
    carried since), so every periodic tick in this course already goes
    through `Scheduler.getDefault().addPeriodic(Runnable)`, which takes a
    bare `Runnable` and was confirmed via `javap` to need nothing
    `Mechanism`-shaped. `Localizer` drives no motors and no command ever
    needs to require it, so extending `Mechanism` would buy it an unused
    `idle()` default command and scheduler registration for no reason.
    This is the first class in the track to use `addPeriodic` as its
    *only* connection to the scheduler, with no `Mechanism`-ness
    alongside it — confirmed to compile and behave identically to the
    `Mechanism`-extending alternative in a real test (the periodic tick
    fires every `Scheduler.getDefault().run()` call either way).
  - **The jvmArgs finding from R18 is corrected here — see R18's edited
    entry.** A clean, deterministic repro (bare `new Drivetrain()`
    construction, no coroutines scheduled, nothing else in the test)
    reliably threw `IllegalAccessException` from
    `ContinuationScope.<clinit>` under the unmodified
    `code/OpModeV3Robot/build.gradle`, every time it was tried, and adding
    `jvmArgs '--add-opens', 'java.base/jdk.internal.vm=ALL-UNNAMED'` /
    `'java.base/java.lang=ALL-UNNAMED'` / `'--enable-native-access=ALL-UNNAMED'`
    to the sandbox's `test { }` block fixed it, every time. The appendix's
    original claim stands confirmed; R18's "ran clean" observation does
    not reproduce and is retracted. The fix lives only in the verification
    sandbox — not shipped to `code/OpModeV3Robot` or any `code/v3/lesson-N`,
    since no lesson through 14 ships a test.
  - **The vision correction is convergent, not a one-shot snap — measured,
    not assumed from the old lesson's prose.** A single
    `addVisionMeasurement` call against `SwerveDrivePoseEstimator`'s
    default trust settings closed only a modest fraction of the error
    (measured: 3.09 m → 2.79 m, about 10%, from one reported sighting).
    Repeating the report 20 times in a row — standing in for a real
    camera's dozens-of-frames-per-second — brought the error under half
    its starting value, monotonically shrinking on every single frame
    (confirmed by asserting the error strictly decreases each of the 20
    frames, not just checking the final number). This matches the old
    lesson's "not a teleport: a strong pull, blended over a few ticks"
    description accurately as long as "a few ticks" is read as "a few
    reported sightings," not one — a single button press nudges
    noticeably but not dramatically, and it's holding the button/pressing
    repeatedly that produces the decisive slide the lesson describes.
  - **`driveToPose`'s new `Supplier<Pose2d> pose` parameter needed no new
    import** — `Drivetrain.java` already imports `java.util.function.Supplier`
    for `drive`/`driveFieldRelative`. `driveToPose` remains unbound to any
    button in this lesson, exactly matching Lesson 11's original "sketch"
    framing and the old (2026) course's own precedent of leaving it
    unbound until a much later lesson.
- **R20 — new, found while writing and verifying Lesson 15, all confirmed
  by `javap` against the real jars and real `DriverStationSim`-backed
  tests, not ported from the old lesson on trust.** PhotonLib's 2027 alpha
  (`v2027.0.0-alpha-2`) API surface matches the old lesson's calls almost
  exactly — `PhotonCamera(String)`, `PhotonCamera.getAllUnreadResults()`,
  `PhotonPoseEstimator(AprilTagFieldLayout, Transform3d)`,
  `.estimateCoprocMultiTagPose(...)`/`.estimateLowestAmbiguityPose(...)`
  (both still present, alongside several new strategy methods this alpha
  adds that the lesson doesn't need — `estimatePnpDistanceTrigSolvePose`,
  `estimateConstrainedSolvepnpPose`, `estimateRioMultiTagPose`,
  `estimateClosestToCameraHeightPose`, `estimateClosestToReferencePose`,
  `estimateAverageBestTargetsPose`), `EstimatedRobotPose`'s three public
  fields, `VisionSystemSim`/`PhotonCameraSim`/`SimCameraProperties`'
  constructors and every method the lesson calls — all confirmed via
  `javap`, all unchanged in name and shape. `org.photonvision.*` sits
  outside the `org.wpilib` 2027 rename entirely, same as Phoenix 6 (R17);
  only WPILib's own `AprilTagFieldLayout`/`AprilTagFields` moved packages,
  to `org.wpilib.vision.apriltag` (confirmed via `javap`, not guessed from
  the rename pattern holding elsewhere).

  - **The vendordep itself is now proven, not just present.** R2 had only
    confirmed `photonlib-v2027.0.0-alpha-2.json` exists in
    `vendor-json-repo/2027_alpha5/`; this lesson actually fetched it (added
    to `tools/verify-lessons-v3.sh`'s `VENDORDEPS` array at `15|...`),
    resolved it through Gradle against `code/OpModeV3Robot`, and compiled
    real code against the resulting jars — the first real evidence PhotonLib
    installs cleanly on this alpha/SystemCore combination, not just that a
    JSON file for it exists.
  - **A real, non-obvious limitation of this course's vision-sim
    architecture, found only by testing, not anticipated by this plan or
    the old lesson's design.** `VisionIOPhotonVisionSim`'s `poseSupplier`
    is `Localizer::getPose` — the *same* fused estimate vision then
    corrects, per the lesson's own design (there's no independent ground
    truth in this course's sim until maple-sim, Lesson 16). A first attempt
    at an end-to-end test seeded the estimate 0.5 m off from a true pose
    standing in front of a real tag and expected the simulated camera to
    pull it back — it didn't; the error stayed flat across 150 ticks
    (measured: 0.707 m → 0.719 m, no improvement). The mechanism, confirmed
    by re-reading `VisionSystemSim.update(Pose2d)`'s contract: the fake
    camera renders tag detections *as seen from the pose it's given*, so
    when that pose is the (possibly wrong) current estimate, the resulting
    correction is self-consistent with the wrong estimate, not pulled
    toward the tag's real field position. **The same tautology defeats the
    old lesson's Try It 3 too** ("mismeasure `kFrontRobotToCamera` by 0.3 m
    and watch the fused pose skew") — a second real test proved it:
    `robotToCamera` feeds both `VisionSystemSim.addCamera(cameraSim,
    robotToCamera)` (placing the fake camera) and
    `PhotonPoseEstimator`'s constructor (un-projecting detections back to a
    robot pose), so a wrong value cancels against itself on both sides;
    measured max error with a 0.3 m mismeasurement was 1.5 cm — indistinguishable
    from ordinary simulated pixel noise, not the dramatic skew the old
    lesson describes. **What *is* real and demonstrated:** with the
    estimate correctly seeded, the fused pose stays within 15 cm of the
    true pose across 150 ticks while a real multi-tag detection pipeline
    runs (measured directly: raw per-frame observations landing within a
    few centimeters of truth, `tagCount = 4` from a spot with four tags in
    view) — confirming the pipeline itself is accurate; it just can't be
    made to demonstrate *recovering from* an error, or exposing a
    calibration mistake, until independent ground truth exists. Lesson 15's
    prose and Try It 3 were written around this finding rather than
    against it — see the lesson's section 10 callout.
  - **The jvmArgs finding from R18/R19 reproduces a third time, unchanged.**
    Every `Mechanism`-constructing test in this lesson's verification
    needed the same three `jvmArgs` added to the sandbox's `test { }` block
    before it would run past `Drivetrain`'s constructor; omitted again here
    only for lessons already established, not re-litigated.

  No lesson code ships a test — same precedent as Lessons 13–14. Every
  finding above came from throwaway JUnit files in the verification
  sandbox, written, run, and discarded.

---

## Appendix: verified API notes

Read directly from `wpilibsuite/allwpilib` at tag `v2027.0.0-alpha-6` — the
exact version `code/OpModeV3Robot/build.gradle` pins — via GitHub's raw source,
not from documentation or memory. Same rule as this repo's other plan-doc
appendices: verify before drafting, record what you verified.

| Fact | Status |
|---|---|
| `org.wpilib.opmode` package contents | `OpMode` (interface), `PeriodicOpMode` (abstract base), `Teleop`/`Autonomous`/`Utility` (annotations, each with `name`/`group`/`description`/`textColor`/`backgroundColor`) |
| `OpMode` lifecycle | `disabledPeriodic()` (while selected + DS disabled, not on a fixed interval) → `start()` (**on every disable→enable transition — corrected 2026-08-11, confirmed via `loopFunc()` bytecode + `DriverStationSim`; not once per opmode lifetime**) → `periodic()` (every tick while enabled, at `OpModeRobot.getPeriod()`, default 20 ms) → `end()` (on enable→disable or opmode switch while enabled) → `close()` (always last; object never reused). **`robotPeriodic()`/`disabledPeriodic()` on `Robot` itself run unconditionally every tick, regardless of opmode selection or enabled state** — confirmed the same way |
| Opmode auto-registration | `OpModeRobot` scans `getClass().getPackage()` and subpackages for `@Teleop`/`@Autonomous`/`@Utility`-annotated `OpMode` subclasses at construction time (`addAnnotatedOpModeClasses`), no manual registration call needed |
| Opmode construction | Constructed via reflection, preferring a constructor accepting the robot's own class (`Robot`) over a no-arg one; this is why `MyTeleop(Robot robot)` works out of the box |
| Scheduler tick | `Scheduler.getDefault().run()` must be called by user code — confirmed **not** invoked automatically anywhere in `OpModeRobot`; `robotPeriodic()` (called every tick, any opmode state, per `loopFunc()`) is the documented hook point (per `Scheduler`'s own class javadoc, written against `TimedRobot` but the same hook exists on `OpModeRobot`). **Implemented 2026-08-11** — `Robot.robotPeriodic()` overridden to call it, in `code/v3/lesson-1/Robot.java` onward; taught as Lesson 1 §5 |
| `Scheduler`/`Trigger` and disabled state | **No built-in gating at all — confirmed empirically, not just by bytecode inspection.** A `DriverStationSim`-backed JUnit test (`Scheduler.createIndependentScheduler()`, an always-true `Trigger.whileTrue(...)`, `DriverStationSim.setEnabled(false)`) shows the bound command's `scheduler.isRunning(...)` reads `true` while `RobotState.isDisabled()` also reads `true`. Unlike V2's `CommandScheduler` (which this course's 2026 track documents as cancelling every running command while disabled), this scheduler does not consult the DS at all; ticking it from `robotPeriodic()` runs it identically enabled or disabled |
| `RobotState` vs `DriverStation` | **The enabled/disabled check moved.** `org.wpilib.driverstation.RobotState.isEnabled()`/`.isDisabled()`/`.isEStopped()`/`.isAutonomous()`/etc. is the real home for these in this alpha. `org.wpilib.driverstation.DriverStation` itself — confirmed via unfiltered `javap` — exposes almost nothing besides `startDataLog(...)` and raw refresh-event-handle plumbing; the old V2 names `DriverStation.isDisabled()`/`DriverStation.refreshData()` don't exist on it. `DriverStationSim.notifyNewData()`'s own bytecode already ends by calling the internal cache's `refreshData()`, so no separate manual refresh call is needed in test code |
| GradleRIO test-task JVM args | **`wpi.java.configureTestTasks(test)` does not add the `--add-opens`/`--enable-native-access` flags Commands V3's coroutines need at runtime — only `configureSimulationTask` (backing `simulateJava`) does.** Confirmed by `javap`-diffing `WPIJavaExtension`'s two methods and reproducing the failure (`IllegalAccessException` inside `Continuation`'s static initializer) in the sandbox. Any lesson shipping a test that touches `Scheduler`/`Trigger`/coroutines needs `jvmArgs '--add-opens', 'java.base/jdk.internal.vm=ALL-UNNAMED'`, `jvmArgs '--add-opens', 'java.base/java.lang=ALL-UNNAMED'`, and `jvmArgs '--enable-native-access=ALL-UNNAMED'` added to that lesson's `test { }` block by hand. Not yet applied to `code/OpModeV3Robot` — no lesson in scope ships a test yet |
| `org.wpilib.command3` package contents | `Command`, `Coroutine`, `Mechanism`, `Scheduler`, `Trigger`, `BindingScope`, `StateMachine`, `StagedCommandBuilder` (+ `NeedsExecutionBuilderStage`/`NeedsNameBuilderStage`), `ParallelGroup`(`Builder`), `SequentialGroup`(`Builder`), `Binding`/`BindingType`, `SchedulerEvent`, `Continuation`/`ContinuationScope`, `OpModeFetcher` (package-private), plus `button/` and `proto/` subpackages |
| `Command` interface | Single abstract method `void run(Coroutine coroutine)`; `default void onCancel() {}`; `name()`, `requirements()`, `priority()` (default `0`; `LOWEST_PRIORITY`/`HIGHEST_PRIORITY` = `Integer.MIN/MAX_VALUE`); statics `noRequirements(Consumer<Coroutine>)`, `requiring(Mechanism...)`, `parallel(Command...)`, `race(Command...)`, `sequence(Command...)`, `waitUntil(BooleanSupplier)`, `waitFor(Time)`; instance `.withTimeout(Time)`, `.until(BooleanSupplier)`, `.andThen(Command)`, `.alongWith(Command...)`, `.raceWith(Command...)` |
| `Mechanism` | Constructor auto-registers with `Scheduler.getDefault()` and sets an `idle()` default command (`Coroutine::park`, `LOWEST_PRIORITY`); `.run(Consumer<Coroutine>)`, `.runRepeatedly(Runnable)`, `.setDefaultCommand(Command)`, `.idle()`, `.idleFor(Time)` — **no `periodic()` hook** |
| Command builder chain | `noRequirements(...)`/`requiring(...)` → `.executing(Consumer<Coroutine>)` → optional `.whenCanceled(Runnable)` / `.withPriority(int)` / `.until(BooleanSupplier)` → **required** `.named(String)` to actually get a `Command` |
| `Coroutine` | `.yield()`, `.park()` (suspend until interrupted), `.fork(Command)` (schedule without waiting), `.await(Command)` (schedule and block until done), `.awaitAll(...)`/`.awaitAny(...)`, `.wait(Time)`, `.waitUntil(BooleanSupplier)` |
| `Scheduler` | Single-threaded only — its own javadoc calls multi-threaded use a JVM-crash risk, not just a bug risk. `getDefault()` is a singleton; `createIndependentScheduler()` exists for tests. `run()` does, in order: cancel stale-scope commands → unbind stale-scope triggers → run sideloads → poll the trigger event loop → schedule default commands → promote queued commands → run every running command to its next `yield()`/exit |
| `Trigger` | Same combinator names as today's course: `and/or/negate/debounce/onTrue/onFalse/whileTrue/whileFalse/toggleOnTrue/toggleOnFalse`; new: `risingEdge()/fallingEdge()`. Bindings are scoped via `BindingScope.createNarrowestScope` and auto-removed (with their commands canceled) when that scope goes inactive |
| `BindingScope` | Three cases, narrowest wins: `ForCommand` (active while a specific command is running — used when a trigger is created inside a command body), `ForOpmode` (active while a specific opmode ID is selected — used when created directly in an opmode), `Global` (always active — used outside both) |
| `button.CommandGamepad` | Constructors `(int port)` / `(Scheduler, int port)`. Buttons: `southFace/eastFace/westFace/northFace/back/guide/start/leftStick/rightStick/leftBumper/rightBumper/dpadUp/Down/Left/Right/misc1..6/leftPaddle1/2/rightPaddle1/2/touchpad`, each with an `EventLoop` overload. Axes: `leftTrigger()/rightTrigger()` (default 0.5 threshold, overloads for custom threshold), `getLeftX/Y()`, `getRightX/Y()`, `getLeftTriggerAxis()/getRightTriggerAxis()`. **No `CommandXboxController`-equivalent ships** — no `a()/b()/x()/y()` names exist |
| `button.RobotModeTriggers` | Static factories `autonomous()`, `teleop()`, `disabled()`, `utility()` — same shape as today's `RobotModeTriggers`, plus a fourth (`utility()`) for the new `@Utility` opmode kind |
| `StateMachine` | `new StateMachine(String name)`; `.addState(Command)` returns a `State`; `State.onEnter(Runnable)`, `.onExit(Runnable)`, `.switchTo(State)` / `.switchTo(Supplier<State>)` / `.exitStateMachine()` each return a `TransitionNeedsConditionStage` with `.when(BooleanSupplier)` / `.whenComplete()` / `.whenCompleteAnd(BooleanSupplier)`; `.switchFromAny(State...)` for shared transitions; `.setInitialState(State)` |
| `OpModeFetcher` | Package-private; default implementation reads `org.wpilib.driverstation.RobotState.getOpModeId()`/`getOpMode()` — this is the mechanism `BindingScope.ForOpmode` uses to detect "is this still the selected opmode" |
| `SmartDashboard` | `org.wpilib.smartdashboard.SmartDashboard` — confirmed present; `OpModeRobot.loopFunc()` itself calls `SmartDashboard.updateValues()` every tick |
| `Alert` | `org.wpilib.driverstation.Alert` — confirmed present; imported and used directly by `OpModeRobot` itself (`m_loopOverrunAlert`), with `Alert.Level` |
| `org.wpilib.epilogue` package **(investigated 2026-08-10, not what this track uses — see below)** | First-party WPILib module (`epilogue-processor`/`epilogue-runtime` in `allwpilib`, same tier as `wpilibj`/`wpimath` — not a vendordep). Contents: `Logged`/`NotLogged`/`CustomLoggerFor` annotations, `EpilogueConfiguration`, plus `logging/` subpackage |
| `@Logged` | Class-level: auto-logs every field + no-arg public accessor via generated code (`Strategy.OPT_OUT` default, or `OPT_IN`). `Importance` levels `DEBUG`/`INFO`/`CRITICAL`. Supports primitives, arrays, `String`, `StructSerializable`, `Measure`, `Sendable`, `*Supplier` types |
| `Epilogue.bind(this)` | **Confirmed conditional on `TimedRobot`** — quoted from `wpilibsuite/frc-docs`'s annotation-logging page: "If your main robot class inherits from `TimedRobot`, the generated `Epilogue` class will have an additional `bind()` method." **Do not use for this track** — `Robot extends OpModeRobot`, not `TimedRobot`. This is Epilogue's version of AdvantageKit's `LoggedRobot` requirement |
| `EpilogueBackend` | Plain interface, robot-base-agnostic: `.log(String, <type>)` overloads (primitives, arrays, `String`, `Enum`, `Measure`, struct-serializable), `.getNested(String path)`. **This is the actual integration point for this track** — bypasses `@Logged`/`bind()` entirely |
| `NTEpilogueBackend` | `public NTEpilogueBackend(NetworkTableInstance nt)` — plain public constructor, no annotation processor or `Robot` subclass dependency. Publishes to NetworkTables (`NT4Publisher`'s role) |
| `FileBackend` | `public FileBackend(DataLog dataLog)` — plain public constructor. On-disk `.wpilog` logging (`WPILOGWriter`'s role); not needed directly if `DataLogManager.start()` is already mirroring NetworkTables |
| `NestedBackend` | Returned by `.getNested(path)`. **Verified from source**: prepends `path + "/"` to every identifier logged through it — `backend.getNested("DriveModule").log("PositionRotations", v)` produces NT key `"DriveModule/PositionRotations"`, matching this course's existing `Logger.recordOutput("Subsystem/Value", ...)` convention exactly |
| `ClassSpecificLogger<T>` | Base class for both generated (`@Logged`) and hand-written (`@CustomLoggerFor`) per-class loggers. `protected abstract update(EpilogueBackend, T)`; public `tryUpdate(EpilogueBackend, T, ErrorHandler)`. Not needed by this track's recommended manual-backend approach, but is the mechanism third-party vendor types (motors, etc.) would use if the course adopts `@Logged` later |
| `EpilogueConfiguration` | Plain mutable fields: `backend` (defaults to `new NTEpilogueBackend(NetworkTableInstance.getDefault())`), `root` (defaults `"Robot"`), `minimumImportance`, `errorHandler`, `loggingPeriod`/`loggingPeriodOffset`. Only consumed by the generated `Epilogue.configure(...)`; this track constructs its own backend directly instead |
| Vendordep conflict | The old `CommandsV2.json` (`org.wpilib.commandsv2`) declared a `conflictsWith` entry naming `CommandsV3.json` by UUID — the two cannot be installed together. **Resolved**: `code/OpModeV3Robot` now ships `CommandsV3.json` only |
| `commandsv3` module location | Confirmed present at `commandsv3/` in the `allwpilib` repo, with its own `CommandsV3.json`, `build.gradle`, `BUILD.bazel`, `CMakeLists.txt`. Its `CommandsV3.json` (`uuid` `4decdc05-a056-46cf-9561-39449bbb0130`, `javaDependencies` group `org.wpilib` artifact `commands3-java`) is now installed in `code/OpModeV3Robot/vendordeps/`, copied byte-for-byte from source at tag `v2027.0.0-alpha-6` |
| AdvantageKit 2027 compatibility | **Confirmed blocked, not just unverified.** `v27.0.0-alpha-4` is the release paired with WPILib `2027.0.0-alpha-6` (this scaffold's pinned version), per `wpilibsuite/SystemCoreTesting/AdvantageKit.md`. That same doc states directly: `LoggedRobot` is supported, `OpModeRobot` support is "available in a future release." Its vendordep (`AdvantageKit-27.0.0-alpha-4.json`) is mirrored in `vendor-json-repo/2027_alpha5/` alongside the other 2027-alpha vendor files, for whenever it's needed |
| Phoenix 6 2027 compatibility | Pin confirmed: `Phoenix6-26.50.0-alpha-1.json` (plus `Phoenix6-replay-26.50.0-alpha-1.json` for AdvantageKit-replay support) in `vendor-json-repo/2027_alpha5/`, CTRE's own compatibility doc pairs it with WPILib's `2027_alpha5` checkpoint (no `2027_alpha6`-specific row published yet — this is the most recent confirmed pairing, not a guess, but re-check before relying on it for a real device). `CANBus.systemcore(int busId)` (lowercase `c`) for SystemCore CAN buses; documented gaps: Motioncore CAN buses unsupported, no Sendable replacement yet |
| `com.ctre.phoenix6.hardware.TalonFX` — **compiled, not guessed** (`javap` against the real `wpiapi-java-26.50.0-alpha-1.jar`) | Constructor `TalonFX(int, CANBus)` only — no single-int overload. **No `.set(double)` method exists.** Real motor-output methods: `setThrottle(double)` (duty cycle, −1..1 — the direct `.set(double)` replacement), `setVoltage(double)`, `setVoltage(Voltage)`, `disable()`, `stopMotor()`. `getPosition()`/`getVelocity()` (inherited from `CoreTalonFX`) are unchanged in shape, returning `StatusSignal<Angle>`/`StatusSignal<AngularVelocity>` |
| `com.ctre.phoenix6.StatusSignal<T>` — compiled, not guessed | **No `getValueAsDouble()`.** Only `T getValue()`, returning the signal's real measure type (`Angle`, `AngularVelocity`, etc.) — so reading any Phoenix 6 sensor now requires unpacking with `.in(Unit)` (e.g. `.getValue().in(Rotations)`). See R7 for the pedagogical-sequencing consequence |
| `com.ctre.phoenix6.CANBus` — compiled, not guessed | Static factories `systemcore(int)` / `systemcore(int, String)` (lowercase `c` — confirmed from the class file, corrects an earlier guess) and `motioncore(int)` / `motioncore(int, String)`; plain constructors `CANBus()` / `CANBus(String)` / `CANBus(String, String)` also exist |
| `com.ctre.phoenix6.sim.TalonFXSimState` — compiled, not guessed | Unchanged in shape from the pre-2027 API: `setSupplyVoltage(double)`, `getMotorVoltage()`, `setRawRotorPosition(double)`, `setRotorVelocity(double)` all present (plus new `Voltage`/`Angle`/`AngularVelocity`-typed overloads of each, not needed by Lesson 4) |
| `edu.wpi.first.math.system.plant.LinearSystemId` — **renamed, not present in this alpha** | Confirmed absent from `wpimath-java-2027.0.0-alpha-6.jar` under any package. Real replacement: `org.wpilib.math.system.Models`, with physically-named factories (`flywheelFromPhysicalConstants`, `elevatorFromPhysicalConstants`, `singleJointedArmFromPhysicalConstants`, `differentialDriveFromPhysicalConstants`, each with a `FromSysId` sibling) instead of one generic `createXxxSystem` per shape. `singleJointedArmFromPhysicalConstants(DCMotor, double J, double gearing)` returns the same `LinearSystem<N2, N1, N2>` shape `createDCMotorSystem` used to and is what `DCMotorSim`'s constructor still wants — confirmed by matching return/parameter types via `javap`, since a plain motor-plus-load and a gravity-free arm are the same equation |
| `org.wpilib.math.system.DCMotor` | Same package tail (`.system`, not `.system.plant`) as `LinearSystem`/`Models` now that `plant` is gone. `getKrakenX60(int)` and siblings (`getKrakenX60Foc`, `getKrakenX44`, `getKrakenX44Foc`) confirmed present with unchanged signatures |
| `org.wpilib.simulation.DCMotorSim` — compiled, not guessed, **and unit-verified with a real test** | Package moved from `edu.wpi.first.wpilibj.simulation` to `org.wpilib.simulation` (same move as `DriverStationSim`). Constructor `DCMotorSim(LinearSystem<N2,N1,N2>, DCMotor, double...)`. **`getAngularPosition()`/`getAngularVelocity()` return radians / radians per second, not the old API's rotations / RPM** — confirmed empirically, not just by naming convention: a `DriverStationSim`-backed test drove a `TalonFX.setThrottle(1.0)` through the full sim loop (with `Thread.sleep(20)` between ticks — Phoenix's simulated firmware is real-time, so a tight loop without real sleeps undershoots) and `TalonFX.getVelocity()` converged on the Kraken X60's true 100 rot/s free speed only with a `/(2 * Math.PI)` conversion applied before `setRotorVelocity`; without it, the same test converged on ~630 (radians/s). See `code/v3/lesson-4/` |
| `org.wpilib.system.RobotController` | Package moved from `edu.wpi.first.wpilibj` to `org.wpilib.system` (same tail as `DataLogManager`). `getBatteryVoltage()` confirmed present, unchanged signature |
| `Mechanism` sim hook | **Confirmed absent** — `Mechanism` has no `simulationPeriodic()`/`simulationInit()` of its own (consistent with it having no `periodic()` hook at all, per the earlier finding used for Lesson 3's telemetry). The real hook is `OpModeRobot.simulationPeriodic()` (`Robot` overrides it), called by `loopFunc()` only when `isSimulation()`, unconditional on enabled state — same shape as `robotPeriodic()`. Lesson 4 has each mechanism expose a plain public `simulatePeriodic()` method for `Robot` to call, one line per mechanism |
| `com.ctre.phoenix6.hardware.CANcoder` — compiled, not guessed | **Constructor `CANcoder(int, CANBus)` only — no single-int overload**, the same shift `TalonFX` already got. `getConfigurator()`, `getPosition()`/`getPosition(boolean)`, `getAbsolutePosition()`/`getAbsolutePosition(boolean)` (inherited from `CoreCANcoder`) all confirmed present and unchanged in shape, all returning `StatusSignal<Angle>` — same `.getValue().in(Unit)` unpack every other Phoenix sensor needs since Lesson 3 |
| `com.ctre.phoenix6.configs.{CANcoderConfiguration,MagnetSensorConfigs}` / `com.ctre.phoenix6.signals.SensorDirectionValue` — compiled, not guessed | Unchanged in shape from the pre-2027 API. `MagnetSensorConfigs.MagnetOffset` is still a plain public `double` field (directly assignable); `CANcoderConfiguration.MagnetSensor` is still a plain public field; `SensorDirectionValue.Clockwise_Positive`/`CounterClockwise_Positive` unchanged |
| `TalonFX.setPosition(double)` (priming) — compiled, not guessed | Confirmed present and unchanged (plus new `setPosition(double, double)`/`setPosition(Angle)`/`setPosition(Angle, double)` overloads, not needed by Lesson 5) |
| `Mechanism`'s `run`/`runRepeatedly` builder return type | **Confirmed identical** — both `run(Consumer<Coroutine>)` and `runRepeatedly(Runnable)` return `NeedsNameBuilderStage`, so `.whenCanceled(Runnable)`/`.withPriority(int)`/`.until(BooleanSupplier)`/`.named(String)` chain the same way regardless of which one started the command. Lesson 5's `steerToAngle` is the first command needing both `runRepeatedly`'s per-tick recompute (Lesson 2's shape) and `.whenCanceled`'s cleanup (Lesson 1's shape) together |
| `Coroutine.waitUntil(BooleanSupplier)` — compiled and behavior-verified, not guessed from the name | Bytecode is exactly `while (!condition.getAsBoolean()) { yield(); }` — confirmed via `javap -c`. A `run(coroutine -> { ...; coroutine.waitUntil(cond); ...})` command finishes the instant `cond` goes true **without any `.until(...)` decorator** — proven with a real `Scheduler.createIndependentScheduler()` test: `scheduler.isRunning(command)` flips `false` the same tick the coroutine body's last line executes. This is Lesson 6's whole "commands that finish" mechanism |
| `Command.whenCanceled(Runnable)` vs. a natural coroutine finish — **behavior-verified, not inferred**, see R9 | Does **not** fire when the coroutine body completes on its own — confirmed by a scheduler test where an identical command's `.whenCanceled(...)` callback never ran across a full natural-finish cycle. Only fires on external interruption (another command taking the mechanism, explicit cancel). A command with two possible endings needs cleanup written at both — inline after the body's wait, and in `.whenCanceled(...)` |
| `Command.andThen(Command)` / `SequentialGroupBuilder` — compiled, not guessed | `andThen` returns `SequentialGroupBuilder` (also has its own `andThen(Command)`/`andThen(Command...)`/`until(BooleanSupplier)`), which itself needs `.named(String)` or `.withAutomaticName()` before it's a usable `Command` — same "needs a name" pattern as every other builder in this API. `Command.sequence(Command...)`/`Command.parallel(Command...)`/`Command.race(Command...)` return the analogous `SequentialGroupBuilder`/`ParallelGroupBuilder` types |
| `org.wpilib.math.util.MathUtil` — full unfiltered `javap -p`, not guessed | **No `clamp` method at all.** Real contents: `lerp`, `inverseLerp`, `applyDeadband` (matches the existing Lesson 2 callout), `copyDirectionPow`, `inputModulus`, `angleModulus`, `isNear`, `slewRateLimit`. This course's own hand-rolled `clamp` (Lesson 5) has no library replacement to graduate to in this alpha |
| `SwerveModuleState` → `SwerveModuleVelocity` — compiled, not guessed | `SwerveModuleState` is **absent** from `wpimath-java-2027.0.0-alpha-6.jar`. Real replacement `org.wpilib.math.kinematics.SwerveModuleVelocity` has the identical `(double, Rotation2d)` constructor and `velocity`/`angle` field shape (field named `velocity`, not `speedMetersPerSecond`). Part of a wider rename: new `SwerveModuleAcceleration`, `ChassisVelocities`, `ChassisAccelerations` (acceleration tracking didn't exist pre-2027). `Translation2d`, `Rotation2d`, `SwerveDriveKinematics` all confirmed present, unchanged shape (`org.wpilib.math.geometry`/`org.wpilib.math.kinematics`) |
| `SmartDashboard` struct support — **confirmed absent**, matches the Lesson 3 plan doc's advance flag | `javap` on `org.wpilib.smartdashboard.SmartDashboard` shows only `putBoolean`/`putNumber`/`putString`/`putBooleanArray`/`putNumberArray`/`putStringArray`/`putRaw`/`putData` — no struct or struct-array method. Real path for structured telemetry (a whole labeled object, or an array of them): `NetworkTableInstance.getDefault().getStructArrayTopic(String, Struct<T>).publish()` once (as a field) → `StructArrayPublisher<T>.set(T[])` every tick. `SwerveModuleVelocity.struct` (a `public static final SwerveModuleVelocityStruct`, confirmed `implements Struct<SwerveModuleVelocity>`) is the struct value Lesson 7 uses. Verified end to end with a real publish/set cycle (no exception) — publishes at NT root, not under `/SmartDashboard/` |
| `NetworkTableInstance.getStructTopic(String, Struct<T>)` / `StructTopic`/`StructPublisher` — compiled, not guessed | The singular sibling of Lesson 7's `getStructArrayTopic`/`StructArrayPublisher`, same shape: `.publish()` once → `StructPublisher<T>.set(T)` every tick. `Rotation2d.struct` (`public static final Rotation2dStruct`) confirmed present, used by Lesson 8 for the Swerve tab's Rotation slot |
| `com.ctre.phoenix6.hardware.Pigeon2` — compiled, not guessed | **Constructor `Pigeon2(int, CANBus)` only** — the same two-arg shift `TalonFX`/`CANcoder` already got, no single-int overload. `getYaw()`/`getYaw(boolean)` (inherited from `CorePigeon2`) return `StatusSignal<Angle>`, same `.getValue().in(Unit)` unpack as every other Phoenix sensor since Lesson 3. `setYaw(double)` and 3 other overloads confirmed present (Try It #3). `Pigeon2SimState.setRawYaw(double)`/`addYaw(double)` (plus `Angle`-typed overloads) confirmed present, matching the old lesson's fake-gyro integration exactly |
| `turnToHeading`'s fake-gyro stability — verified with a real end-to-end test, not assumed to carry over from Lesson 5/7's tuning story | The old lesson's `kP = 0.02` converges cleanly here (settled inside the 2° band in 0.7 s from a standing 90° error, no overshoot) — confirmed with a `DriverStationSim`-backed test driving a real `Pigeon2` through `setRawYaw`. Unlike Lessons 5 and 7, **no kP mismatch was found or expected**: the fake-gyro model is a pure rate integration with no momentum, so there is nothing for a P loop to overshoot against, and any reasonable gain converges by construction (confirmed algebraically: each tick's error multiplies by a fixed factor strictly between 0 and 1) |
| No `getAutonomousCommand()` / no built-in auto-scheduling — **confirmed absent, and confirmed unsafe to work around naively**, see R11 | `OpModeRobot` has nothing resembling V2's `getAutonomousCommand()`/`autonomousInit()` auto-run hook. `Scheduler.schedule(Command)` (the only public scheduling entry point, confirmed via `javap`) carries **no scope parameter** — a command scheduled directly from an opmode's `start()` was confirmed by a real scheduler test to keep `isRunning() == true` forever, with no automatic cancellation when that opmode stops being selected. The verified-safe alternative: bind through a `Trigger` (`RobotModeTriggers.autonomous().onTrue(plan)`) created in the opmode's constructor — confirmed by a real test to be genuinely scope-cancelled (not just prevented from re-firing) the instant the opmode ID changes, for both `.onTrue(...)` and `.whileTrue(...)` |
| `org.wpilib.command3.button.RobotModeTriggers` — compiled and behavior-verified via bytecode, not guessed | `autonomous()`/`teleop()`/`disabled()`/`utility()` confirmed to be exactly `new Trigger(RobotState::isAutonomousEnabled)` and its three siblings (`isTeleopEnabled`, `isDisabled`; `utility()`'s target not separately checked but same shape) — traced via the class's `BootstrapMethods` constant-pool entries, not inferred from the method name |
| Opmode-ID test setup trap — **found and fixed, worth recording so it isn't rediscovered** | `RobotState.getOpModeId()` silently returns `0` forever in a bare `HAL.initialize(...)` test, regardless of `DriverStationSim.setOpMode(long)`, unless `org.wpilib.driverstation.internal.DriverStationBackend.observeUserProgramStarting()` is called first — a flag `OpModeRobot.startCompetition()` sets on a real robot with nothing to set it in a bare test. First attempt at the R11 scope-cancellation test showed the wrong result entirely because of this, before the fix was found |
| `Command.parallel`/`Command.race` vs. `ParallelGroupBuilder.optional`/`.requiring` — confirmed by `javap -c` disassembly, not inferred | `Command.parallel(cmds...)` is exactly `new ParallelGroupBuilder().requiring(cmds)`; `Command.race(cmds...)` is exactly `.optional(cmds)`. `ParallelGroup.run(Coroutine)`'s own bytecode: fork all optional commands, then `awaitAll(required)` if any are required, else `awaitAny(optional)` — so V2's separate `parallel`/`race`/`deadline` collapse into one primitive (required commands decide the finish; optional ones ride along and get cancelled when it happens). Building `Command.parallel(a, b)` where `a` and `b` share a mechanism requirement throws `IllegalArgumentException: Commands running in parallel cannot share requirements` immediately at `.named(...)`-build time — confirmed with a real test, not just documented as "the scheduler will complain" |
| `coroutine.await(...)`-based sequencing vs. `Command.sequence(...)` — functionally verified, not just described | A real scheduler test confirms `coroutine.await(cmd)` calls inside a `Command.noRequirements(...)` body run their sub-commands in the same order and to the same completion semantics as `Command.sequence(...)`. A second test confirms a mechanism's default command does **not** sneak in during the gap between one awaited step finishing and the next starting — the mechanism-release-between-steps behavior the master plan's coroutine-pedagogy section predicted is real, not just a design description |
| `org.wpilib.system.DataLogManager` — compiled, not guessed | Confirmed location (an earlier guess of `org.wpilib.datalog.DataLogManager` was wrong — that package holds the lower-level `DataLog`/log-entry classes `DataLogManager` wraps). `start()` is a plain static no-arg method, matching `LoggedRobot`-era usage exactly |
| PhotonVision 2027 compatibility | Vendordep confirmed present: `photonlib-v2027.0.0-alpha-2.json`, same `vendor-json-repo/2027_alpha5/` bucket. `OpModeRobot`-specific integration unverified |
| `vendor-json-repo` 2027 structure | Confirmed directories: `2027_alpha1`, `2027_alpha5` (the current active bucket — despite the name, it also holds newer per-vendor releases like `REVLib-2027.0.0-alpha6.json`, so the folder name marks the prerelease *channel*, not a hard per-vendor version ceiling). Also present in `2027_alpha5/`: `AmLib`, `DogLog`, `PathplannerLib-2027.0.0-alpha-3.json`, `ThriftyLib` — **no BLine, no maple-sim** (both distribute outside `vendor-json-repo`; see R2) |
| SystemCore removed device classes | Relay, analog output, SPI (incl. SPI IMUs: ADIS16448, ADIS16470, ADXL345, ADXRS450), analog gyro, DMA, built-in accelerometer, digital glitch filter, interrupts, counter, ultrasonic, analog trigger, Nidec Brushless, `Servo`, `Jaguar` — none currently used by this course |
| `Scheduler` and `Sendable` — confirmed via `javap`, see R12 | `org.wpilib.command3.Scheduler` implements only `ProtobufSerializable`, **not** `Sendable`. V2's `edu.wpi.first.wpilibj2.command.CommandScheduler` implements `Sendable`, which is what lets `SmartDashboard.putData(CommandScheduler.getInstance())` publish a running-commands list to NetworkTables for free; this alpha has no equivalent one-liner. Command-name visibility has to be built by hand — see the `getRunningCommandsFor` row below and R12 |
| `Scheduler.getRunningCommands()` / `getRunningCommandsFor(Mechanism)` — behavior-verified, not just typed, see R12 | Both return an empty collection before the scheduler's first `run()` call (confirmed with a real test) — calling `.get(0)` on that result throws. Confirmed safe immediately *after* any `run()` call, including the very first one: every mechanism's auto-installed `idle()` default is already populated by then, so exactly one entry is always present for a mechanism that's had at least one tick. This is why Lesson 1's `logRunningCommand()` has to run as the second statement in `robotPeriodic()`, never the first |
| `Mechanism` idle-command name — confirmed end to end, corrects an earlier isolated-test guess, see R12 | The auto-installed default command's `name()` is `"<ClassName>[IDLE]"` — the mechanism's own `getClass().getSimpleName()` prefixed onto `[IDLE]`, confirmed with a real `Robot`/`DriveModule` end-to-end test (`"DriveModule[IDLE]"`). An earlier, isolated test using an anonymous `new Mechanism() {}` showed bare `"[IDLE]"`, which is consistent rather than contradictory: anonymous classes report an empty string from `getSimpleName()`. Lesson 1's text was corrected to the real, class-prefixed value before shipping |
| `SchedulerEvent` — compiled, not guessed, deliberately unused so far, see R12 and R15 | **`sealed` interface** (confirmed from the raw classfile's `PermittedSubclasses` attribute via `javap -v` — not visible in `javap -p`'s plain header, which is why this was first recorded as just "seven record subtypes") permitting exactly seven concrete `record`s: `Scheduled`, `Mounted`, `Yielded`, `Completed` (each `(Command, long timestampMicros)`), `CompletedWithError` (`(Command, Throwable, long)`), `Interrupted` (`(Command, Command interrupter, long)`), `Canceled` (`(Command, long)`). Consumed via `Scheduler.addEventListener(Consumer<SchedulerEvent>)`. Confirmed to exist and to be the real path to command *history* (start/end/why, not just a live snapshot) — intentionally not taught through Lesson 10; flagged in R12/R15 as the future upgrade once a lesson exists to build it into. **Being sealed means a record-pattern `switch` over it is exhaustiveness-checked by the compiler** — a real, reproduced compile error (`the switch statement does not cover all possible input values`) results from covering fewer than all seven cases without a `default` — see R15 |
| `SchedulerEvent.Scheduled` vs. `.Mounted` firing frequency — behavior-verified with real tests, corrects an assumption made while designing R13's fix | `Mounted` (and its `Yielded` counterpart) fire on **every tick** a command is the one being stepped, whether anything changed or not — confirmed by logging a parked, unchanged command's events across several ticks. `Scheduled` fires **exactly once**, at the instant a command (including the idle default re-taking over) begins controlling a mechanism, and does not refire on later ticks while that command continues unchanged — confirmed the same way. `Scheduled` is the correct signal for "the current command just changed"; `Mounted` is not |
| `getRunningCommandsFor(Mechanism)` can return **empty**, not just "always exactly one entry" — corrects part of the R12 appendix row above, see R13 | True only for the case R12 tested (something else pre-empting the currently-running command). **Not general**: if a freshly-promoted command finishes with zero `yield()` calls on the same tick it was promoted (traced via `javap -c` on `Scheduler.run()`: triggers fire during `eventLoop.poll()`, before that tick's `scheduleDefaultCommands()`/`promoteScheduledCommands()`/`runCommands()`), the mechanism has nothing running for the rest of that tick — the idle default isn't resynthesized until the *following* tick. Confirmed with a real test reproducing `ArrayIndexOutOfBoundsException` on `.get(0)` |
| `Command.requires(Mechanism)` — compiled, not guessed | Default method on `Command`, confirmed via `javap`: `public default boolean requires(Mechanism)`. Answers whether the given mechanism is in the command's own `requirements()` set. Used to filter `Scheduler`'s one shared, robot-wide `SchedulerEvent` stream down to a single mechanism — without it, a listener registered for one mechanism would also fire for every other mechanism's commands |
| `Mechanism.getName()` — compiled and verified, used to make Lesson 7's `logCommandStart` mechanism-agnostic | Confirmed via `javap`: `public java.lang.String getName()`, backed by a private `m_name` field set from a `Mechanism(String)`/`Mechanism(String, Scheduler)` constructor, or defaulted by the protected no-arg constructor every `extends Mechanism` subtype in this course actually uses. Verified with a real test: `new Drivetrain().getName()` returns exactly `"Drivetrain"` — the plain class name, with no `[IDLE]` suffix — confirming it's the same string `idle()`'s command name (`"Drivetrain[IDLE]"`, see the R12 appendix row) is built from. Iterating `command.requirements()` and keying `SmartDashboard.putString(mechanism.getName() + "/CurrentCommand", ...)` per entry reproduces the exact same dashboard keys Lessons 3 and 7 had been hardcoding by hand, with no code left that names a mechanism explicitly |
| Real crash scenario in previously-shipped lesson code, found and fixed by R13, not hypothetical | Lesson 8's `southFace().onTrue(turnToHeading(90))` (and `eastFace().onTrue(turnToHeading(0))`) can finish with zero coroutine yields if the robot is already within `turnToHeading`'s 2° tolerance when the button is pressed — the sim `Pigeon2` starts at 0°, so `turnToHeading(0)` hits this on the very first press on a stock sim. Verified this reproduces `ArrayIndexOutOfBoundsException` in R12's `logRunningCommand()` when bound exactly the way Lesson 8 binds it, and verified the R13 fix no longer throws, against the real rolled-forward Lesson 9 `Robot`/`Drivetrain` classes via `tools/verify-lessons-v3.sh 9`'s own sandbox |
| `org.wpilib.math.kinematics.ChassisVelocities` — compiled, not guessed, see R14 | Replaces `ChassisSpeeds`. Public fields `vx`/`vy`/`omega` (plain `double`, not the old `*MetersPerSecond`/`omegaRadiansPerSecond` names). Constructors: no-arg (zero), `(double, double, double)`, `(LinearVelocity, LinearVelocity, AngularVelocity)`. Instance methods, all confirmed pure via `javap -c` (construct-and-return, never touch `this`): `toRobotRelative(Rotation2d)`, `toFieldRelative(Rotation2d)`, `discretize(double)`, `toTwist2d(double)`, `plus`/`minus`/`unaryMinus`/`times`/`div`. **No static `fromFieldRelativeSpeeds` factory** — that's the old API's shape; this one converts via the instance method `toRobotRelative` on a value already representing field-relative speeds |
| `SwerveDriveKinematics` renamed methods — compiled, not guessed, see R14 | `toSwerveModuleStates(ChassisSpeeds)` → `toSwerveModuleVelocities(ChassisVelocities)` (also a 2-arg overload taking a center-of-rotation `Translation2d`, and a `toWheelVelocities` alias). `desaturateWheelSpeeds` → `desaturateWheelVelocities`, four overloads confirmed, including the `LinearVelocity`-typed one `(SwerveModuleVelocity[], LinearVelocity)` the lesson uses to avoid an early `.in(...)` unpack. Constructor `SwerveDriveKinematics(Translation2d...)` unchanged in shape |
| `SwerveModuleVelocity.optimize(Rotation2d)` — disassembled via `javap -c`, not assumed to match the old mutating API, see R14 | **Pure function**, confirmed from bytecode: allocates and returns a new `SwerveModuleVelocity`, never writes back to `this`. Logic: if `|angle.minus(currentAngle).getDegrees()| > 90`, returns `(-velocity, angle.rotateBy(Rotation2d.kPi))`; otherwise returns `(velocity, angle)` unchanged. A verbatim port of the old lesson's mutating-call pattern (`states[i].optimize(...); use states[i];`) would compile and silently do nothing — confirmed with a real test that the receiver is genuinely untouched after the call |
| `SwerveModuleVelocity.cosineScale(Rotation2d)` — disassembled via `javap -c`, discovered not ported from the old lesson (didn't exist in that API), see R14 | Pure function, confirmed from bytecode: returns `new SwerveModuleVelocity(velocity * angle.minus(currentAngle).getCos(), angle)` — the exact hand-rolled cosine-compensation trick Lesson 9 already built into `SwerveModule.setDesiredState`, now available as a one-line library call. Not adopted in Lesson 10 (see R14 for why), but recorded so a future maintainer doesn't rediscover it as a surprise |
| `SwerveModuleVelocity`/`ChassisVelocities` field storage vs. constructor — compiled, not guessed | Both types accept a `LinearVelocity`/`AngularVelocity`-typed constructor, but the field actually stored (`velocity`, or `vx`/`vy`/`omega`) is a plain `double`, confirmed via `javap`. Units apply at the boundary where the value is built; once inside these particular kinematics types, the math is bare doubles — the same "Units at the edges, plain numbers in the middle" rule the course has followed since Lesson 3, now visible inside a library type instead of just user code |
| `Rotation2d.fromDegrees(...).getDegrees()` normalizes — confirmed with a real test, worth recording so it isn't mistaken for a different method's bug | `Rotation2d.fromDegrees(190).getDegrees()` returns `-170.0`, not `190.0` — `Rotation2d` stores/reports angles normalized to (-180, 180], which is `Rotation2d`'s own long-standing behavior, not anything `optimize()` or `cosineScale()` do to it. Surfaced during R14's testing and initially looked like it might be an `optimize()` discrepancy before the actual source was traced |
| `org.wpilib.math.kinematics.SwerveModulePosition`/`SwerveDriveOdometry`/`org.wpilib.math.geometry.Pose2d` — compiled, not guessed, see R16 | All present under `org.wpilib.math.*` with the pre-2027 shapes intact. `SwerveModulePosition` fields `distance`/`angle` (plus a `Distance`-typed constructor overload). `SwerveDriveOdometry(SwerveDriveKinematics, Rotation2d, SwerveModulePosition[])` (3-arg, defaults to origin) and the 4-arg overload taking an initial `Pose2d`; `update(Rotation2d, SwerveModulePosition[])` returns the fresh `Pose2d` directly. `Pose2d` unchanged: `getX()`/`getY()`/`getRotation()`, `minus(Pose2d)` returning a `Transform2d` (`.getTranslation().getNorm()` for the scalar distance), `.struct` present |
| `Odometry<T>.getPose()` — compiled, not guessed, corrects the old API's `getPoseMeters()`, see R16 | The parent class `SwerveDriveOdometry` extends, confirmed via `javap`: `getPose()`, not `getPoseMeters()`. A verbatim port of the old lesson's call fails to compile — the safe kind of break |
| `NeedsNameBuilderStage.until(BooleanSupplier)` vs. `Command.until(BooleanSupplier)` — both compiled, behaviorally distinct, see R16 | Two different methods with the same name at different points in the builder chain. `NeedsNameBuilderStage.until(...)` (called on `run(...)`/`runRepeatedly(...)`'s return value, before `.named(...)`) returns `NeedsNameBuilderStage`, so the chain still finishes with one `.named(...)`. `Command.until(...)` (called on an already-built `Command`) returns a `ParallelGroupBuilder` that itself needs a *second* `.named(...)`/`.withAutomaticName()`. Using the builder-stage one keeps `driveToPose` a single chain |
| `.until(...)`'s finish mechanism — behavior-verified with a real scheduler test, not inferred, see R16 | Ends the command via **interruption**, not a natural coroutine finish — confirmed by tracking a `.whenCanceled(...)` flag alongside a tick counter: the flag is set the same tick the condition flips true and the command stops. This is the deliberate contrast with R9 (Lesson 6): a coroutine body returning on its own does *not* fire `.whenCanceled(...)`, but `.until(...)` always does, because its stop mechanism is cancellation either way. Also confirmed: if the condition is already true at schedule time, the body still executes once before the command finishes (checked after each tick) — not a zero-tick case |
| `Rotation2d.minus` sign, re-verified rather than trusted from the old lesson's Try It text, see R16 | `Rotation2d.fromDegrees(170).minus(Rotation2d.fromDegrees(-170))` returns **−20.0°** via a real test, not the old lesson's claimed "+20°". `Rotation2d`'s wrap-to-shortest-path behavior itself is correct and unchanged (confirmed magnitude is 20°, matching "turn the short way, not 340°") — only the sign printed in the old lesson's prose was wrong for this alpha, or possibly always was |
| Phoenix 6 config/control API — compiled against the real `wpiapi-java-26.50.0-alpha-1.jar`, confirmed unchanged by the 2027 rename, see R17 | `com.ctre.phoenix6.*` stays as-is (the `org.wpilib` rename only touched first-party WPILib packages). `TalonFXConfiguration.Feedback` (`FeedbackConfigs`: `FeedbackRemoteSensorID` int, `FeedbackSensorSource` enum, `RotorToSensorRatio`/`SensorToMechanismRatio` doubles), `.ClosedLoopGeneral.ContinuousWrap` boolean, `.Slot0` (`Slot0Configs`: `kP`/`kV`/etc. doubles) all confirmed present with these exact field names via `javap`. `PositionVoltage(double)`/`(Angle)` and `VelocityVoltage(double)`/`(AngularVelocity)` constructors, `.withPosition(...)`/`.withVelocity(...)` overloads (double and measure-typed) all confirmed. `FeedbackSensorSourceValue.RemoteCANcoder` confirmed present among the enum's values |
| `org.wpilib.simulation.DCMotorSim` has no `getAngularPositionRotations()`/`getAngularVelocityRPM()` — confirmed absent, not just unneeded, see R17 | Full `javap` listing shows only `getAngularPosition()`/`getAngularVelocity()`, both in radians / radians-per-second (the Lesson 4 finding). The old lesson's CANcoder sim-feed code names methods that don't exist on this class at all; the fix reuses the same `/(2 * Math.PI)` conversion already sitting two lines above it in `simulatePeriodic()`, not a same-named replacement |
| `com.ctre.phoenix6.sim.CANcoderSimState` — compiled, not guessed | `setRawPosition(double)`/`(Angle)`, `setVelocity(double)`/`(AngularVelocity)`, both confirmed present, plain-rotation semantics matching the CANcoder's own native unit (no gear multiply needed, since the CANcoder sits directly on the wheel) |
| `Rotation2d.getMeasure()` — compiled, not guessed | Returns `Angle`, confirmed via `javap`. This is what lets `PositionVoltage.withPosition(state.angle.getMeasure())` take a `SwerveModuleVelocity`'s `angle` field directly with no degrees-to-rotations conversion written by hand — Phoenix's control requests and WPILib's geometry types share the same `Angle`/`AngularVelocity` measure types |
| Build target | `code/OpModeV3Robot/build.gradle`: `sourceCompatibility`/`targetCompatibility = JavaVersion.VERSION_25`, GradleRIO `2027.0.0-alpha-6`, shadow plugin `9.3.0`; deploys to a `SystemCore` target via `getTargetTypeClass('SystemCore')` |
| `org.wpilib.framework.RobotBase.isReal()` — compiled, not guessed, see R18 | Present, same signature/behavior as the pre-2027 `edu.wpi.first.wpilibj.RobotBase.isReal()` — just moved packages. Used for `Constants.kCurrentMode = RobotBase.isReal() ? Mode.REAL : kSimMode;` |
| IO-layer pattern in this alpha (`ModuleIO`/`GyroIO`) — compiled and end-to-end verified, see R18 | Interface with `public default void ...() {}` no-op methods, a nested `public static class ...Inputs` holding plain public fields (no codegen — this track's `SmartDashboard`-based logging, per R1, has each owning class `putNumber` its own Inputs fields manually instead of an `@AutoLog`-generated writer). One hardware `implements`, one sim class that `extends` the hardware class to reuse Phoenix's simulated firmware (`protected` fields on the hardware class are the seam), and one `new ModuleIO() {}`/`new GyroIO() {}` anonymous class for the dormant `REPLAY` arm — all selected once per instance via a `switch` expression over `Constants.Mode`, not re-checked per tick |
| `DriverStationSim.setEnabled(boolean)` + `.notifyNewData()` — required for any test that drives Phoenix simulated firmware, see R18 | Without it, Phoenix's simulated motors output nothing — every control request silently produces 0 V and dependent sensor readings never move, with no exception thrown. Confirmed to reproduce in this alpha, matching the main 2026 course's own documented Lesson 29 finding |
| GradleRIO test-task JVM args — **re-confirmed with a clean, deterministic repro**, see R19 | Corrects R18's retracted "ran clean" observation. A bare `new Drivetrain()` (a `Mechanism`, nothing else in the test) reliably throws `IllegalAccessException` from `ContinuationScope.<clinit>` under the unmodified `code/OpModeV3Robot/build.gradle`, every time; adding `jvmArgs '--add-opens', 'java.base/jdk.internal.vm=ALL-UNNAMED'` / `'java.base/java.lang=ALL-UNNAMED'` / `'--enable-native-access=ALL-UNNAMED'` to the sandbox's `test { }` block reliably fixes it, every time. The original appendix claim (`configureTestTasks(test)` does not add these) stands |
| `org.wpilib.math.estimator.SwerveDrivePoseEstimator`/`PoseEstimator<T>` — compiled, not guessed, see R19 | `SwerveDrivePoseEstimator extends PoseEstimator<SwerveModulePosition[]>`; the real methods (`update`, `updateWithTime`, `getEstimatedPosition`, `resetPosition`, `addVisionMeasurement` (2 overloads), `setVisionMeasurementStdDevs`) live on the generic base class, confirmed via `javap` on both. Constructors: `(SwerveDriveKinematics, Rotation2d, SwerveModulePosition[], Pose2d)` and a 6-arg overload adding state/vision std-dev `Matrix<N3,N1>`s |
| `org.wpilib.math.linalg.VecBuilder`/`Vector<N>` — compiled, not guessed, see R19 | Moved from the pre-2027 `edu.wpi.first.math` root to `org.wpilib.math.linalg`. `Vector<R> extends Matrix<R, N1>`, confirmed via `javap`, so `VecBuilder.fill(double, double, double)`'s `Vector<N3>` result is assignment-compatible with a `Matrix<N3, N1>` parameter (e.g. `setVisionMeasurementStdDevs`) with no cast |
| `org.wpilib.system.Timer` — compiled, not guessed, see R19 | No `getFPGATimestamp()` in this alpha (confirmed via full `javap` listing); renamed `getTimestamp()`. Consistent with the aside-odometry-thread appendix's already-recorded `Timer::getTimestamp` reference |
| `Scheduler.addPeriodic(Runnable)` doesn't require a `Mechanism` — confirmed, used deliberately by Lesson 14's `Localizer`, see R19 | Takes a bare `java.lang.Runnable`, confirmed via `javap`. Any class can get a scheduler heartbeat this way, not just `Mechanism` subclasses — `Localizer` is the first class in the track to rely on `addPeriodic` as its *only* connection to the scheduler, with no `Mechanism`-ness alongside it, verified to tick correctly in a real test |
| PhotonLib `v2027.0.0-alpha-2` — compiled against real jars, not guessed, see R20 | `org.photonvision.*` package names unchanged from pre-2027 PhotonLib (sits outside the `org.wpilib` rename, same as Phoenix 6). `PhotonCamera(String)`, `.getAllUnreadResults()`, `PhotonPoseEstimator(AprilTagFieldLayout, Transform3d)`, `.estimateCoprocMultiTagPose(PhotonPipelineResult)`/`.estimateLowestAmbiguityPose(PhotonPipelineResult)` all confirmed present with unchanged signatures. `EstimatedRobotPose`'s three public fields (`estimatedPose`, `timestampSeconds`, `targetsUsed`) confirmed unchanged. New in this alpha, not used by the lesson: `estimatePnpDistanceTrigSolvePose`, `estimateConstrainedSolvepnpPose`, `estimateRioMultiTagPose`, `estimateClosestToCameraHeightPose`, `estimateClosestToReferencePose`, `estimateAverageBestTargetsPose` |
| `org.wpilib.vision.apriltag.AprilTagFieldLayout`/`AprilTagFields` — compiled, not guessed, see R20 | Moved from the pre-2027 `edu.wpi.first.apriltag` root. `AprilTagFieldLayout.loadField(AprilTagFields)` static factory confirmed present; `AprilTagFields.kDefaultField`/`k2026RebuiltWelded`/`k2026RebuiltAndymark` all confirmed present among the enum's values |
| `org.photonvision.simulation.VisionSystemSim`/`PhotonCameraSim`/`SimCameraProperties` — compiled and end-to-end runtime-verified, see R20 | `VisionSystemSim(String)`, `.addAprilTags(AprilTagFieldLayout)`, `.getDebugField()` (returns `org.wpilib.smartdashboard.Field2d` — this track's own type, no cross-package mismatch), `.addCamera(PhotonCameraSim, Transform3d)`, `.update(Pose2d)` all confirmed present and, unlike most appendix rows, verified to actually *work*: a real test drove a simulated camera to correctly report a multi-tag pose within centimeters of a known true position |
| `VisionSystemSim`'s vision-sim architecture has no independent ground truth — a real, tested limitation, not a guess, see R20 | `poseSupplier` (fed to `VisionIOPhotonVisionSim`) is the same fused `Localizer` estimate vision itself corrects. Confirmed by two failed-as-expected tests: seeding a deliberately wrong pose near a real tag never converged toward the tag's true position (error flat at ~0.71 m over 150 ticks), and mismeasuring `robotToCamera` by 0.3 m produced no detectable skew (max error 1.5 cm, indistinguishable from ordinary sim noise) — because that same transform is used to both place the fake camera and un-project its detections, canceling itself out. What *is* verified to work: the fused pose tracks a correctly-seeded true pose within 15 cm over 150 ticks of real multi-tag detections |

---

## Housekeeping checklist

- [x] Swap `CommandsV2.json` for `CommandsV3.json` in `code/OpModeV3Robot`
      (OD1) — done 2026-08-10, content copied from `wpilibsuite/allwpilib`
      source at the pinned tag.
- [x] Decide MyTeleop/MyAuto → RobotTeleop/RobotAuto timing (OD2) — confirmed
      Lesson 9.
- [x] Decide single vs. multiple autonomous opmodes (OD3) — resolved:
      multiple `@Autonomous` classes.
- [x] Decide Xbox-specific vs. generic gamepad framing (OD5) — resolved: use
      `CommandGamepad`'s generic naming.
- [x] Retire `docs/lessons/aside-commands-v3.md` — done 2026-08-10, content
      folded into this plan (see [Retired: the Commands V3 aside](#retired-the-commands-v3-aside)).
- [x] Pin exact vendordep versions for the libraries the first 4 lessons
      need — see the appendix: `CommandsV3` (installed), `Phoenix6-26.50.0-alpha-1.json`
      (Lesson 1). AdvantageKit's pin (`AdvantageKit-27.0.0-alpha-4.json`) is
      recorded for the future replay pass but not needed now.
- [x] Team decision (2026-08-10): proceed without AdvantageKit's replay
      ability for now; use plain `SmartDashboard.putNumber(...)`/`putBoolean(...)`
      for the actual per-tick logging calls (Epilogue investigated same day,
      found technically workable via its `EpilogueBackend` API — which
      bypasses `@Logged`/`bind()`'s `TimedRobot`-only problem — but dropped as
      more machinery than needed); keep the IO-layer structure (interfaces,
      Inputs classes, `Constants.Mode` switch) so replay can be added back
      additively later. See
      [Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables).
      This unblocks Lesson 3 (and, structurally, Lesson 13) — see R1.
- [ ] Track AdvantageKit's releases for `OpModeRobot` support landing (R1) —
      no longer blocking, but is the trigger for the follow-up pass that adds
      real replay back to the IO layers built in this track.
- [ ] Verify maple-sim / BLine 2027-alpha status directly at their own hosts
      (R2) before writing Lessons 16, 17, 22, 25–27 — PhotonVision's status is
      now confirmed better (vendordep exists), but its `OpModeRobot`
      integration is still unverified.
- [x] `DataLogManager`'s exact 2027 package — resolved 2026-08-11, compiled
      not guessed: `org.wpilib.system.DataLogManager`. The earlier guess
      (`org.wpilib.datalog`) was wrong.
- [x] `tools/verify-lessons-v3.sh` built (R6) — the v3-track sibling of
      `tools/verify-lessons.sh`, using `code/v3/lesson-N` as the snapshot
      naming (resolving that open item too). Lessons 0–3 compile through it
      against the real pinned jars.
- [ ] Resolve OD4 (StateMachine adoption) and OD6 (roboRIO → SystemCore
      terminology pass) with the user.
- [x] Resolved 2026-08-11 — `BindingScope.createNarrowestScope` sees the new
      opmode's ID during its constructor, not just from `start()` onward.
      Traced through `loopFunc()`'s bytecode: `refreshData()` and
      `Robot`'s own `m_word` are refreshed from the *same* underlying cache
      at the very top of the tick, before the "opmode changed" branch
      constructs the new opmode later in that same call — and
      `RobotState.getOpModeId()` → `DriverStationBackend.getOpModeId()`
      reads that identical cache. So by the moment the constructor runs, the
      DS-reported "current opmode" is already the one being built, and a
      `Trigger` created right there scopes correctly. This is additional,
      independent confirmation for the constructor-vs-`start()` finding
      below, not just the `start()`-fires-repeatedly argument on its own.
- [x] Corrected 2026-08-11: hardware ownership (`DriveModule`,
      `CommandGamepad`) moved from `MyTeleop` to `Robot`, effective Lesson 1,
      not Lesson 9 — see [the transition section](#the-myteleopmyauto--robotteleop-transition).
      Found while writing Lessons 0–3, not by re-reading source alone: traced
      through `OpModeRobot.loopFunc()`'s reconstruction-on-reselect behavior
      and confirmed `Scheduler.addPeriodic(Runnable)` has no scope cleanup at
      all. `docs/lessons/v3/01-first-motor.md` and `02-joystick-control.md`
      already reflect the fix.
- [x] Real Phoenix 6 API changes found and fixed by compiling, 2026-08-11
      (R3): no `TalonFX.set(double)` (`setThrottle(double)` instead),
      `CANBus.systemcore` is lowercase, `StatusSignal.getValueAsDouble()`
      is gone (`getValue().in(Unit)` instead) — see the appendix.
- [ ] R7 (new): the `StatusSignal` finding above means Units arrive by
      Lesson 3, not Lesson 10 — revisit the v3 track's Units-sequencing plan
      once later lessons are drafted.
- [ ] A JDK matching `sourceCompatibility` (`VERSION_25` currently) must be
      on `PATH`/`JAVA_HOME` to run `tools/verify-lessons-v3.sh` — this
      sandbox only had Java 21 by default and needed
      `apt-get install openjdk-25-jdk-headless` first (R5, resolved).
- [x] Resolved 2026-08-11 — the missing `Scheduler.getDefault().run()` tick,
      the corrected `start()`-fires-on-every-re-enable timing, and the
      confirmed lack of disabled-state gating on `Scheduler`/`Trigger`. Found
      while answering a direct question about whether Lesson 1's bindings
      belonged in the constructor or `start()` — turned out the more urgent
      problem was that nothing ticked the scheduler at all, so no binding
      anywhere would have run either way. All three are fixed/documented in
      Lesson 1 and `code/v3/lesson-1/Robot.java` (cascaded to lesson-3); full
      writeup with the bytecode traces and the `DriverStationSim`-based test
      is in `docs/lesson-plan-v3-0-3.md`'s Lesson 1 section.
- [ ] GradleRIO's `configureTestTasks(test)` doesn't add the JVM args
      Commands V3's coroutines need at runtime (only `configureSimulationTask`
      does) — flagged for whoever plans this track's testing lesson; see the
      appendix row and `docs/lesson-plan-v3-0-3.md`'s housekeeping for the
      exact `jvmArgs` to add.
- [ ] See [docs/lesson-plan-v3-0-3.md](lesson-plan-v3-0-3.md) for the
      detailed Lessons 0–3 plan and its own open items.
- [x] Lesson 4 (Simulation) written and verified 2026-08-11 —
      `docs/lessons/v3/04-simulation.md` and `code/v3/lesson-4/`, compiling
      through `tools/verify-lessons-v3.sh 4`. Real findings, not carried over
      unchanged from the old lesson: `LinearSystemId` doesn't exist in this
      alpha (`Models.singleJointedArmFromPhysicalConstants` replaces it —
      same math), `DCMotorSim` moved package and now reports radians/radians-
      per-second instead of rotations/RPM (confirmed with an end-to-end
      `DriverStationSim` test converging on the Kraken X60's real free
      speed), and `Mechanism` has no `simulationPeriodic()` hook, so the
      lesson has `DriveModule` expose a plain `simulatePeriodic()` method
      that `Robot.simulationPeriodic()` calls — the same "Robot orchestrates,
      mechanism computes" shape Lesson 1 already established for the
      scheduler tick. See the appendix for the full API detail.
- [x] Lesson 5 (Steering P control) written and verified 2026-08-11 —
      `docs/lessons/v3/05-steering-p-control.md` and `code/v3/lesson-5/`,
      compiling through `tools/verify-lessons-v3.sh 5`. `CANcoder` needed the
      same `(int, CANBus)` constructor shift as `TalonFX`, and
      `getAbsolutePosition()` needed the same `.getValue().in(Rotations)`
      unpack every `StatusSignal` has needed since Lesson 3 — both
      mechanical. **The one real finding is R8**: the old lesson's
      `kP = 0.01` is unconditionally unstable here, not just aggressive —
      empirically bisected to a real stability boundary (`0.0005` converges,
      `0.001` oscillates, `0.002` diverges) with a `DriverStationSim`-backed
      test, and the lesson ships the verified value with its worked example
      and tuning guidance rewritten to match. Flagged as possibly affecting
      the existing 2026-track course's identical numbers too, not verified
      against that course's own tooling — see R8.
- [x] Lesson 6 (Distance & commands) written and verified 2026-08-11 —
      `docs/lessons/v3/06-distance-and-commands.md` and `code/v3/lesson-6/`,
      compiling through `tools/verify-lessons-v3.sh 6`. Gear-ratio/wheel-
      circumference math and the sim's rotor↔wheel conversion chain both
      confirmed correct with a real `DriverStationSim`-backed end-to-end test
      (`driveDistance(1.0, 0.4)`-equivalent stopped at 1.027 m after 0.64 s
      simulated — no double-applied or missing gear ratio). **The one real
      finding is R9**: `.whenCanceled(...)` does not fire on a natural
      coroutine finish, confirmed with a scheduler test, not inferred — so
      `driveDistance` needed cleanup written at both endings, and the lesson
      teaches the split explicitly (including a Try It that has the student
      confirm it by printing from both paths). `Coroutine.waitUntil(...)`
      confirmed to be exactly a `while (!cond) yield();` loop, so "a command
      that finishes" needed no new decorator at all — see R9.
- [x] Lesson 7 (Four modules) written and verified 2026-08-11 —
      `docs/lessons/v3/07-four-modules.md` and `code/v3/lesson-7/`, compiling
      through `tools/verify-lessons-v3.sh 7`. The biggest refactor lesson so
      far: `DriveModule` → `SwerveModule` (drops `Mechanism`, gains
      constructor parameters), new `Drivetrain extends Mechanism` owning a
      four-element array. **Three real findings, all in R10**: no
      `MathUtil.clamp` in this alpha (kept the hand-rolled one for good),
      `SwerveModuleState` renamed to `SwerveModuleVelocity`, and —
      the significant one — `SmartDashboard` has no struct-array publish
      method at all, so the Swerve-tab payoff needed real
      `NetworkTableInstance.getStructArrayTopic(...).publish()`/`.set(...)`,
      verified end to end with no exception. This is the "no `SmartDashboard`
      one-liner for struct types" gap the Lesson 3 plan doc flagged in
      advance, arriving one lesson earlier than predicted. Also verified:
      `rotate()`'s per-corner angles match the lesson's own documented table
      exactly (135°/45°/-135°/-45°). `tools/verify-lessons-v3.sh` gained its
      first deletion-replay entry (`del 7 subsystems/DriveModule.java`),
      mirroring the main course's script at the identical lesson number —
      see R10.
- [x] Lesson 8 (Gyro & heading) written and verified 2026-08-11 —
      `docs/lessons/v3/08-gyro-heading.md` and `code/v3/lesson-8/`, compiling
      through `tools/verify-lessons-v3.sh 8`. Mechanical only, no library
      surprises this time: `Pigeon2(int, CANBus)` and `.getValue().in(Degrees)`
      both match the same two patterns established since Lessons 1 and 3.
      `turnToHeading`'s `kP = 0.02` verified to converge cleanly with a real
      end-to-end `DriverStationSim` test (0.7 s to settle, no overshoot) — no
      retuning needed here, unlike Lessons 5 and 7, because the fake-gyro
      integration has no momentum to overshoot against. `turnToHeading` is
      also the first finishing command whose loop body does real per-tick
      work (an explicit `while` + `coroutine.yield()`, not
      `coroutine.waitUntil(...)`), and the lesson explains why one over the
      other. `Rotation2d.struct` + `getStructTopic`/`StructPublisher`
      (Lesson 7's array publisher's singular sibling) confirmed present and
      used for the Swerve tab's Rotation slot.
- [x] Lesson 9 (Autonomous) written and verified 2026-08-11 —
      `docs/lessons/v3/09-autonomous.md` and `code/v3/lesson-9/`, compiling
      through `tools/verify-lessons-v3.sh 9`. The rename (`MyTeleop`→`RobotTeleop`,
      `MyAuto`→`RobotAuto`) landed here as the master plan recommended, with a
      new `tools/verify-lessons-v3.sh` deletion entry for both old files.
      **R11 is the headline finding**: this framework has no
      `getAutonomousCommand()` hook at all, and the naive fix (schedule the
      auto plan directly from `start()`) is a real, confirmed leak — a
      scheduler test showed a directly-scheduled command never gets
      cancelled when the opmode changes. The verified-safe pattern,
      `RobotModeTriggers.autonomous().onTrue(plan)` bound in the
      constructor, was confirmed by a real test to genuinely cancel on
      opmode change (not just stop re-firing) — closing an item this plan
      doc had flagged as still-open since the rename section was written.
      Found and fixed a real test-setup trap along the way
      (`DriverStationBackend.observeUserProgramStarting()` needed before
      `RobotState.getOpModeId()` reflects `DriverStationSim.setOpMode(...)`
      at all) — recorded so it isn't rediscovered. Also verified:
      `Command.parallel`/`.race` reduce to `ParallelGroupBuilder`'s
      `.requiring`/`.optional` split (unifying V2's three-way parallel/race/
      deadline split into one primitive), building a parallel group with a
      shared-mechanism conflict throws immediately with a clear message, and
      `coroutine.await(...)`-based sequencing matches `Command.sequence(...)`'s
      ordering with no default-command flicker in the gap between steps. See
      R11 for the full writeup.
- [x] Command-name logging retrofitted into Lesson 1 and cascaded through
      Lessons 3, 4, and 7 — done 2026-08-12, prompted by a direct user
      question rather than found in a verification pass. `Scheduler` has no
      `Sendable` free path the way V2's `CommandScheduler` does, so
      `Robot.logRunningCommand()` (`getRunningCommandsFor(module).get(0).name()`
      → `SmartDashboard.putString(...)`) was added by hand at the point
      Lesson 1's text already promises it ("logs and on screen"). Verified
      empty-before-first-tick and the real `"DriveModule[IDLE]"` idle name
      before shipping either claim into lesson text. **Deliberately flagged
      as interim, not final** — `SchedulerEvent`/`addEventListener` is the
      real history-capable path and is intentionally left for a later
      revisit. See R12 and the new appendix rows.
- [x] R12's "revisit later" landed immediately, not deferred — done
      2026-08-12, following a user suggestion to move the fix to Lesson 3.
      Turned into a real bug find, not just a nicer example:
      R12's polling-based `logRunningCommand()` throws
      `ArrayIndexOutOfBoundsException` on a real, already-shipped scenario
      (Lesson 8's `onTrue(turnToHeading(...))` finishing with zero yields
      because the sim gyro starts already at 0°). Root cause traced via
      `javap -c` on `Scheduler.run()`'s tick order; fix is an
      `addEventListener`/`SchedulerEvent.Scheduled` listener filtered with
      `Command.requires(Mechanism)`, landed at Lesson 3 and cascaded through
      Lessons 4 and 7 (Lesson 1 deliberately unchanged — still safe for
      everything it teaches, and now explicitly superseded two lessons
      later instead of "eventually"). Verified with a real
      `Trigger`-bound press/hold/release cycle and against the actual
      rolled-forward Lesson 9 classes. See R13 and its appendix rows.
- [x] R13 addendum, same day, on user direction: `logCommandStart` made
      mechanism-agnostic at Lesson 7, closing the per-lesson rename churn
      both R12 and R13 kept hitting for good. Rewritten to loop
      `scheduled.command().requirements()` and key off
      `Mechanism.getName()` instead of a hardcoded mechanism/string pair —
      placed at Lesson 7 specifically because that's where the enhanced
      `for` loop is actually taught (confirmed Lesson 5 and Lesson 7 both
      still correctly claim their loop constructs as new, so Lessons 3–4
      keep the simpler single-mechanism version deliberately). Verified
      with `javap` and a real test (`getName()` returns the plain class
      name) and re-confirmed against the rolled-forward Lesson 9 classes.
- [x] Lesson 10 (Kinematics) written and verified 2026-08-12 —
      `docs/lessons/v3/10-kinematics.md` and `code/v3/lesson-10/`, compiling
      through `tools/verify-lessons-v3.sh 10`. **R14** covers the real
      findings: the kinematics family renamed past a simple `State`→
      `Velocity` swap (`ChassisSpeeds`→`ChassisVelocities`, fields `vx`/
      `vy`/`omega`), and — the one that would have silently broken a
      faithful port — `SwerveModuleVelocity.optimize(Rotation2d)` is a pure
      function in this alpha, not the old mutating call, confirmed by
      `javap -c` disassembly and a real test. The lesson text calls this
      out as "a real trap," not a passing mention. Also found and
      deliberately not adopted: a native `cosineScale(Rotation2d)` that
      duplicates Lesson 9's hand-rolled cosine compensation. Field-relative
      driving's shape changed too — `fieldSpeeds.toRobotRelative(Rotation2d)`
      replaces the old static `fromFieldRelativeSpeeds` factory — verified
      both algebraically (hand-computed rotation) and through the full real
      pipeline (`Drivetrain`/`SwerveModule`/TalonFX sim/Pigeon2 sim) with a
      `DriverStationSim`-backed test. Since Units already arrived at Lesson
      3 in this track (R7), Lesson 10's concept list was rewritten to not
      re-claim them as new — only the kinematics data types, the indexed
      `for` loop, `MathUtil.inputModulus`, and `.times(...)` scaling are new
      here. See R14 for the full writeup, including a real testing trap
      (`simulatePeriodic()` overwriting a manually-forced sim gyro reading
      unless its shadow field is kept in sync too).
- [x] R15, 2026-08-12: evaluated a suggested record-pattern `switch` over
      `SchedulerEvent` for the R12/R13 command logging, attributed to a
      WPILib developer recommendation. Confirmed `SchedulerEvent` is
      genuinely `sealed` (classfile `PermittedSubclasses` attribute, not
      previously recorded that precisely) and that the suggested snippet as
      given does not compile — sealed-type switch exhaustiveness is real
      and enforced, reproduced directly (`the switch statement does not
      cover all possible input values`) with only 4 of 7 cases and no
      `default`. Both fixes (all seven cases, or a `default`) verified to
      compile, and the record-deconstruction binding itself verified
      correct at runtime with a real scheduler test. **Not adopted into any
      shipped lesson** — bundles `switch`, record patterns, and sealed
      exhaustiveness, none taught anywhere in this track yet, well past
      Lesson 3's single `instanceof` check. Recorded instead as the
      concrete recommended shape for R12's already-deferred "richer event
      system" revisit, exhaustiveness caveat included. See R15 and the
      updated `SchedulerEvent` appendix row.
- [x] Lesson 11 (Odometry & field view) written and verified 2026-08-12 —
      `docs/lessons/v3/11-odometry-field.md` and `code/v3/lesson-11/`,
      compiling through `tools/verify-lessons-v3.sh 11`. **R16** covers the
      real findings: `Odometry<T>.getPoseMeters()` renamed to `getPose()`
      (confirmed via `javap`, would have failed to compile ported
      verbatim); no `periodic()` hook exists to add the odometry update to
      (folded into the already-registered `logTelemetry()` callback
      instead, with the lesson saying so directly rather than silently
      papering over the old lesson's instructions); and — the one with
      real teaching value — `.until(...)` reliably fires
      `.whenCanceled(...)` on every ending (confirmed with a real scheduler
      test), the deliberate contrast with R9's Lesson 6 finding that a
      natural coroutine finish does *not* fire it, which lets
      `driveToPose` use one cleanup path where `driveDistance` needed two.
      Also caught and corrected a real numeric error in the old lesson's
      own Try It text: `Rotation2d.fromDegrees(170).minus(Rotation2d.fromDegrees(-170))`
      is verified **−20°**, not the old lesson's claimed "+20°". Verified
      end to end with `DriverStationSim`-backed tests: driving forward
      increases odometry's X, `resetPose` moves the tracked origin exactly,
      and `driveToPose` converges to within its 5 cm tolerance and stops
      cleanly. Full compile re-verified from a fresh sandbox (0–11) plus
      independent checkpoints at 1, 3, 4, 7, 9, 10.
- [x] Lesson 12 (Model-based control) written and verified 2026-08-13 —
      `docs/lessons/v3/12-model-based-control.md` and `code/v3/lesson-12/`,
      compiling through `tools/verify-lessons-v3.sh 12`. **R17** covers the
      real findings: Phoenix 6's config/control-request API ports
      essentially unchanged (it sits outside the `org.wpilib` 2027 rename
      entirely, confirmed via `javap`), but two things needed real
      correction rather than a straight port — the old lesson's
      `DCMotorSim.getAngularPositionRotations()`/`getAngularVelocityRPM()`
      calls for the CANcoder's sim feed don't exist on this alpha's
      `DCMotorSim` at all (only radian-based `getAngularPosition()`/
      `getAngularVelocity()`, the Lesson 4 finding), so the fix reuses the
      same `/(2 * Math.PI)` conversion already in `simulatePeriodic()`; and
      `SwerveModule`'s own private `clamp` (a separate copy from
      `Drivetrain`'s, existing only because this alpha has no
      `MathUtil.clamp` to graduate to, per R10) becomes genuinely dead code
      once the software steering P math moves into firmware, so Lesson 12
      deletes it explicitly — an extra deletion the old lesson's diff
      didn't need. Verified end to end with `DriverStationSim`-backed
      tests against the real shipped snapshot: steering converges 0°→90°
      fed *only* by the CANcoder's own sim state (confirming remote sensor
      fusion genuinely works, not just configured), drive velocity
      converges to a commanded 2.0 m/s via `kV`/`kP`, and `ContinuousWrap`
      confirmed to take the actual short path across the wrap seam (a
      +20° step, not a −340° one) in the real simulated firmware. Confirmed
      no `Drivetrain.java` changes were needed. Full compile re-verified
      from a fresh sandbox (0–12).
- [x] Lesson 13 (IO layers: hardware behind an interface) written and
      verified 2026-08-13 — `docs/lessons/v3/13-io-replay.md` and
      `code/v3/lesson-13/`, compiling through `tools/verify-lessons-v3.sh
      13`. Per R1's already-standing team decision, ships the full
      IO-layer *structure* — `ModuleIO`/`ModuleIOTalonFX`/`ModuleIOSim`,
      `GyroIO`/`GyroIOPigeon2`/`GyroIOSim`, a `Constants.Mode` enum with two
      `switch` expressions — while actual replay stays deferred, `REPLAY`
      a dormant, verified-empty arm. **R18** covers the real findings: the
      port itself had no API surprises (`RobotBase.isReal()` confirmed
      present, everything else already established by earlier lessons),
      but the restructuring forced two genuine v3-specific changes the old
      lesson never needed — `Drivetrain.simulatePeriodic()` deleted and
      `Robot.simulationPeriodic()` emptied to `{}`, since sim physics now
      runs as a side effect of which `ModuleIO`/`GyroIO` class got
      constructed rather than a hand-rolled per-tick method call (the
      consequence of `Mechanism` having no `simulationPeriodic()` hook of
      its own, carried since Lesson 4) — and finally paid off Lesson 7's
      Try It 4, wiring `DriveConstants`' named per-corner CAN ID/offset
      constants into the module array for the first time since they were
      added. Verified end to end with `DriverStationSim`-backed tests
      against the real shipped snapshot: `getPose()` reads exactly
      `(0, 0, 0°)` before the scheduler has ticked even once (confirming
      the live-read-to-cached-read change in `getHeadingDegrees()` is
      harmless); driving and `turnToHeading` both converge correctly
      through the full `ModuleIOSim`/`GyroIOSim` round trip once
      `DriverStationSim.setEnabled(true)` is set (a real testing trap hit
      and fixed along the way — Phoenix's simulated motors output nothing
      while the robot reads as disabled, the same fact the main course
      documents for its own Lesson 29); and the `REPLAY` arm constructs
      cleanly with every reading frozen at its Inputs class's default
      through 25 ticks. Also surfaced that day: this lesson's own
      coroutine-scheduling test appeared to run clean with zero `jvmArgs`
      added, seemingly contradicting the appendix's "GradleRIO test-task
      JVM args" row — flagged rather than chased to a root cause at the
      time. **Retracted in Lesson 14's entry below**: re-tested with a
      clean, deterministic repro and found not to reproduce; the original
      appendix claim was correct all along. Full compile re-verified from
      a fresh sandbox (0–13), plus independent checkpoints at 1, 3, 4, 7,
      9, 10, 11, and 12 to confirm nothing upstream regressed.
- [x] Lesson 14 (Pose estimator & localizer) written and verified
      2026-08-13 — `docs/lessons/v3/14-pose-estimator.md` and
      `code/v3/lesson-14/`, compiling through `tools/verify-lessons-v3.sh
      14`. Ports the old lesson's `PoseProvider`/`Localizer`/
      `VisionPoseProvider` split with no behavioral surprises — every
      `SwerveDrivePoseEstimator` method the old lesson calls exists here
      with the same shape (see R19's appendix rows). **The one real
      departure from the plan table's predicted "`SubsystemBase` →
      `Mechanism` rename only": `Localizer` ships as a plain class, not a
      `Mechanism`.** It drives no motors and no command ever requires it,
      so `Scheduler.getDefault().addPeriodic(this::periodic)` — the same
      call `Drivetrain` has used for its own tick since Lesson 11 — gives
      it a scheduler heartbeat with none of `Mechanism`'s unused baggage
      (an `idle()` default command, requirement-tracking). `Drivetrain`
      itself drops `m_odometry`/`Field2d`/its pose `StructPublisher`
      entirely, gains `getKinematics()`/`getRotation()`/public
      `getModulePositions()`, and `implements PoseProvider` — confirmed
      via a real `DriverStationSim`-backed test that the fused pose still
      starts at exactly `(0, 0, 0°)` before any tick and still advances
      correctly when the drivetrain drives, now flowing through
      `Localizer` instead of `Drivetrain`'s own retired odometry field.
      The vision half is measured, not assumed from the old lesson's
      prose: one `addVisionMeasurement` call against the estimator's
      default trust settings closes only ~10% of a 3 m error, but 20
      repeated "camera frames" (standing in for a real camera's frame
      rate) monotonically shrink the error past 50% — confirming "a
      strong pull, blended over a few ticks" describes *repeated*
      sightings, not one button press. **R19** also corrects R18's
      retracted jvmArgs claim with a clean, deterministic repro: a bare
      `new Drivetrain()` reliably throws `IllegalAccessException` without
      the three `--add-opens`/`--enable-native-access` flags, every time,
      under the unmodified `code/OpModeV3Robot/build.gradle` — the
      original appendix claim was right, and the fix lives only in the
      verification sandbox since no lesson through 14 ships a test. Full
      compile re-verified from a fresh sandbox (0–14).
- [x] Lesson 15 (Real vision: PhotonVision and multi-camera simulation)
      written and verified 2026-08-13 — `docs/lessons/v3/15-photonvision.md`
      and `code/v3/lesson-15/`, compiling through
      `tools/verify-lessons-v3.sh 15` (which now fetches
      `photonlib-v2027.0.0-alpha-2.json` at lesson 15+, added to the
      script's `VENDORDEPS` array). **R2 fully de-risked for PhotonVision**:
      not just "the vendordep exists," but a real `DriverStationSim`-backed
      test built an actual `VisionSystemSim`/`PhotonCameraSim`/
      `PhotonPoseEstimator` pipeline through the full `Drivetrain` →
      `Localizer` → `PhotonVisionPoseProvider` → `SwerveDrivePoseEstimator`
      stack and confirmed it produces accurate multi-tag detections (fused
      pose within 15 cm of truth over 150 ticks). Ports `VisionIO`/
      `VisionIOPhotonVision`/`VisionIOPhotonVisionSim`/
      `PhotonVisionPoseProvider` with the Lesson 13 IO-layer pattern
      (manual `StructArrayPublisher` logging in place of `@AutoLog`, a
      dormant `REPLAY` arm, verified empty) and deletes the Lesson 14 fake
      `VisionPoseProvider`/Start-button binding. **R20** is the real find:
      two tests that were expected to pass — "vision corrects a
      deliberately-wrong seeded pose" and the old lesson's own Try It 3
      ("mismeasure the camera, watch the pose skew") — both failed as
      written, and re-reading `VisionSystemSim.update(Pose2d)`'s contract
      explained why: `VisionIOPhotonVisionSim`'s `poseSupplier` is the same
      fused estimate vision then corrects, so both the sim's rendering and
      the pose math are self-referential with no independent ground truth
      to check against — a limitation neither this plan nor the old lesson
      anticipated, found only by testing. Lesson 15's section 10 callout
      and Try It 3 were rewritten around this finding rather than silently
      dropped. Full compile re-verified from a fresh sandbox (0–15), plus
      independent checkpoints at 1, 3, 4, 7, 9, 10, 11, 12, 13, and 14.
