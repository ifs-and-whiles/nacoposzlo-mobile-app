import { Component, OnInit, OnDestroy } from '@angular/core';
import { NetworkState, NetworkService } from '../../utils/network.service';
import { Subscription } from 'rxjs';
import { AlertController } from '@ionic/angular';

@Component({
	selector: 'app-network-icon',
	templateUrl: 'network-icon.component.html',
	styleUrls: ['network-icon.component.scss'],
})
export class NetworkIconComponent implements OnInit, OnDestroy {
    private _networkSubscription: Subscription

    public isOnline: boolean = true;

    constructor(
        private _networkService: NetworkService,
        private _alertController: AlertController) {

    }

    ngOnInit(): void {
        this._networkSubscription = this._networkService.networkSubject.subscribe({
            next: (networkState) => {
                this.isOnline = networkState === NetworkState.ONLINE;
            }
        })
    }

    ngOnDestroy(): void {
        this._networkSubscription.unsubscribe();
    }

    async click() {
        const problemAlert = await this._alertController.create({
			header:  "Brak internetu",
			message: "Połącz się z internetem aby móc skanować paragony lub dodawać, usuwać albo modyfikować wydatki.",
			buttons: [{
				text: 'Rozumiem',
				role: 'cancel',
				cssClass: 'text-medium',
			}]
		});
	  
		await problemAlert.present();
    }
}