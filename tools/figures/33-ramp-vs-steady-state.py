"""Lesson 33: why a 1 V/s ramp isn't quasistatic: speed against voltage.

Data: tools/figures/data/33-ramp-standstill.csv, from probes/Fig33RampStandstill.java on the
Lesson 33 state: the real Flywheel and its real SysIdRoutine quasistatic forward test, started
from a true standstill (RIG method, three reps per ramp). Columns: rate_v_per_s, rep, t_s,
applied_v, speed_rps. Re-measure with (each run is a fresh JVM; about two minutes):

    # 1 V/s, the shipped Config.defaults(): record 6 s of each rep
    RAMP_SECONDS=6 FIGURE_SANDBOX=$SCRATCH/figE-sbx tools/figures/measure.sh 33 \\
        tools/figures/probes/Fig33RampStandstill.java /tmp/ramp1.csv
    # 0.25 V/s: Config.useDataLog(0.25 V/s, 7 V, 30 s); record 24 s of each rep
    RAMP_SECONDS=24 FIGURE_SANDBOX=$SCRATCH/figE-sbx tools/figures/measure.sh 33 \\
        tools/figures/probes/Fig33RampStandstill.java /tmp/ramp025.csv \\
        --replace subsystems/Flywheel.java "SysIdRoutine.Config.defaults()" \\
        "SysIdRoutine.Config.useDataLog(org.wpilib.units.Units.Volts.of(0.25).per(org.wpilib.units.Units.Second), org.wpilib.units.Units.Volts.of(7), org.wpilib.units.Units.Seconds.of(30))"
    # then join them, adding a leading rate column:  rate_v_per_s,rep,t_s,applied_v,speed_rps

Everything drawn is a hand fit, not the SysId tool's: the two-term fit is voltage against speed
over the part of each ramp where the logged voltage is between 4 V and 6 V (a window that starts later gives a larger intercept, tending to kA x ramp rate / kV = 0.9 V; the lesson's 0.90 fits the whole 10 s ramp).

Output: docs/lessons/v3/images/33-ramp-vs-steady-state.png
"""

import csv

import matplotlib.pyplot as plt

import figstyle

STEADY = 1 / 0.118  # rot/s per volt, the kV check in the lesson (8.47)
FIT_RANGE = (4.0, 6.0)


def load():
    with open(figstyle.data_path("33-ramp-standstill.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    out = {}
    for r in rows:
        key = (float(r["rate_v_per_s"]), int(r["rep"]))
        out.setdefault(key, []).append((float(r["applied_v"]), float(r["speed_rps"])))
    return out


def fit(points):
    """Least squares V = ks + kv * speed over the fit range."""
    pts = [(w, v) for v, w in points if FIT_RANGE[0] <= v <= FIT_RANGE[1]]
    n = len(pts)
    sx = sum(w for w, _ in pts)
    sy = sum(v for _, v in pts)
    sxx = sum(w * w for w, _ in pts)
    sxy = sum(w * v for w, v in pts)
    kv = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    return (sy - kv * sx) / n, kv


def gap(points, volts):
    """Speed when the logged voltage first reaches `volts`, as a percent of steady state."""
    for i in range(1, len(points)):
        if points[i][0] >= volts:
            (v0, w0), (v1, w1) = points[i - 1], points[i]
            speed = w0 + (volts - v0) / (v1 - v0) * (w1 - w0)
            return speed, 100 * speed / (volts * STEADY)
    return None


def main():
    figstyle.setup()
    data = load()
    fig, ax = plt.subplots(figsize=(figstyle.WIDTH_IN, 6.4))
    xs = [0, 6.2 * STEADY]
    ax.plot(xs, [x / STEADY for x in xs], color=figstyle.GOAL, linestyle="--",
            label="steady state: voltage = speed ÷ 8.47 (through zero)")

    series = ((1.0, figstyle.MEASURED, "the 1 V/s ramp (the default)"),
              (0.25, figstyle.ALTERNATE, "the 0.25 V/s ramp"))
    for rate, color, name in series:
        pts = [p for p in data[(rate, 0)] if p[0] <= 6.2]
        ax.plot([w for _, w in pts], [v for v, _ in pts], color=color, label=name)
        ks, kv = fit(data[(rate, 0)])
        line = [0, 6.2 * STEADY]
        ax.plot(line, [ks + kv * x for x in line], color=color, linestyle=":", linewidth=1.6)
        ax.plot([0], [ks], marker="o", color=color)
        ax.annotate(f"two-term fit of this ramp: {ks:.2f} V at zero speed",
                    xy=(0, ks), xytext=(24.0, 1.75 if rate == 1.0 else 0.3), color=color, ha="left",
                    arrowprops={"arrowstyle": "->", "color": color})
        print(f"rate {rate}: fit intercept " + ", ".join(
            f"{fit(data[(rate, rep)])[0]:.3f}" for rep in range(3)) + " V; percents at 1-5 V: " + ", ".join(
            f"{gap(data[(rate, 0)], v)[1]:.1f}" for v in range(1, 6)))

    # The lag at 1 V and 5 V on the 1 V/s ramp, as a horizontal gap to the steady-state line.
    for volts in (1, 5):
        speed, pct = gap(data[(1.0, 0)], volts)
        ax.annotate("", xy=(volts * STEADY, volts), xytext=(speed, volts),
                    arrowprops={"arrowstyle": "<->", "color": figstyle.NEUTRAL, "lw": 1.3})
    ax.text(1 * STEADY + 4.5, 0.62, "at 1 V the wheel has reached\nunder 40% of its steady speed",
            color=figstyle.NEUTRAL, ha="left", va="center")
    ax.text(5 * STEADY + 0.8, 5.0, "at 5 V, still short\nby about a fifth", color=figstyle.NEUTRAL,
            ha="left", va="center")

    ax.set_xlim(0, 6.3 * STEADY)
    ax.set_ylim(0, 6.3)
    ax.set_xlabel("flywheel speed (rot/s)")
    ax.set_ylabel("logged voltage (V)")
    ax.legend(loc="upper left", bbox_to_anchor=(0.0, 1.0), frameon=False)
    print(figstyle.save(fig, "33-ramp-vs-steady-state"))


if __name__ == "__main__":
    main()
