"""Tests for tools/check-study-guide.py — run with:

    python3 -m unittest discover -s tools/tests -v

The quiz rules and the source tags are tested on small pages against a hand-made "code after the
lesson"; the last class checks one real example against the real Lesson 25 code, then breaks one
token of it.
"""

import importlib.util
import os
import tempfile
import textwrap
import unittest

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location('csg', os.path.join(TOOLS, 'check-study-guide.py'))
csg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(csg)

GOOD_QUIZ = textwrap.dedent('''\
    <details class="quiz" id="q-commands-1" markdown="1">
    <summary>Check yourself: which hook runs on a cancel?</summary>

    - [ ] Only the code after the loop. *A cancelled command isn't resumed.*
    - [x] `whenExited`, then `whenCanceled`. *Both run, in that order.*

    </details>
    ''')

SUPERSTRUCTURE = textwrap.dedent('''\
    package first.robot.subsystems;

    public class Superstructure {
      private SuperstructureState m_state = SuperstructureState.UNHOMED;

      public boolean isSettled() {
        return m_state == SuperstructureState.IDLE && m_elevator.atGoal() && m_arm.atGoal();
      }

      public Trigger inState(SuperstructureState state) {
        return new Trigger(() -> m_state == state);
      }
    }
    ''').split('\n')

FILES = {'subsystems/Superstructure.java': SUPERSTRUCTURE, 'Robot.java': ['class Robot {}']}


def quiz_problems(text, seen=None):
    return csg.check_quizzes('page.md', text, {} if seen is None else seen)


def example_problems(text, cutoff=33):
    return csg.check_examples('page.md', text, lambda n: FILES, cutoff)


def page(tag, code):
    return f'{tag}\n*Example, from `Superstructure.java`:*\n```java\n{code}\n```\n'


class Quizzes(unittest.TestCase):
    def test_a_good_quiz_passes(self):
        self.assertEqual(quiz_problems(GOOD_QUIZ), [])

    def test_ids_must_be_unique_across_pages(self):
        seen = {}
        quiz_problems(GOOD_QUIZ, seen)
        problems = quiz_problems(GOOD_QUIZ, seen)
        self.assertEqual(len(problems), 1)
        self.assertIn('already used', problems[0])

    def test_id_form(self):
        self.assertIn('should look like', quiz_problems(GOOD_QUIZ.replace('q-commands-1', 'Commands_1'))[0])
        self.assertIn('needs an id', quiz_problems(GOOD_QUIZ.replace(' id="q-commands-1"', ''))[0])

    def test_markdown_attribute(self):
        self.assertIn('markdown="1"', quiz_problems(GOOD_QUIZ.replace(' markdown="1"', ''))[0])

    def test_summary_prefix(self):
        self.assertIn('Check yourself', quiz_problems(GOOD_QUIZ.replace('Check yourself: w', 'W'))[0])

    def test_exactly_one_right_answer(self):
        none = quiz_problems(GOOD_QUIZ.replace('[x]', '[ ]'))
        two = quiz_problems(GOOD_QUIZ.replace('[ ]', '[x]'))
        self.assertTrue(any('found 0' in p for p in none))
        self.assertTrue(any('found 2' in p for p in two))

    def test_two_to_five_answers(self):
        one = GOOD_QUIZ.replace("- [ ] Only the code after the loop. *A cancelled command isn't resumed.*\n", '')
        self.assertTrue(any('two to five' in p for p in quiz_problems(one)))

    def test_every_answer_explained(self):
        bare = GOOD_QUIZ.replace(" *A cancelled command isn't resumed.*", '')
        self.assertTrue(any('needs an *explanation*' in p for p in quiz_problems(bare)))

    def test_explanation_doesnt_repeat_the_verdict(self):
        for opener in ('Right, both run.', 'Not quite: both run.'):
            text = GOOD_QUIZ.replace('*Both run, in that order.*', f'*{opener}*')
            self.assertTrue(any('"Right" or "Not quite"' in p for p in quiz_problems(text)), opener)

    def test_blank_lines_kramdown_needs(self):
        squashed = GOOD_QUIZ.replace('</summary>\n\n', '</summary>\n')
        self.assertTrue(any('blank line after' in p for p in quiz_problems(squashed)))
        squashed = GOOD_QUIZ.replace('order.*\n\n</details>', 'order.*\n</details>')
        self.assertTrue(any('blank line before' in p for p in quiz_problems(squashed)))

    def test_no_open_angle_bracket_in_the_question(self):
        text = GOOD_QUIZ.replace('which hook runs on a cancel?', 'what does a `Supplier<Pose2d>` hand back?')
        self.assertTrue(any("can't contain <" in p for p in quiz_problems(text)))
        # A lambda's arrow is fine: the site renders it.
        self.assertEqual(quiz_problems(GOOD_QUIZ.replace('which hook', 'in `() -> x`, which hook')), [])
        # Inside an answer it's fine: kramdown treats the list as Markdown.
        text = GOOD_QUIZ.replace('*Both run, in that order.*', '*A `Consumer<Coroutine>` runs.*')
        self.assertEqual(quiz_problems(text), [])

    def test_unclosed(self):
        self.assertIn('never closed', quiz_problems(GOOD_QUIZ.replace('</details>', ''))[-1])

    def test_other_details_blocks_are_ignored(self):
        self.assertEqual(quiz_problems('<details markdown="1">\n<summary>More</summary>\n\nText\n\n</details>\n'), [])


class Examples(unittest.TestCase):
    SNIPPET = ('public boolean isSettled() {\n'
               '  return m_state == SuperstructureState.IDLE && m_elevator.atGoal() && m_arm.atGoal();\n'
               '}')

    def test_a_copied_example_passes(self):
        self.assertEqual(example_problems(page('<!-- source: lesson-25 subsystems/Superstructure.java -->', self.SNIPPET)), [])

    def test_comments_and_anchors_dont_matter(self):
        code = '// ...\n' + self.SNIPPET.replace('{\n', '{  // ready for the next thing\n') + '\n// ...'
        self.assertEqual(example_problems(page('<!-- source: lesson-25 subsystems/Superstructure.java -->', code)), [])

    def test_a_changed_token_fails(self):
        problems = example_problems(page('<!-- source: lesson-25 subsystems/Superstructure.java -->',
                                         self.SNIPPET.replace('m_arm', 'm_wrist')))
        self.assertEqual(len(problems), 1)
        self.assertIn('not found in subsystems/Superstructure.java', problems[0])

    def test_no_file_searches_them_all(self):
        self.assertEqual(example_problems(page('<!-- source: lesson-25 -->', self.SNIPPET)), [])

    def test_an_example_needs_a_tag(self):
        problems = example_problems(f'Some text.\n\n```java\n{self.SNIPPET}\n```\n')
        self.assertIn('needs a source tag', problems[0])

    def test_the_tag_may_sit_above_the_lead_in_but_no_further(self):
        far = f'<!-- source: wrong -->\n\nOne.\n\nTwo.\n\n```java\n{self.SNIPPET}\n```\n'
        self.assertIn('needs a source tag', example_problems(far)[0])

    def test_a_wrong_example_isnt_checked(self):
        self.assertEqual(example_problems(page('<!-- source: wrong -->', 'int x = nonsense();')), [])

    def test_a_missing_file(self):
        problems = example_problems(page('<!-- source: lesson-25 subsystems/Wrist.java -->', self.SNIPPET))
        self.assertIn('no file subsystems/Wrist.java', problems[0])

    def test_a_malformed_tag(self):
        problems = example_problems(page('<!-- source: Superstructure.java -->', self.SNIPPET))
        self.assertIn('should read', problems[0])

    def test_past_the_cut_off(self):
        problems = example_problems(page('<!-- source: lesson-34 -->', self.SNIPPET), cutoff=33)
        self.assertIn('past the cut-off', problems[0])

    def test_non_java_blocks_are_ignored(self):
        self.assertEqual(example_problems('```powershell\n./gradlew run\n```\n'), [])


class RealCode(unittest.TestCase):
    """One example against the real code after Lesson 25, built through the shared lib."""

    @classmethod
    def setUpClass(cls):
        with tempfile.TemporaryDirectory() as tmp:
            cls.files = csg.lessoncode.markers.build_state(25, tmp)

    def check(self, code):
        return csg.check_examples('page.md', page('<!-- source: lesson-25 subsystems/Superstructure.java -->', code),
                                  lambda n: self.files, 33)

    def test_the_real_method_passes(self):
        self.assertEqual(self.check(Examples.SNIPPET), [])

    def test_one_broken_token_fails(self):
        self.assertEqual(len(self.check(Examples.SNIPPET.replace('IDLE', 'HOLDING'))), 1)


if __name__ == '__main__':
    unittest.main()
