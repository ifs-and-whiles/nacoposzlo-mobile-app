import { NgModel, AbstractControl } from '@angular/forms';

export class ControlUtils {
    public static touchIfInvalid(control: AbstractControl) {
        if(control.invalid && !control.touched){
            control.setValue(control.value); //that is a hack to propagate touch change to ion-item control responsible for displaying red underline marking error	
            control.markAsTouched();	
        }
    }

    public static markAsUntouched(control: AbstractControl) {
        control.markAsUntouched();
        control.markAsPristine();
    }
}

export class NgModelUtils {
    public static touchIfInvalid(model: NgModel) {
        if(model.invalid && !model.touched){
            model.control.setValue(model.control.value); //that is a hack to propagate touch change to ion-item control responsible for displaying red underline marking error	
            model.control.markAsTouched();	
        }
    }

    public static markAsDirty(model: NgModel) {
        model.control.markAsDirty();	
    }
}