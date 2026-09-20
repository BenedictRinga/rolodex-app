import { Component, EventEmitter, Output } from '@angular/core';
import { AnalyticsService } from '../../services/analytics/analytics.service';

/**
 * 2026-09-19 BUILD 275 THE FIRST MINUTE (founder: "revisit our Welcome with a
 * view to absolutely showing exactly what a first-time user does" + the two
 * design questions: "How will you know it is a first-timer, and what is the
 * transition to the regular view so we do not regress current setup?").
 *
 * THE DETECTION — STORAGE IS THE TRUTH (the 266/267 ruling): the surface is
 * offered ONLY when the device holds ZERO real cards AND ZERO open loops AND
 * has never seen/skipped/done the surface (lk_firstminute_seen / done in
 * IndexedDB). Any real deed or any prior visit flips the flags, so the
 * surface can never nag and can never greet a returning user.
 *
 * THE TRANSITION — THE REGULAR VIEW TAKES OVER AT THE FIRST DEED:
 * - Capture path: the sentence rides the SAME inbox chain (home calls
 *   inboxRef.addCapture — keeper, celebrate, deck expansion, persistence,
 *   analytics all unchanged), the flag flips to done, the per-device demo
 *   deck retires (rolodex_demo_enabled=false — their content now leads),
 *   and home renders exactly as the current setup renders, armed with THEIR
 *   loop on slide 1.
 * - Skip path: the flag flips to seen and home renders EXACTLY as today
 *   (walk with the demo deck, the six-slide Welcome still offered once on
 *   open #2, Settings replay intact). Nothing about the current setup moves.
 * - Current users (any real card, any loop) NEVER see this surface.
 *
 * THE BEAT ("show me first"): one quiet screen — you type it / the words are
 * written for you / you send from the app you already use / the loop closes —
 * the exact first-minute path, then straight back to the capture box.
 */
@Component({
  selector: 'app-first-minute',
  templateUrl: './first-minute.component.html',
  styleUrls: ['./first-minute.component.scss'],
  standalone: false,
})
export class FirstMinuteComponent {
  /** The user's sentence — home routes it through inboxRef.addCapture. */
  @Output() captured = new EventEmitter<string>();
  /** "Skip for now" — home records lk_firstminute_seen and shows today's home. */
  @Output() skipped = new EventEmitter<void>();
  /** BUILD 276: the LoopKeeper Chat door — the Assistant, from the first
   *  minute. Home opens the situation-mode chat over the veil. */
  @Output() chat = new EventEmitter<void>();

  text = '';
  showMe = false;

  constructor(private readonly analytics: AnalyticsService) {}

  onInput(ev: CustomEvent): void {
    this.text = String((ev?.detail as any)?.value ?? '').slice(0, 240);
  }

  capture(): void {
    const sentence = this.text.trim();
    if (!sentence) return;
    void this.analytics.track('firstminute_captured');
    this.captured.emit(sentence);
  }

  openShowMe(): void {
    this.showMe = true;
    void this.analytics.track('firstminute_showme');
  }

  closeShowMe(): void {
    this.showMe = false;
  }

  /** BUILD 276: the Chat door — talking IS capturing; the Assistant's
   *  situation-mode chat does the same deed in conversation. */
  openChat(): void {
    void this.analytics.track('firstminute_chat');
    this.chat.emit();
  }

  skip(): void {
    void this.analytics.track('firstminute_skipped');
    this.skipped.emit();
  }
}
