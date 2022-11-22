import { Injectable } from '@angular/core';
import { IonFab } from '@ionic/angular';

@Injectable({
	providedIn: 'root'
})
export class GlobalActionsManager {
    public areActionsShown: boolean;
    private _getActionsFabFunc: () => IonFab;


    public initialize(getActionsFabFunc: () => IonFab) {
        this._getActionsFabFunc = getActionsFabFunc;
    }

    public toggleVisibility() {
        this.areActionsShown = !this.areActionsShown;
    }

    public hideIfVisible() : boolean {		        
        if(!this.areActionsShown) 
            return false;

        this.areActionsShown = false;
        const actionsFab = this._getActionsFabFunc();

        if(actionsFab) {
            actionsFab.close();
        }

        return true;
	}
}