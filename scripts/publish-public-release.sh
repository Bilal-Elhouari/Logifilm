#!/usr/bin/env bash
# Copy a finished Logifilm release from the (private) source repository to the
# public download repository used by clients and by the app's automatic updates.
#
# Usage:   scripts/publish-public-release.sh v1.0.9
# Needs:   the GitHub CLI (gh), signed in with an account that can read
#          Bilal-Elhouari/Logifilm and write to Bilal-Elhouari/Logifilm-releases.
#          No personal access token is stored anywhere.
set -euo pipefail

SOURCE_REPO="Bilal-Elhouari/Logifilm"
PUBLIC_REPO="Bilal-Elhouari/Logifilm-releases"
TAG="${1:-}"

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: $0 vX.Y.Z" >&2
  exit 1
fi

# Every file the installers and the auto-updater need. Nothing is published
# unless all of them are present, so clients never see a half-finished release.
REQUIRED_PATTERNS=("*.exe" "*.exe.blockmap" "latest.yml" "*-arm64.dmg" "*-arm64.dmg.blockmap" "*-arm64-mac.zip" "*-arm64-mac.zip.blockmap" "latest-mac.yml")

assets=$(gh release view "$TAG" --repo "$SOURCE_REPO" --json assets --jq '.assets[].name')
for pattern in "${REQUIRED_PATTERNS[@]}"; do
  if ! grep -q -x -E "$(printf '%s' "$pattern" | sed 's/\./\\./g; s/\*/.*/g')" <<<"$assets"; then
    echo "Missing '$pattern' in $SOURCE_REPO $TAG — wait for the release workflow to finish." >&2
    exit 1
  fi
done

if gh release view "$TAG" --repo "$PUBLIC_REPO" >/dev/null 2>&1; then
  echo "$TAG is already published in $PUBLIC_REPO — nothing to do." >&2
  exit 0
fi

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

echo "Downloading $TAG from $SOURCE_REPO…"
gh release download "$TAG" --repo "$SOURCE_REPO" --dir "$workdir"

# GitHub replaces spaces in uploaded file names with dots ("Logifilm Setup 1.0.9.exe"
# becomes "Logifilm.Setup.1.0.9.exe"), while latest.yml / latest-mac.yml announce the
# name electron-builder wrote ("Logifilm-Setup-1.0.9.exe"). The updater downloads the
# announced name, so publish the file (and its .blockmap) under exactly that name.
for manifest in "$workdir"/latest.yml "$workdir"/latest-mac.yml; do
  [[ -f "$manifest" ]] || continue
  while read -r announced; do
    [[ -n "$announced" ]] || continue
    for suffix in "" ".blockmap"; do
      target="$workdir/$announced$suffix"
      [[ -f "$target" ]] && continue
      dotted="$workdir/${announced//-/.}$suffix"
      if [[ -f "$dotted" ]]; then
        mv "$dotted" "$target"
        echo "Renamed to $(basename "$target") (name announced in $(basename "$manifest"))"
      elif [[ -z "$suffix" ]]; then
        echo "The updater expects '$announced' but no matching file was found." >&2
        exit 1
      fi
    done
  done < <(grep -E '^\s*(- )?url:|^path:' "$manifest" | sed -E 's/.*(url|path):[[:space:]]*//' | sort -u)
done

echo "Publishing $TAG to $PUBLIC_REPO…"
gh release create "$TAG" "$workdir"/* \
  --repo "$PUBLIC_REPO" \
  --title "Logifilm $TAG" \
  --notes "Logifilm $TAG — download the \`.exe\` for Windows or the \`.dmg\` for macOS (Apple Silicon). Installed apps update automatically." \
  --latest

echo "Done: https://github.com/$PUBLIC_REPO/releases/tag/$TAG"
