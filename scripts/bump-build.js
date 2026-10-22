/**
 * THE BUILD COUNTER MUST TICK ITSELF (2026-10-22).
 *
 * THE FOUNDER: "We seem stuck on 373, but we now have the latest commit in production."
 * Production's build.json reads { version:0.3.1, build:373, at:2026-10-22T06:21 }, i.e. it WAS
 * rebuilt this morning - and stamped 373 again.
 *
 * WHY: scripts/write-build-json.js only READS `build:` out of environment.prod.ts and writes it
 * to www/build.json. Nothing increments it. So the deployed build can never exceed the running
 * app's build, and the update prompt can never fire. The number moves only if a human edits the
 * environment by hand.
 *
 * THE FIX:
 *  1. scripts/bump-build.js increments `build:` in environment.prod.ts (and environment.ts).
 *  2. the build scripts run it BEFORE ng build, so the bundle compiles with the NEW number and
 *     www/build.json carries the same one.
 */
const fs = require('fs');
const path = require('path');

const root = 'D:/MacBook/noGoogle/loopkeeper';
const files = [
  path.join(root, 'src', 'environments', 'environment.prod.ts'),
  path.join(root, 'src', 'environments', 'environment.ts'),
];

let next = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const m = s.match(/(build:\s*)(\d+)/);
  if (!m) continue;
  next = Number(m[2]) + 1;
  fs.writeFileSync(f, s.replace(/(build:\s*)(\d+)/, `$1${next}`), 'utf8');
  console.log(`  ok  ${path.basename(f)} -> build ${next}`);
}
if (!next) throw new Error('no build counter found to increment');
