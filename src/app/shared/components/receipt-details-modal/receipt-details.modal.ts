import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ReceiptItem } from '../../../receipts/receipts.page';
import { DateParser } from 'src/app/shared/dateParser';
import { NgForm, NgModel } from '@angular/forms';
import { ControlUtils, NgModelUtils } from '../../utils/ng-model-utils';
import { NetworkGuard } from '../../utils/network.guard';
import { DiscardChangesGuard } from '../../utils/discard-changes.guard';
import { ChangeExpensesDateGuard } from './change-expenses-date-guard/change-expenses-date.guard';
import { BackButtonManager } from '../../managers/back-button.manager';
import { Subscription } from 'rxjs';

interface ReceiptDetails {
	dateUnixTimestamp: number;
	seller: string;
	totalAmount: number;
}

@Component({
	selector: 'app-receipt-details-modal',
	templateUrl: 'receipt-details.modal.html',
	styleUrls: ['receipt-details.modal.scss']
})
export class ReceiptDetailsModal implements OnInit, OnDestroy { 

	private _backButtonSubscription: Subscription;

	private _originalJson: string;

    public date: string;
	public seller: string;
	public totalAmount: number;

	@Input() set receipt(value: ReceiptItem){
		this.date = value.dateUnixTimestamp 
            ? DateParser.formatIso8061(value.dateUnixTimestamp)
            : undefined;

        this.seller = value.seller;
        this.totalAmount = value.totalAmount;
                    
		this._originalJson = JSON.stringify(
			this.getCurrentDetails());
	};

	@Input() missingDetailsMode: boolean;

    @ViewChild(NgForm) form: NgForm;

	constructor(
		private _modalController: ModalController,
		private _networkGuard: NetworkGuard,
		private _discardChangesGuard: DiscardChangesGuard,
		private _changeExpensesDateGuard: ChangeExpensesDateGuard,
		private _backButtonManager: BackButtonManager) {}

	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public async ok() {
		if(this.form.invalid) {
			Object
                .values(this.form.controls)
                .forEach(control => ControlUtils.touchIfInvalid(control));
        } else if (!this.missingDetailsMode && this.wasDateChanged()) {
			this._changeExpensesDateGuard.guard(() => this.saveChanges());		
		} else {		
			this.saveChanges();
		}	
	}

	private wasDateChanged() {
		const original = JSON.parse(this._originalJson);
		const current = this.getCurrentDetails();
		return original.dateUnixTimestamp !== current.dateUnixTimestamp;
	}

	private saveChanges() {
		this._networkGuard.guard(() => this._modalController.dismiss({
			details: this.getCurrentDetails()
		}));
	}

	public async cancel() {
		const currentJson =  JSON.stringify(
			this.getCurrentDetails());

		const wasChanged = this._originalJson !== currentJson;

		if(wasChanged) {
			this._discardChangesGuard.guard(() => this._modalController.dismiss());
		} else {		
			this._modalController.dismiss();
		}
	}
	
	private getCurrentDetails(): ReceiptDetails {
		return {
			dateUnixTimestamp: this.date
                ? DateParser.Iso8061ToDateUnixTimestamp(this.date)
                : null,
			seller: this.seller,
			totalAmount: this.totalAmount
		}
	}

    public onTotalAmountChange(value: number) {
        this.totalAmount = value;
    }
}