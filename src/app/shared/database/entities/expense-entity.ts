export interface ExpenseEntity {
	localId: number;
	cloudId: string;
	receiptLocalId: number | null;
	orderInReceipt: number | null;

  	name: string;
  	dateUnixTimestamp: number;
  	quantity: number;
  	unitPrice: number;
  	amount: number;
	tags: string[];
	isBeingDeleted: boolean;
}

export class ExpenseDbUtils {
	public static parseDbTags(dbTags: any): string[] {
		return dbTags ? JSON.parse(dbTags) : [];
	}

	public static parseDbAmountInCents(dbAmountInCents: number): number {
		return dbAmountInCents / 100;
	}
}