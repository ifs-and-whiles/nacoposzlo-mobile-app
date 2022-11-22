import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { faSortAmountDown, faSortAlphaDown } from '@fortawesome/free-solid-svg-icons';
import { TagsSortMethod, SearchInputState, TagsSelectorComponent } from '../tags-selector/tags-selector.component';
import { NetworkGuard } from '../../utils/network.guard';
import { DiscardChangesGuard } from '../../utils/discard-changes.guard';
import { Subscription } from 'rxjs';
import { BackButtonManager } from '../../managers/back-button.manager';
import { ManageTagsModal } from 'src/app/shared/components/manage-tags-modal/manage-tags.modal';

@Component({
	selector: 'app-tags-modal',
	templateUrl: 'tags.modal.html',
    styleUrls: ['tags.modal.scss']
})
export class TagsModal  implements OnInit, OnDestroy{
    faSortAmountDown = faSortAmountDown;
    faSortAlphaDown = faSortAlphaDown;

    private _originalJson: string;

    @Input() set tagIds(value: string[]) {
        if(value) this.selectedTagIds = value.slice();
        else this.selectedTagIds = [];

        this._originalJson = JSON.stringify(value);
    }

    public selectedTagIds: string[] = [];

    public sortMethod: number = TagsSortMethod.popularity;
    public searchState: SearchInputState = SearchInputState.empty;

    private _backButtonSubscription: Subscription;
    

    @ViewChild(TagsSelectorComponent) tagSelectorElement: TagsSelectorComponent;

	constructor(
        private _modalController: ModalController,
        private _toastController: ToastController,
        private _networkGuard: NetworkGuard,
        private _discardChangesGuard: DiscardChangesGuard,
        private _backButtonManager: BackButtonManager) {
    }

    ngOnInit(): void {
        this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton(() => this.cancel());
    }

    ngOnDestroy(): void {    
		this._backButtonSubscription.unsubscribe();
    }

	public ok() {
        this._networkGuard.guard(() => this._modalController.dismiss({
            tags: this.selectedTagIds.slice()
        }));	
    }
    
    public add() {
        this.tagSelectorElement.addTagFromSearch();
    }    

	public async cancel() {	
		const currentJson = JSON.stringify(this.selectedTagIds);	
		const wasChanged = this._originalJson !== currentJson;

		if(wasChanged) {
            this._discardChangesGuard.guard(
                () => this._modalController.dismiss(),
                "Nowe kategorie nie zostały zatwierdzone, czy na pewno chcesz odrzucić zmiany?");
		} else {		
			this._modalController.dismiss();
		}
    }

    public async onChangeSortMethod() {
        let toastMessage;

        if(this.sortMethod === TagsSortMethod.alphabetically) {
            this.sortMethod = TagsSortMethod.popularity;
            toastMessage = 'Sortowanie według popularności';
        } else {
            this.sortMethod = TagsSortMethod.alphabetically;
            toastMessage = 'Sortowanie alfabetyczne';
        }

        const toast = await this._toastController.create({
            message: toastMessage,
            cssClass: 'confirmation-toastr',
            duration: 1000,
            animated: true,
        });

        toast.present();
    }

    public onSearchStateChange(searchState: SearchInputState) {
        this.searchState = searchState;
    }

    public async goToManageTags() {
        const modal = await this
			._modalController
			.create({
				component: ManageTagsModal
			});

		await modal.present();
    }
}