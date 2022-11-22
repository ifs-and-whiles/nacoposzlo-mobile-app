import { Injectable } from '@angular/core';
import { ExpensesApi, BulkDeleteRequest, BulkOperationItem, DeleteSingleRequest, UpdateExpenseRequest, BulkUpdateRequest, UpdateSingleRequest, BulkCreateRequest, CreateSingleRequest, BulkChangeTagsRequest } from '../api/expenses.api';
import { DateParser } from '../dateParser';
import { TagsManager, prepareTagHabits, TagsUsage } from './tags/tags.manager';
import * as _ from "lodash";
import { Subject, PartialObserver, Subscription } from 'rxjs';
import { ReceiptsManager } from './receipts.manager';
import { ToastController } from '@ionic/angular';
import { ExpenseEntity } from '../database/entities/expense-entity';
import { DatabaseService } from '../database/database.injectable';
import { TagsMath } from './tags/tagsMath';
import { NameSuggestionsManager, NamesUsage } from './names/name-suggestions.manager';
import { NamesMath } from './names/namesMath';
import { ApiLogger } from '../api-logger';

export interface ExpenseToTag {
    localId: number;
    cloudId: string;
    name: string;
}

export interface ExpenseToDelete {
    localId: number;
    cloudId: string;
    tags: string[];
    name: string;
    receiptLocalId: number;
}

export interface ExpenseToUpdate {
    localId: number;
    receiptLocalId: number;
	cloudId: string;
  	name: string;
  	dateUnixTimestamp: number;
  	quantity: number;
  	unitPrice: number;
  	amount: number;
	tags: string[];
}

export interface ExpenseToCreate {
    itemId: string;

  	name: string;
  	dateUnixTimestamp: number;
  	quantity: number;
  	unitPrice: number;
  	amount: number;
    tags: string[];
    orderInReceipt: number | null;
}

//todo that is not complete list and not the best approach
export interface ExpensesChange {
    created: ExpenseEntity[];
    updated: ExpenseEntity[];
    deleted: ExpenseToDelete[];
}


@Injectable({
	providedIn: 'root'
})
export class ExpensesManager {
    
    private _expenseSubject = new Subject<ExpensesChange>();

    constructor(
        private _api: ExpensesApi,
        private _database: DatabaseService,
        private _tagsManager: TagsManager,
        private _nameSuggestionsManager: NameSuggestionsManager,
        private _toast: ToastController,
        private _logger: ApiLogger) {}

    public subscribe(observer?: PartialObserver<ExpensesChange>): Subscription {
        return this._expenseSubject.subscribe(observer);
    }

    public async bulkTag(expenses: ExpenseToTag[], tagIds: string[], oldTagsUsage: TagsUsage) {
        const request: BulkChangeTagsRequest = {
            items : expenses.map(e => ({
                operationId: e.cloudId,
                entity: {
                    id: e.cloudId,
                    tags: tagIds.slice()
                }
            }))
        };

        try {
            await this._api.bulkChangeTagsExpenses(request);

            await this._database.updateExpensesTags(
                expenses.map(e => e.localId),
                tagIds.slice());

            const entities = await this._database.getExpensesByIds(
                expenses.map(e=>e.localId));

            this._expenseSubject.next({
                created: null,
                updated: entities,
                deleted: null
            });

            const currentTagsUsage = TagsMath.calculateUsage(
                expenses, 
                () => tagIds);

            await this._tagsManager.incrementTags(
                oldTagsUsage, 
                currentTagsUsage);

            await this._tagsManager.learnTagHabits(
                prepareTagHabits(expenses, e => e.name, () => tagIds));
        } catch (error) {
            this._logger.error("expenses.manager.ts->bulkTag()", error);
            this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );
            
            throw error;
        }
    }

    public async bulkCreate(
        expenses: ExpenseToCreate[], 
        receiptLocalId: number | null,
        receiptCloudId: string | null, 
        receiptManager: ReceiptsManager | null,
        ignoreDiffs: boolean): Promise<ExpenseEntity[]> {

        const request: BulkCreateRequest = {
            items: expenses.map(e => {
                const item: BulkOperationItem<CreateSingleRequest> = {
                    operationId: `${e.itemId}`,
                    entity: {
                        receiptId: receiptCloudId,
                        date: DateParser.formatIso8061Date(e.dateUnixTimestamp),
                        quantity: e.quantity,
                        tags: e.tags.slice(),
                        title: e.name,
                        totalAmount: e.amount,
                        unitPrice: e.unitPrice,
                        comments: null,
                        seller: null
                    }
                };

                return item;
            })
        };

        try {
            const response = await this._api.bulkCreateExpenses(
                request);

            const promises = expenses.map(expense => {
                const apiResult = response.find(r => r.operationId === expense.itemId);

                return this
                    ._database
                    .addExpense(
                        apiResult.entityId,
                        expense.name,
                        expense.dateUnixTimestamp,
                        expense.quantity,
                        expense.unitPrice,
                        expense.amount,
                        expense.tags,
                        receiptLocalId,
                        expense.orderInReceipt
                    );
            });

            const entities = await Promise.all(promises);

            this._expenseSubject.next({
                created: entities,
                updated: null,
                deleted: null
            });

            if(!ignoreDiffs) {
                await this._tagsManager.incrementTags(
                    { chains: []},
                    TagsMath.calculateUsage(entities, (e: ExpenseEntity) => e.tags));
                
                const tagHabits = prepareTagHabits(
                    entities, e => e.name, e => e.tags);
    
                await this._tagsManager.learnTagHabits(
                    tagHabits);

                await this._nameSuggestionsManager.incrementNamesSuggestions(
                    { items: [] },
                    NamesMath.calculateUsage(entities, (e: ExpenseEntity) => e.name));
            }
            
            if(receiptLocalId != null) {
                await receiptManager.updateReceiptProductsAmountSum(
                    [receiptLocalId]);
            }

            return entities;

        } catch (error) {
            this._logger.error("expenses.manager.ts->bulkCreate()", error);
            this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );

            throw error;
        }            
    }

    public async update(expense: ExpenseToUpdate, oldTagsUsage: TagsUsage, oldNamesUsage: NamesUsage, receiptManager: ReceiptsManager) {
        const request: UpdateExpenseRequest = {
            id: expense.cloudId,
            date: DateParser.formatIso8061Date(expense.dateUnixTimestamp),
            quantity: expense.quantity,
            tags: expense.tags.slice(),
            title: expense.name,
            totalAmount: expense.amount,
            unitPrice: expense.unitPrice,
            comments: null,
            seller: null
        };

        try {
            await this._api.updateExpense(request);
            
            await this._database.updateExpense(
                expense.localId,
                expense.name,
                expense.dateUnixTimestamp,
                expense.quantity,
                expense.unitPrice,
                expense.amount,
                expense.tags.slice()
            );
            
            const entities = await this._database.getExpensesByIds([expense.localId]);

            this._expenseSubject.next({
                created: null,
                updated: entities,
                deleted: null
            });

            await this._tagsManager.incrementTags(
                oldTagsUsage,
                TagsMath.calculateUsage([expense], (e: ExpenseEntity) => e.tags));

            await this._tagsManager.learnTagHabits(
                prepareTagHabits([expense], e => e.name, e => e.tags));

            await this._nameSuggestionsManager.incrementNamesSuggestions(
                oldNamesUsage,
                NamesMath.calculateUsage([expense], (e: ExpenseEntity) => e.name));

            if(expense.receiptLocalId) {
                await receiptManager.updateReceiptProductsAmountSum([expense.receiptLocalId]);
            }

        } catch (error) {
            this._logger.error("expenses.manager.ts->update()", error);
            this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );

            throw error;
        }
    }

    //todo optimize API for better performance (only date should be updated not everything)
    public async bulkDateUpdate(expenses: ExpenseToUpdate[], newDateUnixTimestamp: number) {
        const expensesIds = expenses.map(e => e.localId);

        const request: BulkUpdateRequest = {
            items: expenses.map(e => {
                const item: BulkOperationItem<UpdateSingleRequest> = {
                    operationId: `${e.localId}`,
                    entity: <UpdateSingleRequest> {
                        id: e.cloudId,
                        date: DateParser.formatIso8061Date(newDateUnixTimestamp),
                        quantity: e.quantity,
                        tags: e.tags.slice(),
                        title: e.name,
                        totalAmount: e.amount,
                        unitPrice: e.unitPrice,
                        comments: null,
                        seller: null
                    }
                };

                return item;
            })
        };

        try {
            await this._api.bulkUpdateExpenses(request);
            await this._database.updateExpensesDate(expensesIds, newDateUnixTimestamp);
            const entities = await this._database.getExpensesByIds(expensesIds);

            this._expenseSubject.next({
                created: null,
                updated: entities,
                deleted: null
            });
        } catch (error) {
            this._logger.error("expenses.manager.ts->bulkDateUpdate()", error);
            this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );

            throw error;
        }
    }

    public async bulkUpdate(expenses: ExpenseToUpdate[], oldTagsUsage: TagsUsage, oldNamesUsage: NamesUsage, receiptManager: ReceiptsManager) {
        const request: BulkUpdateRequest = {
            items: expenses.map(e => {
                const item: BulkOperationItem<UpdateSingleRequest> = {
                    operationId: `${e.localId}`,
                    entity: <UpdateSingleRequest> {
                        id: e.cloudId,
                        date: DateParser.formatIso8061Date(e.dateUnixTimestamp),
                        quantity: e.quantity,
                        tags: e.tags.slice(),
                        title: e.name,
                        totalAmount: e.amount,
                        unitPrice: e.unitPrice,
                        comments: null,
                        seller: null
                    }
                };

                return item;
            })
        };

        try {
            await this._api.bulkUpdateExpenses(request);

            const promises = expenses.map(expense => this
                ._database
                .updateExpense(
                    expense.localId,
                    expense.name,
                    expense.dateUnixTimestamp,
                    expense.quantity,
                    expense.unitPrice,
                    expense.amount,
                    expense.tags.slice()
                ));

            await Promise.all(promises);

            const entities = await this
                ._database
                .getExpensesByIds(expenses.map(e => e.localId));
            
            this._expenseSubject.next({
                created: null,
                updated: entities,
                deleted: null
            });

            await this._tagsManager.incrementTags(
                oldTagsUsage,
                TagsMath.calculateUsage(expenses, (e: ExpenseToUpdate) => e.tags));

            await this._tagsManager.learnTagHabits(
                prepareTagHabits(expenses, e => e.name, e => e.tags));

            
            await this._nameSuggestionsManager.incrementNamesSuggestions(
                oldNamesUsage,
                NamesMath.calculateUsage(expenses, (e: ExpenseToUpdate) => e.name));

            const receiptIds = _.uniq(expenses
                .filter(e => e.receiptLocalId)
                .map(e => e.receiptLocalId));
                
            await receiptManager.updateReceiptProductsAmountSum(receiptIds);
        } catch (error) {
            this._logger.error("expenses.manager.ts->bulkUpdate()", error);
            this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );

            throw error;
        }
    }

    public async bulkDelete(expenses: ExpenseToDelete[], receiptManager: ReceiptsManager) {
        const request: BulkDeleteRequest = {
            items: expenses.map(e => {
                const item: BulkOperationItem<DeleteSingleRequest> = {
                    operationId: `${e.localId}`,
                    entity: <DeleteSingleRequest> {
                        id: e.cloudId
                    }
                };

                return item;
            })
        };

        try {
            await this._api.bulkDeleteExpenses(request);

            const localIds = expenses.map(e => e.localId);

            await this._database.deleteExpenses(localIds);

            this._expenseSubject.next({
                created: null,
                updated: null,
                deleted: expenses
            });

            await this._tagsManager.incrementTags(
                TagsMath.calculateUsage(expenses, (e: ExpenseToDelete) => e.tags), 
                { chains: []});

            await this._nameSuggestionsManager.incrementNamesSuggestions(
                NamesMath.calculateUsage(expenses, (e: ExpenseToDelete) => e.name),
                { items: [] });

            const receiptIds = _.uniq(expenses
                .filter(e=>e.receiptLocalId)
                .map(e => e.receiptLocalId));

            await receiptManager.updateReceiptProductsAmountSum(receiptIds);

        } catch (error) {
            this._logger.error("expenses.manager.ts->bulkDelete()", error);
            this._logger.somethingWentWrongToast(
                `Podczas operacji na wydatkach coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );
            
            throw error;
        }
    }
}