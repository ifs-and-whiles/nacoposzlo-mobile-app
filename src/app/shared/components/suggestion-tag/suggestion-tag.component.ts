import { Component, Input } from "@angular/core";

@Component({
	selector: 'app-suggestion-tag',
	templateUrl: './suggestion-tag.component.html',
	styleUrls: ['./suggestion-tag.component.scss']
})
export class SuggestionTagComponent{
    public _tag;

    @Input() set tag (value: string) {
        this._tag = value.toLowerCase();
    }    
}