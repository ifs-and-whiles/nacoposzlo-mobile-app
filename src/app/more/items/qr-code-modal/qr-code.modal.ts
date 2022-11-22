import { Component, OnInit, OnDestroy, Input} from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Subscription } from "rxjs";
import { BackButtonManager } from "src/app/shared/managers/back-button.manager";


@Component({
	selector: 'app-qr-code-modal',
	templateUrl: 'qr-code.modal.html',
	styleUrls: ['qr-code.modal.scss']
})
export class QrCodeModal implements OnInit, OnDestroy{
    private _backButtonSubscription: Subscription;  

    @Input() qrCode: string;

    constructor(
        private _modalController: ModalController,
        private _backButtonManager: BackButtonManager) { }

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