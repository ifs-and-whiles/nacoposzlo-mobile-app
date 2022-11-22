export interface ExpenseToDeleteEntity { 
	localId: number;
	cloudId: string;
	receiptLocalId: number;
	tags: string[];
    name: string;
}