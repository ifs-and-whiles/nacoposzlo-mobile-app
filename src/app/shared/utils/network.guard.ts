import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NetworkService, NetworkState } from './network.service';
import { AlertController } from '@ionic/angular';


@Injectable({
	providedIn: 'root'
})
export class NetworkGuard implements OnDestroy{
    private _networkSubscription: Subscription;
    private _isOnline: boolean = false;

    constructor(
        private _networkService: NetworkService,
        private _alertController: AlertController) {
        this._networkSubscription = this._networkService.networkSubject.subscribe({
            next: (networkState) => this._isOnline = networkState === NetworkState.ONLINE
        })
    }                

    ngOnDestroy(): void {
        this._networkSubscription.unsubscribe();
    }

    public async runIfOnlineAsync(func: () => Promise<void>) {
        if(this._isOnline) {
            return await func();
        }
    }

    public async guard(func: () => any, noInternetFunc?: () => any) {
        if(this._isOnline) {
            return func();
        } else {
            const problemAlert = await this._alertController.create({
                header:  "Brak internetu",
                message: "Nie można wykonać wybranej operacji. Połącz się z internetem i spróbuj ponownie.",
                buttons: [{
                    text: 'Rozumiem',
                    role: 'cancel',
                    cssClass: 'text-medium',
                }]
            });
          
            await problemAlert.present();

            if(noInternetFunc) return noInternetFunc();
        }
    }

    public async guardAsync(func: () => Promise<void>, noInternetFunc?: () => Promise<void>) {
        if(this._isOnline) {
            return await func();
        } else {
            const problemAlert = await this._alertController.create({
                header:  "Brak internetu",
                message: "Nie można wykonać wybranej operacji. Połącz się z internetem i spróbuj ponownie.",
                buttons: [{
                    text: 'Rozumiem',
                    role: 'cancel',
                    cssClass: 'text-medium',
                }]
            });
          
            await problemAlert.present();

            if(noInternetFunc) 
                return await noInternetFunc();
        }
    }
}