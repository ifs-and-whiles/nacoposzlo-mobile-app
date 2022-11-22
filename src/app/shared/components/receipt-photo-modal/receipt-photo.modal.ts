import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BackButtonManager } from '../../managers/back-button.manager';
import { Subscription } from 'rxjs';
import { DateParser } from '../../dateParser';
import { ReceiptItem } from 'src/app/receipts/receipts.page';
import { SocialSharingManager } from '../../managers/social-sharing.manager';
import { ReceiptsManager } from '../../managers/receipts.manager';


@Component({
	selector: 'app-receipt-photo-modal',
	templateUrl: 'receipt-photo.modal.html',
	styleUrls: ['receipt-photo.modal.scss']
})
export class ReceiptPhotoModal implements OnInit, OnDestroy { 

	private _backButtonSubscription: Subscription;

    @Input() receipt: ReceiptItem;

    @ViewChild('canvas') canvas;

    public isLoading: boolean;

    private _imageBlob: Blob;

	constructor(
		private _modalController: ModalController,
		private _backButtonManager: BackButtonManager,
        private _socialManager: SocialSharingManager,
        private _receiptsManager: ReceiptsManager) {}

	ngOnInit(): void {
		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());

        this.isLoading = true;

        this._receiptsManager
            .getImage(this.receipt.cloudId)
            .then(blob => {
                this._imageBlob = blob;

                const canvas = this.canvas.nativeElement;
                const ctx = canvas.getContext('2d')
                
                const img = new Image()
                img.onload = (event) => {
                    const target: any = event.target;
                    const height = target.height;
                    const width = target.width;

                    canvas.width = width;
                    canvas.height = height;

                    URL.revokeObjectURL(target.src) 
                    ctx.drawImage(event.target, 0, 0)
                }
                img.src = URL.createObjectURL(blob)
            })
            .finally(() => this.isLoading = false);
	}

	ngOnDestroy(): void {
		this._backButtonSubscription.unsubscribe();
	}

	public async cancel() {
		this._modalController.dismiss();
	}

    public async exportImage() {
        await this
            ._socialManager
            .share({
                blob: this._imageBlob,
                name: `${this.receipt.seller}_${DateParser.formatDate(this.receipt.dateUnixTimestamp)}`,
                fileExtension: "jpeg"
            });
    }
}