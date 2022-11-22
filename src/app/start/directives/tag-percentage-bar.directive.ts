import { Directive, ElementRef, Input } from '@angular/core';
import { defaultTagColor, shadeHexColor } from '../../shared/utils/colors';
import { TagsColors, TagsManager } from '../../shared/managers/tags/tags.manager';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appTagPercentageBar]'
})
export class TagPercentageBarDirective {
	private _tag: string;
	private _tagsManagerSubscription: Subscription;

	@Input() set appTagPercentageBar(tag: string){ 
		this._tag = tag;
	}

	set color(color: string) {
		const lighter = shadeHexColor(color, 0.8);
		this._el.nativeElement.style.setProperty('--progress-background', color);  
		this._el.nativeElement.style.setProperty('--background', lighter); 
	}

	constructor(
		private _el: ElementRef,
		private _tagsManager: TagsManager) {}

	ngOnInit(): void {
        this._tagsManagerSubscription = this
			._tagsManager
			.onTagsColorsChange()
			.subscribe({
				next: (tagsColors: TagsColors) => {
                    const color = tagsColors.tagsColors[this._tag.toLowerCase()];
					this.color = color ? color : defaultTagColor;
                }
			});
	}

	ngOnDestroy(): void {
		this._tagsManagerSubscription.unsubscribe();
	}
}