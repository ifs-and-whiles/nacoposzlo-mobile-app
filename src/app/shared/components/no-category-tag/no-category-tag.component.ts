import { Component, Input, ViewEncapsulation } from '@angular/core';
import { noCategoryTag } from '../../utils/no-category-tag';

@Component({
	selector: 'app-no-category-tag',
    template: `
        <app-tag-list-read-only [tagIds]="tagIds"></app-tag-list-read-only>`,
    encapsulation: ViewEncapsulation.None
})
export class NoCategoryTagComponent { 
    public tagIds = [noCategoryTag];
}
