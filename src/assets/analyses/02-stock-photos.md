Ox Alpha — Stock-Photo Curation Spec, About LoopKeeper era visual
(No tools this turn, as instructed. Because my earlier turns came back empty, I could not re-read about-rolodex.component.html/.scss or the containerized SVG this session — so all anchors below are structural (class/section names), never fabricated line numbers. Reconcile class names before pasting.)

---

1) CANDIDATE ERA PHOTOS (5, ranked)

C1 — "Rolodex in situ on a wooden desk" (HERO, slide 1)
- Composition: eye-level, horizontal 3:2, the open rotary card file offset to one third, desk props (pen, blotter, phone) soft in frame, warm tungsten light.
- Why it fits: this is the artifact itself — the recognition anchor for an audience that owned one. Everything else is context; this is the memory.
- Sources / search terms:
  - Wikimedia Commons: https://commons.wikimedia.org/w/index.php?search=rolodex — also "rotary file", "card index desk".
  - Smithsonian Open Access: https://americanhistory.si.edu/collections/search?query=Rolodex (NMAH holds Rolodex objects; many images CC0).
- Likely license: varies — target PD-US or CC0; AVOID CC BY-SA files if you don't want share-alike on marketing pages. HUMAN VERIFICATION REQUIRED.

C2 — "1950s secretary at her desk, typewriter + telephone" (slide 2)
- Composition: subject at desk, hands in frame, card file or papers at edge; slightly wide so Ken Burns can drift toward her hands.
- Why: the human story — the person who ran the desk. This is the emotional beat.
- Sources / search terms:
  - Library of Congress Prints & Photographs, Gottscho-Schleisner collection (1930s–50s interiors, "no known restrictions"): https://www.loc.gov/pictures/collection/gsc/ — search "office secretary", "business office interior 1950".
  - National Archives Catalog: https://catalog.archives.gov/ — "secretary typewriter 1950s".
  - Flickr Commons: https://www.flickr.com/commons — "secretary desk telephone".
- Likely license: PD / "no known restrictions" (verify the item's rights advisory). HUMAN VERIFICATION REQUIRED.

C3 — "Frame grab from a 1950s office-management film" (slide 3, optional swap)
- Composition: a still of a real office mid-action — filing, dialing, flipping cards. Slight film-frame imperfection is a feature.
- Why: motion-era authenticity; film grain marries perfectly with the grain overlay.
- Sources / search terms:
  - Prelinger Archives on Internet Archive: https://archive.org/details/prelinger — search "office etiquette 1950", "secretary training film", "office management 1955". Frame-grab with ffmpeg/vlc.
- Likely license: many Prelinger items are public domain, but it is PER ITEM — HUMAN VERIFICATION REQUIRED (check the item's rights box).

C4 — "Rotary telephone / desk-phone detail"
- Composition: close, tactile, handset and dial filling frame; pairs with the "spin" motif of the Rolodex.
- Why: the rotary dial is the single strongest tactile memory-cue of the era and rhymes visually with the card wheel.
- Sources: Flickr Commons (Smithsonian, LOC streams), National Archives — "rotary telephone desk 1950s", "telephone operator switchboard".
- Likely license: PD / no known restrictions (verify). HUMAN VERIFICATION REQUIRED.

C5 — "Wall of card-file drawers / card catalog detail" (bench alternative)
- Why: the paper-database metaphor made physical; strong geometry reads well behind text.
- Sources: Science Museum Group https://collection.sciencemuseumgroup.org.uk/search?keywords=card+index (check per-image license — often CC BY-NC-ND, which is a problem for a product page — FLAG); Flickr Commons "card catalog", "index cards office".
- Likely license: verify; prefer PD/CC0 alternatives if NC flags. HUMAN VERIFICATION REQUIRED.

Honest sourcing note: I recommend AGAINST Unsplash/Pexels/Pixabay as primary sources. Licenses are clean, but their "vintage" material is mostly modern costume recreation — exactly the "app art" problem we're solving. True 1958 Rolodex-in-use photography is scarce (the product was new then; period ads exist but are copyrighted — do not use ad imagery). Museum period advertisements are off-limits without a license.

---

2) PRIMARY HERO TREATMENT — PICK: 3-photo Ken Burns carousel, 36s cycle, 12s per slide, ~2.4s crossfades, CSS-only

Justification:
- Recognition stacking. One photo proves the era; three era cues (artifact → person → tool) rebuild the whole desk from memory. For an audience five decades removed, the second and third photo are the "and the phone, and the drawers…" nod.
- It's thematically literal. A slow crossfade between cards IS a Rolodex flip, slowed to reading pace. The treatment and the subject agree.
- Older-audience safety: 12s holds, 2.4s fades, zoom amplitude ≤ 8%, no translation beyond ~2%, grain static. Nothing flickers, nothing tracks fast. Crossfades (opacity) are gentler for the vestibular system than slides/wipes.
- Mobile: three images at ≤300KB (webp ~150–220KB) lazy-loaded sequentially; only the frame is painted eagerly; total worst case ~0.7MB on an About section, deferred.
- The reduced-motion / data-saver / error fallback IS the single-static-photo treatment (slide 1 only), and beneath everything the existing SVG remains — so every degradation step is already designed.

---

3) EXACT INTEGRATION (paste-ready)

TS: none. The carousel is pure CSS (staggered animation-delay). Error fallback uses inline onerror attributes — no component logic, no timer, no subscription.

ASSUMPTION ANCHOR: the visual block currently hosting the Ox Alpha SVG + Living Rolodex animation + Stage A storyboard imagery — referred to below as `.history-image`. If your class differs (e.g., `.about-visual`), rename consistently in both files.

HTML (replace the inner visual content of the .history-image block; keep the existing SVG markup verbatim inside the fallback wrapper):

```html
<figure class="history-image">
  <!-- ERA PHOTO LAYER (new) -->
  <div class="history-image__frame">
    <picture class="history-image__slide history-image__slide--1">
      <source type="image/webp" srcset="assets/rolodex-era/rolodex-desk-1958.webp">
      <img src="assets/rolodex-era/rolodex-desk-1958.jpg"
           alt="A vintage Rolodex rotary card file open on a 1950s wooden office desk."
           width="1600" height="1067"
           loading="lazy" decoding="async"
           onerror="this.closest('.history-image__slide').classList.add('is-broken')">
    </picture>

    <picture class="history-image__slide history-image__slide--2" aria-hidden="true">
      <source type="image/webp" srcset="assets/rolodex-era/secretary-desk-1950s.webp">
      <img src="assets/rolodex-era/secretary-desk-1950s.jpg"
           alt="" width="1600" height="1067"
           loading="lazy" decoding="async"
           onerror="this.closest('.history-image__slide').classList.add('is-broken')">
    </picture>

    <picture class="history-image__slide history-image__slide--3" aria-hidden="true">
      <source type="image/webp" srcset="assets/rolodex-era/rotary-phone-detail.webp">
      <img src="assets/rolodex-era/rotary-phone-detail.jpg"
           alt="" width="1600" height="1067"
           loading="lazy" decoding="async"
           onerror="this.closest('.history-image__slide').classList.add('is-broken')">
    </picture>

    <!-- sepia grade + grain + vignette overlays -->
    <span class="history-image__grade" aria-hidden="true"></span>
    <span class="history-image__grain" aria-hidden="true"></span>
    <span class="history-image__vignette" aria-hidden="true"></span>
  </div>

  <!-- EXISTING SVG FALLBACK LAYER (unchanged markup, new wrapper) -->
  <div class="history-image__fallback" aria-hidden="true">
    <!-- paste the existing Ox Alpha SVG + Living Rolodex markup here, untouched -->
  </div>
</figure>
```

Notes: slide 1 carries the meaningful alt; slides 2–3 are decorative (alt="" + aria-hidden) since the adjacent About copy already narrates them. The fallback stays in the DOM permanently, under the photo layer — zero-JS robustness: if images fail, are blocked, or motion/data is reduced, the SVG is simply what you see.

SCSS (append to about-rolodex.component.scss; adjust nesting to match file):

```scss
// ============ ERA PHOTO LAYER ============
.history-image {
  position: relative;
  aspect-ratio: 3 / 2;              // reserves space -> CLS 0 before load
  overflow: hidden;
  border-radius: 14px;
  background: #e9dfcc;              // sepia-paper placeholder tone
  isolation: isolate;

  @media (max-width: 480px) {
    aspect-ratio: 4 / 5;            // taller presence on phones
    border-radius: 10px;
  }
}

.history-image__frame { position: absolute; inset: 0; z-index: 2; }

.history-image__slide {
  position: absolute; inset: 0; margin: 0;

  img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    filter: sepia(.45) saturate(.82) contrast(1.06) brightness(.97);
    animation: era-kenburns 36s ease-in-out infinite alternate;
    will-change: transform;
  }

  // slide 1 is the static base layer: always visible, never fades
  &--1 { z-index: 1;
    img { transform-origin: 30% 40%; animation-delay: -4s; } }

  &--2, &--3 { z-index: 2; animation: era-fade 36s linear infinite; }

  &--2 { animation-delay: 12s;
    img { transform-origin: 70% 60%; animation-delay: -16s; } }

  &--3 { animation-delay: 24s;
    img { transform-origin: 50% 30%; animation-delay: -28s; } }

  &.is-broken { display: none; }
}

// crossfade: slides 2/3 fade in over slide 1, hold ~9.6s, fade out
@keyframes era-fade {
  0%      { opacity: 0; }
  6.67%   { opacity: 1; }    // 2.4s fade-in
  26.67%  { opacity: 1; }    // hold
  33.33%  { opacity: 0; }    // 2.4s fade-out back to slide 1
  100%    { opacity: 0; }
}

// Ken Burns: gentle, low-amplitude, per-slide origin/desync
@keyframes era-kenburns {
  from { transform: scale(1.02) translate3d(0, 0, 0); }
  to   { transform: scale(1.09) translate3d(-1.6%, 1%, 0); }
}

// sepia unifying grade
.history-image__grade {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: linear-gradient(180deg, rgba(112, 66, 20, .10), rgba(60, 36, 12, .16));
  mix-blend-mode: multiply;
}

// static film grain (no animation — vestibular-safe)
.history-image__grain {
  position: absolute; inset: -10%; z-index: 4; pointer-events: none;
  opacity: .16; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  background-size: 300px 300px;

  @media (max-width: 480px) { opacity: .12; }
}

// vignette
.history-image__vignette {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 52%, rgba(28, 18, 8, .38) 100%);
}

// fallback layer sits beneath photos; surfaces on failure / reduced data
.history-image__fallback { position: absolute; inset: 0; z-index: 1; }

// ---- reduced motion: single static photo, filters kept (not motion) ----
@media (prefers-reduced-motion: reduce) {
  .history-image__slide { animation: none !important;
    img { animation: none !important; transform: none; } }
  .history-image__slide--2,
  .history-image__slide--3 { display: none; }
}

// ---- data saver (progressive enhancement; Chromium flag-gated today) ----
@media (prefers-reduced-data: reduce) {
  .history-image__frame { display: none; }
}
```

ASSET MANIFEST — rolodex-app/src/assets/rolodex-era/

| file | role | dimensions | target size | format |
|---|---|---|---|---|
| rolodex-desk-1958.jpg | slide 1 / static fallback | 1600×1067 | ≤ 280KB (q≈70, stripped) | jpg |
| rolodex-desk-1958.webp | slide 1 webp | 1600×1067 | ≤ 180KB (q≈72) | webp |
| secretary-desk-1950s.jpg/.webp | slide 2 | 1600×1067 | ≤ 280KB / ≤ 180KB | jpg+webp |
| rotary-phone-detail.jpg/.webp | slide 3 | 1600×1067 | ≤ 280KB / ≤ 180KB | jpg+webp |

Serving hints: `cwebp -q 72 -resize 1600 0 in.jpg -o out.webp`; `magick in.jpg -strip -interlace Plane -quality 70 out.jpg`. Confirm `src/assets` is in angular.json assets glob (Angular default). Use paths relative to base (`assets/rolodex-era/...`) as above.

---

4) COPY-SAFE
No visible copy changes. The photo layer touches only markup/scss inside the .history-image visual block; alt text is attribute-level, not rendered copy; figcaption omitted. The About paragraphs, headings, and Stage A storyboard text remain byte-identical. The SVG survives verbatim inside `.history-image__fallback` as the reduced-motion / data-saver / error state.

5) HONESTY / LICENSE VERIFICATION
I cannot browse or verify any image's existence or license in this session. Every candidate above is a search recipe, not a confirmed asset. ALL FIVE REQUIRE HUMAN LICENSE VERIFICATION before shipping. Priority order of trust: (a) LOC "no known restrictions" / National Archives PD, (b) Smithsonian Open Access CC0, (c) Prelinger per-item PD, (d) Wikimedia per-file license (avoid BY-SA), (e) museum collections (watch NC/ND clauses — a commercial product About page likely fails NC). Record source URL + license screenshot per asset in the repo alongside the images (e.g., assets/rolodex-era/CREDITS.md — note: adding a credits file is a write, for you, not me; if attribution is required by a chosen license, surface it in a credits line only after you approve the copy change).

6) ACCESSIBILITY + PERF
- Alt strategy: exactly one meaningful alt (slide 1, describing what the photo shows in era terms); slides 2–3 decorative (`alt=""` + `aria-hidden="true"` on the picture wrapper) — the About copy is their screen-reader narrative. The SVG fallback layer is aria-hidden (it was presumably already decorative).
- CLS: zero — fixed `aspect-ratio` on the container plus width/height attributes on every img; images are absolutely positioned with object-fit: cover, so they can never reflow the page.
- Loading: `loading="lazy"` + `decoding="async"` on all three; the block sits mid-page so nothing eager is warranted. Slides 2–3 are one file each, fetched only when the section scrolls near the viewport.
- Data-saver: `prefers-reduced-data` hides the photo frame entirely, leaving the SVG (progressive enhancement — Safari/Firefox ignore it today; harmless).
- Reduced motion: all animation removed; slide 1 remains as a treated static photo (sepia/grain/vignette are filters and gradients, not motion, and are kept); slides 2–3 display:none; SVG remains beneath as the ultimate fallback if slide 1 also errors.
- Error path: inline `onerror` marks a broken slide `.is-broken` (display:none). If slide 1 fails, the SVG fallback shows with zero JavaScript in the bundle.

7) DIVERGENCE NOTE
- I chose the 3-photo carousel over the single-photo treatment — the user's brief said the current visual "is not vivid enough," and a lone treated photo risks the same verdict. The carousel's fallback state IS the single-photo treatment, so we get both.
- I recommend against free-stock (Unsplash/Pexels/Pixabay) as primary sources despite clean licenses — era authenticity is the whole point, and modern recreations read as costume. This narrows the field to archives where every item needs human verification; that's the honest cost.
- Grain is static, not animated flicker — vestibular safety for the core audience.
- No TS file at all; error handling is inline attributes, not component logic.
- The SVG is demoted to a permanently-present under-layer rather than a conditional swap — simpler, no JS, and it doubles as the photo placeholder.
- Anchors are structural only (`.history-image` et al.); I did not re-read the component files this session, so verify class names and that `assets/` is wired in angular.json before pasting.
