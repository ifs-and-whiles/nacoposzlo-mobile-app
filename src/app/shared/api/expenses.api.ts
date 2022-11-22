import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from './api.configuration';

export interface BulkChangeTagsRequest {
	items: BulkOperationItem<BulkChangeTagsSingleRequest>[];
}

export interface BulkChangeTagsSingleRequest {
	id: string;
	tags: string[];
}

export interface BulkCreateRequest {
	items: BulkOperationItem<CreateSingleRequest>[];
}

export interface CreateSingleRequest {
	receiptId: string;
	date: string;
	seller: {
		name: string,
		postalCode: string,
		location: string,
		taxNumber: string
	};
	title: string;
	totalAmount: number;
	quantity: number;
	unitPrice: number;
	tags: string[];
	comments: string;
}

export interface CreateSingleResult {
	operationId: string;
	entityId: string;
	status: BulkOperationStatus;
}

export interface BulkUpdateRequest {
	items: BulkOperationItem<UpdateSingleRequest>[];
}

export interface UpdateSingleRequest {
	id: string;
	date: string;
	seller: {
		name: string,
		postalCode: string,
		location: string,
		taxNumber: string
	};
	title: string;
	totalAmount: number;
	quantity: number;
	unitPrice: number;
	tags: string[];
	comments: string;
}

export interface BulkDeleteRequest {
	items: BulkOperationItem<DeleteSingleRequest>[];
}

export interface DeleteSingleRequest {
	id: string;
}

export interface BulkOperationItem<TEntity> {
	operationId: string;
	entity: TEntity;
}

export interface BulkOperationItemResult {
	operationId: string;
	status: BulkOperationStatus;
}

export enum BulkOperationStatus
{
	ok = 1,
	unknownError = 2
}

export interface ExpenseDto {
  	name: string;
  	date: Date;
  	quantity: number;
  	unitPrice: number;
  	amount: number;
  	tags: string;
}

interface CreateExpenseRequest {
	date: string;
	receiptId: string | null;
	seller: {
		name: string,
		postalCode: string,
		location: string,
		taxNumber: string
	};
	title: string;
	totalAmount: number;
	quantity: number;
	unitPrice: number;
	tags: string[];
	comments: string;
}

export interface UpdateExpenseRequest {
	id: string;
	date: string;
	seller: {
		name: string,
		postalCode: string,
		location: string,
		taxNumber: string
	};
	title: string;
	totalAmount: number;
	quantity: number;
	unitPrice: number;
	tags: string[];
	comments: string;
}

const httpOptions = {
	headers: new HttpHeaders({
	  'Content-Type':  'application/json',
	})
};

@Injectable({
	providedIn: 'root'
})
export class ExpensesApi {

	constructor(private _http: HttpClient) {}

	public bulkCreateExpenses(request: BulkCreateRequest): Promise<CreateSingleResult[]> {
		return this
			._http
			.post<CreateSingleResult[]>(`${API_URL}/mobile-api/v1/expenses/bulk-create`, request, httpOptions)
			.toPromise();
	}

	public bulkDeleteExpenses(request: BulkDeleteRequest): Promise<BulkOperationItemResult[]> {
		return this
			._http
			.post<BulkOperationItemResult[]>(`${API_URL}/mobile-api/v1/expenses/bulk-delete`, request, httpOptions)
			.toPromise();
	}

	public updateExpense(request: UpdateExpenseRequest) : Promise<void> {
		return this
			._http
			.post<void>(`${API_URL}/mobile-api/v1/expenses/update`, request, httpOptions)
			.toPromise();
	} 

	public bulkUpdateExpenses(request: BulkUpdateRequest): Promise<BulkOperationItemResult[]> {
		return this
			._http
			.post<BulkOperationItemResult[]>(`${API_URL}/mobile-api/v1/expenses/bulk-update`, request, httpOptions)
			.toPromise();
	}

	public bulkChangeTagsExpenses(request: BulkChangeTagsRequest): Promise<BulkOperationItemResult[]> {
		return this
			._http
			.post<BulkOperationItemResult[]>(`${API_URL}/mobile-api/v1/expenses/bulk-change-tags`, request, httpOptions)
			.toPromise();
	}
}