import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { NgModel } from '@angular/forms';
import { NgModelUtils } from 'src/app/shared/utils/ng-model-utils';
import { NetworkGuard } from 'src/app/shared/utils/network.guard';
import { KeyboardManager } from 'src/app/shared/managers/keyboard.manager';
import { Subscription } from 'rxjs';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import { Auth } from 'aws-amplify';
import { ApiLogger } from 'src/app/shared/api-logger';

@Component({
	selector: 'app-change-password',
	templateUrl: 'change-password.modal.html',
	styleUrls: ['change-password.modal.scss']
})
export class ChangePasswordModal implements OnInit, OnDestroy{

    public isLoading: boolean;
    public oldPassword: string;
    public newPassword: string;
    public repeatedPassword: string;
    public isPasswordChanged: boolean;
    public errorCode: string;
    public isKeyboardVisible: boolean;

	private _keyboardStateSubscription: Subscription;
    private _backButtonSubscription: Subscription;

	constructor(
        private _modalController: ModalController,
        private _networkGuard: NetworkGuard,
		private _keyboard: KeyboardManager,
        private _backButtonManager: BackButtonManager,
        private _logger:ApiLogger) {}


    ngOnInit(): void {
        this._keyboardStateSubscription = this._keyboard
			.onKeyboardStateChange()
			.subscribe({
				next: state => this.isKeyboardVisible = state.isVisible
            });
            
        this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
    }

    ngOnDestroy(): void {
        this._keyboardStateSubscription.unsubscribe();
        this._backButtonSubscription.unsubscribe();
    }

	public cancel() {	
		this._modalController.dismiss();
    }

    @ViewChild("oldPasswordTxt") oldPasswordTxt: NgModel;
	@ViewChild("newPasswordTxt") newPasswordTxt: NgModel;
    
    public tryChangePassword() {
        if(this.oldPasswordTxt.invalid || this.newPasswordTxt.invalid) {
            NgModelUtils.touchIfInvalid(this.oldPasswordTxt);
            NgModelUtils.touchIfInvalid(this.newPasswordTxt);
        } else if(this.oldPassword === this.newPassword){
            this.errorCode = "PasswordsIdentical";
        } else if (this.repeatedPassword != this.newPassword) {
			this.errorCode = "PasswordsDontMatch";
        }else {          
            this._networkGuard.guardAsync(() => this.changePassword());            
        }     
    }

    private async changePassword() {
        try {
            this.isLoading = true;
            
            const user = await Auth.currentAuthenticatedUser();

            await Auth.changePassword(
                user, 
                this.oldPassword, 
                this.newPassword);

            this.isPasswordChanged = true;

        } catch (error) {           
            this._logger.error("change-password.page.ts->changePassword()", error);
                
            if(error.code) {
                this.errorCode = error.code;
            } else {
                this._logger.somethingWentWrongToast();
            }
        } finally {
            this.isLoading = false;
        }
    }
}