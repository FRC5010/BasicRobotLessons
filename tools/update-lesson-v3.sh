#!/usr/bin/env bash
#
# update-lesson-v3.sh — bring a student's OpMode-track (v3) project to the
# reference starting point of a lesson, in place.
#
#   ./tools/update-lesson-v3.sh LESSON PROJECT_DIR [--force]
#
#   ./tools/update-lesson-v3.sh 8 ~/dev/MyOpModeRobot
#
# LESSON is the lesson you are ABOUT TO DO. Its starting point is the
# finished code of the lesson before it, so this rolls the reference
# snapshots code/v3/lesson-0 .. lesson-(LESSON-1) onto PROJECT_DIR, replays
# the file deletions those lessons instruct, and installs the pinned
# vendordeps they need — the same rules tools/verify-lessons-v3.sh uses
# (both read tools/lib/v3-lessons.sh). Unlike that script it works on your
# project directly instead of a scratch copy, and it doesn't build anything.
#
# The code it writes carries "NEXT LESSON" comments marking every place in
# an existing file where LESSON has you add or change code. New files that
# LESSON creates are not marked — the lesson tells you to create them.
#
# It OVERWRITES every file those lessons touch, with the reference version.
# So it refuses to run unless PROJECT_DIR is a git repository with nothing
# uncommitted — commit first, and `git diff` afterwards shows exactly what
# changed (and `git checkout .` undoes it). --force skips that check.
#
# Lesson 0 starts from the untouched OpMode template, so there is nothing to
# apply for it; the highest lesson supported is the last one migrated to
# WPILib 2027 alpha-7 (V3_ALPHA7_THROUGH in tools/lib/v3-lessons.sh).

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/v3-lessons.sh
. "$REPO/tools/lib/v3-lessons.sh"

usage() {
  sed -n '3,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}
say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { echo "update-lesson-v3: $*" >&2; exit 1; }

FORCE=0
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    -h|--help) usage 0 ;;
    --force) FORCE=1 ;;
    -*) die "unknown option: $arg (see --help)" ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done
[ "${#POSITIONAL[@]}" -eq 2 ] || usage 1
LESSON="${POSITIONAL[0]}"
PROJECT="${POSITIONAL[1]}"

[[ "$LESSON" =~ ^[0-9]+$ ]] || die "LESSON must be a number, got '$LESSON'"
if [ "$LESSON" -eq 0 ]; then
  die "Lesson 0 starts from the untouched OpMode template — there's nothing to apply. Make a new project from the template instead."
fi
if [ "$LESSON" -gt "$V3_ALPHA7_THROUGH" ]; then
  die "lessons above $V3_ALPHA7_THROUGH haven't been migrated to WPILib 2027 alpha-7 yet, so their starting code wouldn't build"
fi
THROUGH=$((LESSON - 1))

[ -d "$PROJECT" ] || die "not a directory: $PROJECT"
PROJECT="$(cd "$PROJECT" && pwd)"
[ -f "$PROJECT/build.gradle" ] || die "no build.gradle in $PROJECT — point this at your robot project's folder"
[ -d "$PROJECT/src/main/java/first/robot" ] ||
  die "no src/main/java/first/robot in $PROJECT — this script is for projects made from the OpMode template"
case "$PROJECT" in
  "$REPO"|"$REPO"/*) die "refusing to write into this lessons repository ($PROJECT) — point it at your own project" ;;
esac

if [ "$FORCE" -eq 0 ]; then
  if ! git -C "$PROJECT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "$PROJECT isn't a git repository, so the files this overwrites couldn't be recovered. Put it under git and commit first, or pass --force."
  fi
  if [ -n "$(git -C "$PROJECT" status --porcelain)" ]; then
    die "$PROJECT has uncommitted changes, which this would overwrite. Commit (or stash) them first, or pass --force."
  fi
fi

say "Updating $PROJECT to the start of Lesson $LESSON (reference code through lesson-$THROUGH)"

# Download first, into a scratch folder: if the network fails, nothing in
# the project has been touched yet.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
say "Fetching pinned vendordeps"
v3_fetch_vendordeps "$THROUGH" "$STAGE" || die "couldn't download vendordeps — nothing in your project was changed"

say "Applying lesson snapshots 0..$THROUGH"
v3_apply_snapshots "$REPO" "$THROUGH" "$PROJECT"

say "Applying the deletions the lessons instruct"
v3_apply_deletions "$THROUGH" "$PROJECT"

if compgen -G "$STAGE/*.json" >/dev/null; then
  say "Installing vendordeps"
  mkdir -p "$PROJECT/vendordeps"
  for f in "$STAGE"/*.json; do
    cp "$f" "$PROJECT/vendordeps/"
    echo "  $(basename "$f")"
  done
fi

say "Done — ready for Lesson $LESSON"
marked="$(grep -rl "NEXT LESSON" "$PROJECT/src" 2>/dev/null || true)"
if [ -n "$marked" ]; then
  echo "Look for the NEXT LESSON comments — that's where Lesson $LESSON has you add code:"
  echo "$marked" | sed "s|^$PROJECT/|  |"
fi
if git -C "$PROJECT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "See everything that changed with: git -C \"$PROJECT\" status   (and git diff)"
fi
