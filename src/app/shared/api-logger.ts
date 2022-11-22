import { Injectable } from "@angular/core";
import { Device } from '@ionic-native/device/ngx';
import { Platform, ToastController } from "@ionic/angular";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { API_URL } from "./api/api.configuration";
import { getUserId } from "./utils/auth-utils";

interface LogErrorRequest {
    logBody: string;
    userIdentifier: string;
    mobileDetails: {
        deviceId: string,
        systemVersion: string,
        mobileBrandAndModel: string
    }
}

@Injectable({
	providedIn: 'root'
})
export class ApiLogger { 

    constructor(
        private _device: Device,
        private _platform: Platform,
        private _http: HttpClient,
        private _toastController: ToastController) {
    }

    public async error(from: string, error: any) {
        try {
            await this._platform.ready()
            const userId = await getUserId();
            
            const log = {
                from: from,
                error: this.prepareErrorLog(error)
            };

            console.error(log);

            const request: LogErrorRequest = {
                logBody: JSON.stringify(log),
                userIdentifier: userId,
                mobileDetails: {
                    deviceId: this._device.uuid,
                    mobileBrandAndModel: this._device.model,
                    systemVersion: this._device.version
                }
            };

            await this
                ._http
                .post<LogErrorRequest>(`${API_URL}/mobile-api/v1/logs/add-error-log`, request, {
                    headers: new HttpHeaders({
                    'Content-Type':  'application/json',
                    })
                })
                .toPromise();
        } catch (error) {
            console.error("Something went wrong during logging", error);
        }
    }

    private prepareErrorLog(error) {
        const errorLog: any = {
            json: this.tryConvertToJson(error)
        };

        if(error.message) {
            errorLog.message = error.message;
        }

        if(error.name) {
            errorLog.name = error.name;
        }

        if(error.stack) {
            errorLog.stack = error.stack;
        }

        return JSON.stringify(errorLog);
    }

    private tryConvertToJson(error) {
        try {
            return JSON.stringify(error);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public async somethingWentWrongToast(message?: string | null, duration?: number | null) {
        const toast = await this._toastController.create({
            message: message ? message : "Coś poszło nie tak",
            color: 'danger',
            duration: duration ? duration : 1000,
            animated: true,            
            buttons: [{ text: 'ok', handler: () => toast.dismiss()}]
        });

        await toast.present();
    }
}