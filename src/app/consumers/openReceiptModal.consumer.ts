import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { DatabaseService } from '../shared/database/database.injectable';
import { Bus } from '../shared/bus';
import { ReceiptModal } from '../shared/components/receipt-modal/receipt.modal';
import { ApiLogger } from '../shared/api-logger';

@Injectable({
	providedIn: 'root'
})
export class OpenReceiptModalConsumer implements OnDestroy {
    
    private _showReceiptSubscription: Subscription;

    constructor(
        private _modalController: ModalController,
        private _database: DatabaseService,
        private _bus: Bus,
        private _logger: ApiLogger
    ) { 
        this._showReceiptSubscription = this
            ._bus
            .subscribeToShowReceiptCommand({
                next: command => setTimeout(() => this.openReceiptModal(command.receiptLocalId))
            });
    }
    
    ngOnDestroy(): void {
        this._showReceiptSubscription.unsubscribe();
    }

    private async openReceiptModal(receiptLocalId: number) {
        try {
            const receipt = await this
                ._database
                .getReceipt(receiptLocalId);

            const modal = await this
                ._modalController
                .create({
                    component: ReceiptModal,
                    componentProps: {
                        receipt: receipt
                    }
                });

            await modal.present();            
        } catch (error) {
            this._logger.error("openReceiptModal.consumer.ts->openReceiptModal()", error);
            throw error;
        }
    }
}