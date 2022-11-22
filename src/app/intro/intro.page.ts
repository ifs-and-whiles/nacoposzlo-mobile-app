import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../shared/database/database.injectable';

@Component({
	selector: 'app-intro',
	templateUrl: './intro.page.html',
	styleUrls: ['./intro.page.scss'],
})
export class IntroPage implements OnInit {

	public  slideOpts = {
		initialSlide: 0,
		speed: 400,
	};

	public isNextButtonVisible: boolean = true;
	public isOpenedFromMorePage: boolean;

	@ViewChild("introSlides") slides: IonSlides;

	constructor(
		private _route: ActivatedRoute,
		private _router: Router, 
		private _database: DatabaseService) { }
	
	ngOnInit(): void {
		const openedFromMorePage = this._route.snapshot.paramMap.get("openedFromMorePage");
		this.isOpenedFromMorePage = openedFromMorePage && openedFromMorePage == 'true';
	}

	ionViewWillEnter() {
		this.slides.slideTo(0);
		this.isNextButtonVisible = true;
	}

	public showNext() {
		this.slides.slideNext();
	}
	
	public onSlideChange() {
		this.slides.isEnd().then(isEnd => this.isNextButtonVisible = !isEnd);
	}

	public startUsing() {
		if(this.isOpenedFromMorePage) {
			this._router.navigate(['./tabs/more']);
		} else {
			this._database
			.getGeneralAppDetails()
			.then(details => {
				if(!details) {
					details = {
						wasIntroShown: true
					};
				}

				return this
					._database
					.saveGeneralAppDetails(details);
			})
			.then(() =>	this._router.navigate(['./tabs/start']));
		}		
	}
}
