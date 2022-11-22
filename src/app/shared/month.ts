export class Month{
    public name: string;
    public shortName: string;

    constructor(public month: number, public year: number) {
        this.name = Month.fullName(month);
        this.shortName = Month.shortName(month);
    }

    public getMonthIndex() {
        return (this.year - 2000) * 12 + this.month;
    }

    public startUnixTimestamp() {
        const date = new Date(this.year, this.month, 1);
        return date.getTime();
    }

    public next() : Month {
        let nextMonth = this.month + 1;
        let nextYear = this.year;

        if(nextMonth == 12){
            nextMonth = 0;
            nextYear += 1;
        } 

        return new Month(nextMonth, nextYear);
    }

    public previous() : Month {
        let previousMonth = this.month - 1;
        let previousYear = this.year;

        if(previousMonth == -1){
            previousMonth = 11;
            previousYear -= 1;
        } 

        return new Month(previousMonth, previousYear);
    }

    public lastDayUnixTimestamp() : number {
        const nextMonth = this.next();
        const firstDayOfNextMonth = new Date(nextMonth.startUnixTimestamp());
        firstDayOfNextMonth.setDate(firstDayOfNextMonth.getDate() - 1);
        return firstDayOfNextMonth.getTime();
    }

    public previousYear(): Month {
        return new Month(this.month, this.year - 1);
    }

    public isEqualTo(other: Month): boolean {
        return this.month === other.month && this.year === other.year;
    }

    public distanceTo(other: Month): number {
        return (other.year - this.year) * 12 + (other.month - this.month);
    }

    public static ascCompareFn(a: Month, b: Month) {
        const aVal = a.year + a.month / 12;
        const bVal = b.year + b.month / 12;

        return aVal - bVal;
    }

    public static descCompareFn(a: Month, b: Month) {
        const aVal = a.year + a.month / 12;
        const bVal = b.year + b.month / 12;

        return bVal-aVal;
    }

    public static current(): Month {
        const now = new Date()
        return new Month(now.getMonth(), now.getFullYear());
    }

    public static of(unixTimestamp: number): Month {
        const date = new Date(unixTimestamp);
        return new Month(date.getMonth(), date.getFullYear());
    }

    public static ofIndex(monthIndex: number): Month {
        const month = monthIndex % 12;
        const year = 2000 + (monthIndex - month) / 12;

        return new Month(month, year);
    }

    public static range(fromUnixTimestamp: number, toUnixTimestamp: number) : Month[] {
        if(fromUnixTimestamp > toUnixTimestamp)
            throw new Error(`'fromUnixTimestamp' (${fromUnixTimestamp}) cannot be greater than 'toUnixTimestamp' (${toUnixTimestamp})`)
        
        const from = this.of(fromUnixTimestamp);

        const result = [];
        let current = from;

        do {
            result.push(current);
            current = current.next();
        } while(current.startUnixTimestamp() <= toUnixTimestamp)

        return result;
    }

    public static isFullMonth(fromUnixTimestamp: number, toUnixTimestamp: number): {isFullMonth: boolean, month: Month} {
        const month = Month.of(fromUnixTimestamp);
	
		if(month.startUnixTimestamp() == fromUnixTimestamp && 
		   month.lastDayUnixTimestamp() == toUnixTimestamp) {
	
			return {
				isFullMonth: true,
				month: month
			};
		}
	
		return {
			isFullMonth: false,
			month: null
		};
    }

    public toString() {
        return `${this.name} ${this.year}`;
    }

    private static _fullNames = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];

    private static _fullNamesForLongDate = [
        "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
    ];

    private static _shortNames = [
        "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"
    ];

    public static fullNames(): string[] {
        return this._fullNames;
    }

    public static fullName(index: number) {
        if (index >= 0 && index <= 11) 
        { 
            return this._fullNames[index];
        } else {
            throw new Error(`Allowed month indexes are 0-11 and '${index}' is outside that range.`)
        }
    }

    public static fullNamesForLongDate(): string[] {
        return this._fullNamesForLongDate;
    }

    public static fullNameForLongDate(index: number) {
        if (index >= 0 && index <= 11) 
        { 
            return this._fullNamesForLongDate[index];
        } else {
            throw new Error(`Allowed month indexes are 0-11 and '${index}' is outside that range.`)
        }
    }

    public static shortNames() {
        return this._shortNames;
    }

    public static shortName(index: number) {
        if (index >= 0 && index <= 11) 
        { 
            return this._shortNames[index];
        } else {
            throw new Error(`Allowed month indexes are 0-11 and '${index}' is outside that range.`)
        }
    }
}