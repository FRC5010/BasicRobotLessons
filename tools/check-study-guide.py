#!/usr/bin/env python3
"""Check the Concepts Study Guide's pages: their quizzes, and their code examples.

    ./tools/check-study-guide.py [--show]

Every page under docs/study-guide/ (the plan is docs/lesson-plan-v3-reference.md). Claim
markers on these pages are checked by tools/claims/check_claims.py, like the lessons'.

**Quizzes.** Each is a block like this, which docs/assets/js/quiz.js turns into a pop-up:

    <details class="quiz" id="q-commands-1" markdown="1">
    <summary>Check yourself: the question?</summary>

    - [ ] A wrong answer. *Why it's wrong.*
    - [x] The right answer. *Why it's right.*

    </details>

The rules: an id of the form q-<words> that no other guide page uses; markdown="1"; a summary
starting "Check yourself:"; two to five answers, exactly one marked [x]; every answer ending in
an *explanation*, which mustn't itself start with "Right" or "Not quite" (the script says that);
a blank line after the summary and before </details> (without them kramdown leaves the list as
plain text); no < in the question, which kramdown reads as a tag there (an arrow's > is fine) (a generic type such as
Supplier<Pose2d> swallowed the rest of a page); and the block closed.

**Code examples.** Nothing on these pages is invented: every ```java block is copied from the
course's code and says where from, with a source tag among the two non-blank lines above its
fence (so it can sit above the italic lead-in):

    <!-- source: lesson-33 subsystems/Elevator.java -->
    *Example, from `Elevator.java`:*
    ```java
    ...
    ```

The block must appear in that file as it stands after that lesson (code/OpModeV3Robot with
code/v3/lesson-0 ... lesson-N rolled forward, the same build verify-lessons-v3.sh makes), by the
lesson-code checker's rules: Java tokens compared, comments and whitespace ignored, `// ...`
anchors and gaps allowed, members in any order. `<!-- source: lesson-33 -->` with no file
searches every file. `<!-- source: wrong -->` marks a deliberately-wrong example (one a lesson
shows to reject), which isn't checked; the prose has to say it's wrong. The lesson must be at or
below the alpha-7 cut-off.

Exit status 1 on any problem. --show lists every checked example too.
"""

import argparse
import glob
import importlib.util
import os
import re
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = os.path.join(REPO, 'docs', 'study-guide')

_spec = importlib.util.spec_from_file_location('lessoncode', os.path.join(REPO, 'tools', 'check-lesson-code-v3.py'))
lessoncode = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lessoncode)

QUIZ_OPEN = re.compile(r'<details\b([^>]*)>')
ATTR = re.compile(r'(\w+)="([^"]*)"')
ID_FORM = re.compile(r'^q-[a-z0-9]+(?:-[a-z0-9]+)*$')
OPTION = re.compile(r'^\s*[-*] \[( |x|X)\]\s+(.*)$')
EXPLANATION = re.compile(r'\*([^*]+)\*\s*$')
SOURCE = re.compile(r'<!--\s*source:\s*(.*?)\s*-->')
SOURCE_SPEC = re.compile(r'^lesson-(\d+)(?:\s+(\S+\.java))?$')


def check_quizzes(rel, text, seen):
    """Problems with one page's quizzes. `seen` maps quiz id -> where it was first used."""
    problems = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        m = QUIZ_OPEN.search(lines[i])
        attrs = dict(ATTR.findall(m.group(1))) if m else {}
        if not m or 'quiz' not in attrs.get('class', '').split():
            i += 1
            continue
        where = f'{rel}:{i + 1}'
        qid = attrs.get('id', '')
        if not qid:
            problems.append(f'{where}: a quiz needs an id (id="q-...")')
        elif not ID_FORM.match(qid):
            problems.append(f'{where}: quiz id "{qid}" should look like q-topic-1 (lowercase, hyphens)')
        elif qid in seen:
            problems.append(f'{where}: quiz id "{qid}" is already used at {seen[qid]}')
        else:
            seen[qid] = where
        if attrs.get('markdown') != '1':
            problems.append(f'{where}: a quiz needs markdown="1", or its list stays plain text')
        end = next((j for j in range(i + 1, len(lines)) if '</details>' in lines[j]), None)
        if end is None:
            problems.append(f'{where}: quiz is never closed with </details>')
            break
        body = lines[i + 1:end]
        summary_at = next((k for k, line in enumerate(body) if '<summary>' in line), None)
        if summary_at is None or 'Check yourself:' not in body[summary_at]:
            problems.append(f'{where}: a quiz needs <summary>Check yourself: the question</summary>')
        else:
            question = re.sub(r'</?summary>', '', body[summary_at])
            if '<' in question:
                problems.append(f'{where}: a quiz question can\'t contain < (a generic type such as '
                                f'Supplier<Pose2d>): the site reads it as an HTML tag and the rest of the '
                                f'page breaks. Reword it, or put the type in an answer instead')
            after = body[summary_at + 1] if summary_at + 1 < len(body) else ''
            if after.strip():
                problems.append(f'{where}: leave a blank line after the <summary> line')
        if body and body[-1].strip():
            problems.append(f'{where}: leave a blank line before </details>')
        options = [OPTION.match(line) for line in body]
        options = [o for o in options if o]
        if not 2 <= len(options) <= 5:
            problems.append(f'{where}: a quiz needs two to five answers (found {len(options)})')
        right = [o for o in options if o.group(1) in 'xX']
        if len(right) != 1:
            problems.append(f'{where}: exactly one answer must be marked [x] (found {len(right)})')
        for o in options:
            why = EXPLANATION.search(o.group(2))
            answer = o.group(2)[:40]
            if not why:
                problems.append(f'{where}: answer "{answer}" needs an *explanation* at the end')
            elif re.match(r'\s*(Right|Not quite)\b', why.group(1)):
                problems.append(f'{where}: answer "{answer}": don\'t start the explanation with '
                                f'"Right" or "Not quite"; the pop-up says that itself')
        i = end + 1
    return problems


def java_blocks(text):
    """(line of the fence, source tag or None, code) for every ```java block."""
    lines = text.split('\n')
    out = []
    i = 0
    while i < len(lines):
        m = re.match(r'^(\s*)```java\s*$', lines[i])
        if not m:
            i += 1
            continue
        indent = len(m.group(1))
        j = i + 1
        body = []
        while j < len(lines) and not re.match(r'^\s*```\s*$', lines[j]):
            body.append(lines[j][indent:] if lines[j][:indent].strip() == '' else lines[j])
            j += 1
        above = [line for line in lines[max(0, i - 6):i] if line.strip()][-2:]
        tag = None
        for line in above:
            s = SOURCE.search(line)
            if s:
                tag = s.group(1)
        out.append((i + 1, tag, '\n'.join(body)))
        i = j + 1
    return out


def check_examples(rel, text, files_for, cutoff, show=False, out=print):
    """Problems with one page's code examples. files_for(n) gives the code after lesson n."""
    problems = []
    for line, tag, code in java_blocks(text):
        where = f'{rel}:{line}'
        if tag is None:
            problems.append(f'{where}: a code example needs a source tag above it '
                            f'(<!-- source: lesson-N path/File.java --> or <!-- source: wrong -->)')
            continue
        if tag == 'wrong':
            continue
        spec = SOURCE_SPEC.match(tag)
        if not spec:
            problems.append(f'{where}: source tag "{tag}" should read "lesson-N path/File.java" or "wrong"')
            continue
        n, path = int(spec.group(1)), spec.group(2)
        if n > cutoff:
            problems.append(f'{where}: lesson {n} is past the cut-off ({cutoff}), so its code isn\'t checked yet')
            continue
        files = files_for(n)
        if path is not None and path not in files:
            problems.append(f'{where}: no file {path} in the code after Lesson {n}')
            continue
        names = [path] if path else sorted(files)
        best = max(((m, -tot, name, miss) for name in names
                    for m, tot, miss in [lessoncode.present_in(code, lessoncode.tokens('\n'.join(files[name])))]),
                   key=lambda r: (r[0], r[1]))
        if best[3] is None:
            if show:
                out(f'ok   {where}  lesson-{n} {best[2]}')
            continue
        problems.append(f'{where}: example not found in {best[2]} after Lesson {n}; first statement '
                        f'missing: {" ".join(best[3][:14])}')
    return problems


def guide_pages(root=GUIDE):
    return sorted(glob.glob(os.path.join(root, '**', '*.md'), recursive=True))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--show', action='store_true')
    args = ap.parse_args(argv)
    cutoff = lessoncode.markers.cutoff()
    cache = {}

    def files_for(n):
        if n not in cache:
            with tempfile.TemporaryDirectory() as tmp:
                files = lessoncode.markers.build_state(n, tmp)
                files.update(lessoncode.test_files(tmp))
            cache[n] = files
        return cache[n]

    problems, seen, pages, examples, quizzes = [], {}, 0, 0, 0
    for path in guide_pages():
        rel = os.path.relpath(path, REPO)
        with open(path, encoding='utf-8') as f:
            text = f.read()
        pages += 1
        before = len(seen)
        problems += check_quizzes(rel, text, seen)
        quizzes += len(seen) - before
        examples += len(java_blocks(text))
        problems += check_examples(rel, text, files_for, cutoff, args.show)
    for p in problems:
        print('FAIL ' + p)
    print(f'{pages} study-guide pages, {quizzes} quizzes, {examples} code examples checked; '
          f'{len(problems)} problems')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
