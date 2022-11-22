import { Directive, Input, forwardRef, ElementRef, HostListener } from '@angular/core';
import { Validator, ValidatorFn, AbstractControl, ValidationErrors, Validators, NG_VALIDATORS } from '@angular/forms';
import { StringUtils } from '../utils/string-utils';

@Directive({
    selector: '[appNumerical][formControlName],[appNumerical][formControl],[appNumerical][ngModel]',
    providers: [{
        provide: NG_VALIDATORS,
        useExisting: forwardRef(() => NumericalValidator),
        multi: true
    }],    
    host: {'[attr.appNumerical]': 'appNumerical ? "" : null'}
  })
  export class NumericalValidator implements Validator {
    private _validator: ValidatorFn = Validators.pattern(/^\d{1,9}([\.,]\d{0,4})?$/);
    private _onChange: () => void;
    private _numerical !: boolean;

    constructor(private _elementRef: ElementRef) {
    }
    
    @Input()
    get appNumerical(): boolean|string { return this._numerical; }
  
    set appNumerical(value: boolean|string) {
      this._numerical = value != null && value !== false && `${value}` !== 'false';
      if (this._onChange) this._onChange();
    }
  
    validate(control: AbstractControl): ValidationErrors|null { 
        return this._numerical ?  this._validator(control) : null; 
    }
  
    registerOnValidatorChange(fn: () => void): void { this._onChange = fn; }

    @HostListener('ionBlur')
    public onIonBlur() {
        const value = (this._elementRef.nativeElement as HTMLInputElement).value;
        
        if(this.shouldPrependZero(value)) {
            (this._elementRef.nativeElement as HTMLInputElement).value = "0" + (this._elementRef.nativeElement as HTMLInputElement).value;
        }

        if(this.shouldAppendZero(value)){
            (this._elementRef.nativeElement as HTMLInputElement).value += "00";
        }
    }

    private shouldAppendZero(value: string) {
        return (value.endsWith('.') || value.endsWith(',')) 
            && StringUtils.lettersOf(value).filter(letter => letter === '.' || letter === ',').length === 1;
    }

    private shouldPrependZero(value: string) {
        return (value.startsWith('.') || value.startsWith(',')) 
            && StringUtils.lettersOf(value).filter(letter => letter === '.' || letter === ',').length === 1;
        
    }
}