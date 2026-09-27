#!/usr/bin/env bash
#
# verify-lessons-v3.sh — compile-check the v3 (OpMode + coroutine commands)
# track's lesson code, the sibling of tools/verify-lessons.sh for the
# 2027-alpha OpMode track. It exists separately rather than folding into the
# original script because almost everything differs: the base project
# (code/OpModeV3Robot, not code/ActualLessons), the package root
# (first.robot, not frc.robot), the deploy target (SystemCore, not roboRIO),
# and the vendordep source (WPILib's 2027-alpha marketplace buckets, not the
# current season — Phoenix 6 pins to the 2027_alpha7 bucket; LimelightLib,
# which isn't in the marketplace, pins to one commit of Limelight's own repo;
# see docs/lesson-plan-alpha7-upgrade.md). There is no
# AdvantageKit build.gradle block to carry over, but lesson-deletion replay
# does apply here too, the same way it does in the main script (see
# V3_DELETIONS in tools/lib/v3-lessons.sh) — the first one lands at Lesson
# 7, same rename as the main course.
#
# It works by rolling code/OpModeV3Robot (the pristine 2027 alpha OpMode
# template, already carrying the CommandsV3 vendordep) forward through
# code/v3/lesson-0 … code/v3/lesson-N, applying each snapshot in order the way
# a student would, then replaying any deletions the lessons instruct (a
# snapshot can only add or replace files — see tools/lib/v3-lessons.sh), then
# running Gradle over the result.
#
#   ./tools/verify-lessons-v3.sh          # roll through the highest lesson present
#   ./tools/verify-lessons-v3.sh 2        # stop after Lesson 2
#   ./tools/verify-lessons-v3.sh 32 test  # also run any src/test/java you dropped in
#
# Pass --sandbox to keep the result as a real project instead of a throwaway
# scratch build — this is how you'd hand yourself a fresh, buildable folder
# to actually work in:
#
#   ./tools/verify-lessons-v3.sh -1 --sandbox ~/dev/MyOpModeRobot
#
# -1 rolls no snapshots at all and fetches no vendordeps, so the project is
# built exactly as it stands, with whatever vendordeps it already carries —
# --sandbox with -1 is how you get a fresh Lesson-0 starting point.
#
# The project the snapshots are rolled onto is code/OpModeV3Robot by default.
# Pass --base to point at any other GradleRIO-2027-alpha project instead:
#
#   ./tools/verify-lessons-v3.sh 1 --base ~/dev/MyOpModeRobot
#
# Both flags take the path as the next argument (--sandbox PATH) or joined
# with = (--sandbox=PATH), and can go anywhere on the command line, before
# or after the lesson number. The environment variables VERIFY_SANDBOX and
# VERIFY_BASE still work too, for scripts that already set them — a flag
# wins if both are given for the same one.
#
# The sandbox is a scratch copy and is DELETED at the start of every run, so
# the base project is never modified — neither code/OpModeV3Robot nor
# whatever --base names. Never point --sandbox at anything you want to keep
# that isn't already this kind of throwaway folder; the script refuses the
# obvious mistakes but cannot catch every one.
#
# This needs a JDK matching build.gradle's sourceCompatibility (VERSION_25 as
# of this writing) on PATH or pointed at via JAVA_HOME/ORG_GRADLE_JAVA_HOME —
# the 2027 alpha template requires it and Gradle will fail loudly, not subtly,
# if an older JDK is all that's available.
#
# First run takes a few minutes to populate the Gradle cache and needs
# network access to the Gradle Plugin Portal (the GradleRIO plugin itself),
# WPILib's frcmaven, Maven Central, and the vendor-json-repo host below.
# Later runs are seconds.

set -euo pipefail

# --sandbox/--base pull out of the argument list here, before anything below
# ever looks at $1 — everything left over (the lesson number, "test",
# "aside-*") lands back in the positional parameters exactly as before, in
# whatever order it was given, so a flag can go anywhere on the line.
POSITIONAL=()
while [ $# -gt 0 ]; do
  case "$1" in
    --sandbox=*) VERIFY_SANDBOX="${1#*=}"; shift ;;
    --sandbox)
      [ $# -ge 2 ] || { echo "--sandbox needs a path argument" >&2; exit 1; }
      VERIFY_SANDBOX="$2"; shift 2 ;;
    --base=*) VERIFY_BASE="${1#*=}"; shift ;;
    --base)
      [ $# -ge 2 ] || { echo "--base needs a path argument" >&2; exit 1; }
      VERIFY_BASE="$2"; shift 2 ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done
set -- "${POSITIONAL[@]}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${VERIFY_BASE:-$REPO/code/OpModeV3Robot}"
SANDBOX="${VERIFY_SANDBOX:-${TMPDIR:-/tmp}/verify-lessons-v3}"
GRADLE_TASK="compileJava"

[ -d "$BASE" ] || { echo "VERIFY_BASE is not a directory: $BASE" >&2; exit 1; }
[ -f "$BASE/build.gradle" ] || {
  echo "no build.gradle in $BASE — VERIFY_BASE must name a GradleRIO project" >&2; exit 1; }
BASE="$(cd "$BASE" && pwd)"

# The sandbox gets rm -rf'd below. Refuse the two ways that turns into a
# disaster: naming the base project, or naming anything inside this repo.
mkdir -p "$(dirname "$SANDBOX")"
SANDBOX="$(cd "$(dirname "$SANDBOX")" && pwd)/$(basename "$SANDBOX")"
case "$SANDBOX" in
  "$BASE"|"$BASE"/*|"$REPO"|"$REPO"/*)
    echo "refusing to use $SANDBOX as the sandbox — it is deleted on every run" >&2
    exit 1 ;;
esac

# Highest lesson-N directory present, unless the caller names one. The first
# remaining argument is the lesson number only if it actually looks like one
# (or -1) — that way "test" on its own (no number given, --sandbox already
# pulled out above) still means "the latest lesson, and run tests" instead of
# being mistaken for the lesson number itself.
LATEST="$(ls -d "$REPO"/code/v3/lesson-* 2>/dev/null | sed 's/.*lesson-//' | sort -n | tail -1)"
if [ $# -gt 0 ] && [[ "$1" =~ ^-?[0-9]+$ ]]; then
  THROUGH="$1"; shift
else
  THROUGH="$LATEST"
fi
for arg in "$@"; do
  case "$arg" in
    test)     GRADLE_TASK="compileJava test" ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# --- vendordeps, snapshots, deletions --------------------------------------
# The rules for rolling snapshots onto a project (pinned vendordeps, the
# lesson-N -> first/robot mapping, and the deletions the lessons instruct)
# live in tools/lib/v3-lessons.sh, shared with tools/update-lesson-v3.sh so
# the two scripts can never disagree about what "the state after Lesson N" is.
# shellcheck source=lib/v3-lessons.sh
. "$REPO/tools/lib/v3-lessons.sh"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

if [ "$THROUGH" -lt 0 ]; then
  say "Sandbox: $SANDBOX  (no lessons — building $BASE as it stands)"
else
  say "Sandbox: $SANDBOX  (rolling forward through lesson-$THROUGH)"
fi
echo "  base: $BASE"
rm -rf "$SANDBOX"
cp -r "$BASE" "$SANDBOX"
# A base copied from a git checkout brings its own history and build outputs;
# neither belongs in a scratch build, and .gradle in particular carries
# absolute paths from wherever it was last built.
rm -rf "$SANDBOX/.git" "$SANDBOX/build" "$SANDBOX/.gradle"
[ -f "$SANDBOX/gradlew" ] && chmod +x "$SANDBOX/gradlew"

if [ "$THROUGH" -lt 0 ]; then
  say "Vendordeps: using whatever $BASE already carries"
else
say "Fetching pinned vendordeps"
v3_fetch_vendordeps "$THROUGH" "$SANDBOX/vendordeps" || exit 1
fi

if [ "$THROUGH" -lt 0 ]; then
  say "Applying no lesson snapshots"
else
say "Applying lesson snapshots 0..$THROUGH"
v3_apply_snapshots "$REPO" "$THROUGH" "$SANDBOX"

say "Applying the deletions the lessons instruct"
v3_apply_deletions "$THROUGH" "$SANDBOX"
echo "  done"
fi

say "Gradle: $GRADLE_TASK"
cd "$SANDBOX"
# shellcheck disable=SC2086
./gradlew $GRADLE_TASK --console=plain

if [ "$THROUGH" -lt 0 ]; then
  say "OK — $BASE compiles as it stands"
else
  say "OK — v3 lessons 0..$THROUGH compile"
fi
echo "Sandbox kept at $SANDBOX (drop JUnit tests in src/test/java and re-run with 'test')."
