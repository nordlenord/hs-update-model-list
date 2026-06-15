#!/usr/bin/env bash
# Sync this project to a sibling open-source folder, filtering out private
# paths via .opensource-exclude.
#
# Safe to re-run: this is an in-place sync, not a fresh copy.
#   - Files added/modified in source     → written to dest
#   - Files removed from source          → removed from dest (so renames clean up)
#   - Paths matching .opensource-exclude → never touched in dest (e.g. .git/ stays)
#
# Usage:
#   scripts/copy-to-opensource.sh                  # default: ../<proj>-opensource
#   scripts/copy-to-opensource.sh /path/to/dest    # custom destination

set -euo pipefail

SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
EXCLUDE_FILE="$SOURCE/.opensource-exclude"

if [ ! -f "$EXCLUDE_FILE" ]; then
  echo "ERROR: exclude list not found at $EXCLUDE_FILE" >&2
  exit 1
fi

DEST="${1:-${SOURCE}-opensource}"
mkdir -p "$DEST"

echo "Source:      $SOURCE"
echo "Destination: $DEST"
echo "Exclude:     $EXCLUDE_FILE"
echo ""

rsync -av --delete --exclude-from="$EXCLUDE_FILE" "$SOURCE/" "$DEST/"

# .gitignore: emit only the public portion (everything before the
# "LOCAL ONLY" marker). The source file groups public vs. local entries;
# only the public group ships to opensource.
awk '/^# === LOCAL ONLY/{exit} {print}' "$SOURCE/.gitignore" > "$DEST/.gitignore"
echo ""
echo "Wrote $DEST/.gitignore (public portion only)."

echo ""
echo "Sync complete."
echo ""
echo "First-time publish (skip if dest already has a .git/):"
echo "  cd \"$DEST\""
echo "  git init && git add -A && git commit -m 'Initial commit'"
echo "  git remote add origin <public-repo-url>"
echo "  git push -u origin main"
