import { Directive, HostListener } from '@angular/core';
import { KeyboardManager } from '../managers/keyboard.manager';

@Directive({
	selector: '[appHideKeyboardOnEnter]'
})
export class HideKeyboardOnEnterDirective {

    constructor(
        private _keyboard: KeyboardManager){        
    }

	@HostListener('keyup.enter')
	onKeyupEnter() {
        this._keyboard.hideKeyboard();
    }
}
