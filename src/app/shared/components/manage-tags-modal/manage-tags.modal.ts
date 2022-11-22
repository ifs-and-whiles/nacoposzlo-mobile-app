import { Component, OnDestroy, OnInit, } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AddTagModal } from 'src/app/shared/components/add-tag-modal/add-tag.modal';
import { TagsCollectionEntity } from 'src/app/shared/database/entities/tags-collection-entity';
import { BackButtonManager } from 'src/app/shared/managers/back-button.manager';
import { TagsManager, TagToDelete } from 'src/app/shared/managers/tags/tags.manager';
import { defaultTagColor } from '../../utils/colors';
import { EditTagModal, TagToEdit } from '../edit-tag-modal/edit-tag.modal';

interface Tag {
    id: string;
    name: string;
    color: string;
    usageCount: number;
    level: number;
    addSubcategory: boolean;
    chain: string[];
    isHighlighted: boolean;
}

interface TagGroup {
    tags: Tag[];
    isEditOn: boolean;
    isVisible: boolean;
}

interface TagTreeNode {
    tagId: string;
    color: string;
    name: string;
    level: number;
    children: TagTreeNode[];
    chain: string[];
    chainCount: number;
}

@Component({
	selector: 'app-manage-tags',
	templateUrl: 'manage-tags.modal.html',
	styleUrls: ['manage-tags.modal.scss']
})
export class ManageTagsModal implements OnInit, OnDestroy{
    private _tagsSubscription: Subscription;
    private _tagsColorsSubscription: Subscription;
    private _tagsNamesSubscription: Subscription;
    private _backButtonSubscription: Subscription;
    private _tagsCollection: TagsCollectionEntity;
    
    public tagGroups: TagGroup[] = null;
    public search: string = null;

    constructor(
        private _tagsManager: TagsManager,
        private _modalController: ModalController,
        private _backButtonManager: BackButtonManager) { }

    ngOnInit(): void {
        this._tagsSubscription = this._tagsManager.onTagsCollectionChange().subscribe({
            next: collection => {
                this._tagsCollection = collection;

                if(collection && !this.tagGroups) {
                    this.tagGroups = this.getTagsInUse(collection);
                }
            }
        });

        this._tagsColorsSubscription = this._tagsManager.onTagsColorsChange().subscribe({
            next: colors => {
                this.tagGroups.forEach(
                    tagGroup => tagGroup.tags.forEach(
                        tag => tag.color = colors.tagsColors[tag.id]));
            }
        });

        this._tagsNamesSubscription = this._tagsManager.onTagsNamesChange().subscribe({
            next: names => {
                this.tagGroups.forEach(
                    tagGroup => tagGroup.tags.forEach(
                        tag => tag.name = names.tagsNames[tag.id]));
            }
        });
        
		this._backButtonSubscription = this
            ._backButtonManager
            .handleBackButton(() => this.cancel());
    }

    ngOnDestroy(): void {
        this._tagsSubscription.unsubscribe();
		this._backButtonSubscription.unsubscribe();
        this._tagsColorsSubscription.unsubscribe();
        this._tagsNamesSubscription.unsubscribe();
    }

    private getTagsInUse(tagsCollection: TagsCollectionEntity): TagGroup[] {
        const tagTrees = this.getTagTreeNodes(
            tagsCollection);

        this.sortTagTreesByName(tagTrees);

        const tagGroups: TagGroup[] = [];

        tagTrees.forEach(tree => tagGroups.push({
            tags: this.flattenTree(tree, tagsCollection),
            isEditOn: false,
            isVisible: true
        }));

        return tagGroups;
    }

    private getTagTreeNodes(tagsCollection: TagsCollectionEntity): TagTreeNode[] {
        let trees = [];

        for (let index = 0; index < tagsCollection.chains.length; index++) {
            const chain = tagsCollection.chains[index];
            let currentLevelSubtrees = trees;
            const parentChain = []
            
            for (let tagIndex = 0; tagIndex < chain.tagIds.length; tagIndex++) {
                const tagId = chain.tagIds[tagIndex];

                let tree = this.findTree(
                    currentLevelSubtrees,
                    tagId);

                if(!tree) {
                    const tag = tagsCollection.tags[tagId.toLowerCase()];
                    const newChain = parentChain.slice();
                    newChain.push(tagId.toLowerCase())                    

                    tree = {
                        tagId: tagId,
                        name: tag?.name ?? `Kategoria ${tagId}`,
                        color: tag?.color ?? defaultTagColor,
                        children: [],
                        level: tagIndex,
                        chain: newChain,
                        chainCount: chain.count
                    }

                    currentLevelSubtrees.push(tree);
                } else {
                    tree.chainCount += chain.count;
                }
                
                currentLevelSubtrees = tree.children;
                parentChain.push(tagId);
            }            
        }

        return trees;
    }        

    private findTree(trees: TagTreeNode[], tag: string): TagTreeNode {
        const lowerTag = tag.toLowerCase();
        
        const matchingTrees = trees
            .filter(tree => tree.tagId.toLowerCase() === lowerTag);

        if(matchingTrees.length) {
            return matchingTrees[0];
        }

        return null;
    }

    private sortTagTreesByName(tagTrees: TagTreeNode[]) {
        tagTrees.sort((a, b) => a.name.localeCompare(b.name));

        for (let index = 0; index < tagTrees.length; index++) {
            const tree = tagTrees[index];
            
            this.sortTagTreesByName(tree.children);
        }
    }

    private flattenTree(tree: TagTreeNode, tagsCollection: TagsCollectionEntity): Tag[] {
        const tags: Tag[] = [];

        tags.push({
            id: tree.tagId,
            color: tree.color,
            level: tree.level,
            usageCount: tree.chainCount,
            name: tree.name,
            addSubcategory: false,
            chain: tree.chain.slice(),
            isHighlighted: false
        });

        tags.push({
            addSubcategory: true,
            level: tree.level + 1,
            chain: tree.chain.slice(),
            isHighlighted: false,
            
            color: null,
            usageCount: 0,
            name: null,
            id: null
        });

        for (let index = 0; index < tree.children.length; index++) {
            const child = tree.children[index];
            const flatten = this.flattenTree(child, tagsCollection);
            
            flatten.forEach(x => tags.push(x));
        }

        return tags;
    }

    public cancel() {	
		this._modalController.dismiss();
    }

    public async editTag(tagGroup: TagGroup, tag: Tag) {
        const subcategories = this.getSubcategories(
            tagGroup,
            tag);

        const tagToEdit: TagToEdit = {
            color: tag.color,
            name: tag.name,
            usageCount: tag.usageCount
        };

        const modal = await this
            ._modalController
            .create({
                component: EditTagModal,
                cssClass: "small-modal",
                componentProps: {
                    tagToEdit: tagToEdit,
                    existingTags: this.getAllExistingTagNames(
                        tag.name),
                    canDelete: tag.usageCount <= 0 && subcategories.filter(sc => sc.usageCount > 0).length === 0
                }
            });

        await modal.present();

        const result = await modal.onDidDismiss();

        if(result.data && result.data.wasDeleted) {
            const tagsToDelete: TagToDelete[] = subcategories
                .filter(sc=> !sc.addSubcategory)
                .map(sc => ({                    
                    tagId: sc.id,
                    chain: sc.chain.slice()
                }));

            tagsToDelete.push({
                tagId: tag.id,
                chain: tag.chain.slice()
            });

            await this
                ._tagsManager
                .deleteTagsManually(tagsToDelete);

            subcategories.forEach(sc => this.deleteTag(tagGroup, sc));
            this.deleteTag(tagGroup, tag);

            if(tagGroup.tags.length == 0) {
                this.deleteTagGroup(tagGroup);
            }
        }
        else if(result.data && (result.data.color != tag.color || result.data.name != tag.name)) {
            this._tagsManager.setTagColorAndName(
                tag.id, 
                result.data.color, 
                result.data.name);
        }
    }

    private deleteTag(tagGroup: TagGroup, tag: Tag) {
        const index = tagGroup.tags.indexOf(tag);
        tagGroup.tags.splice(index, 1);
    }

    private deleteTagGroup(tagGroup: TagGroup) {
        const index = this.tagGroups.indexOf(tagGroup);
        this.tagGroups.splice(index, 1);
    }

    private getSubcategories(tagGroup: TagGroup, tag: Tag): Tag[] {
        const tagIndex = tagGroup
            .tags
            .indexOf(tag);

        const subcategories = [];

        for (let index = tagIndex + 1; index < tagGroup.tags.length; index++) {
            const nextTag = tagGroup.tags[index];
            
            if(nextTag.level > tag.level) {
                subcategories.push(nextTag);
            } else {
                break;
            }
        }

        return subcategories;
    }

    public async openAddCategoryModal(){
        const modal = await this
            ._modalController
            .create({
                component: AddTagModal,
                cssClass: "small-modal",
                componentProps: {
                    parentChain: []
                }
            });

        await modal.present();

        const result = await modal.onDidDismiss();

        if(result.data) {
            const newTagInfo = await this.extractNewTagInfo(
                result);

            const newTagChain = [newTagInfo.id];

            await this._tagsManager.addNewTagManually({
                id: newTagInfo.id,
                name: newTagInfo.name,
                color: newTagInfo.color,
                chain: newTagChain
            });

            this.tagGroups.splice(0, 0, {
                tags: [{
                    id: newTagInfo.id,
                    addSubcategory: false,
                    color: newTagInfo.color,
                    level: 0,
                    chain: newTagChain.slice(),
                    usageCount: 0,
                    name: newTagInfo.name,
                    isHighlighted: false
                }, {
                    id: null,
                    addSubcategory: true,
                    color: null,
                    level: 1,
                    chain: newTagChain.slice(),
                    usageCount: 0,
                    name: null,
                    isHighlighted: false
                }],
                isEditOn: true,
                isVisible: true
            });

            this.clearSearch();
        }
    }

    public async openAddSubcategoryModal(tagGroup: TagGroup, index: number, chain: string[]){
        const clickedItem = tagGroup.tags[index];
        
        const modal = await this
            ._modalController
            .create({
                component: AddTagModal,
                cssClass: "small-modal",
                componentProps: {
                    parentChain: clickedItem.chain.slice()
                }
            });

        await modal.present();

        const result = await modal.onDidDismiss();

        if(result.data) {
            const newTagInfo = await this.extractNewTagInfo(
                result);
        
            const newTagChain = chain.slice(); 
            newTagChain.push(newTagInfo.id);

            await this._tagsManager.addNewTagManually({
                id: newTagInfo.id,
                name: newTagInfo.name,
                color: newTagInfo.color,
                chain: newTagChain
            });

            tagGroup.tags.splice(index + 1, 0, {
                id: newTagInfo.id,
                addSubcategory: false,
                color: newTagInfo.color,
                level: clickedItem.level,
                chain: newTagChain.slice(),
                usageCount: 0,
                name: newTagInfo.name,
                isHighlighted: false
            }, {
                id: null,
                addSubcategory: true,
                color: null,
                level: clickedItem.level + 1,
                chain: newTagChain.slice(),
                usageCount: 0,
                name: null,
                isHighlighted: false
            });
        }
    }

    private async extractNewTagInfo(result) {
        if(result.data.tagId) {
            const existingTag = this
                ._tagsCollection
                .tags[result.data.tagId];               

            return {
                name: existingTag.name,
                id: existingTag.id,
                color: existingTag.color,
            }                
        } else {
            return {
                name: result.data.value.toLowerCase(),
                id: await this._tagsManager.getNextTagId(),
                color: result.data.color
            } 
        }
    }

    private getAllExistingTagNames(excludeName: string): string[] {
        const existingNames: string[] = [];

        this.tagGroups.forEach(tagGroup => tagGroup.tags.forEach(
            tag => {
                if(tag.name && tag.name.toLowerCase() != excludeName.toLowerCase())
                    existingNames.push(tag.name)
            }));
        
        return existingNames;
    }

    public onSearchChange() {
        this.search = this.search.trim().toLowerCase();

        if(this.search) {
            this.applyTagsSearchFilter(this.search);
        } else {
            this.clearTagsSearchFilter();
        }
    }

    private clearSearch() {
        this.search = null;
        this.clearTagsSearchFilter();       
    }

    private applyTagsSearchFilter(search: string) {
        this.tagGroups.forEach(
            tagGroup => {
                tagGroup
                    .tags
                    .filter(tag => tag.name)
                    .forEach(tag => tag.isHighlighted = tag.name.includes(search));
                
                tagGroup.isVisible = tagGroup
                    .tags
                    .filter(tag => tag.isHighlighted)
                    .length > 0;
            });
    }

    private clearTagsSearchFilter() {
        this.tagGroups.forEach(
            tagGroup => {
                tagGroup
                    .tags
                    .filter(tag => tag.name)
                    .forEach(tag => tag.isHighlighted = false);
                
                tagGroup.isVisible = true;
            });
    }
}