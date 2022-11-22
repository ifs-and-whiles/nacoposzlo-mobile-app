import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { Subscription, BehaviorSubject } from 'rxjs';
import { Keyboard } from '@ionic-native/keyboard/ngx';

export interface KeyboardState {
    isVisible: boolean;
}

@Injectable({
	providedIn: 'root'
})
export class KeyboardManager implements OnDestroy {
    private keyboardStateSubject: BehaviorSubject<KeyboardState> = new BehaviorSubject({
        isVisible: false
    });

	public onKeyboardStateChange() {
		return this.keyboardStateSubject.asObservable();
    }

    private _keyboardShowSubscription: Subscription;
	private _keyboardHideSubscription: Subscription;
	private _isKeyboardVisible: boolean;

    constructor(
        private _keyboard: Keyboard,
        private _ngZone: NgZone) {

        this._keyboardShowSubscription = this._keyboard
            .onKeyboardWillShow()
            .subscribe({
                next: () => this._ngZone.run(() => {
                    this._isKeyboardVisible = true;
                    this.publishNewKeyboardState();
                })
            });

        this._keyboardHideSubscription = this._keyboard
            .onKeyboardWillHide()
            .subscribe({
                next: () => this._ngZone.run(() => {
                    this._isKeyboardVisible = false;
                    this.publishNewKeyboardState();                   
                })
            });
    }

    ngOnDestroy(): void {        
        this._keyboardShowSubscription.unsubscribe();
		this._keyboardHideSubscription.unsubscribe();
    }  

    private publishNewKeyboardState() {
        this.keyboardStateSubject.next({
            isVisible: this._isKeyboardVisible
        });
    }

    public hideKeyboard() {
        this._keyboard.hide();
    }
}