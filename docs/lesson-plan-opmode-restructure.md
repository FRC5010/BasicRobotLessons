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

**One thing to verify empirically, not assume:** `BindingScope.createNarrowestScope`
picks an opmode-scoped binding by reading `OpModeFetcher.getFetcher().getOpModeId()`
at the moment a trigger or command is scheduled. Whether that ID already
reflects the *new* opmode while its constructor is still running (as opposed
to only becoming visible once `start()` fires) determines whether trigger
bindings belong in an opmode's constructor or its `start()` override — this
already matters for `MyTeleop` today (Lesson 1's button binding lives in its
constructor), not just from the rename lesson on. Get this from a real
running sandbox, not from reading the source twice harder — it's exactly the
kind of runtime fact this course's whole verification culture exists to
catch instead of guess at.

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
| 1 | Your first motor | **High** | First real command; hardware (`DriveModule`, `CommandGamepad`) is owned by `Robot`, not `MyTeleop` — corrected from an earlier draft, see [the transition section](#the-myteleopmyauto--robotteleop-transition) |
| 2 | Joystick control | Low | Same lambda-binding pattern, stays in `MyTeleop` |
| 3 | Telemetry & plots | Low | No longer blocked — uses plain `SmartDashboard.putNumber(...)` instead of AdvantageKit's `Logger` (Epilogue was considered, dropped as unnecessary machinery); see [Telemetry without AdvantageKit](#telemetry-without-advantagekit-smartdashboard-and-networktables) and the [detailed Lesson 3 plan](lesson-plan-v3-0-3.md#lesson-3-telemetry--plots) |
| 4 | Simulation | Low–Medium | Written and compiled 2026-08-11. `simulationPeriodic()` exists, but only on `OpModeRobot`/`Robot` — `Mechanism` has no `simulationPeriodic()` hook of its own, so `DriveModule` exposes a plain public `simulatePeriodic()` method and `Robot.simulationPeriodic()` calls it (one line per mechanism, same shape as Lesson 1's scheduler tick). `LinearSystemId.createDCMotorSystem(...)` doesn't exist — real replacement is `org.wpilib.math.system.Models.singleJointedArmFromPhysicalConstants(DCMotor, J, gearing)` (same math, arm and generic-motor systems were always the same equation). `DCMotorSim.getAngularPosition()`/`.getAngularVelocity()` return **radians**/**radians per second**, not rotations/RPM — confirmed by an end-to-end `DriverStationSim`-backed test (`TalonFX.setThrottle(1.0)` through the real physics loop converges on ~100 rot/s, the Kraken X60's true free speed, only once the radians→rotations division is included). See the appendix and `code/v3/lesson-4/`. |
| 5 | Steering P control | Medium | Written and compiled 2026-08-11. `CANcoder` needs a `CANBus` argument now too (`CANcoder(int, CANBus)`, no single-int overload — same shift as `TalonFX`), and `getAbsolutePosition()` needs `.getValue().in(Rotations)` like every other `StatusSignal` since Lesson 3. **The old lesson's `kP = 0.01` is unconditionally unstable against this Phoenix 6 alpha's `DCMotorSim`, confirmed with a real `DriverStationSim`-backed test — not a porting bug, a numeric one.** See [R8](#risks-and-blocking-unknowns) |
| 6 | Distance & commands | Medium | Written and compiled 2026-08-11. The predicted "trivially a `while` loop" landed even cleaner than expected: `coroutine.waitUntil(BooleanSupplier)` (confirmed present, and confirmed by test to be exactly a `while (!condition) yield();` loop) means a finishing command is just a coroutine body that runs out of lines — no `.until(...)`/`.andThen(...)` composition needed at all for the base case. **The real finding is R9**: `.whenCanceled(...)` does **not** fire when a command finishes its coroutine body naturally — confirmed with a real scheduler test — so `driveDistance` is the first command needing cleanup written twice, once inline after `waitUntil` and once in `.whenCanceled(...)`. See [R9](#risks-and-blocking-unknowns) |
| 7 | Four modules | **High** | Written and compiled 2026-08-11. `DriveModule` → `SwerveModule` rename beat lands as predicted, and the aggregate `Drivetrain` takes `DriveModule`'s old spot as a field on `Robot`. Two real API surprises: **`MathUtil.clamp` doesn't exist in this alpha** (no replacement found — the old lesson's "delete yours, use the library" beat is dropped; the hand-rolled `clamp` from Lesson 5 stays for good), and **`SwerveModuleState` doesn't exist** — renamed to `SwerveModuleVelocity` (same `(double, Rotation2d)` shape) as part of a bigger `*State`→`*Velocity`/`*Acceleration` split (`ChassisSpeeds`→`ChassisVelocities`, new `ChassisAccelerations`/`SwerveModuleAcceleration`). **The bigger finding: `SmartDashboard` has no struct/struct-array publish method at all**, so the Swerve-tab payoff needs real `NetworkTableInstance.getStructArrayTopic(...).publish()` — this is the "no `SmartDashboard` one-liner for struct types" gap the Lesson 3 plan doc flagged in advance, arriving here rather than at odometry. Verified end to end: rotate-in-place angles match the documented table exactly, and a real struct-array publish/set cycle doesn't throw. `tools/verify-lessons-v3.sh` needed its first deletion-replay entry (`DriveModule.java`, same file the main course's script already deletes at this exact lesson) — see [R10](#risks-and-blocking-unknowns) |
| 8 | Gyro & heading | Low | Mechanically unaffected |
| 9 | Autonomous | **High** | Recommended (but no longer technically forced) home for the MyTeleop/MyAuto → RobotTeleop/RobotAuto rename, now that hardware ownership is settled at Lesson 1; also where coroutine `await` vs. `.andThen` gets its dedicated contrast |
| 10 | Kinematics | Low | Mechanically unaffected |
| 11 | Odometry & field view | Medium | `Field2d`/`SmartDashboard.putData` needs a live-sandbox check, not just a source read |
| 12 | Model-based control | Low | Phoenix 6 config/control-request API; SystemCore Phoenix 6 alpha status noted in [R3](#risks-and-blocking-unknowns) |
| 13 | IO layers & replay | **High** | Structure (interfaces, Inputs classes, `Constants.Mode` switch, IO implementations) carries over; each IO implementation logs its own Inputs fields manually via `SmartDashboard.putNumber(...)` instead of `@AutoLog`/`Logger.processInputs`. **Actual replay is deferred** — `REPLAY` stays a dormant, unreachable switch arm until a follow-up pass — see [R1](#risks-and-blocking-unknowns) |
| 14 | Pose estimator & localizer | Low | `SubsystemBase` → `Mechanism` rename only |
| 15 | PhotonVision | Medium | Vendordep confirmed present for 2027 alpha (`photonlib-v2027.0.0-alpha-2.json`); `OpModeRobot`-specific integration still unverified — [R2](#risks-and-blocking-unknowns) |
| 16 | maple-sim | Medium | 2027/SystemCore status still unverified — [R2](#risks-and-blocking-unknowns). `Robot.simulationPeriodic()`'s "shared world state" exception still has a home on `OpModeRobot` |
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
- **R2 — partially de-risked:** PhotonVision's 2027 alpha vendordep is
  confirmed to exist (`photonlib-v2027.0.0-alpha-2.json`, in the same
  `vendor-json-repo/2027_alpha5/` bucket as `AdvantageKit-27.0.0-alpha-4.json`
  and `Phoenix6-26.50.0-alpha-1.json`) — its `OpModeRobot`-specific
  integration is still unverified, but the library itself is real for this
  season, unlike before. **maple-sim and BLine remain fully unverified** —
  neither publishes through `vendor-json-repo` even in the current course
  (maple-sim ships from `shenzhen-robotics-alliance.github.io`, BLine from
  `jitpack.io`), so their 2027/SystemCore status has to be checked at those
  hosts directly, not inferred from this search. Each gates a meaningful
  chunk of the back half of the course (Lessons 15–17, 22, 25–28).
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
| `org.wpilib.system.DataLogManager` — compiled, not guessed | Confirmed location (an earlier guess of `org.wpilib.datalog.DataLogManager` was wrong — that package holds the lower-level `DataLog`/log-entry classes `DataLogManager` wraps). `start()` is a plain static no-arg method, matching `LoggedRobot`-era usage exactly |
| PhotonVision 2027 compatibility | Vendordep confirmed present: `photonlib-v2027.0.0-alpha-2.json`, same `vendor-json-repo/2027_alpha5/` bucket. `OpModeRobot`-specific integration unverified |
| `vendor-json-repo` 2027 structure | Confirmed directories: `2027_alpha1`, `2027_alpha5` (the current active bucket — despite the name, it also holds newer per-vendor releases like `REVLib-2027.0.0-alpha6.json`, so the folder name marks the prerelease *channel*, not a hard per-vendor version ceiling). Also present in `2027_alpha5/`: `AmLib`, `DogLog`, `PathplannerLib-2027.0.0-alpha-3.json`, `ThriftyLib` — **no BLine, no maple-sim** (both distribute outside `vendor-json-repo`; see R2) |
| SystemCore removed device classes | Relay, analog output, SPI (incl. SPI IMUs: ADIS16448, ADIS16470, ADXL345, ADXRS450), analog gyro, DMA, built-in accelerometer, digital glitch filter, interrupts, counter, ultrasonic, analog trigger, Nidec Brushless, `Servo`, `Jaguar` — none currently used by this course |
| Build target | `code/OpModeV3Robot/build.gradle`: `sourceCompatibility`/`targetCompatibility = JavaVersion.VERSION_25`, GradleRIO `2027.0.0-alpha-6`, shadow plugin `9.3.0`; deploys to a `SystemCore` target via `getTargetTypeClass('SystemCore')` |

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
