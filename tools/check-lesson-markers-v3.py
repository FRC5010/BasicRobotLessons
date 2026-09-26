#!/usr/bin/env python3
"""Check the v3 track's NEXT LESSON markers against what each lesson really changes.

The code at the end of Lesson N-1 carries a marker comment wherever Lesson N has
the student add or change code in a file that already exists:

    /**
     * ====== NEXT LESSON: ADD CODE HERE ======
     * What the new code is for, summarised from the lesson.
     */

"ADD CODE HERE" marks a spot where new code goes; "CHANGE THE CODE BELOW" marks
existing code the lesson rewrites. For every lesson N from 1 to the alpha-7
cut-off, this rebuilds the state after Lesson N-1 and after Lesson N with the
same rules the scripts use (tools/lib/v3-lessons.sh), diffs every file present in
both (and every file the lesson renames against what it became), and reports:

  MISSING   a code insertion or replacement with no marker announcing it
  ORPHAN    a marker that announces no insertion or replacement

A marker announces a change when only blank lines and comments sit between the
two, or between the marker and the start of the statement the change is part
of. A marker inside a method (or any block nested in a class) also announces
every later change in that same block, and a "change the code below" marker
right above a method announces changes anywhere inside that method; a marker at
class level otherwise announces only the change directly after it. Import lines,
comment-only edits, lines that are only closing braces, and pure deletions need
no marker, and new files never do. Exit status is non-zero if anything is
reported.

    ./tools/check-lesson-markers-v3.py            # every lesson through the cut-off
    ./tools/check-lesson-markers-v3.py 8          # just the markers Lesson 8 needs
    ./tools/check-lesson-markers-v3.py 8 --show   # also print each change it found
"""

import difflib
import os
import re
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(REPO, 'tools', 'lib', 'v3-lessons.sh')
BASE = os.path.join(REPO, 'code', 'OpModeV3Robot')
MARKER_TAG = 'NEXT LESSON:'


def cutoff():
    out = subprocess.run(['bash', '-c', f'. "{LIB}"; echo "$V3_ALPHA7_THROUGH"'],
                         capture_output=True, text=True, check=True)
    return int(out.stdout.strip())


def renames():
    """{lesson: [(old path, new path)]} from the deletions the lessons do as renames."""
    out = subprocess.run(['bash', '-c', f'. "{LIB}"; printf "%s\\n" "${{V3_DELETIONS[@]}}"'],
                         capture_output=True, text=True, check=True)
    table = {}
    for entry in out.stdout.split():
        fields = entry.split('|')
        if len(fields) == 3:
            table.setdefault(int(fields[0]), []).append((fields[1], fields[2]))
    return table


def build_state(through, dest):
    """The first/robot tree after lessons 0..through, via the shared rules."""
    shutil.copytree(os.path.join(BASE, 'src'), os.path.join(dest, 'src'))
    if through >= 0:
        subprocess.run(
            ['bash', '-c',
             f'. "{LIB}"; v3_apply_snapshots "$1" "$2" "$3" >/dev/null; v3_apply_deletions "$2" "$3" >/dev/null',
             '_', REPO, str(through), dest],
            check=True)
    root = os.path.join(dest, 'src', 'main', 'java', 'first', 'robot')
    files = {}
    for dirpath, _, names in os.walk(root):
        for n in names:
            if n.endswith('.java'):
                full = os.path.join(dirpath, n)
                with open(full, encoding='utf-8') as fh:
                    files[os.path.relpath(full, root)] = fh.read().split('\n')
    return files


def strip_markers(lines):
    """Remove marker blocks.

    Returns (remaining lines, markers, the 1-based line number each remaining line
    had in the original). Each marker is (index in the remaining lines of the line
    it sits above, its text — prefixed "CHANGE: " for a change marker — and its own
    original line number).
    """
    out, markers, lineno, i = [], [], [], 0
    while i < len(lines):
        if lines[i].strip() == '/**' and i + 1 < len(lines) and MARKER_TAG in lines[i + 1]:
            j = i
            while j < len(lines) and '*/' not in lines[j]:
                j += 1
            body = ' '.join(l.strip().lstrip('*').strip() for l in lines[i + 2:j])
            if 'CHANGE' in lines[i + 1]:
                body = 'CHANGE: ' + body
            markers.append((len(out), body, i + 1))
            i = j + 1
            continue
        out.append(lines[i])
        lineno.append(i + 1)
        i += 1
    return out, markers, lineno


def drop_blanks(lines, markers, lineno):
    """Remove blank lines too, so where a diff happens to line up blanks can't matter."""
    keep = [i for i, l in enumerate(lines) if l.strip()]
    # A marker now sits before the first non-blank line at or after it.
    remapped = [(next((n for n, i in enumerate(keep) if i >= p), len(keep)), text, at)
                for p, text, at in markers]
    return [lines[i] for i in keep], remapped, [lineno[i] for i in keep]


def is_comment_or_blank(line):
    t = line.strip()
    return t == '' or t.startswith('//') or t.startswith('/*') or t.startswith('*')


def code_of(line):
    """A line with its trailing // comment and surrounding whitespace removed."""
    t = re.sub(r'//.*$', '', line).strip() if '"' not in line else line.strip()
    return t


def continues(line):
    """True when the next line carries on this line's statement (or annotates it)."""
    t = code_of(line)
    return bool(t) and not t.endswith((';', '{', '}'))


CLOSERS = re.compile(r'^[\s})\];,]*$')


def significant(old, new):
    """True when the new lines add or change real code (not imports/comments/braces)."""
    def keep(ls):
        return [code_of(l) for l in ls
                if not is_comment_or_blank(l)
                and not l.strip().startswith(('import ', 'package '))
                and not CLOSERS.match(code_of(l))]
    added = keep(new)
    return bool(added) and added != keep(old)


def depths(lines):
    """Brace depth at the start of each line (strings and comments ignored)."""
    out, d = [], 0
    for line in lines:
        out.append(d)
        code = re.sub(r'"(\\.|[^"\\])*"', '""', line)
        code = re.sub(r'//.*$', '', code)
        if code.strip().startswith(('*', '/*')):
            continue
        d += code.count('{') - code.count('}')
    return out


def region_covers(old, depth, p, i1, change):
    """True if the marker at p announces the change at i1 without sitting right above it.

    A marker inside a block (depth >= 2) covers later changes while that block
    still encloses them. A "change the code below" marker right above a member
    that opens a block (a method, say) covers changes anywhere inside it.
    """
    if p > i1:
        return False
    if depth[p] >= 2 and all(depth[k] >= depth[p] for k in range(p, min(i1, len(old) - 1) + 1)):
        return True
    if not change or depth[p] < 1:
        # Only a "change the code below" marker speaks for the member under it
        # ("add code here" marks a spot), and never for a whole class.
        return False
    q = p
    while q < len(old) and (is_comment_or_blank(old[q]) or old[q].strip().startswith('@')):
        q += 1
    while q < len(old) and continues(old[q]):
        q += 1
    if q >= i1 or not code_of(old[q]).endswith('{'):
        return False
    return all(depth[k] > depth[p] for k in range(q + 1, min(i1, len(old) - 1) + 1))


def merge_brace_matches(opcodes, old):
    """Fold an unchanged run of lone closing braces between two changes into one change.

    Rewriting a method can leave a "}" that happens to line up with a "}" in the
    new code, splitting one rewrite into two hunks with nothing real between them.
    """
    out = []
    for op in opcodes:
        if (len(out) >= 2 and out[-1][0] == 'equal' and out[-2][0] != 'equal' and op[0] != 'equal'
                and all(CLOSERS.match(code_of(l)) for l in old[out[-1][1]:out[-1][2]])):
            eq = out.pop()
            prev = out.pop()
            op = ('replace', prev[1], op[2], prev[3], op[4])
        out.append(op)
    return out


def check_lesson(n, prev, cur, show, renamed=()):
    problems = []
    # A file the lesson renames is compared with what it became.
    pairs = [(p, p) for p in sorted(set(prev) & set(cur))]
    pairs += [(a, b) for a, b in renamed if a in prev and b in cur]
    for path, cur_path in pairs:
        old, markers, old_lineno = drop_blanks(*strip_markers(prev[path]))
        new, _, _ = drop_blanks(*strip_markers(cur[cur_path]))
        opcodes = merge_brace_matches(
            difflib.SequenceMatcher(None, old, new, autojunk=False).get_opcodes(), old)
        hunks = [(i1, i2, j1, j2) for tag, i1, i2, j1, j2 in opcodes
                 if tag in ('insert', 'replace', 'delete') and significant(old[i1:i2], new[j1:j2])]
        used = set()
        for i1, i2, j1, j2 in hunks:
            # The nearest marker at or above the change, with only blank lines
            # and comments between it and the change.
            # A change that starts partway through a statement (say, one argument
            # of a multi-line constructor call) is announced above the statement.
            k = i1
            while k > 0 and (is_comment_or_blank(old[k - 1]) or continues(old[k - 1])) \
                    and not any(p == k for p, _, _ in markers):
                k -= 1
            depth = depths(old)
            # A diff can merge two nearby insertions into one hunk by sharing a
            # closing brace: adding a line to a class and then a new class right
            # after it can come out as one insert before the old "}". So a marker
            # just past the hunk, separated from it only by closing braces the
            # hunk adds too, is at the second insertion point and also counts.
            added_closers = sum(1 for l in new[j1:j2] if CLOSERS.match(code_of(l)))

            def near(p):
                if p == k or i1 <= p <= i2:
                    return True
                return (p > i2 and p - i2 <= added_closers
                        and all(CLOSERS.match(code_of(l)) for l in old[i2:p]))

            covering = [m for m, (p, _, _) in enumerate(markers) if near(p)]
            # And the nearest marker above, if it's inside a block that still
            # encloses this change, or right above the method that holds it.
            above = [m for m, (p, _, _) in enumerate(markers) if p <= i1 and m not in covering]
            if above and region_covers(old, depth, markers[above[-1]][0], i1,
                                       markers[above[-1]][1].startswith('CHANGE: ')):
                covering.append(above[-1])
            where = f'{path}:{old_lineno[i1] if i1 < len(old) else len(prev[path])}'
            first = next((l.strip() for l in new[j1:j2] if not is_comment_or_blank(l)), '')
            if covering:
                used.update(covering)
                if show:
                    print(f'  ok      lesson {n}  {where}  + {first[:70]}')
            else:
                problems.append(f'MISSING  lesson {n}  {where}  + {first[:70]}')
        for m, (_, text, at) in enumerate(markers):
            if m not in used:
                problems.append(f'ORPHAN   lesson {n}  {path}:{at}  "{text[:70]}"')
    for path in sorted(set(prev) - set(cur) - {a for a, _ in renamed}):
        for _, text, at in strip_markers(prev[path])[1]:
            problems.append(f'ORPHAN   lesson {n}  {path}:{at} (file is deleted)  "{text[:60]}"')
    return problems


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    show = '--show' in sys.argv
    top = cutoff()
    renamed = renames()
    lessons = [int(args[0])] if args else list(range(1, top + 1))
    problems = []
    with tempfile.TemporaryDirectory() as tmp:
        states = {}

        def state(k):
            if k not in states:
                d = os.path.join(tmp, f'state-{k}')
                states[k] = build_state(k, d)
            return states[k]

        for n in lessons:
            problems += check_lesson(n, state(n - 1), state(n), show, renamed.get(n, ()))
    for p in problems:
        print(p)
    print(f'{len(problems)} problem(s) across lesson(s) {lessons[0]}..{lessons[-1]}')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
