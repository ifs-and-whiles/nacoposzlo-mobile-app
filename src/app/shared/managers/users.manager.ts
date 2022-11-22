import { Injectable } from '@angular/core';
import { UsersApi } from '../api/users.api';
import { Subject } from 'rxjs';
import { UserDetailsEntity } from '../database/entities/user-details-entity';
import { DatabaseService } from '../database/database.injectable';
import { DateParser } from '../dateParser';
import { ApiLogger } from '../api-logger';
import { UserConsentsEntity } from '../database/entities/user-consents-entity';

@Injectable({
	providedIn: 'root'
})
export class UsersManager {
    private userLoggedInSubject: Subject<void> = new Subject<void>();

	public userLoggedIn() {
        return this.userLoggedInSubject.asObservable();
    }

    constructor(
        private _api: UsersApi,
        private _database: DatabaseService,
        private _logger: ApiLogger) {
    }

    public async registerUserIfFirstTimeLogin(email: string) {
        try {
            var userDetails = await this
                ._database
                .getUserDetailsOrDefault();

            if(userDetails.wasRegisterMeCalled)
                return;

            var consentDetails = await this
                ._database
                .tryGetUserConsents(email);

            var acceptedAtUnixTimestamp = this.getAcceptedAtUnixTimestamp(
                consentDetails);
            
            await this._api.registerMe({
                wasTermsAndPrivacyPolicyAccepted: true,
                dateOfConsents: DateParser.formatIso8061(acceptedAtUnixTimestamp)
            });     
            
            userDetails.wasRegisterMeCalled = true;

            await this
                ._database
                .saveUserDetails(userDetails);
        } catch (error) {
            this._logger.error("users.manager.ts->registerUserIfFirstTimeLogin()", error);
            throw error;
        }
    }

    private getAcceptedAtUnixTimestamp(consentDetails: UserConsentsEntity) {
        if(consentDetails) {
            return consentDetails.acceptedAtUnixTimestamp;
        }

        return DateParser.nowUnixTimestamp();
    }

    public async updateUserLimits(): Promise<UserDetailsEntity> {
        try {              
            const userDetails = await this
                ._database
                .getUserDetailsOrDefault();

            const details = await this
                ._api
                .getMyDetails();

            userDetails.limits = {
                totalUtilizationCounter: details.receiptsRecognitionUsage.totalUtilizationCounter,
                currentPackageCounter: details.receiptsRecognitionUsage.currentPackageCounter,
                currentPackageLimit: details.receiptsRecognitionUsage.limit,
                displayAds:details.displayAds
            };

            await  this
                ._database
                .saveUserDetails(userDetails);

            return userDetails;
        } catch (error) {
            this._logger.error("users.manager.ts->updateUserLimits()", error);
            throw error;
        }
    }

    public publishUserLoggedInEvent() {
        this.userLoggedInSubject.next();
    }
}