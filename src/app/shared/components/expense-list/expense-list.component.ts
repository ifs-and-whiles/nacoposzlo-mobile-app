import { Component, Input, Output, EventEmitter} from '@angular/core';
import { ExpenseDetails } from '../expense-details/expense-details.component';
import { SingleExpenseModal } from '../single-expense-modal/single-expense.modal';
import { ExpensesManager, ExpenseToDelete, ExpenseToTag } from '../../managers/expenses.manager';
import { ModalController, ToastController } from '@ionic/angular';
import { BulkExpenseModal } from '../bulk-expense-modal/bulk-expense.modal';
import { DatabaseService } from '../../database/database.injectable';
import { TagsModal } from '../tags-modal/tags.modal';
import * as _ from "lodash";
import { ArrayUtils } from '../../utils/array-utils';
import { NetworkGuard } from '../../utils/network.guard';
import { ReceiptsManager } from '../../managers/receipts.manager';
import { TagsMath } from '../../managers/tags/tagsMath';
import { BoundingBox } from '../../utils/bounding-box';
import { ReceiptLocation } from '../../utils/receipts';
import { DELETE_CANCEL_TOAST_DURATION } from '../../consts';
import { TagsManager, TagsUsage } from '../../managers/tags/tags.manager';
import { Vibration } from '@ionic-native/vibration/ngx';
import { NamesMath } from '../../managers/names/namesMath';
import { NameSuggestionsManager, NamesUsage } from '../../managers/names/name-suggestions.manager';
import { ApiLogger } from '../../api-logger';

export interface ExpenseItem {
    isBeingDeleted: boolean;
    isBeingSwiped: boolean;
	isDeleted: boolean;

	isSelected: boolean;
	itemId: string;
	
	localId: number;
	cloudId: string;
	amount: number;
	name: string;
	dateUnixTimestamp: number
	tags: string[],
	quantity: number;
	unitPrice: number;
	orderInReceipt: number;
	receiptLocalId: number;

	boundingBox: BoundingBox;
}

export interface ReceiptImage {
	image: HTMLImageElement;
	receiptLocation: ReceiptLocation;
}

@Component({
	selector: 'app-expense-list',
	templateUrl: 'expense-list.component.html',
	styleUrls: ['expense-list.component.scss']
})
export class ExpenseListComponent {
	@Input() isInCorrectionMode: boolean;
	@Input() receiptImage: ReceiptImage;
	@Input() receiptTotalAmount: number;
	@Input() expenses: ExpenseItem[];
	@Input() expenseFilter: (e: ExpenseItem) => boolean;
	@Input() hideReceiptLink: boolean;
	@Input() isScrolling: boolean;	
	@Input() set skeletonCount(value: number) {
		if(value) {
			this.skeletons = ArrayUtils.range(1, value);
		} else {
			this.skeletons = null;
		}
	}
    @Input() highlightPhrase: string = "";
	@Output() expensesChange = new EventEmitter();
	@Output() selectionChange = new EventEmitter<number>();

    
    public selectedCount: number = 0;
	public isLoading = true;
	public skeletons = ArrayUtils.range(1, 10);

	private confirmationToast: HTMLIonToastElement;

    constructor(
        private _database: DatabaseService,
        private _toastController: ToastController,
		private _expensesManager: ExpensesManager,
		private _receiptManager: ReceiptsManager,
		private _modalController: ModalController,
		private _networkGuard: NetworkGuard,
        private _tagsManager: TagsManager,
        private _nameSuggestionsManager: NameSuggestionsManager,
        private _vibration: Vibration,
        private _logger:ApiLogger) {}

    public clickExpense(expense: ExpenseItem) {
		if(this.selectedCount > 0){
			this.toggleExpenseSelection(expense);
		}
		else {
			this.editExpense(expense); 
		}					
    }

    public toggleExpenseSelection(expense: ExpenseItem){
        this._vibration.vibrate(50);
		expense.isSelected = !expense.isSelected;
		this.onSelectionChange();
    }
    
    public async editExpense(expense: ExpenseItem) {
		const toEdit: ExpenseDetails =  {
			amount: expense.amount,
			dateUnixTimestamp: expense.dateUnixTimestamp,
			name: expense.name,
			quantity: expense.quantity,
			unitPrice: expense.unitPrice,
			tags: expense.tags.slice(),
			orderInReceipt: expense.orderInReceipt,
			receiptLocalId: expense.receiptLocalId,
		};

		const modal = await this
			._modalController
			.create({
				component: SingleExpenseModal,
				componentProps: { 
                    isAddingNewExpense: false,
					expenseDetails: toEdit,
                    hideReceiptLink: this.hideReceiptLink,
                    hideCopy: this.isInCorrectionMode
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

		if(!result.data)
			return;

		const editedExpense = result.data.expenseDetails;
		const oldTagsUsage = TagsMath.calculateUsage([expense], (e) => e.tags);
        const oldNamesUsage = NamesMath.calculateUsage([expense], (e) => e.name);

		if(this.isInCorrectionMode) {
			await this.editExpenseInCorrectionMode(
				expense,
				editedExpense,
				result.data.deleteRequested,
                oldTagsUsage,
                oldNamesUsage);	
		} else {
			await this.editExpenseInNormalMode(
				expense,
				editedExpense,
				result.data.deleteRequested,
                oldTagsUsage,
                oldNamesUsage);				
		}		
	}		
	
	private async editExpenseInCorrectionMode(
		expense: ExpenseItem, 
		editedExpense: any,
		wasDeleteRequested: boolean,
        oldTagsUsage: TagsUsage,
        oldNamesUsage: NamesUsage) {
		
		this.isLoading = true; 

		try {
			if (wasDeleteRequested) {
				await this._tagsManager.decrementTags(
                    oldTagsUsage);

                await this._nameSuggestionsManager.decrementNameSuggestions(
                    oldNamesUsage);

				ArrayUtils.remove(this.expenses, expense)
			} else {
				Object.assign(expense, editedExpense);			

				await this._tagsManager.applyNewTags(
					[expense],
                    oldTagsUsage);

                await this._nameSuggestionsManager.incrementNamesSuggestions(
                    oldNamesUsage,
                    NamesMath.calculateUsage([expense], e => e.name));
			}		

			this.expensesChange.emit();		
		} catch(error) {
			this._logger.error("expense-list.page.ts->editExpenseInCorrectionMode()", error);
			this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );
		} finally {
			this.isLoading = false
		}
	}

	private async editExpenseInNormalMode(
		expense: ExpenseItem, 
		editedExpense: any,
		wasDeleteRequested: boolean,
        oldTagsUsage: TagsUsage,
        oldNamesUsage: NamesUsage)  {
			
		this.isLoading = true; 

		try {
			if (wasDeleteRequested) {
				await this._expensesManager.bulkDelete([{
					cloudId: expense.cloudId,
					localId: expense.localId,
					receiptLocalId: expense.receiptLocalId,
					tags: expense.tags,
                    name: expense.name
				}], this._receiptManager);

				ArrayUtils.remove(this.expenses, expense)
			} else {
				const clonedExpense = Object.assign(_.cloneDeep(expense), editedExpense);

				await this._expensesManager.update(clonedExpense, oldTagsUsage, oldNamesUsage, this._receiptManager);
				Object.assign(expense, editedExpense);			
			}		

			this.expensesChange.emit();
		} finally {
			this.isLoading = false
		}
	}
    
    public async editExpenses(expenses: ExpenseItem[]) {
		const items: {original: ExpenseItem, toEdit: ExpenseDetails}[] = expenses.map(e => ({
			original: e,
			toEdit: {
				amount: e.amount,
				dateUnixTimestamp: e.dateUnixTimestamp,
				name: e.name,
				quantity: e.quantity,
				unitPrice: e.unitPrice,
				tags: e.tags.slice(),
				orderInReceipt: e.orderInReceipt,
				receiptLocalId: e.receiptLocalId
			}
		}));

		const modal = await this
			._modalController
			.create({
				component: BulkExpenseModal,
				componentProps: {expensesDetails: items.map(i => i.toEdit)}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

		if(!result.data)
			return;

		if(this.isInCorrectionMode) {
			await this.editExpensesInCorrectionMode(items, result);
		} else {
			await this.editExpensesInNormalMode(items, result);
		}		
	}	
	
	private async editExpensesInCorrectionMode(items, result) {
		const modifiedItems = items
			.filter(item => result.data
				.expenseDetailsItems
				.filter(i => i.isConfirmed)
				.map(i => i.details)
				.includes(item.toEdit));

		const deletedItems = items
			.filter(item => result.data
				.expenseDetailsItems
				.filter(i => i.isDeleted)
				.map(i => i.details)
				.includes(item.toEdit));

		this.isLoading = true;

		if(modifiedItems.length) {
			const originalItems = modifiedItems.map(i => i.original);

			const oldTagsUsage = TagsMath.calculateUsage(
                originalItems, 
                (e: ExpenseItem) => e.tags);

			modifiedItems.forEach(i => Object.assign(i.original, i.toEdit));

			await this._tagsManager.applyNewTags(
				originalItems,
                oldTagsUsage);
		}		
		
		if(deletedItems.length) {
			const originalItems = deletedItems.map(i => i.original);

			const oldTagsUsage = TagsMath.calculateUsage(originalItems, (e: ExpenseItem) => e.tags);

			await this._tagsManager.decrementTags(
                oldTagsUsage);

			deletedItems.forEach(item => ArrayUtils.remove(this.expenses, item.original));

			this.onSelectionChange();
		}
		
		this.expensesChange.emit();
	}

	private async editExpensesInNormalMode(items, result) {
		const modifiedItems = items
				.filter(item => result.data
					.expenseDetailsItems
					.filter(i => i.isConfirmed)
					.map(i => i.details)
					.includes(item.toEdit));

		const deletedItems = items
			.filter(item => result.data
				.expenseDetailsItems
				.filter(i => i.isDeleted)
				.map(i => i.details)
				.includes(item.toEdit));


		this.isLoading = true;

		if(modifiedItems.length) {
			const oldTagsUsage = TagsMath.calculateUsage(modifiedItems.map(i => i.original), (e: ExpenseItem) => e.tags);
            const oldNamesUsage = NamesMath.calculateUsage(modifiedItems.map(i => i.original), (e: ExpenseItem) => e.name);
			modifiedItems.forEach(i => Object.assign(i.original, i.toEdit));

			await this._expensesManager.bulkUpdate(modifiedItems.map(i => i.original), oldTagsUsage, oldNamesUsage, this._receiptManager)
		}		
		
		if(deletedItems.length) {
			await this._expensesManager.bulkDelete(deletedItems.map(i => {
				const toDelete: ExpenseToDelete = {
					cloudId: i.original.cloudId,
					localId: i.original.localId,
					receiptLocalId: i.original.receiptLocalId,
					tags: i.original.tags,
                    name: i.original.name
				};

				return toDelete;
			}), this._receiptManager);

			deletedItems.forEach(item => ArrayUtils.remove(this.expenses, item.original));

			this.onSelectionChange();
		}

		this.isLoading = false;
		
		this.expensesChange.emit();
	}
    
    public async deleteExpense(expense: ExpenseItem) {
		try {
            await this._networkGuard.guardAsync(async () => {
                const wasExpenseSelected = expense.isSelected;
            
                expense.isBeingDeleted = true;
                
                if(wasExpenseSelected) {
                    expense.isSelected = false;		
                    this.onSelectionChange();
                }
    
                await this.deleteExpenses([{
                    localId: expense.localId, 
                    cloudId: expense.cloudId, 
                    receiptLocalId: expense.receiptLocalId,
                    tags: expense.tags.slice(),
                    name: expense.name}],
                    () => {
                        expense.isBeingDeleted = false;
                        expense.isDeleted = true;
                    },	
                    () => {
                        expense.isBeingDeleted = false;
                        expense.isDeleted = false;
                        
                        if(wasExpenseSelected) {
                            expense.isSelected = true;
                            this.onSelectionChange();
                        }
                    }
                );
            });	
        } catch (error) {
            this._logger.error("expense-list.page.ts->deleteExpense()", error);
            this._logger.somethingWentWrongToast();
        }	
    }

    public async deleteSelected() {
		try {
            await this._networkGuard.guardAsync(async () => {
                const selected = this.getSelectedExpenses();
                
                selected.forEach(e => {
                    e.isBeingDeleted = true;
                    e.isSelected = false;
                });
    
                this.onSelectionChange();
    
                const toDelete: ExpenseToDelete[] = selected.map(e =>({
                    cloudId: e.cloudId,
                    localId: e.localId,
                    receiptLocalId: e.receiptLocalId,
                    tags: e.tags.slice(),
                    name: e.name
                }));
    
                await this.deleteExpenses(
                    toDelete, 
                    () => {
                        selected.forEach(e => {
                            e.isBeingDeleted = false;
                            e.isDeleted = true;
                        });
                    },				
                    () => {
                        selected.forEach(p => {
                            p.isBeingDeleted = false;
                            p.isDeleted = false;
                            p.isSelected = true;
                        });
    
                        this.onSelectionChange();
                    });
            });
        } catch (error) {
            this._logger.error("expense-list.page.ts->deleteSelected()", error);
            this._logger.somethingWentWrongToast();
        }
	}
    
    private deleteExpenses(
		expenses: ExpenseToDelete[], 
		deletedHandler: () => void,
		canceledHandler: () => void) {

		if(this.isInCorrectionMode) {
			return this.correctionModeDelete(
				expenses, 
				deletedHandler,
				canceledHandler);
		} else {
			return this.normalModeDelete(
				expenses, 
				deletedHandler,
				canceledHandler);
		}
	}
	
	private correctionModeDelete(
		expenses: ExpenseToDelete[],
		deletedHandler: () => void, 
		canceledHandler: () => void) {

		this._toastController.create({
			message: `Usunięto ${expenses.length} wydatków.`,
			position: 'top',
			cssClass: 'confirmation-toastr',
			color: 'danger',
			duration: DELETE_CANCEL_TOAST_DURATION,
			animated: true,
			buttons: [{ text: 'cofnij', handler: () => canceledHandler()}]
		})
		.then(toast => {
			this.confirmationToast = toast;

			return this.confirmationToast.present();
		})
		.then(() => this.confirmationToast.onDidDismiss())
		.then(async event => {
			if(event && event.role === 'timeout'){
				try {
					const oldTagsUsage = TagsMath.calculateUsage(
						expenses, 
                        (e: ExpenseToDelete) => e.tags);

					await this._tagsManager.decrementTags(
                        oldTagsUsage);

					deletedHandler();
					this.expensesChange.emit();
				} catch(error) {
                    this._logger.error("expense-list.page.ts->correctionModeDelete()", error);
					await canceledHandler();
				}				
			} 
		});
	}

	private normalModeDelete(
		expenses: ExpenseToDelete[], 
		deletedHandler: () => void,
		canceledHandler: () => void){

		const localIds = expenses.map(e=>e.localId);

		const cancel = () => {
			canceledHandler();
			return this._database.updateExpensesIsBeingDeleted(localIds, false);
		};

		this._database
			.updateExpensesIsBeingDeleted(localIds, true)
			.then(() => this._toastController.create({
				message: `Usunięto ${expenses.length} wydatków.`,
				position: 'top',
				cssClass: 'confirmation-toastr',
				color: 'danger',
				duration: DELETE_CANCEL_TOAST_DURATION,
				animated: true,
				buttons: [{ text: 'cofnij', handler: () => cancel()}]
			}))
			.then(toast => {
				this.confirmationToast = toast;

				return this.confirmationToast.present();
			})
			.then(() => this.confirmationToast.onDidDismiss())
			.then(async event => {
				if(event && event.role === 'timeout'){
					try {
						await this._expensesManager.bulkDelete(expenses, this._receiptManager);
						deletedHandler();
						this.expensesChange.emit();							
					} catch(error) {
                        this._logger.error("expense-list.page.ts->normalModeDelete()", error);
						await cancel();
					}				
				} 
			});
	}
    
    public async modifyTags() {
		const selectedExpenses =  this.getSelectedExpenses()

		const tagIds = _(selectedExpenses)
			.flatMap(e => e.tags)
			.uniq()
			.value();

		const modal = await this
			._modalController
			.create({
				component: TagsModal,
				componentProps: {
					selectedExpensesCount: selectedExpenses.length,
					tagIds: tagIds
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

		if(!result.data)
			return;

		const newTags = result.data.tags.slice();
			
		const oldTagsUsage  = TagsMath.calculateUsage(
			selectedExpenses, 
            (e: ExpenseItem)=>e.tags);

		if(this.isInCorrectionMode) {
			selectedExpenses.forEach(e => e.tags = newTags.slice());
			this.unselectAll();
			
			await this._tagsManager.applyNewTags(
				selectedExpenses,
                oldTagsUsage);

			this.expensesChange.emit();
		} else {	
			const clonedExpenses = _.cloneDeep(selectedExpenses);

			try {	
				selectedExpenses.forEach(e => e.tags = newTags.slice());
				this.unselectAll();

				const expensesToTag: ExpenseToTag[] = selectedExpenses.map(e => ({
					localId: e.localId,
					cloudId: e.cloudId,
					name: e.name
				}));

				await this._expensesManager.bulkTag(expensesToTag, newTags, oldTagsUsage);				
				
				this.expensesChange.emit();
			} catch(error) {                
                this._logger.error("expense-list.page.ts->modifyTags()", error);

				selectedExpenses.forEach(e => {
					const cloned = clonedExpenses.find(ce => ce.localId == e.localId);
					e.tags = cloned.tags.slice()
				});
			} 
		}
	}

	public editSelected() {
		const selected = this.getSelectedExpenses();

		if(selected.length === 1) {
			return this.editExpense(selected[0]);
		} else {
			return this.editExpenses(selected);
		}
	}
       
    public onSelectionChange() {
        this.selectedCount = this.getSelectedExpenses().length;
        this.selectionChange.emit(this.selectedCount);
    }
    
    public unselectAll() {
		this.expenses.forEach(e => e.isSelected = false);
		this.onSelectionChange();
	}

    public selectAll() {
		this.expenses
			.filter(e => !this.isExpenseHidden(e))
			.forEach(e => e.isSelected = true);

		this.onSelectionChange();
    }

    private getSelectedExpenses() {
		return this.expenses.filter(e => e.isSelected);
	}
	
    public trackExpenseBy(index: number, expense: ExpenseItem) {
		if(!expense) return null;
		return expense.itemId;
	}

	public isExpenseHidden(expense: ExpenseItem){
		return expense.isBeingDeleted || expense.isDeleted || (this.expenseFilter && !this.expenseFilter(expense))
	}

	public onAmountChange() {
		this.expensesChange.emit();
	}
}