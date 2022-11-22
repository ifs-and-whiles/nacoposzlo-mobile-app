import { Component, Input, OnInit, OnDestroy} from '@angular/core';
import { TagsColors, TagsManager, TagsNames } from '../../managers/tags/tags.manager';
import { Subscription } from 'rxjs';
import { defaultTagColor } from '../../utils/colors';


@Component({
	selector: 'app-tag-list-read-only',
	templateUrl: './tag-list-read-only.component.html',
	styleUrls: ['./tag-list-read-only.component.scss']
})
export class TagListReadOnlyComponent implements OnInit, OnDestroy {

	private _tagsColorsSubscription: Subscription;
	private _tagsNamesSubscription: Subscription;

	@Input() tagIds: string[];
   
	public trackTagBy(index: number, tagId: string) {
		return tagId;
    }

    public tagsColors = { };
    public tagsNames = { };
    public defaultColor = defaultTagColor;
    
	constructor(private _tagsManager: TagsManager) { }

    ngOnInit(): void {
		this._tagsColorsSubscription = this
			._tagsManager
			.onTagsColorsChange()
			.subscribe({
				next: (tagsColors: TagsColors) => this.tagsColors = tagsColors.tagsColors
			});

        this._tagsNamesSubscription = this
            ._tagsManager
            .onTagsNamesChange()
            .subscribe({
                next: (tagsNames: TagsNames) => this.tagsNames = tagsNames.tagsNames
            });
	}

	ngOnDestroy(): void {
		this._tagsColorsSubscription.unsubscribe();
        this._tagsNamesSubscription.unsubscribe();
    }
}
