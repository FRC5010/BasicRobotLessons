"""Make the build.gradle edits Lesson 13 (v3 track) has a student make.

    python3 patch_build_gradle.py PATH/TO/build.gradle

Lesson 13 installs AdvantageKit, which needs two changes to build.gradle:

1. A block at the bottom: the @AutoLog annotation processor, read from
   vendordeps/AdvantageKit.json, and AdvantageKit's replayWatch task.
2. The Sim GUI line edited so the GUI loads unless a replay log is named in
   AKIT_LOG_PATH. AdvantageKit refuses to replay with any simulation
   extension loaded, and the template turns the GUI on.

Each edit is made once: a file that already has the processor, or a GUI line
that isn't the template's, is left alone. Line endings are kept as found.
Prints what it changed, one line each, and nothing if it changed nothing.
"""

import sys

GUI_LINE = 'wpi.sim.addGui().defaultEnabled = true'

GUI_REPLACEMENT = [
    '// AdvantageKit replay refuses to run with any simulation extension loaded,',
    '// so the GUI loads unless AKIT_LOG_PATH names a log to replay.',
    'wpi.sim.addGui().defaultEnabled = System.getenv("AKIT_LOG_PATH") == null',
]

AKIT_BLOCK = [
    '',
    '// AdvantageKit (Lesson 13). @AutoLog writes each inputs class\'s logging code',
    '// while the project compiles; replayWatch replays a log again every time you',
    '// save a change.',
    'task(replayWatch, type: JavaExec) {',
    '    mainClass = "org.littletonrobotics.junction.ReplayWatch"',
    '    classpath = sourceSets.main.runtimeClasspath',
    '}',
    '',
    'dependencies {',
    '    def akitJson = new groovy.json.JsonSlurper().parseText(new File(projectDir.getAbsolutePath() + "/vendordeps/AdvantageKit.json").text)',
    '    annotationProcessor "org.littletonrobotics.akit:akit-autolog:$akitJson.version"',
    '}',
]


def patch(text):
    """Returns (new text, list of what changed)."""
    newline = '\r\n' if '\r\n' in text else '\n'
    changes = []

    lines = text.split(newline)
    for i, line in enumerate(lines):
        if line.strip() == GUI_LINE:
            indent = line[:len(line) - len(line.lstrip())]
            lines[i:i + 1] = [indent + l for l in GUI_REPLACEMENT]
            changes.append('Sim GUI now stays off while replaying a log')
            break
    text = newline.join(lines)

    if 'akit-autolog' not in text:
        if not text.endswith(newline):
            text += newline
        text += newline.join(AKIT_BLOCK) + newline
        changes.append('added AdvantageKit\'s annotation processor and replayWatch task')

    return text, changes


def main(argv):
    path = argv[0]
    with open(path, encoding='utf-8', newline='') as f:
        before = f.read()
    after, changes = patch(before)
    if after != before:
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(after)
    for change in changes:
        print('  ' + change)
    return changes


if __name__ == '__main__':
    main(sys.argv[1:])
