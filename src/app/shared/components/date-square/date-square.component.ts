import { Component, Input } from '@angular/core';
import { Month } from '../../month';

@Component({
	selector: 'app-date-square',
    templateUrl: 'date-square.component.html',
	styleUrls: ['date-square.component.scss'],
})
export class DateSquareComponent { 
    @Input() set unixTimestamp(value: number) {
        const date = new Date(value);
        const dayNum = date.getDate();

        this.day = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
        this.monthShort =  Month.shortName(date.getMonth()).toLowerCase();
    }

    public day: string;
    public monthShort: string;
}