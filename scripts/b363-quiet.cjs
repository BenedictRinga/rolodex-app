// BUILD 363 — THE QUIET ARRIVAL, SURGICAL (the founder's excise law, verbatim).
// Re-apply ONLY the quiet-arrival excise from the rejected pass — all FOUR
// elements this time (the pass only gated three; the capture box never stood
// down) — with NONE of the rest of the arrival law (no seat-cap prepend, no
// guarded scroll handler, no drawer auto-open, no walk arming).
//   (1) loop-wake.service.ts: the three payload sites carry the digest pick's
//       loopId (native extra, PWA catch-up data, the 9AM web timer).
//   (2) home.page.ts: the two tap lanes set home.quietArrival = true only
//       when the payload carries a loopId; the inbox-close binding clears it.
//   (3) home.page.html: [quietArrival] rides to the inbox.
//   (4) loop-inbox.component.ts: the setter input arms quietActive; flipping
//       to the walk disarms it (the preamble is deferred, not deleted).
//   (5) loop-inbox.component.html: the FOUR preamble elements gate on
//       !quietActive — li-samples, li-empty (the fulcrum), li-capture (the
//       box + LOOP button), li-selfrow (the two pills). The nudge bar STAYS
//       (it is the pointer to the named loops).
// Byte-identical when NOT arriving from a wake tap: quietActive defaults false.
const fs = require('fs');
const NL = String.fromCharCode(10);
const ok = (c, m) => { if (!c) { console.log('MISS: ' + m); process.exit(1); } };

// ── (1) loop-wake.service.ts — the three payload sites ──
const WP = 'src/app/services/loop-wake/loop-wake.service.ts';
let w = fs.readFileSync(WP, 'utf8');
ok(w.includes("extra: { type: 'loopWake', count: waiting.length }"), 'native extra');
w = w.replace(
  "extra: { type: 'loopWake', count: waiting.length },",
  "extra: { type: 'loopWake', count: waiting.length, loopId: pick?.id }, // 363 the payload carries the address"
);
ok(w.includes("data: { action: 'loopDigest' } }"), 'catch-up data x' + (w.match(/data: \{ action: 'loopDigest' \} \}/g) || []).length);
w = w.replace(
  "this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 0, data: { action: 'loopDigest' } });\n        }\n      } catch { /* best effort */ }",
  "this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 0, data: { action: 'loopDigest', loopId: pick?.id } }); // 363 the payload carries the address\n        }\n      } catch { /* best effort */ }"
);
ok(w.includes('private armWebDigest(body: string, delay: number): void'), 'armWebDigest signature');
w = w.replace(
  'private armWebDigest(body: string, delay: number): void {',
  'private armWebDigest(body: string, delay: number, loopId?: string): void {'
);
w = w.replace(
  "this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 0, data: { action: 'loopDigest' } });\n      } catch { /* dock is best-effort */ }",
  "this.inAppNotifications.notify(`⏰ ${body}`, { kind: 'info', duration: 0, data: { action: 'loopDigest', loopId } }); // 363 the payload carries the address\n      } catch { /* dock is best-effort */ }"
);
ok(w.includes('this.armWebDigest(body, delay);'), 'armWebDigest call');
w = w.replace('this.armWebDigest(body, delay);', 'this.armWebDigest(body, delay, pick?.id);');
fs.writeFileSync(WP, w);

// ── (2) home.page.ts — the two tap lanes + the close clears ──
const HP = 'src/app/home/home.page.ts';
let h = fs.readFileSync(HP, 'utf8');
const lane1 = "else if (extra?.type === 'loopWake' || extra?.action === 'loopDigest') this.openLoopsSurface();";
ok(h.includes(lane1), 'notif lane');
h = h.replace(lane1,
  "else if (extra?.type === 'loopWake' || extra?.action === 'loopDigest') { this.quietArrival = !!(extra?.loopId); this.openLoopsSurface(); } // 363 THE QUIET ARRIVAL (the founder's excise law): a payload names its loop — the shelf preamble stands down"
);
const lane2 = "if (n?.data?.action === 'loopDigest') this.openLoopsSurface();";
ok(h.includes(lane2), 'dock lane');
h = h.replace(lane2,
  "if (n?.data?.action === 'loopDigest') { this.quietArrival = !!(n?.data?.loopId); this.openLoopsSurface(); } // 363 THE QUIET ARRIVAL"
);
ok(h.includes('quietArrival = !!(extra?.loopId)'), 'lane1 set');
// the flag field, beside the other view state — anchor on the notifTapSub line's class context: insert before "notifTapSub" declaration if exists, else before constructor usage is risky; anchor on a known field line.
const fieldAnchor = h.match(/private notifTapSub[^\n]*\n/);
ok(fieldAnchor, 'notifTapSub field');
h = h.replace(fieldAnchor[0],
  "/** 2026-10-20 BUILD 363 THE QUIET ARRIVAL: true only when a wake tap arrives WITH a payload (loopId) — the inbox's shelf preamble stands down for that arrival; cleared on inbox close and by the walk flip. */\n  quietArrival = false;\n  " + fieldAnchor[0].trimEnd() + NL
);
fs.writeFileSync(HP, h);

// ── (3) home.page.html — ride the flag to the inbox + clear on close ──
const HHP = 'src/app/home/home.page.html';
let hh = fs.readFileSync(HHP, 'utf8');
ok(hh.includes('[ftCanvas]="false" (firstMinuteDeed)'), 'inbox binding anchor');
hh = hh.replace('[ftCanvas]="false" (firstMinuteDeed)', '[ftCanvas]="false" [quietArrival]="quietArrival" (firstMinuteDeed)');
ok(hh.includes('(closeRequest)="rolodexAiChatOpen = false; inboxExpanded = false"'), 'close binding');
hh = hh.replace('(closeRequest)="rolodexAiChatOpen = false; inboxExpanded = false"',
  '(closeRequest)="rolodexAiChatOpen = false; inboxExpanded = false; quietArrival = false"');
fs.writeFileSync(HHP, hh);

// ── (4) loop-inbox.component.ts — the setter input + the walk flip disarms ──
const IP = 'src/app/components/loop-inbox/loop-inbox.component.ts';
let i = fs.readFileSync(IP, 'utf8');
const inputAnchor = /@Input\(\) set contacts\(v: any\[\] \| null \| undefined\) \{/;
ok(inputAnchor.test(i), 'contacts setter anchor');
i = i.replace(inputAnchor,
  "/** 2026-10-20 BUILD 363 THE QUIET ARRIVAL (the founder's excise law, surgical): an addressed wake arrival — the tap carried a payload loopId — stands the shelf preamble down: the three sample pills, the fulcrum, the capture box and LOOP button, and the two self pills do NOT render; the eye goes straight to the nudge bar and the named loops. NONE of the rejected pass's other machinery returns (no seat-cap prepend, no guarded scroll handler, no drawer auto-open, no walk arming). Flipping to the walk disarms — the preamble is deferred, not deleted. Byte-identical when NOT arriving from a wake tap. */\n  @Input() set quietArrival(v: boolean) { if (v) this.quietActive = true; }\n  quietActive = false;\n  " + '@Input() set contacts(v: any[] | null | undefined) {'
);
const flipAnchor = "if (s === 'walk') { this.consumePendingNudge(); this.consumePendingHandle(); }";
ok(i.includes(flipAnchor), 'walk flip anchor');
i = i.replace(flipAnchor,
  "if (s === 'walk') { this.consumePendingNudge(); this.consumePendingHandle(); this.quietActive = false; } // 363: the quiet arrival ends when the user leaves the shelf for the walk — the preamble returns"
);
fs.writeFileSync(IP, i);

// ── (5) loop-inbox.component.html — the four gates ──
const TP = 'src/app/components/loop-inbox/loop-inbox.component.html';
let t = fs.readFileSync(TP, 'utf8');
const gates = [
  ['<div class="li-samples">', '<div class="li-samples" *ngIf="!quietActive">'],
  ['<div class="li-empty">', '<div class="li-empty" *ngIf="!quietActive">'],
  ['<div class="li-capture">', '<div class="li-capture" *ngIf="!quietActive">'],
  ['<div class="li-selfrow">', '<div class="li-selfrow" *ngIf="!quietActive">'],
];
for (const [a, b] of gates) { ok(t.includes(a), a); t = t.replace(a, b); }
fs.writeFileSync(TP, t);

console.log('BUILD 363 applied: the quiet arrival, surgical — four gates, three payload sites, two lanes, one flag.');
