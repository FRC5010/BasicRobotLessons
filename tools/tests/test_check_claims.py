"""Tests for tools/claims/check_claims.py — run with:

    python3 -m unittest discover -s tools/tests -v

Each test builds a tiny repo (a registry and a lessons folder) in a temporary directory, so the
rules are checked one at a time. The last class checks the real repo.
"""

import io
import os
import sys
import tempfile
import textwrap
import unittest
from contextlib import redirect_stdout

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(TOOLS, 'claims'))

import check_claims as cc  # noqa: E402

REPO = os.path.dirname(TOOLS)

GOOD_LIBRARY = '''
[[claim]]
id = "commandsv3.when-exited-on-cancel"
kind = "behaviour"
library = ["commandsv3"]
criticality = "C1"
statement = "whenExited runs on finish and on cancel."
evidence = "CLAUDE.md, New Commands V3 API"
measured_on = "alpha-8"
'''

GOOD_LESSON = '''
[[claim]]
id = "l18.kv-zeroed-lag"
kind = "number"
library = ["phoenix6", "wpilib"]
criticality = "C2"
statement = "With kV zeroed the elevator lags about 9 cm."
evidence = "CLAUDE.md, Lessons 7-22 re-measure"
measured_on = "alpha-8"
wording = "about 9 cm"
unit = "mm"
range = [85.0, 95.0]
'''

GOOD_MD = '''# Lesson 18 — Elevator

It lags about 9 cm. <!-- claim: l18.kv-zeroed-lag -->

Commands clean up on exit. <!-- claim: commandsv3.when-exited-on-cancel -->
'''


class Fixture:
    """A throwaway repo root with a registry and a lessons folder."""

    def __init__(self, registry=None, lessons=None, files=None):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        reg = os.path.join(self.root, 'tools', 'claims', 'registry')
        les = os.path.join(self.root, 'docs', 'lessons', 'v3')
        os.makedirs(reg)
        os.makedirs(les)
        if registry is None:
            registry = {'commandsv3.toml': GOOD_LIBRARY, 'lesson-18.toml': GOOD_LESSON}
        if lessons is None:
            lessons = {'18-elevator.md': GOOD_MD}
        for name, text in registry.items():
            with open(os.path.join(reg, name), 'w', encoding='utf-8') as f:
                f.write(textwrap.dedent(text))
        for name, text in lessons.items():
            with open(os.path.join(les, name), 'w', encoding='utf-8') as f:
                f.write(text)
        for rel, text in (files or {}).items():
            path = os.path.join(self.root, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)

    def check(self, strict=False):
        return cc.check(self.root, strict=strict)

    def close(self):
        self.tmp.cleanup()


def run(registry=None, lessons=None, files=None, strict=False):
    fx = Fixture(registry, lessons, files)
    try:
        return fx.check(strict)
    finally:
        fx.close()


def joined(messages):
    return '\n'.join(messages)


class Clean(unittest.TestCase):
    def test_a_clean_repo_passes(self):
        result = run()
        self.assertEqual(result.errors, [])
        self.assertEqual(result.warnings, [])

    def test_counts_markers_and_claims(self):
        result = run()
        self.assertEqual(len(result.claims), 2)
        self.assertEqual(len(result.markers), 2)

    def test_one_marker_can_name_several_claims(self):
        md = '# L\n\nBoth. <!-- claim: l18.kv-zeroed-lag, commandsv3.when-exited-on-cancel -->\n'
        result = run(lessons={'18-elevator.md': md})
        self.assertEqual(result.errors, [])
        self.assertEqual(len(result.markers), 2)

    def test_an_own_line_marker_with_a_blank_line_after_is_fine(self):
        md = ('# L\n\n<!-- claim: l18.kv-zeroed-lag -->\n\n| a | b |\n|---|---|\n'
              '\nX. <!-- claim: commandsv3.when-exited-on-cancel -->\n')
        self.assertEqual(run(lessons={'18-elevator.md': md}).errors, [])

    def test_infinity_is_allowed_for_a_one_sided_range(self):
        reg = GOOD_LESSON.replace('range = [85.0, 95.0]', 'range = [100.0, inf]')
        result = run(registry={'commandsv3.toml': GOOD_LIBRARY, 'lesson-18.toml': reg})
        self.assertEqual(result.errors, [])


class Markers(unittest.TestCase):
    def test_an_unknown_id_is_an_error_naming_file_and_line(self):
        md = GOOD_MD + '\nTypo. <!-- claim: l18.kv-zerod-lag -->\n'
        errors = joined(run(lessons={'18-elevator.md': md}).errors)
        self.assertIn('18-elevator.md:7', errors)
        self.assertIn('l18.kv-zerod-lag', errors)

    def test_a_marker_inside_a_code_block_is_an_error(self):
        md = GOOD_MD + '\n```java\nint x = 1; // <!-- claim: l18.kv-zeroed-lag -->\n```\n'
        errors = joined(run(lessons={'18-elevator.md': md}).errors)
        self.assertIn('code block', errors)

    def test_a_marker_inside_an_indented_tilde_fence_is_an_error(self):
        md = GOOD_MD + '\n1. Step\n\n   ~~~\n   <!-- claim: l18.kv-zeroed-lag -->\n   ~~~\n'
        self.assertIn('code block', joined(run(lessons={'18-elevator.md': md}).errors))

    def test_a_marker_after_a_closed_fence_is_fine(self):
        md = '# L\n\n```java\nint x;\n```\n\nA. <!-- claim: l18.kv-zeroed-lag -->\n' \
             'B. <!-- claim: commandsv3.when-exited-on-cancel -->\n'
        self.assertEqual(run(lessons={'18-elevator.md': md}).errors, [])

    def test_malformed_markers_are_errors(self):
        for bad in ['<!-- claims: l18.kv-zeroed-lag -->', '<!-- claim l18.kv-zeroed-lag -->',
                    '<!-- Claim: l18.kv-zeroed-lag -->', '<!-- claim: -->',
                    '<!-- claim: L18.Kv -->', '<!-- claim: l18.kv-zeroed-lag; x.y -->']:
            with self.subTest(bad=bad):
                md = GOOD_MD + '\nBad. ' + bad + '\n'
                errors = joined(run(lessons={'18-elevator.md': md}).errors)
                self.assertIn('18-elevator.md:7', errors)

    def test_an_ordinary_comment_is_ignored(self):
        md = GOOD_MD + '\n<!-- a note to editors -->\n\nText.\n'
        self.assertEqual(run(lessons={'18-elevator.md': md}).errors, [])

    def test_an_own_line_marker_needs_a_blank_line_after_it(self):
        md = GOOD_MD + '\n<!-- claim: l18.kv-zeroed-lag -->\n| a | b |\n|---|---|\n'
        errors = joined(run(lessons={'18-elevator.md': md}).errors)
        self.assertIn('blank line', errors)

    def test_an_own_line_marker_at_the_end_of_the_file_is_fine(self):
        md = GOOD_MD + '\n<!-- claim: l18.kv-zeroed-lag -->\n'
        self.assertEqual(run(lessons={'18-elevator.md': md}).errors, [])


class Registry(unittest.TestCase):
    def errors_for(self, lesson_toml):
        return joined(run(registry={'commandsv3.toml': GOOD_LIBRARY,
                                    'lesson-18.toml': lesson_toml}).errors)

    def test_a_parse_error_names_the_file(self):
        self.assertIn('lesson-18.toml', self.errors_for('[[claim]]\nid = "l18.x\n'))

    def test_a_duplicate_id_is_an_error(self):
        reg = GOOD_LESSON + GOOD_LESSON
        self.assertIn('duplicate', self.errors_for(reg))

    def test_a_missing_required_field_is_an_error(self):
        self.assertIn('evidence', self.errors_for(GOOD_LESSON.replace(
            'evidence = "CLAUDE.md, Lessons 7-22 re-measure"\n', '')))

    def test_an_unknown_field_is_an_error(self):
        self.assertIn('rnage', self.errors_for(GOOD_LESSON + 'rnage = [1, 2]\n'))

    def test_a_bad_kind_criticality_or_library_is_an_error(self):
        for old, new in [('kind = "number"', 'kind = "numbr"'),
                         ('criticality = "C2"', 'criticality = "C4"'),
                         ('library = ["phoenix6", "wpilib"]', 'library = ["phoenix7"]'),
                         ('library = ["phoenix6", "wpilib"]', 'library = []')]:
            with self.subTest(new=new):
                self.assertNotEqual(self.errors_for(GOOD_LESSON.replace(old, new)), '')

    def test_a_number_needs_a_unit_and_a_range(self):
        self.assertIn('range', self.errors_for(GOOD_LESSON.replace('range = [85.0, 95.0]\n', '')))
        self.assertIn('unit', self.errors_for(GOOD_LESSON.replace('unit = "mm"\n', '')))

    def test_a_backwards_or_malformed_range_is_an_error(self):
        for bad in ['range = [95.0, 85.0]', 'range = [85.0]', 'range = ["a", "b"]']:
            with self.subTest(bad=bad):
                self.assertIn('range', self.errors_for(GOOD_LESSON.replace('range = [85.0, 95.0]', bad)))

    def test_a_behaviour_claim_may_not_have_a_range(self):
        lib = GOOD_LIBRARY + 'range = [1.0, 2.0]\nunit = "s"\n'
        errors = joined(run(registry={'commandsv3.toml': lib, 'lesson-18.toml': GOOD_LESSON}).errors)
        self.assertIn('range', errors)

    def test_a_test_path_must_exist(self):
        reg = GOOD_LESSON + 'test = "tools/figures/probes/Missing.java#method"\n'
        self.assertIn('Missing.java', self.errors_for(reg))

    def test_an_existing_test_path_is_fine(self):
        reg = GOOD_LESSON + 'test = "tools/figures/probes/Fig18.java#method"\n'
        result = run(registry={'commandsv3.toml': GOOD_LIBRARY, 'lesson-18.toml': reg},
                     files={'tools/figures/probes/Fig18.java': 'class Fig18 {}\n'})
        self.assertEqual(result.errors, [])

    def test_the_id_prefix_must_match_the_file(self):
        self.assertIn('prefix', self.errors_for(GOOD_LESSON.replace('l18.kv-zeroed-lag', 'l17.kv-zeroed-lag')))
        lib = GOOD_LIBRARY.replace('commandsv3.when', 'wpilib.when')
        errors = joined(run(registry={'commandsv3.toml': lib, 'lesson-18.toml': GOOD_LESSON}).errors)
        self.assertIn('prefix', errors)

    def test_a_file_with_no_claims_is_fine(self):
        result = run(registry={'commandsv3.toml': GOOD_LIBRARY, 'lesson-18.toml': GOOD_LESSON,
                               'bline.toml': '# nothing yet\n'})
        self.assertEqual(result.errors, [])


class Unmarked(unittest.TestCase):
    MD = '# L\n\nIt lags about 9 cm. <!-- claim: l18.kv-zeroed-lag -->\n'

    def test_an_unmarked_claim_is_a_warning(self):
        result = run(lessons={'18-elevator.md': self.MD})
        self.assertEqual(result.errors, [])
        self.assertIn('commandsv3.when-exited-on-cancel', joined(result.warnings))

    def test_strict_makes_it_an_error(self):
        result = run(lessons={'18-elevator.md': self.MD}, strict=True)
        self.assertIn('commandsv3.when-exited-on-cancel', joined(result.errors))


class Main(unittest.TestCase):
    def test_exit_status_follows_the_errors(self):
        fx = Fixture()
        try:
            with redirect_stdout(io.StringIO()):
                self.assertEqual(cc.main(['--root', fx.root]), 0)
            with open(os.path.join(fx.root, 'docs', 'lessons', 'v3', '18-elevator.md'), 'a') as f:
                f.write('\nX. <!-- claim: nope.nope -->\n')
            out = io.StringIO()
            with redirect_stdout(out):
                self.assertEqual(cc.main(['--root', fx.root]), 1)
            self.assertIn('nope.nope', out.getvalue())
        finally:
            fx.close()


class RealRepo(unittest.TestCase):
    """The repo itself must pass (without --strict until Phase 0 is finished)."""

    def test_the_repo_passes(self):
        result = cc.check(REPO, strict=False)
        self.assertEqual(result.errors, [], joined(result.errors))


if __name__ == '__main__':
    unittest.main()
