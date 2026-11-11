#!/usr/bin/env bash
# Runs on the server after `git pull` (triggered by GitHub Actions over SSH).
# Installs, builds, restarts the app, and fails loudly if the health check doesn't pass.
set -eo pipefail

# Load nvm so node, npm and pm2 are available (SSH sessions start without it).
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
set -u

cd "$HOME/apps/homemenu-node"
echo "Deploying: $(git log --oneline -1)"

npm ci --omit=dev
npm ci --prefix client
npm run build

pm2 restart homemenu-beta

# Give the app a few seconds to start, then confirm it's healthy.
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:3010/api/health; then
    echo
    echo "Deploy OK"
    exit 0
  fi
  sleep 2
done

echo "Health check failed after deploy" >&2
exit 1