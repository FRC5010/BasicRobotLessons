#!/usr/bin/env python3
"""Check that the lessons' "type this" Java blocks match the reference code.

    ./tools/check-lesson-code-v3.py [N ...] [--from K] [--show]

For each lesson N (default: every lesson up to the alpha-7 cut-off), every fenced ```java block
with a **bold** lead-in (the "type this" convention: **Edit `Drivetrain.java`:**, **Add to ...:**)
must appear in the code as it stands after Lesson N: code/OpModeV3Robot with code/v3/lesson-0 ...
lesson-N rolled forward and the deletions replayed, the same rules as verify-lessons-v3.sh (it
reuses check-lesson-markers-v3.py's build_state).

- **Comments and whitespace are ignored**, so a block matches whatever its comments say, and the
  snapshots' NEXT LESSON markers don't get in the way. Java tokens are compared.
- **A block is split into statements** (ending at a top-level `;`, or at `{` or `}`), and each must
  appear unbroken, in order, in one file, with other code allowed in between. So a block still
  matches after later sections add to the same class, and an anchor like `// ... the fields ...`
  needs no special handling. If the block's top-level members (its imports, fields, methods,
  nested classes) don't match in that order, each may match on its own instead, since the order of
  a class's members doesn't matter; inside a member the statements still have to keep theirs.
- **A "Delete" block** is matched strictly instead: its pieces (split at `// ...` anchors) must
  appear unbroken and in order for it to count as still there.
- **A block whose lead-in starts with "Delete" or "Remove", or whose first line is a `// DELETE`
  comment, must be gone** from the code.
- Blocks with an *italic* lead-in ("Nothing to add — ...") illustrate and aren't checked; nor are
  blocks in a lesson's "Try it" section, which the student writes on their own.
- **Exceptions** live in tools/lesson-code-exceptions-v3.toml: a block the lesson replaces later
  in the same lesson (a staged version), for instance. An exception that matches no block, more
  than one block, or a block that now checks out is an error, so the list can't go stale.

Exit status 1 if any block fails. --from K adds every lesson from K up to the cut-off (what a
change to code/v3/lesson-K can affect); --show prints every checked block, not only the failures.
"""

import argparse
import glob
import importlib.util
import os
import re
import sys
import tempfile
import tomllib
from dataclasses import dataclass, field

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSONS = os.path.join(REPO, 'docs', 'lessons', 'v3')
EXCEPTIONS = os.path.join(REPO, 'tools', 'lesson-code-exceptions-v3.toml')

_spec = importlib.util.spec_from_file_location('markers', os.path.join(REPO, 'tools', 'check-lesson-markers-v3.py'))
markers = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(markers)

# Strings and character literals are kept; comments become a space.
_LEXEME = re.compile(r'"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'|//[^\n]*|/\*.*?\*/', re.S)
_TOKEN = re.compile(r'"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'|[A-Za-z_$][\w$]*|\d[\w.]*|\S')
_ANCHOR = re.compile(r'^\s*(?://\s*)?(?:\.\.\.|…)')
_INLINE_ANCHOR = re.compile(r'//\s*(?:\.\.\.|…)')
_DELETE = re.compile(r'^\*\*(?:Delete|Remove)\b')


def strip_comments(text):
    return _LEXEME.sub(lambda m: m.group(0) if m.group(0)[0] in '"\'' else ' ', text)


def tokens(text):
    return _TOKEN.findall(strip_comments(text))


def fragments(code):
    """Split a block at its `// ...` anchors; each fragment is a token list (empty ones dropped)."""
    parts, cur = [], []
    for line in code.split('\n'):
        if _ANCHOR.match(line):
            parts.append(cur)
            cur = []
            continue
        m = _INLINE_ANCHOR.search(line)
        if m:
            cur.append(line[:m.start()])
            parts.append(cur)
            cur = []
            continue
        cur.append(line)
    parts.append(cur)
    out = [tokens('\n'.join(p)) for p in parts]
    return [t for t in out if t]


def units(code):
    """Split a block into statements: runs of tokens ending at a top-level `;`, or at `{` or `}`.

    Each unit has to appear unbroken in the file, but other code may sit between units, so a block
    still matches after later sections of the lesson add to the same class or method. A line break
    inside a statement doesn't matter: tokens are compared, not lines.
    """
    out, cur, depth, saved = [], [], 0, []
    for t in tokens(code):
        cur.append(t)
        if t in '([':
            depth += 1
        elif t in ')]':
            depth = max(0, depth - 1)
        elif t == '{':          # a lambda body inside a call's parentheses still has statements
            saved.append(depth)
            depth = 0
        elif t == '}':
            depth = saved.pop() if saved else 0
        if t in '{}' or (t == ';' and depth == 0):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def members(us):
    """Group units into top-level members: a run of units that returns to brace depth 0."""
    out, cur, depth = [], [], 0
    for u in us:
        cur.append(u)
        depth += u.count('{') - u.count('}')
        if depth <= 0:
            out.append(cur)
            cur, depth = [], 0
    if cur:
        out.append(cur)
    return out


def present_in(code, seq):
    """(units matched, total, first missing unit or None).

    Units match in order, with gaps allowed. If the whole block doesn't match in order, it still
    passes when each top-level member (an import, a field, a method, a nested class) matches on its
    own, since the order of a class's members doesn't matter.
    """
    result = _in_order(units(code), seq)
    if result[2] is None:
        return result
    ms = members(units(code))
    if len(ms) > 1 and all(_in_order(m, seq)[2] is None for m in ms):
        return result[1], result[1], None
    return result


def _in_order(us, seq):
    matched, pos = 0, 0
    for u in us:
        i = find(seq, u, pos)
        if i < 0:
            return matched, len(us), u
        matched += 1
        pos = i + len(u)
    return matched, len(us), None


def find(seq, pat, start=0):
    """Index of pat as a contiguous run in seq, at or after start, or -1."""
    n = len(pat)
    first = pat[0]
    i = start
    while True:
        try:
            i = seq.index(first, i)
        except ValueError:
            return -1
        if seq[i:i + n] == pat:
            return i
        i += 1


def match_in_order(frags, seq):
    """How many leading fragments appear in seq, in order, without overlapping."""
    pos = 0
    for k, f in enumerate(frags):
        i = find(seq, f, pos)
        if i < 0:
            return k
        pos = i + len(f)
    return len(frags)


@dataclass
class Block:
    lesson: int
    path: str
    line: int          # 1-based line of the opening fence
    lead: str          # the lead-in line, stripped
    kind: str          # 'present', 'absent', 'illustration', 'try-it', 'no-lead-in'
    code: str
    frags: list = field(default_factory=list)


def parse_blocks(lesson, path, text):
    lines = text.split('\n')
    blocks, section, i = [], '', 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('## '):
            section = line
        m = re.match(r'^(\s*)```java\s*$', line)
        if not m:
            i += 1
            continue
        indent = len(m.group(1))
        j = i + 1
        body = []
        while j < len(lines) and not re.match(r'^\s*```\s*$', lines[j]):
            body.append(lines[j][indent:] if lines[j][:indent].strip() == '' else lines[j])
            j += 1
        k = i - 1
        while k >= 0 and not lines[k].strip():
            k -= 1
        lead = lines[k].strip() if k >= 0 else ''
        lead = re.sub(r'^(?:[-*]|\d+\.)\s+(?=\*)', '', lead)  # a lead-in inside a list item
        if re.search(r'^## Try it', section, re.I):
            kind = 'try-it'
        elif lead.startswith('**'):
            first = next((l.strip() for l in body if l.strip()), '')
            deleting = _DELETE.match(lead) or (first.startswith('//') and 'DELETE' in first)
            kind = 'absent' if deleting else 'present'
        elif lead.startswith('*'):
            kind = 'illustration'
        else:
            kind = 'no-lead-in'
        code = '\n'.join(body)
        blocks.append(Block(lesson, path, i + 1, lead, kind, code, fragments(code)))
        i = j + 1
    return blocks


def test_files(state_dir):
    """The state's test sources too (Lesson 31's tests live under src/test/java)."""
    out = {}
    root = os.path.join(state_dir, 'src', 'test', 'java')
    for dirpath, _, names in os.walk(root):
        for name in names:
            if name.endswith('.java'):
                full = os.path.join(dirpath, name)
                with open(full, encoding='utf-8') as f:
                    out['test/' + os.path.relpath(full, root)] = f.read().split('\n')
    return out


def lesson_files():
    out = {}
    for p in sorted(glob.glob(os.path.join(LESSONS, '[0-9][0-9]-*.md'))):
        out[int(os.path.basename(p)[:2])] = p
    return out


def load_exceptions(path=EXCEPTIONS):
    if not os.path.exists(path):
        return []
    with open(path, 'rb') as f:
        data = tomllib.load(f)
    return data.get('exception', [])


def check_lesson(n, path, files, exceptions, show=False, out=print):
    """Returns (checked, failures, problems with exceptions)."""
    with open(path, encoding='utf-8') as f:
        blocks = parse_blocks(n, path, f.read())
    seqs = {name: tokens('\n'.join(lines)) for name, lines in files.items()}
    mine = [e for e in exceptions if e.get('lesson') == n]
    used = set()
    checked, failures, problems = 0, [], []
    rel = os.path.relpath(path, REPO)
    for b in blocks:
        if b.kind not in ('present', 'absent') or not b.frags:
            continue
        hits = [idx for idx, e in enumerate(mine) if e.get('block', '') and e['block'] in b.code]
        exc = hits[0] if hits else None
        for idx in hits:
            if idx in used:
                problems.append(f'{rel}:{b.line}: exception "{mine[idx]["block"][:50]}" matches more than one '
                                f'block; make its text more specific')
        if b.kind == 'present':
            best = max(((m, -tot, name, miss) for name, s in seqs.items()
                        for m, tot, miss in [present_in(b.code, s)]), key=lambda r: (r[0], r[1]))
            ok = best[3] is None
        else:
            hit = max((match_in_order(b.frags, s), name) for name, s in seqs.items())
            ok = hit[0] < len(b.frags)
        if exc is not None:
            used.add(exc)
            if ok:
                problems.append(f'{rel}:{b.line}: listed as an exception ("{mine[exc]["reason"]}") but it now '
                                f'checks out; remove the exception')
            continue
        checked += 1
        first = next((l.strip() for l in b.code.split('\n') if l.strip()), '')
        if ok:
            if show:
                out(f'ok   {rel}:{b.line}  {b.lead[:60]}')
            continue
        if b.kind == 'present':
            failures.append(f'{rel}:{b.line}: block not found in the code after Lesson {n} '
                            f'({b.lead[:50]}); closest file {best[2]}, first statement missing: '
                            f'{" ".join(best[3][:14])}')
        else:
            failures.append(f'{rel}:{b.line}: a "Delete" block is still in the code after Lesson {n} '
                            f'(in {hit[1]}): {first[:60]}')
    for idx, e in enumerate(mine):
        if idx not in used:
            problems.append(f'{os.path.relpath(EXCEPTIONS, REPO)}: Lesson {n} exception "{e.get("block", "")[:50]}" '
                            f'matches no checked block; remove or fix it')
    return checked, failures, problems


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('lessons', nargs='*', type=int)
    ap.add_argument('--from', dest='start', type=int, metavar='K',
                    help='also check every lesson from K up to the cut-off')
    ap.add_argument('--show', action='store_true')
    args = ap.parse_intermixed_args(argv)
    cut = markers.cutoff()
    avail = lesson_files()
    wanted = set(args.lessons)
    if args.start is not None:
        wanted |= {n for n in avail if args.start <= n <= cut}
    if not wanted:
        wanted = {n for n in avail if n <= cut}
    exceptions = load_exceptions()
    total, fails, probs, done = 0, [], [], 0
    for n in sorted(wanted):
        if n not in avail or n > cut:
            print(f'Lesson {n}: no lesson file at or below the cut-off ({cut}); skipped')
            continue
        done += 1
        with tempfile.TemporaryDirectory() as tmp:
            files = markers.build_state(n, tmp)
            files.update(test_files(tmp))
        c, f, p = check_lesson(n, avail[n], files, exceptions, args.show)
        total += c
        fails += f
        probs += p
    for line in fails + probs:
        print('FAIL ' + line)
    print(f'{total} "type this" Java blocks checked in {done} lessons; '
          f'{len(fails)} failed, {len(probs)} exception problems')
    return 1 if fails or probs else 0


if __name__ == '__main__':
    sys.exit(main())
