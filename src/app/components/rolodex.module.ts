import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RolodexComponent } from './rolodex/rolodex.component';
import { ContactCardComponent } from './contact-card/contact-card.component';
import { ImageViewerComponent } from './image-viewer/image-viewer.component';
import { TooltipDirective } from '../directives/tooltip/tooltip.directive';
import { CardChatModalComponent } from './card-chat-modal/card-chat-modal.component';
import { PodsModalComponent } from './pods-modal/pods-modal.component';
import { RemindersModalComponent } from './reminders-modal/reminders-modal.component';
import { AboutRolodexComponent } from './about-rolodex/about-rolodex.component';
import { BillingModalComponent } from './billing-modal/billing-modal.component';
import { AiSettingsModalComponent } from './ai-settings-modal/ai-settings-modal.component';
import { ContactSurfaceModalComponent } from './contact-surface-modal/contact-surface-modal.component';

@NgModule({
  declarations: [
    RolodexComponent,
    ContactCardComponent,
    ImageViewerComponent,
    TooltipDirective,
    CardChatModalComponent,
    PodsModalComponent,
    RemindersModalComponent,
    AboutRolodexComponent,
    BillingModalComponent,
    AiSettingsModalComponent,
    ContactSurfaceModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  exports: [
    RolodexComponent,
    ContactCardComponent,
    ImageViewerComponent,
    TooltipDirective,
    CardChatModalComponent,
    PodsModalComponent,
  ],
})
export class RolodexModule {}
