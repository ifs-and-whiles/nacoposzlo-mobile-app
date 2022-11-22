import { TagChainEntity } from './tag-chain-entity';
import { TagEntity } from './tag-entity';

export interface TagsCollectionEntity {
    tags: {[tagId: string]: TagEntity};
    chains: TagChainEntity[];
}

export class TagsCollectionExtensions {
    public static getTagIds(collection: TagsCollectionEntity): string[] {
        return Object.keys(collection.tags);
    }

    public static getTags(collection: TagsCollectionEntity): TagEntity[] {
        return this
            .getTagIds(collection)
            .reduce((acc, tagId) => {
                acc.push(collection.tags[tagId]);

                return acc;
            }, []);
    }   

    public static getTagUsageCount(collection: TagsCollectionEntity, tagId: string): number {
        return collection
            .chains
            .filter(chain => chain.tagIds.includes(tagId))
            .reduce((acc, chain) => {
                return acc + chain.count;
            }, 0);
    }

    public static getTagAsMainUsageCount(collection: TagsCollectionEntity, tagId: string): number {
        return collection
            .chains
            .filter(chain => chain.tagIds[0] === tagId)
            .reduce((acc, chain) => {
                return acc + chain.count;
            }, 0);
    }

    public static canCreateChain(collection: TagsCollectionEntity, parentChain: string[], newTagName: string): boolean {
        if(!parentChain || !newTagName)
            return false;
        
        const hasRepeatedItems = parentChain
            .map(tagId => collection.tags[tagId].name.toLowerCase())
            .includes(newTagName.toLowerCase());

        if(hasRepeatedItems)
            return false;

        const lastIndex = parentChain.length;

        const tagsAtGivenIndex = collection
            .chains
            .filter(chain => chain.tagIds.length > parentChain.length)
            .filter(chain => this.isChainInTheSameTree(chain, parentChain))
            .map(chain => {
                const tagIdAtIndex = chain.tagIds[lastIndex];
                const tagNameAtIndex = collection.tags[tagIdAtIndex].name.toLowerCase();

                return tagNameAtIndex;
            });       
            
        const doesNameAlreadyExistAtGivenLevel = tagsAtGivenIndex.includes(
            newTagName.toLowerCase());

        return !doesNameAlreadyExistAtGivenLevel;
    }

    private static isChainInTheSameTree(tagChainEntity: TagChainEntity, parentChain: string[]){
        for (let index = 0; index < tagChainEntity.tagIds.length && index < parentChain.length; index++) {
            const tagId = tagChainEntity.tagIds[index];

            if(tagId.toLowerCase() != parentChain[index].toLowerCase())
            {
                return false
            }
        }

        return true;
    }
}   