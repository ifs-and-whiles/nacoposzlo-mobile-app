import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';
import { SharedModule } from '../shared/shared.module';
import { TrackWidthDirective } from './track-width/track-width.directive';
import { ForceWidthDirective } from './track-width/force-width.directive';
import { ForceLeftByHalfOfWidthDirective } from './track-width/left-by-half-of-width.directive';
import { NetworkGuard } from '../shared/utils/network.guard';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabsPageRoutingModule,
    SharedModule
  ],
  providers: [ NetworkGuard ],
  declarations: [TabsPage, TrackWidthDirective, ForceWidthDirective, ForceLeftByHalfOfWidthDirective]
})
export class TabsPageModule {}
