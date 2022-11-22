export interface ExpenseToExportEntity {
  	name: string;
  	dateUnixTimestamp: number;
  	quantity: number;
  	unitPrice: number;
  	amount: number;
	tags: string[];
}