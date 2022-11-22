import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonFab, ModalController } from '@ionic/angular';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { SingleExpenseModal } from '../shared/components/single-expense-modal/single-expense.modal';
import { ExpensesManager, ExpenseToCreate } from '../shared/managers/expenses.manager';
import { Guid } from 'guid-typescript';
import { DateParser } from '../shared/dateParser';
import { NetworkGuard } from '../shared/utils/network.guard';
import { ReceiptsManager } from '../shared/managers/receipts.manager';
import { UsersManager } from '../shared/managers/users.manager';
import { KeyboardManager } from '../shared/managers/keyboard.manager';
import { Bus, GlobalActionType } from '../shared/bus';
import { GlobalActionsManager } from '../shared/managers/global-actions.manager';
import { TagsManager } from '../shared/managers/tags/tags.manager';
import { ExpenseDetails } from '../shared/components/expense-details/expense-details.component';
import { ApiLogger } from '../shared/api-logger';

@Component({
	selector: 'app-tabs',
	templateUrl: 'tabs.page.html',
	styleUrls: ['tabs.page.scss'],
	animations: [
		trigger('shadowOverlayVisibilityChanged', [
		  state('shown', style({ opacity: 0.3 })),
		  state('hidden', style({ opacity: 0})),	
		  transition('* => *', animate('200ms'))
		])
	  ],
})
export class TabsPage implements OnInit, OnDestroy {
	public showTabBar: boolean = true;
	
	public isKeyboardVisible: boolean;

	public scansLeft: number;
	public isInfiniteScanningAllowed: boolean;
	public currentTab: string;

	private _tabVisibilitySubjectSubscription: Subscription;
	private _keyboardStateSubscription: Subscription;

	@ViewChild(IonFab) actionsFab: IonFab;

	constructor(
		private _router: Router,
		private _keyboard: KeyboardManager,
		private _modalController: ModalController,
		private _expensesManager: ExpensesManager,
		private _receiptsManager: ReceiptsManager,
		private _networkGuard: NetworkGuard,
		private _usersManager: UsersManager,
		private _bus: Bus,
        private _tagsManager: TagsManager,
		public globalActionsManager: GlobalActionsManager,
        private _logger: ApiLogger) {
	}

	ngOnInit(): void {
		this._keyboardStateSubscription = this._keyboard
			.onKeyboardStateChange()
			.subscribe({
				next: state => this.isKeyboardVisible = state.isVisible
			});

		this._tabVisibilitySubjectSubscription = this
			._bus
			.subscribeToChangeTabVisibilityCommand({
				next: command => {
					if(command.sourceView === this.currentTab) 
						this.showTabBar = command.isTabVisible;
				}
			});

		this.globalActionsManager
			.initialize(() => this.actionsFab);

        this._tagsManager.initialize();

        this.updateUserLimits();
	}

	ngOnDestroy(): void {
		this._tabVisibilitySubjectSubscription.unsubscribe();
		this._keyboardStateSubscription.unsubscribe();
	}

	onShowActionsClick() {
		this.globalActionsManager
			.toggleVisibility();

		if(this.globalActionsManager.areActionsShown) {
			this.refreshUserDetails();
		}		
	}

	private async refreshUserDetails() {
		await this._networkGuard.runIfOnlineAsync(
            () => this.updateUserLimits());		
	}

    private async updateUserLimits() {
        try {
            const userDetails = await this
                ._usersManager
                .updateUserLimits();

            if(userDetails.limits) {
                if(userDetails.limits.currentPackageLimit == -1) {
                    this.scansLeft = 0;
                    this.isInfiniteScanningAllowed = true;
                } else {
                    this.scansLeft = userDetails.limits.currentPackageLimit - userDetails.limits.currentPackageCounter;
                    this.isInfiniteScanningAllowed = false;
                }
            } else {
                this.scansLeft = 0;
                this.isInfiniteScanningAllowed = false;
            }
        } catch (error) {            
            this._logger.error("tabs.page.ts->refreshUserDetails()", error);
            throw error;
        }
    }

	public onTabChange(event){
		this.showTabBar = true;
		this.currentTab = event.tab;
		this.globalActionsManager.hideIfVisible();		
	}

	public async onCameraClick() {
        await this.scanImage(GlobalActionType.useCamera);
	}

	public async onGalleryClick(){
        await this.scanImage(GlobalActionType.useGallery);
	}

    private async scanImage(actionType: GlobalActionType) {
        try {
            this.globalActionsManager.areActionsShown = false;	

            if(this.anyScansLeft()) {
                await this._networkGuard.guardAsync(async () => {
                    await this._router.navigate(['tabs/receipts/']);

                    this._bus.sendExecuteGlobalActionCommand({
                        type: actionType
                    });
                });
            } else {
                await this._router.navigate(['tabs/more/']);
            }
        } catch (error) {  
            this._logger.error("tabs.page.ts->scanImage()", error);    
        }
    }

	private anyScansLeft() {
		return this.scansLeft > 0 || this.isInfiniteScanningAllowed;
	}

	public onExpenseClick() {
		this.globalActionsManager.areActionsShown = false;

		return this._networkGuard.guard(() => {
			this._bus.sendExecuteGlobalActionCommand({
				type: GlobalActionType.addExpense
			});
	
			this.createExpense();
		});		
	}

	public onOverlayClick() {
		this.globalActionsManager.hideIfVisible();
	}

	private async createExpense() {
		const modal = await this
			._modalController
			.create({
				component: SingleExpenseModal,
				componentProps: {
                    isAddingNewExpense: true,
                    addNewExpenseFunc: (expense: ExpenseDetails) => this.addNewExpense(expense),
					expenseDetails: {
                        amount: null,
                        dateUnixTimestamp: DateParser.todayUnixTimestamp(),
                        name: null,
                        quantity: null,
                        unitPrice: null,
                        tags: [],
                        orderInReceipt: null		    
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

        await this
            ._expensesManager
            .bulkCreate([toCreate], null, null, this._receiptsManager, false);
    }
}
