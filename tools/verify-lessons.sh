#!/usr/bin/env bash
#
# verify-lessons.sh — compile-check the lesson code in this repo.
#
# The lessons' Java lives in two places that can drift apart: the snippets in
# docs/lessons/*.md and the snapshots in code/lesson-N/. Nothing compiles either
# one by default, which is how a regression can sit in main unnoticed. This
# script builds the snapshots for real.
#
# It works by rolling code/ActualLessons (the student's pristine WPILib template)
# forward through code/lesson-0 … code/lesson-N, applying each snapshot in order
# the way a student would, then running Gradle over the result.
#
#   ./tools/verify-lessons.sh          # roll through the highest lesson present
#   ./tools/verify-lessons.sh 13       # stop after Lesson 13
#   ./tools/verify-lessons.sh 17 test  # also run any src/test/java you dropped in
#
# The sandbox is a scratch copy — code/ActualLessons is never modified. Keep it
# that way: it is the students' starting point, and it is expected to stay at
# pristine template state.
#
# First run takes a few minutes to populate the Gradle cache and needs network
# access to the hosts listed in VENDORDEPS below plus Maven Central, WPILib's
# maven, and jitpack.io. Later runs are seconds.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX="${VERIFY_SANDBOX:-${TMPDIR:-/tmp}/verify-lessons}"
GRADLE_TASK="compileJava"

# Highest lesson-N directory present, unless the caller names one.
LATEST="$(ls -d "$REPO"/code/lesson-* 2>/dev/null | sed 's/.*lesson-//' | sort -n | tail -1)"
THROUGH="${1:-$LATEST}"
[ "${2:-}" = "test" ] && GRADLE_TASK="compileJava test"

# --- vendordeps -------------------------------------------------------------
# Pinned to WPILib's vendordep marketplace, one immutable file per version.
# NEVER use a vendor's own "latest" link here: PhotonVision's served a
# next-season alpha that GradleRIO rejects outright, and maple-sim's advertised
# a version that was never uploaded to their Maven repo. Both broke the build.
# Index of what exists for a year: <YEAR>_metadata.json in the same repo.
MARKETPLACE="https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main"
# "<lesson it is first needed>|<url>". Only what the requested range needs gets
# fetched, so verifying an early lesson doesn't depend on a library it predates.
# BLine (L17) isn't in the marketplace; its own repo serves the JSON and
# jitpack.io serves the jars. (The workers.dev URL its docs advertise may be
# unreachable; this raw one is equivalent.)
VENDORDEPS=(
  "1|$MARKETPLACE/2026/Phoenix6-26.3.0.json"
  "3|$MARKETPLACE/2026/AdvantageKit-26.0.2.json"
  "15|$MARKETPLACE/2026/photonlib-v2026.3.4.json"
  "16|$MARKETPLACE/2026/maple-sim-0.4.0-beta.json"
  "17|https://raw.githubusercontent.com/EdanLiahovetsky/BLine-Lib/main/BLine-Lib.json"
)

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

say "Sandbox: $SANDBOX  (rolling forward through lesson-$THROUGH)"
rm -rf "$SANDBOX"
mkdir -p "$(dirname "$SANDBOX")"
cp -r "$REPO/code/ActualLessons" "$SANDBOX"
chmod +x "$SANDBOX/gradlew"
JAVA_DIR="$SANDBOX/src/main/java/frc/robot"

say "Fetching pinned vendordeps"
# Save each under the "fileName" it declares internally, not the URL's basename —
# that is what the VS Code vendor manager writes, and Lesson 13's build.gradle
# block reads vendordeps/AdvantageKit.json by that exact name.
# Retries: a bare connection reset here is a flake, and it should not be
# indistinguishable from a compile failure.
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

say "Applying lesson snapshots 0..$THROUGH"
for n in $(seq 0 "$THROUGH"); do
  d="$REPO/code/lesson-$n"
  [ -d "$d" ] || continue
  # Java: code/lesson-N/**.java mirrors the frc/robot package tree
  # (root classes at the top, then subsystems/, commands/). Last writer wins,
  # which is what makes "apply in order" equal "the state after Lesson N".
  (cd "$d" && find . -name '*.java' -print0 | while IFS= read -r -d '' f; do
      mkdir -p "$JAVA_DIR/$(dirname "$f")"
      cp "$f" "$JAVA_DIR/$f"
  done)
  # Deploy assets (Lesson 17 on) land in src/main/deploy, NOT the Java tree.
  if [ -d "$d/deploy" ]; then
    mkdir -p "$SANDBOX/src/main/deploy"
    cp -r "$d/deploy/." "$SANDBOX/src/main/deploy/"
  fi
  echo "  applied lesson-$n"
done

say "Applying the deletions the lessons instruct"
# Snapshots can only add or replace files, so removals have to be replayed here.
del() { [ "$THROUGH" -ge "$1" ] && shift && for f; do rm -f "$JAVA_DIR/$f"; done || true; }
del 7  subsystems/DriveModule.java                                   # became SwerveModule
del 9  commands/ExampleCommand.java subsystems/ExampleSubsystem.java # Lesson 9, section 3
del 15 subsystems/VisionPoseProvider.java                            # replaced by PhotonVision
echo "  done"

say "AdvantageKit build.gradle blocks (Lesson 13, section 2)"
# Gated on Lesson 3, when AdvantageKit is installed: the block reads
# vendordeps/AdvantageKit.json at configuration time, so adding it before that
# file exists breaks the build for lessons 0-2.
if [ "$THROUGH" -lt 3 ]; then
  echo "  skipped (AdvantageKit arrives in Lesson 3)"
elif ! grep -q akit-autolog "$SANDBOX/build.gradle"; then
cat >> "$SANDBOX/build.gradle" <<'EOF'

task(replayWatch, type: JavaExec) {
    mainClass = "org.littletonrobotics.junction.ReplayWatch"
    classpath = sourceSets.main.runtimeClasspath
}

dependencies {
    def akitJson = new groovy.json.JsonSlurper().parseText(new File(projectDir.getAbsolutePath() + "/vendordeps/AdvantageKit.json").text)
    annotationProcessor "org.littletonrobotics.akit:akit-autolog:$akitJson.version"
}
EOF
  echo "  appended"
else
  echo "  already present"
fi

say "Gradle: $GRADLE_TASK"
cd "$SANDBOX"
# shellcheck disable=SC2086
./gradlew $GRADLE_TASK --console=plain

say "OK — lessons 0..$THROUGH compile"
echo "Sandbox kept at $SANDBOX (drop JUnit tests in src/test/java and re-run with 'test')."
