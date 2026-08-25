import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
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
import { WelcomeModalComponent } from './welcome-modal/welcome-modal.component';
import { InviteLandingComponent } from './invite-landing/invite-landing.component';
import { ConfidanteComposerModalComponent } from './confidante-composer-modal/confidante-composer-modal.component';
import { VideoCallModalComponent } from './video-call-modal/video-call-modal.component';
import { LinkPreviewComponent } from './link-preview/link-preview.component';
import { ChatWithRolodexModalComponent } from './chat-with-rolodex/chat-with-rolodex.component';
import { SearchModalComponent } from './search-modal/search-modal.component';
import { HelpModalComponent } from './help-modal/help-modal.component';
import { ShareAppModalComponent } from './share-app-modal/share-app-modal.component';
import { LoopInboxComponent } from './loop-inbox/loop-inbox.component';
import { TranslatePortalComponent } from './translate-portal/translate-portal.component';
import { TranslationReviewComponent } from './translation-review/translation-review.component';

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
    WelcomeModalComponent,
    InviteLandingComponent,
    ConfidanteComposerModalComponent,
    VideoCallModalComponent,
    LinkPreviewComponent,
    ChatWithRolodexModalComponent,
    SearchModalComponent,
    HelpModalComponent,
    ShareAppModalComponent,
    LoopInboxComponent,
    TranslatePortalComponent,
    TranslationReviewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
  ],
  exports: [
    RolodexComponent,
    ContactCardComponent,
    ImageViewerComponent,
    TooltipDirective,
    CardChatModalComponent,
    PodsModalComponent,
    LoopInboxComponent,
  ],
})
export class RolodexModule {}
