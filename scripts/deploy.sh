#!/usr/bin/env bash
# Run by scripts/auto-deploy.sh (cron) after merging the latest main.
# Can also be run by hand on the server: bash scripts/deploy.sh
# Installs, builds, restarts the app, and fails loudly if the health check doesn't pass.
set -eo pipefail

# Load nvm so node, npm and pm2 are available (cron starts without it).
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
set -u

HEALTH_URL="http://127.0.0.1:3010/api/health"

cd "$HOME/apps/homemenu-node"
echo "Deploying: $(git log --oneline -1)"

npm ci --omit=dev
npm run migrate
npm ci --prefix client
npm run build

pm2 restart homemenu-beta

# Give the app a moment to start, then check quietly until it answers.
sleep 3
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if body="$(curl -fs "$HEALTH_URL")"; then
    echo "$body"
    echo "Deploy OK"
    exit 0
  fi
  sleep 2
done

# Still failing: run once more with errors shown, so the log says why.
echo "Health check failed after deploy:" >&2
curl -fsS "$HEALTH_URL" >&2 || true
exit 1