#!/usr/bin/env python3
"""Check the claims registry against the lessons' hidden claim markers.

    python3 tools/claims/check_claims.py [--root DIR] [--strict] [--quiet]

The registry is every `tools/claims/registry/*.toml` file: one `[[claim]]` table per claim a
lesson makes about how a library behaves (see docs/lesson-plan-v3-claims-tests.md). A lesson
points at a claim with a hidden comment, right after the sentence that relies on it:

    It lags about 9 cm. <!-- claim: l18.kv-zeroed-lag -->

or, on its own line with a blank line after it, above a table or a figure. One marker may
name several claims, separated by commas.

Errors (exit status 1): a registry file that doesn't parse; a claim with a missing, unknown
or malformed field; a duplicate id; an id whose prefix doesn't match its file (`lesson-18.toml`
holds `l18.*`, `bline.toml` holds `bline.*`); a `test` path that doesn't exist; a marker that
names an unknown claim, is malformed, sits inside a code block (where it would show as text),
or stands on its own line with no blank line after it (kramdown then breaks a table below it).

A claim no lesson marks is a warning, or an error with --strict.

--root checks another copy of the repo; the git pre-commit hook uses it on a checkout of the
index, so it checks what is being committed rather than the working tree.
"""

import argparse
import glob
import math
import os
import re
import sys
import tomllib
from dataclasses import dataclass, field

KINDS = {'api', 'behaviour', 'number'}
CRITICALITIES = {'C1', 'C2', 'C3'}
LIBRARIES = {'wpilib', 'commandsv3', 'gradlerio', 'wpilib-tools', 'phoenix6', 'advantagekit',
             'limelightlib', 'bline'}
REQUIRED = ('id', 'kind', 'library', 'criticality', 'statement', 'evidence', 'measured_on')
OPTIONAL = ('test', 'unit', 'range', 'wording', 'measured', 'method', 'note', 'figure')
NUMBER_ONLY = ('unit', 'range', 'wording')

ID = r'[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+'
ID_RE = re.compile(r'^' + ID + r'$')
MARKER_RE = re.compile(r'<!--\s*claim:\s*(' + ID + r'(?:\s*,\s*' + ID + r')*)\s*-->')
CLAIMISH_RE = re.compile(r'<!--[^>]*?\bclaims?\b', re.IGNORECASE)
FENCE_RE = re.compile(r'^\s*(`{3,}|~{3,})')

REGISTRY_DIR = os.path.join('tools', 'claims', 'registry')
LESSONS_DIR = os.path.join('docs', 'lessons', 'v3')


@dataclass
class Result:
    claims: dict = field(default_factory=dict)     # id -> (file, claim table)
    markers: list = field(default_factory=list)    # (lesson file, line number, id)
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


def expected_prefix(stem):
    """`lesson-18` holds `l18.*`; any other file holds claims named after it."""
    m = re.fullmatch(r'lesson-(\d\d)', stem)
    return 'l' + m.group(1) if m else stem


def check_claim(claim, where, root, errors):
    for key in REQUIRED:
        if key not in claim:
            errors.append(f'{where}: missing required field "{key}"')
    for key in claim:
        if key not in REQUIRED and key not in OPTIONAL:
            errors.append(f'{where}: unknown field "{key}"')
    for key in ('id', 'kind', 'criticality', 'statement', 'evidence', 'measured_on', 'test',
                'unit', 'wording', 'measured', 'method', 'note', 'figure'):
        if key in claim and not isinstance(claim[key], str):
            errors.append(f'{where}: "{key}" must be a string')
    if isinstance(claim.get('id'), str) and not ID_RE.match(claim['id']):
        errors.append(f'{where}: malformed id "{claim["id"]}" (lowercase words joined by dots)')
    if 'kind' in claim and claim['kind'] not in KINDS:
        errors.append(f'{where}: kind "{claim["kind"]}" is not one of {sorted(KINDS)}')
    if 'criticality' in claim and claim['criticality'] not in CRITICALITIES:
        errors.append(f'{where}: criticality "{claim["criticality"]}" is not one of {sorted(CRITICALITIES)}')
    libs = claim.get('library')
    if 'library' in claim:
        if not isinstance(libs, list) or not libs:
            errors.append(f'{where}: "library" must be a non-empty list')
        else:
            for lib in libs:
                if lib not in LIBRARIES:
                    errors.append(f'{where}: library "{lib}" is not one of {sorted(LIBRARIES)}')
    if claim.get('kind') == 'number':
        for key in ('unit', 'range'):
            if key not in claim:
                errors.append(f'{where}: a number claim needs "{key}"')
        rng = claim.get('range')
        if 'range' in claim:
            ok = (isinstance(rng, list) and len(rng) == 2
                  and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in rng)
                  and not any(isinstance(v, float) and math.isnan(v) for v in rng))
            if not ok:
                errors.append(f'{where}: "range" must be two numbers [low, high] (inf is allowed)')
            elif rng[0] > rng[1]:
                errors.append(f'{where}: "range" is backwards: {rng}')
    elif 'kind' in claim:
        for key in NUMBER_ONLY:
            if key in claim:
                errors.append(f'{where}: "{key}" is only for number claims')
    test = claim.get('test')
    if isinstance(test, str) and test:
        path = test.split('#', 1)[0]
        if not os.path.exists(os.path.join(root, path)):
            errors.append(f'{where}: test "{path}" does not exist')


def load_registry(root, result):
    for path in sorted(glob.glob(os.path.join(root, REGISTRY_DIR, '*.toml'))):
        name = os.path.basename(path)
        try:
            with open(path, 'rb') as f:
                data = tomllib.load(f)
        except (tomllib.TOMLDecodeError, UnicodeDecodeError) as e:
            result.errors.append(f'{REGISTRY_DIR}/{name}: does not parse: {e}')
            continue
        for key in data:
            if key != 'claim':
                result.errors.append(f'{REGISTRY_DIR}/{name}: unexpected top-level "{key}" (only [[claim]] tables)')
        claims = data.get('claim', [])
        if not isinstance(claims, list):
            result.errors.append(f'{REGISTRY_DIR}/{name}: "claim" must be [[claim]] tables')
            continue
        prefix = expected_prefix(os.path.splitext(name)[0])
        for i, claim in enumerate(claims, 1):
            cid = claim.get('id') if isinstance(claim.get('id'), str) else None
            where = f'{REGISTRY_DIR}/{name}: claim {i}' + (f' ({cid})' if cid else '')
            check_claim(claim, where, root, result.errors)
            if cid is None:
                continue
            if not cid.startswith(prefix + '.'):
                result.errors.append(f'{where}: id must have the prefix "{prefix}." in {name}')
            if cid in result.claims:
                other = result.claims[cid][0]
                result.errors.append(f'{where}: duplicate id, already in {other}')
            else:
                result.claims[cid] = (name, claim)


def scan_lessons(root, result):
    for path in sorted(glob.glob(os.path.join(root, LESSONS_DIR, '*.md'))):
        name = os.path.basename(path)
        with open(path, encoding='utf-8') as f:
            lines = f.read().split('\n')
        fence = None
        for n, line in enumerate(lines, 1):
            where = f'{LESSONS_DIR}/{name}:{n}'
            m = FENCE_RE.match(line)
            if m:
                mark = m.group(1)
                if fence is None:
                    fence = mark
                elif mark[0] == fence[0] and len(mark) >= len(fence) and line.strip() == mark:
                    fence = None
                continue
            good = list(MARKER_RE.finditer(line))
            claimish = CLAIMISH_RE.findall(line)
            if fence is not None:
                if good or claimish:
                    result.errors.append(f'{where}: claim marker inside a code block (it would show as text)')
                continue
            if len(claimish) > len(good):
                result.errors.append(f'{where}: malformed claim marker; write <!-- claim: some.id --> '
                                     '(lowercase ids, commas between several)')
            for g in good:
                for cid in (s.strip() for s in g.group(1).split(',')):
                    result.markers.append((name, n, cid))
                    if cid not in result.claims:
                        result.errors.append(f'{where}: marker names unknown claim "{cid}"')
            if good and MARKER_RE.sub('', line).strip() == '' and n < len(lines) and lines[n].strip() != '':
                result.errors.append(f'{where}: a marker on its own line needs a blank line after it')


def check(root, strict=False):
    result = Result()
    load_registry(root, result)
    scan_lessons(root, result)
    marked = {cid for _, _, cid in result.markers}
    for cid, (name, _) in sorted(result.claims.items()):
        if cid not in marked:
            msg = f'{REGISTRY_DIR}/{name}: claim "{cid}" is not marked in any lesson'
            (result.errors if strict else result.warnings).append(msg)
    return result


def summary(result):
    kinds = {}
    untested = 0
    for _, claim in result.claims.values():
        key = (claim.get('kind', '?'), claim.get('criticality', '?'))
        kinds[key] = kinds.get(key, 0) + 1
        if not claim.get('test'):
            untested += 1
    parts = ', '.join(f'{n} {k} {c}' for (k, c), n in sorted(kinds.items()))
    return (f'{len(result.claims)} claims ({parts or "none"}), {len(result.markers)} markers, '
            f'{untested} with no kept probe or test yet')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--root', default=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    ap.add_argument('--strict', action='store_true', help='an unmarked claim is an error')
    ap.add_argument('--quiet', action='store_true', help='print only errors')
    args = ap.parse_args(argv)
    result = check(args.root, strict=args.strict)
    for e in result.errors:
        print('ERROR ' + e)
    if not args.quiet:
        for w in result.warnings:
            print('warning ' + w)
        print(summary(result))
    return 1 if result.errors else 0


if __name__ == '__main__':
    sys.exit(main())
