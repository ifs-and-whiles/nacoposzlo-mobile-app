import { TagSuggestionsCollectionEntity } from './tag-suggestions-collection-entity';

export interface TagSuggestionBranchEntity {
	productLettersName: string;
	suggestions: TagSuggestionsCollectionEntity;
}
