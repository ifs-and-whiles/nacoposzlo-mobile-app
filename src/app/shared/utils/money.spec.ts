import { formatMoney } from "./money";

describe('formatMoney', () => {
    it('value without decimal places should have two decimal places appended', () => {
        expect(formatMoney("123")).toBe("123.00");
        expect(formatMoney(123)).toBe("123.00");
    });

    it('value with more than two decimal places should have them limited to only two', () => {
        expect(formatMoney("123.123")).toBe("123.12");
        expect(formatMoney(123.123)).toBe("123.12");
    });

    it('not a number should format to zero', () => {
        expect(formatMoney("not a number")).toBe("0.00");
    });
});