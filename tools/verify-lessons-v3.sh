#!/usr/bin/env bash
#
# verify-lessons-v3.sh — compile-check the v3 (OpMode + coroutine commands)
# track's lesson code, the sibling of tools/verify-lessons.sh for the
# 2027-alpha OpMode track. It exists separately rather than folding into the
# original script because almost everything differs: the base project
# (code/OpModeV3Robot, not code/ActualLessons), the package root
# (first.robot, not frc.robot), the deploy target (SystemCore, not roboRIO),
# and the vendordep source (2027_alpha5, not the current season). There is no
# AdvantageKit build.gradle block to carry over, but lesson-deletion replay
# does apply here too, the same way it does in the main script (see `del`
# below) — the first one lands at Lesson 7, same rename as the main course.
#
# It works by rolling code/OpModeV3Robot (the pristine 2027 alpha OpMode
# template, already carrying the CommandsV3 vendordep) forward through
# code/v3/lesson-0 … code/v3/lesson-N, applying each snapshot in order the way
# a student would, then replaying any deletions the lessons instruct (a
# snapshot can only add or replace files — see the `del` calls below), then
# running Gradle over the result.
#
#   ./tools/verify-lessons-v3.sh          # roll through the highest lesson present
#   ./tools/verify-lessons-v3.sh 2        # stop after Lesson 2
#
# The project the snapshots are rolled onto is code/OpModeV3Robot by default.
# Point VERIFY_BASE at any other GradleRIO-2027-alpha project to use that
# instead:
#
#   VERIFY_BASE=~/dev/MyOpModeRobot ./tools/verify-lessons-v3.sh 1
#   VERIFY_BASE=~/dev/MyOpModeRobot ./tools/verify-lessons-v3.sh -1   # no lessons, just build it
#
# -1 rolls no snapshots at all and fetches no vendordeps, so the project is
# built exactly as it stands, with whatever vendordeps it already carries.
#
# The sandbox is a scratch copy and is DELETED at the start of every run, so
# the base project is never modified — neither code/OpModeV3Robot nor
# whatever VERIFY_BASE names. Never point VERIFY_SANDBOX at anything you want
# to keep; the script refuses the obvious mistakes but cannot catch every one.
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

# Highest lesson-N directory present, unless the caller names one.
LATEST="$(ls -d "$REPO"/code/v3/lesson-* 2>/dev/null | sed 's/.*lesson-//' | sort -n | tail -1)"
THROUGH="${1:-$LATEST}"
for arg in "${@:2}"; do
  case "$arg" in
    test)     GRADLE_TASK="compileJava test" ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# --- vendordeps -------------------------------------------------------------
# Pinned to WPILib's vendordep marketplace's 2027_alpha5 bucket, one
# immutable file per version — same rule as the main script: never a
# vendor's own "latest" link.
MARKETPLACE="https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/2027_alpha5"
# "<lesson it is first needed>|<url>". Only what the requested range needs
# gets fetched. CommandsV3 is NOT fetched here — it ships already installed
# in code/OpModeV3Robot/vendordeps/, copied from wpilib source directly.
VENDORDEPS=(
  "1|$MARKETPLACE/Phoenix6-26.50.0-alpha-1.json"
  "15|$MARKETPLACE/photonlib-v2027.0.0-alpha-2.json"
)

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
JAVA_DIR="$SANDBOX/src/main/java/first/robot"

if [ "$THROUGH" -lt 0 ]; then
  say "Vendordeps: using whatever $BASE already carries"
else
say "Fetching pinned vendordeps"
fetch_vendordep() {
  local url="$1" tmp attempt
  tmp="$(mktemp)"
  for attempt in 1 2 3 4; do
    if curl -fsSL --max-time 60 -o "$tmp" "$url"; then
      local name
      name="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["fileName"])' "$tmp")"
      mv "$tmp" "$SANDBOX/vendordeps/$name"
      echo "  ok  $name"
      return 0
    fi
    echo "  retry $attempt  $url" >&2
    sleep $((attempt * 2))
  done
  echo "  FAILED after 4 attempts (network, not your code): $url" >&2
  exit 1
}
for entry in "${VENDORDEPS[@]}"; do
  need="${entry%%|*}"
  [ "$THROUGH" -ge "$need" ] && fetch_vendordep "${entry#*|}"
done
fi

if [ "$THROUGH" -lt 0 ]; then
  say "Applying no lesson snapshots"
else
say "Applying lesson snapshots 0..$THROUGH"
for n in $(seq 0 "$THROUGH" 2>/dev/null || true); do
  d="$REPO/code/v3/lesson-$n"
  [ -d "$d" ] || continue
  # Java: code/v3/lesson-N/**.java mirrors the first/robot package tree
  # (root classes at the top, then opmode/, subsystems/). Last writer wins,
  # which is what makes "apply in order" equal "the state after Lesson N".
  (cd "$d" && find . -name '*.java' -print0 | while IFS= read -r -d '' f; do
      mkdir -p "$JAVA_DIR/$(dirname "$f")"
      cp "$f" "$JAVA_DIR/$f"
  done)
  echo "  applied lesson-$n"
done

say "Applying the deletions the lessons instruct"
# Snapshots can only add or replace files, so removals have to be replayed
# here — same rule and same mechanics as the main course's verify-lessons.sh.
del() { [ "$THROUGH" -ge "$1" ] && shift && for f; do rm -f "$JAVA_DIR/$f"; done || true; }
del 7  subsystems/DriveModule.java   # became SwerveModule
del 9  opmode/MyTeleop.java opmode/MyAuto.java   # became RobotTeleop / RobotAuto
del 15 subsystems/VisionPoseProvider.java   # became PhotonVisionPoseProvider
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
