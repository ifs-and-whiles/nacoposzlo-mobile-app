import { Month } from "./month";

describe('Month', () => {  
    it('can get current month', () => {
        //given
        const now = new Date();
        
        //when
        const currentMonth = Month.current();

        //then
        expectMonth(currentMonth).toBe(now.getFullYear(), now.getMonth());
    });

    it('can create month with month and year', () => {
        //when
        const month = new Month(0, 2020);

        //then
        expectMonth(month).toBe(2020, 0);
    });

    it('january index is 0', () => {
        //when
        const month = new Month(0, 2020);

        //then
        expect(month.name).toBe('Styczeń');
    });

    it('december index is 11', () => {
        //when
        const month = new Month(11, 2020);

        //then
        expect(month.name).toBe('Grudzień');
    });

    it('next month for january is february', () => {
        //given
        const january = new Month(0, 2020);
        const february = new Month(1, 2020);

        //when
        const nextOfJanuary = january.next();

        //then
        expect(nextOfJanuary).toEqual(february);
    });

    it('next month for december is january of next year', () => {
        //given
        const december = new Month(11, 2020);
        const nextYearJanuary = new Month(0, 2021);

        //when
        const nextOfDecember = december.next();

        //then
        expect(nextOfDecember).toEqual(nextYearJanuary);
    });

    it('previous month for january is december of previous year', () => {
        //given
        const january = new Month(0, 2020);
        const previousYearDecember = new Month(11, 2019);

        //when
        const previousOfJanuary = january.previous();

        //then
        expect(previousOfJanuary).toEqual(previousYearDecember);
    });

    it('previous month for december is november', () => {
        //given
        const december = new Month(11, 2020);
        const november = new Month(10, 2020);

        //when
        const previousOfDecember = december.previous();

        //then
        expect(previousOfDecember).toEqual(november);
    });

    it('can get unix timestamp of last day of month', () => {
        //given
        const expectedLastDayOfJanuary = new Date(2020, 0, 31);
        const january = new Month(0, 2020);

        //when
        const lastDayOfJanuaryUnixTimestamp = january.lastDayUnixTimestamp();

        //then
        expect(lastDayOfJanuaryUnixTimestamp).toBe(expectedLastDayOfJanuary.getTime());
    });

    it('can get previous year for given month', () => {
        //given
        const february2020 = new Month(1, 2020);
        const february2019 = new Month(1, 2019);

        //when
        const previousYearOfFebruary2020 = february2020.previousYear();

        //then
        expect(previousYearOfFebruary2020).toEqual(february2019);
    });

    it('distance between months is number of months between them', () => {
        //given
        const january2020 = new Month(0, 2020);
        const february2021 = new Month(1, 2021);

        //when
        const distanceFromJanToFeb = january2020.distanceTo(february2021);
        const distanceFromFebToJan = february2021.distanceTo(january2020);

        //then
        expect(distanceFromJanToFeb).toBe(13);
        expect(distanceFromFebToJan).toBe(-13);
    });

    it('can get month for specific unix timestamp', () => {
        //given
        const tenthOfMarch2020 = new Date(2020, 2, 10);

        //when
        const march = Month.of(tenthOfMarch2020.getTime());

        //then
        expect(march).toEqual(new Month(2,2020));
    });

    it('can get list of all month between two dates', () => {
        //given
        const tenthOfMarch2020 = new Date(2020, 2, 10);
        const eleventhOfApril2021 = new Date(2021, 3, 11);

        //when
        const months = Month.range(
            tenthOfMarch2020.getTime(), 
            eleventhOfApril2021.getTime()
        );

        //then
        expect(months).toEqual([
            new Month(2, 2020),
            new Month(3, 2020),
            new Month(4, 2020),
            new Month(5, 2020),
            new Month(6, 2020),
            new Month(7, 2020),
            new Month(8, 2020),
            new Month(9, 2020),
            new Month(10, 2020),
            new Month(11, 2020),
            new Month(0, 2021),
            new Month(1, 2021),
            new Month(2, 2021),
            new Month(3, 2021),
        ]);
    });

    function expectMonth(month: Month) {
        return {
            toBe: (expectedYear: number, expectedMonth: number) => {
                expect(month.month).toBe(expectedMonth);
                expect(month.year).toBe(expectedYear);
            }
        }
    }
});