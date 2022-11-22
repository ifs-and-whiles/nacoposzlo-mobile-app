import { StringUtils } from '../../utils/string-utils';
import { TagChainUsage, TagsUsage } from './tags.manager';

export class TagsMath {
    public static calculateUsage<T>(items: T[], getTagIds: (item: T) => string[]): TagsUsage {
        const tagChains = items
            .map(item => getTagIds(item).map(t => t.toLowerCase()));
        
        return {
            chains: this.calculateChainsUsage(tagChains)
        };
    }
    
    private static calculateChainsUsage(tagChains: string[][]): TagChainUsage[] {
		return tagChains.reduce((usages: TagChainUsage[], tagChain: string[]) => {
            if(!tagChain.length) return usages;

            const chainUsage = this.tryFindChain(
                usages,
                tagChain);

            if(chainUsage) {
                chainUsage.count += 1;
            } else {
                usages.push({
                    tagIds: tagChain,
                    count: 1
                });
            }
    
            return usages;
        }, []);
	}

    public static calculateDifference(oldUsage: TagsUsage, currentUsage: TagsUsage): TagsUsage {
        return {
            chains: this.calculateChainDifference(
                oldUsage.chains,
                currentUsage.chains)
        };
    }
    
    private static calculateChainDifference(oldUsage: TagChainUsage[], currentUsage: TagChainUsage[]): TagChainUsage[] {		
		const usageDiff: TagChainUsage[] = oldUsage.map(usage => ({
			tagIds: usage.tagIds.slice(),
			count: -1 * usage.count
		}));
			
		currentUsage.forEach(usage => {
            const item = this.tryFindChain(
                usageDiff,
                usage.tagIds);

			if(item) {
			   item.count += usage.count;
			} else {
				usageDiff.push({
					tagIds: usage.tagIds.slice(),
					count: usage.count
				});
			}
		});

		return usageDiff.filter(usage => usage.count != 0);
    }
    
    private static tryFindChain(chains: TagChainUsage[], tags: string[]): TagChainUsage | null {
        return chains.find(
            chain => StringUtils.areArraysEqual(chain.tagIds, tags));
    }

    public static getChainHash(usage: TagChainUsage) {
        return this.getTagsHash(usage.tagIds);
    }

    public static getTagsHash(tags: string[]) {
        return tags.reduce((acc, val) => acc + '.' + val, "");
    }
}