import { Component, Input, Output, EventEmitter, OnInit, OnDestroy} from '@angular/core';
import { TagsColors, TagsManager, TagsNames } from '../../managers/tags/tags.manager';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-tag-list',
	templateUrl: './tag-list.component.html',
	styleUrls: ['./tag-list.component.scss']
})
export class TagListComponent implements OnInit, OnDestroy {

	private _tagsColorsSubscription: Subscription;
	private _tagsNamesSubscription: Subscription;

	@Input() tagIds: string[];

    @Input() hideRemove: boolean = false;
    
    @Input() forceColor: string;

	@Output() onRemove: EventEmitter<any> = new EventEmitter();

	removeTag($index: number): any {
		const removed = this.tagIds.splice($index, 1);
		this.onRemove.emit(removed[0]);
	}

	public trackTagBy(index: number, tagId: string) {
		return tagId;
    }

    public tagsColors = {};
    public tagsNames = {};
    
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
