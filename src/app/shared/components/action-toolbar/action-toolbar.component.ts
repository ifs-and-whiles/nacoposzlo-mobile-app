import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'app-action-toolbar',
    templateUrl: 'action-toolbar.component.html',
	styleUrls: ['action-toolbar.component.scss'],
})
export class ActionToolbarComponent {
    @Input() set isDeleteVisible(value: boolean) {
        this.deleteVisible = value;
    }

    public deleteVisible: boolean = true;

    @Input() set isTagVisible(value: boolean) {
        this.tagVisible = value;
    }

    public tagVisible: boolean = true;

    @Input() set isEditVisible(value: boolean) {
        this.editVisible = value;
    }

    public editVisible: boolean = true;

    @Output() delete: EventEmitter<void> = new EventEmitter<void>();
    @Output() tag: EventEmitter<void> = new EventEmitter<void>();
    @Output() edit: EventEmitter<void> = new EventEmitter<void>();

    public onDeleteClick() {
        this.delete.emit();
    }

    public onTagClick() {
        this.tag.emit();
    }

    public onEditClick() {
        this.edit.emit();
    }
}