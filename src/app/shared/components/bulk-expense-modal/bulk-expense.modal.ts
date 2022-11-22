import { Component, Input, ViewChildren, QueryList, OnDestroy, OnInit} from '@angular/core';
import { AlertController, ModalController} from '@ionic/angular';
import { ExpenseDetails, ExpenseDetailsComponent } from '../expense-details/expense-details.component';
import { Guid } from 'guid-typescript';
import { NetworkGuard } from '../../utils/network.guard';
import { DiscardChangesGuard } from '../../utils/discard-changes.guard';
import { BackButtonManager } from '../../managers/back-button.manager';
import { Subscription } from 'rxjs';

interface ExpenseDetailsItem {
    itemId: string;
    details: ExpenseDetails;
    isConfirmed: boolean;
    isDeleted: boolean;
}

@Component({
	selector: 'app-bulk-expense-modal',
	templateUrl: 'bulk-expense.modal.html',
    styleUrls: ['bulk-expense.modal.scss']
})
export class BulkExpenseModal implements OnInit, OnDestroy{
    public items: ExpenseDetailsItem[];
    private _originalJson: string;
    private _backButtonSubscription: Subscription;
    
	@Input() set expensesDetails(expenses: ExpenseDetails[]) {
        this.items = expenses.map(e => ({
            itemId: Guid.create().toString(),
            details: e,
            isConfirmed: false,
            isDeleted: false
        }));

        this._originalJson = JSON.stringify(this.items);
    }
    
    @Input() titleLine: string;
    @Input() descriptionLine: string;

    @ViewChildren(ExpenseDetailsComponent) details: QueryList<ExpenseDetailsComponent>

	constructor(
        private _modalController: ModalController,
        private _networkGuard: NetworkGuard,
        private _discardChangesGuard: DiscardChangesGuard,
        private _backButtonManager: BackButtonManager,
        private _alertController: AlertController) {
    }

    ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public async cancel() {
        const currentJson = JSON.stringify(this.items);	
		const wasChanged = this._originalJson !== currentJson;

		if(wasChanged) {
            this._discardChangesGuard.guard(() => this._modalController.dismiss());
		} else {		
			this._modalController.dismiss();
		}
	}
    
    public save() {     
        this.items.forEach((item, index) => {
            const component = this.details.toArray()[index];
    
            if(component.isInvalid()) {
                component.touch();
            }
            else {
                item.isConfirmed = true;                        
            }		        
        });       
        
        this.dismissIfDone();
    }

    public async delete(expenseDetailsItem: ExpenseDetailsItem) {
        const deleteAlert = await this._alertController.create({
			header:  'Usunąć wydatek?',
			message: `Czy na pewno chcesz usunąć ten wydatek?`,
			buttons: [{
				text: 'Anuluj',
				role: 'cancel',
				cssClass: 'text-medium'
			}, {
				text: 'Usuń',
				cssClass: 'text-danger',
				handler: () => {
                    expenseDetailsItem.isDeleted = true;
                    this.dismissIfDone();     
				}
			}]
		});
	  
        await deleteAlert.present();      
    }

    private async dismissIfDone() {
        await this._networkGuard.guardAsync(async () => {
            const notProcessedCount = this.getNotProcessedCount();

            if(notProcessedCount === 0) {
                await this._modalController.dismiss({
                    expenseDetailsItems: this.items
                });
            }     
        });
    }

    private getNotProcessedCount() {
        return this
            .items
            .filter(i => !i.isConfirmed && !i.isDeleted)
            .length;
    }

    public trackDetailsBy(index: number, details: ExpenseDetailsItem) {
		if(!details) return null;
		return details.itemId;
    }
    
	public onDetailsChange(item: ExpenseDetailsItem, newExpense: ExpenseDetails){
		Object.assign(item.details, newExpense);
	}
}