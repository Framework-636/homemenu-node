#!/usr/bin/env bash
# Run by cron once a night on the server: puts the demo account back to its
# starting state. Other accounts are never touched (see src/demo/reset.ts).
#
# Example crontab line (3:15 am server time, with a log):
#   15 3 * * * bash "$HOME/apps/homemenu-node/scripts/reset-demo.sh" >> "$HOME/homemenu-reset.log" 2>&1
set -eo pipefail

# Load nvm so node and npm are available (cron starts without it).
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
set -u

cd "$HOME/apps/homemenu-node"
# Capture the result first, so a failed reset stops the script (and cron reports it).
result="$(npm run --silent reset-demo)"
echo "$(date '+%Y-%m-%d %H:%M') $result"
