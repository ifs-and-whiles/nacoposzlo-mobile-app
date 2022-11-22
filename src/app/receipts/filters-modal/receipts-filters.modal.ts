import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Month } from 'src/app/shared/month';
import { DateParser } from 'src/app/shared/dateParser';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import { Subscription } from 'rxjs';

export interface ReceiptsFilters {
	fromUnixTimestamp: number;
	toUnixTimestamp: number;
}

@Component({
	selector: 'app-receipts-filters',
	templateUrl: 'receipts-filters.modal.html',
	styleUrls: ['receipts-filters.modal.scss']
})
export class ReceiptsFiltersModal implements OnInit, OnDestroy{

	private _backButtonSubscription: Subscription;
	
	@Input() defaultFilters: ReceiptsFilters;

	@Input() set filters(value: ReceiptsFilters) {
		this.setDates(value);
	}

	constructor(
		private _modalController: ModalController,
		private _backButtonManager: BackButtonManager) {}

	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel())
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public fromDateValue: string;
	public toDateValue: string;
	public monthNames = Month.fullNamesForLongDate();
	public monthShortNames = Month.shortNames();

	public cancel() {	
		this._modalController.dismiss();
	}

	public clear() {
		this.setDates(this.defaultFilters);
	}

	public canClear() {
		return DateParser.Iso8061ToDateUnixTimestamp(this.fromDateValue) != this.defaultFilters.fromUnixTimestamp
			|| DateParser.Iso8061ToDateUnixTimestamp(this.toDateValue) != this.defaultFilters.toUnixTimestamp;
	}

	private setDates(filters: ReceiptsFilters) {
		this.fromDateValue = DateParser.formatLocalIso8061Date(filters.fromUnixTimestamp);
		this.toDateValue = DateParser.formatLocalIso8061Date(filters.toUnixTimestamp);
    }
    
    public filter() {
        this._modalController.dismiss({
			fromUnixTimestamp: DateParser.Iso8061ToDateUnixTimestamp(this.fromDateValue),
			toUnixTimestamp: DateParser.Iso8061ToDateUnixTimestamp(this.toDateValue)
		});
    }
}