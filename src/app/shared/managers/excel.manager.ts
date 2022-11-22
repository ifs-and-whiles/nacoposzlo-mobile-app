import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ExpenseToExportEntity } from '../database/entities/expense-to-export-entity';
import { DateParser } from '../dateParser';
import { SocialSharingManager } from './social-sharing.manager';

interface ExpenseToExportPl {
    nazwa: string;
    kwota: number;
    data: string;
    kategorie: string;
    ilosc: number;
    cenaJednostkowa: number;
}

export const GALLERY = 0;
export const CAMERA = 1;

@Injectable({
	providedIn: 'root'
})
export class ExcelManager {
    
    constructor(
        private _socialManager: SocialSharingManager
    ) {}

    public exportExpensesPl(expenses: ExpenseToExportEntity[]) {
        const expensesPl: ExpenseToExportPl[] = expenses
            .map(e => ({
				nazwa: e.name,
				data: DateParser.formatDate(e.dateUnixTimestamp),
				kwota: e.amount,
                kategorie: e.tags.slice().join(","),
                ilosc: e.quantity,
                cenaJednostkowa: e.unitPrice
			}));

        let sheet = XLSX.utils.json_to_sheet(expensesPl);      

        let wbout = XLSX.write({
            SheetNames: ["export"],
            Sheets: {
                "export": sheet
            }
        }, {
            bookType: 'xlsx',
            bookSST: false,
            type: 'binary'
        });
        
        let blob = new Blob(
            [this.s2ab(wbout)], 
            {type: 'application/octet-stream'});
        
        return this
            ._socialManager
            .share({
                blob: blob,
                name: "wydatki",
                fileExtension: "xlsx"
            });
    }   

    private s2ab(s) {
        let buf = new ArrayBuffer(s.length);
        let view = new Uint8Array(buf);
        for (let i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }
}