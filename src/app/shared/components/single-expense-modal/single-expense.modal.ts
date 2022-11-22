import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ExpenseDetails, ExpenseDetailsComponent } from '../expense-details/expense-details.component';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { NetworkGuard } from '../../utils/network.guard';
import { DiscardChangesGuard } from '../../utils/discard-changes.guard';
import { Bus } from '../../bus';
import { BackButtonManager } from '../../managers/back-button.manager';
import { Subscription } from 'rxjs';
import { CopyExpenseModal } from '../copy-expense-modal/copy-expense.modal';
import { formatMoney } from '../../utils/money';
import { ApiLogger } from '../../api-logger';

@Component({
	selector: 'app-single-expense-modal',
	templateUrl: 'single-expense.modal.html',
	styleUrls: ['single-expense.modal.scss']
})
export class SingleExpenseModal implements OnInit, OnDestroy { 

	private _originalJson: string;
	public expense: ExpenseDetails;
	private _backButtonSubscription: Subscription;
    public isSaving: boolean = false;

    @Input() isAddingNewExpense: boolean;

    @Input() addNewExpenseFunc: (ExpenseDetails) => Promise<void>
    
	@Input() set expenseDetails(value: ExpenseDetails){
		this.expense = value;
		this._originalJson = JSON.stringify(value);
	};

    @Input() hideDelete: boolean;
    @Input() hideCopy: boolean;

	@Input() hideReceiptLink: boolean;

	@ViewChild(ExpenseDetailsComponent) details: ExpenseDetailsComponent

	constructor(
        private _toastController: ToastController,
		private _modalController: ModalController,
		private _networkGuard: NetworkGuard,
		private _discardChangesGuard: DiscardChangesGuard,
		private _bus: Bus,
		private _backButtonManager: BackButtonManager,
		private _alertController: AlertController,
        private _logger: ApiLogger) {}

	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public async save() {
		try {
            this.isSaving = true;

            if(this.details.isInvalid()){
                this.details.touch();
            }
            else {
                await this._networkGuard.guardAsync(async () => {
                    await this._modalController.dismiss({
                        deleteRequested: false,
                        expenseDetails: this.expense
                    })
                });
            }	
        } catch (error) {
            this._logger.error("single-expense.modal.ts->save()", error);
            this._logger.somethingWentWrongToast();
        } finally {
            this.isSaving = false;
        }
	}

    public async saveAndAddNext() {
        try {
            this.isSaving = true;

            if(this.details.isInvalid()){
                this.details.touch();
            }
            else {
                await this._networkGuard.guardAsync(async () => {
                    await this.addNewExpenseFunc(this.expense);
    
                    const toast = await this._toastController.create({
                        message: `Dodano '${this.expense.name}' za ${formatMoney(this.expense.amount)} zł`,
                        position: 'top',
                        color: 'success',
                        duration: 1500,
                        animated: true,
                        buttons: [{ text: 'ok', handler: () => toast.dismiss()}]
                    });
            
                    await toast.present();
    
                    this.details.reset();
    
                    this.expenseDetails = {
                        amount: null,
                        dateUnixTimestamp: this.expense.dateUnixTimestamp,
                        name: null,
                        orderInReceipt: this.expense.orderInReceipt == null
                            ? null
                            : this.expense.orderInReceipt + 1,
                        quantity: null,
                        receiptLocalId: this.expense.receiptLocalId,
                        tags: [],
                        unitPrice: null
                    };
                });
            }	       
        } catch (error) {
            this._logger.error("single-expense.modal.ts->saveAndAddNext()", error);
            this._logger.somethingWentWrongToast();
        } finally {
            this.isSaving = false;
        }
    }

    public async delete() {
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
					this._networkGuard.guard(() => this._modalController.dismiss({
						deleteRequested: true,
						expenseDetails: this.expense
					}));
				}
			}]
		});
	  
		await deleteAlert.present();		
	}

	public async cancel() {
		if(this.wasChanged()) {
			this._discardChangesGuard.guard(() => this._modalController.dismiss());
		} else {		
			this._modalController.dismiss();
		}
	}

	public onDetailsChange(expense: ExpenseDetails, newExpense: ExpenseDetails){
		Object.assign(expense, newExpense);
	}

	public onShowReceipt() {
		if(this.wasChanged()) {
			this._discardChangesGuard.guard(
				() => this.showReceipt(),
				`Zmiany nie zostały zapisane, czy na pewno chcesz przejść do paragonu?`);
		} else {		
			this.showReceipt();
		}		
	}

	private async showReceipt() {
        await this._modalController.dismiss();

        await this
            ._bus
            .sendShowReceiptCommand({
                receiptLocalId: this.expense.receiptLocalId
            });
	}

	private wasChanged() {
		const currentJson = JSON.stringify(this.expense);	
		const wasChanged = this._originalJson !== currentJson;

		return wasChanged;
    }
    
    public async copy() {
        const expenseCopy: ExpenseDetails = {
            amount: this.expense.amount,
            dateUnixTimestamp: this.expense.dateUnixTimestamp,
            name:this.expense.name,
            orderInReceipt: null,
            quantity: this.expense.quantity,
            receiptLocalId: null,
            tags: this.expense.tags.slice(),
            unitPrice: this.expense.unitPrice
        };

        const currentModal = await this._modalController.getTop();

        const modal = await this
            ._modalController
            .create({
                component: CopyExpenseModal,
                componentProps: { 
                    expenseDetails: expenseCopy,
                    parentModal: currentModal
                }
            });
    
        await modal.present();       
    }
}