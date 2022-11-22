import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DateParser } from '../../dateParser';
import { ModalController } from '@ionic/angular';
import { TagsModal } from '../tags-modal/tags.modal';
import { ControlUtils } from '../../utils/ng-model-utils';
import { maybe } from '../../utils/maybe';
import { TagsManager } from '../../managers/tags/tags.manager';
import { StringUtils } from '../../utils/string-utils';
import { Month } from '../../month';
import { formatMoney, parseMoney, tryFormatMoney, tryParseMoney } from '../../utils/money';
import { formatQuantity } from '../../utils/quantity';
import { ApiLogger } from '../../api-logger';

export interface ExpenseDetails {
    name: string;
    dateUnixTimestamp: number;
    amount: number;
    unitPrice: number;
    quantity: number;
    tags: string[];
    orderInReceipt: number | null;
    receiptLocalId: number | null;
}

@Component({
	selector: 'app-expense-details',
	templateUrl: 'expense-details.component.html',
	styleUrls: ['expense-details.component.scss']
})
export class ExpenseDetailsComponent{
    
    private _initialTimestamp: number;

    @Input() set details(value: ExpenseDetails) {
        this._initialTimestamp = (new Date()).getTime();

        this.orderInReceipt = value.orderInReceipt;
        this.receiptLocalId = value.receiptLocalId;

        this.name = value.name;
        this.amount = value.amount;
        this.unitPrice = value.unitPrice;

        this.date = DateParser.formatLocalIso8061Date(value.dateUnixTimestamp);
        this.quantity = maybe(value.quantity).map(x => x.toString());
        this.tags = value.tags ? value.tags.slice() : [];
    }

    @Input() hideDelete: boolean;
    @Input() hideCopy: boolean;
    @Input() canShowReceipt: boolean;

    @Output() detailsChange = new EventEmitter<ExpenseDetails>();
    @Output() delete = new EventEmitter();
    @Output() showReceipt = new EventEmitter();
    @Output() copy = new EventEmitter();

    @ViewChild(NgForm) form: NgForm;
    @ViewChild('nameInputCtrl') nameInput: any;
    @ViewChild('amountInputCtrl') amountInput: any;
    @ViewChild('quantityInputCtrl') quantityInput: any;
    @ViewChild('unitPriceInputCtrl') unitPriceInput: any;
    @ViewChild('dateInputCtrl') dateInput: any;


    private orderInReceipt: number;
    public receiptLocalId: number;

    public name: string;
    public date: string = null;
    public amount: number | null;
    public quantity: string;
    public unitPrice: number | null;
    public tags: string[];

    public isUnitPriceFocused: boolean = false;
    public isQuantityFocused: boolean = false;
    public isAmountFocused: boolean = false;
    public isNameFocused: boolean = false;

    private wereTagsClicked: boolean = false;

	public monthNames = Month.fullNamesForLongDate();
	public monthShortNames = Month.shortNames();    

    constructor(
        private _modalController: ModalController,
        private _tagsManager: TagsManager,
        private _logger: ApiLogger) { }

    public isInvalid() {
        return this.form.invalid;
    }

    public async onNameChange() {
        this.emitNewDetails();
    }

    public onDateChange(){
        //that is a hack to prevent initial onDateChange fire
        const now = (new Date()).getTime();
        if(now - this._initialTimestamp <= 500) {
            return;
        }

        this.emitNewDetails();
        
        setTimeout(() => {
            this.tryFocusNextEmpty(null);
        }, 700);
    }

    public onAmountChange(value: number | null) {
        if(value == null) return;
        this.amount = value;

        const quantity = StringUtils.asNumber(this.quantity);

        if(this.canAutoUpdateUnitPrice(value, quantity)) {
            this.unitPrice = parseMoney(formatMoney(value / quantity));
        }

        this.emitNewDetails();
    }

    public onQuantityChange() {
        if(this.amount == null) return;

        const quantity = StringUtils.asNumber(this.quantity);
        
        if(this.canAutoUpdateUnitPrice(this.amount, quantity)) {
            this.unitPrice = parseMoney(formatMoney(this.amount / quantity));
        }

        this.emitNewDetails();
    }

    public onUnitPriceChange(value: number | null) {
        if(this.amount == null) return;
        if(value == null) return;

        if(this.canAutoUpdateQuantity(this.amount, value)) {
            this.quantity = formatQuantity(this.amount / value);
        }

        this.emitNewDetails();
    }
    
    private canAutoUpdateUnitPrice(amount: number, quantity: number) {
        return amount != null && quantity && !this.isUnitPriceFocused && this.isAnyControlFocused()
    }

    private canAutoUpdateQuantity(amount: number, unitPrice: number) {
        return amount != null && unitPrice && !this.isQuantityFocused && !this.isAmountFocused && this.isAnyControlFocused()
    }

    private isAnyControlFocused() {
        return this.isQuantityFocused || this.isAmountFocused || this.isUnitPriceFocused;
    }

    public touch() {
        Object.values(this.form.controls).forEach(control => ControlUtils.touchIfInvalid(control));
    }

    public reset() {
        Object.values(this.form.controls).forEach(control => ControlUtils.markAsUntouched(control));
        this.wereTagsClicked = false;
    }

    public async modifyTags() {
        this.wereTagsClicked = true;

		const modal = await this
			._modalController
			.create({
				component: TagsModal,
				componentProps: {
					selectedExpensesCount: 1,
					tagIds: this.tags
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

		if(result.data) {
            this.tags = result.data.tags.slice();
            this.emitNewDetails();
		}
    }
    
    private emitNewDetails() {
        this.detailsChange.emit({
            amount: this.amount,
            dateUnixTimestamp: DateParser.Iso8061ToDateUnixTimestamp(this.date),
            name: this.name,
            orderInReceipt: this.orderInReceipt,
            quantity: maybe(this.quantity).map(x => StringUtils.parseNumber(x)),
            tags: this.tags.slice(),
            unitPrice: this.unitPrice,
            receiptLocalId: this.receiptLocalId
        })
    }    

    public trySuggestTags(){
        if(!this.name || this.wereTagsClicked || (this.tags && this.tags.length)) return;
        
        const tags = this._tagsManager.getTagSuggestions(this.name);

        if(tags) {
            this.tags = tags;
            this.emitNewDetails();
        }
    }

    public onDelete() {
        this.delete.emit()      
    }

    public onShowReceipt() {
        this.showReceipt.emit();
    }

    public onAmountBlur() {
        this.isAmountFocused = false;
    }

    public onUnitPriceBlur() {
        this.isUnitPriceFocused = false;
    } 

    public onCopy() {   
        this.copy.emit();
    }

    public onNameBlur() {
        this.isNameFocused = false;
        this.trySuggestTags();
    }

    public useSuggestion(suggestedName: string) {
        this.name = suggestedName;

        setTimeout(() => {
            this.tryFocusNextEmpty('name');
        });
    }

    public async tryFocusNextEmpty(skip) {
        try {
            if(!this.isNameFocused && skip != 'name') {
                await this.nameInput.setFocus();
            } else if(!this.isAmountFocused) {
                await this.amountInput.setFocus();
            } else if(!this.isQuantityFocused) {
                await this.quantityInput.setFocus();
            } else if(!this.isUnitPriceFocused) {
                await this.unitPriceInput.setFocus();
            }
        } catch (error) {
            this._logger.error("expense-details.component.ts->tryFocusNextEmpty()", error)
        }     
    }
}

