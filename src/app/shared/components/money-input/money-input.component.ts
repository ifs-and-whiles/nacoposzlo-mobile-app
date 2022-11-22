import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { ControlContainer, NgForm } from "@angular/forms";
import { maybe } from "../../utils/maybe";
import { parseMoney, tryFormatMoney } from "../../utils/money";
import { StringUtils } from "../../utils/string-utils";


@Component({
	selector: 'app-money-input',
	templateUrl: 'money-input.component.html',
    styleUrls: ['money-input.component.scss'],
    viewProviders: [ { provide: ControlContainer, useExisting: NgForm } ]
})
export class MoneyInputComponent {
    @Input() name: string = "moneyTxt";
    @Input() label: string;
    @Input() placeholder: string;
    @Input() required: boolean = false;
    @Input() fixHeight: boolean = false;
    @Input() inputStyle: string = null;
    @Input() labelPosition: string = "floating";
    @Input() labelColor: string = "medium";
    @Input() useBackgroundShade: boolean = false;

    @Input() set value(val: number | null) {
        this._value =  maybe(val).map(x => x.toString());

        if(!this._isFocused) {
            this.tryFormat();
        }

        if(this._value != null) {
            this.calculateSuffixOffset();
        }
    }

    @Output() appFocus = new EventEmitter<any>();
    @Output() appBlur = new EventEmitter<any>();
    @Output() appChange = new EventEmitter<number>();
    @Output() appKeyUpEnter = new EventEmitter<any>();
    
    @ViewChild('moneyInputCtrl') moneyInput: any;

    public _value: string;
    private _isFocused: boolean = false;
    public _suffixOffset: number = 0;

    public onFocus($event) {
        this._isFocused = true;
        this.appFocus.emit($event);
    }

    public onBlur($event) {
        this._isFocused = false;
        this.tryFormat();
        this.appBlur.emit($event);
    }

    public onChange() {
        if(this._value === "") {
            this.appChange.emit(null);
        }

        const value = parseMoney(this._value);

        if(!isNaN(value)) {
            this.appChange.emit(value);
        }
        
        this.calculateSuffixOffset();
    }

    public onKeyUpEnter() {
        this.appKeyUpEnter.emit();
    }

    public setFocus() {
        this.moneyInput.setFocus();
    }

    private tryFormat() {        
        const currentValue = parseMoney(this._value);
        
        if(!isNaN(currentValue))
            this._value = tryFormatMoney(currentValue);
    }


    private calculateSuffixOffset() {
        if(!this.moneyInput) {
            setTimeout(() => this.calculateSuffixOffset(), 50);
            return;
        }

        if(this._value == null)
            return;

        const style = window.getComputedStyle(this.moneyInput.el)

        this._suffixOffset = StringUtils.getTextWidth(
            this._value.toString(),
            style.font
        );
    }
}