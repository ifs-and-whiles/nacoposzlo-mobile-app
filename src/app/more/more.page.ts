import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { ReportBugModal } from './items/report-bug-modal/report-bug.modal';
import { UsersManager } from '../shared/managers/users.manager';
import { Subscription } from 'rxjs';
import { PrivacyPolicyModal } from '../legal/privacy-policy/privacy-policy.modal';
import { TermsModal } from '../legal/terms/terms.modal';
import { BackButtonManager } from '../shared/managers/back-button.manager';
import { ManageTagsModal } from '../shared/components/manage-tags-modal/manage-tags.modal';
import { ExpenseFactory, IExpenseFactoryRequest } from 'src/development-tools/expense-factory/expense-factory.development';
import { Month } from '../shared/month';
import { ExpensesManager } from '../shared/managers/expenses.manager';
import { TagsManager } from '../shared/managers/tags/tags.manager';
import { Auth } from 'aws-amplify';
import { ApiLogger } from '../shared/api-logger';
import { ChangePasswordModal } from './items/change-password-modal/change-password.modal';
import { MfaModal } from './items/mfa/mfa.modal';

@Component({
	selector: 'app-more',
	templateUrl: 'more.page.html',
	styleUrls: ['more.page.scss']
})
export class MorePage implements  OnDestroy {

	private _backButtonSubscription: Subscription;

	public scansLeft: number;
	public isInfiniteScanningAllowed: boolean;
    public userMfa: string;

	constructor(
		private _router: Router,
		private _modalController: ModalController,
		private _usersManager: UsersManager,
        private _alertController: AlertController,
		private _backButtonManager: BackButtonManager,
        private _expenseManager: ExpensesManager,
        private _tagsManager: TagsManager,
        private _logger: ApiLogger
	) {	}

	ngOnDestroy(): void {
		//just in case, we will try to unsubscribe this one too		
		this._backButtonSubscription.unsubscribe();
	}

	ionViewWillEnter()	{
		this.updateUserLimits();        

		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton((locationBack) => locationBack());

        this.checkUserMfa();
	}

	ionViewWillLeave() {		
		this._backButtonSubscription.unsubscribe();
	}

    private async checkUserMfa() {
        try {
            const user = await Auth.currentAuthenticatedUser();
            const mfa = await Auth.getPreferredMFA(user);

            this.userMfa = mfa;
        } catch (error) {
            this._logger.error("more.page.ts->checkUserMfa()", error);            
        }
    }

    private async updateUserLimits() {
        const userDetails = await this
            ._usersManager
            .updateUserLimits();

        if(userDetails.limits) {
            if(userDetails.limits.currentPackageLimit == -1) {
                this.scansLeft = 0;
                this.isInfiniteScanningAllowed = true;
            } else {
                this.scansLeft = userDetails.limits.currentPackageLimit - userDetails.limits.currentPackageCounter;
                this.isInfiniteScanningAllowed = false;
            }
        } else {
            this.scansLeft = 0;
            this.isInfiniteScanningAllowed = false;
        }
    }
   
    public async manageTags() {
		const modal = await this
			._modalController
			.create({
				component: ManageTagsModal
			});

		await modal.present();
	}

	public async reportBug() {
		const modal = await this
			._modalController
			.create({
				component: ReportBugModal
			});

		await modal.present();
	}

	public async privacyPolicy() {
		const modal = await this
			._modalController
			.create({
				component: PrivacyPolicyModal
			});

		await modal.present();
	}

	public async terms() {
		const modal = await this
			._modalController
			.create({
				component: TermsModal
			});

		await modal.present();
	}

	public getScansLeftText() {
        if(!this.scansLeft) return "0 paragonów";
		if(this.scansLeft == 1) return "1 paragon";
		
		const scansLeftStr = this.scansLeft.toString();

		if(scansLeftStr.endsWith("2") ||
		   scansLeftStr.endsWith("3") ||
		   scansLeftStr.endsWith("4")) {
			return `${scansLeftStr} paragony`;
		}

		return `${scansLeftStr} paragonów`;
	}

	public async showScansInfo() {
		const problemAlert = await this._alertController.create({
			header:  "Skany",
			message: `- Uzupełnienie do <strong>100</strong> skanów za darmo na początku każdego miesiąca* <br><br>
			- <strong>50</strong> skanów za polecenie <strong>na</strong>co<strong>poszło</strong> w mediach społecznościowych* <br><br><br>
			* więcej szczegółów w regulaminie aplikacji.`,
			buttons: [{
				text: 'Rozumiem',
				role: 'cancel',
				cssClass: 'text-medium',
			}]
		});
	  
		await problemAlert.present();
	}

	public async showIntro() {
		await this._router.navigate(['./intro', { openedFromMorePage: true }]);
	}

    public async randomizeExpenses() {
        const factory = new ExpenseFactory(
            this._expenseManager,
            this._tagsManager);
        
        const startMonth = new Month(0, 2019);
        const endMonth = new Month(7, 2021);

        const months = Month.range(
            startMonth.startUnixTimestamp(),
            endMonth.startUnixTimestamp());

        const request: IExpenseFactoryRequest = {
            months: months,
            minimumExpensesCountPerMonth: 30,
            maximumExpensesCountPerMont: 50
        }

        await factory.createTags();
        await factory.createRandomExpenses(request);        
    }

    public async changePassword() {
		const modal = await this
			._modalController
			.create({
				component: ChangePasswordModal
			});

		await modal.present();
	}

    public async manageMfa() {
        const modal = await this
            ._modalController
            .create({
                component: MfaModal
            });

        await modal.present();

        await modal.onDidDismiss();
        await this.checkUserMfa();
    }

    public signOut() {
		this.confirmSignOut(async () => {
                try {
                    await Auth.signOut({
                        global: true
                    });
                } catch (error) {
                    this._logger.error("security.modal.ts->signOut()", error);

                    if(error.code == "PasswordResetRequiredException") {
                        Auth.signOut({
                            global: false
                        });
                    }
                } finally {
                    this.moveToLoginPage()
                }
            });	
	}

	private async confirmSignOut(signOut: () => Promise<any>) {
		const alert = await this._alertController.create({
			message: "Czy na pewno chcesz się wylogować?",
			buttons: [{
				text: 'Anuluj',
				role: 'cancel',
				cssClass: 'text-medium',
			}, {
				text: 'Wyloguj się',
				cssClass: 'text-danger',
				handler: () => signOut()				
			}]
		});
	  
		await alert.present();
	}

	private moveToLoginPage() {
		return this._router.navigate(['/login']);
    }

    public rateApp() {
        window.open("https://play.google.com/store/apps/details?id=pl.nacoposzlo.app", "_system");
    }
}