import { Component, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LooptionaryService, LooptEntry } from '../../services/looptionary/looptionary.service';
import { StudioPlaybackService } from '../../services/studio-playback/studio-playback.service';
import { SoundService } from '../../services/sound/sound.service';
import { AnalyticsService } from '../../services/analytics/analytics.service';

/**
 * 2026-09-25 BUILD 338 THE LOOP-TIONARY (founder: "Google has... a word or
 * sentence lookup that was beautiful. Why don't we start with a module for
 * words/sentences lookup - it is an immediate buy-in for tapping AI
 * services"): a full modal — the search bar up top, the answer as a card
 * (term, pos, meaning, detail, example, etymology), a speaker that SAYS the
 * term (device-first, the Welcome modal's own voice path), and the device's
 * lookup history below the search the moment it opens (60 entries, IndexedDB).
 *
 * VOICE (founder: "Add voice playback without re-inventing — we already have
 * the tools if you look at our parked Welcome modal/slides"): the same
 * StudioPlaybackService.speakDeviceFirst() the Welcome slides ride.
 *
 * SOUNDS (founder: "Add sounds to the main, and also tester chats"): the
 * lookup rides the proven chat ticks — the send tick at query, the receive
 * tick when the answer lands.
 */
@Component({
  selector: 'app-looptionary-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TranslateModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title style="font-size: 15px;">{{ 'loopkeeper.lt.title' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close.emit()"><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="ion-no-border" style="padding: 0 12px 8px;">
        <ion-searchbar [ngModel]="q" (ngModelChange)="q = $event" (keyup.enter)="lookupNow()"
          [placeholder]="'loopkeeper.lt.placeholder' | translate" show-clear-button="focus" class="lt-search">
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>
    <ion-content class="lt-body">
      <div *ngIf="busy" class="lt-busy">{{ 'loopkeeper.lt.busy' | translate }}</div>
      <div *ngIf="error" class="lt-error">{{ error }}</div>

      <!-- THE ANSWER CARD: term, pos, meaning, detail, example, etymology,
           inUserLang, the speak button. Minimal noise by construction. -->
      <div class="lt-card" *ngIf="entry">
        <div class="lt-head">
          <div>
            <h2 class="lt-term">{{ entry.term }}</h2>
            <div class="lt-pos" *ngIf="entry.pos">{{ entry.pos }}</div>
          </div>
          <button class="lt-speak" type="button" (click)="speak()" [class.lt-speaking]="speaking"
            [attr.aria-label]="'loopkeeper.lt.listen' | translate">
            <ion-icon [name]="speaking ? 'pause-outline' : 'volume-medium-outline'"></ion-icon>
          </button>
        </div>
        <p class="lt-meaning">{{ entry.meaning }}</p>
        <p class="lt-detail" *ngIf="entry.detail">{{ entry.detail }}</p>
        <div class="lt-row" *ngIf="entry.example">
          <span class="lt-label">{{ 'loopkeeper.lt.example' | translate }}</span>
          <p class="lt-example">{{ entry.example }}</p>
        </div>
        <div class="lt-row" *ngIf="entry.etymology">
          <span class="lt-label">{{ 'loopkeeper.lt.etymology' | translate }}</span>
          <p class="lt-etym">{{ entry.etymology }}</p>
        </div>
        <div class="lt-row" *ngIf="entry.inUserLang">
          <span class="lt-label">{{ 'loopkeeper.lt.inyourlang' | translate }}</span>
          <p class="lt-inlang">{{ entry.inUserLang }}</p>
        </div>
        <div class="lt-cached" *ngIf="entry.cached">{{ 'loopkeeper.lt.fromCache' | translate }}</div>
      </div>

      <!-- THE DEVICE CACHE: every past lookup, newest first — the opening view. -->
      <div class="lt-history" *ngIf="!entry && history.length">
        <div class="lt-histhead">
          <span>{{ 'loopkeeper.lt.recent' | translate }}</span>
          <button class="lt-clear" type="button" (click)="clearAll()">{{ 'loopkeeper.lt.clear' | translate }}</button>
        </div>
        <button class="lt-histrow" type="button" *ngFor="let h of history" (click)="openCached(h)">
          <span class="lt-hterm">{{ h.term }}</span>
          <span class="lt-hwhen">{{ when(h.lookedUpAt) }}</span>
        </button>
      </div>

      <div class="lt-empty" *ngIf="!entry && !history.length && !busy">
        {{ 'loopkeeper.lt.empty' | translate }}
      </div>
    </ion-content>
  `,
  styles: [`
    .lt-search { --background: rgba(180, 83, 9, .07); --border-radius: 12px; --color: #4a3210; }
    .lt-busy, .lt-error { margin: 18px; text-align: center; font-size: 12.5px; color: #8c5e14; opacity: .8; }
    .lt-error { color: #b45309; }
    .lt-card { margin: 14px; padding: 16px 16px 12px; border-radius: 14px; background: #fffdf7;
      box-shadow: 0 1px 8px rgba(74, 50, 16, .10); border: 1px solid rgba(180, 83, 9, .12); }
    .lt-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .lt-term { margin: 0; font-size: 20px; font-weight: 600; color: #4a3210; letter-spacing: .01em; }
    .lt-pos { margin-top: 2px; font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: #8c5e14; opacity: .7; }
    .lt-speak { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(180, 83, 9, .25);
      background: rgba(180, 83, 9, .08); color: #8c5e14; font-size: 19px; display: flex;
      align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
    .lt-speak.lt-speaking { background: rgba(20, 184, 166, .14); color: #0f9488; border-color: rgba(20, 184, 166, .4); }
    .lt-meaning { margin: 12px 0 0; font-size: 14.5px; line-height: 1.55; color: #4a3210; }
    .lt-detail { margin: 8px 0 0; font-size: 13px; line-height: 1.55; color: #6b5330; opacity: .85; }
    .lt-row { margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(180, 83, 9, .18); }
    .lt-label { display: block; font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: #8c5e14; opacity: .6; }
    .lt-example, .lt-etym, .lt-inlang { margin: 3px 0 0; font-size: 13.5px; line-height: 1.5; color: #4a3210; }
    .lt-example { font-style: italic; }
    .lt-cached { margin-top: 10px; font-size: 10.5px; color: #8c5e14; opacity: .5; text-align: right; }
    .lt-histhead { display: flex; align-items: center; justify-content: space-between;
      margin: 14px 16px 4px; font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: #8c5e14; opacity: .75; }
    .lt-clear { background: none; border: none; color: #b45309; font-size: 11.5px; cursor: pointer; padding: 2px 4px; }
    .lt-histrow { width: calc(100% - 28px); margin: 0 14px; padding: 10px 12px; display: flex;
      align-items: center; justify-content: space-between; gap: 10px; background: none; border: none;
      border-bottom: 1px solid rgba(180, 83, 9, .10); color: #4a3210; font-size: 14px; cursor: pointer;
      text-align: left; font-family: inherit; }
    .lt-histrow .lt-hwhen { font-size: 11px; color: #8c5e14; opacity: .55; flex-shrink: 0; }
    .lt-empty { margin: 40px 22px; text-align: center; font-size: 13px; line-height: 1.6; color: #6b5330; opacity: .7; }
  `],
})
export class LooptionaryModalComponent {
  @Output() close = new EventEmitter<void>();
  q = '';
  busy = false;
  error = '';
  speaking = false;
  entry: (LooptEntry & { cached?: boolean }) | null = null;
  history: Array<LooptEntry & { lookedUpAt: number; q: string; _k?: string }> = [];

  constructor(
    private readonly loopt: LooptionaryService,
    private readonly playback: StudioPlaybackService,
    private readonly sound: SoundService,
    private readonly analytics: AnalyticsService,
    private readonly translate: TranslateService,
  ) {
    void this.refreshHistory();
  }

  async lookupNow(): Promise<void> {
    const q = this.q.trim();
    if (!q || this.busy) return;
    this.busy = true;
    this.error = '';
    void this.sound.playChatSend();
    try {
      const { entry, cached } = await this.loopt.lookup(q, this.translate.currentLang || 'en-US');
      this.entry = { ...entry, cached };
      void this.sound.playChatReceive();
      if (entry.notFound) this.error = this.translate.instant('loopkeeper.lt.notFound');
      void this.analytics.track('looptionary_lookup', { cached, len: q.length });
      void this.refreshHistory();
    } catch (e: any) {
      if (e?.message !== 'empty') this.error = this.translate.instant('loopkeeper.lt.error');
    } finally {
      this.busy = false;
    }
  }

  async openCached(h: LooptEntry & { q?: string }): Promise<void> {
    this.q = h.q || h.term;
    const { entry, cached } = await this.loopt.lookup(this.q, this.translate.currentLang || 'en-US');
    this.entry = { ...entry, cached };
  }

  /** THE VOICE: the Welcome modal's own path — device-first speech of the
   *  term + meaning (the example would double the length; the term and its
   *  meaning are what the ear wants). */
  async speak(): Promise<void> {
    if (!this.entry || this.speaking) return;
    const text = this.entry.notFound
      ? (this.q || this.entry.term)
      : `${this.entry.term}. ${this.entry.meaning}`;
    this.speaking = true;
    try {
      await this.playback.speakDeviceFirst(text, this.translate.currentLang || 'en-US');
    } catch { /* voice refused - the card stays readable */ }
    this.speaking = false;
  }

  async clearAll(): Promise<void> {
    await this.loopt.clearHistory();
    this.history = [];
  }

  async refreshHistory(): Promise<void> {
    this.history = await this.loopt.history();
  }

  when(ts: number): string {
    const d = new Date(ts);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return this.translate.instant('loopkeeper.tc.yesterday');
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
}
