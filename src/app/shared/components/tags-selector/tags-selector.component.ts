import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ViewChild } from '@angular/core';
import { defaultTagColor, getRandomColor } from '../../utils/colors';
import { TagsManager } from '../../managers/tags/tags.manager';
import { Subscription } from 'rxjs';
import { ArrayUtils } from '../../utils/array-utils';
import { noCategoryTag, noSubCategoryTag } from '../../utils/no-category-tag';
import { KeyboardManager } from '../../managers/keyboard.manager';
import { TagsCollectionEntity, TagsCollectionExtensions } from '../../database/entities/tags-collection-entity';
import { IonSearchbar, ModalController } from '@ionic/angular';
import { AddTagModal, NewTag } from '../add-tag-modal/add-tag.modal';
import { ManageTagsModal } from '../manage-tags-modal/manage-tags.modal';

export enum TagsSortMethod {
    alphabetically = 0,
    popularity = 1,
}

export enum SearchInputState {
    empty = 'empty',
    containsNewTag = 'new-tag',
    containsExistingTag = 'existing-tag',
    containsForbiddenTag = 'forbidden-tag'
};

interface Tag {
    id: string;
    value: string;
    color: string;
    usageCount: number;
    isVisible: boolean;
}

interface TagChain {
    tagIds: string[];
}

@Component({
	selector: 'app-tags-selector',
	templateUrl: 'tags-selector.component.html',
    styleUrls: ['tags-selector.component.scss']
})
export class TagsSelectorComponent implements OnInit, OnDestroy{

    private _tagsSubscription: Subscription;

    public newTagColor: string = getRandomColor();
    public search: string = '';
    public searchState: SearchInputState = SearchInputState.empty;
    @Output() searchStateChange = new EventEmitter<SearchInputState>();

    @Input() selectedTagIds: string[] = [];

    public filteredTags: Tag[] = [];

    public suggestedTags: Tag[] = [];
    public isAnySuggestedTagVisible: boolean;

    public restOfTags: Tag[] = [];
    public isAnyRestOfTagVisible: boolean;

    public isSuggestionTagVisible: boolean;

    private _chains: TagChain[] = [];

    private _sortMethod: number = TagsSortMethod.alphabetically;

    private _keyboardStateSubscription: Subscription;
    public isKeyboardVisible: boolean;
    
    public exactSameTag: Tag;

    @Input() set sortMethod(value: number) {
        this._sortMethod = value;        
        this.filteredTags = this.sort(this.filteredTags);
    }

    get sortMethod() {
        return this._sortMethod;
    }

    @Input() canCreateTag: boolean;

    public showTagForCreation = false;

    @ViewChild(IonSearchbar) searchElement: IonSearchbar;

	constructor(
        private _tagsManager: TagsManager,
		private _keyboard: KeyboardManager,
        private _modalController: ModalController) { }

    ngOnInit(): void {
        this._tagsSubscription = this._tagsManager.onTagsCollectionChange().subscribe({
            next: collection => {
                if(collection) {
                    this.filteredTags = this.getTagsInUse(collection);
                    this.filteredTags = this.sort(this.filteredTags);
                    this._chains = this.getChains(collection);

                    this.updateTagsLists();
                }
                else this.filteredTags = [];
            }
        });
        
        this._keyboardStateSubscription = this._keyboard
            .onKeyboardStateChange()
            .subscribe({
                next: state => {
                    this.isKeyboardVisible = state.isVisible;
                }
            });
    }

    private getTagsInUse(tagsCollection: TagsCollectionEntity): Tag[] {
        const tags = Object
            .keys(tagsCollection.tags)
            .map(tagId => {
                const tag = tagsCollection.tags[tagId];

                return {
                    id: tag.id,
                    value: tag.name,
                    color: tag.color,
                    usageCount: TagsCollectionExtensions.getTagUsageCount(
                        tagsCollection,
                        tag.id),
                    isVisible: true
                };
            });


        if(!this.canCreateTag) {
            tags.unshift({
                id: noCategoryTag,
                value: noCategoryTag,
                color: defaultTagColor,
                isVisible: true,
                usageCount: 1
            })
        }

        return tags;
    }

    private getChains(tagsCollection: TagsCollectionEntity): TagChain[] {
        const chains = tagsCollection.chains.map(chain => ({
            tagIds: chain.tagIds.slice()
        }));

        if(!this.canCreateTag){
            chains.push({
                tagIds: [noCategoryTag]
            })
        }
    
        return chains;
    }

    ngOnDestroy(): void {
        this._tagsSubscription.unsubscribe();
        this._keyboardStateSubscription.unsubscribe();
    }

    public onSearchChange() {
        this.search = this.search.trim().toLowerCase();
        this.showTagForCreation = false;
        this.exactSameTag = null;

        if(this.search) {
            this.filteredTags.forEach(tag => tag.isVisible = tag.value.includes(this.search));     
            
            const exactSame = this.filteredTags.find(tag => tag.value === this.search);

            if(exactSame) {
                this.searchState = SearchInputState.containsExistingTag;   
                this.exactSameTag = exactSame;   
            } else if(this.isTagForbiddenToCreate(this.search)) {
                this.searchState = SearchInputState.containsForbiddenTag;                
                this.showTagForCreation = true;
            } else {
                this.searchState = SearchInputState.containsNewTag;
                this.showTagForCreation = true;
            }
        } else {
            this.searchState = SearchInputState.empty;
            this.filteredTags.forEach(tag => tag.isVisible = true);    
        }       

        this.searchStateChange.emit(this.searchState);

        this.updateTagsVisibility();
    }

    public async addTagFromSearch() {        
        const tagName = this.search.trim().toLowerCase();

        if(this.searchState === SearchInputState.containsExistingTag) {
            const tag = this
                .filteredTags
                .find(t => t.value === tagName);

            this.addTagToSelected(
                tag.id);
        }
        else if(this.searchState === SearchInputState.containsNewTag && this.canCreateTag){
            await this.createNewTag(
                tagName, 
                this.newTagColor);
        }

        this.focusOnSearchIfKeyboardVisible();
    }   

    public addTagToSelected(tagId: string) {        
        this.selectedTagIds.push(tagId);
        this.search = ''
        this.searchState = SearchInputState.empty;
        this.searchStateChange.emit(this.searchState);
        this.newTagColor = getRandomColor();
        
        this.updateTagsLists();
    }

    private async createNewTag(name: string, color: string) {
        if(this.isTagForbiddenToCreate(name)) return;

        const newTagId = await this
            ._tagsManager
            .getNextTagId();

        const chain = this.selectedTagIds.slice();
        chain.push(newTagId);        

        await this._tagsManager.addNewTagManually({
            id: newTagId,
            name: name,
            color: color,
            chain: chain
        });
    
        this.addTagToSelected(newTagId);
    }
    
    private sort(tags: Tag[]) : Tag[]{
        if(this.sortMethod === TagsSortMethod.alphabetically) {
            return tags.sort((a,b) => a.value.localeCompare(b.value));
        } else if(this.sortMethod === TagsSortMethod.popularity) {
            return tags.sort((a,b) => (a.usageCount < b.usageCount) ? 1 : -1);
        }

        throw new Error("Unknown sort method")
    }
    
    public trackTagBy(tag: Tag) {
		if(!tag) return null;
		return tag.value;
    }
    
    public onSelectedTagRemove(tagId: string) {
        ArrayUtils.remove(
            this.selectedTagIds, 
            tagId);

        this.updateTagsLists();
    }

    public isTagForbiddenToCreate(tag: string) {
        if(tag === noCategoryTag || tag === noSubCategoryTag) return true;
        return false;
    }

    public onNewTagColorChange(hex: string) {
        this.newTagColor = hex;        
        this.focusOnSearchIfKeyboardVisible();
    }

    public shouldShowNewTagPanel() {
        return this.showTagForCreation 
            && this.canCreateTag 
            && !this.selectedTagIds.includes(this.search.trim()) 
            && !this.isTagForbiddenToCreate(this.search.trim())        
    }

    public focusOnSearchIfKeyboardVisible() {
        if(this.isKeyboardVisible) {
            this.searchElement
                .getInputElement()
                .then(element => element.focus());
        }
    }

    public getPlaceholder() {
        if(!this.filteredTags.length)
            return "Wpisz aby dodać nową";

        if(!this.selectedTagIds || !this.selectedTagIds.length)
            return 'Wybierz kategorię';

        const visibleSuggestedTags = this
            .suggestedTags
            .filter(tag => tag.isVisible)
            .length;

        const visibleRestOfTags = this
            .restOfTags
            .filter(tag => tag.isVisible)
            .length;

        if(visibleSuggestedTags || visibleRestOfTags)
            return 'Wybierz podkategorię';

        return "Dodaj podkategorię";
    }

    public updateTagsLists() {
        this.isSuggestionTagVisible = this.isAnyTagSelected();

        if(this.isNoCategoryTagSelected()) {
            this.suggestedTags = [];
            this.restOfTags = [];

            this.isSuggestionTagVisible = false;
        } else {
            this.populateTagsLists();
        }              
        
        this.updateTagsVisibility();
    }

    private populateTagsLists() {
        const filteredNotSelected = this
            .filteredTags
            .filter(tag => !this.isTagSelected(tag));
            
        const selectedChain: TagChain = {
            tagIds: this.selectedTagIds
        };

        const suggestedTagsIds = this
            ._chains
            .filter(chain => this.doesChainStartWith(chain, selectedChain))
            .filter(chain => chain.tagIds.length > selectedChain.tagIds.length)
            .map(chain => chain.tagIds[selectedChain.tagIds.length].toLowerCase());

        this.suggestedTags = filteredNotSelected
            .filter(tag => suggestedTagsIds.includes(tag.id));       
            
        this.restOfTags = filteredNotSelected
            .filter(tag => !this.canCreateTag && !suggestedTagsIds.includes(tag.id) && tag.id != noCategoryTag);
    }
    
    private updateTagsVisibility() {
        this.isAnySuggestedTagVisible = this
            .suggestedTags
            .filter(tag => tag.isVisible)
            .length > 0;

        this.isAnyRestOfTagVisible = this
            .restOfTags
            .filter(tag => tag.isVisible)
            .length > 0;
    }

    private isAnyTagSelected() {
        return this.selectedTagIds.length > 0;
    }

    private isNoCategoryTagSelected() {
        return this.selectedTagIds.includes(noCategoryTag);
    }

    private isTagSelected(tag: Tag) {
        return this.selectedTagIds.includes(tag.id);
    }

    private doesChainStartWith(chain: TagChain, subChain: TagChain) {
        if(chain.tagIds.length < subChain.tagIds.length) return false;

        for (let index = 0; index < subChain.tagIds.length; index++) {
            if(chain.tagIds[index].toLowerCase() != subChain.tagIds[index].toLowerCase()) {
                return false;
            }            
        }

        return true;
    }

    public async openAddTagModal(){
        if(!this.canCreateTag) return;

        const modal = await this
            ._modalController
            .create({
                component: AddTagModal,
                cssClass: "small-modal",
                componentProps: {
                    parentChain: this.selectedTagIds
                }
            });

        await modal.present();

        const result = await modal.onDidDismiss();

        if(result.data) {
            if(result.data.tagId) {
                this.addTagToSelected(
                    result.data.tagId);
            } else {
                this.createNewTag(
                    result.data.value,
                    result.data.color
                );
            }            
        }
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