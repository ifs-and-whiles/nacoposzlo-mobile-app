import { Injectable } from '@angular/core';
import { BehaviorSubject, PartialObserver, Subject, Subscription } from 'rxjs';
import { Month } from './month';

export interface ChangeTabVisibilityCommand {
	sourceView: string;
    isTabVisible: boolean;
}

export interface ShowReceiptCommand {
    receiptLocalId: number;
}

export interface ShowFilteredExpensesCommand {
    isDateFilterOn: boolean;
    dateFilter: {
        fromUnixTimestamp: number;
        toUnixTimestamp: number;
    } | null;

    selectedMonth: Month;

    isTagFilterOn: boolean;
    tagFilter: {
        tagIds: string[];
    }
}

export interface ExecuteGlobalActionCommand{
	type: GlobalActionType
}

export enum GlobalActionType {
	useCamera = 'use_camera',
	useGallery = 'use_gallery',
	addExpense = 'add_expense'
}

@Injectable({
	providedIn: 'root'
})
export class Bus {
	private _tabVisibilityCommandSubject: Subject<ChangeTabVisibilityCommand> = new Subject<ChangeTabVisibilityCommand>();
    
    public subscribeToChangeTabVisibilityCommand(observer?: PartialObserver<ChangeTabVisibilityCommand>): Subscription {
        return this._tabVisibilityCommandSubject.subscribe(observer);
    }

	public sendChangeTabVisibilityCommand(command: ChangeTabVisibilityCommand) {
		this._tabVisibilityCommandSubject.next(command);
    }
    
    private _showReceiptCommandSubject: Subject<ShowReceiptCommand> = new Subject<ShowReceiptCommand>();
	
	public subscribeToShowReceiptCommand(observer?: PartialObserver<ShowReceiptCommand>): Subscription {
        return this._showReceiptCommandSubject.subscribe(observer);
    }

	public sendShowReceiptCommand(command: ShowReceiptCommand) {
		this._showReceiptCommandSubject.next(command);
    }
    
    private _showFilteredExpensesCommandSubject: BehaviorSubject<ShowFilteredExpensesCommand> = new BehaviorSubject<ShowFilteredExpensesCommand>(null);
        
    public subscribeToShowFilteredExpensesCommand(observer?: PartialObserver<ShowFilteredExpensesCommand>): Subscription {
        return this._showFilteredExpensesCommandSubject.subscribe(observer);
    }

	public sendShowFilteredExpensesCommand(command: ShowFilteredExpensesCommand) {
        this._showFilteredExpensesCommandSubject.next(command);
    }
    
    private _executeGlobalActionCommandSubject: Subject<ExecuteGlobalActionCommand> = new Subject<ExecuteGlobalActionCommand>();
    
    public subscribeToExecuteGlobalActionCommand(observer?: PartialObserver<ExecuteGlobalActionCommand>): Subscription {
        return this._executeGlobalActionCommandSubject.subscribe(observer);
    }

	public sendExecuteGlobalActionCommand(command: ExecuteGlobalActionCommand) {
		this._executeGlobalActionCommandSubject.next(command);
    }
}