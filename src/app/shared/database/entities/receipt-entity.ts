import { ReceiptProductData } from './receipt-product-data';

export interface ReceiptEntity {
	localId: number;
	cloudId: string;
	createdAtUnixTimestamp: number;
	isScanningFinished: boolean;
	wasScanningSuccessful: boolean;

	dateUnixTimestamp: number;
	totalAmount: number;
	productsTotalAmountSum: number;
	seller: string;

	products: ReceiptProductData[];
}

export class ReceiptDbUtils {
	public static parseDbTotalAmountInCents(dbTotalAmountInCents: number): number {
        if(dbTotalAmountInCents == null) return null;
        return dbTotalAmountInCents / 100;
	}

	public static parseDbProductsTotalAmountSumInCents (dbProductsTotalAmountSumInCents : number): number {
        if(dbProductsTotalAmountSumInCents == null) return null;
        return dbProductsTotalAmountSumInCents / 100;
    }
    
    public static parseDbJsonReceiptProducts(dbJsonReceiptProducts: any): ReceiptProductData[] {
        const products = JSON.parse(dbJsonReceiptProducts);

        if(products) {
            products.forEach(product => 
                product.tags = product.tags ? product.tags : []);
        }

        return products;
    }
}