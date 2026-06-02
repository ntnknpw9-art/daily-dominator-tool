#!/bin/bash
# Auto-sync script: runs git pull, npm build, and cap sync ios before Xcode builds.
# Used as a Pre-action in the Xcode scheme (see scripts/README-ios-prebuild.md).
#
# IMPORTANT: We do NOT use `set -e` — a Pre-action that exits non-zero kills the build
# with the cryptic "Exited with status code 127". We log everything and always exit 0.

LOG="/tmp/ios-prebuild.log"
exec > "$LOG" 2>&1

echo "===== iOS Prebuild started at $(date) ====="

# --- Resolve project root ---
# PROJECT_DIR from Xcode = .../ios/App/App  →  go up 3 to repo root
if [ -n "$PROJECT_DIR" ]; then
  PROJECT_ROOT="$(cd "$PROJECT_DIR/../../.." && pwd)"
else
  PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
echo "Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT" || { echo "ERROR: cannot cd to $PROJECT_ROOT"; exit 0; }

# --- Build a usable PATH (Xcode pre-actions start with a very minimal PATH) ---
EXTRA_PATHS="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
# Add latest nvm node if present
if [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_NODE="$(ls "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)"
  [ -n "$NVM_NODE" ] && EXTRA_PATHS="$HOME/.nvm/versions/node/$NVM_NODE/bin:$EXTRA_PATHS"
fi
# Add Volta / fnm / asdf shims if present
[ -d "$HOME/.volta/bin" ] && EXTRA_PATHS="$HOME/.volta/bin:$EXTRA_PATHS"
[ -d "$HOME/.fnm" ] && EXTRA_PATHS="$HOME/.fnm:$EXTRA_PATHS"
[ -d "$HOME/.asdf/shims" ] && EXTRA_PATHS="$HOME/.asdf/shims:$EXTRA_PATHS"
export PATH="$EXTRA_PATHS:$PATH"
echo "PATH: $PATH"

run_step() {
  local name="$1"; shift
  echo ""
  echo "--- $name ---"
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "SKIP: '$1' not found in PATH"
    return 0
  fi
  "$@" || echo "WARN: $name failed (continuing)"
}

run_step "git pull"        git pull --rebase --autostash
[ ! -d node_modules ] && run_step "npm install" npm install
run_step "npm run build"   npm run build
run_step "npx cap sync ios" npx cap sync ios

echo ""
echo "===== iOS Prebuild completed at $(date) ====="

# ALWAYS exit 0 — a Pre-action must never fail the Xcode build.
exit 0
