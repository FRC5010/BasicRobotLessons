"""Tests for tools/check-lesson-code-v3.py — run with:

    python3 -m unittest discover -s tools/tests -v

The pure functions are tested on small Java snippets; check_lesson on a lesson file written to a
temporary directory against a hand-made "code after the lesson"; and the last class runs the real
Lesson 18 against its real reference code, then breaks one token of that code.
"""

import importlib.util
import os
import tempfile
import textwrap
import unittest

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location('clc', os.path.join(TOOLS, 'check-lesson-code-v3.py'))
clc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(clc)

ELEVATOR = textwrap.dedent('''\
    package first.robot.subsystems;

    import org.wpilib.command3.Mechanism;
    import org.wpilib.command3.Command;

    public class Elevator implements Mechanism {
      private final ElevatorIO m_io;
      private double m_goal = 0.0;   // meters

      public Elevator() {
        m_io = new ElevatorIOSim();
        Scheduler.getDefault().addPeriodic(this::periodic);
      }

      public Command goToHeight(double meters) {
        return runRepeatedly(() -> {
          m_goal = meters;
          m_io.setPosition(meters);
        }).named("Go To Height");
      }

      private void periodic() {
        m_io.updateInputs();
      }
    }
    ''')


def lesson(*blocks, try_it=()):
    """A lesson file made of (lead-in, code) pairs, with an optional Try it section."""
    parts = ['# Lesson 18 — Test', '', '## 1. Build it', '']
    for lead, code in blocks:
        parts += [lead, '', '```java', textwrap.dedent(code).strip('\n'), '```', '']
    if try_it:
        parts += ['## Try it', '']
        for lead, code in try_it:
            parts += [lead, '', '```java', textwrap.dedent(code).strip('\n'), '```', '']
    return '\n'.join(parts)


def run(text, files=None, exceptions=()):
    files = files or {'subsystems/Elevator.java': ELEVATOR.split('\n')}
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, '18-test.md')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        return clc.check_lesson(18, path, files, list(exceptions), out=lambda *a: None)


class Tokens(unittest.TestCase):
    def test_comments_go_strings_stay(self):
        self.assertEqual(clc.tokens('x = "a // b"; // gone\n/* gone */ y'),
                         ['x', '=', '"a // b"', ';', 'y'])

    def test_whitespace_and_line_breaks_dont_matter(self):
        self.assertEqual(clc.tokens('foo(1,\n    2);'), clc.tokens('foo(1, 2);'))

    def test_units_split_lambda_bodies_into_statements(self):
        us = clc.units('runRepeatedly(() -> { a = 1; b = 2; }).named("x");')
        self.assertIn(['a', '=', '1', ';'], us)
        self.assertIn(['b', '=', '2', ';'], us)

    def test_a_for_header_is_one_unit(self):
        us = clc.units('for (int i = 0; i < n; i++) { x(); }')
        self.assertEqual(us[0][:2], ['for', '('])
        self.assertIn('{', us[0])


class Matching(unittest.TestCase):
    seq = clc.tokens(ELEVATOR)

    def test_statements_in_order_with_code_between(self):
        code = 'public Elevator() {\n  // ...\n  Scheduler.getDefault().addPeriodic(this::periodic);\n}'
        self.assertIsNone(clc.present_in(code, self.seq)[2])

    def test_a_changed_statement_is_reported(self):
        code = 'm_io.setPosition(meters * 2);'
        self.assertEqual(clc.present_in(code, self.seq)[2], clc.units(code)[0])

    def test_imports_match_in_any_order(self):
        code = 'import org.wpilib.command3.Command;\nimport org.wpilib.command3.Mechanism;'
        self.assertIsNone(clc.present_in(code, self.seq)[2])

    def test_members_match_in_any_order(self):
        code = ('private void periodic() {\n  m_io.updateInputs();\n}\n'
                'public Elevator() {\n  m_io = new ElevatorIOSim();\n}')
        self.assertIsNone(clc.present_in(code, self.seq)[2])

    def test_statements_inside_a_member_must_keep_their_order(self):
        code = 'public Elevator() {\n  Scheduler.getDefault().addPeriodic(this::periodic);\n  m_io = new ElevatorIOSim();\n}'
        self.assertIsNotNone(clc.present_in(code, self.seq)[2])


class Parsing(unittest.TestCase):
    def kinds(self, text):
        return [b.kind for b in clc.parse_blocks(18, 'x.md', text)]

    def test_lead_ins_decide_the_kind(self):
        text = lesson(('**Add to `Elevator`:**', 'int a;'),
                      ('*Nothing to add — this is how it is used:*', 'int b;'),
                      ('**Delete from `Elevator`:**', 'int c;'),
                      ('**And its twin:**', '// DELETE from driveDistance:\nint d;'),
                      ('Some prose with no lead-in:', 'int e;'),
                      ('1. **Code — inside a list item:**', 'int f;'),
                      try_it=[('**Add to `Elevator`:**', 'int g;')])
        self.assertEqual(self.kinds(text), ['present', 'illustration', 'absent', 'absent',
                                            'no-lead-in', 'present', 'try-it'])


class CheckLesson(unittest.TestCase):
    def test_a_matching_lesson_passes(self):
        text = lesson(('**Add to `Elevator`:**', '''
            public Command goToHeight(double meters) {
              return runRepeatedly(() -> {
                // ... the goal ...
                m_io.setPosition(meters);
              }).named("Go To Height");
            }'''))
        checked, fails, problems = run(text)
        self.assertEqual((checked, fails, problems), (1, [], []))

    def test_a_stale_block_fails_naming_the_line(self):
        text = lesson(('**Add to `Elevator`:**', 'm_io.setPositionMeters(meters);'))
        checked, fails, problems = run(text)
        self.assertEqual(len(fails), 1)
        self.assertIn('18-test.md:7', fails[0])
        self.assertIn('setPositionMeters', fails[0])

    def test_a_deleted_block_still_present_fails(self):
        text = lesson(('**Delete from `Elevator`:**', 'm_io.updateInputs();'))
        self.assertEqual(len(run(text)[1]), 1)

    def test_a_deleted_block_that_is_gone_passes(self):
        text = lesson(('**Delete from `Elevator`:**', 'm_io.resetEverything();'))
        self.assertEqual(run(text)[1], [])

    def test_illustrations_and_try_its_are_not_checked(self):
        text = lesson(('*Nothing to add — the wrong version:*', 'nonsense();'),
                      try_it=[('**Code — add a preset:**', 'alsoNonsense();')])
        self.assertEqual(run(text), (0, [], []))

    def test_an_exception_skips_its_block(self):
        text = lesson(('**Add to `Elevator`:**', 'm_io.setPositionMeters(meters);'))
        exc = [{'lesson': 18, 'block': 'setPositionMeters', 'reason': 'staged'}]
        self.assertEqual(run(text, exceptions=exc), (0, [], []))

    def test_an_exception_matching_nothing_is_a_problem(self):
        text = lesson(('**Add to `Elevator`:**', 'm_io.updateInputs();'))
        exc = [{'lesson': 18, 'block': 'notThere', 'reason': 'staged'}]
        self.assertIn('matches no checked block', run(text, exceptions=exc)[2][0])

    def test_an_exception_whose_block_now_passes_is_a_problem(self):
        text = lesson(('**Add to `Elevator`:**', 'm_io.updateInputs();'))
        exc = [{'lesson': 18, 'block': 'updateInputs', 'reason': 'staged'}]
        self.assertIn('now checks out', run(text, exceptions=exc)[2][0])

    def test_an_exception_matching_two_blocks_is_a_problem(self):
        text = lesson(('**Add to `Elevator`:**', 'stale(); m_io.updateInputs();'),
                      ('**Add to `Elevator`:**', 'stale(); m_goal = meters;'))
        exc = [{'lesson': 18, 'block': 'stale();', 'reason': 'staged'}]
        self.assertTrue(any('more than one block' in p for p in run(text, exceptions=exc)[2]))


class RealLesson(unittest.TestCase):
    """Lesson 18 against its real reference code: it passes, and one changed token fails it."""

    @classmethod
    def setUpClass(cls):
        with tempfile.TemporaryDirectory() as tmp:
            cls.files = clc.markers.build_state(18, tmp)
        cls.path = clc.lesson_files()[18]
        cls.exceptions = clc.load_exceptions()

    def test_lesson_18_passes(self):
        checked, fails, problems = clc.check_lesson(18, self.path, self.files, self.exceptions, out=lambda *a: None)
        self.assertGreaterEqual(checked, 5)
        self.assertEqual(fails + problems, [])

    def test_a_drifted_reference_fails_lesson_18(self):
        files = dict(self.files)
        name = 'subsystems/ElevatorIOTalonFX.java'
        self.assertIn('getClosedLoopReference', '\n'.join(files[name]))
        files[name] = [l.replace('getClosedLoopReference', 'getClosedLoopTarget') for l in files[name]]
        checked, fails, problems = clc.check_lesson(18, self.path, files, self.exceptions, out=lambda *a: None)
        self.assertTrue(any('getClosedLoopReference' in f for f in fails), fails)


if __name__ == '__main__':
    unittest.main()
