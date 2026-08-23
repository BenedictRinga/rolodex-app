VERDICT FIRST, THEN THE FULL SPEC.

=====================================================================
1. VERDICT
=====================================================================

**This cannot be completed by me alone. It requires human + me.**

Honest capability statement, stated plainly:
- I am a read-only text agent. I **cannot watch the 8 mp4s**, cannot run ffmpeg, cannot render or trim frames, and cannot judge AI-clip quality (morphing hands, garbled logo letterforms, palette drift). My trim points below are **estimates derived from the README captions**, not from viewing the footage.
- **I also could not complete the codebase inspection this session** — my file reads returned empty, so I have **no verified line numbers** for `about-rolodex.component.html/.scss`. Per the honesty constraint, I will **not fabricate line numbers**. Every edit below is cited as **file + insertion anchor**, and the human must confirm exact lines before applying. The code is written as self-contained blocks (wrapper + append-at-EOF) precisely so anchor-based insertion cannot damage the refined copy.
- What I *can* do alone, in text: the complete edit decision list (EDL), paste-ready HTML/SCSS/TS, the asset manifest, every ffmpeg command, the integration plan, reduced-motion/data-saver policy, and the iOS/perf notes.
- What the human must do: run the ffmpeg pipeline, **eyeball each of the 8 shots for AI artifacts**, confirm the shot-6 mark actually matches the real LoopKeeper logo, and apply the anchored edits.

**Usability of the 8 mp4s: UNVERIFIED.** I cannot decode them. Treat them as usable-pending-QC. If QC fails them, Path B (pure CSS/SVG storyboard upgrade) is fully specified in §4b as the no-video completion of Grok's vision.

**Chosen path: (c) Hybrid** — a single silent 30 s video loop built from all 8 shots as the hero enhancement; the existing Ox Alpha SVG (build 61, `D:\TODOs\rolodex-svg-animation\`) remains the canonical fallback and the reduced-motion / data-saver experience. The copy is never touched.

=====================================================================
2. EDIT DECISION LIST — MAKING THE 8 SHOTS SEAMLESS
=====================================================================

Grok's shots are standalone clips. To become a loop they need: one order, fixed trims, baked transitions, and a **dip-through-black loop join** (the classic seamless-loop device, since shot 1 and the dark shot-6 lockup can't hard-cut into each other).

Order and rationale — shot 6 moves from position 6 to the END, because "slow push-in on LoopKeeper mark, dark background" is Grok's end-lockup shot and the natural pre-black hold. Shot 4 (dust motes) becomes the mid-reel breather between the interaction beats and the mechanical beats.

| # | Source | Content (per README) | Trim | Master dur | Transition |
|---|--------|----------------------|------|-----------|------------|
| 1 | 1.mp4 | coral sphere settles into loop gap | 0→4.0 s | 4.0 s | fade-in 0.6 s **from black** (loop join); fade-out 0.4 s |
| 2 | 2.mp4 | coral pen tip glides across card | 0→3.5 s | 3.5 s | fades 0.4 s |
| 3 | 3.mp4 | finger taps coral Send, soft glow | 0→3.5 s | 3.5 s | fades 0.4 s |
| 4 | 4.mp4 | dust motes drift, camera moves | 0→3.0 s | 3.0 s | fades 0.4 s (breather) |
| 5 | 5.mp4 | cinematic push-in, rolling card-index wheel | 0→4.0 s | 4.0 s | fades 0.4 s |
| 6 | 7.mp4 | push toward card between rolling file and open ring | 0→3.5 s | 3.5 s | fades 0.4 s |
| 7 | 8.mp4 | woman's hand lifts cream index card from wheel | 0→3.5 s | 3.5 s | fades 0.4 s |
| 8 | 6.mp4 | slow push-in on LoopKeeper mark, dark bg | 0→5.0 s (hold last 1.5 s) | 5.0 s | fade-in 0.4 s; fade-out **1.0 s to black** (loop join) |

**Total: exactly 30.0 s, silent, loops via black.** If a source clip is shorter than its trim, use its full length and keep the fade timings — the loop tolerates 26–32 s.

**Human QC gate before encoding (non-negotiable, I cannot do this):**
1. Watch every shot end-to-end. AI video fails hardest on **hands (shot 8)** and **lettering (shot 6)**. If shot 6's mark is garbled, replace its last 2 s with a static logo card rendered from the existing SVG (command in §3).
2. Confirm each clip actually contains ≥ its trim duration.
3. Check palette continuity 1→8; if any shot is wildly off-color, add `eq=saturation=0.95:gamma=0.98` to that shot's filter chain.

=====================================================================
3. EXACT PRODUCTION STEPS (HUMAN + FFMPEG)
=====================================================================

Working dir: `D:\TODOs\grok-rolodex-animation\`. Output to `rolodex-app/src/assets/rolodex/grok/` (create it). All encodes: **1280×720, 30 fps, H.264 High@4.0, yuv420p, no audio, faststart, CRF 23, cap 1.5 MB/shot.** At 720p with slow cinematic motion, expect 250–600 KB/shot — the 1.5 MB cap has huge headroom.

**Step 1 — normalize + trim + bake fades, one command per shot.** Template (shot 1 shown; change `trim=duration`, fade `st`, and filenames per the table; shot 6 uses `fade=t=out:st=4.0:d=1.0`):

```
ffmpeg -y -i 1.mp4 -vf "fps=30,scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,setsar=1,trim=duration=4.0,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.6,fade=t=out:st=3.6:d=0.4" -an -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 23 -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p -movflags +faststart shot-01.mp4
```

**Step 2 — QC each master** (open all 8, check the black dips at head of shot-01 and tail of shot-08).

**Step 3 — concat to the master loop.** All shots share encoder params, so stream-copy is safe:

```
(echo file 'shot-01.mp4' & echo file 'shot-02.mp4' & echo file 'shot-03.mp4' & echo file 'shot-04.mp4' & echo file 'shot-05.mp4' & echo file 'shot-06.mp4' & echo file 'shot-07.mp4' & echo file 'shot-08.mp4') > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c copy hero-loop.mp4
```
(If timestamps complain: same command with `-c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p`.)
Expected size: **3–5 MB total**. Keep `hero-loop.mp4` as the single runtime asset — one file loops flawlessly; runtime-stitching 8 requests would glitch.

**Step 4 — poster** (a frame from the mark lockup, so the fallback image *is* the end state):

```
ffmpeg -y -ss 28.0 -i hero-loop.mp4 -frames:v 1 -q:v 3 hero-poster.jpg
```
Target ≤ 90 KB. Optional WebP twin at `-quality 80`.

**Step 5 — only if shot 6's mark is garbled:** render `logo-card.png` (1600×900, dark bg `#14100c`, mark centered) from the existing SVG, then:
```
ffmpeg -y -loop 1 -t 3 -i logo-card.png -vf "fps=30,zoompan=z='min(zoom+0.0015,1.15)':d=90:s=1280x720,fade=t=in:st=0:d=0.4,fade=t=out:st=2.0:d=1.0" -an -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart shot-08-replacement.mp4
```
and swap it into list.txt.

**Step 6 — verify sizes:** `for %f in (shot-*.mp4) do @echo %f %~zf` — every shot must be ≤ 1,572,864 bytes.

**Step 7 — HTTP headers** (host/edge, not ngsw): `Cache-Control: public, max-age=31536000, immutable` on `assets/rolodex/grok/*`.

**Optional Plan-B transition style** (instead of baked fades): 0.5 s `xfade` chain — offsets on the output timeline are 3.5 / 6.5 / 9.5 / 12.0 / 15.5 / 18.5 / 21.5 s, total 26.5 s — but the 6→1 join must still be a black dip, so Plan A above is simpler and human-editable. Ship Plan A.

=====================================================================
4. EXACT IMPLEMENTATION (PASTE-READY)
=====================================================================

**Asset manifest** (`src/assets/rolodex/grok/`):
```
hero-loop.mp4    ~3–5 MB   H.264 1280x720 30fps silent  (the only runtime video)
hero-poster.jpg  ≤ 90 KB   end-lockup frame
shot-01..08.mp4  ≤1.5 MB ea  per-shot masters (archive + QC + storyboard stills; NOT shipped to the page)
```

**4a. HTML — `rolodex-app/src/app/components/about-rolodex/about-rolodex.component.html`**
Anchor: the existing hero block containing the Ox Alpha SVG. **Edit = wrap it and add one sibling. Zero text nodes, attributes of existing elements, or copy are altered.** (Line numbers unverified this session — confirm the hero region before applying.)

```html
<!-- GROK-COMPLETION: video hero — visual alternative layer. Copy elsewhere in this file is UNCHANGED. -->
<div class="grok-hero" #grokHero>
  <video #heroVideo
         class="grok-hero__video"
         [class.is-on]="videoOn()"
         poster="assets/rolodex/grok/hero-poster.jpg"
         muted loop autoplay playsinline webkit-playsinline
         disablepictureinpicture
         preload="none"
         aria-hidden="true" tabindex="-1"
         [attr.src]="videoOn() ? 'assets/rolodex/grok/hero-loop.mp4' : null"></video>

  <!-- Fallback: the existing Ox Alpha SVG (build 61) lives here EXACTLY as it does today -->
  <div class="grok-hero__fallback" [class.is-hidden]="videoOn()">
    <!-- >>> existing SVG markup, untouched <<< -->
  </div>
</div>
<!-- /GROK-COMPLETION -->
```

**4b. SCSS — `about-rolodex.component.scss`**, appended at **end of file** (append-only; nothing existing modified):

```scss
/* ===== GROK-COMPLETION: video hero (visual alternative) — append-only ===== */
.grok-hero {
  position: relative;
  width: 100%;
  max-width: 960px;
  aspect-ratio: 16 / 9;          /* reserves space: zero CLS */
  margin-inline: auto;
  border-radius: 18px;
  overflow: hidden;
  background: #14100c;           /* matches shot-08 dark lockup */
  isolation: isolate;

  &__video {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    &:not(.is-on) { display: none; }
  }

  &__fallback {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    &.is-hidden { display: none; }
  }

  &::after {                      /* vignette seats the reel in the page */
    content: ""; position: absolute; inset: 0;
    pointer-events: none;
    background: radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(10,8,6,.45) 100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .grok-hero__video { display: none !important; }
  .grok-hero__fallback.is-hidden { display: grid !important; }
}
/* ===== /GROK-COMPLETION ===== */
```

**4c. Component TS — `about-rolodex.component.ts`** (new members only; no existing logic changed):

```ts
readonly videoOn = signal(false);
@ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
@ViewChild('grokHero') grokHero?: ElementRef<HTMLElement>;
private io?: IntersectionObserver;

ngAfterViewInit(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = (navigator as any).connection ?? {};
  const canH264 = !!this.heroVideo?.nativeElement.canPlayType('video/mp4; codecs="avc1.640028"');
  if (reduce || conn.saveData || /2g/.test(conn.effectiveType ?? '') || !canH264) return; // SVG stays
  this.io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { this.heroVideo?.nativeElement.pause(); return; }
    this.videoOn.set(true);                       // sets src → fetch begins only near viewport
    this.heroVideo?.nativeElement.play().catch(() => this.videoOn.set(false)); // iOS Low Power Mode
  }, { rootMargin: '200px' });
  if (this.grokHero) this.io.observe(this.grokHero.nativeElement);
}
ngOnDestroy(): void { this.io?.disconnect(); this.heroVideo?.nativeElement.pause(); }
```
(If the About view is presented in a modal, also call `pause()` on the modal's close/hidden event.)

**4b-alt. Path B — if the mp4s fail QC (pure CSS/SVG completion of Grok's beats).** Keep the existing SVG animation and add a ~30 s cue timeline driven by a `.phase-*` class rotation on `.grok-hero` (JS setInterval or CSS `animation-delay` chain): phase 1 normal; phase 2 `filter: brightness(.92)` + `transform: scale(1.04)` slow push-in (12 s ease-in-out) = shots 5/7; phase 3 dust motes — six absolutely-positioned 3–5 px blurred cream dots, `@keyframes drift { from{transform:translate(0,0);opacity:.0} 20%{opacity:.35} to{transform:translate(14px,-60px);opacity:0} }`, 18–26 s durations, staggered delays; phase 4 dark lockup — `.grok-hero { background:#14100c }`, SVG strokes fade to cream, mark scales to 1.12 and holds 3 s, then dip to black and restart. Same fallback/reduced-motion rules as above. This is fully within my write-the-code ability (given one human pass to anchor it), and is the honest answer to deliverable §4 of your constraint list if the footage is unusable.

=====================================================================
5. INTEGRATION PLAN WITHOUT TOUCHING THE COPY
=====================================================================
1. Wrap the existing hero SVG block in `.grok-hero` and add the `<video>` sibling — **additive only** (anchor cited in §4a; exact line numbers must be confirmed by the human, since my reads returned empty this session).
2. Append the SCSS block at EOF of the `.scss` — append-only.
3. Add the TS members — new members only.
4. Copy audit after integration: run `extract_copy` on the component HTML before/after; the string sets must be **byte-identical**. That is the regression test.
5. Ship order: assets → TS → SCSS → HTML wrap. The page is valid at every step (video is inert until `videoOn()` flips).

=====================================================================
6. REDUCED-MOTION + PWA DATA-SAVER
=====================================================================
- **Reduced motion:** CSS `@media (prefers-reduced-motion: reduce)` hard-hides the video and forces the fallback visible, *and* the TS gate never sets `src` or calls `play()` — double lock, no flash of motion. The fallback under reduced motion should be the SVG's static state (pause the existing CSS animation the same way the page already does, or let it run only if the page's existing reduced-motion policy allows it).
- **Data-saver:** `navigator.connection.saveData === true` or `effectiveType` matching `2g`/`slow-2g` → video never loads; poster + SVG only. Because `src` is bound and `preload="none"`, **zero video bytes move** until the gate passes *and* the hero is within 200 px of the viewport.
- **PWA/ngsw:** do **not** put `assets/rolodex/grok/hero-loop.mp4` in an ngsw prefetch asset group — a 3–5 MB video must not download on app update. Leave it to HTTP `immutable` caching; the poster (≤90 KB) may be prefetched. If the app has its own "lite/data-saver" setting, OR it into the TS gate.

=====================================================================
7. MOBILE PERF + iOS MODAL AUTOPLAY NOTES
=====================================================================
- **iOS autoplay:** requires `muted` **and** `playsinline` (both present, plus `webkit-playsinline` for older Safari) before `play()`. **Low Power Mode rejects `play()`** → the `.catch()` flips back to the SVG fallback; the poster shows until then, so the user always sees a complete image. Never call `play()` from a non-gesture path expecting success on iOS — the IntersectionObserver path here is fine *because failure is handled*.
- **Modal:** on modal close/`ngOnDestroy`, `pause()` the video (done in §4c); optionally `currentTime = 0` so reopening starts at the sphere, not mid-wheel.
- **Perf:** one 720p muted H.264 loop is hardware-decoded on all modern phones (~1–2 %/min battery); `aspect-ratio` reserves layout → **zero CLS**; LCP is the poster image, not the video; `preload="none"` + IntersectionObserver means the reel costs nothing when the About hero is below the fold or the visit is short. Do not add a second video on the page. iOS Safari may still speculatively buffer despite `preload="none"` — acceptable at this file size; the data-saver gate is the real off-switch.

=====================================================================
8. DIVERGENCE NOTE
=====================================================================
This completion makes decisions Grok never made, and that is the divergence:
1. **Structure imposed:** Grok shipped 8 unordered clips; I imposed a 30 s loop with a fixed order, moved shot 6 to the end as the lockup, and repurposed shot 4 as a mid-reel breather.
2. **Loop join:** seamless looping is achieved by a dip-through-black (baked 1.0 s fade-out on the mark, 0.6 s fade-in on the sphere), not by matching first/last frames — Grok's clips cannot frame-match as generated.
3. **Silence by design:** Grok bailed on audio; I spec a permanently silent asset (no track at all) rather than adding music — the page stays ambient and autoplay-safe everywhere. Future option: a user-toggled 5 s ambient pad.
4. **Two visual systems:** the page now has the video reel as enhancement and the Ox Alpha SVG (build 61) as canonical fallback — the SVG is not replaced, so the brand mark lives in both; shot 6 must be QC'd against the real mark (AI lettering risk) or replaced per §3 Step 5.
5. **Dark background only inside the reel:** the page itself is unchanged; the `.grok-hero` stage is darkened so the shot-6 lockup reads.
6. **Trim points are estimates** from README captions, not from viewing the footage — the human QC gate in §2/§3 is part of the spec, not an afterthought.
7. **Line numbers:** all edits are anchored, not line-cited, because my codebase reads returned empty this session; fabricating line numbers would be worse than admitting the gap. Confirm anchors before applying.
