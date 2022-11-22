import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from './api.configuration';

const httpOptions = {
	headers: new HttpHeaders({
	  'Content-Type':  'application/json',
	})
};

export interface GetMyDetailsResponse {
	receiptsRecognitionUsage : ReceiptRecognitionUsage;
	displayAds: boolean;
}

export interface ReceiptRecognitionUsage {
	totalUtilizationCounter: number;
	limit: number;
	currentPackageCounter: number;
	limitExceeded: boolean;
}

export interface RegisterMeRequest {
	wasTermsAndPrivacyPolicyAccepted: boolean;
	dateOfConsents: string;
}

@Injectable({
	providedIn: 'root'
})
export class UsersApi {

	constructor(private _http: HttpClient) {}

	public registerMe(request: RegisterMeRequest): Promise<void> {
		return this
			._http
			.post<void>(`${API_URL}/mobile-api/v1/users/register-me`, request, httpOptions)
			.toPromise();
	}

	public async getMyDetails(): Promise<GetMyDetailsResponse> {
        for (let index = 0; index < 5; index++) {
            try {
                const result = await this
                    ._http
                    .get<GetMyDetailsResponse>(`${API_URL}/mobile-api/v1/users/get-my-details`, httpOptions)
                    .toPromise();
    
                return result;
            } catch (error) {
                if(error.status && error.status == 404) {
                    await this.delay(300);
                } else {
                    throw error;
                }
            }
        }
        
        throw "Unable to get my details";
	}

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}