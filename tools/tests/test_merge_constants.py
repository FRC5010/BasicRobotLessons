"""Tests for tools/lib/merge_constants.py — run with:

    python3 -m unittest discover -s tools/tests -v
"""

import os
import re
import sys
import textwrap
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))

import merge_constants as mc  # noqa: E402


def java(s):
    return textwrap.dedent(s).lstrip('\n')


# The reference file as a lesson would ship it.
REFERENCE = java('''
    package first.robot;

    import org.wpilib.math.geometry.Translation2d;

    public final class Constants {
      public static final class DriveConstants {
        public static final int kFrontLeftDrivePort = 1;     // CAN IDs — change to yours
        public static final int kGyroPort = 0;               // CAN ID — change to yours
        public static final double kWheelDiameterMeters = 0.1016;  // 4 inch wheel
        public static final double kWheelCircumferenceMeters =
            Math.PI * kWheelDiameterMeters;                          // ≈ 0.319 m
        public static final Translation2d kFrontLeft = new Translation2d(0.3, 0.3);
      }

      public static final class SteerConstants {
        public static final double kSteerGearRatio = 25.0; // rotor : steering
      }
    }
    ''')

# Every value the lessons have ever given each constant (normally built from
# every code/v3/lesson-*/Constants.java).
HISTORY = mc.history_from_texts([REFERENCE])


def merge(student, reference=REFERENCE, history=None):
    return mc.merge(student, reference, HISTORY if history is None else history)


class UntouchedFiles(unittest.TestCase):
    def test_identical_student_file_comes_out_as_the_reference(self):
        merged, report = merge(REFERENCE)
        self.assertEqual(merged, REFERENCE)
        self.assertEqual(report, [])

    def test_new_reference_constants_are_added(self):
        older = REFERENCE.replace(
            '    public static final int kGyroPort = 0;               // CAN ID — change to yours\n', '')
        merged, _ = merge(older)
        self.assertIn('kGyroPort = 0;', merged)


class StudentValuesSurvive(unittest.TestCase):
    def test_customized_can_id_is_kept_with_the_reference_comment(self):
        student = REFERENCE.replace('kFrontLeftDrivePort = 1;', 'kFrontLeftDrivePort = 21;')
        merged, report = merge(student)
        self.assertIn('kFrontLeftDrivePort = 21;     // CAN IDs — change to yours', merged)
        self.assertTrue(any('DriveConstants.kFrontLeftDrivePort' in r and 'kept' in r for r in report), report)

    def test_customized_multiline_value_is_kept_as_written(self):
        reference = REFERENCE.replace(
            'public static final Translation2d kFrontLeft = new Translation2d(0.3, 0.3);',
            'public static final Transform3d kCam = new Transform3d(\n'
            '        new Translation3d(0.3, 0.0, 0.2), // 30 cm forward\n'
            '        new Rotation3d(0, 0, 0));')
        student = reference.replace('new Translation3d(0.3, 0.0, 0.2), // 30 cm forward',
                                    'new Translation3d(0.25, 0.1, 0.4), // measured on our robot')
        merged, _ = merge(student, reference, mc.history_from_texts([reference]))
        self.assertIn('new Translation3d(0.25, 0.1, 0.4), // measured on our robot', merged)
        self.assertNotIn('new Translation3d(0.3, 0.0, 0.2)', merged)

    def test_reformatting_alone_is_not_a_customization(self):
        student = REFERENCE.replace('new Translation2d(0.3, 0.3)', 'new Translation2d( 0.3,   0.3 )')
        merged, report = merge(student)
        self.assertEqual(merged, REFERENCE)
        self.assertEqual(report, [])

    def test_student_constants_and_classes_of_their_own_are_kept(self):
        student = REFERENCE.replace(
            '  public static final class SteerConstants {',
            '  public static final class ShooterConstants {\n'
            '    public static final int kShooterPort = 30; // ours\n'
            '  }\n'
            '\n'
            '  public static final class SteerConstants {').replace(
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n',
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n'
            '    // Our modules are the fast gearing.\n'
            '    public static final double kMyTrim = 1.5;\n')
        merged, report = merge(student)
        self.assertIn('public static final int kShooterPort = 30; // ours', merged)
        self.assertIn('    // Our modules are the fast gearing.\n    public static final double kMyTrim = 1.5;', merged)
        # each exactly once
        self.assertEqual(merged.count('kShooterPort'), 1)
        self.assertEqual(merged.count('kMyTrim'), 1)
        self.assertTrue(any('kMyTrim' in r for r in report), report)
        self.assertTrue(any('ShooterConstants' in r for r in report), report)
        # still inside SteerConstants, before its closing brace
        steer = merged[merged.index('class SteerConstants'):]
        self.assertLess(steer.index('kMyTrim'), steer.index('}'))

    def test_student_imports_are_kept(self):
        student = REFERENCE.replace(
            'import org.wpilib.math.geometry.Translation2d;\n',
            'import static org.wpilib.units.Units.Inches;\n\nimport org.wpilib.math.geometry.Translation2d;\n')
        student = student.replace('kWheelDiameterMeters = 0.1016;', 'kWheelDiameterMeters = Inches.of(4).in(Meters);')
        merged, _ = merge(student)
        self.assertIn('import static org.wpilib.units.Units.Inches;', merged)
        self.assertEqual(merged.count('import org.wpilib.math.geometry.Translation2d;'), 1)


class LessonsStillWin(unittest.TestCase):
    def test_a_value_the_lessons_used_before_is_not_a_customization(self):
        # An older lesson shipped 25.0; this lesson changes it to 21.43. A student
        # still on 25.0 never touched it, so they get the lesson's new value.
        old_reference = REFERENCE
        new_reference = REFERENCE.replace('kSteerGearRatio = 25.0', 'kSteerGearRatio = 21.43')
        history = mc.history_from_texts([old_reference, new_reference])
        merged, report = merge(old_reference, new_reference, history)
        self.assertIn('kSteerGearRatio = 21.43', merged)
        self.assertTrue(any('kSteerGearRatio' in r and '21.43' in r for r in report), report)

    def test_a_type_change_takes_the_reference_and_warns(self):
        new_reference = REFERENCE.replace(
            'public static final double kWheelDiameterMeters = 0.1016;',
            'public static final Distance kWheelDiameterMeters = Inches.of(4);')
        history = mc.history_from_texts([REFERENCE, new_reference])
        student = REFERENCE.replace('kWheelDiameterMeters = 0.1016;', 'kWheelDiameterMeters = 0.1143;')
        merged, report = merge(student, new_reference, history)
        self.assertIn('Distance kWheelDiameterMeters = Inches.of(4);', merged)
        self.assertTrue(any('kWheelDiameterMeters' in r and '0.1143' in r for r in report), report)

    def test_a_customized_constant_the_lessons_removed_is_reported_not_kept(self):
        old_reference = REFERENCE.replace(
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n',
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n'
            '    public static final double kMagnetOffset = 0.0;\n')
        history = mc.history_from_texts([old_reference, REFERENCE])
        student = old_reference.replace('kMagnetOffset = 0.0;', 'kMagnetOffset = 0.137;')
        merged, report = merge(student, REFERENCE, history)
        self.assertNotIn('kMagnetOffset', merged)
        self.assertTrue(any('kMagnetOffset' in r and '0.137' in r for r in report), report)

    def test_an_untouched_constant_the_lessons_removed_goes_quietly(self):
        old_reference = REFERENCE.replace(
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n',
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n'
            '    public static final double kP = 0.0005;\n')
        history = mc.history_from_texts([old_reference, REFERENCE])
        merged, report = merge(old_reference, REFERENCE, history)
        self.assertEqual(merged, REFERENCE)
        self.assertEqual(report, [])


# Rolling back: the student's file is from a later lesson than the reference.
# EARLY is the reference at the lesson being rolled back to; LATER is a lesson
# after it, which renamed kDrivePort and added everything else.
EARLY = java('''
    package first.robot;

    public final class Constants {
      public static final class DriveConstants {
        public static final int kDrivePort = 1;   // CAN ID — change to yours

        /**
         * ====== NEXT LESSON: ADD CODE HERE ======
         * The CAN IDs and locations of all four corners.
         */
      }
    }
    ''')

LATER = java('''
    package first.robot;

    import com.ctre.phoenix6.signals.InvertedValue;
    import org.wpilib.math.geometry.Translation2d;

    public final class Constants {
      public enum Mode { REAL, SIM, REPLAY }

      public static final Mode kSimMode = Mode.SIM;

      public static final class DriveConstants {
        public static final int kFrontLeftDrivePort = 1;     // CAN IDs — change to yours
        public static final int kGyroPort = 0;               // CAN ID — change to yours
        public static final double kHalfLength = 0.3;        // meters
        public static final Translation2d kFrontLeft = new Translation2d(kHalfLength, 0.3);
      }

      public static final class SteerConstants {
        public static final double kSteerKP = 40.0;

        /**
         * ====== NEXT LESSON: ADD CODE HERE ======
         * Something a lesson after this one adds.
         */
        public static final InvertedValue kSteerInverted = InvertedValue.CounterClockwise_Positive;
      }
    }
    ''')


def roll_back(student, upcoming=None):
    return mc.merge(student, EARLY, mc.history_from_texts([EARLY, LATER]),
                    applied=mc.history_from_texts([EARLY]),
                    upcoming=None if upcoming is None else mc.history_from_texts([upcoming]))


class RollingBack(unittest.TestCase):
    def test_untouched_constants_from_a_later_lesson_go_quietly(self):
        merged, report = roll_back(LATER)
        self.assertEqual(merged, EARLY)
        self.assertEqual(report, [])

    def test_your_value_for_a_later_lessons_constant_is_kept(self):
        merged, report = roll_back(LATER.replace('kGyroPort = 0;', 'kGyroPort = 13;'))
        drive = merged[merged.index('class DriveConstants'):]
        self.assertIn('public static final int kGyroPort = 13;               // CAN ID — change to yours', drive)
        self.assertLess(drive.index('kGyroPort'), drive.index('}'))
        self.assertIn('kDrivePort = 1;', merged)
        self.assertNotIn('kFrontLeftDrivePort', merged)
        self.assertTrue(any('kGyroPort = 13' in r and 'later lesson' in r for r in report), report)
        self.assertFalse(any('DROPPED' in r for r in report), report)

    def test_a_kept_value_brings_the_constants_and_imports_it_is_written_with(self):
        merged, report = roll_back(LATER.replace('new Translation2d(kHalfLength, 0.3)',
                                                 'new Translation2d(kHalfLength, 0.25)'))
        self.assertIn('kFrontLeft = new Translation2d(kHalfLength, 0.25);', merged)
        self.assertIn('public static final double kHalfLength = 0.3;        // meters', merged)
        self.assertIn('import org.wpilib.math.geometry.Translation2d;', merged)
        self.assertNotIn('import com.ctre.phoenix6.signals.InvertedValue;', merged)
        self.assertTrue(any('kHalfLength' in r and 'kFrontLeft' in r for r in report), report)
        self.assertLess(merged.index('kHalfLength ='), merged.index('kFrontLeft ='))

    def test_a_later_class_comes_back_holding_only_your_values(self):
        merged, report = roll_back(LATER.replace('InvertedValue.CounterClockwise_Positive',
                                                 'InvertedValue.Clockwise_Positive'))
        self.assertIn('public static final class SteerConstants {', merged)
        self.assertIn('kSteerInverted = InvertedValue.Clockwise_Positive;', merged)
        self.assertIn('import com.ctre.phoenix6.signals.InvertedValue;', merged)
        self.assertNotIn('kSteerKP', merged)
        self.assertNotIn('Something a lesson after this one adds', merged)
        steer = merged[merged.index('class SteerConstants'):]
        self.assertLess(steer.index('kSteerInverted'), steer.index('}'))
        self.assertEqual(mc.parse(merged).classes.keys(),
                         {'Constants', 'Constants.DriveConstants', 'Constants.SteerConstants'})

    def test_a_later_enum_comes_back_with_the_value_that_needs_it(self):
        merged, report = roll_back(LATER.replace('kSimMode = Mode.SIM;', 'kSimMode = Mode.REPLAY;'))
        self.assertIn('public enum Mode { REAL, SIM, REPLAY }', merged)
        self.assertIn('kSimMode = Mode.REPLAY;', merged)
        self.assertTrue(any('Mode' in r and 'kSimMode' in r and 'uses' in r for r in report), report)

    def test_your_own_constant_in_a_later_class_keeps_its_class(self):
        student = LATER.replace('    public static final double kSteerKP = 40.0;\n',
                                '    public static final double kSteerKP = 40.0;\n'
                                '    public static final double kMyTrim = 1.5; // ours\n')
        merged, report = roll_back(student)
        self.assertIn('public static final class SteerConstants {', merged)
        self.assertIn('kMyTrim = 1.5; // ours', merged)
        self.assertNotIn('kSteerKP', merged)

    def test_the_lesson_about_to_be_done_is_named_when_it_adds_your_constant(self):
        merged, report = roll_back(LATER.replace('kGyroPort = 0;', 'kGyroPort = 13;'), upcoming=LATER)
        self.assertTrue(any('kGyroPort = 13' in r and 'about to do' in r for r in report), report)

    def test_rolling_forward_still_drops_what_the_lessons_retired(self):
        student = EARLY.replace('kDrivePort = 1;', 'kDrivePort = 5;')
        both = mc.history_from_texts([EARLY, LATER])
        merged, report = mc.merge(student, LATER, both, applied=both)
        self.assertNotIn('kDrivePort', merged)
        self.assertTrue(any('DROPPED' in r and 'kDrivePort = 5' in r for r in report), report)


class RoundTrip(unittest.TestCase):
    """Roll the real v3 snapshots back from Lesson 15's start to Lesson 6's, then forward again."""

    V3 = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'code', 'v3')

    def constants(self, lessons):
        out = []
        for n in lessons:
            path = os.path.join(self.V3, f'lesson-{n}', 'Constants.java')
            if os.path.exists(path):
                with open(path, encoding='utf-8') as fh:
                    out.append(fh.read())
        return out

    def update(self, student, lesson):
        """What update-lesson-v3.sh does to Constants.java when you ask for LESSON."""
        applied = self.constants(range(lesson))
        everything = self.constants(range(100))
        upcoming = self.constants([lesson])
        return mc.merge(student, applied[-1], mc.history_from_texts(everything),
                        applied=mc.history_from_texts(applied),
                        upcoming=mc.history_from_texts(upcoming) if upcoming else None)

    def test_your_values_survive_rolling_back_and_forward_again(self):
        start = self.constants(range(15))[-1]
        mine = {
            'Constants.DriveConstants.kFrontLeftDrivePort': ('1', '21'),
            'Constants.DriveConstants.kGyroPort': ('0', '13'),
            'Constants.DriveConstants.kDriveKV': ('0.8', '0.75'),
            'Constants.SteerConstants.kSteerInverted': ('InvertedValue.CounterClockwise_Positive',
                                                        'InvertedValue.Clockwise_Positive'),
        }
        student = start
        for key, (old, new) in mine.items():
            name = key.rsplit('.', 1)[1]
            self.assertEqual(student.count(f' {name} = {old};'), 1, name)
            student = student.replace(f' {name} = {old};', f' {name} = {new};')
        student = re.sub(r'(kFrontLeftDrivePort = 21;[^\n]*\n)',
                         r'\1    public static final int kMyLedPort = 3;   // ours\n', student, count=1)

        back, back_report = self.update(student, 6)
        lesson5 = mc.parse(self.constants(range(6))[-1])
        got = mc.parse(back)
        self.assertEqual(set(got.decls) - set(lesson5.decls),
                         set(mine) | {'Constants.DriveConstants.kMyLedPort'})
        for key, (_, new) in mine.items():
            self.assertEqual(got.decls[key].value, new)
        self.assertFalse(any('DROPPED' in r for r in back_report), back_report)

        forward, forward_report = self.update(back, 15)
        want = mc.parse(start)
        got = mc.parse(forward)
        self.assertEqual(set(got.decls), set(want.decls) | {'Constants.DriveConstants.kMyLedPort'})
        for key, d in want.decls.items():
            self.assertEqual(got.decls[key].value, mine[key][1] if key in mine else d.value, key)
        self.assertFalse(any('DROPPED' in r for r in forward_report), forward_report)


class Parsing(unittest.TestCase):
    def test_comments_and_strings_do_not_confuse_the_parser(self):
        reference = REFERENCE.replace(
            '  public static final class SteerConstants {',
            '  // a = b; { not code }\n'
            '  /* kGyroPort = 99; } */\n'
            '  public static final class VisionConstants {\n'
            '    public static final String kName = "limelight-front; {x = 1}";\n'
            '  }\n'
            '\n'
            '  public static final class SteerConstants {')
        student = reference.replace('"limelight-front; {x = 1}"', '"limelight-ours"')
        merged, _ = merge(student, reference, mc.history_from_texts([reference]))
        self.assertIn('kName = "limelight-ours";', merged)
        self.assertIn('/* kGyroPort = 99; } */', merged)
        self.assertIn('kGyroPort = 0;', merged)

    def test_next_lesson_markers_in_the_reference_are_kept(self):
        marker = ('  /**\n'
                  '   * ====== NEXT LESSON: ADD CODE HERE ======\n'
                  '   * Add a HeadingConstants class.\n'
                  '   */\n')
        reference = REFERENCE.replace('\n}\n', '\n\n' + marker + '}\n')
        student = REFERENCE.replace('kGyroPort = 0;', 'kGyroPort = 5;')
        merged, _ = merge(student, reference, mc.history_from_texts([reference]))
        self.assertIn(marker, merged)
        self.assertIn('kGyroPort = 5;', merged)

    def test_windows_line_endings_in_the_student_file(self):
        student = REFERENCE.replace('kGyroPort = 0;', 'kGyroPort = 5;').replace('\n', '\r\n')
        merged, _ = merge(student)
        self.assertIn('kGyroPort = 5;', merged)
        self.assertNotIn('\r', merged)

    def test_array_initializer_and_enum_do_not_break_statement_tracking(self):
        reference = REFERENCE.replace(
            '  public static final class DriveConstants {',
            '  public enum Mode { REAL, SIM, REPLAY }\n'
            '\n'
            '  public static final Mode kSimMode = Mode.SIM;\n'
            '\n'
            '  public static final class DriveConstants {\n'
            '    public static final int[] kPorts = new int[] {1, 2, 3};')
        student = reference.replace('{1, 2, 3}', '{21, 22, 23}').replace('kGyroPort = 0;', 'kGyroPort = 5;')
        merged, _ = merge(student, reference, mc.history_from_texts([reference]))
        self.assertIn('new int[] {21, 22, 23};', merged)
        self.assertIn('kGyroPort = 5;', merged)
        self.assertIn('kSimMode = Mode.SIM;', merged)

    def test_a_leftover_marker_above_a_students_own_constant_is_not_carried(self):
        student = REFERENCE.replace(
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n',
            '    public static final double kSteerGearRatio = 25.0; // rotor : steering\n'
            '\n'
            '    /**\n'
            '     * ====== NEXT LESSON: ADD CODE HERE ======\n'
            '     * Something from an earlier update.\n'
            '     */\n'
            '    // our own trim\n'
            '    public static final double kMyTrim = 1.5;\n')
        merged, _ = merge(student)
        self.assertIn('    // our own trim\n    public static final double kMyTrim = 1.5;', merged)
        self.assertNotIn('Something from an earlier update', merged)

    def test_every_constants_file_in_the_repo_parses_and_merges_into_itself(self):
        repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        found = []
        for dirpath, _, names in os.walk(os.path.join(repo, 'code')):
            if 'Constants.java' in names and '/build/' not in dirpath:
                found.append(os.path.join(dirpath, 'Constants.java'))
        self.assertGreater(len(found), 20)
        texts = []
        for f in found:
            with open(f, encoding='utf-8') as fh:
                texts.append(fh.read())
        history = mc.history_from_texts(texts)
        for path, text in zip(found, texts):
            with self.subTest(path=os.path.relpath(path, repo)):
                merged, report = mc.merge(text, text, history)
                self.assertEqual(merged, text)
                self.assertEqual(report, [])

    def test_unbalanced_student_file_raises(self):
        with self.assertRaises(mc.MergeError):
            merge(REFERENCE.replace('public static final class SteerConstants {', 'public static final class SteerConstants {{'))


if __name__ == '__main__':
    unittest.main()
