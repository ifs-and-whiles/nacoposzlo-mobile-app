import { Component, EventEmitter, Input, Output } from "@angular/core";
import { defaultTagColor } from '../../utils/colors';

@Component({
	selector: 'app-tag',
	templateUrl: './tag.component.html',
	styleUrls: ['./tag.component.scss']
})
export class TagComponent{
    public _color = "#fff";
    public _tag;

    @Input() set tag (value: string) {
        this._tag = value.toLowerCase();
        this.updateColor();
    }
    
    private _configColor: string;
    @Input() set configColor (value: string) {
        this._configColor = value;
        this.updateColor();
    }

    private _forceColor: string;
    @Input() set forceColor (value: string) {
        this._forceColor = value;
        this.updateColor();
    }
    
	@Input() big: boolean;
	@Input() medium: boolean;

	@Input() allowClear: boolean = true;

    @Output() onClear: EventEmitter<void> = new EventEmitter();
    
    private updateColor() {
        this._color = this._forceColor || this._configColor || defaultTagColor;
    }
}