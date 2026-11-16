#!/usr/bin/env bash
# Run by cron every 2 minutes on the server.
# Deploys when GitHub's main has a commit that hasn't been deployed successfully yet.
#
# ~/.homemenu-deployed         commit that last reached "Deploy OK"
# ~/.homemenu-deploy-failures  "<commit> <count>" for a commit that keeps failing
#
# A failed deploy is retried on the next run, up to MAX_ATTEMPTS times per commit.
# After that it waits for a new commit. To force more retries sooner:
#   rm ~/.homemenu-deploy-failures
set -eo pipefail

DEPLOYED_FILE="$HOME/.homemenu-deployed"
FAILED_FILE="$HOME/.homemenu-deploy-failures"
MAX_ATTEMPTS=3

cd "$HOME/apps/homemenu-node"

# If a previous deploy is still running, skip this round.
exec 9>"$HOME/.homemenu-deploy.lock"
flock -n 9 || exit 0

git fetch --quiet origin main
target="$(git rev-parse origin/main)"
deployed="$(cat "$DEPLOYED_FILE" 2>/dev/null || true)"

if [ "$target" = "$deployed" ]; then
  exit 0 # already deployed successfully
fi

# Has this exact commit already failed too many times?
failed_commit=""
failed_count=0
if [ -f "$FAILED_FILE" ]; then
  read -r failed_commit failed_count <