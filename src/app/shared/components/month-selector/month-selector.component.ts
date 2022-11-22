import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Month } from '../../month';
import { PreviousAndNextMonths } from './previous-and-next-months';

@Component({
	selector: 'app-month-selector',
	templateUrl: 'month-selector.component.html',
	styleUrls: ['month-selector.component.scss'],
})
export class MonthSelectorComponent {

    @Input() set month(value: Month) {
        this.selectedMonth = value;
        this.tryEvaluatePreviousAndNextMonths();
    }

    @Input() set availableMonths(value: Month[]) {
        this._availableMonths = value;
        this.tryEvaluatePreviousAndNextMonths();
    }

    private _availableMonths: Month[];
    public selectedMonth: Month;
    public nextMonth: Month | null;
    public previousMonth: Month | null;

    @Output() monthChange: EventEmitter<Month> = new EventEmitter<Month>();

    public selectNextMonth(){
        this.monthChange.emit(this.nextMonth);
	}

	public selectPreviousMonth() {
        this.monthChange.emit(this.previousMonth);
	}    

    private tryEvaluatePreviousAndNextMonths() {
        const months = PreviousAndNextMonths.get(
            this.selectedMonth,
            this._availableMonths);

        this.previousMonth = months.previous;
        this.nextMonth = months.next;
    }
}