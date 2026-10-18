#!/usr/bin/env bash
# Backup of the committed project tree (git HEAD) as a .zip into an Obsidian
# vault folder — an extra safety layer in case a GitHub/GitLab account is
# lost: the vault itself is synced to clouds, disks, flash drives, phone.
#
# Usage: bash scripts/backup_to_obsidian.sh [--dest "<folder>"]
#
# The archive is exactly the HEAD commit (git archive): no .git, and
# uncommitted changes are NOT included. No zip/robocopy/cp needed.
set -euo pipefail

DEFAULT_DEST='C:\Users\Skycader\Documents\Obsidian Vault\12. Projects'
dest="$DEFAULT_DEST"

while (($# > 0)); do
  case "$1" in
    --dest)
      if (($# < 2)); then
        echo "error: --dest requires a folder argument" >&2
        exit 2
      fi
      dest="$2"
      shift 2
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      echo "usage: bash scripts/backup_to_obsidian.sh [--dest \"<folder>\"]" >&2
      exit 2
      ;;
  esac
done

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
name="$(basename "$root")"

if ! git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: $root is not a git repository" >&2
  exit 1
fi
if ! git -C "$root" rev-parse --verify --quiet HEAD >/dev/null; then
  echo "error: repository has no commits yet (nothing to archive)" >&2
  exit 1
fi

if command -v cygpath >/dev/null 2>&1; then
  dest="$(cygpath -u "$dest")"
fi
mkdir -p "$dest"

hash="$(git -C "$root" rev-parse --short=8 HEAD)"

shopt -s nullglob
existing=("$dest/${name}_"*"_${hash}.zip")
shopt -u nullglob
if ((${#existing[@]} > 0)); then
  echo "backup skipped: archive for commit $hash already exists: ${existing[0]}"
  exit 0
fi

if [[ -n "$(git -C "$root" status --porcelain)" ]]; then
  echo "warning: uncommitted changes are NOT in the archive (it contains exactly commit $hash)" >&2
fi

stamp="$(date +%Y-%m-%d_%H%M)"
final="$dest/${name}_${stamp}_${hash}.zip"
partial="${final}.partial"
trap 'rm -f "$partial"' EXIT

git -C "$root" archive --format=zip --prefix="${name}/" -o "$partial" HEAD

if [[ ! -s "$partial" ]]; then
  echo "error: archive is empty or was not created: $partial" >&2
  exit 1
fi

mv "$partial" "$final"

bytes="$(wc -c <"$final")"
size="$(awk -v b="$bytes" 'BEGIN {
  split("B KB MB GB", u, " "); i = 1
  while (b >= 1024 && i < 4) { b /= 1024; i++ }
  if (i == 1) printf "%d %s", b, u[i]; else printf "%.1f %s", b, u[i]
}')"

echo "backup OK: $final ($size, commit $hash)"
