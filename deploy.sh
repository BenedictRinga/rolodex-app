#!/bin/bash
# Script: deploy.sh (rolodex-app) — HARDENED 2026-08-17.
# The built PWA (www/) is TRACKED in this repo. Deploy = fetch → reset →
# pull → INTEGRITY SELF-CHECK (abort if the checkout is torn) → copy into a
# staging dir → ATOMIC swap into the webroot → reload nginx.
# The atomic swap (mv -T) means the webroot is NEVER partially updated, even
# if the copy dies mid-way — the MIME "text/html" torn-shell failure is gone.
set -e
DEPLOY_DIR="/opt/rolodex-app"
WEBROOT="/var/www/rolodex"
STAGE="/var/www/rolodex-new"
cd "$DEPLOY_DIR" || exit 1

echo "Resetting local changes and pulling updates from origin..."
git fetch origin
if git rev-parse --verify origin/main >/dev/null 2>&1; then BRANCH="main"; else BRANCH="master"; fi
git reset --hard "origin/$BRANCH"
git pull origin "$BRANCH"

# ── Integrity self-check: every chunk the index references must exist in the
#    checkout. A torn checkout (partial git update) would otherwise ship an
#    index pointing at missing JS → the "text/html module script" blank.
INDEX_WWW="$DEPLOY_DIR/www/index.html"
if [ -f "$INDEX_WWW" ]; then
  MISSING=0
  for f in $(grep -oE '(main|runtime|polyfills|styles|vendor|scripts|common)\.[a-f0-9]+\.(js|css)' "$INDEX_WWW" | sort -u); do
    if [ ! -f "$DEPLOY_DIR/www/$f" ]; then
      echo "  TORN: $f referenced by index.html is missing from www/" >&2
      MISSING=1
    fi
  done
  if [ "$MISSING" = "1" ]; then
    echo "ABORT: the checkout is torn. Run the clean recovery (git clean -fdx + fetch) and re-deploy." >&2
    exit 1
  fi
  echo "Integrity OK — $(grep -oE '(main|runtime|polyfills|styles)\.[a-f0-9]+\.(js|css)' "$INDEX_WWW" | sort -u | wc -l) chunks verified in www/."
fi

echo "Shipping the built PWA (atomic swap)..."
sudo rm -rf "$STAGE"
sudo mkdir -p "$STAGE"
sudo cp -r www/. "$STAGE/"
sudo chown -R www-data:www-data "$STAGE" 2>/dev/null || true
# mv -T cannot REPLACE a non-empty directory (rename(2) -> ENOTEMPTY), so:
#  1) rename the live webroot aside (atomic, a microsecond of 404 - never torn)
#  2) move the fresh stage into its place (atomic)
#  3) delete the old webroot
sudo mv "$WEBROOT" "$WEBROOT.old" 2>/dev/null || true
sudo mv -T "$STAGE" "$WEBROOT"
sudo rm -rf "$WEBROOT.old"

echo "Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "rolodex-app deploy complete! (atomic swap)"
