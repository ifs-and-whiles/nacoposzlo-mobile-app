import { Component, Input, OnDestroy, OnInit, ViewChild, } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Vibration } from '@ionic-native/vibration/ngx';
import { IonInput, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { TagsCollectionEntity, TagsCollectionExtensions } from 'src/app/shared/database/entities/tags-collection-entity';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import { TagsManager } from 'src/app/shared/managers/tags/tags.manager';
import { KeyboardManager } from '../../managers/keyboard.manager';
import { colorsPalette, getRandomColor } from '../../utils/colors';
import { ControlUtils } from '../../utils/ng-model-utils';
import { getRandomInt } from '../../utils/random';

export interface NewTag {
    value: string;
    color: string;
}

export interface ExistingTag {
    tagId: string;
}

@Component({
	selector: 'app-add-tag-modal',
	templateUrl: 'add-tag.modal.html',
	styleUrls: ['add-tag.modal.scss']
})
export class AddTagModal implements OnInit, OnDestroy{
    private _backButtonSubscription: Subscription;  
    private _keyboardStateSubscription: Subscription;
    private _tagsManagerSubscription: Subscription;
    
    public isKeyboardVisible: boolean;
    
    public newTag: string;
    public newTagColor: string = getRandomColor();
    public wasColorClicked: boolean;

    public isNameForbidden: boolean;
    public isNameAlreadyUsed: boolean;
    public alreadyUsedTagId: string;


    public tagsCollection: TagsCollectionEntity = {
        tags: {},
        chains: []
    };
    
    @Input() parentChain: string[];

    @ViewChild(NgForm) form: NgForm;

    @ViewChild('nameInputCtrl', {static: false}) textbox: IonInput;

    constructor(
        private _tagsManager: TagsManager,
        private _modalController: ModalController,
        private _backButtonManager: BackButtonManager,
		private _keyboard: KeyboardManager,
        private _vibration: Vibration) { }

    ngOnInit(): void {        
		this._backButtonSubscription = this
            ._backButtonManager
            .handleBackButton(() => this.cancel());

        this._keyboardStateSubscription = this
            ._keyboard
            .onKeyboardStateChange()
            .subscribe({
                next: state => this.isKeyboardVisible = state.isVisible
            });

        this._tagsManagerSubscription = this
            ._tagsManager
            .onTagsCollectionChange()
            .subscribe({
                next: collection => this.tagsCollection = collection
            });     
    }

    ngOnDestroy(): void {
        this._backButtonSubscription.unsubscribe();
        this._keyboardStateSubscription.unsubscribe();
        this._tagsManagerSubscription.unsubscribe();
    }

    public cancel() {	
		this._modalController.dismiss();
    }

    public onNewTagColorChange(color: string) {
        this.newTagColor = color;
        this.wasColorClicked = true;
        this.focusOnTextboxIfKeyboardVisible();
    }

    public add() {
        if(this.form.invalid || this.isNameForbidden) {
            Object.values(this.form.controls).forEach(control => ControlUtils.touchIfInvalid(control));
        } else {
            if(this.isNameAlreadyUsed) {
                const existingTag: ExistingTag = {
                    tagId: TagsCollectionExtensions
                        .getTags(this.tagsCollection)
                        .find(tag => tag.name.toLowerCase() == this.newTag.trim().toLowerCase())
                        .id
                };
        
                this._modalController.dismiss(existingTag);
            } else {
                const newTag: NewTag = {
                    color: this.newTagColor,
                    value: this.newTag.trim().toLowerCase()
                };
        
                this._modalController.dismiss(newTag);
            }            
        }        
    }

    public focusOnTextboxIfKeyboardVisible() {
        if(this.isKeyboardVisible) {
            this.textbox.setFocus();
        }
    }

    public randomizeColor(){
        this._vibration.vibrate(50);
        const colors = colorsPalette.slice();
        const index = getRandomInt(0, colors.length);
        this.newTagColor = colors[index];
    }  

    public onNameChange() {
        if(this.newTag) {
            const newTag = this
            .newTag
            .trim()
            .toLowerCase();        

            this.isNameForbidden = !TagsCollectionExtensions.canCreateChain(
                this.tagsCollection,
                this.parentChain,
                newTag);

            const existingTag = TagsCollectionExtensions
                .getTags(this.tagsCollection)
                .find(tag => tag.name.toLowerCase() == newTag);

            this.isNameAlreadyUsed = existingTag != null;

            if(this.isNameAlreadyUsed) {
                this.alreadyUsedTagId = existingTag.id;
            } else {
                this.alreadyUsedTagId = null;
            }
        } else {
            this.isNameForbidden = false;
            this.isNameAlreadyUsed = false;
            this.alreadyUsedTagId = null;
        }        
    }
}