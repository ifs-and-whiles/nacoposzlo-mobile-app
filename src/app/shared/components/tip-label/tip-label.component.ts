import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
	selector: 'app-tip-label',
    template: `
    <span class="tip-label">TIP: </span>
    <span class="info-label text-medium" [innerHtml]="text"></span>`,
    styleUrls: ['tip-label.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TipLabelComponent { 
    @Input() text: string;
}
