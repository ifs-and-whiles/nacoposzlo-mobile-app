import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';

@Component({
	selector: 'app-report-bug',
	templateUrl: 'report-bug.modal.html',
	styleUrls: ['report-bug.modal.scss']
})
export class ReportBugModal implements OnInit, OnDestroy {
    
    private _backButtonSubscription: Subscription;

	constructor(
        private _modalController: ModalController,
        private _backButtonManager: BackButtonManager) {}

	public cancel() {	
		this._modalController.dismiss();
    }
    
    ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}
}