import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

interface ReminderRow {
  note: string;
  contact: string;
  date: Date;
}

/**
 * 2026-08-16 REMINDERS SECTION: every reminder across contacts + upcoming
 * follow-ups + birthdays in one place — the "button to open that section" the
 * app was missing. Card-level alarms feed the reminders; follow-ups come from
 * rolodex.nextInteraction; birthdays from the contact birthday fields.
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

  ngOnInit() {
    for (const c of this.contacts || []) {
      const name = c?.name?.display || 'Contact';
      for (const r of c?.reminders || []) {
        this.reminders.push({ note: r?.note || 'Reminder', contact: name, date: new Date(r?.date || Date.now()) });
      }
      if (c?.rolodex?.followUp && c?.nextInteraction) {
        this.followUps.push({ note: c.rolodex.followUp, contact: name, date: new Date(c.nextInteraction) });
      }
      if (c?.birthday?.day && c?.birthday?.month) {
        this.birthdays.push({ note: '', contact: name, date: new Date(2000, c.birthday.month - 1, c.birthday.day) });
      }
    }
    this.reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.followUps.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  constructor(private readonly modalController: ModalController) {}
}
