import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { AnalyticsService } from '../../services/analytics/analytics.service';

/**
 * 2026-09-20 BUILD 278 THE FIRST MINUTE, IN THE FLOW (founder: "The first
 * time UX must be same as that for return UX. Mostly same, everything
 * surrounding, except for content of Loops Alpha" + the four sections:
 * 1. the title line above; 2. two of our regular cards, reduced, side by
 * side — TASK and PERSON; 3. the courtesy line; 4. "Show me first").
 *
 * The panel renders INSIDE the walk's slide 1 (send-walk) for an untouched
 * device — the veil is gone; the ambience is byte-for-byte the regular one.
 * Both doors plug into the EXISTING flows and nothing new is invented:
 * - TASK  → the walk's taskCardRequest chain (the 257 create-task draft).
 * - PERSON → the walk's whoRequest chain (the device-contacts pick).
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

  showMe = false;
  /** The demo beat currently animating (0..3). */
  demoBeat = 0;
  /** The characters typed so far into the active beat's editing space. */
  demoTyped = '';

  private demoTimer: any = null;
  private readonly demoWords = [
    'Reply to Amina about Saturday',
    'Hi Amina — are we still on for Saturday, 3 pm?',
    'Sent via WhatsApp',
    'Closed — mind free',
  ];

  constructor(private readonly analytics: AnalyticsService) {}

  toggleShowMe(): void {
    this.showMe = !this.showMe;
    if (this.showMe) {
      void this.analytics.track('firstminute_showme');
      this.startDemo();
    } else {
      this.stopDemo();
    }
  }

  /** The ticker: types the demo words into each beat's editing space, holds,
   *  advances — the normal flow, sounding and flowing, on a loop. */
  private startDemo(): void {
    this.stopDemo();
    this.demoBeat = 0;
    this.demoTyped = '';
    let char = 0;
    this.demoTimer = setInterval(() => {
      const words = this.demoWords[this.demoBeat];
      if (char < words.length) {
        char += 1;
        this.demoTyped = words.slice(0, char);
        return;
      }
      // Hold the completed beat, then flow to the next one.
      setTimeout(() => {
        if (!this.showMe) return;
        this.demoBeat = (this.demoBeat + 1) % this.demoWords.length;
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
