"""Tests for tools/update_lesson_app.py's logic (everything but the window) — run with:

    python3 -m unittest discover -s tools/tests -v

None of these need Tk. The last one runs a real update, so it needs network
access for the vendordep download.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import unittest

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)

import update_lesson_app as app  # noqa: E402


def git(cwd, *args):
    env = dict(os.environ, GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@t',
               GIT_COMMITTER_NAME='t', GIT_COMMITTER_EMAIL='t@t')
    return subprocess.run(['git', '-C', cwd, *args], env=env, capture_output=True, text=True, check=True)


def make_project(root, commit=True):
    """A copy of the OpMode template, as a student would have it."""
    project = os.path.join(root, 'MyRobot')
    shutil.copytree(os.path.join(REPO, 'code', 'OpModeV3Robot'), project,
                    ignore=shutil.ignore_patterns('build', '.gradle'))
    if commit:
        git(project, 'init', '-q')
        git(project, 'add', '-A')
        git(project, 'commit', '-qm', 'template')
    return project


class Lessons(unittest.TestCase):
    def test_cutoff_is_the_one_the_scripts_use(self):
        out = subprocess.run(['bash', '-c', '. tools/lib/v3-lessons.sh; echo "$V3_ALPHA7_THROUGH"'],
                             cwd=REPO, capture_output=True, text=True, check=True)
        self.assertEqual(app.cutoff(), int(out.stdout))

    def test_lessons_run_from_1_to_the_cutoff_with_their_titles(self):
        lessons = app.lessons()
        self.assertEqual([n for n, _ in lessons], list(range(1, app.cutoff() + 1)))
        titles = dict(lessons)
        self.assertEqual(titles[7], 'Four modules')
        self.assertTrue(titles[app.cutoff()])

    def test_label_names_the_lesson_you_are_about_to_do(self):
        self.assertEqual(app.label(7, 'Four modules'), 'Lesson 7 — Four modules')
        self.assertEqual(app.lesson_from_label('Lesson 12 — Model-based control'), 12)


class FindingBash(unittest.TestCase):
    def test_windows_uses_git_bash_found_through_git(self):
        which = {'git': r'C:\Program Files\Git\cmd\git.exe',
                 'bash': r'C:\Windows\System32\bash.exe'}.get
        found = app.find_bash('win32', which=which, exists=lambda p: p.endswith(r'Git\bin\bash.exe'), env={})
        self.assertEqual(found, r'C:\Program Files\Git\bin\bash.exe')

    def test_windows_never_picks_wsl_bash(self):
        which = {'bash': r'C:\Windows\System32\bash.exe'}.get
        found = app.find_bash('win32', which=which, exists=lambda p: True, env={})
        self.assertNotIn('System32', found or '')

    def test_windows_finds_a_per_user_git_install(self):
        env = {'LOCALAPPDATA': r'C:\Users\a\AppData\Local'}
        want = r'C:\Users\a\AppData\Local\Programs\Git\bin\bash.exe'
        found = app.find_bash('win32', which=lambda name: None, exists=lambda p: p == want, env=env)
        self.assertEqual(found, want)

    def test_windows_without_git_finds_nothing(self):
        self.assertIsNone(app.find_bash('win32', which=lambda name: None, exists=lambda p: False, env={}))

    def test_this_machine(self):
        self.assertTrue(os.path.exists(app.find_bash()))


class ProjectChecks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_missing_folder(self):
        self.assertEqual(app.check_project(os.path.join(self.tmp, 'nope'))[0], 'missing')

    def test_folder_that_is_not_an_opmode_project(self):
        self.assertEqual(app.check_project(self.tmp)[0], 'not-project')

    def test_this_repo_is_refused(self):
        self.assertEqual(app.check_project(os.path.join(REPO, 'code', 'OpModeV3Robot'))[0], 'inside-repo')

    def test_not_under_git(self):
        project = make_project(self.tmp, commit=False)
        self.assertEqual(app.check_project(project)[0], 'not-git')

    def test_uncommitted_changes_are_counted(self):
        project = make_project(self.tmp)
        with open(os.path.join(project, 'src', 'main', 'java', 'first', 'robot', 'Robot.java'), 'a') as fh:
            fh.write('\n// my change\n')
        with open(os.path.join(project, 'notes.txt'), 'w') as fh:
            fh.write('todo')
        code, message = app.check_project(project)
        self.assertEqual(code, 'dirty')
        self.assertIn('2', message)

    def test_committed_project_is_ready(self):
        self.assertIsNone(app.check_project(make_project(self.tmp)))

    def test_commit_all_leaves_a_clean_project(self):
        project = make_project(self.tmp)
        with open(os.path.join(project, 'notes.txt'), 'w') as fh:
            fh.write('todo')
        env = dict(os.environ, GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@t',
                   GIT_COMMITTER_NAME='t', GIT_COMMITTER_EMAIL='t@t')
        ok, output = app.commit_all(project, 'Before updating to Lesson 3', env=env)
        self.assertTrue(ok, output)
        self.assertIsNone(app.check_project(project))
        self.assertIn('Before updating to Lesson 3', git(project, 'log', '-1', '--format=%s').stdout)


class Command(unittest.TestCase):
    def test_windows_paths_are_given_to_bash_with_forward_slashes(self):
        argv, env = app.command(8, r'C:\Users\a\MyRobot', r'C:\Program Files\Git\bin\bash.exe',
                                repo=r'C:\BRL', python=r'C:\Py\python.exe', platform='win32')
        self.assertEqual(argv, [r'C:\Program Files\Git\bin\bash.exe',
                                'C:/BRL/tools/update-lesson-v3.sh', '8', 'C:/Users/a/MyRobot'])
        self.assertEqual(env['PYTHON'], 'C:/Py/python.exe')

    def test_the_script_gets_this_python(self):
        argv, env = app.command(3, '/home/a/MyRobot', '/bin/bash')
        self.assertEqual(argv[1:], [os.path.join(REPO, 'tools', 'update-lesson-v3.sh'), '3', '/home/a/MyRobot'])
        self.assertEqual(env['PYTHON'], sys.executable)

    def test_color_codes_are_stripped(self):
        self.assertEqual(app.strip_ansi('\x1b[1m==> Done\x1b[0m'), '==> Done')


def files(project):
    """Every file under src/, relative to the project."""
    out = set()
    for dirpath, _, names in os.walk(os.path.join(project, 'src')):
        out |= {os.path.relpath(os.path.join(dirpath, n), project) for n in names}
    return out


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def update(lesson, project):
    argv, env = app.command(lesson, project, app.find_bash())
    lines = []
    code = app.run(argv, env, lines.append)
    assert code == 0, '\n'.join(lines)
    return lines


class RealUpdate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_rolling_back_leaves_what_a_fresh_update_would_plus_your_own(self):
        fresh = make_project(os.path.join(self.tmp, 'fresh'))
        update(6, fresh)

        project = make_project(self.tmp)
        update(15, project)
        robot = os.path.join(project, 'src', 'main', 'java', 'first', 'robot')
        constants = os.path.join(robot, 'Constants.java')
        text = read(constants).replace('kGyroPort = 0;', 'kGyroPort = 13;')
        with open(constants, 'w', encoding='utf-8') as fh:
            fh.write(text)
        with open(os.path.join(robot, 'subsystems', 'Blinker.java'), 'w', encoding='utf-8') as fh:
            fh.write('package first.robot.subsystems;\n\npublic class Blinker {}\n')
        git(project, 'add', '-A')
        git(project, 'commit', '-qm', 'my robot, at lesson 15')

        lines = update(6, project)
        self.assertEqual(files(project), files(fresh) | {'src/main/java/first/robot/subsystems/Blinker.java'})
        for f in files(fresh) - {'src/main/java/first/robot/Constants.java'}:
            self.assertEqual(read(os.path.join(project, f)), read(os.path.join(fresh, f)), f)
        self.assertFalse(os.path.exists(os.path.join(robot, 'commands')))
        self.assertIn('kGyroPort = 13;', read(constants))
        self.assertIn('  removed subsystems/Drivetrain.java  (from Lesson 7)', lines)
        self.assertFalse(any('DROPPED' in line for line in lines), lines)

    def test_rolling_back_to_lesson_1_keeps_your_constants_file(self):
        project = make_project(self.tmp)
        update(8, project)
        git(project, 'add', '-A')
        git(project, 'commit', '-qm', 'at lesson 8')
        lines = update(1, project)
        template = make_project(os.path.join(self.tmp, 'template'), commit=False)
        self.assertEqual(files(project), files(template) | {'src/main/java/first/robot/Constants.java'})
        self.assertTrue(any(line.startswith('  kept    Constants.java') for line in lines), lines)

    def test_update_a_project_to_the_start_of_lesson_8(self):
        tmp = tempfile.mkdtemp()
        try:
            project = make_project(tmp)
            argv, env = app.command(8, project, app.find_bash())
            lines = []
            code = app.run(argv, env, lines.append)
            self.assertEqual(code, 0, '\n'.join(lines))
            self.assertIn('==> Done — ready for Lesson 8', lines)
            self.assertFalse(any('\x1b' in line for line in lines))
            self.assertTrue(os.path.exists(os.path.join(project, 'vendordeps', 'Phoenix6-26.70.0-alpha-2.json')))
        finally:
            shutil.rmtree(tmp)


if __name__ == '__main__':
    unittest.main()
