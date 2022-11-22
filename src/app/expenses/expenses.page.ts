import { Component, ViewChild, OnDestroy, AfterViewInit, OnInit} from '@angular/core';
import { faGrinTongueSquint, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { AlertController, IonInfiniteScroll, ModalController } from '@ionic/angular';
import { Guid } from "guid-typescript";
import { Month } from '../shared/month';
import { ExpenseListComponent, ExpenseItem } from '../shared/components/expense-list/expense-list.component';
import { ExpensesManager, ExpensesChange } from '../shared/managers/expenses.manager';
import { Subscription } from 'rxjs';
import { faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { ExpensesFiltersModal, ExpensesListFilter } from './filters-modal/expenses-filters.modal';
import * as _ from "lodash";
import { ArrayUtils } from '../shared/utils/array-utils';
import { noCategoryTag } from '../shared/utils/no-category-tag';
import { ExpenseEntityCursor } from '../shared/database/entities/expense-entity-cursor';
import { DatabaseService } from '../shared/database/database.injectable';
import { ExpenseEntity } from '../shared/database/entities/expense-entity';
import { Bus } from '../shared/bus';
import { BackButtonManager } from '../shared/managers/back-button.manager';
import { ExcelManager } from '../shared/managers/excel.manager';
import { OneDayMilliseconds } from '../shared/dateParser';
import { UsersManager } from '../shared/managers/users.manager';
import { KeyboardManager } from '../shared/managers/keyboard.manager';
import { ApiLogger } from '../shared/api-logger';

interface ExpenseFilters {
    selectedMonth: Month | null;
    isDateFilterOn: boolean;
	fromUnixTimestamp: number | null;
	toUnixTimestamp: number | null;
	tagIds: string[];
    name: string;
    fromAmount: number | null;
    toAmount: number | null;
};

@Component({
  selector: 'app-expenses',
  templateUrl: 'expenses.page.html',
  styleUrls: ['expenses.page.scss']
})
export class ExpensesPage implements OnInit, OnDestroy {
	faFileExcel = faFileExcel;

    public allFilteredExpensesCount: number;
    public allFilteredExpensesAmountSum: number;

	public expenseIcon = faMoneyBillWave;
	public expenses: ExpenseItem[] = [];
	private _pageSize = 20;
	private _cursor: ExpenseEntityCursor;
	public isLoading = false;
	public showEmptyScreen = false;
	public showExpenseList = false;
	public isScrolling: boolean;

	public selectedCount: number = 0;
	
	private _expensesSubscription: Subscription;
	private _globalRoutingSubscription: Subscription;
	private _backButtonSubscription: Subscription;
	private _userLoggedInSubscription: Subscription;
	private _keyboardSubscription: Subscription;

	private _isComponentActive: boolean;
	public skeletonCount: number;
    public isKeyboardVisible: boolean;

	public filters: ExpensesListFilter = {
		isDateFilterOn: false,
		dateFilter: {
			fromUnixTimestamp: Month.current().startUnixTimestamp(),
			toUnixTimestamp: Month.current().lastDayUnixTimestamp()
		},
		selectedMonth: Month.current(),
		isTagFilterOn: false,
		tagFilter: {
			tagIds: [],
		},
        isNameFilterOn: false,
        nameFilter: null,
        isAmountFilterOn: false,
        fromAmount: null,
        toAmount: null
	}

    public availableMonths: Month[] = [];

	@ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
	@ViewChild(ExpenseListComponent) expenseList: ExpenseListComponent;

  	constructor(
		  private _database: DatabaseService,
		  private _expensesManager: ExpensesManager,
		  private _modalController: ModalController,
		  private _bus: Bus,
		  private _backButtonManager: BackButtonManager,
		  private _excelManager: ExcelManager,
		  private _alertController: AlertController,
          private _usersManager: UsersManager,
          private _keyboardManager: KeyboardManager,
          private _logger: ApiLogger) {}
    
    ngOnInit(): void {
        this._expensesSubscription = this
			._expensesManager
			.subscribe({
				next: (change) => this.applyExpensesChange(change)
			});

		this._globalRoutingSubscription = this
			._bus
			.subscribeToShowFilteredExpensesCommand({
				next: (command) => {
					if(!command) return;

					this.applyFiltersChange({
						dateFilter: command.dateFilter,
						isDateFilterOn: command.isDateFilterOn,
						isTagFilterOn: command.isTagFilterOn,
						selectedMonth: command.selectedMonth,
						tagFilter: command.tagFilter,
                        isNameFilterOn: false,
                        nameFilter: null,
                        isAmountFilterOn: false,
                        fromAmount: null,
                        toAmount: null
					});
				}
			});

        this._userLoggedInSubscription = this
            ._usersManager
            .userLoggedIn()
            .subscribe(() =>  this.reloadInitialData());		

        this._keyboardSubscription = this
            ._keyboardManager
            .onKeyboardStateChange()
            .subscribe({
                next: state => this.isKeyboardVisible = state.isVisible
            });
        
        this.reloadInitialData();
    }

	ionViewWillEnter()	{
		this.subscribeBackButton();
		this._isComponentActive = true;
	}

	ionViewWillLeave() {
		this.tryUnsubscribeBackButton();
		this._isComponentActive = false;
	}

	ngOnDestroy(): void {
		this._expensesSubscription.unsubscribe();
		this._globalRoutingSubscription.unsubscribe();
        this._userLoggedInSubscription.unsubscribe();
        this._keyboardSubscription.unsubscribe();

		this.tryUnsubscribeBackButton();
	}

	private subscribeBackButton() {
		this.tryUnsubscribeBackButton();

		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton((locationBack) => {
				if(this.selectedCount) {
					this.unselectAll();
				} else {
					locationBack();
				}
			});
	}

	private tryUnsubscribeBackButton() {
		if(this._backButtonSubscription) {
			this._backButtonSubscription.unsubscribe();
			this._backButtonSubscription = null;
		}
	}

	private applyExpensesChange(change: ExpensesChange) {
		if(change && change.created) {
			change
				.created
				.filter(expense => this.doesMatchCurrentFilter(expense))
				.forEach(expense => this.unshiftExpenses([expense], this.expenses))
		}

		if(change && change.updated) {
			change.updated.forEach(updated => {
				const original = this.expenses.find(e => e.localId == updated.localId);

				if (original) {
					Object.assign(original, updated);

					if(!this.doesMatchCurrentFilter(original)){
						ArrayUtils.remove(this.expenses, original);						
					}
				} else if (this.doesMatchCurrentFilter(updated)) {
					this.unshiftExpenses([updated], this.expenses)
				}
			});
		}

		if(change && change.deleted) {
			change.deleted.forEach(deleted => 
				ArrayUtils.removeFirst(this.expenses, e => e.localId === deleted.localId)
			);
		}

        if(change) {
            this.reloadAvailableMonths();
            this.reloadExpensesSummary()
        }

		if (this.expenseList) {
			this.expenseList.onSelectionChange();
		}		

		this.showExpenseList = this.expenses && this.expenses.length > 0;
		this.showEmptyScreen = !this.showExpenseList;
	}

	private applyFiltersChange(filters: ExpensesListFilter) {
		if(filters) {
			const originalFilters = _.cloneDeep(this.filters);
			this.filters = filters;
			this.reloadOnFiltersChange(originalFilters, this.filters);
		}
	}

	public loadData(event) {
		return this
			.loadExpenses(this._cursor)
			.then(expenses => {
				this.pushExpenses(expenses, this.expenses);
				this.storeNewCursor(expenses);
				event.target.complete();
				
				// App logic to determine if all data is loaded
				// and disable the infinite scroll
				if (expenses.length < this._pageSize) {
					event.target.disabled = true;
				}
		});
	}

    private async reloadInitialData() {
        await this.reloadAllExpenses(),
        await this.reloadAvailableMonths()
    }

    private reloadAvailableMonths() {
        return this
            ._database
            .getMonthsWithAtLeastOneExpense()
            .then(availableMonths => {
                this.availableMonths = availableMonths;
            });
    }

    private async reloadExpensesSummary() {        
		const filters = this.getCurrentFilters();

        let summary = filters.isDateFilterOn 
            ? await this._database.howManyExpensesExist(
                filters.fromUnixTimestamp,
                filters.toUnixTimestamp, 
                filters.tagIds,
                filters.name,
                filters.fromAmount,
                filters.toAmount)
            : await this._database.howManyExpensesExistForMonth(
                filters.selectedMonth,
                filters.tagIds,
                filters.name,
                filters.fromAmount,
                filters.toAmount);

        this.allFilteredExpensesAmountSum = summary.amountSum;
        this.allFilteredExpensesCount = summary.count;

        return summary;
    }

	private reloadAllExpenses() {		
		this._cursor = null;

        this.trySetInfiniteScrollIsDisabled(true);		

        return this
            .reloadExpensesSummary()
            .then(howMany => {
                if(howMany.count) {					
					this.showEmptyScreen = false;
					this.showExpenseList = true;

					this.isLoading = true;

					if(howMany.count > 5){
						this.skeletonCount = Math.min(howMany.count, 6);
					}
					
					return this
						.loadExpenses(this._cursor)
						.then(expenses => {
							const tempExpenses = [];						
							this.pushExpenses(expenses, tempExpenses);
							this.storeNewCursor(expenses);
							this.expenses = tempExpenses;
							this.skeletonCount = 0;
						});
				} else {					
					this.expenses = [];

					this.showEmptyScreen = true;
					this.showExpenseList = false;
				}
			})
			.catch(error => this._logger.error("expenses.page.ts->reloadAllExpenses()", error))
			.finally(() => {		
				this.isLoading = false;
				
                this.trySetInfiniteScrollIsDisabled(
                    this.expenses.length < this._pageSize
                );
			});				
    }
    
    private trySetInfiniteScrollIsDisabled(isDisabled: boolean) {
        if(this.infiniteScroll)
            this.infiniteScroll.disabled = isDisabled;
    }

	private loadExpenses(cursor: ExpenseEntityCursor) {
		const filters = this.getCurrentFilters();

        if(filters.isDateFilterOn) {           
            return this
                ._database
                .getExpenses(
                    this._pageSize, 
                    cursor, 
                    filters.fromUnixTimestamp, 
                    filters.toUnixTimestamp, 
                    filters.tagIds,
                    filters.name,
                    filters.fromAmount,
                    filters.toAmount);
        } else {
            return this
            ._database
            .getExpensesForMonth(
                this._pageSize, 
                cursor, 
                filters.selectedMonth,
                filters.tagIds,
                filters.name,
                filters.fromAmount,
                filters.toAmount); 	
        }
	}

	private getCurrentFilters(): ExpenseFilters {
		return {
            selectedMonth: this.filters.selectedMonth,
            isDateFilterOn: this.filters.isDateFilterOn,
			fromUnixTimestamp: this.filters.isDateFilterOn ? this.filters.dateFilter.fromUnixTimestamp : null,
			toUnixTimestamp: this.filters.isDateFilterOn ? this.filters.dateFilter.toUnixTimestamp : null,
			tagIds: this.filters.isTagFilterOn ? this.filters.tagFilter.tagIds : null,
            name: this.filters.isNameFilterOn ? this.filters.nameFilter : null,
            fromAmount: this.filters.isAmountFilterOn ? this.filters.fromAmount : null,
            toAmount: this.filters.isAmountFilterOn ? this.filters.toAmount : null
		}
	}

	private doesMatchCurrentFilter(expense: ExpenseEntity) {
		const isDateFilterMatched = this.doesMatchCurrentDateFilter(expense);
		const isTagFilterMatched = this.doesMatchCurrentTagFilter(expense);
        const isNameFilterMatched = this.doesMatchCurrentNameFilter(expense);

		return isDateFilterMatched && isTagFilterMatched && isNameFilterMatched;
	}

	private doesMatchCurrentDateFilter(expense: ExpenseEntity) {
		if(this.filters.isDateFilterOn) {
			return expense.dateUnixTimestamp >= this.filters.dateFilter.fromUnixTimestamp 
				&& expense.dateUnixTimestamp < this.filters.dateFilter.toUnixTimestamp  + OneDayMilliseconds;
		} else {
			return expense.dateUnixTimestamp >= this.filters.selectedMonth.startUnixTimestamp()
				&& expense.dateUnixTimestamp < this.filters.selectedMonth.next().startUnixTimestamp();
		}	
	}

	private doesMatchCurrentTagFilter(expense: ExpenseEntity) {
		if(this.filters.isTagFilterOn) {
			if(this.filters.tagFilter.tagIds.includes(noCategoryTag)) {
				return expense.tags.length == 0;
			}

			return ArrayUtils.doesContainSubArray(
				expense.tags, 
				this.filters.tagFilter.tagIds,
				(a, b) => a === b)
		} 
		
		return true;
	}

    private doesMatchCurrentNameFilter(expense: ExpenseEntity) {
		if(this.filters.isNameFilterOn) {
			return expense.name.indexOf(
                this.filters.nameFilter) > -1;
		} 
		
		return true;
	}

	private unshiftExpenses(expenses: ExpenseEntity[], destination: ExpenseItem[]){
		for (let index = 0; index < expenses.length; index++) {
			const item = this.prepareExpenseItem(expenses[index]);
			destination.unshift(item);
		}
	}

	private pushExpenses(expenses: ExpenseEntity[], destination: ExpenseItem[]){
		for (let index = 0; index < expenses.length; index++) {
			const item = this.prepareExpenseItem(expenses[index]);
			destination.push(item);
		}
	}

	private prepareExpenseItem(expense: ExpenseEntity) {
		const item: ExpenseItem = {
			itemId: Guid.create().toString(),
			localId: expense.localId,
			cloudId: expense.cloudId,
			amount: expense.amount,
			dateUnixTimestamp: expense.dateUnixTimestamp,
            isBeingDeleted: false,
            isBeingSwiped: false,
			isDeleted: false,
			isSelected: false,
			name: expense.name,
			tags: expense.tags,
			quantity: expense.quantity,
			unitPrice: expense.unitPrice,
			orderInReceipt: expense.orderInReceipt,
			receiptLocalId: expense.receiptLocalId,
			boundingBox: null
		};

		return item;
	}

	private storeNewCursor(receipts: ExpenseEntity[]){
		if(receipts && receipts.length) {
			const lastExpense = receipts[receipts.length - 1];
			this._cursor = {
				dateUnixTimestamp: lastExpense.dateUnixTimestamp,
				localId: lastExpense.localId
			};
		}		
	}

	public onSelectedMonthChange(month: Month) {
		this.filters.selectedMonth = month;
		this.filters.isDateFilterOn = false;
		
		this.filters.dateFilter = {
			fromUnixTimestamp: this.filters.selectedMonth.startUnixTimestamp(),
			toUnixTimestamp: this.filters.selectedMonth.lastDayUnixTimestamp()
		};

		this.reloadAllExpenses();
	}

	public clearCustomRange() {
        const currentMonth = Month.current();

		this.filters.isDateFilterOn = false;

        this.filters.dateFilter = {
            fromUnixTimestamp: currentMonth.startUnixTimestamp(),
            toUnixTimestamp: currentMonth.lastDayUnixTimestamp()
        };

		this.reloadAllExpenses();
	}

	public unselectAll() {
		this.expenseList.unselectAll();
	}

	public async deleteSelected() {
		this.expenseList.deleteSelected();
	}

	public modifyTags() {
		this.expenseList.modifyTags();
	}

	public editSelected() {
		this.expenseList.editSelected();
	}

	public onSelectionChange(count) {
		this.selectedCount = count;

		this._bus.sendChangeTabVisibilityCommand({
			sourceView: 'expenses',
			isTabVisible: this.selectedCount === 0
		});
	}

	public async showFilters() {
		const originalFilters = _.cloneDeep(this.filters);

		const modal = await this
			._modalController
			.create({
				component: ExpensesFiltersModal,
				componentProps: { 
					filters: this.filters
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

        if(result.data) {
            this.filters = result.data;
		    this.reloadOnFiltersChange(originalFilters, this.filters);
        }
	}

	private reloadOnFiltersChange(oldFilters: ExpensesListFilter, newFilters: ExpensesListFilter) {
		const originalFiltersJson = JSON.stringify(oldFilters);		
		const newFiltersJson = JSON.stringify(newFilters);

		if(originalFiltersJson !== newFiltersJson){
			this.showEmptyScreen = false;
			this.reloadAllExpenses();
		}
	}

	public areFiltersOn(){
		if(!this.filters)
			return false;

		return this.filters.isDateFilterOn 
			|| (this.filters.isTagFilterOn && this.filters.tagFilter.tagIds.length)
            || (this.filters.isNameFilterOn && this.filters.nameFilter);
	}

	public onFilterTagRemove() {
        this.filters.isTagFilterOn = this.filters.tagFilter 
            && this.filters.tagFilter.tagIds
            && this.filters.tagFilter.tagIds.length > 0;

		this.reloadAllExpenses();
	}

	public onScrollStart() {
		this.isScrolling = true;
	}

	public onScrollEnd() {
		this.isScrolling = false;
	}

	public async exportExpenses() {
		const problemAlert = await this._alertController.create({
			header:  "Eksport do Excel'a",
			message: "Czy na pewno chcesz wyeksportować listę wydatków z wybranego zakresu?",
			buttons: [{
                text: 'Anuluj',
                role: 'cancel',
                cssClass: 'text-medium',
            }, {
                text: 'Eksportuj',
                cssClass: 'text-success',
                handler: () => this.getExpensesAndCreateExcel()
            }]
		});
	  
		await problemAlert.present();
	}

	private getExpensesAndCreateExcel() {
		this.isLoading = true;

		const filters = this.getCurrentFilters();

        const fromUnixTimestamp = filters.isDateFilterOn
            ? filters.fromUnixTimestamp
            : filters.selectedMonth.startUnixTimestamp();

        const toUnixTimestamp = filters.isDateFilterOn
            ? filters.fromUnixTimestamp
            : filters.selectedMonth.next().startUnixTimestamp();

		this._database
			.getExpensesToExport(
				fromUnixTimestamp,
				toUnixTimestamp,
				filters.tagIds,
                filters.name,
                filters.fromAmount,
                filters.toAmount)
			.then(expenses => this._excelManager.exportExpensesPl(expenses))
			.finally(() => this.isLoading = false);
	}

    public clearTagFilter() {
        this.filters.isTagFilterOn = false;
        this.filters.tagFilter = {
            tagIds: []
        };
        
		this.reloadAllExpenses();
    }

    public clearNameFilter() {
        this.filters.isNameFilterOn = false;
        this.filters.nameFilter = null;
        
		this.reloadAllExpenses();
    }

    public clearAmountFilter() {
        this.filters.isAmountFilterOn = false;
        this.filters.fromAmount = null;
        this.filters.toAmount = null;
        
		this.reloadAllExpenses();
    }

    public onNameFilterChange() {
        this.reloadAllExpenses();
    }
}
