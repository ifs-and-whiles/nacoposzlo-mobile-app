import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '../utils/money';

@Pipe({name: 'money'})
export class MoneyPipe implements PipeTransform {
    transform(value: number, format: string = null): string {
        if (!format) {
            if(value === 0 || value) return formatMoney(value);
            return null;
        } 
        
        if(format === 'include-currency') {
            if(value === 0 || value) return `${formatMoney(value)} zł`;
            return null;
        }

        throw new Error(`Unknown money format (${format})`);
    }
}