# The claims registry

Every claim a lesson makes about how WPILib or a vendor library behaves is listed here, so that
when a library changes, a test can say which lessons are affected. The plan is
[docs/lesson-plan-v3-claims-tests.md](../../docs/lesson-plan-v3-claims-tests.md).

- `registry/<library>.toml`: claims about a library's API or behaviour, shared by many lessons
  (`wpilib`, `commandsv3`, `gradlerio`, `wpilib-tools`, `phoenix6`, `advantagekit`,
  `limelightlib`, `bline`).
- `registry/lesson-NN.toml`: numbers that Lesson NN quotes and that a library change could move.
- `check_claims.py`: checks the registry and the lessons' markers. It runs before every commit
  an agent makes (`tools/githooks/pre-commit`, turned on by `.claude/settings.json`).
  Tests: `python3 -m unittest tools.tests.test_check_claims`.
- `java/claims/*.java`: JUnit tests for claims, one file per library (`WpilibApiTest`,
  `CommandsV3ApiTest`, `Phoenix6ApiTest`). Each test's `@DisplayName` is the claim id it checks,
  and the claim's `test` field names the file. `run-java-tests.sh` builds the code after the
  cut-off lesson (every pinned vendordep installed) with `verify-lessons-v3.sh --sandbox`, copies
  the tests in and runs them, then lists each claim as `ok` or `FAIL`. The pre-commit hook runs it
  when the tests, the runner, the pins (`tools/lib/v3-lessons.sh`) or the template change.
  `--sandbox DIR --reuse` re-tests an already-built sandbox in seconds.

## How a lesson points at a claim

A hidden HTML comment, inline at the end of the sentence that relies on the claim:

```markdown
With `kElevatorKV` zeroed it trails by about 9 cm. <!-- claim: l18.kv-zeroed-lag -->
```

- Several claims in one marker: `<!-- claim: l18.kv-zeroed-lag, wpilib.kraken-x60-model -->`.
- **Inline** is the default: in a paragraph, a list item, a `>` callout, a table cell, or a
  figure caption.
- **On its own line** only above a table or a figure, with a blank line before and after it.
  Without the blank line after, kramdown turns the table into a paragraph (measured).
- **Never inside a fenced code block**: a comment there shows as text. The checker rejects it.
- Mark the sentence the student reads, not the whole section. One marker per place the claim is
  relied on; if a paragraph restates a number already marked a few lines up, one marker is enough.
- Markers don't change how the lesson reads, on GitHub or the website. Don't change the prose
  while adding them; if the prose looks wrong, report it instead.

## A claim

```toml
[[claim]]
id = "l18.kv-zeroed-lag"          # lNN.<slug> in lesson-NN.toml; <library>.<slug> in <library>.toml
kind = "number"                   # api | behaviour | number
library = ["phoenix6", "wpilib"]  # every library whose change could move it
criticality = "C2"                # C1, C2 or C3 (below)
statement = "With kElevatorKV zeroed, the carriage trails the setpoint by about 9 cm at cruise, stowed to the top."
evidence = "CLAUDE.md, 'v3 Lessons 7-22 re-measured on alpha-8', Lesson 18 (RIG)"
measured_on = "alpha-8"
# number claims only:
wording = "about 9 cm"            # how the lesson words it
unit = "mm"
range = [85.0, 95.0]              # the values the wording still describes truthfully
measured = "90.96-90.98 mm over five moves"
# optional:
method = "RIG"                    # RIG | LOOP | BARE | REPLAY | SOURCE | BYTECODE | ARITHMETIC | TEST (see below)
test = "tools/figures/probes/Fig18HeightSetpointGoal.java"   # a kept probe or test that measures it
figure = "18-height-setpoint-goal.png"
note = "..."
```

**Kinds.** `api`: something exists, has a signature, or has a fixed value (a default, a constant,
a field-file position). `behaviour`: what the code does when it runs. `number`: a figure the
lesson quotes that comes out of running the simulation, so a library change could move it.

**Criticality.** C1: if it's wrong, student code fails, crashes, or behaves as the lesson says it
won't. C2: a number or figure the student is told to look for and compare against. C3: a side
remark.

**`method`.** How the claim was last confirmed. The first seven are CLAUDE.md's probe methods;
`TEST` means a kept test checks it every time it runs (the file in `test`), so `measured_on` is the
pins it last passed on.

**A test for a claim** checks the whole statement, not only the part that's easy to check; if it
can't, leave `test` unset. Before relying on it, break it on purpose (flip what it expects, as a
library change would) and see that exactly that test fails, by its claim id.

**`measured_on`.** The library versions the claim was last confirmed on. `alpha-8` means GradleRIO
`2027.0.0-alpha-8` with the vendordeps pinned in `tools/lib/v3-lessons.sh` at the time. Say so
when a claim was only checked on alpha-7 (`alpha-7, listed unchanged on alpha-8`). Write `unverified` when nothing records a measurement or a reading of the source, and say so in `evidence`.

## The range of a number

The range is the set of values for which the lesson's sentence is still true as written:

- **A bare number** gets its rounding interval at the precision written: "60.47 rot/s" is
  [60.465, 60.475], "0.19 mm" is [0.185, 0.195], "a fifth of a millimeter" is [0.15, 0.25].
- **"about X"** (or "around", "roughly", "some") allows one unit either way in the last
  digit written, or 10% of X, whichever is smaller: "about 1.5 mm" is [1.4, 1.6], "about 91 mm"
  is [90, 92], "about 9 cm" is [8.1, 9.9], "about 1 s" is [0.9, 1.1]. (The 10% cap keeps a
  one-digit number from getting a range that can't fail: one unit either way of "about 1" would
  be 0 to 2.)
- **A stated range** keeps its endpoints, each widened by half a unit of its last digit: "1-2 cm"
  is [0.5, 2.5] cm, "25 to 50 cm" is [24.5, 50.5].
- **"almost X", "nearly X", "just under X"**: from one unit below X up to X ("almost 0.4 s" is
  [0.3, 0.4]); "just over X" is the mirror image.
- **A fraction in words** ("a tenth", "a third", "half") allows 10% either way bare and 20% with
  "about": "a fifth of a millimeter" is [0.18, 0.22] mm, "about a third of a second" is
  [0.27, 0.40] s.
- **In a whole number that ends in zero, a unit is ten**: "about 100 cm" is [90, 110] cm, "about
  60" is [50, 70]. (A whole number not ending in zero keeps a unit of one: "about 37" is [36, 38].)
- **"under X", "more than X"**: one-sided at X, using `inf` or `-inf`: `range = [100.0, inf]`.
- **A count of random outcomes** ("4 of 30 runs browned out"): the band in which the lesson's
  conclusion still holds, explained in `note`.
- When several sentences quote the same number, use one claim, give the tightest of their ranges,
  and put every wording in `wording`.

Run-to-run noise is not the range's job: a check can require k of n runs, and it re-runs a failure
once. If the repeated measurements in CLAUDE.md already fall outside the range, the wording is too
precise for the number: report it rather than widening the range or editing the lesson.
