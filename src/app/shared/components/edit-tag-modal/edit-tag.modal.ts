import { Component, OnInit, OnDestroy, Input, ViewChild } from "@angular/core";
import { NgForm } from "@angular/forms";
import { Vibration } from "@ionic-native/vibration/ngx";
import { IonInput, ModalController } from "@ionic/angular";
import { Subscription } from "rxjs";
import { BackButtonManager } from "src/app/shared/managers/back-button.manager";
import { colorsPalette } from "src/app/shared/utils/colors";
import { getRandomInt } from "src/app/shared/utils/random";
import { KeyboardManager } from "../../managers/keyboard.manager";

export interface TagToEdit {
    name: string;
    color: string;
    usageCount: number;
}

@Component({
	selector: 'app-edit-tag-modal',
	templateUrl: 'edit-tag.modal.html',
	styleUrls: ['edit-tag.modal.scss']
})
export class EditTagModal implements OnInit, OnDestroy{
    private _backButtonSubscription: Subscription;  
    private _keyboardStateSubscription: Subscription;  
    
    public isKeyboardVisible: boolean;
    
    public wasColorClicked: boolean;
    
    @Input() tagToEdit: TagToEdit;
    @Input() existingTags: string[];
    @Input() canDelete: boolean;

    @ViewChild(NgForm) form: NgForm;
    @ViewChild(IonInput) textbox: IonInput;
    

    constructor(
		private _keyboard: KeyboardManager,
        private _modalController: ModalController,
        private _backButtonManager: BackButtonManager,
        private _vibration: Vibration) { }

    ngOnInit(): void {        
		this._backButtonSubscription = this
            ._backButtonManager
            .handleBackButton(() => this.cancel());

        this._keyboardStateSubscription = this._keyboard
            .onKeyboardStateChange()
            .subscribe({
                next: state => {
                    this.isKeyboardVisible = state.isVisible;
                }
            });
    }

    ngOnDestroy(): void {
        this._backButtonSubscription.unsubscribe();
        this._keyboardStateSubscription.unsubscribe();
    }

    public cancel() {	
		this._modalController.dismiss();
    }

    public onColorChange(color: string) {
        this.tagToEdit.color = color;
        this.wasColorClicked = true;
        this.focusOnTextboxIfKeyboardVisible();
    }

    public save() {
        this._modalController.dismiss(this.tagToEdit);
    }

    public randomizeColor(){
        this._vibration.vibrate(50);
        const colors = colorsPalette.slice();
        const index = getRandomInt(0, colors.length);
        this.tagToEdit.color = colors[index];
    }    

    public delete() {
        this._modalController.dismiss({
            wasDeleted: true
        });
    }

    public doesAlreadyExist() {
        if(!this.tagToEdit.name) return false;

        const newTag = this.tagToEdit.name
            .trim()
            .toLowerCase();        

        return this.existingTags.includes(newTag);
    }

    public focusOnTextboxIfKeyboardVisible() {
        if(this.isKeyboardVisible) {
            this.textbox
                .getInputElement()
                .then(element => element.focus());
        }
    }
}