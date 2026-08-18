import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HomePage } from './home.page';
import { HomePageRoutingModule } from './home-routing.module';
import { RolodexModule } from '../components/rolodex.module';
import { HelpModalComponent } from '../components/help-modal/help-modal.component';
import { PrivacySettingsModalComponent } from '../components/privacy-settings-modal/privacy-settings-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    HomePageRoutingModule,
    RolodexModule,
  ],
  declarations: [HomePage, HelpModalComponent, PrivacySettingsModalComponent],
})
export class HomePageModule {}
