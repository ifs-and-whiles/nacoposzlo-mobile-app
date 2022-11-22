import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackButtonManager } from '../../managers/back-button.manager';

export interface ReceiptFilter {
    tagIds: string[];
}

@Component({
	selector: 'app-receipt-filters',
	templateUrl: 'receipt-filters.modal.html',
	styleUrls: ['receipt-filters.modal.scss']
})
export class ReceiptFiltersModal implements OnInit, OnDestroy{

    private _backButtonSubscription: Subscription;

    public tagIds: string[] = [];

    @Input() set filters(value: ReceiptFilter){
        this.setTagIds(value);
    }

    constructor(
		private _modalController: ModalController,
		private _backButtonManager: BackButtonManager) {}

	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

    public cancel() {
        this._modalController.dismiss();
    }
    
    public clear() {
        this.setTagIds({
            tagIds: []
        });
    }

    private setTagIds(filters: ReceiptFilter) {
        this.tagIds = filters.tagIds.slice();
    }

    public filter() {
        const filters: ReceiptFilter = {
            tagIds: this.tagIds.slice()
        };

        this._modalController.dismiss(filters);
    }
}