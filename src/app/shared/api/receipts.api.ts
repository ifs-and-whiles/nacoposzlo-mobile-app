import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { API_URL } from './api.configuration';
import { BoundingBox } from '../utils/bounding-box';
import { ImageBlob } from '../managers/camera.manager';

const httpOptions = {
	headers: new HttpHeaders({
      'Content-Type':  'application/json',
      'Access-Control-Allow-Origin': '*'
	})
};

export interface RecognizeReceiptRequest { 
    imageInBase64: string;
    imageExtension: string;
}

export interface RecognizeReceiptRequest { 
    imageInBase64: string;
    imageExtension: string;
}

export interface RecognizeReceiptResponse {
    receiptCloudId: string;
}

export interface GetReceiptRecognitionStatusResponse {
    status: ReceiptRecognitionStatus;
}

export enum ReceiptRecognitionStatus {
    RecognitionStarted = 1,
    RecognitionFailed = 2,
    RecognitionCompleted = 3
}

export interface GetRecognizedReceiptResponse {
    id: string;
    seller: string;
    taxNumber: string;
    date: string;
    amount: number;
    products: GetRecognizedReceiptProductResponse[];
    originalOrientation: ReceiptOrientation;
}

export interface GetRecognizedReceiptProductResponse {
    isCorrupted: boolean;
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    boundingBox: BoundingBox;
}

export interface ReceiptOrientation {
    valueInRadians: number;
}

@Injectable({
	providedIn: 'root'
})
export class ReceiptsApi {
    
    constructor(
        private _http: HttpClient) {}
    
    public recognizeReceipt(imageBlob: ImageBlob): Promise<RecognizeReceiptResponse> {   
        var formData = new FormData();
        formData.append("image", imageBlob.blob, 'receipt.jpeg');
        formData.append("imageWidth", imageBlob.width.toString());
        formData.append("imageHeight", imageBlob.height.toString());

        const options = {
            headers: new HttpHeaders({
              'Access-Control-Allow-Origin': '*'
            })
        };

        return this
            ._http
            .post<string>(`${API_URL}/mobile-api/v1/receipts/recognize`, formData, options)
            .toPromise()
            .then((response: string) => ({
                receiptCloudId: response
            }));
    }

    public getReceiptStatus(receiptCloudId: string): Promise<GetReceiptRecognitionStatusResponse> {
        return this
            ._http
            .get<GetReceiptRecognitionStatusResponse>(`${API_URL}/mobile-api/v1/receipts/get-receipt-recognition-process-status?ReceiptId=${receiptCloudId}`, httpOptions)
            .toPromise();
    }

    public getRecognizedReceipt(receiptCloudId: string): Promise<GetRecognizedReceiptResponse> {
        return this
            ._http
            .get<GetRecognizedReceiptResponse>(`${API_URL}/mobile-api/v1/receipts/get-recognized-receipt?ReceiptId=${receiptCloudId}`, httpOptions)
            .toPromise();
    }

    public getReceiptImage(receiptCloudId: string): Promise<any> {
        const options ={
            headers: new HttpHeaders({
              'Content-Type':  'image/jpeg',
              'Access-Control-Allow-Origin': '*',
            }),
            responseType: 'blob' as 'json'
        };

        return this
            ._http
            .get(`${API_URL}/mobile-api/v1/receipts/get-receipt-image?ReceiptId=${receiptCloudId}`, options)
            .toPromise();        
    }
}