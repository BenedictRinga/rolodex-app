#!/bin/bash
# Script: deploy.sh (rolodex-app) — mirrors the zyppar/rolodex-server ritual.
# The built PWA (www/) is TRACKED in this repo (like zyppar). One command:
# fetch → reset → pull (main) → copy www/ into the nginx webroot → reload.
set -e
DEPLOY_DIR="/opt/rolodex-app"
WEBROOT="/var/www/rolodex"
cd "$DEPLOY_DIR" || exit 1

echo "Resetting local changes and pulling updates from origin..."
git fetch origin
if git rev-parse --verify origin/main >/dev/null 2>&1; then BRANCH="main"; else BRANCH="master"; fi
git reset --hard "origin/$BRANCH"
git pull origin "$BRANCH"

echo "Shipping the built PWA to $WEBROOT ..."
sudo mkdir -p "$WEBROOT"
sudo cp -r www/. "$WEBROOT/"
sudo chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true

echo "Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "rolodex-app deploy complete!"
