import { StringUtils } from "./string-utils";

export const formatMoney = function(money: any): string {
    if(money) {
        const moneyStr = money.toString();
        const parsed = StringUtils.parseNumber(moneyStr);
        if(!isNaN(parsed)) return parsed.toFixed(2);
    }

    return '0.00';
}

export const tryFormatMoney = function(money: any): string | null {
    return money == null ? null : formatMoney(money);
}

export const parseMoney = function(moneyStr: string | null): number {
    if(MONEY_REGEX.test(moneyStr)) {
        return StringUtils.parseNumber(moneyStr);
    }

    return NaN;
}

export const tryParseMoney = function(moneyStr: string): number | string {
    const parsed = parseMoney(moneyStr);

    if(isNaN(parsed)) return moneyStr;
    return parsed;
}

export const MONEY_REGEX = /^-?\d{1,9}([\.,]\d{0,2})?$/;