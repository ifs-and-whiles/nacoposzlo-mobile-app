import { Month } from "../../month";
import { PreviousAndNextMonths } from "./previous-and-next-months";


describe('Previous and next months', () => {  
    it('when available months are null and selected month is null, next and previous months are null', () => {     
        //when
        const months = PreviousAndNextMonths.get(
            null, 
            null);

        //then
        expect(months.previous).toBe(null);
        expect(months.next).toBe(null);
    });

    it('when available months are null, next and previous months are null', () => {     
        //when
        const months = PreviousAndNextMonths.get(
            Month.current(), 
            null);

        //then
        expect(months.previous).toBe(null);
        expect(months.next).toBe(null);
    });

    it('when available months are empty, next and previous months are null', () => {     
        //when
        const months = PreviousAndNextMonths.get(
            Month.current(), 
            []);

        //then
        expect(months.previous).toBe(null);
        expect(months.next).toBe(null);
    });

    it('when available months contain next month, next month is returned and previous is null', () => {     
        //given
        const current = Month.current();
        const next = current.next();
       
        //when
        const months = PreviousAndNextMonths.get(
            current, 
            [next]);

        //then
        expect(months.previous).toBe(null);
        expect(months.next).toBe(next);
    });

    it('when available months contain previous month, next month is null and previous is returned', () => {     
        //given
        const current = Month.current();
        const previous = current.previous();
       
        //when
        const months = PreviousAndNextMonths.get(
            current, 
            [previous]);

        //then
        expect(months.previous).toBe(previous);
        expect(months.next).toBe(null);
    });

    it('when available months contain previous and next months, they are both returned', () => {     
        //given
        const current = Month.current();
        const previous = current.previous();
        const next = current.next();
       
        //when
        const months = PreviousAndNextMonths.get(
            current, 
            [previous, next]);

        //then
        expect(months.previous).toBe(previous);
        expect(months.next).toBe(next);
    });

    it('only the closest next and previous are returned', () => {     
        //given
        const current = Month.current();
        const previous = current.previous()
        const previousPrevious = current.previous().previous();
        const next = current.next();;
        const nextNext = current.next().next();
       
        //when
        const months = PreviousAndNextMonths.get(
            current, 
            [previous, next, nextNext, previousPrevious]);

        //then
        expect(months.previous).toBe(previous);
        expect(months.next).toBe(next);
    });
});