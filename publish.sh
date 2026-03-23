#!/usr/bin/env bash
set -euo pipefail

# Publish @agentled/mcp-server to npm + MCP Registry
# Usage: ./publish.sh [patch|minor|major]  (default: patch)

BUMP_TYPE="${1:-patch}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDALONE_REPO="/tmp/mcp-server"

cd "$SCRIPT_DIR"

# 1. Bump version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"

# 2. Update version in package.json and server.json
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
# Update both version fields in server.json (top-level + package version)
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" server.json

echo "✓ Bumped version to $NEW_VERSION"

# 3. Build
echo "Building..."
npm run build
echo "✓ Build complete"

# 4. Publish to npm
echo "Publishing to npm..."
npm publish --access public
echo "✓ Published to npm"

# 5. Publish to MCP Registry
echo "Publishing to MCP Registry..."
mcp-publisher publish
echo "✓ Published to MCP Registry"

# 6. Sync to standalone repo
if [ -d "$STANDALONE_REPO" ]; then
  echo "Syncing to standalone repo..."
  cp package.json "$STANDALONE_REPO/package.json"
  cp server.json "$STANDALONE_REPO/server.json"
  cp src/server.ts "$STANDALONE_REPO/src/server.ts"
  cp -r skills "$STANDALONE_REPO/skills" 2>/dev/null || true
  cp setup-skills.mjs "$STANDALONE_REPO/setup-skills.mjs" 2>/dev/null || true
  cd "$STANDALONE_REPO"
  git add -A
  git commit -m "chore: bump to v$NEW_VERSION" || echo "No changes to commit"
  git push origin main
  echo "✓ Pushed to Agentled/mcp-server"
else
  echo "⚠ Standalone repo not found at $STANDALONE_REPO — clone it first:"
  echo "  git clone git@github.com:Agentled/mcp-server.git $STANDALONE_REPO"
fi

echo ""
echo "Done! Published @agentled/mcp-server@$NEW_VERSION"
