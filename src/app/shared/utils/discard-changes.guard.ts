import { Injectable} from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
	providedIn: 'root'
})
export class DiscardChangesGuard{
    constructor(
        private _alertController: AlertController) {
    }                

    public async guard(discardFunc: () => any, customMessage?: string) {
        const alert = await this._alertController.create({
            header:  'Odrzucić zmiany?',
            message: customMessage == null 
                ? `Zmiany nie zostały zapisane, czy na pewno chcesz je odrzucić?`
                : customMessage,
            buttons: [{
                text: 'Anuluj',
                role: 'cancel',
                cssClass: 'text-medium',
            }, {
                text: 'Odrzuć zmiany',
                cssClass: 'text-danger',
                handler: () => {
                    discardFunc();
                }
            }]
        });
      
        await alert.present();
    }
}