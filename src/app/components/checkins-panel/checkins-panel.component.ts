import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { InAppNotification, InAppNotificationService } from '../../services/in-app-notification/in-app-notification.service';
import { EventService } from '../../services/event/event.service';

/**
 * 2026-09-16 BUILD 237 THE CHECK-INS PANEL — the escalator list, on demand.
 * The founder's design: the dock's list of check-in nudges ("Check in with
 * [name/task] (Recurrence #N)") should be presentable AT WILL from Settings —
 * to test the tap, or to use the list without waiting for its scheduled
 * appearance. Two groups:
 *   - ESCALATED NOW: the live dock items (fired, undismissed). Tapping runs
 *     the IDENTICAL code path as the dock tap — tap() fires tapped$ and home
 *     routes (checkin -> the walk armed with the item as payload). Dismissing
 *     here dismisses in the dock: ONE source of truth.
 *   - COMING UP: the scheduled check-ins from the follow-up engine — persons
 *     AND tasks, each with its rhythm. Tapping escalates NOW (hand-back to
 *     home through the modal's 'escalate' role, which runs escalateCheckIn —
 *     the same chain the dock item runs).
 * NO CONFLATION: the 9AM morning digest is a different item with a different
 * home (the Loops surface); this panel is only the check-in escalator.
 */
@Component({
  selector: 'app-checkins-panel',
  templateUrl: './checkins-panel.component.html',
  styleUrls: ['./checkins-panel.component.scss'],
  standalone: false,
})
export class CheckinsPanelComponent implements OnInit, OnDestroy {
  live: InAppNotification[] = [];
  upcoming: {
    id: string; title: string; startLabel: string;
    contactId?: string; overdue: boolean;
  }[] = [];
  private subs: Subscription[] = [];

  constructor(
    private readonly inApp: InAppNotificationService,
    private readonly events: EventService,
    private readonly modalCtrl: ModalController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // ONE source of truth: the dock and this panel read the same pile, so a
    // dismissal in either place updates both.
    this.subs.push(this.inApp.notifications$.subscribe((list) => {
      this.live = (list || []).filter((n) => !!n?.data?.action);
      this.cdr.detectChanges();
    }));
    void this.loadUpcoming();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private async loadUpcoming(): Promise<void> {
    try {
      const events = (await this.events.getEvents()) || [];
      const now = Date.now();
      const DAY = 86400000;
      this.upcoming = (events || [])
        .filter((e) => String(e?.title || '').startsWith('Check in with'))
        .map((e) => ({ ev: e, t: new Date(e.start).getTime() }))
        .filter((x) => x.t > now - 2 * DAY) // upcoming + recently due
        .sort((a, b) => a.t - b.t)
        .slice(0, 25)
        .map((x) => ({
          id: x.ev.id,
          title: x.ev.title,
          startLabel: new Date(x.t).toLocaleString(undefined, {
            weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
          }),
          contactId: x.ev.contactId,
          overdue: x.t <= now,
        }));
      this.cdr.detectChanges();
    } catch { /* the panel still shows the live pile */ }
  }

  /** The IDENTICAL escalation path as the dock: tap() fires tapped$ (home
   *  routes: checkin -> the walk armed with the item as the payload) and
   *  dismisses the item — the dock updates from the same pile.
   *  2026-09-17 BUILD 243 (founder: "I am clicking on listed items of
   *  'Check-ins' from inside Settings => Check-ins ... Now it does not escape
   *  from Settings to arrive in Loops"): the tap now ALSO closes this panel.
   *  The escalation itself always ran — home leaves Settings and opens the walk
   *  BEHIND the modal — but this panel is a full-height sheet, so it stayed on
   *  top and the destination was invisible: the tap read as "nothing happened,
   *  still in Settings". The COMING UP rows already dismiss themselves (role
   *  'escalate'); this removes the asymmetry. Dismissing with NO role is
   *  deliberate: home's onWillDismiss only escalates on role 'escalate', and
   *  the live row's escalation already fired through tapped$ — exactly ONE
   *  escalation per tap, never two. */
  tapLive(n: InAppNotification): void {
    this.inApp.tap(n);
    void this.modalCtrl.dismiss();
  }

  dismissLive(n: InAppNotification): void {
    this.inApp.dismiss(n.id);
  }

  /** A scheduled check-in, escalated NOW: hand it to home through the
   *  modal's dismiss role — home runs the same escalateCheckIn chain. */
  async escalateUpcoming(item: { title: string; contactId?: string }): Promise<void> {
    const name = String(item?.title || '').replace(/^Check in with\s*/, '');
    await this.modalCtrl.dismiss({ contactId: item?.contactId, name }, 'escalate');
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }
}
