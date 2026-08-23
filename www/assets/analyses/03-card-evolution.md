All context gathered — anchors confirmed: the About block lives in `rolodex-app/src/app/components/about-rolodex/about-rolodex.component.html` (section `<h3>The original Rolodex — 1958</h3>` wrapping `.rolodex-history` → `.history-image.rk-cinema` + `.history-copy`), the era-photo layer + fallback rules sit at the end of `about-rolodex.component.scss` ("ERA PHOTO LAYER" block, incl. `@media (prefers-reduced-motion: reduce)` and `@media (prefers-reduced-data: reduce)`), three licensed assets already exist in `src/assets/rolodex-era/` with a `CREDITS.md`, and the design tokens live in `src/theme/variables.scss`. Here is the full ambit.

---

## 1. DESIGN — the 5-era timeline visual

**Concept:** "The relay of remembering." A numbered rail of five stations; each station = thumbnail + year chip + name + one-liner. Station 5 (LoopKeeper/AI) is the lit terminal node. Pure HTML/CSS, zero JS.

- **Desktop ≥720px:** CSS grid `repeat(5, 1fr)`, horizontal connector line drawn by `li::before` (center-to-center, hidden on last child), dot centered above each thumb.
- **Mobile <720px:** vertical stack with a left rail (same `::before`, rotated geometry via positioning), thumb beside text in a flex row.
- **Current era:** hard-coded `aria-current="step"` + `.is-now` class — coral-filled dot with soft halo, apricot "TODAY" chip, coral hairline ring on the thumb. Static by design (CSS-only mandate → no scroll-spy, no auto-advance).
- **Placement:** sibling block **after** the closing `</div>` of `.rolodex-history`, still inside the "The original Rolodex — 1958" section — the existing `.history-image` carousel is untouched.
- **Eras 2 & 3 reuse the *exact same URLs*** as the hero carousel (`assets/rolodex-era/rolodex-rotary.*`, `rolodex-cards-box.*`) → browser cache hits, zero added download.
- **Era 5 uses an inline SVG** (brand palette from `D:\TODOs\rolodex-svg-animation\README.md`: ink `#241E19`, coral `#FF5A36`, teal `#1E9E8E`) — zero bytes, zero licensing, and it *is* the thesis ("the card writes back").
- Every thumb has an **inline SVG glyph underneath the photo** (error fallback + data-saver fallback), mirroring the existing "SVG remains under everything" architecture.

---

## 2. IMAGE SEARCH SPEC (human executes; I cannot browse)

### Era 1 — Paper card file / index trays → `index-card-trays.*`
| Source | Search terms | Notes |
|---|---|---|
| **Library of Congress** (loc.gov/photos) | `"card index"` `index card file office`, `card catalog tray`, Harris & Ewing collection (office interiors 1910s–40s), FSA/OWI office scenes | Most results "Public domain / no known restrictions" — safest tier. Record the LCCN. |
| **Smithsonian Open Access** (si.edu/openaccess) | `index card file`, `card catalog drawer` | Many 3D scans/photo sets released **CC0**. |
| **Wikimedia Commons** | categories *Card catalogs*, *Kartothek*, *Card index files*; filter license = PD / CC0 / CC BY (skip anything BY-SA) | Check each file page individually. |
| **Internet Archive** | library-supply and office-furniture trade catalogs: `card index cabinet`, `visible index` | Scans of pre-1929 catalogs are PD. |
| **Prelinger** (archive.org/details/prelinger) | `office filing`, `records management`, `how to keep office records`, secretarial-training films c. 1948–55 → grab a frame with ffmpeg (below) | Films are generally PD (corporate-sponsored); frame grabs inherit that — still spot-check the item page. |

### Era 4 — PDA / pocket organizers → `pda-pocket-organizer.*`
| Source | Search terms | Notes |
|---|---|---|
| **Wikimedia Commons** | `PalmPilot` (e.g., Palm III/V product shots), `BlackBerry` (Curve/Bold desk shots), `Apple Newton`, `Psion Series 5`; category *Personal digital assistants* | Licenses vary wildly (PD, CC BY, GFDL, BY-SA). **Filter to CC0/PD/CC BY only — exclude CC BY-SA per your constraint.** Flickr-imported CC BY 2.0 files (like your existing cards-box) are a reliable vein. |

### Era 5 — no photo (in-house SVG). Alternate if you want a raster: `rolodex-app/src/assets/icon-512.png` (your own asset, zero risk).

**⚠️ Human license verification required:** every Era-1 and Era-4 candidate — open the actual item/file page, confirm the badge, log source + author + license into `CREDITS.md` (template below). LOC "no known restrictions" and Smithsonian CC0 need only a link logged; CC BY needs attribution text. **I cannot verify any of this remotely — treat my suggestions as search recipes, not confirmed items.**

---

## 3. ASSET MANIFEST → `rolodex-app/src/assets/rolodex-era/`

| File | Era | Budget | Source | License | Status |
|---|---|---|---|---|---|
| `index-card-trays.jpg` / `.webp` | 1 | ≤300 KB jpg; webp ~30–60 KB; export ~640×480 | see §2 Era 1 | PD / CC0 preferred; CC BY w/ credit acceptable | 🔶 **human verify** |
| `rolodex-rotary.jpg` / `.webp` | 2 | existing (640×502) | Wikimedia `Rolodex.agr.jpg` (ArnoldReinhold) | CC BY 2.5 — credited in CREDITS.md | ✅ verified 2026-08-23 |
| `rolodex-cards-box.jpg` / `.webp` | 3 | existing | Flickr Bill Bradford via Commons | CC BY 2.0 — credited | ✅ verified |
| `pda-pocket-organizer.jpg` / `.webp` | 4 | ≤300 KB; ~640×480 | see §2 Era 4 | CC0 / PD / CC BY only | 🔶 **human verify** |
| *(none)* | 5 | 0 KB — inline SVG in component | authored in-house | n/a | ✅ |

**ffmpeg pipeline (frame grab → normalized pair)** — path per your note (`D:\Tools\ffmpeg`; adjust subpath to wherever `ffmpeg.exe` actually resolves — I cannot run it):

```bat
:: 1) grab a frame from a Prelinger film
D:\Tools\ffmpeg\bin\ffmpeg.exe -ss 00:04:10 -i office-film.mp4 -frames:v 1 era1-raw.png

:: 2) center-crop to 4:3, downscale to 640w, jpg q4 (lands ~80–200KB)
D:\Tools\ffmpeg\bin\ffmpeg.exe -i era1-raw.png -vf "crop=ih*4/3:ih,scale=640:-2" -q:v 4 index-card-trays.jpg

:: 3) webp twin
D:\Tools\ffmpeg\bin\ffmpeg.exe -i index-card-trays.jpg -c:v libwebp -quality 78 index-card-trays.webp
```

Sepia unify (matches the hero's `sepia(.45) saturate(.82)` CSS grade — apply in CSS, not baked, so the grade stays consistent with eras 2–3).

**Append to `CREDITS.md`:**
```markdown
| index-card-trays.jpg/.webp | <SOURCE URL> | <LICENSE> | <AUTHOR> via <ARCHIVE> |
| pda-pocket-organizer.jpg/.webp | <SOURCE URL> | <LICENSE> | <AUTHOR> via <ARCHIVE> |
```

---

## 4. PASTE-READY HTML

**(a) Two new beats — replace the entire `.history-copy` div** (both existing refined paragraphs are byte-identical; only additions):

```html
<div class="history-copy">
  <!-- 2026-08-XX BEAT A: the secretary stakes (user-approved, rhythm-refined) -->
  <p>
    Young'uns today may not know how crucial it was that a treasured secretary
    kept the records — connections, relationships, dates, appointments — for
    the best executives. Nothing forgotten, everything moving smoothly, always.
  </p>
  <p>
    Before software, the remembering lived on a desk. The <strong>Rolodex</strong> —
    Arnold Neustadter's rolling index, patented 1956 and on desks everywhere
    by 1958 — sat beside the telephone of every capable secretary. One card
    per person: a name, a number, a penciled note — <em>prefers mornings</em>,
    <em>ask about the daughter</em>. Flip the wheel, find the face, make the
    call. The card carried the details so the person at the desk could carry
    the relationship.
  </p>
  <!-- 2026-08-XX BEAT B: pocket folders spread (user-approved, rhythm-refined) -->
  <p>
    What came next were plastic pocket folders with card slots — the Rolodex
    name survived across countless iterations. At first they lived on the
    secretary's desk, the quiet center of the executive suite. Then they
    became smaller and handier, and every businessperson kept one or several
    of their own — or synced theirs with an assistant's.
  </p>
  <p>
    LoopKeeper is that idea, still working: one card per person, holding
    their story. What's new is that the card answers back — after every
    send, the Assistant writes what happened onto it, so the next nudge
    arrives already knowing. A Rolodex that writes back. You supply the
    caring; the card does the remembering.
  </p>
</div>
```

**(b) The timeline — insert directly after the closing `</div>` of `.rolodex-history`** (still inside the same `about-section`):

```html
<!-- 2026-08-XX THE FIVE ERAS: from the desk to the loop. CSS-only stepper,
     horizontal >=720px / vertical rail below. Photos fail soft to inline
     SVG glyphs (also shown under prefers-reduced-data). -->
<div class="era-timeline-block">
  <h4 class="era-timeline-title">From the desk to the loop — five eras of keeping track</h4>

  <ol class="era-timeline" role="list">

    <li class="era-step era-step--1">
      <span class="era-dot" aria-hidden="true"></span>
      <div class="era-row">
        <div class="era-thumb">
          <svg class="era-glyph" viewBox="0 0 96 72" aria-hidden="true">
            <rect x="14" y="18" width="68" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M22 30h52M22 40h52M22 50h38" stroke="currentColor" stroke-width="2" opacity=".45"/>
            <rect x="24" y="12" width="12" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
          </svg>
          <picture>
            <source type="image/webp" srcset="assets/rolodex-era/index-card-trays.webp">
            <img src="assets/rolodex-era/index-card-trays.jpg"
                 alt="Wooden index-card trays holding rows of handwritten record cards — the pre-Rolodex office desk."
                 width="640" height="480" loading="lazy" decoding="async"
                 onerror="this.closest('.era-thumb').classList.add('is-broken')">
          </picture>
        </div>
        <div class="era-meta">
          <span class="era-year">Before 1958</span>
          <span class="era-name">Paper card trays</span>
          <p class="era-line">Every desk kept its own little archive.</p>
        </div>
      </div>
    </li>

    <li class="era-step era-step--2">
      <span class="era-dot" aria-hidden="true"></span>
      <div class="era-row">
        <div class="era-thumb">
          <svg class="era-glyph" viewBox="0 0 96 72" aria-hidden="true">
            <circle cx="48" cy="36" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
            <g fill="currentColor" opacity=".7">
              <rect x="44" y="10" width="8" height="10" rx="1.5"/>
              <rect x="44" y="52" width="8" height="10" rx="1.5"/>
              <rect x="18" y="32" width="10" height="8" rx="1.5"/>
              <rect x="68" y="32" width="10" height="8" rx="1.5"/>
            </g>
          </svg>
          <picture>
            <source type="image/webp" srcset="assets/rolodex-era/rolodex-rotary.webp">
            <img src="assets/rolodex-era/rolodex-rotary.jpg"
                 alt="A classic rotary Rolodex card wheel with alphabet tabs on a wooden desk."
                 width="640" height="502" loading="lazy" decoding="async"
                 onerror="this.closest('.era-thumb').classList.add('is-broken')">
          </picture>
        </div>
        <div class="era-meta">
          <span class="era-year">1958</span>
          <span class="era-name">The rotary wheel</span>
          <p class="era-line">Flip, find, call — one card per person.</p>
        </div>
      </div>
    </li>

    <li class="era-step era-step--3">
      <span class="era-dot" aria-hidden="true"></span>
      <div class="era-row">
        <div class="era-thumb">
          <svg class="era-glyph" viewBox="0 0 96 72" aria-hidden="true">
            <rect x="16" y="14" width="64" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="24" y="22" width="48" height="8" rx="1.5" fill="currentColor" opacity=".55"/>
            <rect x="24" y="34" width="48" height="8" rx="1.5" fill="currentColor" opacity=".35"/>
            <rect x="24" y="46" width="48" height="6" rx="1.5" fill="currentColor" opacity=".2"/>
          </svg>
          <picture>
            <source type="image/webp" srcset="assets/rolodex-era/rolodex-cards-box.webp">
            <img src="assets/rolodex-era/rolodex-cards-box.jpg"
                 alt="A box of Rolodex cards standing in their plastic pockets, alphabet tabs visible."
                 width="640" height="502" loading="lazy" decoding="async"
                 onerror="this.closest('.era-thumb').classList.add('is-broken')">
          </picture>
        </div>
        <div class="era-meta">
          <span class="era-year">1960s–'80s</span>
          <span class="era-name">Pocket folders</span>
          <p class="era-line">The name survived; the wheel left her desk.</p>
        </div>
      </div>
    </li>

    <li class="era-step era-step--4">
      <span class="era-dot" aria-hidden="true"></span>
      <div class="era-row">
        <div class="era-thumb">
          <svg class="era-glyph" viewBox="0 0 96 72" aria-hidden="true">
            <rect x="32" y="8" width="32" height="56" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="37" y="16" width="22" height="30" rx="2" fill="currentColor" opacity=".3"/>
            <path d="M40 24h16M40 31h16M40 38h10" stroke="#fff" stroke-width="1.6"/>
            <circle cx="48" cy="56" r="3" fill="currentColor" opacity=".7"/>
          </svg>
          <picture>
            <source type="image/webp" srcset="assets/rolodex-era/pda-pocket-organizer.webp">
            <img src="assets/rolodex-era/pda-pocket-organizer.jpg"
                 alt="An early personal digital assistant with a stylus showing a contacts list."
                 width="640" height="480" loading="lazy" decoding="async"
                 onerror="this.closest('.era-thumb').classList.add('is-broken')">
          </picture>
        </div>
        <div class="era-meta">
          <span class="era-year">1996–2010s</span>
          <span class="era-name">Goes electronic</span>
          <p class="era-line">The Rolodex shrinks into a pocket organizer.</p>
        </div>
      </div>
    </li>

    <li class="era-step era-step--5 is-now" aria-current="step">
      <span class="era-dot" aria-hidden="true"></span>
      <div class="era-row">
        <div class="era-thumb era-thumb--now">
          <!-- Era 5: in-house SVG — the card that writes back. No photo, no license, no bytes. -->
          <svg viewBox="0 0 96 72" role="img"
               aria-label="A LoopKeeper contact card with a coral tab and a teal loop-closed check — today's card writes back.">
            <rect x="18" y="12" width="60" height="44" rx="6" fill="#FFFFFF" stroke="#241E19" stroke-width="2"/>
            <rect x="42" y="6" width="14" height="8" rx="2" fill="#FF5A36"/>
            <path d="M28 28 q5 -6 10 0 t10 0" fill="none" stroke="#241E19" stroke-width="2" stroke-linecap="round"/>
            <path d="M28 38h30M28 46h22" stroke="#241E19" stroke-width="2" opacity=".3"/>
            <circle cx="66" cy="46" r="8" fill="none" stroke="#1E9E8E" stroke-width="2.5"/>
            <path d="M62.5 46l2.5 2.8l4.5 -5.5" fill="none" stroke="#1E9E8E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="era-meta">
          <span class="era-chip">Today</span>
          <span class="era-name">AI Assistant + LoopKeeper</span>
          <p class="era-line">The card writes back — the AI is the new secretary.</p>
        </div>
      </div>
    </li>

  </ol>

  <!-- the arc, closed -->
  <p class="era-close">
    The wheel became the loop. The card writes back.
    <strong>LoopKeeper is that secretary, digitized.</strong>
  </p>
</div>
```

---

## 5. Reduced motion / data-saver / error fallbacks (append to `about-rolodex.component.scss`)

```scss
/* ============================================================
   2026-08-XX THE FIVE ERAS — evolution timeline (CSS-only stepper)
   Horizontal grid >=720px, vertical rail below. Zero JS, zero
   keyframes: the timeline is fully static, so reduced-motion needs
   nothing disabled here. Inline SVG glyphs sit UNDER every photo
   (same "SVG remains under everything" contract as the hero).
   ============================================================ */
.era-timeline-block { margin-top: 14px; }

.era-timeline-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--rolodex-text-secondary); /* tertiary failed AA at this size */
  margin: 0 0 10px;
}

.era-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.era-step { position: relative; padding-left: 24px; }

/* vertical rail */
.era-step::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 16px;
  bottom: -14px;
  width: 2px;
  background: var(--rolodex-border-light);
}
.era-step:last-child::before { display: none; }

.era-dot {
  position: absolute;
  left: 0;
  top: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--rolodex-surface);
  border: 2px solid var(--rolodex-border);
  z-index: 1;
}

/* the terminal era — Today */
.era-step--5 .era-dot {
  background: var(--rolodex-primary);
  border-color: var(--rolodex-primary-dark);
  box-shadow: 0 0 0 4px rgba(var(--rolodex-primary-rgb), 0.16);
}

.era-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* fixed box = zero CLS regardless of load order */
.era-thumb {
  position: relative;
  flex: 0 0 84px;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--rolodex-border-light);
  background: var(--rolodex-surface-alt);

  img,
  svg[role="img"] {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: sepia(.45) saturate(.82) contrast(1.06); /* same grade as hero */
  }
}

/* glyph underlay: visible on error / data-saver / before load */
.era-glyph {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--rolodex-text-tertiary);
  background: var(--rolodex-surface-alt);
}

.era-thumb.is-broken img { display: none; }
.era-thumb--now {
  border-color: var(--rolodex-primary);
  box-shadow: 0 0 0 1px rgba(var(--rolodex-primary-rgb), 0.25);
}

.era-meta { min-width: 0; }

.era-year {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rolodex-text-secondary);
}

.era-chip {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #241E19;              /* story-brand ink */
  background: #FFB25C;         /* story-brand apricot — ~8.6:1 with ink */
  border-radius: 999px;
  padding: 2px 8px;
}

.era-name {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rolodex-text);  /* ~15.9:1 on surface */
  margin-top: 2px;
}

.era-line {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--rolodex-text-secondary); /* ~4.9:1 — AA */
  margin: 2px 0 0;
}

.era-close {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--rolodex-text-secondary);
  border-top: 1px dashed var(--rolodex-border-light);
  margin: 14px 0 0;
  padding-top: 10px;

  strong { color: var(--rolodex-text); }
}

/* ── horizontal stepper ── */
@media (min-width: 720px) {
  .era-timeline {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    column-gap: 12px;
    row-gap: 0;
  }

  .era-step { padding-left: 0; }

  /* connector: center-to-center, removed on the last station */
  .era-step::before {
    left: 50%;
    right: auto;
    top: 7px;
    bottom: auto;
    width: 100%;
    height: 2px;
  }

  .era-dot {
    left: 50%;
    transform: translateX(-50%);
    top: 0;
  }

  .era-row { flex-direction: column; gap: 8px; }
  .era-thumb { flex-basis: auto; width: 100%; }
}

/* ── data saver: drop the photos, glyphs tell the story ── */
@media (prefers-reduced-data: reduce) {
  .era-thumb picture { display: none; }
}

/* ── defensive: nothing animates here, but pin it anyway ── */
@media (prefers-reduced-motion: reduce) {
  .era-timeline-block * { animation: none !important; transition: none !important; }
}
```

---

## 6. Accessibility

- **Semantics:** `<ol role="list">` (role re-added because `list-style: none` strips list semantics in some VoiceOver versions); each era an `<li>`; era 5 carries `aria-current="step"`.
- **Alt text:** unique, descriptive alt per photo (see HTML). Era 5's SVG uses `role="img"` + full `aria-label`. Underlay glyphs are `aria-hidden="true"` — purely decorative. Known trade-off: if a photo 404s, SR users lose that image but keep the era name + caption text, which carry the same information.
- **Contrast (computed against `--rolodex-surface` #FFFFFF / dark-mode equivalents):** era name `#1E2328` ≈ 15.9:1 ✓; captions/year `#70757A` ≈ 4.9:1 ✓ (AA normal text); TODAY chip ink `#241E19` on apricot `#FFB25C` ≈ 8.6:1 ✓; coral `#FF5A36` appears **only decoratively** (dot fill, halo, thumb ring) — meaning is never carried by coral alone. All colors come from tokens, so `body.dark` adapts automatically; the chip/apricot pair passes in both modes.
- **Touch targets:** no interactive elements (static stepper) → no target-size concerns.
- **Heading level:** `h4` under the section's `h3` — valid nesting.

---

## 7. Mobile perf + CLS notes

- **Zero CLS:** every thumb reserves its box via `flex: 0 0 84px` + `aspect-ratio: 4/3` + explicit `width/height` attrs — layout is final before any byte arrives. No fonts loaded, no JS-inserted nodes, no skeleton swap. Expected CLS contribution: **0.00**.
- **Payload:** eras 2–3 reuse URLs already downloaded by the hero carousel above → **cache hits, 0 extra bytes**. New cost = eras 1 + 4 only: ~30–60 KB webp each (jpg fallback ~80–200 KB on legacy browsers). Era 5 ≈ 0.6 KB inline. Typical added total: **~60–130 KB**, well under one hero-slide.
- **Decoding:** all four photos `loading="lazy" decoding="async"` — they sit below the fold behind the animated hero.
- **Breakpoint strategy:** horizontal only ≥720px (five columns need the room); 561–719px intentionally keeps the vertical rail while `.rolodex-history` goes side-by-side — no cramped 5-up squeeze, no horizontal scrolling, no JS resize handlers.
- **Data-saver path** replaces photos with ~0.5 KB glyphs instead of blanking — the story survives offline/limited-data contexts.

---

## 8. Divergence note

1. **Copy edits to the approved beats (only two, both flagged):** Beat A — "kept the records of connections, relationships, dates and appointments" → em-dash list "kept the records — connections, relationships, dates, appointments —", and split the final clause into its own sentence ("Nothing forgotten, everything moving smoothly, always.") to avoid a triple-dash pileup; "Young'uns," "treasured secretary," "best executives" kept verbatim. Beat B — inserted "smaller and" before "handier" (supplies the causal logic for why folders spread beyond the secretary's desk); "an aide's" → "an assistant's" for consistency with the rest of the About page's vocabulary. Everything else is word-for-word yours.
2. **Beat placement:** Beat A opens `.history-copy` (before the existing 1958 paragraph), Beat B sits between it and the existing LoopKeeper paragraph — strict chronology; both refined paragraphs untouched.
3. **Era 5 = inline SVG, not a photograph.** Rationale: zero licensing exposure on the most brand-critical frame, zero payload, and a literal depiction of "the card writes back." Alternate: `src/assets/icon-512.png`.
4. **Era 3 reuses `rolodex-cards-box`** rather than sourcing a dedicated "plastic pocket folder" shot — visually adjacent (cards standing in pockets), zero weight. A dedicated folder photo is an optional future swap using the same slot.
5. **Static current-era highlight** (hard-coded class + attribute), honoring the CSS-only constraint — no scroll-spy, no auto-cycling.
6. **Timeline horizontal breakpoint is 720px**, deliberately wider than `.rolodex-history`'s 560px, per §7.
7. **Year labels use `--rolodex-text-secondary`, not tertiary** — tertiary measured ≈ 2.8:1, an AA failure I caught during the audit.
8. **Zero animations added to the timeline** (contrast with the hero's Ken Burns carousel) — reduced-motion users get the identical static experience everyone does.

**Honest limits of automation:** I cannot browse, so §2 is a recipe list — every Era-1/Era-4 license must be confirmed by a human on the item page before ship; the ffmpeg commands are untested (verify the actual `ffmpeg.exe` path under `D:\Tools\ffmpeg` and libwebp availability with `-codecs | findstr webp`); the cross-source sepia harmony (LOC scan vs. Commons product shot) can only be judged by eye once assets exist; contrast figures were hand-computed — worth one pass through a checker if you want belt-and-braces.
