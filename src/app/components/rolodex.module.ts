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

@NgModule({
  declarations: [
    RolodexComponent,
    ContactCardComponent,
    ImageViewerComponent,
    TooltipDirective,
    CardChatModalComponent,
    PodsModalComponent,
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
