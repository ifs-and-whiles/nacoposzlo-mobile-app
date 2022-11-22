import { Month } from "../../month";

export interface INextAndPreviousMonths {
    previous: Month;
    next: Month;
}

export class PreviousAndNextMonths {
    public static get(selectedMonth: Month, availableMonths: Month[]): INextAndPreviousMonths {
        const month = selectedMonth ? selectedMonth : Month.current();
        
        const sortedAvailableMonths = this.sortAndGetAvailableMonths(
            month,
            availableMonths ? availableMonths : []);

        return {
            previous: this.tryGetPreviousMonth(
                sortedAvailableMonths,
                month),

            next: this.tryGetNextMonth(
                sortedAvailableMonths, 
                month)
        };
    }

    private static sortAndGetAvailableMonths(month: Month, availableMonths: Month[]): Month[] {
        const months = availableMonths.slice();

        if(!this.isMonthIncludedInAvailableMonths(month, months)){
            months.push(month);
        }

        const currentMonth = Month.current();
        if(!this.isMonthIncludedInAvailableMonths(currentMonth, months)){
            months.push(currentMonth);
        }

        months.sort((a, b) => Month.ascCompareFn(a,b));

        return months;
    }

    private static isMonthIncludedInAvailableMonths(month: Month, availableMonths: Month[]): boolean {
        return availableMonths
            .filter(m => m.isEqualTo(month))
            .length > 0
    }

    private static tryGetNextMonth(sortedAvailableMonths: Month[], month: Month): Month | null {
        const index = sortedAvailableMonths
            .findIndex(m => m.isEqualTo(month));

        return index === sortedAvailableMonths.length - 1
            ? null
            : sortedAvailableMonths[index + 1];
    }

    private static tryGetPreviousMonth(sortedAvailableMonths: Month[], month: Month): Month | null {
        const index = sortedAvailableMonths
            .findIndex(m => m.isEqualTo(month));

            return index === 0
            ? null
            : sortedAvailableMonths[index - 1];
    }
}