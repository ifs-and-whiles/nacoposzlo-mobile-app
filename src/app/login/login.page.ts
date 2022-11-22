import { Component, ViewChild, OnInit, OnDestroy, ElementRef} from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, NgModel } from '@angular/forms';
import { UsersManager } from '../shared/managers/users.manager';
import { Subscription } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { KeyboardManager } from '../shared/managers/keyboard.manager';
import { PrivacyPolicyModal } from '../legal/privacy-policy/privacy-policy.modal';
import { TermsModal } from '../legal/terms/terms.modal';
import { DatabaseService } from '../shared/database/database.injectable';
import { DateParser } from '../shared/dateParser';
import { NetworkGuard } from '../shared/utils/network.guard';
import { NgModelUtils } from '../shared/utils/ng-model-utils';
import { BackButtonManager } from '../shared/managers/back-button.manager';
import { TagsManager } from '../shared/managers/tags/tags.manager';
import { Auth } from 'aws-amplify';
import { ApiLogger } from '../shared/api-logger';

@Component({
	selector: 'app-login',
	templateUrl: './login.page.html',
	styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, OnDestroy {
	public email: string;
	public password: string;
	public repeatedPassword: string;

	public isLoading: boolean;
	public signUpErrorCode: string;
    public signUpInvalidParameter: string;

    public signInErrorCode: string;
	public isUserRegisteredSuccessfully: boolean;
    public wasConsentClicked: boolean = false;

	public termsAndPrivacyPolicyConsent: boolean = false;
	
	private _keyboardStateSubscription: Subscription;
	private _backButtonSubscription: Subscription;
  
	public isKeyboardVisible: boolean;
	public isPigOverlayingLogicCard: boolean;

	public selectedSection: string = "login";
    public isMFAChallenged: boolean = false;
    public mfaCode: string = null;
    public user: any = null;

	@ViewChild("form") form: NgForm;

	@ViewChild("emailTxt") emailTxt: NgModel;
	@ViewChild("passwordTxt") passwordTxt: NgModel;

	@ViewChild("registrationEmailTxt") registrationEmailTxt: NgModel;
	@ViewChild("registrationPasswordTxt") registrationPasswordTxt: NgModel;
	@ViewChild("registrationRepeatedPasswordTxt") registrationRepeatedPasswordTxt: NgModel;

    
	@ViewChild("mfaTxt") mfaTxt: NgModel;

	constructor(
		private _elRef: ElementRef,
		private _usersManager: UsersManager,
		private _router: Router,
		private _keyboard: KeyboardManager,
		private _modalController: ModalController,
		private _toastController: ToastController,
		private _database: DatabaseService,
        private _networkGuard: NetworkGuard,
        private _backButtonManager: BackButtonManager,
        private _tagsManager: TagsManager,
        private _logger: ApiLogger) {
	}
	
	ngOnInit(): void {
		this._keyboardStateSubscription = this._keyboard
			.onKeyboardStateChange()
			.subscribe({
				next: state => this.isKeyboardVisible = state.isVisible
            });           
	}

	ngOnDestroy(): void {
        this._keyboardStateSubscription.unsubscribe();
        this._backButtonSubscription.unsubscribe();
	}

	ionViewWillEnter()	{
		this.selectedSection = 'login';
		this.resetState();
        this.hidePigIfOverlaysLoginCard();
        
        this._backButtonSubscription =  this
            ._backButtonManager
            .handleBackButton((_, exitApp) => exitApp());
    }
    
    ionViewWillLeave() {		
		this._backButtonSubscription.unsubscribe();
	}
  
	private hidePigIfOverlaysLoginCard() {
		var loginBottom = this
			._elRef
			.nativeElement
			.querySelector('#loginCard')
			.getBoundingClientRect()
			.bottom;

		var pigTop = this
			._elRef
			.nativeElement
			.querySelector('#pigImg')
			.getBoundingClientRect()
			.top;

		this.isPigOverlayingLogicCard = pigTop < loginBottom;
	}

	public selectedSectionChange(){
		this.resetState();
	}

	private resetState() {
		this.email = null;
		this.password = null;
		this.repeatedPassword = null;
		this.signInErrorCode = null;
		this.signUpErrorCode = null;
        this.signUpInvalidParameter = null
		this.termsAndPrivacyPolicyConsent = false;
		this.isUserRegisteredSuccessfully = false;
        this.wasConsentClicked = false;
        this.isMFAChallenged = false;
        this.mfaCode = null;
        this.user = null;
	}

	public tryLogin() {
		if(this.isLoading)
			return;
			
		if(this.emailTxt.invalid || this.passwordTxt.invalid) {
            NgModelUtils.touchIfInvalid(this.emailTxt);
            NgModelUtils.touchIfInvalid(this.passwordTxt);
        } else {          
            this._networkGuard.guardAsync(() => this.login());            
        }     
	}

	private async login(){
		this.isLoading = true;

        try {
            this.signInErrorCode = null;

            this.user = await Auth.signIn(
                this.email, 
                this.password);

            if (this.user.challengeName === 'SOFTWARE_TOKEN_MFA') {
                this.isMFAChallenged = true;
            } else {            
                await this.initializeAppForUser();
            }
        } catch (error) {
            this._logger.error("login.page.ts->login()", error);

            if(error.code) {
                this.signInErrorCode = error.code;
            }
        } finally {
            this.isLoading = false;				
            this.selectedSection = "login";
        }
	}

    public async tryConfirmMfaCode() {
        if(this.mfaTxt?.invalid) {
            NgModelUtils.touchIfInvalid(this.mfaTxt);
        } else {          
            this._networkGuard.guardAsync(() => this.confirmMfaCode());            
        }    
    }

    private async confirmMfaCode() {
        this.isLoading = true;

        try {
            await Auth.confirmSignIn(
                this.user,   
                this.mfaCode.toString(),  
                'SOFTWARE_TOKEN_MFA'
            );

            await this.initializeAppForUser();
        } catch (error) {
            this._logger.error("login.page.ts->confirmMfaCode()", error);

            if(error.code) {
                this.signInErrorCode = error.code;
            }
        } finally {
            this.isLoading = false;				
            this.selectedSection = "login";
        }
    }

    private async initializeAppForUser() {
        try {
            await this._usersManager.registerUserIfFirstTimeLogin(
                this.email);

            await this.resetAppState();

            this.resetState();
            this.form.resetForm();

            await this._router.navigate(['/tabs/start'])
            
        } catch (error) {
            this._logger.error("login.page.ts->initializeAppForUser()", error);

            //because the user were successfully signed in with cognito (otherwise we wouldn't be in this catch)
            //we need to remember to sign out and clear the local cognito store
            //so that next time user opens the app, he sees login screen instead of tab screen
            //(it token would be in cognito store then tab screen would be selected automatically)
            Auth.signOut({
                global: false
            });

            this._logger.somethingWentWrongToast(
                `Podczas logowania coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                2000
            );
        }
    }

    private async resetAppState() {
        try {
            this._usersManager
                .publishUserLoggedInEvent();

            await this
                ._tagsManager
                .initialize();
        } catch (error) {
            this._logger.error("login.page.ts->resetAppState()", error);
            throw error;            
        }
    }


	public tryRegister() {
		if(this.isLoading)
			return;

		if(this.registrationEmailTxt?.invalid 
			|| this.registrationPasswordTxt?.invalid
			|| this.registrationRepeatedPasswordTxt?.invalid
			|| !this.termsAndPrivacyPolicyConsent) {

            NgModelUtils.touchIfInvalid(this.registrationEmailTxt);
            NgModelUtils.touchIfInvalid(this.registrationPasswordTxt);
			NgModelUtils.touchIfInvalid(this.registrationRepeatedPasswordTxt);
            this.wasConsentClicked = true;
        } else {          
            this._networkGuard.guardAsync(() => this.register());            
        }     
	}

	private async register() { //TODO CHECK
		this.signUpErrorCode = null;

		if (this.repeatedPassword != this.password) {
			this.signUpErrorCode = "PasswordsDontMatch";
		} else {
			this.isLoading = true;

            try {            
                await Auth.signUp({
                    username: this.email,
                    password: this.password,
                    attributes: {
                        email: this.email
                    }});

                await this._database.saveUserConsents({
					email: this.email,
					acceptedAtUnixTimestamp: DateParser.nowUnixTimestamp(),
					wasTermsAndPrivacyPolicyAccepted: this.termsAndPrivacyPolicyConsent
				});

                this.isUserRegisteredSuccessfully = true
            } catch (error) {
                this._logger.error("login.page.ts->register()", error);

                if(error.code) {
                    this.signUpErrorCode = error.code

                    if(error.code == 'InvalidParameterException' && error.message.indexOf('username') > -1) {
                        this.signUpInvalidParameter = "username";
                    } else {
                        this.signUpInvalidParameter = "password"
                    }
                } else {                    
                    this._logger.somethingWentWrongToast(
                        `Podczas rejestracji coś poszło nie tak. Spróbuj ponownie za jakiś czas.`,
                        2000
                    );
                }
            } finally {
                this.isLoading = false;
            }
		}
	}

	public async resendVerificationEmail() {
        try {
            await Auth.resendSignUp(this.email);

            const toast = await this._toastController.create({
                message: "Link został wysłany",
                color: 'success',
                duration: 1000,
                animated: true,
            });
    
            await toast.present();
        } catch (error) {          
            this._logger.error("login.page.ts->resendVerificationEmail()", error);
            this._logger.somethingWentWrongToast();       
        }
	}

	public async openPrivacyPolicy() {
		const modal = await this
			._modalController
			.create({
				component: PrivacyPolicyModal
			});

		await modal.present();
	}

	public async openTerms() {
		const modal = await this
			._modalController
			.create({
				component: TermsModal
			});

		await modal.present();
	}

    public onConsentClick() {
        this.wasConsentClicked = true;
        this.termsAndPrivacyPolicyConsent = !this.termsAndPrivacyPolicyConsent;
    }

    public onConsentChange() {
        this.wasConsentClicked = true;
    }
}
