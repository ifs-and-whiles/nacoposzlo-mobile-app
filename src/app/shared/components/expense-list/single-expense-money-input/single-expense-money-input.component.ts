import { Component, EventEmitter, Input, Output } from "@angular/core";
import { parseMoney, tryFormatMoney } from "src/app/shared/utils/money";


@Component({
	selector: 'app-single-expense-money-input',
	templateUrl: 'single-expense-money-input.component.html',
    styleUrls: ['single-expense-money-input.component.scss']
})
export class SingleExpenseMoneyInputComponent {

    public valueStr: string;
    public isFocused: boolean;

    @Input() required: boolean;

    @Input() isCorrupted: boolean;

    @Input() set value(newValue: number | string | null) {        
        if(this.wasValueChanged(this.valueStr, newValue)) {
            this.valueStr = newValue.toString();
        }

        if(!this.isFocused) {
            this.tryFormatInput();
        }
    }

    private wasValueChanged(oldValue, newValue) {
        if(oldValue == null && newValue == null) return false;
        if(oldValue == null || newValue == null) return true;

        const oldValueNum = parseMoney(oldValue.toString());
        const newValueNum = parseMoney(newValue.toString());

        if(isNaN(oldValueNum) || isNaN(newValueNum)) return true;
        return oldValueNum != newValueNum;
    }

    @Output() valueChange = new EventEmitter();

    @Output() inputFocus = new EventEmitter();
    @Output() inputBlur = new EventEmitter();

    public onChange() {
        const newAmount = parseMoney(this.valueStr);
        
        if(isNaN(newAmount))
            this.valueChange.emit(this.valueStr);
        else
            this.valueChange.emit(newAmount);            
    }

    public onClick() {
        this.isFocused = true;
        this.inputFocus.emit();
    }

    public onBlur() {
        this.tryFormatInput();

        this.isFocused = false;
        this.inputBlur.emit();
    }

    private tryFormatInput() {        
        const currentValue = parseMoney(this.valueStr);
        
        if(!isNaN(currentValue))
            this.valueStr = tryFormatMoney(currentValue);
    }
}