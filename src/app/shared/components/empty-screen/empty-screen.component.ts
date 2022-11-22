import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
	selector: 'app-empty-screen',
    templateUrl: 'empty-screen.component.html',
    styleUrls: ['empty-screen.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class EmptyScreenComponent { 
    @Input() line1: string;
    @Input() line1FontSize: string = "18px";
    @Input() line2: string;
    @Input() line2FontSize: string = "18px";
    @Input() line3: string;
    @Input() imgUrl: string;
}
