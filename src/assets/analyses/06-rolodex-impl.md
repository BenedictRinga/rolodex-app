All source inspected. I'm choosing **Option 1 — pure CSS-animated inline SVG** (no SMIL, no video, no JS). Rationale up front, then every deliverable.

**Why not SMIL:** the codebase already ships a global reduced-motion kill-switch (`src/global.scss:372`: `animation-duration: 0.01ms !important`) and a splash-screen motion grammar built on CSS keyframes (`src/index.html:61-67`: `lk-draw`/`lk-orbit`). SMIL is invisible to both — it would ignore your accessibility net and break brand motion continuity. Why not video: Grok's 8 mp4s are unvetted, heavy on a PWA, and the SVG already *is* the storyboard (see Deliverable 6).

The design: the existing art becomes a **7.5s looping story** — pen writes a fresh coral line → the news relays dot-by-dot back to the wheel → the LoopKeeper dot settles into the gap with a halo bloom → the teal check stamps (overshoot spring) → three coral streak ticks accrue on the plinth → the scene exhales (everything transient fades) and begins again. Ambient life between beats: lamp glow breathes, coffee steam rises, pen idles. Default attribute state = today's static art exactly, so reduced-motion collapses to it perfectly.

---

## Deliverable 1 — Exact replacement HTML

**Edit:** `about-rolodex.component.html` **lines 33–115** — replace the entire `<div class="history-image">` … its closing `</div>` (the block between `<div class="rolodex-history">` at line 32 and `<div class="history-copy">` at line 116). Everything below is paste-ready; **all geometry is byte-identical to the current art** — only classes, two wrapper `<g>`s, and the three new streak-tick rects were added:

```html
      <div class="history-image">
        <svg viewBox="0 0 320 180" class="history-svg story-svg" role="img"
             aria-label="At a warmly lamplit desk, a secretary's hand lifts one card out of the Rolodex wheel while a coral pen writes the latest update onto it; a trail of coral dots carries the news back to the open ring, where the LoopKeeper dot settles into the gap beside a small teal loop-closed check. The scene animates gently on a loop.">
          <!-- paper + lamp warmth -->
          <rect width="320" height="180" fill="#FAF6F0"/>
          <polygon class="lamp-glow anim" points="40,42 178,122 46,122" fill="#FFB25C" opacity="0.15"/>
          <path d="M0 22 Q18 14 30 24" stroke="#241E19" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M22 16 L58 30 L38 56 Z" fill="#241E19"/>
          <circle cx="40" cy="41" r="4.5" fill="#FFB25C"/>

          <!-- desk -->
          <rect x="6" y="122" width="308" height="10" rx="4" fill="#D9B088"/>
          <line x1="14" y1="132" x2="306" y2="132" stroke="#241E19" stroke-width="1.5" opacity="0.18"/>
          <rect x="14" y="132" width="292" height="42" rx="6" fill="#C69363"/>
          <circle cx="160" cy="150" r="3" fill="#241E19" opacity="0.5"/>

          <!-- coffee: the caring -->
          <ellipse cx="37" cy="120.5" rx="16" ry="2.5" fill="#241E19" opacity="0.85"/>
          <path d="M27 106 h20 l-2.5 13 h-15 Z" fill="#FFFFFF" stroke="#241E19" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M47 108 q7 3 1 8" fill="none" stroke="#241E19" stroke-width="1.5"/>
          <path class="steam steam-a anim" d="M33 101 c-3 -4 3 -7 0 -11" fill="none" stroke="#241E19" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
          <path class="steam steam-b anim" d="M42 103 c-3 -4 3 -6 0 -10" fill="none" stroke="#241E19" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>

          <!-- shadow of the lifted card on the desk -->
          <ellipse cx="205" cy="124" rx="44" ry="4" fill="#241E19" opacity="0.12"/>

          <!-- the wheel that became a loop: open ring, one card gone -->
          <polygon points="74,122 102,122 96,112 80,112" fill="#241E19"/>
          <g class="streak-ticks">
            <rect class="streak streak-1 anim" x="82.5" y="114" width="2" height="6" rx="1" fill="#FF5A36"/>
            <rect class="streak streak-2 anim" x="87.5" y="114" width="2" height="6" rx="1" fill="#FF5A36"/>
            <rect class="streak streak-3 anim" x="92.5" y="114" width="2" height="6" rx="1" fill="#FF5A36"/>
          </g>
          <path class="wheel-ring anim" d="M100.3 44.2 A36 36 0 1 0 121.8 65.7" stroke="#241E19" stroke-width="7" stroke-linecap="round" fill="none"/>
          <g transform="rotate(25 88 78)">
            <rect x="76" y="14" width="24" height="32" rx="3" fill="#FFFFFF" stroke="#241E19" stroke-width="1.5"/>
            <rect x="81" y="9" width="14" height="7" rx="2" fill="#FF5A36"/>
          </g>
          <g transform="rotate(75 88 78)">
            <rect x="76" y="14" width="24" height="32" rx="3" fill="#FCF3E4" stroke="#241E19" stroke-width="1.5"/>
            <rect x="81" y="9" width="14" height="7" rx="2" fill="#E3D3BD"/>
          </g>
          <g transform="rotate(125 88 78)">
            <rect x="76" y="14" width="24" height="32" rx="3" fill="#FFFFFF" stroke="#241E19" stroke-width="1.5"/>
            <rect x="81" y="9" width="14" height="7" rx="2" fill="#FFB25C"/>
          </g>
          <g transform="rotate(185 88 78)">
            <rect x="76" y="14" width="24" height="32" rx="3" fill="#FCF3E4" stroke="#241E19" stroke-width="1.5"/>
            <rect x="81" y="9" width="14" height="7" rx="2" fill="#E3D3BD"/>
          </g>
          <g transform="rotate(245 88 78)">
            <rect x="76" y="14" width="24" height="32" rx="3" fill="#FFFFFF" stroke="#241E19" stroke-width="1.5"/>
            <rect x="81" y="9" width="14" height="7" rx="2" fill="#E3D3BD"/>
          </g>
          <!-- the LoopKeeper dot settling into the gap -->
          <g class="keeper-dot anim">
            <circle class="dot-halo anim" cx="116" cy="49" r="10" fill="#FFB25C" opacity="0.4"/>
            <circle class="dot-core" cx="116" cy="49" r="6" fill="#FF5A36" stroke="#FAF6F0" stroke-width="1.5"/>
          </g>
          <path class="dot-rays anim" d="M126 38 l7 -7 M135 46 l9 -3 M121 31 l3 -8" stroke="#FF5A36" stroke-width="2" stroke-linecap="round"/>

          <!-- the news travels from the pen back to the loop -->
          <circle class="news-dot news-1 anim" cx="182" cy="84" r="2.4" fill="#FF5A36" opacity="0.9"/>
          <circle class="news-dot news-2 anim" cx="158" cy="68" r="2.1" fill="#FF5A36" opacity="0.7"/>
          <circle class="news-dot news-3 anim" cx="139" cy="58" r="1.8" fill="#FF5A36" opacity="0.55"/>

          <!-- the lifted card, writing back -->
          <g transform="rotate(-8 204 92)">
            <rect x="166" y="72" width="84" height="54" rx="6" fill="#241E19" opacity="0.08"/>
            <rect x="162" y="66" width="84" height="54" rx="6" fill="#FFFFFF" stroke="#241E19" stroke-width="2"/>
            <rect x="196" y="60" width="16" height="9" rx="2" fill="#FF5A36"/>
            <path d="M172 80 q6 -5 12 0 t12 0" fill="none" stroke="#241E19" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
            <path d="M172 91 H230 M172 100 H222" stroke="#241E19" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
            <path class="write-line anim" d="M172 109 H204" stroke="#FF5A36" stroke-width="2.5" stroke-linecap="round"/>
            <circle class="write-period anim" cx="206" cy="109" r="2.6" fill="#FF5A36"/>
            <g class="check anim">
              <circle class="check-ring" cx="228" cy="110" r="8" fill="none" stroke="#1E9E8E" stroke-width="2.5"/>
              <path class="check-tick" d="M224.5 110 l2.5 2.8 l4.5 -5.5" fill="none" stroke="#1E9E8E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </g>

          <!-- the coral pen, mid-sentence -->
          <g class="pen anim">
            <path d="M208.5 107.8 L212 104.3" stroke="#241E19" stroke-width="3" stroke-linecap="round"/>
            <path d="M211 105 L233 83" stroke="#FF5A36" stroke-width="5" stroke-linecap="round"/>
          </g>

          <!-- her hand: she supplies the caring -->
          <path d="M320 158 L286 126 L268 140 L296 168 Z" fill="#FFB25C"/>
          <path d="M288 128 Q272 112 250 108 L248 122 Q266 126 278 140 Z" fill="#E8B48C"/>
          <path d="M254 104 Q242 105 238 114 Q244 120 253 117 Q258 110 254 104 Z" fill="#E8B48C" stroke="#C98F63" stroke-width="1"/>
        </svg>
        <div class="history-caption">One card per person — and now the card writes back.</div>
      </div>
```

Notes on the diffs: `story-svg` class added to root; `anim` marks every animated node (this is the single hook reduced-motion needs); the pen got a `<g class="pen anim">` wrapper (html:105-108 old → wrapped); the teal emblem got `<g class="check anim">`; the keeper dot got `<g class="keeper-dot anim">`; three new 2×6 coral tick rects sit on the wheel plinth (`x=82.5/87.5/92.5, y=114` — inside the trapezoid `74,122 102,122 96,112 80,112`, no overlap with rotating cards). The aria-label gains one sentence ("The scene animates gently on a loop.") — attribute-only, zero visible copy changed. Caption text is untouched.

---

## Deliverable 2 — Exact SCSS additions

**Edit:** `about-rolodex.component.scss` — insert the block below **immediately before the final `@media (min-width: 560px) { … }` block** (the last block in the file, ~line 206; inserting there keeps the responsive block last per file convention). No existing rules are modified or deleted.

```scss
/* ── 2026-08-23 THE LIVING ROLODEX ─────────────────────────────────────
   The About scene tells its story on a gentle 7.5s loop: the pen writes,
   the news relays back to the wheel, the LoopKeeper dot settles into the
   gap, the teal check stamps, streak ticks accrue — then the scene
   exhales and begins again. Pure CSS on SVG geometry (opacity /
   transform / stroke-dashoffset only). No JS, no SMIL. Every animated
   node carries .anim so prefers-reduced-motion collapses the whole
   production to the static illustration in one rule (default attribute
   state = the shipped static art). */
.history-svg {
  --story-loop: 7.5s;
}

/* one-shot intro: the ring draws itself once, echoing the app splash */
.history-svg .wheel-ring {
  stroke-dasharray: 192;
  animation: rk-ring-in 1.1s cubic-bezier(0.6, 0.05, 0.3, 1) 0.15s 1 both;
}

/* ambient life: lamp warmth breathes */
.history-svg .lamp-glow {
  animation: rk-lamp var(--story-loop) ease-in-out infinite both;
}

/* ambient life: coffee steam rises (two wisps, half-cycle apart) */
.history-svg .steam-a {
  animation: rk-steam 3.75s ease-out infinite both;
}
.history-svg .steam-b {
  animation: rk-steam 3.75s ease-out -1.875s infinite both;
}

/* beat A — the pen writes */
.history-svg .pen {
  transform-box: fill-box;
  transform-origin: 100% 100%;
  animation: rk-pen-write var(--story-loop) ease-in-out infinite both;
}
.history-svg .write-line {
  stroke-dasharray: 33;
  animation: rk-write-line var(--story-loop) linear infinite both;
}
.history-svg .write-period {
  transform-box: fill-box;
  transform-origin: center;
  animation: rk-write-period var(--story-loop) ease-out infinite both;
}

/* beat B — the news relays, dot by dot, back to the wheel */
.history-svg .news-1 { animation: rk-news-1 var(--story-loop) cubic-bezier(0.6, 0.05, 0.3, 1) infinite both; }
.history-svg .news-2 { animation: rk-news-2 var(--story-loop) cubic-bezier(0.6, 0.05, 0.3, 1) infinite both; }
.history-svg .news-3 { animation: rk-news-3 var(--story-loop) cubic-bezier(0.6, 0.05, 0.3, 1) infinite both; }

/* beat C — the LoopKeeper dot settles into the gap */
.history-svg .keeper-dot {
  animation: rk-dot-settle var(--story-loop) cubic-bezier(0.6, 0.05, 0.3, 1) infinite both;
}
.history-svg .dot-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: rk-halo var(--story-loop) ease-out infinite both;
}
.history-svg .dot-rays {
  transform-box: fill-box;
  transform-origin: center;
  animation: rk-rays var(--story-loop) ease-out infinite both;
}

/* beat D — the teal check stamps (closed loops only) */
.history-svg .check {
  transform-box: fill-box;
  transform-origin: center;
  animation: rk-check-stamp var(--story-loop) cubic-bezier(0.34, 1.56, 0.64, 1) infinite both;
}
.history-svg .check-ring {
  stroke-dasharray: 51;
  animation: rk-check-ring var(--story-loop) linear infinite both;
}
.history-svg .check-tick {
  stroke-dasharray: 12;
  animation: rk-check-tick var(--story-loop) linear infinite both;
}

/* beat E — streak ticks accrue on the plinth */
.history-svg .streak-1 { animation: rk-streak-1 var(--story-loop) ease-out infinite both; }
.history-svg .streak-2 { animation: rk-streak-2 var(--story-loop) ease-out infinite both; }
.history-svg .streak-3 { animation: rk-streak-3 var(--story-loop) ease-out infinite both; }

/* ── keyframes ── */
@keyframes rk-ring-in {
  0%   { stroke-dashoffset: 192; opacity: 0; }
  8%   { opacity: 1; }
  100% { stroke-dashoffset: 0; }
}

@keyframes rk-lamp {
  0%, 100% { opacity: 0.15; }
  50%      { opacity: 0.21; }
}

@keyframes rk-steam {
  0%   { transform: translateY(0);    opacity: 0; }
  25%  { opacity: 0.38; }
  70%  { opacity: 0.25; }
  100% { transform: translateY(-6px); opacity: 0; }
}

@keyframes rk-pen-write {
  0%   { transform: rotate(0deg); }
  3%   { transform: rotate(2deg); }
  6%   { transform: rotate(-1.5deg); }
  9%   { transform: rotate(2deg); }
  12%  { transform: rotate(-1deg); }
  15%  { transform: rotate(1.5deg); }
  18%, 100% { transform: rotate(0deg); }
}

@keyframes rk-write-line {
  0%   { stroke-dashoffset: 33; opacity: 0; }
  2%   { opacity: 1; }
  16%  { stroke-dashoffset: 0; }
  93%  { stroke-dashoffset: 0; opacity: 1; }
  99%, 100% { opacity: 0; }
}

@keyframes rk-write-period {
  0%, 13% { opacity: 0; transform: scale(0.4); }
  16%     { opacity: 1; transform: scale(1); }
  18%     { transform: scale(1.15); }
  20%, 93% { opacity: 1; transform: scale(1); }
  99%, 100% { opacity: 0; }
}

@keyframes rk-news-1 {
  0%, 20% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  23%     { opacity: 1; transform: translate(0, 0) scale(1); }
  28%     { opacity: 0.9; transform: translate(-24px, -16px) scale(1); }
  29%, 100% { opacity: 0; }
}
@keyframes rk-news-2 {
  0%, 27% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  30%     { opacity: 1; transform: translate(0, 0) scale(1); }
  35%     { opacity: 0.7; transform: translate(-19px, -10px) scale(1); }
  36%, 100% { opacity: 0; }
}
@keyframes rk-news-3 {
  0%, 34% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  37%     { opacity: 1; transform: translate(0, 0) scale(1); }
  42%     { opacity: 0.55; transform: translate(-15px, -8px) scale(1); }
  43%, 100% { opacity: 0; }
}

@keyframes rk-dot-settle {
  0%, 42% { opacity: 0; transform: translate(12px, 6px); }
  44%     { opacity: 1; }
  50%     { transform: translate(-1.5px, -0.8px); }
  54%, 93% { opacity: 1; transform: translate(0, 0); }
  99%, 100% { opacity: 0; }
}

@keyframes rk-halo {
  0%, 44% { opacity: 0; transform: scale(0.4); }
  49%     { opacity: 0.45; transform: scale(1.15); }
  54%, 93% { opacity: 0.4; transform: scale(1); }
  99%, 100% { opacity: 0; }
}

@keyframes rk-rays {
  0%, 48% { opacity: 0; transform: scale(0.6); }
  53%     { opacity: 1; transform: scale(1.05); }
  57%, 93% { opacity: 1; transform: scale(1); }
  99%, 100% { opacity: 0; }
}

@keyframes rk-check-stamp {
  0%, 60% { opacity: 0; transform: scale(1.5); }
  63%     { opacity: 1; transform: scale(0.95); }
  66%, 93% { opacity: 1; transform: scale(1); }
  99%, 100% { opacity: 0; }
}

@keyframes rk-check-ring {
  0%, 61% { stroke-dashoffset: 51; opacity: 0; }
  63%     { opacity: 1; }
  71%, 93% { stroke-dashoffset: 0; opacity: 1; }
  99%, 100% { opacity: 0; }
}

@keyframes rk-check-tick {
  0%, 66% { stroke-dashoffset: 12; opacity: 0; }
  68%     { opacity: 1; }
  74%, 93% { stroke-dashoffset: 0; opacity: 1; }
  99%, 100% { opacity: 0; }
}

@keyframes rk-streak-1 {
  0%, 73% { opacity: 0; transform: translateY(2px); }
  75%     { opacity: 0.95; transform: translateY(0); }
  77%, 90% { opacity: 0.95; transform: translateY(0); }
  96%, 100% { opacity: 0; }
}
@keyframes rk-streak-2 {
  0%, 77% { opacity: 0; transform: translateY(2px); }
  79%     { opacity: 0.95; transform: translateY(0); }
  81%, 90% { opacity: 0.95; transform: translateY(0); }
  96%, 100% { opacity: 0; }
}
@keyframes rk-streak-3 {
  0%, 81% { opacity: 0; transform: translateY(2px); }
  83%     { opacity: 0.95; transform: translateY(0); }
  85%, 90% { opacity: 0.95; transform: translateY(0); }
  96%, 100% { opacity: 0; }
}

/* ── REDUCED MOTION: collapse to the static illustration ──
   Authoritative even though global.scss already zeroes durations — the
   global rule alone would leave infinite loops spinning at 0.01ms. */
@media (prefers-reduced-motion: reduce) {
  .history-svg .anim,
  .history-svg .anim * {
    animation: none !important;
  }
}
```

Two engineering details worth knowing: (1) dash lengths are real — write-line = 32u + cap allowance → 33; check ring = 2π×8 ≈ 50.3 → 51; check tick ≈ 10.9 → 12; wheel ring arc ≈ 191.6 → 192. (2) Round linecaps render a dot at `dashoffset = length`, so every draw keyframes pairs the dash with an opacity ramp — no popping artifacts.

---

## Deliverable 3 — TS changes

**None.** `about-rolodex.component.ts` is untouched — no bindings, no lifecycle hooks, no queries. The animation lives and dies with the DOM, so it stops automatically when the modal closes (`ngOnDestroy`, ts:59-61 territory — no change needed).

---

## Deliverable 4 — Keyframe timing table (master clock T = 7.5s)

| % | sec | Beat | Element | Motion |
|---|-----|------|---------|--------|
| 0 | 0.00 | — | all transients | hidden; scene = furniture only (wrap point, continuous) |
| 0–1 | 0.00–0.08 | intro | wheel-ring *(one-shot, 1.1s, page load)* | ring draws itself, echo of splash `lk-draw` |
| 0–50 | 0.00–3.75 | ambient | lamp-glow | warmth breathes 0.15 → 0.21 → 0.15 |
| 0–100 ×2 | ambient | steam-a/b | wisps rise 6px & fade, half-cycle apart |
| 2–16 | 0.15–1.20 | A | write-line | coral line draws left→right on card |
| 0–18 | 0.00–1.35 | A | pen | ±2° write wiggle around hand grip, then still |
| 16–20 | 1.20–1.50 | A | write-period | period pops as the sentence lands |
| 20–29 | 1.50–2.18 | B | news-1 | pops at pen, glides (−24,−16) toward wheel, fades |
| 27–36 | 2.03–2.70 | B | news-2 | relay hop (−19,−10) |
| 34–43 | 2.55–3.23 | B | news-3 | final hop (−15,−8) arrives at gap |
| 42–54 | 3.15–4.05 | C | keeper-dot | fades in offset (+12,+6), settles with overshoot into gap |
| 44–54 | 3.30–4.05 | C | dot-halo | apricot halo blooms 0.4→1.15×→1× |
| 48–57 | 3.60–4.28 | C | dot-rays | coral rays fan out |
| 60–66 | 4.50–4.95 | D | check | teal emblem stamps 1.5×→0.95×→1× (spring bezier) |
| 61–71 | 4.58–5.33 | D | check-ring | teal circle draws |
| 66–74 | 4.95–5.55 | D | check-tick | teal tick draws — loop officially closed |
| 73–85 | 5.48–6.38 | E | streak-1/2/3 | three coral ticks accrue on plinth, staggered ~0.3s |
| 93–99 | 6.98–7.43 | F | all transients | the scene exhales — everything eases to hidden |
| 99–100 | 7.43–7.50 | F | — | rest; wrap is seamless (0% ≡ 100%) |

Total loop 7.5s < 8s budget. ✔

---

## Deliverable 5 — Mobile/perf notes + reduced-motion verification

**Perf:** 14 animated nodes, animating only `opacity`, `transform`, `stroke-dashoffset` (tiny paint regions) — no layout, no filters, no shadows, no JS frames. Deliberately **no `will-change`**: promoting 14 SVG nodes to compositor layers would cost more on low-end Android than the paints save. Zero network cost, ~6 KB SCSS. Steam/lamp run independently of the story clock (3.75s = exactly ½ master period, so phase stays harmonious). The modal-scoped DOM means the loop cannot outlive the page.

**Reduced-motion verification steps:**
1. Chrome DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion: reduce`" → reload: full static illustration, zero motion, streak ticks + check + written line all visible (default attributes), no console errors.
2. macOS Safari: System Settings → Accessibility → Display → Reduce motion → reopen About modal → static.
3. iOS: Settings → Accessibility → Motion → Reduce Motion → Safari/PWA → static.
4. Android: Settings → Accessibility → Remove animations → static.
5. Sanity-check the *unreduced* path too: confirm the global kill-switch in `global.scss:372` did not leave a 0.01ms loop spinning (our component-level `animation: none !important` prevents this).
6. Contrast check: nothing animated alters any text; caption/copy contrast is untouched.

---

## Deliverable 6 — Divergence note (where DeepSeek/Grok would disagree)

- **Grok would push the mp4 hero** (Option 3): cinematics, IntersectionObserver play/pause, WebM+MP4 dual source. Needs human eyes because: 8 unvetted shots at `D:\TODOs\grok-rolodex-animation\` may be off-brand or malformed; +0.5–3 MB on a $1/mo consumer PWA; iOS modal autoplay quirks; poster/SVG fidelity mismatch. **Admission criteria if you ever want it:** all shots human-approved, ≤ 1.5 MB, seamless silent loop, `<video muted playsinline loop preload="none" poster="(SVG exported as asset)">` with the animated SVG beneath as the permanent fallback — and it must remain *disabled* under reduced motion.
- **DeepSeek would likely choose SMIL** (`<animate>`/`<animateMotion>`) for self-containment. I rejected it deliberately: SMIL bypasses both the global reduced-motion rule (`global.scss:372`) and any CSS pausing, and its timeline coordination for ~14 nodes is far harder to review than the table above.
- **Decisions needing your eyes:** (1) the **three coral streak ticks** are new permanent static geometry on the plinth — approve or delete the `<g class="streak-ticks">` block and the three `rk-streak-*` keyframes; (2) the appended **aria-label sentence** ("The scene animates gently on a loop.") — approve wording; (3) the metaphor call: the keeper dot **fades each loop and returns** — read as "the loop closed; the secretary turns to the next card," but if you'd rather the dot *persist* (closed loops stay closed), change `rk-dot-settle`'s tail to hold opacity 1 and only fade the halo/rays — one-line change, flagged for taste; (4) 7.5s pacing — slow to taste by editing only `--story-loop` (all percentages scale automatically).
