#!/usr/bin/env bash
# Builds a throwaway copy of the website with the Concepts Study Guide shown
# and the fixture pages in fixtures/ added, serves it, and runs the quiz
# checks in quiz.test.js with Playwright (Chromium). Also checks that a normal
# build, without STUDY_GUIDE_PREVIEW, leaves the unpublished guide out.
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

echo "== a normal build leaves the guide out"
build "$work/plain" STUDY_GUIDE_PREVIEW=0
if [ -e "$work/plain/study-guide" ] || grep -q "Concepts Study Guide" "$work/plain/index.html"; then
  echo "FAIL: the study guide is in a normal build" >&2; exit 1
fi
echo "ok"

echo "== preview build with the fixtures"
cp -R "$here/fixtures/study-guide/." "$work/src/study-guide/"
mkdir -p "$work/serve"
build "$work/serve/BasicRobotLessons" STUDY_GUIDE_PREVIEW=1
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
(cd "$work/serve" && exec python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1) &
server=$!
sleep 1
BASE="http://127.0.0.1:$port/BasicRobotLessons" node "$here/quiz.test.js"
