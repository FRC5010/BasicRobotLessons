#!/usr/bin/env bash
# Builds a throwaway copy of the website with the Concepts Study Guide shown
# and the fixture pages in fixtures/ added, serves it, and runs the quiz
# checks in quiz.test.js with Playwright (Chromium). Also checks that a normal
# build, the one GitHub Pages makes, has the published guide (StudyGuide::PUBLISHED
# in docs/_plugins/study_guide.rb) and none of the test fixtures.
#
# Usage: tools/site-tests/run-quiz-tests.sh
# Needs: Ruby + Bundler with docs/Gemfile installed, Node with Playwright.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
work=$(mktemp -d)
trap 'kill "${server:-}" 2>/dev/null || true; rm -rf "$work"' EXIT

mkdir -p "$work/src"
(cd "$repo/docs" && tar --exclude=_site --exclude=.jekyll-cache --exclude=vendor \
  --exclude=presentations -cf - .) | tar -xf - -C "$work/src"
build() {  # destination, then extra environment
  local dest=$1; shift
  (cd "$work/src" && env "$@" LANG=C.UTF-8 LC_ALL=C.UTF-8 \
    BUNDLE_GEMFILE="$repo/docs/Gemfile" bundle exec jekyll build -q -s . -d "$dest" 2>/dev/null)
}

echo "== a normal build has the published guide, and no fixtures"
build "$work/plain" STUDY_GUIDE_PREVIEW=0
if [ ! -e "$work/plain/study-guide/index.html" ] || ! grep -q "Concepts Study Guide" "$work/plain/index.html"; then
  echo "FAIL: the study guide is missing from a normal build" >&2; exit 1
fi
if grep -rlq "quiz-fixture" "$work/plain/study-guide"; then
  echo "FAIL: a test fixture is in a normal build" >&2; exit 1
fi
echo "ok"

echo "== preview build with the fixtures"
# Only the fixtures' quizzes, so the checks can count them: drop the real
# topic pages (the group README pages stay, so the sidebar still builds).
find "$work/src/study-guide" -mindepth 2 -name '[0-9][0-9]-*.md' -delete
cp -R "$here/fixtures/study-guide/." "$work/src/study-guide/"
mkdir -p "$work/serve"
build "$work/serve/BasicRobotLessons" STUDY_GUIDE_PREVIEW=1
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
(cd "$work/serve" && exec python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1) &
server=$!
sleep 1
BASE="http://127.0.0.1:$port/BasicRobotLessons" node "$here/quiz.test.js"
