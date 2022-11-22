import { Component, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DatabaseService } from './shared/database/database.injectable';
import { Chart, registerables } from 'chart.js';
import Amplify from 'aws-amplify';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

Chart.register(...registerables);

const _POOL_DATA = {
	UserPoolId: "userPoolId",
	ClientId: "clientId"
};

Amplify.configure({
    userPoolId: _POOL_DATA.UserPoolId,
    userPoolWebClientId: _POOL_DATA.ClientId
});

@Component({
	selector: 'app-root',
	templateUrl: 'app.component.html',
	styleUrls: ['app.component.scss']
})
export class AppComponent implements OnDestroy {

	private _dbSubscription: Subscription;
    public isAppReady = false;

	constructor(
		private _platform: Platform,
		private _router: Router,
		private _database: DatabaseService,
        private _splashScreen: SplashScreen
	) {
		this.initializeApp();
	}

	initializeApp() {
		this._platform.ready().then(async () => {   
			ScreenOrientation.lock(ScreenOrientation.ORIENTATIONS.PORTRAIT)
            this._splashScreen.hide();
			this.showIntroIfNotShownBefore();
		});
	}

	private showIntroIfNotShownBefore() {
		this._database
			.getGeneralAppDetails()
			.then(details => {
				if(!details || !details.wasIntroShown) {
					this._router.navigate(['./intro']);
				}
			});
	}

	ngOnDestroy(): void {
		if(this._dbSubscription) this._dbSubscription.unsubscribe();
	}
}
