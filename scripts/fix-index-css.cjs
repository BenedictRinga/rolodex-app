#!/usr/bin/env node
/**
 * 2026-08-19 POST-BUILD FIX — Angular inlines critical CSS into
 * <style> in www/index.html. One of the inlined chunks starts with
 * `@charset "UTF-8";`, which is only legal at the very START of a
 * stylesheet. In the middle of the inline <style> it makes CSS parsers
 * (and editor linters) report "at-rule or selector expected".
 *
 * Fix: strip every `@charset` declaration from www/index.html. UTF-8 is
 * already the document encoding, so nothing is lost.
 */
const fs = require('fs');
const path = require('path');

const index = path.resolve(__dirname, '..', 'www', 'index.html');
let src = fs.readFileSync(index, 'utf8');
const before = src;
src = src.replace(/@charset\s+["'][^"']*["']\s*;/g, '');
if (src !== before) {
  fs.writeFileSync(index, src);
  console.log('[index-css-fix] stripped @charset from www/index.html');
} else {
  console.log('[index-css-fix] no @charset found in www/index.html');
}
