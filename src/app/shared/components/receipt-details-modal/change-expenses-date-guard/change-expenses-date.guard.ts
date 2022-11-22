import { Injectable} from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
	providedIn: 'root'
})
export class ChangeExpensesDateGuard{
    constructor(
        private _alertController: AlertController) {
    }                

    public async guard(saveFunc: () => any) {
        const problemAlert = await this._alertController.create({
            header:  'Nadpisać datę wydatków?',
            message: `Nowa data paragonu zostanie przypisana do wszystkich powiązanych wydatków.<br><br>Czy na pewno chcesz zapisać zmiany?`,
            buttons: [{
                text: 'Anuluj',
                role: 'cancel',
                cssClass: 'text-medium',
            }, {
                text: 'Zapisz zmiany',
                cssClass: 'text-primary',
                handler: () => saveFunc()
            }]
        });
        
        await problemAlert.present();		
    }
}