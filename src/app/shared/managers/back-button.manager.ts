import { Injectable } from '@angular/core';
import { AlertController, PickerController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { GlobalActionsManager } from './global-actions.manager';
import { Location } from '@angular/common';

const timeToExitDuration = 250;

@Injectable({
	providedIn: 'root'
})
export class BackButtonManager {
    private _lastTimeBackPressed: number;

    constructor(
        private _platform: Platform,
        private _pickerController: PickerController,
        private _alertController: AlertController,
        private _globalActionsManager: GlobalActionsManager,
        private _location: Location){
    }

    public handleBackButton(callback:(locationBack: () => void, exitApp: () => void) => void | Promise<void>): Subscription {
        //this value has to be this big, otherwise default behavior of back button is not turned off
        //so you wont be able to perform manual modal dismissing otherwise
        const hugePriority = 1000;

        return this
            ._platform
            .backButton
            .subscribeWithPriority(hugePriority, async () => {
                this.tryExitAppOnQuickDoubleClick();

                if(this.hideGlobalActionsIfVisible()) return;
                if(await this.hidePickerIfVisible()) return;
                if(await this.hideAlertIfVisible()) return;
        
                callback(
                    () => this.tryGoBack(), 
                    () => this.exitApp());
            });
    } 

    private tryGoBack() {
        const currentState: any = this._location.getState();
        this._location.back();
        
        setTimeout(() => {
            const newState: any = this._location.getState();

            if(currentState.navigationId == newState.navigationId) {
                this.exitApp();
            }
        }, 200);        
    }

    private tryExitAppOnQuickDoubleClick() {
        if (this.shouldExitApp()) {
            this.exitApp();
        } else {
            this._lastTimeBackPressed = new Date().getTime();
        }
    }

    private exitApp() {        
        navigator['app'].exitApp();
    }

    private hideGlobalActionsIfVisible(): boolean {
        return this._globalActionsManager.hideIfVisible();
    }

    private async hidePickerIfVisible(): Promise<boolean> {
        const picker = await this._pickerController.getTop();

        if(picker) {
            await this._pickerController.dismiss();
            return true
        }

        return false;
    }

    private async hideAlertIfVisible(): Promise<boolean> {
        const alert = await this._alertController.getTop();

        if(alert) {
            await this._alertController.dismiss();
            return true
        }

        return false;
    }

    private shouldExitApp(): boolean {
        if(!this._lastTimeBackPressed) return false;

        var currentDate = new Date().getTime();
        
        return (currentDate - this._lastTimeBackPressed) < timeToExitDuration;
    }
}