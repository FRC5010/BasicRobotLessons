#!/usr/bin/env bash
#
# run-java-tests.sh — run the claims' JUnit tests (tools/claims/java/claims/*.java) against the
# libraries the course pins.
#
#   ./tools/claims/run-java-tests.sh                    # build the cut-off lesson's code, then test
#   ./tools/claims/run-java-tests.sh --sandbox DIR      # keep the built project in DIR
#   ./tools/claims/run-java-tests.sh --sandbox DIR --reuse   # test an already-built DIR again
#   ./tools/claims/run-java-tests.sh --lesson 20        # test against the code after Lesson 20
#
# It builds the code after a lesson (default: the alpha-7 cut-off, where every pinned vendordep is
# installed) with tools/verify-lessons-v3.sh --sandbox, copies the tests into the sandbox's
# src/test/java/claims/, and runs `./gradlew test --tests 'claims.*'`, so the lessons' own tests
# don't run. It then lists each test by its display name, which is the claim it checks.
#
# The sandbox is deleted at the start of every run that isn't --reuse, and must be outside this
# repo (verify-lessons-v3.sh refuses it otherwise). Without --sandbox a temporary one is used and
# removed afterwards. The builds need JDK 25: if JAVA_HOME isn't one and
# /usr/lib/jvm/java-25-openjdk-amd64 exists, that is used.
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo=$(cd "$here/../.." && pwd)
# shellcheck source=../lib/v3-lessons.sh
. "$repo/tools/lib/v3-lessons.sh"

sandbox= reuse=no lesson=$V3_ALPHA7_THROUGH
while [ $# -gt 0 ]; do
  case $1 in
    --sandbox) sandbox=$2; shift 2 ;;
    --sandbox=*) sandbox=${1#*=}; shift ;;
    --reuse) reuse=yes; shift ;;
    --lesson) lesson=$2; shift 2 ;;
    --lesson=*) lesson=${1#*=}; shift ;;
    -h|--help) sed -n '3,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$sandbox" ]; then
  [ "$reuse" = no ] || { echo "--reuse needs --sandbox" >&2; exit 2; }
  sandbox=$(mktemp -d "${TMPDIR:-/tmp}/claims-java.XXXXXX")
  trap 'rm -rf "$sandbox"' EXIT
fi

jdk25=/usr/lib/jvm/java-25-openjdk-amd64
if ! "${JAVA_HOME:-/nonexistent}/bin/java" -version 2>&1 | grep -q 'version "25'; then
  if [ -x "$jdk25/bin/java" ]; then export JAVA_HOME=$jdk25; fi
fi

if [ "$reuse" = yes ]; then
  [ -f "$sandbox/build.gradle" ] || { echo "--reuse: $sandbox holds no built project" >&2; exit 2; }
else
  echo "Building the code after Lesson $lesson in $sandbox ..."
  "$repo/tools/verify-lessons-v3.sh" "$lesson" --sandbox "$sandbox" >"$sandbox.build.log" 2>&1 || {
    tail -30 "$sandbox.build.log" >&2
    echo "run-java-tests: building the lesson code failed (log: $sandbox.build.log)" >&2
    exit 1
  }
  rm -f "$sandbox.build.log"
fi

rm -rf "$sandbox/src/test/java/claims" "$sandbox/build/test-results/test"
mkdir -p "$sandbox/src/test/java"
cp -r "$here/java/claims" "$sandbox/src/test/java/claims"

status=0
(cd "$sandbox" && ./gradlew test --tests 'claims.*' --console=plain -q) || status=$?

py=$(v3_python)
"$py" - "$sandbox/build/test-results/test" <<'EOF'
import glob, sys, xml.etree.ElementTree as ET
files = sorted(glob.glob(sys.argv[1] + '/TEST-claims.*.xml'))
if not files:
    print('run-java-tests: no test results (did the tests compile?)')
    sys.exit(0)
passed = failed = 0
for f in files:
    for case in ET.parse(f).getroot().iter('testcase'):
        bad = case.find('failure') if case.find('failure') is not None else case.find('error')
        skipped = case.find('skipped') is not None
        mark = 'SKIP' if skipped else ('FAIL' if bad is not None else 'ok  ')
        print(f"{mark} {case.get('name')}")
        if bad is not None:
            failed += 1
            print('     ' + (bad.get('message') or '').split('\n')[0][:300])
        elif not skipped:
            passed += 1
print(f'{passed} claims tests passed, {failed} failed')
EOF
exit $status
