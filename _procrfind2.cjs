// Sweep "procrastinator(s)" everywhere INCLUDING the counter comments and OG; DELETED.
const fs = require('fs');
const path = require('path');
const HITS = [];
const scan = (p) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) scan(path.join(p, f)); return; }
  const f = p.split(/[\\/]/).pop();
  if (!/\.(ts|html|scss|json|js|cjs)$/.test(f)) return;
  if (/node_modules/.test(p)) return;
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  lines.forEach((ln, i) => {
    if (/procrastinator/i.test(ln)) HITS.push(p.replace(/\\/g, '/') + ':' + (i + 1) + ': ' + ln.trim().slice(0, 160));
  });
};
scan('D:/MacBook/noGoogle/loopkeeper');
scan('D:/MacBook/noGoogle/rolodex-server');
scan('D:/MacBook/noGoogle/rolodex-app'); // the archived mirror — history stays; only report it
for (const h of HITS) console.log(h);
console.log('TOTAL', HITS.length);