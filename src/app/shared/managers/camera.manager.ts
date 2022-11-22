import { Injectable } from '@angular/core';
import { Camera } from '@ionic-native/Camera/ngx';
import { File } from '@ionic-native/file/ngx';
import { ReceiptItem } from 'src/app/receipts/receipts.page';
import { ApiLogger } from '../api-logger';

export interface ImageBlob {
    blob: Blob;
    width: number;
    height: number;
}

export const GALLERY = 0;
export const CAMERA = 1;

export enum PhotoDetailsSource {
    gallery = 'gallery',
    camera = 'camera'
}

@Injectable({
	providedIn: 'root'
})
export class CameraManager {
    
    constructor(
        private _camera: Camera,
        private _file: File,
        private _logger: ApiLogger
    ) {}


    public async selectFromGallery(
        initializeReceipt: () => ReceiptItem,
        somethingWentWrong: (receipt: ReceiptItem) => Promise<void>,
        processPhotoFunc: (receipt: ReceiptItem, imgBlob: ImageBlob) => Promise<void>) {
        
        await this.takePhoto(GALLERY, initializeReceipt, somethingWentWrong, processPhotoFunc);
    }

    public async useCamera(
        initializeReceipt: () => ReceiptItem,
        somethingWentWrong: (receipt: ReceiptItem) => Promise<void>,
        processPhotoFunc: (receipt: ReceiptItem, imgBlob: ImageBlob) => Promise<void>) {

        await this.takePhoto(CAMERA, initializeReceipt, somethingWentWrong, processPhotoFunc);
    }

    private async takePhoto(
        sourceType: number,
        initializeReceipt: () => ReceiptItem,
        somethingWentWrong: (receipt: ReceiptItem) => Promise<void>,
        processPhotoFunc: (receipt: ReceiptItem, imgBlob: ImageBlob) => Promise<void>) {
        
        let receipt: ReceiptItem;

        try {            
            const photoUri =  await this
                .getPicture(sourceType);
                
            receipt = initializeReceipt();

            const fileUrl = await this.tryResolveURL(
                photoUri);
            
            const photoDirectory = this.getDirectoryPath(
                fileUrl);

            const photoName = this.getImageFileName(
                fileUrl);

            const imgBlob = await this.tryLoadImageBlob(
                photoDirectory,
                photoName);
                
            if(sourceType == CAMERA) {
               this.tryRemoveImageFile(
                    photoDirectory,
                    photoName);
            }  

            await processPhotoFunc(
                receipt,
                imgBlob);
                
        } catch (error) {
            if(error === 'No Image Selected') return;

            this._logger.error("camera.manager.ts->takePhoto()", error);

            somethingWentWrong(receipt);
        }
    }

    private async tryResolveURL(photoUri: string) {
        try {
            const localFileEntry = await this
                ._file
                .resolveLocalFilesystemUrl(photoUri);

            return localFileEntry.toURL();
        } catch (error) {
            this._logger.error("camera.manager.ts->tryResolveURL()", error);
            throw error;
        }
    }

    private async tryRemoveImageFile(directory: string, name: string) {
        try {
            await this._file.removeFile(
                directory,
                name);
        } catch (error) {
            this._logger.error("camera.manager.ts->tryRemoveImageFile()", error);
            //we ignore this error - i suspect that this may not work on newest android
        }
    }

    private async tryLoadImageBlob(directory: string, name: string): Promise<ImageBlob> {
        try {
            return await this.loadImageBlob(directory, name);
        } catch (error) {
            this._logger.error("camera.manager.ts->tryLoadImageBlob()", error);
            throw error;
        }
    }

    private loadImageBlob(directory: string, name: string): Promise<ImageBlob> {
        return new Promise((resolve, reject) => {
            this._file
                .readAsArrayBuffer(
                    directory,
                    name)
                .then(
                    arrayBuffer => {
                        const blob = new Blob([arrayBuffer]);

                        const img = new Image();			

                        img.onload = (event) => {
                            const target: any = event.target;
                            URL.revokeObjectURL(target.src) 

                            resolve({
                                blob: blob,
                                height: img.height,
                                width: img.width
                            });
                        };

                        img.src = URL.createObjectURL(blob);					
                    },
                    error => reject(error));
        });
    }

    private async getPicture(sourceType: number): Promise<string> {
       try {
            return await this._camera.getPicture({
                quality: 100, 
                destinationType: this._camera.DestinationType.FILE_URI,
                encodingType: this._camera.EncodingType.JPEG,
                mediaType: this._camera.MediaType.PICTURE,
                cameraDirection: 0,
                sourceType: sourceType,
                correctOrientation: true,
                saveToPhotoAlbum: false
            });
       } catch (error) {
            if(error !== 'No Image Selected') {
                this._logger.error(`camera.manager.ts->getPicture(${sourceType})`, error);
            }

            throw error;
       }
    }

    private getImageFileName(filePath: string) {
        return filePath.substr(filePath.lastIndexOf('/') + 1);
	}

	private getDirectoryPath(filePath: string) {
		return filePath.substr(0, filePath.lastIndexOf('/'));
	}
}