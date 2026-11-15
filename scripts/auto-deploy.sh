#!/usr/bin/env bash
# Run by cron every 2 minutes on the server.
# Deploys only when GitHub's main has commits the server doesn't have yet.
set -eo pipefail

cd "$HOME/apps/homemenu-node"

# If a previous deploy is still running, skip this round.
exec 9>"$HOME/.homemenu-deploy.lock"
flock -n 9 || exit 0

git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then
  exit 0 # nothing new
fi

echo "=== $(date '+%Y-%m-%d %H:%M:%S') new commit on main ==="
git merge --ff-only origin/main
bash scripts/deploy.sh