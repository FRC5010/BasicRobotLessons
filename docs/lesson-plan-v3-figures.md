# Figure plan for the OpMode-track lessons

The figure-by-figure plan for pictures in `docs/lessons/v3/`. The conventions (file names, `Figure N.k` numbering, markup, "a graph is a measurement") are in CLAUDE.md's "Figures in lessons". On 2026-11-18 the user decided: plan first, then build in batches; each figure lands in one commit with the text that refers to it; generators and their data live in `tools/figures/`.

This is a contributor document, kept off the website by the `lesson-plan-*.md` exclude. Nothing here is pasted into a lesson. It merges four proposal files (Lessons 0-8 and the setup aside, 9-17, 18-26, 27-34 and the debugger and git asides).

**Counts:** 87 figures. Batch 1: 39. Batch 2: 34. Batch 3: 8. Needs the user: 4. After Lesson 34's migration: 2. Dropped or merged: see section 5.

## 1. How a batch is built

For each figure in the batch:

- [ ] **Data (types a):** run the probe at that lesson's state (CLAUDE.md's RIG, LOOP, BARE or record/replay methods), on the alpha-8 pins. Save the series to `tools/figures/data/NN-name.csv` (or `.json`). Figures marked "new probe" in section 7 have no measurement in CLAUDE.md yet; the others have measured *summaries*, but the series still has to be captured.
- [ ] **Generator:** one script per figure, `tools/figures/NN-name.py`, reading only the data file. Diagrams (c) drawn from constants get a generator too when they use the lesson's numbers; others are hand-drawn SVG kept in `docs/lessons/v3/images/`.
- [ ] **Image:** `docs/lessons/v3/images/NN-name.png` or `.svg` (asides: `aside-<slug>-<name>`). Opaque background (plots on white, SVG with a filled background rectangle), checked in both site themes. PNG at most 1600 px wide and under about 200 KB.
- [ ] **Markup**, in the lesson file at the "Where" spot:
  ```markdown
  <a id="figure-N-k"></a>
  ![alt: what the reader sees and learns](images/NN-name.png)

  *Figure N.k — Caption.*
  ```
  Blank line before the caption. Asides: `figure-d-1`, `figure-g-2`, `figure-s-1`, caption `Figure D.1`.
- [ ] **Prose reference:** "Figure N.k shows..." at the point the student needs it (the "Text changes" field). Every figure is referred to at least once.
- [ ] **Walk the reader through a graph** (user, 2026-11-18): what each line is, which panel to read first, what shape to notice, and what it means. A paragraph or two per graph is right; graphs of control behaviour (P, feedforward, profiles) carry the course's control teaching and get the most room. Side explanations (a simulator quirk, a measurement caveat) stay to a sentence or three.
- [ ] **Cross-lesson links:** add each "Linked from" back-reference as `[Figure N.k](NN-slug.md#figure-N-k)`, only from lessons *after* the figure's home, and only once the figure exists.
- [ ] **Numbers match the text.** If the plot and the prose disagree, fix the prose (or re-measure), per "a graph is a measurement". Re-measuring a lesson's numbers means regenerating its figures.
- [ ] **Flow re-read** of the section around each figure, including the "needs detail" and "text issue" notes below.
- [ ] **Site build and link check:** local Jekyll build; every `figure-N-k` anchor and image resolves; look at the page in light and dark and at 390 px.
- [ ] **Commit:** one commit per lesson, or per small group of lessons. The image, caption, prose and links go in the same commit. Fix other lessons' references when a figure is inserted: `grep -rn "Figure N\." docs/lessons/v3` and `#figure-N-`.

**Numbering policy (settled 2026-11-18, following CLAUDE.md).** The figure numbers in this plan are working IDs. When a figure is built it gets its real number by position among the figures that exist in that lesson, so a lesson never shows a gap. Building a batch 3 figure later renumbers the ones after it, and every reference to them, per CLAUDE.md's insertion rule. Keep the working ID in the generator's file name only if it still matches; the file names here are suggestions.

## 2. Summary table

Type: a = sim plot, b = SimGUI screenshot, c = SVG diagram, d = needs the user. All status: planned, except batch 1, built 2026-11-18/19 (section 9 maps working IDs to the numbers in the lessons). Batches changed after the pilot review (section 8): 7.3, 8.1, 12.3 and 18.1 to batch 1, 15.4 and 17.2 to batch 2.

| Figure | Title | Lesson | Type | Priority | Batch |
|---|---|---|---|---|---|
| S.1 | Two folders and a GitHub repo | Setup aside | c | medium | 2 (built) |
| 0.1 | An opmode's life | 0 | c | medium | 2 (built) |
| 0.2 | SimGUI: opmode selector and Robot State | 0 | b | high | 1 (built) |
| 1.1 | SimGUI: dragging a controller into slot 0 | 1 | b | high | 1 (built) |
| 1.2 | SimGUI: NetworkTables, Telemetry, DriveModule | 1 | b | medium | 2 (built) |
| 3.1 | AdvantageScope: tree and a two-signal graph | 3 | d | medium | needs user |
| 4.1 | The simulation loop | 4 | c | high | 1 (built) |
| 4.2 | Velocity response, two inertias | 4 | a | medium | 2 (built) |
| 5.1 | Setpoint, measurement and error in one move | 5 | a | high | 1 (built) |
| 5.2 | `kP` too small, just right, too big | 5 | a | high | 1 (built) |
| 5.3 | The long way round (error wrap) | 5 | c | medium | 2 (built) |
| 6.1 | Two ways a command ends | 6 | c | medium | 2 (built) |
| 6.2 | `driveDistance(1.0, 0.4)` trace | 6 | a | medium | 2 (built) |
| 7.1 | Chassis frame, corners and the two moves | 7 | c | high | 1 (built) |
| 7.2 | AdvantageScope: Swerve tab, States slot | 7 | d | medium | needs user |
| 7.3 | Steering 90 degrees through 25:1, two gains | 7 | a | high | 1 (built) |
| 8.1 | `turnToHeading(90)`: heading, command, band | 8 | a | high | 1 (built) |
| 8.2 | AdvantageScope: Swerve tab, Rotation slot | 8 | d | low | needs user |
| 9.1 | Why scale drive by cosine | 9 | a | medium | 2 (built) |
| 9.2 | Sequence, parallel, race, optional | 9 | c | medium | 2 (built) |
| 10.1 | Translation plus rotation at each corner | 10 | c | high | 1 (built) |
| 10.2 | `optimize`: take the short way | 10 | c | low | 3 (built) |
| 10.3 | Robot-relative versus field-relative | 10 | c | high | 1 (built) |
| 11.1 | SimGUI: the Field widget | 11 | b | medium | 2 (built) |
| 12.1 | Coach and player (50 Hz over 1 kHz) | 12 | c | low | 3 (built) |
| 12.2 | The sensor and gear chain | 12 | c | high | 1 (built) |
| 12.3 | A feedforward step | 12 | a | high | 1 (built) |
| 13.1 | The IO door | 13 | c | high | 1 (built) |
| 13.2 | Record, then replay | 13 | c | high | 1 (built) |
| 13.3 | The x1.1 experiment | 13 | a | medium | 2 (built) |
| 14.1 | Localizer and its providers | 14 | c | high | 1 (built) |
| 14.2 | Each sighting is a nudge | 14 | a | medium | 2 (built) |
| 15.1 | Where the cameras are | 15 | c | high | 1 (built) |
| 15.2 | Real camera and simulated camera, same wire | 15 | c | high | 1 (built) |
| 15.3 | SimGUI: AdvantageKit menu for a camera | 15 | b | medium | 2 (built) |
| 15.4 | A parked robot still drifts | 15 | a | medium | 2 (built) |
| 16.1 | The estimate creeps ahead and stays there | 16 | a | high | 1 (built) |
| 16.2 | Truth and estimate are different loops | 16 | c | medium | 2 (built) |
| 16.3 | The grip limit | 16 | a | medium | 2 (built) |
| 17.1 | Three loops at once | 17 | c | low | 3 (built) |
| 17.2 | Can it stop in time? | 17 | a | medium | 2 (built) |
| 17.3 | SimGUI: DS window for an auto | 17 | b | high | 1 (built) |
| 17.4 | Two Corners, drawn and driven | 17 | a | high | 1 (built) |
| 17.5 | Cross-track error at the corner | 17 | a | high | 1 (built) |
| 18.1 | What `kP` alone does, moving and holding | 18 | a | high | 1 (built) |
| 18.2 | Goal, setpoint and height in one move | 18 | a | high | 1 (built) |
| 19.1 | Canvas, anchor and a chain of segments | 19 | c | medium | 2 (built) |
| 19.2 | SimGUI: the Mechanism drawing | 19 | b | medium | 2 (built) |
| 20.1 | Arm angle convention and the drawing angle | 20 | c | high | 1 (built) |
| 20.2 | Holding voltage is a cosine | 20 | a | medium | 3 (built) |
| 21.1 | Encoder belief against carriage truth | 21 | a | high | 1 (built) |
| 22.1 | The intake box in the robot's frame | 22 | c | medium | 2 (built) |
| 23.1 | SimGUI: the LED strip | 23 | b | medium | 2 (built) |
| 24.1 | Six states and their transitions | 24 | c | high | 1 (built) |
| 24.2 | One capture cycle on a timeline | 24 | a | medium | 2 (built) |
| 25.1 | Sequence holds the elevator, coroutine doesn't | 25 | c | low | 3 (built) |
| 25.2 | Marker position against roller start | 25 | a | medium | 2 (built) |
| 25.3 | Pick Up timeline | 25 | a | high | 1 (built) |
| 26.1 | The line's frame and the two stages | 26 | c | medium | 2 (built) |
| 26.2 | Speed during the two-stage drive | 26 | a | high | 1 (built) |
| 26.3 | The path bows out while turning | 26 | a | low | 3 |
| 27.1 | Why a strafing robot has to spin | 27 | c | medium | 2 (built) |
| 27.2 | Aim error on a 3 m orbit | 27 | a | high | 1 (built) |
| 28.1 | The speedometer: needle against speed | 28 | c | medium | 2 (built) |
| 28.2 | Holding 60 rot/s with and without the model | 28 | a | high | 1 (built) |
| 28.3 | Spin-up from four idle speeds | 28 | a | high | 1 (built) |
| 29.1 | Fresh battery, one run per configuration | 29 | a | medium | 2 (built) |
| 29.2 | Tired battery: budget and no limits | 29 | a | high | 1 (built) |
| 30.1 | SimGUI: the Alerts panel | 30 | b | high | 1 (built) |
| 30.2 | SimGUI: Unplug Gyro | 30 | b | medium | 2 (built) |
| 30.3 | Why the low-battery alert only looks while disabled | 30 | a | medium | 2 (built) |
| 31.1 | Two clocks | 31 | c | medium | 2 (built) |
| 31.2 | Homing test height with and without the sleep | 31 | a | medium | 3 |
| 32.1 | The height arrives; `AtGoal` never says so | 32 | a | high | 1 (built) |
| 32.2 | The same match through the fixed code | 32 | a | high | 1 (built) |
| 32.3 | Aim While Driving, right tag and typo | 32 | a | medium | 2 (built) |
| 33.1 | What the four tests look like | 33 | a | high | 1 (built) |
| 33.2 | `kS` check: 0.05 V and the wheel still turns | 33 | a | low | 3 |
| 33.3 | Why a 1 V/s ramp isn't quasistatic | 33 | a | high | 1 (built) |
| 33.4 | A ramp costs room: elevator travel | 33 | a | medium | 2 (built) |
| 34.1 | Two angles and a floor | 34 | c | high | after L34 migration |
| 34.2 | Why `HasTarget` flickers | 34 | c | medium | after L34 migration |
| D.1 | The debugger window | Debugger aside | d | high | needs user |
| D.2 | A stack trace, two passes | Debugger aside | c | medium | 2 (built) |
| G.1 | A branch is a label on a commit | Git aside | c | high | 1 (built) |
| G.2 | Fast-forward, and the diamond | Git aside | c | medium | 2 (built) |
| G.3 | Rebase: replaying commits onto a new base | Git aside | c | high | 1 (built) |

Batch 3 reasons, beyond "low priority": 20.2 and 31.2 are medium but restate a table the lesson keeps (the proposers said so), so they wait to see whether the plot should replace the table.

## 3. Per-lesson details

Field format: Where / Shows / Why / Made from (with data status for type a) / Text changes / Linked from. Lesson files are in `docs/lessons/v3/`. "Measured" means CLAUDE.md already has the numbers (block named); the series still has to be captured by a run. "New probe" means CLAUDE.md has no measurement of that state (listed in section 7).

### Setup aside (`aside-setup.md`)

**Figure S.1 — Two folders and a GitHub repo** · medium · (c) · batch 2 · `aside-setup-two-folders.svg`
- Where: §4, after "Two folders now exist, and it matters that you don't confuse them".
- Shows: three boxes. `BasicRobotLessons` (course repo, own `.git`, never committed to) → arrow `verify-lessons-v3.sh -1 --sandbox` (strips `.git`, `build`, `.gradle`) → `~/dev/MyOpModeRobot` (your project) → §5 `git init`/`commit` and §7 `gh repo create`/`push` → GitHub `MyOpModeRobot`. A crossed-out arrow from the project to the course repo.
- Why: the page warns twice (§4, §7) that pushing from the wrong folder uploads the whole course; three places and two directions are hard to hold in prose.
- Made from: the commands and paths in §4-§7. No data.
- Text changes: add "Figure S.1 shows the three places." to the two-folders paragraph; end §7's "you pushed from the wrong folder" with "(see Figure S.1)".
- Linked from: the git-branching aside's opening, where it assumes the repo exists (optional).

### Lesson 0 — Orientation

**Figure 0.1 — An opmode's life: constructor, start, periodic, end, close** · medium · (c) · batch 2 · `00-opmode-lifecycle.svg`
- Where: §2, after "If you take one thing from this lesson, take that picture".
- Shows: timeline. Select opmode → `MyTeleop(...)` constructor (once). Enable → `start()` (once) → a row of `periodic()` ticks about 20 ms apart. Disable → `end()`. Re-enable returns to `start()` with no new constructor. Select another → `close()`. `disabledPeriodic()` ticks while disabled. No `robotPeriodic()` (Lesson 1 §5 introduces it).
- Why: §2's idea is "a fast loop, but which code it ticks depends on what's selected". Lesson 1 §6 depends on constructor-vs-`start()`, which Lesson 0's prose never states.
- Made from: the five methods in the §1 `MyTeleop` listing and Lesson 1 §6's explanation. No data.
- Text changes: §2 after the first paragraph: "Figure 0.1 shows when each of the five methods fires."
- Linked from: Lesson 1 §6 ("Why the constructor, and not `start()`?").

**Figure 0.2 — SimGUI: opmode selector and Robot State** · high · (b) · batch 1 · `00-simgui-opmode-state.png`
- Where: §3, after "Find the **opmode selector** and pick **My Teleop**".
- Shows: SimGUI with the opmode selector on My Teleop and the Robot State panel (Disabled/Enabled), numbered callouts. Optionally a second shot of the terminal's "Hello" line from §4.
- Why: the lesson says "find" two panels and gives no location; every later lesson says "pick My Teleop, Enabled".
- Made from: SimGUI under Xvfb (Lesson 30 notes' recipe) on the Lesson 0 state: `./gradlew run`, `import -window root`, crop. Check panel names against alpha-8 (DS panel, Alliance Station) before captioning.
- Text changes: §3 "...pick My Teleop" → "(Figure 0.2 marks both panels)". Verify the panel is really called "Robot State".
- Linked from: Lesson 1 §7; Lesson 4 §5; Lesson 17.3 (same window, adds Alliance Station); Lessons 19 and 30 ("the same panels as Figure 0.2").

### Lesson 1 — Your first motor

**Figure 1.1 — SimGUI: dragging a controller into slot 0** · high · (b) · batch 1 · `01-simgui-joystick-slot.png`
- Where: §7, after "**Drag an entry from System Joysticks into slot 0 of the Joysticks panel.**"
- Shows: System Joysticks (Keyboard 0 listed), Joysticks panel with slot 0 filled, an arrow for the drag, and the Other Devices panel where the TalonFX appears.
- Why: "the step everybody misses"; three panel names described in prose, in a busy window.
- Made from: SimGUI on the Lesson 1 state. `./gradlew run`, drag Keyboard 0 into slot 0 with `xdotool` (mouse down/move/up), My Teleop, Enabled, open Other Devices. Before and after shots, or a composite.
- Text changes: §7 "Two panels do the work." + "Figure 1.1 shows where they are and what the drag looks like." Name which Other Devices row to read (check its alpha-8 name).
- Linked from: Lesson 2 §5; Lesson 7 §6; Lessons 19 and 30 (SimGUI panels).

**Figure 1.2 — SimGUI: NetworkTables, Telemetry, DriveModule** · medium · (b) · batch 2 · `01-simgui-telemetry-drivemodule.png`
- Where: §8, after "open **NetworkTables → Telemetry → DriveModule** in SimGUI or AdvantageScope".
- Shows: the NetworkTables window expanded to `Telemetry/DriveModule`, `CurrentCommand` reading `Drive At Speed` while the button is held; a small second shot reading `DriveModule[IDLE]`.
- Why: first time the student reads a telemetry value, and the menu path is long. Lesson 3's `CurrentCommand` payoff uses the same screen.
- Made from: SimGUI on the Lesson 1 state (hold faceDown via `xdotool key` on Keyboard 0, or click the button in Joysticks). The key name depends on §8's `logRunningCommand`; confirm it for this state.
- Text changes: §8 "Run it again, hold the bottom face button, and open..." + "(Figure 1.2)".
- Linked from: Lesson 3 §6 (`CurrentCommand`); Figure 11.1 (the menu).

### Lesson 2 — Joystick control

No figure proposed: lambdas, suppliers and a deadband; a transfer-curve plot would restate the five-line `applyDeadband`.

### Lesson 3 — Telemetry

**Figure 3.1 — AdvantageScope: the NetworkTables tree and a two-signal graph** · medium · (d) · needs the user · `03-advantagescope-tree-graph.png`
- Where: §5, after "expand **NetworkTables → Telemetry → DriveModule**".
- Shows: sidebar tree open to `NetworkTables/Telemetry/DriveModule` with `PositionRotations` and `VelocityRotPerSec`; Line Graph with velocity on the left axis and position on the right; callouts for steps 1-4.
- Why: the five-step recipe is purely "find this widget"; the tree also makes "the name is the address" (§2) visible.
- Made from: user's AdvantageScope screenshot, Lesson 3 state (traces flat as the text says) or Lesson 4's (they move; caption "from Lesson 4"). Light and dark variants.
- Text changes: §5 step 2 + "(Figure 3.1)".
- Linked from: Lesson 4 §5, Lesson 5 §5, Lesson 7 §7.

### Lesson 4 — Simulation

**Figure 4.1 — The simulation loop** · high · (c) · batch 1 · `04-simulation-loop.svg`
- Where: §3, replacing the ASCII block after "if you take one picture from this lesson, take this one".
- Shows: cycle. `setThrottle(0.3)` → TalonFX applies volts → `getMotorVoltage()` → `DCMotorSim.update(0.020)` → `setRawRotorPosition`/`setRotorVelocity` → fake encoder → `getPosition()`/`getVelocity()`/Lesson 3's logging, which closes the loop through your code. The two unit conversions (rad ÷ 2π; Lesson 6 adds × gear ratio) on the return arrow. "Your code" and "the sim" regions.
- Why: the lesson calls it the picture to keep; Lesson 8 §5 reuses it. The ASCII version's return arrow confuses.
- Made from: the four steps in `simulatePeriodic()`. No data.
- Text changes: §3 "...take this one." + "(Figure 4.1)"; delete the ASCII block.
- Linked from: Lesson 5 §2 (second motor), Lesson 6 §2 (× gear ratio, "the whole chain is honest"), Lesson 8 §5, Lesson 16 (`ChassisSimulation`), Lesson 29 (battery model).

**Figure 4.2 — Velocity response to a held throttle, two inertias** · medium · (a) · batch 2 · `04-velocity-two-inertias.png`
- Where: §5, after "**Velocity** ramps up to a steady value and back to zero".
- Shows: x time (s), y rotor velocity (rot/s). `driveAtSpeed(0.3)` held 1 s then released, `DCMotorSim` J = 0.001 (the lesson's) and J = 0.05 (Try It #1). Steady value and the 63% point marked. Optional small position panel.
- Why: §5 says "ramps up... like a real motor" in words; Try It #1 and #2 ask for predictions. Put it under the Try It if the exercise should stay a discovery.
- Made from: **new probe** (BARE, Lesson 4 state: `TalonFX` + the lesson's `DCMotorSim`, `HAL.initialize()`, fixed 20 ms, 0.3 for 1 s then 0). Hand estimate to check: tau about 0.09 s (J = 0.001), about 4.4 s (J = 0.05), steady about 30 rot/s (alpha-8 Kraken block). The 0.05 run needs more than 1 s to settle.
- Text changes: **text issue:** Try It #2 calls the velocity curve "S-shaped"; a first-order velocity rise is concave (position is the S). Fix to "that rounded ramp" or plot position. Check §1's "plots sat flat at the end of Lesson 3" against the first-tick behaviour. Add "Figure 4.2".
- Linked from: Lesson 5 §2 (J = 0.004), Lesson 6 §2 (J = 0.025 with 6.75).

### Lesson 5 — Steering to an angle with P control

**Figure 5.1 — Setpoint, measurement and error in one move** · high · (a) · batch 1 · `05-setpoint-measurement-error.png`
- Where: §4, after "**Walk through one tick, say target = 90°, currently at 20°:**".
- Shows: x time, y degrees. Setpoint line at 90°, measurement for `kP = 0.0005` from 0°, error as the vertical gap at the instant the measurement crosses 20° (70°). Second panel: output (fraction) = kP × error, falling as the gap closes.
- Why: §1 defines three words and §4's worked tick uses all of them; the reader holds a moving picture in mind.
- Made from: **new probe** (RIG, Lesson 5 state: `DriveModule`, steering motor on a 1:1 `DCMotorSim`, J = 0.004, CANcoder primed at 0, `steerToAngle(90)`, 20 ms, 2 s warm-up, fresh JVM). Lesson 7's 6.3 s/9.0 s are the geared plant. The probe must say how long the 1:1 plant takes; check the text's "quick" and "gets moving".
- Text changes: §4 after the walkthrough list: "Figure 5.1 plots exactly that move." Verify "Near 90°, error ≈ 0... eases in and holds".
- Linked from: Lesson 6 Try It #2; Lesson 8 §3 ("measure, subtract, multiply, clamp, command"); Lesson 17 §4 (`PIDController`).

**Figure 5.2 — `kP` too small, just right, too big** · high · (a) · batch 1 · `05-kp-three-gains.png`
- Where: §5, after "Run in sim, plot `DriveModule/SteerAngleDegrees` in AdvantageScope, and tap the left button:".
- Shows: x time, y steering angle. Same 0 → 90° tap with three gains: 0.0005, one that crawls, one that overshoots and rings. Setpoint at 90°. Legend carries each `kP`.
- Why: the three bullets are the lesson's tuning intuition; the figure shows what "oscillates" looks like.
- Made from: **new probe**, same rig as 5.1, three gains. Pick the "too big" gain by measurement (first doubling from 0.0005 that rings), one plant for all three.
- Text changes: §5 after the bullets: "Figure 5.2 shows all three on one plot." **Needs detail:** the text asserts the ungeared plant rings; if the plant stays monotone up to a very large gain, say so (the geared Lesson 7 plant does: "barely any overshoot at 0.005").
- Linked from: Lesson 7 §7 ("Retune it the Lesson 5 way"), Lesson 8 §6, Lesson 12 (with 7.3).

**Figure 5.3 — The long way round (error wrap)** · medium · (c) · batch 2 · `05-error-wrap.svg`
- Where: §6, after "Ask for `0°` while sitting at `350°`."
- Shows: compass circle, robot at 350°, target 0°; two arcs, the 350° sweep backwards (error −350°) in red and the +10° nudge in green. Second small circle for 170° → −170° (+20°, not −340°), Lesson 8's example.
- Why: Try It #1's `while` loops and Lesson 8's "−170° to 170° should turn 20°, not 340°" are hard to see as numbers. Lesson 8 Try It #1 (+100° through 180° rather than −260°) is the same picture.
- Made from: constants in the text only.
- Text changes: §6 "...nudged +10° forward." + "(Figure 5.3)". Optionally mention the −180°...+180° range as the arc bounds.
- Linked from: Lesson 7 §2 ("the wrap trick"); Lesson 8 §3 and Try It #1; Lesson 10 (`MathUtil.inputModulus` swap); Lesson 12 (`ContinuousWrap` retires the software wrap).

### Lesson 6 — Distance & commands

**Figure 6.1 — Two ways a command ends** · medium · (c) · batch 2 · `06-two-ways-to-end.svg`
- Where: §3, after "This command can end two different ways:" (the Finished and Canceled bullets).
- Shows: two timelines of one `driveDistance`. Top: set position 0 → throttle → `waitUntil` true → body ends → `whenExited` fires, motor 0, `whenCanceled` silent. Bottom: another command takes the drivetrain mid-wait → `whenExited` fires, `whenCanceled` fires, `waitUntil` never returns. The hook that runs is coloured.
- Why: the lesson calls the distinction "easy to miss and expensive to get wrong"; the prose is the only explanation and Try It #3 asks the student to confirm by printing.
- Made from: the alpha-8 hook table in CLAUDE.md's `whenExited` adoption note (natural finish: `EXIT` only; cancel: `EXIT` then `CANCEL`). No new probe.
- Text changes: check §3's bullets against that table: the diagram must not imply `whenExited` is skipped on cancel. Add "Figure 6.1 lays the two endings side by side." Try It #3's expected result must match.
- Linked from: Lesson 5 §4 (`whenCanceled`, cancel path only), Lesson 8 §3 ("Lesson 6's rule about endings"), Lesson 9.

**Figure 6.2 — `driveDistance(1.0, 0.4)`: distance, throttle and where it stops** · medium · (a) · batch 2 · `06-drive-distance-trace.png`
- Where: §5, after "The trace should climb to 1.0 and flatten as the command stops itself."
- Shows: x time. Top: `DriveModule/DistanceMeters` climbing to 1.0, target as a dashed line, flattening at its final value. Bottom: drive throttle (0.4 → 0), marking where `waitUntil` returned and `.whenExited` fired.
- Why: the closing paragraph says "stops at exactly 1.0 meters"; with J = 0.025 and no active braking the wheel coasts past, so the student's trace is unlikely to read 1.0.
- Made from: **new probe** (RIG, Lesson 6 state, `driveDistance(1.0, 0.4)`, J = 0.025, 6.75 ratio, 20 ms, fresh JVM). Report the overshoot in mm.
- Text changes: **text issue:** "exactly 1.0 meters" in What you learned is likely off by the coast; change to "about" if the probe shows any. §5 "climb to 1.0 and flatten" → "climb to about 1.0 (Figure 6.2 shows the exact finish)". If the probe shows a ramp spanning many seconds, recheck §2's "visible ramp without dragging". Decide figure vs plain statement once the number is known.
- Linked from: Lesson 7 Try It #3 (`driveForwardMeters`), Lesson 9 (whole-chassis `driveDistance`).

### Lesson 7 — Four modules

**Figure 7.1 — The chassis frame, the four corners and the two moves** · high · (c) · batch 1 · `07-chassis-frame-corners.svg`
- Where: §2, after "**+X is forward, +Y is left, yaw is CCW-positive.**" and the corner constants. Referred to again in §5 (angle table) and §6.
- Shows: top-down chassis, axes (+X up the page, +Y left), corners FL/FR/BL/BR at `(±0.3, ±0.3)` from `DriveConstants`, a curved CCW yaw arrow. Second panel "translate": four parallel arrows. Third "rotate": pinwheel at 135° / 45° / −135° / −45°.
- Why: three conventions to hold together; everything later relies on them. §5 itself says "Sketch the four wheels pointing those ways".
- Made from: `DriveConstants` and the `Math.atan2(x, -y)` table in §5. Check the table's "points toward" column against the arrows (FL at 135° points back-left).
- Text changes: §2 after the convention sentence: "Figure 7.1 draws it." §5 table lead-in: "the right-hand panel of Figure 7.1 draws these". The yaw-CCW arrow belongs here (Lesson 8 depends on it).
- Linked from: Lesson 8 §1 ("positive is CCW"); Lesson 9 §5 (pinwheel angle); Lessons 10 (10.1 and 10.3 reuse its look and axes), 11 (frames), and any Swerve-tab explanation.

**Figure 7.2 — AdvantageScope: Swerve tab, States slot** · medium · (d) · needs the user · `07-advantagescope-swerve-tab.png`
- Where: §7, after "drag `NetworkTables/Telemetry/Drivetrain/ModuleStates` into its **States** slot" (before "Watch a wheel chase...").
- Shows: Swerve tab with `ModuleStates` in States, Max Speed 5, arrows parallel while driving and the pinwheel while holding the left bumper (two shots side by side).
- Why: "about to become your main debugging view for everything swerve"; the tab, slot and Max Speed field have to be found.
- Made from: user's AdvantageScope screenshot, Lesson 7 state.
- Text changes: §7 "Now the payoff for publishing `ModuleStates`:" + "(Figure 7.2)".
- Linked from: Lesson 8 §6, Lessons 10, 11, 12, 16.

**Figure 7.3 — Steering a 90° turn through the real 25:1 gearbox** · high · (a) · batch 1 · `07-steering-geared-two-gains.png`
- Where: §7, after "Watch a wheel chase its target on the Swerve tab" and before/at "**Retune it the Lesson 5 way**".
- Shows: x time, y steering angle. One `SwerveModule` 0 → 90°: `kP = 0.0005` (crawls) and `kP = 0.005` (settles), dashed 1° band, marks at 6.3 s and 9.0 s for the first trace. Show the first second clearly (log axis or inset).
- Why: the text gives timings in prose and says the taught gain now needs ten times more; two curves make "wrong plant, not a bug" concrete, against Figure 5.2.
- Made from: **measured** (Lesson 7, "v3 Lessons 7-22 re-measured on alpha-8": 0.0005 within 1° at 6.3 s, within 0.3° at 9.0 s, 0.24° short from 10 s, no overshoot; 0.005 within 1° at 0.5 s, within 0.1° at 0.76 s, overshoot 0.000°). Re-run for the series.
- Text changes: §2's callout ("takes about 6 simulated seconds") and §7's "settles within about a second" both get "(Figure 7.3)". **Text issue:** §7 says "barely any overshoot" where the note measures 0.000°; one-word fix.
- Linked from: Lesson 8 §6 ("unlike the geared motors from Lesson 7"); Lesson 12 (firmware loop replacing this P).

### Lesson 8 — Gyro & heading

**Figure 8.1 — `turnToHeading(90)`: heading, command and finish band** · high · (a) · batch 1 · `08-turn-to-heading.png`
- Where: §6, after "heading sweeps toward `90°`, slows as it approaches, settles inside the ±2° band, and the command ends."
- Shows: x time. Top: `Drivetrain/HeadingDegrees` 0 → 90° with a shaded ±2° band and a mark where the loop exits. Bottom: commanded `omega` (fraction): flat at the ±0.5 clamp, then the P ramp down; mark where the clamp releases at error 0.5/0.02 = 25° (heading 65°).
- Why: saturated-then-proportional is invisible in a heading-only plot; §3 says the clamp is tighter "on purpose" and "no momentum to fight" needs the picture.
- Made from: **new probe** (RIG, Lesson 8 state: real `Drivetrain`, `turnToHeading(90)` through the scheduler at 20 ms, heading and `m_lastCommandedOmega` recorded, fresh JVM). Arithmetic to check: at ±0.5 the rate is 180°/s, so 65° takes about 0.36 s. "Well under a second" is not measured in CLAUDE.md.
- Text changes: §6 after the sentence: "Figure 8.1 shows the saturated start and the P tail." Check "no overshoot": the loop exits inside 2° and the modules keep their command until `whenExited`, so any overshoot is below the band. Link Figure 7.3 for "unlike the geared motors".
- Linked from: Lesson 10 (heading loop on real kinematics), Lesson 12.

**Figure 8.2 — AdvantageScope: Swerve tab with the Rotation slot filled** · low · (d) · needs the user · `08-advantagescope-swerve-rotation.png`
- Where: §6, after "drop `NetworkTables/Telemetry/Drivetrain/Heading` into the **Rotation** slot." (before "Then watch the same thing as a picture").
- Shows: Swerve tab from Figure 7.2 with `Heading` set, chassis turned to 90°, pinwheel arrows.
- Why: "one glance tells you what the wheels are doing and which way the robot thinks it's facing". Low: adds one slot to a screenshot the reader has. Can't be a panel of 7.2 (no gyro yet in Lesson 7).
- Made from: user's screenshot, same session as 7.2, Lesson 8 state, after pressing the bottom face button. Drop if the user prefers to supply one AdvantageScope shot fewer.
- Text changes: §6 "Then watch the same thing as a picture:" + "(Figure 8.2)".
- Linked from: Lesson 11 (the field view replaces it with a pose).

### Lesson 9 — Autonomous: combine everything

**Figure 9.1 — Why scale drive by cosine** · medium · (a) · batch 2 · `09-cosine-scrub.png`
- Where: §5 "A polish: don't drive while pointed wrong", after "scale the drive line by cosine."
- Shows: one module at the start of step 2 (turn to 90°), x 0-0.6 s. Panel 1: steering angle toward its pinwheel target. Panel 2: drive throttle without and with the `cos(error)` line (full throttle during the sweep vs ramping in).
- Why: the text says "scrub for a fraction of a second"; the reader can't see how long, or how the cosine shapes it.
- Made from: **new probe** (RIG-style, Lesson 9 snapshot: `Drivetrain.turnToHeading(90)` after a `driveDistance`, fixed 20 ms; log module 0 steer angle and drive throttle, once with the cosine line removed).
- Text changes: after "One line, visibly better auto." add "Figure 9.1 shows the same first half-second with and without it."
- Linked from: Lesson 10 §5 ("best friends with Lesson 9's cosine trick").

**Figure 9.2 — Sequence, parallel, race, optional** · medium · (c) · batch 2 · `09-sequence-parallel-race.svg`
- Where: §6 "Doing things at once: parallel", after "Two tools, both static methods on `Command`".
- Shows: four timelines of commands A and B (A longer): `sequence`, `parallel` (ends with the later one), `race` (ends with the first, other cut off with an X), `parallel(...).optional(B)` (ends with the required one, B cut off). A fifth line: the "shared requirement" error as a crossed-out pair.
- Why: four behaviours in prose; "optional" is the hard word and a picture of who gets cut off settles it.
- Made from: the section's definitions. No data.
- Text changes: after the bullet list "Figure 9.2 draws all four." Caption says which bar ends the group.
- Linked from: Lesson 17 §10 Try It #4 (sequence); Lesson 25 (`Command.parallel` of path and score), only where those sections explain group endings.

### Lesson 10 — Full swerve with kinematics

**Figure 10.1 — Translation plus rotation at each corner** · high · (c) · batch 1 · `10-translation-plus-rotation.svg`
- Where: §1 "Why kinematics?", after "with magnitude `ω × r`)."
- Shows: top-down robot, +X up, +Y left (as Figure 7.1), corners labelled in array order FL, FR, BL, BR (0-3). At each corner: thin vector for shared translation, tangent vector `ω × r`, thick sum. Two panels: pure translation (four equal sums), then translation plus spin (four different sums).
- Why: "add the translation vector to the rotation vector, which points tangent to the circle" is the whole lesson; the array-order warning in §2 becomes visible.
- Made from: `kHalfLength`/`kHalfWidth` = 0.3 and the corner `Translation2d`s; vx = 1, vy = 0, ω = 1 rad/s for the second panel. Reuse Figure 7.1's axes and corner layout (drawn after 7.1).
- Text changes: after the `ω × r` sentence "Figure 10.1 draws it." In §2, at "match the array you built in Lesson 7 exactly", add "the numbers on Figure 10.1 are the array indices".
- Linked from: none needed.

**Figure 10.2 — `optimize`: take the short way** · low · (c) · batch 3 · `10-optimize-short-way.svg`
- Where: §5 "Optimize", after "than to physically turn 180°."
- Shows: wheel circle, current 10°, target 190°; long 180° arc versus no turn with drive reversed; two mini-panels.
- Why: modest; the text is clear and short. Only if the budget allows.
- Made from: no data.
- Text changes: "(Figure 10.2)".
- Linked from: none.

**Figure 10.3 — Robot-relative versus field-relative** · high · (c) · batch 1 · `10-robot-vs-field-relative.svg`
- Where: §7 "Field-relative driving", after "regardless of robot orientation."
- Shows: top-down field, X away from the driver station, Y. Robot turned 180°. Left: robot-relative, stick forward drives toward the nose (back toward the driver). Right: field-relative, the same stick moves the robot in +X while the nose points the other way. The `toRobotRelative(heading)` rotation drawn as an arc.
- Why: "after a 180° turn, forward is backward" is the picture a new driver lacks; the course's first use of the field frame, assumed by Lessons 11-17.
- Made from: no data. Field axes as in Lesson 11 (origin at the blue corner, +X toward the red end); draw before the 11.x and 17.x figures.
- Text changes: after "regardless of robot orientation" "Figure 10.3 shows the same stick push both ways." Caption: +X is toward the far end, the convention Lesson 11 uses.
- Linked from: Lesson 11 §1, §4 and §6 (`driveToPose`'s field-relative speeds); Lesson 17 §8 (path flipped for red); Figure 17.4.

### Lesson 11 — Odometry & field view

(The proposed "a pose, and dead reckoning" figure is dropped; see section 5.)

**Figure 11.1 — SimGUI: where `NetworkTables → Telemetry → Field` is** · medium · (b) · batch 2 · `11-simgui-field-widget.png`
- Where: §4, after "menu **NetworkTables → Telemetry → Field**, and a top-down field pane opens".
- Shows: SimGUI with the NetworkTables menu open and Telemetry → Field highlighted, then the field pane with the robot drawn.
- Why: first widget opened from the NetworkTables menu; Lessons 14-17 and 19 say "watch the Field widget".
- Made from: Xvfb recipe (Lesson 30 notes), Lesson 11 snapshot: run, open menu, shoot; open the pane, drive a short way with a scripted `GamepadSim` or `xdotool`, shoot.
- Text changes: add "Figure 11.1 shows where to click." **Flow:** the "File → Connect to Simulator" line above it is AdvantageScope, not SimGUI; a reader without AdvantageScope gets lost, and the figure keeps the two apart.
- Linked from: Lesson 14 §5, Lesson 15 §10, Lesson 16 §7, Lesson 17 §10 (each "(see Figure 11.1)"); Lessons 19, 25 and 26.

### Lesson 12 — Model-based control

**Figure 12.1 — Coach and player** · low · (c) · batch 3 · `12-coach-and-player.svg`
- Where: §1 "Two computers", after "That's the whole lesson".
- Shows: a 50 Hz tick line (every 20 ms: state a target) over a 1 kHz line (the TalonFX closing the loop).
- Why: the text covers it in two sentences. Low.
- Made from: no data.
- Text changes: "(Figure 12.1)".
- Linked from: none.

**Figure 12.2 — The sensor and gear chain** · high · (c) · batch 1 · `12-sensor-gear-chain.svg`
- Where: §3, after "**`RotorToSensorRatio`** replaces `SensorToMechanismRatio` for the *steer* motor", at the paragraph's end.
- Shows: two chains. Steer: rotor →(25:1, `RotorToSensorRatio`)→ CANcoder on the wheel →(1:1, `SensorToMechanismRatio`)→ mechanism; the closed loop reads the CANcoder. Drive: rotor →(6.75:1, `SensorToMechanismRatio`)→ wheel. Arrows show which sensor the 1 kHz loop reads.
- Why: the same 25:1 changes meaning when the sensor changes; the most error-prone setting in the lesson.
- Made from: `kSteerGearRatio = 25`, `kDriveGearRatio = 6.75`, the §3 config block.
- Text changes: after the paragraph "Figure 12.2 shows the two chains." Caption states the rule: the ratio before the sensor is `RotorToSensor`, after it `SensorToMechanism`.
- Linked from: Lesson 13 §4 (`ModuleIOTalonFX` holds this config).

**Figure 12.3 — A feedforward step** · high · (a) · batch 1 · `12-feedforward-step.png`
- Where: §7 "Run it and feel the difference", after "*then* bring in a little `kP` for the residue."
- Shows: x 0-1.5 s. Top: requested and measured wheel speed for a step to 2 m/s, `kDriveKV` 0.8 and 0.4 (Try It #2). Bottom: applied drive voltage, the instant jump to `kV × requested`.
- Why: "the voltage jumps instantly before any error exists" and "speed settles low" are things the reader is asked to see (Try It #1, #2).
- Made from: **new probe** (RIG, Lesson 12 snapshot, one `SwerveModule`, `setDesiredState` step, fixed 20 ms; log `getMotorVoltage`, requested and measured speed). Check `kDriveKP` = 0.1 with the model halved before quoting "settles low".
- Text changes: after the tuning paragraph "Figure 12.3 is what the first two Try It items let you see for yourself." Keep Try It #1 and #2.
- Linked from: Lesson 18 §3; Lesson 28 §3 (the kV-less fixed point).

### Lesson 13 — IO layers & replay

**Figure 13.1 — The IO door** · high · (c) · batch 1 · `13-io-door.svg`
- Where: §1 "The idea: hardware behind a door", after "the real robot, a physics model for the simulator."
- Shows: `SwerveModule` (logic) holding a `ModuleIO` reference; the interface with two lists, inputs (readings) and commands; implementations `ModuleIOTalonFX` (REAL), `ModuleIOSim` (SIM), an empty `ModuleIO` (REPLAY). `Drivetrain` picks one with the `kCurrentMode` switch. A smaller stack for `GyroIO`.
- Why: the lesson's argument is a structure across ten sections; every later IO lesson (15, 16, 18, 20, 28) repeats the shape.
- Made from: class names and the `switch` in §7 and §9. Draw before 15.2 and 16.2, which reuse its boxes.
- Text changes: after "...instead of a live sensor." "Figure 13.1 is the map for the rest of the lesson." A back-pointer sentence in §7.
- Linked from: Lesson 14 §2; Lesson 15 §6 (`VisionIO`); Lesson 16 §4; Lesson 18 §5 (`ElevatorIO`); Lessons 20, 21, 22, 28.

**Figure 13.2 — Record, then replay** · high · (c) · batch 1 · `13-record-replay.svg`
- Where: §11 "Record a run, then replay it", after "A replay is two runs: one that records, and one that plays the recording back."
- Shows: two columns. Record: hardware or sim → `updateInputs` → **inputs** (logged) → your logic → **outputs** (`RealOutputs`, logged) → commands. Replay: log → **inputs** (read back) → today's logic → `ReplayOutputs`. Hardware greyed out; inputs the shared box; outputs the thing that differs when code changes.
- Why: the "Look at it" list and the ×1.1 experiment only make sense with it; why a bug in `ModuleIOTalonFX` leaves the pose unchanged and one in `getPosition` moves it falls out directly.
- Made from: no data.
- Text changes: after the Replay paragraph "Figure 13.2 shows what is read from the file and what is worked out again." Point at it where the `ModuleIOTalonFX` ×1.1 case is discussed.
- Linked from: Lesson 15 Try It #5; Lesson 16 §7 (`StartingPlacement`); Lesson 17 Try It #7; Lessons 29 (`PowerReadings`), 32 §1 and §6, 33 (SysId replay). This is the single home for the replay pipeline (no second diagram in Lesson 32).

**Figure 13.3 — The ×1.1 experiment** · medium · (a) · batch 2 · `13-replay-scaled-pose.png`
- Where: §11, after "`ReplayOutputs/Drivetrain/Pose` now ends farther from where the robot started: measured, exactly 1.1 times as far."
- Shows: top-down (x, y) pose track of one recorded drive: `RealOutputs/Drivetrain/Pose`, the clean replay (on top of it), and the replay with `* 1.1` in `getPosition` (same shape, stretched from the start). End markers and the end-to-end gap labelled.
- Why: "exactly 1.1 times as far" is easy to read, hard to picture; shows the start is the fixed point.
- Made from: **measured** (Lesson 13, record/replay in the real `Robot` loop; alpha-8: 0.660 and 0.657 m, 1.0999 times). Capture the track from `RealOutputs/Drivetrain/Pose` and the two `_sim` files; use the drive the text describes (ten seconds, one turn).
- Text changes: after the sentence "Figure 13.3 plots both replays over the recording." Optionally add "about 0.66 m on this drive".
- Linked from: Lesson 14 Try It #1 (drift).

### Lesson 14 — The pose estimator

**Figure 14.1 — Localizer and its providers** · high · (c) · batch 1 · `14-localizer-providers.svg`
- Where: §2, after "A **`PoseProvider`** is anything that can fold its own evidence into the shared estimate."
- Shows: `Localizer` at the centre holding `SwerveDrivePoseEstimator`. Left: providers registered with `addProvider` (wheel odometry plus gyro, vision). Arrows `update(...)` (every tick, smooth) and `addVisionMeasurement(pose, timestamp, stdDevs)` (occasional, absolute). Right: `getPose()` consumers (`Field` view, `Pose` log, later autos). A grey future-camera box.
- Why: "odometry for smoothness, vision for truth" and "Localizer doesn't change by a line" are about where things plug in.
- Made from: class and method names in §2-§4.
- Text changes: after the `PoseProvider` sentence "Figure 14.1 shows where each piece plugs in." Lesson 15 §1's "shape of what your code needs" can cite it.
- Linked from: Lesson 15 §1 and §10; Lesson 16 §7; Lesson 17 §1.

**Figure 14.2 — Each sighting is a nudge** · medium · (a) · batch 2 · `14-sighting-nudges.png`
- Where: §5, after "press it again and it slides a little further; the first press doesn't finish the job on its own."
- Shows: distance from the estimate to (2, 5) against time (0-10 s), robot parked away from (2, 5); ticks at each Start press (five, a second apart); a staircase toward 0. Optional second series with the trust knob `(0.5, 0.5, 999999)`.
- Why: "a real pull, not a teleport" is a shape over time.
- Made from: **new probe** (LOOP, Lesson 14 snapshot: place the robot, call `camera.reportSighting` five times at fixed ticks, log `localizer.getPose()`). CLAUDE.md only records exact replay through three sightings.
- Text changes: after the pull sentence "Figure 14.2 plots five presses." Check "slides toward (2, 5)" at default trust before writing the caption.
- Linked from: Lesson 15 §10; Lesson 16 §7.

### Lesson 15 — Real vision

**Figure 15.1 — Where the cameras are** · high · (c) · batch 1 · `15-camera-mounts.svg`
- Where: §4 "Tell the robot where the camera is", after "and today it grows a third axis: **+Z is up.**"
- Shows: top-down robot, +X forward, +Y left; front camera at (0.3, 0) along +X, back camera at (−0.3, 0) rotated π; field-of-view wedges (80°, 6 m). Side-view inset: camera 0.2 m up (+Z). The two blind spots between wedges.
- Why: a 3D transform, a yaw of π and "two cameras cover each other's blind spot" are geometry.
- Made from: `kFrontRobotToCamera`, `kBackRobotToCamera`, `kSimHorizontalFovDegrees = 80`, `kSimVerticalFovDegrees = 56`, `kSimMaxRangeMeters = 6`; wedges drawn from constants.
- Text changes: after the +Z sentence "Figure 15.1 draws both mounts." The "Measure this for real" callout can say the figure's numbers are the ones the transform stores.
- Linked from: Lesson 27 (aim and tag visibility); Lesson 30 (camera alerts); Figure 34.1 (camera height and tilt).

**Figure 15.2 — Real camera and simulated camera, same wire** · high · (c) · batch 1 · `15-real-vs-sim-camera.svg`
- Where: §8 "Simulating a camera you don't own", after "It talks to the network, the way the real camera does."
- Shows: two pipelines meeting at one point. Real: tag → Limelight → publishes `limelight-front/results_msgpack` → NetworkTables. Sim: `VisionIOLimelightSim` (`LimelightFrame`, truth pose, visible tags) → the same topic. Shared, drawn once and marked "unmodified in both worlds": `LimelightLib` (filter, trust, latency) → `VisionIOLimelight` → `processInputs` → `LimelightPoseProvider` → `Localizer`.
- Why: §8's argument that the fake publishes the same message is a structure; Try Its #3-#5 are about which side of each box a bug lives on.
- Made from: class names from §6-§9 and the topic name. Reuse 13.1's box style.
- Text changes: after the quoted sentence "Figure 15.2 shows the two paths." In Try It #4 (miscalibrated camera invisible) point to it: the sim box never uses the mount to compute the pose.
- Linked from: Lesson 16 §7; Lesson 30 (the unplug switch ANDs into the sim reading).

**Figure 15.3 — SimGUI: where a camera's readings are** · medium · (b) · batch 2 · `15-simgui-advantagekit-menu.png`
- Where: §10, after "look for them under **NetworkTables → AdvantageKit → Localizer**".
- Shows: NetworkTables menu with AdvantageKit → Localizer → limelight-front → PoseObservations, `[]` before movement and `[...]` after, with the Field pane beside it.
- Why: inputs appear under AdvantageKit, not Telemetry (Figure 11.1 showed Telemetry), and what `[]` and `[...]` mean.
- Made from: Xvfb SimGUI on the Lesson 15 state; drive a short way from (0, 0) so frames arrive. Matches the Lesson 15 AdvantageKit note on `[]`/`[...]`.
- Text changes: after "`[...]` once frames arrive." "Figure 15.3 shows where it is."
- Linked from: Lesson 16 (`Drivetrain/SimulatedPose` under RealOutputs); Lesson 18 (`Elevator/...`); Figures 19.2 and 30.1 (same menu tree); anywhere "NetworkTables → AdvantageKit" is quoted (Lessons 18-30).

**Figure 15.4 — A parked robot still drifts** · medium · (a) · batch 2 · `15-parked-drift.png`
- Where: Try It #3, after the "Here's the answer" paragraph (not after "It drifts — between 25 and 50 cm in 60 seconds", which would give the answer away before the "Work out why" request).
- Shows: distance-from-start against time for three 60 s runs with endpoints labelled, or three top-down tracks.
- Why: "drift from vision noise alone, nothing moving" is the point; the reader is asked to explain it.
- Made from: **measured** (Lesson 15 Try It #3: 0.51, 0.26, 0.38 m in 60 s; LOOP, `Random` camera) but a per-tick pose log is needed: re-run.
- Text changes: "Figure 15.4 shows three runs."
- Linked from: Lesson 16 §6 and §7. (Was batch 3 to keep Lesson 15 at three figures; the user lifted that cap.)

### Lesson 16 — Ground truth

**Figure 16.1 — The estimate creeps ahead and stays there** · high · (a) · batch 1 · `16-estimate-creeps-ahead.png`
- Where: §6 "Ground truth, and drift you didn't have to fake", after "the estimate creeps ahead of the truth — and stays there. Nothing resets it."
- Shows: x time; y signed distance of `Localizer/Pose` ahead of `Drivetrain/SimulatedPose` along the travel direction, cm; vision off. Three traces: quarter stick 3 s (flat 0.0), full-stick start 1.5 s (ends 8 cm ahead, held), full forward then reverse (74 cm held, 98 cm worst). A faded fourth: forward-reverse with vision on, pulled back to 0.
- Why: "creeps ahead", "stays there", "nothing resets it" are curve shapes, and the gentle case makes slip visible.
- Made from: **measured** (Lesson 16, "Lessons 7-22 re-measured on alpha-8": 0.0 cm / 0.7 worst; 8 cm held / 34 worst; 74 held / 98 worst; vision on 0.0 at rest / 31 worst). LOOP, vision off then on. Plot a typical run, not the worst.
- Text changes: after "Nothing resets it." "Figure 16.1 plots three drives, vision switched off." The text gives no number; consider "about 8 cm after one full-stick start".
- Linked from: Lesson 17 §10 ("within a couple of centimeters"); Lesson 21 (Figure 21.1's belief-vs-truth, same idea); Lesson 26 (error tables); Lesson 27 (orbit).

**Figure 16.2 — Truth and estimate are different loops** · medium · (c) · batch 2 · `16-truth-vs-estimate-wiring.svg`
- Where: §7, after "That's the whole fix — `drivetrain::getSimulatedPose` in place of `localizer::getPose`."
- Shows: two diagrams, "Lesson 15" and "Lesson 16". In 15, `Localizer.getPose()` feeds the sim camera and the camera feeds `addVisionMeasurement` back to the same estimator (a closed loop). In 16, `ChassisSimulation` (follows the measured wheel states, grip-limited) feeds the gyro, the camera and `SimulatedPose`; the estimator uses only wheel encoders and cameras; they meet only through the camera.
- Why: "confirmation, not rescue" and "truth vs estimate" are about who reads whom, spread over four sections.
- Made from: §4 and §7 code, including the `simulateChassis` note (feeds on measured states, not the command). Reuse 13.1's style.
- Text changes: after the quoted sentence "Figure 16.2 draws the wiring before and after."
- Linked from: Lesson 25 (`placeSimulatedRobot`); Lesson 26.

**Figure 16.3 — The grip limit** · medium · (a) · batch 2 · `16-grip-limit.png`
- Where: §7, after "push the stick to full and the robot doesn't reach speed instantly — it ramps" (in the Run it part, after the Figure 16.2 spot).
- Shows: x 0-1 s. Requested chassis speed (step at full stick) and true chassis speed from `ChassisSimulation`, slope labelled 11.77 m/s² (1.2 × 9.81). Optional: the stop with the stick released.
- Why: the lesson derives `a = μg`; the line's slope is the number they computed in §2.
- Made from: **measured** on the Lesson 25 state (Lessons 24-27 block, Lesson 26 bullet: 11.76-11.85 m/s² = `kWheelCoF` × 9.81); re-run on Lesson 16 for this state.
- Text changes: after the ramp sentence "Figure 16.3 plots one start."
- Linked from: Lesson 26 §1 (launch at the grip limit); Lesson 10 ("max speed") only if it is relevant.

### Lesson 17 — B-Line autos

**Figure 17.1 — Three loops at once** · low · (c) · batch 3 · `17-three-loops.svg`
- Where: §4, after "and they pull in different directions:" bullets.
- Shows: robot beside a path line; arrows for translation (along the line, length ∝ distance left), cross-track (perpendicular, ∝ offset), a rotation arc; the sum is the chassis command.
- Why: helps, but the bullets are clear and 17.4/17.5 show the behaviour from the data side.
- Made from: no data.
- Text changes: "(Figure 17.1)".
- Linked from: Lesson 26 §5 (cross-track P on a fixed line; Figure 26.1 reuses the frame idea).

**Figure 17.2 — Can it stop in time?** · medium · (a) · batch 2 · `17-can-it-stop.png`
- Where: §5, after "0.33 m of stopping fits inside 0.4 m of warning, so the robot arrives."
- Shows: speed (y) against distance remaining (x, 0 at the end). The loop's request `min(vmax, 5 × distance)` and the best-stopping curve `v = √(2 a d)` at 6 m/s², for v_max 2 m/s (arrives) and 3 m/s (braking curve above the request: overshoots), with the measured speed of the 2 and 3 m/s runs on top.
- Why: the arithmetic with 0.4, 0.33, 0.6, 0.75 m is what a plot of two curves does at a glance; Try It #2 returns to it.
- Made from: constants (`kTranslationP = 5`, `default_max_acceleration` = 6) for the curves; **measured** speeds from LOOP Two Corners at 2 and 3 m/s (Lesson 17 Try It #2: 69-74 cm past the corner, 36-37 cm past the end at 3 m/s). Re-run for the series.
- Text changes: after the arithmetic bullets "Figure 17.2 plots both curves"; Try It #2 refers back.
- Linked from: Lesson 26 (the handoff speed). (Was batch 3 to keep Lesson 17 at three figures; the user lifted that cap.)

**Figure 17.3 — SimGUI: the DS window for an auto** · high · (b) · batch 1 · `17-simgui-ds-window.png`
- Where: §10 "Run it", after "set **Alliance Station** to **Blue 1**."
- Shows: DS window (Alliance Station drop-down at Blue 1, editable only while **Disconnected**), Robot State with **Autonomous**, the opmode selector listing Far Side and Two Corners, **Enabled** and **Disabled**, labelled 1-4.
- Why: three screen-location facts (alliance station, auto picker, enable); the red-by-default trap in §8 is only avoided if they find the drop-down.
- Made from: Xvfb SimGUI on the Lesson 17 state (xdotool to open windows and click Autonomous); capture once with Blue 1. Same window as Figure 0.2; this one adds only Alliance Station and Autonomous (kept separate for that reason).
- Text changes: after the Alliance Station sentence "Figure 17.3 labels the four things you'll click." §8's "SimGUI starts out on the red alliance" can point to it.
- Linked from: Lesson 24 §10; Lessons 25, 26, 27, 33 (every later auto).

**Figure 17.4 — Two Corners, drawn and driven** · high · (a) · batch 1 · `17-two-corners-track.png`
- Where: §10, after "settling at (6, 6) facing 180°." (the "out along X, turning up the second leg" sentence).
- Shows: top-down field window x 2-7, y 2-7 m. The path (3,3) → (6,3) → (6,6); the 0.5 m handoff circle at (6, 3); markers for the rotation target (halfway up leg 2) and the `shoot` event (82% up leg 2); the measured `Drivetrain/SimulatedPose` track, the 14-16 cm overshoot past x = 6 labelled; heading ticks (0°, about 90°, about 180°). Optional right panel: the same path rotated half a turn for red, start (13.54, 5.07) facing 180° (merged here from the Try It #6 proposal; this panel is drawn from the path coordinates and `Autos.startPose`, not measured).
- Why: a dozen numbers about this shape (handoff radius, overshoot, rotation and event timing); the reference for Lessons 25 and 26's paths.
- Made from: **measured** (Lesson 17, "Lesson 17, Two Corners": 4.13-4.23 s, 14-16 cm past the corner, 6 cm past the end's y, cross-track peak 0.46-0.49 m, `shoot` at 82%). LOOP, Blue 1, six runs; path and config from `TwoCorners.json` and `config.json`.
- Text changes: §5 after "swings roughly 14-16 cm past this path's first corner" add "(Figure 17.4 draws it)"; point at it in §10. **Text issue:** the text says the event fires "about 80%" up the second leg; measured 82%. Try It #6 can point at the right panel.
- Linked from: Lesson 25 §5 (Pick Up path); Lesson 26 §1; Lesson 27 (Aim While Driving's path); draws on Figure 10.3's field axes.

**Figure 17.5 — Cross-track error at the corner** · high · (a) · batch 1 · `17-cross-track-error.png`
- Where: §10, after "Watch the cross-track error jump to about half a meter right at the corner".
- Shows: x 0-4.5 s. `FollowPath/crossTrackError` and `FollowPath/remainingPathDistanceMeters` (two y-axes), a vertical line where the robot enters the 0.5 m handoff radius; the jump to about 0.5 m and the decay.
- Why: the error jumps because of the handoff, then shrinks; words don't show that the jump isn't a mistake. Introduces the signals the student will plot.
- Made from: **measured** (same LOOP runs as 17.4; cross-track peak 0.46-0.49 m); both signals are in the `WPILIB_` log (B-Line logs through `Telemetry`).
- Text changes: after the quoted sentence "Figure 17.5 shows both signals." Say the figure uses the `WPILIB_` file (Try It #7 already mentions it).
- Linked from: Lesson 25 §9 (event markers); Try It #3 in this lesson (mistuned gain).

### Lesson 18 — Scoring elevator

**Figure 18.1 — What `kP` alone does, moving and holding** · high · (a) · batch 1 · `18-kp-alone.png`
- Where: §2 "Why `kP` alone sags", after "It's just sitting a little lower than you asked."
- Shows: top, one move stowed → `kScoreMid` in meters: goal, setpoint, height with the model, height with `kP` alone (`kElevatorKG`, `kElevatorKV`, `kElevatorKA` zeroed), the widest lag marked (8 cm). Bottom, the hold zoomed to mm below the goal: `kP` alone about 1.5 mm low for good, the model 0.19 mm.
- Why: "P needs error for every volt" seen twice, as lag while moving and as sag while holding. Broadened from the planned hold-only plot after the pilot review (the user asked for the `kV = 0` difference to show in a height plot and suggested the `kP`-only graph).
- Made from: **measured** 2026-11-18, `probes/Fig18KpAlone.java` (same method as 18.2, 300 ticks), data `18-kp-alone.csv` and `18-kp-alone-model.csv`. Peak lag 82.1 mm at 0.74 s; the hold reads 1.52 or 1.56 mm below the goal (it toggles by 0.039 mm, the height reading's step), mean 1.54; the model 0.194 mm. The lesson now says "about 1.5 mm" in §2, §10 and the Try It callout (it said 1.6, from the kG-only 1.5576).
- Text changes (done): §2 has a two-paragraph walkthrough (top panel, then the hold); §10's `kG` and `kP` bullets point at its lower panel; Try It #2 compares against it.
- Linked from: none yet.
- **Status: built 2026-11-18** (pilot, second round).

**Figure 18.2 — Goal, setpoint and height during one move** · high · (a) · batch 1 · `18-height-setpoint-goal.png`
- Where: §10 "Reading the gains off a graph", after "Three curves, and each one answers a different question".
- Shows: x time (s) from the request; y carriage height (m). `GoalMeters` (a step to `kMaxHeight`), `SetpointMeters` (the smooth trapezoid), `HeightMeters` (trailing the setpoint). Annotations: "goal–setpoint gap = profile still ramping (fine)", "setpoint–height gap = controller lag (tune this)". Optional lag panel (setpoint − height, mm) with the model against `kElevatorKV` zeroed.
- Why: §10's argument is "tune against the middle curve, not the first"; two different gaps are hard to picture in prose. The template for every "goal / setpoint / measured" plot.
- Made from: **measured** (Lesson 18, Lessons 7-22 block: RIG, stowed to `kMaxHeight`, 20 ms schedule after a 2 s warm-up; 11.3 mm in 26 of 30 moves, 20.0-20.2 mm in 4; `kElevatorKV` zeroed 90.96-90.98 mm). Use one of the 26 "11.3 mm" moves; the lag panel adds a `kElevatorKV = 0` run.
- Text changes: after the three-curve sentence "Figure 18.2 shows all three on one move." Put it before the "`kG` wrong / `kV` wrong" bullets. Text says "1-2 cm" and the plot reads 1.1 cm: say "about a centimetre" in the alt text.
- Linked from: Lesson 20 §9 ("the same three curves as Figure 18.2", replacing a separate arm plot); Lesson 27 §4 ("P corrects, doesn't sustain"); Lesson 32 §4-5 ("finding the tick where a goal changed"); Lesson 33 §8.
- **Status: built 2026-11-18 (the pilot); Figure 18.2 since the second round**, when 18.1 was built. Lesson 20 §9's link is in; the other three "Linked from" lessons are not yet. Second round: the top panel also draws the `kElevatorKV = 0` height (9 cm behind, marked), and §10 walks through both panels; the 7 cm note is three sentences.
  - **Open, not measured:** §10's `kA` bullet says a wrong `kA` shows as a brief spike at the ramp edges. At `kElevatorKA = 0.003` and 2 m/s² that's about 0.04 V, 0.3 mm of error, well under the 1-2 cm logging extra, so it likely can't be seen in the logged gap. Check before writing a `kA` figure.
  - Data: `probes/Fig18HeightSetpointGoal.java` (2 s hold, two practice round trips, then one recorded move; six columns), model run peak 11.3 mm, `kElevatorKV = 0` run 91.0 mm.
  - **What building it found:** the 91 mm is a flat plateau through the cruise, not a transient, and the firmware's own `ClosedLoopError` reads about 71 mm there (−0.05 mm with the model), so the logged gap carries an extra 1-2 cm in the simulator. The old "the 7 cm, plus a little extra while the profile is still speeding up" and "`kP = 20` is doing real work either way" were rewritten (CLAUDE.md, the batch 1 Lesson 18 bullet). The plot's "controller lag (tune this)" label became a description of the shape for the same reason.
  - Look: two panels (curves above, the gap in mm below); setpoint drawn wide under the height so it shows where they overlap. At a 390 px phone width the annotation text is small (about 7 px).

### Lesson 19 — A picture of the elevator

**Figure 19.1 — Canvas, anchor and a chain of segments** · medium · (c) · batch 2 · `19-mechanism-chain.svg`
- Where: §4 "Build the figure", after "Read the four declarations top-to-bottom and you're reading the robot from the floor up".
- Shows: the 2 m canvas rectangle (`kDisplayWidth` wide, `kDisplayHeight` 2 m), the root at (width/2, 0), `m_carriage` at 90° (length = height), `m_effector` at the carriage's end at −90° *relative to the carriage* (so it points right). Angle arcs: 90° from world +x, −90° from the carriage. Second panel: carriage grown to 0.75 m, effector moved with it.
- Why: "a child's angle is measured relative to its parent" underlies Lesson 20's `toDrawingAngle`, and the −90° → "points right" step is hard in words.
- Made from: `ElevatorConstants` canvas size, `kCarriageAngle` 90°, effector −90°. Draw to scale.
- Text changes: §4 after "`m_effector` attaches to *the carriage* and points at −90°..." "Figure 19.1 draws the chain."
- Linked from: Lesson 20 §7 (`toDrawingAngle`); Figure 34.1 (the nesting).

**Figure 19.2 — SimGUI: the Mechanism drawing** · medium · (b) · batch 2 · `19-simgui-mechanism.png`
- Where: §7 "Watch it", after "You can also find it inside SimGUI without opening a second tool".
- Shows: SimGUI with **NetworkTables → AdvantageKit → RealOutputs → Elevator → Mechanism** open, the orange line half-grown (after D-pad right), menu path visible.
- Why: the menu path is a screen location reused in Lessons 20, 22 and 28 (Dial).
- Made from: Xvfb recipe, Lesson 19 state, Teleop enabled, D-pad right via `GamepadSim` in SimGUI's joystick panel or `xdotool`. The proposal's optional AdvantageScope Mechanism-tab half is not a figure; supply only if the user wants it.
- Text changes: "Figure 19.2 shows where to find it." Same menu tree as Figure 15.3.
- Linked from: Lesson 20 §9 (Mechanism tab); Lesson 28 (`Flywheel/Dial`: same place, different key).

### Lesson 20 — Intake arm

**Figure 20.1 — Arm angle convention, soft limits and the drawing angle** · high · (c) · batch 1 · `20-arm-angle-convention.svg`
- Where: §2 "Gravity that depends on where you are", after "Everything in this lesson agrees on where zero is."
- Shows: side view from the pivot. 0° horizontal out front, 90° up, 180° back; the −20° (`kMinAngle`) and 180° (`kMaxAngle`) stops shaded; the zero line marked "firmware assumes this is horizontal". Torque arm `r cos θ` at 0°, 45°, 90° as a dashed horizontal distance to the centre of mass (0.254 m). Second panel: carriage up (90°), arm horizontal in the world = −90° in the drawing (`toDrawingAngle`).
- Why: five angle ideas (world angle, firmware zero, travel range, drawing angle relative to the carriage, cos θ lever arm) in prose; the "zero must be horizontal" warning and the −20°/180° asymmetry are easier seen once.
- Made from: `ArmConstants.kMinAngle`/`kMaxAngle`, length 0.508 m, centre of mass at half length, `kCarriageAngle` 90°.
- Text changes: §2 after the blockquote "Figure 20.1 draws the convention." Mention the drawing-angle panel again in §7 at `toDrawingAngle`.
- Linked from: Lesson 21 §9 (a wrong zero); Lesson 24 (UNHOMED, arm starts at −20°).

**Figure 20.2 — Holding voltage is a cosine** · medium · (a) · batch 3 · `20-hold-voltage-cosine.png`
- Where: §9 "Run it", after "Read that table twice."
- Shows: x arm angle (−20° to 180°); y applied volts while holding. Measured points at 0/45/90/135/180° (+0.25, +0.18, 0, −0.18, −0.25) and −20° (+0.24) on `kG cos θ`.
- Why: the sign flip at vertical and "balanced over its pivot" are the payoff. **Restates the five-row table**, the proposer's own caveat, so batch 3: decide whether the curve replaces the table (cut to the three rows the text discusses) or is dropped.
- Made from: **measured** (Lesson 20, Lessons 7-22 block: hold table unchanged, +0.24 at −20°). RIG, hold at each angle until settled, `Arm/AppliedVolts` at rest.
- Text changes: replace or sit beside the table; "Figure 20.2 plots the same readings."
- Linked from: none. (The proposed separate "arm lag with and without kV" plot is dropped; Lesson 20 §9 links to Figure 18.2 instead; see section 5.)

### Lesson 21 — Homing

**Figure 21.1 — The encoder's belief against the carriage's truth, and the snap** · high · (a) · batch 1 · `21-belief-vs-truth.png`
- Where: §8 "Run it", after "the robot still disabled. That's section 7's `Trigger` doing exactly its job".
- Shows: x time since launch (0-20 s). `Elevator/HeightMeters` (the belief, 0.00 falling to about −0.34); true carriage height (belief + 0.35 until the snap, dashed, 0.35 → 0.01); `Elevator/AtBottomLimit` as a step strip below. At about 18 s the belief jumps −0.34 → 0.01 and the lines meet. Labels: "encoder counts from a zero that was never the bottom", "`setPositionMeters` replaces the belief".
- Why: "confidently, precisely wrong" is the lesson; §8 describes it in numbers and the reader can't see two lines disagree without the truth, which AdvantageScope doesn't show.
- Made from: **measured** (Lesson 21, Lessons 7-22 block: LOOP, `AtBottomLimit` flips 17.9-18.4 s after launch, snap −0.3400 → 0.0100, sink 1.958 cm/s). The truth comes from the probe reading `ElevatorSim`, not a log; use the 18.1 s run.
- Text changes: after "That's the bug this whole lesson is about, and now it's on a graph." add "Figure 21.1 plots both the encoder's belief and where the carriage really is". The caption says the truth line exists only in the sim and the student can't graph it.
- Linked from: Lesson 21 §4 ("Make the simulator lie the same way"); Lesson 23 §5; Lesson 24 §1 (the D-pad bug on an unhomed encoder); Lesson 31 §5 (homing test); Lesson 33 §8 (homing 3.5 s vs 17.3 s). Pairs with Figure 16.1.

### Lesson 22 — Beam breaks

**Figure 22.1 — The intake box in the robot's frame** · medium · (c) · batch 2 · `22-intake-box-frames.svg`
- Where: §4 "A simulator that can actually hold something", after "The one line worth slowing down for is `fromRobot`."
- Shows: field frame on the left (piece at (4.5, 3.2), robot pose and heading); robot frame on the right (robot at origin, nose +x, the 0.3 m bumper, the box from `front` to `front + kIntakeReach` (12 in = 0.305 m) deep and `kIntakeWidth` (24 in = 0.61 m) wide, the piece in or out). Arrows "subtract the robot's position", "`rotateBy` the opposite heading". The 0.6 m centre-ahead catch distance from §8.
- Why: "put the piece in the robot's terms" is the move the lesson says to expect again; two frames and a rotation don't fit a paragraph.
- Made from: `kIntakeWidth`, `kIntakeReach`, the bumper offset in `ArmIOSim`, `kSimGamePiecePositions[0]` = (4.5, 3.2).
- Text changes: after the `fromRobot` paragraph "Figure 22.1 shows the two frames."
- Linked from: Lesson 25 §4 (marker arithmetic, "about 0.6 m ahead of the robot's center").

### Lesson 23 — LEDs

**Figure 23.1 — SimGUI: the LED strip** · medium · (b) · batch 2 · `23-simgui-led-strip.png`
- Where: §8 "Run it", after "find the LED view in **SimGUI**".
- Shows: SimGUI's Addressable LEDs window with the strip blinking red (on-phase) at boot, plus the window's place in the layout.
- Why: the only view of Lessons 23-25's colours; the student has to find the window. **Needs detail:** confirm in the container that the window appears for `AddressableLEDSim`.
- Made from: Xvfb SimGUI on the Lesson 23 state before enabling (red (255,0,0) on-phase); optionally a second after Back and a held piece (green (50,205,50)). One image is enough.
- Text changes: "Figure 23.1 shows what you're looking for." Mention a screenshot catches one blink phase.
- Linked from: Lesson 24 §9; Lesson 25 §1.

### Lesson 24 — Superstructure

**Figure 24.1 — The six states and their legal transitions** · high · (c) · batch 1 · `24-state-machine.svg`
- Where: §3 "Legality: a rulebook, not a sensor reading", after "Read it as a table and it's the whole robot in a few lines."
- Shows: six nodes (`UNHOMED`, `IDLE`, `INTAKING`, `HANDOFF`, `HOLDING`, `SCORING`). Solid edges: requests through `canGoTo` (IDLE→INTAKING, INTAKING→HANDOFF/IDLE, HANDOFF→HOLDING/IDLE, HOLDING→SCORING/IDLE, SCORING→IDLE). Dashed edges: `periodic()` noticing a fact (UNHOMED→IDLE when homed, INTAKING→HANDOFF on debounced beam break, HANDOFF→HOLDING when both `atGoal`, any→IDLE when the piece is gone, SCORING→IDLE when it leaves). Node fill is the strip colour; UNHOMED has one dashed edge only.
- Why: legality vs readiness is about which arrow is which; Lessons 25-32 say "the state" constantly.
- Made from: `canGoTo` in `code/v3/lesson-24/subsystems/SuperstructureState.java`, transitions in `Superstructure.periodic()` (lines 49-66), colours from `LedConstants`.
- Text changes: §3 "Figure 24.1 draws the rulebook; the dashed arrows are §4's." **Check:** §4's text moves "any of HANDOFF/HOLDING/SCORING → IDLE" but INTAKING is not in that list; make the diagram match the code (`INTAKING -> HANDOFF || IDLE` is the request rule).
- Linked from: Lesson 25 §3 and §5 (refused requests); Lesson 30 if it names states; Lesson 31 §5 (`SuperstructureStateTest`).

**Figure 24.2 — One capture cycle on a timeline** · medium · (a) · batch 2 · `24-capture-cycle.png`
- Where: §9 "Run it", after "the machine reaches `HOLDING` about 56 ticks (1.1 s) after that".
- Shows: x time from drive start; three tracks: `Superstructure/State` (coloured bands), `Arm/AngleDegrees`, `Elevator/HeightMeters` (0.02 → 0.73 m). Marks at beam break (+34 ticks, 0.68 s), `HANDOFF`, `HOLDING` (56 ticks, 1.12 s later), `SCORING` one tick then `IDLE`.
- Why: tick counts in prose; bands show the elevator rising during HANDOFF and HOLDING waiting for it, and the one-tick SCORING flicker.
- Made from: **measured** (Lesson 24, Lessons 24-27 block: Back → IDLE 125-155 ticks, arm down, quarter-stick drive, HANDOFF 33-34 ticks after the drive, HOLDING 56 after HANDOFF, elevator 0.7317-0.7344 m). One run; pick one with 34 and 56.
- Text changes: "Figure 24.2 is one run of the cycle." Keep the measured sentence.
- Linked from: Lesson 25 §8 (and Figure 25.3, same cycle in auto); Lesson 29 (HOLDING 60-61 ticks after HANDOFF with current limits).

### Lesson 25 — Doing two things at once

**Figure 25.1 — Sequence holds the elevator, coroutine doesn't** · low · (c) · batch 3 · `25-sequence-vs-coroutine.svg`
- Where: §3 "Get ready before you move", after "A coroutine with no requirements doesn't have that problem."
- Shows: two timelines. Sequence: one block "holds Elevator" over home, wait, auto; the `IDLE` motion evicts the whole thing. Coroutine: the elevator is held only during `home()`, then free.
- Why: the requirements rule is easy to read and hard to apply; the prose is already clear, so low.
- Made from: the lesson's text. No data.
- Text changes: "Figure 25.1" after the blockquote.
- Linked from: Lesson 26 (`getReadyThen` around the drive-to-pose auto), if it mentions it.

**Figure 25.2 — Pick Up: marker position against where the roller starts** · medium · (a) · batch 2 · `25-marker-position.png`
- Where: §4 "A marker that asks for something", after "the robot drives straight over it."
- Shows: top-down strip, x = 6.0, y 7.4 → 1.0. The piece at y = 3.8, the intake box (0.6 m ahead of centre), the hub footprint x 4.0-5.2, y 3.4-4.6 as the reason the path comes from above. Three markers: `t_ratio` 0.1 (marker y about 6.8, roller about 4.5, piece goes in 4.37), 0.15 (roller 4.21, catches at 4.25), 0.2 (roller 3.8, piece already under the bumper, missed).
- Why: "placing a marker is arithmetic" is easier from where each marker's delay ends up on the leg.
- Made from: **measured** (Lesson 25, Lessons 24-27 block: marker 0.1/0.15/0.2 runs); field outline and hub from the Lesson 25 constants. Type (a) numbers drawn as a map.
- Text changes: after the marker-arithmetic paragraph "Figure 25.2 shows where the roller starts for three marker positions." **Text issue:** the text says y about 4.4 and then 4.37; make them agree.
- Linked from: none.

**Figure 25.3 — Pick Up: what happens while the robot drives** · high · (a) · batch 1 · `25-pick-up-timeline.png`
- Where: §8 "Run it", after the timing table ("Nothing waited for anything that didn't need it").
- Shows: x time from drive start (0-3.5 s). Top track robot y (7.4 → 1.0) with the 0.6 m "piece goes in" line at y about 4.4; below it `Superstructure/State` bands (IDLE → INTAKING 0.6 s → HANDOFF 1.7-1.8 s → HOLDING 2.9 s → SCORING 3.2 s → IDLE), then `Arm/AngleDegrees` (below horizontal at 1.4 s) and `Elevator/HeightMeters`. Vertical markers for the `intake` event, roller start, beam break, and the score request at 0.48 m left.
- Why: the point is overlap in time; a table lists events one after another, a stacked timeline shows the drive never slowing.
- Made from: **measured** (Lesson 25, Lessons 24-27 block, fresh launch on Blue 1: marker 0.6 s at y 6.69-6.70, arm below horizontal 1.40-1.42 s, roller 1.66-1.68 s, beam break 1.72-1.74 s, HOLDING 2.92-2.96 s, SCORING 3.20 s, path ends 3.44 s at (6.00, 1.02)). One run so plot and table agree.
- Text changes: after the table "Figure 25.3 puts the same events on a time axis"; keep the table (it has locations); move "The robot never slowed down." after the figure reference.
- Linked from: Lesson 26 for contrast; links back to Figure 24.2 (the same cycle in teleop).

### Lesson 26 — Getting there exactly

**Figure 26.1 — The line's frame and the two stages** · medium · (c) · batch 2 · `26-line-frame-stages.svg`
- Where: §5 "Driving along a line", after "rotate the other way."
- Shows: top-down. Start S, target T, the fixed line, the handoff point 1.0 m short of T (`kHandoffDistance`), the robot off to the left of the line with its offset split into "along" (x′) and "off the line" (y′, positive left), the two velocity components and the −y′ P push. Stage one "Travel Toward (3 m/s, 4 m/s²) goal: handoff point, still moving at 1.2 m/s"; stage two "Approach (≤ 1.2 m/s, 1.5 m/s²) goal: T, stopped, facing 90°".
- Why: the lesson ends "draw the line, draw the robot off to one side, and rotate the paper"; frame rotation is the hardest part of §5.
- Made from: `kTravelSpeed`/`kTravelAccel`, `kHandoffDistance`, `kHandoffSpeed`, `kApproachAccel`, the (1,1) → (5,4) example (line 5 m long).
- Text changes: "Figure 26.1 draws it." Keep or trim the closing "draw the line... rotate the paper" with a pointer.
- Linked from: none (reuses the frame idea of Figure 17.1 if that is built).

**Figure 26.2 — Speed during the two-stage drive against the old sketch** · high · (a) · batch 1 · `26-two-stage-speed.png`
- Where: §11 "Run it", after the comparison table ("The time barely changed.").
- Shows: x time, y speed along the line. Plan speed (`m_alongController.getSetpoint().velocity`) and measured speed for the two-stage design; handoff at 1.78 s (about 1.45 m/s), top speed 3.24-3.26 m/s, arrival 3.36-3.38 s. A ghost line for the old sketch (P to 5 cm, then three PIDs), launching at the grip limit and reaching the handover at 0.08 m/s. Optional third panel: acceleration (old 11.8 m/s² launch against the new roughly 4 m/s² mean, the 0.3 m/s plan-to-real gap).
- Why: the claims are all about a curve; the table gives endpoints.
- Made from: **measured** (Lesson 26, Lessons 24-27 block, the Lesson 26 bullet and the "drive lag figures were derived" correction: LOOP, (1,1,0°) → (5,4,90°), tick-scripted, accelerations from `getSimulatedPose` at dt 0.02; old design rebuilt from `a2b3576`, 3.46-3.48 s, 0.08 m/s). One run each; plan speed read by reflection. Use 3.37 s and 1.45 m/s to match the table.
- Text changes: before "Two other runs worth doing yourself" "Figure 26.2 plots both designs on one set of axes." Do not annotate "about 1.4 m/s² on average" (undefined, CLAUDE.md). Caption: the student can't reproduce the plan-speed series.
- Linked from: Lesson 26 §3 (the jolt at a P handover) and Try It #1 and #2; match axes and colours with Lesson 27's tracking plots.

**Figure 26.3 — The path bows out while turning** · low · (a) · batch 3 · `26-bow-while-turning.png`
- Where: §11, in the "path bows out sideways" callout.
- Shows: top-down XY of the trip with and without the 90° turn; bow about 26 cm against 11 mm.
- Why: a callout with two numbers; a 26 cm bow is easy to picture if drawn. Low.
- Made from: **measured** (Lesson 26: bow 262-269 mm in 7 of 9 runs, 284 and 292 in two; no-turn 10-12 mm). LOOP, same trip with and without the turn.
- Text changes: "Figure 26.3 overlays both trips" in the callout; the cause is not established.
- Linked from: none.

### Lesson 27 — Keeping the nose on the target

**Figure 27.1 — Why a strafing robot has to spin: the bearing rate** · medium · (c) · batch 2 · `27-bearing-rate.svg`
- Where: §5 "Tell it what's coming", after "Do it twice as far away and it swings half as fast."
- Shows: top-down. Tag 20 at (5.229, 4.035), robot 3 m away with a velocity arrow split into a component along the line to the tag (no swing) and a component across it (v⊥). The bearing line sweeping a small angle; labels ω = v⊥ ÷ r with r = 3 m, v⊥ = 3 m/s → 1.0 rad/s. Second panel: 6 m, 0.5 rad/s. The formula `(vx·offsetY − vy·offsetX) ÷ distance²` tied to the picture.
- Why: the cross-product sentence is the hardest in the lesson; it also sets up §4's "1.0 rad/s" arithmetic.
- Made from: the lesson's numbers (3 m, 3 m/s, `kAimP` = 4). No measurement.
- Text changes: before "That's the cross product..." add "Figure 27.1 shows the split: only the sideways part of your velocity turns the bearing." **Flow:** §4 does the 1.0 rad/s arithmetic before §5 introduces the figure; add a one-line pointer in §4 or move the figure up into §4 (then it is still 27.1 and the plot stays 27.2).
- Linked from: Lesson 25 §6 is earlier, so no link; Lesson 28 §6 ("a bearing rate in Lesson 27").

**Figure 27.2 — Aim error on a 3 m orbit: P only against P plus feedforward** · high · (a) · batch 1 · `27-orbit-aim-error.png`
- Where: §5, after the P-only versus P+feedforward table ("Over a hundred times better at 3 m/s...").
- Shows: x time over the 9 s orbit, y `Aim/ErrorDegrees`. P only (shelf at about 14.6°) and P + feedforward (about 0.1°); dashed line at the predicted 14.32° (`1.0 ÷ kAimP`). Optional second panel at 2 m/s (9.7° against 0.1°). Optional faint truth-heading trace (13.5°) only if the caption explains it.
- Why: the table gives two settled numbers; the plot shows the curve arriving at a flat offset ("chases from a fixed distance behind") and feedforward hugging zero.
- Made from: **measured** (Lesson 27, Lessons 24-27 block, "Lesson 27 (orbit 6 runs per configuration)": LOOP-style orbit of tag 20 at 3 m, tangent speed plus radial P 2.0). 4 of 12 alpha-8 feedforward runs spiked to 0.19-1.19°, so pick a clean one and say so in the caption.
- Text changes: after the table "Figure 27.2 shows both runs on one axis: the P-only error climbs to a shelf and stays there; the feedforward run never leaves zero." The spike caveat already follows.
- Linked from: Lesson 28 §6 ("The third time this course has said it..."); same story as Figure 18.2 ("P corrects, doesn't sustain").

### Lesson 28 — A wheel that holds a speed

**Figure 28.1 — The speedometer: needle angle against speed** · medium · (c) · batch 2 · `28-dial-needle.svg`
- Where: §5 "A picture of a number", after "Shooting speed lands at about 60% of full scale".
- Shows: dial circle 2 m across, hub at centre, 0.8 m needle. Needle at 0 rot/s (−90°, straight down), 30 (idle), 60 (about 59.4%, upper left, −198°), 101.08 (−270°, straight up) and −50% (0°, pointing right). Formula `angle = −90° − 180° × (speed ÷ free speed)`. A faint wrapped needle with a "clamp stops it here" mark.
- Why: the text walks the needle round the dial in prose.
- Made from: `FlywheelConstants` (`kDialSize`, `kNeedleLength`, `kZeroAngle`, `kFullSweep`, `kFreeSpeed` 101.08). At 60 rot/s goal −198.0°, speed −198.78° (Lesson 28 notes).
- Text changes: after the formula "Figure 28.1 marks the needle at rest, at idle, at shooting speed and at full scale."
- Linked from: Lesson 28 §9 ("Open the dial in SimGUI"); links back to Figure 19.1 ("drawing a number").

**Figure 28.2 — Holding 60 rot/s with and without the model** · high · (a) · batch 1 · `28-hold-with-without-model.png`
- Where: §6 "What `kV` is actually worth", after "Notice this is a *fixed point*, not a lag."
- Shows: x 0-5 s, y flywheel speed. The goal (60); the full model (settles at 60.47); `kV` and `kA` zeroed (settles at 43.40); dashed line at the predicted 42.96. Optional second panel: applied volts for the full model (7.14 V).
- Why: "settles around 43 rot/s and stays there" reads as a number; the plot shows a low flat curve beside one that reaches the line, and gives the 0.44 rot/s gap a place.
- Made from: **measured** (Lesson 28, Lessons 28-32 block: RIG, five runs; zeroed gains 43.400 in all seven runs, the model 60.468 rot/s on 7.141 V). Two curves from separate JVMs; say in the caption whether they start from rest or from idle.
- Text changes: after the arithmetic block "Figure 28.2 puts the two runs side by side."
- Linked from: Lesson 33 §7 (the `kV` plateau check); sibling of Figures 18.2 and 27.2.

**Figure 28.3 — Spin-up to 60 rot/s from four idle speeds** · high · (a) · batch 1 · `28-spin-up-from-idle.png`
- Where: §7 "Recovery is the number that matters", after the idle-speed table.
- Shows: x time since the request, y speed, the `AtSpeed` band (within 1.5 rot/s of 60) shaded. Four curves from 0, 15, 30 and 45 rot/s, each marked where it enters the band (2.26 / 1.72 / 1.22 / 0.70 s). Second panel: applied volts for the 30 rot/s start (jump to about 6.8 V, peak 9.05 V at tick 45, settle 7.14 V).
- Why: the table is four times; the curves show *why* an idle wheel helps (it starts partway up the same curve), and the volts panel is the "about 7 V, towards 9 V" the Run-it section describes.
- Made from: **measured** (Lesson 28, Lessons 28-32 block: RIG, five runs, 2.26 / 1.72 / 1.22 / 0.70 s; volts from the LOOP left-trigger run: 3.59 → 6.79-6.81 V, peak 9.05 V at tick 45, 7.141 V settled).
- Text changes: "Figure 28.3 shows why: the idle wheel starts partway up the same climb." Keep the table (the cited reference) or fold it into the caption; the curves add the shape. §9: "compare your `Flywheel/AppliedVolts` with Figure 28.3's lower panel."
- Linked from: Lesson 29 §2 (the first 1.2 s of this spin-up); Lesson 30 §10.

### Lesson 29 — One battery, everything on it

No figure for §2's stator and supply table (four rows, arithmetic in the text) or the motor-count table (its 9 and 12 rows are ranges). A duty-cycle diagram would be (c) low; skipped.

**Figure 29.1 — Fresh battery: current and rail voltage, one run per configuration** · medium · (a) · batch 2 · `29-fresh-battery-runs.png`
- Where: §7 "Watch one happen", after "With the budget from section 4, the total draw peaks at 61-110 A...".
- Shows: two stacked panels sharing time: `Power/TotalCurrentAmps` and `Power/BatteryVolts`. One typical run each for no limits (peak near 200 A), Phoenix defaults, the budget (near 80 A). Dashed 6.3 V (`kBrownoutVoltage`) on the voltage panel.
- Why: "even unlimited, a fresh battery doesn't brown out": the dip, its distance from 6.3 V, and the same moves with very different peaks.
- Made from: **measured** (Lesson 29, Lessons 28-32 block, fresh battery: LOOP, Back / D-pad up / left trigger + left face button; `Power/*` from the `akit_` log). Pick runs near the middle of each range; caption "one run each".
- Text changes: after the table "Figure 29.1 shows one run of each: the moves are identical, only the limits differ."
- Linked from: Lesson 30 §10 (normal sag).

**Figure 29.2 — A tired battery: the budget and no limits through the same moves** · high · (a) · batch 1 · `29-tired-battery-brownout.png`
- Where: §7, after "Run the same three configurations again..." and the tired-battery table, before "With no limits the robot browns out about a third of a second after you enable it".
- Shows: same stacked panels, battery 11 V with 40 mΩ. No limits (collapse to 0 V about 0.3 s after enable, flywheel falling away) and the budget (dips, stays above). Dashed 6.3 V and a matching 117.5 A line on the current panel. Optionally a defaults run that browned out (4 of 30).
- Why: the lesson's headline event is described only in numbers; the 117.5 A arithmetic becomes one line the current crosses; a brownout is an instant, not a trend.
- Made from: **measured** (Lesson 29, Lessons 28-32 block, tired battery: `calculateLoadedBatteryVoltage(11.0, 0.04, total)`; no limits 10 of 10 browned out, 8 collapsed to 0.00 V; budget typical). Choose a collapsed no-limits run and a typical budget run; caption "one run each, the table gives the thirty-run counts".
- Text changes: after "A brownout here means the total draw reached 117.5 A on a single tick, and nothing more." add "Figure 29.2 shows the line." The caption must not imply the budget never browns out ("a typical run").
- Linked from: Lesson 30 §1 and §10.

### Lesson 30 — The robot tells you what's wrong

**Figure 30.1 — SimGUI: the Alerts panel** · high · (b) · batch 1 · `30-simgui-alerts-panel.png`
- Where: §6 "Alerts that belong to a subsystem", after "In SimGUI, open **NetworkTables → AdvantageKit → RealOutputs → Alerts**."
- Shows: the menu opened to AdvantageKit → RealOutputs → Alerts and the panel it draws, "Elevator has never been homed" with the yellow warning mark. Optional inset: **DS → Alerts** (hidden by default; §4 mentions it).
- Why: a nested menu path to a panel; §4 promises "you'll open the panel then".
- Made from: Xvfb recipe (Lesson 30 notes), Lesson 30 state: open the NetworkTables menu and expand to Alerts (capture 1), tick Alerts so the panel draws (capture 2), optionally open DS → Alerts. Crop to menu and panel. Skip the boot-flicker shot (timing-dependent).
- Text changes: "Figure 30.1 shows where it is." Keep the path text for phone readers.
- Linked from: Lesson 30 §8 and §10 (same panel). Same menu tree as Figure 15.3.

**Figure 30.2 — SimGUI: the Unplug Gyro switch in Other Devices** · medium · (b) · batch 2 · `30-simgui-unplug-gyro.png`
- Where: §7 "The gyro, and a plug you can pull", after "In the **Other Devices** window, scroll past Phoenix's motors to **Unplug Gyro** and expand it."
- Shows: Other Devices with Unplug Gyro expanded, its **Unplugged** false/true drop-down set to true, and the alerts panel beside it with `Gyro is not on the CAN bus` and the red mark.
- Why: the drop-down isn't a checkbox and the window is crowded with Phoenix devices.
- Made from: Xvfb SimGUI on the Lesson 30 state (INPUT boolean drawn as a drop-down, Lesson 30 notes); set Unplugged true with `xdotool`, capture both windows.
- Text changes: "Figure 30.2 shows what you're looking for."
- Linked from: Lesson 30 §8 and §9 (CANcoder and camera switches); Try It #1.

**Figure 30.3 — Why the low-battery alert only looks while disabled** · medium · (a) · batch 2 · `30-low-battery-gate.png`
- Where: §10 "The alert nothing owns", after "Without that half, the alert would go off both times."
- Shows: x time through an enable then a shooting spin-up, y `Power/BatteryVolts`, the 11.5 V `kLowBatteryVoltage` line, the dips below it (0.68 s to about 11.27 V on enable, 1.54 s to about 11.19 V on a shot) shaded, a disabled/enabled marker.
- Why: two short dips justify a one-line gate; seeing them cross the line shows why it's needed.
- Made from: **measured** (Lesson 30, Lessons 28-32 block: LOOP fresh battery, five runs: 34 ticks / 11.26-11.27 V on enable, 77-78 ticks / 11.18-11.19 V on a shot). Run without the gating, read `Power/BatteryVolts`.
- Text changes: "Figure 30.3 shows where the voltage goes when you enable the robot and when you shoot."
- Linked from: none.

### Lesson 31 — Tests that catch what a plot won't

**Figure 31.1 — Two clocks: the model steps, the firmware runs on the wall** · medium · (c) · batch 2 · `31-two-clocks.svg`
- Where: §6 "The real-time trap", after "The mechanism: the physics model advances a fixed 20 ms of simulated time every time you step it".
- Shows: two parallel timelines, "physics model" (a fixed 20 ms per call) and "Phoenix firmware" (wall clock). Left: `Thread.sleep(20)`, ticks line up. Right: sleep(0), many model steps inside one wall-clock tick, the model far ahead, label "−0.34 m".
- Why: the failure only makes sense with two clocks drifting apart.
- Made from: the mechanism as stated; labels from the Lessons 28-32 block, Lesson 31 (20 ms 0.0090 m, 4 ms 0.0075-0.0094 m, 0 ms −0.34 m in 7 of 8). No new measurement.
- Text changes: "Figure 31.1 draws the two clocks." The sentence "on a real robot that's impossible" can point at it.
- Linked from: none.

**Figure 31.2 — Homing test height with and without the sleep** · medium · (a) · batch 3 · `31-homing-test-height.png`
- Where: §6, after the sleep table.
- Shows: x test tick, y carriage height. Three traces: 20 ms (settles at 0.0090 m), 0 ms failing (falls to about −0.34 m), 0 ms passing (0.0094 m); tolerance band around 0.01 m.
- Why: the table gives final heights only; the plot shows the failing run diverging from the start and the intermittent pass. **Restates the table** (the proposer ranks it below 31.1), so batch 3: make it the exhibit and trim the table, or drop it.
- Made from: **measured** (Lesson 31, Lessons 28-32 block: the lesson's `ElevatorHomingTest`, sleep varied, fresh JVM, eight runs per setting). A JUnit probe copied into the sandbox (`verify-lessons-v3.sh` deletes probes); log height each tick.
- Text changes: as above.
- Linked from: Figure 21.1 is earlier, so no link back; none.

### Lesson 32 — Reading a match log

The plots below imitate AdvantageScope's line graph. If the user wants real screenshots instead, each becomes type (d) with the same content (section 8).

**Figure 32.1 — The height arrives; `AtGoal` never says so** · high · (a) · batch 1 · `32-at-goal-never-true.png`
- Where: §5 "Reading the traces together", after "Watch them converge — the height climbs, slows, and settles in against the goal".
- Shows: panel 1 `GoalMeters` (step to 0.75 m) and `HeightMeters` on one axis (a clean arrival); panel 2 `RealOutputs/Elevator/AtGoal`, flat false; panel 3 (zoomed) height error in mm settling at −0.15 to −0.19 mm, tolerance `Centimeters.of(0.00002)` too small to see, noted "tolerance = 0.2 µm".
- Why: "the disagreement is the entire diagnosis"; §6 asks for subtraction by eye. Shows why the bug survives a bench test.
- Made from: **measured** (Lesson 32, Lessons 28-32 block: RIG, real `Elevator` homed at 20 ms; error 0.1549 or 0.1939 mm short, overshoot 1.21-1.25 mm), `kTolerance = Centimeters.of(0.00002)`; or from an `akit_` log of the real `Robot` loop (Back, D-pad right twice).
- Text changes: "Figure 32.1 shows the three traces the way you'd stack them in AdvantageScope." **Flow:** panel 3's data is `Elevator/HeightErrorMeters`, which §7 adds: label panel 3 "height minus goal (you compute this by hand now; §7 logs it)" or drop it and put 0.15-0.19 mm in the caption.
- Linked from: links back to Figure 18.2 (§4-5 "finding the tick where a goal changed").

**Figure 32.2 — The same match through the fixed code** · high · (a) · batch 1 · `32-replay-fixed-code.png`
- Where: §6, after "**This is the payoff.**" (the `RealOutputs` / `ReplayOutputs` comparison paragraph).
- Shows: `GoalMeters` stepping, `RealOutputs/Elevator/AtGoal` (false throughout), `ReplayOutputs/Elevator/AtGoal` (true from 1.26 s with a one- or two-tick dropout during the overshoot); a shaded 1.2 mm overshoot marker and "same inputs, one constant changed".
- Why: "the exact same session, a different decision" is the idea of replay.
- Made from: **measured** (Lesson 32, Lessons 28-32 block, replay: two recordings, two steps each; replay true 1.20 s after each step, false one tick, true for good from 1.26 s; peak over goal 1.13-1.17 mm).
- Text changes: "Figure 32.2 is what you should see in the `_sim` file." Keep the numbers.
- Linked from: Lesson 13's replay section is earlier, so Figure 32.2 links back to [Figure 13.2](13-io-replay.md#figure-13-2).

**Figure 32.3 — Aim While Driving: heading with the right tag and with the typo** · medium · (a) · batch 2 · `32-aim-typo-heading.png`
- Where: §8 "A second example, faster", after the table of `kAimTagId = 20` against `220`.
- Shows: x time since the drive started; y heading (`Localizer/Pose` rotation). Tag 20 (to about −124° by `release`) and tag 220 (flat 0.0°); a shaded span for `FollowPath/rotationOverrideActive` (0.58 s to about 4.2 s); a strip showing `Aim/ErrorDegrees` present for tag 20 and absent for tag 220.
- Why: "override on, nobody turning, and a trace that is missing"; absence is hard to read from a table.
- Made from: **measured** (Lesson 32, Lessons 28-32 block: tag 20 on 0.58 s, off 4.24 s, heading −124.3 / −124.4°; tag 220 on 0.58 s, off 4.22 s, `outputOmega` 0.000, heading 0.0°).
- Text changes: "Figure 32.3 shows both runs." The table can stay.
- Linked from: none.

### Lesson 33 — Tuning your robot when build team hands it over

**Figure 33.1 — What the four tests look like: voltage and speed** · high · (a) · batch 1 · `33-sysid-four-tests.png`
- Where: §6 "Run it, and read what happened", after "Hold **Back + the top face button** for a few seconds — the applied voltage climbs steadily" and the dynamic-test instruction (or after the "wheel doesn't start from rest" callout).
- Shows: two panels from the real `SysIdRoutine` at `Config.defaults()`, voltage on one axis and `velocity-flywheel-flywheel` on the other. Quasistatic forward: the 1 V/s ramp, speed coasting 30 → about 13 rot/s at 1.56 s (1.53 V) then climbing, "ignore this part" shaded. Dynamic forward: the 7 V step and plateau at 59.3 rot/s with within-5% and within-1% marks at 2.2 s and 3.64 s. The reverse tests in a thinner row (turn-around 6.8 s).
- Why: §4 and §6 describe the shapes in prose; the student is told to "look at the velocity plot before you trust a fit".
- Made from: **measured** (Lesson 33, batch 3 and "§6-§7 rewritten" blocks: LOOP, three runs, `Config.defaults()`, from `WPILIB_*.wpilog`; dip to 13.1 rot/s at 1.56 s, back at 30.4 at 4.50 s; plateau 59.271-59.277 rot/s, 8.468 rot/s per volt). Press the buttons 3.5 s after enable.
- Text changes: after the callout "Figure 33.1 shows the two tests you just ran." §7's "the last `velocity-flywheel-flywheel` values" points at the plateau.
- Linked from: Lesson 28 §9 is earlier, so none; keep separate from Figure 28.3 (a different start).

**Figure 33.2 — `kS` check: 0.05 V and the wheel still turns** · low · (a) · batch 3 · `33-ks-hold-005v.png`
- Where: §7 "kS: a voltage that small has to leave the wheel still", after "Run the robot in simulation, select **RobotUtility**, enable it, and hold the **right bumper** for ten seconds".
- Shows: speed against time over 10 s: idle 30 rot/s, 13.45 at 1 s, 4.66 at 2 s, 1.80 at 3 s, 0.561 at 5 s, flat 0.414 from 9 s; dotted line at the prediction 0.05 × 8.47 = 0.42.
- Why: the "still turning" point is the whole check; a list of readings can stand in. Low.
- Made from: **measured** (Lesson 33, "§6-§7 rewritten" block: LOOP `Hold33Probe`, three runs identical to the digit).
- Text changes: "Figure 33.2 shows the 10 s you're watching."
- Linked from: none.

**Figure 33.3 — Why a 1 V/s ramp isn't quasistatic: speed against voltage** · high · (a) · batch 1 · `33-ramp-vs-steady-state.png`
- Where: §7 "The runs themselves: did the ramp stay near steady state?", after "...a ramp that climbs a volt every second is always running ahead of it." Sits between that and "The 0.90 V is what you get without that term."
- Shows: x speed (rot/s), y commanded voltage. The steady-state line `V = 0.118 × speed`; the 1 V/s ramp data above it; the 0.25 V/s ramp much closer; the two-term ramp-only fit lines with intercepts 0.90 V (0.23 V at 0.25 V/s) against a true intercept of about 0; the 38 / 59 / 71 / 77 / 82% points as horizontal gaps at 1-5 V.
- Why: the hardest idea in the lesson: the "friction" voltage is the ramp's lag, so the intercept is fake.
- Made from: **measured** (Lesson 33, batch 3 and "§6-§7 rewritten" blocks: RIG, true standstill, real routine, three reps per ramp; percents 38.5 / 59.2 / 70.6 / 77.5 / 81.8 at 1 V/s and 77.0 / 88.4 / 92.2 / 94.2 / 95.4 at 0.25 V/s; steady 8.457-8.465 rot/s per volt; two-term fit kS 0.898-0.905 at 1 V/s, 0.234-0.235 at 0.25 V/s). Plot the trimmed ramp data (coast-down removed) and say so; the generator builds on `scratchpad/c33/toolform.py`, and the caption says "hand fit" as the text does.
- Text changes: "Figure 33.3 plots the ramp against the steady-state line." Keep "hand fit again, not the tool's."
- Linked from: Lesson 28 §8 is earlier, so none.

**Figure 33.4 — A ramp costs room: how far the elevator travels before the voltage is reached** · medium · (a) · batch 2 · `33-ramp-room-elevator.png`
- Where: §8 "A mechanism that can run out of room", after "Same widened rig, measuring how far the carriage travels before the ramp reaches 6 V:" and its three-line block.
- Shows: x commanded voltage (0-6 V), y distance travelled (m). Three curves (1.0, 0.5, 0.25 V/s) reaching 1.885 / 3.794 / 7.605 m at 6 V; a horizontal line at 1.5 m; marks at 0.44 m (3 V) and 1.04 m (4.5 V) on the 1 V/s curve (where the text says to let go). Optional second panel: the step-voltage block (1.08-1.10 / 0.62-0.63 / 0.30 m at 7 / 4 / 2 V over 1.5 s).
- Why: "halve the ramp rate and you double the distance" is easy to skim; the plot shows where the safe stopping voltage falls.
- Made from: **measured** (Lesson 33, batch 3 elevator rows: RIG, real routine, `ElevatorIOSim` widened to ±20 m, two reps agreeing). Raw probe lines read 1.888 / 3.795-3.797 / 7.608 (3 mm higher, not traced): draw from the same data the text uses and note it in the generator's comment. 0.437-0.438 m at 3 V and 1.036 m at 4.5 V from the 1 V/s two-rep run.
- Text changes: "Figure 33.4 draws the three runs against the elevator's 1.5 m."
- Linked from: Lesson 21 is earlier, so none.

### Lesson 34 — Going to get something you just saw (after Lesson 34's migration)

Everything here waits for the lesson's migration; take numbers from the migrated snapshot.

**Figure 34.1 — Two angles and a floor: how a detection becomes a point** · high · (c) · after migration · `34-detection-to-field.svg`
- Where: §4 "From two angles to a place on the field", after "That's a right-angled triangle, and the missing side is the distance."
- Shows: side view (camera at height `h`, tilted down, the piece of diameter 0.15 m with its centre 0.08 m up on the floor; pitch from the horizontal; the distance as the missing side) and top view (camera frame yaw, robot frame with the camera offset, field frame, `rotateBy` steps numbered). Sign conventions as arrows ("`PhotonUtils` pitch up, mounting transform pitch down").
- Why: the lesson's heart; minus signs, the negative-distance check and three frames cost an afternoon, and can't be pictured from code.
- Made from: `VisionConstants` (`kGamePieceDiameter`, `kGamePieceHeight`, `kRobotToObjectCamera`) and `kSimGamePiecePositions`, from the migrated snapshot, not the prose.
- Text changes: "Figure 34.1 draws the triangle and the three frames." The "minus signs" paragraph points at the arrows.
- Linked from: this figure links back to Figure 15.1 (the camera mount) and Figure 19.1 ("the same nesting Lesson 19's mechanism drawing used").

**Figure 34.2 — Why `HasTarget` flickers: a 20 fps camera on a 50 Hz loop** · medium · (c) · after migration · `34-hastarget-flicker.svg`
- Where: §7 "What 'seeing it' actually means, tick to tick", after "It's `true` on roughly two ticks out of every five".
- Shows: a timing strip, 50 ticks per second as short marks, camera frames at 20 per second as taller marks, ticks on a new frame highlighted, repeating every 5 ticks (2 true, 3 false), and a marker "you press the button here: the snapshot is built from this tick's `bestPiece()`".
- Why: "two ticks out of every five" is easy to state and easy to picture wrongly; shows why a one-time decision is exposed.
- Made from: the camera at `setFPS(20)`, the scheduler at 50 Hz. Check against `ObjectDetection/HasTarget` after migration.
- Text changes: "Figure 34.2 draws the pattern."
- Linked from: none.

### Debugger aside (`aside-debugger.md`)

**Figure D.1 — The debugger window: where everything is** · high · (d) · needs the user · `aside-debugger-window-layout.png`
- Where: §2 "Breakpoints, stepping, and watches", after "That's a lot of panels at once — don't try to memorize them."
- Shows: labelled VS Code screenshot at a paused breakpoint: gutter and red dot, highlighted current line, Variables, Watch and Call Stack panels, the debug toolbar (Continue, Step Over, Step Into, Step Out, Stop) with keys.
- Why: eight things in a bullet list the text says not to memorize; the textbook case for a screenshot.
- Made from: the user supplies it, paused at the `double error = …` line in `SwerveModule.steerToAngle` (Lesson 5 or 7). The aside says it hasn't verified the WPILib launch configs recognize a 2027-alpha OpMode project, so `F5` may need to work first. Annotate with arrows and numbers afterwards.
- Text changes: before the bullets "Figure D.1 labels each one."
- Linked from: none (an aside).

**Figure D.2 — A stack trace, annotated: two passes** · medium · (c) · batch 2 · `aside-debugger-stack-trace.svg`
- Where: §4 "Reading a stack trace", after the five-line trace and "Read it in two passes."
- Shows: the trace in a monospaced block with a coloured margin. First line marked pass one ("what"), library frames greyed, the first `first.robot.*` frame marked pass two ("where"), the `=== Command Binding Trace ===` line as a divider: above "where it broke", below "which binding scheduled it".
- Why: the track-specific part of the aside; the divider is explained only in prose.
- Made from: the trace printed in the lesson (with the relabelled bottom two frames), drawn as SVG text. No simulation.
- Text changes: "Figure D.2 marks the two passes on the trace." The caption repeats that the bottom two frames are relabelled.
- Linked from: Lesson 0 or Lesson 1, where a student first hits an exception, if the plan calls for it.

### Git-branching aside (`aside-git-branching.md`)

The aside already has real `git log --graph` captures of the finished states; these show the *before* and how labels move. All hashes come from those captures.

**Figure G.1 — A branch is a label on a commit** · high · (c) · batch 1 · `aside-git-branch-label.svg`
- Where: §1 "What a branch actually is", after "That's the entire mechanism." (or after "So creating a branch is not copying your project.")
- Shows: a chain of commits (hashes from the captures, e.g. `6af60ff`, `3cf14a0`), two states. Left: `main` and `lesson-01` as two labels on one commit, `HEAD` at `lesson-01`. Right: after one commit, `lesson-01` moved forward, `main` stayed.
- Why: the sticky-note model is the foundation; the "wrong picture" callout (a branch is a copy in a folder) needs the right picture beside it.
- Made from: hashes in §2 and §3 (`3cf14a0..79bf90a` for the first merge). No measurement.
- Text changes: "Figure G.1 draws it." Keep the sticky-note wording.
- Linked from: §2 and §3 (the fast-forward is the label sliding along).

**Figure G.2 — Fast-forward, and the diamond** · medium · (c) · batch 2 · `aside-git-fast-forward-diamond.svg`
- Where: §4 "Two lessons at once", after "Say both branched from `main` after Lesson 17." (before the diamond graph).
- Shows: three small diagrams: branches from the same commit; the first merge, a fast-forward (the `main` label slides); the second merge with a merge commit joining the two lines, labelled with `6af60ff`, `d79e9ea`, `cd93da0`, `50c8826`.
- Why: §3 shows fast-forward in text and §4's diamond is a text graph after the fact; shows why the second merge needs a new commit, setting up the conflict.
- Made from: hashes in §3-§4. No measurement.
- Text changes: "Figure G.2 shows the branches before you merge them." Lets §4 cut some prose.
- Linked from: §5 and §6 ("the diamond from §4").

**Figure G.3 — Rebase: replaying commits onto a new base** · high · (c) · batch 1 · `aside-git-rebase.svg`
- Where: §6 "When `merge` isn't what you want: `rebase`", after "**`git rebase` does it the other way round…**" (the bold paragraph).
- Shows: before: `main` has a teammate's new commit; `lesson-21` branches from the old base with its own commit. After: the `lesson-21` commit replayed on the tip of `main` as a new commit; the old one dashed and labelled `5adaa87`, the new `c7a003a`. A third mini-panel: what `merge` would have done (a merge commit).
- Why: rebase is the hardest idea; the picture shows the commits being copied, which is why the hash changes and why never-rebase-shared-history exists.
- Made from: hashes in §6's captures (`5adaa87`, `c7a003a`, `15f7610`, `5a9421b`). No measurement.
- Text changes: "Figure G.3 shows what happens to your commit." The later "Notice the commit hash changed" can say "dashed in Figure G.3".
- Linked from: §6's "Never rebase commits you've already pushed" callout.

## 4. Cross-lesson link map

Back-references to add, a figure then the lessons that link to it. Always from a later lesson to an earlier figure; add each link in the same commit as the later of the two figures' lessons only if the target figure already exists (never name a figure that doesn't exist yet).

| Figure | Linked from |
|---|---|
| S.1 | Git-branching aside opening |
| 0.1 | L1 §6 |
| 0.2 | L1 §7, L4 §5, L17 (Figure 17.3 sits beside it), L19 and L30 ("same panels") |
| 1.1 | L2 §5, L7 §6, L19, L30 |
| 1.2 | L3 §6, Figure 11.1 (the menu) |
| 3.1 | L4 §5, L5 §5, L7 §7 |
| 4.1 | L5 §2, L6 §2, L8 §5, L16, L29 |
| 4.2 | L5 §2, L6 §2 |
| 5.1 | L6 Try It #2, L8 §3, L17 §4 |
| 5.2 | L7 §7, L8 §6, L12 |
| 5.3 | L7 §2, L8 §3 and Try It #1, L10 (`inputModulus`), L12 (`ContinuousWrap`) |
| 6.1 | L5 §4, L8 §3, L9 |
| 6.2 | L7 Try It #3, L9 |
| 7.1 | L8 §1, L9 §5, L10 (10.1 and 10.3), L11, any Swerve-tab text |
| 7.2 | L8 §6, L10, L11, L12, L16 |
| 7.3 | L8 §6, L12 |
| 8.1 | L10, L12 |
| 8.2 | L11 |
| 9.1 | L10 §5 |
| 9.2 | L17 Try It #4, L25 |
| 10.3 | L11 §1, §4, §6, L17 §8, Figure 17.4 |
| 11.1 | L14 §5, L15 §10, L16 §7, L17 §10, L19, L25, L26 |
| 12.2 | L13 §4 |
| 12.3 | L18 §3, L28 §3 |
| 13.1 | L14 §2, L15 §6, L16 §4, L18 §5, L20, L21, L22, L28; Figures 15.2 and 16.2 reuse its boxes |
| 13.2 | L15 Try It #5, L16 §7, L17 Try It #7, L29, L32 §1 and §6, L33 |
| 13.3 | L14 Try It #1 |
| 14.1 | L15 §1 and §10, L16 §7, L17 §1 |
| 14.2 | L15 §10, L16 §7 |
| 15.1 | L27, L30, Figure 34.1 |
| 15.2 | L16 §7, L30 |
| 15.3 | L16, L18-L30 wherever "NetworkTables → AdvantageKit" appears; Figures 19.2 and 30.1 |
| 15.4 | L16 §6 and §7 (batch 2) |
| 16.1 | L17 §10, L21 (Figure 21.1), L26, L27 |
| 16.2 | L25, L26 |
| 16.3 | L26 §1, L10 (max speed) if relevant |
| 17.1 | L26 §5 (batch 3; only if built) |
| 17.2 | L26 (batch 2) |
| 17.3 | L24 §10, L25, L26, L27, L33 |
| 17.4 | L25 §5, L26 §1, L27 |
| 17.5 | L25 §9, Try It #3 in L17 |
| 18.2 | L20 §9, L27 §4, L32 §4-5, L33 §8 |
| 19.1 | L20 §7, Figure 28.1, Figure 34.1 |
| 19.2 | L20 §9, L28 |
| 20.1 | L21 §9, L24 |
| 21.1 | L21 §4, L23 §5, L24 §1, L31 §5, L33 §8 |
| 22.1 | L25 §4 |
| 23.1 | L24 §9, L25 §1 |
| 24.1 | L25 §3 and §5, L30, L31 §5 |
| 24.2 | L25 (Figure 25.3), L29 |
| 25.3 | L26 (contrast); links back to 24.2 |
| 26.2 | L26 §3 (jolt), Try It #1 and #2; L27 plots match its axes |
| 27.1 | L28 §6 |
| 27.2 | L28 §6 |
| 28.1 | L28 §9 |
| 28.2 | L33 §7 |
| 28.3 | L29 §2, L30 §10 |
| 29.1 | L30 §10 |
| 29.2 | L30 §1 and §10 |
| 30.1 | L30 §8 and §10 |
| 30.2 | L30 §8 and §9, Try It #1 |
| 32.2 | links back to Figure 13.2 |
| 33.1 | L33 §7 |
| 34.1 | links back to Figures 15.1 and 19.1 |
| D.2 | L0 or L1 (first exception), if wanted |
| G.1 | §2, §3 of the git aside |
| G.2 | §5, §6 of the git aside |
| G.3 | §6 callout of the git aside |

Order of drawing: 7.1 before 10.1 and 10.3 (axes and corner layout); 10.3 before 11.x and 17.4; 13.1 before 15.2 and 16.2; 15.3 before 19.2 and 30.1 (same menu tree).

## 5. Merges and drops

**Merges** (the same thing proposed twice, or two proposals pointing at one picture):
- **Lesson 7's robot-frame and corner-order diagram** is Figure 7.1, the home for the frame; the Lesson 9-17 proposer's cross-note asked for it. Figures 10.1 and 10.3 stay (a vector sum, a field-frame contrast) but reuse its axes and corner layout and link back; Lesson 8's yaw sign links to it.
- **Lesson 17 Try It #6, "blue and red start poses"** is folded into Figure 17.4 as an optional drawn right panel (the proposer suggested it); no separate figure.
- **The record/replay pipeline.** The Lesson 27-34 proposer asked Lesson 13 for a pipeline diagram that Lesson 32 would link to. That is Figure 13.2; Lesson 32 does not draw its own. Figure 32.2 (a plot of a replay result) stays and links back to it.
- **The camera-mount diagram.** The Lesson 27-34 proposer asked whether Lesson 15 has one. It does (Figure 15.1); Figure 34.1 links to it and keeps its own side view for pitch and distance.
- **The height / setpoint / goal plot** the Lesson 27-34 proposer wanted in Lesson 18 is Figure 18.2 (and matches the example name in CLAUDE.md). Lesson 20's separate "arm lag with and without kV" plot is dropped for a link to it (below).
- **The homing-snap picture** wanted by Lessons 31 and 33 is Figure 21.1.
- **AdvantageScope screenshots in Lessons 13 and 16** (both low) are merged into the plots Figure 13.3 and Figure 16.1, which show the same thing without the user.
- **Not merged, on purpose:** Figure 17.3 (DS window: Alliance Station and Autonomous) and Figure 0.2 (opmode selector and Robot State) show the same window but different facts; Figures 1.2, 11.1, 15.3, 19.2 and 30.1 are different NetworkTables menu paths. They link to each other and can share one SimGUI session.

**Drops** (not in any batch):
- Lesson 6 "rotor → gearbox → wheel → meters" (optional, low): the four-line `getDistanceMeters()` already reads as the diagram.
- Lesson 7 "`Drivetrain` owns the array" (optional, low): only if the user wants an architecture view; Lesson 13's IO diagram could extend it.
- Lesson 11 "a pose, and dead reckoning" (low, "weak; skip unless Figure 10.3 is dropped").
- Lesson 20 "arm lag with and without kV" (low): replaced by a link to Figure 18.2.
- Lesson 21 "homing from the top stall" (low, redundant with 21.1).
- Lesson 13 and Lesson 16 AdvantageScope screenshots (low, covered by 13.3 and 16.1).
- Lesson 33 SysId tool screenshot (optional, low): the tool has never been run here and menus drift.
- Lesson 15 "plot of the trust formula": the proposer's own "not proposed" (restates the formula).
- Lesson 19's AdvantageScope Mechanism-tab half: not a figure unless the user wants it.
- No figure for Lesson 2 (a deadband plot restates `applyDeadband`) or for Lesson 29's two tables; stated by the proposers.

**Direction fixes** (back-references in the proposals that pointed at a later lesson, flipped so no lesson forward-references): Figure 27.2 and 28.1 were to be linked from Lessons 18 and 19; instead Lesson 27 §4 links to 18.2 and 28.1 links to 19.1. Figure 32.1's link from Lesson 18 became a link back to 18.2. Figure 16.2's link from Lesson 15 was removed. Figure 16.1's link from Lesson 14 was removed.

**Renumbered by position** (the proposers' number → this plan's): 0.1 ↔ 0.2; 6.1 ↔ 6.2; 7.2 → 7.3 and 7.3 → 7.2; 9.1 ↔ 9.2; 10.2 → 10.3 and 10.3 → 10.2; 12.1 → 12.2, 12.2 → 12.3, 12.3 → 12.1; 16.1 → 16.3, 16.2 → 16.1, 16.3 → 16.2; 17.1 → 17.4, 17.2 → 17.5, 17.3 → 17.2, 17.4 → 17.1, 17.5 → 17.3; 18.1 ↔ 18.2; 25.1 → 25.3, 25.3 → 25.1; 26.1 ↔ 26.2. Asides: `git.k` → `G.k`, `debugger.k` → `D.k`.

## 6. Needs the user

None of these can be made in this container. Each is numbered in its lesson, so the lesson text names it only once the file exists.

| Figure | What to capture and how |
|---|---|
| 3.1 | AdvantageScope on the Lesson 3 or Lesson 4 state: connect to the sim, left sidebar open to `NetworkTables/Telemetry/DriveModule`, a Line Graph tab with `VelocityRotPerSec` on the left axis and `PositionRotations` on the right. Number the five-step recipe's steps 1-4 as callouts afterwards. Dark and light variants. |
| 7.2 | AdvantageScope, Swerve tab, Lesson 7 state: drag `NetworkTables/Telemetry/Drivetrain/ModuleStates` into the **States** slot, Max Speed 5. Two shots side by side: driving (arrows parallel) and the left bumper held (pinwheel). |
| 8.2 | The same Swerve tab on the Lesson 8 state: also drop `NetworkTables/Telemetry/Drivetrain/Heading` into the **Rotation** slot, after pressing the bottom face button so the chassis shows 90°. Optional; say if you'd rather not supply a second shot. |
| D.1 | VS Code with the project open, paused at a breakpoint on the `double error = …` line in `SwerveModule.steerToAngle` (Lesson 5 or 7): gutter dot, current-line highlight, Variables, Watch and Call Stack panels, the debug toolbar visible. The aside says the WPILib launch configs may not recognise a 2027-alpha OpMode project, so `F5` has to work first. |

The Lesson 32 plots (32.1-32.3) imitate AdvantageScope's line graph; see open question 2 for whether to use real screenshots instead.

## 7. New probes needed

Figures whose numbers CLAUDE.md does not record (the rest have measured summaries but still need the series captured from a run). Each is a RIG, BARE or LOOP run at the named lesson's state on alpha-8 with the committed constants, a fresh JVM per configuration, fixed 20 ms schedule, 2 s warm-up.

- **4.2** BARE, Lesson 4: `DCMotorSim` J = 0.001 and 0.05, `driveAtSpeed(0.3)` for 1 s then 0 (0.05 needs a longer window).
- **5.1 and 5.2** RIG, Lesson 5: 1:1 steering plant, J = 0.004, `kP = 0.0005`, one crawling gain, the first doubling that rings. How long the 1:1 plant takes is unmeasured; the text's "quick" and "gets moving" are checked here.
- **6.2** RIG, Lesson 6: `driveDistance(1.0, 0.4)`, J = 0.025, 6.75; overshoot in mm.
- **8.1** RIG, Lesson 8: `turnToHeading(90)`; heading and commanded `omega`; "well under a second", "no overshoot".
- **9.1** RIG, Lesson 9: `turnToHeading(90)` after `driveDistance`, with and without the `cos(error)` line; module 0 steer angle and drive throttle.
- **12.3** RIG, Lesson 12: one `SwerveModule`, step to 2 m/s at `kDriveKV` 0.8 and 0.4, applied voltage; check "settles low" with `kDriveKP` = 0.1.
- **14.2** LOOP, Lesson 14: five `camera.reportSighting` calls a second apart; the pull per press at default trust and at the trust knob.
- Series capture (numbers measured, raw data not saved) for the rest of the type (a) figures, scheduled together by lesson state: Lesson 7 (7.3), 13 (13.3 record/replay of three drives), 15 (15.4 per-tick, 60 s, with the `Random` camera), 16 (16.1 and 16.3: quarter stick, full-stick start, forward-reverse, vision on and off, full-stick ramp), 17 (17.2, 17.4, 17.5: Two Corners at 2 and 3 m/s, six runs; signals from the `WPILIB_` log), 18 (18.1, 18.2), 20 (20.2), 21 (21.1, needs the true height from `ElevatorSim`), 24-27 (24.2, 25.2, 25.3, 26.2 with plan speed read by reflection, 26.3, 27.2), 28 (28.2, 28.3), 29 (29.1, 29.2 from `akit_` logs), 30 (30.3), 31 (31.2), 32 (32.1-32.3), 33 (33.1-33.4; 33.3 builds on `scratchpad/c33/toolform.py`).
- Re-measure rule: Figures 4.2, 5.1, 5.2, 6.2, 7.3 and 8.1 sit on alpha-8's `getKrakenX60` change; re-measuring Lessons 4-8 means regenerating them.

## 8. Open questions

Settled in the main session (2026-11-18), as defaults the user can overrule:

- **Numbering gaps:** none; see the numbering policy in section 1.
- **Plot beside a table or instead of it (20.2, 31.2, 28.3):** keep every measured table; a plot goes beside one only where it shows something the table can't (a shape over time). 20.2 and 31.2 stay in batch 3.
- **A figure near a Try It (4.2, 15.4):** never put a figure before a Try It that shows its answer. Place it where the walkthrough itself states the behaviour, or after the exercise.
- **Placement in general (27.1 and others):** at the first point where the student needs it, decided when the figure is built; the plan's "Where" is a starting point.

Decided by the user (2026-11-18):

1. **Lesson 32's plots** are drawn here from the recorded logs, not AdvantageScope screenshots.
2. **Figure 8.2** stays on the "needs the user" list.
3. **A pilot first:** Lesson 18's goal / setpoint / height figure (working ID 18.2; built as Figure 18.1 while it's the lesson's only figure), for the user to judge the look, caption and text changes before the rest.
4. **Pilot review** ("overall good"): keep side explanations like the 7 cm one succinct; the graph prose should be fuller, so it's easier to see the point; understanding P and model-based control through graphs is important; **no cap of three figures per lesson** where more fill in detail; show the `kV = 0` difference in a height plot, and the `kP`-only graph (built as 18.1). Applied: 18.1 built, 18.2 redrawn, control figures 7.3, 8.1 and 12.3 raised to high and batch 1, 15.4 and 17.2 back to batch 2.

## 9. Batch 1 status (built 2026-11-18/19)

All 39 batch 1 figures are built, in their lessons, and committed; the site builds with every image, anchor and link resolving. Five Sonnet agents built them in lesson groups, with probe runs serialized on a shared `flock` (the robot program opens fixed network ports and the probes are timing-sensitive). Their reports' measurements are in CLAUDE.md ("Batch 1 found").

**Working ID → number in the lesson** (numbers go by position among the figures that exist, so building a batch 2 or 3 figure renumbers the ones after it): 0.2 → 0.1; 7.3 → 7.2; 10.3 → 10.2; 12.2 → 12.1; 12.3 → 12.2; 17.3 → 17.1; 17.4 → 17.2; 17.5 → 17.3; 25.3 → 25.1; 26.2 → 26.1; 27.2 → 27.1; 28.2 → 28.1; 28.3 → 28.2; 29.2 → 29.1; 33.3 → 33.2; G.3 → G.2. Every other batch 1 figure kept its working number.

**Done since (2026-11-19):**
- **Cross-lesson links:** 39 links from later lessons back to batch 1 figures, each woven into a sentence that already talks about the figure's subject; candidates with no such sentence were skipped. All `#figure-` links on the site resolve. Batch 2 figures get theirs when they're built.
- **Screenshots 1.1 and 30.1** retaken at SimGUI's 200% zoom as vertical stacks (900 and 870 px wide), legible at 390 px.
- **Open questions settled:** the Lesson 1/2 boot crash and the SimGUI wording are fixed; Lesson 5 keeps `kP = 0.0005` and teaches the ringing; Lesson 12 now says feedforward asks for `kV × request` at once, with the current limit holding the first tick or two lower.


## 10. Batch 2 status (in progress, 2026-11-19)

Built two agents at a time, in lesson groups, to stay inside the usage window.

- **Round 1 (built):** S.1, 0.1, 1.2, 4.2, 5.3, 6.1, 6.2, 9.1, 9.2. Every figure kept its working number except at Lesson 0: the new lifecycle diagram is 0.1, and the SimGUI screenshot (batch 1's 0.1) is now **0.2**, with its links from Lessons 1, 4, 17 and 33 repointed. Back-links added from Lessons 3, 6, 7, 8, 9, 10, 12 and 25.
- **Text fixes it found:**
  - Lesson 0 now says Disable runs `end()` then `close()` and a fresh opmode is built. This was measured; see CLAUDE.md's "Batch 2 found".
  - Lesson 6's recap no longer says "exactly 1.0".
  - Lesson 9 §5 describes what the module arrows show.
  - Lesson 25 credits `Command.parallel` to Lesson 9.
- Figure 0.1 is linked from Lesson 1 §6, rewritten on 2026-11-19 at the user's request.
- **Round 2 (built):** 11.1, 13.3, 14.2, 15.3, 15.4, 16.2, 16.3, 17.2.
  - Working ID 17.2 ("Can it stop in time?") is **Figure 17.1** in the lesson. Batch 1's 17.1–17.3 are now **17.2–17.4**, and their links from Lessons 25 and 26 follow.
  - The others kept their working numbers.
  - Back-links were added from Lessons 14, 15, 16 and 26.
- **Text fixes found in round 2:**
  - Lessons 1 and 15 now point to SimGUI's NetworkTables View window for plain values. The menu lists only widgets.
  - Lesson 15 Try It #3's drift range is now "15 to 50 cm".
  - Lesson 11 warns that the Robot State window can hide the robot.
  - Lesson 17 reports that one of six 3 m/s runs stopped short.
- **Round 3 (built):** 19.1, 19.2, 22.1, 23.1, 24.2, 25.2.
  - Working ID 25.2 is **Figure 25.1** in the lesson, and batch 1's Pick Up timeline (25.1) is now **25.2**. No other lesson linked to it.
  - Back-links were added from Lessons 20 and 25.
  - Lesson 25 §4 now gives the catch window, y 4.4 to 4.1, instead of a single deadline.
- **Round 4 (built):** 26.1, 27.1, 28.1, 29.1, 30.2, 30.3, 31.1.
  - Each of Lessons 26, 27 and 29 gains its new figure as N.1, and its batch 1 figure becomes N.2. Lesson 28's two become 28.2 and 28.3.
  - Lesson 30's link to the tired-battery plot follows it to 29.2, and Lesson 28's callout link follows the aim-error plot to 27.2.
  - Lessons 30 and 31 kept their numbers.
- **Round 5 (built):** 32.3, 33.4, D.2, G.2.
  - Working ID 33.4 is **Figure 33.3** (33.3 isn't built), and D.2 is **Figure D.1** (D.1 needs the user).
  - The git aside's new figure is G.2, and batch 1's rebase figure is now **G.3**.
- **Batch 2 is complete:** all 34 figures are built.
