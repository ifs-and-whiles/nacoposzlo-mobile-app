import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
@Component({
	selector: 'app-privacy-policy',
	templateUrl: 'privacy-policy.modal.html',
	styleUrls: ['privacy-policy.modal.scss']
})
export class PrivacyPolicyModal implements OnInit, OnDestroy {
    
    private _backButtonSubscription: Subscription;

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
}