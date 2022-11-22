import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ReceiptLocation, Receipts } from 'src/app/shared/utils/receipts';
import { ExpenseItem, ReceiptImage } from '../expense-list.component';

@Component({
	selector: 'app-single-expense-item',
	templateUrl: 'single-expense-item.component.html',
	styleUrls: ['single-expense-item.component.scss']
})
export class SingleExpenseItemComponent {
    
    @Input() expense: ExpenseItem;
    @Input() receiptTotalAmount: number;
    @Input() highlightPhrase: string = "";

    public isInCorrectionMode: boolean;

    @Input() set receiptImage(value: ReceiptImage) {
        if(value) {
            this.isInCorrectionMode = true;
           
            setTimeout(() => {
                const img = value.image;
                this.drawOnCanvas(img, this.canvas, value.receiptLocation);  
            });           
        }
    }

    @Output() amountFocused = new EventEmitter<boolean>();
    @Output() amountChange = new EventEmitter<number>();

    @ViewChild('canvas') canvas;

    private drawOnCanvas(img, canvasEl, receiptLocation: ReceiptLocation) {
        if(!this.expense.boundingBox) return;

        const box = Receipts.calculateCanvasBoundingBox(
            this.expense.boundingBox,
            img,
            !this.expense.amount,
            receiptLocation);

        const canvas = canvasEl.nativeElement;

        const ratio = box.width/canvas.width;
        const destHeight = box.height/ratio;    

        canvas.height = destHeight;

        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            img,
            box.location.x,
            box.location.y, 
            box.width, 
            box.height, 
            0, 
            0, 
            canvas.width, 
            destHeight
        );
    }

    public onAmountFocus() {
        this.amountFocused.emit(true);
    }

    public onAmountBlur() {
        this.amountFocused.emit(false);
    }

    public onAmountChange(newAmount: number) {
        this.expense.amount = newAmount;
        this.amountChange.emit(this.expense.amount);
    }

    public isExpenseCorrupted() {
        return !Receipts.isAmountValid(this.expense);
    }
}