import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ExpenseDetails, ExpenseDetailsComponent } from '../expense-details/expense-details.component';
import { ModalController } from '@ionic/angular';
import { NetworkGuard } from '../../utils/network.guard';
import { DiscardChangesGuard } from '../../utils/discard-changes.guard';
import { BackButtonManager } from '../../managers/back-button.manager';
import { Subscription } from 'rxjs';
import { ExpensesManager, ExpenseToCreate } from '../../managers/expenses.manager';
import { Guid } from 'guid-typescript';
import { ApiLogger } from '../../api-logger';
import { faTshirt } from '@fortawesome/free-solid-svg-icons';

@Component({
	selector: 'app-copy-expense-modal',
	templateUrl: 'copy-expense.modal.html',
	styleUrls: ['copy-expense.modal.scss']
})
export class CopyExpenseModal implements OnInit, OnDestroy { 

	private _originalJson: string;
	public expense: ExpenseDetails;
	private _backButtonSubscription: Subscription;

	@Input() set expenseDetails(value: ExpenseDetails){
		this.expense = value;
		this._originalJson = JSON.stringify(value);
    };
    
    @Input() parentModal;

	@ViewChild(ExpenseDetailsComponent) details: ExpenseDetailsComponent

	constructor(
		private _modalController: ModalController,
		private _networkGuard: NetworkGuard,
		private _discardChangesGuard: DiscardChangesGuard,
        private _backButtonManager: BackButtonManager,
        private _expensesManager: ExpensesManager,
        private _logger: ApiLogger) {}

	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public async ok() {
		try {
            if(this.details.isInvalid()){
                this.details.touch();
            }
            else {
                await this._networkGuard.guardAsync(async () => {
                    await this.createExpense();
                    await this.parentModal.dismiss();
                    await this._modalController.dismiss({
                        wasCopied: true
                    });
                });
            }	
        } catch (error) {
            this._logger.error("copy-expense.modal.ts->createExpense()", error);
            this._logger.somethingWentWrongToast();
        }	
    }
    
    private async createExpense() {
		try {
            const toCreate: ExpenseToCreate =  {
                itemId: Guid.create().toString(),
                amount: this.expense.amount,
                dateUnixTimestamp: this.expense.dateUnixTimestamp,
                name: this.expense.name,
                quantity: this.expense.quantity,
                unitPrice: this.expense.unitPrice,
                tags: this.expense.tags,
                orderInReceipt: null,
            };
    
            await this
                ._expensesManager
                .bulkCreate([toCreate], null, null, null, false);
        } catch (error) {
            this._logger.error("copy-expense.modal.ts->createExpense()", error);
            throw error;
        }
	}

	public async cancel() {
		if(this.wasChanged()) {
			this._discardChangesGuard.guard(() => this._modalController.dismiss({
                wasCopied: false
            }));
		} else {		
			this._modalController.dismiss({
                wasCopied: false
            });
		}
	}

	public onDetailsChange(expense: ExpenseDetails, newExpense: ExpenseDetails){
		Object.assign(expense, newExpense);
	}

	private wasChanged() {
		const currentJson = JSON.stringify(this.expense);	
		const wasChanged = this._originalJson !== currentJson;

		return wasChanged;
    }
}