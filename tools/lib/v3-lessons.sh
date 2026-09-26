# shellcheck shell=bash
#
# v3-lessons.sh — the rules for rolling the v3 (OpMode) track's lesson
# snapshots onto a project, shared by tools/verify-lessons-v3.sh and
# tools/update-lesson-v3.sh so the two can never disagree about what "the
# state after Lesson N" means. Source it; it defines data and functions only
# and never runs anything on its own.
#
# A snapshot, code/v3/lesson-N/, mirrors the first/robot package tree
# (root classes at the top, then opmode/, subsystems/), and
# code/v3/lesson-N/tests/** maps to src/test/java/first/robot/. Applying
# snapshots 0..N in order, last writer wins, then replaying the deletions
# below, gives the state after Lesson N.

# The highest lesson whose code has been migrated to WPILib 2027 alpha-7.
# Snapshots above it still target alpha-6 and don't compile on the current
# base; raise this as Phase 1b migrates them (docs/lesson-plan-alpha7-upgrade.md).
V3_ALPHA7_THROUGH=15

# --- vendordeps -------------------------------------------------------------
# Pinned to WPILib's vendordep marketplace's 2027_alpha7 bucket, one
# immutable file per version — never a vendor's own "latest" link.
# LimelightLib 2 (vision, from Lesson 15) is not in the marketplace, and its
# own URL is a moving link — the same LimelightLib-alpha7.json was
# overwritten five times between beta5 and beta9 — so it pins to one commit
# of Limelight's repo instead, which can't drift. Its Maven repo keeps every
# version, so an old pin stays buildable.
V3_MARKETPLACE="https://raw.githubusercontent.com/wpilibsuite/vendor-json-repo/main/2027_alpha7"
V3_LIMELIGHT_PIN="https://raw.githubusercontent.com/LimelightVision/limelightlib-public/717a921719f5dbaf4ce940819e2d84bdab8738b9"
# "<lesson it is first needed>|<url>". CommandsV3 is NOT listed — it ships
# already installed in code/OpModeV3Robot/vendordeps/, and so in every
# project made from that template.
V3_VENDORDEPS=(
  "1|$V3_MARKETPLACE/Phoenix6-26.70.0-alpha-2.json"
  "15|$V3_LIMELIGHT_PIN/LimelightLib-alpha7.json"   # 2.0.0-beta9-alpha7
)

# --- deletions --------------------------------------------------------------
# Snapshots can only add or replace files, so the removals the lessons
# instruct are listed here: "<lesson that deletes it>|<path under first/robot>".
# When the lesson has the student RENAME the file rather than delete it, a
# third field names what it became; tools/check-lesson-markers-v3.py then
# checks the old file's markers against the renamed one.
V3_DELETIONS=(
  "7|subsystems/DriveModule.java|subsystems/SwerveModule.java"
  "9|opmode/MyTeleop.java|opmode/RobotTeleop.java"
  "9|opmode/MyAuto.java|opmode/RobotAuto.java"
  "15|subsystems/VisionPoseProvider.java"  # replaced by LimelightPoseProvider
)

# v3_fetch_vendordep URL DEST_DIR
# Downloads one vendordep JSON into DEST_DIR, saved under the "fileName" its
# own contents declare (not the URL's basename). Retries network failures;
# returns non-zero after four failed attempts.
v3_fetch_vendordep() {
  local url="$1" dest="$2" tmp attempt name
  tmp="$(mktemp)"
  for attempt in 1 2 3 4; do
    if curl -fsSL --max-time 60 -o "$tmp" "$url"; then
      name="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["fileName"])' "$tmp")"
      mkdir -p "$dest"
      mv "$tmp" "$dest/$name"
      echo "  ok  $name"
      return 0
    fi
    echo "  retry $attempt  $url" >&2
    sleep $((attempt * 2))
  done
  rm -f "$tmp"
  echo "  FAILED after 4 attempts (network, not your code): $url" >&2
  return 1
}

# v3_fetch_vendordeps THROUGH DEST_DIR
# Fetches every pinned vendordep that lessons 0..THROUGH need.
v3_fetch_vendordeps() {
  local through="$1" dest="$2" entry
  for entry in "${V3_VENDORDEPS[@]}"; do
    if [ "$through" -ge "${entry%%|*}" ]; then
      v3_fetch_vendordep "${entry#*|}" "$dest" || return 1
    fi
  done
}

# v3_apply_snapshots REPO THROUGH PROJECT_DIR
# Copies code/v3/lesson-0 .. lesson-THROUGH onto PROJECT_DIR in order.
v3_apply_snapshots() {
  local repo="$1" through="$2" project="$3" n d f
  local java_dir="$project/src/main/java/first/robot"
  for n in $(seq 0 "$through" 2>/dev/null || true); do
    d="$repo/code/v3/lesson-$n"
    [ -d "$d" ] || continue
    # ./tests/* is excluded here — it maps to src/test/java instead, below.
    while IFS= read -r -d '' f; do
      mkdir -p "$java_dir/$(dirname "$f")"
      cp "$d/$f" "$java_dir/$f"
    done < <(cd "$d" && find . -name '*.java' -not -path './tests/*' -print0)
    if [ -d "$d/tests" ]; then
      mkdir -p "$project/src/test/java/first/robot"
      cp -r "$d/tests/." "$project/src/test/java/first/robot/"
    fi
    echo "  applied lesson-$n"
  done
}

# v3_apply_deletions THROUGH PROJECT_DIR
# Removes the files lessons 0..THROUGH tell the student to delete.
v3_apply_deletions() {
  local through="$1" project="$2" entry path
  local java_dir="$project/src/main/java/first/robot"
  for entry in "${V3_DELETIONS[@]}"; do
    path="${entry#*|}"
    path="${path%%|*}"
    if [ "$through" -ge "${entry%%|*}" ] && [ -e "$java_dir/$path" ]; then
      rm -f "$java_dir/$path"
      echo "  deleted $path"
    fi
  done
}
