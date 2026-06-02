#!/bin/bash
# Auto-sync script: runs git pull, npm build, and cap sync ios before Xcode builds.
# Used as a Pre-action in the Xcode scheme (see scripts/README-ios-prebuild.md).

set -e

# Find project root (two levels up from ios/App)
PROJECT_ROOT="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
if [ -d "$PROJECT_ROOT/../../.git" ]; then
  PROJECT_ROOT="$(cd "$PROJECT_ROOT/../.." && pwd)"
fi

cd "$PROJECT_ROOT"

# Log to a file since Xcode pre-actions don't show stdout by default
LOG="/tmp/ios-prebuild.log"
exec > >(tee "$LOG") 2>&1

echo "===== iOS Prebuild started at $(date) ====="
echo "Project root: $PROJECT_ROOT"

# Ensure PATH includes node/npm (Xcode runs with minimal PATH)
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"

echo "--- git pull ---"
git pull --rebase --autostash || echo "git pull failed (continuing)"

echo "--- npm install (if needed) ---"
[ ! -d node_modules ] && npm install

echo "--- npm run build ---"
npm run build

echo "--- npx cap sync ios ---"
npx cap sync ios

echo "===== iOS Prebuild completed at $(date) ====="
