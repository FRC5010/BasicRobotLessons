"""Shared look for the lesson figures, so every graph in the course reads the same way.

Plots are drawn on white (the site has a dark theme, and a transparent plot vanishes
against it), 1200 px wide, with the colour-blind-safe Okabe-Ito palette. The image
carries no title: the lesson's caption names the figure.
"""

import os

import matplotlib

matplotlib.use("Agg")  # no display needed
import matplotlib.pyplot as plt  # noqa: E402

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
IMAGES = os.path.join(REPO, "docs", "lessons", "v3", "images")
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# The roles a series plays, so the same idea gets the same colour in every lesson.
GOAL = "#000000"       # what was asked for (drawn dashed)
SETPOINT = "#0072B2"   # what the profile or controller is asking for right now
MEASURED = "#D55E00"   # what the mechanism actually did
ALTERNATE = "#009E73"  # the same measurement under a changed setting
NEUTRAL = "#777777"    # guides, limits, annotations

DPI = 150
WIDTH_IN = 8.0  # 1200 px at DPI


def setup():
    """Fonts and lines large enough to read on a phone."""
    plt.rcParams.update({
        "font.size": 11,
        "axes.labelsize": 11,
        "axes.titlesize": 11,
        "legend.fontsize": 10,
        "lines.linewidth": 2.0,
        "axes.grid": True,
        "grid.color": "#dddddd",
        "grid.linewidth": 0.8,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "savefig.facecolor": "white",
    })


def data_path(name):
    return os.path.join(DATA, name)


def save(fig, name):
    """Write docs/lessons/v3/images/<name>.png and return its path."""
    os.makedirs(IMAGES, exist_ok=True)
    path = os.path.join(IMAGES, name + ".png")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)
    return path
