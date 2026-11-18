"""Git-branching aside: Figure G.1 (a branch is a label on a commit) and Figure G.2
(rebase replays your commit onto a new base). Drawn from the hashes and branch names
the aside itself shows (its sections 2, 3 and 6); no measurement, so no data file.

    python3 tools/figures/G-git-diagrams.py

Writes docs/lessons/v3/images/aside-git-branching-branch-label.svg and aside-git-branching-rebase.svg.
"""

import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
IMAGES = os.path.join(REPO, "docs", "lessons", "v3", "images")

BLUE, ORANGE, BLACK, GREY = "#0072B2", "#D55E00", "#000000", "#777777"
FONT = 'font-family="sans-serif"'


class Svg:
    def __init__(self, w, h):
        self.w, self.h, self.parts = w, h, []

    def add(self, s):
        self.parts.append(s)

    def text(self, x, y, s, size=16, fill=BLACK, anchor="middle", weight="normal", italic=False):
        st = ' font-style="italic"' if italic else ""
        self.add(f'<text x="{x}" y="{y}" {FONT} font-size="{size}" fill="{fill}" '
                 f'text-anchor="{anchor}" font-weight="{weight}"{st}>{s}</text>')

    def commit(self, x, y, h, msg="", fill="#ffffff", stroke=BLACK, dashed=False, hash_color=BLACK):
        d = ' stroke-dasharray="6 5"' if dashed else ""
        self.add(f'<circle cx="{x}" cy="{y}" r="22" fill="{fill}" stroke="{stroke}" stroke-width="3"{d}/>')
        self.text(x, y + 46, h, 16, hash_color, weight="bold")
        if msg:
            self.text(x, y + 66, msg, 14, GREY)

    def parent(self, child, parent, dashed=False, color=BLACK):
        (cx, cy), (px, py) = child, parent
        dx, dy = px - cx, py - cy
        n = (dx * dx + dy * dy) ** 0.5
        ux, uy = dx / n, dy / n
        x1, y1 = cx + ux * 24, cy + uy * 24
        x2, y2 = px - ux * 29, py - uy * 29
        d = ' stroke-dasharray="6 5"' if dashed else ""
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" '
                 f'stroke-width="2.5"{d} marker-end="url(#a{"d" if dashed else ""})"/>')

    def label(self, x, y, name, color, w=None, above_of=None, tx=None):
        """A branch label (rounded box) at (x, y) centre, with a stem down to a commit."""
        w = w or (len(name) * 10 + 24)
        self.add(f'<rect x="{x - w / 2}" y="{y - 15}" width="{w}" height="30" rx="8" fill="{color}"/>')
        self.text(x, y + 5, name, 16, "#ffffff", weight="bold")
        if above_of:
            self.add(f'<line x1="{x}" y1="{y + 15}" x2="{above_of[0]}" y2="{above_of[1] - 24}" '
                     f'stroke="{color}" stroke-width="2.5"/>')

    def write(self, name):
        defs = ('<defs>'
                f'<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
                f'<path d="M0,0 L10,5 L0,10 z" fill="{BLACK}"/></marker>'
                f'<marker id="ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
                f'<path d="M0,0 L10,5 L0,10 z" fill="{GREY}"/></marker></defs>')
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" '
               f'width="{self.w}" height="{self.h}">{defs}'
               f'<rect x="0" y="0" width="{self.w}" height="{self.h}" fill="#ffffff"/>'
               + "".join(self.parts) + "</svg>\n")
        path = os.path.join(IMAGES, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg)
        print(path)


def branch_label():
    s = Svg(800, 470)
    # Panel 1: right after `git switch -c lesson-01`.
    s.text(20, 28, "1. After git switch -c lesson-01: two labels, one commit", 17, BLACK, "start", "bold")
    x, y = 400, 150
    s.label(x - 70, 70, "main", BLUE, above_of=(x, y))
    s.label(x + 70, 70, "lesson-01", ORANGE, w=110, above_of=(x, y))
    s.text(x + 70 + 85, 108, "← HEAD (you are here)", 14, BLACK, "start", "bold")
    s.commit(x, y, "3cf14a0", "Project from template")
    s.add(f'<line x1="20" y1="245" x2="780" y2="245" stroke="#dddddd" stroke-width="2"/>')
    # Panel 2: after one commit.
    s.text(20, 275, "2. After git commit: lesson-01 slides forward, main stays", 17, BLACK, "start", "bold")
    x1, x2, y = 250, 520, 400
    s.parent((x2, y), (x1, y))
    s.label(x1, 320, "main", BLUE, above_of=(x1, y))
    s.label(x2, 320, "lesson-01", ORANGE, w=110, above_of=(x2, y))
    s.text(x2 + 70, 326, "← HEAD", 14, BLACK, "start", "bold")
    s.commit(x1, y, "3cf14a0", "Project from template")
    s.commit(x2, y, "79bf90a", "Lesson 1: spin a motor")
    s.write("aside-git-branching-branch-label.svg")


def rebase():
    s = Svg(800, 860)
    xs = [130, 330, 530]
    # Panel 1: before.
    s.text(20, 28, "1. Before: main moved on while you worked", 17, BLACK, "start", "bold")
    y, y2 = 105, 195
    s.parent((xs[1], y), (xs[0], y))
    s.parent((xs[1], y2), (xs[0], y))
    s.label(xs[1], 60, "main", BLUE, above_of=(xs[1], y))
    s.commit(xs[0], y, "15f7610", "")
    s.commit(xs[1], y, "5a9421b", "")
    s.commit(xs[1], y2, "5adaa87", "", stroke=ORANGE)
    s.label(xs[1] + 150, y2, "lesson-21", ORANGE, w=110)
    s.add(f'<line x1="{xs[1] + 95}" y1="{y2}" x2="{xs[1] + 28}" y2="{y2}" stroke="{ORANGE}" stroke-width="2.5"/>')
    s.text(xs[1] + 70, y + 8, "teammate’s commit", 14, GREY, "start")
    s.text(xs[1] + 70, y2 + 52, "your commit", 14, GREY, "start")
    s.add('<line x1="20" y1="290" x2="780" y2="290" stroke="#dddddd" stroke-width="2"/>')
    # Panel 2: after rebase.
    s.text(20, 318, "2. After git rebase main: your commit is replayed as a new one", 17, BLACK, "start", "bold")
    y, y2 = 400, 490
    s.parent((xs[1], y), (xs[0], y))
    s.parent((xs[2], y), (xs[1], y))
    s.parent((xs[1], y2), (xs[0], y), dashed=True, color=GREY)
    s.commit(xs[0], y, "15f7610", "")
    s.commit(xs[1], y, "5a9421b", "")
    s.commit(xs[2], y, "c7a003a", "", stroke=ORANGE, fill="#fbe5d6")
    s.label(xs[2], 355, "lesson-21", ORANGE, w=110, above_of=(xs[2], y))
    s.label(xs[1], 355, "main", BLUE, above_of=(xs[1], y))
    s.commit(xs[1], y2, "5adaa87", "", stroke=GREY, dashed=True, hash_color=GREY)
    s.text(xs[1] + 70, y2 + 8, "the old copy: no branch label points at it now", 14, GREY, "start")
    s.text(xs[2] + 40, y + 50, "new commit, new hash", 14, ORANGE, "start", "bold")
    s.add('<line x1="20" y1="585" x2="780" y2="585" stroke="#dddddd" stroke-width="2"/>')
    # Panel 3: what merge would do.
    s.text(20, 613, "3. For comparison, git merge main: a merge commit instead", 17, BLACK, "start", "bold")
    y, y2 = 690, 770
    s.parent((xs[1], y), (xs[0], y))
    s.parent((xs[1], y2), (xs[0], y))
    s.parent((xs[2], y), (xs[1], y))
    s.parent((xs[2], y), (xs[1], y2))
    s.commit(xs[0], y, "15f7610", "")
    s.commit(xs[1], y, "5a9421b", "")
    s.commit(xs[1], y2 - 0, "5adaa87", "", stroke=ORANGE)
    s.commit(xs[2], y, "merge", "", stroke=ORANGE, fill="#fbe5d6")
    s.label(xs[2], 645, "lesson-21", ORANGE, w=110, above_of=(xs[2], y))
    s.label(xs[1], 645, "main", BLUE, above_of=(xs[1], y))
    s.write("aside-git-branching-rebase.svg")


if __name__ == "__main__":
    branch_label()
    rebase()
