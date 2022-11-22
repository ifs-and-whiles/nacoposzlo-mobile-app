import { Injectable } from '@angular/core';
import { defaultTagColor } from '../../utils/colors';
import { BehaviorSubject } from 'rxjs';
import { levenshtein } from '../../utils/levenshtein';
import { TagSuggestionBranchEntity } from '../../database/entities/tag-suggestion-branch-entity';
import { TagsCollectionEntity } from '../../database/entities/tags-collection-entity';
import { DatabaseService } from '../../database/database.injectable';
import { TagsMath } from './tagsMath';
import { noCategoryTag, noSubCategoryTag } from '../../utils/no-category-tag';
import { ApiLogger } from '../../api-logger';

export interface LearnTagHabits {
	productName: string;
	tagIds: string[]
}

export interface TagsUsage {
    chains: TagChainUsage[];
}

export interface TagChainUsage {
    tagIds: string[];
    count: number;
}

export interface ExpenseWithTag {
	name: string,
	tags: string[]
}

export interface TagsColors {
    tagsColors: {[tagId: string]: string}
};

export interface TagsNames {
    tagsNames: {[tagId: string]: string}
};

export interface TagToAdd {
    id: string;
    name: string;
	color: string;
    chain: string[];
}

export interface TagToDelete {
    tagId: string;
    chain: string[];
}

interface Suggestions {
	branches: {[productLettersName: string]: TagSuggestionBranchEntity};
}

export function prepareTagHabits<T>(items: T[], getName: (item: T) => string, getTagIds: (item: T) => string[]) {
	return items.map(item => {
		const habit: LearnTagHabits = {
			productName: getName(item),
			tagIds: getTagIds(item)
		};

		return habit;
	});
}

const LEVENSHTEIN_PRECISION = 0.15;

@Injectable({
	providedIn: 'root'
})
export class TagsManager {

	private tagsCollectionSubject: BehaviorSubject<TagsCollectionEntity> = new BehaviorSubject({
        tags: {},
        chains: []
	});

    private tagsColorsSubject: BehaviorSubject<TagsColors> = new BehaviorSubject({
        tagsColors: {}
	});

    private tagsNamesSubject: BehaviorSubject<TagsNames> = new BehaviorSubject({
        tagsNames: {}
	});

	public onTagsCollectionChange() {
		return this.tagsCollectionSubject.asObservable();
    }
    
    public onTagsColorsChange() {
		return this.tagsColorsSubject.asObservable();
	}

    public onTagsNamesChange() {
		return this.tagsNamesSubject.asObservable();
	}

	private _suggestions: Suggestions = {
		branches: {}
	}

    private _tagsCollection: TagsCollectionEntity;
    private _tagsColors: TagsColors;
    private _tagsNames: TagsNames;

	constructor(
        private _database: DatabaseService,
        private _logger: ApiLogger) {		
	}

    public async initialize() {
        try {
            const tagsCollection = await this
                ._database
                .getTagsCollection();

            const tagsSuggestions = await this
                ._database
                .getTagSuggestions();

            this._tagsCollection = tagsCollection ? tagsCollection : {
                tags: {},
                chains: []
            };

            this._tagsColors  = this.getTagsColors(
                this._tagsCollection);

            this._tagsNames = this.getTagsNames(
                this._tagsCollection);    

            this._suggestions = {
                branches: tagsSuggestions.reduce((acc, suggestion) => {
                    acc[suggestion.productLettersName] = suggestion;
                    return acc;
                }, {})
            };
            
            this.tagsCollectionSubject.next(this._tagsCollection);
            this.tagsColorsSubject.next(this._tagsColors);
            this.tagsNamesSubject.next(this._tagsNames);            
        } catch (error) {
            this._logger.error("tags.manager.ts->initialize()", error);
            throw error;            
        }
    }

	public async applyNewTags(expenses: ExpenseWithTag[], oldUsage: TagsUsage) {
        try {
            const currentUsage = TagsMath.calculateUsage(
                expenses, 
                e => e.tags);
    
            await this.incrementTags(
                oldUsage, 
                currentUsage);
    
            await this.learnTagHabits(
                prepareTagHabits(expenses, e => e.name, e => e.tags));
        } catch (error) {
            this._logger.error("tags.manager.ts->applyNewTags()", error);
            throw error;  
        }
	}

	public decrementTags(oldUsage: TagsUsage) {
		return this.incrementTags(
            oldUsage, 
            { chains: [] });
	}

    public async getNextTagId(): Promise<string> {
        try {
            let tagsCollection =  await this.getTagsCollection();
            const alreadyUsedIds = Object.keys(tagsCollection.tags);

            let id = 1;

            while(true) {
                const idStr = id.toString();
                const isAlreadyUsed = alreadyUsedIds.indexOf(idStr) > -1;

                if(isAlreadyUsed) {
                    id++
                } else {
                    return idStr;
                }
            }
        } catch (error) {
            this._logger.error("tags.manager.ts->getNextTagId()", error);
            throw error;
        }
    }

	public async incrementTags(oldUsage: TagsUsage, currentUsage: TagsUsage) {
        try {
            let tagsCollection =  await this.getTagsCollection();

            const diff = TagsMath.calculateDifference(
                oldUsage,
                currentUsage);
            
            diff.chains.forEach(item => {
                const itemHash = TagsMath.getChainHash(item);

                let tagChain = tagsCollection
                    .chains
                    .find(chain => itemHash == TagsMath.getChainHash(chain));

                if(!tagChain) {
                    tagChain = {
                        tagIds: item.tagIds.map(t => t.toLowerCase()),
                        count: 0                  
                    };

                    tagsCollection.chains.push(tagChain);
                }

                tagChain.count += item.count;
            });

            await this.saveAndUpdateTagsCollection(tagsCollection);

        } catch (error) {
            this._logger.error("tags.manager.ts->incrementTags()", error);
            throw error;
        }
	}	

    public async addNewTagManually(tagToAdd: TagToAdd) {
        try {
            let tagsCollection =  await this.getTagsCollection();
            const tagId = tagToAdd.id.toLowerCase();

            if(!tagsCollection.tags[tagId]) {
                tagsCollection.tags[tagId] = {
                    color: tagToAdd.color,
                    name: tagToAdd.name.toLowerCase(),
                    id: tagId
                };
            }
         
            const chainHash = TagsMath.getTagsHash(
                tagToAdd.chain);

            let tagChain = tagsCollection
                    .chains
                    .find(chain => chainHash == TagsMath.getChainHash(chain));

            if(!tagChain) {
                tagChain = {
                    tagIds: tagToAdd.chain.map(t => t.toLowerCase()),
                    count: 0                     
                };

                tagsCollection.chains.push(tagChain);
            }

            await this.saveAndUpdateTagsCollection(tagsCollection);

        } catch (error) {
            this._logger.error("tags.manager.ts->addNewTagManually()", error);
            throw error;
        }
    }

    public async deleteTagsManually(tagsToDelete: TagToDelete[]) {
        try {
            const tagsCollection =  await this.getTagsCollection();            

            for (let index = 0; index < tagsToDelete.length; index++) {
                const tagToDelete = tagsToDelete[index];
                const tagId = tagToDelete.tagId.toLowerCase();
           
                const chainHash = TagsMath.getTagsHash(
                    tagToDelete.chain);

                const tagChain = tagsCollection
                    .chains
                    .find(chain => chainHash == TagsMath.getChainHash(chain));

                if(tagChain && tagChain.count === 0) {
                    const index = tagsCollection.chains.indexOf(tagChain);
                    tagsCollection.chains.splice(index, 1);
                }

                const areThereAnyChainsWithTag = tagsCollection
                    .chains
                    .filter(chain => chain.tagIds.indexOf(tagId) > -1)
                    .length > 0;

                const tag = tagsCollection.tags[tagId];
   
                if(!areThereAnyChainsWithTag) {
                    delete tagsCollection.tags[tagId];
                }    
            }

            await this.saveAndUpdateTagsCollection(tagsCollection);
        } catch (error) {
            this._logger.error("tags.manager.ts->deleteTagsManually()", error);
            throw error;
        }
    }

	public async setTagColorAndName(tagId: string, color: string, name: string) {
        try {
            const tagsCollection = await this.getTagsCollection();

            tagId = tagId.toLowerCase();
            const selectedTag = tagsCollection.tags[tagId];

            if(selectedTag) {
                selectedTag.color = color;
                selectedTag.name = name;        
                await this.saveAndUpdateTagsCollection(tagsCollection);
            } else {
                console.warn("trying to set a color for tag which does not exist: " + tagId)
            }
        } catch (error) {
            this._logger.error("tags.manager.ts->setTagColorAndName()", error);
            throw error;
        }
	}

	public async learnTagHabits(habits: LearnTagHabits[]): Promise<void> {
		try {
            const modifiedBranches: TagSuggestionBranchEntity[] = [];

            habits		
                .map(habit => ({
                    branchName: this.preprocessProductNameForBranch(habit.productName),
                    productName: this.preprocessProductName(habit.productName),
                    tags: habit.tagIds || []
                }))
                .filter(habit => habit.branchName.length)
                .forEach(habit => {				
                    let branch = this._suggestions.branches[habit.branchName]

                    if (habit.tags && habit.tags.length) {					
                        if(!branch) {
                            branch = {
                                productLettersName: habit.branchName,
                                suggestions: {
                                    products: {}
                                }
                            };

                            this._suggestions.branches[habit.branchName] = branch;
                        }

                        let product = branch.suggestions.products[habit.productName];

                        if(!product) {
                            product = {
                                tagsToSuggest: []
                            };

                            branch.suggestions.products[habit.productName] = product;
                        }

                        product.tagsToSuggest = habit.tags.slice();

                        if(!modifiedBranches.includes(branch)){
                            modifiedBranches.push(branch);
                        }
                    }
                });
			
            for (let index = 0; index < modifiedBranches.length; index++) {
                const modifiedBranch = modifiedBranches[index];
                await this._database.saveTagSuggestions(modifiedBranch);
            }
        } catch (error) {
            this._logger.error("tags.manager.ts->learnTagHabits()", error);
            throw error;
        }			
	}

	public getTagSuggestions(productName: string): string[] {
		try {
            const matchingBranch = this.findMatchingBranch(
                productName);
    
            if(matchingBranch) {
                const matchingTags = this.findMatchingProduct(
                    productName, 
                    matchingBranch);
    
                return matchingTags.filter(matchingTag => {
                    return this._tagsCollection.tags[matchingTag];
                });
            } 
    
            return [];
        } catch (error) {
            this._logger.error("tags.manager.ts->getTagSuggestions()", error);
            throw error;
        }
	}

	private findMatchingBranch(productName: string) {
		try {
            const expectedBranchName = this.preprocessProductNameForBranch(productName);
            const perfectlyMatchedBranch = this._suggestions.branches[expectedBranchName]

            if (perfectlyMatchedBranch) {
                return perfectlyMatchedBranch;
            } else {
                return this.getCloseEnoughBranchWithLevenshtein(expectedBranchName);	
            }
        } catch (error) {
            this._logger.error("tags.manager.ts->findMatchingBranch()", error);
            throw error;            
        }
	}

	private getCloseEnoughBranchWithLevenshtein(expectedBranchName: string) {
		try {
            const maxDistance = expectedBranchName.length * LEVENSHTEIN_PRECISION;

            //for too short names we don't allow levenshtein method as the precision would be too small for that suggestions.
            if(maxDistance < 1) return null;

            const branchNames = Object.keys(this._suggestions.branches);
            const possibleResults = [];

            for (let index = 0; index < branchNames.length; index++) {
                const currentBranchName = branchNames[index];
                
                const distance = levenshtein(expectedBranchName, currentBranchName);

                if(distance < 2) {
                    const closestBranch = this._suggestions.branches[currentBranchName];
                    return closestBranch;
                }

                if(distance >= 2 && distance <= maxDistance) {
                    possibleResults.push({
                        branch: this._suggestions.branches[currentBranchName],
                        distance: distance
                    });
                }
            }

            if(possibleResults.length) {
                const closestBranch = possibleResults.reduce(
                    (previous, current) => previous.distance < current.distance ? previous : current
                );

                return closestBranch.branch;
            } else {
                return null;
            }
        } catch (error) {
            this._logger.error("tags.manager.ts->getCloseEnoughBranchWithLevenshtein()", error);
            throw error;   
        }
	}

	private findMatchingProduct(productName: string, branch: TagSuggestionBranchEntity) {
		try {
            const expectedProductName = this.preprocessProductName(productName);		
            const perfectlyMatchedProduct = branch.suggestions.products[expectedProductName];

            if (perfectlyMatchedProduct) {
                return perfectlyMatchedProduct.tagsToSuggest.slice();
            } else {
                return this.getClosestProductWithLevenshtein(expectedProductName, branch);
            }	
        } catch (error) {
            this._logger.error("tags.manager.ts->findMatchingProduct()", error);
            throw error;   
        }	
	}

	private getClosestProductWithLevenshtein(expectedProductName: string, branch: TagSuggestionBranchEntity) {
		try {
            const closestBranchProducts = branch.suggestions.products;

            const productNamesWithDistance = Object
                .keys(closestBranchProducts)
                .map(name => ({
                    productName: name,
                    distance: levenshtein(expectedProductName, name)
                }));

            const closesProductName = productNamesWithDistance.reduce(
                (previous, current) => previous.distance < current.distance ? previous : current
            );

            const closestProduct = closestBranchProducts[closesProductName.productName];

            return closestProduct.tagsToSuggest.slice();
        } catch (error) {
            this._logger.error("tags.manager.ts->getClosestProductWithLevenshtein()", error);
            throw error; 
        }
	}

	private preprocessProductNameForBranch(name: string) {
		if(!name) throw new Error("name cannot be null");

		const onlyLetters = /[^a-ząćęłńóś]/g;
		const lowerCaseName = name.toLowerCase()
		const processedName = lowerCaseName.replace(onlyLetters, '');

		return processedName;
	}

	private preprocessProductName(name: string) {
		if(!name) throw new Error("name cannot be null");

		const onlyLettersAndNumbers = /[^a-ząćęłńóś0-9]/g;
		const lowerCaseName = name.toLowerCase()
		const processedName = lowerCaseName.replace(onlyLettersAndNumbers, '');

		return processedName;
    }
    
    private getTagsColors(tagsCollection: TagsCollectionEntity): TagsColors {
        if(!tagsCollection || !tagsCollection.tags)
            return {
                tagsColors: {}
            };

        const colors =  Object
            .keys(tagsCollection.tags)
            .reduce((acc, tagId) => {
                const item = tagsCollection.tags[tagId];
                acc[tagId] = item.color;

                return acc;
            }, {});

        colors[noCategoryTag] = defaultTagColor;
        colors[noSubCategoryTag] = defaultTagColor;

        return {
            tagsColors: colors
        };
    }

    private wasTagsColorsChanged(oldColors: TagsColors, newColors: TagsColors) {
        if(!oldColors || !oldColors.tagsColors || !newColors || !newColors.tagsColors)
            return true;

        const oldKeys = Object.keys(oldColors.tagsColors);
        const newKeys = Object.keys(newColors.tagsColors);

        if(oldKeys.length != newKeys.length) return true;

        for (let index = 0; index < oldKeys.length; index++) {
            const oldKey = oldKeys[index];
            
            const oldColor = oldColors.tagsColors[oldKey];
            const newColor = newColors.tagsColors[oldKey];

            if(oldColor != newColor) {
                return true;
            }
        }

        return false;
    }

    private getTagsNames(tagsCollection: TagsCollectionEntity): TagsNames {
        if(!tagsCollection || !tagsCollection.tags)
            return {
                tagsNames: {}
            };

        const names =  Object
            .keys(tagsCollection.tags)
            .reduce((acc, tagId) => {
                const item = tagsCollection.tags[tagId];
                acc[tagId] = item.name;

                return acc;
            }, {});

        names[noCategoryTag] = noCategoryTag;
        names[noSubCategoryTag] = noSubCategoryTag;

        return {
            tagsNames: names
        };
    }

    private wasTagsNamesChanged(oldNames: TagsNames, newNames: TagsNames) {
        if(!oldNames || !oldNames.tagsNames || !newNames || !newNames.tagsNames)
            return true;

        const oldKeys = Object.keys(oldNames.tagsNames);
        const newKeys = Object.keys(newNames.tagsNames);

        if(oldKeys.length != newKeys.length) return true;

        for (let index = 0; index < oldKeys.length; index++) {
            const oldKey = oldKeys[index];
            
            const oldName = oldNames.tagsNames[oldKey];
            const newName = newNames.tagsNames[oldKey];

            if(oldName != newName) {
                return true;
            }
        }

        return false;
    }

    private async saveAndUpdateTagsCollection(newCollection: TagsCollectionEntity): Promise<void> {
        try {
            this.makeSureNoNegativeCounts(newCollection);

            this._tagsCollection = newCollection;

            await this._database.saveTagsCollection(newCollection);
            this.tagsCollectionSubject.next(newCollection);

            const newTagsColors = this.getTagsColors(newCollection);

            if(this.wasTagsColorsChanged(this._tagsColors, newTagsColors)) {
                this._tagsColors = newTagsColors;
                this.tagsColorsSubject.next(newTagsColors);
            }
            
            const newTagsNames = this.getTagsNames(newCollection);

            if(this.wasTagsNamesChanged(this._tagsNames, newTagsNames)) {
                this._tagsNames = newTagsNames;
                this.tagsNamesSubject.next(newTagsNames);
            }
        } catch (error) {
            this._logger.error("tags.manager.ts->saveAndUpdateTagsCollection()", error);
            throw error; 
        }
    }

    //todo that is only a temporary solution, if negative tag is present then it means something went wrong
    private makeSureNoNegativeCounts(newCollection: TagsCollectionEntity) {
        if(!newCollection || !newCollection.chains || !newCollection.chains.length)
            return;
        
        newCollection.chains.forEach(chain => {
            if(chain.count < 0) {
                chain.count = 0;

                this._logger.error(
                    "tags.manager.ts->makeSureNoNegativeCounts()",
                    `negative count detected '${JSON.stringify(chain)}'`);
            }
        });
    }

    private async getTagsCollection() {
        try {
            let tagsCollection =  await this
                ._database
                .getTagsCollection();

            if(!tagsCollection) {
                tagsCollection = {
                    tags: {},
                    chains: []
                }
            }
            
            if(!tagsCollection.chains) {
                tagsCollection.chains = [];
            }

            return tagsCollection;
        } catch (error) {
            this._logger.error("tags.manager.ts->getTagsCollection()", error);
            throw error; 
        }
    }
}