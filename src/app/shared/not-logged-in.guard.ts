import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { isUserSignedIn } from './utils/auth-utils';

@Injectable()
export class NotLoggedInGuard implements CanActivate {

    constructor(
        private _router: Router) {}

  	public canActivate(): Observable<boolean> {
		return from(isUserSignedIn())
			.pipe(
				map((isSignedIn, index) => {
                    if(!isSignedIn) return true;

                    this._router.navigateByUrl('/tabs/start');
                    return false;
                })
			);
	}
}