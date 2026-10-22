/**
 * THE RELEASE BUMP — the precondition of `yarn build:prod` (2026-10-22).
 *
 * THE LAW (founder: 'Script it into package.json, and pre-condition as first
 * step inside yarn build:prod sequence' — after rejecting both the unscripted
 * hand edit and the self-ticking counter that moved without history):
 *
 *   THE COUNTER NEVER MOVES WITHOUT ITS CHANGELOG.
 *
 * HOW IT WORKS:
 *   1. Write the release's one-line changelog into RELEASE_NOTE.txt at the
 *      repo root (the hand's part — WHAT changed, one line).
 *   2. Run `yarn build:prod`. This script runs FIRST: it increments `build:`
 *      in BOTH environment files and welds the note into the changelog chain
 *      head (`build: N+1, // <today> <note> Previous: build: N, // ...`).
 *   3. The note is consumed (renamed to RELEASE_NOTE.used.txt) — the next
 *      build:prod without a fresh note FAILS LOUD, so the counter can never
 *      tick in the dark. If the build itself fails after the bump, restore
 *      the note from RELEASE_NOTE.used.txt before retrying (one bump per
 *      release, not one per attempt).
 */
const fs = require('fs');

const NOTE = 'RELEASE_NOTE.txt';

if (!fs.existsSync(NOTE)) {
  throw new Error(
    'RELEASE_NOTE.txt is missing — write the release\'s one-line changelog ' +
    'first. The counter never moves without its history.'
  );
}

const note = fs.readFileSync(NOTE, 'utf8').trim().replace(/\s+/g, ' ');
if (!note) {
  throw new Error('RELEASE_NOTE.txt is empty — write the one-line changelog.');
}

const today = new Date().toISOString().slice(0, 10);
let bumped = 0;

for (const f of ['src/environments/environment.ts', 'src/environments/environment.prod.ts']) {
  let s = fs.readFileSync(f, 'utf8');
  const m = s.match(/build:\s*(\d+),\s*\/\//);
  if (!m) throw new Error(f + ': no build counter found at the chain head');
  const next = Number(m[1]) + 1;
  const head = 'build: ' + m[1] + ', //';
  const line = 'build: ' + next + ', // ' + today + ' ' + note + ' Previous: ' + head;
  s = s.replace(head, line);
  fs.writeFileSync(f, s);
  bumped = next;
  console.log('  ok  ' + f + ' -> build ' + next);
}

if (!bumped) throw new Error('no environment file was bumped');
fs.renameSync(NOTE, 'RELEASE_NOTE.used.txt');
console.log('  ok  RELEASE_NOTE.txt consumed -> RELEASE_NOTE.used.txt');
console.log('  RELEASE build ' + bumped + ': ' + note);
