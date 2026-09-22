import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';

/**
 * 2026-09-22 BUILD 299 THE SUNNY DAY (founder, the horror-boyfriend rule):
 * "our regrets when a user exits/deletes from LoopKeeper, should not be
 * followed immediately by loading them back into the app, as we currently
 * do. We should not be the horror boyfriend. Imagine for a full page sunny
 * day to follow, with an armed LoopKeeper logo at base, tapping of which
 * returns user. It has to be their act."
 *
 * So: after a user drops a loop (confirmDrop), the app goes QUIET on a
 * full-page sunny day - no tray, no list, no next thing, NO TIMER. At the
 * base sits the ARMED LoopKeeper logo (a gentle pulse says it is alive);
 * tapping it returns to the app. THE TAP IS THE USER'S ACT - the page never
 * returns on its own. Graphic is pure CSS/SVG for now (founder: 'add such a
 * page with any graphic and the Logo at base. Later we augment with image.').
 * Declared in RolodexModule (the app's components are NgModule-declared,
 * home.page.ts is standalone: false).
 */
@Component({
  selector: 'app-sunny-day',
  templateUrl: './sunny-day.component.html',
  styleUrls: ['./sunny-day.component.scss'],
})
export class SunnyDayComponent {
  /** What the user set down (the dropped loop's subject) - one acknowledging line. */
  @Input() what = '';
  /** The user's own act: tap the armed logo -> return to the app. */
  @Output() return = new EventEmitter<void>();

  constructor(private analytics: AnalyticsService) {}

  goBack(): void {
    void this.analytics.track('sunny_return');
    this.return.emit();
  }
}