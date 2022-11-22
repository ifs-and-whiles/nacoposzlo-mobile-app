import { Pipe, PipeTransform } from '@angular/core';
import { DateParser } from '../dateParser';
import { Month } from '../month';

@Pipe({name: 'month'})
export class MonthPipe implements PipeTransform {

    transform(month: Month): string {
        if(!month) return undefined;

        return `${month.name} ${month.year}`;
    }
}