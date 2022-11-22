import { ReceiptProductData } from './receipt-product-data';

export interface ReceiptToDeleteEntity {
	localId: number;
	cloudId: string;
	products: ReceiptProductData[];
}