#!/usr/bin/env node
/**
 * 2026-08-16 POST-BUILD FIX — the production minifier (terser) transforms
 * Angular classes' `static { }` blocks into `static #e = () => (...)` private
 * static arrows and DROPS their invocation for classes with other static
 * members (e.g. `Injector` with `static create`). Result: Injector.ɵprov/.NULL
 * and other framework statics never initialize -> "R3InjectorError(Platform:
 * core) No provider for Injector" (and follow-on DI crashes) at boot in the
 * minified bundle only. The DEBUG build is unaffected.
 *
 * Fix: convert every dropped `static#e=()=>(EXPR)` into a real static block
 * `static{EXPR}` (which executes at class definition, `this` = the class).
 * Uses a paren-balancing scanner (regex cannot balance nested parens).
 * The invoked pattern (`static#e=s=>(...)` with an IIFE `return s(),`) is
 * left untouched. YARN-ONLY (node, no deps).
 */
const fs = require('fs');
const path = require('path');

const wwwDir = path.resolve(__dirname, '..', 'www');
const files = fs.readdirSync(wwwDir).filter((f) => /^main\..+\.js$/.test(f));
let totalFixed = 0;
for (const f of files) {
  const file = path.join(wwwDir, f);
  let src = fs.readFileSync(file, 'utf8');
  const needle = 'static#e=()=>(';
  const out = [];
  let last = 0;
  let idx = 0;
  let fixed = 0;
  while ((idx = src.indexOf(needle, idx)) >= 0) {
    // Find the matching closing paren with a depth counter.
    let depth = 0;
    let end = -1;
    for (let i = idx + needle.length - 1; i < src.length; i++) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end < 0 || src[end + 1] !== '}') { idx += needle.length; continue; }
    const expr = src.slice(idx + needle.length - 1, end + 1); // includes the outer parens
    const inner = expr.slice(1, -1); // strip the outer parens
    if (!inner.includes('this.')) { idx += needle.length; continue; }
    out.push(src.slice(last, idx));
    out.push(`static#e=undefined;static{${inner}}`);
    last = end + 1;
    idx = end + 1;
    fixed++;
  }
  if (fixed) {
    out.push(src.slice(last));
    fs.writeFileSync(file, out.join(''));
    totalFixed += fixed;
    console.log(`[static-block-fix] ${f}: ${fixed} dropped static blocks repaired`);
  }
}
console.log(totalFixed ? `done — ${totalFixed} static blocks repaired across ${files.length} main bundle(s)` : 'no dropped static blocks found');
