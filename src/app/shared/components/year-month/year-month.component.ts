import { Component, Input } from '@angular/core';
import { Month } from '../../month';

@Component({
	selector: 'app-year-month',
	templateUrl: 'year-month.component.html',
	styleUrls: ['year-month.component.scss'],
})
export class YearMonthComponent {
	@Input() month: Month;
}