// 2026-09-16 BUILD 220: every production build drops www/build.json — the
// tiny static truth the client fetches to learn the DEPLOYED build. Updates
// compare running-vs-deployed builds (real numbers), no version.txt lies.
const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts'), 'utf8');
const build = Number((env.match(/build:\s*(\d+)/) || [])[1] || 0);
const version = (env.match(/version:\s*'([^']+)'/) || [])[1] || '';
fs.writeFileSync(
  path.join(__dirname, '..', 'www', 'build.json'),
  JSON.stringify({ version, build, at: new Date().toISOString() }, null, 2) + '\n',
);
console.log('www/build.json written:', JSON.stringify({ version, build }));
