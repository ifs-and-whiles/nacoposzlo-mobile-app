import { Component, OnDestroy, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { ReceiptsApi } from '../shared/api/receipts.api';
import { Subscription } from 'rxjs';
import { Guid } from "guid-typescript";
import { IonInfiniteScroll, ModalController, ToastController } from '@ionic/angular';
import { Month } from '../shared/month';
import { ReceiptsManager, IHaveLocalId } from '../shared/managers/receipts.manager';
import { DateParser, OneDayMilliseconds } from '../shared/dateParser';
import { ReceiptDetailsModal } from '../shared/components/receipt-details-modal/receipt-details.modal';
import { ArrayUtils } from '../shared/utils/array-utils';
import { NetworkGuard } from '../shared/utils/network.guard';
import { DeleteExpensesGuard } from './delete-expenses-guard/delete-expenses.guard';
import { UsersManager } from '../shared/managers/users.manager';
import { ReceiptProductData } from '../shared/database/entities/receipt-product-data';
import { ReceiptForListEntityCursor } from '../shared/database/entities/receipt-for-list-entity-cursor';
import { DatabaseService } from '../shared/database/database.injectable';
import { ReceiptEntity } from '../shared/database/entities/receipt-entity';
import { Bus, GlobalActionType } from '../shared/bus';
import { PolishLanguage } from '../shared/utils/polish-language';
import { Receipts } from '../shared/utils/receipts';
import { ReceiptsFilters, ReceiptsFiltersModal } from './filters-modal/receipts-filters.modal';
import { CameraManager, ImageBlob } from '../shared/managers/camera.manager';
import { BackButtonManager } from '../shared/managers/back-button.manager';
import { Vibration } from '@ionic-native/vibration/ngx';
import { ApiLogger } from '../shared/api-logger';

export interface FixingResult {
	wasCanceled: boolean;
}

export interface ReceiptItem {
	itemId: string;
	localId: number;
	cloudId: string;
	createdAtUnixTimestamp: number;
	dateUnixTimestamp: number;
	isScanningFinished: boolean;
	wasScanningSuccessful: boolean;
	seller: string;
	totalAmount: number;
	productsTotalAmountSum: number;
	isSelected: boolean;
	products: ReceiptProductData[];
    isBeingDeleted: boolean;
    isBeingSwiped: boolean;
}

@Component({
  selector: 'app-receipts',
  templateUrl: 'receipts.page.html',
  styleUrls: ['receipts.page.scss']
})
export class ReceiptsPage implements AfterViewInit, OnInit, OnDestroy{

	public receipts: ReceiptItem[] = [];

	private _globalActionSubscription: Subscription;
	private _receiptsSubscription: Subscription;
    private _receiptsDeletedSubscription: Subscription;
	private _userLoggedInSubscription: Subscription;
	private _backButtonSubscription: Subscription;

	private _pageSize = 12;
	private _cursor: ReceiptForListEntityCursor = null;
	public isLoading = true;

	public filterFromUnixTimestamp: number;
	public filterToUnixTimestamp: number;
	public isCustomFiltersOn: boolean;

	public selectedMonth: Month = Month.current();
    public availableMonths: Month[] = [];
	
	public selectedCount: number = 0;
	public isDeleting: boolean;
	public isScrolling: boolean;

	public skeletons: number[];

	@ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;

  	constructor(
        private _database: DatabaseService,
        private _receiptsApi: ReceiptsApi,
        private _receiptsManager: ReceiptsManager,
        private _modalController: ModalController,
        private _toast: ToastController,
        private _networkGuard: NetworkGuard,
        private _deleteExpensesGuard: DeleteExpensesGuard,
        private _usersManager: UsersManager,
        private _bus: Bus,
        private _cameraManager: CameraManager,
        private _backButtonManager: BackButtonManager,
        private _vibration: Vibration,
        private _logger: ApiLogger) {}


	ngOnInit(): void {
		this._globalActionSubscription = this
			._bus
			.subscribeToExecuteGlobalActionCommand({
				next: async command => {
					try {
                        if(!command) return;
		
                        if(command.type === GlobalActionType.useCamera) {
                            await this.onCameraClick();
                        } else if(command.type === GlobalActionType.useGallery) {
                            await this.onGalleryClick();
                        }
                    } catch (error) {
                        this._logger.error("receipts.page.ts->subscribeToExecuteGlobalActionCommand()", error);
                    }
				}
			})
	
		this._receiptsSubscription = this._receiptsManager.subscribe({
			next: event => this.updateReceipt(event)
		});

        this._receiptsDeletedSubscription = this._receiptsManager.subscribeToDeleted({
			next: () => this.reloadAvailableMonths()
		});

        this._userLoggedInSubscription = this
            ._usersManager
            .userLoggedIn()
            .subscribe(() => {
                this.reloadInitialData();
            });
	}

	public ngOnDestroy(): void {
		this._globalActionSubscription.unsubscribe();
		this._receiptsSubscription.unsubscribe();
        this._userLoggedInSubscription.unsubscribe();
        this._receiptsDeletedSubscription.unsubscribe();

		//just in case, we will try to unsubscribe this one too		
		this._backButtonSubscription.unsubscribe();
	}

	private updateReceipt(event: IHaveLocalId) {
		if(this.receipts) {
			const receipt = this.receipts.find(r => r.localId == event.localId);
			if(receipt) Object.assign(receipt, event);
		}
	}

	public ngAfterViewInit(): void {
		this.reloadInitialData();	
	}

	ionViewWillEnter() {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton((locationBack) => {
				if(this.selectedCount) {
					this.unselectAll();
				} else {
                    locationBack();
				}
			});

		if(this.receipts && !this.receipts.length && !this.isLoading) {
			this.reloadAllReceipts();
		}
	}

	ionViewWillLeave() {		
		this._backButtonSubscription.unsubscribe();
	}

	public async onCameraClick(){
		await this._cameraManager.useCamera(
            () => this.initializeReceipt(),
            (receipt) => this.somethingWentWrongDuringScanning(receipt),
            (receipt, imageBlob) => this.recognizeReceipt(receipt, imageBlob)
        );
	}

	public async onGalleryClick(){
		await this._cameraManager.selectFromGallery(
            () => this.initializeReceipt(),
            (receipt) => this.somethingWentWrongDuringScanning(receipt),
            (receipt, imageBlob) => this.recognizeReceipt(receipt, imageBlob)
        );
	}


    private initializeReceipt(): ReceiptItem {
		const receipt: ReceiptItem = {
			itemId: Guid.create().toString(),
			isScanningFinished: false,
			wasScanningSuccessful: false,
			cloudId: null,
			createdAtUnixTimestamp: new Date().getTime(),
			dateUnixTimestamp: null,
			isSelected: false,
			localId: null,
			seller: null,
			totalAmount: null,
			productsTotalAmountSum: null,
			products: [],
            isBeingDeleted: false,
            isBeingSwiped: false
		};

        this.receipts.unshift(receipt);
        
        return receipt;
    }

	private async recognizeReceipt(receipt: ReceiptItem, imageBlob: ImageBlob) {
        try {
            const response = await this
                ._receiptsApi
                .recognizeReceipt(imageBlob);

            if(!this.wasReceiptDeleted(receipt)) {
                const localId = await this
                    ._receiptsManager
                    .addInitialReceipt(response.receiptCloudId);

                Object.assign(receipt, {
                    localId: localId,
                    cloudId: response.receiptCloudId,
                });

                this._receiptsManager.storeImageBlobInMemory(
                    response.receiptCloudId,
                    imageBlob);

                await this.startReceiptStatusCheck(receipt);
            }
        } catch (error) {
            this._logger.error("receipts.page.ts->recognizeReceipt()", error);
            throw error;           		
        }
	}

    private async somethingWentWrongDuringScanning(receipt: ReceiptItem) {
        if(receipt) {
            ArrayUtils.remove(this.receipts, receipt);
        }

        this._logger.somethingWentWrongToast(
            `Podczas skanowania paragonu coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
            2000
        );
    }

	private startReceiptStatusCheck(receipt: ReceiptItem) {
		return this
			._receiptsManager
			.recognizeReceipt(
				receipt, 
				(receipt) => this.wasReceiptDeletedById(receipt.localId),
				async (recognized, products) => {					
					receipt.wasScanningSuccessful = true;
					receipt.seller = recognized.seller;
					receipt.totalAmount = recognized.amount;
					receipt.dateUnixTimestamp = DateParser.Iso8061ToDateUnixTimestamp(recognized.date),
					receipt.products = products;

					if(Receipts.isReceiptCorrect(receipt)) {
						await this
							._receiptsManager
							.confirmReceipt(receipt)
							.finally(() => receipt.isScanningFinished = true)
					} else {
						receipt.isScanningFinished = true;
					}
				},
				() => {
					receipt.isScanningFinished = true;
					receipt.wasScanningSuccessful = false;
				})
				.catch(error => this._logger.error("receipts.page.ts->startReceiptStatusCheck()", error))
	}
	
	private wasReceiptDeleted(receipt: ReceiptItem) {
		const index = this.receipts.indexOf(receipt)
		if(index > -1) return false;
		return true;
	}

	private wasReceiptDeletedById(localId: number) {
		const receipts = this.receipts.filter(r => r.localId === localId);
		if(receipts.length) return false;
		return true;
	}

	public async openReceipt(receipt: ReceiptItem) {
		try {
			this.isLoading = true;

			if(!receipt.dateUnixTimestamp || !receipt.seller || !receipt.totalAmount) {
				const fixingResult = await this.fixMissingDetails(receipt);

				if(fixingResult.wasCanceled) {
					this.isLoading = false;
					return;
				}
			}
				
			if(Receipts.isReceiptCorrect(receipt)) {
				await this
					._receiptsManager
					.confirmReceipt(receipt);
			}

			this.isLoading = false;

			this._bus.sendShowReceiptCommand({
                receiptLocalId: receipt.localId
            });
		} catch(error) {
            this._logger.error("receipts.page.ts->openReceipt()", error);
            throw error;
		}		
	}

	private async fixMissingDetails(receipt: ReceiptItem): Promise<FixingResult> {
		const modal = await this
			._modalController
			.create({
				component: ReceiptDetailsModal,
				componentProps: { 
					receipt: receipt,
					missingDetailsMode: true
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

		if(result.data) {
			receipt.totalAmount = result.data.details.totalAmount;
			receipt.seller = result.data.details.seller;
			receipt.dateUnixTimestamp = result.data.details.dateUnixTimestamp;

			this._receiptsManager.updateDetails(
				receipt.localId, 
				receipt.seller, 
				receipt.totalAmount, 
				receipt.dateUnixTimestamp);

			return {
				wasCanceled: false
			};
		} 

		return {
			wasCanceled: true
		};
	}

	public loadData(event) {	
		return this
			.loadReceipts(this._cursor)
			.then(receipts => {
				this.pushReceipts(receipts, this.receipts);
				this.storeNewCursor(receipts);
				event.target.complete();
				
				// App logic to determine if all data is loaded
				// and disable the infinite scroll
				if (receipts.length < this._pageSize) {
					event.target.disabled = true;
				}
		});
	}

    private async reloadInitialData() {
        await this.reloadAvailableMonths();
        await this.reloadAllReceipts();
    }

    private async reloadAvailableMonths() {
        try {
            this.availableMonths = await this._database.getMonthsWithAtLeastOneReceipt();
        } catch (error) {
            this._logger.error("receipts.page.ts->reloadAllReceipts()", error);
            throw error;
        }
    }

	private reloadAllReceipts() {
		this.unselectAll();
		this._cursor = null;
		
		this.infiniteScroll.disabled = true;
		
        let howManyReceiptsPromise = this.isCustomFiltersOn
            ? this._database.howManyReceiptsExist(
                this.filterFromUnixTimestamp,
                this.filterToUnixTimestamp + OneDayMilliseconds)
            : this._database.howManyReceiptsExistForMonth(
                this.selectedMonth);

		return howManyReceiptsPromise.then(count => {
				if(count > 0) {

					this.skeletons = ArrayUtils.range(1, count);
					this.receipts = null;
					this.isLoading = true;

					return this
						.loadReceipts(this._cursor)
						.then(receipts => {
							const tempReceipts = [];						
							this.pushReceipts(receipts, tempReceipts);
							this.storeNewCursor(receipts);
							this.receipts = tempReceipts;
						});
				} else {
					this.skeletons = [];
					this.receipts = [];
				}
			})
			.catch(error => this._logger.error("receipts.page.ts->reloadAllReceipts()", error))
			.finally(() => {
				this.isLoading = false
				const shouldBeDisabled = this.receipts.length < this._pageSize;
				this.infiniteScroll.disabled = shouldBeDisabled;
			});	
	}

	private loadReceipts(cursor: ReceiptForListEntityCursor) {
        if(this.isCustomFiltersOn) {
            return this
                ._database
                .getReceiptsForList(
                    this._pageSize, 
                    cursor,
                    this.filterFromUnixTimestamp,
                    this.filterToUnixTimestamp + OneDayMilliseconds);	
        } else {
            return this
                ._database
                .getReceiptsForListForMonth(
                    this._pageSize, 
                    cursor,
                    this.selectedMonth);	
        }			
	}

	private pushReceipts(receipts: ReceiptEntity[], destination: ReceiptItem[]){
		for (let index = 0; index < receipts.length; index++) {
			const receipt = receipts[index];

			const receiptItem: ReceiptItem = {
				itemId: Guid.create().toString(),
				isSelected: false,

				localId: receipt.localId,
				cloudId: receipt.cloudId,
				isScanningFinished: receipt.isScanningFinished,
				wasScanningSuccessful: receipt.wasScanningSuccessful,
				createdAtUnixTimestamp: receipt.createdAtUnixTimestamp,
				totalAmount: receipt.totalAmount,
				productsTotalAmountSum: receipt.productsTotalAmountSum,
				dateUnixTimestamp: receipt.dateUnixTimestamp,
				seller: receipt.seller,
				products: receipt.products,
                isBeingDeleted: false,
                isBeingSwiped: false
			};

			destination.push(receiptItem);

			if(!receiptItem.isScanningFinished) {
				this.startReceiptStatusCheck(receiptItem);
			}
		}
	}

	private storeNewCursor(receipts: ReceiptEntity[]){
		if(receipts && receipts.length) {
			const lastReceipt = receipts[receipts.length - 1];
			this._cursor = {
				createdAtUnixTimestamp: lastReceipt.createdAtUnixTimestamp,
				localId: lastReceipt.localId
			};
		}		
	}

	public onSelectedMonthChange(month: Month) {
		this.selectedMonth = month;
		this.reloadAllReceipts();
	}

	public onSelectionChange() {
		this.selectedCount = this.getSelectedReceipts().length;
		
		this._bus.sendChangeTabVisibilityCommand({
			sourceView: 'receipts',
			isTabVisible: this.selectedCount === 0
		});
	}
	
	private getSelectedReceipts() {
		return this.receipts.filter(e => e.isSelected);
	}

	public clickReceipt(receipt: ReceiptItem) {
		if(this.selectedCount > 0){
			this.toggleReceiptSelection(receipt);
		} else if(receipt.isScanningFinished){ 
			this.openReceipt(receipt);
		}
	}

	public toggleReceiptSelection(receipt: ReceiptItem){
        this._vibration.vibrate(50);
		receipt.isSelected = !receipt.isSelected;
		this.onSelectionChange();
	}
	
	public unselectAll() {
		if(this.receipts) {
			this.receipts.forEach(r => r.isSelected = false);
			this.onSelectionChange();
		}		
	}

	public deleteReceipt(receipt: ReceiptItem) {
		return this.deleteReceipts([receipt]);
	}

	public deleteSelected() {
		const selected = this.getSelectedReceipts();
		return this.deleteReceipts(selected);
	}

	private async deleteReceipts(receipts: ReceiptItem[]) {
		await this._networkGuard.guardAsync(async () => {
			
			receipts.forEach(r => r.isBeingDeleted = true);

			this._deleteExpensesGuard.guard(receipts.length, async () => {
				this.isDeleting = true;

				try {
					await this._receiptsManager.bulkDelete(receipts);		
									
					receipts.forEach(r => ArrayUtils.remove(this.receipts, r))
				} catch (error) {
					this._logger.error("receipts.page.ts->deleteReceipts()", error);
				}	
				
				this.onSelectionChange();
				this.isDeleting = false;
			}, () => receipts.forEach(r => r.isBeingDeleted = false));
		});		
	}

	public trackReceiptBy(receipt: ReceiptItem) {
		if(!receipt) return null;
		return receipt.itemId;
	}

	public isReceiptConfirmed(receipt: ReceiptItem) {
		return receipt.seller 
			&& receipt.dateUnixTimestamp 
			&& receipt.totalAmount
			&& (!receipt.products || !receipt.products.length);
	}

	public shouldWarnAboutProductSum(receipt: ReceiptItem) {
		return Receipts.shouldWarnAboutSumDifferences(
			receipt.productsTotalAmountSum,
			receipt.totalAmount);
	}

	public whatNeedsToBeFixed(receipt: ReceiptItem) {
		let messages = [];
		
		const invalidProducts = Receipts
			.getInvalidProducts(receipt);

		if(invalidProducts.length) {
			const length = invalidProducts.length;

			messages.push(length + " " + PolishLanguage.plural("wydatek", "wydatki", "wydatków", length));
		}

		if(!receipt.seller) {
			messages.push("sprzedawca");
		}

		if(!receipt.dateUnixTimestamp){
			messages.push("data");
		}

		if(!receipt.totalAmount){
			messages.push("suma");
		}
		
		if(!Receipts.isReceiptSumValid(receipt) && !invalidProducts.length && receipt.totalAmount){
			messages.push("suma wydatków")
		}

		return "Do poprawy: " + messages.join(", ");
	}	

	public async onFiltersClick() {
		const modal = await this
			._modalController
			.create({
				component: ReceiptsFiltersModal,
				componentProps: {
					filters: this.getCurrentFilters(),
					defaultFilters: this.getDefaultFilters()
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

        if(result.data) {
            this.applyFilters(result.data);
        }
	}

	private getCurrentFilters(): ReceiptsFilters {
		if(this.isCustomFiltersOn) {
			return {
				fromUnixTimestamp: this.filterFromUnixTimestamp,
				toUnixTimestamp: this.filterToUnixTimestamp
			};
		} else {
			return this.getDefaultFilters();
		}
	}

	private getDefaultFilters(): ReceiptsFilters {
		return {
			fromUnixTimestamp: this.selectedMonth.startUnixTimestamp(),
			toUnixTimestamp: this.selectedMonth.lastDayUnixTimestamp()
		};
	}

	private applyFilters(filters: ReceiptsFilters){
		const isFullMonthResult = Month.isFullMonth(
			filters.fromUnixTimestamp,
			filters.toUnixTimestamp);

		if(isFullMonthResult.isFullMonth) {
			this.tryChangeFullMonthFilters(
				isFullMonthResult.month);
		} else {
			this.tryChangeCustomFilters(
				filters);
		}
	}

	private tryChangeFullMonthFilters(month: Month) {
		if(month.isEqualTo(this.selectedMonth)){
			if(this.isCustomFiltersOn){
				this.clearCustomFilters()
			}
		} else {
			this.tryChangeCustomFilters({
				fromUnixTimestamp: month.startUnixTimestamp(),
				toUnixTimestamp: month.lastDayUnixTimestamp()
			});
		}
	}

	private tryChangeCustomFilters(filters: ReceiptsFilters) {
		if(this.isCustomFiltersOn &&
			this.filterFromUnixTimestamp == filters.fromUnixTimestamp &&
			this.filterToUnixTimestamp == filters.toUnixTimestamp)
			return;

		this.isCustomFiltersOn = true;
		this.filterFromUnixTimestamp = filters.fromUnixTimestamp;
		this.filterToUnixTimestamp = filters.toUnixTimestamp;

		this.reloadAllReceipts();
	}

	public clearCustomFilters() {
		this.isCustomFiltersOn = false;
		this.reloadAllReceipts();
	}

	public onScrollStart() {
		this.isScrolling = true;
	}

	public onScrollEnd() {
		this.isScrolling = false;
	}
}
