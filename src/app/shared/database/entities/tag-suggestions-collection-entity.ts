import { TagSuggestionEntity } from './tag-suggestion-entity';

export interface TagSuggestionsCollectionEntity {
	products: {[productName: string]: TagSuggestionEntity};
}