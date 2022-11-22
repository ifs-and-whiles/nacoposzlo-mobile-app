import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { NgModel } from '@angular/forms';
import { NgModelUtils } from 'src/app/shared/utils/ng-model-utils';
import { NetworkGuard } from 'src/app/shared/utils/network.guard';
import { KeyboardManager } from 'src/app/shared/managers/keyboard.manager';
import { Subscription } from 'rxjs';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import { Auth } from 'aws-amplify';
import { ApiLogger } from 'src/app/shared/api-logger';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { QrCodeModal } from '../qr-code-modal/qr-code.modal';

@Component({
	selector: 'app-mfa',
	templateUrl: 'mfa.modal.html',
	styleUrls: ['mfa.modal.scss']
})
export class MfaModal implements OnInit, OnDestroy{

    public isLoading: boolean;
    public isKeyboardVisible: boolean;

    public isMfaSetupOn: boolean;
    public totpSecret: string;
    public oneTimeCode: string;
    public errorCode: string;

	private _keyboardStateSubscription: Subscription;
    private _backButtonSubscription: Subscription;

    public isMfaOn: boolean = false;
    
    @ViewChild("oneTimeCodeTxt") oneTimeCodeTxt: NgModel;

	constructor(
        private _alertController: AlertController,
        private _toastController: ToastController,
        private _modalController: ModalController,
        private _networkGuard: NetworkGuard,
		private _keyboard: KeyboardManager,
        private _backButtonManager: BackButtonManager,
        private _clipboard: Clipboard,
        private _logger: ApiLogger) {}


    ngOnInit(): void {
        this._keyboardStateSubscription = this._keyboard
			.onKeyboardStateChange()
			.subscribe({
				next: state => this.isKeyboardVisible = state.isVisible
            });
            
        this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());

        this.checkUserMfa();
    }

    ngOnDestroy(): void {
        this._keyboardStateSubscription.unsubscribe();
        this._backButtonSubscription.unsubscribe();
    }

    private async checkUserMfa() {
        try {
            const user = await Auth.currentAuthenticatedUser();
            const mfa = await Auth.getPreferredMFA(user);

            if(mfa == "NOMFA") {
                this.isMfaOn = false;
            } else if (mfa == "SOFTWARE_TOKEN_MFA") {
                this.isMfaOn = true;
            } else {
                this._logger.error("mfa.modal.ts->checkUserMfa()", `Uknown MFA: ${mfa}`);  
            }
        } catch (error) {
            this._logger.error("mfa.modal.ts->checkUserMfa()", error);            
        }
    }

	public cancel() {	
		this._modalController.dismiss();
    }

    public async turnOnMfa() {
        try {
            await this._networkGuard.guardAsync(async () => {
                const user = await Auth.currentAuthenticatedUser();
                const secret = await Auth.setupTOTP(user);
    
                this.totpSecret = secret;
                this.isMfaSetupOn = true;
            });
        } catch (error) {
            this._logger.error("mfa.modal.ts->turnOnMfa()", error);
            this._logger.somethingWentWrongToast();
        }
    }

    public async copySecretToClipboard() {
        try {
            await this._clipboard.copy(this.totpSecret);

            const toast = await this._toastController.create({
                message: `Skopiowano do schowka`,
                position: 'top',
                color: 'success',
                duration: 1000,
                animated: true
            });
    
            await toast.present();
        } catch (error) {
            this._logger.error("mfa.modal.ts->copySecretToClipboard()", error);
            this._logger.somethingWentWrongToast();
        }
    }

    public async tryConfirmMfa() {
        if(this.oneTimeCodeTxt.invalid) {
            NgModelUtils.touchIfInvalid(this.oneTimeCodeTxt);
        }else {          
            this._networkGuard.guardAsync(() => this.confirmMfa());            
        }   
    }

    private async confirmMfa() {        
        try {
            await this._networkGuard.guardAsync(async () => {
                const user = await Auth.currentAuthenticatedUser();
                await Auth.verifyTotpToken(user, this.oneTimeCode.toString());
                await Auth.setPreferredMFA(user, 'TOTP');
                await this.checkUserMfa();
                this.isMfaSetupOn = false;
            });           
        } catch (error) {
            this._logger.error("mfa.modal.ts->confirmMfa()", error);            

            if(error.code) {
                this.errorCode = error.code;
            } else {                
                this._logger.somethingWentWrongToast();
            }
        }
    }

    public async turnOffMfa() {
        try {
            await this._networkGuard.guardAsync(async () => {
                const user = await Auth.currentAuthenticatedUser();
                await Auth.setPreferredMFA(user, 'NOMFA');
                await this.checkUserMfa();
            });             
        } catch (error) {            
            this._logger.error("mfa.modal.ts->turnOffMfa()", error);
            this._logger.somethingWentWrongToast();
        }
    }

    public async tryTurnOffMfa() {
		const alert = await this._alertController.create({
			message: "Czy na pewno chcesz wyłączyć uwierzytelnianie dwuskładnikowe (2FA)?",
			buttons: [{
				text: 'Anuluj',
				role: 'cancel',
				cssClass: 'text-medium',
			}, {
				text: 'Wyłącz 2FA',
				cssClass: 'text-danger',
				handler: () => this.turnOffMfa()				
			}]
		});
	  
		await alert.present();
	}

    public async showQrCode() {
        try {
            const user = await Auth.currentAuthenticatedUser();

            const qrCode = `otpauth://totp/${user.attributes.email}?secret=${this.totpSecret}&issuer=NaCoPoszlo`;

            const modal = await this
                ._modalController
                .create({
                    component: QrCodeModal,
                    cssClass: "small-modal small-modal--rectangle",
                    componentProps: {
                        qrCode: qrCode
                    }
                });

            await modal.present();
        } catch (error) {
            this._logger.error("mfa.modal.ts->showQrCode()", error);    
            this._logger.somethingWentWrongToast();       
        }
    }

    public openGoogleAuthenticator() {
        window.open("https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2", "_system");
    }

    public openLastPassAuthenticator() {        
        window.open("https://play.google.com/store/apps/details?id=com.lastpass.authenticator", "_system");
    }
}