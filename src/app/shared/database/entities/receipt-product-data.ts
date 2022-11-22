import { BoundingBox } from '../../utils/bounding-box';

export interface ReceiptProductData {
	isCorrupted: boolean;
	name: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	tags: string[];
	orderInReceipt: number;
	boundingBox: BoundingBox;
}