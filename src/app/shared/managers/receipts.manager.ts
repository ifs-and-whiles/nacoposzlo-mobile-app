import { Injectable } from '@angular/core';
import { Subject, Subscription, PartialObserver } from 'rxjs';
import { ExpensesManager, ExpenseToCreate } from './expenses.manager';
import { TagsManager } from './tags/tags.manager';
import * as _ from "lodash";
import { ReceiptsApi, ReceiptRecognitionStatus, GetRecognizedReceiptResponse } from '../api/receipts.api';
import { DateParser } from '../dateParser';
import { Guid } from 'guid-typescript';
import { DatabaseService } from '../database/database.injectable';
import { ReceiptEntity } from '../database/entities/receipt-entity';
import { ReceiptProductData } from '../database/entities/receipt-product-data';
import { Receipts } from '../utils/receipts';
import { TagsMath } from './tags/tagsMath';
import { NameSuggestionsManager } from './names/name-suggestions.manager';
import { NamesMath } from './names/namesMath';
import { ApiLogger } from '../api-logger';
import { ImageBlob } from './camera.manager';

export interface ReceiptToRecognize {
    cloudId: string;
    localId: number;
}

export interface ReceiptToDelete {
    cloudId: string;
    localId: number;
}

export interface IHaveLocalId {
    localId: number;
}

@Injectable({
	providedIn: 'root'
})
export class ReceiptsManager {

    private _receiptSubject = new Subject<IHaveLocalId>();
    private _receiptDeletedSubject = new Subject<void>();
    private _receiptImageBlobs = {};

    constructor(
        private _database: DatabaseService, 
        private _expensesManager: ExpensesManager,
        private _tagsManager: TagsManager,
        private _nameSuggestionsManager: NameSuggestionsManager,
        private _api: ReceiptsApi,
        private _logger: ApiLogger) { }

    public subscribe(observer?: PartialObserver<IHaveLocalId>): Subscription {
        return this._receiptSubject.subscribe(observer);
    }

    public subscribeToDeleted(observer?: PartialObserver<void>): Subscription {
        return this._receiptDeletedSubject.subscribe(observer);
    }

    public updateDetails(localId: number, seller: string, totalAmount: number, dateUnixTimestamp: number) {
        return this
            ._database
            .updateReceiptDetails(localId, seller, totalAmount, dateUnixTimestamp)
            .then(() => this._receiptSubject.next(<IHaveLocalId><ReceiptEntity>{
                localId: localId,
                seller: seller,
                totalAmount: totalAmount,
                dateUnixTimestamp: dateUnixTimestamp
            }))
            .catch(error => {
                this._logger.error("receipts.manager.ts->updateDetails()", error);
            })
    }

    public updateReceiptProducts(localId: number, products: ReceiptProductData[]) {
        return this
            ._database
            .updateReceiptProducts(localId, products)
            .then(() => this._receiptSubject.next(<IHaveLocalId><ReceiptEntity>{
                localId: localId,
                products: products
            }))
            .catch(error => {
                this._logger.error("receipts.manager.ts->updateReceiptProducts()", error);
            });
    }

    public updateReceiptProductsAmountSum(localIds: number[]) {
        return this
            ._database
            .updateReceiptProductsAmountSum(localIds)
            .then(() => this._database.getReceipts(localIds))
            .then(receipts => receipts.forEach(receipt => this._receiptSubject.next(receipt)))
            .catch(error => {
                this._logger.error("receipts.manager.ts->updateReceiptProductsAmountSum()", error);
            });
    }

    public async bulkDelete(receipts: ReceiptToDelete[]) {        
        const localIds = receipts.map(r => r.localId);

        //if receipt was confirmed it has expenses associated by local id
        //we need to remove those
        const expensesToDelete = await this
            ._database
            .getExpensesToDeleteForReceipts(localIds)

        if(expensesToDelete.length) {
            await this._expensesManager.bulkDelete(expensesToDelete, this);
        }

        //if receipt was not confirmed, it has products stored in db
        //we need to decrement tags before deleting them
        const receiptProducts = await this
            ._database
            .getReceiptProducts(localIds);

        if(receiptProducts.length) {
            await this._tagsManager.decrementTags(
                TagsMath.calculateUsage(receiptProducts, p => p.tags));

            await this._nameSuggestionsManager.decrementNameSuggestions(
                NamesMath.calculateUsage(receiptProducts, p => p.name));
        }        

        await this._database.removeReceipts(localIds);

        this._receiptDeletedSubject.next();
    }    

    public async addInitialReceipt(cloudId: string): Promise<number> {
        return await this._database.addInitialReceipt(cloudId);
    }
    
    public async recognizeReceipt(
        receipt: ReceiptToRecognize,
        wasDeleted: (receipt: ReceiptToRecognize) => boolean, 
        recognitionSuccess: (receipt: GetRecognizedReceiptResponse, products: ReceiptProductData[]) => Promise<void>,
        recognitionFailed: () => void) {

        const startedAt = new Date().getTime();
        const maxTimeProcessing = 20000;

        //TODO HANDLE TIMEOUT
        while(new Date().getTime() - startedAt < maxTimeProcessing) {
            try {
                if(wasDeleted(receipt)) return;

                const response = await this
                    ._api
                    .getReceiptStatus(receipt.cloudId);

                switch (response.status) {
                    case ReceiptRecognitionStatus.RecognitionStarted: break;
                    
                    case ReceiptRecognitionStatus.RecognitionFailed: {
                        if(wasDeleted(receipt)) return;
                        await this.recognitionFailed(receipt.localId, recognitionFailed);
                        return;
                    } 

                    case ReceiptRecognitionStatus.RecognitionCompleted: {
                        if(wasDeleted(receipt)) return;
                        await this.recognitionCompleted(receipt.localId, receipt.cloudId, recognitionSuccess);                       
                        return;
                    }

                    default: throw new Error(`Unknown receipt recognition status '${response.status}'`);
                }

                await this.delay(500);
            } catch(error) {
                this._logger.error("receipts.manager.ts->recognizeReceipt()", error);
                await this.recognitionFailed(receipt.localId, recognitionFailed);
            }            
        }
    }

    private async recognitionFailed(localId: number, recognitionFailed: () => void) {
        await this
            ._database
            .updateFailedReceipts([localId]);
    
        recognitionFailed();
    }

    private async recognitionCompleted(
        localId: number, 
        cloudId: string, 
        recognitionSuccess: (receipt: GetRecognizedReceiptResponse, products: ReceiptProductData[]) => Promise<void>) {
            
        const recognized = await this
            ._api
            .getRecognizedReceipt(cloudId);

        const products = recognized
			.products
			.map((p, index) => {
                const suggestedTags = this._tagsManager.getTagSuggestions(p.name);

                const product: ReceiptProductData = {
                    isCorrupted: p.isCorrupted,
                    orderInReceipt: index,
                    
                    name: p.name,
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,					
                    amount: p.amount,
                    tags: suggestedTags ? suggestedTags : [],
                    boundingBox: p.boundingBox
                };

                return product;
            });

        const receiptUnixTimestamp = recognized.date 
            ? DateParser.Iso8061ToDateUnixTimestamp(recognized.date)
            : null;

        
        await this._tagsManager.incrementTags(
            { chains: []},
            TagsMath.calculateUsage(products, e => e.tags));

        await this._nameSuggestionsManager.incrementNamesSuggestions(
            { items: []},
            NamesMath.calculateUsage(products, e => e.name));    

		await this._database.updateReceipt(
            localId,
            receiptUnixTimestamp,
            recognized.amount,
            recognized.seller,
            products);
        
        await recognitionSuccess(recognized, products);
        
        return;
    }
   
    public async confirmReceipt(receipt: ReceiptEntity) {
        const validProducts = receipt
            .products
            .filter(p => Receipts.isProductValid(p));

        if(validProducts.length != receipt.products.length) {
            throw new Error("Not all receipt products are valid, confirming receipt is not possible!");
        }

        const expensesToCreate: ExpenseToCreate[] = validProducts.map(p => {
            const expense: ExpenseToCreate = {
                itemId: Guid.create().toString(), // that is simply to put anything here - should be solved better - traced and then accordingly handled in case of errors
                
                amount: p.amount,
                dateUnixTimestamp: receipt.dateUnixTimestamp,
                name: p.name,
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                tags: p.tags,
                orderInReceipt: p.orderInReceipt                    
            }

            return expense;
        });

        await this._expensesManager.bulkCreate(
            expensesToCreate, 
            receipt.localId, 
            receipt.cloudId,
            this,
            true);

        await this.updateReceiptProducts(
            receipt.localId, 
            []);

        await this.updateReceiptProductsAmountSum(
            [receipt.localId]);
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    public storeImageBlobInMemory(cloudId: string, image: ImageBlob) {
        this._receiptImageBlobs[cloudId] = image.blob;
    }

    public storeImageInMemory(cloudId: string, blob: any) {
        this._receiptImageBlobs[cloudId] = blob;
    }

    public async getImage(cloudId: string) {
        if(this._receiptImageBlobs[cloudId]) {
            return this._receiptImageBlobs[cloudId];
        }

        const blob = await this
            ._api
            .getReceiptImage(cloudId);

        this.storeImageInMemory(cloudId, blob);

        return blob;
    }
}