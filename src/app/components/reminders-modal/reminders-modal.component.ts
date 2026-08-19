import { Component, Input } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';

interface ReminderRow {
  note: string;
  contact: string;
  date: Date;
  /** 2026-08-19 true when the row came from a demo/mock contact. */
  demo: boolean;
}

type ReminderSegment = { type: 'row'; row: ReminderRow } | { type: 'sep' };

/**
 * 2026-08-16 REMINDERS SECTION: every reminder across contacts + upcoming
 * follow-ups + birthdays in one place. The inline set-form at the top is the
 * doorway to ENTER a reminder: pick the contact, write the note, choose the
 * date, tap Set — it lands on the card and in the list immediately.
 * (The earlier Ionic alert mixed radio + text inputs in one dialog — Ionic
 * radio alerts don't render non-radio inputs, so that form was dead. The
 * inline form avoids the alert entirely.)
 */
@Component({
  selector: 'app-reminders-modal',
  templateUrl: './reminders-modal.component.html',
  styleUrls: ['./reminders-modal.component.scss'],
  standalone: false,
})
export class RemindersModalComponent {
  @Input() contacts: any[] = [];

  reminders: ReminderRow[] = [];
  followUps: ReminderRow[] = [];
  birthdays: ReminderRow[] = [];

  // 2026-08-16 THE SET-FORM state (always visible in the modal).
  formContactId = '';
  formNote = '';
  formDate: string = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    this.buildRows();
  }

  private buildRows(): void {
    this.reminders = [];
    this.followUps = [];
    this.birthdays = [];
    for (const c of this.contacts || []) {
      const name = c?.name?.display || 'Contact';
      const demo = !!(c as any)?.isMockData;
      for (const r of c?.reminders || []) {
        this.reminders.push({ note: r?.note || 'Reminder', contact: name, date: new Date(r?.date || Date.now()), demo });
      }
      if (c?.rolodex?.followUp && c?.nextInteraction) {
        this.followUps.push({ note: c.rolodex.followUp, contact: name, date: new Date(c.nextInteraction), demo });
      }
      if (c?.birthday?.day && c?.birthday?.month) {
        this.birthdays.push({ note: '', contact: name, date: new Date(2000, c.birthday.month - 1, c.birthday.day), demo });
      }
    }
    this.reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.followUps.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /** 2026-08-19 DEMO REMINDERS MARKER: real rows first, then a clear
   *  "DEMO REMINDERS" line, then demo rows — always, even without real rows. */
  private segments(rows: ReminderRow[]): ReminderSegment[] {
    const real = rows.filter((r) => !r.demo);
    const demo = rows.filter((r) => r.demo);
    const out: ReminderSegment[] = real.map((row) => ({ type: 'row' as const, row }));
    if (demo.length) {
      out.push({ type: 'sep' as const });
      out.push(...demo.map((row) => ({ type: 'row' as const, row })));
    }
    return out;
  }

  reminderSegments(): ReminderSegment[] { return this.segments(this.reminders); }
  followUpSegments(): ReminderSegment[] { return this.segments(this.followUps); }
  birthdaySegments(): ReminderSegment[] { return this.segments(this.birthdays); }

  /** Submit the inline form — contact, note, date -> lands on the card. */
  submitReminder(): void {
    const contact = (this.contacts || []).find((c: any) => String(c?.contactId) === String(this.formContactId));
    const note = String(this.formNote || '').trim();
    if (!contact) {
      void this.alertCtrl.create({ header: 'Choose a contact', message: 'Pick who this reminder is for.', buttons: ['OK'] }).then((a) => a.present());
      return;
    }
    if (!note) {
      void this.alertCtrl.create({ header: 'Write the note', message: 'What should the reminder say?', buttons: ['OK'] }).then((a) => a.present());
      return;
    }
    const when = this.formDate ? new Date(this.formDate + 'T09:00:00') : new Date();
    contact.reminders = [...(contact.reminders || []), { note, date: when }];
    contact.updatedAt = new Date();
    this.buildRows();
    this.formContactId = '';
    this.formNote = '';
    this.formDate = new Date().toISOString().slice(0, 10);
    void this.alertCtrl
      .create({ header: 'Reminder set', message: `"${note}" for ${contact?.name?.display || 'this contact'}.`, buttons: ['OK'] })
      .then((a) => a.present());
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
  ) {}
}
