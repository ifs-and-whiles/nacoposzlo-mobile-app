import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file/ngx';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import * as XLSX from 'xlsx';
import { DateParser } from '../dateParser';
import { ExpenseToExportEntity } from '../database/entities/expense-to-export-entity';
import { ApiLogger } from '../api-logger';

export interface ItemToShare {
    blob: Blob;
    name: string;
    fileExtension: string;
}

@Injectable({
	providedIn: 'root'
})
export class SocialSharingManager {
    
    constructor(
        private _file: File,
        private _socialSharing: SocialSharing,
        private _logger: ApiLogger
    ) {}

    public share(item: ItemToShare) {
        const rawFileName = `NaCoPoszło_${item.name}_${this.getDateTimeFilePart()}`;
        const fileName = `${this.normalizeFileName(rawFileName)}.${item.fileExtension}`;
        const filePath = `${this._file.externalDataDirectory}/${fileName}`;

        return this
            ._file
            .createFile(
                this._file.externalDataDirectory, 
                fileName,
                true)
            .then(() => this._file.writeExistingFile(
                this._file.externalDataDirectory, 
                fileName, 
                item.blob))
            .then(() => this._socialSharing.share(
                null,
                null, 
                filePath))
            .then(() => this._file.removeFile(
                this._file.externalDataDirectory, 
                fileName
            ))
            .catch(error => {
                this._logger.error("social-sharing.manager.ts->share()", error);
            });
    }

    private getDateTimeFilePart() {
        return DateParser.formatDateTimeExact(
            DateParser.nowUnixTimestamp());
    }

    private normalizeFileName(name: string) {
        return name
            .replace(/\./g, "_")
            .replace(/:/g, "_")
            .replace(/\//g, "")
            .replace(/ /g, "_")
            .replace(/__/g, "_");
    }
}