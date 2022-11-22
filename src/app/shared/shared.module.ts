import { NgModule } from '@angular/core';
import { MoneyPipe } from '../shared/pipes/money.pipe';
import { TimestampPipe } from './pipes/timestamp.pipe';
import { MonthSelectorComponent } from './components/month-selector/month-selector.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateSquareComponent } from './components/date-square/date-square.component';
import { TruncatePipe } from './pipes/truncate.pipe';
import { TipLabelComponent } from './components/tip-label/tip-label.component';
import { SelectionCounterToolbarComponent } from './components/selection-counter-toolbar/selection-counter-toolbar.component';
import { ActionToolbarComponent } from './components/action-toolbar/action-toolbar.component';
import { SingleExpenseModal } from './components/single-expense-modal/single-expense.modal';
import { RouterModule } from '@angular/router';
import { ExpenseDetailsComponent } from './components/expense-details/expense-details.component';
import { BulkExpenseModal } from './components/bulk-expense-modal/bulk-expense.modal';
import { ExpenseListComponent } from './components/expense-list/expense-list.component';
import { TagsModal } from './components/tags-modal/tags.modal';
import { BoldPrefixPipe } from './pipes/bold-prefix.pipe';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { EmptyScreenComponent } from './components/empty-screen/empty-screen.component';
import { NoCategoryTagComponent } from './components/no-category-tag/no-category-tag.component';
import { DebounceChangeDirective } from './directives/debounce-change.directive';
import { SelectableItemComponent } from './components/selectable-item/selectable-item.component';
import { ReceiptDetailsModal } from './components/receipt-details-modal/receipt-details.modal';
import { NumericalValidator } from './directives/numerical.validator';
import { TimesPipe } from './pipes/times.pipe';
import { ReceiptModal } from './components/receipt-modal/receipt.modal';
import { TagsSelectorComponent } from './components/tags-selector/tags-selector.component';
import { TagComponent } from './components/tag/tag.component';
import { ReceiptFiltersModal } from './components/receipt-filters-modal/receipt-filters.modal';
import { YearMonthComponent } from './components/year-month/year-month.component';
import { NetworkIconComponent } from './components/network-icon/network-icon.component';
import { NetworkGuard } from './utils/network.guard';
import { DiscardChangesGuard } from './utils/discard-changes.guard';
import { ChangeExpensesDateGuard } from './components/receipt-details-modal/change-expenses-date-guard/change-expenses-date.guard';
import { SlidingDirective } from './directives/sliding.directive';
import { TagListComponent } from './components/tag-list/tag-list.component';
import { TagListReadOnlyComponent } from './components/tag-list-read-only/tag-list-read-only.component';
import { ColorPaletteComponent } from './components/color-palette/color-palette.component';
import { MoneyValidator } from './directives/money.validator';
import { SingleExpenseItemComponent } from './components/expense-list/single-expense-item/single-expense-item.component';
import { MonthPipe } from './pipes/month.pipe';
import { HideKeyboardOnEnterDirective } from './directives/hide-keyboard-on-enter.directive';
import { HideHeaderDirective } from './directives/hide-header.directive';
import { GesturesDirective } from './directives/gestures.directive';
import { SuggestionTagComponent } from './components/suggestion-tag/suggestion-tag.component';
import { AddTagComponent } from './components/add-tag/add-tag.component';
import { AddTagModal } from './components/add-tag-modal/add-tag.modal';
import { CopyExpenseModal } from './components/copy-expense-modal/copy-expense.modal';
import { ManageTagsModal } from './components/manage-tags-modal/manage-tags.modal';
import { EditTagModal } from './components/edit-tag-modal/edit-tag.modal';
import { ReceiptPhotoModal } from './components/receipt-photo-modal/receipt-photo.modal';
import { NameSuggestionsComponent } from './components/name-suggestions/name-suggestions.component';
import { SingleExpenseMoneyInputComponent } from './components/expense-list/single-expense-money-input/single-expense-money-input.component';
import { MoneyInputComponent } from './components/money-input/money-input.component';

@NgModule({
	imports: [
		FontAwesomeModule,
		IonicModule,
		CommonModule,
		FormsModule,	
		RouterModule.forChild([
			{path: 'single-expense-modal', component: SingleExpenseModal},
			{path: 'copy-expense-modal', component: CopyExpenseModal},
			{path: 'bulk-expense-modal', component: BulkExpenseModal},
			{path: 'tags-modal', component: TagsModal},
			{path: 'receipt-details-modal', component: ReceiptDetailsModal},
			{path: 'receipt-modal', component: ReceiptModal},
			{path: 'receipt-filters-modal', component: ReceiptFiltersModal},
			{path: 'receipt-photo-modal', component: ReceiptPhotoModal},
			{path: 'add-tag-modal', component: AddTagModal},        
            {path: 'manage-tags-modal', component: ManageTagsModal},
            {path: 'edit-tag-modal', component: EditTagModal}
        ])
	],
	providers: [ 
		NetworkGuard,
		DiscardChangesGuard,
		ChangeExpensesDateGuard
	],
	declarations: [
		MoneyPipe,
		TimestampPipe,
		BoldPrefixPipe,
		MonthSelectorComponent,
		DateSquareComponent,
		TruncatePipe,
		TipLabelComponent,
		SelectionCounterToolbarComponent,
		ActionToolbarComponent,
        SingleExpenseModal,
        CopyExpenseModal,
		ExpenseDetailsComponent,
		BulkExpenseModal,
		ExpenseListComponent,
		SingleExpenseItemComponent,
		TagsModal,
		EmptyScreenComponent,
		NoCategoryTagComponent,
		DebounceChangeDirective,
		SelectableItemComponent,
        NameSuggestionsComponent,
		ReceiptDetailsModal,
		NumericalValidator,
		MoneyValidator,
		TimesPipe,
		MonthPipe,
		ReceiptModal,
		TagsSelectorComponent,
		TagComponent,
        SuggestionTagComponent,
        AddTagComponent,
        TagListComponent,
        ReceiptFiltersModal,
        ReceiptPhotoModal,
        AddTagModal,
		YearMonthComponent,
		NetworkIconComponent,
		SlidingDirective,
		HideKeyboardOnEnterDirective,
		TagListReadOnlyComponent,
        ColorPaletteComponent,
        HideHeaderDirective,
        GesturesDirective,
        SingleExpenseMoneyInputComponent,
        ManageTagsModal,
        EditTagModal,
        MoneyInputComponent
	],
	exports: [
		MoneyPipe,
		TimestampPipe,
		BoldPrefixPipe,
		MonthSelectorComponent,
		DateSquareComponent,
		TruncatePipe,
		TipLabelComponent,
		SelectionCounterToolbarComponent,
		ActionToolbarComponent,
        SingleExpenseModal,
        CopyExpenseModal,
		ExpenseDetailsComponent,
		BulkExpenseModal,
		ExpenseListComponent,
		SingleExpenseItemComponent,
		TagsModal,
		EmptyScreenComponent,
		NoCategoryTagComponent,
		DebounceChangeDirective,
		SelectableItemComponent,
        NameSuggestionsComponent,
		ReceiptDetailsModal,
		NumericalValidator,
		MoneyValidator,
		TimesPipe,
		MonthPipe,
		ReceiptModal,
		TagsSelectorComponent,
        TagComponent,
        SuggestionTagComponent,
        AddTagComponent,
        TagListComponent,
        ReceiptFiltersModal,
        ReceiptPhotoModal,
        AddTagModal,
		YearMonthComponent,
		NetworkIconComponent,
		SlidingDirective,
		HideKeyboardOnEnterDirective,
		TagListReadOnlyComponent,
        ColorPaletteComponent,
        HideHeaderDirective,
        GesturesDirective,
        SingleExpenseMoneyInputComponent,
        MoneyInputComponent
	]
})
export class SharedModule {}
