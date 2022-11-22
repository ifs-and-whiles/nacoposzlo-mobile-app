import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceiptsPage } from './receipts.page';
import { SharedModule } from '../shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NetworkGuard } from '../shared/utils/network.guard';
import { DeleteExpensesGuard } from './delete-expenses-guard/delete-expenses.guard';
import { ReceiptsFiltersModal } from './filters-modal/receipts-filters.modal';

@NgModule({
  imports: [
    FontAwesomeModule,
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: ReceiptsPage },
      { path: 'receipts-filters-modal', component: ReceiptsFiltersModal }
    ]),
    SharedModule
  ],
  providers: [ 
    NetworkGuard,
    DeleteExpensesGuard
  ],
  declarations: [ 
    ReceiptsPage,
    ReceiptsFiltersModal
  ],
})
export class ReceiptsPageModule {}
