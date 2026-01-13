#!/usr/bin/env bash
set -euo pipefail

# prepare_publish.sh
# Creates a sanitized copy of the project in ./publish and a tarball
# Excludes common sensitive and build files. Safe to run locally.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH_DIR="$ROOT_DIR/publish"
TARBALL="$ROOT_DIR/my-ai-portfolio-publish.tar.gz"

echo "Root: $ROOT_DIR"

rm -rf "$PUBLISH_DIR" "$TARBALL"
mkdir -p "$PUBLISH_DIR"

# Adjust excludes as needed
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'dev.log' \
  --exclude 'dev.*' \
  --exclude 'publish' \
  --exclude '*.pem' \
  --exclude '*.key' \
  --exclude '.vscode' \
  --exclude 'npm-debug.log' \
  --exclude 'yarn-error.log' \
  "$ROOT_DIR/" "$PUBLISH_DIR/"

# Remove any .env files that slipped through
find "$PUBLISH_DIR" -type f -name '.env*' -print -delete || true

# Init a fresh git repo in publish (optional, makes it easy to push)
if command -v git >/dev/null 2>&1; then
  (cd "$PUBLISH_DIR" && git init >/dev/null 2>&1 && git add . && git commit -m "Sanitized publish copy" >/dev/null 2>&1) || true
fi

# Create tarball
cd "$ROOT_DIR"
tar -czf "$TARBALL" -C "$ROOT_DIR" publish

echo "Created sanitized tarball: $TARBALL"
echo "Publish directory: $PUBLISH_DIR"

exit 0
