# Lesson figures

Each graph in the OpMode lessons is drawn from data measured in the course's own
simulation, so it can be redrawn whenever a re-measure changes the numbers. The
conventions are in CLAUDE.md's "Figures in lessons", and the figure list is
[docs/lesson-plan-v3-figures.md](../../docs/lesson-plan-v3-figures.md).

| Path | What it is |
|---|---|
| `NN-name.py` | One generator per figure. It reads only `data/` and writes `docs/lessons/v3/images/NN-name.png`. |
| `data/` | The measured series each generator plots, as CSV. |
| `probes/` | The JUnit probes that measured them, one per figure. |
| `measure.sh` | Builds a lesson's state in a scratch sandbox and runs a probe there. |
| `figstyle.py` | The shared look: white background, palette, sizes. |

## Redrawing a figure

```bash
python3 -m pip install -r tools/figures/requirements.txt   # once
python3 tools/figures/18-height-setpoint-goal.py
```

## Re-measuring its data

Every generator's docstring gives the exact `measure.sh` commands for its own data
(which probe, which lesson state, which constants it changes). The Lesson 18 ones,
as an example:

The v3 builds need JDK 25.

```bash
export JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
tools/figures/measure.sh 18 tools/figures/probes/Fig18HeightSetpointGoal.java \
    tools/figures/data/18-height-setpoint-goal.csv
tools/figures/measure.sh 18 tools/figures/probes/Fig18HeightSetpointGoal.java \
    tools/figures/data/18-height-setpoint-goal-kv0.csv \
    --replace Constants.java "kElevatorKV = 1.42;" "kElevatorKV = 0.0;"
```

Lesson 18's `kP`-alone figure, with every gain but `kP` zeroed:

```bash
tools/figures/measure.sh 18 tools/figures/probes/Fig18KpAlone.java \
    tools/figures/data/18-kp-alone-model.csv
tools/figures/measure.sh 18 tools/figures/probes/Fig18KpAlone.java \
    tools/figures/data/18-kp-alone.csv \
    --replace Constants.java "kElevatorKG = 0.17;" "kElevatorKG = 0.0;" \
    --replace Constants.java "kElevatorKV = 1.42;" "kElevatorKV = 0.0;" \
    --replace Constants.java "kElevatorKA = 0.003;" "kElevatorKA = 0.0;"
```

Then run the generator again, and check that the numbers the figure shows still
match the lesson text.
