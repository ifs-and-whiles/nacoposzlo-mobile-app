import { Injectable, OnDestroy } from '@angular/core';
import { Network } from '@ionic-native/network/ngx';
import { Subscription, BehaviorSubject } from 'rxjs';
import { Platform } from '@ionic/angular';

export enum NetworkState {
    OFFLINE = 0,
    ONLINE = 1
}

@Injectable({
	providedIn: 'root'
})
export class NetworkService implements OnDestroy{
    private _connectSubscription: Subscription;
    private _disconnectSubscription: Subscription;
    private _networkStabilizationTime = 3000;

    public networkSubject: BehaviorSubject<NetworkState> = new BehaviorSubject<NetworkState>(NetworkState.ONLINE);

    constructor(
        private _network: Network,
        private _platform: Platform) {
        
       this._platform.ready().then(() => {
            setTimeout(() => {
                this.networkSubject.next(this.isOnline() ? NetworkState.ONLINE : NetworkState.OFFLINE);

                this._disconnectSubscription = this._network.onDisconnect().subscribe({
                    next: () => {
                        this.networkSubject.next(NetworkState.OFFLINE);
                    }
                });
    
                this._connectSubscription = this._network.onConnect().subscribe({
                    next: () => {
                        this.networkSubject.next(NetworkState.ONLINE);
                    }
                });
            }, this._networkStabilizationTime);           
       });
    }                

    ngOnDestroy(): void {
        this._disconnectSubscription.unsubscribe();
        this._connectSubscription.unsubscribe();
    }

    public isOnline() {
        return this._network.type != this._network.Connection.NONE;
    }
}