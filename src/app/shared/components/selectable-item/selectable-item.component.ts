import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

@Component({
	selector: 'app-selectable-item',
	templateUrl: 'selectable-item.component.html',
	styleUrls: ['selectable-item.component.scss'],
})
export class SelectableItemComponent {
    @Input() itemTemplate: TemplateRef<any>;
    @Input() dateUnixTimestamp: number;
    @Input() isSelected: boolean;
    @Input() name: string;

    @Output() itemClick = new EventEmitter<void>();    
    @Output() iconClick = new EventEmitter<void>();

    public onItemClick() {
        this.itemClick.emit();
    }

    public onIconClick() {
        this.iconClick.emit();
    }
}