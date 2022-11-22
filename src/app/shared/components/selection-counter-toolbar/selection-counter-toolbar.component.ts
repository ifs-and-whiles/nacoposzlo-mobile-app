import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'app-selection-counter-toolbar',
    templateUrl: 'selection-counter-toolbar.component.html',
	styleUrls: ['selection-counter-toolbar.component.scss'],
})
export class SelectionCounterToolbarComponent {
    @Input() set count(value: number) {
        this.counter = value;
    }

    public counter: number = 0;

    @Output() dismiss: EventEmitter<void> = new EventEmitter<void>();

    public onBackClick() {
        this.dismiss.emit();
    }
}