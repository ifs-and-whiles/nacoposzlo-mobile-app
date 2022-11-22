import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Auth } from 'aws-amplify';
import { Router } from '@angular/router';

@Injectable()
export class AccessTokenInterceptor implements HttpInterceptor {

    constructor(private _router: Router) {

    }

	//todo test what happen if not internet
	intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		return from(Auth.currentSession())
			.pipe(
				switchMap(session => {					
					const accessToken = session
						.getAccessToken()
						.getJwtToken()

					const headers = request
						.headers						
						.append('Authorization', 'Bearer ' + accessToken)
						.append('Access-Control-Allow-Origin', '*');

					const requestClone = request.clone({
						headers: headers 
					});

					return next
                        .handle(requestClone)
                        .pipe(tap(() => {}, (err: any) => {
                            if (err instanceof HttpErrorResponse) {
                                if (err.status === 401) {
                                    Auth.signOut({
                                        global: false
                                    }).then(() => this._router.navigate(['./login']));
                                }
                            }
                        }));
				})
		 	);
	}
}