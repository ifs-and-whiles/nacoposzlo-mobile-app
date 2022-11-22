import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Month } from 'src/app/shared/month';
import { DateParser } from 'src/app/shared/dateParser';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { NgForm } from '@angular/forms';

export interface ExpensesListFilter {
    isDateFilterOn: boolean;
    dateFilter: DateRangeFilter | null;

    selectedMonth: Month;

    isTagFilterOn: boolean;
    tagFilter: TagFilter;

    isNameFilterOn: boolean;
    nameFilter: string;

    isAmountFilterOn: boolean;
    fromAmount: number | null;
    toAmount: number | null;
}

export interface DateRangeFilter {
    fromUnixTimestamp: number;
    toUnixTimestamp: number;
}

export interface TagFilter {
    tagIds: string[];
}

@Component({
	selector: 'app-expenses-filters',
	templateUrl: 'expenses-filters.modal.html',
	styleUrls: ['expenses-filters.modal.scss']
})
export class ExpensesFiltersModal implements OnInit, OnDestroy {
    private _backButtonSubscription: Subscription;
        
	public monthNames = Month.fullNamesForLongDate();

    private _filters: ExpensesListFilter;

    @Input() set filters(value: ExpensesListFilter){
        this._filters = _.cloneDeep(value);

        //todo should store tagIds in dedicated modal field as all other values
        this._filters.isTagFilterOn = this._filters.tagFilter 
            && this._filters.tagFilter.tagIds
            && this._filters.tagFilter.tagIds.length > 0;

		this.fromDateValue = DateParser.formatLocalIso8061Date(value.dateFilter.fromUnixTimestamp);
		this.toDateValue = DateParser.formatLocalIso8061Date(value.dateFilter.toUnixTimestamp);

        this.name = this._filters.nameFilter;

        this.toAmount = this._filters.toAmount;
        this.fromAmount = this._filters.fromAmount;
    }

    get filters() {
        return this._filters;
    }

    public fromDateValue: string;
	public toDateValue: string;

    public name: string;

    public fromAmount: number;
    public toAmount: number;

    public isNameFocused: boolean;

    @ViewChild(NgForm) form: NgForm;

    constructor(
        private _modalController: ModalController,
        private _backButtonManager: BackButtonManager) {}

    ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

    public cancel() {
        this._modalController.dismiss();
    }

    public onFromDateChange() {
		const timestamp = DateParser.Iso8061ToDateUnixTimestamp(this.fromDateValue);
		this._filters.dateFilter.fromUnixTimestamp = timestamp;
	}
	
	public onToDateChange() {
		const timestamp = DateParser.Iso8061ToDateUnixTimestamp(this.toDateValue);
		this._filters.dateFilter.toUnixTimestamp = timestamp;
    }

    public onNameChange(){
        this._filters.nameFilter = this.name;
    }

    public onFromAmountChange(value: number) {
        this.fromAmount = value;
        this._filters.fromAmount = value;
    }

    public onToAmountChange(value: number) {
        this.toAmount = value;
        this._filters.toAmount = value;
    }
    
    public clear() {
        const currentMonth = Month.current();
        
        const clearFilter: ExpensesListFilter = { 
            isDateFilterOn: false,
            dateFilter: {
                fromUnixTimestamp: currentMonth.startUnixTimestamp(),
                toUnixTimestamp: currentMonth.lastDayUnixTimestamp()
            },
            selectedMonth: currentMonth,
            isTagFilterOn: false,
            tagFilter: {
                tagIds: []
            },
            isNameFilterOn: false,
            nameFilter: null,
            isAmountFilterOn: false,
            fromAmount: null,
            toAmount: null
        }

        this.name = null;
        this.fromDateValue = DateParser.formatLocalIso8061Date(clearFilter.dateFilter.fromUnixTimestamp);
		this.toDateValue = DateParser.formatLocalIso8061Date(clearFilter.dateFilter.toUnixTimestamp);
        this.fromAmount = null;
        this.toAmount = null;

        Object.assign(this._filters, clearFilter);
    }

    public canClear() {
        return this._filters.isDateFilterOn 
            || this._filters.isTagFilterOn
            || this._filters.isNameFilterOn
            || this._filters.isAmountFilterOn;
    }

    public filter() {
        this._filters.isTagFilterOn = this._filters.tagFilter 
            && this._filters.tagFilter.tagIds 
            && this._filters.tagFilter.tagIds.length > 0;

        this._filters.isNameFilterOn = this._filters.nameFilter != null
            && this._filters.nameFilter != "";

        this._filters.isAmountFilterOn = this._filters.fromAmount != null 
            || this._filters.toAmount != null;

        this._modalController.dismiss(this._filters);
    }

    public useNameSuggestion(suggestedName: string) {
        this.name = suggestedName;
        this._filters.nameFilter = this.name
    }

    public isInvalid() {
        if(this.form)
            return this.form.invalid;

        return true;
    }
}