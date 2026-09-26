#!/usr/bin/env python3
"""A small window around tools/update-lesson-v3.sh, for the OpMode track.

Pick the lesson you're about to do and your project folder, press Update, and
it runs the same script you'd run from Git Bash, showing its output as it goes.
Launch it with the "Update Lesson" file at the top of this repo (double-click),
or run:

    python3 tools/update_lesson_app.py

Everything the window does is in the plain functions below — tested in
tools/tests/test_update_lesson_app.py — so the Tk part is only layout and
wiring. Tk is imported only when the window is built, so a machine without it
gets a clear message instead of a traceback.
"""

import json
import ntpath
import os
import queue
import re
import shutil
import subprocess
import sys
import threading

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
SCRIPT = os.path.join(TOOLS, 'update-lesson-v3.sh')
SETTINGS = os.path.join(os.path.expanduser('~'), '.basic-robot-lessons-update.json')
SETUP_ASIDE = 'docs/lessons/v3/aside-setup.md'


# --- which lessons ------------------------------------------------------------

def cutoff(repo=REPO):
    """The highest lesson the update script supports (V3_ALPHA7_THROUGH)."""
    with open(os.path.join(repo, 'tools', 'lib', 'v3-lessons.sh'), encoding='utf-8') as fh:
        return int(re.search(r'^V3_ALPHA7_THROUGH=(\d+)', fh.read(), re.M).group(1))


def lessons(repo=REPO):
    """[(number, title)] for every lesson you can update to, from the track's lesson table."""
    top = cutoff(repo)
    with open(os.path.join(repo, 'docs', 'lessons', 'v3', 'README.md'), encoding='utf-8') as fh:
        rows = re.findall(r'^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]', fh.read(), re.M)
    return [(int(n), title) for n, title in rows if 1 <= int(n) <= top]


def label(number, title):
    return f'Lesson {number} — {title}'


def lesson_from_label(text):
    m = re.match(r'Lesson (\d+)', text or '')
    return int(m.group(1)) if m else None


# --- finding bash ---------------------------------------------------------------

def find_bash(platform=sys.platform, which=shutil.which, exists=os.path.exists, env=os.environ):
    """Path to a bash that can run the update script, or None.

    On Windows that has to be Git Bash. C:\\Windows\\System32\\bash.exe is WSL's,
    which runs in a separate Linux filesystem and can't see your project the
    same way, so it's never used.
    """
    if platform != 'win32':
        return which('bash') or ('/bin/bash' if exists('/bin/bash') else None)
    candidates = []
    git = which('git')
    if git:   # ...\Git\cmd\git.exe or ...\Git\bin\git.exe
        root = ntpath.dirname(ntpath.dirname(git))
        candidates += [ntpath.join(root, 'bin', 'bash.exe'), ntpath.join(root, 'usr', 'bin', 'bash.exe')]
    for var in ('ProgramW6432', 'ProgramFiles', 'ProgramFiles(x86)'):
        if env.get(var):
            candidates.append(ntpath.join(env[var], 'Git', 'bin', 'bash.exe'))
    if env.get('LOCALAPPDATA'):
        candidates.append(ntpath.join(env['LOCALAPPDATA'], 'Programs', 'Git', 'bin', 'bash.exe'))
    for c in candidates:
        if 'system32' not in c.lower() and exists(c):
            return c
    return None


# --- checking the project -------------------------------------------------------

def check_project(path, repo=REPO):
    """None if the folder is ready to update, else (code, message for the student)."""
    if not path or not os.path.isdir(path):
        return 'missing', "That folder doesn't exist."
    path = os.path.realpath(path)
    real_repo = os.path.realpath(repo)
    here, course = os.path.normcase(path), os.path.normcase(real_repo)
    if here == course or here.startswith(course + os.sep):
        return 'inside-repo', ("That folder is inside the course repository itself. "
                               "Pick your own robot project instead.")
    if not (os.path.isfile(os.path.join(path, 'build.gradle'))
            and os.path.isdir(os.path.join(path, 'src', 'main', 'java', 'first', 'robot'))):
        return 'not-project', ("That doesn't look like an OpMode-track robot project — it needs a "
                               "build.gradle and a src/main/java/first/robot folder.")
    inside = subprocess.run(['git', '-C', path, 'rev-parse', '--is-inside-work-tree'],
                            capture_output=True, text=True)
    if inside.returncode != 0:
        return 'not-git', ("That project isn't a git repository yet, so the files the update "
                           "replaces couldn't be recovered. Set it up first — section 5 of "
                           f"{SETUP_ASIDE} walks through it.")
    status = subprocess.run(['git', '-C', path, 'status', '--porcelain'], capture_output=True, text=True)
    changed = [line for line in status.stdout.splitlines() if line.strip()]
    if changed:
        return 'dirty', (f"Your project has {len(changed)} changed file(s) that aren't committed. "
                         "The update replaces files, so commit your work first.")
    return None


def commit_all(path, message, env=None):
    """git add -A && git commit; returns (ok, git's output)."""
    add = subprocess.run(['git', '-C', path, 'add', '-A'], capture_output=True, text=True, env=env)
    if add.returncode != 0:
        return False, add.stdout + add.stderr
    commit = subprocess.run(['git', '-C', path, 'commit', '-m', message],
                            capture_output=True, text=True, env=env)
    return commit.returncode == 0, commit.stdout + commit.stderr


# --- running the script ---------------------------------------------------------

def command(lesson, project, bash, repo=REPO, python=sys.executable, platform=sys.platform):
    """(argv, env) that run the update script with this same Python.

    Passing our own interpreter as PYTHON matters on Windows, where python3 in
    Git Bash is often a Microsoft Store placeholder. Git Bash reads C:/... paths,
    so on Windows every path it receives uses forward slashes.
    """
    def fix(p):
        return p.replace('\\', '/') if platform == 'win32' else p

    script = (ntpath.join(repo, 'tools', 'update-lesson-v3.sh') if platform == 'win32'
              else os.path.join(repo, 'tools', 'update-lesson-v3.sh'))
    env = dict(os.environ, PYTHON=fix(python))
    return [bash, fix(script), str(lesson), fix(project)], env


_ANSI = re.compile(r'\x1b\[[0-9;]*[A-Za-z]')


def strip_ansi(text):
    return _ANSI.sub('', text)


def run(argv, env, on_line):
    """Run the script, calling on_line(text) for each line of output; returns its exit code."""
    extra = {}
    if sys.platform == 'win32':
        extra['creationflags'] = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    with subprocess.Popen(argv, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                          stdin=subprocess.DEVNULL, text=True, encoding='utf-8', errors='replace',
                          bufsize=1, **extra) as proc:
        for line in proc.stdout:
            on_line(strip_ansi(line.rstrip('\r\n')))
        return proc.wait()


def load_settings():
    try:
        with open(SETTINGS, encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def save_settings(settings):
    try:
        with open(SETTINGS, 'w', encoding='utf-8') as fh:
            json.dump(settings, fh)
    except OSError:
        pass


# --- the window -------------------------------------------------------------------

def build_window(tk, ttk, filedialog, messagebox, scrolledtext):
    """The Tk application class, built from the modules main() imported."""

    class App(tk.Tk):
        def __init__(self):
            super().__init__()
            self.title('Basic Robot Lessons — Update to a Lesson')
            self.minsize(720, 480)
            # Dialogs go through these, so a test can answer them.
            self.ask_yes_no = messagebox.askyesno
            self.show_error = messagebox.showerror
            self.lines = queue.Queue()
            self.running = False
            self.settings = load_settings()
            self.choices = [label(n, t) for n, t in lessons()]
            self._layout(ttk, scrolledtext)

        def _layout(self, ttk, scrolledtext):
            pad = {'padx': 12, 'pady': 6}
            frame = ttk.Frame(self)
            frame.pack(fill='both', expand=True)
            frame.columnconfigure(1, weight=1)

            ttk.Label(frame, text='Bring your robot project to the start of a lesson.',
                      font=('TkDefaultFont', 12, 'bold')).grid(row=0, column=0, columnspan=3, sticky='w', **pad)

            ttk.Label(frame, text='Lesson you’re about to do:').grid(row=1, column=0, sticky='w', **pad)
            self.lesson = ttk.Combobox(frame, values=self.choices, state='readonly')
            self.lesson.grid(row=1, column=1, columnspan=2, sticky='ew', **pad)
            saved = self.settings.get('lesson')
            if saved in self.choices:
                self.lesson.set(saved)

            ttk.Label(frame, text='Your project folder:').grid(row=2, column=0, sticky='w', **pad)
            self.folder = tk.StringVar(value=self.settings.get('project', ''))
            ttk.Entry(frame, textvariable=self.folder).grid(row=2, column=1, sticky='ew', **pad)
            self.browse_button = ttk.Button(frame, text='Browse…', command=self.browse)
            self.browse_button.grid(row=2, column=2, **pad)

            self.update_button = ttk.Button(frame, text='Update', command=self.start_update)
            self.update_button.grid(row=3, column=2, sticky='e', **pad)
            self.status = tk.StringVar(value=f'Lessons 1–{cutoff()} are available.')
            ttk.Label(frame, textvariable=self.status).grid(row=3, column=0, columnspan=2, sticky='w', **pad)

            self.log = scrolledtext.ScrolledText(frame, height=18, wrap='word', state='disabled',
                                                 font='TkFixedFont')
            self.log.grid(row=4, column=0, columnspan=3, sticky='nsew', padx=12, pady=(0, 12))
            frame.rowconfigure(4, weight=1)

        def browse(self):
            chosen = filedialog.askdirectory(title='Choose your robot project folder',
                                             initialdir=self.folder.get() or os.path.expanduser('~'))
            if chosen:
                self.folder.set(chosen)

        def append(self, text):
            self.log.configure(state='normal')
            self.log.insert('end', text + '\n')
            self.log.see('end')
            self.log.configure(state='disabled')

        def start_update(self):
            if self.running:
                return
            lesson = lesson_from_label(self.lesson.get())
            project = self.folder.get().strip()
            if lesson is None:
                self.show_error('Pick a lesson', 'Choose the lesson you’re about to do.')
                return
            bash = find_bash()
            if not bash:
                self.show_error('Git Bash not found',
                                'The update needs Git Bash, which comes with Git for Windows. '
                                f'Install Git — section 2 of {SETUP_ASIDE} — and try again.')
                return
            problem = check_project(project)
            if problem and problem[0] == 'dirty':
                message = f'Before updating to Lesson {lesson}'
                if not self.ask_yes_no('Commit your work first?',
                                       problem[1] + f'\n\nCommit everything now as “{message}”?'):
                    return
                ok, output = commit_all(project, message)
                if not ok:
                    self.show_error('Couldn’t commit', output.strip() or 'git commit failed.')
                    return
                self.append(f'Committed your work as “{message}”.')
                problem = check_project(project)
            if problem:
                self.show_error('Can’t update that folder', problem[1])
                return

            self.settings.update(project=project, lesson=self.lesson.get())
            save_settings(self.settings)
            self.running = True
            self._set_enabled(False)
            self.status.set(f'Updating to the start of Lesson {lesson}…')
            argv, env = command(lesson, project, bash)
            threading.Thread(target=self._worker, args=(lesson, argv, env), daemon=True).start()
            self.after(50, self._drain)

        def _worker(self, lesson, argv, env):
            try:
                code = run(argv, env, self.lines.put)
            except OSError as e:
                self.lines.put(f'Couldn’t start the update: {e}')
                code = -1
            self.lines.put((lesson, code))

        def _drain(self):
            while True:
                try:
                    item = self.lines.get_nowait()
                except queue.Empty:
                    break
                if isinstance(item, tuple):
                    self._finished(*item)
                    return
                self.append(item)
            self.after(50, self._drain)

        def _finished(self, lesson, code):
            self.running = False
            self._set_enabled(True)
            if code == 0:
                self.status.set(f'Done — your project is ready for Lesson {lesson}.')
            else:
                self.status.set('The update stopped — the messages above say why.')

        def _set_enabled(self, enabled):
            state = 'normal' if enabled else 'disabled'
            self.update_button.configure(state=state)
            self.browse_button.configure(state=state)
            self.lesson.configure(state='readonly' if enabled else 'disabled')

    return App


def main():
    try:
        import tkinter as tk
        from tkinter import filedialog, messagebox, scrolledtext, ttk
    except ImportError:
        print('This window needs Tk, the toolkit Python uses to draw windows, and this Python '
              'was installed without it.\n'
              '  Windows/macOS: re-run the python.org installer and keep "tcl/tk and IDLE" ticked.\n'
              '  Linux: install your distribution\'s python3-tk package.\n'
              'Or skip the window and run tools/update-lesson-v3.sh from a terminal.', file=sys.stderr)
        sys.exit(1)
    App = build_window(tk, ttk, filedialog, messagebox, scrolledtext)
    App().mainloop()


if __name__ == '__main__':
    main()
