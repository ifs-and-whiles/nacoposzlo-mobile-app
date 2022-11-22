import { ReceiptEntity } from '../database/entities/receipt-entity';
import { ReceiptProductData } from '../database/entities/receipt-product-data';
import { BoundingBox, Point } from './bounding-box';

export interface ProductCanvasBoundingBox {
    location: Point;
    width: number,
    height: number
}

export interface ReceiptLocation {
    leftX: number;
    rightX: number;
}

export interface IHaveAmount {
    amount: number;
}

export class Receipts {
    public static shouldWarnAboutSumDifferences(receiptAmount: number, productsAmount: number) {
        const diff = Math.abs(receiptAmount - productsAmount);
        return diff >= 0.0099;
    }

    public static calculateProductsSum(receipt: ReceiptEntity) {
        if(!receipt)
            throw new Error("receipt is null");

        if(!receipt.products)
            return 0;

        return receipt
            .products
            .reduce((acc, product) => acc + parseFloat(<any> product.amount), 0);
    }

    public static getInvalidProducts(receipt: ReceiptEntity) {
        if(!receipt.products) 
			return [];

		return receipt
			.products
			.filter(p => !this.isProductValid(p));
    }

    public static isProductValid(product: ReceiptProductData) {
        return product.name && this.isAmountValid(product);
    }

    public static isAmountValid(item: IHaveAmount) {
        return item.amount && !isNaN(item.amount);
    }

    public static isReceiptSumValid(receipt: ReceiptEntity) {
        const productsSum = this.calculateProductsSum(receipt);

        return Math.abs(productsSum - receipt.totalAmount) < 0.01;
    }

    public static isReceiptCorrect(receipt: ReceiptEntity) {
        const invalidProducts = Receipts
			.getInvalidProducts(receipt);

		return receipt.seller 
			&& receipt.dateUnixTimestamp 
			&& receipt.totalAmount 
			&& !invalidProducts.length
			&& Receipts.isReceiptSumValid(receipt)
    }

    public static calculateReceiptLocation(receipt: ReceiptEntity): ReceiptLocation {
        const productsWithBoundingBox = receipt
            .products
            .filter(p => p.boundingBox);
        
        const leftTopX = Math.min(...productsWithBoundingBox
            .map(p => p.boundingBox.leftTop.x));

        const rightTopX = Math.max(...productsWithBoundingBox
            .map(p => p.boundingBox.rightTop.x));
        
        return {
            leftX: leftTopX,
            rightX: rightTopX
        };
    }

    public static calculateCanvasBoundingBox(
        boundingBox: BoundingBox, 
        image, 
        shouldExtend: boolean,
        receiptLocation: ReceiptLocation): ProductCanvasBoundingBox {

        const leftX = receiptLocation.leftX;
        const rightX = receiptLocation.rightX;
        const width = rightX - leftX;
        
        const topY = Math.min(
            boundingBox.leftTop.y,
            boundingBox.rightTop.y);
            
        const bottomY = boundingBox.rightBottom.y;
        const height = bottomY - topY;

        const extension = height / 5;     

        if(!shouldExtend) {
            return {
                location: {
                    x: this.positiveOrZero(leftX - extension),
                    y: this.positiveOrZero(topY - extension)
                },
                height: Math.min(height + 2 * extension, image.height),
                width: width + 2 * extension             
            }
        } else {
            return {
                location: {
                    x: this.positiveOrZero(leftX - extension),
                    y: this.positiveOrZero(topY - extension - height/4)
                },
                height: Math.min(height * 2 + 2 * extension, image.height),
                width: width + 2 * extension
            }
        }
    }

    private static positiveOrZero(value: number) {
        if(value < 0) return 0;
        return value;
    }

}