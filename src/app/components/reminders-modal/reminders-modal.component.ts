import { Component, Input } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';

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
 * The header "Add" button is the doorway to ENTER a new reminder: pick the
 * contact, write the note, choose the date — it lands on the card immediately.
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
    this.buildRows();
  }

  private buildRows(): void {
    this.reminders = [];
    this.followUps = [];
    this.birthdays = [];
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

  /** The doorway to SET a reminder — contact, note, date. */
  async addReminder(): Promise<void> {
    const contactOptions = (this.contacts || []).map((c: any) => ({
      type: 'radio' as const,
      label: c?.name?.display || 'Contact',
      value: c?.contactId || '',
      checked: false,
    }));
    if (!contactOptions.length) {
      const a = await this.alertCtrl.create({
        header: 'No contacts yet',
        message: 'Add contacts first, then set reminders for them.',
        buttons: ['OK'],
      });
      await a.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Set a reminder',
      inputs: [
        ...contactOptions,
        { name: 'note', type: 'text', placeholder: 'Remind me to…' },
        { name: 'date', type: 'date', value: new Date().toISOString().slice(0, 10) },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Set reminder',
          handler: (data: any) => {
            const contact = (this.contacts || []).find((c: any) => String(c?.contactId) === String(data?.contactId));
            const note = String(data?.note || '').trim();
            if (!contact) {
              void this.alertCtrl.create({ header: 'Choose a contact', message: 'Pick who this reminder is for.', buttons: ['OK'] }).then((a) => a.present());
              return false;
            }
            if (!note) {
              void this.alertCtrl.create({ header: 'Write the note', message: 'What should the reminder say?', buttons: ['OK'] }).then((a) => a.present());
              return false;
            }
            const when = data?.date ? new Date(String(data.date) + 'T09:00:00') : new Date();
            contact.reminders = [...(contact.reminders || []), { note, date: when }];
            contact.updatedAt = new Date();
            this.buildRows();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  close(): void {
    void this.modalController.dismiss(null, 'close');
  }

  constructor(
    private readonly modalController: ModalController,
    private readonly alertCtrl: AlertController,
  ) {}
}
