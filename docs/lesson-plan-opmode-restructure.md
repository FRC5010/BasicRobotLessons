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
   unverified.** This course's entire telemetry and replay pedagogy (Lesson 3
   onward, and all of Lesson 13) assumes AdvantageKit hooks a
   `LoggedRobot`-shaped lifecycle. WPILib's own
   `wpilibsuite/SystemCoreTesting/AdvantageKit.md`, describing the exact
   release paired with this project's pinned WPILib version
   (`v27.0.0-alpha-4` ↔ `2027.0.0-alpha-6`), says so directly: *"Users can
   continue to use `LoggedRobot`, which is the equivalent of WPILib's
   `TimedRobot` class. An equivalent for WPILib's `OpModeRobot` will be
   available in a future release."* This is now the single hardest blocker in
   the whole plan — see [R1](#risks-and-blocking-unknowns) and its concrete
   effect on [Lesson 3](lesson-plan-v3-0-3.md#lesson-3-telemetry--plots-blocked).
   Meanwhile PhotonVision's 2027 alpha vendordep does exist
   (`photonlib-v2027.0.0-alpha-2.json`), so that part of the ecosystem is in
   better shape than AdvantageKit specifically — see the appendix.

**Recommended posture: build this as a parallel track, not an in-place
rewrite**, using the same discipline `CLAUDE.md` already prescribes for the
existing course. Per direction from the user, the new track's lesson prose
lives under **`docs/lessons/v3/`** (e.g. `docs/lessons/v3/00-orientation.md`),
a sibling of `docs/lessons/`'s numbered files rather than mixed into them, and
its code side needs the same treatment: a `code/lesson-N` snapshot line for
the v3 track and its own extension to `tools/verify-lessons.sh` (or a sibling
script) that rolls those snapshots onto `code/OpModeV3Robot` and actually
compiles them. Naming for both is an open item — see
[the housekeeping checklist](#housekeeping-checklist). A lesson gets written
and verified **one at a time**, same as every other pass this repo has done.
Nothing in the existing 0–34 course should be deleted, retitled away from
roboRIO, or treated as superseded by this track. The AdvantageKit blocker
means the natural gate is now **Lesson 3 itself**, not Lesson 13 — Lessons
0–2 of the new track can be written and verified today; Lesson 3 needs
either AdvantageKit's `OpModeRobot` support to land, or a deliberate,
flagged interim workaround — see the detailed lesson plan linked above.

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
| Wiring class | `RobotContainer`: constructed once at boot, owns every subsystem and every binding for the robot's entire life | No such class exists in the template. `Robot` is the only thing constructed once at boot; opmodes receive it via constructor injection (`MyTeleop(Robot robot)`) already, in the stock scaffold | This is the crux of [the MyTeleop → RobotTeleop decision](#the-myteleopmyauto--robotteleop-transition) |
| Subsystem base | `SubsystemBase` (`periodic()` override, auto-registers with `CommandScheduler`) | `Mechanism` (constructor registers with `Scheduler.getDefault()`, auto-installs an idle default command) | No baked-in `periodic()` hook — see [Risk R1](#risks-and-blocking-unknowns) on where per-tick logging goes |
| Command shape | `initialize/execute/isFinished/end`, or `run(Runnable).until(...).finallyDo(...)` | Single `run(Coroutine)` method; `Mechanism.run(Consumer<Coroutine>)....named(...)`, with `.until(...)`, `.whenCanceled(...)`, `.withPriority(...)` builder stages | `.named(...)` is now a **compiler-enforced** final step, not a convention |
| Composition | `Commands.sequence/parallel/race/deadline`; `.andThen/.alongWith/.raceWith/.deadlineWith`; `Commands.defer(Supplier<Command>, Set<Subsystem>)` | `Command.sequence/parallel/race`; `.andThen/.alongWith/.raceWith/.until`; `coroutine.await(...)`/`coroutine.fork(...)` largely replace `defer` | See [the per-lesson impact table](#per-lesson-impact-assessment) (Lesson 27) |
| Controller | `CommandXboxController` — `a()/b()/x()/y()` | `CommandGamepad` — `southFace()/eastFace()/westFace()/northFace()` | On a standard Xbox pad: south=A, east=B, west=X, north=Y. Generic naming, FTC-style — no `CommandXboxController` equivalent shipped |
| Triggers | `edu.wpi.first.wpilibj2.command.button.Trigger`; lives until the program restarts | `org.wpilib.command3.Trigger`; **same** `and/or/negate/debounce`, **same** `onTrue/onFalse/whileTrue/whileFalse`, plus new `risingEdge()/fallingEdge()`; auto-torn-down when its creation scope (an opmode or a command) goes inactive | Direct vocabulary win for Lesson 22; real simplification opportunity for Lesson 25 — see below |
| Autonomous selection | Hand-built `LoggedDashboardChooser<Supplier<Command>>` (`Autos.buildChooser`) | Every `@Autonomous` class is automatically listed and grouped on the DS — no chooser code at all | **Decided:** lean into multiple `@Autonomous` classes, not a single routine-selecting `RobotAuto` — see [OD3](#od3-multiple-autonomous-opmodes-resolved) |
| State machines | Hand-rolled enum (`SuperstructureState`) + exhaustive `switch` | Library primitive: `org.wpilib.command3.StateMachine` (states, `switchFromAny`, `onEnter/onExit`, `when`/`whenComplete`) | Recommend keep the hand-rolled version for the teaching payoff, reference `StateMachine` the way the course already references `MathUtil.clamp` — see [the per-lesson impact table](#per-lesson-impact-assessment) (Lesson 24) |
| Telemetry widgets | `SmartDashboard.putData` (the one sanctioned use) | `org.wpilib.smartdashboard.SmartDashboard` — same class name, confirmed present (`OpModeRobot.loopFunc()` calls `SmartDashboard.updateValues()` itself) | Low risk |
| AdvantageKit logging | `Logger.recordOutput(...)` from every subsystem's `periodic()`, hooked into `LoggedRobot`'s lifecycle | **Confirmed blocked.** AdvantageKit `v27.0.0-alpha-4` (paired with WPILib `2027.0.0-alpha-6`) explicitly does not support `OpModeRobot` yet — WPILib's own compatibility notes name `LoggedRobot` as the only supported base and say an `OpModeRobot` equivalent is "available in a future release" | **Blocking risk — see R1** |
| Hardware target | roboRIO | SystemCore | Removes device classes this course never used; CAN devices (TalonFX, Pigeon 2, CANcoder) unaffected in principle, pending Phoenix 6 SystemCore verification |

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
- **`start()` runs exactly once**, the instant the DS transitions that opmode
  from disabled to enabled.
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

That last point is the one worth a dedicated teaching beat early: it's a
genuinely different mental model from "one `Robot` class, `isAutonomous()`
branches inside it," and the course's existing Lesson 0 already has a
callout for "you're filling in blanks the framework visits on its own
schedule" — this needs the same treatment, extended to "and which blanks get
filled in depends on what's selected on the DS."

---

## The MyTeleop/MyAuto → RobotTeleop transition

This is the specific design question this plan was asked to answer, so it
gets its own section with the reasoning shown, not just the conclusion.

### Why MyTeleop alone is right at the start

`MyTeleop` and `MyAuto` are already exactly the right shape for the earliest
lessons. A single opmode with a constructor and four empty lifecycle methods
is arguably a **gentler** on-ramp than today's Lesson 0/1, which introduces
`Robot` and `RobotContainer` as two cooperating classes before the student has
written a single line that does anything. "Open `MyTeleop.java`, put your code
in `periodic()`, pick 'My Teleop' on the Driver Station" is one class, one
job, visible immediately. Lessons that only ever need one mechanism and one
set of bindings — the drive-motor-with-a-button lessons, joystick control,
telemetry, simulation, steering, distance-and-commands, four modules, gyro
heading — have no reason to leave `MyTeleop`. `MyAuto` sits untouched the
whole time, still printing nothing, exactly as the scaffold ships it.

### What actually forces a change

The forcing function isn't "the course reaches command composition" or "the
course reaches four modules" — it's more specific and mechanical than that:
**the first moment two different opmodes need to drive the same physical
hardware.**

Opmodes are constructed fresh every time they're selected (see above). If
`MyTeleop` and `MyAuto` each independently constructed their own `Drivetrain`,
each `Drivetrain` would try to own the same TalonFX CAN IDs — two `Mechanism`
objects, each auto-registering an idle default command with
`Scheduler.getDefault()` for hardware the other one also thinks it owns. That
doesn't fail cleanly; it's the kind of bug this course has spent 34 lessons
teaching students to avoid.

That collision doesn't exist yet at Lesson 7 (four modules), even though
that's the lesson that *feels* like the natural moment — because at Lesson 7,
`MyAuto` is still the empty stub the scaffold ships. `MyAuto.periodic()`
doesn't touch a motor until the course teaches autonomous, which is today's
**Lesson 9**. That's the actual, technically-grounded point where the
scaffold's "each opmode is independent" default stops working, and it's the
right lesson to spend the refactor on — same shape as Lesson 7's own
motivation for `DriveModule` → `SwerveModule` (CLAUDE.md already documents
that precedent; this is the same move, later).

### The recommended shape, at Lesson 9

1. **`Robot` grows fields.** Every mechanism the course has built so far
   (today, that's `Drivetrain`) becomes a field on `first.robot.Robot`,
   constructed once in `Robot`'s own constructor — the same place students
   already know things get created "at boot." `Robot` starts doing the job
   `RobotContainer` does today: it's the one thing built once and alive for
   the robot's whole life. It does *not* need to be renamed or turn into
   anything fancier than that — it's already there, already injected into
   every opmode's constructor, and it's the only object in the whole scaffold
   with the right lifetime.
2. **`MyTeleop.java` is renamed `RobotTeleop.java`, in place** — same move as
   `DriveModule` → `SwerveModule`, not a new file added alongside the old one.
   It keeps `@Teleop`, keeps the `Robot robot` constructor parameter it
   already had, and its constructor (or `start()` — verify which; see the
   open item on binding-scope timing below) is where trigger bindings move,
   reading mechanisms off `robot` instead of owning them itself.
3. **`MyAuto.java` is renamed `RobotAuto.java`** the same way, and finally
   gets real content: the drive-turn-drive script this course has always
   taught at this point, now driving `robot`'s actual `Drivetrain` instance
   instead of a fresh, conflicting one.
4. Every lesson **before** this one keeps saying "open `MyTeleop.java`."
   Every lesson **from** this one on says "open `RobotTeleop.java`" /
   `RobotAuto.java`. The rename is a single, dated, one-time editorial pass,
   the same kind of pass `CLAUDE.md` already asks for on any symbol rename:
   grep the whole `docs/lessons/` tree for `MyTeleop`/`MyAuto` before
   committing to the cutover lesson, since earlier lessons reuse those names
   verbatim in code blocks.

**One thing to verify empirically, not assume:** `BindingScope.createNarrowestScope`
picks an opmode-scoped binding by reading `OpModeFetcher.getFetcher().getOpModeId()`
at the moment a trigger or command is scheduled. Whether that ID already
reflects the *new* opmode while its constructor is still running (as opposed
to only becoming visible once `start()` fires) determines whether trigger
bindings belong in `RobotTeleop`'s constructor or its `start()` override.
Get this from a real running sandbox, not from reading the source twice
harder — it's exactly the kind of runtime fact this course's whole
verification culture exists to catch instead of guess at.

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
| 1 | Your first motor | **High** | First real command, written directly in `MyTeleop`, no `RobotContainer` analog yet |
| 2 | Joystick control | Low | Same lambda-binding pattern, stays in `MyTeleop` |
| 3 | Telemetry & plots | **Blocked** | AdvantageKit's 2027 alpha confirms `OpModeRobot` is not supported yet — see [R1](#risks-and-blocking-unknowns) and the [detailed Lesson 3 plan](lesson-plan-v3-0-3.md#lesson-3-telemetry--plots-blocked) |
| 4 | Simulation | Low | `simulationInit()`/`simulationPeriodic()` still exist on `OpModeRobot` |
| 5 | Steering P control | Low | Mechanically unaffected |
| 6 | Distance & commands | Low–Medium | "Commands that finish" is now trivially a `while` loop + `coroutine.yield()` — arguably simpler to teach, not just portable |
| 7 | Four modules | Medium | `DriveModule` → `SwerveModule` rename beat is unaffected; this is the lesson that *tempts* an early MyTeleop rename — resist it, see [the transition section](#the-myteleopmyauto--robotteleop-transition) |
| 8 | Gyro & heading | Low | Mechanically unaffected |
| 9 | Autonomous | **High** | Recommended home for the MyTeleop/MyAuto → RobotTeleop/RobotAuto rename; also where coroutine `await` vs. `.andThen` gets its dedicated contrast |
| 10 | Kinematics | Low | Mechanically unaffected |
| 11 | Odometry & field view | Medium | `Field2d`/`SmartDashboard.putData` needs a live-sandbox check, not just a source read |
| 12 | Model-based control | Low | Phoenix 6 config/control-request API; SystemCore Phoenix 6 alpha status noted in [R3](#risks-and-blocking-unknowns) |
| 13 | IO layers & replay | **High** | Single biggest unverified risk lands here — see [R1](#risks-and-blocking-unknowns) |
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

- **R1 — CONFIRMED BLOCKED (was "unverified"):** AdvantageKit does not
  support `OpModeRobot`. Quoted directly from `wpilibsuite/SystemCoreTesting/AdvantageKit.md`,
  describing `v27.0.0-alpha-4` (paired with WPILib `2027.0.0-alpha-6`, this
  project's pinned version): *"Users can continue to use `LoggedRobot`, which
  is the equivalent of WPILib's `TimedRobot` class. An equivalent for
  WPILib's `OpModeRobot` will be available in a future release."* This course's
  entire telemetry model (`Logger.recordOutput` from every subsystem, from
  Lesson 3 on) and all of Lesson 13's IO/replay pattern depend on this. There
  is no current workaround that stays honest to "verified, not guessed" —
  see the [detailed Lesson 3 plan](lesson-plan-v3-0-3.md#lesson-3-telemetry--plots-blocked)
  for the options and the recommendation (wait, tracked against AdvantageKit's
  releases). Separately unresolved, and irrelevant until R1 clears: where
  per-tick logging happens once it's unblocked, given `Mechanism` has no
  `periodic()` hook the way `SubsystemBase` did — candidates are
  `Scheduler.addPeriodic(Runnable)` (confirmed to exist) or a mechanism
  registering its own callback in its constructor.
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
- **R3 — pin confirmed:** Phoenix 6's 2027 alpha vendordep for this
  project's WPILib version is `Phoenix6-26.50.0-alpha-1.json` (with a
  matching `Phoenix6-replay-26.50.0-alpha-1.json` for AdvantageKit-replay
  support — encouraging, once R1 clears), both in `vendor-json-repo/2027_alpha5/`.
  CTRE's own compatibility notes still list documented gaps: Motioncore CAN
  buses aren't supported yet (only SystemCore-native buses and CANivore), and
  there's no Sendable replacement yet, pending WPILib's Telemetry API. Neither
  appears to block this course's TalonFX/Pigeon 2/CANcoder usage directly,
  but should be confirmed against a real device before Lesson 1 is written.
- **R4:** Everything cited in this plan is alpha software. An API fact
  verified today against `v2027.0.0-alpha-6` is not guaranteed to hold at
  alpha-7 or at a stable 2027 release.
- **R5:** `code/OpModeV3Robot/build.gradle` targets `JavaVersion.VERSION_25`.
  Whether `org.wpilib.command3.Continuation` needs `--enable-preview` or
  equivalent JVM flags on that Java version is unverified — check against a
  real build, not by re-reading the source harder.
- **R6:** This course's whole verification culture
  (`tools/verify-lessons.sh`) is built around rolling snapshots onto
  `code/ActualLessons`. A parallel OpMode track needs its own equivalent
  before any lesson in it can be called "verified" rather than "believed" —
  building that tooling is itself a prerequisite task, not a byproduct.

---

## Appendix: verified API notes

Read directly from `wpilibsuite/allwpilib` at tag `v2027.0.0-alpha-6` — the
exact version `code/OpModeV3Robot/build.gradle` pins — via GitHub's raw source,
not from documentation or memory. Same rule as this repo's other plan-doc
appendices: verify before drafting, record what you verified.

| Fact | Status |
|---|---|
| `org.wpilib.opmode` package contents | `OpMode` (interface), `PeriodicOpMode` (abstract base), `Teleop`/`Autonomous`/`Utility` (annotations, each with `name`/`group`/`description`/`textColor`/`backgroundColor`) |
| `OpMode` lifecycle | `disabledPeriodic()` (while selected + DS disabled, not on a fixed interval) → `start()` (once, on disable→enable) → `periodic()` (every tick while enabled, at `OpModeRobot.getPeriod()`, default 20 ms) → `end()` (on enable→disable or opmode switch while enabled) → `close()` (always last; object never reused) |
| Opmode auto-registration | `OpModeRobot` scans `getClass().getPackage()` and subpackages for `@Teleop`/`@Autonomous`/`@Utility`-annotated `OpMode` subclasses at construction time (`addAnnotatedOpModeClasses`), no manual registration call needed |
| Opmode construction | Constructed via reflection, preferring a constructor accepting the robot's own class (`Robot`) over a no-arg one; this is why `MyTeleop(Robot robot)` works out of the box |
| Scheduler tick | `Scheduler.getDefault().run()` must be called by user code — confirmed **not** invoked automatically anywhere in `OpModeRobot`; `robotPeriodic()` (called every tick, any opmode state, per `loopFunc()`) is the documented hook point (per `Scheduler`'s own class javadoc, written against `TimedRobot` but the same hook exists on `OpModeRobot`) |
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
| Vendordep conflict | The old `CommandsV2.json` (`org.wpilib.commandsv2`) declared a `conflictsWith` entry naming `CommandsV3.json` by UUID — the two cannot be installed together. **Resolved**: `code/OpModeV3Robot` now ships `CommandsV3.json` only |
| `commandsv3` module location | Confirmed present at `commandsv3/` in the `allwpilib` repo, with its own `CommandsV3.json`, `build.gradle`, `BUILD.bazel`, `CMakeLists.txt`. Its `CommandsV3.json` (`uuid` `4decdc05-a056-46cf-9561-39449bbb0130`, `javaDependencies` group `org.wpilib` artifact `commands3-java`) is now installed in `code/OpModeV3Robot/vendordeps/`, copied byte-for-byte from source at tag `v2027.0.0-alpha-6` |
| AdvantageKit 2027 compatibility | **Confirmed blocked, not just unverified.** `v27.0.0-alpha-4` is the release paired with WPILib `2027.0.0-alpha-6` (this scaffold's pinned version), per `wpilibsuite/SystemCoreTesting/AdvantageKit.md`. That same doc states directly: `LoggedRobot` is supported, `OpModeRobot` support is "available in a future release." Its vendordep (`AdvantageKit-27.0.0-alpha-4.json`) is mirrored in `vendor-json-repo/2027_alpha5/` alongside the other 2027-alpha vendor files, for whenever it's needed |
| Phoenix 6 2027 compatibility | Pin confirmed: `Phoenix6-26.50.0-alpha-1.json` (plus `Phoenix6-replay-26.50.0-alpha-1.json` for AdvantageKit-replay support) in `vendor-json-repo/2027_alpha5/`, CTRE's own compatibility doc pairs it with WPILib's `2027_alpha5` checkpoint (no `2027_alpha6`-specific row published yet — this is the most recent confirmed pairing, not a guess, but re-check before relying on it for a real device). `CANBus.systemCore(int busId)` for SystemCore CAN buses; documented gaps: Motioncore CAN buses unsupported, no Sendable replacement yet |
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
      need — see the appendix: `CommandsV3` (installed), `AdvantageKit-27.0.0-alpha-4.json`
      (blocked, see R1), `Phoenix6-26.50.0-alpha-1.json` (Lesson 1).
- [ ] Verify AdvantageKit against a real `OpModeRobot`-based sandbox build
      (R1) — track AdvantageKit's releases for `OpModeRobot` support landing.
      This blocks [Lesson 3](lesson-plan-v3-0-3.md#lesson-3-telemetry--plots-blocked)
      specifically, not Lessons 0–2.
- [ ] Verify maple-sim / BLine 2027-alpha status directly at their own hosts
      (R2) before writing Lessons 16, 17, 22, 25–27 — PhotonVision's status is
      now confirmed better (vendordep exists), but its `OpModeRobot`
      integration is still unverified.
- [ ] Stand up a `tools/verify-lessons.sh`-equivalent for the v3 track (R6)
      before any lesson in it is marked done. Naming for the v3 track's
      `code/lesson-N` snapshot line is still an open item.
- [ ] Resolve OD4 (StateMachine adoption) and OD6 (roboRIO → SystemCore
      terminology pass) with the user.
- [ ] Confirm empirically (not by re-reading source) whether
      `BindingScope.createNarrowestScope` sees the new opmode's ID during its
      constructor or only from `start()` onward, before writing the
      MyTeleop → RobotTeleop lesson (Lesson 9).
- [ ] See [docs/lesson-plan-v3-0-3.md](lesson-plan-v3-0-3.md) for the
      detailed Lessons 0–3 plan and its own open items.
