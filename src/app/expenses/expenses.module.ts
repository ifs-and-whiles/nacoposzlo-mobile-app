import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpensesPage } from './expenses.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SharedModule } from '../shared/shared.module';
import { ExpensesFiltersModal } from './filters-modal/expenses-filters.modal';

@NgModule({
  imports: [
    FontAwesomeModule,
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: ExpensesPage },
      { path: 'expenses-filters-modal', component: ExpensesFiltersModal },
    ]),
    SharedModule
  ],
  declarations: [
    ExpensesPage, 
    ExpensesFiltersModal
  ],
})
export class ExpensesPageModule {}
