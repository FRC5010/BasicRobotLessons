"""Tests for tools/lib/patch_build_gradle.py — run with:

    python3 -m unittest discover -s tools/tests -v
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))

import patch_build_gradle as pbg  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE = os.path.join(REPO, 'code', 'OpModeV3Robot', 'build.gradle')

GUI_ON = 'wpi.sim.addGui().defaultEnabled = true'


def template():
    with open(TEMPLATE, encoding='utf-8', newline='') as f:
        return f.read()


class Template(unittest.TestCase):
    """The base project is what every student starts from, so check it first."""

    def test_template_has_the_line_the_patch_edits(self):
        self.assertEqual(template().count(GUI_ON), 1)

    def test_template_has_no_advantagekit_yet(self):
        self.assertNotIn('akit-autolog', template())


class Patch(unittest.TestCase):
    def test_adds_the_annotation_processor_and_replay_watch(self):
        text, changes = pbg.patch(template())
        self.assertIn('annotationProcessor "org.littletonrobotics.akit:akit-autolog:$akitJson.version"', text)
        self.assertIn('vendordeps/AdvantageKit.json', text)
        self.assertIn('org.littletonrobotics.junction.ReplayWatch', text)
        self.assertTrue(any('annotation processor' in c for c in changes))

    def test_turns_the_gui_off_only_for_replay(self):
        text, changes = pbg.patch(template())
        self.assertNotIn(GUI_ON, text)
        self.assertIn('wpi.sim.addGui().defaultEnabled = System.getenv("AKIT_LOG_PATH") == null', text)
        self.assertEqual(text.count('wpi.sim.addGui()'), 1)  # edited, not added twice
        self.assertTrue(any('Sim GUI' in c for c in changes))

    def test_everything_else_is_untouched(self):
        before = template()
        text, _ = pbg.patch(before)
        gui = before.index(GUI_ON)
        # Up to the edited line, byte for byte.
        self.assertTrue(text.startswith(before[:gui]))
        # And every line of the original is still there except the edited one.
        kept = [line for line in before.splitlines() if line != GUI_ON]
        after = text.splitlines()
        for line in kept:
            self.assertIn(line, after)

    def test_second_run_changes_nothing(self):
        once, _ = pbg.patch(template())
        twice, changes = pbg.patch(once)
        self.assertEqual(once, twice)
        self.assertEqual(changes, [])

    def test_keeps_windows_line_endings(self):
        crlf = template().replace('\r\n', '\n').replace('\n', '\r\n')
        text, _ = pbg.patch(crlf)
        self.assertNotIn('\n', text.replace('\r\n', ''))  # no bare LF crept in
        self.assertIn('defaultEnabled = System.getenv("AKIT_LOG_PATH") == null\r\n', text)

    def test_leaves_a_gui_line_the_student_changed(self):
        mine = template().replace(GUI_ON, 'wpi.sim.addGui().defaultEnabled = false // I prefer it off')
        text, changes = pbg.patch(mine)
        self.assertIn('wpi.sim.addGui().defaultEnabled = false // I prefer it off', text)
        self.assertFalse(any('Sim GUI' in c for c in changes))

    def test_a_hand_added_processor_is_not_added_again(self):
        mine = template() + '\ndependencies {\n    annotationProcessor "org.littletonrobotics.akit:akit-autolog:27.0.0-alpha-7"\n}\n'
        text, changes = pbg.patch(mine)
        self.assertEqual(text.count('akit-autolog'), 1)
        self.assertFalse(any('annotation processor' in c for c in changes))


class CommandLine(unittest.TestCase):
    def test_rewrites_the_file_in_place_and_reports(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'build.gradle')
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(template())
            report = pbg.main([path])
            with open(path, encoding='utf-8', newline='') as f:
                self.assertIn('akit-autolog', f.read())
            self.assertTrue(report)
            self.assertEqual(pbg.main([path]), [])


if __name__ == '__main__':
    unittest.main()
