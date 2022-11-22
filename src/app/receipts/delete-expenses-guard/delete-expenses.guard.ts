import { Injectable} from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
	providedIn: 'root'
})
export class DeleteExpensesGuard{
    constructor(
        private _alertController: AlertController) {
    }                

    public async guard(receiptsLength: number, deleteFunc: () => any, cancelFunc: () => any) {
        const problemAlert = await this._alertController.create({
            header:  receiptsLength == 1 ? 'Usuń paragon' : 'Usuń paragony',
            message: `Wraz z ${receiptsLength == 1 ? 'wybranym paragonem' : 'wybranymi paragonami'} zostaną usunięte wszystkie powiązane wydatki.<br><br>Czy na pewno chcesz to zrobić?`,
            buttons: [{
                text: 'Anuluj',
                role: 'cancel',
                cssClass: 'text-medium',
                handler: () => cancelFunc()
            }, {
                text: 'Usuń wraz z wydatkami',
                cssClass: 'text-danger',
                handler: () => deleteFunc()
            }]
        });
      
        await problemAlert.present();
    }
}