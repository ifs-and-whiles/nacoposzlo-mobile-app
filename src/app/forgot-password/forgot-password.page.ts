import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NetworkGuard } from '../shared/utils/network.guard';
import { NgModel } from '@angular/forms';
import { NgModelUtils } from '../shared/utils/ng-model-utils';
import { Auth } from 'aws-amplify';
import { ApiLogger } from '../shared/api-logger';

@Component({
	selector: 'app-forgot-password',
	templateUrl: './forgot-password.page.html',
	styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage {
	public email: string;
	public newPassword: string;
	public repeatedPassword: string;
	public verificationCode: number;

	public isVerificationCodeSendingSkipped: boolean;
	public isVerificationCodeSent: boolean;
	public isLoading: boolean;
	public isPasswordChanged: boolean;
	public errorCode: string;

	@ViewChild("emailTxt") emailTxt: NgModel;

	@ViewChild("resetEmailTxt") resetEmailTxt: NgModel;
	@ViewChild("resetCodeTxt") resetCodeTxt: NgModel;
	@ViewChild("resetPasswordTxt") resetPasswordTxt: NgModel;
	@ViewChild("resetRepeatedPasswordTxt") resetRepeatedPasswordTxt: NgModel;
	
	constructor(
		private _router: Router,
        private _networkGuard: NetworkGuard,
        private _logger: ApiLogger
	) { }

	ionViewWillEnter()	{
		this.email = null;
		this.newPassword = null;
		this.repeatedPassword = null;
		this.verificationCode = null;
		this.isVerificationCodeSent = false;
		this.isPasswordChanged = false;
		this.errorCode = null;
	}

	public cancel() {
		this._router.navigate(['./login'])
	}

	public tryInitiateForgotPassword() {
		if(this.isLoading)
			return;

		if(this.emailTxt.invalid) {
            NgModelUtils.touchIfInvalid(this.emailTxt);
        } else {          
            this._networkGuard.guardAsync(() => this.initiateForgotPassword());            
        }     
	}

	private async initiateForgotPassword() {
        try {
            this.isLoading = true;

            //todo what are the possible errors
            await Auth.forgotPassword(this.email);

            this.isVerificationCodeSent = true;

        } catch (error) {            
            this._logger.error("forgot-password.page.ts->resetPassword()", error);
            this._logger.somethingWentWrongToast();
        } finally {
            this.isLoading = false;
        }
	}

	public tryResetPassword() {
		if(this.isLoading)
			return;

		if(this.resetEmailTxt.invalid
			|| this.resetCodeTxt.invalid
			|| this.resetPasswordTxt.invalid
			|| this.resetRepeatedPasswordTxt.invalid) {

            NgModelUtils.touchIfInvalid(this.resetEmailTxt);
            NgModelUtils.touchIfInvalid(this.resetCodeTxt);
            NgModelUtils.touchIfInvalid(this.resetPasswordTxt);
            NgModelUtils.touchIfInvalid(this.resetRepeatedPasswordTxt);
        } else {          
            this._networkGuard.guardAsync(() => this.resetPassword());            
        }     
	}

	private async resetPassword() {
        try {            
		    this.errorCode = null;

            if (this.repeatedPassword != this.newPassword) {
                this.errorCode = "PasswordsDontMatch";
            } else {			
                this.isLoading = true;

                await Auth.forgotPasswordSubmit(
                    this.email,
                    this.verificationCode.toString(), 
                    this.newPassword);

                this.isPasswordChanged = true;
            }
        } catch (error) {
            this._logger.error("forgot-password.page.ts->resetPassword()", error);
    
            if(error.code) {
                this.errorCode = error.code;
            } else {
                this._logger.somethingWentWrongToast();
            }
        } finally {
            this.isLoading = false;
        }
	}

	public skipCodeSending() {
		this.isVerificationCodeSendingSkipped = true;
		this.isVerificationCodeSent = true;
	}
}
