import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Month } from 'src/app/shared/month';
import { DateParser } from 'src/app/shared/dateParser';
import { Subscription } from 'rxjs';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import * as _ from 'lodash';

export interface ComparisonChartFilters {
	from: Month;
	to: Month;
}

export const getDefaultComparisonChartFilters = () => ({
	from: Month.current().previousYear(),
	to: Month.current()
});

@Component({
	selector: 'app-comparison-chart-filters',
	templateUrl: 'comparison-chart-filters.modal.html',
	styleUrls: ['comparison-chart-filters.modal.scss']
})
export class ComparisonChartFiltersModal implements OnInit, OnDestroy {
	private _backButtonSubscription: Subscription;
	private _filters: ComparisonChartFilters;

	@Input() set filters(value: ComparisonChartFilters) {
		this._filters = _.cloneDeep(value);
		this.updateDatePickers();
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
	public monthNames = Month.fullNames();
	public monthShortNames = Month.shortNames();

	public cancel() {	
		this._modalController.dismiss();
	}

	public onFromDateChange() {
		const timestamp = DateParser.Iso8061ToDateUnixTimestamp(this.fromDateValue);
		this._filters.from = Month.of(timestamp);
	}
	
	public onToDateChange() {
		const timestamp = DateParser.Iso8061ToDateUnixTimestamp(this.toDateValue);
		this._filters.to = Month.of(timestamp);
	}

	public clear() {
		const defaultFilters = getDefaultComparisonChartFilters();

		this._filters.from =  defaultFilters.from;
		this._filters.to =  defaultFilters.to;

		this.updateDatePickers();
	}

	public canClear() {
		const defaultFilters = getDefaultComparisonChartFilters();

		return defaultFilters.from.startUnixTimestamp() != DateParser.Iso8061ToDateUnixTimestamp(this.fromDateValue)
			|| defaultFilters.to.startUnixTimestamp() != DateParser.Iso8061ToDateUnixTimestamp(this.toDateValue);
	}

	private updateDatePickers() {		
		this.fromDateValue = DateParser.formatLocalIso8061Date(
			this._filters.from.startUnixTimestamp());

		this.toDateValue = DateParser.formatLocalIso8061Date(
			this._filters.to.startUnixTimestamp());
    }
    
    public filter() {	
		this._modalController.dismiss(
            this._filters
        );
	}
}