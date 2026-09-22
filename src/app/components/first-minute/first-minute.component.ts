import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { AnalyticsService } from '../../services/analytics/analytics.service';

/**
 * 2026-09-20 BUILD 278 THE FIRST MINUTE, IN THE FLOW (founder: "The first
 * time UX must be same as that for return UX. Mostly same, everything
 * surrounding, except for content of Loops Alpha" + the four sections:
 * 1. the title line above; 2. two of our regular cards, reduced, side by
 * side; 3. the courtesy line; 4. "Show me first").
 *
 * 2026-09-22 BUILD 294 THE AVOIDANCE COVER (founder ruling: "Avoidance
 * lead, as cover, but maintain styling theme"; the strategic brief
 * D:/TODOs/USE_NOW.txt move 1: "First session is one human avoidance, and
 * nothing else"): the two COVER cards are the named avoidances now —
 * "The reply I owe" (rides the PERSON chain: the add-sheet pick, and the
 * loop is born owed-reply with its friction named BY THE USER) and
 * "The decision I keep not making" (rides the 183 pure self-loop, straight
 * to the words). TASK / PERSON and the demo follow BELOW — same cards,
 * same theme, one fold down. Nothing new is invented; both doors plug
 * into the EXISTING flows.
 *
 * The panel renders INSIDE the walk's slide 1 (send-walk) for an untouched
 * device — the veil is gone; the ambience is byte-for-byte the regular one.
 * The panel vanishes the moment the deed lands (home flips firstMinute on
 * contactsDirty) and the walk is the regular one from then on.
 *
 * "SHOW ME FIRST" is the graphic: the four beats of the normal flow, drawn
 * as the flow's own surfaces (capture box → card draft → send → closed),
 * with the demo words TICKING into the editing spaces (the Zyppar
 * RolodexPage pattern), looping until dismissed.
 */
@Component({
  selector: 'app-first-minute',
  templateUrl: './first-minute.component.html',
  styleUrls: ['./first-minute.component.scss'],
  standalone: false,
})
export class FirstMinuteComponent implements OnDestroy {
  /** TASK door — the existing create-task draft flow, via the walk. */
  @Output() task = new EventEmitter<void>();
  /** PERSON door — the existing device-contacts pick flow, via the walk. */
  @Output() person = new EventEmitter<void>();
  /** BUILD 294 THE AVOIDANCE DOORS — the cover. 'owed-reply' rides the
   *  PERSON chain (the add-sheet pick; the walk births the loop as
   *  owed-reply, friction named by the user); 'decide' rides the 183 pure
   *  self-loop, straight to the words. */
  @Output() avoid = new EventEmitter<'owed-reply' | 'decide'>();
  /** BUILD 279: the demo view opened/closed — home hides the lower sections
   *  so the Inbox takes the full screen while the animation plays. */
  @Output() demoView = new EventEmitter<boolean>();

  showMe = false;
  /** 2026-09-22 BUILD 301 THE OBVIOUS DOOR: the legacy TASK / PERSON doors
   *  hide behind the "Or start with" button until the user asks for them. */
  legacyOpen = false;

  toggleLegacy(): void {
    this.legacyOpen = !this.legacyOpen;
    void this.analytics.track('fm_legacy', { open: this.legacyOpen ? 1 : 0 });
    // 2026-09-22 BUILD 303 (founder): the reveal also SCROLLS DOWN, bringing
    // TASK || PERSON & co. fully into the viewport. A short delay lets the
    // *ngIf render first; the scroll is gentle (nearest) — a UI courtesy,
    // never a state driver.
    if (this.legacyOpen) {
      setTimeout(() => this.legacyBlock?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    }
  }
  /** The demo beat currently animating (0..3). */
  demoBeat = 0;
  /** The characters typed so far into the active beat's editing space. */
  demoTyped = '';
  /** BUILD 284: words that FINISHED — each completed stage holds its own. */
  demoDone: string[] = ['', '', '', ''];

  private demoTimer: any = null;
  /** BUILD 279: the demo strip — scrolled into view when Show me first opens. */
  @ViewChild('demoEl') demoEl?: ElementRef<HTMLDivElement>;
  /** 2026-09-22 BUILD 303: the revealed "Or start with" section — scrolled
   *  into view after it opens, so TASK || PERSON & co. land fully visible
   *  (the founder's scroll-down ask). */
  @ViewChild('legacyBlock') legacyBlock?: ElementRef<HTMLDivElement>;
  // 2026-09-20 BUILD 284 THE BENEFIT SHOW (founder: the old beats "say, You
  // type it, and, the words are written for you — Hilarious. Nothing gained.
  // That is no demo of benefit"): the four beats now show what the ALGO and
  // the AI ASSISTANT do for the user — the one line, the remember-back, the
  // drafted words, the closed loop.
  private readonly demoWords = [
    'Reply to Amina about Saturday',
    "Tue 9:00 — Amina's reply is due",
    'Hi Amina — are we still on for Saturday, 3 pm?',
    'Sent · Closed — mind free',
  ];

  constructor(private readonly analytics: AnalyticsService) {}

  toggleShowMe(): void {
    this.showMe = !this.showMe;
    this.demoView.emit(this.showMe);
    if (this.showMe) {
      void this.analytics.track('firstminute_showme');
      this.startDemo();
      // BUILD 279: scroll the animation into view — the demo lives below the
      // doors; without the scroll the user misses it (founder's rule).
      setTimeout(() => {
        try { this.demoEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch { /* best effort */ }
      }, 120);
    } else {
      this.stopDemo();
    }
  }

  /** BUILD 294 THE AVOIDANCE COVER: the tap on either cover card — the one
   *  real avoidance is named, measured, and handed to the walk's EXISTING
   *  chains (the 278 rule: nothing new is invented). */
  avoidDoor(kind: 'owed-reply' | 'decide'): void {
    void this.analytics.track('firstminute_avoid', { kind });
    this.avoid.emit(kind);
  }

  /** The ticker: types the demo words into each beat's editing space, holds,
   *  advances — the normal flow, sounding and flowing, on a loop. */
  private startDemo(): void {
    this.stopDemo();
    this.demoBeat = 0;
    this.demoTyped = '';
    this.demoDone = ['', '', '', ''];
    let char = 0;
    this.demoTimer = setInterval(() => {
      const words = this.demoWords[this.demoBeat];
      if (char < words.length) {
        char += 1;
        this.demoTyped = words.slice(0, char);
        return;
      }
      // Hold the completed beat, then flow to the next one. The finished
      // words PERSIST in their own stage (284) — each surface keeps what it
      // produced, exactly like the real flow leaves its artefacts behind.
      setTimeout(() => {
        if (!this.showMe) return;
        this.demoDone[this.demoBeat] = this.demoWords[this.demoBeat];
        this.demoBeat = (this.demoBeat + 1) % this.demoWords.length;
        if (this.demoBeat === 0) this.demoDone = ['', '', '', ''];
        char = 0;
        this.demoTyped = '';
      }, 1300);
    }, 42);
  }

  private stopDemo(): void {
    if (this.demoTimer) { clearInterval(this.demoTimer); this.demoTimer = null; }
  }

  ngOnDestroy(): void {
    this.stopDemo();
  }
}
