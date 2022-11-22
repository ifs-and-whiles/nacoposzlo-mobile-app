import { Pipe, PipeTransform } from '@angular/core';
import { DateParser } from '../dateParser';

@Pipe({name: 'timestamp'})
export class TimestampPipe implements PipeTransform {

    transform(value: number, format: string = 'datetime'): string {
      if(!value) return undefined;

      if(format === 'datetime')
        return DateParser.formatDateTime(value);
      
      if(format == 'date')
        return DateParser.formatDate(value);

      if(format == 'long-date')
        return DateParser.formatLongDate(value);

      if(format == 'iso8061')
        return DateParser.formatIso8061(value);

      if(format == 'month-year')
        return DateParser.formatMonthYear(value);

      throw new Error(`Timestamp pipe does not handle '${format}' format`);
    }
}