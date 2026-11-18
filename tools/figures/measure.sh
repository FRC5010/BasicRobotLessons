#!/usr/bin/env bash
# Measure the data behind one lesson figure.
#
#   tools/figures/measure.sh LESSON PROBE.java OUT.csv [--replace FILE OLD NEW]...
#
# Builds the OpMode track at LESSON's finished state in a scratch sandbox (through
# verify-lessons-v3.sh, so it is exactly what the lesson ships), optionally edits a
# source file there (--replace swaps one exact, unique string in
# src/main/java/first/robot/FILE, for "what if kV were zero" runs), drops PROBE.java
# into the sandbox's tests as package first.robot.figures, and runs it. The probe
# writes its CSV to the path in $FIGURE_OUT.
#
# The sandbox is $FIGURE_SANDBOX, or ${TMPDIR:-/tmp}/figure-sandbox-LESSON. It is
# wiped and rebuilt on every run (verify-lessons-v3.sh refuses one inside the repo).
# The v3 builds need JDK 25: set JAVA_HOME if the default java is older.
set -euo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,15p' "$0" >&2
  exit 2
fi

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
LESSON="$1"
PROBE="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
OUT="$(mkdir -p "$(dirname "$3")" && cd "$(dirname "$3")" && pwd)/$(basename "$3")"
shift 3
SANDBOX="${FIGURE_SANDBOX:-${TMPDIR:-/tmp}/figure-sandbox-$LESSON}"
CLASS="$(basename "$PROBE" .java)"

echo "Building Lesson $LESSON in $SANDBOX ..." >&2
"$REPO/tools/verify-lessons-v3.sh" "$LESSON" --sandbox "$SANDBOX" > "$SANDBOX.build.log" 2>&1 || {
  echo "Lesson $LESSON did not build; see $SANDBOX.build.log" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --replace)
      [ $# -ge 4 ] || { echo "--replace needs FILE OLD NEW" >&2; exit 2; }
      python3 - "$SANDBOX/src/main/java/first/robot/$2" "$3" "$4" <<'PY'
import sys
path, old, new = sys.argv[1:4]
text = open(path, encoding="utf-8").read()
count = text.count(old)
if count != 1:
    sys.exit(f"--replace: expected exactly one {old!r} in {path}, found {count}")
open(path, "w", encoding="utf-8").write(text.replace(old, new))
PY
      echo "Replaced in $2: $3 -> $4" >&2
      shift 4
      ;;
    *)
      echo "unknown option: $1" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$SANDBOX/src/test/java/first/robot/figures"
cp "$PROBE" "$SANDBOX/src/test/java/first/robot/figures/"
echo "Running $CLASS ..." >&2
(cd "$SANDBOX" && FIGURE_OUT="$OUT" ./gradlew cleanTest test --tests "first.robot.figures.$CLASS" -q)
echo "Wrote $OUT" >&2
