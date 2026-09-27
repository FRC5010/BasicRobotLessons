#!/usr/bin/env python3
"""Merge a student's Constants.java into the reference version, keeping their values.

tools/update-lesson-v3.sh replaces every file a lesson touches with the reference
copy. Constants.java is where a student's robot lives — CAN IDs, magnet offsets,
gear ratios, camera mounts, tuned gains — so for that one file it calls this
instead of overwriting blindly.

Each constant is matched by its class and name (DriveConstants.kGyroPort). The
reference file is the starting point, and a student's value replaces the
reference value only when the student changed it: when it isn't a value the
lessons have ever given that constant. Comparing against that history, instead of
against the reference alone, means a value a lesson changes on purpose still gets
through to a student who never touched it.

  in both files, student changed it      -> keep the student's value
  in both files, student didn't          -> take the reference value
  type changed by the lessons            -> take the reference, report it
  only in the student's file, never in   -> the student's own: keep it, in the
    any lesson                              same class
  only in the student's file, but in     -> the lessons dropped or renamed it:
    a lesson already applied                leave it out, report it if customized
  only in the student's file, from a     -> rolling back: keep it if customized,
    lesson after the reference              leave it out quietly if not
  only in the reference                  -> new lesson content: add it

Whatever a kept value is written in terms of comes along too (a later lesson's
constant, or a whole class such as an enum), or the file wouldn't compile. A later
lesson's class comes back holding only what's kept, without its NEXT LESSON
markers. The reference file's comments (including NEXT LESSON markers) are kept,
and the student's extra imports are carried over when the merged file uses them.

    merge_constants.py --student OLD --reference NEW --out OUT --history FILE...
                       [--applied FILE...] [--upcoming FILE]

--history is every lesson's Constants.java; --applied is the ones up to the
reference's lesson (without it, all of them count as applied, and nothing is
treated as rolled back); --upcoming is the lesson about to be done, used only for
wording.

prints one line per thing worth knowing and exits 0, or exits 2 (writing
nothing) if either file can't be read as Java.

    merge_constants.py --check FILE

only reads FILE, exiting 2 with the reason if the merge couldn't — so a caller
can stop before changing anything.
"""

import argparse
import re
import sys

MODIFIERS = {'public', 'private', 'protected', 'static', 'final', 'transient', 'volatile'}


class MergeError(Exception):
    pass


def _mask(text, strings=True):
    """Same-length copy of text with comments (and, if strings, literal contents) blanked."""
    out = list(text)
    n = len(text)
    i = 0

    def blank(a, b):
        for k in range(a, b):
            if out[k] != '\n':
                out[k] = ' '

    while i < n:
        if text.startswith('//', i):
            j = text.find('\n', i)
            j = n if j < 0 else j
            blank(i, j)
            i = j
        elif text.startswith('/*', i):
            j = text.find('*/', i + 2)
            if j < 0:
                raise MergeError('a /* comment never ends')
            blank(i, j + 2)
            i = j + 2
        elif text.startswith('"""', i):
            j = text.find('"""', i + 3)
            if j < 0:
                raise MergeError('a """ text block never ends')
            if strings:
                blank(i + 3, j)
            i = j + 3
        elif text[i] in '"\'':
            quote, j = text[i], i + 1
            while j < n and text[j] != quote:
                if text[j] == '\n':
                    raise MergeError('a string or char literal never ends')
                j += 2 if text[j] == '\\' else 1
            if j >= n:
                raise MergeError('a string or char literal never ends')
            if strings:
                blank(i + 1, j)
            i = j + 1
        else:
            i += 1
    return ''.join(out)


def _norm(value):
    """A value with comments and whitespace removed, for comparing."""
    return re.sub(r'\s+', '', _mask(value, strings=False))


def _one_line(value, limit=60):
    v = re.sub(r'\s+', ' ', _mask(value, strings=False)).strip()
    return v if len(v) <= limit else v[:limit - 1] + '…'


def _top_level_eq(seg):
    """Index of the first assignment '=' outside parentheses, or -1."""
    depth = 0
    for k, ch in enumerate(seg):
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == '=' and depth == 0:
            before = seg[k - 1] if k else ''
            after = seg[k + 1] if k + 1 < len(seg) else ''
            if before not in '=!<>' and after != '=':
                return k
    return -1


class Decl:
    def __init__(self, cls, name, type_, vstart, vend, dstart, dend, value):
        self.cls, self.name, self.type = cls, name, type_
        self.key = f'{cls}.{name}'
        self.vstart, self.vend = vstart, vend      # the value, in the file's text
        self.dstart, self.dend = dstart, dend      # whole lines, with leading comments
        self.value = value


class Parsed:
    def __init__(self, text):
        self.text = text
        self.decls = {}      # key -> Decl
        self.classes = {}    # class path -> (start of its lines, index of '{', index of '}')
        self.imports = []    # (normalized, line text)
        self.import_end = None
        self.package_end = None


def _line_start(text, i):
    return text.rfind('\n', 0, i) + 1


def _line_end(text, i):
    j = text.find('\n', i)
    return len(text) if j < 0 else j


def _with_leading_comments(text, code, start):
    """Move start up over whole comment lines directly above it, stopping below a NEXT LESSON marker."""
    s = _line_start(text, start)
    top = s
    while top > 0:
        prev = _line_start(text, top - 1)
        line, line_code = text[prev:top - 1], code[prev:top - 1]
        if line.strip() and not line_code.strip():
            top = prev
        else:
            break
    block = text[top:s]
    k = block.rfind('NEXT LESSON')
    if k < 0:
        return top
    close = block.find('*/', k)
    nl = block.find('\n', close) if close >= 0 else -1
    return s if nl < 0 else top + nl + 1


def parse(text):
    p = Parsed(text)
    code = _mask(text)
    stack = []           # dicts: kind ('class' | 'block'), stmt, and for classes path/open/start
    top_stmt = 0
    paren = 0

    def parent_stmt():
        return stack[-1]['stmt'] if stack else top_stmt

    def set_stmt(i):
        nonlocal top_stmt
        if stack:
            stack[-1]['stmt'] = i
        else:
            top_stmt = i

    for i, ch in enumerate(code):
        if ch == '(':
            paren += 1
        elif ch == ')':
            paren -= 1
            if paren < 0:
                raise MergeError('a ) has no matching (')
        elif ch == '{':
            st = parent_stmt()
            header = code[st:i]
            m = re.search(r'\b(?:class|interface|enum|record)\s+(\w+)', header)
            if m and paren == 0 and _top_level_eq(header) < 0:
                path = [e['name'] for e in stack if e['kind'] == 'class'] + [m.group(1)]
                first = st + (len(header) - len(header.lstrip()))
                stack.append({'kind': 'class', 'name': m.group(1), 'path': '.'.join(path),
                              'open': i, 'start': first, 'stmt': i + 1})
            else:
                stack.append({'kind': 'block', 'init': paren > 0 or _top_level_eq(header) >= 0,
                              'stmt': i + 1})
        elif ch == '}':
            if not stack:
                raise MergeError('a } has no matching {')
            top = stack.pop()
            if top['kind'] == 'class':
                p.classes[top['path']] = (top['start'], top['open'], i)
            if not (top['kind'] == 'block' and top['init']):
                set_stmt(i + 1)
        elif ch == ';' and paren == 0:
            if stack and stack[-1]['kind'] == 'class':
                d = _decl(text, code, stack[-1], i)
                if d:
                    p.decls[d.key] = d
            set_stmt(i + 1)
    if stack or paren:
        raise MergeError('braces or parentheses are unbalanced')

    for m in re.finditer(r'^[ \t]*import\s+(static\s+)?([\w.]+(?:\.\*)?)\s*;[^\n]*$', code, re.M):
        p.imports.append((re.sub(r'\s+', ' ', m.group(0).strip()), text[m.start():m.end()]))
        p.import_end = m.end()
    m = re.search(r'^[ \t]*package\s+[\w.]+\s*;[^\n]*$', code, re.M)
    if m:
        p.package_end = m.end()
    return p


def _decl(text, code, cls, end):
    st = cls['stmt']
    seg = code[st:end]
    eq = _top_level_eq(seg)
    if eq < 0:
        return None
    left = re.sub(r'@[\w.]+(\s*\([^)]*\))?', ' ', seg[:eq]).split()
    mods = []
    while left and left[0] in MODIFIERS:
        mods.append(left.pop(0))
    if 'static' not in mods or 'final' not in mods or len(left) < 2:
        return None
    joined = ' '.join(left)
    m = re.search(r'(\w+)\s*$', joined)
    if not m:
        return None
    name, type_ = m.group(1), re.sub(r'\s+', '', joined[:m.start()])
    vstart = st + eq + 1
    while vstart < end and text[vstart].isspace():
        vstart += 1
    vend = end
    while vend > vstart and text[vend - 1].isspace():
        vend -= 1
    first = st + (len(seg) - len(seg.lstrip()))
    dstart = _with_leading_comments(text, code, first)
    after = _line_end(text, end)
    dend = after if not code[end + 1:after].strip() else end + 1
    return Decl(cls['path'], name, type_, vstart, vend, dstart, dend, text[vstart:vend])


class History:
    """Every value the lessons have ever given each constant, and every class they've had."""

    def __init__(self):
        self.values = {}
        self.classes = set()


def history_from_texts(texts):
    h = History()
    for t in texts:
        p = parse(t)
        for key, d in p.decls.items():
            h.values.setdefault(key, set()).add(_norm(d.value))
        h.classes |= set(p.classes)
    return h


def _display(key):
    return key.split('.', 1)[1] if '.' in key else key


_NEXT_LESSON = re.compile(r'[ \t]*/\*\*(?:(?!\*/).)*?NEXT LESSON(?:(?!\*/).)*\*/[ \t]*\n', re.S)
_CHAIN = re.compile(r'(?<![\w.])[A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*)*')


def _chains(text):
    """The dotted names a piece of code uses, outside comments and strings, split at the dots."""
    return [re.sub(r'\s+', '', m.group(0)).split('.') for m in _CHAIN.finditer(_mask(text))]


def _resolve(chain, scope, p):
    """What a dotted name used inside class `scope` means among p's declarations.

    Returns ('decl', key), ('class', path) or None, looking the first part up the way
    Java does: in the class itself, then each class around it.
    """
    parts = scope.split('.')
    for depth in range(len(parts), -1, -1):
        base = '.'.join(parts[:depth])
        cur = f'{base}.{chain[0]}' if base else chain[0]
        if cur in p.decls:
            return ('decl', cur)
        if cur in p.classes:
            for part in chain[1:]:
                if f'{cur}.{part}' in p.decls:
                    return ('decl', f'{cur}.{part}')
                if f'{cur}.{part}' not in p.classes:
                    break
                cur = f'{cur}.{part}'
            return ('class', cur)
    return None


def _tidy(block):
    """At most one blank line in a row, and none just inside braces."""
    block = re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+', '\n\n', block)
    block = re.sub(r'\{[ \t]*\n(?:[ \t]*\n)+', '{\n', block)
    return re.sub(r'\n(?:[ \t]*\n)+([ \t]*\})', r'\n\1', block)


def merge(student, reference, history, applied=None, upcoming=None):
    """Return (merged text, report lines). Raises MergeError if either file won't parse.

    applied is the History of the lessons already applied, up to the reference's own
    lesson. A constant the history has but applied doesn't belongs to a later lesson,
    which only happens when rolling back; left out, every lesson counts as applied.
    upcoming is the History of the lesson about to be done, and only changes wording.
    """
    student = student.replace('\r\n', '\n').replace('\r', '\n')
    reference = reference.replace('\r\n', '\n').replace('\r', '\n')
    s, r = parse(student), parse(reference)
    applied = history if applied is None else applied
    upcoming = set() if upcoming is None else set(upcoming.values)
    code = _mask(student)
    edits = []      # (start, end, replacement) on the reference text
    report = []
    roots = []      # the student's declarations whose values end up in the merged file

    def customized(d):
        return _norm(d.value) not in history.values.get(d.key, ())

    def later(key):
        return key in history.values and key not in applied.values

    def own_class(cls):
        return cls not in history.classes

    def inside(key_or_cls, cls):
        return key_or_cls == cls or key_or_cls.startswith(cls + '.')

    for key, rd in r.decls.items():
        sd = s.decls.get(key)
        if sd is None:
            continue
        sv, rv = _norm(sd.value), _norm(rd.value)
        if sv == rv:
            continue
        if sv in history.values.get(key, ()):
            report.append(f'updated     {_display(key)} = {_one_line(rd.value)}'
                          f'  (the lessons changed it from {_one_line(sd.value)})')
        elif sd.type != rd.type:
            report.append(f'CHECK       {_display(key)} is now a {rd.type}, so your value'
                          f' {_one_line(sd.value)} was replaced — enter it again in the new form')
        else:
            edits.append((rd.vstart, rd.vend, sd.value))
            report.append(f'kept yours  {_display(key)} = {_one_line(sd.value)}')
            roots.append(sd)

    # Which of the student's declarations the reference lacks come along. Their own
    # constants always do; a later lesson's constant does when they customized it,
    # and so does anything a kept value is written in terms of, or it wouldn't compile.
    keep = {}       # key -> None (theirs) or the key that needs it
    whole = {}      # class kept entire, because a kept value uses it -> the key that uses it

    def whole_class(cls):
        parts = cls.split('.')
        return any(own_class('.'.join(parts[:i])) or '.'.join(parts[:i]) in whole
                   for i in range(1, len(parts) + 1))

    for key, sd in s.decls.items():
        if key in r.decls:
            continue
        if key not in history.values or (later(key) and customized(sd)):
            keep[key] = None
    queue = roots + [s.decls[k] for k in keep] + [d for d in s.decls.values() if whole_class(d.cls)]
    while queue:
        d = queue.pop()
        for chain in _chains(d.type + ' ' + d.value):
            found = _resolve(chain, d.cls, s)
            if found is None:
                continue
            kind, name = found
            if kind == 'decl' and name not in r.decls and name not in keep and later(name):
                keep[name] = d.key
                queue.append(s.decls[name])
            elif (kind == 'class' and name not in r.classes and name not in whole
                  and name in history.classes and name not in applied.classes):
                whole[name] = d.key
                queue += [e for e in s.decls.values() if inside(e.cls, name)]

    def kept(d):
        return d.key in keep or whole_class(d.cls)

    def has_content(cls):
        return (whole_class(cls) or any(inside(d.cls, cls) and kept(d) for d in s.decls.values())
                or any(inside(c, cls) and c in whole for c in s.classes))

    def report_kept(d):
        by = keep.get(d.key)
        if d.key not in history.values:
            report.append(f'kept yours  {_display(d.key)} (a constant of your own)')
        elif by is not None:
            report.append(f'kept        {_display(d.key)} = {_one_line(d.value)}'
                          f'  (your {_display(by)} is written with it)')
        elif d.key in upcoming:
            report.append(f'kept yours  {_display(d.key)} = {_one_line(d.value)}  (the lesson you\'re'
                          ' about to do adds this — keep your line instead of typing the lesson\'s)')
        else:
            report.append(f'kept yours  {_display(d.key)} = {_one_line(d.value)}  (from a later lesson —'
                          ' kept so your value is still here when you get there)')

    def insert_before_close(cls, block):
        close = r.classes[cls][2]
        at = _line_start(reference, close)
        edits.append((at, at, block.rstrip('\n') + '\n'))

    for key, sd in s.decls.items():
        if key in r.decls or sd.cls not in r.classes:
            continue
        if key in keep:
            insert_before_close(sd.cls, student[sd.dstart:sd.dend])
            report_kept(sd)
        elif key in history.values and not later(key) and customized(sd):
            report.append(f'DROPPED     {_display(key)} = {_one_line(sd.value)} — this lesson\'s'
                          ' reference code doesn\'t have it; move the value by hand if you still need it')

    for cls, (start, _, close) in s.classes.items():
        if cls in r.classes:
            continue
        parent = cls.rsplit('.', 1)[0] if '.' in cls else None
        if parent is None or (parent in s.classes and parent not in r.classes):
            continue            # the top-level class itself, or nested in a class that comes along
        if own_class(cls):
            if parent not in r.classes:
                report.append(f'DROPPED     {_display(cls)} — couldn\'t find where it goes; copy it over by hand')
                continue
            block = student[_with_leading_comments(student, code, start):_line_end(student, close)]
            insert_before_close(parent, '\n' + block)
            report.append(f'kept yours  {_display(cls)} (a class of your own)')
        elif cls not in applied.classes:
            if not has_content(cls):
                continue
            a = _with_leading_comments(student, code, start)
            cuts = []
            for c, (cs, _, cc) in s.classes.items():
                if c != cls and inside(c, cls) and not has_content(c):
                    cuts.append((_with_leading_comments(student, code, cs), _line_end(student, cc) + 1))
            for d in s.decls.values():
                if inside(d.cls, cls) and not kept(d):
                    cuts.append((d.dstart, d.dend + (student[d.dend:d.dend + 1] == '\n')))
            block, at = '', a
            for x, y in sorted(cuts):
                if x >= at:
                    block += student[at:x]
                at = max(at, y)
            block += student[at:_line_end(student, close)]
            insert_before_close(parent, '\n' + _tidy(_NEXT_LESSON.sub('', block)))
            for c in s.classes:
                if c in whole and inside(c, cls) and not any(inside(c, w) for w in whole if w != c):
                    report.append(f'kept        {_display(c)}  (your {_display(whole[c])} uses it)')
            for d in s.decls.values():
                if inside(d.cls, cls) and d.key in keep:
                    report_kept(d)
        else:
            for sd in s.decls.values():
                if inside(sd.cls, cls) and customized(sd):
                    report.append(f'DROPPED     {_display(sd.key)} = {_one_line(sd.value)} — this lesson\'s'
                                  ' reference code doesn\'t have it; move the value by hand if you still need it')

    # Apply the edits back to front; several at one spot keep the order they were made in.
    merged = reference
    for _, (start, end, text) in sorted(enumerate(edits), key=lambda e: (e[1][0], e[0]), reverse=True):
        merged = merged[:start] + text + merged[end:]

    # Carry over the student's imports that the merged file still uses. A * import
    # can't be checked, so it always comes along.
    used = set(re.findall(r'\w+', _mask(merged)))
    have = {norm for norm, _ in r.imports}
    extra = []
    for norm, line in s.imports:
        name = re.match(r'import\s+(?:static\s+)?([\w.]+?)(\.\*)?\s*;', norm)
        if norm not in have and (name.group(2) or name.group(1).rsplit('.', 1)[-1] in used):
            extra.append(line)
    if extra:
        at = r.import_end if r.import_end is not None else r.package_end
        if at is None:
            at, block = 0, '\n'.join(extra) + '\n\n'
        else:
            block = '\n' + '\n'.join(extra)
        merged = merged[:at] + block + merged[at:]
    return merged, report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check')
    ap.add_argument('--student')
    ap.add_argument('--reference')
    ap.add_argument('--out')
    ap.add_argument('--history', nargs='*', default=[])
    ap.add_argument('--applied', nargs='*', help="Constants.java of the lessons already applied, when rolling back")
    ap.add_argument('--upcoming', help="Constants.java of the lesson about to be done, if it has one")
    a = ap.parse_args()
    if a.check:
        try:
            with open(a.check, encoding='utf-8') as fh:
                parse(fh.read().replace('\r\n', '\n'))
        except (MergeError, UnicodeDecodeError) as e:
            print(f'merge_constants: {e}', file=sys.stderr)
            sys.exit(2)
        return
    if not (a.student and a.reference and a.out):
        ap.error('--student, --reference and --out are required (or use --check)')
    def read(path):
        with open(path, encoding='utf-8') as fh:
            return fh.read()

    try:
        student, reference = read(a.student), read(a.reference)
        history = history_from_texts([read(f) for f in a.history] + [reference])
        applied = None if a.applied is None else history_from_texts([read(f) for f in a.applied] + [reference])
        upcoming = history_from_texts([read(a.upcoming)]) if a.upcoming else None
        merged, report = merge(student, reference, history, applied, upcoming)
    except (MergeError, UnicodeDecodeError) as e:
        print(f'merge_constants: {e}', file=sys.stderr)
        sys.exit(2)
    with open(a.out, 'w', encoding='utf-8') as fh:
        fh.write(merged)
    for line in report:
        print(line)


if __name__ == '__main__':
    main()
