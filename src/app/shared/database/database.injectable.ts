import { Injectable } from '@angular/core';
import { Month } from '../month';
import { noCategoryTag } from '../utils/no-category-tag';
import { IComparisonChartExpense, ComparisonCharts } from './charts/comparison-charts';
import { IDetailsChartExpense, DetailsCharts } from './charts/details-charts';
import { ExpenseToDeleteEntity } from './entities/expense-to-delete-entity';
import { ExpenseEntity, ExpenseDbUtils } from './entities/expense-entity';
import { ExpenseEntityCursor } from './entities/expense-entity-cursor';
import { ReceiptForListEntityCursor } from './entities/receipt-for-list-entity-cursor';
import { ReceiptEntity, ReceiptDbUtils } from './entities/receipt-entity';
import { ReceiptToDeleteEntity } from './entities/receipt-to-delete-entity';
import { ReceiptProductData } from './entities/receipt-product-data';
import { DetailsChartData, MonthDetailsChartData } from './charts/details-chart-data';
import { ComparisonChartData } from './charts/comparison-chart-data';
import { TagsCollectionEntity } from './entities/tags-collection-entity';
import { UserDetailsEntity } from './entities/user-details-entity';
import { TagSuggestionBranchEntity } from './entities/tag-suggestion-branch-entity';
import { GeneralAppDetailsEntity } from './entities/general-app-details-entity';
import { UserConsentsEntity } from './entities/user-consents-entity';
import { ExpenseToExportEntity } from './entities/expense-to-export-entity';
import { TagsUsage } from '../managers/tags/tags.manager';
import { TagsMath } from '../managers/tags/tagsMath';
import * as _ from "lodash";
import { HowManyExpensesEntity } from './entities/how-many-expenses-entity';
import { NameSuggestionEntity } from './entities/name-suggestion-entity';
import { NamesMath } from '../managers/names/namesMath';
import { ApiLogger } from '../api-logger';
import { getUserId } from '../utils/auth-utils';

interface Database {
    executeSql(statement: string, params?: any[]): Promise<any>;
    transaction(fn: (tx: Transaction) => void): Promise<any>;
}

interface Transaction {
    executeSql: (sql: any, values?: any[], success?: Function, error?: Function) => void;
}

const GENERAL_APP_DETAILS_ENTITY_ID = 'general_app_details';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
    private database: Database;
 
  	constructor(private _logger: ApiLogger) {
  	}


    private openDb(): Promise<Database> {
        return new Promise((resolve, reject) => {
            const db = (<any> window).sqlitePlugin.openDatabase({
                name: 'nacoposzlo.db',
                location: 'default',
                androidDatabaseProvider: 'system'
              }, 
              () => {
                  const database: Database = {
                    executeSql: (statement, params) => {
                        return new Promise((resolveExecuteSql, rejectExecuteSql) => {
                            db.executeSql(statement, params, result => resolveExecuteSql(result), error => rejectExecuteSql(error))
                        });
                    },
                    transaction: (fn: (tx: Transaction) => void) => {
                        return new Promise<any>((resolveTransaction, rejectTransaction) => {
                            db.transaction(fn, error => rejectTransaction(error), success => resolveTransaction(success))
                        });
                    }
                  }

                  resolve(database);
              },
              error => reject(error));           
        });
    }

  	public async initializeDatabaseStructure(){
		// return this.database.executeSql(`DROP TABLE consents`, []);	 		

        this.database = await this.openDb();

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS expenses ( 
            localId INTEGER PRIMARY KEY AUTOINCREMENT, 
            cloudId TEXT,
            receiptLocalId INTEGER,
            orderInReceipt INTEGER,
            userId TEXT,
            name TEXT, 
            dateUnixTimestamp INTEGER, 
            quantity REAL, 
            unitPrice REAL, 			
            amountInCents INTEGER, 
            tags TEXT,
            isBeingDeleted INTEGER);`, []);

        await this.database.executeSql(
                `CREATE INDEX IF NOT EXISTS idx_expenses_date
                ON expenses (dateUnixTimestamp)`, []);

        await this.database.executeSql(
                `CREATE INDEX IF NOT EXISTS idx_expenses_receipt
                ON expenses (receiptLocalId)`, []);
            
        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS receipts ( 
            localId INTEGER PRIMARY KEY AUTOINCREMENT, 
            cloudId TEXT,
            userId TEXT,
            createdAtUnixTimestamp INTEGER, 
            isScanningFinished INTEGER, 			
            wasScanningSuccessful INTEGER,
            dateUnixTimestamp INTEGER,
            totalAmountInCents INTEGER,
            productsTotalAmountSumInCents INTEGER,
            seller TEXT,
            jsonReceiptProducts TEXT);`, []);

        await this.database.executeSql(
            `CREATE INDEX IF NOT EXISTS idx_receipts_created_date
             ON receipts (createdAtUnixTimestamp)`, []);

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS users ( 
            userId TEXT PRIMARY KEY,
            jsonDetails TEXT,
            jsonTags TEXT);`, []);

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS consents ( 
            email TEXT PRIMARY KEY,
            wasTermsAndPrivacyPolicyAccepted INTEGER,
            acceptedAtUnixTimestamp INTEGER);`, []);

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS suggestions ( 
            productLettersName TEXT,
            userId TEXT,
            jsonSuggestions TEXT,
            PRIMARY KEY (productLettersName, userId));`, []);

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS appGeneralInfo ( 
            id TEXT PRIMARY KEY,
            jsonDetails TEXT);`, []);

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS migrations ( 
            localId INTEGER PRIMARY KEY AUTOINCREMENT,
            migrationId TEXT,
            dateUnixTimestamp INTEGER);`, []);

        await this.database.executeSql(
            `CREATE TABLE IF NOT EXISTS nameSuggestions ( 
            localId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            name TEXT,
            count INTEGER);`, []);

        await this.performMigrations();
	}

	private async performMigrations() {
        try {
            const lastMigrationId = await this.getLastPerformedMigrationId();

            let currentIndex = lastMigrationId == null
                ? -1
                : this.indexOfMigration(lastMigrationId);

            let indexToPerform = currentIndex + 1;
            let maxIndex = this.migrations.length - 1;

            for (indexToPerform; indexToPerform <= maxIndex; indexToPerform++) {
                const migration = this.migrations[indexToPerform];
                
                await this.database.transaction(tx => {
                    migration.perform(tx);
                    this.storePerformedMigration(tx, migration.id);
                });
            }
        } catch (error) {            
            this._logger.error("database.injectable.ts->performMigrations()", error);
            throw error;
        }
	}

	private async getLastPerformedMigrationId() : Promise<string> {
        try {
            const data = await this.database.executeSql(
				`SELECT migrationId FROM migrations 
				ORDER BY localId DESC
				LIMIT 1`, []);
            
            const rows = this.getAllRows(data);

            if(rows.length) return rows[0].migrationId;
            return null;
            
        } catch (error) {            
            this._logger.error("database.injectable.ts->getLastPerformedMigrationId()", error);
            throw error;
        }
	}

	private storePerformedMigration(tx:Transaction, migrationId: string) {
		const timestamp = new Date().getTime();

		return tx.executeSql(
			`INSERT INTO migrations (migrationId, dateUnixTimestamp) VALUES (?, ?)`,
			[migrationId, timestamp]
		);
	}

	private indexOfMigration(migrationId: string) {
		return this.migrations.findIndex(m => m.id === migrationId);
	}

	private migrations = [{
		id: '20201217', perform: (tx: Transaction) => this.add_receipt_json_source_file_column(tx)
	}, {
		id: '20210106', perform: (tx: Transaction) => this.calculate_tag_chains_usages(tx)
	}, {
		id: '20210827', perform: (tx: Transaction) => this.add_expense_month_index_column(tx)
	}, {
		id: '20210906', perform: (tx: Transaction) => this.add_receipt_created_at_month_index_column(tx)
	}, {
		id: '20210926', perform: (tx: Transaction) => this.add_tag_ids(tx)
	}, {
		id: '20211017', perform: (tx: Transaction) => this.calculate_name_suggestions(tx)
	}];
 
	private add_receipt_json_source_file_column(tx: Transaction) {
		//tx.executeSql('ALTER TABLE receipts ADD COLUMN jsonSourceFile TEXT;');
        //that is no longer needed, but i cannot remove migration from the list
        //as that would break the migrations mechanism
	}

    private calculate_tag_chains_usages(tx: Transaction)  {
        tx.executeSql('SELECT userId, jsonTags FROM users;', null, (tx: Transaction, userData) => {
            const userRows = this.getAllRows(userData);
            
            userRows.forEach(userRow => {
                const tagsCollection: {
                    tags: {[tagName: string]: {
                        name: string;
                        countAsMainTag: number;
                        count: number;
                        color: string;
                    }};
                    chains: {
                        tags: string[];
                        count: number;
                    }[];
                } = JSON.parse(userRow.jsonTags);

                const userId: string = userRow.userId;

                tx.executeSql(
                    `SELECT tags 
                     FROM expenses 
                     WHERE 
                        userId = ? 
                        AND tags IS NOT NULL
                        AND tags != '[]'
                        AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)`, [userId], (tx: Transaction, expensesData) => {
                        
                        const expensesRows = this.getAllRows(
                            expensesData);

                        const expenses = expensesRows.map(row => ({
                            tags: ExpenseDbUtils.parseDbTags(row.tags)
                        }));

                        const usage: TagsUsage = TagsMath.calculateUsage(
                            expenses, 
                            e => e.tags);

                        tagsCollection.chains = usage.chains.map(cu => ({
                            count: cu.count,
                            tags: cu.tagIds
                        }));

                        const jsonTags = JSON.stringify(tagsCollection);

                        tx.executeSql(
                            `UPDATE users
                             SET jsonTags = ?
                             WHERE userId = ?`, [jsonTags, userId]);
                    });
            });
        });        
    }

    private add_expense_month_index_column(tx: Transaction) {
		tx.executeSql('ALTER TABLE expenses ADD COLUMN monthIndex INTEGER;');
        tx.executeSql(`UPDATE expenses
                       SET monthIndex = (CAST(strftime('%Y',DATE(dateUnixTimestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER) - 2000) * 12 - 1 + CAST(strftime('%m',DATE(dateUnixTimestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER)`);                       
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_expenses_month_index
                       ON expenses (monthIndex);`);
	}

    private add_receipt_created_at_month_index_column(tx: Transaction)  {
		tx.executeSql('ALTER TABLE receipts ADD COLUMN createdAtMonthIndex INTEGER;');
        tx.executeSql(`UPDATE receipts
                       SET createdAtMonthIndex = (CAST(strftime('%Y',DATE(createdAtUnixTimestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER) - 2000) * 12 - 1 + CAST(strftime('%m',DATE(createdAtUnixTimestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER)`);                       
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_receipts_created_at_month_index
                       ON receipts (createdAtMonthIndex);`);
	}

    private add_tag_ids(tx: Transaction)  {
        tx.executeSql('SELECT userId, jsonTags FROM users;', null, (tx: Transaction, userData) => {
            const userRows = this.getAllRows(userData);
            
            userRows.forEach(userRow => {
                const oldTagsCollection: {
                    tags: {[tagName: string]: {
                        name: string;
                        countAsMainTag: number;
                        count: number;
                        color: string;
                    }};
                    chains: {
                        tags: string[];
                        count: number;
                    }[];
                } = JSON.parse(userRow.jsonTags);

                const userId: string = userRow.userId;

                const newTagsCollection: TagsCollectionEntity = {
                    tags: Object.keys(oldTagsCollection.tags).reduce((acc, tagName) => {
                        const tagId = tagName.toLowerCase();
                        const oldTag = oldTagsCollection.tags[tagName];
                        
                        acc[tagId] = {
                            id: tagId,
                            name: tagName,
                            color: oldTag.color
                        };

                        return acc;
                    }, {}),
                    chains: oldTagsCollection.chains.map(chain => ({
                        count: chain.count,
                        tagIds: chain.tags.map(t=>t.toLowerCase())
                    }))
                };
                
                const jsonTags = JSON.stringify(newTagsCollection);

                tx.executeSql(
                    `UPDATE users
                     SET jsonTags = ?
                     WHERE userId = ?`, [jsonTags, userId]);
            });
        });
    }

    private calculate_name_suggestions(tx: Transaction)  {
        tx.executeSql('SELECT userId, name FROM expenses;', null, (tx: Transaction, result) => {
            const expenses = this.getAllRows(result);
            const expensesByUserId = _.groupBy(expenses, 'userId');
            const userIds = Object.keys(expensesByUserId);

            userIds.forEach(userId => {
                const userExpenses = expensesByUserId[userId];
                const namesUsage = NamesMath.calculateUsage(
                    userExpenses, 
                    e => e.name);

                namesUsage.items.forEach(usage => {
                    tx.executeSql(
                        `INSERT INTO nameSuggestions (userId, name, count) 
                        VALUES (?,?,?)`, [userId, usage.name, usage.count]
                    );
                });
            });
        });        
    }

    /*------------EXPENSES------------------*/

	public getExpensesToDeleteForReceipts(receiptLocalIds: number[]): Promise<ExpenseToDeleteEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => {
				return this.database.executeSql(
					`SELECT localId, cloudId, tags, receiptLocalId, name FROM expenses 
					 WHERE userId = ? AND receiptLocalId IN (${receiptLocalIds.join(",")})`, 
					[userId])
			})
			.then(data => {
				const expenses: ExpenseToDeleteEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						receiptLocalId: row.receiptLocalId,
						tags: ExpenseDbUtils.parseDbTags(row.tags),
                        name: row.name
					}));

				return expenses;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getExpensesToDeleteForReceipts()", error);
				throw error;
			});		
	}

    public getReceiptProducts(receiptLocalIds: number[]): Promise<ReceiptProductData[]> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT jsonReceiptProducts 
				 FROM receipts 
				 WHERE localId IN (${receiptLocalIds.join(",")}) AND userId = ?`, [userId]))
			.then(data => {
				const allRows = this.getAllRows(data);
				const receiptProducts: ReceiptProductData[] = [];

				allRows.forEach(row => {
					const products = ReceiptDbUtils.parseDbJsonReceiptProducts(
						row.jsonReceiptProducts);

                    if(products) products.forEach(
                        product => receiptProducts.push(product));
				});

				return receiptProducts;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getReceiptProducts()", error);
				throw error;
			});	
	}

	public howManyExpensesForReceiptExist(receiptLocalId: number): Promise<number> {
		return this
			.tryGetUserId()
			.then(userId => {
				return this.database.executeSql(
					`SELECT COUNT(*) AS count 
					 FROM expenses 
					 WHERE userId = ? AND receiptLocalId = ?`, 
					[userId, receiptLocalId])
			})
			.then(data => {
				return data.rows.item(0).count;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->howManyExpensesForReceiptExist()", error);
				throw error;
			});				
	}

	public getExpensesForReceipt(receiptLocalId: number) {
		return this
			.tryGetUserId()
			.then(userId => {
				return this.database.executeSql(
					`SELECT * FROM expenses 
					 WHERE userId = ? AND receiptLocalId = ?
					 ORDER BY orderInReceipt`, 
					[userId, receiptLocalId])
			})
			.then(data => {
				const expenses: ExpenseEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						receiptLocalId: row.receiptLocalId,
						orderInReceipt: row.orderInReceipt,
						name: row.name, 
						dateUnixTimestamp:  row.dateUnixTimestamp,
						quantity: row.quantity,
						unitPrice: row.unitPrice,
						amount: ExpenseDbUtils.parseDbAmountInCents(row.amountInCents),
						tags: ExpenseDbUtils.parseDbTags(row.tags),
						isBeingDeleted: row.isBeingDeleted === 1
					}));

				return expenses;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getExpensesForReceipt()", error);
				throw error;
			});		
	}

	public howManyExpensesExist(
        fromUnixTimestamp: number, 
        toUnixTimestamp: number, 
        tags: string[], 
        name: string,
        fromAmount: number | null,
        toAmount: number | null): Promise<HowManyExpensesEntity> {
		return this
			.tryGetUserId()
			.then(userId => {
                const tagsValue = this.getTagsValue(tags);
                const nameValue = this.getNameValue(name);
                const fromAmountValue = this.getFromAmountValue(fromAmount);
                const toAmountValue = this.getToAmountValue(toAmount);
                
				const tagsCondition = this.getTagsCondition(tags, 2);
                const nameCondition = this.getNameCondition(name, 3);
                const fromAmountCondition = this.getFromAmountCondition(fromAmount, 4);
                const toAmountCondition = this.getToAmountCondition(toAmount, 5);

				return this.database.executeSql(
					`SELECT 
                        COUNT(*) AS count, 
                        SUM(amountInCents) as amountInCentsSum
                     FROM expenses 
                     WHERE userId = ?1
                         AND (dateUnixTimestamp >= ${fromUnixTimestamp} 
                                AND dateUnixTimestamp < ${toUnixTimestamp} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
                         AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)`, 
                         [userId, tagsValue, nameValue, fromAmountValue, toAmountValue])
			})
			.then(data => {
                const item = data.rows.item(0);

				return {
                    count: item.count,
                    amountSum: item.amountInCentsSum / 100
                };
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->howManyExpensesExist()", error);
				throw error;
			});				
	}

    public howManyExpensesExistForMonth(
        month: Month, 
        tags: string[], 
        name: string,
        fromAmount: number | null,
        toAmount: number | null): Promise<HowManyExpensesEntity> {
		return this
			.tryGetUserId()
			.then(userId => {
                const tagsValue = this.getTagsValue(tags);
                const nameValue = this.getNameValue(name);
                const monthIndex = month.getMonthIndex();
                const fromAmountValue = this.getFromAmountValue(fromAmount);
                const toAmountValue = this.getToAmountValue(toAmount);

				const tagsCondition = this.getTagsCondition(tags, 2);
                const nameCondition = this.getNameCondition(name, 3);
                const fromAmountCondition = this.getFromAmountCondition(fromAmount, 4);
                const toAmountCondition = this.getToAmountCondition(toAmount, 5);

				return this.database.executeSql(
					`SELECT 
                        COUNT(*) AS count, 
                        SUM(amountInCents) as amountInCentsSum
                     FROM expenses 
                     WHERE userId = ?1 
                         AND (monthIndex = ${monthIndex} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
                         AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)`, 
                         [userId, tagsValue, nameValue, fromAmountValue, toAmountValue])
			})
			.then(data => {
				const item = data.rows.item(0);

				return {
                    count: item.count,
                    amountSum: item.amountInCentsSum / 100
                };
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->howManyExpensesExistForMonth()", error);
				throw error;
			});				
	}

  	public getExpenses(
          pageSize: number, 
          cursor: ExpenseEntityCursor | null, 
          fromUnixTimestamp: number, 
          toUnixTimestamp: number, 
          tags: string[],
          name: string,
          fromAmount: number | null,
          toAmount: number | null) : Promise<ExpenseEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => {
                const tagsValue = this.getTagsValue(tags);
                const nameValue = this.getNameValue(name);
                const fromAmountValue = this.getFromAmountValue(fromAmount);
                const toAmountValue = this.getToAmountValue(toAmount);

				const tagsCondition = this.getTagsCondition(tags, 2);
                const nameCondition = this.getNameCondition(name, 3);
                const fromAmountCondition = this.getFromAmountCondition(fromAmount, 4);
                const toAmountCondition = this.getToAmountCondition(toAmount, 5);
						
				if(cursor){
					const time = cursor.dateUnixTimestamp;
					const id = cursor.localId;

					return this.database.executeSql(
						`SELECT * 
                        FROM expenses 
						WHERE userId = ?1 
							AND ((dateUnixTimestamp < ${time})  OR (dateUnixTimestamp = ${time} AND localId < ${id}))
							AND (dateUnixTimestamp >= ${fromUnixTimestamp} AND dateUnixTimestamp < ${toUnixTimestamp} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
							AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)
						ORDER BY dateUnixTimestamp DESC, localId DESC LIMIT ?6`, 
						[userId, tagsValue, nameValue, fromAmountValue, toAmountValue, pageSize])

				} else {
					return this.database.executeSql(
						`SELECT *
                         FROM expenses 
                         WHERE userId = ?1
                         AND (dateUnixTimestamp >= ${fromUnixTimestamp} AND dateUnixTimestamp < ${toUnixTimestamp} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
                         AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)
                         ORDER BY dateUnixTimestamp DESC, localId DESC LIMIT ?6`, 
                         [userId, tagsValue, nameValue, fromAmountValue, toAmountValue, pageSize])
				}					
			})
			.then(data => {
				let expenses: ExpenseEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						receiptLocalId: row.receiptLocalId,
						orderInReceipt: row.orderInReceipt,
						name: row.name, 
						dateUnixTimestamp:  row.dateUnixTimestamp,
						quantity: row.quantity,
						unitPrice: row.unitPrice,
						amount: ExpenseDbUtils.parseDbAmountInCents(row.amountInCents),
						tags: ExpenseDbUtils.parseDbTags(row.tags),
						isBeingDeleted: row.isBeingDeleted === 1
					}));

				return expenses;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getExpenses()", error);
				throw error;
			});				
	}

    public getExpensesForMonth(
        pageSize: number, 
        cursor: ExpenseEntityCursor | null, 
        month: Month,
        tags: string[],
        name: string,
        fromAmount: number | null,
        toAmount: number | null) : Promise<ExpenseEntity[]> {
      return this
          .tryGetUserId()
          .then(userId => {
                const tagsValue = this.getTagsValue(tags);
                const nameValue = this.getNameValue(name);
                const monthIndex = month.getMonthIndex();
                const fromAmountValue = this.getFromAmountValue(fromAmount);
                const toAmountValue = this.getToAmountValue(toAmount);

                const tagsCondition = this.getTagsCondition(tags, 2);
                const nameCondition = this.getNameCondition(name, 3);
                const fromAmountCondition = this.getFromAmountCondition(fromAmount, 4);
                const toAmountCondition = this.getToAmountCondition(toAmount, 5);
                      
                if(cursor){
                    const time = cursor.dateUnixTimestamp;
                    const id = cursor.localId;

                    return this.database.executeSql(
                        `SELECT * 
                        FROM expenses 
                        WHERE userId = ?1
                            AND ((dateUnixTimestamp < ${time})  OR (dateUnixTimestamp = ${time} AND localId < ${id}))
                            AND (monthIndex = ${monthIndex} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
                            AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)
                        ORDER BY dateUnixTimestamp DESC, localId DESC LIMIT ?6`, 
                        [userId, tagsValue, nameValue, fromAmountValue, toAmountValue, pageSize])

                } else {
                    return this.database.executeSql(
                        `SELECT *
                        FROM expenses 
                        WHERE userId = ?1 
                        AND (monthIndex = ${monthIndex} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
                        AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)
                        ORDER BY dateUnixTimestamp DESC, localId DESC LIMIT ?6`, 
                        [userId, tagsValue, nameValue, fromAmountValue, toAmountValue, pageSize])
                }					
          })
          .then(data => {
              let expenses: ExpenseEntity[] = this
                  .getAllRows(data)
                  .map(row => ({ 
                      localId: row.localId,
                      cloudId: row.cloudId,
                      receiptLocalId: row.receiptLocalId,
                      orderInReceipt: row.orderInReceipt,
                      name: row.name, 
                      dateUnixTimestamp:  row.dateUnixTimestamp,
                      quantity: row.quantity,
                      unitPrice: row.unitPrice,
                      amount: ExpenseDbUtils.parseDbAmountInCents(row.amountInCents),
                      tags: ExpenseDbUtils.parseDbTags(row.tags),
                      isBeingDeleted: row.isBeingDeleted === 1
                  }));

              return expenses;
          })
          .catch(error => {
                this._logger.error("database.injectable.ts->getExpensesForMonth()", error);
                throw error;
          });				
  }

	public getExpensesToExport(
        fromUnixTimestamp: number, 
        toUnixTimestamp: number, 
        tags: string[],
        name: string,
        fromAmount: number | null,
        toAmount: number | null) : Promise<ExpenseToExportEntity[]> {

		return this
			.tryGetUserId()
			.then(userId => {
                const tagsValue = this.getTagsValue(tags);
                const nameValue = this.getNameValue(name);
                const fromAmountValue = this.getFromAmountValue(fromAmount);
                const toAmountValue = this.getToAmountValue(toAmount);
                
				const tagsCondition = this.getTagsCondition(tags, 2);
                const nameCondition = this.getNameCondition(name, 3);
                const fromAmountCondition = this.getFromAmountCondition(fromAmount, 4);
                const toAmountCondition = this.getToAmountCondition(toAmount, 5);
						
				return this.database.executeSql(
					`SELECT name, dateUnixTimestamp, quantity, unitPrice, amountInCents, tags FROM expenses 
					WHERE userId = ?1 
					AND (dateUnixTimestamp >= ${fromUnixTimestamp} AND dateUnixTimestamp < ${toUnixTimestamp} ${tagsCondition} ${nameCondition} ${fromAmountCondition} ${toAmountCondition})
					AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)
					ORDER BY dateUnixTimestamp ASC`, 
					[userId, tagsValue, nameValue, fromAmountValue, toAmountValue])					
			})
			.then(data => {
				let expenses: ExpenseToExportEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						name: row.name, 
						dateUnixTimestamp:  row.dateUnixTimestamp,
						quantity: row.quantity,
						unitPrice: row.unitPrice,
						amount: ExpenseDbUtils.parseDbAmountInCents(row.amountInCents),
						tags: ExpenseDbUtils.parseDbTags(row.tags),
					}));

				return expenses;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getExpensesToExport()", error);
				throw error;
			});				
	}
	  
	public getExpensesByIds(localIds: number[]) : Promise<ExpenseEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT * FROM expenses 
				WHERE userId = ? AND localId IN (${localIds.join(",")})`, 
				[userId]))
			.then(data => {
				let expenses: ExpenseEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						receiptLocalId: row.receiptLocalId,
						orderInReceipt: row.orderInReceipt,
						name: row.name, 
						dateUnixTimestamp:  row.dateUnixTimestamp,
						quantity: row.quantity,
						unitPrice: row.unitPrice,
						amount: ExpenseDbUtils.parseDbAmountInCents(row.amountInCents),
						tags: ExpenseDbUtils.parseDbTags(row.tags),
						isBeingDeleted: row.isBeingDeleted === 1
					}));

				return expenses;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getExpensesByIds()", error);
				throw error;
			});				
  	}

    private getTagsValue(tags: string[]) {
        if(!tags || !tags.length) {
            return '';
        }

		if(tags.includes(noCategoryTag)) {
			return '[]';
		}		

		const tagsPhrase = tags.map(t => `"${t}"`).join(",");

        return '%' + tagsPhrase + '%';
    }

    private getTagsCondition(tags: string[], paramIndex: number) {
        if(!tags || !tags.length) {
            return `AND ?${paramIndex} = ?${paramIndex}`;
        }

		if(tags.includes(noCategoryTag)) {
			return `AND tags = ?${paramIndex}`;
		}		

		return `AND tags LIKE ?${paramIndex}`;
	}

    private getNameValue(name: string) {
        return name != null ? `%${name}%` : "";
    }
 
    private getNameCondition(name: string, paramIndex: number) {
        return name != null
            ? `AND name LIKE ?${paramIndex}`            
            : `AND ?${paramIndex} = ?${paramIndex}`
    }    

    private getFromAmountValue(fromAmount: number | null) {
        return fromAmount != null ? fromAmount * 100 : 0;
    }

    private getFromAmountCondition(fromAmount: number | null, paramIndex: number) {
        return fromAmount != null
        ? `AND amountInCents >= ?${paramIndex}`
        : `AND ?${paramIndex} = ?${paramIndex}`
    }

    private getToAmountValue(toAmount: number | null) {
        return toAmount != null ? toAmount * 100 + 1 : 0; //plus one to have opened bracket on the right side of the range
    }

    private getToAmountCondition(toAmount: number | null, paramIndex: number) {
        return toAmount != null
        ? `AND amountInCents < ?${paramIndex}`
        : `AND ?${paramIndex} = ?${paramIndex}`
    }

	public addExpense(cloudId: string, name: string, dateUnixTimestamp: number, quantity: number, unitPrice: number, amount: number, tags: string[], receiptLocalId: number | null, orderInReceipt: number | null): Promise<ExpenseEntity> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				'INSERT INTO EXPENSES (cloudId, userId, name, dateUnixTimestamp, quantity, unitPrice, amountInCents, tags, receiptLocalId, orderInReceipt, monthIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',[
                    cloudId, 
                    userId, 
                    name, 
                    dateUnixTimestamp, 
                    quantity, 
                    unitPrice, 
                    amount * 100, 
                    tags ? JSON.stringify(tags): null, 
                    receiptLocalId, 
                    orderInReceipt,
                    Month.of(dateUnixTimestamp).getMonthIndex()
                ]))
			.then((row: any) => {
				const expense: ExpenseEntity = {
					localId: row.insertId,
					cloudId: cloudId,
					amount: amount,
					dateUnixTimestamp: dateUnixTimestamp,
					name: name,
					quantity: quantity,
					receiptLocalId: receiptLocalId,
					orderInReceipt: orderInReceipt,
					tags: tags,
					unitPrice: unitPrice,
					isBeingDeleted: false
				};

				return expense;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->addExpense()", error);
				throw error;
			});	
  	}

	public removeExpense(localId: number) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql('DELETE FROM expenses WHERE localId = ? AND userId = ?', [localId, userId]))
			.catch(error => {
				this._logger.error("database.injectable.ts->removeExpense()", error);
				throw error;
			});	
	}

	public updateExpensesIsBeingDeleted(localIds: number[], value: boolean) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE expenses SET isBeingDeleted = ? WHERE localId IN (${localIds.join(",")}) AND userId = ?`, 
				[value ? 1 : 0, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateExpensesIsBeingDeleted()", error);
                throw error;
            });	
	}

	public updateExpensesTags(localIds: number[], tags: string[]) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE expenses SET tags = ? WHERE localId IN (${localIds.join(",")}) AND userId = ?`, 
				[tags ? JSON.stringify(tags) : null, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateExpensesTags()", error);
                throw error;
            });	
	}

	public deleteExpenses(localIds: number[]) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`DELETE FROM expenses WHERE localId IN (${localIds.join(",")}) AND userId = ?`, [userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->deleteExpenses()", error);
                throw error;
            });	
	}

	public removeExpenseByCloudId(cloudId: string) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql('DELETE FROM expenses WHERE cloudId = ? AND userId = ?', [cloudId, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->removeExpenseByCloudId()", error);
                throw error;
            });
	}
 
	public getExpense(localId): Promise<ExpenseEntity> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql('SELECT * FROM expenses WHERE localId = ? AND userId = ?', [localId, userId]))
			.then(data => {
			
				const row = data.rows.item(0);

				return { 
					localId: row.localId,
					cloudId: row.cloudId,
					receiptLocalId: row.receiptLocalId,
					orderInReceipt: row.orderInReceipt,

					name: row.name, 
					dateUnixTimestamp:  row.dateUnixTimestamp,
					quantity: row.quantity,
					unitPrice: row.unitPrice,
					amount: ExpenseDbUtils.parseDbAmountInCents(row.amountInCents),
					tags: ExpenseDbUtils.parseDbTags(row.tags),
					isBeingDeleted: row.isBeingDeleted === 1
				};
		    })
            .catch(error => {
                this._logger.error("database.injectable.ts->getExpense()", error);
                throw error;
            });
	}
 
	public updateExpense(localId: number, name: string, dateUnixTimestamp: number, quantity: number, unitPrice: number, amount: number, tags: string[]) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE expenses SET name = ?, dateUnixTimestamp = ?, monthIndex = ?, quantity = ?, unitPrice = ?, amountInCents = ?, tags = ? WHERE localId = ? AND userId = ?`, [
                    name, 
                    dateUnixTimestamp, 
                    Month.of(dateUnixTimestamp).getMonthIndex(), 
                    quantity, 
                    unitPrice, 
                    amount * 100,
                    tags ? JSON.stringify(tags) : null,
                    localId, 
                    userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateExpense()", error);
                throw error;
            });
	}

	public updateExpensesDate(localIds: number[], dateUnixTimestamp: number) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE expenses SET dateUnixTimestamp = ?, monthIndex = ? WHERE localId IN (${localIds.join(",")}) AND userId = ?`, [
                    dateUnixTimestamp, 
                    Month.of(dateUnixTimestamp).getMonthIndex(), 
                    userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateExpensesDate()", error);
                throw error;
            });
	}

    public getMonthsWithAtLeastOneExpense(): Promise<Month[]> {
		return this
			.tryGetUserId()
			.then(async userId => {
                const monthIndexesRequest = await this.database.executeSql(
                    `SELECT DISTINCT monthIndex
                     FROM expenses
                     WHERE userId = ?
                     ORDER BY monthIndex ASC`, [userId]
                );

                var monthIndexes = this.getAllRows(monthIndexesRequest);
                var months = monthIndexes.map(x=> Month.ofIndex(x.monthIndex));

                return months;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getMonthsWithAtLeastOneExpense()", error);
                throw error;
            });
	}
	  
    
    /*------------RECEIPTS------------------*/

	public howManyReceiptsExist(fromUnixTimestamp: number, toUnixTimestamp: number): Promise<number> {
		return this
			.tryGetUserId()
			.then(userId => {
					return this.database.executeSql(
						`SELECT COUNT(*) AS count
                         FROM receipts 
                         WHERE userId = ? 
                            AND (createdAtUnixTimestamp >= ? AND createdAtUnixTimestamp < ?)`, 
                        [userId, fromUnixTimestamp, toUnixTimestamp])
			})
			.then(data => {
				return data.rows.item(0).count;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->howManyReceiptsExist()", error);
                throw error;
            });
	}

    public howManyReceiptsExistForMonth(month: Month): Promise<number> {
		return this
			.tryGetUserId()
			.then(userId => {
                const monthIndex = month.getMonthIndex();

                return this.database.executeSql(
                    `SELECT COUNT(*) AS count
                     FROM receipts 
                     WHERE userId = ? AND (createdAtMonthIndex = ?)`, 
                    [userId, monthIndex])
			})
			.then(data => {
				return data.rows.item(0).count;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->howManyReceiptsExistForMonth()", error);
                throw error;
            });
	}

	public getReceiptsForList(pageSize: number, cursor: ReceiptForListEntityCursor | null, fromUnixTimestamp: number, toUnixTimestamp: number) : Promise<ReceiptEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => {
				if(cursor) {
					const time = cursor.createdAtUnixTimestamp;
					const id = cursor.localId

					return this.database.executeSql(
						`SELECT localId, cloudId, createdAtUnixTimestamp, isScanningFinished, wasScanningSuccessful, dateUnixTimestamp, seller, totalAmountInCents, productsTotalAmountSumInCents, jsonReceiptProducts
						 FROM receipts 
						 WHERE userId = ?1 
							AND ((createdAtUnixTimestamp < ?2) OR (createdAtUnixTimestamp = ?2 AND localId < ?3)) 
							AND (createdAtUnixTimestamp >= ?4 AND createdAtUnixTimestamp < ?5)
						 ORDER BY createdAtUnixTimestamp DESC, localId DESC LIMIT ?6`, 
                        [userId, time, id, fromUnixTimestamp, toUnixTimestamp, pageSize])
				} else {
					return this.database.executeSql(
						`SELECT localId, cloudId, createdAtUnixTimestamp, isScanningFinished, wasScanningSuccessful, dateUnixTimestamp, seller, totalAmountInCents, productsTotalAmountSumInCents, jsonReceiptProducts
						 FROM receipts 
						 WHERE userId = ? 
						 	AND (createdAtUnixTimestamp >= ? AND createdAtUnixTimestamp < ?)
						 ORDER BY createdAtUnixTimestamp DESC, localId DESC LIMIT ?`, 
                        [userId, fromUnixTimestamp, toUnixTimestamp, pageSize])
				}
			})
			.then(data => {
				let receipts: ReceiptEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						createdAtUnixTimestamp: row.createdAtUnixTimestamp,
						isScanningFinished: row.isScanningFinished === 0 ? false : true,
						wasScanningSuccessful: row.wasScanningSuccessful === 0 ? false : true,
						dateUnixTimestamp: row.dateUnixTimestamp,
						seller: row.seller,
						totalAmount: ReceiptDbUtils.parseDbTotalAmountInCents(row.totalAmountInCents),
						productsTotalAmountSum: ReceiptDbUtils.parseDbProductsTotalAmountSumInCents(row.productsTotalAmountSumInCents),
						products: ReceiptDbUtils.parseDbJsonReceiptProducts(row.jsonReceiptProducts)
					}));

				return receipts;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getReceiptsForList()", error);
				throw error;
			});
	}

    public getReceiptsForListForMonth(pageSize: number, cursor: ReceiptForListEntityCursor | null, month: Month) : Promise<ReceiptEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => {
                const monthIndex = month.getMonthIndex();

				if(cursor) {
					const time = cursor.createdAtUnixTimestamp;
					const id = cursor.localId

					return this.database.executeSql(
						`SELECT localId, cloudId, createdAtUnixTimestamp, isScanningFinished, wasScanningSuccessful, dateUnixTimestamp, seller, totalAmountInCents, productsTotalAmountSumInCents, jsonReceiptProducts
						 FROM receipts 
						 WHERE userId = ?1 
							AND ((createdAtUnixTimestamp < ?2) OR (createdAtUnixTimestamp = ?2 AND localId < ?3)) 
							AND (createdAtMonthIndex = ?4)
						 ORDER BY createdAtUnixTimestamp DESC, localId DESC LIMIT ?5`, 
                        [userId, time, id, monthIndex, pageSize])
				} else {
					return this.database.executeSql(
						`SELECT localId, cloudId, createdAtUnixTimestamp, isScanningFinished, wasScanningSuccessful, dateUnixTimestamp, seller, totalAmountInCents, productsTotalAmountSumInCents, jsonReceiptProducts
						 FROM receipts 
						 WHERE userId = ? 
                            AND (createdAtMonthIndex = ?)
						 ORDER BY createdAtUnixTimestamp DESC, localId DESC LIMIT ?`, 
                        [userId, monthIndex, pageSize])
				}
			})
			.then(data => {
				let receipts: ReceiptEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						createdAtUnixTimestamp: row.createdAtUnixTimestamp,
						isScanningFinished: row.isScanningFinished === 0 ? false : true,
						wasScanningSuccessful: row.wasScanningSuccessful === 0 ? false : true,
						dateUnixTimestamp: row.dateUnixTimestamp,
						seller: row.seller,
						totalAmount: ReceiptDbUtils.parseDbTotalAmountInCents(row.totalAmountInCents),
						productsTotalAmountSum: ReceiptDbUtils.parseDbProductsTotalAmountSumInCents(row.productsTotalAmountSumInCents),
						products: ReceiptDbUtils.parseDbJsonReceiptProducts(row.jsonReceiptProducts)
					}));

				return receipts;
			})
			.catch(error => {
				this._logger.error("database.injectable.ts->getReceiptsForListForMonth()", error);
				throw error;
			});
	}
	  
	public async addInitialReceipt(cloudId: string): Promise<number> {
        const now = new Date();
		const createdAtUnixTimestamp = now.getTime();
        const month = Month.of(createdAtUnixTimestamp);
        const monthIndex = month.getMonthIndex();
        
        try {
            const userId = await this.tryGetUserId();
           
            const row = await this.database.executeSql(
				`INSERT INTO receipts (
                    cloudId, 
                    userId, 
                    createdAtUnixTimestamp,
                    createdAtMonthIndex, 
                    isScanningFinished, 
                    wasScanningSuccessful) 
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[cloudId, userId, createdAtUnixTimestamp, monthIndex, 0, 0]
            );

            return row.insertId;
        } catch (error) {
            this._logger.error("database.injectable.ts->addInitialReceipt()", error);
            throw error;
        }
	}

	public updateFailedReceipts(failedReceiptLocalIds: number[]) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				 `UPDATE receipts 
                  SET isScanningFinished = 1, wasScanningSuccessful = 0 
                  WHERE localId IN (${failedReceiptLocalIds.join(",")}) 
                    AND userId = ?`, 
                [userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateFailedReceipts()", error);
                throw error;
            });
	}

	public getReceiptsToDelete(localIds: number[]): Promise<ReceiptToDeleteEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT localId, cloudId, jsonReceiptProducts 
				 FROM receipts 
				 WHERE localId IN (${localIds.join(",")}) AND userId = ?`, [userId]))
			.then(data => {
				const receipts: ReceiptToDeleteEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						products: ReceiptDbUtils.parseDbJsonReceiptProducts(row.jsonReceiptProducts)
					}));

				return receipts;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getReceiptsToDelete()", error);
                throw error;
            });
	}

	public getReceipt(localId: number): Promise<ReceiptEntity> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT * FROM receipts WHERE localId = ? AND userId = ?`, [localId, userId]))
			.then(data => {					
				if (data.rows.length > 0) {
					const row = data.rows.item(0);

					const receipt: ReceiptEntity = { 
						localId: row.localId,
						cloudId: row.cloudId,
						createdAtUnixTimestamp: row.createdAtUnixTimestamp,
						isScanningFinished: row.isScanningFinished === 0 ? false : true,
						wasScanningSuccessful: row.wasScanningSuccessful === 0 ? false : true,
						dateUnixTimestamp: row.dateUnixTimestamp,
						seller: row.seller,
						totalAmount: ReceiptDbUtils.parseDbTotalAmountInCents(row.totalAmountInCents),
						productsTotalAmountSum: ReceiptDbUtils.parseDbProductsTotalAmountSumInCents(row.productsTotalAmountSumInCents),
						products: ReceiptDbUtils.parseDbJsonReceiptProducts(row.jsonReceiptProducts)
					};

					return receipt;
 				} 

				throw new Error(`Receipt with localId '${localId}' not found.`);
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getReceipt()", error);
                throw error;
            });
	}

	public getReceipts(localIds: number[]): Promise<ReceiptEntity[]> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT * FROM receipts WHERE localId IN (${localIds.join(",")}) AND userId = ?`, [userId]))
			.then(data => {
				const receipts: ReceiptEntity[] = this
					.getAllRows(data)
					.map(row => ({ 
						localId: row.localId,
						cloudId: row.cloudId,
						createdAtUnixTimestamp: row.createdAtUnixTimestamp,
						isScanningFinished: row.isScanningFinished === 0 ? false : true,
						wasScanningSuccessful: row.wasScanningSuccessful === 0 ? false : true,
						dateUnixTimestamp: row.dateUnixTimestamp,
						seller: row.seller,
						totalAmount: ReceiptDbUtils.parseDbTotalAmountInCents(row.totalAmountInCents),
						productsTotalAmountSum: ReceiptDbUtils.parseDbProductsTotalAmountSumInCents(row.productsTotalAmountSumInCents),
						products: ReceiptDbUtils.parseDbJsonReceiptProducts(row.jsonReceiptProducts)
					}));

				return receipts;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getReceipts()", error);
                throw error;
            });
	}

	public updateReceiptProductsAmountSum(localIds: number[]) {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(`
				UPDATE receipts
				SET productsTotalAmountSumInCents = IFNULL((
					SELECT SUM(amountInCents)
					FROM expenses
					WHERE receiptLocalId = receipts.localId AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)), 0)
				WHERE localId IN (${localIds.join(",")}) AND userId = ?`, [userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateReceiptProductsAmountSum()", error);
                throw error;
            });
	}

	public updateReceipt(localId: number, dateUnixTimestamp: number, totalAmount: number, seller: string, products: ReceiptProductData[]): Promise<void>{
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE receipts 
				 SET isScanningFinished = 1, 
					 wasScanningSuccessful = 1, 
					 dateUnixTimestamp = ?,
					 totalAmountInCents = ?,
					 seller = ?,
					 jsonReceiptProducts = ?
				 WHERE localId = ? AND userId = ?`,
				[dateUnixTimestamp, totalAmount * 100, seller, JSON.stringify(products), localId, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateReceipt()", error);
                throw error;
            });
	}

	public updateReceiptProducts(localId: number, products: ReceiptProductData[]): Promise<void>{
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE receipts 
				 SET jsonReceiptProducts = ?
				 WHERE localId = ? AND userId = ?`,
				[JSON.stringify(products), localId, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateReceiptProducts()", error);
                throw error;
            });
	}

	public updateReceiptDetails(localId: number, seller: string, totalAmount: number, dateUnixTimestamp: number): Promise<void>{
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`UPDATE receipts 
				 SET seller = ?, 
					 totalAmountInCents = ?, 
					 dateUnixTimestamp = ? 
			     WHERE localId = ? AND userId = ?`,
				[seller, totalAmount * 100, dateUnixTimestamp, localId, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->updateReceiptDetails()", error);
                throw error;
            });
	}

	public removeReceipt(localId: number): Promise<void>{
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				'DELETE FROM receipts WHERE localId = ? AND userId = ?', [localId, userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->removeReceipt()", error);
                throw error;
            });
	}

	public removeReceipts(localIds: number[]): Promise<void>{
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`DELETE FROM receipts WHERE localId IN (${localIds.join(",")}) AND userId = ?`, [userId]))
            .catch(error => {
                this._logger.error("database.injectable.ts->removeReceipts()", error);
                throw error;
            });
	}

    public getMonthsWithAtLeastOneReceipt(): Promise<Month[]> {
        return this
			.tryGetUserId()
			.then(async userId => {
                const monthIndexesRequest = await this.database.executeSql(
                    `SELECT DISTINCT createdAtMonthIndex
                     FROM receipts
                     WHERE userId = ?
                     ORDER BY createdAtMonthIndex ASC`, [userId]
                );

                var monthIndexes = this.getAllRows(monthIndexesRequest);
                var months = monthIndexes.map(x=> Month.ofIndex(x.createdAtMonthIndex));

                return months;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getMonthsWithAtLeastOneReceipt()", error);
                throw error;
            });
	} 

    /*------------OTHER---------------------*/

	public getChartData(fromUnixTimestamp: number, toUnixTimestamp: number): Promise<DetailsChartData> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT localId, amountInCents, tags FROM expenses 
				 WHERE dateUnixTimestamp >= ? 
					 AND dateUnixTimestamp < ? 
					 AND userId = ? 
					 AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)`, 
				[fromUnixTimestamp, toUnixTimestamp, userId]))
			.then(data => {
				const expenses: IDetailsChartExpense[] = this
					.getAllRows(data)
					.map(expense => ({
						amount: expense.amountInCents / 100,
						tagIds: expense.tags ? JSON.parse(expense.tags): []
					}));
				
				const chartData = DetailsCharts.buildData(
					expenses
				);

				return chartData;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getChartData()", error);
                throw error;
            });
	}

    public getChartDataForMonths(months: Month[]): Promise<MonthDetailsChartData[]> {
        const monthIndexes = months.map(x=>x.getMonthIndex());

		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT localId, amountInCents, tags, monthIndex FROM expenses 
				 WHERE monthIndex IN (${monthIndexes.join(",")}) 
					 AND userId = ? 
					 AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)`, 
				[userId]))
			.then(data => {
				const expenses = this
					.getAllRows(data)
					.map(expense => ({
						amount: expense.amountInCents / 100,
						tagIds: expense.tags ? JSON.parse(expense.tags): [],
                        monthIndex: expense.monthIndex
					}));
				
                const expensesByMonth = _.groupBy(expenses, 'monthIndex');

                const result = monthIndexes.reduce((acc, monthIndex) => {
                    const monthExpenses = expensesByMonth[monthIndex];
                    const chartData = DetailsCharts.buildData(
                        monthExpenses);

                    acc.push({
                        month: Month.ofIndex(monthIndex),
                        data: chartData
                    });

                    return acc;
                }, []);				

				return result;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getChartDataForMonths()", error);
                throw error;
            });
	}

	public getComparisonChartData(fromMonth: Month, toMonth: Month): Promise<ComparisonChartData> {
		return this
			.tryGetUserId()
			.then(userId => this.database.executeSql(
				`SELECT localId, amountInCents, tags, dateUnixTimestamp 
                 FROM expenses 
				 WHERE monthIndex >= ? 
					 AND monthIndex <= ? 
					 AND userId = ? 
					 AND (isBeingDeleted IS NULL OR isBeingDeleted = 0)`, 
				[fromMonth.getMonthIndex(), toMonth.getMonthIndex(), userId]))
			.then(data => {
				const expenses: IComparisonChartExpense[] = this
					.getAllRows(data)
					.map(dbExpense => ({
						amount: dbExpense.amountInCents / 100,
						tagIds: dbExpense.tags ? JSON.parse(dbExpense.tags) : [],
						dateUnixTimestamp: dbExpense.dateUnixTimestamp
					}));

				const chartData = ComparisonCharts.buildData(
					expenses, 
					fromMonth.startUnixTimestamp(), 
					toMonth.next().startUnixTimestamp()
				);
				
				return chartData;
			})
            .catch(error => {
                this._logger.error("database.injectable.ts->getComparisonChartData()", error);
                throw error;
            });
	}

	public async saveTagsCollection(tags: TagsCollectionEntity) : Promise<void> {	
        try {
            const jsonTags = JSON.stringify(tags);
            const userId = await this.tryGetUserId();

            await this.database.transaction(tx => tx.executeSql(
                `SELECT jsonTags FROM users WHERE userId = ?`, 
                [userId],
                (tx1: Transaction, data) => {
                    if(data.rows.length > 0) {
                        tx1.executeSql(
                            `UPDATE users SET jsonTags = ? WHERE userId = ?`,
                            [jsonTags, userId]);
                    } else {
                        tx1.executeSql(
                            `INSERT INTO users (userId, jsonTags) VALUES (?,?)`,
                            [userId, jsonTags]);
                    }
                }));            
        } catch (error) {
            this._logger.error("database.injectable.ts->saveTagsCollection()", error);
            throw error;
        }
	}

	public async getTagsCollection() : Promise<TagsCollectionEntity> {
        try {
            const userId = await this.tryGetUserId();
            const data = await this.database.executeSql(
				`SELECT jsonTags FROM users WHERE userId = ?`, 
                [userId]);

            const rows = this.getAllRows(data);

            if(rows.length) {
                const tags = JSON.parse(rows[0].jsonTags);
                return tags;
            } else {
                return null;
            }

        } catch (error) {
            this._logger.error("database.injectable.ts->getTagsCollection()", error);
            throw error;            
        }
	}

	public async saveUserConsents(consents: UserConsentsEntity) : Promise<void> {        
        try {
            await this.database.transaction(tx => tx.executeSql(
                "SELECT * FROM consents WHERE email = ?",
                [consents.email.toLowerCase()],
                (tx1: Transaction, data) => {
                    if(data.rows.length > 0) {
                        tx1.executeSql(
                            `UPDATE consents SET wasTermsAndPrivacyPolicyAccepted = ?, acceptedAtUnixTimestamp = ? WHERE email = ?`, [
                                 consents.wasTermsAndPrivacyPolicyAccepted ? 1 : 0, 
                                 consents.acceptedAtUnixTimestamp,
                                 consents.email.toLowerCase()]);
                    } else {
                        tx1.executeSql(
                            `INSERT INTO consents (email, wasTermsAndPrivacyPolicyAccepted, acceptedAtUnixTimestamp) VALUES (?,?,?)`, [
                                 consents.email.toLowerCase(), 
                                 consents.wasTermsAndPrivacyPolicyAccepted ? 1 : 0, 
                                 consents.acceptedAtUnixTimestamp]);
                    }          
                }
            ));              
        } catch (error) {
            this._logger.error("database.injectable.ts->saveUserConsents()", error);
            throw error;
        }	
	}

	public async tryGetUserConsents(email: string) : Promise<UserConsentsEntity> {
        try {
            const data = await this.database.executeSql(
                `SELECT wasTermsAndPrivacyPolicyAccepted, acceptedAtUnixTimestamp 
                 FROM consents 
                 WHERE email = ?`, 
                 [email.toLowerCase()]);
    
            if (data.rows.length > 0) {
                const row = data.rows.item(0);
    
                return {
                    email: email,
                    wasTermsAndPrivacyPolicyAccepted: row.wasTermsAndPrivacyPolicyAccepted == 1,
                    acceptedAtUnixTimestamp: row.acceptedAtUnixTimestamp,
                }
            } 
    
            return null;
        } catch (error) {
            this._logger.error("database.injectable.ts->tryGetUserConsents()", error);
            throw error;
        }
	}

	public async saveUserDetails(details: UserDetailsEntity) : Promise<void> {	
        try {
            const jsonDetails = JSON.stringify(details);
            const userId = await this.tryGetUserId();

            await this.database.transaction(tx => tx.executeSql(
                `SELECT * FROM users WHERE userId = ?`,
                [userId],
                (tx1: Transaction, data) => {
                    if(data.rows.length > 0) {
                        tx1.executeSql(
                            `UPDATE users SET jsonDetails = ? WHERE userId = ?`,
                            [jsonDetails, userId])
                    } else {
                        tx1.executeSql(
                            `INSERT INTO users (userId, jsonDetails) VALUES (?,?)`,
                            [userId, jsonDetails])
                    }
                }
            ));           
        } catch (error) {
            this._logger.error("database.injectable.ts->saveUserDetails()", error);
            throw error;
        }
	}

	public async getUserDetailsOrDefault() : Promise<UserDetailsEntity> {
        try {
            const userId = await this.tryGetUserId();
            const data = await this.database.executeSql(
				`SELECT jsonDetails FROM users WHERE userId = ?`, 
                [userId]
            );               

            let details: UserDetailsEntity;

            if(data.rows.length > 0) {
                const rows = this.getAllRows(data);
                details = JSON.parse(rows[0].jsonDetails);
            } else {
                details = {
                    limits: null,
                    wasHowToScanInstructionShown: false,
                    wasRegisterMeCalled: false
                }
            }

            return details;

        } catch (error) {
            this._logger.error("database.injectable.ts->getUserDetailsOrDefault()", error);
            throw error;
        }
	}

	public async saveTagSuggestions(suggestions: TagSuggestionBranchEntity) : Promise<void> {       
        try {
            const jsonSuggestions = JSON.stringify(suggestions.suggestions);
            const userId = await this.tryGetUserId();

            await this.database.transaction(tx => tx.executeSql(
                `SELECT * FROM suggestions WHERE userId = ? AND productLettersName = ?`,
                [userId, suggestions.productLettersName],
                (tx1: Transaction, data) => {
                    if(data.rows.length > 0) {
                        tx1.executeSql(
                            `UPDATE suggestions SET jsonSuggestions = ? WHERE userId = ? AND productLettersName = ?`,
                             [jsonSuggestions, userId, suggestions.productLettersName]);
                    } else {
                        tx1.executeSql(
                            `INSERT INTO suggestions (productLettersName, userId, jsonSuggestions) VALUES (?,?,?)`,
                             [suggestions.productLettersName, userId, jsonSuggestions]);
                    }
                }));           
        } catch (error) {
            this._logger.error("database.injectable.ts->saveTagSuggestions()", error);
            throw error;
        }
	}

	public async getTagSuggestions() : Promise<TagSuggestionBranchEntity[]> {
        try {
            const userId = await this.tryGetUserId();
            const data = await this.database.executeSql(
				`SELECT productLettersName, jsonSuggestions FROM suggestions WHERE userId = ?`, 
                [userId]);

            const result = this
                .getAllRows(data)
                .map(row => {
                    const suggestionBranch: TagSuggestionBranchEntity = {
                        productLettersName: row.productLettersName,
                        suggestions: JSON.parse(row.jsonSuggestions)
                    };

                    return suggestionBranch;
                });

            return result;
        } catch (error) {
            this._logger.error("database.injectable.ts->getTagSuggestions()", error);
            throw error;            
        }
	}

    public async getNamesSuggestions(phrase: string): Promise<NameSuggestionEntity[]> {
        try {
            const userId = await this.tryGetUserId();
            
            const likePhrase = (phrase || '') + '%';

            const data = await this.database.executeSql(
                `SELECT name, count
                FROM nameSuggestions 
                WHERE userId = ? AND name LIKE ?
                ORDER BY count DESC, name ASC
                LIMIT 50`, [userId, likePhrase]);

            const rows = this.getAllRows(data);

            return rows.map(row => ({
                name: row.name,
                count: row.count
            }));
        } catch (error) {
            this._logger.error("database.injectable.ts->getNamesSuggestions()", error);
            throw error;
        }
    }

    public async updateNameSuggestions(name: string, countDiff: number) : Promise<void> {
        try {
            const userId = await this.tryGetUserId();

            await this.database.transaction(tx => tx.executeSql(
                `SELECT * 
                FROM nameSuggestions 
                WHERE userId = ? AND name = ?`,
                [userId, name],
                (tx1: Transaction, data) => {
                    const rows = this.getAllRows(data);

                    if(!rows.length) {
                        if(countDiff <= 0) return;

                        tx1.executeSql(
                            `INSERT INTO nameSuggestions (userId, name, count) 
                            VALUES (?,?,?)`, [userId, name, countDiff]);
                    } else {
                        const localId = rows[0].localId;
                        const count = rows[0].count;
                        const newCount = count + countDiff;

                        if(newCount > 0) {
                            tx1.executeSql(
                                `UPDATE nameSuggestions
                                SET count = ?
                                WHERE localId = ?`, [newCount, localId]);
                        } else {
                            tx1.executeSql(
                                `DELETE FROM nameSuggestions
                                WHERE localId = ?`, [localId]);
                        }    
                    }
                }
            ));            
        } catch (error) {
            this._logger.error("database.injectable.ts->updateNameSuggestions()", error);
            throw error;
        }
    }
	
	public async saveGeneralAppDetails(details: GeneralAppDetailsEntity) : Promise<void> {
		try {
            const jsonDetails = JSON.stringify(details);

            await this.database.transaction(tx => tx.executeSql(
                `SELECT * FROM appGeneralInfo WHERE id = ?`,
                [GENERAL_APP_DETAILS_ENTITY_ID],
                (tx1: Transaction, data) => {
                    if(data.rows.length > 0) {
                        tx1.executeSql(
                            `UPDATE appGeneralInfo SET jsonDetails = ? WHERE id = ?`,
                            [jsonDetails, GENERAL_APP_DETAILS_ENTITY_ID]);
                    } else {
                        tx1.executeSql(
                            `INSERT INTO appGeneralInfo (id, jsonDetails) VALUES (?,?)`,
                            [GENERAL_APP_DETAILS_ENTITY_ID, jsonDetails]);
                    }
                }
            ));
        } catch (error) {
            this._logger.error("database.injectable.ts->saveGeneralAppDetails()", error);
            throw error;
        }
	}

	public async getGeneralAppDetails() : Promise<GeneralAppDetailsEntity> {
        try {
            const data = await this.database.executeSql(
                `SELECT jsonDetails FROM appGeneralInfo WHERE id = ?`, 
                [GENERAL_APP_DETAILS_ENTITY_ID]);
    
            if (data.rows.length > 0) {
                const row = data.rows.item(0);
    
                const details = JSON.parse(row.jsonDetails);
    
                return details;
            } 
    
            return null;
        } catch (error) {
            this._logger.error("database.injectable.ts->getGeneralAppDetails()", error);
            throw error;
        }
	}

	private async tryGetUserId(): Promise<string> {
        const userId = getUserId();

        if(userId) return userId;

        throw "user id not available";
	}


	private getAllRows(data: any): any[] {
		const result = [];

		for (var i = 0; i < data.rows.length; i++) {									
			result.push(data.rows.item(i));
		}

		return result;
	}
}