import { Component, ViewChild, Input, OnInit, OnDestroy} from '@angular/core';
import { DateParser } from '../../dateParser';
import { Guid } from "guid-typescript";
import * as _ from "lodash";
import { ExpenseItem, ExpenseListComponent, ReceiptImage } from '../expense-list/expense-list.component';
import { ReceiptsManager } from '../../managers/receipts.manager';
import { ModalController, ToastController } from '@ionic/angular';
import { ReceiptDetailsModal } from '../receipt-details-modal/receipt-details.modal';
import { ExpensesManager, ExpenseToCreate } from '../../managers/expenses.manager';
import { ReceiptFilter, ReceiptFiltersModal } from '../receipt-filters-modal/receipt-filters.modal';
import { noCategoryTag } from '../../utils/no-category-tag';
import { ArrayUtils } from '../../utils/array-utils';
import { SingleExpenseModal } from '../single-expense-modal/single-expense.modal';
import { ReceiptEntity } from '../../database/entities/receipt-entity';
import { DatabaseService } from '../../database/database.injectable';
import { ExpenseEntity } from '../../database/entities/expense-entity';
import { Bus } from '../../bus';
import { ReceiptProductData } from '../../database/entities/receipt-product-data';
import { Receipts } from '../../utils/receipts';
import { Subscription } from 'rxjs';
import { BackButtonManager } from '../../managers/back-button.manager';
import { DELETE_CANCEL_TOAST_DURATION } from '../../consts';
import { TagsManager } from '../../managers/tags/tags.manager';
import { ExpenseDetails } from '../expense-details/expense-details.component';
import { ReceiptPhotoModal } from '../receipt-photo-modal/receipt-photo.modal';
import { ApiLogger } from '../../api-logger';

@Component({
	selector: 'app-receipt-modal',
	templateUrl: 'receipt.modal.html',
	styleUrls: ['receipt.modal.scss'],
})
export class ReceiptModal implements OnInit, OnDestroy{
	
	private _receipt: ReceiptEntity
	public filters: ReceiptFilter = {
		tagIds: []
	};

	public expenseFilter: (e: ExpenseItem) => boolean;

	public productsSum: number = 0;

	public receiptImage: ReceiptImage;

	public isInCorrectionMode: boolean;

	public isScrolling: boolean;

	@Input() set receipt(receipt: ReceiptEntity) {
		this._receipt = receipt;

		if(receipt) {					
			this.isInCorrectionMode = this.isReceiptInCorrectionMode(
				receipt);

			if(this.isInCorrectionMode) {
				this.initializeCorrectionMode(receipt);			
			} else {
				this.initializeNormalMode(receipt);	
			}
		}
	}

	private isReceiptInCorrectionMode(receipt:ReceiptEntity) {
		return receipt.products && receipt.products.length > 0;
	}

	private initializeNormalMode(receipt: ReceiptEntity) {
		this.isLoading = true;

		this._database
			.howManyExpensesForReceiptExist(receipt.localId)
			.then(count => {
				this.skeletonCount = Math.min(count, 5);
				return this._database.getExpensesForReceipt(receipt.localId);
			})				
			.then(expenses => this.expenses = expenses.map(e => this.toExpenseItem(e)))		
			.finally(() => {
				this.skeletonCount = 0;
				this.isLoading = false;
			});
	}

	private async initializeCorrectionMode(receipt: ReceiptEntity) {	
		try {
            this.expenses = receipt
                .products
                .map(e => this.convertProductToExpenseItem(e, receipt));

            this.isLoading = false
            this.isReceiptImageLoading = true;

            const blob = await this
                ._receiptsManager
                .getImage(receipt.cloudId);

            const img = new Image()

            img.onload = (event) => {
                const target: any = event.target;

                this.receiptImage = {
                    image: img,
                    receiptLocation: Receipts.calculateReceiptLocation(receipt)
                };

                URL.revokeObjectURL(target.src);              
                this.isReceiptImageLoading = false;
            }
            
            img.src = URL.createObjectURL(blob)
        } catch (error) {
            this._logger.error("receipt.modal.ts->initializeCorrectionMode()", error);
            throw error;
        }
	}

	get receipt() {
		return this._receipt;
	}


	public isLoading: boolean = true;
	public isDateBeingChanged: boolean;
	public isReceiptImageLoading: boolean;
	public isReceiptBeingConfirmed: boolean;
	public isExpenseBeingDeleted: boolean;
	public isProcessingProductChange: boolean;

	public dateParser: DateParser = new DateParser();

	public expenses: ExpenseItem[] = null;	
	public skeletonCount: number;

	private _backButtonSubscription: Subscription;

	@ViewChild(ExpenseListComponent) expenseList: ExpenseListComponent;

	constructor(
		private _database: DatabaseService,
		private _receiptsManager: ReceiptsManager,
		private _modalController: ModalController,
		private _expensesManager: ExpensesManager,
		private _tagsManager: TagsManager,
		private _bus: Bus,
		private _toastController: ToastController,
		private _backButtonManager: BackButtonManager,
        private _logger: ApiLogger) {
	}
	
	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => {
				if(this.selectedItemsCount) {
					this.unselectAll();
				} else {
					this.cancel();
				}
			});
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public async cancel() {
		if(this.isInCorrectionMode && this.isReceiptCorrect()) {
			await this.confirmReceipt()
		} else {			
			this.closeModal();
		}
	}

	private closeModal() {
		return this._modalController.dismiss();
	}

	public allCount():number {
		return this
			.expenses
			.filter(e => !e.isBeingDeleted && !e.isDeleted)
			.length;
	}
	
	public deleteSelected(){
		this.expenseList.deleteSelected();
	}
	
	public editSelected(){
		this.expenseList.editSelected();
	}

	public tagSelected(){
		this.expenseList.modifyTags();
	}

	public selectedItemsCount = 0;
	public areAllSelected = false;

	public selectAll(){
		this.areAllSelected = !this.areAllSelected;

		if(this.areAllSelected) this.expenseList.selectAll();
		else this.expenseList.unselectAll();
	}

	public unselectAll() {
		this.areAllSelected = false;
		this.expenseList.unselectAll();
	}

	public onExpensesSelectionChange(count) {
		this.selectedItemsCount = count;

		this._bus.sendChangeTabVisibilityCommand({
			sourceView: "receipt-details",
			isTabVisible: count === 0
		});

		this.updateAreAllSelected();
	}

	private updateAreAllSelected() {
		if(this.selectedItemsCount == 0){
			this.areAllSelected = false;			
		} else if(this.selectedItemsCount === this.expenses.filter(e => e.isSelected).length) {
			this.areAllSelected = true;
		}
	}

	public async editDetails() {
		const modal = await this
			._modalController
			.create({
				component: ReceiptDetailsModal,
				componentProps: { 
					receipt: this.receipt,
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

		if(result.data) {
			this.receipt.totalAmount = result.data.details.totalAmount;
			this.receipt.seller = result.data.details.seller;

			const wasDateChanged = this.receipt.dateUnixTimestamp !== result.data.details.dateUnixTimestamp;
			this.receipt.dateUnixTimestamp = result.data.details.dateUnixTimestamp;

			await this._receiptsManager.updateDetails(
				this.receipt.localId, 
				this.receipt.seller, 
				this.receipt.totalAmount, 
				this.receipt.dateUnixTimestamp);

			if(wasDateChanged) {
				if(this.isInCorrectionMode) await this.updateAllProductsDate();
				else await this.updateAllExpensesDate();
			}
		}
	}

	private async updateAllProductsDate() {
		this.expenses
			.forEach(e => e.dateUnixTimestamp = this.receipt.dateUnixTimestamp);

		await this.updateReceiptProducts();
	}

	private async updateAllExpensesDate() {
		this.isDateBeingChanged = true;

		await this
			._expensesManager
			.bulkDateUpdate(
				this.expenses, 
				this.receipt.dateUnixTimestamp)
			.then(() => this.expenses.forEach(e => e.dateUnixTimestamp = this.receipt.dateUnixTimestamp))
			.finally(() => this.isDateBeingChanged = false);
	}

	public async showFilters() {		
		const modal = await this
			._modalController
			.create({
				component: ReceiptFiltersModal,
				componentProps: { 
					filters: this.filters
				}
			});

		await modal.present();

        const result = await modal.onDidDismiss();
        
        if(result.data) {
            this.filters = result.data;
            this.reloadOnFiltersChange();
        }
	}	

    public async showPhoto() {		
		const modal = await this
			._modalController
			.create({
				component: ReceiptPhotoModal,
				componentProps: { 
					receipt: this.receipt
				}
			});

		await modal.present();
	}	

	public reloadOnFiltersChange() {
		if(this.filters.tagIds.length) {
			this.expenseFilter = (expense: ExpenseItem) => {
				const tags = this.filters.tagIds.slice();

				if(tags.includes(noCategoryTag)) return expense.tags.length == 0;
			
				return ArrayUtils.doesContainSubArray(
					expense.tags,
					this.filters.tagIds,
					(a, b) => a === b)
			};

		} else {
			this.expenseFilter = null;
		}
	}

	public async onExpensesChange() {
		if(this.isInCorrectionMode) {
			await this.updateReceiptProducts();
		}
	}

	private async updateReceiptProducts() {
		this._receipt.products = this
				.expenses
				.filter(expense => !expense.isBeingDeleted && !expense.isDeleted)
				.map(expense => {
					const product: ReceiptProductData = {
						amount: expense.amount,
						boundingBox: expense.boundingBox,
						isCorrupted: false,
						name: expense.name,
						orderInReceipt: expense.orderInReceipt,
						quantity: expense.quantity,
						tags: expense.tags,
						unitPrice: expense.unitPrice,						
					};

					return product;
				});

		await this._receiptsManager.updateReceiptProducts(
			this._receipt.localId,
			this._receipt.products);
	}

	public isProductsSumWrong() {
		this.productsSum = this
			.expenses
			.filter(e => !e.isBeingDeleted && !e.isDeleted && Receipts.isAmountValid(e))
			.reduce((acc, expense) => acc + parseFloat(<any> expense.amount), 0);

		const shouldWarn = Receipts.shouldWarnAboutSumDifferences(
			this.receipt.totalAmount, 
			this.productsSum);

        return shouldWarn;
	}

	public async addExpense() {
		const modal = await this
			._modalController
			.create({
				component: SingleExpenseModal,
				componentProps: {
                    isAddingNewExpense: true,
                    addNewExpenseFunc: (expense: ExpenseDetails) => this.addNewExpense(expense),
					expenseDetails: {
                        amount: null,
                        dateUnixTimestamp: this.receipt.dateUnixTimestamp,
                        name: null,
                        quantity: null,
                        unitPrice: null,
                        tags: [],
                        orderInReceipt: this.getNewExpenseOrderInReceipt(),
                    },
                    hideDelete: true,
                    hideCopy: true
				}
			});

		await modal.present();
	}

    private async addNewExpense(expenseDetails: ExpenseDetails): Promise<void> {
        const toCreate: ExpenseToCreate =  {
			itemId: Guid.create().toString(),
			amount: expenseDetails.amount,
			dateUnixTimestamp: expenseDetails.dateUnixTimestamp,
			name: expenseDetails.name,
			quantity: expenseDetails.quantity,
			unitPrice: expenseDetails.unitPrice,
			tags: expenseDetails.tags,
			orderInReceipt: expenseDetails.orderInReceipt,
		};

        if (this.isInCorrectionMode) await this.createNewProduct(toCreate);
        else await this.createNewExpense(toCreate);
    }

	private async createNewProduct(toCreate: ExpenseToCreate) {
		const product: ReceiptProductData = {
			amount: toCreate.amount,
			boundingBox: null,
			isCorrupted: false,
			name: toCreate.name,
			orderInReceipt: toCreate.orderInReceipt,
			quantity: toCreate.quantity,
			tags: toCreate.tags.slice(),
			unitPrice:toCreate.unitPrice
		};

		const expense = this.convertProductToExpenseItem(
			product, 
			this.receipt);

		this.receipt.products.push(product);
		this.expenses.push(expense);

		await this._tagsManager.applyNewTags(
            [expense], 
            { chains: []});

		await this.updateReceiptProducts();
	}

	private async createNewExpense(toCreate: ExpenseToCreate) {
		const entities = await this._expensesManager.bulkCreate(
			[toCreate], 
			this.receipt.localId, 
			this.receipt.cloudId, 
			this._receiptsManager,
			false);

		entities.forEach(e => this.expenses.push(this.toExpenseItem(e)));
	}

	private getNewExpenseOrderInReceipt() {
		const orders = this
			.expenses
			.map(e => e.orderInReceipt);

		if(orders.length) return Math.max(...orders) + 1;
		return 0;
	}
	
	private toExpenseItem(entity: ExpenseEntity) {		
		const item: ExpenseItem = {
			itemId: Guid.create().toString(),
            isBeingDeleted: entity.isBeingDeleted,
            isBeingSwiped: false,
			isDeleted: false,
			localId: entity.localId,
			cloudId: entity.cloudId,
			isSelected: false,

			amount: entity.amount,
			dateUnixTimestamp: entity.dateUnixTimestamp,
			name: entity.name,
			quantity: entity.quantity,
			tags: entity.tags,
			unitPrice: entity.unitPrice,
			orderInReceipt: entity.orderInReceipt,
			receiptLocalId: entity.receiptLocalId,

			boundingBox: null,
		};

		return item;
	}

	private convertProductToExpenseItem(entity: ReceiptProductData, receipt: ReceiptEntity) {		
		const item: ExpenseItem = {
			itemId: Guid.create().toString(),
            isBeingDeleted: false,
            isBeingSwiped: false,
			isDeleted: false,
			localId: null,
			cloudId: null,
			isSelected: false,

			amount: entity.amount,
			dateUnixTimestamp: receipt.dateUnixTimestamp,
			name: entity.name,
			quantity: entity.quantity,
			tags: entity.tags,
			unitPrice: entity.unitPrice,
			orderInReceipt: entity.orderInReceipt,
			receiptLocalId: receipt.localId,
			
			boundingBox: entity.boundingBox,
		};

		return item;
	}

	public isReceiptCorrect() {
		return areAllExpensesValid(this.expenses)
			&& noExpensesAreBeingDeleted(this.expenses)
			&& !this.isProductsSumWrong();

		function areAllExpensesValid(expenses) {
			return expenses
				.filter(e => !e.isBeingDeleted && !e.isDeleted)
				.filter(e => !Receipts.isAmountValid(e))
				.length == 0;
		}

		function noExpensesAreBeingDeleted(expenses) {
			return expenses
				.filter(e => e.isBeingDeleted)
				.length == 0;
		}
	}

	public async confirmReceipt() {
		try {
			this.isReceiptBeingConfirmed = true;

			await this
				._receiptsManager
				.confirmReceipt(this.receipt);
				
			await this
				._modalController
				.dismiss();
		} catch (error) {
            this._logger.error("receipt.modal.ts->confirmReceipt()", error);

			const info = await this._toastController.create({
				message: `Podczas zatwierdzania paragonu coś poszło nie tak, spróboj ponownie za jakiś czas.`,
				cssClass: 'confirmation-toastr',
				position: 'top',
				color: 'danger',
				duration: DELETE_CANCEL_TOAST_DURATION,
				animated: true,
				buttons: [{ text: 'ok', handler: () => info.dismiss()}]
			});
	
			await info.present();
		}
		finally {
			this.isReceiptBeingConfirmed = false;
		}
	}

	public onScrollStart() {
        this.isScrolling = true;
	}

	public onScrollEnd() {
		this.isScrolling = false;
    }
    
    public isProductsSumTooMuch() {
        return this.productsSum - this.receipt.totalAmount >= 0.0099;
    }

    public isProductsSumNotEnough() {
        return this.receipt.totalAmount - this.productsSum >= 0.0099;
    }

    public clearTagFilter() {
        this.filters.tagIds = [];
        this.reloadOnFiltersChange();
    }
}
