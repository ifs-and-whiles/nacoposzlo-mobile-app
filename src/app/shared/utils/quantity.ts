import { StringUtils } from "./string-utils";

export const formatQuantity = function(quantity: any): string {
    if(quantity) {
        const quantityStr = quantity.toString();
        const parsed = StringUtils.parseNumber(quantityStr);
        if(!isNaN(parsed)) return (+parseFloat(quantity).toFixed(4)).toString();
    }

    return '0';
}